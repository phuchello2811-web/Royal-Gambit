# ♞ Cờ Vua

Web chơi cờ vua viết bằng HTML, CSS và JavaScript thuần: không cần build. Thư viện duy nhất là [PeerJS](https://peerjs.com/), chỉ được tải khi bạn dùng chế độ Online.

## Tính năng

- Đủ luật cờ vua: nhập thành, bắt tốt qua đường, phong cấp (chọn Hậu/Xe/Tượng/Mã)
- Nhận biết chiếu, chiếu hết, hết nước đi (pat), luật 50 nước, lặp lại 3 lần, không đủ quân
- Chơi 2 người trên cùng máy, hoặc đấu với máy ở 3 mức độ (Dễ / Trung bình / Khó), có nút **Gợi ý** nước đi
- **Online**: tạo phòng, gửi mã hoặc link mời cho bạn bè; có chat, xin hòa, xin thua, chơi ván mới (đổi màu)
- **Học cờ**: 16 bài tương tác – cách đi từng quân, nhập thành, bắt tốt qua đường, phong cấp, chiếu, chiếu hết, đòn chĩa, đòn xiên. Tiến độ được lưu trên trình duyệt
- Giao diện mới: quân cờ SVG, **kéo thả** hoặc bấm để đi, hiệu ứng trượt quân, âm thanh, chuột phải để đánh dấu ô, 5 màu bàn cờ
- Gợi ý các nước đi hợp lệ, tô sáng nước vừa đi và vua đang bị chiếu
- **Elo và bảng xếp hạng**: điểm tăng/giảm sau mỗi ván với máy (Dễ 800 / Trung bình 1200 / Khó 1600) hoặc online. Ván có dùng Đi lại / Gợi ý không tính điểm; bỏ ván giữa chừng bị tính thua
- Biên bản ván đấu theo ký hiệu đại số (SAN), hiện quân đã ăn và chênh lệch lực lượng
- Đi lại, xoay bàn cờ, dùng tốt trên điện thoại

## Chạy thử

Mở file `index.html` bằng trình duyệt là chơi được.

Chế độ Online cần mạng Internet. Hai trình duyệt kết nối trực tiếp với nhau qua WebRTC; máy chủ công cộng miễn phí của PeerJS chỉ dùng để hai bên tìm thấy nhau. Link mời có dạng `…/index.html?room=MÃPHÒNG`, nên nên đăng trang lên GitHub Pages để gửi link cho bạn bè.

## Cấu trúc

| File | Nội dung |
|------|----------|
| `index.html` | Khung trang |
| `style.css` | Giao diện |
| `chess.js` | Engine luật cờ: sinh nước đi, kiểm tra chiếu, kết thúc ván |
| `ai.js` | AI: tìm kiếm negamax, cắt tỉa alpha-beta, đánh giá thế cờ |
| `lessons.js` | Nội dung các bài học |
| `learn.js` | Chế độ học cờ |
| `online.js` | Chế độ chơi online (PeerJS / WebRTC) |
| `profile.js` | Hồ sơ, Elo, cài đặt, bảng xếp hạng (Firebase) |
| `sound.js` | Âm thanh nước đi (Web Audio) |
| `config.js` | Cấu hình Firebase cho bảng xếp hạng toàn cầu |
| `firebase-rules.json` | Luật bảo mật dán vào Firebase |
| `pieces/` | Bộ quân cờ SVG |
| `app.js` | Vẽ bàn cờ, xử lý thao tác, chuyển chế độ |

## Bật bảng xếp hạng toàn cầu (tùy chọn)

Khi chưa cấu hình, Elo chỉ lưu trên trình duyệt của mỗi người. Để mọi người cùng chung một bảng xếp hạng (miễn phí):

1. Vào <https://console.firebase.google.com>, tạo project mới.
2. **Build → Authentication → Get started → Sign-in method**: bật **Anonymous**.
3. **Build → Realtime Database → Create database** (chọn khu vực Singapore), rồi sang tab **Rules**, dán toàn bộ nội dung file `firebase-rules.json` và bấm **Publish**.
4. **Project settings → General**: tạo một Web app nếu chưa có, chép **Web API Key**; chép địa chỉ database ở trang Realtime Database.
5. Điền 2 giá trị đó vào `config.js`.

Mỗi trình duyệt được cấp một tài khoản ẩn danh và chỉ sửa được điểm của chính mình. Luật trên server chặn tạo điểm khống (bắt đầu từ 1200, mỗi ván thay đổi tối đa ±40, cách nhau ít nhất 10 giây). Tuy vậy điểm vẫn do trình duyệt tự tính, nên người rành kỹ thuật vẫn có thể gian lận dần; đây là bảng xếp hạng cho vui, không phải giải đấu.

## Đăng lên GitHub Pages

1. Đẩy code lên một repository GitHub.
2. Vào **Settings → Pages**.
3. Ở mục **Source** chọn **Deploy from a branch**, branch `main`, thư mục `/ (root)`, rồi bấm **Save**.
4. Sau khoảng 1 phút, trang có địa chỉ `https://<tên-tài-khoản>.github.io/<tên-repo>/`.

## Bản quyền

Bộ quân cờ `pieces/` là bộ *cburnett* của Colin M.L. Burnett, phát hành theo giấy phép GPLv2+ (lấy từ [lichess-org/lila](https://github.com/lichess-org/lila)).
