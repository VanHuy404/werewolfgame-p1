# 🐺 CHANGELOG - MA SÓI REAL-TIME GAME

Tất cả các thay đổi, cập nhật kiến trúc và tính năng của dự án được ghi chép đầy đủ tại đây.

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
