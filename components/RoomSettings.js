// ============================================
// 🐺 MA SÓI - RoomSettings Component
// Modal cài đặt phòng: số người chơi, vai trò
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import { COLORS } from '../utils/colors';
import SeerInspectionModal from './SeerInspectionModal';
import WolfClawAttackModal from './WolfClawAttackModal';
import BodyguardSaveModal from './BodyguardSaveModal';
import WitchHealSaveModal from './WitchHealSaveModal';
import WitchPoisonModal from './WitchPoisonModal';
import HunterShotModal from './HunterShotModal';

/**
 * @param {Object} props
 * @param {boolean} props.visible - Hiển thị modal
 * @param {Object} props.settings - Settings hiện tại { maxPlayers, numWolves, numSeers }
 * @param {Function} props.onConfirm - Callback xác nhận (settings)
 * @param {Function} props.onClose - Đóng modal
 * @param {boolean} props.isCreating - Đang tạo phòng (vs. chỉnh sửa)
 * @param {number} props.currentPlayerCount - Số người hiện tại trong phòng
 * @param {boolean} props.readOnly - Chỉ xem cài đặt (dành cho người không phải chủ phòng)
 * @param {Array} props.players - Danh sách người chơi trong phòng (để demo hiệu ứng)
 * @param {string} props.myId - ID của người đang mở cài đặt
 */
