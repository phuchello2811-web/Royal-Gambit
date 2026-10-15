// Sổ luyện lỗi (huấn luyện viên cá nhân) + Phân tích ván kiểu chess.com: sau mỗi ván, Stockfish chấm MỌI nước của cả hai bên,
// xếp loại từng nước, tính độ chính xác và biến các nước hớ / sai của bạn thành câu đố riêng để ôn lại.
//
//   • drop = số % cơ hội thắng (win%) bị mất so với nước tốt nhất, theo góc nhìn người vừa đi.
//   • Xếp loại: Tốt nhất (đúng nước của máy), Xuất sắc (< 2), Tốt (< 5), Thiếu chính xác (< 10), Sai lầm (< 20), Nước hớ (≥ 20).
//     Thiên tài (!!): nước tốt nhất / xuất sắc mà bỏ quân (để quân bị ăn, ít nhất 2 điểm), thế cờ vẫn tốt và không thí cũng chưa thắng chắc.
//     Tuyệt vời (!): nước tốt nhất mà nước tốt nhì kém hơn hẳn (≥ 15) – "nước duy nhất".
//     Bỏ lỡ: đối thủ vừa đi sai mà mình đáp bằng sai lầm / nước hớ, để tuột mất cơ hội.
//     Lý thuyết: nước còn nằm trong sách khai cuộc (openings.js). Bắt buộc: chỉ có một nước hợp lệ.
//   • Độ chính xác mỗi nước: 103.1668·e^(−0.04354·drop) − 3.1669 (công thức kiểu lichess), mỗi bên lấy trung bình.
//   • Mỗi ván lưu tối đa 3 lỗi nặng nhất của bạn. Ôn đúng thì thẻ lên hộp (1 → 3 → 7 → 21 ngày), sai thì về hộp 0 (ôn lại sau 10 phút).
// Mọi thứ chạy trên máy người chơi và lưu trong trình duyệt theo từng tài khoản.

