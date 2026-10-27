// ============================================
// 🐺 MA SÓI - WolfClawAttackModal Component
// Hiệu ứng điện ảnh buổi sáng khi có người bị Ma Sói cào:
// 1. Avatar nạn nhân xuất hiện nổi bật ở trung tâm
// 2. Vết cào rách máu sắc lẹm xé toạc Avatar kèm rung chấn & chớp sáng
// 3. Avatar bị chuyển hóa sang tông màu đen xám u tối (tử nạn)
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 18 hạt máu bắn tung tóe khi bị cào
const NUM_BLOOD_DROPS = 18;
const BLOOD_DROPS = Array.from({ length: NUM_BLOOD_DROPS }, (_, i) => {
  const angle = (i / NUM_BLOOD_DROPS) * 2 * Math.PI + ((i % 3) * 0.2 - 0.1);
  const dist = 120 + (i % 5) * 28;
  const size = (i % 4 === 0) ? 14 : (i % 2 === 0) ? 10 : 6;
  return {
    id: i,
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist,
    size,
    color: i % 3 === 0 ? '#DC2626' : i % 2 === 0 ? '#991B1B' : '#EF4444',
  };
});

/**
 * Tạo âm thanh tổng hợp bằng Web Audio API
 */
function playSynthSound(type) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'drone') {
      // Âm u ám hồi hộp ban đầu
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } else if (type === 'slash') {
      // Âm thanh vuốt cào sắc lẹm xé toạc
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);

      // Thêm tiếng chấn động bass
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(120, ctx.currentTime);
      subOsc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5);
      subGain.gain.setValueAtTime(0.5, ctx.currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start();
      subOsc.stop(ctx.currentTime + 0.5);
    } else if (type === 'death') {
      // Tiếng chuông tử thần âm vang u tối
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 1.5);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    }
  } catch (err) {
    // Bỏ qua lỗi audio
  }
}

