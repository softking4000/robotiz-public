import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * ============================================================================
 * [교육용 설명: 로보티즈 USB 시리얼(COM5) 로컬 하드웨어 브릿지 플러그인]
 * 브라우저의 WebSerial API 팝업 방식뿐만 아니라, 사용자가 화면에서
 * '[⚡ COM5 즉시 자동 연결하기]' 버튼을 클릭했을 때 팝업 없이도 Windows PC에
 * 실제로 연결된 'COM5 (ROBOTIS Virtual COM Port)' 하드웨어 포트를
 * 115200 bps로 즉시 열어 다이나믹셀 프로토콜 2.0 패킷을 주고받게 해주는 미들웨어입니다.
 * ============================================================================
 */
function robotisSerialBridgePlugin() {
  let serialWorker = null;
  let activePortName = null;
  let activeBaudRate = 115200;
  let pendingResolvers = [];
  let stdoutBuffer = '';

  // 백그라운드 PowerShell .NET SerialPort 영구 워커 종료 함수
  const stopSerialWorker = () => {
    if (serialWorker) {
      try {
        serialWorker.stdin.write('CLOSE\n');
        serialWorker.kill();
      } catch {
        // 프로세스가 이미 종료된 경우 무시
      }
      serialWorker = null;
    }
    activePortName = null;
    while (pendingResolvers.length > 0) {
      const r = pendingResolvers.shift();
      clearTimeout(r.timer);
      r.resolve({ ok: false, error: '시리얼 포트가 닫혔습니다.' });
    }
  };

  // 워커에 1줄 명령을 보내고 1줄 JSON 응답을 받는 헬퍼 함수
  const sendCommandToWorker = (cmdLine, timeoutMs = 3000) => {
    return new Promise((resolve) => {
      if (!serialWorker || !serialWorker.stdin.writable) {
        resolve({ ok: false, error: '시리얼 워커가 실행 중이지 않습니다.' });
        return;
      }
      const timer = setTimeout(() => {
        const idx = pendingResolvers.findIndex((item) => item.timer === timer);
        if (idx !== -1) pendingResolvers.splice(idx, 1);
        resolve({ ok: false, error: '시리얼 포트 응답 시간 초과' });
      }, timeoutMs);

      pendingResolvers.push({ resolve, timer });
      serialWorker.stdin.write(cmdLine + '\n');
    });
  };

  // JSON Body 파서 헬퍼
  const readJsonBody = (req) =>
    new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });

  return {
    name: 'robotis-serial-bridge',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/serial/')) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        // 1. 현재 Windows PC의 실제 COM 포트 목록 조회 (/api/serial/ports)
        if (req.url.startsWith('/api/serial/ports') && req.method === 'GET') {
          const psCmd = `
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            $pnp = Get-CimInstance -ClassName Win32_PnPEntity | Where-Object { $_.Name -match 'COM\\d+' }
            $list = @()
            foreach ($item in $pnp) {
              if ($item.Name -match '(COM\\d+)') {
                $com = $matches[1]
                $list += @{
                  portName = $com
                  friendlyName = $item.Name
                  deviceId = $item.DeviceID
                  manufacturer = $item.Manufacturer
                }
              }
            }
            if ($list.Count -eq 0) {
              $names = [System.IO.Ports.SerialPort]::GetPortNames()
              foreach ($n in $names) {
                $list += @{ portName = $n; friendlyName = $n; deviceId = ''; manufacturer = 'Unknown' }
              }
            }
            ConvertTo-Json -InputObject @($list) -Compress
          `;
          const encoded = Buffer.from(psCmd, 'utf16le').toString('base64');
          exec(`powershell -NoProfile -EncodedCommand ${encoded}`, (err, stdout) => {
            let ports = [];
            if (!err && stdout) {
              try {
                const parsed = JSON.parse(stdout.trim());
                ports = Array.isArray(parsed) ? parsed : [parsed];
              } catch {
                ports = [];
              }
            }
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                connectedPort: activePortName,
                baudRate: activeBaudRate,
                ports
              })
            );
          });
          return;
        }

        // 2. 지정한 COM 포트(예: COM5) 오픈 (/api/serial/connect)
        if (req.url.startsWith('/api/serial/connect') && req.method === 'POST') {
          const body = await readJsonBody(req);
          const portName = body.portName || 'COM5';
          const baudRate = Number(body.baudRate || 115200);

          stopSerialWorker();

          // 임시 PowerShell 워커 스크립트 파일 생성 (안정적인 상주 프로세스 유지)
          const workerScriptPath = path.join(os.tmpdir(), 'robotis_com5_worker.ps1');
          const workerScript = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Continue'
$port = $null
try {
  $port = New-Object System.IO.Ports.SerialPort '${portName}', ${baudRate}, 'None', 8, 'One'
  $port.DtrEnable = $true
  $port.RtsEnable = $true
  $port.ReadTimeout = 150
  $port.WriteTimeout = 300
  $port.Open()
  if ($port.IsOpen) {
    [Console]::Out.WriteLine('{"ok":true,"event":"OPENED","port":"${portName}"}')
    [Console]::Out.Flush()
  } else {
    [Console]::Out.WriteLine('{"ok":false,"error":"포트를 열지 못했습니다."}')
    [Console]::Out.Flush()
    exit 1
  }
} catch {
  $errMsg = $_.Exception.Message -replace '"', "'" -replace '[\\r\\n]+', ' '
  [Console]::Out.WriteLine(('{"ok":false,"error":"' + $errMsg + '"}'))
  [Console]::Out.Flush()
  exit 1
}

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line -or $line -eq 'CLOSE') {
    break
  }
  $line = $line.Trim()
  if ($line.Length -eq 0) {
    continue
  }
  try {
    $parts = $line.Split('|')
    $cmd = $parts[0]
    if ($cmd -eq 'TX') {
      $waitRx = ($parts[1] -eq '1')
      $waitMs = [int]$parts[2]
      $hexStr = $parts[3]
      if ($hexStr.Length -gt 0) {
        $byteStrs = $hexStr.Split(',')
        $txBuf = New-Object byte[] $byteStrs.Length
        for ($i = 0; $i -lt $byteStrs.Length; $i++) {
          $txBuf[$i] = [byte]([int]$byteStrs[$i])
        }
        $port.DiscardInBuffer()
        $port.Write($txBuf, 0, $txBuf.Length)
      }
      $rxList = New-Object System.Collections.Generic.List[int]
      if ($waitRx) {
        $elapsed = 0
        $quietElapsed = 0
        while ($elapsed -lt $waitMs) {
          Start-Sleep -Milliseconds 12
          $elapsed += 12
          $avail = $port.BytesToRead
          if ($avail -gt 0) {
            $tmp = New-Object byte[] $avail
            $readCnt = $port.Read($tmp, 0, $avail)
            for ($k = 0; $k -lt $readCnt; $k++) {
              $rxList.Add([int]$tmp[$k])
            }
            $quietElapsed = 0
          } elseif ($rxList.Count -ge 11) {
            $quietElapsed += 12
            if ($quietElapsed -ge 24) {
              break
            }
          }
        }
      } else {
        Start-Sleep -Milliseconds 5
        $avail = $port.BytesToRead
        if ($avail -gt 0) {
          $tmp = New-Object byte[] $avail
          $readCnt = $port.Read($tmp, 0, $avail)
          for ($k = 0; $k -lt $readCnt; $k++) {
            $rxList.Add([int]$tmp[$k])
          }
        }
      }
      $rxJson = [string]::Join(',', $rxList)
      [Console]::Out.WriteLine(('{"ok":true,"rx":[' + $rxJson + ']}'))
      [Console]::Out.Flush()
    }
  } catch {
    $errMsg = $_.Exception.Message -replace '"', "'" -replace '[\\r\\n]+', ' '
    [Console]::Out.WriteLine(('{"ok":false,"error":"' + $errMsg + '"}'))
    [Console]::Out.Flush()
  }
}

