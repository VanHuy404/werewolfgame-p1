# 📜 NHẬT KÝ CẬP NHẬT (UPDATE LOG) - MA SÓI ONLINE

Chào mừng các dân làng và bầy sói! Dưới đây là thông tin chi tiết về các bản cập nhật mới nhất của **Ma Sói Online**, tập trung vào tính năng mới, cân bằng vai trò và tối ưu hóa trải nghiệm người chơi.

## ⚔️ Phiên Bản 2.5.5 - ĐỒNG BỘ NÉM THUỐC ĐỘC BIẾN MẤT, BỎ VÒNG TRÒN VÀ CHÈN VIDEO THỔI SÁO TỬ NẠN
*(Cập nhật ngày: 05/11/2026)*

### 🧪 Đồng Bộ Hoạt Ảnh Thuốc Độc Sang Dạng Ném Xoay Tít & Vỡ Tan Biến Mất:
- **Áp Dụng Cho Tất Cả Các Modal Thuốc Độc:**
  - `WitchPoisonModal.js` (Phù Thủy Hạ Độc Trong Đêm / Xung Đột Khiên & Độc).
  - `ThreeWayClashModal.js` (Đại Chiến 3 Phe: Bảo Vệ + Ma Sói + Phù Thủy).
  - `DualKillClashModal.js` (Cả Sói & Phù Thủy Cùng Giết).
- **Diễn Hoạt Ném Chân Thực:**
  - Bình thuốc độc từ góc trên phải xoay tít 360 độ bay vụt thẳng vào ngực nạn nhân (`translateX: 200 -> 0`, `translateY: -120 -> 0`, `scale: 0.4 -> 1.15`).
  - Khi đập trúng nạn nhân: Bình vỡ toang, nảy to và **biến mất hoàn toàn** (`opacity: 1 -> 0`, `scale: 1.15 -> 1.8`), bung tỏa hạt độc dược tím rực rỡ, không còn bị lưu lại cứng đờ trên màn hình.

### 🚫 Xóa Bỏ Hoàn Toàn Vòng Tròn Đằng Sau Của Hoạt Ảnh Sói & Phù Thủy:
- Đã gỡ bỏ 100% vòng tròn hào quang (`auraRing`) đằng sau avatar trong `DualKillClashModal.js`, giúp avatar nạn nhân nổi bật thanh thoát, sắc nét và không bị rối mắt.

### 🎬 Chèn Video Điện Ảnh "The_Piper_Death.mp4" Trước Hoạt Ảnh Thổi Sáo Tử Nạn:
- **Trình Chiếu Video Trước Khi Kích Hoạt Hoạt Ảnh:**
  - Khi Người Thổi Sáo bị tiêu diệt (`PiedPiperPurifiedModal`), game sẽ ưu tiên phát video điện ảnh độc quyền `assets/videos/The_Piper_Death.mp4` toàn màn hình.
  - Video chạy hết hoàn toàn (`onEnded`) thì hoạt ảnh Cây Sáo Thần gãy đôi và câu chú giải trừ lời nguyền mới chính thức xuất hiện.
  - Tích hợp nút **"Bỏ qua video ⏭️"** ở góc màn hình để người chơi có thể lướt nhanh nếu muốn.
  - Máy chủ backend đã hỗ trợ phục vụ tĩnh trực tiếp thư mục `assets` qua endpoint `/assets/...`.

---

## ⚔️ Phiên Bản 2.5.4 - HOẠT ẢNH TRỪNG PHẠT KÉP (SÓI & PHÙ THỦY), GIỮ QUYỀN CHỦ PHÒNG & KHÔI PHỤC THÔI MIÊN KHI F5
*(Cập nhật ngày: 05/11/2026)*

### 🐺🧪 Hoạt Ảnh Độc Quyền Khi Cả Sói & Phù Thủy Cùng Giết 1 Người:
- **Đòn Trừng Phạt Kép Điện Ảnh:** Khi Ma Sói cào xé và Phù Thủy ném thuốc độc vào cùng một nạn nhân trong đêm (không có Bảo Vệ đỡ), game kích hoạt modal điện ảnh đặc biệt `DualKillClashModal`.
- **Câu Thoại Niệm Chú:** Dòng chữ chạy typewriter nổi bồng bềnh bên trên nạn nhân:
  > *"Cả thiện và ác đều nhắm vào ngươi , kẻ phản bội"*
- **Diễn Hoạt Tuần Tự Chuẩn Xác (Sói Cào Trước - Thuốc Độc Ném Sau):**
  1. **Sói Cào Trước & Lưu Lại Vết Cào:** Nanh vuốt sói chém vụt qua avatar kèm chớp sáng đỏ, máu bắn tung tóe. **Vết cào sói được lưu lại vĩnh viễn in hằn trên ngực nạn nhân**.
  2. **Thuốc Độc Ném Vào Rồi Biến Mất:** Phù Thủy ném bình thuốc độc xoay tít bay vào ngực nạn nhân, đập vỡ toang chấn động rồi **biến mất hoàn toàn**, giải phóng 24 giọt độc dược tím bung tỏa đè lên vết cào sói.
  3. **Tử Nạn:** Avatar chuyển tông đen xám tử nạn, dập huy hiệu `💀 BỊ CẢ SÓI & PHÙ THỦY TIÊU DIỆT`.
- **SFX Web Audio API Độc Quyền:** Phân tách âm thanh 4 lớp riêng biệt: Tiếng cào xé vuốt sói (`clawSlash`) ➔ Tiếng ném bình trong gió (`potionThrow`) ➔ Tiếng vỡ choang và độc dược nổ bung (`poisonBurst`) ➔ Tiếng chuông tử thần u ám (`death`).
- **Giao Diện Cài Đặt Phòng:** Đẩy nút thử hoạt ảnh *"🐺🧪 Thử Hoạt Ảnh Sói & Phù Thủy Cùng Giết"* lên nằm ngay dưới nhóm tương tác giữa Bảo Vệ và Phù Thủy để người chơi dễ dàng tìm kiếm và thử nghiệm.

