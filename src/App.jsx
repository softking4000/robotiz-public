// ============================================================================
// [파일 설명: App.jsx]
// R-Motion (알모션 v1.5.21) 웹 애플리케이션의 최상위 상태 관리 및
// Three.js 3D 뷰어(Robot3DViewport), 하단 7단계 포즈 타임라인(PoseTimeline),
// 이모티콘/사운드 설정 모달(EmoticonSoundModals), 우측 모션 페이지 리스트 및
// [Memory] 병합 뷰(MotionPagePanel), 파일 열기/저장 모달(FileOpenSaveModals),
// 가상 게임패드(RemotePadModal), AI 리모컨(AiRemoteModal),
// 전문가 도구(DxlManagerModal, DanceManagerModal), 환경설정/튜토리얼/보안로그인(SystemModals),
// 그리고 실제 COM5 (ROBOTIS Virtual COM Port) USB 시리얼 통신(robotSerialService)을
// 모두 통합하는 메인 컴포넌트입니다.
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  RMOTION_BASE_URL,
  ROBOT_LIST,
  STANDARD_8DOF_JOINTS,
  createInitialMotionPages,
  createDefaultPoses,
  playSynthesizedSound
} from './data/robotData';
import HeaderToolbar from './components/HeaderToolbar';
import RobotSelectorModal from './components/RobotSelectorModal';
import Robot3DViewport from './components/Robot3DViewport';
import PoseTimeline from './components/PoseTimeline';
import { EmoticonModal, SoundModal } from './components/EmoticonSoundModals';
import MotionPagePanel from './components/MotionPagePanel';
import { FileOpenModal, FileSaveModal } from './components/FileOpenSaveModals';
import RemotePadModal from './components/RemotePadView';
import AiRemoteModal from './components/AiRemoteModal';
import {
  ExpertSelectorModal,
  DxlManagerModal,
  DanceManagerModal
} from './components/ExpertModals';
import {
  SetupModal,
  TutorialModal,
  LoginModal,
  CellStatusModal,
  DeviceConnectModal
} from './components/SystemModals';
import { decryptSensitiveUserData } from './utils/securityCrypto';
import robotSerialService from './utils/robotSerialService';

// 로컬 스토리지 영구 저장 키 상수 (새로고침 시에도 작업한 모션과 파일이 유지되도록 보장)
const STORAGE_KEY_PAGES = 'rmotion_autosave_pages_v1';
const STORAGE_KEY_SAVED_FILES = 'rmotion_saved_files_v1';
const STORAGE_KEY_FILENAME = 'rmotion_current_filename_v1';

