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

// Bảo vệ Server khỏi bị sập do bất kỳ lỗi ngoại lệ không mong muốn nào
process.on('uncaughtException', (err) => {
  console.error('🚨 [SERVER CATCH] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 [SERVER CATCH] Unhandled Rejection:', reason);
});

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

// Phục vụ thư mục tài nguyên assets tĩnh (video, âm thanh, hình ảnh)
const assetsPath = path.join(__dirname, '../assets');
if (fs.existsSync(assetsPath)) {
  app.use('/assets', express.static(assetsPath));
}

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

/** Bắt đầu chuỗi Ban Đêm: Lượt 1 - Bảo Vệ thức dậy (nếu có), sau đó đến Sói, Phù Thủy, rồi Tiên Tri */
function startNightPhase(room) {
  if (room.phase === PHASES.GAME_OVER) return;
  room.round++;

  // Reset sạch sẽ các trạng thái của đêm trước
  room.deadThisNight = null;
  room.poisonedThisNight = null;
  room.attackedThisNight = null;
  room.savedThisNight = null;
  room.witchSavedThisNight = null;

  room.nightActions.wolfVotes.clear();
  if (room.nightActions.wolfConfirmed) {
    room.nightActions.wolfConfirmed.clear();
  }
  room.nightActions.seerCheck = null;
  room.nightActions.bodyguardTarget = null;
  room.nightActions.witchSavedThisNight = false;
  room.nightActions.witchPoisonTarget = null;
  room.nightActions.piedPiperTargets = [];
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

/** Lượt Sói hành động trong đêm (1p30s, bầu chọn như vote ngày, không cần nút chốt) */
function startNightWolfPhase(room) {
  room.phase = PHASES.NIGHT_WOLF;
  room.nightActions.wolfVotes.clear();
  if (room.nightActions.wolfConfirmed) {
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

/** Kết thúc lượt Sói -> chuyển sang lượt Phù Thủy (hoặc Tiên Tri) */
function finishWolfTurn(room) {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  // Xác định người bị Sói cắn nhiều nhất
  const voteCount = new Map();
  room.nightActions.wolfVotes.forEach((targetId) => {
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

  const wolfVictimId = (targets.length === 1 && maxVotes > 0) ? targets[0] : null;
  room.nightActions.wolfTarget = wolfVictimId;

  // Nếu người bị Sói cắn đã được Bảo Vệ che chở -> Coi như không ai bị cắn, Phù Thủy không thấy ai chết
  const isProtectedByBodyguard = wolfVictimId && room.nightActions.bodyguardTarget === wolfVictimId;
  const effectiveWitchVictimId = isProtectedByBodyguard ? null : wolfVictimId;

  // Kiểm tra còn Phù Thủy sống hay không
  const aliveWitches = [...room.players.values()].filter(
    (p) => p.role === ROLES.WITCH && p.alive
  );

  if (aliveWitches.length > 0) {
    startNightWitchPhase(room, effectiveWitchVictimId);
  } else {
    // Không có Phù Thủy -> Chuyển sang kiểm tra lượt tiếp theo (Tiên Tri / Người Thổi Sáo)
    finishWitchTurn(room);
  }
}

/** Lượt Phù Thủy hành động trong đêm (30s) */
function startNightWitchPhase(room, wolfVictimId) {
  room.phase = PHASES.NIGHT_WITCH;
  room.nightActions.witchSavedThisNight = false;
  room.nightActions.witchPoisonTarget = null;

  // Nếu người bị Sói cắn đã được Bảo Vệ che chở -> Coi như không ai bị cắn, Phù Thủy thấy không ai chết
  const isProtected = wolfVictimId && room.nightActions.bodyguardTarget === wolfVictimId;
  const effectiveVictimId = isProtected ? null : wolfVictimId;

  const wolfVictim = effectiveVictimId ? room.players.get(effectiveVictimId) : null;

  const aliveWitches = [...room.players.values()].filter(
    (p) => p.role === ROLES.WITCH && p.alive
  );

  aliveWitches.forEach((w) => {
    if (!w.witchState) {
      w.witchState = { hasHeal: true, hasPoison: true };
    }
  });

  // Kiểm tra xem có phù thủy nào còn ít nhất 1 bình thuốc (cứu hoặc độc) không
  const anyWitchHasPotions = aliveWitches.some(
    (w) => w.witchState.hasHeal || w.witchState.hasPoison
  );

  // YÊU CẦU: Khi phù thủy hết thuốc thì chỉ cần xem đc ai bị cắn đêm này rồi chờ 10s là qua đc role tiếp
  const witchDuration = anyWitchHasPotions ? (TIMERS.NIGHT_WITCH || 30) : 10;

  room.players.forEach((player, playerId) => {
    let victimData = null;
    let witchState = null;

    if (player.role === ROLES.WITCH && player.alive) {
      witchState = { ...player.witchState };

      // YÊU CẦU: Phù thủy vẫn có thể xem đc ai chết đêm đó kể cả đã dùng thuốc cứu hay chx dùng
      if (wolfVictim) {
        victimData = {
          id: wolfVictim.id,
          name: wolfVictim.name,
          avatar: wolfVictim.avatar,
          avatarColor: wolfVictim.avatarColor,
        };
      }
    }

    io.to(playerId).emit('phase-change', {
      phase: PHASES.NIGHT_WITCH,
      nightSubPhase: 'witch',
      round: room.round,
      role: player.role,
      alive: player.alive,
      players: getPlayersData(room, playerId),
      wolfVictim: victimData,
      witchState,
    });
  });

  startPhaseTimer(room, witchDuration, () => {
    finishWitchTurn(room);
  });
}

/** Kết thúc lượt Phù Thủy -> chuyển sang lượt Tiên Tri hoặc Người Thổi Sáo */
function finishWitchTurn(room) {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  const aliveSeers = [...room.players.values()].filter(
    (p) => p.role === ROLES.SEER && p.alive
  );

  if (aliveSeers.length > 0) {
    startNightSeerPhase(room);
  } else {
    // Không có Tiên Tri -> Chuyển sang kiểm tra Người Thổi Sáo hoặc Trời Sáng
    finishNightSeerPhase(room);
  }
}

/** Lượt Tiên Tri soi (30 giây, rút xuống 5s sau khi soi) - diễn ra sau khi Sói và Phù Thủy đã xong */
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
    finishNightSeerPhase(room);
  });
}

/** Kết thúc pha Tiên Tri -> Chuyển sang Người Thổi Sáo hoặc Trời Sáng */
function finishNightSeerPhase(room) {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  const hasAlivePiedPiper = [...room.players.values()].some(
    (p) => p.role === ROLES.PIED_PIPER && p.alive
  );

  if (hasAlivePiedPiper) {
    startNightPiedPiperPhase(room);
  } else {
    finishNightAndGoDay(room);
  }
}

/** Lượt Người Thổi Sáo thức dậy mê hoặc (25 giây, tự động rút 5s khi chọn xong) */
function startNightPiedPiperPhase(room) {
  room.phase = PHASES.NIGHT_PIED_PIPER;

  const reqCharmCount = room.settings.piedPiperCharmCount || 2;

  room.players.forEach((player, playerId) => {
    const isPiedPiper = player.role === ROLES.PIED_PIPER;
    io.to(playerId).emit('phase-change', {
      phase: PHASES.NIGHT_PIED_PIPER,
      nightSubPhase: isPiedPiper ? 'pied_piper' : 'sleep',
      round: room.round,
      role: player.role,
      alive: player.alive,
      players: getPlayersData(room, playerId),
      charmedHistory: isPiedPiper ? (room.charmedHistory || {}) : {},
      charmCountRequired: reqCharmCount,
      charmedCount: room.charmedPlayers ? room.charmedPlayers.size : 0,
    });
  });

  startPhaseTimer(room, TIMERS.NIGHT_PIED_PIPER || 25, () => {
    finishPiedPiperPhase(room);
  });
}

/** Kết thúc pha Người Thổi Sáo */
function finishPiedPiperPhase(room) {
  // Ghi nhận các mục tiêu đã chọn vào danh sách bị thôi miên
  if (room.nightActions && room.nightActions.piedPiperTargets && room.nightActions.piedPiperTargets.length > 0) {
    if (!room.charmedPlayers) room.charmedPlayers = new Set();
    if (!room.charmedHistory) room.charmedHistory = {};

    room.nightActions.piedPiperTargets.forEach((targetId) => {
      room.charmedPlayers.add(targetId);
      room.charmedHistory[targetId] = true;
      const targetPlayer = room.players.get(targetId);
      if (targetPlayer) {
        targetPlayer.charmed = true;
      }
    });

    // Cập nhật cho Người Thổi Sáo
    const piedPiper = [...room.players.values()].find((p) => p.role === ROLES.PIED_PIPER && p.alive);
    if (piedPiper) {
      io.to(piedPiper.id).emit('pied-piper-result', {
        charmedHistory: room.charmedHistory,
        charmedCount: room.charmedPlayers.size,
      });
    }
  }

  // 🎶 YÊU CẦU: Nhận biết ai bị thổi trong 5s trước khi trời sáng (nếu setting bật)
  if (room.settings.piedPiperRevealDawn !== false && room.charmedPlayers && room.charmedPlayers.size > 0) {
    startNightCharmedRevealPhase(room);
  } else {
    finishNightAndGoDay(room);
  }
}

/** Pha 5s người bị thôi miên nhận biết nhau trước khi bình minh (Phương án 1) */
function startNightCharmedRevealPhase(room) {
  room.phase = PHASES.NIGHT_CHARMED_REVEAL;

  room.players.forEach((player, playerId) => {
    const isPiedPiper = player.role === ROLES.PIED_PIPER;
    const isCharmed = Boolean(room.charmedPlayers && room.charmedPlayers.has(playerId));

    // Người bị thôi miên & Người Thổi Sáo mở mắt nhìn nhau; người chưa bị thôi miên vẫn ngủ yên trong đêm
    io.to(playerId).emit('phase-change', {
      phase: PHASES.NIGHT_CHARMED_REVEAL,
      nightSubPhase: (isPiedPiper || isCharmed) ? 'charmed_reveal' : 'sleep',
      round: room.round,
      role: player.role,
      alive: player.alive,
      players: getPlayersData(room, playerId),
    });

    if (isCharmed) {
      io.to(playerId).emit('new-message', {
        playerId: 'system',
        playerName: '📢 Hệ Thống',
        avatar: '🎶',
        message: '🎶 [HỘI THÔI MIÊN HÉ MẮT]: Bạn và những người chịu chung bùa mê hé mắt nhìn nhau trong 5 giây trước bình minh...',
        timestamp: Date.now(),
        isWolfChat: false,
        isSystem: true,
      });
    } else if (isPiedPiper) {
      io.to(playerId).emit('new-message', {
        playerId: 'system',
        playerName: '📢 Hệ Thống',
        avatar: '🎶',
        message: '🎶 [TIẾNG SÁO BÌNH MINH]: Những nạn nhân trúng bùa mê đang mở mắt nhìn nhau trong 5 giây trước bình minh!',
        timestamp: Date.now(),
        isWolfChat: false,
        isSystem: true,
      });
    }
  });

  startPhaseTimer(room, TIMERS.NIGHT_CHARMED_REVEAL || 5, () => {
    finishNightAndGoDay(room);
  });
}

/** Xử lý kết thúc đêm và chuyển sang Trời Sáng (DAY_ANNOUNCE) */
function finishNightAndGoDay(room) {
  const nightResult = processNightActions(room);
  startDayAnnounce(room, nightResult);
}

/** Pha thông báo kết quả ban đêm */
function startDayAnnounce(room, nightResult = {}) {
  if (room.phase === PHASES.GAME_OVER) return;
  room.phase = PHASES.DAY_ANNOUNCE;

  const wolfKilledId = nightResult.deadPlayerId !== undefined ? nightResult.deadPlayerId : room.deadThisNight;
  const poisonedId = nightResult.poisonedPlayerId !== undefined ? nightResult.poisonedPlayerId : room.poisonedThisNight;
  const shieldClashId = nightResult.shieldClashPlayerId !== undefined ? nightResult.shieldClashPlayerId : room.shieldClashThisNight;
  const savedBodyguardId = nightResult.savedPlayerId !== undefined ? nightResult.savedPlayerId : room.savedThisNight;
  const savedWitchId = nightResult.witchSavedPlayerId !== undefined ? nightResult.witchSavedPlayerId : room.witchSavedThisNight;
  const attackedId = nightResult.attackedPlayerId !== undefined ? nightResult.attackedPlayerId : room.attackedThisNight;

  const deadPlayer = wolfKilledId ? room.players.get(wolfKilledId) : null;
  const poisonedPlayer = poisonedId ? room.players.get(poisonedId) : null;
  const shieldClashPlayer = shieldClashId ? room.players.get(shieldClashId) : null;
  const savedPlayer = savedBodyguardId ? room.players.get(savedBodyguardId) : null;
  const witchSavedPlayer = savedWitchId ? room.players.get(savedWitchId) : null;
  const attackedPlayer = attackedId ? room.players.get(attackedId) : null;

  // CHỈ KHI TRỜI SÁNG MỚI TÍNH LÀ ĐÃ CHẾT VÀ OUT KHỎI TRÒ CHƠI
  if (deadPlayer) {
    deadPlayer.alive = false;
  }
  if (poisonedPlayer) {
    poisonedPlayer.alive = false;
  }

  // KHÔNG kiểm tra win condition ngay tại đây!
  // Phải để client phát hết tất cả các hoạt ảnh (Sói cào, Phù Thủy cứu, Bảo Vệ khiên, Phù Thủy ném độc, Xung đột)
  // để mọi người hiểu tại sao sói/dân chết trước khi hiển thị màn hình kết thúc chiến thắng!

  io.to(room.code).emit('phase-change', {
    phase: PHASES.DAY_ANNOUNCE,
    round: room.round,
    deadPlayer: deadPlayer
      ? { id: deadPlayer.id, name: deadPlayer.name, avatar: deadPlayer.avatar, avatarColor: deadPlayer.avatarColor }
      : null,
    poisonedPlayer: poisonedPlayer
      ? { id: poisonedPlayer.id, name: poisonedPlayer.name, avatar: poisonedPlayer.avatar, avatarColor: poisonedPlayer.avatarColor }
      : null,
    shieldClashPlayer: shieldClashPlayer
      ? { id: shieldClashPlayer.id, name: shieldClashPlayer.name, avatar: shieldClashPlayer.avatar, avatarColor: shieldClashPlayer.avatarColor }
      : null,
    savedPlayer: savedPlayer
      ? { id: savedPlayer.id, name: savedPlayer.name, avatar: savedPlayer.avatar, avatarColor: savedPlayer.avatarColor }
      : null,
    witchSavedPlayer: witchSavedPlayer
      ? { id: witchSavedPlayer.id, name: witchSavedPlayer.name, avatar: witchSavedPlayer.avatar, avatarColor: witchSavedPlayer.avatarColor }
      : null,
    attackedPlayer: attackedPlayer
      ? { id: attackedPlayer.id, name: attackedPlayer.name, avatar: attackedPlayer.avatar, avatarColor: attackedPlayer.avatarColor }
      : null,
    players: getPlayersData(room),
  });

  // Ghi rõ tên người chết, người được cứu và người bị trúng độc vào khung chat
  let announceChat = '';
  if (deadPlayer && poisonedPlayer) {
    if (deadPlayer.id === poisonedPlayer.id) {
      announceChat = `💀☠️ [CẢ THIỆN VÀ ÁC]: Đêm qua, ${deadPlayer.name} đã bị cả Ma Sói cào xé và Phù Thủy hạ độc tử vong! "Cả thiện và ác đều nhắm vào ngươi , kẻ phản bội"`;
    } else {
      announceChat = `💀 [BÌNH MINH ĐẪM MÁU]: Đêm qua, ${deadPlayer.name} đã bị Ma Sói sát hại, và ${poisonedPlayer.name} đã bị trúng độc tử vong!`;
    }
  } else if (deadPlayer) {
    announceChat = `💀 [BÌNH MINH]: Đêm qua, ${deadPlayer.name} đã bị Ma Sói sát hại dã man!`;
  } else if (poisonedPlayer) {
    announceChat = `☠️ [BÌNH MINH]: Đêm qua, ${poisonedPlayer.name} đã bị trúng độc tử vong bất đắc kỳ tử!`;
  } else {
    announceChat = `🕊️ [BÌNH MINH]: Một đêm bình yên, không có ai hy sinh.`;
  }

  if (shieldClashPlayer) {
    announceChat += `\n🛡️☠️ [MỘT NGƯỜI CỨU, MỘT NGƯỜI GIẾT]: Bảo Vệ đã dùng khiên che chở cho ${shieldClashPlayer.name}, nhưng Phù Thủy đã ném thuốc độc. Khiên hộ mệnh không ngăn được độc dược — ${shieldClashPlayer.name} đã bị phù thủy giết chết!`;
  }
  if (witchSavedPlayer) {
    announceChat += `\n🧪 [PHÙ THỦY CỨU SỐNG]: ${witchSavedPlayer.name} đã được Phù Thủy dùng thần dược hồi sinh kỳ diệu!`;
  }
  if (savedPlayer) {
    announceChat += `\n🛡️ [BẢO VỆ CỨU SỐNG]: ${savedPlayer.name} đã được Bảo Vệ che chở an toàn!`;
  }

  // Kiểm tra Thợ Săn bị Sói cắn tử nạn (và không bị Phù Thủy ném độc)
  const wolfKilledHunter = (deadPlayer && deadPlayer.role === ROLES.HUNTER && (!poisonedPlayer || poisonedPlayer.id !== deadPlayer.id))
    ? deadPlayer
    : null;

  io.to(room.code).emit('new-message', {
    playerId: 'system',
    playerName: '📢 Hệ Thống',
    avatar: '☀️',
    message: announceChat,
    timestamp: Date.now(),
    isWolfChat: false,
    isSystem: true,
  });

  // Kiểm tra Người Thổi Sáo chết trong đêm (do Sói cắn hoặc Phù Thủy ném độc)
  const isPiedPiperDeadNight = (deadPlayer && deadPlayer.role === ROLES.PIED_PIPER) || (poisonedPlayer && poisonedPlayer.role === ROLES.PIED_PIPER);
  let purifiedPlayersNight = [];
  if (isPiedPiperDeadNight) {
    const piedPiperVictim = (deadPlayer && deadPlayer.role === ROLES.PIED_PIPER) ? deadPlayer : poisonedPlayer;
    if (room.charmedPlayers && room.charmedPlayers.size > 0) {
      purifiedPlayersNight = [...room.charmedPlayers]
        .map((id) => room.players.get(id))
        .filter(Boolean)
        .map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          avatarColor: p.avatarColor,
        }));
    }
    // Thanh tẩy sạch sẽ bùa mê
    room.charmedPlayers = new Set();
    room.charmedHistory = {};
    room.players.forEach((p) => { p.charmed = false; });
    room.players.forEach((p) => { p.charmed = false; });

    io.to(room.code).emit('pied-piper-purified', {
      piedPiper: {
        id: piedPiperVictim.id,
        name: piedPiperVictim.name,
        avatar: piedPiperVictim.avatar,
        avatarColor: piedPiperVictim.avatarColor,
      },
      purifiedPlayers: purifiedPlayersNight,
      cause: 'night',
    });

    // Bảng treo cổ chiếu 3.8s -> Hoạt ảnh Thổi Sáo chết chiếu 3.35s -> Đến khi đóng hết (7.5s) mới gửi tin nhắn chat thanh tẩy!
    setTimeout(() => {
      io.to(room.code).emit('new-message', {
        playerId: 'system',
        playerName: '📢 Hệ Thống',
        avatar: '✨',
        message: '✨ [THANH TẨY HOÀNG KIM]: Người Thổi Sáo đã bị tiêu diệt! Tiếng sáo ma thuật tan biến — Ánh sáng hoàng kim thanh tẩy rực rỡ, xóa bỏ toàn bộ bùa mê!',
        timestamp: Date.now(),
        isWolfChat: false,
        isSystem: true,
      });
    }, 7500);
  }

  // Nếu có nhiều hoạt ảnh tuần tự (vừa chết sói/cứu vừa chết độc/xung đột khiên) và thanh tẩy -> cho đủ thời gian thoải mái hiển thị (19s), hoặc 14s khi Thổi Sáo chết, ngược lại 8-13s
  const hasMultipleModals = (poisonedPlayer || shieldClashPlayer) && (deadPlayer || witchSavedPlayer || savedPlayer);
  const announceTime = hasMultipleModals && isPiedPiperDeadNight ? 19 : (isPiedPiperDeadNight ? 14 : (hasMultipleModals ? 13 : (TIMERS.DAY_ANNOUNCE || 8)));

  startPhaseTimer(room, announceTime, () => {
    // Nếu Thợ Săn bị Sói cắn chết -> Kích hoạt phát súng trăn trối báo thù trước khi vào thảo luận ngày!
    if (wolfKilledHunter) {
      startHunterShotPhase(room, wolfKilledHunter, 'night');
      return;
    }

    // Sau khi toàn bộ hoạt ảnh đã chiếu xong cho người chơi xem rõ ràng, mới xét điều kiện chiến thắng!
    const winCheck = checkWinCondition(room);
    if (winCheck.gameOver) {
      endGame(room, winCheck);
      return;
    }
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

  // Kiểm tra nếu người bị treo cổ là Người Thổi Sáo -> Kích hoạt Thanh Tẩy Hoàng Kim
  const isPiedPiperEliminated = eliminated && eliminated.role === ROLES.PIED_PIPER;
  let purifiedPlayers = [];
  if (isPiedPiperEliminated) {
    if (room.charmedPlayers && room.charmedPlayers.size > 0) {
      purifiedPlayers = [...room.charmedPlayers]
        .map((id) => room.players.get(id))
        .filter(Boolean)
        .map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          avatarColor: p.avatarColor,
        }));
    }
    // Thanh tẩy sạch sẽ bùa mê tiếng sáo khi Người Thổi Sáo chết
    room.charmedPlayers = new Set();
    room.charmedHistory = {};
    room.players.forEach((p) => { p.charmed = false; });
    room.players.forEach((p) => { p.charmed = false; });
  }

  // Ghi nhận kết quả biểu quyết và số Sói còn lại vào khung chat (không tiết lộ số người bị thôi miên theo Phương án 1)
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

  // Gửi kết quả biểu quyết kèm remainingWolves (không gửi charmedCount lên bảng chung để bảo vệ bí mật Phương án 1)
  io.to(room.code).emit('vote-result', {
    eliminated: eliminated
      ? {
          id: eliminated.id,
          name: eliminated.name,
          avatar: eliminated.avatar,
          avatarColor: eliminated.avatarColor,
          role: eliminated.role,
        }
      : null,
    votes: voteDetails,
    remainingWolves,
    isPiedPiperDead: isPiedPiperEliminated,
    purifiedPlayers,
    players: getPlayersData(room),
  });

  if (isPiedPiperEliminated) {
    io.to(room.code).emit('pied-piper-purified', {
      piedPiper: {
        id: eliminated.id,
        name: eliminated.name,
        avatar: eliminated.avatar,
        avatarColor: eliminated.avatarColor,
      },
      purifiedPlayers,
      cause: 'vote',
    });

    // Bảng treo cổ chiếu 3.8s -> Hoạt ảnh Thổi Sáo chết chiếu 3.35s -> Đến khi đóng hết (7.5s) mới gửi tin nhắn chat thanh tẩy!
    setTimeout(() => {
      io.to(room.code).emit('new-message', {
        playerId: 'system',
        playerName: '📢 Hệ Thống',
        avatar: '✨',
        message: '✨ [THANH TẨY HOÀNG KIM]: Người Thổi Sáo đã bị tiêu diệt! Tiếng sáo ma thuật tan biến — Ánh sáng hoàng kim thanh tẩy rực rỡ, xóa bỏ toàn bộ bùa mê!',
        timestamp: Date.now(),
        isWolfChat: false,
        isSystem: true,
      });
    }, 7500);
  }

  // Nếu người bị treo cổ là Thợ Săn -> Kích hoạt phát súng trăn trối sau khi chiếu xong hoạt ảnh treo cổ (4.0s)
  if (eliminated && eliminated.role === ROLES.HUNTER) {
    setTimeout(() => {
      startHunterShotPhase(room, eliminated, 'vote');
    }, 4000);
    return;
  }

  // Thời gian chờ chuyển pha: Nếu người bị treo cổ là Người Thổi Sáo thì chờ 12.5s
  // (3.8s bảng số sói + 3.35s hoạt ảnh Thổi Sáo chết + 3.5s thanh tẩy hoàng kim trên màn hình chính + 1.85s đệm vào đêm), ngược lại 5.0s
  const voteTransitionDelay = isPiedPiperEliminated ? 12500 : 5000;

  // Kiểm tra win condition sau vote
  const winCheck = checkWinCondition(room);
  if (winCheck.gameOver) {
    setTimeout(() => endGame(room, winCheck), voteTransitionDelay);
    return;
  }

  // Tiếp tục -> Ban Đêm
  setTimeout(() => startNightPhase(room), voteTransitionDelay);
}

