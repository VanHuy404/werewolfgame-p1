// ============================================
// 🐺 MA SÓI - RoomSettings Component
// Modal cài đặt phòng: số người chơi, vai trò
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform,
} from 'react-native';
import { COLORS } from '../utils/colors';
import SeerInspectionModal from './SeerInspectionModal';
import WolfClawAttackModal from './WolfClawAttackModal';
import BodyguardSaveModal from './BodyguardSaveModal';
import WitchHealSaveModal from './WitchHealSaveModal';
import WitchPoisonModal from './WitchPoisonModal';
import HunterShotModal from './HunterShotModal';
import ThreeWayClashModal from './ThreeWayClashModal';
import PiedPiperModal from './PiedPiperModal';
import PiedPiperVictoryModal from './PiedPiperVictoryModal';
import PiedPiperPurifiedModal from './PiedPiperPurifiedModal';
import DualKillClashModal from './DualKillClashModal';
import DaytimeHangingModal from './DaytimeHangingModal';
import CoupleRevealModal from './CoupleRevealModal';
import CupidVictoryModal from './CupidVictoryModal';
import CoupleHeartbreakModal from './CoupleHeartbreakModal';
import CardShuffleModal from './CardShuffleModal';

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
  const [numPiedPipers, setNumPiedPipers] = useState(1);
  const [numCupids, setNumCupids] = useState(1);
  const [piedPiperCharmCount, setPiedPiperCharmCount] = useState(2);
  const [piedPiperRevealDawn, setPiedPiperRevealDawn] = useState(true);
  const [hunterShootOnHeartbreak, setHunterShootOnHeartbreak] = useState(true);
  const [showRemainingWolvesAfterVote, setShowRemainingWolvesAfterVote] = useState(true);
  const [dayDiscussionTime, setDayDiscussionTime] = useState(60);
  const [dayVoteTime, setDayVoteTime] = useState(25);
  const [nightWolfTime, setNightWolfTime] = useState(90);

  // Hộp thoại xác nhận chọn Preset nhanh / Reset toàn bộ về 0
  const [pendingPreset, setPendingPreset] = useState(null);

  const QUICK_PRESETS = [
    {
      id: 'beginner',
      badge: '🟢 Tân Thủ',
      title: '🟢 Set-up Tân Thủ (5–6 người)',
      color: '#10B981',
      rolesNote: '1 🐺 Sói • 1 🔮 Tiên Tri • 1 🛡️ Bảo Vệ • Còn lại 🧑‍🌾 Dân Làng',
      rulesNote: '🐺 Hiện số Sói sau treo cổ: BẬT (dễ làm quen, không có Phe Thứ 3)',
      timersNote: '⏱️ Thảo luận: 45s • Bỏ phiếu: 20s • Sói cắn: 60s',
      values: {
        numWolves: 1,
        numSeers: 1,
        numBodyguards: 1,
        numWitches: 0,
        numHunters: 0,
        numPiedPipers: 0,
        numCupids: 0,
        piedPiperCharmCount: 2,
        piedPiperRevealDawn: false,
        hunterShootOnHeartbreak: false,
        showRemainingWolvesAfterVote: true,
        dayDiscussionTime: 45,
        dayVoteTime: 20,
        nightWolfTime: 60,
      },
    },
    {
      id: 'classic',
      badge: '⚔️ Cổ Điển',
      title: '⚔️ Set-up Cổ Điển (7–9 người)',
      color: '#3B82F6',
      rolesNote: '2 🐺 Sói • 1 🔮 Tiên Tri • 1 🛡️ Bảo Vệ • 1 🧙‍♀️ Phù Thủy • 1 🏹 Thợ Săn • Còn lại 🧑‍🌾 Dân',
      rulesNote: '🐺 Hiện số Sói sau treo cổ: BẬT (thuần Sói vs Dân, cân bằng kinh điển)',
      timersNote: '⏱️ Thảo luận: 60s • Bỏ phiếu: 25s • Sói cắn: 75s',
      values: {
        numWolves: 2,
        numSeers: 1,
        numBodyguards: 1,
        numWitches: 1,
        numHunters: 1,
        numPiedPipers: 0,
        numCupids: 0,
        piedPiperCharmCount: 2,
        piedPiperRevealDawn: false,
        hunterShootOnHeartbreak: true,
        showRemainingWolvesAfterVote: true,
        dayDiscussionTime: 60,
        dayVoteTime: 25,
        nightWolfTime: 75,
      },
    },
    {
      id: 'cupid',
      badge: '💘 Uyên Ương',
      title: '💘 Set-up Uyên Ương (8–10 người)',
      color: '#EC4899',
      rolesNote: '2 🐺 Sói • 1 🔮 Tiên Tri • 1 🛡️ Bảo Vệ • 1 🧙‍♀️ Phù Thủy • 1 🏹 Thợ Săn • 1 💘 Cupid',
      rulesNote: '🐺 Hiện số Sói sau treo cổ: TẮT • 🏹💔 Thợ Săn tuẫn tình được bắn: BẬT',
      timersNote: '⏱️ Thảo luận: 75s • Bỏ phiếu: 25s • Sói cắn: 90s',
      values: {
        numWolves: 2,
        numSeers: 1,
        numBodyguards: 1,
        numWitches: 1,
        numHunters: 1,
        numPiedPipers: 0,
        numCupids: 1,
        piedPiperCharmCount: 2,
        piedPiperRevealDawn: false,
        hunterShootOnHeartbreak: true,
        showRemainingWolvesAfterVote: false,
        dayDiscussionTime: 75,
        dayVoteTime: 25,
        nightWolfTime: 90,
      },
    },
    {
      id: 'pied_piper',
      badge: '🎶 Tiếng Sáo',
      title: '🎶 Set-up Tiếng Sáo Đêm (8–10 người)',
      color: '#A855F7',
      rolesNote: '2 🐺 Sói • 1 🔮 Tiên Tri • 1 🛡️ Bảo Vệ • 1 🧙‍♀️ Phù Thủy • 1 🎶 Người Thổi Sáo',
      rulesNote: '🐺 Hiện số Sói sau treo cổ: TẮT • 🎶 Thôi miên 2 người/đêm • Mở mắt rạng đông: BẬT',
      timersNote: '⏱️ Thảo luận: 75s • Bỏ phiếu: 25s • Sói cắn: 90s',
      values: {
        numWolves: 2,
        numSeers: 1,
        numBodyguards: 1,
        numWitches: 1,
        numHunters: 0,
        numPiedPipers: 1,
        numCupids: 0,
        piedPiperCharmCount: 2,
        piedPiperRevealDawn: true,
        hunterShootOnHeartbreak: false,
        showRemainingWolvesAfterVote: false,
        dayDiscussionTime: 75,
        dayVoteTime: 25,
        nightWolfTime: 90,
      },
    },
  ];

  const RESET_PRESET = {
    id: 'reset',
    badge: '🔄 Reset',
    title: '🔄 Đặt lại toàn bộ về 0 (Reset)',
    color: '#EF4444',
    isReset: true,
    rolesNote: 'Tất cả vai trò chức năng (Sói, Tiên Tri, Bảo Vệ, Phù Thủy, Thợ Săn, Thổi Sáo, Cupid) đều về 0',
    rulesNote: 'TẮT toàn bộ công tắc luật (Hiện số Sói: TẮT • Mở mắt rạng đông: TẮT • Thợ Săn tuẫn tình: TẮT)',
    timersNote: '⏱️ Giữ thời gian chuẩn: Thảo luận 60s • Bỏ phiếu 25s • Sói cắn 90s',
    values: {
      numWolves: 0,
      numSeers: 0,
      numBodyguards: 0,
      numWitches: 0,
      numHunters: 0,
      numPiedPipers: 0,
      numCupids: 0,
      piedPiperCharmCount: 1,
      piedPiperRevealDawn: false,
      hunterShootOnHeartbreak: false,
      showRemainingWolvesAfterVote: false,
      dayDiscussionTime: 60,
      dayVoteTime: 25,
      nightWolfTime: 90,
    },
  };

  const applyPresetValues = (preset) => {
    if (!preset || !preset.values) return;
    const v = preset.values;
    setNumWolves(v.numWolves);
    setNumSeers(v.numSeers);
    setNumBodyguards(v.numBodyguards);
    setNumWitches(v.numWitches);
    setNumHunters(v.numHunters);
    setNumPiedPipers(v.numPiedPipers);
    setNumCupids(v.numCupids);
    setPiedPiperCharmCount(v.piedPiperCharmCount);
    setPiedPiperRevealDawn(v.piedPiperRevealDawn);
    setHunterShootOnHeartbreak(v.hunterShootOnHeartbreak);
    setShowRemainingWolvesAfterVote(v.showRemainingWolvesAfterVote);
    setDayDiscussionTime(v.dayDiscussionTime);
    setDayVoteTime(v.dayVoteTime);
    setNightWolfTime(v.nightWolfTime);
    setPendingPreset(null);
  };

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

  // Thử nghiệm hiệu ứng Tương Tác Ba Bên Liên Tục: Bảo Vệ + Ma Sói + Phù Thủy (Dành riêng cho Chủ Phòng)
  const [threeWayDemoVisible, setThreeWayDemoVisible] = useState(false);
  const [threeWayDemoTarget, setThreeWayDemoTarget] = useState(null);

  // Thử nghiệm hiệu ứng Người Thổi Sáo Mê Hoặc (Dành riêng cho Chủ Phòng)
  const [piedPiperDemoVisible, setPiedPiperDemoVisible] = useState(false);
  const [piedPiperDemoTarget, setPiedPiperDemoTarget] = useState(null);
  const [piedPiperDualDemoVisible, setPiedPiperDualDemoVisible] = useState(false);
  const [piedPiperDualDemoTargets, setPiedPiperDualDemoTargets] = useState([]);
  const [piedPiperVictoryDemoVisible, setPiedPiperVictoryDemoVisible] = useState(false);
  const [piedPiperPurifiedDemoVisible, setPiedPiperPurifiedDemoVisible] = useState(false);
  const [dualKillDemoVisible, setDualKillDemoVisible] = useState(false);
  const [daytimeHangingDemoVisible, setDaytimeHangingDemoVisible] = useState(false);
  const [daytimeHangingDemoRole, setDaytimeHangingDemoRole] = useState('villager');

  // Thử nghiệm hiệu ứng Cupid & Cặp Đôi (Dành riêng cho Chủ Phòng)
  const [coupleRevealDemoVisible, setCoupleRevealDemoVisible] = useState(false);
  const [cupidVictoryDemoVisible, setCupidVictoryDemoVisible] = useState(false);
  const [coupleHeartbreakDemoVisible, setCoupleHeartbreakDemoVisible] = useState(false);
  const [coupleSimultaneousDemo, setCoupleSimultaneousDemo] = useState(false);
  const [coupleDemoVariant, setCoupleDemoVariant] = useState('normal'); // 'normal' | 'wolf' | 'pied_piper'

  // Thử nghiệm hiệu ứng Xào Bài & Rút Bài Khởi Đầu (Dành riêng cho Chủ Phòng)
  const [cardShuffleDemoVisible, setCardShuffleDemoVisible] = useState(false);
  const [cardShuffleDemoRole, setCardShuffleDemoRole] = useState('cupid');

  // Trạng thái đóng/mở dropdown các nhóm hiệu ứng điện ảnh
  const [openSections, setOpenSections] = useState({
    seer: false,
    wolf: false,
    guard: false,
    witch: false,
    clash: false,
    hunter: false,
    piper: false,
    hanging: false,
    cupid: false,
    cardShuffle: false,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  // Helper lấy cặp đôi demo hiệu ứng: Hỗ trợ thường (Dân-Dân), có Sói (🐺), hoặc có Phe Thứ 3 (🎶)
  const getDemoCouple = (variant = coupleDemoVariant) => {
    const role1 = 'seer';
    const role2 = variant === 'wolf' ? 'wolf' : variant === 'pied_piper' ? 'pied_piper' : 'bodyguard';
    if (players && players.length >= 2) {
      return [
        { id: players[0].id || 'p1', name: players[0].name || 'Người Yêu 1', avatar: players[0].avatar || '🐱', avatarColor: players[0].avatarColor || '#F472B6', role: role1 },
        { id: players[1].id || 'p2', name: players[1].name || 'Người Yêu 2', avatar: players[1].avatar || '🐰', avatarColor: players[1].avatarColor || '#FB7185', role: role2 },
      ];
    }
    const host = (players && players.find((p) => p.id === myId)) || (players && players[0]);
    return [
      { id: host?.id || 'p1', name: host?.name || 'Người Yêu 1', avatar: host?.avatar || '🐱', avatarColor: host?.avatarColor || '#F472B6', role: role1 },
      { id: 'p2', name: variant === 'wolf' ? 'Người Yêu (Sói)' : variant === 'pied_piper' ? 'Người Yêu (Thổi Sáo)' : 'Người Yêu 2', avatar: '🐰', avatarColor: '#FB7185', role: role2 },
    ];
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
    const target = getHostTarget('Dân Làng (Nạn Nhân)', '🧑‍🌾', '#38BDF8');
    setClawDemoTarget(target);
    setClawDemoVisible(true);
  };

  const handleTestClawHunterEffect = () => {
    const target = { ...getHostTarget('Thợ Săn (Nạn Nhân)', '🏹', '#F59E0B'), role: 'hunter', isHunter: true };
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

  const handleTestThreeWayClashEffect = () => {
    const target = getHostTarget('Chủ Phòng (Bảo Vệ + Sói + Phù Thủy)', '🧙‍♂️', '#38BDF8');
    setThreeWayDemoTarget(target);
    setThreeWayDemoVisible(true);
  };

  const handleTestHunterNormalEffect = () => {
    const target = { ...getHostTarget('Dân Làng (Bị Bắn)', '🧑‍🌾', '#10B981'), role: 'villager', isWolf: false };
    setHunterDemoTarget(target);
    setHunterDemoVisible(true);
  };

  const handleTestHunterWolfEffect = () => {
    const target = { ...getHostTarget('Ma Sói (Bị Bắn)', '🐺', '#EF4444'), role: 'wolf', isWolf: true };
    setHunterDemoTarget(target);
    setHunterDemoVisible(true);
  };

  const handleTestPiedPiperEffect = () => {
    const target = getHostTarget('Chủ Phòng (Bị Thôi Miên)', '🧙‍♂️', '#C084FC');
    setPiedPiperDemoTarget(target);
    setPiedPiperDemoVisible(true);
  };

  const handleTestPiedPiperDualEffect = () => {
    const t1 = getHostTarget('Người Chơi 1 (Bị Thôi Miên)', '🧑‍🌾', '#38BDF8');
    const t2 = { id: 'demo-target-2', name: 'Người Chơi 2 (Bị Thôi Miên)', avatar: '👩‍🍳', avatarColor: '#E11D48' };
    setPiedPiperDualDemoTargets([t1, t2]);
    setPiedPiperDualDemoVisible(true);
  };

  const handleTestPiedPiperVictoryEffect = () => {
    setPiedPiperVictoryDemoVisible(true);
  };

  const handleTestPiedPiperPurifiedEffect = () => {
    setPiedPiperPurifiedDemoVisible(true);
  };

  // Sync settings khi mở modal
  useEffect(() => {
    if (initialSettings && visible) {
      setNumWolves(initialSettings.numWolves !== undefined ? initialSettings.numWolves : 2);
      setNumSeers(initialSettings.numSeers !== undefined ? Math.min(1, initialSettings.numSeers) : 1);
      setNumBodyguards(initialSettings.numBodyguards !== undefined ? Math.min(1, initialSettings.numBodyguards) : 1);
      setNumWitches(initialSettings.numWitches !== undefined ? Math.min(1, initialSettings.numWitches) : 1);
      setNumHunters(initialSettings.numHunters !== undefined ? Math.min(1, initialSettings.numHunters) : 1);
      setNumPiedPipers(initialSettings.numPiedPipers !== undefined ? Math.min(1, initialSettings.numPiedPipers) : 1);
      setNumCupids(initialSettings.numCupids !== undefined ? Math.min(1, initialSettings.numCupids) : 1);
      setPiedPiperCharmCount(initialSettings.piedPiperCharmCount || 2);
      setPiedPiperRevealDawn(initialSettings.piedPiperRevealDawn !== false);
      setHunterShootOnHeartbreak(initialSettings.hunterShootOnHeartbreak !== false);
      setShowRemainingWolvesAfterVote(initialSettings.showRemainingWolvesAfterVote !== false);
      setDayDiscussionTime(initialSettings.dayDiscussionTime || 60);
      setDayVoteTime(initialSettings.dayVoteTime || 25);
      setNightWolfTime(initialSettings.nightWolfTime || 90);
    }
  }, [initialSettings, visible]);

  // Tính số Dân Làng dựa trên số lượng người tham gia thực tế
  const totalAssignedRoles = numWolves + numSeers + numBodyguards + numWitches + numHunters + numPiedPipers + numCupids;
  const rawVillagers = currentPlayerCount - totalAssignedRoles;
  const numVillagers = Math.max(0, rawVillagers);

  // === VALIDATION ===
  // 1. Tổng số vai trò không được vượt quá số người trong phòng (khi >= 4 người)
  const isCountValid = currentPlayerCount < 4 || rawVillagers >= 0;
  // 2. Sói phải nhỏ hơn tổng dân khi đã có từ 4 người chơi trở lên
  const totalGood = numSeers + numBodyguards + numWitches + numHunters + numVillagers;
  const isWolfValid = currentPlayerCount < 4 || (numWolves > 0 && numWolves < totalGood);
  const isValid = isCountValid && isWolfValid && numWolves >= 1 && numSeers >= 0 && numBodyguards >= 0 && numWitches >= 0 && numHunters >= 0 && numPiedPipers >= 0 && numCupids >= 0;

  // Hàm thay đổi số an toàn (giới hạn min và max)
  const adjustValue = (setter, current, delta, min = 0, max = Infinity) => {
    const newVal = current + delta;
    if (newVal >= min && newVal <= max) {
      setter(newVal);
    }
  };

  const handleConfirm = () => {
    if (!isValid || readOnly) return;
    onConfirm({
      numWolves,
      numSeers,
      numBodyguards,
      numWitches,
      numHunters,
      numPiedPipers,
      numCupids,
      piedPiperCharmCount,
      piedPiperRevealDawn,
      hunterShootOnHeartbreak,
      showRemainingWolvesAfterVote,
      dayDiscussionTime,
      dayVoteTime,
      nightWolfTime,
    });
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
            {/* Bộ nút chọn nhanh Set-up (Preset 1–4) + nút Reset toàn bộ về 0 */}
            {!readOnly && (
              <View style={styles.presetSection}>
                <View style={styles.presetHeaderRow}>
                  <Text style={styles.presetSectionTitle}>⚡ Chọn nhanh Set-up</Text>
                  <TouchableOpacity
                    style={styles.resetAllBtn}
                    onPress={() => setPendingPreset(RESET_PRESET)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.resetAllBtnText}>🔄 Reset</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.presetGrid}>
                  {QUICK_PRESETS.map((preset) => (
                    <TouchableOpacity
                      key={preset.id}
                      style={[
                        styles.presetChip,
                        { borderColor: preset.color + '88', backgroundColor: preset.color + '18' },
                      ]}
                      onPress={() => setPendingPreset(preset)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.presetChipText}>{preset.badge}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

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

            {/* Số Người Thổi Sáo */}
            <SettingRow
              emoji="🎶"
              label="Số Thổi Sáo"
              value={numPiedPipers}
              onDecrease={() => adjustValue(setNumPiedPipers, numPiedPipers, -1, 0, 1)}
              onIncrease={() => adjustValue(setNumPiedPipers, numPiedPipers, 1, 0, 1)}
              min={0}
              max={1}
              color="#C084FC"
              readOnly={readOnly}
            />

            {/* Các tùy chỉnh phụ khi có Người Thổi Sáo */}
            {numPiedPipers > 0 && (
              <View style={[styles.subOptionsContainer, { borderColor: '#C084FC', backgroundColor: 'rgba(192, 132, 252, 0.08)' }]}>
                {/* 1. Thôi miên 1 hay 2 người */}
                <View style={styles.subOptionRow}>
                  <Text style={styles.subOptionLabel}>🎵 Số người thôi miên/đêm:</Text>
                  <View style={styles.subOptionToggleGroup}>
                    <TouchableOpacity
                      style={[styles.subOptionBtn, piedPiperCharmCount === 1 && styles.subOptionBtnActive]}
                      onPress={() => !readOnly && setPiedPiperCharmCount(1)}
                      disabled={readOnly}
                    >
                      <Text style={[styles.subOptionBtnText, piedPiperCharmCount === 1 && styles.subOptionBtnTextActive]}>1 người</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.subOptionBtn, piedPiperCharmCount === 2 && styles.subOptionBtnActive]}
                      onPress={() => !readOnly && setPiedPiperCharmCount(2)}
                      disabled={readOnly}
                    >
                      <Text style={[styles.subOptionBtnText, piedPiperCharmCount === 2 && styles.subOptionBtnTextActive]}>2 người</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 2. Dân làng nhận biết ai bị thôi miên trong 5s trước khi sáng */}
                <View style={[styles.subOptionRow, { marginTop: 8 }]}>
                  <Text style={styles.subOptionLabel}>👁️ Nhận biết 5s trước sáng:</Text>
                  <View style={styles.subOptionToggleGroup}>
                    <TouchableOpacity
                      style={[styles.subOptionBtn, piedPiperRevealDawn && styles.subOptionBtnActive]}
                      onPress={() => !readOnly && setPiedPiperRevealDawn(true)}
                      disabled={readOnly}
                    >
                      <Text style={[styles.subOptionBtnText, piedPiperRevealDawn && styles.subOptionBtnTextActive]}>BẬT 🟢</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.subOptionBtn, !piedPiperRevealDawn && styles.subOptionBtnActive]}
                      onPress={() => !readOnly && setPiedPiperRevealDawn(false)}
                      disabled={readOnly}
                    >
                      <Text style={[styles.subOptionBtnText, !piedPiperRevealDawn && styles.subOptionBtnTextActive]}>TẮT 🔴</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Số Thần Tình Yêu Cupid */}
            <SettingRow
              emoji="💘"
              label="Số Cupid"
              value={numCupids}
              onDecrease={() => adjustValue(setNumCupids, numCupids, -1, 0, 1)}
              onIncrease={() => adjustValue(setNumCupids, numCupids, 1, 0, 1)}
              min={0}
              max={1}
              color="#EC4899"
              readOnly={readOnly}
            />

            {/* Tùy chỉnh phụ khi có Cupid: Thợ Săn chết theo người yêu có được bắn không */}
            {numCupids > 0 && (
              <View style={[styles.subOptionsContainer, { borderColor: '#EC4899', backgroundColor: 'rgba(236, 72, 153, 0.08)' }]}>
                <View style={styles.subOptionRow}>
                  <Text style={styles.subOptionLabel}>🏹💔 Thợ Săn chết theo người yêu được bắn:</Text>
                  <View style={styles.subOptionToggleGroup}>
                    <TouchableOpacity
                      style={[styles.subOptionBtn, hunterShootOnHeartbreak && styles.subOptionBtnActive]}
                      onPress={() => !readOnly && setHunterShootOnHeartbreak(true)}
                      disabled={readOnly}
                    >
                      <Text style={[styles.subOptionBtnText, hunterShootOnHeartbreak && styles.subOptionBtnTextActive]}>BẬT 🟢</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.subOptionBtn, !hunterShootOnHeartbreak && styles.subOptionBtnActive]}
                      onPress={() => !readOnly && setHunterShootOnHeartbreak(false)}
                      disabled={readOnly}
                    >
                      <Text style={[styles.subOptionBtnText, !hunterShootOnHeartbreak && styles.subOptionBtnTextActive]}>TẮT 🔴</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Tùy chỉnh luật hiển thị: Hiện số Sói còn lại sau khi treo cổ */}
            <View style={[styles.subOptionsContainer, { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.08)', marginTop: 4 }]}>
              <View style={styles.subOptionRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.subOptionLabel}>🐺 Hiện số Sói còn lại sau treo cổ:</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>
                    Khuyên TẮT khi bật Cupid hoặc nhiều Phe Thứ 3 để giữ cân bằng
                  </Text>
                </View>
                <View style={styles.subOptionToggleGroup}>
                  <TouchableOpacity
                    style={[styles.subOptionBtn, showRemainingWolvesAfterVote && styles.subOptionBtnActive]}
                    onPress={() => !readOnly && setShowRemainingWolvesAfterVote(true)}
                    disabled={readOnly}
                  >
                    <Text style={[styles.subOptionBtnText, showRemainingWolvesAfterVote && styles.subOptionBtnTextActive]}>BẬT 🟢</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.subOptionBtn, !showRemainingWolvesAfterVote && styles.subOptionBtnActive]}
                    onPress={() => !readOnly && setShowRemainingWolvesAfterVote(false)}
                    disabled={readOnly}
                  >
                    <Text style={[styles.subOptionBtnText, !showRemainingWolvesAfterVote && styles.subOptionBtnTextActive]}>TẮT 🔴</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

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
                { backgroundColor: rawVillagers < 0 ? 'rgba(239, 68, 68, 0.2)' : COLORS.villager + '20' },
              ]}>
                <Text style={[
                  styles.autoValueText,
                  { color: rawVillagers < 0 ? '#EF4444' : COLORS.villager },
                ]}>
                  {numVillagers}
                </Text>
              </View>
            </View>

            {/* Cảnh báo khi vượt quá vai trò đặt ngay bên dưới hàng số dân */}
            {rawVillagers < 0 && (
              <View style={styles.villagerWarningNotice}>
                <Text style={styles.villagerWarningNoticeText}>
                  ⚠️ Đang phân bổ thừa {Math.abs(rawVillagers)} vai trò chức năng so với số người trong phòng ({currentPlayerCount} người)!
                </Text>
              </View>
            )}

            {/* Tổng kết vai trò */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>📋 Phân bổ vai trò (Theo {currentPlayerCount} người)</Text>
              <View style={styles.summaryGrid}>
                <SummaryItem emoji="🐺" label="Sói" count={numWolves} color={COLORS.wolf} />
                <SummaryItem emoji="🔮" label="T.Tri" count={numSeers} color={COLORS.seer} />
                <SummaryItem emoji="🛡️" label="B.Vệ" count={numBodyguards} color={COLORS.bodyguard} />
                <SummaryItem emoji="🧙‍♀️" label="P.Thủy" count={numWitches} color={COLORS.witch} />
                <SummaryItem emoji="🏹" label="T.Săn" count={numHunters} color={COLORS.hunter} />
                {numPiedPipers > 0 && <SummaryItem emoji="🎶" label="T.Sáo" count={numPiedPipers} color="#C084FC" />}
                {numCupids > 0 && <SummaryItem emoji="💘" label="Cupid" count={numCupids} color="#EC4899" />}
                <SummaryItem emoji="🧑‍🌾" label="Dân" count={numVillagers} color={COLORS.villager} />
                <SummaryItem emoji="👥" label="Tổng" count={currentPlayerCount} color={COLORS.primary} />
              </View>
            </View>

            {/* ================= PHẦN CÀI ĐẶT THỜI GIAN PHÒNG ================= */}
            <View style={styles.timeSectionBox}>
              <View style={styles.timeSectionHeader}>
                <Text style={styles.timeSectionHeaderEmoji}>⏱️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timeSectionHeaderTitle}>CÀI ĐẶT THỜI GIAN PHÒNG</Text>
                  <Text style={styles.timeSectionHeaderSub}>Điều chỉnh thời lượng các pha trong trận đấu</Text>
                </View>
              </View>

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

              {/* Thời gian ban đêm Ma Sói */}
              <SettingRow
                emoji="🌙"
                label="Thời gian đêm Sói"
                value={nightWolfTime}
                suffix="s"
                onDecrease={() => setNightWolfTime(Math.max(30, nightWolfTime - 15))}
                onIncrease={() => setNightWolfTime(Math.min(180, nightWolfTime + 15))}
                min={30}
                max={180}
                color={COLORS.wolf}
                readOnly={readOnly}
              />
            </View>

            {/* Hiển thị cảnh báo nếu tổng vai trò chức năng vượt quá số người trong phòng */}
            {!isCountValid && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  ⚠️ Tổng số vai trò ({totalAssignedRoles}) vượt quá số người trong phòng ({currentPlayerCount})! Hãy giảm bớt vai trò chức năng.
                </Text>
              </View>
            )}

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
              <View style={styles.demoMainContainer}>
                {/* 1. 🔮 NHÓM TIÊN TRI */}
                <AccordionDemoBox
                  isOpen={openSections.seer}
                  onToggle={() => toggleSection('seer')}
                  title="🔮 Thử Hiệu Ứng Tiên Tri"
                  themeColor="#A855F7"
                  bgColor="rgba(21, 18, 43, 0.95)"
                >
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
                </AccordionDemoBox>

                {/* 2. 🐺🩸 NHÓM MA SÓI */}
                <AccordionDemoBox
                  isOpen={openSections.wolf}
                  onToggle={() => toggleSection('wolf')}
                  title="🩸🐺 Thử Hiệu Ứng Bị Sói Cào Tử Nạn"
                  themeColor="#EF4444"
                  bgColor="rgba(21, 18, 43, 0.95)"
                >
                  <TouchableOpacity
                    style={[styles.clawDemoBtn, { marginTop: 0 }]}
                    onPress={handleTestClawEffect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.clawDemoBtnText}>🩸🐺 Thử Sói Cào (Dân Làng)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.clawDemoBtn, { backgroundColor: 'rgba(217, 119, 6, 0.45)', borderColor: '#F59E0B', borderWidth: 2 }]}
                    onPress={handleTestClawHunterEffect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.clawDemoBtnText}>🏹🩸 Thử Sói Cào (Thợ Săn)</Text>
                  </TouchableOpacity>
                </AccordionDemoBox>

                {/* 3. 🛡️ NHÓM BẢO VỆ */}
                <AccordionDemoBox
                  isOpen={openSections.guard}
                  onToggle={() => toggleSection('guard')}
                  title="🛡️ Thử Hiệu Ứng Khiên Bảo Vệ Thành Công"
                  themeColor="#0284C7"
                  bgColor="rgba(21, 18, 43, 0.95)"
                >
                  <TouchableOpacity
                    style={[styles.saveDemoBtn, { marginTop: 0 }]}
                    onPress={handleTestSaveEffect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveDemoBtnText}>🛡️ Thử Hiệu Ứng Khiên Bảo Vệ Thành Công</Text>
                  </TouchableOpacity>
                </AccordionDemoBox>

                {/* 4. 🧙‍♀️🧪 NHÓM PHÙ THỦY */}
                <AccordionDemoBox
                  isOpen={openSections.witch}
                  onToggle={() => toggleSection('witch')}
                  title="🧙‍♀️🧪 Thử Hiệu Ứng Phù Thủy"
                  themeColor="#C026D3"
                  bgColor="rgba(21, 18, 43, 0.95)"
                >
                  <TouchableOpacity
                    style={[styles.witchHealDemoBtn, { marginTop: 0 }]}
                    onPress={handleTestWitchHealEffect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.witchHealDemoBtnText}>🧪 Thử Hiệu Ứng Phù Thủy Cứu Sống</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.witchPoisonDemoBtn}
                    onPress={handleTestWitchPoisonEffect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.witchPoisonDemoBtnText}>☠️ Thử Hiệu Ứng Phù Thủy Ném Thuốc Độc</Text>
                  </TouchableOpacity>
                </AccordionDemoBox>

                {/* 5. ⚔️💥 NHÓM XUNG ĐỘT ĐA PHE BAN ĐÊM */}
                <AccordionDemoBox
                  isOpen={openSections.clash}
                  onToggle={() => toggleSection('clash')}
                  title="🛡️🐺☠️ Thử Xung Đột Đa Phe Ban Đêm"
                  themeColor="#F43F5E"
                  bgColor="rgba(21, 18, 43, 0.95)"
                >
                  <TouchableOpacity
                    style={[styles.clashDemoBtn, { marginTop: 0 }]}
                    onPress={handleTestShieldClashEffect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.clashDemoBtnText}>🛡️☠️ Thử Xung Đột: Khiên Bảo Vệ + Phù Thủy Bỏ Độc</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.clashDemoBtn, { backgroundColor: 'rgba(56, 189, 248, 0.25)', borderColor: '#38BDF8', borderWidth: 2 }]}
                    onPress={handleTestThreeWayClashEffect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.clashDemoBtnText}>🛡️🐺☠️ Thử Tương Tác: Bảo Vệ + Ma Sói + Phù Thủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.clashDemoBtn, { backgroundColor: 'rgba(220, 38, 38, 0.35)', borderColor: '#DC2626', borderWidth: 2 }]}
                    onPress={() => setDualKillDemoVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.clashDemoBtnText}>🐺🧪 Thử Sói & Phù Thủy Cùng Giết</Text>
                  </TouchableOpacity>
                </AccordionDemoBox>

                {/* 6. 🏹🎯 NHÓM THỢ SĂN */}
                <AccordionDemoBox
                  isOpen={openSections.hunter}
                  onToggle={() => toggleSection('hunter')}
                  title="🏹 Thợ Săn Nổ Súng Trăn Trối"
                  themeColor="#F59E0B"
                  bgColor="rgba(21, 18, 43, 0.95)"
                >
                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { marginTop: 0, borderWidth: 2 }]}
                    onPress={handleTestHunterNormalEffect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>🏹 Thợ Săn Bắn Vào Dân</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { backgroundColor: 'rgba(127, 29, 29, 0.5)', borderColor: '#EF4444', borderWidth: 2 }]}
                    onPress={handleTestHunterWolfEffect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>🏹🐺 Thợ Săn Bắn Vào Sói</Text>
                  </TouchableOpacity>
                </AccordionDemoBox>

                {/* 7. 🎶👑 NHÓM NGƯỜI THỔI SÁO */}
                <AccordionDemoBox
                  isOpen={openSections.piper}
                  onToggle={() => toggleSection('piper')}
                  title="🎶👑 Thử Hiệu Ứng Người Thổi Sáo"
                  themeColor="#E879F9"
                  bgColor="rgba(21, 18, 43, 0.95)"
                >
                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { marginTop: 0, backgroundColor: 'rgba(192, 132, 252, 0.35)', borderColor: '#C084FC', borderWidth: 2 }]}
                    onPress={handleTestPiedPiperEffect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>🎶 Thử Thổi Sáo 1 Người</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { backgroundColor: 'rgba(168, 85, 247, 0.35)', borderColor: '#A855F7', borderWidth: 2 }]}
                    onPress={handleTestPiedPiperDualEffect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>🎶🎶 Thử Thổi Sáo 2 Người</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { backgroundColor: 'rgba(147, 51, 234, 0.45)', borderColor: '#E879F9', borderWidth: 2 }]}
                    onPress={handleTestPiedPiperVictoryEffect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>👑 Thử Chiến Thắng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { backgroundColor: 'rgba(245, 158, 11, 0.45)', borderColor: '#F59E0B', borderWidth: 2 }]}
                    onPress={handleTestPiedPiperPurifiedEffect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>⚰️ Thử Thổi Sáo Tử Nạn</Text>
                  </TouchableOpacity>
                </AccordionDemoBox>

                {/* 8. ⚖️⚰️ NHÓM ĐOẠN ĐẦU ĐÀI (TREO CỔ BAN NGÀY) */}
                <AccordionDemoBox
                  isOpen={openSections.hanging}
                  onToggle={() => toggleSection('hanging')}
                  title="⚖️⚰️ Thử Hoạt Ảnh Treo Cổ"
                  themeColor="#FB923C"
                  bgColor="rgba(21, 18, 43, 0.95)"
                >
                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { marginTop: 0, backgroundColor: 'rgba(180, 83, 9, 0.45)', borderColor: '#D97706', borderWidth: 2 }]}
                    onPress={() => {
                      setDaytimeHangingDemoRole('villager');
                      setDaytimeHangingDemoVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>⚖️⚰️ Thử Treo Cổ Dân Làng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { backgroundColor: 'rgba(220, 38, 38, 0.45)', borderColor: '#EF4444', borderWidth: 2 }]}
                    onPress={() => {
                      setDaytimeHangingDemoRole('wolf');
                      setDaytimeHangingDemoVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>🐺⚖️ Thử Treo Cổ Sói</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { backgroundColor: 'rgba(245, 158, 11, 0.45)', borderColor: '#F59E0B', borderWidth: 2 }]}
                    onPress={() => {
                      setDaytimeHangingDemoRole('hunter');
                      setDaytimeHangingDemoVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>🏹⚖️ Thử Treo Cổ Thợ Săn</Text>
                  </TouchableOpacity>
                </AccordionDemoBox>

                {/* 9. 💘 NHÓM THẦN TÌNH YÊU CUPID & CẶP ĐÔI */}
                <AccordionDemoBox
                  isOpen={openSections.cupid}
                  onToggle={() => toggleSection('cupid')}
                  title="💘 Thử Hiệu Ứng Cupid & Cặp Đôi"
                  themeColor="#EC4899"
                  bgColor="rgba(21, 18, 43, 0.95)"
                >
                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { marginTop: 0, backgroundColor: 'rgba(236, 72, 153, 0.35)', borderColor: '#EC4899', borderWidth: 2 }]}
                    onPress={() => {
                      setCoupleDemoVariant('normal');
                      setCoupleRevealDemoVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>💘 Kết Nối Cặp Đôi Thường</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { backgroundColor: 'rgba(220, 38, 38, 0.38)', borderColor: '#EF4444', borderWidth: 2 }]}
                    onPress={() => {
                      setCoupleDemoVariant('wolf');
                      setCoupleRevealDemoVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>🐺💘 Kết Nối Cặp Đôi Có Sói</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { backgroundColor: 'rgba(147, 51, 234, 0.38)', borderColor: '#C084FC', borderWidth: 2 }]}
                    onPress={() => {
                      setCoupleDemoVariant('pied_piper');
                      setCoupleRevealDemoVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>🎶💘 Kết Nối Cặp Đôi Có Phe Thứ 3</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { backgroundColor: 'rgba(244, 114, 182, 0.35)', borderColor: '#F472B6', borderWidth: 2 }]}
                    onPress={() => setCupidVictoryDemoVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>🏆💘 Thử Hoạt Ảnh Chiến Thắng Cupid</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { backgroundColor: 'rgba(239, 68, 68, 0.32)', borderColor: '#EF4444', borderWidth: 2 }]}
                    onPress={() => {
                      setCoupleDemoVariant('normal');
                      setCoupleSimultaneousDemo(false);
                      setCoupleHeartbreakDemoVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>💔 Người Yêu Chết Theo (Tuẫn Tình)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, { backgroundColor: 'rgba(147, 51, 234, 0.42)', borderColor: '#C084FC', borderWidth: 2 }]}
                    onPress={() => {
                      setCoupleDemoVariant('normal');
                      setCoupleSimultaneousDemo(true);
                      setCoupleHeartbreakDemoVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>🐺☠️💔 Cả 2 Cùng Chết Trong Đêm (Sói Cào + Độc)</Text>
                  </TouchableOpacity>
                </AccordionDemoBox>

                {/* 10. 🃏 NHÓM XÀO BÀI & RÚT BÀI ĐIỆN ẢNH */}
                <AccordionDemoBox
                  isOpen={openSections.cardShuffle}
                  onToggle={() => toggleSection('cardShuffle')}
                  title="🃏 Thử Hoạt Ảnh Xào Bài & Rút Bài"
                  themeColor="#60A5FA"
                  bgColor="rgba(21, 18, 43, 0.95)"
                >
                  {/* Nút Xào Bài Ngẫu Nhiên */}
                  <TouchableOpacity
                    style={[styles.hunterDemoBtn, {
                      marginTop: 0,
                      marginBottom: 10,
                      backgroundColor: 'rgba(96, 165, 250, 0.35)',
                      borderColor: '#60A5FA',
                      borderWidth: 2,
                    }]}
                    onPress={() => {
                      setCardShuffleDemoRole('random');
                      setCardShuffleDemoVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hunterDemoBtnText}>🎲🔀 Thử Xào Bài Ngẫu Nhiên (Random Role)</Text>
                  </TouchableOpacity>

                  <Text style={[styles.summaryTitle, { color: '#93C5FD', marginBottom: 8, fontSize: 12 }]}>
                    Hoặc chọn vai trò cụ thể để xào bài & lật mở thẻ:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { id: 'cupid', name: '💘 Cupid', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.25)' },
                      { id: 'wolf', name: '🐺 Ma Sói', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.25)' },
                      { id: 'seer', name: '🔮 Tiên Tri', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.25)' },
                      { id: 'bodyguard', name: '🛡️ Bảo Vệ', color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.25)' },
                      { id: 'witch', name: '🧙‍♀️ Phù Thủy', color: '#10B981', bg: 'rgba(16, 185, 129, 0.25)' },
                      { id: 'hunter', name: '🏹 Thợ Săn', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.25)' },
                      { id: 'pied_piper', name: '🎶 Thổi Sáo', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.25)' },
                      { id: 'villager', name: '🧑‍🌾 Dân Làng', color: '#14B8A6', bg: 'rgba(20, 184, 166, 0.25)' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={{
                          width: '48%',
                          flexGrow: 1,
                          paddingVertical: 10,
                          paddingHorizontal: 8,
                          borderRadius: 8,
                          backgroundColor: item.bg,
                          borderColor: item.color,
                          borderWidth: 1.5,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onPress={() => {
                          setCardShuffleDemoRole(item.id);
                          setCardShuffleDemoVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </AccordionDemoBox>
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

        {/* Hộp thoại xác nhận Set-up Preset / Reset kèm ghi chú chi tiết cấu hình */}
        <Modal
          visible={Boolean(pendingPreset)}
          transparent
          animationType="fade"
          onRequestClose={() => setPendingPreset(null)}
        >
          <View style={styles.presetConfirmOverlay}>
            <View
              style={[
                styles.presetConfirmCard,
                pendingPreset?.color ? { borderColor: pendingPreset.color } : null,
              ]}
            >
              <Text style={styles.presetConfirmTitle}>
                {pendingPreset?.title || 'Xác nhận cấu hình'}
              </Text>
              <View style={styles.presetNoteBox}>
                <Text style={styles.presetNoteHeading}>📋 Chi tiết cấu hình sẽ áp dụng:</Text>
                <Text style={styles.presetNoteLine}>• <Text style={styles.presetNoteBold}>Vai trò:</Text> {pendingPreset?.rolesNote}</Text>
                <Text style={styles.presetNoteLine}>• <Text style={styles.presetNoteBold}>Luật & Công tắc:</Text> {pendingPreset?.rulesNote}</Text>
                <Text style={styles.presetNoteLine}>• <Text style={styles.presetNoteBold}>Thời gian:</Text> {pendingPreset?.timersNote}</Text>
              </View>
              <View style={styles.presetConfirmBtnRow}>
                <TouchableOpacity
                  style={styles.presetCancelBtn}
                  onPress={() => setPendingPreset(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.presetCancelBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.presetApplyBtn,
                    { backgroundColor: pendingPreset?.isReset ? '#DC2626' : (pendingPreset?.color || '#6366F1') },
                  ]}
                  onPress={() => applyPresetValues(pendingPreset)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.presetApplyBtnText}>
                    {pendingPreset?.isReset ? '🔄 Xác nhận Reset' : '✅ Áp dụng Set-up'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
          timeLeft={8}
          onClose={() => setHunterDemoVisible(false)}
        />

        {/* Modal chạy thử hiệu ứng Tương Tác Ba Bên Liên Tục: Bảo Vệ + Sói + Phù Thủy (Dành riêng cho Chủ phòng) */}
        <ThreeWayClashModal
          visible={threeWayDemoVisible}
          victimPlayer={threeWayDemoTarget}
          timeLeft={9}
          onClose={() => setThreeWayDemoVisible(false)}
        />

        {/* Modal chạy thử hiệu ứng Người Thổi Sáo (1 người) */}
        <PiedPiperModal
          visible={piedPiperDemoVisible}
          targetPlayer={piedPiperDemoTarget}
          timeLeft={8}
          onClose={() => setPiedPiperDemoVisible(false)}
        />

        {/* Modal chạy thử hiệu ứng Người Thổi Sáo (2 người) */}
        <PiedPiperModal
          visible={piedPiperDualDemoVisible}
          targetPlayers={piedPiperDualDemoTargets}
          timeLeft={8}
          onClose={() => setPiedPiperDualDemoVisible(false)}
        />

        {/* Modal chạy thử Hoạt ảnh Chiến Thắng Người Thổi Sáo (5s) */}
        <PiedPiperVictoryModal
          visible={piedPiperVictoryDemoVisible}
          winnerPlayer={getHostTarget('Chủ Phòng (Người Thổi Sáo)', '🎶', '#9333EA')}
          duration={5}
          onComplete={() => setPiedPiperVictoryDemoVisible(false)}
        />

        {/* Modal chạy thử Hoạt ảnh Thanh Tẩy Hoàng Kim (5s) */}
        <PiedPiperPurifiedModal
          visible={piedPiperPurifiedDemoVisible}
          piedPiper={getHostTarget('Người Thổi Sáo', '🎶', '#9333EA')}
          purifiedPlayers={players && players.length > 0 ? players.slice(0, 3) : [
            { id: '1', name: 'Dân Làng A', avatar: '🧑‍🌾', avatarColor: '#10B981' },
            { id: '2', name: 'Tiên Tri', avatar: '🔮', avatarColor: '#3B82F6' },
            { id: '3', name: 'Bảo Vệ', avatar: '🛡️', avatarColor: '#0EA5E9' },
          ]}
          duration={6}
          onClose={() => setPiedPiperPurifiedDemoVisible(false)}
        />

        {/* Modal chạy thử Hoạt ảnh Cả Sói & Phù Thủy cùng giết 1 người */}
        <DualKillClashModal
          visible={dualKillDemoVisible}
          victimPlayer={getHostTarget('Mục Tiêu Thử Nghiệm', '🧑‍🌾', '#EF4444')}
          duration={5}
          onClose={() => setDualKillDemoVisible(false)}
        />

        {/* Modal chạy thử Hoạt ảnh Đoạn Đầu Đài Treo Cổ Ban Ngày (Hỗ trợ Dân làng, Sói, Thợ Săn) */}
        <DaytimeHangingModal
          visible={daytimeHangingDemoVisible}
          victimPlayer={{
            ...getHostTarget(
              daytimeHangingDemoRole === 'wolf' ? 'Kẻ Đội Lốt Sói' : daytimeHangingDemoRole === 'hunter' ? 'Thợ Săn Bị Treo Cổ' : 'Kẻ Bị Phán Quyết',
              daytimeHangingDemoRole === 'wolf' ? '🐺' : daytimeHangingDemoRole === 'hunter' ? '🏹' : '🧑‍🌾',
              daytimeHangingDemoRole === 'wolf' ? '#DC2626' : daytimeHangingDemoRole === 'hunter' ? '#F59E0B' : '#EF4444'
            ),
            role: daytimeHangingDemoRole,
            isWolf: daytimeHangingDemoRole === 'wolf',
            isHunter: daytimeHangingDemoRole === 'hunter',
          }}
          duration={5}
          onClose={() => setDaytimeHangingDemoVisible(false)}
        />

        {/* Modal chạy thử Hoạt ảnh Kết Nối Trái Tim Cặp Đôi */}
        <CoupleRevealModal
          visible={coupleRevealDemoVisible}
          couple={getDemoCouple()}
          isMyCouple={true}
          duration={6}
          onClose={() => setCoupleRevealDemoVisible(false)}
        />

        {/* Modal chạy thử Hoạt ảnh Chiến Thắng Cupid (Victory) */}
        <CupidVictoryModal
          visible={cupidVictoryDemoVisible}
          couple={getDemoCouple()}
          duration={7}
          onComplete={() => setCupidVictoryDemoVisible(false)}
        />

        {/* Modal chạy thử Hoạt ảnh Người Yêu Chết & Tim Vỡ / Đồng Tử Trong Đêm */}
        <CoupleHeartbreakModal
          visible={coupleHeartbreakDemoVisible}
          deadPlayer={getDemoCouple()[0]}
          heartbrokenPlayer={getDemoCouple()[1]}
          reason={coupleSimultaneousDemo ? 'cùng ngã xuống trong đêm' : 'bị sát hại dã man'}
          isSimultaneousNightDeath={coupleSimultaneousDemo}
          duration={coupleSimultaneousDemo ? 7 : 6}
          onClose={() => {
            setCoupleHeartbreakDemoVisible(false);
            setCoupleSimultaneousDemo(false);
          }}
        />

        {/* Modal chạy thử Hoạt ảnh Xào Bài & Lật Mở Vai Trò */}
        <CardShuffleModal
          visible={cardShuffleDemoVisible}
          initialRole={cardShuffleDemoRole}
          isMatchIntro={false}
          autoCloseSeconds={6}
          onClose={() => setCardShuffleDemoVisible(false)}
        />
      </View>
    </Modal>
  );
}

// ==================== SUB-COMPONENTS ====================

/** Khối dropdown Accordion gom nhóm hiệu ứng điện ảnh */
function AccordionDemoBox({
  isOpen,
  onToggle,
  title,
  themeColor,
  bgColor = 'rgba(21, 18, 43, 0.95)',
  children,
}) {
  return (
    <View style={styles.accordionContainer}>
      <TouchableOpacity
        style={[
          styles.accordionHeaderBtn,
          {
            backgroundColor: bgColor || 'rgba(21, 18, 43, 0.95)',
            borderColor: themeColor,
            borderBottomLeftRadius: isOpen ? 0 : 12,
            borderBottomRightRadius: isOpen ? 0 : 12,
            ...(Platform.OS === 'web' ? { boxShadow: `0 0 12px ${themeColor}50` } : {}),
          },
        ]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Text style={styles.accordionHeaderBtnText}>
          {title}
        </Text>
        <Text style={[styles.accordionChevron, { color: themeColor }]}>
          {isOpen ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {isOpen && (
        <View
          style={[
            styles.accordionExpandedBody,
            {
              borderColor: themeColor,
              backgroundColor: 'rgba(16, 13, 34, 0.98)',
            },
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
}

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
    backgroundColor: 'rgba(5, 3, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'rgba(21, 18, 43, 0.98)',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    elevation: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
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
    color: '#F8FAFC',
  },

  // Setting rows
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 13,
    marginBottom: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingRowError: {
    borderColor: 'rgba(239, 68, 68, 0.6)',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  autoRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
    color: '#F8FAFC',
  },
  settingHint: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  settingRange: {
    fontSize: 11,
    color: '#94A3B8',
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
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  adjustBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    elevation: 0,
  },
  adjustBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  adjustBtnTextDisabled: {
    color: '#475569',
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
  villagerWarningNotice: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    marginTop: -2,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  villagerWarningNoticeText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
  timeSectionBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.28)',
  },
  timeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.2)',
  },
  timeSectionHeaderEmoji: {
    fontSize: 22,
  },
  timeSectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#93C5FD',
    letterSpacing: 0.5,
  },
  timeSectionHeaderSub: {
    fontSize: 11,
    color: '#BFDBFE',
    marginTop: 1,
  },

  // Summary
  summaryBox: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C4B5FD',
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    rowGap: 12,
  },
  summaryItem: {
    width: '20%',
    alignItems: 'center',
    marginBottom: 4,
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
    color: '#94A3B8',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.4)',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  confirmBtnDisabled: {
    backgroundColor: '#1E1B3A',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 0,
    shadowOpacity: 0,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Khối thư viện hiệu ứng điện ảnh (Chia box dropdown)
  demoMainContainer: {
    marginTop: 10,
    marginBottom: 6,
  },
  accordionContainer: {
    marginTop: 8,
  },
  accordionHeaderBtn: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  accordionHeaderBtnText: {
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
    flex: 1,
    marginRight: 8,
  },
  accordionChevron: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  accordionExpandedBody: {
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: 'rgba(16, 13, 34, 0.98)',
    padding: 12,
    gap: 8,
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
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Tùy chọn mở rộng cho Người Thổi Sáo
  subOptionsContainer: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginVertical: 6,
  },
  subOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subOptionLabel: {
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  subOptionToggleGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  subOptionBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  subOptionBtnActive: {
    backgroundColor: '#9333EA',
  },
  subOptionBtnText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  subOptionBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // Bộ nút chọn nhanh Preset + Reset
  presetSection: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  presetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  presetSectionTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  resetAllBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  resetAllBtnText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '800',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    flexGrow: 1,
    minWidth: '47%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.2,
    alignItems: 'center',
  },
  presetChipText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },

  // Hộp thoại xác nhận áp dụng Preset / Reset
  presetConfirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  presetConfirmCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#6366F1',
  },
  presetConfirmTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  presetNoteBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    gap: 6,
  },
  presetNoteHeading: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  presetNoteLine: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
  },
  presetNoteBold: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  presetConfirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  presetCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    alignItems: 'center',
  },
  presetCancelBtnText: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 13,
  },
  presetApplyBtn: {
    flex: 1.4,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  presetApplyBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
