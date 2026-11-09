// ============================================================================
// [파일 설명: FileOpenSaveModals.jsx]
// 원본 R-Motion의 모션 파일 열기(#box_modal_file_open) 및
// 모션 파일 저장(#box_modal_file_save) 팝업 모달을 담당하는 컴포넌트입니다.
// ============================================================================

import React, { useState, useEffect } from 'react';

export function FileOpenModal({
  isOpen,
  savedFiles,
  onLoadFile,
  onDeleteSavedFile,
  onTriggerLocalImport,
  onClose
}) {
  // 탭 상태 ('ALL': 전체, 'ROBOT': 로봇 기본 프리셋, 'SERVER': 사용자/서버 저장본)
  const [activeTab, setActiveTab] = useState('ALL');

  if (!isOpen) return null;

  const filteredList = savedFiles.filter((file) => {
    if (activeTab === 'ALL') return true;
    return file.source === activeTab;
  });

  // 파일 내 저장된 활성 모션 페이지 개수 계산 헬퍼
  const countActiveMotionPages = (file) => {
    if (!Array.isArray(file?.pages)) return 0;
    return file.pages.filter(
      (p) => p.name || (Array.isArray(p.poses) && p.poses.some((ps) => ps.active))
    ).length;
  };

  return (
    <div className="rm-modal-root" id="box_modal_file_open">
      <div className="rm-modal-overlay" onClick={onClose} />

      <div
        className="rm-modal-container"
        style={{ maxWidth: '460px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rm-modal-header"
          style={{ background: '#315fe0', padding: '12px 20px' }}
        >
          <h2 className="rm-modal-title">📂 모션 파일 열기</h2>
          <button
            type="button"
            className="rm-modal-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="rm-modal-body" style={{ padding: '18px 20px' }}>
          {/* 전체 / 로봇 / 서버 탭 */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
            {[
              { id: 'ALL', label: '전체' },
              { id: 'ROBOT', label: '로봇' },
              { id: 'SERVER', label: '서버/내보관함' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 16px',
                  border: 'none',
                  borderRadius: '6px 6px 0 0',
                  background: activeTab === tab.id ? '#315fe0' : '#b2b2b2',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 파일 목록 테이블 */}
          <div
            style={{
              borderTop: '2px solid #315fe0',
              height: '230px',
              overflowY: 'auto',
              borderBottom: '1px solid #e2eaf3'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {filteredList.map((file, idx) => {
                  const activeCount = countActiveMotionPages(file);
                  return (
                    <tr
                      key={`${file.name}-${idx}`}
                      onClick={() => {
                        onLoadFile(file);
                        onClose();
                      }}
                      style={{
                        borderBottom: '1px solid #e2eaf3',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#d6e5f0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td
                        style={{
                          padding: '10px 12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#334155'
                        }}
                      >
                        <div>
                          [{file.source === 'ROBOT' ? '로봇' : '서버'}] {file.name}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            marginTop: '2px'
                          }}
                        >
                          저장된 모션: {activeCount}개
                          {file.savedAt ? ` · ${file.savedAt}` : ''}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '10px 8px',
                          textAlign: 'right',
                          width: '60px'
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSavedFile(file.name);
                          }}
                          style={{
                            border: 'none',
                            background: '#fee2e2',
                            color: '#dc2626',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PC 로컬 파일 직접 불러오기 버튼 */}
          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                onTriggerLocalImport();
              }}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px dashed #315fe0',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              📥 내 PC에서 모션 파일(.jmt / .json) 찾아보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FileSaveModal({
  isOpen,
  currentFileName,
  savedFiles,
  onSaveFile,
  onClose
}) {
  // 저장 대상 탭 ('SERVER': 서버/내보관함, 'ROBOT': 로봇 메모리, 'FILE': PC 파일 다운로드)
  const [saveTab, setSaveTab] = useState('SERVER');
  const [inputName, setInputName] = useState('');

  // 모달이 열릴 때마다 현재 파일명을 입력창에 동기화
  useEffect(() => {
    if (isOpen) {
      setInputName(
        (currentFileName || 'my_motion').replace(/\.(jmt|json)$/i, '')
      );
    }
  }, [isOpen, currentFileName]);

  if (!isOpen) return null;

  const handleConfirmSave = (e) => {
    if (e) e.preventDefault();
    const cleanName = (inputName || 'noname_motion').trim();
    const finalName = cleanName.endsWith('.jmt')
      ? cleanName
      : `${cleanName}.jmt`;
    onSaveFile(finalName, saveTab);
    onClose();
  };

  return (
    <div className="rm-modal-root" id="box_modal_file_save">
      <div className="rm-modal-overlay" onClick={onClose} />

      <div
        className="rm-modal-container"
        style={{ maxWidth: '460px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rm-modal-header"
          style={{ background: '#315fe0', padding: '12px 20px' }}
        >
          <h2 className="rm-modal-title">💾 모션 저장</h2>
          <button
            type="button"
            className="rm-modal-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleConfirmSave}
          className="rm-modal-body"
          style={{ padding: '18px 20px' }}
        >
          {/* 로봇 / 파일 / 서버 탭 */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {[
              { id: 'SERVER', label: '서버/내보관함' },
              { id: 'ROBOT', label: '로봇 메모리' },
              { id: 'FILE', label: 'PC 파일 다운로드(.jmt)' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSaveTab(tab.id)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: saveTab === tab.id ? '#315fe0' : '#b2b2b2',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 파일명 입력 박스 */}
          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '4px'
              }}
            >
              저장할 모션 파일 이름 (.jmt 자동 부여):
            </label>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="파일 이름을 입력해 주세요 (예: my_robot_motion)"
              maxLength={32}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid #315fe0',
                fontSize: '14px',
                fontWeight: 700
              }}
            />
          </div>

          {/* 기존 저장된 파일 리스트 (클릭 시 덮어쓰기 이름 자동 선택) */}
          <div
            style={{
              maxHeight: '140px',
              overflowY: 'auto',
              border: '1px solid #e2eaf3',
              borderRadius: '8px',
              marginBottom: '14px'
            }}
          >
            {savedFiles.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                onClick={() =>
                  setInputName(f.name.replace(/\.(jmt|json)$/i, ''))
                }
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <span>
                  [{f.source === 'ROBOT' ? '로봇' : '서버'}] {f.name}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                  클릭 시 선택
                </span>
              </div>
            ))}
          </div>

          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}
          >
            <button
              type="submit"
              style={{
                background: '#315fe0',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 24px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              ✓ 저장 완료
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#e2e8f0',
                color: '#475569',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 16px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
