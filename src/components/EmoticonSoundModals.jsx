// ============================================================================
// [파일 설명: EmoticonSoundModals.jsx]
// 원본 R-Motion의 포즈별 로봇 얼굴 표정 선택 모달(#emoticon_bg)과
// 효과음 선택 및 미리듣기 모달(#sound_bg)을 담당하는 컴포넌트입니다.
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  RMOTION_BASE_URL,
  EMOTICON_GROUPS,
  SOUND_CATEGORIES,
  getEmoticonImageUrl,
  playSynthesizedSound
} from '../data/robotData';

export function EmoticonModal({
  isOpen,
  poseIdx,
  currentEmoticon,
  defaultGroupId,
  onSaveEmoticon,
  onDeleteEmoticon,
  onClose
}) {
  // 현재 선택된 캐릭터 표정 그룹 탭 (4: 꼭두, 6: 드래곤, 1: 알쥐, 3: 알라)
  const [activeGroupId, setActiveGroupId] = useState(defaultGroupId || 4);
  // 임시 선택된 표정 객체 ({ groupId, itemIdx, label })
  const [selectedItem, setSelectedItem] = useState(currentEmoticon || null);

  useEffect(() => {
    if (isOpen) {
      setSelectedItem(currentEmoticon || null);
      if (currentEmoticon?.groupId) {
        setActiveGroupId(currentEmoticon.groupId);
      } else if (defaultGroupId && defaultGroupId > 0) {
        setActiveGroupId(defaultGroupId);
      }
    }
  }, [isOpen, currentEmoticon, defaultGroupId]);

  if (!isOpen) return null;

  const activeGroup =
    EMOTICON_GROUPS.find((g) => g.groupId === activeGroupId) ||
    EMOTICON_GROUPS[0];

  return (
    <div className="rm-modal-root" id="emoticon_bg">
      <div className="rm-modal-overlay" onClick={onClose} />

      <div
        className="rm-modal-container"
        style={{ maxWidth: '620px', maxHeight: '86vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 파란색 타이틀바 + 우측 휴지통(표정 삭제) 버튼 */}
        <div
          className="rm-modal-header"
          style={{ background: '#315fe0', padding: '14px 20px' }}
        >
          <h2 className="rm-modal-title">
            😊 화면 표정 (포즈 #{poseIdx + 1} 이모티콘)
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              title="설정된 이모티콘 삭제"
              onClick={() => {
                onDeleteEmoticon();
                onClose();
              }}
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img
                src={`${RMOTION_BASE_URL}/img/ico_garbage.png`}
                alt="삭제"
                style={{ width: '28px', height: '28px' }}
              />
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

        {/* 본문: 캐릭터 그룹 탭 + 표정 이미지 그리드 */}
        <div className="rm-modal-body">
          {/* 캐릭터 그룹 전환 탭 */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '14px',
              flexWrap: 'wrap'
            }}
          >
            {EMOTICON_GROUPS.map((grp) => {
              const isOn = grp.groupId === activeGroupId;
              return (
                <button
                  key={grp.groupId}
                  type="button"
                  onClick={() => setActiveGroupId(grp.groupId)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    background: isOn ? '#329ffe' : '#bac7cb',
                    color: '#ffffff'
                  }}
                >
                  {grp.groupName}
                </button>
              );
            })}
          </div>

          {/* 이모티콘 BMP 이미지 그리드 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
              gap: '10px',
              maxHeight: '420px',
              overflowY: 'auto',
              padding: '4px'
            }}
          >
            {Array.from({ length: activeGroup.count }, (_, idx) => {
              const itemIdx = idx + 1;
              const label =
                activeGroup.labels[idx] || `${activeGroup.folder} #${itemIdx}`;
              const imgUrl = getEmoticonImageUrl(activeGroup.groupId, itemIdx);
              const isSelected =
                selectedItem?.groupId === activeGroup.groupId &&
                selectedItem?.itemIdx === itemIdx;

              return (
                <div
                  key={itemIdx}
                  onClick={() =>
                    setSelectedItem({
                      groupId: activeGroup.groupId,
                      itemIdx,
                      label,
                      imgUrl
                    })
                  }
                  onDoubleClick={() => {
                    onSaveEmoticon({
                      groupId: activeGroup.groupId,
                      itemIdx,
                      label,
                      imgUrl
                    });
                    onClose();
                  }}
                  style={{
                    border: isSelected
                      ? '2.5px solid #0a7bf9'
                      : '1px solid #dbe3e8',
                    boxShadow: isSelected
                      ? '0 0 12px rgba(10, 123, 249, 0.65)'
                      : 'none',
                    borderRadius: '10px',
                    padding: '8px',
                    background: isSelected ? '#eff6ff' : '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '68px',
                      background: '#111827',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '6px'
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={label}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#334155'
                    }}
                  >
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 완료 / 취소 버튼 영역 */}
        <div className="rm-modal-footer" style={{ gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              if (selectedItem) onSaveEmoticon(selectedItem);
              onClose();
            }}
            style={{
              background: '#315fe0',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 28px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            완료
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ced6e6',
              color: '#475569',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

export function SoundModal({
  isOpen,
  poseIdx,
  currentSound,
  onSaveSound,
  onDeleteSound,
  onClose
}) {
  // 현재 선택된 사운드 해시태그 그룹 (0: #동물, 1: #사람, 2: #사물, 3: #게임, 4: #전자음)
  const [activeGroupId, setActiveGroupId] = useState(0);
  // 임시 선택된 사운드 항목
  const [selectedSound, setSelectedSound] = useState(currentSound || null);

  useEffect(() => {
    if (isOpen) {
      setSelectedSound(currentSound || null);
      if (currentSound?.groupId !== undefined) {
        setActiveGroupId(currentSound.groupId);
      }
    }
  }, [isOpen, currentSound]);

  if (!isOpen) return null;

  const activeCategory =
    SOUND_CATEGORIES.find((c) => c.groupId === activeGroupId) ||
    SOUND_CATEGORIES[0];

  return (
    <div className="rm-modal-root" id="sound_bg">
      <div className="rm-modal-overlay" onClick={onClose} />

      <div
        className="rm-modal-container"
        style={{ maxWidth: '640px', maxHeight: '86vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 타이틀바 + 휴지통(사운드 삭제) 버튼 */}
        <div
          className="rm-modal-header"
          style={{ background: '#315fe0', padding: '14px 20px' }}
        >
          <h2 className="rm-modal-title">
            🔊 소리 설정 (포즈 #{poseIdx + 1} 효과음)
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              title="설정된 소리 삭제"
              onClick={() => {
                onDeleteSound();
                onClose();
              }}
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img
                src={`${RMOTION_BASE_URL}/img/ico_garbage.png`}
                alt="삭제"
                style={{ width: '28px', height: '28px' }}
              />
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

        {/* 본문: #동물 / #사람 / #사물 / #게임 / #전자음 탭 및 사운드 카드 */}
        <div className="rm-modal-body">
          {/* 5대 사운드 카테고리 탭 */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              flexWrap: 'wrap'
            }}
          >
            {SOUND_CATEGORIES.map((cat) => {
              const isOn = cat.groupId === activeGroupId;
              return (
                <button
                  key={cat.groupId}
                  type="button"
                  onClick={() => setActiveGroupId(cat.groupId)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '30px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    background: isOn ? '#329ffe' : '#bac7cb',
                    color: '#ffffff'
                  }}
                >
                  {cat.tag}
                </button>
              );
            })}
          </div>

          {/* 사운드 카드 그리드 (원본 .sound_div 구조 반영) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
              gap: '10px',
              maxHeight: '410px',
              overflowY: 'auto',
              padding: '4px'
            }}
          >
            {activeCategory.items.map((item) => {
              const isSelected =
                selectedSound?.groupId === activeCategory.groupId &&
                selectedSound?.id === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    const nextObj = {
                      groupId: activeCategory.groupId,
                      ...item
                    };
                    setSelectedSound(nextObj);
                    playSynthesizedSound(nextObj);
                  }}
                  onDoubleClick={() => {
                    const nextObj = {
                      groupId: activeCategory.groupId,
                      ...item
                    };
                    playSynthesizedSound(nextObj);
                    onSaveSound(nextObj);
                    onClose();
                  }}
                  style={{
                    height: '118px',
                    border: isSelected
                      ? '2px solid #0a7bf9'
                      : '1px solid #dbe3e8',
                    background: isSelected ? '#eff6ff' : '#f4f8f9',
                    boxShadow: isSelected
                      ? '0 0 10px rgba(10, 123, 249, 0.65)'
                      : 'none',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* 상단 우측 스피커 미리듣기 아이콘 */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <img
                      src={`${RMOTION_BASE_URL}/img/icon_sound.png`}
                      alt="미리듣기"
                      title="클릭하여 소리 미리듣기"
                      style={{ width: '24px', height: '24px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        playSynthesizedSound(item);
                      }}
                    />
                  </div>

                  {/* 중앙 음파 배경 아이콘 */}
                  <div style={{ textAlign: 'center' }}>
                    <img
                      src={`${RMOTION_BASE_URL}/img/bg_sound.png`}
                      alt=""
                      style={{ width: '46px', height: '46px', objectFit: 'contain' }}
                    />
                  </div>

                  {/* 하단 사운드 한글 이름 */}
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#39546c'
                    }}
                  >
                    {item.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 완료 / 취소 버튼 */}
        <div className="rm-modal-footer" style={{ gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              if (selectedSound) onSaveSound(selectedSound);
              onClose();
            }}
            style={{
              background: '#315fe0',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 28px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            완료
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ced6e6',
              color: '#475569',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

