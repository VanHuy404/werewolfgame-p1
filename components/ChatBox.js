// ============================================
// 🐺 MA SÓI - ChatBox Component
// Khung chat real-time với phòng chat riêng cho Sói (chat bất cứ lúc nào)
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform, useWindowDimensions,
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
  isCouple = false,
  partner = null,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth <= 860;
  const isSmallMobile = windowWidth < 450;
  const isWolf = myRole === 'wolf';

  // Các kênh: 'village' (Làng), 'wolf' (Hang Sói), 'couple' (Cặp Đôi)
  const [activeChannel, setActiveChannel] = useState(isWolf && isNight ? 'wolf' : 'village');
  const [text, setText] = useState('');
  const [unreadVillageCount, setUnreadVillageCount] = useState(0);
  const [unreadWolfCount, setUnreadWolfCount] = useState(0);
  const [unreadCoupleCount, setUnreadCoupleCount] = useState(0);
  const prevMsgCountRef = useRef(messages.length);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  // Cập nhật tab mặc định khi đổi đêm/ngày nếu cần
  useEffect(() => {
    if (isWolf && isNight && activeChannel !== 'couple') {
      setActiveChannel('wolf');
      setUnreadWolfCount(0);
    }
  }, [isNight, isWolf]);

  // Lọc tin nhắn theo kênh
  const filteredMessages = messages.filter((m) => {
    if (activeChannel === 'wolf') {
      return m.isWolfChat;
    }
    if (activeChannel === 'couple') {
      return m.isCoupleChat;
    }
    return !m.isWolfChat && !m.isCoupleChat;
  });

  // Kiểm tra tin nhắn mới theo từng kênh (Làng, Sói, Cặp Đôi) khi đang ở tab khác
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const newMsgs = messages.slice(prevMsgCountRef.current);
      newMsgs.forEach((msg) => {
        if (msg.playerId === myId) return;
        if (msg.isWolfChat) {
          if (isWolf && activeChannel !== 'wolf') {
            setUnreadWolfCount((c) => c + 1);
          }
        } else if (msg.isCoupleChat) {
          if (isCouple && activeChannel !== 'couple') {
            setUnreadCoupleCount((c) => c + 1);
          }
        } else {
          if ((isWolf || isCouple) && activeChannel !== 'village') {
            setUnreadVillageCount((c) => c + 1);
          }
        }
      });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length, activeChannel, isWolf, isCouple, myId]);

  // Auto-scroll xuống khi có tin mới
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
  const isCurrentChannelCouple = isCouple && activeChannel === 'couple';
  const isWolfChatLocked = isCurrentChannelWolf && phase === 'day_vote';
  const isCoupleChatLocked = isCurrentChannelCouple && isNight;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled || isWolfChatLocked || isCoupleChatLocked) return;

    const sendingToWolf = isWolf && activeChannel === 'wolf';
    const sendingToCouple = isCouple && activeChannel === 'couple';

    // Nếu ở kênh Làng ban đêm -> không cho gửi
    if (!sendingToWolf && !sendingToCouple && isNight) return;

    onSend(trimmed, sendingToWolf, sendingToCouple);
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
    if (channel === 'village') setUnreadVillageCount(0);
    if (channel === 'wolf') setUnreadWolfCount(0);
    if (channel === 'couple') setUnreadCoupleCount(0);
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
          isMobile && styles.systemBubbleMobile,
          isSavedMsg && styles.systemBubbleSaved,
          isDeadMsg && styles.systemBubbleDead,
          isVoteMsg && styles.systemBubbleVote,
        ]}>
          <Text style={[
            styles.systemBubbleText,
            isMobile && styles.systemBubbleTextMobile,
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
        isMobile && styles.messageBubbleMobile,
        isMe ? styles.myMessage : styles.otherMessage,
        item.isWolfChat && styles.wolfMessage,
        item.isCoupleChat && styles.coupleMessage,
        isNight && !isMe && !item.isWolfChat && !item.isCoupleChat && styles.nightOtherMessage,
      ]}>
        {!isMe && (
          <View style={styles.senderRow}>
            <Text style={[
              styles.senderName,
              isMobile && styles.senderNameMobile,
              item.isWolfChat && styles.senderNameWolf,
              item.isCoupleChat && styles.senderNameCouple,
            ]}>
              {item.playerName}
              {item.isWolfChat ? ' 🐺' : item.isCoupleChat ? ' 💘' : ''}
            </Text>
          </View>
        )}
        <Text style={[
          styles.messageText,
          isMobile && styles.messageTextMobile,
          isMe && styles.myMessageText,
          item.isCoupleChat && styles.coupleMessageText,
        ]}>
          {item.message}
        </Text>
      </View>
    );
  };

  const isInputDisabled = disabled || (!isCurrentChannelWolf && !isCurrentChannelCouple && isNight) || isWolfChatLocked || isCoupleChatLocked;

  const bgColor = isNight || isCurrentChannelWolf || isCurrentChannelCouple ? COLORS.nightCard : COLORS.dayCard;
  const inputBg = 'rgba(255, 255, 255, 0.12)';
  const inputColor = '#FFFFFF';
  const placeholderColor = 'rgba(255, 255, 255, 0.55)';

  let placeholderText = 'Nhắn tin...';
  if (isWolfChatLocked) {
    placeholderText = '🔒 Hang Sói tạm khóa trong giờ Bỏ Phiếu!';
  } else if (isCoupleChatLocked) {
    placeholderText = '🌙 Ban đêm làng đang ngủ, tâm sự Cặp Đôi mở vào buổi sáng!';
  } else if (isCurrentChannelWolf) {
    placeholderText = 'Nhắn bí mật cho bầy Sói...';
  } else if (isCurrentChannelCouple) {
    placeholderText = '💘 Nhắn tin bí mật cho người yêu...';
  } else if (isNight) {
    placeholderText = '😴 Làng đang ngủ (chỉ Sói mới chat được)...';
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* ================= CHAT HEADER & TABS ================= */}
      <View style={[styles.topHeaderRow, isMobile && styles.topHeaderRowMobile]}>
        {(isWolf || isCouple) ? (
          <View style={[styles.channelBar, isMobile && { gap: 4, marginRight: 4 }]}>
            {/* Nút Chat Làng */}
            <TouchableOpacity
              style={[
                styles.channelTab,
                isMobile && styles.channelTabMobile,
                activeChannel === 'village' && styles.channelTabActive,
              ]}
              onPress={() => handleSwitchChannel('village')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.channelTabText,
                  isMobile && styles.channelTabTextMobile,
                  isSmallMobile && isWolf && isCouple && { fontSize: 10 },
                  activeChannel === 'village' && styles.channelTabTextActive,
                ]}
                numberOfLines={1}
              >
                💬 Làng
              </Text>
              {unreadVillageCount > 0 && (
                <View style={styles.unreadVillageBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {unreadVillageCount > 9 ? '9+' : unreadVillageCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Nút Chat Sói Bí Mật */}
            {isWolf && (
              <TouchableOpacity
                style={[
                  styles.channelTab,
                  isMobile && styles.channelTabMobile,
                  activeChannel === 'wolf' && styles.channelTabWolfActive,
                ]}
                onPress={() => handleSwitchChannel('wolf')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.channelTabText,
                    isMobile && styles.channelTabTextMobile,
                    isSmallMobile && isWolf && isCouple && { fontSize: 10 },
                    activeChannel === 'wolf' && styles.channelTabWolfTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {isSmallMobile && isCouple ? '🐺 Sói' : '🐺 Hang Sói'}
                </Text>
                {unreadWolfCount > 0 && (
                  <View style={styles.unreadDot}>
                    <Text style={styles.unreadBadgeText}>
                      {unreadWolfCount > 9 ? '9+' : unreadWolfCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Nút Chat Cặp Đôi Bí Mật */}
            {isCouple && (
              <TouchableOpacity
                style={[
                  styles.channelTab,
                  isMobile && styles.channelTabMobile,
                  activeChannel === 'couple' && styles.channelTabCoupleActive,
                ]}
                onPress={() => handleSwitchChannel('couple')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.channelTabText,
                    isMobile && styles.channelTabTextMobile,
                    isSmallMobile && isWolf && isCouple && { fontSize: 10 },
                    activeChannel === 'couple' && styles.channelTabCoupleTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {isSmallMobile && isWolf ? '💘 Đôi' : '💘 Cặp Đôi'}
                </Text>
                {unreadCoupleCount > 0 && (
                  <View style={styles.unreadCoupleDot}>
                    <Text style={styles.unreadBadgeText}>
                      {unreadCoupleCount > 9 ? '9+' : unreadCoupleCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.header}>
            <Text style={[styles.headerText, isMobile && { fontSize: 12 }, isNight && { color: COLORS.nightText }]}>
              💬 Thảo luận dân làng
            </Text>
          </View>
        )}

        {/* Nút Đóng Chat */}
        {onMinimize && (
          <TouchableOpacity
            style={[styles.minimizeChatBtn, isMobile && styles.minimizeChatBtnMobile]}
            onPress={onMinimize}
            activeOpacity={0.7}
          >
            <Text style={styles.minimizeChatIcon}>✕</Text>
            {!(isSmallMobile && isWolf && isCouple) && (
              <Text style={[styles.minimizeChatText, isMobile && { fontSize: 10 }]} numberOfLines={1}>
                {isSmallMobile ? 'Đóng' : 'Đóng chat'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Subtitle nhắc nhở Sói */}
      {isCurrentChannelWolf && (
        <View style={[styles.wolfSubHeader, isMobile && styles.wolfSubHeaderMobile, isWolfChatLocked && { backgroundColor: 'rgba(239, 68, 68, 0.25)' }]}>
          <Text style={[styles.wolfSubHeaderText, isMobile && { fontSize: 9.5 }, isWolfChatLocked && { color: '#FCA5A5' }]}>
            {isWolfChatLocked
              ? '🔒 Hang Sói tạm khóa trong giờ Bỏ Phiếu để đảm bảo tính công bằng!'
              : '🔒 Kênh bí mật giữa các Sói - Hoạt động bất cứ lúc nào (tự khóa khi bỏ phiếu)!'}
          </Text>
        </View>
      )}

      {/* Subtitle nhắc nhở Cặp Đôi */}
      {isCurrentChannelCouple && (
        <View
          style={[
            styles.wolfSubHeader,
            isMobile && styles.wolfSubHeaderMobile,
            {
              backgroundColor: isCoupleChatLocked ? 'rgba(131, 24, 67, 0.28)' : 'rgba(236, 72, 153, 0.18)',
              borderBottomColor: 'rgba(244, 114, 182, 0.3)',
            },
          ]}
        >
          <Text
            style={[
              styles.wolfSubHeaderText,
              isMobile && { fontSize: 9.5 },
              { color: isCoupleChatLocked ? '#F9A8D4' : '#FBCFE8' },
            ]}
          >
            {isCoupleChatLocked
              ? '🌙 Ban đêm kênh Cặp Đôi tạm nghỉ — Mở lại vào buổi sáng để tâm sự cùng người yêu!'
              : `💘 Kênh bí mật với người yêu ${partner?.name ? `(${partner.name})` : ''} — Chỉ 2 bạn nhìn thấy!`}
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
        <View style={[styles.inputRow, isMobile && styles.inputRowMobile]}>
          <TextInput
            ref={inputRef}
            blurOnSubmit={false}
            style={[
              styles.input,
              isMobile && styles.inputMobile,
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
              isMobile && styles.sendBtnMobile,
              isCurrentChannelWolf && styles.sendBtnWolf,
              (!text.trim() || isInputDisabled) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim() || isInputDisabled}
            activeOpacity={0.8}
          >
            <Text style={[styles.sendBtnText, isMobile && { fontSize: 14 }]}>➤</Text>
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
  topHeaderRowMobile: {
    paddingHorizontal: 6,
    paddingVertical: 3,
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
  minimizeChatBtnMobile: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
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
  systemBubbleMobile: {
    padding: 6,
    marginVertical: 3,
    maxWidth: '96%',
    borderRadius: 10,
    borderWidth: 1,
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
  systemBubbleTextMobile: {
    fontSize: 11,
    lineHeight: 15,
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
  channelTabMobile: {
    paddingVertical: 4,
    borderRadius: 8,
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
  channelTabTextMobile: {
    fontSize: 10.5,
  },
  channelTabTextActive: {
    color: COLORS.white,
  },
  channelTabWolfTextActive: {
    color: COLORS.white,
  },
  channelTabCoupleActive: {
    backgroundColor: '#EC4899',
  },
  channelTabCoupleTextActive: {
    color: COLORS.white,
  },
  unreadVillageBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    marginLeft: 5,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    marginLeft: 5,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCoupleDot: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EC4899',
    marginLeft: 5,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
  },
  wolfSubHeader: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(220, 38, 38, 0.25)',
  },
  wolfSubHeaderMobile: {
    paddingHorizontal: 6,
    paddingVertical: 3,
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
  messageBubbleMobile: {
    maxWidth: '88%',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 4,
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
  coupleMessage: {
    borderWidth: 1.5,
    borderColor: '#F472B6',
    backgroundColor: 'rgba(157, 23, 77, 0.45)',
  },
  coupleMessageText: {
    color: '#FFF1F2',
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
  senderNameMobile: {
    fontSize: 10.5,
  },
  senderNameWolf: {
    color: '#F87171',
  },
  senderNameCouple: {
    color: '#F472B6',
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
  messageTextMobile: {
    fontSize: 12,
    lineHeight: 16,
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
  inputRowMobile: {
    padding: 5,
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
  inputMobile: {
    minHeight: 34,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: 12,
    marginRight: 6,
    lineHeight: 16,
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
  sendBtnMobile: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
