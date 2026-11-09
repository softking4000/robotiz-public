// ============================================================================
// [파일 설명: RemotePadView.jsx]
// 원본 R-Motion의 가상 게임패드 리모컨 조종 화면(#tool_remote)과
// 리모컨 버튼별 모션 단축키 편집 화면(#tool_remote_edit)을 담당하는 컴포넌트입니다.
// ============================================================================

import React, { useState } from 'react';
import { RMOTION_BASE_URL } from '../data/robotData';

// 패드 입력 키 목록 정의 (원본 13-U, 14-D, 15-L, 16-R 및 대각선, 버튼 1~6 반영)
const PAD_KEYS = [
  { id: 'U', label: '↑ (앞으로)', defaultPage: 3, posStyle: { left: '21.5%', top: '31%' } },
  { id: 'D', label: '↓ (뒤로)', defaultPage: 4, posStyle: { left: '21.5%', top: '61%' } },
  { id: 'L', label: '← (좌측)', defaultPage: 1, posStyle: { left: '13%', top: '46%' } },
  { id: 'R', label: '→ (우측)', defaultPage: 1, posStyle: { left: '30%', top: '46%' } },
  { id: 'UL', label: '↖ (좌상)', defaultPage: 0, posStyle: { left: '15.5%', top: '35%' } },
  { id: 'UR', label: '↗ (우상)', defaultPage: 0, posStyle: { left: '27.5%', top: '35%' } },
  { id: 'DL', label: '↙ (좌하)', defaultPage: 0, posStyle: { left: '15.5%', top: '57%' } },
  { id: 'DR', label: '↘ (우하)', defaultPage: 0, posStyle: { left: '27.5%', top: '57%' } },
  { id: 'BTN1', label: '버튼 1 (상)', defaultPage: 2, posStyle: { left: '75.5%', top: '32%' } },
  { id: 'BTN2', label: '버튼 2 (좌)', defaultPage: 6, posStyle: { left: '67%', top: '46%' } },
  { id: 'BTN3', label: '버튼 3 (우)', defaultPage: 5, posStyle: { left: '84%', top: '46%' } },
  { id: 'BTN4', label: '버튼 4 (하)', defaultPage: 1, posStyle: { left: '75.5%', top: '60%' } },
  { id: 'BTN5', label: '버튼 5 (SL)', defaultPage: 0, posStyle: { left: '18%', top: '14%' } },
  { id: 'BTN6', label: '버튼 6 (SR)', defaultPage: 0, posStyle: { left: '78%', top: '14%' } }
];

