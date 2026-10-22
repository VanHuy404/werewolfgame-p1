// ============================================
// 🐺 MA SÓI - Socket Connection Helper
// ============================================

import { io } from 'socket.io-client';
import { Platform } from 'react-native';

// Cấu hình URL server:
// Tự động nhận diện hostname trên Web (localhost hoặc IP LAN)
const getBackendUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
};

const SERVER_URL = getBackendUrl();

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