export default function App() {
  // 1. 현재 선택된 로봇 상태 (기본값: index 0 '꼭두')
  const [currentRobot, setCurrentRobot] = useState(
    ROBOT_LIST.find((r) => r.index === 0) || ROBOT_LIST[1]
  );

  // 2. 모달 열림/닫힘 상태들 (Step 1 ~ Step 4 전체 모달)
  const [isRobotSelectorOpen, setIsRobotSelectorOpen] = useState(false);
  const [isEmoticonModalOpen, setIsEmoticonModalOpen] = useState(false);
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);
  const [isFileOpenModalOpen, setIsFileOpenModalOpen] = useState(false);
  const [isFileSaveModalOpen, setIsFileSaveModalOpen] = useState(false);

  // Step 4 추가 모달 상태들
  const [isRemotePadOpen, setIsRemotePadOpen] = useState(false);
  const [remotePadInitialMode, setRemotePadInitialMode] = useState('play');
  const [isAiRemoteOpen, setIsAiRemoteOpen] = useState(false);
  const [isExpertSelectorOpen, setIsExpertSelectorOpen] = useState(false);
  const [isDxlManagerOpen, setIsDxlManagerOpen] = useState(false);
  const [isDanceManagerOpen, setIsDanceManagerOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCellStatusModalOpen, setIsCellStatusModalOpen] = useState(false);
  const [deviceConnectModalState, setDeviceConnectModalState] = useState({
    isOpen: false,
    type: 'usb'
  });

  // 3. 모션 페이지(1~30번) 목록 및 Undo/Redo 히스토리 스택 (로컬 스토리지 자동 복원 지원)
  const [motionPages, setMotionPages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PAGES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // 파싱 실패 시 기본 모션 페이지 생성
    }
    return createInitialMotionPages();
  });
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);

  // 클립보드 (포즈 복사본 / 모션 페이지 복사본)
  const [copiedPoseClipboard, setCopiedPoseClipboard] = useState(null);
  const [copiedPageClipboard, setCopiedPageClipboard] = useState(null);

  // 현재 선택된 페이지 번호 (기본: [02] 인사하기) 및 포즈 슬롯 인덱스 (0 ~ 6)
  const [selectedPageNum, setSelectedPageNum] = useState(2);
  const [selectedPoseIdx, setSelectedPoseIdx] = useState(0);

  // 4. 현재 3D 로봇의 실시간 관절 각도 (ID 1 ~ 8) 및 선택된 관절 ID
  const [currentAngles, setCurrentAngles] = useState({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0
  });
  const [selectedJointId, setSelectedJointId] = useState(1);

  // 5. 3D 뷰어, 좌측 도구 및 환경설정 상태
  // [중요 수정]: autoCaptureLink 기본값을 true로 설정하여, 관절을 움직이면 선택된 포즈 슬롯에 즉시 자동 저장되도록 개선!
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMotorIds, setShowMotorIds] = useState(true);
  const [torqueOn, setTorqueOn] = useState(true);
  const [jointTorqueMap, setJointTorqueMap] = useState({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
    8: true
  });
  const [motorLocked, setMotorLocked] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [autoCaptureLink, setAutoCaptureLink] = useState(true);
  const [expandedSideMenu, setExpandedSideMenu] = useState(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [language, setLanguage] = useState('ko');
  const [iconLarge, setIconLarge] = useState(false);
  const [showTooltips, setShowTooltips] = useState(true);
  const [allowStartMotionEdit, setAllowStartMotionEdit] = useState(false);
  const [fileName, setFileName] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_FILENAME) || '000_rtong_default.jmt';
  });

  // 6. 저장된 모션 파일 보관함 목록 (로컬 스토리지 자동 복원 지원)
  const [savedFiles, setSavedFiles] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVED_FILES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // 무시
    }
    return [
      {
        name: '000_rtong.jmt',
        source: 'ROBOT',
        pages: createInitialMotionPages()
      },
      {
        name: '001_dragon.jmt',
        source: 'ROBOT',
        pages: createInitialMotionPages()
      },
      {
        name: '003_commando.jmt',
        source: 'ROBOT',
        pages: createInitialMotionPages()
      },
      {
        name: 'my_custom_dance.jmt',
        source: 'SERVER',
        pages: createInitialMotionPages()
      }
    ];
  });

  // PC 로컬 파일 불러오기용 숨김 file input 참조
  const fileInputRef = useRef(null);

  // 7. 하드웨어 연결(COM5 USB / BLE) 및 보안 암호화 로그인 상태
  const [isConnectedBle, setIsConnectedBle] = useState(false);
  const [isConnectedUsb, setIsConnectedUsb] = useState(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  // 8. 토스트 알림 메시지 상태
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage('');
    }, 2600);
  };

  // [영구 저장 1]: motionPages가 변경될 때마다 로컬 스토리지에 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(motionPages));
    } catch (err) {
      console.warn('모션 페이지 자동 저장 실패:', err);
    }
  }, [motionPages]);

  // [영구 저장 2]: savedFiles 보관함이 변경될 때마다 로컬 스토리지에 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_FILES, JSON.stringify(savedFiles));
    } catch (err) {
      console.warn('파일 보관함 자동 저장 실패:', err);
    }
  }, [savedFiles]);

  // [영구 저장 3]: 현재 파일명 변경 시 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FILENAME, fileName);
    } catch {
      // 무시
    }
  }, [fileName]);

  // 앱 최초 실행 시 암호화되어 저장된 로그인 세션 복원 및 robotSerialService 연결 상태 구독
  useEffect(() => {
    const savedEncrypted = localStorage.getItem('rmotion_encrypted_session');
    if (savedEncrypted) {
      decryptSensitiveUserData(savedEncrypted).then((restoredUser) => {
        if (restoredUser) {
          setUserInfo(restoredUser);
        }
      });
    }

    const unsubSerial = robotSerialService.subscribe((snap) => {
      setIsConnectedUsb(snap.isConnected);
      if (snap.isConnected) {
        setConnectedDeviceName(snap.portName);
      }
    });

    return () => unsubSerial();
  }, []);

  // 현재 선택된 모션 페이지 및 포즈 객체
  const currentPage =
    motionPages.find((p) => p.pageNumber === selectedPageNum) || motionPages[0];
  const currentPose = currentPage.poses[selectedPoseIdx] || currentPage.poses[0];

  // 히스토리를 기록하며 motionPages를 변경하는 헬퍼 함수
  const updateMotionPagesWithHistory = (updater) => {
    setMotionPages((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setHistoryPast((h) => [...h.slice(-24), prev]);
      setHistoryFuture([]);
      return next;
    });
  };

  // 현재 선택된 페이지 & 포즈 슬롯에 관절 각도를 즉시 기록하는 헬퍼 함수
  const writeAnglesToSelectedPose = (anglesObj, targetPageNum = selectedPageNum, targetPoseIdx = selectedPoseIdx) => {
    setMotionPages((prevPages) =>
      prevPages.map((page) => {
        if (page.pageNumber !== targetPageNum) return page;
        const nextPoses = page.poses.map((ps, idx) =>
          idx === targetPoseIdx
            ? { ...ps, active: true, angles: { ...anglesObj } }
            : ps
        );
        return {
          ...page,
          name: page.name || `noname_${String(page.pageNumber).padStart(2, '0')}`,
          poses: nextPoses
        };
      })
    );
  };

  // 실행 취소 (Undo)
  const handleUndo = () => {
    if (historyPast.length === 0) {
      showToast('더 이상 실행 취소할 내역이 없습니다.');
      return;
    }
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((h) => h.slice(0, -1));
    setHistoryFuture((f) => [motionPages, ...f]);
    setMotionPages(previous);
    showToast('실행 취소(Undo) 완료');
  };

  // 다시 실행 (Redo)
  const handleRedo = () => {
    if (historyFuture.length === 0) {
      showToast('더 이상 다시 실행할 내역이 없습니다.');
      return;
    }
    const next = historyFuture[0];
    setHistoryFuture((f) => f.slice(1));
    setHistoryPast((h) => [...h, motionPages]);
    setMotionPages(next);
    showToast('다시 실행(Redo) 완료');
  };

  // 최신 motionPages 및 speedMultiplier를 모션 재생 타이머 내부에서 항상 정확히 참조하기 위한 Ref
  const motionPagesRef = useRef(motionPages);
  const speedMultiplierRef = useRef(speedMultiplier);

  useEffect(() => {
    motionPagesRef.current = motionPages;
  }, [motionPages]);

  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);

  // 특정 번호의 모션 페이지를 선택하고 즉시 연속 재생하는 헬퍼 (리모컨 / AI 리모컨 / 댄스 매니저 공용)
  const handleRunSpecificMotionPage = (pageNum) => {
    setIsPlaying(false);
    setSelectedPageNum(pageNum);
    setSelectedPoseIdx(0);

    const targetPage = motionPagesRef.current.find((p) => p.pageNumber === pageNum);
    const hasActivePoses = targetPage?.poses?.some((ps) => ps.active);

    if (hasActivePoses) {
      // 웹 에디터에 포즈가 정의된 모션 페이지는 실시간 8축 동기 제어(Addr 600)로 즉시 실행
      setTimeout(() => {
        setIsPlaying(true);
      }, 40);
    } else if (robotSerialService.isConnected) {
      // 웹 에디터에 포즈가 없는 번호는 로봇 플래시 내장 모션(Addr 66) 호출
      robotSerialService.playMotionOnController(pageNum);
      showToast(`🤖 로봇 하드웨어 내장 모션 [#${pageNum}] 재생 명령을 전송했습니다.`);
    }
  };

  // 키보드 단축키 (F1: 툴팁 토글, F2: 3D 자동회전 토글, Ctrl+Z: Undo, Ctrl+Y: Redo, Ctrl+S: 저장)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'F1') {
        e.preventDefault();
        setShowTooltips((prev) => {
          showToast(`안내문구(툴팁) 표시: ${!prev ? 'ON' : 'OFF'}`);
          return !prev;
        });
      } else if (e.key === 'F2') {
        e.preventDefault();
        setAutoRotate((prev) => {
          showToast(`3D 자동 회전(F2): ${!prev ? 'ON' : 'OFF'}`);
          return !prev;
        });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsFileSaveModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // 모션 연속 재생(Play) 타이머 이펙트 (실제 COM5 로봇 모터 동기화 & 효과음 연동 포함)
  useEffect(() => {
    if (!isPlaying) return undefined;

    const latestPages = motionPagesRef.current;
    const targetPage =
      latestPages.find((p) => p.pageNumber === selectedPageNum) || latestPages[0];
    const activePoseIndices = targetPage.poses
      .map((p, idx) => (p.active ? idx : -1))
      .filter((idx) => idx !== -1);

    if (activePoseIndices.length === 0) {
      setIsPlaying(false);
      if (robotSerialService.isConnected) {
        robotSerialService.playMotionOnController(selectedPageNum);
        showToast(`🤖 로봇 내장 모션 [#${selectedPageNum}]을 실행합니다.`);
      } else {
        showToast('현재 모션 페이지에 저장된 포즈가 없습니다.');
      }
      return undefined;
    }

    let stepCursor = 0;
    let timerId = null;

    const runStep = () => {
      const currentPages = motionPagesRef.current;
      const pageNow =
        currentPages.find((p) => p.pageNumber === selectedPageNum) || targetPage;
      const poseIdx = activePoseIndices[stepCursor];
      const poseData = pageNow.poses[poseIdx] || targetPage.poses[poseIdx];

      setSelectedPoseIdx(poseIdx);
      setCurrentAngles({ ...poseData.angles });

      const currentSpeed = speedMultiplierRef.current || 1.0;
      const playTimeMs = Math.max(
        140,
        Math.round((Number(poseData.playTime || 0.6) * 1000) / currentSpeed)
      );
      const pauseTimeMs = Math.max(
        0,
        Math.round((Number(poseData.pauseTime || 0) * 1000) / currentSpeed)
      );
      const totalStepMs = playTimeMs + pauseTimeMs;

      // [COM5 하드웨어 실시간 연동]: 연결된 실제 로봇 모터들을 playTimeMs 동안 부드럽게 이동!
      if (robotSerialService.isConnected) {
        robotSerialService.sendMotorAngles(poseData.angles, playTimeMs, 0);
      }

      // 포즈에 효과음(사운드)이 지정되어 있으면 재생
      if (poseData.sound) {
        playSynthesizedSound(poseData.sound);
      }

      stepCursor += 1;
      if (stepCursor < activePoseIndices.length) {
        timerId = setTimeout(runStep, totalStepMs);
      } else {
        timerId = setTimeout(() => {
          // Next 연결 모션이 설정되어 있고 자기 자신이 아니면 이어서 재생
          if (
            pageNow.nextPage > 0 &&
            pageNow.nextPage !== pageNow.pageNumber
          ) {
            setSelectedPageNum(pageNow.nextPage);
            showToast(
              `Next 연결 모션 [${pageNow.nextPage}]번으로 이어서 재생합니다.`
            );
          } else {
            setIsPlaying(false);
            showToast(
              `[${selectedPageNum}] ${pageNow.name || '모션'} 재생 완료`
            );
          }
        }, totalStepMs);
      }
    };

    runStep();
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isPlaying, selectedPageNum]);

  // 관절 각도 변경 핸들러 (3D 드래그, 번호 배지 드래그, 슬라이더, DXL 매니저 공용)
  const handleChangeJointAngle = (jointId, nextAngle) => {
    setSelectedJointId(jointId);
    setCurrentAngles((prev) => {
      const updatedAngles = { ...prev, [jointId]: nextAngle };

      // 자동 캡처 링크가 켜져 있으면 선택된 포즈 슬롯에 즉시 반영 및 페이지 활성화
      if (autoCaptureLink) {
        writeAnglesToSelectedPose(updatedAngles, selectedPageNum, selectedPoseIdx);
      }

      // 실제 COM5 로봇이 연결되어 있으면 실시간으로 모터 목표 위치 전송
      if (robotSerialService.isConnected) {
        robotSerialService.sendMotorAngles(updatedAngles, 90, 45);
      }

      return updatedAngles;
    });
  };

  // 로봇 변경 핸들러
  const handleSelectRobot = (robot) => {
    setCurrentRobot(robot);
    setCurrentAngles({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 });
    showToast(`'${robot.nameKo} (${robot.controller})' 3D 로봇이 로드되었습니다.`);
  };

  // 포즈 슬롯(1~7) 클릭 핸들러
  const handleSelectPose = (idx) => {
    setSelectedPoseIdx(idx);
    const targetPose = currentPage.poses[idx];
    if (targetPose && targetPose.active) {
      setCurrentAngles({ ...targetPose.angles });
      if (robotSerialService.isConnected) {
        robotSerialService.sendMotorAngles(targetPose.angles, 250, 0);
      }
    }
  };

  // 좌측 툴바: [자세 캡처]
  // - 만약 COM5 로봇이 연결되어 있고 토크가 OFF 상태라면(사용자가 손으로 로봇 관절을 꺾어 만든 자세),
  //   실제 로봇 모터의 현재 각도(SyncRead)를 읽어와 캡처합니다!
  const handleCapturePose = async () => {
    let anglesToSave = { ...currentAngles };

    if (robotSerialService.isConnected && !torqueOn) {
      const hwAngles = await robotSerialService.readMotorAngles([1, 2, 3, 4, 5, 6, 7, 8]);
      if (hwAngles) {
        anglesToSave = { ...anglesToSave, ...hwAngles };
        setCurrentAngles(anglesToSave);
      }
    }

    updateMotionPagesWithHistory((prevPages) =>
      prevPages.map((page) => {
        if (page.pageNumber !== selectedPageNum) return page;
        const nextPoses = page.poses.map((pose, idx) => {
          if (idx !== selectedPoseIdx) return pose;
          return {
            ...pose,
            active: true,
            angles: { ...anglesToSave }
          };
        });
        return {
          ...page,
          name: page.name || `noname_${String(page.pageNumber).padStart(2, '0')}`,
          poses: nextPoses
        };
      })
    );

    if (robotSerialService.isConnected && torqueOn) {
      robotSerialService.sendMotorAngles(anglesToSave, 180, 0);
    }

    showToast(
      `✅ 페이지 [${selectedPageNum}]의 ${selectedPoseIdx + 1}번 포즈에 자세가 저장되었습니다.`
    );
  };

  // 좌측 툴바: [초기 자세]
  const handleResetDefaultPose = () => {
    const baseAngles = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
    setCurrentAngles(baseAngles);
    if (autoCaptureLink) {
      writeAnglesToSelectedPose(baseAngles);
    }
    if (robotSerialService.isConnected) {
      robotSerialService.sendMotorAngles(baseAngles, 300, 0);
    }
    showToast('3D 로봇을 초기 자세(차렷)로 이동 및 저장했습니다.');
  };

  // 좌측 툴바: [좌/우 동일 복사]
  const handleCopyLeftRight = () => {
    setCurrentAngles((prev) => {
      const next = {
        ...prev,
        2: -prev[1],
        4: -prev[3],
        6: -prev[5],
        8: -prev[7]
      };
      if (autoCaptureLink) {
        writeAnglesToSelectedPose(next);
      }
      if (robotSerialService.isConnected) {
        robotSerialService.sendMotorAngles(next, 200, 0);
      }
      return next;
    });
    showToast('로봇의 좌/우 대칭 관절 자세를 동일하게 복사 및 저장했습니다.');
  };

  // 좌측 툴바: [좌/우 대칭 반전(Mirror)]
  const handleMirrorPose = () => {
    setCurrentAngles((prev) => {
      const next = {
        1: -prev[2],
        2: -prev[1],
        3: -prev[4],
        4: -prev[3],
        5: -prev[6],
        6: -prev[5],
        7: -prev[8],
        8: -prev[7]
      };
      if (autoCaptureLink) {
        writeAnglesToSelectedPose(next);
      }
      if (robotSerialService.isConnected) {
        robotSerialService.sendMotorAngles(next, 200, 0);
      }
      return next;
    });
    showToast('로봇의 좌/우 자세를 대칭 반전(Mirror) 및 저장했습니다.');
  };

  // ==========================================================================
  // [포즈(Pose) 편집 핸들러 모음]
  // ==========================================================================
  const handleUpdatePoseTime = (poseIdx, updates) => {
    updateMotionPagesWithHistory((prev) =>
      prev.map((page) => {
        if (page.pageNumber !== selectedPageNum) return page;
        const nextPoses = page.poses.map((ps, idx) =>
          idx === poseIdx ? { ...ps, active: true, ...updates } : ps
        );
        return {
          ...page,
          name: page.name || `noname_${String(page.pageNumber).padStart(2, '0')}`,
          poses: nextPoses
        };
      })
    );
  };

  const handleCopyPose = (poseIdx) => {
    const target = currentPage.poses[poseIdx];
    setCopiedPoseClipboard({
      ...target,
      angles: { ...target.angles }
    });
    showToast(`포즈 #${poseIdx + 1} 데이터를 복사했습니다.`);
  };

  const handlePastePose = (poseIdx, isMirror = false) => {
    if (!copiedPoseClipboard) {
      showToast('먼저 복사한 포즈가 없습니다.');
      return;
    }
    const srcAngles = copiedPoseClipboard.angles;
    const finalAngles = isMirror
      ? {
          1: -srcAngles[2],
          2: -srcAngles[1],
          3: -srcAngles[4],
          4: -srcAngles[3],
          5: -srcAngles[6],
          6: -srcAngles[5],
          7: -srcAngles[8],
          8: -srcAngles[7]
        }
      : { ...srcAngles };

    updateMotionPagesWithHistory((prev) =>
      prev.map((page) => {
        if (page.pageNumber !== selectedPageNum) return page;
        const nextPoses = page.poses.map((ps, idx) =>
          idx === poseIdx
            ? {
                ...copiedPoseClipboard,
                slotIndex: idx,
                active: true,
                angles: finalAngles
              }
            : ps
        );
        return {
          ...page,
          name: page.name || `noname_${String(page.pageNumber).padStart(2, '0')}`,
          poses: nextPoses
        };
      })
    );
    setCurrentAngles(finalAngles);
    if (robotSerialService.isConnected) {
      robotSerialService.sendMotorAngles(finalAngles, 200, 0);
    }
    showToast(
      `포즈 #${poseIdx + 1}에 ${isMirror ? '대칭(Mirror) ' : ''}붙여넣기 완료`
    );
  };

  const handleDeletePose = (poseIdx) => {
    updateMotionPagesWithHistory((prev) =>
      prev.map((page) => {
        if (page.pageNumber !== selectedPageNum) return page;
        const nextPoses = page.poses.map((ps, idx) =>
          idx === poseIdx
            ? { ...ps, active: false, emoticon: null, sound: null }
            : ps
        );
        return { ...page, poses: nextPoses };
      })
    );
    showToast(`포즈 #${poseIdx + 1} 데이터를 지웠습니다.`);
  };

  const handleMovePose = (poseIdx, dir) => {
    const targetIdx = poseIdx + dir;
    if (targetIdx < 0 || targetIdx > 6) {
      showToast('이동할 수 없는 위치입니다.');
      return;
    }
    updateMotionPagesWithHistory((prev) =>
      prev.map((page) => {
        if (page.pageNumber !== selectedPageNum) return page;
        const cloned = page.poses.map((p) => ({ ...p, angles: { ...p.angles } }));
        const temp = cloned[poseIdx];
        cloned[poseIdx] = { ...cloned[targetIdx], slotIndex: poseIdx };
        cloned[targetIdx] = { ...temp, slotIndex: targetIdx };
        return { ...page, poses: cloned };
      })
    );
    setSelectedPoseIdx(targetIdx);
    showToast(`포즈 #${poseIdx + 1} ↔ #${targetIdx + 1} 위치를 이동했습니다.`);
  };

  // ==========================================================================
  // [파일 가져오기(Import) / 내보내기(Export) 핸들러]
  // ==========================================================================
  const handleExportMotionFile = (exportName = fileName) => {
    const payload = {
      version: '01.05.21',
      robotIndex: currentRobot.index,
      robotName: currentRobot.nameKo,
      fileName: exportName,
      exportedAt: new Date().toISOString(),
      motionPages
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      exportName.endsWith('.jmt') || exportName.endsWith('.json')
        ? exportName
        : `${exportName}.jmt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`💾 '${a.download}' 모션 파일을 PC로 내보냈습니다.`);
  };

  const handleImportFileChange = (e) => {
    const file = e.dataTransfer ? e.dataTransfer.files?.[0] : e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const importedPages = Array.isArray(parsed.motionPages)
          ? parsed.motionPages
          : Array.isArray(parsed.pages)
          ? parsed.pages
          : null;
        if (importedPages) {
          updateMotionPagesWithHistory(importedPages);
          setFileName(file.name);
          showToast(`📂 '${file.name}' 모션 파일을 성공적으로 불러왔습니다.`);
        } else {
          showToast('유효한 R-Motion 모션 파일 형식이 아닙니다.');
        }
      } catch {
        showToast('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
    <div
      className="rm-app-container"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer?.files?.[0];
        if (droppedFile) {
          handleImportFileChange({ target: { files: [droppedFile] } });
        }
      }}
    >
      {/* 숨김 파일 선택기 (.jmt / .json 가져오기용) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jmt,.json"
        style={{ display: 'none' }}
        onChange={handleImportFileChange}
      />

      {/* ==================== 1. 상단 고정 툴바 및 우측 메뉴 ==================== */}
      <HeaderToolbar
        currentRobot={currentRobot}
        isPlaying={isPlaying}
        isConnectedBle={isConnectedBle}
        isConnectedUsb={isConnectedUsb}
        userInfo={userInfo}
        showTooltips={showTooltips}
        onTogglePlay={() => {
          setIsPlaying((prev) => {
            const next = !prev;
            if (!next && robotSerialService.isConnected) {
              robotSerialService.stopMotionOnController();
            }
            return next;
          });
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDelete={() => handleDeletePose(selectedPoseIdx)}
        onOpenRobotSelector={() => setIsRobotSelectorOpen(true)}
        onConnectUsb={() =>
          setDeviceConnectModalState({ isOpen: true, type: 'usb' })
        }
        onConnectBle={() =>
          setDeviceConnectModalState({ isOpen: true, type: 'ble' })
        }
        onDisconnectDevice={async () => {
          await robotSerialService.disconnect();
          setIsConnectedBle(false);
          setIsConnectedUsb(false);
          setConnectedDeviceName('');
          showToast('🔌 로봇과의 통신 연결이 안전하게 해제되었습니다.');
        }}
        onOpenModal={(modalType) => {
          if (modalType === 'open') setIsFileOpenModalOpen(true);
          else if (modalType === 'save') setIsFileSaveModalOpen(true);
          else if (modalType === 'tutorial') setIsTutorialModalOpen(true);
          else if (modalType === 'setup') setIsSetupModalOpen(true);
          else if (modalType === 'aiRemote') setIsAiRemoteOpen(true);
          else if (modalType === 'expert') setIsExpertSelectorOpen(true);
          else if (modalType === 'login') setIsLoginModalOpen(true);
          else if (modalType === 'cell') setIsCellStatusModalOpen(true);
          else if (modalType === 'logout') {
            localStorage.removeItem('rmotion_encrypted_session');
            setUserInfo(null);
            showToast('안전하게 로그아웃되었습니다.');
          }
        }}
        onNewProject={() => {
          updateMotionPagesWithHistory(createInitialMotionPages());
          setFileName('new_motion.jmt');
          showToast('새 모션 프로젝트를 생성했습니다.');
        }}
        onImportJson={() => fileInputRef.current?.click()}
        onExportJson={() => handleExportMotionFile(fileName)}
        onShowToast={showToast}
      />

      {/* ==================== 2. 메인 코딩 워크스페이스 (.coding) ==================== */}
      <main id="coding" className="rm-workspace">
        {/* 좌측 + 중앙(3D 뷰어 & 하단 7포즈 타임라인) 영역 */}
        <section id="coding_left" className="rm-coding-left">
          {/* ---------- 좌측 수직 아이콘 도구 모음 (#tool_side) ---------- */}
          <aside
            id="tool_side"
            className={`rm-tool-side ${iconLarge ? 'large' : ''}`}
          >
            {/* 1) 자세 캡처 (Capture) */}
            <div
              className={`rm-tool-box ${autoCaptureLink ? 'active' : ''}`}
              title={
                showTooltips
                  ? '현재 3D(또는 토크 OFF 로봇)의 자세를 저장합니다. (우클릭: 수동/자동 저장 모드 전환)'
                  : ''
              }
              onClick={handleCapturePose}
              onContextMenu={(e) => {
                e.preventDefault();
                setExpandedSideMenu((prev) =>
                  prev === 'capture' ? null : 'capture'
                );
              }}
            >
              <div className="rm-tool-tri" />
              <img
                src={
                  autoCaptureLink
                    ? `${RMOTION_BASE_URL}/img/ico_screenshot_link.png`
                    : `${RMOTION_BASE_URL}/img/ico_screenshot.png`
                }
                alt="자세 캡처"
              />
              {expandedSideMenu === 'capture' && (
                <div
                  style={{
                    position: 'absolute',
                    left: '57px',
                    top: 0,
                    display: 'flex',
                    background: '#fff',
                    border: '1px solid #d0dae3',
                    zIndex: 50,
                    boxShadow: '4px 4px 12px rgba(0,0,0,0.12)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="rm-tool-box"
                    title="버튼을 누를 때만 로봇의 자세를 저장합니다."
                    onClick={() => {
                      setAutoCaptureLink(false);
                      setExpandedSideMenu(null);
                      showToast('수동 캡처 모드로 설정되었습니다.');
                    }}
                  >
                    <img
                      src={`${RMOTION_BASE_URL}/img/ico_screenshot.png`}
                      alt="수동 캡처"
                    />
                  </div>
                  <div
                    className="rm-tool-box"
                    title="3D 관절 조절 시 자세를 자동으로 선택된 포즈에 저장합니다."
                    onClick={() => {
                      setAutoCaptureLink(true);
                      setExpandedSideMenu(null);
                      showToast('자동 링크 캡처 모드가 활성화되었습니다.');
                    }}
                  >
                    <img
                      src={`${RMOTION_BASE_URL}/img/ico_screenshot_link.png`}
                      alt="자동 캡처"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2) 초기 자세 (Base Pose) */}
            <div
              className="rm-tool-box"
              title={showTooltips ? '로봇을 초기 자세(차렷)로 이동시킵니다.' : ''}
              onClick={handleResetDefaultPose}
            >
              <div className="rm-tool-tri" />
              <img
                src={`${RMOTION_BASE_URL}/img/ico_basepose.png`}
                alt="초기 자세"
              />
            </div>

            {/* 3) 좌/우 복사 (Pose Copy) */}
            <div
              className="rm-tool-box"
              title={showTooltips ? '로봇의 자세를 좌/우 동일하게 복사합니다.' : ''}
              onClick={handleCopyLeftRight}
            >
              <img
                src={`${RMOTION_BASE_URL}/img/ico_posecopy.png`}
                alt="자세 복사"
              />
            </div>

            {/* 4) 좌/우 대칭 미러 (Pose Mirror) */}
            <div
              className="rm-tool-box"
              title={showTooltips ? '로봇의 좌/우 자세를 서로 바꿔줍니다.' : ''}
              onClick={handleMirrorPose}
            >
              <img
                src={`${RMOTION_BASE_URL}/img/ico_posemirror.png`}
                alt="자세 미러"
              />
            </div>

            {/* 5) 무선 리모컨/조이스틱 화면 전환 (좌클릭: 조종모드, 우클릭: 조종/단축키 편집 선택) */}
            <div
              className="rm-tool-box"
              title={
                showTooltips
                  ? '가상 게임패드 리모컨을 엽니다. (우클릭: 조종 / 단축키 편집 선택)'
                  : ''
              }
              onClick={() => {
                setRemotePadInitialMode('play');
                setIsRemotePadOpen(true);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setExpandedSideMenu((prev) =>
                  prev === 'remote' ? null : 'remote'
                );
              }}
            >
              <div className="rm-tool-tri" />
              <img
                src={`${RMOTION_BASE_URL}/img/ico_pad.png`}
                alt="리모컨"
              />
              {expandedSideMenu === 'remote' && (
                <div
                  style={{
                    position: 'absolute',
                    left: '57px',
                    top: 0,
                    display: 'flex',
                    background: '#fff',
                    border: '1px solid #d0dae3',
                    zIndex: 50,
                    boxShadow: '4px 4px 12px rgba(0,0,0,0.12)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="rm-tool-box"
                    title="가상 게임패드로 로봇을 조종합니다."
                    onClick={() => {
                      setExpandedSideMenu(null);
                      setRemotePadInitialMode('play');
                      setIsRemotePadOpen(true);
                    }}
                  >
                    <img
                      src={`${RMOTION_BASE_URL}/img/ico_pad.png`}
                      alt="리모컨 조종"
                    />
                  </div>
                  <div
                    className="rm-tool-box"
                    title="게임패드 버튼별 실행 모션 단축키를 편집합니다."
                    onClick={() => {
                      setExpandedSideMenu(null);
                      setRemotePadInitialMode('edit');
                      setIsRemotePadOpen(true);
                    }}
                  >
                    <img
                      src={`${RMOTION_BASE_URL}/img/ico_pad_edit.png`}
                      alt="리모컨 편집"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 6) 전체 토크 On/Off 토글 (실제 COM5 로봇 모터 토크와 실시간 연동) */}
            <div
              className="rm-tool-box"
              title={showTooltips ? '전체 모터 토크를 On/Off 합니다.' : ''}
              onClick={() => {
                const next = !torqueOn;
                setTorqueOn(next);
                setJointTorqueMap({
                  1: next,
                  2: next,
                  3: next,
                  4: next,
                  5: next,
                  6: next,
                  7: next,
                  8: next
                });
                if (robotSerialService.isConnected) {
                  robotSerialService.setTorque(next, 254);
                }
                showToast(
                  `전체 모터 토크가 ${next ? 'ON (잠금)' : 'OFF (손으로 조작 가능)'} 되었습니다.`
                );
              }}
            >
              <img
                src={
                  torqueOn
                    ? `${RMOTION_BASE_URL}/img/ico_torqueon.png`
                    : `${RMOTION_BASE_URL}/img/ico_torqueoff.png`
                }
                alt="토크 스위치"
              />
            </div>
          </aside>

          {/* ---------- 중앙 Three.js 3D 로봇 뷰어 (#webgl-output) ---------- */}
          <Robot3DViewport
            currentRobot={currentRobot}
            currentAngles={currentAngles}
            selectedJointId={selectedJointId}
            showMotorIds={showMotorIds}
            torqueOn={torqueOn}
            jointTorqueMap={jointTorqueMap}
            motorLocked={motorLocked}
            autoRotate={autoRotate}
            speedMultiplier={speedMultiplier}
            showTooltips={showTooltips}
            onSelectJoint={(id) => setSelectedJointId(id)}
            onChangeJointAngle={handleChangeJointAngle}
            onToggleMotorIds={() => {
              setShowMotorIds((prev) => !prev);
              showToast(`모터 ID 표시: ${!showMotorIds ? 'ON' : 'OFF'}`);
            }}
            onToggleMotorLock={() => {
              setMotorLocked((prev) => !prev);
              showToast(
                !motorLocked
                  ? '3D 관절 드래그 잠금 설정됨 (카메라 회전 전용)'
                  : '3D 관절 드래그 잠금 해제됨'
              );
            }}
            onToggleJointTorque={(id) => {
              setJointTorqueMap((prev) => {
                const nextVal = !prev[id];
                if (robotSerialService.isConnected) {
                  robotSerialService.setTorque(nextVal, id);
                }
                showToast(`모터 [ID:${id}] 토크 ${nextVal ? 'ON' : 'OFF'}`);
                return { ...prev, [id]: nextVal };
              });
            }}
            onChangeSpeedMultiplier={(val) => {
              setSpeedMultiplier(val);
              showToast(`재생 배속: ${val}배속`);
            }}
            onCopyFrom3D={handleCapturePose}
            onMirrorSelectedJoint={() => {
              const jMeta = STANDARD_8DOF_JOINTS.find(
                (j) => j.id === selectedJointId
              );
              if (!jMeta) return;
              const mId = jMeta.mirrorId;
              setCurrentAngles((prev) => {
                const next = {
                  ...prev,
                  [selectedJointId]: -prev[mId],
                  [mId]: -prev[selectedJointId]
                };
                if (autoCaptureLink) {
                  writeAnglesToSelectedPose(next);
                }
                if (robotSerialService.isConnected) {
                  robotSerialService.sendMotorAngles(next, 150, 0);
                }
                return next;
              });
              showToast(
                `ID:${selectedJointId} ↔ ID:${mId} 관절 각도를 서로 반전했습니다.`
              );
            }}
            onCopySelectedJointToMirror={() => {
              const jMeta = STANDARD_8DOF_JOINTS.find(
                (j) => j.id === selectedJointId
              );
              if (!jMeta) return;
              const mId = jMeta.mirrorId;
              setCurrentAngles((prev) => {
                const next = {
                  ...prev,
                  [mId]: -prev[selectedJointId]
                };
                if (autoCaptureLink) {
                  writeAnglesToSelectedPose(next);
                }
                if (robotSerialService.isConnected) {
                  robotSerialService.sendMotorAngles(next, 150, 0);
                }
                return next;
              });
              showToast(
                `ID:${selectedJointId} 각도를 대칭 관절(ID:${mId})로 복사했습니다.`
              );
            }}
            onShowToast={showToast}
          />

          {/* ---------- 하단 7단계 자세(Pose) 타임라인 (#uipose) ---------- */}
          <PoseTimeline
            poses={currentPage.poses}
            selectedPoseIdx={selectedPoseIdx}
            showTooltips={showTooltips}
            onSelectPose={handleSelectPose}
            onUpdatePoseTime={handleUpdatePoseTime}
            onCopyPose={handleCopyPose}
            onPastePose={handlePastePose}
            onDeletePose={handleDeletePose}
            onMovePose={handleMovePose}
            onOpenEmoticonModal={(idx) => {
              setSelectedPoseIdx(idx);
              setIsEmoticonModalOpen(true);
            }}
            onOpenSoundModal={(idx) => {
              setSelectedPoseIdx(idx);
              setIsSoundModalOpen(true);
            }}
          />
        </section>

        {/* ==================== 3. 우측 모션 페이지 리스트 및 [Memory] 병합 패널 ==================== */}
        <MotionPagePanel
          motionPages={motionPages}
          selectedPageNum={selectedPageNum}
          fileName={fileName}
          showTooltips={showTooltips}
          onSelectPage={(pageNum) => {
            setSelectedPageNum(pageNum);
            setSelectedPoseIdx(0);
            const target = motionPages.find((p) => p.pageNumber === pageNum);
            if (target?.poses?.[0]?.active) {
              setCurrentAngles({ ...target.poses[0].angles });
              if (robotSerialService.isConnected) {
                robotSerialService.sendMotorAngles(target.poses[0].angles, 250, 0);
              }
            }
          }}
          onPlayPage={(pageNum) => {
            handleRunSpecificMotionPage(pageNum);
          }}
          onRenamePage={(pageNum, newName) => {
            updateMotionPagesWithHistory((prev) =>
              prev.map((p) =>
                p.pageNumber === pageNum ? { ...p, name: newName } : p
              )
            );
            showToast(
              `[${pageNum}]번 모션 이름을 '${newName}'(으)로 변경했습니다.`
            );
          }}
          onCopyPage={(pageNum) => {
            const target = motionPages.find((p) => p.pageNumber === pageNum);
            if (!target) return;
            setCopiedPageClipboard({
              ...target,
              poses: target.poses.map((ps) => ({
                ...ps,
                angles: { ...ps.angles }
              }))
            });
            showToast(`[${pageNum}]번 모션 페이지를 복사했습니다.`);
          }}
          onPastePage={(pageNum) => {
            if (!copiedPageClipboard) {
              showToast('먼저 복사한 모션 페이지가 없습니다.');
              return;
            }
            updateMotionPagesWithHistory((prev) =>
              prev.map((p) =>
                p.pageNumber === pageNum
                  ? {
                      ...p,
                      name: copiedPageClipboard.name || `copy_${pageNum}`,
                      nextPage: copiedPageClipboard.nextPage,
                      exitPage: copiedPageClipboard.exitPage,
                      poses: copiedPageClipboard.poses.map((ps) => ({
                        ...ps,
                        angles: { ...ps.angles }
                      }))
                    }
                  : p
              )
            );
            showToast(`[${pageNum}]번 슬롯에 모션 페이지를 붙여넣었습니다.`);
          }}
          onDeletePage={(pageNum) => {
            if (pageNum === 1 && !allowStartMotionEdit) {
              showToast(
                '시작 모션(1번)은 보호되어 있습니다. [설정]에서 편집 허용을 켜주세요.'
              );
              return;
            }
            updateMotionPagesWithHistory((prev) =>
              prev.map((p) =>
                p.pageNumber === pageNum
                  ? {
                      ...p,
                      name: '',
                      nextPage: 0,
                      exitPage: 0,
                      poses: createDefaultPoses([])
                    }
                  : p
              )
            );
            showToast(`[${pageNum}]번 모션 페이지를 초기화했습니다.`);
          }}
          onUpdatePageLinks={(pageNum, linkUpdates) => {
            updateMotionPagesWithHistory((prev) =>
              prev.map((p) =>
                p.pageNumber === pageNum ? { ...p, ...linkUpdates } : p
              )
            );
            showToast(`[${pageNum}]번 모션 연결 설정이 저장되었습니다.`);
          }}
          onMergePageFromMemory={(targetPageNum, memoryPageData) => {
            updateMotionPagesWithHistory((prev) =>
              prev.map((p) =>
                p.pageNumber === targetPageNum
                  ? {
                      ...p,
                      name: memoryPageData.name || `merged_${targetPageNum}`,
                      nextPage: memoryPageData.nextPage,
                      exitPage: memoryPageData.exitPage,
                      poses: memoryPageData.poses.map((ps) => ({
                        ...ps,
                        angles: { ...ps.angles }
                      }))
                    }
                  : p
              )
            );
            showToast(
              `[Memory]의 모션을 현재 [${targetPageNum}]번 슬롯으로 병합했습니다.`
            );
          }}
          onNewMotionList={() => {
            updateMotionPagesWithHistory(createInitialMotionPages());
            showToast('모션 리스트가 기본 상태로 초기화되었습니다.');
          }}
          onOpenFileModal={() => setIsFileOpenModalOpen(true)}
          onSaveFileModal={() => setIsFileSaveModalOpen(true)}
          onShowToast={showToast}
        />
      </main>

      {/* ==================== 4. 전체 모달 그룹 ==================== */}
      {/* 1) 로봇 선택 모달 */}
      <RobotSelectorModal
        isOpen={isRobotSelectorOpen}
        currentRobot={currentRobot}
        onSelectRobot={handleSelectRobot}
        onClose={() => setIsRobotSelectorOpen(false)}
      />

      {/* 2) 포즈별 이모티콘(표정) 선택 모달 */}
      <EmoticonModal
        isOpen={isEmoticonModalOpen}
        poseIdx={selectedPoseIdx}
        currentEmoticon={currentPose?.emoticon}
        defaultGroupId={currentRobot?.emoticonGroup}
        onSaveEmoticon={(emoticonData) => {
          handleUpdatePoseTime(selectedPoseIdx, { emoticon: emoticonData });
          showToast(
            `포즈 #${selectedPoseIdx + 1}에 '${emoticonData.label}' 표정이 설정되었습니다.`
          );
        }}
        onDeleteEmoticon={() => {
          handleUpdatePoseTime(selectedPoseIdx, { emoticon: null });
          showToast(`포즈 #${selectedPoseIdx + 1}의 표정을 삭제했습니다.`);
        }}
        onClose={() => setIsEmoticonModalOpen(false)}
      />

      {/* 3) 포즈별 효과음(소리) 선택 모달 */}
      <SoundModal
        isOpen={isSoundModalOpen}
        poseIdx={selectedPoseIdx}
        currentSound={currentPose?.sound}
        onSaveSound={(soundData) => {
          handleUpdatePoseTime(selectedPoseIdx, { sound: soundData });
          showToast(
            `포즈 #${selectedPoseIdx + 1}에 '${soundData.name}' 효과음이 설정되었습니다.`
          );
        }}
        onDeleteSound={() => {
          handleUpdatePoseTime(selectedPoseIdx, { sound: null });
          showToast(`포즈 #${selectedPoseIdx + 1}의 효과음을 삭제했습니다.`);
        }}
        onClose={() => setIsSoundModalOpen(false)}
      />

      {/* 4) 모션 파일 열기 모달 */}
      <FileOpenModal
        isOpen={isFileOpenModalOpen}
        savedFiles={savedFiles}
        onLoadFile={(file) => {
          updateMotionPagesWithHistory(
            file.pages.map((p) => ({
              ...p,
              poses: p.poses.map((ps) => ({ ...ps, angles: { ...ps.angles } }))
            }))
          );
          setFileName(file.name);
          showToast(`📂 '${file.name}' 파일을 열었습니다.`);
        }}
        onDeleteSavedFile={(targetName) => {
          setSavedFiles((prev) => prev.filter((f) => f.name !== targetName));
          showToast(`'${targetName}' 파일을 보관함에서 삭제했습니다.`);
        }}
        onTriggerLocalImport={() => fileInputRef.current?.click()}
        onClose={() => setIsFileOpenModalOpen(false)}
      />

      {/* 5) 모션 파일 저장 모달 */}
      <FileSaveModal
        isOpen={isFileSaveModalOpen}
        currentFileName={fileName}
        savedFiles={savedFiles}
        onSaveFile={(newFileName, saveTargetTab) => {
          setFileName(newFileName);

          // 보관함(savedFiles) 및 로컬 스토리지에 항상 최신 motionPages 복사본을 저장
          const clonedPages = motionPages.map((p) => ({
            ...p,
            poses: p.poses.map((ps) => ({
              ...ps,
              angles: { ...ps.angles }
            }))
          }));

          setSavedFiles((prev) => {
            const filtered = prev.filter((f) => f.name !== newFileName);
            return [
              ...filtered,
              {
                name: newFileName,
                source: saveTargetTab === 'ROBOT' ? 'ROBOT' : 'SERVER',
                pages: clonedPages
              }
            ];
          });

          if (saveTargetTab === 'FILE') {
            handleExportMotionFile(newFileName);
          } else {
            showToast(
              `💾 '${newFileName}' 모션 파일이 [${
                saveTargetTab === 'ROBOT' ? '로봇 메모리' : '보관함'
              }]에 성공적으로 저장되었습니다!`
            );
          }
        }}
        onClose={() => setIsFileSaveModalOpen(false)}
      />

      {/* 6) 가상 게임패드 리모컨 조종 및 단축키 편집 모달 */}
      <RemotePadModal
        isOpen={isRemotePadOpen}
        initialMode={remotePadInitialMode}
        motionPages={motionPages}
        onRunMotionPage={handleRunSpecificMotionPage}
        onStopMotion={() => {
          setIsPlaying(false);
          if (robotSerialService.isConnected) {
            robotSerialService.stopMotionOnController();
          }
        }}
        onRebootRobot={() => {
          setTorqueOn(true);
          setJointTorqueMap({
            1: true,
            2: true,
            3: true,
            4: true,
            5: true,
            6: true,
            7: true,
            8: true
          });
          if (robotSerialService.isConnected) {
            robotSerialService.rebootMotors(254);
          }
        }}
        onOpenAiRemote={() => setIsAiRemoteOpen(true)}
        onClose={() => setIsRemotePadOpen(false)}
        onShowToast={showToast}
      />

      {/* 7) AI 리모컨 (버튼 / 한국어 음성 인식 / 제스처 인식) 모달 */}
      <AiRemoteModal
        isOpen={isAiRemoteOpen}
        motionPages={motionPages}
        onRunMotionPage={handleRunSpecificMotionPage}
        onClose={() => setIsAiRemoteOpen(false)}
        onShowToast={showToast}
      />

      {/* 8) 전문가용 도구 선택 모달 (Dxl Management vs Dance Manager) */}
      <ExpertSelectorModal
        isOpen={isExpertSelectorOpen}
        onSelectDxlManager={() => setIsDxlManagerOpen(true)}
        onSelectDanceManager={() => setIsDanceManagerOpen(true)}
        onClose={() => setIsExpertSelectorOpen(false)}
      />

      {/* 9) 다이나믹셀 서보모터 매니저 모달 */}
      <DxlManagerModal
        isOpen={isDxlManagerOpen}
        currentAngles={currentAngles}
        jointTorqueMap={jointTorqueMap}
        onChangeJointAngle={handleChangeJointAngle}
        onToggleJointTorque={(id) => {
          setJointTorqueMap((prev) => {
            const nextVal = !prev[id];
            if (robotSerialService.isConnected) {
              robotSerialService.setTorque(nextVal, id);
            }
            return { ...prev, [id]: nextVal };
          });
        }}
        onClose={() => setIsDxlManagerOpen(false)}
        onShowToast={showToast}
      />

      {/* 10) 댄스 매니저 (군무 동기화 공연) 모달 */}
      <DanceManagerModal
        isOpen={isDanceManagerOpen}
        motionPages={motionPages}
        onRunMotionPage={handleRunSpecificMotionPage}
        onStopMotion={() => {
          setIsPlaying(false);
          if (robotSerialService.isConnected) {
            robotSerialService.stopMotionOnController();
          }
        }}
        onClose={() => setIsDanceManagerOpen(false)}
        onShowToast={showToast}
      />

      {/* 11) 환경설정 모달 */}
      <SetupModal
        isOpen={isSetupModalOpen}
        language={language}
        iconLarge={iconLarge}
        showTooltips={showTooltips}
        autoRotate={autoRotate}
        allowStartMotionEdit={allowStartMotionEdit}
        onChangeLanguage={setLanguage}
        onChangeIconLarge={setIconLarge}
        onChangeShowTooltips={setShowTooltips}
        onChangeAutoRotate={setAutoRotate}
        onChangeAllowStartMotionEdit={setAllowStartMotionEdit}
        onRestoreMotions={() => {
          const fresh = createInitialMotionPages();
          updateMotionPagesWithHistory(fresh);
          setCurrentAngles({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 });
        }}
        onClose={() => setIsSetupModalOpen(false)}
        onShowToast={showToast}
      />

      {/* 12) 인터랙티브 튜토리얼 가이드 모달 */}
      <TutorialModal
        isOpen={isTutorialModalOpen}
        onClose={() => setIsTutorialModalOpen(false)}
      />

      {/* 13) 보안 암호화 로그인 모달 */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={(encryptedUser) => setUserInfo(encryptedUser)}
        onClose={() => setIsLoginModalOpen(false)}
        onShowToast={showToast}
      />

      {/* 14) 나의 활동 CELL 현황 모달 */}
      <CellStatusModal
        isOpen={isCellStatusModalOpen}
        userInfo={userInfo}
        onLogout={() => {
          setUserInfo(null);
          showToast('안전하게 로그아웃되었습니다.');
        }}
        onClose={() => setIsCellStatusModalOpen(false)}
      />

      {/* 15) USB(COM5 실제 로봇 직결 & WebSerial) / 블루투스(WebBluetooth) 연결 모달 */}
      <DeviceConnectModal
        isOpen={deviceConnectModalState.isOpen}
        connectType={deviceConnectModalState.type}
        isConnected={isConnectedUsb || isConnectedBle}
        connectedDeviceName={connectedDeviceName}
        onConnected={(type, devName) => {
          if (type === 'usb') {
            setIsConnectedUsb(true);
            setIsConnectedBle(false);
          } else {
            setIsConnectedBle(true);
            setIsConnectedUsb(false);
          }
          setConnectedDeviceName(devName);
        }}
        onDisconnected={() => {
          setIsConnectedUsb(false);
          setIsConnectedBle(false);
          setConnectedDeviceName('');
          showToast('🔌 COM5 로봇 연결이 안전하게 해제되었습니다.');
        }}
        onSyncReadAngles={(readAngles) => {
          setCurrentAngles((prev) => {
            const merged = { ...prev, ...readAngles };
            writeAnglesToSelectedPose(merged);
            return merged;
          });
        }}
        onClose={() =>
          setDeviceConnectModalState((prev) => ({ ...prev, isOpen: false }))
        }
        onShowToast={showToast}
      />

      {/* ==================== 5. 하단 안내 토스트 메시지 ==================== */}
      {toastMessage && <div className="rm-toast">{toastMessage}</div>}
    </div>
  );
}
