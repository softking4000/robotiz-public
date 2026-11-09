// ============================================================================
// [파일 설명: robotData.js]
// 원본 R-Motion (https://rmotion.steamcup.org/release_v1_5_21/)의
// robot/list.json, 로봇 관절(모터) 설정, 기본 모션 시퀀스,
// 이모티콘(표정) 및 사운드(효과음) 데이터를 정의합니다.
// ============================================================================

// 원본 서버의 이미지 및 미디어 리소스 기본 경로입니다.
export const RMOTION_BASE_URL = 'https://rmotion.steamcup.org/release_v1_5_21';
export const RMOTION_ASSETS_URL = 'https://rmotion.steamcup.org/assets';

// 버전 정보 상수
export const RMOTION_VERSION = '1.5.21';

// 로봇 분류 그룹 정보 (list.json의 groups 배열 반영)
export const ROBOT_GROUPS = [
  { id: 'ALL', nameKo: '전체', nameEn: 'All' },
  { id: 'A', nameKo: '기본형', nameEn: 'Basic' },
  { id: 'B', nameKo: '고급형', nameEn: 'Advanced' },
  { id: 'C', nameKo: '커스텀', nameEn: 'Custom' }
];

// 로봇 제어기(컨트롤러) 정보 (list.json의 controllers 배열 반영)
export const ROBOT_CONTROLLERS = [
  { id: 'ALL', name: '전체 제어기', voltage: 'ALL' },
  { id: 'RB-100', name: 'RB-100', voltage: '3.7V' },
  { id: 'RB-550', name: 'RB-550', voltage: '12V' }
];

// 8관절 휴머노이드(꼭두, 드래곤 등)의 표준 관절 가이드 정의 (000_rtong.json의 Guide_Group 기반)
export const STANDARD_8DOF_JOINTS = [
  { id: 1, name: '오른어깨', nameEn: 'R-Shoulder', axis: 'pitch', min: -150, max: 150, defaultAngle: 0, mirrorId: 2, mirrorSign: -1, color: '#ef4444' },
  { id: 2, name: '왼어깨', nameEn: 'L-Shoulder', axis: 'pitch', min: -150, max: 150, defaultAngle: 0, mirrorId: 1, mirrorSign: -1, color: '#ef4444' },
  { id: 3, name: '오른손', nameEn: 'R-Hand', axis: 'roll', min: -120, max: 120, defaultAngle: 0, mirrorId: 4, mirrorSign: -1, color: '#3b82f6' },
  { id: 4, name: '왼손', nameEn: 'L-Hand', axis: 'roll', min: -120, max: 120, defaultAngle: 0, mirrorId: 3, mirrorSign: -1, color: '#3b82f6' },
  { id: 5, name: '오른다리', nameEn: 'R-Leg', axis: 'pitch', min: -120, max: 120, defaultAngle: 0, mirrorId: 6, mirrorSign: -1, color: '#10b981' },
  { id: 6, name: '왼다리', nameEn: 'L-Leg', axis: 'pitch', min: -120, max: 120, defaultAngle: 0, mirrorId: 5, mirrorSign: -1, color: '#10b981' },
  { id: 7, name: '오른발목', nameEn: 'R-Ankle', axis: 'roll', min: -90, max: 90, defaultAngle: 0, mirrorId: 8, mirrorSign: -1, color: '#3b82f6' },
  { id: 8, name: '왼발목', nameEn: 'L-Ankle', axis: 'roll', min: -90, max: 90, defaultAngle: 0, mirrorId: 7, mirrorSign: -1, color: '#3b82f6' }
];

