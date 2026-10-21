// ============================================
// 🐺 MA SÓI - GameScreen
// Màn hình chính trong trận đấu: Ban Đêm, Ban Ngày, Thảo Luận, Vote, Kết Thúc
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Animated, Modal, Platform, SafeAreaView,
} from 'react-native';
import { COLORS, getRoleColor, getRoleName, getRoleEmoji } from '../utils/colors';
import PlayerAvatar from '../components/PlayerAvatar';
import ChatBox from '../components/ChatBox';
import VotePanel from '../components/VotePanel';
import RoleCard from '../components/RoleCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pha trong game
const PHASES = {
  WAITING: 'waiting',
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
  onLeaveGame,
  myId,
}) {
  // Trạng thái hành động ban đêm
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [wolfVotes, setWolfVotes] = useState({}); // { wolfId: targetId }
  const [seerResult, setSeerResult] = useState(null); // { targetName, isWolf }
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRoleBrief, setShowRoleBrief] = useState(false);
  const [activeTab, setActiveTab] = useState('actions'); // 'actions' | 'chat' | 'players'
  const [dayVoteTarget, setDayVoteTarget] = useState(null);
  const [dayVoteCount, setDayVoteCount] = useState({});
  const [totalVoted, setTotalVoted] = useState(0);
  const [lastVoteEliminated, setLastVoteEliminated] = useState(null);

  // Animations
  const skyAnim = useRef(new Animated.Value(0)).current; // 0: đêm, 1: ngày
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sunMoonAnim = useRef(new Animated.Value(0)).current;

  const isNight = phase === PHASES.NIGHT;
  const isDay = phase === PHASES.DAY_ANNOUNCE || phase === PHASES.DAY_DISCUSSION || phase === PHASES.DAY_VOTE;
  const isGameOver = phase === PHASES.GAME_OVER;

  const me = players.find((p) => p.id === myId) || { alive: true };
  const amAlive = me.alive !== false;

  // Lắng nghe socket events trong trận
  useEffect(() => {
    if (!socket) return;

    // Sói nhận cập nhật vote mục tiêu của các Sói khác
    const handleWolfVoteUpdate = (data) => {
      setWolfVotes(data.wolfVotes || {});
    };

    // Tiên Tri nhận kết quả soi
    const handleSeerResult = (data) => {
      setSeerResult(data);
    };

    // Nhận cập nhật vote ban ngày
    const handleVoteUpdate = (data) => {
      setDayVoteCount(data.voteCount || {});
      setTotalVoted(data.totalVoted || 0);
    };

    // Nhận kết quả vote bị loại
    const handleVoteResult = (data) => {
      setLastVoteEliminated(data.eliminated);
      setTimeout(() => {
        setLastVoteEliminated(null);
      }, 3500);
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
    setSeerResult(null);

    // Chuyển màu nền bầu trời mượt mà
    Animated.timing(skyAnim, {
      toValue: isNight ? 0 : 1,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    // Chuyển động mặt trăng / mặt trời
    Animated.spring(sunMoonAnim, {
      toValue: isNight ? 0 : 1,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [phase]);

  // Nhịp đập đồng hồ khi thời gian < 5s
  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [timeLeft]);

  // Sói vote cắn
  const handleWolfTarget = (targetId) => {
    if (!amAlive || myRole !== 'wolf' || !isNight) return;
    setSelectedTarget(targetId);
    socket.emit('wolf-kill', { targetId });
  };

  // Tiên tri soi
  const handleSeerTarget = (targetId) => {
    if (!amAlive || myRole !== 'seer' || !isNight || seerResult) return;
    setSelectedTarget(targetId);
    socket.emit('seer-check', { targetId });
  };

  // Vote treo cổ ban ngày
  const handleDayVote = (targetId) => {
    if (!amAlive || phase !== PHASES.DAY_VOTE) return;
    setDayVoteTarget(targetId);
    socket.emit('day-vote', { targetId });
  };

  // Interpolated background color
  const backgroundColor = skyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.nightBg, COLORS.dayBg],
  });

  // Người chơi còn sống
  const alivePlayers = players.filter((p) => p.alive);
  const deadPlayers = players.filter((p) => !p.alive);

  // Title theo phase
  const getPhaseTitle = () => {
    switch (phase) {
      case PHASES.NIGHT:
        return `🌙 Ban Đêm - Hiệp ${round}`;
      case PHASES.DAY_ANNOUNCE:
        return `☀️ Trời Sáng - Hiệp ${round}`;
      case PHASES.DAY_DISCUSSION:
        return `🗣️ Thảo Luận - Hiệp ${round}`;
      case PHASES.DAY_VOTE:
        return `⚖️ Bỏ Phiếu - Hiệp ${round}`;
      case PHASES.GAME_OVER:
        return `🏆 Trận Đấu Kết Thúc`;
      default:
        return 'Ma Sói';
    }
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* ================= HEADER ================= */}
        <View style={[styles.header, isNight ? styles.headerNight : styles.headerDay]}>
          {/* Nút xem role của mình */}
          <TouchableOpacity
            style={[styles.myRoleBadge, { backgroundColor: getRoleColor(myRole) + '30', borderColor: getRoleColor(myRole) }]}
            onPress={() => setShowRoleBrief(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.myRoleEmoji}>{getRoleEmoji(myRole)}</Text>
            <Text style={[styles.myRoleText, { color: isNight ? COLORS.white : COLORS.black }]}>
              {getRoleName(myRole)}
            </Text>
            {!amAlive && <Text style={styles.deadLabel}> (Hồn ma)</Text>}
          </TouchableOpacity>

          {/* Tiêu đề & Đồng hồ đếm ngược */}
          <View style={styles.phaseInfo}>
            <Text style={[styles.phaseTitle, isNight ? styles.textNight : styles.textDay]}>
              {getPhaseTitle()}
            </Text>
            {phase !== PHASES.GAME_OVER && (
              <Animated.View style={[styles.timerBadge, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.timerText}>⏳ {timeLeft}s</Text>
              </Animated.View>
            )}
          </View>

          {/* Nút Rời phòng */}
          <TouchableOpacity style={styles.leaveButton} onPress={onLeaveGame} activeOpacity={0.7}>
            <Text style={styles.leaveText}>Rời</Text>
          </TouchableOpacity>
        </View>

        {/* ================= TAB NAVIGATION (Hành Động / Chat / Người Chơi) ================= */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'actions' && styles.tabItemActive]}
            onPress={() => setActiveTab('actions')}
          >
            <Text style={[styles.tabText, activeTab === 'actions' && styles.tabTextActive, isNight && { color: COLORS.nightText }]}>
              🎮 {isNight ? 'Hành Động' : phase === PHASES.DAY_VOTE ? 'Bỏ Phiếu' : 'Bàn Tròn'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]}
            onPress={() => setActiveTab('chat')}
          >
            <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive, isNight && { color: COLORS.nightText }]}>
              💬 Chat {messages.length > 0 ? `(${messages.length})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'players' && styles.tabItemActive]}
            onPress={() => setActiveTab('players')}
          >
            <Text style={[styles.tabText, activeTab === 'players' && styles.tabTextActive, isNight && { color: COLORS.nightText }]}>
              👥 Người Chơi ({alivePlayers.length}/{players.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= NỘI DUNG CHÍNH THEO TAB ================= */}
        <View style={styles.mainContent}>
          {/* TAB 1: ACTIONS / GAMEPLAY */}
          {activeTab === 'actions' && (
            <ScrollView contentContainerStyle={styles.actionsScroll} showsVerticalScrollIndicator={false}>
              {/* --- KẾT QUẢ VOTE VỪA XONG --- */}
              {lastVoteEliminated && (
                <View style={styles.eliminationNotice}>
                  <Text style={styles.elimNoticeTitle}>⚰️ KẾT QUẢ BIỂU QUYẾT</Text>
                  <Text style={styles.elimNoticeText}>
                    Dân làng đã quyết định treo cổ{' '}
                    <Text style={{ fontWeight: 'bold' }}>{lastVoteEliminated.name}</Text>!
                  </Text>
                  <Text style={styles.elimNoticeRole}>
                    Thân phận thật sự: {getRoleEmoji(lastVoteEliminated.role)} {getRoleName(lastVoteEliminated.role)}
                  </Text>
                </View>
              )}

              {/* --- 1. BAN ĐÊM (NIGHT PHASE) --- */}
              {isNight && (
                <View style={styles.nightSection}>
                  {/* SÓI */}
                  {myRole === 'wolf' && amAlive && (
                    <View style={styles.actionCard}>
                      <View style={styles.actionHeader}>
                        <Text style={styles.actionTitle}>🐺 Bầy Sói Hội Ý</Text>
                        <Text style={styles.actionSubtitle}>
                          Chọn 1 người để cắn trong đêm nay:
                        </Text>
                      </View>

                      <View style={styles.targetsGrid}>
                        {alivePlayers.map((player) => {
                          const isMyself = player.id === myId;
                          const isWolfTeammate = player.role === 'wolf';
                          const isSelected = selectedTarget === player.id;
                          const wolfVoters = Object.entries(wolfVotes)
                            .filter(([_, tid]) => tid === player.id)
                            .map(([wid]) => players.find((p) => p.id === wid)?.name || 'Sói');

                          return (
                            <TouchableOpacity
                              key={player.id}
                              style={[
                                styles.targetBtn,
                                isSelected && styles.targetBtnSelected,
                                (isMyself || isWolfTeammate) && styles.targetBtnDisabled,
                              ]}
                              disabled={isMyself || isWolfTeammate}
                              onPress={() => handleWolfTarget(player.id)}
                              activeOpacity={0.7}
                            >
                              <PlayerAvatar player={player} size="medium" compact />
                              {wolfVoters.length > 0 && (
                                <View style={styles.wolfVoterBadge}>
                                  <Text style={styles.wolfVoterText}>
                                    🐺 {wolfVoters.join(', ')}
                                  </Text>
                                </View>
                              )}
                              {isWolfTeammate && !isMyself && (
                                <Text style={styles.teammateTag}>(Đồng Đội)</Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* TIÊN TRI */}
                  {myRole === 'seer' && amAlive && (
                    <View style={styles.actionCard}>
                      <View style={styles.actionHeader}>
                        <Text style={styles.actionTitle}>🔮 Quả Cầu Pha Lê</Text>
                        <Text style={styles.actionSubtitle}>
                          {seerResult
                            ? 'Bạn đã soi xong người này:'
                            : 'Chọn 1 người bất kỳ để soi vai trò:'}
                        </Text>
                      </View>

                      {seerResult ? (
                        <View style={[styles.seerResultCard, { borderColor: seerResult.isWolf ? COLORS.wolf : COLORS.villager }]}>
                          <Text style={styles.seerResultEmoji}>
                            {seerResult.isWolf ? '🐺' : '🧑‍🌾'}
                          </Text>
                          <Text style={styles.seerResultName}>{seerResult.targetName}</Text>
                          <Text style={[styles.seerResultDesc, { color: seerResult.isWolf ? COLORS.wolf : COLORS.villager }]}>
                            {seerResult.isWolf ? 'LÀ MA SÓI HUNG ÁC!' : 'LÀ DÂN LÀNG LƯƠNG THIỆN!'}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.targetsGrid}>
                          {alivePlayers
                            .filter((p) => p.id !== myId)
                            .map((player) => {
                              const isSelected = selectedTarget === player.id;
                              return (
                                <TouchableOpacity
                                  key={player.id}
                                  style={[styles.targetBtn, isSelected && styles.targetBtnSelectedSeer]}
                                  onPress={() => handleSeerTarget(player.id)}
                                  activeOpacity={0.7}
                                >
                                  <PlayerAvatar player={player} size="medium" compact />
                                </TouchableOpacity>
                              );
                            })}
                        </View>
                      )}
                    </View>
                  )}

                  {/* DÂN LÀNG HOẶC ĐÃ CHẾT */}
                  {(myRole === 'villager' || !amAlive) && (
                    <View style={styles.sleepingCard}>
                      <Text style={styles.sleepingMoon}>🌙</Text>
                      <Text style={styles.sleepingTitle}>
                        {!amAlive ? '👻 Bạn Đã Trở Thành Hồn Ma' : '😴 Làng Đang Chìm Trong Giấc Ngủ...'}
                      </Text>
                      <Text style={styles.sleepingSubtitle}>
                        {!amAlive
                          ? 'Bạn có thể quan sát và trò chuyện cùng các linh hồn khác.'
                          : 'Đêm nay lạnh giá và tĩnh mịch. Hãy cầu nguyện trời mau sáng để không ai bị hại!'}
                      </Text>
                      <View style={styles.starsRow}>
                        <Text>✨</Text>
                        <Text>⭐</Text>
                        <Text>✨</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* --- 2. THÔNG BÁO BAN NGÀY (DAY ANNOUNCE) --- */}
              {phase === PHASES.DAY_ANNOUNCE && (
                <View style={styles.announceContainer}>
                  <Text style={styles.announceSun}>☀️</Text>
                  <Text style={styles.announceHeader}>BÌNH MINH LÊN</Text>
                  {deadPlayer ? (
                    <View style={styles.deadCard}>
                      <Text style={styles.deadSkull}>💀</Text>
                      <Text style={styles.deadPlayerName}>{deadPlayer.name}</Text>
                      <Text style={styles.deadNotice}>đã bị Ma Sói sát hại đêm qua!</Text>
                      <View style={styles.deadRoleBadge}>
                        <Text style={styles.deadRoleText}>
                          Vai trò: {getRoleEmoji(deadPlayer.role)} {getRoleName(deadPlayer.role)}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.peacefulCard}>
                      <Text style={styles.peacefulEmoji}>🕊️</Text>
                      <Text style={styles.peacefulTitle}>Một đêm bình yên!</Text>
                      <Text style={styles.peacefulSubtitle}>
                        Không có ai ngã xuống đêm qua! Làng may mắn thoát nạn.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* --- 3. THẢO LUẬN BAN NGÀY (DAY DISCUSSION) --- */}
              {phase === PHASES.DAY_DISCUSSION && (
                <View style={styles.discussionSection}>
                  <View style={styles.discussionBanner}>
                    <Text style={styles.discussionEmoji}>📢</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.discussionTitle}>Hãy cùng nhau tranh luận!</Text>
                      <Text style={styles.discussionSubtitle}>
                        Chia sẻ thông tin, phân tích hành vi và tìm ra kẻ mạo danh trước khi bỏ phiếu.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.playerCircleWrap}>
                    <Text style={styles.circleHeading}>Thành viên còn sống:</Text>
                    <View style={styles.circleGrid}>
                      {alivePlayers.map((player) => (
                        <View key={player.id} style={styles.circleItem}>
                          <PlayerAvatar player={player} size="small" />
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* --- 4. BỎ PHIẾU BAN NGÀY (DAY VOTE) --- */}
              {phase === PHASES.DAY_VOTE && (
                <VotePanel
                  players={players}
                  myId={myId}
                  selectedTarget={dayVoteTarget}
                  voteCount={dayVoteCount}
                  totalVoted={totalVoted}
                  totalAlive={alivePlayers.length}
                  onVote={handleDayVote}
                  disabled={!amAlive}
                />
              )}

              {/* --- 5. GAME OVER --- */}
              {isGameOver && (
                <View style={styles.gameOverCard}>
                  <Text style={styles.victoryTrophy}>
                    {winner === 'villagers' ? '🎉' : '🐺'}
                  </Text>
                  <Text style={[styles.victoryTitle, { color: winner === 'villagers' ? COLORS.villager : COLORS.wolf }]}>
                    {winner === 'villagers' ? 'PHE DÂN LÀNG CHIẾN THẮNG!' : 'PHE MA SÓI CHIẾN THẮNG!'}
                  </Text>
                  <Text style={styles.victoryMessage}>{winMessage}</Text>

                  {/* Danh sách vai trò lộ diện */}
                  <Text style={styles.revealHeading}>Danh tính thật sự của các người chơi:</Text>
                  <View style={styles.revealGrid}>
                    {players.map((p) => (
                      <View key={p.id} style={styles.revealItem}>
                        <View style={[styles.revealAvatar, { backgroundColor: p.avatarColor || '#4ECDC4' }]}>
                          <Text style={styles.revealAvatarText}>{p.avatar}</Text>
                        </View>
                        <Text style={styles.revealName} numberOfLines={1}>{p.name}</Text>
                        <View style={[styles.roleTag, { backgroundColor: getRoleColor(p.role) + '25', borderColor: getRoleColor(p.role) }]}>
                          <Text style={[styles.roleTagText, { color: getRoleColor(p.role) }]}>
                            {getRoleEmoji(p.role)} {getRoleName(p.role)}
                          </Text>
                        </View>
                        {!p.alive && <Text style={styles.revealDead}>⚰️ Đã chết</Text>}
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.returnLobbyBtn} onPress={onLeaveGame} activeOpacity={0.8}>
                    <Text style={styles.returnLobbyText}>Trở về phòng chờ</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}

          {/* TAB 2: CHAT BOX */}
          {activeTab === 'chat' && (
            <View style={styles.chatWrapper}>
              <ChatBox
                messages={messages}
                onSend={onSendMessage}
                isNight={isNight}
                disabled={!amAlive && phase !== PHASES.GAME_OVER}
                isWolfChat={isNight && myRole === 'wolf'}
                myId={myId}
              />
            </View>
          )}

          {/* TAB 3: PLAYERS LIST */}
          {activeTab === 'players' && (
            <ScrollView contentContainerStyle={styles.playersListScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.listHeader, isNight && { color: COLORS.nightText }]}>
                🟢 Còn sống ({alivePlayers.length})
              </Text>
              <View style={styles.playersGrid}>
                {alivePlayers.map((p) => (
                  <View key={p.id} style={styles.playerCardItem}>
                    <PlayerAvatar player={p} size="medium" />
                    {p.id === myId && <Text style={styles.youBadge}>(Bạn)</Text>}
                  </View>
                ))}
              </View>

              {deadPlayers.length > 0 && (
                <>
                  <Text style={[styles.listHeader, isNight && { color: COLORS.nightText }, { marginTop: 24 }]}>
                    💀 Đã hy sinh ({deadPlayers.length})
                  </Text>
                  <View style={styles.playersGrid}>
                    {deadPlayers.map((p) => (
                      <View key={p.id} style={[styles.playerCardItem, styles.deadCardItem]}>
                        <PlayerAvatar player={p} size="medium" isDead />
                        {p.role && (
                          <Text style={styles.revealedRole}>
                            {getRoleEmoji(p.role)} {getRoleName(p.role)}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </View>

        {/* ================= MODAL XEM LẠI VAI TRÒ ================= */}
        <Modal visible={showRoleBrief} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.roleDetailModal, { borderColor: getRoleColor(myRole) }]}>
              <Text style={styles.modalEmoji}>{getRoleEmoji(myRole)}</Text>
              <Text style={[styles.modalTitle, { color: getRoleColor(myRole) }]}>
                {getRoleName(myRole)}
              </Text>
              <Text style={styles.modalDesc}>
                {myRole === 'wolf' && 'Bạn là Ma Sói. Ban đêm, hãy cùng bầy đàn chọn và cắn chết một người. Ban ngày, hãy ẩn mình và đánh lạc hướng dân làng!'}
                {myRole === 'seer' && 'Bạn là Tiên Tri. Mỗi đêm, bạn có thể soi danh tính thật sự của 1 người chơi. Hãy dùng thông tin này dẫn dắt dân làng!'}
                {myRole === 'villager' && 'Bạn là Dân Làng. Ban đêm hãy ngủ ngoan. Ban ngày, dùng lập luận và trực giác để tìm ra Sói và vote treo cổ chúng!'}
              </Text>
              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: getRoleColor(myRole) }]}
                onPress={() => setShowRoleBrief(false)}
              >
                <Text style={styles.closeModalText}>Đã hiểu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Animated.View>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerNight: {
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(15, 10, 46, 0.85)',
  },
  headerDay: {
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  myRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  myRoleEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  myRoleText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  deadLabel: {
    fontSize: 11,
    color: COLORS.danger,
    fontStyle: 'italic',
  },
  phaseInfo: {
    alignItems: 'center',
  },
  phaseTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  timerBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 2,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  leaveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.grayMedium,
  },
  leaveText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.black,
  },
  textNight: {
    color: COLORS.white,
  },
  textDay: {
    color: COLORS.black,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.grayDark,
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
  },
  actionsScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  actionCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  actionHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  actionSubtitle: {
    fontSize: 13,
    color: COLORS.grayMedium,
    marginTop: 4,
    textAlign: 'center',
  },
  targetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  targetBtn: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 90,
  },
  targetBtnSelected: {
    borderColor: COLORS.wolf,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
  },
  targetBtnSelectedSeer: {
    borderColor: COLORS.seer,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  targetBtnDisabled: {
    opacity: 0.4,
  },
  wolfVoterBadge: {
    backgroundColor: COLORS.wolf,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  wolfVoterText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  teammateTag: {
    fontSize: 10,
    color: COLORS.wolf,
    marginTop: 4,
    fontWeight: '600',
  },
  seerResultCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 3,
    marginVertical: 12,
  },
  seerResultEmoji: {
    fontSize: 50,
  },
  seerResultName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 8,
  },
  seerResultDesc: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  sleepingCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  sleepingMoon: {
    fontSize: 60,
  },
  sleepingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 12,
    textAlign: 'center',
  },
  sleepingSubtitle: {
    fontSize: 13,
    color: COLORS.grayMedium,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  announceContainer: {
    alignItems: 'center',
    padding: 20,
  },
  announceSun: {
    fontSize: 64,
  },
  announceHeader: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.secondaryDark,
    letterSpacing: 2,
    marginTop: 8,
  },
  deadCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  deadSkull: {
    fontSize: 44,
  },
  deadPlayerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.danger,
    marginTop: 6,
  },
  deadNotice: {
    fontSize: 14,
    color: COLORS.grayDark,
    marginTop: 4,
  },
  deadRoleBadge: {
    marginTop: 12,
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  deadRoleText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  peacefulCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  peacefulEmoji: {
    fontSize: 44,
  },
  peacefulTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: 6,
  },
  peacefulSubtitle: {
    fontSize: 13,
    color: COLORS.grayDark,
    textAlign: 'center',
    marginTop: 4,
  },
  discussionSection: {
    padding: 8,
  },
  discussionBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondaryLight,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  discussionEmoji: {
    fontSize: 32,
  },
  discussionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.secondaryDark,
  },
  discussionSubtitle: {
    fontSize: 12,
    color: COLORS.black,
    marginTop: 2,
  },
  playerCircleWrap: {
    marginTop: 8,
  },
  circleHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.grayDark,
    marginBottom: 12,
  },
  circleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  circleItem: {
    alignItems: 'center',
  },
  eliminationNotice: {
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: COLORS.danger,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  elimNoticeTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.danger,
  },
  elimNoticeText: {
    fontSize: 13,
    color: COLORS.black,
    marginTop: 4,
  },
  elimNoticeRole: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.danger,
    marginTop: 4,
  },
  gameOverCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  victoryTrophy: {
    fontSize: 70,
  },
  victoryTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 8,
  },
  victoryMessage: {
    fontSize: 14,
    color: COLORS.grayDark,
    textAlign: 'center',
    marginTop: 6,
  },
  revealHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 20,
    marginBottom: 12,
  },
  revealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
  },
  revealItem: {
    width: '45%',
    backgroundColor: COLORS.grayLight,
    padding: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  revealAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealAvatarText: {
    fontSize: 20,
  },
  revealName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 4,
  },
  roleTag: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  revealDead: {
    fontSize: 10,
    color: COLORS.danger,
    marginTop: 2,
  },
  returnLobbyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 24,
  },
  returnLobbyText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  chatWrapper: {
    flex: 1,
  },
  playersListScroll: {
    padding: 16,
  },
  listHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 12,
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  playerCardItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  deadCardItem: {
    opacity: 0.6,
  },
  youBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 2,
  },
  revealedRole: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  roleDetailModal: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 3,
  },
  modalEmoji: {
    fontSize: 54,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: COLORS.grayDark,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
  },
  closeModalBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 14,
  },
  closeModalText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
