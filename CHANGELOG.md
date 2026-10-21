# 🐺 CHANGELOG - MA SÓI REAL-TIME GAME

Tất cả các thay đổi, cập nhật kiến trúc và tính năng của dự án được ghi chép đầy đủ tại đây.

---

## [1.1.0] - 2026-10-21

### ✨ Cập Nhật & Cải Tiến Giao Diện / Tính Năng (UI/UX & Feature Enhancements)

#### 1. Màn Hình Phòng Chờ (LobbyScreen) Đẳng Cấp & Đồng Bộ
- **Bầu trời đầy sao (Starry Night Background):** Nền không gian tối `#0A0819` với 55 ngôi sao lấp lánh (twinkle animation) và 2 quầng sáng ambient glow (tím & hổ phách), mang lại cảm giác huyền bí, đồng bộ hoàn hảo với HomeScreen.
- **Mã phòng nhỏ gọn (Compact Room Code Bar):** Thay thế khối thẻ lớn cồng kềnh bằng thanh hiển thị mã phòng tinh giản, hiện đại, kèm nút sao chép nhanh có phản ứng thông minh `📋 Sao chép mã` ➔ `✅ Đã sao chép!`.
- **Nhảy sang phòng chờ ngay lập tức:** Bấm "Tạo Phòng" sẽ khởi tạo và vào phòng ngay, chủ phòng có thể bấm nút "✏️ Tùy chỉnh" ngay trong phòng chờ để điều chỉnh số lượng vai trò bất kỳ lúc nào.
- **Thẻ hiển thị thành viên:** Khung kính mờ (Glassmorphism), huy hiệu `👑 Chủ phòng` vàng nổi bật, huy hiệu `Bạn` cho bản thân và các vị trí chờ slot trống với đường viền nét đứt phát sáng.

#### 2. Hệ Thống Ảnh Đại Diện Cá Nhân (Custom Avatar & Compression)
- **Tải ảnh đại diện từ máy tính:** Người chơi có thể bấm vào khung avatar ở màn hình chính để mở file picker và chọn bất kỳ bức ảnh nào từ thiết bị.
- **Tự động nén ảnh thông minh (Canvas Compression):** Xử lý nén ảnh ngay tại trình duyệt xuống kích thước chuẩn 128x128px định dạng JPEG chất lượng cao (~10-15KB), giúp truyền tải tức thời qua Socket.io mà không gây giật lag.
- **Danh sách Avatar hoạt hình nhanh (Preset Emojis):** Cung cấp sẵn dàn avatar thú cưng siêu đáng yêu (`🐺 🦊 🐻 🐱 🐶 🦁 🐯 🐼`) để người chơi chọn nhanh nếu không muốn tải ảnh.
- **Hỗ trợ Backend Server:** Cấu hình `maxHttpBufferSize: 1e7` (10MB) cho Socket.io server nhằm đảm bảo an toàn tuyệt đối khi nhận dữ liệu ảnh đại diện.

#### 3. Chân Trang Thương Hiệu & Bản Quyền
- Bổ sung thông điệp cá tính ở chân trang cả hai màn hình:
  - `"HAVING FUN KILLING EACH OTHERS!!!"`
  - `"cre-William/Nerd/404"`

---

## [1.0.0] - 2026-10-21

### 🚀 Tính Năng Đã Hoàn Thành (Completed Features)

#### 1. Backend Server (Node.js + Express + Socket.io)
- **Kiến trúc Server:**
  - `server/index.js`: Xử lý toàn bộ socket events theo thời gian thực (tạo phòng, vào phòng, chuyển pha, cắn, soi, vote, chat, ngắt kết nối).
  - `server/gameLogic.js`: Máy trạng thái (State Machine) quản lý phòng chơi:
    - Phân chia vai trò ngẫu nhiên (Fisher-Yates shuffle).
    - Vòng lặp pha game: Ban Đêm (Night) ➔ Bình Minh (Day Announce) ➔ Thảo Luận (Day Discussion) ➔ Bỏ Phiếu Treo Cổ (Day Vote) ➔ Ban Đêm tiếp theo hoặc Kết Thúc (Game Over).
    - Tính toán mục tiêu bị Sói tiêu diệt và Dân làng biểu quyết loại bỏ.
    - Kiểm tra điều kiện thắng (Win Conditions): Làng thắng khi tiêu diệt hết Sói; Sói thắng khi số Sói >= số Dân còn lại.
  - `server/constants.js`: Định nghĩa các vai trò (`wolf`, `seer`, `villager`), hằng số thời gian (Night 25s, Discuss 60s, Vote 25s...), danh sách 12 avatar hoạt hình và bảng màu sắc.

