// ============================================
// 🐺 MA SÓI - ChatBox Component
// Khung chat real-time với phòng chat riêng cho Sói (chat bất cứ lúc nào)
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
 * @param {Function} props.onSend - Callback gửi tin nhắn (message, isWolfChat)
 * @param {boolean} props.isNight - Theme đêm
 * @param {boolean} props.disabled - Không cho chat (vd: đã chết)
 * @param {string} props.myRole - Vai trò của mình ('wolf', 'seer', 'villager')
 * @param {string} props.myId - Socket ID của người chơi
 */
export default function ChatBox({
  messages = [],
  onSend,
  isNight = false,
  disabled = false,
  myRole = null,
  myId,
  phase = null,
}) {
  const isWolf = myRole === 'wolf';

  // Sói có 2 kênh: 'village' (Làng) và 'wolf' (Hang Sói)
  // Mặc định ban đêm thì mở Hang Sói, ban ngày mở Làng
  const [activeChannel, setActiveChannel] = useState(isWolf && isNight ? 'wolf' : 'village');
  const [text, setText] = useState('');
  const [hasUnreadWolf, setHasUnreadWolf] = useState(false);
  const flatListRef = useRef(null);

  // Cập nhật tab mặc định khi đổi đêm/ngày nếu cần
  useEffect(() => {
    if (isWolf) {
      if (isNight) {
        setActiveChannel('wolf');
      }
    }
  }, [isNight, isWolf]);

  // Lọc tin nhắn theo kênh
  const filteredMessages = messages.filter((m) => {
    if (isWolf) {
      return activeChannel === 'wolf' ? m.isWolfChat : !m.isWolfChat;
    }
    // Người không phải Sói chỉ thấy tin Làng
    return !m.isWolfChat;
  });

  // Kiểm tra tin nhắn mới trong kênh Sói khi đang ở kênh Làng
  useEffect(() => {
    if (isWolf && activeChannel === 'village' && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.isWolfChat && lastMsg.playerId !== myId) {
        setHasUnreadWolf(true);
      }
    }
  }, [messages.length, activeChannel, isWolf]);

  // Auto-scroll xuống khi có tin mới
  useEffect(() => {
    if (flatListRef.current && filteredMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [filteredMessages.length]);

  const isCurrentChannelWolf = isWolf && activeChannel === 'wolf';
  const isWolfChatLocked = isCurrentChannelWolf && phase === 'day_vote';

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled || isWolfChatLocked) return;

    const sendingToWolf = isWolf && activeChannel === 'wolf';
    // Nếu ở kênh Làng ban đêm -> không cho gửi
    if (!sendingToWolf && isNight) return;

    onSend(trimmed, sendingToWolf);
    setText('');
  };

  const handleSwitchChannel = (channel) => {
    setActiveChannel(channel);
    if (channel === 'wolf') {
      setHasUnreadWolf(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.playerId === myId;

    return (
      <View style={[
        styles.messageBubble,
        isMe ? styles.myMessage : styles.otherMessage,
        item.isWolfChat && styles.wolfMessage,
        isNight && !isMe && !item.isWolfChat && styles.nightOtherMessage,
      ]}>
        {!isMe && (
          <View style={styles.senderRow}>
            <Text style={styles.senderAvatar}>{item.avatar}</Text>
            <Text style={[
              styles.senderName,
              item.isWolfChat && { color: COLORS.wolf },
              isNight && !item.isWolfChat && { color: COLORS.nightText },
            ]}>
              {item.playerName}
              {item.isWolfChat ? ' 🐺' : ''}
            </Text>
          </View>
        )}
        <Text style={[
          styles.messageText,
          isMe && styles.myMessageText,
          isNight && !isMe && !item.isWolfChat && { color: COLORS.nightText },
        ]}>
          {item.message}
        </Text>
      </View>
    );
  };

  const isInputDisabled = disabled || (!isCurrentChannelWolf && isNight) || isWolfChatLocked;

  const bgColor = isNight || isCurrentChannelWolf ? COLORS.nightCard : COLORS.dayCard;
  const inputBg = isNight || isCurrentChannelWolf ? 'rgba(255,255,255,0.1)' : COLORS.grayLight;
  const inputColor = isNight || isCurrentChannelWolf ? COLORS.white : COLORS.black;
  const placeholderColor = isNight || isCurrentChannelWolf ? 'rgba(255,255,255,0.4)' : COLORS.gray;

  let placeholderText = 'Nhắn tin...';
  if (isWolfChatLocked) {
    placeholderText = '🔒 Hang Sói tạm khóa trong giờ Bỏ Phiếu!';
  } else if (isCurrentChannelWolf) {
    placeholderText = 'Nhắn bí mật cho bầy Sói...';
  } else if (isNight) {
    placeholderText = '😴 Làng đang ngủ (chỉ Sói mới chat được)...';
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* ================= CHAT HEADER & TABS ================= */}
      {isWolf ? (
        <View style={styles.channelBar}>
          {/* Nút Chat Làng */}
          <TouchableOpacity
            style={[
              styles.channelTab,
              activeChannel === 'village' && styles.channelTabActive,
            ]}
            onPress={() => handleSwitchChannel('village')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.channelTabText,
              activeChannel === 'village' && styles.channelTabTextActive,
            ]}>
              💬 Chat Làng
            </Text>
          </TouchableOpacity>

          {/* Nút Chat Sói Bí Mật */}
          <TouchableOpacity
            style={[
              styles.channelTab,
              activeChannel === 'wolf' && styles.channelTabWolfActive,
            ]}
            onPress={() => handleSwitchChannel('wolf')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.channelTabText,
              activeChannel === 'wolf' && styles.channelTabWolfTextActive,
            ]}>
              🐺 Hang Sói (Bí Mật)
            </Text>
            {hasUnreadWolf && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.header}>
          <Text style={[styles.headerText, isNight && { color: COLORS.nightText }]}>
            💬 Thảo luận dân làng
          </Text>
        </View>
      )}

      {/* Subtitle nhắc nhở Sói */}
      {isCurrentChannelWolf && (
        <View style={[styles.wolfSubHeader, isWolfChatLocked && { backgroundColor: 'rgba(239, 68, 68, 0.25)' }]}>
          <Text style={[styles.wolfSubHeaderText, isWolfChatLocked && { color: '#FCA5A5' }]}>
            {isWolfChatLocked
              ? '🔒 Hang Sói tạm khóa trong giờ Bỏ Phiếu để đảm bảo tính công bằng!'
              : '🔒 Kênh bí mật giữa các Sói - Hoạt động bất cứ lúc nào (tự khóa khi bỏ phiếu)!'}
          </Text>
        </View>
      )}

      {/* ================= DANH SÁCH TIN NHẮN ================= */}
      <FlatList
        ref={flatListRef}
        data={filteredMessages}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        renderItem={renderMessage}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, (isNight || isCurrentChannelWolf) && { color: COLORS.nightText }]}>
              {disabled
                ? '🔇 Bạn đã hy sinh (hồn ma không thể chat)'
                : isCurrentChannelWolf
                ? '🐺 Hãy lên chiến thuật bí mật cùng đồng đội!'
                : isNight
                ? '😴 Đêm nay làng đang ngủ...'
                : '💬 Hãy bắt đầu cuộc thảo luận!'}
            </Text>
          </View>
        }
      />

      {/* ================= INPUT GỬI TIN NHẮN ================= */}
      {!disabled && (
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: inputBg, color: inputColor },
              isInputDisabled && styles.inputDisabled,
            ]}
            value={text}
            onChangeText={setText}
            placeholder={placeholderText}
            placeholderTextColor={placeholderColor}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            maxLength={200}
            editable={!isInputDisabled}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              isCurrentChannelWolf && styles.sendBtnWolf,
              (!text.trim() || isInputDisabled) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim() || isInputDisabled}
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
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: 'transparent',
    display: 'flex',
    flexDirection: 'column',
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
  channelBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  channelTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  channelTabActive: {
    backgroundColor: COLORS.primary,
  },
  channelTabWolfActive: {
    backgroundColor: COLORS.wolf,
  },
  channelTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  channelTabTextActive: {
    color: COLORS.white,
  },
  channelTabWolfTextActive: {
    color: COLORS.white,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: 6,
  },
  wolfSubHeader: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(220, 38, 38, 0.25)',
  },
  wolfSubHeaderText: {
    fontSize: 11,
    color: '#FCA5A5',
    fontWeight: '600',
    textAlign: 'center',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 10,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '82%',
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
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.gray,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(15, 12, 30, 0.96)',
  },
  input: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    fontSize: 14,
    marginRight: 8,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnWolf: {
    backgroundColor: COLORS.wolf,
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
