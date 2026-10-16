// Cấu hình tài khoản và bảng xếp hạng toàn thế giới (Firebase Authentication + Realtime Database).
// Điền 2 giá trị dưới đây (xem README) rồi đăng web lên mạng là mọi người dùng chung một bảng xếp hạng.
// Để trống thì web chạy chế độ cục bộ: tài khoản và bảng xếp hạng chỉ có trên trình duyệt này.
window.LEADERBOARD = {
  apiKey: 'AIzaSyCQt7T45UZp_s4V66sIYwoxTMnQqmH-o9U',
  databaseURL: 'https://chess-ab046-default-rtdb.asia-southeast1.firebasedatabase.app',
  // Đăng nhập bằng Google: tên miền xác thực của project (Firebase Console › Project settings › authDomain).
  // Bỏ trống thì web tự suy ra từ databaseURL: <project-id>.firebaseapp.com
  authDomain: 'chess-ab046.firebaseapp.com',
};
