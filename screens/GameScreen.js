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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pha trong game
const PHASES = {
  WAITING: 'waiting',
  NIGHT_BODYGUARD: 'night_bodyguard',
  NIGHT_WOLF: 'night_wolf',
  NIGHT_SEER: 'night_seer',
  NIGHT: 'night',
  DAY_ANNOUNCE: 'day_announce',
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
  wasProtected = false,
  lastProtectedTarget = null,
  winner = null,
  winMessage = '',
  messages = [],
  onSendMessage,
  onReturnToLobby,
  onLeaveGame,
  myId,
  hostId,
  initialSeerHistory = {},
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobile = windowWidth <= 860;

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

  // Số lượng người chơi & tính toán hitbox thu nhỏ động (không để cuộn kéo quá dài)
  const playerCount = players.length;
  const isCompact = playerCount >= 6 || arenaWidth < 680 || windowHeight < 760;
  const isUltraCompact = playerCount >= 9 || (isCompact && arenaWidth < 500);

  // Xác định số cột tối ưu theo độ rộng đấu trường & số người chơi
  const getColCount = () => {
    if (arenaWidth >= 1150) {
      if (playerCount <= 4) return 4;
      if (playerCount <= 6) return 4;
      if (playerCount <= 8) return 4;
      if (playerCount <= 10) return 5;
      return 6;
    } else if (arenaWidth >= 800) {
      if (playerCount <= 4) return 3;
      if (playerCount <= 6) return 3;
      if (playerCount <= 8) return 4;
      return 5;
    } else if (arenaWidth >= 500) {
      if (playerCount <= 4) return 2;
      if (playerCount <= 8) return 3;
      return 4;
    } else {
      // Mobile (< 500px)
      if (playerCount <= 4) return 2;
      return 3;
    }
  };

  const colCount = getColCount();
  const boxWidthPercent = `${Math.floor((100 / colCount) - 2)}%`;

  // Trạng thái hành động
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [wolfVotes, setWolfVotes] = useState({}); // { wolfId: targetId }
  const [wolfConfirmed, setWolfConfirmed] = useState([]); // [ wolfId ]
  const [seerResult, setSeerResult] = useState(null); // { targetName, alignment, isWolf }
  const [seerHistory, setSeerHistory] = useState(initialSeerHistory || {});
  const [seerPopupVisible, setSeerPopupVisible] = useState(false);
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

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const crystalPulse = useRef(new Animated.Value(1)).current;
  const shieldPulse = useRef(new Animated.Value(1)).current;
  const popupScaleAnim = useRef(new Animated.Value(0.7)).current;
  const popupOpacityAnim = useRef(new Animated.Value(0)).current;

  const isNightBodyguard = phase === PHASES.NIGHT_BODYGUARD;
  const isNightWolf = phase === PHASES.NIGHT_WOLF || (phase === PHASES.NIGHT && !seerResult && !isNightBodyguard);
  const isNightSeer = phase === PHASES.NIGHT_SEER;
  const isNight = isNightBodyguard || isNightWolf || isNightSeer || phase === PHASES.NIGHT;
  const isGameOver = phase === PHASES.GAME_OVER;

  const me = players.find((p) => p.id === myId) || { alive: true };
  const amAlive = me.alive !== false;
  const alivePlayers = players.filter((p) => p.alive !== false);
  const isHost = myId === hostId;

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

    // Nhận kết quả vote bị loại (Không lộ role)
    const handleVoteResult = (data) => {
      setLastVoteEliminated(data.eliminated);
      if (!data.eliminated) {
        setVoteNoOneHanged(true);
        setTimeout(() => setVoteNoOneHanged(false), 4500);
      }
      setTimeout(() => {
        setLastVoteEliminated(null);
      }, 4500);

      // Hiển thị số lượng Sói còn lại ngay trên giữa màn hình trong 3s
      if (data.remainingWolves !== undefined && data.remainingWolves !== null) {
        setRemainingWolvesOverlay(data.remainingWolves);
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
          });
        }, 3000);
      }
    };

    socket.on('wolf-vote-update', handleWolfVoteUpdate);
    socket.on('seer-result', handleSeerResult);
    socket.on('bodyguard-update', handleBodyguardUpdate);
    socket.on('vote-update', handleVoteUpdate);
    socket.on('vote-result', handleVoteResult);

    return () => {
      socket.off('wolf-vote-update', handleWolfVoteUpdate);
      socket.off('seer-result', handleSeerResult);
      socket.off('bodyguard-update', handleBodyguardUpdate);
      socket.off('vote-update', handleVoteUpdate);
      socket.off('vote-result', handleVoteResult);
    };
  }, [socket]);

  // Reset target và vote khi đổi phase
  useEffect(() => {
    setSelectedTarget(null);
    setDayVoteTarget(null);
    setIlluminatedPlayerId(null);
    if (phase !== PHASES.NIGHT_SEER) {
      setSeerPopupVisible(false);
    }
    if (phase !== PHASES.NIGHT_BODYGUARD) {
      setBodyguardTarget(null);
      setBodyguardSkipped(false);
    }
    if (phase === PHASES.DAY_ANNOUNCE || phase === PHASES.DAY_DISCUSSION) {
      setSeerResult(null);
      setDayVoteCount({});
      setDayVoterMap({});
      setSkipVoteCount(0);
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

  // Sói vote cắn (chọn lại người khác tự do như checkbox/radio)
  const handleWolfTarget = (targetId) => {
    if (!amAlive || myRole !== 'wolf' || !isNightWolf) return;
    setSelectedTarget(targetId);
    // Nếu đổi sang người khác hoặc chọn lại, hủy trạng thái chốt cũ để có thể chốt lại
    setWolfConfirmed((prev) => prev.filter((id) => id !== myId));
    socket.emit('wolf-kill', { targetId });
  };

  // Sói xác nhận mục tiêu (chốt hoặc hủy chốt để đổi mục tiêu)
  const handleWolfConfirm = () => {
    if (!amAlive || myRole !== 'wolf') return;
    const currentTarget = wolfVotes[myId] || selectedTarget;
    if (!currentTarget) return;
    socket.emit('wolf-confirm');
  };

  // Tiên tri soi
  const handleSeerTarget = (targetId) => {
    if (!amAlive || myRole !== 'seer' || !isNightSeer || seerResult) return;
    setSelectedTarget(targetId);
    setIlluminatedPlayerId(targetId);
    socket.emit('seer-check', { targetId });
  };

  // Vote treo cổ ban ngày (hỗ trợ chọn mục tiêu hoặc 'skip' để bỏ phiếu trắng)
  const handleDayVote = (targetId) => {
    if (!amAlive || phase !== PHASES.DAY_VOTE) return;
    const newTarget = dayVoteTarget === targetId ? null : targetId;
    setDayVoteTarget(newTarget);
    socket.emit('day-vote', { targetId: newTarget });
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
      case PHASES.NIGHT_SEER:
        return `🔮 Tiên Tri Soi - Hiệp ${round}`;
      case PHASES.NIGHT:
        return `🌙 Ban Đêm - Hiệp ${round}`;
      case PHASES.DAY_ANNOUNCE:
        return `☀️ Bình Minh - Hiệp ${round}`;
      case PHASES.DAY_DISCUSSION:
        return `🗣️ Thảo Luận - Hiệp ${round}`;
      case PHASES.DAY_VOTE:
        return `⚖️ Bỏ Phiếu Treo Cổ - Hiệp ${round}`;
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
          <View style={styles.header}>
            {/* Vai trò của mình */}
            <TouchableOpacity
              style={[styles.myRoleBadge, { backgroundColor: getRoleColor(myRole) + '35', borderColor: getRoleColor(myRole) }]}
              onPress={() => setShowRoleBrief(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.myRoleEmoji}>{getRoleEmoji(myRole)}</Text>
              <Text style={styles.myRoleText}>{getRoleName(myRole)}</Text>
              {!amAlive && <Text style={styles.deadLabel}> (Hồn ma)</Text>}
            </TouchableOpacity>

            {/* Tiêu đề & Đồng hồ */}
            <View style={styles.phaseInfo}>
              <Text style={styles.phaseTitle}>{getPhaseTitle()}</Text>
              {phase !== PHASES.GAME_OVER && (
                <Animated.View style={[styles.timerBadge, { transform: [{ scale: pulseAnim }] }]}>
                  <Text style={styles.timerText}>⏳ {timeLeft}s</Text>
                </Animated.View>
              )}
            </View>

            {/* Nút thao tác góc phải */}
            <View style={styles.headerRightActions}>
              <TouchableOpacity style={styles.leaveButton} onPress={onLeaveGame} activeOpacity={0.7}>
                <Text style={styles.leaveText}>Rời</Text>
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
              {/* --- KẾT QUẢ VOTE TREO CỔ (KHÔNG TIẾT LỘ VAI TRÒ) --- */}
              {lastVoteEliminated ? (
                <View style={styles.eliminationNotice}>
                  <Text style={styles.elimNoticeTitle}>⚰️ KẾT QUẢ BIỂU QUYẾT</Text>
                  <Text style={styles.elimNoticeText}>
                    Dân làng đã quyết định treo cổ{' '}
                    <Text style={{ fontWeight: 'bold', color: '#FCD34D' }}>{lastVoteEliminated.name}</Text>!
                  </Text>
                  <Text style={styles.elimNoticeSecret}>⚖️ Lý do: Bị Dân Làng treo cổ</Text>
                </View>
              ) : voteNoOneHanged ? (
                <View style={[styles.eliminationNotice, styles.peacefulNotice]}>
                  <Text style={styles.elimNoticeTitle}>🕊️ KẾT QUẢ BIỂU QUYẾT</Text>
                  <Text style={styles.elimNoticeText}>
                    Hòa phiếu hoặc đa số bỏ phiếu trắng — Không ai bị treo cổ hôm nay!
                  </Text>
                </View>
              ) : null}

              {/* --- THÔNG BÁO BÌNH MINH (KHÔNG TIẾT LỘ VAI TRÒ) --- */}
              {phase === PHASES.DAY_ANNOUNCE && (
                <View style={styles.announceCard}>
                  <Text style={styles.announceSun}>☀️</Text>
                  <Text style={styles.announceHeader}>BÌNH MINH LÊN</Text>
                  {savedPlayer && (
                    <View style={styles.savedInfoBox}>
                      <Text style={styles.savedShield}>🛡️</Text>
                      <Text style={styles.savedHeader}>BẢO VỆ CỨU SỐNG THÀNH CÔNG!</Text>
                      <View style={styles.savedTargetBadge}>
                        <Text style={styles.savedTargetLabel}>🐺 Bị Ma Sói cắn:</Text>
                        <Text style={styles.savedPlayerName}>{savedPlayer.name}</Text>
                      </View>
                      <Text style={styles.savedNoticeText}>
                        Đêm qua, Ma Sói đã chọn cắn <Text style={{ fontWeight: 'bold', color: '#38BDF8' }}>{savedPlayer.name}</Text>, nhưng đã được Bảo Vệ che chở an toàn tuyệt đối!
                      </Text>
                      {!deadPlayer && (
                        <View style={styles.savedSecretBadge}>
                          <Text style={styles.savedSecretText}>✨ Đêm qua không một ai thiệt mạng!</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {deadPlayer && (
                    <View style={[styles.deadInfoBox, savedPlayer && { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }]}>
                      <Text style={styles.deadSkull}>💀</Text>
                      <Text style={styles.deadPlayerName}>{deadPlayer.name}</Text>
                      <Text style={styles.deadNoticeText}>đã bị Ma Sói sát hại đêm qua!</Text>
                      <View style={styles.secretRoleBadge}>
                        <Text style={styles.secretRoleText}>🐺 Lý do: Bị Ma Sói cắn chết</Text>
                      </View>
                    </View>
                  )}
                  {!savedPlayer && !deadPlayer && (
                    <View style={styles.peacefulBox}>
                      <Text style={styles.peacefulEmoji}>🕊️</Text>
                      <Text style={styles.peacefulTitle}>Một đêm bình yên!</Text>
                      <Text style={styles.peacefulSubtitle}>
                        Không ai ngã xuống đêm qua. Làng an toàn đón ngày mới!
                      </Text>
                    </View>
                  )}
                </View>
              )}

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

                <View style={styles.discordGrid}>
                  {players.map((player) => {
                    const isMe = player.id === myId;
                    const isAlive = player.alive !== false;
                    const isMyWolfTarget = isNightWolf && myRole === 'wolf' && (wolfVotes[myId] === player.id || selectedTarget === player.id);
                    const isMyBodyguardTarget = isNightBodyguard && myRole === 'bodyguard' && (bodyguardTarget === player.id || selectedTarget === player.id);
                    const isTarget = isMyWolfTarget || dayVoteTarget === player.id || (isNightSeer && selectedTarget === player.id) || isMyBodyguardTarget;
                    const votes = dayVoteCount[player.id] || 0;
                    const voters = dayVoterMap[player.id] || [];

                    // Sói teammates
                    const isWolfTeammate = isNightWolf && myRole === 'wolf' && player.role === 'wolf';
                    const wolfVoters = Object.entries(wolfVotes)
                      .filter(([_, tid]) => tid === player.id)
                      .map(([wid]) => players.find((p) => p.id === wid)?.name || 'Sói');

                    // Điều kiện chọn của Bảo Vệ: Không thể bảo vệ cùng 1 người 2 đêm liên tiếp!
                    const isLastProtected = isNightBodyguard && myRole === 'bodyguard' && player.id === lastProtectedTarget;
                    const canBodyguardTarget = isNightBodyguard && myRole === 'bodyguard' && amAlive && isAlive && !isLastProtected;

                    // Điều kiện bấm vào ô (cho phép bấm chọn và đổi chọn bất cứ lúc nào)
                    const canVoteDay = phase === PHASES.DAY_VOTE && amAlive && isAlive;
                    const canWolfTarget = isNightWolf && myRole === 'wolf' && amAlive && isAlive && !isWolfTeammate;
                    const canSeerTarget = isNightSeer && myRole === 'seer' && amAlive && isAlive && !isMe && !seerResult;
                    const isClickable = canVoteDay || canWolfTarget || canSeerTarget || canBodyguardTarget;

                    return (
                      <TouchableOpacity
                        key={player.id}
                        style={[
                          styles.discordBox,
                          { flexBasis: boxWidthPercent },
                          isCompact && styles.discordBoxCompact,
                          isUltraCompact && styles.discordBoxUltraCompact,
                          isClickable && styles.discordBoxClickable,
                          isTarget && styles.discordBoxSelected,
                          !isAlive && styles.discordBoxDead,
                          isLastProtected && styles.discordBoxDisabled,
                        ]}
                        disabled={!isClickable}
                        onPress={() => {
                          if (canVoteDay) handleDayVote(player.id);
                          else if (canWolfTarget) handleWolfTarget(player.id);
                          else if (canSeerTarget) handleSeerTarget(player.id);
                          else if (canBodyguardTarget) handleBodyguardTarget(player.id);
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

                        {/* Avatar người chơi (tự động thu nhỏ khi đông người để giảm chiều cao) */}
                        <View style={[styles.discordAvatarCenter, isCompact && styles.discordAvatarCenterCompact]}>
                          <PlayerAvatar
                            player={player}
                            size={isCompact ? 'small' : 'medium'}
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

                        {/* Tên người chơi pill */}
                        <View style={[styles.discordNamePill, isMe && styles.discordNamePillMe, isCompact && styles.discordNamePillCompact]}>
                          <Text style={[styles.discordNameText, isCompact && styles.discordNameTextCompact]} numberOfLines={1}>
                            {player.name}
                          </Text>
                        </View>

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
              {(isNightBodyguard && myRole === 'bodyguard' && amAlive) || (isNightWolf && myRole === 'wolf' && amAlive) || (isNightSeer && myRole === 'seer' && amAlive) || phase === PHASES.DAY_VOTE ? (
                <View style={styles.bottomActionBar}>
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

                  {/* --- BANNER HÀNH ĐỘNG CỦA PHA SÓI (1P30S & NÚT CHỐT SAU KHI TẤT CẢ ĐÃ CẮN) --- */}
                  {isNightWolf && myRole === 'wolf' && amAlive && (() => {
                    const aliveWolves = players.filter((p) => p.role === 'wolf' && p.alive !== false);
                    const allWolvesVoted = aliveWolves.length > 0 && aliveWolves.every((w) => !!wolfVotes[w.id]);
                    const myTargetId = wolfVotes[myId] || selectedTarget;
                    const myTargetPlayer = players.find((p) => p.id === myTargetId);
                    const isConfirmed = wolfConfirmed.includes(myId);
    
                    return (
                      <View style={styles.wolfActionCard}>
                        <View style={styles.wolfActionHeader}>
                          <Text style={styles.wolfActionTitle}>🐺 BẦY SÓI HỘI Ý & CHỌN MỒI (1 PHÚT 30 GIÂY)</Text>
                          <Text style={styles.wolfActionSub}>
                            {myTargetPlayer
                              ? `Bạn đã chọn: ${myTargetPlayer.name}. (Bấm vào người khác để đổi bất cứ lúc nào)`
                              : 'Bấm vào 1 người trong các ô bên trên để chọn cắn:'}
                          </Text>
                        </View>
    
                        {/* Trạng thái chọn của các Sói */}
                        <View style={styles.wolfVoteStatusRow}>
                          <Text style={styles.wolfVoteStatusText}>
                            🐺 Đã chọn mồi: {Object.keys(wolfVotes).length}/{aliveWolves.length} Sói
                          </Text>
                        </View>
    
                        {/* NÚT CHỐT: Chỉ xuất hiện sau khi TẤT CẢ SÓI đã cắn/chọn */}
                        {allWolvesVoted ? (
                          <View style={styles.wolfChotBox}>
                            <TouchableOpacity
                              style={[
                                styles.wolfConfirmBtn,
                                isConfirmed ? styles.wolfConfirmedActiveBtn : styles.wolfReadyToConfirmBtn,
                              ]}
                              onPress={handleWolfConfirm}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.wolfConfirmBtnText}>
                                {isConfirmed
                                  ? '✅ BẠN ĐÃ CHỐT (Bấm để hủy chốt / đổi mồi)'
                                  : '🎯 CHỐT MỤC TIÊU CẮN'}
                              </Text>
                            </TouchableOpacity>
                            <Text style={styles.wolfChotHint}>
                              {isConfirmed
                                ? `Đã chốt: ${wolfConfirmed.length}/${aliveWolves.length} Sói. Nếu muốn cắn lại ai khác, bạn vẫn có thể bấm chọn người đó.`
                                : 'Tất cả Sói đã chọn mục tiêu! Bấm "Chốt mục tiêu" để đồng thuận.'}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.wolfWaitingNotice}>
                            <Text style={styles.wolfWaitingNoticeText}>
                              ⏳ Đang đợi tất cả Sói chọn mục tiêu ({Object.keys(wolfVotes).length}/{aliveWolves.length}). Nút Chốt sẽ xuất hiện khi tất cả đã chọn!
                            </Text>
                          </View>
                        )}
                      </View>
                    );
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
              <View style={styles.chatMobileDrawerContent}>
                <ChatBox
                  messages={messages}
                  onSend={onSendMessage}
                  isNight={isNight}
                  disabled={!amAlive && phase !== PHASES.GAME_OVER}
                  myRole={myRole}
                  myId={myId}
                  phase={phase}
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
                  {myRole === 'wolf' ? 'Thuộc: Phe Ma Sói 🐺' : 'Thuộc: Phe Dân Làng 🕊️'}
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
          <Modal visible={seerPopupVisible && !!seerResult} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <Animated.View
                style={[
                  styles.seerPopupCard,
                  seerResult?.alignment === 'evil' ? styles.seerPopupCardEvil : styles.seerPopupCardGood,
                  { transform: [{ scale: popupScaleAnim }], opacity: popupOpacityAnim },
                ]}
              >
                {/* CHỈ HIỂN THỊ "THIỆN" HOẶC "ÁC" - tự biến mất khi hết thời gian */}
                <Text
                  style={[
                    styles.seerVerdictBig,
                    { color: seerResult?.alignment === 'evil' ? '#F87171' : '#34D399' },
                  ]}
                >
                  {seerResult?.alignment === 'evil' ? 'ÁC' : 'THIỆN'}
                </Text>
                <Text style={styles.seerCountdownText}>⏳ {Math.max(0, timeLeft)}s</Text>
              </Animated.View>
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

          {/* ================= THÔNG BÁO SỐ LƯỢNG SÓI CÒN LẠI NGAY GIỮA MÀN HÌNH TRONG 3S ================= */}
          {remainingWolvesOverlay !== null && (
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
                <View style={styles.wolfCountGlowBadge}>
                  <Text style={styles.wolfCountEmoji}>🐺</Text>
                </View>
                <Text style={styles.wolfCountHeader}>SỐ LƯỢNG SÓI CÒN LẠI</Text>
                <View style={styles.wolfCountNumberBox}>
                  <Text style={styles.wolfCountNumber}>{remainingWolvesOverlay}</Text>
                </View>
                <Text style={styles.wolfCountSubtitle}>
                  {remainingWolvesOverlay === 0
                    ? '🎉 Toàn bộ Ma Sói đã bị tiêu diệt!'
                    : `⚠️ ${remainingWolvesOverlay} con Sói vẫn đang ẩn nấp trong làng!`}
                </Text>
                <View style={styles.wolfCountTimerPill}>
                  <Text style={styles.wolfCountTimerText}>⏱️ Tự đóng sau 3s</Text>
                </View>
              </Animated.View>
            </View>
          )}
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
  },

  // Arena Column (Trái)
  arenaColumn: {
    flex: 1,
    height: '100%',
  },
  arenaScroll: {
    flex: 1,
  },
  bottomActionBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: 'rgba(10, 8, 25, 0.9)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(124, 58, 237, 0.35)',
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
    minWidth: 80,
    backgroundColor: 'rgba(24, 24, 32, 0.88)',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  discordBoxCompact: {
    padding: 6,
    borderRadius: 10,
  },
  discordBoxUltraCompact: {
    padding: 4,
    borderRadius: 8,
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
    marginBottom: 20,
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
  wolfCountTimerPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  wolfCountTimerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
});
