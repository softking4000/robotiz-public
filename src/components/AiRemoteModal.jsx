// ============================================================================
// [파일 설명: AiRemoteModal.jsx]
// 원본 R-Motion의 AI 리모컨 조종기(#ai_remote_bg: 버튼 / 음성 인식 / 제스처 인식 탭 및
// 버튼 편집 팝업 #ai_cmb_motion_list_bg)를 담당하는 컴포넌트입니다.
// ============================================================================

import React, { useState } from 'react';

const INITIAL_AI_DATA = {
  // 0: 버튼 탭
  0: [
    { id: 1, name: '차렷 자세', motionNum: 1, comment: '기본 대기 자세로 복귀' },
    { id: 2, name: '인사하기', motionNum: 2, comment: '손을 흔들며 반갑게 인사' },
    { id: 3, name: '앞으로 전진', motionNum: 3, comment: '앞으로 4걸음 보행' },
    { id: 4, name: '뒤로 후진', motionNum: 4, comment: '뒤로 보행 이동' },
    { id: 5, name: '만세 세리머니', motionNum: 5, comment: '두 팔을 들어 만세' },
    { id: 6, name: '태권 정권찌르기', motionNum: 6, comment: '좌우 연속 정권 공격' }
  ],
  // 1: 음성 인식 탭
  1: [
    { id: 101, name: '안녕', motionNum: 2, comment: '"안녕" 또는 "인사" 음성 명령' },
    { id: 102, name: '앞으로 가', motionNum: 3, comment: '"앞으로" 음성 명령 시 전진' },
    { id: 103, name: '뒤로 가', motionNum: 4, comment: '"뒤로" 음성 명령 시 후진' },
    { id: 104, name: '만세', motionNum: 5, comment: '"만세" 음성 명령 시 세리머니' },
    { id: 105, name: '공격', motionNum: 6, comment: '"공격" 또는 "태권도" 음성 명령' },
    { id: 106, name: '차렷', motionNum: 1, comment: '"차렷" 음성 명령 시 정지' }
  ],
  // 2: 제스처 인식 탭
  2: [
    { id: 201, name: '손 흔들기 (Wave)', motionNum: 2, comment: '카메라 앞에서 손을 흔들 때' },
    { id: 202, name: '두 팔 들기 (Hands Up)', motionNum: 5, comment: '양손을 머리 위로 올릴 때' },
    { id: 203, name: '주먹 쥐기 (Fist)', motionNum: 6, comment: '주먹을 앞으로 내밀 때' },
    { id: 204, name: '가리키기 (Point Up)', motionNum: 3, comment: '위쪽을 가리킬 때 전진' }
  ]
};

