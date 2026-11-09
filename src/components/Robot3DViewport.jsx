// ============================================================================
// [파일 설명: Robot3DViewport.jsx]
// 원본 R-Motion의 webrender.js 및 #webgl-output 영역을 담당하는
// Three.js 기반 3D 로봇 뷰어 및 인터랙티브 관절(모터) 제어 컴포넌트입니다.
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RMOTION_BASE_URL, STANDARD_8DOF_JOINTS } from '../data/robotData';

export default function Robot3DViewport({
  currentRobot,
  currentAngles,
  selectedJointId,
  showMotorIds,
  torqueOn,
  jointTorqueMap,
  motorLocked,
  autoRotate,
  speedMultiplier,
  showTooltips,
  onSelectJoint,
  onChangeJointAngle,
  onToggleMotorIds,
  onToggleMotorLock,
  onToggleJointTorque,
  onChangeSpeedMultiplier,
  onCopyFrom3D,
  onMirrorSelectedJoint,
  onCopySelectedJointToMirror,
  onShowToast
}) {
  // Three.js WebGL 렌더러가 마운트될 DOM 컨테이너 참조
  const mountRef = useRef(null);

  // Three.js 핵심 객체들을 저장하는 참조 (리렌더링 시에도 유지)
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const robotRootRef = useRef(null);
  const jointPivotsRef = useRef({}); // { 1: Group, 2: Group, ... } 각 모터 회전축 그룹
  const jointRingsRef = useRef({}); // { 1: Mesh, 2: Mesh, ... } 각 모터 가이드 링 메쉬
  const animatedAnglesRef = useRef({ ...currentAngles }); // 부드러운 보간용 현재 각도
  const targetAnglesRef = useRef({ ...currentAngles }); // 목표 각도

  // 카메라 구면 좌표계 상태 (마우스 궤도 회전 및 줌 제어용)
  const sphericalRef = useRef({
    theta: 0.25, // 좌우 회전각 (라디안)
    phi: 1.35, // 상하 회전각 (라디안)
    radius: 360, // 카메라 거리
    targetY: 75 // 카메라가 바라보는 중심 높이
  });

  // 3D 관절 위치에 오버레이될 2D 모터 ID 배지 화면 좌표 배열
  const [jointScreenCoords, setJointScreenCoords] = useState([]);

  // 카메라 회전 각도를 UI 기즈모(Gizmo)에 반영하기 위한 상태
  const [cameraAnglesDeg, setCameraAnglesDeg] = useState({ yaw: 14, pitch: -12 });

  // 배속 슬라이더 팝업 열림/닫힘 상태
  const [isSpeedBarOpen, setIsSpeedBarOpen] = useState(false);

  // 배경 테마 인덱스 (0: 기본 하늘색, 1: 스튜디오 화이트, 2: 다크 그리드, 3: 웜 베이지)
  const [bgThemeIdx, setBgThemeIdx] = useState(0);
  const bgThemes = [
    { name: '기본 스카이 블루', css: 'linear-gradient(180deg, #daf5ff 0%, #effaff 100%)', threeColor: 0xdaf5ff },
    { name: '스튜디오 화이트', css: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)', threeColor: 0xf1f5f9 },
    { name: '사이버 다크', css: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', threeColor: 0x0f172a },
    { name: '소프트 파스텔', css: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)', threeColor: 0xfef3c7 }
  ];

  // 개별 토크 표시 패널 열림 여부
  const [showTorquePanel, setShowTorquePanel] = useState(false);

  // 3D 영역 우클릭 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0
  });

  // 관절 각도 직접 입력 모달(프롬프트 대용 인라인 팝업) 상태
  const [isAngleInputOpen, setIsAngleInputOpen] = useState(false);
  const [angleInputText, setAngleInputText] = useState('0');

  // 마우스 드래그로 관절을 직접 회전 중인지 추적하는 참조
  const draggingJointRef = useRef({
    active: false,
    jointId: null,
    startY: 0,
    startX: 0,
    startAngle: 0
  });

  // 최신 props 값을 이벤트 루프에서 참조하기 위한 ref 동기화 (Stale Closure 방지)
  const propsRef = useRef({
    selectedJointId,
    motorLocked,
    autoRotate,
    currentAngles,
    onSelectJoint,
    onChangeJointAngle
  });
  useEffect(() => {
    propsRef.current = {
      selectedJointId,
      motorLocked,
      autoRotate,
      currentAngles,
      onSelectJoint,
      onChangeJointAngle
    };
    targetAnglesRef.current = { ...currentAngles };
  }, [
    selectedJointId,
    motorLocked,
    autoRotate,
    currentAngles,
    onSelectJoint,
    onChangeJointAngle
  ]);

  // ==========================================================================
  // [함수: buildRobot3DModel]
  // 선택된 로봇(꼭두, 드래곤, Max-E2, AI-001, 사용자 등)의 3D 메쉬와
  // 8축 관절 계층 구조(Shoulder -> Hand, Leg -> Ankle)를 생성합니다.
  // ==========================================================================
  const buildRobot3DModel = (robotInfo) => {
    const root = new THREE.Group();
    const pivots = {};
    const rings = {};

    const primaryHex = robotInfo?.accentColor || '#315fe0';
    const primaryColor = new THREE.Color(primaryHex);
    const isDragon = robotInfo?.index === 1;
    const isMaxE2 = robotInfo?.index === 9;
    const isAi001 = robotInfo?.index === 10;
    const isUserDxl = robotInfo?.index === -1;

    // 공통 재질(Material) 생성
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.1
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.3,
      metalness: 0.2
    });
    const darkServoMat = new THREE.MeshStandardMaterial({
      color: 0x263238,
      roughness: 0.5,
      metalness: 0.3
    });
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.15,
      metalness: 0.4,
      emissive: new THREE.Color(0x0f172a)
    });

    // 가이드 링 생성 헬퍼 함수 (원본 R-Motion의 컬러풀한 회전 가이드 링 재현)
    const createGuideRing = (jointId, radius = 22, colorHex = 0xef4444, rotAxis = 'x') => {
      const ringGeo = new THREE.TorusGeometry(radius, 2.2, 16, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.45
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      if (rotAxis === 'x') ringMesh.rotation.y = Math.PI / 2;
      if (rotAxis === 'z') ringMesh.rotation.x = 0;
      ringMesh.userData = { jointId, baseColor: colorHex };

      // 링 위 방향 화살표 콘(Cone) 2개 추가
      const coneGeo = new THREE.ConeGeometry(4.2, 9, 12);
      const cone1 = new THREE.Mesh(coneGeo, ringMat);
      cone1.position.set(radius, 0, 0);
      ringMesh.add(cone1);

      rings[jointId] = ringMesh;
      return ringMesh;
    };

    // 사용자(User) 단일 다이나믹셀 모터 모드일 때
    if (isUserDxl) {
      const baseStand = new THREE.Mesh(
        new THREE.BoxGeometry(80, 14, 80),
        darkServoMat
      );
      baseStand.position.set(0, 7, 0);
      root.add(baseStand);

      const dxlCase = new THREE.Mesh(
        new THREE.BoxGeometry(54, 72, 54),
        darkServoMat
      );
      dxlCase.position.set(0, 50, 0);
      dxlCase.userData = { jointId: 1 };
      root.add(dxlCase);

      const pivot1 = new THREE.Group();
      pivot1.position.set(0, 62, 28);
      root.add(pivot1);
      pivots[1] = pivot1;

      const hornDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(22, 22, 6, 32),
        accentMat
      );
      hornDisc.rotation.x = Math.PI / 2;
      hornDisc.userData = { jointId: 1 };
      pivot1.add(hornDisc);

      const armBar = new THREE.Mesh(
        new THREE.BoxGeometry(16, 76, 8),
        bodyMat
      );
      armBar.position.set(0, 32, 4);
      armBar.userData = { jointId: 1 };
      pivot1.add(armBar);

      const ring1 = createGuideRing(1, 38, 0xef4444, 'z');
      pivot1.add(ring1);

      // 나머지 2~8번 더미 피벗 등록 (호환성 유지)
      for (let id = 2; id <= 8; id++) {
        const dummy = new THREE.Group();
        dummy.position.set((id - 4.5) * 18, 20, 0);
        root.add(dummy);
        pivots[id] = dummy;
      }

      return { root, pivots, rings };
    }

    // ==================== 표준 휴머노이드 로봇 (꼭두 / 드래곤 / Max-E2 / AI-001) ====================
    // 1. 몸통(Torso) 그룹 (바닥으로부터 약 82mm 높이)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 86, 0);
    root.add(torsoGroup);

    // 몸통 메인 블록 (RB-100 / RB-550 제어기 하우징)
    const torsoMesh = new THREE.Mesh(
      new THREE.BoxGeometry(66, 74, 44),
      bodyMat
    );
    torsoMesh.castShadow = true;
    torsoGroup.add(torsoMesh);

    // 가슴/배 컨트롤러 포인트 장식
    const chestArmor = new THREE.Mesh(
      new THREE.BoxGeometry(56, 34, 46),
      accentMat
    );
    chestArmor.position.set(0, -12, 0);
    torsoGroup.add(chestArmor);

    // 꼭두(Puppet) 전통 치마/조끼 커버 장식
    if (robotInfo?.index === 0) {
      const skirtMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(34, 44, 26, 24),
        accentMat
      );
      skirtMesh.position.set(0, -34, 0);
      torsoGroup.add(skirtMesh);
    }

    // 드래곤(Dragon) 등 날개 장식
    if (isDragon) {
      const wingGeo = new THREE.BoxGeometry(46, 36, 4);
      const leftWing = new THREE.Mesh(wingGeo, accentMat);
      leftWing.position.set(34, 10, -24);
      leftWing.rotation.z = -0.35;
      leftWing.rotation.y = -0.3;
      torsoGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, accentMat);
      rightWing.position.set(-34, 10, -24);
      rightWing.rotation.z = 0.35;
      rightWing.rotation.y = 0.3;
      torsoGroup.add(rightWing);
    }

    // 2. 머리(Head) & LCD 표정 스크린
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 56, 0);
    torsoGroup.add(headGroup);

    const headBox = new THREE.Mesh(
      new THREE.BoxGeometry(58, 44, 42),
      bodyMat
    );
    headGroup.add(headBox);

    // 전면 LCD 스크린 (이모티콘 눈 표정 표시)
    const lcdScreen = new THREE.Mesh(
      new THREE.BoxGeometry(48, 32, 2),
      screenMat
    );
    lcdScreen.position.set(0, 0, 21.5);
    headGroup.add(lcdScreen);

    // 귀여운 LED 눈 표현
    const eyeMat = new THREE.MeshBasicMaterial({
      color: isDragon ? 0x34d399 : isMaxE2 ? 0xfbbf24 : 0x38bdf8
    });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 16), eyeMat);
    leftEye.position.set(-12, 2, 22.5);
    leftEye.scale.set(1, 1.3, 0.3);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 16), eyeMat);
    rightEye.position.set(12, 2, 22.5);
    rightEye.scale.set(1, 1.3, 0.3);
    headGroup.add(rightEye);

    const smileBar = new THREE.Mesh(
      new THREE.TorusGeometry(6, 1.4, 8, 20, Math.PI),
      eyeMat
    );
    smileBar.position.set(0, -5, 22.5);
    smileBar.rotation.z = Math.PI;
    headGroup.add(smileBar);

    // 로봇별 머리 상단 특징 파츠 (꼭두 갓/모자, 드래곤 뿔, AI-001 안테나)
    if (robotInfo?.index === 0) {
      const hatBrim = new THREE.Mesh(
        new THREE.CylinderGeometry(36, 38, 6, 24),
        accentMat
      );
      hatBrim.position.set(0, 24, 0);
      headGroup.add(hatBrim);
      const hatTop = new THREE.Mesh(
        new THREE.CylinderGeometry(18, 22, 16, 20),
        darkServoMat
      );
      hatTop.position.set(0, 33, 0);
      headGroup.add(hatTop);
    } else if (isDragon) {
      const hornGeo = new THREE.ConeGeometry(6, 24, 12);
      const hornL = new THREE.Mesh(hornGeo, accentMat);
      hornL.position.set(18, 30, 4);
      hornL.rotation.z = -0.3;
      headGroup.add(hornL);
      const hornR = new THREE.Mesh(hornGeo, accentMat);
      hornR.position.set(-18, 30, 4);
      hornR.rotation.z = 0.3;
      headGroup.add(hornR);
    } else if (isAi001 || isMaxE2) {
      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 3, 20, 12),
        accentMat
      );
      antenna.position.set(0, 30, 0);
      headGroup.add(antenna);
    }

    // ==================== 3. 팔 관절 계층 (ID 1: 오른어깨 -> ID 3: 오른손, ID 2: 왼어깨 -> ID 4: 왼손) ====================
    // 로봇 기준 오른쪽(화면상 좌측, X = -42) = ID 1, ID 3
    const rShoulderPivot = new THREE.Group();
    rShoulderPivot.position.set(-42, 22, 0);
    torsoGroup.add(rShoulderPivot);
    pivots[1] = rShoulderPivot;

    const rShoulderServo = new THREE.Mesh(
      new THREE.BoxGeometry(20, 24, 24),
      darkServoMat
    );
    rShoulderServo.userData = { jointId: 1 };
    rShoulderPivot.add(rShoulderServo);
    rShoulderPivot.add(createGuideRing(1, 22, 0xef4444, 'x'));

    // ID 3: 오른손(팔 하박) 피벗
    const rHandPivot = new THREE.Group();
    rHandPivot.position.set(-10, -18, 0);
    rShoulderPivot.add(rHandPivot);
    pivots[3] = rHandPivot;

    const rArmMesh = new THREE.Mesh(
      new THREE.BoxGeometry(18, 46, 20),
      bodyMat
    );
    rArmMesh.position.set(0, -18, 0);
    rArmMesh.userData = { jointId: 3 };
    rHandPivot.add(rArmMesh);

    const rFistMesh = new THREE.Mesh(
      new THREE.SphereGeometry(12, 16, 16),
      accentMat
    );
    rFistMesh.position.set(0, -44, 0);
    rFistMesh.userData = { jointId: 3 };
    rHandPivot.add(rFistMesh);
    rHandPivot.add(createGuideRing(3, 20, 0x3b82f6, 'z'));

    // 로봇 기준 왼쪽(화면상 우측, X = +42) = ID 2, ID 4
    const lShoulderPivot = new THREE.Group();
    lShoulderPivot.position.set(42, 22, 0);
    torsoGroup.add(lShoulderPivot);
    pivots[2] = lShoulderPivot;

    const lShoulderServo = new THREE.Mesh(
      new THREE.BoxGeometry(20, 24, 24),
      darkServoMat
    );
    lShoulderServo.userData = { jointId: 2 };
    lShoulderPivot.add(lShoulderServo);
    lShoulderPivot.add(createGuideRing(2, 22, 0xef4444, 'x'));

    // ID 4: 왼손(팔 하박) 피벗
    const lHandPivot = new THREE.Group();
    lHandPivot.position.set(10, -18, 0);
    lShoulderPivot.add(lHandPivot);
    pivots[4] = lHandPivot;

    const lArmMesh = new THREE.Mesh(
      new THREE.BoxGeometry(18, 46, 20),
      bodyMat
    );
    lArmMesh.position.set(0, -18, 0);
    lArmMesh.userData = { jointId: 4 };
    lHandPivot.add(lArmMesh);

    const lFistMesh = new THREE.Mesh(
      new THREE.SphereGeometry(12, 16, 16),
      accentMat
    );
    lFistMesh.position.set(0, -44, 0);
    lFistMesh.userData = { jointId: 4 };
    lHandPivot.add(lFistMesh);
    lHandPivot.add(createGuideRing(4, 20, 0x3b82f6, 'z'));

    // ==================== 4. 다리 & 발목 관절 계층 (ID 5 -> ID 7, ID 6 -> ID 8) ====================
    // ID 5: 오른다리 (X = -20)
    const rLegPivot = new THREE.Group();
    rLegPivot.position.set(-20, -40, 0);
    torsoGroup.add(rLegPivot);
    pivots[5] = rLegPivot;

    const rThighMesh = new THREE.Mesh(
      new THREE.BoxGeometry(22, 34, 26),
      darkServoMat
    );
    rThighMesh.position.set(0, -14, 0);
    rThighMesh.userData = { jointId: 5 };
    rLegPivot.add(rThighMesh);
    rLegPivot.add(createGuideRing(5, 22, 0x10b981, 'x'));

    // ID 7: 오른발목
    const rAnklePivot = new THREE.Group();
    rAnklePivot.position.set(0, -34, 0);
    rLegPivot.add(rAnklePivot);
    pivots[7] = rAnklePivot;

    const rFootMesh = new THREE.Mesh(
      new THREE.BoxGeometry(28, 12, 44),
      accentMat
    );
    rFootMesh.position.set(0, -6, 6);
    rFootMesh.userData = { jointId: 7 };
    rAnklePivot.add(rFootMesh);
    rAnklePivot.add(createGuideRing(7, 20, 0x3b82f6, 'z'));

    // ID 6: 왼다리 (X = +20)
    const lLegPivot = new THREE.Group();
    lLegPivot.position.set(20, -40, 0);
    torsoGroup.add(lLegPivot);
    pivots[6] = lLegPivot;

    const lThighMesh = new THREE.Mesh(
      new THREE.BoxGeometry(22, 34, 26),
      darkServoMat
    );
    lThighMesh.position.set(0, -14, 0);
    lThighMesh.userData = { jointId: 6 };
    lLegPivot.add(lThighMesh);
    lLegPivot.add(createGuideRing(6, 22, 0x10b981, 'x'));

    // ID 8: 왼발목
    const lAnklePivot = new THREE.Group();
    lAnklePivot.position.set(0, -34, 0);
    lLegPivot.add(lAnklePivot);
    pivots[8] = lAnklePivot;

    const lFootMesh = new THREE.Mesh(
      new THREE.BoxGeometry(28, 12, 44),
      accentMat
    );
    lFootMesh.position.set(0, -6, 6);
    lFootMesh.userData = { jointId: 8 };
    lAnklePivot.add(lFootMesh);
    lAnklePivot.add(createGuideRing(8, 20, 0x3b82f6, 'z'));

    return { root, pivots, rings };
  };

  // ==========================================================================
  // [Effect 1: Three.js 씬, 카메라, 렌더러 초기화 및 애니메이션 루프]
  // ==========================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene 생성
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera 생성
    const camera = new THREE.PerspectiveCamera(38, width / height, 1, 2500);
    cameraRef.current = camera;

    // 3. WebGLRenderer 생성 (투명 배경 허용하여 CSS 그라데이션과 자연스럽게 어울림)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. 조명(Light) 설정
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(160, 280, 220);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.45);
    dirLight2.position.set(-160, 120, -180);
    scene.add(dirLight2);

    // 5. 바닥 그리드 및 원형 스테이지 플랫폼 (원본 000_rtong.json의 PlaneColor/WireFrame 반영)
    const stageGroup = new THREE.Group();
    const gridHelper = new THREE.GridHelper(320, 16, 0x64748b, 0x94a3b8);
    gridHelper.position.y = 0;
    gridHelper.material.opacity = 0.35;
    gridHelper.material.transparent = true;
    stageGroup.add(gridHelper);

    const platformDisk = new THREE.Mesh(
      new THREE.CylinderGeometry(95, 102, 4, 48),
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.6,
        metalness: 0.1
      })
    );
    platformDisk.position.y = -2;
    stageGroup.add(platformDisk);

    // 전방(FRONT) 방향 화살표 마커
    const frontArrow = new THREE.Mesh(
      new THREE.ConeGeometry(8, 16, 3),
      new THREE.MeshBasicMaterial({ color: 0x315fe0 })
    );
    frontArrow.rotation.x = Math.PI / 2;
    frontArrow.position.set(0, 1, 104);
    stageGroup.add(frontArrow);

    scene.add(stageGroup);

    // 6. 카메라 위치 업데이트 헬퍼 함수
    const updateCameraPosition = () => {
      const s = sphericalRef.current;
      const x = s.radius * Math.sin(s.phi) * Math.sin(s.theta);
      const y = s.targetY + s.radius * Math.cos(s.phi);
      const z = s.radius * Math.sin(s.phi) * Math.cos(s.theta);
      camera.position.set(x, y, z);
      camera.lookAt(0, s.targetY, 0);
    };
    updateCameraPosition();

    // 7. 마우스/터치 이벤트 (3D 부품 클릭 시 관절 선택 & 드래그 시 각도 조절 또는 카메라 궤도 회전)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isOrbitDragging = false;
    let prevPointer = { x: 0, y: 0 };

    const handlePointerDown = (e) => {
      if (e.button === 2) return; // 우클릭은 컨텍스트 메뉴에서 처리
      setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      if (robotRootRef.current) {
        const intersects = raycaster.intersectObjects(
          robotRootRef.current.children,
          true
        );
        const hit = intersects.find(
          (item) => item.object?.userData?.jointId !== undefined
        );
        if (hit) {
          const hitJointId = hit.object.userData.jointId;
          propsRef.current.onSelectJoint(hitJointId);

          if (!propsRef.current.motorLocked) {
            draggingJointRef.current = {
              active: true,
              jointId: hitJointId,
              startY: e.clientY,
              startX: e.clientX,
              startAngle: propsRef.current.currentAngles[hitJointId] ?? 0
            };
            return;
          }
        }
      }

      // 관절이 아닌 배경 클릭 시 3D 카메라 회전 시작
      isOrbitDragging = true;
      prevPointer = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e) => {
      // 1) 관절 직접 드래그 회전 모드일 때
      if (draggingJointRef.current.active) {
        const { jointId, startY, startX, startAngle } = draggingJointRef.current;
        const delta = (startY - e.clientY) + (e.clientX - startX) * 0.5;
        const jointMeta =
          STANDARD_8DOF_JOINTS.find((j) => j.id === jointId) ||
          STANDARD_8DOF_JOINTS[0];
        const nextAngle = Math.max(
          jointMeta.min,
          Math.min(jointMeta.max, Math.round(startAngle + delta * 0.65))
        );
        propsRef.current.onChangeJointAngle(jointId, nextAngle);
        return;
      }

      // 2) 카메라 궤도 회전 모드일 때
      if (!isOrbitDragging) return;
      const dx = e.clientX - prevPointer.x;
      const dy = e.clientY - prevPointer.y;
      prevPointer = { x: e.clientX, y: e.clientY };

      sphericalRef.current.theta -= dx * 0.008;
      sphericalRef.current.phi = Math.max(
        0.35,
        Math.min(Math.PI - 0.25, sphericalRef.current.phi - dy * 0.008)
      );
      updateCameraPosition();
      setCameraAnglesDeg({
        yaw: Math.round((sphericalRef.current.theta * 180) / Math.PI),
        pitch: Math.round(((sphericalRef.current.phi - Math.PI / 2) * 180) / Math.PI)
      });
    };

    const handlePointerUp = () => {
      isOrbitDragging = false;
      draggingJointRef.current.active = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      sphericalRef.current.radius = Math.max(
        180,
        Math.min(620, sphericalRef.current.radius + e.deltaY * 0.25)
      );
      updateCameraPosition();
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('blur', handlePointerUp);
    domElem.addEventListener('wheel', handleWheel, { passive: false });

    // 8. 창 크기 변경 대응
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 9. 렌더링 애니메이션 루프
    let animFrameId;
    let frameCount = 0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);

      // 자동 회전(F2) 옵션이 켜져 있을 때
      if (propsRef.current.autoRotate && !isOrbitDragging && !draggingJointRef.current.active) {
        sphericalRef.current.theta += 0.005;
        updateCameraPosition();
      }

      // 각 관절 각도를 목표 각도로 부드럽게 보간(Lerp)하여 회전 적용
      const pivots = jointPivotsRef.current;
      const targets = targetAnglesRef.current;
      const curr = animatedAnglesRef.current;

      for (let id = 1; id <= 8; id++) {
        const targetVal = targets[id] ?? 0;
        const prevVal = curr[id] ?? 0;
        const nextVal = prevVal + (targetVal - prevVal) * 0.22;
        curr[id] = Math.abs(targetVal - nextVal) < 0.05 ? targetVal : nextVal;

        const pivotGroup = pivots[id];
        if (pivotGroup) {
          const rad = (curr[id] * Math.PI) / 180;
          // ID 1, 2 (어깨), ID 5, 6 (다리)는 앞뒤 Pitch(X축) 회전
          if (id === 1 || id === 2 || id === 5 || id === 6) {
            pivotGroup.rotation.x = id % 2 === 1 ? -rad : rad;
          } else {
            // ID 3, 4 (손/팔), ID 7, 8 (발목)은 좌우 Roll(Z축) 회전
            pivotGroup.rotation.z = rad;
          }
        }
      }

      // 선택된 관절의 가이드 링 강조 효과
      const rings = jointRingsRef.current;
      Object.keys(rings).forEach((key) => {
        const id = Number(key);
        const ring = rings[id];
        if (!ring) return;
        const isSel = id === propsRef.current.selectedJointId;
        ring.material.opacity = isSel ? 0.92 : 0.25;
        ring.scale.setScalar(isSel ? 1.12 : 1.0);
      });

      renderer.render(scene, camera);

      // 3프레임마다 3D 관절의 2D 화면 투영 좌표를 계산하여 모터 ID 배지 위치 갱신
      frameCount += 1;
      if (frameCount % 3 === 0 && container) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        const projected = [];
        const tempVec = new THREE.Vector3();

        STANDARD_8DOF_JOINTS.forEach((jMeta) => {
          const pv = pivots[jMeta.id];
          if (!pv) return;
          pv.getWorldPosition(tempVec);
          tempVec.project(camera);
          const sx = (tempVec.x * 0.5 + 0.5) * w;
          const sy = (-(tempVec.y * 0.5) + 0.5) * h;
          if (tempVec.z < 1) {
            projected.push({
              id: jMeta.id,
              name: jMeta.name,
              x: sx,
              y: sy
            });
          }
        });
        setJointScreenCoords(projected);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameId);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', handlePointerUp);
      domElem.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // ==========================================================================
  // [Effect 2: 선택된 로봇(currentRobot)이 변경될 때 3D 모델 교체]
  // ==========================================================================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (robotRootRef.current) {
      scene.remove(robotRootRef.current);
    }

    const { root, pivots, rings } = buildRobot3DModel(currentRobot);
    scene.add(root);
    robotRootRef.current = root;
    jointPivotsRef.current = pivots;
    jointRingsRef.current = rings;
  }, [currentRobot]);

  // 현재 선택된 관절 메타 정보
  const selectedJointMeta =
    STANDARD_8DOF_JOINTS.find((j) => j.id === selectedJointId) ||
    STANDARD_8DOF_JOINTS[0];

  // 카메라 시점을 정면/측면/상단으로 즉시 정렬하는 함수 (기즈모 클릭용)
  const handleSnapCamera = (viewType) => {
    if (viewType === 'FRONT') {
      sphericalRef.current.theta = 0;
      sphericalRef.current.phi = 1.42;
      sphericalRef.current.radius = 350;
    } else if (viewType === 'SIDE') {
      sphericalRef.current.theta = Math.PI / 2;
      sphericalRef.current.phi = 1.42;
    } else if (viewType === 'TOP') {
      sphericalRef.current.theta = 0;
      sphericalRef.current.phi = 0.45;
    }
    const camera = cameraRef.current;
    if (camera) {
      const s = sphericalRef.current;
      camera.position.set(
        s.radius * Math.sin(s.phi) * Math.sin(s.theta),
        s.targetY + s.radius * Math.cos(s.phi),
        s.radius * Math.sin(s.phi) * Math.cos(s.theta)
      );
      camera.lookAt(0, s.targetY, 0);
    }
    onShowToast(`3D 카메라 시점을 [${viewType}] 뷰로 정렬했습니다.`);
  };

  return (
    <div
      id="webgl-output"
      className="rm-motion-area"
      style={{ background: bgThemes[bgThemeIdx].css }}
      onContextMenu={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        setContextMenu({
          visible: true,
          x: Math.min(rect.width - 170, e.clientX - rect.left),
          y: Math.min(rect.height - 190, e.clientY - rect.top)
        });
      }}
    >
      {/* ==================== 1. Three.js WebGL 캔버스 마운트 컨테이너 ==================== */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: motorLocked ? 'grab' : 'pointer'
        }}
      />

      {/* ==================== 2. 상단 중앙 선택 관절 표시 버튼 (#btnAxis) ==================== */}
      <button
        id="btnAxis"
        type="button"
        title={showTooltips ? '클릭하여 선택된 관절의 각도를 직접 입력합니다.' : ''}
        onClick={() => {
          setAngleInputText(String(currentAngles[selectedJointId] ?? 0));
          setIsAngleInputOpen(true);
        }}
        style={{
          position: 'absolute',
          left: '50%',
          top: '10px',
          transform: 'translateX(-50%)',
          zIndex: 25,
          minWidth: '240px',
          height: '32px',
          border: '1px solid rgba(180, 199, 231, 1.0)',
          backgroundColor: 'rgb(240, 245, 176)',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 700,
          boxShadow: '2px 2px 10px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '0 14px',
          cursor: 'pointer'
        }}
      >
        <span style={{ color: '#1e293b' }}>
          [ID:{selectedJointMeta.id}] {selectedJointMeta.name}
        </span>
        <span style={{ color: '#2563eb' }}>
          {currentAngles[selectedJointId] ?? 0}°
        </span>
        <span style={{ color: '#64748b', fontSize: '11px' }}>
          [{selectedJointMeta.min}°~{selectedJointMeta.max}°]
        </span>
      </button>

      {/* 상단 선택 관절 빠른 슬라이더 & 미세조정(-1° / +1°) 바 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '48px',
          transform: 'translateX(-50%)',
          zIndex: 24,
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(6px)',
          padding: '5px 12px',
          borderRadius: '999px',
          border: '1px solid #cbd5e1',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}
      >
        <button
          type="button"
          onClick={() =>
            onChangeJointAngle(
              selectedJointId,
              Math.max(
                selectedJointMeta.min,
                (currentAngles[selectedJointId] ?? 0) - 5
              )
            )
          }
          style={{
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            borderRadius: '6px',
            padding: '2px 7px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          -5°
        </button>
        <input
          type="range"
          min={selectedJointMeta.min}
          max={selectedJointMeta.max}
          value={currentAngles[selectedJointId] ?? 0}
          disabled={motorLocked}
          onChange={(e) =>
            onChangeJointAngle(selectedJointId, Number(e.target.value))
          }
          style={{ width: '150px', cursor: motorLocked ? 'not-allowed' : 'pointer' }}
        />
        <button
          type="button"
          onClick={() =>
            onChangeJointAngle(
              selectedJointId,
              Math.min(
                selectedJointMeta.max,
                (currentAngles[selectedJointId] ?? 0) + 5
              )
            )
          }
          style={{
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            borderRadius: '6px',
            padding: '2px 7px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          +5°
        </button>
        <button
          type="button"
          onClick={() => onChangeJointAngle(selectedJointId, 0)}
          style={{
            border: 'none',
            background: '#315fe0',
            color: '#fff',
            borderRadius: '6px',
            padding: '3px 8px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          0° 초기화
        </button>
      </div>

      {/* ==================== 3. 3D 관절 위 모터 ID 오버레이 배지 ==================== */}
      {showMotorIds &&
        jointScreenCoords.map((coord) => {
          const isSelected = coord.id === selectedJointId;
          const angleVal = currentAngles[coord.id] ?? 0;
          const isTorqOn = jointTorqueMap?.[coord.id] ?? torqueOn;
          return (
            <div
              key={coord.id}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelectJoint(coord.id);
                if (!motorLocked) {
                  draggingJointRef.current = {
                    active: true,
                    jointId: coord.id,
                    startY: e.clientY,
                    startX: e.clientX,
                    startAngle: currentAngles[coord.id] ?? 0
                  };
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectJoint(coord.id);
              }}
              style={{
                position: 'absolute',
                left: `${coord.x}px`,
                top: `${coord.y}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: isSelected ? 22 : 18,
                background: isSelected
                  ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                  : isTorqOn
                  ? 'rgba(255, 255, 255, 0.92)'
                  : 'rgba(254, 226, 226, 0.92)',
                color: isSelected ? '#ffffff' : '#1e293b',
                border: isSelected
                  ? '2px solid #93c5fd'
                  : '1.5px solid #94a3b8',
                borderRadius: '999px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: isSelected
                  ? '0 0 12px rgba(37, 99, 235, 0.6)'
                  : '0 2px 5px rgba(0,0,0,0.15)',
                whiteSpace: 'nowrap',
                transition: 'transform 0.1s ease'
              }}
              title={`[ID:${coord.id}] ${coord.name} (${angleVal}°)`}
            >
              ID:{coord.id} ({angleVal}°)
            </div>
          );
        })}

      {/* ==================== 4. 우측 상단 3D 방향 기즈모 (#gizmo) ==================== */}
      <div
        id="gizmo"
        style={{
          position: 'absolute',
          right: '14px',
          top: '12px',
          zIndex: 25,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(6px)',
          border: '1px solid #cbd5e1',
          borderRadius: '14px',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
        }}
      >
        <div
          style={{
            fontSize: '10px',
            fontWeight: 800,
            color: '#475569'
          }}
        >
          🧭 3D GIZMO ({cameraAnglesDeg.yaw}°)
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            onClick={() => handleSnapCamera('FRONT')}
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '3px 7px',
              borderRadius: '6px',
              border: '1px solid #94a3b8',
              background: '#eff6ff',
              color: '#1d4ed8',
              cursor: 'pointer'
            }}
          >
            정면
          </button>
          <button
            type="button"
            onClick={() => handleSnapCamera('SIDE')}
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '3px 7px',
              borderRadius: '6px',
              border: '1px solid #94a3b8',
              background: '#f8fafc',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            측면
          </button>
          <button
            type="button"
            onClick={() => handleSnapCamera('TOP')}
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '3px 7px',
              borderRadius: '6px',
              border: '1px solid #94a3b8',
              background: '#f8fafc',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            상단
          </button>
        </div>
      </div>

      {/* ==================== 5. 우측 하단 뷰어 컨트롤 아이콘 4종 ==================== */}
      {/* 1) 배경 변경 버튼 (#imgUserMotor_FileOpen) */}
      <div
        id="imgUserMotor_FileOpen"
        className="torque_view"
        title={showTooltips ? '3D 배경 테마 변경' : ''}
        onClick={() => {
          const next = (bgThemeIdx + 1) % bgThemes.length;
          setBgThemeIdx(next);
          onShowToast(`배경 테마: ${bgThemes[next].name}`);
        }}
        style={{
          position: 'absolute',
          right: '266px',
          bottom: '5px',
          width: '56px',
          height: '52px',
          cursor: 'pointer',
          zIndex: 22
        }}
      >
        <img
          src={`${RMOTION_BASE_URL}/img/img_background_on.png`}
          alt="배경 변경"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* 2) 모터 조작 잠금 토글 버튼 (#imgUserMotor_Lock) */}
      <div
        id="imgUserMotor_Lock"
        className="torque_view"
        title={showTooltips ? '모터 각도 드래그 잠금 On/Off' : ''}
        onClick={onToggleMotorLock}
        style={{
          position: 'absolute',
          right: '215px',
          bottom: '5px',
          width: '56px',
          height: '52px',
          cursor: 'pointer',
          zIndex: 22
        }}
      >
        <img
          src={
            motorLocked
              ? `${RMOTION_BASE_URL}/img/img_lock_off.png`
              : `${RMOTION_BASE_URL}/img/img_lock_on.png`
          }
          alt="잠금"
          onError={(e) => {
            e.currentTarget.src = `${RMOTION_BASE_URL}/img/img_lock_on.png`;
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: motorLocked ? 0.55 : 1
          }}
        />
      </div>

      {/* 3) 개별 토크 On/Off 뷰 버튼 (#imgTorq2) */}
      <div
        id="imgTorq2"
        className="torque_view"
        title={showTooltips ? '개별 모터 토크 On/Off 설정' : ''}
        onClick={() => setShowTorquePanel((prev) => !prev)}
        style={{
          position: 'absolute',
          right: '164px',
          bottom: '5px',
          width: '56px',
          height: '52px',
          cursor: 'pointer',
          zIndex: 22
        }}
      >
        <img
          src={`${RMOTION_BASE_URL}/img/ico_torque_view.png`}
          alt="개별토크"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* 4) 모터 ID 눈 아이콘 표시/숨기기 (#titleEye) */}
      <div
        id="titleEye"
        className="motor_view"
        title={showTooltips ? '모터 ID Show/Hide' : ''}
        onClick={onToggleMotorIds}
        style={{
          position: 'absolute',
          right: '113px',
          bottom: '5px',
          width: '56px',
          height: '52px',
          cursor: 'pointer',
          zIndex: 22,
          opacity: showMotorIds ? 1 : 0.5
        }}
      >
        <img
          src={`${RMOTION_BASE_URL}/img/ico_eye.png`}
          alt="모터ID 표시"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* 개별 토크 제어 미니 팝업 */}
      {showTorquePanel && (
        <div
          style={{
            position: 'absolute',
            right: '130px',
            bottom: '64px',
            zIndex: 30,
            background: '#ffffff',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            border: '1px solid #cbd5e1',
            width: '210px'
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: '12px',
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <span>⚡ 개별 모터 토크 제어</span>
            <span
              style={{ cursor: 'pointer', color: '#64748b' }}
              onClick={() => setShowTorquePanel(false)}
            >
              ✕
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '5px'
            }}
          >
            {STANDARD_8DOF_JOINTS.map((j) => {
              const on = jointTorqueMap?.[j.id] ?? true;
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => onToggleJointTorque(j.id)}
                  style={{
                    padding: '4px 6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: on ? '#dcfce7' : '#fee2e2',
                    color: on ? '#166534' : '#991b1b',
                    cursor: 'pointer'
                  }}
                >
                  ID:{j.id} {on ? 'ON' : 'OFF'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== 6. 우측 수직 배속 슬라이더 (#slider_multi) ==================== */}
      <div
        id="slider_multi"
        style={{
          position: 'absolute',
          right: '24px',
          bottom: '58px',
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {isSpeedBarOpen && (
          <div
            style={{
              height: '200px',
              width: '54px',
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid #cbd5e1',
              borderRadius: '14px',
              padding: '10px 8px',
              marginBottom: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 6px 18px rgba(0,0,0,0.12)'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4e5e74' }}>
              3.2x
            </span>
            <input
              type="range"
              min="0.2"
              max="3.2"
              step="0.1"
              value={speedMultiplier}
              onChange={(e) =>
                onChangeSpeedMultiplier(Number(parseFloat(e.target.value).toFixed(1)))
              }
              style={{
                writingMode: 'bt-lr',
                WebkitAppearance: 'slider-vertical',
                width: '20px',
                height: '130px',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4e5e74' }}>
              0.2x
            </span>
          </div>
        )}

        <button
          id="speed_btn"
          type="button"
          title={showTooltips ? '모션의 속도 배율을 조정합니다.' : ''}
          onClick={() => setIsSpeedBarOpen((prev) => !prev)}
          style={{
            width: '84px',
            padding: '6px 10px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 700,
            backgroundColor: '#4e5e74',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            boxShadow: '0 3px 8px rgba(0,0,0,0.2)'
          }}
        >
          {speedMultiplier}배속
        </button>
      </div>

      {/* ==================== 7. 3D 영역 우클릭 컨텍스트 메뉴 (#contextmenu) ==================== */}
      {contextMenu.visible && (
        <ul
          style={{
            position: 'absolute',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 100,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            padding: '4px 0',
            minWidth: '160px',
            listStyle: 'none',
            margin: 0
          }}
        >
          {[
            {
              label: `[ID:${selectedJointId}] 각도 직접 입력`,
              action: () => {
                setAngleInputText(String(currentAngles[selectedJointId] ?? 0));
                setIsAngleInputOpen(true);
              }
            },
            {
              label: '복사(3D 자세 → 현재 포즈)',
              action: onCopyFrom3D
            },
            {
              label: `토크 On/Off (ID:${selectedJointId})`,
              action: () => onToggleJointTorque(selectedJointId)
            },
            {
              label: 'Mirror (선택 관절 반전)',
              action: onMirrorSelectedJoint
            },
            {
              label: 'Copy (대칭 관절로 복사)',
              action: onCopySelectedJointToMirror
            }
          ].map((item, idx) => (
            <li
              key={idx}
              onClick={() => {
                setContextMenu({ ...contextMenu, visible: false });
                item.action();
              }}
              style={{
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                borderBottom: idx < 4 ? '1px solid #f1f5f9' : 'none'
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

      {/* ==================== 8. 관절 각도 직접 입력 팝업 ==================== */}
      {isAngleInputOpen && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '90px',
            transform: 'translateX(-50%)',
            zIndex: 50,
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
            border: '2px solid #315fe0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '13px' }}>
            [ID:{selectedJointMeta.id} {selectedJointMeta.name}] 각도:
          </span>
          <input
            type="number"
            min={selectedJointMeta.min}
            max={selectedJointMeta.max}
            value={angleInputText}
            onChange={(e) => setAngleInputText(e.target.value)}
            style={{
              width: '70px',
              padding: '5px 8px',
              borderRadius: '6px',
              border: '1px solid #94a3b8',
              fontWeight: 700
            }}
          />
          <button
            type="button"
            onClick={() => {
              const parsed = Number(angleInputText);
              if (!Number.isNaN(parsed)) {
                const clamped = Math.max(
                  selectedJointMeta.min,
                  Math.min(selectedJointMeta.max, parsed)
                );
                onChangeJointAngle(selectedJointId, clamped);
              }
              setIsAngleInputOpen(false);
            }}
            style={{
              background: '#315fe0',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            적용
          </button>
          <button
            type="button"
            onClick={() => setIsAngleInputOpen(false)}
            style={{
              background: '#e2e8f0',
              color: '#475569',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 10px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
}

