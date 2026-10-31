// Khoá học cờ vua kiểu Duolingo: các Phần (unit) → các Bài (lesson) → các Thử thách (step).
// Kiểm tra lại toàn bộ bài bằng: node tools/check-lessons.js
//
// Các loại thử thách (trường `t`):
//   'quiz'    – câu hỏi trắc nghiệm: q, options, answer (vị trí đáp án đúng), explain?, marks? (ô được tô)
//   'tap'     – bấm vào các ô: squares, ordered? (phải bấm đúng thứ tự)
//   'stars'   – đi quân ăn hết ngôi sao (chỉ bên Trắng đi, quân Đen đứng yên)
//   'capture' – ăn hết quân Đen (quân Đen đứng yên)
//   'line'    – đi đúng chuỗi nước; nước của người học có thể có nhiều đáp án 'a|b', máy tự đi nước của bên kia
//   'goal'    – một nước thỏa mục tiêu: castle (castle?: 'K' | 'Q'), promote, check, dcheck (chiếu đôi), mate
//   'mate'    – chiếu hết trong n nước (máy chống đỡ)
//   'win'     – đấu với máy tới khi chiếu hết, tối đa `limit` nước
//   'run'     – đấu với máy, đưa Tốt phong cấp an toàn trong tối đa `limit` nước
// Chung: text (lời dặn), fen, side? ('w' mặc định; 'b' = người học cầm Đen).
// Bài có review: true là bài ôn tập, lấy ngẫu nhiên thử thách từ các bài trước trong phần.

