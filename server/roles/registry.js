// ============================================
// 🧩 MA SÓI - Role Registry (Plugin Architecture)
// Khung đăng ký vai trò tập trung để mở rộng 15-20+ vai trò
// mà không cần sửa rải rác if/else trong State Machine
// ============================================

const { ROLES, ROLE_NAMES, ROLE_EMOJIS, ROLE_COLORS, PHASES } = require('../constants');

const FACTIONS = {
  VILLAGE: 'village',
  WOLF: 'wolf',
  NEUTRAL: 'neutral',
};

/** Map<roleId, RoleDefinition> */
const roleRegistry = new Map();

/**
 * Đăng ký một vai trò mới (hoặc ghi đè vai trò hiện có) vào Registry
 * @param {Object} def
 * @param {string} def.id - Mã vai trò duy nhất (vd: 'wolf', 'seer', 'jester')
 * @param {string} def.name - Tên tiếng Việt
 * @param {string} def.emoji - Emoji đại diện
 * @param {string} def.color - Mã màu hiển thị
 * @param {'village'|'wolf'|'neutral'} def.faction - Phe của vai trò
 * @param {string|null} [def.settingsKey] - Key trong room.settings (vd: 'numSeers'), null nếu là vai trò mặc định điền chỗ trống
 * @param {number|null} [def.maxPerRoom] - Giới hạn tối đa trong 1 phòng (null = không giới hạn)
 * @param {number} [def.assignPriority] - Thứ tự ưu tiên phân vai (nhỏ hơn phân trước)
 * @param {number|null} [def.nightOrder] - Thứ tự thức dậy ban đêm (nhỏ hơn dậy trước, null = không dậy đêm)
 * @param {string|null} [def.nightPhase] - Phase ID tương ứng ban đêm
 * @param {'first_only'|'every_night'|'passive'} [def.activeNights] - Tần suất thức dậy
 * @param {'good'|'evil'} [def.seerAlignment] - Kết quả khi Tiên Tri soi trúng
 * @param {boolean} [def.isWolfPack] - Có thuộc bầy Sói (chung Hang Sói, đồng minh Sói, tính vào quân số Sói)
 * @param {Function} [def.initPlayerState] - Hook khởi tạo trạng thái riêng trên object player khi chia bài
 */
function registerRole(def) {
  if (!def || !def.id) {
    throw new Error('RoleRegistry: role definition must include a valid "id".');
  }
  const normalized = {
    id: def.id,
    name: def.name || def.id,
    emoji: def.emoji || '❓',
    color: def.color || '#94A3B8',
    faction: def.faction || FACTIONS.VILLAGE,
    settingsKey: def.settingsKey !== undefined ? def.settingsKey : null,
    maxPerRoom: def.maxPerRoom !== undefined ? def.maxPerRoom : 1,
    assignPriority: def.assignPriority !== undefined ? def.assignPriority : 100,
    nightOrder: def.nightOrder !== undefined ? def.nightOrder : null,
    nightPhase: def.nightPhase !== undefined ? def.nightPhase : null,
    activeNights: def.activeNights || 'passive',
    seerAlignment: def.seerAlignment || (def.faction === FACTIONS.WOLF ? 'evil' : 'good'),
    isWolfPack: def.isWolfPack !== undefined ? def.isWolfPack : def.faction === FACTIONS.WOLF,
    initPlayerState: typeof def.initPlayerState === 'function' ? def.initPlayerState : null,
  };
  roleRegistry.set(normalized.id, normalized);
  return normalized;
}

/** Hủy đăng ký một vai trò (chủ yếu dùng cho unit test) */
function unregisterRole(roleId) {
  return roleRegistry.delete(roleId);
}

/** Lấy định nghĩa của 1 vai trò */
function getRole(roleId) {
  return roleRegistry.get(roleId) || null;
}

/** Lấy danh sách toàn bộ vai trò đã đăng ký */
function getAllRoles() {
  return [...roleRegistry.values()];
}

/** Lấy danh sách vai trò theo phe */
function getRolesByFaction(faction) {
  return getAllRoles().filter((r) => r.faction === faction);
}

/**
 * Lấy danh sách các vai trò có settingsKey để chia bài theo đúng thứ tự ưu tiên
 */
function getAssignableRoles() {
  return getAllRoles()
    .filter((r) => Boolean(r.settingsKey))
    .sort((a, b) => a.assignPriority - b.assignPriority);
}

/**
 * Lấy danh sách vai trò có hành động ban đêm theo đúng thứ tự nightOrder cho vòng `round`
 * @param {number} round - Số đêm (1, 2, 3...)
 */
function getNightOrderedRoles(round = 1) {
  return getAllRoles()
    .filter((r) => {
      if (r.nightOrder === null || r.activeNights === 'passive') return false;
      if (r.activeNights === 'first_only' && round > 1) return false;
      return true;
    })
    .sort((a, b) => a.nightOrder - b.nightOrder);
}

/**
 * Kiểm tra 1 vai trò có thuộc bầy Sói (Phe Sói) hay không.
 * Dùng hàm này thay vì `role === ROLES.WOLF` để sau này thêm Sói Đầu Đàn, Sói Tiên Tri, Sói Con... tự động tương thích!
 */
function isWolfTeam(roleId) {
  const def = getRole(roleId);
  if (def) return Boolean(def.isWolfPack);
  return roleId === ROLES.WOLF;
}

/**
 * Lấy kết quả soi Tiên Tri cho một vai trò
 * @returns {{ alignment: 'good'|'evil', alignmentName: string }}
 */
