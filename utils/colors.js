// ============================================
// 🐺 MA SÓI - Bảng màu & Style Tokens
// ============================================

export const COLORS = {
  // Primary
  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  primaryLight: '#A78BFA',

  // Secondary
  secondary: '#F59E0B',
  secondaryDark: '#D97706',
  secondaryLight: '#FCD34D',

  // Night theme
  nightBg: '#0f0a2e',
  nightBg2: '#1a1145',
  nightAccent: '#533483',
  nightText: '#E2E8F0',
  nightCard: 'rgba(42, 27, 100, 0.85)',

  // Day theme
  dayBg: '#FEF9EF',
  dayBg2: '#FFF8E1',
  dayAccent: '#FF9800',
  dayText: '#1F2937',
  dayCard: 'rgba(255, 255, 255, 0.95)',

  // Vai trò
  wolf: '#DC2626',
  wolfBg: '#FEE2E2',
  seer: '#3B82F6',
  seerBg: '#DBEAFE',
  bodyguard: '#0EA5E9',
  bodyguardBg: '#E0F2FE',
  villager: '#10B981',
  villagerBg: '#D1FAE5',

  // Neutral
  white: '#FFFFFF',
  black: '#1F2937',
  gray: '#9CA3AF',
  grayLight: '#F3F4F6',
  grayMedium: '#D1D5DB',
  grayDark: '#4B5563',

  // State
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Card
  cardBg: '#FFFFFF',
  cardShadow: 'rgba(0, 0, 0, 0.1)',
};

/** Lấy màu nền theo role */
export function getRoleColor(role) {
  switch (role) {
    case 'wolf': return COLORS.wolf;
    case 'seer': return COLORS.seer;
    case 'bodyguard': return COLORS.bodyguard;
    case 'villager': return COLORS.villager;
    default: return COLORS.gray;
  }
}

/** Lấy tên tiếng Việt theo role */
export function getRoleName(role) {
  switch (role) {
    case 'wolf': return 'Sói';
    case 'seer': return 'Tiên Tri';
    case 'bodyguard': return 'Bảo Vệ';
    case 'villager': return 'Dân Làng';
    default: return '???';
  }
}

/** Lấy emoji theo role */
export function getRoleEmoji(role) {
  switch (role) {
    case 'wolf': return '🐺';
    case 'seer': return '🔮';
    case 'bodyguard': return '🛡️';
    case 'villager': return '🧑‍🌾';
    default: return '❓';
  }
}
