// ============================================
// 🐺 MA SÓI - Game Logic (State Machine)
// ============================================
// Xử lý toàn bộ logic game: tạo phòng, phân vai, đêm/ngày, vote, win condition

const { ROLES, PHASES, AVATARS, AVATAR_COLORS, DEFAULT_SETTINGS } = require('./constants');

// ==================== LƯU TRỮ ====================
/** Map<roomCode, Room> - Lưu trữ tất cả phòng trong bộ nhớ */
const rooms = new Map();

// ==================== HELPER ====================

/** Tạo mã phòng ngẫu nhiên 5 ký tự (loại bỏ ký tự dễ nhầm: 0/O, 1/I/L) */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Trộn ngẫu nhiên mảng (Fisher-Yates shuffle) */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ==================== QUẢN LÝ PHÒNG ====================

/**
 * Tạo phòng mới
 * @param {string} hostId - Socket ID của chủ phòng
 * @param {string} hostName - Tên hiển thị chủ phòng
 * @param {Object} settings - Cài đặt phòng { maxPlayers, numWolves, numSeers }
 * @returns {{ room?: Room, error?: string }}
 */
function createRoom(hostId, hostName, settings = {}, customAvatar = null) {
  // Tạo mã phòng duy nhất
  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  // Cài đặt phòng: tính theo số lượng người tham gia thực tế (không giới hạn người vào)
  const numWolves = settings.numWolves !== undefined 
    ? settings.numWolves 
    : DEFAULT_SETTINGS.numWolves;
  const numSeers = settings.numSeers !== undefined ? settings.numSeers : DEFAULT_SETTINGS.numSeers;
  const numBodyguards = settings.numBodyguards !== undefined ? settings.numBodyguards : DEFAULT_SETTINGS.numBodyguards;

  const roomSettings = {
    numWolves,
    numSeers,
    numBodyguards,
    dayDiscussionTime: settings.dayDiscussionTime !== undefined ? settings.dayDiscussionTime : DEFAULT_SETTINGS.dayDiscussionTime,
    dayVoteTime: settings.dayVoteTime !== undefined ? settings.dayVoteTime : DEFAULT_SETTINGS.dayVoteTime,
  };

  // Tạo cấu trúc phòng
  const room = {
    code,
    hostId,
    settings: roomSettings,
    players: new Map(),
    phase: PHASES.WAITING,
    nightActions: {
      wolfVotes: new Map(),           // Map<wolfId, targetId>
      wolfConfirmed: new Set(),       // Set<wolfId> - đã bấm nút xác nhận
      seerCheck: null,                // { seerId, targetId }
      bodyguardTarget: null,          // targetId được chọn bảo vệ đêm nay
      lastProtectedTarget: null,      // targetId đã bảo vệ đêm trước (ko lặp 2 đêm liên tiếp)
    },
    dayVotes: new Map(),     // Map<voterId, targetId>
    deadThisNight: null,     // ID người chết ban đêm
    attackedThisNight: null, // ID người bị Sói cắn
    savedThisNight: null,    // ID người được Bảo Vệ cứu sống
    seerHistory: {},         // { [targetId]: { alignment, alignmentName } } - Lịch sử soi của Tiên Tri
    messages: [],
    round: 0,
    timer: null,
    timeLeft: 0,
  };

  const cleanHostName = (hostName || 'Chủ phòng').trim().slice(0, 20);
  // Thêm chủ phòng là người chơi đầu tiên
  room.players.set(hostId, {
    id: hostId,
    name: cleanHostName,
    role: null,
    alive: true,
    avatar: customAvatar || AVATARS[0],
    avatarColor: AVATAR_COLORS[0],
    connected: true,
  });

  rooms.set(code, room);
  return { room };
}

/**
 * Người chơi vào phòng (Không giới hạn số lượng người)
 * @returns {{ room?: Room, error?: string }}
 */
function joinRoom(code, playerId, playerName, customAvatar = null) {
  const room = rooms.get(code);
  if (!room) return { error: 'Phòng không tồn tại!' };
  if (room.phase !== PHASES.WAITING) return { error: 'Game đã bắt đầu rồi!' };
  // SỐ LƯỢNG NGƯỜI THAM GIA KHÔNG BỊ GIỚI HẠN (Theo yêu cầu)
  if (room.players.has(playerId)) return { error: 'Bạn đã ở trong phòng!' };

  const cleanName = (playerName || 'Dân làng').trim().slice(0, 20);

  // Kiểm tra tên trùng
  for (const [, p] of room.players) {
    if (p.name.toLowerCase() === cleanName.toLowerCase()) {
      return { error: 'Tên này đã có người dùng, vui lòng chọn tên khác!' };
    }
  }

  const avatarIndex = room.players.size % AVATARS.length;
  room.players.set(playerId, {
    id: playerId,
    name: cleanName,
    role: null,
    alive: true,
    avatar: customAvatar || AVATARS[avatarIndex],
    avatarColor: AVATAR_COLORS[avatarIndex],
    connected: true,
  });

  return { room };
}

