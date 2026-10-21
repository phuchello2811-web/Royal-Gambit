// Thư viện khai cuộc & tàn cuộc: danh sách, tìm kiếm, xem từng nước, tập với máy / đặt lên bàn.
// Khai cuộc chỉ lưu chuỗi nước (SAN); thế cờ được tính bằng chess.js nên luôn khớp với chuỗi nước.
// `cat`: gambit | open (1.e4 e5) | semi (1.e4, Đen không đi e5) | closed (1.d4 d5) | indian (1.d4, Đen không đi d5) | flank | endgame.
// Thêm khai cuộc: thêm một dòng O(...) vào OPENINGS, cùng nhóm với các khai cuộc giống nó.

const O = (id, nameVi, name, cat, moves, desc) => ({ id, nameVi, name, cat, moves, desc });

const OPENINGS = [
  // ----- Gambit -----
  O('kings-gambit', 'Gambit Vua', "King's Gambit", 'gambit', '1.e4 e5 2.f4',
    'Trắng thí tốt f để kéo tốt e5 khỏi trung tâm, mở cột f cho Xe và đường chéo cho Tượng c4. Khai cuộc lãng mạn của thế kỷ 19, đòi hỏi cả hai bên tính toán sắc bén.'),
  O('falkbeer', 'Phản gambit Falkbeer', 'Falkbeer Countergambit', 'gambit', '1.e4 e5 2.f4 d5',
    'Đen không ăn tốt mà phản đòn ngay ở trung tâm, thí lại một tốt để giành thế chủ động. Cách đáp trả Gambit Vua hiếu chiến nhất.'),
  O('queens-gambit', 'Gambit Hậu', "Queen's Gambit", 'gambit', '1.d4 d5 2.c4',
    'Trắng "thí" tốt c để kéo tốt d5 ra khỏi trung tâm; nếu Đen ăn, Trắng thường lấy lại dễ dàng. Nền tảng của cờ hiện đại, an toàn mà giàu kế hoạch.'),
  O('evans-gambit', 'Gambit Evans', 'Evans Gambit', 'gambit', '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4',
    'Từ Khai cuộc Ý, Trắng thí tốt b để đuổi Tượng c5 và dựng trung tâm c3–d4 với tốc độ. Vũ khí ưa thích của Morphy và Kasparov.'),
  O('danish-gambit', 'Gambit Đan Mạch', 'Danish Gambit', 'gambit', '1.e4 e5 2.d4 exd4 3.c3',
    'Trắng sẵn sàng thí hai tốt để hai Tượng cùng nhắm vào vua Đen. Đen phải phòng thủ chính xác hoặc trả lại tốt đúng lúc.'),
  O('scotch-gambit', 'Gambit Scotland', 'Scotch Gambit', 'gambit', '1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Bc4',
    'Thay vì ăn lại tốt d4, Trắng phát triển Tượng nhắm f7 và chờ tấn công. Hay chuyển sang những thế cờ của Phòng thủ Hai Mã.'),
  O('smith-morra', 'Gambit Smith-Morra', 'Smith-Morra Gambit', 'gambit', '1.e4 c5 2.d4 cxd4 3.c3',
    'Vũ khí chống Phòng thủ Sicily: Trắng thí tốt để phát triển nhanh, mở cột c và d cho Xe. Rất hiệu quả ở cờ nhanh.'),
  O('blackmar-diemer', 'Gambit Blackmar-Diemer', 'Blackmar-Diemer Gambit', 'gambit', '1.d4 d5 2.e4 dxe4 3.Nc3',
    'Trắng thí tốt e rồi chơi f3 để mở cột f, dồn toàn lực tấn công cánh Vua. Mạo hiểm nhưng rất khó chịu cho bên phòng thủ thiếu kinh nghiệm.'),
  O('staunton-gambit', 'Gambit Staunton', 'Staunton Gambit', 'gambit', '1.d4 f5 2.e4',
    'Đáp trả Phòng thủ Hà Lan bằng cách thí ngay tốt e, nhắm vào ô e6 và vua Đen vừa bị nới lỏng sau f5.'),
  O('benko-gambit', 'Gambit Benko', 'Benko Gambit', 'gambit', '1.d4 Nf6 2.c4 c5 3.d5 b5',
    'Đen thí tốt b để mở cột a và b, rồi gây áp lực lâu dài ở cánh Hậu bằng Xe và Tượng fianchetto. Đền bù dài hạn chứ không phải tấn công chớp nhoáng.'),
  O('budapest', 'Gambit Budapest', 'Budapest Gambit', 'gambit', '1.d4 Nf6 2.c4 e5',
    'Đen thí tốt e5 để Mã nhảy g4 và Tượng ra nhanh. Nhiều bẫy ngắn cho bên Trắng thiếu chuẩn bị.'),
  O('albin', 'Phản gambit Albin', 'Albin Countergambit', 'gambit', '1.d4 d5 2.c4 e5',
    'Đen đáp Gambit Hậu bằng một gambit: sau dxe5 d4, tốt d4 chặn đường phát triển của Trắng. Có bẫy nổi tiếng Lasker (phong Mã).'),
  O('latvian', 'Gambit Latvia', 'Latvian Gambit', 'gambit', '1.e4 e5 2.Nf3 f5',
    'Một gambit rất liều của Đen ngay nước thứ hai. Thực tế thường bất lợi, nhưng đầy bẫy và khó chịu nếu Trắng không biết cách đáp.'),
  O('stafford', 'Gambit Stafford', 'Stafford Gambit', 'gambit', '1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6',
    'Đen bỏ tốt e5 để phát triển nhanh và giăng hàng loạt bẫy chiếu hết. Nổi tiếng trên mạng; biết cách đáp thì Trắng có lợi thế.'),
  O('englund', 'Gambit Englund', 'Englund Gambit', 'gambit', '1.d4 e5',
    'Đen thí tốt ngay nước đầu để chơi Hậu e7 và giăng bẫy dọc cột e. Lý thuyết đánh giá thấp, nhưng là bài học tốt về phát triển quân.'),

  // ----- Ván mở (1.e4 e5) -----
  O('italian', 'Khai cuộc Ý', 'Italian Game (Giuoco Piano)', 'open', '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5',
    'Hai bên phát triển Mã, Tượng nhắm vào trung tâm và ô f7/f2. Kế hoạch điển hình: c3, d4 hoặc d3 chậm rãi rồi điều quân cánh Vua. Khai cuộc đầu tiên nên học.'),
  O('two-knights', 'Phòng thủ Hai Mã', 'Two Knights Defense', 'open', '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6',
    'Đen phản công tốt e4 thay vì ra Tượng c5. Nếu Trắng đi Ng5 đánh f7, thế cờ trở nên sắc bén với nhiều thí quân.'),
  O('fried-liver', 'Tấn công Fried Liver', 'Fried Liver Attack', 'open', '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5 6.Nxf7',
    'Trắng thí Mã ở f7 để kéo vua Đen ra giữa bàn rồi dồn quân tấn công. Bẫy kinh điển: Đen nên tránh 5...Nxd5 bằng 5...Na5.'),
  O('ruy-lopez', 'Khai cuộc Tây Ban Nha', 'Ruy Lopez', 'open', '1.e4 e5 2.Nf3 Nc6 3.Bb5',
    'Tượng gây áp lực lên Mã c6, quân đang bảo vệ tốt e5. Một trong những khai cuộc lâu đời và giàu chiến lược nhất, được các nhà vô địch thế giới ưa dùng.'),
  O('berlin', 'Phòng thủ Berlin', 'Ruy Lopez: Berlin Defense', 'open', '1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6',
    'Bức tường Berlin: Đen phản công e4 và sẵn sàng đổi Hậu sớm để vào tàn cuộc rất vững. Kramnik dùng nó để hạ Kasparov năm 2000.'),
  O('scotch', 'Khai cuộc Scotland', 'Scotch Game', 'open', '1.e4 e5 2.Nf3 Nc6 3.d4',
    'Trắng phá trung tâm ngay bằng d4, mở thế cờ sớm. Ít lý thuyết hơn Tây Ban Nha nhưng vẫn giữ được thế chủ động.'),
  O('four-knights', 'Khai cuộc Bốn Mã', 'Four Knights Game', 'open', '1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6',
    'Cả bốn Mã ra ô tự nhiên nhất. Thế cờ cân đối, dễ hiểu, phù hợp người mới học nguyên tắc phát triển quân.'),
  O('petrov', 'Phòng thủ Petrov', 'Petrov Defense', 'open', '1.e4 e5 2.Nf3 Nf6',
    'Đen không bảo vệ e5 mà phản công ngay e4. Rất vững chắc, thường dẫn tới thế cờ cân bằng. Lưu ý: 3.Nxe5 Nxe4?? 4.Qe2 là bẫy mất Hậu.'),
  O('philidor-def', 'Phòng thủ Philidor', 'Philidor Defense', 'open', '1.e4 e5 2.Nf3 d6',
    'Đen giữ e5 bằng tốt d6: vững nhưng hơi thụ động, Tượng f8 bị chặn. Thường chuyển sang hệ thống Hanham với Nd7, Be7, c6.'),
  O('vienna', 'Khai cuộc Vienna', 'Vienna Game', 'open', '1.e4 e5 2.Nc3',
    'Trắng ra Mã c3 trước để giữ khả năng đẩy f4 sau đó, như một Gambit Vua được chuẩn bị kỹ hơn.'),
  O('ponziani', 'Khai cuộc Ponziani', 'Ponziani Opening', 'open', '1.e4 e5 2.Nf3 Nc6 3.c3',
    'Trắng chuẩn bị d4 để dựng trung tâm tốt lớn. Ít gặp nên dễ bất ngờ, nhưng Đen có thể phản công ngay bằng d5 hoặc Nf6.'),
  O('bishops-opening', 'Khai cuộc Tượng', "Bishop's Opening", 'open', '1.e4 e5 2.Bc4',
    'Tượng nhắm ngay f7 và giữ linh hoạt cho Mã g1 và tốt f. Có thể chuyển sang Khai cuộc Ý hoặc Vienna.'),

  // ----- Nửa mở (1.e4, Đen không đi e5) -----
  O('sicilian', 'Phòng thủ Sicily', 'Sicilian Defense', 'semi', '1.e4 c5',
    'Đen tranh ô d4 bằng tốt cánh, tạo thế cờ lệch đầy phản công. Khai cuộc phổ biến nhất và giàu chiến thắng nhất cho Đen trước 1.e4.'),
  O('najdorf', 'Sicily: Biến Najdorf', 'Sicilian: Najdorf Variation', 'semi', '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6',
    'Nước a6 khiêm tốn ngăn Mã và Tượng Trắng vào b5, chuẩn bị e5 hoặc b5. Biến thể yêu thích của Fischer và Kasparov, lý thuyết cực kỳ sâu.'),
  O('dragon', 'Sicily: Biến Rồng', 'Sicilian: Dragon Variation', 'semi', '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6',
    'Tượng fianchetto g7 như "con rồng" phun lửa dọc đường chéo dài. Hai bên thường nhập thành khác cánh và đua tấn công vua.'),
  O('alapin', 'Sicily: Biến Alapin', 'Sicilian: Alapin Variation', 'semi', '1.e4 c5 2.c3',
    'Trắng chuẩn bị d4 để dựng trung tâm tốt mà không phải đổi tốt d. Cách tránh lý thuyết Sicily mở rộng mà vẫn có thế cờ tốt.'),
  O('french', 'Phòng thủ Pháp', 'French Defense', 'semi', '1.e4 e6 2.d4 d5',
    'Đen tranh trung tâm bằng d5 với tốt e6 làm điểm tựa. Thế cờ đóng, giàu chiến lược; điểm yếu muôn thuở là Tượng c8 bị chính tốt nhà chặn.'),
  O('french-advance', 'Pháp: Biến tiến', 'French: Advance Variation', 'semi', '1.e4 e6 2.d4 d5 3.e5',
    'Trắng đẩy e5 chiếm không gian cánh Vua. Đen phản công chuỗi tốt bằng c5 và Qb6, đánh vào gốc d4.'),
  O('caro-kann', 'Phòng thủ Caro-Kann', 'Caro-Kann Defense', 'semi', '1.e4 c6 2.d4 d5',
    'Giống Phòng thủ Pháp nhưng Tượng c8 vẫn ra ngoài được. Cấu trúc tốt rất vững, ít điểm yếu, hợp người thích chơi chắc.'),
  O('caro-advance', 'Caro-Kann: Biến tiến', 'Caro-Kann: Advance Variation', 'semi', '1.e4 c6 2.d4 d5 3.e5 Bf5',
    'Trắng giành không gian bằng e5, Đen kịp đưa Tượng ra f5 trước khi đóng chuỗi tốt bằng e6. Thế cờ nhiều kế hoạch cho cả hai bên.'),
  O('scandinavian', 'Phòng thủ Scandinavia', 'Scandinavian Defense', 'semi', '1.e4 d5 2.exd5 Qxd5',
    'Đen đánh vào e4 ngay nước đầu và ăn lại bằng Hậu. Hậu ra sớm bị đuổi nhưng thế cờ đơn giản, dễ nắm kế hoạch.'),
  O('alekhine', 'Phòng thủ Alekhine', 'Alekhine Defense', 'semi', '1.e4 Nf6 2.e5 Nd5',
    'Đen mời Trắng đẩy tốt đuổi Mã để trung tâm tốt Trắng bị kéo căng, rồi phản công các tốt đó. Khai cuộc khiêu khích kiểu "siêu hiện đại".'),
  O('pirc', 'Phòng thủ Pirc', 'Pirc Defense', 'semi', '1.e4 d6 2.d4 Nf6 3.Nc3 g6',
    'Đen để Trắng chiếm trung tâm, fianchetto Tượng g7 rồi phản công bằng c5 hoặc e5. Linh hoạt, nhưng phải cẩn thận trước tấn công nhanh.'),
  O('modern', 'Phòng thủ Hiện đại', 'Modern Defense', 'semi', '1.e4 g6 2.d4 Bg7',
    'Họ hàng của Pirc: Tượng ra g7 trước, giữ Mã g8 linh hoạt. Rất ít lý thuyết bắt buộc, phù hợp người thích thế cờ khác lạ.'),

  // ----- Ván đóng (1.d4 d5) -----
  O('qgd', 'Gambit Hậu từ chối', "Queen's Gambit Declined", 'closed', '1.d4 d5 2.c4 e6 3.Nc3 Nf6',
    'Đen giữ vững d5 bằng e6, chấp nhận Tượng c8 hơi bí để đổi lấy sự chắc chắn. Kế hoạch cổ điển: phát triển hết quân rồi giải phóng bằng c5 hoặc e5.'),
  O('qga', 'Gambit Hậu nhận', "Queen's Gambit Accepted", 'closed', '1.d4 d5 2.c4 dxc4',
    'Đen ăn tốt c4 nhưng không cố giữ, dùng thời gian Trắng lấy lại tốt để phát triển và đánh vào trung tâm bằng c5.'),
  O('slav', 'Phòng thủ Slav', 'Slav Defense', 'closed', '1.d4 d5 2.c4 c6',
    'Đen giữ d5 bằng tốt c6, để đường cho Tượng c8 ra ngoài. Một trong những phòng thủ vững nhất trước Gambit Hậu.'),
  O('catalan', 'Khai cuộc Catalan', 'Catalan Opening', 'closed', '1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2',
    'Trắng kết hợp Gambit Hậu với Tượng fianchetto g2 nhắm vào cánh Hậu Đen. Áp lực âm ỉ và dài lâu, được nhiều siêu đại kiện tướng ưa dùng.'),
  O('london', 'Hệ thống London', 'London System', 'closed', '1.d4 d5 2.Nf3 Nf6 3.Bf4',
    'Trắng dựng cùng một thế trận (Bf4, e3, c3, Nbd2, Bd3) bất kể Đen đi gì. Dễ học, ít lý thuyết, rất phổ biến ở mọi trình độ.'),
  O('colle', 'Hệ thống Colle', 'Colle System', 'closed', '1.d4 d5 2.Nf3 Nf6 3.e3 e6 4.Bd3',
    'Trắng xây thế trận khiêm tốn rồi đẩy e4 để mở đường cho Tượng d3 tấn công cánh Vua. Kế hoạch rõ ràng, hợp người mới.'),

  // ----- Ấn Độ & 1.d4 khác -----
  O('kings-indian', 'Phòng thủ Ấn Độ Vua', "King's Indian Defense", 'indian', '1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6',
    'Đen để Trắng dựng trung tâm lớn rồi phản công bằng e5 hoặc c5, thường tấn công cánh Vua dữ dội. Vũ khí của Fischer và Kasparov.'),
  O('nimzo-indian', 'Phòng thủ Nimzo-Ấn', 'Nimzo-Indian Defense', 'indian', '1.d4 Nf6 2.c4 e6 3.Nc3 Bb4',
    'Tượng ghim Mã c3 để ngăn e4; Đen sẵn sàng đổi Tượng lấy Mã để làm hỏng cấu trúc tốt Trắng. Một trong những phòng thủ được đánh giá cao nhất.'),
  O('queens-indian', 'Phòng thủ Ấn Độ Hậu', "Queen's Indian Defense", 'indian', '1.d4 Nf6 2.c4 e6 3.Nf3 b6',
    'Đen fianchetto Tượng b7 để khống chế ô e4. Rất vững, hợp với người thích chơi chiến lược.'),
  O('grunfeld', 'Phòng thủ Grünfeld', 'Grünfeld Defense', 'indian', '1.d4 Nf6 2.c4 g6 3.Nc3 d5',
    'Đen cho Trắng dựng trung tâm tốt rồi đánh phá bằng Tượng g7, c5 và Mã. Năng động và đòi hỏi tính toán chính xác.'),
  O('benoni', 'Phòng thủ Benoni hiện đại', 'Modern Benoni', 'indian', '1.d4 Nf6 2.c4 c5 3.d5 e6',
    'Thế cờ lệch: Đen có đa số tốt cánh Hậu và Tượng g7 mạnh, Trắng có trung tâm và không gian. Hai bên đều có cơ hội thắng.'),
  O('dutch', 'Phòng thủ Hà Lan', 'Dutch Defense', 'indian', '1.d4 f5',
    'Đen khống chế ô e4 bằng tốt f, chuẩn bị tấn công cánh Vua. Các biến thể chính: Bức tường đá (Stonewall) và Leningrad.'),
  O('trompowsky', 'Tấn công Trompowsky', 'Trompowsky Attack', 'indian', '1.d4 Nf6 2.Bg5',
    'Trắng ghim/đổi Mã f6 ngay, tránh lý thuyết Ấn Độ dài dằng dặc. Đơn giản, thực dụng và hay đưa đối thủ vào thế cờ lạ.'),

  // ----- Cánh -----
  O('english', 'Khai cuộc Anh', 'English Opening', 'flank', '1.c4',
    'Trắng khống chế d5 từ cánh, giữ thế trận linh hoạt và thường fianchetto Tượng g2. Có thể chuyển sang nhiều hệ thống của 1.d4.'),
  O('reversed-sicilian', 'Anh: Sicily đảo ngược', 'English: Reversed Sicilian', 'flank', '1.c4 e5 2.Nc3 Nf6',
    'Giống Phòng thủ Sicily nhưng Trắng đi trước một nhịp. Trắng thường chơi g3, Bg2 và gây áp lực dọc đường chéo dài.'),
  O('reti', 'Khai cuộc Réti', 'Réti Opening', 'flank', '1.Nf3 d5 2.c4',
    'Trắng không chiếm trung tâm bằng tốt mà tấn công nó từ xa bằng Mã, tốt c và Tượng fianchetto. Tư tưởng "siêu hiện đại" kinh điển.'),
  O('kia', 'Tấn công Ấn Độ Vua', "King's Indian Attack", 'flank', '1.Nf3 d5 2.g3 Nf6 3.Bg2 e6 4.O-O Be7 5.d3',
    'Một hệ thống cho Trắng: Mã f3, Tượng g2, nhập thành, d3 rồi e4, sau đó tấn công cánh Vua. Fischer từng dùng nhiều năm.'),
  O('bird', 'Khai cuộc Bird', 'Bird Opening', 'flank', '1.f4 d5 2.Nf3',
    'Trắng khống chế e5 bằng tốt f, giống Phòng thủ Hà Lan với một nhịp hơn. Cẩn thận Gambit From 1...e5 của Đen.'),
  O('larsen', 'Khai cuộc Larsen', 'Larsen Opening', 'flank', '1.b3 e5 2.Bb2',
    'Tượng fianchetto b2 gây áp lực ngay lên tốt e5 và trung tâm. Khai cuộc ít gặp, dẫn tới thế cờ không theo lối mòn.'),
];

