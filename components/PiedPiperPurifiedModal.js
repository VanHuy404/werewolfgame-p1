// ============================================
// 🎶 MA SÓI - PiedPiperDeathModal (Hoạt ảnh Người Thổi Sáo Tử Nạn)
// Thiết kế độc quyền khác hoàn toàn các role khác:
// 1. Không hiển thị avatar đằng sau — Sân khấu tập trung 100% vào Cây Sáo Thần nằm ngang lơ lửng
// 2. Cây sáo xoay góc 34deg chuẩn xác nằm trọn vẹn phẳng phiu trong viền hào quang tím đằng sau
// 3. 19 nốt nhạc ma thuật tím/vàng/xanh bồng bềnh lơ lửng xung quanh cây sáo
// 4. Không cần phần text ở dưới — Dòng chữ chạy bên trên cây sáo như cách dùng của Phù Thủy:
//    - Dòng chữ màu tím huyền bí với nốt nhạc: "🎶 Người thổi sáo "[Tên người chơi]" đã chết 🎵"
// 5. Sau đó sáo chuyển qua ảnh vỡ nát kèm đòn chí mạng chấn động & SFX tiếng tre gãy + tiếng sáo rít lần cuối
// 6. SAU KHI SÁO VỠ thì mới hiển thị: "✨ Lời nguyền tiếng sáo đã bị hóa giải ✨"
// 7. Tự động đóng sau khi hoạt ảnh kết thúc đúng 1.0s (chạy ngầm chuyển sang Thanh Tẩy Hoàng Kim)
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

