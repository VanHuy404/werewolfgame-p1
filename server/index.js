// ============================================
// 🐺 MA SÓI - Main Server
// Express + Socket.io - Xử lý tất cả real-time events
// ============================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const {
  createRoom, joinRoom, leaveRoom, assignRoles,
  processNightActions, processDayVote, checkWinCondition,
  getPlayersData, getAlivePlayers, getRoom, getRoomByPlayerId,
  validateSettings,
} = require('./gameLogic');

const { PHASES, TIMERS, ROLES, ROLE_NAMES, ROLE_EMOJIS } = require('./constants');

// ==================== KHỞI TẠO SERVER ====================
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e7, // 10MB để hỗ trợ tải ảnh avatar custom
});

// Bộ nhớ đệm tạm thời cho người chơi ngắt kết nối tạm (F5 / tải lại trang)
const pendingDisconnects = new Map(); // key: socketId, value: { timer, roomCode }

// Thư mục chứa giao diện web tĩnh đã export (dist)
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  console.log('📦 Đã phát hiện thư mục web tĩnh (dist), kích hoạt phục vụ Web Client!');
  app.use(express.static(distPath));
}

// Health check endpoint riêng
app.get('/api/health', (req, res) => {
  res.json({ status: '🐺 Ma Sói Server đang chạy!', timestamp: new Date().toISOString() });
});

// Phục vụ index.html cho mọi đường dẫn còn lại nếu có bản build web
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ status: '🐺 Ma Sói Server đang chạy! (Chưa có bản build dist)', timestamp: new Date().toISOString() });
  }
});

// ==================== QUẢN LÝ TIMER ====================

/**
 * Bắt đầu đếm ngược cho 1 pha
 * @param {Room} room
 * @param {number} duration - Thời gian (giây)
 * @param {Function} onComplete - Callback khi hết giờ
 */
function startPhaseTimer(room, duration, onComplete) {
  // Dọn timer cũ
  if (room.timer) clearInterval(room.timer);
  room.timeLeft = duration;

  // Gửi thời gian ban đầu
  io.to(room.code).emit('timer-update', { timeLeft: room.timeLeft });

  room.timer = setInterval(() => {
    room.timeLeft--;
    io.to(room.code).emit('timer-update', { timeLeft: room.timeLeft });

    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      room.timer = null;
      onComplete();
    }
  }, 1000);
}

// ==================== CHUYỂN PHA GAME ====================

/** Bắt đầu chuỗi Ban Đêm: Lượt 1 - Bảo Vệ thức dậy (nếu có), sau đó đến Sói, rồi Tiên Tri */
function startNightPhase(room) {
  if (room.phase === PHASES.GAME_OVER) return;
  room.round++;

  // Reset sạch sẽ các trạng thái của đêm trước
  room.deadThisNight = null;
  room.attackedThisNight = null;
  room.savedThisNight = null;
  room.nightActions.wolfVotes.clear();
  if (!room.nightActions.wolfConfirmed) {
    room.nightActions.wolfConfirmed = new Set();
  } else {
    room.nightActions.wolfConfirmed.clear();
  }
  room.nightActions.seerCheck = null;
  room.nightActions.bodyguardTarget = null;
  room.nightActions.wasProtected = false;

  // Kiểm tra còn Bảo Vệ còn sống hay không
  const aliveBodyguards = [...room.players.values()].filter(
    (p) => p.role === ROLES.BODYGUARD && p.alive
  );

  if (aliveBodyguards.length > 0) {
    startNightBodyguardPhase(room);
  } else {
    startNightWolfPhase(room);
  }
}

/** Lượt Bảo Vệ hành động trong đêm (30s, tự động rút 5s khi chọn) */
function startNightBodyguardPhase(room) {
  room.phase = PHASES.NIGHT_BODYGUARD;

  room.players.forEach((player, playerId) => {
    io.to(playerId).emit('phase-change', {
      phase: PHASES.NIGHT_BODYGUARD,
      nightSubPhase: 'bodyguard',
      round: room.round,
      role: player.role,
      alive: player.alive,
      players: getPlayersData(room, playerId),
      lastProtectedTarget: room.nightActions.lastProtectedTarget || null,
    });
  });

  // Đếm ngược 30s cho Bảo Vệ
  startPhaseTimer(room, TIMERS.NIGHT_BODYGUARD, () => {
    finishBodyguardTurn(room);
  });
}

/** Kết thúc lượt Bảo Vệ -> chuyển sang lượt Sói */
function finishBodyguardTurn(room) {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }
  startNightWolfPhase(room);
}

/** Lượt Sói hành động trong đêm (1p30s, có nút xác nhận) */
function startNightWolfPhase(room) {
  room.phase = PHASES.NIGHT_WOLF;
  room.nightActions.wolfVotes.clear();
  if (!room.nightActions.wolfConfirmed) {
    room.nightActions.wolfConfirmed = new Set();
  } else {
    room.nightActions.wolfConfirmed.clear();
  }
  room.nightActions.seerCheck = null;

  // Gửi thông tin riêng cho từng người chơi
  room.players.forEach((player, playerId) => {
    const teammates = player.role === ROLES.WOLF
      ? [...room.players.values()]
          .filter((p) => p.role === ROLES.WOLF && p.id !== playerId && p.alive)
          .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar }))
      : [];

    io.to(playerId).emit('phase-change', {
      phase: PHASES.NIGHT_WOLF,
      nightSubPhase: 'wolf',
      round: room.round,
      role: player.role,
      alive: player.alive,
      players: getPlayersData(room, playerId),
      teammates,
    });
  });

  // Đếm ngược 1p30s (90 giây) cho Sói
  startPhaseTimer(room, TIMERS.NIGHT_WOLF, () => {
    finishWolfTurn(room);
  });
}

