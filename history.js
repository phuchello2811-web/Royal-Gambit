// Nhật ký ván đấu: lưu trong trình duyệt theo từng tài khoản, xem lại trên bàn, phân tích kiểu chess.com,
// sao chép / tải PGN, nhập ván từ PGN (chess.com, lichess…). Mỗi ván:
//   { id, at, mode: play | online | import, result, title, opp, color, moves, pgn, fen, note, elo?, acc?, rev? }
//   color: bên mình cầm ('w' | 'b'), '' = ván 2 người cùng máy / ván nhập không chọn bên.
//   result: có color thì '1-0' = mình thắng, '0-1' = mình thua; không có color thì '1-0' = Trắng thắng, '0-1' = Đen thắng.

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
    if (!entry || !entry.pgn || (entry.moves || 0) < (entry.mode === 'import' ? 1 : 2)) return null;
    const list = read();
    const now = Date.now();
    const g = {
      id: now.toString(36) + Math.random().toString(36).slice(2, 6),
      at: now,
      u: now, // lần sửa cuối (để gộp khi đồng bộ giữa các máy)
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
    push([g]);
    return g.id;
  }

  function update(id, fields) {
    const list = read();
    const g = list.find(x => x.id === id);
    if (!g) return;
    Object.assign(g, fields, { u: Date.now() });
    write(list);
    push([g]);
    if (!$('histModal').hidden) render();
  }

  function remove(id) {
    write(read().filter(x => x.id !== id));
    markDeleted([id]);
  }
  function clear() {
    const ids = read().map(g => g.id);
    write([]);
    markDeleted(ids);
  }

  // ---------- Đồng bộ với tài khoản (bản Firebase) ----------
  // Mỗi ván lưu ở /history/<uid>/<id> = { at, u, d: JSON của ván } hoặc { at, u, del: true } (đã xoá).
  // Gộp theo `u` (lần sửa cuối): bản mới hơn thắng, nên xoá ở máy này thì máy kia cũng xoá, không bị đẩy lên lại.
  // Cần luật Firebase có mục "history" (firebase-rules.json). Chế độ cục bộ (không Firebase) thì không đồng bộ.
  const DEL_KEY = () => key() + ':deleted'; // ván đã xoá ở máy này: id → thời điểm xoá
  const remoteOn = () => typeof Profile !== 'undefined' && Profile.remote && Profile.signedIn() && !!Profile.uid();
  const path = () => 'history/' + Profile.uid();
  const pack = g => ({ at: g.at, u: g.u || g.at, d: JSON.stringify(g) });
  let syncInfo = { state: 'idle', at: 0, error: '' };
  let syncing = null, pushTimer = null;
  const listeners = [];
  const changed = () => listeners.forEach(f => { try { f(); } catch {} });

  function readDeleted() { try { return JSON.parse(localStorage.getItem(DEL_KEY())) || {}; } catch { return {}; } }
  function writeDeleted(m) {
    const cut = Date.now() - 90 * 86400000; // dấu xoá cũ hơn 90 ngày thì bỏ
    for (const id in m) if (m[id] < cut) delete m[id];
    try { localStorage.setItem(DEL_KEY(), JSON.stringify(m)); } catch {}
  }
  function markDeleted(ids) {
    if (!ids.length) return;
    const m = readDeleted(), now = Date.now();
    for (const id of ids) m[id] = now;
    writeDeleted(m);
    if (remoteOn()) send(Object.fromEntries(ids.map(id => [id, { at: now, u: now, del: true }])));
  }
  function push(games) { if (remoteOn() && games.length) send(Object.fromEntries(games.map(g => [g.id, pack(g)]))); }

  // Ghi nhiều ván một lần (PATCH); lỗi mạng thì để lần đồng bộ sau gộp lại
  async function send(patch) {
    try { await Profile.dbCall(path(), 'PATCH', patch); setInfo('ok'); }
    catch (e) { setInfo('error', e.message); }
  }
  function setInfo(state, error = '') {
    syncInfo = { state, at: state === 'ok' ? Date.now() : syncInfo.at, error };
    renderSyncNote();
  }

  // Tải nhật ký trên tài khoản về, gộp với nhật ký trên máy này, rồi đẩy phần máy này có mà tài khoản chưa có
  function sync() {
    if (!remoteOn()) return Promise.resolve(false);
    if (syncing) return syncing;
    setInfo('syncing');
    syncing = (async () => {
      try {
        const remote = (await Profile.dbCall(path())) || {};
        const local = read(), deleted = readDeleted();
        const byId = new Map(local.map(g => [g.id, g]));
        const ids = new Set([...byId.keys(), ...Object.keys(deleted), ...Object.keys(remote)]);
        const keep = [], patch = {};
        for (const id of ids) {
          const L = byId.get(id), D = deleted[id], R = remote[id];
          let rGame = null;
          if (R && !R.del && typeof R.d === 'string') { try { rGame = JSON.parse(R.d); } catch {} }
          if (rGame && (rGame.id !== id || typeof rGame.pgn !== 'string')) rGame = null;
          const cand = [
            L ? { u: L.u || L.at, game: L, from: 'local' } : null,
            D ? { u: D, game: null, from: 'local' } : null,
            R ? { u: Number(R.u) || 0, game: rGame, from: 'remote' } : null,
          ].filter(Boolean).sort((a, b) => b.u - a.u || (a.from === 'remote' ? -1 : 1));
          const win = cand[0];
          if (!win) continue;
          if (win.game) keep.push(win.game); else deleted[id] = win.u; // bản thắng là "đã xoá"
          if (win.from === 'local' && (!R || (Number(R.u) || 0) < win.u)) patch[id] = win.game ? pack(win.game) : { at: win.u, u: win.u, del: true };
        }
        keep.sort((a, b) => b.at - a.at);
        // Ván quá giới hạn (100) thì bỏ khỏi tài khoản luôn
        for (const g of keep.slice(MAX)) if (remote[g.id]) patch[g.id] = null;
        write(keep);
        for (const id of Object.keys(deleted)) if (keep.some(g => g.id === id)) delete deleted[id];
        writeDeleted(deleted);
        if (Object.keys(patch).length) await Profile.dbCall(path(), 'PATCH', patch);
        setInfo('ok');
        changed();
        return true;
      } catch (e) {
        setInfo('error', e.message);
        return false;
      } finally {
        syncing = null;
      }
    })();
    return syncing;
  }

  // Dòng trạng thái đồng bộ trong hộp Nhật ký
  function renderSyncNote() {
    const el = $('histSync');
    if (!el) return;
    el.hidden = !remoteOn();
    if (el.hidden) return;
    const { state, at, error } = syncInfo;
    el.className = 'hist-sync ' + state;
    el.textContent = state === 'syncing' ? 'Đang đồng bộ với tài khoản…'
      : state === 'error' ? (error === 'DENIED'
        ? 'Chưa đồng bộ được: máy chủ chưa cho lưu nhật ký. Chủ web cần dán lại firebase-rules.json (có mục "history") rồi bấm Publish.'
        : error === 'NETWORK' ? 'Chưa đồng bộ được (mất mạng). Ván vẫn lưu trên máy này và sẽ đồng bộ lại sau.'
        : 'Chưa đồng bộ được, sẽ thử lại sau.')
      : at ? 'Đã đồng bộ với tài khoản: xem được trên mọi máy bạn đăng nhập' : 'Nhật ký được đồng bộ với tài khoản';
  }

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
  // Kết quả theo góc nhìn của mình: 'win' | 'loss' | 'draw', hoặc '' với ván không có bên của mình (2 người cùng máy).
  // Trước đây ván 2 người "Trắng thắng" bị ghi là "Thắng" và tính vào tỉ lệ thắng.
  const outcome = g => (g && g.color ? resultLabel(g.result).c : '');
  // Nhãn hiển thị cho một ván (ván 2 người: Trắng thắng / Đen thắng)
  function label(g) {
    if (g.color) return resultLabel(g.result);
    if (g.result === '1-0') return { t: 'Trắng thắng', c: 'side' };
    if (g.result === '0-1') return { t: 'Đen thắng', c: 'side' };
    if (g.result === '1/2-1/2') return { t: 'Hòa', c: 'side' };
    return { t: '—', c: 'side' };
  }
  const MODE_NAME = { play: 'Đấu máy', online: 'Online', human: '2 người', import: 'Ván nhập' };
  const modeOf = g => g.mode === 'online' ? 'online' : g.mode === 'import' ? 'import' : /^2 người/.test(g.title) ? 'human' : 'play';

  // Đi lại các nước trong PGN trên một bàn cờ (mặc định bàn chính). Trả về danh sách nước hoặc null.
  // Bỏ qua: thẻ [..], chú thích {..} và ; , biến phụ (..) lồng nhau, ký hiệu $n, số thứ tự nước, kết quả.
  function sanTokens(pgn) {
    let s = String(pgn || '').replace(/\r/g, '').replace(/^%.*$/gm, ' ')
      .replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
    let prev;
    do { prev = s; s = s.replace(/\([^()]*\)/g, ' '); } while (s !== prev);
    return s.replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/\.{2,}/g, ' ')
      .trim().split(/\s+/).filter(t => t && !['*', '1-0', '0-1', '1/2-1/2', '½-½'].includes(t));
  }
  function playSan(g, san) {
    const want = String(san).replace(/[+#?!]/g, '').replace(/e\.p\.$/, '')
      .replace(/^0-0(-0)?$/, s => s.replace(/0/g, 'O'))          // 0-0 → O-O
      .replace(/^P(?=[a-h])/, '')                                   // Pe4 → e4
      .replace(/^([a-h](?:x[a-h])?[18])=?([qrbnQRBN])$/, (m, a, p) => `${a}=${p.toUpperCase()}`); // e8Q → e8=Q
    const legal = g.legalMoves();
    // So SAN (bỏ dấu chiếu) trước rồi mới đi thật: không phải thử đi từng nước như trước
    const m = legal.find(x => g._san(x, legal) === want);
    if (!m) return null;
    const mv = { from: m.from, to: m.to, promotion: m.promotion || undefined };
    return g.move(mv) ? mv : null;
  }
  // Ván bắt đầu từ thế riêng có thẻ [FEN "..."] trong PGN
  function replay(pgn, g = game) {
    const fen = /\[FEN\s+"([^"]+)"\]/.exec(String(pgn || ''));
    try { if (fen) g.load(fen[1]); else g.reset(); } catch { g.reset(); }
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
      const r = outcome(g);
      if (filter !== 'all' && r !== filter) return false;
      if (modeFilter !== 'all' && modeOf(g) !== modeFilter) return false;
      if (q && !`${g.title} ${g.opp} ${g.note}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderSummary(list) {
    const box = $('histSummary');
    const n = list.length;
    const c = k => list.filter(g => outcome(g) === k).length;
    const w = c('win'), d = c('draw'), l = c('loss'), mine = w + d + l; // chỉ ván có bên của mình
    const accs = list.filter(g => Number.isFinite(g.acc)).map(g => g.acc);
    const acc = accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null;
    const eloSum = list.slice(0, 20).reduce((a, g) => a + (Number.isFinite(g.elo) ? g.elo : 0), 0);
    box.innerHTML = `
      <div class="hs-tile"><b>${n}</b><span>ván đã lưu</span></div>
      <div class="hs-tile"><b>${mine ? Math.round(100 * w / mine) + '%' : '–'}</b><span>tỉ lệ thắng</span></div>
      <div class="hs-tile"><b>${acc != null ? acc + '%' : '–'}</b><span>độ chính xác TB</span></div>
      <div class="hs-tile"><b class="${eloSum > 0 ? 'up' : eloSum < 0 ? 'down' : ''}">${eloSum > 0 ? '+' : eloSum < 0 ? '−' : '±'}${Math.abs(eloSum)}</b><span>Elo 20 ván gần nhất</span></div>
      <div class="hs-bar" title="Thắng ${w} · Hòa ${d} · Thua ${l}">${mine ? `<i class="win" style="flex:${w}"></i><i class="draw" style="flex:${d}"></i><i class="loss" style="flex:${l}"></i>` : ''}</div>`;
  }

  function renderFilters(list) {
    const box = $('histFilters');
    const count = k => k === 'all' ? list.length : list.filter(g => outcome(g) === k).length;
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
    const rl = label(g);
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
        ${g.rev ? '<button type="button" class="hist-rev" title="Xem lại từng nước kèm xếp loại (thiên tài, tốt nhất, nước hớ…)"><svg class="ic"><use href="#i-search"/></svg><span>Xem phân tích</span></button>'
          : typeof Coach !== 'undefined' ? '<button type="button" class="hist-an" title="Chấm từng nước bằng Stockfish, thêm nước hớ vào Sổ luyện lỗi"><svg class="ic"><use href="#i-target"/></svg><span>Phân tích</span></button>' : ''}
        <button type="button" class="hist-pgn icon" title="Sao chép PGN"><svg class="ic"><use href="#i-copy"/></svg></button>
        <button type="button" class="hist-del icon" title="Xóa ván này"><svg class="ic"><use href="#i-close"/></svg></button>
      </div>`;
    el.querySelector('b').textContent = g.opp ? `${g.opp}` : g.title;
    const side = g.color ? (g.color === 'w' ? ' · cầm Trắng' : ' · cầm Đen') : '';
    el.querySelector('.hist-sub').textContent = `${fmtTime(g.at)} · ${MODE_NAME[modeOf(g)]}${side} · ${g.moves} nước` + (g.note ? ' · ' + g.note : '');
    el.querySelector('.hist-load').addEventListener('click', () => loadOnBoard(g));
    const an = el.querySelector('.hist-an');
    if (an) an.addEventListener('click', () => analyse(g, an));
    const rv = el.querySelector('.hist-rev');
    if (rv) rv.addEventListener('click', () => loadOnBoard(g, true));
    el.querySelector('.hist-pgn').addEventListener('click', () => copyText(g.pgn, 'Đã sao chép PGN'));
    el.querySelector('.hist-del').addEventListener('click', () => {
      if (!confirm('Xóa ván này khỏi nhật ký?')) return;
      remove(g.id);
      render();
    });
    return el;
  }

  // Phân tích một ván đã lưu (coach.js), lưu bản phân tích vào nhật ký. Trả về báo cáo hoặc null.
  async function runAnalysis(g, onProgress) {
    const tmp = new Chess();
    const moves = replay(g.pgn, tmp);
    if (!moves || !moves.length) return null;
    const r = await Coach.analyse({ startFen: tmp.startFen, moves, human: g.color || null, label: g.opp ? `${g.title} · ${g.opp}` : g.title, onProgress });
    if (!r) return null;
    const { cls, evals, best, acc } = r.review;
    update(g.id, { ...(r.accuracy != null ? { acc: r.accuracy } : {}), rev: { cls, evals, best, acc } });
    return r;
  }

  async function analyse(g, btn) {
    if (!replay(g.pgn, new Chess())) { toast('Không đọc được PGN của ván này.'); return; }
    btn.disabled = true;
    const lab = btn.querySelector('span');
    const r = await runAnalysis(g, f => { lab.textContent = Math.round(f * 100) + '%'; });
    if (!r) { btn.disabled = false; lab.textContent = 'Phân tích'; toast('Không phân tích được ván này.'); return; }
    const acc = r.review.acc;
    if (r.accuracy == null) toast(`Đã phân tích xong · độ chính xác Trắng ${acc.w ?? '–'}% · Đen ${acc.b ?? '–'}%`);
    else toast(r.added ? `Độ chính xác ${r.accuracy}% · đã thêm ${r.added} thế cờ vào Sổ luyện lỗi` : `Độ chính xác ${r.accuracy}% · không có nước hớ nào`);
  }

  // ----- Nhập ván từ PGN (chess.com, lichess…) hoặc một thế cờ FEN -----
  const tagOf = (text, k) => ((new RegExp('\\[' + k + '\\s+"([^"]*)"\\]').exec(text) || [])[1] || '').trim();
  const known = v => v && !/^\?+$/.test(v) && v !== '-';

  // FEN hợp lệ (đủ 8 hàng × 8 ô, mỗi bên đúng một Vua, không có Tốt ở hàng 1/8, bên vừa đi không bị chiếu). Trả về FEN đủ 6 trường hoặc null.
  function normalFen(text) {
    const parts = String(text || '').trim().split(/\s+/);
    if (!/^([pnbrqkPNBRQK1-8]+\/){7}[pnbrqkPNBRQK1-8]+$/.test(parts[0] || '')) return null;
    const rows = parts[0].split('/');
    if (rows.some(r => [...r].reduce((a, ch) => a + (/\d/.test(ch) ? Number(ch) : 1), 0) !== 8)) return null;
    if (/[pP]/.test(rows[0] + rows[7])) return null;
    const turn = parts[1] === 'b' ? 'b' : 'w';
    const fen = [parts[0], turn, /^(-|[KQkq]{1,4})$/.test(parts[2] || '') ? parts[2] : '-', /^(-|[a-h][36])$/.test(parts[3] || '') ? parts[3] : '-',
      /^\d+$/.test(parts[4] || '') ? parts[4] : '0', /^\d+$/.test(parts[5] || '') && Number(parts[5]) > 0 ? parts[5] : '1'].join(' ');
    const g = new Chess(fen);
    if (g.board.filter(p => p === 'wK').length !== 1 || g.board.filter(p => p === 'bK').length !== 1) return null;
    if (g.inCheck(opposite(turn))) return null;
    return fen;
  }

  // PGN gọn để lưu: thẻ chuẩn + FEN (nếu có) + các nước
  function buildPgn(tags, startFen, sans, result) {
    const head = Object.entries(tags).filter(([, v]) => v).map(([k, v]) => `[${k} "${String(v).replace(/"/g, '')}"]`);
    if (startFen !== START_FEN) head.push('[SetUp "1"]', `[FEN "${startFen}"]`);
    const s0 = new Chess(startFen);
    let no = s0.fullmove, side = s0.turn;
    const out = [];
    sans.forEach((san, i) => {
      if (side === 'w') out.push(`${no}.`); else if (i === 0) out.push(`${no}...`);
      out.push(san);
      if (side === 'b') no++;
      side = side === 'w' ? 'b' : 'w';
    });
    out.push(result);
    return head.join('\n') + '\n\n' + out.join(' ') + '\n';
  }

  function importMsg(text, err) {
    const el = $('histImportMsg');
    el.className = 'admin-msg' + (err ? ' err' : '');
    el.textContent = text || '';
  }

  // Tự chọn "Bạn cầm" khi tên người chơi trong PGN trùng tên tài khoản
  function guessSide() {
    const text = $('histImportText').value, me = Profile.me().name.toLowerCase();
    const w = tagOf(text, 'White').toLowerCase(), b = tagOf(text, 'Black').toLowerCase();
    if (me && w === me) $('histImportSide').value = 'w';
    else if (me && b === me) $('histImportSide').value = 'b';
  }

  async function doImport() {
    const text = $('histImportText').value.trim();
    if (!text) { importMsg('Hãy dán PGN của một ván hoặc một thế cờ FEN.', true); return; }
    // Chỉ một thế cờ FEN: đặt lên bàn (2 người) để tự phân tích / chơi tiếp
    const fen = normalFen(text);
    if (fen) {
      loadPosition(fen);
      return;
    }
    if (/^[^\[]*\//.test(text.split('\n')[0]) && !/\d+\./.test(text)) { importMsg('FEN không hợp lệ (kiểm tra số ô mỗi hàng, Vua của hai bên…).', true); return; }
    const tagFen = tagOf(text, 'FEN');
    const startFen = tagFen ? normalFen(tagFen) : START_FEN;
    if (!startFen) { importMsg('Thẻ [FEN] trong PGN không hợp lệ.', true); return; }
    const tmp = new Chess(startFen);
    const tokens = sanTokens(text);
    for (const t of tokens) {
      if (!playSan(tmp, t)) { importMsg(`Không đọc được nước "${t}" (nước thứ ${tmp.history.length + 1}). Hãy kiểm tra lại PGN.`, true); return; }
    }
    if (!tmp.history.length) { importMsg('Không tìm thấy nước đi nào trong PGN.', true); return; }
    const color = $('histImportSide').value;
    const white = tagOf(text, 'White'), black = tagOf(text, 'Black');
    let result = ['1-0', '0-1', '1/2-1/2'].includes(tagOf(text, 'Result')) ? tagOf(text, 'Result') : '*';
    const st = tmp.status();
    if (result === '*' && st === 'checkmate') result = tmp.turn === 'w' ? '0-1' : '1-0';
    else if (result === '*' && st !== 'playing') result = '1/2-1/2';
    const sans = tmp.history.map(h => h.san);
    const pgn = buildPgn({ Event: tagOf(text, 'Event') || 'Ván nhập', Site: tagOf(text, 'Site'), Date: tagOf(text, 'Date'), White: white || '?', Black: black || '?', Result: result }, startFen, sans, result);
    const mine = color === 'b' ? ({ '1-0': '0-1', '0-1': '1-0' }[result] || result) : result; // kết quả theo góc nhìn của mình
    const id = save({
      mode: 'import', result: mine, title: 'Ván nhập', color,
      opp: color === 'w' ? (known(black) ? black : 'Đen') : color === 'b' ? (known(white) ? white : 'Trắng') : `${known(white) ? white : 'Trắng'} – ${known(black) ? black : 'Đen'}`,
      moves: Math.ceil(sans.length / 2), pgn, fen: tmp.fen(),
      note: [tagOf(text, 'Event'), tagOf(text, 'Date')].filter(known).join(' · '),
    });
    if (!id) { importMsg('Không lưu được ván này.', true); return; }
    $('histImportText').value = '';
    $('histImportGo').disabled = true;
    importMsg(`Đã nhập ${sans.length} nước. Stockfish đang phân tích… 0%`);
    render();
    const g = read().find(x => x.id === id);
    const r = await runAnalysis(g, f => importMsg(`Đã nhập ${sans.length} nước. Stockfish đang phân tích… ${Math.round(f * 100)}%`));
    $('histImportGo').disabled = false;
    $('histImport').hidden = true;
    importMsg('');
    const fresh = read().find(x => x.id === id);
    if (fresh) loadOnBoard(fresh, !!r);
    if (!r) toast('Đã nhập ván nhưng không phân tích được (chưa tải được Stockfish).');
  }

  // Đặt một thế cờ (FEN) lên bàn 2 người để phân tích / chơi tiếp
  function loadPosition(fen) {
    $('histModal').hidden = true;
    $('histImport').hidden = true;
    importMsg('');
    const prevMode = $('mode').value;
    $('mode').value = 'none';
    if (mode !== 'play') { setMode('play'); if (mode !== 'play') { $('mode').value = prevMode; return; } }
    else if (!newGame()) { $('mode').value = prevMode; return; }
    game.load(fen);
    aiColor = 'none';
    practice = true;
    ratedDone = true;
    playResult = null;
    if (typeof clockOff === 'function') clockOff();
    seenLen = 0; seenMove = null;
    flipped = game.turn === 'b';
    renderRatedNote();
    render();
    toast('Đã đặt thế cờ lên bàn (2 người) · có thể đi tiếp, xoay bàn, sao chép FEN');
  }

  function loadOnBoard(g, review = false) {
    $('histModal').hidden = true;
    const prevMode = $('mode').value;
    $('mode').value = 'none';
    // Người chơi không muốn bỏ ván đang dở: trả ô chọn chế độ về như cũ
    if (mode !== 'play') { setMode('play'); if (mode !== 'play') { $('mode').value = prevMode; return; } }
    else if (!newGame()) { $('mode').value = prevMode; return; }
    viewPly = null;
    clearSelection();
    hint = null;
    marks.clear();
    aiColor = 'none';
    ratedDone = true;
    practice = true;
    playResult = null;
    thinking = false;
    if (typeof clockOff === 'function') clockOff(); // xem lại ván cũ: không chạy đồng hồ
    if (!replay(g.pgn) && g.fen) {
      try { game.load(g.fen); } catch { game.reset(); }
    }
    seenLen = game.history.length;
    seenMove = seenLen ? game.history[seenLen - 1].move : null;
    flipped = g.color === 'b';
    if (g.rev && typeof setReview === 'function') setReview(g.rev);
    renderRatedNote();
    render();
    if (game.history.length) setViewPly(review && g.rev ? 1 : 0);
    toast(g.rev ? 'Đã tải ván kèm phân tích · dùng ◀ ▶ hoặc phím ← → để xem từng nước' : 'Đã tải ván · dùng ◀ ▶ hoặc phím ← → để xem từng nước');
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
    renderSyncNote();
    openModal('histModal');
    // Lấy ván chơi trên máy khác (điện thoại / máy tính) về rồi vẽ lại
    sync().then(ok => { if (ok && !$('histModal').hidden) render(); });
  }

  function bind() {
    $('histClear').addEventListener('click', () => {
      if (confirm('Xóa toàn bộ nhật ký ván đấu?')) { clear(); render(); }
    });
    $('histDownload').addEventListener('click', download);
    $('histSearch').addEventListener('input', e => { query = e.target.value; render(); });
    $('histMode').addEventListener('change', e => { modeFilter = e.target.value; render(); });
    $('histImportBtn').addEventListener('click', () => {
      const box = $('histImport');
      box.hidden = !box.hidden;
      importMsg('');
      if (!box.hidden) $('histImportText').focus();
    });
    $('histImportCancel').addEventListener('click', () => { $('histImport').hidden = true; importMsg(''); });
    $('histImportGo').addEventListener('click', () => { doImport().catch(() => { $('histImportGo').disabled = false; importMsg('Có lỗi khi nhập ván, thử lại.', true); }); });
    $('histImportText').addEventListener('input', guessSide);
  }

  return { save, update, read, open, bind, render, remove, clear, replay, resultLabel, outcome, label, normalFen, sync, onChange: f => listeners.push(f) };
})();
