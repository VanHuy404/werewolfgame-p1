// ============================================
// 💘 MA SÓI - CoupleRevealModal Component
// Hoạt ảnh 2 avatar kết nối trái tim sau khi Cupid chốt người chơi
// - Hiển thị 2 avatar của cặp đôi 2 bên + Vai trò của nhau để tương trợ
// - Nếu 1 trong 2 người là Sói (🐺) -> Avatar biến hình sang Sói kèm dòng cap Tình Yêu Cấm Kỵ
// - Nếu 1 trong 2 người là Phe Thứ 3 (🎶 Người Thổi Sáo) -> Avatar lộ diện Phe Thứ 3 kèm dòng cap Tiếng Sáo Tình Si
// - Trái tim kết nối lấp lánh ở giữa với hiệu ứng đập theo nhịp (Heartbeat)
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
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import PlayerAvatar from './PlayerAvatar';
import { getRoleName, getRoleEmoji } from '../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WOLF_AVATAR_IMG = require('../assets/werewolf.jpg');
const PIED_PIPER_AVATAR_IMG = require('../assets/pied_piper_victory.jpg');

/**
 * Phát âm thanh nhịp đập trái tim qua Web Audio API (thump-thump)
 * Kèm hiệu ứng âm thanh biến hình nếu có Sói hoặc Phe Thứ 3 lộ diện
 */
export function playHeartbeatSynth(hasWolf = false, hasPiedPiper = false) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playThump = (time, freq, gainVal) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(30, time + 0.16);

      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.18);
    };

    const now = ctx.currentTime;
    // Nhịp 1 (Lubb) - Nhịp 2 (Dubb)
    playThump(now, 90, 0.4);
    playThump(now + 0.18, 75, 0.32);

    // Chu kỳ 2 sau 0.75s
    playThump(now + 0.75, 95, 0.45);
    playThump(now + 0.93, 80, 0.35);

    // Tại 1.2s: Âm thanh biến hình Sói gầm nhẹ hoặc Tiếng Sáo ngân vang
    if (hasWolf) {
      const growl = ctx.createOscillator();
      const gGain = ctx.createGain();
      growl.type = 'sawtooth';
      growl.frequency.setValueAtTime(140, now + 1.15);
      growl.frequency.exponentialRampToValueAtTime(55, now + 1.75);
      gGain.gain.setValueAtTime(0.001, now + 1.15);
      gGain.gain.linearRampToValueAtTime(0.22, now + 1.28);
      gGain.gain.exponentialRampToValueAtTime(0.001, now + 1.78);
      growl.connect(gGain);
      gGain.connect(ctx.destination);
      growl.start(now + 1.15);
      growl.stop(now + 1.8);
    } else if (hasPiedPiper) {
      [587.33, 783.99, 987.77].forEach((freq, idx) => {
        const flute = ctx.createOscillator();
        const fGain = ctx.createGain();
        flute.type = 'triangle';
        const t0 = now + 1.15 + idx * 0.14;
        flute.frequency.setValueAtTime(freq, t0);
        fGain.gain.setValueAtTime(0.18, t0);
        fGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.38);
        flute.connect(fGain);
        fGain.connect(ctx.destination);
        flute.start(t0);
        flute.stop(t0 + 0.4);
      });
    }

    setTimeout(() => {
      try { ctx.close(); } catch (e) {}
    }, 2400);
  } catch (err) {}
}

const FLOATING_HEARTS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  emoji: ['💖', '💕', '✨', '💘', '💗', '❤️'][i % 6],
  left: 8 + (i * 7) % 84,
  delay: (i * 240) % 1800,
  size: 16 + (i % 4) * 5,
}));

