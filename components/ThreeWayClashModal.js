// ============================================
// 🛡️🐺☠️ MA SÓI - ThreeWayClashModal Component
// Hoạt ảnh điện ảnh liên tục tương tác ba bên (Bảo Vệ + Ma Sói + Phù Thủy):
// 1. Sói lao vào cào xé mục tiêu
// 2. Khiên Bảo Vệ bay ra đỡ đòn thành công (kim loại tóe lửa, vuốt sói tan biến)
// 3. ĐÈ HIỆU ỨNG LIÊN TỤC: Bình độc Phù Thủy bay vụt tới đập vỡ toang vào khiên
// 4. Khiên hộ mệnh vỡ tan biến vì không thể chống độc dược
// 5. Câu thoại trên đỉnh: "Số phận của ngươi vẫn không thoát khỏi cái chết đâu"
// 6. Avatar phủ xám tử nạn, bên dưới: "[Tên người] đã bị phù thủy giết chết!"
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
const potionPoisonImg = require('../assets/potion_poison.png');

const CLASH_CHANT = 'Số phận của ngươi vẫn không thoát khỏi cái chết đâu';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 20 tia lửa khiên kim loại va chạm móng vuốt
const NUM_SHIELD_SPARKS = 20;
const SHIELD_SPARKS = Array.from({ length: NUM_SHIELD_SPARKS }, (_, i) => {
  const angle = (i / NUM_SHIELD_SPARKS) * 2 * Math.PI + ((i % 3) * 0.15 - 0.08);
  const dist = 120 + (i % 5) * 25;
  const size = (i % 4 === 0) ? 12 : (i % 2 === 0) ? 8 : 5;
  return {
    id: i,
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist,
    size,
    color: i % 4 === 0 ? '#FFFFFF' : i % 3 === 0 ? '#FCD34D' : i % 2 === 0 ? '#38BDF8' : '#F59E0B',
  };
});

// 24 giọt độc dược tím bắn tung tóe
const NUM_POISON_DROPS = 24;
const POISON_DROPS = Array.from({ length: NUM_POISON_DROPS }, (_, i) => {
  const angle = (i / NUM_POISON_DROPS) * 2 * Math.PI + ((i % 3) * 0.2 - 0.1);
  const dist = 125 + (i % 6) * 26;
  const size = (i % 4 === 0) ? 14 : (i % 2 === 0) ? 9 : 6;
  return {
    id: i,
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist,
    size,
    color: i % 4 === 0 ? '#DC2626' : i % 3 === 0 ? '#991B1B' : i % 2 === 0 ? '#C084FC' : '#A855F7',
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
      // Va chạm kim loại của khiên
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

      const freqs = [1850, 2450, 3120, 4100];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.008);
        gain.gain.setValueAtTime(0.22, now + idx * 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.008 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.008);
        osc.stop(now + idx * 0.008 + 0.45);
      });
    } else if (type === 'potionThrow') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'poisonBurst') {
      // Kính bình độc vỡ toang
      const breakOsc = ctx.createOscillator();
      const breakGain = ctx.createGain();
      breakOsc.type = 'square';
      breakOsc.frequency.setValueAtTime(1200, now);
      breakOsc.frequency.exponentialRampToValueAtTime(120, now + 0.4);
      breakGain.gain.setValueAtTime(0.4, now);
      breakGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      breakOsc.connect(breakGain);
      breakGain.connect(ctx.destination);
      breakOsc.start(now);
      breakOsc.stop(now + 0.4);

      // Thud bass u tối độc hại
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(90, now);
      subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.7);
      subGain.gain.setValueAtTime(0.45, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.7);
    }
  } catch (err) {}
}

