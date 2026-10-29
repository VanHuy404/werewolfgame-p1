// ============================================
// 🐺 MA SÓI - PlayerAvatar Component
// Avatar hoạt hình dạng tròn với emoji
// ============================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Image, Platform } from 'react-native';
import { COLORS } from '../utils/colors';

/**
 * @param {Object} props
 * @param {Object} props.player - { id, name, avatar, avatarColor, alive, role, connected }
 * @param {boolean} props.selected - Đang được chọn (vote/target)
 * @param {boolean} props.onPress - Callback khi nhấn
 * @param {boolean} props.showRole - Hiển thị role
 * @param {boolean} props.isDead - Override trạng thái chết
 * @param {string} props.size - 'small' | 'medium' | 'large'
 * @param {number} props.voteCount - Số phiếu bầu
 */
export default function PlayerAvatar({
  player,
  selected = false,
  isIlluminated = false,
  onPress,
  showRole = false,
  size = 'medium',
  voteCount = 0,
  compact = false,
  textColor = '#F1F5F9',
}) {
  if (!player) return null;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const illuminateAnim = useRef(new Animated.Value(0.4)).current;
  const illuminateScale = useRef(new Animated.Value(1)).current;

  // Hiệu ứng pulse khi selected
  useEffect(() => {
    if (selected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
      Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
    } else {
      scaleAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [selected]);

  // Hiệu ứng hào quang khi được Tiên Tri soi sáng
  useEffect(() => {
    if (isIlluminated) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(illuminateAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
            Animated.timing(illuminateAnim, { toValue: 0.35, duration: 600, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(illuminateScale, { toValue: 1.18, duration: 600, useNativeDriver: true }),
            Animated.timing(illuminateScale, { toValue: 1.0, duration: 600, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      illuminateAnim.setValue(0.4);
      illuminateScale.setValue(1);
    }
  }, [isIlluminated]);

  const isAlive = player.alive !== false;
  const isConnected = player.connected !== false;

  const sizes = {
    small: { container: 80, avatar: 52, emoji: 28, name: 11 },
    medium: { container: 110, avatar: 76, emoji: 42, name: 13 },
    large: { container: 140, avatar: 96, emoji: 54, name: 15 },
  };
  const s = sizes[size] || sizes.medium;

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', COLORS.secondary],
  });

  const isCustomImage = typeof player?.avatar === 'string' && (
    player.avatar.startsWith('data:') ||
    player.avatar.startsWith('http') ||
    player.avatar.startsWith('blob:') ||
    player.avatar.length > 30
  );

  const content = (
    <Animated.View
      style={[
        styles.container,
        { width: s.container, transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Vòng hào quang phát sáng khi được Tiên Tri soi */}
      {isIlluminated && (
        <Animated.View
          style={[
            styles.illuminationRing,
            {
              width: s.avatar + 16,
              height: s.avatar + 16,
              borderRadius: (s.avatar + 16) / 2,
              opacity: illuminateAnim,
              transform: [{ scale: illuminateScale }],
            },
          ]}
        />
      )}

      {/* Avatar circle */}
      <Animated.View
        style={[
          styles.avatarCircle,
          {
            width: s.avatar,
            height: s.avatar,
            borderRadius: s.avatar / 2,
            backgroundColor: isAlive ? (player.avatarColor || '#4ECDC4') : '#9CA3AF',
            borderColor: selected ? COLORS.secondary : 'transparent',
            borderWidth: selected ? 3 : 0,
            opacity: isAlive ? 1 : 0.6,
            overflow: 'hidden',
          },
        ]}
      >
        {isCustomImage ? (
          <View style={{ width: s.avatar, height: s.avatar, borderRadius: s.avatar / 2, overflow: 'hidden' }}>
            <Image
              source={{ uri: player.avatar }}
              style={{
                width: s.avatar,
                height: s.avatar,
                borderRadius: s.avatar / 2,
                opacity: isAlive ? 1 : 0.35,
              }}
              resizeMode="cover"
            />
            {!isAlive && (
              <View style={styles.deadOverlay}>
                <Text style={{ fontSize: s.emoji * 0.9 }}>💀</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={[styles.emoji, { fontSize: s.emoji }]}>
            {isAlive ? (isCustomImage ? '👤' : (player.avatar || '🐺')) : '💀'}
          </Text>
        )}

        {/* Mất kết nối badge */}
        {!isConnected && (
          <View style={styles.disconnectBadge}>
            <Text style={styles.disconnectIcon}>⚡</Text>
          </View>
        )}
      </Animated.View>

      {/* Tên người chơi */}
      {!compact && (
        <Text
          style={[
            styles.name,
            {
              fontSize: s.name,
              color: isAlive ? textColor : COLORS.gray,
              textDecorationLine: isAlive ? 'none' : 'line-through',
            },
          ]}
          numberOfLines={1}
        >
          {player.name}
        </Text>
      )}

      {/* Hiển thị role nếu cần */}
      {showRole && player.role && (
        <View style={[styles.roleBadge, { backgroundColor: getRoleBg(player.role) }]}>
          <Text style={[styles.roleText, { color: getRoleTextColor(player.role) }]}>
            {getRoleLabel(player.role)}
          </Text>
        </View>
      )}

      {/* Số phiếu vote */}
      {voteCount > 0 && (
        <View style={styles.voteBadge}>
          <Text style={styles.voteText}>{voteCount}</Text>
        </View>
      )}

      {/* Selected indicator */}
      {selected && (
        <View style={styles.selectedIndicator}>
          <Text style={{ fontSize: 10 }}>🎯</Text>
        </View>
      )}
    </Animated.View>
  );

  if (onPress && isAlive) {
    return (
      <TouchableOpacity onPress={() => onPress(player)} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

function getRoleBg(role) {
  switch (role) {
    case 'wolf': return COLORS.wolfBg;
    case 'seer': return COLORS.seerBg;
    case 'villager': return COLORS.villagerBg;
    default: return COLORS.grayLight;
  }
}

function getRoleTextColor(role) {
  switch (role) {
    case 'wolf': return COLORS.wolf;
    case 'seer': return COLORS.seer;
    case 'villager': return COLORS.villager;
    default: return COLORS.gray;
  }
}

function getRoleLabel(role) {
  switch (role) {
    case 'wolf': return '🐺 Sói';
    case 'seer': return '🔮 Tiên Tri';
    case 'villager': return '🧑‍🌾 Dân';
    default: return '❓';
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginHorizontal: 6,
    marginVertical: 8,
  },
  avatarCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  emoji: {
    textAlign: 'center',
  },
  name: {
    marginTop: 4,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 130,
  },
  roleBadge: {
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
  },
  voteBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.danger,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  voteText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },
  disconnectBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.warning,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectIcon: {
    fontSize: 10,
  },
  selectedIndicator: {
    position: 'absolute',
    top: -6,
    left: -2,
  },
  illuminationRing: {
    position: 'absolute',
    top: -8,
    borderWidth: 3,
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 25px #38BDF8, inset 0 0 15px #60A5FA' }
      : { shadowColor: '#38BDF8', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 15 }),
    zIndex: 1,
    alignSelf: 'center',
  },
  deadOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
});
