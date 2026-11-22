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
  validateSettings, shuffleArray,
} = require('./gameLogic');

const { PHASES, TIMERS, ROLES, ROLE_NAMES, ROLE_EMOJIS } = require('./constants');
const {
  startPhaseTimer: startRoomPhaseTimer,
  clearPhaseTimer,
  scheduleRoomTimeout,
  clearAllRoomTimers,
} = require('./timerManager');
const { getSeerAlignment, isWolfTeam } = require('./roles/registry');
const {
  verifyReconnectToken,
  sanitizeMessage,
  validateAvatarPayload,
  getCorsOrigin,
  createRateLimiter,
} = require('./security');
const { roomStore } = require('./roomStore');

// ==================== KHỞI TẠO SERVER ====================
const corsOrigin = getCorsOrigin();
const app = express();
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '256kb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e5, // 100KB (chỉ dùng icon emoji, tối ưu chống tấn công DoS payload lớn)
});

// Bộ giới hạn tần suất (chống spam sự kiện socket)
const rateLimiter = createRateLimiter();

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

// Health check endpoint kèm thống kê vận hành thời gian thực
app.get('/api/health', (req, res) => {
  const stats = roomStore.getStats();
  res.json({
    status: '🐺 Ma Sói Server đang chạy!',
    uptimeSec: Math.floor(process.uptime()),
    ...stats,
    timestamp: new Date().toISOString(),
  });
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
  startRoomPhaseTimer(io, room, duration, onComplete);
}

// ==================== GHI LỊCH SỬ TRẬN ĐẤU ====================
function addMatchLog(room, entry) {
  if (!room) return;
  if (!Array.isArray(room.matchHistory)) {
    room.matchHistory = [];
  }
  room.matchHistory.push({
    round: entry.round || room.round || 1,
    phaseType: entry.phaseType || 'night', // 'night' | 'day' | 'system'
    icon: entry.icon || '📜',
    title: entry.title || '',
    text: entry.text || '',
    timestamp: Date.now(),
  });
}

// ==================== CHUYỂN PHA GAME ====================

/** Bắt đầu chuỗi Ban Đêm: Lượt 1 - Bảo Vệ thức dậy (nếu có), sau đó đến Sói, Phù Thủy, rồi Tiên Tri */
function startNightPhase(room) {
  if (room.phase === PHASES.GAME_OVER) return;
  room.round++;

  // Reset sạch sẽ các trạng thái của đêm trước
  room.deadThisNight = null;
  room.poisonedThisNight = null;
  room.shieldClashThisNight = null;
  room.attackedThisNight = null;
  room.savedThisNight = null;
  room.witchSavedThisNight = null;
  room.charmedThisNightNames = [];
  room.seerCheckedThisNight = null;

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

  // 💘 ĐÊM ĐẦU TIÊN: Kiểm tra xem có Cupid còn sống và chưa hành động không
  const aliveCupids = [...room.players.values()].filter(
    (p) => p.role === ROLES.CUPID && p.alive
  );

  if (room.round === 1 && aliveCupids.length > 0 && !room.cupidActed) {
    startNightCupidPhase(room);
    return;
  }

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

/** 💘 Lượt Cupid ghép đôi trong đêm 1 (25s) */
function startNightCupidPhase(room) {
  room.phase = PHASES.NIGHT_CUPID;

  room.players.forEach((player, playerId) => {
    io.to(playerId).emit('phase-change', {
      phase: PHASES.NIGHT_CUPID,
      nightSubPhase: 'cupid',
      round: room.round,
      role: player.role,
      alive: player.alive,
      players: getPlayersData(room, playerId),
    });
  });

  // Đếm ngược 25s cho Cupid
  startPhaseTimer(room, TIMERS.NIGHT_CUPID || 25, () => {
    finishCupidTurn(room);
  });
}

/** Kết thúc lượt Cupid -> chuyển sang pha mở mắt nhận nhau (NIGHT_COUPLE_REVEAL) */
function finishCupidTurn(room) {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  // YÊU CẦU: Cupid bắt buộc phải chọn, nếu không chọn hệ thống sẽ random tất cả trừ Cupid
  if (!room.couple || room.couple.length < 2) {
    const cupidPlayer = [...room.players.values()].find((p) => p.role === ROLES.CUPID);
    const cupidId = cupidPlayer ? cupidPlayer.id : null;
    const candidates = [...room.players.values()]
      .filter((p) => p.alive && p.id !== cupidId)
      .map((p) => p.id);

    if (candidates.length >= 2) {
      const shuffled = shuffleArray(candidates);
      room.couple = [shuffled[0], shuffled[1]];
    } else if (candidates.length === 1 && cupidId) {
      room.couple = [candidates[0], cupidId];
    }
  }

  room.cupidActed = true;

  if (room.couple && room.couple.length === 2) {
    startNightCoupleRevealPhase(room);
  } else {
    proceedAfterCupid(room);
  }
}

/** 💘 Pha Cặp đôi hé mắt nhận nhau (6s) kèm hiệu ứng kết nối trái tim */
function startNightCoupleRevealPhase(room) {
  room.phase = PHASES.NIGHT_COUPLE_REVEAL;

  const [id1, id2] = room.couple;
  const p1 = room.players.get(id1);
  const p2 = room.players.get(id2);
  const cupid = [...room.players.values()].find((p) => p.role === ROLES.CUPID);

  const coupleData = [
    p1 ? { id: p1.id, name: p1.name, avatar: p1.avatar, avatarColor: p1.avatarColor, role: p1.role } : null,
    p2 ? { id: p2.id, name: p2.name, avatar: p2.avatar, avatarColor: p2.avatarColor, role: p2.role } : null,
  ].filter(Boolean);

  const cupidData = cupid ? { id: cupid.id, name: cupid.name, avatar: cupid.avatar, avatarColor: cupid.avatarColor } : null;

  if (p1 && p2) {
    addMatchLog(room, {
      round: room.round,
      phaseType: 'night',
      icon: '💘',
      title: `Đêm ${room.round} • Tơ Hồng Định Mệnh`,
      text: `Cupid${cupid ? ` (${cupid.name})` : ''} đã ghép đôi ${p1.name} (${ROLE_EMOJIS[p1.role] || ''} ${ROLE_NAMES[p1.role] || p1.role}) và ${p2.name} (${ROLE_EMOJIS[p2.role] || ''} ${ROLE_NAMES[p2.role] || p2.role}).`,
    });
  }

  // Gửi sự kiện cho toàn bộ người chơi kèm dữ liệu coupleData
  io.to(room.code).emit('couple-formed', {
    couple: coupleData,
    cupid: cupidData,
  });

  room.players.forEach((player, playerId) => {
    const isCoupleMember = room.couple.includes(playerId);
    const isCupid = player.role === ROLES.CUPID;

    if (isCoupleMember) {
      const partner = playerId === id1 ? p2 : p1;
      if (partner) {
        io.to(playerId).emit('new-message', {
          playerId: 'system',
          playerName: '💘 Thần Tình Yêu',
          avatar: '💘',
          message: `💘 [TƠ HỒNG ĐỊNH MỆNH]: Bạn đã kết duyên cùng ${partner.name} (Vai trò: ${ROLE_EMOJIS[partner.role] || ''} ${ROLE_NAMES[partner.role] || partner.role})! Hai bạn nhìn thấy vai trò của nhau để tương trợ sinh tử!`,
          timestamp: Date.now(),
          isWolfChat: false,
          isSystem: true,
        });
      }
    }

    io.to(playerId).emit('phase-change', {
      phase: PHASES.NIGHT_COUPLE_REVEAL,
      nightSubPhase: (isCoupleMember || isCupid) ? 'couple_reveal' : 'sleep',
      round: room.round,
      role: player.role,
      alive: player.alive,
      players: getPlayersData(room, playerId),
      couple: coupleData,
    });
  });

  startPhaseTimer(room, TIMERS.NIGHT_COUPLE_REVEAL || 6, () => {
    proceedAfterCupid(room);
  });
}

function proceedAfterCupid(room) {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  // Kiểm tra còn Bảo Vệ sống hay không
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

    if (player.role === ROLES.WOLF) {
      io.to(playerId).emit('wolf-vote-update', { wolfVotes: {}, wolfConfirmed: [] });
    }
  });

  // Đếm ngược cho Sói (mặc định 90s hoặc tùy chỉnh theo cài đặt phòng)
  startPhaseTimer(room, room.settings?.nightWolfTime || TIMERS.NIGHT_WOLF, () => {
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
    w.hasHealAtNightStart = !!w.witchState.hasHeal;
    w.hasPoisonAtNightStart = !!w.witchState.hasPoison;
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

  // Chốt cập nhật trừ bình thuốc khi kết thúc lượt Phù Thủy:
  // - Nếu đêm nay Phù Thủy đã dùng bình Cứu -> trừ bình Cứu (hasHeal = false)
  // - Nếu đêm nay Phù Thủy đã dùng bình Độc -> trừ bình Độc (hasPoison = false)
  // Việc xem xét hết thuốc sẽ được áp dụng cho lần thức dậy tiếp theo của Phù Thủy!
  room.players.forEach((p) => {
    if (p.role === ROLES.WITCH && p.alive && p.witchState) {
      if (room.nightActions.witchSavedThisNight) {
        p.witchState.hasHeal = false;
      }
      if (room.nightActions.witchPoisonTarget) {
        p.witchState.hasPoison = false;
      }
    }
  });

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

    const charmedNames = [];
    room.nightActions.piedPiperTargets.forEach((targetId) => {
      room.charmedPlayers.add(targetId);
      room.charmedHistory[targetId] = true;
      const targetPlayer = room.players.get(targetId);
      if (targetPlayer) {
        targetPlayer.charmed = true;
        charmedNames.push(targetPlayer.name);
      }
    });
    room.charmedThisNightNames = charmedNames;

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

  // 💔 Kiểm tra Cặp Đôi chết theo nhau vì thất tình HOẶC cả 2 cùng bị giết trong đêm
  let heartbrokenPlayer = null;
  let heartbrokenPartnerId = null;
  let coupleSimultaneousNightDeath = false;
  if (room.couple && room.couple.length === 2) {
    const [c1Id, c2Id] = room.couple;
    const c1Died = (deadPlayer && deadPlayer.id === c1Id) || (poisonedPlayer && poisonedPlayer.id === c1Id);
    const c2Died = (deadPlayer && deadPlayer.id === c2Id) || (poisonedPlayer && poisonedPlayer.id === c2Id);

    if (c1Died && c2Died && deadPlayer && poisonedPlayer && deadPlayer.id !== poisonedPlayer.id) {
      coupleSimultaneousNightDeath = true;
    } else if (c1Died && !c2Died) {
      const p2 = room.players.get(c2Id);
      if (p2 && p2.alive) {
        p2.alive = false;
        heartbrokenPlayer = p2;
        heartbrokenPartnerId = c1Id;
      }
    } else if (c2Died && !c1Died) {
      const p1 = room.players.get(c1Id);
      if (p1 && p1.alive) {
        p1.alive = false;
        heartbrokenPlayer = p1;
        heartbrokenPartnerId = c2Id;
      }
    }
  }

  // KHÔNG kiểm tra win condition ngay tại đây!
  // Phải để client phát hết tất cả các hoạt ảnh (Sói cào, Phù Thủy cứu, Bảo Vệ khiên, Phù Thủy ném độc, Xung đột)
  // để mọi người hiểu tại sao sói/dân chết trước khi hiển thị màn hình kết thúc chiến thắng!

  room.players.forEach((player, playerId) => {
    io.to(playerId).emit('phase-change', {
      phase: PHASES.DAY_ANNOUNCE,
      round: room.round,
      deadPlayer: deadPlayer
        ? { id: deadPlayer.id, name: deadPlayer.name, avatar: deadPlayer.avatar, avatarColor: deadPlayer.avatarColor, role: deadPlayer.role }
        : null,
      poisonedPlayer: poisonedPlayer
        ? { id: poisonedPlayer.id, name: poisonedPlayer.name, avatar: poisonedPlayer.avatar, avatarColor: poisonedPlayer.avatarColor, role: poisonedPlayer.role }
        : null,
      shieldClashPlayer: shieldClashPlayer
        ? { id: shieldClashPlayer.id, name: shieldClashPlayer.name, avatar: shieldClashPlayer.avatar, avatarColor: shieldClashPlayer.avatarColor, role: shieldClashPlayer.role }
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
      heartbrokenPlayer: heartbrokenPlayer
        ? { id: heartbrokenPlayer.id, name: heartbrokenPlayer.name, avatar: heartbrokenPlayer.avatar, avatarColor: heartbrokenPlayer.avatarColor, role: heartbrokenPlayer.role, partnerId: heartbrokenPartnerId }
        : null,
      coupleSimultaneousNightDeath,
      players: getPlayersData(room, playerId),
    });
  });

  // Ghi rõ tên người chết, người được cứu và người bị trúng độc vào khung chat
  let announceChat = '';
  if (deadPlayer && poisonedPlayer) {
    if (deadPlayer.id === poisonedPlayer.id) {
      announceChat = `💀☠️ [CẢ THIỆN VÀ ÁC]: Đêm qua, ${deadPlayer.name} đã bị cả Ma Sói cào xé và Phù Thủy hạ độc tử vong! "Cả thiện và ác đều nhắm vào ngươi , kẻ phản bội"`;
    } else if (coupleSimultaneousNightDeath) {
      announceChat = `💔💀☠️ [SINH TỬ CÓ NHAU]: Đêm qua, đôi tình nhân uyên ương đều đã ngã xuống — ${deadPlayer.name} bị Ma Sói cào xé và ${poisonedPlayer.name} trúng độc dược Phù Thủy! "Death could not separate us... See you on the other side...."`;
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
  if (heartbrokenPlayer) {
    announceChat += `\n💔 [TÌNH YÊU VĨNH HẰNG]: Nhìn thấy người yêu qua đời, ${heartbrokenPlayer.name} không thiết tha sống nữa và đã chết theo vì quá đau buồn thất tình!`;
  }

  // 📜 Ghi nhận diễn biến Đêm & Bình Minh vào Lịch Sử Trận Đấu (Match Timeline)
  const nightProtectedId = room.nightActions ? room.nightActions.lastProtectedTarget : null;
  const nightProtectedPlayer = nightProtectedId ? room.players.get(nightProtectedId) : null;
  if (nightProtectedPlayer) {
    addMatchLog(room, {
      round: room.round,
      phaseType: 'night',
      icon: '🛡️',
      title: `Đêm ${room.round} • Bảo Vệ Hộ Vệ`,
      text: `Bảo Vệ đã dựng khiên che chở cho ${nightProtectedPlayer.name}.`,
    });
  }
  if (attackedPlayer) {
    addMatchLog(room, {
      round: room.round,
      phaseType: 'night',
      icon: '🐺',
      title: `Đêm ${room.round} • Bầy Sói Săn Mồi`,
      text: `Bầy Sói đã chọn tấn công ${attackedPlayer.name} (${ROLE_EMOJIS[attackedPlayer.role] || ''} ${ROLE_NAMES[attackedPlayer.role] || attackedPlayer.role}).`,
    });
  }
  if (witchSavedPlayer) {
    addMatchLog(room, {
      round: room.round,
      phaseType: 'night',
      icon: '🧪',
      title: `Đêm ${room.round} • Thần Dược Cứu Mạng`,
      text: `Phù Thủy đã dùng Bình Cứu hồi sinh ${witchSavedPlayer.name}.`,
    });
  }
  if (poisonedPlayer) {
    addMatchLog(room, {
      round: room.round,
      phaseType: 'night',
      icon: '☠️',
      title: `Đêm ${room.round} • Độc Dược Tử Thần`,
      text: `Phù Thủy đã ném Bình Độc sát hại ${poisonedPlayer.name} (${ROLE_EMOJIS[poisonedPlayer.role] || ''} ${ROLE_NAMES[poisonedPlayer.role] || poisonedPlayer.role}).`,
    });
  }
  if (room.seerCheckedThisNight) {
    addMatchLog(room, {
      round: room.round,
      phaseType: 'night',
      icon: '🔮',
      title: `Đêm ${room.round} • Tiên Tri Soi Thấu`,
      text: `Tiên Tri đã soi ${room.seerCheckedThisNight.targetName} → Kết quả: Phe ${room.seerCheckedThisNight.alignmentName}.`,
    });
  }
  if (Array.isArray(room.charmedThisNightNames) && room.charmedThisNightNames.length > 0) {
    addMatchLog(room, {
      round: room.round,
      phaseType: 'night',
      icon: '🎶',
      title: `Đêm ${room.round} • Tiếng Sáo Mê Hoặc`,
      text: `Người Thổi Sáo đã thôi miên: ${room.charmedThisNightNames.join(', ')}.`,
    });
  }

  // Tổng kết Bình Minh
  addMatchLog(room, {
    round: room.round,
    phaseType: 'day',
    icon: deadPlayer || poisonedPlayer ? '💀' : '☀️',
    title: `Bình minh Ngày ${room.round}`,
    text: announceChat.replace(/\n/g, ' | '),
  });

  // Kiểm tra Thợ Săn bị Sói cắn tử nạn (và không bị Phù Thủy ném độc) hoặc chết theo người yêu (nếu setting bật)
  const directWolfKilledHunter = (deadPlayer && deadPlayer.role === ROLES.HUNTER && (!poisonedPlayer || poisonedPlayer.id !== deadPlayer.id))
    ? deadPlayer
    : null;
  const heartbrokenHunterNight = (room.settings.hunterShootOnHeartbreak !== false && heartbrokenPlayer && heartbrokenPlayer.role === ROLES.HUNTER)
    ? heartbrokenPlayer
    : null;
  const wolfKilledHunter = directWolfKilledHunter || heartbrokenHunterNight;

  io.to(room.code).emit('new-message', {
    playerId: 'system',
    playerName: '📢 Hệ Thống',
    avatar: '☀️',
    message: announceChat,
    timestamp: Date.now(),
    isWolfChat: false,
    isSystem: true,
  });

  // Kiểm tra Người Thổi Sáo chết trong đêm (do Sói cắn, Phù Thủy ném độc hoặc chết theo người yêu)
  const isPiedPiperDeadNight =
    (deadPlayer && deadPlayer.role === ROLES.PIED_PIPER) ||
    (poisonedPlayer && poisonedPlayer.role === ROLES.PIED_PIPER) ||
    (heartbrokenPlayer && heartbrokenPlayer.role === ROLES.PIED_PIPER);
  let purifiedPlayersNight = [];
  if (isPiedPiperDeadNight) {
    const piedPiperVictim =
      (deadPlayer && deadPlayer.role === ROLES.PIED_PIPER)
        ? deadPlayer
        : (poisonedPlayer && poisonedPlayer.role === ROLES.PIED_PIPER)
        ? poisonedPlayer
        : heartbrokenPlayer;
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
    room.players.forEach((_, pid) => {
      io.to(pid).emit('players-update', { players: getPlayersData(room, pid) });
    });

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
    scheduleRoomTimeout(room, () => {
      io.to(room.code).emit('new-message', {
        playerId: 'system',
        playerName: '📢 Hệ Thống',
        avatar: '✨',
        message: '✨ [THANH TẨY HOÀNG KIM]: Người Thổi Sáo đã bị tiêu diệt! Tiếng sáo ma thuật tan biến — Ánh sáng hoàng kim thanh tẩy rực rỡ, xóa bỏ toàn bộ bùa mê!',
        timestamp: Date.now(),
        isWolfChat: false,
        isSystem: true,
      });
    }, 7500, 'night-pied-piper-purify-chat');
  }

  // Nếu có nhiều hoạt ảnh tuần tự (vừa chết sói/cứu vừa chết độc/xung đột khiên), người yêu tuẫn tình và thanh tẩy -> cho đủ thời gian thoải mái hiển thị
  const hasMultipleModals = (poisonedPlayer || shieldClashPlayer) && (deadPlayer || witchSavedPlayer || savedPlayer);
  const hasHeartbreak = Boolean(heartbrokenPlayer);
  let announceTime = TIMERS.DAY_ANNOUNCE || 8;
  if (hasMultipleModals && isPiedPiperDeadNight) {
    announceTime = hasHeartbreak ? 24 : 19;
  } else if (isPiedPiperDeadNight) {
    announceTime = hasHeartbreak ? 19 : 14;
  } else if (hasMultipleModals) {
    announceTime = hasHeartbreak ? 18 : 13;
  } else if (hasHeartbreak) {
    announceTime = 14;
  }

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

  // 💔 Kiểm tra Cặp Đôi chết theo nhau khi bị treo cổ
  let voteHeartbrokenPlayer = null;
  if (eliminated && room.couple && room.couple.includes(eliminated.id)) {
    const loverId = room.couple.find((id) => id !== eliminated.id);
    const lover = room.players.get(loverId);
    if (lover && lover.alive) {
      lover.alive = false;
      voteHeartbrokenPlayer = lover;
    }
  }

  // Tính số lượng Sói còn sống sau khi bỏ phiếu (hỗ trợ mọi vai trò thuộc bầy Sói qua isWolfTeam)
  const remainingWolves = [...room.players.values()].filter(
    (p) => isWolfTeam(p.role) && p.alive
  ).length;
  const shouldRevealWolves = room.settings.showRemainingWolvesAfterVote !== false;

  // Kiểm tra nếu người bị treo cổ HOẶC người yêu chết theo là Người Thổi Sáo -> Kích hoạt Thanh Tẩy Hoàng Kim
  const isPiedPiperEliminated =
    (eliminated && eliminated.role === ROLES.PIED_PIPER) ||
    (voteHeartbrokenPlayer && voteHeartbrokenPlayer.role === ROLES.PIED_PIPER);
  const piedPiperEliminatedPlayer =
    eliminated && eliminated.role === ROLES.PIED_PIPER ? eliminated : voteHeartbrokenPlayer;

  let purifiedPlayers = [];
  if (isPiedPiperEliminated && piedPiperEliminatedPlayer) {
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
  }

  // Ghi nhận kết quả biểu quyết (chỉ kèm số Sói còn lại nếu chủ phòng BẬT showRemainingWolvesAfterVote)
  const wolfCountSuffix = shouldRevealWolves ? ` (🐺 Sói còn lại: ${remainingWolves})` : '';
  let voteChatMsg = '';
  if (eliminated) {
    voteChatMsg = `⚖️ [KẾT QUẢ BIỂU QUYẾT]: Dân làng đã quyết định treo cổ ${eliminated.name}!${wolfCountSuffix}`;
  } else {
    voteChatMsg = `🕊️ [KẾT QUẢ BIỂU QUYẾT]: Hòa phiếu hoặc đa số bỏ phiếu trắng — Không ai bị treo cổ hôm nay!${wolfCountSuffix}`;
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

  if (voteHeartbrokenPlayer) {
    io.to(room.code).emit('new-message', {
      playerId: 'system',
      playerName: '📢 Hệ Thống',
      avatar: '💔',
      message: `💔 [TÌNH YÊU VĨNH HẰNG]: Nhìn thấy người yêu ${eliminated ? eliminated.name : ''} bị đưa lên giàn treo cổ, ${voteHeartbrokenPlayer.name} không thiết tha sống nữa và đã tự vẫn chết theo!`,
      timestamp: Date.now(),
      isWolfChat: false,
      isSystem: true,
    });
  }

  // 📜 Ghi nhận diễn biến Biểu Quyết Treo Cổ vào Lịch Sử Trận Đấu
  addMatchLog(room, {
    round: room.round,
    phaseType: 'day',
    icon: eliminated ? '⚖️' : '🕊️',
    title: `Biểu quyết Ngày ${room.round}`,
    text: eliminated
      ? `Dân làng treo cổ ${eliminated.name} (${ROLE_EMOJIS[eliminated.role] || ''} ${ROLE_NAMES[eliminated.role] || eliminated.role}).${voteHeartbrokenPlayer ? ` 💔 ${voteHeartbrokenPlayer.name} (${ROLE_EMOJIS[voteHeartbrokenPlayer.role] || ''} ${ROLE_NAMES[voteHeartbrokenPlayer.role] || voteHeartbrokenPlayer.role}) tự vẫn chết theo người yêu!` : ''}`
      : `Hòa phiếu hoặc đa số bỏ phiếu trắng — Không ai bị treo cổ.`,
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
    heartbrokenPlayer: voteHeartbrokenPlayer
      ? {
          id: voteHeartbrokenPlayer.id,
          name: voteHeartbrokenPlayer.name,
          avatar: voteHeartbrokenPlayer.avatar,
          avatarColor: voteHeartbrokenPlayer.avatarColor,
          role: voteHeartbrokenPlayer.role,
        }
      : null,
    piedPiperVictim: piedPiperEliminatedPlayer
      ? {
          id: piedPiperEliminatedPlayer.id,
          name: piedPiperEliminatedPlayer.name,
          avatar: piedPiperEliminatedPlayer.avatar,
          avatarColor: piedPiperEliminatedPlayer.avatarColor,
        }
      : null,
    votes: voteDetails,
    remainingWolves: shouldRevealWolves ? remainingWolves : null,
    isPiedPiperDead: Boolean(isPiedPiperEliminated),
    purifiedPlayers,
    players: getPlayersData(room),
  });

  // Cập nhật danh sách người chơi riêng biệt cho từng người để không mất dữ liệu role của người yêu / đồng đội Sói
  room.players.forEach((p, pid) => {
    io.to(pid).emit('players-update', { players: getPlayersData(room, pid) });
  });

  if (isPiedPiperEliminated && piedPiperEliminatedPlayer) {
    io.to(room.code).emit('pied-piper-purified', {
      piedPiper: {
        id: piedPiperEliminatedPlayer.id,
        name: piedPiperEliminatedPlayer.name,
        avatar: piedPiperEliminatedPlayer.avatar,
        avatarColor: piedPiperEliminatedPlayer.avatarColor,
      },
      purifiedPlayers,
      cause: 'vote',
    });

    // Bảng treo cổ chiếu 3.8s -> Hoạt ảnh Thổi Sáo chết chiếu 3.35s -> Đến khi đóng hết (7.5s) mới gửi tin nhắn chat thanh tẩy!
    scheduleRoomTimeout(room, () => {
      io.to(room.code).emit('new-message', {
        playerId: 'system',
        playerName: '📢 Hệ Thống',
        avatar: '✨',
        message: '✨ [THANH TẨY HOÀNG KIM]: Người Thổi Sáo đã bị tiêu diệt! Tiếng sáo ma thuật tan biến — Ánh sáng hoàng kim thanh tẩy rực rỡ, xóa bỏ toàn bộ bùa mê!',
        timestamp: Date.now(),
        isWolfChat: false,
        isSystem: true,
      });
    }, 7500, 'night-pied-piper-purify-chat');
  }

  const hasVoteHeartbreak = Boolean(voteHeartbrokenPlayer);

  // Kiểm tra Thợ Săn bị treo cổ HOẶC Thợ Săn chết theo người yêu (khi bật setting hunterShootOnHeartbreak)
  const hunterAfterVote =
    eliminated && eliminated.role === ROLES.HUNTER
      ? eliminated
      : room.settings.hunterShootOnHeartbreak !== false &&
        voteHeartbrokenPlayer &&
        voteHeartbrokenPlayer.role === ROLES.HUNTER
      ? voteHeartbrokenPlayer
      : null;

  if (hunterAfterVote) {
    // Nếu có hoạt ảnh cặp đôi chết theo (6s) hoặc Thổi Sáo thanh tẩy, chờ hết chuỗi hoạt ảnh rồi mới tới lượt Thợ Săn nổ súng!
    const hunterVoteDelay = hasVoteHeartbreak
      ? (isPiedPiperEliminated ? 18000 : 11000)
      : (isPiedPiperEliminated ? 12000 : 4500);
    scheduleRoomTimeout(room, () => {
      startHunterShotPhase(room, hunterAfterVote, 'vote');
    }, hunterVoteDelay, 'vote-hunter-shot');
    return;
  }

  // Thời gian chờ chuyển pha: Đảm bảo đủ thời gian cho bảng số Sói hiện ra sau hoạt ảnh cặp đôi (3.5s đọc bảng)
  const voteTransitionDelay = isPiedPiperEliminated
    ? (hasVoteHeartbreak ? 21500 : 15500)
    : (hasVoteHeartbreak ? 14500 : 8500);

  // Kiểm tra win condition sau vote
  const winCheck = checkWinCondition(room);
  if (winCheck.gameOver) {
    scheduleRoomTimeout(room, () => endGame(room, winCheck), voteTransitionDelay, 'vote-end-game');
    return;
  }

  // Tiếp tục -> Ban Đêm
  scheduleRoomTimeout(room, () => startNightPhase(room), voteTransitionDelay, 'vote-next-night');
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

  room.players.forEach((p, playerId) => {
    io.to(playerId).emit('phase-change', {
      phase: PHASES.HUNTER_SHOT,
      round: room.round,
      hunter: {
        id: hunterPlayer.id,
        name: hunterPlayer.name,
        avatar: hunterPlayer.avatar,
        avatarColor: hunterPlayer.avatarColor,
      },
      cause,
      players: getPlayersData(room, playerId),
    });
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

    addMatchLog(room, {
      round: room.round,
      phaseType: 'day',
      icon: '🏹',
      title: `Vòng ${room.round} • Phát Súng Trăn Trối`,
      text: `Thợ Săn ${hunterPlayer.name} quyết định bắn chỉ thiên, không kéo theo ai xuống mồ.`,
    });

    scheduleRoomTimeout(room, () => {
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
    }, 2000, 'hunter-pass-transition');
    return;
  }

  // Thợ Săn bắn trúng mục tiêu
  targetPlayer.alive = false;

  // 💔 Nếu mục tiêu của Thợ Săn thuộc Cặp Đôi, người yêu chết theo vì thất tình
  let hunterHeartbrokenPlayer = null;
  if (room.couple && room.couple.includes(targetPlayer.id)) {
    const loverId = room.couple.find((id) => id !== targetPlayer.id);
    const lover = room.players.get(loverId);
    if (lover && lover.alive) {
      lover.alive = false;
      hunterHeartbrokenPlayer = lover;
    }
  }

  // Kiểm tra nếu mục tiêu bị bắn hạ HOẶC người yêu chết theo là Người Thổi Sáo -> Kích hoạt Thanh Tẩy Hoàng Kim
  const isPiedPiperShot =
    (targetPlayer && targetPlayer.role === ROLES.PIED_PIPER) ||
    (hunterHeartbrokenPlayer && hunterHeartbrokenPlayer.role === ROLES.PIED_PIPER);
  const piedPiperShotPlayer =
    targetPlayer && targetPlayer.role === ROLES.PIED_PIPER ? targetPlayer : hunterHeartbrokenPlayer;

  let purifiedPlayersHunter = [];
  if (isPiedPiperShot && piedPiperShotPlayer) {
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

    io.to(room.code).emit('pied-piper-purified', {
      piedPiper: {
        id: piedPiperShotPlayer.id,
        name: piedPiperShotPlayer.name,
        avatar: piedPiperShotPlayer.avatar,
        avatarColor: piedPiperShotPlayer.avatarColor,
      },
      purifiedPlayers: purifiedPlayersHunter,
      cause: 'hunter_shot',
    });

    // Chờ cả modal Thợ Săn nổ súng (4.5s), modal Tim Vỡ (nếu có: 6s) và modal Thổi Sáo chết (3.35s) đóng hết mới gửi tin nhắn chat thanh tẩy!
    const chatPurifyDelay = hunterHeartbrokenPlayer ? 14000 : 8000;
    scheduleRoomTimeout(room, () => {
      io.to(room.code).emit('new-message', {
        playerId: 'system',
        playerName: '📢 Hệ Thống',
        avatar: '✨',
        message: '✨ [THANH TẨY HOÀNG KIM]: Người Thổi Sáo đã bị tiêu diệt! Tiếng sáo ma thuật tan biến — Ánh sáng hoàng kim thanh tẩy rực rỡ, xóa bỏ toàn bộ bùa mê!',
        timestamp: Date.now(),
        isWolfChat: false,
        isSystem: true,
      });
    }, chatPurifyDelay, 'hunter-pied-piper-purify-chat');
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
    heartbrokenPlayer: hunterHeartbrokenPlayer
      ? {
          id: hunterHeartbrokenPlayer.id,
          name: hunterHeartbrokenPlayer.name,
          avatar: hunterHeartbrokenPlayer.avatar,
          avatarColor: hunterHeartbrokenPlayer.avatarColor,
          role: hunterHeartbrokenPlayer.role,
        }
      : null,
    passed: false,
    players: getPlayersData(room),
  });

  room.players.forEach((p, pid) => {
    io.to(pid).emit('players-update', { players: getPlayersData(room, pid) });
  });

  if (hunterHeartbrokenPlayer) {
    io.to(room.code).emit('new-message', {
      playerId: 'system',
      playerName: '📢 Hệ Thống',
      avatar: '💔',
      message: `💔 [TÌNH YÊU VĨNH HẰNG]: Nhìn thấy người yêu ${targetPlayer.name} trúng đạn ngã xuống, ${hunterHeartbrokenPlayer.name} không thiết tha sống nữa và đã tự vẫn chết theo!`,
      timestamp: Date.now(),
      isWolfChat: false,
      isSystem: true,
    });
  }

  io.to(room.code).emit('new-message', {
    playerId: 'system',
    playerName: '📢 Hệ Thống',
    avatar: '💥',
    message: `💥🏹 [TIẾNG SÚNG XÉ GIÓ]: "Sẽ có những con cá phải trả gió!" — Thợ Săn ${hunterPlayer.name} đã bắn hạ ${targetPlayer.name} tử trận!`,
    timestamp: Date.now(),
    isWolfChat: false,
    isSystem: true,
  });

  addMatchLog(room, {
    round: room.round,
    phaseType: 'day',
    icon: '💥',
    title: `Vòng ${room.round} • Phát Súng Báo Thù`,
    text: `Thợ Săn ${hunterPlayer.name} nổ súng bắn hạ ${targetPlayer.name} (${ROLE_EMOJIS[targetPlayer.role] || ''} ${ROLE_NAMES[targetPlayer.role] || targetPlayer.role}).${hunterHeartbrokenPlayer ? ` 💔 ${hunterHeartbrokenPlayer.name} (${ROLE_EMOJIS[hunterHeartbrokenPlayer.role] || ''} ${ROLE_NAMES[hunterHeartbrokenPlayer.role] || hunterHeartbrokenPlayer.role}) tự vẫn chết theo người yêu!` : ''}`,
  });

  // Chờ hiển thị hoạt ảnh tuần tự (Nếu bắn trúng Người Thổi Sáo thì chờ thêm thời gian Thổi Sáo chết + thanh tẩy: 13s / 18s nếu kèm người yêu chết; nếu trúng người có người yêu tuẫn tình: 12.5s, ngược lại 6.5s)
  const hasHunterHeartbreak = Boolean(hunterHeartbrokenPlayer);
  const hunterDelay = isPiedPiperShot
    ? (hasHunterHeartbreak ? 18000 : 13000)
    : (hasHunterHeartbreak ? 12500 : 6500);
  scheduleRoomTimeout(room, () => {
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
  }, hunterDelay, 'hunter-shot-transition');
}

/** Kết thúc game - Lật bài, hiển thị kết quả */
function endGame(room, winCheck) {
  room.phase = PHASES.GAME_OVER;
  clearAllRoomTimers(room);

  const coupleIds = Array.isArray(room.couple) ? room.couple : [];

  // Reveal toàn bộ vai trò + trạng thái Cặp Đôi & Bị Thôi Miên
  const allPlayers = [...room.players.values()].map((p) => {
    const inCouple = coupleIds.includes(p.id);
    const partnerId = inCouple ? coupleIds.find((id) => id !== p.id) : null;
    const partner = partnerId ? room.players.get(partnerId) : null;
    const isCharmed = Boolean((room.charmedPlayers && room.charmedPlayers.has(p.id)) || p.charmed);
    return {
      id: p.id,
      name: p.name,
      role: p.role,
      alive: p.alive,
      avatar: p.avatar,
      avatarColor: p.avatarColor,
      inCouple,
      partnerId: partnerId || null,
      partnerName: partner ? partner.name : null,
      charmed: isCharmed,
    };
  });

  const couplePlayers = coupleIds
    .map((id) => room.players.get(id))
    .filter(Boolean)
    .map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      avatar: p.avatar,
      avatarColor: p.avatarColor,
    }));

  io.to(room.code).emit('phase-change', {
    phase: PHASES.GAME_OVER,
    winner: winCheck.winner,
    message: winCheck.message,
    players: allPlayers,
    couple: couplePlayers,
    matchHistory: room.matchHistory || [],
  });
}

/**
 * Xử lý khi có người out game giữa trận (rời phòng / mất kết nối quá hạn)
 * YÊU CẦU:
 * - Nếu 1 người trong Cặp Đôi rời trận -> người yêu còn lại tự vẫn chết theo (tuẫn tình)
 * - Nếu Người Thổi Sáo rời trận (hoặc chết theo người yêu) -> thanh tẩy toàn bộ bùa mê
 * - Nếu số Sói >= Dân hoặc hết Sói -> dừng ván NGAY LẬP TỨC và hiện màn hình kết thúc
 */
function handleMidGameExit(room, playerId, exitingPlayerSnapshot = null) {
  if (room.phase === PHASES.WAITING || room.phase === PHASES.GAME_OVER) return;

  const exitingPlayer = room.players.get(playerId) || exitingPlayerSnapshot;
  const exitingName = exitingPlayer ? exitingPlayer.name : 'Một người chơi';
  const exitingRole = exitingPlayer ? exitingPlayer.role : null;

  // Bỏ phiếu cắn / bỏ phiếu ngày của người đã rời (hoặc nhắm vào người đã rời) không còn hiệu lực
  if (room.nightActions) {
    if (room.nightActions.wolfVotes) {
      room.nightActions.wolfVotes.delete(playerId);
      for (const [wid, tid] of room.nightActions.wolfVotes.entries()) {
        if (tid === playerId) room.nightActions.wolfVotes.delete(wid);
      }
    }
    if (room.nightActions.wolfConfirmed) room.nightActions.wolfConfirmed.delete(playerId);
    if (room.nightActions.bodyguardTarget === playerId) room.nightActions.bodyguardTarget = null;
    if (room.nightActions.witchPoisonTarget === playerId) room.nightActions.witchPoisonTarget = null;
    if (Array.isArray(room.nightActions.piedPiperTargets)) {
      room.nightActions.piedPiperTargets = room.nightActions.piedPiperTargets.filter((id) => id !== playerId);
    }
  }
  if (room.dayVotes) {
    room.dayVotes.delete(playerId);
    for (const [vid, tid] of room.dayVotes.entries()) {
      if (tid === playerId) room.dayVotes.delete(vid);
    }
  }
  if (room.charmedPlayers) {
    room.charmedPlayers.delete(playerId);
  }

  // 💔 Kiểm tra nếu người rời trận thuộc Cặp Đôi -> người yêu còn lại chết theo vì thất tình
  let exitHeartbrokenPlayer = null;
  if (Array.isArray(room.couple) && room.couple.includes(playerId)) {
    const partnerId = room.couple.find((id) => id !== playerId);
    const partner = partnerId ? room.players.get(partnerId) : null;
    if (partner && partner.alive) {
      partner.alive = false;
      exitHeartbrokenPlayer = partner;
      if (room.charmedPlayers) room.charmedPlayers.delete(partner.id);

      io.to(room.code).emit('new-message', {
        playerId: 'system',
        playerName: '📢 Hệ Thống',
        avatar: '💔',
        message: `💔 [TÌNH YÊU VĨNH HẰNG]: Vì người yêu ${exitingName} đã rời bỏ cuộc chơi, ${partner.name} đau đớn tột cùng và tự vẫn chết theo!`,
        timestamp: Date.now(),
        isWolfChat: false,
        isSystem: true,
      });
    }
  }

  // ✨ Kiểm tra nếu người rời trận HOẶC người yêu chết theo là Người Thổi Sáo -> Thanh tẩy toàn bộ bùa mê
  const isPiedPiperExited =
    exitingRole === ROLES.PIED_PIPER ||
    (exitHeartbrokenPlayer && exitHeartbrokenPlayer.role === ROLES.PIED_PIPER);
  const piedPiperExitPlayer =
    exitingRole === ROLES.PIED_PIPER ? exitingPlayer : exitHeartbrokenPlayer;

  if (isPiedPiperExited && room.charmedPlayers && room.charmedPlayers.size > 0) {
    const purifiedPlayersExit = [...room.charmedPlayers]
      .map((id) => room.players.get(id))
      .filter(Boolean)
      .map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        avatarColor: p.avatarColor,
      }));

    room.charmedPlayers = new Set();
    room.charmedHistory = {};
    room.players.forEach((p) => { p.charmed = false; });

    if (piedPiperExitPlayer) {
      io.to(room.code).emit('pied-piper-purified', {
        piedPiper: {
          id: piedPiperExitPlayer.id || playerId,
          name: piedPiperExitPlayer.name || 'Người Thổi Sáo',
          avatar: piedPiperExitPlayer.avatar || '🎶',
          avatarColor: piedPiperExitPlayer.avatarColor || '#A855F7',
        },
        purifiedPlayers: purifiedPlayersExit,
        cause: 'exit',
      });
    }

    io.to(room.code).emit('new-message', {
      playerId: 'system',
      playerName: '📢 Hệ Thống',
      avatar: '✨',
      message: '✨ [THANH TẨY HOÀNG KIM]: Người Thổi Sáo đã ngã xuống / rời trận — Toàn bộ bùa mê tiếng sáo đã được xóa bỏ!',
      timestamp: Date.now(),
      isWolfChat: false,
      isSystem: true,
    });
  }

  addMatchLog(room, {
    round: room.round || 1,
    phaseType: 'system',
    icon: '🚪',
    title: `Vòng ${room.round || 1} • Người Chơi Rời Trận`,
    text: `${exitingName}${exitingRole ? ` (${ROLE_EMOJIS[exitingRole] || ''} ${ROLE_NAMES[exitingRole] || exitingRole})` : ''} đã rời trận.${exitHeartbrokenPlayer ? ` 💔 ${exitHeartbrokenPlayer.name} tự vẫn chết theo người yêu!` : ''}`,
  });

  const winCheck = checkWinCondition(room);
  if (winCheck.gameOver) {
    endGame(room, winCheck);
    return;
  }

  // Gửi danh sách người chơi riêng cho từng người (giữ đúng quyền xem vai trò)
  room.players.forEach((p, pid) => {
    io.to(pid).emit('players-update', { players: getPlayersData(room, pid), hostId: room.hostId });
  });
}