// Các hàm tạo bài để trong một phạm vi riêng: các file .js của web dùng chung phạm vi toàn cục
const COURSE = (() => {
const EMPTY = '8/8/8/8/8/8/8/8 w - - 0 1';
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const Q = (q, options, answer, o = {}) => ({ t: 'quiz', q, options, answer, fen: EMPTY, ...o });
const TAP = (text, squares, o = {}) => ({ t: 'tap', text, squares, fen: EMPTY, ...o });
const STARS = (text, fen, stars) => ({ t: 'stars', text, fen, stars });
const CAP = (text, fen) => ({ t: 'capture', text, fen });
const LINE = (text, fen, line, o = {}) => ({ t: 'line', text, fen, line, ...o });
const GOAL = (goal, text, fen, o = {}) => ({ t: 'goal', goal, text, fen, ...o });
const MATE1 = (text, fen) => ({ t: 'goal', goal: 'mate', text, fen });
const MATE = (n, text, fen) => ({ t: 'mate', n, text, fen });
const WIN = (text, fen, limit) => ({ t: 'win', text, fen, limit });
const RUN = (text, fen, limit) => ({ t: 'run', text, fen, limit });
const L = (title, icon, ...steps) => ({ title, icon, steps });
const REVIEW = (title = 'Ôn tập', count = 4) => ({ title, icon: 'review', review: true, count, steps: [] });

return [
  {
    key: 'basics', title: 'Làm quen bàn cờ', desc: 'Bàn cờ, tên các ô và quân cờ', color: '#81b64c', shade: '#5d8a32',
    lessons: [
      L('Bàn cờ', 'quiz',
        Q('Bàn cờ vua có bao nhiêu ô?', ['32 ô', '64 ô', '81 ô', '100 ô'], 1, { explain: '8 hàng × 8 cột = 64 ô, xen kẽ sáng và tối.' }),
        Q('Khi đặt bàn cờ, ô ở góc dưới bên phải mỗi người có màu gì?', ['Ô sáng', 'Ô tối'], 0, { marks: ['h1'], explain: 'Nhớ câu "trắng bên phải": ô h1 luôn là ô sáng.' })),
      L('Cột và hàng', 'tap',
        TAP('Cột đặt tên bằng chữ a–h (trái sang phải), hàng bằng số 1–8 (dưới lên trên). Hãy bấm vào ô a1.', ['a1']),
        TAP('Giờ bấm vào ô h8 – góc đối diện.', ['h8']),
        TAP('Ô e4 nằm ở cột e, hàng 4. Hãy bấm vào ô e4.', ['e4'])),
      L('Tên ô', 'tap',
        TAP('Bấm vào ô d5.', ['d5']),
        TAP('Bấm lần lượt các ô c3, f6 rồi b7.', ['c3', 'f6', 'b7'], { ordered: true }),
        Q('Ô được tô có tên là gì?', ['g2', 'b7', 'g7', 'b2'], 0, { marks: ['g2'] }),
        Q('Còn ô này?', ['c6', 'f3', 'c3', 'f6'], 1, { marks: ['f3'] })),
      L('Đường chéo', 'tap',
        TAP('Đường chéo dài nhất nối a1 với h8. Hãy bấm vào 4 ô: b2, c3, d4, e5.', ['b2', 'c3', 'd4', 'e5'], { marks: ['a1', 'h8'] }),
        Q('Ô nào KHÔNG nằm trên đường chéo a1–h8?', ['c3', 'f6', 'g8', 'h8'], 2, { marks: ['a1', 'h8'] })),
      L('Xếp quân', 'wK',
        TAP('Đây là thế cờ lúc bắt đầu ván. Bấm vào Vua Trắng.', ['e1'], { fen: START }),
        TAP('Bấm vào hai Xe Đen.', ['a8', 'h8'], { fen: START }),
        Q('Hậu Trắng đứng ô nào khi bắt đầu ván?', ['d1', 'e1', 'c1', 'd8'], 0, { fen: START, explain: 'Hậu đứng ô cùng màu với mình: Hậu Trắng ở ô sáng d1, Hậu Đen ở ô tối d8.' })),
      L('Giá trị quân', 'wQ',
        Q('Quân nào mạnh nhất (không tính Vua)?', ['Xe', 'Hậu', 'Mã', 'Tượng'], 1, { fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1' }),
        Q('Mã và Tượng mỗi quân đáng khoảng mấy Tốt?', ['1', '3', '5', '9'], 1),
        Q('Xe đáng khoảng mấy Tốt?', ['3', '5', '7', '9'], 1),
        Q('Đổi Xe (5 điểm) lấy Mã (3 điểm) là lời hay lỗ?', ['Lời', 'Lỗ', 'Hòa vốn'], 1)),
      L('Mục tiêu ván cờ', 'quiz',
        Q('Bạn thắng ván cờ khi nào?', ['Ăn hết quân đối phương', 'Chiếu hết Vua đối phương', 'Phong được Hậu', 'Ăn được Hậu đối phương'], 1),
        Q('Bên nào đi trước?', ['Trắng', 'Đen', 'Bốc thăm'], 0),
        Q('Vua có bị ăn như các quân khác không?', ['Có', 'Không – Vua chỉ bị chiếu và chiếu hết'], 1)),
      REVIEW(),
    ],
  },
  {
    key: 'rookbishop', title: 'Xe và Tượng', desc: 'Đi thẳng và đi chéo', color: '#4a90d0', shade: '#336ea6',
    lessons: [
      L('Xe đi ngang dọc', 'wR',
        STARS('Xe đi theo hàng ngang hoặc cột dọc, bao nhiêu ô cũng được. Hãy đi Xe ăn hết các ngôi sao ★', '8/8/8/8/3R4/8/8/8 w - - 0 1', ['d7', 'g7', 'g2', 'b2'])),
      L('Xe đi vòng', 'wR',
        STARS('Đi Xe tới ba góc còn lại của bàn cờ.', '8/8/8/8/8/8/8/R7 w - - 0 1', ['a8', 'h8', 'h1']),
        STARS('Xe không nhảy qua quân khác được. Tìm đường vòng!', '8/8/8/2P5/8/8/8/2R5 w - - 0 1', ['c7', 'f7'])),
      L('Xe ăn quân', 'wR',
        CAP('Xe ăn quân bằng cách đi vào ô của quân đối phương. Hãy ăn hết quân Đen (quân Đen đứng yên).', '8/1p6/8/8/1R3p2/8/8/5n2 w - - 0 1')),
      L('Tượng đi chéo', 'wB',
        STARS('Tượng đi theo đường chéo, bao nhiêu ô cũng được.', '8/8/8/8/8/8/8/2B5 w - - 0 1', ['e3', 'h6', 'f8', 'a3'])),
      L('Tượng và màu ô', 'wB',
        Q('Tượng đứng ô tối có đi sang ô sáng được không?', ['Được', 'Không bao giờ'], 1, { fen: '8/8/8/8/8/8/8/2B5 w - - 0 1', explain: 'Tượng luôn ở trên ô cùng màu suốt ván cờ.' }),
        STARS('Tượng ô sáng chỉ đi trên ô sáng. Ăn hết sao nào!', '8/8/8/8/8/8/8/5B2 w - - 0 1', ['b5', 'e8', 'h5', 'd1'])),
      L('Tượng ăn quân', 'wB',
        CAP('Dùng Tượng ăn hết quân Đen.', '3n4/8/8/6p1/8/4p3/8/2B5 w - - 0 1')),
      L('Xe và Tượng', 'wR',
        Q('Quân nào đi được tới mọi ô trên bàn cờ?', ['Xe', 'Tượng'], 0),
        CAP('Phối hợp Xe và Tượng để ăn hết quân Đen.', '8/8/7n/8/4b3/8/8/R1B5 w - - 0 1')),
      REVIEW(),
    ],
  },
  {
    key: 'queenknight', title: 'Hậu, Mã và Vua', desc: 'Quân mạnh nhất, quân nhảy và quân quan trọng nhất', color: '#9a72d4', shade: '#7552aa',
    lessons: [
      L('Hậu', 'wQ',
        STARS('Hậu đi được như Xe và Tượng: ngang, dọc và chéo.', '8/8/8/8/8/8/8/3Q4 w - - 0 1', ['d5', 'a8', 'h8', 'h1'])),
      L('Hậu săn quân', 'wQ',
        CAP('Hậu là quân mạnh nhất. Ăn hết quân Đen!', '8/p5b1/8/8/3Q3r/8/1n6/8 w - - 0 1')),
      L('Mã nhảy chữ L', 'wN',
        STARS('Mã đi hình chữ L: 2 ô theo một hướng rồi rẽ 1 ô.', '8/8/8/8/8/8/8/1N6 w - - 0 1', ['c3', 'd5', 'f6', 'g8'])),
      L('Mã nhảy qua quân', 'wN',
        STARS('Mã là quân duy nhất nhảy qua được quân khác.', '8/8/8/8/8/8/5PPP/6N1 w - - 0 1', ['f3', 'e5', 'd7', 'b8'])),
      L('Mã ăn quân', 'wN',
        CAP('Dùng Mã ăn hết quân Đen.', '8/4p3/2p3p1/8/3N4/8/8/8 w - - 0 1')),
      L('Mã ở trung tâm', 'wN',
        Q('Mã đứng ở đâu thì mạnh hơn?', ['Ở góc bàn', 'Ở trung tâm'], 1, { fen: '8/8/8/8/3N4/8/8/N7 w - - 0 1', explain: 'Mã ở trung tâm khống chế 8 ô, ở góc chỉ có 2 ô.' }),
        STARS('Đưa Mã từ góc a1 tới ô h8.', '8/8/8/8/8/8/8/N7 w - - 0 1', ['h8'])),
      L('Vua', 'wK',
        STARS('Vua đi 1 ô theo mọi hướng.', '8/8/8/8/8/8/8/4K3 w - - 0 1', ['d2', 'd3', 'e4', 'f5'])),
      L('Vua tránh ô bị tấn công', 'wK',
        STARS('Xe Đen khống chế hàng 3. Vua không được đi vào ô bị tấn công – tìm đường tới ngôi sao!', '8/8/8/8/8/3P3r/8/4K3 w - - 0 1', ['c4']),
        Q('Hai Vua có được đứng cạnh nhau không?', ['Được', 'Không bao giờ'], 1, { fen: '8/8/8/3k4/8/3K4/8/8 w - - 0 1', explain: 'Vua không được đi vào ô bị tấn công, mà ô cạnh Vua đối phương luôn bị nó tấn công.' })),
      REVIEW(),
    ],
  },
  {
    key: 'pawns', title: 'Tốt', desc: 'Quân nhỏ nhưng có thể thành Hậu', color: '#e08a2c', shade: '#ad6619',
    lessons: [
      L('Tốt đi thẳng', 'wP',
        STARS('Tốt đi thẳng 1 ô (nước đầu được đi 2 ô) và ăn chéo phía trước. Tốt không đi lùi.', '8/8/8/3p4/8/8/4P3/8 w - - 0 1', ['e4', 'd5', 'd6'])),
      L('Bước đầu 2 ô', 'wP',
        Q('Khi nào Tốt được đi 2 ô?', ['Bất cứ lúc nào', 'Chỉ ở nước đi đầu tiên của Tốt đó', 'Khi ăn quân'], 1),
        STARS('Đưa Tốt tới ngôi sao nhanh nhất.', '8/8/8/8/8/8/2P5/8 w - - 0 1', ['c4', 'c6'])),
      L('Tốt ăn chéo', 'wP',
        CAP('Tốt ăn quân theo đường chéo phía trước.', '8/8/8/1b6/2n5/3n4/4P3/8 w - - 0 1')),
      L('Tốt bị chặn', 'wP',
        Q('Tốt e4 có đi tiếp được không?', ['Được, lên e5', 'Không, Tốt bị chặn', 'Được, ăn Tốt e5'], 1, { fen: '8/8/8/4p3/4P3/8/8/8 w - - 0 1', explain: 'Tốt đi thẳng nhưng không ăn thẳng, nên quân đứng ngay trước sẽ chặn nó.' }),
        Q('Tốt Trắng ở e4 ăn được quân nào?', ['Quân ở e5', 'Quân ở d5 hoặc f5', 'Quân ở d3'], 1, { fen: '8/8/8/3n1b2/4P3/8/8/8 w - - 0 1' })),
      L('Phong cấp', 'wQ',
        GOAL('promote', 'Tốt đi tới hàng cuối được phong thành Hậu, Xe, Tượng hoặc Mã. Hãy phong cấp!', '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1')),
      L('Phong thành Mã', 'wN',
        LINE('Đôi khi phong Mã hay hơn phong Hậu! Phong Mã để chiếu Vua và tấn công Hậu cùng lúc, rồi ăn Hậu.', '8/1k1P1q2/8/8/8/8/8/7K w - - 0 1', ['d7d8n', 'b7c7', 'd8f7'])),
      L('Bắt tốt qua đường', 'wP',
        LINE('Tốt Đen đi 2 ô (d7–d5) và dừng cạnh Tốt e5 của bạn. Bạn được ăn nó như thể nó chỉ đi 1 ô – nhưng phải ăn ngay! Đi e5×d6.', '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1', ['d7d5', 'e5d6'])),
      L('Bắt tốt qua đường (2)', 'wP',
        LINE('Lần này Đen đi g7–g5. Bắt tốt qua đường nào!', '4k3/6p1/8/5P2/8/8/8/4K3 b - - 0 1', ['g7g5', 'f5g6']),
        Q('Phải bắt tốt qua đường khi nào?', ['Bất cứ lúc nào', 'Ngay ở nước kế tiếp', 'Trong vòng 3 nước'], 1)),
      REVIEW(),
    ],
  },
  {
    key: 'rules', title: 'Luật đặc biệt', desc: 'Nhập thành, pat và các kiểu hòa', color: '#30a58b', shade: '#227a67',
    lessons: [
      L('Nhập thành gần', 'wK',
        GOAL('castle', 'Nhập thành: Vua đi 2 ô về phía Xe, Xe nhảy qua đứng cạnh Vua. Hãy nhập thành gần (Vua tới g1).', '4k3/8/8/8/8/8/8/4K2R w K - 0 1', { castle: 'K' })),
      L('Nhập thành xa', 'wK',
        GOAL('castle', 'Nhập thành xa: Vua đi 2 ô về phía Xe a1 (Vua tới c1).', '4k3/8/8/8/8/8/8/R3K3 w Q - 0 1', { castle: 'Q' }),
        GOAL('castle', 'Chọn một bên và nhập thành.', 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')),
      L('Khi nào không được nhập thành', 'quiz',
        Q('Vua Trắng đang bị chiếu. Có được nhập thành không?', ['Được', 'Không'], 1, { fen: '4k3/8/8/8/8/8/4r3/4K2R w K - 0 1' }),
        Q('Ô f1 bị Tượng Đen tấn công. Có nhập thành gần được không?', ['Được', 'Không – Vua không được đi qua ô bị tấn công'], 1, { fen: '4k3/8/b7/8/8/8/8/4K2R w K - 0 1', marks: ['f1'] }),
        Q('Vua đã đi rồi quay về chỗ cũ. Còn được nhập thành không?', ['Còn', 'Không'], 1)),
      L('Pat – hết nước đi', 'quiz',
        Q('Đen tới lượt, không bị chiếu nhưng không còn nước đi hợp lệ. Kết quả là gì?', ['Trắng thắng', 'Hòa (pat)', 'Đen thắng'], 1, { fen: 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1', explain: 'Hết nước đi mà không bị chiếu gọi là pat – ván cờ hòa.' })),
      L('Tránh pat', 'wQ',
        MATE1('Chiếu hết trong 1 nước – cẩn thận đừng để Đen hết nước đi mà không bị chiếu (pat là hòa)!', 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1')),
      L('Các kiểu hòa', 'quiz',
        Q('Trường hợp nào là hòa?', ['Lặp lại cùng thế cờ 3 lần', 'Mất Hậu', 'Bị chiếu 3 lần'], 0),
        Q('Chỉ còn Vua + Mã đấu Vua. Kết quả?', ['Bên có Mã thắng', 'Hòa vì không đủ quân chiếu hết'], 1, { fen: '8/8/3k4/8/8/2N5/8/4K3 w - - 0 1' }),
        Q('Luật 50 nước: hòa khi nào?', ['50 nước liên tiếp không ăn quân và không đi Tốt', 'Ván dài quá 50 nước', 'Mỗi bên đã đi 50 nước'], 0)),
      REVIEW(),
    ],
  },
  {
    key: 'check', title: 'Chiếu và thoát chiếu', desc: 'Tấn công Vua và cách thoát', color: '#d65a4f', shade: '#a8413a',
    lessons: [
      L('Chiếu', 'wR',
        GOAL('check', 'Chiếu là tấn công Vua đối phương. Hãy chiếu Vua Đen bằng Xe.', '4k3/8/8/8/8/8/8/R3K3 w - - 0 1')),
      L('Chiếu bằng Mã và Tượng', 'wN',
        GOAL('check', 'Chiếu Vua Đen bằng Mã.', '4k3/8/8/8/4N3/8/8/4K3 w - - 0 1'),
        GOAL('check', 'Giờ chiếu bằng Tượng.', '4k3/8/8/8/8/8/8/4KB2 w - - 0 1')),
      L('Chạy Vua', 'wK',
        Q('Bị chiếu thì có những cách thoát nào?', ['Chỉ chạy Vua', 'Chạy Vua, chặn đường chiếu, hoặc ăn quân đang chiếu', 'Bỏ lượt'], 1),
        LINE('Vua Trắng bị Xe chiếu. Hãy chạy Vua ra khỏi đường chiếu.', 'k3r3/8/8/8/8/8/3P1P2/4K3 w - - 0 1', ['e1d1|e1f1'])),
      L('Chặn đường chiếu', 'wB',
        LINE('Xe Đen chiếu theo hàng 1. Đưa Tượng về chặn đường chiếu!', '7k/8/8/8/8/4B3/6PP/1r5K w - - 0 1', ['e3c1|e3g1'])),
      L('Ăn quân đang chiếu', 'wP',
        LINE('Mã Đen đang chiếu. Đừng chạy Vua – hãy dùng Tốt ăn Mã!', '4k3/8/8/8/8/3n4/4P3/4K3 w - - 0 1', ['e2d3'])),
      L('Chiếu mở', 'wB',
        GOAL('check', 'Chiếu mở: đi một quân ra khỏi đường để quân phía sau chiếu. Đi Tượng để Xe chiếu Vua Đen!', '4k3/8/8/8/4B3/8/8/4R1K1 w - - 0 1')),
      L('Chiếu đôi', 'wN',
        Q('Bị chiếu đôi (hai quân cùng chiếu), cách thoát duy nhất là?', ['Chặn đường chiếu', 'Ăn một quân', 'Chạy Vua'], 2),
        GOAL('dcheck', 'Đi Mã sao cho cả Mã và Xe cùng chiếu Vua Đen – chiếu đôi!', '4k3/8/8/8/4N3/8/8/4R1K1 w - - 0 1')),
      REVIEW(),
    ],
  },
  {
    key: 'mate1', title: 'Chiếu hết 1 nước', desc: 'Các mẫu chiếu hết kinh điển', color: '#d4a72c', shade: '#a5801b',
    lessons: [
      L('Chiếu hết hàng cuối', 'wR',
        MATE1('Vua Đen bị chính các Tốt của mình chặn đường. Chiếu hết trong 1 nước!', '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'),
        MATE1('Thêm một lần nữa.', '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1')),
      L('Hậu và Vua', 'wQ',
        MATE1('Vua Trắng khóa các ô a7, b7. Dùng Hậu chiếu hết.', 'k7/8/1K6/8/8/8/7Q/8 w - - 0 1'),
        MATE1('Vua Trắng giữ các ô trước mặt Vua Đen. Chiếu hết!', '4k3/8/4K3/8/8/8/8/7Q w - - 0 1')),
      L('Xe và Vua', 'wR',
        MATE1('Vua Trắng đứng đối diện Vua Đen. Xe chiếu hết!', '3k4/8/3K4/8/8/8/8/7R w - - 0 1'),
        MATE1('Vua Đen ở cạnh bàn. Hậu chiếu hết!', '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1')),
      L('Hai Xe', 'wR',
        MATE1('Một Xe chặn hàng 7, Xe kia chiếu hết.', 'k7/7R/8/8/8/8/8/K5R1 w - - 0 1')),
      L('Chiếu hết Học giả', 'wQ',
        MATE1('Ô f7 chỉ có Vua bảo vệ. Đen vừa đi Mã f6 – một sai lầm. Chiếu hết!', 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4')),
      L('Chiếu hết cầu vai', 'wQ',
        MATE1('Hai Xe Đen đứng hai bên chặn đường Vua của chính mình. Chiếu hết!', '3rkr2/8/8/8/8/8/Q7/6K1 w - - 0 1')),
      L('Mã chiếu ngạt', 'wN',
        MATE1('Vua Đen bị chính quân mình vây kín. Chỉ một quân chiếu hết được…', '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1'),
        MATE1('Mã và Xe phối hợp (chiếu hết kiểu Ả Rập).', '7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1')),
      L('Hậu có hỗ trợ', 'wQ',
        MATE1('Hậu ăn Tốt h7 có Tượng bảo vệ.', '5rk1/5ppp/8/7Q/8/3B4/8/6K1 w - - 0 1'),
        MATE1('Lần này Mã bảo vệ Hậu.', '5rk1/5ppp/8/6N1/8/3Q4/8/6K1 w - - 0 1')),
      L('Tượng chiếu hết', 'wB',
        MATE1('Hai Tượng phối hợp: một Tượng khóa ô a7, Tượng kia chiếu.', 'k7/2K5/8/2B5/8/8/8/5B2 w - - 0 1'),
        MATE1('Tượng trên đường chéo dài bảo vệ Hậu.', '6k1/5p1p/6pQ/8/8/8/1B6/6K1 w - - 0 1')),
      L('Chiếu hết Anastasia', 'wN',
        MATE1('Mã khóa đường thoát, Xe chiếu hết trên cột h.', '8/4N1pk/8/3R4/8/8/8/6K1 w - - 0 1')),
      L('Chiếu hết bằng Tốt', 'wP',
        MATE1('Cả Tốt cũng chiếu hết được! Cẩn thận: ăn Tốt h7 sẽ thành pat.', '7k/5K1p/6P1/8/8/8/8/8 w - - 0 1'),
        MATE1('Phong cấp và chiếu hết cùng lúc.', '6k1/4Pppp/8/8/8/8/8/6K1 w - - 0 1')),
      REVIEW('Ôn tập chiếu hết', 5),
    ],
  },
  {
    key: 'tactics', title: 'Chiến thuật', desc: 'Chĩa, ghim, xiên và chiếu mở', color: '#4f74c4', shade: '#385594',
    lessons: [
      L('Đòn chĩa', 'wN',
        Q('Đòn chĩa (fork) là gì?', ['Một quân tấn công hai quân đối phương cùng lúc', 'Hai quân cùng tấn công một quân', 'Đổi quân ngang giá'], 0),
        LINE('Mã rất giỏi chĩa. Chiếu Vua và tấn công Hậu cùng lúc, rồi ăn Hậu.', 'q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', ['b5c7', 'e8d7', 'c7a8'])),
      L('Chĩa Vua và Hậu', 'wN',
        LINE('Tìm ô để Mã chiếu Vua và tấn công Hậu, rồi ăn Hậu!', '3q3k/6pp/8/4N3/8/8/5PPP/6K1 w - - 0 1', ['e5f7', 'h8g8', 'f7d8'])),
      L('Chĩa bằng Tốt', 'wP',
        LINE('Đẩy Tốt tấn công hai Mã cùng lúc, rồi ăn một con.', '4k3/8/8/2n1n3/8/3P4/8/4K3 w - - 0 1', ['d3d4', 'c5e6', 'd4e5'])),
      L('Chĩa bằng Hậu', 'wQ',
        LINE('Chiếu Vua và tấn công Tượng cùng lúc, rồi ăn Tượng.', '4k3/8/8/8/7b/8/8/2KQ4 w - - 0 1', ['d1a4', 'e8f7', 'a4h4']),
        LINE('Lần nữa: chiếu Vua và tấn công Xe a7.', '7k/rp6/8/8/8/8/8/3Q2K1 w - - 0 1', ['d1d4', 'h8g8', 'd4a7'])),
      L('Đòn ghim', 'wB',
        Q('Đòn ghim là gì?', ['Quân bị tấn công không đi được vì sẽ để lộ quân giá trị hơn phía sau', 'Hai quân đổi nhau', 'Chiếu liên tục'], 0),
        LINE('Mã Đen bị Tượng ghim vào Vua nên không đi được. Đẩy Tốt tấn công nó!', '4k3/8/2n5/1B6/3P4/8/8/4K3 w - - 0 1', ['d4d5', 'e8e7', 'd5c6'])),
      L('Ghim bằng Xe', 'wR',
        LINE('Xe ghim Mã vào Vua trên cột e. Tấn công Mã bằng Tốt!', '4k3/8/8/4n3/8/8/5P2/4R1K1 w - - 0 1', ['f2f4', 'e8d7', 'f4e5'])),
      L('Đòn xiên', 'wR',
        LINE('Đòn xiên: tấn công quân giá trị cao, nó tránh đi thì ăn quân phía sau. Chiếu Vua theo cột e, rồi ăn Hậu.', '7R/8/4k3/8/8/8/4q3/K7 w - - 0 1', ['h8e8', 'e6d5', 'e8e2']),
        LINE('Xiên bằng Tượng: chiếu Vua trên đường chéo, rồi ăn Hậu phía sau.', '6q1/8/4k3/8/8/8/8/5B1K w - - 0 1', ['f1c4', 'e6e7', 'c4g8'])),
      L('Chiếu mở thắng Hậu', 'wB',
        LINE('Tượng đang chặn đường Xe. Đi Tượng ăn Hậu – đồng thời Xe chiếu Vua!', '4k3/7q/8/8/4B3/8/8/4R1K1 w - - 0 1', ['e4h7'])),
      L('Ăn quân treo', 'wQ',
        Q('Quân "treo" là gì?', ['Quân bị tấn công mà không được bảo vệ', 'Quân bị ghim', 'Quân vừa phong cấp'], 0),
        LINE('Một quân Đen đang treo. Hãy ăn nó – đừng ăn quân có bảo vệ!', '6k1/5ppp/4p3/3n4/6b1/8/5PPP/3Q2K1 w - - 0 1', ['d1g4'])),
      L('Chĩa Mã thắng Xe', 'wN',
        LINE('Mã chiếu Vua và tấn công Xe cùng lúc.', '2r3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1', ['d5e7', 'g8f8', 'e7c8'])),
      REVIEW('Ôn tập chiến thuật', 5),
    ],
  },
  {
    key: 'mate2', title: 'Chiếu hết 2 nước', desc: 'Tính trước một nước', color: '#c4659c', shade: '#974b77',
    lessons: [
      L('Vua giúp Hậu', 'wQ',
        MATE(2, 'Đưa Vua lại gần trước, rồi Hậu chiếu hết. Chiếu hết trong 2 nước!', 'k7/8/8/2K5/8/8/8/1Q6 w - - 0 1')),
      L('Vua giúp Xe', 'wR',
        MATE(2, 'Dùng Vua chiếm thế đối diện, rồi Xe chiếu hết. Chiếu hết trong 2 nước!', 'k7/8/2K5/8/8/8/8/7R w - - 0 1')),
      L('Xe lăn', 'wR',
        MATE(2, 'Hai Xe thay nhau "lăn" Vua Đen. Chiếu hết trong 2 nước!', '7k/8/8/8/8/8/1R6/R5K1 w - - 0 1')),
      L('Chiếu ngạt Philidor', 'wN',
        MATE(2, 'Hy sinh Hậu để Đen tự chặn đường Vua, rồi Mã chiếu ngạt! Chiếu hết trong 2 nước.', '3r3k/6pp/7N/8/8/1Q6/8/6K1 w - - 0 1')),
      L('Anastasia 2 nước', 'wQ',
        MATE(2, 'Hy sinh Hậu trên h7, rồi Xe chiếu hết trên cột h.', '5r1k/4N1pp/8/7Q/6R1/8/5PPP/6K1 w - - 0 1')),
      L('Hy sinh trên hàng cuối', 'wR',
        MATE(2, 'Hy sinh để kéo Xe Đen ra, rồi chiếu hết hàng cuối. Chiếu hết trong 2 nước!', '3r2k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1')),
      L('Nước im lặng', 'wB',
        MATE(2, 'Không phải nước nào cũng là chiếu! Đặt Hậu vào vị trí đe dọa, Đen không cản được chiếu hết.', '5rk1/5p1p/5Bp1/8/8/8/3Q1PPP/6K1 w - - 0 1')),
      REVIEW('Ôn tập 2 nước', 4),
    ],
  },
  {
    key: 'endgame', title: 'Tàn cuộc', desc: 'Kết thúc ván cờ khi còn ít quân', color: '#a8804c', shade: '#7c5d35',
    lessons: [
      L('Vua trong tàn cuộc', 'quiz',
        Q('Trong tàn cuộc, Vua nên…', ['Trốn trong góc', 'Tiến lên giúp các quân khác', 'Không quan trọng'], 1),
        Q('Vua + Hậu đấu Vua thì kết quả thường là…', ['Hòa', 'Bên có Hậu thắng', 'Tuỳ may mắn'], 1)),
      L('Hậu chiếu hết Vua', 'wQ',
        WIN('Dồn Vua Đen về cạnh bàn rồi chiếu hết. Đừng để pat! Máy cầm Đen.', '8/8/8/4k3/8/8/8/4K2Q w - - 0 1', 25)),
      L('Xe chiếu hết Vua', 'wR',
        WIN('Xe cắt đường, Vua Trắng tiến lên hỗ trợ. Chiếu hết Vua Đen!', '8/8/8/3k4/8/8/8/R3K3 w - - 0 1', 35)),
      L('Hai Xe chiếu hết', 'wR',
        WIN('Dùng hai Xe "lăn" Vua Đen về cạnh bàn rồi chiếu hết.', '8/8/8/3k4/8/8/8/R3K2R w - - 0 1', 15)),
      L('Luật hình vuông', 'wP',
        Q('Tốt cách hàng phong cấp 4 ô. Vua Đen bắt kịp nếu…', ['Vua Đen ở trong "hình vuông" của Tốt', 'Vua Đen ở xa hơn 2 ô', 'Không bao giờ'], 0, { fen: '8/8/8/5k2/P7/8/8/7K w - - 0 1', marks: ['a4', 'e4', 'e8', 'a8'] }),
        RUN('Vua Đen ở ngoài hình vuông – đẩy Tốt ngay, đừng chần chừ!', '8/8/8/5k2/P7/8/8/7K w - - 0 1', 8)),
      L('Tốt có Vua hỗ trợ', 'wP',
        RUN('Vua Trắng đứng trước Tốt. Đi đúng thì Tốt sẽ phong cấp an toàn. Máy cầm Đen.', '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', 15)),
      L('Đột phá Tốt', 'wP',
        LINE('Ba Tốt đấu ba Tốt: một đòn đột phá tạo ra Tốt thông. Đi b5–b6!', '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1', ['b5b6', 'c7b6', 'a5a6', 'b7a6', 'c5c6'])),
      L('Đối Vua', 'wK',
        Q('Thế "đối Vua" là gì?', ['Hai Vua đối diện, cách 1 ô – bên phải đi thường bất lợi', 'Hai Vua đứng cạnh nhau', 'Vua đứng đối diện Hậu'], 0, { fen: '8/8/4k3/8/4K3/8/8/8 w - - 0 1' })),
      REVIEW('Ôn tập tàn cuộc', 4),
    ],
  },
  {
    key: 'opening', title: 'Khai cuộc', desc: 'Bắt đầu ván cờ đúng cách', color: '#81b64c', shade: '#5d8a32',
    lessons: [
      L('Nguyên tắc khai cuộc', 'quiz',
        Q('Nguyên tắc khai cuộc nào ĐÚNG?', ['Đi Hậu ra thật sớm', 'Chiếm trung tâm, ra Mã và Tượng, nhập thành sớm', 'Đi nhiều Tốt cánh'], 1),
        Q('Vì sao không nên đưa Hậu ra quá sớm?', ['Hậu dễ bị quân nhỏ đuổi, mất nhịp ra quân', 'Hậu yếu', 'Luật cấm'], 0)),
      L('Chiếm trung tâm', 'wP',
        LINE('Mở đầu bằng một Tốt trung tâm: đi e4 hoặc d4.', START, ['e2e4|d2d4']),
        LINE('Ra Mã hướng vào trung tâm: Mã g1 lên f3.', 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', ['g1f3'])),
      L('Ván cờ Ý', 'wB',
        LINE('Ván cờ Ý: e4, Mã f3, rồi Tượng c4 nhắm vào ô f7.', START, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'])),
      L('Ván Tây Ban Nha', 'wB',
        LINE('Ván Tây Ban Nha: e4, Mã f3, rồi Tượng b5 gây sức ép lên Mã c6.', START, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'])),
      L('Gambit Hậu', 'wP',
        LINE('Gambit Hậu: d4, rồi c4 thách Tốt d5 của Đen.', START, ['d2d4', 'd7d5', 'c2c4'])),
      L('Hệ thống London', 'wB',
        LINE('Hệ thống London: d4, Tượng f4 rồi e3 – dễ nhớ, chắc chắn.', START, ['d2d4', 'd7d5', 'c1f4', 'g8f6', 'e2e3'])),
      L('Phòng thủ Sicilia', 'bP',
        LINE('Bạn cầm Đen. Trắng đi e4, đáp lại bằng c5 – Phòng thủ Sicilia.', START, ['e2e4', 'c7c5', 'g1f3', 'd7d6'], { side: 'b' })),
      L('Phòng thủ Pháp', 'bP',
        LINE('Cầm Đen: đáp e4 bằng e6, rồi d5.', START, ['e2e4', 'e7e6', 'd2d4', 'd7d5'], { side: 'b' })),
      L('Phòng thủ Caro-Kann', 'bP',
        LINE('Cầm Đen: đáp e4 bằng c6, rồi d5.', START, ['e2e4', 'c7c6', 'd2d4', 'd7d5'], { side: 'b' })),
      L('Nhập thành sớm', 'wK',
        GOAL('castle', 'Đã ra Mã và Tượng – giờ nhập thành để Vua an toàn!', 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', { castle: 'K' })),
      L('Chặn bẫy Học giả', 'bP',
        LINE('Cầm Đen: Trắng đưa Hậu h5 nhắm f7. Hãy chặn mối đe dọa chiếu hết!', START, ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g7g6|d8e7|d8f6'], { side: 'b' })),
      L('Chiếu hết nhanh nhất', 'bQ',
        LINE('Cầm Đen: Trắng đi rất tệ (f3, g4). Chiếu hết chỉ trong 2 nước!', START, ['f2f3', 'e7e5', 'g2g4', 'd8h4'], { side: 'b' })),
      REVIEW('Ôn tập khai cuộc', 4),
    ],
  },
  {
    key: 'advanced', title: 'Nâng cao', desc: 'Thử thách cuối chặng 1', color: '#c94a3e', shade: '#97352c',
    lessons: [
      L('Hậu chiếu hết nhanh', 'wQ',
        WIN('Chiếu hết Vua Đen trong tối đa 10 nước!', '8/8/8/8/3k4/8/8/K6Q w - - 0 1', 10)),
      L('Xe chiếu hết nhanh', 'wR',
        WIN('Chiếu hết bằng Xe trong tối đa 25 nước!', '8/8/8/8/8/2k5/8/R3K3 w - - 0 1', 25)),
      // `from`: lấy thử thách từ các phần khác (số thứ tự phần, tính từ 0) hoặc 'all' = cả khoá
      { ...REVIEW('Tổng hợp chiến thuật', 6), from: [6, 7, 8] },
      { ...REVIEW('Bài kiểm tra chặng 1', 8), from: 'all' },
    ],
  },
  // ----- Chặng 2 (phần 13–20). Thêm ở cuối để tiến độ cũ (lưu theo số thứ tự phần-bài) không bị lệch. -----
  // `key`: mã chủ đề để Trợ lý AI (assistant.js) gợi ý đúng phần theo điểm yếu của người chơi.
  {
    key: 'defense', title: 'Phòng thủ & giữ quân', desc: 'Thấy đe dọa, bảo vệ quân và tránh mất quân oan', color: '#3f9c7a', shade: '#2c7258',
    lessons: [
      L('Đối thủ dọa gì?', 'quiz',
        Q('Trước mỗi nước đi, câu hỏi đầu tiên nên tự hỏi là gì?', ['Nước vừa rồi của đối thủ đe dọa gì?', 'Quân nào của mình đẹp nhất?', 'Đi thật nhanh cho kịp giờ'], 0, { explain: 'Phần lớn nước hớ xảy ra vì không nhìn nước vừa đi của đối thủ.' }),
        Q('Một quân bị 2 quân đối phương tấn công nhưng chỉ có 1 quân bảo vệ. Điều gì xảy ra?', ['Đối thủ ăn được và hơn quân', 'Không ai được lợi', 'Mình được lợi'], 0, { explain: 'Đếm số quân tấn công và số quân bảo vệ: bên tấn công nhiều hơn thì ăn được.' })),
      L('Né đòn', 'wB',
        LINE('Tượng c4 bị Tốt b5 tấn công (Tốt có Tốt a6 bảo vệ, đừng ăn!). Đưa Tượng về một ô an toàn.', '4k3/8/p7/1p6/2B5/8/8/4K3 w - - 0 1', ['c4b3|c4a2|c4d3|c4e2|c4f1|c4d5|c4e6|c4g8']),
        LINE('Xe Đen tấn công Mã d4. Hãy bảo vệ Mã bằng một Tốt.', '3rk3/8/8/8/3N4/8/2P1P3/4K3 w - - 0 1', ['c2c3|e2e3'])),
      L('Quân nào ăn được?', 'wQ',
        LINE('Hậu ăn được Mã a4 hoặc Tượng g4, nhưng Tượng có Tốt h5 bảo vệ. Ăn đúng quân!', '6k1/5pp1/8/7p/n5b1/8/5PPP/3Q2K1 w - - 0 1', ['d1a4'])),
      L('Lỗ thở cho Vua', 'wK',
        Q('Vua sau ba Tốt f2, g2, h2 chưa đi có nguy cơ gì?', ['Bị chiếu hết hàng cuối', 'Bị phong cấp', 'Không có nguy cơ gì'], 0, { fen: '4r1k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1', marks: ['e1', 'f1', 'g1', 'h1'] }),
        LINE('Xe Đen dọa xuống e1 chiếu hết. Mở "lỗ thở" cho Vua bằng một nước Tốt (hoặc đưa Vua ra chặn).', '4r1k1/p4ppp/8/8/8/8/P4PPP/6K1 w - - 0 1', ['h2h3|h2h4|g2g3|g2g4|f2f3|f2f4|g1f1'])),
      L('Chặn chiếu hết', 'wN',
        LINE('Đen dọa Hậu ăn h2 chiếu hết (Tượng d6 yểm trợ). Chặn ngay: Mã lên f3, hoặc đẩy Tốt g3 / h3 / f4.', '6k1/5ppp/3b4/8/7q/8/3N1PPP/5RK1 w - - 0 1', ['d2f3|g2g3|h2h3|f2f4'])),
      L('Đổi quân', 'quiz',
        Q('Bạn đang hơn một Xe. Nên làm gì?', ['Đổi bớt quân để tàn cuộc dễ thắng', 'Tránh mọi cuộc đổi quân', 'Thí lại Xe cho cân bằng'], 0, { explain: 'Hơn quân thì càng ít quân trên bàn, lợi thế càng rõ.' }),
        Q('Bạn mất Tượng (3 điểm) nhưng ăn được Xe (5 điểm). Gọi là gì?', ['Hơn chất lượng', 'Thua chất lượng', 'Đổi ngang'], 0)),
      L('Quân bảo vệ quá ít', 'quiz',
        Q('Quân của bạn bị tấn công hai lần, chỉ được bảo vệ một lần. Nên làm gì?', ['Thêm quân bảo vệ hoặc đưa quân đó đi', 'Mặc kệ, tấn công chỗ khác', 'Đưa Vua lại gần'], 0),
        Q('Quân "treo" của MÌNH nguy hiểm nhất khi nào?', ['Khi đối thủ ăn được mà không mất gì', 'Khi quân đó là Tốt', 'Khi quân đó ở góc bàn'], 0)),
      REVIEW('Ôn tập phòng thủ', 4),
    ],
  },
  {
    key: 'tactics2', title: 'Chiến thuật nâng cao', desc: 'Chiếu đôi, đòn lôi, phá phòng thủ, quá tải', color: '#5b6fd6', shade: '#4152a6',
    lessons: [
      L('Chiếu đôi', 'wN',
        Q('Khi bị chiếu đôi, bên bị chiếu phải làm gì?', ['Bắt buộc đi Vua', 'Chặn một trong hai quân', 'Ăn một quân chiếu'], 0, { explain: 'Không thể chặn hay ăn cả hai quân chiếu cùng lúc, nên chỉ còn cách đi Vua.' }),
        GOAL('dcheck', 'Mã đang chắn cột e của Xe. Đi Mã để chiếu đôi: Mã chiếu và Xe cũng chiếu!', '4k3/8/8/8/4N3/8/8/4R1K1 w - - 0 1')),
      L('Phá quân phòng thủ', 'wB',
        LINE('Tượng d7 chỉ có Mã f6 bảo vệ. Ăn Mã trước, rồi Xe ăn Tượng!', '6k1/3b1ppp/5n2/6B1/8/8/5PPP/3R2K1 w - - 0 1', ['g5f6', 'g7f6', 'd1d7'])),
      L('Quân bị quá tải', 'wR',
        Q('Một quân phải làm hai nhiệm vụ phòng thủ cùng lúc gọi là gì?', ['Quân bị quá tải', 'Quân bị ghim', 'Quân treo'], 0),
        LINE('Xe d8 vừa bảo vệ Mã d5 vừa giữ hàng cuối. Ăn Mã: nếu Xe ăn lại thì Hậu chiếu hết ở e8!', '3r2k1/5ppp/8/3n4/8/8/4QPPP/3R2K1 w - - 0 1', ['d1d5', 'd8d5', 'e2e8'])),
      L('Đòn lôi', 'wR',
        LINE('Thí Xe ở h8 để kéo Vua vào góc, rồi Mã chĩa Vua và Hậu!', '3q2k1/5pp1/8/6N1/8/8/5PP1/6KR w - - 0 1', ['h1h8', 'g8h8', 'g5f7', 'h8g8', 'f7d8'])),
      L('Nước trung gian', 'quiz',
        Q('Nước "trung gian" là gì?', ['Một nước bất ngờ (thường là chiếu) chen vào trước khi ăn lại quân', 'Nước Vua ra giữa bàn', 'Nước Tốt đi hai ô'], 0, { explain: 'Đừng vội ăn lại theo phản xạ: xem có nước chiếu hay đe dọa mạnh hơn không.' })),
      L('Thí Xe mở hàng cuối', 'wR',
        MATE(2, 'Hậu Đen giữ hàng cuối một mình. Thí Xe để kéo Hậu đi, rồi chiếu hết! Chiếu hết trong 2 nước.', '3q2k1/5ppp/8/8/8/8/4RPPP/4Q1K1 w - - 0 1')),
      REVIEW('Ôn tập chiến thuật nâng cao', 5),
    ],
  },
  {
    key: 'mates', title: 'Mẫu chiếu hết nâng cao', desc: 'Boden, Opera, chiếu hết bằng hai Tượng và Hậu–Xe', color: '#d4a72c', shade: '#a5801b',
    lessons: [
      L('Chiếu hết Opera', 'wR',
        MATE1('Xe xuống hàng 8, Tượng g5 khống chế e7 và bảo vệ Xe. Chiếu hết trong 1 nước!', '4kb2/5p2/8/6B1/8/8/8/3R2K1 w - - 0 1')),
      L('Chiếu hết Boden', 'wB',
        MATE1('Hai Tượng chéo nhau: Tượng f4 giữ b8 và c7. Chiếu hết bằng Tượng còn lại!', '2kr4/3n4/8/8/5B2/8/4BPPP/6K1 w - - 0 1'),
        MATE(2, 'Thí Hậu để mở đường chéo, rồi chiếu hết Boden. Chiếu hết trong 2 nước!', '2kr4/pp1n4/2n5/8/5B2/5Q2/4BPPP/6K1 w - - 0 1')),
      L('Hậu và Xe', 'wQ',
        MATE1('Hậu và Xe phối hợp trên cột h. Chiếu hết trong 1 nước!', '6k1/5pp1/8/8/8/8/5PP1/4Q1KR w - - 0 1')),
      L('Chiếu hết ở góc', 'wN',
        MATE1('Chiếu hết Ả Rập: Mã f6 khống chế g8 và bảo vệ ô h7. Xe chỉ cần một nước!', '7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1')),
      L('Hậu và Tốt', 'wQ',
        MATE1('Chiếu hết Damiano: Tốt g6 bảo vệ ô h7. Chiếu hết bằng Hậu!', '5rk1/5p2/6P1/7Q/8/8/8/6K1 w - - 0 1')),
      L('Hai Xe bậc thang', 'wR',
        MATE(2, 'Một Xe cắt hàng, Xe kia chiếu. Chiếu hết trong 2 nước!', '4k3/8/8/8/8/8/R7/1R4K1 w - - 0 1')),
      REVIEW('Ôn tập mẫu chiếu hết', 4),
    ],
  },
  {
    key: 'attack', title: 'Tấn công Vua', desc: 'Đánh vào Vua chưa nhập thành và Vua đã nhập thành', color: '#d65a4f', shade: '#a8413a',
    lessons: [
      L('Khi nào tấn công?', 'quiz',
        Q('Vua đối thủ chưa nhập thành, còn mình đã ra quân xong. Nên làm gì?', ['Mở trung tâm và đưa quân vào tấn công', 'Đổi hết quân', 'Đẩy Tốt cánh Hậu'], 0),
        Q('Muốn tấn công Vua thành công thường cần gì?', ['Nhiều quân tấn công hơn số quân phòng thủ', 'Chỉ cần Hậu', 'Đi Vua lên trước'], 0)),
      L('Tấn công f7', 'wN',
        LINE('Tấn công Fried Liver: e4, Mã f3, Tượng c4, Mã g5, ăn d5 rồi thí Mã ở f7 và đưa Hậu lên f3!', START, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6', 'f3g5', 'd7d5', 'e4d5', 'f6d5', 'g5f7', 'e8f7', 'd1f3'])),
      L('Món quà Hy Lạp', 'wB',
        Q('Thí Tượng ở h7 (Bxh7+, "món quà Hy Lạp") thường thành công khi nào?', ['Mã lên được g5 và Hậu tới h5 nhanh, Đen không có Mã f6 phòng thủ', 'Bất cứ khi nào Đen nhập thành', 'Khi Trắng chưa ra quân'], 0),
        LINE('Thí Tượng ở h7, Mã chiếu ở g5 (Tượng c1 canh ô g5) rồi Hậu lên h5 dọa chiếu hết!', 'r1bq1rk1/ppp2ppp/2n1p3/3pP3/1b6/3B1N2/PPP2PPP/R1BQ1RK1 w - - 0 1', ['d3h7', 'g8h7', 'f3g5', 'h7g8', 'd1h5'])),
      L('Thí quân mở hàng cuối', 'wQ',
        MATE(2, 'Thí Xe ở e8, Hậu ăn lại và chiếu hết. Chiếu hết trong 2 nước!', '3q2k1/5ppp/8/8/8/8/4RPPP/4Q1K1 w - - 0 1')),
      L('Hậu và Xe dồn Vua', 'wQ',
        WIN('Hậu và Xe đấu Vua và ba Tốt. Phối hợp hai quân nặng để chiếu hết!', '6k1/5ppp/8/8/8/8/8/QR4K1 w - - 0 1', 15)),
      REVIEW('Ôn tập tấn công', 4),
    ],
  },
  {
    key: 'strategy', title: 'Trung cuộc & kế hoạch', desc: 'Cột mở, tiền đồn, cấu trúc Tốt và lập kế hoạch', color: '#4a90d0', shade: '#336ea6',
    lessons: [
      L('Cột mở', 'wR',
        Q('Cột mở là gì, và quân nào nên chiếm nó?', ['Cột không còn Tốt nào – nên đặt Xe ở đó', 'Cột có nhiều Tốt – đặt Tượng', 'Cột a và h – đặt Vua'], 0, { fen: 'r4rk1/pp3ppp/2p5/8/8/2P5/PP3PPP/R4RK1 w - - 0 1', marks: ['d1', 'd8', 'e1', 'e8'] }),
        LINE('Cột d và cột e đều mở. Đưa một Xe vào cột mở!', 'r4rk1/pp3ppp/2p5/8/8/2P5/PP3PPP/R4RK1 w - - 0 1', ['a1d1|a1e1|f1d1|f1e1'])),
      L('Tiền đồn cho Mã', 'wN',
        Q('Ô tiền đồn là gì?', ['Ô được Tốt mình bảo vệ và Tốt đối thủ không đuổi được', 'Ô ở góc bàn', 'Ô cạnh Vua mình'], 0, { fen: '6k1/pp3ppp/3p4/2pP4/2P5/8/PP3PPP/6K1 w - - 0 1', marks: ['e6'] }),
        Q('Mã đứng ở tiền đồn sâu trong thế đối thủ thường…', ['Rất mạnh, khó bị đuổi', 'Vô dụng', 'Sắp bị bắt'], 0)),
      L('Tượng tốt, Tượng xấu', 'wB',
        Q('Tượng "xấu" là Tượng…', ['Bị chính Tốt mình đứng cùng màu ô chặn đường', 'Đã bị đổi', 'Đứng ở ô trắng'], 0, { explain: 'Đặt Tốt trên ô khác màu với Tượng để Tượng được tự do.' })),
      L('Tốt yếu', 'wP',
        Q('Tốt cô lập là Tốt…', ['Không còn Tốt cùng màu ở hai cột bên cạnh', 'Đứng một mình ở hàng 7', 'Bị ghim'], 0, { fen: '6k1/pp3ppp/8/3p4/8/8/PP3PPP/6K1 w - - 0 1', marks: ['d5'] }),
        Q('Hai Tốt cùng màu đứng trên cùng một cột gọi là gì?', ['Tốt chồng', 'Tốt thông', 'Tốt liên kết'], 0)),
      L('Tốt thông', 'wP',
        Q('Tốt thông là Tốt…', ['Không còn Tốt đối thủ nào chặn hay ăn được trên đường tới hàng phong cấp', 'Đứng giữa bàn', 'Đứng ở hàng 4'], 0, { fen: '6k1/5ppp/8/1P6/8/8/5PPP/6K1 w - - 0 1', marks: ['b5'] }),
        RUN('Tốt b thông và Vua Đen ở xa. Đưa nó lên phong cấp an toàn!', '6k1/5ppp/8/1P6/8/8/5PPP/6K1 w - - 0 1', 10)),
      L('Lập kế hoạch', 'quiz',
        Q('Khi không có chiến thuật nào, nên làm gì?', ['Tìm quân kém nhất của mình và đưa nó tới ô tốt hơn', 'Đi Tốt cánh ngẫu nhiên', 'Đổi Hậu ngay'], 0),
        Q('Nên tấn công ở cánh nào?', ['Cánh mà Tốt của mình chỉ về phía đó và mình có nhiều không gian', 'Luôn tấn công cánh Vua', 'Cánh có ít quân mình nhất'], 0)),
      REVIEW('Ôn tập trung cuộc', 4),
    ],
  },
  {
    key: 'pawnend', title: 'Tàn cuộc Tốt', desc: 'Ô then chốt, đối Vua, Tốt thông bên ngoài', color: '#e08a2c', shade: '#ad6619',
    lessons: [
      L('Vua tích cực', 'wK',
        Q('Tàn cuộc chỉ còn Vua và Tốt, Vua nên đứng ở đâu?', ['Trước Tốt của mình, càng lên cao càng tốt', 'Sau Tốt, ở hàng 1', 'Ở góc bàn'], 0)),
      L('Ô then chốt', 'wP',
        Q('Tốt Trắng e4: Vua Trắng chiếm được ô nào thì chắc chắn phong cấp (dù Đen đi trước)?', ['d6, e6 hoặc f6', 'd3, e3 hoặc f3', 'Chỉ e5'], 0, { fen: '8/8/8/8/4P3/8/8/4K2k w - - 0 1', marks: ['d6', 'e6', 'f6'] }),
        RUN('Vua Trắng đã đứng ở ô then chốt e6. Đưa Tốt lên phong cấp!', '4k3/8/4K3/8/4P3/8/8/8 w - - 0 1', 15)),
      L('Tốt thông bên ngoài', 'wP',
        RUN('Tốt a là Tốt thông bên ngoài: đẩy nó để kéo Vua Đen đi, rồi Vua Trắng ăn Tốt còn lại. Phong cấp!', '8/8/4k2p/8/P3K3/7P/8/8 w - - 0 1', 25)),
      L('Đột phá ba Tốt', 'wP',
        LINE('Ba Tốt đối ba Tốt, các Vua ở xa. Đột phá b6!, rồi c6!: một Tốt Trắng sẽ thông và phong cấp.', '8/ppp4k/8/PPP5/8/8/8/7K w - - 0 1', ['b5b6', 'a7b6', 'c5c6', 'b7c6', 'a5a6'])),
      L('Tốt biên', 'quiz',
        Q('Vua + Tốt cột a đấu Vua Đen đã đứng ở ô a8. Kết quả?', ['Hòa', 'Trắng thắng dễ', 'Đen thắng'], 0, { fen: 'k7/8/8/8/P7/8/8/4K3 w - - 0 1', marks: ['a8'], explain: 'Vua Đen chui vào góc thì Tốt biên không thể phong cấp: chỉ có hòa hoặc pat.' })),
      REVIEW('Ôn tập tàn cuộc Tốt', 4),
    ],
  },
  {
    key: 'rookend', title: 'Tàn cuộc Xe', desc: 'Lucena, Philidor và quy tắc Tarrasch', color: '#a8804c', shade: '#7c5d35',
    lessons: [
      L('Xe sau Tốt thông', 'wR',
        Q('Theo quy tắc Tarrasch, Xe nên đứng ở đâu so với Tốt thông?', ['Phía sau Tốt thông (của mình hay của đối thủ)', 'Phía trước Tốt', 'Cạnh Tốt'], 0, { fen: '6k1/8/8/P7/8/8/8/R5K1 w - - 0 1', marks: ['a1', 'a5'] })),
      L('Thế Philidor', 'bR',
        Q('Thế Philidor (bên phòng thủ hòa): Xe phòng thủ đặt ở đâu?', ['Hàng thứ 3 tính từ phía mình, chặn Vua đối thủ tiến lên', 'Ngay cạnh Vua mình', 'Hàng cuối của đối thủ'], 0, { fen: '4k3/8/r7/4P3/4K3/8/8/R7 b - - 0 1', marks: ['a6'] }),
        Q('Khi Tốt đối thủ tiến lên hàng 6, Xe phòng thủ trong thế Philidor làm gì?', ['Xuống hàng cuối của đối thủ để chiếu từ phía sau', 'Đứng yên', 'Đổi lấy Tốt ngay'], 0)),
      L('Thế Lucena', 'wR',
        Q('Thế Lucena (bên tấn công thắng): kỹ thuật nổi tiếng gọi là gì?', ['"Bắc cầu" – dùng Xe che chắn Vua khỏi các nước chiếu', 'Chiếu liên tục', 'Đổi Xe'], 0),
        RUN('Thế Lucena: Vua Trắng ở d8 trước Tốt. Đưa Xe lên hàng 4 để "bắc cầu", rồi phong cấp! Máy cầm Đen.', '3K4/3P1k2/8/8/8/8/2r5/4R3 w - - 0 1', 25)),
      L('Xe cắt Vua', 'wR',
        Q('Vì sao nên dùng Xe "cắt" Vua đối thủ theo một cột hoặc hàng?', ['Vua đối thủ không về kịp để cản Tốt', 'Để đổi Xe', 'Để Vua mình an toàn'], 0, { fen: '8/8/8/8/1k6/8/4PK2/3R4 w - - 0 1', marks: ['d1', 'd8'] })),
      L('Tượng sai màu', 'quiz',
        Q('Vua + Tượng + Tốt cột h, nhưng Tượng không kiểm soát ô phong cấp h8, Vua Đen đã ở góc. Kết quả?', ['Hòa', 'Trắng thắng dễ', 'Đen thắng'], 0, { fen: '7k/8/8/7P/8/3B4/8/6K1 w - - 0 1', marks: ['h8'] })),
      REVIEW('Ôn tập tàn cuộc Xe', 4),
    ],
  },
  {
    key: 'calc', title: 'Tính toán & tốt nghiệp', desc: 'Nước ép buộc, kiểm tra trước khi đi và bài kiểm tra cuối khoá', color: '#c94a3e', shade: '#97352c',
    lessons: [
      L('Nước ép buộc', 'quiz',
        Q('Khi tính toán, nên xét các nước theo thứ tự nào trước?', ['Chiếu – ăn quân – đe dọa', 'Đi Tốt – ra quân – nhập thành', 'Đi Vua – đi Hậu – đi Xe'], 0),
        Q('Trước khi chạm quân, bước kiểm tra cuối cùng là gì?', ['Sau nước này, đối thủ có chiếu, ăn quân hay đe dọa gì không?', 'Đi thật nhanh', 'Chỉ nhìn quân mình'], 0)),
      L('Chiếu hết 2 nước', 'wB',
        MATE(2, 'Bắt đầu bằng một nước ép buộc! Chiếu hết trong 2 nước.', '2kr4/pp1n4/2n5/8/5B2/5Q2/4BPPP/6K1 w - - 0 1')),
      L('Hy sinh để thắng', 'wR',
        MATE(2, 'Một quân phòng thủ phải làm hai việc. Chiếu hết trong 2 nước!', '3q2k1/5ppp/8/8/8/8/4RPPP/4Q1K1 w - - 0 1')),
      L('Kết thúc ván cờ', 'wQ',
        WIN('Hơn hẳn quân thì phải biết kết thúc: chiếu hết Vua Đen trong tối đa 15 nước!', '6k1/8/8/8/8/8/8/QR4K1 w - - 0 1', 15)),
      { ...REVIEW('Ôn tập chặng 2', 6), from: [12, 13, 14, 15, 16, 17, 18] },
      { ...REVIEW('Bài kiểm tra tốt nghiệp', 8), from: 'all' },
    ],
  },
];
})();

// ---------------- Bộ giải nhỏ dùng cho gợi ý và kiểm tra bài ----------------

const LessonSolver = (() => {
  // Bên tới lượt chiếu hết được trong tối đa n nước không? Trả về nước đầu tiên hoặc null.
  function mateIn(g, n) {
    const moves = g.legalMoves();
    // Thử nước chiếu trước cho nhanh
    const scored = moves.map(m => { const u = g._apply(m); const c = g.inCheck(); g._undo(u); return [c ? 0 : 1, m]; });
    scored.sort((a, b) => a[0] - b[0]);
    for (const [, m] of scored) {
      const u = g._apply(m);
      const ok = forced(g, n - 1);
      g._undo(u);
      if (ok) return m;
    }
    return null;
  }

  // Bên tới lượt (bên bị tấn công) có bị chiếu hết trong tối đa n nước nữa của đối phương không
  function forced(g, n) {
    const replies = g.legalMoves();
    if (!replies.length) return g.inCheck();
    if (n <= 0) return false;
    for (const r of replies) {
      const u = g._apply(r);
      const ok = !!mateIn(g, n);
      g._undo(u);
      if (!ok) return false;
    }
    return true;
  }

  // Tìm đường ngắn nhất để quân Trắng đi tới hết các ô mục tiêu (quân Đen đứng yên).
  // Trả về danh sách nước đi hoặc null.
  function collect(g, targets, maxDepth = 14) {
    const side = g.turn;
    const t0 = [...targets].sort((a, b) => a - b);
    const start = { board: g.board.slice(), rem: t0, path: [] };
    const seen = new Set([start.board.join() + '|' + t0.join()]);
    let layer = [start];
    const saved = { board: g.board, turn: g.turn, ep: g.ep, castling: g.castling };
    try {
      for (let d = 0; d < maxDepth && layer.length; d++) {
        const next = [];
        for (const s of layer) {
          g.board = s.board.slice();
          g.turn = side;
          g.ep = -1;
          g.castling = { wK: false, wQ: false, bK: false, bQ: false };
          for (const m of g.legalMoves()) {
            const u = g._apply(m);
            const rem = s.rem.filter(x => x !== m.to);
            const path = s.path.concat([m]);
            g._undo(u);
            if (!rem.length) return path;
            const b = s.board.slice();
            b[m.to] = m.promotion ? side + m.promotion : m.piece;
            b[m.from] = null;
            const key = b.join() + '|' + rem.join();
            if (seen.has(key)) continue;
            seen.add(key);
            next.push({ board: b, rem, path });
          }
        }
        layer = next;
        if (seen.size > 200000) break;
      }
      return null;
    } finally {
      Object.assign(g, saved);
    }
  }

  return { mateIn, forced, collect };
})();

if (typeof module !== 'undefined') module.exports = { COURSE, LessonSolver };
