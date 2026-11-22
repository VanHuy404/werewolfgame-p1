// ============================================
// ⏱️ MA SÓI - Centralized Room Timer Manager
// Quản lý tập trung toàn bộ setInterval & setTimeout của mỗi phòng
// Triệt tiêu hoàn toàn "timer ma" khi kết thúc ván, về sảnh hoặc xóa phòng
// ============================================

/**
 * Đảm bảo room có các trường quản lý timer hợp lệ
 * @param {Object} room
 */
function ensureTimerState(room) {
  if (!room) return;
  if (!(room.pendingTimers instanceof Set)) {
    room.pendingTimers = new Set();
  }
  if (typeof room.matchGeneration !== 'number') {
    room.matchGeneration = 0;
  }
}

/**
 * Dừng timer đếm ngược pha hiện tại (setInterval)
 * @param {Object} room
 */
function clearPhaseTimer(room) {
  if (!room) return;
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }
  room.phaseEndsAt = null;
}

/**
 * Bắt đầu đếm ngược cho 1 pha, đồng thời gửi kèm phaseEndsAt timestamp
 * @param {Object} io - Socket.io server instance
 * @param {Object} room
 * @param {number} duration - Thời gian (giây)
 * @param {Function} onComplete - Callback khi hết giờ
 */
function startPhaseTimer(io, room, duration, onComplete) {
  if (!room || room.destroyed) return;
  ensureTimerState(room);
  clearPhaseTimer(room);

  const capturedGeneration = room.matchGeneration;
  const safeDuration = Math.max(0, Math.floor(duration));
  room.timeLeft = safeDuration;
  room.phaseEndsAt = Date.now() + safeDuration * 1000;

  if (io && room.code) {
    io.to(room.code).emit('timer-update', {
      timeLeft: room.timeLeft,
      phaseEndsAt: room.phaseEndsAt,
    });
  }

  if (safeDuration === 0) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }

  room.timer = setInterval(() => {
    if (room.destroyed || room.matchGeneration !== capturedGeneration) {
      clearPhaseTimer(room);
      return;
    }

    room.timeLeft--;
    if (io && room.code) {
      io.to(room.code).emit('timer-update', {
        timeLeft: room.timeLeft,
        phaseEndsAt: room.phaseEndsAt,
      });
    }

    if (room.timeLeft <= 0) {
      clearPhaseTimer(room);
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }
  }, 1000);
}

/**
 * Lên lịch một tác vụ trì hoãn (setTimeout) gắn với vòng đời của ván đấu hiện tại.
 * Tự động hủy nếu phòng bị xóa, kết thúc ván hoặc reset về sảnh trước khi timer kịp chạy.
 * @param {Object} room
 * @param {Function} fn
 * @param {number} delayMs
 * @param {string} [label]
 * @returns {NodeJS.Timeout|null}
 */
function scheduleRoomTimeout(room, fn, delayMs, label = '') {
  if (!room || room.destroyed || typeof fn !== 'function') return null;
  ensureTimerState(room);

  const capturedGeneration = room.matchGeneration;
  const handle = setTimeout(() => {
    room.pendingTimers.delete(handle);
    if (room.destroyed || room.matchGeneration !== capturedGeneration) {
      return;
    }
    try {
      fn();
    } catch (err) {
      console.error(`🚨 [TimerManager] Lỗi trong timer "${label || 'anonymous'}" (Phòng ${room.code}):`, err);
    }
  }, delayMs);

  room.pendingTimers.add(handle);
  return handle;
}

/**
 * Hủy TOÀN BỘ timer (cả phase interval lẫn mọi pending setTimeout) của một phòng
 * @param {Object} room
 * @param {{ bumpGeneration?: boolean }} [options]
 * @returns {number} Số lượng pending timeout đã được dọn dẹp
 */
function clearAllRoomTimers(room, { bumpGeneration = true } = {}) {
  if (!room) return 0;
  ensureTimerState(room);

  clearPhaseTimer(room);

  let clearedCount = 0;
  for (const handle of room.pendingTimers) {
    clearTimeout(handle);
    clearedCount++;
  }
  room.pendingTimers.clear();

  if (bumpGeneration) {
    room.matchGeneration += 1;
  }

  return clearedCount;
}

/**
 * Trả về số lượng timer đang chờ của 1 phòng (dùng cho debug / unit test)
 * @param {Object} room
 */
function getActiveTimerCount(room) {
  if (!room) return 0;
  const intervalCount = room.timer ? 1 : 0;
  const timeoutCount = room.pendingTimers instanceof Set ? room.pendingTimers.size : 0;
  return intervalCount + timeoutCount;
}

module.exports = {
  ensureTimerState,
  startPhaseTimer,
  clearPhaseTimer,
  scheduleRoomTimeout,
  clearAllRoomTimers,
  getActiveTimerCount,
};
