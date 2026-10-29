// ============================================
// 🏹 MA SÓI - HunterShotModal Component
// Hiệu ứng điện ảnh khi Thợ Săn nổ phát súng trăn trối báo thù:
// 1. Tâm ngắm màu đỏ rực rỡ (hunter_crosshair.png) thu nhỏ khóa chặt Avatar mục tiêu
// 2. Dòng thoại màu vàng cam hổ phách chạy gõ phím typewriter: "Sẽ có những con cá phải trả gió!"
// 3. Tiếng súng nổ vang trời, màn hình rung chấn chớp sáng
// 4. Mục tiêu trúng đạn gục ngã phủ xám tử nạn
// 5. Huy hiệu: "🎯 ĐÃ BỊ THỢ SĂN BẮN HẠ"
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Image,
  Platform,
  Easing,
} from 'react-native';

const crosshairImg = require('../assets/hunter_crosshair.png');

const HUNTER_CHANT = 'Sẽ có những con cá phải trả gió!';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 24 tia lửa đạn bắn tung tóe khi súng nổ
const NUM_BULLET_SPARKS = 24;
const BULLET_SPARKS = Array.from({ length: NUM_BULLET_SPARKS }, (_, i) => {
  const angle = (i / NUM_BULLET_SPARKS) * 2 * Math.PI + ((i % 3) * 0.18 - 0.09);
  const dist = 125 + (i % 5) * 28;
  const size = (i % 4 === 0) ? 14 : (i % 2 === 0) ? 9 : 6;
  return {
    id: i,
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist,
    size,
    color: i % 4 === 0 ? '#FFFFFF' : i % 3 === 0 ? '#EF4444' : i % 2 === 0 ? '#F59E0B' : '#FCD34D',
  };
});

/**
 * Âm thanh tổng hợp bằng Web Audio API: Drone hồi hộp & Tiếng súng nổ đanh thép
 */
function playSynthSound(type) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (type === 'drone') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 1.2);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
    } else if (type === 'lockOn') {
      // Âm thanh tâm ngắm tít tít khóa mục tiêu
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'gunshot') {
      // Tiếng nổ cực mạnh: White noise burst + low boom punch
      const bufferSize = ctx.sampleRate * 0.45;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.06));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);

      // Low punch boom
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
      oscGain.gain.setValueAtTime(0.45, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (e) {
    // Audio context fallback
  }
}

