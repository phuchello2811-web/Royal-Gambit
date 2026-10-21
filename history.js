// Nhật ký ván đấu: lưu trong trình duyệt theo từng tài khoản, xem lại trên bàn, phân tích bằng Sổ luyện lỗi,
// sao chép / tải PGN. Mỗi ván: { id, at, mode, result, title, opp, color, moves, pgn, fen, note, elo?, acc? }
//   result: '1-0' = bên mình thắng (hoặc Trắng thắng ở ván 2 người), '0-1' thua, '1/2-1/2' hòa.

const GameHistory = (() => {
  const OLD_KEY = 'rg-game-history';
  const MAX = 100;
  let filter = 'all';  // all | win | draw | loss
  let modeFilter = 'all';
  let query = '';

  const key = () => OLD_KEY + ':' + (typeof Profile !== 'undefined' && Profile.signedIn() ? Profile.me().name.toLowerCase() : 'guest');

  function read() {
    try {
      let a = JSON.parse(localStorage.getItem(key()));
      // Bản cũ lưu chung một danh sách: chuyển sang tài khoản đầu tiên mở nhật ký
      if (!Array.isArray(a)) {
        const old = JSON.parse(localStorage.getItem(OLD_KEY));
        a = Array.isArray(old) ? old : [];
        if (a.length) { localStorage.setItem(key(), JSON.stringify(a)); localStorage.removeItem(OLD_KEY); }
      }
      return a;
    } catch { return []; }
  }

  function write(list) {
    try { localStorage.setItem(key(), JSON.stringify(list.slice(0, MAX))); } catch {}
  }

  function save(entry) {
    if (!entry || !entry.pgn || (entry.moves || 0) < 2) return null;
    const list = read();
    const g = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      at: Date.now(),
      mode: entry.mode || 'play',
      result: entry.result || '*',
      title: entry.title || 'Ván cờ',
      opp: entry.opp || '',
      color: entry.color || '',
      moves: entry.moves || 0,
      pgn: entry.pgn,
      fen: entry.fen || '',
      note: entry.note || '',
    };
    if (Number.isFinite(entry.elo)) g.elo = entry.elo;
    list.unshift(g);
    write(list);
    return g.id;
  }

  function update(id, fields) {
    const list = read();
    const g = list.find(x => x.id === id);
    if (!g) return;
    Object.assign(g, fields);
    write(list);
    if (!$('histModal').hidden) render();
  }

  function remove(id) { write(read().filter(x => x.id !== id)); }
  function clear() { write([]); }

  const pad = n => String(n).padStart(2, '0');
  function fmtTime(ts) { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  function dayLabel(ts) {
    const d = new Date(ts), now = new Date();
    const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((day(now) - day(d)) / 86400000);
    if (diff === 0) return 'Hôm nay';
    if (diff === 1) return 'Hôm qua';
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  function resultLabel(r) {
    if (r === '1-0' || r === 'win') return { t: 'Thắng', c: 'win' };
    if (r === '0-1' || r === 'loss') return { t: 'Thua', c: 'loss' };
    if (r === '1/2-1/2' || r === 'draw') return { t: 'Hòa', c: 'draw' };
    return { t: r || '—', c: '' };
  }
  const MODE_NAME = { play: 'Đấu máy', online: 'Online', human: '2 người' };
  const modeOf = g => g.mode === 'online' ? 'online' : /^2 người/.test(g.title) ? 'human' : 'play';

  // Đi lại các nước trong PGN trên một bàn cờ (mặc định bàn chính). Trả về danh sách nước hoặc null.
  function sanTokens(pgn) {
    return String(pgn || '')
      .replace(/\{[^}]*\}/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/\d+\.(\.\.)?/g, ' ')
      .trim().split(/\s+/).filter(t => t && !['*', '1-0', '0-1', '1/2-1/2'].includes(t));
  }
  function playSan(g, san) {
    const want = String(san).replace(/[+#?!]/g, '');
    for (const m of g.legalMoves()) {
      const mv = { from: m.from, to: m.to, promotion: m.promotion || undefined };
      if (!g.move(mv)) continue;
      if (g.history[g.history.length - 1].san.replace(/[+#?!]/g, '') === want) return mv;
      g.undo();
    }
    return null;
  }
  function replay(pgn, g = game) {
    g.reset();
    const moves = [];
    for (const san of sanTokens(pgn)) {
      const mv = playSan(g, san);
      if (!mv) return null;
      moves.push(mv);
    }
    return moves;
  }

  function filtered(list) {
    const q = query.trim().toLowerCase();
    return list.filter(g => {
      const r = resultLabel(g.result).c;
      if (filter !== 'all' && r !== filter) return false;
      if (modeFilter !== 'all' && modeOf(g) !== modeFilter) return false;
      if (q && !`${g.title} ${g.opp} ${g.note}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderSummary(list) {
    const box = $('histSummary');
    const n = list.length;
    const c = k => list.filter(g => resultLabel(g.result).c === k).length;
    const w = c('win'), d = c('draw'), l = c('loss');
    const accs = list.filter(g => Number.isFinite(g.acc)).map(g => g.acc);
    const acc = accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null;
    const eloSum = list.slice(0, 20).reduce((a, g) => a + (Number.isFinite(g.elo) ? g.elo : 0), 0);
    box.innerHTML = `
      <div class="hs-tile"><b>${n}</b><span>ván đã lưu</span></div>
      <div class="hs-tile"><b>${n ? Math.round(100 * w / n) : 0}%</b><span>tỉ lệ thắng</span></div>
      <div class="hs-tile"><b>${acc != null ? acc + '%' : '–'}</b><span>độ chính xác TB</span></div>
      <div class="hs-tile"><b class="${eloSum > 0 ? 'up' : eloSum < 0 ? 'down' : ''}">${eloSum > 0 ? '+' : eloSum < 0 ? '−' : '±'}${Math.abs(eloSum)}</b><span>Elo 20 ván gần nhất</span></div>
      <div class="hs-bar" title="Thắng ${w} · Hòa ${d} · Thua ${l}">${n ? `<i class="win" style="flex:${w}"></i><i class="draw" style="flex:${d}"></i><i class="loss" style="flex:${l}"></i>` : ''}</div>`;
  }

  function renderFilters(list) {
    const box = $('histFilters');
    const count = k => k === 'all' ? list.length : list.filter(g => resultLabel(g.result).c === k).length;
    box.innerHTML = [['all', 'Tất cả'], ['win', 'Thắng'], ['draw', 'Hòa'], ['loss', 'Thua']]
      .map(([k, t]) => `<button type="button" class="lib-filter${filter === k ? ' on' : ''}" data-f="${k}">${t}<span>${count(k)}</span></button>`).join('');
    box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; render(); }));
  }

  function render() {
    const box = $('histList');
    if (!box) return;
    const all = read();
    renderSummary(all);
    renderFilters(all);
    $('histMode').value = modeFilter;
    const list = filtered(all);
    box.innerHTML = '';
    if (!all.length) {
      box.innerHTML = '<p class="hist-empty">Chưa có ván nào được lưu.<br>Chơi xong một ván (máy / online) sẽ xuất hiện ở đây.</p>';
      return;
    }
    if (!list.length) { box.innerHTML = '<p class="hist-empty">Không có ván nào khớp bộ lọc.</p>'; return; }
    let lastDay = '';
    for (const g of list) {
      const day = dayLabel(g.at);
      if (day !== lastDay) {
        lastDay = day;
        const h = document.createElement('div');
        h.className = 'hist-day';
        h.textContent = day;
        box.appendChild(h);
      }
      box.appendChild(row(g));
    }
  }

  function row(g) {
    const rl = resultLabel(g.result);
    const el = document.createElement('div');
    el.className = 'hist-row ' + rl.c;
    const flip = g.color === 'b';
    let fen = g.fen;
    if (!fen) { const tmp = new Chess(); if (replay(g.pgn, tmp) && typeof Engine !== 'undefined') fen = Engine.positionFen(tmp); }
    const board = fen && typeof Library !== 'undefined' ? Library.fenBoard(fen, flip) : '';
    const chips = [];
    if (Number.isFinite(g.elo)) chips.push(`<span class="hist-chip ${g.elo > 0 ? 'up' : g.elo < 0 ? 'down' : ''}">${g.elo > 0 ? '+' : g.elo < 0 ? '−' : '±'}${Math.abs(g.elo)} Elo</span>`);
    if (Number.isFinite(g.acc)) chips.push(`<span class="hist-chip acc">${g.acc}%</span>`);
    el.innerHTML = `
      <span class="hist-board lib-card-board lib-frame">${board}</span>
      <div class="hist-main">
        <div class="hist-title"><span class="hist-res ${rl.c}">${rl.t}</span><b></b></div>
        <small class="hist-sub"></small>
        <div class="hist-chips">${chips.join('')}</div>
      </div>
      <div class="hist-actions">
        <button type="button" class="hist-load" title="Xem lại trên bàn cờ"><svg class="ic"><use href="#i-play"/></svg><span>Xem lại</span></button>
        ${g.color && !Number.isFinite(g.acc) && typeof Coach !== 'undefined' ? '<button type="button" class="hist-an" title="Chấm từng nước bằng Stockfish, thêm nước hớ vào Sổ luyện lỗi"><svg class="ic"><use href="#i-target"/></svg><span>Phân tích</span></button>' : ''}
        <button type="button" class="hist-pgn icon" title="Sao chép PGN"><svg class="ic"><use href="#i-copy"/></svg></button>
        <button type="button" class="hist-del icon" title="Xóa ván này"><svg class="ic"><use href="#i-close"/></svg></button>
      </div>`;
    el.querySelector('b').textContent = g.opp ? `${g.opp}` : g.title;
    const side = g.color ? (g.color === 'w' ? ' · cầm Trắng' : ' · cầm Đen') : '';
    el.querySelector('.hist-sub').textContent = `${fmtTime(g.at)} · ${MODE_NAME[modeOf(g)]}${side} · ${g.moves} nước` + (g.note ? ' · ' + g.note : '');
    el.querySelector('.hist-load').addEventListener('click', () => loadOnBoard(g));
    const an = el.querySelector('.hist-an');
    if (an) an.addEventListener('click', () => analyse(g, an));
    el.querySelector('.hist-pgn').addEventListener('click', () => copyText(g.pgn, 'Đã sao chép PGN'));
    el.querySelector('.hist-del').addEventListener('click', () => { remove(g.id); render(); });
    return el;
  }

  // Phân tích một ván đã lưu bằng Sổ luyện lỗi (coach.js)
  async function analyse(g, btn) {
    const tmp = new Chess();
    const moves = replay(g.pgn, tmp);
    if (!moves) { toast('Không đọc được PGN của ván này.'); return; }
    btn.disabled = true;
    const label = btn.querySelector('span');
    const r = await Coach.analyse({
      startFen: tmp.startFen, moves, human: g.color, label: g.opp ? `${g.title} · ${g.opp}` : g.title,
      onProgress: f => { label.textContent = Math.round(f * 100) + '%'; },
    });
    if (!r) { btn.disabled = false; label.textContent = 'Phân tích'; toast('Không phân tích được ván này.'); return; }
    update(g.id, { acc: r.accuracy });
    toast(r.added ? `Độ chính xác ${r.accuracy}% · đã thêm ${r.added} thế cờ vào Sổ luyện lỗi` : `Độ chính xác ${r.accuracy}% · không có nước hớ nào`);
  }

  function loadOnBoard(g) {
    $('histModal').hidden = true;
    if ($('mode')) $('mode').value = 'none';
    if (mode !== 'play') { setMode('play'); if (mode !== 'play') return; }
    else if (!newGame()) return;
    viewPly = null;
    clearSelection();
    hint = null;
    marks.clear();
    aiColor = 'none';
    ratedDone = true;
    practice = true;
    playResult = null;
    thinking = false;
    if (!replay(g.pgn) && g.fen) {
      try { game.load(g.fen); } catch { game.reset(); }
    }
    seenLen = game.history.length;
    seenMove = seenLen ? game.history[seenLen - 1].move : null;
    flipped = g.color === 'b';
    renderRatedNote();
    render();
    if (game.history.length) setViewPly(0);
    toast('Đã tải ván · dùng ◀ ▶ hoặc phím ← → để xem từng nước');
  }

  // Tải toàn bộ nhật ký (đang lọc) thành một file .pgn
  function download() {
    const list = filtered(read());
    if (!list.length) { toast('Không có ván nào để tải.'); return; }
    const d = new Date();
    const text = list.map(g => {
      const head = [`[Event "Royal Gambit · ${g.title}"]`, `[Date "${new Date(g.at).toISOString().slice(0, 10).replace(/-/g, '.')}"]`];
      return /^\s*\[/.test(g.pgn) ? g.pgn.trim() : head.join('\n') + '\n\n' + g.pgn.trim();
    }).join('\n\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text + '\n'], { type: 'application/x-chess-pgn' }));
    a.download = `royal-gambit-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.pgn`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function open() {
    render();
    openModal('histModal');
  }

  function bind() {
    $('histClear').addEventListener('click', () => {
      if (confirm('Xóa toàn bộ nhật ký ván đấu?')) { clear(); render(); }
    });
    $('histDownload').addEventListener('click', download);
    $('histSearch').addEventListener('input', e => { query = e.target.value; render(); });
    $('histMode').addEventListener('change', e => { modeFilter = e.target.value; render(); });
  }

  return { save, update, read, open, bind, render, remove, clear, replay, resultLabel };
})();
