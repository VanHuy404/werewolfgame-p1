// ============================================
// 🔮 MA SÓI - SeerInspectionModal Component
// Hiệu ứng Mắt Thần Tiên Tri soi thấu linh hồn:
// 1. Quả cầu pha lê với Avatar người chơi bên trong
// 2. Hiện nguyên hình: Thiên Thần (Phe Thiện) hoặc Ma Sói (Phe Ác)
// 3. Quả cầu vỡ tung nếu là Sói / Quả cầu Vanish biến mất nếu là Thiện
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
import { COLORS } from '../utils/colors';

// Ảnh Mắt Thiên Thần (Angel Eyes) & Ảnh Ma Sói (Werewolf) & Vết Nứt Kính (Glass Crack)
const angelEyesImg = require('../assets/angel_eyes.jpg');
const werewolfImg = require('../assets/werewolf.jpg');
const glassCrackImg = require('../assets/glass_crack.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Số mảnh vỡ kính khi quả cầu vỡ tung (tăng nhiều lên 42 mảnh vỡ theo yêu cầu)
const NUM_SHARDS = 42;
const SHARDS_DATA = Array.from({ length: NUM_SHARDS }, (_, i) => {
  // Phân bố đều 360 độ kèm độ lệch ngẫu nhiên
  const angle = (i / NUM_SHARDS) * 2 * Math.PI + ((i % 5) * 0.12 - 0.24);
  // Bắn xa ra phía ngoài bán kính 125px của avatar (125px -> 280px)
  const dist = 125 + (i % 6) * 26 + (i % 3) * 14;
  // Kích thước đa dạng: mảnh to, vừa, nhỏ và vụn tia li ti
  const size = (i % 7 === 0) ? 24 : (i % 3 === 0) ? 17 : (i % 2 === 0) ? 11 : 6;
  const isTriangular = i % 2 === 0;
  // Màu sắc đa dạng: trắng tinh thể trong suốt, đỏ phản quang rực lửa, cam tóe sáng
  const shardColor =
    i % 4 === 0
      ? 'rgba(255, 255, 255, 0.95)'
      : i % 3 === 0
      ? 'rgba(254, 202, 202, 0.9)'
      : 'rgba(239, 68, 68, 0.85)';
  return {
    id: i,
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist,
    rot: `${((i * 47) % 360)}deg`,
    size,
    isTriangular,
    shardColor,
  };
});

// Hạt bụi sao thiên thần khi vanish
const NUM_STARDUST = 14;
const STARDUST_DATA = Array.from({ length: NUM_STARDUST }, (_, i) => {
  const angle = (i / NUM_STARDUST) * 2 * Math.PI;
  const dist = 70 + (i % 3) * 30;
  return {
    id: i,
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist - 25,
    delay: i * 40,
    size: 4 + (i % 3) * 3,
  };
});

/**
 * Tạo âm thanh ma thuật bằng Web Audio API an toàn (không lỗi nếu không hỗ trợ)
 */
function playSynthSound(type) {
  try {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    if (type === 'gazing') {
      // Âm thanh ngân vang huyền bí
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(587.33, now + 1.2); // D5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.4);
    } else if (type === 'angel') {
      // Hợp âm thiên thần thánh khiết (C Major chord ngân vang)
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.1, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8 + idx * 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + 2.0);
      });
    } else if (type === 'wolf') {
      // Gầm gừ u ám, âm trầm đe dọa
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(65, now + 0.8);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.0);
    } else if (type === 'shatter') {
      // Tiếng thủy tinh phát nổ vỡ tung (noise + resonant burst)
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1800;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.45);
    } else if (type === 'vanish') {
      // Tiếng tan biến êm dịu bay bổng
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.8);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.0);
    }
  } catch (err) {
    // Không bắt buộc phải phát âm thanh nếu trình duyệt chặn autoplay
  }
}