// 원본 robot/list.json의 전체 로봇 목록 데이터
export const ROBOT_LIST = [
  {
    index: -1,
    enabled: true,
    path: './robot/dynamixel.json',
    nameKo: '사용자',
    nameEn: 'User',
    thumbnailOn: `${RMOTION_BASE_URL}/img/select_ru_on.png`,
    thumbnailOff: `${RMOTION_BASE_URL}/img/select_ru_off.png`,
    emoticonGroup: -1,
    emoticonImageInit: '',
    group: 'A',
    controller: 'RB-100',
    voltage: '3.7V',
    subtitleKo: '자유형태 로봇',
    subtitleEn: 'Custom Robot',
    dof: 1,
    accentColor: '#6366f1'
  },
  {
    index: 0,
    enabled: true,
    path: './robot/000_rtong.json',
    nameKo: '꼭두',
    nameEn: 'Puppet',
    thumbnailOn: `${RMOTION_BASE_URL}/img/select_r0_on.png`,
    thumbnailOff: `${RMOTION_BASE_URL}/img/select_r0_off.png`,
    emoticonGroup: 4,
    emoticonImageInit: `${RMOTION_ASSETS_URL}/media/emoticon/face/KKOGDU/BG_Coding_04_01.bmp`,
    group: 'A',
    controller: 'RB-100',
    voltage: '3.7V',
    subtitleKo: '휴머노이드 기본형',
    subtitleEn: 'Humanoid Basic',
    dof: 8,
    accentColor: '#315fe0'
  },
  {
    index: 1,
    enabled: true,
    path: './robot/001_dragon.json',
    nameKo: '드래곤',
    nameEn: 'Dragon',
    thumbnailOn: `${RMOTION_BASE_URL}/img/select_r1_on.png`,
    thumbnailOff: `${RMOTION_BASE_URL}/img/select_r1_off.png`,
    emoticonGroup: 6,
    emoticonImageInit: `${RMOTION_ASSETS_URL}/media/emoticon/face/DRAGON/BG_Coding_06_01.bmp`,
    group: 'A',
    controller: 'RB-100',
    voltage: '3.7V',
    subtitleKo: '휴머노이드 기본형',
    subtitleEn: 'Humanoid Basic',
    dof: 8,
    accentColor: '#10b981'
  },
  {
    index: 9,
    enabled: true,
    path: './robot/pr2_max_e2.json',
    nameKo: 'Max-E2',
    nameEn: 'Max-E2',
    thumbnailOn: `${RMOTION_BASE_URL}/img/select_r0_on.png`,
    thumbnailOff: `${RMOTION_BASE_URL}/img/select_r0_off.png`,
    emoticonGroup: 4,
    emoticonImageInit: `${RMOTION_ASSETS_URL}/media/emoticon/face/KKOGDU/BG_Coding_04_01.bmp`,
    group: 'B',
    controller: 'RB-550',
    voltage: '12V',
    subtitleKo: '커스텀 로봇 (16축)',
    subtitleEn: 'Custom Robot',
    dof: 16,
    accentColor: '#f59e0b'
  },
  {
    index: 10,
    enabled: true,
    path: './robot/ai_001.json',
    nameKo: 'AI-001',
    nameEn: 'AI-001',
    thumbnailOn: `${RMOTION_BASE_URL}/img/select_r0_on.png`,
    thumbnailOff: `${RMOTION_BASE_URL}/img/select_r0_off.png`,
    emoticonGroup: 4,
    emoticonImageInit: `${RMOTION_ASSETS_URL}/media/emoticon/face/KKOGDU/BG_Coding_04_01.bmp`,
    group: 'B',
    controller: 'RB-550',
    voltage: '12V',
    subtitleKo: 'AI 커스텀 로봇',
    subtitleEn: 'Custom Robot',
    dof: 8,
    accentColor: '#8b5cf6'
  },
  {
    index: 2,
    enabled: false,
    path: './robot/002_eagle.json',
    nameKo: '이글',
    nameEn: 'Eagle',
    thumbnailOn: `${RMOTION_BASE_URL}/img/select_r2_on.png`,
    thumbnailOff: `${RMOTION_BASE_URL}/img/select_r2_off.png`,
    emoticonGroup: 1,
    emoticonImageInit: `${RMOTION_ASSETS_URL}/media/emoticon/face/KKOGDU/BG_Coding_04_01.bmp`,
    group: 'B',
    controller: 'RB-100',
    voltage: '3.7V',
    subtitleKo: '휴머노이드 고급형',
    subtitleEn: 'Humanoid Advanced',
    dof: 8,
    accentColor: '#0ea5e9'
  },
  {
    index: 3,
    enabled: false,
    path: './robot/003_commando.json',
    nameKo: '코만도',
    nameEn: 'Commando',
    thumbnailOn: `${RMOTION_BASE_URL}/img/select_r3_on.png`,
    thumbnailOff: `${RMOTION_BASE_URL}/img/select_r3_off.png`,
    emoticonGroup: 4,
    emoticonImageInit: `${RMOTION_ASSETS_URL}/media/emoticon/face/KKOGDU/BG_Coding_04_01.bmp`,
    group: 'A',
    controller: 'RB-100',
    voltage: '3.7V',
    subtitleKo: '휴머노이드 기본형',
    subtitleEn: 'Humanoid Basic',
    dof: 8,
    accentColor: '#dc2626'
  }
];

