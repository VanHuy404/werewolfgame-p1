// ============================================
// ⚖️⚰️ MA SÓI - DaytimeHangingModal Component
// Hoạt ảnh điện ảnh ĐOẠN ĐẦU ĐÀI / TREO CỔ BAN NGÀY
// 1. Chuông đồng hồ điểm tiếng vang u tối giữa quảng trường làng
// 2. Avatar nạn nhân đứng trên bục gỗ đoạn đầu đài, dây thừng thòng lọng rủ xuống
// 3. Phán quyết dân làng: Bục gỗ sập đánh RẦM, dây thừng siết căng, nạn nhân rơi thụt xuống và đu đưa
// 4. ĐẶC BIỆT:
//    - Với SÓI: Lộ diện nguyên hình Ma Sói hung tợn + Tiếng Sói Hú ai oán lần cuối trước khi chết!
//    - Với THỢ SĂN: Dòng chữ chạy lên màu vàng kim "Chết chưa phải là kết thúc" + Hạt ánh sáng hoàng kim phục thù!
// 5. Avatar chuyển đen xám tử nạn kèm huy hiệu phán quyết tương ứng
// 6. Giữ đúng 1.0s sau khi hoạt ảnh kết thúc rồi tự động chuyển tiếp
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

const wolfImg = require('../assets/werewolf.jpg');
const hunterImg = require('../assets/Hunter.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 12 mảnh vụn gỗ và lông quạ rơi rụng khi bục gỗ sập
const NUM_DEBRIS = 12;
const DEBRIS_DATA = Array.from({ length: NUM_DEBRIS }, (_, i) => {
  const angle = (i / NUM_DEBRIS) * 2 * Math.PI;
  const dist = 60 + (i % 4) * 25;
  const isFeather = i % 3 === 0;
  return {
    id: i,
    targetX: Math.cos(angle) * dist,
    targetY: 40 + (i % 5) * 28,
    isFeather,
    char: isFeather ? '🪶' : '🪵',
    size: isFeather ? 18 : 12,
  };
});

// 16 hạt ánh sáng hoàng kim và mũi tên phục thù của Thợ Săn
const HUNTER_GOLDEN_PARTICLES = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * 2 * Math.PI;
  const dist = 75 + (i % 4) * 25;
  const symbols = ['🏹', '✨', '⭐', '💫', '🎯', '✨'];
  return {
    id: i,
    char: symbols[i % symbols.length],
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist - 25,
    size: i % 3 === 0 ? 20 : 15,
  };
});

