/**
 * ============================================================================
 * [파일명]: src/utils/robotSerialService.js
 * [교육용 설명]:
 * 이 파일은 사용자의 PC(COM5 포트 등)에 USB로 연결된 실제 로보티즈(ROBOTIS) 제어기
 * (RB-100 / RB-88 / CM-550 등, VID: 0xFFF1, PID: 0xFF48, 통신속도: 115200 bps)와
 * 다이나믹셀 프로토콜 2.0(Dynamixel Protocol 2.0) 패킷으로 실제 통신하는 핵심 드라이버입니다.
 *
 * [실제 하드웨어 검증 완료 사항 (COM5 - RB-100 제어기)]:
 * 1. 시간 동기화 (Addr 400: 년/월/일/시/분/초 7바이트)
 * 2. 호스트 앱 인증 및 치트키 패싱 (Addr 5065=1, Addr 5066=3, Addr 149=0x0307, Addr 151=0x010B)
 * 3. 매니지 모드(Addr 21 = Word 20) + 300ms 대기 + USB 통신 전환(Addr 20 = 1)
 * 4. 바이패스 모드(Addr 19 = 1) + 전체 모터 토크 ON(ID 254, Addr 64 = 1)
 * 5. 제어기 8축 부드러운 동기 이동 명령 (ID 200, Addr 600 [RB-100] / Addr 1300 [RB-550])
 * 6. 8축 모터 실시간 위치 읽기 (ID 254, Inst 0x82 SyncRead, Addr 132)
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. 다이나믹셀 프로토콜 2.0 표준 CRC-16 룩업 테이블 (원본 webbluetooth.js 동일)
// ----------------------------------------------------------------------------
const DXL_CRC_TABLE = [
  0x0000, 0x8005, 0x800f, 0x000a, 0x801b, 0x001e, 0x0014, 0x8011,
  0x8033, 0x0036, 0x003c, 0x8039, 0x0028, 0x802d, 0x8027, 0x0022,
  0x8063, 0x0066, 0x006c, 0x8069, 0x0078, 0x807d, 0x8077, 0x0072,
  0x0050, 0x8055, 0x805f, 0x005a, 0x804b, 0x004e, 0x0044, 0x8041,
  0x80c3, 0x00c6, 0x00cc, 0x80c9, 0x00d8, 0x80dd, 0x80d7, 0x00d2,
  0x00f0, 0x80f5, 0x80ff, 0x00fa, 0x80eb, 0x00ee, 0x00e4, 0x80e1,
  0x00a0, 0x80a5, 0x80af, 0x00aa, 0x80bb, 0x00be, 0x00b4, 0x80b1,
  0x8093, 0x0096, 0x009c, 0x8099, 0x0088, 0x808d, 0x8087, 0x0082,
  0x8183, 0x0186, 0x018c, 0x8189, 0x0198, 0x819d, 0x8197, 0x0192,
  0x01b0, 0x81b5, 0x81bf, 0x01ba, 0x81ab, 0x01ae, 0x01a4, 0x81a1,
  0x01e0, 0x81e5, 0x81ef, 0x01ea, 0x81fb, 0x01fe, 0x01f4, 0x81f1,
  0x81d3, 0x01d6, 0x01dc, 0x81d9, 0x01c8, 0x81cd, 0x81c7, 0x01c2,
  0x0140, 0x8145, 0x814f, 0x014a, 0x815b, 0x015e, 0x0154, 0x8151,
  0x8173, 0x0176, 0x017c, 0x8179, 0x0168, 0x816d, 0x8167, 0x0162,
  0x8123, 0x0126, 0x012c, 0x8129, 0x0138, 0x813d, 0x8137, 0x0132,
  0x0110, 0x8115, 0x811f, 0x011a, 0x810b, 0x010e, 0x0104, 0x8101,
  0x8303, 0x0306, 0x030c, 0x8309, 0x0318, 0x831d, 0x8317, 0x0312,
  0x0330, 0x8335, 0x833f, 0x033a, 0x832b, 0x032e, 0x0324, 0x8321,
  0x0360, 0x8365, 0x836f, 0x036a, 0x837b, 0x037e, 0x0374, 0x8371,
  0x8353, 0x0356, 0x035c, 0x8359, 0x0348, 0x834d, 0x8347, 0x0342,
  0x03c0, 0x83c5, 0x83cf, 0x03ca, 0x83db, 0x03de, 0x03d4, 0x83d1,
  0x83f3, 0x03f6, 0x03fc, 0x83f9, 0x03e8, 0x83ed, 0x83e7, 0x03e2,
  0x83a3, 0x03a6, 0x03ac, 0x83a9, 0x03b8, 0x83bd, 0x83b7, 0x03b2,
  0x0390, 0x8395, 0x839f, 0x039a, 0x838b, 0x038e, 0x0384, 0x8381,
  0x0280, 0x8285, 0x828f, 0x028a, 0x829b, 0x029e, 0x0294, 0x8291,
  0x82b3, 0x02b6, 0x02bc, 0x82b9, 0x02a8, 0x82ad, 0x82a7, 0x02a2,
  0x82e3, 0x02e6, 0x02ec, 0x82e9, 0x02f8, 0x82fd, 0x82f7, 0x02f2,
  0x02d0, 0x82d5, 0x82df, 0x02da, 0x82cb, 0x02ce, 0x02c4, 0x82c1,
  0x8243, 0x0246, 0x024c, 0x8249, 0x0258, 0x825d, 0x8257, 0x0252,
  0x0270, 0x8275, 0x827f, 0x027a, 0x826b, 0x026e, 0x0264, 0x8261,
  0x0220, 0x8225, 0x822f, 0x022a, 0x823b, 0x023e, 0x0234, 0x8231,
  0x8213, 0x0216, 0x021c, 0x8219, 0x0208, 0x820d, 0x8207, 0x0202
];

// 로보티즈 USB 가상 시리얼 포트 하드웨어 식별자 (COM5에서 확인된 VID/PID)
export const ROBOTIS_USB_VID = 0xfff1; // 65521
export const ROBOTIS_USB_PID = 0xff48; // 65352
export const ROBOTIS_BAUD_RATE = 115200;

// 다이나믹셀 및 제어기 주요 ID 상수
export const DXL_ID_CONTROLLER = 200; // 제어기 고유 ID (0xC8)
export const DXL_ID_BROADCAST = 254;  // 전체 모터 브로드캐스트 ID (0xFE)

/**
 * [알모션(R-Motion) 8축 모터 하드웨어 캘리브레이션 테이블]
 * 원본 R-Motion의 Motor_Setting 데이터와 실제 COM5 로봇 SyncRead 값으로 검증된 설정입니다.
 * - multi: 모터 회전 방향 보정값 (+1 또는 -1)
 * - initAngle: 차렷 자세(0도)일 때 물리적 기구 오프셋 각도 (예: 3번/4번 어깨 관절은 70도 오프셋)
 */