/**
 * Người chơi rời phòng
 * @returns {Room|null} - Room đã cập nhật hoặc null nếu phòng bị xóa
 */
function leaveRoom(code, playerId) {
  const room = rooms.get(code);
  if (!room) return null;

  room.players.delete(playerId);

  // Nếu chủ phòng rời -> chuyển quyền cho người tiếp theo
  if (playerId === room.hostId && room.players.size > 0) {
    room.hostId = room.players.keys().next().value;
  }

  // Nếu phòng trống -> xóa phòng
  if (room.players.size === 0) {
    if (room.timer) clearInterval(room.timer);
    rooms.delete(code);
    return null;
  }

  return room;
}

// ==================== PHÂN VAI TRÒ ====================

/**
 * Phân vai trò ngẫu nhiên cho tất cả người chơi
 * Dựa trên settings: numWolves, numSeers, numBodyguards, phần còn lại là Villager
 */
function assignRoles(room) {
  const playerIds = shuffleArray([...room.players.keys()]);
  const { numWolves, numSeers, numBodyguards = 1 } = room.settings;
  let index = 0;

  // Gán Sói
  for (let i = 0; i < numWolves && index < playerIds.length; i++, index++) {
    room.players.get(playerIds[index]).role = ROLES.WOLF;
  }

  // Gán Tiên Tri
  for (let i = 0; i < numSeers && index < playerIds.length; i++, index++) {
    room.players.get(playerIds[index]).role = ROLES.SEER;
  }

  // Gán Bảo Vệ
  for (let i = 0; i < numBodyguards && index < playerIds.length; i++, index++) {
    room.players.get(playerIds[index]).role = ROLES.BODYGUARD;
  }

  // Phần còn lại -> Dân Làng
  while (index < playerIds.length) {
    room.players.get(playerIds[index]).role = ROLES.VILLAGER;
    index++;
  }
}

// ==================== XỬ LÝ BAN ĐÊM ====================

/**
 * Xử lý hành động ban đêm (Sói vote cắn & Bảo Vệ che chở)
 * @returns {{ deadPlayerId: string|null, attackedPlayerId: string|null, savedPlayerId: string|null, wasProtected: boolean }}
 */
function processNightActions(room) {
  // Đếm phiếu Sói
  const voteCount = new Map();
  room.nightActions.wolfVotes.forEach((targetId) => {
    voteCount.set(targetId, (voteCount.get(targetId) || 0) + 1);
  });

  // Tìm người bị vote nhiều nhất
  let maxVotes = 0;
  let targets = [];
  voteCount.forEach((count, targetId) => {
    if (count > maxVotes) {
      maxVotes = count;
      targets = [targetId];
    } else if (count === maxVotes) {
      targets.push(targetId);
    }
  });

  // Xác định người bị Sói tấn công (Người có số vote cao nhất. Hòa phiếu hoặc không ai vote -> Không ai chết đêm đó)
  let attackedPlayerId = null;
  if (targets.length === 1 && maxVotes > 0) {
    attackedPlayerId = targets[0];
  }
  // Nếu hòa phiếu (targets.length > 1) hoặc không ai vote -> attackedPlayerId = null (Không ai bị cắn)

  // Kiểm tra mục tiêu của Bảo Vệ
  const protectedPlayerId = room.nightActions.bodyguardTarget || null;
  let deadPlayerId = null;
  let savedPlayerId = null;
  let wasProtected = false;

  if (attackedPlayerId) {
    if (protectedPlayerId && protectedPlayerId === attackedPlayerId) {
      // BẢO VỆ ĐÚNG NGƯỜI: Nạn nhân không chết!
      wasProtected = true;
      savedPlayerId = attackedPlayerId;
      deadPlayerId = null;
    } else {
      // Không được bảo vệ đúng người -> Chết
      deadPlayerId = attackedPlayerId;
    }
  }

  // Lưu lịch sử người được bảo vệ đêm nay để đêm kế tiếp không được bảo vệ liên tiếp
  room.nightActions.lastProtectedTarget = protectedPlayerId;

  room.deadThisNight = deadPlayerId;
  room.attackedThisNight = attackedPlayerId;
  room.savedThisNight = savedPlayerId;

  if (!room.nightActions) room.nightActions = {};
  room.nightActions.deadPlayerId = deadPlayerId;
  room.nightActions.attackedPlayerId = attackedPlayerId;
  room.nightActions.savedPlayerId = savedPlayerId;
  room.nightActions.wasProtected = wasProtected;

  // Reset hành động đêm
  room.nightActions.wolfVotes.clear();
  if (room.nightActions.wolfConfirmed) {
    room.nightActions.wolfConfirmed.clear();
  }
  room.nightActions.seerCheck = null;
  room.nightActions.bodyguardTarget = null;

  return {
    deadPlayerId,
    attackedPlayerId,
    savedPlayerId,
    wasProtected,
  };
}

// ==================== XỬ LÝ BỎ PHIẾU BAN NGÀY ====================