### 🎶 Tăng Thời Gian Hoạt Ảnh Thắng Của Người Thổi Sáo:
- Tăng thời gian hiển thị hoạt ảnh chiến thắng điện ảnh `PiedPiperVictoryModal` thêm 2.0 giây (từ 2.2s lên 4.2s), giúp người chơi và phòng chiêm ngưỡng trọn vẹn màn vinh danh mặt trăng kỳ ảo của Phe Thứ 3 trước khi vào bảng tổng kết.

### 👑 Giữ Vững Quyền Chủ Phòng Khi Tải Lại Trang (F5):
- Khắc phục triệt để lỗi chủ phòng tải lại trang bị mất quyền chủ phòng.
- Máy chủ ghi nhận `hostPlayerName` và tự động khôi phục `hostId` cho chủ phòng khi kết nối lại (cả ở phòng chờ lẫn trong trận đấu), đồng bộ thời gian thực đến tất cả người chơi trong phòng.

### 🌀 Khôi Phục Trạng Thái Bị Thôi Miên Khi F5:
- Khắc phục lỗi người chơi bị Người Thổi Sáo thôi miên khi reload trang (F5) bị mất dấu ấn thôi miên.
- Máy chủ tự động hoán đổi socket ID cũ sang socket ID mới trong `charmedPlayers` và `charmedHistory`, đồng thời lưu `charmed = true` trên đối tượng người chơi để đảm bảo không bao giờ bị mất trạng thái.

---

## 🎶 Phiên Bản 2.5.3 - HOẠT ẢNH TỬ NẠN ĐỘC QUYỀN: CÂY SÁO THẦN GÃY ĐÔI & HÓA GIẢI LỜI NGUYỀN
*(Cập nhật ngày: 05/11/2026)*

### 🎋 Thiết Kế Hoạt Ảnh Chết Khác Biệt Hoàn Toàn 100% Với Tất Cả Role Khác:
- **Loại Bỏ Khung Avatar Tròn:** Không sử dụng avatar nhân vật đằng sau, toàn bộ sân khấu tập trung tuyệt đối vào Cây Sáo Thần giữa không gian ma thuật u tịch.
- **Cây Sáo Nằm Trọn Vẹn Trong Viền Tím Đằng Sau:** Định vị góc xoay `34deg` chuẩn xác theo trục thân sáo, giúp cây sáo nằm ngang phẳng phiu 100% nằm gọn gàng bên trong khung viền hào quang tím (`fluteAuraGlow`).
- **19 Nốt Nhạc Ma Thuật Xung Quanh:** Bổ sung đàn nốt nhạc 19 chiếc (`🎶`, `🎵`, `♪`, `♫`, `♬`, `♩`, `𝄞`, `𝄢`) với các sắc tím, vàng, xanh bay lơ lửng nhấp nhô so le nhịp nhàng xung quanh cây sáo.
- **Kịch Bản Phân Đoạn & Dòng Chữ Trượt Lên:**
  1. **Giai Đoạn 1 (Dòng chữ tím ma thuật & Nốt nhạc xung quanh):** Bỏ toàn bộ textbox ở dưới. Dòng chữ màu tím sáng (`#E9D5FF`) với hiệu ứng hào quang tím lung linh chạy gõ từng ký tự bên trên cây sáo, kèm các nốt nhạc ma thuật (`🎶`, `🎵`, `♪`, `♫`) nhấp nhô lơ lửng xung quanh:
     - `🎶 Người thổi sáo "[Tên người chơi]" đã chết 🎵`
  2. **Giai Đoạn 2 (Sáo vỡ đôi & Tiếng tre gãy/sáo rít):** Cây sáo chuyển sang trạng thái gãy đôi nảy giật chấn động, bung tỏa 24 nốt nhạc ma thuật tím/xanh/vàng và phát SFX độc quyền.
  3. **Giai Đoạn 3 (Sau khi sáo vỡ mới hiện Lời Nguyền Hóa Giải):** Chỉ sau khi cây sáo đã vỡ đôi hoàn toàn, dòng chữ mới trượt lên phát sáng rực rỡ:
     - `✨ Lời nguyền tiếng sáo đã bị hóa giải ✨` (Sáo Chuyển Qua Ảnh Vỡ & SFX Tre Gãy/Sáo Rít): (Đòn Chí Mạng & Sáo Gãy):**
     - Màn hình chớp sáng và rung chấn dữ dội.
     - Cây sáo chuyển sang hình ảnh sáo gãy đôi tách nền sạch sẽ, nảy giật chấn động và bung nở 24 nốt nhạc ma thuật cùng tia sáng tím/xanh/vàng rực rỡ.
     - **SFX Web Audio API Độc Quyền:**
       + Tiếng tre già nứt gãy đanh thép (`bamboo crack/splinter`)
       + Tiếng sáo rít lên lần cuối trong tuyệt vọng (`dying screech`) rồi tuột dốc tần số tắt lịm
       + Tiếng sub-bass thud rền vang chấn động.
  3. **Giai Đoạn 3 (Hoàn Tất & Giữ 1.0s):** Hoạt ảnh kết thúc giữ lại đúng 1.0s trước khi tự động đóng để chuyển sang màn Thanh Tẩy Hoàng Kim.

---

### ⚡ Tối Giản Giao Diện: Chạy Ngầm Toàn Bộ Bộ Đếm Tự Động Chuyển
- **Ẩn Các Dòng Thông Báo Chuyển Động Rườm Rà:**
  - Loại bỏ hoàn toàn các dòng chữ đếm ngược như *"⏳ Tự động chuyển bảng tổng kết sau: 5s"* hay *"⏳ Tự động chuyển vai trò tiếp theo sau 5s..."*.
  - Bỏ phần đếm giây hiển thị trong nút bấm (ví dụ `⚰️ ĐÃ HIỂU (4s)` ➔ đổi thành `⚰️ ĐÃ HIỂU` gọn gàng).
  - Bỏ thông báo đệm *"🌙 Chuẩn bị bước vào Ban Đêm..."* sau bảng treo cổ.
