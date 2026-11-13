// ============================================
// 💘 MA SÓI - CupidVictoryModal Component
// Hoạt ảnh chiến thắng điện ảnh dành riêng cho Cặp Đôi (Uyên Ương)
// - Hình nền: Cupid Victory (assets/cupid_victory.png)
// - 2 avatar của 2 người chơi ở 2 bên Cupid
// - Hiệu ứng viền màu hồng phát sáng rực rỡ (Pink glow pulse)
// - Hoạt ảnh các trái tim lơ lửng xung quanh
// - Không thêm chữ thừa theo đúng yêu cầu người dùng
// ============================================

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
  ImageBackground,
  Platform,
} from 'react-native';
import PlayerAvatar from './PlayerAvatar';
import { playHeartbeatSynth } from './CoupleRevealModal';

const victoryBg = require('../assets/cupid_victory.png');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 22 hạt trái tim lơ lửng xung quanh 2 avatar
const FLOATING_HEARTS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  emoji: ['💖', '💕', '💘', '💗', '❤️', '✨', '💓'][i % 7],
  left: 6 + (i * 4.3) % 88,
  startBottom: 15 + (i * 7) % 65,
  size: 18 + (i % 4) * 6,
  duration: 2200 + (i % 5) * 400,
  delay: (i * 180) % 1500,
}));

export default function CupidVictoryModal({
  visible = false,
  couple = [],
  duration = 7,
  onComplete = () => {},
}) {
  const [timeLeft, setTimeLeft] = useState(duration);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const avatarScaleAnim = useRef(new Animated.Value(0.6)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const player1 = couple && couple[0]
    ? { ...couple[0], alive: true }
    : { name: 'Người Yêu 1', avatar: '🐱', avatarColor: '#F472B6', alive: true };
  const player2 = couple && couple[1]
    ? { ...couple[1], alive: true }
    : { name: 'Người Yêu 2', avatar: '🐰', avatarColor: '#FB7185', alive: true };

  useEffect(() => {
    if (!visible) {
      fadeAnim.setValue(0);
      avatarScaleAnim.setValue(0.6);
      pulseAnim.setValue(1);
      return;
    }

    setTimeLeft(duration);
    playHeartbeatSynth();

    // Mở màn hình nền và avatar
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(avatarScaleAnim, { toValue: 1, tension: 45, friction: 6, useNativeDriver: true }),
    ]).start();

    // Hiệu ứng viền hồng phát xung nhịp tim liên tục
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 350, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.96, duration: 300, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 250, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    // Hoạt ảnh trái tim lơ lửng xung quanh
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    floatLoop.start();

    // Đếm ngược tự động chuyển qua GameOverScreen
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      pulseLoop.stop();
      floatLoop.stop();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onComplete}>
      <TouchableOpacity
        style={styles.touchableWrapper}
        activeOpacity={1}
        onPress={onComplete}
      >
        <ImageBackground
          source={victoryBg}
          style={styles.bgImage}
          resizeMode="cover"
        >
          {/* Lớp phủ điện ảnh làm nổi bật avatar và viền hồng */}
          <Animated.View style={[styles.cinematicOverlay, { opacity: fadeAnim }]}>
            
            {/* Nút đóng / bỏ qua nổi góc trên */}
            <TouchableOpacity
              style={styles.floatingCloseBtn}
              onPress={onComplete}
              activeOpacity={0.8}
            >
              <Text style={styles.floatingCloseBtnText}>✕ Đóng ({timeLeft}s)</Text>
            </TouchableOpacity>

            {/* Các hạt trái tim bay lơ lửng xung quanh */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              {FLOATING_HEARTS.map((h) => {
                const translateY = floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, -110],
                });
                const opacity = floatAnim.interpolate({
                  inputRange: [0, 0.25, 0.75, 1],
                  outputRange: [0, 0.95, 0.85, 0],
                });
                return (
                  <Animated.Text
                    key={h.id}
                    style={[
                      styles.floatingHeartItem,
                      {
                        left: `${h.left}%`,
                        bottom: `${h.startBottom}%`,
                        fontSize: h.size,
                        transform: [{ translateY }],
                        opacity,
                      },
                    ]}
                  >
                    {h.emoji}
                  </Animated.Text>
                );
              })}
            </View>

            {/* VỊ TRÍ 2 AVATAR NGAY DƯỚI 2 HÌNH CUPID NHỎ CẦM GIỎ HOA */}
            <View style={styles.avatarsWrapper} pointerEvents="none">
              {/* Avatar 1 (Bên dưới Cupid nhỏ cánh trái) */}
              <Animated.View
                style={[
                  styles.avatarContainer,
                  {
                    transform: [
                      { scale: avatarScaleAnim },
                    ],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.pinkGlowHalo,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
                <View style={styles.avatarInnerFrame}>
                  <PlayerAvatar
                    player={player1}
                    compact={true}
                    size="medium"
                  />
                </View>
                <View style={styles.nameBadge}>
                  <Text style={styles.nameText} numberOfLines={1}>
                    {player1.name || 'Người Yêu 1'}
                  </Text>
                </View>
              </Animated.View>

              {/* Avatar 2 (Bên dưới Cupid nhỏ cánh phải) */}
              <Animated.View
                style={[
                  styles.avatarContainer,
                  {
                    transform: [
                      { scale: avatarScaleAnim },
                    ],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.pinkGlowHalo,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
                <View style={styles.avatarInnerFrame}>
                  <PlayerAvatar
                    player={player2}
                    compact={true}
                    size="medium"
                  />
                </View>
                <View style={styles.nameBadge}>
                  <Text style={styles.nameText} numberOfLines={1}>
                    {player2.name || 'Người Yêu 2'}
                  </Text>
                </View>
              </Animated.View>
            </View>

          </Animated.View>
        </ImageBackground>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  touchableWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bgImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 24 : 44,
    right: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1.5,
    borderColor: '#F472B6',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    zIndex: 999,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  floatingCloseBtnText: {
    color: '#FDF2F8',
    fontSize: 13,
    fontWeight: '700',
  },
  cinematicOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 10, 25, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingHeartItem: {
    position: 'absolute',
    ...(Platform.OS === 'web'
      ? { filter: 'drop-shadow(0 0 10px rgba(244, 63, 94, 0.8))' }
      : {}),
  },
  avatarsWrapper: {
    position: 'absolute',
    top: '43%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: '17%',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinkGlowHalo: {
    position: 'absolute',
    top: -6,
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: '#F472B6',
    backgroundColor: 'rgba(244, 114, 182, 0.32)',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 0 35px #F472B6, inset 0 0 20px #F472B6',
        }
      : { elevation: 12 }),
  },
  avatarInnerFrame: {
    padding: 4,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nameBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(26, 12, 38, 0.88)',
    borderWidth: 1.5,
    borderColor: '#F472B6',
    maxWidth: 130,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 14px rgba(244, 114, 182, 0.65)' }
      : { elevation: 6 }),
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(236, 72, 153, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
});