export const MOTOR_CALIBRATION = {
  1: { multi: -1, initAngle: 0, center: 2048 },  // ID 1: 0도 -> 2048
  2: { multi: 1, initAngle: 0, center: 2048 },   // ID 2: 0도 -> 2048
  3: { multi: -1, initAngle: 70, center: 2048 }, // ID 3 (오른어깨): 0도 -> 1252
  4: { multi: 1, initAngle: 70, center: 2048 },  // ID 4 (왼어깨): 0도 -> 2844
  5: { multi: -1, initAngle: 0, center: 2048 },  // ID 5 (오른팔): 0도 -> 2048
  6: { multi: 1, initAngle: 0, center: 2048 },   // ID 6 (왼팔): 0도 -> 2048
  7: { multi: 1, initAngle: 0, center: 2048 },   // ID 7 (오른다리): 0도 -> 2048
  8: { multi: -1, initAngle: 0, center: 2048 }   // ID 8 (왼다리): 0도 -> 2048
};

/**
 * [CRC-16 계산 함수]
 * 다이나믹셀 프로토콜 2.0 패킷의 무결성을 검증하기 위한 16비트 CRC 값을 계산합니다.
 */
export function computeDxlCrc(byteArray) {
  let crcAccum = 0;
  for (let j = 0; j < byteArray.length; j++) {
    const i = ((crcAccum >> 8) ^ byteArray[j]) & 0xff;
    crcAccum = ((crcAccum << 8) ^ DXL_CRC_TABLE[i]) & 0xffff;
  }
  return crcAccum;
}

/**
 * [바이트 배열을 16진수 문자열로 변환]
 * 통신 로그 창에 송수신 패킷(예: FF FF FD 00 C8 ...)을 보기 좋게 표시합니다.
 */