// ============================================================================
// [이모티콘(로봇 얼굴 표정) 데이터: 원본 #emoticon_bg 반영]
// ============================================================================
export const EMOTICON_GROUPS = [
  {
    groupId: 4,
    groupName: '꼭두 (KKOGDU)',
    folder: 'KKOGDU',
    prefix: 'BG_Coding_04_',
    count: 19,
    labels: [
      '기본미소', '활짝웃음', '윙크', '놀람', '슬픔', '화남', '하트눈', '졸림',
      '선글라스', '궁금', '당황', '기쁨', '집중', '신남', '부끄러움', '어지러움',
      '반짝눈', '뾰로통', '최고'
    ]
  },
  {
    groupId: 6,
    groupName: '드래곤 (DRAGON)',
    folder: 'DRAGON',
    prefix: 'BG_Coding_06_',
    count: 6,
    labels: ['드래곤 기본', '드래곤 포효', '드래곤 화염', '드래곤 윙크', '드래곤 분노', '드래곤 수면']
  },
  {
    groupId: 1,
    groupName: '알쥐 (RGEE)',
    folder: 'RGEE',
    prefix: 'BG_Coding_01_',
    count: 28,
    labels: Array.from({ length: 28 }, (_, i) => `알쥐 표정 ${i + 1}`)
  },
  {
    groupId: 3,
    groupName: '알라 (RLA)',
    folder: 'RLA',
    prefix: 'BG_Coding_03_',
    count: 19,
    labels: Array.from({ length: 19 }, (_, i) => `알라 표정 ${i + 1}`)
  }
];

// 특정 그룹과 번호로 원본 이모티콘 이미지 URL을 생성하는 헬퍼 함수
export function getEmoticonImageUrl(groupId, indexNumber) {
  const grp = EMOTICON_GROUPS.find((g) => g.groupId === groupId) || EMOTICON_GROUPS[0];
  const numStr = String(indexNumber).padStart(2, '0');
  return `${RMOTION_ASSETS_URL}/media/emoticon/face/${grp.folder}/${grp.prefix}${numStr}.bmp`;
}