/** Kết thúc lượt Sói -> chuyển sang lượt Tiên Tri */
function finishWolfTurn(room) {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  // Xử lý vote Sói kết hợp Bảo Vệ:
  const nightResult = processNightActions(room);
  const deadPlayerId = nightResult.deadPlayerId;

  // Kiểm tra còn Tiên Tri sống hay không
  const aliveSeers = [...room.players.values()].filter(
    (p) => p.role === ROLES.SEER && p.alive
  );

  if (aliveSeers.length > 0) {
    // Chuyển sang lượt Tiên Tri
    startNightSeerPhase(room);
  } else {
    // Không có Tiên Tri sống -> Chuyển thẳng sang Trời Sáng
    startDayAnnounce(room, deadPlayerId);
  }
}

/** Lượt Tiên Tri soi (30 giây, rút xuống 5s sau khi soi) - diễn ra sau khi Sói đã cắn */
function startNightSeerPhase(room) {
  room.phase = PHASES.NIGHT_SEER;

  room.players.forEach((player, playerId) => {
    io.to(playerId).emit('phase-change', {
      phase: PHASES.NIGHT_SEER,
      nightSubPhase: 'seer',
      round: room.round,
      role: player.role,
      alive: player.alive,
      players: getPlayersData(room, playerId),
    });
  });

  startPhaseTimer(room, TIMERS.NIGHT_SEER, () => {
    // Hết giờ Tiên Tri -> Thông báo trời sáng
    startDayAnnounce(room, room.deadThisNight);
  });
}

/** Pha thông báo kết quả ban đêm */
function startDayAnnounce(room, deadPlayerId) {
  if (room.phase === PHASES.GAME_OVER) return;
  room.phase = PHASES.DAY_ANNOUNCE;

  // CHỈ KHI TRỜI SÁNG MỚI TÍNH LÀ ĐÃ CHẾT VÀ OUT KHỎI TRÒ CHƠI
  const victimId = deadPlayerId !== undefined ? deadPlayerId : room.deadThisNight;
  const deadPlayer = victimId ? room.players.get(victimId) : null;
  if (deadPlayer) {
    deadPlayer.alive = false;
  }

  // Kiểm tra win condition ngay sau đêm khi người chơi đã chết
  const winCheck = checkWinCondition(room);
  if (winCheck.gameOver) {
    endGame(room, winCheck);
    return;
  }

  // YÊU CẦU: Trời sáng vẫn thông báo ai bị sói cắn và được bảo vệ (chỉ khi bảo vệ đúng người mới cần nói ai được bảo vệ)
  const attackedPlayer = room.attackedThisNight ? room.players.get(room.attackedThisNight) : null;
  const savedPlayer = (room.nightActions && room.nightActions.wasProtected && room.savedThisNight)
    ? room.players.get(room.savedThisNight)
    : null;

  io.to(room.code).emit('phase-change', {
    phase: PHASES.DAY_ANNOUNCE,
    round: room.round,
    deadPlayer: deadPlayer
      ? { id: deadPlayer.id, name: deadPlayer.name, avatar: deadPlayer.avatar }
      : null,
    attackedPlayer: attackedPlayer
      ? { id: attackedPlayer.id, name: attackedPlayer.name, avatar: attackedPlayer.avatar }
      : null,
    savedPlayer: savedPlayer
      ? { id: savedPlayer.id, name: savedPlayer.name, avatar: savedPlayer.avatar }
      : null,
    wasProtected: Boolean(room.nightActions && room.nightActions.wasProtected),
    players: getPlayersData(room),
  });

  // Ghi rõ tên người bị sói cắn và được bảo vệ thành công vào khung chat
  let announceChat = '';
  if (savedPlayer && deadPlayer) {
    announceChat = `💀 [BÌNH MINH]: Đêm qua, ${deadPlayer.name} đã bị Ma Sói sát hại dã man!\n🛡️ [BẢO VỆ CỨU SỐNG]: ${savedPlayer.name} cũng bị Ma Sói cắn nhưng đã được BẢO VỆ che chở thành công!`;
  } else if (savedPlayer) {
    announceChat = `🛡️ [BÌNH MINH]: Đêm qua, ${savedPlayer.name} đã bị Ma Sói cắn nhưng được BẢO VỆ che chở thành công! Không ai thiệt mạng.`;
  } else if (deadPlayer) {
    announceChat = `💀 [BÌNH MINH]: Đêm qua, ${deadPlayer.name} đã bị Ma Sói sát hại dã man!`;
  } else {
    announceChat = `🕊️ [BÌNH MINH]: Một đêm bình yên, không có ai hy sinh.`;
  }

  io.to(room.code).emit('new-message', {
    playerId: 'system',
    playerName: '📢 Hệ Thống',
    avatar: '🐺',
    message: announceChat,
    timestamp: Date.now(),
    isWolfChat: false,
    isSystem: true,
  });

  startPhaseTimer(room, TIMERS.DAY_ANNOUNCE, () => {
    startDayDiscussion(room);
  });
}

