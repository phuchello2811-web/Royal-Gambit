// Hồ sơ người chơi, điểm Elo, cài đặt và bảng xếp hạng.
// Có cấu hình Firebase (config.js) thì điểm được đồng bộ lên bảng xếp hạng chung,
// mỗi trình duyệt là một tài khoản ẩn danh. Không có thì chỉ lưu trên máy này.

const Profile = (() => {
  const KEY = 'covua-profile';
  const AUTH_KEY = 'covua-auth';
  const PREFS_KEY = 'covua-prefs';
  const START = 1200;
  const AI_RATING = { 1: 800, 2: 1200, 3: 1600 };
  const cfg = window.LEADERBOARD || {};
  const remote = !!(cfg.apiKey && cfg.databaseURL);
  const db = (cfg.databaseURL || '').replace(/\/+$/, '');

  const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const fresh = () => ({ rating: START, games: 0, wins: 0, draws: 0, losses: 0 });
  let me = { name: 'Khách ' + Math.floor(1000 + Math.random() * 9000), ...fresh(), ...read(KEY, {}) };
  let prefs = { board: 'green', sound: true, ...read(PREFS_KEY, {}) };
  let auth = read(AUTH_KEY, null);
  let queue = Promise.resolve();
  const listeners = [];

  function save() {
    write(KEY, me);
    listeners.forEach(f => f());
  }

  function cleanName(s) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 20); }

  const expected = (a, b) => 1 / (1 + 10 ** ((b - a) / 400));

  // score: 1 thắng, 0.5 hòa, 0 thua. Trả về điểm trước/sau.
  function record(score, oppRating) {
    const before = me.rating;
    const k = me.games < 20 ? 40 : 20; // ván đầu thay đổi nhanh hơn để sớm về đúng trình độ
    me.rating = Math.max(100, Math.min(3000, Math.round(before + k * (score - expected(before, oppRating)))));
    me.games++;
    if (score === 1) me.wins++;
    else if (score === 0) me.losses++;
    else me.draws++;
    save();
    sync();
    return { before, after: me.rating, delta: me.rating - before };
  }

  function setName(name) {
    name = cleanName(name);
    if (name.length < 2) return false;
    me.name = name;
    save();
    sync();
    return true;
  }

  // ---------- Firebase: đăng nhập ẩn danh + Realtime Database qua REST ----------

  async function json(res) {
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && (data.error && (data.error.message || data.error))) || res.status);
    return data;
  }

  async function token() {
    if (auth && Date.now() < auth.expires - 60000) return auth.idToken;
    if (auth && auth.refreshToken) {
      try {
        const r = await json(await fetch(`https://securetoken.googleapis.com/v1/token?key=${cfg.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(auth.refreshToken),
        }));
        auth = { uid: r.user_id, idToken: r.id_token, refreshToken: r.refresh_token, expires: Date.now() + r.expires_in * 1000 };
        write(AUTH_KEY, auth);
        return auth.idToken;
      } catch { /* hết hạn: tạo tài khoản mới bên dưới */ }
    }
    const r = await json(await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${cfg.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    }));
    auth = { uid: r.localId, idToken: r.idToken, refreshToken: r.refreshToken, expires: Date.now() + r.expiresIn * 1000 };
    write(AUTH_KEY, auth);
    return auth.idToken;
  }

  const myUrl = t => `${db}/players/${auth.uid}.json?auth=${t}`;

  // Lấy bản ghi trên server làm chuẩn; chưa có thì tạo mới (luật server chỉ cho tạo với 1200 điểm)
  async function pull() {
    const t = await token();
    const r = await json(await fetch(myUrl(t)));
    if (r) {
      Object.assign(me, { rating: r.rating, games: r.games, wins: r.wins, draws: r.draws, losses: r.losses });
      save();
    } else {
      Object.assign(me, fresh());
      save();
      await put(t);
    }
  }

  async function put(t) {
    const body = { name: me.name, rating: me.rating, games: me.games, wins: me.wins, draws: me.draws, losses: me.losses, updated: { '.sv': 'timestamp' } };
    await json(await fetch(myUrl(t), { method: 'PUT', body: JSON.stringify(body) }));
  }

  // Ghi lần lượt theo hàng đợi để không bị đảo thứ tự
  function sync() {
    if (!remote) return;
    queue = queue.then(async () => {
      try { await put(await token()); }
      catch { try { await pull(); } catch {} } // lệch dữ liệu với server: lấy lại bản trên server
    });
  }

  async function leaderboard() {
    const bots = [800, 1200, 1600].map((rating, i) => ({ name: 'Máy – ' + ['Dễ', 'Trung bình', 'Khó'][i], rating, bot: true }));
    let players;
    if (remote) {
      const r = await json(await fetch(`${db}/players.json?orderBy=%22rating%22&limitToLast=100`));
      players = Object.entries(r || {})
        .filter(([, p]) => p && p.games > 0)
        .map(([uid, p]) => ({ ...p, name: cleanName(p.name), me: auth && uid === auth.uid }));
      if (!players.some(p => p.me) && me.games > 0) players.push({ ...me, me: true });
    } else {
      players = me.games > 0 ? [{ ...me, me: true }] : [];
    }
    return [...players, ...bots].sort((a, b) => b.rating - a.rating);
  }

  if (remote) queue = queue.then(pull).catch(() => {});

  return {
    me: () => me,
    remote,
    record,
    setName,
    leaderboard,
    expected,
    aiRating: level => AI_RATING[level],
    prefs: () => prefs,
    setPref(k, v) { prefs[k] = v; write(PREFS_KEY, prefs); listeners.forEach(f => f()); },
    onChange: f => listeners.push(f),
  };
})();