/**
 * @param {Object} props
 * @param {boolean} props.visible - Modal đang mở hay không
 * @param {Object} props.targetPlayer - { id, name, avatar, avatarColor }
 * @param {string} props.alignment - 'good' | 'evil'
 * @param {number} props.timeLeft - Thời gian đếm ngược còn lại
 * @param {Function} props.onClose - Đóng modal
 */
export default function SeerInspectionModal({
  visible = false,
  targetPlayer = null,
  alignment = 'good',
  timeLeft = 5,
  onClose,
}) {
  // Giai đoạn hiển thị:
  // 1: 'gazing' (avatar mục tiêu trong quả cầu quay xoáy)
  // 2: 'revealing' (hiện mặt thiên thần / sói bên trong)
  // 3: 'climax' (quả cầu vỡ tung nếu ác, hoặc vanish nếu thiện)
  const [stage, setStage] = useState('gazing');

  // Animation Values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const ballScale = useRef(new Animated.Value(0.3)).current;
  const ballFloating = useRef(new Animated.Value(0)).current;
  const auraRotation = useRef(new Animated.Value(0)).current;

  // Hiệu ứng bên trong quả cầu
  const avatarOpacity = useRef(new Animated.Value(1)).current;
  const avatarScale = useRef(new Animated.Value(1)).current;
  const revealFaceOpacity = useRef(new Animated.Value(0)).current;
  const revealFaceScale = useRef(new Animated.Value(0.2)).current;

  // Rung lắc & nứt vỡ (phe Ác / Sói)
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const crackOpacity = useRef(new Animated.Value(0)).current;
  const shardExplosionAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const glassShellOpacity = useRef(new Animated.Value(1)).current;

  // Vanish & bụi sao (phe Thiện)
  const vanishScale = useRef(new Animated.Value(1)).current;
  const vanishOpacity = useRef(new Animated.Value(1)).current;
  const stardustAnim = useRef(new Animated.Value(0)).current;
  const holyRippleAnim = useRef(new Animated.Value(0)).current;

  // Huy hiệu phán quyết cuối cùng
  const badgeScale = useRef(new Animated.Value(0.4)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;

  const isEvil = alignment === 'evil';

  // Floating animation lặp vô tận
  useEffect(() => {
    let loopAnim = null;
    if (visible) {
      loopAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(ballFloating, {
            toValue: -12,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(ballFloating, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      loopAnim.start();

      // Vòng xoay ma pháp
      Animated.loop(
        Animated.timing(auraRotation, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
    return () => {
      if (loopAnim) loopAnim.stop();
    };
  }, [visible]);

  // Luồng kịch bản hoạt ảnh
  useEffect(() => {
    if (!visible) {
      setStage('gazing');
      resetAnimations();
      return;
    }

    setStage('gazing');
    resetAnimations();

    // 1. Quả cầu xuất hiện
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(ballScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(avatarOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    playSynthSound('gazing');

    // 2. Chuyển sang giai đoạn Hiện Nguyên Hình (sau 1.4s)
    const timerReveal = setTimeout(() => {
      setStage('revealing');

      // Ẩn avatar người chơi, mở ra khuôn mặt thực sự
      Animated.parallel([
        Animated.timing(avatarOpacity, { toValue: 0.15, duration: 400, useNativeDriver: true }),
        Animated.timing(avatarScale, { toValue: 0.7, duration: 400, useNativeDriver: true }),
        Animated.timing(revealFaceOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(revealFaceScale, { toValue: 1, friction: 5, tension: 45, useNativeDriver: true }),
      ]).start();

      if (isEvil) {
        playSynthSound('wolf');
        // Rung lắc quả cầu khi phát hiện Sói dữ
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
      } else {
        playSynthSound('angel');
      }
    }, 1400);

    // 3. Giai đoạn CLIMAX: Vỡ tung (Sói) hoặc Vanish (Thiện) sau 2.6s
    const timerClimax = setTimeout(() => {
      setStage('climax');

      if (isEvil) {
        // --- HIỆU ỨNG QUẢ CẦU VỠ TUNG (SHATTER) CHO PHE ÁC ---
        // Vết nứt xuất hiện trong chớp mắt
        crackOpacity.setValue(1);

        setTimeout(() => {
          playSynthSound('shatter');

          // Flash đỏ & Màn hình rung
          Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
          ]).start();

          // Các mảnh vỡ kính bắn tung tóe tứ phía ĐẰNG SAU vị trí quả cầu
          Animated.parallel([
            Animated.timing(shardExplosionAnim, {
              toValue: 1,
              duration: 750,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            // Toàn bộ quả cầu VÀ hình ảnh ma sói vỡ nát biến mất hoàn toàn khi kính vỡ
            Animated.timing(vanishOpacity, {
              toValue: 0,
              duration: 160,
              useNativeDriver: true,
            }),
            // Huy hiệu Ác nổ ra mạnh mẽ
            Animated.spring(badgeScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
            Animated.timing(badgeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          ]).start();
        }, 180);

      } else {
        // --- HIỆU ỨNG VANISH BIẾN MẤT CHO PHE THIỆN ---
        playSynthSound('vanish');

        Animated.parallel([
          // Vòng sáng thánh quang lan tỏa
          Animated.timing(holyRippleAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          // Quả cầu nở to nhẹ rồi tan biến êm dịu
          Animated.timing(vanishScale, {
            toValue: 1.35,
            duration: 800,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(vanishOpacity, {
            toValue: 0,
            duration: 750,
            useNativeDriver: true,
          }),
          // Bụi sao bay lượn tan biến
          Animated.timing(stardustAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
          // Huy hiệu Thiện hiện lên hiền hòa
          Animated.spring(badgeScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
          Animated.timing(badgeOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]).start();
      }
    }, 2600);

    return () => {
      clearTimeout(timerReveal);
      clearTimeout(timerClimax);
    };
  }, [visible, alignment]);

  const resetAnimations = () => {
    backdropAnim.setValue(0);
    ballScale.setValue(0.3);
    avatarOpacity.setValue(1);
    avatarScale.setValue(1);
    revealFaceOpacity.setValue(0);
    revealFaceScale.setValue(0.2);
    shakeAnim.setValue(0);
    crackOpacity.setValue(0);
    shardExplosionAnim.setValue(0);
    flashAnim.setValue(0);
    glassShellOpacity.setValue(1);
    vanishScale.setValue(1);
    vanishOpacity.setValue(1);
    stardustAnim.setValue(0);
    holyRippleAnim.setValue(0);
    badgeScale.setValue(0.4);
    badgeOpacity.setValue(0);
  };

  if (!visible) return null;

  const spinAura = auraRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const reverseSpinAura = auraRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const isCustomImage =
    typeof targetPlayer?.avatar === 'string' &&
    (targetPlayer.avatar.startsWith('data:') ||
      targetPlayer.avatar.startsWith('http') ||
      targetPlayer.avatar.startsWith('blob:') ||
      targetPlayer.avatar.length > 30);

  // Màu sắc 2 quả cầu thiện ác giống hệt nhau ở giai đoạn 'gazing' (soi thấu tâm can)
  // Chỉ thay đổi màu viền sau khi biết được thiện hay ác ('revealing' / 'climax')
  const isRevealed = stage !== 'gazing';

  const ballBorderColor = !isRevealed
    ? 'rgba(216, 180, 254, 0.85)'
    : isEvil
    ? 'rgba(239, 68, 68, 0.95)'
    : 'rgba(253, 224, 71, 0.95)';

  const ballShadowColor = !isRevealed
    ? '#C084FC'
    : isEvil
    ? '#EF4444'
    : '#FDE047';

  const arcaneOuterColor = !isRevealed
    ? 'rgba(192, 132, 252, 0.4)'
    : isEvil
    ? 'rgba(239, 68, 68, 0.5)'
    : 'rgba(253, 224, 71, 0.5)';

  const arcaneInnerColor = !isRevealed
    ? 'rgba(147, 197, 253, 0.4)'
    : isEvil
    ? 'rgba(220, 38, 38, 0.5)'
    : 'rgba(96, 165, 250, 0.5)';

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropAnim }]}>
      {/* Hiệu ứng chớp đỏ khi vỡ quả cầu phe Ác */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: flashAnim,
            backgroundColor: isEvil ? 'rgba(239, 68, 68, 0.45)' : 'transparent',
          },
        ]}
        pointerEvents="none"
      />

      {/* Header trạng thái */}
      <View style={styles.topBar}>
        <View style={styles.titleBadge}>
          <Text style={styles.titleEmoji}>🔮</Text>
          <Text style={styles.titleText}>MẮT THẦN TIÊN TRI</Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>⏳ {Math.max(0, timeLeft)}s</Text>
        </View>
      </View>

      {/* Tiêu đề trạng thái soi */}
      <View style={styles.targetInfoBox}>
        <Text style={styles.targetLabel}>🔮 MẮT THẦN SOI THẤU TÂM CAN</Text>
      </View>

      {/* KHU VỰC TRUNG TÂM: QUẢ CẦU PHA LÊ & HIỆU ỨNG */}
      <Animated.View
        style={[
          styles.stageContainer,
          {
            transform: [
              { translateY: ballFloating },
              { translateX: shakeAnim },
              { scale: ballScale },
            ],
          },
        ]}
      >
        {/* Vòng ma pháp xoay tròn ngoài quả cầu */}
        <Animated.View
          style={[
            styles.arcaneRingOuter,
            {
              transform: [{ rotate: spinAura }],
              borderColor: arcaneOuterColor,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.arcaneRingInner,
            {
              transform: [{ rotate: reverseSpinAura }],
              borderColor: arcaneInnerColor,
            },
          ]}
        />

        {/* --- CÁC MẢNH VỠ KÍNH BẮN TUNG TÓE ĐẰNG SAU AVATAR (PHE ÁC) --- */}
        {isEvil && (
          <View style={styles.shardsContainer} pointerEvents="none">
            {SHARDS_DATA.map((shard) => {
              const shardX = shardExplosionAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, shard.targetX],
              });
              const shardY = shardExplosionAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, shard.targetY],
              });
              const shardOpacity = shardExplosionAnim.interpolate({
                inputRange: [0, 0.08, 0.75, 1],
                outputRange: [0, 1, 0.85, 0],
              });
              const shardScale = shardExplosionAnim.interpolate({
                inputRange: [0, 0.35, 1],
                outputRange: [0.5, 1.35, 0.3],
              });

              return (
                <Animated.View
                  key={shard.id}
                  style={[
                    styles.glassShard,
                    {
                      width: shard.size,
                      height: shard.isTriangular ? shard.size * 1.5 : shard.size,
                      backgroundColor: shard.shardColor,
                      transform: [
                        { translateX: shardX },
                        { translateY: shardY },
                        { rotate: shard.rot },
                        { scale: shardScale },
                      ],
                      opacity: shardOpacity,
                    },
                  ]}
                />
              );
            })}
          </View>
        )}

        {/* ================= QUẢ CẦU PHA LÊ & AVATAR CHÍNH ================= */}
        <Animated.View
          style={[
            styles.crystalBall,
            {
              transform: [{ scale: isEvil ? 1 : vanishScale }],
              opacity: vanishOpacity,
              borderColor: ballBorderColor,
              shadowColor: ballShadowColor,
            },
          ]}
        >
          {/* Lớp sương mù ma thuật bên trong quả cầu (màu sắc 2 quả cầu giống nhau) */}
          <View
            style={[
              styles.innerMist,
              {
                backgroundColor: 'rgba(79, 70, 229, 0.45)',
              },
            ]}
          />

          {/* 1. AVATAR MỤC TIÊU (To bằng trọn vẹn quả cầu thủy tinh) */}
          <Animated.View
            style={[
              styles.insideAvatarContainer,
              {
                opacity: avatarOpacity,
                transform: [{ scale: avatarScale }],
              },
            ]}
          >
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: targetPlayer?.avatarColor || '#38BDF8' },
              ]}
            >
              {isCustomImage ? (
                <Image
                  source={{ uri: targetPlayer.avatar }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarEmoji}>
                  {targetPlayer?.avatar || '👤'}
                </Text>
              )}
            </View>
          </Animated.View>

          {/* 2. MẶT HIỆN NGUYÊN HÌNH (To bằng trọn vẹn quả cầu thủy tinh) */}
          <Animated.View
            style={[
              styles.revealEntityContainer,
              {
                opacity: revealFaceOpacity,
                transform: [{ scale: revealFaceScale }],
              },
            ]}
          >
            {isEvil ? (
              // --- MẶT MA SÓI HUNG HÃN (PHE ÁC) DÙNG ẢNH MỚI ---
              <View style={styles.wolfEntityBox}>
                <View style={styles.wolfImageGlowWrapper}>
                  <Image
                    source={werewolfImg}
                    style={styles.wolfImage}
                    resizeMode="cover"
                  />
                  <View style={styles.wolfBorderGlow} />
                </View>
                <View style={styles.entityTitleBadgeEvil}>
                  <Text style={styles.wolfEntityTitle}>PHE ÁC</Text>
                </View>
              </View>
            ) : (
              // --- MẮT THIÊN THẦN THÁNH KHIẾT (ANGEL EYES - PHE THIỆN) ---
              <View style={styles.angelEntityBox}>
                <View style={styles.angelEyesGlowWrapper}>
                  <Image
                    source={angelEyesImg}
                    style={styles.angelEyesImage}
                    resizeMode="cover"
                  />
                  <View style={styles.angelEyesBorderGlow} />
                </View>
                <View style={styles.entityTitleBadge}>
                  <Text style={styles.angelEntityTitle}>PHE THIỆN</Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Lớp vỏ kính & phản quang 3D (sẽ vỡ tan biến nếu là Phe Ác) */}
          <Animated.View
            style={[
              styles.glassShellOverlay,
              {
                opacity: isEvil ? glassShellOpacity : 1,
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.glassHighlightTop} />
            <View style={styles.glassHighlightSide} />

            {/* Vết nứt kính khi quả cầu sắp vỡ tung (Phe Ác) - Ảnh texture kính nứt thực tế */}
            {isEvil && (
              <Animated.View
                style={[styles.crackPatternContainer, { opacity: crackOpacity }]}
                pointerEvents="none"
              >
                <Image
                  source={glassCrackImg}
                  style={styles.glassCrackImage}
                  resizeMode="contain"
                />
              </Animated.View>
            )}
          </Animated.View>
        </Animated.View>

        {/* --- SÓNG THÁNH QUANG & BỤI SAO KHI QUẢ CẦU VANISH (PHE THIỆN) --- */}
        {!isEvil && (
          <View style={styles.vanishEffectsContainer} pointerEvents="none">
            {/* Vòng hào quang bung tỏa */}
            <Animated.View
              style={[
                styles.holyRippleCircle,
                {
                  transform: [
                    {
                      scale: holyRippleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.6, 2.2],
                      }),
                    },
                  ],
                  opacity: holyRippleAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.9, 0.5, 0],
                  }),
                },
              ]}
            />

            {/* Các hạt bụi sao bay lên */}
            {STARDUST_DATA.map((star) => {
              const starX = stardustAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, star.x * 1.5],
              });
              const starY = stardustAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, star.y * 1.8],
              });
              const starOpacity = stardustAnim.interpolate({
                inputRange: [0, 0.4, 1],
                outputRange: [0, 1, 0],
              });

              return (
                <Animated.View
                  key={star.id}
                  style={[
                    styles.stardustParticle,
                    {
                      width: star.size,
                      height: star.size,
                      borderRadius: star.size / 2,
                      transform: [{ translateX: starX }, { translateY: starY }],
                      opacity: starOpacity,
                    },
                  ]}
                />
              );
            })}
          </View>
        )}

        {/* Chân đế quả cầu mạ vàng & Bảng tên mục tiêu */}
        <Animated.View
          style={[styles.crystalPedestal, { opacity: vanishOpacity }]}
        >
          {/* Tên người chơi nằm ngay trên đế quả cầu */}
          <View style={styles.pedestalNamePlate}>
            <Text style={styles.pedestalNameText} numberOfLines={1}>
              {targetPlayer?.name || 'Mục tiêu'}
            </Text>
          </View>
          <View style={styles.pedestalTop} />
          <View style={styles.pedestalBase} />
        </Animated.View>
      </Animated.View>

      {/* ================= HUY HIỆU PHÁN QUYẾT BÊN DƯỚI ================= */}
      <View style={styles.bottomVerdictArea}>
        {stage === 'gazing' ? (
          <View style={styles.gazingStatusBox}>
            <Text style={styles.gazingStatusIcon}>🌀</Text>
            <Text style={styles.gazingStatusText}>
              Đang nhìn thấu linh hồn...
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.verdictCard,
              isEvil ? styles.verdictCardEvil : styles.verdictCardGood,
              {
                transform: [{ scale: badgeScale }],
                opacity: badgeOpacity,
              },
            ]}
          >
            <View style={styles.verdictHeaderRow}>
              <Text style={styles.verdictMainIcon}>{isEvil ? '🐺' : '🕊️'}</Text>
              <View style={styles.verdictTextCol}>
                <Text
                  style={[
                    styles.verdictTitle,
                    { color: isEvil ? '#F87171' : '#34D399' },
                  ]}
                >
                  {isEvil ? 'PHE ÁC' : 'PHE THIỆN'}
                </Text>
                <Text style={styles.verdictSubtitle}>
                  {isEvil
                    ? 'Quả cầu vỡ nát trước tà khí Ma Sói!'
                    : 'Quả cầu tan biến trong ánh sáng thánh thiện!'}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Nút đóng / xác nhận xem xong */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={styles.closeBtnText}>ĐÃ HIỂU ({Math.max(0, timeLeft)}s)</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.94)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
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
    backgroundColor: 'rgba(88, 28, 135, 0.45)',
    borderColor: '#A855F7',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    shadowColor: '#A855F7',
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  titleEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  titleText: {
    color: '#E9D5FF',
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
    color: '#FCA5A5',
    fontWeight: '800',
    fontSize: 13,
  },
  targetInfoBox: {
    alignItems: 'center',
    marginTop: 5,
    zIndex: 10,
  },
  targetLabel: {
    color: '#94A3B8',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 4,
  },
  targetNameText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: 'rgba(168, 85, 247, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },

  // Sân khấu trung tâm
  stageContainer: {
    width: 325,
    height: 325,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 'auto',
  },

  // Vòng ma pháp
  arcaneRingOuter: {
    position: 'absolute',
    width: 338,
    height: 338,
    borderRadius: 169,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  arcaneRingInner: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1.5,
    borderStyle: 'dotted',
  },

  // Quả cầu pha lê (Đã phóng to +30%)
  crystalBall: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 3.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 36,
    zIndex: 8, // Avatar và entity nằm ở layer trên mảnh vỡ
  },
  glassShellOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 125,
    zIndex: 10,
  },
  innerMist: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 125,
  },
  glassHighlightTop: {
    position: 'absolute',
    top: 18,
    left: 34,
    width: 78,
    height: 45,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    transform: [{ rotate: '-35deg' }],
    zIndex: 10,
  },
  glassHighlightSide: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 40,
    height: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    transform: [{ rotate: '45deg' }],
    zIndex: 10,
  },

  // Avatar người chơi bên trong quả cầu
  insideAvatarContainer: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 5,
  },
  avatarCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  avatarEmoji: {
    fontSize: 125,
  },

  // Hiện nguyên hình (Thiên Thần / Ma Sói)
  revealEntityContainer: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 6,
  },

  // Sói (Dùng ảnh werewolf.jpg)
  wolfEntityBox: {
    width: 250,
    height: 250,
    borderRadius: 125,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  wolfImageGlowWrapper: {
    width: 250,
    height: 250,
    borderRadius: 125,
    overflow: 'hidden',
    backgroundColor: '#09090B',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  wolfImage: {
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  wolfBorderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 125,
    borderWidth: 3,
    borderColor: 'rgba(239, 68, 68, 0.85)',
  },
  entityTitleBadgeEvil: {
    position: 'absolute',
    bottom: 14,
    backgroundColor: 'rgba(69, 10, 10, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.65)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 3,
    zIndex: 10,
    shadowColor: '#EF4444',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  wolfEntityTitle: {
    color: '#FCA5A5',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 2,
    textShadowColor: 'rgba(239, 68, 68, 0.9)',
    textShadowRadius: 8,
  },

  // Thiên Thần
  angelEntityBox: {
    width: 250,
    height: 250,
    borderRadius: 125,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  angelEyesGlowWrapper: {
    width: 250,
    height: 250,
    borderRadius: 125,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  angelEyesImage: {
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  angelEyesBorderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 125,
    borderWidth: 3,
    borderColor: 'rgba(253, 224, 71, 0.75)',
  },
  entityTitleBadge: {
    position: 'absolute',
    bottom: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 3,
    zIndex: 10,
  },
  angelEntityTitle: {
    color: '#FEF08A',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 2,
    textShadowColor: 'rgba(253, 224, 71, 0.9)',
    textShadowRadius: 8,
  },

  // Vết nứt kính (Ảnh texture kính nứt thực tế)
  crackPatternContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 12,
  },
  glassCrackImage: {
    width: 250,
    height: 250,
  },

  // Mảnh vỡ kính khi nổ (Nằm đằng sau avatar)
  shardsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3, // Nằm đằng sau avatar (avatar có zIndex 8)
  },
  glassShard: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    shadowColor: '#EF4444',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    borderRadius: 2,
  },

  // Hiệu ứng Vanish (Thiên Thần)
  vanishEffectsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  holyRippleCircle: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 3.5,
    borderColor: '#FDE047',
    shadowColor: '#FDE047',
    shadowOpacity: 0.95,
    shadowRadius: 26,
    backgroundColor: 'rgba(253, 224, 71, 0.12)',
  },
  stardustParticle: {
    position: 'absolute',
    backgroundColor: '#FEF08A',
    shadowColor: '#FDE047',
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  // Chân đế quả cầu
  crystalPedestal: {
    position: 'absolute',
    bottom: -36,
    alignItems: 'center',
    zIndex: 15,
  },
  pedestalNamePlate: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1.8,
    borderColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 3,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 6,
    maxWidth: 240,
  },
  pedestalNameText: {
    color: '#FEF08A',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(245, 158, 11, 0.8)',
    textShadowRadius: 6,
  },
  pedestalTop: {
    width: 90,
    height: 14,
    backgroundColor: '#D97706',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1.2,
    borderColor: '#FDE68A',
  },
  pedestalBase: {
    width: 140,
    height: 18,
    backgroundColor: '#92400E',
    borderRadius: 5,
    borderWidth: 1.2,
    borderColor: '#F59E0B',
  },

  // Khu vực phán quyết phía dưới
  bottomVerdictArea: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    zIndex: 15,
  },
  gazingStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    marginBottom: 20,
  },
  gazingStatusIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  gazingStatusText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
  },
  verdictCard: {
    width: '100%',
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    marginBottom: 16,
    shadowOpacity: 0.7,
    shadowRadius: 20,
  },
  verdictCardEvil: {
    backgroundColor: 'rgba(69, 10, 10, 0.85)',
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  verdictCardGood: {
    backgroundColor: 'rgba(6, 78, 59, 0.85)',
    borderColor: '#10B981',
    shadowColor: '#10B981',
  },
  verdictHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verdictMainIcon: {
    fontSize: 44,
    marginRight: 14,
  },
  verdictTextCol: {
    flex: 1,
  },
  verdictTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  verdictSubtitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 16,
  },
  closeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 22,
  },
  closeBtnText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
  },
});
