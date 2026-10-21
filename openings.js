// Bộ khai cuộc để nhận diện tên khai cuộc trong lúc chơi (hiện dưới ô trạng thái).
// Mỗi dòng: [tên tiếng Việt, tên quốc tế, chuỗi nước SAN cách nhau bằng dấu cách].
// Nhận diện = dòng dài nhất trùng với các nước đầu của ván. Thêm dòng mới thì cứ thêm vào cuối, không cần sắp xếp.

const OPENING_BOOK = (() => {
  const L = [
    ['Khai cuộc Tốt Vua', "King's Pawn", 'e4'],
    ['Khai cuộc Tốt Hậu', "Queen's Pawn", 'd4'],
    ['Khai cuộc Anh', 'English Opening', 'c4'],
    ['Khai cuộc Réti', 'Réti Opening', 'Nf3'],
    ['Khai cuộc Bird', 'Bird Opening', 'f4'],
    ['Khai cuộc Larsen', 'Larsen Opening', 'b3'],
    ['Khai cuộc Grob', 'Grob Opening', 'g4'],
    ['Khai cuộc Sokolsky', 'Polish Opening', 'b4'],
    ['Fianchetto Vua', "King's Fianchetto", 'g3'],
    ['Ván mở', 'Open Game', 'e4 e5'],
    ['Gambit Vua', "King's Gambit", 'e4 e5 f4'],
    ['Gambit Vua nhận', "King's Gambit Accepted", 'e4 e5 f4 exf4'],
    ['Gambit Vua từ chối', "King's Gambit Declined", 'e4 e5 f4 Bc5'],
    ['Khai cuộc Vienna', 'Vienna Game', 'e4 e5 Nc3'],
    ['Khai cuộc Tượng', "Bishop's Opening", 'e4 e5 Bc4'],
    ['Khai cuộc Trung tâm', 'Center Game', 'e4 e5 d4 exd4 Qxd4'],
    ['Gambit Đan Mạch', 'Danish Gambit', 'e4 e5 d4 exd4 c3'],
    ['Khai cuộc Mã Vua', "King's Knight Opening", 'e4 e5 Nf3'],
    ['Phòng thủ Philidor', 'Philidor Defense', 'e4 e5 Nf3 d6'],
    ['Phòng thủ Petrov', 'Petrov Defense', 'e4 e5 Nf3 Nf6'],
    ['Gambit Latvia', 'Latvian Gambit', 'e4 e5 Nf3 f5'],
    ['Phòng thủ Damiano', 'Damiano Defense', 'e4 e5 Nf3 f6'],
    ['Khai cuộc Mã Vua (Nc6)', "King's Knight Opening: Normal", 'e4 e5 Nf3 Nc6'],
    ['Khai cuộc Ý', 'Italian Game', 'e4 e5 Nf3 Nc6 Bc4'],
    ['Giuoco Piano', 'Giuoco Piano', 'e4 e5 Nf3 Nc6 Bc4 Bc5'],
    ['Giuoco Pianissimo', 'Giuoco Pianissimo', 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3'],
    ['Giuoco Piano: Biến chính', 'Giuoco Piano: Main Line', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3'],
    ['Gambit Evans', 'Evans Gambit', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4'],
    ['Phòng thủ Hai Mã', 'Two Knights Defense', 'e4 e5 Nf3 Nc6 Bc4 Nf6'],
    ['Hai Mã: Tấn công Fried Liver', 'Two Knights: Fried Liver Attack', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7'],
    ['Hai Mã: Biến Ng5', 'Two Knights: Knight Attack', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5'],
    ['Phòng thủ Hungary', 'Hungarian Defense', 'e4 e5 Nf3 Nc6 Bc4 Be7'],
    ['Khai cuộc Tây Ban Nha', 'Ruy Lopez', 'e4 e5 Nf3 Nc6 Bb5'],
    ['Tây Ban Nha: Phòng thủ Morphy', 'Ruy Lopez: Morphy Defense', 'e4 e5 Nf3 Nc6 Bb5 a6'],
    ['Tây Ban Nha: Biến đổi quân', 'Ruy Lopez: Exchange Variation', 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6'],
    ['Tây Ban Nha: Biến đóng', 'Ruy Lopez: Closed', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7'],
    ['Tây Ban Nha: Biến mở', 'Ruy Lopez: Open', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4'],
    ['Tây Ban Nha: Phòng thủ Berlin', 'Ruy Lopez: Berlin Defense', 'e4 e5 Nf3 Nc6 Bb5 Nf6'],
    ['Tây Ban Nha: Phòng thủ Cổ điển', 'Ruy Lopez: Classical', 'e4 e5 Nf3 Nc6 Bb5 Bc5'],
    ['Khai cuộc Scotland', 'Scotch Game', 'e4 e5 Nf3 Nc6 d4'],
    ['Scotland: Biến chính', 'Scotch Game: Main Line', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4'],
    ['Gambit Scotland', 'Scotch Gambit', 'e4 e5 Nf3 Nc6 d4 exd4 Bc4'],
    ['Khai cuộc Ponziani', 'Ponziani Opening', 'e4 e5 Nf3 Nc6 c3'],
    ['Khai cuộc Bốn Mã', 'Four Knights Game', 'e4 e5 Nf3 Nc6 Nc3 Nf6'],
    ['Khai cuộc Ba Mã', 'Three Knights Opening', 'e4 e5 Nf3 Nc6 Nc3'],
    ['Phòng thủ Sicily', 'Sicilian Defense', 'e4 c5'],
    ['Sicily: Biến đóng', 'Sicilian: Closed', 'e4 c5 Nc3'],
    ['Sicily: Alapin', 'Sicilian: Alapin', 'e4 c5 c3'],
    ['Gambit Smith-Morra', 'Smith-Morra Gambit', 'e4 c5 d4 cxd4 c3'],
    ['Sicily: Grand Prix', 'Sicilian: Grand Prix Attack', 'e4 c5 Nc3 Nc6 f4'],
    ['Sicily mở', 'Open Sicilian', 'e4 c5 Nf3 d6 d4'],
    ['Sicily: Najdorf', 'Sicilian: Najdorf', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'],
    ['Sicily: Rồng', 'Sicilian: Dragon', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6'],
    ['Sicily: Cổ điển', 'Sicilian: Classical', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6'],
    ['Sicily: Scheveningen', 'Sicilian: Scheveningen', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6'],
    ['Sicily: Rossolimo', 'Sicilian: Rossolimo', 'e4 c5 Nf3 Nc6 Bb5'],
    ['Sicily: Sveshnikov', 'Sicilian: Sveshnikov', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5'],
    ['Sicily: Rồng gia tốc', 'Sicilian: Accelerated Dragon', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6'],
    ['Sicily: Taimanov', 'Sicilian: Taimanov', 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6'],
    ['Sicily: Kan', 'Sicilian: Kan', 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6'],
    ['Phòng thủ Pháp', 'French Defense', 'e4 e6'],
    ['Pháp: Biến tiến', 'French: Advance', 'e4 e6 d4 d5 e5'],
    ['Pháp: Biến đổi', 'French: Exchange', 'e4 e6 d4 d5 exd5'],
    ['Pháp: Tarrasch', 'French: Tarrasch', 'e4 e6 d4 d5 Nd2'],
    ['Pháp: Winawer', 'French: Winawer', 'e4 e6 d4 d5 Nc3 Bb4'],
    ['Pháp: Cổ điển', 'French: Classical', 'e4 e6 d4 d5 Nc3 Nf6'],
    ['Phòng thủ Caro-Kann', 'Caro-Kann Defense', 'e4 c6'],
    ['Caro-Kann: Biến tiến', 'Caro-Kann: Advance', 'e4 c6 d4 d5 e5'],
    ['Caro-Kann: Biến đổi', 'Caro-Kann: Exchange', 'e4 c6 d4 d5 exd5 cxd5'],
    ['Caro-Kann: Cổ điển', 'Caro-Kann: Classical', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5'],
    ['Phòng thủ Scandinavia', 'Scandinavian Defense', 'e4 d5'],
    ['Scandinavia: Biến Hậu', 'Scandinavian: Main Line', 'e4 d5 exd5 Qxd5'],
    ['Phòng thủ Alekhine', 'Alekhine Defense', 'e4 Nf6'],
    ['Phòng thủ Pirc', 'Pirc Defense', 'e4 d6 d4 Nf6 Nc3 g6'],
    ['Phòng thủ Hiện đại', 'Modern Defense', 'e4 g6'],
    ['Phòng thủ Owen', 'Owen Defense', 'e4 b6'],
    ['Phòng thủ Nimzowitsch', 'Nimzowitsch Defense', 'e4 Nc6'],
    ['Gambit Hậu', "Queen's Gambit", 'd4 d5 c4'],
    ['Gambit Hậu nhận', "Queen's Gambit Accepted", 'd4 d5 c4 dxc4'],
    ['Gambit Hậu từ chối', "Queen's Gambit Declined", 'd4 d5 c4 e6'],
    ['Phòng thủ Slav', 'Slav Defense', 'd4 d5 c4 c6'],
    ['Phòng thủ Bán Slav', 'Semi-Slav Defense', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6'],
    ['Phòng thủ Tarrasch', 'Tarrasch Defense', 'd4 d5 c4 e6 Nc3 c5'],
    ['Phản gambit Albin', 'Albin Countergambit', 'd4 d5 c4 e5'],
    ['Phòng thủ Chigorin', 'Chigorin Defense', 'd4 d5 c4 Nc6'],
    ['Hệ thống London', 'London System', 'd4 d5 Bf4'],
    ['Hệ thống London', 'London System', 'd4 Nf6 Bf4'],
    ['Hệ thống London', 'London System', 'd4 d5 Nf3 Nf6 Bf4'],
    ['Hệ thống Colle', 'Colle System', 'd4 d5 Nf3 Nf6 e3'],
    ['Tấn công Trompowsky', 'Trompowsky Attack', 'd4 Nf6 Bg5'],
    ['Phòng thủ Ấn Độ', 'Indian Defense', 'd4 Nf6'],
    ['Phòng thủ Ấn Độ Vua', "King's Indian Defense", 'd4 Nf6 c4 g6'],
    ['Ấn Độ Vua: Biến cổ điển', "King's Indian: Classical", 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5'],
    ['Phòng thủ Grünfeld', 'Grünfeld Defense', 'd4 Nf6 c4 g6 Nc3 d5'],
    ['Phòng thủ Nimzo-Ấn', 'Nimzo-Indian Defense', 'd4 Nf6 c4 e6 Nc3 Bb4'],
    ['Phòng thủ Ấn Độ Hậu', "Queen's Indian Defense", 'd4 Nf6 c4 e6 Nf3 b6'],
    ['Khai cuộc Catalan', 'Catalan Opening', 'd4 Nf6 c4 e6 g3'],
    ['Phòng thủ Bogo-Ấn', 'Bogo-Indian Defense', 'd4 Nf6 c4 e6 Nf3 Bb4+'],
    ['Phòng thủ Benoni', 'Benoni Defense', 'd4 Nf6 c4 c5 d5'],
    ['Gambit Benko', 'Benko Gambit', 'd4 Nf6 c4 c5 d5 b5'],
    ['Gambit Budapest', 'Budapest Gambit', 'd4 Nf6 c4 e5'],
    ['Phòng thủ Hà Lan', 'Dutch Defense', 'd4 f5'],
    ['Hà Lan: Bức tường đá', 'Dutch: Stonewall', 'd4 f5 c4 Nf6 g3 e6 Bg2 d5'],
    ['Hà Lan: Leningrad', 'Dutch: Leningrad', 'd4 f5 c4 Nf6 g3 g6'],
    ['Gambit Staunton', 'Staunton Gambit', 'd4 f5 e4'],
    ['Anh: Sicily đảo ngược', 'English: Reversed Sicilian', 'c4 e5'],
    ['Anh: Đối xứng', 'English: Symmetrical', 'c4 c5'],
    ['Anh: Ấn Độ Anh', 'English: Anglo-Indian', 'c4 Nf6'],
    ['Réti: Gambit', 'Réti Gambit', 'Nf3 d5 c4'],
    ['Tấn công Ấn Độ Vua', "King's Indian Attack", 'Nf3 d5 g3'],
    ['Gambit From', "From's Gambit", 'f4 e5'],
  ];
  const book = L.map(([vi, en, line]) => ({ vi, en, moves: line.split(' ') }));
  // Gộp luôn các khai cuộc trong Thư viện (library.js) để tên hiện trong ván khớp với Thư viện
  if (typeof OPENINGS !== 'undefined') {
    for (const o of OPENINGS) {
      book.push({ vi: o.nameVi, en: o.name, moves: o.moves.split(/\s+/).map(t => t.replace(/^\d+\.(\.\.)?/, '')).filter(Boolean) });
    }
  }
  const clean = s => String(s || '').replace(/[+#?!]/g, '');

  // sans: mảng SAN của ván (từ đầu). Trả về { vi, en, ply } hoặc null.
  function name(sans) {
    const ms = sans.map(clean);
    let best = null;
    for (const o of book) {
      if (o.moves.length > ms.length || (best && o.moves.length <= best.ply)) continue;
      if (o.moves.every((m, i) => clean(m) === ms[i])) best = { vi: o.vi, en: o.en, ply: o.moves.length };
    }
    return best;
  }
  return { name, size: book.length, pairs: () => book.map(o => [o.vi, o.en]) };
})();
