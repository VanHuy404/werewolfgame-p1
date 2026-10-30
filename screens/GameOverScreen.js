// ============================================
// 🐺 MA SÓI - GameOverScreen (Dedicated Page)
// Trang kết thúc game riêng biệt, không thao tác vào game
// ============================================

import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, ImageBackground, Animated, Dimensions, Platform,
  useWindowDimensions, Image,
} from 'react-native';
import { COLORS, getRoleColor, getRoleName, getRoleEmoji } from '../utils/colors';

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
  onReturnToLobby,
  onLeaveGame,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const isVillagerWin = winner !== 'wolves';
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

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
                isVillagerWin ? styles.bannerVillagers : styles.bannerWolves,
                { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
              ]}
            >
              <Text style={styles.victoryTrophy}>{isVillagerWin ? '🏆' : '🐺'}</Text>
              <Text style={[styles.victoryTitle, { color: isVillagerWin ? '#34D399' : '#F87171' }]}>
                {isVillagerWin ? 'PHE DÂN LÀNG CHIẾN THẮNG!' : 'PHE MA SÓI CHIẾN THẮNG!'}
              </Text>
              <Text style={styles.victoryReason}>
                {winMessage || (isVillagerWin ? 'Toàn bộ Ma Sói trong làng đã bị tiêu diệt!' : 'Ma Sói đã áp đảo số lượng dân làng!')}
              </Text>
            </Animated.View>

            {/* Card Danh tính thật của người chơi */}
            <View style={styles.revealCard}>
              <View style={styles.revealHeader}>
                <Text style={styles.revealHeaderEmoji}>📜</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.revealHeaderTitle} numberOfLines={1}>DANH TÍNH THẬT SỰ CỦA NGƯỜI CHƠI</Text>
                  <Text style={styles.revealHeaderSub} numberOfLines={1}>Trượt ngang ➡️ để xem toàn bộ bí mật vai trò</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.horizontalRevealScroll}
              >
                {players.map((p) => {
                  const isAlive = p.alive !== false;
                  const roleColor = getRoleColor(p.role);
                  const isMe = p.id === myId;

                  return (
                    <View
                      key={p.id}
                      style={[
                        styles.playerRevealTile,
                        isMe && styles.playerRevealTileMe,
                        !isAlive && styles.playerRevealTileDead,
                      ]}
                    >
                      {/* Avatar */}
                      <View style={styles.avatarWrapper}>
                        <View style={[styles.avatarCircle, { backgroundColor: p.avatarColor || '#4C1D95', overflow: 'hidden' }]}>
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
  playerRevealTileDead: {
    opacity: 0.75,
    backgroundColor: 'rgba(15, 12, 30, 0.8)',
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