// ============================================================================
// [사운드(효과음) 데이터: 원본 #sound_bg 의 5대 카테고리 완벽 반영]
// ============================================================================
export const SOUND_CATEGORIES = [
  {
    groupId: 0,
    tag: '#동물',
    items: [
      { id: 0, name: '강아지', freq: 520, type: 'bark' },
      { id: 1, name: '개구리', freq: 260, type: 'croak' },
      { id: 2, name: '고양이', freq: 740, type: 'meow' },
      { id: 3, name: '곰', freq: 140, type: 'growl' },
      { id: 4, name: '귀뚜라미', freq: 1800, type: 'chirp' },
      { id: 5, name: '까마귀', freq: 420, type: 'caw' },
      { id: 6, name: '늑대', freq: 380, type: 'howl' },
      { id: 7, name: '닭', freq: 620, type: 'cluck' },
      { id: 8, name: '돼지', freq: 210, type: 'oink' },
      { id: 9, name: '말', freq: 490, type: 'neigh' },
      { id: 10, name: '말발굽소리', freq: 300, type: 'pulse' },
      { id: 11, name: '매미', freq: 1600, type: 'chirp' },
      { id: 12, name: '벌', freq: 340, type: 'buzz' },
      { id: 13, name: '병아리', freq: 1200, type: 'chirp' },
      { id: 14, name: '사자', freq: 130, type: 'growl' },
      { id: 15, name: '송아지', freq: 280, type: 'howl' },
      { id: 16, name: '염소', freq: 540, type: 'meow' },
      { id: 17, name: '쥐', freq: 1500, type: 'chirp' },
      { id: 18, name: '코끼리', freq: 450, type: 'howl' },
      { id: 19, name: '호랑이', freq: 125, type: 'growl' }
    ]
  },
  {
    groupId: 1,
    tag: '#사람',
    items: [
      { id: 1, name: '놀라는 소리', freq: 680, type: 'up' },
      { id: 2, name: '먹는 소리1', freq: 320, type: 'pulse' },
      { id: 3, name: '먹는 소리2', freq: 360, type: 'pulse' },
      { id: 4, name: '박수1', freq: 900, type: 'clap' },
      { id: 5, name: '박수2', freq: 1050, type: 'clap' },
      { id: 6, name: '방귀1', freq: 110, type: 'buzz' },
      { id: 7, name: '방귀2', freq: 95, type: 'buzz' },
      { id: 8, name: '비명(남자)', freq: 580, type: 'howl' },
      { id: 9, name: '비명(여자)', freq: 980, type: 'howl' },
      { id: 10, name: '아기울음', freq: 720, type: 'meow' },
      { id: 11, name: '아기웃음1', freq: 840, type: 'chirp' },
      { id: 12, name: '아기웃음2', freq: 890, type: 'chirp' },
      { id: 13, name: '웃음1', freq: 520, type: 'bark' },
      { id: 14, name: '웃음2', freq: 600, type: 'bark' },
      { id: 15, name: '코고는소리', freq: 150, type: 'growl' },
      { id: 18, name: '호루라기1', freq: 1450, type: 'whistle' }
    ]
  },
  {
    groupId: 2,
    tag: '#사물',
    items: [
      { id: 1, name: '경찰차 사이렌', freq: 750, type: 'siren' },
      { id: 2, name: '기차 경적', freq: 290, type: 'howl' },
      { id: 3, name: '레이저 건', freq: 1100, type: 'laser' },
      { id: 4, name: '자명종 시계', freq: 1300, type: 'chirp' },
      { id: 5, name: '전화벨 소리', freq: 880, type: 'siren' },
      { id: 6, name: '학교 종소리', freq: 660, type: 'bell' },
      { id: 7, name: '카메라 셔터', freq: 1200, type: 'clap' },
      { id: 8, name: '폭발음', freq: 90, type: 'growl' }
    ]
  },
  {
    groupId: 3,
    tag: '#게임',
    items: [
      { id: 1, name: '코인 획득', freq: 987, type: 'coin' },
      { id: 2, name: '점프 효과음', freq: 440, type: 'up' },
      { id: 3, name: '레벨업 팡파레', freq: 523, type: 'fanfare' },
      { id: 4, name: '게임 오버', freq: 392, type: 'down' },
      { id: 5, name: '파워업 아이템', freq: 659, type: 'up' },
      { id: 6, name: '보스 등장', freq: 160, type: 'growl' }
    ]
  },
  {
    groupId: 4,
    tag: '#전자음',
    items: [
      { id: 1, name: '비프음 (도)', freq: 523, type: 'beep' },
      { id: 2, name: '비프음 (레)', freq: 587, type: 'beep' },
      { id: 3, name: '비프음 (미)', freq: 659, type: 'beep' },
      { id: 4, name: '비프음 (파)', freq: 698, type: 'beep' },
      { id: 5, name: '비프음 (솔)', freq: 784, type: 'beep' },
      { id: 6, name: '비프음 (라)', freq: 880, type: 'beep' },
      { id: 7, name: '비프음 (시)', freq: 987, type: 'beep' },
      { id: 8, name: '로봇 부팅음', freq: 740, type: 'fanfare' }
    ]
  }
];

