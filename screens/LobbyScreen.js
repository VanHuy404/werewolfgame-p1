// ============================================
// 🐺 MA SÓI - LobbyScreen
// Phòng chờ: Dark Starry Theme, Mã phòng nhỏ gọn, Hiển thị Avatar custom
// ============================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Platform, Animated, Modal, useWindowDimensions,
} from 'react-native';
import { COLORS } from '../utils/colors';
import PlayerAvatar from '../components/PlayerAvatar';
import RoomSettings from '../components/RoomSettings';
import RoleGuideModal from '../components/RoleGuideModal';

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
  const { width: windowWidth } = useWindowDimensions();
  const isMobileScreen = windowWidth < 500;

  const [showSettings, setShowSettings] = useState(false);
  const [showRoleGuide, setShowRoleGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const [kickTargetPlayer, setKickTargetPlayer] = useState(null);

  const handleKickConfirm = () => {
    if (!kickTargetPlayer || !socket) return;
    socket.emit('kick-player', { targetPlayerId: kickTargetPlayer.id });
    setKickTargetPlayer(null);
  };

  const isHost = myId === hostId;
  const numWolves = settings.numWolves !== undefined ? settings.numWolves : 2;
  const numSeers = settings.numSeers !== undefined ? settings.numSeers : 1;
  const numBodyguards = settings.numBodyguards !== undefined ? settings.numBodyguards : 1;
  const numVillagers = Math.max(0, players.length - numWolves - numSeers - numBodyguards);

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
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.guideIconBtn}
              onPress={() => setShowRoleGuide(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.guideIconText}>📖</Text>
            </TouchableOpacity>
            <TouchableOpacity
              nativeID="lobby-settings-gear"
              style={styles.gearBtn}
              onPress={() => setShowSettings(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.gearIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
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
              <View
                key={player.id}
                style={[
                  styles.playerSlot,
                  isMobileScreen && { width: (windowWidth - 48) / 3 - 8, minWidth: 80 },
                ]}
              >
                <PlayerAvatar
                  player={player}
                  size={isMobileScreen ? "medium" : "large"}
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
                {/* Nút xóa người chơi (Dành cho Chủ phòng) */}
                {isHost && player.id !== hostId && (
                  <TouchableOpacity
                    style={styles.kickPlayerBtn}
                    onPress={() => setKickTargetPlayer(player)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.kickPlayerText}>✕ Đá</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Nút Xem Danh Sách Nhân Vật & Hướng Dẫn Chơi */}
        <TouchableOpacity
          style={styles.guideActionBtn}
          onPress={() => setShowRoleGuide(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.guideActionEmoji}>📖</Text>
          <View style={styles.guideActionTextCol}>
            <Text style={styles.guideActionTitle}>Xem Nhân Vật & Hướng Dẫn Chơi</Text>
            <Text style={styles.guideActionSub}>Khám phá kỹ năng Ma Sói, Tiên Tri & Dân Làng</Text>
          </View>
          <Text style={styles.guideActionArrow}>→</Text>
        </TouchableOpacity>

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
            HAVE FUN KILLING EACH OTHER!!!
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

      {/* Modal hướng dẫn vai trò */}
      <RoleGuideModal
        visible={showRoleGuide}
        onClose={() => setShowRoleGuide(false)}
      />

      {/* Modal xác nhận xóa người chơi khỏi phòng */}
      <Modal visible={!!kickTargetPlayer} transparent animationType="fade">
        <View style={styles.kickModalOverlay}>
          <View style={styles.kickModalCard}>
            <Text style={styles.kickModalEmoji}>👢</Text>
            <Text style={styles.kickModalTitle}>Xóa Người Chơi</Text>
            <Text style={styles.kickModalDesc}>
              Bạn có chắc chắn muốn xóa{' '}
              <Text style={{ fontWeight: 'bold', color: '#FCD34D' }}>
                {kickTargetPlayer?.name}
              </Text>{' '}
              khỏi phòng chờ không?
            </Text>
            <View style={styles.kickModalBtnRow}>
              <TouchableOpacity
                style={styles.kickModalCancelBtn}
                onPress={() => setKickTargetPlayer(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.kickModalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.kickModalConfirmBtn}
                onPress={handleKickConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.kickModalConfirmText}>Xóa ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
  },
  guideIconText: {
    fontSize: 18,
  },
  gearBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gearIcon: {
    fontSize: 18,
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

  // Guide Action Button
  guideActionBtn: {
    backgroundColor: 'rgba(46, 29, 84, 0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  guideActionEmoji: {
    fontSize: 24,
  },
  guideActionTextCol: {
    flex: 1,
  },
  guideActionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.3,
  },
  guideActionSub: {
    fontSize: 11.5,
    color: '#CBD5E1',
    marginTop: 2,
  },
  guideActionArrow: {
    fontSize: 16,
    fontWeight: '900',
    color: '#A78BFA',
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
  kickPlayerBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  kickPlayerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F87171',
  },
  kickModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  kickModalCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  kickModalEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  kickModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F87171',
    marginBottom: 8,
  },
  kickModalDesc: {
    fontSize: 14,
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  kickModalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  kickModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  kickModalCancelText: {
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: 14,
  },
  kickModalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  kickModalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