const fluteImg = require('../assets/flute.png');
const fluteBrokenImg = require('../assets/flute_broken.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 19 nốt nhạc ma thuật bay bồng bềnh xung quanh cây sáo (phạm vi 15-20 chiếc)
const SWARM_NOTES = [
  // Phía trên bên trái
  { id: 1, symbol: '🎶', size: 22, x: -150, y: -90, color: '#C084FC' },
  { id: 2, symbol: '♪', size: 16, x: -110, y: -115, color: '#E9D5FF' },
  { id: 3, symbol: '🎵', size: 20, x: -70, y: -95, color: '#FDE047' },
  { id: 4, symbol: '♫', size: 17, x: -30, y: -120, color: '#D8B4FE' },

  // Phía trên bên phải
  { id: 5, symbol: '♬', size: 19, x: 25, y: -115, color: '#38BDF8' },
  { id: 6, symbol: '♩', size: 16, x: 70, y: -95, color: '#E9D5FF' },
  { id: 7, symbol: '🎶', size: 22, x: 115, y: -120, color: '#C084FC' },
  { id: 8, symbol: '🎵', size: 20, x: 155, y: -85, color: '#FDE047' },

  // Hai bên sườn sáo
  { id: 9, symbol: '𝄞', size: 26, x: -168, y: -15, color: '#FDE047' },
  { id: 10, symbol: '♪', size: 16, x: -155, y: 35, color: '#E9D5FF' },
  { id: 11, symbol: '𝄢', size: 24, x: 168, y: -10, color: '#C084FC' },
  { id: 12, symbol: '♫', size: 18, x: 155, y: 40, color: '#38BDF8' },

  // Phía dưới sườn sáo
  { id: 13, symbol: '♬', size: 20, x: -135, y: 90, color: '#D8B4FE' },
  { id: 14, symbol: '♩', size: 16, x: -90, y: 110, color: '#E9D5FF' },
  { id: 15, symbol: '🎶', size: 22, x: -45, y: 95, color: '#FDE047' },
  { id: 16, symbol: '♪', size: 16, x: 0, y: 115, color: '#C084FC' },
  { id: 17, symbol: '🎵', size: 20, x: 55, y: 95, color: '#38BDF8' },
  { id: 18, symbol: '♫', size: 18, x: 105, y: 110, color: '#E9D5FF' },
  { id: 19, symbol: '♬', size: 19, x: 145, y: 90, color: '#C084FC' },
];

// 24 tia năng lượng ma thuật và nốt nhạc tím/xanh/vàng bắn tung tóe khi sáo gãy
const NUM_MAGIC_SPARKS = 24;
const MAGIC_SPARKS = Array.from({ length: NUM_MAGIC_SPARKS }, (_, i) => {
  const angle = (i / NUM_MAGIC_SPARKS) * 2 * Math.PI + ((i % 4) * 0.15 - 0.075);
  const dist = 110 + (i % 6) * 32;
  const size = i % 4 === 0 ? 14 : i % 2 === 0 ? 9 : 6;
  return {
    id: i,
    targetX: Math.cos(angle) * dist,
    targetY: Math.sin(angle) * dist,
    size,
    color: i % 4 === 0 ? '#FDE047' : i % 3 === 0 ? '#38BDF8' : i % 2 === 0 ? '#C084FC' : '#EF4444',
  };
});

/**
 * Âm thanh tổng hợp bằng Web Audio API
 */
export function playSynthSound(type) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'drone') {
      // Tiếng sáo ma mị văng vẳng ban đầu khi sáo nguyên vẹn xuất hiện
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(392, ctx.currentTime + 1.2);

      const tremolo = ctx.createOscillator();
      const tremoloGain = ctx.createGain();
      tremolo.frequency.value = 5.0;
      tremoloGain.gain.value = 8;
      tremolo.connect(osc.frequency);
      tremolo.start(ctx.currentTime);
      tremolo.stop(ctx.currentTime + 1.3);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.3);
    } else if (type === 'shatter') {
      // 1. SFX TIẾNG TRE NỨT GÃY (Bamboo Crack / Splinter / Crunch)
      const bufferSize = Math.floor(ctx.sampleRate * 0.35);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(3400, ctx.currentTime);
      bandpass.Q.setValueAtTime(3.2, ctx.currentTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.75, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      whiteNoise.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      whiteNoise.start(ctx.currentTime);

      // Thêm tiếng đứt gãy đanh giòn (Snap click)
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = 'triangle';
      snapOsc.frequency.setValueAtTime(900, ctx.currentTime);
      snapOsc.frequency.exponentialRampToValueAtTime(75, ctx.currentTime + 0.14);
      snapGain.gain.setValueAtTime(0.65, ctx.currentTime);
      snapGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(ctx.currentTime);
      snapOsc.stop(ctx.currentTime + 0.14);

      // 2. SFX TIẾNG SÁO RÍT LÊN LẦN CUỐI (Dying Flute Screech with pitch drop)
      const fluteOsc = ctx.createOscillator();
      const fluteGain = ctx.createGain();
      fluteOsc.type = 'sine';
      fluteOsc.frequency.setValueAtTime(1400, ctx.currentTime);
      // Rít réo rắt trong 0.12s đầu rồi tụt dốc tần số tắt lịm
      fluteOsc.frequency.setValueAtTime(1450, ctx.currentTime + 0.1);
      fluteOsc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.85);

      const vibOsc = ctx.createOscillator();
      const vibGain = ctx.createGain();
      vibOsc.frequency.value = 16;
      vibGain.gain.value = 55;
      vibOsc.connect(fluteOsc.frequency);
      vibOsc.start(ctx.currentTime);
      vibOsc.stop(ctx.currentTime + 0.85);

      fluteGain.gain.setValueAtTime(0.65, ctx.currentTime);
      fluteGain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.1);
      fluteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);

      fluteOsc.connect(fluteGain);
      fluteGain.connect(ctx.destination);
      fluteOsc.start(ctx.currentTime);
      fluteOsc.stop(ctx.currentTime + 0.85);

      // 3. Sub-bass thud rền vang chấn động
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(120, ctx.currentTime);
      subOsc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.6);
      subGain.gain.setValueAtTime(0.5, ctx.currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(ctx.currentTime);
      subOsc.stop(ctx.currentTime + 0.6);
    }

    setTimeout(() => {
      try { ctx.close(); } catch (e) {}
    }, 2500);
  } catch (err) {}
}

/**
 * Âm thanh hợp âm chuông thánh thót ngân vang khi thanh tẩy trực tiếp trên giao diện chính (Web Audio API)
 */