// ==================== SOCKET EVENT HANDLERS ====================

io.on('connection', (socket) => {
  console.log(`🔌 Kết nối mới: ${socket.id}`);

  // ---------- TẠO PHÒNG ----------
  socket.on('create-room', (data = {}) => {
    try {
      const ipScope = socket.handshake?.address || socket.id;
      const rl = rateLimiter.check(ipScope, 'create-room');
      if (!rl.allowed) {
        socket.emit('error-msg', { message: 'Bạn thao tác tạo phòng quá nhanh, vui lòng chờ vài giây!' });
        return;
      }

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

      const hostPlayer = room.players.get(socket.id);
      socket.emit('room-created', {
        roomCode: room.code,
        players: getPlayersData(room, socket.id),
        settings: room.settings,
        hostId: room.hostId,
        reconnectToken: hostPlayer?.reconnectToken,
      });
    } catch (err) {
      console.error('Lỗi khi tạo phòng:', err);
      socket.emit('error-msg', { message: 'Có lỗi xảy ra khi tạo phòng!' });
    }
  });

  // ---------- VÀO PHÒNG ----------
  socket.on('join-room', (data = {}) => {
    try {
      const rl = rateLimiter.check(socket.id, 'join-room');
      if (!rl.allowed) {
        socket.emit('error-msg', { message: 'Bạn thử vào phòng quá nhanh, vui lòng chờ vài giây!' });
        return;
      }

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

      const joinedPlayer = room.players.get(socket.id);
      // Gửi cho người vào
      socket.emit('room-joined', {
        roomCode: code,
        players: getPlayersData(room, socket.id),
        settings: room.settings,
        hostId: room.hostId,
        reconnectToken: joinedPlayer?.reconnectToken,
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
      numCupids: settings.numCupids !== undefined ? settings.numCupids : (room.settings.numCupids !== undefined ? room.settings.numCupids : 0),
      piedPiperCharmCount: settings.piedPiperCharmCount !== undefined ? settings.piedPiperCharmCount : (room.settings.piedPiperCharmCount || 2),
      piedPiperRevealDawn: settings.piedPiperRevealDawn !== undefined ? settings.piedPiperRevealDawn : (room.settings.piedPiperRevealDawn !== false),
      hunterShootOnHeartbreak: settings.hunterShootOnHeartbreak !== undefined ? settings.hunterShootOnHeartbreak : (room.settings.hunterShootOnHeartbreak !== false),
      showRemainingWolvesAfterVote: settings.showRemainingWolvesAfterVote !== undefined ? settings.showRemainingWolvesAfterVote : (room.settings.showRemainingWolvesAfterVote !== false),
      dayDiscussionTime: settings.dayDiscussionTime !== undefined ? settings.dayDiscussionTime : (room.settings.dayDiscussionTime || 60),
      dayVoteTime: settings.dayVoteTime !== undefined ? settings.dayVoteTime : (room.settings.dayVoteTime || 25),
      nightWolfTime: settings.nightWolfTime !== undefined ? settings.nightWolfTime : (room.settings.nightWolfTime || 90),
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
    const totalSpecial = (room.settings.numSeers || 0) + (room.settings.numBodyguards || 0) + (room.settings.numWitches || 0) + (room.settings.numHunters || 0) + (room.settings.numPiedPipers || 0) + (room.settings.numCupids || 0);
    if (totalSpecial > remainingNonWolves) {
      if (room.settings.numPiedPipers > 1) room.settings.numPiedPipers = 1;
      if (room.settings.numCupids > 1) room.settings.numCupids = 1;
      if (room.settings.numHunters > 1) room.settings.numHunters = 1;
      if (room.settings.numWitches > 1) room.settings.numWitches = 1;
      if (room.settings.numBodyguards > 1) room.settings.numBodyguards = 1;
      if (room.settings.numSeers > 1) room.settings.numSeers = 1;
      while ((room.settings.numSeers || 0) + (room.settings.numBodyguards || 0) + (room.settings.numWitches || 0) + (room.settings.numHunters || 0) + (room.settings.numPiedPipers || 0) + (room.settings.numCupids || 0) > remainingNonWolves) {
        if (room.settings.numHunters > 0) room.settings.numHunters--;
        else if (room.settings.numCupids > 0) room.settings.numCupids--;
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
    room.round = 0;
    room.couple = null;
    room.cupidActed = false;
    room.hunterShotContext = null;
    room.matchHistory = [];
    room.seerHistory = {};
    room.charmedPlayers = new Set();
    room.charmedHistory = {};
    room.players.forEach((p) => {
      p.alive = true;
      p.charmed = false;
    });

    // Log ẩn danh số lượng vai trò (KHÔNG in tên người chơi để chống lộ role cho chủ phòng/người chạy server)
    const roleCounts = {};
    [...room.players.values()].forEach((p) => {
      roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
    });
    const countsStr = Object.entries(roleCounts).map(([r, c]) => `${c} ${r}`).join(', ');
    console.log(`🎮 Phòng ${room.code} bắt đầu game! (${playerCount} người chơi: ${countsStr})`);

    // Gửi role cho từng người chơi
    room.players.forEach((player, playerId) => {
      io.to(playerId).emit('game-started', {
        role: player.role,
        players: getPlayersData(room, playerId),
        charmedHistory: player.role === ROLES.PIED_PIPER ? {} : undefined,
        charmCountRequired: player.role === ROLES.PIED_PIPER ? (room.settings.piedPiperCharmCount || 2) : undefined,
      });
    });

    // Dọn sạch mọi timer tồn đọng từ ván trước trước khi bắt đầu ván mới
    clearAllRoomTimers(room);

    // Bắt đầu đêm đầu tiên sau delay để xem role
    scheduleRoomTimeout(room, () => startNightPhase(room), TIMERS.ROLE_REVEAL * 1000, 'start-first-night');
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

    const aliveWolves = [...room.players.values()].filter(
      (p) => p.role === ROLES.WOLF && p.alive
    );

    // Nếu Sói bấm lại vào mục tiêu đang chọn để hủy chọn (targetId === null)
    if (targetId === null || targetId === undefined) {
      room.nightActions.wolfVotes.delete(socket.id);
      const wolfVotes = {};
      room.nightActions.wolfVotes.forEach((tid, wid) => {
        wolfVotes[wid] = tid;
      });
      aliveWolves.forEach((wolf) => {
        io.to(wolf.id).emit('wolf-vote-update', { wolfVotes, wolfConfirmed: [] });
      });
      return;
    }

    const target = room.players.get(targetId);
    if (!target || !target.alive || target.role === ROLES.WOLF) return;

    // Toggle hoặc đổi phiếu
    if (room.nightActions.wolfVotes.get(socket.id) === targetId) {
      room.nightActions.wolfVotes.delete(socket.id);
    } else {
      room.nightActions.wolfVotes.set(socket.id, targetId);
    }

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

    const canUseHealTonight = player.hasHealAtNightStart !== undefined ? player.hasHealAtNightStart : player.witchState.hasHeal;
    const hasEffectiveVictim = Boolean(
      room.nightActions.wolfTarget &&
        room.nightActions.bodyguardTarget !== room.nightActions.wolfTarget
    );

    if (save === true && canUseHealTonight && hasEffectiveVictim) {
      room.nightActions.witchSavedThisNight = true;
      console.log(`🧪 Phù Thủy đã dùng bình Cứu hồi sinh con mồi.`);
    } else if (save === false) {
      room.nightActions.witchSavedThisNight = false;
      console.log(`❌ Phù Thủy chọn BỎ MẶC con mồi.`);
    }

    const canUsePoisonTonight = player.hasPoisonAtNightStart !== undefined ? player.hasPoisonAtNightStart : player.witchState.hasPoison;
    socket.emit('witch-state-update', {
      witchState: {
        hasHeal: canUseHealTonight && !room.nightActions.witchSavedThisNight,
        hasPoison: canUsePoisonTonight,
      },
      savedThisNight: room.nightActions.witchSavedThisNight,
    });

    // YÊU CẦU: Phù Thủy có thể dùng cả 2 lọ thuốc trong 1 đêm!
    // Nếu Phù Thủy KHÔNG CÒN BÌNH ĐỘC từ trước -> tự động đếm lùi 5s chuyển pha
    // Nếu VẪN CÒN BÌNH ĐỘC -> Không rút 5s ngay mà để Phù Thủy tiếp tục lựa chọn dùng bình độc thứ 2!
    if (!canUsePoisonTonight) {
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

    const canUseHealTonight = player.hasHealAtNightStart !== undefined ? player.hasHealAtNightStart : player.witchState.hasHeal;
    const canUsePoisonTonight = player.hasPoisonAtNightStart !== undefined ? player.hasPoisonAtNightStart : player.witchState.hasPoison;
    const hasEffectiveVictim = Boolean(
      room.nightActions.wolfTarget &&
        room.nightActions.bodyguardTarget !== room.nightActions.wolfTarget
    );

    // Xử lý Cứu (chỉ trừ bình cứu khi thực sự có nạn nhân bị cắn đêm nay):
    if (save === true && canUseHealTonight && hasEffectiveVictim) {
      room.nightActions.witchSavedThisNight = true;
      console.log(`🧪 Phù Thủy đã dùng bình Cứu trong đêm.`);
    }

    // Xử lý Độc (Phù Thủy KHÔNG THỂ bỏ độc chính mình, hỗ trợ chọn/đổi mục tiêu hoặc bỏ qua):
    if (poisonTargetId && poisonTargetId !== socket.id && canUsePoisonTonight) {
      const target = room.players.get(poisonTargetId);
      if (target && target.alive) {
        room.nightActions.witchPoisonTarget = poisonTargetId;
        console.log(`☠️ Phù Thủy đã dùng bình Độc trong đêm.`);
      }
    } else if (poisonTargetId === null) {
      room.nightActions.witchPoisonTarget = null;
      console.log(`❌ Phù Thủy chọn không dùng bình Độc đêm nay.`);
    }

    socket.emit('witch-state-update', {
      witchState: {
        hasHeal: canUseHealTonight && !room.nightActions.witchSavedThisNight,
        hasPoison: canUsePoisonTonight,
      },
      poisonTargetId: room.nightActions.witchPoisonTarget,
      savedThisNight: room.nightActions.witchSavedThisNight,
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

    const { isEvil, alignment, alignmentName } = getSeerAlignment(target.role);

    if (!room.seerHistory) room.seerHistory = {};
    room.seerHistory[targetId] = {
      alignment,
      alignmentName,
    };
    room.seerCheckedThisNight = {
      targetId,
      targetName: target.name,
      alignmentName,
    };

    // Tiên Tri chỉ được biết là THIỆN hay ÁC, không được biết vai trò cụ thể!
    socket.emit('seer-result', {
      targetId,
      targetName: target.name,
      targetAvatar: target.avatar,
      targetAvatarColor: target.avatarColor,
      isWolf: isEvil,
      alignment,
      alignmentName,
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
      scheduleRoomTimeout(room, () => {
        concludeDayVote(room);
      }, 800, 'all-voted-conclude');
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

  // ---------- THẦN TÌNH YÊU CUPID GHÉP ĐÔI ----------
  socket.on('cupid-choose-couple', (data = {}) => {
    try {
      const room = getRoom(socket.roomCode);
      if (!room || room.phase !== PHASES.NIGHT_CUPID || room.cupidActed) return;

      const player = room.players.get(socket.id);
      if (!player || player.role !== ROLES.CUPID || !player.alive) return;

      const rawTargets = data.targets || data.targetIds || [];
      if (!Array.isArray(rawTargets) || rawTargets.length < 2) return;

      // Cupid bắt buộc chọn 2 người khác nhau, không được chọn chính Cupid
      const validTargets = rawTargets.filter((tId) => {
        const target = room.players.get(tId);
        return target && target.alive && target.id !== socket.id;
      });

      if (validTargets.length < 2) return;

      const target1 = validTargets[0];
      const target2 = validTargets[1];
      if (target1 === target2) return;

      room.couple = [target1, target2];
      room.cupidActed = true;

      socket.emit('cupid-chosen-success', { couple: [target1, target2] });

      // Rút ngắn timer xuống 2s để chuyển nhanh sang màn hình hé lộ Cặp Đôi
      clearPhaseTimer(room);
      room.timeLeft = 2;
      io.to(room.code).emit('timer-update', { timeLeft: 2, phaseEndsAt: Date.now() + 2000 });
      scheduleRoomTimeout(room, () => {
        finishCupidTurn(room);
      }, 2000, 'cupid-finish-turn');
    } catch (err) {
      console.error('Error in cupid-choose-couple:', err);
    }
  });

  // ---------- CHAT ----------
  socket.on('send-message', ({ message, isWolfChat, isCoupleChat } = {}) => {
    const rl = rateLimiter.check(socket.id, 'send-message');
    if (!rl.allowed) {
      socket.emit('error-msg', { message: '💬 Bạn đang nhắn quá nhanh, vui lòng chậm lại!' });
      return;
    }

    const room = getRoom(socket.roomCode);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    const trimmed = sanitizeMessage(message);
    if (!trimmed) return;

    // Người chết không được chat (trừ khi đang ở lobby hoặc game over)
    if (room.phase !== PHASES.WAITING && room.phase !== PHASES.GAME_OVER && !player.alive) {
      return;
    }

    // 💘 CHAT RIÊNG CỦA CẶP ĐÔI (Hoạt động mọi buổi sáng)
    if (isCoupleChat) {
      if (!room.couple || !room.couple.includes(socket.id)) {
        socket.emit('error-msg', { message: 'Bạn không thuộc Cặp Đôi uyên ương!' });
        return;
      }

      // Kiểm tra ban ngày (hoạt động mọi buổi sáng)
      const isNightTime = room.phase === PHASES.NIGHT_CUPID || room.phase === PHASES.NIGHT_COUPLE_REVEAL || room.phase === PHASES.NIGHT_BODYGUARD || room.phase === PHASES.NIGHT_WOLF || room.phase === PHASES.NIGHT_WITCH || room.phase === PHASES.NIGHT_SEER || room.phase === PHASES.NIGHT_PIED_PIPER || room.phase === PHASES.NIGHT_CHARMED_REVEAL || room.phase === PHASES.NIGHT;
      if (isNightTime && room.phase !== PHASES.WAITING && room.phase !== PHASES.GAME_OVER) {
        socket.emit('error-msg', { message: '🌙 Ban đêm làng đang ngủ, tâm sự Cặp Đôi sẽ mở vào buổi sáng!' });
        return;
      }

      // Gửi riêng cho 2 người trong cặp đôi
      room.couple.forEach((loverId) => {
        io.to(loverId).emit('new-message', {
          playerId: socket.id,
          playerName: player.name,
          avatar: player.avatar,
          message: trimmed,
          timestamp: Date.now(),
          isCoupleChat: true,
          isWolfChat: false,
        });
      });
      return;
    }

    // 🐺 CHAT RIÊNG CỦA SÓI
    if (isWolfChat) {
      // KHÓA LẠI PHẦN CHAT CỦA SÓI KHI ĐẾN GIỜ BẦU CỬ / BỎ PHIẾU (Theo yêu cầu)
      if (room.phase === PHASES.DAY_VOTE) {
        socket.emit('error-msg', { message: '🔒 Kênh chat Hang Sói tạm khóa trong thời gian Bỏ Phiếu!' });
        return;
      }

      if (isWolfTeam(player.role)) {
        const wolves = [...room.players.values()].filter((p) => isWolfTeam(p.role));
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
    const isNightTime = room.phase === PHASES.NIGHT_CUPID || room.phase === PHASES.NIGHT_COUPLE_REVEAL || room.phase === PHASES.NIGHT_BODYGUARD || room.phase === PHASES.NIGHT_WOLF || room.phase === PHASES.NIGHT_WITCH || room.phase === PHASES.NIGHT_SEER || room.phase === PHASES.NIGHT_PIED_PIPER || room.phase === PHASES.NIGHT_CHARMED_REVEAL || room.phase === PHASES.NIGHT;
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
      const rl = rateLimiter.check(socket.id, 'reconnect-room');
      if (!rl.allowed) {
        socket.emit('reconnect-failed', { message: 'Thử kết nối lại quá nhiều lần, vui lòng chờ giây lát!' });
        return;
      }

      const { roomCode, playerName, oldPlayerId, customAvatar, reconnectToken } = data || {};
      if (!roomCode || typeof roomCode !== 'string') {
        socket.emit('reconnect-failed', { message: 'Mã phòng không hợp lệ!' });
        return;
      }
      const room = getRoom(roomCode.toUpperCase().trim());
      if (!room) {
        socket.emit('reconnect-failed', { message: 'Phòng không còn tồn tại hoặc đã bị giải tán!' });
        return;
      }

      // Hàm tìm kiếm chỗ ngồi khớp + xác thực reconnectToken bí mật chống chiếm chỗ
      const findAndVerifyPlayer = () => {
        let candidate = oldPlayerId ? room.players.get(oldPlayerId) : null;
        let matchedId = oldPlayerId;
        if (!candidate && playerName) {
          for (const [id, p] of room.players) {
            if (p.name.toLowerCase() === playerName.toLowerCase()) {
              candidate = p;
              matchedId = id;
              break;
            }
          }
        }
        if (!candidate) return { candidate: null, matchedId: null, authorized: true };
        if (candidate.reconnectToken && !verifyReconnectToken(candidate.reconnectToken, reconnectToken)) {
          return { candidate: null, matchedId: null, authorized: false };
        }
        return { candidate, matchedId, authorized: true };
      };

      const { candidate: verifiedPlayer, matchedId: verifiedMatchedId, authorized } = findAndVerifyPlayer();
      if (!authorized) {
        socket.emit('reconnect-failed', { message: '🔐 Phiên xác thực không hợp lệ! Không thể chiếm quyền chỗ ngồi của người khác.' });
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
        const existingPlayer = verifiedPlayer;
        const matchedPlayerId = verifiedMatchedId;
        if (existingPlayer && matchedPlayerId) {
          room.players.delete(matchedPlayerId);
        }

        const isHost = (oldPlayerId && oldPlayerId === room.hostId) ||
                       (matchedPlayerId && matchedPlayerId === room.hostId) ||
                       (existingPlayer && room.hostId === existingPlayer.id) ||
                       (room.hostPlayerName && playerName && room.hostPlayerName.toLowerCase() === playerName.toLowerCase()) ||
                       room.players.size === 0;

        const safeReconnectAvatar =
          customAvatar && validateAvatarPayload(customAvatar).valid
            ? customAvatar.trim()
            : null;
        const playerObj = {
          id: socket.id,
          name: playerName || 'Dân Làng',
          role: null,
          alive: true,
          avatar: safeReconnectAvatar || (existingPlayer ? existingPlayer.avatar : '🐺'),
          avatarColor: existingPlayer ? existingPlayer.avatarColor : '#6366F1',
          connected: true,
          reconnectToken: existingPlayer?.reconnectToken || undefined,
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
          reconnectToken: playerObj.reconnectToken,
        });

        io.to(room.code).emit('players-update', {
          players: getPlayersData(room),
          hostId: room.hostId,
        });
        return;
      }

      // 2. Nếu đang trong trận đấu
      const existingPlayer = verifiedPlayer;
      const matchedPlayerId = verifiedMatchedId;
      if (existingPlayer && matchedPlayerId) {
        room.players.delete(matchedPlayerId);
      }

      if (existingPlayer) {
        if (matchedPlayerId && pendingDisconnects.has(matchedPlayerId)) {
          clearTimeout(pendingDisconnects.get(matchedPlayerId).timer);
          pendingDisconnects.delete(matchedPlayerId);
        }

        const oldIds = [oldPlayerId, matchedPlayerId, existingPlayer.id].filter(Boolean);
        const replaceOldId = (id) => (id && oldIds.includes(id) ? socket.id : id);

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

        // 💘 Khôi phục liên kết Cặp Đôi (Cupid) sang socket.id mới
        if (Array.isArray(room.couple) && room.couple.length > 0) {
          room.couple = room.couple.map(replaceOldId);
        }

        // 🏹 Khôi phục ngữ cảnh Thợ Săn bắn trăn trối nếu Thợ Săn ấn F5 đúng lúc đang nhắm bắn
        if (room.hunterShotContext && oldIds.includes(room.hunterShotContext.hunterId)) {
          room.hunterShotContext.hunterId = socket.id;
        }

        // 🌙 Khôi phục các ID tham chiếu trong hành động đêm và bỏ phiếu ngày
        room.deadThisNight = replaceOldId(room.deadThisNight);
        room.poisonedThisNight = replaceOldId(room.poisonedThisNight);
        room.shieldClashThisNight = replaceOldId(room.shieldClashThisNight);
        room.attackedThisNight = replaceOldId(room.attackedThisNight);
        room.savedThisNight = replaceOldId(room.savedThisNight);
        room.witchSavedThisNight = replaceOldId(room.witchSavedThisNight);

        if (room.nightActions) {
          room.nightActions.bodyguardTarget = replaceOldId(room.nightActions.bodyguardTarget);
          room.nightActions.lastProtectedTarget = replaceOldId(room.nightActions.lastProtectedTarget);
          room.nightActions.wolfTarget = replaceOldId(room.nightActions.wolfTarget);
          room.nightActions.witchPoisonTarget = replaceOldId(room.nightActions.witchPoisonTarget);
          if (Array.isArray(room.nightActions.piedPiperTargets)) {
            room.nightActions.piedPiperTargets = room.nightActions.piedPiperTargets.map(replaceOldId);
          }
          if (room.nightActions.seerCheck) {
            room.nightActions.seerCheck = {
              seerId: replaceOldId(room.nightActions.seerCheck.seerId),
              targetId: replaceOldId(room.nightActions.seerCheck.targetId),
            };
          }
          if (room.nightActions.wolfVotes instanceof Map) {
            const updatedWolfVotes = new Map();
            room.nightActions.wolfVotes.forEach((tid, wid) => {
              updatedWolfVotes.set(replaceOldId(wid), replaceOldId(tid));
            });
            room.nightActions.wolfVotes = updatedWolfVotes;
          }
          if (room.nightActions.wolfConfirmed instanceof Set) {
            const updatedConfirmed = new Set();
            room.nightActions.wolfConfirmed.forEach((wid) => {
              updatedConfirmed.add(replaceOldId(wid));
            });
            room.nightActions.wolfConfirmed = updatedConfirmed;
          }
        }

        if (room.dayVotes instanceof Map) {
          const updatedDayVotes = new Map();
          room.dayVotes.forEach((tid, vid) => {
            updatedDayVotes.set(replaceOldId(vid), tid === 'skip' ? 'skip' : replaceOldId(tid));
          });
          room.dayVotes = updatedDayVotes;
        }

        // Cập nhật seerHistory nếu mục tiêu đã soi tải lại trang
        if (room.seerHistory) {
          oldIds.forEach((oldId) => {
            if (oldId !== socket.id && room.seerHistory[oldId]) {
              room.seerHistory[socket.id] = room.seerHistory[oldId];
              delete room.seerHistory[oldId];
            }
          });
        }

        // Khôi phục trạng thái bị Thôi Miên
        const wasCharmed = Boolean(
          existingPlayer.charmed ||
          (room.charmedPlayers && oldIds.some((id) => room.charmedPlayers.has(id)))
        );

        if (wasCharmed) {
          if (!room.charmedPlayers) room.charmedPlayers = new Set();
          oldIds.forEach((id) => room.charmedPlayers.delete(id));
          room.charmedPlayers.add(socket.id);
          existingPlayer.charmed = true;
        }

        // Cập nhật charmedHistory nếu nạn nhân có trong history của Người Thổi Sáo
        if (room.charmedHistory) {
          oldIds.forEach((oldId) => {
            if (oldId !== socket.id && room.charmedHistory[oldId]) {
              room.charmedHistory[socket.id] = room.charmedHistory[oldId];
              delete room.charmedHistory[oldId];
            }
          });
        }

        // Nếu người reconnect chính là Người Thổi Sáo -> khôi phục charmedHistory cho họ
        const piperHistory = existingPlayer.role === ROLES.PIED_PIPER ? (room.charmedHistory || {}) : {};

        // Khôi phục dữ liệu Cặp Đôi (cho thành viên Cặp Đôi, Cupid hoặc khi kết thúc trận)
        const canSeeCouple =
          (Array.isArray(room.couple) && room.couple.includes(socket.id)) ||
          existingPlayer.role === ROLES.CUPID ||
          room.phase === PHASES.GAME_OVER;
        const coupleData = (canSeeCouple && Array.isArray(room.couple))
          ? room.couple
              .map((id) => room.players.get(id))
              .filter(Boolean)
              .map((p) => ({
                id: p.id,
                name: p.name,
                avatar: p.avatar,
                avatarColor: p.avatarColor,
                role: p.role,
              }))
          : [];

        // Nếu người reconnect thuộc Cặp Đôi, đồng bộ lại couple-formed cho đối phương để cập nhật socket.id mới
        if (Array.isArray(room.couple) && room.couple.includes(socket.id)) {
          room.couple.forEach((loverId) => {
            io.to(loverId).emit('couple-formed', { couple: coupleData });
          });
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
          poisonedPlayer: room.poisonedThisNight ? room.players.get(room.poisonedThisNight) : null,
          shieldClashPlayer: room.shieldClashThisNight ? room.players.get(room.shieldClashThisNight) : null,
          witchSavedPlayer: room.witchSavedThisNight ? room.players.get(room.witchSavedThisNight) : null,
          savedPlayer: (room.nightActions && room.nightActions.wasProtected && room.savedThisNight) ? room.players.get(room.savedThisNight) : null,
          wasProtected: Boolean(room.nightActions && room.nightActions.wasProtected),
          lastProtectedTarget: room.nightActions ? room.nightActions.lastProtectedTarget : null,
          witchState: existingPlayer.role === ROLES.WITCH ? (existingPlayer.witchState || { hasHeal: true, hasPoison: true }) : undefined,
          hunter: (room.phase === PHASES.HUNTER_SHOT && room.hunterShotContext)
            ? room.players.get(room.hunterShotContext.hunterId) || null
            : null,
          seerHistory: existingPlayer.role === ROLES.SEER ? (room.seerHistory || {}) : {},
          charmedHistory: piperHistory,
          charmCountRequired: existingPlayer.role === ROLES.PIED_PIPER ? (room.settings.piedPiperCharmCount || 2) : 2,
          couple: coupleData,
          matchHistory: room.matchHistory || [],
          reconnectToken: existingPlayer.reconnectToken,
        });

        // Gửi players-update riêng cho từng người chơi để bảo toàn hiển thị Role của Người Yêu & Đồng Đội Sói!
        room.players.forEach((_, pid) => {
          io.to(pid).emit('players-update', {
            players: getPlayersData(room, pid),
            hostId: room.hostId,
          });
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
    rateLimiter.clearScope(socket.id);
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
    const exitingPlayer = room.players.get(socket.id);
    const exitingPlayerSnapshot = exitingPlayer ? { ...exitingPlayer } : null;

    socket.leave(room.code);
    const updatedRoom = leaveRoom(room.code, socket.id);
    socket.roomCode = null;

    if (updatedRoom) {
      if (wasInGame) {
        io.to(room.code).emit('player-left', { hostId: updatedRoom.hostId });
        handleMidGameExit(updatedRoom, socket.id, exitingPlayerSnapshot);
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

    // Dọn sạch toàn bộ phase timer + pending setTimeout của ván cũ
    clearAllRoomTimers(room);

    // Reset trạng thái phòng về WAITING
    room.phase = PHASES.WAITING;
    room.round = 0;
    room.couple = null;
    room.cupidActed = false;
    room.hunterShotContext = null;
    room.deadThisNight = null;
    room.poisonedThisNight = null;
    room.shieldClashThisNight = null;
    room.attackedThisNight = null;
    room.savedThisNight = null;
    room.witchSavedThisNight = null;
    room.seerHistory = {};
    room.charmedPlayers = new Set();
    room.charmedHistory = {};
    room.matchHistory = [];
    room.charmedThisNightNames = [];
    room.seerCheckedThisNight = null;
    room.messages = [];
    room.nightActions = {
      wolfVotes: new Map(),
      wolfConfirmed: new Set(),
      seerCheck: null,
      bodyguardTarget: null,
      lastProtectedTarget: null,
      witchSavedThisNight: false,
      witchPoisonTarget: null,
      piedPiperTargets: [],
      wasProtected: false,
    };
    room.dayVotes.clear();

    // Reset trạng thái từng người chơi
    room.players.forEach((p) => {
      p.alive = true;
      p.role = null;
      p.charmed = false;
      p.witchState = { hasHeal: true, hasPoison: true };
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

function startServer(port = PORT) {
  return new Promise((resolve) => {
    server.listen(port, () => {
      const actualPort = server.address()?.port || port;
      if (require.main === module) {
        console.log('');
        console.log('🐺 ================================');
        console.log(`🐺  Ma Sói Server - Port ${actualPort}`);
        console.log('🐺 ================================');
        console.log('');
      }
      resolve({ server, io, app, port: actualPort });
    });
  });
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = { app, server, io, startServer };
