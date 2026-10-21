// ============================================
// 🐺 MA SÓI - ChatBox Component
// Khung chat real-time với style ngày/đêm
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS } from '../utils/colors';

/**
 * @param {Object} props
 * @param {Array} props.messages - Danh sách tin nhắn
 * @param {Function} props.onSend - Callback gửi tin nhắn
 * @param {boolean} props.isNight - Theme đêm
 * @param {boolean} props.disabled - Không cho chat
 * @param {boolean} props.isWolfChat - Chat riêng giữa sói
 * @param {string} props.myId - Socket ID của người chơi
 */
export default function ChatBox({
  messages = [],
  onSend,
  isNight = false,
  disabled = false,
  isWolfChat = false,
  myId,
}) {
  const [text, setText] = useState('');
  const flatListRef = useRef(null);

  // Auto-scroll xuống khi có tin mới
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const renderMessage = ({ item }) => {
    const isMe = item.playerId === myId;

    return (
      <View style={[
        styles.messageBubble,
        isMe ? styles.myMessage : styles.otherMessage,
        item.isWolfChat && styles.wolfMessage,
        isNight && !isMe && styles.nightOtherMessage,
      ]}>
        {!isMe && (
          <View style={styles.senderRow}>
            <Text style={styles.senderAvatar}>{item.avatar}</Text>
            <Text style={[
              styles.senderName,
              item.isWolfChat && { color: COLORS.wolf },
              isNight && { color: COLORS.nightText },
            ]}>
              {item.playerName}
              {item.isWolfChat ? ' 🐺' : ''}
            </Text>
          </View>
        )}
        <Text style={[
          styles.messageText,
          isMe && styles.myMessageText,
          isNight && !isMe && { color: COLORS.nightText },
        ]}>
          {item.message}
        </Text>
      </View>
    );
  };

  const bgColor = isNight ? COLORS.nightCard : COLORS.dayCard;
  const inputBg = isNight ? 'rgba(255,255,255,0.1)' : COLORS.grayLight;
  const inputColor = isNight ? COLORS.white : COLORS.black;
  const placeholderColor = isNight ? 'rgba(255,255,255,0.4)' : COLORS.gray;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerText, isNight && { color: COLORS.nightText }]}>
          {isWolfChat ? '🐺 Chat Sói (bí mật)' : '💬 Thảo luận'}
        </Text>
        {isWolfChat && (
          <View style={styles.wolfBadge}>
            <Text style={styles.wolfBadgeText}>Chỉ Sói thấy</Text>
          </View>
        )}
      </View>

      {/* Danh sách tin nhắn */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        renderItem={renderMessage}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, isNight && { color: COLORS.nightText }]}>
              {disabled ? '🔇 Bạn không thể chat lúc này' : '💬 Hãy bắt đầu cuộc thảo luận!'}
            </Text>
          </View>
        }
      />

      {/* Input */}
      {!disabled && (
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: inputColor }]}
            value={text}
            onChangeText={setText}
            placeholder={isWolfChat ? 'Nhắn bí mật cho Sói...' : 'Nhắn tin...'}
            placeholderTextColor={placeholderColor}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            maxLength={200}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Text style={styles.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 280,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.black,
  },
  wolfBadge: {
    backgroundColor: COLORS.wolfBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  wolfBadgeText: {
    fontSize: 10,
    color: COLORS.wolf,
    fontWeight: '700',
  },
  messageList: {
    maxHeight: 160,
    minHeight: 80,
  },
  messageListContent: {
    padding: 10,
    paddingBottom: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 6,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.grayLight,
    borderBottomLeftRadius: 4,
  },
  nightOtherMessage: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  wolfMessage: {
    borderWidth: 1,
    borderColor: COLORS.wolf + '40',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  senderAvatar: {
    fontSize: 12,
    marginRight: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.grayDark,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.black,
    lineHeight: 19,
  },
  myMessageText: {
    color: COLORS.white,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  input: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    fontSize: 14,
    marginRight: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.grayMedium,
  },
  sendBtnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
});
