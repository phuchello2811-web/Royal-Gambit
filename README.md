# <img width="64" height="64" alt="image" src="https://github.com/user-attachments/assets/78f0a244-6b0c-4638-8bcf-cd04c28ed057" />
 Royal Gambit

<img width="1774" height="887" alt="image" src="https://github.com/user-attachments/assets/f57a991c-6397-4ca3-bb62-2f321fc01434" />

Web chơi cờ vua viết bằng HTML, CSS và JavaScript thuần: không cần build. Thư viện duy nhất là [PeerJS](https://peerjs.com/), chỉ được tải khi bạn dùng chế độ Online.

## Tính năng

- **Trang chủ** (tab đầu tiên, hoặc bấm logo): lời chào, rank + thanh exp, Elo, số ván, tỉ lệ thắng, chuỗi ngày học, số câu đố đã giải; thẻ **Ván đang dở** (bấm Tiếp tục để quay lại bàn); 4 nút bắt đầu nhanh (Chơi với máy, Online, Câu đố, Học cờ); **Câu đố hôm nay**; danh sách **Việc hôm nay** (giải câu đố, mục tiêu học, ôn Sổ luyện lỗi, chơi 1 ván); 5 ván gần đây; contest đang / sắp diễn ra kèm đếm ngược; top 5 Elo; **Khai cuộc hôm nay**. Vào web là mở Trang chủ (trừ khi vào bằng link mời phòng)
- **Contest**: lọc Đang diễn ra / Sắp diễn ra / Đã kết thúc / Của tôi; mỗi contest hiện đồng hồ đếm ngược, số người tham gia, nhà vô địch. Trang chi tiết có thanh tiến độ thời gian, thống kê, thẻ "Thành tích của bạn", **link chia sẻ** (`#contest/<id>` mở thẳng contest đó), **Thêm vào lịch** (file .ics, nhắc trước 10 phút) và nút **Sửa** cho admin (đổi tên / mô tả; đổi giờ khi chưa bắt đầu)
- **Nhật ký ván**: lưu riêng theo tài khoản (tối đa 100 ván) và **đồng bộ qua tài khoản** ở bản Firebase: chơi trên máy tính thì mở trên điện thoại vẫn thấy, xoá ở máy này thì máy kia cũng xoá, chơi lúc mất mạng thì có mạng lại tự đồng bộ (dòng trạng thái ☁ trong hộp Nhật ký). **Cần dán lại `firebase-rules.json` mới (có mục `history`) rồi bấm Publish**; ghi đối thủ, màu quân, Elo ± và độ chính xác; thống kê tổng, lọc Thắng / Hòa / Thua và theo chế độ, tìm kiếm, nhóm theo ngày, bàn cờ thu nhỏ. **Xem lại** từng nước trên bàn, **Phân tích** / **Xem phân tích** (xếp loại từng nước), sao chép / **tải PGN** các ván đang lọc. Ván 2 người cùng máy hiện "Trắng thắng / Đen thắng" và không tính vào tỉ lệ thắng của bạn
- **Nhập PGN / FEN** (nút **Nhập PGN** trong Nhật ký): dán PGN một ván từ chess.com, lichess… (chấp nhận chú thích, đồng hồ `[%clk]`, biến phụ, ký hiệu `$1`, `0-0`…), chọn bên bạn cầm (tự nhận ra nếu tên trong PGN trùng tên tài khoản), web lưu ván, phân tích bằng Stockfish rồi mở chế độ xem lại từng nước. Dán một thế cờ FEN thì thế cờ được đặt lên bàn 2 người
- **Mũi tên và đánh dấu**: chuột phải kéo từ ô này sang ô khác để vẽ mũi tên, chuột phải bấm một ô để đánh dấu ô; bấm chuột trái hoặc đi nước là xoá. Khi xem phân tích, mũi tên xanh chỉ nước tốt nhất
- **Tự lưu ván đang dở**: ván đấu máy / 2 người / ván tập được lưu sau mỗi nước; tải lại trang hay tắt trình duyệt rồi vào lại thì ván được khôi phục (ván tính Elo vẫn tính Elo, đồng hồ giữ thời gian còn lại)
- **Bàn cờ nổi 3D** (mặc định bật): khung bàn có độ dày, ô có cạnh vát, ánh sáng phủ, quân có bóng đổ và nhấc lên khi rê chuột / khi được chọn. Tuỳ chọn **Góc nhìn nghiêng 3D**: bàn nghiêng ra sau, quân đứng thẳng trên bàn (vẫn bấm và kéo thả bình thường). Bật / tắt trong Hồ sơ › Cài đặt
- **Bảng xếp hạng**: 3 bảng **Rank · Elo · Huy chương**, bục top 3, tìm người chơi, thẻ "Vị trí của bạn" (cách người phía trên bao nhiêu)
- **Bảng quản trị**: ô thống kê (người chơi, hoạt động 7 ngày, tổng ván, admin, bị mute), lọc / sắp xếp, **mute có thời hạn** (1 giờ / 1 ngày / 7 ngày / vĩnh viễn) kèm lý do, **xuất CSV**, và **Thông báo toàn web** (thanh ở đầu trang cho mọi người, 3 kiểu, tự ẩn sau 1–7 ngày). **Cần dán lại `firebase-rules.json` mới (có mục `announce`) rồi bấm Publish**
- **Phân tích ván kiểu chess.com**: sau mỗi ván (đấu máy, Online, 2 người cùng máy, từ 8 nước), Stockfish chạy ngay trên máy chấm **mọi nước của cả hai bên** và xếp loại: **Thiên tài !!** (thí quân mà thế cờ vẫn tốt), **Tuyệt vời !** (nước duy nhất giữ được thế cờ), Tốt nhất, Xuất sắc, Nước tốt, Lý thuyết (còn trong sách khai cuộc), Thiếu chính xác ?!, Sai lầm ?, **Bỏ lỡ** (không trừng phạt được sai lầm của đối thủ), Nước hớ ??, Bắt buộc. Hộp kết quả có độ chính xác hai bên, bảng đếm từng loại và đồ thị đánh giá; bấm **Xem lại từng nước** để duyệt ván trên bàn: biểu tượng loại nước hiện ở ô vừa đi và trong biên bản, kèm lời nhận xét, điểm đánh giá và nước nên đi. Bản phân tích được lưu vào Nhật ký (nút **Xem phân tích**). Stockfish đi kèm là bản 10 (cũ) nên vài nước khai cuộc lạ có thể bị chấm nặng tay hơn chess.com
- **Sổ luyện lỗi (huấn luyện viên riêng)**: tối đa 3 nước hớ / sai lầm / bỏ lỡ nặng nhất của bạn mỗi ván được biến thành **câu đố riêng từ chính ván của bạn**, ôn theo kiểu lặp lại ngắt quãng (đúng thì gặp lại sau 1 → 3 → 7 → 21 ngày, sai thì gặp lại sau 10 phút). Ôn trong mục Câu đố; tab Câu đố hiện số thế cờ đến hạn. Nước khác nước của máy nhưng tốt ngang ngửa vẫn được tính đúng. Không có Stockfish thì dùng bộ đánh giá dự phòng của `ai.js` (yếu hơn). Dữ liệu lưu trong trình duyệt theo tài khoản (`coach.js`)
- **Chọn ngôn ngữ Tiếng Việt / English**: nút ngôn ngữ ở thanh bên, màn đăng nhập và Hồ sơ › Cài đặt. Toàn bộ giao diện và nội dung đều có tiếng Anh: bản dịch giao diện nằm trong `i18n.js` (thêm câu mới: thêm một dòng vào `EN` hoặc `TPL`), mô tả khai cuộc / tàn cuộc / câu đố có bản tiếng Anh ngay trong `library.js`, `puzzles.js`, và nội dung 106 bài Học cờ có bản tiếng Anh trong `lessons-en.js` (sửa / thêm bài trong `lessons.js` thì thêm dòng tương ứng)
- **Bảng đấu máy**: chọn đối thủ bằng thẻ (Tốt Con 800 · Mã Chiến 1200 · Hậu Đen 1600), màu quân Trắng / Ngẫu nhiên / Đen, thời gian bằng nút bấm; khi đang đánh, phần cài đặt thu gọn thành thẻ tóm tắt
- **Sảnh Online**: thẻ Tìm trận nhanh (kèm rank, Elo của bạn), thẻ Chơi với bạn bè, màn tìm trận dạng radar, mã phòng hiển thị lớn, chat dạng bong bóng
- Đủ luật cờ vua: nhập thành, bắt tốt qua đường, phong cấp (chọn Hậu/Xe/Tượng/Mã)
- Nhận biết chiếu, chiếu hết, hết nước đi (pat), luật 50 nước, lặp lại 3 lần, không đủ quân
- Chơi 2 người trên cùng máy, hoặc đấu với máy ở 3 mức độ (Dễ / Trung bình / Khó), có nút **Gợi ý** nước đi
- **Online**: bấm **Tìm trận** để tự ghép với người khác đang tìm trận, hoặc tạo phòng và gửi mã / link mời cho bạn bè; có chat, xin hòa, xin thua, chơi ván mới (đổi màu). **Đối thủ thoát / mất kết nối quá 15 giây thì bị xử thua**: hai bên gửi tín hiệu "nhịp tim" mỗi 2 giây, im lặng 5 giây thì hiện đếm ngược. Đóng tab hay tải lại trang giữa ván cũng bị tính thua (trừ ở lần mở web sau)
- **Contest**: tab **Contest** cạnh tab Online. Chỉ **admin** tạo được contest. Người chơi **đăng ký trước giờ bắt đầu**; đến giờ web **tự ghép cặp** những người đã đăng ký, ván xong tự ghép ván tiếp. Thắng +2 điểm, hòa +1, thua 0. Kết thúc contest, hạng 1 / 2 / 3 nhận **huy chương Vàng / Bạc / Đồng** hiện trong trang Hồ sơ và bảng xếp hạng; bảng điểm contest đã kết thúc có bục trao giải
- **Học cờ kiểu Duolingo**: 106 bài trong 12 phần, từ làm quen bàn cờ tới chiếu hết 2 nước, tàn cuộc, khai cuộc và ván đấu với máy. Có lộ trình zig-zag, 3 tim mỗi bài, sao, XP, chuỗi ngày học, mục tiêu hằng ngày và bài kiểm tra **Nhảy cóc**. Đầu lộ trình có thẻ tổng quan (phần đang học, bài tiếp theo, vòng tiến độ khoá học, mục tiêu hôm nay, Học tiếp / Luyện tập); mỗi phần có số sao và **cúp** cuối phần; thẻ **Thành tích** với 8 huy hiệu; câu hỏi trắc nghiệm không cần bàn cờ hiện thành màn hỏi đáp rộng; học xong có nút **Học bài tiếp theo** và thanh tiến độ của phần
- Giao diện mới: quân cờ SVG, **kéo thả** hoặc bấm để đi, hiệu ứng trượt quân, âm thanh, chuột phải để đánh dấu ô, 12 kiểu bàn cờ (3 bàn gradient có viền **toả sáng** và vệt sáng lướt qua)
- **Skin quân cờ**: 5 bộ quân riêng (Hoàng gia, Pha lê, Gỗ khắc, Ngọc, Cyber phát sáng), mỗi bộ có màu riêng cho quân Trắng và quân Đen, cùng 6 kiểu lọc màu cho bộ gốc. Đổi trong Hồ sơ › Cài đặt. Các bộ quân được tạo từ bộ cburnett bằng `node tools/make-skins.js` (thêm skin: sửa danh sách `SKINS` trong file đó)
- Gợi ý các nước đi hợp lệ, tô sáng nước vừa đi và vua đang bị chiếu
- Thanh đánh giá thế cờ cạnh bàn (ước lượng nhanh bằng hàm đánh giá của `ai.js`) khi chơi với máy / 2 người; tự ẩn trong ván Online, khi học cờ và khi giải câu đố
- **Tài khoản**: phải đăng nhập hoặc đăng ký (tên đăng nhập + mật khẩu) mới vào chơi được; có ảnh đại diện, đăng xuất trong trang Hồ sơ
- **Trang Hồ sơ** (bấm tên mình ở thanh bên, địa chỉ `#profile`): Elo và trình độ, rank kèm sao và tiến độ lên rank, tỉ lệ thắng / hòa / thua, biểu đồ diễn biến Elo, tủ huy chương contest, lịch sử contest, tiến độ học cờ, ván gần đây và cài đặt giao diện. **Bấm vào huy chương (hoặc một dòng lịch sử contest) là mở thẳng bảng điểm contest đó.** Bấm tên người khác trên bảng xếp hạng / bảng điểm contest để xem hồ sơ của họ (`#profile/<uid>`), kèm số Elo được / mất nếu đấu với họ. Biểu đồ Elo lấy từ lịch sử lưu trong trình duyệt nên chỉ có từ lúc cập nhật bản này, và chỉ hiện trên hồ sơ của chính mình
- **Bảng xếp hạng toàn thế giới**: tab **Xếp hạng** cạnh tab Online, xếp theo exp rank, có thêm cột Elo
- **Admin**: tài khoản tên **ADMIN** (chủ web) có thêm tab **Admin** cạnh tab Online để cấp / thu hồi quyền admin cho người khác. Admin được dùng nút **Gợi ý** trong ván Online, và dùng Gợi ý vẫn được tính Elo và rank. Tên đăng nhập không được trùng nhau (không phân biệt hoa thường)
- **Rank kiểu Free Fire** (chỉ tính ván Online): thắng +15 exp, hòa +5 exp, thua -10 exp. Cứ 30 exp được 1 sao, đủ 3 sao thì lên rank tiếp theo: Đồng → Bạc → Vàng → Bạch Kim → Kim Cương → Cao Thủ → Thách Đấu. Ván Online dưới 4 nước không tính; rời ván giữa chừng bị tính thua
- **Elo kiểu chess.com** (hệ thống riêng, không ảnh hưởng rank): lần đầu đăng nhập phải chọn trình độ (ví dụ Expert = 1200 Elo). Cả ván Online lẫn ván đấu với máy đều tính Elo; thắng đối thủ mạnh hơn được nhiều hơn
- Biên bản ván đấu theo ký hiệu đại số (SAN), hiện quân đã ăn và chênh lệch lực lượng
- **Đồng hồ cờ** khi đấu với máy hoặc 2 người cùng máy: 1 phút, 3+2, 5, 10, 15+10. Hết giờ là thua (hòa nếu đối phương chỉ còn Vua). Ván Online chưa có đồng hồ
- **Tên khai cuộc** hiện ngay dưới ô trạng thái khi đang chơi (bộ khai cuộc trong `openings.js`, thêm dòng mới vào cuối là được)
- **Câu đố**: 23 câu (chiếu hết 1–2 nước, chĩa đôi, ghim, xiên, chiếu mở, phong cấp), đều đã kiểm chứng bằng bộ giải. Câu nhiều nước thì máy tự đáp trả bằng nước chống cự dai nhất; mọi nước chiếu hết đúng đều được chấp nhận. Có **câu đố hôm nay** kèm chuỗi ngày, đánh dấu câu đã giải, lọc theo độ khó
- **Thư viện khai cuộc**: 76 khai cuộc chia 6 nhóm (Gambit, Ván mở, Nửa mở, Ván đóng, Ấn Độ & 1.d4, Khai cuộc cánh), có cả Gambit Alien, Jerome, Halloween, Vienna, Tấn công Marshall và Bongcloud, và 13 thế tàn cuộc kinh điển. Có ô tìm kiếm (gõ không dấu cũng được), xem lại từng nước trên bàn minh hoạ, **Tập với máy** (máy đi lại đúng chuỗi nước, bạn cầm bên chọn khai cuộc đó) hoặc đặt lên bàn 2 người. Ván tập từ Thư viện không tính Elo, nhưng vẫn hiện kết quả, lưu vào Nhật ký và được Sổ luyện lỗi chấm. Khai cuộc chỉ lưu chuỗi nước trong `library.js`, thế cờ được tính tự động nên luôn khớp
- **Tuỳ chọn** trong trang Hồ sơ: bật / tắt toạ độ, chấm nước đi hợp lệ, hiệu ứng trượt quân, tự phong Hậu, và **thông báo trình duyệt** khi contest đã đăng ký sắp bắt đầu (5 phút trước và lúc bắt đầu; cần mở web trong một tab)
- Bấm **?** để xem bảng phím tắt; pháo giấy khi thắng, giành huy chương hoặc giải câu đố không sai lần nào
- Cài web như ứng dụng trên điện thoại / máy tính (`manifest.webmanifest`)
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
| `lessons.js` | Nội dung 106 bài học và bộ giải nhỏ (gợi ý, kiểm tra bài) |
| `learn.js` | Chế độ học cờ kiểu Duolingo |
| `tools/check-lessons.js` | Kiểm tra mọi bài học giải được: `node tools/check-lessons.js` |
| `tools/email-notify.gs` | Google Apps Script: thông báo qua Gmail, Gmail khôi phục, quên mật khẩu (xem mục Cài Apps Script) |
| `tools/appsscript.json` | Manifest (quyền) cho Apps Script ở trên |
| `tools/make-skins.js` | Tạo các bộ quân skin trong `pieces/<skin>/` từ bộ gốc: `node tools/make-skins.js` |
| `online.js` | Chế độ chơi online (PeerJS / WebRTC), gồm tìm trận tự động |
| `contest.js` | Contest: tạo (admin), đăng ký, cộng điểm, bảng điểm, huy chương |
| `profile.js` | Tài khoản, hồ sơ, rank (exp và sao), Elo và lịch sử Elo, ảnh đại diện, bảng xếp hạng |
| `config.js` | Cấu hình Firebase cho tài khoản và bảng xếp hạng toàn thế giới |
| `firebase-rules.json` | Luật bảo mật dán vào Firebase |
| `sound.js` | Âm thanh nước đi (Web Audio) |
| `pieces/` | Bộ quân cờ SVG |
| `openings.js` | Bộ khai cuộc để nhận diện tên khai cuộc trong ván |
| `puzzles.js` | Câu đố chiến thuật, câu đố hôm nay, tiến độ giải |
| `app.js` | Vẽ bàn cờ, xử lý thao tác, chuyển chế độ, trang Hồ sơ |
| `coach.js` | Phân tích ván kiểu chess.com (xếp loại từng nước, độ chính xác hai bên) và Sổ luyện lỗi: thẻ ôn tập lặp lại ngắt quãng |
| `i18n.js` | Đa ngôn ngữ (Tiếng Việt / English) |
| `engine.js` | Gọi Stockfish (Web Worker): máy đi, gợi ý, đánh giá thế cờ; các lệnh chạy lần lượt |

## Tìm trận tự động

Không cần máy chủ riêng. Mọi người bấm **Tìm trận** (tab Online) cùng tranh một "phòng chờ" có ID cố định trên PeerJS: ai giành được thì ngồi chờ, người đến sau thấy phòng chờ đã có người thì nối vào, thế là hai người được ghép và vào ván ngay (màu quân ngẫu nhiên). Ghép xong, người chờ nhả phòng chờ ra để cặp tiếp theo dùng, nên nhiều cặp có thể ghép liên tiếp.

- Ván ghép tự động tính **rank và Elo** như mọi ván Online khác.
- Tìm tối đa 3 phút; không có ai thì báo và bạn bấm tìm lại. Bấm **Hủy tìm trận** bất cứ lúc nào.
- Hiện tại ghép với **bất kỳ ai** đang tìm, chưa lọc theo Elo (cần máy chủ riêng mới lọc được chính xác).
- Hằng số `SEARCH_LIMIT` (thời gian tìm tối đa) và tên phòng chờ nằm đầu `online.js`.

## Contest

Tab **Contest** nằm cạnh tab Online.

- **Tạo contest: chỉ admin** (chủ web `ADMIN` hoặc tài khoản được cấp quyền admin). Nút "Tạo contest" chỉ hiện với admin; luật Firebase chặn ở máy chủ nên sửa code trình duyệt cũng không tạo được. Muốn chỉ chủ web mới tạo được thì đổi `Profile.isAdmin()` thành `Profile.isOwner()` trong `contest.js` và `app.js`, đồng thời bỏ vế `root.child('admins')...` trong mục `contests` của `firebase-rules.json`.
- Admin đặt tên, mô tả (tuỳ chọn), giờ bắt đầu và thời lượng (30 phút đến 7 ngày). Xóa contest cũng xóa luôn bảng điểm.
- **Đăng ký trước**: chỉ đăng ký (hoặc hủy đăng ký) được trước giờ bắt đầu. Contest đã bắt đầu thì đóng đăng ký. Admin phải đặt giờ bắt đầu ở tương lai để mọi người kịp đăng ký.
- **Tự ghép cặp**: đến giờ, ai đã đăng ký và đang mở web sẽ tự được chuyển sang Online và vào phòng chờ riêng của contest, ghép với người đã đăng ký khác. Ván xong, sau 8 giây web tự tìm ván tiếp theo cho tới hết giờ. Thanh thông báo dưới thanh trên cùng cho biết contest sắp / đang diễn ra, có nút **Tạm dừng** / **Tiếp tục thi đấu**.
- Không cắt ngang việc đang làm: đang chơi với máy hoặc đang làm bài học thì web đợi xong mới ghép. Bấm Hủy tìm trận, Rời phòng hoặc chuyển khỏi tab Online thì tạm dừng tự ghép.
- Trong contest không có "Chơi lại ván mới" với cùng đối thủ (chống hai người quen cày điểm cho nhau); mỗi ván mới đều ghép lại.
- Điểm contest: **thắng +2, hòa +1, thua 0**. Xếp hạng theo điểm, rồi số ván thắng, rồi ít ván hơn. Bằng cả ba thì cùng hạng.
- **Huy chương**: khi contest kết thúc hẳn (30 phút sau giờ kết thúc), hạng 1, 2, 3 nhận huy chương **Vàng, Bạc, Đồng** (phải chơi ít nhất 1 ván). Huy chương hiện trong trang **Hồ sơ** (bấm vào để mở contest đó), cạnh tên trên **bảng xếp hạng**, trên bục trao giải của contest, và web báo ngay khi bạn vừa giành huy chương. Không lọt top 3 thì không có huy chương.
- Ván contest vẫn tính **rank và Elo** như ván Online thường, và theo cùng luật: ván dưới 4 nước không tính điểm gì cả. Chỉ ván bắt đầu trong giờ contest mới được tính.
- Ván bắt đầu trước giờ kết thúc vẫn được tính tới 30 phút sau đó (hằng số `GRACE` trong `contest.js`, và con số `1800000` trong `firebase-rules.json`).
- Dữ liệu Firebase: `/contests/<id>` (chỉ admin ghi) và `/contestScores/<id>/<uid>` (mỗi người chỉ ghi dòng của mình, mỗi lần chỉ +1 ván và đúng số điểm). **Nếu bạn đã dán luật cũ thì phải dán lại toàn bộ `firebase-rules.json` mới rồi bấm Publish.**
- Mỗi người chỉ được ghi điểm cách nhau ít nhất 20 giây (luật Firebase kiểm tra bằng giờ máy chủ), chặn kiểu gửi điểm liên tục.
- Không có máy chủ riêng nên việc ghép chạy trên trình duyệt: người đã đăng ký phải **mở web** trong giờ contest thì mới được ghép.
- Chế độ cục bộ (chưa cấu hình Firebase): contest chỉ có trong trình duyệt này, nên chỉ hợp để chạy thử.
- Giống phần rank, điểm contest do trình duyệt gửi lên nên người rành kỹ thuật vẫn có thể gian lận dần; luật server chỉ chặn được kiểu cộng điểm khống.

## Học cờ

Tab **Học cờ** có lộ trình kiểu Duolingo: **12 phần, 106 bài**, đi từ cơ bản tới nâng cao: làm quen bàn cờ → cách đi từng quân → luật đặc biệt → chiếu và thoát chiếu → chiếu hết 1 nước → chiến thuật (chĩa đôi, ghim, xiên, chiếu đôi, phát hiện…) → chiếu hết 2 nước → tàn cuộc → khai cuộc → nâng cao (đấu với máy, bài kiểm tra cuối khoá).

- Mỗi bài có vài thử thách: trắc nghiệm, bấm vào ô, đi quân ăn sao, đi đúng chuỗi nước, giải thế cờ chiếu hết (máy chống đỡ), đấu với máy để chiếu hết hoặc phong cấp.
- Mỗi bài có **3 tim**, sai mất 1 tim, hết tim thì làm lại. Câu trắc nghiệm trả lời sai sẽ được hỏi lại ở cuối bài. Không sai và không dùng gợi ý thì được 3 sao.
- Bài mới +10 XP (+5 nếu 3 sao), ôn lại +5 XP. Mục tiêu hằng ngày 30 XP, học mỗi ngày để giữ chuỗi ngày học.
- Bài được mở lần lượt. Đã biết chơi thì bấm **Nhảy cóc** ở một phần đang khoá để làm bài kiểm tra 6 câu và mở khoá luôn phần đó.
- Tiến độ lưu trong trình duyệt theo từng tài khoản. Có thể dùng phím 1–4 để chọn đáp án và Enter để kiểm tra / tiếp tục.
- Thêm hoặc sửa bài trong `lessons.js` (đầu file có mô tả các loại thử thách), rồi chạy `node tools/check-lessons.js` để kiểm tra: thế cờ đúng luật, mọi ngôi sao ăn được, chuỗi nước hợp lệ, bài chiếu hết thật sự có lời giải đúng số nước.

## Hệ thống rank

Các hằng số (exp thắng/hòa/thua, exp mỗi sao, số sao mỗi rank, tên và màu rank) nằm ở đầu file `profile.js` nên dễ chỉnh. Nếu đổi exp thắng/hòa/thua thì nhớ sửa luôn `firebase-rules.json` (con số 15, 5, 10) cho khớp.

## Hệ thống Elo

Elo là hệ thống riêng, **không ảnh hưởng đến rank** ở trên (rank vẫn chỉ tính ván Online theo exp và sao). Công thức giống chess.com / FIDE:

```
Elo kỳ vọng  E = 1 / (1 + 10^((Elo đối thủ − Elo của bạn) / 400))
Elo mới        = Elo cũ + K × (kết quả − E)      (thắng 1, hòa 0.5, thua 0)
```

- **K** = 40 trong 20 ván Elo đầu, 24 khi Elo dưới 2000, 16 khi từ 2000 trở lên. Thắng luôn được ít nhất +1, thua luôn mất ít nhất −1. Elo thấp nhất là 100.
- **Elo khởi điểm**: lần đầu đăng nhập web hỏi bạn là ai: Người mới 400, Cơ bản 700, Trung cấp 1000, Expert 1200, Cao thủ 1500.
- **Elo của máy**: Dễ 800, Trung bình 1200, Khó 1600 (hằng số `BOT_ELO` trong `profile.js`; ô "Độ khó" trong `index.html` ghi cùng số này).
- **Ván Online**: đổi cả rank (exp) lẫn Elo, dùng Elo của đối thủ (hai bên gửi Elo cho nhau lúc vào phòng; bản Firebase còn lấy Elo, exp và danh hiệu của đối thủ từ máy chủ khi khớp được tài khoản, thay cho số do trình duyệt đối thủ tự khai). **Ván đấu máy**: chỉ đổi Elo.
- **Không tính Elo** nếu: ván dưới 4 nước, 2 người cùng máy, hoặc ván đấu máy có dùng **Gợi ý** / **Đi lại**. Bỏ ván đấu máy giữa chừng (bấm Ván mới, đổi chế độ) bị tính thua.

Các hằng số Elo (K, Elo khởi điểm, các mức trình độ, Elo của máy) nằm ở đầu `profile.js`. Nếu đổi mức trình độ hay K lớn nhất thì sửa luôn `firebase-rules.json` (con số 400, 1500 và 40) cho khớp.

## Admin

- **ADMIN** là tên đăng nhập của chủ web (so sánh không phân biệt hoa thường). Chỉ tài khoản này thấy tab **Admin**, và chỉ tài khoản này cấp / thu hồi được quyền admin cho người khác.
- Người được cấp quyền là **admin**: có nút **Gợi ý** trong ván Online (hiện ở hàng nút dưới bàn cờ). Admin dùng Gợi ý vẫn được tính Elo và rank, cả ở ván Online lẫn ván đấu máy. **Đi lại** khi đấu máy thì vẫn làm ván đó không tính Elo như bình thường. Admin mới được cấp quyền chỉ cần vào lại tab Online (hoặc tải lại trang) là thấy nút.
- **Hãy tự đăng ký tài khoản `ADMIN` trước khi gửi link web cho ai**, vì ai đăng ký tên này trước sẽ là chủ web. Tên bắt đầu bằng `admin` (ví dụ `admin2`, `Admin_VN`) bị chặn với mọi người khác để không ai mạo danh.
- Tên đăng nhập luôn duy nhất: `ADMIN`, `Admin` và `admin` là cùng một tên.
- Chế độ Firebase: quyền admin lưu ở `/admins/<uid>`, luật server chỉ cho tài khoản có email `admin@rg-user.app` đọc cả danh sách và ghi vào đó, nên không ai tự cấp quyền cho mình được. **Nếu bạn đã dán luật cũ thì phải dán lại toàn bộ `firebase-rules.json` mới rồi bấm Publish.** Nếu đổi tên chủ web (hằng số `OWNER` trong `profile.js`) thì sửa luôn email `admin@rg-user.app` trong `firebase-rules.json` cho khớp.
- Nút Gợi ý của admin chạy ngay trên máy admin, server không chặn được ai sửa code để tự bật nút này; đây cũng là giới hạn chung của cả hệ thống điểm (xem phần bên dưới).

## Tài khoản và bảng xếp hạng toàn thế giới

Web có 2 chế độ, tự chọn theo `config.js`:

- **Chế độ cục bộ** (mặc định, `config.js` để trống): tài khoản, rank và bảng xếp hạng chỉ có trong trình duyệt này. Dùng để chạy thử.
- **Toàn thế giới**: mọi người đăng ký trên web của bạn dùng chung một bảng xếp hạng. Cần cấu hình Firebase một lần (miễn phí, khoảng 5 phút):

1. Vào <https://console.firebase.google.com>, tạo project mới.
2. **Build → Authentication → Get started → Sign-in method**: bật **Email/Password** (chỉ cần bật mục đầu, không cần bật "Email link").
3. **Build → Realtime Database → Create database** (chọn khu vực Singapore), rồi sang tab **Rules**, dán toàn bộ nội dung file `firebase-rules.json` và bấm **Publish**. (Tài khoản và exp rank đã có vẫn giữ nguyên, người chơi cũ chỉ cần chọn trình độ một lần để có Elo. Luật này đã gồm cả phần Contest.)
4. **Project settings → General**: tạo một Web app nếu chưa có, chép **Web API Key**; chép địa chỉ database ở trang Realtime Database.
5. Điền 2 giá trị đó vào `config.js`, rồi đăng web lên mạng (mục dưới).

Cách hoạt động: tên đăng nhập được đổi thành email giả `tên@rg-user.app` để dùng đăng nhập email/mật khẩu của Firebase, nên **không có chức năng quên mật khẩu**. Luật server chặn tạo điểm khống: tài khoản mới bắt đầu từ 0 exp và 800 Elo, chỉ được chọn trình độ một lần (400–1500), mỗi ván chỉ được +15 / +5 / −10 exp, Elo mỗi ván đổi tối đa 40, hai ván cách nhau ít nhất 10 giây, và mỗi người chỉ sửa được dữ liệu của chính mình. Tuy vậy điểm vẫn do trình duyệt tự gửi lên, nên người rành kỹ thuật vẫn có thể gian lận dần; đây là bảng xếp hạng cho vui, không phải giải đấu.

## Đăng nhập bằng Google (Gmail)

Nút **Đăng nhập bằng Google** trên màn hình đăng nhập (chỉ hiện ở bản Firebase). Lần đầu đăng nhập, người chơi chọn **tên hiển thị** (giống tên đăng nhập: 3–20 ký tự, không trùng ai, không bắt đầu bằng `admin`); các lần sau vào thẳng. Tên được giữ duy nhất nhờ "sổ tên" `/usernames` trên Firebase (tài khoản tên + mật khẩu cũ tự ghi tên vào sổ ở lần đăng nhập tiếp theo).

Cài một lần trong Firebase Console:
1. **Authentication › Sign-in method › Add new provider › Google › Enable**, chọn email hỗ trợ, bấm Save.
2. **Authentication › Settings › Authorized domains**: thêm tên miền web (ví dụ `ten-ban.github.io`). `localhost` có sẵn để chạy thử.
3. Dán lại toàn bộ `firebase-rules.json` (có thêm `usernames`, `notify`, `history`) rồi bấm **Publish**.
4. `config.js` đã có `authDomain` (`<project-id>.firebaseapp.com`); đổi project thì sửa cho khớp.

## Thông báo qua Gmail

Người chơi bật **Gửi thông báo về Gmail** trong Hồ sơ › Cài đặt để nhận thư khi: admin đăng **thông báo toàn web** có tick "Gửi cả về Gmail", **có contest mới**, và **contest đã đăng ký sắp bắt đầu** (≤ 15 phút). Tài khoản Google dùng luôn Gmail đăng nhập; tài khoản tên + mật khẩu cần thêm **Gmail khôi phục** trước (xem mục dưới). Web là trang tĩnh nên không tự gửi email; việc gửi do một **Google Apps Script** chạy bằng Gmail của chủ web đảm nhận (miễn phí, khoảng 100 thư / ngày). Luật Firebase chỉ cho mỗi người đăng ký đúng Gmail đã xác minh của chính mình, nên không ai dùng được để gửi thư cho người khác. Thư được gửi trong vòng 5 phút sau khi đăng.

## Quên mật khẩu và Gmail khôi phục

Tài khoản tên + mật khẩu dùng email nội bộ (`ten@rg-user.app`) nên cần một Gmail thật để lấy lại mật khẩu:
- **Thêm Gmail khôi phục**: Hồ sơ › Cài đặt › **Gmail khôi phục** › Thêm › nhập Gmail › nhập mã 6 số được gửi về Gmail đó. Có thể đổi hoặc gỡ bất cứ lúc nào.
- **Quên mật khẩu**: ở màn hình đăng nhập bấm **Quên mật khẩu?** › nhập tên đăng nhập › nhập mã 6 số gửi về Gmail khôi phục cùng mật khẩu mới. Sau khi đổi, Gmail nhận thêm một thư báo "mật khẩu đã được đặt lại".
- Mã hết hạn sau 10 phút, sai 5 lần là huỷ; mỗi tài khoản tối đa 1 mã / phút và 5 mã / giờ. Tài khoản chưa thêm Gmail khôi phục thì không lấy lại được qua email (admin hỗ trợ trong Firebase Console › Authentication).
- Tài khoản Google không có mật khẩu riêng, cứ bấm "Đăng nhập bằng Google".
- Chưa điền `mailApi` trong `config.js` thì web ẩn các tính năng này.

## Cài Apps Script (thông báo Gmail + quên mật khẩu)

Làm một lần (đã cài bản cũ thì dán code mới đè lên rồi làm tiếp từ bước 2):
1. Vào <https://script.google.com> › **New project**, dán toàn bộ `tools/email-notify.gs` vào `Code.gs`, bấm Save. **Phải dùng tài khoản Google là chủ (Owner) project Firebase.**
2. **Project Settings** (bánh răng) › tick **Show "appsscript.json" manifest file in editor**. Quay lại Editor, mở `appsscript.json`, thay toàn bộ bằng nội dung `tools/appsscript.json`, bấm Save.
3. **Project Settings › Script properties**: thêm `DB_URL` (giống `databaseURL`), `DB_SECRET` (Firebase Console › Project settings › Service accounts › **Database secrets** › Show) và `SITE_URL` (địa chỉ web).
4. Chọn hàm **setup**, bấm **Run**, cho phép quyền (màn hình "Google hasn't verified this app" thì bấm Advanced › Go to … (unsafe), vì đây là script của chính bạn). Script tự chạy mỗi 5 phút.
5. Chọn hàm **testAdmin**, bấm **Run**: Execution log phải hiện `OK – project …`. Báo lỗi 403 thì kiểm tra lại bước 1 (tài khoản chủ project).
6. **Deploy › New deployment** › biểu tượng bánh răng › **Web app** › Execute as: **Me** › Who has access: **Anyone** › Deploy. Copy **Web app URL** (`https://script.google.com/macros/s/…/exec`) dán vào `mailApi` trong `config.js`, rồi up `config.js` lên.
7. Dán lại `firebase-rules.json` mới (có mục `recovery`) vào Firebase › Realtime Database › Rules › Publish.
8. (Tuỳ chọn) chạy **testEmail** để gửi thử thư cho chính bạn.

Sau này sửa code Apps Script: **Deploy › Manage deployments** › bút chì › Version: **New version** › Deploy (URL giữ nguyên).

`DB_SECRET` là khoá quản trị cơ sở dữ liệu: chỉ để trong Script properties, không dán vào file web. Web app URL thì công khai được (nó chỉ nhận các yêu cầu đã kiểm tra ở trên).

## Chế độ khách

Nút **Chơi với tư cách khách**: vào chơi không cần tài khoản (đấu máy, 2 người cùng máy, câu đố, học cờ, thư viện, nhật ký và phân tích trên máy này). Khách **không có rank / Elo** (đấu máy không tính Elo), **không chơi Online**, **không tham gia contest** (vẫn xem được bảng xếp hạng và danh sách contest). Bấm vào các tính năng đó, hoặc nút trên Trang chủ, để chuyển sang đăng nhập / đăng ký. Tiến độ của khách lưu trên máy này.

## Đăng lên GitHub Pages

1. Đẩy code lên một repository GitHub.
2. Vào **Settings → Pages**.
3. Ở mục **Source** chọn **Deploy from a branch**, branch `main`, thư mục `/ (root)`, rồi bấm **Save**.
4. Sau khoảng 1 phút, trang có địa chỉ `https://<tên-tài-khoản>.github.io/<tên-repo>/`.

## Bản quyền

Bộ quân cờ `pieces/` là bộ *cburnett* của Colin M.L. Burnett, phát hành theo giấy phép GPLv2+ (lấy từ [lichess-org/lila](https://github.com/lichess-org/lila)).