- **Vận Hành Tự Nhiên, Trơn Tru:** Các bộ đếm thời gian và chuyển tiếp tuần tự vẫn hoạt động ngầm chính xác 100% trong nền (nếu người chơi không bấm bỏ qua thì game vẫn tự động chuyển mượt mà), mang lại giao diện tinh gọn, điện ảnh và chuyên nghiệp.

---

## 🎶 Phiên Bản 2.5.1 - PHƯƠNG ÁN 1: HỘI THÔI MIÊN TỈNH GIẤC, CỨU PHE THỨ 3 & HOÀN THIỆN THANH TẨY
*(Cập nhật ngày: 04/11/2026)*

### 🔮 Triển Khai Phương Án 1: 5s Rạng Sáng Chỉ Hội Thôi Miên Mới Thấy Nhau
- **Bảo Vệ Người Thổi Sáo Khỏi Bị Loại Trừ:**
  - Trong 5 giây trước bình minh (`NIGHT_CHARMED_REVEAL`), **chỉ những người cùng bị thôi miên** (và Người Thổi Sáo) mới hé mắt nhìn thấy nhau và thấy huy hiệu `🎶 CÙNG BỊ THÔI MIÊN`.
  - Dân làng và Ma Sói (những người chưa bị thôi miên) hoàn toàn không thấy huy hiệu của ai, giao diện hiển thị đêm ngủ yên bình, tránh việc cả làng dùng phương pháp loại trừ để tìm ra Người Thổi Sáo.
  - Thông báo chat hệ thống chỉ gửi riêng cho hội người bị thôi miên và Người Thổi Sáo, giữ tuyệt mật thông tin trước bình minh.

### 🧙‍♀️ Sửa Lỗi Phù Thủy Không Thể Cứu Người Thổi Sáo (Phe Thứ 3)
- **Luôn Thấy Nạn Nhân & Cứu Được Tất Cả:**
  - Khắc phục triệt để lỗi bất đồng bộ state khiến modal Cứu của Phù Thủy bị nhảy cóc sang hỏi dùng thuốc độc khi đến pha đêm.
  - Phù Thủy luôn thấy rõ nạn nhân bị Sói cắn đêm nay (kể cả Người Thổi Sáo thuộc Phe Thứ 3) và có quyền bấm `🟢 CỨU SỐNG` hoặc `❌ BỎ MẶC`.
  - Khi Phù Thủy cứu Người Thổi Sáo, Người Thổi Sáo được hồi sinh an toàn, bùa mê tiếng sáo không bị xóa và sáng hôm sau có thông báo Phù Thủy cứu sống.

### 👑 Thống Nhất Tên Gọi: Đổi Toàn Bộ "Phe Độc Lập" Thành "Phe Thứ 3"
- **Chuẩn Hóa Thuật Ngữ:** Đổi toàn bộ các văn bản, hướng dẫn và thông báo chiến thắng từ "Phe Độc Lập" thành **"Phe Thứ 3"**:
  - Tóm tắt vai trò trong trận: `Thuộc: Phe Thứ 3 🎶`
  - Sổ tay nhân vật: `Phe Thứ 3`, mục tiêu mang về chiến thắng cho Phe Thứ 3.
  - Màn hình kết thúc trận: `PHE THỨ 3 (NGƯỜI THỔI SÁO) CHIẾN THẮNG!` và `👑 PHE THỨ 3 TOÀN THẮNG 👑`.

### ⚖️ Hoàn Thiện Chuỗi Hiệu Ứng Cuối Ngày: Thanh Tẩy Cuối Ngày Không Lộ Số Lượng
- **Bảng Treo Cổ Chỉ Hiển Thị Số Lượng Sói:**
  - Bảng sau giờ bỏ phiếu chỉ hiển thị thông báo người bị treo cổ và **🐺 SỐ LƯỢNG SÓI CÒN LẠI**, bỏ hoàn toàn mục hiển thị số người bị thôi miên để đồng bộ với tính bí mật của Phương Án 1.
  - Khung chat hệ thống sau vote cũng chỉ ghi nhận số Sói còn lại.
- **Thanh Tẩy Hoàng Kim Chạy Vào Cuối Ngày Trước Khi Vào Màn Đêm:**
  1. Hết giờ vote ➔ Hiển thị Bảng Treo Cổ & Số Lượng Sói Còn Lại (3.8s) ➔ Đóng bảng.
  2. Nếu người bị treo cổ là Người Thổi Sáo ➔ Mở Hoạt Ảnh Người Thổi Sáo Chết (4.5s) ➔ Đóng hoạt ảnh.
  3. **Cuối ngày trước khi vào màn đêm:** Mới kích hoạt **Thanh Tẩy Hoàng Kim** trên màn hình chính (3.5s): Ánh sáng vàng rực rỡ, chuông synth ngân vang, xóa sạch dấu ấn bùa mê và hiện banner thanh tẩy.
  4. Màn đêm buông xuống (server nâng thời gian chờ chuyển pha lên **14.5s** khi Người Thổi Sáo chết để mọi người xem trọn vẹn, không bao giờ bị đè hiệu ứng).

### ⚡ Tối Giản Giao Diện: Chạy Ngầm Toàn Bộ Bộ Đếm Tự Động Chuyển
- **Ẩn Các Dòng Thông Báo Chuyển Động Rườm Rà:**
  - Loại bỏ hoàn toàn các dòng chữ đếm ngược như *"⏳ Tự động chuyển bảng tổng kết sau: 5s"* hay *"⏳ Tự động chuyển vai trò tiếp theo sau 5s..."*.
  - Bỏ phần đếm giây hiển thị trong nút bấm (ví dụ `⚰️ ĐÃ HIỂU (4s)` ➔ đổi thành `⚰️ ĐÃ HIỂU` gọn gàng).
  - Bỏ thông báo đệm *"🌙 Chuẩn bị bước vào Ban Đêm..."* sau bảng treo cổ.
