// ============================================================================
// [파일 설명: HeaderToolbar.jsx]
// 원본 R-Motion의 상단 네비게이션 바(#tool_top)와 우측 슬라이드 메뉴(#menu)를
// 담당하는 컴포넌트입니다.
// ============================================================================

import React, { useState } from 'react';
import { RMOTION_BASE_URL, RMOTION_ASSETS_URL } from '../data/robotData';

export default function HeaderToolbar({
  currentRobot,
  isPlaying,
  isConnectedBle,
  isConnectedUsb,
  userInfo,
  showTooltips,
  onTogglePlay,
  onUndo,
  onRedo,
  onDelete,
  onOpenRobotSelector,
  onConnectUsb,
  onConnectBle,
  onDisconnectDevice,
  onOpenModal,
  onNewProject,
  onImportJson,
  onExportJson,
  onShowToast
}) {
  // 우측 햄버거 메뉴 열림/닫힘 상태
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 메뉴 항목 클릭 후 슬라이드 메뉴를 자동으로 닫아주는 헬퍼 함수
  const handleMenuAction = (actionCallback) => {
    setIsMenuOpen(false);
    if (actionCallback) actionCallback();
  };

  return (
    <>
      {/* ==================== 상단 고정 헤더 (#tool_top) ==================== */}
      <header id="tool_top" className="rm-header">
        {/* 좌측 영역: 뒤로가기 + 로고 + 상단 플레이/Undo/Redo/삭제 버튼 */}
        <div className="rm-header-left">
          <button
            type="button"
            className="rm-history-back"
            title={showTooltips ? '뒤로가기' : ''}
            onClick={() => onShowToast('이전 화면 상태입니다.')}
          >
            <img src={`${RMOTION_BASE_URL}/img/ico_pre.png`} alt="뒤로가기" />
          </button>

          {/* R-Motion 공식 로고 */}
          <div
            className="rm-logo"
            onClick={() => onShowToast('RMotion v1.5.21 (STEAMCUP Web Edition)')}
          >
            <img
              src={`${RMOTION_BASE_URL}/img/rmotion_logo.png`}
              alt="R-Motion 로고"
            />
          </div>

          {/* 상단 4대 핵심 제어 아이콘 (Play, Undo, Redo, Trash) */}
          <div className="rm-top-navi">
            <button
              type="button"
              className="rm-top-btn"
              title={showTooltips ? '모션 Play / Stop (스페이스바)' : ''}
              onClick={onTogglePlay}
            >
              <img
                src={
                  isPlaying
                    ? `${RMOTION_ASSETS_URL}/img/btn_stop.png`
                    : `${RMOTION_BASE_URL}/img/ico_play.png`
                }
                alt="플레이"
              />
            </button>

            <button
              type="button"
              className="rm-top-btn"
              title={showTooltips ? '실행취소 (Undo: Ctrl+Z)' : ''}
              onClick={onUndo}
            >
              <img
                src={`${RMOTION_BASE_URL}/img/ico_redo.png`}
                alt="실행취소"
              />
            </button>

            <button
              type="button"
              className="rm-top-btn"
              title={showTooltips ? '재실행 (Redo: Ctrl+Y)' : ''}
              onClick={onRedo}
            >
              <img src={`${RMOTION_BASE_URL}/img/ico_undo.png`} alt="재실행" />
            </button>

            <button
              type="button"
              className="rm-top-btn"
              title={showTooltips ? '현재 선택된 포즈 또는 모션 삭제 (Delete)' : ''}
              onClick={onDelete}
            >
              <img
                src={`${RMOTION_BASE_URL}/img/ico_garbage.png`}
                alt="삭제"
              />
            </button>
          </div>

          {/* 현재 선택된 로봇 표시 알약(Pill) 버튼 (클릭 시 로봇 선택 모달 오픈) */}
          <div
            className="rm-current-robot-pill"
            onClick={onOpenRobotSelector}
            title="클릭하여 편집할 로봇 변경"
          >
            <span>🤖 {currentRobot?.nameKo}</span>
            <span style={{ opacity: 0.8, fontWeight: 400 }}>
              ({currentRobot?.controller} · {currentRobot?.dof}DOF)
            </span>
          </div>
        </div>

        {/* 우측 영역: 유선(USB)/블루투스(BLE) 연결 + 로그인 정보 */}
        <div className="rm-header-right">
          <div className="rm-top-ble">
            {/* USB 유선 시리얼 연결 버튼 (WebSerial API) */}
            <button
              type="button"
              className="rm-top-btn"
              title={showTooltips ? '로봇에 USB 유선으로 연결 (WebSerial)' : ''}
              onClick={onConnectUsb}
            >
              <img
                src={
                  isConnectedUsb
                    ? `${RMOTION_ASSETS_URL}/img/ico_ble_on.png`
                    : `${RMOTION_BASE_URL}/img/ico_usb_off.png`
                }
                alt="유선연결"
              />
            </button>

            {/* 블루투스 연결 / 해제 버튼 (WebBluetooth API) */}
            {isConnectedBle || isConnectedUsb ? (
              <button
                type="button"
                className="rm-top-btn"
                title={showTooltips ? '로봇 연결 끊기' : ''}
                onClick={onDisconnectDevice}
              >
                <img
                  src={`${RMOTION_ASSETS_URL}/img/ico_ble_on.png`}
                  alt="연결됨"
                />
              </button>
            ) : (
              <button
                type="button"
                className="rm-top-btn"
                title={showTooltips ? '로봇에 블루투스로 연결 (WebBluetooth)' : ''}
                onClick={onConnectBle}
              >
                <img
                  src={`${RMOTION_BASE_URL}/img/ico_ble_off.png`}
                  alt="블루투스연결"
                />
              </button>
            )}
          </div>

          {/* 로그인 / 사용자 프로필 표시 영역 */}
          <div
            className="rm-login-area"
            onClick={() =>
              userInfo ? onOpenModal('cell') : onOpenModal('login')
            }
            title={
              userInfo
                ? '클릭하여 나의 활동 세포(Cell) 상태 보기'
                : '서버에 로그인 합니다.'
            }
          >
            <img
              className="rm-login-icon"
              src={
                userInfo
                  ? `${RMOTION_BASE_URL}/img/emot_back.png`
                  : `${RMOTION_BASE_URL}/img/ico_login.png`
              }
              alt="로그인"
            />
            <span>{userInfo ? `${userInfo.username} 님` : '로그인'}</span>
          </div>
        </div>
      </header>

      {/* ==================== 우측 상단 햄버거 메뉴 토글 버튼 ==================== */}
      <button
        type="button"
        className="rm-menu-toggle-btn"
        title="메뉴 Open/Close"
        onClick={() => setIsMenuOpen((prev) => !prev)}
      >
        <img
          src={
            isMenuOpen
              ? `${RMOTION_BASE_URL}/img/ico_close.png`
              : `${RMOTION_BASE_URL}/img/ico_menu.png`
          }
          alt="메뉴"
        />
      </button>

      {/* 메뉴 열렸을 때 배경 딤(Dim) 오버레이 */}
      {isMenuOpen && (
        <div
          className="rm-menu-backdrop"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* ==================== 우측 슬라이드 카테고리 메뉴 (#menu) ==================== */}
      <nav className={`rm-menu-drawer ${isMenuOpen ? 'open' : ''}`}>
        <div className="rm-menu-drawer-header">
          {userInfo ? `👤 ${userInfo.username}` : 'R-Motion 메뉴'}
        </div>

        <ul className="rm-category-list">
          <li
            title="모션을 전부 지우고 새로 편집을 시작합니다."
            onClick={() => handleMenuAction(onNewProject)}
          >
            <span>새로만들기</span>
            <span>📄</span>
          </li>
          <li
            title="저장된 모션을 불러옵니다."
            onClick={() => handleMenuAction(() => onOpenModal('open'))}
          >
            <span>열기</span>
            <span>📂</span>
          </li>
          <li
            title="작업한 모션을 저장합니다."
            onClick={() => handleMenuAction(() => onOpenModal('save'))}
          >
            <span>저장</span>
            <span>💾</span>
          </li>
          <li
            title="[Import] 외부 파일(json/jmt)에서 모션을 불러옵니다."
            onClick={() => handleMenuAction(onImportJson)}
          >
            <span>가져오기</span>
            <span>📥</span>
          </li>
          <li
            title="[Export] 작업한 모션을 외부 파일(json/jmt)로 저장합니다."
            onClick={() => handleMenuAction(onExportJson)}
          >
            <span>내보내기</span>
            <span>📤</span>
          </li>
          <li
            title="편집할 로봇을 바꿀 수 있습니다."
            onClick={() => handleMenuAction(onOpenRobotSelector)}
          >
            <span>로봇선택</span>
            <span>🤖</span>
          </li>
          <li
            title="선택 시 인터랙티브 튜토리얼을 진행합니다."
            onClick={() => handleMenuAction(() => onOpenModal('tutorial'))}
          >
            <span>튜토리얼</span>
            <span>💡</span>
          </li>
          <li
            title="기본 설정을 변경할 수 있습니다."
            onClick={() => handleMenuAction(() => onOpenModal('setup'))}
          >
            <span>설정</span>
            <span>⚙️</span>
          </li>
          <li
            title="버튼/음성/제스처 기반 AI 리모컨을 실행합니다."
            onClick={() => handleMenuAction(() => onOpenModal('aiRemote'))}
          >
            <span>AI 리모컨</span>
            <span>🎙️</span>
          </li>
          <li
            title="다이나믹셀(DXL) 매니저 및 댄스 매니저 전문가 메뉴입니다."
            onClick={() => handleMenuAction(() => onOpenModal('expert'))}
          >
            <span>전문가용</span>
            <span>🛠️</span>
          </li>
          {userInfo && (
            <li
              title="서버에서 로그아웃 합니다."
              onClick={() => handleMenuAction(() => onOpenModal('logout'))}
            >
              <span style={{ color: '#dc2626' }}>로그아웃</span>
              <span>🚪</span>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}

