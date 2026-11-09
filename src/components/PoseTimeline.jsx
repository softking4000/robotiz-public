// ============================================================================
// [파일 설명: PoseTimeline.jsx]
// 원본 R-Motion의 하단 7단계 자세(Pose 1~7) 타임라인(#uipose),
// 재생/정지 시간 세부 설정 팝업(#uipose_detail), 그리고 포즈 우클릭 컨텍스트 메뉴를
// 담당하는 컴포넌트입니다.
// ============================================================================

import React, { useState, useRef } from 'react';
import { RMOTION_BASE_URL, playSynthesizedSound } from '../data/robotData';

export default function PoseTimeline({
  poses,
  selectedPoseIdx,
  showTooltips,
  onSelectPose,
  onUpdatePoseTime,
  onCopyPose,
  onPastePose,
  onDeletePose,
  onMovePose,
  onOpenEmoticonModal,
  onOpenSoundModal
}) {
  // 마우스가 올라간(Hover) 포즈 슬롯 번호 (시간 말풍선 #pose_info 표시용)
  const [hoveredPoseIdx, setHoveredPoseIdx] = useState(null);

  // 자세 세부입력 팝업(#uipose_detail) 열림 여부
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 포즈 우클릭 컨텍스트 메뉴 상태
  const [poseMenu, setPoseMenu] = useState({
    visible: false,
    poseIdx: 0,
    x: 0,
    y: 0
  });

  // 수직 슬라이더 드래그 추적 참조
  const draggingSliderRef = useRef({ active: false, idx: null });

  // 현재 선택된 포즈 데이터
  const currentPose = poses[selectedPoseIdx] || poses[0];

  // 전체 포즈 누적 시간(초) 계산
  const totalPageSeconds = poses
    .reduce(
      (acc, p) =>
        p.active ? acc + Number(p.playTime || 0) + Number(p.pauseTime || 0) : acc,
      0
    )
    .toFixed(2)
    .padStart(5, '0');

  // 수직 슬라이더 위치(Y)로부터 비율(10~90%)과 재생시간(0.2~2.0초) 계산
  const applyVerticalSliderFromClientY = (idx, trackElement, clientY) => {
    const rect = trackElement.getBoundingClientRect();
    const ratio = Math.max(
      10,
      Math.min(90, Math.round(((rect.bottom - clientY) / rect.height) * 100))
    );
    // 위쪽(ratio가 클수록) '빠름'(짧은 시간), 아래쪽(ratio가 작을수록) '느림'(긴 시간)
    const computedPlayTime = Number(((100 - ratio) * 0.02 + 0.2).toFixed(2));
    onUpdatePoseTime(idx, {
      speedRatio: ratio,
      playTime: computedPlayTime
    });
  };

  // 재생시간 프리셋 드롭다운 값 계산 ('0': 빠름, '1': 보통, '2': 느림, '3': 사용자값)
  const getPlayPresetValue = (playTime) => {
    if (Math.abs(playTime - 0.4) < 0.05) return '0';
    if (Math.abs(playTime - 0.8) < 0.05) return '1';
    if (Math.abs(playTime - 1.4) < 0.05) return '2';
    return '3';
  };

  // 정지시간 프리셋 드롭다운 값 계산 ('0': 짧게, '1': 보통, '2': 길게, '3': 사용자값)
  const getPausePresetValue = (pauseTime) => {
    if (Math.abs(pauseTime - 0.0) < 0.05) return '0';
    if (Math.abs(pauseTime - 0.3) < 0.05) return '1';
    if (Math.abs(pauseTime - 1.0) < 0.05) return '2';
    return '3';
  };

  return (
    <div
      id="uipose"
      className="rm-pose-area"
      onClick={() => {
        if (poseMenu.visible) setPoseMenu({ ...poseMenu, visible: false });
      }}
    >
      {/* 좌측 속도 라벨 (빠름 / 보통 / 느림) */}
      <div className="rm-pose-labels">
        <span>빠름</span>
        <span>보통</span>
        <span>느림</span>
      </div>

      {/* ==================== 1번 ~ 7번 포즈 슬롯 ==================== */}
      <div className="rm-pose-slots">
        {poses.map((pose, idx) => {
          const isSelected = selectedPoseIdx === idx;
          const headerClass = isSelected
            ? 'tit_on'
            : pose.active
            ? 'tit_off'
            : 'tit_empty';
          const iconSrc = isSelected
            ? `${RMOTION_BASE_URL}/img/ico_pose_run_on.png`
            : pose.active
            ? `${RMOTION_BASE_URL}/img/ico_pose_run_off.png`
            : `${RMOTION_BASE_URL}/img/ico_pose_run_stop.png`;

          const poseStepTime = (
            Number(pose.playTime || 0) + Number(pose.pauseTime || 0)
          )
            .toFixed(2)
            .padStart(5, '0');

          return (
            <div
              key={idx}
              className="rm-pose-col"
              onMouseEnter={() => setHoveredPoseIdx(idx)}
              onMouseLeave={() => setHoveredPoseIdx(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                onSelectPose(idx);
                const parentRect =
                  e.currentTarget.parentElement.getBoundingClientRect();
                setPoseMenu({
                  visible: true,
                  poseIdx: idx,
                  x: e.clientX - parentRect.left,
                  y: -185
                });
              }}
            >
              {/* 상단 현재시간 / 전체시간 말풍선 툴팁 (#pose_info) */}
              {hoveredPoseIdx === idx && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-64px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '132px',
                    background: '#ffffff',
                    borderRadius: '6px',
                    padding: '7px 8px',
                    boxShadow: '0 4px 14px rgba(18, 29, 80, 0.22)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#315fe0',
                    textAlign: 'center',
                    zIndex: 60,
                    pointerEvents: 'none'
                  }}
                >
                  <div
                    style={{
                      borderBottom: '1px solid #e2eaf3',
                      paddingBottom: '3px',
                      marginBottom: '3px'
                    }}
                  >
                    현재시간 : {poseStepTime} 초
                  </div>
                  <div style={{ color: '#64748b' }}>
                    전체시간 : {totalPageSeconds} 초
                  </div>
                </div>
              )}

              {/* 포즈 번호 버튼 (클릭: 포즈 선택, 더블클릭: 세부 시간 설정 팝업 오픈) */}
              <div
                className={`rm-pose-header-btn ${headerClass}`}
                onClick={() => onSelectPose(idx)}
                onDoubleClick={() => {
                  onSelectPose(idx);
                  setIsDetailOpen(true);
                }}
                title={
                  showTooltips
                    ? `포즈 ${idx + 1} 선택 (더블클릭: 재생/정지시간 세부 설정, 우클릭: 포즈 메뉴)`
                    : ''
                }
              >
                <img src={iconSrc} alt="" />
                <span>{idx + 1}</span>
              </div>

              {/* 중앙 수직 속도 슬라이더 바 */}
              <div
                className="rm-pose-slider-track"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  draggingSliderRef.current = { active: true, idx };
                  onSelectPose(idx);
                  applyVerticalSliderFromClientY(
                    idx,
                    e.currentTarget,
                    e.clientY
                  );
                }}
                onPointerMove={(e) => {
                  if (
                    !draggingSliderRef.current.active ||
                    draggingSliderRef.current.idx !== idx
                  ) {
                    return;
                  }
                  applyVerticalSliderFromClientY(
                    idx,
                    e.currentTarget,
                    e.clientY
                  );
                }}
                onPointerUp={() => {
                  draggingSliderRef.current = { active: false, idx: null };
                }}
              >
                <div className="rm-pose-slider-base" />
                {pose.active && (
                  <div
                    className="rm-pose-slider-fill"
                    style={{ height: `${pose.speedRatio}%` }}
                  />
                )}
                <div
                  className={`rm-pose-slider-dial ${
                    isSelected ? 'on' : pose.active ? 'off' : 'empty'
                  }`}
                  style={{ bottom: `${pose.speedRatio}%` }}
                />
              </div>

              {/* 하단 이모티콘(표정) 및 사운드(효과음) 아이콘 */}
              <div className="rm-pose-icons">
                <img
                  src={
                    pose.emoticon
                      ? `${RMOTION_BASE_URL}/img/ico_emoticon_on.png`
                      : `${RMOTION_BASE_URL}/img/ico_emoticon_off.png`
                  }
                  alt="이모티콘"
                  title={
                    pose.emoticon
                      ? `표정 설정됨: ${pose.emoticon.label} (클릭하여 변경)`
                      : '로봇 얼굴 표정(이모티콘) 설정'
                  }
                  onClick={() => {
                    onSelectPose(idx);
                    onOpenEmoticonModal(idx);
                  }}
                />
                <img
                  src={
                    pose.sound
                      ? `${RMOTION_BASE_URL}/img/ico_sound_on.png`
                      : `${RMOTION_BASE_URL}/img/ico_sound_off.png`
                  }
                  alt="사운드"
                  title={
                    pose.sound
                      ? `소리 설정됨: ${pose.sound.name} (클릭하여 변경)`
                      : '포즈 효과음(소리) 설정'
                  }
                  onClick={() => {
                    onSelectPose(idx);
                    if (pose.sound) playSynthesizedSound(pose.sound);
                    onOpenSoundModal(idx);
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================== 자세 세부입력 팝업 (#uipose_detail) ==================== */}
      {isDetailOpen && currentPose && (
        <div
          id="uipose_detail"
          style={{
            position: 'absolute',
            top: '-245px',
            left: '0',
            width: '100%',
            background: '#ffffff',
            borderTop: '3px solid #315fe0',
            boxShadow: '0 -8px 25px rgba(18, 29, 80, 0.18)',
            padding: '20px 28px',
            zIndex: 100
          }}
        >
          {/* 우측 상단 완료 버튼 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}
          >
            <span
              style={{ fontSize: '14px', fontWeight: 800, color: '#1e3a8a' }}
            >
              ⏱️ 포즈 #{selectedPoseIdx + 1} 세부 시간 설정
            </span>
            <button
              type="button"
              onClick={() => setIsDetailOpen(false)}
              style={{
                background: '#315fe0',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 16px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ✓ 완료
            </button>
          </div>

          {/* 1) 재생시간(초) 설정 영역 */}
          <div
            style={{
              borderBottom: '1px solid #d9e4ed',
              paddingBottom: '14px',
              marginBottom: '14px'
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
                style={{ fontSize: '14px', fontWeight: 700, color: '#54667c' }}
              >
                재생시간(초)
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select
                  value={getPlayPresetValue(currentPose.playTime)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '0') {
                      onUpdatePoseTime(selectedPoseIdx, {
                        playTime: 0.4,
                        speedRatio: 85
                      });
                    } else if (val === '1') {
                      onUpdatePoseTime(selectedPoseIdx, {
                        playTime: 0.8,
                        speedRatio: 55
                      });
                    } else if (val === '2') {
                      onUpdatePoseTime(selectedPoseIdx, {
                        playTime: 1.4,
                        speedRatio: 25
                      });
                    }
                  }}
                  style={{
                    width: '120px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600
                  }}
                >
                  <option value="0">빠름 (0.4초)</option>
                  <option value="1">보통 (0.8초)</option>
                  <option value="2">느림 (1.4초)</option>
                  <option value="3">사용자값</option>
                </select>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5.0"
                  value={currentPose.playTime}
                  onChange={(e) => {
                    const v = Math.max(
                      0.1,
                      Math.min(5.0, Number(e.target.value) || 0.1)
                    );
                    const ratio = Math.max(
                      10,
                      Math.min(90, Math.round(100 - (v - 0.2) * 50))
                    );
                    onUpdatePoseTime(selectedPoseIdx, {
                      playTime: v,
                      speedRatio: ratio
                    });
                  }}
                  style={{
                    width: '68px',
                    textAlign: 'right',
                    padding: '4px 6px',
                    background: '#f7fafb',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontWeight: 700
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>0.1</span>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={Math.min(2.0, currentPose.playTime)}
                onChange={(e) => {
                  const v = Number(parseFloat(e.target.value).toFixed(2));
                  const ratio = Math.max(
                    10,
                    Math.min(90, Math.round(100 - (v - 0.2) * 50))
                  );
                  onUpdatePoseTime(selectedPoseIdx, {
                    playTime: v,
                    speedRatio: ratio
                  });
                }}
                style={{ flex: 1, cursor: 'pointer', accentColor: '#1d58ff' }}
              />
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>2.0</span>
            </div>
          </div>

          {/* 2) 정지시간(초) 설정 영역 */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}
            >
              <span
                style={{ fontSize: '14px', fontWeight: 700, color: '#54667c' }}
              >
                정지시간(초)
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select
                  value={getPausePresetValue(currentPose.pauseTime)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '0') {
                      onUpdatePoseTime(selectedPoseIdx, { pauseTime: 0.0 });
                    } else if (val === '1') {
                      onUpdatePoseTime(selectedPoseIdx, { pauseTime: 0.3 });
                    } else if (val === '2') {
                      onUpdatePoseTime(selectedPoseIdx, { pauseTime: 1.0 });
                    }
                  }}
                  style={{
                    width: '120px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600
                  }}
                >
                  <option value="0">짧게 (0.0초)</option>
                  <option value="1">보통 (0.3초)</option>
                  <option value="2">길게 (1.0초)</option>
                  <option value="3">사용자값</option>
                </select>
                <input
                  type="number"
                  step="0.1"
                  min="0.0"
                  max="5.0"
                  value={currentPose.pauseTime}
                  onChange={(e) => {
                    const v = Math.max(
                      0.0,
                      Math.min(5.0, Number(e.target.value) || 0)
                    );
                    onUpdatePoseTime(selectedPoseIdx, { pauseTime: v });
                  }}
                  style={{
                    width: '68px',
                    textAlign: 'right',
                    padding: '4px 6px',
                    background: '#f7fafb',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontWeight: 700
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>0.0</span>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={Math.min(2.0, currentPose.pauseTime)}
                onChange={(e) => {
                  const v = Number(parseFloat(e.target.value).toFixed(2));
                  onUpdatePoseTime(selectedPoseIdx, { pauseTime: v });
                }}
                style={{ flex: 1, cursor: 'pointer', accentColor: '#ff1d1d' }}
              />
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>2.0</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 포즈 우클릭 컨텍스트 메뉴 (#contextmenu - uipose) ==================== */}
      {poseMenu.visible && (
        <ul
          style={{
            position: 'absolute',
            left: `${Math.max(10, poseMenu.x)}px`,
            top: `${poseMenu.y}px`,
            zIndex: 120,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            padding: '4px 0',
            minWidth: '155px',
            listStyle: 'none',
            margin: 0
          }}
        >
          {[
            {
              label: '⏱️ 세부 시간 설정',
              action: () => setIsDetailOpen(true)
            },
            {
              label: '복사 (Copy)',
              action: () => onCopyPose(poseMenu.poseIdx)
            },
            {
              label: '붙여넣기 (Paste)',
              action: () => onPastePose(poseMenu.poseIdx, false)
            },
            {
              label: '붙여넣기 [대칭 Mirror]',
              action: () => onPastePose(poseMenu.poseIdx, true)
            },
            {
              label: '지우기 (Delete)',
              action: () => onDeletePose(poseMenu.poseIdx)
            },
            {
              label: '이동 (← 왼쪽으로)',
              action: () => onMovePose(poseMenu.poseIdx, -1)
            },
            {
              label: '이동 (→ 오른쪽으로)',
              action: () => onMovePose(poseMenu.poseIdx, 1)
            },
            {
              label: '😊 Emoticon (표정)',
              action: () => onOpenEmoticonModal(poseMenu.poseIdx)
            },
            {
              label: '🔊 Sound (소리)',
              action: () => onOpenSoundModal(poseMenu.poseIdx)
            }
          ].map((item, i) => (
            <li
              key={i}
              onClick={() => {
                setPoseMenu({ ...poseMenu, visible: false });
                item.action();
              }}
              style={{
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                borderBottom: i < 8 ? '1px solid #f1f5f9' : 'none'
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
    </div>
  );
}

