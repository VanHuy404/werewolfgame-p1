// ============================================
// 🃏 MA SÓI - CardShuffleModal Component
// Hiệu ứng xào bài điện ảnh & lật mở chức năng vai trò
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { COLORS } from '../utils/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 🎴 Danh sách ảnh các lá bài (Cập nhật theo tên file mới)
const CARD_IMAGES = {
  back: require('../assets/cards/card_back.png'),
  wolf: require('../assets/cards/card_maSoi.png'),
  villager: require('../assets/cards/card_danLang.png'),
  hunter: require('../assets/cards/card_thoSan.png'),
  bodyguard: require('../assets/cards/card_baoVe.png'),
  witch: require('../assets/cards/card_phuThuy.png'),
  seer: require('../assets/cards/card_tienTri.png'),
  pied_piper: require('../assets/cards/card_nguoiThoiSao.png'),
  cupid: require('../assets/cards/card_Cupid.png'),
};

// 📜 Danh sách thông tin vai trò, câu cửa miệng và chức năng chi tiết
export const CARD_ROLES = [
  {
    id: 'wolf',
    name: 'Ma Sói',
    emoji: '🐺',
    team: 'Phe Ma Sói',
    themeColor: '#EF4444',
    badge: 'KẺ KHÁT MÁU',
    imageKey: 'wolf',
    quote: '“Nanh vuốt trong bóng đêm, ngôi làng sẽ chìm trong bể máu!”',
    description: 'Thức dậy mỗi đêm cùng bầy sói thống nhất chọn 1 nạn nhân để cắn xé. Ban ngày ẩn mình giữa dân làng và gieo rắc ngờ vực.',
  },
  {
    id: 'villager',
    name: 'Dân Làng',
    emoji: '👨‍🌾',
    team: 'Phe Dân Làng',
    themeColor: '#10B981',
    badge: 'ÁNH SÁNG CÔNG LÝ',
    imageKey: 'villager',
    quote: '“Niềm tin và lý trí là vũ khí duy nhất để vạch trần chân tướng!”',
    description: 'Ngủ yên suốt đêm dài. Ban ngày tỉnh giấc tham gia tranh luận, biểu quyết sáng suốt và dẫn dắt ngôi làng treo cổ Ma Sói.',
  },
  {
    id: 'seer',
    name: 'Tiên Tri',
    emoji: '🔮',
    team: 'Phe Dân Làng',
    themeColor: '#8B5CF6',
    badge: 'MẮT THẦN THẤU SUỐT',
    imageKey: 'seer',
    quote: '“Quả cầu pha lê nhìn thấu tâm can, thiện ác phân minh!”',
    description: 'Mỗi đêm thức giấc soi danh tính 1 người chơi. Quả cầu pha lê sẽ tiết lộ chính xác mục tiêu thuộc PHE THIỆN hay PHE ÁC.',
  },
  {
    id: 'bodyguard',
    name: 'Bảo Vệ',
    emoji: '🛡️',
    team: 'Phe Dân Làng',
    themeColor: '#0EA5E9',
    badge: 'KHIÊN CHẮN BÌNH YÊN',
    imageKey: 'bodyguard',
    quote: '“Chiếc khiên công lý che chở bình yên trước nanh vuốt bóng đêm!”',
    description: 'Mỗi đêm thức giấc đầu tiên chọn 1 người để bảo vệ khỏi sói cắn (không thể bảo vệ 1 người 2 đêm liên tiếp).',
  },
  {
    id: 'witch',
    name: 'Phù Thủy',
    emoji: '🧙‍♀️',
    team: 'Phe Dân Làng',
    themeColor: '#A855F7',
    badge: 'BẬC THẦY DƯỢC LIỆU',
    imageKey: 'witch',
    quote: '“Một bình hồi sinh sự sống, một bình gieo rắc tử thần!”',
    description: 'Sở hữu 1 bình Cứu hồi sinh người bị cắn và 1 bình Độc hạ sát kẻ tình nghi. Mỗi bình dùng duy nhất 1 lần trong cả trận.',
  },
  {
    id: 'hunter',
    name: 'Thợ Săn',
    emoji: '🏹',
    team: 'Phe Dân Làng',
    themeColor: '#F59E0B',
    badge: 'PHÁT SÚNG BÁO THÙ',
    imageKey: 'hunter',
    quote: '“Chết chưa phải là hết, phát súng trăn trối sẽ kéo theo kẻ thù!”',
    description: 'Khi bị Sói cắn hoặc bị treo cổ, lập tức nổ 1 phát súng trăn trối kéo 1 kẻ khác chết cùng (vô hiệu nếu trúng độc Phù Thủy).',
  },
  {
    id: 'pied_piper',
    name: 'Người Thổi Sáo',
    emoji: '🎶',
    team: 'Phe Thứ 3',
    themeColor: '#E879F9',
    badge: 'GIAI ĐIỆU MÊ HOẶC',
    imageKey: 'pied_piper',
    quote: '“Giai điệu ma mị mê hoặc linh hồn, biến cả ngôi làng thành con rối!”',
    description: 'Mỗi đêm gieo bùa mê lên 1-2 người chơi còn sống. Giành CHIẾN THẮNG TUYỆT ĐỐI khi toàn bộ người sống đều bị thôi miên.',
  },
  {
    id: 'cupid',
    name: 'Cupid',
    emoji: '💘',
    team: 'Phe Tình Nhân',
    themeColor: '#EC4899',
    badge: 'MŨI TÊN TÌNH YÊU',
    imageKey: 'cupid',
    quote: '“Mũi tên ái tình gắn kết định mệnh: Sống cùng sống, chết cùng chết!”',
    description: 'Đêm đầu tiên bắn tên ghép đôi 2 người chơi thành cặp Uyên Ương. Nếu một trong hai người chết, người kia sẽ chết theo.',
  },
];

