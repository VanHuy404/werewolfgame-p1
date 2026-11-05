// ============================================
// 🎶 MA SÓI - PiedPiperModal Component
// Hoạt ảnh điện ảnh Người Thổi Sáo (Pied Piper) cất tiếng sáo thôi miên
// 1. Cây sáo thần xuất hiện nghiêng lượn sóng
// 2. Tiếng sáo ma mị ngân nga (Web Audio API synth)
// 3. Dải nốt nhạc bay lượn xoay vòng quanh Avatar mục tiêu
// 4. Dòng thoại gõ chữ typewriter màu tím ma mị
// 5. Avatar mục tiêu chuyển sang viền tím dạ quang và nhận huy hiệu "ĐÃ BỊ THÔI MIÊN"
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

const fluteImg = require('../assets/flute.png');

const PIED_PIPER_CHANT = 'Giai điệu cõi mê ngân vang, linh hồn ngươi đã chìm đắm trong tiếng sáo...';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 20 nốt nhạc và bụi sao phát sáng bay tỏa
const NUM_NOTES = 20;
const MUSIC_NOTES = ['🎵', '🎶', '✨', '🪈', '💫', '⭐'];
const FLOATING_NOTES = Array.from({ length: NUM_NOTES }, (_, i) => {
  const angle = (i / NUM_NOTES) * 2 * Math.PI + ((i % 3) * 0.2 - 0.1);
  const dist = 110 + (i % 5) * 28;
  const size = i % 3 === 0 ? 20 : i % 2 === 0 ? 16 : 14;
  return {
    id: i,
    symbol: MUSIC_NOTES[i % MUSIC_NOTES.length],
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist,
    size,
    color: i % 4 === 0 ? '#F0ABFC' : i % 3 === 0 ? '#38BDF8' : i % 2 === 0 ? '#C084FC' : '#E879F9',
  };
});

/**
 * Phát âm thanh tiếng sáo thần thoại ma mị bằng Web Audio API
 */
export function playFluteSynth() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Chuỗi nốt nhạc sáo ngân vang (C5 -> E5 -> G5 -> B5 -> C6 -> E6)
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.16;
      const duration = 0.55;

      osc.type = 'sine'; // Sóng sine cho âm thanh sáo trong trẻo
      osc.frequency.setValueAtTime(freq, startTime);

      // Thêm vibrato nhẹ nhàng
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibrato.frequency.setValueAtTime(5.5, startTime);
      vibratoGain.gain.setValueAtTime(4.0, startTime);
      vibrato.connect(osc.frequency);
      vibrato.start(startTime);
      vibrato.stop(startTime + duration);

      // Fade in & Fade out mềm mại
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.22, startTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (e) {
    console.warn('Lỗi âm thanh sáo:', e);
  }
}

