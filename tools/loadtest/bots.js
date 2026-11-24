// THỬ TẢI BẰNG BOT (MÔ PHỎNG) — chạy trên Firebase Emulator, không đụng dữ liệu thật.
// Mỗi bot là một "người chơi giả lập": tạo tài khoản trên Auth Emulator, chọn trình độ, vào hàng đợi tìm trận,
// ghép cặp bằng ĐÚNG hàm pairFor()/eloWindow() trích nguyên văn từ online.js, đánh cờ qua kênh relay Firebase
// (đường dự phòng của sản phẩm), mọi nước đi được kiểm tra bằng chess.js của sản phẩm, rồi ghi kết quả + Elo
// dưới luật bảo mật thật (firebase-rules.json) và công thức Elo trích nguyên văn từ profile.js.
// Khác biệt có chủ đích so với người thật (ghi rõ trong báo cáo):
//  - Node.js không có WebRTC nên bot luôn dùng kênh relay Firebase (sản phẩm dùng kênh này khi WebRTC bị chặn).
//  - Không có máy chủ PeerJS: bên được nối tới mở kênh theo quy ước tên kênh <pid chủ>~<pid khách> như linkOf().
//  - Nước đi là nước hợp lệ ngẫu nhiên; ván dừng ở số nước ngẫu nhiên, bên thua xác định theo xác suất Elo kỳ vọng.
// Cách dùng (cần emulator đang chạy, xem run.sh): node tools/loadtest/bots.js --bots 200 --minutes 3 --out kq.json
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const { Chess, sqName } = require(path.join(ROOT, 'chess.js'));

