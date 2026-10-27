// ============================================
// 🛡️ MA SÓI - BodyguardSaveModal Component
// Hiệu ứng điện ảnh buổi sáng khi Bảo Vệ cứu người thành công:
// 1. Avatar nạn nhân xuất hiện kèm dòng chữ Ma Sói tấn công
// 2. Móng vuốt Sói lao tới xé toạc
// 3. Khiên Hiệp Sĩ bay ra CHẶN ĐỨNG móng vuốt Sói kèm âm thanh kim loại đanh thép & tia lửa tóe ra
// 4. Móng vuốt tan biến, tiêu đề chuyển thành "BẢO VỆ ĐÃ BẢO VỆ THÀNH CÔNG!!"
// 5. Huy hiệu phía dưới: "🛡️ ĐÃ ĐƯỢC BẢO VỆ"
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

const wolfClawImg = require('../assets/wolf_claw.png');
const shieldImg = require('../assets/shield.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 22 hạt tia lửa kim loại bắn tung tóe khi móng vuốt va vào khiên
const NUM_SPARKS = 22;
const SPARKS = Array.from({ length: NUM_SPARKS }, (_, i) => {
  const angle = (i / NUM_SPARKS) * 2 * Math.PI + ((i % 3) * 0.15 - 0.08);
  const dist = 130 + (i % 6) * 26;
  const size = (i % 4 === 0) ? 12 : (i % 2 === 0) ? 8 : 5;
  return {
    id: i,
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist,
    size,
    color: i % 4 === 0 ? '#FFFFFF' : i % 3 === 0 ? '#FCD34D' : i % 2 === 0 ? '#38BDF8' : '#F59E0B',
  };
});

/**
 * Âm thanh tổng hợp bằng Web Audio API
 */
function playSynthSound(type) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (type === 'drone') {
      // Âm u ám hồi hộp ban đầu
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 1.2);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
    } else if (type === 'slash') {
      // Tiếng vuốt sói lao tới
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.3);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'metalClank') {
      // TIẾNG VA CHẠM VÔ KIM LOẠI ĐANH THÉP (Metallic clank & ringing resonance)
      // 1. Thud bass của khiên
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'triangle';
      bass.frequency.setValueAtTime(180, now);
      bass.frequency.exponentialRampToValueAtTime(50, now + 0.35);
      bassGain.gain.setValueAtTime(0.55, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      bass.connect(bassGain);
      bassGain.connect(ctx.destination);
      bass.start(now);
      bass.stop(now + 0.35);

      // 2. Chuỗi hòa âm kim loại cao tần ngân vang (Keng / Ching sắt đập sắt)
      const freqs = [1850, 2450, 3120, 4100];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'square' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.94, now + 0.7);
        const initVol = 0.24 / (idx + 1);
        gain.gain.setValueAtTime(initVol, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
      });
    } else if (type === 'holyGlow') {
      // Âm thanh thánh quang bảo vệ thành công
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.18, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 1.2);
      });
    }
  } catch (err) {
    // Bỏ qua lỗi audio
  }
}

