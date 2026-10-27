# 📜 NHẬT KÝ CẬP NHẬT (UPDATE LOG) - MA SÓI ONLINE

Chào mừng các dân làng và bầy sói! Dưới đây là tổng hợp tất cả những thay đổi quan trọng nhất dành cho người chơi: **Nhân vật mới**, **Cải tiến giao diện (UI)** và các **Tính năng gameplay mới**.

---

## 🛡️ Phiên Bản 1.9.2 - HIỆU ỨNG ĐIỆN ẢNH BẢO VỆ CỨU NGƯỜI THÀNH CÔNG (KHIÊN CHẶN VUỐT SÓI)
*(Cập nhật ngày: 27/10/2026)*

### 💥 Hiệu Ứng Điện Ảnh Mới: Khiên Hộ Mệnh Chặn Đứng Vuốt Sói Buổi Sáng
- **Hoạt Ảnh Kịch Tính Khi Bảo Vệ Thành Công Người Vô Tội:**
  - Khi trời sáng và có người bị Ma Sói cắn nhưng được Bảo Vệ che chở thành công, hiệu ứng điện ảnh hoành tráng sẽ mở ra trên toàn màn hình:
    1. **Mở đầu kịch tính:** Thông báo xuất hiện dòng chữ:
       - Tiêu đề: `⚠️ MA SÓI TẤN CÔNG ĐÊM QUA!`
       - Phụ đề: `Một tiếng thét xé tan màn đêm yên bình của ngôi làng...`
       - Avatar nạn nhân hiện lên to rõ ở trung tâm với bảng tên `NẠN NHÂN ĐÊM QUA`.
    2. **Vuốt Sói lao tới:** Móng vuốt sói sắc lẹm bay bổ nhào xuống xé toạc mục tiêu.
    3. **Khiên Hiệp Sĩ bay ra chặn đứng:** Chiếc khiên gỗ viền sắt cổ điển bung ra che chắn ngay trước mặt nạn nhân. Vuốt sói va chạm trực diện vào mặt khiên kim loại:
       - **Âm thanh va chạm đanh thép:** Tiếng va chạm kim loại chói tai, rền vang ("KENGGG / CHINGGG") chân thực mô phỏng bằng Web Audio API.
       - **Tia lửa & Sóng xung kích:** 22 tia lửa kim loại rực sáng và vòng sóng xung kích ánh sáng bung nở từ điểm va chạm.
       - **Đòn đánh bị vô hiệu:** Móng vuốt sói bị dội ngược ra sau và tan biến hoàn toàn.
    4. **Khải hoàn & Bảo vệ thành công:**
       - Tiêu đề chuyển mượt sang: **`🛡️ BẢO VỆ ĐÃ BẢO VỆ THÀNH CÔNG!!`**
       - Phụ đề: `Người hùng của ngôi làng đã bảo vệ được người vô tội`
       - Bảng tên vẫn giữ nguyên `NẠN NHÂN ĐÊM QUA` và tên người chơi.
       - Huy hiệu phía dưới sáng lên: **`🛡️ ĐÃ ĐƯỢC BẢO VỆ`**.
- **Thử Nghiệm Trong Cài Đặt (Host Only):**
  - Trong bảng Cài đặt phòng (`⚙️`) mục `THỬ CÁC HIỆU ỨNG`, Chủ phòng có thêm nút `🛡️ Thử Hiệu Ứng Khiên Bảo Vệ Thành Công` để trực tiếp kiểm tra hoạt ảnh trước trận đấu.

---

## 🐺 Phiên Bản 1.9.1 - TINH CHỈNH HIỆU ỨNG SÓI CÀO & THÔNG BÁO SỐ LƯỢNG SÓI SAU TREO CỔ
*(Cập nhật ngày: 27/10/2026)*

