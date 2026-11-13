// ============================================
// 💔 MA SÓI - CoupleHeartbreakModal Component
// Hoạt ảnh điện ảnh bi tráng khi Người Yêu chết và người còn lại tuẫn tình
// - Hiệu ứng Trái Tim Vỡ Đôi (Shattered Heart) & Vết nứt thủy tinh rực lửa
// - Mảnh vỡ tim pha lê nổ tung văng khắp màn hình
// - Sợi dây liên kết tình ái đứt phụt
// - Nạn nhân tử nạn (Dead Lover) hóa xám & Người yêu tuẫn tiết (Heartbroken Lover) gục ngã
// - Âm thanh tim nứt vỡ rùng mình qua Web Audio API Synth
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
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import PlayerAvatar from './PlayerAvatar';
import { getRoleName, getRoleEmoji } from '../utils/colors';

const glassCrackImg = require('../assets/glass_crack.png');
const WOLF_AVATAR_IMG = require('../assets/werewolf.jpg');
const PIED_PIPER_AVATAR_IMG = require('../assets/pied_piper_victory.jpg');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 36 mảnh vụn trái tim vỡ nổ tung ra các góc 360 độ
const NUM_SHARDS = 36;
const HEART_SHARDS = Array.from({ length: NUM_SHARDS }, (_, i) => {
  const angle = (i / NUM_SHARDS) * 2 * Math.PI + ((i % 5) * 0.15 - 0.3);
  const dist = 90 + (i % 6) * 32 + (i % 3) * 18;
  const size = i % 5 === 0 ? 22 : i % 3 === 0 ? 15 : i % 2 === 0 ? 10 : 6;
  const symbols = ['💔', '🥀', '✨', '🩸', '💥', '碎片'];
  const symbol = symbols[i % (symbols.length - 1)];
  const isEmoji = i % 4 === 0;
  return {
    id: i,
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist + (i % 4) * 25, // hơi chúc xuống do trọng lực
    rot: `${(i * 53) % 360}deg`,
    size,
    isEmoji,
    symbol,
    color: i % 3 === 0 ? '#EF4444' : i % 2 === 0 ? '#F43F5E' : '#FDA4AF',
  };
});

// 16 cánh hoa hồng và giọt lệ u buồn rơi lơ lửng
const FALLING_TEARS = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  emoji: ['🥀', '💔', '🩸', '💧', '✨'][i % 5],
  left: 8 + (i * 5.8) % 84,
  startTop: 10 + (i * 6) % 40,
  size: 16 + (i % 3) * 6,
  duration: 2600 + (i % 4) * 450,
  delay: (i * 140) % 1200,
}));

/**
 * Phát âm thanh tiếng tim nứt vỡ & rơi rụng qua Web Audio Synth
 */
export function playHeartbreakSynth() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // 1. Tiếng đập tim nặng nề nghẹn ngào (heavy low thump)
    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(110, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(32, now + 0.35);
    thumpGain.gain.setValueAtTime(0.7, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    thumpOsc.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.36);

    // 2. Tiếng nứt vỡ sắc bén (Glass crack / sharp snapping noise) sau 0.4s
    const crackTime = now + 0.4;
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1800, crackTime);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9, crackTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, crackTime + 0.25);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(crackTime);

    // 3. Chuỗi âm mảnh vụn rơi rụng leng keng u buồn (shattered shards resonance)
    [980, 1240, 1580, 840, 620].forEach((freq, idx) => {
      const shardOsc = ctx.createOscillator();
      const shardGain = ctx.createGain();
      const st = crackTime + 0.08 + idx * 0.07;
      shardOsc.type = 'triangle';
      shardOsc.frequency.setValueAtTime(freq, st);
      shardOsc.frequency.exponentialRampToValueAtTime(freq * 0.6, st + 0.4);
      shardGain.gain.setValueAtTime(0.35, st);
      shardGain.gain.exponentialRampToValueAtTime(0.001, st + 0.4);
      shardOsc.connect(shardGain);
      shardGain.connect(ctx.destination);
      shardOsc.start(st);
      shardOsc.stop(st + 0.42);
    });

    // 4. Hợp âm bi thương ngân dài (Sad minor low drone)
    const droneOsc = ctx.createOscillator();
    const droneGain = ctx.createGain();
    droneOsc.type = 'sine';
    droneOsc.frequency.setValueAtTime(146.83, crackTime + 0.2); // D3
    droneGain.gain.setValueAtTime(0, crackTime + 0.2);
    droneGain.gain.linearRampToValueAtTime(0.35, crackTime + 0.6);
    droneGain.gain.exponentialRampToValueAtTime(0.001, crackTime + 2.4);
    droneOsc.connect(droneGain);
    droneGain.connect(ctx.destination);
    droneOsc.start(crackTime + 0.2);
    droneOsc.stop(crackTime + 2.5);
  } catch (e) {
    console.warn('AudioContext error in playHeartbreakSynth:', e);
  }
}