// 14 hạt khói lửa và huyết sát khi Sói lộ diện
const WOLF_EMBER_PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * 2 * Math.PI;
  const dist = 70 + (i % 3) * 25;
  const chars = ['🔥', '🩸', '💨', '⚡'];
  return {
    id: i,
    char: chars[i % chars.length],
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist,
    size: i % 2 === 0 ? 18 : 13,
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

    if (type === 'bellToll') {
      // 1. Tiếng chuông nhà thờ u tối điểm giờ phán quyết
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 1.8);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.8);

      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(55, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 1.5);
      subGain.gain.setValueAtTime(0.35, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 1.5);
    } else if (type === 'crow') {
      // 2. Tiếng quạ kêu khàn đặc trên nóc nhà thờ
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.linearRampToValueAtTime(520, now + 0.15);
      osc.frequency.linearRampToValueAtTime(420, now + 0.3);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'trapdoorCrash') {
      // 3. Tiếng bục gỗ sập đánh RẦM đanh thép
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = 'square';
      snapOsc.frequency.setValueAtTime(260, now);
      snapOsc.frequency.exponentialRampToValueAtTime(45, now + 0.25);
      snapGain.gain.setValueAtTime(0.55, now);
      snapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(now);
      snapOsc.stop(now + 0.25);

      // Dây thừng siết căng
      const ropeOsc = ctx.createOscillator();
      const ropeGain = ctx.createGain();
      ropeOsc.type = 'sawtooth';
      ropeOsc.frequency.setValueAtTime(420, now + 0.08);
      ropeOsc.frequency.exponentialRampToValueAtTime(130, now + 0.35);
      ropeGain.gain.setValueAtTime(0.35, now + 0.08);
      ropeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      ropeOsc.connect(ropeGain);
      ropeGain.connect(ctx.destination);
      ropeOsc.start(now + 0.08);
      ropeOsc.stop(now + 0.35);

      // Thud sub-bass rền vang
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(100, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.6);
      subGain.gain.setValueAtTime(0.65, now);
      subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.6);
    } else if (type === 'deathGong') {
      // 4. Tiếng cồng tử thần khi ngã xuống
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 1.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
    } else if (type === 'wolfHowl') {
      // 5. 🐺 TIẾNG SÓI HÚ LẦN CUỐI TRƯỚC KHI CHẾT:
      // U buồn, ai oán và rền vang: bắt đầu gầm trầm -> vút lên cao trào -> vibrato run rẩy -> tuột dốc lịm dần
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, now);
      filter.frequency.linearRampToValueAtTime(1500, now + 0.7);
      filter.frequency.exponentialRampToValueAtTime(450, now + 2.5);
      filter.Q.value = 3.5;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.7);
      osc.frequency.setValueAtTime(540, now + 1.2);
      osc.frequency.exponentialRampToValueAtTime(160, now + 2.5);

      // LFO run rẩy vibrato cho tiếng hú
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(5.2, now);
      lfoGain.gain.setValueAtTime(16, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now + 0.3);
      lfo.stop(now + 2.4);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.42, now + 0.4);
      gain.gain.setValueAtTime(0.38, now + 1.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.5);

      // Sub-bass tăng cường độ nặng của tiếng gầm rú
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(105, now);
      subOsc.frequency.linearRampToValueAtTime(150, now + 0.6);
      subOsc.frequency.exponentialRampToValueAtTime(40, now + 2.2);
      subGain.gain.setValueAtTime(0.01, now);
      subGain.gain.linearRampToValueAtTime(0.28, now + 0.4);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 2.2);
    } else if (type === 'hunterCock') {
      // 6. 🏹 TIẾNG LÊN NỎ ĐANH THÉP + CHUÔNG VÀNG KIM PHỤC THÙ:
      // Click nạp đạn sắc lẹm
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(950, now);
      clickOsc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
      clickGain.gain.setValueAtTime(0.38, now);
      clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.08);

      // Clack khóa then nỏ
      const clackOsc = ctx.createOscillator();
      const clackGain = ctx.createGain();
      clackOsc.type = 'sawtooth';
      clackOsc.frequency.setValueAtTime(1250, now + 0.1);
      clackOsc.frequency.exponentialRampToValueAtTime(300, now + 0.22);
      clackGain.gain.setValueAtTime(0.42, now + 0.1);
      clackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      clackOsc.connect(clackGain);
      clackGain.connect(ctx.destination);
      clackOsc.start(now + 0.1);
      clackOsc.stop(now + 0.22);

      // Chuông ngân hoàng kim arpeggio ngân vang
      [659.25, 830.61, 987.77, 1318.51].forEach((freq, idx) => {
        const chimeOsc = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(freq, now + 0.18 + idx * 0.07);
        chimeGain.gain.setValueAtTime(0.2, now + 0.18 + idx * 0.07);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        chimeOsc.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chimeOsc.start(now + 0.18 + idx * 0.07);
        chimeOsc.stop(now + 2.0);
      });
    }

    setTimeout(() => {
      try { ctx.close(); } catch (e) {}
    }, 2800);
  } catch (err) {}
}