// 🔊 Tổng hợp âm thanh xào bài, lật bài và SFX riêng biệt cho từng phe (đặc biệt là Phe Thứ 3)
function playSynthSound(type, roleId = null) {
  if (Platform.OS !== 'web') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'shuffle') {
      // Âm thanh chẻ bài / xào bài sột soạt (chuỗi 4 tiếng quẹt lách cách)
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          if (ctx.state === 'closed') return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(800 + i * 200, ctx.currentTime);
          filter.Q.setValueAtTime(3, ctx.currentTime);

          // White noise buffer
          const bufferSize = ctx.sampleRate * 0.06;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let j = 0; j < bufferSize; j++) {
            data[j] = Math.random() * 2 - 1;
          }

          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          gain.gain.setValueAtTime(0.18, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start();
        }, i * 65);
      }
    } else if (type === 'deal') {
      // Âm thanh rút bài / miết bài bay ra giữa bàn
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === 'flip') {
      // 1. Âm thanh lật bài giòn giã (Card snap)
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = 'square';
      snapOsc.frequency.setValueAtTime(600, ctx.currentTime);
      snapOsc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);

      snapGain.gain.setValueAtTime(0.2, ctx.currentTime);
      snapGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start();
      snapOsc.stop(ctx.currentTime + 0.08);

      // 2. SFX RIÊNG BIỆT CHO PHE THỨ 3 VÀ TỪNG NHÓM VAI TRÒ
      if (roleId === 'pied_piper') {
        // 🎶 SFX RIÊNG: TIẾNG SÁO MA MỊ CỦA NGƯỜI THỔI SÁO (Phe Thứ 3)
        // Giai điệu sáo ngũ cung du dương uốn lượn có độ rung vibrato
        const fluteNotes = [
          { freq: 587.33, start: 0.06, dur: 0.20, vol: 0.28 }, // D5
          { freq: 739.99, start: 0.24, dur: 0.20, vol: 0.32 }, // F#5
          { freq: 880.00, start: 0.42, dur: 0.24, vol: 0.35 }, // A5
          { freq: 1174.66, start: 0.64, dur: 0.38, vol: 0.38 }, // D6
          { freq: 1318.51, start: 0.98, dur: 0.50, vol: 0.28 }, // E6
        ];

        fluteNotes.forEach(({ freq, start, dur, vol }) => {
          setTimeout(() => {
            if (ctx.state === 'closed') return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            // Rung sóng âm vibrato 6Hz đặc trưng tiếng sáo
            lfo.frequency.setValueAtTime(6, now);
            lfoGain.gain.setValueAtTime(9, now);
            lfo.connect(osc.frequency);
            lfo.start(now);
            lfo.stop(now + dur);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(vol, now + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + dur);
          }, start * 1000);
        });
      } else if (roleId === 'cupid') {
        // 💘 SFX RIÊNG: TIẾNG ĐÀN HẠC TÌNH YÊU & NHỊP TIM THÌNH THỊCH (Cupid / Phe Tình Nhân)
        const harpNotes = [
          { freq: 523.25, time: 0.05 }, // C5
          { freq: 659.25, time: 0.12 }, // E5
          { freq: 783.99, time: 0.19 }, // G5
          { freq: 987.77, time: 0.26 }, // B5
          { freq: 1046.50, time: 0.33 }, // C6
          { freq: 1318.51, time: 0.40 }, // E6
        ];

        harpNotes.forEach(({ freq, time }) => {
          setTimeout(() => {
            if (ctx.state === 'closed') return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
          }, time * 1000);
        });

        // 2 nhịp tim tình ái thump-thump sau tiếng đàn hạc
        setTimeout(() => {
          if (ctx.state === 'closed') return;
          const playHeartbeat = (delay, freq, vol) => {
            setTimeout(() => {
              if (ctx.state === 'closed') return;
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.15);
              gain.gain.setValueAtTime(vol, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.16);
            }, delay);
          };
          playHeartbeat(0, 95, 0.42);
          playHeartbeat(180, 80, 0.35);
        }, 500);
      } else if (roleId === 'wolf') {
        // 🐺 SFX MA SÓI: TIẾNG SÓI TRU BÓNG ĐÊM RÙNG RỢN
        setTimeout(() => {
          if (ctx.state === 'closed') return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = 'sawtooth';
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, ctx.currentTime);
          filter.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.7);

          osc.frequency.setValueAtTime(260, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(310, ctx.currentTime + 0.22);
          osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.7);

          gain.gain.setValueAtTime(0.001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.24, ctx.currentTime + 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.7);
        }, 60);
      } else {
        // 🔮 SFX DÂN LÀNG / TIÊN TRI / BẢO VỆ: CHUÔNG MA THUẬT NGÂN VANG
        setTimeout(() => {
          if (ctx.state === 'closed') return;
          const chime = ctx.createOscillator();
          const chimeGain = ctx.createGain();
          chime.type = 'sine';
          chime.frequency.setValueAtTime(880, ctx.currentTime);
          chime.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.35);

          chimeGain.gain.setValueAtTime(0.15, ctx.currentTime);
          chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

          chime.connect(chimeGain);
          chimeGain.connect(ctx.destination);
          chime.start();
          chime.stop(ctx.currentTime + 0.55);
        }, 50);
      }
    }
  } catch (e) {
    // Web audio unhandled
  }
}