- **Vận Hành Tự Nhiên, Trơn Tru:** Các bộ đếm thời gian và chuyển tiếp tuần tự vẫn hoạt động ngầm chính xác 100% trong nền (nếu người chơi không bấm bỏ qua thì game vẫn tự động chuyển mượt mà), mang lại giao diện tinh gọn, điện ảnh và chuyên nghiệp.

### ⚡ Tối Giản Giao Diện: Chạy Ngầm Toàn Bộ Bộ Đếm Tự Động Chuyển
- **Ẩn Các Dòng Thông Báo Chuyển Động Rườm Rà:**
  - Loại bỏ hoàn toàn các dòng chữ đếm ngược như *"⏳ Tự động chuyển bảng tổng kết sau: 5s"* hay *"⏳ Tự động chuyển vai trò tiếp theo sau 5s..."*.
  - Bỏ phần đếm giây hiển thị trong nút bấm (ví dụ `⚰️ ĐÃ HIỂU (4s)` ➔ đổi thành `⚰️ ĐÃ HIỂU` gọn gàng).
  - Bỏ thông báo đệm *"🌙 Chuẩn bị bước vào Ban Đêm..."* sau bảng treo cổ.
- **Vận Hành Tự Nhiên, Trơn Tru:** Các bộ đếm thời gian và chuyển tiếp tuần tự vẫn hoạt động ngầm chính xác 100% trong nền (nếu người chơi không bấm bỏ qua thì game vẫn tự động chuyển mượt mà), mang lại giao diện tinh gọn, điện ảnh và chuyên nghiệp.

### ⚡ Tối Giản Giao Diện: Chạy Ngầm Toàn Bộ Bộ Đếm Tự Động Chuyển
- **Ẩn Các Dòng Thông Báo Chuyển Động Rườm Rà:**
  - Loại bỏ hoàn toàn các dòng chữ đếm ngược như *"⏳ Tự động chuyển bảng tổng kết sau: 5s"* hay *"⏳ Tự động chuyển vai trò tiếp theo sau 5s..."*.
  - Bỏ phần đếm giây hiển thị trong nút bấm (ví dụ `⚰️ ĐÃ HIỂU (4s)` ➔ đổi thành `⚰️ ĐÃ HIỂU` gọn gàng).
  - Bỏ thông báo đệm *"🌙 Chuẩn bị bước vào Ban Đêm..."* sau bảng treo cổ.
- **Vận Hành Tự Nhiên, Trơn Tru:** Các bộ đếm thời gian và chuyển tiếp tuần tự vẫn hoạt động ngầm chính xác 100% trong nền (nếu người chơi không bấm bỏ qua thì game vẫn tự động chuyển mượt mà), mang lại giao diện tinh gọn, điện ảnh và chuyên nghiệp.

---

## 🌟 Phiên Bản 2.4.0 - PHÙ THỦY SONG THUỐC, NÂNG CẤP THỢ SĂN & TƯƠNG TÁC TAY BA
*(Cập nhật ngày: 30/10/2026)*

### 🧙‍♀️ Phù Thủy Có Thể Dùng Cả 2 Bình Thuốc Trong 1 Đêm
- **Song Dược Xuất Kích:** Phù Thủy giờ đây có thể vừa hồi sinh con mồi bị Sói cắn, vừa ném bình độc kết liễu một kẻ tình nghi trong cùng một đêm duy nhất!
- **Chuỗi Hoạt Ảnh Sáng Liền Mạch:** Nếu Phù Thủy dùng cả 2 bình, khi trời sáng hệ thống sẽ tự động chiếu hoạt ảnh **Cứu Sống** trước, sau đó chuyển mượt sang hoạt ảnh **Ném Thuốc Độc** để toàn bộ người chơi cùng theo dõi diễn biến.

### 🏹 Nâng Cấp Hiệu Ứng Thợ Săn Bắn Hạ
- **Đồng Bộ Phát Bắn & Hoạt Ảnh Tử Nạn:**
  - **Bắn vào Dân:** Hoạt ảnh gục ngã phủ xám tử nạn xuất hiện cùng lúc ngay khi tiếng súng nổ vang trời.
  - **Bắn vào Sói:** Mục tiêu lộ nguyên hình Ma Sói đỏ rực ngay sau khi khóa tâm ngắm (trước khi dòng chữ chạy ra), sau đó tiếng súng nổ vang trời và cùng lúc gục ngã tử trận.
- **Gục Ngã Tự Nhiên:** Loại bỏ hiệu ứng kính vỡ ở cả phát bắn vào Dân lẫn Sói, giúp hình ảnh kết liễu rõ nét và chân thực.
- **Bảo Mật Thân Phận Khi Tử Nạn:** Thợ Săn khi qua đời sẽ chuyển sang trạng thái Hồn Ma bí mật như tất cả mọi người, không bị lộ vai trò nếu tử trận do trúng độc.

### 🛡️ Hoạt Ảnh Tương Tác Ba Bên (Bảo Vệ + Ma Sói + Phù Thủy)
- **Tương Tác Đè Hiệu Ứng Liên Tục:** Khi Bảo Vệ bảo vệ con mồi bị Sói cắn nhưng Phù Thủy lại ném độc vào người đó, một hoạt ảnh điện ảnh đặc biệt sẽ mở ra:
  1. Nanh vuốt Ma Sói lao vào tấn công.
  2. Khiên Hộ Mệnh bay ra đỡ đòn thành công tóe lửa, vuốt Sói tan biến.
  3. Ngay lập tức, Bình Độc Phù Thủy bay vụt tới đập vỡ toang vào Khiên, khiến Khiên tan rã.
  4. Câu thoại bí ẩn xuất hiện bằng phông chữ tím ma thuật: *"Số phận của ngươi vẫn không thoát khỏi cái chết đâu"*.
  5. Nạn nhân gục ngã và thông báo tử nạn do thuốc độc.
- **Xem Thử Trong Cài Đặt:** Chủ phòng có thể xem trước hoạt ảnh này ngay trong bảng Cài Đặt phòng.

