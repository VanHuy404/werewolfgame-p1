// ============================================
// 🐺 MA SÓI - Main Server
// Express + Socket.io - Xử lý tất cả real-time events
// ============================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

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

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: '🐺 Ma Sói Server đang chạy!', timestamp: new Date().toISOString() });
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

/** Bắt đầu pha Ban Đêm */
function startNightPhase(room) {
  room.phase = PHASES.NIGHT;
  room.round++;
  room.nightActions.wolfVotes.clear();
  room.nightActions.seerCheck = null;

  // Gửi thông tin riêng cho từng người chơi (role-specific)
  room.players.forEach((player, playerId) => {
    // Sói được biết đồng đội
    const teammates = player.role === ROLES.WOLF
      ? [...room.players.values()]
          .filter((p) => p.role === ROLES.WOLF && p.id !== playerId && p.alive)
          .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar }))
      : [];

    io.to(playerId).emit('phase-change', {
      phase: PHASES.NIGHT,
      round: room.round,
      role: player.role,
      alive: player.alive,
      players: getPlayersData(room, playerId),
      teammates,
    });
  });

  startPhaseTimer(room, TIMERS.NIGHT, () => {
    const deadPlayerId = processNightActions(room);
    startDayAnnounce(room, deadPlayerId);
  });
}

/** Pha thông báo kết quả ban đêm */
function startDayAnnounce(room, deadPlayerId) {
  room.phase = PHASES.DAY_ANNOUNCE;

  const deadPlayer = deadPlayerId ? room.players.get(deadPlayerId) : null;

  // Kiểm tra win condition ngay sau đêm
  const winCheck = checkWinCondition(room);
  if (winCheck.gameOver) {
    endGame(room, winCheck);
    return;
  }

  io.to(room.code).emit('phase-change', {
    phase: PHASES.DAY_ANNOUNCE,
    round: room.round,
    deadPlayer: deadPlayer
      ? { id: deadPlayer.id, name: deadPlayer.name, avatar: deadPlayer.avatar, role: deadPlayer.role }
      : null,
    players: getPlayersData(room),
  });

  startPhaseTimer(room, TIMERS.DAY_ANNOUNCE, () => {
    startDayDiscussion(room);
  });
}

/** Pha thảo luận ban ngày */
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

  startPhaseTimer(room, TIMERS.DAY_DISCUSSION, () => {
    startDayVote(room);
  });
}

