// ============================================
// 🧪 MA SÓI - WitchHealSaveModal Component
// Hiệu ứng điện ảnh buổi sáng khi Phù Thủy dùng Bình Thuốc Cứu hồi sinh nạn nhân:
// 1. Avatar nạn nhân xuất hiện kèm móng vuốt Sói cào xé toạc
// 2. Dòng thoại màu tím xuất hiện: "Chưa đến lúc để chết đâu, hãy sống dậy giúp mọi người đi"
// 3. Bình Thuốc Cứu màu xanh ném thẳng lên vết chém của Sói
// 4. Bình vỡ, phép thuật xanh lá tỏa ra hàn gắn vết cào, avatar hồi sinh nguyên vẹn
// 5. Huy hiệu: "🧪 ĐÃ ĐƯỢC PHÙ THỦY CỨU SỐNG"
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
const potionHealImg = require('../assets/potion_heal.png');

const HEAL_CHANT = 'Chưa đến lúc để chết đâu, hãy sống dậy giúp mọi người đi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 22 hạt phép màu ngọc lục bảo hồi sinh
const NUM_HEAL_SPARKS = 22;
const HEAL_SPARKS = Array.from({ length: NUM_HEAL_SPARKS }, (_, i) => {
  const angle = (i / NUM_HEAL_SPARKS) * 2 * Math.PI + ((i % 3) * 0.15 - 0.08);
  const dist = 120 + (i % 5) * 25;
  const size = (i % 4 === 0) ? 12 : (i % 2 === 0) ? 8 : 5;
  return {
    id: i,
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist,
    size,
    color: i % 4 === 0 ? '#FFFFFF' : i % 3 === 0 ? '#10B981' : i % 2 === 0 ? '#34D399' : '#A7F3D0',
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
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'potionThrow') {
      // Tiếng gió rít khi ném bình thuốc
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'potionHeal') {
      // Tiếng vỡ bình thủy tinh ma thuật + âm hưởng hồi sinh
      const breakOsc = ctx.createOscillator();
      const breakGain = ctx.createGain();
      breakOsc.type = 'triangle';
      breakOsc.frequency.setValueAtTime(1400, now);
      breakOsc.frequency.exponentialRampToValueAtTime(250, now + 0.3);
      breakGain.gain.setValueAtTime(0.3, now);
      breakGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      breakOsc.connect(breakGain);
      breakGain.connect(ctx.destination);
      breakOsc.start(now);
      breakOsc.stop(now + 0.3);

      // Hòa âm hồi sinh thiêng liêng
      [440, 554.37, 659.25, 880, 1108.7].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.18, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 1.2);
      });
    }
  } catch (err) {}
}

