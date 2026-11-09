// ============================================================================
// [파일 설명: ExpertModals.jsx]
// 원본 R-Motion의 '전문가용' 메뉴에서 호출되는 3가지 핵심 모달 컴포넌트입니다.
// 1. ExpertSelectorModal: [Dxl Management]와 [Dance Manager] 중 실행할 도구를 선택하는 창
// 2. DxlManagerModal (#setup_dxl): 다이나믹셀(DYNAMIXEL) 스마트 서보모터의 ID, 드라이브 모드,
//    원점 오프셋(Home Offset), 토크/LED 제어, 원형 서보 다이얼 각도 테스트, 상태/에러 모니터링 도구
// 3. DanceManagerModal (#ui_dm): 여러 대의 로봇 또는 연속 동작(차렷, 동작1~3)을 음악/영상과
//    동기화하여 군무(Dance)를 실행하는 댄스 매니저 도구
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  RMOTION_BASE_URL,
  RMOTION_ASSETS_URL,
  STANDARD_8DOF_JOINTS,
  playSynthesizedSound
} from '../data/robotData';

// ============================================================================
// 1. 전문가 도구 선택 모달 (Dxl Management vs Dance Manager)
// ============================================================================
export function ExpertSelectorModal({
  isOpen,
  onSelectDxlManager,
  onSelectDanceManager,
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="rm-modal-root" id="select_dxl_or_dance">
      <div className="rm-modal-overlay" onClick={onClose} />
      <div
        className="rm-modal-container"
        style={{ maxWidth: '480px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rm-modal-header"
          style={{ background: '#315fe0', padding: '14px 20px' }}
        >
          <h2 className="rm-modal-title">🛠️ 전문가용 도구 선택</h2>
          <button
            type="button"
            className="rm-modal-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div
          className="rm-modal-body"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
            padding: '24px'
          }}
        >
          {/* 1) Dxl Management 선택 카드 */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectDxlManager();
            }}
            style={{
              background: '#f8fafc',
              border: '2px solid #cbd5e1',
              borderRadius: '16px',
              padding: '22px 14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.15s ease'
            }}
          >
            <img
              src={`${RMOTION_BASE_URL}/img/servo.png`}
              alt="DXL Management"
              style={{ width: '64px', height: '64px', objectFit: 'contain' }}
            />
            <span
              style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b' }}
            >
              Dxl Management
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#64748b',
                textAlign: 'center',
                lineHeight: 1.4
              }}
            >
              다이나믹셀 서보모터 ID, 원점 오프셋, 토크/LED 및 상태 정밀 진단
            </span>
          </button>

          {/* 2) Dance Manager 선택 카드 */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectDanceManager();
            }}
            style={{
              background: '#f8fafc',
              border: '2px solid #cbd5e1',
              borderRadius: '16px',
              padding: '22px 14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.15s ease'
            }}
          >
            <img
              src={`${RMOTION_ASSETS_URL}/img/logo-dancemanager.png`}
              alt="Dance Manager"
              style={{
                width: '120px',
                height: '64px',
                objectFit: 'contain',
                background: '#1e293b',
                borderRadius: '10px',
                padding: '6px'
              }}
            />
            <span
              style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b' }}
            >
              Dance Manager
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#64748b',
                textAlign: 'center',
                lineHeight: 1.4
              }}
            >
              음악/미디어 재생과 로봇 연속 안무(차렷·동작1~3) 군무 동기화
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. 다이나믹셀 매니저 모달 (#setup_dxl)
// ============================================================================
export function DxlManagerModal({
  isOpen,
  currentAngles,
  jointTorqueMap,
  onChangeJointAngle,
  onToggleJointTorque,
  onClose,
  onShowToast
}) {
  // 현재 선택된 다이나믹셀 모터 ID (1 ~ 8)
  const [selectedMotorId, setSelectedMotorId] = useState(1);

  // 각 모터별 세부 파라미터 상태 (Secondary ID, Drive Mode, Home Offset, LED 상태, 에러 플래그)
  const [motorParams, setMotorParams] = useState(() => {
    const init = {};
    STANDARD_8DOF_JOINTS.forEach((j) => {
      init[j.id] = {
        customId: j.id,
        secondaryId: 255,
        driveMode: 'normal', // 'normal' | 'reverse'
        homeOffset: 0,
        ledOn: true,
        velocity: 0,
        load: 8,
        temperature: 31,
        voltage: 7.4,
        errors: { volt: false, ot: false, es: false, ol: false }
      };
    });
    return init;
  });

  if (!isOpen) return null;

  const activeJointMeta =
    STANDARD_8DOF_JOINTS.find((j) => j.id === selectedMotorId) ||
    STANDARD_8DOF_JOINTS[0];
  const activeParam = motorParams[selectedMotorId] || motorParams[1];
  const currentDeg = Math.round(currentAngles[selectedMotorId] || 0);
  const isTorqueOn = jointTorqueMap[selectedMotorId] !== false;

  // 선택된 모터의 파라미터 업데이트 헬퍼
  const updateSelectedMotorParam = (patch) => {
    setMotorParams((prev) => ({
      ...prev,
      [selectedMotorId]: {
        ...prev[selectedMotorId],
        ...patch
      }
    }));
  };

  // 서보 각도 변경 시 3D 로봇에도 즉시 반영하고 순간 속도/부하 시뮬레이션 업데이트
  const handleSetServoAngle = (nextAngle) => {
    const clamped = Math.max(-150, Math.min(150, Math.round(nextAngle)));
    onChangeJointAngle(selectedMotorId, clamped);
    updateSelectedMotorParam({
      velocity: Math.round(Math.abs(clamped - currentDeg) * 0.45),
      load: Math.min(95, 6 + Math.round(Math.abs(clamped) * 0.25))
    });
  };

  return (
    <div className="rm-modal-root" id="setup_dxl">
      <div className="rm-modal-overlay" onClick={onClose} />

      <div
        className="rm-modal-container"
        style={{ maxWidth: '880px', width: '95%', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div
          className="rm-modal-header"
          style={{ background: '#1e293b', padding: '14px 20px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="rm-modal-title">
              ⚙️ DYNAMIXEL Management (다이나믹셀 서보 매니저)
            </h2>
          </div>
          <button
            type="button"
            className="rm-modal-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* 본문 3단 레이아웃: 좌측 모터 리스트 / 중앙 파라미터 & 센서값 / 우측 다이얼 제어판 */}
        <div
          className="rm-modal-body"
          style={{
            display: 'grid',
            gridTemplateColumns: '210px 1fr 270px',
            gap: '16px',
            background: '#f1f5f9'
          }}
        >
          {/* ==================== 1) 좌측 모터 리스트 (#dxl_list) ==================== */}
          <div
            id="dxl_list"
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #cbd5e1',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                background: '#334155',
                color: '#ffffff',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 800,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>연결된 모터 (8축)</span>
              <span style={{ fontSize: '11px', color: '#93c5fd' }}>XL-330</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {STANDARD_8DOF_JOINTS.map((joint) => {
                const isSel = joint.id === selectedMotorId;
                const deg = Math.round(currentAngles[joint.id] || 0);
                const tq = jointTorqueMap[joint.id] !== false;

                return (
                  <div
                    key={joint.id}
                    onClick={() => setSelectedMotorId(joint.id)}
                    style={{
                      padding: '9px 10px',
                      borderRadius: '10px',
                      marginBottom: '6px',
                      cursor: 'pointer',
                      background: isSel ? '#eff6ff' : '#f8fafc',
                      border: isSel
                        ? '2px solid #315fe0'
                        : '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: isSel ? '#1d4ed8' : '#1e293b'
                        }}
                      >
                        [ID:{joint.id}] {joint.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        현재 각도: {deg}°
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '999px',
                        background: tq ? '#dcfce7' : '#fee2e2',
                        color: tq ? '#15803d' : '#b91c1c'
                      }}
                    >
                      {tq ? 'TQ ON' : 'OFF'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ==================== 2) 중앙 모터 설정 및 상태 정보 (#dxl_info) ==================== */}
          <div
            id="dxl_info"
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #cbd5e1',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#1e293b',
                borderBottom: '2px solid #f1f5f9',
                paddingBottom: '8px'
              }}
            >
              📋 [{activeJointMeta.name}] 제어 테이블 & 실시간 센서
            </div>

            {/* ID 및 Secondary ID */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px'
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#475569'
                  }}
                >
                  ID (1~252)
                </label>
                <input
                  type="number"
                  min={1}
                  max={252}
                  value={activeParam.customId}
                  onChange={(e) =>
                    updateSelectedMotorParam({
                      customId: Number(e.target.value)
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontWeight: 700,
                    marginTop: '3px'
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#475569'
                  }}
                >
                  Secondary ID (보조 ID)
                </label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={activeParam.secondaryId}
                  onChange={(e) =>
                    updateSelectedMotorParam({
                      secondaryId: Number(e.target.value)
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontWeight: 700,
                    marginTop: '3px'
                  }}
                />
              </div>
            </div>

            {/* Drive Mode */}
            <div>
              <label
                style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}
              >
                Drive Mode (회전 방향 설정)
              </label>
              <select
                value={activeParam.driveMode}
                onChange={(e) => {
                  updateSelectedMotorParam({ driveMode: e.target.value });
                  onShowToast(
                    `모터 [ID:${selectedMotorId}] 드라이브 모드가 변경되었습니다.`
                  );
                }}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 700,
                  marginTop: '3px'
                }}
              >
                <option value="normal">Normal Mode (정방향 회전)</option>
                <option value="reverse">Reverse Mode (역방향 회전)</option>
              </select>
            </div>

            {/* Home Offset + [현재위치를 0도로 저장] */}
            <div
              style={{
                background: '#f8fafc',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px'
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#334155'
                  }}
                >
                  Home Offset (원점 오프셋):{' '}
                  <strong style={{ color: '#315fe0' }}>
                    {activeParam.homeOffset}°
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    updateSelectedMotorParam({ homeOffset: currentDeg });
                    onChangeJointAngle(selectedMotorId, 0);
                    onShowToast(
                      `모터 [ID:${selectedMotorId}]의 현재 위치(${currentDeg}°)를 새로운 0도(Home)로 저장했습니다.`
                    );
                  }}
                  style={{
                    background: '#315fe0',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  현재위치를 0도로 저장
                </button>
              </div>
            </div>

            {/* 실시간 상태 읽기 전용 게이지 5종 (Position, Velocity, Load, Temp, Voltage) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginTop: '4px'
              }}
            >
              {[
                { label: 'Position [º]', value: `${currentDeg} º` },
                {
                  label: 'Velocity [rev/min]',
                  value: `${activeParam.velocity} rpm`
                },
                { label: 'Load [%]', value: `${activeParam.load} %` },
                {
                  label: 'Temperature [ºC]',
                  value: `${activeParam.temperature} ºC`
                },
                { label: 'Voltage [V]', value: `${activeParam.voltage} V` }
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '7px 10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px'
                  }}
                >
                  <span style={{ color: '#64748b', fontWeight: 600 }}>
                    {stat.label}
                  </span>
                  <strong style={{ color: '#0f172a' }}>{stat.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* ==================== 3) 우측 서보 다이얼 및 제어판 (#dxl_control) ==================== */}
          <div
            id="dxl_control"
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #cbd5e1',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            {/* 상단 4대 명령 버튼 (Factory Reset, Reboot, Torq, LED) */}
            <div
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  updateSelectedMotorParam({
                    customId: selectedMotorId,
                    secondaryId: 255,
                    driveMode: 'normal',
                    homeOffset: 0
                  });
                  handleSetServoAngle(0);
                  onShowToast(
                    `모터 [ID:${selectedMotorId}] 공장 초기화(Factory Reset) 완료`
                  );
                }}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Factory Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  updateSelectedMotorParam({
                    errors: { volt: false, ot: false, es: false, ol: false }
                  });
                  onShowToast(`모터 [ID:${selectedMotorId}] 재부팅(Reboot) 완료`);
                }}
                style={{
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  color: '#92400e',
                  borderRadius: '8px',
                  padding: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Reboot
              </button>
              <button
                type="button"
                onClick={() => onToggleJointTorque(selectedMotorId)}
                style={{
                  background: isTorqueOn ? '#dcfce7' : '#fee2e2',
                  border: '1px solid #cbd5e1',
                  color: isTorqueOn ? '#166534' : '#991b1b',
                  borderRadius: '8px',
                  padding: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Torq {isTorqueOn ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                onClick={() => {
                  updateSelectedMotorParam({ ledOn: !activeParam.ledOn });
                  onShowToast(
                    `모터 [ID:${selectedMotorId}] 상태 LED ${
                      !activeParam.ledOn ? 'ON' : 'OFF'
                    }`
                  );
                }}
                style={{
                  background: activeParam.ledOn ? '#dbeafe' : '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: activeParam.ledOn ? '#1e40af' : '#64748b',
                  borderRadius: '8px',
                  padding: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                LED {activeParam.ledOn ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* 중앙 원형 서보 그래픽 + 회전 바늘 */}
            <div
              style={{
                position: 'relative',
                width: '150px',
                height: '150px',
                margin: '10px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img
                src={`${RMOTION_BASE_URL}/img/servo.png`}
                alt="서보 다이얼"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
              {/* 현재 각도를 가리키는 회전 인디케이터 바늘 */}
              <div
                style={{
                  position: 'absolute',
                  width: '6px',
                  height: '62px',
                  background: '#ef4444',
                  borderRadius: '999px',
                  transformOrigin: 'bottom center',
                  bottom: '50%',
                  transform: `rotate(${currentDeg}deg)`,
                  boxShadow: '0 0 6px rgba(239,68,68,0.6)',
                  pointerEvents: 'none'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 800
                }}
              >
                {currentDeg}°
              </div>
            </div>

            {/* 프리셋 각도 버튼 (+90, 0, -90) 및 스텝 버튼 (◀ / ▶) */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                width: '100%',
                justifyContent: 'center',
                marginBottom: '8px'
              }}
            >
              <button
                type="button"
                onClick={() => handleSetServoAngle(currentDeg - 5)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                ◀
              </button>
              {[-90, 0, 90].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSetServoAngle(preset)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #315fe0',
                    background: currentDeg === preset ? '#315fe0' : '#eff6ff',
                    color: currentDeg === preset ? '#ffffff' : '#1d4ed8',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {preset}°
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleSetServoAngle(currentDeg + 5)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                ▶
              </button>
            </div>

            {/* 하단 하드웨어 에러 상태 인디케이터 4종 (Volt, OT, ES, OL) */}
            <div
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '4px'
              }}
            >
              {[
                { key: 'volt', label: 'Volt', desc: '입력 전압 이상' },
                { key: 'ot', label: 'OT', desc: '내부 과열 감지' },
                { key: 'es', label: 'ES', desc: '전기 충격 감지' },
                { key: 'ol', label: 'OL', desc: '과부하(Overload) 감지' }
              ].map((err) => {
                const isErr = activeParam.errors[err.key];
                return (
                  <div
                    key={err.key}
                    title={err.desc}
                    style={{
                      textAlign: 'center',
                      padding: '4px 0',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      background: isErr ? '#ef4444' : '#e2e8f0',
                      color: isErr ? '#ffffff' : '#64748b'
                    }}
                  >
                    {err.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. 댄스 매니저 모달 (#ui_dm)
// ============================================================================
export function DanceManagerModal({
  isOpen,
  motionPages,
  onRunMotionPage,
  onStopMotion,
  onClose,
  onShowToast
}) {
  // 안무 시퀀스 번호 상태 (차렷, 동작1, 동작2, 동작3)
  const [standbyMotion, setStandbyMotion] = useState(1);
  const [danceMotion1, setDanceMotion1] = useState(2);
  const [danceMotion2, setDanceMotion2] = useState(5);
  const [danceMotion3, setDanceMotion3] = useState(6);

  // 옵션 체크박스 및 노래 간격(초)
  const [infiniteLoop, setInfiniteLoop] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [songIntervalSec, setSongIntervalSec] = useState(2.5);

  // 댄스 공연 실행 중 상태 및 현재 진행 단계 표시
  const [isDancePlaying, setIsDancePlaying] = useState(false);
  const [activeDanceStepLabel, setActiveDanceStepLabel] = useState('대기 중');
  const danceTimerRef = useRef(null);

  // 로컬 미디어(오디오/비디오) 파일 URL 상태
  const [mediaFileUrl, setMediaFileUrl] = useState(null);
  const [mediaFileName, setMediaFileName] = useState('STEAMCUP_Robot_Dance_Beat.synth');

  useEffect(() => {
    if (!isDancePlaying) {
      if (danceTimerRef.current) clearInterval(danceTimerRef.current);
      return undefined;
    }

    const sequence = [
      { label: '차렷 (준비 자세)', pageNum: standbyMotion, soundIdx: 1 },
      { label: '동작 1 (메인 안무 A)', pageNum: danceMotion1, soundIdx: 2 },
      { label: '동작 2 (메인 안무 B)', pageNum: danceMotion2, soundIdx: 3 },
      { label: '동작 3 (피날레 세리머니)', pageNum: danceMotion3, soundIdx: 4 }
    ];

    let idx = 0;
    const executeDanceStep = () => {
      const step = sequence[idx];
      setActiveDanceStepLabel(`${step.label} → 모션 [${step.pageNum}]번 실행 중`);
      onRunMotionPage(step.pageNum);
      playSynthesizedSound({ categoryId: 3, soundIndex: step.soundIdx });

      idx += 1;
      if (idx >= sequence.length) {
        if (infiniteLoop) {
          idx = 0;
        } else {
          clearInterval(danceTimerRef.current);
          setIsDancePlaying(false);
          setActiveDanceStepLabel('군무 시퀀스 재생 완료');
        }
      }
    };

    executeDanceStep();
    danceTimerRef.current = setInterval(
      executeDanceStep,
      Math.max(1200, Number(songIntervalSec) * 1000)
    );

    return () => {
      if (danceTimerRef.current) clearInterval(danceTimerRef.current);
    };
  }, [isDancePlaying]);

  if (!isOpen) return null;

  return (
    <div className="rm-modal-root" id="ui_dm">
      <div className="rm-modal-overlay" onClick={onClose} />

      <div
        className="rm-modal-container"
        style={{ maxWidth: '820px', width: '94%', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더: 댄스 매니저 로고 + 전체 Play / Stop */}
        <div
          className="rm-modal-header"
          style={{ background: '#0f172a', padding: '12px 20px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src={`${RMOTION_ASSETS_URL}/img/logo-dancemanager.png`}
              alt="Dance Manager"
              style={{ height: '30px', objectFit: 'contain' }}
            />
            <span
              style={{
                fontSize: '12px',
                color: '#38bdf8',
                fontWeight: 700,
                background: 'rgba(56,189,248,0.15)',
                padding: '4px 10px',
                borderRadius: '999px'
              }}
            >
              🎵 {activeDanceStepLabel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsDancePlaying((prev) => !prev)}
              style={{
                background: isDancePlaying ? '#ef4444' : '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 16px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {isDancePlaying ? '⏹ 군무 정지' : '▶ 군무 전체 시작'}
            </button>
            <button
              type="button"
              className="rm-modal-close-btn"
              onClick={() => {
                setIsDancePlaying(false);
                onClose();
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* 본문 영역 */}
        <div
          className="rm-modal-body"
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {/* 1) 동작 시퀀스 설정 카드 (차렷, 동작1, 동작2, 동작3) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px'
            }}
          >
            {[
              {
                title: '차렷 (대기 동작)',
                val: standbyMotion,
                setter: setStandbyMotion
              },
              {
                title: '동작 1 (안무 A)',
                val: danceMotion1,
                setter: setDanceMotion1
              },
              {
                title: '동작 2 (안무 B)',
                val: danceMotion2,
                setter: setDanceMotion2
              },
              {
                title: '동작 3 (피날레)',
                val: danceMotion3,
                setter: setDanceMotion3
              }
            ].map((slot) => (
              <div
                key={slot.title}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px'
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#334155',
                    marginBottom: '8px'
                  }}
                >
                  {slot.title}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    value={slot.val}
                    onChange={(e) => slot.setter(Number(e.target.value))}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontWeight: 700,
                      fontSize: '12px'
                    }}
                  >
                    {motionPages.map((p) => (
                      <option key={p.pageNumber} value={p.pageNumber}>
                        [{String(p.pageNumber).padStart(2, '0')}] {p.name || '빈 슬롯'}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      onRunMotionPage(slot.val);
                      onShowToast(
                        `💃 [${slot.title}] 모션 [${slot.val}]번을 단독 실행합니다.`
                      );
                    }}
                    style={{
                      background: '#315fe0',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 10px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    title="이 동작 즉시 실행"
                  >
                    ▶
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 2) 군무 동기화 옵션 바 (무한반복, 동기화, 노래간격, 배경음악 선택) */}
          <div
            style={{
              background: '#f1f5f9',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={infiniteLoop}
                  onChange={(e) => setInfiniteLoop(e.target.checked)}
                />
                무한반복
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={syncEnabled}
                  onChange={(e) => setSyncEnabled(e.target.checked)}
                />
                멀티 로봇 동기화(Sync)
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>
                  동작 간격(초):
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="20"
                  value={songIntervalSec}
                  onChange={(e) => setSongIntervalSec(e.target.value)}
                  style={{
                    width: '64px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontWeight: 700
                  }}
                />
              </div>
            </div>

            {/* 로컬 오디오/비디오 파일 열기 버튼 */}
            <div>
              <label
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-block'
                }}
              >
                🎵 음악/영상 파일 선택 ({mediaFileName})
                <input
                  type="file"
                  accept="audio/*,video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setMediaFileName(file.name);
                      setMediaFileUrl(URL.createObjectURL(file));
                      onShowToast(`'${file.name}' 미디어가 로드되었습니다.`);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* 3) 하단 스테이지 프리뷰 영역 */}
          <div
            style={{
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '14px',
              padding: '20px',
              minHeight: '140px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {mediaFileUrl ? (
              <video
                src={mediaFileUrl}
                controls
                style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }}
              />
            ) : (
              <>
                <div style={{ fontSize: '15px', fontWeight: 800 }}>
                  🕺 STEAMCUP Robot Group Dance Stage
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  상단 [▶ 군무 전체 시작] 버튼을 누르면 설정된 간격({songIntervalSec}초)마다
                  3D 로봇이 차렷 → 동작1 → 동작2 → 동작3 안무를 연속 수행합니다.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

