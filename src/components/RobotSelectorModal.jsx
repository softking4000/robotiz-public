// ============================================================================
// [파일 설명: RobotSelectorModal.jsx]
// 원본 R-Motion (index.html의 #robotSelectorModal 및 css/robotselect.css)과
// 동일한 디자인 및 기능으로 동작하는 로봇 선택 모달 컴포넌트입니다.
// ============================================================================

import React, { useState } from 'react';
import { ROBOT_LIST, ROBOT_GROUPS, ROBOT_CONTROLLERS } from '../data/robotData';

export default function RobotSelectorModal({
  isOpen,
  currentRobot,
  onSelectRobot,
  onClose
}) {
  // 현재 모달 내부에서 임시로 선택된 로봇 인덱스 상태
  const [tempSelectedIndex, setTempSelectedIndex] = useState(
    currentRobot ? currentRobot.index : 0
  );
  // 제어기(컨트롤러) 필터 탭 상태 ('ALL', 'RB-100', 'RB-550')
  const [controllerFilter, setControllerFilter] = useState('ALL');
  // 로봇 그룹 필터 탭 상태 ('ALL', 'A', 'B', 'C')
  const [groupFilter, setGroupFilter] = useState('ALL');
  // 비활성(고급/커스텀 숨김) 로봇까지 모두 보기 토글 상태
  const [showAllRobots, setShowAllRobots] = useState(false);

  // 모달이 닫혀있으면 화면에 렌더링하지 않습니다.
  if (!isOpen) return null;

  // 필터 조건에 맞는 로봇 목록만 추출합니다.
  const filteredRobots = ROBOT_LIST.filter((robot) => {
    if (!showAllRobots && !robot.enabled) return false;
    if (controllerFilter !== 'ALL' && robot.controller !== controllerFilter) {
      return false;
    }
    if (groupFilter !== 'ALL' && robot.group !== groupFilter) {
      return false;
    }
    return true;
  });

  // [선택 완료 →] 버튼 클릭 시 부모 컴포넌트로 선택된 로봇을 전달합니다.
  const handleProceed = () => {
    const chosen =
      ROBOT_LIST.find((r) => r.index === tempSelectedIndex) || currentRobot;
    onSelectRobot(chosen);
    onClose();
  };

  return (
    <div className="rm-modal-root" id="robotSelectorModal">
      {/* 반투명 블러 배경 오버레이: 클릭 시 모달 닫기 */}
      <div className="rm-modal-overlay" onClick={onClose} />

      {/* 모달 본체 컨테이너 */}
      <div
        className="rm-modal-container"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* 모달 상단 헤더 (보라색 그라데이션) */}
        <div className="rm-modal-header">
          <h2 className="rm-modal-title">로봇 선택</h2>
          <button
            type="button"
            className="rm-modal-close-btn"
            onClick={onClose}
            title="닫기"
          >
            ×
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="rm-modal-body">
          <p className="rm-selector-description">
            사용하실 로봇과 제어기를 선택해주세요
          </p>

          {/* 기존 설정 유지 및 전체 모델 표시 버튼 영역 */}
          <div
            className="rm-skip-section"
            style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}
          >
            <button type="button" className="rm-skip-btn" onClick={onClose}>
              기존 설정 유지 ({currentRobot?.nameKo})
            </button>
            <button
              type="button"
              className="rm-skip-btn"
              style={{
                background: showAllRobots ? '#eef2ff' : '#f5f5f5',
                color: showAllRobots ? '#4338ca' : '#555',
                borderColor: showAllRobots ? '#818cf8' : '#ddd'
              }}
              onClick={() => setShowAllRobots((prev) => !prev)}
            >
              {showAllRobots ? '기본 활성 로봇만 보기' : '전체 로봇 모델 보기 (+)'}
            </button>
          </div>

          {/* 1단: 컨트롤러 필터 탭 (RB-100 / RB-550) */}
          <div className="rm-filter-tabs">
            {ROBOT_CONTROLLERS.map((ctrl) => (
              <button
                key={ctrl.id}
                type="button"
                className={`rm-filter-tab ${
                  controllerFilter === ctrl.id ? 'active' : ''
                }`}
                onClick={() => setControllerFilter(ctrl.id)}
              >
                {ctrl.name}{' '}
                {ctrl.voltage !== 'ALL' ? `(${ctrl.voltage})` : ''}
              </button>
            ))}
          </div>

          {/* 2단: 그룹 탭 (전체 / 기본형 A / 고급형 B / 커스텀 C) */}
          <div className="rm-group-tabs">
            {ROBOT_GROUPS.map((grp) => (
              <button
                key={grp.id}
                type="button"
                className={`rm-group-tab ${
                  groupFilter === grp.id ? 'active' : ''
                }`}
                onClick={() => setGroupFilter(grp.id)}
              >
                {grp.nameKo}
              </button>
            ))}
          </div>

          {/* 3단: 로봇 카드 가로 스크롤 영역 */}
          <div className="rm-robot-panel">
            {filteredRobots.length > 0 ? (
              <div className="rm-robot-scroll-area">
                <div className="rm-robot-horizontal-list">
                  {filteredRobots.map((robot) => {
                    const isSelected = tempSelectedIndex === robot.index;
                    return (
                      <div
                        key={robot.index}
                        className={`rm-robot-card ${
                          isSelected ? 'selected' : ''
                        }`}
                        onClick={() => setTempSelectedIndex(robot.index)}
                        onDoubleClick={() => {
                          onSelectRobot(robot);
                          onClose();
                        }}
                      >
                        {/* 선택 완료 초록색 체크 배지 */}
                        {isSelected && (
                          <div className="rm-selection-indicator">✓</div>
                        )}

                        {/* 로봇 썸네일 이미지 (선택 시 ON 이미지, 비선택 시 OFF 이미지) */}
                        <div className="rm-robot-icon">
                          <img
                            src={
                              isSelected
                                ? robot.thumbnailOn
                                : robot.thumbnailOff
                            }
                            alt={robot.nameKo}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>

                        {/* 로봇 이름 및 부제목 */}
                        <div className="rm-robot-info-section">
                          <h4 className="rm-robot-name">{robot.nameKo}</h4>
                          <p className="rm-robot-subtitle">
                            {robot.subtitleKo}
                          </p>
                          <span className="rm-controller-badge">
                            {robot.controller}
                          </span>
                        </div>

                        {/* 하단 상세 스펙 (자유도 DOF 및 동작 전압) */}
                        <div className="rm-specs">
                          <div className="rm-spec-item">
                            <span className="rm-spec-label">관절(DOF)</span>
                            <span className="rm-spec-value">
                              {robot.dof}축 모터
                            </span>
                          </div>
                          <div className="rm-spec-item">
                            <span className="rm-spec-label">전압</span>
                            <span className="rm-spec-value">
                              {robot.voltage}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* 조건에 맞는 로봇이 없을 때 표시 */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '44px 20px',
                  color: '#999'
                }}
              >
                <div style={{ fontSize: '38px', marginBottom: '10px' }}>🤖</div>
                <div>해당 조건의 로봇이 없습니다</div>
              </div>
            )}
          </div>
        </div>

        {/* 모달 푸터: 선택 완료 버튼 */}
        <div className="rm-modal-footer">
          <button
            type="button"
            className="rm-continue-btn"
            onClick={handleProceed}
          >
            선택 완료 →
          </button>
        </div>
      </div>
    </div>
  );
}