export default function CardShuffleModal({
  visible = false,
  initialRole = null,
  isMatchIntro = false,
  autoCloseSeconds = 6,
  onClose,
}) {
  const [selectedRole, setSelectedRole] = useState(CARD_ROLES[0]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [countdown, setCountdown] = useState(autoCloseSeconds);

  // Kích thước Responsive lá bài hiển thị trung tâm (Chuẩn 205 x 290)
  const cardWidth = Math.min(SCREEN_WIDTH * 0.76, 280);
  const cardHeight = Math.round(cardWidth * (290 / 205)); // Giữ nguyên tỉ lệ chuẩn 205x290

  // Giá trị hoạt ảnh
  const flipAnim = useRef(new Animated.Value(0)).current; // 0deg -> 180deg
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Hoạt ảnh vị trí 5 lá bài lúc đang xào bài
  const deckAnim1 = useRef(new Animated.Value(0)).current;
  const deckAnim2 = useRef(new Animated.Value(0)).current;
  const deckAnim3 = useRef(new Animated.Value(0)).current;
  const deckAnim4 = useRef(new Animated.Value(0)).current;
  const deckAnim5 = useRef(new Animated.Value(0)).current;

  // Đếm ngược tự động vào trận khi ở chế độ Vào Trận (isMatchIntro)
  useEffect(() => {
    if (!visible || !isMatchIntro) return;

    setCountdown(autoCloseSeconds);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onClose) onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, isMatchIntro, autoCloseSeconds]);

  // Khởi động khi mở modal
  useEffect(() => {
    if (visible) {
      if (initialRole === 'random' || !initialRole) {
        const randomRole = CARD_ROLES[Math.floor(Math.random() * CARD_ROLES.length)];
        setSelectedRole(randomRole);
        startShuffleSequence(randomRole);
      } else {
        const role = CARD_ROLES.find((r) => r.id === initialRole) || CARD_ROLES[0];
        setSelectedRole(role);
        startShuffleSequence(role);
      }
    } else {
      // Reset trạng thái
      flipAnim.setValue(0);
      setIsFlipped(false);
      setIsShuffling(false);
    }
  }, [visible, initialRole]);

  // Quy trình xào bài và lật mở
  const startShuffleSequence = (targetRole = null) => {
    const roleToReveal = targetRole || CARD_ROLES[Math.floor(Math.random() * CARD_ROLES.length)];
    setSelectedRole(roleToReveal);
    setIsShuffling(true);
    setIsFlipped(false);

    // Reset các animation
    flipAnim.setValue(0);
    scaleAnim.setValue(0.85);
    glowAnim.setValue(0);

    // 1. Âm thanh xào bài lần 1
    playSynthSound('shuffle');

    // Chạy chuỗi xòe và xào bài
    Animated.parallel([
      Animated.sequence([
        Animated.timing(deckAnim1, { toValue: -65, duration: 250, useNativeDriver: true }),
        Animated.timing(deckAnim1, { toValue: 40, duration: 250, useNativeDriver: true }),
        Animated.timing(deckAnim1, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(deckAnim2, { toValue: 65, duration: 250, useNativeDriver: true }),
        Animated.timing(deckAnim2, { toValue: -40, duration: 250, useNativeDriver: true }),
        Animated.timing(deckAnim2, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(deckAnim3, { toValue: -35, duration: 250, useNativeDriver: true }),
        Animated.timing(deckAnim3, { toValue: 25, duration: 250, useNativeDriver: true }),
        Animated.timing(deckAnim3, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(deckAnim4, { toValue: 35, duration: 250, useNativeDriver: true }),
        Animated.timing(deckAnim4, { toValue: -25, duration: 250, useNativeDriver: true }),
        Animated.timing(deckAnim4, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(deckAnim5, { toValue: -15, duration: 250, useNativeDriver: true }),
        Animated.timing(deckAnim5, { toValue: 15, duration: 250, useNativeDriver: true }),
        Animated.timing(deckAnim5, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
    ]).start();

    // 2. Âm thanh xào bài lần 2 sau 380ms
    setTimeout(() => {
      playSynthSound('shuffle');
    }, 380);

    // 3. Sau 750ms, kết thúc xào, rút 1 lá bài phóng to ra giữa màn hình
    setTimeout(() => {
      setIsShuffling(false);
      playSynthSound('deal');

      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // 4. Sau 350ms tiếp theo, thực hiện lật mặt bài 3D (Flip Card)
      setTimeout(() => {
        // Phát SFX riêng biệt của role (Đặc biệt là Phe Thứ 3: Thổi Sáo / Cupid)
        playSynthSound('flip', roleToReveal.id);
        Animated.timing(flipAnim, {
          toValue: 180,
          duration: 700,
          useNativeDriver: true,
        }).start(() => {
          setIsFlipped(true);
          // Hiệu ứng hào quang phát sáng
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }).start();
        });
      }, 350);
    }, 750);
  };

  // Chọn thủ công 1 vai trò để xem ngay
  const handleSelectRole = (role) => {
    if (isShuffling) return;
    startShuffleSequence(role);
  };

  // Các góc quay interpolate 3D cho 2 mặt bài
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Nút đóng nổi trên cùng góc phải */}
        <TouchableOpacity style={styles.floatingCloseBtn} onPress={onClose} activeOpacity={0.75}>
          <Text style={styles.floatingCloseBtnText}>✕</Text>
        </TouchableOpacity>

        {/* VÙNG SÂN KHẤU CHÍNH: Thẻ bài xào & lật 3D hoàn toàn tự do, không bị đóng khung */}
        <View style={styles.stageContainer}>
            {isShuffling ? (
              // 🔀 Giai đoạn 1: Hiển thị bộ bài đang xòe & xào liên tục
              <View style={[styles.shuffleDeckWrapper, { width: cardWidth, height: cardHeight }]}>
                <Animated.View
                  style={[
                    styles.deckCard,
                    {
                      width: cardWidth * 0.88,
                      height: cardHeight * 0.88,
                      transform: [
                        { translateX: deckAnim1 },
                        { rotate: '-16deg' },
                      ],
                    },
                  ]}
                >
                  <Image source={CARD_IMAGES.back} style={styles.cardImage} resizeMode="cover" />
                </Animated.View>

                <Animated.View
                  style={[
                    styles.deckCard,
                    {
                      width: cardWidth * 0.88,
                      height: cardHeight * 0.88,
                      transform: [
                        { translateX: deckAnim2 },
                        { rotate: '16deg' },
                      ],
                    },
                  ]}
                >
                  <Image source={CARD_IMAGES.back} style={styles.cardImage} resizeMode="cover" />
                </Animated.View>

                <Animated.View
                  style={[
                    styles.deckCard,
                    {
                      width: cardWidth * 0.92,
                      height: cardHeight * 0.92,
                      transform: [
                        { translateX: deckAnim3 },
                        { rotate: '-8deg' },
                      ],
                    },
                  ]}
                >
                  <Image source={CARD_IMAGES.back} style={styles.cardImage} resizeMode="cover" />
                </Animated.View>

                <Animated.View
                  style={[
                    styles.deckCard,
                    {
                      width: cardWidth * 0.92,
                      height: cardHeight * 0.92,
                      transform: [
                        { translateX: deckAnim4 },
                        { rotate: '8deg' },
                      ],
                    },
                  ]}
                >
                  <Image source={CARD_IMAGES.back} style={styles.cardImage} resizeMode="cover" />
                </Animated.View>

                <Animated.View
                  style={[
                    styles.deckCard,
                    {
                      width: cardWidth * 0.95,
                      height: cardHeight * 0.95,
                      transform: [
                        { translateX: deckAnim5 },
                        { rotate: '0deg' },
                      ],
                    },
                  ]}
                >
                  <Image source={CARD_IMAGES.back} style={styles.cardImage} resizeMode="cover" />
                </Animated.View>

                <View style={styles.shufflingBanner}>
                  <Text style={styles.shufflingBannerText}>✨ Đang chẻ & xào bài...</Text>
                </View>
              </View>
            ) : (
              // 🎴 Giai đoạn 2: Lá bài rút ra giữa bàn và Lật 3D sang mặt trước
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                {/* 🌟 VÒNG HÀO QUANG MÀU SẮC RIÊNG BIỆT CHO PHE THỨ 3 VÀ CÁC PHE */}
                {isFlipped && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.cardAuraGlow,
                      {
                        width: cardWidth + 24,
                        height: cardHeight + 24,
                        borderColor: selectedRole.themeColor,
                        backgroundColor: (selectedRole.themeColor || '#A855F7') + '22',
                        opacity: glowAnim,
                        ...(Platform.OS === 'web'
                          ? {
                              boxShadow: `0 0 40px ${selectedRole.themeColor}, 0 0 75px ${selectedRole.themeColor}66`,
                            }
                          : { elevation: 20 }),
                      },
                    ]}
                  />
                )}

                {/* 🏷️ HUY HIỆU PHE SÁNG RỰC (ĐẶC BIỆT NỔI BẬT CHO PHE THỨ 3) */}
                {isFlipped && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.roleTeamBadge,
                      {
                        borderColor: selectedRole.themeColor,
                        backgroundColor: 'rgba(15, 12, 32, 0.92)',
                        opacity: glowAnim,
                        ...(Platform.OS === 'web'
                          ? { boxShadow: `0 0 16px ${selectedRole.themeColor}88` }
                          : { elevation: 8 }),
                      },
                    ]}
                  >
                    <Text style={[styles.roleTeamBadgeText, { color: selectedRole.themeColor }]}>
                      {selectedRole.id === 'pied_piper'
                        ? '🔮 PHE THỨ 3 • GIAI ĐIỆU MÊ HOẶC 🔮'
                        : selectedRole.id === 'cupid'
                        ? '💘 PHE TÌNH NHÂN • ĐỊNH MỆNH KẾT NỐI 💘'
                        : selectedRole.id === 'wolf'
                        ? '🐺 PHE MA SÓI • KẺ SĂN ĐÊM 🐺'
                        : `🛡️ ${selectedRole.team.toUpperCase()} 🛡️`}
                    </Text>
                  </Animated.View>
                )}

                {/* ✨ HIỆU ỨNG HẠT MA THUẬT LƠ LỬNG QUANH THẺ BÀI */}
                {isFlipped && (
                  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                    {(selectedRole.id === 'pied_piper'
                      ? ['🎶', '🎵', '✨', '🎼', '🎶', '✨', '🎵']
                      : selectedRole.id === 'cupid'
                      ? ['💖', '💕', '💘', '✨', '💗', '❤️', '💓']
                      : selectedRole.id === 'wolf'
                      ? ['🩸', '🔥', '🐾', '✨']
                      : ['✨', '✦', '⭐', '✨']
                    ).map((emoji, idx) => (
                      <Animated.Text
                        key={idx}
                        style={[
                          styles.floatingParticle,
                          {
                            left: `${8 + (idx * 14) % 80}%`,
                            bottom: `${15 + (idx * 13) % 65}%`,
                            opacity: glowAnim,
                            fontSize: 18 + (idx % 3) * 5,
                            transform: [
                              {
                                translateY: glowAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [15, -15 - (idx * 4)],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        {emoji}
                      </Animated.Text>
                    ))}
                  </View>
                )}

                <Animated.View
                  style={[
                    styles.cardWrapper,
                    {
                      width: cardWidth,
                      height: cardHeight,
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                >
                  {/* 1. MẶT SAU CỦA LÁ BÀI (Card Back từ ảnh 2) */}
                  <Animated.View
                    style={[
                      styles.cardFace,
                      styles.cardBack,
                      {
                        opacity: backOpacity,
                        transform: [{ perspective: 1000 }, { rotateY: backInterpolate }],
                      },
                    ]}
                  >
                    <Image
                      source={CARD_IMAGES.back}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  </Animated.View>

                  {/* 2. MẶT TRƯỚC CỦA LÁ BÀI (Card Front với viền màu riêng theo từng Phe) */}
                  <Animated.View
                    style={[
                      styles.cardFace,
                      styles.cardFront,
                      {
                        borderColor: isFlipped ? selectedRole.themeColor : '#262238',
                        borderWidth: 2.5,
                        opacity: frontOpacity,
                        transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }],
                      },
                    ]}
                  >
                    <Image
                      source={CARD_IMAGES[selectedRole.imageKey]}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />

                    {/* VÙNG CUỘN GIẤY DA CỔ - NỬA DƯỚI LÁ BÀI */}
                    {/* 1. Phần Câu Cửa Miệng (Nằm ở khoảng trống đầu giấy da trước dòng kẻ) */}
                    <View style={styles.quoteSection}>
                      <Text style={styles.quoteText} numberOfLines={2}>
                        {selectedRole.quote}
                      </Text>
                      <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerGem}>✦</Text>
                        <View style={styles.dividerLine} />
                      </View>
                    </View>

                    {/* 2. Phần Hướng Dẫn / Quyền Năng (Đẩy lên căn chuẩn nằm ở giữa các dòng kẻ) */}
                    <View style={styles.descSection}>
                      <Text
                        style={[
                          styles.descText,
                          { lineHeight: Math.round(cardHeight * 0.0412) },
                        ]}
                        numberOfLines={4}
                      >
                        {selectedRole.description}
                      </Text>
                    </View>
                  </Animated.View>
                </Animated.View>
              </View>
            )}
          </View>

        {/* NÚT THAO TÁC NỔI BÊN DƯỚI - HOÀN TOÀN KHÔNG DÍNH FORM */}
        <View style={styles.floatingFooterActions}>
          {isMatchIntro ? (
            /* Chế độ Vào Trận: Nút sẵn sàng vào trận kèm đếm ngược */
            <TouchableOpacity
              style={styles.matchReadyBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.matchReadyBtnText}>
                ⚔️ Sẵn Sàng Vào Trận ({countdown}s)
              </Text>
            </TouchableOpacity>
          ) : (
            /* Chế độ Thử Nghiệm: Các nút nổi độc lập, không dính form */
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.actionBtnRandom}
                onPress={() => startShuffleSequence(null)}
                activeOpacity={0.85}
                disabled={isShuffling}
              >
                <Text style={styles.actionBtnRandomText}>
                  {isShuffling ? '⏳ Đang xào...' : '🎲 Xào Ngẫu Nhiên'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnReshuffle}
                onPress={() => startShuffleSequence(selectedRole)}
                activeOpacity={0.85}
                disabled={isShuffling}
              >
                <Text style={styles.actionBtnReshuffleText}>
                  🔀 Xào Lại
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtnClose} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.actionBtnCloseText}>✕ Đóng</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 14, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  floatingCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 24 : 44,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  floatingCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Sân khấu chính: Tự do, không bị đóng khung trong hộp
  stageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  shuffleDeckWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  deckCard: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#4A3B2C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  shufflingBanner: {
    position: 'absolute',
    bottom: -20,
    backgroundColor: 'rgba(24, 18, 48, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  shufflingBannerText: {
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Card Flip Container
  cardWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 16,
  },
  cardAuraGlow: {
    position: 'absolute',
    borderRadius: 22,
    borderWidth: 3,
  },
  roleTeamBadge: {
    position: 'absolute',
    top: -26,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTeamBadgeText: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  floatingParticle: {
    position: 'absolute',
    ...(Platform.OS === 'web'
      ? { filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.7))' }
      : {}),
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    backgroundColor: '#1A1423',
    borderWidth: 2,
  },
  cardBack: {
    borderColor: '#5B4028',
  },
  cardFront: {
    borderColor: '#262238',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardBackEmboss: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cardBackHint: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // VÙNG CUỘN GIẤY DA CỔ NẰM Ở NỬA DƯỚI LÁ BÀI
  // 1. Phần Câu Cửa Miệng (Khoảng trống đầu giấy da, trước dòng kẻ đầu tiên)
  quoteSection: {
    position: 'absolute',
    top: '61.5%',
    height: '11.5%',
    left: '10%',
    right: '10%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  quoteText: {
    fontSize: 10,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#3B1A04', // Mực nâu đen cổ điển
    textAlign: 'center',
    lineHeight: 12.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '70%',
    marginTop: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#8C6747',
    opacity: 0.5,
  },
  dividerGem: {
    fontSize: 7,
    color: '#78350F',
    marginHorizontal: 3,
  },

  // 2. Phần Hướng Dẫn / Quyền Năng (Căn đẩy lên nằm chuẩn giữa các dòng kẻ)
  descSection: {
    position: 'absolute',
    top: '73.2%',
    bottom: '9.8%',
    left: '10%',
    right: '10%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  descText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#261507', // Mực sẫm sắc nét
    textAlign: 'center',
    includeFontPadding: false,
  },

  // Floating Actions bên dưới lá bài
  floatingFooterActions: {
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  actionBtnRandom: {
    backgroundColor: 'rgba(124, 58, 237, 0.35)',
    borderWidth: 1.5,
    borderColor: '#C084FC',
    borderRadius: 24,
    paddingVertical: 11,
    paddingHorizontal: 20,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 16px rgba(192, 132, 252, 0.45)' }
      : { elevation: 6 }),
  },
  actionBtnRandomText: {
    color: '#F3E8FF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  actionBtnReshuffle: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 24,
    paddingVertical: 11,
    paddingHorizontal: 18,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 12px rgba(255, 255, 255, 0.1)' }
      : { elevation: 4 }),
  },
  actionBtnReshuffleText: {
    color: '#F8FAFC',
    fontSize: 13.5,
    fontWeight: '700',
  },
  actionBtnClose: {
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: 24,
    paddingVertical: 11,
    paddingHorizontal: 18,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 12px rgba(239, 68, 68, 0.2)' }
      : { elevation: 4 }),
  },
  actionBtnCloseText: {
    color: '#FECACA',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Match mode Actions
  matchReadyBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C084FC',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  matchReadyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