### ⚡ Tối Giản Giao Diện: Chạy Ngầm Toàn Bộ Bộ Đếm Tự Động Chuyển
- **Ẩn Các Dòng Thông Báo Chuyển Động Rườm Rà:**
  - Loại bỏ hoàn toàn các dòng chữ đếm ngược như *"⏳ Tự động chuyển bảng tổng kết sau: 5s"* hay *"⏳ Tự động chuyển vai trò tiếp theo sau 5s..."*.
  - Bỏ phần đếm giây hiển thị trong nút bấm (ví dụ `⚰️ ĐÃ HIỂU (4s)` ➔ đổi thành `⚰️ ĐÃ HIỂU` gọn gàng).
  - Bỏ thông báo đệm *"🌙 Chuẩn bị bước vào Ban Đêm..."* sau bảng treo cổ.
- **Vận Hành Tự Nhiên, Trơn Tru:** Các bộ đếm thời gian và chuyển tiếp tuần tự vẫn hoạt động ngầm chính xác 100% trong nền (nếu người chơi không bấm bỏ qua thì game vẫn tự động chuyển mượt mà), mang lại giao diện tinh gọn, điện ảnh và chuyên nghiệp.

---

## 🎯 Phiên Bản 2.3.0 - HOÀN THIỆN PHÁT SÚNG TRĂN TRỐI & KHUNG TRƯỢT KẾT THÚC
*(Cập nhật ngày: 30/10/2026)*

### 🏹 Phát Súng Báo Thù Của Thợ Săn
- **Kích Hoạt Mượt Mà Khi Bị Loại:** Dù bị dân làng treo cổ ban ngày hay bị bầy Sói cắn trong đêm, Thợ Săn luôn hiển thị đầy đủ bảng chọn mục tiêu nổ súng hoặc chọn bắn chỉ thiên.
- **Không Khí Căng Thẳng:** Toàn làng sẽ nín thở theo dõi thông báo Thợ Săn chuẩn bị bóp cò phát súng trăn trối kéo theo một kẻ xuống mồ.

### 🧙‍♀️ Quy Trình Phù Thủy Hết Thuốc
- Thông báo Phù Thủy đã hết bình cứu sẽ chỉ xuất hiện từ đêm tiếp theo (kèm đồng hồ đếm ngược 5 giây trước khi chuyển sang bước hỏi dùng bình độc).

### 📜 Thẻ Trượt Ngang Danh Tính Tổng Kết (Game Over)
- Toàn bộ danh tính người chơi ở màn hình kết thúc được đưa vào khung trượt ngang mượt mà, hiển thị đẹp mắt và không bị tràn viền trên cả điện thoại lẫn máy tính.

### ⚡ Tối Giản Giao Diện: Chạy Ngầm Toàn Bộ Bộ Đếm Tự Động Chuyển
- **Ẩn Các Dòng Thông Báo Chuyển Động Rườm Rà:**
  - Loại bỏ hoàn toàn các dòng chữ đếm ngược như *"⏳ Tự động chuyển bảng tổng kết sau: 5s"* hay *"⏳ Tự động chuyển vai trò tiếp theo sau 5s..."*.
  - Bỏ phần đếm giây hiển thị trong nút bấm (ví dụ `⚰️ ĐÃ HIỂU (4s)` ➔ đổi thành `⚰️ ĐÃ HIỂU` gọn gàng).
  - Bỏ thông báo đệm *"🌙 Chuẩn bị bước vào Ban Đêm..."* sau bảng treo cổ.
- **Vận Hành Tự Nhiên, Trơn Tru:** Các bộ đếm thời gian và chuyển tiếp tuần tự vẫn hoạt động ngầm chính xác 100% trong nền (nếu người chơi không bấm bỏ qua thì game vẫn tự động chuyển mượt mà), mang lại giao diện tinh gọn, điện ảnh và chuyên nghiệp.

---

## 📱 Phiên Bản 2.2.0 - TỐI ƯU TOÀN DIỆN DI ĐỘNG & ĐỒNG MINH MA SÓI
*(Cập nhật ngày: 30/10/2026)*

### 📱 Trải Nghiệm Mượt Mà Trên Mọi Dòng Điện Thoại
- **Khung Chat Tinh Gọn:** Bảng chat trên điện thoại thu gọn vừa vặn, cỡ chữ và ô nhập liệu rõ ràng, dễ đọc mà không che khuất đấu trường.
- **Tự Động Co Giãn Vừa Khung Hình:** Bàn đấu và các thẻ người chơi tự động điều chỉnh kích thước theo màn hình, không bị tràn viền hay xuất hiện thanh cuộn ngang.
- **Thanh Nút Thao Tác Nằm Gọn:** Tất cả các nút bấm hành động (Soi, Cắn, Cứu, Độc, Bảo Vệ, Biểu Quyết) đều nằm gọn trong khung hình, chữ to rõ ràng.

### 🐺 Khóa Cắn Đồng Đội & Nhận Biết Bầy Sói
- **Không Thể Cắn Đồng Minh:** Bầy Sói không thể tự chọn cắn chính mình hoặc đồng đội.
- **Huy Hiệu Đồng Minh Nổi Bật:** Phe Sói luôn nhìn thấy huy hiệu `🐺 BẠN LÀ SÓI` và `🐺 ĐỒNG MINH SÓI` dưới tên nhau suốt cả ngày lẫn đêm.

### 🧙‍♀️ Nâng Cấp Tầm Nhìn Của Phù Thủy
- **Luôn Biết Ai Bị Cắn:** Dù còn hay đã hết bình cứu, Phù Thủy vẫn luôn thấy rõ người bị Sói tấn công trong đêm.
- **Tự Chuyển Nhanh Khi Hết Thuốc:** Khi đã dùng hết cả 2 bình thuốc, lượt Phù Thủy chỉ kéo dài 10 giây để quan sát con mồi rồi tự động chuyển sang vai trò tiếp theo mà không cần bấm gì.

