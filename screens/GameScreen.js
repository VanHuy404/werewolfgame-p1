// ============================================
// 🐺 MA SÓI - GameScreen (Discord Style & Village Background)
// ============================================
// - Background: Hình ảnh Ngôi làng Ma Sói huyền bí
// - Giao diện: Thanh Chat bên phải khung hình (Desktop/Web)
// - Danh sách người chơi: Dạng Discord Voice Tiles
// - Hiển thị lượt vote trực tiếp dưới Avatar
// - Không tiết lộ vai trò khi bị giết hoặc treo cổ
// - Khóa chat Sói khi đến giờ bầu cử
// - Animation Tiên Tri ma thuật đẳng cấp
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Animated, Modal, Platform, SafeAreaView,
  ImageBackground, useWindowDimensions, Image,
} from 'react-native';
import { COLORS, getRoleColor, getRoleName, getRoleEmoji } from '../utils/colors';
import PlayerAvatar from '../components/PlayerAvatar';
import ChatBox from '../components/ChatBox';
import SeerInspectionModal from '../components/SeerInspectionModal';
import WolfClawAttackModal from '../components/WolfClawAttackModal';
import BodyguardSaveModal from '../components/BodyguardSaveModal';
import WitchHealSaveModal from '../components/WitchHealSaveModal';
import WitchPoisonModal from '../components/WitchPoisonModal';
import HunterShotModal from '../components/HunterShotModal';
import ThreeWayClashModal from '../components/ThreeWayClashModal';
import DualKillClashModal from '../components/DualKillClashModal';
import PiedPiperModal, { playFluteSynth } from '../components/PiedPiperModal';
import PiedPiperPurifiedModal, { playPurificationSynth } from '../components/PiedPiperPurifiedModal';
import DaytimeHangingModal from '../components/DaytimeHangingModal';
import CoupleRevealModal from '../components/CoupleRevealModal';
import CoupleHeartbreakModal from '../components/CoupleHeartbreakModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pha trong game
const PHASES = {
  WAITING: 'waiting',
  NIGHT_CUPID: 'night_cupid',
  NIGHT_COUPLE_REVEAL: 'night_couple_reveal',
  NIGHT_BODYGUARD: 'night_bodyguard',
  NIGHT_WOLF: 'night_wolf',
  NIGHT_WITCH: 'night_witch',
  NIGHT_SEER: 'night_seer',
  NIGHT_PIED_PIPER: 'night_pied_piper',
  NIGHT_CHARMED_REVEAL: 'night_charmed_reveal',
  NIGHT: 'night',
  DAY_ANNOUNCE: 'day_announce',
  HUNTER_SHOT: 'hunter_shot',
  DAY_DISCUSSION: 'day_discussion',
  DAY_VOTE: 'day_vote',
  GAME_OVER: 'game_over',
};

