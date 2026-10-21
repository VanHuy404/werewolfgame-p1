// ============================================
// 🐺 MA SÓI - RoomSettings Component
// Modal cài đặt phòng: số người chơi, vai trò
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import { COLORS } from '../utils/colors';

/**
 * @param {Object} props
 * @param {boolean} props.visible - Hiển thị modal
 * @param {Object} props.settings - Settings hiện tại { maxPlayers, numWolves, numSeers }
 * @param {Function} props.onConfirm - Callback xác nhận (settings)
 * @param {Function} props.onClose - Đóng modal
 * @param {boolean} props.isCreating - Đang tạo phòng (vs. chỉnh sửa)
 * @param {number} props.currentPlayerCount - Số người hiện tại trong phòng
 */
export default function RoomSettings({
  visible = false,
  settings: initialSettings,
  onConfirm,
  onClose,
  isCreating = true,
  currentPlayerCount = 1,
}) {
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [numWolves, setNumWolves] = useState(2);
  const [numSeers, setNumSeers] = useState(1);

  // Sync settings khi mở modal
  useEffect(() => {
    if (initialSettings && visible) {
      setMaxPlayers(initialSettings.maxPlayers || 6);
      setNumWolves(initialSettings.numWolves !== undefined ? initialSettings.numWolves : 2);
      setNumSeers(initialSettings.numSeers !== undefined ? initialSettings.numSeers : 1);
    }
  }, [initialSettings, visible]);

  // Tính số Dân Làng
  const numVillagers = maxPlayers - numWolves - numSeers;

  // === VALIDATION ===
  // Sói phải nhỏ hơn tổng dân (Tiên Tri + Dân Làng)
  const isWolfValid = numWolves < (numSeers + numVillagers);
  const isVillagersValid = numVillagers >= 0;
  const isMaxPlayersValid = maxPlayers >= Math.max(4, currentPlayerCount);
  const isValid = isWolfValid && isVillagersValid && isMaxPlayersValid && numWolves >= 0 && numSeers >= 0;

  // Hàm thay đổi số an toàn
  const adjustValue = (setter, current, delta, min, max) => {
    const newVal = current + delta;
    if (newVal >= min && newVal <= max) {
      setter(newVal);
    }
  };

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm({ maxPlayers, numWolves, numSeers });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>⚙️</Text>
            <Text style={styles.headerTitle}>
              {isCreating ? 'Cài đặt phòng mới' : 'Chỉnh sửa phòng'}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Số người chơi */}
            <SettingRow
              emoji="👥"
              label="Số người chơi"
              value={maxPlayers}
              onDecrease={() => adjustValue(setMaxPlayers, maxPlayers, -1, Math.max(4, currentPlayerCount), 16)}
              onIncrease={() => adjustValue(setMaxPlayers, maxPlayers, 1, Math.max(4, currentPlayerCount), 16)}
              min={Math.max(4, currentPlayerCount)}
              max={16}
              color={COLORS.primary}
            />

            {/* Số Sói - MIN 0 */}
            <SettingRow
              emoji="🐺"
              label="Số Sói"
              value={numWolves}
              onDecrease={() => adjustValue(setNumWolves, numWolves, -1, 0, maxPlayers - 1)}
              onIncrease={() => adjustValue(setNumWolves, numWolves, 1, 0, maxPlayers - 1)}
              min={0}
              max={maxPlayers - 1}
              color={COLORS.wolf}
              error={!isWolfValid && numWolves > 0}
            />

            {/* Số Tiên Tri - MIN 0 */}
            <SettingRow
              emoji="🔮"
              label="Số Tiên Tri"
              value={numSeers}
              onDecrease={() => adjustValue(setNumSeers, numSeers, -1, 0, maxPlayers)}
              onIncrease={() => adjustValue(setNumSeers, numSeers, 1, 0, maxPlayers)}
              min={0}
              max={maxPlayers}
              color={COLORS.seer}
            />

            {/* Số Dân Làng (auto-calculated) */}
            <View style={[styles.settingRow, styles.autoRow]}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingEmoji}>🧑‍🌾</Text>
                <View>
                  <Text style={styles.settingLabel}>Số Dân Làng</Text>
                  <Text style={styles.settingHint}>Tự động tính</Text>
                </View>
              </View>
              <View style={[
                styles.autoValue,
                { backgroundColor: numVillagers >= 0 ? COLORS.villager + '20' : COLORS.danger + '20' },
              ]}>
                <Text style={[
                  styles.autoValueText,
                  { color: numVillagers >= 0 ? COLORS.villager : COLORS.danger },
                ]}>
                  {numVillagers}
                </Text>
              </View>
            </View>

            {/* Tổng kết vai trò */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>📋 Phân bổ vai trò</Text>
              <View style={styles.summaryGrid}>
                <SummaryItem emoji="🐺" label="Sói" count={numWolves} color={COLORS.wolf} />
                <SummaryItem emoji="🔮" label="T.Tri" count={numSeers} color={COLORS.seer} />
                <SummaryItem emoji="🧑‍🌾" label="Dân" count={numVillagers} color={COLORS.villager} />
                <SummaryItem emoji="👥" label="Tổng" count={maxPlayers} color={COLORS.primary} />
              </View>
            </View>

            {/* Hiển thị lỗi validation */}
            {!isWolfValid && numWolves > 0 && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  ⚠️ Số Sói ({numWolves}) phải nhỏ hơn tổng Dân ({numSeers + numVillagers})!
                </Text>
              </View>
            )}
            {!isVillagersValid && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  ⚠️ Tổng Sói + Tiên Tri vượt quá số người chơi!
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Nút hành động */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!isValid}
            >
              <Text style={styles.confirmBtnText}>
                {isCreating ? '🏠 Tạo phòng' : '✅ Lưu thay đổi'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==================== SUB-COMPONENTS ====================

/** Hàng cài đặt với nút +/- */
function SettingRow({ emoji, label, value, onDecrease, onIncrease, min, max, color, error = false }) {
  return (
    <View style={[styles.settingRow, error && styles.settingRowError]}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingEmoji}>{emoji}</Text>
        <View>
          <Text style={styles.settingLabel}>{label}</Text>
          <Text style={styles.settingRange}>Min: {min} — Max: {max}</Text>
        </View>
      </View>
      <View style={styles.settingRight}>
        <TouchableOpacity
          style={[styles.adjustBtn, value <= min && styles.adjustBtnDisabled]}
          onPress={onDecrease}
          disabled={value <= min}
        >
          <Text style={[styles.adjustBtnText, value <= min && styles.adjustBtnTextDisabled]}>−</Text>
        </TouchableOpacity>
        <View style={[styles.valueBadge, { backgroundColor: color + '18' }]}>
          <Text style={[styles.valueText, { color }]}>{value}</Text>
        </View>
        <TouchableOpacity
          style={[styles.adjustBtn, value >= max && styles.adjustBtnDisabled]}
          onPress={onIncrease}
          disabled={value >= max}
        >
          <Text style={[styles.adjustBtnText, value >= max && styles.adjustBtnTextDisabled]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Item trong bảng tổng kết */
function SummaryItem({ emoji, label, count, color }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryEmoji}>{emoji}</Text>
      <Text style={[styles.summaryCount, { color }]}>{count}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  headerEmoji: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.black,
  },

  // Setting rows
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.grayLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  settingRowError: {
    borderColor: COLORS.danger + '60',
    backgroundColor: COLORS.danger + '08',
  },
  autoRow: {
    backgroundColor: COLORS.grayLight + 'AA',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingEmoji: {
    fontSize: 24,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.black,
  },
  settingHint: {
    fontSize: 11,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  settingRange: {
    fontSize: 11,
    color: COLORS.gray,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.grayMedium,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  adjustBtnDisabled: {
    backgroundColor: COLORS.grayLight,
    borderColor: COLORS.grayLight,
    elevation: 0,
  },
  adjustBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.black,
    lineHeight: 22,
  },
  adjustBtnTextDisabled: {
    color: COLORS.grayMedium,
  },
  valueBadge: {
    minWidth: 44,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  valueText: {
    fontSize: 20,
    fontWeight: '900',
  },
  autoValue: {
    minWidth: 44,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  autoValueText: {
    fontSize: 20,
    fontWeight: '900',
  },

  // Summary
  summaryBox: {
    backgroundColor: COLORS.primary + '08',
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.grayDark,
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    minWidth: 50,
  },
  summaryEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  summaryCount: {
    fontSize: 22,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '600',
  },

  // Error
  errorBox: {
    backgroundColor: COLORS.danger + '12',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
  },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.grayDark,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmBtnDisabled: {
    backgroundColor: COLORS.grayMedium,
    elevation: 0,
    shadowOpacity: 0,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
});
