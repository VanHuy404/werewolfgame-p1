// ============================================
// 🐺 MA SÓI - LobbyScreen
// Phòng chờ: Dark Starry Theme, Mã phòng nhỏ gọn, Hiển thị Avatar custom
// ============================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Platform, Animated,
} from 'react-native';
import { COLORS } from '../utils/colors';
import PlayerAvatar from '../components/PlayerAvatar';
import RoomSettings from '../components/RoomSettings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tạo danh sách các ngôi sao ngẫu nhiên cho background
function generateStars(count = 55) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() < 0.2 ? 3 : Math.random() < 0.6 ? 2 : 1.5,
      opacity: Math.random() * 0.7 + 0.3,
      glow: Math.random() > 0.7,
    });
  }
  return stars;
}

export default function LobbyScreen({
  socket,
  roomCode,
  players = [],
  settings = {},
  hostId,
  myId,
  error,
  onLeave,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const isHost = myId === hostId;
  const numWolves = settings.numWolves !== undefined ? settings.numWolves : 2;
  const numSeers = settings.numSeers !== undefined ? settings.numSeers : 1;
  const numVillagers = Math.max(0, players.length - numWolves - numSeers);

  // Điều kiện bắt đầu game: Có tối thiểu 4 người chơi
  const canStart = players.length >= 4;

  // Stars for background
  const stars = useMemo(() => generateStars(55), []);
  const starTwinkle = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(starTwinkle, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(starTwinkle, { toValue: 0.35, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleUpdateSettings = (newSettings) => {
    socket.emit('update-settings', { settings: newSettings });
    setShowSettings(false);
  };

  const handleStartGame = () => {
    if (!canStart) return;
    if (socket) {
      if (!socket.connected) socket.connect();
      socket.emit('start-game');
    }
  };

  const handleCopyCode = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <View style={styles.container}>
      {/* ================= BẦU TRỜI ĐẦY SAO (STARRY NIGHT BACKGROUND) ================= */}
      <View style={styles.starField} pointerEvents="none">
        {stars.map((star) => (
          <Animated.View
            key={star.id}
            style={[
              styles.star,
              {
                top: star.top,
                left: star.left,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
                opacity: star.glow ? starTwinkle : star.opacity,
                backgroundColor: star.glow ? '#E2E8F0' : '#A78BFA',
                boxShadow: star.glow ? '0 0 4px #A78BFA' : 'none',
              },
            ]}
          />
        ))}

        {/* Glow ambient phía sau */}
        <View style={styles.ambientGlow1} />
        <View style={styles.ambientGlow2} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.leaveBtn} onPress={onLeave} activeOpacity={0.8}>
            <Text style={styles.leaveBtnText}>← Rời phòng</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🐺 Phòng Chờ</Text>
          <TouchableOpacity
            nativeID="lobby-settings-gear"
            style={styles.gearBtn}
            onPress={() => setShowSettings(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.gearIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* ================= MÃ PHÒNG NHỎ GỌN ================= */}
        <View style={styles.compactCodeBar}>
          <View style={styles.compactCodeInfo}>
            <Text style={styles.compactCodeLabel}>MÃ PHÒNG:</Text>
            <Text style={styles.compactCodeValue}>{roomCode}</Text>
          </View>
          <TouchableOpacity
            style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
            onPress={handleCopyCode}
            activeOpacity={0.7}
          >
            <Text style={styles.copyBtnText}>
              {copied ? '✅ Đã sao chép!' : '📋 Sao chép mã'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= DANH SÁCH NGƯỜI CHƠI ================= */}
        <View style={styles.playersCard}>
          <View style={styles.playersHeader}>
            <Text style={styles.playersTitle}>
              👥 Thành viên ({players.length} người)
            </Text>
            <Text style={styles.minPlayersHint}>Tối thiểu 4 người để bắt đầu</Text>
          </View>

          <View style={styles.playerGrid}>
            {players.map((player) => (
              <View key={player.id} style={styles.playerSlot}>
                <PlayerAvatar
                  player={player}
                  size="large"
                  showRole={false}
                  textColor="#F8FAFC"
                />
                {player.id === hostId && (
                  <View style={styles.hostBadge}>
                    <Text style={styles.hostBadgeText}>👑 Chủ phòng</Text>
                  </View>
                )}
                {player.id === myId && player.id !== hostId && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>Bạn</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Hiển thị lỗi nếu có */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* ================= NÚT HÀNH ĐỘNG (START / WAITING) ================= */}
        {isHost ? (
          <TouchableOpacity
            style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
            onPress={handleStartGame}
            disabled={!canStart}
            activeOpacity={0.8}
          >
            <Text style={styles.startBtnEmoji}>🎮</Text>
            <Text style={styles.startBtnText}>
              {canStart
                ? `Bắt đầu Game ngay! (${players.length} người)`
                : `Chờ thêm người (${players.length}/4 người tối thiểu)`}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.waitingBox}>
            <Text style={styles.waitingEmoji}>⏳</Text>
            <Text style={styles.waitingText}>
              {canStart
                ? `Đã đủ ${players.length} người! Chờ chủ phòng bắt đầu trận đấu...`
                : `Đang chờ người chơi khác vào phòng (${players.length}/4 người tối thiểu)...`}
            </Text>
          </View>
        )}

        {/* ================= FOOTER ================= */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerMainText}>
            HAVING FUN KILLING EACH OTHERS!!!
          </Text>
          <Text style={styles.footerCreditText}>
            cre-William/Nerd/404
          </Text>
        </View>
      </ScrollView>

      {/* Modal chỉnh sửa settings */}
      <RoomSettings
        visible={showSettings}
        settings={settings}
        onConfirm={handleUpdateSettings}
        onClose={() => setShowSettings(false)}
        isCreating={false}
        readOnly={!isHost}
        currentPlayerCount={players.length}
      />
    </View>
  );
}

/** Badge hiển thị setting nhỏ */
function SettingBadge({ emoji, label, value, color }) {
  return (
    <View style={styles.settingBadge}>
      <Text style={styles.settingBadgeEmoji}>{emoji}</Text>
      <Text style={[styles.settingBadgeValue, { color }]}>{value}</Text>
      <Text style={styles.settingBadgeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gearBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
  },
  gearIcon: {
    fontSize: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#0A0819', // Nền đen không gian huyền bí đồng bộ với HomeScreen
    position: 'relative',
  },
  starField: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
  },
  ambientGlow1: {
    position: 'absolute',
    top: '10%',
    left: '15%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    filter: Platform.OS === 'web' ? 'blur(60px)' : undefined,
  },
  ambientGlow2: {
    position: 'absolute',
    bottom: '25%',
    right: '10%',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    filter: Platform.OS === 'web' ? 'blur(60px)' : undefined,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },
  leaveBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  leaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F87171',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1,
    textShadowColor: 'rgba(124, 58, 237, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },

  // Mã phòng nhỏ gọn (Compact Room Code Bar)
  compactCodeBar: {
    backgroundColor: 'rgba(21, 18, 43, 0.92)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  compactCodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactCodeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  compactCodeValue: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: 3,
  },
  copyBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  copyBtnSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
  },

  // Settings card (Glassmorphism Dark)
  settingsCard: {
    backgroundColor: 'rgba(21, 18, 43, 0.92)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingsIcon: {
    fontSize: 16,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C4B5FD',
  },
  settingsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  settingBadge: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    flex: 1,
  },
  settingBadgeEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  settingBadgeValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  settingBadgeLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  // Players Section
  playersCard: {
    backgroundColor: 'rgba(21, 18, 43, 0.92)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  playersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  playersTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  minPlayersHint: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  playerSlot: {
    alignItems: 'center',
    width: (SCREEN_WIDTH > 520 ? 520 : SCREEN_WIDTH - 64) / 4 - 8,
    marginBottom: 8,
  },
  hostBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  hostBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBBF24',
  },
  youBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 8,
    marginTop: 2,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C4B5FD',
  },
  emptySlot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  emptySlotText: {
    fontSize: 22,
    opacity: 0.5,
  },
  emptySlotLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Start button
  startBtn: {
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  startBtnDisabled: {
    backgroundColor: '#1E1B3A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 0,
    shadowOpacity: 0,
  },
  startBtnEmoji: {
    fontSize: 20,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Waiting box for non-hosts
  waitingBox: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  waitingEmoji: {
    fontSize: 20,
  },
  waitingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C4B5FD',
  },

  // Footer
  footerContainer: {
    marginTop: 24,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  footerMainText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F87171',
    letterSpacing: 1.5,
    textAlign: 'center',
    textShadowColor: 'rgba(239, 68, 68, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  footerCreditText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 5,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
