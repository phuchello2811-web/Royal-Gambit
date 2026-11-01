// Cấu hình tài khoản và bảng xếp hạng toàn thế giới (Firebase Authentication + Realtime Database).
// Điền 2 giá trị dưới đây (xem README) rồi đăng web lên mạng là mọi người dùng chung một bảng xếp hạng.
// Để trống thì web chạy chế độ cục bộ: tài khoản và bảng xếp hạng chỉ có trên trình duyệt này.
window.LEADERBOARD = {
  apiKey: 'AIzaSyCQt7T45UZp_s4V66sIYwoxTMnQqmH-o9U',
  databaseURL: 'https://chess-ab046-default-rtdb.asia-southeast1.firebasedatabase.app',
  // Đăng nhập bằng Google: tên miền xác thực của project (Firebase Console › Project settings › authDomain).
  // Bỏ trống thì web tự suy ra từ databaseURL: <project-id>.firebaseapp.com
  authDomain: 'chess-ab046.firebaseapp.com',
  // Quên mật khẩu / Gmail khôi phục: địa chỉ "Web app URL" của Apps Script tools/email-notify.gs (xem README).
  // Dạng https://script.google.com/macros/s/XXXX/exec. Bỏ trống thì ẩn tính năng Quên mật khẩu.
  mailApi: 'https://script.google.com/macros/s/AKfycby6Bv_2y916N4jyCO7TgSieB7HAN_-XS3yP1DoN_kiiUsJVp3Ca3qy_wj8Dz5YSMeYp/exec',
  // Chơi online khác mạng: không cần điền gì, hai máy không nối thẳng được thì web tự đi qua Firebase (mục relay
  // trong firebase-rules.json). Muốn nhanh hơn thì thêm máy chủ TURN riêng (ví dụ tài khoản miễn phí metered.ca), dạng:
  // [{ urls: ['turn:global.relay.metered.ca:80', 'turn:global.relay.metered.ca:443?transport=tcp'], username: '...', credential: '...' }]
  iceServers: [],
  // Trợ lý Royal Gambit trò chuyện bằng mô hình GLM-4.7 của Z.ai: địa chỉ Cloudflare Worker chạy tools/ai-worker.js (xem README).
  // Dạng https://royal-gambit-ai.ten-ban.workers.dev. Bỏ trống thì Trợ lý dùng chế độ cơ bản (trả lời theo mẫu + Thư viện kiến thức).
  aiApi: 'https://red-dawn-a2a8.phuchello2811.workers.dev',
};