### 🎨 Sửa Lại UI & Tinh Chỉnh Hiệu Ứng Sói Cào
- **Xóa Đổi Avatar Trong Sảnh Chờ:**
  - Dọn dẹp hoàn toàn tính năng đổi avatar trong sảnh chờ để giao diện phòng chờ gọn gàng, tránh giật lag và tập trung vào trải nghiệm sẵn sàng trận đấu.
  - Người chơi chọn và tùy chỉnh avatar ngoài màn hình chính (Home) với nút `➕` và kho biểu tượng đầy đủ (Động vật, Hoa quả, Thần bí).
- **Đổi Tên Khối Xem Trước Hiệu Ứng:**
  - Trong bảng Cài đặt phòng của chủ phòng, tiêu đề được tinh chỉnh ngắn gọn thành: **THỬ CÁC HIỆU ỨNG**.
- **Tối Ưu Giao Diện Sói Cào Nạn Nhân Buổi Sáng:**
  - Đổi nhãn bảng tên thành: **NẠN NHÂN ĐÊM QUA**.
  - Huy hiệu tử nạn bên dưới được rút gọn tinh tế, chỉ hiển thị dòng chữ: **ĐÃ BỊ SÓI CẮN**.
  - Xóa bỏ vòng tròn viền hào quang đằng sau avatar để tập trung trọn vẹn vào chân dung nạn nhân và vết cào sắc lẹm.

### ⚖️ Tính Năng Mới: Thông Báo Số Lượng Sói Còn Lại Sau Giờ Treo Cổ
- **HUD Thông Báo To Rõ Giữa Màn Hình:**
  - Ngay sau khi hết thời gian bỏ phiếu treo cổ ban ngày, một bảng thông báo điện ảnh nổi bật sẽ xuất hiện ngay giữa màn hình cho toàn bộ người chơi trong 4 giây:
    - **Kết quả biểu quyết:** Tên người chơi bị treo cổ hoặc thông báo không ai bị treo cổ.
    - **Số lượng Sói còn lại:** Hiển thị con số to rõ kèm cảnh báo số Ma Sói đang ẩn náu.
    - **Thông báo chuyển pha:** Nhắc nhở người chơi chuẩn bị bước vào Ban Đêm trước khi các vai trò (Bảo Vệ, Sói, Tiên Tri) bắt đầu thức tỉnh hành động.

---

## 🩸 Phiên Bản 1.9.0 - HIỆU ỨNG SÓI CÀO TỬ NẠN & KHO EMOTE ĐA DẠNG NÚT ➕
*(Cập nhật ngày: 27/10/2026)*

### 💥 Hiệu Ứng Mới: Ma Sói Cào Rách Avatar Buổi Sáng
- **Hoạt Ảnh Điện Ảnh Khi Có Nạn Nhân Tử Nạn:**
  - Khi trời sáng và có người bị Ma Sói cắn chết, hiệu ứng điện ảnh sẽ xuất hiện toàn màn hình cho tất cả người chơi:
    1. **Tâm Điểm Nạn Nhân:** Avatar người bị hại hiện lên to rõ ở trung tâm với vầng hào quang đẫm máu.
    2. **Vuốt Sói Xé Toạc:** 3 vệt móng vuốt đỏ thẫm sắc như dao cạo xé toạc đè lên Avatar nạn nhân kèm rung chấn màn hình, chớp sáng máu và các hạt huyết tán tung tóe.
    3. **Chuyển Hóa Đen Xám:** Avatar sau đó bị bao phủ bởi tông màu đen xám tử nạn cùng biểu tượng đầu lâu u tối và huy hiệu tử trận.
- **Thử Nghiệm Trong Cài Đặt (Host Only):**
  - Chủ phòng có nút `🩸🐺 Thử Hiệu Ứng Bị Sói Cào Tử Nạn` ngay trong bảng Cài đặt phòng (`⚙️`) để kiểm tra xem trước hoạt ảnh.

