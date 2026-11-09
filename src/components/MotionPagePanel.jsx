// ============================================================================
// [파일 설명: MotionPagePanel.jsx]
// 원본 R-Motion의 우측 모션 그룹(Page) 리스트(#tool_page),
// 우클릭 컨텍스트 메뉴(Play/이름바꾸기/복사/붙여넣기/지우기/Next/Exit),
// 그리고 [Memory] 2단 파일 병합(Merge) 뷰를 담당하는 컴포넌트입니다.
// ============================================================================

import React, { useState } from 'react';
import { RMOTION_BASE_URL, createInitialMotionPages } from '../data/robotData';

export default function MotionPagePanel({
  motionPages,
  selectedPageNum,
  fileName,
  showTooltips,
  onSelectPage,
  onPlayPage,
  onRenamePage,
  onCopyPage,
  onPastePage,
  onDeletePage,
  onUpdatePageLinks,
  onMergePageFromMemory,
  onNewMotionList,
  onOpenFileModal,
  onSaveFileModal,
  onShowToast
}) {
  // [Memory] 2단 병합(Merge) 확장 뷰 열림 여부
  const [isCombineMode, setIsCombineMode] = useState(false);

  // 우측 [Memory] 리스트 데이터 및 선택된 메모리 페이지 번호
  const [memoryPages, setMemoryPages] = useState(() =>
    createInitialMotionPages()
  );
  const [selectedMemoryNum, setSelectedMemoryNum] = useState(2);

  // 모션 페이지 우클릭 컨텍스트 메뉴 상태
  const [pageMenu, setPageMenu] = useState({
    visible: false,
    pageNum: 1,
    x: 0,
    y: 0
  });

  // 모션 페이지 편집(이름바꾸기 / Next / Exit 설정) 인라인 모달 상태
  const [editModal, setEditModal] = useState({
    isOpen: false,
    mode: 'rename', // 'rename' | 'next' | 'exit'
    pageNum: 1,
    value: ''
  });

  // 모션 페이지 전체 시간(초) 계산 헬퍼 함수
  const calculatePageTotalTime = (page) => {
    if (!page || !page.poses) return '00.00';
    const total = page.poses.reduce((sum, pose) => {
      if (!pose.active) return sum;
      return sum + Number(pose.playTime || 0) + Number(pose.pauseTime || 0);
    }, 0);
    return total.toFixed(2).padStart(5, '0');
  };

  return (
    <aside
      id="tool_page"
      className="rm-move-panel"
      style={{
        width: isCombineMode ? '620px' : '420px',
        position: 'relative',
        transition: 'width 0.25s ease'
      }}
      onClick={() => {
        if (pageMenu.visible) setPageMenu({ ...pageMenu, visible: false });
      }}
    >
      {/* ==================== [Memory] 파일 병합 모드 상단 바 ==================== */}
      {isCombineMode && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 10px',
            marginBottom: '6px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px'
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '12px', color: '#1e40af' }}>
            📂 현재 로봇 모션 리스트
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{ fontWeight: 800, fontSize: '12px', color: '#047857' }}
            >
              [Memory] 임시 메모리
            </span>
            <button
              type="button"
              onClick={() => setIsCombineMode(false)}
              style={{
                background: '#315fe0',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              병합 닫기
            </button>
          </div>
        </div>
      )}

      {/* ==================== 모션 리스트 본문 (단일 뷰 또는 좌/우 병합 뷰) ==================== */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          gap: '6px',
          overflow: 'hidden',
          borderBottom: '1px solid #d0dae3'
        }}
      >
        {/* 1) 좌측 기본 모션 페이지 리스트 (#uipage_ul) */}
        <div
          id="uipage_ul"
          className="rm-move-list"
          style={{ flex: 1, borderBottom: 'none' }}
        >
          {motionPages.map((page) => {
            const isSelected = page.pageNumber === selectedPageNum;
            const hasActivePose = page.poses.some((p) => p.active);
            const cardClass = isSelected
              ? 'on'
              : hasActivePose || page.name
              ? 'off'
              : 'empty';

            return (
              <div
                key={page.pageNumber}
                className={`rm-move-card ${cardClass}`}
                onClick={() => onSelectPage(page.pageNumber)}
                onDoubleClick={() => {
                  onSelectPage(page.pageNumber);
                  setEditModal({
                    isOpen: true,
                    mode: 'rename',
                    pageNum: page.pageNumber,
                    value: page.name || ''
                  });
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onSelectPage(page.pageNumber);
                  const panelRect =
                    e.currentTarget.closest('#tool_page').getBoundingClientRect();
                  setPageMenu({
                    visible: true,
                    pageNum: page.pageNumber,
                    x: Math.min(panelRect.width - 160, e.clientX - panelRect.left),
                    y: Math.min(panelRect.height - 230, e.clientY - panelRect.top)
                  });
                }}
              >
                <div className="rm-move-card-top">
                  <span className="rm-move-card-title">
                    [{String(page.pageNumber).padStart(2, '0')}]{' '}
                    {page.name || '빈 모션 슬롯'}
                  </span>
                  <span className="rm-move-card-time">
                    {calculatePageTotalTime(page)} 초
                  </span>
                </div>
                <div className="rm-move-card-bottom">
                  <span>
                    다음모션(Next):{' '}
                    {page.nextPage > 0
                      ? `[${String(page.nextPage).padStart(2, '0')}]`
                      : '없음'}
                  </span>
                  <span>
                    탈출모션(Exit):{' '}
                    {page.exitPage > 0
                      ? `[${String(page.exitPage).padStart(2, '0')}]`
                      : '없음'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 2) [Memory] 병합 모드일 때 중앙 양방향 복사 화살표 & 우측 메모리 리스트 */}
        {isCombineMode && (
          <>
            {/* 중앙 화살표 버튼 (.move_merge_arr) */}
            <div
              style={{
                width: '38px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px'
              }}
            >
              <button
                type="button"
                title="우측 [Memory]에서 선택된 모션을 좌측 현재 슬롯으로 가져오기 (←)"
                onClick={() => {
                  const memPage = memoryPages.find(
                    (m) => m.pageNumber === selectedMemoryNum
                  );
                  if (memPage) {
                    onMergePageFromMemory(selectedPageNum, memPage);
                  }
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  background: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <img
                  src={`${RMOTION_BASE_URL}/img/ico_moveleft.png`}
                  alt="←"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </button>

              <button
                type="button"
                title="좌측 현재 모션을 우측 [Memory] 슬롯으로 내보내기 (→)"
                onClick={() => {
                  const srcPage = motionPages.find(
                    (p) => p.pageNumber === selectedPageNum
                  );
                  if (!srcPage) return;
                  setMemoryPages((prev) =>
                    prev.map((m) =>
                      m.pageNumber === selectedMemoryNum
                        ? {
                            ...m,
                            name: srcPage.name,
                            nextPage: srcPage.nextPage,
                            exitPage: srcPage.exitPage,
                            poses: srcPage.poses.map((ps) => ({
                              ...ps,
                              angles: { ...ps.angles }
                            }))
                          }
                        : m
                    )
                  );
                  onShowToast(
                    `[${selectedPageNum}]번 모션을 [Memory ${selectedMemoryNum}]번으로 복사했습니다.`
                  );
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  background: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <img
                  src={`${RMOTION_BASE_URL}/img/ico_moveright.png`}
                  alt="→"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </button>
            </div>

            {/* 우측 [Memory] 모션 리스트 (#uipage_ul_right) */}
            <div
              id="uipage_ul_right"
              className="rm-move-list"
              style={{ flex: 1, borderBottom: 'none' }}
            >
              {memoryPages.map((mPage) => {
                const isSel = mPage.pageNumber === selectedMemoryNum;
                const hasPose = mPage.poses.some((p) => p.active);
                const cls = isSel ? 'on' : hasPose || mPage.name ? 'off' : 'empty';

                return (
                  <div
                    key={mPage.pageNumber}
                    className={`rm-move-card ${cls}`}
                    onClick={() => setSelectedMemoryNum(mPage.pageNumber)}
                  >
                    <div className="rm-move-card-top">
                      <span className="rm-move-card-title">
                        [M-{String(mPage.pageNumber).padStart(2, '0')}]{' '}
                        {mPage.name || '빈 메모리'}
                      </span>
                      <span className="rm-move-card-time">
                        {calculatePageTotalTime(mPage)} 초
                      </span>
                    </div>
                    <div className="rm-move-card-bottom">
                      <span>Next: {mPage.nextPage || '없음'}</span>
                      <span>Exit: {mPage.exitPage || '없음'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ==================== 하단 파일명 및 4대 퀵 메뉴 버튼 (.move_menu) ==================== */}
      <div className="rm-move-footer">
        <span className="rm-filename-label" title={fileName}>
          {fileName}
        </span>

        <div className="rm-move-menu-btns">
          {/* 1) 파일 병합 ([Memory] 뷰 토글) */}
          <button
            type="button"
            title={showTooltips ? '파일 병합 ([Memory] 비교 뷰 열기/닫기)' : ''}
            onClick={() => {
              setIsCombineMode((prev) => !prev);
              onShowToast(
                !isCombineMode
                  ? '[Memory] 모션 병합 뷰를 열었습니다.'
                  : '[Memory] 모션 병합 뷰를 닫았습니다.'
              );
            }}
          >
            <img src={`${RMOTION_BASE_URL}/img/ico_movecopy.png`} alt="병합" />
          </button>

          {/* 2) 새로 만들기 */}
          <button
            type="button"
            title={showTooltips ? '모션 전체 새로 만들기' : ''}
            onClick={onNewMotionList}
          >
            <img
              src={`${RMOTION_BASE_URL}/img/ico_movenew.png`}
              alt="새로만들기"
            />
          </button>

          {/* 3) 모션 파일 열기 */}
          <button
            type="button"
            title={showTooltips ? '모션 파일 열기' : ''}
            onClick={onOpenFileModal}
          >
            <img src={`${RMOTION_BASE_URL}/img/ico_moveopen.png`} alt="열기" />
          </button>

          {/* 4) 모션 파일 저장 */}
          <button
            type="button"
            title={showTooltips ? '모션 파일 저장 / 다운로드' : ''}
            onClick={onSaveFileModal}
          >
            <img src={`${RMOTION_BASE_URL}/img/ico_movosave.png`} alt="저장" />
          </button>
        </div>
      </div>

      {/* ==================== 모션 페이지 우클릭 컨텍스트 메뉴 (#contextmenu - uipage_ul) ==================== */}
      {pageMenu.visible && (
        <ul
          style={{
            position: 'absolute',
            left: `${pageMenu.x}px`,
            top: `${pageMenu.y}px`,
            zIndex: 150,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
            padding: '4px 0',
            minWidth: '150px',
            listStyle: 'none',
            margin: 0
          }}
        >
          {[
            {
              label: '▶ Play (즉시 재생)',
              action: () => onPlayPage(pageMenu.pageNum)
            },
            {
              label: '✏️ 이름바꾸기',
              action: () => {
                const target = motionPages.find(
                  (p) => p.pageNumber === pageMenu.pageNum
                );
                setEditModal({
                  isOpen: true,
                  mode: 'rename',
                  pageNum: pageMenu.pageNum,
                  value: target?.name || ''
                });
              }
            },
            {
              label: '📋 복사 (Copy)',
              action: () => onCopyPage(pageMenu.pageNum)
            },
            {
              label: '📌 붙여넣기 (Paste)',
              action: () => onPastePage(pageMenu.pageNum)
            },
            {
              label: '🗑️ 지우기 (Delete)',
              action: () => onDeletePage(pageMenu.pageNum)
            },
            {
              label: '⏭️ 다음모션 (Next)',
              action: () => {
                const target = motionPages.find(
                  (p) => p.pageNumber === pageMenu.pageNum
                );
                setEditModal({
                  isOpen: true,
                  mode: 'next',
                  pageNum: pageMenu.pageNum,
                  value: String(target?.nextPage ?? 0)
                });
              }
            },
            {
              label: '🚪 탈출모션 (Exit)',
              action: () => {
                const target = motionPages.find(
                  (p) => p.pageNumber === pageMenu.pageNum
                );
                setEditModal({
                  isOpen: true,
                  mode: 'exit',
                  pageNum: pageMenu.pageNum,
                  value: String(target?.exitPage ?? 0)
                });
              }
            }
          ].map((item, i) => (
            <li
              key={i}
              onClick={() => {
                setPageMenu({ ...pageMenu, visible: false });
                item.action();
              }}
              style={{
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                borderBottom: i < 6 ? '1px solid #f1f5f9' : 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#eff6ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}

      {/* ==================== 모션 이름 / Next / Exit 편집 팝업 ==================== */}
      {editModal.isOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '320px',
              overflow: 'hidden',
              boxShadow: '0 12px 32px rgba(0,0,0,0.25)'
            }}
          >
            <div
              style={{
                background: '#315fe0',
                color: '#ffffff',
                padding: '12px 16px',
                fontWeight: 700,
                fontSize: '14px'
              }}
            >
              [{String(editModal.pageNum).padStart(2, '0')}]번 모션{' '}
              {editModal.mode === 'rename'
                ? '이름 변경'
                : editModal.mode === 'next'
                ? '다음모션(Next) 번호 설정'
                : '탈출모션(Exit) 번호 설정'}
            </div>

            <div style={{ padding: '18px 16px' }}>
              <input
                type={editModal.mode === 'rename' ? 'text' : 'number'}
                min="0"
                max="30"
                placeholder={
                  editModal.mode === 'rename'
                    ? '모션 이름을 입력하세요'
                    : '연결할 페이지 번호 (0=없음, 1~30)'
                }
                value={editModal.value}
                onChange={(e) =>
                  setEditModal({ ...editModal, value: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '14px'
                }}
              />

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
                    if (editModal.mode === 'rename') {
                      onRenamePage(
                        editModal.pageNum,
                        editModal.value.trim() ||
                          `noname_${String(editModal.pageNum).padStart(2, '0')}`
                      );
                    } else if (editModal.mode === 'next') {
                      const num = Math.max(
                        0,
                        Math.min(30, Number(editModal.value) || 0)
                      );
                      onUpdatePageLinks(editModal.pageNum, { nextPage: num });
                    } else {
                      const num = Math.max(
                        0,
                        Math.min(30, Number(editModal.value) || 0)
                      );
                      onUpdatePageLinks(editModal.pageNum, { exitPage: num });
                    }
                    setEditModal({ ...editModal, isOpen: false });
                  }}
                  style={{
                    background: '#315fe0',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  확인
                </button>
                <button
                  type="button"
                  onClick={() => setEditModal({ ...editModal, isOpen: false })}
                  style={{
                    background: '#e2e8f0',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

