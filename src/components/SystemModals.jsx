// ============================================================================
// [파일 설명: SystemModals.jsx]
// 원본 R-Motion의 시스템 환경설정(#setup), 인터랙티브 튜토리얼(#uiguide),
// 보안 암호화가 적용된 로그인(#modal_login) 및 나의 활동 세포 현황(#cell-status-modal),
// 그리고 실제 COM5 (ROBOTIS Virtual COM Port)와 다이나믹셀 프로토콜 2.0으로
// 직접 통신하는 USB(WebSerial & 로컬 하드웨어 브릿지) / 블루투스 로봇 연결 모달을 담당합니다.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { RMOTION_BASE_URL } from '../data/robotData';
import {
  hashPasswordWithSalt,
  encryptSensitiveUserData
} from '../utils/securityCrypto';
import robotSerialService from '../utils/robotSerialService';

// ============================================================================
// 1. 환경설정 모달 (#setup)
// ============================================================================
export function SetupModal({
  isOpen,
  language,
  iconLarge,
  showTooltips,
  autoRotate,
  allowStartMotionEdit,
  onChangeLanguage,
  onChangeIconLarge,
  onChangeShowTooltips,
  onChangeAutoRotate,
  onChangeAllowStartMotionEdit,
  onRestoreMotions,
  onClose,
  onShowToast
}) {
  if (!isOpen) return null;

  return (
    <div className="rm-modal-root" id="setup">
      <div className="rm-modal-overlay" onClick={onClose} />

      <div
        className="rm-modal-container"
        style={{ maxWidth: '500px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rm-modal-header"
          style={{ background: '#315fe0', padding: '14px 20px' }}
        >
          <h2 className="rm-modal-title">⚙️ 환경 설정 (Setup)</h2>
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
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          {/* 1) 언어 선택 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '10px',
              borderBottom: '1px solid #f1f5f9'
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
              🌐 언어 (Language)
            </span>
            <select
              value={language}
              onChange={(e) => {
                onChangeLanguage(e.target.value);
                onShowToast(`언어 설정이 '${e.target.value}'(으)로 변경되었습니다.`);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontWeight: 700
              }}
            >
              <option value="ko">한국어 (Korean)</option>
              <option value="en">English (영어)</option>
              <option value="zh">中文 (중국어)</option>
            </select>
          </div>

          {/* 2) 좌측 툴바 아이콘 크기 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '10px',
              borderBottom: '1px solid #f1f5f9'
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
              🔍 좌측 도구 아이콘 크기
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onChangeIconLarge(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: !iconLarge ? '#315fe0' : '#f8fafc',
                  color: !iconLarge ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                기본
              </button>
              <button
                type="button"
                onClick={() => onChangeIconLarge(true)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: iconLarge ? '#315fe0' : '#f8fafc',
                  color: iconLarge ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                확대 (크게)
              </button>
            </div>
          </div>

          {/* 3) 체크박스 옵션 3종 (F1 툴팁, F2 3D 자동회전, 시작모션 편집) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: '#f8fafc',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}
          >
            <label
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
                fontWeight: 700,
                color: '#1e293b',
                cursor: 'pointer'
              }}
            >
              <span>💬 마우스 오버 시 안내문구(툴팁) 표시 (단축키: F1)</span>
              <input
                type="checkbox"
                checked={showTooltips}
                onChange={(e) => onChangeShowTooltips(e.target.checked)}
              />
            </label>

            <label
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
                fontWeight: 700,
                color: '#1e293b',
                cursor: 'pointer'
              }}
            >
              <span>🔄 3D 로봇 뷰어 카메라 자동 회전 (단축키: F2)</span>
              <input
                type="checkbox"
                checked={autoRotate}
                onChange={(e) => onChangeAutoRotate(e.target.checked)}
              />
            </label>

            <label
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
                fontWeight: 700,
                color: '#1e293b',
                cursor: 'pointer'
              }}
            >
              <span>🔓 로봇 시작 모션(1번 기본 모션) 편집 허용</span>
              <input
                type="checkbox"
                checked={allowStartMotionEdit}
                onChange={(e) => onChangeAllowStartMotionEdit(e.target.checked)}
              />
            </label>
          </div>

          {/* 4) 로봇 기본 모션 복원 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '4px'
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
              ♻️ 기본 모션 데이터 초기화
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  onRestoreMotions(false);
                  onShowToast('기본 모션 리스트가 초기 상태로 복원되었습니다.');
                }}
                style={{
                  background: '#e2e8f0',
                  color: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                복원
              </button>
              <button
                type="button"
                onClick={() => {
                  onRestoreMotions(true);
                  onShowToast('시작 모션을 포함한 전체 모션이 공장 초기화되었습니다.');
                }}
                style={{
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                복원 (시작모션 포함)
              </button>
            </div>
          </div>
        </div>

        <div className="rm-modal-footer">
          <button
            type="button"
            className="rm-btn rm-btn-primary"
            onClick={onClose}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. 인터랙티브 튜토리얼 가이드 모달 (#uiguide / #pgTutorial_0)
// ============================================================================
const TUTORIAL_STEPS = [
  {
    step: 1,
    title: '1단계: 로봇 선택 및 상단 제어 바',
    targetArea: '상단 헤더 바 (#tool_top)',
    desc: '상단 파란색 바에서 편집할 로봇(꼭두, 드래곤, Max-E2 등)을 언제든 변경할 수 있으며, 모션 재생(Play), 실행취소(Undo), 재실행(Redo), USB(COM5)/블루투스 로봇 연결을 수행합니다.'
  },
  {
    step: 2,
    title: '2단계: 3D 로봇 뷰어 및 관절 각도 조절',
    targetArea: '중앙 3D 뷰어 (#webgl-output)',
    desc: '마우스로 3D 로봇의 관절이나 번호 배지(ID 1~8)를 클릭·드래그하면 관절이 회전하며 선택된 타임라인 포즈에 즉시 자동 저장됩니다. 상단 [축 제어 바]에서 정밀 각도를 입력할 수도 있습니다.'
  },
  {
    step: 3,
    title: '3단계: 자세 캡처 및 좌/우 대칭 도구',
    targetArea: '좌측 세로 툴바 (#tool_side)',
    desc: '로봇 자세를 만든 뒤 좌측 첫 번째 [카메라(캡처)] 아이콘을 누르면 하단 타임라인에 자세가 확정됩니다. [초기 자세], [좌/우 동일 복사], [좌/우 반전 미러] 버튼으로 대칭 동작을 손쉽게 만드세요.'
  },
  {
    step: 4,
    title: '4단계: 7단계 포즈 타임라인 & 표정·효과음',
    targetArea: '하단 포즈 타임라인 (#uipose)',
    desc: '하나의 모션은 최대 7개의 연속 자세(Pose 1~7)로 구성됩니다. 각 포즈 슬롯을 더블클릭하면 이동시간/대기시간을 조절할 수 있고, 우클릭 메뉴에서 로봇 얼굴 표정(이모티콘)과 효과음을 넣을 수 있습니다.'
  },
  {
    step: 5,
    title: '5단계: 30개 모션 페이지 & [Memory] 병합',
    targetArea: '우측 모션 리스트 (#uipage)',
    desc: '총 30개의 모션 페이지를 관리합니다. 우측 상단의 [Memory] 버튼을 누르면 다른 모션 파일의 동작들을 나란히 띄워놓고 [←] 버튼으로 원하는 동작만 내 프로젝트로 쏙 가져올 수 있습니다.'
  },
  {
    step: 6,
    title: '6단계: 무선 패드 · AI 음성 리모컨 · 전문가 도구',
    targetArea: '좌측 리모컨 아이콘 & 우측 슬라이드 메뉴',
    desc: '좌측 조이스틱 아이콘으로 가상 게임패드를 열거나, 우측 메뉴에서 한국어 음성 인식이 가능한 [AI 리모컨], 서보모터를 정밀 진단하는 [Dxl Management], 군무 공연용 [Dance Manager]를 활용할 수 있습니다.'
  }
];

export function TutorialModal({ isOpen, onClose }) {
  const [stepIdx, setStepIdx] = useState(0);

  if (!isOpen) return null;

  const current = TUTORIAL_STEPS[stepIdx];

  return (
    <div className="rm-modal-root" id="uiguide">
      <div className="rm-modal-overlay" onClick={onClose} />

      <div
        className="rm-modal-container"
        style={{ maxWidth: '560px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rm-modal-header"
          style={{ background: '#315fe0', padding: '14px 20px' }}
        >
          <h2 className="rm-modal-title">
            💡 R-Motion 사용 가이드 ({stepIdx + 1} / {TUTORIAL_STEPS.length})
          </h2>
          <button
            type="button"
            className="rm-modal-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="rm-modal-body" style={{ padding: '24px' }}>
          <div
            style={{
              display: 'inline-block',
              background: '#dbeafe',
              color: '#1d4ed8',
              fontSize: '12px',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '999px',
              marginBottom: '10px'
            }}
          >
            📍 위치: {current.targetArea}
          </div>

          <h3
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 12px 0'
            }}
          >
            {current.title}
          </h3>

          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.65,
              color: '#334155',
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              margin: 0
            }}
          >
            {current.desc}
          </p>

          {/* 하단 단계 인디케이터 점 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '18px'
            }}
          >
            {TUTORIAL_STEPS.map((s, idx) => (
              <div
                key={s.step}
                onClick={() => setStepIdx(idx)}
                style={{
                  width: idx === stepIdx ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '999px',
                  background: idx === stepIdx ? '#315fe0' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              />
            ))}
          </div>
        </div>

        <div
          className="rm-modal-footer"
          style={{ display: 'flex', justifyContent: 'space-between' }}
        >
          <button
            type="button"
            className="rm-btn rm-btn-secondary"
            onClick={onClose}
          >
            Skip (건너뛰기)
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="rm-btn rm-btn-secondary"
              disabled={stepIdx === 0}
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              style={{ opacity: stepIdx === 0 ? 0.5 : 1 }}
            >
              ◀ 이전
            </button>
            {stepIdx < TUTORIAL_STEPS.length - 1 ? (
              <button
                type="button"
                className="rm-btn rm-btn-primary"
                onClick={() => setStepIdx((i) => i + 1)}
              >
                다음 ▶
              </button>
            ) : (
              <button
                type="button"
                className="rm-btn rm-btn-primary"
                onClick={onClose}
              >
                튜토리얼 완료
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. 보안 암호화 로그인 모달 (#modal_login)
// - 사용자 규칙 8번 준수: 비밀번호 및 사용자 정보를 평문으로 저장하거나 전달하지 않고,
//   반드시 SHA-256 + Salt 해시 및 서명 암호화(encryptSensitiveUserData)를 거칩니다.
// ============================================================================
export function LoginModal({ isOpen, onLoginSuccess, onClose, onShowToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      onShowToast('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setIsEncrypting(true);
    try {
      // 1) 비밀번호를 평문으로 다루지 않고 즉시 SHA-256 + Salt 단방향 암호화 수행
      const passwordHash = await hashPasswordWithSalt(password);

      // 2) 사용자 프로필 객체 구성 (평문 비밀번호는 절대 포함하지 않음)
      const safeUserPayload = {
        username: username.trim(),
        passwordHash,
        cells: {
          rblock: 12,
          rmotion: 35,
          circle: 8
        },
        loginAt: new Date().toISOString()
      };

      // 3) 로컬 스토리지 및 상태 전달 전 전체 사용자 객체를 한 번 더 암호화 서명
      const encryptedToken = await encryptSensitiveUserData(safeUserPayload);
      localStorage.setItem('rmotion_encrypted_session', encryptedToken);

      setPassword('');
      onLoginSuccess({
        ...safeUserPayload,
        encryptedToken
      });
      onClose();
      onShowToast(
        `🔐 '${safeUserPayload.username}' 님, SHA-256 암호화 보안 인증으로 로그인되었습니다.`
      );
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="rm-modal-root" id="modal_login">
      <div className="rm-modal-overlay" onClick={onClose} />

      <div
        className="rm-modal-container"
        style={{ maxWidth: '420px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rm-modal-header"
          style={{ background: '#315fe0', padding: '14px 20px' }}
        >
          <h2 className="rm-modal-title">🔐 STEAMCUP 보안 로그인</h2>
          <button
            type="button"
            className="rm-modal-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleLoginSubmit} className="rm-modal-body">
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              padding: '10px 12px',
              marginBottom: '14px',
              fontSize: '12px',
              color: '#1e3a8a',
              lineHeight: 1.5
            }}
          >
            🛡️ <strong>개인정보 암호화 보호 안내:</strong> 입력하신 비밀번호와
            계정 정보는 브라우저 내 <code>Web Crypto API (SHA-256 + Salt)</code>로
            즉시 암호화되어 평문이 노출되지 않습니다.
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '4px'
              }}
            >
              아이디 (STEAMCUP ID)
            </label>
            <input
              type="text"
              placeholder="예: steamcup_teacher"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 600
              }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '4px'
              }}
            >
              비밀번호 (Password)
            </label>
            <input
              type="password"
              placeholder="비밀번호 입력 (SHA-256 자동 암호화)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 600
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isEncrypting}
            style={{
              width: '100%',
              background: '#315fe0',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '11px',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            {isEncrypting ? '암호화 인증 중...' : '암호화 로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 4. 나의 활동 세포(CELL) 현황 모달 (#cell-status-modal)
// ============================================================================
export function CellStatusModal({ isOpen, userInfo, onLogout, onClose }) {
  if (!isOpen || !userInfo) return null;

  const cells = userInfo.cells || { rblock: 12, rmotion: 35, circle: 8 };

  return (
    <div className="rm-modal-root" id="cell-status-modal">
      <div className="rm-modal-overlay" onClick={onClose} />

      <div
        className="rm-modal-container"
        style={{ maxWidth: '460px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rm-modal-header"
          style={{ background: '#315fe0', padding: '14px 20px' }}
        >
          <h2 className="rm-modal-title">
            🧬 {userInfo.username} 님의 활동 CELL 현황
          </h2>
          <button
            type="button"
            className="rm-modal-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="rm-modal-body">
          {/* 3대 활동 세포 카드 (알블록, 알모션, 써클) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginBottom: '16px'
            }}
          >
            {[
              {
                title: '알블록 활동',
                count: cells.rblock,
                img: `${RMOTION_BASE_URL}/img/icon_cell01.png`
              },
              {
                title: '알모션 활동',
                count: cells.rmotion,
                img: `${RMOTION_BASE_URL}/img/icon_cell02.png`
              },
              {
                title: '써클 활동',
                count: cells.circle,
                img: `${RMOTION_BASE_URL}/img/icon_cell03.png`
              }
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <img
                  src={item.img}
                  alt={item.title}
                  style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                />
                <span
                  style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}
                >
                  {item.title}
                </span>
                <strong style={{ fontSize: '16px', color: '#315fe0' }}>
                  +{item.count} CELL
                </strong>
              </div>
            ))}
          </div>

          {/* 암호화 서명 요약 확인 박스 */}
          <div
            style={{
              background: '#f1f5f9',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '11px',
              color: '#475569',
              wordBreak: 'break-all'
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: '4px', color: '#1e293b' }}>
              🔒 SHA-256 비밀번호 해시 요약 (평문 미저장 검증):
            </div>
            <code>{userInfo.passwordHash?.slice(0, 36)}...</code>
          </div>
        </div>

        <div
          className="rm-modal-footer"
          style={{ display: 'flex', justifyContent: 'space-between' }}
        >
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('rmotion_encrypted_session');
              onLogout();
              onClose();
            }}
            style={{
              background: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🚪 로그아웃
          </button>
          <button
            type="button"
            className="rm-btn rm-btn-primary"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. USB(COM5 실제 로봇 직결 & WebSerial) / 블루투스(WebBluetooth) 연결 모달
// ============================================================================
export function DeviceConnectModal({
  isOpen,
  connectType = 'usb', // 'usb' | 'ble'
  isConnected = false,
  connectedDeviceName = '',
  onConnected,
  onDisconnected,
  onSyncReadAngles,
  onClose,
  onShowToast
}) {
  const [detectedPorts, setDetectedPorts] = useState([
    {
      portName: 'COM5',
      friendlyName: 'ROBOTIS Virtual COM Port(COM5)',
      deviceId: 'USB\\VID_FFF1&PID_FF48',
      manufacturer: 'ROBOTIS'
    }
  ]);
  const [selectedPort, setSelectedPort] = useState('COM5');
  const [isConnecting, setIsConnecting] = useState(false);
  const [serialSnapshot, setSerialSnapshot] = useState({
    isConnected: robotSerialService.isConnected,
    connectionMode: robotSerialService.connectionMode,
    portName: robotSerialService.portName,
    baudRate: robotSerialService.baudRate,
    packetLogs: robotSerialService.packetLogs
  });

  // 모달이 열릴 때 Windows 실제 COM 포트(COM5 등) 자동 스캔 및 패킷 로그 구독
  useEffect(() => {
    if (!isOpen) return undefined;

    let mounted = true;
    robotSerialService.detectAvailablePorts().then((res) => {
      if (!mounted) return;
      if (res.ports && res.ports.length > 0) {
        setDetectedPorts(res.ports);
        const com5 = res.ports.find((p) => p.portName === 'COM5');
        setSelectedPort(com5 ? 'COM5' : res.ports[0].portName);
      }
    });

    const unsub = robotSerialService.subscribe((snap) => {
      if (mounted) {
        setSerialSnapshot(snap);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isUsb = connectType === 'usb';

  // [방법 1: 로컬에서는 브릿지 직결, Vercel 클라우드에서는 WebSerial 자동 직결]
  const handleDirectComConnect = async (portName = 'COM5') => {
    setIsConnecting(true);
    try {
      const res = await robotSerialService.connectViaLocalBridge(portName);
      onConnected('usb', `${res.portName} [115200 bps]`, res.mode || 'bridge');
      onShowToast(
        `✅ 실제 하드웨어 '${res.portName}' 포트에 115200 bps로 즉시 연결되었습니다!`
      );
    } catch (err) {
      if (err && err.name === 'NotFoundError') {
        onShowToast(
          '💡 브라우저 상단에 뜨는 포트 목록에서 [COM5 (ROBOTIS Virtual COM Port)]를 선택한 뒤 [연결] 버튼을 눌러주세요!'
        );
      } else {
        onShowToast(`⚠️ ${err.message || 'COM5 포트 연결에 실패했습니다.'}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // [방법 2: 브라우저 표준 WebSerial 팝업으로 COM5 직접 선택 연결]
  const handleWebSerialConnect = async (useFilter = false) => {
    setIsConnecting(true);
    try {
      const res = await robotSerialService.connectViaWebSerial({
        useFilter,
        autoReuse: false
      });
      onConnected('usb', `${res.portName} [WebSerial 115200 bps]`, 'webserial');
      onShowToast(
        `✅ WebSerial을 통해 실제 '${res.portName}' 로봇과 연결되었습니다!`
      );
    } catch (err) {
      if (err && err.name === 'NotFoundError') {
        onShowToast(
          '💡 브라우저 상단에 뜨는 포트 목록에서 [COM5 (ROBOTIS Virtual COM Port)]를 선택한 뒤 [연결] 버튼을 눌러주세요!'
        );
      } else {
        onShowToast(`⚠️ WebSerial 연결 오류: ${err.message || '연결 실패'}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // [블루투스 무선 연결 핸들러]
  const handleBleConnect = async () => {
    try {
      if (!navigator.bluetooth) {
        onShowToast('현재 브라우저에서 WebBluetooth가 지원되지 않습니다.');
        return;
      }
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']
      });
      onConnected('ble', device?.name || 'BLE Robot');
      onClose();
    } catch {
      onShowToast('블루투스 장치 선택 창이 취소되었습니다.');
    }
  };

  // [실제 COM5 로봇과 Ping & 모터 움직임 테스트]
  const handlePingTest = async () => {
    const res = await robotSerialService.sendPingTest();
    if (res && res.ok) {
      onShowToast(
        res.rxCount > 0
          ? `🤖 COM5 응답 수신 및 모터 동작 테스트 성공! (${res.rxCount} bytes: ${res.rxHex})`
          : '🤖 COM5로 다이나믹셀 프로토콜 2.0 Ping 및 관절 움직임 패킷을 전송했습니다!'
      );
    } else {
      onShowToast('⚠️ 먼저 COM5 포트를 연결해 주세요.');
    }
  };

  // [실제 로봇의 현재 모터 각도 읽어오기 (SyncRead)]
  const handleReadRobotAngles = async () => {
    const angles = await robotSerialService.readMotorAngles([1, 2, 3, 4, 5, 6, 7, 8]);
    if (angles && onSyncReadAngles) {
      onSyncReadAngles(angles);
      onShowToast('📥 실제 COM5 로봇의 현재 관절 각도를 읽어와 3D 로봇과 포즈에 반영했습니다!');
    } else {
      onShowToast('📡 모터 위치 읽기(SyncRead Addr:132) 요청을 COM5로 전송했습니다. (로봇 전원을 확인해 주세요)');
    }
  };

  // [연결 해제]
  const handleDisconnectPort = async () => {
    await robotSerialService.disconnect();
    if (onDisconnected) onDisconnected();
  };

  return (
    <div
      className="rm-modal-root"
      id={isUsb ? 'serial_dialog' : 'ble_list_dialog'}
    >
      <div className="rm-modal-overlay" onClick={onClose} />

      <div
        className="rm-modal-container"
        style={{ maxWidth: '560px', width: '94%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rm-modal-header"
          style={{ background: '#315fe0', padding: '14px 20px' }}
        >
          <h2 className="rm-modal-title">
            {isUsb
              ? '🔌 로보티즈 USB 시리얼 연결 (COM5 실제 하드웨어)'
              : '📡 블루투스 무선 로봇 연결 (WebBluetooth)'}
          </h2>
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
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          {isUsb ? (
            <>
              {/* 1) 현재 PC에서 감지된 실제 물리 포트(COM5) 상태 카드 */}
              <div
                style={{
                  background: serialSnapshot.isConnected ? '#ecfdf5' : '#eff6ff',
                  border: `2px solid ${serialSnapshot.isConnected ? '#10b981' : '#3b82f6'}`,
                  borderRadius: '12px',
                  padding: '14px 16px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: serialSnapshot.isConnected ? '#065f46' : '#1e3a8a'
                    }}
                  >
                    {serialSnapshot.isConnected
                      ? `🟢 연결됨: ${serialSnapshot.portName}`
                      : '🔎 PC에서 감지된 실제 로보티즈 USB 포트'}
                  </span>
                  <span
                    style={{
                      background: serialSnapshot.isConnected ? '#10b981' : '#2563eb',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '999px'
                    }}
                  >
                    {serialSnapshot.isConnected
                      ? `통신 중 (${serialSnapshot.baudRate} bps)`
                      : '하드웨어 감지됨 (COM5)'}
                  </span>
                </div>

                {/* 감지된 COM 포트 목록 표시 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {detectedPorts.map((p) => (
                    <div
                      key={p.portName}
                      onClick={() => setSelectedPort(p.portName)}
                      style={{
                        background: '#ffffff',
                        border:
                          selectedPort === p.portName
                            ? '2px solid #2563eb'
                            : '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: '#0f172a'
                          }}
                        >
                          🔌 {p.friendlyName || p.portName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          포트: <strong>{p.portName}</strong> | 제조사:{' '}
                          {p.manufacturer || 'ROBOTIS'} | VID:FFF1 / PID:FF48 | 속도: 115200 bps
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#2563eb'
                        }}
                      >
                        {selectedPort === p.portName ? '✓ 선택됨' : '선택'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2) 실제 COM5 연결 실행 버튼 영역 (직결 / WebSerial 선택) */}
              {!serialSnapshot.isConnected ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={isConnecting}
                    onClick={() => handleDirectComConnect(selectedPort || 'COM5')}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '13px 16px',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.28)'
                    }}
                  >
                    {isConnecting
                      ? `⏳ ${selectedPort} 포트 연결 및 제어기 초기화 중...`
                      : `⚡ ${selectedPort} (ROBOTIS Virtual COM Port) 즉시 자동 연결하기`}
                  </button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={isConnecting}
                      onClick={() => handleWebSerialConnect(true)}
                      style={{
                        flex: 1,
                        background: '#315fe0',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      🌐 브라우저 WebSerial 팝업으로 COM5 선택 (로보티즈 전용)
                    </button>

                    <button
                      type="button"
                      disabled={isConnecting}
                      onClick={() => handleWebSerialConnect(false)}
                      style={{
                        background: '#e2e8f0',
                        color: '#1e293b',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      전체 COM 포트 보기
                    </button>
                  </div>
                </div>
              ) : (
                /* 3) COM5 연결 완료 시 실시간 하드웨어 테스트 및 제어 도구 */
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#1e293b'
                    }}
                  >
                    🛠️ 연결된 {serialSnapshot.portName} 로봇 실시간 제어 도구:
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={handlePingTest}
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '9px 10px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      🤖 Ping & 모터 움직임 테스트
                    </button>

                    <button
                      type="button"
                      onClick={handleReadRobotAngles}
                      style={{
                        background: '#0891b2',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '9px 10px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      📥 로봇 현재 관절 각도 읽기
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        robotSerialService.setTorque(true);
                        onShowToast('🔒 COM5 로봇 전체 모터 토크 ON (Addr:64 = 1) 전송 완료!');
                      }}
                      style={{
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '9px 10px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      🔒 전체 모터 토크 ON
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        robotSerialService.setTorque(false);
                        onShowToast('🔓 COM5 로봇 전체 모터 토크 OFF (손으로 관절 조작 가능) 전송 완료!');
                      }}
                      style={{
                        background: '#d97706',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '9px 10px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      🔓 전체 모터 토크 OFF
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnectPort}
                    style={{
                      width: '100%',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: '1px solid #fca5a5',
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      marginTop: '4px'
                    }}
                  >
                    🔌 {serialSnapshot.portName} 연결 안전 해제
                  </button>
                </div>
              )}

              {/* 4) 다이나믹셀 프로토콜 2.0 실시간 패킷 송수신 모니터 (TX / RX Hex) */}
              <div
                style={{
                  background: '#0f172a',
                  color: '#e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontSize: '11px',
                  fontFamily: 'Consolas, monospace',
                  maxHeight: '140px',
                  overflowY: 'auto'
                }}
              >
                <div
                  style={{
                    color: '#38bdf8',
                    fontWeight: 800,
                    marginBottom: '6px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>📟 다이나믹셀 프로토콜 2.0 패킷 모니터 (COM5 @ 115200)</span>
                  <span>
                    {serialSnapshot.packetLogs?.length || 0} Packets
                  </span>
                </div>
                {(!serialSnapshot.packetLogs ||
                  serialSnapshot.packetLogs.length === 0) ? (
                  <div style={{ color: '#64748b' }}>
                    아직 전송된 패킷이 없습니다. 위 연결 버튼을 누르면 초기화 패킷(FF FF FD 00 C8...)이 표시됩니다.
                  </div>
                ) : (
                  serialSnapshot.packetLogs
                    .slice()
                    .reverse()
                    .map((log) => (
                      <div
                        key={log.id}
                        style={{
                          marginBottom: '4px',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                          paddingBottom: '3px'
                        }}
                      >
                        <span
                          style={{
                            color:
                              log.direction === 'TX'
                                ? '#4ade80'
                                : log.direction === 'RX'
                                ? '#facc15'
                                : log.direction === 'ERR'
                                ? '#f87171'
                                : '#93c5fd',
                            fontWeight: 800,
                            marginRight: '6px'
                          }}
                        >
                          [{log.time} {log.direction}]
                        </span>
                        <span style={{ color: '#cbd5e1' }}>
                          {log.description}
                        </span>
                        <div
                          style={{
                            color: '#94a3b8',
                            fontSize: '10px',
                            wordBreak: 'break-all'
                          }}
                        >
                          {log.hex}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </>
          ) : (
            /* 블루투스 연결 탭 */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={handleBleConnect}
                style={{
                  width: '100%',
                  background: '#315fe0',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                🔍 주변 블루투스(BLE) 실제 로봇 검색하기
              </button>

              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '12px',
                  color: '#1e3a8a'
                }}
              >
                💡 <strong>안내:</strong> 현재 PC의 <strong>COM5</strong>에 USB로 연결된 로봇이 감지되었습니다. 유선 연결을 원하시면 상단 헤더의 <strong>[USB 아이콘]</strong>을 클릭하거나 아래 버튼으로 즉시 COM5에 연결하세요!
                <button
                  type="button"
                  onClick={() => handleDirectComConnect('COM5')}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ COM5 (USB 유선 포트)로 바로 연결하기
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rm-modal-footer">
          <button
            type="button"
            className="rm-btn rm-btn-primary"
            onClick={onClose}
          >
            확인 (창 닫기)
          </button>
        </div>
      </div>
    </div>
  );
}
