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
  onMinimize = null,
}) {
  const isWolf = myRole === 'wolf';

  // Sói có 2 kênh: 'village' (Làng) và 'wolf' (Hang Sói)
  // Mặc định ban đêm thì mở Hang Sói, ban ngày mở Làng
  const [activeChannel, setActiveChannel] = useState(isWolf && isNight ? 'wolf' : 'village');
  const [text, setText] = useState('');
  const [hasUnreadWolf, setHasUnreadWolf] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

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

  // Auto-scroll xuống khi có tin mới (chỉ tự cuộn nếu người dùng không đang cuộn lên đọc lịch sử)
  useEffect(() => {
    if (flatListRef.current && filteredMessages.length > 0) {
      if (!isScrolledUp) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
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
    setIsScrolledUp(false);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
      inputRef.current?.focus();
    }, 50);
  };

  const handleSwitchChannel = (channel) => {
    setActiveChannel(channel);
    setIsScrolledUp(false);
    if (channel === 'wolf') {
      setHasUnreadWolf(false);
    }
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 80);
  };

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    // Nếu khoảng cách đến đáy > 50px thì tính là đang cuộn lên xem lịch sử
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    setIsScrolledUp(distanceFromBottom > 50);
  };

  const renderMessage = ({ item }) => {
    // Tin nhắn hệ thống (thông báo bình minh, kết quả vote, v.v.)
    if (item.isSystem) {
      const isSavedMsg = item.message.includes('🛡️') || item.message.includes('BẢO VỆ');
      const isDeadMsg = item.message.includes('💀') || item.message.includes('sát hại');
      const isVoteMsg = item.message.includes('⚖️') || item.message.includes('BIỂU QUYẾT');

      return (
        <View style={[
          styles.systemBubble,
          isSavedMsg && styles.systemBubbleSaved,
          isDeadMsg && styles.systemBubbleDead,
          isVoteMsg && styles.systemBubbleVote,
        ]}>
          <Text style={[
            styles.systemBubbleText,
            isSavedMsg && styles.systemTextSaved,
            isDeadMsg && styles.systemTextDead,
            isVoteMsg && styles.systemTextVote,
          ]}>
            {item.message}
          </Text>
        </View>
      );
    }

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
            <Text style={[
              styles.senderName,
              item.isWolfChat && styles.senderNameWolf,
            ]}>
              {item.playerName}
              {item.isWolfChat ? ' 🐺' : ''}
            </Text>
          </View>
        )}
        <Text style={[
          styles.messageText,
          isMe && styles.myMessageText,
        ]}>
          {item.message}
        </Text>
      </View>
    );
  };

  const isInputDisabled = disabled || (!isCurrentChannelWolf && isNight) || isWolfChatLocked;

  const bgColor = isNight || isCurrentChannelWolf ? COLORS.nightCard : COLORS.dayCard;
  const inputBg = 'rgba(255, 255, 255, 0.12)';
  const inputColor = '#FFFFFF';
  const placeholderColor = 'rgba(255, 255, 255, 0.55)';

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
      <View style={styles.topHeaderRow}>
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
                💬 Làng
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
                🐺 Hang Sói
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

        {/* Nút Đóng Chat */}
        {onMinimize && (
          <TouchableOpacity
            style={styles.minimizeChatBtn}
            onPress={onMinimize}
            activeOpacity={0.7}
          >
            <Text style={styles.minimizeChatIcon}>✕</Text>
            <Text style={styles.minimizeChatText}>Đóng chat</Text>
          </TouchableOpacity>
        )}
      </View>

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

      {/* ================= DANH SÁCH TIN NHẮN (HỖ TRỢ CUỘN XEM LỊCH SỬ) ================= */}
      <View style={styles.listContainer}>
        <FlatList
          ref={flatListRef}
          data={filteredMessages}
          keyExtractor={(item, index) => `${item.timestamp}-${index}`}
          renderItem={renderMessage}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={true}
          onScroll={handleScroll}
          scrollEventThrottle={80}
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

        {/* Nút Nhảy Về Tin Mới Nhất Khi Đang Cuộn Lên Xem Lịch Sử */}
        {isScrolledUp && (
          <TouchableOpacity
            style={styles.jumpToBottomBtn}
            onPress={() => {
              setIsScrolledUp(false);
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.jumpToBottomText}>⬇️ Tin mới nhất</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ================= INPUT GỬI TIN NHẮN (HỖ TRỢ NHIỀU DÒNG) ================= */}
      {!disabled && (
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            blurOnSubmit={false}
            style={[
              styles.input,
              { backgroundColor: inputBg, color: inputColor },
              isInputDisabled && styles.inputDisabled,
            ]}
            value={text}
            onChangeText={setText}
            placeholder={placeholderText}
            placeholderTextColor={placeholderColor}
            multiline={true}
            maxLength={1000}
            editable={!isInputDisabled}
            onKeyPress={(e) => {
              // Trên Web: Nhấn Enter gửi tin nhắn, Shift + Enter xuống dòng
              if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
                if (!e.nativeEvent.shiftKey) {
                  if (e.preventDefault) e.preventDefault();
                  handleSend();
                }
              }
            }}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              isCurrentChannelWolf && styles.sendBtnWolf,
              (!text.trim() || isInputDisabled) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim() || isInputDisabled}
            activeOpacity={0.8}
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
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  minimizeChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  minimizeChatIcon: {
    fontSize: 12,
  },
  minimizeChatText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  systemBubble: {
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.55)',
    borderRadius: 14,
    padding: 10,
    marginVertical: 6,
    alignSelf: 'center',
    maxWidth: '92%',
  },
  systemBubbleSaved: {
    backgroundColor: 'rgba(14, 165, 233, 0.24)',
    borderColor: '#0EA5E9',
  },
  systemBubbleDead: {
    backgroundColor: 'rgba(239, 68, 68, 0.24)',
    borderColor: '#EF4444',
  },
  systemBubbleVote: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderColor: '#F59E0B',
  },
  systemBubbleText: {
    color: '#FDE68A',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 19,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    ...(Platform.OS === 'web' ? { textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' } : {}),
  },
  systemTextSaved: {
    color: '#38BDF8',
  },
  systemTextDead: {
    color: '#FCA5A5',
  },
  systemTextVote: {
    color: '#FCD34D',
  },
  header: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  channelBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    padding: 2,
    marginRight: 6,
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
    backgroundColor: 'rgba(30, 41, 59, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomLeftRadius: 4,
  },
  nightOtherMessage: {
    backgroundColor: 'rgba(24, 24, 38, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  wolfMessage: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(127, 29, 29, 0.45)',
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
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    ...(Platform.OS === 'web' ? { textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' } : {}),
  },
  senderNameWolf: {
    color: '#F87171',
  },
  messageText: {
    fontSize: 14.5,
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 20,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    ...(Platform.OS === 'web' ? { textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' } : {}),
  },
  myMessageText: {
    color: '#FFFFFF',
    fontWeight: '800',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    ...(Platform.OS === 'web' ? { textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' } : {}),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 16,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  listContainer: {
    flex: 1,
    position: 'relative',
  },
  jumpToBottomBtn: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 10,
  },
  jumpToBottomText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(15, 12, 30, 0.96)',
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 110,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.55)',
    marginRight: 8,
    lineHeight: 19,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    ...(Platform.OS === 'web' ? { textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' } : {}),
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
    marginBottom: 1,
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