### 🎨 Sửa Lại UI: Kho Avatar Emote Đa Dạng Kèm Nút ➕
- **Nút ➕ Mở Bộ Sưu Tập Biểu Tượng Phong Phú:**
  - Bổ sung nút `➕` nổi bật bên cạnh các avatar động vật mặc định.
  - Nhấp vào nút `➕` sẽ mở bảng chọn với hàng chục icon sinh động chia theo danh mục:
    - 🐾 **Động vật:** Sói, Cáo, Gấu, Hổ, Báo, Rắn, Kỳ Lân, Bạch Tuộc, Khỉ, v.v.
    - 🍎 **Hoa quả & Món ăn:** Táo, Dâu, Chuối, Dưa hấu, Bơ, Nấm, Pizza, Bánh ngọt, v.v.
    - ⚔️ **Thần bí & Phép thuật:** Phù thủy, Ma cà rồng, Xác sống, Yêu tinh, Vương miện, Kiếm, v.v.
- **Đổi Avatar Trực Tiếp Trong Phòng Chờ (Lobby):**
  - Người chơi giờ đây có thể đổi nhanh Avatar hoặc bấm `➕` ngay tại sảnh chờ mà không cần thoát phòng. Avatar của bạn sẽ lập tức đồng bộ thời gian thực cho tất cả người chơi khác cùng thấy!

---

## ⚙️ Phiên Bản 1.8.6 - CHUYỂN THỬ HIỆU ỨNG VÀO CÀI ĐẶT DÀNH RIÊNG CHO CHỦ PHÒNG
*(Cập nhật ngày: 27/10/2026)*

### 🎨 Sửa Lại UI & Trải Nghiệm Phòng Chờ
- **Di Chuyển Khối Thử Hiệu Ứng Vào Trong Cài Đặt (Room Settings):**
  - Chuyển toàn bộ các nút `🕊️ Thử Phe Thiện` và `🐺 Thử Phe Ác` vào sâu bên trong bảng Cài đặt phòng (`⚙️`).
  - **Chỉ Chủ phòng mới có quyền xem và thử:** Người chơi thông thường vào phòng chờ sẽ không thấy khối thử hiệu ứng này, giúp giao diện sảnh chờ gọn gàng, bí mật và chuyên nghiệp.
  - Loại bỏ các nút thử nghiệm rải rác trong trận đấu thực tế để tránh làm xao nhãng người chơi.

---

## 🔮 Phiên Bản 1.8.x - ĐẠI TU HIỆU ỨNG TIÊN TRI & TRẢI NGHIỆM THAO TÁC
*(Cập nhật ngày: 26/10/2026)*

### 🎨 Sửa Lại UI & Hiệu Ứng
- **Hiệu Ứng Quả Cầu Tiên Tri Điện Ảnh:**
  - Tiên Tri khi soi sẽ thấy quả cầu pha lê ma thuật thấu thị linh hồn mục tiêu.
  - **Nếu là Ma Sói (Phe Ác):** Quả cầu nứt toác chân thực và phát nổ tung tóe thành hàng chục mảnh kính vỡ bay lóa mắt kèm rung chấn màn hình.
  - **Nếu là Phe Thiện:** Quả cầu tan biến nhẹ nhàng thành làn sóng thánh quang và bụi sao vàng lấp lánh.
- **Hình Ảnh Nhân Vật Mới Trong Quả Cầu:**
  - Hình ảnh Ma Sói hắc ám điện ảnh, mắt đỏ rực lửa.
  - Biểu tượng Mắt Thiên Sứ thần thánh (Ophanim Eye) đại diện cho Phe Thiện.
- **Mở Rộng Gấp Đôi Vùng Bấm Ô Người Chơi:**
  - Kích thước ô người chơi và avatar to hơn, giúp dễ dàng click/chạm chọn mục tiêu để soi, cắn, bảo vệ hoặc bỏ phiếu mà không lo bấm nhầm.

