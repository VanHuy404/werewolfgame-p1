// ============================================
// 🐺 MA SÓI - Socket Connection Helper
// ============================================

import { io } from 'socket.io-client';
import { Platform } from 'react-native';

// Cấu hình URL server:
// Tự động nhận diện: nếu chạy Expo dev (port 8081) -> port 3001
// Khi chạy production / deploy online (Render, Railway, v.v.) -> dùng chính window.location.origin
const getBackendUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    if (window.location.port === '8081') {
      return `http://${window.location.hostname}:3001`;
    }
    return window.location.origin;
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
