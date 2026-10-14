// Contest: giải đấu theo thời gian kiểu Arena. Chỉ admin tạo được contest.
// • Trước giờ bắt đầu: người chơi bấm Đăng ký (hủy đăng ký được). Contest bắt đầu thì đóng đăng ký.
// • Trong giờ thi đấu: web tự ghép cặp những người đã đăng ký đang mở web (xem app.js, phần "Tự ghép cặp"),
//   ván xong thì tự tìm ván tiếp. Thắng +2, hòa +1, thua 0 (rank và Elo vẫn tính như ván Online thường).
// • Kết thúc: xếp hạng theo điểm → số ván thắng → ít ván hơn. Hạng 1/2/3 (đã chơi ít nhất 1 ván) nhận
//   huy chương vàng / bạc / đồng, hiện trên hồ sơ và bảng xếp hạng.
//
// Dữ liệu (Firebase, cần dán lại firebase-rules.json):
//   /contests/<id>            = { name, desc?, start, end, by, byName }          (chỉ admin ghi)
//   /contestScores/<id>/<uid> = { name, pts, games, wins, draws, losses, last }  (mỗi người chỉ ghi dòng của mình)
// Chế độ cục bộ (chưa cấu hình Firebase): lưu trong localStorage của trình duyệt này.

const Contest = (() => {
  const LOCAL_C = 'rg-local-contests';
  const LOCAL_S = 'rg-local-cscores';
  const MAX_SPAN = 7 * 24 * 3600 * 1000; // contest dài tối đa 7 ngày (khớp firebase-rules.json)
  const GRACE = 30 * 60 * 1000;          // ván bắt đầu trước giờ kết thúc vẫn được tính tới 30 phút sau (khớp firebase-rules.json)
  const MIN_GAP = 20000;                 // hai lần ghi điểm cách nhau ít nhất 20 giây (khớp firebase-rules.json)
  const remote = Profile.remote;

  const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const int = v => Math.max(0, Math.floor(Number(v) || 0));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let queue = Promise.resolve(); // ghi điểm lần lượt, không bị đảo thứ tự
  const reg = new Map();         // contest id → đã đăng ký chưa (của tài khoản đang đăng nhập)
  let regOwner = null;
  let medalCache = null;         // { at, data }: bộ đệm của overview()

  // 'upcoming' | 'live' | 'ended'
  function phase(c, t = Date.now()) { return t < c.start ? 'upcoming' : t < c.end ? 'live' : 'ended'; }
  // Đã chốt kết quả (hết cả thời gian gia hạn cho ván đang dở)
  const isFinal = (c, t = Date.now()) => t > c.end + GRACE;

  // ID chỉ gồm chữ thường và số: dùng được luôn làm một phần ID PeerJS của phòng chờ
  function newId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = 'c';
    for (let i = 0; i < 9; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  async function list() {
    const raw = remote ? await Profile.dbCall('contests') : read(LOCAL_C, {});
    return Object.entries(raw || {})
      .filter(([, c]) => c && typeof c.name === 'string' && Number.isFinite(c.start) && Number.isFinite(c.end))
      .map(([id, c]) => ({
        id, name: c.name.slice(0, 60), desc: String(c.desc || '').slice(0, 200),
        start: c.start, end: c.end, byName: String(c.byName || '').slice(0, 20),
      }));
  }

  // Chỉ admin. Máy chủ cũng kiểm tra lại bằng luật Firebase.
  async function create({ name, desc, start, end }) {
    if (!Profile.isAdmin()) throw new Error('DENIED');
    name = String(name || '').trim();
    desc = String(desc || '').trim().slice(0, 200);
    if (name.length < 3 || name.length > 60) throw new Error('NAME');
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > MAX_SPAN) throw new Error('TIME');
    if (start <= Date.now()) throw new Error('PAST'); // phải có thời gian cho mọi người đăng ký
    const id = newId();
    const row = { name, start, end, by: Profile.uid(), byName: Profile.me().name };
    if (desc) row.desc = desc;
    if (remote) {
      await Profile.dbCall('contests/' + id, 'PUT', row);
    } else {
      const all = read(LOCAL_C, {});
      all[id] = row;
      write(LOCAL_C, all);
    }
    medalCache = null;
    return id;
  }

  // Sửa contest (chỉ admin): tên, mô tả; giờ bắt đầu / kết thúc chỉ đổi được khi contest chưa bắt đầu
  async function update(id, { name, desc, start, end }) {
    if (!Profile.isAdmin()) throw new Error('DENIED');
    const all = remote ? null : read(LOCAL_C, {});
    const cur = remote ? await Profile.dbCall('contests/' + id) : all[id];
    if (!cur) throw new Error('GONE');
    const row = { ...cur };
    if (name != null) { name = String(name).trim(); if (name.length < 3 || name.length > 60) throw new Error('NAME'); row.name = name; }
    if (desc != null) { desc = String(desc).trim().slice(0, 200); if (desc) row.desc = desc; else delete row.desc; }
    if (start != null || end != null) {
      if (Date.now() >= cur.start) throw new Error('STARTED');
      const s = start ?? cur.start, e = end ?? cur.end;
      if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s || e - s > MAX_SPAN) throw new Error('TIME');
      if (s <= Date.now()) throw new Error('PAST');
      row.start = s; row.end = e;
    }
    if (remote) await Profile.dbCall('contests/' + id, 'PUT', row);
    else { all[id] = row; write(LOCAL_C, all); }
    medalCache = null;
    return row;
  }

  // Bảng tổng huy chương: [{ uid, name, gold, silver, bronze, total }] (vàng trước, rồi bạc, rồi đồng)
  async function medalTable(fresh = false) {
    const { contests, board } = await overview(fresh);
    const t = {};
    for (const c of contests.filter(c => isFinal(c))) {
      for (const r of board[c.id]) {
        if (!r.medal) continue;
        const x = t[r.uid] = t[r.uid] || { uid: r.uid, name: r.name, gold: 0, silver: 0, bronze: 0, total: 0 };
        x[['gold', 'silver', 'bronze'][r.medal - 1]]++;
        x.total++;
      }
    }
    return Object.values(t).sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || a.name.localeCompare(b.name));
  }

  // Số người đăng ký và tổng số ván (mỗi ván tính cho 2 người) của từng contest
  async function stats(fresh = false) {
    const { board } = await overview(fresh);
    const out = {};
    for (const id in board) out[id] = { players: board[id].length, games: Math.round(board[id].reduce((a, r) => a + r.games, 0) / 2) };
    return out;
  }

  async function remove(id) {
    if (!Profile.isAdmin()) throw new Error('DENIED');
    if (remote) {
      await Profile.dbCall('contestScores/' + id, 'DELETE');
      await Profile.dbCall('contests/' + id, 'DELETE');
    } else {
      const all = read(LOCAL_C, {}), sc = read(LOCAL_S, {});
      delete all[id]; delete sc[id];
      write(LOCAL_C, all); write(LOCAL_S, sc);
    }
    reg.delete(id);
    medalCache = null;
  }

  // Bộ nhớ đăng ký gắn với tài khoản: đổi tài khoản thì xóa
  function regMap() {
    const u = Profile.uid();
    if (u !== regOwner) { reg.clear(); regOwner = u; }
    return reg;
  }

  // Đăng ký tham gia: chỉ trước giờ bắt đầu (làm nhiều lần cũng không sao)
  async function join(c) {
    if (!Profile.signedIn()) throw new Error('DENIED');
    const ph = phase(c);
    if (ph === 'ended') throw new Error('ENDED');
    if (ph === 'live') throw new Error('CLOSED');
    const uid = Profile.uid();
    const row = { name: Profile.me().name, pts: 0, games: 0, wins: 0, draws: 0, losses: 0 };
    if (remote) {
      const path = `contestScores/${c.id}/${uid}`;
      if (!(await Profile.dbCall(path))) await Profile.dbCall(path, 'PUT', { ...row, last: { '.sv': 'timestamp' } });
    } else {
      const all = read(LOCAL_S, {});
      all[c.id] = all[c.id] || {};
      if (!all[c.id][uid]) all[c.id][uid] = { ...row, last: Date.now() };
      write(LOCAL_S, all);
    }
    regMap().set(c.id, true);
  }

  // Hủy đăng ký: chỉ trước giờ bắt đầu
  async function unjoin(c) {
    if (phase(c) !== 'upcoming') throw new Error('CLOSED');
    const uid = Profile.uid();
    if (remote) {
      await Profile.dbCall(`contestScores/${c.id}/${uid}`, 'DELETE');
    } else {
      const all = read(LOCAL_S, {});
      if (all[c.id]) delete all[c.id][uid];
      write(LOCAL_S, all);
    }
    regMap().set(c.id, false);
  }

  // Tài khoản đang đăng nhập đã đăng ký contest này chưa (có bộ nhớ đệm)
  async function registered(c, fresh = false) {
    const m = regMap();
    if (!fresh && m.has(c.id)) return m.get(c.id);
    const uid = Profile.uid();
    if (!uid) return false;
    const row = remote ? await Profile.dbCall(`contestScores/${c.id}/${uid}`) : ((read(LOCAL_S, {})[c.id] || {})[uid] || null);
    const ok = !!row;
    m.set(c.id, ok);
    return ok;
  }

  function rowsOf(raw) {
    const me = Profile.uid();
    return Object.entries(raw || {})
      .filter(([, r]) => r && typeof r.name === 'string')
      .map(([uid, r]) => ({
        uid, name: r.name.slice(0, 20), pts: int(r.pts), games: int(r.games),
        wins: int(r.wins), draws: int(r.draws), losses: int(r.losses), me: uid === me,
      }));
  }

  // Sắp xếp và gán hạng: bằng điểm, bằng số ván thắng và bằng số ván thì cùng hạng
  function standings(rows) {
    rows.sort((a, b) => b.pts - a.pts || b.wins - a.wins || a.games - b.games || a.name.localeCompare(b.name));
    rows.forEach((r, i) => {
      const p = rows[i - 1];
      r.place = p && p.pts === r.pts && p.wins === r.wins && p.games === r.games ? p.place : i + 1;
      r.medal = r.games > 0 && r.place <= 3 ? r.place : 0;
    });
    return rows;
  }

  // Bảng điểm đã sắp xếp
  async function scores(id) {
    const raw = remote ? await Profile.dbCall('contestScores/' + id) : (read(LOCAL_S, {})[id] || {});
    const rows = standings(rowsOf(raw));
    const mine = rows.some(r => r.me);
    regMap().set(id, mine);
    return rows;
  }

  // Tất cả contest kèm bảng điểm đã xếp hạng (dùng chung cho huy chương, lịch sử, top 3), đệm 60 giây
  async function overview(fresh = false) {
    if (!fresh && medalCache && Date.now() - medalCache.at < 60000) return medalCache.data;
    const contests = await list();
    const all = contests.length ? (remote ? await Profile.dbCall('contestScores') : read(LOCAL_S, {})) : {};
    const data = { contests, board: {} };
    for (const c of contests) data.board[c.id] = standings(rowsOf(all && all[c.id]));
    medalCache = { at: Date.now(), data };
    return data;
  }

  // Huy chương của mọi người chơi: uid → [{ id, name, end, place, pts, total }] (chỉ contest đã chốt kết quả)
  async function medals(fresh = false) {
    const { contests, board } = await overview(fresh);
    const data = {};
    for (const c of contests.filter(c => isFinal(c))) {
      const rows = board[c.id];
      for (const r of rows) {
        if (!r.medal) continue;
        (data[r.uid] = data[r.uid] || []).push({ id: c.id, name: c.name, end: c.end, place: r.medal, pts: r.pts, total: rows.length });
      }
    }
    for (const k in data) data[k].sort((a, b) => b.end - a.end);
    return data;
  }

  // Mọi contest một người chơi đã đăng ký, mới nhất trước: [{ id, name, start, end, phase, final, place, total, pts, games, wins, draws, losses, medal }]
  async function history(uid, fresh = false) {
    const { contests, board } = await overview(fresh);
    const out = [];
    for (const c of contests) {
      const rows = board[c.id];
      const r = rows.find(x => x.uid === uid);
      if (!r) continue;
      const final = isFinal(c);
      out.push({
        id: c.id, name: c.name, start: c.start, end: c.end, phase: phase(c), final,
        place: r.place, total: rows.length, pts: r.pts, games: r.games, wins: r.wins, draws: r.draws, losses: r.losses,
        medal: final ? r.medal : 0,
      });
    }
    return out.sort((a, b) => b.end - a.end);
  }

  // Top 3 (đã có huy chương) của các contest đã chốt: id → [{ uid, name, place, pts }]
  async function winners(fresh = false) {
    const { contests, board } = await overview(fresh);
    const out = {};
    for (const c of contests.filter(c => isFinal(c))) out[c.id] = board[c.id].filter(r => r.medal).map(r => ({ uid: r.uid, name: r.name, place: r.medal, pts: r.pts }));
    return out;
  }

  const count = list => [1, 2, 3].map(p => (list || []).filter(m => m.place === p).length);

  // Cộng điểm cho một ván vừa xong (score: 1 thắng, 0.5 hòa, 0 thua).
  // Chỉ tính ván bắt đầu trong giờ contest và kết thúc trước hạn gia hạn.
  // Trả về { pts, name } ngay để hiện trong hộp kết quả; việc ghi lên máy chủ chạy nền.
  function record(c, score, startedAt) {
    const t = Date.now();
    if (!startedAt || startedAt < c.start || startedAt > c.end || t > c.end + GRACE) return null;
    const uid = Profile.uid(); // chốt người chơi ngay lúc ván kết thúc, phòng khi đổi tài khoản trước khi ghi xong
    queue = queue.then(() => bump(c.id, uid, score)).catch(() => {});
    medalCache = null;
    return { pts: score === 1 ? 2 : score === 0 ? 0 : 1, name: c.name };
  }

  async function bump(id, uid, score) {
    const key = score === 1 ? 'wins' : score === 0 ? 'losses' : 'draws';
    const next = r => {
      const n = { wins: int(r.wins), draws: int(r.draws), losses: int(r.losses) };
      n[key]++;
      return { ...n, games: n.wins + n.draws + n.losses, pts: 2 * n.wins + n.draws };
    };
    if (remote) {
      const path = `contestScores/${id}/${uid}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        const row = await Profile.dbCall(path);
        if (!row) return; // chưa đăng ký contest này thì không có điểm
        const gap = Number(row.last) ? MIN_GAP + 1000 - (Date.now() - Number(row.last)) : 0;
        if (gap > 0) await wait(gap);
        try { await Profile.dbCall(path, 'PATCH', { ...next(row), last: { '.sv': 'timestamp' } }); return; }
        catch (e) { if (attempt) throw e; await wait(MIN_GAP + 1000); }
      }
    } else {
      const all = read(LOCAL_S, {});
      const row = all[id] && all[id][uid];
      if (!row) return;
      Object.assign(row, next(row), { last: Date.now() });
      write(LOCAL_S, all);
    }
  }

  return { phase, isFinal, list, create, update, medalTable, stats, remove, join, unjoin, registered, scores, medals, history, winners, count, record, MAX_SPAN, GRACE };
})();
