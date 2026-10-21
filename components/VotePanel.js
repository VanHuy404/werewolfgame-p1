// ============================================
// 🐺 MA SÓI - VotePanel Component
// Bảng bỏ phiếu treo cổ ban ngày
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../utils/colors';
import PlayerAvatar from './PlayerAvatar';

/**
 * @param {Object} props
 * @param {Array} props.players - Danh sách người chơi
 * @param {string} props.myId - ID của tôi
 * @param {string|null} props.selectedTarget - ID người đã chọn
 * @param {Object} props.voteCount - { playerId: count }
 * @param {number} props.totalVoted - Số người đã vote
 * @param {number} props.totalAlive - Tổng người còn sống
 * @param {Function} props.onVote - Callback khi vote
 * @param {boolean} props.disabled - Khóa vote
 */
export default function VotePanel({
  players = [],
  myId,
  selectedTarget,
  voteCount = {},
  totalVoted = 0,
  totalAlive = 0,
  onVote,
  disabled = false,
}) {
  const alivePlayers = players.filter((p) => p.alive);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🗳️ Bỏ phiếu treo cổ</Text>
        <View style={styles.votedCountBadge}>
          <Text style={styles.votedCountText}>
            {totalVoted}/{totalAlive} đã vote
          </Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Chọn người bạn nghi ngờ là Sói
      </Text>

      {/* Danh sách vote */}
      <ScrollView
        style={styles.voteList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.voteListContent}
      >
        {alivePlayers.map((player) => {
          const isMe = player.id === myId;
          const isSelected = selectedTarget === player.id;
          const votes = voteCount[player.id] || 0;
          const votePercent = totalVoted > 0 ? (votes / totalAlive) * 100 : 0;

          return (
            <TouchableOpacity
              key={player.id}
              style={[
                styles.voteItem,
                isSelected && styles.voteItemSelected,
                disabled && styles.voteItemDisabled,
              ]}
              onPress={() => !disabled && onVote(player.id)}
              activeOpacity={0.7}
              disabled={disabled}
            >
              {/* Vote progress bar nền */}
              {votes > 0 && (
                <View
                  style={[
                    styles.voteProgressBar,
                    { width: `${Math.min(votePercent, 100)}%` },
                    isSelected && { backgroundColor: COLORS.secondary + '30' },
                  ]}
                />
              )}

              <View style={styles.voteItemContent}>
                {/* Avatar + tên */}
                <View style={styles.playerInfo}>
                  <View style={[
                    styles.miniAvatar,
                    { backgroundColor: player.avatarColor || '#4ECDC4' },
                  ]}>
                    <Text style={styles.miniAvatarText}>{player.avatar}</Text>
                  </View>
                  <Text style={[styles.playerName, isMe && styles.playerNameMe]}>
                    {player.name} {isMe ? '(Tôi)' : ''}
                  </Text>
                </View>

                {/* Vote count + check */}
                <View style={styles.voteInfo}>
                  {votes > 0 && (
                    <View style={styles.voteCountBadge}>
                      <Text style={styles.voteCountText}>{votes} phiếu</Text>
                    </View>
                  )}
                  {isSelected && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Chú thích */}
      {selectedTarget && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedInfoText}>
            ✅ Bạn đã bỏ phiếu cho{' '}
            <Text style={{ fontWeight: '800' }}>
              {alivePlayers.find((p) => p.id === selectedTarget)?.name || '???'}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.dayCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.black,
  },
  votedCountBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  votedCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 12,
  },
  voteList: {
    maxHeight: 220,
  },
  voteListContent: {
    gap: 6,
  },
  voteItem: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.grayLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voteItemSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.secondaryLight + '20',
  },
  voteItemDisabled: {
    opacity: 0.6,
  },
  voteProgressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: COLORS.danger + '18',
    borderRadius: 12,
  },
  voteItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  miniAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  miniAvatarText: {
    fontSize: 18,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  playerNameMe: {
    color: COLORS.primary,
  },
  voteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voteCountBadge: {
    backgroundColor: COLORS.danger + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  voteCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
  },
  checkMark: {
    fontSize: 18,
    color: COLORS.success,
    fontWeight: '900',
  },
  selectedInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: COLORS.success + '15',
    borderRadius: 10,
  },
  selectedInfoText: {
    fontSize: 13,
    color: COLORS.success,
    textAlign: 'center',
  },
});
