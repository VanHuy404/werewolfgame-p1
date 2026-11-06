// ============================================
// 🎶 MA SÓI - PiedPiperVictoryModal Component
// Hoạt ảnh chiến thắng điện ảnh riêng biệt cho Người Thổi Sáo (5s)
// - Hình nền: Người thổi sáo tựa mặt trăng khổng lồ (pied_piper_victory.jpg)
// - Dải nốt nhạc và ánh sao huyền ảo lơ lửng
// - Tên và Avatar của người chơi đóng vai Người Thổi Sáo
// - Tự động đếm ngược 5s rồi chuyển qua giao diện GameOverScreen
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
  ImageBackground,
  Platform,
} from 'react-native';
import { playFluteSynth } from './PiedPiperModal';

const victoryImg = require('../assets/pied_piper_victory.jpg');
const piperVictoryVideoAsset = require('../assets/videos/The_Perfect_Victory.mp4');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function resolveVictoryVideoUri() {
  if (typeof piperVictoryVideoAsset === 'string') return piperVictoryVideoAsset;
  if (piperVictoryVideoAsset?.default) {
    if (typeof piperVictoryVideoAsset.default === 'string') return piperVictoryVideoAsset.default;
    if (piperVictoryVideoAsset.default.uri) return piperVictoryVideoAsset.default.uri;
  }
  if (piperVictoryVideoAsset?.uri) return piperVictoryVideoAsset.uri;
  try {
    const res = Image.resolveAssetSource(piperVictoryVideoAsset);
    if (res?.uri) return res.uri;
  } catch (e) {}
  return '/assets/videos/The_Perfect_Victory.mp4';
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * 2 * Math.PI;
  const dist = 90 + (i % 4) * 35;
  const symbols = ['🎶', '✨', '🎵', '⭐', '🪈', '💫'];
  return {
    id: i,
    symbol: symbols[i % symbols.length],
    size: i % 3 === 0 ? 22 : 16,
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    color: i % 2 === 0 ? '#F0ABFC' : '#E879F9',
  };
});