function getSeerAlignment(roleId) {
  const def = getRole(roleId);
  const alignment = def ? def.seerAlignment : (roleId === ROLES.WOLF ? 'evil' : 'good');
  const isEvil = alignment === 'evil';
  return {
    isEvil,
    alignment,
    alignmentName: isEvil ? 'ÁC' : 'THIỆN',
  };
}

/**
 * Khởi tạo trạng thái riêng của vai trò trên object player khi chia bài
 */
function initRoleStateForPlayer(player) {
  if (!player || !player.role) return;
  const def = getRole(player.role);
  if (def && def.initPlayerState) {
    def.initPlayerState(player);
  }
}

// ==================== ĐĂNG KÝ 8 VAI TRÒ CỐT LÕI ====================

registerRole({
  id: ROLES.WOLF,
  name: ROLE_NAMES[ROLES.WOLF],
  emoji: ROLE_EMOJIS[ROLES.WOLF],
  color: ROLE_COLORS[ROLES.WOLF],
  faction: FACTIONS.WOLF,
  settingsKey: 'numWolves',
  maxPerRoom: null,
  assignPriority: 10,
  nightOrder: 30,
  nightPhase: PHASES.NIGHT_WOLF,
  activeNights: 'every_night',
  seerAlignment: 'evil',
  isWolfPack: true,
});

registerRole({
  id: ROLES.SEER,
  name: ROLE_NAMES[ROLES.SEER],
  emoji: ROLE_EMOJIS[ROLES.SEER],
  color: ROLE_COLORS[ROLES.SEER],
  faction: FACTIONS.VILLAGE,
  settingsKey: 'numSeers',
  maxPerRoom: 1,
  assignPriority: 20,
  nightOrder: 50,
  nightPhase: PHASES.NIGHT_SEER,
  activeNights: 'every_night',
  seerAlignment: 'good',
});

registerRole({
  id: ROLES.PIED_PIPER,
  name: ROLE_NAMES[ROLES.PIED_PIPER],
  emoji: ROLE_EMOJIS[ROLES.PIED_PIPER],
  color: ROLE_COLORS[ROLES.PIED_PIPER],
  faction: FACTIONS.NEUTRAL,
  settingsKey: 'numPiedPipers',
  maxPerRoom: 1,
  assignPriority: 30,
  nightOrder: 60,
  nightPhase: PHASES.NIGHT_PIED_PIPER,
  activeNights: 'every_night',
  seerAlignment: 'good',
});

registerRole({
  id: ROLES.CUPID,
  name: ROLE_NAMES[ROLES.CUPID],
  emoji: ROLE_EMOJIS[ROLES.CUPID],
  color: ROLE_COLORS[ROLES.CUPID],
  faction: FACTIONS.VILLAGE,
  settingsKey: 'numCupids',
  maxPerRoom: 1,
  assignPriority: 40,
  nightOrder: 10,
  nightPhase: PHASES.NIGHT_CUPID,
  activeNights: 'first_only',
  seerAlignment: 'good',
});

registerRole({
  id: ROLES.WITCH,
  name: ROLE_NAMES[ROLES.WITCH],
  emoji: ROLE_EMOJIS[ROLES.WITCH],
  color: ROLE_COLORS[ROLES.WITCH],
  faction: FACTIONS.VILLAGE,
  settingsKey: 'numWitches',
  maxPerRoom: 1,
  assignPriority: 50,
  nightOrder: 40,
  nightPhase: PHASES.NIGHT_WITCH,
  activeNights: 'every_night',
  seerAlignment: 'good',
  initPlayerState: (player) => {
    player.witchState = { hasHeal: true, hasPoison: true };
  },
});

registerRole({
  id: ROLES.BODYGUARD,
  name: ROLE_NAMES[ROLES.BODYGUARD],
  emoji: ROLE_EMOJIS[ROLES.BODYGUARD],
  color: ROLE_COLORS[ROLES.BODYGUARD],
  faction: FACTIONS.VILLAGE,
  settingsKey: 'numBodyguards',
  maxPerRoom: 1,
  assignPriority: 60,
  nightOrder: 20,
  nightPhase: PHASES.NIGHT_BODYGUARD,
  activeNights: 'every_night',
  seerAlignment: 'good',
});

registerRole({
  id: ROLES.HUNTER,
  name: ROLE_NAMES[ROLES.HUNTER],
  emoji: ROLE_EMOJIS[ROLES.HUNTER],
  color: ROLE_COLORS[ROLES.HUNTER],
  faction: FACTIONS.VILLAGE,
  settingsKey: 'numHunters',
  maxPerRoom: 1,
  assignPriority: 70,
  nightOrder: null,
  nightPhase: null,
  activeNights: 'passive',
  seerAlignment: 'good',
});

registerRole({
  id: ROLES.VILLAGER,
  name: ROLE_NAMES[ROLES.VILLAGER],
  emoji: ROLE_EMOJIS[ROLES.VILLAGER],
  color: ROLE_COLORS[ROLES.VILLAGER],
  faction: FACTIONS.VILLAGE,
  settingsKey: null, // Vai trò mặc định lấp đầy chỗ trống
  maxPerRoom: null,
  assignPriority: 999,
  nightOrder: null,
  nightPhase: null,
  activeNights: 'passive',
  seerAlignment: 'good',
});

module.exports = {
  FACTIONS,
  registerRole,
  unregisterRole,
  getRole,
  getAllRoles,
  getRolesByFaction,
  getAssignableRoles,
  getNightOrderedRoles,
  isWolfTeam,
  getSeerAlignment,
  initRoleStateForPlayer,
};