export default function CoupleRevealModal({
  visible = false,
  couple = [],
  cupid = null,
  isMyCouple = false,
  isMeCupid = false,
  duration = 6,
  onClose = () => {},
}) {
  const { width: windowWidth } = useWindowDimensions();
  const isCompactMobile = windowWidth < 420;
  const [countdown, setCountdown] = useState(duration);
  const [isTransformed, setIsTransformed] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const heartBeatAnim = useRef(new Animated.Value(1)).current;
  const beamAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const morphAnim = useRef(new Animated.Value(0)).current;
  const morphPopAnim = useRef(new Animated.Value(1)).current;
  const roleRevealAnim = useRef(new Animated.Value(0)).current;

  const player1 = couple && couple[0] ? couple[0] : { name: 'Người yêu 1', avatar: '🐱', avatarColor: '#F472B6' };
  const player2 = couple && couple[1] ? couple[1] : { name: 'Người yêu 2', avatar: '🐰', avatarColor: '#FB7185' };

  const isP1Wolf = Boolean(player1?.role === 'wolf');
  const isP2Wolf = Boolean(player2?.role === 'wolf');
  const isP1PiedPiper = Boolean(player1?.role === 'pied_piper');
  const isP2PiedPiper = Boolean(player2?.role === 'pied_piper');

  const hasWolfInCouple = isP1Wolf || isP2Wolf;
  const hasPiedPiperInCouple = isP1PiedPiper || isP2PiedPiper;
  const hasSpecialReveal = hasWolfInCouple || hasPiedPiperInCouple;

  useEffect(() => {
    if (!visible) {
      setCountdown(duration);
      setIsTransformed(false);
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      morphAnim.setValue(0);
      morphPopAnim.setValue(1);
      roleRevealAnim.setValue(0);
      return;
    }

    setCountdown(duration);
    setIsTransformed(false);
    morphAnim.setValue(0);
    morphPopAnim.setValue(1);
    roleRevealAnim.setValue(0);

    playHeartbeatSynth(hasWolfInCouple, hasPiedPiperInCouple);

    // Mở màn (Ban đầu chỉ hiện Avatar + Tên người chơi)
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    let morphTimeout = null;
    let roleTimeout = null;

    if (hasSpecialReveal) {
      // Cặp đôi đặc biệt (Sói / Phe Thứ 3):
      // 1. Sau 1s: Đổi Avatar sang Sói / Phe Thứ 3 trước (kéo dài 500ms)
      morphTimeout = setTimeout(() => {
        setIsTransformed(true);
        Animated.parallel([
          Animated.timing(morphAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(morphPopAnim, {
              toValue: 1.24,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.spring(morphPopAnim, {
              toValue: 1,
              tension: 70,
              friction: 5,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      }, 1000);

      // 2. Sau khi đã đổi Avatar xong (1.55s): Mới hiển thị Role bên dưới tên!
      roleTimeout = setTimeout(() => {
        Animated.spring(roleRevealAnim, {
          toValue: 1,
          tension: 65,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }, 1550);
    } else {
      // Cặp đôi thường: Hiện tên người chơi trước, sau đúng 1s mới lộ diện Role!
      roleTimeout = setTimeout(() => {
        Animated.spring(roleRevealAnim, {
          toValue: 1,
          tension: 65,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }, 1000);
    }

    // Nhịp đập trái tim lặp vô tận (Heartbeat loop)
    const heartBeatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartBeatAnim, { toValue: 1.22, duration: 160, useNativeDriver: true }),
        Animated.timing(heartBeatAnim, { toValue: 0.96, duration: 140, useNativeDriver: true }),
        Animated.timing(heartBeatAnim, { toValue: 1.14, duration: 150, useNativeDriver: true }),
        Animated.timing(heartBeatAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    heartBeatLoop.start();

    // Dải sáng tia tình yêu lấp lánh (Beam pulse)
    const beamLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(beamAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(beamAnim, { toValue: 0.35, duration: 600, useNativeDriver: true }),
      ])
    );
    beamLoop.start();

    // Bong bóng trái tim bay lên
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    floatLoop.start();

    // Đếm ngược
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
      clearInterval(timer);
      if (morphTimeout) clearTimeout(morphTimeout);
      if (roleTimeout) clearTimeout(roleTimeout);
      heartBeatLoop.stop();
      beamLoop.stop();
      floatLoop.stop();
    };
  }, [visible, hasWolfInCouple, hasPiedPiperInCouple]);

  if (!visible) return null;

  // Render Avatar của từng người yêu (Hỗ trợ biến đổi sang ảnh Sói hoặc ảnh Phe Thứ 3)
  const renderLoverAvatar = (player, isWolf, isPiper) => {
    const isSpecial = isWolf || isPiper;
    const specialImg = isWolf ? WOLF_AVATAR_IMG : PIED_PIPER_AVATAR_IMG;

    const baseOpacity = isSpecial
      ? morphAnim.interpolate({
          inputRange: [0, 0.6, 1],
          outputRange: [1, 0.25, 0],
        })
      : 1;

    return (
      <Animated.View
        style={[
          styles.avatarBorderGlow,
          isTransformed && isWolf && styles.avatarBorderWolf,
          isTransformed && isPiper && styles.avatarBorderPiper,
          {
            transform: [
              { scale: isSpecial ? Animated.multiply(heartBeatAnim, morphPopAnim) : heartBeatAnim },
            ],
          },
        ]}
      >
        <View style={styles.avatarInnerWrap}>
          <Animated.View style={{ opacity: baseOpacity }}>
            <PlayerAvatar player={player} compact={true} size="medium" />
          </Animated.View>

          {isSpecial && (
            <Animated.View
              style={[
                styles.specialMorphOverlay,
                { opacity: morphAnim },
              ]}
            >
              <Image
                source={specialImg}
                style={styles.specialMorphImage}
                resizeMode="cover"
              />
              <View
                style={[
                  styles.specialCornerTag,
                  isWolf ? styles.specialCornerTagWolf : styles.specialCornerTagPiper,
                ]}
              >
                <Text style={styles.specialCornerEmoji}>{isWolf ? '🐺' : '🎶'}</Text>
              </View>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    );
  };

  // Nội dung tiêu đề & dòng cap động theo vai trò của Cặp Đôi
  let headerEmoji = '💘 🏹 💘';
  let headerTitle = isMyCouple
    ? 'BẠN ĐÃ TRÚNG MŨI TÊN TÌNH ÁI!'
    : isMeCupid
    ? 'BẮN TÊN TÌNH ÁI THÀNH CÔNG!'
    : 'MŨI TÊN CUPID ĐÃ GẮN KẾT TÌNH YÊU!';
  let headerSubtitle = isMyCouple
    ? 'Hai trái tim hòa làm một — Thấu hiểu vai trò của nhau để tương trợ sống còn!'
    : 'Thần Tình Yêu đã se duyên cho hai linh hồn trong đêm định mệnh!';

  let vowTitle = '💍 LỜI THỀ UYÊN ƯƠNG & TƯƠNG TRỢ';
  let vowCaption = '• Hai bạn nhìn thấy rõ Vai Trò của nhau! Nếu 1 trong 2 người chết, người kia sẽ tự vẫn chết theo vì thất tình.';

  if (isTransformed && hasWolfInCouple && hasPiedPiperInCouple) {
    headerEmoji = '🐺 💘 🎶';
    headerTitle = 'ĐỊNH MỆNH TRÁI NGANG: SÓI & PHE THỨ 3 LỘ DIỆN!';
    headerSubtitle = '“Beauty and The Beast • Your voice has manipulated me.”';
    vowTitle = '🔥🩸 LIÊN MINH TÌNH ÁI ĐẶC BIỆT';
    vowCaption =
      '• Cả Ma Sói và Phe Thứ 3 đều đã lộ diện trước người yêu! Hai bạn phải tương trợ bảo vệ nhau đến hơi thở cuối cùng!';
  } else if (isTransformed && hasWolfInCouple) {
    headerEmoji = '🐺 💘 🌕';
    headerTitle = 'MỐI TÌNH CẤM KỴ: BẢN NĂNG SÓI LỘ DIỆN!';
    headerSubtitle = '“Beauty and The Beast”';
    vowTitle = '🐺🔥 GIAO ƯỚC SÓI & NGƯỜI YÊU';
    vowCaption =
      isP1Wolf && isP2Wolf
        ? '• Hai con Sói chung nhịp đập! Hãy cùng săn mồi và che chở nhau (1 người chết, người kia sẽ tuẫn tình theo).'
        : '• Thân phận Ma Sói đã lộ diện! Hai bạn tạo thành Phe Cặp Đôi riêng biệt — Hãy tương trợ nhau sống sót đến cuối cùng!';
  } else if (isTransformed && hasPiedPiperInCouple) {
    headerEmoji = '🎶 💘 ✨';
    headerTitle = 'TIẾNG SÁO TÌNH SI: PHE THỨ 3 LỘ DIỆN!';
    headerSubtitle = '“Your voice has manipulated me.”';
    vowTitle = '🎶💜 GIAO ƯỚC PHE THỨ 3 & NGƯỜI YÊU';
    vowCaption =
      '• Thân phận Phe Thứ 3 (Người Thổi Sáo) đã lộ diện! Hãy tương trợ che chở cho nhau trước cả Dân Làng lẫn Ma Sói!';
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Bong bóng trái tim bay bổng */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {FLOATING_HEARTS.map((h) => {
            const translateY = floatAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [60, -180],
            });
            const heartOpacity = floatAnim.interpolate({
              inputRange: [0, 0.2, 0.8, 1],
              outputRange: [0, 0.9, 0.7, 0],
            });
            return (
              <Animated.Text
                key={h.id}
                style={[
                  styles.floatingHeart,
                  {
                    left: `${h.left}%`,
                    fontSize: h.size,
                    transform: [{ translateY }],
                    opacity: heartOpacity,
                  },
                ]}
              >
                {h.emoji}
              </Animated.Text>
            );
          })}
        </View>

        {/* Khung chính */}
        <Animated.View
          style={[
            styles.container,
            {
              width: Math.min(windowWidth - 20, 470),
              padding: isCompactMobile ? 14 : 22,
            },
            isTransformed && hasWolfInCouple && styles.containerWolfTheme,
            isTransformed && !hasWolfInCouple && hasPiedPiperInCouple && styles.containerPiperTheme,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Header Cupid Banner */}
          <View style={styles.bannerContainer}>
            <Text style={styles.cupidTitleEmoji}>{headerEmoji}</Text>
            <Text
              style={[
                styles.bannerTitle,
                isCompactMobile && { fontSize: 15 },
                isTransformed && hasWolfInCouple && styles.bannerTitleWolf,
                isTransformed && !hasWolfInCouple && hasPiedPiperInCouple && styles.bannerTitlePiper,
              ]}
            >
              {headerTitle}
            </Text>
            <Text
              style={[
                styles.bannerSubtitle,
                isCompactMobile && { fontSize: 11.5 },
                isTransformed && hasSpecialReveal && styles.bannerSubtitleSpecial,
              ]}
            >
              {headerSubtitle}
            </Text>
          </View>

          {/* SÂN KHẤU KẾT NỐI 2 AVATAR */}
          <View
            style={[
              styles.stageRow,
              isCompactMobile && { paddingVertical: 10, paddingHorizontal: 4 },
              isTransformed && hasWolfInCouple && styles.stageRowWolf,
              isTransformed && !hasWolfInCouple && hasPiedPiperInCouple && styles.stageRowPiper,
            ]}
          >
            {/* Lover 1 */}
            <View style={styles.loverColumn}>
              {renderLoverAvatar(player1, isP1Wolf, isP1PiedPiper)}
              <Text style={styles.loverName} numberOfLines={1}>
                {player1.name}
              </Text>
              {player1.role && (
                <Animated.View
                  style={[
                    styles.roleBadgePill,
                    isCompactMobile && { paddingHorizontal: 6, paddingVertical: 2 },
                    isP1Wolf && styles.roleBadgePillWolf,
                    isP1PiedPiper && styles.roleBadgePillPiper,
                    {
                      opacity: roleRevealAnim,
                      transform: [
                        {
                          scale: roleRevealAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.6, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={[styles.roleBadgeText, isCompactMobile && { fontSize: 9 }]} numberOfLines={1}>
                    {getRoleEmoji(player1.role)} {getRoleName(player1.role).toUpperCase()}
                  </Text>
                </Animated.View>
              )}
            </View>

            {/* Tia liên kết trái tim ở giữa */}
            <View style={[styles.connectorCenter, isCompactMobile && { paddingHorizontal: 2 }]}>
              <Animated.View
                style={[
                  styles.loveBeamLine,
                  isCompactMobile && { width: 16 },
                  isTransformed && hasWolfInCouple && { backgroundColor: '#EF4444' },
                  isTransformed && !hasWolfInCouple && hasPiedPiperInCouple && { backgroundColor: '#C084FC' },
                  { opacity: beamAnim },
                ]}
              />

              <Animated.View
                style={[
                  styles.heartCenterGlow,
                  isCompactMobile && { marginHorizontal: 2, padding: 4 },
                  isTransformed && hasWolfInCouple && { backgroundColor: 'rgba(239, 68, 68, 0.28)' },
                  isTransformed && !hasWolfInCouple && hasPiedPiperInCouple && { backgroundColor: 'rgba(192, 132, 252, 0.28)' },
                  { transform: [{ scale: heartBeatAnim }] },
                ]}
              >
                <Text style={[styles.heartCenterEmoji, isCompactMobile && { fontSize: 22 }]}>
                  {isTransformed && hasWolfInCouple ? '❤️‍🔥' : isTransformed && hasPiedPiperInCouple ? '💜' : '💖'}
                </Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.loveBeamLine,
                  isCompactMobile && { width: 16 },
                  isTransformed && hasWolfInCouple && { backgroundColor: '#EF4444' },
                  isTransformed && !hasWolfInCouple && hasPiedPiperInCouple && { backgroundColor: '#C084FC' },
                  { opacity: beamAnim },
                ]}
              />
            </View>

            {/* Lover 2 */}
            <View style={styles.loverColumn}>
              {renderLoverAvatar(player2, isP2Wolf, isP2PiedPiper)}
              <Text style={styles.loverName} numberOfLines={1}>
                {player2.name}
              </Text>
              {player2.role && (
                <Animated.View
                  style={[
                    styles.roleBadgePill,
                    isCompactMobile && { paddingHorizontal: 6, paddingVertical: 2 },
                    isP2Wolf && styles.roleBadgePillWolf,
                    isP2PiedPiper && styles.roleBadgePillPiper,
                    {
                      opacity: roleRevealAnim,
                      transform: [
                        {
                          scale: roleRevealAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.6, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={[styles.roleBadgeText, isCompactMobile && { fontSize: 9 }]} numberOfLines={1}>
                    {getRoleEmoji(player2.role)} {getRoleName(player2.role).toUpperCase()}
                  </Text>
                </Animated.View>
              )}
            </View>
          </View>

          {/* Khung lưu ý luật Cặp Đôi & Dòng Cap */}
          <View
            style={[
              styles.vowBox,
              isTransformed && hasWolfInCouple && styles.vowBoxWolf,
              isTransformed && !hasWolfInCouple && hasPiedPiperInCouple && styles.vowBoxPiper,
            ]}
          >
            <Text
              style={[
                styles.vowTitle,
                isTransformed && hasWolfInCouple && { color: '#FCA5A5' },
                isTransformed && !hasWolfInCouple && hasPiedPiperInCouple && { color: '#E9D5FF' },
              ]}
            >
              {vowTitle}
            </Text>
            <Text style={styles.vowText}>{vowCaption}</Text>
          </View>

          {/* Nút đếm ngược đóng */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              isTransformed && hasWolfInCouple && styles.actionBtnWolf,
              isTransformed && !hasWolfInCouple && hasPiedPiperInCouple && styles.actionBtnPiper,
            ]}
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text style={styles.actionBtnText}>
              Tiếp tục vào đêm ({countdown}s) ➔
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 7, 26, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  floatingHeart: {
    position: 'absolute',
    bottom: '40%',
  },
  container: {
    width: Math.min(SCREEN_WIDTH - 24, 470),
    backgroundColor: '#1E102F',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#EC4899',
    padding: 22,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 35px rgba(236, 72, 153, 0.55)' }
      : { elevation: 15 }),
  },
  containerWolfTheme: {
    backgroundColor: '#230C16',
    borderColor: '#EF4444',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 42px rgba(239, 68, 68, 0.7)' }
      : {}),
  },
  containerPiperTheme: {
    backgroundColor: '#1C0D33',
    borderColor: '#C084FC',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 42px rgba(192, 132, 252, 0.7)' }
      : {}),
  },
  bannerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cupidTitleEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#F472B6',
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  bannerTitleWolf: {
    color: '#F87171',
  },
  bannerTitlePiper: {
    color: '#D8B4FE',
  },
  bannerSubtitle: {
    fontSize: 12.5,
    color: '#FBCFE8',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 17,
  },
  bannerSubtitleSpecial: {
    fontStyle: 'italic',
    fontWeight: '700',
    color: '#FFF1F2',
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
    marginBottom: 16,
  },
  stageRowWolf: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  stageRowPiper: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderColor: 'rgba(192, 132, 252, 0.45)',
  },
  loverColumn: {
    alignItems: 'center',
    flex: 1,
  },
  avatarBorderGlow: {
    padding: 4,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#F472B6',
    backgroundColor: 'rgba(244, 114, 182, 0.2)',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 20px rgba(244, 114, 182, 0.8)' }
      : {}),
  },
  avatarBorderWolf: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.28)',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 26px rgba(239, 68, 68, 0.95)' }
      : {}),
  },
  avatarBorderPiper: {
    borderColor: '#C084FC',
    backgroundColor: 'rgba(168, 85, 247, 0.28)',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 26px rgba(192, 132, 252, 0.95)' }
      : {}),
  },
  avatarInnerWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  specialMorphOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialMorphImage: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },
  specialCornerTag: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  specialCornerTagWolf: {
    backgroundColor: '#DC2626',
  },
  specialCornerTagPiper: {
    backgroundColor: '#9333EA',
  },
  specialCornerEmoji: {
    fontSize: 11,
  },
  loverName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 120,
  },
  roleBadgePill: {
    backgroundColor: 'rgba(236, 72, 153, 0.35)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#F472B6',
  },
  roleBadgePillWolf: {
    backgroundColor: 'rgba(185, 28, 28, 0.85)',
    borderColor: '#F87171',
  },
  roleBadgePillPiper: {
    backgroundColor: 'rgba(126, 34, 206, 0.85)',
    borderColor: '#D8B4FE',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FDF2F8',
    letterSpacing: 0.4,
  },
  connectorCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  loveBeamLine: {
    width: 26,
    height: 3,
    backgroundColor: '#F472B6',
    borderRadius: 2,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 8px #F472B6' }
      : {}),
  },
  heartCenterGlow: {
    marginHorizontal: 4,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(236, 72, 153, 0.25)',
  },
  heartCenterEmoji: {
    fontSize: 26,
  },
  vowBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 14,
    padding: 12,
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: '#F472B6',
    marginBottom: 16,
  },
  vowBoxWolf: {
    borderLeftColor: '#EF4444',
    backgroundColor: 'rgba(127, 29, 29, 0.25)',
  },
  vowBoxPiper: {
    borderLeftColor: '#C084FC',
    backgroundColor: 'rgba(88, 28, 135, 0.25)',
  },
  vowTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F472B6',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  vowText: {
    fontSize: 11.5,
    color: '#FBCFE8',
    lineHeight: 17,
  },
  actionBtn: {
    backgroundColor: '#EC4899',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 16px rgba(236, 72, 153, 0.6)' }
      : {}),
  },
  actionBtnWolf: {
    backgroundColor: '#DC2626',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 18px rgba(220, 38, 38, 0.65)' }
      : {}),
  },
  actionBtnPiper: {
    backgroundColor: '#9333EA',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 18px rgba(147, 51, 234, 0.65)' }
      : {}),
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