export default function ThreeWayClashModal({
  visible = false,
  victimPlayer = null,
  timeLeft = 9,
  onClose = () => {},
}) {
  const target = victimPlayer || {};

  // Các giai đoạn liên tục đè lên nhau:
  // 'emerging' (nạn nhân xuất hiện)
  // -> 'slashing' (sói cào xé)
  // -> 'shieldDefend' (khiên bảo vệ bay ra đỡ vuốt sói)
  // -> 'poisonFlying' (phù thủy ném bình độc tới)
  // -> 'shieldBroken' (bình độc vỡ toang, khiên tan rã)
  // -> 'fallen' (trúng độc tử trận)
  const [stage, setStage] = useState('emerging');
  const [typedChant, setTypedChant] = useState('');

  // Animated values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.4)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const flashColor = useRef('#EF4444');

  // Vuốt sói
  const clawScale = useRef(new Animated.Value(1.6)).current;
  const clawOpacity = useRef(new Animated.Value(0)).current;

  // Khiên bảo vệ
  const shieldScale = useRef(new Animated.Value(0.2)).current;
  const shieldOpacity = useRef(new Animated.Value(0)).current;
  const shieldTranslateY = useRef(new Animated.Value(140)).current;
  const shieldPulse = useRef(new Animated.Value(1)).current;
  const shieldSparksAnim = useRef(new Animated.Value(0)).current;

  // Bình độc phù thủy
  const potionScale = useRef(new Animated.Value(0.1)).current;
  const potionOpacity = useRef(new Animated.Value(0)).current;
  const potionTranslateY = useRef(new Animated.Value(-140)).current;
  const potionRotate = useRef(new Animated.Value(0)).current;
  const poisonDropsAnim = useRef(new Animated.Value(0)).current;

  // Lớp phủ tử trận
  const grayscaleAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.3)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;

  const resetAnimations = () => {
    backdropAnim.setValue(0);
    avatarScale.setValue(0.4);
    shakeAnim.setValue(0);
    flashAnim.setValue(0);
    clawScale.setValue(1.6);
    clawOpacity.setValue(0);
    shieldScale.setValue(0.2);
    shieldOpacity.setValue(0);
    shieldTranslateY.setValue(140);
    shieldPulse.setValue(1);
    shieldSparksAnim.setValue(0);
    potionScale.setValue(0.1);
    potionOpacity.setValue(0);
    potionTranslateY.setValue(-140);
    potionRotate.setValue(0);
    poisonDropsAnim.setValue(0);
    grayscaleAnim.setValue(0);
    badgeScale.setValue(0.3);
    badgeOpacity.setValue(0);
    setTypedChant('');
  };

  useEffect(() => {
    if (!visible) {
      setStage('emerging');
      setTypedChant('');
      resetAnimations();
      return;
    }

    setStage('emerging');
    setTypedChant('');
    resetAnimations();

    // 1. (0.0s): Nạn nhân xuất hiện
    playSynthSound('drone');
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
    ]).start();

    // 2. (0.8s): SÓI CÀO XÉ DỮ DỘI
    const timerSlash = setTimeout(() => {
      setStage('slashing');
      playSynthSound('slash');
      flashColor.current = '#EF4444';

      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();

      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 16, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -14, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();

      Animated.parallel([
        Animated.timing(clawOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.spring(clawScale, { toValue: 1.0, friction: 4, tension: 70, useNativeDriver: true }),
      ]).start();
    }, 800);

    // 3. (1.3s): KHIÊN BẢO VỆ BAY RA CHẶN ĐỨNG VUỐT SÓI!
    const timerShield = setTimeout(() => {
      setStage('shieldDefend');
      playSynthSound('metalClank');
      flashColor.current = '#38BDF8';

      // Chớp sáng xanh khiên
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.9, duration: 60, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();

      // Rung chấn va chạm kim loại
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -12, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
      ]).start();

      // Khiên bay vút lên che chở
      Animated.parallel([
        Animated.timing(shieldOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(shieldScale, { toValue: 1.0, friction: 4, tension: 65, useNativeDriver: true }),
        Animated.timing(shieldTranslateY, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();

      // Móng vuốt sói tan biến trước khiên
      Animated.timing(clawOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start();

      // Tia lửa khiên tóe ra
      Animated.timing(shieldSparksAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 1300);

    // 4. (2.5s): DÒNG THOẠI GÕ CHỮ "Số phận của ngươi vẫn không thoát khỏi cái chết đâu"
    let typingInterval = null;
    const timerChant = setTimeout(() => {
      let index = 0;
      typingInterval = setInterval(() => {
        index++;
        if (index <= CLASH_CHANT.length) {
          setTypedChant(CLASH_CHANT.slice(0, index));
        } else {
          clearInterval(typingInterval);
        }
      }, 25);
    }, 2500);

    // 5. (3.6s): BÌNH THUỐC ĐỘC LAO VÚT VÀO KHIÊN!
    const timerPotionThrow = setTimeout(() => {
      setStage('poisonFlying');
      playSynthSound('potionThrow');

      Animated.parallel([
        Animated.timing(potionOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(potionScale, { toValue: 1.0, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(potionTranslateY, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(potionRotate, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]).start();
    }, 3600);

    // 6. (4.2s): BÌNH ĐỘC ĐẬP VỠ TOANG VÀO KHIÊN - KHIÊN TAN RÃ VÌ KHÔNG ĐỠ ĐƯỢC ĐỘC!
    const timerBreakAndFall = setTimeout(() => {
      setStage('shieldBroken');
      playSynthSound('poisonBurst');
      flashColor.current = '#A855F7';

      // Chớp tím độc hại
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();

      // Giọt độc bung tỏa
      Animated.timing(poisonDropsAnim, {
        toValue: 1,
        duration: 750,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      // Bình độc vỡ tan biến
      Animated.timing(potionOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();

      // Khiên hộ mệnh nứt rạn và tan biến
      Animated.parallel([
        Animated.timing(shieldScale, { toValue: 1.35, duration: 300, useNativeDriver: true }),
        Animated.timing(shieldOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();

      // Avatar nạn nhân chuyển sang phủ xám tử nạn
      setStage('fallen');
      Animated.parallel([
        Animated.timing(grayscaleAnim, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, { toValue: 1, friction: 4, tension: 55, useNativeDriver: true }),
        Animated.timing(badgeOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 4200);

    return () => {
      clearTimeout(timerSlash);
      clearTimeout(timerShield);
      clearTimeout(timerChant);
      if (typingInterval) clearInterval(typingInterval);
      clearTimeout(timerPotionThrow);
      clearTimeout(timerBreakAndFall);
    };
  }, [visible, target?.id]);

  if (!visible) return null;

  const isCustomImage =
    typeof target?.avatar === 'string' &&
    (target.avatar.startsWith('data:') ||
      target.avatar.startsWith('http') ||
      target.avatar.startsWith('blob:') ||
      target.avatar.length > 30);

  const isFallen = stage === 'fallen' || stage === 'shieldBroken';
  const potionSpin = potionRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-45deg', '0deg'],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropAnim }]}>
      {/* Flash chớp sáng theo từng giai đoạn (Đỏ sói -> Xanh khiên -> Tím độc) */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            backgroundColor: flashColor.current,
            opacity: flashAnim,
          },
        ]}
        pointerEvents="none"
      />

      {/* Top Bar: Tiêu đề & đếm giờ */}
      <View style={styles.topBar}>
        <View style={styles.titleBadge}>
          <Text style={styles.titleEmoji}>🛡️🐺☠️</Text>
          <Text style={styles.titleText}>TƯƠNG TÁC TAY BA: BẢO VỆ + SÓI + PHÙ THỦY</Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>⏳ {Math.max(0, timeLeft)}s</Text>
        </View>
      </View>

      {/* Thông điệp diễn tiến sự kiện */}
      <View style={styles.announceHeaderBox}>
        <Text style={styles.announceMainTitle}>
          {isFallen
            ? `${target?.name || 'Mục tiêu'} đã bị phù thủy giết chết!`
            : stage === 'poisonFlying'
            ? '🧙‍♀️ PHÙ THỦY ĐANG NÉM THUỐC ĐỘC!'
            : stage === 'shieldDefend'
            ? '🛡️ KHIÊN BẢO VỆ ĐÃ ĐỠ ĐƯỢC ĐÒN SÓI!'
            : '🐺 MA SÓI PHỤC KÍCH TẤN CÔNG!'}
        </Text>
        <Text style={styles.announceSubTitle}>
          {isFallen
            ? 'Khiên hộ mệnh chỉ đỡ được nanh vuốt Sói chứ không ngăn được độc dược phù thủy!'
            : stage === 'shieldDefend'
            ? 'Bảo Vệ đã dùng Khiên che chở thành công... nhưng hiểm họa vẫn đang cận kề!'
            : 'Nanh vuốt Sói xé toạc màn đêm lao thẳng vào mục tiêu...'}
        </Text>
      </View>

      {/* DÒNG CHỮ CHẠY TYPEWRITER BÊN TRÊN: "Số phận của ngươi vẫn không thoát khỏi cái chết đâu" */}
      <View style={styles.floatingChantContainer}>
        {typedChant.length > 0 && (
          <Text style={styles.floatingChantText}>{typedChant}</Text>
        )}
      </View>

      {/* KHU VỰC TRUNG TÂM: AVATAR, VUỐT SÓI, KHIÊN BẢO VỆ & BÌNH ĐỘC */}
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
        {/* Vòng tròn Avatar nạn nhân */}
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: isFallen ? '#1E293B' : (target?.avatarColor || '#38BDF8') },
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

          {/* MÓNG VUỐT SÓI CÀO XÉ */}
          <Animated.View
            style={[
              styles.clawOverlay,
              {
                opacity: clawOpacity,
                transform: [{ scale: clawScale }],
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

          {/* KHIÊN HỘ MỆNH CỦA BẢO VỆ */}
          <Animated.View
            style={[
              styles.shieldOverlay,
              {
                opacity: shieldOpacity,
                transform: [
                  { scale: shieldScale },
                  { translateY: shieldTranslateY },
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

          {/* BÌNH THUỐC ĐỘC CỦA PHÙ THỦY LAO VÀO */}
          <Animated.View
            style={[
              styles.potionOverlay,
              {
                opacity: potionOpacity,
                transform: [
                  { scale: potionScale },
                  { translateY: potionTranslateY },
                  { rotate: potionSpin },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <Image
              source={potionPoisonImg}
              style={styles.potionImg}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Lớp phủ Grayscale đen tối khi bị hạ độc chết */}
          {isFallen && (
            <View style={styles.deadGrayscaleOverlay}>
              <Text style={styles.skullEmoji}>☠️</Text>
            </View>
          )}
        </View>

        {/* TIA LỬA KIM LOẠI KHI KHIÊN ĐỠ ĐÒN SÓI */}
        <View style={styles.particlesContainer} pointerEvents="none">
          {SHIELD_SPARKS.map((spark) => {
            const sparkX = shieldSparksAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, spark.targetX],
            });
            const sparkY = shieldSparksAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, spark.targetY],
            });
            const sparkOpacity = shieldSparksAnim.interpolate({
              inputRange: [0, 0.2, 0.8, 1],
              outputRange: [0, 1, 0.8, 0],
            });

            return (
              <Animated.View
                key={`spark-${spark.id}`}
                style={[
                  styles.sparkDot,
                  {
                    width: spark.size,
                    height: spark.size,
                    borderRadius: spark.size / 2,
                    backgroundColor: spark.color,
                    opacity: sparkOpacity,
                    transform: [{ translateX: sparkX }, { translateY: sparkY }],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* GIỌT ĐỘC TÍM BẮN TUNG TÓE KHI BÌNH ĐỘC ĐẬP VỠ */}
        <View style={styles.particlesContainer} pointerEvents="none">
          {POISON_DROPS.map((drop) => {
            const dropX = poisonDropsAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, drop.targetX],
            });
            const dropY = poisonDropsAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, drop.targetY],
            });
            const dropOpacity = poisonDropsAnim.interpolate({
              inputRange: [0, 0.15, 0.75, 1],
              outputRange: [0, 1, 0.8, 0],
            });

            return (
              <Animated.View
                key={`drop-${drop.id}`}
                style={[
                  styles.sparkDot,
                  {
                    width: drop.size,
                    height: drop.size,
                    borderRadius: drop.size / 2,
                    backgroundColor: drop.color,
                    opacity: dropOpacity,
                    transform: [{ translateX: dropX }, { translateY: dropY }],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* BẢNG TÊN MỤC TIÊU DƯỚI CHÂN ĐẾ */}
        <View style={[styles.namePlate, isFallen && styles.namePlateDead]}>
          <Text style={[styles.namePlateLabel, isFallen && styles.namePlateLabelDead]}>
            {isFallen ? 'ĐÃ BỊ PHÙ THỦY GIẾT CHẾT' : 'NẠN NHÂN ĐƯỢC BẢO VỆ'}
          </Text>
          <Text style={[styles.namePlateText, isFallen && styles.namePlateTextDead]} numberOfLines={1}>
            {target?.name || 'Chủ Phòng'}
          </Text>
        </View>

        {/* HUY HIỆU DƯỚI CÙNG: "[Tên người] đã bị phù thủy giết chết" */}
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
            <Text style={styles.badgeTitle}>
              ☠️ {target?.name || 'Người chơi'} đã bị phù thủy giết chết!
            </Text>
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
    backgroundColor: 'rgba(10, 4, 18, 0.95)',
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
    maxWidth: 440,
    marginTop: Platform.OS === 'web' ? 4 : 20,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#C084FC',
  },
  titleEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  titleText: {
    color: '#E9D5FF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.1,
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
    fontSize: 17.5,
    fontWeight: '900',
    color: '#F43F5E',
    letterSpacing: 1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(244, 63, 94, 0.8)',
    textShadowRadius: 10,
  },
  announceSubTitle: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 390,
    lineHeight: 17,
  },

  floatingChantContainer: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  floatingChantText: {
    color: '#D8B4FE',
    fontSize: 14,
    fontWeight: '800',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(192, 132, 252, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  stageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 6,
  },
  avatarCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#38BDF8',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 0 30px rgba(56, 189, 248, 0.7)',
  },
  avatarCircleDead: {
    borderColor: '#DC2626',
    boxShadow: '0 0 35px rgba(220, 38, 38, 0.85)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 88,
  },

  clawOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  clawImg: {
    width: 200,
    height: 200,
  },

  shieldOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  shieldImg: {
    width: 170,
    height: 170,
  },

  potionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  potionImg: {
    width: 150,
    height: 150,
  },

  deadGrayscaleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 25,
  },
  skullEmoji: {
    fontSize: 64,
  },

  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  sparkDot: {
    position: 'absolute',
  },

  namePlate: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.5)',
    minWidth: 180,
  },
  namePlateDead: {
    borderColor: 'rgba(239, 68, 68, 0.7)',
    backgroundColor: 'rgba(20, 10, 15, 0.9)',
  },
  namePlateLabel: {
    fontSize: 9.5,
    color: '#38BDF8',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  namePlateLabelDead: {
    color: '#F87171',
  },
  namePlateText: {
    fontSize: 15,
    color: '#F8FAFC',
    fontWeight: '900',
    marginTop: 2,
  },
  namePlateTextDead: {
    color: '#CBD5E1',
    textDecorationLine: 'line-through',
  },

  badge: {
    marginTop: 10,
    alignItems: 'center',
  },
  badgeInner: {
    backgroundColor: 'rgba(220, 38, 38, 0.35)',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    boxShadow: '0 0 20px rgba(220, 38, 38, 0.7)',
  },
  badgeTitle: {
    color: '#FECACA',
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
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#C084FC',
    boxShadow: '0 4px 15px rgba(124, 58, 237, 0.45)',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.2,
  },
});

