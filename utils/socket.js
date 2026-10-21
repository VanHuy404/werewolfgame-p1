// ============================================
// 🐺 MA SÓI - Socket Connection Helper
// ============================================

import { io } from 'socket.io-client';
import { Platform } from 'react-native';

// Cấu hình URL server
// - Web: dùng localhost
// - Mobile: đổi thành IP máy tính của bạn (ví dụ: 192.168.1.100)
const SERVER_URL = Platform.select({
  web: 'http://localhost:3001',
  default: 'http://localhost:3001', // ← Đổi thành IP LAN nếu test trên điện thoại
});

/** Tạo kết nối socket */
export function createSocket() {
  const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('✅ Đã kết nối server:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.log('❌ Lỗi kết nối:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Mất kết nối:', reason);
  });

  return socket;
}

export { SERVER_URL };
