// ============================================
// 🗄️ MA SÓI - RoomStore Abstraction
// Lớp trừu tượng lưu trữ phòng chơi (hiện tại chạy In-Memory Map,
// thiết kế sẵn interface để nâng cấp sang Redis / Database mà không sửa gameLogic)
// ============================================

class InMemoryRoomStore {
  constructor() {
    this._rooms = new Map();
  }

  get(code) {
    return this._rooms.get(code);
  }

  set(code, room) {
    this._rooms.set(code, room);
    return this;
  }

  has(code) {
    return this._rooms.has(code);
  }

  delete(code) {
    return this._rooms.delete(code);
  }

  values() {
    return this._rooms.values();
  }

  entries() {
    return this._rooms.entries();
  }

  [Symbol.iterator]() {
    return this._rooms[Symbol.iterator]();
  }

  get size() {
    return this._rooms.size;
  }

  clear() {
    this._rooms.clear();
  }

  /** Thống kê vận hành trực tiếp cho endpoint /api/health & giám sát production */
  getStats() {
    let onlinePlayers = 0;
    let activeGames = 0;
    let waitingRooms = 0;

    for (const room of this._rooms.values()) {
      onlinePlayers += room.players ? room.players.size : 0;
      if (room.phase === 'waiting') waitingRooms++;
      else if (room.phase !== 'game_over') activeGames++;
    }

    return {
      activeRooms: this._rooms.size,
      waitingRooms,
      activeGames,
      onlinePlayers,
    };
  }
}

const roomStore = new InMemoryRoomStore();

module.exports = {
  InMemoryRoomStore,
  roomStore,
};