const ENDGAMES = [
  { id: 'kq-k', nameVi: 'Vua + Hậu vs Vua', name: 'Queen Mate', cat: 'endgame', moves: 'Chiếu hết cơ bản',
    fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
    desc: 'Dùng Hậu thu hẹp "chiếc hộp" quanh vua đối phương (đi nước Mã cách vua), đẩy về mép bàn rồi đưa vua mình tới hỗ trợ. Luôn để vua đối phương còn ô đi để tránh pat.' },
  { id: 'kr-k', nameVi: 'Vua + Xe vs Vua', name: 'Rook Mate', cat: 'endgame', moves: 'Chiếu hết bằng Xe',
    fen: '8/8/8/4k3/8/8/8/3RK3 w - - 0 1',
    desc: 'Xe cắt vua đối phương theo hàng/cột, vua mình tiến lên đối mặt. Khi hai vua đối mặt, Xe chiếu để đẩy lùi thêm một hàng, lặp lại tới mép bàn.' },
  { id: 'krr-k', nameVi: 'Hai Xe chiếu hết', name: 'Ladder Mate', cat: 'endgame', moves: 'Xe bậc thang',
    fen: '8/8/8/4k3/8/8/8/R3K2R w KQ - 0 1',
    desc: 'Hai Xe thay nhau chiếu theo kiểu bậc thang, mỗi lần đẩy vua đối phương lùi một hàng. Không cần vua hỗ trợ; chỉ cần giữ Xe xa vua đối phương.' },
  { id: 'kbb-k', nameVi: 'Hai Tượng chiếu hết', name: 'Two Bishops Mate', cat: 'endgame', moves: 'Tượng đôi',
    fen: '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1',
    desc: 'Hai Tượng đứng cạnh nhau tạo thành "bức tường" chéo, vua mình hỗ trợ dồn vua đối phương vào góc bất kỳ rồi chiếu hết.' },
  { id: 'kbn-k', nameVi: 'Tượng + Mã vs Vua', name: 'Bishop & Knight Mate', cat: 'endgame', moves: 'Chiếu hết khó nhất',
    fen: '8/8/8/4k3/8/8/8/2B1KN2 w - - 0 1',
    desc: 'Chỉ chiếu hết được ở góc cùng màu với Tượng. Kỹ thuật "chữ W" của Mã giúp đẩy vua từ góc sai sang góc đúng trong 50 nước.' },
  { id: 'square-rule', nameVi: 'Quy tắc hình vuông', name: 'Rule of the Square', cat: 'endgame', moves: 'Vua đuổi tốt',
    fen: '8/8/8/P3k3/8/8/8/7K b - - 0 1',
    desc: 'Vẽ hình vuông từ tốt tới hàng phong cấp (ở đây a5–d8). Nếu vua bước vào được hình vuông đó thì đuổi kịp tốt. Đen đi trước: Kd6 là kịp.' },
  { id: 'opposition', nameVi: 'Đối mặt Vua', name: 'Opposition', cat: 'endgame', moves: 'Vua + Tốt vs Vua',
    fen: '8/3k4/8/3P4/8/8/3K4/8 w - - 0 1',
    desc: 'Hai vua đứng đối diện cách một ô: bên không phải đi là bên "giữ đối mặt". Giành đối mặt giúp vua tiến lên ô then chốt trước tốt để phong cấp.' },
  { id: 'rook-pawn', nameVi: 'Tốt biên', name: 'Rook Pawn', cat: 'endgame', moves: 'Tốt cột a/h',
    fen: '8/8/8/8/8/k7/P7/K7 w - - 0 1',
    desc: 'Tốt cột a/h khó thắng: vua phòng thủ chỉ cần chiếm góc phong cấp là hòa. Ở đây vua Trắng bị kẹt trước tốt nhà.' },
  { id: 'queen-vs-pawn', nameVi: 'Hậu vs Tốt sắp phong', name: 'Queen vs Pawn', cat: 'endgame', moves: 'Cản tốt phong cấp',
    fen: '8/8/8/8/8/8/3pk3/K6Q w - - 0 1',
    desc: 'Hậu chiếu liên tục để ép vua đối phương đứng chắn trước tốt, mỗi lần như vậy vua mình tiến thêm một bước. Thắng được với tốt giữa; tốt Tượng và tốt biên thường hòa.' },
  { id: 'lucena', nameVi: 'Thế Lucena', name: 'Lucena Position', cat: 'endgame', moves: 'Xe + Tốt vs Xe (thắng)',
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
    desc: 'Bên có tốt hàng 7 thắng bằng kỹ thuật "xây cầu": Xe lên hàng 4 để che chiếu cho vua khi vua bước ra khỏi ô phong cấp.' },
  { id: 'philidor', nameVi: 'Thế Philidor', name: 'Philidor Position', cat: 'endgame', moves: 'Xe + Tốt vs Xe (hòa)',
    fen: '4k3/8/1r6/4PK2/8/8/8/R7 b - - 0 1',
    desc: 'Bên phòng thủ giữ Xe ở hàng 6 để vua Trắng không tiến lên được. Khi tốt lên hàng 6, Xe chuyển xuống hàng 1 chiếu từ phía sau: hòa.' },
  { id: 'opp-bishops', nameVi: 'Tượng khác màu', name: 'Opposite-Colored Bishops', cat: 'endgame', moves: 'Hơn tốt vẫn hòa',
    fen: '8/4k3/4p3/3pP3/3P3P/4K3/3B4/5b2 w - - 0 1',
    desc: 'Tượng hai bên đi ô khác màu: bên yếu dựng tốt và vua trên ô màu Tượng mình để phong toả. Hơn một, đôi khi hai tốt vẫn thường hòa.' },
  { id: 'same-bishops', nameVi: 'Tượng cùng màu', name: 'Same-Colored Bishops', cat: 'endgame', moves: 'Tượng tốt và Tượng xấu',
    fen: '2b5/4k3/4p3/3pP3/3P3P/4K3/8/5B2 w - - 0 1',
    desc: 'Tượng Đen bị chính tốt e6, d5 nằm trên ô trắng cản đường: đó là "Tượng xấu". Bên có Tượng hoạt động hơn và vua vào sâu thường thắng.' },
];

