// Thư viện kiến thức cờ vua: bài viết ngắn theo chủ đề để người chơi tra cứu và để Trợ lý Royal Gambit tìm đọc
// trước khi giải thích (công cụ search_knowledge trong assistant.js).
//   • ARTICLES: bài viết soạn sẵn (khai cuộc, chiến thuật, mẫu chiếu hết, chiến lược, tàn cuộc, luật, luyện tập).
//   • Tự gộp thêm 100 khai cuộc + thế tàn cuộc trong Thư viện (library.js) và 20 phần Học cờ (lessons.js),
//     nên thêm khai cuộc / bài học mới là thư viện kiến thức cũng có ngay.
// Tìm kiếm chạy trên máy: bỏ dấu tiếng Việt, chấm điểm theo từ khoá (tiêu đề > thẻ > nội dung), có cả từ tiếng Anh trong thẻ.
// Ván cờ nổi tiếng (G): kèm nước đi đầy đủ, xem lại từng nước ngay trong Thư viện kiến thức.
// `see`: gợi ý mở trong web: { kind: 'unit', key } phần Học cờ · { kind: 'puzzle', group: tactics|mates|end } · { kind: 'lib', id }.
// Thêm bài: thêm một dòng A(...) vào đúng nhóm.

const Knowledge = (() => {
  const TOPICS = [
    ['opening', 'Khai cuộc'], ['tactics', 'Chiến thuật'], ['mates', 'Mẫu chiếu hết'], ['strategy', 'Chiến lược'],
    ['endgame', 'Tàn cuộc'], ['games', 'Ván cờ nổi tiếng'], ['general', 'Lịch sử & kiến thức chung'], ['rules', 'Luật cờ'], ['training', 'Luyện tập'],
    ['lesson', 'Bài học trong web'],
  ];
  const A = (id, topic, title, tags, body, see = []) => ({ id, topic, title, tags, body, see });
  const U = key => ({ kind: 'unit', key });
  const PZ = group => ({ kind: 'puzzle', group });
  const LIB = id => ({ kind: 'lib', id });
  // Ván cờ nổi tiếng: kèm toàn bộ nước đi (pgn) để xem lại từng nước; nước đi đã được kiểm tra hợp lệ bằng chess.js
  const G = (id, title, tags, body, pgn, info) => ({ ...A(id, 'games', title, tags, body, []), pgn, ...info });

  const ARTICLES = [
    // ----- Khai cuộc -----
    A('op-principles', 'opening', 'Nguyên tắc khai cuộc', 'principles opening development center trung tam phat trien',
      'Mười nước đầu quyết định thế trận. (1) Chiếm hoặc kiểm soát trung tâm (e4, d4, e5, d5) bằng Tốt và quân. (2) Ra quân nhẹ trước: thường là Mã rồi tới Tượng, mỗi quân ra một ô tốt ngay lần đầu. (3) Nhập thành sớm, thường trước nước 10. (4) Không đi một quân hai lần nếu không có lý do (ăn quân, tránh bị bắt). (5) Đừng ra Hậu quá sớm. (6) Nối hai Xe rồi đưa Xe vào cột mở hoặc nửa mở. (7) Đừng tham ăn Tốt cánh khi quân mình chưa ra. Mỗi nước nên làm ít nhất một trong các việc trên.',
      [U('opening'), LIB('italian')]),
    A('op-early-queen', 'opening', 'Ra Hậu sớm: vì sao nên tránh', 'early queen development tempo hau som',
      'Hậu là quân quý nhất nên khi ra sớm, đối thủ ra quân nhẹ và đuổi Hậu, mỗi lần đuổi là thêm một nước phát triển miễn phí (mất tempo). Ví dụ 1.e4 e5 2.Qh5 Nc6 3.Bc4: Đen phải chặn chiếu hết ở f7 bằng 3...g6 (hoặc 3...Qe7), không được đi 3...Nf6?? vì 4.Qxf7#. Sau 3...g6 4.Qf3 Nf6 Hậu Trắng lại phải đi tiếp. Chỉ ra Hậu sớm khi có lý do cụ thể: ăn quân không bị phạt, hoặc đòn chiến thuật rõ ràng.',
      [U('opening')]),
    A('op-castle-plan', 'opening', 'Khi nào và nhập thành về cánh nào', 'castling king safety nhap thanh canh vua canh hau',
      'Nhập thành vừa đưa Vua vào góc an toàn vừa đưa Xe ra gần trung tâm. Thường nhập thành cánh Vua (O-O) vì nhanh hơn: chỉ cần ra Mã g và Tượng f. Nhập thành cánh Hậu (O-O-O) đưa Xe thẳng tới cột d nhưng Vua ở c1 hơi lộ, cần thêm Tốt a2 hoặc Vua lùi b1. Khi hai bên nhập thành khác cánh, ván cờ thành cuộc đua bão Tốt về phía Vua đối phương. Đừng để Vua ở giữa khi trung tâm đã mở: đó là lúc dễ bị chiếu hết nhất.',
      [U('rules'), U('attack')]),
    A('op-f7', 'opening', 'Điểm yếu f7 (f2) đầu ván', 'f7 f2 weak square fried liver diem yeu',
      'Đầu ván, ô f7 của Đen (f2 của Trắng) chỉ có Vua bảo vệ nên là mục tiêu của Tượng c4, Mã g5 và Hậu. Các bẫy nhanh nhất (Chiếu hết 4 nước, Gan rán Fried Liver: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5? 6.Nxf7) đều nhắm vào f7. Cách phòng: ra Mã f6 kịp thời, nhập thành sớm, và với Đen trong Ván Hai Mã thì sau 5.exd5 nên đi 5...Na5 thay vì ăn lại bằng Mã.',
      [LIB('two-knights'), U('opening')]),
    A('op-traps', 'opening', 'Bẫy khai cuộc người mới hay gặp', 'traps scholar mate fool mate legal trap bay',
      'Chiếu hết 4 nước (Scholar): 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7#; phòng bằng 3...g6 hoặc 3...Qe7. Chiếu hết 2 nước (Fool): 1.f3 e5 2.g4?? Qh4#; đừng mở đường chéo tới Vua. Bẫy Legal: 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6? 5.Nxe5! Bxd1?? 6.Bxf7+ Ke7 7.Nd5#. Bài học chung: ghim chưa chắc đã giữ được quân, và mỗi khi đối thủ "biếu" quân, hãy hỏi vì sao.',
      [U('mate1'), PZ('mates')]),
    A('op-gambit', 'opening', 'Gambit: thí Tốt lấy tốc độ', 'gambit sacrifice pawn tempo initiative thi tot',
      'Gambit là thí một Tốt (đôi khi hơn) ở khai cuộc để đổi lấy phát triển nhanh, cột mở hoặc tấn công Vua. Bên thí phải chơi chủ động liên tục; nếu để đối thủ kịp ra quân và nhập thành thì chỉ còn thiếu Tốt. Bên nhận gambit nên trả lại Tốt đúng lúc để ra quân và an toàn Vua, thay vì cố giữ bằng mọi giá. Ví dụ: Gambit Hậu (Đen ăn c4 thì Trắng thường lấy lại dễ), Gambit Vua, Gambit Evans, Gambit Đan Mạch.',
      [LIB('queens-gambit'), LIB('kings-gambit'), LIB('evans-gambit')]),
    A('op-repertoire', 'opening', 'Chọn bộ khai cuộc theo trình độ', 'repertoire choose opening elo bo khai cuoc',
      'Dưới khoảng 900 Elo: chơi Khai cuộc Ý cầm Trắng, đáp 1.e4 bằng 1...e5 và 1.d4 bằng 1...d5 (Gambit Hậu từ chối), học theo nguyên tắc hơn là thuộc nước. Khoảng 900 đến 1400: Hệ thống London cầm Trắng (dễ dựng, ít lý thuyết), Caro-Kann gặp 1.e4, Gambit Hậu từ chối gặp 1.d4. Trên 1400: Tây Ban Nha, Sicily, Nimzo-Ấn cho thế trận giàu kế hoạch hơn. Chọn ít khai cuộc, chơi chúng nhiều lần rồi xem lại các ván thua trong Nhật ký.',
      [LIB('italian'), LIB('london'), LIB('caro-kann'), LIB('qgd')]),
    A('op-transition', 'opening', 'Sau khai cuộc: chuyển sang trung cuộc', 'middlegame plan after opening transition ke hoach',
      'Khi quân đã ra và Vua đã nhập thành, hỏi ba câu: cấu trúc Tốt cho mình chơi ở cánh nào (thường là phía chuỗi Tốt hướng tới)? Cột nào sắp mở để đặt Xe? Quân nào của mình kém nhất để cải thiện? Đừng đẩy Tốt vô định chỉ vì "không biết đi gì". Kế hoạch nhỏ và cụ thể (đưa Mã tới tiền đồn, chồng Xe ở cột mở) tốt hơn không có kế hoạch.',
      [U('strategy')]),

    // ----- Chiến thuật -----
    A('tac-values', 'tactics', 'Giá trị quân và đổi quân', 'piece values exchange material gia tri quan doi chat luong',
      'Giá trị gần đúng: Tốt 1, Mã 3, Tượng 3 (cặp Tượng thường hơn một chút), Xe 5, Hậu 9; Vua vô giá. Đổi Xe lấy Mã hoặc Tượng gọi là "thua chất lượng" (khoảng 2 điểm). Ba quân nhẹ thường mạnh hơn Hậu ở trung cuộc, hai Xe xấp xỉ một Hậu. Đây chỉ là ước lượng: một quân hoạt động, đang tấn công Vua có thể đáng giá hơn nhiều so với con số.',
      [U('basics')]),
    A('tac-hanging', 'tactics', 'Quân treo: đếm quân tấn công và bảo vệ', 'hanging piece blunder counting attackers defenders quan treo de mat quan',
      'Một quân "treo" khi bị tấn công mà không được bảo vệ, hoặc bị một quân rẻ hơn tấn công. Trước mỗi nước, đếm: ô đó có bao nhiêu quân đối phương tấn công, bao nhiêu quân mình bảo vệ? Nếu số tấn công nhiều hơn, hoặc kẻ tấn công rẻ hơn quân bị tấn công, quân đó đang gặp nguy. Đừng quên quân vừa đi có thể bỏ trống việc bảo vệ một quân khác. Đây là lỗi phổ biến nhất dưới 1200 Elo.',
      [U('defense'), PZ('tactics')]),
    A('tac-cct', 'tactics', 'Chiếu, ăn quân, đe doạ (CCT)', 'checks captures threats cct candidate moves thinking',
      'Mỗi lượt, trước khi nghĩ kế hoạch, xét theo thứ tự: mọi nước Chiếu, mọi nước Ăn quân, mọi nước Đe doạ (tấn công quân không được bảo vệ, doạ chiếu hết). Làm việc này cho cả hai bên: nước mạnh của mình và nước nguy hiểm của đối thủ. Phần lớn đòn chiến thuật và cả những lần để mất quân đều nằm trong ba nhóm nước này. Đi xong mới thấy đòn thì đã muộn.',
      [U('calc'), PZ('tactics')]),
    A('tac-fork', 'tactics', 'Đòn chĩa (tấn công kép)', 'fork double attack knight fork royal fork chia doi',
      'Chĩa là một quân tấn công hai (hoặc nhiều) mục tiêu cùng lúc, đối thủ chỉ cứu được một. Mã chĩa giỏi nhất vì nhảy và không bị chặn: tìm ô Mã vừa chiếu Vua vừa đánh Hậu hoặc Xe. Tốt chĩa hai quân nhẹ (ví dụ d4-d5 đánh Mã c6 và Tượng e6). Hậu chĩa bằng nước chiếu kèm tấn công quân không được bảo vệ. Dấu hiệu: hai quân đối phương đứng cách nhau một bước Mã, hoặc cùng hàng/đường chéo mà không được bảo vệ.',
      [U('tactics'), PZ('tactics')]),
    A('tac-pin', 'tactics', 'Đòn ghim', 'pin absolute pin relative pin ghim',
      'Ghim là khi Tượng, Xe hoặc Hậu tấn công một quân mà phía sau nó là quân giá trị hơn. Ghim tuyệt đối: phía sau là Vua, quân bị ghim không được phép đi. Ghim tương đối: phía sau là Hậu hoặc Xe, quân bị ghim đi được nhưng mất quân sau lưng. Khai thác ghim: tấn công quân bị ghim bằng Tốt hoặc quân rẻ, dồn thêm quân vào nó. Thoát ghim: chặn đường, đuổi quân ghim, hoặc đi quân phía sau ra khỏi đường.',
      [U('tactics'), PZ('tactics')]),
    A('tac-skewer', 'tactics', 'Đòn xiên', 'skewer xray xien',
      'Xiên giống ghim nhưng ngược lại: quân giá trị hơn đứng phía trước. Khi nó tránh đi, quân phía sau bị ăn. Ví dụ điển hình: Xe hoặc Tượng chiếu Vua, Vua tránh thì mất Xe hay Hậu đứng cùng hàng hoặc đường chéo phía sau. Hay gặp ở tàn cuộc khi Vua và Hậu (hoặc Xe) đứng thẳng hàng.',
      [U('tactics'), PZ('tactics')]),
    A('tac-discovered', 'tactics', 'Chiếu mở và chiếu đôi', 'discovered attack discovered check double check chieu mo chieu doi',
      'Chiếu mở: một quân đi ra để lộ đường cho quân phía sau chiếu Vua, trong khi quân vừa đi được tự do tấn công thứ khác, thường là ăn Hậu. Chiếu đôi: cả hai quân cùng chiếu, đối thủ bắt buộc phải đi Vua vì không thể chặn hay ăn cả hai. Chiếu đôi là nước mạnh nhất trong chiến thuật và thường dẫn tới chiếu hết. Hãy để ý khi quân mình đứng giữa quân dài (Xe, Tượng, Hậu) của mình và Vua đối phương.',
      [U('tactics'), PZ('tactics')]),
    A('tac-defender', 'tactics', 'Phá quân bảo vệ', 'removing the defender remove guard capture defender pha quan bao ve',
      'Nếu một quân hoặc một ô chỉ được giữ bởi một quân bảo vệ, hãy ăn, đuổi hoặc đổi quân bảo vệ đó trước. Ví dụ: Mã f6 che ô h7, đổi Tượng lấy Mã f6 rồi Hậu chiếu hết ở h7. Câu hỏi cần đặt: "Cái gì đang ngăn mình thắng? Quân đó có bị loại được không?"',
      [U('tactics2'), PZ('tactics')]),
    A('tac-overload', 'tactics', 'Quân quá tải', 'overloading overloaded piece qua tai',
      'Một quân bị quá tải khi phải làm hai nhiệm vụ cùng lúc, ví dụ vừa bảo vệ hàng cuối vừa bảo vệ một quân khác. Ép nó làm một việc (thường bằng cách ăn quân hoặc chiếu) thì việc còn lại bị bỏ trống. Tìm quân đối phương đang bảo vệ nhiều thứ, rồi tấn công một trong các thứ đó.',
      [U('tactics2'), PZ('tactics')]),
    A('tac-deflection', 'tactics', 'Đánh lạc hướng và thu hút', 'deflection decoy attraction lure danh lac huong thu hut',
      'Đánh lạc hướng: buộc quân bảo vệ rời khỏi vị trí quan trọng (thường bằng một nước thí mà nó phải ăn). Thu hút (mồi nhử): ép Vua hoặc Hậu đối phương đến một ô xấu, nơi nó bị chĩa, xiên hay chiếu hết. Cả hai thường bắt đầu bằng một nước thí, nên chỉ thực hiện khi đã tính đến cuối.',
      [U('tactics2'), U('calc'), PZ('tactics')]),
    A('tac-interference', 'tactics', 'Chặn đường', 'interference block line chan duong',
      'Đặt một quân vào giữa đường nối quân bảo vệ với ô hoặc quân nó đang bảo vệ, khiến sự bảo vệ bị cắt. Hay gặp khi hai Xe hoặc Xe và Hậu của đối phương cùng bảo vệ nhau theo một hàng. Quân chặn thường bị ăn, nhưng ăn nó thì bỏ trống nhiệm vụ khác.',
      [U('tactics2')]),
    A('tac-zwischenzug', 'tactics', 'Nước trung gian', 'zwischenzug intermezzo in-between move nuoc trung gian',
      'Khi đối thủ ăn quân và chờ mình ăn lại, đôi khi có một nước mạnh hơn phải đi trước: chiếu, đe doạ lớn hơn, hoặc ăn quân khác. Nước trung gian làm đảo lộn tính toán "ăn rồi ăn lại". Trước khi ăn lại theo phản xạ, hãy xét các nước chiếu và đe doạ trước.',
      [U('calc')]),
    A('tac-xray', 'tactics', 'Tia X', 'x-ray xray attack through tia x',
      'Quân dài (Xe, Tượng, Hậu) vẫn "nhìn xuyên" qua một quân để tấn công hoặc bảo vệ ô phía sau. Ví dụ: hai Xe chồng nhau trên một cột, Xe sau vẫn bảo vệ ô mà Xe trước đi tới. Khi đếm quân tấn công và bảo vệ, nhớ tính cả các quân đứng sau theo tia X.',
      [U('tactics2')]),
    A('tac-trapped', 'tactics', 'Bắt quân bị nhốt', 'trapped piece trap bishop knight rim quan bi nhot',
      'Quân không còn ô an toàn để đi sẽ bị bắt bằng cách tấn công nó. Hay gặp: Tượng ăn Tốt a7 (a2) rồi bị Tốt b6 (b3) nhốt; Mã ở mép bàn không còn đường lui; Hậu tham ăn Tốt b2 (b7) bị Xe và quân nhẹ vây. Trước khi đưa quân vào sâu đất đối phương, kiểm tra đường về.',
      [PZ('tactics')]),
    A('tac-promotion', 'tactics', 'Đòn phong cấp và phong dưới cấp', 'promotion underpromotion queening knight promotion phong cap',
      'Tốt tới hàng cuối được phong thành Hậu, Xe, Tượng hoặc Mã. Đòn phong cấp thường dùng nước thí để kéo quân chặn ra hoặc chặn đường quân bảo vệ ô phong cấp. Phong dưới cấp có lý do: phong Mã để chiếu (và chĩa) ngay, hoặc phong Xe/Tượng để tránh làm đối thủ hết nước đi (pat).',
      [U('pawns'), PZ('tactics')]),
    A('tac-sacrifice', 'tactics', 'Thí quân: khi nào đáng', 'sacrifice sac exchange sacrifice thi quan',
      'Thí quân đáng khi đổi lại thứ cụ thể: chiếu hết, lấy lại nhiều quân hơn, phong cấp, hoặc tấn công mà đối thủ khó chống. Thí "cảm giác" (vì vị trí) cần kinh nghiệm; ở trình độ dưới 1600, hãy chỉ thí khi tính được kết quả. Luôn kiểm tra nước phòng thủ tốt nhất của đối thủ, không chỉ nước đẹp nhất của mình.',
      [U('calc'), U('attack')]),

    // ----- Mẫu chiếu hết -----
    A('mate-backrank', 'mates', 'Chiếu hết hàng cuối', 'back rank mate back-rank luft hang cuoi',
      'Vua đã nhập thành sau ba Tốt f, g, h chưa đi sẽ không có ô thoát; một Xe hoặc Hậu tới hàng cuối là chiếu hết. Dấu hiệu: hàng cuối của đối thủ chỉ được một quân giữ (dễ bị quá tải hoặc đánh lạc hướng). Phòng thủ: tạo "lỗ thở" bằng h3 (h6) hoặc g3 (g6) khi rảnh, giữ một Xe ở hàng cuối khi cần.',
      [U('mate1'), PZ('mates')]),
    A('mate-smothered', 'mates', 'Chiếu ngạt (Mã)', 'smothered mate philidor legacy knight mate chieu ngat',
      'Vua bị chính quân của mình vây kín, Mã chiếu là hết. Mẫu kinh điển (Di sản Philidor) với Vua Đen ở h8: Nf7+ Kg8, Nh6+ (chiếu đôi) Kh8, Qg8+! Rxg8, Nf7#. Dấu hiệu: Vua ở góc, Xe và Tốt quanh nó chưa đi, đường chéo a2-g8 của Hậu mở.',
      [U('mates'), PZ('mates')]),
    A('mate-arabian', 'mates', 'Chiếu hết kiểu Ả Rập', 'arabian mate rook knight a rap',
      'Xe và Mã phối hợp ở góc: Vua đối phương ở h8, Mã ở f6 bảo vệ Xe ở h7 và giữ ô g8, Xe chiếu dọc cột h hoặc hàng 7. Mã ở f6 thường đã ở sẵn sau một đòn thí hoặc ăn Tốt g7/h7.',
      [U('mates'), PZ('mates')]),
    A('mate-anastasia', 'mates', 'Chiếu hết Anastasia', 'anastasia mate knight rook h file',
      'Mã ở e7 khoá các ô g8 và g6, Tốt g7 của chính đối phương chặn Vua h7, rồi Xe hoặc Hậu chiếu theo cột h. Thường bắt đầu bằng thí Hậu ở h7 để mở cột h.',
      [U('mates')]),
    A('mate-boden', 'mates', 'Chiếu hết Boden (hai Tượng)', 'boden mate two bishops criss-cross',
      'Hai Tượng chéo nhau chiếu hết Vua đã nhập thành cánh Hậu, khi các ô cạnh Vua bị chính quân của nó chặn (ví dụ Xe d8, Mã d7). Mẫu điển hình: Vua c8, Tượng f4 giữ b8 và d6, Tượng còn lại chiếu ở a6. Thường có nước thí Hậu ở c6 hoặc b7 để mở đường chéo.',
      [U('mates')]),
    A('mate-greek-gift', 'mates', 'Món quà Hy Lạp (thí Tượng h7)', 'greek gift bxh7 sacrifice attack king qua hy lap',
      'Bxh7+! Kxh7, Ng5+ rồi Qh5 (hoặc Qd3/Qc2) tấn công h7. Điều kiện thường cần: Tượng nhắm h7 (Tượng d3), Mã nhảy được g5 an toàn, Hậu tới được h5, Tốt e5 đã đuổi Mã f6 đi (Đen không có quân phòng thủ cánh Vua), và Đen không có nước ...Bf5 hay ...Qxg5 tốt. Tính kỹ các nước lui Vua g8, g6, h6 trước khi thí.',
      [U('attack'), PZ('mates')]),
    A('mate-queen-pawn', 'mates', 'Hậu và Tốt chiếu hết (kiểu Damiano)', 'damiano mate queen pawn g7 h7',
      'Tốt ở f6 hoặc h6 bảo vệ Hậu ở g7 là chiếu hết Vua g8 (khi không có quân ăn được Hậu). Mẫu này xuất hiện khi Tốt đã đẩy sâu sát Vua đối phương. Đường cột h mở với Hậu và Xe cũng thường cho Qh7# hoặc Qh8#.',
      [U('mates'), PZ('mates')]),
    A('mate-epaulette', 'mates', 'Chiếu hết "cầu vai" (Epaulette)', 'epaulette mate queen rooks',
      'Vua bị hai quân của chính mình kẹp hai bên (ví dụ Xe d8 và Xe f8 quanh Vua e8). Hậu chiếu từ phía trước (e6) khống chế d7 và f7 là hết. Dấu hiệu: Vua chưa nhập thành, hai bên là quân nặng.',
      [U('mates')]),
    A('mate-basic', 'mates', 'Chiếu hết cơ bản: Hậu, Xe, hai Xe', 'basic checkmate queen rook ladder mate king queen king rook',
      'Hậu + Vua: dùng Hậu thu hẹp "hộp" quanh Vua đối phương (đứng cách nó một bước Mã), đẩy về mép bàn, rồi đưa Vua mình lại gần và chiếu hết; luôn để Vua đối phương còn ô đi để tránh pat. Xe + Vua: Xe cắt hàng, hai Vua đối mặt thì Xe chiếu đẩy lùi một hàng, lặp lại. Hai Xe: chiếu kiểu bậc thang, không cần Vua.',
      [LIB('kq-k'), LIB('kr-k'), LIB('krr-k'), U('mate1')]),
    A('mate-spot', 'mates', 'Cách nhìn ra chiếu hết trong ván', 'find checkmate pattern recognition mate in two',
      'Khi Vua đối phương ít ô thoát, liệt kê mọi nước chiếu của mình, kể cả nước thí. Với mỗi nước, đếm các ô Vua có thể đi và các quân có thể chặn hoặc ăn quân chiếu. Học thuộc mẫu (hàng cuối, ngạt, Ả Rập, Boden, Hậu + Tốt) giúp nhận ra nhanh hơn tính từng nước. Ngược lại, khi Vua mình bị vây, hãy tạo lỗ thở trước.',
      [U('mate2'), U('mates'), PZ('mates')]),

    // ----- Chiến lược -----
    A('st-open-file', 'strategy', 'Xe trên cột mở và hàng 7', 'open file semi-open file rook seventh rank cot mo',
      'Cột mở là cột không còn Tốt; Xe đặt ở đó kiểm soát cả cột và có thể xâm nhập. Cột nửa mở (chỉ còn Tốt đối phương) giúp Xe tấn công Tốt đó. Chồng hai Xe (hoặc Xe và Hậu) trên cột mở để giành quyền kiểm soát. Xe ở hàng 7 (hàng 2 của đối phương) ăn Tốt và nhốt Vua, rất mạnh ở tàn cuộc.',
      [U('strategy')]),
    A('st-outpost', 'strategy', 'Tiền đồn cho Mã', 'outpost knight strong square tien don',
      'Tiền đồn là ô ở nửa bàn đối phương mà Tốt đối phương không bao giờ đuổi được, lý tưởng là được Tốt mình bảo vệ (ví dụ Mã d5 hoặc e5). Mã đứng ở tiền đồn thường mạnh như một Xe. Tạo tiền đồn bằng cách đổi hoặc khoá các Tốt có thể đuổi Mã; chống lại bằng cách đổi quân lấy Mã đó.',
      [U('strategy')]),
    A('st-bishops', 'strategy', 'Tượng tốt, Tượng xấu và cặp Tượng', 'good bishop bad bishop bishop pair tuong xau cap tuong',
      'Tượng "xấu" bị chính Tốt của mình chặn (Tốt đứng ở ô cùng màu với Tượng); Tượng "tốt" có đường chéo thoáng. Đặt Tốt ở ô khác màu với Tượng còn lại, hoặc đổi Tượng xấu đi. Cặp Tượng mạnh trong thế trận mở; Mã mạnh hơn trong thế trận đóng, nhiều Tốt và có tiền đồn.',
      [U('strategy')]),
    A('st-iqp', 'strategy', 'Tốt cô lập (Tốt d cô lập)', 'isolated pawn iqp isolani tot co lap',
      'Tốt cô lập không có Tốt cùng màu ở hai cột bên cạnh nên không được Tốt bảo vệ. Bên có Tốt cô lập (thường ở d4) được không gian, ô e5/c5 cho Mã và cột nửa mở, nên chơi chủ động, tấn công Vua, đôi khi phá bằng d4-d5. Bên chống lại nên đặt quân (lý tưởng là Mã) chặn ở ô ngay trước Tốt (d5), đổi bớt quân nhẹ, rồi tấn công Tốt ở tàn cuộc.',
      [U('strategy')]),
    A('st-pawn-weak', 'strategy', 'Tốt chồng, Tốt lạc hậu, Tốt treo', 'doubled pawns backward pawn hanging pawns tot chong',
      'Tốt chồng (hai Tốt cùng cột) khó tự bảo vệ và không tạo được Tốt thông, nhưng thường đi kèm cột nửa mở. Tốt lạc hậu là Tốt bị bỏ lại phía sau, không đẩy được an toàn, và ô trước nó là ô yếu cho đối phương. Tốt treo (cặp Tốt c và d đứng cạnh nhau không có Tốt hỗ trợ) mạnh khi còn nhiều quân nhưng dễ thành mục tiêu khi quân bị đổi. Tấn công các Tốt yếu bằng quân nặng ở cột nửa mở.',
      [U('strategy')]),
    A('st-passed', 'strategy', 'Tốt thông', 'passed pawn outside passed pawn protected passed pawn tot thong',
      'Tốt thông không còn Tốt đối phương nào chặn hoặc kiểm soát đường đi tới ô phong cấp. "Tốt thông phải được đẩy." Tốt thông được Tốt bảo vệ rất bền; Tốt thông xa (ở cánh xa Vua) kéo Vua đối phương đi, để Vua mình ăn Tốt cánh còn lại. Chặn Tốt thông đối phương bằng một quân đứng ngay trước nó (tốt nhất là Mã).',
      [U('pawnend'), U('endgame')]),
    A('st-majority', 'strategy', 'Đa số Tốt và tạo Tốt thông', 'pawn majority queenside majority create passed pawn',
      'Ở cánh có nhiều Tốt hơn đối phương (ví dụ 3 đấu 2 ở cánh Hậu), đẩy Tốt không có Tốt đối diện trước (ứng viên) để tạo Tốt thông. Đa số Tốt cánh Hậu đặc biệt mạnh khi hai bên nhập thành cánh Vua, vì Tốt thông tạo ra ở xa Vua đối phương.',
      [U('pawnend')]),
    A('st-chain', 'strategy', 'Chuỗi Tốt: tấn công vào gốc', 'pawn chain base of chain french structure chuoi tot',
      'Chuỗi Tốt chéo (ví dụ d4-e5 của Trắng trong Phòng thủ Pháp) mạnh ở đầu và yếu ở gốc. Tấn công vào gốc chuỗi (với Đen là ...c5 đánh d4, sau đó ...f6 đánh e5). Thường chơi ở phía mà chuỗi Tốt của mình hướng tới: chuỗi d4-e5 hướng về cánh Vua, nên Trắng tấn công cánh Vua, Đen phản công cánh Hậu.',
      [LIB('french'), U('strategy')]),
    A('st-weak-squares', 'strategy', 'Ô yếu và "lỗ"', 'weak square hole color complex o yeu',
      'Ô yếu là ô không thể được Tốt bảo vệ nữa (các Tốt bên cạnh đã đi qua). Lỗ gần Vua, như f6 hay h6 sau ...g6 khi mất Tượng đen, là nơi quân đối phương đặt vào để tấn công. Trước khi đẩy Tốt, hỏi: nước này để lại ô nào không thể bảo vệ bằng Tốt nữa?',
      [U('strategy')]),
    A('st-worst-piece', 'strategy', 'Cải thiện quân kém nhất', 'improve worst piece activity piece activity quan kem nhat',
      'Khi không có chiến thuật, tìm quân đang làm ít việc nhất (Tượng bị chặn, Xe chưa ra, Mã ở mép bàn) và đưa nó tới ô tốt hơn. Quân hoạt động hơn thường quan trọng hơn hơn kém một Tốt. Quy tắc đơn giản này cho bạn một kế hoạch trong hầu hết thế cờ yên tĩnh.',
      [U('strategy')]),
    A('st-exchanges', 'strategy', 'Khi nào nên đổi quân', 'trade exchange simplify when to trade doi quan',
      'Khi hơn quân: đổi quân (không đổi Tốt) để tiến tới tàn cuộc dễ thắng. Khi kém quân: tránh đổi quân, giữ Tốt và tìm phản công. Khi bị dồn ép, thiếu chỗ: đổi bớt quân để giải toả. Đổi quân đang tấn công của đối phương, giữ quân hoạt động của mình. Đổi Tượng xấu lấy Tượng tốt của đối thủ là lời.',
      [U('strategy'), U('endgame')]),
    A('st-prophylaxis', 'strategy', 'Phòng ngừa: đối thủ muốn gì?', 'prophylaxis opponent plan threat phong ngua',
      'Sau mỗi nước của đối thủ, hỏi: "Nước này doạ gì? Nếu đến lượt họ đi tiếp, họ sẽ làm gì?" Ngăn kế hoạch của đối thủ trước khi nó thành đe doạ (ví dụ h3 ngăn Tượng g4, a4 ngăn ...b5) thường rẻ hơn nhiều so với chống đỡ sau này.',
      [U('defense')]),
    A('st-center', 'strategy', 'Trung tâm Tốt và phá trung tâm', 'pawn center hypermodern space control trung tam',
      'Trung tâm Tốt (Tốt e4 và d4) cho không gian và hạn chế quân đối phương. Lối chơi siêu hiện đại để đối thủ dựng trung tâm rồi tấn công nó bằng quân và Tốt (...c5, ...e5, ...f6). Trung tâm đóng (Tốt khoá nhau) thì ván cờ chuyển sang tấn công ở cánh; trung tâm mở thì quân phát triển nhanh và an toàn Vua quan trọng hơn.',
      [U('opening'), U('strategy')]),
    A('st-attack-king', 'strategy', 'Tấn công Vua', 'king attack opposite castling pawn storm tan cong vua',
      'Nhập thành khác cánh: bão Tốt về phía Vua đối phương để mở cột cho Xe, ai nhanh hơn thường thắng. Nhập thành cùng cánh: tấn công bằng quân (đưa Hậu, Mã, Tượng về phía Vua) thay vì đẩy Tốt trước Vua mình. Vua đối phương còn ở giữa: mở trung tâm bằng Tốt, kể cả phải thí. Cần nhiều quân tấn công hơn quân phòng thủ ở khu vực Vua.',
      [U('attack')]),

    // ----- Tàn cuộc -----
    A('end-king', 'endgame', 'Vua là quân chiến đấu trong tàn cuộc', 'active king endgame centralize king vua chu dong',
      'Khi Hậu đã đổi và ít quân, Vua không còn sợ bị chiếu hết: đưa Vua ra trung tâm ngay, dùng nó bảo vệ Tốt mình và ăn Tốt đối phương. Trong tàn cuộc Tốt, Vua hoạt động hơn thường quyết định kết quả.',
      [U('endgame'), U('pawnend')]),
    A('end-opposition', 'endgame', 'Đối Vua và ô then chốt (Vua + Tốt đấu Vua)', 'opposition key squares king and pawn doi vua o then chot',
      'Đối Vua: hai Vua đứng đối diện cách một ô; bên không phải đi là bên "giữ đối Vua" và đẩy lùi được Vua kia. Với Tốt cột b đến g: Vua bên mạnh chiếm được ô then chốt là thắng. Tốt chưa qua giữa bàn (ví dụ Tốt e4) có ô then chốt d6, e6, f6; Tốt ở hàng 5 (e5) có thêm d7, e7, f7. Nguyên tắc: Vua đi trước Tốt, đừng đẩy Tốt sớm. Tốt cột a hoặc h: nếu Vua phòng thủ tới được góc thì thường hoà.',
      [U('pawnend'), LIB('opposition')]),
    A('end-square', 'endgame', 'Quy tắc ô vuông', 'rule of the square passed pawn race quy tac o vuong',
      'Tưởng tượng một hình vuông có cạnh từ Tốt thông tới ô phong cấp. Nếu Vua đối phương bước vào được hình vuông đó (tính cả lượt đi), nó đuổi kịp Tốt; nếu không, Tốt phong cấp. Tốt còn ở hàng xuất phát thì tính như đã ở hàng kế tiếp, vì nó có thể đi hai ô.',
      [U('pawnend'), LIB('square-rule')]),
    A('end-lucena', 'endgame', 'Thế Lucena: "xây cầu"', 'lucena building a bridge rook endgame xay cau',
      'Xe + Tốt hàng 7 đấu Xe, Vua bên mạnh đứng ở ô phong cấp, Vua đối phương bị cắt một cột. Cách thắng: đưa Xe lên hàng 4 (tính từ phía mình), cho Vua bước ra khỏi ô phong cấp; khi bị Xe chiếu dọc, Vua tiến dần về phía Xe mình rồi Xe chặn chiếu ở hàng 4. Đây là thế thắng quan trọng nhất của tàn cuộc Xe.',
      [LIB('lucena'), U('rookend')]),
    A('end-philidor', 'endgame', 'Thế Philidor: phòng thủ Xe', 'philidor defense rook endgame third rank drawing',
      'Xe + Tốt đấu Xe, Vua phòng thủ đứng trước Tốt. Đặt Xe ở hàng thứ 3 tính từ phía mình (với Đen là hàng 6) để Vua đối phương không tiến lên được. Khi Tốt đẩy lên hàng đó, Xe lập tức về hàng cuối của đối phương và chiếu từ phía sau. Giữ đúng thế này là hoà.',
      [LIB('philidor'), U('rookend')]),
    A('end-rook-rules', 'endgame', 'Nguyên tắc tàn cuộc Xe', 'rook behind passed pawn tarrasch rule active rook xe sau tot',
      'Xe đặt sau Tốt thông (của mình để đẩy, của đối phương để kìm), vì khi Tốt tiến, Xe càng có nhiều ô. Xe hoạt động quan trọng hơn hơn một Tốt: Xe thụ động chỉ đứng giữ Tốt thường thua. Dùng Xe cắt Vua đối phương theo hàng hoặc cột. Nhiều tàn cuộc Xe kém một Tốt vẫn hoà.',
      [U('rookend')]),
    A('end-wrong-bishop', 'endgame', 'Tượng sai màu với Tốt cột a/h', 'wrong colored bishop rook pawn draw tuong sai mau',
      'Tượng + Tốt cột a (hoặc h) không thắng được nếu Tượng không kiểm soát ô phong cấp (khác màu ô góc) và Vua phòng thủ đã chiếm được góc: kết quả là hoà. Bên phòng thủ đang kém quân hãy nhắm tới thế này; bên mạnh nên giữ Tốt khác hoặc ngăn Vua đối phương vào góc.',
      [LIB('rook-pawn'), U('endgame')]),
    A('end-opposite-bishops', 'endgame', 'Tàn cuộc Tượng khác màu', 'opposite colored bishops drawish tuong khac mau',
      'Mỗi bên chỉ còn một Tượng chạy khác màu: rất dễ hoà, kể cả khi kém một hai Tốt, vì bên phòng thủ đặt Vua hoặc Tượng chặn trên các ô Tượng đối phương không với tới. Còn thêm quân khác (Hậu, Xe) thì ngược lại: bên tấn công mạnh hơn vì Tượng phòng thủ không che được các ô màu kia.',
      [LIB('opp-bishops'), U('endgame')]),
    A('end-stalemate', 'endgame', 'Pat: tránh khi thắng, tìm khi thua', 'stalemate draw trap pat',
      'Pat là khi bên đến lượt không bị chiếu nhưng không còn nước đi hợp lệ nào: ván hoà. Bên đang thắng (nhất là với Hậu) phải luôn kiểm tra Vua đối phương còn ô đi hay không. Bên đang thua tìm cách tạo pat: đưa Vua vào góc, thí các quân còn lại.',
      [U('rules'), U('endgame')]),
    A('end-queen-pawn7', 'endgame', 'Hậu đấu Tốt hàng 7', 'queen vs pawn seventh rank draw win',
      'Hậu thắng Tốt hàng 7 có Vua hỗ trợ nếu là Tốt cột b, d, e hoặc g: chiếu liên tục để ép Vua đứng trước Tốt, rồi đưa Vua mình lại gần. Tốt cột c, f (hoặc a, h) thường hoà vì bên phòng thủ có thủ thuật pat, trừ khi Vua bên mạnh đã ở gần.',
      [U('endgame'), LIB('queen-vs-pawn')]),
    A('end-zugzwang', 'endgame', 'Zugzwang và đi vòng tam giác', 'zugzwang triangulation tempo move',
      'Zugzwang: bên phải đi buộc phải làm xấu thế cờ của mình. Hay gặp ở tàn cuộc Tốt. Đi vòng tam giác: Vua đi ba nước theo hình tam giác để "mất một nhịp", trả lượt đi lại cho đối phương và đặt họ vào zugzwang. Giữ lại một nước Tốt dự phòng cũng là cách thắng nhịp.',
      [U('pawnend')]),
    A('end-convert', 'endgame', 'Biến ưu thế thành chiến thắng', 'converting advantage winning won game technique chuyen hoa',
      'Đang hơn quân: (1) an toàn trước đã: đừng để bị chiếu hết hay đòn bất ngờ; (2) đổi quân, giữ Tốt; (3) đưa Vua lên khi Hậu đã đổi; (4) tạo Tốt thông và đẩy với sự hỗ trợ của quân; (5) mỗi nước kiểm tra pat và các nước chiếu của đối phương. Không cần vội: một kế hoạch chậm mà chắc tốt hơn đòn hấp tấp.',
      [U('endgame'), U('pawnend')]),
    A('end-minor', 'endgame', 'Mã hay Tượng trong tàn cuộc', 'knight vs bishop endgame minor piece',
      'Tượng mạnh hơn khi có Tốt ở cả hai cánh và thế trận mở, vì đi xa nhanh. Mã mạnh hơn khi Tốt chỉ ở một cánh, thế trận đóng hoặc có ô tốt cố định. Mã rất kém trước Tốt thông cột a hoặc h. Chỉ một Mã hoặc một Tượng (không Tốt) không thể chiếu hết.',
      [U('endgame')]),

    // ----- Luật cờ -----
    A('rule-castling', 'rules', 'Luật nhập thành', 'castling rules conditions luat nhap thanh',
      'Vua đi hai ô về phía Xe, Xe nhảy qua đứng sát cạnh. Chỉ được nhập thành khi: Vua và Xe đó chưa đi lần nào; giữa chúng không có quân; Vua không đang bị chiếu; Vua không đi qua và không đứng vào ô bị tấn công. Xe bị tấn công hoặc đi qua ô bị tấn công (như b1 khi nhập thành cánh Hậu) thì vẫn được.',
      [U('rules')]),
    A('rule-en-passant', 'rules', 'Bắt Tốt qua đường', 'en passant capture luat bat tot qua duong',
      'Khi Tốt đối phương đi hai ô từ hàng xuất phát và dừng ngay cạnh Tốt mình (Tốt Trắng ở hàng 5, Tốt Đen ở hàng 4), Tốt mình được ăn nó như thể nó chỉ đi một ô. Chỉ được làm ngay nước kế tiếp, để sau là mất quyền.',
      [U('pawns'), U('rules')]),
    A('rule-promotion', 'rules', 'Luật phong cấp', 'promotion rule queen pawn reaches last rank',
      'Tốt tới hàng cuối bắt buộc phong thành Hậu, Xe, Tượng hoặc Mã cùng màu (không phải Vua, không giữ là Tốt). Có thể có nhiều Hậu. Trong web, bật "Tự phong Hậu" trong Cài đặt để khỏi hỏi mỗi lần.',
      [U('pawns')]),
    A('rule-draws', 'rules', 'Các kiểu hoà', 'draw stalemate threefold repetition fifty move insufficient material hoa',
      'Ván hoà khi: pat (bên đến lượt không bị chiếu mà hết nước đi); cùng một thế cờ lặp lại 3 lần; 50 nước liên tiếp mỗi bên không ăn quân và không đi Tốt; không đủ quân để chiếu hết (Vua đấu Vua, Vua + Tượng hoặc Vua + Mã đấu Vua); hai bên đồng ý hoà. Hết giờ nhưng đối phương không còn đủ quân để chiếu hết thì cũng hoà.',
      [U('rules')]),
    A('rule-check', 'rules', 'Chiếu, thoát chiếu và chiếu hết', 'check checkmate escape check rules chieu',
      'Bị chiếu thì nước tiếp theo bắt buộc phải thoát chiếu bằng một trong ba cách: đi Vua tới ô an toàn, ăn quân đang chiếu, hoặc chặn đường chiếu (không chặn được Mã và chiếu đôi). Không có cách nào thoát là chiếu hết, ván kết thúc.',
      [U('check')]),
    A('rule-clock', 'rules', 'Đồng hồ và cộng giờ', 'time control increment clock flag dong ho',
      'Mỗi bên có quỹ thời gian riêng; hết giờ là thua (trừ khi đối phương không đủ quân chiếu hết). "10+5" nghĩa là 10 phút mỗi bên, cộng 5 giây sau mỗi nước. Ván dài (10 phút trở lên) giúp học tốt hơn ván chớp, vì có thời gian kiểm tra quân treo và tính toán.',
      []),

    // ----- Luyện tập -----
    A('tr-thinking', 'training', 'Quy trình suy nghĩ mỗi nước', 'thinking process blunder check candidate moves quy trinh',
      '1) Đối thủ vừa đi nước gì, doạ gì? 2) Có nước Chiếu, Ăn quân, Đe doạ nào cho mình không? 3) Nếu không có chiến thuật: kế hoạch là gì, quân nào kém nhất? 4) Chọn 2-3 nước ứng viên và so sánh. 5) Trước khi bấm: kiểm tra lại nước định đi có để quân treo, có để đối thủ chiếu hoặc ăn quân không (blunder check). Bước 5 chỉ mất vài giây nhưng cứu rất nhiều ván.',
      [U('calc')]),
    A('tr-calc', 'training', 'Tính toán biến cờ', 'calculation visualization forcing moves tinh toan',
      'Tính các nước buộc (chiếu, ăn quân, đe doạ lớn) trước, vì đối thủ ít lựa chọn nên cây biến nhỏ. Với mỗi nước của mình, tìm nước đáp tốt nhất của đối phương, không phải nước mình mong. Dừng tính khi thế cờ đã yên (không còn quân treo, không còn chiếu) rồi đánh giá. Luyện bằng câu đố: cố tính hết lời giải trước khi đi nước đầu tiên.',
      [U('calc'), PZ('tactics')]),
    A('tr-review', 'training', 'Xem lại ván sau khi chơi', 'game review analysis learn from mistakes xem lai van',
      'Sau mỗi ván, nhất là ván thua: tự xem lại trước, ghi lại chỗ mình thấy không chắc, rồi mới bật phân tích máy. Tìm 1-2 lỗi lớn nhất và hỏi "vì sao mình đi nước đó?" (không thấy đòn, sợ hãi, hết giờ, không có kế hoạch). Trong web: Nhật ký › Phân tích chấm từng nước; nước sai được đưa vào Sổ luyện lỗi để ôn lại.',
      [{ kind: 'review' }]),
    A('tr-plan-elo', 'training', 'Nên học gì theo trình độ Elo', 'study plan improve elo beginner intermediate ke hoach hoc',
      'Dưới 1000: không để quân treo, chiếu hết cơ bản, nguyên tắc khai cuộc. 1000-1400: chiến thuật mỗi ngày (chĩa, ghim, xiên, chiếu mở), mẫu chiếu hết, tàn cuộc Vua + Tốt. 1400-1800: kế hoạch trung cuộc (cấu trúc Tốt, quân kém nhất), Lucena và Philidor, tính toán sâu hơn, bộ khai cuộc cố định. Trên 1800: tàn cuộc chuyên sâu, chuẩn bị khai cuộc, phân tích ván kỹ. Ở mọi trình độ: chơi ván đủ dài và xem lại ván thua.',
      [PZ('tactics'), U('tactics')]),
    A('tr-time', 'training', 'Quản lý thời gian', 'time management time trouble zeitnot quan ly thoi gian',
      'Đừng tiêu nhiều phút ở khai cuộc quen thuộc; dành thời gian cho những thế cờ quyết định (sau đổi quân lớn, khi có đòn chiến thuật, khi vào tàn cuộc). Khi còn ít giờ, chọn nước an toàn, đơn giản. Thường xuyên thua vì hết giờ: chuyển sang ván có cộng giờ (ví dụ 15+10).',
      []),
    A('tr-mindset', 'training', 'Tâm lý khi chơi', 'tilt mindset psychology losing streak tam ly',
      'Thua liên tiếp 2-3 ván: nghỉ một chút trước khi chơi tiếp, vì chơi khi bực dễ đi ẩu. Đang hơn: đừng chủ quan, kiểm tra mọi nước chiếu của đối thủ. Đang thua: tiếp tục tìm phương án gây khó, nhiều ván được cứu nhờ đối thủ mắc lỗi. Đánh giá bản thân bằng chất lượng nước đi và bài học rút ra, không chỉ bằng kết quả.',
      []),
    A('tr-elo', 'training', 'Elo là gì', 'elo rating points rank how elo works',
      'Elo đo sức mạnh tương đối: thắng người Elo cao hơn được cộng nhiều, thắng người thấp hơn được cộng ít; thua thì ngược lại. Elo dao động là bình thường; hãy nhìn xu hướng sau 20-30 ván. Trong web, Elo đổi sau mỗi ván với máy (theo mức Elo của máy) và ván Online, tối đa khoảng 40 điểm mỗi ván.',
      []),
    A('tr-app', 'training', 'Dùng Royal Gambit để tiến bộ', 'how to use app coach puzzles lessons library history su dung web',
      'Học cờ: 20 phần từ cơ bản tới nâng cao, có bài kiểm tra "nhảy cóc" để bỏ qua phần đã biết. Câu đố: luyện chiến thuật theo chủ đề và câu đố mỗi ngày. Thư viện: 100 khai cuộc và các thế tàn cuộc, xem từng nước và "Tập với máy". Nhật ký: lưu mọi ván, phân tích chấm từng nước. Sổ luyện lỗi: nước sai của bạn thành câu đố ôn lại theo lịch 1-3-7-21 ngày. Trợ lý Royal Gambit: huấn luyện viên riêng, nhận xét ván bằng Stockfish 19, tìm điểm yếu và gợi ý lộ trình.',
      [{ kind: 'review' }]),

    // ----- Ý tưởng theo khai cuộc -----
    A('plan-italian', 'opening', 'Khai cuộc Ý: ý tưởng chính', 'italian giuoco piano pianissimo plan ke hoach khai cuoc y',
      'Sau 1.e4 e5 2.Nf3 Nc6 3.Bc4, Tượng nhắm f7. Kế hoạch cổ điển: c3 rồi d4 để dựng trung tâm. Lối chậm (Giuoco Pianissimo) với d3: Trắng nhập thành, đi vòng Mã b1-d2-f1-g3, đẩy a4 giữ chỗ cho Tượng và chuẩn bị d4 đúng lúc. Đen thường ra Tượng c5 hoặc e7, Mã f6, nhập thành, chờ ...d5 hoặc ...a6 / ...Ba7 để giữ Tượng. Bẫy cần nhớ: Ván Hai Mã (3...Nf6) cho phép Ng5 tấn công f7.',
      [LIB('italian'), LIB('two-knights')]),
    A('plan-ruy', 'opening', 'Tây Ban Nha (Ruy Lopez): ý tưởng chính', 'ruy lopez spanish plan tay ban nha',
      '3.Bb5 tấn công Mã c6, quân đang bảo vệ e5; áp lực kéo dài nhiều nước. Thế chính: 3...a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O 9.h3: Trắng chuẩn bị d4, Mã b1 đi d2-f1-g3, Tượng b3 nhắm f7. Đen phản công cánh Hậu (...Na5, ...c5) hoặc giữ e5 vững chắc. Phòng thủ Berlin (3...Nf6) dẫn tới tàn cuộc sớm rất chắc cho Đen.',
      [LIB('ruy-lopez')]),
    A('plan-sicilian', 'opening', 'Phòng thủ Sicily: ý tưởng chính', 'sicilian najdorf dragon open sicilian plan sicily',
      '1.e4 c5 tạo thế không cân xứng: Đen đổi Tốt c lấy Tốt d (sau 2.Nf3 d6 3.d4 cxd4 4.Nxd4), được cột c nửa mở và thêm một Tốt trung tâm. Trắng ra quân nhanh, thường tấn công cánh Vua (f4, g4, Bh6 hoặc nhập thành cánh Hậu rồi bão Tốt); Đen phản công cánh Hậu bằng ...a6, ...b5, Xe c8 và ô c4. Ván rất sắc: ai chậm một nhịp thường thua. Muốn tránh lý thuyết dài, Trắng có thể chơi Alapin (2.c3).',
      [LIB('sicilian')]),
    A('plan-french', 'opening', 'Phòng thủ Pháp: ý tưởng chính', 'french defense advance winawer plan phong thu phap',
      '1.e4 e6 2.d4 d5. Ở biến Tiến (3.e5), Trắng có chuỗi Tốt d4-e5 và thêm không gian cánh Vua; Đen tấn công gốc chuỗi bằng ...c5 (dồn Hậu b6, Mã c6 đánh d4), rồi đôi khi ...f6 đánh e5. Điểm yếu kinh điển của Đen: Tượng c8 bị Tốt e6 chặn; tìm cách đổi nó (...b6 rồi ...Ba6) hoặc đưa ra trước khi đẩy e6 thì không được. Trắng thường tấn công cánh Vua, Đen phản công cánh Hậu.',
      [LIB('french'), U('strategy')]),
    A('plan-caro', 'opening', 'Phòng thủ Caro-Kann: ý tưởng chính', 'caro kann plan bf5 solid',
      '1.e4 c6 2.d4 d5: Đen chuẩn bị ...d5 mà không chặn Tượng c8 như Phòng thủ Pháp. Ở thế chính (3.Nc3 dxe4 4.Nxe4 Bf5), Tượng ra f5 trước rồi mới đi ...e6, Mã d7, Mã f6; cấu trúc Tốt chắc, ít điểm yếu. Biến Tiến 3.e5 Bf5: Trắng giành không gian, Đen phản công bằng ...c5. Hợp người thích thế cờ an toàn, tàn cuộc tốt.',
      [LIB('caro-kann')]),
    A('plan-qgd', 'opening', 'Gambit Hậu từ chối: ý tưởng chính', 'queens gambit declined carlsbad qgd plan',
      '1.d4 d5 2.c4 e6: Đen giữ chắc d5, Tượng c8 là quân khó ra nhất. Đen thường giải toả bằng ...c5 hoặc ...e5, hoặc ...dxc4 rồi ...c5 đúng lúc. Khi Trắng đổi cxd5 exd5, thành cấu trúc Carlsbad: Trắng hay chơi tấn công thiểu số (b4-b5 để tạo Tốt yếu c6), Đen tìm phản công cánh Vua bằng quân và ô e4 cho Mã.',
      [LIB('qgd'), LIB('queens-gambit')]),
    A('plan-kid', 'opening', 'Phòng thủ Ấn Độ cổ (King\'s Indian): ý tưởng chính', 'kings indian defense kid plan e5 f5',
      'Đen đặt Tượng g7, nhập thành, để Trắng dựng trung tâm lớn (c4, d4, e4) rồi đánh vào nó bằng ...e5 (hoặc ...c5). Khi Trắng đẩy d5 khoá trung tâm, hai bên đua cánh: Đen tấn công cánh Vua bằng ...Ne8 / ...Nd7, ...f5, ...f4, ...g5; Trắng tấn công cánh Hậu bằng b4, c5 và mở cột c. Thế trận sắc, ai nhanh hơn thường thắng.',
      [LIB('kings-indian')]),
    A('plan-london', 'opening', 'Hệ thống London: ý tưởng chính', 'london system setup plan bf4',
      'Trắng dựng gần như cùng một thế bất kể Đen đi gì: d4, Bf4 (ra trước e3), e3, c3, Nf3, Nbd2, Bd3, nhập thành cánh Vua. Kế hoạch: Mã e5 kết hợp f4 tấn công cánh Vua, hoặc đẩy e4 khi đủ quân hỗ trợ. Cần cẩn thận nước ...Qb6 của Đen đánh b2 (thường đáp Qb3 hoặc Qc1). Ít lý thuyết, hợp người mới, nhưng đừng chơi máy móc: nhìn kế hoạch của đối thủ.',
      [LIB('london')]),
    A('plan-english', 'opening', 'Khai cuộc Anh (1.c4): ý tưởng chính', 'english opening c4 reversed sicilian flank',
      '1.c4 kiểm soát d5 từ cánh, linh hoạt và dễ chuyển sang thế của 1.d4. Trắng thường ra Tượng g2 (g3, Bg2), Mã c3, chiến đấu cho ô d5 và cánh Hậu (b4-b5). Gặp 1...e5 giống "Sicily ngược" nhưng Trắng hơn một nhịp. Hợp người thích thế trận chiến lược, ít đánh thẳng ngay từ đầu.',
      [LIB('english')]),
    A('plan-scandi', 'opening', 'Phòng thủ Scandinavia: ý tưởng chính', 'scandinavian center counter qxd5 qa5',
      '1.e4 d5 2.exd5 Qxd5 3.Nc3: Hậu ra sớm nhưng có chỗ an toàn (Qa5 hoặc Qd6), đổi lại Đen phá trung tâm ngay và có sơ đồ ra quân đơn giản (Nf6, Bf5 hoặc Bg4, c6, e6). Trắng hơn tốc độ phát triển nhờ đuổi Hậu, nên Đen phải chơi chính xác ở 10 nước đầu.',
      [LIB('scandinavian')]),

    // ----- Chiến thuật nâng cao -----
    A('tac-clearance', 'tactics', 'Thí giải phóng (dọn đường)', 'clearance sacrifice vacate square line don duong',
      'Một quân của mình đang chắn đường hoặc chiếm ô mà quân khác cần dùng. Thí hoặc đi quân đó (kể cả với chiếu, ăn quân) để dọn đường cho Hậu, Xe, Tượng hay Mã tới ô quyết định. Dấu hiệu: "giá mà quân này không đứng ở đây thì mình có đòn".',
      [U('tactics2')]),
    A('tac-desperado', 'tactics', 'Quân liều mạng (desperado)', 'desperado piece lost anyway take something',
      'Khi một quân chắc chắn sẽ bị ăn (bị bắt, hoặc đang ở thế trao đổi), hãy cho nó ăn được càng nhiều càng tốt trước khi mất, thường kèm chiếu để không cho đối thủ thời gian. Hay gặp khi hai bên cùng có quân bị tấn công: đừng vội ăn lại, kiểm tra quân sắp mất của mình có thể "liều" ăn gì.',
      [U('calc')]),
    A('tac-windmill', 'tactics', 'Cối xay gió', 'windmill discovered check repeated torre lasker',
      'Kết hợp chiếu mở và chiếu thường lặp lại: một quân (thường là Xe) liên tục chiếu mở rồi lui về, mỗi lần ăn một quân của đối thủ, trong khi Vua đối phương chỉ đi qua lại hai ô. Ván Torre - Lasker (Moscow 1925) là ví dụ nổi tiếng nhất. Dấu hiệu: Vua đối phương bị kẹt và quân mình đứng trên đường chiếu của Tượng hoặc Xe khác.',
      [U('tactics')]),
    A('tac-attraction-mate', 'tactics', 'Thu hút Vua để chiếu hết', 'king hunt attraction sacrifice mate',
      'Thí quân để kéo Vua đối phương ra khỏi vỏ bọc (thường ăn Tốt h7, g7, f7 bằng Tượng hoặc Xe), rồi dồn quân chiếu liên tiếp. Chỉ thực hiện khi có đủ quân tấn công gần đó và đã kiểm tra các ô Vua có thể chạy. Một chuỗi chiếu hết bắt buộc là đáng thí bất cứ quân nào.',
      [U('attack'), PZ('mates')]),
    A('tac-defence', 'tactics', 'Phòng thủ khi bị tấn công', 'defense defending under attack counterattack phong thu',
      'Bình tĩnh đếm: đòn của đối thủ có thật không? Ưu tiên theo thứ tự: chiếu hoặc đe doạ lớn hơn (phản công), ăn quân tấn công, chặn đường, đi quân bị tấn công tới ô an toàn, bảo vệ thêm. Đổi bớt quân tấn công mạnh nhất của đối thủ. Khi thua thế, tìm thế "pháo đài" hoặc chiếu liên tục để hoà.',
      [U('defense')]),

    // ----- Mẫu chiếu hết bổ sung -----
    A('mate-opera', 'mates', 'Chiếu hết kiểu "ván cờ trong nhà hát" (Morphy 1858)', 'opera mate morphy rook bishop back rank',
      'Xe chiếu ở hàng cuối, được Tượng bảo vệ từ xa, khi các ô quanh Vua bị chính quân của nó chặn. Ván Morphy - Công tước Brunswick và Bá tước Isouard (Paris 1858) kết thúc bằng 16.Qb8+! Nxb8 17.Rd8#. Bài học của ván: ra quân nhanh, mở cột cho Xe và không ngại thí để giữ nhịp tấn công khi Vua đối phương còn ở giữa.',
      [U('mates')]),
    A('mate-bishop-knight', 'mates', 'Chiếu hết bằng Tượng và Mã', 'bishop and knight checkmate w manoeuvre corner',
      'Vua + Tượng + Mã thắng được Vua đơn, nhưng khó: phải dồn Vua đối phương về góc cùng màu với Tượng (góc màu kia không chiếu hết được), dùng Mã đi hình chữ W để đẩy Vua dọc mép bàn. Có thể cần tới khoảng 33 nước, rất hiếm gặp trong ván thật. Ngược lại hai Mã không thể ép chiếu hết Vua đơn.',
      [LIB('kbn-k'), U('endgame')]),
    A('mate-two-bishops', 'mates', 'Chiếu hết bằng hai Tượng', 'two bishops checkmate',
      'Hai Tượng đứng cạnh nhau tạo "bức tường" chéo, cùng Vua mình dồn Vua đối phương vào góc bàn rồi chiếu hết. Cẩn thận pat khi Vua đối phương chỉ còn ít ô. Thường cần khoảng 20 nước.',
      [LIB('kbb-k')]),

    // ----- Chiến lược bổ sung -----
    A('st-minority', 'strategy', 'Tấn công thiểu số', 'minority attack carlsbad b4 b5 queenside',
      'Trong cấu trúc Carlsbad (Trắng: a2, b2, d4; Đen: a7, b7, c6, d5), Trắng dùng hai Tốt cánh Hậu tấn công ba Tốt của Đen bằng b4-b5. Sau khi đổi, Đen thường còn một Tốt yếu ở c6 hoặc d5 để Trắng tấn công bằng Xe và Mã. Đen phản công ở cánh Vua hoặc dùng ô e4 cho Mã.',
      [LIB('qgd'), U('strategy')]),
    A('st-space', 'strategy', 'Ưu thế không gian', 'space advantage cramped position khong gian',
      'Bên có nhiều không gian (Tốt tiến xa hơn) dễ chuyển quân từ cánh này sang cánh kia, bên bị chật thì quân vướng nhau. Bên chật nên đổi quân để có chỗ và tìm nước đẩy Tốt phá thế (ví dụ ...c5, ...f6). Bên nhiều không gian nên tránh đổi quân và chuẩn bị đột phá ở nơi mình mạnh.',
      [U('strategy')]),
    A('st-open-closed', 'strategy', 'Thế cờ mở và thế cờ đóng', 'open position closed position center structure the co mo dong',
      'Thế mở (trung tâm ít Tốt, nhiều cột mở): tốc độ ra quân, an toàn Vua và cặp Tượng rất quan trọng; chiến thuật xuất hiện nhiều. Thế đóng (chuỗi Tốt khoá nhau): Mã mạnh hơn Tượng, ván cờ chậm, kế hoạch là đẩy Tốt ở cánh và đi vòng quân tới ô tốt. Trước khi chọn kế hoạch, hãy xác định trung tâm đang mở hay đóng.',
      [U('strategy')]),
    A('st-initiative', 'strategy', 'Thế chủ động và nhịp (tempo)', 'initiative tempo momentum the chu dong',
      'Bên chủ động liên tục tạo đe doạ, buộc đối thủ phải đáp lại. Mỗi nước "đi kèm đe doạ" (chiếu, tấn công quân, doạ chiếu hết) là được thêm nhịp. Khi đang chủ động, đừng đi nước chậm cho phép đối thủ thở; khi bị ép, tìm nước vừa phòng thủ vừa tạo đe doạ để giành lại thế chủ động.',
      [U('attack')]),
    A('st-exchange-sac', 'strategy', 'Thí chất lượng', 'exchange sacrifice rook for minor piece thi chat luong',
      'Đổi Xe lấy Tượng hoặc Mã (kém khoảng 2 điểm) để được thứ có giá trị lâu dài: phá cấu trúc Tốt quanh Vua đối phương, loại quân phòng thủ tốt nhất, có Mã hoặc Tượng cực mạnh không thể bị đuổi, hay Tốt thông. Petrosian nổi tiếng với kiểu thí chất lượng phòng ngừa. Chỉ thí khi đánh giá được bù đắp cụ thể.',
      [U('strategy')]),
    A('st-fortress', 'strategy', 'Pháo đài (cứu thế thua)', 'fortress draw defense phao dai',
      'Bên kém quân dựng một thế phòng thủ mà đối thủ không thể phá dù hơn quân, ví dụ Vua ở góc với Tượng sai màu, hoặc Xe + Tốt chặn Hậu. Khi đang thua, hãy tìm thế pháo đài trước khi mất thêm Tốt: đổi Tốt có thể tạo Tốt thông cho đối thủ, giữ Vua ở ô then chốt.',
      [U('endgame')]),
    A('st-pawn-breaks', 'strategy', 'Nước đẩy Tốt phá thế', 'pawn break lever d5 f5 c5 day tot pha the',
      'Khi thế cờ bế tắc, nước đẩy Tốt chạm vào Tốt đối phương (ví dụ ...c5, ...f5, e5, f4-f5) mở cột và tạo chỗ cho quân. Chuẩn bị đủ quân hỗ trợ trước khi đẩy, vì sau khi phá thế, cột và đường chéo vừa mở thuộc về bên có quân sẵn sàng hơn.',
      [U('strategy')]),

    // ----- Tàn cuộc bổ sung -----
    A('end-rook-basics', 'endgame', 'Tàn cuộc Xe + Tốt đấu Xe: các quy tắc', 'rook and pawn vs rook rules short side long side',
      'Vua phòng thủ đứng trước Tốt: thường hoà (thế Philidor). Vua phòng thủ bị cắt khỏi Tốt từ hai cột trở lên: bên mạnh thường thắng (thế Lucena). Khi phòng thủ, đặt Vua ở "cánh ngắn" (phía ít cột hơn tính từ Tốt) và Xe ở "cánh dài" để chiếu từ xa. Tốt cột a/h với Xe đứng trước Tốt thì rất khó thắng.',
      [LIB('lucena'), LIB('philidor'), U('rookend')]),
    A('end-r-vs-minor', 'endgame', 'Xe đấu Tượng hoặc Mã (không Tốt)', 'rook vs bishop rook vs knight draw corner',
      'Thường là hoà nếu phòng thủ đúng. Xe đấu Tượng: Vua phòng thủ chạy về góc khác màu với Tượng của mình (góc mà Tượng không kiểm soát) để tránh bị dồn. Xe đấu Mã: giữ Mã sát cạnh Vua, tránh để Mã bị tách xa hay Vua bị dồn vào góc.',
      [U('endgame')]),
    A('end-q-vs-r', 'endgame', 'Hậu đấu Xe', 'queen vs rook endgame philidor position',
      'Hậu thắng Xe về lý thuyết nhưng kỹ thuật khó: dồn Vua đối phương ra mép, dùng chiếu và nước chờ để tách Xe khỏi Vua rồi ăn Xe bằng đòn chĩa hoặc xiên. Có thể cần nhiều nước; bên phòng thủ luôn tìm thế pat và chiếu liên tục.',
      [U('endgame')]),
    A('end-connected', 'endgame', 'Hai Tốt thông liên kết', 'connected passed pawns sixth rank beat rook',
      'Hai Tốt thông đứng cạnh nhau tự bảo vệ nhau khi tiến lên. Hai Tốt thông liên kết ở hàng 6 thường thắng một Xe nếu Vua đối phương ở xa. Đẩy chúng ngang hàng, khi bị tấn công thì đẩy Tốt được bảo vệ lên trước.',
      [U('pawnend')]),
    A('end-breakthrough', 'endgame', 'Đột phá Tốt (3 đấu 3)', 'pawn breakthrough b6 sacrifice three pawns',
      'Ba Tốt Trắng ở a5, b5, c5 đối diện ba Tốt Đen ở a7, b7, c7 (không còn quân khác gần đó): Trắng đi trước thắng bằng 1.b6! Nếu 1...axb6 thì 2.c6!; nếu 1...cxb6 thì 2.a6!; luôn có một Tốt phong cấp. Điều kiện: Vua đối phương ở quá xa để đuổi kịp.',
      [U('pawnend')]),
    A('end-outside', 'endgame', 'Tốt thông xa và chặn đường Vua (shouldering)', 'outside passed pawn shouldering king cut off',
      'Tốt thông xa kéo Vua đối phương sang một cánh, cho Vua mình ăn Tốt ở cánh kia: đó là lý do tàn cuộc Tốt có Tốt thông xa thường thắng. "Huých vai": dùng Vua mình chặn đường Vua đối phương tới khu vực quan trọng, kể cả khi phải đi đường vòng.',
      [U('pawnend')]),

    // ----- Luật & kiến thức chung -----
    A('gen-history', 'general', 'Lịch sử cờ vua', 'history origin chaturanga shatranj lich su',
      'Cờ vua có nguồn gốc từ trò Chaturanga ở Ấn Độ khoảng thế kỷ 6, truyền sang Ba Tư (Shatranj) rồi châu Âu qua thế giới Ả Rập. Cuối thế kỷ 15, Hậu và Tượng có cách đi mạnh như ngày nay, ván cờ nhanh và sắc hơn. Giải vô địch thế giới chính thức đầu tiên diễn ra năm 1886. Từ thập niên 1990, máy tính (Deep Blue thắng Kasparov năm 1997) rồi các engine như Stockfish thay đổi cách luyện tập.',
      []),
    A('gen-champions', 'general', 'Các nhà vô địch thế giới', 'world champions steinitz lasker capablanca carlsen gukesh vo dich the gioi',
      'Theo thứ tự: Steinitz, Lasker, Capablanca, Alekhine, Euwe, Botvinnik, Smyslov, Tal, Petrosian, Spassky, Fischer, Karpov, Kasparov, Kramnik, Anand, Carlsen (2013–2023), Đinh Lập Nhân (Ding Liren, 2023–2024) và Gukesh Dommaraju (vô địch cuối năm 2024). Mỗi người để lại một phong cách đáng học: Capablanca với tàn cuộc, Tal với tấn công, Petrosian với phòng thủ, Karpov với chiến lược, Carlsen với kỹ thuật tàn cuộc. (Danh sách tính đến 2025.)',
      []),
    A('gen-titles', 'general', 'Danh hiệu FIDE và các mốc Elo', 'fide titles gm im fm cm grandmaster dai kien tuong',
      'Đại kiện tướng (GM): đạt Elo 2500 và 3 chuẩn GM. Kiện tướng quốc tế (IM): 2400 và 3 chuẩn IM. Kiện tướng FIDE (FM): 2300. Ứng cử viên kiện tướng (CM): 2200. Danh hiệu nữ: WGM 2300, WIM 2200, WFM 2100, WCM 2000. Elo trên các web chơi online thường không bằng Elo FIDE; quan trọng là xu hướng tiến bộ của chính mình.',
      []),
    A('gen-notation', 'general', 'Cách đọc ký hiệu nước đi', 'algebraic notation san how to read moves ky hieu',
      'Cột a đến h (trái sang phải phía Trắng), hàng 1 đến 8. Chữ cái quân (bản tiếng Anh): K Vua, Q Hậu, R Xe, B Tượng, N Mã; Tốt không có chữ. Nf3: Mã tới f3; exd5: Tốt e ăn ở d5; O-O / O-O-O: nhập thành cánh Vua / cánh Hậu; e8=Q: phong Hậu; + chiếu, # chiếu hết. Ký hiệu đánh giá: !! tuyệt hay, ! hay, !? đáng thử, ?! đáng ngờ, ? sai, ?? hớ nặng. Đánh giá +1.0 nghĩa là Trắng hơn khoảng một Tốt.',
      [U('basics')]),
    A('gen-fen-pgn', 'general', 'FEN và PGN là gì', 'fen pgn format notation copy position',
      'FEN mô tả một thế cờ trên một dòng: vị trí quân theo từng hàng từ hàng 8 xuống hàng 1 (số là ô trống, chữ hoa là Trắng), bên tới lượt (w / b), quyền nhập thành (KQkq), ô bắt Tốt qua đường, số nước từ lần ăn quân / đi Tốt cuối và số thứ tự nước. PGN lưu cả ván: thông tin giải, tên người chơi và toàn bộ nước đi. Trong web: Nhật ký › tải PGN, và "Đặt lên bàn" một FEN để phân tích.',
      []),
    A('gen-time', 'general', 'Các thể loại thời gian', 'bullet blitz rapid classical time control the loai',
      'Theo FIDE: cờ chớp (blitz) mỗi bên tối đa 10 phút, cờ nhanh (rapid) hơn 10 phút và dưới 60 phút, cờ tiêu chuẩn từ 60 phút trở lên. Trên mạng, cờ siêu chớp (bullet) dưới 3 phút. Muốn tiến bộ, nên chơi nhiều ván nhanh hoặc tiêu chuẩn (10 phút trở lên, có cộng giờ) và xem lại ván, thay vì chỉ chơi chớp.',
      []),
    A('gen-etiquette', 'general', 'Luật chạm quân và văn hoá thi đấu', 'touch move etiquette sportsmanship cham quan',
      'Thi đấu trực tiếp: chạm vào quân nào phải đi quân đó (nếu đi được), chạm quân đối phương phải ăn quân đó; muốn chỉnh quân thì nói "chỉnh quân" trước khi chạm. Bắt tay trước và sau ván, không nói chuyện làm phiền, đầu hàng bằng cách đặt Vua nằm hoặc nói xin thua. Trên mạng: không dùng máy hỗ trợ khi đang chơi, không rời ván khi đang thua.',
      []),
    A('gen-tournament', 'general', 'Thể thức giải đấu', 'swiss system round robin knockout tournament the thuc',
      'Hệ Thụy Sĩ: mỗi vòng ghép người cùng điểm, không loại ai, thường dùng cho giải đông người. Vòng tròn: mỗi người gặp tất cả. Loại trực tiếp: thua là bị loại (thường đấu 2 ván, hoà thì đánh cờ nhanh). Xếp hạng phụ khi bằng điểm: hệ số Buchholz, đối đầu trực tiếp, số ván thắng.',
      []),
    A('gen-vietnam', 'general', 'Cờ vua Việt Nam', 'vietnam chess le quang liem truong son dao thien hai',
      'Đào Thiên Hải là đại kiện tướng đầu tiên của Việt Nam (1995). Nguyễn Ngọc Trường Sơn đạt danh hiệu đại kiện tướng khi mới 14 tuổi. Lê Quang Liêm và Trường Sơn từng thuộc nhóm kỳ thủ hàng đầu thế giới; Liêm vô địch thế giới cờ chớp năm 2013. Phong trào cờ vua phát triển mạnh trong trường học và các giải trẻ.',
      []),
    A('gen-engines', 'general', 'Dùng máy (Stockfish) để học đúng cách', 'engine stockfish analysis how to use computer may phan tich',
      'Máy cho biết nước tốt nhất nhưng không giải thích vì sao. Cách học tốt: tự phân tích trước, ghi lại ý tưởng, rồi mới bật máy để so; với mỗi chỗ khác biệt, hỏi "nước của máy doạ gì, ngăn gì?". Đánh giá ±0.3 là gần cân bằng, khác biệt nhỏ ở khai cuộc không đáng lo; tập trung vào những lần điểm số đổi lớn (nước hớ). Trong web: Stockfish 19 chấm từng nước trong Nhật ký, nước sai vào Sổ luyện lỗi.',
      [{ kind: 'review' }]),

    // ----- Luyện tập bổ sung -----
    A('tr-puzzles', 'training', 'Giải câu đố hiệu quả', 'puzzle training woodpecker method tactics practice cau do',
      'Giải chậm và chắc hơn nhanh và đoán: tính hết lời giải (cả nước đáp tốt nhất của đối thủ) trước khi đi nước đầu tiên. Phương pháp "chim gõ kiến": giải đi giải lại cùng một bộ câu đố, mỗi vòng nhanh hơn, để mẫu hình in vào trí nhớ. 10-20 phút mỗi ngày đều đặn tốt hơn hai giờ một lần mỗi tuần.',
      [PZ('tactics')]),
    A('tr-visual', 'training', 'Luyện hình dung bàn cờ', 'visualization blindfold board vision hinh dung',
      'Hình dung tốt giúp tính biến xa hơn. Bài tập: đọc một đoạn nước đi rồi tưởng tượng thế cờ, sau đó kiểm tra trên bàn; gọi tên màu của một ô bất kỳ (ví dụ e4 là ô trắng); giải câu đố chiếu hết 2 nước mà không di quân. Bắt đầu với thế ít quân rồi tăng dần.',
      [U('basics'), U('mate2')]),
    A('tr-study-plan', 'training', 'Lịch tập một tuần mẫu', 'weekly study plan schedule training routine lich tap',
      'Mỗi ngày 30-45 phút: 15 phút câu đố chiến thuật, 10 phút ôn Sổ luyện lỗi hoặc một bài Học cờ, phần còn lại chơi một ván 10 phút trở lên. Cuối tuần: xem lại 2-3 ván thua, học một thế tàn cuộc mới, ôn một nhánh khai cuộc mình hay gặp. Ghi lại lỗi lặp lại để tập trung sửa.',
      [{ kind: 'review' }, PZ('tactics')]),
    A('tr-blunders', 'training', 'Cách bớt đi nước hớ', 'stop blundering blunder check safety check bot di nuoc ho',
      'Phần lớn nước hớ đến từ: quên quân đối phương vừa đi doạ gì, quên quân của mình đang bảo vệ ô nào, và đi vội khi đang thắng. Trước mỗi nước, kiểm tra nhanh: sau nước này, đối thủ có nước chiếu, ăn quân hay đe doạ nào nguy hiểm không? Quân nào của mình đang không được bảo vệ? Ngồi trên tay, viết nước ra hoặc đếm đến ba trước khi đi cũng giúp.',
      [U('defense'), PZ('tactics')]),
    // ----- Ván cờ nổi tiếng (có nước đi đầy đủ: xem lại từng nước trong Thư viện kiến thức) -----
    G('game-opera', 'Ván cờ trong nhà hát (Morphy, 1858)', 'opera game morphy duke brunswick isouard 1858 paris van co trong nha hat',
      'Paul Morphy cầm Trắng đấu Công tước Brunswick và Bá tước Isouard (hai người hội ý) trong lúc xem nhạc kịch ở Paris, 1858. Ván mẫu mực về phát triển quân nhanh và mở cột tấn công Vua còn ở giữa: Morphy liên tục ra quân với nhịp, thí Mã, thí Xe rồi thí Hậu ở nước 16 để chiếu hết bằng Xe được Tượng bảo vệ (mẫu "chiếu hết kiểu nhà hát"). Bài học: đừng phí nước đi Tượng đổi Mã sớm như Đen, và khi đối thủ chậm ra quân, hãy mở cột ngay.',
      '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#',
      { white: 'Paul Morphy', black: 'Công tước Brunswick & Bá tước Isouard', year: 1858, result: '1-0' }),
    G('game-immortal', 'Ván cờ bất tử (Anderssen – Kieseritzky, 1851)', 'immortal game anderssen kieseritzky 1851 london van co bat tu kings gambit',
      'Adolf Anderssen thắng Lionel Kieseritzky trong một ván giao hữu ở London năm 1851, mở đầu bằng Gambit Vua. Anderssen thí lần lượt một Tượng, hai Xe rồi cả Hậu, để rồi chiếu hết bằng ba quân nhẹ còn lại (22.Qf6+! Nxf6 23.Be7#). Đây là biểu tượng của lối chơi lãng mạn thế kỷ 19: phát triển và tấn công quan trọng hơn quân số. Ngày nay máy cho thấy cả hai bên đều có những nước chưa chính xác, nhưng vẻ đẹp của đòn kết thúc vẫn được nhắc mãi.',
      '1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7#',
      { white: 'Adolf Anderssen', black: 'Lionel Kieseritzky', year: 1851, result: '1-0' }),
    G('game-evergreen', 'Ván cờ thường xanh (Anderssen – Dufresne, 1852)', 'evergreen game anderssen dufresne 1852 berlin evans gambit van co thuong xanh',
      'Anderssen thắng Jean Dufresne ở Berlin năm 1852 sau Gambit Evans. Trắng thí Tốt để mở cột, rồi tung chuỗi đòn: 20.Rxe7+! và 21.Qxd7+!! thí Hậu, Vua Đen bị hai Tượng dồn tới chiếu hết ở nước 24. Ván cho thấy sức mạnh của cột mở và Tượng hoạt động khi Vua đối phương bị kẹt ở trung tâm.',
      '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 18. exf6 Rg8 19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kf8 24. Bxe7#',
      { white: 'Adolf Anderssen', black: 'Jean Dufresne', year: 1852, result: '1-0' }),
    G('game-legal', 'Bẫy Legal (Legall – Saint Brie, 1750)', 'legal trap legall de kermeur saint brie 1750 bay legal',
      'Ván ngắn nổi tiếng nhất thế kỷ 18 ở quán cà phê de la Régence (Paris). Trắng "biếu" Hậu bằng 5.Nxe5!, Đen tham ăn 5...Bxd1?? và bị chiếu hết sau hai nước bằng ba quân nhẹ. Bài học: ghim tương đối không giữ được quân, và trước khi ăn quân lớn hãy kiểm tra các nước chiếu của đối thủ.',
      '1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5#',
      { white: 'Legall de Kermeur', black: 'Saint Brie', year: 1750, result: '1-0' }),
    G('game-rubinstein', 'Ván bất tử của Rubinstein (Rotlewi – Rubinstein, 1907)', 'rotlewi rubinstein 1907 lodz immortal combination',
      'Akiba Rubinstein cầm Đen thắng Georg Rotlewi ở Łódź năm 1907 bằng một trong những chuỗi thí quân đẹp nhất lịch sử: 22...Rxc3!, 23...Rd2!! và 24...Bxe4+, hai Tượng nhắm thẳng vào Vua Trắng. Ván là bài học về cặp Tượng trên hai đường chéo dài và sức mạnh của việc phát triển hài hoà trước khi tấn công.',
      '1. d4 d5 2. Nf3 e6 3. e3 c5 4. c4 Nc6 5. Nc3 Nf6 6. dxc5 Bxc5 7. a3 a6 8. b4 Bd6 9. Bb2 O-O 10. Qd2 Qe7 11. Bd3 dxc4 12. Bxc4 b5 13. Bd3 Rd8 14. Qe2 Bb7 15. O-O Ne5 16. Nxe5 Bxe5 17. f4 Bc7 18. e4 Rac8 19. e5 Bb6+ 20. Kh1 Ng4 21. Be4 Qh4 22. g3 Rxc3 23. gxh4 Rd2 24. Qxd2 Bxe4+ 25. Qg2 Rh3',
      { white: 'Georg Rotlewi', black: 'Akiba Rubinstein', year: 1907, result: '0-1' }),
    G('game-avro', 'Botvinnik – Capablanca (AVRO 1938)', 'botvinnik capablanca avro 1938 nimzo indian ba3 combination',
      'Mikhail Botvinnik thắng cựu vô địch thế giới José Raúl Capablanca tại giải AVRO 1938 (Hà Lan). Từ khai cuộc Nimzo-Ấn, Trắng dựng trung tâm e4-e5-f4-f5, rồi tung đòn 30.Ba3!! thí Tượng để kéo Hậu Đen đi xa và 31.Nh5+! mở đường cho Tốt e tiến tới phong cấp. Ván kinh điển về kế hoạch trung tâm kết hợp đòn chiến thuật đúng lúc.',
      '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 d5 5. a3 Bxc3+ 6. bxc3 c5 7. cxd5 exd5 8. Bd3 O-O 9. Ne2 b6 10. O-O Ba6 11. Bxa6 Nxa6 12. Bb2 Qd7 13. a4 Rfe8 14. Qd3 c4 15. Qc2 Nb8 16. Rae1 Nc6 17. Ng3 Na5 18. f3 Nb3 19. e4 Qxa4 20. e5 Nd7 21. Qf2 g6 22. f4 f5 23. exf6 Nxf6 24. f5 Rxe1 25. Rxe1 Re8 26. Re6 Rxe6 27. fxe6 Kg7 28. Qf4 Qe8 29. Qe5 Qe7 30. Ba3 Qxa3 31. Nh5+ gxh5 32. Qg5+ Kf8 33. Qxf6+ Kg8 34. e7 Qc1+ 35. Kf2 Qc2+ 36. Kg3 Qd3+ 37. Kh4 Qe4+ 38. Kxh5 Qe2+ 39. Kh4 Qe4+ 40. g4 Qe1+ 41. Kh5',
      { white: 'Mikhail Botvinnik', black: 'José Raúl Capablanca', year: 1938, result: '1-0' }),
    G('game-century', 'Ván cờ của thế kỷ (Byrne – Fischer, 1956)', 'game of the century donald byrne bobby fischer 1956 van co cua the ky grunfeld',
      'Bobby Fischer, khi đó 13 tuổi, cầm Đen thắng Donald Byrne ở New York năm 1956. Nước 17...Be6!! bỏ Hậu để đổi lấy hàng loạt quân của Trắng qua chuỗi chiếu mở kiểu cối xay gió, rồi các quân nhẹ của Đen phối hợp dồn Vua Trắng tới chiếu hết. Ván tiêu biểu cho việc đánh giá thế cờ bằng hoạt động của quân thay vì đếm quân.',
      '1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2#',
      { white: 'Donald Byrne', black: 'Bobby Fischer', year: 1956, result: '0-1' }),
    G('game-fischer-spassky6', 'Fischer – Spassky, ván 6 (Reykjavík 1972)', 'fischer spassky 1972 game 6 reykjavik world championship queens gambit tartakower',
      'Ván 6 trận tranh ngôi vô địch thế giới 1972. Fischer, vốn gần như chỉ đi 1.e4, bất ngờ mở đầu bằng 1.c4 và chơi một ván chiến lược hoàn hảo trong biến Tartakower của Gambit Hậu từ chối: đẩy e4-e5, khoá trung tâm, rồi dồn Xe vào cột f và phá vỡ cánh Vua Đen. Tương truyền chính Spassky cũng đứng dậy vỗ tay sau ván. Fischer thắng trận và trở thành nhà vô địch thế giới người Mỹ đầu tiên.',
      '1. c4 e6 2. Nf3 d5 3. d4 Nf6 4. Nc3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6 12. Qa4 c5 13. Qa3 Rc8 14. Bb5 a6 15. dxc5 bxc5 16. O-O Ra7 17. Be2 Nd7 18. Nd4 Qf8 19. Nxe6 fxe6 20. e4 d4 21. f4 Qe7 22. e5 Rb8 23. Bc4 Kh8 24. Qh3 Nf8 25. b3 a5 26. f5 exf5 27. Rxf5 Nh7 28. Rcf1 Qd8 29. Qg3 Re7 30. h4 Rbb7 31. e6 Rbc7 32. Qe5 Qe8 33. a4 Qd8 34. R1f2 Qe8 35. R2f3 Qd8 36. Bd3 Qe8 37. Qe4 Nf6 38. Rxf6 gxf6 39. Rxf6 Kg8 40. Bc4 Kh8 41. Qf4',
      { white: 'Bobby Fischer', black: 'Boris Spassky', year: 1972, result: '1-0' }),
    G('game-short-timman', 'Short – Timman: Vua đi bộ (Tilburg 1991)', 'short timman 1991 tilburg king walk vua di bo alekhine defense',
      'Nigel Short thắng Jan Timman ở Tilburg 1991 bằng một đòn hiếm thấy: khi các quân nặng của Trắng đã khoá chặt Vua Đen, Vua Trắng tự mình đi bộ Kh2-g3-f4-g5 để tham gia chiếu hết (Đen bỏ cuộc vì không ngăn được Kh6 kèm Qg7#). Ván minh hoạ rằng khi thế trận khoá kín và đối thủ không có nước chiếu, Vua cũng là quân tấn công.',
      '1. e4 Nf6 2. e5 Nd5 3. d4 d6 4. Nf3 g6 5. Bc4 Nb6 6. Bb3 Bg7 7. Qe2 Nc6 8. O-O O-O 9. h3 a5 10. a4 dxe5 11. dxe5 Nd4 12. Nxd4 Qxd4 13. Re1 e6 14. Nd2 Nd5 15. Nf3 Qc5 16. Qe4 Qb4 17. Bc4 Nb6 18. b3 Nxc4 19. bxc4 Re8 20. Rd1 Qc5 21. Qh4 b6 22. Be3 Qc6 23. Bh6 Bh8 24. Rd8 Bb7 25. Rad1 Bg7 26. R8d7 Rf8 27. Bxg7 Kxg7 28. R1d4 Rae8 29. Qf6+ Kg8 30. h4 h5 31. Kh2 Rc8 32. Kg3 Rce8 33. Kf4 Bc8 34. Kg5',
      { white: 'Nigel Short', black: 'Jan Timman', year: 1991, result: '1-0' }),
    G('game-deepblue', 'Deep Blue – Kasparov, ván 6 (New York 1997)', 'deep blue kasparov 1997 game 6 computer caro kann nxe6 may tinh',
      'Ván quyết định trận tái đấu năm 1997: siêu máy tính Deep Blue của IBM thắng Garry Kasparov sau 19 nước trong Phòng thủ Caro-Kann, nhờ thí Mã 8.Nxe6 (nước Kasparov được cho là đã nhầm thứ tự với ...h6). Deep Blue thắng trận 3,5 – 2,5, lần đầu một máy tính thắng nhà vô địch thế giới trong một trận đấu với thời gian tiêu chuẩn.',
      '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Ng5 Ngf6 6. Bd3 e6 7. N1f3 h6 8. Nxe6 Qe7 9. O-O fxe6 10. Bg6+ Kd8 11. Bf4 b5 12. a4 Bb7 13. Re1 Nd5 14. Bg3 Kc8 15. axb5 cxb5 16. Qd3 Bc6 17. Bf5 exf5 18. Rxe7 Bxe7 19. c4',
      { white: 'Deep Blue', black: 'Garry Kasparov', year: 1997, result: '1-0' }),
    G('game-kasparov-topalov', 'Kasparov – Topalov: "Ván bất tử của Kasparov" (Wijk aan Zee 1999)', 'kasparov topalov 1999 wijk aan zee immortal rxd4 king hunt',
      'Garry Kasparov thắng Veselin Topalov ở Wijk aan Zee 1999 với nước thí Xe 24.Rxd4!! mở đầu cuộc săn Vua kéo dài qua cả bàn cờ: Vua Đen bị dồn từ cánh Hậu sang tận hàng 1 của Trắng. Đây được nhiều người xem là ván đẹp nhất của Kasparov, minh hoạ tính toán sâu và việc thí quân để lấy thế chủ động dài hạn.',
      '1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7',
      { white: 'Garry Kasparov', black: 'Veselin Topalov', year: 1999, result: '1-0' }),

    // ----- Lịch sử thi đấu đỉnh cao -----
    A('gen-wch-history', 'general', 'Lịch sử các trận tranh ngôi vô địch thế giới', 'world championship history matches steinitz zukertort capablanca alekhine fischer spassky karpov kasparov carlsen anand ding gukesh lich su vo dich',
      'Trận chính thức đầu tiên năm 1886: Steinitz thắng Zukertort. 1927 ở Buenos Aires: Alekhine thắng Capablanca. 1948: FIDE tổ chức giải đấu chọn nhà vô địch sau khi Alekhine qua đời, Botvinnik đăng quang. 1972 ở Reykjavík: Fischer thắng Spassky giữa thời Chiến tranh Lạnh. 1975: Fischer không bảo vệ ngôi, Karpov trở thành vô địch. 1984–85: trận Karpov – Kasparov bị dừng sau 48 ván; trận đấu lại năm 1985 Kasparov thắng. 1993–2006: ngôi vô địch bị chia đôi (PCA và FIDE), thống nhất lại năm 2006 khi Kramnik thắng Topalov. 2007: Anand vô địch. 2013 ở Chennai: Carlsen thắng Anand và giữ ngôi tới 2023. 2023: Carlsen không thi đấu, Đinh Lập Nhân thắng Nepomniachtchi. Cuối năm 2024 ở Singapore: Gukesh Dommaraju (18 tuổi) thắng Đinh Lập Nhân, trở thành nhà vô địch thế giới trẻ nhất. (Tính đến 2025.)',
      [LIB('qgd')]),
    A('gen-computers', 'general', 'Máy tính và cờ vua', 'computer chess deep blue alphazero stockfish nnue leela engine history may tinh',
      'Năm 1997, siêu máy tính Deep Blue của IBM thắng Garry Kasparov 3,5 – 2,5. Từ đó các chương trình như Fritz, Rybka, Houdini, Komodo và Stockfish (mã nguồn mở) vượt xa con người. Năm 2017, AlphaZero của DeepMind tự học chỉ từ luật chơi và thắng Stockfish trong một trận thử nghiệm; ý tưởng mạng nơ-ron được dự án Leela Chess Zero tiếp nối. Từ 2020, Stockfish dùng mạng NNUE và hiện là engine mạnh hàng đầu thế giới; web này dùng Stockfish 19 chạy ngay trên trình duyệt.',
      [{ kind: 'review' }]),
    A('gen-greats', 'general', 'Những kỳ thủ vĩ đại và phong cách', 'greatest players morphy capablanca tal petrosian fischer kasparov carlsen polgar style phong cach ky thu',
      'Morphy (thế kỷ 19): bậc thầy phát triển quân và tấn công. Capablanca: thế cờ đơn giản, kỹ thuật tàn cuộc gần như hoàn hảo. Alekhine: tấn công phức tạp, giàu tưởng tượng. Tal: "phù thuỷ xứ Riga", thí quân táo bạo. Petrosian: phòng ngừa, phòng thủ, thí chất lượng. Fischer: chính xác, rõ ràng, chuẩn bị khai cuộc kỹ. Karpov: chiến lược bóp nghẹt từ từ. Kasparov: năng động, chuẩn bị khai cuộc sâu, tấn công mạnh mẽ. Carlsen: vắt kiệt ưu thế nhỏ, tàn cuộc xuất sắc. Judit Polgár: nữ kỳ thủ mạnh nhất lịch sử, từng vào top 10 thế giới, lối chơi tấn công sắc bén.',
      []),
    A('gen-olympiad', 'general', 'Olympiad và các giải lớn', 'chess olympiad candidates tournament world cup tata steel norway chess giai dau lon',
      'Olympiad cờ vua là giải đồng đội giữa các quốc gia, tổ chức hai năm một lần (giải chính thức đầu tiên năm 1927 ở London). Giải Ứng viên (Candidates) chọn người thách đấu nhà vô địch thế giới. Các giải mời nổi tiếng: Tata Steel (Wijk aan Zee, Hà Lan, mỗi tháng Giêng), Norway Chess, Sinquefield Cup. FIDE còn tổ chức World Cup (loại trực tiếp) và giải vô địch thế giới cờ nhanh, cờ chớp.',
      []),
  ];

  // ---------- Gộp Thư viện khai cuộc và Học cờ ----------
  const CAT = { gambit: 'Gambit', open: 'Ván mở (1.e4 e5)', semi: 'Nửa mở (1.e4, Đen không đi e5)', closed: 'Ván đóng (1.d4 d5)', indian: 'Phòng thủ Ấn Độ (1.d4, Đen không đi d5)', flank: 'Khai cuộc cánh', endgame: 'Tàn cuộc' };
  let all = null;
  function build() {
    const list = ARTICLES.slice();
    if (typeof Library !== 'undefined') {
      for (const o of Library.OPENINGS.concat(Library.ENDGAMES)) {
        const end = o.cat === 'endgame';
        list.push({
          id: 'lib:' + o.id, topic: end ? 'endgame' : 'opening', title: o.nameVi + (o.name && o.name !== o.nameVi ? ` (${o.name})` : ''),
          tags: [o.name, o.id.replace(/-/g, ' '), o.cat, end ? '' : 'opening khai cuoc'].join(' '),
          body: (end ? '' : `${CAT[o.cat] || ''}. Nước đi: ${o.moves}. `) + o.desc, see: [LIB(o.id)], lib: o.id,
        });
      }
    }
    if (typeof COURSE !== 'undefined') {
      for (const unit of COURSE) {
        const titles = (unit.lessons || []).map(l => l.title).filter(Boolean);
        list.push({
          id: 'unit:' + (unit.key || unit.title), topic: 'lesson', title: 'Phần học: ' + unit.title, tags: [unit.key, 'lesson bai hoc'].join(' '),
          body: `${unit.desc}. Gồm ${titles.length} bài: ${titles.join(', ')}.`, see: unit.key ? [U(unit.key)] : [],
        });
      }
    }
    for (const a of list) {
      a.nt = norm(a.title);
      a.tt = tokens(a.title);
      a.tg = tokens(a.tags);
      a.tb = tokens(a.body);
    }
    // IDF đơn giản: từ càng hiếm càng có trọng số
    const df = new Map();
    for (const a of list) for (const w of new Set([...a.tt, ...a.tg, ...a.tb])) df.set(w, (df.get(w) || 0) + 1);
    for (const a of list) a.n = list.length;
    all = { list, df };
    return all;
  }

  // ---------- Tìm kiếm ----------
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const STOP = new Set(('la gi cua toi minh ban nhu the nao va voi khong cach de trong mot cac nhung hay khi thi nen lam sao duoc '
    + 'co cho ve tu den hon nay do vi ma neu thuong rat cung da dang se bi nao sau truoc the what how why the a an of to is in and for do i my me can you').split(' '));
  const tokens = s => norm(s).split(/[^a-z0-9]+/).filter(w => w.length >= 2 && !STOP.has(w) || /^\d$/.test(w));

  function search(query, topic = 'any', k = 4) {
    const { list, df } = all || build();
    const q = [...new Set(tokens(query))];
    const nq = norm(query).trim();
    if (!q.length && !nq) return [];
    const idf = w => Math.log(1 + list.length / (df.get(w) || 0.5));
    const scored = [];
    for (const a of list) {
      if (topic && topic !== 'any' && a.topic !== topic) continue;
      let s = 0;
      for (const w of q) {
        const f = idf(w);
        if (a.tt.includes(w)) s += 3 * f;
        if (a.tg.includes(w)) s += 2 * f;
        const nb = a.tb.filter(x => x === w).length;
        if (nb) s += f * Math.min(3, nb) * 0.6;
      }
      // Cụm từ nguyên vẹn (ví dụ "chieu het", "tot thong") khớp tiêu đề / nội dung
      for (let i = 0; i + 1 < q.length; i++) {
        const ph = q[i] + ' ' + q[i + 1];
        if (a.nt.includes(ph)) s += 4;
        else if ((a.tb.join(' ') + ' ' + a.tg.join(' ')).includes(ph)) s += 1.5;
      }
      if (nq.length >= 4 && a.nt.includes(nq)) s += 6;
      // Bài soạn sẵn được ưu tiên nhẹ hơn mục khai cuộc tự gộp khi điểm ngang nhau
      if (s > 0) scored.push([s + (a.lib || a.id.startsWith('unit:') ? 0 : 0.5), a]);
    }
    return scored.sort((x, y) => y[0] - x[0]).slice(0, k).map(x => x[1]);
  }

  const get = id => (all || build()).list.find(a => a.id === id) || null;
  const byTopic = topic => (all || build()).list.filter(a => a.topic === topic && !a.lib && !a.id.startsWith('unit:'));
  const count = () => (all || build()).list.length;
  const topicName = id => (TOPICS.find(t => t[0] === id) || [, ''])[1];

  return { search, get, byTopic, count, TOPICS, topicName, norm };
})();
