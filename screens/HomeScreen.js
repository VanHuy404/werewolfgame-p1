// ============================================
// 🐺 MA SÓI - HomeScreen
// Màn hình chính: Dark Theme với Bầu trời đầy sao, Chọn Avatar máy tính, & Footer mới
// ============================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated, KeyboardAvoidingView, Platform, Dimensions, ScrollView,
  Image,
} from 'react-native';
import { COLORS } from '../utils/colors';
import RoomSettings from '../components/RoomSettings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tạo danh sách các ngôi sao ngẫu nhiên cho background
function generateStars(count = 55) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() < 0.2 ? 3 : Math.random() < 0.6 ? 2 : 1.5,
      opacity: Math.random() * 0.7 + 0.3,
      glow: Math.random() > 0.7,
    });
  }
  return stars;
}

export default function HomeScreen({ socket, onRoomCreated, onRoomJoined, error }) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [localError, setLocalError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({ maxPlayers: 6, numWolves: 2, numSeers: 1 });
  const [customAvatar, setCustomAvatar] = useState(null);

  // Hidden file input ref for web
  const fileInputRef = useRef(null);

  // Danh sách các ngôi sao tĩnh được memoize
  const stars = useMemo(() => generateStars(60), []);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const wolfBounce = useRef(new Animated.Value(0)).current;
  const starTwinkle = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    // Wolf bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(wolfBounce, { toValue: -12, duration: 1000, useNativeDriver: true }),
        Animated.timing(wolfBounce, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // Twinkling stars animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(starTwinkle, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(starTwinkle, { toValue: 0.35, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Nén ảnh trên client xuống kích thước gọn nhẹ (~10-15KB) để gửi mượt qua Socket.io
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof window === 'undefined') {
          resolve(e.target.result);
          return;
        }
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 128;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > maxDim) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            }
          } else {
            if (h > maxDim) {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Mở trình chọn file trên máy tính
  const handlePickAvatar = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target?.files?.[0];
        if (file) {
          try {
            const compressed = await compressImage(file);
            setCustomAvatar(compressed);
          } catch (err) {
            console.error('Error compressing image:', err);
          }
        }
      };
      input.click();
    } else {
      alert('Vui lòng chọn ảnh từ trình duyệt web.');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target?.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setCustomAvatar(compressed);
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    }
  };

  const handleCreateRoom = () => {
    const trimmed = playerName.trim();
    if (!trimmed) {
      setLocalError('Vui lòng nhập tên của bạn trước khi tạo phòng!');
      setTimeout(() => setLocalError(null), 3500);
      return;
    }
    if (trimmed.length < 2) {
      setLocalError('Tên phải có ít nhất 2 ký tự!');
      setTimeout(() => setLocalError(null), 3500);
      return;
    }
    if (!socket || !socket.connected) {
      if (socket) socket.connect();
      setLocalError('⚠️ Đang kết nối tới Server game (Port 3001). Vui lòng thử lại sau giây lát!');
      setTimeout(() => setLocalError(null), 5000);
      return;
    }
    setLocalError(null);
    socket.emit('create-room', {
      playerName: trimmed,
      settings,
      customAvatar,
    });
  };

  const handleConfirmCreate = (newSettings) => {
    setSettings(newSettings);
    setShowSettings(false);
    if (!socket || !socket.connected) {
      if (socket) socket.connect();
      setLocalError('⚠️ Đang kết nối tới Server game (Port 3001). Vui lòng thử lại sau giây lát!');
      setTimeout(() => setLocalError(null), 5000);
      return;
    }
    socket.emit('create-room', {
      playerName: playerName.trim(),
      settings: newSettings,
      customAvatar,
    });
  };

  const handleJoinRoom = () => {
    const trimmed = playerName.trim();
    const code = roomCode.trim().toUpperCase();
    if (!trimmed) {
      setLocalError('Vui lòng nhập tên của bạn trước!');
      setTimeout(() => setLocalError(null), 3500);
      return;
    }
    if (!code) {
      setLocalError('Vui lòng nhập mã phòng ở ô giữa 2 nút!');
      setTimeout(() => setLocalError(null), 3500);
      return;
    }
    if (code.length < 4) {
      setLocalError('Mã phòng phải có ít nhất 4 ký tự!');
      setTimeout(() => setLocalError(null), 3500);
      return;
    }
    if (!socket || !socket.connected) {
      if (socket) socket.connect();
      setLocalError('⚠️ Đang kết nối tới Server game (Port 3001). Vui lòng thử lại sau giây lát!');
      setTimeout(() => setLocalError(null), 5000);
      return;
    }
    setLocalError(null);
    socket.emit('join-room', {
      playerName: trimmed,
      roomCode: code,
      customAvatar,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ================= BẦU TRỜI ĐẦY SAO (STARRY NIGHT BACKGROUND) ================= */}
      <View style={styles.starField} pointerEvents="none">
        {stars.map((star) => (
          <Animated.View
            key={star.id}
            style={[
              styles.star,
              {
                top: star.top,
                left: star.left,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
                opacity: star.glow ? starTwinkle : star.opacity,
                backgroundColor: star.glow ? '#E2E8F0' : '#A78BFA',
                boxShadow: star.glow ? '0 0 4px #A78BFA' : 'none',
              },
            ]}
          />
        ))}

        {/* Glow ambient phía sau */}
        <View style={styles.ambientGlow1} />
        <View style={styles.ambientGlow2} />
      </View>

      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Logo & Title */}
          <View style={styles.logoSection}>
            <Animated.Text
              style={[styles.wolfEmoji, { transform: [{ translateY: wolfBounce }] }]}
            >
              🐺
            </Animated.Text>
            <Text style={styles.title}>Ma Sói</Text>
            <Text style={styles.subtitle}>Trò chơi suy luận nhiều người</Text>

            {/* Decorative dots */}
            <View style={styles.dots}>
              <View style={[styles.dot, { backgroundColor: COLORS.wolf }]} />
              <View style={[styles.dot, { backgroundColor: COLORS.seer }]} />
              <View style={[styles.dot, { backgroundColor: COLORS.villager }]} />
            </View>
          </View>

          {/* ================= CARD CHÍNH ================= */}
          <View style={styles.card}>
            {/* ================= PHẦN ĐẶT AVATAR TỪ MÁY TÍNH & PRESETS ================= */}
            <View style={styles.avatarPickerSection}>
              <TouchableOpacity
                style={styles.avatarPreviewWrapper}
                onPress={handlePickAvatar}
                activeOpacity={0.8}
              >
                {customAvatar && (customAvatar.startsWith('data:') || customAvatar.startsWith('http') || customAvatar.startsWith('blob:')) ? (
                  <Image source={{ uri: customAvatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.defaultAvatarBox}>
                    <Text style={styles.defaultAvatarEmoji}>{customAvatar || '👤'}</Text>
                  </View>
                )}

                {/* Badge icon camera để chỉ dẫn bấm vô */}
                <View style={styles.cameraBadge}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.7}>
                <Text style={styles.avatarPickerText}>
                  {customAvatar && customAvatar.startsWith('data:') ? '✨ Đổi ảnh khác từ máy tính' : '📷 Bấm vào để tải ảnh đại diện từ máy tính'}
                </Text>
              </TouchableOpacity>

              {/* Danh sách avatar hoạt hình nhanh */}
              <View style={styles.presetAvatarRow}>
                {['🐺', '🦊', '🐻', '🐱', '🐶', '🦁', '🐯', '🐼'].map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.presetAvatarBtn,
                      customAvatar === emoji && styles.presetAvatarSelected,
                    ]}
                    onPress={() => setCustomAvatar(emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Input tên */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>👤 Tên của bạn</Text>
              <TextInput
                style={styles.input}
                value={playerName}
                onChangeText={(text) => {
                  setPlayerName(text);
                  if (localError) setLocalError(null);
                }}
                placeholder="Nhập tên hiển thị..."
                placeholderTextColor={COLORS.grayDark}
                maxLength={15}
                autoCapitalize="none"
              />
            </View>

            {/* Hiển thị lỗi */}
            {(localError || error) && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {localError || error}</Text>
              </View>
            )}

            {/* Khối hành động: Tạo Phòng -> Nhập mã ở giữa -> Vào Phòng */}
            <View style={styles.actionGroup}>
              {/* Nút 1: TẠO PHÒNG */}
              <TouchableOpacity
                style={[styles.mainBtn, styles.createBtn]}
                onPress={handleCreateRoom}
                activeOpacity={0.8}
              >
                <Text style={styles.mainBtnEmoji}>🏠</Text>
                <Text style={styles.mainBtnText}>Tạo Phòng Mới</Text>
                <Text style={styles.mainBtnHint}>Tạo phòng & mời bạn bè tham gia</Text>
              </TouchableOpacity>

              {/* Ô NHẬP MÃ PHÒNG Ở GIỮA 2 NÚT (Theo yêu cầu) */}
              <View style={styles.middleCodeSection}>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerLabel}>HOẶC NHẬP MÃ ĐỂ VÀO PHÒNG</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.codeInputWrapper}>
                  <Text style={styles.codeIcon}>🔑</Text>
                  <TextInput
                    style={styles.inlineCodeInput}
                    value={roomCode}
                    onChangeText={(text) => {
                      setRoomCode(text.toUpperCase());
                      if (localError) setLocalError(null);
                    }}
                    placeholder="NHẬP MÃ PHÒNG (VD: ABC12)"
                    placeholderTextColor="#64748B"
                    maxLength={6}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    onSubmitEditing={handleJoinRoom}
                  />
                  {roomCode.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setRoomCode('')}
                      style={styles.clearBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.clearBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Nút 2: VÀO PHÒNG */}
              <TouchableOpacity
                style={[
                  styles.mainBtn,
                  styles.joinBtn,
                  (!roomCode || roomCode.trim().length === 0) && styles.joinBtnDimmed,
                ]}
                onPress={handleJoinRoom}
                activeOpacity={0.8}
              >
                <Text style={styles.mainBtnEmoji}>🚪</Text>
                <Text style={styles.mainBtnText}>Vào Phòng</Text>
                <Text style={styles.mainBtnHint}>Tham gia phòng bằng mã ở trên</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ================= FOOTER THEO YÊU CẦU ================= */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerMainText}>
              HAVING FUN KILLING EACH OTHERS!!!
            </Text>
            <Text style={styles.footerCreditText}>
              cre-William/Nerd/404
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Room Settings Modal */}
      <RoomSettings
        visible={showSettings}
        settings={settings}
        onConfirm={handleConfirmCreate}
        onClose={() => setShowSettings(false)}
        isCreating={true}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0819', // Nền đen không gian huyền bí
    position: 'relative',
  },
  starField: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
  },
  ambientGlow1: {
    position: 'absolute',
    top: '15%',
    left: '20%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    filter: Platform.OS === 'web' ? 'blur(60px)' : undefined,
  },
  ambientGlow2: {
    position: 'absolute',
    bottom: '20%',
    right: '15%',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    filter: Platform.OS === 'web' ? 'blur(60px)' : undefined,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  wolfEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  title: {
    fontSize: 44,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 2,
    textShadowColor: 'rgba(124, 58, 237, 0.6)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Card chính (Sleek Dark Glassmorphism)
  card: {
    backgroundColor: 'rgba(21, 18, 43, 0.92)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },

  // Avatar Picker
  avatarPickerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPreviewWrapper: {
    position: 'relative',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
    padding: 3,
    backgroundColor: '#1E1A3D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  defaultAvatarBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2A2453',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarEmoji: {
    fontSize: 36,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.secondary,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#15132B',
  },
  cameraIcon: {
    fontSize: 12,
  },
  avatarPickerText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  presetAvatarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    maxWidth: 320,
  },
  presetAvatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E1A3D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  presetAvatarSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    transform: [{ scale: 1.15 }],
  },
  presetEmoji: {
    fontSize: 18,
  },

  // Input
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0F0C22',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  codeInput: {
    letterSpacing: 4,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.secondary,
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Buttons & Middle Code Input
  actionGroup: {
    gap: 12,
  },
  mainBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  createBtn: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
  },
  joinBtn: {
    backgroundColor: COLORS.secondaryDark,
    shadowColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  joinBtnDimmed: {
    opacity: 0.85,
  },
  mainBtnEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  mainBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  mainBtnHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
  },

  // Phần ô mã phòng ở giữa 2 nút
  middleCodeSection: {
    marginVertical: 4,
    alignItems: 'center',
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.22)',
  },
  dividerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
  },
  codeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0818',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    borderRadius: 14,
    paddingHorizontal: 14,
    width: '100%',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  codeIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  inlineCodeInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 3,
    textAlign: 'center',
  },
  clearBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },

  // Footer mới theo yêu cầu người dùng
  footerContainer: {
    marginTop: 28,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  footerMainText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F87171',
    letterSpacing: 1.5,
    textAlign: 'center',
    textShadowColor: 'rgba(239, 68, 68, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  footerCreditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 6,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