// Web Audio API를 이용해 브라우저에서 즉시 효과음을 합성·재생하는 함수
export function playSynthesizedSound(soundItem) {
  if (!soundItem) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq = soundItem.freq || 520;
    const now = ctx.currentTime;

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (soundItem.type === 'coin' || soundItem.type === 'fanfare') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.setValueAtTime(baseFreq * 1.33, now + 0.09);
      osc.frequency.setValueAtTime(baseFreq * 1.5, now + 0.18);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc.start(now);
      osc.stop(now + 0.42);
    } else if (soundItem.type === 'laser' || soundItem.type === 'down') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.32);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (soundItem.type === 'up' || soundItem.type === 'meow') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 0.7, now);
      osc.frequency.linearRampToValueAtTime(baseFreq * 1.35, now + 0.28);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (soundItem.type === 'siren') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq * 1.4, now + 0.18);
      osc.frequency.linearRampToValueAtTime(baseFreq, now + 0.36);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      osc.type = soundItem.type === 'growl' || soundItem.type === 'buzz' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.setValueAtTime(baseFreq * 0.9, now + 0.12);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    }
  } catch {
    // 오디오 컨텍스트가 차단된 환경에서는 무시
  }
}

// 7개 포즈(1~7)의 빈 슬롯 기본 생성 함수
export function createDefaultPoses(presetPoses = []) {
  return Array.from({ length: 7 }, (_, idx) => {
    const preset = presetPoses[idx];
    if (preset) {
      return {
        slotIndex: idx,
        active: true,
        playTime: preset.playTime ?? 0.8,
        pauseTime: preset.pauseTime ?? 0.2,
        speedRatio: preset.speedRatio ?? 50,
        angles: { ...preset.angles },
        emoticon: preset.emoticon ?? null,
        sound: preset.sound ?? null
      };
    }
    return {
      slotIndex: idx,
      active: false,
      playTime: 0.8,
      pauseTime: 0.0,
      speedRatio: 50,
      angles: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
      emoticon: null,
      sound: null
    };
  });
}