export default function PiedPiperModal({
  visible = false,
  targetPlayer = null,
  targetPlayers = null,
  timeLeft = 8,
  onClose = () => {},
}) {
  const rawList = targetPlayers || (Array.isArray(targetPlayer) ? targetPlayer : targetPlayer ? [targetPlayer] : []);
  const targets = rawList.length > 0 ? rawList : [{ name: 'Người chơi', avatar: '👤', avatarColor: '#38BDF8' }];
  const isDual = targets.length >= 2;
  const target1 = targets[0] || {};
  const target2 = targets[1] || {};

  const [typedChant, setTypedChant] = useState('');

  // Animated values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const fluteTranslateY = useRef(new Animated.Value(-120)).current;
  const fluteScale = useRef(new Animated.Value(0.4)).current;
  const fluteRotate = useRef(new Animated.Value(0)).current;
  const fluteOpacity = useRef(new Animated.Value(0)).current;

  const avatarScale = useRef(new Animated.Value(0.85)).current;
  const auraOpacity = useRef(new Animated.Value(0)).current;
  const notesAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.7)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;

  const resetAnimations = () => {
    backdropAnim.setValue(0);
    fluteTranslateY.setValue(-120);
    fluteScale.setValue(0.4);
    fluteRotate.setValue(0);
    fluteOpacity.setValue(0);

    avatarScale.setValue(0.85);
    auraOpacity.setValue(0);
    notesAnim.setValue(0);
    badgeScale.setValue(0.7);
    badgeOpacity.setValue(0);
    setTypedChant('');
  };

  useEffect(() => {
    if (!visible) {
      resetAnimations();
      return;
    }

    resetAnimations();

    // 1. (0s): Màn đêm tĩnh lặng & Nạn nhân xuất hiện
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
    ]).start();

    // 2. (0.6s): Cây sáo trúc ma thuật lượn sóng bay vào
    const timerFlute = setTimeout(() => {
      playFluteSynth();

      Animated.parallel([
        Animated.timing(fluteOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(fluteScale, { toValue: 1, friction: 5, tension: 45, useNativeDriver: true }),
        Animated.timing(fluteTranslateY, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fluteRotate, { toValue: 1, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    }, 600);

    // 3. (1.4s): Dòng chữ chạy typewriter gõ từng chữ một
    let typingInterval = null;
    const timerChant = setTimeout(() => {
      let index = 0;
      typingInterval = setInterval(() => {
        index++;
        if (index <= PIED_PIPER_CHANT.length) {
          setTypedChant(PIED_PIPER_CHANT.slice(0, index));
        } else {
          clearInterval(typingInterval);
        }
      }, 25);
    }, 1400);

    // 4. (2.2s): Các nốt nhạc thần kỳ bung tỏa xoay quanh Avatar & Hào quang tím tỏa sáng
    const timerNotes = setTimeout(() => {
      Animated.parallel([
        Animated.timing(notesAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(auraOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 4,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2200);

    // Tự động đóng sau khi hoạt ảnh kết thúc (3.4s) + 1.0s = 4.4s (4400ms)
    const timerAutoClose = setTimeout(() => {
      if (onClose) onClose();
    }, 4400);

    return () => {
      clearTimeout(timerFlute);
      clearTimeout(timerChant);
      if (typingInterval) clearInterval(typingInterval);
      clearTimeout(timerNotes);
      clearTimeout(timerAutoClose);
    };
  }, [visible]);

  if (!visible) return null;

  const isCustom1 = target1?.avatar && (target1.avatar.startsWith('http') || target1.avatar.startsWith('file') || target1.avatar.startsWith('data:'));
  const isCustom2 = target2?.avatar && (target2.avatar.startsWith('http') || target2.avatar.startsWith('file') || target2.avatar.startsWith('data:'));

  const fluteSpin = fluteRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-35deg', '-15deg'],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropAnim }]}>
      {/* Top Bar: Tiêu đề */}
      <View style={styles.topBar}>
        <View style={styles.titleBadge}>
          <Text style={styles.titleEmoji}>🎶🪈✨</Text>
          <Text style={styles.titleText}>NGƯỜI THỔI SÁO MÊ HOẶC</Text>
        </View>
      </View>

      {/* Thông điệp sự kiện */}
      <View style={styles.announceHeaderBox}>
        <Text style={styles.announceMainTitle}>
          🎶 TIẾNG SÁO HUYỀN ẢO TRONG MÀN ĐÊM!
        </Text>
        <Text style={styles.announceSubTitle}>
          Giai điệu ma mị len lỏi qua từng khe cửa, mê hoặc tâm trí người vô tội...
        </Text>
      </View>

      {/* CÂU THOẠI CHẠY TYPEWRITER PHÍA TRÊN AVATAR */}
      <View style={styles.floatingChantContainer}>
        {typedChant.length > 0 && (
          <Text style={styles.floatingChantText}>{typedChant}</Text>
        )}
      </View>

      {/* KHU VỰC TRUNG TÂM: CÂY SÁO, AVATAR & NỐT NHẠC */}
      <Animated.View
        style={[
          styles.stageContainer,
          isDual && styles.stageContainerDual,
          {
            transform: [{ scale: avatarScale }],
          },
        ]}
      >
        {/* CÂY SÁO TRÚC MA THUẬT BAY NGHIÊNG */}
        <Animated.View
          style={[
            styles.fluteContainer,
            isDual && styles.fluteContainerDual,
            {
              opacity: fluteOpacity,
              transform: [
                { translateY: fluteTranslateY },
                { scale: fluteScale },
                { rotate: fluteSpin },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Image
            source={fluteImg}
            style={styles.fluteImg}
            resizeMode="contain"
          />
        </Animated.View>

        {isDual ? (
          /* ================= HIỂN THỊ CẢ 2 NGƯỜI BỊ THỔI (DUAL AVATARS) ================= */
          <View style={styles.dualRow}>
            {/* Mục tiêu 1 */}
            <View style={styles.dualCol}>
              <View
                style={[
                  styles.avatarCircleDual,
                  { backgroundColor: target1?.avatarColor || '#38BDF8' },
                ]}
              >
                {isCustom1 ? (
                  <Image
                    source={{ uri: target1.avatar }}
                    style={styles.avatarImgDual}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarEmojiDual}>
                    {target1?.avatar || '👤'}
                  </Text>
                )}
                <View style={styles.musicNoteCornerBadgeDual}>
                  <Text style={{ fontSize: 16 }}>🎶</Text>
                </View>
              </View>
              <View style={styles.namePlateDual}>
                <Text style={styles.namePlateText} numberOfLines={1}>
                  {target1?.name || 'Mục tiêu 1'}
                </Text>
              </View>
            </View>

            {/* Mục tiêu 2 */}
            <View style={styles.dualCol}>
              <View
                style={[
                  styles.avatarCircleDual,
                  { backgroundColor: target2?.avatarColor || '#E11D48' },
                ]}
              >
                {isCustom2 ? (
                  <Image
                    source={{ uri: target2.avatar }}
                    style={styles.avatarImgDual}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarEmojiDual}>
                    {target2?.avatar || '👤'}
                  </Text>
                )}
                <View style={styles.musicNoteCornerBadgeDual}>
                  <Text style={{ fontSize: 16 }}>🎶</Text>
                </View>
              </View>
              <View style={styles.namePlateDual}>
                <Text style={styles.namePlateText} numberOfLines={1}>
                  {target2?.name || 'Mục tiêu 2'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* ================= HIỂN THỊ 1 NGƯỜI BỊ THỔI (SINGLE AVATAR) ================= */
          <>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: target1?.avatarColor || '#38BDF8' },
              ]}
            >
              {isCustom1 ? (
                <Image
                  source={{ uri: target1.avatar }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarEmoji}>
                  {target1?.avatar || '👤'}
                </Text>
              )}
              <View style={styles.musicNoteCornerBadge}>
                <Text style={styles.musicNoteCornerEmoji}>🎶</Text>
              </View>
            </View>

            {/* BẢNG TÊN NẠN NHÂN */}
            <View style={styles.namePlate}>
              <Text style={styles.namePlateLabel}>MỤC TIÊU MÊ HOẶC</Text>
              <Text style={styles.namePlateText} numberOfLines={1}>
                {target1?.name || 'Người chơi'}
              </Text>
            </View>
          </>
        )}

        {/* CÁC NỐT NHẠC PHÁT SÁNG BAY XOAY QUANH AVATAR */}
        <View style={styles.notesContainer} pointerEvents="none">
          {FLOATING_NOTES.map((note) => {
            const noteX = notesAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, note.targetX * (isDual ? 1.4 : 1)],
            });
            const noteY = notesAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, note.targetY],
            });
            const noteOpacity = notesAnim.interpolate({
              inputRange: [0, 0.2, 0.8, 1],
              outputRange: [0, 1, 0.9, 0.1],
            });

            return (
              <Animated.View
                key={`note-${note.id}`}
                style={[
                  styles.noteParticle,
                  {
                    opacity: noteOpacity,
                    transform: [{ translateX: noteX }, { translateY: noteY }],
                  },
                ]}
              >
                <Text style={{ fontSize: note.size, color: note.color }}>
                  {note.symbol}
                </Text>
              </Animated.View>
            );
          })}
        </View>

        {/* HUY HIỆU DƯỚI CÙNG: "[Tên người] đã bị Người Thổi Sáo thôi miên!" */}
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
              {isDual
                ? `🎶 ${target1?.name || 'Mục tiêu 1'} & ${target2?.name || 'Mục tiêu 2'} đã rơi vào bùa mê tiếng sáo!`
                : `🎶 ${target1?.name || 'Mục tiêu'} đã rơi vào bùa mê tiếng sáo!`}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Bottom Bar: Giữ khoảng cách giao diện (Hoạt ảnh tự đóng chạy ngầm) */}
      <View style={styles.bottomBar} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 7, 28, 0.96)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    zIndex: 9999,
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
    backgroundColor: 'rgba(192, 132, 252, 0.25)',
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
    color: '#F0ABFC',
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
    fontSize: 17,
    fontWeight: '900',
    color: '#C084FC',
    letterSpacing: 1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(192, 132, 252, 0.85)',
    textShadowRadius: 12,
  },
  announceSubTitle: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 380,
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
    fontSize: 13.5,
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
    marginVertical: 8,
  },
  stageContainerDual: {
    maxWidth: 480,
    width: '100%',
  },
  dualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    width: '100%',
    zIndex: 2,
    marginVertical: 6,
  },
  dualCol: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 160,
  },
  avatarCircleDual: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: '#C084FC',
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 25px rgba(192, 132, 252, 0.75)' } : {}),
  },
  avatarImgDual: {
    width: '100%',
    height: '100%',
  },
  avatarEmojiDual: {
    fontSize: 58,
  },
  musicNoteCornerBadgeDual: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(88, 28, 135, 0.9)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1.5,
    borderColor: '#C084FC',
  },
  namePlateDual: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(192, 132, 252, 0.6)',
    width: '100%',
    zIndex: 5,
  },

  fluteContainer: {
    position: 'absolute',
    top: -65,
    right: -40,
    width: 170,
    height: 170,
    zIndex: 10,
  },
  fluteContainerDual: {
    top: -60,
    right: '25%',
  },
  fluteImg: {
    width: '100%',
    height: '100%',
    filter: 'drop-shadow(0 0 12px rgba(192, 132, 252, 0.9))',
  },

  avatarCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#C084FC',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 2,
    boxShadow: '0 0 25px rgba(192, 132, 252, 0.65)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 100,
  },

  musicNoteCornerBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(88, 28, 135, 0.85)',
    borderRadius: 20,
    padding: 6,
    borderWidth: 1.5,
    borderColor: '#C084FC',
  },
  musicNoteCornerEmoji: {
    fontSize: 20,
  },

  notesContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 12,
  },
  noteParticle: {
    position: 'absolute',
  },

  namePlate: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(192, 132, 252, 0.6)',
    minWidth: 180,
    zIndex: 5,
  },
  namePlateLabel: {
    fontSize: 9.5,
    color: '#C084FC',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  namePlateText: {
    fontSize: 15,
    color: '#F8FAFC',
    fontWeight: '900',
    marginTop: 2,
  },

  badge: {
    marginTop: 12,
    alignItems: 'center',
    zIndex: 5,
  },
  badgeInner: {
    backgroundColor: 'rgba(88, 28, 135, 0.65)',
    borderWidth: 1.5,
    borderColor: '#C084FC',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    boxShadow: '0 0 16px rgba(192, 132, 252, 0.5)',
  },
  badgeTitle: {
    color: '#F5D0FE',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  bottomBar: {
    width: '100%',
    alignItems: 'center',
    maxWidth: 400,
    marginBottom: Platform.OS === 'web' ? 8 : 20,
  },
  closeBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 13,
    paddingHorizontal: 36,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#C084FC',
    boxShadow: '0 4px 18px rgba(124, 58, 237, 0.5)',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.8,
  },
});