/**
 * 🏹 Pha Thợ Săn Nổ Súng Trăn Trối (HUNTER_SHOT)
 * @param {Room} room
 * @param {Player} hunterPlayer
 * @param {'night'|'vote'} cause
 */
function startHunterShotPhase(room, hunterPlayer, cause) {
  room.phase = PHASES.HUNTER_SHOT;
  room.hunterShotContext = {
    hunterId: hunterPlayer.id,
    cause,
    hasShot: false,
  };

  io.to(room.code).emit('phase-change', {
    phase: PHASES.HUNTER_SHOT,
    round: room.round,
    hunter: {
      id: hunterPlayer.id,
      name: hunterPlayer.name,
      avatar: hunterPlayer.avatar,
      avatarColor: hunterPlayer.avatarColor,
    },
    cause,
    players: getPlayersData(room),
  });

  io.to(room.code).emit('new-message', {
    playerId: 'system',
    playerName: '📢 Hệ Thống',
    avatar: '🏹',
    message: `🏹 [TIẾNG LÊN ĐẠN TRĂN TRỐI]: Thợ Săn ${hunterPlayer.name} đang nâng nỏ nhắm bắn một mục tiêu trăn trối! Một kẻ sắp phải đền mạng xuống mồ!`,
    timestamp: Date.now(),
    isWolfChat: false,
    isSystem: true,
  });

  // Đếm ngược 12s cho Thợ Săn chọn mục tiêu. Nếu hết giờ -> tự động bỏ qua (bắn chỉ thiên)
  startPhaseTimer(room, TIMERS.HUNTER_SHOT, () => {
    if (!room.hunterShotContext || room.hunterShotContext.hasShot) return;
    processHunterShot(room, hunterPlayer, null, true, cause);
  });
}

