// ============================================
// 🎭 MA SÓI - AvatarPickerModal Component
// Modal chọn biểu tượng cảm xúc (Emote) phong phú:
// - 🐾 Động vật
// - 🍎 Hoa quả & Món ăn
// - ⚔️ Nhân vật & Phép thuật
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';

const EMOTE_CATEGORIES = [
  {
    id: 'animals',
    name: '🐾 Động Vật',
    emojis: [
      '🐺', '🦊', '🐻', '🐱', '🐶', '🦁', '🐯', '🐼',
      '🐨', '🐸', '🐰', '🐵', '🐷', '🐮', '🐔', '🐧',
      '🦉', '🦅', '🦇', '🦄', '🐍', '🐙', '🦈', '🐊',
      '🐆', '🦓', '🦍', '🐘', '🦏', '🦛', '🐫', '🦒',
      '🦘', '🐁', '🐿️', '🦔',
    ],
  },
  {
    id: 'fruits',
    name: '🍎 Hoa Quả & Món Ăn',
    emojis: [
      '🍎', '🍏', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇',
      '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥',
      '🥝', '🥑', '🍅', '🍆', '🌽', '🥕', '🍄', '🍕',
      '🍔', '🍟', '🌮', '🍩', '🍦', '🍰', '🍫', '🍿',
      '🥞', '🧇', '🍣', '🥟',
    ],
  },
  {
    id: 'fantasy',
    name: '⚔️ Thần Bí & Nhân Vật',
    emojis: [
      '🧙‍♂️', '🧙‍♀️', '🧛‍♂️', '🧛‍♀️', '🧟‍♂️', '🧟‍♀️', '🧝‍♂️', '🧝‍♀️',
      '👻', '💀', '☠️', '👑', '🗡️', '🛡️', '🏹', '🔮',
      '🕯️', '🌙', '⚡', '☄️', '🌪️', '🔥', '❄️', '🎭',
      '🎪', '🎨', '🎯', '🥷', '🤴', '👸', '🧜‍♂️', '🧜‍♀️',
    ],
  },
];

export default function AvatarPickerModal({
  visible = false,
  currentAvatar,
  onSelectAvatar,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('animals');

  const currentCategory = EMOTE_CATEGORIES.find((c) => c.id === activeTab) || EMOTE_CATEGORIES[0];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalHeaderEmoji}>✨</Text>
              <Text style={styles.modalTitle}>Bộ Sưu Tập Biểu Tượng</Text>
            </View>
            <TouchableOpacity style={styles.closeIconBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeIconText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Categories */}
          <View style={styles.tabRow}>
            {EMOTE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.tabBtn, activeTab === cat.id && styles.tabBtnActive]}
                onPress={() => setActiveTab(cat.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.tabText, activeTab === cat.id && styles.tabTextActive]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Grid of Emotes */}
          <ScrollView
            style={styles.gridScrollView}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
          >
            {currentCategory.emojis.map((emoji) => {
              const isSelected = currentAvatar === emoji;
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiItem, isSelected && styles.emojiItemSelected]}
                  onPress={() => {
                    onSelectAvatar(emoji);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                  {isSelected && (
                    <View style={styles.selectedCheckBadge}>
                      <Text style={styles.selectedCheckText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Nút đóng */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Xong</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 15, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    zIndex: 9999,
  },
  modalCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderWidth: 1.8,
    borderColor: '#8B5CF6',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderEmoji: {
    fontSize: 22,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#EDE9FE',
    letterSpacing: 0.5,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIconText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '800',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#8B5CF6',
    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.5)',
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // Grid
  gridScrollView: {
    maxHeight: 280,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  emojiItem: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  emojiItemSelected: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)',
  },
  emojiText: {
    fontSize: 26,
  },
  selectedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#F59E0B',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheckText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },

  // Done button
  doneBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
