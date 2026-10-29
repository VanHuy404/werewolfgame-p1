# 🐺 CHANGELOG - MA SÓI REAL-TIME GAME

Tất cả các thay đổi, cập nhật kiến trúc và tính năng của dự án được ghi chép đầy đủ tại đây.

---

## [2.0.1] - 2026-10-28

### 🎬 Hoàn Thiện Hoạt Ảnh & Trì Hoãn Xét Thắng Thua Cho Đến Khi Chiếu Xong Toàn Bộ Điện Ảnh
- **Trì hoãn xét thắng thua sau đêm ([server/index.js](file:///d:/code%20game/Werewolfdemo/server/index.js)):**
  - Gỡ bỏ lệnh `checkWinCondition` sớm ở đầu hàm `startDayAnnounce`. Trước đây khi Sói cuối cùng bị Phù Thủy ném độc chết hoặc bầy Sói cắn chết người quyết định, server lập tức kết thúc game khiến người chơi bị văng thẳng vào màn hình `GAME_OVER` mà không hề được xem các hoạt ảnh điện ảnh.
  - Chuyển `checkWinCondition` vào callback kết thúc của `startPhaseTimer`: đảm bảo toàn bộ người chơi xem trọn vẹn hoạt ảnh móng vuốt Sói, Phù Thủy hồi sinh, Khiên Bảo Vệ, và Phù Thủy ném độc (thời gian thông báo 6s nếu 1 hoạt ảnh hoặc 10s nếu nhiều hoạt ảnh tuần tự).
  - Cả phe Ma Sói lẫn phe Dân Làng đều thấy rõ chính xác ai đã bị hạ độc hay ai bị cắn chết trước khi xuất hiện bảng thông báo Chiến thắng.
- **Tuần tự hóa hoạt ảnh sáng ([screens/GameScreen.js](file:///d:/code%20game/Werewolfdemo/screens/GameScreen.js)):**
  - Ưu tiên hiển thị đòn tấn công đêm qua của Ma Sói / Hồi sinh / Bảo vệ trước.
  - Khi modal đầu tiên đóng lại, hàm `handleFirstModalClose` sẽ tự động kích hoạt tiếp hoạt ảnh Phù Thủy ném thuốc độc hoặc Xung đột Khiên & Độc.
  - Sau biểu quyết treo cổ ban ngày, tăng thời gian chờ lên 4.5s để người chơi thấy rõ hiệu ứng xử tử và số lượng Sói còn lại trước khi chuyển sang màn hình chiến thắng hoặc đêm tiếp theo.

### 🛡️ Vá Lỗi Phù Thủy Cứu Sống, Bổ Sung Kho Thuốc & Dọn Dẹp Đấu Trường
- **Khắc phục lỗi Phù Thủy chọn cứu mà nạn nhân vẫn chết ([server/index.js](file:///d:/code%20game/Werewolfdemo/server/index.js), [screens/GameScreen.js](file:///d:/code%20game/Werewolfdemo/screens/GameScreen.js)):**
  - Thêm socket event độc lập `witch-heal-action`: khi Phù Thủy bấm `🟢 CỨU SỐNG`, client phát ngay tín hiệu lên server khóa chặt trạng thái `witchSavedThisNight = true; player.witchState.hasHeal = false;`. Lựa chọn cứu vĩnh viễn được bảo toàn ngay cả khi người chơi không chọn độc, bỏ qua lượt hoặc hết giờ đêm.
- **Kho bình thuốc mini nhỏ gọn đặt ngay cạnh badge Role ([screens/GameScreen.js](file:///d:/code%20game/Werewolfdemo/screens/GameScreen.js)):**
  - Chuyển toàn bộ kho bình thuốc về góc trái header, đặt cạnh nút vai trò của Phù Thủy với thiết kế mini 2 ô màu: **Xanh lục** (Bình Cứu) và **Tím** (Bình Độc).
  - Khi bình thuốc còn: hiển thị sáng rõ rực rỡ với hiệu ứng hào quang tương ứng.
  - Khi bình thuốc đã sử dụng: mất hoàn toàn màu đó (chuyển sang xám tối trong suốt mờ ảo) cho đến khi hết cả 2 bình.
  - Trả lại 100% diện tích thoáng đãng cho đấu trường bên dưới.
- **Quy tắc bỏ độc & cứu sống của Phù Thủy ([screens/GameScreen.js](file:///d:/code%20game/Werewolfdemo/screens/GameScreen.js), [server/index.js](file:///d:/code%20game/Werewolfdemo/server/index.js)):**
  - Phù Thủy **không thể ném độc chính mình** (`!isMe` ở client và chặn `poisonTargetId === socket.id` ở server).
  - Phù Thủy **vẫn có thể dùng bình Cứu chính mình** khi là nạn nhân bị Sói cắn.
  - Loại bỏ hoàn toàn nút chốt xác nhận sau khi chọn người: bấm trực tiếp vào avatar người chơi trên đấu trường là **ném độc ngay lập tức**, không cần xác nhận lại vì đã có bước vote "Có muốn dùng thuốc độc không" trước đó.
- **Tương tác Khiên Bảo Vệ & Độc Phù Thủy ([server/gameLogic.js](file:///d:/code%20game/Werewolfdemo/server/gameLogic.js), [server/index.js](file:///d:/code%20game/Werewolfdemo/server/index.js)):**
  - Khiên Bảo Vệ chỉ che chở được đòn cào của Sói, **không thể bảo vệ khỏi thuốc độc của Phù Thủy**. Người bị Phù Thủy ném độc vẫn tử nạn bình thường.
- **Hoạt ảnh đặc biệt: Xung Đột Khiên & Độc ([components/WitchPoisonModal.js](file:///d:/code%20game/Werewolfdemo/components/WitchPoisonModal.js), [components/RoomSettings.js](file:///d:/code%20game/Werewolfdemo/components/RoomSettings.js)):**
  - Kích hoạt khi Bảo Vệ và Phù Thủy cùng chọn che chở và ném độc vào cùng một người chơi trong một đêm:
    - Khiên Bảo Vệ bung lên phát sáng xanh lam bao bọc quanh nạn nhân.
    - Dòng chữ chạy typewriter phía trên Avatar: `"Một người muốn cứu một người muốn giết , thảm hại thật"`.
    - Bình thuốc độc lao tới phát nổ phá vỡ khiên, avatar chuyển đỏ rồi phủ xám đen tử nạn.
    - Huy hiệu thông báo bên dưới: `☠️ <Tên người> đã bị phù thủy giết chết`.
    - Thêm nút thử nghiệm `🛡️☠️ Thử Xung Đột: Khiên Bảo Vệ + Phù Thủy Độc` trong bảng cài đặt phòng ngoài sảnh.
- **Dọn dẹp giao diện đấu trường & loại bỏ code test trong trận ([screens/GameScreen.js](file:///d:/code%20game/Werewolfdemo/screens/GameScreen.js)):**
  - Xóa bỏ nút và dropdown test Tiên Tri (`headerTestSeerBtn`, `demoDropdownContainer`) khỏi màn hình trong trận (chỉ giữ lại ở sảnh cài đặt ngoài phòng).
  - Loại bỏ các hộp text box đè nặng nề phía trên danh sách Avatar (`announceCard`, `eliminationNotice`) vì đã có hoạt ảnh điện ảnh toàn màn hình và tin nhắn hệ thống trong chat.
  - Sửa điều kiện hiển thị thanh hành động dưới đáy màn hình (`bottomActionBar`) để kích hoạt đầy đủ trong lượt Phù Thủy (`NIGHT_WITCH`).
- **Khắc phục lỗi ngắt kết nối đồng loạt khi bấm Bắt đầu trận ([screens/GameScreen.js](file:///d:/code%20game/Werewolfdemo/screens/GameScreen.js), [App.js](file:///d:/code%20game/Werewolfdemo/App.js)):**
  - Chuyển khai báo `me`, `amAlive`, `alivePlayers`, `isNight...` lên đầu component trước các `useEffect`, khắc phục triệt để lỗi `ReferenceError: Cannot access 'amAlive' before initialization` làm crash sập React Native của toàn bộ người chơi khi vừa chuyển từ sảnh vào trận.
  - Bọc `ErrorBoundary` bảo vệ `GameScreen` trong `App.js` ngăn ngừa crash giao diện làm đóng kết nối socket.
  - Bổ sung vai trò `witch` vào thẻ hiển thị vai trò [components/RoleCard.js](file:///d:/code%20game/Werewolfdemo/components/RoleCard.js).
- **Khắc phục lỗi ngắt kết nối khi vào phòng ([server/index.js](file:///d:/code%20game/Werewolfdemo/server/index.js)):**
  - Thêm listener toàn cục `process.on('uncaughtException')` và `process.on('unhandledRejection')` tránh crash sập process NodeJS.
  - Kiểm tra kiểu dữ liệu chuỗi `roomCode` trong socket handlers `create-room`, `join-room`, `reconnect-room` bọc trong `try/catch`.
  - Khóa chat công khai ban đêm trong lượt Phù Thủy: bổ sung `room.phase === PHASES.NIGHT_WITCH` vào điều kiện kiểm tra `isNightTime`.
- **Phòng thủ render PlayerAvatar ([components/PlayerAvatar.js](file:///d:/code%20game/Werewolfdemo/components/PlayerAvatar.js)):**
  - Bổ sung `if (!player) return null;` tránh crash component khi dữ liệu player chưa hoàn chỉnh lúc kết nối.
- **Tối ưu tương tác giữa Bảo Vệ & Phù Thủy ([server/index.js](file:///d:/code%20game/Werewolfdemo/server/index.js)):**
  - Khi nạn nhân bị Sói cắn đã được Bảo Vệ che chở thành công, đòn tấn công được tính là đã bị chặn đứng hoàn toàn.
  - Phù Thủy thức dậy sẽ thấy không có ai bị chết (bỏ qua bước bình Cứu, tiến thẳng tới lựa chọn bình Độc hoặc bỏ qua, tránh lãng phí bình Cứu).
- **Mục tiêu test hiệu ứng là Chủ Phòng ([components/RoomSettings.js](file:///d:/code%20game/Werewolfdemo/components/RoomSettings.js)):**
  - Cập nhật hàm `getHostTarget`: ưu tiên lấy chính Chủ Phòng (`p.id === myId`) làm mục tiêu mô phỏng trong tất cả hiệu ứng (Tiên Tri, Sói cào, Bảo Vệ, Phù Thủy Cứu, Phù Thủy Độc), tránh fallback về "Người chơi vô danh".
- **Hiệu ứng gõ phím & vị trí câu thoại Phù Thủy ([components/WitchHealSaveModal.js](file:///d:/code%20game/Werewolfdemo/components/WitchHealSaveModal.js) & [components/WitchPoisonModal.js](file:///d:/code%20game/Werewolfdemo/components/WitchPoisonModal.js)):**
  - Bỏ toàn bộ viền và nền textbox bao quanh (`backgroundColor: transparent`).
  - Đưa câu thoại màu tím neon (`#D8B4FE`) lên vị trí **phía trên Avatar** của nạn nhân.
  - Bỏ hoàn toàn dấu ngoặc kép `"..."`.
  - Tích hợp hiệu ứng gõ phím typewriter: dòng chữ chạy dần từng ký tự một (25ms/ký tự). Khi gõ xong trọn vẹn, bình thuốc mới bắt đầu được ném tới mục tiêu.
  - Hỗ trợ đầy đủ cả `victimPlayer`, `savedPlayer` và `poisonedPlayer`.

---

## [2.0.0] - 2026-10-28

### 🧙‍♀️ Ra Mắt Nhân Vật Mới: Phù Thủy (Witch 🧙‍♀️), Bình Cứu & Bình Độc, Tối Ưu Bỏ Phiếu Sói
- **Assets Bình Thuốc Thần Kỳ ([assets/potion_heal.png](file:///d:/code%20game/Werewolfdemo/assets/potion_heal.png) & [assets/potion_poison.png](file:///d:/code%20game/Werewolfdemo/assets/potion_poison.png)):**
  - Trích xuất và khử phông trong suốt (transparent PNG) từ ảnh người dùng cung cấp.
  - Bình Cứu màu xanh lục phát quang ma thuật, Bình Độc màu tím đỏ tỏa khói độc hại.
- **Backend & Logic Game ([server/constants.js](file:///d:/code%20game/Werewolfdemo/server/constants.js), [server/gameLogic.js](file:///d:/code%20game/Werewolfdemo/server/gameLogic.js), [server/index.js](file:///d:/code%20game/Werewolfdemo/server/index.js)):**
  - Thêm vai trò `ROLES.WITCH = 'witch'`, màu `#A855F7`, pha `PHASES.NIGHT_WITCH = 'night_witch'` (thời gian 30s).
  - Khởi tạo trạng thái Phù Thủy `player.witchState = { hasHeal: true, hasPoison: true }`.
  - Phù Thủy thức giấc ngay sau khi đàn Sói cắn người để biết ai là nạn nhân bị cắn đêm đó.
  - Xử lý hành động đêm `witch-action`: nhận `{ save, poisonTargetId }`, cập nhật tiêu hao bình thuốc và tự động rút thời gian xuống 3s khi hoàn tất.
  - Tính toán tổng hợp kết quả đêm `processNightActions`: xử lý đồng thời cắn sói, bảo vệ che chở, phù thủy cứu và phù thủy ném độc.
- **Tối Ưu Hóa Bỏ Phiếu Của Sói Ban Đêm ([screens/GameScreen.js](file:///d:/code%20game/Werewolfdemo/screens/GameScreen.js)):**
  - Loại bỏ hoàn toàn nút chốt (`wolf-confirm` / `wolfConfirmed`). Sói bỏ phiếu trực tiếp giống như biểu quyết ban ngày.
  - Cho phép đổi phiếu tự do; khi tất cả Sói còn sống đã chọn mục tiêu thì tự động rút thời gian xuống 5s để chuyển tiếp mượt mà.
- **Giao Diện Ban Đêm Của Phù Thủy ([screens/GameScreen.js](file:///d:/code%20game/Werewolfdemo/screens/GameScreen.js)):**
  - **Bước 1 (Bình Cứu):** Modal trung tâm hiện Avatar nạn nhân bị Sói cắn với 2 lựa chọn: `🟢 CỨU SỐNG` hoặc `❌ BỎ MẶC`.
  - **Bước 2 (Bình Độc):** Thanh công cụ nhắm bình độc, cho phép bấm chọn 1 người chơi bất kỳ trên đấu trường để ném độc hoặc bấm `🏳️ BỎ QUA`.
- **Hoạt Ảnh Điện Ảnh Buổi Sáng Riêng Biệt ([components/WitchHealSaveModal.js](file:///d:/code%20game/Werewolfdemo/components/WitchHealSaveModal.js) & [components/WitchPoisonModal.js](file:///d:/code%20game/Werewolfdemo/components/WitchPoisonModal.js)):**
  - **Phù Thủy Hồi Sinh:** Sau khi vuốt sói chém qua avatar, xuất hiện dòng thoại tím: `"Chưa đến lúc để chết đâu, hãy sống dậy giúp mọi người đi"`, ném bình Cứu màu xanh vỡ tung đè lên vết cào làm lành hoàn toàn vết thương và khôi phục màu sắc avatar. Huy hiệu: `🧪 ĐÃ ĐƯỢC PHÙ THỦY CỨU SỐNG`.
  - **Phù Thủy Ném Độc Tử Vong:** Hoạt ảnh tách riêng phát tuần tự sau hoạt ảnh của Sói với lời thoại: `"Hãy nhắm mắt đi , ngươi đã làm phiền mọi người đủ rồi"`, ném bình Độc màu tím vỡ tan, avatar chuyển đỏ như bị thiêu đốt rồi lịm dần sang sắc đen xám tử nạn. Huy hiệu: `☠️ ĐÃ BỊ TRÚNG ĐỘC TỬ VONG`.
- **Cài Đặt Phòng & Thử Nghiệm ([components/RoomSettings.js](file:///d:/code%20game/Werewolfdemo/components/RoomSettings.js)):**
  - Thêm hàng chỉnh số lượng Phù Thủy và 2 nút thử nghiệm trong khối `THỬ CÁC HIỆU ỨNG` dành cho Chủ phòng.
- **Hướng Dẫn Vai Trò ([components/RoleGuideModal.js](file:///d:/code%20game/Werewolfdemo/components/RoleGuideModal.js)):**
  - Bổ sung hồ sơ nhân vật Phù Thủy 🧙‍♀️ chi tiết về mục tiêu, hành động ban đêm và mẹo chiến thuật.

---

## [1.9.2] - 2026-10-27

### 🛡️ Hoạt Ảnh Khiên Bảo Vệ Thành Công (Morning Bodyguard Save Cinematic Animation)
- **Component Mới [BodyguardSaveModal.js](file:///d:/code%20game/Werewolfdemo/components/BodyguardSaveModal.js):**
  - Tích hợp tài nguyên ảnh Khiên Hiệp Sĩ viền sắt cổ điển độ nét cao (`assets/shield.png`).
  - Hoạt ảnh 4 giai đoạn điện ảnh:
    1. **Tâm điểm nạn nhân:** Banner `⚠️ MA SÓI TẤN CÔNG ĐÊM QUA!` cùng phụ đề `Một tiếng thét xé tan màn đêm yên bình của ngôi làng...`, chân dung nạn nhân với bảng tên `NẠN NHÂN ĐÊM QUA`.
    2. **Vuốt Sói tấn công:** Móng vuốt sói bổ nhào xé toạc mục tiêu.
    3. **Khiên chặn đứng & Va chạm kim loại:** Khiên bay vụt ra chắn giữa vuốt sói và avatar. Phát âm thanh va chạm kim loại đanh thép chói tai ("KENGGG / CHINGGG") tổng hợp bằng Web Audio API, bùng nổ 22 tia lửa kim loại và sóng xung kích hào quang. Vuốt sói bị đánh bật dội ngược ra sau và tan biến.
    4. **Chiến thắng & Hộ mệnh:** Tiêu đề chuyển mượt thành `🛡️ BẢO VỆ ĐÃ BẢO VỆ THÀNH CÔNG!!` và phụ đề `Người hùng của ngôi làng đã bảo vệ được người vô tội`. Huy hiệu phía dưới phát sáng: `🛡️ ĐÃ ĐƯỢC BẢO VỆ`.
- **Tích Hợp Tự Động Trong Trận Đấu ([GameScreen.js](file:///d:/code%20game/Werewolfdemo/screens/GameScreen.js)):**
  - Khi bước vào pha thông báo sáng (`DAY_ANNOUNCE`), nếu có người được Bảo Vệ cứu thoát khỏi nanh vuốt Sói (`savedPlayer`), toàn bộ phòng sẽ được chứng kiến hoạt ảnh điện ảnh này.
- **Thử Nghiệm Trong Cài Đặt ([RoomSettings.js](file:///d:/code%20game/Werewolfdemo/components/RoomSettings.js)):**
  - Thêm nút `🛡️ Thử Hiệu Ứng Khiên Bảo Vệ Thành Công` vào khối `THỬ CÁC HIỆU ỨNG` dành riêng cho Chủ phòng.

---

## [1.9.1] - 2026-10-27

### 🎨 Tinh Chỉnh Giao Diện Sói Cào & Khối Cài Đặt Phòng
- **Xóa Bỏ Tính Năng Đổi Avatar Trong Sảnh Chờ:**
  - Xóa toàn bộ code và giao diện đổi avatar trong [LobbyScreen.js](file:///d:/code%20game/Werewolfdemo/screens/LobbyScreen.js) và socket event `change-avatar` trong [server/index.js](file:///d:/code%20game/Werewolfdemo/server/index.js).
  - Giữ lại tính năng đổi avatar ngoài sảnh chính [HomeScreen.js](file:///d:/code%20game/Werewolfdemo/screens/HomeScreen.js) với nút `➕` và [AvatarPickerModal.js](file:///d:/code%20game/Werewolfdemo/components/AvatarPickerModal.js).
- **Đổi Tên Tiêu Đề Khối Thử Trong [RoomSettings.js](file:///d:/code%20game/Werewolfdemo/components/RoomSettings.js):**
  - Đổi tiêu đề khối thử thành: `THỬ CÁC HIỆU ỨNG`.
- **Tinh Chỉnh [WolfClawAttackModal.js](file:///d:/code%20game/Werewolfdemo/components/WolfClawAttackModal.js):**
  - Đổi nhãn bảng tên thành: `NẠN NHÂN ĐÊM QUA`.
  - Huy hiệu tử nạn bên dưới chỉ hiển thị dòng chữ: `ĐÃ BỊ SÓI CẮN`.
  - Xóa bỏ vòng tròn viền hào quang đằng sau avatar (`avatarAuraRing`).

### ⚖️ Thông Báo Số Lượng Sói Còn Lại Sau Khi Hết Giờ Treo Cổ
- **HUD Thông Báo Điện Ảnh [GameScreen.js](file:///d:/code%20game/Werewolfdemo/screens/GameScreen.js):**
  - Khi hết giờ bỏ phiếu ban ngày (`vote-result`), hiển thị pop-up thông báo trung tâm trong 4 giây:
    - Kết quả biểu quyết: Người bị treo cổ hoặc không ai bị treo cổ.
    - Số lượng Ma Sói còn lại trong làng.
    - Thông báo chuẩn bị bước vào Ban Đêm trước khi các vai trò (Bảo Vệ, Sói, Tiên Tri) bắt đầu lượt hành động.
  - Tăng thời gian chuyển pha sau bỏ phiếu trong [server/index.js](file:///d:/code%20game/Werewolfdemo/server/index.js) lên 4.5 giây để đảm bảo toàn bộ người chơi nắm rõ thông tin.

---

## [1.9.0] - 2026-10-27

### 🩸 Hoạt Ảnh Ma Sói Cào Tử Nạn Buổi Sáng (Morning Wolf Claw Attack Cinematic Animation)
- **Tích Hợp Ảnh Vết Cào Máu Ma Sói (`assets/wolf_claw.png`):**
  - Tách nền ảnh vuốt sói cào sắc nhọn do người dùng cung cấp thành file PNG trong suốt độ phân giải cao (`517px × 591px`).
  - Tích hợp vào component mới [WolfClawAttackModal.js](file:///d:/code%20game/Werewolfdemo/components/WolfClawAttackModal.js).
- **Hoạt Ảnh 3 Giai Đoạn:**
  1. **Giai đoạn 1 (Tâm điểm nạn nhân):** Avatar người bị sát hại nổi bật ở trung tâm với vòng hào quang đỏ rực và bảng tên trên chân đế ma mị.
  2. **Giai đoạn 2 (Vuốt cào xé toạc):** 3 vệt móng vuốt sói sắc lẹm chém toạc đè lên Avatar với hiệu ứng rung giật màn hình (`shakeAnim`), chớp sáng đỏ (`flashAnim`), 18 hạt máu bắn tung tóe ra 360 độ và âm thanh chém xé chân thực bằng Web Audio API Synthesizer.
  3. **Giai đoạn 3 (Chuyển hóa đen xám):** Lớp phủ đen xám tử nạn (`grayscaleDarkOverlay`) lan tỏa toàn bộ avatar, chuyển viền sang xám tro `#475569`, hiện dấu ấn đầu lâu u tối và huy hiệu `⚰️ ĐÃ BỊ TIÊU DIỆT`.
- **Kích Hoạt Tự Động Trong Trận Đấu (`GameScreen.js`):**
  - Vào bình minh (`DAY_ANNOUNCE`), khi có người chết do Ma Sói, toàn bộ phòng chơi đều chứng kiến hoạt ảnh điện ảnh này trước khi bước vào giờ thảo luận.
- **Thử Nghiệm Trong Cài Đặt (Host Only):**
  - Bổ sung nút `🩸🐺 Thử Hiệu Ứng Bị Sói Cào Tử Nạn` trong [RoomSettings.js](file:///d:/code%20game/Werewolfdemo/components/RoomSettings.js) dành riêng cho Chủ phòng.

### 🎨 Kho Emote Đa Dạng & Nút ➕ Đổi Avatar Trong Sảnh Chờ (Lobby)
- **Component [AvatarPickerModal.js](file:///d:/code%20game/Werewolfdemo/components/AvatarPickerModal.js):**
  - Phân loại biểu tượng theo 3 tab phong phú:
    - 🐾 **Động vật:** 36 icon động vật hoang dã và vật nuôi.
    - 🍎 **Hoa quả & Món ăn:** 36 icon trái cây, thức ăn ngon miệng.
    - ⚔️ **Thần bí & Nhân vật:** 32 icon nhân vật huyền bí ma sói, phù thủy, ma cà rồng, v.v.
    - 📷 Nút tải ảnh đại diện tùy biến từ thiết bị.
- **Nút ➕ Nổi Bật & Đổi Avatar Ngay Trong Phòng Chờ (`LobbyScreen.js` & `HomeScreen.js`):**
  - Bổ sung nút `➕` bên cạnh hàng avatar nhanh ở cả Màn hình chính và Sảnh chờ.
  - Hỗ trợ socket event `change-avatar` thời gian thực tại `server/index.js`, giúp người chơi đổi avatar ngay trong phòng chờ mà không cần tạo lại phòng.

---

## [1.8.6] - 2026-10-27

### ⚙️ Di Chuyển Khối Thử Hiệu Ứng Tiên Tri Vào Cài Đặt (Host-Only Settings Preview)
- **Đóng Gói Khối Thử Vào `RoomSettings`:**
  - Chuyển toàn bộ khu vực thử nghiệm Quả Cầu Pha Lê (`🕊️ Thử Phe Thiện` & `🐺 Thử Phe Ác`) từ giao diện phòng chờ `LobbyScreen` và `GameScreen` vào bên trong modal Cài Đặt Phòng (`RoomSettings.js`).
  - **Bảo Mật Quyền Truy Cập (Chỉ Dành Cho Chủ Phòng):**
    - Sử dụng điều kiện kiểm tra `!readOnly` để chỉ Chủ phòng (Host) mới nhìn thấy và kích hoạt được khối thử nghiệm này.
    - Thành viên bình thường trong phòng chờ khi mở Cài Đặt sẽ ở chế độ `readOnly: true`, hoàn toàn không thấy khối thử hiệu ứng.
- **Tích Hợp `SeerInspectionModal` Trực Tiếp Trong `RoomSettings`:**
  - Khi Chủ phòng bấm thử hiệu ứng bên trong Settings, hiệu ứng quả cầu pha lê với hoạt ảnh điện ảnh sẽ phát mượt mà trên toàn màn hình. Sau khi đóng hoặc kết thúc thời gian đếm ngược, giao diện tự động quay lại bảng Settings.
- **Làm Sạch Bàn Đấu & Phòng Chờ:**
  - Loại bỏ hoàn toàn các nút thử nghiệm dev khỏi `LobbyScreen` và bảng hành động Tiên Tri trong `GameScreen`, giúp giao diện game sạch sẽ, gọn gàng và chuyên nghiệp.

---

## [1.8.5] - 2026-10-26

### 💥 Tích Hợp Ảnh Vết Nứt Kính Chân Thực (Realistic Glass Shatter Texture)
- **Tích Hợp Ảnh Kính Nứt Thực Tế (`assets/glass_crack.png`):**
  - Tích hợp trực tiếp file ảnh texture vết nứt kính trong suốt (Transparent PNG) do người dùng cung cấp (`media_1793008804435.png`).
  - Hình ảnh vết nứt có lỗ thủng tâm chấn cùng hàng chục tia rạn nứt sắc như dao cạo, khúc xạ ánh sáng 3D chân thực của kính vỡ thật.
  - Phóng to kích thước vết nứt đạt trọn vẹn **250px × 250px** vừa khít với bề mặt quả cầu pha lê.
- **Tối Ưu & Tinh Gọn Mã Nguồn:**
  - Loại bỏ hoàn toàn khối mã tạo nhánh nứt thủ công (`CRACK_BRANCHES_DATA` và các style `crackLine`), thay thế bằng thẻ `<Image source={glassCrackImg} />` tối ưu hiệu năng cao và hình ảnh sắc nét gấp nhiều lần.

---

## [1.8.4] - 2026-10-26

### ⚡ Nhánh Nứt Vỡ Kính Xuyên Tâm Tỏa Từ Trong Ra Ngoài (Radial Branching Fractures)
- **Rút Ngắn 2/3 Chiều Dài Mỗi Đường Nứt (12px - 26px):**
  - Giảm chiều dài các vết nứt kính từ 80-150px xuống chỉ còn 12-26px (ngắn lại 2/3 so với trước), tạo cảm giác mảnh nứt tinh xảo và sắc sảo như pha lê thật.
- **Tạo Mạng Lưới 46 Nhánh Nứt Phân Nhánh Tỏa Ra Từ Tâm (Radial Fracture Web):**
  - Tích hợp cấu trúc nứt vỡ chân thực gồm 3 tầng:
    1. **Tâm chấn (Impact Epicenter):** 4 vết nứt vi điểm tại trung tâm quả cầu.
    2. **6 Tia nứt chính:** Tỏa ra 6 hướng 360 độ, mỗi tia gồm 3 đoạn zíc-zắc ngắn nối tiếp nhau.
    3. **Nhánh con rẽ nhánh (Fracture Forks):** 18 nhánh nứt phụ đâm nhánh từ các tia chính sang hai bên sườn.
    4. **Mạng lưới nứt ngang (Cross-Fractures):** 6 đường nối ngang dạng mạng nhện nối giữa các tia nứt.
  - Vết nứt phát sáng trắng tinh khôi (`rgba(255, 255, 255, 0.95)`) viền hào quang đỏ rực (`shadowColor: '#EF4444'`), tạo hiệu ứng quả cầu bị nội lực tà khí từ bên trong Ma Sói đập nứt toác dữ dội trước khi nổ tung!

---

## [1.8.3] - 2026-10-26

### 🔮 Đồng Nhất Màu Sắc Quả Cầu & Vỡ Toàn Bộ Quả Cầu Biến Mất Cùng Ma Sói
- **Đổi Tên Nhãn Thành "PHE ÁC":**
  - Đổi huy hiệu nguyên hình từ `MA SÓI` thành `PHE ÁC` đồng bộ hoàn toàn với `PHE THIỆN` của phe đối lập.
- **Đồng Nhất Màu Sắc 2 Quả Cầu Thiện & Ác (Giữ Bí Mật Tuyệt Đối):**
  - Ở giai đoạn `gazing` (soi thấu linh hồn), cả hai quả cầu Phe Thiện và Phe Ác đều có màu sắc, làn sương mù ma thuật (`innerMist: rgba(79, 70, 229, 0.45)`) và vòng ma pháp ánh sao tím hoàn toàn giống nhau, không làm lộ kết quả trước thời hạn.
  - **Chỉ thay đổi màu viền sau khi biết được thiện hay ác:**
    - Khi chuyển sang giai đoạn `revealing`, viền quả cầu mới đổi sang đỏ rực huyết quang (`rgba(239, 68, 68, 0.95)`) nếu là Ác, hoặc vàng hoàng kim thánh khiết (`rgba(253, 224, 71, 0.95)`) nếu là Thiện.
- **Vỡ Toàn Bộ Quả Cầu & Hình Ảnh Ma Sói Biến Mất Khi Kính Vỡ:**
  - Khi quả cầu phát nổ, toàn bộ quả cầu pha lê cùng hình ảnh Ma Sói bên trong đều vỡ nát và biến mất hoàn toàn (`vanishOpacity` $\rightarrow$ 0).
  - 42 mảnh vỡ kính phát nổ từ vị trí quả cầu bay tung tóe ra 360 độ và tan biến vào không gian, sau đó huy hiệu phán quyết xuất hiện bên dưới.

---

## [1.8.2] - 2026-10-26

### 🐺 Thay Ảnh Ma Sói Điện Ảnh & Tăng Cường Vỡ Kính Đằng Sau Avatar
- **Cập Nhật Ảnh Ma Sói Mới (`assets/werewolf.jpg`):**
  - Thay thế hoàn toàn giao diện Ma Sói cũ bằng hình ảnh Ma Sói hắc ám mắt đỏ rực lửa do người dùng cung cấp (`media_1793006785124.jpg`).
  - Hình ảnh được bo tròn 250×250 ôm trọn quả cầu, viền huyết quang phát sáng (`rgba(239, 68, 68, 0.85)`), mang lại cảm giác ma mị, nguy hiểm và điện ảnh tột bậc.
- **Tăng Cường Số Lượng Mảnh Kính Vỡ (42 Mảnh Vỡ Đa Dạng):**
  - Tăng số lượng mảnh kính từ 16 lên 42 mảnh (`NUM_SHARDS = 42`) với nhiều kích thước (lớn 24px, vừa 17px, mảnh sắc nhọn 11px, và bụi kính li ti 6px).
  - Phổ màu mảnh kính vỡ rực rỡ gồm trắng tinh thể trong suốt (`rgba(255,255,255,0.95)`), đỏ phản quang rực lửa (`rgba(239,68,68,0.85)`), và ánh hồng băng giá (`rgba(254,202,202,0.9)`).
  - Bổ sung 6 đường nứt kính chằng chịt (`crack1` đến `crack6`) trước thời điểm quả cầu phát nổ.
- **Hiệu Ứng Vỡ Kính Nổ Tung NẰM ĐẰNG SAU Avatar:**
  - Tái cấu trúc phân lớp (`zIndex: 3` cho các mảnh kính vỡ, `zIndex: 8` cho avatar/hình sói).
  - Khi quả cầu phát nổ, lớp vỏ kính ngoài tan vỡ nhưng hình ảnh Ma Sói / Avatar vẫn ngự sừng sững ở tiền cảnh (Foreground), nhô mạnh về phía trước với hiệu ứng rung chấn, trong khi hàng chục mảnh vỡ thủy tinh phát nổ và bắn tung tóe ra phía sau lưng (Background) cực kỳ hoành tráng!

---

## [1.8.1] - 2026-10-26

### 🔮 Tối Ưu Quả Cầu Tiên Tri & Mở Rộng 100% Hitbox Người Chơi
- **Lấp Đầy Hình Ảnh Bên Trong Quả Cầu Pha Lê (Full-fill 250x250):**
  - Cả ảnh đại diện mục tiêu ở Phase 1 và Mắt Thiên Sứ Thần Thánh (Ophanim Eye) / Ma Sói ở Phase 2 đều được phóng to 250px × 250px, ôm khít 100% không gian bên trong quả cầu pha lê với bo tròn viền kính ma thuật.
  - Tích hợp lớp phủ phản chiếu ánh sáng 3D mờ nhẹ (`glassHighlight`, `glassInnerShadow`) bên trên hình ảnh, tạo chiều sâu thị giác chân thực như đang ngắm nhìn qua một quả cầu thủy tinh ma mị nguyên khối.
- **Tên Mục Tiêu Chuyển Xuống Nằm Trên Chân Đế Quả Cầu:**
  - Bảng tên người chơi mục tiêu (`pedestalNamePlate`) được di chuyển xuống ngự ngay phía trên chân đế kim loại cổ ngữ (`crystalPedestal`), viền vàng hoàng kim phát sáng rực rỡ, không còn che khuất hình ảnh bên trong quả cầu.
- **Giới Hạn Tên Đặt Tối Đa 20 Ký Tự:**
  - Tăng giới hạn đặt tên từ 15 lên 20 ký tự tại giao diện Trang chủ (`HomeScreen.js - maxLength={20}`).
  - Đồng bộ giới hạn 20 ký tự ở tầng máy chủ (`gameLogic.js`) với hàm chuẩn hóa `trim().slice(0, 20)` cho cả tạo phòng và tham gia phòng.
- **Mở Rộng 100% Hitbox Box Người Chơi (2x Click Area):**
  - Tăng gấp đôi diện tích hitbox các box người chơi (`discordBox`): `minWidth` tăng từ 80px lên 140px, `minHeight` từ 110px lên 180px, padding mở rộng 16px.
  - Phóng to các cấp độ `PlayerAvatar`: kích thước avatar từ 36-64px lên 52-96px, độ rộng hiển thị tên mở rộng tới 130px.
  - Tối ưu số cột hiển thị bàn đấu (2-3 cột linh hoạt), giúp người chơi thao tác click, chọn mục tiêu soi/cắn/bảo vệ/biểu quyết cực kỳ dễ dàng và chuẩn xác cả trên PC lẫn Mobile.

---

## [1.8.0] - 2026-10-26

### 🔮 Hoạt Ảnh Tiên Tri Soi Linh Hồn Điện Ảnh (Seer Inspection Cinematic Animation)
- **Thư mục Assets Video & Hoạt ảnh:**
  - Khởi tạo thư mục `assets/animations/` và `assets/videos/` kèm tài liệu hướng dẫn (`README.md`) để sẵn sàng chứa các video hiệu ứng dạng `.mp4`, `.webm`, file `.gif` hoặc Lottie `.json`.
- **Hoạt Ảnh Quả Cầu Pha Lê Thấu Thị Linh Hồn (`SeerInspectionModal`):**
  - **Giai đoạn 1 (Quả Cầu Khởi Động):** Quả cầu thủy tinh trôi bồng bềnh ma mị với vầng sáng 3D phản quang, vòng ma pháp cổ xưa xoay kép và làn khói sương cuộn xoáy. Avatar cùng tên người chơi mục tiêu hiện rõ bên trong tâm quả cầu kèm hiệu ứng thấu thị linh hồn.
  - **Giai đoạn 2 (Hiện Nguyên Hình):**
    - **Phe Thiện:** Avatar chuyển hóa thành **Mắt Thiên Sứ Thần Thánh (Ophanim Angel Eye)** theo ảnh mới do người dùng cung cấp với đôi mắt vũ trụ, vòng tròn ký tự hoàng kim và đôi cánh thánh quang, hiển thị nhãn `PHE THIỆN`.
    - **Phe Ác:** Avatar chuyển hóa thành **Ma Sói Hung Tợn (`🐺`)** với mắt đỏ rực lửa, móng vuốt rướm máu và quả cầu rung giật chấn động dữ dội.
  - **Giai đoạn 3 (Hiệu Ứng Kết Thúc Quả Cầu):**
    - **Nếu là Phe Ác (Ma Sói): Quả cầu nứt toác và VỠ TUNG (`Glass Shatter / Explosion`)** thành 16 mảnh vỡ thủy tinh phản quang bay tứ tán 360 độ kèm chớp sáng đỏ và rung chấn màn hình giật mạnh!
    - **Nếu là Phe Thiện: Quả cầu VANISH biến mất ma thuật (`Ethereal Dissolve`)** nở rộng nhẹ nhàng và tan biến êm dịu thành làn sóng thánh quang cùng các hạt bụi sao hoàng kim bay bổng lấp lánh!
  - **Phóng To Quả Cầu & Hình Ảnh +30%:** Tăng đường kính quả cầu pha lê từ 190px lên 250px, ảnh mắt thiên sứ từ 106px lên 160px để hiển thị chi tiết, rõ nét và hoành tráng hơn.
  - **Tích hợp Âm Thanh Ma Thuật Động (Web Audio API Synthesizer):** Tự động phát âm thanh chuông ngân ma thuật, hợp âm thiên thần trong trẻo, tiếng gầm gừ u ám, và tiếng nứt vỡ thủy tinh phát nổ chân thực mà không phụ thuộc vào tệp audio bên ngoài.
- **Tinh Chỉnh Giao Diện Nút Bấm:**
  - Rút gọn nút bấm thành `🕊️ Thử Phe Thiện` và `🐺 Thử Phe Ác` gọn gàng trên 1 dòng, loại bỏ dòng chữ dài `(Thiên Thần + Vanish)` gây xuống dòng không đẹp mắt.

---

## [1.7.5] - 2026-10-25

### 💬 Nổi Bật Chữ Trong Khung Chat & Viền Đen (Prominent Text with Black Stroke)
- **Đổi Màu Chữ & Thêm Viền Đen Nổi Bật:**
  - Toàn bộ nội dung tin nhắn (`messageText`, `myMessageText`) và ô nhập văn bản (`input`) được đổi sang màu trắng sáng `#FFFFFF` nổi bật với font đậm (`fontWeight: '800'`).
  - Tích hợp hiệu ứng viền đen (`textShadow` sắc nét `-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000` trên Web và `textShadowColor: '#000000', textShadowRadius: 3` trên Mobile/Native) giúp chữ nổi bần bật, cực kỳ dễ đọc trên mọi nền sáng/tối và chế độ ngày/đêm.
  - Tên người gửi (`senderName`) và thông báo hệ thống (`systemBubbleText`) cũng được tinh chỉnh viền đen đồng bộ và nổi bật.
  - Hộp tin nhắn của người khác (`otherMessage`) chuyển sang nền tối kính mờ `rgba(30, 41, 59, 0.92)` bo viền sang trọng, tạo độ tương phản tối đa với chữ trắng viền đen.

### 🛡️💀 Thông Báo Đầy Đủ Nạn Nhân & Bảo Vệ Cứu Sống Trong Khung Chat
- **Hiển Thị Đồng Thời Cả Người Bị Cắn Được Bảo Vệ Che Chở & Người Chết:**
  - Khung chat hệ thống hiển thị rõ ràng chiến công của Bảo Vệ khi bảo vệ đúng người bị Ma Sói cắn: `🛡️ [BÌNH MINH]: Đêm qua, [Tên] đã bị Ma Sói cắn nhưng được BẢO VỆ che chở thành công! Không ai thiệt mạng.`
  - Hỗ trợ hiển thị kết hợp cả tin báo người chết và người được cứu sống trong trường hợp nhiều biến cố xảy ra trong đêm.
  - Thẻ thông báo trên bàn đấu (`announceCard`) cũng được cập nhật để hiển thị đồng thời cả thẻ Bảo Vệ cứu người và thẻ người hy sinh.

### 🐺 Hiển Thị Số Lượng Sói Còn Lại Giữa Màn Hình Trong 3 Giây
- **Pop-up Đếm Số Lượng Sói Trung Tâm Màn Hình:**
  - Ngay sau khi giai đoạn bỏ phiếu ban ngày kết thúc (`vote-result`), một pop-up HUD ấn tượng với biểu tượng 🐺 phát sáng hào quang đỏ sẽ xuất hiện **ngay chính giữa màn hình**.
  - Hiển thị số lượng Sói còn sống cực to (`fontSize: 54`), viền đen dày nổi bật kèm thông điệp trạng thái (ví dụ: `⚠️ 2 con Sói vẫn đang ẩn nấp trong làng!` hoặc `🎉 Toàn bộ Ma Sói đã bị tiêu diệt!`).
  - Tự động đếm 3 giây rồi biến mất mượt mà với hiệu ứng Animated Fade/Scale trước khi chuyển tiếp sang ban đêm.
  - Đồng thời cập nhật số lượng Sói còn lại vào tin nhắn thông báo kết quả biểu quyết trong khung chat.

---

## [1.7.4] - 2026-10-25

### 💬 Tối Ưu Hóa Trải Nghiệm Khung Chat & Tinh Gọn Header
- **Giữ Focus Liên Tục Sau Khi Gửi (Continuous Chat Typing):**
  - Tích hợp `ref` và `blurOnSubmit={false}` cho ô nhập chat. Sau khi gửi tin nhắn (bằng Enter hoặc nút `➤`), con trỏ văn bản sẽ tự động giữ nguyên vị trí trong ô nhập liệu. Người chơi có thể gõ và gửi tiếp tin nhắn liên tục mà không cần phải bấm click lại vào ô chat.
- **Mặc Định Chat Trạng Thái Tắt (Chat Off by Default):**
  - Khung chat mặc định ở trạng thái đóng (`isChatOpen = false`) trên cả PC lẫn Mobile khi vào trận, giúp toàn bộ diện tích màn hình hiển thị bàn đấu rộng rãi nhất ngay từ đầu.
- **Đổi "Thu Gọn" Thành "Đóng Chat":**
  - Đổi nút thu gọn trong thanh tiêu đề chat thành `✕ Đóng chat` rõ ràng, trực quan.
- **Tinh Gọn Header Trên Cùng:**
  - Loại bỏ nút đóng/mở chat trên Header và nút bỏ qua vote của chủ phòng trên Header.
  - Toàn bộ thao tác đóng/mở chat được quản lý đồng nhất qua nút nổi `💬 Chat` ở góc dưới màn hình và nút `✕ Đóng chat` trong khung chat.
  - Tính năng Bỏ phiếu trắng (Skip Vote) giữ nguyên vẹn ở vị trí chuẩn trong bảng biểu quyết bên dưới màn hình.

---

## [1.7.3] - 2026-10-25

### 💬 Hỗ Trợ Nhập Nhiều Dòng & Cuộn Xem Lịch Sử Chat (Multiline Chat & Smooth Scroll History)
- **Nhập Tin Nhắn Nhiều Dòng (Multiline Input):**
  - Ô nhập liệu cho phép gõ văn bản dài, tự động co giãn độ cao linh hoạt (từ 38px đến 110px).
  - **Trên Web/PC:** Nhấn `Enter` để gửi tin nhắn nhanh; nhấn `Shift + Enter` để xuống dòng thoải mái.
  - **Trên Mobile:** Nhấn phím Enter trên bàn phím ảo để xuống dòng và bấm nút gửi `➤` khi hoàn tất.
  - Giới hạn ký tự được nâng lên 1,000 ký tự giúp người chơi tha hồ biện hộ và phân tích chiến thuật.
- **Cuộn Lên Xem Lịch Sử Tin Nhắn Không Bị Giật (Non-Intrusive Scroll History):**
  - Khắc phục hiện tượng bị cướp vị trí cuộn: Khi người chơi cuộn lên phía trên để đọc lại các manh mối/tranh luận cũ, hệ thống sẽ **giữ nguyên vị trí đọc**, không tự động giật nhảy xuống đáy khi có người khác gửi tin.
  - Bật thanh cuộn dọc (`showsVerticalScrollIndicator={true}`) rõ ràng giúp dễ dàng kéo lướt trên cả Web và điện thoại.
  - **Nút Nhảy Xuống Nhanh:** Khi đang cuộn xem lịch sử phía trên, một nút nổi tiện lợi `⬇️ Tin mới nhất` sẽ xuất hiện ở cuối khung chat, bấm vào là lập tức lướt mượt xuống tin nhắn mới nhất.

---

## [1.7.2] - 2026-10-25

### 🎛️ Thu Nhỏ Hitbox Ô Người Chơi & Chống Cuộn Dài (Dynamic Hitbox & Anti-Scroll)
- **Tự Động Tính Toán Kích Thước & Số Cột Động:** Không còn tình trạng ô người chơi bị to cồng kềnh kéo dài xuống đáy màn hình khi phòng đông người.
  - Khi phòng có nhiều người (>= 6 người) hoặc màn hình hẹp, hệ thống tự động kích hoạt chế độ **Compact** / **UltraCompact**:
    - Thu nhỏ avatar từ `medium` (52px) về `small` (36px).
    - Giảm padding của ô từ 12px xuống 6px / 4px, giảm khoảng cách lề trên dưới các tag định danh.
    - Tự động chia từ 3 đến 5 cột (trên PC) và 3 cột (trên Mobile) thay vì chỉ 2 cột như trước.
  - Toàn bộ danh sách người chơi (8-12 người) giờ đây nằm gọn gàng trong 2 đến 3 hàng ngắn, giúp người chơi quan sát toàn bộ bàn đấu và bỏ phiếu ngay lập tức mà không phải cuộn kéo trang liên tục.

### 💬 Khung Chat Dạng Slidebar Thu Phóng Đa Nền Tảng (Collapsible Slidebar Chat)
- **Bật / Tắt Chat Dạng Slidebar Linh Hoạt:**
  - **Trên PC:** Khung chat hoạt động như một thanh Slidebar bên phải. Người chơi có thể đóng chat bất kỳ lúc nào để mở rộng toàn màn hình cho đấu trường, hoặc mở lại bằng nút `💬 Chat` trên Header và nút nổi viền phải.
  - **Trên Mobile:** Chat hoạt động dưới dạng Drawer Slidebar trượt từ phải sang kèm lớp nền tối (backdrop click-to-close).
  - **Nút Thu Gọn Nhanh:** Bổ sung nút `➡️ Thu gọn` ngay trong header của `ChatBox` để thu sidebar lại chỉ với 1 chạm.
  - **Đếm Tin Chưa Đọc Thông Minh:** Khi đóng chat, biểu tượng `💬` hiển thị chính xác số tin nhắn mới được gửi kể từ lúc đóng, không bị đếm dồn toàn bộ lịch sử trận đấu.

---

## [1.7.1] - 2026-10-25

### 🖼️ Sửa Lỗi Hiển Thị Avatar Tải Lên Bằng Ảnh (Custom Device Avatar Fix)
- **Khắc phục lỗi tràn chuỗi Data Base64 gây vỡ giao diện:** Khi người chơi tải ảnh đại diện từ máy tính/điện thoại, dữ liệu ảnh được truyền đi dưới dạng Base64 (`data:image/...`). Trước đây ở một số vị trí như ô bỏ phiếu, thẻ tổng kết và danh sách người vote, chuỗi Base64 dài hàng chục nghìn ký tự bị render trực tiếp vào thẻ `<Text>`, khiến máy khác khi xem bị hiển thị cả đoạn mã chữ dài ngoằng làm vỡ khung giao diện.
- **Rà soát & thay thế toàn diện bằng thẻ `<Image>`:**
  - `PlayerAvatar.js`: Kiểm tra ảnh tùy biến (`isCustomImage`) ngay cả khi người chơi đã chết, phủ mờ và biểu tượng đầu lâu tinh tế thay vì fallback về text raw.
  - `GameOverScreen.js`: Render `<Image>` bo tròn cho avatar ảnh tùy biến trong thẻ tổng kết cuối game.
  - `VotePanel.js`: Render thumbnail `<Image>` cho người chơi trong danh sách ứng cử viên bỏ phiếu.
  - `GameScreen.js`: Render thumbnail `<Image>` mini (14x14) bo góc cho danh sách người bỏ phiếu (`discordVotersMini`).

### 💬 Tối Ưu Thanh Chat (Chat Box Clean Name Display)
- **Hiển thị tên người gửi, ẩn icon avatar:** Bỏ biểu tượng avatar trước tên người chơi trong danh sách tin nhắn chat (`ChatBox.js`). Tin nhắn giờ đây chỉ hiển thị tên người chơi cùng màu sắc định danh rõ ràng, giúp khung chat gọn gàng, tinh tế và tối ưu không gian đọc trên cả PC lẫn Mobile.

---

## [1.7.0] - 2026-10-25

### 📱💻 Tối Ưu Hóa Đa Nền Tảng (PC & Mobile Responsiveness)
- **Cơ chế Layout Tự Động Phản Ứng (Dynamic Window Dimensions):** Chuyển đổi toàn bộ cơ chế đọc độ rộng màn hình sang `useWindowDimensions()`, giúp giao diện phản hồi mượt mà ngay lập tức khi xoay ngang/dọc điện thoại hoặc co giãn cửa sổ trình duyệt trên máy tính.
- **Tối ưu Khung Chat PC & Mobile (`GameScreen` & `ChatBox`):**
  - **Trên PC (màn hình > 860px):** Khung chat được ghim cố định bên phải (Sidebar 380px) song song với sàn đấu. Nút tròn FAB nổi `💬` tự động ẩn đi để không đè lên ô nhập tin nhắn chat dưới góc phải.
  - **Trên Mobile (màn hình <= 860px):** Tự động ẩn sidebar để tối ưu toàn bộ diện tích cho các ô người chơi Discord. Nút tròn nổi `💬` hiển thị kèm huy hiệu số tin nhắn chưa đọc. Bấm vào sẽ mở khung chat dạng modal toàn màn hình, hỗ trợ nút `⬇️ Thu nhỏ` để quay lại bàn đấu tức thì.
- **Tối ưu Danh Sách Người Chơi Phòng Chờ (`LobbyScreen`):**
  - **Trên điện thoại (< 500px):** Tự động chia 3 cột avatar với kích thước chuẩn (`medium`), loại bỏ triệt để hiện tượng vỡ khung, tràn lề hoặc các avatar đè lấn nhau.
  - **Trên máy tính / tablet (>= 500px):** Hiển thị 4 cột avatar kích thước lớn (`large`) rộng rãi, sang trọng.
- **Màn Hình Kết Thúc (`GameOverScreen`):** Thẻ danh tính người chơi tự động co giãn (`45%` trên điện thoại và `150px` trên máy tính) sắc nét và hài hòa.

### 🧠 Kiểm Tra & Củng Cố Logic Các Vai Trò (Roles Logic Audit)
- **🐺 Ma Sói (Werewolf):**
  - Đồng bộ chuẩn xác quy tắc hòa phiếu đêm: Khi các Sói bất đồng quan điểm và hòa phiếu (ví dụ: 1 phiếu chọn A, 1 phiếu chọn B), Sói sẽ mất lượt cắn đêm đó và không ai chết (trước đó chọn ngẫu nhiên 1 trong 2).
  - Khóa chat Sói khi đến giờ Bỏ Phiếu (`day_vote`) và mở lại khi thảo luận/ban đêm.
  - Ngăn Sói chọn cắn đồng đội Sói và hỗ trợ cơ chế chốt/hủy chốt đổi mồi linh hoạt.
- **🔮 Tiên Tri (Seer):**
  - **Hiển thị nhãn THIỆN / ÁC dưới tên:** Sau khi Tiên Tri soi xong một người chơi, kết quả thân phận (`🕊️ PHE THIỆN` hoặc `🐺 PHE ÁC`) sẽ được hiển thị cố định ngay bên dưới tên của người đó trên ô thẻ bài của riêng Tiên Tri. Kết quả này được lưu trữ xuyên suốt trận đấu và đồng bộ cả khi tải lại trang, giúp Tiên Tri dễ dàng theo dõi và không cần phải ghi nhớ thủ công.
  - Thêm chốt chặn server chống spam soi nhiều lần trong một đêm (`seerCheck`).
  - Chặn Tiên Tri soi người đã chết từ các vòng trước hoặc tự soi chính mình.
  - Bảo mật tuyệt đối kết quả soi: chỉ tiết lộ `PHE THIỆN` hoặc `PHE ÁC`, đồng hồ tự đếm ngược 5 giây sau khi soi.
- **🛡️ Bảo Vệ (Bodyguard):**
  - Duy trì chu kỳ thức dậy đầu tiên mỗi đêm trước Sói.
  - Kiểm tra và thực thi nghiêm ngặt luật không bảo vệ cùng 1 người trong 2 đêm liên tiếp (cả client và server).
  - Cơ chế tự động rút xuống 5s khi chọn hoặc bỏ lượt; reset lại 5s nếu đổi mục tiêu.
  - Ẩn danh tuyệt đối nếu không cứu đúng người, hiển thị chiến công vinh danh khi cứu sống nạn nhân thành công.
- **🧑‍🌾 Dân Làng (Villager):**
  - Ngủ say ban đêm, thảo luận sôi nổi và bỏ phiếu ban ngày.
  - Hỗ trợ cơ chế Bỏ Phiếu Trắng (Skip Vote) bảo vệ làng an toàn khi hòa phiếu.
  - Giữ bí mật thân phận khi chết (chỉ hiện lý do chết, không lộ vai trò).

---

## [1.6.0] - 2026-10-23

### 🛡️ Thêm Vai Trò Mới: BẢO VỆ (Bodyguard Role)
- **Chu kỳ thức giấc ban đêm:** Bảo Vệ thức dậy đầu tiên trong đêm (trước cả Ma Sói) trong pha `night_bodyguard`, có 30 giây để chọn 1 người chơi che chở.
- **Cơ chế chuyển pha tự động trong 5 giây:** Khi Bảo Vệ chọn 1 người chơi mà không thay đổi thì hệ thống tự động rút thời gian xuống 5 giây để chuyển tiếp sang lượt Sói. Nếu Bảo Vệ đổi sang người khác trong 5 giây này, bộ đếm 5s sẽ được khởi tạo lại từ đầu.
- **Không chọn thì mất lượt & Cơ chế Bỏ lượt:** Nếu hết 30s không chọn ai thì mất lượt bảo vệ đêm đó. Bổ sung nút `🏳️ Bỏ qua lượt bảo vệ` để chủ động bỏ lượt và chuyển pha trong 5 giây.
- **Luật không bảo vệ 1 người 2 đêm liên tiếp:** Hệ thống lưu lịch sử mục tiêu bảo vệ (`lastProtectedTarget`), ngăn chặn và khóa (disable) không cho chọn cùng một người trong 2 đêm liên tiếp (bao gồm cả việc tự bảo vệ chính mình).
- **Cứu sống nạn nhân khỏi Ma Sói:** Nếu Sói tấn công đúng người được Bảo Vệ che chở, nạn nhân sẽ không bị chết và tiếp tục sống sót an toàn.
- **Thông báo Bình Minh có chọn lọc:**
  - **Khi bảo vệ đúng người:** Trời sáng hiển thị thông báo chiến công: *"🛡️ BẢO VỆ CỨU SỐNG THÀNH CÔNG! [Tên người chơi] đã bị Ma Sói tấn công đêm qua, nhưng được Bảo Vệ che chở an toàn! Không một ai thiệt mạng!"*.
  - **Khi không bảo vệ đúng người:** Giữ bí mật tuyệt đối về hành động của Bảo Vệ, thông báo nạn nhân bị Sói cắn chết bình thường hoặc thông báo đêm bình yên nếu Sói không cắn.
- **Tích hợp giao diện & Cấu hình:**
  - Thêm biểu tượng `🛡️`, mã màu xanh thiên thanh `#0EA5E9` vào hệ thống tokens.
  - Bổ sung cấu hình số lượng Bảo Vệ trong cài đặt phòng (`RoomSettings`), hỗ trợ tăng/giảm và tự động cân bằng số vai trò.
  - Cập nhật cẩm nang hướng dẫn vai trò (`RoleGuideModal`) và thẻ lật bài (`RoleCard`) với khẩu hiệu: `"SHIELD YOUR VILLAGE FROM CLAWS"`.
  - Hiển thị nhãn `🛡️ Che chở` và `🚫 Đêm trước` trực tiếp trên các ô người chơi Discord Tile của Bảo Vệ.

---

## [1.5.0] - 2026-10-23

### 🎨 Cập Nhật Giao Diện & Trải Nghiệm (UI/UX Updates)
- **Nút Xem Danh Sách Nhân Vật & Hướng Dẫn Chơi (LobbyScreen):** Bổ sung nút bấm sang trọng cùng biểu tượng `📖` trên thanh header phòng chờ, mở Modal cẩm nang vai trò chi tiết (`RoleGuideModal`) bao gồm mục tiêu, hành động ngày/đêm, khẩu hiệu và mẹo chiến thuật cho Ma Sói, Tiên Tri và Dân Làng.
- **Cơ chế Bỏ Phiếu Trắng (Skip Vote Checkbox):** Trong giờ biểu quyết treo cổ (`day_vote`), bổ sung checkbox `☑️ / ⬜ Bỏ phiếu trắng (Skip Vote)`. Nếu số phiếu trắng nhiều nhất hoặc hòa phiếu, làng an toàn đón đêm mới và không ai bị treo cổ.
- **Chủ phòng bỏ qua giai đoạn Vote (Host Skip Vote Button):** Chủ phòng có thêm nút `⏩ Bỏ qua Vote` ở góc trên bên phải màn hình để linh hoạt chuyển nhanh qua giai đoạn vote mà không cần đợi hết đồng hồ đếm ngược.
- **Tự động chuyển tiếp khi đủ phiếu:** Khi tất cả thành viên còn sống đều đã bỏ phiếu xong (cho người khác hoặc bỏ phiếu trắng), hệ thống tự động chốt kết quả và chuyển pha sau 0.8s.
- **Nút Tạo Phòng & Vào Phòng nhỏ gọn (HomeScreen):** Thu gọn kích thước nút về bằng 50% chiều rộng thẻ trung tâm và căn giữa đều đặn, hiển thị icon và chữ trên cùng một hàng ngang thanh thoát.
- **Sửa thông điệp chân trang (Footer Slogan):** Chuẩn hóa thành `"HAVE FUN KILLING EACH OTHER!!!"` ở cả HomeScreen và LobbyScreen.
- **Khẩu hiệu thẻ vai trò mới (RoleCard Slogans):** Cập nhật câu mô tả vai trò đậm chất hành động khi nhận thẻ bài bắt đầu trận:
  - 👨‍🌾 **Dân Làng:** `SURVIVE AND FIND THE WOLFS`
  - 🐺 **Ma Sói:** `KILL OR BE KILLED`
  - 🔮 **Tiên Tri:** `HELP YOUR TEAM WITH YOUR MAGIC`
- **Hiển thị lý do chết thay thế thông báo thân phận (Death Reasons):** Xóa dòng chữ `"❓ Thân phận: Giữ bí mật"`, thay thế bằng lý do chết trực quan:
  - Khi Sói cắn đêm: `"🐺 Lý do: Bị Ma Sói cắn chết"`
  - Khi Dân Làng biểu quyết ngày: `"⚖️ Lý do: Bị Dân Làng treo cổ"`
  - Khi hòa phiếu / bỏ phiếu trắng: `"🕊️ Hòa phiếu hoặc đa số bỏ phiếu trắng — Không ai bị treo cổ hôm nay!"`

### 🧹 Tối Ưu Hệ Thống
- **Gỡ bỏ hệ thống âm thanh:** Xóa bỏ hoàn toàn module âm thanh Web Audio (`utils/soundEffects.js`) và gỡ bỏ các triggers âm thanh khỏi GameScreen để tối giản ứng dụng.
- **Sửa lỗi hiển thị phe thắng cuộc (GameOverScreen):** Đồng bộ mã phe chiến thắng giữa client và server (`village` / `wolves`), giải quyết triệt để lỗi hiển thị sai tiêu đề phe thắng.

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

### 🔊 Hiệu Ứng Âm Thanh (Sound Effects)
- **Tiếng Sói hú khi trời tối:** Tự động phát tiếng Sói hú trong sương đêm mỗi khi chuyển sang pha Sói săn mồi (`night_wolf`).
- **Tiếng Gà gáy khi trời sáng:** Tự động phát tiếng Gà gáy khi bước vào pha thông báo bình minh (`day_announce`).
- **Tổng hợp âm thanh bằng Web Audio API (`utils/soundEffects.js`):** Âm thanh được tạo trực tiếp trên trình duyệt bằng oscillator, không cần file âm thanh ngoài, nhẹ và tải tức thì. Tự động bỏ qua an toàn trên môi trường không hỗ trợ.

### 🐛 Sửa Lỗi (Bug Fixes)
- **Sửa lỗi màn hình kết thúc hiển thị sai phe thắng (GameOverScreen):** Server gửi `winner: 'village'` nhưng màn hình so sánh với `'villagers'`, khiến khi Dân Làng thắng vẫn hiện tiêu đề đỏ `PHE MA SÓI CHIẾN THẮNG!` (trong khi dòng mô tả lại ghi Dân Làng thắng). Đã đồng bộ lại điều kiện kiểm tra phe thắng.

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