export default function RemotePadModal({
  isOpen,
  initialMode = 'play', // 'play' (조종 모드) | 'edit' (단축키 편집 모드)
  motionPages,
  onRunMotionPage,
  onStopMotion,
  onRebootRobot,
  onOpenAiRemote,
  onClose,
  onShowToast
}) {
  // 현재 모드 ('play' 조종 화면 vs 'edit' 패드 단축키 편집 화면)
  const [padMode, setPadMode] = useState(initialMode);

  // 각 패드 키에 매핑된 모션 페이지 번호 상태
  const [keyMap, setKeyMap] = useState(() => {
    const initial = {};
    PAD_KEYS.forEach((k) => {
      initial[k.id] = k.defaultPage;
    });
    return initial;
  });

  // 편집 모드에서 현재 선택된 패드 키 ID
  const [selectedKeyId, setSelectedKeyId] = useState('BTN1');

  // 현재 눌린(Active) 버튼 애니메이션 효과용 상태
  const [activeKeyId, setActiveKeyId] = useState(null);

  if (!isOpen) return null;

  // 조종 모드에서 패드 버튼을 눌렀을 때 실행되는 함수
  const handlePressPadKey = (keyObj) => {
    setActiveKeyId(keyObj.id);
    setTimeout(() => setActiveKeyId(null), 220);

    if (padMode === 'edit') {
      setSelectedKeyId(keyObj.id);
      return;
    }

    const mappedPageNum = keyMap[keyObj.id] || 0;
    if (mappedPageNum > 0) {
      onRunMotionPage(mappedPageNum);
      const targetPage = motionPages.find((p) => p.pageNumber === mappedPageNum);
      onShowToast(
        `🎮 [${keyObj.label}] 입력 → [${String(mappedPageNum).padStart(2, '0')}] ${
          targetPage?.name || '모션'
        } 실행!`
      );
    } else {
      onShowToast(`🎮 [${keyObj.label}] 키에 연결된 모션이 없습니다. (편집 탭에서 지정 가능)`);
    }
  };

  return (
    <div className="rm-modal-root" id="tool_remote">
      <div className="rm-modal-overlay" onClick={onClose} />

      <div
        className="rm-modal-container"
        style={{
          maxWidth: padMode === 'edit' ? '920px' : '760px',
          width: '95%',
          maxHeight: '90vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더: 조종 모드 / 단축키 편집 모드 전환 + AI 리모컨 이동 + 닫기 */}
        <div
          className="rm-modal-header"
          style={{ background: '#315fe0', padding: '12px 20px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="rm-modal-title">🎮 R-Motion 무선 리모컨</h2>
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.18)',
                borderRadius: '8px',
                padding: '3px'
              }}
            >
              <button
                type="button"
                onClick={() => setPadMode('play')}
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: padMode === 'play' ? '#ffffff' : 'transparent',
                  color: padMode === 'play' ? '#315fe0' : '#ffffff'
                }}
              >
                조종 화면
              </button>
              <button
                type="button"
                onClick={() => setPadMode('edit')}
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: padMode === 'edit' ? '#ffffff' : 'transparent',
                  color: padMode === 'edit' ? '#315fe0' : '#ffffff'
                }}
              >
                단축키 편집
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAiRemote();
              }}
              style={{
                border: '1px solid rgba(255,255,255,0.45)',
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🎙️ AI 리모컨 열기
            </button>
            <button
              type="button"
              className="rm-modal-close-btn"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        {/* 본문: 좌측 게임패드 그래픽 + (편집 모드일 때 우측 매핑 테이블) */}
        <div
          className="rm-modal-body"
          style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            alignItems: 'stretch'
          }}
        >
          {/* 1) 가상 게임패드 컨트롤러 영역 (.ip_pad_container) */}
          <div
            style={{
              flex: '1 1 440px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {padMode === 'edit' && (
              <div
                style={{
                  width: '100%',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  marginBottom: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1e3a8a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>
                  👆 패드의 버튼을 클릭한 뒤 우측에서 연결할 모션을 선택하세요!
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const cleared = {};
                    PAD_KEYS.forEach((k) => {
                      cleared[k.id] = 0;
                    });
                    setKeyMap(cleared);
                    onShowToast('전체 단축키 매핑을 초기화했습니다.');
                  }}
                  style={{
                    border: 'none',
                    background: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  전체 삭제
                </button>
              </div>
            )}

            {/* 원본 게임패드 이미지 컨테이너 */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '520px',
                aspectRatio: '16 / 10',
                background: '#f8fafc',
                borderRadius: '20px',
                border: '2px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.04)'
              }}
            >
              {/* 배경 패드 바디 이미지 */}
              <img
                src={`${RMOTION_BASE_URL}/img/game_pad_bg.png`}
                alt="게임패드 배경"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  pointerEvents: 'none'
                }}
              />

              {/* 좌측 방향키 핸들 장식 이미지 */}
              <img
                src={`${RMOTION_BASE_URL}/img/game_pad_handle.png`}
                alt="핸들"
                style={{
                  position: 'absolute',
                  left: '14%',
                  top: '33%',
                  width: '24%',
                  height: '36%',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  opacity: 0.9
                }}
              />

              {/* 패드 인터랙티브 버튼 오버레이 (방향키 8개 + 액션버튼 1~6) */}
              {PAD_KEYS.map((k) => {
                const isSelectedInEdit =
                  padMode === 'edit' && selectedKeyId === k.id;
                const isPressed = activeKeyId === k.id;
                const mappedNum = keyMap[k.id] || 0;

                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => handlePressPadKey(k)}
                    style={{
                      position: 'absolute',
                      ...k.posStyle,
                      transform: `translate(-50%, -50%) scale(${
                        isPressed ? 0.9 : 1
                      })`,
                      width: k.id.startsWith('BTN') ? '54px' : '42px',
                      height: k.id.startsWith('BTN') ? '54px' : '42px',
                      borderRadius: '50%',
                      border: isSelectedInEdit
                        ? '3px solid #ef4444'
                        : mappedNum > 0
                        ? '2px solid #315fe0'
                        : '1.5px solid #94a3b8',
                      background: isSelectedInEdit
                        ? 'rgba(239, 68, 68, 0.25)'
                        : mappedNum > 0
                        ? 'rgba(49, 95, 224, 0.2)'
                        : 'rgba(255, 255, 255, 0.65)',
                      color: '#1e293b',
                      fontWeight: 800,
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isSelectedInEdit
                        ? '0 0 14px rgba(239, 68, 68, 0.6)'
                        : '0 2px 6px rgba(0,0,0,0.15)',
                      transition: 'all 0.12s ease'
                    }}
                    title={`${k.label} → 모션 [${mappedNum || '없음'}]`}
                  >
                    <span>{k.id.replace('BTN', 'B')}</span>
                    {mappedNum > 0 && (
                      <span
                        style={{
                          fontSize: '9px',
                          color: '#1d4ed8',
                          background: '#dbeafe',
                          padding: '0 4px',
                          borderRadius: '4px',
                          marginTop: '1px'
                        }}
                      >
                        M{mappedNum}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* 중앙 하단 컨트롤 버튼 3종: STOP(정지), REBOOT(관절 재부팅), EXIT(종료) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '10%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '12px'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onStopMotion();
                    onShowToast('🛑 로봇 동작을 즉시 정지(Stop)했습니다.');
                  }}
                  style={{
                    border: 'none',
                    background: '#ef4444',
                    color: '#ffffff',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 3px 8px rgba(239, 68, 68, 0.35)'
                  }}
                >
                  ⏹ STOP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRebootRobot();
                    onShowToast('🔄 로봇 관절 재부팅(Reboot) 신호를 전송했습니다.');
                  }}
                  style={{
                    border: 'none',
                    background: '#f59e0b',
                    color: '#ffffff',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 3px 8px rgba(245, 158, 11, 0.35)'
                  }}
                >
                  🔄 REBOOT
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    border: 'none',
                    background: '#475569',
                    color: '#ffffff',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🚪 EXIT
                </button>
              </div>
            </div>
          </div>

          {/* 2) 우측 단축키 매핑 테이블 (#tbRemote) */}
          <div
            style={{
              flex: '1 1 280px',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              overflow: 'hidden',
              maxHeight: '420px'
            }}
          >
            <div
              style={{
                background: '#f1f5f9',
                padding: '10px 14px',
                fontWeight: 800,
                fontSize: '13px',
                color: '#334155',
                borderBottom: '1px solid #e2e8f0'
              }}
            >
              {padMode === 'edit'
                ? `🎯 [${selectedKeyId}] 키에 연결할 모션 선택`
                : '📋 현재 패드 단축키 설정 목록'}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {padMode === 'edit' && (
                <div style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#475569',
                      marginBottom: '6px'
                    }}
                  >
                    선택된 키({selectedKeyId})에 배정할 모션 페이지:
                  </label>
                  <select
                    value={keyMap[selectedKeyId] || 0}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setKeyMap((prev) => ({
                        ...prev,
                        [selectedKeyId]: val
                      }));
                      onShowToast(
                        `패드 [${selectedKeyId}] 키에 모션 [${val || '없음'}]번을 배정했습니다.`
                      );
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #315fe0',
                      fontWeight: 700,
                      fontSize: '13px',
                      color: '#1e293b'
                    }}
                  >
                    <option value={0}>연결 안 함 (None)</option>
                    {motionPages.map((p) => (
                      <option key={p.pageNumber} value={p.pageNumber}>
                        [{String(p.pageNumber).padStart(2, '0')}]{' '}
                        {p.name || '빈 모션 슬롯'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 전체 키 매핑 요약 표 */}
              <table
                id="tbRemote"
                style={{ width: '100%', borderCollapse: 'collapse' }}
              >
                <thead>
                  <tr
                    style={{
                      background: '#e2e8f0',
                      fontSize: '12px',
                      color: '#334155'
                    }}
                  >
                    <th style={{ padding: '7px 10px' }}>입력키</th>
                    <th style={{ padding: '7px 10px' }}>실행 모션</th>
                  </tr>
                </thead>
                <tbody>
                  {PAD_KEYS.map((k) => {
                    const mNum = keyMap[k.id] || 0;
                    const pageObj = motionPages.find(
                      (p) => p.pageNumber === mNum
                    );
                    const isSel = selectedKeyId === k.id;
                    return (
                      <tr
                        key={k.id}
                        onClick={() => {
                          setSelectedKeyId(k.id);
                          if (padMode === 'play') handlePressPadKey(k);
                        }}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSel ? '#eff6ff' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        <td
                          style={{
                            padding: '7px 10px',
                            fontWeight: 700,
                            color: '#1e3a8a'
                          }}
                        >
                          {k.label}
                        </td>
                        <td
                          style={{
                            padding: '7px 10px',
                            fontWeight: 600,
                            color: mNum > 0 ? '#2563eb' : '#94a3b8'
                          }}
                        >
                          {mNum > 0
                            ? `[${String(mNum).padStart(2, '0')}] ${
                                pageObj?.name || '모션'
                              }`
                            : '미지정'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