const Coach = (() => {
  const BOX_DAYS = [0, 1, 3, 7, 21];
  const MAX_CARDS = 150, PER_GAME = 3, MAX_PLIES = 100, DEPTH = 12, LINES = 3; // độ sâu 12 + 3 biến: ổn định hơn nhiều so với độ sâu 10
  const key = () => 'rg-coach:' + (typeof Profile !== 'undefined' && Profile.signedIn() ? Profile.me().name.toLowerCase() : 'guest');
  const load = () => { try { return { cards: [], games: [], ...JSON.parse(localStorage.getItem(key())) }; } catch { return { cards: [], games: [] }; } };
  const save = s => { try { localStorage.setItem(key(), JSON.stringify(s)); } catch {} };
  const listeners = [];
  const notify = () => listeners.forEach(f => { try { f(); } catch {} });

  const wp = cp => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-1500, Math.min(1500, cp)))) - 1);
  const accOf = drop => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, drop)) - 3.1669));

  // Các loại nước (thứ tự = thứ tự trong bảng tổng kết). code: 1 ký tự để lưu gọn trong Nhật ký ván.
  const CLASSES = [
    ['brilliant', 'B', '!!', 'Thiên tài'],
    ['great', 'G', '!', 'Tuyệt vời'],
    ['best', 'S', '★', 'Tốt nhất'],
    ['excellent', 'E', '👍', 'Xuất sắc'],
    ['good', 'O', '✓', 'Nước tốt'],
    ['book', 'K', '📖', 'Lý thuyết'],
    ['inaccuracy', 'I', '?!', 'Thiếu chính xác'],
    ['mistake', 'M', '?', 'Sai lầm'],
    ['miss', 'X', '✕', 'Bỏ lỡ'],
    ['blunder', 'U', '??', 'Nước hớ'],
    ['forced', 'F', '□', 'Bắt buộc'],
  ].map(([id, code, sym, name]) => ({ id, code, sym, name }));
  const CLASS = Object.fromEntries(CLASSES.map(c => [c.id, c]));
  const BY_CODE = Object.fromEntries(CLASSES.map(c => [c.code, c]));

  // ----- Bỏ quân (để phát hiện nước Thiên tài) -----
  const VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
  // Bên tới lượt ăn quân ở ô sq bằng chuỗi đổi quân có lợi nhất (dùng quân rẻ nhất trước): được bao nhiêu điểm (≥ 0)
  function see(g, sq, depth = 0) {
    if (depth > 6) return 0;
    let cap = null;
    for (const m of g.legalMoves()) if (m.to === sq && m.captured && (!cap || VAL[m.piece[1]] < VAL[cap.piece[1]])) cap = m;
    if (!cap) return 0;
    const u = g._apply(cap);
    const v = VAL[cap.captured[1]] - see(g, sq, depth + 1);
    g._undo(u);
    return Math.max(0, v);
  }
  // Sau nước của `mover` (tới lượt đối thủ): quân (không tính Tốt, Vua) bị bỏ lại cho đối thủ ăn, trừ đi quân mình vừa ăn
  function sacrificed(g, mover, gained) {
    let lost = 0;
    for (let sq = 0; sq < 64; sq++) {
      const p = g.board[sq];
      if (!p || p[0] !== mover || p[1] === 'K' || p[1] === 'P' || !g.isAttacked(sq, opposite(mover))) continue;
      lost = Math.max(lost, see(g, sq));
    }
    return lost - gained;
  }

  // Dự phòng khi không tải được Stockfish: hàm đánh giá + tìm kiếm nông của ai.js
  function fallbackEval(g) {
    if (typeof negamax !== 'function') return null;
    const st = g.status();
    if (st === 'checkmate') return { cp: -10000, best: null };
    if (st !== 'playing') return { cp: 0, best: null };
    const uci = m => sqName(m.from) + sqName(m.to) + (m.promotion ? m.promotion.toLowerCase() : '');
    let best = null, bestCp = -Infinity, best2 = null, cp2 = -Infinity;
    for (const m of g.legalMoves()) {
      const u = g._apply(m);
      const v = -negamax(g, 1, -MATE - 1, MATE + 1, 1); // nhìn thêm một nước đáp (thấy được chiếu hết 1 nước)
      g._undo(u);
      if (v > bestCp) { best2 = best; cp2 = bestCp; bestCp = v; best = m; }
      else if (v > cp2) { cp2 = v; best2 = m; }
    }
    const clamp = v => Math.abs(v) > 50000 ? Math.sign(v) * 10000 : v;
    const out = { cp: clamp(bestCp), best: best ? uci(best) : null, lines: best ? [{ cp: clamp(bestCp), move: uci(best) }] : [] };
    if (best2) { out.cp2 = clamp(cp2); out.best2 = uci(best2); out.lines.push({ cp: out.cp2, move: out.best2 }); }
    return out;
  }

  async function evalPos(g, multipv = 1) {
    const st = g.status();
    if (st === 'checkmate') return { cp: -10000, best: null };
    if (st !== 'playing') return { cp: 0, best: null };
    let r = null;
    try { if (typeof Engine !== 'undefined' && Engine.evaluate) r = await Engine.evaluate(Engine.positionFen(g), DEPTH, multipv, multipv > 1 ? 3000 : 1500); } catch {}
    return r || fallbackEval(g);
  }

  function sanOfUci(g, uci) {
    if (!uci) return '';
    const from = sqIndex(uci.slice(0, 2)), to = sqIndex(uci.slice(2, 4)), promo = uci[4] ? uci[4].toUpperCase() : undefined;
    const m = g.legalMoves().find(x => x.from === from && x.to === to && (!promo || x.promotion === promo));
    if (!m || !g.move({ from: m.from, to: m.to, promotion: m.promotion || undefined })) return '';
    const san = g.history[g.history.length - 1].san;
    g.undo();
    return san;
  }

  // Xếp loại một nước. prev = dòng của nước trước đó (của đối thủ) hoặc null.
  function classify({ legalCount, isBest, inBook, drop, before, after, cp2, sac, prev }) {
    if (legalCount === 1) return 'forced';
    if (inBook) return 'book';
    let cls = isBest ? 'best' : drop < 2 ? 'excellent' : drop < 5 ? 'good' : drop < 10 ? 'inaccuracy' : drop < 20 ? 'mistake' : 'blunder';
    // Thiên tài: bỏ quân mà thế cờ vẫn tốt; không tính nếu không thí cũng đã thắng tuyệt đối (nước tốt nhì vẫn thắng đậm)
    if ((cls === 'best' || cls === 'excellent') && sac >= 2 && wp(after) >= 45 && !(cp2 != null && wp(cp2) >= 97)) return 'brilliant';
    if (cls === 'best' && cp2 != null && wp(before) - wp(cp2) >= 15 && wp(cp2) < 80 && wp(after) >= 30) return 'great';
    if ((cls === 'mistake' || cls === 'blunder') && prev && prev.drop >= 10 && wp(before) >= 60) return 'miss';
    return cls;
  }

  let running = null;

  // Phân tích ván. moves: [{ from, to, promotion }], human: 'w' | 'b' | null (2 người: chỉ phân tích, không lưu thẻ ôn).
  // Trả về báo cáo (hoặc null): accuracy (của bạn), số nước hớ / sai / thiếu chính xác của bạn, thẻ đã thêm,
  // và `review` = { cls: mã loại từng nước, evals: điểm sau mỗi nước theo góc Trắng, best: nước nên đi, acc: { w, b }, counts }.
  async function analyse({ startFen, moves, human, label, onProgress }) {
    const token = running = {};
    const g = new Chess(startFen);
    const n = Math.min(moves.length, MAX_PLIES);
    const evals = [];
    for (let i = 0; i <= n; i++) {
      if (running !== token) return null;
      evals.push(await evalPos(g, i < n ? LINES : 1)); // nhiều biến: chấm nhất quán + nhận ra nước "Tuyệt vời"
      if (onProgress) onProgress(n ? i / n : 1);
      if (i < n && !g.move(moves[i])) break;
    }
    if (running !== token) return null;
    // Đi lại để lấy FEN / SAN của từng nước rồi xếp loại
    const g2 = new Chess(startFen);
    const fromStart = g2.fen().split(' ').slice(0, 4).join(' ') === START_FEN.split(' ').slice(0, 4).join(' ');
    const rows = [], sans = [], whiteCp = [];
    const white = (cp, side) => (side === 'w' ? cp : -cp);
    if (evals[0]) whiteCp.push(white(evals[0].cp, g2.turn));
    for (let i = 0; i < evals.length - 1; i++) {
      const side = g2.turn;
      const fen = Engine.positionFen(g2);
      const e0 = evals[i], e1 = evals[i + 1];
      const legalCount = g2.legalMoves().length;
      const bestSan = e0 && e0.best ? sanOfUci(g2, e0.best) : '';
      const mv = moves[i];
      const uci = sqName(mv.from) + sqName(mv.to) + (mv.promotion ? String(mv.promotion).toLowerCase() : '');
      if (!g2.move(mv)) break;
      const last = g2.history[g2.history.length - 1];
      const san = last.san;
      sans.push(san);
      const before = e0 ? e0.cp : 0; // theo góc nhìn người vừa đi
      let after = e1 ? -e1.cp : before;
      // Nước đã đi nằm trong các biến tốt nhất của thế trước: lấy điểm của biến đó (cùng một lượt tìm với `before`,
      // nên không bị lệch do Stockfish chấm hai thế cờ ở hai lượt khác nhau). Ngoài các biến đó thì không thể tốt hơn biến cuối.
      const lines = (e0 && e0.lines) || [];
      const k = lines.findIndex(l => l.move === uci);
      if (k > 0) after = lines[k].cp;
      else if (k < 0 && lines.length >= LINES) after = Math.min(after, lines[lines.length - 1].cp);
      whiteCp.push(white(after, side));
      const isBest = !!(e0 && e0.best && e0.best === uci) || k === 0;
      const drop = !e0 || !e1 || isBest ? 0 : Math.max(0, wp(before) - wp(after));
      const inBook = fromStart && typeof OPENING_BOOK !== 'undefined' && OPENING_BOOK.inBook && OPENING_BOOK.inBook(sans);
      const sac = drop < 2 ? sacrificed(g2, side, last.move.captured ? VAL[last.move.captured[1]] : 0) : 0;
      const prev = rows.length && rows[rows.length - 1].side !== side ? rows[rows.length - 1] : null;
      const cls = classify({ legalCount, isBest, inBook, drop, before, after, cp2: e0 ? e0.cp2 : null, sac, prev });
      rows.push({ ply: i, no: Math.floor(i / 2) + 1, side, fen, san, bestSan, bestUci: e0 && e0.best, before, after, drop, cls, acc: accOf(drop) });
    }
    if (!rows.length) return null;

    const accSide = c => { const r = rows.filter(x => x.side === c && x.cls !== 'forced'); return r.length ? Math.round(r.reduce((a, x) => a + x.acc, 0) / r.length) : null; };
    const counts = { w: {}, b: {} };
    for (const r of rows) counts[r.side][r.cls] = (counts[r.side][r.cls] || 0) + 1;
    const mine = human ? rows.filter(r => r.side === human) : [];
    const count = (...ks) => mine.filter(r => ks.includes(r.cls)).length;
    const report = {
      accuracy: human ? accSide(human) : null, moves: mine.length,
      blunder: count('blunder'), mistake: count('mistake', 'miss'), inaccuracy: count('inaccuracy'),
      added: 0, worst: null, rows,
      review: {
        cls: rows.map(r => CLASS[r.cls].code).join(''),
        evals: whiteCp.map(v => Math.round(v)),
        best: rows.map(r => (r.cls === 'book' || r.cls === 'forced' || !r.bestSan || r.bestSan.replace(/[+#]/g, '') === r.san.replace(/[+#]/g, '') ? '' : r.bestSan)),
        acc: { w: accSide('w'), b: accSide('b') }, counts,
      },
    };
    if (!human) return report; // ván 2 người: chỉ xem phân tích, không lưu thẻ ôn

    // Lưu thẻ ôn tập: những nước hớ / sai / bỏ lỡ mà nước đúng khác nước đã đi
    const s = load();
    const bad = mine.filter(r => ['blunder', 'mistake', 'miss'].includes(r.cls) && r.bestSan && r.bestSan.replace(/[+#]/g, '') !== r.san.replace(/[+#]/g, ''))
      .sort((a, b) => b.drop - a.drop).slice(0, PER_GAME);
    for (const r of bad) {
      if (s.cards.some(c => c.fen === r.fen)) continue;
      s.cards.push({
        id: 'mk' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        fen: r.fen, best: r.bestSan, bestUci: r.bestUci, played: r.san, no: r.no, side: r.side,
        bestCp: r.before, drop: Math.round(r.drop), kind: r.cls === 'blunder' ? 'blunder' : 'mistake', label: label || 'Ván cờ',
        at: Date.now(), box: 0, due: Date.now(), reviews: 0,
      });
      report.added++;
    }
    report.worst = bad[0] ? { no: bad[0].no, san: bad[0].san, best: bad[0].bestSan, side: bad[0].side } : null;
    if (s.cards.length > MAX_CARDS) s.cards = s.cards.sort((a, b) => b.at - a.at).slice(0, MAX_CARDS);
    s.games.unshift({ at: Date.now(), acc: report.accuracy, label: label || '', blunder: report.blunder, mistake: report.mistake });
    s.games = s.games.slice(0, 50);
    save(s);
    notify();
    return report;
  }

  const cancel = () => { running = null; };
  const cards = () => load().cards;
  const due = (t = Date.now()) => load().cards.filter(c => c.box < BOX_DAYS.length && c.due <= t).sort((a, b) => a.due - b.due);
  const mastered = () => load().cards.filter(c => c.box >= BOX_DAYS.length).length;

  // Kết quả một lần ôn: clean = giải đúng ngay lần đầu, không gợi ý
  function review(id, clean) {
    const s = load();
    const c = s.cards.find(x => x.id === id);
    if (!c) return null;
    c.reviews++;
    if (clean) {
      c.box = Math.min(BOX_DAYS.length, c.box + 1);
      c.due = Date.now() + (BOX_DAYS[c.box] || 60) * 86400000;
    } else {
      c.box = 0;
      c.due = Date.now() + 10 * 60000;
    }
    save(s);
    notify();
    return c;
  }

  function remove(id) {
    const s = load();
    s.cards = s.cards.filter(c => c.id !== id);
    save(s);
    notify();
  }

  // Độ chính xác trung bình của n ván gần nhất
  function averageAccuracy(n = 10) {
    const g = load().games.slice(0, n);
    return g.length ? Math.round(g.reduce((a, x) => a + x.acc, 0) / g.length) : null;
  }

  // Thẻ ôn tập → câu đố cho puzzles.js
  function toPuzzle(c) {
    return {
      id: c.id, mistake: c, fen: c.fen, line: [c.best],
      title: `Nước ${c.no}: bạn đã đi ${c.played}`,
      theme: 'Từ ván của bạn', level: c.kind === 'blunder' ? 'Khó' : 'Trung bình',
      hint: `Trong ván "${c.label}", bạn đi ${c.played} và mất khoảng ${c.drop}% cơ hội thắng. Có nước tốt hơn hẳn: hãy tìm nó.`,
    };
  }

  // Nước khác nước của máy nhưng tốt ngang ngửa thì vẫn tính đúng (sụt không quá 4% cơ hội thắng)
  async function goodEnough(card, gAfter) {
    const e = await evalPos(gAfter);
    if (!e) return false;
    return wp(card.bestCp) - wp(-e.cp) <= 4;
  }

  return { analyse, cancel, cards, due, mastered, review, remove, averageAccuracy, toPuzzle, goodEnough, onChange: f => listeners.push(f), BOX_DAYS, CLASSES, CLASS, BY_CODE };
})();