### ✨ Thêm Mới & Tiện Ích
- **Tên Người Chơi Dài Hơn:** Tăng độ dài đặt tên tối đa lên **20 ký tự** (thay vì 15 ký tự như trước).
- **Âm Thanh Ma Thuật Sống Động:** Tích hợp âm thanh chuông ngân ma mị, tiếng hợp âm thiên thần và tiếng kính nổ vỡ khi soi thân phận.

---

## 💬 Phiên Bản 1.7.x - NÂNG CẤP KHUNG CHAT & TỐI ƯU GIAO DIỆN BÀN ĐẤU
*(Cập nhật ngày: 25/10/2026)*

### 🎨 Sửa Lại UI & Khung Chat
- **Chữ Trong Chat Cực Nét (Viền Đen Nổi Bật):**
  - Đổi màu chữ chat sang màu trắng sáng đậm kèm viền đen sắc nét, đọc cực rõ trên mọi màn hình Ngày/Đêm mà không mỏi mắt.
- **Khung Chat Dạng Trượt (Slidebar):**
  - Trên PC: Khung chat nằm gọn bên phải, có thể thu gọn hoặc mở ra với 1 click.
  - Trên Điện thoại: Mở chat dạng trượt toàn màn hình, có nút đóng nhanh.
  - Có chấm đỏ đếm số tin nhắn mới chưa đọc khi đang đóng chat.
- **Bố Cục Bàn Đấu Thông Minh (Tự Co Giãn):**
  - Tự động chia 3 đến 5 cột khi phòng đông người (trên 6 người), giúp nhìn thấy toàn bộ người chơi mà không cần cuộn trang lên xuống.

### ✨ Thêm Mới & Trải Nghiệm Tiện Lợi
- **Gõ Chat Liên Tục:** Sau khi nhấn Gửi, con trỏ vẫn nằm trong ô chat, cho phép gõ tin nhắn tiếp theo mà không phải bấm chuột lại.
- **Xuống Dòng Trong Chat:** Hỗ trợ tin nhắn dài nhiều dòng (`Shift + Enter` trên máy tính hoặc phím Enter trên điện thoại).
- **Xem Lại Lịch Sử Chat Không Bị Giật:** Cuộn lên đọc tin nhắn cũ mà không bị tự nhảy về cuối trang khi có tin mới; có nút `⬇️ Tin mới nhất` để lướt nhanh xuống đáy.
- **Thông Báo Số Lượng Sói Giữa Màn Hình:** Sau mỗi vòng treo cổ, hệ thống hiển thị số lượng Ma Sói còn sống cực to ngay chính giữa màn hình trong 3 giây.
- **Tiên Tri Ghi Nhớ Thân Phận:** Sau khi soi ai, nhãn `🕊️ PHE THIỆN` hoặc `🐺 PHE ÁC` sẽ được ghim cố định ngay dưới tên người đó suốt trận đấu cho Tiên Tri dễ nhớ.
- **Vinh Danh Bảo Vệ Cứu Người:** Nếu đêm qua Bảo Vệ cứu sống đúng nạn nhân bị Sói cắn, trời sáng sẽ có thông báo vinh danh chiến công rõ ràng trong khung chat.

---

## 🛡️ Phiên Bản 1.6.0 - XUẤT HIỆN NHÂN VẬT MỚI: BẢO VỆ
*(Cập nhật ngày: 23/10/2026)*

### 🎭 Nhân Vật Mới: BẢO VỆ (Bodyguard) 🛡️
- **Phe:** Dân Làng (Phe Thiện).
- **Nhiệm Vụ:** Bảo vệ người vô tội khỏi nanh vuốt của Ma Sói.
- **Kỹ Năng Ban Đêm:**
  - Thức dậy đầu tiên trong đêm (trước cả Ma Sói) để chọn 1 người chơi che chở.
  - Nếu Ma Sói cắn trúng người được che chở, nạn nhân sẽ được **cứu sống an toàn** và không ai chết trong đêm đó!
