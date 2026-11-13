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
  const numWitches = settings.numWitches !== undefined ? settings.numWitches : DEFAULT_SETTINGS.numWitches;
  const numHunters = settings.numHunters !== undefined ? settings.numHunters : DEFAULT_SETTINGS.numHunters;
  const numPiedPipers = settings.numPiedPipers !== undefined ? settings.numPiedPipers : DEFAULT_SETTINGS.numPiedPipers;
  const numCupids = settings.numCupids !== undefined ? settings.numCupids : (DEFAULT_SETTINGS.numCupids !== undefined ? DEFAULT_SETTINGS.numCupids : 1);

  const roomSettings = {
    numWolves,
    numSeers,
    numBodyguards,
    numWitches,
    numHunters,
    numPiedPipers,
    numCupids,
    piedPiperCharmCount: settings.piedPiperCharmCount !== undefined ? settings.piedPiperCharmCount : DEFAULT_SETTINGS.piedPiperCharmCount,
    piedPiperRevealDawn: settings.piedPiperRevealDawn !== undefined ? settings.piedPiperRevealDawn : DEFAULT_SETTINGS.piedPiperRevealDawn,
    hunterShootOnHeartbreak: settings.hunterShootOnHeartbreak !== undefined ? settings.hunterShootOnHeartbreak : DEFAULT_SETTINGS.hunterShootOnHeartbreak,
    dayDiscussionTime: settings.dayDiscussionTime !== undefined ? settings.dayDiscussionTime : DEFAULT_SETTINGS.dayDiscussionTime,
    dayVoteTime: settings.dayVoteTime !== undefined ? settings.dayVoteTime : DEFAULT_SETTINGS.dayVoteTime,
    nightWolfTime: settings.nightWolfTime !== undefined ? settings.nightWolfTime : DEFAULT_SETTINGS.nightWolfTime,
  };

  // Tạo cấu trúc phòng
  const room = {
    code,
    hostId,
    hostPlayerName: hostName || '',
    settings: roomSettings,
    players: new Map(),
    phase: PHASES.WAITING,
    couple: null, // [id1, id2] - Cặp đôi trúng tên Cupid
    cupidActed: false, // Cupid đã ghép đôi xong chưa (chỉ đêm 1)
    nightActions: {
      wolfVotes: new Map(),           // Map<wolfId, targetId>
      wolfConfirmed: new Set(),       // Set<wolfId> - đã bấm nút xác nhận
      seerCheck: null,                // { seerId, targetId }
      bodyguardTarget: null,          // targetId được chọn bảo vệ đêm nay
      lastProtectedTarget: null,      // targetId đã bảo vệ đêm trước (ko lặp 2 đêm liên tiếp)
      witchSavedThisNight: false,     // Phù Thủy đã dùng bình cứu đêm nay
      witchPoisonTarget: null,        // Mục tiêu bị Phù Thủy ném độc đêm nay
      piedPiperTargets: [],           // [targetId1, targetId2] mục tiêu bị Người Thổi Sáo mê hoặc đêm nay
    },
    dayVotes: new Map(),     // Map<voterId, targetId>
    deadThisNight: null,     // ID người chết do Sói cắn
    poisonedThisNight: null, // ID người chết do Phù Thủy hạ độc
    attackedThisNight: null, // ID người bị Sói cắn
    savedThisNight: null,    // ID người được Bảo Vệ cứu sống
    witchSavedThisNight: null, // ID người được Phù Thủy cứu sống
    seerHistory: {},         // { [targetId]: { alignment, alignmentName } } - Lịch sử soi của Tiên Tri
    charmedPlayers: new Set(), // Set<playerId> - Danh sách người chơi bị Người Thổi Sáo mê hoặc
    charmedHistory: {},      // { [targetId]: true } - Lịch sử mê hoặc của Người Thổi Sáo
    matchHistory: [],        // Lịch sử diễn biến từng Đêm / Ngày trong trận đấu
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
    const nextHostId = room.players.keys().next().value;
    room.hostId = nextHostId;
    const nextHostPlayer = room.players.get(nextHostId);
    if (nextHostPlayer) {
      room.hostPlayerName = nextHostPlayer.name;
    }
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
  const {
    numWolves = 2,
    numSeers = 1,
    numBodyguards = 1,
    numWitches = 1,
    numHunters = 1,
    numPiedPipers = 1,
    numCupids = 1,
  } = room.settings;
  let index = 0;

  // Gán Sói
  for (let i = 0; i < numWolves && index < playerIds.length; i++, index++) {
    room.players.get(playerIds[index]).role = ROLES.WOLF;
  }

  // Gán Tiên Tri (0 - 1)
  for (let i = 0; i < Math.min(1, numSeers) && index < playerIds.length; i++, index++) {
    room.players.get(playerIds[index]).role = ROLES.SEER;
  }

  // Gán Người Thổi Sáo (0 - 1) (Ưu tiên gán nếu phòng bật để đảm bảo có người thổi sáo trong trận)
  for (let i = 0; i < Math.min(1, numPiedPipers) && index < playerIds.length; i++, index++) {
    const piedPiperPlayer = room.players.get(playerIds[index]);
    piedPiperPlayer.role = ROLES.PIED_PIPER;
  }

  // Gán Thần Tình Yêu Cupid (0 - 1)
  for (let i = 0; i < Math.min(1, numCupids) && index < playerIds.length; i++, index++) {
    const cupidPlayer = room.players.get(playerIds[index]);
    cupidPlayer.role = ROLES.CUPID;
  }

  // Gán Phù Thủy (0 - 1)
  for (let i = 0; i < Math.min(1, numWitches) && index < playerIds.length; i++, index++) {
    const witchPlayer = room.players.get(playerIds[index]);
    witchPlayer.role = ROLES.WITCH;
    witchPlayer.witchState = { hasHeal: true, hasPoison: true };
  }

  // Gán Bảo Vệ (0 - 1)
  for (let i = 0; i < Math.min(1, numBodyguards) && index < playerIds.length; i++, index++) {
    room.players.get(playerIds[index]).role = ROLES.BODYGUARD;
  }

  // Gán Thợ Săn (0 - 1)
  for (let i = 0; i < Math.min(1, numHunters) && index < playerIds.length; i++, index++) {
    const hunterPlayer = room.players.get(playerIds[index]);
    hunterPlayer.role = ROLES.HUNTER;
  }

  // Phần còn lại -> Dân Làng
  while (index < playerIds.length) {
    room.players.get(playerIds[index]).role = ROLES.VILLAGER;
    index++;
  }
}

