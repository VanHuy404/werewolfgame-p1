// ============================================
// 🔐 MA SÓI - Security, Rate Limiting & Input Validation
// Bảo mật kết nối, chống chiếm chỗ Reconnect (Token bí mật),
// chống spam Socket events & kiểm soát kích thước dữ liệu đầu vào
// ============================================

const crypto = require('crypto');

const MAX_MESSAGE_LENGTH = 300;
const MAX_PLAYER_NAME_LENGTH = 20;
const MAX_AVATAR_EMOJI_LENGTH = 16; // Chỉ hỗ trợ các icon/emoji có sẵn (không lưu ảnh từ máy)

/**
 * Tạo token bí mật ngẫu nhiên (48 ký tự hex) dùng để xác thực Reconnect
 * Ngăn chặn kẻ xấu giả tên người chơi bị rớt mạng để chiếm quyền điều khiển vai trò
 */
function generateReconnectToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * So sánh token theo thời gian hằng số (timing-safe) để chống timing attack
 * @param {string|null|undefined} expectedToken
 * @param {string|null|undefined} providedToken
 * @returns {boolean}
 */
function verifyReconnectToken(expectedToken, providedToken) {
  if (!expectedToken || !providedToken) return false;
  if (typeof expectedToken !== 'string' || typeof providedToken !== 'string') return false;
  const bufA = Buffer.from(expectedToken, 'utf8');
  const bufB = Buffer.from(providedToken, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Làm sạch và giới hạn độ dài tin nhắn chat
 * @param {*} raw
 * @returns {string}
 */
function sanitizeMessage(raw) {
  if (typeof raw !== 'string') return '';
  // Loại bỏ các ký tự điều khiển vô hình (trừ xuống dòng/khoảng trắng)
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

/**
 * Làm sạch tên người chơi
 * @param {*} raw
 * @param {string} [fallback]
 * @returns {string}
 */
function sanitizePlayerName(raw, fallback = 'Dân Làng') {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, MAX_PLAYER_NAME_LENGTH);
  return cleaned || fallback;
}

/**
 * Kiểm tra tính hợp lệ của avatar — chỉ hỗ trợ các icon/emoji có sẵn (từ chối ảnh base64/URL)
 * @param {*} avatar
 * @returns {{ valid: boolean, error?: string }}
 */
function validateAvatarPayload(avatar) {
  if (avatar === null || avatar === undefined || avatar === '') {
    return { valid: true };
  }
  if (typeof avatar !== 'string') {
    return { valid: false, error: 'Định dạng biểu tượng đại diện không hợp lệ!' };
  }
  const trimmed = avatar.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.length > MAX_AVATAR_EMOJI_LENGTH
  ) {
    return {
      valid: false,
      error: 'Hệ thống chỉ hỗ trợ các biểu tượng (icon) có sẵn làm ảnh đại diện!',
    };
  }
  return { valid: true };
}

/**
 * Cấu hình CORS an toàn: đọc danh sách origin từ biến môi trường ALLOWED_ORIGINS (khi lên production),
 * mặc định '*' khi phát triển nội bộ.
 */
function getCorsOrigin() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw || !raw.trim()) return '*';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : '*';
}

/**
 * Bộ giới hạn tần suất (Sliding-Window Rate Limiter) cho Socket events
 * Ngăn spam chat, spam vote, spam tạo phòng làm quá tải CPU/RAM server
 */
function createRateLimiter() {
  /** Map<key, number[]> - key dạng `${scopeId}:${eventName}` -> danh sách timestamps */
  const buckets = new Map();

  const DEFAULT_RULES = {
    'send-message': { max: 5, windowMs: 3000 },
    'create-room': { max: 5, windowMs: 60000 },
    'join-room': { max: 10, windowMs: 30000 },
    'day-vote': { max: 10, windowMs: 5000 },
    'wolf-vote': { max: 10, windowMs: 5000 },
    'reconnect-room': { max: 8, windowMs: 30000 },
  };

  /**
   * Kiểm tra xem `scopeId` có được phép gọi `eventName` không
   * @param {string} scopeId - socket.id hoặc IP
   * @param {string} eventName
   * @param {{ max?: number, windowMs?: number }} [customRule]
   * @returns {{ allowed: boolean, retryAfterMs?: number }}
   */
  function check(scopeId, eventName, customRule) {
    const rule = customRule || DEFAULT_RULES[eventName];
    if (!rule) return { allowed: true };

    const now = Date.now();
    const key = `${scopeId}:${eventName}`;
    const timestamps = buckets.get(key) || [];

    // Giữ lại các request còn nằm trong cửa sổ thời gian
    const cutoff = now - rule.windowMs;
    const recent = timestamps.filter((t) => t > cutoff);

    if (recent.length >= rule.max) {
      const oldest = recent[0];
      buckets.set(key, recent);
      return {
        allowed: false,
        retryAfterMs: Math.max(100, oldest + rule.windowMs - now),
      };
    }

    recent.push(now);
    buckets.set(key, recent);
    return { allowed: true };
  }

  /** Dọn bộ nhớ cho 1 socket khi ngắt kết nối */
  function clearScope(scopeId) {
    const prefix = `${scopeId}:`;
    for (const key of buckets.keys()) {
      if (key.startsWith(prefix)) {
        buckets.delete(key);
      }
    }
  }

  /** Dọn toàn bộ (dùng cho test) */
  function reset() {
    buckets.clear();
  }

  return {
    check,
    clearScope,
    reset,
    DEFAULT_RULES,
  };
}

module.exports = {
  MAX_MESSAGE_LENGTH,
  MAX_PLAYER_NAME_LENGTH,
  MAX_AVATAR_EMOJI_LENGTH,
  generateReconnectToken,
  verifyReconnectToken,
  sanitizeMessage,
  sanitizePlayerName,
  validateAvatarPayload,
  getCorsOrigin,
  createRateLimiter,
};