export default function WolfClawAttackModal({
  visible = false,
  victimPlayer = null,
  onClose,
  timeLeft = 5,
}) {
  // Giai đoạn: 'emerging' (nạn nhân xuất hiện) -> 'slashing' (sói cào) -> 'fallen' (đen xám tử nạn)
  const [stage, setStage] = useState('emerging');

  // Animation values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.4)).current;
  const avatarPulse = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Vuốt cào sói
  const clawScale = useRef(new Animated.Value(1.6)).current;
  const clawOpacity = useRef(new Animated.Value(0)).current;
  const clawTranslateX = useRef(new Animated.Value(-40)).current;
  const clawTranslateY = useRef(new Animated.Value(-35)).current;

  // Hạt máu bắn tung tóe
  const bloodExplosionAnim = useRef(new Animated.Value(0)).current;

  // Chuyển hóa đen xám (Grayscale / Death mask)
  const grayscaleAnim = useRef(new Animated.Value(0)).current;
  const deathBadgeScale = useRef(new Animated.Value(0.3)).current;
  const deathBadgeOpacity = useRef(new Animated.Value(0)).current;

  // Reset animations
  const resetAnimations = () => {
    backdropAnim.setValue(0);
    avatarScale.setValue(0.4);
    avatarPulse.setValue(1);
    shakeAnim.setValue(0);
    flashAnim.setValue(0);
    clawScale.setValue(1.6);
    clawOpacity.setValue(0);
    clawTranslateX.setValue(-40);
    clawTranslateY.setValue(-35);
    bloodExplosionAnim.setValue(0);
    grayscaleAnim.setValue(0);
    deathBadgeScale.setValue(0.3);
    deathBadgeOpacity.setValue(0);
  };

  useEffect(() => {
    if (!visible) {
      setStage('emerging');
      resetAnimations();
      return;
    }

    setStage('emerging');
    resetAnimations();

    // 1. Quả cầu / Avatar hiện lên với hào quang hồi hộp
    playSynthSound('drone');
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
    ]).start();

    // 2. Sau 1.1s: SÓI CÀO BẬT RA ĐÈ LÊN AVATAR!
    const timerSlash = setTimeout(() => {
      setStage('slashing');
      playSynthSound('slash');

      // Chớp sáng đỏ
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();

      // Rung chấn màn hình dữ dội
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 16, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -14, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 5, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();

      // Vết cào chém xé toạc avatar
      Animated.parallel([
        Animated.timing(clawOpacity, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.spring(clawScale, { toValue: 1.0, friction: 4, tension: 70, useNativeDriver: true }),
        Animated.timing(clawTranslateX, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(clawTranslateY, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(bloodExplosionAnim, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 1100);

    // 3. Sau 1.8s: AVATAR CHUYỂN SANG TÔNG MÀU ĐEN XÁM (TỬ NẠN)
    const timerDeath = setTimeout(() => {
      setStage('fallen');
      playSynthSound('death');

      Animated.parallel([
        // Phủ mờ đen xám toàn bộ avatar
        Animated.timing(grayscaleAnim, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        // Huy hiệu tử nạn hiện lên
        Animated.spring(deathBadgeScale, { toValue: 1, friction: 4, tension: 55, useNativeDriver: true }),
        Animated.timing(deathBadgeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 1850);

    return () => {
      clearTimeout(timerSlash);
      clearTimeout(timerDeath);
    };
  }, [visible, victimPlayer]);

  if (!visible) return null;

  const isCustomImage =
    typeof victimPlayer?.avatar === 'string' &&
    (victimPlayer.avatar.startsWith('data:') ||
      victimPlayer.avatar.startsWith('http') ||
      victimPlayer.avatar.startsWith('blob:') ||
      victimPlayer.avatar.length > 30);

  const isFallen = stage === 'fallen';

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropAnim }]}>
      {/* Hiệu ứng chớp đỏ khi bị cào */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: flashAnim,
            backgroundColor: 'rgba(239, 68, 68, 0.55)',
          },
        ]}
        pointerEvents="none"
      />

      {/* Top Bar Header */}
      <View style={styles.topBar}>
        <View style={styles.titleBadge}>
          <Text style={styles.titleEmoji}>🩸</Text>
          <Text style={styles.titleText}>BÌNH MINH ĐẪM MÁU</Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>⏳ {Math.max(0, timeLeft)}s</Text>
        </View>
      </View>

      {/* Thông điệp sự kiện */}
      <View style={styles.announceHeaderBox}>
        <Text style={styles.announceMainTitle}>
          {isFallen ? '💀 MA SÓI ĐÃ HẠ SÁT NẠN NHÂN' : '⚠️ MA SÓI TẤN CÔNG ĐÊM QUA!'}
        </Text>
        <Text style={styles.announceSubTitle}>
          {isFallen
            ? 'Vết thương chí mạng từ nanh vuốt ma quái không thể cứu chữa...'
            : 'Một tiếng thét xé tan màn đêm yên bình của ngôi làng...'}
        </Text>
      </View>

      {/* KHU VỰC TRUNG TÂM: AVATAR & VẾT CÀO */}
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
        {/* 1. KHUNG AVATAR NẠN NHÂN (To tròn 240px x 240px) */}
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: isFallen ? '#1E293B' : (victimPlayer?.avatarColor || '#38BDF8') },
            isFallen && styles.avatarCircleDead,
          ]}
        >
          {isCustomImage ? (
            <Image
              source={{ uri: victimPlayer.avatar }}
              style={styles.avatarImg}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatarEmoji}>
              {victimPlayer?.avatar || '👤'}
            </Text>
          )}

          {/* LỚP PHỦ ĐEN XÁM (GRAYSCALE & DARK DEATH FILTER) */}
          <Animated.View
            style={[
              styles.grayscaleDarkOverlay,
              { opacity: grayscaleAnim },
            ]}
          >
            {/* Biểu tượng đầu lâu tử nạn mờ ảo chìm trong avatar */}
            <Text style={styles.deathSkullWatermark}>💀</Text>
            {/* Lớp lọc đen xám tử vong */}
            <View style={styles.deathFilterTone} />
          </Animated.View>

          {/* 2. HÌNH ẢNH VẾT CÀO SÓI ĐÈ LÊN AVATAR */}
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

        {/* HẠT MÁU BẮN TUNG TÓE RA NGOÀI */}
        <View style={styles.bloodParticlesContainer} pointerEvents="none">
          {BLOOD_DROPS.map((drop) => {
            const dropX = bloodExplosionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, drop.targetX],
            });
            const dropY = bloodExplosionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, drop.targetY],
            });
            const dropOpacity = bloodExplosionAnim.interpolate({
              inputRange: [0, 0.1, 0.75, 1],
              outputRange: [0, 1, 0.8, 0],
            });
            const dropScale = bloodExplosionAnim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0.4, 1.3, 0.5],
            });

            return (
              <Animated.View
                key={drop.id}
                style={[
                  styles.bloodDrop,
                  {
                    width: drop.size,
                    height: drop.size,
                    borderRadius: drop.size / 2,
                    backgroundColor: drop.color,
                    opacity: dropOpacity,
                    transform: [
                      { translateX: dropX },
                      { translateY: dropY },
                      { scale: dropScale },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* BẢNG TÊN NẠN NHÂN TRÊN CHÂN ĐẾ */}
        <View style={[styles.namePlate, isFallen && styles.namePlateDead]}>
          <Text style={styles.namePlateLabel}>NẠN NHÂN ĐÊM QUA</Text>
          <Text style={[styles.namePlateText, isFallen && styles.namePlateTextDead]} numberOfLines={1}>
            {victimPlayer?.name || 'Người chơi vô danh'}
          </Text>
        </View>

        {/* HUY HIỆU TỬ NẠN HIỆN RA KHI BỊ CHUYỂN SANG ĐEN XÁM */}
        <Animated.View
          style={[
            styles.deathBadge,
            {
              opacity: deathBadgeOpacity,
              transform: [{ scale: deathBadgeScale }],
            },
          ]}
        >
          <View style={styles.deathBadgeInner}>
            <Text style={styles.deathBadgeTitle}>ĐÃ BỊ SÓI CẮN</Text>
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
          <Text style={styles.closeBtnText}>⚰️ ĐÃ HIỂU ({Math.max(0, timeLeft)}s)</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 12, 0.95)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 440,
    paddingHorizontal: 10,
    zIndex: 10,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(127, 29, 29, 0.45)',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    shadowColor: '#EF4444',
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  titleEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  titleText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  timerBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: '#EF4444',
    borderWidth: 1.2,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  timerText: {
    color: '#FECACA',
    fontSize: 13,
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
  announceSubTitle: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 16,
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
  avatarCircleDead: {
    borderColor: '#64748B',
    boxShadow: '0 0 10px rgba(15, 23, 42, 0.8)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 105,
    textAlign: 'center',
  },

  // Lớp phủ đen xám tử nạn
  grayscaleDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
  },
  deathFilterTone: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  deathSkullWatermark: {
    fontSize: 100,
    opacity: 0.7,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },

  // Vết cào sói
  clawImgWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  clawImg: {
    width: 250,
    height: 250,
  },

  // Hạt máu
  bloodParticlesContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9,
  },
  bloodDrop: {
    position: 'absolute',
    boxShadow: '0 0 6px #EF4444',
  },

  // Bảng tên
  namePlate: {
    marginTop: 18,
    backgroundColor: 'rgba(26, 16, 37, 0.92)',
    borderWidth: 1.8,
    borderColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 20,
    alignItems: 'center',
    maxWidth: 240,
    boxShadow: '0 0 12px rgba(239, 68, 68, 0.45)',
  },
  namePlateDead: {
    borderColor: '#64748B',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    boxShadow: '0 0 8px rgba(100, 116, 139, 0.3)',
  },
  namePlateLabel: {
    fontSize: 9.5,
    color: '#F87171',
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  namePlateText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  namePlateTextDead: {
    color: '#94A3B8',
  },

  // Huy hiệu tử nạn
  deathBadge: {
    marginTop: 12,
    zIndex: 12,
  },
  deathBadgeInner: {
    backgroundColor: 'rgba(69, 10, 10, 0.92)',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 18,
    alignItems: 'center',
    boxShadow: '0 0 16px rgba(239, 68, 68, 0.55)',
  },
  deathBadgeTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FCA5A5',
    letterSpacing: 1.5,
  },

  // Bottom Bar
  bottomBar: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  closeBtn: {
    backgroundColor: '#7F1D1D',
    borderWidth: 1.8,
    borderColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    boxShadow: '0 0 14px rgba(239, 68, 68, 0.4)',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
});