export default function GameScreen({
  socket,
  roomCode,
  players = [],
  myRole,
  phase = PHASES.NIGHT,
  round = 1,
  timeLeft = 0,
  deadPlayer = null,
  savedPlayer = null,
  poisonedPlayer = null,
  shieldClashPlayer = null,
  witchSavedPlayer = null,
  attackedPlayer = null,
  heartbrokenPlayer = null,
  wasProtected = false,
  lastProtectedTarget = null,
  wolfVictim = null,
  initialWitchState = null,
  hunter = null,
  winner = null,
  winMessage = '',
  messages = [],
  onSendMessage,
  onReturnToLobby,
  onLeaveGame,
  myId,
  hostId,
  initialSeerHistory = {},
  initialCharmedHistory = {},
  couple = [],
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobile = windowWidth <= 860;
  const isSmallPhone = windowWidth < 420;

  // Trạng thái bật/tắt Chat dạng Slidebar (Mặc định ở trạng thái OFF, không auto bật)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMsgLengthRef = useRef(messages.length);

  useEffect(() => {
    if (isChatOpen) {
      setUnreadCount(0);
    } else {
      const diff = messages.length - prevMsgLengthRef.current;
      if (diff > 0) {
        setUnreadCount((prev) => prev + diff);
      }
    }
    prevMsgLengthRef.current = messages.length;
  }, [messages.length, isChatOpen]);

  // Chiều rộng khả dụng của khu vực đấu trường
  const arenaWidth = isMobile || !isChatOpen ? windowWidth : windowWidth - 340;

  // Số lượng người chơi & tính toán hitbox thu nhỏ động (vừa khít với từng thiết bị)
  const playerCount = players.length;
  // Tự động thu nhỏ trên màn hình điện thoại hoặc khi đông người chơi
  const isCompact = isMobile || playerCount > 12;
  const isUltraCompact = (isMobile && playerCount > 8) || playerCount > 16;

  // Xác định số cột tối ưu (đảm bảo không bị tràn viền trên mọi kích thước màn hình)
  const getColCount = () => {
    if (arenaWidth >= 1150) {
      if (playerCount <= 4) return 2;
      if (playerCount <= 6) return 3;
      if (playerCount <= 8) return 3;
      return 4;
    } else if (arenaWidth >= 800) {
      if (playerCount <= 4) return 2;
      if (playerCount <= 6) return 2;
      return 3;
    } else if (arenaWidth >= 500) {
      if (playerCount <= 4) return 2;
      return 2;
    } else {
      // Mobile (< 500px)
      return 2;
    }
  };

  const colCount = getColCount();
  const boxWidthPercent = isMobile ? '48.5%' : `${Math.floor((100 / colCount) - 2)}%`;

  // Trạng thái hành động
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [wolfVotes, setWolfVotes] = useState({}); // { wolfId: targetId }
  const [wolfConfirmed, setWolfConfirmed] = useState([]); // [ wolfId ]
  const [seerResult, setSeerResult] = useState(null); // { targetName, alignment, isWolf }
  const [seerHistory, setSeerHistory] = useState(initialSeerHistory || {});
  const [seerPopupVisible, setSeerPopupVisible] = useState(false);
  const [charmedHistory, setCharmedHistory] = useState(initialCharmedHistory || {});
  const [selectedPiedPiperTargets, setSelectedPiedPiperTargets] = useState([]);
  const [charmCountRequired, setCharmCountRequired] = useState(2);
  const [piedPiperSkipped, setPiedPiperSkipped] = useState(false);
  const [piedPiperConfirmed, setPiedPiperConfirmed] = useState(false);
  const [piedPiperModalVisible, setPiedPiperModalVisible] = useState(false);
  const [purifiedModalVisible, setPurifiedModalVisible] = useState(false);
  const [purifiedModalData, setPurifiedModalData] = useState({ piedPiper: null, purifiedPlayers: [] });
  const [purifyingVictimIds, setPurifyingVictimIds] = useState([]);
  const [livePurificationBanner, setLivePurificationBanner] = useState(false);
  const pendingPurifiedVictimsRef = useRef([]);
  const pendingNightPurificationRef = useRef(null);
  const pendingHunterPurificationRef = useRef(null);
  const votePiedPiperNextRef = useRef(null);
  const votePiedPiperTimerActiveRef = useRef(false);
  const autoAdvanceModalTimerRef = useRef(null);

  const me = (players && players.find((p) => p.id === myId)) || { alive: true };
  const amAlive = me ? me.alive !== false : true;
  const alivePlayers = (players || []).filter((p) => p && p.alive !== false);
  const isHost = myId === hostId;

  const isNightCupid = phase === PHASES.NIGHT_CUPID;
  const isNightCoupleReveal = phase === PHASES.NIGHT_COUPLE_REVEAL;
  const isNightBodyguard = phase === PHASES.NIGHT_BODYGUARD;
  const isNightWolf = phase === PHASES.NIGHT_WOLF || (phase === PHASES.NIGHT && !seerResult && !isNightBodyguard && !isNightCupid && !isNightCoupleReveal);
  const isNightWitch = phase === PHASES.NIGHT_WITCH;
  const isNightSeer = phase === PHASES.NIGHT_SEER;
  const isNightPiedPiper = phase === PHASES.NIGHT_PIED_PIPER;
  const isNightCharmedReveal = phase === PHASES.NIGHT_CHARMED_REVEAL;
  const isNight = isNightCupid || isNightCoupleReveal || isNightBodyguard || isNightWolf || isNightWitch || isNightSeer || isNightPiedPiper || isNightCharmedReveal || phase === PHASES.NIGHT;
  const isHunterShot = phase === PHASES.HUNTER_SHOT;
  const isGameOver = phase === PHASES.GAME_OVER;

  const [selectedCupidTargets, setSelectedCupidTargets] = useState([]);
  const [cupidConfirmed, setCupidConfirmed] = useState(false);
  const [coupleRevealVisible, setCoupleRevealVisible] = useState(false);
  const [coupleDataState, setCoupleDataState] = useState(couple || []);
  const [cupidDataState, setCupidDataState] = useState(null);
  const partnerPlayer = me?.partnerId ? players.find((p) => p.id === me.partnerId) : null;

  const amHunter = myRole === 'hunter';
  const isMeActiveHunter = hunter?.id === myId || (amHunter && isHunterShot);

  const [hunterShotTargetId, setHunterShotTargetId] = useState(null);
  const [hunterShotModalVisible, setHunterShotModalVisible] = useState(false);
  const [hunterShotResultData, setHunterShotResultData] = useState(null);
  const [illuminatedPlayerId, setIlluminatedPlayerId] = useState(null);
  const [bodyguardTarget, setBodyguardTarget] = useState(null);
  const [bodyguardSkipped, setBodyguardSkipped] = useState(false);
  const [showRoleBrief, setShowRoleBrief] = useState(false);
  const [dayVoteTarget, setDayVoteTarget] = useState(null);
  const [dayVoteCount, setDayVoteCount] = useState({});
  const [dayVoterMap, setDayVoterMap] = useState({});
  const [totalVoted, setTotalVoted] = useState(0);
  const [lastVoteEliminated, setLastVoteEliminated] = useState(null);
  const [voteNoOneHanged, setVoteNoOneHanged] = useState(false);
  const [skipVoteCount, setSkipVoteCount] = useState(0);

  // Hiển thị số lượng sói còn lại ngay trên giữa màn hình trong 3s
  const [remainingWolvesOverlay, setRemainingWolvesOverlay] = useState(null);
  const wolfOverlayScale = useRef(new Animated.Value(0.7)).current;
  const wolfOverlayOpacity = useRef(new Animated.Value(0)).current;
  const wolfOverlayTimerRef = useRef(null);

  // Hiệu ứng Ma Sói cào rách Avatar buổi sáng
  const [wolfClawModalVisible, setWolfClawModalVisible] = useState(false);

  // Hiệu ứng Khiên Bảo Vệ che chở thành công buổi sáng
  const [bodyguardSaveModalVisible, setBodyguardSaveModalVisible] = useState(false);

  // Hiệu ứng Tương tác ba bên liên tục (Bảo Vệ + Ma Sói + Phù Thủy)
  const [threeWayClashModalVisible, setThreeWayClashModalVisible] = useState(false);

  // Hiệu ứng Cả Ma Sói và Phù Thủy cùng giết 1 người trong đêm
  const [dualKillModalVisible, setDualKillModalVisible] = useState(false);

  // Hiệu ứng Người Yêu Chết (Tim Vỡ Tuẫn Tình)
  const [coupleHeartbreakModalVisible, setCoupleHeartbreakModalVisible] = useState(false);
  const [coupleHeartbreakData, setCoupleHeartbreakData] = useState({ deadPlayer: null, heartbrokenPlayer: null, reason: '' });
  const pendingAfterHeartbreakCallbackRef = useRef(null);

  const handleCoupleHeartbreakModalClose = () => {
    setCoupleHeartbreakModalVisible(false);
    if (pendingAfterHeartbreakCallbackRef.current) {
      const cb = pendingAfterHeartbreakCallbackRef.current;
      pendingAfterHeartbreakCallbackRef.current = null;
      cb();
    }
  };

  // Hiệu ứng Đoạn Đầu Đài Treo Cổ Ban Ngày
  const [daytimeHangingModalVisible, setDaytimeHangingModalVisible] = useState(false);
  const [daytimeHangingVictim, setDaytimeHangingVictim] = useState(null);
  const pendingHangingCallbackRef = useRef(null);

  const handleDaytimeHangingClose = () => {
    setDaytimeHangingModalVisible(false);
    if (pendingHangingCallbackRef.current) {
      const cb = pendingHangingCallbackRef.current;
      pendingHangingCallbackRef.current = null;
      cb();
    }
  };

  // Trạng thái & Hiệu ứng Phù Thủy
  const [witchState, setWitchState] = useState(initialWitchState || { hasHeal: true, hasPoison: true });
  const [witchVictim, setWitchVictim] = useState(wolfVictim || null);
  const [witchStep, setWitchStep] = useState('done'); // 'heal' | 'poison' | 'done'
  const [witchPendingSave, setWitchPendingSave] = useState(null); // null | true | false
  const [witchPendingPoison, setWitchPendingPoison] = useState(null); // null | playerId
  const [witchHealModalVisible, setWitchHealModalVisible] = useState(false);
  const [witchPoisonModalVisible, setWitchPoisonModalVisible] = useState(false);
  const [witchViewVictimCountdown, setWitchViewVictimCountdown] = useState(5);
  const witchNightInitializedRef = useRef(false);

  // Đếm ngược 5 giây cố định khi Phù Thủy xem nạn nhân (ở đêm sau khi đã hết bình cứu) rồi tự chuyển sang hỏi dùng thuốc độc
  useEffect(() => {
    let timer;
    if (isNightWitch && myRole === 'witch' && amAlive && witchStep === 'view_victim_has_poison') {
      setWitchViewVictimCountdown(5);
      timer = setInterval(() => {
        setWitchViewVictimCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setWitchStep('ask_poison');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isNightWitch, myRole, amAlive, witchStep]);

  // Cập nhật khi prop wolfVictim hoặc initialWitchState thay đổi
  useEffect(() => {
    if (wolfVictim !== undefined) {
      setWitchVictim(wolfVictim);
    }
  }, [wolfVictim]);

  useEffect(() => {
    if (initialWitchState) {
      setWitchState(initialWitchState);
    }
  }, [initialWitchState]);

  // Điều phối các bước hành động của Phù Thủy khi đến pha đêm (Bảo đảm luôn thấy và cứu được nạn nhân, kể cả Phe Thứ 3)
  // YÊU CẦU: Hiển thị hết thuốc được xem xét điều kiện lúc Phù Thủy dậy lần tiếp theo chứ không phải lúc vừa dùng xong thuốc!
  useEffect(() => {
    if (phase === PHASES.NIGHT_WITCH) {
      if (myRole === 'witch' && amAlive) {
        const hasHealAtStart = !!witchState?.hasHeal;
        const hasPoisonAtStart = !!witchState?.hasPoison;
        const currentVictim = (wolfVictim !== undefined && wolfVictim !== null) ? wolfVictim : witchVictim;

        // Chỉ thiết lập bước ban đầu khi Phù Thủy chưa quyết định cứu/bỏ mặc đêm nay
        if (witchPendingSave === null) {
          if (currentVictim && hasHealAtStart) {
            // Còn bình cứu và có nạn nhân bị cắn -> Hiện modal chọn cứu/bỏ mặc
            setWitchStep('heal');
          } else if (currentVictim && !hasHealAtStart && hasPoisonAtStart) {
            // Phù thủy hết thuốc cứu từ trước, xem ai bị cắn rồi tự chuyển hỏi thuốc độc
            setWitchStep('view_victim_has_poison');
          } else if (!hasHealAtStart && !hasPoisonAtStart) {
            // Đã hết cả 2 bình thuốc từ trước: lúc này thức dậy lần tiếp theo MỚI xem xét hiển thị hết thuốc!
            setWitchStep('out_of_potions');
          } else if (!currentVictim && hasPoisonAtStart) {
            // Không ai bị cắn đêm nay, còn độc -> Hỏi có muốn dùng thuốc độc không
            setWitchStep('ask_poison');
          } else {
            // Hết cả 2 bình thuốc và không ai bị cắn -> Chờ chuyển tiếp
            setWitchStep('out_of_potions');
          }
        }
      }
    } else {
      witchNightInitializedRef.current = false;
      setWitchPendingSave(null);
      setWitchPendingPoison(null);
      setWitchStep('done');
    }
  }, [phase, myRole, amAlive, wolfVictim?.id, witchVictim?.id, witchPendingSave]);

  // Quản lý hiển thị hoạt ảnh điện ảnh buổi sáng (DAY_ANNOUNCE)
  useEffect(() => {
    if (phase === PHASES.DAY_ANNOUNCE) {
      const isDualKill = deadPlayer && poisonedPlayer && deadPlayer.id === poisonedPlayer.id && !shieldClashPlayer;
      const hasSeparateFirstEvent = Boolean(
        (deadPlayer && (!shieldClashPlayer || deadPlayer.id !== shieldClashPlayer.id)) ||
        (witchSavedPlayer && (!shieldClashPlayer || witchSavedPlayer.id !== shieldClashPlayer.id))
      );
      if (shieldClashPlayer && !hasSeparateFirstEvent) {
        // YÊU CẦU: Hoạt ảnh mới đè hiệu ứng liên tục tương tác tay ba (Sói cào -> Khiên đỡ thành công -> Phù Thủy ném độc vỡ khiên -> Tử trận)
        setThreeWayClashModalVisible(true);
        setDualKillModalVisible(false);
        setBodyguardSaveModalVisible(false);
        setWitchHealModalVisible(false);
        setWolfClawModalVisible(false);
        setWitchPoisonModalVisible(false);
      } else if (isDualKill) {
        // CẢ SÓI VÀ PHÙ THỦY CÙNG GIẾT 1 NGƯỜI ("Cả thiện và ác đều nhắm vào ngươi , kẻ phản bội")
        setDualKillModalVisible(true);
        setThreeWayClashModalVisible(false);
        setBodyguardSaveModalVisible(false);
        setWitchHealModalVisible(false);
        setWolfClawModalVisible(false);
        setWitchPoisonModalVisible(false);
      } else if (witchSavedPlayer) {
        setWitchHealModalVisible(true);
        setDualKillModalVisible(false);
        setBodyguardSaveModalVisible(false);
        setWolfClawModalVisible(false);
        setWitchPoisonModalVisible(false);
        setThreeWayClashModalVisible(false);
      } else if (savedPlayer) {
        setBodyguardSaveModalVisible(true);
        setDualKillModalVisible(false);
        setWitchHealModalVisible(false);
        setWolfClawModalVisible(false);
        setWitchPoisonModalVisible(false);
        setThreeWayClashModalVisible(false);
      } else if (deadPlayer) {
        setWolfClawModalVisible(true);
        setDualKillModalVisible(false);
        setWitchHealModalVisible(false);
        setBodyguardSaveModalVisible(false);
        setWitchPoisonModalVisible(false);
        setThreeWayClashModalVisible(false);
      } else if (poisonedPlayer) {
        // Chỉ trúng độc thông thường của Phù Thủy
        setWitchPoisonModalVisible(true);
        setDualKillModalVisible(false);
        setWolfClawModalVisible(false);
        setBodyguardSaveModalVisible(false);
        setWitchHealModalVisible(false);
        setThreeWayClashModalVisible(false);
      }
    } else {
      setThreeWayClashModalVisible(false);
      setDualKillModalVisible(false);
      setWolfClawModalVisible(false);
      setBodyguardSaveModalVisible(false);
      setWitchHealModalVisible(false);
      setWitchPoisonModalVisible(false);
    }
  }, [phase, deadPlayer?.id, savedPlayer?.id, witchSavedPlayer?.id, poisonedPlayer?.id, shieldClashPlayer?.id]);

  // Kích hoạt thanh tẩy trực tiếp trên giao diện chính của game
  const triggerLivePurification = (victimIds = []) => {
    playPurificationSynth();
    setLivePurificationBanner(true);
    if (victimIds && victimIds.length > 0) {
      setPurifyingVictimIds(victimIds);
    }
    setTimeout(() => {
      setPurifyingVictimIds([]);
      setLivePurificationBanner(false);
      setCharmedHistory({});
    }, 3500);
  };

  // Đóng modal Người Thổi Sáo chết
  const handlePiedPiperDeathModalClose = () => {
    // Nếu có callback chuyển tiếp tuần tự (như sau khi treo cổ: đóng modal Thổi Sáo chết -> mở tiếp Bảng Treo Cổ & Sói còn lại)
    if (votePiedPiperNextRef.current && votePiedPiperTimerActiveRef.current) {
      votePiedPiperNextRef.current();
      return;
    }

    setPurifiedModalVisible(false);
    // HẾT TẤT CẢ CÁC HOẠT ẢNH -> LÚC NÀY MỚI KÍCH HOẠT THANH TẨY HOÀNG KIM TRỰC TIẾP TRÊN MÀN HÌNH CHÍNH!
    const victims = pendingPurifiedVictimsRef.current || [];
    triggerLivePurification(victims);
    pendingPurifiedVictimsRef.current = [];
  };

  // Khi modal Thợ Săn nổ súng đóng -> nếu bắn trúng Cặp Đôi thì mở hoạt ảnh Tim Vỡ trước, sau đó nếu trúng Thổi Sáo mới mở modal Thổi Sáo chết
  const handleHunterShotModalClose = () => {
    setHunterShotModalVisible(false);
    const targetPlayer = hunterShotResultData?.target;
    const heartbroken = hunterShotResultData?.heartbrokenPlayer;

    const triggerHunterPurification = () => {
      if (pendingHunterPurificationRef.current) {
        const data = pendingHunterPurificationRef.current;
        pendingHunterPurificationRef.current = null;
        if (data?.purifiedPlayers && data.purifiedPlayers.length > 0) {
          pendingPurifiedVictimsRef.current = data.purifiedPlayers.map((p) => p.id);
        }
        setTimeout(() => {
          setPurifiedModalData({
            piedPiper: data?.piedPiper,
          });
          setPurifiedModalVisible(true);
        }, 350);
      }
    };

    // YÊU CẦU: Hoạt ảnh Tim Vỡ CHỈ xuất hiện sau khi người yêu xuất hiện chết trước trong hoạt ảnh Thợ Săn bắn
    if (heartbroken && targetPlayer && targetPlayer.id !== heartbroken.id) {
      setCoupleHeartbreakData({
        deadPlayer: targetPlayer,
        heartbrokenPlayer: heartbroken,
        reason: 'bị Thợ Săn nổ súng bắn hạ',
      });
      // Nếu mục tiêu bị bắn đồng thời là Người Thổi Sáo, xếp hàng chờ sau khi hoạt ảnh Tim Vỡ kết thúc
      if (pendingHunterPurificationRef.current) {
        pendingAfterHeartbreakCallbackRef.current = () => {
          triggerHunterPurification();
        };
      }
      setTimeout(() => {
        setCoupleHeartbreakModalVisible(true);
      }, 350);
    } else {
      triggerHunterPurification();
    }
  };

  // Kích hoạt hoạt ảnh Người Thổi Sáo chết nếu có dữ liệu đang chờ trong đêm
  const triggerNightPurificationIfPending = () => {
    if (pendingNightPurificationRef.current) {
      const data = pendingNightPurificationRef.current;
      pendingNightPurificationRef.current = null;
      if (data?.purifiedPlayers && data.purifiedPlayers.length > 0) {
        pendingPurifiedVictimsRef.current = data.purifiedPlayers.map((p) => p.id);
      }
      setTimeout(() => {
        setPurifiedModalData({
          piedPiper: data?.piedPiper,
        });
        setPurifiedModalVisible(true);
      }, 350);
      return true;
    }
    return false;
  };

  // Kiểm tra chính xác xem nạn nhân vừa tử vong có phải là người yêu đã gây ra cái chết tuẫn tình của heartbrokenPlayer hay không
  const isVictimTheDeadLover = (victimPlayer) => {
    if (!heartbrokenPlayer || !victimPlayer || victimPlayer.id === heartbrokenPlayer.id) return false;
    if (heartbrokenPlayer.partnerId) {
      return victimPlayer.id === heartbrokenPlayer.partnerId;
    }
    const activeCouple = coupleDataState && coupleDataState.length === 2 ? coupleDataState : couple;
    if (activeCouple && activeCouple.length === 2) {
      return activeCouple.some((c) => (c?.id || c) === victimPlayer.id);
    }
    // Nếu có cả 2 người chết khác nhau trong đêm mà chưa rõ partnerId, ưu tiên kiểm tra thuộc tính inCouple trên danh sách players
    const foundInPlayers = players.find((p) => p.id === victimPlayer.id);
    if (foundInPlayers && foundInPlayers.inCouple !== undefined) {
      return Boolean(foundInPlayers.inCouple);
    }
    return true;
  };

  // Kích hoạt chuỗi hoạt ảnh tuần tự sau khi một nạn nhân tử trận trong đêm:
  // 1. Kiểm tra nếu nạn nhân này có Người Yêu tuẫn tình chết theo -> mở hoạt ảnh Tim Vỡ (CoupleHeartbreakModal) NGAY SAU hoạt ảnh chết của nạn nhân đó
  // 2. Sau khi Tim Vỡ kết thúc, chạy bước tiếp theo (ví dụ: hoạt ảnh Phù Thủy ném độc người thứ 2 hoặc hoạt ảnh Thổi Sáo chết)
  const triggerNightSequentialAfterDeath = (victimPlayer, defaultReason = 'bị sát hại dã man', onNextStep = null) => {
    const runNext = () => {
      if (typeof onNextStep === 'function') {
        return onNextStep();
      }
      return triggerNightPurificationIfPending();
    };

    if (isVictimTheDeadLover(victimPlayer)) {
      setCoupleHeartbreakData({
        deadPlayer: victimPlayer,
        heartbrokenPlayer: heartbrokenPlayer,
        reason: defaultReason,
      });

      pendingAfterHeartbreakCallbackRef.current = () => {
        runNext();
      };

      setTimeout(() => {
        setCoupleHeartbreakModalVisible(true);
      }, 350);
      return true;
    }

    // Nếu nạn nhân này không có Người Yêu chết theo, chuyển sang hoạt ảnh kế tiếp trong hàng đợi
    return runNext();
  };

  // Khi modal hoạt ảnh đầu tiên đóng (sói cắn / khiên cứu / phù thủy cứu):
  // - Nếu nạn nhân bị Sói cắn (deadPlayer) là người tình trong Cặp Đôi -> phát hoạt ảnh Tim Vỡ NGAY LẬP TỨC, rồi mới tới hoạt ảnh Phù Thủy độc (nếu có) và Thổi Sáo chết (nếu có).
  // - Nếu không -> phát tiếp hoạt ảnh Phù Thủy độc / Xung đột khiên (nếu có), rồi mới tới Tim Vỡ (nếu người trúng độc thuộc Cặp Đôi) và Thổi Sáo chết.
  const handleFirstModalClose = () => {
    if (autoAdvanceModalTimerRef.current) {
      clearTimeout(autoAdvanceModalTimerRef.current);
      autoAdvanceModalTimerRef.current = null;
    }
    setWolfClawModalVisible(false);
    setBodyguardSaveModalVisible(false);
    setWitchHealModalVisible(false);

    const hasSeparateShieldClashNext = Boolean(
      shieldClashPlayer &&
      ((deadPlayer && deadPlayer.id !== shieldClashPlayer.id) ||
        (witchSavedPlayer && witchSavedPlayer.id !== shieldClashPlayer.id))
    );
    const hasPoisonNext = Boolean(
      poisonedPlayer && !shieldClashPlayer && (!deadPlayer || deadPlayer.id !== poisonedPlayer.id)
    );

    const runAfterFirstVictimSequence = () => {
      if (hasSeparateShieldClashNext) {
        setTimeout(() => {
          setThreeWayClashModalVisible(true);
        }, 350);
        return true;
      }
      if (hasPoisonNext) {
        setTimeout(() => {
          setWitchPoisonModalVisible(true);
        }, 350);
        return true;
      }
      return triggerNightPurificationIfPending();
    };

    triggerNightSequentialAfterDeath(deadPlayer, 'bị Ma Sói sát hại dã man', runAfterFirstVictimSequence);
  };

  // Khi modal đòn trừng phạt kép (Sói & Phù Thủy cùng giết 1 người) đóng
  const handleDualKillModalClose = () => {
    if (autoAdvanceModalTimerRef.current) {
      clearTimeout(autoAdvanceModalTimerRef.current);
      autoAdvanceModalTimerRef.current = null;
    }
    setDualKillModalVisible(false);
    triggerNightSequentialAfterDeath(deadPlayer, 'bị cả Ma Sói và Phù Thủy trừng phạt');
  };

  // Khi modal trúng độc đóng -> kích hoạt tuần tự sau chết
  const handleWitchPoisonModalClose = () => {
    if (autoAdvanceModalTimerRef.current) {
      clearTimeout(autoAdvanceModalTimerRef.current);
      autoAdvanceModalTimerRef.current = null;
    }
    setWitchPoisonModalVisible(false);
    triggerNightSequentialAfterDeath(poisonedPlayer, 'bị trúng độc tử vong');
  };

  // Khi modal xung đột tay ba đóng -> kích hoạt tuần tự sau chết
  const handleThreeWayClashModalClose = () => {
    if (autoAdvanceModalTimerRef.current) {
      clearTimeout(autoAdvanceModalTimerRef.current);
      autoAdvanceModalTimerRef.current = null;
    }
    setThreeWayClashModalVisible(false);
    triggerNightSequentialAfterDeath(shieldClashPlayer, 'bị Phù Thủy ném độc vỡ khiên tử nạn');
  };

  // Tự động chuyển tiếp tuần tự giữa các modal buổi sáng nếu người chơi không bấm "Đã hiểu" (để kịp xem toàn bộ hoạt ảnh trước khi thảo luận)
  useEffect(() => {
    if (coupleHeartbreakModalVisible && pendingAfterHeartbreakCallbackRef.current) {
      autoAdvanceModalTimerRef.current = setTimeout(() => {
        handleCoupleHeartbreakModalClose();
      }, 5800);
      return () => {
        if (autoAdvanceModalTimerRef.current) clearTimeout(autoAdvanceModalTimerRef.current);
      };
    }

    if (phase !== PHASES.DAY_ANNOUNCE) {
      if (autoAdvanceModalTimerRef.current) {
        clearTimeout(autoAdvanceModalTimerRef.current);
        autoAdvanceModalTimerRef.current = null;
      }
      return;
    }

    const hasNextModalAfterFirst =
      (poisonedPlayer && !shieldClashPlayer) ||
      !!shieldClashPlayer ||
      pendingNightPurificationRef.current ||
      !!heartbrokenPlayer;
    if ((wolfClawModalVisible || bodyguardSaveModalVisible || witchHealModalVisible) && hasNextModalAfterFirst) {
      const advanceDuration = witchHealModalVisible ? 6100 : 3550;
      autoAdvanceModalTimerRef.current = setTimeout(() => {
        handleFirstModalClose();
      }, advanceDuration);
      return () => {
        if (autoAdvanceModalTimerRef.current) clearTimeout(autoAdvanceModalTimerRef.current);
      };
    }

    if (witchPoisonModalVisible && (pendingNightPurificationRef.current || !!heartbrokenPlayer)) {
      autoAdvanceModalTimerRef.current = setTimeout(() => {
        handleWitchPoisonModalClose();
      }, 5350);
      return () => {
        if (autoAdvanceModalTimerRef.current) clearTimeout(autoAdvanceModalTimerRef.current);
      };
    }

    if (threeWayClashModalVisible && (pendingNightPurificationRef.current || !!heartbrokenPlayer)) {
      autoAdvanceModalTimerRef.current = setTimeout(() => {
        handleThreeWayClashModalClose();
      }, 6000);
      return () => {
        if (autoAdvanceModalTimerRef.current) clearTimeout(autoAdvanceModalTimerRef.current);
      };
    }

    if (dualKillModalVisible && (pendingNightPurificationRef.current || !!heartbrokenPlayer)) {
      autoAdvanceModalTimerRef.current = setTimeout(() => {
        handleDualKillModalClose();
      }, 4350);
      return () => {
        if (autoAdvanceModalTimerRef.current) clearTimeout(autoAdvanceModalTimerRef.current);
      };
    }
  }, [
    phase,
    wolfClawModalVisible,
    bodyguardSaveModalVisible,
    witchHealModalVisible,
    witchPoisonModalVisible,
    threeWayClashModalVisible,
    dualKillModalVisible,
    coupleHeartbreakModalVisible,
    poisonedPlayer,
    shieldClashPlayer,
    heartbrokenPlayer,
  ]);

  // Tự động chuyển tiếp từ modal Thợ Săn nổ súng sang modal Tim Vỡ / Thổi Sáo chết
  useEffect(() => {
    if (hunterShotModalVisible && (pendingHunterPurificationRef.current || hunterShotResultData?.heartbrokenPlayer)) {
      const timer = setTimeout(() => {
        handleHunterShotModalClose();
      }, 4650);
      return () => clearTimeout(timer);
    }
  }, [hunterShotModalVisible, hunterShotResultData]);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const crystalPulse = useRef(new Animated.Value(1)).current;
  const shieldPulse = useRef(new Animated.Value(1)).current;
  const popupScaleAnim = useRef(new Animated.Value(0.7)).current;
  const popupOpacityAnim = useRef(new Animated.Value(0)).current;

  // Lắng nghe socket events trong trận
  useEffect(() => {
    if (!socket) return;

    // Sói nhận cập nhật vote mục tiêu và xác nhận của các Sói khác
    const handleWolfVoteUpdate = (data) => {
      setWolfVotes(data.wolfVotes || {});
      setWolfConfirmed(data.wolfConfirmed || []);
    };

    // Tiên Tri nhận kết quả soi
    const handleSeerResult = (data) => {
      setSeerResult(data);
      if (data.targetId) {
        setSeerHistory((prev) => ({
          ...prev,
          [data.targetId]: {
            alignment: data.alignment,
            alignmentName: data.alignmentName,
          },
        }));
      }
      setSeerPopupVisible(true);
      popupScaleAnim.setValue(0.7);
      popupOpacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(popupScaleAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.timing(popupOpacityAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    };

    // Bảo Vệ nhận cập nhật bảo vệ
    const handleBodyguardUpdate = (data) => {
      if (data.isSkipped) {
        setBodyguardSkipped(true);
        setBodyguardTarget(null);
      } else {
        setBodyguardTarget(data.targetId);
        setBodyguardSkipped(false);
      }
    };

    // Nhận cập nhật vote ban ngày kèm voterMap
    const handleVoteUpdate = (data) => {
      setDayVoteCount(data.voteCount || {});
      setDayVoterMap(data.voterMap || {});
      setTotalVoted(data.totalVoted || 0);
      setSkipVoteCount(data.skipCount || 0);
    };

    // Nhận kết quả vote bị loại
    const handleVoteResult = (data) => {
      setLastVoteEliminated(data.eliminated);
      if (!data.eliminated) {
        setVoteNoOneHanged(true);
        setTimeout(() => setVoteNoOneHanged(false), 4500);
      }
      setTimeout(() => {
        setLastVoteEliminated(null);
      }, 4500);

      const runAfterHanging = () => {
        const showWolfOverlay = (onFinished) => {
          if (data.remainingWolves !== undefined && data.remainingWolves !== null) {
            setRemainingWolvesOverlay({
              count: data.remainingWolves,
              eliminated: data.eliminated || null,
            });
            wolfOverlayScale.setValue(0.7);
            wolfOverlayOpacity.setValue(0);

            Animated.parallel([
              Animated.spring(wolfOverlayScale, {
                toValue: 1,
                friction: 6,
                tension: 50,
                useNativeDriver: true,
              }),
              Animated.timing(wolfOverlayOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
              }),
            ]).start();

            if (wolfOverlayTimerRef.current) {
              clearTimeout(wolfOverlayTimerRef.current);
            }

            wolfOverlayTimerRef.current = setTimeout(() => {
              Animated.timing(wolfOverlayOpacity, {
                toValue: 0,
                duration: 350,
                useNativeDriver: true,
              }).start(() => {
                setRemainingWolvesOverlay(null);
                if (onFinished) onFinished();
              });
            }, 3800);
          } else {
            if (onFinished) onFinished();
          }
        };

        // Luồng Thổi Sáo chết sau khi Bảng số Sói đóng
        const triggerPiperDeathFlow = () => {
          setPurifiedModalVisible(true);

          const triggerFinalPurification = () => {
            if (!votePiedPiperTimerActiveRef.current) return;
            votePiedPiperTimerActiveRef.current = false;
            setPurifiedModalVisible(false);

            // Cuối ngày trước khi vào đêm -> MỚI KÍCH HOẠT THANH TẨY HOÀNG KIM TRỰC TIẾP TRÊN MÀN HÌNH CHÍNH (3.5s)!
            setTimeout(() => {
              const victimIds = data.purifiedPlayers ? data.purifiedPlayers.map((p) => p.id) : [];
              triggerLivePurification(victimIds);
              pendingPurifiedVictimsRef.current = [];
            }, 250);
          };

          votePiedPiperTimerActiveRef.current = true;
          votePiedPiperNextRef.current = triggerFinalPurification;

          if (autoAdvanceModalTimerRef.current) clearTimeout(autoAdvanceModalTimerRef.current);
          autoAdvanceModalTimerRef.current = setTimeout(() => {
            if (votePiedPiperTimerActiveRef.current) {
              triggerFinalPurification();
            }
          }, 3500);
        };

        // Luồng hiển thị Bảng số Sói (và tiếp theo là Thổi Sáo chết nếu có)
        const runWolfOverlayFlow = () => {
          if (data.isPiedPiperDead) {
            const victimIds = data.purifiedPlayers ? data.purifiedPlayers.map((p) => p.id) : [];
            pendingPurifiedVictimsRef.current = victimIds;
            setPurifiedModalData({
              piedPiper: data.piedPiperVictim || data.eliminated,
            });
            showWolfOverlay(() => {
              setTimeout(triggerPiperDeathFlow, 250);
            });
          } else {
            showWolfOverlay();
          }
        };

        // YÊU CẦU: Bảng số Sói xuất hiện SAU hiệu ứng chết của cặp đôi!
        // 1. Hoạt ảnh Đoạn Đầu Đài treo cổ người yêu kết thúc.
        // 2. Hoạt ảnh Tim Vỡ của Cặp Đôi (CoupleHeartbreakModal) xuất hiện ngay tiếp theo!
        // 3. Sau khi hoạt ảnh Tim Vỡ kết thúc -> BẢNG SỐ SÓI CÒN LẠI (showWolfOverlay) MỚI XUẤT HIỆN!
        if (data.heartbrokenPlayer && data.eliminated && data.eliminated.id !== data.heartbrokenPlayer.id) {
          setCoupleHeartbreakData({
            deadPlayer: data.eliminated,
            heartbrokenPlayer: data.heartbrokenPlayer,
            reason: 'bị dân làng phán quyết treo cổ',
          });
          // Xếp hàng Bảng số Sói chạy ngay sau khi hoạt ảnh Tim Vỡ đóng
          pendingAfterHeartbreakCallbackRef.current = () => {
            setTimeout(runWolfOverlayFlow, 250);
          };
          setTimeout(() => {
            setCoupleHeartbreakModalVisible(true);
          }, 300);
        } else {
          // Không có người yêu tuẫn tình -> Hiển thị Bảng số Sói trực tiếp
          runWolfOverlayFlow();
        }
      };

      // NẾU CÓ NGƯỜI BỊ TREO CỔ: Ưu tiên mở Hoạt ảnh Đoạn Đầu Đài trước (3.8s)
      if (data.eliminated) {
        setDaytimeHangingVictim(data.eliminated);
        setDaytimeHangingModalVisible(true);
        pendingHangingCallbackRef.current = runAfterHanging;
      } else {
        runAfterHanging();
      }
    };

    // Phù Thủy nhận cập nhật trạng thái bình thuốc
    const handleWitchStateUpdate = (data) => {
      if (data.witchState) {
        setWitchState(data.witchState);
      }
    };

    // Thợ Săn nổ súng kết quả
    const handleHunterShotResult = (data) => {
      setHunterShotResultData(data);
      if (!data.passed && data.target) {
        setHunterShotModalVisible(true);
      }
    };

    // Người Thổi Sáo nhận cập nhật mục tiêu & kết quả thôi miên
    const handlePiedPiperSelected = (data) => {
      if (data?.targets) {
        setSelectedPiedPiperTargets(data.targets);
      }
      if (data?.countRequired) {
        setCharmCountRequired(data.countRequired);
      }
    };

    const handlePiedPiperResult = (data) => {
      if (data?.charmedHistory) {
        setCharmedHistory(data.charmedHistory);
      }
      setPiedPiperConfirmed(true);
    };

    // Hoạt ảnh Người Thổi Sáo chết và chuẩn bị thanh tẩy trực tiếp trên màn hình chính
    const handlePiedPiperPurified = (data) => {
      // Nếu là do vote ban ngày thì handleVoteResult đã điều phối tuần tự cùng bảng chia đôi
      if (data?.cause === 'vote') return;

      if (data?.purifiedPlayers && data.purifiedPlayers.length > 0) {
        pendingPurifiedVictimsRef.current = data.purifiedPlayers.map((p) => p.id);
      } else {
        pendingPurifiedVictimsRef.current = [];
      }

      // 1. Nếu đang có modal Thợ Săn nổ súng đang mở hoặc nguyên nhân là thợ săn bắn -> Chờ Thợ Săn bắn xong hoàn toàn mới mở modal Thổi Sáo chết
      if (hunterShotModalVisible || data?.cause === 'hunter_shot') {
        pendingHunterPurificationRef.current = data;
        return;
      }

      // 2. Nếu nguyên nhân là chết trong đêm (night) -> Luôn xếp hàng chờ sau các hoạt ảnh buổi sáng (Sói cào / Độc / Xung đột / Tim Vỡ)
      if (data?.cause === 'night') {
        pendingNightPurificationRef.current = data;
        return;
      }

      setPurifiedModalData({
        piedPiper: data?.piedPiper,
      });
      setPurifiedModalVisible(true);
    };

    const handleCoupleFormed = (data) => {
      if (data?.couple) setCoupleDataState(data.couple);
      if (data?.cupid) setCupidDataState(data.cupid);
      setCoupleRevealVisible(true);
    };

    const handleCupidChosenSuccess = () => {
      setCupidConfirmed(true);
    };

    socket.on('wolf-vote-update', handleWolfVoteUpdate);
    socket.on('seer-result', handleSeerResult);
    socket.on('bodyguard-update', handleBodyguardUpdate);
    socket.on('vote-update', handleVoteUpdate);
    socket.on('vote-result', handleVoteResult);
    socket.on('witch-state-update', handleWitchStateUpdate);
    socket.on('hunter-shot-result', handleHunterShotResult);
    socket.on('pied-piper-selected', handlePiedPiperSelected);
    socket.on('pied-piper-result', handlePiedPiperResult);
    socket.on('pied-piper-purified', handlePiedPiperPurified);
    socket.on('couple-formed', handleCoupleFormed);
    socket.on('cupid-chosen-success', handleCupidChosenSuccess);

    return () => {
      socket.off('wolf-vote-update', handleWolfVoteUpdate);
      socket.off('seer-result', handleSeerResult);
      socket.off('bodyguard-update', handleBodyguardUpdate);
      socket.off('vote-update', handleVoteUpdate);
      socket.off('vote-result', handleVoteResult);
      socket.off('witch-state-update', handleWitchStateUpdate);
      socket.off('hunter-shot-result', handleHunterShotResult);
      socket.off('pied-piper-selected', handlePiedPiperSelected);
      socket.off('pied-piper-result', handlePiedPiperResult);
      socket.off('pied-piper-purified', handlePiedPiperPurified);
      socket.off('couple-formed', handleCoupleFormed);
      socket.off('cupid-chosen-success', handleCupidChosenSuccess);
    };
  }, [socket]);

  useEffect(() => {
    if (couple && couple.length > 0) {
      setCoupleDataState(couple);
    }
  }, [couple]);

  // Reset target và vote khi đổi phase hoặc sang đêm mới (không còn dính chọn sẵn của Sói từ đêm trước)
  useEffect(() => {
    setSelectedTarget(null);
    setDayVoteTarget(null);
    setIlluminatedPlayerId(null);
    setWolfVotes({});
    setWolfConfirmed([]);
    if (phase !== PHASES.NIGHT_SEER) {
      setSeerPopupVisible(false);
    }
    if (phase !== PHASES.NIGHT_BODYGUARD) {
      setBodyguardTarget(null);
      setBodyguardSkipped(false);
    }
    if (phase !== PHASES.NIGHT_WITCH) {
      setWitchPendingPoison(null);
    }
    if (phase !== PHASES.HUNTER_SHOT) {
      setHunterShotTargetId(null);
    }
    if (phase !== PHASES.NIGHT_PIED_PIPER) {
      setSelectedPiedPiperTargets([]);
      setPiedPiperSkipped(false);
      setPiedPiperConfirmed(false);
      setPiedPiperModalVisible(false);
    }
    if (phase === PHASES.DAY_ANNOUNCE || phase === PHASES.DAY_DISCUSSION) {
      setSeerResult(null);
      setDayVoteCount({});
      setDayVoterMap({});
      setSkipVoteCount(0);
    }
  }, [phase, round]);

  // Đồng bộ lịch sử thôi miên khi có dữ liệu từ server
  useEffect(() => {
    if (initialCharmedHistory && Object.keys(initialCharmedHistory).length > 0) {
      setCharmedHistory(initialCharmedHistory);
    }
  }, [initialCharmedHistory]);

  // Âm thanh tiếng sáo thần thoại vang lên khi đến pha lộ diện thôi miên 5s rạng sáng
  useEffect(() => {
    if (phase === PHASES.NIGHT_CHARMED_REVEAL) {
      playFluteSynth();
    }
  }, [phase]);

  // Popup Tiên Tri tự biến mất khi hết thời gian đếm ngược còn lại
  useEffect(() => {
    if (seerPopupVisible && timeLeft <= 0) {
      setSeerPopupVisible(false);
    }
  }, [timeLeft, seerPopupVisible]);

  // Hiệu ứng quả cầu pha lê Tiên Tri
  useEffect(() => {
    if (isNightSeer && myRole === 'seer') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(crystalPulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
          Animated.timing(crystalPulse, { toValue: 1.0, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isNightSeer, myRole]);

  // Hiệu ứng khiên hộ mệnh Bảo Vệ
  useEffect(() => {
    if (isNightBodyguard && myRole === 'bodyguard') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shieldPulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(shieldPulse, { toValue: 1.0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isNightBodyguard, myRole]);

  // Nhịp đập đồng hồ khi thời gian < 5s
  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [timeLeft]);

  // Bảo vệ chọn người để bảo vệ đêm nay
  const handleBodyguardTarget = (targetId) => {
    if (!amAlive || myRole !== 'bodyguard' || !isNightBodyguard) return;
    if (targetId === lastProtectedTarget) return;
    setSelectedTarget(targetId);
    setBodyguardTarget(targetId);
    setBodyguardSkipped(false);
    socket.emit('bodyguard-protect', { targetId });
  };

  // Bảo vệ bỏ lượt đêm nay
  const handleBodyguardSkip = () => {
    if (!amAlive || myRole !== 'bodyguard' || !isNightBodyguard) return;
    setSelectedTarget(null);
    setBodyguardTarget(null);
    setBodyguardSkipped(true);
    socket.emit('bodyguard-skip');
  };

  // Sói vote cắn (YÊU CẦU: Sói không thể cắn nhau và không thể tự cắn mình)
  const handleWolfTarget = (targetId) => {
    if (!amAlive || myRole !== 'wolf' || !isNightWolf) return;
    const targetPlayer = players.find((p) => p.id === targetId);
    if (!targetPlayer || targetPlayer.role === 'wolf' || targetId === myId) return;
    const currentVote = wolfVotes[myId];
    const newTarget = currentVote === targetId ? null : targetId;
    setSelectedTarget(newTarget);
    socket.emit('wolf-kill', { targetId: newTarget });
  };

  // Phù Thủy chọn Cứu hoặc Bỏ Mặc nạn nhân bị Sói cắn
  const handleWitchHealChoice = (save) => {
    setWitchPendingSave(save);
    // Khóa ngay lập tức quyết định Cứu lên server để không bao giờ bị mất nạn nhân được cứu!
    socket.emit('witch-heal-action', { save });
    if (save) {
      setWitchState((prev) => (prev ? { ...prev, hasHeal: false } : prev));
    }
    // Hỏi phù thủy có muốn dùng thuốc độc không nếu còn bình độc
    if (witchState?.hasPoison) {
      setWitchStep('ask_poison');
    } else {
      setWitchStep('done');
      socket.emit('witch-action', { save, poisonTargetId: null });
    }
  };

  // Phù Thủy chọn người để ném thuốc độc (Hỗ trợ chọn hoặc tự do đổi người ném độc trong suốt đêm đó)
  const handleWitchPoisonTarget = (targetId) => {
    if (!amAlive || myRole !== 'witch' || !isNightWitch || witchStep !== 'poison') return;
    if (targetId === myId) return; // Phù thủy KHÔNG được phép bỏ độc chính mình!
    setWitchPendingPoison(targetId);
    socket.emit('witch-action', {
      save: witchPendingSave !== null ? witchPendingSave : false,
      poisonTargetId: targetId,
    });
  };

  // Phù Thủy bỏ qua không dùng bình độc
  const handleWitchSkipPoison = () => {
    setWitchPendingPoison(null);
    setWitchStep('done');
    socket.emit('witch-action', {
      save: witchPendingSave !== null ? witchPendingSave : false,
      poisonTargetId: null,
    });
  };

  // Tiên tri soi
  const handleSeerTarget = (targetId) => {
    if (!amAlive || myRole !== 'seer' || !isNightSeer || seerResult) return;
    setSelectedTarget(targetId);
    setIlluminatedPlayerId(targetId);
    socket.emit('seer-check', { targetId });
  };

  // Người Thổi Sáo chọn người để thôi miên đêm nay
  const handlePiedPiperTarget = (targetId) => {
    if (!amAlive || myRole !== 'pied_piper' || !isNightPiedPiper || piedPiperConfirmed) return;
    let updated;
    if (selectedPiedPiperTargets.includes(targetId)) {
      updated = selectedPiedPiperTargets.filter((id) => id !== targetId);
    } else {
      if (selectedPiedPiperTargets.length < charmCountRequired) {
        updated = [...selectedPiedPiperTargets, targetId];
      } else {
        // Đổi mục tiêu gần nhất
        updated = [...selectedPiedPiperTargets.slice(1), targetId];
      }
    }
    setSelectedPiedPiperTargets(updated);
    setPiedPiperSkipped(false);
    socket.emit('pied-piper-target', { targets: updated, targetIds: updated });
  };

  // Người Thổi Sáo chốt thôi miên mục tiêu
  const handlePiedPiperConfirmCharm = () => {
    if (!amAlive || myRole !== 'pied_piper' || !isNightPiedPiper || piedPiperConfirmed) return;
    if (selectedPiedPiperTargets.length === 0) return;
    socket.emit('pied-piper-charm', { targets: selectedPiedPiperTargets, targetIds: selectedPiedPiperTargets });
    setPiedPiperConfirmed(true);
    setPiedPiperModalVisible(true);
  };

  // Người Thổi Sáo bỏ qua lượt
  const handlePiedPiperSkip = () => {
    if (!amAlive || myRole !== 'pied_piper' || !isNightPiedPiper || piedPiperConfirmed) return;
    setSelectedPiedPiperTargets([]);
    setPiedPiperSkipped(true);
    socket.emit('pied-piper-skip');
  };

  // 💘 Thần Tình Yêu Cupid chọn 2 người để ghép đôi
  const handleCupidTarget = (targetId) => {
    if (!amAlive || myRole !== 'cupid' || !isNightCupid || cupidConfirmed) return;
    let updated;
    if (selectedCupidTargets.includes(targetId)) {
      updated = selectedCupidTargets.filter((id) => id !== targetId);
    } else {
      if (selectedCupidTargets.length < 2) {
        updated = [...selectedCupidTargets, targetId];
      } else {
        // Đổi mục tiêu thứ 2
        updated = [selectedCupidTargets[0], targetId];
      }
    }
    setSelectedCupidTargets(updated);
  };

  const handleCupidConfirm = () => {
    if (!amAlive || myRole !== 'cupid' || !isNightCupid || cupidConfirmed) return;
    if (selectedCupidTargets.length < 2) return;
    socket.emit('cupid-choose-couple', { targets: selectedCupidTargets, targetIds: selectedCupidTargets });
    setCupidConfirmed(true);
  };

  // Vote treo cổ ban ngày (hỗ trợ chọn mục tiêu hoặc 'skip' để bỏ phiếu trắng)
  const handleDayVote = (targetId) => {
    if (!amAlive || phase !== PHASES.DAY_VOTE) return;
    const newTarget = dayVoteTarget === targetId ? null : targetId;
    setDayVoteTarget(newTarget);
    socket.emit('day-vote', { targetId: newTarget });
  };

  // Chủ phòng tua nhanh Thảo Luận chuyển sang Vote
  const handleHostSkipDiscussion = () => {
    if (!isHost || phase !== PHASES.DAY_DISCUSSION) return;
    socket.emit('host-skip-discussion');
  };

  // Chủ phòng bỏ qua nhanh giai đoạn Vote
  const handleHostSkipVote = () => {
    if (!isHost || phase !== PHASES.DAY_VOTE) return;
    socket.emit('host-skip-vote');
  };

  const getPhaseTitle = () => {
    switch (phase) {
      case PHASES.NIGHT_BODYGUARD:
        return `🛡️ Bảo Vệ Thức Giấc - Hiệp ${round}`;
      case PHASES.NIGHT_WOLF:
        return `🐺 Đêm Sói Săn - Hiệp ${round}`;
      case PHASES.NIGHT_WITCH:
        return `🧙‍♀️ Phù Thủy Hành Động - Hiệp ${round}`;
      case PHASES.NIGHT_SEER:
        return `🔮 Tiên Tri Soi - Hiệp ${round}`;
      case PHASES.NIGHT_PIED_PIPER:
        return `🎶 Người Thổi Sáo Thức Giấc - Hiệp ${round}`;
      case PHASES.NIGHT_CHARMED_REVEAL:
        return (me?.isSelfCharmed || myRole === 'pied_piper') ? `🎶 Hội Thôi Miên Thức Giấc (5s)` : `🌙 Ban Đêm - Hiệp ${round}`;
      case PHASES.NIGHT:
        return `🌙 Ban Đêm - Hiệp ${round}`;
      case PHASES.DAY_ANNOUNCE:
        return `☀️ Bình Minh - Hiệp ${round}`;
      case PHASES.DAY_DISCUSSION:
        return `🗣️ Thảo Luận - Hiệp ${round}`;
      case PHASES.DAY_VOTE:
        return `⚖️ Bỏ Phiếu Treo Cổ - Hiệp ${round}`;
      case PHASES.HUNTER_SHOT:
        return `🏹 Phát Súng Trăn Trối Của Thợ Săn`;
      case PHASES.GAME_OVER:
        return `🏆 Trận Đấu Kết Thúc`;
      default:
        return 'Ma Sói';
    }
  };

  return (
    <ImageBackground
      source={require('../assets/village_bg.jpg')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      {/* Lớp phủ Glassmorphism bóng tối theo pha */}
      <View style={[styles.darkOverlay, isNight ? styles.overlayNight : styles.overlayDay]}>
        <SafeAreaView style={styles.safeArea}>
          {/* ================= HEADER TRẬN ĐẤU ================= */}
          <View style={[styles.header, isMobile && styles.headerMobile]}>
            {/* Vai trò của mình & Kho bình thuốc Phù Thủy */}
            <View style={[styles.headerLeftGroup, isMobile && styles.headerLeftGroupMobile]}>
              <TouchableOpacity
                style={[styles.myRoleBadge, isMobile && styles.myRoleBadgeMobile, { backgroundColor: getRoleColor(myRole) + '35', borderColor: getRoleColor(myRole) }]}
                onPress={() => setShowRoleBrief(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.myRoleEmoji, isMobile && { fontSize: 14, marginRight: 3 }]}>{getRoleEmoji(myRole)}</Text>
                <Text style={[styles.myRoleText, isMobile && { fontSize: 11.5 }]}>{getRoleName(myRole)}</Text>
                {!amAlive && <Text style={[styles.deadLabel, isMobile && { fontSize: 10 }]}> (Chết)</Text>}
              </TouchableOpacity>

              {/* Kho bình thuốc mini bên cạnh role (Chỉ 2 màu: Xanh & Tím, dùng thì mất màu) */}
              {myRole === 'witch' && amAlive && (
                <View style={[styles.witchMiniPotionBar, isMobile && styles.witchMiniPotionBarMobile]}>
                  {/* Bình Cứu (Xanh) */}
                  <View
                    style={[
                      styles.witchMiniPotionSlot,
                      isMobile && styles.witchMiniPotionSlotMobile,
                      witchState?.hasHeal
                        ? styles.witchMiniPotionHealActive
                        : styles.witchMiniPotionSpent,
                    ]}
                  >
                    <Image
                      source={require('../assets/potion_heal.png')}
                      style={[
                        styles.witchMiniPotionIcon,
                        isMobile && styles.witchMiniPotionIconMobile,
                        !witchState?.hasHeal && styles.witchMiniPotionIconSpent,
                      ]}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Bình Độc (Tím) */}
                  <View
                    style={[
                      styles.witchMiniPotionSlot,
                      isMobile && styles.witchMiniPotionSlotMobile,
                      witchState?.hasPoison
                        ? styles.witchMiniPotionPoisonActive
                        : styles.witchMiniPotionSpent,
                    ]}
                  >
                    <Image
                      source={require('../assets/potion_poison.png')}
                      style={[
                        styles.witchMiniPotionIcon,
                        isMobile && styles.witchMiniPotionIconMobile,
                        !witchState?.hasPoison && styles.witchMiniPotionIconSpent,
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Tiêu đề & Đồng hồ */}
            <View style={styles.phaseInfo}>
              <Text style={[styles.phaseTitle, isMobile && styles.phaseTitleMobile]} numberOfLines={1}>{getPhaseTitle()}</Text>
              {phase !== PHASES.GAME_OVER && (
                <Animated.View style={[styles.timerBadge, isMobile && styles.timerBadgeMobile, { transform: [{ scale: pulseAnim }] }]}>
                  <Text style={[styles.timerText, isMobile && { fontSize: 11 }]}>⏳ {timeLeft}s</Text>
                </Animated.View>
              )}
            </View>

            {/* Nút thao tác góc phải */}
            <View style={styles.headerRightActions}>
              {/* Chủ phòng tua nhanh Thảo Luận để sang Bỏ Phiếu */}
              {isHost && phase === PHASES.DAY_DISCUSSION && (
                <TouchableOpacity
                  style={[styles.hostSkipBtn, isMobile && styles.hostSkipBtnMobile]}
                  onPress={handleHostSkipDiscussion}
                  activeOpacity={0.7}
                >
                  <Text style={styles.hostSkipIcon}>⏩</Text>
                  <Text style={[styles.hostSkipText, isMobile && { fontSize: 11 }]}>Bỏ qua thảo luận</Text>
                </TouchableOpacity>
              )}

              {/* Chủ phòng chốt nhanh giai đoạn Vote */}
              {isHost && phase === PHASES.DAY_VOTE && (
                <TouchableOpacity
                  style={[styles.hostSkipBtn, isMobile && styles.hostSkipBtnMobile]}
                  onPress={handleHostSkipVote}
                  activeOpacity={0.7}
                >
                  <Text style={styles.hostSkipIcon}>⏩</Text>
                  <Text style={[styles.hostSkipText, isMobile && { fontSize: 11 }]}>Chốt Vote</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.leaveButton, isMobile && styles.leaveButtonMobile]} onPress={onLeaveGame} activeOpacity={0.7}>
                <Text style={[styles.leaveText, isMobile && { fontSize: 11 }]}>Rời</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ================= KHUNG CHÍNH (CHIA ĐÔI: BÀN CHƠI DISCORD BÊN TRÁI, CHAT BÊN PHẢI) ================= */}
          <View style={styles.splitLayout}>
            {/* ---------------- CỘT BÊN TRÁI: ĐẤU TRƯỜNG & DISCORD TILES ---------------- */}
            <View style={styles.arenaColumn}>
            <ScrollView
              style={styles.arenaScroll}
              contentContainerStyle={styles.arenaScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* --- DANH SÁCH NGƯỜI CHƠI DẠNG DISCORD VOICE BOXES --- */}
              <View style={styles.discordSection}>
                <View style={styles.discordSectionHeader}>
                  <Text style={styles.discordSectionTitle}>
                    🎙️ THÀNH VIÊN TRONG LÀNG ({alivePlayers.length}/{players.length} SỐNG)
                  </Text>
                  <Text style={styles.discordSectionHint}>
                    {phase === PHASES.DAY_VOTE ? 'Bấm vào ô để vote' : isNight ? 'Bấm vào ô để chọn' : 'Đang thảo luận'}
                  </Text>
                </View>

                {/* Banner 5s Hội Thôi Miên tỉnh giấc nhận biết nhau trước rạng đông (Phương Án 1) */}
                {isNightCharmedReveal && (me?.isSelfCharmed || myRole === 'pied_piper') && (
                  <View style={styles.charmedRevealBanner}>
                    <Text style={styles.charmedRevealEmoji}>🎶✨</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.charmedRevealTitle}>HỘI THÔI MIÊN TỈNH GIẤC (5S)</Text>
                      <Text style={styles.charmedRevealSub}>
                        {myRole === 'pied_piper'
                          ? 'Những kẻ trúng bùa mê đang mở mắt nhìn thấy nhau trong 5 giây trước bình minh!'
                          : 'Bạn và những người chịu chung bùa mê đang hé mắt nhìn thấy nhau trong 5 giây!'}
                      </Text>
                    </View>
                    <View style={styles.charmedRevealTimerBadge}>
                      <Text style={styles.charmedRevealTimerText}>⏳ {timeLeft}s</Text>
                    </View>
                  </View>
                )}

                {/* Banner Thông Báo Thanh Tẩy Hoàng Kim trực tiếp trên màn hình chính khi Người Thổi Sáo chết */}
                {livePurificationBanner && (
                  <View style={styles.livePurificationBannerContainer}>
                    <Text style={styles.livePurificationBannerEmoji}>✨☀️✨</Text>
                    <View style={{ flex: 1 }}>
                      <View style={styles.livePurificationHeaderRow}>
                        <View style={styles.livePurificationTagBadge}>
                          <Text style={styles.livePurificationTagText}>THANH TẨY HOÀNG KIM</Text>
                        </View>
                        <Text style={styles.livePurificationHeaderTitle}>Bùa Mê Đã Bị Xóa Bỏ!</Text>
                      </View>
                      <Text style={styles.livePurificationBannerMessage}>
                        ✨ [THANH TẨY HOÀNG KIM]: Người Thổi Sáo đã bị tiêu diệt! Tiếng sáo ma thuật tan biến — Ánh sáng hoàng kim thanh tẩy rực rỡ, xóa bỏ toàn bộ bùa mê!
                      </Text>
                    </View>
                  </View>
                )}

                {/* Banner Tình Yêu Vĩnh Hằng cho Cặp Đôi nhìn thấy vai trò của nhau để tương trợ */}
                {(() => {
                  const loverPlayer = players.find((p) => p.isLover);
                  const partnerRole = loverPlayer?.role || me?.partnerRole || coupleDataState?.find((c) => c.id !== myId)?.role;
                  const partnerName = loverPlayer?.name || me?.partnerName || coupleDataState?.find((c) => c.id !== myId)?.name;
                  if (!me?.inCouple || !partnerName) return null;

                  const isForbiddenWolfCouple =
                    (myRole === 'wolf' && partnerRole && partnerRole !== 'wolf') ||
                    (myRole !== 'wolf' && partnerRole === 'wolf');
                  const isPiedPiperCouple = myRole === 'pied_piper' || partnerRole === 'pied_piper';

                  return (
                    <View
                      style={[
                        styles.coupleSupportBanner,
                        isForbiddenWolfCouple && styles.coupleSupportBannerWolf,
                        isPiedPiperCouple && styles.coupleSupportBannerPiper,
                      ]}
                    >
                      <Text style={styles.coupleSupportEmoji}>
                        {isForbiddenWolfCouple ? '🐺💘' : isPiedPiperCouple ? '🎶💘' : '💑✨'}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.coupleSupportTitle}>
                          LIÊN KẾT TÌNH YÊU VỚI {partnerName.toUpperCase()}{' '}
                          {partnerRole ? `• ${getRoleEmoji(partnerRole)} ${getRoleName(partnerRole).toUpperCase()}` : ''}
                        </Text>
                        <Text style={styles.coupleSupportSub}>
                          {isForbiddenWolfCouple
                            ? '🔥 Tình yêu cấm kỵ Sói & Người! Hai bạn tạo thành Phe Cặp Đôi riêng biệt — Hãy tương trợ và bảo vệ nhau sống sót đến cuối cùng!'
                            : isPiedPiperCouple
                            ? '🎶 Tiếng sáo quyện duyên tơ hồng! Hãy che chở cho nhau trước cả Dân Làng lẫn Ma Sói (1 người chết, người kia sẽ tuẫn tình theo)!'
                            : '💞 Hai bạn đã biết rõ thân phận của nhau — Hãy phối hợp kỹ năng và bảo vệ nửa kia (nếu 1 người ngã xuống, người kia sẽ chết theo)!'}
                        </Text>
                      </View>
                    </View>
                  );
                })()}

                <View style={styles.discordGrid}>
                  {players.map((player) => {
                    const isMe = player.id === myId;
                    const isAlive = player.alive !== false;
                    const isMyWolfTarget = isNightWolf && myRole === 'wolf' && (wolfVotes[myId] === player.id || selectedTarget === player.id);
                    const isMyBodyguardTarget = isNightBodyguard && myRole === 'bodyguard' && (bodyguardTarget === player.id || selectedTarget === player.id);
                    const isMyPoisonTarget = isNightWitch && myRole === 'witch' && witchPendingPoison === player.id;
                    const isMyHunterTarget = isHunterShot && isMeActiveHunter && hunterShotTargetId === player.id;
                    const isMyPiedPiperTarget = isNightPiedPiper && myRole === 'pied_piper' && selectedPiedPiperTargets.includes(player.id);
                    const isMyCupidTarget = isNightCupid && myRole === 'cupid' && selectedCupidTargets.includes(player.id);
                    const isTarget = isMyWolfTarget || dayVoteTarget === player.id || (isNightSeer && selectedTarget === player.id) || isMyBodyguardTarget || isMyPoisonTarget || isMyHunterTarget || isMyPiedPiperTarget || isMyCupidTarget;
                    const votes = dayVoteCount[player.id] || 0;
                    const voters = dayVoterMap[player.id] || [];

                    // Sói teammates (nhận biết đồng minh ở mọi pha trong trận)
                    const isWolfTeammate = myRole === 'wolf' && player.role === 'wolf';
                    const wolfVoters = Object.entries(wolfVotes)
                      .filter(([_, tid]) => tid === player.id)
                      .map(([wid]) => players.find((p) => p.id === wid)?.name || 'Sói');

                    // Điều kiện chọn của Bảo Vệ: Không thể bảo vệ cùng 1 người 2 đêm liên tiếp!
                    const isLastProtected = isNightBodyguard && myRole === 'bodyguard' && player.id === lastProtectedTarget;
                    const canBodyguardTarget = isNightBodyguard && myRole === 'bodyguard' && amAlive && isAlive && !isLastProtected;

                    // Điều kiện bấm vào ô (Sói không thể cắn nhau và không tự cắn mình)
                    const canVoteDay = phase === PHASES.DAY_VOTE && amAlive && isAlive;
                    const canWolfTarget = isNightWolf && myRole === 'wolf' && amAlive && isAlive && !isWolfTeammate && !isMe;
                    const canSeerTarget = isNightSeer && myRole === 'seer' && amAlive && isAlive && !isMe && !seerResult;
                    const canWitchPoisonTarget = isNightWitch && myRole === 'witch' && amAlive && isAlive && !isMe && witchStep === 'poison';
                    const canHunterTarget = isHunterShot && isMeActiveHunter && isAlive && !isMe;
                    const canPiedPiperTarget = isNightPiedPiper && myRole === 'pied_piper' && amAlive && isAlive && !isMe && !charmedHistory[player.id];
                    const canCupidTarget = isNightCupid && myRole === 'cupid' && amAlive && isAlive && !isMe && !cupidConfirmed;
                    const isClickable = canVoteDay || canWolfTarget || canSeerTarget || canBodyguardTarget || canWitchPoisonTarget || canHunterTarget || canPiedPiperTarget || canCupidTarget;

                    const isCharmedHighlight = player.charmed || (myRole === 'pied_piper' && charmedHistory[player.id]);
                    const isPurifyingLive = purifyingVictimIds.includes(player.id);

                    return (
                      <TouchableOpacity
                        key={player.id}
                        style={[
                          styles.discordBox,
                          { flexBasis: boxWidthPercent, maxWidth: boxWidthPercent },
                          isMobile && styles.discordBoxMobile,
                          isCompact && styles.discordBoxCompact,
                          isUltraCompact && styles.discordBoxUltraCompact,
                          isClickable && styles.discordBoxClickable,
                          isTarget && styles.discordBoxSelected,
                          isMyHunterTarget && styles.discordBoxHunterTarget,
                          isMyPiedPiperTarget && styles.discordBoxPiedPiperTarget,
                          isMyCupidTarget && { borderColor: '#F472B6', backgroundColor: 'rgba(236, 72, 153, 0.25)' },
                          player.inCouple && { borderColor: '#EC4899' },
                          isCharmedHighlight && !isPurifyingLive && styles.discordBoxCharmed,
                          isPurifyingLive && styles.discordBoxPurifyingGolden,
                          !isAlive && styles.discordBoxDead,
                          isLastProtected && styles.discordBoxDisabled,
                        ]}
                        disabled={!isClickable}
                        onPress={() => {
                          if (canVoteDay) handleDayVote(player.id);
                          else if (canWolfTarget) handleWolfTarget(player.id);
                          else if (canSeerTarget) handleSeerTarget(player.id);
                          else if (canBodyguardTarget) handleBodyguardTarget(player.id);
                          else if (canWitchPoisonTarget) handleWitchPoisonTarget(player.id);
                          else if (canHunterTarget) setHunterShotTargetId(player.id);
                          else if (canPiedPiperTarget) handlePiedPiperTarget(player.id);
                          else if (canCupidTarget) handleCupidTarget(player.id);
                        }}
                        activeOpacity={0.8}
                      >
                        {/* Status bar trên cùng của ô Discord */}
                        <View style={[styles.discordTileTopRow, isCompact && styles.discordTileTopRowCompact]}>
                          <View
                            style={[
                              styles.discordStatusDot,
                              isAlive ? styles.statusOnline : styles.statusOffline,
                              isCompact && { width: 6, height: 6, borderRadius: 3 },
                            ]}
                          />
                          {isMe && (
                            <View style={[styles.discordMeTag, isCompact && styles.discordMeTagCompact]}>
                              <Text style={[styles.discordMeTagText, isCompact && { fontSize: 8 }]}>Bạn</Text>
                            </View>
                          )}
                          {player.inCouple && (
                            <View style={[styles.discordCoupleTag, isCompact && styles.discordCoupleTagCompact]}>
                              <Text style={[styles.discordCoupleTagText, isCompact && { fontSize: 8 }]}>
                                {player.isLover ? '💘 Người yêu' : '💑 Cặp Đôi'}
                              </Text>
                            </View>
                          )}
                          {isWolfTeammate && !isMe && (
                            <View style={[styles.discordWolfTeammateTag, isCompact && styles.discordWolfTeammateTagCompact]}>
                              <Text style={[styles.discordWolfTeammateText, isCompact && { fontSize: 8 }]}>🐺 Sói</Text>
                            </View>
                          )}
                          {isLastProtected && (
                            <View style={[styles.discordProtectedTag, isCompact && styles.discordProtectedTagCompact]}>
                              <Text style={[styles.discordProtectedTagText, isCompact && { fontSize: 8 }]}>🚫 Đêm trước</Text>
                            </View>
                          )}
                          {isMyBodyguardTarget && (
                            <View style={[styles.discordShieldTag, isCompact && styles.discordShieldTagCompact]}>
                              <Text style={[styles.discordShieldTagText, isCompact && { fontSize: 8 }]}>🛡️ Che chở</Text>
                            </View>
                          )}
                          {isMyPoisonTarget && (
                            <View style={[styles.discordPoisonTag, isCompact && styles.discordPoisonTagCompact]}>
                              <Text style={[styles.discordPoisonTagText, isCompact && { fontSize: 8 }]}>☠️ Ném Độc</Text>
                            </View>
                          )}
                          {isMyPiedPiperTarget && (
                            <View style={[styles.discordCharmedTag, isCompact && styles.discordCharmedTagCompact]}>
                              <Text style={[styles.discordCharmedTagText, isCompact && { fontSize: 8 }]}>🎶 Thôi miên</Text>
                            </View>
                          )}
                          {isMyCupidTarget && (
                            <View style={[styles.discordCupidTag, isCompact && styles.discordCupidTagCompact]}>
                              <Text style={[styles.discordCupidTagText, isCompact && { fontSize: 8 }]}>💘 Ghép Đôi</Text>
                            </View>
                          )}
                          {/* Checkbox indicator trực quan */}
                          {isClickable && (
                            <View
                              style={[
                                styles.discordCheckboxPill,
                                isTarget && styles.discordCheckboxPillChecked,
                                isCompact && { paddingHorizontal: 3, paddingVertical: 0 },
                              ]}
                            >
                              <Text style={[styles.discordCheckboxIcon, isCompact && { fontSize: 9.5 }]}>
                                {isTarget ? '☑️' : '⬜'}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Avatar người chơi (Size to hơn 100% diện tích) */}
                        <View style={[styles.discordAvatarCenter, isCompact && styles.discordAvatarCenterCompact]}>
                          <PlayerAvatar
                            player={player}
                            size={isCompact ? 'medium' : 'large'}
                            isIlluminated={illuminatedPlayerId === player.id}
                            selected={isTarget}
                            compact
                          />
                        </View>

                        {/* ================= HIỂN THỊ CÁC LƯỢT VOTE Ở DƯỚI AVT ================= */}
                        {phase === PHASES.DAY_VOTE && votes > 0 && (
                          <View style={[styles.discordVoteRowUnderAvt, isCompact && { marginTop: 2, marginBottom: 1 }]}>
                            <View style={[styles.discordVoteBadge, isCompact && { paddingHorizontal: 5, paddingVertical: 1 }]}>
                              <Text style={[styles.discordVoteBadgeText, isCompact && { fontSize: 10 }]}>🗳️ {votes} phiếu</Text>
                            </View>
                            {voters.length > 0 && (
                              <View style={[styles.discordVotersMini, isCompact && { gap: 1, marginTop: 2 }]}>
                                {voters.map((v, i) => {
                                  const isCustom = typeof v.avatar === 'string' && (v.avatar.startsWith('data:') || v.avatar.startsWith('http') || v.avatar.startsWith('blob:') || v.avatar.length > 25);
                                  return isCustom ? (
                                    <Image
                                      key={`${v.id}-${i}`}
                                      source={{ uri: v.avatar }}
                                      style={{ width: isCompact ? 12 : 14, height: isCompact ? 12 : 14, borderRadius: isCompact ? 6 : 7 }}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <Text key={`${v.id}-${i}`} style={[styles.discordVoterEmoji, isCompact && { fontSize: 10 }]}>
                                      {v.avatar || '👤'}
                                    </Text>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        )}

                        {/* Phiếu Sói ban đêm dưới avatar */}
                        {isNightWolf && myRole === 'wolf' && wolfVoters.length > 0 && (
                          <View style={[styles.discordWolfVoteRow, isCompact && { paddingHorizontal: 4, paddingVertical: 1, marginTop: 2 }]}>
                            <Text style={[styles.discordWolfVoteText, isCompact && { fontSize: 8.5 }]}>🐺 {wolfVoters.join(', ')}</Text>
                          </View>
                        )}

                        {/* Mục tiêu trúng độc của Phù Thủy */}
                        {isMyPoisonTarget && (
                          <View style={[styles.discordPoisonTargetBadge, isCompact && { paddingHorizontal: 4, paddingVertical: 1, marginTop: 2 }]}>
                            <Text style={[styles.discordPoisonTargetText, isCompact && { fontSize: 8.5 }]}>☠️ Mục tiêu ném độc</Text>
                          </View>
                        )}

                        {/* Mục tiêu khóa bắn của Thợ Săn */}
                        {isMyHunterTarget && (
                          <View style={[styles.discordHunterTargetBadge, isCompact && { paddingHorizontal: 4, paddingVertical: 1, marginTop: 2 }]}>
                            <Text style={[styles.discordHunterTargetText, isCompact && { fontSize: 8.5 }]}>🏹💥 Mục tiêu ngắm bắn</Text>
                          </View>
                        )}

                        {/* Tên người chơi pill */}
                        <View style={[styles.discordNamePill, isMe && styles.discordNamePillMe, isCompact && styles.discordNamePillCompact]}>
                          <Text style={[styles.discordNameText, isCompact && styles.discordNameTextCompact]} numberOfLines={1}>
                            {player.name}
                          </Text>
                        </View>

                        {/* ================= HIỂN THỊ VAI TRÒ NGƯỜI YÊU DƯỚI TÊN ĐỂ TƯƠNG TRỢ LẪN NHAU ================= */}
                        {player.isLover && (
                          <View
                            style={[
                              styles.loverRoleBadgeUnderName,
                              player.role === 'wolf' && styles.loverRoleBadgeUnderNameWolf,
                              player.role === 'pied_piper' && styles.loverRoleBadgeUnderNamePiper,
                              isCompact && styles.loverRoleBadgeUnderNameCompact,
                            ]}
                          >
                            <Text
                              style={[
                                styles.loverRoleBadgeUnderNameText,
                                player.role === 'wolf' && styles.loverRoleBadgeUnderNameTextWolf,
                                player.role === 'pied_piper' && styles.loverRoleBadgeUnderNameTextPiper,
                                isCompact && { fontSize: 8.5 },
                              ]}
                              numberOfLines={1}
                            >
                              {player.role
                                ? `💘 NGƯỜI YÊU • ${getRoleEmoji(player.role)} ${getRoleName(player.role).toUpperCase()}`
                                : '💘 NGƯỜI YÊU CỦA BẠN'}
                            </Text>
                          </View>
                        )}

                        {isMe && player.inCouple && (
                          <View
                            style={[
                              styles.loverSelfBadgeUnderName,
                              isCompact && styles.loverRoleBadgeUnderNameCompact,
                            ]}
                          >
                            <Text
                              style={[
                                styles.loverSelfBadgeUnderNameText,
                                isCompact && { fontSize: 8.5 },
                              ]}
                              numberOfLines={1}
                            >
                              💑 UYÊN ƯƠNG VỚI {(player.partnerName || players.find((p) => p.isLover)?.name || 'NGƯỜI YÊU').toUpperCase()}
                            </Text>
                          </View>
                        )}

                        {myRole === 'cupid' && player.inCouple && !isMe && !player.isLover && (
                          <View
                            style={[
                              styles.loverSelfBadgeUnderName,
                              isCompact && styles.loverRoleBadgeUnderNameCompact,
                            ]}
                          >
                            <Text
                              style={[
                                styles.loverSelfBadgeUnderNameText,
                                isCompact && { fontSize: 8.5 },
                              ]}
                              numberOfLines={1}
                            >
                              💘 CẶP ĐÔI ĐÃ GHÉP
                            </Text>
                          </View>
                        )}

                        {/* ================= HIỂN THỊ ĐỒNG MINH SÓI DƯỚI TÊN ================= */}
                        {myRole === 'wolf' && player.role === 'wolf' && (
                          <View
                            style={[
                              styles.wolfTeammateBadgeUnderName,
                              isMe && styles.wolfTeammateBadgeUnderNameMe,
                              isCompact && styles.wolfTeammateBadgeUnderNameCompact,
                            ]}
                          >
                            <Text
                              style={[
                                styles.wolfTeammateBadgeUnderNameText,
                                isCompact && { fontSize: 8.5 },
                              ]}
                              numberOfLines={1}
                            >
                              {isMe ? '🐺 BẠN LÀ SÓI' : '🐺 ĐỒNG MINH SÓI'}
                            </Text>
                          </View>
                        )}

                        {/* ================= HIỂN THỊ THIỆN HOẶC ÁC DƯỚI TÊN CHO TIÊN TRI ================= */}
                        {myRole === 'seer' && seerHistory[player.id] && (
                          <View
                            style={[
                              styles.seerCheckedBadge,
                              seerHistory[player.id].alignment === 'evil'
                                ? styles.seerCheckedBadgeEvil
                                : styles.seerCheckedBadgeGood,
                              isCompact && styles.seerCheckedBadgeCompact,
                            ]}
                          >
                            <Text
                              style={[
                                styles.seerCheckedBadgeText,
                                seerHistory[player.id].alignment === 'evil'
                                  ? styles.seerCheckedTextEvil
                                  : styles.seerCheckedTextGood,
                                isCompact && { fontSize: 8.5, letterSpacing: 0.2 },
                              ]}
                            >
                              {seerHistory[player.id].alignment === 'evil' ? '🐺 PHE ÁC' : '🕊️ PHE THIỆN'}
                            </Text>
                          </View>
                        )}

                        {/* ================= HIỂN THỊ THANH TẨY TRỰC TIẾP TRÊN MÀN HÌNH CHÍNH ================= */}
                        {isPurifyingLive ? (
                          <View
                            style={[
                              styles.purifiedLiveBadgeUnderName,
                              isCompact && styles.purifiedLiveBadgeUnderNameCompact,
                            ]}
                          >
                            <Text
                              style={[
                                styles.purifiedLiveBadgeUnderNameText,
                                isCompact && { fontSize: 8.5, letterSpacing: 0.2 },
                              ]}
                            >
                              ✨ ĐÃ THANH TẨY
                            </Text>
                          </View>
                        ) : (
                          <>
                            {/* ================= HIỂN THỊ ĐÃ THÔI MIÊN DƯỚI TÊN CHO NGƯỜI THỔI SÁO ================= */}
                            {myRole === 'pied_piper' && (charmedHistory[player.id] || player.charmed) && (
                              <View
                                style={[
                                  styles.charmedBadgeUnderName,
                                  isCompact && styles.charmedBadgeUnderNameCompact,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.charmedBadgeUnderNameText,
                                    isCompact && { fontSize: 8.5, letterSpacing: 0.2 },
                                  ]}
                                >
                                  🎶 ĐÃ THÔI MIÊN
                                </Text>
                              </View>
                            )}

                            {/* ================= HIỂN THỊ TRONG PHA 5S RẠNG SÁNG CHO NHỮNG NGƯỜI CÙNG BỊ THÔI MIÊN (PHƯƠNG ÁN 1) ================= */}
                            {isNightCharmedReveal && player.charmed && myRole !== 'pied_piper' && me?.isSelfCharmed && (
                              <View
                                style={[
                                  styles.charmedRevealBadgeUnderName,
                                  isCompact && styles.charmedRevealBadgeUnderNameCompact,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.charmedRevealBadgeUnderNameText,
                                    isCompact && { fontSize: 8.5, letterSpacing: 0.2 },
                                  ]}
                                >
                                  🎶 CÙNG BỊ THÔI MIÊN
                                </Text>
                              </View>
                            )}

                            {/* ================= THÔNG BÁO CHO BẢN THÂN NẾU BỊ THÔI MIÊN ================= */}
                            {isMe && player.isSelfCharmed && myRole !== 'pied_piper' && !isNightCharmedReveal && (
                              <View
                                style={[
                                  styles.charmedSelfBadgeUnderName,
                                  isCompact && styles.charmedSelfBadgeUnderNameCompact,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.charmedSelfBadgeUnderNameText,
                                    isCompact && { fontSize: 8.5, letterSpacing: 0.2 },
                                  ]}
                                >
                                  🎶 BẠN ĐÃ BỊ THÔI MIÊN
                                </Text>
                              </View>
                            )}
                          </>
                        )}

                        {/* Trạng thái sống/chết (KHÔNG TIẾT LỘ VAI TRÒ) */}
                        <Text style={[styles.discordStatusLabel, !isAlive && styles.discordStatusLabelDead, isCompact && styles.discordStatusLabelCompact]}>
                          {isAlive ? '🟢 Sống' : '💀 Hồn ma'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

            </ScrollView>

              {/* ================= THANH HÀNH ĐỘNG CỐ ĐỊNH DƯỚI ĐÁY MÀN HÌNH ================= */}
              {(isNightCupid && myRole === 'cupid' && amAlive) || (isNightBodyguard && myRole === 'bodyguard' && amAlive) || (isNightWolf && myRole === 'wolf' && amAlive) || (isNightWitch && myRole === 'witch' && amAlive) || (isNightSeer && myRole === 'seer' && amAlive) || (isNightPiedPiper && myRole === 'pied_piper' && amAlive) || phase === PHASES.DAY_VOTE || isHunterShot ? (
                <View style={[styles.bottomActionBar, isMobile && styles.bottomActionBarMobile]}>
                  {/* --- BANNER HÀNH ĐỘNG CỦA PHA CUPID GHÉP ĐÔI (ĐÊM 1) --- */}
                  {isNightCupid && myRole === 'cupid' && amAlive && (() => {
                    const selectedCount = selectedCupidTargets.length;
                    const targetNames = selectedCupidTargets
                      .map((tid) => players.find((p) => p.id === tid)?.name || 'Người chơi')
                      .join(' ❤️ ');

                    return (
                      <View style={[styles.cupidActionCard, isMobile && { padding: 10 }]}>
                        <View style={styles.cupidActionHeader}>
                          <Text style={{ fontSize: 32 }}>🏹💘</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cupidActionTitle}>THẦN TÌNH YÊU CUPID (ĐÊM 1)</Text>
                            <Text style={styles.cupidActionSub} numberOfLines={2}>
                              {cupidConfirmed
                                ? `Đã kết đôi thành công: ${targetNames}!`
                                : selectedCount === 0
                                ? 'Hãy chạm chọn 2 người chơi trong làng để kết duyên uyên ương'
                                : selectedCount === 1
                                ? `Đã chọn: ${targetNames} (Chọn thêm 1 người nữa)`
                                : `Cặp đôi uyên ương: ${targetNames}`}
                            </Text>
                          </View>
                          <View style={styles.cupidTimerBadge}>
                            <Text style={styles.cupidTimerText}>{timeLeft}s</Text>
                          </View>
                        </View>

                        <View style={styles.cupidActionButtonsRow}>
                          <TouchableOpacity
                            style={[
                              styles.cupidShootBtn,
                              (selectedCount < 2 || cupidConfirmed) && styles.cupidShootBtnDisabled,
                            ]}
                            disabled={selectedCount < 2 || cupidConfirmed}
                            onPress={handleCupidConfirm}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.cupidShootBtnText}>
                              {cupidConfirmed
                                ? 'ĐÃ BẮN TÊN TÌNH ÁI 💘'
                                : `BẮN MŨI TÊN TÌNH ÁI 💘 (${selectedCount}/2)`}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })()}

                  {/* --- BANNER HÀNH ĐỘNG CỦA PHA BẢO VỆ (30S & 5S CHUYỂN TIẾP) --- */}
                  {isNightBodyguard && myRole === 'bodyguard' && amAlive && (() => {
                    const targetPlayer = players.find((p) => p.id === (bodyguardTarget || selectedTarget));

                    return (
                      <View style={styles.bodyguardActionCard}>
                        <View style={styles.bodyguardTopRow}>
                          <Animated.View style={[styles.shieldBallWrap, { transform: [{ scale: shieldPulse }] }]}>
                            <Text style={styles.shieldBallEmoji}>🛡️</Text>
                            <View style={styles.shieldRingAura} />
                          </Animated.View>
                          <View style={styles.bodyguardTextCol}>
                            <Text style={styles.bodyguardActionTitle}>KHIÊN HỘ MỆNH BẢO VỆ (30 GIÂY)</Text>
                            <Text style={styles.bodyguardActionSub}>
                              {targetPlayer
                                ? `Đang che chở cho: ${targetPlayer.name}. (Sẽ chuyển pha trong 5s nếu không đổi người khác)`
                                : bodyguardSkipped
                                ? 'Bạn đã chọn BỎ LƯỢT đêm nay (Sẽ chuyển pha trong 5s)'
                                : 'Bấm vào 1 người để bảo vệ khỏi nanh vuốt Sói đêm nay (Không thể chọn người đêm trước):'}
                            </Text>
                          </View>
                        </View>

                        {/* Nút hành động bỏ lượt / chỉ dẫn đếm ngược */}
                        <View style={styles.bodyguardActionBtnRow}>
                          <TouchableOpacity
                            style={[styles.bodyguardSkipBtn, bodyguardSkipped && styles.bodyguardSkipBtnActive]}
                            onPress={handleBodyguardSkip}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.bodyguardSkipBtnText}>
                              {bodyguardSkipped ? '✅ ĐÃ BỎ LƯỢT ĐÊM NAY' : '🏳️ Bỏ qua lượt bảo vệ'}
                            </Text>
                          </TouchableOpacity>
                          {(bodyguardTarget || bodyguardSkipped) && (
                            <View style={styles.bodyguardCountdownBadge}>
                              <Text style={styles.bodyguardCountdownText}>⏳ Đang chốt: chuyển sau {timeLeft}s</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })()}

                  {/* --- BANNER HÀNH ĐỘNG CỦA PHA SÓI (BẦU CHỌN GIỐNG BAN NGÀY) --- */}
                  {isNightWolf && myRole === 'wolf' && amAlive && (() => {
                    const aliveWolves = players.filter((p) => p.role === 'wolf' && p.alive !== false);
                    const allWolvesVoted = aliveWolves.length > 0 && aliveWolves.every((w) => !!wolfVotes[w.id]);
                    const myTargetId = wolfVotes[myId] || selectedTarget;
                    const myTargetPlayer = players.find((p) => p.id === myTargetId);
    
                    return (
                      <View style={styles.wolfActionCard}>
                        <View style={styles.wolfActionHeader}>
                          <Text style={styles.wolfActionTitle}>🐺 BẦY SÓI BỎ PHIẾU CHỌN MỒI</Text>
                          <Text style={styles.wolfActionSub}>
                            {myTargetPlayer
                              ? `Bạn đang bỏ phiếu cắn: ${myTargetPlayer.name}. (Bấm người khác để đổi phiếu, bấm lại để hủy)`
                              : 'Bấm vào 1 người chơi trên đấu trường để bỏ phiếu cắn:'}
                          </Text>
                        </View>
    
                        {/* Trạng thái bỏ phiếu của đàn Sói */}
                        <View style={styles.wolfVoteStatusRow}>
                          <Text style={styles.wolfVoteStatusText}>
                            🐺 Đã chọn mồi: {Object.keys(wolfVotes).length}/{aliveWolves.length} Sói. Mục tiêu nhận nhiều phiếu nhất sẽ bị cắn khi hết giờ!
                          </Text>
                        </View>

                        {allWolvesVoted && (
                          <View style={styles.allWolvesVotedNotice}>
                            <Text style={styles.allWolvesVotedNoticeText}>
                              ⚡ Tất cả Sói đã chọn mục tiêu! Chuyển pha sau {timeLeft}s...
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {/* --- BANNER HÀNH ĐỘNG CỦA PHA PHÙ THỦY (BÌNH ĐỘC / HOÀN TẤT) --- */}
                  {isNightWitch && myRole === 'witch' && amAlive && (() => {
                    const poisonTargetPlayer = players.find((p) => p.id === witchPendingPoison);

                    if (witchStep === 'poison') {
                      return (
                        <View style={styles.witchActionCard}>
                          <View style={styles.witchActionHeader}>
                            <Image
                              source={require('../assets/potion_poison.png')}
                              style={styles.witchBannerPotionIcon}
                              resizeMode="contain"
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.witchActionTitle}>☠️ BÌNH THUỐC ĐỘC (BẤM VÀO NGƯỜI CHƠI ĐỂ NÉM)</Text>
                              <Text style={styles.witchActionSub}>
                                {poisonTargetPlayer
                                  ? `Đang nhắm độc vào: ${poisonTargetPlayer.name}. (Sẽ chuyển pha trong ${timeLeft}s nếu không đổi người khác)`
                                  : 'Bấm trực tiếp vào 1 người trên đấu trường để ném độc (hoặc bấm Bỏ qua nếu không dùng):'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.witchActionButtonsRow}>
                            {witchPendingPoison && (
                              <TouchableOpacity
                                style={styles.witchPoisonConfirmBtn}
                                onPress={() => setWitchStep('done')}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.witchPoisonConfirmBtnText}>✅ CHỐT MỤC TIÊU</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={styles.witchPoisonSkipBtn}
                              onPress={handleWitchSkipPoison}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.witchPoisonSkipBtnText}>🏳️ BỎ QUA (KHÔNG DÙNG ĐỘC)</Text>
                            </TouchableOpacity>
                            {witchPendingPoison && (
                              <View style={styles.bodyguardCountdownBadge}>
                                <Text style={styles.bodyguardCountdownText}>⏳ Đang chốt: chuyển sau {timeLeft}s</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    }

                    if (witchStep === 'out_of_potions') {
                      return (
                        <View style={styles.witchDoneCard}>
                          <Text style={styles.witchDoneEmoji}>🧙‍♀️✨</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.witchDoneTitle}>BẠN ĐÃ HẾT BÌNH THUỐC ĐÊM NAY</Text>
                            <Text style={styles.witchDoneSub}>
                              {(wolfVictim || witchVictim)
                                ? `Nạn nhân bị cắn đêm nay: ${(wolfVictim || witchVictim).name}. Đang quan sát đêm nay...`
                                : 'Đêm nay không ai bị Sói cắn. Ngôi làng đang yên giấc.'}
                            </Text>
                          </View>
                        </View>
                      );
                    }

                    if (witchStep === 'done') {
                      return (
                        <View style={styles.witchDoneCard}>
                          <Text style={styles.witchDoneEmoji}>🧙‍♀️✨</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.witchDoneTitle}>BẠN ĐÃ HOÀN TẤT PHÉP THUẬT ĐÊM NAY!</Text>
                            <Text style={styles.witchDoneSub}>
                              Đang chờ các vai trò khác hành động...
                            </Text>
                          </View>
                        </View>
                      );
                    }

                    return null;
                  })()}
    
                  {/* --- ANIMATION TIÊN TRI MỚI ĐẲNG CẤP --- */}
                  {isNightSeer && myRole === 'seer' && amAlive && (
                    <View style={styles.seerActionCard}>
                      <Animated.View style={[styles.crystalBallWrap, { transform: [{ scale: crystalPulse }] }]}>
                        <Text style={styles.crystalBallEmoji}>🔮</Text>
                        <View style={styles.crystalRingAura} />
                      </Animated.View>
                      <View style={styles.seerTextCol}>
                        <Text style={styles.seerActionTitle}>MẮT THẦN SOI SÁNG</Text>
                        <Text style={styles.seerActionSub}>
                          {seerResult
                            ? `Kết quả: ${seerResult.alignment === 'evil' ? 'ÁC' : 'THIỆN'}`
                            : 'Bấm vào 1 ô người chơi để nhìn thấu linh hồn họ là Thiện hay Ác:'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* --- BANNER HÀNH ĐỘNG CỦA PHA NGƯỜI THỔI SÁO (PIED PIPER) --- */}
                  {isNightPiedPiper && myRole === 'pied_piper' && amAlive && (() => {
                    const selectedCount = selectedPiedPiperTargets.length;
                    const targetNames = selectedPiedPiperTargets
                      .map((tid) => players.find((p) => p.id === tid)?.name || 'Người chơi')
                      .join(', ');

                    return (
                      <View style={styles.piedPiperActionCard}>
                        <View style={styles.piedPiperActionHeader}>
                          <Image
                            source={require('../assets/flute.png')}
                            style={styles.piedPiperBannerFluteIcon}
                            resizeMode="contain"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.piedPiperActionTitle}>
                              🎶 TIẾNG SÁO MÊ HOẶC ({selectedCount}/{charmCountRequired})
                            </Text>
                            <Text style={styles.piedPiperActionSub}>
                              {piedPiperConfirmed
                                ? `✅ Đã thôi miên: ${targetNames || 'Không ai'}. Đang chờ rạng sáng...`
                                : piedPiperSkipped
                                ? '🏳️ Bạn đã chọn bỏ qua lượt thôi miên đêm nay.'
                                : selectedCount > 0
                                ? `Đang chọn (${selectedCount}/${charmCountRequired}): ${targetNames}. Bấm "THÔI MIÊN" để chốt!`
                                : `Bấm chọn ${charmCountRequired} người chơi còn sống (chưa bị thôi miên) trên bàn chơi:`}
                            </Text>
                          </View>
                          <View style={styles.piedPiperTimerBadge}>
                            <Text style={styles.piedPiperTimerText}>⏳ {timeLeft}s</Text>
                          </View>
                        </View>

                        <View style={styles.piedPiperActionButtonsRow}>
                          <TouchableOpacity
                            style={[
                              styles.piedPiperCharmBtn,
                              (selectedCount === 0 || piedPiperConfirmed) && styles.piedPiperCharmBtnDisabled,
                            ]}
                            disabled={selectedCount === 0 || piedPiperConfirmed}
                            onPress={handlePiedPiperConfirmCharm}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.piedPiperCharmBtnText}>
                              {piedPiperConfirmed
                                ? '✨ ĐÃ CHỐT THÔI MIÊN'
                                : `🎶 THÔI MIÊN (${selectedCount}/${charmCountRequired})`}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.piedPiperSkipBtn,
                              piedPiperConfirmed && styles.piedPiperSkipBtnDisabled,
                            ]}
                            disabled={piedPiperConfirmed}
                            onPress={handlePiedPiperSkip}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.piedPiperSkipBtnText}>
                              {piedPiperSkipped ? '✅ ĐÃ BỎ LƯỢT' : '❌ BỎ QUA'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })()}

                  {/* --- BANNER HÀNH ĐỘNG CỦA PHA THỢ SĂN (HUNTER_SHOT) --- */}
                  {isHunterShot && (() => {
                    const hunterTargetPlayer = players.find((p) => p.id === hunterShotTargetId);

                    if (isMeActiveHunter) {
                      return (
                        <View style={styles.hunterActionCard}>
                          <View style={styles.hunterActionHeader}>
                            <Text style={styles.hunterActionEmoji}>🏹💥</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.hunterActionTitle}>PHÁT SÚNG TRĂN TRỐI BÁO THÙ</Text>
                              <Text style={styles.hunterActionSub}>
                                {hunterTargetPlayer
                                  ? `Đang nhắm vào: ${hunterTargetPlayer.name}. Bấm "NỔ SÚNG" để bắn hoặc đổi người khác!`
                                  : 'Bấm vào 1 người chơi còn sống trên đấu trường để khóa tâm ngắm và nổ súng:'}
                              </Text>
                            </View>
                            <View style={styles.hunterTimerBadge}>
                              <Text style={styles.hunterTimerText}>⏳ {timeLeft}s</Text>
                            </View>
                          </View>

                          <View style={styles.hunterButtonsRow}>
                            <TouchableOpacity
                              style={[
                                styles.hunterShootBtn,
                                !hunterShotTargetId && styles.hunterShootBtnDisabled,
                              ]}
                              disabled={!hunterShotTargetId}
                              onPress={() => {
                                if (hunterShotTargetId) {
                                  socket.emit('hunter-shoot', { targetId: hunterShotTargetId });
                                }
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.hunterShootBtnText}>
                                {hunterTargetPlayer ? `💥 NỔ SÚNG BẮN (${hunterTargetPlayer.name})` : '🎯 CHỌN MỤC TIÊU ĐỂ BẮN'}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.hunterSkipBtn}
                              onPress={() => {
                                socket.emit('hunter-shoot', { pass: true });
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.hunterSkipBtnText}>🏳️ BẮN CHỈ THIÊN (BỎ QUA)</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    }

                    // Với các người chơi khác:
                    return (
                      <View style={styles.hunterSuspenseCard}>
                        <Text style={styles.hunterSuspenseEmoji}>🏹⚡</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.hunterSuspenseTitle}>
                            THỢ SĂN ĐANG LÊN ĐẠN BÁO THÙ...
                          </Text>
                          <Text style={styles.hunterSuspenseSub}>
                            Thợ Săn {hunter?.name || ''} đang hấp hối và chuẩn bị bóp cò phát súng trăn trối kéo theo một kẻ xuống mồ! Cả làng nín thở chờ đợi...
                          </Text>
                        </View>
                        <View style={styles.hunterTimerBadge}>
                          <Text style={styles.hunterTimerText}>⏳ {timeLeft}s</Text>
                        </View>
                      </View>
                    );
                  })()}
    
                  {/* Banner bỏ phiếu ban ngày */}
                  {phase === PHASES.DAY_VOTE && (
                    <View style={styles.votePhaseBanner}>
                      <View style={styles.votePhaseTopRow}>
                        <Text style={styles.votePhaseEmoji}>⚖️</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.votePhaseTitle}>GIỜ BIỂU QUYẾT TREO CỔ</Text>
                          <Text style={styles.votePhaseSub}>
                            Đã có {totalVoted}/{alivePlayers.length} người bỏ phiếu. Bấm vào ô người chơi hoặc chọn Bỏ phiếu trắng:
                          </Text>
                        </View>
                      </View>

                      {/* Checkbox Skip Vote */}
                      {amAlive && (
                        <TouchableOpacity
                          style={[
                            styles.skipVoteRow,
                            dayVoteTarget === 'skip' && styles.skipVoteRowChecked,
                          ]}
                          onPress={() => handleDayVote('skip')}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.skipVoteCheckbox, dayVoteTarget === 'skip' && styles.skipVoteCheckboxChecked]}>
                            <Text style={styles.skipVoteCheckboxIcon}>
                              {dayVoteTarget === 'skip' ? '☑️' : '⬜'}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.skipVoteTitle, dayVoteTarget === 'skip' && styles.skipVoteTitleChecked]}>
                              🏳️ Bỏ phiếu trắng (Skip Vote)
                            </Text>
                            <Text style={styles.skipVoteDesc}>
                              Không muốn treo cổ bất kỳ ai hôm nay
                            </Text>
                          </View>
                          {skipVoteCount > 0 && (
                            <View style={styles.skipVoteBadge}>
                              <Text style={styles.skipVoteBadgeText}>🗳️ {skipVoteCount} phiếu</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              ) : null}
            </View>

            {/* ---------------- CỘT BÊN PHẢI: KHUNG CHAT SLIDEBAR TRÊN PC ---------------- */}
            {!isMobile && isChatOpen && (
              <View style={styles.chatSlidebarDesktop}>
                <ChatBox
                  messages={messages}
                  onSend={onSendMessage}
                  isNight={isNight}
                  disabled={!amAlive && phase !== PHASES.GAME_OVER}
                  myRole={myRole}
                  myId={myId}
                  phase={phase}
                  isCouple={Boolean(me?.inCouple)}
                  partner={partnerPlayer}
                  onMinimize={() => setIsChatOpen(false)}
                />
              </View>
            )}
          </View>

          {/* ---------------- CHAT SLIDEBAR DRAWER TRÊN MOBILE ---------------- */}
          {isMobile && isChatOpen && (
            <View style={styles.chatMobileDrawerOverlay}>
              <TouchableOpacity
                style={styles.chatMobileBackdrop}
                activeOpacity={1}
                onPress={() => setIsChatOpen(false)}
              />
              <View style={[styles.chatMobileDrawerContent, { width: Math.min(windowWidth * 0.78, 280) }]}>
                <ChatBox
                  messages={messages}
                  onSend={onSendMessage}
                  isNight={isNight}
                  disabled={!amAlive && phase !== PHASES.GAME_OVER}
                  myRole={myRole}
                  myId={myId}
                  phase={phase}
                  isCouple={Boolean(me?.inCouple)}
                  partner={partnerPlayer}
                  onMinimize={() => setIsChatOpen(false)}
                />
              </View>
            </View>
          )}

          {/* ================= MODAL XEM CHI TIẾT VAI TRÒ BẢN THÂN ================= */}
          <Modal visible={showRoleBrief} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.roleBriefCard}>
                <Text style={styles.roleBriefEmoji}>{getRoleEmoji(myRole)}</Text>
                <Text style={[styles.roleBriefName, { color: getRoleColor(myRole) }]}>
                  {getRoleName(myRole)}
                </Text>
                <Text style={styles.roleBriefTeam}>
                  {myRole === 'wolf' ? 'Thuộc: Phe Ma Sói 🐺' : myRole === 'pied_piper' ? 'Thuộc: Phe Thứ 3 🎶' : 'Thuộc: Phe Dân Làng 🕊️'}
                </Text>
                <Text style={styles.roleBriefMission}>
                  {myRole === 'pied_piper'
                    ? 'Nhiệm vụ: Thôi miên toàn bộ người chơi còn sống để đem về chiến thắng cho Phe Thứ 3!'
                    : myRole === 'wolf'
                    ? 'Nhiệm vụ: Cùng bầy Sói tiêu diệt Dân Làng trong đêm!'
                    : myRole === 'seer'
                    ? 'Nhiệm vụ: Soi thấu danh tính kẻ thủ ác để dẫn dắt dân làng!'
                    : myRole === 'witch'
                    ? 'Nhiệm vụ: Dùng 2 bình thuốc Cứu & Độc xoay chuyển thế trận!'
                    : myRole === 'bodyguard'
                    ? 'Nhiệm vụ: Che chở dân làng khỏi nanh vuốt Sói mỗi đêm!'
                    : myRole === 'hunter'
                    ? 'Nhiệm vụ: Bắn phát súng báo thù kéo theo kẻ thù xuống mồ!'
                    : 'Nhiệm vụ: Tìm ra toàn bộ Ma Sói để bảo vệ sự bình yên của làng!'}
                </Text>
                <TouchableOpacity
                  style={[styles.roleBriefCloseBtn, { backgroundColor: getRoleColor(myRole) }]}
                  onPress={() => setShowRoleBrief(false)}
                >
                  <Text style={styles.roleBriefCloseText}>Đã hiểu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          
          {/* ================= POPUP THÔNG BÁO TIÊN TRI MA THUẬT SIÊU ĐẸP ================= */}
          <SeerInspectionModal
            visible={seerPopupVisible && !!seerResult}
            targetPlayer={(() => {
              const target = players.find((p) => p.id === seerResult?.targetId);
              return {
                id: seerResult?.targetId,
                name: seerResult?.targetName || target?.name || 'Mục tiêu',
                avatar: seerResult?.targetAvatar || target?.avatar || '👤',
                avatarColor: seerResult?.targetAvatarColor || target?.avatarColor || '#38BDF8',
              };
            })()}
            alignment={seerResult?.alignment || (seerResult?.isWolf ? 'evil' : 'good')}
            timeLeft={timeLeft || 5}
            onClose={() => setSeerPopupVisible(false)}
          />

          {/* ================= MODAL HIỆU ỨNG MA SÓI CÀO NẠN NHÂN BUỔI SÁNG ================= */}
          <WolfClawAttackModal
            visible={wolfClawModalVisible && !!deadPlayer}
            victimPlayer={deadPlayer}
            timeLeft={timeLeft || 5}
            onClose={handleFirstModalClose}
          />

          {/* ================= MODAL HIỆU ỨNG BẢO VỆ CỨU NGƯỜI THÀNH CÔNG ================= */}
          <BodyguardSaveModal
            visible={bodyguardSaveModalVisible && !!savedPlayer}
            savedPlayer={savedPlayer}
            timeLeft={timeLeft || 5}
            onClose={handleFirstModalClose}
          />

          {/* ================= MODAL HIỆU ỨNG PHÙ THỦY CỨU SỐNG BUỔI SÁNG ================= */}
          <WitchHealSaveModal
            visible={witchHealModalVisible && !!witchSavedPlayer}
            victimPlayer={witchSavedPlayer}
            savedPlayer={witchSavedPlayer}
            timeLeft={timeLeft || 8}
            onClose={handleFirstModalClose}
          />

          {/* ================= MODAL HIỆU ỨNG PHÙ THỦY NÉM THUỐC ĐỘC BUỔI SÁNG ================= */}
          <WitchPoisonModal
            visible={witchPoisonModalVisible && !!poisonedPlayer && !shieldClashPlayer}
            victimPlayer={poisonedPlayer}
            poisonedPlayer={poisonedPlayer}
            isShieldClash={false}
            timeLeft={timeLeft || 8}
            onClose={handleWitchPoisonModalClose}
          />

          {/* ================= MODAL TƯƠNG TÁC TAY BA ĐÈ HIỆU ỨNG LIÊN TỤC (BẢO VỆ + SÓI + PHÙ THỦY) ================= */}
          <ThreeWayClashModal
            visible={threeWayClashModalVisible && !!shieldClashPlayer}
            victimPlayer={shieldClashPlayer}
            timeLeft={timeLeft || 9}
            onClose={handleThreeWayClashModalClose}
          />

          {/* ================= MODAL HIỆU ỨNG CẢ SÓI VÀ PHÙ THỦY CÙNG GIẾT 1 NGƯỜI ================= */}
          <DualKillClashModal
            visible={dualKillModalVisible && !!deadPlayer && !!poisonedPlayer && deadPlayer.id === poisonedPlayer.id && !shieldClashPlayer}
            victimPlayer={deadPlayer}
            duration={5}
            onClose={handleDualKillModalClose}
          />

          {/* ================= MODAL HIỆU ỨNG THỢ SĂN NỔ SÚNG BẮN HẠ ================= */}
          <HunterShotModal
            visible={hunterShotModalVisible && !!hunterShotResultData?.target}
            targetPlayer={hunterShotResultData?.target}
            hunterPlayer={hunterShotResultData?.hunter}
            timeLeft={timeLeft || 8}
            onClose={handleHunterShotModalClose}
          />

          {/* ================= MODAL HIỆU ỨNG CẶP ĐÔI HÉ LỘ TÌNH YÊU ================= */}
          <CoupleRevealModal
            visible={coupleRevealVisible || phase === PHASES.NIGHT_COUPLE_REVEAL}
            couple={coupleDataState && coupleDataState.length === 2 ? coupleDataState : couple}
            cupid={cupidDataState}
            isMyCouple={Boolean(me?.inCouple)}
            isMeCupid={myRole === 'cupid'}
            duration={6}
            onClose={() => setCoupleRevealVisible(false)}
          />

          {/* ================= MODAL HIỆU ỨNG NGƯỜI THỔI SÁO THÔI MIÊN ================= */}
          <PiedPiperModal
            visible={piedPiperModalVisible && myRole === 'pied_piper' && selectedPiedPiperTargets.length > 0}
            targetPlayers={selectedPiedPiperTargets.map((tid) => players.find((p) => p.id === tid) || { id: tid, name: 'Người chơi' })}
            timeLeft={timeLeft || 6}
            onClose={() => setPiedPiperModalVisible(false)}
          />

          {/* ================= MODAL HOẠT ẢNH NGƯỜI THỔI SÁO CHẾT ================= */}
          <PiedPiperPurifiedModal
            visible={purifiedModalVisible}
            piedPiper={purifiedModalData?.piedPiper}
            duration={5}
            onClose={handlePiedPiperDeathModalClose}
          />

          {/* ================= MODAL ĐOẠN ĐẦU ĐÀI TREO CỔ BAN NGÀY ================= */}
          <DaytimeHangingModal
            visible={daytimeHangingModalVisible}
            victimPlayer={daytimeHangingVictim}
            duration={5}
            onClose={handleDaytimeHangingClose}
          />

          {/* ================= MODAL HIỆU ỨNG NGƯỜI YÊU CHẾT (TIM VỠ TUẪN TÌNH) ================= */}
          <CoupleHeartbreakModal
            visible={coupleHeartbreakModalVisible}
            deadPlayer={coupleHeartbreakData.deadPlayer}
            heartbrokenPlayer={coupleHeartbreakData.heartbrokenPlayer}
            reason={coupleHeartbreakData.reason}
            duration={6}
            onClose={handleCoupleHeartbreakModalClose}
          />

          {/* ================= MODAL PHÙ THỦY CHỌN CỨU NẠN NHÂN TRONG ĐÊM ================= */}
          <Modal
            visible={isNightWitch && myRole === 'witch' && amAlive && witchStep === 'heal' && !!(wolfVictim || witchVictim)}
            transparent
            animationType="fade"
          >
            <View style={styles.witchHealModalOverlay}>
              <View style={styles.witchHealModalCard}>
                <View style={styles.witchHealBadge}>
                  <Text style={styles.witchHealBadgeText}>🧙‍♀️ PHÙ THỦY THỨC GIẤC</Text>
                </View>
                <Text style={styles.witchHealModalTitle}>BẦY SÓI ĐÃ TẤN CÔNG!</Text>
                <Text style={styles.witchHealModalSubtitle}>
                  Nạn nhân bị Sói cắn đêm nay là:
                </Text>

                <View style={styles.witchVictimContainer}>
                  <PlayerAvatar
                    player={wolfVictim || witchVictim}
                    size="large"
                    showRole={false}
                    textColor="#FFFFFF"
                  />
                  <Text style={styles.witchVictimName}>{(wolfVictim || witchVictim)?.name}</Text>
                  <Text style={styles.witchVictimHint}>
                    Bạn có muốn dùng Bình Cứu 🧪 để hồi sinh người này không?
                  </Text>
                </View>

                <View style={styles.witchHealActionsRow}>
                  <TouchableOpacity
                    style={styles.witchHealYesBtn}
                    onPress={() => handleWitchHealChoice(true)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={require('../assets/potion_heal.png')}
                      style={styles.witchActionPotionIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.witchHealYesBtnText}>🟢 CỨU SỐNG</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.witchHealNoBtn}
                    onPress={() => handleWitchHealChoice(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.witchHealNoBtnText}>❌ BỎ MẶC</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* ================= MODAL PHÙ THỦY XEM NẠN NHÂN KHI ĐÃ HẾT BÌNH CỨU (CÒN BÌNH ĐỘC) ================= */}
          <Modal
            visible={isNightWitch && myRole === 'witch' && amAlive && witchStep === 'view_victim_has_poison' && !!(wolfVictim || witchVictim)}
            transparent
            animationType="fade"
          >
            <View style={styles.witchHealModalOverlay}>
              <View style={styles.witchHealModalCard}>
                <View style={styles.witchHealBadge}>
                  <Text style={styles.witchHealBadgeText}>🧙‍♀️ PHÙ THỦY QUAN SÁT</Text>
                </View>
                <Text style={styles.witchHealModalTitle}>BẦY SÓI ĐÃ TẤN CÔNG!</Text>
                <Text style={styles.witchHealModalSubtitle}>
                  Nạn nhân bị Sói cắn đêm nay là:
                </Text>

                <View style={styles.witchVictimContainer}>
                  <PlayerAvatar
                    player={wolfVictim || witchVictim}
                    size="large"
                    showRole={false}
                    textColor="#FFFFFF"
                  />
                  <Text style={styles.witchVictimName}>{(wolfVictim || witchVictim)?.name}</Text>
                  <Text style={[styles.witchVictimHint, { color: '#FCA5A5' }]}>
                    ⚠️ Bạn đã dùng hết bình Cứu trong trận nên không thể cứu người này!
                  </Text>
                </View>

                <View style={styles.witchHealActionsRow}>
                  <TouchableOpacity
                    style={styles.witchHealYesBtn}
                    onPress={() => setWitchStep('ask_poison')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.witchHealYesBtnText}>➡️ TIẾP TỤC (XEM THUỐC ĐỘC)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.witchHealNoBtn}
                    onPress={() => {
                      setWitchStep('done');
                      socket.emit('witch-action', { save: false, poisonTargetId: null });
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.witchHealNoBtnText}>❌ BỎ QUA</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* ================= MODAL PHÙ THỦY HẾT THUỐC (CHỈ XEM NẠN NHÂN VÀ ĐỢI 10S) ================= */}
          <Modal
            visible={isNightWitch && myRole === 'witch' && amAlive && witchStep === 'out_of_potions'}
            transparent
            animationType="fade"
          >
            <View style={styles.witchHealModalOverlay}>
              <View style={styles.witchHealModalCard}>
                <View style={[styles.witchHealBadge, { borderColor: '#A855F7' }]}>
                  <Text style={styles.witchHealBadgeText}>🧙‍♀️ PHÙ THỦY QUAN SÁT (HẾT THUỐC)</Text>
                </View>
                <Text style={styles.witchHealModalTitle}>
                  {(wolfVictim || witchVictim) ? 'BẦY SÓI ĐÃ TẤN CÔNG!' : 'ĐÊM NAY YÊN BÌNH'}
                </Text>
                <Text style={styles.witchHealModalSubtitle}>
                  {(wolfVictim || witchVictim) ? 'Nạn nhân bị Sói cắn đêm nay:' : 'Không có ai bị Sói cắn đêm nay.'}
                </Text>

                {(wolfVictim || witchVictim) ? (
                  <View style={styles.witchVictimContainer}>
                    <PlayerAvatar
                      player={wolfVictim || witchVictim}
                      size="large"
                      showRole={false}
                      textColor="#FFFFFF"
                    />
                    <Text style={styles.witchVictimName}>{(wolfVictim || witchVictim)?.name}</Text>
                    <Text style={[styles.witchVictimHint, { color: '#CBD5E1' }]}>
                      Bạn đã hết cả 2 bình thuốc Cứu & Độc. Đang quan sát đêm nay...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.witchVictimContainer}>
                    <Text style={{ fontSize: 40, marginBottom: 6 }}>🕊️</Text>
                    <Text style={[styles.witchVictimHint, { color: '#CBD5E1' }]}>
                      Không có ai bị thương hoặc nạn nhân đã được Bảo Vệ che chở.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.witchHealNoBtn, { marginTop: 12, width: '100%' }]}
                  onPress={() => setWitchStep('done')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.witchHealNoBtnText}>ĐÃ HIỂU (ĐÓNG THÔNG BÁO)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* ================= MODAL HỎI PHÙ THỦY CÓ MUỐN DÙNG BÌNH THUỐC ĐỘC KHÔNG ================= */}
          <Modal
            visible={isNightWitch && myRole === 'witch' && amAlive && witchStep === 'ask_poison' && !!witchState?.hasPoison}
            transparent
            animationType="fade"
          >
            <View style={styles.witchHealModalOverlay}>
              <View style={styles.witchAskPoisonCard}>
                <View style={styles.witchAskPoisonBadge}>
                  <Text style={styles.witchAskPoisonBadgeText}>🧙‍♀️ BÌNH THUỐC ĐỘC</Text>
                </View>
                <Image
                  source={require('../assets/potion_poison.png')}
                  style={styles.witchAskPoisonIcon}
                  resizeMode="contain"
                />
                <Text style={styles.witchAskPoisonTitle}>BẠN CÓ MUỐN DÙNG THUỐC ĐỘC KHÔNG?</Text>
                <Text style={styles.witchAskPoisonSubtitle}>
                  Bình thuốc độc có thể hạ gục 1 người chơi mà bạn nghi ngờ là Ma Sói (chỉ dùng 1 lần trong cả trận).
                </Text>

                <View style={styles.witchAskPoisonActionsRow}>
                  <TouchableOpacity
                    style={styles.witchAskPoisonYesBtn}
                    onPress={() => setWitchStep('poison')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.witchAskPoisonYesBtnText}>☠️ CÓ, CHỌN MỤC TIÊU</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.witchAskPoisonNoBtn}
                    onPress={handleWitchSkipPoison}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.witchAskPoisonNoBtnText}>❌ KHÔNG, ĐI NGỦ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* NÚT BẬT SLIDEBAR CHAT (DẠNG NỔI KHI CHAT ĐANG ĐÓNG - CẢ PC VÀ MOBILE) */}
          {!isChatOpen && (
            <TouchableOpacity
              style={styles.floatingChatSlideToggle}
              onPress={() => setIsChatOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.floatingChatIcon}>💬</Text>
              <Text style={styles.floatingChatLabel}>Chat</Text>
              {unreadCount > 0 && (
                <View style={styles.chatFabBadge}>
                  <Text style={styles.chatFabBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* ================= THÔNG BÁO SỐ LƯỢNG SÓI CÒN LẠI SAU KHI HẾT GIỜ TREO CỔ ================= */}
          {remainingWolvesOverlay !== null && (() => {
            const wolfCount = typeof remainingWolvesOverlay === 'object' ? remainingWolvesOverlay.count : remainingWolvesOverlay;
            const elimPlayer = typeof remainingWolvesOverlay === 'object' ? remainingWolvesOverlay.eliminated : null;

            return (
              <View style={styles.centerScreenModalContainer} pointerEvents="none">
                <Animated.View
                  style={[
                    styles.wolfCountPopupCard,
                    {
                      transform: [{ scale: wolfOverlayScale }],
                      opacity: wolfOverlayOpacity,
                    },
                  ]}
                >
                  {/* Kết quả biểu quyết treo cổ */}
                  <View style={styles.wolfVoteElimBanner}>
                    <Text style={styles.wolfVoteElimText}>
                      {elimPlayer
                        ? `⚰️ Dân làng đã treo cổ: ${elimPlayer.name}`
                        : '🕊️ Không ai bị treo cổ hôm nay'}
                    </Text>
                  </View>

                  <View style={styles.wolfCountGlowBadge}>
                    <Text style={styles.wolfCountEmoji}>🐺</Text>
                  </View>
                  <Text style={styles.wolfCountHeader}>SỐ LƯỢNG SÓI CÒN LẠI</Text>
                  <View style={styles.wolfCountNumberBox}>
                    <Text style={styles.wolfCountNumber}>{wolfCount}</Text>
                  </View>
                  <Text style={styles.wolfCountSubtitle}>
                    {wolfCount === 0
                      ? '🎉 Toàn bộ Ma Sói đã bị tiêu diệt!'
                      : `⚠️ Hiện còn ${wolfCount} Ma Sói đang lẩn trốn trong bóng tối!`}
                  </Text>
                </Animated.View>
              </View>
            );
          })()}
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  darkOverlay: {
    flex: 1,
  },
  overlayNight: {
    backgroundColor: 'rgba(8, 6, 22, 0.78)',
  },
  overlayDay: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(15, 12, 35, 0.88)',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(124, 58, 237, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    zIndex: 10,
  },
  myRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  myRoleEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  myRoleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  deadLabel: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '800',
  },
  phaseInfo: {
    alignItems: 'center',
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  timerBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginTop: 3,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FCA5A5',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hostSkipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D97706',
    borderWidth: 1.2,
    borderColor: '#FBBF24',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 12px rgba(245, 158, 11, 0.5)' } : {}),
  },
  hostSkipBtnMobile: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    gap: 2,
  },
  hostSkipIcon: {
    fontSize: 12,
  },
  hostSkipText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  hostSkipVoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.28)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  hostSkipVoteIcon: {
    fontSize: 13,
  },
  hostSkipVoteText: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  headerChatToggleBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerChatToggleBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: '#EF4444',
  },
  headerChatToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  leaveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  leaveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F87171',
  },

  // Split Layout
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 0,
  },

  // Arena Column (Trái)
  arenaColumn: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  arenaScroll: {
    flex: 1,
    minHeight: 0,
  },
  bottomActionBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: 'rgba(10, 8, 25, 0.95)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(124, 58, 237, 0.35)',
    flexShrink: 0,
  },
  bottomActionBarMobile: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
  },
  headerMobile: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerLeftGroupMobile: {
    gap: 4,
  },
  myRoleBadgeMobile: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 14,
  },
  phaseTitleMobile: {
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
  timerBadgeMobile: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginTop: 2,
  },
  leaveButtonMobile: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  witchMiniPotionBarMobile: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 3,
    borderRadius: 10,
  },
  witchMiniPotionSlotMobile: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  witchMiniPotionIconMobile: {
    width: 14,
    height: 14,
  },
  seerVerdictBig: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  seerCountdownText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#CBD5E1',
    textAlign: 'center',
  },
  arenaScrollContent: {
    padding: 12,
    paddingBottom: 28,
  },

  // Chat Slidebar Trên PC (Phải)
  chatSlidebarDesktop: {
    width: 340,
    height: '100%',
    borderLeftWidth: 1.5,
    borderLeftColor: 'rgba(124, 58, 237, 0.35)',
    backgroundColor: 'rgba(15, 12, 30, 0.96)',
    display: 'flex',
    flexDirection: 'column',
  },

  // Chat Slidebar Drawer Trên Mobile
  chatMobileDrawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
    flexDirection: 'row',
  },
  chatMobileBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  chatMobileDrawerContent: {
    marginLeft: 'auto',
    width: '88%',
    maxWidth: 400,
    height: '100%',
    backgroundColor: 'rgba(15, 12, 30, 0.98)',
    borderLeftWidth: 1.5,
    borderLeftColor: 'rgba(124, 58, 237, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 100,
  },

  // Nút Nổi Kích Hoạt Slidebar Khi Chat Đang Đóng
  floatingChatSlideToggle: {
    position: 'absolute',
    bottom: 22,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 90,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  floatingChatIcon: {
    fontSize: 20,
  },
  floatingChatLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  chatFabBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  chatFabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '900',
  },
  savedInfoBox: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  savedShield: {
    fontSize: 38,
    marginBottom: 4,
  },
  savedHeader: {
    fontSize: 15,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
  },
  savedTargetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#0EA5E9',
    marginBottom: 6,
  },
  savedTargetLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
  },
  savedPlayerName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#38BDF8',
  },
  savedNoticeText: {
    fontSize: 13.5,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
    paddingHorizontal: 10,
  },
  savedSecretBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B981',
    marginTop: 8,
  },
  savedSecretText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#34D399',
  },

  // Notice & Announce Cards
  eliminationNotice: {
    backgroundColor: 'rgba(127, 29, 29, 0.85)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  peacefulNotice: {
    backgroundColor: 'rgba(6, 78, 59, 0.85)',
    borderColor: '#10B981',
  },
  elimNoticeTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FCA5A5',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  elimNoticeText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  elimNoticeSecret: {
    fontSize: 13,
    color: '#FCD34D',
    fontWeight: '800',
    marginTop: 4,
  },

  announceCard: {
    backgroundColor: 'rgba(30, 27, 75, 0.88)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#818CF8',
  },
  announceSun: {
    fontSize: 34,
  },
  announceHeader: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 2,
    marginVertical: 4,
  },
  deadInfoBox: {
    alignItems: 'center',
  },
  deadSkull: {
    fontSize: 32,
  },
  deadPlayerName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#EF4444',
  },
  deadNoticeText: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '600',
    marginTop: 2,
  },
  secretRoleBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginTop: 8,
  },
  secretRoleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FCD34D',
  },
  peacefulBox: {
    alignItems: 'center',
  },
  peacefulEmoji: {
    fontSize: 32,
  },
  peacefulTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#34D399',
  },
  peacefulSubtitle: {
    fontSize: 13,
    color: '#E2E8F0',
    marginTop: 2,
    textAlign: 'center',
  },

  // Wolf Action Card
  wolfActionCard: {
    backgroundColor: 'rgba(69, 10, 10, 0.92)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#DC2626',
  },
  wolfActionHeader: {
    marginBottom: 8,
  },
  wolfActionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FCA5A5',
    letterSpacing: 1,
  },
  wolfActionSub: {
    fontSize: 12,
    color: '#FECACA',
    marginTop: 2,
  },
  wolfConfirmBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: '#F87171',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  wolfConfirmedActiveBtn: {
    backgroundColor: '#16A34A',
    borderColor: '#4ADE80',
  },
  wolfReadyToConfirmBtn: {
    backgroundColor: '#DC2626',
    borderColor: '#F87171',
  },
  wolfConfirmBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  wolfVoteStatusRow: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  wolfVoteStatusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FCD34D',
  },
  wolfChotBox: {
    marginTop: 8,
  },
  wolfChotHint: {
    fontSize: 11,
    color: '#FECACA',
    fontStyle: 'italic',
    marginTop: 5,
    textAlign: 'center',
  },
  wolfWaitingNotice: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  wolfWaitingNoticeText: {
    fontSize: 12,
    color: '#FCA5A5',
    fontWeight: '600',
    textAlign: 'center',
  },
  allWolvesVotedNotice: {
    backgroundColor: 'rgba(22, 163, 74, 0.3)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4ADE80',
    alignItems: 'center',
  },
  allWolvesVotedNoticeText: {
    fontSize: 12,
    color: '#86EFAC',
    fontWeight: '800',
    textAlign: 'center',
  },

  // Witch Action Banner
  witchActionCard: {
    backgroundColor: 'rgba(46, 16, 101, 0.92)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#C084FC',
  },
  witchActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  witchBannerPotionIcon: {
    width: 44,
    height: 44,
  },
  witchActionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E9D5FF',
    letterSpacing: 0.8,
  },
  witchActionSub: {
    fontSize: 12,
    color: '#D8B4FE',
    marginTop: 2,
    lineHeight: 16,
  },
  witchActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  witchPoisonConfirmBtn: {
    flex: 1.2,
    backgroundColor: '#7E22CE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C084FC',
  },
  witchPoisonConfirmBtnDisabled: {
    opacity: 0.45,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  witchPoisonConfirmBtnText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  witchPoisonSkipBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  witchPoisonSkipBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E2E8F0',
    textAlign: 'center',
  },
  witchDoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 27, 75, 0.92)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#A855F7',
    gap: 12,
  },
  witchDoneEmoji: {
    fontSize: 32,
  },
  witchDoneTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E9D5FF',
    letterSpacing: 0.5,
  },
  witchDoneSub: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 2,
  },

  // Witch Night Heal Modal
  witchHealModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  witchHealModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#C084FC',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  witchHealBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C084FC',
    marginBottom: 10,
  },
  witchHealBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#E9D5FF',
    letterSpacing: 1,
  },
  witchHealModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  witchHealModalSubtitle: {
    fontSize: 13,
    color: '#CBD5E1',
    marginBottom: 16,
    textAlign: 'center',
  },
  witchVictimContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 18,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  witchVictimName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 10,
  },
  witchVictimHint: {
    fontSize: 12,
    color: '#A78BFA',
    marginTop: 4,
    textAlign: 'center',
  },
  witchHealActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  witchHealYesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: '#34D399',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  witchActionPotionIcon: {
    width: 24,
    height: 24,
  },
  witchHealYesBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  witchHealNoBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  witchHealNoBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FCA5A5',
    letterSpacing: 0.5,
  },

  // Header Left Container (Role + Kho bình thuốc Phù Thủy)
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Kho bình thuốc mini bên cạnh role (Chỉ 2 màu: Xanh & Tím, dùng thì mất màu)
  witchMiniPotionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 12, 35, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  witchMiniPotionSlot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  witchMiniPotionHealActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.35)',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  witchMiniPotionPoisonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.35)',
    borderColor: '#C084FC',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  witchMiniPotionSpent: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.3,
  },
  witchMiniPotionIcon: {
    width: 17,
    height: 17,
  },
  witchMiniPotionIconSpent: {
    opacity: 0.25,
    tintColor: '#94A3B8',
  },

  // Witch Ask Poison Prompt Modal
  witchAskPoisonCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#C084FC',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  witchAskPoisonBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C084FC',
    marginBottom: 12,
  },
  witchAskPoisonBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#E9D5FF',
    letterSpacing: 1,
  },
  witchAskPoisonIcon: {
    width: 72,
    height: 72,
    marginBottom: 12,
  },
  witchAskPoisonTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#F472B6',
    letterSpacing: 0.8,
    marginBottom: 6,
    textAlign: 'center',
  },
  witchAskPoisonSubtitle: {
    fontSize: 12.5,
    color: '#CBD5E1',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 6,
  },
  witchAskPoisonActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  witchAskPoisonYesBtn: {
    flex: 1.2,
    backgroundColor: '#7E22CE',
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: '#C084FC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  witchAskPoisonYesBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  witchAskPoisonNoBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  witchAskPoisonNoBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E2E8F0',
  },

  // Seer Action Card
  seerActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 27, 75, 0.92)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    gap: 12,
  },
  crystalBallWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2E1065',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  crystalBallEmoji: {
    fontSize: 26,
  },
  crystalRingAura: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.5)',
  },
  seerTextCol: {
    flex: 1,
  },
  seerActionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 1,
  },
  seerActionSub: {
    fontSize: 12,
    color: '#BAE6FD',
    marginTop: 2,
  },
  reopenSeerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reopenSeerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Vote Phase Banner
  votePhaseBanner: {
    flexDirection: 'column',
    backgroundColor: 'rgba(120, 53, 15, 0.90)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    gap: 12,
  },
  votePhaseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  votePhaseEmoji: {
    fontSize: 28,
  },
  votePhaseTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FDE68A',
    letterSpacing: 1,
  },
  votePhaseSub: {
    fontSize: 12,
    color: '#FEF3C7',
    marginTop: 2,
  },

  // Skip Vote Checkbox Row
  skipVoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 10,
  },
  skipVoteRowChecked: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderColor: '#F59E0B',
  },
  skipVoteCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipVoteCheckboxChecked: {
    backgroundColor: '#F59E0B',
    borderColor: '#FCD34D',
  },
  skipVoteCheckboxIcon: {
    fontSize: 16,
  },
  skipVoteTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  skipVoteTitleChecked: {
    color: '#FDE68A',
  },
  skipVoteDesc: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 1,
  },
  skipVoteBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  skipVoteBadgeText: {
    color: '#1E1B4B',
    fontSize: 11,
    fontWeight: '900',
  },

  // Discord Tiles Section
  discordSection: {
    width: '100%',
  },
  discordSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  discordSectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#CBD5E1',
    letterSpacing: 1,
  },
  discordSectionHint: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  discordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  discordBox: {
    minWidth: 140,
    minHeight: 180,
    backgroundColor: 'rgba(24, 24, 32, 0.92)',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  discordBoxMobile: {
    minWidth: 0,
    minHeight: 135,
    padding: 7,
    borderRadius: 12,
  },
  wolfTeammateBadgeUnderName: {
    backgroundColor: 'rgba(220, 38, 38, 0.28)',
    borderWidth: 1.2,
    borderColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  wolfTeammateBadgeUnderNameMe: {
    backgroundColor: 'rgba(185, 28, 28, 0.35)',
    borderColor: '#EF4444',
  },
  wolfTeammateBadgeUnderNameCompact: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 2,
    borderRadius: 6,
  },
  wolfTeammateBadgeUnderNameText: {
    color: '#FCA5A5',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  witchOutOfPotionsTimerPill: {
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C084FC',
    marginTop: 10,
    alignItems: 'center',
  },
  witchOutOfPotionsTimerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E9D5FF',
    textAlign: 'center',
  },
  discordBoxCompact: {
    minWidth: 110,
    minHeight: 155,
    padding: 10,
    borderRadius: 14,
  },
  discordBoxUltraCompact: {
    minWidth: 95,
    minHeight: 135,
    padding: 8,
    borderRadius: 10,
  },
  discordBoxClickable: {
    borderColor: 'rgba(124, 58, 237, 0.45)',
    backgroundColor: 'rgba(30, 27, 46, 0.9)',
    cursor: 'pointer',
  },
  discordBoxSelected: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  discordBoxDead: {
    opacity: 0.45,
    backgroundColor: 'rgba(15, 15, 18, 0.75)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  discordTileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 5,
  },
  discordTileTopRowCompact: {
    marginBottom: 2,
  },
  discordStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOnline: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowRadius: 4,
  },
  statusOffline: {
    backgroundColor: '#64748B',
  },
  discordMeTag: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  discordMeTagCompact: {
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  discordMeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  discordWolfTeammateTag: {
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#DC2626',
  },
  discordWolfTeammateTagCompact: {
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  discordWolfTeammateText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F87171',
  },
  discordProtectedTag: {
    backgroundColor: 'rgba(100, 116, 139, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#94A3B8',
  },
  discordProtectedTagCompact: {
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  discordProtectedTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  discordShieldTag: {
    backgroundColor: 'rgba(14, 165, 233, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#0EA5E9',
  },
  discordShieldTagCompact: {
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  discordShieldTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
  },
  discordPoisonTag: {
    backgroundColor: 'rgba(168, 85, 247, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#C084FC',
  },
  discordPoisonTagCompact: {
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  discordPoisonTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E9D5FF',
  },
  discordCheckboxPill: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  discordCheckboxPillChecked: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  discordCheckboxIcon: {
    fontSize: 11,
  },
  discordAvatarCenter: {
    marginVertical: 4,
  },
  discordAvatarCenterCompact: {
    marginVertical: 1,
  },

  // Hiển thị vote dưới avatar
  discordVoteRowUnderAvt: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  discordVoteBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  discordVoteBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
  discordVotersMini: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 3,
  },
  discordVoterEmoji: {
    fontSize: 12,
  },
  discordWolfVoteRow: {
    backgroundColor: 'rgba(220, 38, 38, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#DC2626',
    marginTop: 4,
  },
  discordWolfVoteText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  discordPoisonTargetBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#C084FC',
    marginTop: 4,
  },
  discordPoisonTargetText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F3E8FF',
  },

  // Name Pill
  discordNamePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 5,
    maxWidth: '100%',
  },
  discordNamePillCompact: {
    marginTop: 2,
    paddingVertical: 1,
    paddingHorizontal: 5,
    maxWidth: '96%',
  },
  discordNamePillMe: {
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
  },
  discordNameText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  discordNameTextCompact: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  discordStatusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 3,
  },
  discordStatusLabelCompact: {
    fontSize: 9,
    marginTop: 1,
  },
  discordStatusLabelDead: {
    color: '#EF4444',
  },
  seerCheckedBadgeCompact: {
    marginTop: 2,
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  seerCheckedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seerCheckedBadgeEvil: {
    backgroundColor: 'rgba(239, 68, 68, 0.24)',
    borderColor: '#EF4444',
  },
  seerCheckedBadgeGood: {
    backgroundColor: 'rgba(16, 185, 129, 0.24)',
    borderColor: '#10B981',
  },
  seerCheckedBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  seerCheckedTextEvil: {
    color: '#F87171',
  },
  seerCheckedTextGood: {
    color: '#34D399',
  },

  // Game Over
  gameOverCard: {
    backgroundColor: 'rgba(20, 16, 40, 0.95)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#7C3AED',
    marginTop: 20,
  },
  victoryEmoji: {
    fontSize: 54,
  },
  victoryTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginVertical: 6,
    textAlign: 'center',
  },
  victorySub: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 16,
  },
  revealTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E2E8F0',
    marginBottom: 10,
  },
  revealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  revealItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 8,
    borderRadius: 12,
    width: 76,
  },
  revealEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  revealName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  roleTag: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  returnLobbyBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  returnLobbyText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  roleBriefCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  roleBriefEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  roleBriefName: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  roleBriefTeam: {
    fontSize: 14,
    color: '#CBD5E1',
    marginBottom: 8,
  },
  roleBriefMission: {
    fontSize: 13,
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  roleBriefCloseBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  roleBriefCloseText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Modal Tiên Tri Ma Thuật
  seerActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 27, 75, 0.85)',
    borderColor: '#A855F7',
    borderWidth: 2,
    borderRadius: 20,
    padding: 16,
    marginVertical: 12,
    marginHorizontal: 8,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  crystalBallWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(88, 28, 135, 0.45)',
    borderWidth: 2,
    borderColor: '#C084FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    position: 'relative',
  },
  crystalBallEmoji: {
    fontSize: 34,
  },
  crystalRingAura: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1.5,
    borderColor: 'rgba(192, 132, 252, 0.4)',
    borderStyle: 'dashed',
  },
  seerTextCol: {
    flex: 1,
  },
  seerActionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#E9D5FF',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  seerActionSub: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
    marginBottom: 8,
  },
  seerTestButtonsInlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  seerTestInlineBtnGood: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#34D399',
    borderWidth: 1.2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  seerTestInlineBtnEvil: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: '#EF4444',
    borderWidth: 1.2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  seerTestInlineBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  headerTestSeerBtn: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    borderColor: '#A855F7',
    borderWidth: 1.2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  headerTestSeerText: {
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '800',
  },
  demoDropdownContainer: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 2,
    borderBottomColor: '#A855F7',
    padding: 12,
    zIndex: 99,
  },
  demoDropdownTitle: {
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  demoDropdownRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  demoDropdownBtnGood: {
    backgroundColor: 'rgba(6, 78, 59, 0.85)',
    borderColor: '#10B981',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  demoDropdownBtnEvil: {
    backgroundColor: 'rgba(69, 10, 10, 0.85)',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  demoDropdownBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  seerPopupCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
  },
  seerPopupCardGood: {
    backgroundColor: 'rgba(6, 78, 59, 0.95)',
    borderColor: '#34D399',
    shadowColor: '#34D399',
  },
  seerPopupCardEvil: {
    backgroundColor: 'rgba(69, 10, 10, 0.95)',
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  seerHeaderGlow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  seerHeaderAuraIcon: {
    fontSize: 42,
    marginBottom: 4,
  },
  seerHeaderHeadline: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 2,
  },
  seerInspectedAvatarBox: {
    alignItems: 'center',
    marginBottom: 14,
  },
  seerInspectedCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    marginBottom: 6,
  },
  inspectedCircleGood: {
    borderColor: '#34D399',
    backgroundColor: '#064E3B',
  },
  inspectedCircleEvil: {
    borderColor: '#EF4444',
    backgroundColor: '#450A0A',
  },
  seerInspectedEmoji: {
    fontSize: 36,
  },
  seerInspectedName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  seerResultPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  seerResultPillGood: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#34D399',
  },
  seerResultPillEvil: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: '#EF4444',
  },
  seerResultPillText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    textAlign: 'center',
  },
  seerVerdictText: {
    fontSize: 13,
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
    paddingHorizontal: 10,
  },
  seerDismissBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
  },
  seerDismissBtnGood: {
    backgroundColor: '#10B981',
  },
  seerDismissBtnEvil: {
    backgroundColor: '#EF4444',
  },
  seerDismissText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Thông báo Bình Minh khi Bảo Vệ cứu người
  savedInfoBox: {
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    width: '100%',
    marginVertical: 10,
  },
  savedShield: {
    fontSize: 48,
    marginBottom: 8,
  },
  savedHeader: {
    fontSize: 16,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 1.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  savedPlayerName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  savedNoticeText: {
    fontSize: 14,
    color: '#E0F2FE',
    textAlign: 'center',
    marginBottom: 10,
  },
  savedSecretBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  savedSecretText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#BAE6FD',
  },

  // Tags trên ô Discord cho Bảo Vệ
  discordProtectedTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  discordProtectedTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  discordShieldTag: {
    backgroundColor: 'rgba(14, 165, 233, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  discordShieldTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7DD3FC',
  },
  discordBoxDisabled: {
    opacity: 0.45,
  },

  // Banner hành động của Bảo Vệ
  bodyguardActionCard: {
    backgroundColor: 'rgba(14, 165, 233, 0.16)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#0284C7',
    marginBottom: 10,
  },
  bodyguardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shieldBallWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 165, 233, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  shieldBallEmoji: {
    fontSize: 26,
  },
  shieldRingAura: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  bodyguardTextCol: {
    flex: 1,
  },
  bodyguardActionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 1,
    marginBottom: 3,
  },
  bodyguardActionSub: {
    fontSize: 12,
    color: '#E0F2FE',
    lineHeight: 17,
  },
  bodyguardActionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  bodyguardSkipBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  bodyguardSkipBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  bodyguardSkipBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bodyguardCountdownBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34D399',
  },
  bodyguardCountdownText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6EE7B7',
  },
  centerScreenModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  wolfCountPopupCard: {
    backgroundColor: 'rgba(20, 10, 15, 0.96)',
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#EF4444',
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
    maxWidth: 380,
    width: '88%',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 25,
  },
  wolfCountGlowBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
    marginBottom: 12,
  },
  wolfCountEmoji: {
    fontSize: 38,
  },
  wolfCountHeader: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FCA5A5',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  wolfCountNumberBox: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    paddingHorizontal: 28,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.6)',
    marginVertical: 6,
  },
  wolfCountNumber: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    ...(Platform.OS === 'web' ? { textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' } : {}),
  },
  wolfCountSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  wolfVoteElimBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  wolfVoteElimText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FCD34D',
    textAlign: 'center',
  },
  wolfCountTimerPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  wolfCountTimerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#93C5FD',
  },

  // ===== THỢ SĂN (HUNTER) STYLES =====
  discordBoxHunterTarget: {
    borderColor: '#F59E0B',
    boxShadow: '0 0 16px rgba(245, 158, 11, 0.8)',
    borderWidth: 2,
  },
  discordHunterTargetBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    marginBottom: 4,
  },
  discordHunterTargetText: {
    color: '#FDE68A',
    fontWeight: '900',
    fontSize: 9.5,
  },
  hunterActionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    marginHorizontal: 12,
    marginVertical: 10,
    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.35)',
  },
  hunterActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  hunterActionEmoji: {
    fontSize: 32,
  },
  hunterActionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.8,
  },
  hunterActionSub: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 2,
  },
  hunterTimerBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hunterTimerText: {
    color: '#FDE68A',
    fontWeight: '800',
    fontSize: 12,
  },
  hunterButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  hunterShootBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#FCA5A5',
    boxShadow: '0 2px 10px rgba(239, 68, 68, 0.4)',
  },
  hunterShootBtnDisabled: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    opacity: 0.6,
  },
  hunterShootBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12.5,
    letterSpacing: 0.5,
  },
  hunterSkipBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  hunterSkipBtnText: {
    color: '#E2E8F0',
    fontWeight: '800',
    fontSize: 12,
  },
  hunterSuspenseCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.6)',
    marginHorizontal: 12,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
  },
  hunterSuspenseEmoji: {
    fontSize: 32,
  },
  hunterSuspenseTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.8,
  },
  hunterSuspenseSub: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 2,
  },

  // ===== NGƯỜI THỔI SÁO (PIED PIPER) STYLES =====
  discordBoxPiedPiperTarget: {
    borderColor: '#C084FC',
    borderWidth: 2,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 16px rgba(192, 132, 252, 0.85)' } : {}),
  },
  discordBoxCharmed: {
    borderColor: '#E879F9',
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 14px rgba(232, 121, 249, 0.5)' } : {}),
  },
  discordBoxPurifyingGolden: {
    borderColor: '#FDE047',
    borderWidth: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 20px rgba(253, 224, 71, 0.95), inset 0 0 10px rgba(245, 158, 11, 0.35)' }
      : {}),
  },
  purifiedLiveBadgeUnderName: {
    backgroundColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1.5,
    borderColor: '#FDE047',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 10px rgba(245, 158, 11, 0.85)' } : {}),
  },
  purifiedLiveBadgeUnderNameCompact: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  purifiedLiveBadgeUnderNameText: {
    color: '#FEF08A',
    fontWeight: '900',
    fontSize: 9.5,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(245, 158, 11, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  livePurificationBannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(32, 20, 6, 0.96)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 14,
    width: '100%',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.75,
    shadowRadius: 18,
    elevation: 12,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 20px rgba(245, 158, 11, 0.85)' } : {}),
  },
  livePurificationBannerEmoji: {
    fontSize: 28,
  },
  livePurificationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  livePurificationTagBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  livePurificationTagText: {
    color: '#FEF08A',
    fontWeight: '900',
    fontSize: 10.5,
    letterSpacing: 0.8,
  },
  livePurificationHeaderTitle: {
    color: '#FDE047',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  livePurificationBannerMessage: {
    color: '#FEF3C7',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  discordCharmedTag: {
    backgroundColor: 'rgba(192, 132, 252, 0.3)',
    borderWidth: 1,
    borderColor: '#C084FC',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  discordCharmedTagCompact: {
    paddingHorizontal: 3,
    paddingVertical: 0,
  },
  discordCharmedTagText: {
    color: '#F5D0FE',
    fontWeight: '900',
    fontSize: 9,
  },
  charmedBadgeUnderName: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    borderWidth: 1,
    borderColor: '#A855F7',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    alignItems: 'center',
  },
  charmedBadgeUnderNameCompact: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  charmedBadgeUnderNameText: {
    color: '#E9D5FF',
    fontWeight: '900',
    fontSize: 9.5,
    letterSpacing: 0.3,
  },
  charmedRevealBadgeUnderName: {
    backgroundColor: 'rgba(236, 72, 153, 0.3)',
    borderWidth: 1.5,
    borderColor: '#F43F5E',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 10px rgba(244, 63, 94, 0.6)' } : {}),
  },
  charmedRevealBadgeUnderNameCompact: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  charmedRevealBadgeUnderNameText: {
    color: '#FFE4E6',
    fontWeight: '900',
    fontSize: 9.5,
    letterSpacing: 0.4,
  },
  charmedSelfBadgeUnderName: {
    backgroundColor: 'rgba(192, 132, 252, 0.25)',
    borderWidth: 1,
    borderColor: '#C084FC',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    marginTop: 2,
    alignItems: 'center',
  },
  charmedSelfBadgeUnderNameCompact: {
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 6,
  },
  charmedSelfBadgeUnderNameText: {
    color: '#F5D0FE',
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 0.2,
  },
  charmedRevealBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(30, 10, 45, 0.92)',
    borderWidth: 2,
    borderColor: '#E879F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 20px rgba(232, 121, 249, 0.5)' } : {}),
  },
  charmedRevealEmoji: {
    fontSize: 26,
  },
  charmedRevealTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#F5D0FE',
    letterSpacing: 0.8,
  },
  charmedRevealSub: {
    fontSize: 11,
    color: '#E9D5FF',
    marginTop: 2,
    lineHeight: 15,
  },
  charmedRevealTimerBadge: {
    backgroundColor: 'rgba(232, 121, 249, 0.25)',
    borderWidth: 1,
    borderColor: '#F0ABFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  charmedRevealTimerText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FDF4FF',
  },
  piedPiperActionCard: {
    backgroundColor: 'rgba(20, 10, 35, 0.96)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#C084FC',
    marginHorizontal: 12,
    marginVertical: 10,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 22px rgba(192, 132, 252, 0.4)' } : {}),
  },
  piedPiperActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  piedPiperBannerFluteIcon: {
    width: 44,
    height: 44,
  },
  piedPiperActionTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#F5D0FE',
    letterSpacing: 0.8,
  },
  piedPiperActionSub: {
    fontSize: 11.5,
    color: '#E9D5FF',
    marginTop: 2,
    lineHeight: 16,
  },
  piedPiperTimerBadge: {
    backgroundColor: 'rgba(192, 132, 252, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C084FC',
  },
  piedPiperTimerText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FDF4FF',
  },
  piedPiperActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  piedPiperCharmBtn: {
    flex: 2,
    backgroundColor: '#9333EA',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C084FC',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 14px rgba(147, 51, 234, 0.6)' } : {}),
  },
  piedPiperCharmBtnDisabled: {
    backgroundColor: 'rgba(147, 51, 234, 0.35)',
    borderColor: 'rgba(192, 132, 252, 0.3)',
    opacity: 0.6,
  },
  piedPiperCharmBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  piedPiperSkipBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  piedPiperSkipBtnDisabled: {
    opacity: 0.4,
  },
  piedPiperSkipBtnText: {
    color: '#E2E8F0',
    fontWeight: '800',
    fontSize: 12,
  },

  // ===== CUPID ACTION BANNER =====
  cupidActionCard: {
    backgroundColor: 'rgba(28, 10, 25, 0.96)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#EC4899',
    marginHorizontal: 12,
    marginVertical: 10,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 22px rgba(236, 72, 153, 0.45)' } : {}),
  },
  cupidActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cupidActionTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#F472B6',
    letterSpacing: 0.8,
  },
  cupidActionSub: {
    fontSize: 11.5,
    color: '#FBCFE8',
    marginTop: 2,
    lineHeight: 16,
  },
  cupidTimerBadge: {
    backgroundColor: 'rgba(236, 72, 153, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F472B6',
  },
  cupidTimerText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FDF2F8',
  },
  cupidActionButtonsRow: {
    flexDirection: 'row',
  },
  cupidShootBtn: {
    flex: 1,
    backgroundColor: '#EC4899',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F472B6',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 16px rgba(236, 72, 153, 0.6)' } : {}),
  },
  cupidShootBtnDisabled: {
    backgroundColor: 'rgba(236, 72, 153, 0.35)',
    borderColor: 'rgba(244, 114, 182, 0.3)',
    opacity: 0.6,
  },
  cupidShootBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // ===== DISCORD COUPLE & CUPID TAGS =====
  discordCoupleTag: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discordCoupleTagCompact: {
    paddingHorizontal: 3,
    paddingVertical: 0,
  },
  discordCoupleTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  discordCupidTag: {
    backgroundColor: 'rgba(236, 72, 153, 0.35)',
    borderWidth: 1,
    borderColor: '#F472B6',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discordCupidTagCompact: {
    paddingHorizontal: 3,
    paddingVertical: 0,
  },
  discordCupidTagText: {
    color: '#FDF2F8',
    fontSize: 9,
    fontWeight: '900',
  },

  // ===== SPLIT POPUP CARD (WOLF + CHARMED 50/50) =====
  splitCountPopupCard: {
    maxWidth: 520,
    width: '92%',
    borderColor: '#A855F7',
    backgroundColor: 'rgba(18, 10, 28, 0.97)',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 35px rgba(168, 85, 247, 0.7)' } : {}),
  },
  splitRowWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    marginVertical: 8,
  },
  splitWolfCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  splitCharmedCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  splitVerticalDivider: {
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 4,
    borderRadius: 1,
  },
  splitWolfSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FCA5A5',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  splitCharmedSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E9D5FF',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  charmedCountGlowBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#C084FC',
    marginBottom: 12,
  },
  charmedCountEmoji: {
    fontSize: 34,
  },
  charmedCountHeader: {
    fontSize: 15,
    fontWeight: '900',
    color: '#E9D5FF',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  charmedCountNumberBox: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: 28,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(192, 132, 252, 0.6)',
    marginVertical: 6,
  },
  charmedCountNumber: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FDF4FF',
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    ...(Platform.OS === 'web' ? { textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' } : {}),
  },
  coupleSupportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(80, 7, 36, 0.85)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F472B6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 10,
  },
  coupleSupportBannerWolf: {
    backgroundColor: 'rgba(69, 10, 10, 0.88)',
    borderColor: '#EF4444',
  },
  coupleSupportBannerPiper: {
    backgroundColor: 'rgba(59, 7, 100, 0.88)',
    borderColor: '#C084FC',
  },
  coupleSupportEmoji: {
    fontSize: 22,
  },
  coupleSupportTitle: {
    color: '#FBCFE8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  coupleSupportSub: {
    color: '#FDF2F8',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  loverRoleBadgeUnderName: {
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(131, 24, 67, 0.9)',
    borderWidth: 1,
    borderColor: '#F472B6',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '96%',
  },
  loverRoleBadgeUnderNameWolf: {
    backgroundColor: 'rgba(127, 29, 29, 0.95)',
    borderColor: '#EF4444',
  },
  loverRoleBadgeUnderNamePiper: {
    backgroundColor: 'rgba(88, 28, 135, 0.95)',
    borderColor: '#C084FC',
  },
  loverRoleBadgeUnderNameCompact: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 2,
  },
  loverRoleBadgeUnderNameText: {
    color: '#FCE7F3',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  loverRoleBadgeUnderNameTextWolf: {
    color: '#FECACA',
  },
  loverRoleBadgeUnderNameTextPiper: {
    color: '#F3E8FF',
  },
  loverSelfBadgeUnderName: {
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(157, 23, 77, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '96%',
  },
  loverSelfBadgeUnderNameText: {
    color: '#FBCFE8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.25,
  },
});
