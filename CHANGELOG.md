# 🐺 CHANGELOG - MA SÓI REAL-TIME GAME

Tất cả các thay đổi, cập nhật kiến trúc và tính năng của dự án được ghi chép đầy đủ tại đây.

---

## [1.4.0] - 2026-10-22

### 🎮 Cập Nhật Quy Tắc & Logic Trò Chơi
- **Cài đặt phòng tính theo số người tham gia thực tế:** Số lượng Dân Làng và phân bổ vai trò được tính toán tự động dựa trên số người đang có trong phòng (`participants`), loại bỏ phụ thuộc vào mức max cố định.
- **Không giới hạn số lượng người tham gia:** Bỏ giới hạn tối đa người chơi, phòng nhận không giới hạn thành viên tham gia, xóa bỏ các giới hạn min - max.
- **Thời gian Sói săn mồi 1 phút 30 giây (90s):** Điều chỉnh thời gian đêm Sói về đúng 1p30s.
- **Cơ chế chọn mồi & Chốt của Sói:** 
  - Sói có thể tự do bấm chọn hoặc đổi mục tiêu sang người khác bất cứ lúc nào (như cơ chế checkbox/radio).
  - Nút "Chốt mục tiêu cắn" chỉ kích hoạt khi tất cả Sói còn sống đều đã chọn mồi.
  - Sau khi đã chốt, Sói vẫn có thể bấm người khác để đổi mồi (hệ thống sẽ tự hủy chốt và cho phép chốt lại).
- **Rút ngắn thời gian Tiên Tri còn 5s sau khi soi:** Ngay khi Tiên Tri nhận kết quả soi, đồng hồ đếm ngược tự động chuyển về 5 giây để xem kết quả trước khi trời sáng.

### 🎨 Cập Nhật Giao Diện (UPDATE UI)
- **UPDATE UI: Khung chat kéo xuống hết bên phải (ChatBox):** Nâng cấp thanh chat cạnh phải tràn 100% chiều cao màn hình, danh sách tin nhắn cuộn trọn vẹn và ô nhập tin nhắn ghim sát góc dưới bên phải.
- **UPDATE UI: Cài đặt phòng & Sảnh chờ (RoomSettings & LobbyScreen):** Xóa bỏ các nhãn `Min - Max`, hiển thị số lượng người tham gia thực tế, bỏ các ô slot trống `⏳ Chờ vào...`.
- **UPDATE UI: Checkbox chọn mục tiêu (GameScreen):** Bổ sung huy hiệu checkbox `☑️ / ⬜` trực quan trên từng ô thẻ người chơi trong các pha Bỏ phiếu ban ngày và Sói cắn ban đêm.
- **UPDATE UI: Bảng điều khiển Sói săn mồi (GameScreen):** Bổ sung thanh trạng thái tiến độ đàn Sói và nút `🎯 CHỐT MỤC TIÊU CẮN` / `✅ BẠN ĐÃ CHỐT (Bấm để đổi mồi)`.
- **UPDATE UI: Màn hình kết thúc trận riêng biệt (GameOverScreen):** Chuyển màn hình Game Over thành 1 trang độc lập riêng biệt, khóa hoàn toàn mọi thao tác vào ván đấu cũ, hiển thị hoành tráng biểu tượng chiến thắng, lý do thắng cuộc, bảng danh tính tất cả người chơi và các nút điều hướng.

---

## [1.3.0] - 2026-10-22

### 🎮 Cập Nhật Quy Tắc & Logic Trò Chơi
- **Nạn nhân Sói cắn chỉ chết khi trời sáng:** Khi Sói cắn người trong đêm, người chơi vẫn giữ trạng thái sống suốt đêm (Tiên Tri vẫn có thể soi) và chỉ chính thức bị loại khi bước vào pha thông báo trời sáng (`day_announce`).
- **Giữ bí mật thân phận (Không tiết lộ vai trò):** Khi người chơi bị giết trong đêm hoặc bị treo cổ vào ban ngày, thông báo loại bỏ không còn tiết lộ vai trò (`role`) của họ, đảm bảo tính ẩn danh và suy đoán chiến thuật.
- **Khóa chat Hang Sói trong giờ Bầu Cử:** Kênh chat Sói (`Hang Sói`) tự động bị khóa và chặn gửi tin nhắn khi bước vào pha Bỏ Phiếu (`day_vote`), chỉ mở lại trong các pha thảo luận hoặc ban đêm.