/** Pha bỏ phiếu ban ngày */
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

  startPhaseTimer(room, TIMERS.DAY_VOTE, () => {
    // Xử lý kết quả vote
    const { eliminatedId, voteDetails } = processDayVote(room);
    const eliminated = eliminatedId ? room.players.get(eliminatedId) : null;

    io.to(room.code).emit('vote-result', {
      eliminated: eliminated
        ? { id: eliminated.id, name: eliminated.name, avatar: eliminated.avatar, role: eliminated.role }
        : null,
      votes: voteDetails,
      players: getPlayersData(room),
    });

    // Kiểm tra win condition sau vote
    const winCheck = checkWinCondition(room);
    if (winCheck.gameOver) {
      setTimeout(() => endGame(room, winCheck), 3000);
      return;
    }

    // Tiếp tục -> Ban Đêm
    setTimeout(() => startNightPhase(room), 3000);
  });
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

    // Validate settings mới
    const validation = validateSettings(settings);
    if (!validation.valid) {
      socket.emit('error-msg', { message: validation.error });
      return;
    }

    // Không cho giảm maxPlayers dưới số người hiện tại
    if (settings.maxPlayers < room.players.size) {
      socket.emit('error-msg', {
        message: `Không thể giảm dưới ${room.players.size} (đã có ${room.players.size} người trong phòng)!`,
      });
      return;
    }

    room.settings = {
      maxPlayers: settings.maxPlayers,
      numWolves: settings.numWolves,
      numSeers: settings.numSeers,
    };

    io.to(room.code).emit('settings-updated', { settings: room.settings });
    console.log(`⚙️ Phòng ${room.code} cập nhật settings:`, room.settings);
  });

  // ---------- BẮT ĐẦU GAME (Chỉ host) ----------
  socket.on('start-game', () => {
    const room = getRoom(socket.roomCode);
    if (!room || room.hostId !== socket.id) return;
    if (room.phase !== PHASES.WAITING) return;

    const playerCount = room.players.size;

    if (playerCount < 4) {
      socket.emit('error-msg', { message: 'Cần ít nhất 4 người chơi để bắt đầu!' });
      return;
    }

    const { numWolves, numSeers } = room.settings;
    const numVillagers = playerCount - numWolves - numSeers;

    if (numVillagers < 0) {
      socket.emit('error-msg', { message: 'Không đủ người chơi cho cấu hình vai trò hiện tại!' });
      return;
    }
    if (numWolves >= (numSeers + numVillagers)) {
      socket.emit('error-msg', { message: 'Số Sói phải nhỏ hơn tổng Dân! Hãy điều chỉnh lại.' });
      return;
    }

    // Cập nhật maxPlayers = số người thực tế
    room.settings.maxPlayers = playerCount;

    // Phân vai ngẫu nhiên
    assignRoles(room);

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

  // ---------- SÓI CHỌN MỤC TIÊU ----------
  socket.on('wolf-kill', ({ targetId }) => {
    const room = getRoom(socket.roomCode);
    if (!room || room.phase !== PHASES.NIGHT) return;

    const player = room.players.get(socket.id);
    if (!player || player.role !== ROLES.WOLF || !player.alive) return;

    const target = room.players.get(targetId);
    if (!target || !target.alive || target.role === ROLES.WOLF) return;

    room.nightActions.wolfVotes.set(socket.id, targetId);

    // Cập nhật cho tất cả Sói biết ai đang vote ai
    const wolves = [...room.players.values()].filter(
      (p) => p.role === ROLES.WOLF && p.alive
    );
    const wolfVotes = {};
    room.nightActions.wolfVotes.forEach((tid, wid) => {
      wolfVotes[wid] = tid;
    });
    wolves.forEach((wolf) => {
      io.to(wolf.id).emit('wolf-vote-update', { wolfVotes });
    });
  });

  // ---------- TIÊN TRI SOI ----------
  socket.on('seer-check', ({ targetId }) => {
    const room = getRoom(socket.roomCode);
    if (!room || room.phase !== PHASES.NIGHT) return;

    const player = room.players.get(socket.id);
    if (!player || player.role !== ROLES.SEER || !player.alive) return;

    const target = room.players.get(targetId);
    if (!target || target.id === socket.id) return;

    room.nightActions.seerCheck = { seerId: socket.id, targetId };

    // Trả kết quả ngay cho Tiên Tri
    socket.emit('seer-result', {
      targetId,
      targetName: target.name,
      targetAvatar: target.avatar,
      isWolf: target.role === ROLES.WOLF,
    });
  });

  // ---------- BỎ PHIẾU BAN NGÀY ----------
  socket.on('day-vote', ({ targetId }) => {
    const room = getRoom(socket.roomCode);
    if (!room || room.phase !== PHASES.DAY_VOTE) return;

    const player = room.players.get(socket.id);
    if (!player || !player.alive) return;

    // Cho phép vote chính mình hoặc người khác còn sống
    const target = room.players.get(targetId);
    if (!target || !target.alive) return;

    room.dayVotes.set(socket.id, targetId);

    // Broadcast số phiếu (không lộ ai vote ai)
    const voteCount = {};
    room.dayVotes.forEach((tid) => {
      voteCount[tid] = (voteCount[tid] || 0) + 1;
    });

    io.to(room.code).emit('vote-update', {
      voteCount,
      totalVoted: room.dayVotes.size,
      totalAlive: getAlivePlayers(room).length,
    });
  });

  // ---------- CHAT ----------
  socket.on('send-message', ({ message }) => {
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

    // Ban đêm: chỉ Sói mới chat được (wolf chat riêng)
    if (room.phase === PHASES.NIGHT) {
      if (player.role === ROLES.WOLF && player.alive) {
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

    // Ban ngày: broadcast cho cả phòng
    if (room.phase === PHASES.DAY_DISCUSSION || room.phase === PHASES.DAY_VOTE) {
      io.to(room.code).emit('new-message', {
        playerId: socket.id,
        playerName: player.name,
        avatar: player.avatar,
        message: trimmed,
        timestamp: Date.now(),
        isWolfChat: false,
      });
    }
  });

  // ---------- NGẮT KẾT NỐI ----------
  socket.on('disconnect', () => {
    console.log(`❌ Ngắt kết nối: ${socket.id}`);
    const room = getRoomByPlayerId(socket.id);
    if (!room) return;

    if (room.phase === PHASES.WAITING) {
      // Lobby -> xóa người chơi
      const updatedRoom = leaveRoom(room.code, socket.id);
      if (updatedRoom) {
        io.to(room.code).emit('player-left', {
          players: getPlayersData(updatedRoom),
          hostId: updatedRoom.hostId,
        });
      }
    } else {
      // Đang chơi -> đánh dấu mất kết nối, giữ trong game
      const player = room.players.get(socket.id);
      if (player) {
        player.connected = false;
        io.to(room.code).emit('player-disconnected', {
          playerId: socket.id,
          playerName: player.name,
        });
      }
    }
  });

  // ---------- RỜI PHÒNG THỦ CÔNG ----------
  socket.on('leave-room', () => {
    const room = getRoom(socket.roomCode);
    if (!room) return;

    socket.leave(room.code);
    const updatedRoom = leaveRoom(room.code, socket.id);
    socket.roomCode = null;

    if (updatedRoom) {
      io.to(room.code).emit('player-left', {
        players: getPlayersData(updatedRoom),
        hostId: updatedRoom.hostId,
      });
    }

    socket.emit('left-room');
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
