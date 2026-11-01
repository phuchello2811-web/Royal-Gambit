// Thư viện kiến thức cờ vua: bài viết ngắn theo chủ đề để người chơi tra cứu và để Trợ lý AI (Claude) tìm đọc
// trước khi giải thích (công cụ search_knowledge trong assistant.js).
//   • ARTICLES: bài viết soạn sẵn (khai cuộc, chiến thuật, mẫu chiếu hết, chiến lược, tàn cuộc, luật, luyện tập).
//   • Tự gộp thêm 100 khai cuộc + thế tàn cuộc trong Thư viện (library.js) và 20 phần Học cờ (lessons.js),
//     nên thêm khai cuộc / bài học mới là thư viện kiến thức cũng có ngay.
// Tìm kiếm chạy trên máy: bỏ dấu tiếng Việt, chấm điểm theo từ khoá (tiêu đề > thẻ > nội dung), có cả từ tiếng Anh trong thẻ.
// `see`: gợi ý mở trong web: { kind: 'unit', key } phần Học cờ · { kind: 'puzzle', group: tactics|mates|end } · { kind: 'lib', id }.
// Thêm bài: thêm một dòng A(...) vào đúng nhóm.

const Knowledge = (() => {
  const TOPICS = [
    ['opening', 'Khai cuộc'], ['tactics', 'Chiến thuật'], ['mates', 'Mẫu chiếu hết'], ['strategy', 'Chiến lược'],
    ['endgame', 'Tàn cuộc'], ['rules', 'Luật cờ'], ['training', 'Luyện tập'], ['lesson', 'Bài học trong web'],
  ];
  const A = (id, topic, title, tags, body, see = []) => ({ id, topic, title, tags, body, see });
  const U = key => ({ kind: 'unit', key });
  const PZ = group => ({ kind: 'puzzle', group });
  const LIB = id => ({ kind: 'lib', id });

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
      [U('pawnend'), LIB('kp-k')]),
    A('end-square', 'endgame', 'Quy tắc ô vuông', 'rule of the square passed pawn race quy tac o vuong',
      'Tưởng tượng một hình vuông có cạnh từ Tốt thông tới ô phong cấp. Nếu Vua đối phương bước vào được hình vuông đó (tính cả lượt đi), nó đuổi kịp Tốt; nếu không, Tốt phong cấp. Tốt còn ở hàng xuất phát thì tính như đã ở hàng kế tiếp, vì nó có thể đi hai ô.',
      [U('pawnend')]),
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
      [U('endgame')]),
    A('end-opposite-bishops', 'endgame', 'Tàn cuộc Tượng khác màu', 'opposite colored bishops drawish tuong khac mau',
      'Mỗi bên chỉ còn một Tượng chạy khác màu: rất dễ hoà, kể cả khi kém một hai Tốt, vì bên phòng thủ đặt Vua hoặc Tượng chặn trên các ô Tượng đối phương không với tới. Còn thêm quân khác (Hậu, Xe) thì ngược lại: bên tấn công mạnh hơn vì Tượng phòng thủ không che được các ô màu kia.',
      [U('endgame')]),
    A('end-stalemate', 'endgame', 'Pat: tránh khi thắng, tìm khi thua', 'stalemate draw trap pat',
      'Pat là khi bên đến lượt không bị chiếu nhưng không còn nước đi hợp lệ nào: ván hoà. Bên đang thắng (nhất là với Hậu) phải luôn kiểm tra Vua đối phương còn ô đi hay không. Bên đang thua tìm cách tạo pat: đưa Vua vào góc, thí các quân còn lại.',
      [U('rules'), U('endgame')]),
    A('end-queen-pawn7', 'endgame', 'Hậu đấu Tốt hàng 7', 'queen vs pawn seventh rank draw win',
      'Hậu thắng Tốt hàng 7 có Vua hỗ trợ nếu là Tốt cột b, d, e hoặc g: chiếu liên tục để ép Vua đứng trước Tốt, rồi đưa Vua mình lại gần. Tốt cột c, f (hoặc a, h) thường hoà vì bên phòng thủ có thủ thuật pat, trừ khi Vua bên mạnh đã ở gần.',
      [U('endgame')]),
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
      'Học cờ: 20 phần từ cơ bản tới nâng cao, có bài kiểm tra "nhảy cóc" để bỏ qua phần đã biết. Câu đố: luyện chiến thuật theo chủ đề và câu đố mỗi ngày. Thư viện: 100 khai cuộc và các thế tàn cuộc, xem từng nước và "Tập với máy". Nhật ký: lưu mọi ván, phân tích chấm từng nước. Sổ luyện lỗi: nước sai của bạn thành câu đố ôn lại theo lịch 1-3-7-21 ngày. Trợ lý AI: đọc các ván đã chấm để tìm điểm yếu và gợi ý lộ trình.',
      [{ kind: 'review' }]),
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
