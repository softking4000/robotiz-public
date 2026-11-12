// ============================================================================
// [파일명]: src/components/UsbCameraOverlay.jsx
// [교육용 설명]:
// 이 컴포넌트는 PC에 연결된 USB 카메라(외장 웹캠, 문서 카메라 등) 또는 내장 카메라의
// 실시간 영상을 R-Motion 3D 뷰포트 위에 띄워주는 '실시간 USB 카메라 모니터'입니다.
//
// [핵심 기능]:
// 1. navigator.mediaDevices.getUserMedia()를 이용한 실시간 카메라 영상 스트리밍
// 2. navigator.mediaDevices.enumerateDevices()를 이용한 USB 카메라 목록 자동 감지 및 전환
// 3. 마우스 드래그를 통한 카메라 창 위치 이동 & 3단계 크기 조절(소형/중형/대형)
// 4. 거울 모드(좌우 반전) 토글 및 현재 로봇 모습 사진 캡처(PNG 다운로드)
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

// 카메라 모니터 창 크기 프리셋 정의
const SIZE_PRESETS = {
  small: { label: '소형', width: 260, height: 195 },
  medium: { label: '중형', width: 360, height: 270 },
  large: { label: '대형', width: 500, height: 375 }
};

export default function UsbCameraOverlay({ onShowToast }) {
  // 1. 카메라 창 열림/닫힘 상태
  const [isOpen, setIsOpen] = useState(false);

  // 2. 감지된 비디오 입력 장치(USB 카메라 등) 목록과 현재 선택된 장치 ID
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // 3. 스트리밍 상태 및 오류 메시지
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 4. 화면 표시 옵션: 좌우 반전(거울 모드), 창 크기('small' | 'medium' | 'large'), 투명도
  const [isMirrored, setIsMirrored] = useState(false);
  const [sizeKey, setSizeKey] = useState('medium');

  // 5. 카메라 창 드래그 이동 좌표 (3D 뷰포트 좌측 상단 기준 초기 위치)
  const [position, setPosition] = useState({ x: 14, y: 54 });
  const dragStateRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 14,
    origY: 54
  });

  // 6. <video> 엘리먼트 및 현재 활성화된 MediaStream 참조
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // --------------------------------------------------------------------------
  // [함수 1: 현재 실행 중인 카메라 스트림을 안전하게 중지하는 함수]
  // 카메라 창을 닫거나 다른 USB 카메라로 전환할 때 기존 카메라를 해제합니다.
  // --------------------------------------------------------------------------
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // 트랙 종료 중 예외 무시
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // --------------------------------------------------------------------------
  // [함수 2: PC에 연결된 카메라(USB 카메라 포함) 목록을 조회하는 함수]
  // --------------------------------------------------------------------------
  const refreshCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      setErrorMsg('현재 브라우저는 카메라 장치 조회(MediaDevices API)를 지원하지 않습니다.');
      return [];
    }

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = allDevices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(cameras);

      // 아직 선택된 카메라가 없다면 외장 USB 카메라로 추정되는 장치를 우선 선택
      if (cameras.length > 0 && !selectedDeviceId) {
        const usbCam = cameras.find((c) =>
          /usb|external|webcam|logitech|hd|cam/i.test(c.label || '')
        );
        const targetCam = usbCam || cameras[cameras.length - 1] || cameras[0];
        setSelectedDeviceId(targetCam.deviceId);
      }
      return cameras;
    } catch (err) {
      console.warn('카메라 목록 조회 실패:', err);
      return [];
    }
  }, [selectedDeviceId]);

  // --------------------------------------------------------------------------
  // [함수 3: 선택한 USB 카메라의 실시간 영상 스트리밍 시작]
  // --------------------------------------------------------------------------
  const startCameraStream = useCallback(
    async (targetDeviceId = selectedDeviceId) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg(
          '현재 브라우저에서 카메라 기능을 사용할 수 없습니다. Chrome 또는 Edge를 사용해 주세요.'
        );
        return;
      }

      stopCurrentStream();
      setErrorMsg('');

      try {
        // 선택한 deviceId가 있으면 해당 USB 카메라를 지정하고, 없으면 기본 카메라를 요청합니다.
        const videoConstraints = targetDeviceId
          ? {
              deviceId: { exact: targetDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            };

        let mediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false
          });
        } catch {
          // 만약 지정된 deviceId로 열기에 실패하면 기본 비디오 스트림으로 재시도(폴백)합니다.
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }

        streamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
        }

        setIsStreaming(true);

        // 권한 승인 후에는 카메라의 실제 이름(예: "USB2.0 PC CAMERA")을 읽을 수 있으므로 목록을 갱신합니다.
        const updatedCams = await navigator.mediaDevices.enumerateDevices();
        const camList = updatedCams.filter((d) => d.kind === 'videoinput');
        setVideoDevices(camList);

        // 실제 연결된 트랙의 deviceId를 상태에 동기화합니다.
        const videoTrack = mediaStream.getVideoTracks()[0];
        const settings = videoTrack?.getSettings ? videoTrack.getSettings() : {};
        if (settings.deviceId) {
          setSelectedDeviceId(settings.deviceId);
        }
      } catch (err) {
        console.error('USB 카메라 연결 오류:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMsg(
            '카메라 권한이 거부되었습니다. 주소창 왼쪽의 🔒(권한 설정) 아이콘을 눌러 [카메라 허용]으로 변경해 주세요.'
          );
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorMsg(
            '연결된 USB 카메라를 찾을 수 없습니다. USB 케이블이 제대로 꽂혀 있는지 확인 후 [장치 새로고침]을 눌러주세요.'
          );
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setErrorMsg(
            '다른 프로그램(줌, 카메라 앱 등)에서 이미 USB 카메라를 사용 중입니다. 다른 앱을 닫고 다시 시도해 주세요.'
          );
        } else {
          setErrorMsg(`카메라를 열 수 없습니다: ${err.message || '알 수 없는 오류'}`);
        }
      }
    },
    [selectedDeviceId, stopCurrentStream]
  );

  // --------------------------------------------------------------------------
  // [함수 4: 현재 USB 카메라 화면을 사진(PNG)으로 캡처하여 저장]
  // --------------------------------------------------------------------------
  const handleCaptureSnapshot = () => {
    const video = videoRef.current;
    if (!video || !isStreaming) {
      if (onShowToast) onShowToast('⚠️ 먼저 USB 카메라가 켜져 있어야 캡처할 수 있습니다.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.download = `robotis_usb_cam_${timestamp}.png`;
    link.href = dataUrl;
    link.click();

    if (onShowToast) {
      onShowToast('📸 USB 카메라 화면을 PNG 이미지로 캡처하여 저장했습니다!');
    }
  };

  // --------------------------------------------------------------------------
  // [Effect 1: 카메라 창이 열릴 때 자동으로 스트림 시작, 닫힐 때 스트림 종료]
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (isOpen) {
      startCameraStream(selectedDeviceId);
    } else {
      stopCurrentStream();
    }
    return () => {
      stopCurrentStream();
    };
  }, [isOpen]);

  // --------------------------------------------------------------------------
  // [Effect 2: USB 카메라를 새로 꽂거나 뺐을 때(devicechange) 자동 감지]
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.addEventListener) return;

    const handleDeviceChange = () => {
      refreshCameraDevices();
      if (onShowToast && isOpen) {
        onShowToast('🔌 USB 카메라 장치 연결 상태 변경이 감지되어 목록을 갱신했습니다.');
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [isOpen, refreshCameraDevices, onShowToast]);

  // --------------------------------------------------------------------------
  // [Effect 3: 카메라 모니터 창 상단 바 마우스 드래그 이동 처리]
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!dragStateRef.current.dragging) return;
      const dx = e.clientX - dragStateRef.current.startX;
      const dy = e.clientY - dragStateRef.current.startY;
      setPosition({
        x: Math.max(6, dragStateRef.current.origX + dx),
        y: Math.max(6, dragStateRef.current.origY + dy)
      });
    };

    const handlePointerUp = () => {
      dragStateRef.current.dragging = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const currentSize = SIZE_PRESETS[sizeKey] || SIZE_PRESETS.medium;

  return (
    <>
      {/* ==================== 1. 3D 뷰포트 좌측 상단 [📷 USB 카메라] 열기/닫기 버튼 ==================== */}
      <button
        type="button"
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (onShowToast) {
            onShowToast(
              nextOpen
                ? '📷 실시간 USB 카메라 모니터 창을 열었습니다.'
                : '📷 USB 카메라 모니터 창을 닫았습니다.'
            );
          }
        }}
        style={{
          position: 'absolute',
          left: '14px',
          top: '12px',
          zIndex: 28,
          background: isOpen
            ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
            : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: '#ffffff',
          border: '2px solid rgba(255, 255, 255, 0.85)',
          borderRadius: '12px',
          padding: '7px 14px',
          fontSize: '12px',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)'
        }}
        title="PC에 연결된 USB 카메라를 앱 화면에 실시간으로 띄웁니다."
      >
        <span>📷</span>
        <span>{isOpen ? 'USB 카메라 끄기' : 'USB 카메라 켜기'}</span>
      </button>

      {/* ==================== 2. 실시간 USB 카메라 플로팅 모니터 창 ==================== */}
      {isOpen && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${currentSize.width}px`,
            zIndex: 40,
            background: '#0f172a',
            border: '2px solid #3b82f6',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 14px 34px rgba(0, 0, 0, 0.38)',
            display: 'flex',
            flexDirection: 'column',
            userSelect: 'none'
          }}
        >
          {/* 2-1) 상단 드래그 헤더 바 (제목 + 크기 조절 + 닫기) */}
          <div
            onPointerDown={(e) => {
              dragStateRef.current = {
                dragging: true,
                startX: e.clientX,
                startY: e.clientY,
                origX: position.x,
                origY: position.y
              };
            }}
            style={{
              background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%)',
              color: '#ffffff',
              padding: '8px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'move',
              fontSize: '12px',
              fontWeight: 800
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isStreaming ? '#4ade80' : '#f87171',
                  display: 'inline-block'
                }}
              />
              <span>📹 USB 카메라 LIVE (드래그 이동)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {Object.entries(SIZE_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSizeKey(key);
                  }}
                  style={{
                    background: sizeKey === key ? '#ffffff' : 'rgba(255,255,255,0.18)',
                    color: sizeKey === key ? '#1e3a8a' : '#ffffff',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '2px 7px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginLeft: '4px'
                }}
                title="카메라 닫기"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 2-2) 카메라 선택 드롭다운 및 제어 툴바 */}
          <div
            style={{
              background: '#1e293b',
              padding: '7px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              borderBottom: '1px solid #334155'
            }}
          >
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setSelectedDeviceId(nextId);
                  startCameraStream(nextId);
                }}
                style={{
                  flex: 1,
                  background: '#0f172a',
                  color: '#f8fafc',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                {videoDevices.length === 0 ? (
                  <option value="">기본 USB 카메라</option>
                ) : (
                  videoDevices.map((cam, idx) => (
                    <option key={cam.deviceId || idx} value={cam.deviceId}>
                      {cam.label || `USB 카메라 #${idx + 1}`}
                    </option>
                  ))
                )}
              </select>

              <button
                type="button"
                onClick={() => {
                  refreshCameraDevices();
                  startCameraStream(selectedDeviceId);
                }}
                style={{
                  background: '#334155',
                  color: '#e2e8f0',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                title="새로 연결한 USB 카메라 다시 검색"
              >
                🔄 새로고침
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setIsMirrored((prev) => !prev)}
                style={{
                  flex: 1,
                  background: isMirrored ? '#2563eb' : '#334155',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🪞 좌우 반전 {isMirrored ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={handleCaptureSnapshot}
                style={{
                  flex: 1,
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📸 스냅샷 저장
              </button>
            </div>
          </div>

          {/* 2-3) 실시간 비디오 렌더링 영역 */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: `${currentSize.height}px`,
              background: '#020617',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: isMirrored ? 'scaleX(-1)' : 'none',
                display: errorMsg ? 'none' : 'block'
              }}
            />

            {/* 오류 발생 시 안내 메시지 및 재시도 버튼 */}
            {errorMsg && (
              <div
                style={{
                  padding: '16px',
                  color: '#fca5a5',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div>⚠️ {errorMsg}</div>
                <button
                  type="button"
                  onClick={() => startCameraStream(selectedDeviceId)}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🔌 카메라 다시 연결하기
                </button>
              </div>
            )}

            {/* 스트림 준비 중 표시 */}
            {!isStreaming && !errorMsg && (
              <div
                style={{
                  position: 'absolute',
                  color: '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                ⏳ USB 카메라 영상을 불러오는 중입니다...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