// Bản tiếng Anh của mô tả (dùng khi chọn English, xem i18n.js)
const LIB_EN = {
  'kings-gambit': ['White gives up the f-pawn to deflect e5 from the centre, opening the f-file for the rook and the diagonal for the c4 bishop. The romantic opening of the 19th century, demanding sharp calculation from both sides.'],
  'falkbeer': ['Black declines the pawn and strikes back in the centre at once, returning a pawn to seize the initiative. The most combative answer to the King\'s Gambit.'],
  'queens-gambit': ['White offers the c-pawn to lure the d5 pawn from the centre; if Black takes, White usually regains it easily. A cornerstone of modern chess: safe yet rich in plans.'],
  'evans-gambit': ['From the Italian Game, White sacrifices the b-pawn to chase the c5 bishop and build a c3–d4 centre with tempo. A favourite weapon of Morphy and Kasparov.'],
  'danish-gambit': ['White is willing to give two pawns so that both bishops rake the black king. Black must defend precisely or give the material back at the right moment.'],
  'scotch-gambit': ['Instead of recapturing on d4, White develops the bishop toward f7 and prepares an attack. Often transposes into Two Knights Defense positions.'],
  'smith-morra': ['An anti-Sicilian weapon: White gives a pawn for rapid development and open c- and d-files for the rooks. Very effective in fast games.'],
  'blackmar-diemer': ['White gives the e-pawn, then plays f3 to open the f-file and throw everything at the kingside. Risky, but very unpleasant for an inexperienced defender.'],
  'staunton-gambit': ['Meets the Dutch Defense by sacrificing the e-pawn at once, targeting e6 and the black king loosened by f5.'],
  'benko-gambit': ['Black gives the b-pawn to open the a- and b-files, then presses on the queenside with rooks and a fianchettoed bishop. Long-term compensation rather than a quick attack.'],
  'budapest': ['Black offers the e5 pawn so the knight can jump to g4 and the bishop can develop quickly. Full of short traps for an unprepared White.'],
  'albin': ['Black answers the Queen\'s Gambit with a gambit: after dxe5 d4 the d4 pawn cramps White\'s development. Features the famous Lasker Trap (promoting to a knight).'],
  'latvian': ['A very risky gambit by Black on move two. Objectively dubious, but full of traps and awkward if White does not know the answer.'],
  'stafford': ['Black gives up e5 for fast development and a series of mating traps. Popular online; with the right replies White is better.'],
  'englund': ['Black sacrifices a pawn on move one to play Qe7 and set traps along the e-file. Rated poorly by theory, but a good lesson in development.'],
  'italian': ['Both sides develop knights and bishops toward the centre and the f7/f2 squares. Typical plans: c3 and d4, or a slow d3 followed by kingside manoeuvres. The first opening to learn.'],
  'two-knights': ['Black counterattacks e4 instead of playing Bc5. If White goes Ng5 hitting f7, the game turns sharp with many sacrifices.'],
  'fried-liver': ['White sacrifices the knight on f7 to drag the black king into the centre and attack. A classic trap: Black should avoid 5...Nxd5 and play 5...Na5.'],
  'ruy-lopez': ['The bishop pressures the c6 knight, the defender of e5. One of the oldest and most strategic openings, loved by world champions.'],
  'berlin': ['The Berlin Wall: Black counterattacks e4 and happily trades queens early for a very solid endgame. Kramnik used it to beat Kasparov in 2000.'],
  'scotch': ['White breaks in the centre at once with d4 and opens the game early. Less theory than the Ruy Lopez while keeping the initiative.'],
  'four-knights': ['All four knights go to their most natural squares. A balanced, easy-to-understand game, ideal for learning development principles.'],
  'petrov': ['Black ignores e5 and counterattacks e4 straight away. Very solid and often leads to equality. Beware: 3.Nxe5 Nxe4?? 4.Qe2 wins the knight.'],
  'philidor-def': ['Black holds e5 with d6: solid but a little passive, with the f8 bishop blocked in. Often turns into the Hanham setup with Nd7, Be7 and c6.'],
  'vienna': ['White develops the c3 knight first to keep f4 in reserve, like a better-prepared King\'s Gambit.'],
  'ponziani': ['White prepares d4 to build a big pawn centre. Rare and surprising, but Black can hit back at once with d5 or Nf6.'],
  'bishops-opening': ['The bishop eyes f7 immediately while keeping the g1 knight and f-pawn flexible. Can transpose to the Italian or the Vienna.'],
  'sicilian': ['Black fights for d4 with a wing pawn, creating an unbalanced game full of counterplay. The most popular and most successful reply to 1.e4.'],
  'najdorf': ['The modest a6 keeps White\'s knight and bishop off b5 and prepares e5 or b5. The favourite of Fischer and Kasparov, with extremely deep theory.'],
  'dragon': ['The g7 bishop breathes fire down the long diagonal like a dragon. The sides often castle on opposite wings and race to attack.'],
  'alapin': ['White prepares d4 to build a pawn centre without trading the d-pawn. A way to avoid main-line Sicilian theory while keeping a good game.'],
  'french': ['Black challenges the centre with d5, supported by e6. Closed, strategic positions; the eternal problem is the c8 bishop blocked by its own pawns.'],
  'french-advance': ['White pushes e5 to gain kingside space. Black attacks the pawn chain with c5 and Qb6, hitting its base on d4.'],
  'caro-kann': ['Like the French, but the c8 bishop can still get out. A very sound pawn structure with few weaknesses, ideal for solid players.'],
  'caro-advance': ['White grabs space with e5, Black gets the bishop to f5 before closing the chain with e6. Plenty of plans for both sides.'],
  'scandinavian': ['Black hits e4 on move one and recaptures with the queen. The queen gets chased, but the position is simple and the plans are clear.'],
  'alekhine': ['Black invites White to chase the knight with pawns, overextending the centre, then attacks those pawns. A provocative hypermodern opening.'],
  'pirc': ['Black lets White take the centre, fianchettoes on g7 and counterattacks with c5 or e5. Flexible, but beware of fast attacks.'],
  'modern': ['A relative of the Pirc: the bishop goes to g7 first, keeping the g8 knight flexible. Very little forced theory, for fans of unusual positions.'],
  'qgd': ['Black holds d5 with e6, accepting a slightly passive c8 bishop for solidity. Classical plan: complete development, then free the game with c5 or e5.'],
  'qga': ['Black takes on c4 without trying to keep the pawn, using the time White spends regaining it to develop and strike with c5.'],
  'slav': ['Black supports d5 with c6, keeping the c8 bishop free. One of the most solid defences to the Queen\'s Gambit.'],
  'catalan': ['White combines the Queen\'s Gambit with a g2 fianchetto aimed at Black\'s queenside. Long, nagging pressure favoured by many elite players.'],
  'london': ['White sets up the same structure (Bf4, e3, c3, Nbd2, Bd3) whatever Black does. Easy to learn, little theory, popular at every level.'],
  'colle': ['White builds a modest setup, then pushes e4 to unleash the d3 bishop against the kingside. Clear plans, good for beginners.'],
  'kings-indian': ['Black lets White build a big centre, then counterattacks with e5 or c5, often with a fierce kingside attack. A weapon of Fischer and Kasparov.'],
  'nimzo-indian': ['The bishop pins the c3 knight to stop e4; Black will trade bishop for knight to damage White\'s pawns. One of the most respected defences.'],
  'queens-indian': ['Black fianchettoes on b7 to control e4. Very solid, suited to strategic players.'],
  'grunfeld': ['Black lets White build a pawn centre, then attacks it with the g7 bishop, c5 and the knights. Dynamic and calculation-heavy.'],
  'benoni': ['An unbalanced game: Black has a queenside majority and a strong g7 bishop, White has the centre and space. Both sides play for a win.'],
  'dutch': ['Black controls e4 with the f-pawn and prepares a kingside attack. Main systems: the Stonewall and the Leningrad.'],
  'trompowsky': ['White pins or trades the f6 knight at once, sidestepping long Indian theory. Simple, practical and often leads to unfamiliar positions.'],
  'english': ['White controls d5 from the flank, keeps a flexible setup and often fianchettoes on g2. Can transpose into many 1.d4 systems.'],
  'reversed-sicilian': ['A Sicilian with colours reversed and an extra tempo for White. White usually plays g3 and Bg2, pressing along the long diagonal.'],
  'reti': ['White does not occupy the centre with pawns but attacks it from afar with the knight, the c-pawn and a fianchettoed bishop. Classic hypermodern thinking.'],
  'kia': ['A system for White: Nf3, Bg2, castle, d3 then e4, followed by a kingside attack. Fischer used it for years.'],
  'bird': ['White controls e5 with the f-pawn, like a Dutch Defense with an extra tempo. Watch out for From\'s Gambit 1...e5.'],
  'larsen': ['The b2 bishop immediately pressures e5 and the centre. A rare opening leading to off-the-beaten-path positions.'],
  'kq-k': ['Use the queen to shrink the "box" around the enemy king (a knight\'s move away), drive it to the edge, then bring your king to help. Always leave the king a square to avoid stalemate.', 'Basic mate'],
  'kr-k': ['The rook cuts the enemy king off along a rank or file while your king walks up. When the kings face each other, a rook check pushes it back one more rank, until the edge.', 'Rook mate'],
  'krr-k': ['The two rooks take turns checking, ladder-style, pushing the king back one rank at a time. No king needed; just keep the rooks far from the enemy king.', 'Ladder mate'],
  'kbb-k': ['Two bishops side by side form a diagonal wall; with your king\'s help, drive the enemy king into any corner and mate.', 'Bishop pair'],
  'kbn-k': ['Mate is only possible in a corner of the bishop\'s colour. The knight\'s "W manoeuvre" drives the king from the wrong corner to the right one within 50 moves.', 'Hardest basic mate'],
  'square-rule': ['Draw a square from the pawn to its promotion rank (here a5–d8). If the king can step into that square, it catches the pawn. Black to move: Kd6 is in time.', 'King catches pawn'],
  'opposition': ['Kings facing each other one square apart: the side not to move "has the opposition". Taking the opposition lets your king reach the key squares in front of the pawn.', 'King + pawn vs king'],
  'rook-pawn': ['An a- or h-pawn is hard to win with: the defending king only needs to reach the promotion corner to draw. Here the white king is stuck in front of its own pawn.', 'a/h pawn'],
  'queen-vs-pawn': ['The queen checks repeatedly to force the enemy king in front of its pawn, gaining a tempo each time for your king to approach. Wins against centre pawns; bishop and rook pawns often draw.', 'Stopping promotion'],
  'lucena': ['With the pawn on the 7th, the stronger side wins by "building a bridge": the rook goes to the 4th rank to shield the king from checks as it steps out.', 'Rook + pawn vs rook (win)'],
  'philidor': ['The defender keeps the rook on the 6th rank so the white king cannot advance. Once the pawn reaches the 6th, the rook drops to the 1st rank and checks from behind: a draw.', 'Rook + pawn vs rook (draw)'],
  'opp-bishops': ['With opposite-coloured bishops, the weaker side blockades with pawns and king on its bishop\'s colour. One or even two extra pawns are often not enough to win.', 'A pawn up, still a draw'],
  'same-bishops': ['Black\'s bishop is hemmed in by its own pawns on e6 and d5, which stand on light squares: a "bad bishop". The side with the more active bishop and king usually wins.', 'Good bishop vs bad bishop'],
};
for (const o of OPENINGS.concat(ENDGAMES)) {
  const e = LIB_EN[o.id];
  if (e) { o.descEn = e[0]; if (e[1]) o.movesEn = e[1]; }
}

