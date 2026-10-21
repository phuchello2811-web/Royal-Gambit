// Stockfish engine wrapper — gợi ý & máy chơi mạnh (depth cao).
// Fallback về ai.js (negamax) nếu Worker/Stockfish không tải được.

const Engine = (() => {
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

  // Một engine = một Web Worker với hàng đợi lệnh riêng. ENGINES: các bản thử lần lượt (bản đầu tải lỗi thì dùng bản sau).
  function makeWorkerEngine(ENGINES) {
    let worker = null;
    let ready = false;
    let loading = null;
    let seq = 0;
    let waiters = [];
    let onReady = null; // báo load() xong ngay khi Stockfish trả lời "readyok"

    let lastScore = null; // điểm của lượt tìm kiếm hiện tại: { cp } hoặc { mate } (theo bên tới lượt)
    let lines = [];       // MultiPV: lines[k] = { cp | mate, move, pv } của biến thứ k+1 (pv: chuỗi nước UCI của biến)

    function onMessage(e) {
      const line = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
      if (!line) return;
      if (line === 'uciok' || line.startsWith('readyok')) ready = true;
      if (line.startsWith('readyok') && onReady) { onReady(true); onReady = null; }
      // Dòng "info" của lượt tìm đã quá giờ (đang chờ "bestmove" muộn) không được lẫn vào kết quả lượt sau
      if (line.startsWith('info') && line.includes(' score ') && !line.includes('bound') && !(waiters[0] && waiters[0].dead)) {
        const m = /score (cp|mate) (-?\d+)/.exec(line);
        if (m) {
          const sc = m[1] === 'cp' ? { cp: Number(m[2]) } : { mate: Number(m[2]) };
          const k = Number((/ multipv (\d+)/.exec(line) || [0, 1])[1]) - 1;
          const pv = / pv (.+)$/.exec(line);
          const pvMoves = pv ? pv[1].trim().split(/\s+/) : [];
          lines[k] = { ...sc, move: pvMoves[0] || null, pv: pvMoves };
          if (k === 0) lastScore = sc;
          const w = waiters[0];
          if (w && w.onInfo) {
            const d = / depth (\d+)/.exec(line);
            try { w.onInfo({ depth: d ? Number(d[1]) : 0, lines: lines.slice() }); } catch {}
          }
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

    let engineName = '';

    function start(eng) {
      return new Promise((resolve) => {
        let done = false;
        let timer = null;
        const finish = (ok) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          if (!ok && worker) { try { worker.terminate(); } catch {} worker = null; }
          if (ok) engineName = eng.name;
          resolve(ok);
        };
        try {
          ready = false;
          worker = new Worker(eng.file);
          worker.onmessage = onMessage;
          worker.onerror = () => {
            if (done && engineName) { worker = null; ready = false; loading = null; } // hỏng giữa chừng: lần sau tải lại
            finish(false);
          };
          onReady = finish;
          worker.postMessage('uci');
          worker.postMessage('isready');
          // strict: chưa trả lời "readyok" kịp (tải .wasm lỗi) thì bỏ, thử engine kế tiếp.
          // Không strict: máy chậm chưa kịp trả lời vẫn cho chạy (Stockfish tự xếp hàng các lệnh tới trước khi khởi động xong)
          timer = setTimeout(() => finish(!eng.strict && !!worker), eng.wait);
        } catch (err) {
          finish(false);
        }
      });
    }

    function load() {
      if (worker && ready) return Promise.resolve(true);
      if (loading) return loading;
      loading = (async () => {
        for (const eng of ENGINES) {
          if (await start(eng)) return true;
        }
        worker = null;
        ready = false;
        loading = null; // lần sau thử tải lại
        return false;
      })();
      return loading;
    }

    // Các lệnh tới Stockfish chạy lần lượt (không chồng lên nhau khi vừa phân tích vừa cho máy đi).
    // Lệnh gấp (máy đi, Gợi ý, kiểm tra câu đố) chen lên trước các lệnh phân tích ván đang xếp hàng; nếu một lệnh
    // phân tích đang chạy thì dừng nó lại và chạy lại sau. Trước đây phân tích ván vừa xong (tới 100 thế cờ, mỗi thế
    // 1,5–3 giây) chặn máy đi nước của ván mới tới vài phút.
    // Mức ưu tiên: 2 = máy đi / Gợi ý / kiểm tra câu đố, 1 = bảng phân tích trực tiếp, 0 = phân tích ván chạy nền.
    // opts.tag: lệnh mới cùng nhãn thay thế lệnh cũ (thế cờ đã đổi thì bỏ lượt phân tích của thế cũ).
    const queue = [];
    let current = null;
    const stopSearch = () => { try { worker && worker.postMessage('stop'); } catch {} };
    function enqueue(job) {
      const i = queue.findIndex(j => j.prio < job.prio);
      queue.splice(i < 0 ? queue.length : i, 0, job);
    }
    function cancel(tag) {
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].opts.tag === tag) { queue[i].resolve(null); queue.splice(i, 1); }
      }
      if (current && current.opts.tag === tag && !current.cancelled) { current.cancelled = true; stopSearch(); }
    }
    function ask(game, opts = {}, prio = 0) {
      prio = prio === true ? 2 : Number(prio) || 0;
      return new Promise((resolve) => {
        if (opts.tag) cancel(opts.tag);
        // Lấy FEN ngay lúc hỏi: thế cờ trên bàn có thể đổi trong lúc chờ tới lượt
        const job = { fen: typeof game === 'string' ? game : positionFen(game), opts, prio, resolve };
        enqueue(job);
        if (current && current.prio < prio && !current.preempted && !current.cancelled) {
          current.preempted = true;
          stopSearch();
        }
        pump();
      });
    }

    async function pump() {
      if (current || !queue.length) return;
      const job = current = queue.shift();
      let r = null;
      try { r = await askNow(job); } catch {}
      current = null;
      if (job.cancelled) job.resolve(null);
      else if (job.preempted) {
        // Bị lệnh ưu tiên hơn chen ngang: chạy lại từ đầu sau các lệnh đó
        job.preempted = false;
        enqueue(job);
      } else job.resolve(r);
      pump();
    }

    function askNow(job) {
      const { fen } = job;
      const { depth = 18, movetime = 0, skill = null, full = false, fresh = true, multipv = 1, onInfo = null, elo = 0 } = job.opts;
      return load().then((ok) => {
        if (!ok || !worker) return null;
        if (job.cancelled || job.preempted) return null; // bị huỷ / chen ngang trong lúc chờ tải engine
        return new Promise((resolve) => {
          const id = ++seq;
          const waiter = { id, resolve, full, onInfo };
          // Quá giờ: dừng lượt tìm này nhưng vẫn giữ chỗ trong hàng đợi để dòng "bestmove" đến muộn
          // không bị gán nhầm cho lệnh kế tiếp (trước đây máy có thể đi nước của thế cờ cũ)
          waiter.timer = setTimeout(() => {
            waiter.resolve = () => {};
            waiter.dead = true;
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
            // Máy Elo tuỳ chỉnh: Stockfish tự giới hạn sức mạnh theo Elo (lệnh khác thì tắt giới hạn)
            worker.postMessage('setoption name UCI_LimitStrength value ' + (elo > 0));
            if (elo > 0) worker.postMessage('setoption name UCI_Elo value ' + Math.round(elo));
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

    return { load, ask, cancel, ready: () => ready, name: () => engineName };
  }

  const LEGACY = { file: 'stockfish.js', name: 'Stockfish', wait: 2500, strict: false }; // bản cũ cho trình duyệt cũ
  // Stockfish 19 (bản lite, 1 luồng: chạy trên host tĩnh không cần header COOP/COEP): máy đánh, phân tích
  const sf19 = makeWorkerEngine([
    { file: 'stockfish-19-lite-single.js', name: 'Stockfish 19', wait: 30000, strict: true }, // mạng 3G chậm: ~20 giây cho 1,8 MB
    LEGACY,
  ]);
  // Stockfish 16 (1 luồng, 575 KB): nút Gợi ý của mọi người. Gói npm không kèm mạng NNUE (40 MB) nên chạy đánh giá cổ điển.
  const sf16 = makeWorkerEngine([
    { file: 'stockfish-nnue-16-single.js', name: 'Stockfish 16', wait: 15000, strict: true },
    LEGACY,
  ]);
  const ask = sf19.ask, cancel = sf19.cancel;

  // Đánh giá một thế cờ (FEN): { cp, best } với cp theo góc nhìn bên tới lượt (chiếu hết quy ra ±10000).
  // Không gửi ucinewgame: khi chấm lần lượt các thế cờ của một ván, bộ nhớ đệm của Stockfish giúp chấm nhanh hơn.
  // multipv = 2: kèm điểm và nước của biến tốt nhì ({ cp2, best2 }) để biết nước tốt nhất có phải "nước duy nhất" không.
  const toCp = s => s.mate != null ? (s.mate > 0 ? 10000 - s.mate * 10 : -10000 - s.mate * 10) : s.cp;
  // lines = các biến tốt nhất [{ cp, move }] (cùng một lượt tìm, nên so sánh điểm giữa chúng là nhất quán)
  // urgent: người chơi đang chờ kết quả (kiểm tra nước giải câu đố), không phải phân tích chạy nền
  async function evaluate(fen, depth = 10, multipv = 1, movetime = 1500, urgent = false) {
    const r = await ask(fen, { depth, movetime, full: true, fresh: false, multipv }, urgent);
    if (!r || !r.score) return null;
    const out = { cp: toCp(r.score), best: r.uci && r.uci !== '(none)' ? r.uci : null };
    out.lines = (r.lines || []).filter(l => l && (l.cp != null || l.mate != null) && l.move).map(l => ({ cp: toCp(l), move: l.move }));
    if (out.lines[1]) { out.cp2 = out.lines[1].cp; out.best2 = out.lines[1].move; }
    return out;
  }

  // Bảng phân tích trực tiếp: các biến tốt nhất của một thế cờ, báo dần theo độ sâu qua onInfo({ depth, lines }).
  // lines[k] = { cp, mate?, move, pv } với cp theo góc nhìn bên tới lượt. Gọi lại (thế cờ mới) thì lượt cũ bị huỷ.
  const normLines = ls => ls.filter(l => l && (l.cp != null || l.mate != null) && l.move)
    .map(l => ({ cp: toCp(l), mate: l.mate != null ? l.mate : null, move: l.move, pv: l.pv || [l.move] }));
  // tag: 'live' (biến chính) hoặc 'threat' (đe doạ của đối thủ), mỗi nhãn chỉ giữ lượt mới nhất
  async function analyse(fen, { depth = 22, movetime = 8000, multipv = 3, onInfo = null, tag = 'live' } = {}) {
    const r = await ask(fen, {
      depth, movetime, full: true, fresh: false, multipv, tag,
      onInfo: onInfo && (i => onInfo({ depth: i.depth, lines: normLines(i.lines) })),
    }, 1);
    return r ? normLines(r.lines || []) : null;
  }

  // Nút Gợi ý: Stockfish 16
  async function hintMove(game) {
    const uci = await sf16.ask(game, { depth: 18, movetime: 2500, skill: 20 }, true);
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
   * 4 Stockfish 19 → toàn lực, depth 24 / tối đa 3 giây mỗi nước
   * 5 Elo tuỳ chỉnh (công cụ chủ web) → Stockfish tự giới hạn theo `elo` (1350–3190)
   */
  async function botMove(game, level, elo = 0) {
    const cfg = {
      1: { depth: 6, skill: 3, movetime: 600 },
      2: { depth: 12, skill: 10, movetime: 1200 },
      3: { depth: 16, skill: 20, movetime: 2000 },
      4: { depth: 24, skill: 20, movetime: 3000 },
      5: { depth: 22, skill: 20, movetime: 2000, elo: Math.max(1350, Math.min(3190, Number(elo) || 2000)) },
    }[level] || { depth: 12, skill: 10, movetime: 1200 };

    const uci = await ask(game, cfg, true);
    const m = matchLegal(game, uci);
    if (m) return m;
    if (typeof findBestMove === 'function') return findBestMove(game, level);
    return null;
  }

  return {
    load: () => { sf16.load().catch(() => {}); return sf19.load(); }, // tải sẵn cả bản Gợi ý (nhẹ) cùng lúc
    hintMove, botMove, evaluate, analyse, stopAnalysis: () => { cancel('live'); cancel('threat'); }, positionFen,
    ready: () => sf19.ready(), name: () => sf19.name() || 'Stockfish', hintName: () => sf16.name() || 'Stockfish 16',
  };
})();

if (typeof module !== 'undefined') module.exports = { Engine };

