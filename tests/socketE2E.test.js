// ============================================
// 🌐 MA SÓI - Socket.io & HTTP E2E Integration Test Suite
// Khởi chạy Server thật trên port ngẫu nhiên, kết nối nhiều socket.io-client thật
// Kiểm thử toàn trình: /api/health, Tạo/Vào phòng, Chặn ảnh Base64, Rate Limit Chat,
// Chống chiếm chỗ Reconnect Token & Bắt đầu trận đấu 4 người thật!
// ============================================

const assert = require('assert');
const http = require('http');
const { io: Client } = require('socket.io-client');
const { startServer } = require('../server/index');
const { roomStore } = require('../server/roomStore');
const { clearAllRoomTimers } = require('../server/timerManager');

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(body) });
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function waitForEvent(socket, event, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout chờ sự kiện "${event}" sau ${timeoutMs}ms`));
    }, timeoutMs);
    const handler = (data) => {
      clearTimeout(timer);
      resolve(data);
    };
    socket.once(event, handler);
  });
}

function connectClient(baseUrl) {
  return new Promise((resolve, reject) => {
    const client = Client(baseUrl, {
      transports: ['websocket'],
      reconnection: false,
    });
    const timer = setTimeout(() => reject(new Error('Timeout kết nối socket client')), 4000);
    client.once('connect', () => {
      clearTimeout(timer);
      resolve(client);
    });
    client.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function runE2E() {
  console.log('================================================================================');
  console.log('🌐 BẮT ĐẦU KIỂM THỬ TÍCH HỢP SOCKET.IO E2E THẬT (REAL SERVER + REAL CLIENTS)');
  console.log('================================================================================\n');

  const { server, io, port } = await startServer(0);
  const baseUrl = `http://127.0.0.1:${port}`;
  const clients = [];
  const passed = [];

  try {
    // [E2E-01] Health check endpoint
    const health0 = await httpGetJson(`${baseUrl}/api/health`);
    assert.strictEqual(health0.status, 200);
    assert.strictEqual(typeof health0.json.activeRooms, 'number');
    assert.strictEqual(typeof health0.json.onlinePlayers, 'number');
    assert.strictEqual(typeof health0.json.uptimeSec, 'number');
    passed.push('[E2E-01] HTTP GET /api/health trả về 200 OK kèm thông số vận hành thời gian thực');

    // [E2E-02] Tạo phòng + 3 người vào phòng (tổng 4 client thật) + nhận reconnectToken riêng
    const c1 = await connectClient(baseUrl);
    const c2 = await connectClient(baseUrl);
    const c3 = await connectClient(baseUrl);
    const c4 = await connectClient(baseUrl);
    clients.push(c1, c2, c3, c4);

    // Thử gửi ảnh Base64 -> phải bị server từ chối
    const errPromise = waitForEvent(c1, 'error-msg');
    c1.emit('create-room', {
      playerName: 'An',
      customAvatar: 'data:image/png;base64,iVBORw0KGgo=',
    });
    const base64Err = await errPromise;
    assert(base64Err.message && base64Err.message.includes('icon'));
    passed.push('[E2E-02] Chặn upload ảnh Base64 qua Socket thật — chỉ chấp nhận icon emoji có sẵn');

    // Tạo phòng hợp lệ bằng icon emoji
    const createdPromise = waitForEvent(c1, 'room-created');
    c1.emit('create-room', {
      playerName: 'An',
      customAvatar: '🐺',
      settings: { numWolves: 1, numSeers: 1, numBodyguards: 0, numWitches: 0, numHunters: 0, numPiedPipers: 0, numCupids: 0 },
    });
    const created = await createdPromise;
    const roomCode = created.roomCode;
    assert(roomCode && roomCode.length === 5);
    assert(created.reconnectToken && created.reconnectToken.length === 48);

    const joinResults = [];
    for (const [sock, name, icon] of [[c2, 'Bình', '🦊'], [c3, 'Chi', '🐱'], [c4, 'Dũng', '🐼']]) {
      const p = waitForEvent(sock, 'room-joined');
      sock.emit('join-room', { roomCode, playerName: name, customAvatar: icon });
      const res = await p;
      assert(res.reconnectToken && res.reconnectToken.length === 48);
      for (const pl of res.players) {
        assert.strictEqual(pl.reconnectToken, undefined, 'Không được lộ reconnectToken trong danh sách players');
      }
      joinResults.push(res);
    }

    const health1 = await httpGetJson(`${baseUrl}/api/health`);
    assert.strictEqual(health1.json.activeRooms, 1);
    assert.strictEqual(health1.json.onlinePlayers, 4);
    passed.push(`[E2E-03] 4 Socket Client thật tạo & vào phòng ${roomCode}, nhận token bí mật & /api/health ghi nhận 1 phòng / 4 online`);

    // [E2E-04] Rate Limit Chat thật qua Socket (5 tin OK, tin thứ 6 bị chặn)
    let receivedCount = 0;
    const onMsg = () => { receivedCount++; };
    c2.on('new-message', onMsg);
    const rateErrPromise = waitForEvent(c1, 'error-msg');
    for (let i = 1; i <= 6; i++) {
      c1.emit('send-message', { message: `Tin nhắn ${i}` });
    }
    const rateErr = await rateErrPromise;
    assert(rateErr.message && rateErr.message.includes('quá nhanh'));
    await new Promise((r) => setTimeout(r, 150));
    c2.off('new-message', onMsg);
    assert.strictEqual(receivedCount, 5, 'Chỉ đúng 5 tin nhắn đầu được phép broadcast trong cửa sổ 3s');
    passed.push('[E2E-04] Rate Limiting Chat thật qua Socket: Cho qua đúng 5 tin & chặn tin spam thứ 6');

    // [E2E-05] Chống chiếm chỗ Reconnect bằng tên: Kẻ xấu giả tên 'Bình' không có token -> bị chặn; Bình thật có token -> vào lại thành công
    const c2OldId = c2.id;
    const c2Token = joinResults[0].reconnectToken;
    c2.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    const hijacker = await connectClient(baseUrl);
    clients.push(hijacker);
    const hijackFailPromise = waitForEvent(hijacker, 'reconnect-failed');
    hijacker.emit('reconnect-room', {
      roomCode,
      playerName: 'Bình',
      oldPlayerId: c2OldId,
      reconnectToken: 'fake_hijack_token_0000000000000000000000000000',
    });
    const hijackRes = await hijackFailPromise;
    assert(hijackRes.message && hijackRes.message.includes('không hợp lệ'));

    const c2Reborn = await connectClient(baseUrl);
    clients.push(c2Reborn);
    const rebornOkPromise = waitForEvent(c2Reborn, 'room-joined');
    c2Reborn.emit('reconnect-room', {
      roomCode,
      playerName: 'Bình',
      oldPlayerId: c2OldId,
      reconnectToken: c2Token,
    });
    const rebornRes = await rebornOkPromise;
    assert.strictEqual(rebornRes.roomCode, roomCode);
    assert.strictEqual(rebornRes.players.length, 4);
    passed.push('[E2E-05] Bảo mật Reconnect thật: Chặn kẻ giả mạo tên không có token & khôi phục chuẩn cho chủ sở hữu token');

    // [E2E-06] Bắt đầu game thật với 4 client -> mỗi người chỉ thấy vai trò của chính mình
    const activePlayers = [c1, c2Reborn, c3, c4];
    const startPromises = activePlayers.map((s) => waitForEvent(s, 'game-started'));
    c1.emit('start-game');
    const startedPayloads = await Promise.all(startPromises);

    const assignedRoles = startedPayloads.map((p) => p.role);
    assert.strictEqual(assignedRoles.filter((r) => r === 'wolf').length, 1);
    assert.strictEqual(assignedRoles.filter((r) => r === 'seer').length, 1);
    assert.strictEqual(assignedRoles.filter((r) => r === 'villager').length, 2);

    // Kiểm tra chống lộ role trên từng client
    startedPayloads.forEach((payload, idx) => {
      const mySocketId = activePlayers[idx].id;
      for (const pl of payload.players) {
        if (pl.id !== mySocketId) {
          assert.strictEqual(pl.role, null, 'Người chơi không được nhìn thấy vai trò của người khác khi bắt đầu game');
        }
      }
    });
    passed.push('[E2E-06] Bắt đầu ván đấu thật 4 client: Phân vai chuẩn xác (1 Sói, 1 Tiên Tri, 2 Dân) & bảo mật 100% vai trò');

    for (const item of passed) {
      console.log(`   ✔ ${item}`);
    }
    console.log('\n================================================================================');
    console.log(`🎉 KẾT QUẢ E2E: TẤT CẢ ${passed.length}/${passed.length} BÀI TEST SOCKET.IO THẬT ĐỀU PASS 100%!`);
    console.log('================================================================================');
  } finally {
    // Dọn sạch toàn bộ client, timer và tắt server không để treo process
    for (const room of roomStore.values()) {
      clearAllRoomTimers(room);
    }
    roomStore.clear();
    for (const c of clients) {
      if (c && c.connected) c.disconnect();
    }
    await new Promise((resolve) => io.close(() => server.close(() => resolve())));
  }
}

runE2E()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ E2E TEST FAILED:', err);
    process.exit(1);
  });