export default function DaytimeHangingModal({
  visible = false,
  victimPlayer = null,
  duration = 5,
  onClose,
}) {
  // 'emerging' (đứng trên bục) -> 'dropped' (sập bục rơi xuống) -> 'fallen' (đen xám tử nạn)
  const [stage, setStage] = useState('emerging');
  const [typedText, setTypedText] = useState('');
  const [revealedWolf, setRevealedWolf] = useState(false);
  const [revealedHunter, setRevealedHunter] = useState(false);

  const target = victimPlayer || { name: 'Người Chơi', avatar: '🧑‍🌾', avatarColor: '#EF4444' };
  const isWolf = target?.role === 'wolf' || target?.role === 'werewolf' || target?.isWolf === true;
  const isHunter = target?.role === 'hunter' || target?.isHunter === true;

  const chantText = `Phán quyết dân làng: ${target.name} bị tuyên án treo cổ!`;

  // Animation values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const stageScale = useRef(new Animated.Value(0.5)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Dây thừng thòng lọng rủ xuống
  const ropeLengthAnim = useRef(new Animated.Value(0)).current;

  // Avatar run rẩy nhẹ trước giờ hành quyết
  const trembleAnim = useRef(new Animated.Value(0)).current;

  // Bục gỗ mở sập (0: đóng, 1: mở sập xuống)
  const trapdoorAnim = useRef(new Animated.Value(0)).current;

  // Cú rơi thụt xuống của Avatar khi bục sập (Y: 0 -> 48px)
  const dropTranslateY = useRef(new Animated.Value(0)).current;

  // Đu đưa qua lại như con lắc sau khi rơi
  const swingAnim = useRef(new Animated.Value(0)).current;

  // Mảnh vụn gỗ & lông quạ bay
  const debrisAnim = useRef(new Animated.Value(0)).current;

  // Chuyển hóa đen xám tử nạn
  const grayscaleAnim = useRef(new Animated.Value(0)).current;
  const deathBadgeScale = useRef(new Animated.Value(0.3)).current;
  const deathBadgeOpacity = useRef(new Animated.Value(0)).current;
  const announceOpacity = useRef(new Animated.Value(0)).current;
  const announceTranslateY = useRef(new Animated.Value(20)).current;

  // --- RIÊNG CHO SÓI ---
  const wolfRevealScale = useRef(new Animated.Value(0.6)).current;
  const wolfAuraPulse = useRef(new Animated.Value(0)).current;
  const wolfEmbersAnim = useRef(new Animated.Value(0)).current;

  // --- RIÊNG CHO THỢ SĂN (DÒNG CHỮ CHẠY LÊN MÀU VÀNG KIM & LỘ DIỆN ẢNH HUNTER) ---
  const hunterRevealScale = useRef(new Animated.Value(0.6)).current;
  const hunterVowY = useRef(new Animated.Value(35)).current;
  const hunterVowOpacity = useRef(new Animated.Value(0)).current;
  const hunterVowScale = useRef(new Animated.Value(0.75)).current;
  const hunterParticlesAnim = useRef(new Animated.Value(0)).current;

  const resetAnimations = () => {
    backdropAnim.setValue(0);
    stageScale.setValue(0.5);
    shakeAnim.setValue(0);
    flashAnim.setValue(0);
    ropeLengthAnim.setValue(0);
    trembleAnim.setValue(0);
    trapdoorAnim.setValue(0);
    dropTranslateY.setValue(0);
    swingAnim.setValue(0);
    debrisAnim.setValue(0);
    grayscaleAnim.setValue(0);
    deathBadgeScale.setValue(0.3);
    deathBadgeOpacity.setValue(0);
    announceOpacity.setValue(0);
    announceTranslateY.setValue(20);

    wolfRevealScale.setValue(0.6);
    wolfAuraPulse.setValue(0);
    wolfEmbersAnim.setValue(0);

    hunterRevealScale.setValue(0.6);
    hunterVowY.setValue(35);
    hunterVowOpacity.setValue(0);
    hunterVowScale.setValue(0.75);
    hunterParticlesAnim.setValue(0);

    setRevealedWolf(false);
    setRevealedHunter(false);
    setTypedText('');
  };

  useEffect(() => {
    if (!visible) {
      setStage('emerging');
      resetAnimations();
      return;
    }

    setStage('emerging');
    resetAnimations();

    // 1. GIAI ĐOẠN 1 (T=0): CHUÔNG PHÁN QUYẾT & SÂN KHẤU XUẤT HIỆN
    playSynthSound('bellToll');
    setTimeout(() => playSynthSound('crow'), 600);

    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(stageScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      Animated.timing(ropeLengthAnim, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    // Run rẩy nhẹ trước khi sập bục
    const trembleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(trembleAnim, { toValue: 1.5, duration: 70, useNativeDriver: true }),
        Animated.timing(trembleAnim, { toValue: -1.5, duration: 70, useNativeDriver: true }),
      ])
    );
    trembleLoop.start();

    // Gõ chữ câu phán quyết
    let charIndex = 0;
    const typingInterval = setInterval(() => {
      charIndex++;
      if (charIndex <= chantText.length) {
        setTypedText(chantText.slice(0, charIndex));
      } else {
        clearInterval(typingInterval);
      }
    }, 24);

    // --- NẾU LÀ SÓI: LỘ NGUYÊN HÌNH SÓI & HÚ TIẾNG HÚ LẦN CUỐI (T = 1000ms) ---
    let timerWolfReveal = null;
    let wolfAuraLoop = null;
    if (isWolf) {
      timerWolfReveal = setTimeout(() => {
        setRevealedWolf(true);
        playSynthSound('wolfHowl');

        // Chớp sáng đỏ hung tợn
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();

        // Rung giật bùng nổ khi sói biến hình
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 14, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -14, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
        ]).start();

        Animated.parallel([
          Animated.spring(wolfRevealScale, { toValue: 1, friction: 4, tension: 65, useNativeDriver: true }),
          Animated.timing(wolfEmbersAnim, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();

        // Aura đỏ nhấp nháy gầm rú
        wolfAuraLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(wolfAuraPulse, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.timing(wolfAuraPulse, { toValue: 0.3, duration: 350, useNativeDriver: true }),
          ])
        );
        wolfAuraLoop.start();
      }, 1000);
    }

    // --- NẾU LÀ THỢ SĂN: LỘ DIỆN ẢNH HUNTER KHI TREO CỔ & CHẠY DÒNG CHỮ VÀNG KIM (T = 1000ms NHƯ SÓI) ---
    let timerHunterReveal = null;
    if (isHunter) {
      timerHunterReveal = setTimeout(() => {
        setRevealedHunter(true);
        playSynthSound('hunterCock');

        // Chớp sáng hoàng kim phục thù
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();

        // Rung giật màn hình
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 14, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -14, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
        ]).start();

        Animated.parallel([
          Animated.spring(hunterRevealScale, { toValue: 1, friction: 4, tension: 65, useNativeDriver: true }),
          Animated.timing(hunterVowOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.spring(hunterVowY, { toValue: 0, friction: 5, tension: 50, useNativeDriver: true }),
          Animated.spring(hunterVowScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
          Animated.timing(hunterParticlesAnim, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      }, 1000);
    }

    // 2. GIAI ĐOẠN 2: SẬP BỤC GỖ ĐOẠN ĐẦU ĐÀI & RƠI THỤT XUỐNG
    // Nếu là Sói hoặc Thợ Săn thì hoãn thêm (1650ms) để chứng kiến khoảnh khắc lộ diện kịch tính
    const dropDelay = (isWolf || isHunter) ? 1650 : 1400;
    const timerDrop = setTimeout(() => {
      trembleLoop.stop();
      setStage('dropped');
      playSynthSound('trapdoorCrash');

      // Chớp sáng sập bục
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();

      // Rung chấn màn hình dữ dội
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 18, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -15, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 12, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
      ]).start();

      // Bục gỗ mở sập xuống
      Animated.timing(trapdoorAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();

      // Avatar rơi thụt mạnh xuống dưới và nảy giật trên dây thừng
      Animated.sequence([
        Animated.timing(dropTranslateY, {
          toValue: 48,
          duration: 140,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(dropTranslateY, {
          toValue: 40,
          friction: 4,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();

      // Đu đưa qua lại như con lắc
      Animated.sequence([
        Animated.timing(swingAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(swingAnim, { toValue: -0.7, duration: 260, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(swingAnim, { toValue: 0.4, duration: 280, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(swingAnim, { toValue: -0.2, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(swingAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]).start();

      // Mảnh vụn gỗ và lông quạ bay
      Animated.timing(debrisAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, dropDelay);

    // 3. GIAI ĐOẠN 3: TỬ NẠN - AVATAR CHUYỂN ĐEN XÁM & HUY HIỆU DẬP XUỐNG
    const deathDelay = isWolf ? 2550 : isHunter ? 2500 : 2200;
    const timerDeath = setTimeout(() => {
      setStage('fallen');
      playSynthSound('deathGong');

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
    }, deathDelay);

    // 4. GIAI ĐOẠN 4: TỰ ĐỘNG CHUYỂN TIẾP (Sau khi kết thúc + đúng 1.0s)
    const autoCloseDelay = isWolf ? 4200 : isHunter ? 4200 : 3800;
    const timerAutoClose = setTimeout(() => {
      if (onClose) onClose();
    }, autoCloseDelay);

    return () => {
      trembleLoop.stop();
      if (wolfAuraLoop) wolfAuraLoop.stop();
      clearInterval(typingInterval);
      if (timerWolfReveal) clearTimeout(timerWolfReveal);
      if (timerHunterReveal) clearTimeout(timerHunterReveal);
      clearTimeout(timerDrop);
      clearTimeout(timerDeath);
      clearTimeout(timerAutoClose);
    };
  }, [visible, isWolf, isHunter]);

  if (!visible) return null;

  const isFallen = stage === 'fallen';
  const isCustomImage =
    typeof target?.avatar === 'string' &&
    (target.avatar.startsWith('data:') ||
      target.avatar.startsWith('http') ||
      target.avatar.startsWith('blob:') ||
      target.avatar.length > 30);

  // Góc đu đưa con lắc
  const swingRotate = swingAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-6deg', '0deg', '6deg'],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropAnim }]}>
      {/* Hiệu ứng chớp sáng khi sập bục hoặc sói lộ diện */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: flashAnim,
            backgroundColor: isWolf ? 'rgba(220, 38, 38, 0.7)' : 'rgba(120, 53, 15, 0.65)',
          },
        ]}
        pointerEvents="none"
      />

      {/* Top Bar Header */}
      <View style={styles.topBar}>
        <View style={[styles.tagBadge, (isWolf && revealedWolf) && styles.tagBadgeWolf, (isHunter && revealedHunter) && styles.tagBadgeHunter]}>
          <Text style={[styles.tagBadgeText, (isWolf && revealedWolf) && styles.tagBadgeTextWolf, (isHunter && revealedHunter) && styles.tagBadgeTextHunter]}>
            {isWolf && revealedWolf ? '🐺 TIÊU DIỆT MA SÓI' : isHunter && revealedHunter ? '🏹 PHÁN QUYẾT THỢ SĂN' : '⚖️ PHÁN QUYẾT QUẢNG TRƯỜNG'}
          </Text>
        </View>
        <Text style={styles.topBarHint}>Biểu Quyết Dân Làng Ban Ngày</Text>
      </View>

      {/* TRUNG TÂM SÂN KHẤU ĐOẠN ĐẦU ĐÀI */}
      <Animated.View
        style={[
          styles.stageCenter,
          {
            transform: [
              { scale: stageScale },
              { translateX: shakeAnim },
            ],
          },
        ]}
      >
        {/* CÂU THOẠI PHÁN QUYẾT (TYPEWRITER) */}
        <View style={styles.floatingChantContainer}>
          {typedText.length > 0 && (
            <Text style={[styles.floatingChantText, (isWolf && revealedWolf) && styles.floatingChantTextWolf, (isHunter && revealedHunter) && styles.floatingChantTextHunter]}>
              {isWolf && revealedWolf
                ? `"${target.name} ĐÃ LỘ NGUYÊN HÌNH MA SÓI!"`
                : isHunter && revealedHunter
                ? `"${target.name} ĐÃ LỘ DIỆN LÀ THỢ SĂN!"`
                : `"${typedText}"`}
            </Text>
          )}
        </View>

        {/* --- DÒNG CHỮ CHẠY LÊN MÀU VÀNG KIM CỦA THỢ SĂN: "Chết chưa phải là kết thúc" --- */}
        {isHunter && (
          <Animated.View
            style={[
              styles.hunterVowWrapper,
              {
                opacity: hunterVowOpacity,
                transform: [
                  { translateY: hunterVowY },
                  { scale: hunterVowScale },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.hunterVowGlowBox}>
              <Text style={styles.hunterVowIcon}>🏹</Text>
              <Text style={styles.hunterVowText}>"Chết chưa phải là kết thúc"</Text>
              <Text style={styles.hunterVowIcon}>🎯</Text>
            </View>

            {/* Hạt bụi hoàng kim lấp lánh bay quanh */}
            <View style={styles.hunterParticlesWrap} pointerEvents="none">
              {HUNTER_GOLDEN_PARTICLES.map((p) => {
                const pX = hunterParticlesAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, p.targetX],
                });
                const pY = hunterParticlesAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, p.targetY],
                });
                const pOpacity = hunterParticlesAnim.interpolate({
                  inputRange: [0, 0.2, 0.8, 1],
                  outputRange: [0, 1, 0.85, 0],
                });
                return (
                  <Animated.View
                    key={p.id}
                    style={[
                      styles.hunterParticleItem,
                      {
                        opacity: pOpacity,
                        transform: [{ translateX: pX }, { translateY: pY }],
                      },
                    ]}
                  >
                    <Text style={{ fontSize: p.size }}>{p.char}</Text>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* XÀ NGANG GỖ CỦA GIÁ TREO CỔ (GALLOWS BEAM) */}
        <View style={styles.gallowsBeam}>
          <View style={styles.beamGrainLine} />
          <View style={styles.beamIronBoltLeft} />
          <View style={styles.beamIronBoltRight} />
        </View>

        {/* CỤM DÂY THỪNG THÒNG LỌNG + AVATAR NẠN NHÂN (CÙNG RƠI & ĐU ĐƯA) */}
        <Animated.View
          style={[
            styles.hangingBodyWrap,
            {
              transform: [
                { translateY: dropTranslateY },
                { translateX: trembleAnim },
                { rotate: swingRotate },
              ],
            },
          ]}
        >
          {/* SỢI DÂY THỪNG BỆN THÒNG LỌNG RỦ XUỐNG */}
          <Animated.View
            style={[
              styles.ropeVertical,
              {
                height: ropeLengthAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 60],
                }),
              },
            ]}
          >
            <View style={styles.ropeTexture} />
          </Animated.View>

          {/* NÚT THẮT DÂY THỪNG THÒNG LỌNG TO CHẮC CHẮN */}
          <View style={styles.nooseKnot}>
            <Text style={styles.nooseKnotEmoji}>🪢</Text>
          </View>

          {/* KHUNG AVATAR NẠN NHÂN NẰM TRỌN TRONG THÒNG LỌNG */}
          <View
            style={[
              styles.avatarFrame,
              revealedWolf && styles.avatarFrameWolf,
              revealedHunter && styles.avatarFrameHunter,
              isFallen && styles.avatarFrameDead,
            ]}
          >
            {/* Nếu là Sói đã lộ diện: Hiển thị hình ảnh Ma Sói werewolf.jpg hung tợn */}
            {revealedWolf ? (
              <Animated.View
                style={[
                  styles.wolfAvatarInner,
                  {
                    transform: [{ scale: wolfRevealScale }],
                  },
                ]}
              >
                <Image
                  source={wolfImg}
                  style={[styles.avatarImage, isFallen && styles.avatarGrayscale]}
                  resizeMode="cover"
                />
                {/* Ánh mắt đỏ rực nhấp nháy của Ma Sói */}
                {!isFallen && (
                  <Animated.View
                    style={[
                      styles.wolfGlowAura,
                      {
                        opacity: wolfAuraPulse,
                      },
                    ]}
                    pointerEvents="none"
                  />
                )}
              </Animated.View>
            ) : revealedHunter ? (
              <Animated.View
                style={[
                  styles.wolfAvatarInner,
                  {
                    transform: [{ scale: hunterRevealScale }],
                  },
                ]}
              >
                <Image
                  source={hunterImg}
                  style={[styles.avatarImage, isFallen && styles.avatarGrayscale]}
                  resizeMode="cover"
                />
                {!isFallen && (
                  <View style={styles.hunterAuraOverlay} pointerEvents="none" />
                )}
              </Animated.View>
            ) : isCustomImage ? (
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
              {isFallen && !revealedWolf && !isHunter && <Text style={styles.deathSkullWatermark}>💀</Text>}
            </Animated.View>

            {/* Vòng dây thòng lọng ôm quanh ngực/cổ */}
            <View style={[styles.nooseLoopBorder, isHunter && styles.nooseLoopBorderHunter]} />
          </View>

          {/* HẠT HUYẾT SÁT & KHÓI ĐỎ BẮN RA KHI SÓI LỘ NGUYÊN HÌNH */}
          {revealedWolf && (
            <View style={styles.wolfEmbersWrap} pointerEvents="none">
              {WOLF_EMBER_PARTICLES.map((item) => {
                const eX = wolfEmbersAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, item.targetX],
                });
                const eY = wolfEmbersAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, item.targetY],
                });
                const eOpacity = wolfEmbersAnim.interpolate({
                  inputRange: [0, 0.2, 0.75, 1],
                  outputRange: [0, 1, 0.8, 0],
                });
                return (
                  <Animated.View
                    key={item.id}
                    style={[
                      styles.wolfEmberItem,
                      {
                        opacity: eOpacity,
                        transform: [{ translateX: eX }, { translateY: eY }],
                      },
                    ]}
                  >
                    <Text style={{ fontSize: item.size }}>{item.char}</Text>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* BỤC GỖ ĐOẠN ĐẦU ĐÀI (TRAPDOOR PLATFORM) PHÍA DƯỚI */}
        <View style={styles.trapdoorPlatform}>
          {/* Cánh cửa gỗ bên trái sập xuống */}
          <Animated.View
            style={[
              styles.trapdoorFlap,
              styles.trapdoorFlapLeft,
              {
                transform: [
                  {
                    rotateZ: trapdoorAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '68deg'],
                    }),
                  },
                ],
              },
            ]}
          />
          {/* Cánh cửa gỗ bên phải sập xuống */}
          <Animated.View
            style={[
              styles.trapdoorFlap,
              styles.trapdoorFlapRight,
              {
                transform: [
                  {
                    rotateZ: trapdoorAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '-68deg'],
                    }),
                  },
                ],
              },
            ]}
          />
          {/* Khung đỡ bục gỗ hai bên */}
          <View style={styles.platformPillarLeft} />
          <View style={styles.platformPillarRight} />
        </View>

        {/* MẢNH GỖ & LÔNG QUẠ BAY TẢ TƠI KHI SẬP BỤC */}
        <View style={styles.debrisContainer} pointerEvents="none">
          {DEBRIS_DATA.map((item) => {
            const debrisX = debrisAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, item.targetX],
            });
            const debrisY = debrisAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, item.targetY],
            });
            const debrisOpacity = debrisAnim.interpolate({
              inputRange: [0, 0.15, 0.8, 1],
              outputRange: [0, 1, 0.75, 0],
            });
            const debrisRotate = debrisAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', item.id % 2 === 0 ? '180deg' : '-180deg'],
            });

            return (
              <Animated.View
                key={item.id}
                style={[
                  styles.debrisItem,
                  {
                    opacity: debrisOpacity,
                    transform: [
                      { translateX: debrisX },
                      { translateY: debrisY },
                      { rotate: debrisRotate },
                    ],
                  },
                ]}
              >
                <Text style={{ fontSize: item.size }}>{item.char}</Text>
              </Animated.View>
            );
          })}
        </View>

        {/* BẢNG TÊN NẠN NHÂN */}
        <View style={[styles.namePlate, revealedWolf && styles.namePlateWolf, revealedHunter && styles.namePlateHunter, isFallen && styles.namePlateDead]}>
          <Text style={[styles.namePlateLabel, revealedWolf && styles.namePlateLabelWolf, revealedHunter && styles.namePlateLabelHunter]}>
            {revealedWolf ? 'MA SÓI ĐÃ LỘ DIỆN' : revealedHunter ? 'THỢ SĂN TRĂN TRỐI' : 'KẺ BỊ PHÁN QUYẾT'}
          </Text>
          <Text style={[styles.namePlateText, isFallen && styles.namePlateTextDead]} numberOfLines={1}>
            {target.name}
          </Text>
        </View>

        {/* HUY HIỆU TỬ NẠN TREO CỔ */}
        <Animated.View
          style={[
            styles.deathBadge,
            {
              opacity: deathBadgeOpacity,
              transform: [{ scale: deathBadgeScale }],
            },
          ]}
        >
          <View style={[styles.deathBadgeInner, revealedWolf && styles.deathBadgeInnerWolf, revealedHunter && styles.deathBadgeInnerHunter]}>
            <Text style={[styles.deathBadgeTitle, revealedWolf && styles.deathBadgeTitleWolf, revealedHunter && styles.deathBadgeTitleHunter]}>
              {revealedWolf
                ? '🐺 MA SÓI ĐÃ BỊ DÂN LÀNG TREO CỔ!'
                : revealedHunter
                ? '🏹 PHÁT SÚNG TRĂN TRỐI ĐƯỢC KÍCH HOẠT!'
                : '⚰️ ĐÃ BỊ DÂN LÀNG TREO CỔ'}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* DÒNG CHỮ THÔNG BÁO BÊN DƯỚI */}
      <Animated.View
        style={[
          styles.announceBox,
          revealedWolf && styles.announceBoxWolf,
          revealedHunter && styles.announceBoxHunter,
          {
            opacity: announceOpacity,
            transform: [{ translateY: announceTranslateY }],
          },
        ]}
      >
        <Text style={styles.announceText}>
          {revealedWolf ? (
            <>
              <Text style={styles.announceHighlightWolf}>{target.name}</Text> đã lộ nguyên hình là <Text style={{ color: '#EF4444', fontWeight: '900' }}>MA SÓI</Text> và bị trừng trị thích đáng trước công lý dân làng!
            </>
          ) : revealedHunter ? (
            <>
              Thợ Săn <Text style={styles.announceHighlightHunter}>{target.name}</Text> ngã xuống nhưng nỏ đã giương tên — <Text style={{ color: '#FDE047', fontWeight: '900' }}>Một kẻ sắp phải đền mạng theo!</Text>
            </>
          ) : (
            <>
              <Text style={styles.announceHighlight}>{target.name}</Text> đã bị toàn bộ dân làng biểu quyết xử tử trên đoạn đầu đài!
            </>
          )}
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
    backgroundColor: 'rgba(6, 4, 10, 0.96)',
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
    backgroundColor: 'rgba(180, 83, 9, 0.25)',
    borderWidth: 1.5,
    borderColor: '#D97706',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagBadgeWolf: {
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
    borderColor: '#EF4444',
  },
  tagBadgeHunter: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    borderColor: '#FBBF24',
  },
  tagBadgeText: {
    color: '#FDE68A',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  tagBadgeTextWolf: {
    color: '#FCA5A5',
  },
  tagBadgeTextHunter: {
    color: '#FEF08A',
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
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  floatingChantText: {
    color: '#FDE68A',
    fontSize: 14.5,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(217, 119, 6, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  floatingChantTextWolf: {
    color: '#EF4444',
    textShadowColor: 'rgba(220, 38, 38, 0.95)',
    fontSize: 16,
    letterSpacing: 0.8,
  },
  floatingChantTextHunter: {
    color: '#FBBF24',
    textShadowColor: 'rgba(245, 158, 11, 0.95)',
    fontSize: 16,
    letterSpacing: 0.8,
  },

  // DÒNG CHỮ VÀNG KIM CHẠY LÊN CỦA THỢ SĂN
  hunterVowWrapper: {
    position: 'absolute',
    top: -55,
    zIndex: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hunterVowGlowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 18, 10, 0.94)',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 9,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 18,
    elevation: 16,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 25px rgba(245, 158, 11, 0.85), inset 0 0 12px rgba(251, 191, 36, 0.3)' } : {}),
  },
  hunterVowText: {
    color: '#FEF08A',
    fontSize: 16.5,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0.8,
    marginHorizontal: 8,
    textShadowColor: 'rgba(245, 158, 11, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  hunterVowIcon: {
    fontSize: 18,
  },
  hunterParticlesWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 42,
  },
  hunterParticleItem: {
    position: 'absolute',
  },

  // XÀ NGANG GỖ GIÁ TREO CỔ
  gallowsBeam: {
    width: 220,
    height: 18,
    backgroundColor: '#78350F',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#451A03',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
    justifyContent: 'center',
  },
  beamGrainLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#92400E',
    alignSelf: 'center',
  },
  beamIronBoltLeft: {
    position: 'absolute',
    left: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#64748B',
  },
  beamIronBoltRight: {
    position: 'absolute',
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#64748B',
  },

  // CỤM DÂY THỪNG + AVATAR NẠN NHÂN
  hangingBodyWrap: {
    alignItems: 'center',
    position: 'relative',
    zIndex: 15,
  },
  ropeVertical: {
    width: 6,
    backgroundColor: '#B45309',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#78350F',
    alignItems: 'center',
  },
  ropeTexture: {
    width: 2,
    height: '100%',
    backgroundColor: '#D97706',
  },
  nooseKnot: {
    marginTop: -8,
    marginBottom: -6,
    zIndex: 20,
  },
  nooseKnotEmoji: {
    fontSize: 26,
  },

  // KHUNG AVATAR
  avatarFrame: {
    width: 155,
    height: 155,
    borderRadius: 77.5,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#D97706',
    position: 'relative',
    backgroundColor: '#1C1917',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 20,
    elevation: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFrameWolf: {
    borderColor: '#DC2626',
    shadowColor: '#EF4444',
    shadowRadius: 26,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 30px rgba(220, 38, 38, 0.95)' } : {}),
  },
  avatarFrameHunter: {
    borderColor: '#F59E0B',
    shadowColor: '#FBBF24',
    shadowRadius: 24,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 25px rgba(245, 158, 11, 0.9)' } : {}),
  },
  avatarFrameDead: {
    borderColor: '#475569',
    shadowColor: '#64748B',
    shadowRadius: 14,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 15px rgba(100, 116, 139, 0.6)' } : {}),
  },
  wolfAvatarInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wolfGlowAura: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
    borderWidth: 3,
    borderColor: '#EF4444',
    borderRadius: 77.5,
  },
  hunterAuraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 3,
    borderColor: '#F59E0B',
    borderRadius: 77.5,
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
    fontSize: 70,
  },
  avatarGrayscale: {
    opacity: 0.35,
  },
  fallenMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0C0A09',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
  },
  deathSkullWatermark: {
    fontSize: 55,
    opacity: 0.75,
  },
  nooseLoopBorder: {
    position: 'absolute',
    top: 4,
    left: 8,
    right: 8,
    bottom: 4,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(217, 119, 6, 0.45)',
    borderStyle: 'dashed',
    zIndex: 10,
    pointerEvents: 'none',
  },
  nooseLoopBorderHunter: {
    borderColor: 'rgba(245, 158, 11, 0.6)',
  },

  // HẠT HUYẾT SÁT SÓI
  wolfEmbersWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 22,
  },
  wolfEmberItem: {
    position: 'absolute',
  },

  // BỤC GỖ ĐOẠN ĐẦU ĐÀI (TRAPDOOR PLATFORM)
  trapdoorPlatform: {
    width: 200,
    height: 35,
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    position: 'relative',
    zIndex: 10,
  },
  trapdoorFlap: {
    width: 85,
    height: 12,
    backgroundColor: '#78350F',
    borderWidth: 1.5,
    borderColor: '#451A03',
    borderRadius: 2,
  },
  trapdoorFlapLeft: {
    marginRight: 2,
  },
  trapdoorFlapRight: {
    marginLeft: 2,
  },
  platformPillarLeft: {
    position: 'absolute',
    left: 10,
    top: 0,
    width: 14,
    height: 35,
    backgroundColor: '#451A03',
    borderWidth: 1,
    borderColor: '#291102',
  },
  platformPillarRight: {
    position: 'absolute',
    right: 10,
    top: 0,
    width: 14,
    height: 35,
    backgroundColor: '#451A03',
    borderWidth: 1,
    borderColor: '#291102',
  },

  // MẢNH VỤN GỖ & LÔNG QUẠ
  debrisContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 18,
  },
  debrisItem: {
    position: 'absolute',
  },

  // BẢNG TÊN NẠN NHÂN
  namePlate: {
    marginTop: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(28, 25, 23, 0.92)',
    paddingHorizontal: 22,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(217, 119, 6, 0.65)',
  },
  namePlateWolf: {
    borderColor: 'rgba(220, 38, 38, 0.8)',
    backgroundColor: 'rgba(38, 16, 16, 0.94)',
  },
  namePlateHunter: {
    borderColor: 'rgba(245, 158, 11, 0.85)',
    backgroundColor: 'rgba(35, 24, 12, 0.94)',
  },
  namePlateDead: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderColor: 'rgba(100, 116, 139, 0.65)',
  },
  namePlateLabel: {
    color: '#FDE68A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  namePlateLabelWolf: {
    color: '#FCA5A5',
  },
  namePlateLabelHunter: {
    color: '#FEF08A',
  },
  namePlateText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  namePlateTextDead: {
    color: '#CBD5E1',
  },
  deathBadge: {
    marginTop: 10,
  },
  deathBadgeInner: {
    backgroundColor: '#78350F',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D97706',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  deathBadgeInnerWolf: {
    backgroundColor: '#991B1B',
    borderColor: '#EF4444',
    shadowColor: '#DC2626',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 15px rgba(220, 38, 38, 0.8)' } : {}),
  },
  deathBadgeInnerHunter: {
    backgroundColor: '#B45309',
    borderColor: '#F59E0B',
    shadowColor: '#FBBF24',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 15px rgba(245, 158, 11, 0.8)' } : {}),
  },
  deathBadgeTitle: {
    color: '#FEF3C7',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  deathBadgeTitleWolf: {
    color: '#FEE2E2',
  },
  deathBadgeTitleHunter: {
    color: '#FEF9C3',
  },
  announceBox: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: 'rgba(28, 25, 23, 0.9)',
    borderWidth: 1.2,
    borderColor: 'rgba(217, 119, 6, 0.45)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  announceBoxWolf: {
    borderColor: 'rgba(220, 38, 38, 0.65)',
    backgroundColor: 'rgba(40, 16, 16, 0.92)',
  },
  announceBoxHunter: {
    borderColor: 'rgba(245, 158, 11, 0.65)',
    backgroundColor: 'rgba(38, 26, 12, 0.92)',
  },
  announceText: {
    color: '#E2E8F0',
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  announceHighlight: {
    color: '#FBBF24',
    fontWeight: '900',
  },
  announceHighlightWolf: {
    color: '#F87171',
    fontWeight: '900',
  },
  announceHighlightHunter: {
    color: '#FDE047',
    fontWeight: '900',
  },
  bottomBar: {
    height: 10,
    width: '100%',
  },
});