export default function RoomSettings({
  visible = false,
  settings: initialSettings,
  onConfirm,
  onClose,
  isCreating = true,
  currentPlayerCount = 1,
  readOnly = false,
  players = [],
  myId = null,
}) {
  const [numWolves, setNumWolves] = useState(2);
  const [numSeers, setNumSeers] = useState(1);
  const [numBodyguards, setNumBodyguards] = useState(1);
  const [numWitches, setNumWitches] = useState(1);
  const [numHunters, setNumHunters] = useState(1);
  const [dayDiscussionTime, setDayDiscussionTime] = useState(60);
  const [dayVoteTime, setDayVoteTime] = useState(25);

  // Thử nghiệm hiệu ứng Tiên Tri Soi (Dành riêng cho Chủ Phòng)
  const [seerDemoVisible, setSeerDemoVisible] = useState(false);
  const [seerDemoAlignment, setSeerDemoAlignment] = useState('good');
  const [seerDemoTarget, setSeerDemoTarget] = useState(null);

  // Thử nghiệm hiệu ứng Sói cào tử nạn (Dành riêng cho Chủ Phòng)
  const [clawDemoVisible, setClawDemoVisible] = useState(false);
  const [clawDemoTarget, setClawDemoTarget] = useState(null);

  // Thử nghiệm hiệu ứng Bảo Vệ thành công (Dành riêng cho Chủ Phòng)
  const [saveDemoVisible, setSaveDemoVisible] = useState(false);
  const [saveDemoTarget, setSaveDemoTarget] = useState(null);

  // Thử nghiệm hiệu ứng Phù Thủy Cứu Sống (Dành riêng cho Chủ Phòng)
  const [witchHealDemoVisible, setWitchHealDemoVisible] = useState(false);
  const [witchHealDemoTarget, setWitchHealDemoTarget] = useState(null);

  // Thử nghiệm hiệu ứng Phù Thủy Ném Thuốc Độc (Dành riêng cho Chủ Phòng)
  const [witchPoisonDemoVisible, setWitchPoisonDemoVisible] = useState(false);
  const [witchPoisonDemoTarget, setWitchPoisonDemoTarget] = useState(null);
  const [witchShieldClashDemo, setWitchShieldClashDemo] = useState(false);

  // Thử nghiệm hiệu ứng Thợ Săn Nổ Súng Bắn Hạ (Dành riêng cho Chủ Phòng)
  const [hunterDemoVisible, setHunterDemoVisible] = useState(false);
  const [hunterDemoTarget, setHunterDemoTarget] = useState(null);

  // Helper lấy mục tiêu test hiệu ứng: Ưu tiên chọn chính Chủ Phòng (host)
  const getHostTarget = (fallbackName = 'Chủ Phòng', fallbackAvatar = '🧙‍♂️', fallbackColor = '#38BDF8') => {
    const host = (players && players.find((p) => p.id === myId)) || (players && players[0]);
    if (host) {
      return {
        id: host.id,
        name: host.name,
        avatar: host.avatar,
        avatarColor: host.avatarColor,
      };
    }
    return {
      id: myId || 'host-target',
      name: fallbackName,
      avatar: fallbackAvatar,
      avatarColor: fallbackColor,
    };
  };

  const handleTestSeerEffect = (alignment) => {
    setSeerDemoAlignment(alignment);
    const target = getHostTarget(
      alignment === 'evil' ? 'Ma Sói Khát Máu' : 'Dân Làng Lương Thiện',
      alignment === 'evil' ? '🐺' : '🧙‍♂️',
      alignment === 'evil' ? '#EF4444' : '#38BDF8'
    );
    setSeerDemoTarget(target);
    setSeerDemoVisible(true);
  };

  const handleTestClawEffect = () => {
    const target = getHostTarget('Chủ Phòng (Nạn Nhân)', '🧙‍♂️', '#38BDF8');
    setClawDemoTarget(target);
    setClawDemoVisible(true);
  };

  const handleTestSaveEffect = () => {
    const target = getHostTarget('Chủ Phòng (Được Cứu)', '🧙‍♂️', '#38BDF8');
    setSaveDemoTarget(target);
    setSaveDemoVisible(true);
  };

  const handleTestWitchHealEffect = () => {
    const target = getHostTarget('Chủ Phòng (Được Hồi Sinh)', '🧙‍♂️', '#38BDF8');
    setWitchHealDemoTarget(target);
    setWitchHealDemoVisible(true);
  };

  const handleTestWitchPoisonEffect = () => {
    setWitchShieldClashDemo(false);
    const target = getHostTarget('Chủ Phòng (Bị Ném Độc)', '🧙‍♂️', '#EF4444');
    setWitchPoisonDemoTarget(target);
    setWitchPoisonDemoVisible(true);
  };

  const handleTestShieldClashEffect = () => {
    setWitchShieldClashDemo(true);
    const target = getHostTarget('Chủ Phòng (Xung Đột Khiên & Độc)', '🧙‍♂️', '#38BDF8');
    setWitchPoisonDemoTarget(target);
    setWitchPoisonDemoVisible(true);
  };

  const handleTestHunterEffect = () => {
    const target = getHostTarget('Chủ Phòng (Bị Bắn Hạ)', '🧙‍♂️', '#F59E0B');
    setHunterDemoTarget(target);
    setHunterDemoVisible(true);
  };

  // Sync settings khi mở modal
  useEffect(() => {
    if (initialSettings && visible) {
      setNumWolves(initialSettings.numWolves !== undefined ? initialSettings.numWolves : 2);
      setNumSeers(initialSettings.numSeers !== undefined ? Math.min(1, initialSettings.numSeers) : 1);
      setNumBodyguards(initialSettings.numBodyguards !== undefined ? Math.min(1, initialSettings.numBodyguards) : 1);
      setNumWitches(initialSettings.numWitches !== undefined ? Math.min(1, initialSettings.numWitches) : 1);
      setNumHunters(initialSettings.numHunters !== undefined ? Math.min(1, initialSettings.numHunters) : 1);
      setDayDiscussionTime(initialSettings.dayDiscussionTime || 60);
      setDayVoteTime(initialSettings.dayVoteTime || 25);
    }
  }, [initialSettings, visible]);

  // Tính số Dân Làng dựa trên số lượng người tham gia thực tế
  const numVillagers = Math.max(0, currentPlayerCount - numWolves - numSeers - numBodyguards - numWitches - numHunters);

  // === VALIDATION ===
  // Sói phải nhỏ hơn tổng dân khi đã có từ 4 người chơi trở lên
  const totalGood = numSeers + numBodyguards + numWitches + numHunters + numVillagers;
  const isWolfValid = currentPlayerCount < 4 || numWolves < totalGood;
  const isValid = numWolves >= 0 && numSeers >= 0 && numBodyguards >= 0 && numWitches >= 0 && numHunters >= 0;

  // Hàm thay đổi số an toàn (giới hạn min và max)
  const adjustValue = (setter, current, delta, min = 0, max = Infinity) => {
    const newVal = current + delta;
    if (newVal >= min && newVal <= max) {
      setter(newVal);
    }
  };

  const handleConfirm = () => {
    if (!isValid || readOnly) return;
    onConfirm({ numWolves, numSeers, numBodyguards, numWitches, numHunters, dayDiscussionTime, dayVoteTime });
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
              onDecrease={() => adjustValue(setNumSeers, numSeers, -1, 0, 1)}
              onIncrease={() => adjustValue(setNumSeers, numSeers, 1, 0, 1)}
              min={0}
              max={1}
              color={COLORS.seer}
              readOnly={readOnly}
            />

            {/* Số Bảo Vệ */}
            <SettingRow
              emoji="🛡️"
              label="Số Bảo Vệ"
              value={numBodyguards}
              onDecrease={() => adjustValue(setNumBodyguards, numBodyguards, -1, 0, 1)}
              onIncrease={() => adjustValue(setNumBodyguards, numBodyguards, 1, 0, 1)}
              min={0}
              max={1}
              color={COLORS.bodyguard}
              readOnly={readOnly}
            />

            {/* Số Phù Thủy */}
            <SettingRow
              emoji="🧙‍♀️"
              label="Số Phù Thủy"
              value={numWitches}
              onDecrease={() => adjustValue(setNumWitches, numWitches, -1, 0, 1)}
              onIncrease={() => adjustValue(setNumWitches, numWitches, 1, 0, 1)}
              min={0}
              max={1}
              color={COLORS.witch}
              readOnly={readOnly}
            />

            {/* Số Thợ Săn */}
            <SettingRow
              emoji="🏹"
              label="Số Thợ Săn"
              value={numHunters}
              onDecrease={() => adjustValue(setNumHunters, numHunters, -1, 0, 1)}
              onIncrease={() => adjustValue(setNumHunters, numHunters, 1, 0, 1)}
              min={0}
              max={1}
              color={COLORS.hunter}
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
                <SummaryItem emoji="🧙‍♀️" label="P.Thủy" count={numWitches} color={COLORS.witch} />
                <SummaryItem emoji="🏹" label="T.Săn" count={numHunters} color={COLORS.hunter} />
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

            {/* ================= KHỐI THỬ HIỆU ỨNG (CHỈ DÀNH CHO CHỦ PHÒNG) ================= */}
            {!readOnly && (
              <View style={styles.seerDemoCard}>
                <View style={styles.seerDemoHeader}>
                  <Text style={styles.seerDemoHeaderEmoji}>✨</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.seerDemoHeaderTitle}>THỬ CÁC HIỆU ỨNG</Text>
                    <Text style={styles.seerDemoHeaderSub}>
                      Chủ phòng xem trước các hiệu ứng điện ảnh trong trận
                    </Text>
                  </View>
                </View>
                <View style={styles.seerDemoButtonsRow}>
                  <TouchableOpacity
                    style={styles.seerDemoBtnGood}
                    onPress={() => handleTestSeerEffect('good')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.seerDemoBtnGoodText}>🕊️ Soi Phe Thiện</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.seerDemoBtnEvil}
                    onPress={() => handleTestSeerEffect('evil')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.seerDemoBtnEvilText}>🐺 Soi Phe Ác</Text>
                  </TouchableOpacity>
                </View>

                {/* Nút thử nghiệm Sói Cào Tử Nạn buổi sáng */}
                <TouchableOpacity
                  style={styles.clawDemoBtn}
                  onPress={handleTestClawEffect}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clawDemoBtnText}>🩸🐺 Thử Hiệu Ứng Bị Sói Cào Tử Nạn</Text>
                </TouchableOpacity>

                {/* Nút thử nghiệm Khiên Bảo Vệ Thành Công */}
                <TouchableOpacity
                  style={styles.saveDemoBtn}
                  onPress={handleTestSaveEffect}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveDemoBtnText}>🛡️ Thử Hiệu Ứng Khiên Bảo Vệ Thành Công</Text>
                </TouchableOpacity>

                {/* Nút thử nghiệm Phù Thủy Cứu Sống */}
                <TouchableOpacity
                  style={styles.witchHealDemoBtn}
                  onPress={handleTestWitchHealEffect}
                  activeOpacity={0.8}
                >
                  <Text style={styles.witchHealDemoBtnText}>🧪 Thử Hiệu Ứng Phù Thủy Cứu Sống (Bình Cứu)</Text>
                </TouchableOpacity>

                {/* Nút thử nghiệm Phù Thủy Ném Thuốc Độc */}
                <TouchableOpacity
                  style={styles.witchPoisonDemoBtn}
                  onPress={handleTestWitchPoisonEffect}
                  activeOpacity={0.8}
                >
                  <Text style={styles.witchPoisonDemoBtnText}>☠️ Thử Hiệu Ứng Phù Thủy Ném Thuốc Độc</Text>
                </TouchableOpacity>

                {/* Nút thử nghiệm Xung Đột Khiên Bảo Vệ & Thuốc Độc Phù Thủy */}
                <TouchableOpacity
                  style={styles.clashDemoBtn}
                  onPress={handleTestShieldClashEffect}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clashDemoBtnText}>🛡️☠️ Thử Xung Đột: Khiên Bảo Vệ + Phù Thủy Độc</Text>
                </TouchableOpacity>

                {/* Nút thử nghiệm Thợ Săn Nổ Súng Bắn Hạ */}
                <TouchableOpacity
                  style={styles.hunterDemoBtn}
                  onPress={handleTestHunterEffect}
                  activeOpacity={0.8}
                >
                  <Text style={styles.hunterDemoBtnText}>🏹💥 Thử Hiệu Ứng Thợ Săn Nổ Súng Bắn Hạ</Text>
                </TouchableOpacity>
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

        {/* Modal chạy thử hiệu ứng Tiên Tri Soi (Dành riêng cho Chủ phòng) */}
        <SeerInspectionModal
          visible={seerDemoVisible}
          targetPlayer={seerDemoTarget}
          alignment={seerDemoAlignment}
          timeLeft={5}
          onClose={() => setSeerDemoVisible(false)}
        />

        {/* Modal chạy thử hiệu ứng Sói cào tử nạn (Dành riêng cho Chủ phòng) */}
        <WolfClawAttackModal
          visible={clawDemoVisible}
          victimPlayer={clawDemoTarget}
          timeLeft={5}
          onClose={() => setClawDemoVisible(false)}
        />

        {/* Modal chạy thử hiệu ứng Bảo Vệ thành công (Dành riêng cho Chủ phòng) */}
        <BodyguardSaveModal
          visible={saveDemoVisible}
          savedPlayer={saveDemoTarget}
          timeLeft={5}
          onClose={() => setSaveDemoVisible(false)}
        />

        {/* Modal chạy thử hiệu ứng Phù Thủy Cứu Sống (Dành riêng cho Chủ phòng) */}
        <WitchHealSaveModal
          visible={witchHealDemoVisible}
          victimPlayer={witchHealDemoTarget}
          savedPlayer={witchHealDemoTarget}
          timeLeft={8}
          onClose={() => setWitchHealDemoVisible(false)}
        />

        {/* Modal chạy thử hiệu ứng Phù Thủy Ném Thuốc Độc (Dành riêng cho Chủ phòng) */}
        <WitchPoisonModal
          visible={witchPoisonDemoVisible}
          victimPlayer={witchPoisonDemoTarget}
          poisonedPlayer={witchPoisonDemoTarget}
          isShieldClash={witchShieldClashDemo}
          timeLeft={8}
          onClose={() => {
            setWitchPoisonDemoVisible(false);
            setWitchShieldClashDemo(false);
          }}
        />

        {/* Modal chạy thử hiệu ứng Thợ Săn Nổ Súng (Dành riêng cho Chủ phòng) */}
        <HunterShotModal
          visible={hunterDemoVisible}
          targetPlayer={hunterDemoTarget}
          timeLeft={6}
          onClose={() => setHunterDemoVisible(false)}
        />
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

  // Khối thử hiệu ứng Tiên Tri dành cho Chủ Phòng
  seerDemoCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
  },
  seerDemoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  seerDemoHeaderEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  seerDemoHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E9D5FF',
    letterSpacing: 0.5,
  },
  seerDemoHeaderSub: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
    lineHeight: 14,
  },
  seerDemoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  seerDemoBtnGood: {
    flex: 1,
    backgroundColor: '#065F46',
    borderWidth: 1.5,
    borderColor: '#34D399',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seerDemoBtnGoodText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  seerDemoBtnEvil: {
    flex: 1,
    backgroundColor: '#7F1D1D',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seerDemoBtnEvilText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  clawDemoBtn: {
    backgroundColor: 'rgba(127, 29, 29, 0.5)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  clawDemoBtnText: {
    color: '#FECACA',
    fontWeight: '900',
    fontSize: 12.5,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  saveDemoBtn: {
    backgroundColor: 'rgba(14, 165, 233, 0.25)',
    borderWidth: 1.5,
    borderColor: '#0EA5E9',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveDemoBtnText: {
    color: '#BAE6FD',
    fontWeight: '900',
    fontSize: 12.5,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  witchHealDemoBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  witchHealDemoBtnText: {
    color: '#A7F3D0',
    fontWeight: '900',
    fontSize: 12.5,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  witchPoisonDemoBtn: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    borderWidth: 1.5,
    borderColor: '#C084FC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  witchPoisonDemoBtnText: {
    color: '#E9D5FF',
    fontWeight: '900',
    fontSize: 12.5,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  clashDemoBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.22)',
    borderWidth: 1.5,
    borderColor: '#FB7185',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  clashDemoBtnText: {
    color: '#FECDD3',
    fontWeight: '900',
    fontSize: 12.5,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  hunterDemoBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  hunterDemoBtnText: {
    color: '#FDE68A',
    fontWeight: '900',
    fontSize: 12.5,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