export default function CoupleHeartbreakModal({
  visible = false,
  deadPlayer = null,
  heartbrokenPlayer = null,
  reason = 'bị sát hại',
  duration = 6,
  onClose = () => {},
}) {
  const { width: windowWidth } = useWindowDimensions();
  const isCompactMobile = windowWidth < 420;
  const [countdown, setCountdown] = useState(duration);

  // Animations
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const heartScaleAnim = useRef(new Animated.Value(0.6)).current;
  const heartBeatAnim = useRef(new Animated.Value(1)).current;
  const leftHalfOffset = useRef(new Animated.Value(0)).current;
  const rightHalfOffset = useRef(new Animated.Value(0)).current;
  const halfRotAnim = useRef(new Animated.Value(0)).current;
  const crackOpacity = useRef(new Animated.Value(0)).current;
  const shardsAnim = useRef(new Animated.Value(0)).current;
  const beamBreakAnim = useRef(new Animated.Value(1)).current;
  const deadLoverShake = useRef(new Animated.Value(0)).current;
  const heartbrokenShake = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const tearDropAnim = useRef(new Animated.Value(0)).current;

  // Hiệu ứng chuyển avatar sang màu đen xám tro tàn & lộ diện Sói / Phe Thứ 3
  const victimGrayAnim = useRef(new Animated.Value(0)).current;
  const heartbrokenGrayAnim = useRef(new Animated.Value(0)).current;
  const specialMorphAnim = useRef(new Animated.Value(0)).current;
  const capFadeAnim = useRef(new Animated.Value(0)).current;
  const [victimIsGray, setVictimIsGray] = useState(false);
  const [heartbrokenIsGray, setHeartbrokenIsGray] = useState(false);
  const [specialRevealed, setSpecialRevealed] = useState(false);
  const [capVisible, setCapVisible] = useState(false);
  const [typedText, setTypedText] = useState('');

  const HEARTBREAK_CHANT = '"It was my fault, I can\'t even protect you. I\'m so sorry...."';

  // Dữ liệu an toàn
  const victim = deadPlayer || {
    name: 'Nạn Nhân',
    avatar: '🐱',
    avatarColor: '#F472B6',
    reason: reason || 'bị sát hại dã man',
  };
  const heartbroken = heartbrokenPlayer || {
    name: 'Người Yêu',
    avatar: '🐰',
    avatarColor: '#FB7185',
  };

  const isVictimWolf = victim?.role === 'wolf';
  const isHeartbrokenWolf = heartbroken?.role === 'wolf';
  const isVictimPiper = victim?.role === 'pied_piper';
  const isHeartbrokenPiper = heartbroken?.role === 'pied_piper';
  const hasWolfInCouple = isVictimWolf || isHeartbrokenWolf;
  const hasPiperInCouple = isVictimPiper || isHeartbrokenPiper;
  const isSpecialCouple = hasWolfInCouple || hasPiperInCouple;

  useEffect(() => {
    if (!visible) {
      backdropAnim.setValue(0);
      heartScaleAnim.setValue(0.6);
      heartBeatAnim.setValue(1);
      leftHalfOffset.setValue(0);
      rightHalfOffset.setValue(0);
      halfRotAnim.setValue(0);
      crackOpacity.setValue(0);
      shardsAnim.setValue(0);
      beamBreakAnim.setValue(1);
      deadLoverShake.setValue(0);
      heartbrokenShake.setValue(0);
      textFadeAnim.setValue(0);
      tearDropAnim.setValue(0);
      victimGrayAnim.setValue(0);
      heartbrokenGrayAnim.setValue(0);
      specialMorphAnim.setValue(0);
      capFadeAnim.setValue(0);
      setVictimIsGray(false);
      setHeartbrokenIsGray(false);
      setSpecialRevealed(false);
      setCapVisible(false);
      setTypedText('');
      return;
    }

    setCountdown(duration);
    setVictimIsGray(false);
    setHeartbrokenIsGray(false);
    setSpecialRevealed(false);
    setCapVisible(false);
    setTypedText('');
    victimGrayAnim.setValue(0);
    heartbrokenGrayAnim.setValue(0);
    specialMorphAnim.setValue(0);
    capFadeAnim.setValue(0);
    textFadeAnim.setValue(0);

    // BƯỚC 1: Mở màn & Nạn nhân đầu tiên ngã xuống (0s - 0.5s)
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(heartScaleAnim, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
    ]).start();

    // Nhịp tim thoi thóp trước khi vỡ
    Animated.sequence([
      Animated.timing(heartBeatAnim, { toValue: 1.25, duration: 200, useNativeDriver: true }),
      Animated.timing(heartBeatAnim, { toValue: 0.95, duration: 180, useNativeDriver: true }),
      Animated.timing(heartBeatAnim, { toValue: 1.2, duration: 200, useNativeDriver: true }),
      Animated.timing(heartBeatAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    // Rung lắc nạn nhân đầu tiên khi ngã xuống
    Animated.sequence([
      Animated.timing(deadLoverShake, { toValue: 12, duration: 80, useNativeDriver: true }),
      Animated.timing(deadLoverShake, { toValue: -12, duration: 80, useNativeDriver: true }),
      Animated.timing(deadLoverShake, { toValue: 8, duration: 80, useNativeDriver: true }),
      Animated.timing(deadLoverShake, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();

    // Nạn nhân đầu tiên hóa đen xám
    const victimGrayTimer = setTimeout(() => {
      setVictimIsGray(true);
      Animated.timing(victimGrayAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: false,
      }).start();
    }, 150);

    // BƯỚC 2 (Đối với cặp đôi đặc biệt): Hiện Role + Đổi Avatar Sói / Phe Thứ 3 TRƯỚC khi gõ dòng cap!
    let morphTimer = null;
    if (isSpecialCouple) {
      morphTimer = setTimeout(() => {
        setSpecialRevealed(true);
        Animated.timing(specialMorphAnim, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }).start();
      }, 500);
    }

    // BƯỚC 3: GÕ TỪNG CHỮ (TYPEWRITER NHƯ PHÙ THỦY) DÒNG CAP "I'm sorry , I can't protect you. It was my fault...." TRƯỚC KHI NGƯỜI CÒN LẠI CHẾT THEO!
    let typingInterval = null;
    const capDelay = isSpecialCouple ? 1000 : 550;
    const capTimer = setTimeout(() => {
      setCapVisible(true);
      Animated.timing(capFadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      let index = 0;
      typingInterval = setInterval(() => {
        index++;
        if (index <= HEARTBREAK_CHANT.length) {
          setTypedText(HEARTBREAK_CHANT.slice(0, index));
        } else {
          clearInterval(typingInterval);
        }
      }, 24);
    }, capDelay);

    // BƯỚC 4: Sau khi đã gõ xong dòng cap (~1.25s gõ chữ) -> KÍCH HOẠT TIM VỠ & NGƯỜI CÒN LẠI CHẾT THEO (CHUYỂN ĐEN XÁM)
    const breakDelay = isSpecialCouple ? 2350 : 1900;
    const breakTimer = setTimeout(() => {
      playHeartbreakSynth();

      // Hiện vết nứt kính chớp rực đỏ
      Animated.sequence([
        Animated.timing(crackOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(crackOpacity, { toValue: 0.7, duration: 300, useNativeDriver: true }),
      ]).start();

      // 2 nửa trái tim tách rời, vặn xoay và rơi xuống
      Animated.parallel([
        Animated.timing(leftHalfOffset, { toValue: -42, duration: 850, useNativeDriver: true }),
        Animated.timing(rightHalfOffset, { toValue: 42, duration: 850, useNativeDriver: true }),
        Animated.timing(halfRotAnim, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(beamBreakAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(shardsAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
      ]).start();

      // Rung lắc dữ dội người tình còn lại khi thất tình quặn thắt
      Animated.sequence([
        Animated.timing(heartbrokenShake, { toValue: -15, duration: 60, useNativeDriver: true }),
        Animated.timing(heartbrokenShake, { toValue: 15, duration: 60, useNativeDriver: true }),
        Animated.timing(heartbrokenShake, { toValue: -12, duration: 60, useNativeDriver: true }),
        Animated.timing(heartbrokenShake, { toValue: 12, duration: 60, useNativeDriver: true }),
        Animated.timing(heartbrokenShake, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(heartbrokenShake, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(heartbrokenShake, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();

      // Người yêu còn lại bắt đầu rút cạn sinh khí, chuyển sang màu đen xám tro tàn
      setHeartbrokenIsGray(true);
      Animated.timing(heartbrokenGrayAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: false,
      }).start();

      // Hiện chi tiết thông báo tuẫn tình bên dưới dòng cap
      Animated.timing(textFadeAnim, { toValue: 1, duration: 550, useNativeDriver: true }).start();
    }, breakDelay);

    // Hiệu ứng cánh hoa / giọt lệ máu rơi lả tả
    const tearLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tearDropAnim, { toValue: 1, duration: 2800, useNativeDriver: true }),
        Animated.timing(tearDropAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    tearLoop.start();

    // Đếm ngược tự động đóng
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (morphTimer) clearTimeout(morphTimer);
      if (typingInterval) clearInterval(typingInterval);
      clearTimeout(capTimer);
      clearTimeout(victimGrayTimer);
      clearTimeout(breakTimer);
      clearInterval(timer);
      tearLoop.stop();
    };
  }, [visible, hasWolfInCouple, hasPiperInCouple]);

  if (!visible) return null;

  // Góc xoay của 2 nửa trái tim
  const leftRotate = halfRotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-26deg'],
  });
  const rightRotate = halfRotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '26deg'],
  });
  const halfDropY = halfRotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 36],
  });

  // Chuyển màu viền từ Hồng tình ái -> Đen xám tro tàn
  const victimBorderColor = victimGrayAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F472B6', '#475569'],
  });
  const victimBgColor = victimGrayAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(244, 114, 182, 0.25)', 'rgba(30, 41, 59, 0.85)'],
  });
  const victimNameColor = victimGrayAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F1F5F9', '#94A3B8'],
  });

  const heartbrokenBorderColor = heartbrokenGrayAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FB7185', '#475569'],
  });
  const heartbrokenBgColor = heartbrokenGrayAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(251, 113, 133, 0.3)', 'rgba(30, 41, 59, 0.85)'],
  });
  const heartbrokenNameColor = heartbrokenGrayAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFF1F2', '#94A3B8'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Nút đóng / bỏ qua nổi góc trên */}
        <TouchableOpacity style={styles.floatingCloseBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.floatingCloseBtnText}>✕ Đóng ({countdown}s)</Text>
        </TouchableOpacity>

        {/* Các giọt lệ & cánh hoa u buồn rơi từ trên cao */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {FALLING_TEARS.map((t) => {
            const translateY = tearDropAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-40, SCREEN_HEIGHT * 0.75],
            });
            const opacity = tearDropAnim.interpolate({
              inputRange: [0, 0.15, 0.75, 1],
              outputRange: [0, 0.85, 0.7, 0],
            });
            return (
              <Animated.Text
                key={t.id}
                style={[
                  styles.fallingTearItem,
                  {
                    left: `${t.left}%`,
                    top: `${t.startTop}%`,
                    fontSize: t.size,
                    transform: [{ translateY }],
                    opacity,
                  },
                ]}
              >
                {t.emoji}
              </Animated.Text>
            );
          })}
        </View>

        {/* KHUNG NỘI DUNG CHÍNH */}
        <Animated.View
          style={[
            styles.mainContainer,
            isCompactMobile && { padding: 14, maxWidth: windowWidth - 20 },
            { opacity: backdropAnim },
          ]}
        >
          {/* Header Báo Tử Cặp Đôi */}
          <View style={[styles.headerBlock, isCompactMobile && { marginBottom: 10 }]}>
            <Text style={[styles.headerEmojiRow, isCompactMobile && { fontSize: 22 }]}>
              {specialRevealed && hasWolfInCouple
                ? '🐺 💔 🥀'
                : specialRevealed && hasPiperInCouple
                ? '🎶 💔 🥀'
                : '💔 🥀 🖤'}
            </Text>
            <Text style={[styles.headerTitle, isCompactMobile && { fontSize: 15 }]}>
              {specialRevealed && hasWolfInCouple
                ? 'TÌNH YÊU CẤM KỴ TAN VỠ • SÓI LỘ DIỆN!'
                : specialRevealed && hasPiperInCouple
                ? 'KHÚC NHẠC ĐỨT ĐOẠN • PHE THỨ 3 LỘ DIỆN!'
                : 'TRÁI TIM TAN VỠ!'}
            </Text>
            <View style={{ minHeight: 24, justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
              {capVisible ? (
                <Text style={[styles.headerSub, styles.headerSubApology, isCompactMobile && { fontSize: 12 }]}>
                  {typedText}
                </Text>
              ) : (
                <Text style={styles.headerSub}>
                  Một nửa linh hồn đã gục ngã...
                </Text>
              )}
            </View>
          </View>

          {/* SÂN KHẤU TIM VỠ VÀ 2 AVATAR */}
          <View style={[styles.stageBox, isCompactMobile && { paddingVertical: 6 }]}>
            {/* 1. NẠN NHÂN TỬ NẠN (DEAD LOVER) - BÊN TRÁI */}
            <Animated.View
              style={[
                styles.playerColumn,
                { transform: [{ translateX: deadLoverShake }] },
              ]}
            >
              <Animated.View
                style={[
                  styles.avatarFrameWrap,
                  {
                    borderColor: victimBorderColor,
                    backgroundColor: victimBgColor,
                    ...(Platform.OS === 'web'
                      ? {
                          boxShadow: victimIsGray
                            ? '0 0 16px rgba(100, 116, 139, 0.45)'
                            : '0 0 25px rgba(244, 114, 182, 0.7)',
                          filter: victimIsGray
                            ? 'grayscale(100%) contrast(85%) brightness(65%)'
                            : 'grayscale(0%) contrast(100%) brightness(100%)',
                          transition: 'filter 0.8s ease-in-out, box-shadow 0.8s ease-in-out',
                        }
                      : {}),
                  },
                ]}
              >
                <View style={styles.avatarInnerCircle}>
                  {/* Giữ nguyên avatar chính của người chơi (hoặc biến hình sang Sói / Phe Thứ 3) rồi chuyển dần sang đen xám */}
                  <PlayerAvatar
                    player={{
                      ...victim,
                      alive: true,
                    }}
                    compact={true}
                    size="medium"
                  />

                  {(isVictimWolf || isVictimPiper) && (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.specialRoleAvatarOverlay,
                        { opacity: specialMorphAnim },
                      ]}
                    >
                      <Image
                        source={isVictimWolf ? WOLF_AVATAR_IMG : PIED_PIPER_AVATAR_IMG}
                        style={styles.specialRoleAvatarImg}
                        resizeMode="cover"
                      />
                    </Animated.View>
                  )}

                  {/* Lớp phủ đen xám tro tàn chuyển động mượt mà */}
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.grayscaleOverlay,
                      {
                        opacity: victimGrayAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 0.75],
                        }),
                      },
                    ]}
                  />
                </View>

                {/* Dấu vết tử vong đè lên avatar khi đã hóa đen xám */}
                <Animated.View
                  style={[
                    styles.deadSkullOverlay,
                    {
                      opacity: victimGrayAnim,
                      transform: [
                        {
                          scale: victimGrayAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0, 1.35, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                  pointerEvents="none"
                >
                  <Text style={styles.deadSkullText}>💀</Text>
                </Animated.View>
              </Animated.View>

              <Animated.Text
                style={[styles.deadPlayerName, { color: victimNameColor }]}
                numberOfLines={1}
              >
                {victim.name}
              </Animated.Text>

              {victim.role && (
                <Animated.View
                  style={[
                    styles.roleSubBadge,
                    isCompactMobile && { paddingHorizontal: 5, paddingVertical: 1.5 },
                    isVictimWolf && styles.roleSubBadgeWolf,
                    isVictimPiper && styles.roleSubBadgePiper,
                    (isVictimWolf || isVictimPiper) && {
                      opacity: specialMorphAnim,
                      transform: [
                        {
                          scale: specialMorphAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.65, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={[styles.roleSubBadgeText, isCompactMobile && { fontSize: 8.5 }]} numberOfLines={1}>
                    {getRoleEmoji(victim.role)} {getRoleName(victim.role).toUpperCase()}
                  </Text>
                </Animated.View>
              )}

              <Animated.View
                style={[
                  styles.deadBadge,
                  isCompactMobile && { paddingHorizontal: 6, paddingVertical: 2 },
                  {
                    borderColor: victimBorderColor,
                  },
                ]}
              >
                <Text style={[styles.deadBadgeText, isCompactMobile && { fontSize: 9.5 }]} numberOfLines={1}>
                  {isCompactMobile ? 'Tử Nạn 💀' : 'Nạn Nhân Tử Nạn'}
                </Text>
              </Animated.View>
            </Animated.View>

            {/* 2. KHU VỰC TRÁI TIM NỨT VỠ VÀ CÁC MẢNH VỤN - Ở CHÍNH GIỮA */}
            <View style={[styles.centerHeartStage, isCompactMobile && { width: 82, height: 96 }]}>
              {/* Sợi dây tình yêu bị đứt phụt */}
              <Animated.View
                style={[
                  styles.loveBeamLine,
                  isCompactMobile && { width: 88 },
                  {
                    opacity: beamBreakAnim,
                    transform: [{ scaleX: beamBreakAnim }],
                  },
                ]}
              />

              {/* Cụm trái tim vỡ đôi */}
              <Animated.View
                style={[
                  styles.heartContainer,
                  {
                    transform: [
                      { scale: heartScaleAnim },
                      { scale: heartBeatAnim },
                    ],
                  },
                ]}
              >
                {/* Nửa tim bên trái */}
                <Animated.View
                  style={[
                    styles.heartHalfWrap,
                    styles.heartLeftHalf,
                    {
                      transform: [
                        { translateX: leftHalfOffset },
                        { translateY: halfDropY },
                        { rotate: leftRotate },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.heartHalfText}>💔</Text>
                </Animated.View>

                {/* Nửa tim bên phải */}
                <Animated.View
                  style={[
                    styles.heartHalfWrap,
                    styles.heartRightHalf,
                    {
                      transform: [
                        { translateX: rightHalfOffset },
                        { translateY: halfDropY },
                        { rotate: rightRotate },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.heartHalfText}>💔</Text>
                </Animated.View>

                {/* Vết nứt thủy tinh lóe sáng đè lên trái tim */}
                <Animated.Image
                  source={glassCrackImg}
                  style={[
                    styles.glassCrackImage,
                    { opacity: crackOpacity },
                  ]}
                  resizeMode="contain"
                />
              </Animated.View>

              {/* 36 Mảnh vỡ trái tim & tia máu văng nổ tung 360 độ */}
              <View style={styles.shardsContainer} pointerEvents="none">
                {HEART_SHARDS.map((s) => {
                  const transX = shardsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, s.targetX],
                  });
                  const transY = shardsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, s.targetY],
                  });
                  const shardOpacity = shardsAnim.interpolate({
                    inputRange: [0, 0.15, 0.8, 1],
                    outputRange: [0, 1, 0.85, 0],
                  });
                  const shardScale = shardsAnim.interpolate({
                    inputRange: [0, 0.2, 1],
                    outputRange: [0.3, 1.2, 0.6],
                  });

                  return (
                    <Animated.View
                      key={s.id}
                      style={[
                        styles.shardItem,
                        {
                          transform: [
                            { translateX: transX },
                            { translateY: transY },
                            { scale: shardScale },
                          ],
                          opacity: shardOpacity,
                        },
                      ]}
                    >
                      {s.isEmoji ? (
                        <Text style={{ fontSize: s.size }}>{s.symbol}</Text>
                      ) : (
                        <View
                          style={{
                            width: s.size,
                            height: s.size * 0.7,
                            backgroundColor: s.color,
                            borderRadius: 2,
                            transform: [{ rotate: s.rot }],
                            boxShadow: `0 0 8px ${s.color}`,
                          }}
                        />
                      )}
                    </Animated.View>
                  );
                })}
              </View>
            </View>

            {/* 3. NGƯỜI YÊU TUẪN TIẾT VÌ THẤT TÌNH (HEARTBROKEN LOVER) - BÊN PHẢI */}
            <Animated.View
              style={[
                styles.playerColumn,
                { transform: [{ translateX: heartbrokenShake }] },
              ]}
            >
              <Animated.View
                style={[
                  styles.avatarFrameWrap,
                  {
                    borderColor: heartbrokenBorderColor,
                    backgroundColor: heartbrokenBgColor,
                    ...(Platform.OS === 'web'
                      ? {
                          boxShadow: heartbrokenIsGray
                            ? '0 0 16px rgba(100, 116, 139, 0.45)'
                            : '0 0 25px rgba(251, 113, 133, 0.7)',
                          filter: heartbrokenIsGray
                            ? 'grayscale(100%) contrast(85%) brightness(65%)'
                            : 'grayscale(0%) contrast(100%) brightness(100%)',
                          transition: 'filter 1.0s ease-in-out, box-shadow 1.0s ease-in-out',
                        }
                      : {}),
                  },
                ]}
              >
                <View style={styles.avatarInnerCircle}>
                  {/* Giữ nguyên avatar chính của người yêu lúc còn sống (hoặc biến hình sang Sói / Phe Thứ 3), sau đó rút cạn màu */}
                  <PlayerAvatar
                    player={{
                      ...heartbroken,
                      alive: true,
                    }}
                    compact={true}
                    size="medium"
                  />

                  {(isHeartbrokenWolf || isHeartbrokenPiper) && (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.specialRoleAvatarOverlay,
                        { opacity: specialMorphAnim },
                      ]}
                    >
                      <Image
                        source={isHeartbrokenWolf ? WOLF_AVATAR_IMG : PIED_PIPER_AVATAR_IMG}
                        style={styles.specialRoleAvatarImg}
                        resizeMode="cover"
                      />
                    </Animated.View>
                  )}

                  {/* Lớp phủ đen xám tro tàn */}
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.grayscaleOverlay,
                      {
                        opacity: heartbrokenGrayAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 0.75],
                        }),
                      },
                    ]}
                  />
                </View>

                {/* Trái tim vỡ nhấp nháy trên đầu người yêu chết theo */}
                <Animated.View
                  style={[
                    styles.brokenHeartBadge,
                    {
                      opacity: heartbrokenGrayAnim,
                      transform: [
                        {
                          scale: heartbrokenGrayAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0, 1.35, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                  pointerEvents="none"
                >
                  <Text style={styles.brokenHeartBadgeEmoji}>💔</Text>
                </Animated.View>
              </Animated.View>

              <Animated.Text
                style={[styles.heartbrokenPlayerName, { color: heartbrokenNameColor }]}
                numberOfLines={1}
              >
                {heartbroken.name}
              </Animated.Text>

              {heartbroken.role && (
                <Animated.View
                  style={[
                    styles.roleSubBadge,
                    isCompactMobile && { paddingHorizontal: 5, paddingVertical: 1.5 },
                    isHeartbrokenWolf && styles.roleSubBadgeWolf,
                    isHeartbrokenPiper && styles.roleSubBadgePiper,
                    (isHeartbrokenWolf || isHeartbrokenPiper) && {
                      opacity: specialMorphAnim,
                      transform: [
                        {
                          scale: specialMorphAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.65, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={[styles.roleSubBadgeText, isCompactMobile && { fontSize: 8.5 }]} numberOfLines={1}>
                    {getRoleEmoji(heartbroken.role)} {getRoleName(heartbroken.role).toUpperCase()}
                  </Text>
                </Animated.View>
              )}

              <Animated.View
                style={[
                  styles.heartbrokenBadge,
                  isCompactMobile && { paddingHorizontal: 6, paddingVertical: 2 },
                  {
                    borderColor: heartbrokenBorderColor,
                    opacity: heartbrokenGrayAnim,
                  },
                ]}
              >
                <Text style={[styles.heartbrokenBadgeText, isCompactMobile && { fontSize: 9.5 }]} numberOfLines={1}>
                  {isCompactMobile ? 'Chết Theo 💔' : 'Người Tình Chết Theo 💔'}
                </Text>
              </Animated.View>
            </Animated.View>
          </View>

          {/* DÒNG CAP TRĂN TRỐI XUẤT HIỆN TRƯỚC KHI NGƯỜI CÒN LẠI CHẾT THEO */}
          <Animated.View
            style={[
              styles.narrativeBox,
              isCompactMobile && { padding: 10, marginTop: 10 },
              {
                opacity: capFadeAnim,
                transform: [
                  {
                    scale: capFadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.narrativeTitleRow, isCompactMobile && { width: '96%' }]}>
              <View style={styles.narrativeLine} />
              <Text style={[styles.narrativeTitle, isCompactMobile && { fontSize: 10 }]} numberOfLines={1}>
                {hasWolfInCouple
                  ? '🐺 BEAUTY AND THE BEAST'
                  : hasPiperInCouple
                  ? '🎶 KHÚC NHẠC CUỐI CÙNG'
                  : 'LỜI THỀ ĐÃ ỨNG NGHIỆM'}
              </Text>
              <View style={styles.narrativeLine} />
            </View>

            <Text style={[styles.narrativeQuote, isCompactMobile && { fontSize: 13 }]}>
              {typedText}
            </Text>

            <Animated.View style={{ opacity: textFadeAnim, marginTop: 6 }}>
              <Text style={styles.narrativeMainText}>
                <Text style={{ color: '#FCA5A5', fontWeight: 'bold' }}>{victim.name}</Text>{' '}
                đã ngã xuống, khiến trái tim{' '}
                <Text style={{ color: '#F472B6', fontWeight: 'bold' }}>{heartbroken.name}</Text>{' '}
                vỡ vụn và{' '}
                <Text style={{ color: '#FB7185', fontWeight: 'bold' }}>người tình chết theo!</Text>
              </Text>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 3, 14, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  floatingCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 24 : 44,
    right: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 16,
    zIndex: 999,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  floatingCloseBtnText: {
    color: '#FECACA',
    fontSize: 13,
    fontWeight: '700',
  },
  fallingTearItem: {
    position: 'absolute',
    ...(Platform.OS === 'web'
      ? { filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.7))' }
      : {}),
  },
  mainContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'rgba(20, 10, 28, 0.94)',
    borderRadius: 24,
    borderWidth: 1.8,
    borderColor: '#7F1D1D',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 25,
    elevation: 20,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 35px rgba(220, 38, 38, 0.35), inset 0 0 20px rgba(127, 29, 29, 0.4)' }
      : {}),
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerEmojiRow: {
    fontSize: 26,
    marginBottom: 4,
    letterSpacing: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F87171',
    letterSpacing: 0.8,
    textAlign: 'center',
    textShadowColor: 'rgba(239, 68, 68, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSub: {
    fontSize: 12,
    color: '#FDA4AF',
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  headerSubApology: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#2563EB',
    textShadowColor: 'rgba(14, 165, 233, 0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  // SÂN KHẤU
  stageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
  },
  playerColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar khung viền chuyển sắc sang tro tàn
  avatarFrameWrap: {
    position: 'relative',
    padding: 4,
    borderRadius: 50,
    borderWidth: 2.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInnerCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  specialRoleAvatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
    overflow: 'hidden',
  },
  specialRoleAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },
  roleSubBadge: {
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(131, 24, 67, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.6)',
  },
  roleSubBadgeWolf: {
    backgroundColor: 'rgba(127, 29, 29, 0.8)',
    borderColor: '#EF4444',
  },
  roleSubBadgePiper: {
    backgroundColor: 'rgba(88, 28, 135, 0.8)',
    borderColor: '#C084FC',
  },
  roleSubBadgeText: {
    color: '#F8FAFC',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  grayscaleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    borderRadius: 50,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { mixBlendMode: 'color' } : {}),
  },
  deadSkullOverlay: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#450A0A',
    borderRadius: 14,
    width: 26,
    height: 26,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deadSkullText: {
    fontSize: 13,
  },
  deadPlayerName: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  deadBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(127, 29, 29, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deadBadgeText: {
    color: '#FECACA',
    fontSize: 10.5,
    fontWeight: '700',
  },

  // Khu vực tim vỡ (ở giữa)
  centerHeartStage: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  loveBeamLine: {
    position: 'absolute',
    width: 130,
    height: 2.5,
    backgroundColor: '#F43F5E',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  heartContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heartHalfWrap: {
    position: 'absolute',
    width: 50,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heartLeftHalf: {
    left: -2,
  },
  heartRightHalf: {
    right: -2,
  },
  heartHalfText: {
    fontSize: 54,
  },
  glassCrackImage: {
    position: 'absolute',
    width: 86,
    height: 86,
    tintColor: '#EF4444',
  },
  shardsContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shardItem: {
    position: 'absolute',
  },

  // Huy hiệu tim vỡ trên đầu người yêu tuẫn tiết
  brokenHeartBadge: {
    position: 'absolute',
    top: -10,
    right: -8,
    backgroundColor: '#1E050D',
    borderRadius: 14,
    width: 28,
    height: 28,
    borderWidth: 1.5,
    borderColor: '#FB7185',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brokenHeartBadgeEmoji: {
    fontSize: 14,
  },
  heartbrokenPlayerName: {
    color: '#FFF1F2',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  heartbrokenBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(190, 18, 60, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FB7185',
  },
  heartbrokenBadgeText: {
    color: '#FFE4E6',
    fontSize: 10.5,
    fontWeight: '700',
  },

  // BẢNG THÔNG ĐIỆP
  narrativeBox: {
    width: '100%',
    backgroundColor: 'rgba(28, 12, 22, 0.85)',
    borderWidth: 1,
    borderColor: '#991B1B',
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    alignItems: 'center',
  },
  narrativeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginBottom: 6,
  },
  narrativeLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#B91C1C',
    opacity: 0.6,
  },
  narrativeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FCA5A5',
    marginHorizontal: 8,
    letterSpacing: 0.8,
  },
  narrativeMainText: {
    fontSize: 12.5,
    color: '#FEE2E2',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 6,
  },
  narrativeQuote: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#2563EB',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(14, 165, 233, 0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});