/**
 * Xử lý kết quả bỏ phiếu ban ngày
 * @returns {{ eliminatedId: string|null, voteDetails: Object }}
 */
function processDayVote(room) {
  const voteCount = new Map();
  room.dayVotes.forEach((targetId) => {
    voteCount.set(targetId, (voteCount.get(targetId) || 0) + 1);
  });

  let maxVotes = 0;
  let targets = [];
  voteCount.forEach((count, targetId) => {
    if (count > maxVotes) {
      maxVotes = count;
      targets = [targetId];
    } else if (count === maxVotes) {
      targets.push(targetId);
    }
  });

  // Hòa phiếu hoặc mục tiêu cao nhất là 'skip' (bỏ phiếu trắng) -> Không ai bị loại
  let eliminatedId = null;
  if (targets.length === 1 && maxVotes > 0 && targets[0] !== 'skip') {
    eliminatedId = targets[0];
    const player = room.players.get(eliminatedId);
    if (player) {
      player.alive = false;
    }
  }

  // Lưu chi tiết vote để hiển thị
  const voteDetails = {};
  room.dayVotes.forEach((targetId, voterId) => {
    voteDetails[voterId] = targetId;
  });

  room.dayVotes.clear();
  return { eliminatedId, voteDetails };
}

// ==================== KIỂM TRA WIN CONDITION ====================

/** Lấy danh sách người chơi còn sống */
function getAlivePlayers(room) {
  return [...room.players.values()].filter((p) => p.alive);
}

/**
 * Kiểm tra điều kiện chiến thắng
 * - Dân thắng: Tất cả Sói bị loại
 * - Sói thắng: Số Sói >= Số Dân còn lại
 */
function checkWinCondition(room) {
  const alive = getAlivePlayers(room);
  const wolves = alive.filter((p) => p.role === ROLES.WOLF);
  const nonWolves = alive.filter((p) => p.role !== ROLES.WOLF);

  if (wolves.length === 0) {
    return {
      gameOver: true,
      winner: 'village',
      message: '🎉 Dân Làng chiến thắng! Tất cả Sói đã bị tiêu diệt!',
    };
  }

  if (wolves.length >= nonWolves.length) {
    return {
      gameOver: true,
      winner: 'wolves',
      message: '🐺 Sói chiến thắng! Bầy Sói đã thống trị làng!',
    };
  }

  return { gameOver: false };
}

// ==================== TRUY VẤN DỮ LIỆU ====================

/**
 * Lấy dữ liệu người chơi đã sanitize (ẩn role trừ chính mình)
 * @param {Room} room
 * @param {string|null} forPlayerId - Hiển thị role cho người chơi này
 */
function getPlayersData(room, forPlayerId = null) {
  return [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    alive: p.alive,
    avatar: p.avatar,
    avatarColor: p.avatarColor,
    connected: p.connected,
    // Chỉ hiện role cho chính mình hoặc khi game over
    role: (forPlayerId === p.id || room.phase === PHASES.GAME_OVER) ? p.role : null,
  }));
}

/** Lấy phòng theo mã code */
function getRoom(code) {
  return rooms.get(code);
}

/** Tìm phòng chứa người chơi */
function getRoomByPlayerId(playerId) {
  for (const [, room] of rooms) {
    if (room.players.has(playerId)) {
      return room;
    }
  }
  return null;
}

/** Validate settings phòng (tính theo số người tham gia) */
function validateSettings(settings, currentParticipants = 0) {
  const { numWolves, numSeers, numBodyguards = 0, dayDiscussionTime, dayVoteTime } = settings;
  
  if (numWolves < 0 || numSeers < 0 || numBodyguards < 0) {
    return { valid: false, error: 'Số vai trò không được âm!' };
  }
  if (dayDiscussionTime !== undefined && (dayDiscussionTime < 10 || dayDiscussionTime > 300)) {
    return { valid: false, error: 'Thời gian thảo luận phải từ 10s đến 300s!' };
  }
  if (dayVoteTime !== undefined && (dayVoteTime < 10 || dayVoteTime > 180)) {
    return { valid: false, error: 'Thời gian bỏ phiếu phải từ 10s đến 180s!' };
  }
  
  if (currentParticipants >= 4) {
    const numVillagers = currentParticipants - numWolves - numSeers - numBodyguards;
    if (numVillagers < 0) {
      return { valid: false, error: 'Tổng Sói + Tiên Tri + Bảo Vệ vượt quá số người tham gia!' };
    }
    const totalGood = numSeers + numBodyguards + numVillagers;
    if (numWolves >= totalGood) {
      return { valid: false, error: 'Số Sói phải nhỏ hơn tổng Phe Dân (Tiên Tri + Bảo Vệ + Dân Làng)!' };
    }
  }
  
  return { valid: true };
}

module.exports = {
  rooms,
  createRoom,
  joinRoom,
  leaveRoom,
  assignRoles,
  processNightActions,
  processDayVote,
  checkWinCondition,
  getAlivePlayers,
  getPlayersData,
  getRoom,
  getRoomByPlayerId,
  validateSettings,
};