- **Quy Tắc Quan Trọng:**
  - **Không được bảo vệ cùng 1 người trong 2 đêm liên tiếp** (áp dụng cả khi tự bảo vệ chính mình).
  - Có nút `🏳️ Bỏ qua lượt bảo vệ` nếu không muốn che chở cho ai.
  - Khi đã chọn mục tiêu hoặc bỏ qua, hệ thống tự động đếm ngược 5 giây để chuyển lượt nhanh sang Ma Sói.

---

## ⚖️ Phiên Bản 1.5.0 - BỎ PHIẾU TRẮNG & CẨM NANG VAI TRÒ
*(Cập nhật ngày: 23/10/2026)*

### ✨ Thêm Mới Tính Năng
- **Cơ Chế Bỏ Phiếu Trắng (Skip Vote):**
  - Trong giờ biểu quyết treo cổ, người chơi có thêm tùy chọn `☑️ Bỏ phiếu trắng`.
  - Nếu số phiếu trắng nhiều nhất hoặc số phiếu giữa các người bị nghi ngờ bằng nhau (hòa phiếu), làng sẽ an toàn qua ngày mới và **không ai bị treo cổ**.
- **Chủ Phòng Bỏ Qua Vote Nhanh:** Chủ phòng có nút `⏩ Bỏ qua Vote` để kết thúc nhanh giờ biểu quyết nếu mọi người đã thống nhất.
- **Tự Động Kết Thúc Vote Khi Đủ Phiếu:** Khi tất cả mọi người còn sống đã bỏ phiếu xong, hệ thống sẽ chốt kết quả ngay lập tức thay vì phải chờ hết giờ.
- **Sách Hướng Dẫn / Cẩm Nang Vai Trò (`📖`):**
  - Bổ sung nút bấm ngay tại Phòng chờ để xem nhanh chi tiết năng lực, mẹo chơi của từng vai trò (Ma Sói, Tiên Tri, Bảo Vệ, Dân Làng).

### 🎨 Sửa Lại UI
- **Giao Diện Trang Chủ & Phòng Chờ Tinh Gọn:** Các nút chức năng được căn chỉnh gọn gàng, hiện đại.
- **Hiển Thị Lý Do Chết Trực Quan:** Thông báo rõ ràng lý do bị loại (bị Ma Sói cắn hay bị Dân Làng treo cổ).

---

## 🐺 Phiên Bản 1.4.0 - ĐẠI TU SÓI SĂN MỒI & MÀN HÌNH TỔNG KẾT
*(Cập nhật ngày: 22/10/2026)*

### ✨ Tính Năng & Thay Đổi Gameplay
- **Bảng Điều Khiển Săn Mồi Của Sói:**
  - Sói có thể bấm chọn và đổi con mồi linh hoạt.
  - Thêm nút `🎯 Chốt mục tiêu cắn` khi cả đàn Sói đã đồng thuận một mục tiêu.
  - Thời gian săn mồi của Sói được điều chỉnh thành **1 phút 30 giây**.
- **Rút Ngắn Thời Gian Tiên Tri:** Sau khi Tiên Tri soi xong, thời gian tự động rút về **5 giây** để xem kết quả và chuyển sang trời sáng ngay.
- **Không Giới Hạn Số Lượng Người Chơi:** Phòng có thể chứa không giới hạn người tham gia, tự động tính toán số Dân Làng theo số người thực tế.

### 🎨 Sửa Lại UI
- **Màn Hình Kết Thúc Trận Riêng Biệt (GameOver Screen):**
  - Thiết kế trang tổng kết vinh danh phe thắng hoành tráng, hiển thị chi tiết danh tính và lý do sống/chết của toàn bộ người chơi.
  - Nút quay về phòng chờ tiện lợi để tiếp tục trận tiếp theo cùng nhóm bạn.