/** Pha thảo luận ban ngày (Sử dụng thời gian tùy chỉnh của phòng) */
function startDayDiscussion(room) {
  room.phase = PHASES.DAY_DISCUSSION;

  room.players.forEach((player, playerId) => {
    io.to(playerId).emit('phase-change', {
      phase: PHASES.DAY_DISCUSSION,
      round: room.round,
      role: player.role,
      alive: player.alive,
      players: getPlayersData(room, playerId),
    });
  });

  const discussionTime = room.settings.dayDiscussionTime || TIMERS.DAY_DISCUSSION;
  startPhaseTimer(room, discussionTime, () => {
    startDayVote(room);
  });
}

/** Pha bỏ phiếu ban ngày (Sử dụng thời gian tùy chỉnh của phòng) */
function startDayVote(room) {
  room.phase = PHASES.DAY_VOTE;
  room.dayVotes.clear();

  room.players.forEach((player, playerId) => {
    io.to(playerId).emit('phase-change', {
      phase: PHASES.DAY_VOTE,
      round: room.round,
      role: player.role,
      alive: player.alive,
      players: getPlayersData(room, playerId),
    });
  });

  const voteTime = room.settings.dayVoteTime || TIMERS.DAY_VOTE;
  startPhaseTimer(room, voteTime, () => {
    concludeDayVote(room);
  });
}

/** Kết thúc và xử lý kết quả bỏ phiếu ban ngày */
function concludeDayVote(room) {
  if (room.phase !== PHASES.DAY_VOTE) return;

  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  // Xử lý kết quả vote
  const { eliminatedId, voteDetails } = processDayVote(room);
  const eliminated = eliminatedId ? room.players.get(eliminatedId) : null;

  // Tính số lượng Sói còn sống sau khi bỏ phiếu
  const remainingWolves = [...room.players.values()].filter(
    (p) => p.role === ROLES.WOLF && p.alive
  ).length;

  // Ghi nhận kết quả biểu quyết và số Sói còn lại vào khung chat
  let voteChatMsg = '';
  if (eliminated) {
    voteChatMsg = `⚖️ [KẾT QUẢ BIỂU QUYẾT]: Dân làng đã quyết định treo cổ ${eliminated.name}! (🐺 Sói còn lại: ${remainingWolves})`;
  } else {
    voteChatMsg = `🕊️ [KẾT QUẢ BIỂU QUYẾT]: Hòa phiếu hoặc đa số bỏ phiếu trắng — Không ai bị treo cổ hôm nay! (🐺 Sói còn lại: ${remainingWolves})`;
  }

  io.to(room.code).emit('new-message', {
    playerId: 'system',
    playerName: '📢 Hệ Thống',
    avatar: '⚖️',
    message: voteChatMsg,
    timestamp: Date.now(),
    isWolfChat: false,
    isSystem: true,
  });

  // Gửi kết quả biểu quyết kèm remainingWolves để hiển thị giữa màn hình trong 3s
  io.to(room.code).emit('vote-result', {
    eliminated: eliminated
      ? { id: eliminated.id, name: eliminated.name, avatar: eliminated.avatar }
      : null,
    votes: voteDetails,
    remainingWolves,
    players: getPlayersData(room),
  });

  // Kiểm tra win condition sau vote
  const winCheck = checkWinCondition(room);
  if (winCheck.gameOver) {
    setTimeout(() => endGame(room, winCheck), 3500);
    return;
  }

  // Tiếp tục -> Ban Đêm (chờ 3.5s để người chơi xem số lượng Sói còn lại trên giữa màn hình trong 3s)
  setTimeout(() => startNightPhase(room), 3500);
}

/** Kết thúc game - Lật bài, hiển thị kết quả */
function endGame(room, winCheck) {
  room.phase = PHASES.GAME_OVER;
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  // Reveal toàn bộ vai trò
  const allPlayers = [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    alive: p.alive,
    avatar: p.avatar,
    avatarColor: p.avatarColor,
  }));

  io.to(room.code).emit('phase-change', {
    phase: PHASES.GAME_OVER,
    winner: winCheck.winner,
    message: winCheck.message,
    players: allPlayers,
  });
}

/**
 * Xử lý khi có người out game giữa trận (rời phòng / mất kết nối)
 * YÊU CẦU: Nếu số Sói >= Dân hoặc hết Sói -> dừng ván NGAY LẬP TỨC và hiện màn hình kết thúc
 */
function handleMidGameExit(room, playerId) {
  if (room.phase === PHASES.WAITING || room.phase === PHASES.GAME_OVER) return;

  // Bỏ phiếu cắn / bỏ phiếu ngày của người đã rời không còn hiệu lực
  if (room.nightActions) {
    if (room.nightActions.wolfVotes) room.nightActions.wolfVotes.delete(playerId);
    if (room.nightActions.wolfConfirmed) room.nightActions.wolfConfirmed.delete(playerId);
  }
  if (room.dayVotes) room.dayVotes.delete(playerId);

  const winCheck = checkWinCondition(room);
  if (winCheck.gameOver) {
    endGame(room, winCheck);
    return;
  }

  // Gửi danh sách người chơi riêng cho từng người (giữ đúng quyền xem vai trò)
  room.players.forEach((p, pid) => {
    io.to(pid).emit('players-update', { players: getPlayersData(room, pid) });
  });
}

// ==================== SOCKET EVENT HANDLERS ====================