### 🎨 Cập Nhật Giao Diện (UPDATE UI)
- **UPDATE UI: Bố cục thanh chat & Màn hình trận đấu (GameScreen):** Chuyển thanh chat cố định sang cạnh phải khung hình (desktop split-screen layout) giúp người chơi vừa theo dõi danh sách người chơi, vừa nhắn tin thảo luận tiện lợi.
- **UPDATE UI: Thẻ người chơi dạng hộp (Discord-style tiles):** Thiết kế lại ô người chơi theo phong cách Discord voice box với khung viền kính mờ, trạng thái kết nối, tên người chơi và huy hiệu chủ phòng nổi bật.
- **UPDATE UI: Hình nền ngôi làng ma sói (Village Background):** Thay nền đen đơn điệu bằng hình nền ngôi làng huyền bí ban đêm trong sương mờ (`village_bg.jpg`) phủ lớp kính mờ dark glassmorphism.
- **UPDATE UI: Hiển thị lượt vote dưới Avatar:** Hiển thị trực tiếp huy hiệu số lượt vote và avatar các người bầu chọn ngay bên dưới avatar người bị vote trong thời gian thực (cả khi Sói cắn đêm và Dân Làng bỏ phiếu ngày).
- **UPDATE UI: Hoạt ảnh Tiên Tri huyền bí (Seer Animation):** Nâng cấp quả cầu ma thuật phát sáng nhịp nhàng, hiệu ứng hào quang soi sáng quanh avatar mục tiêu và thẻ kết quả soi (Thiện / Ác) với hiệu ứng thị giác ma thuật ấn tượng.

---

## [1.2.0] - 2026-10-22

### 🎮 Cập Nhật Tính Năng & Quy Tắc Trò Chơi (Game Rules & Features)
- **Quay về phòng chờ khi kết thúc game:** Bấm "Trở về phòng chờ" ở màn hình Game Over sẽ đưa tất cả người chơi trong phòng quay lại LobbyScreen (`waiting`), giữ nguyên mã phòng, danh sách người chơi, avatar và cài đặt vai trò thay vì thoát về màn hình chính.
- **Thời gian Sói 2 phút & Nút xác nhận:** 
  - Tăng thời gian Sói chọn mục tiêu lên 120 giây (2 phút).
  - Bổ sung nút xác nhận mục tiêu cho Sói. Nếu tất cả Sói còn sống cùng xác nhận, lượt đêm sẽ tự động chuyển tiếp nhanh mà không cần chờ hết 2 phút.
- **Kênh chat riêng cho Sói:** Sói có phòng chat riêng (Hang Sói) để trò chuyện bí mật bất cứ lúc nào (cả ban đêm, ban ngày, lúc đang họp/thảo luận hay bỏ phiếu).
- **Thứ tự lượt Tiên Tri:** Tiên Tri chỉ thức dậy sau khi Sói đã cắn xong.
- **Tiên Tri chỉ biết Thiện hoặc Ác:** Kết quả soi chỉ hiển thị thuộc `PHE ÁC` hay `PHE THIỆN`, không tiết lộ chức năng/vai trò cụ thể của mục tiêu.
- **Quy tắc cắn của Sói:** Người bị cắn phải là người có số vote cao nhất. Nếu số phiếu bằng nhau (hòa phiếu) hoặc không ai vote thì coi như không ai chết đêm đó.
- **Cố định cổng Local Web (Port 8081):** Cấu hình script `npm run web` luôn cố định chạy cổng `8081` (`--port 8081`), tránh tình trạng tự động nhảy sang 8082, 8083... Đồng thời bổ sung lệnh `npm run clean` để giải phóng port khi bị kẹt.