### ⚡ Tối Giản Giao Diện: Chạy Ngầm Toàn Bộ Bộ Đếm Tự Động Chuyển
- **Ẩn Các Dòng Thông Báo Chuyển Động Rườm Rà:**
  - Loại bỏ hoàn toàn các dòng chữ đếm ngược như *"⏳ Tự động chuyển bảng tổng kết sau: 5s"* hay *"⏳ Tự động chuyển vai trò tiếp theo sau 5s..."*.
  - Bỏ phần đếm giây hiển thị trong nút bấm (ví dụ `⚰️ ĐÃ HIỂU (4s)` ➔ đổi thành `⚰️ ĐÃ HIỂU` gọn gàng).
  - Bỏ thông báo đệm *"🌙 Chuẩn bị bước vào Ban Đêm..."* sau bảng treo cổ.
- **Vận Hành Tự Nhiên, Trơn Tru:** Các bộ đếm thời gian và chuyển tiếp tuần tự vẫn hoạt động ngầm chính xác 100% trong nền (nếu người chơi không bấm bỏ qua thì game vẫn tự động chuyển mượt mà), mang lại giao diện tinh gọn, điện ảnh và chuyên nghiệp.

---

## 🏹 Phiên Bản 2.1.0 - VAI TRÒ MỚI: THỢ SĂN (HUNTER 🏹)
*(Cập nhật ngày: 29/10/2026)*

### 🏹 Vai Trò Mới: Thợ Săn (Phe Dân Làng)
- **Năng Lực Tối Thượng - Phát Súng Trăn Trối:** Khi Thợ Săn chết (bị Sói cắn đêm hoặc bị treo cổ ngày), Thợ Săn có 12 giây để chọn nổ súng kết liễu một kẻ tình nghi cùng xuống mồ, hoặc chọn bắn chỉ thiên nếu không muốn bắn nhầm dân làng.
- **Hiệu Ứng Điện Ảnh Bắn Súng:** Tâm ngắm đỏ rực khóa chặt mục tiêu, âm thanh súng nổ đanh thép và nạn nhân gục ngã ngay tại chỗ.

### ⚖️ Cân Bằng Số Lượng Vai Trò Chức Năng
- Các vai trò đặc biệt (Tiên Tri, Bảo Vệ, Phù Thủy, Thợ Săn) được cố định số lượng tối đa 1 người mỗi ván để đảm bảo tính cân bằng và chiến thuật sâu sắc cho trận đấu.

### 🎨 Tinh Gọn Bộ Sưu Tập Avatar Biểu Tượng
- Bỏ tính năng tải ảnh từ máy tính phức tạp, chuyển sang kho biểu tượng cảm xúc sinh động (Động vật, Hoa quả & Món ăn, Thần bí) mở bằng nút `➕`, giúp game load nhanh và không giật lag.

### ⚡ Tối Giản Giao Diện: Chạy Ngầm Toàn Bộ Bộ Đếm Tự Động Chuyển
- **Ẩn Các Dòng Thông Báo Chuyển Động Rườm Rà:**
  - Loại bỏ hoàn toàn các dòng chữ đếm ngược như *"⏳ Tự động chuyển bảng tổng kết sau: 5s"* hay *"⏳ Tự động chuyển vai trò tiếp theo sau 5s..."*.
  - Bỏ phần đếm giây hiển thị trong nút bấm (ví dụ `⚰️ ĐÃ HIỂU (4s)` ➔ đổi thành `⚰️ ĐÃ HIỂU` gọn gàng).
  - Bỏ thông báo đệm *"🌙 Chuẩn bị bước vào Ban Đêm..."* sau bảng treo cổ.
- **Vận Hành Tự Nhiên, Trơn Tru:** Các bộ đếm thời gian và chuyển tiếp tuần tự vẫn hoạt động ngầm chính xác 100% trong nền (nếu người chơi không bấm bỏ qua thì game vẫn tự động chuyển mượt mà), mang lại giao diện tinh gọn, điện ảnh và chuyên nghiệp.

---

## 🧙‍♀️ Phiên Bản 2.0.x - RA MẮT PHÙ THỦY & NÂNG CẤP ĐIỆN ẢNH BAN MAI
*(Cập nhật ngày: 28/10/2026)*




### 🪈✨ Đột Phá Hoạt Ảnh Điện Ảnh: Người Thổi Sáo Tử Nạn & Cây Sáo Thần Vỡ Đôi Nằm Ngang Rực Nốt Nhạc
- **Tách Nền Trong Suốt & Đặt Nằm Ngang:**
  - Hình ảnh cây sáo gãy đôi chân thực với các nốt nhạc ma thuật tím/xanh được xử lý tách sạch 100% nền studio thành file `assets/flute_broken.png`.
  - Góc nghiêng cây sáo được tinh chỉnh xoay ngang `-38deg` đặt vắt ngang qua ngực Avatar trung tâm cực kỳ cân đối và hoành tráng (chiều rộng 250px).
- **Diễn Hoạt "Vỡ Đôi" Kịch Tính & Độc Đáo:**
  - **Giai đoạn Ban đầu:** Cây sáo thần nguyên vẹn `flute.png` nằm ngang bồng bềnh trước ngực Avatar, tỏa hào quang tím ma mị huyền bí.
  - **Giai đoạn Đòn chí mạng (1.1s):**
    - Sấm sét giáng xuống, màn hình rung chấn mạnh mẽ và chớp sáng chói lòa.
    - Cây sáo nguyên vẹn biến mất, **thay thế tức thì bằng cây sáo gãy đôi `flute_broken.png`**!
    - Hai nửa sáo gãy nảy spring giật chấn động (scale 1.25 -> 1.0) kèm góc gãy chao đảo, các nốt nhạc ma thuật tím và xanh bung nở rực rỡ từ điểm gãy, kết hợp 20 tia lửa ma thuật bắn tung tóe khắp màn hình.
  - **Giai đoạn Tử nạn (1.85s):** Avatar và cây sáo gãy chuyển sang tông xám u tối, huy hiệu `💀 NGƯỜI THỔI SÁO ĐÃ CHẾT` dập xuống và thông báo Ánh Sáng Hoàng Kim Thanh Tẩy rực rỡ xuất hiện.

