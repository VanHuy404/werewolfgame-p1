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
  readOnly = false,
}) {
  const [numWolves, setNumWolves] = useState(2);
  const [numSeers, setNumSeers] = useState(1);
  const [numBodyguards, setNumBodyguards] = useState(1);
  const [dayDiscussionTime, setDayDiscussionTime] = useState(60);
  const [dayVoteTime, setDayVoteTime] = useState(25);

  // Sync settings khi mở modal
  useEffect(() => {
    if (initialSettings && visible) {
      setNumWolves(initialSettings.numWolves !== undefined ? initialSettings.numWolves : 2);
      setNumSeers(initialSettings.numSeers !== undefined ? initialSettings.numSeers : 1);
      setNumBodyguards(initialSettings.numBodyguards !== undefined ? initialSettings.numBodyguards : 1);
      setDayDiscussionTime(initialSettings.dayDiscussionTime || 60);
      setDayVoteTime(initialSettings.dayVoteTime || 25);
    }
  }, [initialSettings, visible]);

  // Tính số Dân Làng dựa trên số lượng người tham gia thực tế
  const numVillagers = Math.max(0, currentPlayerCount - numWolves - numSeers - numBodyguards);

  // === VALIDATION ===
  // Sói phải nhỏ hơn tổng dân khi đã có từ 4 người chơi trở lên
  const totalGood = numSeers + numBodyguards + numVillagers;
  const isWolfValid = currentPlayerCount < 4 || numWolves < totalGood;
  const isValid = numWolves >= 0 && numSeers >= 0 && numBodyguards >= 0;

  // Hàm thay đổi số an toàn
  const adjustValue = (setter, current, delta, min = 0) => {
    const newVal = current + delta;
    if (newVal >= min) {
      setter(newVal);
    }
  };

  const handleConfirm = () => {
    if (!isValid || readOnly) return;
    onConfirm({ numWolves, numSeers, numBodyguards, dayDiscussionTime, dayVoteTime });
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
              {readOnly ? 'Cấu hình phòng' : isCreating ? 'Cài đặt phòng mới' : 'Chỉnh sửa phòng'}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Người tham gia hiện tại (Không giới hạn số người) */}
            <View style={[styles.settingRow, styles.participantsRow]}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingEmoji}>👥</Text>
                <View>
                  <Text style={styles.settingLabel}>Người tham gia</Text>
                  <Text style={styles.settingHint}>Không giới hạn số người vào</Text>
                </View>
              </View>
              <View style={[styles.valueBadge, { backgroundColor: COLORS.primary + '20' }]}>
                <Text style={[styles.valueText, { color: COLORS.primary }]}>{currentPlayerCount} người</Text>
              </View>
            </View>

            {/* Số Sói */}
            <SettingRow
              emoji="🐺"
              label="Số Sói"
              value={numWolves}
              onDecrease={() => adjustValue(setNumWolves, numWolves, -1, 0)}
              onIncrease={() => adjustValue(setNumWolves, numWolves, 1, 0)}
              min={0}
              color={COLORS.wolf}
              error={!isWolfValid && numWolves > 0}
              readOnly={readOnly}
            />

            {/* Số Tiên Tri */}
            <SettingRow
              emoji="🔮"
              label="Số Tiên Tri"
              value={numSeers}
              onDecrease={() => adjustValue(setNumSeers, numSeers, -1, 0)}
              onIncrease={() => adjustValue(setNumSeers, numSeers, 1, 0)}
              min={0}
              color={COLORS.seer}
              readOnly={readOnly}
            />

            {/* Số Bảo Vệ */}
            <SettingRow
              emoji="🛡️"
              label="Số Bảo Vệ"
              value={numBodyguards}
              onDecrease={() => adjustValue(setNumBodyguards, numBodyguards, -1, 0)}
              onIncrease={() => adjustValue(setNumBodyguards, numBodyguards, 1, 0)}
              min={0}
              color={COLORS.bodyguard}
              readOnly={readOnly}
            />

            {/* Thời gian thảo luận */}
            <SettingRow
              emoji="🗣️"
              label="Thời gian bàn luận"
              value={dayDiscussionTime}
              suffix="s"
              onDecrease={() => setDayDiscussionTime(Math.max(30, dayDiscussionTime - 15))}
              onIncrease={() => setDayDiscussionTime(Math.min(300, dayDiscussionTime + 15))}
              min={30}
              max={300}
              color={COLORS.primary}
              readOnly={readOnly}
            />

            {/* Thời gian bỏ phiếu */}
            <SettingRow
              emoji="⚖️"
              label="Thời gian vote"
              value={dayVoteTime}
              suffix="s"
              onDecrease={() => setDayVoteTime(Math.max(15, dayVoteTime - 5))}
              onIncrease={() => setDayVoteTime(Math.min(180, dayVoteTime + 5))}
              min={15}
              max={180}
              color={COLORS.secondary}
              readOnly={readOnly}
            />

            {/* Số Dân Làng (tính theo số người tham gia thực tế) */}
            <View style={[styles.settingRow, styles.autoRow]}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingEmoji}>🧑‍🌾</Text>
                <View>
                  <Text style={styles.settingLabel}>Số Dân Làng</Text>
                  <Text style={styles.settingHint}>Tự động tính theo người tham gia</Text>
                </View>
              </View>
              <View style={[
                styles.autoValue,
                { backgroundColor: COLORS.villager + '20' },
              ]}>
                <Text style={[
                  styles.autoValueText,
                  { color: COLORS.villager },
                ]}>
                  {numVillagers}
                </Text>
              </View>
            </View>

            {/* Tổng kết vai trò */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>📋 Phân bổ vai trò (Theo {currentPlayerCount} người)</Text>
              <View style={styles.summaryGrid}>
                <SummaryItem emoji="🐺" label="Sói" count={numWolves} color={COLORS.wolf} />
                <SummaryItem emoji="🔮" label="T.Tri" count={numSeers} color={COLORS.seer} />
                <SummaryItem emoji="🛡️" label="B.Vệ" count={numBodyguards} color={COLORS.bodyguard} />
                <SummaryItem emoji="🧑‍🌾" label="Dân" count={numVillagers} color={COLORS.villager} />
                <SummaryItem emoji="👥" label="Tổng" count={currentPlayerCount} color={COLORS.primary} />
              </View>
            </View>

            {/* Hiển thị lưu ý nếu số Sói quá nhiều */}
            {!isWolfValid && numWolves > 0 && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  ⚠️ Lưu ý: Khi bắt đầu trận, số Sói ({numWolves}) nên nhỏ hơn tổng Phe Dân ({totalGood})!
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Nút hành động */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{readOnly ? 'Đóng' : 'Hủy'}</Text>
            </TouchableOpacity>
            {!readOnly && (
            <TouchableOpacity
              style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!isValid}
            >
              <Text style={styles.confirmBtnText}>
                {isCreating ? '🏠 Tạo phòng' : '✅ Lưu thay đổi'}
              </Text>
            </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==================== SUB-COMPONENTS ====================

/** Hàng cài đặt với nút +/- */
function SettingRow({ emoji, label, value, onDecrease, onIncrease, min = 0, max = 99, color, error = false, suffix = '', readOnly = false }) {
  return (
    <View style={[styles.settingRow, error && styles.settingRowError]}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingEmoji}>{emoji}</Text>
        <View>
          <Text style={styles.settingLabel}>{label}</Text>
        </View>
      </View>
      <View style={styles.settingRight}>
        {!readOnly && (
        <TouchableOpacity
          style={[styles.adjustBtn, value <= min && styles.adjustBtnDisabled]}
          onPress={onDecrease}
          disabled={value <= min}
        >
          <Text style={[styles.adjustBtnText, value <= min && styles.adjustBtnTextDisabled]}>−</Text>
        </TouchableOpacity>
        )}
        <View style={[styles.valueBadge, { backgroundColor: color + '18' }]}>
          <Text style={[styles.valueText, { color }]}>{value}{suffix}</Text>
        </View>
        {!readOnly && (
        <TouchableOpacity
          style={[styles.adjustBtn, value >= max && styles.adjustBtnDisabled]}
          onPress={onIncrease}
          disabled={value >= max}
        >
          <Text style={[styles.adjustBtnText, value >= max && styles.adjustBtnTextDisabled]}>+</Text>
        </TouchableOpacity>
        )}
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
