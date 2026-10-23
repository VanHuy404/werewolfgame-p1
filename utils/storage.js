// ============================================
// 🐺 MA SÓI - Session Storage Helper
// Lưu trữ dữ liệu phiên (tên, avatar, phòng đang tham gia)
// Dữ liệu tự động tồn tại khi F5 / rời phòng, và TỰ ĐỘNG XÓA khi đóng cửa sổ trình duyệt
// ============================================

import { Platform } from 'react-native';

const STORAGE_KEYS = {
  PLAYER_NAME: 'werewolf_session_player_name',
  PLAYER_AVATAR: 'werewolf_session_player_avatar',
  ACTIVE_ROOM: 'werewolf_session_active_room',
};

/** Lấy giá trị từ sessionStorage */
export function getSessionItem(key, fallback = null) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const val = window.sessionStorage.getItem(key);
      return val !== null ? val : fallback;
    } catch (e) {
      console.warn('Storage read error:', e);
      return fallback;
    }
  }
  return fallback;
}

/** Lưu giá trị vào sessionStorage */
export function setSessionItem(key, value) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      if (value === null || value === undefined) {
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  }
}

/** Xóa giá trị khỏi sessionStorage */
export function removeSessionItem(key) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage remove error:', e);
    }
  }
}

export { STORAGE_KEYS };