### ⚡ Tối Ưu Nhịp Độ Ván Đấu: Giảm Thời Gian Giữ Sau Hoạt Ảnh Xuống 1.0 Giây & Đồng Bộ Chuẩn Xác Toàn Diện
- **Giảm Thời Gian Giữ Xuống Đúng 1.0 Giây:**
  - Sau khi các hiệu ứng kỹ xảo điện ảnh hoàn tất, modal chỉ lưu lại thêm đúng **1.0s** (thay vì 2.0s) để người chơi nắm bắt thông tin nhanh chóng, giúp nhịp độ ván đấu mượt mà, gãy gọn, không gây cảm giác chờ đợi lâu.
  - Chi tiết thời gian tồn tại mới của 10 Modal:
    1. `PiedPiperPurifiedModal` (Thổi Sáo Tử Nạn): Diễn hoạt 2.35s + 1.0s = **3.35s** (3350ms).
    2. `PiedPiperVictoryModal` (Thổi Sáo Chiến Thắng): Diễn hoạt 1.2s + 1.0s = **2.2s** (2200ms).
    3. `HunterShotModal` (Thợ Săn Bắn Hạ): Diễn hoạt 3.5s + 1.0s = **4.5s** (4500ms).
    4. `WolfClawAttackModal` (Sói Cào Xé): Diễn hoạt 2.4s + 1.0s = **3.4s** (3400ms).
    5. `WitchHealSaveModal` (Phù Thủy Hồi Sinh): Diễn hoạt 4.95s + 1.0s = **5.95s** (5950ms).
    6. `BodyguardSaveModal` (Khiên Đỡ Đòn): Diễn hoạt 2.35s + 1.0s = **3.35s** (3350ms).
    7. `ThreeWayClashModal` (Xung Đột 3 Bên): Diễn hoạt 4.85s + 1.0s = **5.85s** (5850ms).
    8. `WitchPoisonModal` (Phù Thủy Hạ Độc): Diễn hoạt 4.2s + 1.0s = **5.2s** (5200ms).
    9. `PiedPiperModal` (Thôi Miên Trong Đêm): Diễn hoạt 3.4s + 1.0s = **4.4s** (4400ms).
    10. `SeerInspectionModal` (Tiên Tri Soi): Diễn hoạt 3.5s + 1.0s = **4.5s** (4500ms).
- **Đồng Bộ Chuẩn Xác Giữa Server & Client:**
  - **Sáng sớm (`DAY_ANNOUNCE`):** Tinh chỉnh thời gian hiển thị tuần tự (13s khi có 2 modal, 19s khi có 2 modal và Thổi Sáo chết, 14s khi Thổi Sáo chết đơn lẻ).
  - **Thợ Săn Bắn Thổi Sáo:** Dời thời điểm phát tin nhắn chat `[THANH TẨY HOÀNG KIM]` về đúng lúc modal Thổi Sáo đóng (8.0s), thời gian chuyển pha tổng rút gọn về 13s (hoặc 6.5s nếu bắn mục tiêu khác).
  - **Treo Cổ Thổi Sáo:** Tin nhắn chat phát chuẩn xác tại 7.5s (ngay khi modal Thổi Sáo đóng và Thanh Tẩy trên màn hình bắt đầu), thời gian vào đêm rút gọn về 12.5s (hoặc 5.0s nếu người khác bị treo).
  - **GameScreen Client:** Cập nhật các bộ đếm ngầm fallback khớp tuyệt đối từng mili-giây với thời gian đóng mới của từng Modal.

### 🎬 Tối Ưu Hóa Trải Nghiệm Điện Ảnh (Cinematic Experience): Bỏ Skip & Giữ Đúng 2s Sau Khi Hoạt Ảnh Chạy Hết
- **Loại Bỏ Hoàn Toàn Nút Skip / Đóng Thủ Công:**
  - Xóa bỏ tất cả các nút bấm đóng sớm ("BỎ QUA ⏩", "ĐÃ HIỂU", "⚰️ ĐÃ HIỂU", "✨ ĐÃ HIỂU", "🛡️ ĐÃ HIỂU") và các huy hiệu đếm ngược ("⏳ ...s") trên toàn bộ các modal hoạt ảnh điện ảnh.
  - Các sự kiện và cutscene điện ảnh diễn ra trọn vẹn và liền mạch, loại bỏ tình trạng người chơi vô tình bấm đóng làm trôi mất câu chuyện hoặc gây lỗi lệch pha hoạt ảnh.
- **Tự Động Đóng Chính Xác Sau Khi Hoạt Ảnh Kết Thúc Đúng 2.0 Giây:**
  - Hoạt ảnh diễn hoạt đầy đủ 100% các phân đoạn kỹ xảo (sấm sét, vỡ sáo, tâm ngắm, súng nổ, móng vuốt cào, khiên đỡ kim loại, bình độc nổ tung, hào quang thôi miên, quả cầu tiên tri lộ diện).
  - Khi kỹ xảo hoàn tất, màn hình được giữ nguyên thêm đúng **2.0s** để người chơi nắm trọn kết quả sự kiện, sau đó hệ thống tự động đóng hoặc chuyển tiếp tuần tự ngầm sang bước kế tiếp.
- **Áp Dụng Cho Toàn Bộ 10 Hoạt Ảnh Điện Ảnh:**
  1. `PiedPiperPurifiedModal` (Người Thổi Sáo Tử Nạn / Thanh Tẩy): Diễn hoạt 2.35s + 2.0s = **4.35s**.
  2. `PiedPiperVictoryModal` (Người Thổi Sáo Chiến Thắng): Diễn hoạt 1.2s + 2.0s = **3.2s**.
  3. `HunterShotModal` (Phát Súng Trăn Trối Của Thợ Săn): Diễn hoạt 3.5s + 2.0s = **5.5s**.
  4. `WolfClawAttackModal` (Ma Sói Cào Xé Tử Nạn): Diễn hoạt 2.4s + 2.0s = **4.4s**.
  5. `WitchHealSaveModal` (Phù Thủy Hồi Sinh Bằng Bình Cứu): Diễn hoạt 4.95s + 2.0s = **6.95s**.
  6. `BodyguardSaveModal` (Khiên Hiệp Sĩ Bảo Vệ Thành Công): Diễn hoạt 2.35s + 2.0s = **4.35s**.
  7. `ThreeWayClashModal` (Xung Đột Tay Ba: Sói + Khiên + Độc): Diễn hoạt 4.85s + 2.0s = **6.85s**.
  8. `WitchPoisonModal` (Phù Thủy Hạ Độc Mục Tiêu): Diễn hoạt 4.2s + 2.0s = **6.2s**.
  9. `PiedPiperModal` (Người Thổi Sáo Mê Hoặc Trong Đêm): Diễn hoạt 3.4s + 2.0s = **5.4s**.
  10. `SeerInspectionModal` (Mắt Thần Tiên Tri Soi Linh Hồn): Diễn hoạt 3.5s + 2.0s = **5.5s**.