/**
 * Xử lý kết quả phát súng của Thợ Săn
 */
function processHunterShot(room, hunterPlayer, targetPlayer, passed, cause) {
  if (room.hunterShotContext) {
    room.hunterShotContext.hasShot = true;
  }
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  if (passed || !targetPlayer) {
    io.to(room.code).emit('hunter-shot-result', {
      hunter: { id: hunterPlayer.id, name: hunterPlayer.name, avatar: hunterPlayer.avatar, avatarColor: hunterPlayer.avatarColor },
      target: null,
      passed: true,
      players: getPlayersData(room),
    });

    io.to(room.code).emit('new-message', {
      playerId: 'system',
      playerName: '📢 Hệ Thống',
      avatar: '🏹',
      message: `🏹 [PHÁT BẮN CHỈ THIÊN]: Thợ Săn ${hunterPlayer.name} quyết định bắn chỉ thiên, không kéo theo ai xuống mồ!`,
      timestamp: Date.now(),
      isWolfChat: false,
      isSystem: true,
    });

    setTimeout(() => {
      const winCheck = checkWinCondition(room);
      if (winCheck.gameOver) {
        endGame(room, winCheck);
        return;
      }
      if (cause === 'night') {
        startDayDiscussion(room);
      } else {
        startNightPhase(room);
      }
    }, 2000);
    return;
  }

  // Thợ Săn bắn trúng mục tiêu
  targetPlayer.alive = false;

  // Kiểm tra nếu mục tiêu bị bắn hạ là Người Thổi Sáo -> Kích hoạt Thanh Tẩy Hoàng Kim
  const isPiedPiperShot = targetPlayer && targetPlayer.role === ROLES.PIED_PIPER;
  let purifiedPlayersHunter = [];
  if (isPiedPiperShot) {
    if (room.charmedPlayers && room.charmedPlayers.size > 0) {
      purifiedPlayersHunter = [...room.charmedPlayers]
        .map((id) => room.players.get(id))
        .filter(Boolean)
        .map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          avatarColor: p.avatarColor,
        }));
    }
    room.charmedPlayers = new Set();
    room.charmedHistory = {};
    room.players.forEach((p) => { p.charmed = false; });

    setTimeout(() => {
      io.to(room.code).emit('pied-piper-purified', {
        piedPiper: {
          id: targetPlayer.id,
          name: targetPlayer.name,
          avatar: targetPlayer.avatar,
          avatarColor: targetPlayer.avatarColor,
        },
        purifiedPlayers: purifiedPlayersHunter,
        cause: 'hunter_shot',
      });
    }, 4500);

    // Chờ cả modal Thợ Săn nổ súng (4.5s) và modal Thổi Sáo chết (3.35s) đóng hết -> t = 8.0s mới gửi tin nhắn chat thanh tẩy!
    setTimeout(() => {
      io.to(room.code).emit('new-message', {
        playerId: 'system',
        playerName: '📢 Hệ Thống',
        avatar: '✨',
        message: '✨ [THANH TẨY HOÀNG KIM]: Người Thổi Sáo đã bị tiêu diệt! Tiếng sáo ma thuật tan biến — Ánh sáng hoàng kim thanh tẩy rực rỡ, xóa bỏ toàn bộ bùa mê!',
        timestamp: Date.now(),
        isWolfChat: false,
        isSystem: true,
      });
    }, 8000);
  }

  io.to(room.code).emit('hunter-shot-result', {
    hunter: { id: hunterPlayer.id, name: hunterPlayer.name, avatar: hunterPlayer.avatar, avatarColor: hunterPlayer.avatarColor },
    target: {
      id: targetPlayer.id,
      name: targetPlayer.name,
      avatar: targetPlayer.avatar,
      avatarColor: targetPlayer.avatarColor,
      role: targetPlayer.role,
      isWolf: targetPlayer.role === ROLES.WOLF,
    },
    passed: false,
    players: getPlayersData(room),
  });

  io.to(room.code).emit('new-message', {
    playerId: 'system',
    playerName: '📢 Hệ Thống',
    avatar: '💥',
    message: `💥🏹 [TIẾNG SÚNG XÉ GIÓ]: "Sẽ có những con cá phải trả gió!" — Thợ Săn ${hunterPlayer.name} đã bắn hạ ${targetPlayer.name} tử trận!`,
    timestamp: Date.now(),
    isWolfChat: false,
    isSystem: true,
  });

  // Chờ hiển thị hoạt ảnh tuần tự (Nếu bắn trúng Người Thổi Sáo thì chờ thêm thời gian Thổi Sáo chết + thanh tẩy: 13s, ngược lại 6.5s)
  const hunterDelay = isPiedPiperShot ? 13000 : 6500;
  setTimeout(() => {
    const winCheck = checkWinCondition(room);
    if (winCheck.gameOver) {
      endGame(room, winCheck);
      return;
    }
    if (cause === 'night') {
      startDayDiscussion(room);
    } else {
      startNightPhase(room);
    }
  }, hunterDelay);
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
  socket.on('create-room', (data = {}) => {
    try {
      const { playerName, settings, customAvatar } = data || {};
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
    } catch (err) {
      console.error('Lỗi khi tạo phòng:', err);
      socket.emit('error-msg', { message: 'Có lỗi xảy ra khi tạo phòng!' });
    }
  });

  // ---------- VÀO PHÒNG ----------
  socket.on('join-room', (data = {}) => {
    try {
      const { playerName, roomCode, customAvatar } = data || {};
      if (!roomCode || typeof roomCode !== 'string') {
        socket.emit('error-msg', { message: 'Vui lòng nhập đúng mã phòng!' });
        return;
      }
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
    } catch (err) {
      console.error('Lỗi khi vào phòng:', err);
      socket.emit('error-msg', { message: 'Có lỗi xảy ra khi vào phòng!' });
    }
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
      numWitches: settings.numWitches !== undefined ? settings.numWitches : (room.settings.numWitches !== undefined ? room.settings.numWitches : 1),
      numHunters: settings.numHunters !== undefined ? settings.numHunters : (room.settings.numHunters !== undefined ? room.settings.numHunters : 1),
      numPiedPipers: settings.numPiedPipers !== undefined ? settings.numPiedPipers : (room.settings.numPiedPipers !== undefined ? room.settings.numPiedPipers : 0),
      piedPiperCharmCount: settings.piedPiperCharmCount !== undefined ? settings.piedPiperCharmCount : (room.settings.piedPiperCharmCount || 2),
      piedPiperRevealDawn: settings.piedPiperRevealDawn !== undefined ? settings.piedPiperRevealDawn : (room.settings.piedPiperRevealDawn !== false),
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
    // Đảm bảo số Sói luôn nhỏ hơn tổng dân (Tiên Tri + Bảo Vệ + Phù Thủy + Dân Làng)
    const maxAllowedWolves = Math.max(1, Math.floor((playerCount - 1) / 2));
    if (room.settings.numWolves > maxAllowedWolves) {
      console.log(`⚖️ Tự động cân bằng số Sói từ ${room.settings.numWolves} xuống ${maxAllowedWolves} cho ${playerCount} người chơi.`);
      room.settings.numWolves = maxAllowedWolves;
    }

    const remainingNonWolves = playerCount - room.settings.numWolves;
    const totalSpecial = (room.settings.numSeers || 0) + (room.settings.numBodyguards || 0) + (room.settings.numWitches || 0) + (room.settings.numHunters || 0) + (room.settings.numPiedPipers || 0);
    if (totalSpecial > remainingNonWolves) {
      if (room.settings.numPiedPipers > 1) room.settings.numPiedPipers = 1;
      if (room.settings.numHunters > 1) room.settings.numHunters = 1;
      if (room.settings.numWitches > 1) room.settings.numWitches = 1;
      if (room.settings.numBodyguards > 1) room.settings.numBodyguards = 1;
      if (room.settings.numSeers > 1) room.settings.numSeers = 1;
      while ((room.settings.numSeers || 0) + (room.settings.numBodyguards || 0) + (room.settings.numWitches || 0) + (room.settings.numHunters || 0) + (room.settings.numPiedPipers || 0) > remainingNonWolves) {
        if (room.settings.numHunters > 0) room.settings.numHunters--;
        else if (room.settings.numBodyguards > 0) room.settings.numBodyguards--;
        else if (room.settings.numWitches > 0) room.settings.numWitches--;
        else if (room.settings.numPiedPipers > 0) room.settings.numPiedPipers--;
        else if (room.settings.numSeers > 0) room.settings.numSeers--;
      }
    }

    // Cập nhật maxPlayers = số người thực tế
    room.settings.maxPlayers = playerCount;

    // Phân vai ngẫu nhiên
    assignRoles(room);
    room.seerHistory = {};
    room.charmedPlayers = new Set();
    room.charmedHistory = {};
    room.players.forEach((p) => { p.charmed = false; });

    console.log(`🎮 Phòng ${room.code} bắt đầu game! (${playerCount} người chơi)`);

    // Gửi role cho từng người chơi
    room.players.forEach((player, playerId) => {
      io.to(playerId).emit('game-started', {
        role: player.role,
        players: getPlayersData(room, playerId),
        charmedHistory: player.role === ROLES.PIED_PIPER ? {} : undefined,
        charmCountRequired: player.role === ROLES.PIED_PIPER ? (room.settings.piedPiperCharmCount || 2) : undefined,
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

  // ---------- SÓI BẦU CHỌN MỤC TIÊU (GIỐNG VOTE NGÀY, KHÔNG CẦN CHỐT) ----------
  socket.on('wolf-kill', ({ targetId }) => {
    const room = getRoom(socket.roomCode);
    if (!room || (room.phase !== PHASES.NIGHT_WOLF && room.phase !== PHASES.NIGHT)) return;

    const player = room.players.get(socket.id);
    if (!player || player.role !== ROLES.WOLF || !player.alive) return;

    const target = room.players.get(targetId);
    if (!target || !target.alive || target.role === ROLES.WOLF) return;

    // Toggle hoặc đổi phiếu
    if (room.nightActions.wolfVotes.get(socket.id) === targetId) {
      room.nightActions.wolfVotes.delete(socket.id);
    } else {
      room.nightActions.wolfVotes.set(socket.id, targetId);
    }

    const aliveWolves = [...room.players.values()].filter(
      (p) => p.role === ROLES.WOLF && p.alive
    );
    const wolfVotes = {};
    room.nightActions.wolfVotes.forEach((tid, wid) => {
      wolfVotes[wid] = tid;
    });

    aliveWolves.forEach((wolf) => {
      io.to(wolf.id).emit('wolf-vote-update', { wolfVotes, wolfConfirmed: [] });
    });

    // Nếu tất cả Sói còn sống đã vote: tự động rút thời gian xuống 5s để chuyển tiếp
    if (aliveWolves.length > 0 && aliveWolves.every((w) => room.nightActions.wolfVotes.has(w.id))) {
      if (room.timeLeft > 5) {
        startPhaseTimer(room, 5, () => {
          finishWolfTurn(room);
        });
        io.to(room.code).emit('timer-update', { timeLeft: 5 });
      }
    }
  });

  // ---------- PHÙ THỦY CHỌN CỨU HOẶC BỎ MẶC TRỰC TIẾP ----------
  socket.on('witch-heal-action', ({ save }) => {
    const room = getRoom(socket.roomCode);
    if (!room || room.phase !== PHASES.NIGHT_WITCH) return;

    const player = room.players.get(socket.id);
    if (!player || player.role !== ROLES.WITCH || !player.alive) return;

    if (!player.witchState) {
      player.witchState = { hasHeal: true, hasPoison: true };
    }

    if (save === true && player.witchState.hasHeal) {
      player.witchState.hasHeal = false;
      room.nightActions.witchSavedThisNight = true;
      console.log(`🧪 Phù Thủy ${player.name} đã dùng bình Cứu hồi sinh con mồi.`);
    } else if (save === false) {
      console.log(`❌ Phù Thủy ${player.name} chọn BỎ MẶC con mồi.`);
    }

    socket.emit('witch-state-update', {
      witchState: { ...player.witchState },
    });

    // YÊU CẦU: Phù Thủy có thể dùng cả 2 lọ thuốc trong 1 đêm!
    // Nếu Phù Thủy KHÔNG CÒN BÌNH ĐỘC -> tự động đếm lùi 5s chuyển pha
    // Nếu VẪN CÒN BÌNH ĐỘC -> Không rút 5s ngay mà để Phù Thủy tiếp tục lựa chọn dùng bình độc thứ 2!
    if (!player.witchState.hasPoison) {
      startPhaseTimer(room, 5, () => {
        finishWitchTurn(room);
      });
      io.to(room.code).emit('timer-update', { timeLeft: 5 });
    }
  });

  // ---------- PHÙ THỦY HÀNH ĐỘNG (CỨU HOẶC HẠ ĐỘC) ----------
  socket.on('witch-action', ({ save, poisonTargetId }) => {
    const room = getRoom(socket.roomCode);
    if (!room || room.phase !== PHASES.NIGHT_WITCH) return;

    const player = room.players.get(socket.id);
    if (!player || player.role !== ROLES.WITCH || !player.alive) return;

    if (!player.witchState) {
      player.witchState = { hasHeal: true, hasPoison: true };
    }

    // Xử lý Cứu:
    if (save === true && player.witchState.hasHeal) {
      player.witchState.hasHeal = false;
      room.nightActions.witchSavedThisNight = true;
      console.log(`🧪 Phù Thủy ${player.name} đã dùng bình Cứu trong đêm.`);
    }

    // Xử lý Độc (Phù Thủy KHÔNG THỂ bỏ độc chính mình, hỗ trợ chọn/đổi mục tiêu hoặc bỏ qua):
    if (poisonTargetId && poisonTargetId !== socket.id) {
      const target = room.players.get(poisonTargetId);
      if (target && target.alive) {
        player.witchState.hasPoison = false;
        room.nightActions.witchPoisonTarget = poisonTargetId;
        console.log(`☠️ Phù Thủy ${player.name} đã dùng bình Độc nhắm vào ${target.name}.`);
      }
    } else if (poisonTargetId === null) {
      room.nightActions.witchPoisonTarget = null;
      console.log(`❌ Phù Thủy ${player.name} chọn không dùng bình Độc đêm nay.`);
    }

    socket.emit('witch-state-update', {
      witchState: { ...player.witchState },
    });

    // Rút thời gian xuống 5s như Bảo Vệ để nếu không đổi thì tự động chuyển pha
    startPhaseTimer(room, 5, () => {
      finishWitchTurn(room);
    });
    io.to(room.code).emit('timer-update', { timeLeft: 5 });
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
      finishNightSeerPhase(room);
    });
    io.to(room.code).emit('timer-update', { timeLeft: 5 });
  });

  // ---------- THỢ SĂN NỔ SÚNG TRĂN TRỐI ----------
  socket.on('hunter-shoot', ({ targetId, pass }) => {
    try {
      const room = getRoom(socket.roomCode);
      if (!room || room.phase !== PHASES.HUNTER_SHOT) return;
      if (!room.hunterShotContext || room.hunterShotContext.hunterId !== socket.id) return;
      if (room.hunterShotContext.hasShot) return;

      const hunterPlayer = room.players.get(socket.id);
      if (!hunterPlayer) return;

      if (pass || !targetId) {
        processHunterShot(room, hunterPlayer, null, true, room.hunterShotContext.cause);
      } else {
        const target = room.players.get(targetId);
        if (!target || !target.alive || target.id === socket.id) return;
        processHunterShot(room, hunterPlayer, target, false, room.hunterShotContext.cause);
      }
    } catch (e) {
      console.error('hunter-shoot error:', e);
    }
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

  // ---------- CHỦ PHÒNG TUA NHANH THẢO LUẬN ĐỂ ĐẾN BỎ PHIẾU ----------
  socket.on('host-skip-discussion', () => {
    const room = getRoom(socket.roomCode);
    if (!room || room.hostId !== socket.id || room.phase !== PHASES.DAY_DISCUSSION) return;

    console.log(`⏩ [Host] ${socket.playerName || 'Chủ phòng'} đã tua nhanh Thảo Luận chuyển sang Vote (Phòng ${room.code})`);
    startDayVote(room);
  });

  // ---------- CHỦ PHÒNG BỎ QUA GIAI ĐOẠN VOTE ----------
  socket.on('host-skip-vote', () => {
    const room = getRoom(socket.roomCode);
    if (!room || room.hostId !== socket.id || room.phase !== PHASES.DAY_VOTE) return;

    console.log(`⏩ [Host] ${socket.playerName || 'Chủ phòng'} đã bỏ qua giai đoạn Vote (Phòng ${room.code})`);
    concludeDayVote(room);
  });

  // ---------- NGƯỜI THỔI SÁO THÔI MIÊN ----------
  socket.on('pied-piper-charm', (data = {}) => {
    try {
      const room = getRoom(socket.roomCode);
      if (!room || room.phase !== PHASES.NIGHT_PIED_PIPER) return;

      const player = room.players.get(socket.id);
      if (!player || player.role !== ROLES.PIED_PIPER || !player.alive) return;

      const rawTargets = data.targets || data.targetIds || [];
      if (!Array.isArray(rawTargets) || rawTargets.length === 0) return;

      const maxTargets = room.settings.piedPiperCharmCount || 2;
      const validTargets = rawTargets.filter((tId) => {
        const target = room.players.get(tId);
        return target && target.alive && target.id !== socket.id && (!room.charmedPlayers || !room.charmedPlayers.has(tId));
      }).slice(0, maxTargets);

      if (validTargets.length === 0) return;

      if (!room.nightActions) room.nightActions = {};
      room.nightActions.piedPiperTargets = validTargets;

      socket.emit('pied-piper-selected', {
        targets: validTargets,
        targetIds: validTargets,
        countRequired: maxTargets,
      });

      // Rút ngắn thời gian còn 5s để chuyển pha
      startPhaseTimer(room, 5, () => {
        finishPiedPiperPhase(room);
      });
      io.to(room.code).emit('timer-update', { timeLeft: 5 });
    } catch (err) {
      console.error('Error in pied-piper-charm:', err);
    }
  });

  socket.on('pied-piper-target', (data = {}) => {
    try {
      const room = getRoom(socket.roomCode);
      if (!room || room.phase !== PHASES.NIGHT_PIED_PIPER) return;

      const player = room.players.get(socket.id);
      if (!player || player.role !== ROLES.PIED_PIPER || !player.alive) return;

      const rawTargets = data.targets || data.targetIds || [];
      const maxTargets = room.settings.piedPiperCharmCount || 2;
      socket.emit('pied-piper-selected', {
        targets: Array.isArray(rawTargets) ? rawTargets.slice(0, maxTargets) : [],
        targetIds: Array.isArray(rawTargets) ? rawTargets.slice(0, maxTargets) : [],
        countRequired: maxTargets,
      });
    } catch (err) {
      console.error('Error in pied-piper-target:', err);
    }
  });

  socket.on('pied-piper-skip', () => {
    try {
      const room = getRoom(socket.roomCode);
      if (!room || room.phase !== PHASES.NIGHT_PIED_PIPER) return;

      const player = room.players.get(socket.id);
      if (!player || player.role !== ROLES.PIED_PIPER || !player.alive) return;

      if (!room.nightActions) room.nightActions = {};
      room.nightActions.piedPiperTargets = [];

      startPhaseTimer(room, 3, () => {
        finishPiedPiperPhase(room);
      });
      io.to(room.code).emit('timer-update', { timeLeft: 3 });
    } catch (err) {
      console.error('Error in pied-piper-skip:', err);
    }
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
    const isNightTime = room.phase === PHASES.NIGHT_BODYGUARD || room.phase === PHASES.NIGHT_WOLF || room.phase === PHASES.NIGHT_WITCH || room.phase === PHASES.NIGHT_SEER || room.phase === PHASES.NIGHT_PIED_PIPER || room.phase === PHASES.NIGHT_CHARMED_REVEAL || room.phase === PHASES.NIGHT;
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
  socket.on('reconnect-room', (data = {}) => {
    try {
      const { roomCode, playerName, oldPlayerId, customAvatar } = data || {};
      if (!roomCode || typeof roomCode !== 'string') {
        socket.emit('reconnect-failed', { message: 'Mã phòng không hợp lệ!' });
        return;
      }
      const room = getRoom(roomCode.toUpperCase().trim());
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
        let matchedPlayerId = oldPlayerId;
        if (!existingPlayer) {
          for (const [id, p] of room.players) {
            if (p.name.toLowerCase() === (playerName || '').toLowerCase()) {
              existingPlayer = p;
              matchedPlayerId = id;
              room.players.delete(id);
              break;
            }
          }
        } else {
          room.players.delete(oldPlayerId);
        }

        const isHost = (oldPlayerId && oldPlayerId === room.hostId) ||
                       (matchedPlayerId && matchedPlayerId === room.hostId) ||
                       (existingPlayer && room.hostId === existingPlayer.id) ||
                       (room.hostPlayerName && playerName && room.hostPlayerName.toLowerCase() === playerName.toLowerCase()) ||
                       room.players.size === 0;

        const playerObj = {
          id: socket.id,
          name: playerName || 'Dân Làng',
          role: null,
          alive: true,
          avatar: customAvatar || (existingPlayer ? existingPlayer.avatar : '🐺'),
          avatarColor: existingPlayer ? existingPlayer.avatarColor : '#6366F1',
          connected: true,
        };

        room.players.set(socket.id, playerObj);
        if (isHost) {
          room.hostId = socket.id;
          room.hostPlayerName = playerObj.name;
        }

        socket.emit('room-joined', {
          roomCode: room.code,
          players: getPlayersData(room),
          settings: room.settings,
          hostId: room.hostId,
        });

        io.to(room.code).emit('players-update', {
          players: getPlayersData(room),
          hostId: room.hostId,
        });
        return;
      }

      // 2. Nếu đang trong trận đấu
      let existingPlayer = oldPlayerId ? room.players.get(oldPlayerId) : null;
      let matchedPlayerId = oldPlayerId;
      if (!existingPlayer) {
        for (const [id, p] of room.players) {
          if (p.name.toLowerCase() === (playerName || '').toLowerCase()) {
            existingPlayer = p;
            matchedPlayerId = id;
            room.players.delete(id);
            break;
          }
        }
      } else {
        room.players.delete(oldPlayerId);
      }

      if (existingPlayer) {
        // Kiểm tra quyền Chủ Phòng: theo socket id cũ, matched id cũ, hoặc tên chủ phòng
        const isHost = (oldPlayerId && room.hostId === oldPlayerId) ||
                       (matchedPlayerId && room.hostId === matchedPlayerId) ||
                       (room.hostId === existingPlayer.id) ||
                       (room.hostPlayerName && playerName && room.hostPlayerName.toLowerCase() === playerName.toLowerCase());

        existingPlayer.id = socket.id;
        existingPlayer.connected = true;
        room.players.set(socket.id, existingPlayer);

        if (isHost) {
          room.hostId = socket.id;
          room.hostPlayerName = existingPlayer.name;
        }

        // Khôi phục trạng thái bị Thôi Miên
        const wasCharmed = Boolean(
          existingPlayer.charmed ||
          (room.charmedPlayers && (
            (oldPlayerId && room.charmedPlayers.has(oldPlayerId)) ||
            (matchedPlayerId && room.charmedPlayers.has(matchedPlayerId)) ||
            (existingPlayer.id && room.charmedPlayers.has(existingPlayer.id))
          ))
        );

        if (wasCharmed) {
          if (!room.charmedPlayers) room.charmedPlayers = new Set();
          if (oldPlayerId) room.charmedPlayers.delete(oldPlayerId);
          if (matchedPlayerId) room.charmedPlayers.delete(matchedPlayerId);
          room.charmedPlayers.add(socket.id);
          existingPlayer.charmed = true;
        }

        // Cập nhật charmedHistory nếu nạn nhân có trong history của Người Thổi Sáo
        if (room.charmedHistory) {
          if (oldPlayerId && room.charmedHistory[oldPlayerId]) {
            room.charmedHistory[socket.id] = room.charmedHistory[oldPlayerId];
            delete room.charmedHistory[oldPlayerId];
          }
          if (matchedPlayerId && room.charmedHistory[matchedPlayerId]) {
            room.charmedHistory[socket.id] = room.charmedHistory[matchedPlayerId];
            delete room.charmedHistory[matchedPlayerId];
          }
        }

        // Nếu người reconnect chính là Người Thổi Sáo -> khôi phục charmedHistory cho họ
        const piperHistory = existingPlayer.role === ROLES.PIED_PIPER ? (room.charmedHistory || {}) : {};

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
          charmedHistory: piperHistory,
          charmCountRequired: existingPlayer.role === ROLES.PIED_PIPER ? (room.settings.piedPiperCharmCount || 2) : 2,
        });

        io.to(room.code).emit('players-update', {
          players: getPlayersData(room),
          hostId: room.hostId,
        });
      } else {
        socket.emit('reconnect-failed', { message: 'Không thể khôi phục phiên trận đấu!' });
      }
    } catch (err) {
      console.error('Lỗi khi reconnect:', err);
      socket.emit('reconnect-failed', { message: 'Lỗi khôi phục phòng!' });
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
    room.charmedPlayers = new Set();
    room.charmedHistory = {};
    room.players.forEach((p) => { p.charmed = false; });
    room.messages = [];
    room.nightActions = {
      wolfVotes: new Map(),
      wolfConfirmed: new Set(),
      seerCheck: null,
      bodyguardTarget: null,
      lastProtectedTarget: null,
      piedPiperTargets: [],
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
