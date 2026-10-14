// Sổ luyện lỗi (huấn luyện viên cá nhân): sau mỗi ván với máy / Online, Stockfish chấm từng nước của bạn,
// tính độ chính xác và biến các nước hớ / sai thành câu đố riêng để ôn lại theo kiểu lặp lại ngắt quãng.
//
//   • Mức sụt cơ hội thắng (win%) của mỗi nước: ≥ 30 = hớ (blunder), ≥ 20 = sai (mistake), ≥ 10 = thiếu chính xác.
//   • Độ chính xác mỗi nước: 103.1668·e^(−0.04354·sụt) − 3.1669 (công thức kiểu lichess), cả ván lấy trung bình.
//   • Mỗi ván lưu tối đa 3 lỗi nặng nhất. Ôn đúng thì thẻ lên hộp (1 → 3 → 7 → 21 ngày), sai thì về hộp 0 (ôn lại sau 10 phút).
// Mọi thứ chạy trên máy người chơi và lưu trong trình duyệt theo từng tài khoản.

const Coach = (() => {
  const BOX_DAYS = [0, 1, 3, 7, 21];
  const MAX_CARDS = 150, PER_GAME = 3, MAX_PLIES = 100, DEPTH = 10;
  const key = () => 'rg-coach:' + (typeof Profile !== 'undefined' && Profile.signedIn() ? Profile.me().name.toLowerCase() : 'guest');
  const load = () => { try { return { cards: [], games: [], ...JSON.parse(localStorage.getItem(key())) }; } catch { return { cards: [], games: [] }; } };
  const save = s => { try { localStorage.setItem(key(), JSON.stringify(s)); } catch {} };
  const listeners = [];
  const notify = () => listeners.forEach(f => { try { f(); } catch {} });

  const wp = cp => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-1500, Math.min(1500, cp)))) - 1);
  const accOf = drop => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, drop)) - 3.1669));
  const kindOf = drop => drop >= 30 ? 'blunder' : drop >= 20 ? 'mistake' : drop >= 10 ? 'inaccuracy' : 'good';

  // Dự phòng khi không tải được Stockfish: hàm đánh giá + tìm kiếm nông của ai.js
  function fallbackEval(g) {
    if (typeof negamax !== 'function') return null;
    const st = g.status();
    if (st === 'checkmate') return { cp: -10000, best: null };
    if (st !== 'playing') return { cp: 0, best: null };
    let best = null, bestCp = -Infinity;
    for (const m of g.legalMoves()) {
      const u = g._apply(m);
      const v = -negamax(g, 1, -MATE - 1, MATE + 1, 1); // nhìn thêm một nước đáp (thấy được chiếu hết 1 nước)
      g._undo(u);
      if (v > bestCp) { bestCp = v; best = m; }
    }
    if (Math.abs(bestCp) > 50000) bestCp = Math.sign(bestCp) * 10000;
    return { cp: bestCp, best: best ? sqName(best.from) + sqName(best.to) + (best.promotion ? best.promotion.toLowerCase() : '') : null };
  }

  async function evalPos(g) {
    const st = g.status();
    if (st === 'checkmate') return { cp: -10000, best: null };
    if (st !== 'playing') return { cp: 0, best: null };
    let r = null;
    try { if (typeof Engine !== 'undefined' && Engine.evaluate) r = await Engine.evaluate(Engine.positionFen(g), DEPTH); } catch {}
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

  let running = null;

  // Phân tích ván vừa xong. moves: [{ from, to, promotion }], human: 'w' | 'b'. Trả về báo cáo (hoặc null).
  async function analyse({ startFen, moves, human, label, onProgress }) {
    const token = running = {};
    const g = new Chess(startFen);
    const n = Math.min(moves.length, MAX_PLIES);
    const evals = [];
    for (let i = 0; i <= n; i++) {
      if (running !== token) return null;
      evals.push(await evalPos(g));
      if (onProgress) onProgress(i / n);
      if (i < n && !g.move(moves[i])) break;
    }
    if (running !== token) return null;
    // Đi lại để lấy FEN / SAN của từng nước
    const g2 = new Chess(startFen);
    const rows = [];
    for (let i = 0; i < evals.length - 1; i++) {
      const side = g2.turn;
      const fen = Engine.positionFen(g2);
      const e0 = evals[i], e1 = evals[i + 1];
      const bestSan = e0 && e0.best ? sanOfUci(g2, e0.best) : '';
      if (!g2.move(moves[i])) break;
      const san = g2.history[g2.history.length - 1].san;
      if (side !== human || !e0 || !e1) continue;
      const before = e0.cp, after = -e1.cp;               // theo góc nhìn người vừa đi
      const drop = Math.max(0, wp(before) - wp(after));
      rows.push({ ply: i, no: Math.floor(i / 2) + 1, side, fen, san, bestSan, bestUci: e0.best, before, after, drop, kind: kindOf(drop), acc: accOf(drop) });
    }
    if (!rows.length) return null;
    const accuracy = Math.round(rows.reduce((a, r) => a + r.acc, 0) / rows.length);
    const count = k => rows.filter(r => r.kind === k).length;
    const report = { accuracy, moves: rows.length, blunder: count('blunder'), mistake: count('mistake'), inaccuracy: count('inaccuracy'), added: 0, worst: null };

    // Lưu thẻ ôn tập: những nước hớ / sai mà nước đúng khác nước đã đi
    const s = load();
    const bad = rows.filter(r => (r.kind === 'blunder' || r.kind === 'mistake') && r.bestSan && r.bestSan.replace(/[+#]/g, '') !== r.san.replace(/[+#]/g, ''))
      .sort((a, b) => b.drop - a.drop).slice(0, PER_GAME);
    for (const r of bad) {
      if (s.cards.some(c => c.fen === r.fen)) continue;
      s.cards.push({
        id: 'mk' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        fen: r.fen, best: r.bestSan, bestUci: r.bestUci, played: r.san, no: r.no, side: r.side,
        bestCp: r.before, drop: Math.round(r.drop), kind: r.kind, label: label || 'Ván cờ',
        at: Date.now(), box: 0, due: Date.now(), reviews: 0,
      });
      report.added++;
    }
    report.worst = bad[0] ? { no: bad[0].no, san: bad[0].san, best: bad[0].bestSan, side: bad[0].side } : null;
    if (s.cards.length > MAX_CARDS) s.cards = s.cards.sort((a, b) => b.at - a.at).slice(0, MAX_CARDS);
    s.games.unshift({ at: Date.now(), acc: accuracy, label: label || '', blunder: report.blunder, mistake: report.mistake });
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

  return { analyse, cancel, cards, due, mastered, review, remove, averageAccuracy, toPuzzle, goodEnough, onChange: f => listeners.push(f), BOX_DAYS };
})();