- **Đồng Bộ Hoàn Hảo Với GameScreen:**
  - Bộ đếm tự động chuyển tiếp ngầm giữa các modal trong `GameScreen.js` được tinh chỉnh khớp chuẩn xác với thời gian diễn hoạt mới của từng modal.

### 🧙‍♀️ Ra Mắt Vai Trò Mới: Phù Thủy (Phe Dân Làng)
- **Bậc Thầy Độc Dược:** Sở hữu 2 bình thuốc quyền năng (mỗi bình dùng 1 lần trong cả trận):
  - 🧪 **Bình Cứu:** Hồi sinh người bị Ma Sói cắn trong đêm. Phù Thủy có thể tự cứu chính mình nếu bị cắn.
  - ☠️ **Bình Độc:** Tiêu diệt ngay một người chơi bất kỳ vào ban đêm. Không thể tự độc chính mình.
- **Kho Thuốc Mini:** Biểu tượng 2 bình thuốc phát sáng nằm ngay cạnh tên vai trò, mờ đi khi đã sử dụng.
- **Quy Tắc Độc Dược:** Độc của Phù Thủy xuyên thủng Khiên Bảo Vệ (khiên không thể ngăn được độc dược).

### 🐺 Tối Ưu Bỏ Phiếu Của Bầy Sói
- Ban đêm, bầy Sói bấm chọn con mồi trực tiếp và hiển thị số lượng phiếu bầu theo thời gian thực dưới chân avatar mục tiêu.

### 🎬 Trì Hoãn Công Bố Thắng Thua Cho Đến Khi Hết Hoạt Ảnh
- Hệ thống luôn chiếu đầy đủ toàn bộ hoạt ảnh điện ảnh buổi sáng (Sói cào, Cứu sống, Khiên đỡ, Ném độc) trước khi công bố phe chiến thắng, giúp người chơi hiểu rõ nguyên nhân thắng bại.

### ⚡ Tối Giản Giao Diện: Chạy Ngầm Toàn Bộ Bộ Đếm Tự Động Chuyển
- **Ẩn Các Dòng Thông Báo Chuyển Động Rườm Rà:**
  - Loại bỏ hoàn toàn các dòng chữ đếm ngược như *"⏳ Tự động chuyển bảng tổng kết sau: 5s"* hay *"⏳ Tự động chuyển vai trò tiếp theo sau 5s..."*.
  - Bỏ phần đếm giây hiển thị trong nút bấm (ví dụ `⚰️ ĐÃ HIỂU (4s)` ➔ đổi thành `⚰️ ĐÃ HIỂU` gọn gàng).
  - Bỏ thông báo đệm *"🌙 Chuẩn bị bước vào Ban Đêm..."* sau bảng treo cổ.
- **Vận Hành Tự Nhiên, Trơn Tru:** Các bộ đếm thời gian và chuyển tiếp tuần tự vẫn hoạt động ngầm chính xác 100% trong nền (nếu người chơi không bấm bỏ qua thì game vẫn tự động chuyển mượt mà), mang lại giao diện tinh gọn, điện ảnh và chuyên nghiệp.

---

## 🛡️ Các Mốc Cập Nhật Quan Trọng Trước Đó (v1.0 - v1.9)

- **v1.9 (27/10/2026):**
  - Ra mắt hoạt ảnh điện ảnh **Khiên Bảo Vệ chặn đứng vuốt Sói** và **Ma Sói cào rách Avatar nạn nhân**.
  - Hiển thị thông báo số lượng Ma Sói còn lại to rõ giữa màn hình sau mỗi vòng treo cổ.
- **v1.8 (26/10/2026):**
  - Nâng cấp **Quả Cầu Tiên Tri ma thuật**: Nứt vỡ khi gặp Sói và tỏa ánh kim quang khi gặp người vô tội.
  - Tăng độ dài tên người chơi lên 20 ký tự; chuyển toàn bộ nút thử hoạt ảnh vào bảng Cài Đặt của Chủ Phòng.
- **v1.7 (25/10/2026):**
  - Khung chat dạng trượt (Slidebar) tiện lợi, chữ chat có viền đen dễ đọc trên mọi nền sáng tối.
  - Tự động chia cột bàn đấu thông minh khi phòng đông người; Tiên Tri tự động ghi nhớ nhãn soi thân phận.
- **v1.6 (23/10/2026):**
  - Ra mắt vai trò **Bảo Vệ (Bodyguard 🛡️)** với nhiệm vụ bảo vệ người vô tội khỏi nanh vuốt Sói (không được bảo vệ cùng 1 người 2 đêm liên tiếp).
- **v1.3 - v1.5 (22/10 - 23/10/2026):**
  - Thêm cơ chế **Bỏ Phiếu Trắng**; ra mắt kênh chat mật màu đỏ **Hang Sói** cho bầy sói bàn kế hoạch ban đêm; bổ sung **Cẩm Nang Vai Trò (`📖`)**.
- **v1.0 (21/10/2026):**
  - Khởi nguyên Ma Sói Online với 3 vai trò nền tảng: **Ma Sói**, **Tiên Tri**, **Dân Làng** cùng đấu trường thời gian thực tự động ngày và đêm.