export default function AiRemoteModal({
  isOpen,
  motionPages,
  onRunMotionPage,
  onClose,
  onShowToast
}) {
  // 상단 모드: 0 = 실행 모드, 1 = 편집 모드
  const [pageMode, setPageMode] = useState(0);

  // 탭 인덱스: 0 = 버튼, 1 = 음성, 2 = 제스처
  const [activeTab, setActiveTab] = useState(0);

  // 탭별 AI 리모컨 버튼 데이터 상태
  const [aiItemsByTab, setAiItemsByTab] = useState(INITIAL_AI_DATA);

  // 음성 인식(Web Speech API) 대기 상태 및 인식된 텍스트
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');

  // 버튼 편집 팝업(#ai_cmb_motion_list_bg) 상태
  const [editingItem, setEditingItem] = useState(null);

  if (!isOpen) return null;

  const currentList = aiItemsByTab[activeTab] || [];

  // 카드 클릭 시 (실행 모드면 모션 재생, 편집 모드면 편집 팝업 오픈)
  const handleCardClick = (item) => {
    if (pageMode === 1) {
      setEditingItem({ ...item });
      return;
    }
    if (item.motionNum > 0) {
      onRunMotionPage(item.motionNum);
      onShowToast(
        `🤖 AI 리모컨 [${item.name}] → 모션 [${String(item.motionNum).padStart(
          2,
          '0'
        )}]번 실행!`
      );
    } else {
      onShowToast('연결된 모션 번호가 없습니다.');
    }
  };

  // 브라우저 Web Speech API를 이용한 실제 한국어 음성 인식 실행
  const handleStartVoiceRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onShowToast(
        '이 브라우저는 Web Speech API를 지원하지 않아 음성 카드 직접 클릭으로 동작합니다.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListeningVoice(true);
      setRecognizedText('🎙️ 음성을 듣고 있습니다... 말씀해 보세요!');

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        setRecognizedText(`인식된 음성: "${transcript}"`);
        setIsListeningVoice(false);

        const matched = aiItemsByTab[1].find(
          (item) =>
            transcript.includes(item.name) || item.name.includes(transcript)
        );
        if (matched && matched.motionNum > 0) {
          onRunMotionPage(matched.motionNum);
          onShowToast(
            `🎙️ 음성 "${transcript}" 매칭 성공 → 모션 [${matched.motionNum}]번 실행!`
          );
        } else {
          onShowToast(`🎙️ "${transcript}"에 해당하는 음성 명령을 찾지 못했습니다.`);
        }
      };

      recognition.onerror = () => {
        setIsListeningVoice(false);
        setRecognizedText('음성 인식이 취소되었거나 마이크 권한이 필요합니다.');
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognition.start();
    } catch {
      setIsListeningVoice(false);
    }
  };

  return (
    <div className="rm-modal-root" id="ai_remote_bg">
      <div className="rm-modal-overlay" onClick={onClose} />

      <div
        className="rm-modal-container"
        style={{ maxWidth: '720px', width: '94%', maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================== 상단 헤더: 실행 / 편집 모드 전환 (#ai_remote_top) ==================== */}
        <div
          id="ai_remote_top"
          className="rm-modal-header"
          style={{ background: '#315fe0', padding: '14px 20px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 className="rm-modal-title">🤖 AI 리모컨</h2>
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '3px'
              }}
            >
              <button
                type="button"
                onClick={() => setPageMode(0)}
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 16px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  background: pageMode === 0 ? '#ffffff' : 'transparent',
                  color: pageMode === 0 ? '#315fe0' : '#ffffff'
                }}
              >
                실행
              </button>
              <button
                type="button"
                onClick={() => setPageMode(1)}
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 16px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  background: pageMode === 1 ? '#ffffff' : 'transparent',
                  color: pageMode === 1 ? '#315fe0' : '#ffffff'
                }}
              >
                편집
              </button>
            </div>
          </div>

          <button
            type="button"
            className="rm-modal-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* ==================== 2단 탭 바: 버튼 / 음성 / 제스처 (#ai_remote_page) ==================== */}
        <div
          id="ai_remote_page"
          style={{
            display: 'flex',
            borderBottom: '2px solid #e2e8f0',
            background: '#f8fafc'
          }}
        >
          {[
            { id: 0, label: '🔘 버튼' },
            { id: 1, label: '🎙️ 음성' },
            { id: 2, label: '✋ 제스처' }
          ].map((tab) => {
            const isOn = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderBottom: isOn
                    ? '3px solid #315fe0'
                    : '3px solid transparent',
                  background: isOn ? '#ffffff' : 'transparent',
                  color: isOn ? '#315fe0' : '#64748b',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ==================== 본문 영역 ==================== */}
        <div className="rm-modal-body">
          {/* 상단 안내 및 초기화 / 새 버튼 추가 바 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px'
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
              {pageMode === 0
                ? '카드를 클릭하면 연결된 로봇 모션이 즉시 실행됩니다.'
                : '✏️ 편집 모드: 카드를 클릭하여 이름과 연결 모션을 수정하세요.'}
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              {activeTab === 1 && pageMode === 0 && (
                <button
                  type="button"
                  onClick={handleStartVoiceRecognition}
                  style={{
                    background: isListeningVoice ? '#ef4444' : '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isListeningVoice ? '🎙️ 듣는 중...' : '🎙️ 마이크 음성 인식 시작'}
                </button>
              )}

              {pageMode === 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = Date.now();
                      const newItem = {
                        id: newId,
                        name: `새 명령 ${currentList.length + 1}`,
                        motionNum: 1,
                        comment: '새로 추가된 AI 리모컨 버튼'
                      };
                      setAiItemsByTab((prev) => ({
                        ...prev,
                        [activeTab]: [...prev[activeTab], newItem]
                      }));
                      setEditingItem(newItem);
                    }}
                    style={{
                      background: '#315fe0',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + 새 버튼 추가
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAiItemsByTab(INITIAL_AI_DATA);
                      onShowToast('AI 리모컨 설정이 초기값으로 복원되었습니다.');
                    }}
                    style={{
                      background: '#e2e8f0',
                      color: '#475569',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    초기화
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 음성 인식 상태 표시 배너 */}
          {activeTab === 1 && recognizedText && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '14px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#166534'
              }}
            >
              {recognizedText}
            </div>
          )}

          {/* AI 리모컨 버튼 그리드 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))',
              gap: '12px'
            }}
          >
            {currentList.map((item) => {
              const linkedPage = motionPages.find(
                (p) => p.pageNumber === item.motionNum
              );
              return (
                <div
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  style={{
                    background: pageMode === 1 ? '#fffbeb' : '#f8fafc',
                    border:
                      pageMode === 1
                        ? '2px dashed #f59e0b'
                        : '2px solid #cbd5e1',
                    borderRadius: '14px',
                    padding: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '110px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#1e293b'
                      }}
                    >
                      {item.name}
                    </span>
                    <span
                      style={{
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px'
                      }}
                    >
                      M-{String(item.motionNum).padStart(2, '0')}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      margin: '8px 0'
                    }}
                  >
                    {item.comment}
                  </p>

                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#315fe0',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>동작: {linkedPage?.name || `모션 ${item.motionNum}`}</span>
                    <span>{pageMode === 1 ? '⚙️ 편집' : '▶ 실행'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ==================== 버튼 편집 팝업창 (#ai_cmb_motion_list_bg) ==================== */}
        {editingItem && (
          <div
            id="ai_cmb_motion_list_bg"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '380px',
                overflow: 'hidden',
                boxShadow: '0 16px 40px rgba(0,0,0,0.25)'
              }}
            >
              <div
                style={{
                  background: '#315fe0',
                  color: '#ffffff',
                  padding: '12px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: 700,
                  fontSize: '15px'
                }}
              >
                <span>⚙️ 버튼 편집</span>
                <button
                  type="button"
                  onClick={() => {
                    setAiItemsByTab((prev) => ({
                      ...prev,
                      [activeTab]: prev[activeTab].filter(
                        (it) => it.id !== editingItem.id
                      )
                    }));
                    setEditingItem(null);
                    onShowToast('버튼을 삭제했습니다.');
                  }}
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🗑️ 삭제
                </button>
              </div>

              <div style={{ padding: '18px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginBottom: '4px'
                    }}
                  >
                    이름 (명령어)
                  </label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, name: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontWeight: 600
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginBottom: '4px'
                    }}
                  >
                    연결할 동작 (모션 번호)
                  </label>
                  <select
                    value={editingItem.motionNum}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        motionNum: Number(e.target.value)
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontWeight: 600
                    }}
                  >
                    <option value={0}>None (없음)</option>
                    {motionPages.map((p) => (
                      <option key={p.pageNumber} value={p.pageNumber}>
                        Motion {p.pageNumber} ({p.name || '빈 슬롯'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginBottom: '4px'
                    }}
                  >
                    설명 (코멘트)
                  </label>
                  <input
                    type="text"
                    value={editingItem.comment}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        comment: e.target.value
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontWeight: 600
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAiItemsByTab((prev) => ({
                        ...prev,
                        [activeTab]: prev[activeTab].map((it) =>
                          it.id === editingItem.id ? editingItem : it
                        )
                      }));
                      setEditingItem(null);
                      onShowToast('버튼 설정이 저장되었습니다.');
                    }}
                    style={{
                      background: '#315fe0',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 20px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    OK (저장)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    style={{
                      background: '#e2e8f0',
                      color: '#475569',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

