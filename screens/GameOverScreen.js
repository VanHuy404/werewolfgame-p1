// ============================================
// 🐺 MA SÓI - GameOverScreen (Dedicated Page)
// Trang kết thúc game riêng biệt, không thao tác vào game
// ============================================

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, ImageBackground, Animated, Dimensions, Platform,
  useWindowDimensions, Image,
} from 'react-native';
import { COLORS, getRoleColor, getRoleName, getRoleEmoji } from '../utils/colors';
import PiedPiperVictoryModal from '../components/PiedPiperVictoryModal';
import CupidVictoryModal from '../components/CupidVictoryModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * @param {Object} props
 * @param {Object} props.socket
 * @param {string} props.roomCode
 * @param {Array} props.players
 * @param {string} props.winner - 'village' | 'wolves' (khớp với server/gameLogic.js)
 * @param {string} props.winMessage
 * @param {string} props.myRole
 * @param {string} props.myId
 * @param {string} props.hostId
 * @param {Function} props.onReturnToLobby
 * @param {Function} props.onLeaveGame
 */
export default function GameOverScreen({
  socket,
  roomCode,
  players = [],
  winner = 'village',
  winMessage = '',
  myRole,
  myId,
  hostId,
  couple = [],
  matchHistory = [],
  onReturnToLobby,
  onLeaveGame,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const isCoupleWin = winner === 'couple';
  const isPiedPiperWin = winner === 'pied_piper';
  const isVillagerWin = winner === 'village';
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const piedPiperPlayer = players.find((p) => p.role === 'pied_piper') || {
    name: 'Người Thổi Sáo',
    avatar: '🎶',
    avatarColor: '#A855F7',
  };
  const [showVictoryCinematic, setShowVictoryCinematic] = useState(isPiedPiperWin);
  const [showCupidVictoryCinematic, setShowCupidVictoryCinematic] = useState(isCoupleWin);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const isMobile = windowWidth <= 860;

  const couplePlayers = (couple && couple.length === 2)
    ? couple
    : players.filter((p) => p.inCouple);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleReturn = () => {
    if (onReturnToLobby) {
      onReturnToLobby();
    } else if (socket) {
      socket.emit('return-to-lobby');
    }
  };

  return (
    <ImageBackground
      source={require('../assets/village_bg.jpg')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      {/* Hoạt ảnh chiến thắng điện ảnh riêng cho Cặp Đôi (Cupid Victory) */}
      {isCoupleWin && (
        <CupidVictoryModal
          visible={showCupidVictoryCinematic}
          couple={couplePlayers}
          duration={7}
          onComplete={() => setShowCupidVictoryCinematic(false)}
        />
      )}

      {/* Hoạt ảnh chiến thắng điện ảnh 5s riêng cho Người Thổi Sáo */}
      {isPiedPiperWin && (
        <PiedPiperVictoryModal
          visible={showVictoryCinematic}
          winnerPlayer={piedPiperPlayer}
          duration={5}
          onComplete={() => setShowVictoryCinematic(false)}
        />
      )}

      <View style={styles.darkOverlay}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header phòng & mã phòng */}
            <View style={styles.topInfoBar}>
              <View style={styles.codeBadge}>
                <Text style={styles.codeLabel}>PHÒNG: </Text>
                <Text style={styles.codeText}>{roomCode}</Text>
              </View>
              <View style={styles.matchEndBadge}>
                <Text style={styles.matchEndText}>🏁 Trận đấu kết thúc</Text>
              </View>
            </View>

            {/* Victory Card Banner */}
            <Animated.View
              style={[
                styles.victoryBanner,
                isCoupleWin
                  ? { borderColor: '#EC4899', backgroundColor: 'rgba(157, 23, 77, 0.45)' }
                  : (isPiedPiperWin ? styles.bannerPiedPiper : (isVillagerWin ? styles.bannerVillagers : styles.bannerWolves)),
                { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
              ]}
            >
              <Text style={styles.victoryTrophy}>{isCoupleWin ? '💘' : (isPiedPiperWin ? '🎶✨' : (isVillagerWin ? '🏆' : '🐺'))}</Text>
              <Text style={[styles.victoryTitle, { color: isCoupleWin ? '#F472B6' : (isPiedPiperWin ? '#C084FC' : (isVillagerWin ? '#34D399' : '#F87171')) }]}>
                {isCoupleWin
                  ? 'PHE CẶP ĐÔI (UYÊN ƯƠNG) CHIẾN THẮNG!'
                  : (isPiedPiperWin
                  ? 'PHE THỨ 3 (NGƯỜI THỔI SÁO) CHIẾN THẮNG!'
                  : (isVillagerWin ? 'PHE DÂN LÀNG CHIẾN THẮNG!' : 'PHE MA SÓI CHIẾN THẮNG!'))}
              </Text>
              <Text style={styles.victoryReason}>
                {winMessage || (isCoupleWin ? 'Tình yêu chân chính đã vượt qua mọi hiểm nguy để giành chiến thắng!' : (isPiedPiperWin ? 'Phe Thứ 3 toàn thắng! Toàn bộ người chơi còn sống đã bị mê hoặc bởi tiếng sáo!' : (isVillagerWin ? 'Toàn bộ Ma Sói trong làng đã bị tiêu diệt!' : 'Ma Sói đã áp đảo số lượng dân làng!')))}
              </Text>
            </Animated.View>

            {/* Nút xem lại hoạt ảnh chiến thắng Cặp Đôi */}
            {isCoupleWin && (
              <TouchableOpacity
                style={[styles.replayCinematicBtn, { borderColor: '#F472B6', backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}
                onPress={() => setShowCupidVictoryCinematic(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.replayCinematicBtnText, { color: '#F472B6' }]}>💘 Xem Lại Hoạt Ảnh Chiến Thắng Cupid (7s)</Text>
              </TouchableOpacity>
            )}

            {/* Nút xem lại hoạt ảnh chiến thắng Người Thổi Sáo */}
            {isPiedPiperWin && (
              <TouchableOpacity
                style={styles.replayCinematicBtn}
                onPress={() => setShowVictoryCinematic(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.replayCinematicBtnText}>🎶 Xem Lại Hoạt Ảnh Chiến Thắng (5s)</Text>
              </TouchableOpacity>
            )}

            {/* Card Danh tính thật của người chơi */}
            <View style={styles.revealCard}>
              <View style={styles.revealHeader}>
                <Text style={styles.revealHeaderEmoji}>📜</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.revealHeaderTitle} numberOfLines={1}>DANH TÍNH THẬT SỰ CỦA NGƯỜI CHƠI</Text>
                  <Text style={styles.revealHeaderSub} numberOfLines={1}>Trượt ngang ➡️ để xem toàn bộ bí mật vai trò, Cặp Đôi & Bùa Mê</Text>
                </View>
              </View>

              {/* Tóm tắt Cặp Đôi Uyên Ương nếu ván đấu có ghép đôi */}
              {couplePlayers && couplePlayers.length === 2 && (
                <View style={styles.coupleSummaryBanner}>
                  <Text style={styles.coupleSummaryEmoji}>💘</Text>
                  <Text style={styles.coupleSummaryText} numberOfLines={2}>
                    <Text style={{ fontWeight: '900', color: '#F472B6' }}>Cặp Đôi Uyên Ương: </Text>
                    {couplePlayers[0].name} ({getRoleEmoji(couplePlayers[0].role)} {getRoleName(couplePlayers[0].role)}) ❤️ {couplePlayers[1].name} ({getRoleEmoji(couplePlayers[1].role)} {getRoleName(couplePlayers[1].role)})
                  </Text>
                </View>
              )}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.horizontalRevealScroll}
              >
                {players.map((p) => {
                  const isAlive = p.alive !== false;
                  const roleColor = getRoleColor(p.role);
                  const isMe = p.id === myId;
                  const isPlayerInCouple = Boolean(
                    p.inCouple || (couplePlayers && couplePlayers.some((cp) => cp.id === p.id))
                  );
                  const otherLover = isPlayerInCouple
                    ? (p.partnerName || couplePlayers.find((cp) => cp.id !== p.id)?.name || null)
                    : null;
                  const isPlayerCharmed = Boolean(p.charmed);

                  return (
                    <View
                      key={p.id}
                      style={[
                        styles.playerRevealTile,
                        isMe && styles.playerRevealTileMe,
                        isPlayerInCouple && styles.playerRevealTileCouple,
                        !isAlive && styles.playerRevealTileDead,
                      ]}
                    >
                      {/* Avatar */}
                      <View style={styles.avatarWrapper}>
                        <View style={[
                          styles.avatarCircle,
                          { backgroundColor: p.avatarColor || '#4C1D95', overflow: 'hidden' },
                          isPlayerInCouple && { borderColor: '#EC4899', borderWidth: 2.5 },
                        ]}>
                          {typeof p.avatar === 'string' && (p.avatar.startsWith('data:') || p.avatar.startsWith('http') || p.avatar.startsWith('blob:') || p.avatar.length > 25) ? (
                            <Image
                              source={{ uri: p.avatar }}
                              style={{ width: 56, height: 56, borderRadius: 28 }}
                              resizeMode="cover"
                            />
                          ) : (
                            <Text style={styles.avatarEmoji}>{p.avatar || '👤'}</Text>
                          )}
                        </View>
                        {isMe && (
                          <View style={styles.meBadge}>
                            <Text style={styles.meBadgeText}>Bạn</Text>
                          </View>
                        )}
                        {isPlayerInCouple && (
                          <View style={styles.coupleAvatarFloatingHeart}>
                            <Text style={{ fontSize: 11 }}>💘</Text>
                          </View>
                        )}
                      </View>

                      {/* Tên */}
                      <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">{p.name}</Text>

                      {/* Trạng thái sống/chết */}
                      <Text style={[styles.statusText, isAlive ? styles.statusAlive : styles.statusDead]} numberOfLines={1}>
                        {isAlive ? '✨ Sống sót' : '💀 Đã hy sinh'}
                      </Text>

                      {/* Badge Vai Trò Thật */}
                      <View style={[styles.roleTag, { backgroundColor: roleColor + '20', borderColor: roleColor }]}>
                        <Text style={[styles.roleTagText, { color: roleColor }]} numberOfLines={1} ellipsizeMode="tail">
                          {getRoleEmoji(p.role)} {getRoleName(p.role)}
                        </Text>
                      </View>

                      {/* Huy hiệu Cặp Đôi Uyên Ương */}
                      {isPlayerInCouple && (
                        <View style={styles.loverRevealTag}>
                          <Text style={styles.loverRevealTagText} numberOfLines={1} ellipsizeMode="tail">
                            💘 Cặp đôi
                          </Text>
                        </View>
                      )}

                      {/* Huy hiệu Bị Thôi Miên */}
                      {isPlayerCharmed && (
                        <View style={styles.charmedRevealTag}>
                          <Text style={styles.charmedRevealTagText} numberOfLines={1}>
                            🎶 Bị Thôi Miên
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Nút hành động */}
            <View style={[styles.actionButtonsRow, windowWidth < 420 && styles.actionButtonsRowMobile]}>
              <TouchableOpacity
                style={[styles.returnLobbyBtn, windowWidth < 420 && { width: '100%', flex: 0 }]}
                onPress={handleReturn}
                activeOpacity={0.8}
              >
                <Text style={styles.returnLobbyEmoji}>🔄</Text>
                <Text style={styles.returnLobbyText}>Trở về phòng chờ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.leaveGameBtn, windowWidth < 420 && { width: '100%', flex: 0 }]}
                onPress={onLeaveGame}
                activeOpacity={0.8}
              >
                <Text style={styles.leaveGameEmoji}>🚪</Text>
                <Text style={styles.leaveGameText}>Rời trận</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* NÚT NỔI BÊN PHẢI MỞ LỊCH SỬ VÁN ĐẤU (KIỂU BUTTON LOG BÊN PHẢI NHƯ CHAT) */}
          {!isLogOpen && Array.isArray(matchHistory) && matchHistory.length > 0 && (
            <TouchableOpacity
              style={styles.floatingLogSlideToggle}
              onPress={() => setIsLogOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.floatingLogIcon}>📜</Text>
              <Text style={styles.floatingLogLabel}>Log</Text>
              <View style={styles.logFabBadge}>
                <Text style={styles.logFabBadgeText}>
                  {matchHistory.length > 99 ? '99+' : matchHistory.length}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* SLIDEBAR DRAWER LỊCH SỬ VÁN ĐẤU BÊN PHẢI (CÓ SCROLL RIÊNG TRÁNH DÀI TRANG) */}
          {isLogOpen && (
            <View style={styles.logDrawerOverlay}>
              <TouchableOpacity
                style={styles.logDrawerBackdrop}
                activeOpacity={1}
                onPress={() => setIsLogOpen(false)}
              />
              <View
                style={[
                  styles.logDrawerContent,
                  { width: isMobile ? Math.min(windowWidth * 0.88, 360) : 390 },
                ]}
              >
                {/* Header Slidebar Log */}
                <View style={styles.logDrawerHeader}>
                  <View style={styles.logDrawerHeaderLeft}>
                    <Text style={styles.logDrawerHeaderIcon}>⏳</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logDrawerHeaderTitle} numberOfLines={1}>
                        LỊCH SỬ VÁN ĐẤU
                      </Text>
                      <Text style={styles.logDrawerHeaderSub} numberOfLines={1}>
                        {matchHistory.length} sự kiện Đêm & Ngày
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.logDrawerCloseBtn}
                    onPress={() => setIsLogOpen(false)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.logDrawerCloseIcon}>✕</Text>
                    <Text style={styles.logDrawerCloseText}>Đóng</Text>
                  </TouchableOpacity>
                </View>

                {/* Danh sách diễn biến có Scroll riêng */}
                <ScrollView
                  style={styles.logDrawerScroll}
                  contentContainerStyle={styles.logDrawerScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  {matchHistory.map((item, idx) => {
                    const isNightEvent = item.phaseType === 'night';
                    const isDayEvent = item.phaseType === 'day';
                    return (
                      <View
                        key={`log-${idx}`}
                        style={[
                          styles.timelineItem,
                          isNightEvent && styles.timelineItemNight,
                          isDayEvent && styles.timelineItemDay,
                        ]}
                      >
                        <View style={styles.timelineIconCircle}>
                          <Text style={styles.timelineIconText}>{item.icon || '📜'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          {Boolean(item.title) && (
                            <Text
                              style={[
                                styles.timelineItemTitle,
                                isNightEvent ? { color: '#C4B5FD' } : isDayEvent ? { color: '#FCD34D' } : { color: '#94A3B8' },
                              ]}
                            >
                              {item.title}
                            </Text>
                          )}
                          <Text style={styles.timelineItemText}>{item.text}</Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  darkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 5, 18, 0.90)',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  topInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  codeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FCD34D',
    letterSpacing: 2,
  },
  matchEndBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  matchEndText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  victoryBanner: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  bannerVillagers: {
    backgroundColor: 'rgba(6, 78, 59, 0.88)',
    borderColor: '#10B981',
    shadowColor: '#10B981',
  },
  bannerWolves: {
    backgroundColor: 'rgba(127, 29, 29, 0.88)',
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  bannerPiedPiper: {
    backgroundColor: 'rgba(88, 28, 135, 0.9)',
    borderColor: '#C084FC',
    shadowColor: '#C084FC',
  },
  victoryTrophy: {
    fontSize: 64,
    marginBottom: 12,
  },
  victoryTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  victoryReason: {
    fontSize: 15,
    color: '#F1F5F9',
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 550,
    lineHeight: 22,
  },
  replayCinematicBtn: {
    backgroundColor: 'rgba(147, 51, 234, 0.35)',
    borderWidth: 1.5,
    borderColor: '#C084FC',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)' } : {}),
  },
  replayCinematicBtnText: {
    color: '#F5D0FE',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  revealCard: {
    backgroundColor: 'rgba(21, 18, 43, 0.92)',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    marginBottom: 24,
  },
  revealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  revealHeaderEmoji: {
    fontSize: 28,
  },
  revealHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1,
  },
  revealHeaderSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
  revealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  horizontalRevealScroll: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: 'stretch',
  },
  playerRevealTile: {
    backgroundColor: 'rgba(30, 27, 75, 0.75)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    width: 136,
    minWidth: 136,
    maxWidth: 136,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerRevealTileMe: {
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
  },
  playerRevealTileCouple: {
    borderColor: '#EC4899',
    backgroundColor: 'rgba(131, 24, 67, 0.28)',
  },
  playerRevealTileDead: {
    opacity: 0.75,
    backgroundColor: 'rgba(15, 12, 30, 0.8)',
  },
  coupleSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 72, 153, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.45)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  coupleSummaryEmoji: {
    fontSize: 18,
  },
  coupleSummaryText: {
    flex: 1,
    fontSize: 12.5,
    color: '#FCE7F3',
    fontWeight: '700',
  },
  coupleAvatarFloatingHeart: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(131, 24, 67, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#F472B6',
  },
  loverRevealTag: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(236, 72, 153, 0.22)',
    borderWidth: 1,
    borderColor: '#F472B6',
    alignItems: 'center',
    width: '100%',
  },
  loverRevealTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#F9A8D4',
  },
  charmedRevealTag: {
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
    borderWidth: 1,
    borderColor: '#C084FC',
    alignItems: 'center',
    width: '100%',
  },
  charmedRevealTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#E9D5FF',
  },
  floatingLogSlideToggle: {
    position: 'absolute',
    right: 0,
    top: '48%',
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderWidth: 1.5,
    borderRightWidth: 0,
    borderColor: '#38BDF8',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
    shadowColor: '#38BDF8',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingLogIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  floatingLogLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.4,
  },
  logFabBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0284C7',
    borderWidth: 1.5,
    borderColor: '#7DD3FC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  logFabBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  logDrawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  logDrawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
  },
  logDrawerContent: {
    height: '100%',
    backgroundColor: 'rgba(15, 12, 34, 0.98)',
    borderLeftWidth: 1.5,
    borderLeftColor: 'rgba(56, 189, 248, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  logDrawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(30, 27, 75, 0.55)',
  },
  logDrawerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logDrawerHeaderIcon: {
    fontSize: 22,
  },
  logDrawerHeaderTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.8,
  },
  logDrawerHeaderSub: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 1,
  },
  logDrawerCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logDrawerCloseIcon: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FCA5A5',
  },
  logDrawerCloseText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  logDrawerScroll: {
    flex: 1,
  },
  logDrawerScrollContent: {
    padding: 14,
    paddingBottom: 32,
    gap: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(30, 41, 59, 0.65)',
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 3.5,
    borderLeftColor: '#64748B',
    gap: 10,
  },
  timelineItemNight: {
    backgroundColor: 'rgba(30, 27, 75, 0.68)',
    borderLeftColor: '#8B5CF6',
  },
  timelineItemDay: {
    backgroundColor: 'rgba(69, 26, 3, 0.42)',
    borderLeftColor: '#F59E0B',
  },
  timelineIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconText: {
    fontSize: 16,
  },
  timelineItemTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  timelineItemText: {
    fontSize: 12.5,
    color: '#E2E8F0',
    fontWeight: '600',
    lineHeight: 18,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarEmoji: {
    fontSize: 30,
  },
  meBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  meBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusAlive: {
    color: '#34D399',
  },
  statusDead: {
    color: '#EF4444',
  },
  roleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    width: '100%',
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonsRowMobile: {
    flexDirection: 'column',
    width: '100%',
    gap: 10,
  },
  returnLobbyBtn: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    gap: 8,
  },
  returnLobbyEmoji: {
    fontSize: 20,
  },
  returnLobbyText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  leaveGameBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 6,
  },
  leaveGameEmoji: {
    fontSize: 18,
  },
  leaveGameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F87171',
  },
});
