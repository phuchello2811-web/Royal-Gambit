// Stockfish engine wrapper — gợi ý & máy chơi mạnh (depth cao).
// Fallback về ai.js (negamax) nếu Worker/Stockfish không tải được.

const Engine = (() => {
  let worker = null;
  let ready = false;
  let loading = null;
  let seq = 0;
  let waiters = [];

  function positionFen(game) {
    if (typeof gameToFEN === 'function') {
      // gameToFEN dùng viewPly — ép live bằng board trực tiếp
    }
    // Dựng FEN từ instance Chess
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

  function onMessage(e) {
    const line = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
    if (!line) return;
    if (line === 'uciok' || line.startsWith('readyok')) ready = true;
    if (line.startsWith('info') && line.includes(' score ') && !line.includes('bound')) {
      const m = /score (cp|mate) (-?\d+)/.exec(line);
      if (m) lastScore = m[1] === 'cp' ? { cp: Number(m[2]) } : { mate: Number(m[2]) };
    }
    if (line.startsWith('bestmove')) {
      const parts = line.split(/\s+/);
      const uci = parts[1];
      const waiter = waiters.shift();
      if (waiter) {
        clearTimeout(waiter.timer);
        waiter.resolve(waiter.full ? { uci, move: parseUci(uci), score: lastScore } : parseUci(uci));
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
        worker.postMessage('uci');
        worker.postMessage('isready');
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

  function askNow(fen, { depth = 18, movetime = 0, skill = null, full = false } = {}) {
    return load().then((ok) => {
      if (!ok || !worker) return null;
      return new Promise((resolve) => {
        const id = ++seq;
        const timer = setTimeout(() => {
          const i = waiters.findIndex(w => w.id === id);
          if (i >= 0) waiters.splice(i, 1);
          resolve(null);
        }, Math.max(8000, (movetime || depth * 400) + 3000));
        waiters.push({ id, resolve, timer, full });
        lastScore = null;
        try {
          worker.postMessage('ucinewgame');
          worker.postMessage('position fen ' + fen);
          worker.postMessage('setoption name Skill Level value ' + (skill != null ? Math.max(0, Math.min(20, skill)) : 20));
          if (movetime > 0 && depth) worker.postMessage(`go depth ${depth} movetime ${movetime}`);
          else if (movetime > 0) worker.postMessage('go movetime ' + movetime);
          else worker.postMessage('go depth ' + depth);
        } catch {
          clearTimeout(timer);
          resolve(null);
        }
      });
    });
  }

  // Đánh giá một thế cờ (FEN): { cp, best } với cp theo góc nhìn bên tới lượt (chiếu hết quy ra ±10000)
  async function evaluate(fen, depth = 10) {
    const r = await ask(fen, { depth, movetime: 1500, full: true });
    if (!r || !r.score) return null;
    const cp = r.score.mate != null ? (r.score.mate > 0 ? 10000 - r.score.mate * 10 : -10000 - r.score.mate * 10) : r.score.cp;
    return { cp, best: r.uci && r.uci !== '(none)' ? r.uci : null };
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
