// ============================================
// 🐺 MA SÓI - Hằng số trò chơi
// ============================================

/** Các vai trò trong game */
const ROLES = {
  WOLF: 'wolf',              // 🐺 Sói
  SEER: 'seer',              // 🔮 Tiên Tri
  BODYGUARD: 'bodyguard',    // 🛡️ Bảo Vệ
  WITCH: 'witch',            // 🧙‍♀️ Phù Thủy
  HUNTER: 'hunter',          // 🏹 Thợ Săn
  PIED_PIPER: 'pied_piper',  // 🎶 Người Thổi Sáo
  CUPID: 'cupid',            // 💘 Thần Tình Yêu Cupid
  VILLAGER: 'villager',      // 🧑‍🌾 Dân Làng
};

/** Tên hiển thị tiếng Việt */
const ROLE_NAMES = {
  [ROLES.WOLF]: 'Sói',
  [ROLES.SEER]: 'Tiên Tri',
  [ROLES.BODYGUARD]: 'Bảo Vệ',
  [ROLES.WITCH]: 'Phù Thủy',
  [ROLES.HUNTER]: 'Thợ Săn',
  [ROLES.PIED_PIPER]: 'Người Thổi Sáo',
  [ROLES.CUPID]: 'Cupid',
  [ROLES.VILLAGER]: 'Dân Làng',
};

/** Emoji đại diện cho vai trò */
const ROLE_EMOJIS = {
  [ROLES.WOLF]: '🐺',
  [ROLES.SEER]: '🔮',
  [ROLES.BODYGUARD]: '🛡️',
  [ROLES.WITCH]: '🧙‍♀️',
  [ROLES.HUNTER]: '🏹',
  [ROLES.PIED_PIPER]: '🎶',
  [ROLES.CUPID]: '💘',
  [ROLES.VILLAGER]: '🧑‍🌾',
};

/** Màu đại diện cho vai trò */
const ROLE_COLORS = {
  [ROLES.WOLF]: '#DC2626',
  [ROLES.SEER]: '#3B82F6',
  [ROLES.BODYGUARD]: '#0EA5E9',
  [ROLES.WITCH]: '#A855F7',
  [ROLES.HUNTER]: '#F59E0B',
  [ROLES.PIED_PIPER]: '#C084FC',
  [ROLES.CUPID]: '#EC4899',
  [ROLES.VILLAGER]: '#10B981',
};

/** Các pha trong trò chơi */
const PHASES = {
  WAITING: 'waiting',                  // Chờ trong phòng
  NIGHT_CUPID: 'night_cupid',          // Ban đêm - Thần tình yêu Cupid ghép đôi (25s, chỉ đêm 1)
  NIGHT_COUPLE_REVEAL: 'night_couple_reveal', // 6s Cặp đôi mở mắt nhận nhau
  NIGHT_BODYGUARD: 'night_bodyguard',  // Ban đêm - Bảo Vệ thức dậy (30s)
  NIGHT_WOLF: 'night_wolf',            // Ban đêm - Sói cắn (90s)
  NIGHT_WITCH: 'night_witch',          // Ban đêm - Phù Thủy thức dậy (30s)
  NIGHT_SEER: 'night_seer',            // Ban đêm - Tiên tri soi (30s)
  NIGHT_PIED_PIPER: 'night_pied_piper',// Ban đêm - Người Thổi Sáo (25s)
  NIGHT_CHARMED_REVEAL: 'night_charmed_reveal', // 5s người dân nhận biết ai bị thôi miên
  NIGHT: 'night',                      // Fallback ban đêm
  DAY_ANNOUNCE: 'day_announce',        // Thông báo kết quả đêm / người chết
  HUNTER_SHOT: 'hunter_shot',          // 🏹 Thợ Săn nổ súng trăn trối (12s)
  DAY_DISCUSSION: 'day_discussion',    // Thảo luận ban ngày
  DAY_VOTE: 'day_vote',               // Bỏ phiếu
  GAME_OVER: 'game_over',             // Kết thúc
};

/** Thời gian mỗi pha (giây) */
const TIMERS = {
  NIGHT_CUPID: 25,     // 💘 Cupid chọn 2 người yêu nhau (25 giây, tự động random nếu không chọn)
  NIGHT_COUPLE_REVEAL: 6, // 💘 6s Cặp đôi mở mắt hé lộ tình yêu
  NIGHT_BODYGUARD: 30, // 🛡️ Bảo Vệ chọn bảo vệ (30 giây, tự động rút xuống 5s khi chọn)
  NIGHT_WOLF: 90,      // 🐺 Sói chọn người 1p30s (90 giây)
  NIGHT_WITCH: 30,     // 🧙‍♀️ Phù Thủy chọn cứu/độc (30 giây, tự động rút xuống 5s)
  NIGHT_SEER: 30,      // 🔮 Tiên Tri soi (30 giây, tự động rút xuống 5s sau khi soi)
  NIGHT_PIED_PIPER: 25,// 🎶 Người Thổi Sáo (25 giây, tự động rút xuống 5s khi chọn xong)
  NIGHT_CHARMED_REVEAL: 5, // 🎶 5s cả làng nhận biết ai bị thôi miên trước khi sáng
  NIGHT: 90,           // Fallback
  DAY_ANNOUNCE: 8,
  HUNTER_SHOT: 12,     // 🏹 Thợ Săn chọn mục tiêu nổ súng (12 giây)
  DAY_DISCUSSION: 60,
  DAY_VOTE: 25,
  ROLE_REVEAL: 4,
};

/** Avatar emoji cho người chơi */
const AVATARS = ['🐱', '🐶', '🐰', '🦊', '🐸', '🐼', '🐨', '🦁', '🐮', '🐷', '🐵', '🐔'];

/** Màu nền avatar */
const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
];

/** Cài đặt phòng mặc định */
const DEFAULT_SETTINGS = {
  numWolves: 2,
  numSeers: 1,
  numBodyguards: 1,      // 🛡️ Mặc định 1 Bảo Vệ (0-1)
  numWitches: 1,         // 🧙‍♀️ Mặc định 1 Phù Thủy (0-1)
  numHunters: 1,         // 🏹 Mặc định 1 Thợ Săn (0-1)
  numPiedPipers: 1,      // 🎶 Mặc định 1 Người Thổi Sáo (0-1) -> Kích hoạt sẵn để chơi ngay!
  numCupids: 1,          // 💘 Mặc định 1 Thần Tình Yêu Cupid (0-1) -> Kích hoạt sẵn để chơi ngay!
  piedPiperCharmCount: 2,// 🎶 Số người bị thôi miên mỗi đêm (1 hoặc 2)
  piedPiperRevealDawn: true, // 🎶 Bật/Tắt 5s cả làng nhận biết ai bị thôi miên trước khi sáng
  hunterShootOnHeartbreak: true, // 🏹💔 Bật/Tắt Thợ Săn chết theo người yêu vẫn được bắn trăn trối
  showRemainingWolvesAfterVote: true, // 🐺 Bật/Tắt hiển thị bảng số Sói còn lại sau khi treo cổ (Tắt để cân bằng khi có Cupid)
  dayDiscussionTime: 60, // Thời gian bàn luận (giây)
  dayVoteTime: 25,       // Thời gian bỏ phiếu (giây)
  nightWolfTime: 90,     // 🐺 Thời gian Ma Sói chọn mồi (giây)
};

module.exports = {
  ROLES, ROLE_NAMES, ROLE_EMOJIS, ROLE_COLORS,
  PHASES, TIMERS, AVATARS, AVATAR_COLORS, DEFAULT_SETTINGS,
};