export default function HunterShotModal({
  visible = false,
  victimPlayer = null,
  targetPlayer = null,
  hunterPlayer = null,
  timeLeft = 6,
  onClose = () => {},
}) {
  const target = targetPlayer || victimPlayer;

  // Stages: 'emerging' -> 'targeting' -> 'chanting' -> 'firing' -> 'fallen'
  const [stage, setStage] = useState('emerging');
  const [typedText, setTypedText] = useState('');

  // Animated values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.4)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Tâm ngắm crosshair
  const crosshairScale = useRef(new Animated.Value(2.2)).current;
  const crosshairOpacity = useRef(new Animated.Value(0)).current;
  const crosshairRotate = useRef(new Animated.Value(0)).current;

  // Vết đạn & nổ
  const sparksAnim = useRef(new Animated.Value(0)).current;
  const grayscaleAnim = useRef(new Animated.Value(0)).current;

  // Huy hiệu
  const badgeScale = useRef(new Animated.Value(0.3)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;

  const resetAnimations = () => {
    backdropAnim.setValue(0);
    avatarScale.setValue(0.4);
    shakeAnim.setValue(0);
    flashAnim.setValue(0);
    crosshairScale.setValue(2.2);
    crosshairOpacity.setValue(0);
    crosshairRotate.setValue(0);
    sparksAnim.setValue(0);
    grayscaleAnim.setValue(0);
    badgeScale.setValue(0.3);
    badgeOpacity.setValue(0);
    setTypedText('');
  };

  useEffect(() => {
    if (!visible) {
      setStage('emerging');
      setTypedText('');
      resetAnimations();
      return;
    }

    setStage('emerging');
    setTypedText('');
    resetAnimations();

    // 1. Nạn nhân xuất hiện
    playSynthSound('drone');
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
    ]).start();

    // 2. Sau 0.7s: Tâm ngắm đỏ rực rỡ thu nhỏ khóa chặt Avatar
    const timerCrosshair = setTimeout(() => {
      setStage('targeting');
      playSynthSound('lockOn');

      Animated.parallel([
        Animated.timing(crosshairOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(crosshairScale, { toValue: 1.0, friction: 4, tension: 60, useNativeDriver: true }),
        Animated.timing(crosshairRotate, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    }, 700);

    // 3. Sau 1.4s: Dòng thoại chạy typewriter gõ từng chữ một
    let typingInterval = null;
    const timerChant = setTimeout(() => {
      setStage('chanting');
      let index = 0;
      typingInterval = setInterval(() => {
        index++;
        if (index <= HUNTER_CHANT.length) {
          setTypedText(HUNTER_CHANT.slice(0, index));
        } else {
          clearInterval(typingInterval);
        }
      }, 25);
    }, 1400);

    // 4. Sau 2.8s: TIẾNG SÚNG NỔ VANG TRỜI (BANG!)
    const timerFire = setTimeout(() => {
      setStage('firing');
      playSynthSound('gunshot');

      // Chớp cam đỏ rực
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();

      // Rung chấn màn hình mạnh mẽ
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 18, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -15, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();

      // Tia lửa bung tỏa từ phát súng
      Animated.timing(sparksAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 2800);

    // 5. Sau 3.4s: Nạn nhân gục ngã phủ xám tử nạn, hiện huy hiệu
    const timerFallen = setTimeout(() => {
      setStage('fallen');

      Animated.parallel([
        Animated.timing(grayscaleAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, { toValue: 1, friction: 4, tension: 55, useNativeDriver: true }),
        Animated.timing(badgeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 3400);

    return () => {
      clearTimeout(timerCrosshair);
      clearTimeout(timerChant);
      if (typingInterval) clearInterval(typingInterval);
      clearTimeout(timerFire);
      clearTimeout(timerFallen);
    };
  }, [visible, target?.id]);

  if (!visible) return null;

  const isCustomImage =
    typeof target?.avatar === 'string' &&
    (target.avatar.startsWith('data:') ||
      target.avatar.startsWith('http') ||
      target.avatar.startsWith('blob:') ||
      target.avatar.length > 30);

  const isFallen = stage === 'fallen';

  const spin = crosshairRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropAnim }]}>
      {/* Hiệu ứng chớp lửa súng đỏ cam */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: flashAnim,
            backgroundColor: 'rgba(239, 68, 68, 0.65)',
          },
        ]}
        pointerEvents="none"
      />

      {/* Top Bar Header */}
      <View style={styles.topBar}>
        <View style={styles.titleBadge}>
          <Text style={styles.titleEmoji}>🏹💥</Text>
          <Text style={styles.titleText}>PHÁT SÚNG TRĂN TRỐI</Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>⏳ {Math.max(0, timeLeft)}s</Text>
        </View>
      </View>

      {/* Thông điệp sự kiện */}
      <View style={styles.announceHeaderBox}>
        <Text style={styles.announceMainTitle}>
          {isFallen
            ? '🎯 MỤC TIÊU ĐÃ BỊ THỢ SĂN BẮN HẠ!'
            : '🏹 VIÊN ĐẠN BÁO THÙ CỦA THỢ SĂN!'}
        </Text>
        <Text style={styles.announceSubTitle}>
          {isFallen
            ? 'Phát đạn xé toạc màn đêm — Thợ Săn đã mang theo một kẻ xuống mồ!'
            : 'Tâm ngắm đã khóa chặt mục tiêu, ngón tay Thợ Săn bóp cò dứt khoát...'}
        </Text>
      </View>

      {/* KHU VỰC TRUNG TÂM: CÂU THOẠI, AVATAR & TÂM NGẮM */}
      <Animated.View
        style={[
          styles.stageContainer,
          {
            transform: [
              { translateX: shakeAnim },
              { scale: avatarScale },
            ],
          },
        ]}
      >
        {/* CÂU THOẠI MÀU VÀNG CAM CỦA THỢ SĂN NẰM TRÊN AVATAR - KHÔNG TEXTBOX, GÕ CHỮ TYPEWRITER */}
        <View style={styles.floatingChantContainer}>
          {typedText.length > 0 && (
            <Text style={styles.floatingChantText}>
              {typedText}
            </Text>
          )}
        </View>

        {/* KHUNG AVATAR NẠN NHÂN (To tròn 230px) */}
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: isFallen ? '#1E293B' : (target?.avatarColor || '#EF4444') },
            isFallen && styles.avatarCircleDead,
          ]}
        >
          {isCustomImage ? (
            <Image
              source={{ uri: target.avatar }}
              style={styles.avatarImg}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatarEmoji}>
              {target?.avatar || '👤'}
            </Text>
          )}

          {/* Lớp phủ Grayscale đen tối khi bị bắn hạ */}
          {isFallen && (
            <View style={styles.deadGrayscaleOverlay}>
              <Text style={styles.skullEmoji}>☠️</Text>
            </View>
          )}

          {/* TÂM NGẮM ĐỎ RỰC RỠ CỦA THỢ SĂN (LOCK-ON) */}
          <Animated.View
            style={[
              styles.crosshairWrapper,
              {
                opacity: crosshairOpacity,
                transform: [
                  { scale: crosshairScale },
                  { rotate: spin },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <Image
              source={crosshairImg}
              style={styles.crosshairImg}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* TIA LỬA BẮN RA KHI SÚNG NỔ */}
        <View style={styles.sparksContainer} pointerEvents="none">
          {BULLET_SPARKS.map((spark) => {
            const sparkX = sparksAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, spark.targetX],
            });
            const sparkY = sparksAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, spark.targetY],
            });
            const sparkOpacity = sparksAnim.interpolate({
              inputRange: [0, 0.2, 0.8, 1],
              outputRange: [0, 1, 0.7, 0],
            });
            const sparkScale = sparksAnim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0.3, 1.4, 0.4],
            });

            return (
              <Animated.View
                key={spark.id}
                style={[
                  styles.sparkParticle,
                  {
                    width: spark.size,
                    height: spark.size,
                    borderRadius: spark.size / 2,
                    backgroundColor: spark.color,
                    opacity: sparkOpacity,
                    transform: [
                      { translateX: sparkX },
                      { translateY: sparkY },
                      { scale: sparkScale },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* BẢNG TÊN MỤC TIÊU TRÊN CHÂN ĐẾ */}
        <View style={[styles.namePlate, isFallen && styles.namePlateDead]}>
          <Text style={[styles.namePlateLabel, isFallen && styles.namePlateLabelDead]}>
            {isFallen ? 'MỤC TIÊU ĐÃ TỬ TRẬN' : 'MỤC TIÊU BỊ KHÓA BẮN'}
          </Text>
          <Text style={[styles.namePlateText, isFallen && styles.namePlateTextDead]} numberOfLines={1}>
            {target?.name || 'Chủ Phòng'}
          </Text>
        </View>

        {/* HUY HIỆU: ĐÃ BỊ THỢ SĂN BẮN HẠ */}
        <Animated.View
          style={[
            styles.badge,
            {
              opacity: badgeOpacity,
              transform: [{ scale: badgeScale }],
            },
          ]}
        >
          <View style={styles.badgeInner}>
            <Text style={styles.badgeTitle}>🎯 ĐÃ BỊ THỢ SĂN BẮN HẠ</Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Bottom Bar: Nút Đã Hiểu */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={styles.closeBtnText}>✨ ĐÃ HIỂU ({Math.max(0, timeLeft)}s)</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 5, 2, 0.95)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 420,
    marginTop: Platform.OS === 'web' ? 4 : 20,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#F59E0B',
  },
  titleEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  titleText: {
    color: '#FDE68A',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1.2,
  },
  timerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  timerText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800',
  },

  announceHeaderBox: {
    alignItems: 'center',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  announceMainTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(245, 158, 11, 0.8)',
    textShadowRadius: 10,
  },
  announceSubTitle: {
    fontSize: 12.5,
    color: '#CBD5E1',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 17,
  },

  stageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 380,
    marginVertical: 6,
  },

  // Câu thoại màu hổ phách/vàng của Thợ Săn nằm trên Avatar (không viền, không hộp nền)
  floatingChantContainer: {
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  floatingChantText: {
    color: '#FDE047',
    fontSize: 13.5,
    fontWeight: '800',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(245, 158, 11, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  avatarCircle: {
    width: 230,
    height: 230,
    borderRadius: 115,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#F59E0B',
    boxShadow: '0 0 22px rgba(245, 158, 11, 0.7)',
    position: 'relative',
  },
  avatarCircleDead: {
    borderColor: '#475569',
    boxShadow: '0 0 25px rgba(15, 23, 42, 0.9)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 105,
    textAlign: 'center',
  },
  deadGrayscaleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9,
  },
  skullEmoji: {
    fontSize: 80,
    opacity: 0.85,
  },

  // Tâm ngắm crosshair
  crosshairWrapper: {
    position: 'absolute',
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  crosshairImg: {
    width: '100%',
    height: '100%',
  },

  // Tia lửa đạn
  sparksContainer: {
    position: 'absolute',
    width: 230,
    height: 230,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 12,
  },
  sparkParticle: {
    position: 'absolute',
    boxShadow: '0 0 8px rgba(245, 158, 11, 0.9)',
  },

  namePlate: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.6)',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginTop: 8,
    minWidth: 200,
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
  },
  namePlateDead: {
    borderColor: '#475569',
    boxShadow: '0 0 15px rgba(0, 0, 0, 0.6)',
  },
  namePlateLabel: {
    fontSize: 9.5,
    color: '#FBBF24',
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  namePlateLabelDead: {
    color: '#94A3B8',
  },
  namePlateText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  namePlateTextDead: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },

  badge: {
    marginTop: 10,
    alignItems: 'center',
  },
  badgeInner: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)',
  },
  badgeTitle: {
    color: '#FCA5A5',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.8,
  },

  bottomBar: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 6 : 20,
  },
  closeBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
  },
  closeBtnText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.2,
  },
});

