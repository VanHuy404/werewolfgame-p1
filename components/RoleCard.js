// ============================================
// 🐺 MA SÓI - RoleCard Component
// Thẻ vai trò hiển thị với animation lật bài
// ============================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { COLORS, getRoleColor, getRoleName, getRoleEmoji } from '../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * @param {Object} props
 * @param {string} props.role - 'wolf' | 'seer' | 'villager'
 * @param {boolean} props.visible - Hiển thị card
 */
export default function RoleCard({ role, visible = false }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!role) return null;

  const roleColor = getRoleColor(role);
  const roleName = getRoleName(role);
  const roleEmoji = getRoleEmoji(role);

  const roleDescriptions = {
    wolf: 'Mỗi đêm, bạn chọn 1 người để tiêu diệt.\nHãy giấu danh tính và đánh lừa Dân Làng!',
    seer: 'Mỗi đêm, bạn soi 1 người để biết vai trò.\nHãy dùng thông tin khôn ngoan!',
    villager: 'Ban ngày, hãy thảo luận và tìm ra Sói.\nBỏ phiếu loại bỏ kẻ khả nghi!',
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={[styles.card, { borderColor: roleColor }]}>
        {/* Glow effect */}
        <View style={[styles.glowRing, { backgroundColor: roleColor + '15' }]} />

        {/* Emoji lớn */}
        <Text style={styles.roleEmoji}>{roleEmoji}</Text>

        {/* Tên vai trò */}
        <Text style={[styles.roleName, { color: roleColor }]}>{roleName}</Text>

        {/* Mô tả */}
        <Text style={styles.roleDescription}>{roleDescriptions[role]}</Text>

        {/* Nhấp nháy text */}
        <Text style={styles.continueText}>Trò chơi sẽ bắt đầu ngay...</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.overlay,
    zIndex: 100,
  },
  card: {
    width: Math.min(SCREEN_WIDTH * 0.8, 320),
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 3,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  glowRing: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 44,
    zIndex: -1,
  },
  roleEmoji: {
    fontSize: 72,
    marginBottom: 12,
  },
  roleName: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  roleDescription: {
    fontSize: 14,
    color: COLORS.grayDark,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  continueText: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
});
