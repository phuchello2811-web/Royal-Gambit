// Stockfish engine wrapper — gợi ý & máy chơi mạnh (depth cao).
// Fallback về ai.js (negamax) nếu Worker/Stockfish không tải được.

const Engine = (() => {
  let worker = null;
  let ready = false;
  let loading = null;
  let seq = 0;
  let waiters = [];
  let onReady = null; // báo load() xong ngay khi Stockfish trả lời "readyok"

  function positionFen(game) {
    if (typeof game.fen === 'function') return game.fen();
    // Dựng FEN từ instance Chess (bản chess.js cũ chưa có fen())
    let rows = [];
    for (let r = 0; r < 8; r++) {
      let empty = 0, row = '';
      for (let c = 0; c < 8; c++) {
        const p = game.board[r * 8 + c];
        if (!p) { empty++; continue; }
        if (empty) { row += empty; empty = 0; }
        const ch = p[1];
        row += p[0] === 'w' ? ch : ch.toLowerCase();
      }
      if (empty) row += empty;
      rows.push(row);
    }
    const castle = game.castling || {};
    let cast = (castle.wK ? 'K' : '') + (castle.wQ ? 'Q' : '') + (castle.bK ? 'k' : '') + (castle.bQ ? 'q' : '');
    if (!cast) cast = '-';
    const ep = game.ep >= 0 && typeof sqName === 'function' ? sqName(game.ep) : '-';
    return `${rows.join('/')} ${game.turn} ${cast} ${ep} ${game.halfmove || 0} ${game.fullmove || 1}`;
  }

  function parseUci(uci) {
    if (!uci || uci === '(none)' || uci.length < 4) return null;
    const from = typeof sqIndex === 'function' ? sqIndex(uci.slice(0, 2)) : -1;
    const to = typeof sqIndex === 'function' ? sqIndex(uci.slice(2, 4)) : -1;
    if (from < 0 || to < 0) return null;
    const promo = uci.length > 4 ? uci[4].toUpperCase() : undefined;
    return { from, to, promotion: promo };
  }

  function matchLegal(game, uciMove) {
    if (!uciMove) return null;
    const legal = game.legalMoves();
    for (const m of legal) {
      if (m.from === uciMove.from && m.to === uciMove.to) {
        if (uciMove.promotion) {
          if (m.promotion === uciMove.promotion) return m;
        } else if (!m.promotion) return m;
      }
    }
    // promotion: lấy quân mạnh nhất nếu thiếu
    if (uciMove.promotion) {
      for (const m of legal) {
        if (m.from === uciMove.from && m.to === uciMove.to && m.promotion) return m;
      }
    }
    return null;
  }

  let lastScore = null; // điểm của lượt tìm kiếm hiện tại: { cp } hoặc { mate } (theo bên tới lượt)
  let lines = [];       // MultiPV: lines[k] = { cp | mate, move } của biến thứ k+1

  function onMessage(e) {
    const line = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
    if (!line) return;
    if (line === 'uciok' || line.startsWith('readyok')) ready = true;
    if (line.startsWith('readyok') && onReady) { onReady(true); onReady = null; }
    if (line.startsWith('info') && line.includes(' score ') && !line.includes('bound')) {
      const m = /score (cp|mate) (-?\d+)/.exec(line);
      if (m) {
        const sc = m[1] === 'cp' ? { cp: Number(m[2]) } : { mate: Number(m[2]) };
        const k = Number((/ multipv (\d+)/.exec(line) || [0, 1])[1]) - 1;
        const pv = / pv (\S+)/.exec(line);
        lines[k] = { ...sc, move: pv ? pv[1] : null };
        if (k === 0) lastScore = sc;
      }
    }
    if (line.startsWith('bestmove')) {
      const parts = line.split(/\s+/);
      const uci = parts[1];
      const waiter = waiters.shift();
      if (waiter) {
        clearTimeout(waiter.timer);
        waiter.resolve(waiter.full ? { uci, move: parseUci(uci), score: lastScore, lines: lines.slice() } : parseUci(uci));
      }
    }
  }

  function load() {
    if (worker && ready) return Promise.resolve(true);
    if (loading) return loading;
    loading = new Promise((resolve) => {
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        resolve(ok);
      };
      try {
        worker = new Worker('stockfish.js');
        worker.onmessage = onMessage;
        worker.onerror = () => {
          worker = null;
          ready = false;
          finish(false);
        };
        onReady = finish;
        worker.postMessage('uci');
        worker.postMessage('isready');
        // Máy chậm chưa kịp trả lời: vẫn cho chạy (Stockfish tự xếp hàng các lệnh tới trước khi khởi động xong)
        setTimeout(() => finish(!!worker), 2500);
      } catch (err) {
        worker = null;
        finish(false);
      }
    });
    return loading;
  }

  // Các lệnh tới Stockfish chạy lần lượt (không chồng lên nhau khi vừa phân tích vừa cho máy đi)
  let chain = Promise.resolve();
  function ask(game, opts = {}) {
    const run = chain.then(() => askNow(typeof game === 'string' ? game : positionFen(game), opts));
    chain = run.catch(() => {});
    return run;
  }

  function askNow(fen, { depth = 18, movetime = 0, skill = null, full = false, fresh = true, multipv = 1 } = {}) {
    return load().then((ok) => {
      if (!ok || !worker) return null;
      return new Promise((resolve) => {
        const id = ++seq;
        const waiter = { id, resolve, full };
        // Quá giờ: dừng lượt tìm này nhưng vẫn giữ chỗ trong hàng đợi để dòng "bestmove" đến muộn
        // không bị gán nhầm cho lệnh kế tiếp (trước đây máy có thể đi nước của thế cờ cũ)
        waiter.timer = setTimeout(() => {
          waiter.resolve = () => {};
          try { worker && worker.postMessage('stop'); } catch {}
          resolve(null);
        }, Math.max(8000, (movetime || depth * 400) + 3000));
        waiters.push(waiter);
        lastScore = null;
        lines = [];
        try {
          if (fresh) worker.postMessage('ucinewgame');
          worker.postMessage('position fen ' + fen);
          worker.postMessage('setoption name Skill Level value ' + (skill != null ? Math.max(0, Math.min(20, skill)) : 20));
          worker.postMessage('setoption name MultiPV value ' + multipv); // luôn đặt lại: tuỳ chọn của Stockfish giữ nguyên giữa các lệnh
          if (movetime > 0 && depth) worker.postMessage(`go depth ${depth} movetime ${movetime}`);
          else if (movetime > 0) worker.postMessage('go movetime ' + movetime);
          else worker.postMessage('go depth ' + depth);
        } catch {
          clearTimeout(waiter.timer);
          const i = waiters.indexOf(waiter);
          if (i >= 0) waiters.splice(i, 1);
          resolve(null);
        }
      });
    });
  }

  // Đánh giá một thế cờ (FEN): { cp, best } với cp theo góc nhìn bên tới lượt (chiếu hết quy ra ±10000).
  // Không gửi ucinewgame: khi chấm lần lượt các thế cờ của một ván, bộ nhớ đệm của Stockfish giúp chấm nhanh hơn.
  // multipv = 2: kèm điểm và nước của biến tốt nhì ({ cp2, best2 }) để biết nước tốt nhất có phải "nước duy nhất" không.
  const toCp = s => s.mate != null ? (s.mate > 0 ? 10000 - s.mate * 10 : -10000 - s.mate * 10) : s.cp;
  // lines = các biến tốt nhất [{ cp, move }] (cùng một lượt tìm, nên so sánh điểm giữa chúng là nhất quán)
  async function evaluate(fen, depth = 10, multipv = 1, movetime = 1500) {
    const r = await ask(fen, { depth, movetime, full: true, fresh: false, multipv });
    if (!r || !r.score) return null;
    const out = { cp: toCp(r.score), best: r.uci && r.uci !== '(none)' ? r.uci : null };
    out.lines = (r.lines || []).filter(l => l && (l.cp != null || l.mate != null) && l.move).map(l => ({ cp: toCp(l), move: l.move }));
    if (out.lines[1]) { out.cp2 = out.lines[1].cp; out.best2 = out.lines[1].move; }
    return out;
  }

  /** Gợi ý mạnh ~ Stockfish depth 18–20 */
  async function hintMove(game) {
    const uci = await ask(game, { depth: 18, movetime: 2500, skill: 20 });
    const m = matchLegal(game, uci);
    if (m) return m;
    // fallback local
    if (typeof findBestMove === 'function') return findBestMove(game, 3);
    return null;
  }

  /**
   * Máy chơi theo level:
   * 1 Dễ → skill 3, depth 6
   * 2 Trung bình → skill 10, depth 12
   * 3 Khó → skill 20, depth 16 (~Stockfish mạnh)
   */
  async function botMove(game, level) {
    const cfg = {
      1: { depth: 6, skill: 3, movetime: 600 },
      2: { depth: 12, skill: 10, movetime: 1200 },
      3: { depth: 16, skill: 20, movetime: 2000 },
    }[level] || { depth: 12, skill: 10, movetime: 1200 };

    const uci = await ask(game, cfg);
    const m = matchLegal(game, uci);
    if (m) return m;
    if (typeof findBestMove === 'function') return findBestMove(game, level);
    return null;
  }

  return { load, hintMove, botMove, evaluate, positionFen, ready: () => ready };
})();

if (typeof module !== 'undefined') module.exports = { Engine };
