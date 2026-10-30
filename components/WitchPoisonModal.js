// ============================================
// ☠️ MA SÓI - WitchPoisonModal Component
// Hiệu ứng điện ảnh buổi sáng khi Phù Thủy ném Bình Thuốc Độc tiêu diệt mục tiêu:
// 1. Avatar nạn nhân xuất hiện
// 2. Câu thoại màu tím/đỏ hiện lên: "Hãy nhắm mắt đi , ngươi đã làm phiền mọi người đủ rồi"
// 3. Bình Thuốc Độc đỏ phóng ra ném trúng Avatar vỡ tung tóe
// 4. Làn khói độc bùng nổ, Avatar chuyển sang màu đỏ rực nhiễm độc rồi phủ mờ đen xám tử nạn
// 5. Huy hiệu: "☠️ ĐÃ BỊ TRÚNG ĐỘC TỬ VONG"
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

const potionPoisonImg = require('../assets/potion_poison.png');
const shieldImg = require('../assets/shield.png');

const POISON_CHANT_NORMAL = 'Hãy nhắm mắt đi , ngươi đã làm phiền mọi người đủ rồi';
const POISON_CHANT_SHIELD_CLASH = 'Một người muốn cứu một người muốn giết, thảm hại thật';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 24 giọt độc dược bắn tung tóe
const NUM_POISON_DROPS = 24;
const POISON_DROPS = Array.from({ length: NUM_POISON_DROPS }, (_, i) => {
  const angle = (i / NUM_POISON_DROPS) * 2 * Math.PI + ((i % 3) * 0.2 - 0.1);
  const dist = 120 + (i % 6) * 26;
  const size = (i % 4 === 0) ? 14 : (i % 2 === 0) ? 9 : 6;
  return {
    id: i,
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist,
    size,
    color: i % 4 === 0 ? '#DC2626' : i % 3 === 0 ? '#991B1B' : i % 2 === 0 ? '#C084FC' : '#EF4444',
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
      osc.frequency.setValueAtTime(55, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 1.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
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
      // Tiếng vỡ bình thủy tinh độc dược
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
      subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.6);
      subGain.gain.setValueAtTime(0.6, now);
      subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.6);
    } else if (type === 'deathBell') {
      // Tiếng chuông tử thần âm vang u ám
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 1.6);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.6);
    } else if (type === 'metalClank') {
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
    }
  } catch (err) {}
}

