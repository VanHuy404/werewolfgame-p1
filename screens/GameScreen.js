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
  ImageBackground,
} from 'react-native';
import { COLORS, getRoleColor, getRoleName, getRoleEmoji } from '../utils/colors';
import PlayerAvatar from '../components/PlayerAvatar';
import ChatBox from '../components/ChatBox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pha trong game
const PHASES = {
  WAITING: 'waiting',
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
  winner = null,
  winMessage = '',
  messages = [],
  onSendMessage,
  onReturnToLobby,
  onLeaveGame,
  myId,
  hostId,
}) {
  // Trạng thái hành động
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [wolfVotes, setWolfVotes] = useState({}); // { wolfId: targetId }
  const [wolfConfirmed, setWolfConfirmed] = useState([]); // [ wolfId ]
  const [seerResult, setSeerResult] = useState(null); // { targetName, alignment, isWolf }
  const [seerPopupVisible, setSeerPopupVisible] = useState(false);
  const [illuminatedPlayerId, setIlluminatedPlayerId] = useState(null);
  const [showRoleBrief, setShowRoleBrief] = useState(false);
  const [dayVoteTarget, setDayVoteTarget] = useState(null);
  const [dayVoteCount, setDayVoteCount] = useState({});
  const [dayVoterMap, setDayVoterMap] = useState({});
  const [totalVoted, setTotalVoted] = useState(0);
  const [lastVoteEliminated, setLastVoteEliminated] = useState(null);
  const [voteNoOneHanged, setVoteNoOneHanged] = useState(false);
  const [skipVoteCount, setSkipVoteCount] = useState(0);
  const [mobileChatVisible, setMobileChatVisible] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const crystalPulse = useRef(new Animated.Value(1)).current;
  const popupScaleAnim = useRef(new Animated.Value(0.7)).current;
  const popupOpacityAnim = useRef(new Animated.Value(0)).current;

  const isNightWolf = phase === PHASES.NIGHT_WOLF || (phase === PHASES.NIGHT && !seerResult);
  const isNightSeer = phase === PHASES.NIGHT_SEER;
  const isNight = isNightWolf || isNightSeer || phase === PHASES.NIGHT;
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
      setSeerPopupVisible(true);
      popupScaleAnim.setValue(0.7);
      popupOpacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(popupScaleAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.timing(popupOpacityAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
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
    };

    socket.on('wolf-vote-update', handleWolfVoteUpdate);
    socket.on('seer-result', handleSeerResult);
    socket.on('vote-update', handleVoteUpdate);
    socket.on('vote-result', handleVoteResult);

    return () => {
      socket.off('wolf-vote-update', handleWolfVoteUpdate);
      socket.off('seer-result', handleSeerResult);
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

  // Nhịp đập đồng hồ khi thời gian < 5s
  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [timeLeft]);

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
              {/* Nút dành riêng cho chủ phòng để bỏ qua giai đoạn Vote */}
              {isHost && phase === PHASES.DAY_VOTE && (
                <TouchableOpacity
                  style={styles.hostSkipVoteBtn}
                  onPress={handleHostSkipVote}
                  activeOpacity={0.7}
                >
                  <Text style={styles.hostSkipVoteIcon}>⏩</Text>
                  <Text style={styles.hostSkipVoteText}>Bỏ qua Vote</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.mobileChatToggleBtn}
                onPress={() => setMobileChatVisible(!mobileChatVisible)}
                activeOpacity={0.7}
              >
                <Text style={styles.mobileChatToggleText}>
                  💬 Chat {messages.length > 0 ? `(${messages.length})` : ''}
                </Text>
              </TouchableOpacity>
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
                  {deadPlayer ? (
                    <View style={styles.deadInfoBox}>
                      <Text style={styles.deadSkull}>💀</Text>
                      <Text style={styles.deadPlayerName}>{deadPlayer.name}</Text>
                      <Text style={styles.deadNoticeText}>đã bị Ma Sói sát hại đêm qua!</Text>
                      <View style={styles.secretRoleBadge}>
                        <Text style={styles.secretRoleText}>🐺 Lý do: Bị Ma Sói cắn chết</Text>
                      </View>
                    </View>
                  ) : (
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
                    const isTarget = isMyWolfTarget || dayVoteTarget === player.id || (isNightSeer && selectedTarget === player.id);
                    const votes = dayVoteCount[player.id] || 0;
                    const voters = dayVoterMap[player.id] || [];

                    // Sói teammates
                    const isWolfTeammate = isNightWolf && myRole === 'wolf' && player.role === 'wolf';
                    const wolfVoters = Object.entries(wolfVotes)
                      .filter(([_, tid]) => tid === player.id)
                      .map(([wid]) => players.find((p) => p.id === wid)?.name || 'Sói');

                    // Điều kiện bấm vào ô (cho phép bấm chọn và đổi chọn bất cứ lúc nào)
                    const canVoteDay = phase === PHASES.DAY_VOTE && amAlive && isAlive;
                    const canWolfTarget = isNightWolf && myRole === 'wolf' && amAlive && isAlive && !isWolfTeammate;
                    const canSeerTarget = isNightSeer && myRole === 'seer' && amAlive && isAlive && !isMe && !seerResult;
                    const isClickable = canVoteDay || canWolfTarget || canSeerTarget;

                    return (
                      <TouchableOpacity
                        key={player.id}
                        style={[
                          styles.discordBox,
                          isClickable && styles.discordBoxClickable,
                          isTarget && styles.discordBoxSelected,
                          !isAlive && styles.discordBoxDead,
                        ]}
                        disabled={!isClickable}
                        onPress={() => {
                          if (canVoteDay) handleDayVote(player.id);
                          else if (canWolfTarget) handleWolfTarget(player.id);
                          else if (canSeerTarget) handleSeerTarget(player.id);
                        }}
                        activeOpacity={0.8}
                      >
                        {/* Status bar trên cùng của ô Discord */}
                        <View style={styles.discordTileTopRow}>
                          <View style={[styles.discordStatusDot, isAlive ? styles.statusOnline : styles.statusOffline]} />
                          {isMe && (
                            <View style={styles.discordMeTag}>
                              <Text style={styles.discordMeTagText}>Bạn</Text>
                            </View>
                          )}
                          {isWolfTeammate && !isMe && (
                            <View style={styles.discordWolfTeammateTag}>
                              <Text style={styles.discordWolfTeammateText}>🐺 Đồng đội</Text>
                            </View>
                          )}
                          {/* Checkbox indicator trực quan */}
                          {isClickable && (
                            <View style={[styles.discordCheckboxPill, isTarget && styles.discordCheckboxPillChecked]}>
                              <Text style={styles.discordCheckboxIcon}>{isTarget ? '☑️' : '⬜'}</Text>
                            </View>
                          )}
                        </View>

                        {/* Avatar người chơi */}
                        <View style={styles.discordAvatarCenter}>
                          <PlayerAvatar
                            player={player}
                            size="medium"
                            isIlluminated={illuminatedPlayerId === player.id}
                            selected={isTarget}
                            compact
                          />
                        </View>

                        {/* ================= HIỂN THỊ CÁC LƯỢT VOTE Ở DƯỚI AVT ================= */}
                        {phase === PHASES.DAY_VOTE && votes > 0 && (
                          <View style={styles.discordVoteRowUnderAvt}>
                            <View style={styles.discordVoteBadge}>
                              <Text style={styles.discordVoteBadgeText}>🗳️ {votes} phiếu</Text>
                            </View>
                            {voters.length > 0 && (
                              <View style={styles.discordVotersMini}>
                                {voters.map((v, i) => (
                                  <Text key={`${v.id}-${i}`} style={styles.discordVoterEmoji}>
                                    {v.avatar || '👤'}
                                  </Text>
                                ))}
                              </View>
                            )}
                          </View>
                        )}

                        {/* Phiếu Sói ban đêm dưới avatar */}
                        {isNightWolf && myRole === 'wolf' && wolfVoters.length > 0 && (
                          <View style={styles.discordWolfVoteRow}>
                            <Text style={styles.discordWolfVoteText}>🐺 {wolfVoters.join(', ')}</Text>
                          </View>
                        )}

                        {/* Tên người chơi pill */}
                        <View style={[styles.discordNamePill, isMe && styles.discordNamePillMe]}>
                          <Text style={styles.discordNameText} numberOfLines={1}>
                            {player.name}
                          </Text>
                        </View>

                        {/* Trạng thái sống/chết (KHÔNG TIẾT LỘ VAI TRÒ) */}
                        <Text style={[styles.discordStatusLabel, !isAlive && styles.discordStatusLabelDead]}>
                          {isAlive ? '🟢 Sống' : '💀 Hồn ma'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

            </ScrollView>

              {/* ================= THANH HÀNH ĐỘNG CỐ ĐỊNH DƯỚI ĐÁY MÀN HÌNH ================= */}
              {(isNightWolf && myRole === 'wolf' && amAlive) || (isNightSeer && myRole === 'seer' && amAlive) || phase === PHASES.DAY_VOTE ? (
                <View style={styles.bottomActionBar}>
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

            {/* ---------------- CỘT BÊN PHẢI: KHUNG CHAT CỐ ĐỊNH (RIGHT SIDEBAR) ---------------- */}
            <View style={[styles.chatColumn, mobileChatVisible && styles.chatColumnMobileVisible]}>
              <ChatBox
                messages={messages}
                onSend={onSendMessage}
                isNight={isNight}
                disabled={!amAlive && phase !== PHASES.GAME_OVER}
                myRole={myRole}
                myId={myId}
                phase={phase}
              />
            </View>
          </View>

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
  mobileChatToggleBtn: {
    display: Platform.OS === 'web' && SCREEN_WIDTH > 860 ? 'none' : 'flex',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  mobileChatToggleText: {
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
    padding: 16,
    paddingBottom: 32,
  },

  // Chat Column (Phải)
  chatColumn: {
    width: 380,
    height: '100%',
    borderLeftWidth: 1.5,
    borderLeftColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(15, 12, 30, 0.94)',
    display: 'flex',
    flexDirection: 'column',
  },
  chatColumnMobileVisible: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    zIndex: 99,
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
    gap: 12,
  },
  discordBox: {
    flexBasis: '47%',
    minWidth: 140,
    backgroundColor: 'rgba(24, 24, 32, 0.88)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
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
    marginBottom: 6,
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
  discordWolfTeammateText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F87171',
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
    marginTop: 6,
    maxWidth: '100%',
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
  discordStatusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 3,
  },
  discordStatusLabelDead: {
    color: '#EF4444',
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
});
