// ============================================
// 🐺🧪☠️ MA SÓI - DualKillClashModal Component
// Hoạt ảnh điện ảnh khi CẢ MA SÓI VÀ PHÙ THỦY CÙNG GIẾT 1 NGƯỜI TRONG ĐÊM
// 1. Avatar nạn nhân xuất hiện ở giữa
// 2. Câu thoại chạy bên trên: "Cả thiện và ác đều nhắm vào ngươi , kẻ phản bội"
// 3. SÓI CÀO TRƯỚC: Vuốt sói chém qua ngực avatar và LƯU LẠI VẾT CÀO trên avatar
// 4. THUỐC ĐỘC NÉM VÀO: Bình thuốc độc bay xoay từ góc vào, vỡ toang rồi BIẾN MẤT, để lại khói & giọt độc tím
// 5. Vết cào sói vẫn in hằn trên ngực nạn nhân
// 6. Avatar chuyển sang đen xám tử nạn kèm huy hiệu: "💀 BỊ CẢ SÓI & PHÙ THỦY TIÊU DIỆT"
// 7. Tự động chuyển tiếp sau khi hoạt ảnh kết thúc đúng 1.0s (tổng 4.3s)
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  Platform,
  Easing,
} from 'react-native';

const wolfClawImg = require('../assets/wolf_claw.png');
const potionPoisonImg = require('../assets/potion_poison.png');

const DUAL_KILL_CHANT = 'Cả thiện và ác đều nhắm vào ngươi , kẻ phản bội';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 12 tia máu khi vuốt sói cào trước
const NUM_BLOOD = 12;
const BLOOD_DROPS = Array.from({ length: NUM_BLOOD }, (_, i) => {
  const angle = (i / NUM_BLOOD) * 2 * Math.PI + 0.15;
  const dist = 70 + (i % 4) * 22;
  return {
    id: i,
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist,
    size: (i % 3 === 0) ? 8 : 5,
    color: '#EF4444',
  };
});

// 24 giọt độc dược tím và hạt nổ khi bình thuốc độc đập vỡ
const NUM_SPARKS = 24;
const DUAL_SPARKS = Array.from({ length: NUM_SPARKS }, (_, i) => {
  const angle = (i / NUM_SPARKS) * 2 * Math.PI + ((i % 3) * 0.15 - 0.08);
  const dist = 125 + (i % 6) * 26;
  const size = (i % 4 === 0) ? 14 : (i % 2 === 0) ? 9 : 6;
  return {
    id: i,
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist,
    size,
    color: i % 4 === 0 ? '#EF4444' : i % 3 === 0 ? '#C084FC' : i % 2 === 0 ? '#DC2626' : '#9333EA',
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
      osc.frequency.exponentialRampToValueAtTime(40, now + 1.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
    } else if (type === 'clawSlash') {
      // 1. Tiếng cào xé vuốt sói dữ dội
      const clawOsc = ctx.createOscillator();
      const clawGain = ctx.createGain();
      clawOsc.type = 'sawtooth';
      clawOsc.frequency.setValueAtTime(900, now);
      clawOsc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
      clawGain.gain.setValueAtTime(0.45, now);
      clawGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      clawOsc.connect(clawGain);
      clawGain.connect(ctx.destination);
      clawOsc.start(now);
      clawOsc.stop(now + 0.3);

      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(130, now);
      subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
      subGain.gain.setValueAtTime(0.35, now);
      subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.35);
    } else if (type === 'potionThrow') {
      // 2. Tiếng ném bình xoay tít trong không khí
      const throwOsc = ctx.createOscillator();
      const throwGain = ctx.createGain();
      throwOsc.type = 'sine';
      throwOsc.frequency.setValueAtTime(320, now);
      throwOsc.frequency.exponentialRampToValueAtTime(580, now + 0.22);
      throwGain.gain.setValueAtTime(0.22, now);
      throwGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      throwOsc.connect(throwGain);
      throwGain.connect(ctx.destination);
      throwOsc.start(now);
      throwOsc.stop(now + 0.22);
    } else if (type === 'poisonBurst') {
      // 3. Tiếng vỡ choang và độc dược nổ bùng
      const breakOsc = ctx.createOscillator();
      const breakGain = ctx.createGain();
      breakOsc.type = 'square';
      breakOsc.frequency.setValueAtTime(1350, now);
      breakOsc.frequency.exponentialRampToValueAtTime(150, now + 0.32);
      breakGain.gain.setValueAtTime(0.45, now);
      breakGain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
      breakOsc.connect(breakGain);
      breakGain.connect(ctx.destination);
      breakOsc.start(now);
      breakOsc.stop(now + 0.32);

      const splashOsc = ctx.createOscillator();
      const splashGain = ctx.createGain();
      splashOsc.type = 'sawtooth';
      splashOsc.frequency.setValueAtTime(580, now);
      splashOsc.frequency.exponentialRampToValueAtTime(65, now + 0.45);
      splashGain.gain.setValueAtTime(0.32, now);
      splashGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      splashOsc.connect(splashGain);
      splashGain.connect(ctx.destination);
      splashOsc.start(now);
      splashOsc.stop(now + 0.45);

      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(110, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.6);
      subGain.gain.setValueAtTime(0.5, now);
      subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.6);
    } else if (type === 'death') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 1.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
    }

    setTimeout(() => {
      try { ctx.close(); } catch (e) {}
    }, 2500);
  } catch (err) {}
}