export function playPurificationSynth() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [
      { freq: 523.25, time: 0.0, dur: 1.8, gain: 0.28 },
      { freq: 659.25, time: 0.15, dur: 1.8, gain: 0.26 },
      { freq: 783.99, time: 0.3, dur: 2.0, gain: 0.28 },
      { freq: 987.77, time: 0.45, dur: 2.2, gain: 0.3 },
      { freq: 1174.66, time: 0.6, dur: 2.4, gain: 0.32 },
      { freq: 1567.98, time: 0.8, dur: 2.8, gain: 0.35 },
    ];

    notes.forEach(({ freq, time, dur, gain: targetGain }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 5.5;
      lfoGain.gain.value = 4.0;
      lfo.connect(osc.frequency);
      lfo.start(ctx.currentTime + time);
      lfo.stop(ctx.currentTime + time + dur);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(targetGain, ctx.currentTime + time + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur);
    });

    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130.81, ctx.currentTime);
    subGain.gain.setValueAtTime(0.001, ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.1);
    subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(ctx.currentTime);
    subOsc.stop(ctx.currentTime + 2.5);

    setTimeout(() => {
      try { ctx.close(); } catch (e) {}
    }, 3500);
  } catch (err) {}
}

export default function PiedPiperPurifiedModal({
  visible = false,
  piedPiper = null,
  duration = 5,
  timeLeft: propTimeLeft,
  onClose,
}) {
  // 'emerging' (sáo nguyên vẹn + chạy chữ tím) -> 'shattered' (sáo vỡ) -> 'lifting' (hiện lời nguyền hóa giải) -> 'fallen' (hoàn tất)
  const [stage, setStage] = useState('emerging');
  const [typedText, setTypedText] = useState('');

  const piper = piedPiper || { name: 'Người Thổi Sáo' };
  const fullChantText = `Người thổi sáo "${piper.name}" đã chết`;

  // Animation values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Cây sáo nguyên vẹn
  const fluteScale = useRef(new Animated.Value(0.7)).current;
  const fluteOpacity = useRef(new Animated.Value(0)).current;
  const fluteFloatAnim = useRef(new Animated.Value(0)).current;

  // Hào quang ma thuật viền tím sau cây sáo
  const auraGlowScale = useRef(new Animated.Value(0.95)).current;
  const auraGlowOpacity = useRef(new Animated.Value(0)).current;

  // Nốt nhạc bay lơ lửng xung quanh cây sáo (4 nhóm pha lặp)
  const noteFloat1 = useRef(new Animated.Value(0)).current;
  const noteFloat2 = useRef(new Animated.Value(0)).current;
  const noteFloat3 = useRef(new Animated.Value(0)).current;
  const noteFloat4 = useRef(new Animated.Value(0)).current;

  // Dòng 2: "Lời nguyền tiếng sáo đã bị hóa giải" CHỈ HIỆN SAU KHI SÁO VỠ
  const line2TranslateY = useRef(new Animated.Value(20)).current;
  const line2Opacity = useRef(new Animated.Value(0)).current;

  // Cây sáo gãy đôi với nốt nhạc ma thuật rực rỡ
  const brokenFluteOpacity = useRef(new Animated.Value(0)).current;
  const brokenFluteScale = useRef(new Animated.Value(0.7)).current;
  const brokenFluteRotate = useRef(new Animated.Value(0)).current;

  // Hạt ma thuật bắn tung tóe
  const sparkExplosionAnim = useRef(new Animated.Value(0)).current;

  const resetAnimations = () => {
    backdropAnim.setValue(0);
    shakeAnim.setValue(0);
    flashAnim.setValue(0);
    fluteScale.setValue(0.7);
    fluteOpacity.setValue(0);
    fluteFloatAnim.setValue(0);
    auraGlowScale.setValue(0.95);
    auraGlowOpacity.setValue(0);
    noteFloat1.setValue(0);
    noteFloat2.setValue(0);
    noteFloat3.setValue(0);
    noteFloat4.setValue(0);
    line2TranslateY.setValue(20);
    line2Opacity.setValue(0);
    brokenFluteOpacity.setValue(0);
    brokenFluteScale.setValue(0.7);
    brokenFluteRotate.setValue(0);
    sparkExplosionAnim.setValue(0);
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

    // 1. GIAI ĐOẠN 1 (T=0): CÂY SÁO NGUYÊN VẸN NẰM NGANG TRONG KHUNG VIỀN TÍM + 19 NỐT NHẠC XUNG QUANH
    playSynthSound('drone');

    // Nhấp nhô bồng bềnh nhẹ nhàng cho cây sáo
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(fluteFloatAnim, { toValue: -5, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(fluteFloatAnim, { toValue: 5, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    floatLoop.start();

    // Hào quang ma mị phập phồng
    const auraLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(auraGlowScale, { toValue: 1.05, duration: 700, useNativeDriver: true }),
        Animated.timing(auraGlowScale, { toValue: 0.96, duration: 700, useNativeDriver: true }),
      ])
    );
    auraLoop.start();

    // 4 luồng nốt nhạc bồng bềnh so le nhịp nhàng khắp xung quanh
    const noteLoop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(noteFloat1, { toValue: -6, duration: 650, useNativeDriver: true }),
        Animated.timing(noteFloat1, { toValue: 6, duration: 650, useNativeDriver: true }),
      ])
    );
    const noteLoop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(noteFloat2, { toValue: 6, duration: 800, useNativeDriver: true }),
        Animated.timing(noteFloat2, { toValue: -6, duration: 800, useNativeDriver: true }),
      ])
    );
    const noteLoop3 = Animated.loop(
      Animated.sequence([
        Animated.timing(noteFloat3, { toValue: -7, duration: 950, useNativeDriver: true }),
        Animated.timing(noteFloat3, { toValue: 7, duration: 950, useNativeDriver: true }),
      ])
    );
    const noteLoop4 = Animated.loop(
      Animated.sequence([
        Animated.timing(noteFloat4, { toValue: 7, duration: 1100, useNativeDriver: true }),
        Animated.timing(noteFloat4, { toValue: -7, duration: 1100, useNativeDriver: true }),
      ])
    );
    noteLoop1.start();
    noteLoop2.start();
    noteLoop3.start();
    noteLoop4.start();

    // Sáo nguyên vẹn xuất hiện
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(fluteScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      Animated.timing(fluteOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(auraGlowOpacity, { toValue: 0.9, duration: 450, useNativeDriver: true }),
    ]).start();

    // Gõ chữ / Chạy chữ màu tím bên trên cây sáo (typewriter như Phù Thủy)
    let charIndex = 0;
    const typingInterval = setInterval(() => {
      charIndex++;
      if (charIndex <= fullChantText.length) {
        setTypedText(fullChantText.slice(0, charIndex));
      } else {
        clearInterval(typingInterval);
      }
    }, 28);

    // 2. GIAI ĐOẠN 2 (T=1350ms): SÁO CHUYỂN QUA ẢNH VỠ + SFX TRE GÃY & SÁO RÍT LẦN CUỐI
    const timerStrike = setTimeout(() => {
      setStage('shattered');
      playSynthSound('shatter');

      // Chớp sáng đỏ / tím giật chớp
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();

      // Rung chấn màn hình dữ dội
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 16, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -14, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -7, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
      ]).start();

      // Cây sáo nguyên vẹn biến mất
      Animated.timing(fluteOpacity, { toValue: 0, duration: 50, useNativeDriver: true }).start();

      // CÂY SÁO GÃY ĐÔI HIỆN RA: BẬT GIẬT NẢY NỞ CHẤN ĐỘNG & BẮN TUNG NỐT NHẠC MA THUẬT
      Animated.parallel([
        Animated.timing(brokenFluteOpacity, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(brokenFluteScale, { toValue: 1.25, duration: 90, useNativeDriver: true }),
          Animated.spring(brokenFluteScale, { toValue: 1.0, friction: 4, tension: 65, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(brokenFluteRotate, { toValue: 1, duration: 45, useNativeDriver: true }),
          Animated.timing(brokenFluteRotate, { toValue: -1, duration: 45, useNativeDriver: true }),
          Animated.timing(brokenFluteRotate, { toValue: 0.5, duration: 45, useNativeDriver: true }),
          Animated.timing(brokenFluteRotate, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]),
        Animated.timing(sparkExplosionAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 1350);

    // 3. GIAI ĐOẠN 3 (T=2050ms): SAU KHI SÁO VỠ THÌ MỚI HIỂN THỊ "Lời nguyền tiếng sáo đã bị hóa giải"
    const timerLine2 = setTimeout(() => {
      setStage('lifting');
      Animated.parallel([
        Animated.timing(line2Opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(line2TranslateY, { toValue: 0, friction: 6, tension: 45, useNativeDriver: true }),
      ]).start();
    }, 2050);

    // 4. GIAI ĐOẠN 4 (T=3450ms): HOÀN TẤT VÀ GIỮ THÊM ĐÚNG 1.0s RỒI TỰ ĐÓNG
    // Thời điểm dòng hóa giải hiện hoàn tất: ~2.05s + 0.4s = ~2.45s
    // Giữ thêm đúng 1.0s => Tổng thời gian = ~3.45s (3450ms)
    const timerAutoClose = setTimeout(() => {
      setStage('fallen');
      if (onClose) onClose();
    }, 3450);

    return () => {
      floatLoop.stop();
      auraLoop.stop();
      noteLoop1.stop();
      noteLoop2.stop();
      noteLoop3.stop();
      noteLoop4.stop();
      clearInterval(typingInterval);
      clearTimeout(timerStrike);
      clearTimeout(timerLine2);
      clearTimeout(timerAutoClose);
    };
  }, [visible]);

  if (!visible) return null;

  // Dao động nhẹ xung quanh 34deg chuẩn xác khi sáo gãy
  const brokenFluteRotateInterpolation = brokenFluteRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['31deg', '34deg', '37deg'],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropAnim }]}>
      {/* Hiệu ứng chớp sáng khi sáo vỡ vụn */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: flashAnim,
            backgroundColor: 'rgba(239, 68, 68, 0.6)',
          },
        ]}
        pointerEvents="none"
      />

      {/* Top Bar Header */}
      <View style={styles.topBar}>
        <View style={styles.tagBadge}>
          <Text style={styles.tagBadgeText}>⚰️ TIÊU DIỆT NGƯỜI THỔI SÁO</Text>
        </View>
        <Text style={styles.topBarHint}>Tiếng Sáo Ma Mị Đã Bị Cắt Đứt</Text>
      </View>

      {/* TRUNG TÂM SÂN KHẤU (DÒNG CHỮ TRÊN CÂY SÁO + CÂY SÁO THẦN NẰM NGANG) */}
      <View style={styles.centerStageWrapper}>
        {/* CÂU THOẠI MÀU TÍM BÊN TRÊN CÂY SÁO VỚI NỐT NHẠC XUNG QUANH */}
        <View style={styles.floatingHeaderContainer}>
          {/* Dòng chữ tím chính kèm 2 nốt nhạc hai bên */}
          <View style={styles.chantRow}>
            <Animated.Text
              style={[
                styles.surroundingNote,
                { transform: [{ translateY: noteFloat1 }] },
              ]}
            >
              🎶
            </Animated.Text>

            <Text style={styles.floatingChantText}>
              {typedText}
            </Text>

            <Animated.Text
              style={[
                styles.surroundingNote,
                { transform: [{ translateY: noteFloat2 }] },
              ]}
            >
              🎵
            </Animated.Text>
          </View>

          {/* DÒNG CHỮ "Lời nguyền tiếng sáo đã bị hóa giải" - CHỈ HIỆN SAU KHI SÁO ĐÃ VỠ */}
          <Animated.View
            style={[
              styles.curseLiftedWrap,
              {
                opacity: line2Opacity,
                transform: [{ translateY: line2TranslateY }],
              },
            ]}
          >
            <View style={styles.curseLiftedBadge}>
              <Text style={styles.sparkleIcon}>✨</Text>
              <Text style={styles.piperCurseLiftedLine}>
                Lời nguyền tiếng sáo đã bị hóa giải
              </Text>
              <Text style={styles.sparkleIcon}>✨</Text>
            </View>
          </Animated.View>
        </View>

        {/* KHÔNG GIAN CÂY SÁO THẦN NẰM NGANG TRONG VIỀN HÀO QUANG TÍM */}
        <Animated.View
          style={[
            styles.stageCenter,
            {
              transform: [
                { translateX: shakeAnim },
                { translateY: fluteFloatAnim },
              ],
            },
          ]}
        >
          {/* KHUNG VIỀN HÀO QUANG TÍM BAO TRỌN VẸN CÂY SÁO NẰM PHẲNG */}
          <Animated.View
            style={[
              styles.fluteAuraGlow,
              {
                transform: [{ scale: auraGlowScale }],
                opacity: auraGlowOpacity,
              },
            ]}
            pointerEvents="none"
          />

          {/* 19 NỐT NHẠC MA THUẬT LƠ LỬNG XUNG QUANH CÂY SÁO */}
          {SWARM_NOTES.map((n) => {
            const anim = n.id % 4 === 0 ? noteFloat1 : n.id % 4 === 1 ? noteFloat2 : n.id % 4 === 2 ? noteFloat3 : noteFloat4;
            return (
              <Animated.Text
                key={n.id}
                style={[
                  styles.swarmNoteItem,
                  {
                    left: '50%',
                    top: '50%',
                    marginLeft: n.x,
                    marginTop: n.y,
                    fontSize: n.size,
                    color: n.color,
                    textShadowColor: n.color,
                    transform: [{ translateY: anim }],
                  },
                ]}
                pointerEvents="none"
              >
                {n.symbol}
              </Animated.Text>
            );
          })}

          {/* CÂY SÁO NGUYÊN VẸN NẰM NGANG PHẲNG PHIU TRONG KHUNG VIỀN (GÓC 34DEG) */}
          <Animated.View
            style={[
              styles.horizontalFluteWrap,
              {
                opacity: fluteOpacity,
                transform: [
                  { scale: fluteScale },
                  { rotate: '34deg' },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <Image source={fluteImg} style={styles.fluteImageBig} resizeMode="contain" />
          </Animated.View>

          {/* CÂY SÁO GÃY ĐÔI NẰM NGANG VỚI NỐT NHẠC BUNG TỎA (KHI BỊ ĐÒN CHÍ MẠNG) */}
          <Animated.View
            style={[
              styles.horizontalFluteWrap,
              {
                opacity: brokenFluteOpacity,
                transform: [
                  { scale: brokenFluteScale },
                  { rotate: brokenFluteRotateInterpolation },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <Image
              source={fluteBrokenImg}
              style={styles.fluteImageBig}
              resizeMode="contain"
            />
          </Animated.View>

          {/* HẠT NĂNG LƯỢNG & NỐT NHẠC MA THUẬT BẮN TUNG TÓE KHI VỠ */}
          <View style={styles.sparksContainer} pointerEvents="none">
            {MAGIC_SPARKS.map((spark) => {
              const dropX = sparkExplosionAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, spark.targetX],
              });
              const dropY = sparkExplosionAnim.interpolate({
                inputRange: [0, 0.65, 1],
                outputRange: [0, spark.targetY - 20, spark.targetY + 45],
              });
              const dropOpacity = sparkExplosionAnim.interpolate({
                inputRange: [0, 0.15, 0.8, 1],
                outputRange: [0, 1, 0.8, 0],
              });
              const dropScale = sparkExplosionAnim.interpolate({
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
        </Animated.View>
      </View>

      {/* Bottom Bar: Giữ khoảng cách giao diện cân đối */}
      <View style={styles.bottomBar} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 14, 0.96)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 28,
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
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
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
  centerStageWrapper: {
    width: '100%',
    maxWidth: 540,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  // Câu thoại nổi màu tím bên trên cây sáo kèm các nốt nhạc
  floatingHeaderContainer: {
    minHeight: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    position: 'relative',
    width: '100%',
    zIndex: 20,
  },
  chantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  surroundingNote: {
    fontSize: 22,
    textShadowColor: 'rgba(192, 132, 252, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  floatingChantText: {
    color: '#E9D5FF',
    fontSize: 19,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(168, 85, 247, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  curseLiftedWrap: {
    marginTop: 10,
    alignItems: 'center',
  },
  curseLiftedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
    borderWidth: 1.2,
    borderColor: 'rgba(192, 132, 252, 0.5)',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  sparkleIcon: {
    fontSize: 14,
  },
  piperCurseLiftedLine: {
    color: '#FDE047',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(253, 224, 71, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  stageCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 540,
    height: 220,
    position: 'relative',
  },
  // Khung viền tím bao trọn vẹn cây sáo nằm ngang
  fluteAuraGlow: {
    position: 'absolute',
    width: 340,
    height: 95,
    borderRadius: 48,
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
    borderWidth: 2,
    borderColor: 'rgba(192, 132, 252, 0.7)',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 35,
    elevation: 25,
  },
  swarmNoteItem: {
    position: 'absolute',
    fontWeight: '900',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    zIndex: 12,
  },
  horizontalFluteWrap: {
    position: 'absolute',
    width: 320,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fluteImageBig: {
    width: 320,
    height: 200,
  },
  sparksContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkDot: {
    position: 'absolute',
  },
  bottomBar: {
    height: 20,
    width: '100%',
  },
});