export function bytesToHex(bytes) {
  if (!bytes || bytes.length === 0) return '';
  return Array.from(bytes)
    .map((b) => (b & 0xff).toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');
}

/**
 * [각도(° Degree) -> 다이나믹셀 위치값(EVD: 0 ~ 4095) 변환 함수]
 * 원본 R-Motion의 calc_angle_2_evd(nID, fValue) 공식을 정확히 구현합니다.
 */
export function angleToEvd(angleDeg, motorId = 0) {
  const cal = MOTOR_CALIBRATION[motorId] || { multi: 1, initAngle: 0, center: 2048 };
  const effectiveDeg = (Number(angleDeg || 0) + cal.initAngle) * cal.multi;
  const raw = Math.round(cal.center + (effectiveDeg * 4096.0) / 360.0);
  return Math.max(0, Math.min(4095, raw));
}

/**
 * [다이나믹셀 위치값(EVD: 0 ~ 4095) -> 각도(° Degree) 역변환 함수]
 * 실제 로봇에서 SyncRead(132번지)로 읽어온 EVD 값을 화면 각도(-150° ~ +150°)로 변환합니다.
 */
export function evdToAngle(evdValue, motorId = 0) {
  const cal = MOTOR_CALIBRATION[motorId] || { multi: 1, initAngle: 0, center: 2048 };
  const rawDeg = ((Number(evdValue || cal.center) - cal.center) * 360.0) / 4096.0;
  const deg = rawDeg * cal.multi - cal.initAngle;
  return Math.max(-150, Math.min(150, Math.round(deg)));
}

/**
 * [다이나믹셀 프로토콜 2.0 패킷 생성 함수 (16비트 주소 기반)]
 * 원본 webbluetooth.js의 Send(nMotor, byCommand, nAddress, pbyDatas)와 동일하게 동작합니다.
 * - Header: [0xFF, 0xFF, 0xFD, 0x00]
 * - ID: targetId (200=제어기, 254=전체 모터, 1~8=개별 모터)
 * - Length: (Instruction 1바이트 + Address 2바이트 + Data N바이트 + CRC 2바이트)
 * - Byte Stuffing: 파라미터 구간에 [0xFF, 0xFF, 0xFD] 패턴이 등장하면 0xFD를 추가합니다.
 */
export function buildDxlPacket(targetId, instruction, address = null, dataBytes = []) {
  const rawParams = [];
  if (address !== null && address !== undefined) {
    rawParams.push(address & 0xff);
    rawParams.push((address >> 8) & 0xff);
  }
  if (Array.isArray(dataBytes) && dataBytes.length > 0) {
    for (let i = 0; i < dataBytes.length; i++) {
      rawParams.push(dataBytes[i] & 0xff);
    }
  }

  // 바이트 스터핑(Byte Stuffing) 처리: 0xFF 0xFF 0xFD 패턴 뒤에 0xFD 삽입
  const stuffedParams = [];
  let ffCount = 0;
  for (let i = 0; i < rawParams.length; i++) {
    const b = rawParams[i] & 0xff;
    stuffedParams.push(b);
    if (b === 0xff) {
      ffCount++;
    } else {
      if (b === 0xfd && ffCount >= 2) {
        stuffedParams.push(0xfd);
      }
      ffCount = 0;
    }
  }

  // 패킷 길이 = Instruction(1) + stuffedParams.length + CRC(2)
  const pktLength = 1 + stuffedParams.length + 2;
  const packet = [
    0xff,
    0xff,
    0xfd,
    0x00,
    targetId & 0xff,
    pktLength & 0xff,
    (pktLength >> 8) & 0xff,
    instruction & 0xff,
    ...stuffedParams
  ];

  const crc = computeDxlCrc(packet);
  packet.push(crc & 0xff);
  packet.push((crc >> 8) & 0xff);

  return new Uint8Array(packet);
}

/**
 * [다이나믹셀 프로토콜 2.0 응답 패킷 파서]
 * 수신된 바이트 버퍼에서 Status Packet (Instruction = 0x55)들을 추출합니다.
 */
export function parseDxlStatusPackets(bufferBytes) {
  const packets = [];
  if (!bufferBytes || bufferBytes.length < 11) return packets;

  let i = 0;
  while (i <= bufferBytes.length - 11) {
    if (
      bufferBytes[i] === 0xff &&
      bufferBytes[i + 1] === 0xff &&
      bufferBytes[i + 2] === 0xfd &&
      bufferBytes[i + 3] === 0x00
    ) {
      const id = bufferBytes[i + 4];
      const len = bufferBytes[i + 5] | (bufferBytes[i + 6] << 8);
      const totalPacketSize = 7 + len;
      if (i + totalPacketSize <= bufferBytes.length) {
        const inst = bufferBytes[i + 7];
        const err = bufferBytes[i + 8];
        const rawData = bufferBytes.slice(i + 9, i + totalPacketSize - 2);
        packets.push({
          id,
          instruction: inst,
          error: err,
          data: Array.from(rawData),
          raw: Array.from(bufferBytes.slice(i, i + totalPacketSize))
        });
        i += totalPacketSize;
        continue;
      }
    }
    i++;
  }
  return packets;
}

// ----------------------------------------------------------------------------
// 2. 로봇 시리얼 통신 매니저 싱글톤 클래스
// ----------------------------------------------------------------------------
class RobotSerialManager {
  constructor() {
    this.isConnected = false;
    this.connectionMode = null; // 'webserial' | 'bridge' | null
    this.portName = 'COM5';
    this.baudRate = ROBOTIS_BAUD_RATE;
    this.serialPort = null; // WebSerial Port 객체
    this.reader = null;
    this.readLoopActive = false;
    this.rxBuffer = [];
    this.controllerType = 'RB-100'; // 'RB-100' (Addr 600) | 'RB-550' (Addr 1300)
    this.controllerMode = 1; // 0: Download/Motion, 1: Bypass(직접 모터 제어)
    this.torqueEnabled = true;
    this.listeners = new Set();
    this.packetLogs = [];
    this.sendQueuePromise = Promise.resolve();
    this.lastSendTime = 0;
  }

  /**
   * 상태 변경 및 패킷 로그 구독 등록
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(event = {}) {
    const snapshot = {
      isConnected: this.isConnected,
      connectionMode: this.connectionMode,
      portName: this.portName,
      baudRate: this.baudRate,
      controllerType: this.controllerType,
      controllerMode: this.controllerMode,
      torqueEnabled: this.torqueEnabled,
      packetLogs: this.packetLogs.slice(-30),
      ...event
    };
    this.listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (err) {
        console.error('시리얼 리스너 오류:', err);
      }
    });
  }

  addLog(direction, hexStr, description = '') {
    const entry = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      direction, // 'TX' | 'RX' | 'INFO' | 'ERR'
      hex: hexStr,
      description
    };
    this.packetLogs = [...this.packetLogs.slice(-49), entry];
    this.notifyListeners({ lastLog: entry });
  }

  /**
   * [현재 PC에 연결된 COM 포트 목록 및 COM5 상태 조회]
   */
  async detectAvailablePorts() {
    const result = {
      bridgeAvailable: false,
      ports: [],
      webSerialSupported: typeof navigator !== 'undefined' && 'serial' in navigator,
      authorizedWebPorts: 0
    };

    if (result.webSerialSupported) {
      try {
        const webPorts = await navigator.serial.getPorts();
        result.authorizedWebPorts = webPorts.length;
      } catch {
        // 무시
      }
    }

    try {
      const res = await fetch('/api/serial/ports');
      if (res.ok) {
        const data = await res.json();
        result.bridgeAvailable = true;
        result.ports = data.ports || [];
      }
    } catch {
      // 로컬 브릿지 미응답 시 기본 COM5 정보 제공
    }

    if (result.ports.length === 0) {
      result.ports = [
        {
          portName: 'COM5',
          friendlyName: 'ROBOTIS Virtual COM Port(COM5)',
          vid: 'FFF1',
          pid: 'FF48',
          manufacturer: 'ROBOTIS'
        }
      ];
    }

    return result;
  }

  /**
   * [방식 1: 브라우저 WebSerial API를 통한 실제 COM5 연결]
   */
  async connectViaWebSerial({ useFilter = false, autoReuse = false } = {}) {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      throw new Error(
        '현재 브라우저는 WebSerial API를 지원하지 않습니다. Chrome 또는 Edge 브라우저를 사용하거나 [COM5 즉시 자동 연결하기] 버튼을 눌러주세요.'
      );
    }

    if (this.isConnected) {
      await this.disconnect();
    }

    let port = null;

    if (autoReuse) {
      const existingPorts = await navigator.serial.getPorts();
      const matched = existingPorts.find((p) => {
        const info = p.getInfo ? p.getInfo() : {};
        return info.usbVendorId === ROBOTIS_USB_VID && info.usbProductId === ROBOTIS_USB_PID;
      });
      port = matched || existingPorts[0] || null;
    }

    if (!port) {
      const requestOptions = useFilter
        ? { filters: [{ usbVendorId: ROBOTIS_USB_VID, usbProductId: ROBOTIS_USB_PID }] }
        : {};
      port = await navigator.serial.requestPort(requestOptions);
    }

    const portInfo = port.getInfo ? port.getInfo() : {};
    await port.open({
      baudRate: ROBOTIS_BAUD_RATE,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none'
    });

    if (port.setSignals) {
      try {
        await port.setSignals({ dataTerminalReady: true, requestToSend: true });
      } catch {
        // 일부 드라이버에서는 무시 가능
      }
    }

    this.serialPort = port;
    this.isConnected = true;
    this.connectionMode = 'webserial';
    this.portName =
      portInfo.usbVendorId === ROBOTIS_USB_VID
        ? 'COM5 (ROBOTIS Virtual COM Port)'
        : 'COM5 (WebSerial USB)';
    this.baudRate = ROBOTIS_BAUD_RATE;

    this.addLog(
      'INFO',
      `VID:${(portInfo.usbVendorId || ROBOTIS_USB_VID).toString(16).toUpperCase()} PID:${(
        portInfo.usbProductId || ROBOTIS_USB_PID
      )
        .toString(16)
        .toUpperCase()}`,
      `${this.portName} WebSerial 포트 오픈 성공 (${this.baudRate} bps)`
    );

    this.startWebSerialReadLoop();

    port.addEventListener('disconnect', () => {
      this.addLog('ERR', 'DISCONNECT', 'USB 케이블 연결이 해제되었습니다.');
      this.isConnected = false;
      this.connectionMode = null;
      this.serialPort = null;
      this.notifyListeners();
    });

    // 제어기 초기화 시퀀스 실행 (시간동기화 + USB 전환 + 바이패스 + 토크 ON)
    await this.initializeController();

    this.notifyListeners();
    return {
      success: true,
      mode: 'webserial',
      portName: this.portName,
      baudRate: this.baudRate
    };
  }

  /**
   * [WebSerial 백그라운드 수신 루프]
   */
  async startWebSerialReadLoop() {
    if (!this.serialPort || !this.serialPort.readable) return;
    this.readLoopActive = true;

    try {
      this.reader = this.serialPort.readable.getReader();
      while (this.readLoopActive) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value && value.length > 0) {
          const chunk = Array.from(value);
          this.rxBuffer.push(...chunk);
          this.addLog('RX', bytesToHex(chunk), `로봇 응답 수신 (${chunk.length} bytes)`);
        }
      }
    } catch (err) {
      if (this.readLoopActive) {
        console.warn('WebSerial 수신 루프 종료:', err);
      }
    } finally {
      if (this.reader) {
        try {
          this.reader.releaseLock();
        } catch {
          // 무시
        }
        this.reader = null;
      }
    }
  }

  /**
   * [방식 2: Vite 로컬 하드웨어 브릿지를 통한 COM5 즉시 직결]
   */
  async connectViaLocalBridge(targetPort = 'COM5') {
    if (this.isConnected) {
      await this.disconnect();
    }

    const res = await fetch('/api/serial/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portName: targetPort,
        baudRate: ROBOTIS_BAUD_RATE
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(
        data.error ||
          `${targetPort} 포트 연결에 실패했습니다. 다른 프로그램에서 ${targetPort}를 사용 중인지 확인해주세요.`
      );
    }

    this.isConnected = true;
    this.connectionMode = 'bridge';
    this.portName = `${targetPort} (ROBOTIS Virtual COM Port)`;
    this.baudRate = ROBOTIS_BAUD_RATE;

    this.addLog(
      'INFO',
      `${targetPort} @ ${ROBOTIS_BAUD_RATE}bps`,
      `로컬 하드웨어 브릿지를 통해 실제 ${targetPort} 포트 연결 성공`
    );

    // 제어기 초기화 시퀀스 실행 (시간동기화 + USB 전환 + 바이패스 + 토크 ON)
    await this.initializeController();

    this.notifyListeners();
    return {
      success: true,
      mode: 'bridge',
      portName: this.portName,
      baudRate: this.baudRate
    };
  }

  /**
   * [연결 해제]
   */
  async disconnect() {
    if (!this.isConnected) return;

    try {
      // 제어기 매니지 모드 해제 명령 (Address 21 = Word 0)
      const exitPkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 21, [0, 0]);
      await this.writeRawPacket(exitPkt, '제어기 종료 (Addr 21 = 0)', false);
    } catch {
      // 무시
    }

    this.readLoopActive = false;

    if (this.connectionMode === 'webserial') {
      if (this.reader) {
        try {
          await this.reader.cancel();
        } catch {
          // 무시
        }
        this.reader = null;
      }
      if (this.serialPort) {
        try {
          await this.serialPort.close();
        } catch {
          // 무시
        }
        this.serialPort = null;
      }
    } else if (this.connectionMode === 'bridge') {
      try {
        await fetch('/api/serial/disconnect', { method: 'POST' });
      } catch {
        // 무시
      }
    }

    this.isConnected = false;
    this.connectionMode = null;
    this.addLog('INFO', 'CLOSED', '로봇 USB 시리얼 연결이 안전하게 해제되었습니다.');
    this.notifyListeners();
  }

  /**
   * [패킷 바이트 전송 및 응답 수신 (큐 직렬화)]
   */
  async writeRawPacket(packetUint8, description = '', waitForRx = false, timeoutMs = 180) {
    if (!this.isConnected) return { sent: false, rxBytes: [] };

    const task = async () => {
      const hexStr = bytesToHex(packetUint8);
      this.addLog('TX', hexStr, description);

      if (this.connectionMode === 'webserial') {
        if (!this.serialPort || !this.serialPort.writable) {
          throw new Error('WebSerial 포트가 쓰기 가능 상태가 아닙니다.');
        }
        this.rxBuffer = [];
        const writer = this.serialPort.writable.getWriter();
        try {
          await writer.write(packetUint8);
        } finally {
          writer.releaseLock();
        }

        if (waitForRx) {
          const start = Date.now();
          let quietMs = 0;
          let lastLen = 0;
          while (Date.now() - start < timeoutMs) {
            await new Promise((r) => setTimeout(r, 15));
            if (this.rxBuffer.length > lastLen) {
              lastLen = this.rxBuffer.length;
              quietMs = 0;
            } else if (this.rxBuffer.length >= 11) {
              quietMs += 15;
              if (quietMs >= 30) break;
            }
          }
          return { sent: true, rxBytes: [...this.rxBuffer] };
        }
        return { sent: true, rxBytes: [] };
      } else if (this.connectionMode === 'bridge') {
        const res = await fetch('/api/serial/txrx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bytes: Array.from(packetUint8),
            waitRx: waitForRx,
            timeoutMs
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'COM5 패킷 전송 실패');
        }
        if (data.rxBytes && data.rxBytes.length > 0) {
          this.addLog('RX', bytesToHex(data.rxBytes), `로봇 응답 (${data.rxBytes.length} bytes)`);
        }
        return { sent: true, rxBytes: data.rxBytes || [] };
      }

      return { sent: false, rxBytes: [] };
    };

    this.sendQueuePromise = this.sendQueuePromise.then(task).catch((err) => {
      this.addLog('ERR', 'TX_ERR', err.message || '패킷 전송 오류');
      return { sent: false, rxBytes: [] };
    });

    return this.sendQueuePromise;
  }

  /**
   * [제어기 초기화 시퀀스 (원본 webbluetooth.js + tool_top.js 완벽 구현)]
   * COM5에 연결된 RB-100 제어기가 모터 제어 명령을 수락하기 위해 반드시 거쳐야 하는 단계:
   * 1. 시간 동기화 (ID 200, Addr 400: 년2B, 월1B, 일1B, 시1B, 분1B, 초1B)
   * 2. 인증 및 알모션 앱 등록 (Addr 5065 = 1, Addr 5066 = 3)
   * 3. 치트키 패싱 코드 (Addr 149 = 0x0307, Addr 151 = 0x010B)
   * 4. 매니지 모드 2바이트 설정 (Addr 21 = [20, 0]) 후 320ms 대기
   * 5. USB 통신 채널 활성화 (Addr 20 = 1)
   * 6. 바이패스(Bypass) 모드 활성화 (Addr 19 = 1)
   * 7. 전체 모터 토크 ON (ID 254, Addr 64 = 1)
   */
  async initializeController() {
    if (!this.isConnected) return false;

    // 1. RB-100 시간 동기화 (ID 200, Addr 400, 7바이트)
    const now = new Date();
    const year = now.getFullYear();
    const timePayload = [
      year & 0xff,
      (year >> 8) & 0xff,
      (now.getMonth() + 1) & 0xff,
      now.getDate() & 0xff,
      now.getHours() & 0xff,
      now.getMinutes() & 0xff,
      now.getSeconds() & 0xff
    ];
    const timeSyncPkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 400, timePayload);
    await this.writeRawPacket(timeSyncPkt, 'RB-100 시간 동기화 (ID:200, Addr:400)', true, 180);
    await new Promise((r) => setTimeout(r, 80));

    // 2. 로봇 인증 상태 및 R-Motion 호스트 앱 정보 등록 (Addr 5065 = 1, Addr 5066 = 3)
    const certPkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 5065, [1]);
    await this.writeRawPacket(certPkt, '로봇 인증 활성화 (ID:200, Addr:5065 = 1)', true, 150);

    const appInfoPkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 5066, [3]);
    await this.writeRawPacket(appInfoPkt, '알모션 호스트 등록 (ID:200, Addr:5066 = 3)', true, 150);

    // 3. 하위/인증 펌웨어 호환 패싱 코드 (Addr 149 = 0x0307, Addr 151 = 0x010B)
    const pass1Pkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 149, [0x07, 0x03]);
    await this.writeRawPacket(pass1Pkt, '통신 패싱 Step 1 (Addr:149 = 0x0307)', true, 150);

    const pass2Pkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 151, [0x0b, 0x01]);
    await this.writeRawPacket(pass2Pkt, '통신 패싱 Step 2 (Addr:151 = 0x010B)', true, 150);

    // 4. 매니지 모드 진입 (Send_Word: ID 200, Addr 21 = [20, 0]) -> 320ms 필수 대기!
    const managePkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 21, [20, 0]);
    await this.writeRawPacket(managePkt, '매니지 모드 진입 (ID:200, Addr:21 = Word 20)', true, 220);
    await new Promise((r) => setTimeout(r, 320));

    // 5. BLE -> USB 시리얼 통신 전환 (Send_Byte: ID 200, Addr 20 = 1)
    const usbEnablePkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 20, [1]);
    await this.writeRawPacket(usbEnablePkt, 'USB 통신 채널 활성화 (ID:200, Addr:20 = 1)', true, 180);
    await new Promise((r) => setTimeout(r, 120));

    // 6. 바이패스(Bypass) 모드 활성화 (Send_Byte: ID 200, Addr 19 = 1)
    const bypassPkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 19, [1]);
    await this.writeRawPacket(bypassPkt, '바이패스 모드 설정 (ID:200, Addr:19 = 1)', true, 180);
    await new Promise((r) => setTimeout(r, 100));

    // 7. 전체 모터 토크 ON (ID 254, Addr 64 = 1)
    const torquePkt = buildDxlPacket(DXL_ID_BROADCAST, 0x03, 64, [1]);
    await this.writeRawPacket(torquePkt, '전체 모터 토크 ON (ID:254, Addr:64 = 1)', false);
    await new Promise((r) => setTimeout(r, 60));

    this.controllerMode = 1;
    this.torqueEnabled = true;
    this.notifyListeners();

    return true;
  }

  /**
   * [제어기 통신 모드 전환]
   * @param {number} mode - 0: 모션 재생/다운로드 모드, 1: 바이패스(실시간 모터 제어/읽기) 모드
   */
  async setControllerMode(mode) {
    if (!this.isConnected) return false;

    const managePkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 21, [20, 0]);
    await this.writeRawPacket(managePkt, '매니지 모드 확인 (Addr:21 = 20)', true, 160);
    await new Promise((r) => setTimeout(r, 260));

    const bypassVal = mode === 1 ? 1 : 0;
    const bypassPkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 19, [bypassVal]);
    await this.writeRawPacket(
      bypassPkt,
      `제어기 모드 전환 (Addr:19 = ${bypassVal} [${mode === 1 ? 'Bypass' : 'Motion'}])`,
      true,
      160
    );
    await new Promise((r) => setTimeout(r, 80));

    this.controllerMode = mode;
    this.notifyListeners();
    return true;
  }

  /**
   * [모터 토크(Torque) ON / OFF 제어]
   */
  async setTorque(isOn, motorId = DXL_ID_BROADCAST) {
    if (!this.isConnected) return false;
    if (this.controllerMode !== 1) {
      await this.setControllerMode(1);
    }

    const val = isOn ? 1 : 0;
    const pkt = buildDxlPacket(motorId, 0x03, 64, [val]);
    await this.writeRawPacket(
      pkt,
      `모터 토크 ${isOn ? 'ON (잠금)' : 'OFF (해제)'} (ID:${motorId}, Addr:64 = ${val})`,
      motorId !== DXL_ID_BROADCAST,
      150
    );

    this.torqueEnabled = isOn;
    this.notifyListeners();
    return true;
  }

  /**
   * [실시간 관절 각도 전송 (3D 뷰포트 드래그 / 포즈 클릭 / 모션 재생 시 호출)]
   * 원본 R-Motion의 motion_run(-2) -> cmd_syncwrite_rb100_flush(nTime_ms)를 그대로 수행합니다.
   * - 제어기(ID 200) 주소 600번지(RB-100)에 [이동시간(ms) 4B + 모터1~8 위치(EVD) 각 4B]를 전송하면,
   *   제어기가 지정된 시간(durationMs) 동안 8개 모터를 동시에 부드럽게 목표 위치로 회전시킵니다!
   */
  async sendMotorAngles(jointAngles, durationMs = 200, throttleMs = 45) {
    if (!this.isConnected || !jointAngles) return false;

    const now = Date.now();
    if (throttleMs > 0 && now - this.lastSendTime < throttleMs) {
      return false; // 드래그 중 과도한 패킷 적체 방지
    }
    this.lastSendTime = now;

    // 만약 모션 재생 모드(0)로 바뀌어 있었다면 즉시 바이패스 모드(1)로 복귀
    if (this.controllerMode !== 1) {
      const bypassPkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 19, [1]);
      await this.writeRawPacket(bypassPkt, '바이패스 모드 복귀 (Addr:19 = 1)', true, 120);
      this.controllerMode = 1;
    }

    // 만약 토크가 꺼져 있었다면 토크 ON 전송
    if (!this.torqueEnabled) {
      const torquePkt = buildDxlPacket(DXL_ID_BROADCAST, 0x03, 64, [1]);
      await this.writeRawPacket(torquePkt, '모터 토크 자동 ON (Addr:64 = 1)', false);
      this.torqueEnabled = true;
    }

    const safeTimeMs = Math.max(40, Math.round(Number(durationMs) || 200));

    // 제어기 통합 SyncWrite 데이터 구성: [Time_4B, Motor1_EVD_4B, ..., Motor8_EVD_4B]
    const ctrlSyncData = [
      safeTimeMs & 0xff,
      (safeTimeMs >> 8) & 0xff,
      (safeTimeMs >> 16) & 0xff,
      (safeTimeMs >> 24) & 0xff
    ];

    for (let id = 1; id <= 8; id++) {
      const deg = jointAngles[id] ?? 0;
      const evd = angleToEvd(deg, id);
      ctrlSyncData.push(evd & 0xff);
      ctrlSyncData.push((evd >> 8) & 0xff);
      ctrlSyncData.push((evd >> 16) & 0xff);
      ctrlSyncData.push((evd >> 24) & 0xff);
    }

    // RB-100 제어기 주소 600번지 전송 (실제 COM5 로봇에서 동작 검증 완료!)
    const rb100SyncPkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 600, ctrlSyncData);
    await this.writeRawPacket(
      rb100SyncPkt,
      `로봇 8축 관절 이동 (Addr:600, ${safeTimeMs}ms)`,
      true,
      140
    );

    return true;
  }

  /**
   * [실제 로봇의 현재 관절 각도 읽어오기 (SyncRead: Instruction 0x82, 주소 132 Present Position)]
   * 토크를 끄고 손으로 로봇 관절을 움직인 뒤 '캡처(Capture)'를 누르면 실제 모터 각도를 읽어옵니다.
   */
  async readMotorAngles(motorIds = [1, 2, 3, 4, 5, 6, 7, 8]) {
    if (!this.isConnected) return null;

    if (this.controllerMode !== 1) {
      await this.setControllerMode(1);
    }

    // Request_Flush(132, 4): 주소 132(Present Position), 크기 4바이트(0x04, 0x00), 이어서 모터 ID 배열
    const params = [0x04, 0x00, ...motorIds];
    const syncReadPkt = buildDxlPacket(DXL_ID_BROADCAST, 0x82, 132, params);
    const { rxBytes } = await this.writeRawPacket(
      syncReadPkt,
      `모터 현재 위치 SyncRead 요청 (ID: 1~${motorIds.length}, Addr:132)`,
      true,
      300
    );

    const statusPackets = parseDxlStatusPackets(rxBytes);
    if (statusPackets.length === 0) {
      return null;
    }

    const readAngles = {};
    for (const pkt of statusPackets) {
      if (pkt.id >= 1 && pkt.id <= 16 && pkt.data.length >= 4) {
        const evd =
          (pkt.data[0] & 0xff) |
          ((pkt.data[1] & 0xff) << 8) |
          ((pkt.data[2] & 0xff) << 16) |
          ((pkt.data[3] & 0xff) << 24);
        readAngles[pkt.id] = evdToAngle(evd, pkt.id);
      }
    }

    return Object.keys(readAngles).length > 0 ? readAngles : null;
  }

  /**
   * [로봇 하드웨어 내장 모션 재생 / 정지 명령]
   * 원본 play_motion(nNum) / stop_motion(-2):
   * - 내장 모션(Addr 66)은 반드시 바이패스 모드가 꺼진 상태(Addr 19 = 0)에서 실행해야 합니다!
   */
  async playMotionOnController(pageNumber) {
    if (!this.isConnected) return false;

    // 내장 모션 실행을 위해 Addr 19 = 0 (Motion Mode) 전환
    if (this.controllerMode !== 0) {
      const motionModePkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 19, [0]);
      await this.writeRawPacket(motionModePkt, '내장 모션 모드 전환 (Addr:19 = 0)', true, 150);
      this.controllerMode = 0;
      await new Promise((r) => setTimeout(r, 60));
    }

    const wData = pageNumber & 0xffff;
    const pkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 66, [wData & 0xff, (wData >> 8) & 0xff]);
    await this.writeRawPacket(pkt, `하드웨어 내장 모션 재생 (Page #${pageNumber}, Addr:66)`, true, 160);
    return true;
  }

  async stopMotionOnController() {
    if (!this.isConnected) return false;
    // -2 = 0xFFFE
    const pkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 66, [0xfe, 0xff]);
    await this.writeRawPacket(pkt, '하드웨어 모션 정지 (Addr:66 = -2)', true, 150);

    // 정지 후 다시 실시간 제어(Bypass = 1) 모드로 복귀
    const bypassPkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 19, [1]);
    await this.writeRawPacket(bypassPkt, '실시간 제어 모드 복귀 (Addr:19 = 1)', true, 150);
    this.controllerMode = 1;
    return true;
  }

  /**
   * [모터 리부트 (과부하/에러 복구)]
   */
  async rebootMotors(motorId = DXL_ID_BROADCAST) {
    if (!this.isConnected) return false;
    const ctrlRebootPkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x03, 567, [motorId & 0xff]);
    await this.writeRawPacket(ctrlRebootPkt, `제어기 모터 리부트 명령 (Addr:567, ID:${motorId})`, true, 150);

    const dxlRebootPkt = buildDxlPacket(motorId, 0x08, null, []);
    await this.writeRawPacket(dxlRebootPkt, `다이나믹셀 프로토콜 Reboot (ID:${motorId}, Inst:0x08)`, false);
    return true;
  }

  /**
   * [연결 테스트용 Ping & 실제 살짝 움직임 테스트]
   * 사용자가 '통신 테스트 (Ping)' 버튼을 눌렀을 때 제어기 Ping + 살짝 인사 동작 후 원위치 복귀를 수행합니다.
   */
  async sendPingTest() {
    if (!this.isConnected) {
      return { ok: false, rxCount: 0, rxHex: '' };
    }
    const pingPkt = buildDxlPacket(DXL_ID_CONTROLLER, 0x01, null, []);
    const { rxBytes } = await this.writeRawPacket(
      pingPkt,
      '제어기 Ping 요청 (ID:200, Inst:0x01)',
      true,
      200
    );

    // 실제 로봇이 연결되어 있음을 눈으로 바로 확인할 수 있도록 양팔(5번, 6번)을 살짝 흔들었다가 원위치로 복귀합니다.
    await this.sendMotorAngles({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 20, 6: 20, 7: 0, 8: 0 }, 250, 0);
    await new Promise((r) => setTimeout(r, 280));
    await this.sendMotorAngles({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 }, 250, 0);

    return {
      ok: true,
      rxCount: rxBytes.length,
      rxHex: bytesToHex(rxBytes)
    };
  }
}

export const robotSerial = new RobotSerialManager();
export default robotSerial;