// ---------- tham số ----------
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const N = Number(arg('bots', 100)), MINUTES = Number(arg('minutes', 3)), OUT = arg('out', '');
const PROJECT = arg('project', 'demo-rg');
const AUTH = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1`;
const DB = 'http://127.0.0.1:9000', NS = `${PROJECT}-default-rtdb`;
const TC = '300-0';
const RAMP_MS = Number(arg('ramp', 20)) * 1000; // các bot vào dần trong khoảng này
const RUN = arg('run', Date.now().toString(36).slice(-4)); // tiền tố tên để chạy nhiều lần trên cùng emulator

// ---------- trích nguyên văn mã sản phẩm ----------
const onl = fs.readFileSync(path.join(ROOT, 'online.js'), 'utf8');
const q0 = onl.indexOf('  const QUEUE_POLL'), q1 = onl.indexOf('  const queuePath');
const queueSrc = onl.slice(q0, q1);
const { pairFor, eloWindow, QUEUE_POLL, QUEUE_BEAT, QUEUE_STALE, QUEUE_SKIP, QUEUE_PASSIVE } =
  vm.runInNewContext(queueSrc + '\n({ pairFor, eloWindow, QUEUE_POLL, QUEUE_BEAT, QUEUE_STALE, QUEUE_SKIP, QUEUE_PASSIVE })', { Math, Infinity });
const prof = fs.readFileSync(path.join(ROOT, 'profile.js'), 'utf8');
const consts = prof.slice(prof.indexOf('  const START_ELO'), prof.indexOf('  const HIGH_ELO')) + prof.match(/  const HIGH_ELO[^\n]*\n/)[0];
const eloSrc = prof.slice(prof.indexOf('  const clampElo'), prof.indexOf('  const preview'));
const eloCtx = { Math, Number, me: null };
const { eloDelta, clampElo } = vm.runInNewContext(consts + eloSrc + '\n({ eloDelta, clampElo })', eloCtx);
const PLACEMENT = [...prof.matchAll(/\{ id: '\w+',\s+name: '[^']+',\s+elo: (\d+)/g)].map(m => Number(m[1])); // 400, 700, 1000, 1200, 1500

// ---------- số liệu ----------
const M = { matchMs: [], moveLagMs: [], pairGap: [], games: 0, plies: 0, illegal: 0, desync: 0, full: 0, timeouts: 0, noStart: 0, stalled: 0,
  legitWrites: 0, legitRejected: [], cheatTried: 0, cheatBlocked: 0, eloDeltaSum: [], requests: 0, bytesIn: 0, errors: {},
  queueSize: [], startedAt: 0 };
const bump = (k) => { M.errors[k] = (M.errors[k] || 0) + 1; };

async function req(url, opts = {}) {
  M.requests++;
  const r = await fetch(url, opts);
  const text = await r.text();
  M.bytesIn += text.length;
  let body = null; try { body = JSON.parse(text); } catch {}
  return { status: r.status, body };
}
const dbUrl = (p, tok) => `${DB}/${p}.json?ns=${NS}` + (tok ? `&auth=${tok}` : '');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };

// ---------- kênh relay (bản Node của relayConn trong online.js: PATCH nhánh của mình, nghe nhánh bên kia) ----------
function relay(ch, mine, theirs, onData) {
  const base = `${DB}/relay/${ch}`;
  let seq = 0, next = 0, closed = false, queue = {}, flying = false, fails = 0;
  const got = new Map(), key = n => String(n).padStart(6, '0');
  const ctrl = new AbortController();
  const r = { open: false, onOpen: null, onClose: null };
  async function flush() {
    if (flying || closed && !Object.keys(queue).length) return;
    if (!Object.keys(queue).length) return;
    const batch = queue; queue = {}; flying = true;
    let ok = false;
    try {
      const res = await req(`${base}/${mine}.json?ns=${NS}`, { method: 'PATCH', body: JSON.stringify(batch) });
      ok = res.status === 200;
      if (!ok) bump('relay-' + res.status);
    } catch { bump('relay-net'); }
    if (!ok) { // như relayConn của sản phẩm: chờ 1–5 giây rồi gửi lại
      queue = { ...batch, ...queue }; fails++;
      await sleep(Math.min(1000 + fails * 500, 5000));
    } else fails = 0;
    flying = false; if (!closed || !ok) flush();
  }
  r.send = d => { if (!closed) { queue[key(seq++)] = JSON.stringify(d); flush(); } };
  function take(entries) {
    for (const [k, v] of entries) if (/^\d{6}$/.test(k) && typeof v === 'string' && Number(k) >= next) got.set(Number(k), v);
    while (got.has(next)) {
      let d = null; try { d = JSON.parse(got.get(next)); } catch {}
      got.delete(next++);
      if (closed || !d) continue;
      if (d.t === '_r') { if (!r.open) { r.open = true; r.onOpen && r.onOpen(); } continue; }
      if (d.t === '_x') { r.shut(); r.onClose && r.onClose(); return; }
      if (r.open) onData(d);
    }
  }
  (async () => { // REST streaming (Server-Sent Events) như EventSource trong trình duyệt
    try {
      M.requests++;
      const res = await fetch(`${base}/${theirs}.json?ns=${NS}`, { headers: { Accept: 'text/event-stream' }, signal: ctrl.signal });
      const dec = new TextDecoder(); let buf = '';
      for await (const chunk of res.body) {
        buf += dec.decode(chunk, { stream: true }); M.bytesIn += chunk.length;
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i); buf = buf.slice(i + 2);
          const ev = /event: (\w+)/.exec(block), data = /data: (.*)/.exec(block);
          if (!ev || !data || !/put|patch/.test(ev[1])) continue;
          let m = null; try { m = JSON.parse(data[1]); } catch {}
          if (!m || !m.data) continue;
          if (m.path === '/') take(Object.entries(m.data)); else take([[m.path.slice(1), m.data]]);
        }
      }
    } catch (e) { if (!closed) bump('sse'); }
  })();
  r.shut = () => { if (closed) return; closed = true; r.open = false; ctrl.abort(); };
  r.close = () => {
    if (closed) return;
    queue[key(seq++)] = JSON.stringify({ t: '_x' }); flush();
    setTimeout(() => { r.shut(); req(`${base}/${mine}.json?ns=${NS}`, { method: 'DELETE' }).catch(() => {}); }, 1500);
  };
  r.send({ t: '_r' });
  return r;
}

// ---------- một bot ----------
class Bot {
  constructor(i) { this.inbox = new Map(); this.i = i; this.name = 'B' + RUN + '_' + String(i).padStart(4, '0'); this.busy = null; }

  async signUp() {
    const r = await req(`${AUTH}/accounts:signUp?key=fake-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.name.toLowerCase() + '@rg-user.app', password: 'loadtest-' + this.i, returnSecureToken: true }) });
    if (!r.body || !r.body.idToken) throw new Error('signUp ' + r.status);
    this.tok = r.body.idToken; this.uid = r.body.localId;
    // Hồ sơ mới đúng như sản phẩm tạo (luật: elo 800, placed false, lastGame = now)
    this.me = { name: this.name, exp: 0, elo: 800, placed: false, eloGames: 0, games: 0, wins: 0, draws: 0, losses: 0 };
    await this.write('players/' + this.uid, 'PUT', { ...this.me, lastGame: { '.sv': 'timestamp' } });
    // Chọn trình độ như màn hình "Bạn chơi cờ ở mức nào?" (5 mức của profile.js)
    const elo = PLACEMENT[Math.floor(Math.random() * PLACEMENT.length)] + Math.round((Math.random() - 0.5) * 100);
    this.me.elo = Math.max(400, Math.min(1500, elo)); this.me.placed = true;
    await this.write('players/' + this.uid, 'PATCH', { elo: this.me.elo, placed: true, eloGames: 0 });
  }

  async write(p, method, body) {
    M.legitWrites++;
    const r = await req(dbUrl(p, this.tok), { method, body: JSON.stringify(body) });
    if (r.status !== 200) M.legitRejected.push(`${method} ${p.split('/')[0]} ${r.status} ${JSON.stringify(r.body).slice(0, 80)}`);
    return r;
  }

  // Thử gian lận: ghi trực tiếp Elo +100, ghi hộ hàng đợi người khác, ghi thời điểm chờ ở tương lai. Phải bị chặn hết.
  async cheat(other) {
    const tries = [
      ['players/' + this.uid, 'PATCH', { elo: this.me.elo + 100 }],
      [`matchq/${TC}/${other.uid}`, 'PUT', { elo: 3000, pid: 'x', at: { '.sv': 'timestamp' }, since: 0 }],
      [`matchq/${TC}/${this.uid}`, 'PUT', { elo: this.me.elo, pid: 'x', at: { '.sv': 'timestamp' }, since: Date.now() + 3600e3 }],
      ['players/' + other.uid, 'PATCH', { elo: 100 }],
    ];
    for (const [p, m, b] of tries) {
      M.cheatTried++;
      const r = await req(dbUrl(p, this.tok), { method: m, body: JSON.stringify(b) });
      if (r.status === 401 || r.status === 403) M.cheatBlocked++;
    }
    await req(dbUrl(`matchq/${TC}/${this.uid}`, this.tok), { method: 'DELETE' });
  }

  async run(until) {
    while (Date.now() < until) {
      try { await this.searchAndPlay(until); } catch (e) { bump('bot:' + e.message); }
      await sleep(1000 + Math.random() * 2000);
    }
  }

  // Tìm trận: ghi hàng đợi, đọc danh sách mỗi QUEUE_POLL, ghép bằng pairFor (như queueTry trong online.js)
  async searchAndPlay(until) {
    const pid = 'rg-' + this.uid.slice(0, 10) + '-' + Math.random().toString(36).slice(2, 8);
    const qpath = `matchq/${TC}/${this.uid}`;
    const t0 = Date.now();
    let since = null, skew = 0, lastBeat = 0, expect = null; const skip = {};
    this.pid = pid; this.game = null;
    const beat = async () => {
      const r = await this.write(qpath, 'PUT', { elo: this.me.elo, pid, at: { '.sv': 'timestamp' }, since: since || { '.sv': 'timestamp' } });
      if (r.body && Number.isFinite(r.body.at)) { skew = r.body.at - Date.now(); since = r.body.since; }
      lastBeat = Date.now();
    };
    await beat();
    this.inbox = new Map(); // các kênh khách mở tới mình (sản phẩm: máy chủ PeerJS báo mọi kết nối tới)
    while (Date.now() < until && !this.game) {
      if (Date.now() - lastBeat > QUEUE_BEAT) await beat();
      const r = await req(dbUrl('matchq/' + TC, this.tok));
      const rows = r.body || {}, now = Date.now() + skew, list = [];
      M.queueSize.push(Object.keys(rows).length);
      for (const [uid, x] of Object.entries(rows)) {
        if (!x || !Number.isFinite(x.elo) || !Number.isFinite(x.since) || typeof x.pid !== 'string') continue;
        if (uid !== this.uid && (now - x.at > QUEUE_STALE || skip[x.pid] > now)) continue;
        list.push({ uid, elo: x.elo, since: x.since, pid: x.pid });
      }
      if (!list.some(x => x.uid === this.uid) && since) list.push({ uid: this.uid, elo: this.me.elo, since, pid });
      const other = since ? pairFor(list, this.uid, now) : null;
      if (other) {
        if (this.uid < other.uid) { // bên uid nhỏ chủ động nối (khách), như online.js
          const ok = await this.connectTo(other, t0);
          if (!ok) { skip[other.pid] = now + QUEUE_SKIP; }
        } else { // chờ bên kia nối tới; quá QUEUE_PASSIVE thì tạm bỏ qua họ
          if (!this.inbox.has(other.pid)) this.listenFor(other, t0);
          if (!expect || expect.pid !== other.pid) expect = { pid: other.pid, at: now };
          else if (now - expect.at > QUEUE_PASSIVE && !this.game) { skip[other.pid] = now + QUEUE_SKIP; expect = null; this.dropIncoming(other.pid); }
        }
      }
      if (!this.game) await sleep(QUEUE_POLL);
    }
    await req(dbUrl(qpath, this.tok), { method: 'DELETE' });
    if (!this.game) { M.timeouts++; this.dropIncoming(); return; }
    this.dropIncoming(); // các khách khác: báo bận
    await this.game.done;
  }

  listenFor(other, t0) {
    const ch = `${this.pid}~${other.pid}`.replace(/[.#$[\]/]/g, '_');
    const c = relay(ch, 'h', 'g', d => { if (this.game && this.game.c === c) this.onData(d); });
    this.inbox.set(other.pid, c);
    c.onOpen = () => {
      if (this.game) { c.send({ t: 'full' }); c.close(); this.inbox.delete(other.pid); return; } // đang nối với người khác: báo bận
      M.matchMs.push(Date.now() - t0);
      M.pairGap.push(Math.abs(this.me.elo - other.elo));
      this.inbox.delete(other.pid);
      this.startGame(c, other, true);
    };
  }
  dropIncoming(pid) {
    for (const [k, c] of this.inbox) if (!pid || k === pid) { c.send({ t: 'full' }); c.close(); this.inbox.delete(k); }
  }

  async connectTo(other, t0) {
    const ch = `${other.pid}~${this.pid}`.replace(/[.#$[\]/]/g, '_');
    return new Promise(resolve => {
      let settled = false;
      // Kênh mở khi nhận '_r' của chủ; ván chỉ thật sự bắt đầu khi chủ gửi 'start' (chủ bận thì gửi 'full')
      const c = relay(ch, 'g', 'h', d => {
        if (d.t === 'full') {
          M.full++; c.close();
          if (!settled) { settled = true; resolve(false); }
          const g = this.game;
          if (g && g.c === c && !g.color) { g.over = true; this.game = null; g.finish(); }
          return;
        }
        if (d.t === 'start' && this.game && this.game.c === c && !this.game.color) M.matchMs.push(Date.now() - t0);
        if (this.game && this.game.c === c) this.onData(d);
      });
      c.onOpen = () => {
        if (settled) return;
        settled = true;
        this.startGame(c, other, false);
        setTimeout(() => { const g = this.game; if (g && g.c === c && !g.color) { M.noStart++; g.over = true; c.close(); this.game = null; g.finish(); } }, 10000);
        resolve(true);
      };
      setTimeout(() => { if (!settled) { settled = true; c.close(); resolve(false); } }, 5000 + 10000 + 2000); // DIRECT_WAIT + RELAY_WAIT + 2 s
    });
  }

  startGame(c, other, host) {
    let finish; const done = new Promise(r => (finish = r));
    const g = { c, other, host, chess: new Chess(), color: null, oppElo: other.elo, done, finish, over: false,
      limit: 30 + Math.floor(Math.random() * 50) };
    this.game = g;
    g.last = Date.now();
    g.watch = setInterval(() => { // đối thủ im lặng quá lâu: kết thúc ván (sản phẩm: xử thua sau FORFEIT_MS)
      if (g.over) return clearInterval(g.watch);
      if (g.color && Date.now() - g.last > 30000) { M.stalled++; clearInterval(g.watch); this.end(0.5, 'stalled'); }
    }, 5000);
    if (host) {
      g.color = Math.random() < 0.5 ? 'w' : 'b';
      c.send({ t: 'hello', elo: this.me.elo, uid: this.uid });
      c.send({ t: 'start', color: g.color === 'w' ? 'b' : 'w' });
      this.maybeMove();
    } else c.send({ t: 'hello', elo: this.me.elo, uid: this.uid });
  }

  onData(d) {
    const g = this.game;
    if (!g || g.over) return;
    g.last = Date.now();
    if (d.t === 'hello') { g.oppElo = d.elo; return; }
    if (d.t === 'start') { g.color = d.color; this.maybeMove(); return; }
    if (d.t === 'move') {
      M.moveLagMs.push(Date.now() - d.ts);
      const [f, t, p] = [d.uci.slice(0, 2), d.uci.slice(2, 4), d.uci[4]];
      const sq = s => (8 - Number(s[1])) * 8 + 'abcdefgh'.indexOf(s[0]);
      const m = g.chess.move({ from: sq(f), to: sq(t), promotion: p ? p.toUpperCase() : undefined });
      if (!m) { M.illegal++; return this.end(0.5, 'illegal'); }
      if (d.fen && d.fen !== g.chess.fen()) M.desync++;
      if (g.chess.isGameOver()) return this.end(this.score(), 'over');
      this.maybeMove();
      return;
    }
    if (d.t === 'resign') return this.end(1, 'resign');
    if (d.t === 'over') return this.end(this.score(), 'over');
  }

  score() {
    const g = this.game, st = g.chess.status();
    if (st === 'checkmate') return g.chess.turn === g.color ? 0 : 1;
    return 0.5;
  }

  maybeMove() {
    const g = this.game;
    if (!g || g.over || !g.color || g.chess.turn !== g.color) return;
    setTimeout(() => {
      if (g.over) return;
      if (g.chess.history.length >= g.limit) { // dừng ván: bên thua chọn theo xác suất Elo kỳ vọng
        const pWin = 1 / (1 + Math.pow(10, (g.oppElo - this.me.elo) / 400));
        if (Math.random() > pWin) { g.c.send({ t: 'resign' }); return this.end(0, 'resign'); }
      }
      const moves = g.chess.legalMoves();
      if (!moves.length) return;
      const m = moves[Math.floor(Math.random() * moves.length)];
      const uci = sqName(m.from) + sqName(m.to) + (m.promotion ? m.promotion.toLowerCase() : '');
      g.chess.move(m);
      M.plies++;
      g.c.send({ t: 'move', uci, ts: Date.now(), fen: g.chess.fen() });
      if (g.chess.isGameOver()) { g.c.send({ t: 'over' }); return this.end(this.score(), 'over'); }
    }, 300 + Math.random() * 900);
  }

  async end(score, why) {
    const g = this.game;
    if (!g || g.over) return;
    g.over = true;
    M.games += 0.5; // mỗi ván được hai bot cùng đếm
    // Ghi kết quả + Elo như profile.js (sync): luật chỉ cho đổi tối đa 40 Elo/ván, cách ván trước > 10 giây
    eloCtx.me = this.me;
    const delta = eloDelta(score, g.oppElo);
    const me = this.me;
    me.elo = clampElo(me.elo + delta); me.eloGames++; me.games++;
    if (score === 1) { me.wins++; me.exp += 15; } else if (score === 0) { me.losses++; me.exp = me.exp >= 10 ? me.exp - 10 : 0; } else { me.draws++; me.exp += 5; }
    M.eloDeltaSum.push(delta);
    await sleep(200);
    await this.write('players/' + this.uid, 'PATCH', { exp: me.exp, games: me.games, wins: me.wins, draws: me.draws, losses: me.losses,
      elo: me.elo, eloGames: me.eloGames, lastGame: { '.sv': 'timestamp' } });
    g.c.close();
    g.finish();
  }
}

// ---------- chạy ----------
(async () => {
  console.log(`Bot: ${N} · thời gian: ${MINUTES} phút · emulator ${NS}`);
  const bots = Array.from({ length: N }, (_, i) => new Bot(i + 1));
  const t = Date.now();
  for (let i = 0; i < N; i += 25) await Promise.all(bots.slice(i, i + 25).map(b => b.signUp().catch(e => bump('signup:' + e.message))));
  console.log(`Tạo ${N} tài khoản giả lập trong ${((Date.now() - t) / 1000).toFixed(1)} s`);
  const ready = bots.filter(b => b.uid);
  for (let i = 0; i + 1 < Math.min(20, ready.length); i += 2) await ready[i].cheat(ready[i + 1]); // 10 bot thử gian lận
  M.startedAt = Date.now();
  const until = M.startedAt + MINUTES * 60e3;
  await Promise.all(ready.map((b, i) => sleep(Math.random() * RAMP_MS).then(() => b.run(until))));
  await sleep(4000);
  const sum = a => a.reduce((x, y) => x + y, 0);
  const R = {
    bots: N, created: ready.length, minutes: MINUTES,
    games: Math.floor(M.games), gamesPerMin: +(M.games / MINUTES).toFixed(1), plies: M.plies,
    matchMs: { median: pct(M.matchMs, 50), p95: pct(M.matchMs, 95), n: M.matchMs.length },
    pairGap: { median: pct(M.pairGap, 50), p95: pct(M.pairGap, 95), max: Math.max(0, ...M.pairGap) },
    moveLagMs: { median: pct(M.moveLagMs, 50), p95: pct(M.moveLagMs, 95), p99: pct(M.moveLagMs, 99), n: M.moveLagMs.length },
    illegalMoves: M.illegal, boardDesync: M.desync, busyReplies: M.full, noStart: M.noStart, stalledGames: M.stalled, unmatchedAtEnd: M.timeouts,
    legitWrites: M.legitWrites, legitRejected: M.legitRejected.length, legitRejectedSample: M.legitRejected.slice(0, 5),
    cheatTried: M.cheatTried, cheatBlocked: M.cheatBlocked,
    eloDeltaMean: +(sum(M.eloDeltaSum) / Math.max(1, M.eloDeltaSum.length)).toFixed(2),
    queueSize: { median: pct(M.queueSize, 50), max: Math.max(0, ...M.queueSize) },
    requests: M.requests, requestsPerSec: +(M.requests / (MINUTES * 60)).toFixed(0), MBin: +(M.bytesIn / 1e6).toFixed(1),
    errors: M.errors,
  };
  console.log(JSON.stringify(R, null, 2));
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(R, null, 2));
  process.exit(0);
})();
