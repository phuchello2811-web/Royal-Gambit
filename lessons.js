// Dữ liệu bài học. Mỗi bài có một mục tiêu (goal):
//   'stars'   – đi quân ăn hết các ngôi sao (chỉ bên Trắng đi)
//   'line'    – đi đúng chuỗi nước trong `line` (Trắng đi nước chẵn, máy đáp nước lẻ)
//   'castle' | 'promote' | 'check' | 'mate' – một nước bất kỳ thỏa điều kiện
// `pre`: các nước máy tự đi trước khi bắt đầu. Nước đi viết dạng 'e2e4', 'b7b8q'.

const LESSONS = [
  {
    group: 'Cách đi quân', title: 'Xe',
    text: 'Xe đi theo hàng ngang hoặc cột dọc, bao nhiêu ô cũng được nhưng không nhảy qua quân khác. Hãy đi Xe ăn hết các ngôi sao.',
    fen: '8/8/8/8/3R4/8/8/8 w - - 0 1', goal: 'stars', stars: ['d7', 'g7', 'g2', 'b2'],
  },
  {
    group: 'Cách đi quân', title: 'Tượng',
    text: 'Tượng đi theo đường chéo, bao nhiêu ô cũng được. Tượng luôn ở trên ô cùng màu suốt ván cờ.',
    fen: '8/8/8/8/8/8/8/2B5 w - - 0 1', goal: 'stars', stars: ['e3', 'h6', 'f8', 'a3'],
  },
  {
    group: 'Cách đi quân', title: 'Hậu',
    text: 'Hậu là quân mạnh nhất: đi được như Xe và như Tượng – ngang, dọc và chéo.',
    fen: '8/8/8/8/8/8/8/3Q4 w - - 0 1', goal: 'stars', stars: ['d5', 'a8', 'h8', 'h1'],
  },
  {
    group: 'Cách đi quân', title: 'Mã',
    text: 'Mã đi hình chữ L: 2 ô theo một hướng rồi rẽ 1 ô. Mã là quân duy nhất nhảy qua được quân khác.',
    fen: '8/8/8/8/8/8/8/1N6 w - - 0 1', goal: 'stars', stars: ['c3', 'd5', 'f6', 'g8'],
  },
  {
    group: 'Cách đi quân', title: 'Vua',
    text: 'Vua đi 1 ô theo mọi hướng. Vua không bao giờ được đi vào ô đang bị quân đối phương tấn công.',
    fen: '8/8/8/8/8/8/8/4K3 w - - 0 1', goal: 'stars', stars: ['d2', 'd3', 'e4', 'f5'],
  },
  {
    group: 'Cách đi quân', title: 'Tốt',
    text: 'Tốt đi thẳng 1 ô (nước đầu tiên được đi 2 ô) nhưng lại ăn quân theo đường chéo phía trước. Tốt không bao giờ đi lùi.',
    fen: '8/8/8/3p4/8/8/4P3/8 w - - 0 1', goal: 'stars', stars: ['e4', 'd5', 'd6'],
  },
  {
    group: 'Luật đặc biệt', title: 'Nhập thành',
    text: 'Nhập thành: Vua đi 2 ô về phía Xe, Xe nhảy sang ô bên cạnh Vua. Chỉ được nhập thành khi Vua và Xe chưa đi lần nào, giữa chúng không có quân, và Vua không bị chiếu hay đi qua ô bị tấn công. Hãy nhập thành (bấm vào Vua rồi chọn ô g1 hoặc c1).',
    fen: '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', goal: 'castle',
  },
  {
    group: 'Luật đặc biệt', title: 'Bắt tốt qua đường',
    text: 'Khi Tốt đối phương đi 2 ô và dừng ngay cạnh Tốt của bạn, bạn được ăn nó như thể nó chỉ đi 1 ô – nhưng phải ăn ngay ở nước kế tiếp. Đen vừa đi d7-d5, hãy bắt tốt qua đường!',
    fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1', pre: ['d7d5'], goal: 'line', line: ['e5d6'],
  },
  {
    group: 'Luật đặc biệt', title: 'Phong cấp',
    text: 'Khi Tốt đi tới hàng cuối cùng, nó được phong thành Hậu, Xe, Tượng hoặc Mã (thường chọn Hậu). Hãy phong cấp cho Tốt.',
    fen: '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1', goal: 'promote',
  },
  {
    group: 'Chiếu và chiếu hết', title: 'Chiếu',
    text: 'Chiếu là khi một quân tấn công Vua đối phương. Bên bị chiếu bắt buộc phải thoát: chạy Vua, chặn đường hoặc ăn quân đang chiếu. Hãy chiếu Vua Đen.',
    fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', goal: 'check',
  },
  {
    group: 'Chiếu và chiếu hết', title: 'Chiếu hết hàng cuối',
    text: 'Chiếu hết là khi Vua bị chiếu mà không còn cách nào thoát – bên đó thua. Vua Đen bị chính các Tốt của mình chặn đường. Hãy chiếu hết trong 1 nước.',
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', goal: 'mate',
  },
  {
    group: 'Chiếu và chiếu hết', title: 'Hậu và Vua phối hợp',
    text: 'Vua Trắng đang khóa các ô a7, b7. Hãy dùng Hậu chiếu hết Vua Đen trong 1 nước.',
    fen: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1', goal: 'mate',
  },
  {
    group: 'Chiếu và chiếu hết', title: 'Chiếu hết 4 nước',
    text: 'Ô f7 chỉ có Vua Đen bảo vệ nên là điểm yếu đầu ván. Đen vừa đi Mã f6 – một sai lầm. Hãy chiếu hết!',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', goal: 'mate',
  },
  {
    group: 'Chiếu và chiếu hết', title: 'Mã chiếu ngạt',
    text: 'Vua Đen bị chính quân mình vây kín. Chỉ một quân có thể chiếu hết trong tình huống này…',
    fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', goal: 'mate',
  },
  {
    group: 'Chiến thuật', title: 'Đòn chĩa',
    text: 'Đòn chĩa: một quân tấn công hai quân đối phương cùng lúc. Mã rất giỏi chĩa. Hãy tìm nước chiếu Vua và đồng thời tấn công Hậu Đen, rồi ăn Hậu.',
    fen: 'q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', goal: 'line', line: ['b5c7', 'e8d7', 'c7a8'],
  },
  {
    group: 'Chiến thuật', title: 'Đòn xiên',
    text: 'Đòn xiên: tấn công một quân giá trị cao, khi nó tránh đi thì ăn quân đứng phía sau. Hãy chiếu Vua Đen theo cột e, rồi ăn Hậu.',
    fen: '7R/8/4k3/8/8/8/4q3/K7 w - - 0 1', goal: 'line', line: ['h8e8', 'e6d5', 'e8e2'],
  },
];