### 🎨 Cập Nhật Giao Diện (UPDATE UI)
- **UPDATE UI: Phòng chờ (LobbyScreen) & Khởi động game:** Sửa logic nút bắt đầu: cho phép bắt đầu ngay khi đủ tối thiểu 4 người chơi hoặc đủ số người của phòng. Tự động cân bằng số Sói (1 Sói cho bàn 4 người) tránh lỗi cấu hình vai trò.
- **UPDATE UI: Màn hình chính (HomeScreen):** Đặt ô nhập mã phòng trực tiếp vào giữa 2 nút "Tạo Phòng Mới" và "Vào Phòng", loại bỏ chuyển màn hình phụ khi vào phòng.
- **UPDATE UI: Nút kết thúc trận (GameScreen):** Nút "Trở về phòng chờ" điều hướng mượt mà về LobbyScreen cho toàn bộ phòng.
- **UPDATE UI: Bảng hành động Sói (GameScreen):** Thêm nút `🐺 Xác Nhận Cắn: [Tên mục tiêu]` và badge `✅ Đã xác nhận cắn`, hiển thị trạng thái vote & xác nhận của các đồng đội Sói.
- **UPDATE UI: Khung chat (ChatBox):** Thêm thanh chuyển đổi 2 kênh `💬 Chat Làng` và `🐺 Hang Sói (Bí Mật)` có chấm đỏ thông báo tin chưa đọc dành riêng cho phe Sói.
- **UPDATE UI: Avatar người chơi (PlayerAvatar):** Bổ sung hiệu ứng hào quang pha lê tỏa sáng (`isIlluminated`) khi avatar được Tiên Tri soi trong đêm.
- **UPDATE UI: Pop-up kết quả Tiên Tri (GameScreen):** Thêm Modal pop-up thông báo thân phận nổi bật với 2 phong cách:
  - `PHE ÁC 🐺`: Ánh sáng đỏ thẫm u tối, cảnh báo nguy hiểm.
  - `PHE THIỆN 🕊️`: Ánh sáng xanh ngọc/vàng kim phát sáng thuần khiết.

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

Dự án gồm **2 phần** cần chạy song song trong 2 cửa sổ Terminal:

### 1. Khởi động Backend Server (Socket.io)
Mở Terminal thứ nhất và chạy:
```powershell
cd "d:\code game\Werewolfdemo\server"
node index.js
# Server sẽ lắng nghe tại cổng http://localhost:3001
```

### 2. Khởi động Giao diện Web (Expo Frontend)
Mở Terminal thứ hai và chạy:
```powershell
cd "d:\code game\Werewolfdemo"
npm run web
# Mở trình duyệt tại http://localhost:8081 để trải nghiệm!
```
*(Hoặc dùng lệnh `npx expo start --web`)*

---

### 💡 Hướng Dẫn Chơi Thử Nghiệm:
- **Chơi thử nhiều người trên cùng máy:** Mở `http://localhost:8081` trên nhiều tab trình duyệt hoặc các cửa sổ ẩn danh khác nhau. Tab đầu tiên bấm **"Tạo Phòng"**, copy mã code sang các tab khác bấm **"Vào Phòng"**.
- **Chơi qua điện thoại cùng mạng Wi-Fi (LAN):** Mở file [`utils/socket.js`](file:///d:/code%20game/Werewolfdemo/utils/socket.js), đổi `localhost` thành địa chỉ IP máy tính của bạn (ví dụ: `http://192.168.1.xxx:3001`). Sau đó trên điện thoại truy cập vào `http://192.168.1.xxx:8081`.
- **Tắt tất cả tiến trình Node chạy ngầm:** Chạy lệnh `npm run kill:node` hoặc lệnh hệ thống `taskkill /F /IM node.exe`.