export default function DualKillClashModal({
  visible = false,
  victimPlayer = null,
  duration = 5,
  timeLeft: propTimeLeft,
  onClose,
}) {
  // 'emerging' -> 'slashed' -> 'poisoned' -> 'fallen'
  const [stage, setStage] = useState('emerging');
  const [typedText, setTypedText] = useState('');
  const [flashColor, setFlashColor] = useState('rgba(220, 38, 38, 0.65)');

  const target = victimPlayer || { name: 'Người Chơi', avatar: '🧑‍🌾', avatarColor: '#EF4444' };

  // Animation values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.4)).current;
  const avatarPulse = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Vuốt sói cào trước (lưu lại vết cào)
  const clawTranslateX = useRef(new Animated.Value(-160)).current;
  const clawTranslateY = useRef(new Animated.Value(-90)).current;
  const clawScale = useRef(new Animated.Value(1.5)).current;
  const clawOpacity = useRef(new Animated.Value(0)).current;
  const bloodAnim = useRef(new Animated.Value(0)).current;

  // Bình thuốc độc ném vào sau (rồi biến mất)
  const potionTranslateX = useRef(new Animated.Value(200)).current;
  const potionTranslateY = useRef(new Animated.Value(-120)).current;
  const potionRotate = useRef(new Animated.Value(0)).current;
  const potionScale = useRef(new Animated.Value(0.4)).current;
  const potionOpacity = useRef(new Animated.Value(0)).current;

  // Hạt độc dược & độc tím nổ bung khi bình thuốc nổ
  const sparkAnim = useRef(new Animated.Value(0)).current;

  // Chuyển hóa đen xám tử nạn
  const grayscaleAnim = useRef(new Animated.Value(0)).current;
  const deathBadgeScale = useRef(new Animated.Value(0.3)).current;
  const deathBadgeOpacity = useRef(new Animated.Value(0)).current;
  const announceOpacity = useRef(new Animated.Value(0)).current;
  const announceTranslateY = useRef(new Animated.Value(20)).current;

  const resetAnimations = () => {
    backdropAnim.setValue(0);
    avatarScale.setValue(0.4);
    avatarPulse.setValue(1);
    shakeAnim.setValue(0);
    flashAnim.setValue(0);

    clawTranslateX.setValue(-160);
    clawTranslateY.setValue(-90);
    clawScale.setValue(1.5);
    clawOpacity.setValue(0);
    bloodAnim.setValue(0);

    potionTranslateX.setValue(200);
    potionTranslateY.setValue(-120);
    potionRotate.setValue(0);
    potionScale.setValue(0.4);
    potionOpacity.setValue(0);

    sparkAnim.setValue(0);
    grayscaleAnim.setValue(0);
    deathBadgeScale.setValue(0.3);
    deathBadgeOpacity.setValue(0);
    announceOpacity.setValue(0);
    announceTranslateY.setValue(20);
    setTypedText('');
    setFlashColor('rgba(220, 38, 38, 0.65)');
  };

  useEffect(() => {
    if (!visible) {
      setStage('emerging');
      resetAnimations();
      return;
    }

    setStage('emerging');
    resetAnimations();

    // 1. GIAI ĐOẠN 1: AVATAR XUẤT HIỆN & CHẠY CHỮ CÂU THOẠI TRÊN ĐẦU (T=0)
    playSynthSound('drone');

    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulse, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(avatarPulse, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    );
    pulseAnim.start();

    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
    ]).start();

    // Gõ câu thoại: "Cả thiện và ác đều nhắm vào ngươi , kẻ phản bội"
    let charIndex = 0;
    const typingInterval = setInterval(() => {
      charIndex++;
      if (charIndex <= DUAL_KILL_CHANT.length) {
        setTypedText(DUAL_KILL_CHANT.slice(0, charIndex));
      } else {
        clearInterval(typingInterval);
      }
    }, 22);

    // 2. GIAI ĐOẠN 2 (T=1100ms): SÓI CÀO TRƯỚC VÀ LƯU LẠI VẾT CÀO
    const timerSlash = setTimeout(() => {
      setStage('slashed');
      setFlashColor('rgba(220, 38, 38, 0.65)');
      playSynthSound('clawSlash');

      // Chớp sáng đỏ
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      // Rung chấn nhẹ khi sói cào
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 12, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
      ]).start();

      // Vuốt Sói chém xé qua ngực Avatar và LƯU LẠI VẾT CÀO
      Animated.parallel([
        Animated.timing(clawOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(clawTranslateX, { toValue: 0, duration: 140, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(clawTranslateY, { toValue: 0, duration: 140, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(clawScale, { toValue: 1.0, friction: 4, tension: 65, useNativeDriver: true }),
        Animated.timing(bloodAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      // clawOpacity được giữ nguyên ở 1.0 -> Lưu lại vết cào trên avatar
    }, 1100);

    // 3. GIAI ĐOẠN 3 (T=1900ms): PHÙ THỦY NÉM THUỐC ĐỘC VÀO
    const timerThrow = setTimeout(() => {
      playSynthSound('potionThrow');

      // Bình thuốc độc xoay tròn bay vụt vào ngực avatar
      Animated.parallel([
        Animated.timing(potionOpacity, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(potionTranslateX, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(potionTranslateY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(potionRotate, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(potionScale, { toValue: 1.15, friction: 4, tension: 60, useNativeDriver: true }),
      ]).start();
    }, 1900);

    // 4. GIAI ĐOẠN 4 (T=2150ms): BÌNH THUỐC ĐỘC VỠ TOANG RỒI BIẾN MẤT (VẾT CÀO VẪN CÒN NGUYÊN)
    const timerPoisonBurst = setTimeout(() => {
      setStage('poisoned');
      setFlashColor('rgba(168, 85, 247, 0.7)');
      playSynthSound('poisonBurst');

      // Chớp sáng tím dữ dội
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();

      // Rung chấn màn hình mạnh
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 18, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -15, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 12, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 5, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
      ]).start();

      // BÌNH THUỐC ĐỘC NỔ VỠ VÀ BIẾN MẤT HOÀN TOÀN
      Animated.parallel([
        Animated.timing(potionOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(potionScale, { toValue: 1.8, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();

      // 24 tia giọt độc dược tím bắn tung tóe bao quanh
      Animated.timing(sparkAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 2150);

    // 5. GIAI ĐOẠN 5 (T=2700ms): TỬ NẠN - AVATAR CHUYỂN ĐEN XÁM & HUY HIỆU DẬP XUỐNG
    const timerDeath = setTimeout(() => {
      setStage('fallen');
      playSynthSound('death');

      Animated.parallel([
        Animated.timing(grayscaleAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(deathBadgeScale, { toValue: 1, friction: 4, tension: 55, useNativeDriver: true }),
        Animated.timing(deathBadgeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(announceOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(announceTranslateY, { toValue: 0, friction: 5, tension: 50, useNativeDriver: true }),
      ]).start();
    }, 2700);

    // 6. GIAI ĐOẠN 6 (T=4300ms): TỰ ĐỘNG CHUYỂN TIẾP (Sau khi kết thúc + đúng 1.0s)
    const timerAutoClose = setTimeout(() => {
      if (onClose) onClose();
    }, 4300);

    return () => {
      pulseAnim.stop();
      clearInterval(typingInterval);
      clearTimeout(timerSlash);
      clearTimeout(timerThrow);
      clearTimeout(timerPoisonBurst);
      clearTimeout(timerDeath);
      clearTimeout(timerAutoClose);
    };
  }, [visible]);

  if (!visible) return null;

  const isFallen = stage === 'fallen';
  const isCustomImage =
    typeof target?.avatar === 'string' &&
    (target.avatar.startsWith('data:') ||
      target.avatar.startsWith('http') ||
      target.avatar.startsWith('blob:') ||
      target.avatar.length > 30);

  const potionSpin = potionRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropAnim }]}>
      {/* Hiệu ứng chớp sáng đỏ (sói cào) rồi tím (thuốc độc nổ) */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: flashAnim,
            backgroundColor: flashColor,
          },
        ]}
        pointerEvents="none"
      />

      {/* Top Bar Header */}
      <View style={styles.topBar}>
        <View style={styles.tagBadge}>
          <Text style={styles.tagBadgeText}>🐺☠️ ĐÒN TRỪNG PHẠT KÉP</Text>
        </View>
        <Text style={styles.topBarHint}>Bị Sát Hại Bởi Cả Thiện & Ác</Text>
      </View>

      {/* TRUNG TÂM SÂN KHẤU */}
      <Animated.View
        style={[
          styles.stageCenter,
          {
            transform: [
              { scale: avatarScale },
              { scale: isFallen ? 1 : avatarPulse },
              { translateX: shakeAnim },
            ],
          },
        ]}
      >
        {/* CÂU THOẠI CHẠY BÊN TRÊN AVATAR (TYPEWRITER) */}
        <View style={styles.floatingChantContainer}>
          {typedText.length > 0 && (
            <Text style={styles.floatingChantText}>
              "{typedText}"
            </Text>
          )}
        </View>

        {/* KHUNG TRÒN AVATAR NẠN NHÂN */}
        <View style={[styles.avatarFrame, isFallen && styles.avatarFrameDead]}>
          {isCustomImage ? (
            <Image
              source={{ uri: target.avatar }}
              style={[styles.avatarImage, isFallen && styles.avatarGrayscale]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.avatarEmojiWrapper,
                { backgroundColor: target.avatarColor || '#DC2626' },
                isFallen && styles.avatarGrayscale,
              ]}
            >
              <Text style={styles.avatarEmoji}>{target.avatar || '🧑‍🌾'}</Text>
            </View>
          )}

          {/* Lớp phủ đen xám khi tử nạn */}
          <Animated.View
            style={[
              styles.fallenMask,
              {
                opacity: grayscaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.78],
                }),
              },
            ]}
          >
            {isFallen && <Text style={styles.deathSkullWatermark}>💀</Text>}
          </Animated.View>

          {/* VẾT CÀO SÓI CÀO TRƯỚC VÀ LƯU LẠI VĨNH VIỄN TRÊN AVATAR */}
          <Animated.View
            style={[
              styles.clawImgWrapper,
              {
                opacity: clawOpacity,
                transform: [
                  { translateX: clawTranslateX },
                  { translateY: clawTranslateY },
                  { scale: clawScale },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <Image source={wolfClawImg} style={styles.clawImage} resizeMode="contain" />
          </Animated.View>
        </View>

        {/* BÌNH THUỐC ĐỘC NÉM VÀO TỪ BÊN PHẢI (VỠ VÀ BIẾN MẤT) */}
        <Animated.View
          style={[
            styles.potionWrap,
            {
              opacity: potionOpacity,
              transform: [
                { translateX: potionTranslateX },
                { translateY: potionTranslateY },
                { rotate: potionSpin },
                { scale: potionScale },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Image source={potionPoisonImg} style={styles.potionImage} resizeMode="contain" />
        </Animated.View>

        {/* CÁC GIỌT MÁU KHI SÓI CÀO */}
        <View style={styles.sparksContainer} pointerEvents="none">
          {BLOOD_DROPS.map((drop) => {
            const dropX = bloodAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, drop.targetX],
            });
            const dropY = bloodAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, drop.targetY],
            });
            const dropOpacity = bloodAnim.interpolate({
              inputRange: [0, 0.15, 0.8, 1],
              outputRange: [0, 1, 0.7, 0],
            });

            return (
              <Animated.View
                key={drop.id}
                style={[
                  styles.sparkDot,
                  {
                    width: drop.size,
                    height: drop.size,
                    borderRadius: drop.size / 2,
                    backgroundColor: drop.color,
                    opacity: dropOpacity,
                    transform: [
                      { translateX: dropX },
                      { translateY: dropY },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* 24 HẠT ĐỘC DƯỢC TÍM BẮN TUNG TÓE KHI BÌNH ĐỘC NỔ BIẾN MẤT */}
        <View style={styles.sparksContainer} pointerEvents="none">
          {DUAL_SPARKS.map((spark) => {
            const dropX = sparkAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, spark.targetX],
            });
            const dropY = sparkAnim.interpolate({
              inputRange: [0, 0.65, 1],
              outputRange: [0, spark.targetY - 15, spark.targetY + 45],
            });
            const dropOpacity = sparkAnim.interpolate({
              inputRange: [0, 0.15, 0.8, 1],
              outputRange: [0, 1, 0.8, 0],
            });
            const dropScale = sparkAnim.interpolate({
              inputRange: [0, 0.25, 1],
              outputRange: [0.3, 1.25, 0.4],
            });

            return (
              <Animated.View
                key={spark.id}
                style={[
                  styles.sparkDot,
                  {
                    width: spark.size,
                    height: spark.size,
                    borderRadius: spark.size / 2,
                    backgroundColor: spark.color,
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

        {/* BẢNG TÊN NẠN NHÂN */}
        <View style={[styles.namePlate, isFallen && styles.namePlateDead]}>
          <Text style={styles.namePlateLabel}>NẠN NHÂN TRỪNG PHẠT</Text>
          <Text style={[styles.namePlateText, isFallen && styles.namePlateTextDead]} numberOfLines={1}>
            {target.name}
          </Text>
        </View>

        {/* HUY HIỆU TỬ NẠN KÉP */}
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
            <Text style={styles.deathBadgeTitle}>💀 BỊ CẢ SÓI & PHÙ THỦY TIÊU DIỆT</Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* DÒNG CHỮ THÔNG BÁO BÊN DƯỚI */}
      <Animated.View
        style={[
          styles.announceBox,
          {
            opacity: announceOpacity,
            transform: [{ translateY: announceTranslateY }],
          },
        ]}
      >
        <Text style={styles.announceText}>
          <Text style={styles.announceHighlight}>{target.name}</Text> đã bị nanh vuốt Ma Sói cào xé và thuốc độc Phù Thủy tiêu diệt cùng lúc!
        </Text>
      </Animated.View>

      {/* Bottom Bar: Giữ khoảng cách giao diện cân đối */}
      <View style={styles.bottomBar} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 4, 12, 0.96)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    zIndex: 99999,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99998,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 540,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  tagBadge: {
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagBadgeText: {
    color: '#FCA5A5',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  topBarHint: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  stageCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 540,
    position: 'relative',
  },
  floatingChantContainer: {
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  floatingChantText: {
    color: '#FCA5A5',
    fontSize: 14.5,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(192, 132, 252, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  avatarFrame: {
    width: 165,
    height: 165,
    borderRadius: 82.5,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#DC2626',
    position: 'relative',
    backgroundColor: '#1E1B4B',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFrameDead: {
    borderColor: '#475569',
    shadowColor: '#9333EA',
    shadowRadius: 18,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEmojiWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 75,
  },
  avatarGrayscale: {
    opacity: 0.35,
  },
  fallenMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
  },
  deathSkullWatermark: {
    fontSize: 65,
    opacity: 0.7,
  },
  clawImgWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  clawImage: {
    width: 175,
    height: 175,
  },
  potionWrap: {
    position: 'absolute',
    width: 110,
    height: 110,
    left: '50%',
    top: 60,
    marginLeft: -55,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 16,
  },
  potionImage: {
    width: 100,
    height: 100,
  },
  sparksContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  sparkDot: {
    position: 'absolute',
  },
  namePlate: {
    marginTop: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(30, 16, 25, 0.9)',
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.6)',
  },
  namePlateDead: {
    backgroundColor: 'rgba(20, 15, 30, 0.95)',
    borderColor: 'rgba(168, 85, 247, 0.7)',
  },
  namePlateLabel: {
    color: '#FCA5A5',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  namePlateText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  namePlateTextDead: {
    color: '#E9D5FF',
  },
  deathBadge: {
    marginTop: 12,
  },
  deathBadgeInner: {
    backgroundColor: '#7F1D1D',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  deathBadgeTitle: {
    color: '#FEF2F2',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  announceBox: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: 'rgba(24, 18, 38, 0.88)',
    borderWidth: 1.2,
    borderColor: 'rgba(168, 85, 247, 0.45)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 14,
  },
  announceText: {
    color: '#E2E8F0',
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  announceHighlight: {
    color: '#F87171',
    fontWeight: '900',
  },
  bottomBar: {
    height: 10,
    width: '100%',
  },
});
