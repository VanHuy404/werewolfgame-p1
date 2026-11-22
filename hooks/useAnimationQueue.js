// ============================================
// 🎬 MA SÓI - useAnimationQueue Hook
// Hàng đợi tuần tự cho các Modal hoạt ảnh điện ảnh
// Đảm bảo không bao giờ 2 modal đè lên nhau khi mở rộng thêm 15-20+ vai trò
// ============================================

import { useState, useCallback, useRef } from 'react';

/**
 * Quản lý hàng đợi phát tuần tự các hoạt ảnh (modal) trên Client.
 * Mỗi item trong hàng đợi có dạng: { type: string, payload?: Object, id?: string }
 */
export default function useAnimationQueue() {
  const [queue, setQueue] = useState([]);
  const idCounterRef = useRef(0);

  /** Thêm 1 hoặc nhiều hoạt ảnh vào cuối hàng đợi */
  const enqueue = useCallback((items) => {
    const list = Array.isArray(items) ? items : [items];
    const valid = list
      .filter((item) => item && item.type)
      .map((item) => ({
        ...item,
        id: item.id || `anim_${++idCounterRef.current}`,
      }));

    if (valid.length === 0) return;
    setQueue((prev) => [...prev, ...valid]);
  }, []);

  /** Hoàn tất hoạt ảnh đang phát ở đầu hàng đợi và chuyển sang hoạt ảnh kế tiếp */
  const dequeue = useCallback(() => {
    setQueue((prev) => (prev.length > 0 ? prev.slice(1) : prev));
  }, []);

  /** Xóa toàn bộ hàng đợi (dùng khi kết thúc ván hoặc quay về sảnh) */
  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const currentAnimation = queue.length > 0 ? queue[0] : null;

  return {
    currentAnimation,
    queueLength: queue.length,
    isPlaying: queue.length > 0,
    enqueue,
    dequeue,
    clearQueue,
  };
}