#### 2. Tùy Chỉnh Cài Đặt Phòng (Room Settings System)
- **Tính năng theo yêu cầu đặc biệt:**
  - Chủ phòng có quyền tùy chỉnh:
    - Số lượng người chơi tối đa (`maxPlayers`: min 4, max 16).
    - Số lượng Ma Sói (`numWolves`: min 0).
    - Số lượng Tiên Tri (`numSeers`: min 0).
    - Tự động tính số Dân Làng (`numVillagers = maxPlayers - numWolves - numSeers`).
  - **Ràng buộc logic chặt chẽ (Validation):**
    - `numWolves < (numSeers + numVillagers)`: Số lượng Sói bắt buộc phải nhỏ hơn tổng số dân, không được lớn hơn hoặc bằng.
    - Tổng vai trò không được vượt quá số người chơi.
  - Đồng bộ real-time: Khi chủ phòng thay đổi cấu hình, toàn bộ người trong phòng chờ đều nhận được cập nhật tức thì qua event `settings-updated`.

#### 3. Frontend UI/UX (React Native / Expo + Gartic-style Cartoon)
- **Thiết kế & Giao diện:**
  - Lấy cảm hứng phong cách hoạt hình (Gartic.io), màu sắc tươi sáng, bóng đổ đậm chất game giải trí.
  - Chuyển màu nền bầu trời mượt mà giữa Đêm (tím huyền bí) và Ngày (vàng ấm áp).
- **Hệ thống Components:**
  - `components/PlayerAvatar.js`: Avatar hoạt hình kèm hiệu ứng pulse, glow khi được chọn, hiển thị trạng thái sống/chết và số phiếu bầu.
  - `components/RoomSettings.js`: Modal cài đặt số lượng người chơi & số lượng từng nhân vật cho chủ phòng kèm validation cảnh báo trực quan.
  - `components/RoleCard.js`: Thẻ lật bài hiển thị vai trò bí mật khi bắt đầu trận đấu với animation mượt mà.
  - `components/ChatBox.js`: Khung chat thời gian thực hỗ trợ 2 chế độ: Chat cộng đồng (ban ngày) và Kênh chat mật giữa bầy Sói (ban đêm).
  - `components/VotePanel.js`: Bảng biểu quyết treo cổ ban ngày, thanh đo tỉ lệ % phiếu bầu trực quan.
- **Hệ thống Màn hình (Screens):**
  - `screens/HomeScreen.js`: Nhập tên người chơi, tạo phòng mới (mở cấu hình settings), vào phòng bằng mã 5 ký tự.
  - `screens/LobbyScreen.js`: Hiển thị danh sách người chơi trong phòng dạng lưới avatar, nút sao chép mã phòng, xem/sửa cấu hình vai trò, nút bắt đầu game cho Host.
  - `screens/GameScreen.js`: Toàn bộ diễn biến trận đấu:
    - *Ban Đêm:* Giao diện hành động riêng theo vai trò (Sói chọn nạn nhân và thấy phiếu của đồng đội; Tiên Tri chọn người để soi và nhận kết quả quả cầu pha lê; Dân Làng ngủ say).
    - *Bình Minh:* Bảng thông báo nạn nhân ngã xuống trong đêm.
    - *Thảo Luận & Bỏ Phiếu:* Tranh luận và biểu quyết treo cổ kẻ tình nghi.
    - *Kết Thúc (Victory):* Vinh danh phe chiến thắng, mở toàn bộ danh tính người chơi.
  - `App.js`: Root component quản lý socket connection, state đồng bộ và điều hướng màn hình.

---

## 🛠️ Hướng Dẫn Khởi Chạy (How to Run)

### 1. Khởi động Backend Server
```bash
cd "Ma sói demo/server"
npm install
node index.js
# Server sẽ lắng nghe tại cổng http://localhost:3001
```

### 2. Khởi động Frontend App (Expo)
```bash
cd "Ma sói demo"
npm install
npm run web
# Mở trình duyệt tại http://localhost:8081 để trải nghiệm!
```
*(Để chơi đa thiết bị qua điện thoại: Trong `utils/socket.js`, thay `localhost` bằng địa chỉ IP LAN của máy tính, ví dụ `192.168.1.x`)*