if ($port -and $port.IsOpen) {
  $port.Close()
}
`;

          fs.writeFileSync(workerScriptPath, workerScript, 'utf8');

          serialWorker = spawn(
            'powershell',
            ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', workerScriptPath],
            {
              stdio: ['pipe', 'pipe', 'pipe']
            }
          );

          stdoutBuffer = '';
          serialWorker.stdout.on('data', (chunk) => {
            stdoutBuffer += chunk.toString('utf8');
            let newlineIdx;
            while ((newlineIdx = stdoutBuffer.indexOf('\n')) !== -1) {
              const line = stdoutBuffer.slice(0, newlineIdx).trim();
              stdoutBuffer = stdoutBuffer.slice(newlineIdx + 1);
              if (!line) continue;
              if (pendingResolvers.length > 0) {
                const { resolve, timer } = pendingResolvers.shift();
                clearTimeout(timer);
                try {
                  resolve(JSON.parse(line));
                } catch {
                  resolve({ ok: false, error: line });
                }
              }
            }
          });

          serialWorker.on('exit', () => {
            serialWorker = null;
            activePortName = null;
          });

          // 첫 번째 줄(OPENED 이벤트) 대기
          const openResult = await new Promise((resolve) => {
            const timer = setTimeout(() => {
              resolve({ ok: false, error: `${portName} 포트 열기 시간 초과` });
            }, 4000);
            pendingResolvers.push({ resolve, timer });
          });

          if (openResult && openResult.ok) {
            activePortName = portName;
            activeBaudRate = baudRate;
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, portName, baudRate }));
          } else {
            stopSerialWorker();
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                success: false,
                error: (openResult && openResult.error) || `${portName} 포트를 열 수 없습니다.`
              })
            );
          }
          return;
        }

        // 3. 패킷 바이트 송수신 (/api/serial/txrx)
        if (req.url.startsWith('/api/serial/txrx') && req.method === 'POST') {
          if (!serialWorker || !activePortName) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'COM 포트가 열려 있지 않습니다.' }));
            return;
          }
          const body = await readJsonBody(req);
          const bytes = Array.isArray(body.bytes) ? body.bytes : [];
          const waitRx = body.waitRx ? '1' : '0';
          const timeoutMs = Number(body.timeoutMs || 180);
          const csvBytes = bytes.map((b) => Number(b) & 0xff).join(',');

          const result = await sendCommandToWorker(
            `TX|${waitRx}|${timeoutMs}|${csvBytes}`,
            timeoutMs + 1500
          );
          if (result && result.ok) {
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, rxBytes: result.rx || [] }));
          } else {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                success: false,
                error: (result && result.error) || '송수신 오류'
              })
            );
          }
          return;
        }

        // 4. 연결 해제 (/api/serial/disconnect)
        if (req.url.startsWith('/api/serial/disconnect') && req.method === 'POST') {
          stopSerialWorker();
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true }));
          return;
        }

        next();
      });
    }
  };
}

// [Vite 환경 설정 파일]
export default defineConfig({
  plugins: [react(), robotisSerialBridgePlugin()],
  server: {
    port: 5173,
    open: false
  }
});