const Library = (() => {
  const CATS = [
    ['all', 'Tất cả'], ['gambit', 'Gambit'], ['open', 'Ván mở'], ['semi', 'Nửa mở'],
    ['closed', 'Ván đóng'], ['indian', 'Ấn Độ & 1.d4'], ['flank', 'Khai cuộc cánh'], ['endgame', 'Tàn cuộc'],
  ];
  const CAT_NAME = Object.fromEntries(CATS);
  const clean = s => String(s || '').replace(/[+#?!]/g, '');
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

  let filter = 'all';
  let query = '';
  let current = null;
  let step = 0;   // nước đang xem trong trang chi tiết

  // Tách "1.e4 e5 2.Nf3" → ['e4', 'e5', 'Nf3']
  const sanList = s => String(s || '').split(/\s+/).map(t => t.replace(/^\d+\.(\.\.)?/, '')).filter(Boolean);

  // Đi một nước SAN trên g. Trả về { from, to, promotion } hoặc null.
  function playSan(g, san) {
    const want = clean(san);
    for (const m of g.legalMoves()) {
      const mv = { from: m.from, to: m.to, promotion: m.promotion || undefined };
      if (!g.move(mv)) continue;
      if (clean(g.history[g.history.length - 1].san) === want) return mv;
      g.undo();
    }
    return null;
  }

  // Dựng sẵn mọi thế cờ của khai cuộc (một lần)
  function prepare(o) {
    if (o.frames) return o;
    if (o.cat === 'endgame') {
      o.frames = [{ fen: o.fen, last: null }];
      o.sans = [];
      o.side = (o.fen.split(/\s+/)[1] || 'w');
      return o;
    }
    const g = new Chess();
    o.sans = sanList(o.moves);
    o.frames = [{ fen: START, last: null }];
    for (const san of o.sans) {
      const mv = playSan(g, san);
      if (!mv) { console.warn('Thư viện: nước không hợp lệ', o.id, san); o.bad = true; break; }
      o.frames.push({ fen: fenOf(g), last: mv });
    }
    o.fen = o.frames[o.frames.length - 1].fen;
    o.side = o.sans.length % 2 ? 'w' : 'b'; // bên vừa đi nước cuối "chơi" khai cuộc này
    return o;
  }

  function fenOf(g) {
    let rows = [];
    for (let r = 0; r < 8; r++) {
      let row = '', e = 0;
      for (let c = 0; c < 8; c++) {
        const p = g.board[r * 8 + c];
        if (!p) { e++; continue; }
        if (e) { row += e; e = 0; }
        row += p[0] === 'w' ? p[1] : p[1].toLowerCase();
      }
      rows.push(row + (e || ''));
    }
    const k = g.castling || {};
    const cs = (k.wK ? 'K' : '') + (k.wQ ? 'Q' : '') + (k.bK ? 'k' : '') + (k.bQ ? 'q' : '') || '-';
    return `${rows.join('/')} ${g.turn} ${cs} - ${g.halfmove || 0} ${g.fullmove || 1}`;
  }

  // Bàn cờ thu nhỏ từ FEN. flip: nhìn từ phía Đen. last: { from, to } tô nước vừa đi.
  function fenBoard(fen, flip = false, last = null) {
    const cells = new Array(64).fill(null);
    const rows = String(fen || '').split(/\s+/)[0].split('/');
    if (rows.length !== 8) return '';
    let i = 0;
    for (const row of rows) for (const ch of row) {
      if (/\d/.test(ch)) i += Number(ch);
      else cells[i++] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
    }
    let html = '';
    for (let k = 0; k < 64; k++) {
      const sq = flip ? 63 - k : k;
      const r = sq >> 3, c = sq & 7;
      const cls = 'lb-sq ' + ((r + c) % 2 ? 'd' : 'l') + (last && (sq === last.from || sq === last.to) ? ' hl' : '');
      const p = cells[sq];
      html += p ? `<span class="${cls}"><img class="lb-piece" src="${typeof pieceSrc === 'function' ? pieceSrc(p) : `pieces/${p}.svg`}" alt="" draggable="false"></span>` : `<span class="${cls}"></span>`;
    }
    return html;
  }

  const all = () => OPENINGS.concat(ENDGAMES).map(prepare).filter(o => !o.bad);
  const matches = o => !query || fold(`${o.nameVi} ${o.name} ${o.moves} ${CAT_NAME[o.cat]}`).includes(fold(query));

  function card(o) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'lib-card';
    el.innerHTML = `
      <div class="lib-card-board lib-frame">${fenBoard(o.fen, o.side === 'b', o.frames[o.frames.length - 1].last)}</div>
      <div class="lib-card-meta">
        <span class="lib-tag ${o.cat}">${CAT_NAME[o.cat]}</span>
        <b></b><small></small>
        <span class="lib-card-moves"></span>
      </div>`;
    el.querySelector('b').textContent = o.nameVi;
    el.querySelector('small').textContent = o.name;
    el.querySelector('.lib-card-moves').textContent = o.cat === 'endgame' ? o.moves : `${o.sans.length} nước · ${o.side === 'w' ? 'Trắng' : 'Đen'} chọn`;
    el.addEventListener('click', () => showDetail(o));
    return el;
  }

  function renderFilters() {
    const box = $('libFilters');
    const list = all();
    box.innerHTML = '';
    for (const [k, t] of CATS) {
      const n = list.filter(o => k === 'all' || o.cat === k).length;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lib-filter' + (filter === k ? ' on' : '');
      b.innerHTML = `${t}<span>${n}</span>`;
      b.addEventListener('click', () => { filter = k; renderFilters(); renderGrid(); });
      box.appendChild(b);
    }
  }

  function renderGrid() {
    const grid = $('libGrid');
    grid.hidden = false;
    $('libDetail').hidden = true;
    $('libFilters').hidden = false;
    $('libSearchWrap').hidden = false;
    grid.innerHTML = '';
    const list = all().filter(o => (filter === 'all' || o.cat === filter) && matches(o));
    list.forEach(o => grid.appendChild(card(o)));
    if (!list.length) grid.innerHTML = '<p class="empty">Không tìm thấy khai cuộc nào khớp. Thử tên tiếng Anh (Sicilian, Gambit…) hoặc một nước như "c4".</p>';
    $('libNote').textContent = `${OPENINGS.length} khai cuộc và ${ENDGAMES.length} thế tàn cuộc · xem từng nước · tập với máy`;
  }

  function showDetail(o) {
    current = o;
    step = o.frames.length - 1;
    $('libGrid').hidden = true;
    $('libFilters').hidden = true;
    $('libSearchWrap').hidden = true;
    $('libDetail').hidden = false;
    const tag = $('libTag');
    tag.className = 'lib-tag ' + o.cat;
    tag.textContent = CAT_NAME[o.cat];
    $('libName').textContent = o.nameVi;
    $('libNameEn').textContent = o.name;
    $('libDesc').textContent = o.desc;
    const side = o.side === 'w' ? 'Trắng' : 'Đen';
    $('libTry').innerHTML = `<svg class="ic"><use href="#i-play"/></svg>Tập với máy · bạn cầm ${side}`;
    $('libSetup').innerHTML = `<svg class="ic"><use href="#i-plus"/></svg>Đặt lên bàn (2 người)`;
    $('libStepRow').hidden = o.cat === 'endgame';
    renderStep();
    $('libDetail').scrollIntoView({ block: 'nearest' });
  }

  function renderStep() {
    const o = current;
    const f = o.frames[step];
    $('libBoard').innerHTML = fenBoard(f.fen, o.side === 'b', f.last);
    const box = $('libMoves');
    box.innerHTML = '';
    if (o.cat === 'endgame') {
      box.innerHTML = `<span class="lib-turn ${o.side}"></span>${o.side === 'w' ? 'Trắng' : 'Đen'} đi trước · ${o.moves}`;
    } else {
      o.sans.forEach((san, i) => {
        if (i % 2 === 0) box.insertAdjacentHTML('beforeend', `<span class="lib-no">${i / 2 + 1}.</span>`);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'lib-mv' + (i + 1 === step ? ' on' : '');
        b.textContent = san;
        b.addEventListener('click', () => { step = i + 1; renderStep(); });
        box.appendChild(b);
      });
    }
    $('libStepLabel').textContent = step === 0 ? 'Thế xuất phát' : `Nước ${step}/${o.sans.length}`;
    $('libPrev').disabled = $('libFirst').disabled = step === 0;
    $('libNext').disabled = $('libLast').disabled = step >= o.frames.length - 1;
  }

  function go(d) {
    if (!current) return;
    step = d === 'first' ? 0 : d === 'last' ? current.frames.length - 1 : Math.max(0, Math.min(current.frames.length - 1, step + d));
    renderStep();
  }

  // Đặt khai cuộc lên bàn chính: đi lại đúng chuỗi nước từ thế xuất phát (biên bản và tên khai cuộc hiện đầy đủ).
  // Tàn cuộc: nạp FEN. Ván tập từ thư viện không tính Elo.
  function enter(o, vsBot) {
    const userSide = o.side;
    if ($('mode')) $('mode').value = vsBot ? (userSide === 'w' ? 'b' : 'w') : 'none';
    if (mode !== 'play') { setMode('play'); if (mode !== 'play') return; }
    if (!newGame()) return;
    gameId++;          // bỏ nước máy mà newGame() vừa hẹn giờ ở thế xuất phát
    $('libModal').hidden = true;
    if (o.cat === 'endgame') {
      try { game.load(o.fen); } catch { game.reset(); }
    } else {
      for (const san of o.sans) if (!playSan(game, san)) break;
    }
    aiColor = vsBot ? (userSide === 'w' ? 'b' : 'w') : 'none';
    if ($('mode')) $('mode').value = aiColor;
    flipped = userSide === 'b';
    practice = true;
    ratedDone = true;
    if (typeof clockReset === 'function') clockReset();
    viewPly = null;
    seenLen = game.history.length;
    seenMove = game.history.length ? game.history[game.history.length - 1].move : null;
    clearSelection();
    hint = null;
    marks.clear();
    playResult = null;
    thinking = false;
    renderRatedNote();
    render();
    if (vsBot) maybeAiMove();
    toast(vsBot ? `Tập ${o.nameVi} với máy · bạn cầm ${userSide === 'w' ? 'Trắng' : 'Đen'}` : `Đã đặt: ${o.nameVi}`);
  }

  function open() {
    current = null;
    renderFilters();
    renderGrid();
    openModal('libModal');
  }

  function bind() {
    $('libBack').addEventListener('click', () => { current = null; renderGrid(); });
    $('libTry').addEventListener('click', () => current && enter(current, true));
    $('libSetup').addEventListener('click', () => current && enter(current, false));
    $('libFirst').addEventListener('click', () => go('first'));
    $('libPrev').addEventListener('click', () => go(-1));
    $('libNext').addEventListener('click', () => go(1));
    $('libLast').addEventListener('click', () => go('last'));
    $('libSearch').addEventListener('input', e => { query = e.target.value.trim(); renderGrid(); });
    document.addEventListener('keydown', e => {
      if ($('libModal').hidden || $('libDetail').hidden || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); go(1); }
    }, true);
  }

  // Khai cuộc hôm nay: đổi mỗi ngày, mọi người cùng một khai cuộc (Trang chủ)
  function ofDay() {
    const list = OPENINGS.map(prepare).filter(o => !o.bad);
    const d = new Date();
    const n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    const o = list[(n * 11) % list.length];
    return o && { o, board: fenBoard(o.fen, o.side === 'b', o.frames[o.frames.length - 1].last), cat: CAT_NAME[o.cat] };
  }

  // Mở thẳng một khai cuộc
  function show(id) {
    const o = all().find(x => x.id === id);
    open();
    if (o) showDetail(o);
  }

  return { open, bind, show, ofDay, OPENINGS, ENDGAMES, fenBoard, sanList, playSan, prepare };
})();