// 초기 모션 그룹(Page 1 ~ 30) 생성 함수 (실제 로봇 기본 동작 프리셋 포함)
export function createInitialMotionPages() {
  const presets = {
    1: {
      name: '차렷(기본자세)',
      nextPage: 0,
      exitPage: 0,
      poses: [
        {
          playTime: 0.8,
          pauseTime: 0.2,
          speedRatio: 50,
          angles: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
          emoticon: { groupId: 4, itemIdx: 1, label: '기본미소' }
        }
      ]
    },
    2: {
      name: '인사하기',
      nextPage: 0,
      exitPage: 1,
      poses: [
        {
          playTime: 0.6,
          pauseTime: 0.1,
          speedRatio: 40,
          angles: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
          emoticon: { groupId: 4, itemIdx: 2, label: '활짝웃음' }
        },
        {
          playTime: 0.8,
          pauseTime: 0.3,
          speedRatio: 55,
          angles: { 1: 95, 2: -20, 3: 35, 4: 0, 5: 25, 6: -25, 7: 0, 8: 0 },
          sound: { groupId: 1, id: 13, name: '웃음1', freq: 520, type: 'bark' }
        },
        {
          playTime: 0.5,
          pauseTime: 0.1,
          speedRatio: 35,
          angles: { 1: 95, 2: -20, 3: -25, 4: 0, 5: 25, 6: -25, 7: 0, 8: 0 }
        },
        {
          playTime: 0.5,
          pauseTime: 0.1,
          speedRatio: 35,
          angles: { 1: 95, 2: -20, 3: 35, 4: 0, 5: 25, 6: -25, 7: 0, 8: 0 }
        },
        {
          playTime: 0.8,
          pauseTime: 0.2,
          speedRatio: 50,
          angles: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 }
        }
      ]
    },
    3: {
      name: '앞으로 걷기(전진)',
      nextPage: 3,
      exitPage: 1,
      poses: [
        { playTime: 0.5, pauseTime: 0.0, speedRatio: 35, angles: { 1: -30, 2: -30, 3: 10, 4: -10, 5: 35, 6: 35, 7: 15, 8: 15 } },
        { playTime: 0.5, pauseTime: 0.0, speedRatio: 35, angles: { 1: 30, 2: 30, 3: 10, 4: -10, 5: -35, 6: -35, 7: -15, 8: -15 } },
        { playTime: 0.5, pauseTime: 0.0, speedRatio: 35, angles: { 1: -30, 2: -30, 3: 10, 4: -10, 5: 35, 6: 35, 7: 15, 8: 15 } },
        { playTime: 0.5, pauseTime: 0.0, speedRatio: 35, angles: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 } }
      ]
    },
    4: {
      name: '뒤로 걷기(후진)',
      nextPage: 4,
      exitPage: 1,
      poses: [
        { playTime: 0.5, pauseTime: 0.0, speedRatio: 35, angles: { 1: 30, 2: 30, 3: 10, 4: -10, 5: -30, 6: -30, 7: 15, 8: 15 } },
        { playTime: 0.5, pauseTime: 0.0, speedRatio: 35, angles: { 1: -30, 2: -30, 3: 10, 4: -10, 5: 30, 6: 30, 7: -15, 8: -15 } },
        { playTime: 0.5, pauseTime: 0.0, speedRatio: 35, angles: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 } }
      ]
    },
    5: {
      name: '만세 세리머니',
      nextPage: 0,
      exitPage: 1,
      poses: [
        {
          playTime: 0.6,
          pauseTime: 0.2,
          speedRatio: 45,
          angles: { 1: 120, 2: -120, 3: 45, 4: -45, 5: 0, 6: 0, 7: 10, 8: -10 },
          emoticon: { groupId: 4, itemIdx: 7, label: '하트눈' },
          sound: { groupId: 3, id: 3, name: '레벨업 팡파레', freq: 523, type: 'fanfare' }
        },
        { playTime: 0.6, pauseTime: 0.2, speedRatio: 45, angles: { 1: 135, 2: -135, 3: -20, 4: 20, 5: 15, 6: -15, 7: -10, 8: 10 } },
        { playTime: 0.7, pauseTime: 0.1, speedRatio: 50, angles: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 } }
      ]
    },
    6: {
      name: '태권 정권찌르기',
      nextPage: 0,
      exitPage: 1,
      poses: [
        { playTime: 0.4, pauseTime: 0.1, speedRatio: 25, angles: { 1: 85, 2: 30, 3: 15, 4: -35, 5: 25, 6: 25, 7: 10, 8: -10 } },
        { playTime: 0.4, pauseTime: 0.1, speedRatio: 25, angles: { 1: -30, 2: -85, 3: 35, 4: -15, 5: -25, 6: -25, 7: -10, 8: 10 } },
        { playTime: 0.6, pauseTime: 0.1, speedRatio: 45, angles: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 } }
      ]
    }
  };

  return Array.from({ length: 30 }, (_, index) => {
    const pageNumber = index + 1;
    const preset = presets[pageNumber];
    return {
      pageNumber,
      name: preset ? preset.name : '',
      nextPage: preset ? preset.nextPage : 0,
      exitPage: preset ? preset.exitPage : 0,
      poses: createDefaultPoses(preset ? preset.poses : [])
    };
  });
}
