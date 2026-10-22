// ============================================
// 🐺 MA SÓI - Sound Effects (Web Audio API)
// Âm thanh tiếng Sói hú ban đêm & Tiếng Gà gáy trời sáng
// ============================================

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * 🐺 Phát tiếng Sói hú trong sương đêm
 */
export function playWolfHowl() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 3.6;

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.35, now + 0.8);
    masterGain.gain.setValueAtTime(0.35, now + 1.8);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    masterGain.connect(ctx.destination);

    // Filter để âm thanh trầm đục, vang xa trong sương đêm
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.linearRampToValueAtTime(1100, now + 1.0);
    filter.frequency.linearRampToValueAtTime(600, now + duration);
    filter.Q.value = 4.0;
    filter.connect(masterGain);

    // Delay/Reverb giả lập tiếng vang vọng ngôi làng
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.28;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.35;
    masterGain.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(ctx.destination);

    // Oscillator chính (tiếng hú vút lên rồi lượn xuống)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.9);
    osc.frequency.setValueAtTime(580, now + 1.6);
    osc.frequency.exponentialRampToValueAtTime(260, now + duration);

    // LFO rung nhẹ âm sắc (Vibrato)
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5; // 5.5Hz rung
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 14;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Oscillator phụ (trầm dày, 1 quãng tám dưới)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(290, now + 0.9);
    subOsc.frequency.setValueAtTime(290, now + 1.6);
    subOsc.frequency.exponentialRampToValueAtTime(130, now + duration);

    osc.connect(filter);
    subOsc.connect(filter);

    osc.start(now);
    subOsc.start(now);
    lfo.start(now + 0.6);

    osc.stop(now + duration);
    subOsc.stop(now + duration);
    lfo.stop(now + duration);
  } catch (err) {
    console.warn('Không thể phát tiếng Sói hú:', err);
  }
}

/**
 * 🐓 Phát tiếng Gà gáy báo hiệu trời sáng: Ò ó o o!
 */
export function playRoosterCrow() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Gồm 4 nốt đặc trưng của tiếng gà: Ò (trầm) -> Ó (vút cao) -> O (giữa) -> Ooooo (ngân dài)
    const notes = [
      { start: 0.0, dur: 0.28, freqStart: 380, freqEnd: 460, peakVol: 0.3 },
      { start: 0.32, dur: 0.42, freqStart: 540, freqEnd: 720, peakVol: 0.45 },
      { start: 0.78, dur: 0.32, freqStart: 510, freqEnd: 590, peakVol: 0.35 },
      { start: 1.15, dur: 1.5, freqStart: 660, freqEnd: 480, peakVol: 0.5 },
    ];

    notes.forEach(({ start, dur, freqStart, freqEnd, peakVol }) => {
      const noteTime = now + start;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(peakVol, noteTime + 0.06);
      gain.gain.setValueAtTime(peakVol, noteTime + dur - 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + dur);

      // Bandpass filter tạo chất giọng the thé của gà trống
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1600;
      filter.Q.value = 3.5;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freqStart, noteTime);
      osc.frequency.exponentialRampToValueAtTime(freqEnd, noteTime + dur);

      // Thêm chút vibrato cho nốt ngân dài cuối cùng
      if (dur > 1.0) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 6.0;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 12;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(noteTime + 0.3);
        lfo.stop(noteTime + dur);
      }

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + dur);
    });
  } catch (err) {
    console.warn('Không thể phát tiếng Gà gáy:', err);
  }
}