export default function WitchPoisonModal({
  visible = false,
  victimPlayer = null,
  poisonedPlayer = null,
  isShieldClash = false,
  onClose,
  timeLeft = 8,
}) {
  const target = victimPlayer || poisonedPlayer || {};
  const currentChant = isShieldClash ? POISON_CHANT_SHIELD_CLASH : POISON_CHANT_NORMAL;

  // Giai đoạn: 'emerging' -> 'shielded' -> 'chanting' -> 'exploding' -> 'fallen'
  const [stage, setStage] = useState('emerging');
  const [typedText, setTypedText] = useState('');

  // Animation values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.4)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Khiên bảo vệ (dùng trong trường hợp xung đột Khiên Bảo Vệ & Độc Phù Thủy)
  const shieldScale = useRef(new Animated.Value(0.1)).current;
  const shieldOpacity = useRef(new Animated.Value(0)).current;
  const shieldAuraPulse = useRef(new Animated.Value(1)).current;

  // Bình thuốc độc
  const potionScale = useRef(new Animated.Value(0.1)).current;
  const potionOpacity = useRef(new Animated.Value(0)).current;
  const potionTranslateY = useRef(new Animated.Value(-120)).current;

  // Hạt độc dược bắn tung tóe
  const poisonExplosionAnim = useRef(new Animated.Value(0)).current;

  // Chuyển đỏ -> Đen xám tử nạn
  const redTintAnim = useRef(new Animated.Value(0)).current;
  const grayscaleAnim = useRef(new Animated.Value(0)).current;

  // Huy hiệu tử nạn
  const badgeScale = useRef(new Animated.Value(0.3)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;

  const resetAnimations = () => {
    backdropAnim.setValue(0);
    avatarScale.setValue(0.4);
    shakeAnim.setValue(0);
    flashAnim.setValue(0);
    shieldScale.setValue(0.1);
    shieldOpacity.setValue(0);
    shieldAuraPulse.setValue(1);
    potionScale.setValue(0.1);
    potionOpacity.setValue(0);
    potionTranslateY.setValue(-120);
    poisonExplosionAnim.setValue(0);
    redTintAnim.setValue(0);
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
      Animated.timing(backdropAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
    ]).start();

    // Nếu có xung đột: Sau 0.4s Bảo Vệ bung Khiên lên trước để che chở!
    let shieldTimer = null;
    let pulseLoop = null;
    if (isShieldClash) {
      shieldTimer = setTimeout(() => {
        playSynthSound('metalClank');
        Animated.parallel([
          Animated.timing(shieldOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(shieldScale, { toValue: 1.0, friction: 5, tension: 60, useNativeDriver: true }),
        ]).start();

        pulseLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(shieldAuraPulse, { toValue: 1.08, duration: 400, useNativeDriver: true }),
            Animated.timing(shieldAuraPulse, { toValue: 1.0, duration: 400, useNativeDriver: true }),
          ])
        );
        pulseLoop.start();
      }, 400);
    }

    // 2. Sau 0.8s: CÂU THOẠI CỦA PHÙ THỦY GÕ PHÍM CHẠY DẦN RA
    let typingInterval = null;
    const timerChant = setTimeout(() => {
      setStage('chanting');
      let index = 0;
      typingInterval = setInterval(() => {
        index++;
        if (index <= currentChant.length) {
          setTypedText(currentChant.slice(0, index));
        } else {
          clearInterval(typingInterval);
        }
      }, 25);
    }, 800);

    // 3. Sau 2.3s: GÕ XONG CÂU THOẠI, MỚI HIỂN THỊ DÙNG THUỐC ĐỘC (NÉM BÌNH ĐỘC LAO TỚI)
    const timerThrow = setTimeout(() => {
      playSynthSound('potionThrow');

      // Bình thuốc độc bay vụt tới avatar
      Animated.parallel([
        Animated.timing(potionOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(potionScale, { toValue: 1.0, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(potionTranslateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }, 2300);

    // 4. Sau 2.85s: BÌNH VỠ TUNG TÓE (PHÁ VỠ KHIÊN NẾU CÓ), AVATAR CHUYỂN ĐỎ NHIỄM ĐỘC
    const timerExplode = setTimeout(() => {
      setStage('exploding');
      playSynthSound('poisonBurst');
      if (isShieldClash) {
        playSynthSound('metalClank');
      }

      // Chớp sáng tím/đỏ
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();

      // Rung chấn màn hình
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 16, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -14, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();

      // Khiên bị độc dược xuyên thủng tan biến
      if (isShieldClash) {
        Animated.timing(shieldOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
        if (pulseLoop) pulseLoop.stop();
      }

      // Hạt độc bắn tung tóe & avatar chuyển đỏ như bị sói cắn
      Animated.parallel([
        Animated.timing(poisonExplosionAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(potionOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(redTintAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 2850);

    // 5. Sau 3.65s: AVATAR CHUYỂN SANG ĐEN XÁM TỬ NẠN (NGƯỜI ĐÓ VẪN CHẾT VÌ ĐỘC)
    const timerFallen = setTimeout(() => {
      setStage('fallen');
      playSynthSound('deathBell');

      Animated.parallel([
        Animated.timing(grayscaleAnim, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, { toValue: 1, friction: 4, tension: 55, useNativeDriver: true }),
        Animated.timing(badgeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 3650);

    return () => {
      if (shieldTimer) clearTimeout(shieldTimer);
      if (pulseLoop) pulseLoop.stop();
      clearTimeout(timerChant);
      if (typingInterval) clearInterval(typingInterval);
      clearTimeout(timerThrow);
      clearTimeout(timerExplode);
      clearTimeout(timerFallen);
    };
  }, [visible, victimPlayer, poisonedPlayer, isShieldClash]);

  if (!visible) return null;

  const isCustomImage =
    typeof target?.avatar === 'string' &&
    (target.avatar.startsWith('data:') ||
      target.avatar.startsWith('http') ||
      target.avatar.startsWith('blob:') ||
      target.avatar.length > 30);

  const isFallen = stage === 'fallen';

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropAnim }]}>
      {/* Hiệu ứng chớp đỏ tím khi trúng độc */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: flashAnim,
            backgroundColor: 'rgba(220, 38, 38, 0.6)',
          },
        ]}
        pointerEvents="none"
      />

      {/* Top Bar Header */}
      <View style={styles.topBar}>
        <View style={[styles.titleBadge, isShieldClash && { borderColor: '#38BDF8', backgroundColor: 'rgba(14, 165, 233, 0.25)' }]}>
          <Text style={styles.titleEmoji}>{isShieldClash ? '🛡️☠️' : '☠️'}</Text>
          <Text style={[styles.titleText, isShieldClash && { color: '#7DD3FC' }]}>
            {isShieldClash ? 'XUNG ĐỘT KHIÊN & ĐỘC' : 'HẠ ĐỘC TRONG ĐÊM'}
          </Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>⏳ {Math.max(0, timeLeft)}s</Text>
        </View>
      </View>

      {/* Thông điệp sự kiện */}
      <View style={styles.announceHeaderBox}>
        <Text style={[styles.announceMainTitle, isShieldClash && { color: '#F472B6' }]}>
          {isShieldClash
            ? isFallen
              ? '☠️ KHIÊN BẢO VỆ KHÔNG THỂ CỨU ĐƯỢC ĐỘC DƯỢC!'
              : '🛡️ BẢO VỆ ĐÃ DÙNG KHIÊN CHE CHỞ...'
            : isFallen
            ? '☠️ ĐÃ BỊ PHÙ THỦY HẠ ĐỘC TIÊU DIỆT!'
            : '☠️ CƠN ÁC MỘNG TỪ BÌNH THUỐC ĐỘC'}
        </Text>
        <Text style={styles.announceSubTitle}>
          {isShieldClash
            ? isFallen
              ? 'Khiên hộ mệnh đã bị độc dược ma quái phá vỡ — nạn nhân không qua khỏi!'
              : 'Một người muốn cứu, một người muốn giết, thảm hại thật...'
            : isFallen
            ? 'Độc dược ma quái đã cướp đi sinh mạng trong màn đêm u tối...'
            : 'Một luồng khí độc chết chóc lan tỏa trong màn đêm...'}
        </Text>
      </View>

      {/* KHU VỰC TRUNG TÂM: CÂU THOẠI, AVATAR & BÌNH ĐỘC */}
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
        {/* CÂU THOẠI MÀU TÍM CỦA PHÙ THỦY NẰM BÊN TRÊN AVATAR - KHÔNG CẦN TEXTBOX, GÕ CHỮ DẦN RA */}
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
            { backgroundColor: isFallen ? '#1E293B' : (target?.avatarColor || '#DC2626') },
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

          {/* KHIÊN BẢO VỆ HIỆN LÊN TRONG TRƯỜNG HỢP BẢO VỆ VÀ PHÙ THỦY CÙNG CHỌN 1 NGƯỜI */}
          {isShieldClash && (
            <Animated.View
              style={[
                styles.shieldClashContainer,
                {
                  opacity: shieldOpacity,
                  transform: [
                    { scale: Animated.multiply(shieldScale, shieldAuraPulse) },
                  ],
                },
              ]}
              pointerEvents="none"
            >
              <Image source={shieldImg} style={styles.shieldClashImg} resizeMode="contain" />
              <View style={styles.shieldClashAuraRing} />
            </Animated.View>
          )}

          {/* LỚP PHỦ ĐỎ NHIỄM ĐỘC (NHƯ BỊ SÓI CẮN) */}
          <Animated.View
            style={[
              styles.redTintOverlay,
              { opacity: redTintAnim },
            ]}
          />

          {/* LỚP PHỦ ĐEN XÁM TỬ VONG & ĐẦU LÂU */}
          <Animated.View
            style={[
              styles.grayscaleDarkOverlay,
              { opacity: grayscaleAnim },
            ]}
          >
            <Text style={styles.deathSkullWatermark}>💀</Text>
            <View style={styles.deathFilterTone} />
          </Animated.View>

          {/* BÌNH THUỐC ĐỘC LAO VÀO */}
          <Animated.View
            style={[
              styles.potionImgWrapper,
              {
                opacity: potionOpacity,
                transform: [
                  { scale: potionScale },
                  { translateY: potionTranslateY },
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
        </View>

        {/* HẠT ĐỘC DƯỢC BẮN TUNG TÓE */}
        <View style={styles.sparksContainer} pointerEvents="none">
          {POISON_DROPS.map((drop) => {
            const dropX = poisonExplosionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, drop.targetX],
            });
            const dropY = poisonExplosionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, drop.targetY],
            });
            const dropOpacity = poisonExplosionAnim.interpolate({
              inputRange: [0, 0.1, 0.75, 1],
              outputRange: [0, 1, 0.8, 0],
            });
            const dropScale = poisonExplosionAnim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0.4, 1.3, 0.5],
            });

            return (
              <Animated.View
                key={drop.id}
                style={[
                  styles.sparkParticle,
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
          <Text style={styles.namePlateLabel}>
            {isShieldClash ? '🛡️ ĐÃ DÙNG KHIÊN BẢO VỆ' : 'MỤC TIÊU BỊ TRÚNG ĐỘC'}
          </Text>
          <Text style={[styles.namePlateText, isFallen && styles.namePlateTextDead]} numberOfLines={1}>
            {target?.name || 'Chủ Phòng'}
          </Text>
        </View>

        {/* HUY HIỆU: ĐÃ BỊ PHÙ THỦY GIẾT CHẾT */}
        <Animated.View
          style={[
            styles.badge,
            {
              opacity: badgeOpacity,
              transform: [{ scale: badgeScale }],
            },
          ]}
        >
          <View style={[styles.badgeInner, isShieldClash && { borderColor: '#F43F5E' }]}>
            <Text style={styles.badgeTitle}>
              {isShieldClash
                ? `${target?.name || 'Người chơi'} đã bị phù thủy giết chết`
                : '☠️ ĐÃ BỊ TRÚNG ĐỘC TỬ VONG'}
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
          <Text style={styles.closeBtnText}>⚰️ ĐÃ HIỂU ({Math.max(0, timeLeft)}s)</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 5, 12, 0.95)',
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
    backgroundColor: 'rgba(147, 51, 234, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#A855F7',
  },
  titleEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  titleText: {
    color: '#F3E8FF',
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
    color: '#F43F5E',
    letterSpacing: 1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(244, 63, 94, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
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
  avatarCircle: {
    width: 230,
    height: 230,
    borderRadius: 115,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#DC2626',
    boxShadow: '0 0 20px rgba(220, 38, 38, 0.7)',
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

  redTintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(220, 38, 38, 0.55)',
    zIndex: 5,
  },
  grayscaleDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
  },
  deathSkullWatermark: {
    fontSize: 85,
    opacity: 0.35,
  },
  deathFilterTone: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },

  potionImgWrapper: {
    position: 'absolute',
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  potionImg: {
    width: '100%',
    height: '100%',
  },

  // Khiên bảo vệ trong trường hợp xung đột Khiên & Độc
  shieldClashContainer: {
    position: 'absolute',
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9,
  },
  shieldClashImg: {
    width: 215,
    height: 215,
  },
  shieldClashAuraRing: {
    position: 'absolute',
    width: 236,
    height: 236,
    borderRadius: 118,
    borderWidth: 2.5,
    borderColor: '#38BDF8',
    boxShadow: '0 0 25px rgba(56, 189, 248, 0.9)',
  },

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
    boxShadow: '0 0 8px rgba(239, 68, 68, 0.9)',
  },

  // Câu thoại màu tím của Phù Thủy nằm trên Avatar (không viền, không hộp nền)
  floatingChantContainer: {
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  floatingChantText: {
    color: '#D8B4FE',
    fontSize: 13.5,
    fontWeight: '800',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(192, 132, 252, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  namePlate: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 2,
    borderColor: 'rgba(220, 38, 38, 0.6)',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginTop: 8,
    minWidth: 200,
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
  },
  namePlateDead: {
    borderColor: '#64748B',
  },
  namePlateLabel: {
    fontSize: 9.5,
    color: '#FDA4AF',
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

  badge: {
    marginTop: 10,
    zIndex: 12,
  },
  badgeInner: {
    backgroundColor: 'rgba(69, 10, 10, 0.94)',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    boxShadow: '0 0 18px rgba(239, 68, 68, 0.6)',
  },
  badgeTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#FECACA',
    letterSpacing: 1.2,
  },

  bottomBar: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  closeBtn: {
    backgroundColor: '#9F1239',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 18,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    boxShadow: '0 4px 16px rgba(159, 18, 57, 0.45)',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
  },
});