export default function WitchHealSaveModal({
  visible = false,
  victimPlayer = null,
  savedPlayer = null,
  onClose,
  timeLeft = 8,
}) {
  const target = victimPlayer || savedPlayer || {};

  // Giai đoạn: 'emerging' -> 'slashing' -> 'chanting' -> 'healed'
  const [stage, setStage] = useState('emerging');
  const [typedText, setTypedText] = useState('');

  // Animation values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.4)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Vuốt cào sói
  const clawScale = useRef(new Animated.Value(1.6)).current;
  const clawOpacity = useRef(new Animated.Value(0)).current;

  // Bình thuốc cứu
  const potionScale = useRef(new Animated.Value(0.1)).current;
  const potionOpacity = useRef(new Animated.Value(0)).current;
  const potionTranslateY = useRef(new Animated.Value(-120)).current;

  // Phép màu tỏa sáng & tia sáng hồi sinh
  const healExplosionAnim = useRef(new Animated.Value(0)).current;
  const shockwaveScale = useRef(new Animated.Value(0.2)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0)).current;

  // Huy hiệu
  const badgeScale = useRef(new Animated.Value(0.3)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;

  const resetAnimations = () => {
    backdropAnim.setValue(0);
    avatarScale.setValue(0.4);
    shakeAnim.setValue(0);
    flashAnim.setValue(0);
    clawScale.setValue(1.6);
    clawOpacity.setValue(0);
    potionScale.setValue(0.1);
    potionOpacity.setValue(0);
    potionTranslateY.setValue(-120);
    healExplosionAnim.setValue(0);
    shockwaveScale.setValue(0.2);
    shockwaveOpacity.setValue(0);
    badgeScale.setValue(0.3);
    badgeOpacity.setValue(0);
    headerOpacity.setValue(1);
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

    // 2. Sau 1.0s: SÓI CÀO XÉ TOẠC AVATAR
    const timerSlash = setTimeout(() => {
      setStage('slashing');
      playSynthSound('slash');

      // Chớp sáng đỏ
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();

      // Rung chấn màn hình
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 15, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -12, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();

      // Vết cào đè lên avatar
      Animated.parallel([
        Animated.timing(clawOpacity, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.spring(clawScale, { toValue: 1.0, friction: 4, tension: 70, useNativeDriver: true }),
      ]).start();
    }, 1000);

    // 3. Sau 1.8s: CÂU THOẠI PHÙ THỦY GÕ PHÍM CHẠY DẦN RA
    let typingInterval = null;
    const timerChant = setTimeout(() => {
      setStage('chanting');
      let index = 0;
      typingInterval = setInterval(() => {
        index++;
        if (index <= HEAL_CHANT.length) {
          setTypedText(HEAL_CHANT.slice(0, index));
        } else {
          clearInterval(typingInterval);
        }
      }, 25);
    }, 1800);

    // 4. Sau 3.5s: KHI GÕ CHỮ XONG, MỚI BẮT ĐẦU NÉM THUỐC
    const timerThrow = setTimeout(() => {
      playSynthSound('potionThrow');

      // Bình thuốc bay vụt vào vết cào
      Animated.parallel([
        Animated.timing(potionOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(potionScale, { toValue: 1.0, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(potionTranslateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }, 3500);

    // 5. Sau 4.2s: BÌNH NÉM LÊN VẾT CÀO HỒI SINH KỲ DIỆU
    const timerHeal = setTimeout(() => {
      setStage('healed');
      playSynthSound('potionHeal');

      // Đổi header mượt mà
      Animated.sequence([
        Animated.timing(headerOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(headerOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      Animated.parallel([
        // Sóng phép thuật bung tỏa
        Animated.timing(shockwaveScale, { toValue: 2.3, duration: 600, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(shockwaveOpacity, { toValue: 1, duration: 90, useNativeDriver: true }),
          Animated.timing(shockwaveOpacity, { toValue: 0, duration: 510, useNativeDriver: true }),
        ]),
        // Hạt phép màu xanh bung nở
        Animated.timing(healExplosionAnim, {
          toValue: 1,
          duration: 750,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Vết cào biến mất hoàn toàn
        Animated.timing(clawOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        // Bình thuốc tan biến thành ánh sáng
        Animated.timing(potionOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        // Huy hiệu xuất hiện
        Animated.spring(badgeScale, { toValue: 1, friction: 4, tension: 55, useNativeDriver: true }),
        Animated.timing(badgeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 4200);

    // 6. Sau 4.8s: Tự động đóng modal chuyển tiếp mượt mà (đặc biệt khi Phù Thủy dùng cả 2 bình Cứu & Độc trong 1 đêm)
    const timerAutoClose = setTimeout(() => {
      if (onClose) onClose();
    }, 4800);

    return () => {
      clearTimeout(timerSlash);
      clearTimeout(timerChant);
      if (typingInterval) clearInterval(typingInterval);
      clearTimeout(timerThrow);
      clearTimeout(timerHeal);
      clearTimeout(timerAutoClose);
    };
  }, [visible, victimPlayer, savedPlayer]);

  if (!visible) return null;

  const isCustomImage =
    typeof target?.avatar === 'string' &&
    (target.avatar.startsWith('data:') ||
      target.avatar.startsWith('http') ||
      target.avatar.startsWith('blob:') ||
      target.avatar.length > 30);

  const isHealed = stage === 'healed';

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropAnim }]}>
      {/* Hiệu ứng chớp sáng đỏ khi cào */}
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
        <View style={[styles.titleBadge, isHealed && styles.titleBadgeHealed]}>
          <Text style={styles.titleEmoji}>{isHealed ? '✨' : '🩸'}</Text>
          <Text style={styles.titleText}>
            {isHealed ? 'PHÉP MÀU HỒI SINH' : 'BÌNH MINH ĐẪM MÁU'}
          </Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>⏳ {Math.max(0, timeLeft)}s</Text>
        </View>
      </View>

      {/* Thông điệp sự kiện */}
      <Animated.View style={[styles.announceHeaderBox, { opacity: headerOpacity }]}>
        <Text style={[styles.announceMainTitle, isHealed && styles.announceMainTitleHealed]}>
          {isHealed
            ? '✨ PHÙ THỦY ĐÃ HỒI SINH NẠN NHÂN!'
            : '⚠️ MA SÓI TẤN CÔNG ĐÊM QUA!'}
        </Text>
        <Text style={[styles.announceSubTitle, isHealed && styles.announceSubTitleHealed]}>
          {isHealed
            ? 'Phép màu từ Bình Thuốc Cứu đã cứu người vô tội khỏi cửa tử!'
            : 'Một tiếng thét xé tan màn đêm yên bình của ngôi làng...'}
        </Text>
      </Animated.View>

      {/* KHU VỰC TRUNG TÂM: CÂU THOẠI, AVATAR & BÌNH CỨU HỒI SINH */}
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
            { backgroundColor: target?.avatarColor || '#38BDF8' },
            isHealed && styles.avatarCircleHealed,
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

          {/* Sóng phép thuật bung tỏa khi hồi sinh */}
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

          {/* VẾT CÀO SÓI (SẼ BIẾN MẤT KHI THUỐC CỨU TÁC DỤNG) */}
          <Animated.View
            style={[
              styles.clawImgWrapper,
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

          {/* BÌNH THUỐC CỨU NÉM TRỰC TIẾP LÊN VẾT CHÉM */}
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
              source={potionHealImg}
              style={styles.potionImg}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* HẠT PHÉP THUẬT XANH LÁ BẮN RA HỒI PHỤC */}
        <View style={styles.sparksContainer} pointerEvents="none">
          {HEAL_SPARKS.map((spark) => {
            const sparkX = healExplosionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, spark.targetX],
            });
            const sparkY = healExplosionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, spark.targetY],
            });
            const sparkOpacity = healExplosionAnim.interpolate({
              inputRange: [0, 0.1, 0.8, 1],
              outputRange: [0, 1, 0.8, 0],
            });
            const sparkScale = healExplosionAnim.interpolate({
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

        {/* BẢNG TÊN NẠN NHÂN TRÊN CHÂN ĐẾ */}
        <View style={[styles.namePlate, isHealed && styles.namePlateHealed]}>
          <Text style={[styles.namePlateLabel, isHealed && styles.namePlateLabelHealed]}>
            NẠN NHÂN ĐÊM QUA
          </Text>
          <Text style={styles.namePlateText} numberOfLines={1}>
            {target?.name || 'Chủ Phòng'}
          </Text>
        </View>

        {/* HUY HIỆU: ĐÃ ĐƯỢC PHÙ THỦY CỨU SỐNG */}
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
            <Text style={styles.badgeTitle}>🧪 ĐÃ ĐƯỢC PHÙ THỦY CỨU SỐNG</Text>
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
    backgroundColor: 'rgba(5, 5, 15, 0.95)',
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
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#EF4444',
  },
  titleBadgeHealed: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10B981',
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
  },
  announceMainTitleHealed: {
    color: '#34D399',
    textShadowColor: 'rgba(16, 185, 129, 0.8)',
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
  announceSubTitleHealed: {
    color: '#A7F3D0',
    fontWeight: '700',
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
    borderColor: '#EF4444',
    boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)',
    position: 'relative',
  },
  avatarCircleHealed: {
    borderColor: '#10B981',
    boxShadow: '0 0 25px rgba(16, 185, 129, 0.85)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 105,
    textAlign: 'center',
  },

  shockwaveRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#34D399',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    zIndex: 7,
  },

  clawImgWrapper: {
    position: 'absolute',
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  clawImg: {
    width: '100%',
    height: '100%',
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
    boxShadow: '0 0 8px rgba(52, 211, 153, 0.9)',
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
    borderColor: 'rgba(239, 68, 68, 0.6)',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginTop: 8,
    minWidth: 200,
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
  },
  namePlateHealed: {
    borderColor: '#059669',
    boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
  },
  namePlateLabel: {
    fontSize: 9.5,
    color: '#F87171',
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  namePlateLabelHealed: {
    color: '#34D399',
  },
  namePlateText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },

  badge: {
    marginTop: 10,
    zIndex: 12,
  },
  badgeInner: {
    backgroundColor: 'rgba(6, 78, 59, 0.92)',
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    boxShadow: '0 0 18px rgba(16, 185, 129, 0.6)',
  },
  badgeTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#D1FAE5',
    letterSpacing: 1.2,
  },

  bottomBar: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  closeBtn: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 18,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    boxShadow: '0 4px 16px rgba(5, 150, 105, 0.45)',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
  },
});