io.on('connection', (socket) => {
  console.log(`🔌 Kết nối mới: ${socket.id}`);

  // ---------- TẠO PHÒNG ----------
  socket.on('create-room', ({ playerName, settings, customAvatar }) => {
    console.log(`🏠 ${playerName} tạo phòng với settings:`, settings);

    const result = createRoom(socket.id, playerName, settings || {}, customAvatar);
    if (result.error) {
      socket.emit('error-msg', { message: result.error });
      return;
    }

    const room = result.room;
    socket.join(room.code);
    socket.roomCode = room.code;

    socket.emit('room-created', {
      roomCode: room.code,
      players: getPlayersData(room, socket.id),
      settings: room.settings,
      hostId: room.hostId,
    });
  });

  // ---------- VÀO PHÒNG ----------
  socket.on('join-room', ({ playerName, roomCode, customAvatar }) => {
    const code = roomCode.toUpperCase().trim();
    console.log(`🚪 ${playerName} vào phòng ${code}`);

    const result = joinRoom(code, socket.id, playerName, customAvatar);
    if (result.error) {
      socket.emit('error-msg', { message: result.error });
      return;
    }

    const room = result.room;
    socket.join(code);
    socket.roomCode = code;

    // Gửi cho người vào
    socket.emit('room-joined', {
      roomCode: code,
      players: getPlayersData(room, socket.id),
      settings: room.settings,
      hostId: room.hostId,
    });

    // Thông báo cho cả phòng
    socket.to(code).emit('player-joined', {
      players: getPlayersData(room),
      newPlayerName: playerName,
    });
  });

  // ---------- CẬP NHẬT CÀI ĐẶT PHÒNG (Chỉ host) ----------
  socket.on('update-settings', ({ settings }) => {
    const room = getRoom(socket.roomCode);
    if (!room || room.hostId !== socket.id) return;
    if (room.phase !== PHASES.WAITING) return;

    // Validate settings mới dựa trên số người tham gia hiện tại
    const validation = validateSettings(settings, room.players.size);
    if (!validation.valid) {
      socket.emit('error-msg', { message: validation.error });
      return;
    }

    room.settings = {
      numWolves: settings.numWolves !== undefined ? settings.numWolves : room.settings.numWolves,
      numSeers: settings.numSeers !== undefined ? settings.numSeers : room.settings.numSeers,
      numBodyguards: settings.numBodyguards !== undefined ? settings.numBodyguards : (room.settings.numBodyguards || 1),
      dayDiscussionTime: settings.dayDiscussionTime !== undefined ? settings.dayDiscussionTime : (room.settings.dayDiscussionTime || 60),
      dayVoteTime: settings.dayVoteTime !== undefined ? settings.dayVoteTime : (room.settings.dayVoteTime || 25),
    };

    io.to(room.code).emit('settings-updated', { settings: room.settings });
    console.log(`⚙️ Phòng ${room.code} cập nhật settings:`, room.settings);
  });

  // ---------- BẮT ĐẦU GAME (Chỉ host) ----------
  socket.on('start-game', () => {
    const room = getRoom(socket.roomCode) || getRoomByPlayerId(socket.id);
    if (!room || room.hostId !== socket.id) return;
    if (room.phase !== PHASES.WAITING) return;
    socket.roomCode = room.code;

    const playerCount = room.players.size;

    if (playerCount < 4) {
      socket.emit('error-msg', { message: 'Cần ít nhất 4 người chơi để bắt đầu!' });
      return;
    }

    room.phase = PHASES.ROLE_REVEAL;

    // Tự động cân bằng số Sói cho phù hợp với số người chơi thực tế
    // Đảm bảo số Sói luôn nhỏ hơn tổng dân (Tiên Tri + Bảo Vệ + Dân Làng)
    const maxAllowedWolves = Math.max(1, Math.floor((playerCount - 1) / 2));
    if (room.settings.numWolves > maxAllowedWolves) {
      console.log(`⚖️ Tự động cân bằng số Sói từ ${room.settings.numWolves} xuống ${maxAllowedWolves} cho ${playerCount} người chơi.`);
      room.settings.numWolves = maxAllowedWolves;
    }

    const remainingGood = playerCount - room.settings.numWolves;
    if (room.settings.numSeers + (room.settings.numBodyguards || 0) > remainingGood) {
      if (room.settings.numBodyguards > 1) room.settings.numBodyguards = 1;
      if (room.settings.numSeers > 1) room.settings.numSeers = 1;
      if (room.settings.numSeers + room.settings.numBodyguards > remainingGood) {
        room.settings.numBodyguards = Math.max(0, remainingGood - room.settings.numSeers);
      }
    }

    // Cập nhật maxPlayers = số người thực tế
    room.settings.maxPlayers = playerCount;

    // Phân vai ngẫu nhiên
    assignRoles(room);
    room.seerHistory = {};

    console.log(`🎮 Phòng ${room.code} bắt đầu game! (${playerCount} người chơi)`);

    // Gửi role cho từng người chơi
    room.players.forEach((player, playerId) => {
      io.to(playerId).emit('game-started', {
        role: player.role,
        players: getPlayersData(room, playerId),
      });
    });

    // Bắt đầu đêm đầu tiên sau delay để xem role
    setTimeout(() => startNightPhase(room), TIMERS.ROLE_REVEAL * 1000);
  });

  // ---------- BẢO VỆ CHỌN NGƯỜI ĐỂ CHE CHỞ ----------
  socket.on('bodyguard-protect', ({ targetId }) => {
    const room = getRoom(socket.roomCode);
    if (!room || room.phase !== PHASES.NIGHT_BODYGUARD) return;

    const player = room.players.get(socket.id);
    if (!player || player.role !== ROLES.BODYGUARD || !player.alive) return;

    const target = room.players.get(targetId);
    if (!target || !target.alive) return;

    // YÊU CẦU: Không thể bảo vệ cùng 1 người 2 đêm liên tiếp!
    if (room.nightActions.lastProtectedTarget && targetId === room.nightActions.lastProtectedTarget) {
      socket.emit('error-msg', { message: '🛡️ Bạn không thể bảo vệ cùng một người trong 2 đêm liên tiếp!' });
      return;
    }

    room.nightActions.bodyguardTarget = targetId;

    socket.emit('bodyguard-update', {
      targetId,
      targetName: target.name,
      targetAvatar: target.avatar,
    });

    // YÊU CẦU: "khi chọn mà k thay đổi thì trong 5s sẽ chuyển"
    startPhaseTimer(room, 5, () => {
      finishBodyguardTurn(room);
    });
    io.to(room.code).emit('timer-update', { timeLeft: 5 });
  });

  // ---------- BẢO VỆ BỎ LƯỢT ĐÊM ĐÓ ----------
  socket.on('bodyguard-skip', () => {
    const room = getRoom(socket.roomCode);
    if (!room || room.phase !== PHASES.NIGHT_BODYGUARD) return;

    const player = room.players.get(socket.id);
    if (!player || player.role !== ROLES.BODYGUARD || !player.alive) return;

    room.nightActions.bodyguardTarget = null;

    socket.emit('bodyguard-update', {
      targetId: null,
      isSkipped: true,
    });

    // Rút xuống 5s chuyển tiếp
    startPhaseTimer(room, 5, () => {
      finishBodyguardTurn(room);
    });
    io.to(room.code).emit('timer-update', { timeLeft: 5 });
  });

  // ---------- SÓI CHỌN MỤC TIÊU ----------
  socket.on('wolf-kill', ({ targetId }) => {
    const room = getRoom(socket.roomCode);
    if (!room || (room.phase !== PHASES.NIGHT_WOLF && room.phase !== PHASES.NIGHT)) return;

    const player = room.players.get(socket.id);
    if (!player || player.role !== ROLES.WOLF || !player.alive) return;

    const target = room.players.get(targetId);
    if (!target || !target.alive || target.role === ROLES.WOLF) return;

    room.nightActions.wolfVotes.set(socket.id, targetId);
    // Nếu đổi mục tiêu thì hủy xác nhận cũ để xác nhận lại
    if (room.nightActions.wolfConfirmed) {
      room.nightActions.wolfConfirmed.delete(socket.id);
    }

    // Cập nhật cho tất cả Sói biết ai đang vote ai và trạng thái xác nhận
    const aliveWolves = [...room.players.values()].filter(
      (p) => p.role === ROLES.WOLF && p.alive
    );
    const wolfVotes = {};
    room.nightActions.wolfVotes.forEach((tid, wid) => {
      wolfVotes[wid] = tid;
    });
    const wolfConfirmed = room.nightActions.wolfConfirmed
      ? Array.from(room.nightActions.wolfConfirmed)
      : [];

    aliveWolves.forEach((wolf) => {
      io.to(wolf.id).emit('wolf-vote-update', { wolfVotes, wolfConfirmed });
    });
  });

  // ---------- SÓI BẤM XÁC NHẬN MỤC TIÊU (HỖ TRỢ CHỐT HOẶC HỦY CHỐT ĐỂ CHỌN LẠI) ----------
  socket.on('wolf-confirm', () => {
    const room = getRoom(socket.roomCode);
    if (!room || (room.phase !== PHASES.NIGHT_WOLF && room.phase !== PHASES.NIGHT)) return;

    const player = room.players.get(socket.id);
    if (!player || player.role !== ROLES.WOLF || !player.alive) return;

    // Phải chọn mục tiêu trước thì mới xác nhận được
    if (!room.nightActions.wolfVotes.has(socket.id)) return;

    if (!room.nightActions.wolfConfirmed) {
      room.nightActions.wolfConfirmed = new Set();
    }

    // Hỗ trợ chốt hoặc hủy chốt để chọn lại
    if (room.nightActions.wolfConfirmed.has(socket.id)) {
      room.nightActions.wolfConfirmed.delete(socket.id);
    } else {
      room.nightActions.wolfConfirmed.add(socket.id);
    }

    const aliveWolves = [...room.players.values()].filter(
      (p) => p.role === ROLES.WOLF && p.alive
    );
    const wolfVotes = {};
    room.nightActions.wolfVotes.forEach((tid, wid) => {
      wolfVotes[wid] = tid;
    });
    const wolfConfirmed = Array.from(room.nightActions.wolfConfirmed);

    aliveWolves.forEach((wolf) => {
      io.to(wolf.id).emit('wolf-vote-update', { wolfVotes, wolfConfirmed });
    });

    // Nếu tất cả Sói còn sống đều đã bấm xác nhận -> chuyển pha sau 1.5s
    if (aliveWolves.length > 0 && aliveWolves.every((w) => room.nightActions.wolfConfirmed.has(w.id))) {
      setTimeout(() => {
        // Kiểm tra lại nếu vẫn đang ở pha sói và mọi Sói vẫn đang giữ trạng thái chốt
        if (
          (room.phase === PHASES.NIGHT_WOLF || room.phase === PHASES.NIGHT) &&
          aliveWolves.every((w) => room.nightActions.wolfConfirmed && room.nightActions.wolfConfirmed.has(w.id))
        ) {
          finishWolfTurn(room);
        }
      }, 1500);
    }
  });

  // ---------- TIÊN TRI SOI ----------
  socket.on('seer-check', ({ targetId }) => {
    const room = getRoom(socket.roomCode);
    if (!room || (room.phase !== PHASES.NIGHT_SEER && room.phase !== PHASES.NIGHT)) return;

    const player = room.players.get(socket.id);
    if (!player || player.role !== ROLES.SEER || !player.alive) return;

    // Đã soi rồi trong đêm này thì không soi lại
    if (room.nightActions.seerCheck) return;

    const target = room.players.get(targetId);
    if (!target || !target.alive || target.id === socket.id) return;

    room.nightActions.seerCheck = { seerId: socket.id, targetId };

    const isEvil = target.role === ROLES.WOLF;

    if (!room.seerHistory) room.seerHistory = {};
    room.seerHistory[targetId] = {
      alignment: isEvil ? 'evil' : 'good',
      alignmentName: isEvil ? 'ÁC' : 'THIỆN',
    };

    // Tiên Tri chỉ được biết là THIỆN hay ÁC, không được biết vai trò cụ thể!
    socket.emit('seer-result', {
      targetId,
      targetName: target.name,
      targetAvatar: target.avatar,
      targetAvatarColor: target.avatarColor,
      isWolf: isEvil,
      alignment: isEvil ? 'evil' : 'good',
      alignmentName: isEvil ? 'ÁC' : 'THIỆN',
      seerHistory: room.seerHistory,
    });

    // YÊU CẦU: Thời gian của Tiên Tri sẽ hết sau 5s sau khi soi được!
    startPhaseTimer(room, 5, () => {
      startDayAnnounce(room, room.nightActions.deadPlayerId);
    });
    io.to(room.code).emit('timer-update', { timeLeft: 5 });
  });

  // ---------- BỎ PHIẾU BAN NGÀY ----------
  socket.on('day-vote', ({ targetId }) => {
    const room = getRoom(socket.roomCode);
    if (!room || room.phase !== PHASES.DAY_VOTE) return;

    const player = room.players.get(socket.id);
    if (!player || !player.alive) return;

    if (targetId === null) {
      room.dayVotes.delete(socket.id);
    } else if (targetId === 'skip') {
      // Bỏ phiếu trắng (Skip Vote)
      room.dayVotes.set(socket.id, 'skip');
    } else {
      // Cho phép vote chính mình hoặc người khác còn sống
      const target = room.players.get(targetId);
      if (!target || !target.alive) return;
      room.dayVotes.set(socket.id, targetId);
    }

    // Broadcast số phiếu và danh sách người vote cho từng mục tiêu
    const voteCount = {};
    const voterMap = {}; // { [targetId]: [{ id, name, avatar }] }
    room.dayVotes.forEach((tid, voterId) => {
      voteCount[tid] = (voteCount[tid] || 0) + 1;
      const voter = room.players.get(voterId);
      if (voter) {
        if (!voterMap[tid]) voterMap[tid] = [];
        voterMap[tid].push({ id: voter.id, name: voter.name, avatar: voter.avatar });
      }
    });

    const aliveCount = getAlivePlayers(room).length;
    io.to(room.code).emit('vote-update', {
      voteCount,
      voterMap,
      skipCount: voteCount['skip'] || 0,
      totalVoted: room.dayVotes.size,
      totalAlive: aliveCount,
    });

    // Nếu tất cả người chơi còn sống đều đã vote xong -> chuyển tiếp nhanh
    if (room.dayVotes.size >= aliveCount && aliveCount > 0) {
      setTimeout(() => {
        concludeDayVote(room);
      }, 800);
    }
  });

  // ---------- CHỦ PHÒNG BỎ QUA GIAI ĐOẠN VOTE ----------
  socket.on('host-skip-vote', () => {
    const room = getRoom(socket.roomCode);
    if (!room || room.hostId !== socket.id || room.phase !== PHASES.DAY_VOTE) return;

    console.log(`⏩ [Host] ${socket.playerName || 'Chủ phòng'} đã bỏ qua giai đoạn Vote (Phòng ${room.code})`);
    concludeDayVote(room);
  });

  // ---------- CHAT ----------
  socket.on('send-message', ({ message, isWolfChat }) => {
    const room = getRoom(socket.roomCode);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    const trimmed = message.trim();
    if (!trimmed) return;

    // Người chết không được chat (trừ khi đang ở lobby hoặc game over)
    if (room.phase !== PHASES.WAITING && room.phase !== PHASES.GAME_OVER && !player.alive) {
      return;
    }

    // 🐺 CHAT RIÊNG CỦA SÓI
    if (isWolfChat) {
      // KHÓA LẠI PHẦN CHAT CỦA SÓI KHI ĐẾN GIỜ BẦU CỬ / BỎ PHIẾU (Theo yêu cầu)
      if (room.phase === PHASES.DAY_VOTE) {
        socket.emit('error-msg', { message: '🔒 Kênh chat Hang Sói tạm khóa trong thời gian Bỏ Phiếu!' });
        return;
      }

      if (player.role === ROLES.WOLF) {
        const wolves = [...room.players.values()].filter((p) => p.role === ROLES.WOLF);
        wolves.forEach((wolf) => {
          io.to(wolf.id).emit('new-message', {
            playerId: socket.id,
            playerName: player.name,
            avatar: player.avatar,
            message: trimmed,
            timestamp: Date.now(),
            isWolfChat: true,
          });
        });
      }
      return;
    }

    // Ban đêm: dân làng đang ngủ, không được chat công khai
    const isNightTime = room.phase === PHASES.NIGHT_BODYGUARD || room.phase === PHASES.NIGHT_WOLF || room.phase === PHASES.NIGHT_SEER || room.phase === PHASES.NIGHT;
    if (isNightTime) {
      return;
    }

    // Ban ngày (thảo luận, bỏ phiếu, kết thúc): broadcast cho cả phòng
    io.to(room.code).emit('new-message', {
      playerId: socket.id,
      playerName: player.name,
      avatar: player.avatar,
      message: trimmed,
      timestamp: Date.now(),
      isWolfChat: false,
    });
  });

  // ---------- CHỦ PHÒNG XÓA NGƯỜI CHƠI KHỎI LOBBY ----------
  socket.on('kick-player', ({ targetPlayerId }) => {
    const room = getRoom(socket.roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit('error-msg', { message: 'Chỉ chủ phòng mới có quyền xóa người chơi!' });
      return;
    }
    if (targetPlayerId === socket.id) {
      socket.emit('error-msg', { message: 'Bạn không thể tự xóa chính mình!' });
      return;
    }
    if (room.phase !== PHASES.WAITING) {
      socket.emit('error-msg', { message: 'Không thể xóa người chơi khi trận đấu đã bắt đầu!' });
      return;
    }

    const kickedPlayer = room.players.get(targetPlayerId);
    if (!kickedPlayer) return;

    console.log(`👢 [Kick] Chủ phòng ${socket.playerName || socket.id} đã xóa ${kickedPlayer.name} khỏi phòng ${room.code}`);

    // Hủy pending disconnect nếu có
    if (pendingDisconnects.has(targetPlayerId)) {
      clearTimeout(pendingDisconnects.get(targetPlayerId).timer);
      pendingDisconnects.delete(targetPlayerId);
    }

    // Gửi thông báo trực tiếp đến người bị kick
    io.to(targetPlayerId).emit('kicked-from-room', {
      message: 'Bạn đã bị chủ phòng mời ra khỏi phòng!',
    });

    // Rời socket khỏi room
    const targetSocket = io.sockets.sockets.get(targetPlayerId);
    if (targetSocket) {
      targetSocket.leave(room.code);
      targetSocket.roomCode = null;
    }

    // Xóa người chơi khỏi room
    room.players.delete(targetPlayerId);

    // Cập nhật danh sách người chơi cho cả phòng
    io.to(room.code).emit('player-left', {
      players: getPlayersData(room),
      hostId: room.hostId,
    });
  });

  // ---------- TỰ ĐỘNG KHÔI PHỤC KẾT NỐI KHI TẢI LẠI TRANG (F5) ----------
  socket.on('reconnect-room', ({ roomCode, playerName, oldPlayerId, customAvatar }) => {
    const room = getRoom(roomCode);
    if (!room) {
      socket.emit('reconnect-failed', { message: 'Phòng không còn tồn tại hoặc đã bị giải tán!' });
      return;
    }

    // Hủy bộ đếm ngắt kết nối cũ nếu có
    if (oldPlayerId && pendingDisconnects.has(oldPlayerId)) {
      clearTimeout(pendingDisconnects.get(oldPlayerId).timer);
      pendingDisconnects.delete(oldPlayerId);
    }

    socket.roomCode = room.code;
    socket.playerName = playerName;
    socket.join(room.code);

    // 1. Nếu đang ở phòng chờ (WAITING)
    if (room.phase === PHASES.WAITING) {
      let existingPlayer = oldPlayerId ? room.players.get(oldPlayerId) : null;
      if (!existingPlayer) {
        for (const [id, p] of room.players) {
          if (p.name.toLowerCase() === playerName.toLowerCase()) {
            existingPlayer = p;
            room.players.delete(id);
            break;
          }
        }
      } else {
        room.players.delete(oldPlayerId);
      }

      const isHost = oldPlayerId === room.hostId || (existingPlayer && room.hostId === existingPlayer.id) || room.players.size === 0;

      const playerObj = {
        id: socket.id,
        name: playerName,
        role: null,
        alive: true,
        avatar: customAvatar || (existingPlayer ? existingPlayer.avatar : '🐺'),
        avatarColor: existingPlayer ? existingPlayer.avatarColor : '#6366F1',
        connected: true,
      };

      room.players.set(socket.id, playerObj);
      if (isHost) {
        room.hostId = socket.id;
      }

      socket.emit('room-joined', {
        roomCode: room.code,
        players: getPlayersData(room),
        settings: room.settings,
        hostId: room.hostId,
      });

      io.to(room.code).emit('players-update', {
        players: getPlayersData(room),
      });
      return;
    }

    // 2. Nếu đang trong trận đấu
    let existingPlayer = oldPlayerId ? room.players.get(oldPlayerId) : null;
    if (!existingPlayer) {
      for (const [id, p] of room.players) {
        if (p.name.toLowerCase() === playerName.toLowerCase()) {
          existingPlayer = p;
          room.players.delete(id);
          break;
        }
      }
    } else {
      room.players.delete(oldPlayerId);
    }

    if (existingPlayer) {
      existingPlayer.id = socket.id;
      existingPlayer.connected = true;
      room.players.set(socket.id, existingPlayer);

      if (room.hostId === oldPlayerId) {
        room.hostId = socket.id;
      }

      // Khôi phục màn hình game cho người chơi
      socket.emit('reconnected-in-game', {
        roomCode: room.code,
        players: getPlayersData(room, socket.id),
        settings: room.settings,
        hostId: room.hostId,
        role: existingPlayer.role,
        phase: room.phase,
        round: room.round,
        timeLeft: room.timeLeft,
        deadPlayer: room.deadThisNight ? room.players.get(room.deadThisNight) : null,
        savedPlayer: (room.nightActions && room.nightActions.wasProtected && room.savedThisNight) ? room.players.get(room.savedThisNight) : null,
        wasProtected: Boolean(room.nightActions && room.nightActions.wasProtected),
        lastProtectedTarget: room.nightActions ? room.nightActions.lastProtectedTarget : null,
        seerHistory: existingPlayer.role === ROLES.SEER ? (room.seerHistory || {}) : {},
      });

      io.to(room.code).emit('players-update', {
        players: getPlayersData(room),
      });
    } else {
      socket.emit('reconnect-failed', { message: 'Không thể khôi phục phiên trận đấu!' });
    }
  });

  // ---------- NGẮT KẾT NỐI ----------
  socket.on('disconnect', () => {
    console.log(`❌ Ngắt kết nối: ${socket.id}`);
    const room = getRoomByPlayerId(socket.id);
    if (!room) return;

    if (room.phase === PHASES.WAITING) {
      // Đặt timeout 7 giây để nếu người chơi tải lại trang (F5) thì không bị xóa phòng hoặc mất chỗ
      const player = room.players.get(socket.id);
      if (player) {
        player.connected = false;
        io.to(room.code).emit('players-update', { players: getPlayersData(room) });

        const timer = setTimeout(() => {
          pendingDisconnects.delete(socket.id);
          const updatedRoom = leaveRoom(room.code, socket.id);
          if (updatedRoom) {
            io.to(room.code).emit('player-left', {
              players: getPlayersData(updatedRoom),
              hostId: updatedRoom.hostId,
            });
          }
        }, 7000);

        pendingDisconnects.set(socket.id, { timer, roomCode: room.code });
      }
    } else {
      // Đang chơi -> đánh dấu mất kết nối tạm thời
      const player = room.players.get(socket.id);
      if (player) {
        player.connected = false;
        io.to(room.code).emit('player-disconnected', {
          playerId: socket.id,
          playerName: player.name,
        });

        // Cho phép 10 giây để reconnect nếu reload
        const timer = setTimeout(() => {
          pendingDisconnects.delete(socket.id);
          player.alive = false; // Hết hạn reconnect -> coi như đã chết
          handleMidGameExit(room, socket.id);
        }, 10000);

        pendingDisconnects.set(socket.id, { timer, roomCode: room.code });
      }
    }
  });

  // ---------- RỜI PHÒNG THỦ CÔNG ----------
  socket.on('leave-room', () => {
    const room = getRoom(socket.roomCode);
    if (!room) return;

    // Hủy pending disconnect nếu có
    if (pendingDisconnects.has(socket.id)) {
      clearTimeout(pendingDisconnects.get(socket.id).timer);
      pendingDisconnects.delete(socket.id);
    }

    const wasInGame = room.phase !== PHASES.WAITING && room.phase !== PHASES.GAME_OVER;

    socket.leave(room.code);
    const updatedRoom = leaveRoom(room.code, socket.id);
    socket.roomCode = null;

    if (updatedRoom) {
      if (wasInGame) {
        io.to(room.code).emit('player-left', { hostId: updatedRoom.hostId });
        handleMidGameExit(updatedRoom, socket.id);
      } else {
        io.to(room.code).emit('player-left', {
          players: getPlayersData(updatedRoom),
          hostId: updatedRoom.hostId,
        });
      }
    }

    socket.emit('left-room');
  });

  // ---------- TRỞ VỀ PHÒNG CHỜ (LOBBY) KHI KẾT THÚC GAME ----------
  socket.on('return-to-lobby', () => {
    const room = getRoom(socket.roomCode);
    if (!room) return;
    if (room.phase !== PHASES.GAME_OVER) return;

    if (room.timer) {
      clearInterval(room.timer);
      room.timer = null;
    }

    // Reset trạng thái phòng về WAITING
    room.phase = PHASES.WAITING;
    room.round = 0;
    room.deadThisNight = null;
    room.attackedThisNight = null;
    room.savedThisNight = null;
    room.seerHistory = {};
    room.messages = [];
    room.nightActions = {
      wolfVotes: new Map(),
      wolfConfirmed: new Set(),
      seerCheck: null,
      bodyguardTarget: null,
      lastProtectedTarget: null,
      wasProtected: false,
    };
    room.dayVotes.clear();

    // Reset trạng thái từng người chơi
    room.players.forEach((p) => {
      p.alive = true;
      p.role = null;
    });

    console.log(`🔄 Phòng ${room.code} đã trở về phòng chờ (Lobby)!`);

    // Gửi thông báo cho toàn bộ phòng quay về Lobby
    io.to(room.code).emit('returned-to-lobby', {
      roomCode: room.code,
      players: getPlayersData(room),
      settings: room.settings,
      hostId: room.hostId,
    });
  });
});

// ==================== KHỞI ĐỘNG ====================
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('');
  console.log('🐺 ================================');
  console.log(`🐺  Ma Sói Server - Port ${PORT}`);
  console.log('🐺 ================================');
  console.log('');
});