// ==================== XỬ LÝ BAN ĐÊM ====================

/**
 * Xử lý hành động ban đêm (Sói vote cắn & Bảo Vệ che chở & Phù Thủy cứu/độc)
 * @returns {{ deadPlayerId: string|null, poisonedPlayerId: string|null, attackedPlayerId: string|null, savedPlayerId: string|null, witchSavedPlayerId: string|null, wasProtected: boolean, wasWitchSaved: boolean }}
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

  // Xác định người bị Sói tấn công (Người có số vote cao nhất. Hòa phiếu hoặc không ai vote -> Không ai bị cắn)
  let attackedPlayerId = null;
  if (targets.length === 1 && maxVotes > 0) {
    attackedPlayerId = targets[0];
  }

  // Kiểm tra mục tiêu của Bảo Vệ
  const protectedPlayerId = room.nightActions.bodyguardTarget || null;
  let wasProtected = false;
  let savedByBodyguardId = null;

  if (attackedPlayerId && protectedPlayerId === attackedPlayerId) {
    wasProtected = true;
    savedByBodyguardId = attackedPlayerId;
  }

  // Kiểm tra mục tiêu được Phù Thủy Cứu
  let wasWitchSaved = false;
  let savedByWitchId = null;
  if (attackedPlayerId && room.nightActions.witchSavedThisNight) {
    wasWitchSaved = true;
    savedByWitchId = attackedPlayerId;
  }

  // Nạn nhân chết do Sói cắn (nếu bị cắn và KHÔNG được Bảo Vệ hay Phù Thủy cứu)
  let deadPlayerId = null;
  if (attackedPlayerId && !wasProtected && !wasWitchSaved) {
    deadPlayerId = attackedPlayerId;
  }

  // Nạn nhân chết do Phù Thủy hạ độc (Bảo Vệ KHÔNG THỂ che chở khỏi thuốc độc của Phù Thủy, chỉ đỡ được sói cắn!)
  const poisonedPlayerId = room.nightActions.witchPoisonTarget || null;

  // Trường hợp đặc biệt: Bảo Vệ dùng khiên che chở và Phù Thủy dùng độc vào CÙNG 1 NGƯỜI
  // Khiên không đỡ được độc -> Người đó vẫn chết vì độc dược!
  const shieldClashPlayerId = (protectedPlayerId && poisonedPlayerId && protectedPlayerId === poisonedPlayerId)
    ? poisonedPlayerId
    : null;

  // YÊU CẦU: Khi Bảo Vệ, Sói và Phù Thủy cùng nhắm 1 người:
  // Vẫn ghi nhận Bảo Vệ đã che chở thành công khỏi nanh vuốt Sói (savedByBodyguardId)
  // để client ghép hoạt ảnh Bảo Vệ cứu người trước, sau đó nối tiếp Phù Thủy ném độc chết!
  // (Không đặt savedByBodyguardId = null ở đây nữa)

  // Lưu lịch sử người được bảo vệ đêm nay để đêm kế tiếp không được bảo vệ liên tiếp
  room.nightActions.lastProtectedTarget = protectedPlayerId;

  room.deadThisNight = deadPlayerId;
  room.poisonedThisNight = poisonedPlayerId;
  room.shieldClashThisNight = shieldClashPlayerId;
  room.attackedThisNight = attackedPlayerId;
  room.savedThisNight = savedByBodyguardId;
  room.witchSavedThisNight = savedByWitchId;

  if (!room.nightActions) room.nightActions = {};
  room.nightActions.deadPlayerId = deadPlayerId;
  room.nightActions.poisonedPlayerId = poisonedPlayerId;
  room.nightActions.shieldClashPlayerId = shieldClashPlayerId;
  room.nightActions.attackedPlayerId = attackedPlayerId;
  room.nightActions.savedPlayerId = savedByBodyguardId;
  room.nightActions.witchSavedPlayerId = savedByWitchId;
  room.nightActions.wasProtected = wasProtected;
  room.nightActions.wasWitchSaved = wasWitchSaved;

  // Reset hành động đêm
  room.nightActions.wolfVotes.clear();
  if (room.nightActions.wolfConfirmed) {
    room.nightActions.wolfConfirmed.clear();
  }
  room.nightActions.seerCheck = null;
  room.nightActions.bodyguardTarget = null;
  room.nightActions.witchSavedThisNight = false;
  room.nightActions.witchPoisonTarget = null;
  room.nightActions.piedPiperTargets = [];

  return {
    deadPlayerId,
    poisonedPlayerId,
    shieldClashPlayerId,
    attackedPlayerId,
    savedPlayerId: savedByBodyguardId,
    witchSavedPlayerId: savedByWitchId,
    wasProtected,
    wasWitchSaved,
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

  // 💘 Kiểm tra điều kiện thắng của Phe Cặp Đôi (Uyên Ương)
  if (room.couple && room.couple.length === 2) {
    const [id1, id2] = room.couple;
    const p1 = room.players.get(id1);
    const p2 = room.players.get(id2);
    const p1Alive = p1 && p1.alive;
    const p2Alive = p2 && p2.alive;

    if (p1Alive && p2Alive) {
      // Điều kiện 1: Duy nhất 2 người trong Cặp Đôi sống sót trong cả làng
      if (alive.length === 2) {
        return {
          gameOver: true,
          winner: 'couple',
          message: '💘 Phe Cặp Đôi (Uyên Ương) chiến thắng! Tình yêu chân chính đã vượt qua mọi hiểm nguy!',
          couple: [p1, p2],
        };
      }

      // Điều kiện 2: Người Thổi Sáo nằm trong Cặp Đôi và đã thôi miên toàn bộ những người ngoài còn sống
      const hasPiedPiperInCouple = p1.role === ROLES.PIED_PIPER || p2.role === ROLES.PIED_PIPER;
      if (hasPiedPiperInCouple && room.charmedPlayers) {
        const outsidersAlive = alive.filter((p) => p.id !== id1 && p.id !== id2);
        if (outsidersAlive.length > 0 && outsidersAlive.every((p) => room.charmedPlayers.has(p.id))) {
          return {
            gameOver: true,
            winner: 'couple',
            message: '💘 Phe Cặp Đôi chiến thắng! Người Thổi Sáo và Người Yêu đã cùng nhau mê hoặc toàn bộ ngôi làng!',
            couple: [p1, p2],
          };
        }
      }
    }
  }

  // 🎶 Kiểm tra điều kiện thắng của Phe Thứ 3 (Người Thổi Sáo)
  const piedPiper = alive.find((p) => p.role === ROLES.PIED_PIPER);
  if (piedPiper && room.charmedPlayers) {
    const othersAlive = alive.filter((p) => p.id !== piedPiper.id);
    if (othersAlive.length > 0 && othersAlive.every((p) => room.charmedPlayers.has(p.id))) {
      return {
        gameOver: true,
        winner: 'pied_piper',
        message: '🎶 Phe Thứ 3 (Người Thổi Sáo) chiến thắng! Toàn bộ người sống sót đã chìm trong bùa mê tiếng sáo!',
      };
    }
  }

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
  const requestingPlayer = forPlayerId ? room.players.get(forPlayerId) : null;
  const isWolfViewer = requestingPlayer && requestingPlayer.role === ROLES.WOLF;
  const isPiedPiperViewer = requestingPlayer && requestingPlayer.role === ROLES.PIED_PIPER;
  const isCupidViewer = requestingPlayer && requestingPlayer.role === ROLES.CUPID;
  const isCharmedViewer = Boolean(forPlayerId && ((room.charmedPlayers && room.charmedPlayers.has(forPlayerId)) || requestingPlayer?.charmed));
  const isCharmedRevealPhase = room.phase === PHASES.NIGHT_CHARMED_REVEAL;

  const coupleIds = room.couple || [];
  const isRequesterInCouple = Boolean(forPlayerId && coupleIds.includes(forPlayerId));
  const partnerId = isRequesterInCouple ? coupleIds.find((id) => id !== forPlayerId) : null;
  const partnerPlayer = partnerId ? room.players.get(partnerId) : null;

  // PHƯƠNG ÁN 1:
  // - Người Thổi Sáo luôn nhìn thấy ai đã bị mình thôi miên.
  // - Trong 5s pha NIGHT_CHARMED_REVEAL: Chỉ những người CÙNG BỊ THÔI MIÊN (và Thổi Sáo) mới mở mắt nhìn thấy nhau.
  //   Dân thường và Ma Sói (những người chưa bị thôi miên) hoàn toàn không thấy gì để bảo vệ Người Thổi Sáo khỏi bị loại trừ.
  // - Hoặc khi game kết thúc (GAME_OVER) thì công khai toàn bộ.
  const canSeeCharmedInReveal = isCharmedRevealPhase && (isPiedPiperViewer || isCharmedViewer);

  return [...room.players.values()].map((p) => {
    const isCharmed = Boolean((room.charmedPlayers && room.charmedPlayers.has(p.id)) || p.charmed);
    const showCharmed = (isPiedPiperViewer || canSeeCharmedInReveal || room.phase === PHASES.GAME_OVER) ? isCharmed : false;

    // Hiển thị vai trò cho chính mình, đồng minh sói, người yêu (cặp đôi), hoặc khi game over
    const isSelf = forPlayerId === p.id;
    const isPartner = isRequesterInCouple && p.id === partnerId;
    const isWolfTeammate = isWolfViewer && p.role === ROLES.WOLF;
    const showRole = isSelf || isPartner || isWolfTeammate || room.phase === PHASES.GAME_OVER;

    // Hiển thị trạng thái Cặp Đôi cho bản thân, người yêu, Cupid hoặc khi game over
    const isPlayerInCouple = coupleIds.includes(p.id);
    const showCouple = (isRequesterInCouple && isPlayerInCouple) ||
      (isCupidViewer && isPlayerInCouple) ||
      (room.phase === PHASES.GAME_OVER && isPlayerInCouple);
    const otherLoverId = isPlayerInCouple ? coupleIds.find((id) => id !== p.id) : null;
    const otherLoverPlayer = otherLoverId ? room.players.get(otherLoverId) : null;

    return {
      id: p.id,
      name: p.name,
      alive: p.alive,
      avatar: p.avatar,
      avatarColor: p.avatarColor,
      connected: p.connected,
      role: showRole ? p.role : null,
      charmed: showCharmed,
      isSelfCharmed: isCharmedViewer,
      inCouple: showCouple,
      isLover: isPartner,
      partnerId: (isSelf && partnerId) ? partnerId : (showCouple ? otherLoverId : null),
      partnerName: (isSelf && partnerPlayer) ? partnerPlayer.name : (showCouple && otherLoverPlayer ? otherLoverPlayer.name : null),
      partnerRole: isSelf && partnerPlayer ? partnerPlayer.role : null,
    };
  });
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
  const { numWolves, numSeers, numBodyguards = 0, numWitches = 0, numHunters = 0, numPiedPipers = 0, numCupids = 0, dayDiscussionTime, dayVoteTime } = settings;
  
  if (numWolves < 0 || numSeers < 0 || numBodyguards < 0 || numWitches < 0 || numHunters < 0 || numPiedPipers < 0 || numCupids < 0) {
    return { valid: false, error: 'Số vai trò không được âm!' };
  }
  if (dayDiscussionTime !== undefined && (dayDiscussionTime < 10 || dayDiscussionTime > 300)) {
    return { valid: false, error: 'Thời gian thảo luận phải từ 10s đến 300s!' };
  }
  if (dayVoteTime !== undefined && (dayVoteTime < 10 || dayVoteTime > 180)) {
    return { valid: false, error: 'Thời gian bỏ phiếu phải từ 10s đến 180s!' };
  }
  
  if (currentParticipants >= 4) {
    const numVillagers = currentParticipants - numWolves - numSeers - numBodyguards - numWitches - numHunters - numPiedPipers - numCupids;
    if (numVillagers < 0) {
      return { valid: false, error: 'Tổng số vai trò chức năng vượt quá số người tham gia!' };
    }
    const totalGood = numSeers + numBodyguards + numWitches + numHunters + numVillagers;
    if (numWolves >= totalGood) {
      return { valid: false, error: 'Số Sói phải nhỏ hơn tổng Phe Dân!' };
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
  shuffleArray,
};
