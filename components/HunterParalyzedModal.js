// ============================================
// ☠️🏹 MA SÓI - HunterParalyzedModal Component
// Modal cảnh báo khi Thợ Săn bị Phù Thủy đầu độc:
// Thuốc độc ngấm vào người gây tê liệt toàn thân khiến Thợ Săn không thể nổ súng
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';

export default function HunterParalyzedModal({
  visible = false,
  onClose = () => {},
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>☠️ TÊ LIỆT BỞI ĐỘC DƯỢC</Text>
          </View>

          <Text style={styles.emoji}>🏹☠️</Text>

          <Text style={styles.title}>KHÔNG THỂ NỔ SÚNG!</Text>

          <Text style={styles.description}>
            Thuốc độc của Phù Thủy đã ngấm sâu vào kinh mạch khiến bạn hoàn toàn tê liệt.
            Trong cơn đau đớn tức tưởi, ngón tay bạn không còn sức lực để bóp cò phát đạn báo thù trăn trối...
          </Text>

          <View style={styles.statusBox}>
            <Text style={styles.statusText}>❌ VÔ HIỆU HÓA PHÁT SÚNG BÁO THÙ</Text>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeBtnText}>ĐÃ HIỂU</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 15, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
  },
  card: {
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#A855F7',
    padding: 24,
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
    boxShadow: '0 0 30px rgba(168, 85, 247, 0.6)',
  },
  badge: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    borderWidth: 1.2,
    borderColor: '#C084FC',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  badgeText: {
    color: '#E9D5FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  emoji: {
    fontSize: 54,
    marginVertical: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F43F5E',
    letterSpacing: 0.8,
    marginTop: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(244, 63, 94, 0.7)',
    textShadowRadius: 8,
  },
  description: {
    fontSize: 13.5,
    color: '#E2E8F0',
    lineHeight: 20,
    textAlign: 'center',
    marginVertical: 14,
  },
  statusBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  statusText: {
    color: '#FCA5A5',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  closeBtn: {
    backgroundColor: '#9333EA',
    paddingVertical: 11,
    paddingHorizontal: 36,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#C084FC',
    boxShadow: '0 4px 15px rgba(147, 51, 234, 0.4)',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13.5,
    letterSpacing: 1,
  },
});