- **Hộp Đánh Dấu Checkbox:** Bổ sung ô tích `☑️` chọn mục tiêu trực quan khi Bỏ phiếu ngày và Sói cắn đêm.

---

## 🏰 Phiên Bản 1.3.0 - BÀN ĐẤU DISCORD VÀ KÊNH CHAT HANG SÓI
*(Cập nhật ngày: 22/10/2026)*

### 🎨 Sửa Lại UI
- **Bàn Đấu Phong Cách Discord Voice Box:** Từng người chơi được hiển thị dưới dạng ô hộp kính mờ sang trọng, có viền phát sáng và hiển thị trạng thái sống/chết rõ nét.
- **Hình Nền Làng Ma Sói:** Nền không gian làng quê huyền bí ban đêm phủ lớp kính mờ ma mị.
- **Hiển Thị Phiếu Bầu Trực Quan Dưới Avatar:** Xem trực tiếp ai đang bỏ phiếu cho ai theo thời gian thực ngay dưới chân avatar.

### ✨ Thêm Mới Tính Năng
- **Kênh Chat Mật "Hang Sói":** Ma Sói có kênh chat riêng biệt màu đỏ để bàn mưu tính kế mà dân làng không thể nhìn thấy (kênh này sẽ tạm khóa trong giờ treo cổ để công bằng).
- **Giữ Bí Mật Thân Phận Khi Chết:** Khi một người chơi qua đời, hệ thống không công bố vai trò của họ để tăng tính phán đoán cho các vòng sau.

---

## 🎨 Phiên Bản 1.1.0 - 1.2.0 - TỰ TẢI AVATAR & BỘ SƯU TẬP THÚ CƯNG
*(Cập nhật ngày: 21/10/2026 - 22/10/2026)*

### ✨ Thêm Mới Tính Năng
- **Tải Ảnh Đại Diện Từ Thiết Bị:** Người chơi có thể tự do tải ảnh bất kỳ từ điện thoại hoặc máy tính làm avatar cá nhân (hệ thống tự động nén nhẹ và sắc nét).
- **Bộ Sưu Tập Avatar Ngộ Nghĩnh:** Có sẵn dàn avatar biểu tượng đáng yêu (`🐺 🦊 🐻 🐱 🐶 🦁 🐯 🐼`) để chọn nhanh.
- **Sao Chép Mã Phòng 1 Chạm:** Bấm nút sao chép mã phòng để gửi cho bạn bè nhanh chóng.
- **Chơi Tiếp Không Cần Tạo Phòng:** Hết trận, chỉ cần bấm "Trở về phòng chờ" là cả nhóm giữ nguyên phòng và sẵn sàng cho ván mới.

---

## 🌕 Phiên Bản 1.0.0 - KHỞI NGUYÊN MA SÓI ONLINE
*(Cập nhật ngày: 21/10/2026)*

### 🎭 Các Nhân Vật Cơ Bản
- **🐺 Ma Sói:** Thức dậy lúc nửa đêm để sát hại một dân làng.
- **🔮 Tiên Tri:** Thức dậy mỗi đêm để soi thân phận một người (biết thuộc Phe Thiện hay Phe Ác).
- **🧑‍🌾 Dân Làng:** Ngủ say ban đêm, thức dậy bàn luận và tìm ra kẻ giả mạo để treo cổ vào ban ngày.

### ✨ Tính Năng Nền Tảng
- Đấu trường Ma Sói trực tuyến thời gian thực (Real-time).
- Vòng lặp ngày đêm tự động: Đêm xuống $\rightarrow$ Bình minh công bố $\rightarrow$ Thảo luận $\rightarrow$ Biểu quyết treo cổ.
- Tùy chỉnh số lượng người chơi và số lượng từng vai trò theo ý muốn của chủ phòng.