export default function BodyguardSaveModal({
  visible = false,
  savedPlayer = null,
  onClose,
  timeLeft = 5,
}) {
  // Giai đoạn: 'emerging' -> 'slashing' -> 'deflecting' -> 'protected'
  const [stage, setStage] = useState('emerging');

  // Animation values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.4)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Vuốt cào sói
  const clawScale = useRef(new Animated.Value(1.6)).current;
  const clawOpacity = useRef(new Animated.Value(0)).current;
  const clawTranslateX = useRef(new Animated.Value(-40)).current;
  const clawTranslateY = useRef(new Animated.Value(-35)).current;

  // Khiên bảo vệ
  const shieldScale = useRef(new Animated.Value(0.1)).current;
  const shieldOpacity = useRef(new Animated.Value(0)).current;
  const shieldAuraPulse = useRef(new Animated.Value(1)).current;
  const shockwaveScale = useRef(new Animated.Value(0.2)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0)).current;

  // Tia lửa tóe ra
  const sparksExplosionAnim = useRef(new Animated.Value(0)).current;

  // Huy hiệu "Đã được bảo vệ"
  const protectBadgeScale = useRef(new Animated.Value(0.3)).current;
  const protectBadgeOpacity = useRef(new Animated.Value(0)).current;

  // Header cross-fade
  const headerOpacity = useRef(new Animated.Value(1)).current;

  const resetAnimations = () => {
    backdropAnim.setValue(0);
    avatarScale.setValue(0.4);
    shakeAnim.setValue(0);
    flashAnim.setValue(0);
    clawScale.setValue(1.6);
    clawOpacity.setValue(0);
    clawTranslateX.setValue(-40);
    clawTranslateY.setValue(-35);
    shieldScale.setValue(0.1);
    shieldOpacity.setValue(0);
    shieldAuraPulse.setValue(1);
    shockwaveScale.setValue(0.2);
    shockwaveOpacity.setValue(0);
    sparksExplosionAnim.setValue(0);
    protectBadgeScale.setValue(0.3);
    protectBadgeOpacity.setValue(0);
    headerOpacity.setValue(1);
  };

  useEffect(() => {
    if (!visible) {
      setStage('emerging');
      resetAnimations();
      return;
    }

    setStage('emerging');
    resetAnimations();

    // 1. Avatar nạn nhân hiện lên
    playSynthSound('drone');
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
    ]).start();

    // 2. Sau 1.0s: SÓI LAO VÀO CÀO
    const timerSlash = setTimeout(() => {
      setStage('slashing');
      playSynthSound('slash');

      // Vuốt cào lao xuống
      Animated.parallel([
        Animated.timing(clawOpacity, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.spring(clawScale, { toValue: 1.0, friction: 4, tension: 70, useNativeDriver: true }),
        Animated.timing(clawTranslateX, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(clawTranslateY, { toValue: 0, duration: 120, useNativeDriver: true }),
      ]).start();
    }, 1000);

    // 3. Sau 1.35s: KHIÊN BAY RA CHẶN ĐỨNG MÓNG VUỐT! (VA CHẠM KIM LOẠI)
    const timerDeflect = setTimeout(() => {
      setStage('deflecting');
      playSynthSound('metalClank');

      // Chớp sáng xanh dương / vàng kim
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();

      // Rung chấn va chạm kim loại
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 14, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -12, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
      ]).start();

      // Khiên xuất hiện đập tan đòn cào
      Animated.parallel([
        Animated.timing(shieldOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.spring(shieldScale, { toValue: 1.0, friction: 4, tension: 70, useNativeDriver: true }),
        // Sóng xung kích bùng nở
        Animated.timing(shockwaveScale, { toValue: 2.2, duration: 550, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(shockwaveOpacity, { toValue: 0.9, duration: 80, useNativeDriver: true }),
          Animated.timing(shockwaveOpacity, { toValue: 0, duration: 470, useNativeDriver: true }),
        ]),
        // Tia lửa kim loại bắn tung tóe
        Animated.timing(sparksExplosionAnim, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Móng vuốt sói bị dội ngược và tan biến
        Animated.sequence([
          Animated.timing(clawScale, { toValue: 1.15, duration: 80, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(clawScale, { toValue: 0.7, duration: 350, useNativeDriver: true }),
            Animated.timing(clawTranslateY, { toValue: -60, duration: 350, useNativeDriver: true }),
            Animated.timing(clawOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    }, 1350);

    // 4. Sau 2.0s: BẢO VỆ THÀNH CÔNG RỰC RỠ
    const timerProtected = setTimeout(() => {
      setStage('protected');
      playSynthSound('holyGlow');

      // Chuyển tiêu đề mượt mà
      Animated.sequence([
        Animated.timing(headerOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(headerOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      // Huy hiệu ĐÃ ĐƯỢC BẢO VỆ hiện lên
      Animated.parallel([
        Animated.spring(protectBadgeScale, { toValue: 1, friction: 4, tension: 55, useNativeDriver: true }),
        Animated.timing(protectBadgeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      // Hiệu ứng khiên tỏa hào quang lấp lánh liên tục
      Animated.loop(
        Animated.sequence([
          Animated.timing(shieldAuraPulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(shieldAuraPulse, { toValue: 0.98, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }, 2050);

    return () => {
      clearTimeout(timerSlash);
      clearTimeout(timerDeflect);
      clearTimeout(timerProtected);
    };
  }, [visible, savedPlayer]);

  if (!visible) return null;

  const isCustomImage =
    typeof savedPlayer?.avatar === 'string' &&
    (savedPlayer.avatar.startsWith('data:') ||
      savedPlayer.avatar.startsWith('http') ||
      savedPlayer.avatar.startsWith('blob:') ||
      savedPlayer.avatar.length > 30);

  const isProtected = stage === 'protected';

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropAnim }]}>
      {/* Hiệu ứng chớp sáng khi khiên đỡ móng vuốt */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: flashAnim,
            backgroundColor: 'rgba(56, 189, 248, 0.45)',
          },
        ]}
        pointerEvents="none"
      />

      {/* Top Bar Header */}
      <View style={styles.topBar}>
        <View style={[styles.titleBadge, isProtected && styles.titleBadgeProtected]}>
          <Text style={styles.titleEmoji}>{isProtected ? '🛡️' : '⚠️'}</Text>
          <Text style={styles.titleText}>
            {isProtected ? 'KHIÊN HỘ MỆNH THẦN KỲ' : 'MA SÓI ĐỘT KÍCH'}
          </Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>⏳ {Math.max(0, timeLeft)}s</Text>
        </View>
      </View>

      {/* Thông điệp sự kiện: Lúc đầu là Ma Sói tấn công, sau đó chuyển sang Bảo Vệ đã bảo vệ thành công! */}
      <Animated.View style={[styles.announceHeaderBox, { opacity: headerOpacity }]}>
        <Text style={[styles.announceMainTitle, isProtected && styles.announceMainTitleProtected]}>
          {isProtected
            ? '🛡️ BẢO VỆ ĐÃ BẢO VỆ THÀNH CÔNG!!'
            : '⚠️ MA SÓI TẤN CÔNG ĐÊM QUA!'}
        </Text>
        <Text style={[styles.announceSubTitle, isProtected && styles.announceSubTitleProtected]}>
          {isProtected
            ? 'Người hùng của ngôi làng đã bảo vệ được người vô tội'
            : 'Một tiếng thét xé tan màn đêm yên bình của ngôi làng...'}
        </Text>
      </Animated.View>

      {/* KHU VỰC TRUNG TÂM: AVATAR & KHIÊN BẢO VỆ */}
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
        {/* 1. KHUNG AVATAR NẠN NHÂN (To tròn 230px x 230px) */}
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: savedPlayer?.avatarColor || '#38BDF8' },
            isProtected && styles.avatarCircleProtected,
          ]}
        >
          {isCustomImage ? (
            <Image
              source={{ uri: savedPlayer.avatar }}
              style={styles.avatarImg}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatarEmoji}>
              {savedPlayer?.avatar || '👤'}
            </Text>
          )}

          {/* Sóng xung kích ánh sáng khi khiên đỡ đòn */}
          <Animated.View
            style={[
              styles.shockwaveRing,
              {
                opacity: shockwaveOpacity,
                transform: [{ scale: shockwaveScale }],
              },
            ]}
            pointerEvents="none"
          />

          {/* 2. CHIẾC KHIÊN HIỆP SĨ CHẶN ĐỨNG ĐÒN TẤN CÔNG */}
          <Animated.View
            style={[
              styles.shieldWrapper,
              {
                opacity: shieldOpacity,
                transform: [
                  { scale: Animated.multiply(shieldScale, shieldAuraPulse) },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <Image
              source={shieldImg}
              style={styles.shieldImg}
              resizeMode="contain"
            />
          </Animated.View>

          {/* 3. MÓNG VUỐT SÓI (LAO TỚI RỒI BỊ BẬT NGƯỢC RA) */}
          <Animated.View
            style={[
              styles.clawImgWrapper,
              {
                opacity: clawOpacity,
                transform: [
                  { scale: clawScale },
                  { translateX: clawTranslateX },
                  { translateY: clawTranslateY },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <Image
              source={wolfClawImg}
              style={styles.clawImg}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* TIA LỬA KIM LOẠI BẮN TUNG TÓE RA NGOÀI */}
        <View style={styles.sparksContainer} pointerEvents="none">
          {SPARKS.map((spark) => {
            const sparkX = sparksExplosionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, spark.targetX],
            });
            const sparkY = sparksExplosionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, spark.targetY],
            });
            const sparkOpacity = sparksExplosionAnim.interpolate({
              inputRange: [0, 0.1, 0.75, 1],
              outputRange: [0, 1, 0.85, 0],
            });
            const sparkScale = sparksExplosionAnim.interpolate({
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

        {/* BẢNG TÊN NẠN NHÂN TRÊN CHÂN ĐẾ (GIỮ NGUYÊN NẠN NHÂN ĐÊM QUA THEO YÊU CẦU) */}
        <View style={[styles.namePlate, isProtected && styles.namePlateProtected]}>
          <Text style={[styles.namePlateLabel, isProtected && styles.namePlateLabelProtected]}>
            NẠN NHÂN ĐÊM QUA
          </Text>
          <Text style={styles.namePlateText} numberOfLines={1}>
            {savedPlayer?.name || 'Người chơi vô danh'}
          </Text>
        </View>

        {/* HUY HIỆU "ĐÃ ĐƯỢC BẢO VỆ" */}
        <Animated.View
          style={[
            styles.protectBadge,
            {
              opacity: protectBadgeOpacity,
              transform: [{ scale: protectBadgeScale }],
            },
          ]}
        >
          <View style={styles.protectBadgeInner}>
            <Text style={styles.protectBadgeTitle}>🛡️ ĐÃ ĐƯỢC BẢO VỆ</Text>
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
          <Text style={styles.closeBtnText}>🛡️ ĐÃ HIỂU ({Math.max(0, timeLeft)}s)</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 10, 20, 0.95)',
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

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: 8,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#EF4444',
  },
  titleBadgeProtected: {
    backgroundColor: 'rgba(14, 165, 233, 0.25)',
    borderColor: '#38BDF8',
  },
  titleEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  titleText: {
    color: '#FFFFFF',
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

  // Announcement Box
  announceHeaderBox: {
    alignItems: 'center',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  announceMainTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F87171',
    letterSpacing: 1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(239, 68, 68, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  announceMainTitleProtected: {
    color: '#38BDF8',
    textShadowColor: 'rgba(56, 189, 248, 0.8)',
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
  announceSubTitleProtected: {
    color: '#BAE6FD',
    fontWeight: '700',
  },

  // Sân khấu trung tâm
  stageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 380,
    marginVertical: 8,
  },
  avatarCircle: {
    width: 230,
    height: 230,
    borderRadius: 115,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#EF4444',
    boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)',
    position: 'relative',
  },
  avatarCircleProtected: {
    borderColor: '#38BDF8',
    boxShadow: '0 0 25px rgba(56, 189, 248, 0.75)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 105,
    textAlign: 'center',
  },

  // Sóng xung kích ánh sáng
  shockwaveRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    zIndex: 7,
  },

  // Khiên bảo vệ hiệp sĩ
  shieldWrapper: {
    position: 'absolute',
    width: 195,
    height: 195,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  shieldImg: {
    width: '100%',
    height: '100%',
  },

  // Vết cào sói
  clawImgWrapper: {
    position: 'absolute',
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9,
  },
  clawImg: {
    width: '100%',
    height: '100%',
  },

  // Tia lửa kim loại
  sparksContainer: {
    position: 'absolute',
    width: 230,
    height: 230,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  sparkParticle: {
    position: 'absolute',
    boxShadow: '0 0 6px rgba(255, 255, 255, 0.8)',
  },

  // Bảng tên chân đế
  namePlate: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.6)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginTop: 14,
    minWidth: 200,
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
  },
  namePlateProtected: {
    borderColor: '#0284C7',
    boxShadow: '0 0 15px rgba(14, 165, 233, 0.4)',
  },
  namePlateLabel: {
    fontSize: 9.5,
    color: '#F87171',
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  namePlateLabelProtected: {
    color: '#38BDF8',
  },
  namePlateText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },

  // Huy hiệu "ĐÃ ĐƯỢC BẢO VỆ"
  protectBadge: {
    marginTop: 12,
    zIndex: 12,
  },
  protectBadgeInner: {
    backgroundColor: 'rgba(12, 74, 110, 0.92)',
    borderWidth: 2,
    borderColor: '#38BDF8',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 22,
    alignItems: 'center',
    boxShadow: '0 0 18px rgba(56, 189, 248, 0.6)',
  },
  protectBadgeTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#E0F2FE',
    letterSpacing: 1.5,
  },

  // Bottom Bar
  bottomBar: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  closeBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 18,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    boxShadow: '0 4px 16px rgba(2, 132, 199, 0.45)',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
  },
});