export default function PiedPiperVictoryModal({
  visible = false,
  winnerPlayer = null,
  duration = 5,
  onComplete = () => {},
}) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(Platform.OS === 'web');
  const videoRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(duration);
  const player = winnerPlayer || { name: 'Người Thổi Sáo', avatar: '🎶', avatarColor: '#A855F7' };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const bannerY = useRef(new Animated.Value(-40)).current;
  const playerCardScale = useRef(new Animated.Value(0.7)).current;
  const particlesAnim = useRef(new Animated.Value(0)).current;

  const handleVideoFinished = () => {
    setIsVideoPlaying(false);
  };

  // Quản lý phát video The_Perfect_Victory.mp4 trước khi vào hoạt ảnh
  useEffect(() => {
    if (!visible) {
      setIsVideoPlaying(Platform.OS === 'web');
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
      bannerY.setValue(-40);
      playerCardScale.setValue(0.7);
      particlesAnim.setValue(0);
      return;
    }

    if (isVideoPlaying && Platform.OS === 'web') {
      if (videoRef.current) {
        try {
          videoRef.current.currentTime = 0;
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.log('Unmuted autoplay blocked, retrying muted:', err);
              if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current.play().catch(() => {});
              }
            });
          }
        } catch (e) {}
      }

      // Timeout dự phòng 10.5s nếu video bị dừng hoặc không nhận onEnded
      const fallbackTimer = setTimeout(() => {
        handleVideoFinished();
      }, 10500);

      return () => clearTimeout(fallbackTimer);
    }
  }, [visible, isVideoPlaying]);

  // Quản lý hoạt ảnh vinh danh Người Thổi Sáo sau khi video kết thúc
  useEffect(() => {
    if (!visible || isVideoPlaying) {
      return;
    }

    setTimeLeft(duration);
    playFluteSynth();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(bannerY, { toValue: 0, friction: 5, tension: 45, useNativeDriver: true }),
      Animated.spring(playerCardScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(particlesAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
          Animated.timing(particlesAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
        ])
      ),
    ]).start();

    // Tự động chuyển tiếp sau khi hoạt ảnh kết thúc = 4.2s (4200ms)
    const timerAutoClose = setTimeout(() => {
      onComplete();
    }, 4200);

    return () => {
      clearTimeout(timerAutoClose);
    };
  }, [visible, isVideoPlaying]);

  if (!visible) return null;

  // Giai đoạn 1: Chiếu video The_Perfect_Victory.mp4 toàn màn hình
  if (isVideoPlaying && Platform.OS === 'web') {
    return (
      <View style={styles.videoOverlay}>
        <video
          ref={videoRef}
          src={resolveVictoryVideoUri()}
          autoPlay
          playsInline
          controls={false}
          style={styles.webVideoElement}
          onEnded={handleVideoFinished}
          onError={() => {
            console.warn('The_Perfect_Victory.mp4 failed, proceeding to animation directly');
            handleVideoFinished();
          }}
        />
        {/* Nút Bỏ qua video */}
        <TouchableOpacity
          style={styles.skipVideoBtn}
          onPress={handleVideoFinished}
          activeOpacity={0.8}
        >
          <Text style={styles.skipVideoBtnText}>Bỏ qua video ⏭️</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCustomAvatar = typeof player.avatar === 'string' &&
    (player.avatar.startsWith('http') || player.avatar.startsWith('data:') || player.avatar.length > 25);

  return (
    <View style={styles.overlayContainer}>
      <ImageBackground
        source={victoryImg}
        style={styles.bgImage}
        resizeMode="cover"
      >
        {/* Lớp phủ màn đêm tím huyền ảo */}
        <Animated.View style={[styles.darkBackdrop, { opacity: fadeAnim }]}>
          {/* Header Thông báo Chiến Thắng */}
          <Animated.View
            style={[
              styles.headerBox,
              {
                transform: [{ translateY: bannerY }, { scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.glowPill}>
              <Text style={styles.glowPillText}>👑 PHE THỨ 3 TOÀN THẮNG 👑</Text>
            </View>

            <Text style={styles.mainTitle}>NGƯỜI THỔI SÁO CHIẾN THẮNG!</Text>
            <Text style={styles.subTitle}>
              Giai điệu cõi mê vang vọng dưới ánh trăng, toàn bộ linh hồn trong làng đã bị tiếng sáo thu phục!
            </Text>
          </Animated.View>

          {/* KHU VỰC VINH DANH NGƯỜI CHƠI (TÊN & AVATAR) */}
          <Animated.View
            style={[
              styles.playerCard,
              {
                transform: [{ scale: playerCardScale }],
              },
            ]}
          >
            {/* Hạt nốt nhạc phát sáng bay quanh */}
            <View style={styles.particlesWrap} pointerEvents="none">
              {PARTICLES.map((p) => {
                const transX = particlesAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [p.x * 0.8, p.x * 1.15],
                });
                const transY = particlesAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [p.y * 0.8, p.y * 1.15],
                });
                return (
                  <Animated.View
                    key={p.id}
                    style={[
                      styles.particleItem,
                      {
                        transform: [{ translateX: transX }, { translateY: transY }],
                      },
                    ]}
                  >
                    <Text style={{ fontSize: p.size, color: p.color }}>{p.symbol}</Text>
                  </Animated.View>
                );
              })}
            </View>

            {/* Avatar Người Thổi Sáo */}
            <View style={[styles.avatarCircle, { backgroundColor: player.avatarColor || '#9333EA' }]}>
              {isCustomAvatar ? (
                <Image source={{ uri: player.avatar }} style={styles.avatarImg} resizeMode="cover" />
              ) : (
                <Text style={styles.avatarEmoji}>{player.avatar || '🎶'}</Text>
              )}
              <View style={styles.fluteCornerIcon}>
                <Text style={{ fontSize: 20 }}>🪈</Text>
              </View>
            </View>

            {/* Tên nhân vật Người Thổi Sáo */}
            <View style={styles.nameBadge}>
              <Text style={styles.nameRoleLabel}>KẺ MÊ HOẶC VĨ ĐẠI</Text>
              <Text style={styles.playerNameText} numberOfLines={1}>
                {player.name || 'Người Thổi Sáo'}
              </Text>
            </View>

            <View style={styles.triumphPill}>
              <Text style={styles.triumphPillText}>
                ✨ ĐÃ THÔI MIÊN TOÀN BỘ NGƯỜI CHƠI CÒN SỐNG ✨
              </Text>
            </View>
          </Animated.View>

          {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG (CHẠY NGẦM TỰ ĐỘNG CHUYỂN) */}
          <View style={styles.bottomControlBar} />
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    backgroundColor: '#000000',
  },
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  darkBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 4, 20, 0.65)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  headerBox: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 620,
    marginTop: 10,
  },
  glowPill: {
    backgroundColor: 'rgba(192, 132, 252, 0.25)',
    borderWidth: 1.5,
    borderColor: '#C084FC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 10,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 20px rgba(192, 132, 252, 0.6)' } : {}),
  },
  glowPillText: {
    color: '#F5D0FE',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textAlign: 'center',
    textShadowColor: '#A855F7',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    marginBottom: 6,
    ...(Platform.OS === 'web' ? { textShadow: '0 0 24px rgba(168, 85, 247, 0.9)' } : {}),
  },
  subTitle: {
    fontSize: 13.5,
    color: '#E9D5FF',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 480,
  },
  playerCard: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    marginVertical: 20,
  },
  particlesWrap: {
    position: 'absolute',
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particleItem: {
    position: 'absolute',
  },
  avatarCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#E879F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#9333EA',
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 25,
    elevation: 20,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 35px rgba(232, 121, 249, 0.9)' } : {}),
  },
  avatarImg: {
    width: 132,
    height: 132,
    borderRadius: 66,
  },
  avatarEmoji: {
    fontSize: 68,
  },
  fluteCornerIcon: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#581C87',
    borderWidth: 2,
    borderColor: '#F0ABFC',
    borderRadius: 20,
    padding: 6,
  },
  nameBadge: {
    backgroundColor: 'rgba(25, 12, 40, 0.92)',
    borderWidth: 2,
    borderColor: '#C084FC',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 18,
    alignItems: 'center',
    minWidth: 220,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 20px rgba(192, 132, 252, 0.45)' } : {}),
  },
  nameRoleLabel: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#D8B4FE',
    letterSpacing: 2,
    marginBottom: 2,
  },
  playerNameText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  triumphPill: {
    marginTop: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    borderWidth: 1,
    borderColor: '#E879F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  triumphPillText: {
    color: '#F5D0FE',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    maxWidth: 500,
    justifyContent: 'center',
  },
  countdownBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countdownText: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontWeight: '700',
  },
  skipBtn: {
    backgroundColor: '#9333EA',
    borderWidth: 1.5,
    borderColor: '#C084FC',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 15px rgba(147, 51, 234, 0.6)' } : {}),
  },
  skipBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
  },
  webVideoElement: {
    width: '100%',
    height: '100%',
    maxWidth: '100vw',
    maxHeight: '100vh',
    objectFit: 'contain',
    backgroundColor: '#000000',
  },
  skipVideoBtn: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: 'rgba(24, 18, 38, 0.85)',
    borderWidth: 1.5,
    borderColor: '#C084FC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 1000000,
  },
  skipVideoBtnText: {
    color: '#F5D0FE',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

