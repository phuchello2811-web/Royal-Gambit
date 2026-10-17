// Giao diện: vẽ bàn cờ, kéo thả quân, hiệu ứng, đăng nhập, rank, Elo và bảng xếp hạng.

// Kiểm tra các file đã được cập nhật đủ chưa (tránh lỗi âm thầm khi trộn file cũ và mới)
if (typeof Profile === 'undefined' || !Profile.BOT_ELO || typeof Online === 'undefined' || !Online.oppElo || !document.getElementById('placeModal') ||
    !Profile.isAdmin || !document.getElementById('adminModal') || !document.getElementById('adminNote') ||
    !Online.findMatch || typeof Contest === 'undefined' || !Profile.dbCall || !document.getElementById('contestModal') ||
    !Contest.medals || !Online.startedAt || typeof Learn === 'undefined' || !Learn.enter || !document.getElementById('contestBanner') ||
    !document.getElementById('learnHome')) {
  throw new Error('Thiếu file mới: hãy thay đủ index.html, app.js, profile.js, online.js, contest.js, lessons.js, learn.js, sound.js, style.css rồi bấm Ctrl+F5');
}

const MIN_RANKED_PLIES = 4; // ván ngắn hơn 4 nước (tính cả hai bên) không tính rank/Elo
const BOT_ELO = Profile.BOT_ELO; // Elo của máy theo độ khó
const COLOR_NAME = { w: 'Trắng', b: 'Đen' };
const LEVEL_NAME = { 1: 'Dễ', 2: 'Trung bình', 3: 'Khó' };
const REASONS = {
  checkmate: 'Chiếu hết',
  stalemate: 'Hết nước đi (pat)',
  fifty: 'Luật 50 nước',
  repetition: 'Lặp lại thế cờ 3 lần',
  insufficient: 'Không đủ quân để chiếu hết',
};
const THEMES = [
  ['green', 'Xanh lá', '#ebecd0', '#739552'],
  ['brown', 'Gỗ', '#f0d9b5', '#b58863'],
  ['blue', 'Xanh dương', '#dee3e6', '#8ca2ad'],
  ['purple', 'Tím', '#efe6f7', '#9479b8'],
  ['night', 'Đêm', '#9fa8b5', '#4f5b6c'],
  ['marble', 'Cẩm thạch', '#e8e6e1', '#7a7a7a'],
  ['red', 'Đỏ', '#f5d6d0', '#b3544a'],
  ['emerald', 'Ngọc lục', '#d4f0e0', '#2e7d5b'],
  ['wood', 'Gỗ tối', '#e8c9a0', '#8b5a2b'],
  ['gradient', 'Gradient', 'linear-gradient(135deg,#667eea,#764ba2)', 'linear-gradient(135deg,#f093fb,#f5576c)'],
  ['sunset', 'Hoàng hôn', 'linear-gradient(160deg,#ff9a3c,#e85d04)', 'linear-gradient(160deg,#7209b7,#240046)'],
  ['ocean', 'Đại dương', 'linear-gradient(145deg,#00f5d4,#00bbf9)', 'linear-gradient(145deg,#0096c7,#023e8a)'],
];

// Skin quân cờ. Skin có `true` là bộ quân SVG riêng (pieces/<skin>/, tạo bằng: node tools/make-skins.js),
// các skin còn lại dùng bộ gốc kèm bộ lọc màu trong style.css
const PIECE_SKINS = [
  ['default', 'Mặc định'],
  ['royal', 'Hoàng gia', true],
  ['crystal', 'Pha lê', true],
  ['walnut', 'Gỗ khắc', true],
  ['jewel', 'Ngọc', true],
  ['cyber', 'Cyber', true],
  ['gold', 'Vàng'],
  ['neon', 'Neon'],
  ['mono', 'Đen trắng'],
  ['ice', 'Băng'],
  ['fire', 'Lửa'],
  ['soft', 'Mềm'],
];
const SVG_SKINS = new Set(PIECE_SKINS.filter(s => s[2]).map(s => s[0]));
const GLOW_BOARDS = new Set(['gradient', 'sunset', 'ocean']); // bàn gradient có viền toả sáng (style.css)

const game = new Chess();
const $ = id => document.getElementById(id);
const boardEl = $('board');

let selected = -1;      // ô đang chọn
let selectedMoves = []; // các nước hợp lệ của quân đang chọn
let flipped = false;
let aiColor = $('mode').value; // 'w' | 'b' | 'none'
let gameLevel = Number($('level').value);
let thinking = false;
let gameId = 0;         // để bỏ qua kết quả AI của ván cũ
let mode = 'play';      // 'play' (máy / 2 người) | 'online' | 'learn'
let hint = null;        // {from, to}: nước gợi ý đang tô sáng
let marks = new Set();  // ô được đánh dấu bằng chuột phải
let playResult = null;  // xin thua ở chế độ Chơi: { winner, reason, score }
let ratedDone = false;  // ván hiện tại đã xử lý kết quả chưa
let quietResult = false;
let assisted = false;   // ván với máy có dùng Gợi ý / Đi lại thì không tính Elo
let practice = false;   // ván tập từ Thư viện (bắt đầu từ khai cuộc / thế tàn cuộc): không tính Elo
let seenMove = null, seenLen = 0; // để nhận ra nước mới cần hiệu ứng
let skipAnim = false;   // nước vừa đi bằng kéo thả thì không cần trượt
let viewPly = null;     // null = đang ở thế cờ live; số = đang xem lại sau N nước
let redoStack = [];     // các nước đã undo, dùng cho "Đi tiếp"
let gameReview = null;  // bản phân tích kiểu chess.com của ván trên bàn (xem phần "Phân tích ván")
let showEval = true;    // hiện thanh đánh giá
let drag = null;
const contestById = new Map(); // tra contest theo id (kể cả khi đang chơi ván contest)
// Tự ghép cặp contest (xem phần "Contest: tự ghép cặp" ở cuối file)
const AUTO_NEXT = 8000; // ván contest xong bao lâu thì tự tìm ván tiếp
const Auto = {
  mine: [],          // contest sắp / đang diễn ra mà mình đã đăng ký
  paused: new Set(), // contest người chơi đã tạm dừng tự ghép
  running: null,     // contest đang tự ghép / đang đấu
  doneAt: 0,         // lúc ván contest vừa xong
  retryAt: 0,        // tìm lỗi (mạng...) thì chờ tới lúc này mới thử lại
};

const skinSrc = (skin, p) => SVG_SKINS.has(skin) ? `pieces/${skin}/${p}.svg` : `pieces/${p}.svg`;
const pieceSrc = p => skinSrc(Profile.prefs().pieces, p);
const disp = i => flipped ? 63 - i : i; // vị trí hiển thị của ô i
const rowCol = i => [disp(i) >> 3, disp(i) & 7];

// ---------------- Vẽ bàn cờ ----------------

function boardAt(ply) {
  let g;
  try { g = new Chess(game.startFen || undefined); } catch { g = new Chess(); }
  const n = Math.max(0, Math.min(ply, game.history.length));
  for (let i = 0; i < n; i++) {
    const m = game.history[i].move;
    if (!m) break;
    if (!g.move({ from: m.from, to: m.to, promotion: m.promotion || undefined })) break;
  }
  return g;
}

function isLiveView() {
  return viewPly == null || viewPly >= game.history.length;
}

function setViewPly(ply) {
  if (ply == null || ply >= game.history.length) viewPly = null;
  else viewPly = Math.max(0, ply);
  render();
}

function render() {
  const h = game.history;
  // Nước mới (mình hoặc đối thủ) → về live
  const latest = h.length ? h[h.length - 1].move : null;
  const isNew = latest && latest !== seenMove && h.length === seenLen + 1;
  if (isNew) {
    viewPly = null;
    seenMove = latest;
    seenLen = h.length;
  } else if (isLiveView()) {
    seenMove = latest;
    seenLen = h.length;
  }

  const live = isLiveView();
  const vg = live ? game : boardAt(viewPly);
  const last = live
    ? latest
    : (viewPly > 0 && h[viewPly - 1] ? h[viewPly - 1].move : null);

  const checkSq = vg.inCheck() ? vg.kingSquare(vg.turn) : -1;
  const targets = live ? new Map(selectedMoves.map(m => [m.to, m])) : new Map();
  const deco = mode === 'learn' ? Learn.deco() : null; // { stars, ok, bad, focus }: tô ô cho bài học
  const stars = deco ? deco.stars : new Set();
  // Đang có bản phân tích: hiện biểu tượng loại nước (!!, ??, ★…) ở ô đích của nước đang xem
  const rv = activeReview();
  const rvPly = live ? h.length : viewPly;
  const badge = rv && rvPly > 0 && rvPly <= rv.upto ? { sq: h[rvPly - 1].move.to, id: rv.cls[rvPly - 1] } : null;

  // Chỉ cập nhật ô nào thay đổi (trước đây dựng lại cả 64 ô mỗi lần bấm → giật trên điện thoại)
  const rebuild = boardEl.children.length !== 64 || boardEl.dataset.flip !== String(flipped);
  if (rebuild) { boardEl.innerHTML = ''; boardEl.dataset.flip = String(flipped); }
  for (let k = 0; k < 64; k++) {
    const i = flipped ? 63 - k : k;
    const r = i >> 3, c = i & 7;
    let cls = 'sq ' + ((r + c) % 2 ? 'dark' : 'light');
    if (live && i === selected) cls += ' selected';
    if (last && (i === last.from || i === last.to)) cls += ' last';
    if (i === checkSq) cls += ' check';
    if (live && marks.has(i)) cls += ' marked';
    if (targets.has(i)) cls += targets.get(i).captured ? ' capture' : ' target';
    if (live && hint && (i === hint.from || i === hint.to)) cls += ' hint';
    if (deco) {
      if (deco.focus.has(i)) cls += ' focus';
      if (deco.ok.has(i)) cls += ' tap-ok';
      if (deco.bad.has(i)) cls += ' tap-bad';
    }
    const p = vg.board[i];
    const dragging = !!(p && drag && drag.moved && drag.from === i);
    const bdg = badge && badge.sq === i ? badge.id : '';
    const content = (p ? pieceSrc(p) : '') + (stars.has(i) ? '*' : '') + (bdg ? '#' + bdg : '');
    const sq = rebuild ? document.createElement('div') : boardEl.children[k];
    if (sq.className !== cls) sq.className = cls;
    if (rebuild || sq.dataset.c !== content) {
      sq.dataset.c = content;
      sq.textContent = '';
      if (p) {
        const img = document.createElement('img');
        img.className = 'piece';
        img.src = pieceSrc(p);
        img.alt = '';
        img.draggable = false;
        sq.appendChild(img);
      }
      if (stars.has(i)) sq.insertAdjacentHTML('beforeend', '<span class="star">★</span>');
      if (bdg) sq.insertAdjacentHTML('beforeend', clsBadge(bdg, 'mv-badge'));
      if ((k & 7) === 0) sq.insertAdjacentHTML('beforeend', `<span class="coord rank">${8 - r}</span>`);
      if (k >= 56) sq.insertAdjacentHTML('beforeend', `<span class="coord file">${'abcdefgh'[c]}</span>`);
    }
    const img = p ? sq.querySelector('.piece') : null;
    if (img && img.classList.contains('dragging') !== dragging) img.classList.toggle('dragging', dragging);
    if (rebuild) boardEl.appendChild(sq);
  }

  if (isNew) {
    if (!skipAnim && Profile.prefs().anim !== false) animate(last);
    const over = game.isGameOver();
    Sound.play(over ? 'end' : game.inCheck() ? 'check' : last.captured ? 'capture' : 'move');
  }
  skipAnim = false;

  renderStatus();
  renderMoves();
  renderPlayers();
  const sans = h.map(x => x.san).join(' ');
  renderEval(live ? null : vg, `${game.startFen}|${sans}|${live ? 'L' : viewPly}|${flipped}|${rv ? rv.upto : ''}`);
  renderReviewBox();
  renderArrows(rv, rvPly);
  autosave();
  renderOpening(live ? h.length : viewPly, sans);
  clockSync(isNew ? last : null);
  renderSetup();
  renderOnlineLobby();
  checkResult();
}

// Tên khai cuộc theo các nước đầu của ván (openings.js); chỉ khi ván bắt đầu từ thế chuẩn
let openingKey = '';
function renderOpening(ply, sans = '') {
  const el = $('openingName');
  if (!el) return;
  const puzzle = typeof Puzzles !== 'undefined' && Puzzles.isActive();
  const ok = (mode === 'play' || mode === 'online') && !puzzle && typeof OPENING_BOOK !== 'undefined' && game.startFen === START_FEN;
  const key = `${ok}|${ply}|${sans}`;
  if (key === openingKey) return;
  openingKey = key;
  const o = ok ? OPENING_BOOK.name(game.history.slice(0, ply).map(x => x.san)) : null;
  el.hidden = !o;
  if (!o) return;
  el.innerHTML = '<svg class="ic"><use href="#i-library"/></svg><span><b></b><small></small></span>';
  el.querySelector('b').textContent = o.vi;
  el.querySelector('small').textContent = o.en;
  el.title = `Khai cuộc: ${o.vi} (${o.en})`;
}

// ---------------- Đồng hồ cờ (đấu với máy / 2 người cùng máy) ----------------
// Đồng hồ Trắng chạy sau nước đầu tiên của Trắng. Hết giờ thì thua, trừ khi đối phương chỉ còn Vua (hòa).
const CLOCK_LOW = 20000;
let clock = null; // { base, inc, w, b, turn, at }: at = lúc bắt đầu đếm lượt hiện tại (0 = đang dừng)

function clockSetting() {
  const v = $('clockSel') ? $('clockSel').value : 'none';
  if (!v || v === 'none') return null;
  const [base, inc] = v.split('+').map(Number);
  return { base: base * 1000, inc: (inc || 0) * 1000 };
}
function clockReset() {
  const c = clockSetting();
  clock = c && mode === 'play' ? { ...c, w: c.base, b: c.base, turn: game.turn, at: 0 } : null;
  renderClocks();
}
function clockOff() { clock = null; renderClocks(); }
const clockLeft = c => !clock ? 0 : Math.max(0, clock[c] - (clock.at && clock.turn === c ? Date.now() - clock.at : 0));
const clockOver = () => !!playResult || game.isGameOver();

function clockSync(moved) {
  if (!clock || mode !== 'play') return;
  const now = Date.now();
  if (moved) {
    const by = moved.piece[0];
    if (clock.at) clock[by] = clockLeft(by) + clock.inc;
  } else if (clock.at && clock.turn !== game.turn) {
    clock[clock.turn] = clockLeft(clock.turn); // đi lại / đi tiếp: chốt giờ bên vừa đếm
  }
  if (clockOver()) {
    if (clock.at) clock[clock.turn] = clockLeft(clock.turn);
    clock.at = 0;
  } else if (moved || clock.at) {
    clock.turn = game.turn;
    clock.at = now;
  }
  renderClocks();
}

function fmtClock(ms) {
  if (ms < 10000) return (Math.floor(ms / 100) / 10).toFixed(1);
  const t = Math.ceil(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function renderClocks() {
  const puzzle = typeof Puzzles !== 'undefined' && Puzzles.isActive();
  const bottom = flipped ? 'b' : 'w';
  for (const [pos, c] of [['bottom', bottom], ['top', opposite(bottom)]]) {
    const el = $(pos + 'Clock');
    if (!el) continue;
    el.hidden = !clock || mode !== 'play' || puzzle;
    if (el.hidden) continue;
    const left = clockLeft(c);
    el.textContent = fmtClock(left);
    el.classList.toggle('running', !!clock.at && clock.turn === c);
    el.classList.toggle('low', left < CLOCK_LOW);
    el.classList.toggle('flag', left <= 0);
  }
}

// ---------------- Bảng cài đặt ván: đấu máy / 2 người ----------------
// Các ô select #mode, #level, #clockSel (ẩn) vẫn là nơi lưu lựa chọn; các nút bên dưới chỉ điều khiển chúng.
const BOTS = [
  { level: 1, name: 'Tốt Con', piece: 'P', desc: 'Mới tập chơi, hay đi nước ngẫu hứng' },
  { level: 2, name: 'Mã Chiến', piece: 'N', desc: 'Biết chiến thuật, ít khi bỏ quân' },
  { level: 3, name: 'Hậu Đen', piece: 'Q', desc: 'Stockfish mạnh, hiếm khi sai' },
];
const botOf = lv => BOTS.find(b => b.level === Number(lv)) || BOTS[1];
const TIME_CONTROLS = [
  ['none', '∞', 'Không giới hạn'], ['60+0', '1', 'Bullet'], ['180+2', '3+2', 'Blitz'],
  ['300+0', '5', 'Blitz'], ['600+0', '10', 'Rapid'], ['900+10', '15+10', 'Rapid'],
];
const TC_ICON = { 'Không giới hạn': ['i-hourglass', 'free'], Bullet: ['i-bullet', 'bullet'], Blitz: ['i-bolt', 'blitz'], Rapid: ['i-stopwatch', 'rapid'] };
let colorPick = (Profile.prefs().colorPick) || 'w';

function pickBotSide() {
  const c = colorPick === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : colorPick;
  return c === 'w' ? 'b' : 'w'; // giá trị #mode = màu của máy
}
function setSelect(id, value) {
  const el = $(id);
  if (!el || el.value === value) return false;
  el.value = value;
  el.dispatchEvent(new Event('change'));
  return true;
}

function buildSetup() {
  const cards = $('botCards');
  if (!cards || cards.children.length) return;
  for (const b of BOTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bot-card';
    btn.dataset.level = b.level;
    btn.innerHTML = `<span class="bot-av lv${b.level}"><img src="${pieceSrc('b' + b.piece)}" alt=""></span>
      <span class="bot-meta"><b>${b.name}</b><small>${b.desc}</small></span><span class="bot-elo">${BOT_ELO[b.level]}</span>`;
    btn.addEventListener('click', () => { if (!setSelect('level', String(b.level))) renderSetup(); });
    cards.appendChild(btn);
  }
  const grid = $('tcGrid');
  for (const [v, big, small] of TIME_CONTROLS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tc-chip';
    btn.dataset.v = v;
    const [icon, kind] = TC_ICON[small] || ['i-clock', 'free'];
    btn.classList.add(kind);
    btn.innerHTML = `<span class="tc-top"><svg class="ic tc-ic"><use href="#${icon}"/></svg><b>${big}</b></span><small>${small}</small>`;
    btn.addEventListener('click', () => { if (!setSelect('clockSel', v)) renderSetup(); });
    grid.appendChild(btn);
  }
  for (const btn of document.querySelectorAll('#oppSeg button')) {
    btn.addEventListener('click', () => setSelect('mode', btn.dataset.opp === 'human' ? 'none' : pickBotSide()));
  }
  for (const btn of document.querySelectorAll('#colorSeg button')) {
    btn.addEventListener('click', () => {
      colorPick = btn.dataset.c;
      Profile.setPref('colorPick', colorPick);
      if (!setSelect('mode', pickBotSide())) renderSetup();
    });
  }
}

function renderSetup() {
  if (!$('botSetup')) return;
  buildSetup();
  const human = $('mode').value === 'none';
  const puzzle = typeof Puzzles !== 'undefined' && Puzzles.isActive();
  const live = mode === 'play' && game.history.length > 0 && !game.isGameOver() && !playResult;
  for (const b of document.querySelectorAll('#oppSeg button')) b.classList.toggle('on', (b.dataset.opp === 'human') === human);
  for (const b of document.querySelectorAll('#botCards .bot-card')) b.classList.toggle('on', b.dataset.level === $('level').value);
  for (const b of document.querySelectorAll('#colorSeg button')) b.classList.toggle('on', b.dataset.c === colorPick);
  for (const b of document.querySelectorAll('#tcGrid .tc-chip')) b.classList.toggle('on', b.dataset.v === $('clockSel').value);
  $('botCards').hidden = human;
  $('colorRow').hidden = human;
  $('botSetup').hidden = live || puzzle;
  $('botLive').hidden = !live || puzzle;
  $('newGameText').textContent = live ? 'Ván mới' : 'Bắt đầu ván';
  if (live) {
    const tc = TIME_CONTROLS.find(t => t[0] === ($('clockSel').value || 'none'));
    const timeText = !tc || tc[0] === 'none' ? 'không giới hạn thời gian' : `${tc[2]} ${tc[1]}`;
    if (aiColor === 'none') {
      $('liveTitle').textContent = '2 người cùng máy';
      $('liveSub').textContent = `Thay phiên nhau đi · ${timeText}`;
      setAvatar($('liveAvatar'), { pieceAv: true }, 'w');
    } else {
      const b = botOf(gameLevel);
      $('liveTitle').textContent = `Đang đấu với ${b.name} · ${BOT_ELO[gameLevel]} Elo`;
      $('liveSub').textContent = `Bạn cầm ${COLOR_NAME[opposite(aiColor)]} · ${timeText}` + (practice ? ' · ván tập' : '');
      setAvatar($('liveAvatar'), { bot: true, botPiece: b.piece }, 'b');
    }
  }
}

// Sảnh Online: rank và Elo của mình, chọn màu khi tạo phòng
function renderOnlineLobby() {
  const box = $('olMe');
  if (!box || mode !== 'online') return;
  const me = Profile.me();
  const r = Profile.rankOf(me.exp);
  box.innerHTML = `${rankMedalOnly(r)}<span style="color:${r.color}">${r.name}</span><b>${me.elo}</b>`;
  for (const b of document.querySelectorAll('#hostSeg button')) b.classList.toggle('on', b.dataset.c === $('hostColor').value);
}
for (const b of document.querySelectorAll('#hostSeg button')) {
  b.addEventListener('click', () => { $('hostColor').value = b.dataset.c; renderOnlineLobby(); });
}

function onlyKing(color) {
  return game.board.every(p => !p || p[0] !== color || p[1] === 'K');
}

setInterval(() => {
  if (!clock || !clock.at || mode !== 'play') return;
  if (clockOver()) { clockSync(null); return; }
  const c = clock.turn;
  if (clockLeft(c) > 0) { renderClocks(); return; }
  clock[c] = 0;
  clock.at = 0;
  gameId++;          // bỏ nước máy đang tính dở
  thinking = false;
  const human = aiColor === 'none' ? null : opposite(aiColor);
  const draw = onlyKing(opposite(c));
  $('promo').hidden = true;
  playResult = draw
    ? { winner: null, reason: `${COLOR_NAME[c]} hết giờ nhưng ${COLOR_NAME[opposite(c)]} không đủ quân chiếu hết`, score: human ? 0.5 : null }
    : { winner: opposite(c), reason: `${COLOR_NAME[c]} hết giờ`, score: human ? (opposite(c) === human ? 1 : 0) : null };
  render();
}, 100);

// Thanh đánh giá: ước lượng nhanh bằng hàm đánh giá của ai.js (vật chất + vị trí, có xét chuỗi ăn quân).
// Ẩn trong ván Online và khi học cờ (CSS) để không thành công cụ gợi ý.
let evalKey = '';
function renderEval(g, key = '') {
  const bar = $('evalBar');
  if (!bar || bar.hidden || (mode !== 'play' && mode !== 'online') || typeof quiesce !== 'function') { evalKey = ''; return; }
  const puzzle = typeof Puzzles !== 'undefined' && Puzzles.isActive && Puzzles.isActive();
  bar.classList.toggle('off', !!puzzle); // đang giải câu đố: không lộ đáp án
  if (puzzle) { evalKey = ''; return; }
  // Online: thanh chỉ hiện khi xem lại / phân tích ván đã xong (đang lùi xem các nước, Stockfish đang phân tích hoặc
  // đã có bản phân tích). Ở sảnh chờ và trong lúc đang đánh thì ẩn (vẫn giữ chỗ để bàn cờ không co giãn).
  const reviewing = mode !== 'online' || (!Online.inGame() && game.history.length > 0 && (!isLiveView() || !!coachRun || !!activeReview()));
  bar.classList.toggle('concealed', !reviewing);
  if (!reviewing) { evalKey = ''; return; }
  if (key && key === evalKey) return; // thế cờ không đổi (chỉ chọn quân…): giữ kết quả cũ
  evalKey = key;
  if (!g) g = game; // quiesce đi thử rồi hoàn tác (_apply/_undo) nên không làm đổi ván đang chơi
  let white, label;
  const st = g.status();
  const rv = activeReview(), rvPly = isLiveView() ? game.history.length : viewPly;
  const rvCp = rv && rvPly <= rv.upto ? rv.evals[rvPly] : null;
  if (st === 'playing' && rvCp != null) { // điểm Stockfish lúc phân tích ván (chính xác hơn ước lượng nhanh)
    white = Math.abs(rvCp) >= 9000 ? (rvCp > 0 ? 100 : 0) : 100 / (1 + Math.pow(10, -rvCp / 400));
    label = fmtEval(rvCp).replace(/^[+−]/, '');
  } else if (st === 'checkmate') {
    white = g.turn === 'w' ? 0 : 100;
    label = g.turn === 'w' ? '0-1' : '1-0';
  } else if (st !== 'playing') {
    white = 50;
    label = '½';
  } else {
    let cp = quiesce(g, -MATE, MATE, 0);
    if (g.turn === 'b') cp = -cp;
    white = 100 / (1 + Math.pow(10, -cp / 400));
    const pawns = Math.abs(cp) / 100;
    label = pawns < 0.05 ? '0.0' : (pawns >= 10 ? Math.round(pawns) : pawns.toFixed(1));
  }
  white = Math.max(4, Math.min(96, white));
  if (label === '1-0') white = 100;
  if (label === '0-1') white = 0;
  const flip = flipped;
  bar.classList.toggle('flipped', flip);
  $('evalWhite').style.flex = white;
  $('evalBlack').style.flex = 100 - white;
  const lab = $('evalLabel');
  lab.textContent = label;
  const whiteAhead = white >= 50;
  lab.className = 'eval-label ' + (whiteAhead ? 'w' : 'b');
  bar.title = `Đánh giá thế cờ (ước lượng): ${whiteAhead ? 'Trắng' : 'Đen'} ${label === '0.0' ? 'cân bằng' : label}`;
}

// Trượt quân từ ô cũ sang ô mới (và Xe khi nhập thành)
const CAN_TRANSLATE = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('translate', '1px 1px');
function animate(m) {
  const slide = (from, to) => {
    const img = boardEl.children[disp(to)].querySelector('.piece');
    if (!img) return;
    const [fr, fc] = rowCol(from), [tr, tc] = rowCol(to);
    img.classList.add('moving');
    img.style.transition = 'none';
    // Dùng thuộc tính `translate` (tính theo mặt bàn) thay cho transform: ở góc nhìn nghiêng 3D quân đã xoay đứng lên,
    // trượt bằng transform sẽ đi theo trục đã xoay nên quân "chìm" xuống dưới bàn trong lúc trượt
    if (CAN_TRANSLATE) img.style.translate = `${(fc - tc) * 100}% ${(fr - tr) * 100}%`;
    else img.style.transform = `translate(${(fc - tc) * 100}%, ${(fr - tr) * 100}%)`;
    img.getBoundingClientRect(); // ép trình duyệt áp vị trí đầu
    img.style.transition = '';
    img.style.translate = '';
    img.style.transform = '';
    img.addEventListener('transitionend', () => img.classList.remove('moving'), { once: true });
  };
  slide(m.from, m.to);
  if (m.flag === 'castleK') slide(m.to + 1, m.to - 1);
  if (m.flag === 'castleQ') slide(m.to - 2, m.to + 1);
}

function renderStatus() {
  const el = $('status');
  el.className = 'status';
  const custom = mode === 'learn' ? Learn.status() : mode === 'online' ? Online.status() : null;
  if (custom) {
    el.textContent = custom.cls === 'thinking' ? custom.text.replace(/…$/, '') : custom.text; // dấu chấm động do CSS thêm
    if (custom.cls) el.classList.add(custom.cls);
    return;
  }
  const s = game.status();
  el.dataset.turn = '';
  if (playResult) {
    el.textContent = playResult.winner ? `${playResult.reason} – ${COLOR_NAME[playResult.winner]} thắng` : `Hòa – ${playResult.reason}`;
    el.classList.add('over');
  } else if (s === 'checkmate') {
    el.textContent = `Chiếu hết! ${COLOR_NAME[opposite(game.turn)]} thắng`;
    el.classList.add('over');
  } else if (s !== 'playing') {
    el.textContent = 'Hòa – ' + REASONS[s].toLowerCase();
    el.classList.add('over');
  } else if (thinking) {
    el.textContent = 'Máy đang suy nghĩ';
    el.classList.add('thinking');
  } else {
    el.textContent = `Lượt ${COLOR_NAME[game.turn]} đi` + (game.inCheck() ? ' – đang bị chiếu!' : '');
    el.dataset.turn = game.turn;
    if (game.inCheck()) el.classList.add('in-check');
  }
}

let movesKey = '';
function renderMoves() {
  const box = $('moves');
  const h = game.history;
  const live = isLiveView();
  const focus = live ? h.length : viewPly;
  const rv = activeReview();
  const key = `${live}|${focus}|${h.map(x => x.san).join(' ')}|${rv ? rv.cls.join('') + rv.upto : ''}`;
  if (key === movesKey && box.childElementCount) return;
  movesKey = key;
  box.innerHTML = '';
  if (!h.length) box.innerHTML = '<p class="empty">Chưa có nước đi nào</p>';
  for (let i = 0; i < h.length; i += 2) {
    const row = document.createElement('div');
    row.className = 'move-row';
    row.innerHTML = `<span class="num">${i / 2 + 1}.</span><span class="mv"></span><span class="mv"></span>`;
    const addMv = (el, ply) => {
      if (ply >= h.length) return;
      el.textContent = h[ply].san;
      if (rv && ply < rv.upto) el.insertAdjacentHTML('afterbegin', clsBadge(rv.cls[ply], 'sm'));
      el.dataset.ply = String(ply + 1); // xem sau nước ply+1
      if (focus === ply + 1) el.classList.add('viewing');
      if (live && ply >= h.length - 2) el.classList.add('current');
      el.addEventListener('click', () => setViewPly(ply + 1));
    };
    addMv(row.children[1], i);
    if (h[i + 1]) addMv(row.children[2], i + 1);
    box.appendChild(row);
  }
  if (live) box.scrollTop = box.scrollHeight;
  const vh = $('viewHint');
  if (vh) vh.hidden = live || !h.length;
  // nút điều hướng
  const atStart = !h.length || (viewPly != null && viewPly <= 0);
  const atEnd = live;
  const setDis = (id, on) => { const b = $(id); if (b) b.disabled = on; };
  setDis('navStart', !h.length || (viewPly != null && viewPly <= 0));
  setDis('navPrev', !h.length || (viewPly != null && viewPly <= 0));
  setDis('navNext', atEnd);
  setDis('navEnd', atEnd);
  setDis('navLive', atEnd);
}

// Thông tin người chơi ở mỗi bên bàn cờ
function playerInfo(c) {
  if (mode === 'online') return Online.player(c);
  if (mode === 'play' && aiColor !== 'none') {
    if (c === aiColor) { const b = botOf(gameLevel); return { name: `${b.name} · Máy`, rank: null, elo: BOT_ELO[gameLevel], bot: true, botPiece: b.piece }; }
    const me = Profile.me();
    return { name: me.name, rank: Profile.rankOf(me.exp), elo: me.elo, photo: me.photo, me: true, title: me.title || '' };
  }
  return { name: 'Người chơi ' + COLOR_NAME[c], rank: null, pieceAv: true };
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function titleBadge(title) {
  const t = escapeHtml(String(title || '').trim().toUpperCase()); // danh hiệu có thể do đối thủ Online tự gửi tới
  if (!t) return '';
  return `<span class="title-badge" title="Danh hiệu ${t}">${t}</span>`;
}
function displayName(name, title) {
  const t = String(title || '').trim().toUpperCase();
  return t ? `${t} ${name}` : name;
}

function avatarColor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 45% 42%)`;
}

function setAvatar(el, info, c) {
  el.innerHTML = '';
  el.className = el.className.replace(/ ?(bot|piece-av|photo)/g, '');
  el.style.background = '';
  if (info.photo) {
    // Có ảnh đại diện đã tải lên
    el.classList.add('photo');
    const img = document.createElement('img');
    img.src = info.photo;
    img.alt = '';
    el.appendChild(img);
  } else if (info.bot) {
    // Máy: hiện quân Mã
    el.classList.add('bot');
    const img = document.createElement('img');
    img.src = pieceSrc((c || 'w') + (info.botPiece || 'N'));
    img.alt = '';
    el.appendChild(img);
  } else if (info.pieceAv || (info.rank == null && !info.me && !info.elo && /^Người chơi/.test(info.name || ''))) {
    // 2 người cùng máy / chờ online: quân Vua trắng / đen theo màu bên
    el.classList.add('piece-av');
    const img = document.createElement('img');
    img.src = pieceSrc((c || 'w') + 'K');
    img.alt = '';
    el.appendChild(img);
  } else {
    // Tài khoản thật không có avatar → chữ cái đầu tên
    const name = (info.name || '').trim();
    el.textContent = (name[0] || '?').toUpperCase();
    el.style.background = avatarColor(name || '?');
  }
}

const playerCache = {}; // top / bottom: chỉ vẽ lại khi thông tin người chơi đổi
function renderPlayers() {
  const capturedBy = { w: [], b: [] };
  for (const { move } of game.history) {
    if (move.captured) capturedBy[move.piece[0]].push(move.captured);
  }
  const order = 'QRBNP';
  const value = { Q: 9, R: 5, B: 3, N: 3, P: 1 };
  const material = { w: 0, b: 0 };
  for (const c of ['w', 'b']) {
    capturedBy[c].sort((a, b) => order.indexOf(a[1]) - order.indexOf(b[1]));
    material[c] = capturedBy[c].reduce((s, p) => s + value[p[1]], 0);
  }
  const fill = (pos, c) => {
    const info = playerInfo(c);
    const slot = playerCache[pos] || (playerCache[pos] = {});
    const skin = document.body.dataset.pieces || '';
    const infoKey = [c, skin, info.name, info.title, info.rank && info.rank.text, info.rank && info.rank.color, info.elo, info.bot, info.botPiece, info.pieceAv, info.me].join('|');
    if (slot.info !== infoKey || slot.photo !== info.photo) {
      slot.info = infoKey;
      slot.photo = info.photo;
      $(pos + 'Name').innerHTML = (info.title ? titleBadge(info.title) + ' ' : '') + escapeHtml(info.name);
      const ratingEl = $(pos + 'Rating');
      if (info.rank) {
        ratingEl.innerHTML = `<span class="player-rank">${rankMedalOnly(info.rank)}<span style="color:${info.rank.color}">${info.rank.text}</span></span>`
          + (info.elo != null ? ` · ${info.elo} Elo` : '');
      } else {
        ratingEl.textContent = info.elo != null ? `(${info.elo} Elo)` : '';
        ratingEl.style.color = '';
      }
      setAvatar($(pos + 'Avatar'), info, c);
    }
    const diff = material[c] - material[opposite(c)];
    const capKey = skin + '|' + capturedBy[c].join(',') + '|' + diff;
    if (slot.cap !== capKey) {
      slot.cap = capKey;
      const box = $(pos + 'Captured');
      box.innerHTML = '';
      let prev = '';
      for (const p of capturedBy[c]) {
        const img = document.createElement('img');
        img.src = pieceSrc(p);
        img.alt = '';
        if (p[1] !== prev) img.className = 'group';
        prev = p[1];
        box.appendChild(img);
      }
      if (diff > 0) box.insertAdjacentHTML('beforeend', `<b>+${diff}</b>`);
    }
    $(pos + 'Player').classList.toggle('active', game.turn === c && !game.isGameOver() && !playResult && mode !== 'learn');
  };
  const bottom = flipped ? 'b' : 'w';
  fill('bottom', bottom);
  fill('top', opposite(bottom));
}

function renderHeader() {
  const me = Profile.me();
  $('meName').innerHTML = (me.title ? titleBadge(me.title) + ' ' : '') + escapeHtml(me.name);
  const rank = Profile.rankOf(me.exp);
  const medal = rankMedalOnly(rank);
  // Nút Rank: ngôi sao như bản gốc (không dùng huy hiệu tròn)
  const iconEl = $('meRankIcon');
  if (iconEl) iconEl.innerHTML = `<svg class="ic rank-star-ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2 3 6.5 7 .9-5.1 4.8 1.3 7-6.2-3.4-6.2 3.4 1.3-7L2 9.4l7-.9L12 2Z"/></svg>`;
  const badgeEl = $('meRankBadge');
  if (badgeEl) badgeEl.innerHTML = medal;
  const ratingEl = $('meRating');
  if (ratingEl) ratingEl.innerHTML = Profile.isGuest() ? '<span class="me-rank-line">Chế độ khách</span>'
    : `<span class="me-rank-line"><span style="color:${rank.color}">${rank.text}</span></span> · ${me.elo} Elo`;
  const rankBtn = $('rankBtn');
  if (rankBtn) rankBtn.title = `${rank.name} · ${me.elo} Elo`;
  setAvatar($('meAvatar'), { name: me.name, photo: me.photo, me: true }, 'w');
  document.body.dataset.board = Profile.prefs().board;
  document.body.dataset.pieces = Profile.prefs().pieces || 'default';
  document.body.dataset.coords = Profile.prefs().coords === false ? 'off' : 'on';
  document.body.dataset.dots = Profile.prefs().dots === false ? 'off' : 'on';
  document.body.dataset.relief = Profile.prefs().relief === false ? 'off' : 'on'; // bàn cờ nổi 3D (mặc định bật)
  document.body.dataset.tilt = Profile.prefs().tilt ? 'on' : 'off';            // góc nhìn nghiêng 3D (mặc định tắt)
  // Chỉ tài khoản ADMIN thấy tab Admin; admin được dùng Gợi ý trong ván Online
  const staff = Profile.isAdmin();
  $('adminTab').hidden = !Profile.isOwner();
  $('onlineHint').hidden = !staff;
  $('onlineTools').classList.toggle('three', !staff);
}

// ---------------- Mũi tên trên bàn cờ ----------------
// Mũi tên người chơi vẽ (chuột phải kéo) và mũi tên xanh "nước tốt nhất" khi xem lại bản phân tích.
const OFF_BY_DEFAULT = new Set(['autoQueen', 'tilt']); // các tuỳ chọn trong Cài đặt mặc định tắt
let arrowLayer = null, arrowKey = '', bestArrow = { key: '', move: null };

function arrowSVG(from, to, color, w) {
  const c = i => { const [r, col] = rowCol(i); return [col + 0.5, r + 0.5]; };
  const [x1, y1] = c(from), [x2, y2] = c(to);
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  if (!len) return '';
  const ux = dx / len, uy = dy / len, head = 0.42, hw = w * 2.3;
  const bx = x2 - ux * head, by = y2 - uy * head;          // gốc đầu mũi tên
  const sx = x1 + ux * 0.28, sy = y1 + uy * 0.28;          // bắt đầu cách tâm ô một chút
  const px = -uy, py = ux;
  const pts = [[sx + px * w / 2, sy + py * w / 2], [bx + px * w / 2, by + py * w / 2], [bx + px * hw / 2, by + py * hw / 2], [x2, y2],
    [bx - px * hw / 2, by - py * hw / 2], [bx - px * w / 2, by - py * w / 2], [sx - px * w / 2, sy - py * w / 2]];
  return `<polygon points="${pts.map(p => p.map(v => v.toFixed(3)).join(',')).join(' ')}" fill="${color}"/>`;
}

function renderArrows(rv, rvPly) {
  if (!arrowLayer) {
    arrowLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrowLayer.setAttribute('class', 'arrow-layer');
    arrowLayer.setAttribute('viewBox', '0 0 8 8');
    arrowLayer.setAttribute('aria-hidden', 'true');
    boardEl.parentElement.appendChild(arrowLayer);
  }
  // Nước tốt nhất ở thế trước nước đang xem (bản phân tích): tính lại từ SAN, nhớ kết quả
  let best = null;
  const san = rv && rvPly > 0 && rvPly <= rv.upto ? rv.best[rvPly - 1] : '';
  if (san) {
    const k = `${rv.startFen}|${rvPly}|${san}`;
    if (bestArrow.key !== k) {
      const g = boardAt(rvPly - 1), legal = g.legalMoves(), want = san.replace(/[+#]/g, '');
      bestArrow = { key: k, move: legal.find(m => g._san(m, legal) === want) || null };
    }
    best = bestArrow.move;
  }
  const user = [...marks].filter(x => typeof x === 'string').map(x => x.split('>').map(Number));
  const key = `${flipped}|${best ? best.from + '-' + best.to : ''}|${user.map(a => a.join('-')).join(',')}`;
  // Khớp vị trí với bàn cờ (bàn nằm cạnh thanh đánh giá trong .board-wrap)
  Object.assign(arrowLayer.style, { left: boardEl.offsetLeft + 'px', top: boardEl.offsetTop + 'px', width: boardEl.offsetWidth + 'px', height: boardEl.offsetHeight + 'px' });
  if (key === arrowKey) return;
  arrowKey = key;
  arrowLayer.innerHTML = (best ? arrowSVG(best.from, best.to, '#81b64cd9', 0.2) : '') + user.map(([a, b]) => arrowSVG(a, b, '#f0a024d0', 0.17)).join('');
}
window.addEventListener('resize', () => { if (arrowLayer) renderArrows(activeReview(), isLiveView() ? game.history.length : viewPly); });

// ---------------- Tự lưu ván đang dở ----------------
// Ván đấu máy / 2 người / ván tập đang đánh được lưu sau mỗi nước; tải lại trang hay tắt trình duyệt rồi vào lại
// thì ván được khôi phục (ván tính Elo vẫn tính Elo, nên không "thoát hiểm" bằng cách tải lại trang được).
const savedKey = () => 'rg-saved-game:' + (Profile.uid() || 'guest');
let savedSig = null;
function autosave() {
  if (!entered) return;
  const puzzle = typeof Puzzles !== 'undefined' && Puzzles.isActive();
  const live = mode === 'play' && !puzzle && !ratedDone && game.history.length > 0 && !game.isGameOver() && !playResult;
  const sig = live ? `${game.startFen}|${game.history.map(h => h.san).join(' ')}|${aiColor}|${gameLevel}|${assisted}|${practice}` : '';
  if (sig === savedSig) return;
  savedSig = sig;
  try {
    if (!live) { localStorage.removeItem(savedKey()); return; }
    localStorage.setItem(savedKey(), JSON.stringify({
      at: Date.now(), startFen: game.startFen,
      moves: game.history.map(h => sqName(h.move.from) + sqName(h.move.to) + (h.move.promotion || '')),
      aiColor, level: gameLevel, practice, assisted, flipped,
      clock: clock ? { base: clock.base, inc: clock.inc, w: clockLeft('w'), b: clockLeft('b') } : null,
    }));
  } catch {}
}

let restoringGame = false;
function restoreSavedGame() {
  restoringGame = true;
  try { return restoreSavedGameNow(); } finally { restoringGame = false; }
}
function restoreSavedGameNow() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(savedKey())); } catch {}
  if (!s || !Array.isArray(s.moves) || Date.now() - s.at > 7 * 86400000 || mode !== 'play' || game.history.length) return false;
  $('mode').value = ['w', 'b', 'none'].includes(s.aiColor) ? s.aiColor : 'none';
  $('level').value = String([1, 2, 3].includes(s.level) ? s.level : 2);
  newGame();
  try { game.load(s.startFen || START_FEN); } catch { game.reset(); }
  for (const u of s.moves) {
    if (!game.move({ from: sqIndex(u.slice(0, 2)), to: sqIndex(u.slice(2, 4)), promotion: u[4] || undefined })) break;
  }
  if (!game.history.length || game.isGameOver()) { game.reset(); render(); return false; }
  practice = !!s.practice;
  assisted = !!s.assisted;
  ratedDone = false;
  flipped = !!s.flipped;
  // Đồng hồ: giữ thời gian còn lại, dừng tới nước đi tiếp theo
  if (s.clock && s.clock.base) clock = { base: s.clock.base, inc: s.clock.inc || 0, w: s.clock.w, b: s.clock.b, turn: game.turn, at: 0 };
  else clockOff();
  seenLen = game.history.length;
  seenMove = game.history[seenLen - 1].move;
  renderRatedNote();
  render();
  maybeAiMove();
  toast(`Đã khôi phục ván đang dở (${Math.ceil(game.history.length / 2)} nước)`);
  return true;
}

// ---------------- Thao tác trên bàn cờ ----------------

function canHumanMove() {
  if (!isLiveView()) return false; // đang xem lại biên bản thì không đi nước
  if (mode === 'learn') return Learn.canMove();
  if (mode === 'online') return Online.canMove();
  return !thinking && !playResult && game.turn !== aiColor && !game.isGameOver();
}

function select(i) {
  selected = i;
  selectedMoves = game.legalMoves().filter(m => m.from === i);
}

function onSquare(i, dragged = false) {
  if (!canHumanMove()) return;
  const matches = selectedMoves.filter(m => m.to === i);
  if (matches.length) {
    // "Tự phong Hậu" chỉ áp dụng khi đánh ván: bài học / câu đố có thể yêu cầu phong Mã (phong dưới cấp)
    const autoQueen = Profile.prefs().autoQueen && mode !== 'learn' && !(typeof Puzzles !== 'undefined' && Puzzles.isActive());
    if (matches.length > 1 && autoQueen) play(matches.find(m => m.promotion === 'Q') || matches[0], dragged);
    else if (matches.length > 1) askPromotion(matches, dragged);
    else play(matches[0], dragged);
    return;
  }
  const p = game.board[i];
  if (p && p[0] === game.turn && i !== selected) select(i);
  else clearSelection();
  render();
}

function clearSelection() {
  selected = -1;
  selectedMoves = [];
}

// Bàn nghiêng 3D (Hồ sơ › Cài đặt): toạ độ màn hình không còn tỉ lệ thẳng với ô, nên tìm ô ngay dưới con trỏ
const tiltOn = () => document.body.dataset.tilt === 'on' && (mode === 'play' || mode === 'online');
function squareAt(e) {
  if (tiltOn()) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const sq = el && el.closest && el.closest('#board > .sq');
    const k = sq ? Array.prototype.indexOf.call(boardEl.children, sq) : -1;
    return k < 0 ? -1 : flipped ? 63 - k : k;
  }
  const r = boardEl.getBoundingClientRect();
  const col = Math.floor((e.clientX - r.left) / r.width * 8);
  const row = Math.floor((e.clientY - r.top) / r.height * 8);
  if (col < 0 || col > 7 || row < 0 || row > 7) return -1;
  const k = row * 8 + col;
  return flipped ? 63 - k : k;
}

function setDragOver(i) {
  if (drag.over === i) return;
  if (drag.over >= 0) boardEl.children[disp(drag.over)].classList.remove('drag-over');
  if (i >= 0) boardEl.children[disp(i)].classList.add('drag-over');
  drag.over = i;
}

function endDrag() {
  if (drag && drag.ghost) drag.ghost.remove();
  drag = null;
}

boardEl.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !e.isPrimary) return; // ngón tay thứ hai trên màn cảm ứng: bỏ qua
  if (drag) endDrag(); // không để sót quân "bóng ma" của lần kéo trước
  Sound.unlock();
  const i = squareAt(e);
  if (i < 0) return;
  if (mode === 'learn' && Learn.tapMode()) return Learn.tap(i); // bài "bấm vào ô"
  if (marks.size) { marks.clear(); render(); }
  if (!canHumanMove()) return;
  const p = game.board[i];
  if (!p || p[0] !== game.turn) return onSquare(i);
  const wasSelected = selected === i;
  if (!wasSelected) { select(i); render(); }
  drag = { from: i, x: e.clientX, y: e.clientY, moved: false, wasSelected, over: -1, ghost: null };
  boardEl.setPointerCapture(e.pointerId);
  e.preventDefault();
});

boardEl.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
    drag.moved = true;
    const size = boardEl.getBoundingClientRect().width / 8;
    const ghost = document.createElement('img');
    ghost.className = 'drag-ghost';
    ghost.src = pieceSrc(game.board[drag.from]);
    ghost.style.width = ghost.style.height = size + 'px';
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    const img = boardEl.children[disp(drag.from)].querySelector('.piece');
    if (img) img.classList.add('dragging');
  }
  drag.ghost.style.left = e.clientX + 'px';
  drag.ghost.style.top = e.clientY + 'px';
  setDragOver(squareAt(e));
});

boardEl.addEventListener('pointerup', e => {
  if (!drag) return;
  const d = drag;
  endDrag();
  const i = squareAt(e);
  if (d.moved) {
    if (selectedMoves.some(m => m.to === i)) onSquare(i, true);
    else render(); // thả ra ngoài: quân về chỗ cũ, vẫn giữ chọn
  } else if (d.wasSelected) {
    clearSelection();
    render();
  }
});

boardEl.addEventListener('pointercancel', () => { endDrag(); render(); });

// Chuột phải: đánh dấu ô (như khi phân tích)
// Chuột phải: bấm vào một ô = đánh dấu ô, kéo từ ô này sang ô khác = vẽ mũi tên (như khi phân tích trên lichess / chess.com).
// Mũi tên lưu chung trong `marks` dưới dạng chuỗi "từ>tới", nên bấm chuột trái / đi nước là xoá hết như các ô đánh dấu.
let rightFrom = -1;
boardEl.addEventListener('contextmenu', e => e.preventDefault());
boardEl.addEventListener('pointerdown', e => { if (e.button === 2) rightFrom = squareAt(e); });
boardEl.addEventListener('pointerup', e => {
  if (e.button !== 2) return;
  const from = rightFrom, to = squareAt(e);
  rightFrom = -1;
  if (from < 0 || to < 0) return;
  const k = from === to ? from : `${from}>${to}`;
  if (marks.has(k)) marks.delete(k); else marks.add(k);
  render();
});

function askPromotion(moves, dragged) {
  const modal = $('promo');
  const box = $('promoChoices');
  box.innerHTML = '';
  const ply = game.history.length;
  for (const m of moves) {
    const btn = document.createElement('button');
    btn.innerHTML = `<img src="${pieceSrc(m.piece[0] + m.promotion)}" alt="${m.promotion}">`;
    btn.addEventListener('click', () => {
      modal.hidden = true;
      // Trong lúc chọn quân, ván có thể đã đổi (hết giờ, đối thủ xin thua, ván mới…): bỏ nước này
      if (game.history.length !== ply || !canHumanMove()) { clearSelection(); render(); return; }
      play(m, dragged);
    });
    box.appendChild(btn);
  }
  modal.hidden = false;
}

function play(m, dragged = false) {
  clearSelection();
  hint = null;
  marks.clear();
  skipAnim = dragged;
  viewPly = null; // về live khi đi nước mới
  redoStack = []; // nước mới → hết nhánh redo
  if (mode === 'learn') return Learn.onMove(m);
  if (!game.move(m)) { render(); return; } // nước không còn hợp lệ: không gửi cho đối thủ
  if (typeof Puzzles !== 'undefined' && Puzzles.isActive()) {
    Puzzles.onMove();
    render();
    return;
  }
  if (mode === 'online') Online.sendMove(m);
  render();
  maybeAiMove();
}

// Gợi ý nước đi tốt (dùng AI mức Trung bình). Chế độ Chơi: ai cũng dùng được;
// ván Online: chỉ admin. Admin dùng Gợi ý vẫn được tính Elo và rank (không đặt `assisted`).
async function showHint() {
  const staff = Profile.isAdmin();
  if (puzzleBusy()) return;
  if (!(mode === 'play' || (mode === 'online' && staff)) || !canHumanMove()) return;
  if (!staff && isRatedBotGame() && !assisted) {
    if (!confirm('Dùng Gợi ý thì ván này sẽ không tính Elo. Tiếp tục?')) return;
    assisted = true;
    renderRatedNote();
  }
  // Stockfish depth ~18 — rất mạnh; fallback ai.js nếu engine chưa sẵn sàng
  if (typeof toast === 'function') toast('Đang tính gợi ý (Stockfish)…');
  const id = gameId, ply = game.history.length;
  let m = null;
  try {
    if (typeof Engine !== 'undefined' && Engine.hintMove) m = await Engine.hintMove(game);
  } catch (e) { console.warn('hint engine', e); }
  if (id !== gameId || ply !== game.history.length) return; // thế cờ đã đổi trong lúc tính: gợi ý cũ không còn đúng
  if (!m && typeof findBestMove === 'function') m = findBestMove(game, 3);
  if (m) {
    hint = { from: m.from, to: m.to };
    if (typeof toast === 'function') toast('Gợi ý đã sẵn sàng');
  } else if (typeof toast === 'function') {
    toast('Không tính được gợi ý');
  }
  render();
}

function maybeAiMove() {
  if (mode !== 'play' || game.turn !== aiColor || game.isGameOver() || playResult) return;
  thinking = true;
  render();
  const id = gameId;
  // Stockfish theo level (Khó ~ depth 16 / skill 20); fallback ai.js
  setTimeout(async () => {
    if (id !== gameId || game.turn !== aiColor || game.isGameOver() || playResult) { if (id === gameId) { thinking = false; render(); } return; }
    let m = null;
    try {
      if (typeof Engine !== 'undefined' && Engine.botMove) m = await Engine.botMove(game, gameLevel);
    } catch (e) { console.warn('bot engine', e); }
    if (id !== gameId) return;
    if (!m && typeof findBestMove === 'function') m = findBestMove(game, gameLevel);
    thinking = false;
    if (m && game.move(m)) redoStack = []; // máy đi nước mới: nhánh "Đi tiếp" cũ không còn dùng được
    render();
  }, 200);
}

// ---------------- Ván đấu & rank ----------------

function startRatedGame() {
  showBoard();
  gameReview = null; // ván mới (kể cả ván Online chơi lại): bỏ bản phân tích của ván trước
  coachRun = null;
  ratedDone = false;
  assisted = false;
  playResult = null;
  $('resultModal').hidden = true;
}

// Đang đấu với máy (ván có thể tính Elo)
function isRatedBotGame() {
  return mode === 'play' && aiColor !== 'none' && !practice && !Profile.isGuest() && !ratedDone && !playResult && !game.isGameOver();
}

// Bỏ ván giữa chừng khi đấu với máy bị tính thua (như chess.com). Trả về false nếu người chơi hủy.
function abandonBotGame() {
  if (!isRatedBotGame() || assisted || game.history.length < MIN_RANKED_PLIES) return true;
  if (!confirm('Bỏ ván giữa chừng sẽ bị tính thua và mất Elo. Tiếp tục?')) return false;
  ratedDone = true;
  Profile.recordBot(0, BOT_ELO[gameLevel]);
  return true;
}

function renderRatedNote() {
  const el = $('ratedNote');
  const rated = aiColor !== 'none';
  el.classList.toggle('off', !rated || assisted || practice || Profile.isGuest());
  el.textContent = Profile.isGuest() ? 'Chế độ khách: không tính Elo, không xếp hạng · đăng nhập để có Elo và rank'
    : practice ? 'Ván tập từ Thư viện · không tính Elo'
    : !rated ? '2 người cùng máy không tính Elo'
    : assisted ? (Profile.isAdmin() ? 'Ván này không tính Elo vì đã dùng Đi lại' : 'Ván này không tính Elo vì đã dùng Gợi ý / Đi lại')
    : `Đấu với máy ${LEVEL_NAME[gameLevel]} (${BOT_ELO[gameLevel]} Elo) có tính Elo, không tính rank · ${Profile.isAdmin() ? 'Admin: Gợi ý vẫn tính, Đi lại thì không' : 'dùng Gợi ý hoặc Đi lại thì không tính'}`;
}

function newGame() {
  if (!abandonBotGame()) return false;
  if (typeof Puzzles !== 'undefined') { try { Puzzles.showBanner(false); } catch {} }
  gameId++;
  thinking = false;
  practice = false;
  game.reset();
  clearSelection();
  hint = null;
  marks.clear();
  viewPly = null;
  redoStack = [];
  gameReview = null;
  $('promo').hidden = true;
  aiColor = $('mode').value;
  gameLevel = Number($('level').value);
  flipped = aiColor === 'w';
  startRatedGame();
  clockReset();
  renderRatedNote();
  render();
  maybeAiMove();
  return true;
}

// Đổi chế độ / độ khó giữa ván: nếu người chơi hủy thì trả ô chọn về như cũ
function changeSetup() {
  if (!newGame()) {
    $('mode').value = aiColor;
    $('level').value = String(gameLevel);
  }
}

// Đang giải câu đố: các nút Đi lại / Đi tiếp / Gợi ý / Xin thua của bàn chính làm lệch tiến độ câu đố,
// nên tạm khoá (câu đố có nút Gợi ý / Đáp án riêng)
function puzzleBusy() {
  if (mode !== 'play' || typeof Puzzles === 'undefined' || !Puzzles.isActive()) return false;
  toast('Đang giải câu đố: dùng nút Gợi ý hoặc Đáp án trong khung câu đố.');
  return true;
}

function undo() {
  if (thinking || playResult || !game.history.length) return;
  if (mode !== 'play' || puzzleBusy()) return; // online / học cờ không đi lại
  if (isRatedBotGame() && !assisted) {
    if (!confirm('Đi lại thì ván này sẽ không tính Elo. Tiếp tục?')) return;
    assisted = true;
    renderRatedNote();
  }
  hint = null;
  viewPly = null;
  // Lưu nước để "Đi tiếp"
  const pulled = [];
  const h1 = game.undo();
  if (h1) pulled.push(h1.move || h1);
  // Khi đấu với máy, lùi thêm nước của máy để về lượt người
  if (aiColor !== 'none' && game.history.length && game.turn === aiColor) {
    const h2 = game.undo();
    if (h2) pulled.push(h2.move || h2);
  }
  // pulled = [nước mới nhất, nước trước đó]: đẩy nước mới nhất vào trước để đỉnh ngăn xếp là nước đi tiếp đầu tiên
  for (const m of pulled) redoStack.push(m);
  clearSelection();
  render();
  // Không gọi maybeAiMove — đã về lượt người (hoặc 2 người)
}

function redo() {
  if (thinking || playResult || !redoStack.length) return;
  if (mode !== 'play' || puzzleBusy()) return;
  hint = null;
  viewPly = null;
  // Đi lại nước vừa lùi; đấu máy thì đi lại luôn nước của máy để về lượt người như trước khi bấm Đi lại
  do {
    const m = redoStack.pop();
    if (!game.move({ from: m.from, to: m.to, promotion: m.promotion || undefined })) { redoStack = []; break; }
  } while (redoStack.length && aiColor !== 'none' && game.turn === aiColor);
  clearSelection();
  render();
  maybeAiMove(); // hết nước để đi tiếp mà tới lượt máy: máy tự tính nước mới
}

function resignPlay() {
  if (playResult || game.isGameOver() || !game.history.length || puzzleBusy()) return;
  const loser = aiColor === 'none' ? game.turn : opposite(aiColor);
  if (!confirm(aiColor === 'none' ? `${COLOR_NAME[loser]} xin thua?` : 'Bạn chắc chắn muốn xin thua?')) return;
  gameId++;
  thinking = false;
  playResult = { winner: opposite(loser), reason: `${COLOR_NAME[loser]} xin thua`, score: aiColor === 'none' ? null : 0 };
  render();
}

function gameOutcome() {
  if (mode === 'online') {
    const o = Online.outcome();
    return o && { ...o, reason: o.reason || REASONS[game.status()] };
  }
  if (mode !== 'play') return null;
  const human = aiColor === 'none' ? null : opposite(aiColor);
  if (playResult) return { ...playResult };
  const s = game.status();
  if (s === 'playing') return null;
  const winner = s === 'checkmate' ? opposite(game.turn) : null;
  return { winner, reason: REASONS[s], score: human ? (winner ? (winner === human ? 1 : 0) : 0.5) : null };
}

function checkResult() {
  if (ratedDone) return;
  const o = gameOutcome();
  if (!o) return;
  ratedDone = true;
  // Ván Online: tính rank (exp) và Elo. Ván đấu với máy: chỉ tính Elo. 2 người cùng máy: không tính.
  let change = null, note = null;
  if (o.score != null) {
    if (mode === 'play' && practice) note = 'Ván tập từ Thư viện không tính Elo';
    else if (Profile.isGuest()) note = 'Chế độ khách không tính Elo';
    else if (mode === 'play' && assisted) note = Profile.isAdmin() ? 'Ván có dùng Đi lại nên không tính Elo' : 'Ván có dùng Gợi ý / Đi lại nên không tính Elo';
    else if (game.history.length < MIN_RANKED_PLIES) note = mode === 'online' ? 'Ván quá ngắn nên không tính rank và Elo' : 'Ván quá ngắn nên không tính Elo';
    else change = mode === 'online' ? Profile.record(o.score, Online.oppElo()) : Profile.recordBot(o.score, BOT_ELO[gameLevel]);
    // Ván ghép trong contest: cộng điểm contest (thắng +2, hòa +1, thua 0)
    if (change && mode === 'online' && Online.contest()) {
      const c = contestById.get(Online.contest());
      if (c) change.contest = Contest.record(c, o.score, Online.startedAt());
    }
  }
  if (mode === 'online' && Online.contest()) Auto.doneAt = Date.now(); // đếm giờ tự ghép ván contest tiếp theo
  let histId = null;
  // Lưu nhật ký ván (cục bộ)
  try {
    if (typeof GameHistory !== 'undefined' && game.history.length >= 2 && typeof gameToPGN === 'function') {
      let result = '*';
      if (o.score === 1) result = '1-0';
      else if (o.score === 0) result = '0-1';
      else if (o.score === 0.5) result = '1/2-1/2';
      else if (o.winner === 'w') result = '1-0';
      else if (o.winner === 'b') result = '0-1';
      else if (game.status() !== 'playing') result = '1/2-1/2';
      const title = mode === 'online' ? 'Online'
        : (aiColor !== 'none' ? ('Máy · ' + (LEVEL_NAME[gameLevel] || '')) : '2 người');
      const human = humanColorForReview();
      const opp = human ? playerInfo(opposite(human)) : null;
      histId = GameHistory.save({
        mode, result, title,
        opp: opp ? `${opp.name}${opp.elo ? ` (${opp.elo})` : ''}` : '',
        color: human || '',
        elo: change && change.elo ? change.elo.delta : undefined,
        moves: Math.ceil(game.history.length / 2),
        pgn: gameToPGN(),
        fen: typeof gameToFEN === 'function' ? gameToFEN() : '',
        note: o.reason || '',
      });
    }
  } catch (e) { console.warn('history save', e); }
  startCoach(histId);
  if (!quietResult) setTimeout(() => showResult(o, change, note), 600);
}

// ---------------- Nhận xét tự động sau ván ----------------
const PIECE_VN = { K: 'Vua', Q: 'Hậu', R: 'Xe', B: 'Tượng', N: 'Mã', P: 'Tốt' };
const VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

function humanColorForReview() {
  if (mode === 'online') {
    try {
      // Online.player('w').me / 'b'
      if (Online.player('w') && Online.player('w').me) return 'w';
      if (Online.player('b') && Online.player('b').me) return 'b';
    } catch {}
    return null;
  }
  if (mode === 'play' && aiColor !== 'none') return opposite(aiColor);
  return null; // 2 người cùng máy: nhận xét trung lập
}

function materialOf(board, color) {
  let s = 0;
  for (const p of board) if (p && p[0] === color) s += VAL[p[1]] || 0;
  return s;
}

function buildGameReview(o) {
  const hist = game.history;
  if (!hist.length) return null;

  let g;
  try { g = new Chess(game.startFen || START_FEN); } catch { g = new Chess(); } // ván tập tàn cuộc bắt đầu từ thế riêng
  const human = humanColorForReview();
  const tags = [];
  const lines = [];
  let checks = 0, captures = 0, promotions = 0;
  let queenLostBy = { w: 0, b: 0 }; // nước đầu tiên mất hậu (0 = chưa)
  let bigSwing = null; // { ply, san, drop, side }
  let prevEval = 0;
  let maxMaterialLead = 0;
  let earlyQueenOut = null; // { side, ply, san }
  let castled = { w: false, b: false };
  let checksOnHuman = 0;

  for (let i = 0; i < hist.length; i++) {
    const entry = hist[i];
    if (!entry || !entry.move) continue;
    const m = entry.move;
    const san = entry.san || '';
    if (!m.piece) continue;
    const side = m.piece[0];
    // early queen development
    if (m.piece[1] === 'Q' && i < 8 && !earlyQueenOut) earlyQueenOut = { side, ply: i + 1, san };

    const applied = g.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
    if (!applied) continue; // lịch sử lệch thì bỏ qua nước này, không làm hỏng cả nhận xét

    if (m.captured) {
      captures++;
      if (m.captured[1] === 'Q' && !queenLostBy[m.captured[0]]) queenLostBy[m.captured[0]] = i + 1;
    }
    if (m.promotion) promotions++;
    if (san.includes('+') || san.includes('#')) {
      checks++;
      if (human && side !== human) checksOnHuman++;
    }
    if (m.flag === 'castleK' || m.flag === 'castleQ' || (m.piece[1] === 'K' && Math.abs((m.from & 7) - (m.to & 7)) === 2)) castled[side] = true;

    const matW = materialOf(g.board, 'w');
    const matB = materialOf(g.board, 'b');
    maxMaterialLead = Math.max(maxMaterialLead, Math.abs(matW - matB));

    const moverVal = VAL[m.piece[1]] || 0;
    const capVal = m.captured ? (VAL[m.captured[1]] || 0) : 0;
    // Blunder heuristic: đổi quân bất lợi
    if (m.captured && moverVal > capVal + 1 && !san.includes('+')) {
      const drop = moverVal - capVal;
      if (drop >= 4 && (!bigSwing || drop > bigSwing.drop)) {
        bigSwing = { ply: i + 1, san, drop, side, kind: 'trade' };
      }
    }
    // Hậu đổi quân nhỏ
    if (m.piece[1] === 'Q' && m.captured && capVal <= 3) {
      bigSwing = { ply: i + 1, san, drop: 9 - capVal, side, kind: 'queen' };
    }
  }

  const plies = hist.length;
  const moves = Math.ceil(plies / 2);
  const status = game.status();
  const matW = materialOf(game.board, 'w');
  const matB = materialOf(game.board, 'b');

  // --- Headline summary ---
  let summary;
  if (status === 'checkmate') {
    const winner = opposite(game.turn);
    const winName = COLOR_NAME[winner];
    if (human) {
      summary = human === winner
        ? `Bạn thắng bằng chiếu hết sau ${moves} nước. Kết thúc gọn!`
        : `Bạn bị chiếu hết sau ${moves} nước. Hãy chú ý an toàn vua ở tàn cuộc.`;
      tags.push(human === winner ? { t: 'Chiến thắng', c: 'good' } : { t: 'Thất bại', c: 'bad' });
    } else {
      summary = `${winName} thắng bằng chiếu hết sau ${moves} nước.`;
      tags.push({ t: 'Chiếu hết', c: 'mid' });
    }
  } else if (o && o.score === 0 && o.reason && /xin thua|rời/i.test(o.reason)) {
    summary = `Ván kết thúc sớm (${moves} nước): ${o.reason}.`;
    tags.push({ t: 'Kết thúc sớm', c: 'mid' });
  } else if (status === 'stalemate') {
    summary = `Hòa vì hết nước đi (pat) sau ${moves} nước — vua không bị chiếu nhưng không còn nước hợp lệ.`;
    tags.push({ t: 'Pat', c: 'mid' });
  } else if (status !== 'playing') {
    summary = `Hòa sau ${moves} nước (${o && o.reason ? o.reason : REASONS[status] || status}).`;
    tags.push({ t: 'Hòa', c: 'mid' });
  } else {
    summary = `Ván dừng sau ${moves} nước.`;
  }
  lines.push(summary);

  // --- Opening ---
  if (moves <= 12) {
    lines.push('Ván khá ngắn: khai cuộc chưa kịp triển khai hết quân. Cố gắng nhập thành sớm và phát triển Mã/Tượng trước khi tấn công.');
    tags.push({ t: 'Ván ngắn', c: 'mid' });
  } else if (moves <= 25) {
    lines.push('Đấu ở mức trung bình về độ dài — hai bên đã qua giai đoạn khai cuộc.');
  } else {
    lines.push(`Ván dài ${moves} nước: có sự giằng co ở trung cuộc/tàn cuộc.`);
    tags.push({ t: 'Ván dài', c: 'good' });
  }

  // --- Castling ---
  if (human) {
    if (!castled[human] && moves >= 12) {
      lines.push(`Bạn chưa nhập thành trong ván này. Nhập thành giúp vua an toàn và đưa Xe vào trận sớm hơn.`);
      tags.push({ t: 'Chưa nhập thành', c: 'bad' });
    } else if (castled[human]) {
      tags.push({ t: 'Đã nhập thành', c: 'good' });
    }
  } else {
    if (!castled.w || !castled.b) {
      const who = [!castled.w && 'Trắng', !castled.b && 'Đen'].filter(Boolean).join(' và ');
      lines.push(`${who} chưa nhập thành — vua dễ bị tấn công giữa bàn.`);
    }
  }

  // --- Queen early ---
  if (earlyQueenOut && earlyQueenOut.ply <= 6) {
    const who = human && earlyQueenOut.side === human ? 'Bạn' : COLOR_NAME[earlyQueenOut.side];
    lines.push(`${who} đưa Hậu ra rất sớm (nước ${Math.ceil(earlyQueenOut.ply / 2)}: <span class="rv-move">${earlyQueenOut.san}</span>). Hậu dễ bị quấy rồi mất nhịp triển khai.`);
    if (human && earlyQueenOut.side === human) tags.push({ t: 'Hậu ra sớm', c: 'mid' });
  }

  // --- Lost queen ---
  if (human && queenLostBy[human]) {
    lines.push(`Bạn mất Hậu ở nước thứ ${Math.ceil(queenLostBy[human] / 2)}. Đây thường là bước ngoặt — hãy kiểm tra ô bị tấn công trước khi để Hậu đứng trên đường nguy hiểm.`);
    tags.push({ t: 'Mất Hậu', c: 'bad' });
  } else if (human && queenLostBy[opposite(human)]) {
    lines.push(`Đối thủ mất Hậu ở nước ${Math.ceil(queenLostBy[opposite(human)] / 2)} — bạn đã tận dụng tốt cơ hội.`);
    tags.push({ t: 'Ăn Hậu', c: 'good' });
  }

  // --- Checks ---
  if (checks >= 5) {
    lines.push(`Có tới ${checks} lần chiếu trong ván — nhịp tấn công khá cao.`);
  } else if (human && checksOnHuman >= 3 && o && o.score === 0) {
    lines.push('Bạn bị chiếu khá nhiều. Khi bị chiếu, ưu tiên nước an toàn, tránh bỏ quân khi chạy vua.');
  }

  // --- Material ---
  const lead = matW - matB;
  if (Math.abs(lead) >= 5 && status === 'checkmate') {
    const ahead = lead > 0 ? 'Trắng' : 'Đen';
    lines.push(`Lợi thế chất liệu nghiêng về ${ahead} (${matW}–${matB} điểm tạm tính).`);
  }

  // --- Bad trade ---
  if (bigSwing && bigSwing.drop >= 4) {
    const who = human && bigSwing.side === human ? 'Bạn' : COLOR_NAME[bigSwing.side];
    if (bigSwing.kind === 'queen') {
      lines.push(`Điểm đáng chú ý: ${who} dùng Hậu đổi quân nhỏ tại <span class="rv-move">${bigSwing.san}</span> (nước ${Math.ceil(bigSwing.ply / 2)}) — thường là thiệt lớn trừ khi có chiếu hết hoặc bắt lại ngay.`);
    } else {
      lines.push(`Nước <span class="rv-move">${bigSwing.san}</span> (nước ${Math.ceil(bigSwing.ply / 2)}) của ${who} có vẻ đổi quân bất lợi.`);
    }
    if (human && bigSwing.side === human) tags.push({ t: 'Nước đáng tiếc', c: 'bad' });
  }

  // --- Tip ---
  const tips = [];
  if (human && !castled[human]) tips.push('Ưu tiên nhập thành trong 8–12 nước đầu.');
  if (human && earlyQueenOut && earlyQueenOut.side === human && earlyQueenOut.ply <= 6) tips.push('Triển khai Mã và Tượng trước, Hậu ra sau.');
  if (captures < 2 && moves > 15) tips.push('Chủ động tìm cách mở đường và trao đổi quân khi bị động.');
  if (status === 'checkmate' && o && o.score === 0) tips.push('Khi bị tấn công, kiểm tra tất cả nước chiếu và ô thoát của vua.');
  if (status === 'checkmate' && o && o.score === 1) tips.push('Phát huy thế thắng: khi hơn quân, hãy đơn giản hóa (đổi quân) để vào tàn cuộc.');
  if (!tips.length) tips.push('Mỗi ván hãy xem lại 1–2 nước then chốt — tiến bộ sẽ rất nhanh.');
  lines.push('Gợi ý: ' + tips[0]);

  if (plies < 4) {
    return {
      tags: [{ t: 'Ván rất ngắn', c: 'mid' }],
      lines: ['Ván quá ngắn để nhận xét sâu. Chơi thêm vài nước nữa để có phân tích hữu ích hơn.'],
    };
  }

  return { tags, lines };
}

function renderGameReview(o) {
  const box = $('resultReview');
  const body = $('resultReviewBody');
  if (!box || !body) return;
  const rev = buildGameReview(o);
  if (!rev) { box.hidden = true; body.innerHTML = ''; return; }
  box.hidden = false;
  const tagsHtml = rev.tags.map(x => `<span class="rv-tag ${x.c}">${x.t}</span>`).join('');
  const linesHtml = rev.lines.map(t => `<p>${t}</p>`).join('');
  body.innerHTML = (tagsHtml ? `<div>${tagsHtml}</div>` : '') + linesHtml;
}

// ---------------- Sổ luyện lỗi: phân tích ván vừa xong (coach.js) ----------------
// ---------------- Phân tích ván kiểu chess.com: xếp loại từng nước, xem lại trên bàn ----------------

// Nhận dữ liệu `review` của coach.js (hoặc bản lưu trong Nhật ký) cho ván đang trên bàn
function setReview(rev) {
  if (!rev || typeof rev.cls !== 'string' || typeof Coach === 'undefined' || !Coach.BY_CODE) { gameReview = null; return; }
  gameReview = {
    startFen: game.startFen,
    sans: game.history.slice(0, rev.cls.length).map(h => h.san),
    cls: [...rev.cls].map(c => (Coach.BY_CODE[c] || Coach.CLASS.good).id),
    evals: Array.isArray(rev.evals) ? rev.evals : [],
    best: Array.isArray(rev.best) ? rev.best : [],
    acc: rev.acc || {},
  };
}

// Bản phân tích còn khớp ván trên bàn tới nước thứ `upto` (đi lại rồi đi nước khác thì phần sau không còn đúng)
function activeReview() {
  const r = gameReview;
  if (!r || (mode !== 'play' && mode !== 'online') || game.startFen !== r.startFen) return null;
  if (typeof Puzzles !== 'undefined' && Puzzles.isActive()) return null;
  let upto = 0;
  const n = Math.min(r.sans.length, game.history.length);
  while (upto < n && game.history[upto].san === r.sans[upto]) upto++;
  return upto ? { ...r, upto } : null;
}

// Biểu tượng loại nước (giống chess.com): chữ !! ! ?! ? ?? hoặc hình nhỏ
const CLS_SVG = {
  best: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="m12 2.6 2.9 6 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6-4.8-4.6 6.6-.9z"/></svg>',
  excellent: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2.5 10.2h3.6V20H2.5zM7.6 20h9a2 2 0 0 0 2-1.6l1.3-6.3a2 2 0 0 0-2-2.4h-4.1l.6-3.7A2 2 0 0 0 11 4.4L7.6 9.8z"/></svg>',
  good: '<svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="m5.5 12.5 4.2 4.2L18.5 7.8"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3.5 5.6c2.7-1.2 5.8-1 8.5.6 2.7-1.6 5.8-1.8 8.5-.6v13.2c-2.7-1-5.8-.8-8.5.7-2.7-1.5-5.8-1.7-8.5-.7z"/></svg>',
  miss: '<svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" d="M7 7l10 10M17 7 7 17"/></svg>',
  forced: '<svg viewBox="0 0 24 24"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
};
function clsBadge(id, extra = '') {
  const c = typeof Coach !== 'undefined' && Coach.CLASS && Coach.CLASS[id];
  if (!c) return '';
  return `<span class="mvc mvc-${id}${extra ? ' ' + extra : ''}" title="${c.name}">${CLS_SVG[id] || `<i>${c.sym}</i>`}</span>`;
}

// Lời nhận xét cho từng loại nước
const CLS_SAY = {
  brilliant: 'là nước thiên tài!', great: 'là nước tuyệt vời: nước duy nhất giữ được thế cờ', best: 'là nước tốt nhất',
  excellent: 'là nước xuất sắc', good: 'là nước tốt', book: 'là nước lý thuyết khai cuộc', inaccuracy: 'là nước thiếu chính xác',
  mistake: 'là một sai lầm', miss: 'bỏ lỡ cơ hội trừng phạt sai lầm của đối thủ', blunder: 'là nước hớ', forced: 'là nước bắt buộc (duy nhất)',
};

// Điểm (góc Trắng) → nhãn hiển thị: +1.3, −0.4, M3 (chiếu hết sau 3 nước)
function fmtEval(cp) {
  if (Math.abs(cp) >= 9000) return (cp > 0 ? '' : '−') + 'M' + Math.max(1, Math.round((10000 - Math.abs(cp)) / 10));
  const v = cp / 100;
  return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
}

// Đồ thị đánh giá cả ván (phần trắng = lợi thế Trắng), chấm màu ở các nước thiên tài / hớ / sai; bấm để nhảy tới nước đó
const GRAPH_DOT = { brilliant: '#26c2a3', great: '#5c8bb0', miss: '#ee6b55', mistake: '#e58f2a', blunder: '#ca3431' };
function evalGraphHTML(rv, current = null) {
  const ev = rv.evals;
  if (!ev || ev.length < 2) return '';
  const W = 320, H = 64, n = ev.length - 1;
  const x = i => (W * i / n).toFixed(1);
  const y = cp => (H / 2 - (H / 2 - 2) * Math.max(-1, Math.min(1, cp / 800))).toFixed(1);
  const pts = ev.map((cp, i) => `${x(i)},${y(cp)}`).join(' ');
  const dots = rv.cls.map((c, i) => GRAPH_DOT[c] ? `<circle cx="${x(i + 1)}" cy="${y(ev[i + 1] || 0)}" r="3.2" fill="${GRAPH_DOT[c]}" stroke="#1d1c19" stroke-width="1"/>` : '').join('');
  const cur = current != null && current <= n ? `<line x1="${x(current)}" x2="${x(current)}" y1="0" y2="${H}" class="cur"/>` : '';
  return `<svg class="rv-graph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" data-n="${n}">
    <rect width="${W}" height="${H}" class="blk"/><polygon points="0,${H} ${pts} ${W},${H}" class="wht"/>
    <line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" class="mid"/>${cur}${dots}</svg>`;
}
function bindGraph(box) {
  const svg = box && box.querySelector('.rv-graph');
  if (!svg) return;
  svg.addEventListener('click', e => {
    const r = svg.getBoundingClientRect(), n = Number(svg.dataset.n);
    const ply = Math.max(0, Math.min(n, Math.round((e.clientX - r.left) / r.width * n)));
    enterReview(ply);
  });
}

// Bảng tổng kết kiểu chess.com: độ chính xác hai bên + số nước mỗi loại
function reviewSummaryHTML(rv) {
  const cnt = { w: {}, b: {} };
  const first = new Chess(rv.startFen).turn;
  rv.cls.forEach((c, i) => {
    const side = i % 2 === 0 ? first : opposite(first);
    cnt[side][c] = (cnt[side][c] || 0) + 1;
  });
  const name = c => escapeHtml((playerInfo(c) || {}).name || COLOR_NAME[c]);
  const ring = (v, c) => {
    const C = 2 * Math.PI * 22, a = v == null ? 0 : v;
    return `<div class="rv-acc-side ${c}"><span class="rv-who"><span class="pz-side ${c}"></span>${name(c)}</span>
      <span class="rv-ring"><svg viewBox="0 0 54 54"><circle cx="27" cy="27" r="22" class="track"/><circle cx="27" cy="27" r="22" class="fill" stroke-dasharray="${(C * a / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 27 27)"/></svg><b>${v == null ? '–' : v}</b></span></div>`;
  };
  const rows = Coach.CLASSES.filter(c => c.id !== 'forced' || cnt.w.forced || cnt.b.forced).map(c =>
    `<tr class="${(cnt.w[c.id] || cnt.b[c.id]) ? '' : 'zero'}"><td class="n w">${cnt.w[c.id] || 0}</td><td class="k">${clsBadge(c.id)}<span>${c.name}</span></td><td class="n b">${cnt.b[c.id] || 0}</td></tr>`).join('');
  return `<div class="rv-acc">${ring(rv.acc.w, 'w')}<span class="rv-acc-label">Độ chính xác</span>${ring(rv.acc.b, 'b')}</div>
    <table class="rv-table"><tbody>${rows}</tbody></table>`;
}

// Vào chế độ xem lại từng nước trên bàn (bắt đầu từ nước `ply`)
function enterReview(ply = 1) {
  const rv = activeReview();
  if (!rv) return;
  $('resultModal').hidden = true;
  const human = humanColorForReview();
  if (human) flipped = human === 'b';
  setViewPly(Math.max(0, Math.min(ply, game.history.length)));
  const box = $('reviewBox');
  if (box && window.innerWidth < 900) box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// Khung nhận xét nước đang xem (cạnh biên bản)
let reviewBoxKey = '';
function renderReviewBox() {
  const box = $('reviewBox');
  if (!box) return;
  const rv = activeReview();
  const ply = isLiveView() ? game.history.length : viewPly;
  const key = rv ? `${rv.cls.join('')}|${rv.upto}|${ply}|${flipped}` : '';
  if (key === reviewBoxKey) return;
  reviewBoxKey = key;
  box.hidden = !rv;
  if (!rv) { box.innerHTML = ''; return; }
  let body;
  if (ply === 0 || ply > rv.upto) {
    body = ply === 0 ? '<p class="rvb-say">Thế xuất phát · bấm Nước sau hoặc phím → để xem từng nước</p>'
      : '<p class="rvb-say">Nước này chưa được phân tích</p>';
  } else {
    const id = rv.cls[ply - 1], h = game.history[ply - 1];
    const side = h.move.piece[0];
    const s0 = new Chess(rv.startFen);
    const no = s0.fullmove + Math.floor((ply - 1 + (s0.turn === 'b' ? 1 : 0)) / 2);
    const best = rv.best[ply - 1];
    body = `<div class="rvb-move mvc-text-${id}">${clsBadge(id, 'lg')}<b>${no}${side === 'w' ? '.' : '...'} ${escapeHtml(h.san)}</b><span class="rvb-say">${CLS_SAY[id] || ''}</span>
        ${rv.evals[ply] != null ? `<span class="rvb-eval ${rv.evals[ply] >= 0 ? 'w' : 'b'}">${fmtEval(rv.evals[ply])}</span>` : ''}</div>
      ${best ? `<p class="rvb-best"><span>Nước tốt nhất:</span> <b>${escapeHtml(best)}</b></p>` : ''}`;
  }
  box.innerHTML = `<div class="rvb-head"><b>Phân tích ván</b><span class="rvb-acc"><span class="pz-side w"></span>${rv.acc.w ?? '–'} · <span class="pz-side b"></span>${rv.acc.b ?? '–'}</span>
      <button type="button" class="rvb-close" title="Tắt phân tích"><svg class="ic"><use href="#i-close"/></svg></button></div>
    ${evalGraphHTML(rv, ply)}${body}`;
  bindGraph(box);
  box.querySelector('.rvb-close').addEventListener('click', () => { gameReview = null; render(); });
}

let coachRun = null; // { progress, report, done, failed }

function startCoach(histId) {
  coachRun = null;
  if (typeof Coach === 'undefined' || quietResult) return;
  const puzzle = typeof Puzzles !== 'undefined' && Puzzles.isActive();
  const human = humanColorForReview(); // null = 2 người cùng máy: vẫn phân tích, không lưu thẻ ôn
  if (puzzle || game.history.length < 8 || (mode !== 'play' && mode !== 'online')) return;
  const label = mode === 'online'
    ? `Online với ${(Online.player(opposite(human)) || {}).name || 'đối thủ'}`
    : practice ? 'Ván tập từ Thư viện' : !human ? '2 người' : `Máy ${LEVEL_NAME[gameLevel]}`;
  const run = coachRun = { progress: 0, report: null, done: false };
  const sansAtEnd = game.history.map(h => h.san).join(' '), fenAtEnd = game.startFen;
  setTimeout(() => renderEval(null, ''), 0); // bắt đầu phân tích: hiện thanh đánh giá (ván Online)
  Coach.analyse({
    startFen: game.startFen,
    moves: game.history.map(h => ({ from: h.move.from, to: h.move.to, promotion: h.move.promotion || undefined })),
    human, label,
    onProgress: f => { run.progress = f; if (coachRun === run) renderCoachResult(); },
  }).then(r => {
    run.report = r; run.done = true; run.failed = !r;
    if (r && r.review) {
      const { cls, evals, best, acc } = r.review;
      if (histId) GameHistory.update(histId, { ...(r.accuracy != null ? { acc: r.accuracy } : {}), rev: { cls, evals, best, acc } });
      // Ván trên bàn vẫn là ván vừa phân tích: gắn bản phân tích để xem lại từng nước
      if (game.startFen === fenAtEnd && game.history.map(h => h.san).join(' ') === sansAtEnd) { setReview(r.review); render(); }
    }
    if (coachRun === run) renderCoachResult();
  })
    .catch(() => { run.done = true; run.failed = true; if (coachRun === run) renderCoachResult(); });
}

function renderCoachResult() {
  const box = $('resultCoach');
  if (!box) return;
  const run = coachRun;
  box.hidden = !run;
  if (!run) return;
  if (!run.done) {
    box.innerHTML = `<div class="rc-loading"><span class="spinner"></span><span>Stockfish đang phân tích từng nước của ván…</span><b>${Math.round(run.progress * 100)}%</b></div>
      <div class="progress"><div class="progress-bar" style="width:${Math.round(run.progress * 100)}%"></div></div>`;
    return;
  }
  const r = run.report;
  if (!r) { box.innerHTML = '<p class="rc-note">Không phân tích được ván này (chưa tải được Stockfish).</p>'; return; }
  const rv = activeReview();
  box.innerHTML = (rv ? reviewSummaryHTML(rv) + evalGraphHTML(rv) : '')
    + (r.accuracy != null ? (r.worst ? `<p class="rc-note">Lỗi đáng tiếc nhất của bạn: nước ${r.worst.no} ${r.worst.san}, nên đi <b>${r.worst.best}</b>.</p>` : '<p class="rc-note">Bạn không có nước hớ hay sai lầm nào. Rất tốt!</p>') : '')
    + (rv ? '<button type="button" id="rcReview" class="primary rc-review"><svg class="ic"><use href="#i-search"/></svg>Xem lại từng nước</button>' : '')
    + (r.added ? `<button type="button" id="rcTrain" class="rc-train"><svg class="ic"><use href="#i-target"/></svg>Đã thêm ${r.added} thế cờ vào Sổ luyện lỗi · Ôn ngay</button>` : '');
  bindGraph(box);
  const rb = $('rcReview');
  if (rb) rb.addEventListener('click', () => enterReview(1));
  const b = $('rcTrain');
  if (b) b.addEventListener('click', () => { $('resultModal').hidden = true; Puzzles.startReview(); });
}

function updateCoachBadge() {
  const el = $('puzzleBadge');
  if (!el || typeof Coach === 'undefined') return;
  const n = Profile.signedIn() || Profile.isGuest() ? Coach.due().length : 0;
  el.hidden = !n;
  el.textContent = n > 9 ? '9+' : n;
}
if (typeof Coach !== 'undefined') Coach.onChange(updateCoachBadge);
setInterval(updateCoachBadge, 60000);

function showResult(o, change, note) {
  const title = o.score == null
    ? (o.winner ? `${COLOR_NAME[o.winner]} thắng!` : 'Hòa!')
    : o.score === 1 ? 'Bạn thắng!' : o.score === 0 ? 'Bạn thua' : 'Hòa!';
  const kind = o.score == null ? (o.winner ? 'win' : 'draw') : o.score === 1 ? 'win' : o.score === 0 ? 'loss' : 'draw';
  $('resultIcon').className = 'result-icon ' + kind;
  $('resultIcon').innerHTML = `<svg class="ic"><use href="#i-${kind === 'win' ? 'trophy' : kind === 'loss' ? 'flag' : 'handshake'}"/></svg>`;
  $('resultTitle').textContent = title;
  $('resultReason').textContent = o.reason || '';
  const box = $('resultRating');
  box.innerHTML = '';
  if (change) {
    if (change.before) { // ván Online: có đổi rank
      const { before, after } = change;
      const sign = change.delta > 0 ? '+' : '';
      box.innerHTML = `<span class="muted">Rank</span>
        <span class="player-rank">${rankMedalOnly(before)}<b style="color:${before.color}">${before.text}</b></span>
        →
        <span class="player-rank">${rankMedalOnly(after)}<b style="color:${after.color}">${after.text}</b></span>
        <span class="delta ${change.delta > 0 ? 'up' : change.delta < 0 ? 'down' : ''}">${sign}${change.delta} exp</span>`;
      if (after.tier > before.tier) box.insertAdjacentHTML('beforeend', `<div class="rank-up">Lên rank ${after.name}!</div>`);
      else if (after.tier < before.tier) box.insertAdjacentHTML('beforeend', `<div class="rank-down">Xuống rank ${after.name}</div>`);
    }
    const e = change.elo;
    const es = e.delta > 0 ? '+' : '';
    box.insertAdjacentHTML('beforeend', `<div class="elo-line"><span class="muted">Elo</span> <b>${e.before}</b> → <b>${e.after}</b>
      <span class="delta ${e.delta > 0 ? 'up' : e.delta < 0 ? 'down' : ''}">${es}${e.delta}</span></div>`);
    if (change.contest) {
      const line = document.createElement('div');
      line.className = 'elo-line';
      line.innerHTML = '<span class="muted">Contest</span> <b></b> <span class="delta"></span>';
      line.querySelector('b').textContent = change.contest.name;
      const d = line.querySelector('.delta');
      d.textContent = `+${change.contest.pts} điểm`;
      if (change.contest.pts > 0) d.classList.add('up');
      box.appendChild(line);
    }
  } else if (note) {
    box.innerHTML = `<span class="muted">${note}</span>`;
  }
  const inContest = mode === 'online' && !!Online.contest();
  if (inContest) box.insertAdjacentHTML('beforeend', `<div class="elo-line muted">Web sẽ tự ghép ván contest tiếp theo sau ${AUTO_NEXT / 1000} giây</div>`);
  $('resultAgain').textContent = inContest ? 'Ván contest tiếp theo' : mode === 'online' ? 'Mời chơi ván mới' : 'Ván mới';
  $('resultAgain').hidden = mode === 'online' && !inContest && !Online.connected();
  try { renderGameReview(o); } catch (e) { const b = $('resultReview'); if (b) b.hidden = true; }
  renderCoachResult();
  $('resultModal').hidden = false;
  if (o.score === 1) celebrate();
}

// ---------------- Chuyển chế độ ----------------

function setMode(m) {
  if (m === 'online' && Profile.isGuest()) { guestBlocked('chơi Online'); return; }
  showBoard();
  if (m === mode) return;
  if (mode === 'online' && Online.inGame() && game.history.length >= 2 &&
      !confirm('Rời phòng giữa ván sẽ bị tính thua. Tiếp tục?')) return;
  if (mode === 'play' && m !== 'play' && !abandonBotGame()) return;
  if (mode === 'online' && Auto.running) Auto.paused.add(Auto.running); // tự rời Online: tạm dừng tự ghép contest
  quietResult = true;
  if (mode === 'online') Online.leave();
  if (mode === 'learn') Learn.leave();
  // Rời chế độ Chơi khi đang giải câu đố: tắt câu đố, nếu không mọi nước đi Online bị câu đố chặn lại và hoàn tác
  if (mode === 'play' && typeof Puzzles !== 'undefined') { try { Puzzles.showBanner(false); } catch {} }
  quietResult = false;
  mode = m;
  gameId++;
  thinking = false;
  aiColor = 'none';
  hint = null;
  marks.clear();
  ratedDone = true;
  playResult = null;
  // Xóa hết trạng thái kéo/chọn/hiệu ứng của ván cũ (đặc biệt khi rời Học cờ)
  if (drag && drag.ghost) drag.ghost.remove();
  drag = null;
  selected = -1;
  selectedMoves = [];
  seenMove = null;
  seenLen = 0;
  skipAnim = true;
  viewPly = null;
  flipped = false;
  assisted = false;
  redoStack = [];
  gameReview = null;
  $('resultModal').hidden = true;
  $('promo').hidden = true;
  document.body.dataset.mode = m;
  practice = false;
  clockOff();
  // Luôn xóa data-learn để CSS không còn ẩn/hiện bàn theo bài học
  if (m !== 'learn') document.body.dataset.learn = '';
  if (m === 'online') Profile.refreshAdmin(); // người vừa được cấp quyền admin thấy nút Gợi ý ngay
  for (const tab of document.querySelectorAll('.tab[data-mode]')) tab.setAttribute('aria-selected', tab.dataset.mode === m);
  $('playPanel').hidden = m !== 'play';
  $('onlinePanel').hidden = m !== 'online';
  $('learnPanel').hidden = m !== 'learn';
  if (m === 'play') newGame();
  else if (m === 'learn') Learn.enter();
  else {
    // Rời Học cờ / Chơi → Online: luôn về bàn cờ chuẩn, không giữ thế bài học
    game.reset();
    clearSelection();
    hint = null;
    marks.clear();
    flipped = false;
    ratedDone = true;
    playResult = null;
    render();
    renderPlayers();
    renderStatus();
  }
  // Ẩn modal bài học nếu còn sót
  const ld = $('learnDone');
  if (ld) ld.hidden = true;
}

// ---------------- PGN / FEN / xem lại / phím tắt ----------------
function gameToPGN() {
  const h = game.history;
  const me = Profile.me();
  const date = new Date();
  const ymd = `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
  let white = 'White', black = 'Black';
  if (mode === 'play') {
    if (aiColor === 'b') { white = me.name; black = 'Máy'; }
    else if (aiColor === 'w') { white = 'Máy'; black = me.name; }
    else { white = 'Người chơi Trắng'; black = 'Người chơi Đen'; }
  } else if (mode === 'online') {
    try {
      const w = Online.player('w'), b = Online.player('b');
      white = (w && w.name) || white;
      black = (b && b.name) || black;
    } catch {}
  }
  let result = '*';
  const s = game.status();
  const online = mode === 'online' ? Online.outcome() : null;
  const me2 = online ? humanColorForReview() : null;
  if (s === 'checkmate') result = game.turn === 'b' ? '1-0' : '0-1';
  else if (s !== 'playing') result = '1/2-1/2';
  else if (playResult) result = !playResult.winner ? '1/2-1/2' : playResult.winner === 'w' ? '1-0' : '0-1';
  else if (online && me2) { // ván Online kết thúc vì xin thua / hòa thỏa thuận / bỏ ván
    const winner = online.score === 1 ? me2 : online.score === 0 ? opposite(me2) : null;
    result = !winner ? '1/2-1/2' : winner === 'w' ? '1-0' : '0-1';
  }

  const startFen = game.startFen || START_FEN;
  const tags = [
    `[Event "Royal Gambit"]`,
    `[Site "Royal Gambit"]`,
    `[Date "${ymd}"]`,
    `[White "${white.replace(/"/g, '')}"]`,
    `[Black "${black.replace(/"/g, '')}"]`,
    `[Result "${result}"]`,
  ];
  // Ván bắt đầu từ thế riêng (tàn cuộc trong Thư viện, câu đố…): ghi kèm FEN để mở lại được ở web khác
  if (startFen !== START_FEN) tags.push('[SetUp "1"]', `[FEN "${startFen}"]`);
  let no = 1, side = 'w';
  try { const s0 = new Chess(startFen); no = s0.fullmove; side = s0.turn; } catch {}
  const moves = [];
  for (let i = 0; i < h.length; i++) {
    if (side === 'w') moves.push(`${no}.`);
    else if (i === 0) moves.push(`${no}...`);
    moves.push(h[i].san);
    if (side === 'b') no++;
    side = opposite(side);
  }
  moves.push(result);
  return tags.join('\n') + '\n\n' + moves.join(' ') + '\n';
}

// FEN của thế đang xem (hoặc live)
function gameToFEN() {
  return (isLiveView() ? game : boardAt(viewPly)).fen();
}

async function copyText(text, okMsg) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast(okMsg || 'Đã sao chép');
  } catch {
    toast('Không sao chép được — hãy thử lại');
  }
}

function bindRecordTools() {
  const pgn = $('copyPgn');
  const fen = $('copyFen');
  if (pgn) pgn.addEventListener('click', () => {
    if (!game.history.length) return toast('Chưa có nước đi');
    copyText(gameToPGN(), 'Đã sao chép PGN');
  });
  if (fen) fen.addEventListener('click', () => copyText(gameToFEN(), 'Đã sao chép FEN'));
  const go = (fn) => () => {
    if (!game.history.length) return;
    fn();
  };
  if ($('navStart')) $('navStart').addEventListener('click', go(() => setViewPly(0)));
  if ($('navPrev')) $('navPrev').addEventListener('click', go(() => {
    const cur = isLiveView() ? game.history.length : viewPly;
    setViewPly(Math.max(0, cur - 1));
  }));
  if ($('navNext')) $('navNext').addEventListener('click', go(() => {
    if (isLiveView()) return;
    setViewPly(viewPly + 1);
  }));
  if ($('navEnd') || $('navLive')) {
    const toLive = go(() => setViewPly(null));
    if ($('navEnd')) $('navEnd').addEventListener('click', toLive);
    if ($('navLive')) $('navLive').addEventListener('click', toLive);
  }
}

bindRecordTools();

// Phím tắt: Z đi lại · H gợi ý · F xoay · N ván mới · ← → xem lại · Esc về live
document.addEventListener('keydown', e => {
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key;
  if (k === 'z' || k === 'Z') { e.preventDefault(); if (mode === 'play') undo(); }
  else if (k === 'y' || k === 'Y') { e.preventDefault(); if (mode === 'play') redo(); }
  else if (k === 'h' || k === 'H') { e.preventDefault(); if ($('hint') && !$('hint').hidden) showHint(); }
  else if (k === 'f' || k === 'F') { e.preventDefault(); flipped = !flipped; render(); }
  else if (k === 'n' || k === 'N') { e.preventDefault(); if (mode === 'play') newGame(); }
  else if (k === 'ArrowLeft') { e.preventDefault(); if (game.history.length) { const cur = isLiveView() ? game.history.length : viewPly; setViewPly(Math.max(0, cur - 1)); } }
  else if (k === 'ArrowRight') { e.preventDefault(); if (!isLiveView()) setViewPly(viewPly + 1); }
  else if (k === 'Escape') { if (!isLiveView()) { e.preventDefault(); setViewPly(null); } }
  else if (k === '?') { e.preventDefault(); openModal('keysModal'); }
});

// ---------------- Hộp thoại ----------------

function openModal(id) {
  $(id).hidden = false;
  // Ẩn banner câu đố khi mở modal khác
  if (id !== 'puzzleModal' && typeof Puzzles !== 'undefined' && Puzzles.isActive && !Puzzles.isActive()) {
    document.querySelectorAll('#puzzleBanner, .puzzle-banner, .puzzle-banner-panel').forEach(el => el.remove());
  }
}

for (const modal of document.querySelectorAll('.modal:not(.auth-gate)')) {
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('[data-close]')) modal.hidden = true;
  });
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') for (const m of document.querySelectorAll('.modal:not(.auth-gate)')) m.hidden = true;
});

$('resultAgain').addEventListener('click', () => {
  $('resultModal').hidden = true;
  if (mode === 'online' && Online.contest()) autoNow();
  else if (mode === 'online') Online.rematch();
  else newGame();
});

// ---------------- Huy hiệu rank (SVG classic) ----------------
// Mỗi rank một biểu tượng kim loại phù hợp giao diện tối cổ điển của web.
let _medalUid = 0;
// Huy hiệu rank kiểu classic (khiên / chevron — cảm hứng Free Fire, không dùng hình tròn)
function rankMedalSVG(icon, color, glow) {
  const c = color || '#f5b83d';
  const g = glow || c;
  const id = 'rm' + (++_medalUid);
  const defs = `
    <defs>
      <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c}"/>
        <stop offset="45%" stop-color="${c}"/>
        <stop offset="100%" stop-color="${g}"/>
      </linearGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.45"/>
        <stop offset="50%" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <filter id="${id}f" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000" flood-opacity="0.55"/>
      </filter>
    </defs>`;
  // Khung khiên classic (đỉnh phẳng, đáy nhọn)
  const shield = `
    <path filter="url(#${id}f)" fill="url(#${id}g)" stroke="${g}" stroke-width="1.5" stroke-linejoin="round"
      d="M32 4 L54 12 V30 C54 44 44 54 32 60 C20 54 10 44 10 30 V12 Z"/>
    <path fill="url(#${id}s)" d="M32 4 L54 12 V28 C54 28 42 20 32 18 C22 20 10 28 10 28 V12 Z" opacity="0.55"/>
    <path fill="none" stroke="#fff" stroke-opacity="0.2" stroke-width="1"
      d="M32 8 L50 14 V30 C50 42 42 50 32 55 C22 50 14 42 14 30 V14 Z"/>`;

  const icons = {
    // Đồng — 1 chevron
    bronze: `${shield}
      <path d="M20 28 L32 22 L44 28 L32 34 Z" fill="#1a1916" opacity="0.35"/>
      <path d="M22 30 L32 25 L42 30 L32 35 Z" fill="#fff" opacity="0.9"/>`,
    // Bạc — 2 chevron
    silver: `${shield}
      <path d="M22 24 L32 19 L42 24 L32 29 Z" fill="#fff" opacity="0.95"/>
      <path d="M22 32 L32 27 L42 32 L32 37 Z" fill="#fff" opacity="0.75"/>`,
    // Vàng — 3 chevron + ngôi sao nhỏ
    gold: `${shield}
      <path d="M22 20 L32 15 L42 20 L32 25 Z" fill="#1a1916" opacity="0.25"/>
      <path d="M22 22 L32 17 L42 22 L32 27 Z" fill="#fff" opacity="0.95"/>
      <path d="M22 30 L32 25 L42 30 L32 35 Z" fill="#fff" opacity="0.8"/>
      <path d="M22 38 L32 33 L42 38 L32 43 Z" fill="#fff" opacity="0.65"/>`,
    // Bạch Kim — kim cương trong khiên
    platinum: `${shield}
      <path d="M32 18 L42 28 L32 44 L22 28 Z" fill="#fff" opacity="0.92"/>
      <path d="M32 22 L38 28 L32 38 L26 28 Z" fill="${g}" opacity="0.5"/>`,
    // Kim Cương — double diamond
    diamond: `${shield}
      <path d="M32 16 L44 28 L32 48 L20 28 Z" fill="none" stroke="#fff" stroke-width="2" opacity="0.95"/>
      <path d="M32 22 L38 28 L32 40 L26 28 Z" fill="#fff" opacity="0.85"/>`,
    // Cao Thủ — vương miện
    master: `${shield}
      <path d="M18 36 H46 V40 H18 Z" fill="#fff" opacity="0.85"/>
      <path d="M20 36 L24 22 L32 30 L40 22 L44 36 Z" fill="#fff" opacity="0.95"/>
      <circle cx="24" cy="22" r="2.2" fill="#fff"/><circle cx="32" cy="20" r="2.2" fill="#fff"/><circle cx="40" cy="22" r="2.2" fill="#fff"/>`,
    // Thách Đấu — ngôi sao lớn
    challenger: `${shield}
      <path d="M32 16l3.2 8.8h9.2l-7.4 5.4 2.8 8.8L32 34.2l-7.8 5.8 2.8-8.8-7.4-5.4h9.2z"
        fill="#fff" opacity="0.95"/>`,
  };
  const body = icons[icon] || icons.bronze;
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${defs}${body}</svg>`;
}

function rankBadgeHTML(rankOrTier, size) {
  // rankOrTier: object from rankOf() or RANKS[i] or {name,color,icon,glow}
  let r = rankOrTier;
  if (typeof rankOrTier === 'number') r = Profile.RANKS[rankOrTier] || Profile.RANKS[0];
  if (!r) return '';
  const icon = r.icon || (Profile.RANKS[r.tier] && Profile.RANKS[r.tier].icon) || 'bronze';
  const color = r.color || '#f5b83d';
  const glow = r.glow || color;
  const name = r.name || '';
  const sz = size || '';
  const cls = 'rank-badge' + (sz ? ' ' + sz : '');
  return `<span class="${cls}" style="--rk:${color};--rk2:${glow}" title="${name}">
    <span class="rb-medal">${rankMedalSVG(icon, color, glow)}</span>
    ${name ? `<span class="rb-name">${name}</span>` : ''}
  </span>`;
}

function rankMedalOnly(rankOrTier) {
  let r = rankOrTier;
  if (typeof rankOrTier === 'number') r = Profile.RANKS[rankOrTier] || Profile.RANKS[0];
  if (!r) return '';
  const icon = r.icon || (Profile.RANKS[r.tier] && Profile.RANKS[r.tier].icon) || 'bronze';
  const color = r.color || '#f5b83d';
  const glow = r.glow || color;
  return `<span class="rb-medal" style="--rk:${color}" title="${r.name || ''}">${rankMedalSVG(icon, color, glow)}</span>`;
}

// Hộp thoại rank: rank hiện tại, luật cộng/trừ exp và danh sách các rank
function openRank() {
  const R = Profile.rules;
  const me = Profile.me();
  const r = Profile.rankOf(me.exp);
  const stars = r.top
    ? `<span class="on">★</span> × ${r.stars}`
    : Array.from({ length: R.starsPerRank }, (_, i) => `<span class="${i < r.stars ? 'on' : ''}">★</span>`).join('');
  const note = r.top
    ? `Rank cao nhất · Tổng ${r.exp} exp`
    : `${r.inStar}/${R.perStar} exp tới sao tiếp theo · Tổng ${r.exp} exp`;
  const cur = $('rankCurrent');
  cur.style.setProperty('--rk', r.color);
  cur.innerHTML = `${rankBadgeHTML(r)}
    <div class="rk-stars">${stars}</div>
    <div class="progress"><div class="progress-bar" style="width:${100 * r.inStar / R.perStar}%;background:${r.color}"></div></div>
    <p class="muted">${note}</p>`;

  const fmt = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
  $('rankRules').innerHTML = `<span class="up">Thắng<b>${fmt(R.win)}</b></span>
    <span>Hòa<b>${fmt(R.draw)}</b></span>
    <span class="down">Thua<b>${fmt(R.loss)}</b></span>`;
  $('rankHint').textContent = `Rank chỉ tính ván Online · ${R.perStar} exp = 1 sao · đủ ${R.starsPerRank} sao thì lên rank tiếp theo.`;

  const list = $('rankTiers');
  list.innerHTML = '';
  Profile.RANKS.forEach((t, i) => {
    const li = document.createElement('li');
    li.className = i === r.tier ? 'cur' : i < r.tier ? 'done' : 'locked';
    li.style.setProperty('--rk', t.color);
    li.innerHTML = `${rankMedalOnly(t)}<b></b><small></small>`;
    li.querySelector('b').textContent = t.name;
    li.querySelector('small').textContent = i === 0 ? 'Khởi đầu' : `từ ${i * R.perRank} exp`;
    list.appendChild(li);
  });
  openModal('rankModal');
}

// ---------------- Trang hồ sơ ----------------
// #profile = hồ sơ của mình (kèm cài đặt), #profile/<uid> = hồ sơ người khác
// (bấm tên trên bảng xếp hạng hoặc bảng điểm contest). Huy chương bấm được để mở contest đó.

const ELO_CLASSES = [[0, 'Người mới'], [700, 'Cơ bản'], [1000, 'Trung cấp'], [1200, 'Expert'], [1500, 'Cao thủ'], [1800, 'Chuyên gia'], [2100, 'Huyền thoại']];
function eloClass(elo) {
  let name = ELO_CLASSES[0][1];
  for (const [min, n] of ELO_CLASSES) if (elo >= min) name = n;
  return name;
}

let pfView = null;  // { p, hist }: hồ sơ đang xem (hist = null khi đang tải lịch sử contest)
let pfToken = 0;    // bỏ qua kết quả tải của lần mở trước

function renderProfileAvatar() {
  if (!pfView || !pfView.p.me) return;
  const me = Profile.me();
  pfView.p.photo = me.photo;
  setAvatar($('profileAvatar'), { name: me.name, photo: me.photo, me: true }, 'w');
  $('avatarRemove').hidden = !me.photo;
}

// uid trong địa chỉ trang, '' = của mình, null = không ở trang hồ sơ
function profileRoute() {
  const m = /^#profile(?:\/([^/?#]+))?$/.exec(location.hash);
  if (!m) return null;
  return m[1] ? decodeURIComponent(m[1]) : '';
}

function openProfile(uid) {
  const target = uid && uid !== Profile.uid() ? '#profile/' + encodeURIComponent(uid) : '#profile';
  if (location.hash === target) routeProfile();
  else location.hash = target;
}

function closeProfilePage() {
  if (profileRoute() == null && $('profilePage').hidden) return;
  if (profileRoute() != null) history.pushState(null, '', location.pathname + location.search);
  routeProfile();
}

function routeProfile() {
  const route = entered ? profileRoute() : null;
  const page = $('profilePage');
  if (route == null) {
    page.hidden = true;
    document.body.dataset.page = '';
    pfView = null;
    pfToken++;
    applyHome();
    return;
  }
  for (const m of document.querySelectorAll('.modal:not(.auth-gate)')) m.hidden = true;
  page.hidden = false;
  document.body.dataset.page = 'profile';
  applyHome();
  window.scrollTo(0, 0);
  loadProfilePage(route || Profile.uid());
}
window.addEventListener('hashchange', routeProfile);

// ---------------- Trang chủ ----------------
// Trang chủ che bàn cờ (giống trang hồ sơ). Mọi lối vào bàn cờ (đổi chế độ, ván mới, ván online bắt đầu) gọi showBoard().

let entered = false; // đã qua màn đăng nhập
let homeOpen = false;
let homeTimer = null;
const homeCache = { contests: null, contestsAt: 0, top: null, topAt: 0 };
const homeVisible = () => !$('homePage').hidden;

function applyHome() {
  const show = homeOpen && entered && profileRoute() == null;
  $('homePage').hidden = !show;
  if (document.body.dataset.page !== 'profile') document.body.dataset.page = show ? 'home' : '';
  $('homeTab').setAttribute('aria-selected', String(show));
  for (const tab of document.querySelectorAll('.tab[data-mode]')) tab.setAttribute('aria-selected', String(!show && document.body.dataset.page !== 'profile' && tab.dataset.mode === mode));
  clearInterval(homeTimer);
  homeTimer = null;
  if (show) {
    renderHome();
    homeTimer = setInterval(tickHome, 1000);
  }
}

function openHome() {
  if (!entered) return;
  homeOpen = true;
  if (profileRoute() != null) closeProfilePage();
  else applyHome();
  window.scrollTo(0, 0);
}

function leaveHome() {
  if (!homeOpen) return;
  homeOpen = false;
  applyHome();
}

// Đưa người chơi về bàn cờ (đóng Trang chủ / trang hồ sơ)
function showBoard() {
  if (!entered || restoringGame) return; // đang khôi phục ván lúc vào web: giữ Trang chủ / trang được mở bằng link
  leaveHome();
  closeProfilePage();
}

function renderHome() {
  const me = Profile.me();
  const rank = Profile.rankOf(me.exp);
  const R = Profile.rules;
  setAvatar($('hmAvatar'), { name: me.name, photo: me.photo, me: true }, 'w');
  const h = new Date().getHours();
  $('hmGreet').textContent = h < 5 ? 'Chúc một đêm nhiều nước hay' : h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  $('hmName').innerHTML = (me.title ? titleBadge(me.title) + ' ' : '') + escapeHtml(me.name);
  const pct = rank.top ? 100 : Math.round(100 * rank.inStar / R.perStar);
  $('hmRank').innerHTML = `<button type="button" class="hm-rank-btn" title="Xem luật rank">${rankMedalOnly(rank)}
      <span class="hm-rank-text"><b style="color:${rank.color}">${rank.name}</b><span class="rk-stars">${starsHTML(rank)}</span></span></button>
    <span class="hm-exp" title="Exp tới ngôi sao tiếp theo"><span class="hm-exp-bar"><i style="width:${pct}%;background:${rank.color}"></i></span>
      <small>${rank.top ? '<span>Rank cao nhất</span>' : `${rank.inStar}/${R.perStar} exp`}</small></span>`;
  $('hmRank').querySelector('.hm-rank-btn').addEventListener('click', openRank);
  // Chế độ khách: không có rank / Elo, mời đăng nhập
  let gb = $('hmGuest');
  if (Profile.isGuest()) {
    $('hmRank').innerHTML = '<span class="hm-guest-chip">Chế độ khách</span>';
    if (!gb) {
      gb = document.createElement('div');
      gb.id = 'hmGuest';
      gb.className = 'hm-guest';
      gb.innerHTML = '<span><b>Bạn đang chơi với tư cách khách</b><small>Đăng nhập (hoặc dùng Google) để có rank, Elo, chơi Online, tham gia contest và đồng bộ nhật ký giữa các máy.</small></span><button type="button" class="primary">Đăng nhập / Đăng ký</button>';
      gb.querySelector('button').addEventListener('click', leaveGuest);
      $('hmStats').before(gb);
    }
    gb.hidden = false;
  } else if (gb) gb.hidden = true;

  const hist = typeof GameHistory !== 'undefined' ? GameHistory.read() : [];
  const res = hist.map(g => GameHistory.outcome(g)); // ván 2 người không tính vào tỉ lệ thắng
  const wins = res.filter(c => c === 'win').length;
  const decided = res.filter(c => c).length;
  const learn = typeof Learn !== 'undefined' && Learn.summary ? Learn.summary() : null;
  const pz = typeof Puzzles !== 'undefined' && Puzzles.summary ? Puzzles.summary() : null;
  const stat = (ic, val, label, cls = '', title = '') =>
    `<div class="hm-stat ${cls}"${title ? ` title="${title}"` : ''}><svg class="ic"><use href="#${ic}"/></svg><b>${val}</b><small>${label}</small></div>`;
  $('hmStats').innerHTML =
    stat('i-star', Profile.isGuest() ? '—' : me.elo, 'Elo', 'gold', 'Elo hiện tại') +
    stat('i-swords', hist.length, 'Ván đã chơi', '', 'Số ván trong nhật ký trên máy này') +
    stat('i-trophy', decided ? Math.round(100 * wins / decided) + '%' : '—', 'Tỉ lệ thắng', 'green') +
    stat('i-flame', learn ? learn.streak : 0, 'Chuỗi ngày học', 'flame') +
    stat('i-puzzle', pz ? `${pz.solved}<small>/${pz.total}</small>` : '—', 'Câu đố đã giải', 'blue');

  renderHomeResume();
  renderHomeDaily(pz);
  renderHomeTodo(pz, learn, hist);
  renderHomeRecent(hist);
  renderHomeOpening();
  loadHomeContests();
  loadHomeTop();
}

// Ván đang dở: nhắc quay lại bàn cờ
function renderHomeResume() {
  const box = $('hmResume');
  let title = '', sub = '';
  const n = Math.ceil(game.history.length / 2);
  if (mode === 'online' && Online.inGame()) { title = 'Ván Online đang diễn ra'; sub = $('topName').textContent; }
  else if (mode === 'learn' && Learn.inLesson()) { title = 'Bài học đang dở'; }
  else if (mode === 'play' && typeof Puzzles !== 'undefined' && Puzzles.isActive()) { title = 'Câu đố đang giải'; }
  else if (mode === 'play' && game.history.length && !playResult && !game.isGameOver()) {
    title = aiColor === 'none' ? 'Ván 2 người đang dở' : 'Ván đấu máy đang dở';
    if (aiColor !== 'none') sub = $('topName').textContent;
  }
  box.hidden = !title;
  if (!title) { box.innerHTML = ''; return; }
  box.innerHTML = `<span class="hm-resume-board lib-card-board lib-frame">${Library.fenBoard(gameToFEN(), flipped)}</span>
    <span class="hm-resume-main"><span class="hm-live-dot"></span><b>${title}</b>
      <small>${sub ? `<span class="hm-resume-opp"></span> · ` : ''}${mode === 'learn' ? '' : `<span>${n}</span> <span>nước</span>`}</small></span>
    <button type="button" class="primary hm-resume-go"><svg class="ic"><use href="#i-play"/></svg>Tiếp tục</button>`;
  const opp = box.querySelector('.hm-resume-opp');
  if (opp) opp.textContent = sub;
  box.querySelector('.hm-resume-go').addEventListener('click', showBoard);
}

const PZ_LV = { 'Dễ': 1, 'Trung bình': 2, 'Khó': 3 };
function renderHomeDaily(pz) {
  const box = $('hmDaily');
  if (!pz) { box.hidden = true; return; }
  const d = pz.daily;
  const now = new Date();
  box.innerHTML = `<button type="button" class="hm-daily-btn${pz.doneToday ? ' done' : ''}">
      <span class="pz-board lib-card-board lib-frame gold">${pz.board}</span>
      <span class="hm-daily-main">
        <span class="pz-ribbon"><svg class="ic"><use href="#i-star"/></svg>Câu đố hôm nay · ${p2(now.getDate())}/${p2(now.getMonth() + 1)}</span>
        <b class="hm-daily-title"></b>
        <span class="pz-chips"><span class="pz-lv lv-${PZ_LV[d.level] || 2}">${d.level}</span><span class="pz-chip"><span class="pz-side ${pz.side}"></span>${pz.side === 'w' ? 'Trắng đi' : 'Đen đi'}</span><span class="pz-chip">${pz.moves} nước</span></span>
        <span class="hm-daily-theme"></span>
        <span class="hm-daily-foot">
          <span class="pz-go">${pz.doneToday ? '✓ Đã giải hôm nay · giải lại' : 'Giải ngay'}</span>
          <span class="hm-daily-streak" title="Số ngày liên tiếp giải câu đố hôm nay"><svg class="ic"><use href="#i-flame"/></svg><b>${pz.streak}</b> ngày</span>
        </span>
      </span>
    </button>`;
  box.querySelector('.hm-daily-title').textContent = d.title;
  box.querySelector('.hm-daily-theme').textContent = 'Chủ đề: ' + d.theme;
  box.querySelector('button').addEventListener('click', () => Puzzles.playDaily());
}

function renderHomeTodo(pz, learn, hist) {
  const today = new Date().toDateString();
  const playedToday = hist.filter(g => new Date(g.at).toDateString() === today).length;
  const due = typeof Coach !== 'undefined' ? Coach.due().length : 0;
  const items = [];
  if (pz) items.push({ done: pz.doneToday, ic: 'i-puzzle', t: 'Giải câu đố hôm nay', s: pz.doneToday ? 'Đã xong' : 'Mỗi ngày một thế cờ mới', go: () => Puzzles.playDaily() });
  if (learn) items.push({ done: learn.today >= learn.goal, ic: 'i-cap', t: 'Đạt mục tiêu học hằng ngày', s: `${Math.min(learn.today, learn.goal)}/${learn.goal} XP`, pct: Math.min(1, learn.today / learn.goal), go: () => { leaveHome(); setMode('learn'); } });
  items.push({ done: !due, ic: 'i-target', t: 'Ôn sổ luyện lỗi', s: due ? `${due} thế cờ đến hạn` : 'Không có thế cờ nào đến hạn', go: () => (due ? Puzzles.startReview() : Puzzles.open()) });
  items.push({ done: playedToday > 0, ic: 'i-swords', t: 'Chơi ít nhất 1 ván', s: playedToday ? `${playedToday} ván hôm nay` : 'Đấu máy hoặc Online', go: () => { leaveHome(); setMode('play'); } });
  const done = items.filter(x => x.done).length;
  $('hmTodoCount').innerHTML = `<b>${done}</b>/${items.length}`;
  const box = $('hmTodo');
  box.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hm-todo-item' + (it.done ? ' done' : '');
    b.innerHTML = `<span class="hm-check"><svg class="ic"><use href="#${it.done ? 'i-check' : it.ic}"/></svg></span>
      <span class="hm-todo-text"><b>${it.t}</b><small>${it.s}</small>${it.pct != null ? `<span class="hm-mini-bar"><i style="width:${Math.round(100 * it.pct)}%"></i></span>` : ''}</span>
      <svg class="ic hm-chev"><use href="#i-chevron-right"/></svg>`;
    b.addEventListener('click', it.go);
    box.appendChild(b);
  }
  box.closest('.hm-card').classList.toggle('all-done', done === items.length);
}

function renderHomeRecent(hist) {
  const box = $('hmRecent');
  if (!hist.length) {
    box.innerHTML = `<div class="hm-empty"><p>Chưa có ván nào. Chơi ván đầu tiên nhé!</p><button type="button" class="primary" data-go="play"><svg class="ic"><use href="#i-play"/></svg>Chơi ngay</button></div>`;
    return;
  }
  box.innerHTML = '';
  for (const g of hist.slice(0, 5)) {
    const r = GameHistory.label(g);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'hm-game';
    const elo = Number.isFinite(g.elo) && g.elo ? `<span class="hm-elo ${g.elo > 0 ? 'up' : 'down'}">${g.elo > 0 ? '+' : ''}${g.elo}</span>` : '';
    row.innerHTML = `<span class="hm-res ${r.c}">${r.t}</span>
      <span class="hm-game-main"><b></b><small><svg class="ic"><use href="#${g.mode === 'online' ? 'i-globe' : g.mode === 'import' ? 'i-download' : 'i-cpu'}"/></svg><span>${g.mode === 'online' ? 'Online' : g.mode === 'import' ? 'Ván nhập' : /^2 người/.test(g.title || '') ? '2 người' : 'Đấu máy'}</span> · <span>${g.moves || 0}</span> <span>nước</span>${Number.isFinite(g.acc) ? ` · <span>${Math.round(g.acc)}%</span>` : ''}</small></span>
      ${elo}<span class="hm-when">${timeAgo(g.at)}</span>`;
    row.querySelector('b').textContent = g.opp ? (g.color === 'b' ? '♚ ' : '♔ ') + g.opp : g.title;
    row.addEventListener('click', () => GameHistory.open());
    box.appendChild(row);
  }
}

function renderHomeOpening() {
  const box = $('hmOpening');
  const day = typeof Library !== 'undefined' && Library.ofDay ? Library.ofDay() : null;
  if (!day) { box.hidden = true; return; }
  const o = day.o;
  box.innerHTML = `<header class="hm-card-head"><h2><svg class="ic"><use href="#i-library"/></svg>Khai cuộc hôm nay</h2><button type="button" class="hm-link" data-go="library">Thư viện<svg class="ic"><use href="#i-chevron-right"/></svg></button></header>
    <button type="button" class="hm-open-btn">
      <span class="lib-card-board lib-frame">${day.board}</span>
      <span class="hm-open-main"><span class="lib-tag ${o.cat}">${day.cat}</span><b></b><small class="hm-open-en"></small><code class="hm-open-moves"></code><span class="hm-open-desc"></span></span>
    </button>`;
  box.querySelector('b').textContent = o.nameVi;
  box.querySelector('.hm-open-en').textContent = o.name;
  box.querySelector('.hm-open-moves').textContent = o.moves;
  box.querySelector('.hm-open-desc').textContent = o.desc;
  box.querySelector('.hm-open-btn').addEventListener('click', () => Library.show(o.id));
}

async function loadHomeContests() {
  const box = $('hmContest');
  if (!homeCache.contests || Date.now() - homeCache.contestsAt > 60000) {
    if (!homeCache.contests) box.innerHTML = '<p class="hm-muted">Đang tải…</p>';
    try {
      homeCache.contests = await Contest.list();
      homeCache.contestsAt = Date.now();
    } catch {
      if (!homeCache.contests) box.innerHTML = '<p class="hm-muted">Không tải được danh sách contest.</p>';
      return;
    }
  }
  if (!homeVisible()) return;
  const now = Date.now();
  const live = homeCache.contests.filter(c => Contest.phase(c, now) === 'live').sort((a, b) => a.end - b.end);
  const next = homeCache.contests.filter(c => Contest.phase(c, now) === 'upcoming').sort((a, b) => a.start - b.start);
  const show = live.concat(next).slice(0, 2);
  if (!show.length) {
    box.innerHTML = `<div class="hm-empty small"><svg class="ic"><use href="#i-calendar"/></svg><p>Chưa có contest nào sắp diễn ra.</p></div>`;
    return;
  }
  box.innerHTML = '';
  for (const c of show) {
    const ph = Contest.phase(c, now);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hm-ct ' + ph;
    b.innerHTML = `<span class="hm-ct-badge">${ph === 'live' ? '<span class="hm-live-dot"></span>Đang diễn ra' : 'Sắp diễn ra'}</span>
      <b></b>
      <span class="hm-ct-time"><svg class="ic"><use href="#i-clock"/></svg><span>${ph === 'live' ? 'Kết thúc sau' : 'Bắt đầu sau'}</span> <b data-cd="${ph === 'live' ? c.end : c.start}">${fmtSpan((ph === 'live' ? c.end : c.start) - now)}</b></span>`;
    b.querySelector('b').textContent = c.name;
    b.addEventListener('click', () => openContestById(c.id));
    box.appendChild(b);
  }
}

async function loadHomeTop() {
  const box = $('hmTop');
  if (!homeCache.top || Date.now() - homeCache.topAt > 120000) {
    if (!homeCache.top) box.innerHTML = '<p class="hm-muted">Đang tải…</p>';
    try {
      homeCache.top = (await Profile.leaderboard('elo')).slice().sort((a, b) => (b.elo || 0) - (a.elo || 0));
      homeCache.topAt = Date.now();
    } catch {
      if (!homeCache.top) box.innerHTML = '<p class="hm-muted">Không tải được bảng xếp hạng.</p>';
      return;
    }
  }
  if (!homeVisible()) return;
  const rows = homeCache.top;
  if (!rows.length) { box.innerHTML = '<p class="hm-muted">Chưa có ai trên bảng xếp hạng.</p>'; return; }
  box.innerHTML = '';
  const meIdx = rows.findIndex(r => r.me);
  const add = (r, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hm-top-row' + (r.me ? ' me' : '') + (i < 3 ? ' p' + (i + 1) : '');
    b.innerHTML = `<span class="hm-top-pos">${i + 1}</span><span class="avatar"></span><span class="hm-top-name"></span><span class="hm-top-elo">${r.elo || 0}</span>`;
    setAvatar(b.querySelector('.avatar'), { name: r.name, photo: r.photo, me: r.me }, 'w');
    b.querySelector('.hm-top-name').innerHTML = (r.title ? titleBadge(r.title) + ' ' : '') + escapeHtml(r.name);
    b.addEventListener('click', () => openProfile(r.uid));
    box.appendChild(b);
  };
  rows.slice(0, 5).forEach(add);
  if (meIdx >= 5) {
    box.insertAdjacentHTML('beforeend', '<div class="hm-top-gap">⋯</div>');
    add(rows[meIdx], meIdx);
  }
}

function tickHome() {
  if (!homeVisible()) return;
  const now = Date.now();
  let ended = false;
  for (const el of $('hmContest').querySelectorAll('[data-cd]')) {
    const left = Number(el.dataset.cd) - now;
    if (left <= 0) ended = true;
    el.textContent = fmtSpan(left);
  }
  if (ended) loadHomeContests();
}

const HOME_GO = {
  play: () => { showBoard(); setMode('play'); },
  online: () => { showBoard(); setMode('online'); },
  learn: () => { showBoard(); setMode('learn'); },
  puzzle: () => Puzzles.open(),
  history: () => GameHistory.open(),
  library: () => Library.open(),
  contest: () => openContests(),
  leaderboard: () => openLeaderboard(),
};
$('homePage').addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if (b && HOME_GO[b.dataset.go]) HOME_GO[b.dataset.go]();
});
$('homeTab').addEventListener('click', openHome);
document.querySelector('.topbar .brand').addEventListener('click', e => {
  if (!entered) return;
  e.preventDefault();
  openHome();
});

const selfPlayer = () => ({ ...Profile.me(), uid: Profile.uid(), me: true, owner: Profile.isOwner(), lastGame: 0 });

async function loadProfilePage(id, fresh = false) {
  const token = ++pfToken;
  const self = id === Profile.uid();
  $('pfError').hidden = true;
  $('pfBody').hidden = false;
  if (self) renderProfilePage(selfPlayer(), null);
  else if (!pfView || pfView.p.uid !== id) renderProfileSkeleton();
  let p = null, hist = [];
  try {
    [p, hist] = await Promise.all([
      self ? selfPlayer() : Profile.player(id),
      Contest.history(id, fresh).catch(() => []),
    ]);
  } catch { p = null; }
  if (token !== pfToken) return;
  if (!p) {
    $('pfHero').hidden = true;
    $('pfBody').hidden = true;
    $('pfError').hidden = false;
    $('pfError').textContent = 'Không tìm thấy người chơi này, hoặc không tải được dữ liệu. Kiểm tra mạng rồi bấm Tải lại.';
    return;
  }
  renderProfilePage(p, hist);
}

function renderProfileSkeleton() {
  $('pfHero').hidden = false;
  $('pfName').textContent = 'Đang tải…';
  for (const id of ['pfChips', 'pfRankLine', 'pfMedalStrip', 'pfElo', 'pfEloClass', 'pfTiles', 'pfWdl', 'pfMedalCounts', 'pfMedals', 'pfContests', 'pfRankCard']) $(id).innerHTML = '';
  $('profileAvatar').innerHTML = '';
  $('profileAvatar').style.background = '';
}

function starsHTML(r) {
  const R = Profile.rules;
  if (r.top) return `<span class="on">★</span><small>×${r.stars}</small>`;
  return Array.from({ length: R.starsPerRank }, (_, i) => `<span class="${i < r.stars ? 'on' : ''}">★</span>`).join('');
}

function timeAgo(t) {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 90) return 'vừa xong';
  if (s < 3600) return `${Math.round(s / 60)} phút trước`;
  if (s < 86400) return `${Math.round(s / 3600)} giờ trước`;
  if (s < 30 * 86400) return `${Math.round(s / 86400)} ngày trước`;
  const d = new Date(t);
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function renderProfilePage(p, hist) {
  pfView = { p, hist };
  const rank = Profile.rankOf(p.exp);
  const medals = (hist || []).filter(h => h.medal);
  const counts = Contest.count(medals.map(m => ({ place: m.medal })));

  // ----- Phần đầu trang -----
  const hero = $('pfHero');
  hero.hidden = false;
  hero.style.setProperty('--rk', rank.color);
  setAvatar($('profileAvatar'), { name: p.name, photo: p.photo, me: true }, 'w');
  $('profileAvatar').classList.toggle('editable', !!p.me);
  $('profileAvatar').title = p.me ? 'Đổi ảnh đại diện' : '';
  $('pfAvatarEdit').hidden = !p.me;
  $('pfName').innerHTML = (p.title ? titleBadge(p.title) + ' ' : '') + escapeHtml(p.name);
  const chips = [];
  if (p.owner) chips.push('<span class="role-badge">Chủ web</span>');
  else if (p.me && Profile.isAdmin()) chips.push('<span class="role-badge">Admin</span>');
  if (p.me) chips.push('<span class="pf-chip">Bạn</span>');
  $('pfChips').innerHTML = chips.join('');
  $('pfRankLine').innerHTML = `${rankMedalOnly(rank)}<b style="color:${rank.color}">${rank.name}</b>
    <span class="pf-stars">${starsHTML(rank)}</span><span class="pf-dot">·</span><span>${rank.exp} exp</span>`
    + (p.lastGame ? `<span class="pf-dot">·</span><span>Hoạt động ${timeAgo(p.lastGame)}</span>` : '');
  const strip = $('pfMedalStrip');
  strip.innerHTML = '';
  counts.forEach((n, k) => { if (n) strip.appendChild(medalChip(k + 1, n)); });
  $('pfElo').textContent = p.elo;
  $('pfEloClass').textContent = p.placed ? eloClass(p.elo) : 'Chưa chọn trình độ';

  // ----- Ô số liệu -----
  const winRate = p.games ? Math.round(100 * p.wins / p.games) : null;
  const acc = p.me && typeof Coach !== 'undefined' ? Coach.averageAccuracy() : null;
  const tiles = [
    acc != null ? ['Độ chính xác', acc + '%', 'trung bình 10 ván gần nhất'] : ['Ván tính Elo', p.eloGames, 'cả ván đấu máy'],
    ['Ván Online', p.games, 'tính rank'],
    ['Tỉ lệ thắng', winRate == null ? '–' : winRate + '%', 'ván Online'],
    ['Contest đã dự', hist ? hist.length : '…', medals.length ? `${medals.length} huy chương` : 'chưa có huy chương'],
  ];
  $('pfTiles').innerHTML = tiles.map(([k, v, s]) => `<div class="pf-tile"><span>${k}</span><b>${v}</b><small>${s}</small></div>`).join('');

  // ----- Thắng / hòa / thua -----
  const wdl = $('pfWdl');
  if (!p.games) {
    wdl.innerHTML = `<p class="pf-empty">${p.me ? 'Bạn chưa chơi ván Online nào.' : 'Người chơi này chưa chơi ván Online nào.'}</p>`;
    $('pfWdlNote').textContent = '';
  } else {
    const parts = [['win', 'Thắng', p.wins], ['draw', 'Hòa', p.draws], ['loss', 'Thua', p.losses]];
    const pct = n => Math.round(100 * n / p.games);
    wdl.innerHTML = `<div class="pf-wdl-bar">${parts.filter(x => x[2]).map(([c, , n]) => `<span class="${c}" style="flex:${n}"></span>`).join('')}</div>
      <div class="pf-wdl-legend">${parts.map(([c, t, n]) => `<span class="${c}"><i></i>${t}<b>${n}</b><small>${pct(n)}%</small></span>`).join('')}</div>`;
    $('pfWdlNote').textContent = `${p.games} ván`;
  }

  // ----- Biểu đồ Elo (chỉ của mình: lịch sử lưu trên máy này) -----
  $('pfEloCard').hidden = !p.me;
  if (p.me) renderEloChart();

  renderProfileMedals(p, hist, medals, counts);
  renderProfileContests(p, hist);
  renderProfileSide(p, rank);
}

// Biểu đồ đường Elo theo từng ván, có đường dóng và chú thích khi rê chuột / chạm
function renderEloChart() {
  const box = $('pfEloChart');
  const me = Profile.me();
  const pts = Profile.eloHistory();
  if (!pts.length || pts[pts.length - 1][1] !== me.elo) pts.push([Date.now(), me.elo]);
  const vals = pts.map(x => x[1]);
  const hi = Math.max(...vals), lo = Math.min(...vals);
  $('pfEloNote').textContent = pts.length > 1 ? `Cao nhất ${hi} · Thấp nhất ${lo}` : '';
  if (pts.length < 2) {
    box.innerHTML = '<p class="pf-empty">Chơi vài ván tính Elo (Online hoặc đấu máy) để thấy biểu đồ. Lịch sử Elo được lưu trên máy này.</p>';
    return;
  }
  const W = Math.max(280, box.clientWidth || 560), H = 190;
  const pad = { l: 40, r: 14, t: 14, b: 26 };
  let yMin = Math.floor((lo - 20) / 50) * 50, yMax = Math.ceil((hi + 20) / 50) * 50;
  if (yMax - yMin < 100) yMax = yMin + 100;
  const step = (yMax - yMin) / 50 > 6 ? Math.ceil((yMax - yMin) / 4 / 50) * 50 : 50;
  const x = i => pad.l + (W - pad.l - pad.r) * (i / (pts.length - 1));
  const y = v => pad.t + (H - pad.t - pad.b) * (1 - (v - yMin) / (yMax - yMin));
  let grid = '';
  for (let v = yMin; v <= yMax; v += step) {
    grid += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${pad.l - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${v}</text>`;
  }
  const line = pts.map((q, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(q[1]).toFixed(1)}`).join('');
  const area = `${line}L${x(pts.length - 1).toFixed(1)},${H - pad.b}L${pad.l},${H - pad.b}Z`;
  const fmtDay = t => { const d = new Date(t); return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`; };
  const last = pts.length - 1;
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Elo qua ${pts.length} lần ghi, từ ${vals[0]} tới ${me.elo}">
      <defs><linearGradient id="pfEloFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
      ${grid}
      <path d="${area}" fill="url(#pfEloFill)"/>
      <path d="${line}" class="ln"/>
      <circle cx="${x(last)}" cy="${y(vals[last])}" r="4.5" class="end"/>
      <text x="${pad.l}" y="${H - 6}" class="axis">${fmtDay(pts[0][0])}</text>
      <text x="${W - pad.r}" y="${H - 6}" class="axis" text-anchor="end">${fmtDay(pts[last][0])}</text>
      <line class="cross" y1="${pad.t}" y2="${H - pad.b}" visibility="hidden"/>
      <circle class="hot" r="5" visibility="hidden"/>
      <rect class="hit" x="${pad.l}" y="0" width="${W - pad.l - pad.r}" height="${H}" fill="transparent"/>
    </svg><div class="pf-tip" hidden></div>`;
  const svg = box.querySelector('svg'), tip = box.querySelector('.pf-tip');
  const cross = svg.querySelector('.cross'), hot = svg.querySelector('.hot');
  const show = e => {
    const r = svg.getBoundingClientRect();
    const px = (e.clientX - r.left) * (W / r.width);
    const i = Math.max(0, Math.min(last, Math.round((px - pad.l) / (W - pad.l - pad.r) * last)));
    const cx = x(i), cy = y(vals[i]);
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
    hot.setAttribute('cx', cx); hot.setAttribute('cy', cy); hot.setAttribute('visibility', 'visible');
    const d = i ? vals[i] - vals[i - 1] : 0;
    tip.innerHTML = `<b>${vals[i]} Elo</b>${i ? ` <span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : '−'}${Math.abs(d)}</span>` : ''}<small>${fmtDate(pts[i][0])}</small>`;
    tip.hidden = false;
    const left = cx * (r.width / W);
    tip.style.left = Math.max(4, Math.min(r.width - tip.offsetWidth - 4, left - tip.offsetWidth / 2)) + 'px';
    tip.style.top = Math.max(0, cy * (r.height / H) - tip.offsetHeight - 12) + 'px';
  };
  const hide = () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); hot.setAttribute('visibility', 'hidden'); };
  const hit = svg.querySelector('.hit');
  hit.addEventListener('pointermove', show);
  hit.addEventListener('pointerdown', show);
  hit.addEventListener('pointerleave', hide);
}

let pfResizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(pfResizeTimer);
  pfResizeTimer = setTimeout(() => { if (pfView && pfView.p.me && !$('profilePage').hidden) renderEloChart(); }, 150);
});

function renderProfileMedals(p, hist, medals, counts) {
  const countsBox = $('pfMedalCounts');
  countsBox.innerHTML = '';
  [1, 2, 3].forEach(place => {
    const n = counts[place - 1];
    const card = document.createElement('div');
    card.className = 'pf-medal-count ' + MEDAL_CLS[place] + (n ? '' : ' none');
    card.appendChild(medalEl(place));
    card.insertAdjacentHTML('beforeend', `<b>${n}</b><span>${MEDAL_NAME[place]}</span>`);
    countsBox.appendChild(card);
  });
  const box = $('pfMedals');
  box.innerHTML = '';
  if (!hist) { box.innerHTML = '<p class="pf-empty">Đang tải huy chương…</p>'; return; }
  if (!medals.length) {
    box.innerHTML = `<p class="pf-empty">${p.me ? 'Bạn chưa có huy chương nào. Lọt top 3 một contest để nhận huy chương Vàng, Bạc hoặc Đồng!' : 'Người chơi này chưa có huy chương nào.'}</p>`;
    return;
  }
  for (const m of medals) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pf-medal-tile ' + MEDAL_CLS[m.medal];
    b.title = `Mở contest "${m.name}"`;
    b.appendChild(medalEl(m.medal));
    b.insertAdjacentHTML('beforeend', `<span class="pf-mt-main"><b></b><small>Hạng ${m.place}/${m.total} · ${m.pts} điểm · ${fmtDate(m.end)}</small></span>
      <svg class="ic pf-go"><use href="#i-chevron-right"/></svg>`);
    b.querySelector('b').textContent = m.name;
    b.addEventListener('click', () => openContestById(m.id));
    box.appendChild(b);
  }
}

function renderProfileContests(p, hist) {
  const box = $('pfContests');
  box.innerHTML = '';
  $('pfContestNote').textContent = hist && hist.length ? `${hist.length} contest` : '';
  if (!hist) { box.innerHTML = '<p class="pf-empty">Đang tải…</p>'; return; }
  if (!hist.length) {
    box.innerHTML = `<p class="pf-empty">${p.me ? 'Bạn chưa tham gia contest nào.' : 'Người chơi này chưa tham gia contest nào.'}</p>`;
    if (p.me) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pf-link';
      b.innerHTML = '<svg class="ic"><use href="#i-trophy"/></svg>Xem các contest sắp diễn ra';
      b.addEventListener('click', openContests);
      box.appendChild(b);
    }
    return;
  }
  for (const h of hist) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pf-contest-row ' + h.phase;
    const place = document.createElement('span');
    place.className = 'pf-cr-place';
    if (h.medal) place.appendChild(medalEl(h.medal));
    else place.textContent = h.phase === 'upcoming' ? '–' : '#' + h.place;
    b.appendChild(place);
    const status = h.phase === 'live' ? '<span class="pf-tag live">Đang diễn ra</span>'
      : h.phase === 'upcoming' ? '<span class="pf-tag soon">Đã đăng ký</span>'
      : !h.final ? '<span class="pf-tag">Đang chốt kết quả</span>'
      : `<span class="pf-tag">Hạng ${h.place}/${h.total}</span>`;
    b.insertAdjacentHTML('beforeend', `<span class="pf-cr-main"><b></b><small>${fmtDate(h.start)} · ${fmtDuration(h.end - h.start)}</small></span>
      ${status}
      <span class="pf-cr-pts"><b>${h.pts}</b><small>điểm</small></span>
      <span class="wdl pf-cr-wdl"><i class="w">${h.wins}</i> / ${h.draws} / <i class="l">${h.losses}</i></span>
      <svg class="ic pf-go"><use href="#i-chevron-right"/></svg>`);
    b.querySelector('b').textContent = h.name;
    b.addEventListener('click', () => openContestById(h.id));
    box.appendChild(b);
  }
}

function renderProfileSide(p, rank) {
  const R = Profile.rules;
  // Rank
  const next = !rank.top ? Profile.RANKS[rank.tier + 1] : null;
  const toNext = next ? (rank.tier + 1) * R.perRank - rank.exp : 0;
  const card = $('pfRankCard');
  card.style.setProperty('--rk', rank.color);
  card.innerHTML = `<div class="pf-card-head"><h2>Rank</h2><small>chỉ tính ván Online</small></div>
    <div class="pf-rank-body">${rankBadgeHTML(rank)}
      <div class="rk-stars">${starsHTML(rank)}</div>
      <div class="progress"><div class="progress-bar" style="width:${100 * rank.inStar / R.perStar}%;background:${rank.color}"></div></div>
      <p class="pf-rank-note">${rank.top ? `Rank cao nhất · ${rank.exp} exp` : `${rank.inStar}/${R.perStar} exp tới sao tiếp theo · còn ${toNext} exp lên <b style="color:${next.color}">${next.name}</b>`}</p>
    </div>`;
  if (p.me) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pf-link';
    b.innerHTML = '<svg class="ic"><use href="#i-crown"/></svg>Xem các bậc rank';
    b.addEventListener('click', openRank);
    card.appendChild(b);
  }

  // So sánh với mình (khi xem hồ sơ người khác)
  const vs = $('pfVsCard');
  vs.hidden = !!p.me;
  if (!p.me) {
    const me = Profile.me();
    const exp = 1 / (1 + Math.pow(10, (p.elo - me.elo) / 400));
    const pv = Profile.preview(p.elo);
    const sign = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
    vs.innerHTML = `<div class="pf-card-head"><h2>Nếu bạn đấu với ${escapeHtml(p.name)}</h2></div>
      <div class="pf-vs">
        <div><span>Bạn</span><b>${me.elo}</b></div>
        <svg class="ic"><use href="#i-swords"/></svg>
        <div><span>${escapeHtml(p.name)}</span><b>${p.elo}</b></div>
      </div>
      <div class="pf-vs-bar" title="Khả năng thắng theo Elo"><span style="width:${Math.round(exp * 100)}%"></span></div>
      <p class="pf-rank-note">Kỳ vọng điểm của bạn: <b>${Math.round(exp * 100)}%</b></p>
      <div class="elo-rules"><span>Thắng<b class="up">${sign(pv.win)}</b></span><span>Hòa<b>${sign(pv.draw)}</b></span><span>Thua<b class="down">${sign(pv.loss)}</b></span></div>`;
  }

  // Học cờ (của mình)
  const learn = $('pfLearnCard');
  learn.hidden = !p.me || typeof Learn === 'undefined' || !Learn.summary;
  if (!learn.hidden) {
    const s = Learn.summary();
    learn.innerHTML = `<div class="pf-card-head"><h2>Học cờ</h2><small>${s.done}/${s.total} bài</small></div>
      <div class="pf-learn">
        <span title="Chuỗi ngày học"><svg class="ic flame"><use href="#i-flame"/></svg><b>${s.streak}</b><small>ngày liên tiếp</small></span>
        <span title="Tổng XP"><svg class="ic bolt"><use href="#i-bolt"/></svg><b>${s.xp}</b><small>XP</small></span>
        <span title="Hôm nay"><svg class="ic target"><use href="#i-target"/></svg><b>${Math.min(s.today, s.goal)}/${s.goal}</b><small>XP hôm nay</small></span>
      </div>
      <div class="progress"><div class="progress-bar" style="width:${100 * s.done / Math.max(1, s.total)}%"></div></div>`;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pf-link';
    b.innerHTML = '<svg class="ic"><use href="#i-cap"/></svg>' + (s.done ? 'Học tiếp' : 'Bắt đầu học');
    b.addEventListener('click', () => { closeProfilePage(); setMode('learn'); });
    learn.appendChild(b);
  }

  // Ván gần đây (nhật ký trên máy này)
  const gamesCard = $('pfGamesCard');
  const games = p.me && typeof GameHistory !== 'undefined' ? GameHistory.read().slice(0, 5) : [];
  gamesCard.hidden = !p.me;
  if (p.me) {
    $('pfGames').innerHTML = games.length ? games.map(g => {
      const { t, c } = GameHistory.label(g);
      return `<div class="pf-game"><span class="pf-res ${c}">${t}</span><span class="pf-g-main"><b>${escapeHtml(g.title)}</b><small>${g.moves} nước · ${timeAgo(g.at)}</small></span></div>`;
    }).join('') : '<p class="pf-empty">Chưa có ván nào trong nhật ký.</p>';
  }

  // Cài đặt (của mình)
  $('pfSettings').hidden = !p.me;
  if (p.me) {
    $('avatarRemove').hidden = !p.photo;
    $('soundToggle').checked = Profile.prefs().sound;
    for (const box of document.querySelectorAll('#pfSettings [data-pref]')) {
      const k = box.dataset.pref;
      box.checked = OFF_BY_DEFAULT.has(k) ? !!Profile.prefs()[k] : Profile.prefs()[k] !== false;
    }
    $('notifyToggle').checked = !!Profile.prefs().notify && typeof Notification !== 'undefined' && Notification.permission === 'granted';
    renderRecovery();
    $('pwBtn').hidden = Profile.isGuest() || (Profile.remote && Profile.provider() === 'google');
    renderThemes();
  }
}

// ----- Huy chương contest (hạng 1 / 2 / 3 khi contest kết thúc) -----

const MEDAL_NAME = { 1: 'Vàng', 2: 'Bạc', 3: 'Đồng' };
const MEDAL_CLS = { 1: 'gold', 2: 'silver', 3: 'bronze' };
const MEDAL_TONES = {
  1: ['#fff1b0', '#f5c03d', '#a86e0e', '#4a3203'],
  2: ['#ffffff', '#c9d1d9', '#6f7a85', '#2b3138'],
  3: ['#ffd9b0', '#d08a4c', '#7f4519', '#3a1f08'],
};

// Huy chương có dây đeo: đĩa kim loại khắc số hạng
function medalSVG(place) {
  const id = 'md' + (++_medalUid);
  const [c1, c2, c3, ink] = MEDAL_TONES[place] || MEDAL_TONES[1];
  return `<svg viewBox="0 0 40 48" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient></defs>
    <path d="M8 0h8l8 18h-8z" fill="#45753c"/>
    <path d="M32 0h-8l-8 18h8z" fill="#81b64c"/>
    <path d="M22.4 0h1.6l-7.2 16.2-.8-1.8z" fill="#ffffff" opacity=".35"/>
    <circle cx="20" cy="32" r="14.5" fill="url(#${id})" stroke="${c3}" stroke-width="1.5"/>
    <circle cx="20" cy="32" r="10.5" fill="none" stroke="${ink}" stroke-opacity=".25" stroke-width="1.2"/>
    <path d="M10.5 26a11 11 0 0 1 9-8" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>
    <text x="20" y="37" text-anchor="middle" font-size="14" font-weight="800" fill="${ink}" font-family="Be Vietnam Pro, system-ui, sans-serif">${place}</text>
  </svg>`;
}

function medalEl(place) {
  const m = document.createElement('span');
  m.className = 'medal ' + MEDAL_CLS[place];
  m.title = `Huy chương ${MEDAL_NAME[place]}`;
  m.innerHTML = medalSVG(place);
  return m;
}

// Huy chương nhỏ kèm số lượng (bảng xếp hạng, đầu trang hồ sơ)
function medalChip(place, n) {
  const c = document.createElement('span');
  c.className = 'medal-chip ' + MEDAL_CLS[place];
  c.title = `${n} huy chương ${MEDAL_NAME[place]}`;
  c.appendChild(medalEl(place));
  if (n > 1) c.insertAdjacentHTML('beforeend', `<b>×${n}</b>`);
  return c;
}

// Mở thẳng bảng điểm một contest (bấm huy chương, thanh thông báo contest…)
async function openContestById(id) {
  await openContests();
  if (contestById.has(id)) openContestDetail(id);
  else toast('Contest này không còn tồn tại (có thể admin đã xóa).');
}

function renderThemes() {
  const box = $('themeChoices');
  box.innerHTML = '';
  const prefs = Profile.prefs();

  const boardTitle = document.createElement('div');
  boardTitle.className = 'skin-section';
  boardTitle.innerHTML = '<h4>Bàn cờ</h4>';
  box.appendChild(boardTitle);
  const boardGrid = document.createElement('div');
  boardGrid.className = 'themes';
  for (const [key, name, light, dark] of THEMES) {
    const b = document.createElement('button');
    b.className = 'theme' + (prefs.board === key ? ' on' : '') + (GLOW_BOARDS.has(key) ? ' glow' : '');
    b.title = name;
    const bg = light.startsWith('linear')
      ? `background-image:${light},${dark};background-size:50% 100%,50% 100%;background-position:0 0,100% 0;background-repeat:no-repeat`
      : `background:linear-gradient(135deg, ${light} 50%, ${dark} 50%)`;
    b.innerHTML = `<span style="${bg}"></span><small>${name}</small>`;
    b.addEventListener('click', () => {
      Profile.setPref('board', key);
      document.body.dataset.board = key;
      renderThemes();
    });
    boardGrid.appendChild(b);
  }
  box.appendChild(boardGrid);

  const pieceTitle = document.createElement('div');
  pieceTitle.className = 'skin-section';
  pieceTitle.innerHTML = '<h4>Quân cờ</h4>';
  box.appendChild(pieceTitle);
  const pieceGrid = document.createElement('div');
  pieceGrid.className = 'themes';
  for (const [key, name] of PIECE_SKINS) {
    const b = document.createElement('button');
    b.className = 'theme' + ((prefs.pieces || 'default') === key ? ' on' : '');
    b.title = name;
    b.innerHTML = `<div class="piece-preview${SVG_SKINS.has(key) ? ' pair' : ''}" data-pieces="${key}"><img src="${skinSrc(key, 'wN')}" alt="">${SVG_SKINS.has(key) ? `<img src="${skinSrc(key, 'bN')}" alt="">` : ''}</div><small>${name}</small>`;
    b.addEventListener('click', () => {
      Profile.setPref('pieces', key);
      document.body.dataset.pieces = key;
      renderThemes();
      render(); // vẽ lại quân trên bàn bằng bộ quân mới
    });
    pieceGrid.appendChild(b);
  }
  box.appendChild(pieceGrid);
}

$('logoutBtn').addEventListener('click', async () => {
  const midGame = mode === 'online' && Online.inGame() && game.history.length >= 2;
  if (midGame && !confirm('Đăng xuất giữa ván online sẽ bị tính thua. Tiếp tục?')) return;
  quietResult = true;
  if (mode === 'online') Online.leave(); // rời ván giữa chừng được ghi thua trước khi đăng xuất
  quietResult = false;
  $('logoutBtn').disabled = true;
  await Profile.logout();
  history.replaceState(null, '', location.pathname + location.search); // không mở lại trang hồ sơ cho tài khoản sau
  location.reload();
});
$('avatarUpload').addEventListener('click', () => $('avatarFile').click());
$('profileAvatar').addEventListener('click', () => { if (pfView && pfView.p.me) $('avatarFile').click(); });
$('pfAvatarEdit').addEventListener('click', () => $('avatarFile').click());
$('pfBack').addEventListener('click', () => closeProfilePage());
$('pfRefresh').addEventListener('click', () => { if (pfView) loadProfilePage(pfView.p.uid, true); });
$('pfGamesAll').addEventListener('click', () => GameHistory.open());
$('avatarFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = ''; // cho phép chọn lại cùng một file
  if (!file) return;
  try {
    await Profile.setPhoto(file);
    $('profileMsg').textContent = '';
  } catch (err) {
    $('profileMsg').textContent = err.message === 'size' ? 'Ảnh quá lớn (tối đa 10 MB).'
      : err.message === 'type' ? 'Chỉ nhận ảnh PNG, JPG, WebP hoặc GIF.'
      : 'Không đọc được ảnh này.';
  }
  renderProfileAvatar();
});
$('avatarRemove').addEventListener('click', () => { Profile.removePhoto(); renderProfileAvatar(); });
$('soundToggle').addEventListener('change', e => Profile.setPref('sound', e.target.checked));
for (const box of document.querySelectorAll('#pfSettings [data-pref]')) {
  box.addEventListener('change', () => { Profile.setPref(box.dataset.pref, box.checked); render(); });
}
$('keysBtn').addEventListener('click', () => openModal('keysModal'));
$('notifyToggle').addEventListener('change', async e => {
  const want = e.target.checked;
  $('profileMsg').textContent = '';
  if (want && typeof Notification === 'undefined') {
    e.target.checked = false;
    $('profileMsg').textContent = 'Trình duyệt này không hỗ trợ thông báo.';
    return;
  }
  if (want && Notification.permission !== 'granted') {
    let r = 'denied';
    try { r = await Notification.requestPermission(); } catch {}
    if (r !== 'granted') {
      e.target.checked = false;
      $('profileMsg').textContent = 'Trình duyệt đang chặn thông báo của web này. Hãy cho phép trong cài đặt trang (biểu tượng ổ khoá cạnh địa chỉ web).';
      return;
    }
  }
  Profile.setPref('notify', want);
  if (want) toast('Đã bật thông báo: web sẽ nhắc khi contest bạn đăng ký sắp bắt đầu (cần mở web trong trình duyệt).');
});

Profile.onChange(() => {
  renderHeader();
  if (entered && homeVisible()) renderHome();
  // Trang hồ sơ của mình đang mở: vẽ lại với số liệu mới (giữ lịch sử contest đã tải)
  if (pfView && pfView.p.me && !$('profilePage').hidden) renderProfilePage(selfPlayer(), pfView.hist);
  renderPlayers();
  renderRatedNote();
  if (entered && needsPlacement()) openPlacement(); // server báo chưa chọn trình độ
  if (adminRows.length && !$('adminModal').hidden) {
    const photo = Profile.me().photo;
    for (const p of adminRows) if (p.me) p.photo = photo;
    renderAdminList();
  }
});

// ---------------- Nút bấm ----------------

for (const tab of document.querySelectorAll('.tab[data-mode]')) tab.addEventListener('click', () => { closeProfilePage(); setMode(tab.dataset.mode); });
$('lbTab').addEventListener('click', openLeaderboard);
$('libTab').addEventListener('click', () => Library.open());
Library.bind();
if ($('puzzleTab')) $('puzzleTab').addEventListener('click', () => Puzzles.open());
if ($('histTab')) $('histTab').addEventListener('click', () => GameHistory.open());
if (typeof GameHistory !== 'undefined') GameHistory.bind();

$('contestTab').addEventListener('click', openContests);
$('lbRefresh').addEventListener('click', () => { lbData[lbBy] = null; loadLeaderboard(); });
const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
on('newGame', () => {
  // Chọn "Ngẫu nhiên": mỗi ván mới bốc lại màu
  if ($('mode').value !== 'none' && colorPick === 'r' && mode === 'play') $('mode').value = pickBotSide();
  newGame();
});
on('hint', () => { showHint().catch(e => console.warn(e)); });
on('onlineHint', () => { showHint().catch(e => console.warn(e)); });
on('adminTab', openAdmin);
on('adminRefresh', openAdmin);
if ($('adminSearch')) $('adminSearch').addEventListener('input', renderAdminList);
on('undo', undo);
on('redo', redo);
on('playResign', resignPlay);
on('flip', () => { flipped = !flipped; render(); });
on('onlineFlip', () => { flipped = !flipped; render(); }); // ván Online / contest
on('toolSound', () => {
  const onSound = !(Profile.prefs().sound);
  Profile.setPref('sound', onSound);
  const btn = $('toolSound');
  if (btn) {
    btn.classList.toggle('on', onSound);
    btn.title = onSound ? 'Tắt âm thanh' : 'Bật âm thanh';
    const use = btn.querySelector('use');
    if (use) use.setAttribute('href', onSound ? '#i-volume' : '#i-mute');
  }
  if (typeof toast === 'function') toast(onSound ? 'Đã bật âm' : 'Đã tắt âm');
});
on('toolEval', () => {
  const bar = $('evalBar');
  if (!bar) return;
  const hide = !bar.hidden;
  bar.hidden = hide;
  const btn = $('toolEval');
  if (btn) btn.classList.toggle('on', !hide);
  if (!hide) render();
  if (typeof toast === 'function') toast(hide ? 'Ẩn thanh đánh giá' : 'Hiện thanh đánh giá');
});
on('toolPgn', () => {
  if (!game.history.length) {
    if (typeof toast === 'function') toast('Chưa có nước đi');
    return;
  }
  if (typeof copyText === 'function') copyText(gameToPGN(), 'Đã sao chép PGN');
});
if ($('mode')) $('mode').addEventListener('change', changeSetup);
if ($('level')) $('level').addEventListener('change', changeSetup);
if ($('mode') && colorPick !== 'w') $('mode').value = pickBotSide(); // nhớ màu quân đã chọn lần trước
if ($('clockSel')) {
  try { const v = Profile.prefs().clock; if (v && [...$('clockSel').options].some(o => o.value === v)) $('clockSel').value = v; } catch {}
  $('clockSel').addEventListener('change', () => {
    const prev = Profile.prefs().clock || 'none';
    if (newGame()) Profile.setPref('clock', $('clockSel').value);
    else $('clockSel').value = prev;
  });
}
// Đồng bộ nút Âm lúc khởi động
(() => {
  const btn = $('toolSound');
  if (!btn) return;
  const onSound = !!Profile.prefs().sound;
  btn.classList.toggle('on', onSound);
  const use = btn.querySelector('use');
  if (use) use.setAttribute('href', onSound ? '#i-volume' : '#i-mute');
})();
$('rankBtn').addEventListener('click', openRank);
$('profileBtn').addEventListener('click', () => (Profile.isGuest() ? guestBlocked('có hồ sơ, rank và Elo') : openProfile()));
$('promo').addEventListener('click', e => {
  if (e.target === $('promo')) $('promo').hidden = true;
});

// Mở bằng link mời (?room=MÃ) thì vào thẳng phòng online
const room = new URLSearchParams(location.search).get('room');
renderHeader();
newGame();
// Tải sẵn Stockfish (~2 MB) khi trình duyệt rảnh, không tranh băng thông với lúc mở trang.
// Nếu người chơi cần máy đi / gợi ý trước đó thì engine.js tự tải ngay lúc ấy.
if (typeof Engine !== 'undefined' && Engine.load) {
  const preload = () => Engine.load().catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(preload, { timeout: 4000 });
  else setTimeout(preload, 1500);
}

// ---------------- Ngôn ngữ (i18n.js) ----------------
function renderLang() {
  if (typeof I18N === 'undefined') return;
  const l = I18N.lang();
  if ($('langLabel')) $('langLabel').textContent = l === 'vi' ? 'Tiếng Việt' : 'English';
  if ($('langSel')) $('langSel').value = l;
  for (const b of document.querySelectorAll('.auth-lang button')) b.classList.toggle('on', b.dataset.lang === l);
}
if (typeof I18N !== 'undefined') {
  on('langBtn', () => I18N.setLang(I18N.lang() === 'vi' ? 'en' : 'vi'));
  if ($('langSel')) $('langSel').addEventListener('change', e => I18N.setLang(e.target.value));
  for (const b of document.querySelectorAll('.auth-lang button')) b.addEventListener('click', () => I18N.setLang(b.dataset.lang));
  I18N.onChange(() => { renderLang(); if (pfView && !$('profilePage').hidden) renderProfilePage(pfView.p, pfView.hist); if (entered && homeVisible()) renderHome(); });
  renderLang();
}

// ---------------- Đăng nhập / đăng ký ----------------

const AUTH_ERRORS = {
  NAME: 'Tên đăng nhập 3–20 ký tự, chỉ gồm chữ không dấu, số và dấu _',
  WEAK: 'Mật khẩu cần ít nhất 6 ký tự',
  MISMATCH: 'Hai mật khẩu không khớp',
  EXISTS: 'Tên đăng nhập này đã có người dùng',
  RESERVED: 'Tên bắt đầu bằng "admin" chỉ dành cho chủ web, hãy chọn tên khác',
  BAD_LOGIN: 'Sai tên đăng nhập hoặc mật khẩu',
  TOO_MANY: 'Thử quá nhiều lần, hãy đợi một lúc rồi thử lại',
  NETWORK: 'Không kết nối được máy chủ. Kiểm tra mạng Internet.',
  NOT_ALLOWED: 'Máy chủ chưa bật cách đăng nhập này (Firebase Console › Authentication › Sign-in method, xem README).',
  POPUP: 'Trình duyệt đã chặn cửa sổ đăng nhập Google. Hãy cho phép cửa sổ bật lên rồi thử lại.',
  DOMAIN: 'Tên miền của web chưa được thêm vào Firebase (Authentication › Settings › Authorized domains).',
  SESSION: 'Phiên đăng nhập đã hết, hãy đăng nhập lại.',
  NO_REMOTE: 'Đăng nhập bằng Google cần cấu hình Firebase (xem README).',
  DENIED: 'Máy chủ từ chối truy cập, kiểm tra lại luật Firebase (xem README).',
  BAD_OLD: 'Mật khẩu hiện tại không đúng',
  SAME: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  GOOGLE: 'Tài khoản Google không dùng mật khẩu riêng ở đây. Đổi mật khẩu trong tài khoản Google của bạn.',
  EXPIRED: 'Mã đã hết hạn hoặc nhập sai quá nhiều lần. Bấm "Gửi lại mã" để nhận mã mới.',
  BAD_CODE: 'Mã xác nhận không đúng',
  NO_EMAIL: 'Tài khoản này chưa thêm Gmail khôi phục nên không gửi mã được. Hãy nhờ admin hỗ trợ.',
  NO_ACCOUNT: 'Không tìm thấy tài khoản có tên này',
  GOOGLE_ACC: 'Tài khoản này đăng nhập bằng Google, hãy bấm "Đăng nhập bằng Google".',
  WAIT: 'Vừa gửi mã rồi, đợi 1 phút rồi thử lại.',
  QUOTA: 'Hôm nay máy chủ đã gửi hết lượt email, hãy thử lại vào ngày mai.',
  BAD_EMAIL: 'Địa chỉ email không hợp lệ',
  NO_MAIL_API: 'Chủ web chưa bật máy chủ email (mailApi trong config.js, xem README).',
};
// Lỗi từ máy chủ email (kèm số lần thử còn lại khi sai mã)
const mailErr = err => err.message === 'BAD_CODE' && err.left ? `Mã xác nhận không đúng (còn ${err.left} lần thử)`
  : err.message === 'SESSION' ? 'Không xác minh được tài khoản. Hãy đăng xuất rồi đăng nhập lại; nếu vẫn lỗi, chủ web cần dán firebase-rules.json mới (mục "recovery").'
  : err.message === 'SERVER' ? 'Máy chủ email đang lỗi hoặc chưa cài xong (Apps Script), thử lại sau.'
  : AUTH_ERRORS[err.message] || 'Có lỗi xảy ra, thử lại sau.';
let authMode = 'login';

function setAuthMode(m) {
  authMode = m;
  const reg = m === 'register';
  $('authTabLogin').classList.toggle('on', !reg);
  $('authTabRegister').classList.toggle('on', reg);
  document.querySelector('.auth-tabs').classList.toggle('reg', reg);
  $('authPass2Wrap').hidden = !reg;
  $('authMsg').classList.remove('ok');
  $('authPass2').required = reg;
  $('authPass').autocomplete = reg ? 'new-password' : 'current-password';
  $('authSubmit').textContent = reg ? 'Tạo tài khoản' : 'Đăng nhập';
  $('authWelcome').textContent = reg ? 'Tạo tài khoản miễn phí để có rank, Elo và chơi Online.' : 'Chào mừng trở lại! Đăng nhập để tiếp tục.';
  $('authSwitch').innerHTML = reg
    ? '<span>Đã có tài khoản?</span> <button type="button" class="auth-link" data-go="login">Đăng nhập</button>'
    : '<span>Chưa có tài khoản?</span> <button type="button" class="auth-link" data-go="register">Đăng ký miễn phí</button>';
  $('authMsg').textContent = '';
  const form = $('authForm');
  form.classList.remove('swap'); void form.offsetWidth; form.classList.add('swap'); // hiệu ứng nhẹ khi đổi chế độ
  $('authForgotLink').hidden = m !== 'login' || !Profile.canRecover();
  authLive();
}

// Kiểm tra ngay khi gõ: tên đăng nhập, độ mạnh mật khẩu (đăng ký), hai mật khẩu khớp nhau
function authLive() {
  const reg = authMode === 'register';
  const name = $('authUser').value.trim(), pass = $('authPass').value, pass2 = $('authPass2').value;
  const hint = $('authUserHint');
  let ok = false, text = '3–20 ký tự: chữ không dấu, số và dấu _', bad = false;
  if (name) {
    if (!/^[A-Za-z0-9_]*$/.test(name)) { text = 'Chỉ dùng chữ không dấu, số và dấu _ (không dấu cách)'; bad = true; }
    else if (name.length < 3) text = `Cần ít nhất 3 ký tự (còn thiếu ${3 - name.length})`;
    else if (reg && /^admin/i.test(name) && name.toLowerCase() !== 'admin') { text = 'Tên bắt đầu bằng "admin" chỉ dành cho chủ web'; bad = true; }
    else { ok = true; text = reg ? 'Tên hợp lệ' : ''; }
  }
  hint.textContent = text;
  hint.className = 'auth-hint' + (bad ? ' bad' : ok ? ' good' : '');
  $('authUserOk').hidden = !(ok && reg);
  // Độ mạnh mật khẩu
  showStrength($('authStrength'), reg ? pass : '');
  $('authPass2Ok').hidden = !(reg && pass2 && pass2 === pass && pass.length >= 6);
}

// Thanh độ mạnh mật khẩu (4 vạch); pass rỗng thì ẩn
function showStrength(box, pass) {
  box.hidden = !pass;
  if (!pass) return;
  let sc = 0;
  if (pass.length >= 6) sc++;
  if (pass.length >= 10) sc++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) sc++;
  if (/\d/.test(pass) && /[^A-Za-z0-9]/.test(pass)) sc++;
  else if (/\d/.test(pass) && sc < 4) sc += pass.length >= 8 ? 1 : 0;
  sc = pass.length < 6 ? 0 : Math.max(1, Math.min(4, sc));
  const lv = ['Quá ngắn (cần ít nhất 6 ký tự)', 'Yếu', 'Tạm được', 'Mạnh', 'Rất mạnh'][sc];
  box.dataset.lv = sc;
  box.querySelector('small').textContent = 'Độ mạnh: ' + lv;
}

function enterApp() {
  if (entered) return;
  entered = true;
  $('authModal').hidden = true;
  renderHeader();
  renderPlayers();
  // Mở bằng link mời (?room=MÃ) thì vào thẳng phòng online (sau khi chọn trình độ)
  const go = () => {
    if (room && Profile.isGuest()) { toast('Link mời là ván Online: hãy đăng nhập để vào phòng.'); return; }
    if (room) {
      setMode('online');
      Online.join(room);
    }
  };
  homeOpen = !room; // vào web: mở Trang chủ (trừ khi vào bằng link mời phòng)
  if (!room) restoreSavedGame(); // ván đấu máy / 2 người đang dở lần trước (tải lại trang, tắt trình duyệt…)
  if (needsPlacement()) { afterPlace = go; openPlacement(); }
  else go();
  refreshAuto(); // contest đã đăng ký: hiện thông báo và tự ghép cặp khi tới giờ
  routeProfile(); // mở bằng link #profile
  routeContest(); // mở bằng link #contest/<id>
  updateCoachBadge();
  applyPendingForfeit();
  if (typeof GameHistory !== 'undefined' && GameHistory.sync) GameHistory.sync(); // nhật ký chơi trên máy khác
}

// Nhật ký vừa đồng bộ với tài khoản (có ván chơi trên máy khác): vẽ lại Trang chủ / Hồ sơ đang mở
if (typeof GameHistory !== 'undefined' && GameHistory.onChange) {
  GameHistory.onChange(() => {
    if (entered && homeVisible()) renderHome();
    if (pfView && pfView.p.me && !$('profilePage').hidden) renderProfilePage(selfPlayer(), pfView.hist);
  });
  // Quay lại tab / mở lại app trên điện thoại: đồng bộ (tối đa 1 lần mỗi phút)
  let lastVisSync = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !entered || Date.now() - lastVisSync < 60000) return;
    lastVisSync = Date.now();
    GameHistory.sync();
  });
}

// Lần trước thoát trang giữa ván Online (đóng tab, tải lại trang…): ván đó bị tính thua
function applyPendingForfeit() {
  const p = Online.takePendingForfeit();
  if (!p) return;
  try {
    Profile.record(0, p.oppElo);
    if (p.contest) Contest.record(p.contest, 0, p.startedAt);
    renderHeader();
  } catch {}
  toast(`Ván Online với ${p.opp || 'đối thủ'} lần trước bị tính thua vì bạn thoát trang giữa ván.`);
}

// ---------------- Chọn trình độ lần đầu ----------------

let afterPlace = null;

function needsPlacement() { return Profile.signedIn() && !Profile.me().placed; }

function openPlacement() {
  const box = $('placeChoices');
  if (!box.children.length) {
    for (const lv of Profile.LEVELS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'place-opt';
      btn.innerHTML = '<span class="po-main"><b></b><small></small></span><span class="po-elo"></span>';
      btn.querySelector('b').textContent = lv.name;
      btn.querySelector('small').textContent = lv.desc;
      btn.querySelector('.po-elo').textContent = lv.elo + ' Elo';
      btn.addEventListener('click', () => {
        Profile.place(lv.elo);
        $('placeModal').hidden = true;
        renderHeader();
        renderPlayers();
        const f = afterPlace;
        afterPlace = null;
        if (f) f();
      });
      box.appendChild(btn);
    }
  }
  $('placeModal').hidden = false;
}

$('authNote').textContent = Profile.remote
  ? ''
  : 'Chế độ cục bộ: tài khoản và bảng xếp hạng chỉ có trên trình duyệt này (bật bản toàn thế giới: xem README).';
$('authTabLogin').addEventListener('click', () => setAuthMode('login'));
$('authTabRegister').addEventListener('click', () => setAuthMode('register'));
$('authForm').addEventListener('submit', async e => {
  e.preventDefault();
  const user = $('authUser').value, pass = $('authPass').value;
  const msg = $('authMsg');
  msg.textContent = '';
  msg.classList.remove('ok');
  if (authMode === 'register' && pass !== $('authPass2').value) { msg.textContent = AUTH_ERRORS.MISMATCH; return; }
  $('authSubmit').disabled = true;
  $('authSubmit').classList.add('busy');
  $('authSubmit').textContent = authMode === 'login' ? 'Đang đăng nhập…' : 'Đang tạo tài khoản…';
  try {
    if (authMode === 'login') await Profile.login(user, pass);
    else await Profile.register(user, pass);
    $('authPass').value = $('authPass2').value = '';
    enterApp();
  } catch (err) {
    msg.textContent = AUTH_ERRORS[err.message] || 'Có lỗi xảy ra, thử lại sau.';
    const box = document.querySelector('.auth-box');
    box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
  }
  $('authSubmit').disabled = false;
  $('authSubmit').classList.remove('busy');
  $('authSubmit').textContent = authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản';
});
// Gõ tới đâu kiểm tra tới đó; nút con mắt hiện / ẩn mật khẩu; báo Caps Lock; link chuyển Đăng nhập ↔ Đăng ký
for (const id of ['authUser', 'authPass', 'authPass2']) $(id).addEventListener('input', authLive);
for (const b of document.querySelectorAll('.auth-eye')) {
  b.addEventListener('click', () => {
    const inp = $(b.dataset.for), show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    b.querySelector('use').setAttribute('href', show ? '#i-eye-off' : '#i-eye');
    b.title = show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';
    b.setAttribute('aria-label', b.title);
    inp.focus();
  });
}
for (const [id, capsId] of [['authPass', 'authCaps'], ['authPass2', 'authCaps'], ['pwOld', 'pwCaps'], ['pwNew', 'pwCaps'], ['pwNew2', 'pwCaps']]) {
  for (const ev of ['keydown', 'keyup']) $(id).addEventListener(ev, e => { if (e.getModifierState) $(capsId).hidden = !e.getModifierState('CapsLock'); });
  $(id).addEventListener('blur', () => { $(capsId).hidden = true; });
}
$('authForgotLink').hidden = !Profile.canRecover();
$('authSwitch').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) setAuthMode(b.dataset.go); });
// Bàn cờ minh hoạ ở cột giới thiệu (ván Opera của Morphy, nước chiếu hết cuối)
try { $('authBoard').innerHTML = Library.fenBoard('1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17', false, { from: sqIndex('d1'), to: sqIndex('d8') }); } catch {}

// ----- Đổi mật khẩu (Hồ sơ › Cài đặt) -----
$('pwBtn').addEventListener('click', () => {
  for (const id of ['pwOld', 'pwNew', 'pwNew2']) { $(id).value = ''; $(id).type = 'password'; }
  for (const b of document.querySelectorAll('#pwForm .auth-eye')) { b.querySelector('use').setAttribute('href', '#i-eye'); b.title = 'Hiện mật khẩu'; }
  $('pwMsg').textContent = '';
  $('pwStrength').hidden = $('pwCaps').hidden = true;
  $('pwNote').textContent = Profile.remote ? 'Sau khi đổi, các thiết bị khác đang đăng nhập tài khoản này sẽ phải đăng nhập lại.' : 'Tài khoản cục bộ: mật khẩu mới chỉ áp dụng trên trình duyệt này.';
  openModal('pwModal');
  setTimeout(() => $('pwOld').focus(), 50);
});
$('pwNew').addEventListener('input', () => showStrength($('pwStrength'), $('pwNew').value));
$('pwForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('pwMsg'), btn = $('pwSubmit');
  const oldPw = $('pwOld').value, newPw = $('pwNew').value;
  msg.textContent = '';
  let err = !oldPw ? 'Nhập mật khẩu hiện tại' : newPw.length < 6 ? AUTH_ERRORS.WEAK : newPw !== $('pwNew2').value ? AUTH_ERRORS.MISMATCH : '';
  if (!err) {
    btn.disabled = true; btn.classList.add('busy'); btn.textContent = 'Đang đổi…';
    try {
      await Profile.changePassword(oldPw, newPw);
      $('pwModal').hidden = true;
      toast('Đã đổi mật khẩu');
    } catch (ex) { err = AUTH_ERRORS[ex.message] || 'Có lỗi xảy ra, thử lại sau.'; }
    btn.disabled = false; btn.classList.remove('busy'); btn.textContent = 'Đổi mật khẩu';
  }
  if (err) {
    msg.textContent = err;
    const box = document.querySelector('.pw-box');
    box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
  }
});

// ----- Quên mật khẩu: gửi mã về Gmail khôi phục rồi đặt mật khẩu mới -----
let afStep = 1, afName = '', afTimer = 0;
function showForgot(on) {
  $('authForm').hidden = $('authAlt').hidden = on;
  document.querySelector('.auth-tabs').hidden = on;
  $('authWelcome').hidden = on;
  $('authForgot').hidden = !on;
  if (!on) return;
  afSetStep(1);
  $('afUser').value = $('authUser').value.trim();
  $('afMsg').textContent = '';
  setTimeout(() => $('afUser').focus(), 30);
}
function afSetStep(n) {
  afStep = n;
  $('afS1').hidden = n !== 1;
  $('afS2').hidden = n !== 2;
  $('afDot1').classList.toggle('on', n === 1);
  $('afDot1').classList.toggle('done', n > 1);
  $('afDot2').classList.toggle('on', n === 2);
  $('afSubmit').textContent = n === 1 ? 'Gửi mã' : 'Đặt lại mật khẩu';
  if (n === 2) {
    for (const id of ['afCode', 'afNew', 'afNew2']) $(id).value = '';
    $('afStrength').hidden = true;
    setTimeout(() => $('afCode').focus(), 30);
  }
}
// Nút "Gửi lại mã" đếm ngược 60 giây
function afCooldown(btn, sec = 60) {
  clearInterval(afTimer);
  const label = 'Gửi lại mã';
  const tick = () => {
    btn.disabled = sec > 0;
    btn.textContent = sec > 0 ? `${label} (${sec}s)` : label;
    if (sec-- <= 0) clearInterval(afTimer);
  };
  tick();
  afTimer = setInterval(tick, 1000);
}
async function afSend() {
  const r = await Profile.resetStart(afName);
  $('afSent').textContent = `Đã gửi mã 6 số tới ${r.to}`;
  afCooldown($('afResend'));
}
function shakeBox(sel) { const box = document.querySelector(sel); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
$('authForgotLink').addEventListener('click', () => showForgot(true));
$('afBack').addEventListener('click', () => { clearInterval(afTimer); showForgot(false); });
$('afNew').addEventListener('input', () => showStrength($('afStrength'), $('afNew').value));
for (const id of ['afCode', 'recCode']) $(id).addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); });
$('afResend').addEventListener('click', async () => {
  $('afMsg').textContent = '';
  try { await afSend(); } catch (err) { $('afMsg').textContent = mailErr(err); }
});
$('authForgot').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('afMsg'), btn = $('afSubmit');
  msg.textContent = '';
  let err = '';
  if (afStep === 1) {
    afName = $('afUser').value.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(afName)) err = AUTH_ERRORS.NAME;
  } else {
    const code = $('afCode').value.trim(), pw = $('afNew').value;
    err = !/^\d{6}$/.test(code) ? 'Nhập đủ 6 số của mã xác nhận' : pw.length < 6 ? AUTH_ERRORS.WEAK : pw !== $('afNew2').value ? AUTH_ERRORS.MISMATCH : '';
  }
  if (!err) {
    btn.disabled = true; btn.classList.add('busy');
    btn.textContent = afStep === 1 ? 'Đang gửi mã…' : 'Đang đặt lại…';
    try {
      if (afStep === 1) { await afSend(); afSetStep(2); }
      else {
        await Profile.resetConfirm(afName, $('afCode').value.trim(), $('afNew').value);
        clearInterval(afTimer);
        showForgot(false);
        setAuthMode('login');
        $('authUser').value = afName;
        $('authPass').value = '';
        authLive();
        $('authMsg').textContent = 'Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.';
        $('authMsg').classList.add('ok');
        $('authPass').focus();
      }
    } catch (ex) { err = mailErr(ex); }
    btn.disabled = false; btn.classList.remove('busy');
    if (!$('authForgot').hidden) btn.textContent = afStep === 1 ? 'Gửi mã' : 'Đặt lại mật khẩu';
  }
  if (err) { msg.textContent = err; shakeBox('.auth-box'); }
});
// Thông báo lỗi đăng nhập bình thường thì bỏ kiểu "thành công"
for (const id of ['authUser', 'authPass']) $(id).addEventListener('input', () => $('authMsg').classList.remove('ok'));

// ----- Gmail khôi phục (Hồ sơ › Cài đặt) -----
async function renderRecovery() {
  const row = $('recRow');
  const show = Profile.canRecover() && Profile.signedIn() && !Profile.isGuest() && Profile.provider() !== 'google';
  row.hidden = !show;
  if (show) {
    $('recEmailText').textContent = 'Đang tải…';
    let email = Profile.recoveryEmail(), failed = false;
    try { email = await Profile.loadRecovery(); } catch { failed = true; }
    $('recEmailText').textContent = email || (failed ? 'Không tải được, kiểm tra mạng' : 'Chưa có – thêm để lấy lại mật khẩu khi quên');
    row.classList.toggle('set', !!email);
    $('recBtn').textContent = email ? 'Đổi' : 'Thêm';
  }
  renderMailNotify();
}
let recStep = 1;
function recSetStep(n) {
  recStep = n;
  $('recS1').hidden = n !== 1;
  $('recS2').hidden = n !== 2;
  $('recSubmit').textContent = n === 1 ? 'Gửi mã xác nhận' : 'Xác nhận';
  setTimeout(() => $(n === 1 ? 'recEmailIn' : 'recCode').focus(), 50);
}
$('recBtn').addEventListener('click', () => {
  const cur = Profile.recoveryEmail();
  $('recCurrent').hidden = !cur;
  $('recCurrent').textContent = cur ? 'Đang dùng: ' + cur : '';
  $('recRemove').hidden = !cur;
  $('recEmailIn').value = ''; $('recCode').value = ''; $('recMsg').textContent = '';
  openModal('recModal');
  recSetStep(1);
});
$('recForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('recMsg'), btn = $('recSubmit');
  msg.textContent = '';
  let err = '';
  const email = $('recEmailIn').value.trim();
  if (recStep === 1 && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) err = AUTH_ERRORS.BAD_EMAIL;
  if (recStep === 2 && !/^\d{6}$/.test($('recCode').value.trim())) err = 'Nhập đủ 6 số của mã xác nhận';
  if (!err) {
    btn.disabled = true; btn.classList.add('busy');
    btn.textContent = recStep === 1 ? 'Đang gửi mã…' : 'Đang xác nhận…';
    try {
      if (recStep === 1) {
        const r = await Profile.recoveryStart(email);
        $('recSent').textContent = `Đã gửi mã 6 số tới ${r.to}. Mở Gmail rồi nhập mã vào đây.`;
        recSetStep(2);
      } else {
        const saved = await Profile.recoveryConfirm($('recCode').value);
        $('recModal').hidden = true;
        toast('Đã lưu Gmail khôi phục: ' + saved);
        renderRecovery();
      }
    } catch (ex) { err = mailErr(ex); }
    btn.disabled = false; btn.classList.remove('busy');
    btn.textContent = recStep === 1 ? 'Gửi mã xác nhận' : 'Xác nhận';
  }
  if (err) { msg.textContent = err; shakeBox('.rec-box'); }
});
$('recAgain').addEventListener('click', () => { $('recMsg').textContent = ''; $('recCode').value = ''; recSetStep(1); });
$('recRemove').addEventListener('click', async () => {
  if (!confirm('Gỡ Gmail khôi phục? Bạn sẽ không lấy lại được mật khẩu qua email và không nhận thông báo qua Gmail nữa.')) return;
  try {
    await Profile.recoveryRemove();
    $('recModal').hidden = true;
    toast('Đã gỡ Gmail khôi phục');
    renderRecovery();
  } catch (ex) { $('recMsg').textContent = mailErr(ex); }
});

// ----- Đăng nhập bằng Google (Gmail) và chế độ khách -----
$('authGoogle').hidden = !Profile.remote; // cần Firebase
function showNameStep(on, suggest = '') {
  $('authForm').hidden = on;
  $('authAlt').hidden = on;
  document.querySelector('.auth-tabs').hidden = on;
  $('authNameForm').hidden = !on;
  $('authGMsg').textContent = '';
  if (on) {
    $('authGEmail').textContent = Profile.email();
    $('authGName').value = suggest;
    $('authGName').focus();
  }
}
$('authGoogle').addEventListener('click', async () => {
  const msg = $('authMsg');
  msg.textContent = '';
  $('authGoogle').disabled = true;
  try {
    const r = await Profile.loginGoogle();
    if (r.needName) showNameStep(true, r.suggest); // lần đầu: chọn tên hiển thị
    else enterApp();
  } catch (err) {
    if (err.message !== 'CANCELLED') msg.textContent = AUTH_ERRORS[err.message] || 'Có lỗi xảy ra, thử lại sau.';
  }
  $('authGoogle').disabled = false;
});
$('authNameForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('authGMsg').textContent = '';
  $('authGSubmit').disabled = true;
  try {
    await Profile.chooseName($('authGName').value);
    showNameStep(false);
    enterApp();
  } catch (err) {
    $('authGMsg').textContent = AUTH_ERRORS[err.message] || 'Có lỗi xảy ra, thử lại sau.';
    if (err.message === 'SESSION') { Profile.cancelGoogle(); setTimeout(() => showNameStep(false), 1500); }
  }
  $('authGSubmit').disabled = false;
});
$('authGCancel').addEventListener('click', () => { Profile.cancelGoogle(); showNameStep(false); });
$('authGuest').addEventListener('click', () => { Profile.enterGuest(); enterApp(); });

// Khách bấm vào tính năng cần tài khoản: mời đăng nhập
function guestBlocked(what) {
  if (confirm(`Chế độ khách không ${what} được. Đăng nhập hoặc đăng ký tài khoản (miễn phí)?`)) leaveGuest();
}
async function leaveGuest() {
  await Profile.logout();
  history.replaceState(null, '', location.pathname + location.search);
  location.reload();
}

// ----- Cài đặt: gửi thông báo về Gmail (tài khoản Google) -----
async function renderMailNotify() {
  const row = $('mailNotifyRow'), box = $('mailNotifyToggle'), note = $('mailNotifyNote');
  if (!row) return;
  row.hidden = note.hidden = !Profile.remote;
  if (!Profile.remote) return;
  const can = Profile.canEmail();
  box.disabled = !can;
  if (!can) { box.checked = false; note.textContent = Profile.canRecover() && Profile.provider() !== 'google' ? 'Thêm Gmail khôi phục (ở dưới) để nhận thông báo qua Gmail.' : 'Đăng nhập bằng Google để nhận thông báo qua Gmail.'; return; }
  note.textContent = 'Gửi tới ' + Profile.email();
  box.checked = await Profile.getEmailNotify();
}
$('mailNotifyToggle').addEventListener('change', async e => {
  const on = e.target.checked;
  e.target.disabled = true;
  try {
    await Profile.setEmailNotify(on);
    toast(on ? 'Đã bật: thông báo sẽ được gửi về ' + Profile.email() : 'Đã tắt thông báo qua Gmail');
  } catch (err) {
    e.target.checked = !on;
    $('mailNotifyNote').textContent = err.message === 'DENIED'
      ? 'Máy chủ chưa cho lưu: chủ web cần dán lại firebase-rules.json (có mục "notify") rồi bấm Publish.'
      : 'Không lưu được, kiểm tra mạng rồi thử lại.';
  }
  e.target.disabled = !Profile.canEmail();
});

Profile.restore().then(ok => {
  if (ok) enterApp();
  else $('authUser').focus();
});

// ---------------- Bảng xếp hạng ----------------

let lbBy = 'exp';
let lbData = { exp: null, elo: null, medal: null, medals: {} };

async function openLeaderboard() {
  openModal('lbModal');
  lbData = { exp: null, elo: null, medal: null, medals: {} };
  $('lbSearch').value = '';
  await loadLeaderboard();
}

async function loadLeaderboard() {
  const by = lbBy;
  for (const b of document.querySelectorAll('#lbTabs button')) b.classList.toggle('on', b.dataset.by === by);
  $('lbNote').textContent = by === 'medal' ? 'Tổng huy chương Contest · xếp theo Vàng, rồi Bạc, rồi Đồng'
    : Profile.remote ? (by === 'elo' ? 'Toàn thế giới · 100 người Elo cao nhất · tính cả ván đấu máy' : 'Toàn thế giới · xếp theo exp rank (chỉ ván Online)')
    : 'Chỉ gồm tài khoản trên máy này · bảng toàn thế giới: xem README';
  $('lbList').innerHTML = '<p class="empty">Đang tải…</p>';
  $('lbPodium').innerHTML = '';
  $('lbMe').hidden = true;
  try {
    if (!lbData[by]) {
      if (by === 'medal') {
        const [table, photos] = await Promise.all([Contest.medalTable(), Profile.photos().catch(() => ({}))]);
        const me = Profile.uid();
        lbData.medal = table.map(r => ({ ...r, me: r.uid === me, photo: r.uid === me ? Profile.me().photo : (photos[r.uid] || '') }));
      } else {
        const [rows, medals] = await Promise.all([Profile.leaderboard(by), Contest.medals().catch(() => ({}))]);
        lbData[by] = rows;
        lbData.medals = medals;
      }
    }
    if (lbBy === by) renderLeaderboard();
  } catch {
    $('lbList').innerHTML = '<p class="empty">Không tải được bảng xếp hạng. Kiểm tra mạng và cấu hình Firebase.</p>';
  }
}

function lbValue(p) {
  if (lbBy === 'medal') return `${p.total} huy chương`;
  return lbBy === 'elo' ? `${p.elo} Elo` : `${p.exp} exp`;
}

function renderLeaderboard() {
  const by = lbBy;
  const all = lbData[by] || [];
  const q = $('lbSearch').value.trim().toLowerCase();
  const rows = all.map((p, i) => ({ ...p, pos: i + 1 })).filter(p => !q || p.name.toLowerCase().includes(q));
  const medal = by === 'medal';
  $('lbHeader').className = 'rank-row rank-header' + (medal ? ' medal-mode' : '');
  $('lbHeader').innerHTML = medal
    ? '<span>#</span><span>Người chơi</span><span>Vàng</span><span>Bạc</span><span>Đồng</span><span>Tổng</span>'
    : '<span>#</span><span>Người chơi</span><span>Rank</span><span>Exp</span><span>Elo</span><span>T / H / B</span>';

  // Bục top 3 (khi không tìm kiếm)
  const pod = $('lbPodium');
  pod.innerHTML = '';
  if (!q && all.length) {
    const top = all.slice(0, 3);
    const order = top.length === 1 ? [0] : top.length === 2 ? [1, 0] : [1, 0, 2];
    for (const i of order) {
      const p = top[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'podium-step ' + MEDAL_CLS[i + 1] + (p.me ? ' me' : '');
      b.innerHTML = '<span class="avatar"></span><b class="ps-name"></b><small></small><span class="ps-block"></span>';
      setAvatar(b.querySelector('.avatar'), { name: p.name, photo: p.photo, me: true }, 'w');
      b.querySelector('.ps-name').innerHTML = (p.title ? titleBadge(p.title) + ' ' : '') + escapeHtml(p.name);
      b.querySelector('small').textContent = lbValue(p);
      b.querySelector('.ps-block').appendChild(medalEl(i + 1));
      b.title = `Xem hồ sơ ${p.name}`;
      b.addEventListener('click', () => openProfile(p.uid));
      pod.appendChild(b);
    }
  }

  // Vị trí của mình (nếu có trên bảng)
  const mine = all.findIndex(p => p.me);
  const meBox = $('lbMe');
  meBox.hidden = mine < 0;
  if (mine >= 0) {
    const p = all[mine];
    meBox.innerHTML = `<span class="lb-me-pos">#${mine + 1}</span><span class="avatar sm"></span><span class="lb-me-main"><b>Vị trí của bạn</b><small>${lbValue(p)}${mine > 0 ? ` · cách #${mine} ${lbGap(all[mine - 1], p)}` : ' · dẫn đầu bảng!'}</small></span>`;
    setAvatar(meBox.querySelector('.avatar'), { name: p.name, photo: p.photo, me: true }, 'w');
    meBox.onclick = () => { const el = $('lbList').querySelector('.rank-row.me'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  }

  const list = $('lbList');
  list.innerHTML = '';
  for (const p of rows) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'rank-row clickable' + (p.me ? ' me' : '') + (medal ? ' medal-mode' : '');
    row.title = `Xem hồ sơ ${p.name}`;
    row.addEventListener('click', () => openProfile(p.uid));
    const no = p.pos <= 3 ? `<span class="podium p${p.pos}">${p.pos}</span>` : p.pos;
    if (medal) {
      row.innerHTML = `<span class="rank-no">${no}</span><span class="rank-name"><span class="avatar sm"></span><span class="nm"></span></span>
        <span class="mt-cell">${p.gold ? medalEl(1).outerHTML + p.gold : '<i>0</i>'}</span>
        <span class="mt-cell">${p.silver ? medalEl(2).outerHTML + p.silver : '<i>0</i>'}</span>
        <span class="mt-cell">${p.bronze ? medalEl(3).outerHTML + p.bronze : '<i>0</i>'}</span>
        <span class="rank-elo">${p.total}</span>`;
    } else {
      const r = Profile.rankOf(p.exp);
      row.innerHTML = `<span class="rank-no">${no}</span>
        <span class="rank-name"><span class="avatar sm"></span><span class="nm"></span></span>
        <span class="rank-tier">${rankMedalOnly(r)}<span style="color:${r.color}"><span class="rt-name">${r.name} </span>${r.text.slice(r.name.length + 1)}</span></span>
        <span class="rank-elo${by === 'exp' ? ' hot' : ''}">${p.exp}</span>
        <span class="rank-elo2${by === 'elo' ? ' hot' : ''}">${p.elo}</span>
        <span class="wdl"><i class="w">${p.wins}</i> / ${p.draws} / <i class="l">${p.losses}</i></span>`;
      const won = Contest.count(lbData.medals[p.uid]);
      if (won.some(Boolean)) {
        const ms = document.createElement('span');
        ms.className = 'medals';
        won.forEach((n, k) => { if (n) ms.appendChild(medalChip(k + 1, n)); });
        row.querySelector('.rank-name').appendChild(ms);
      }
    }
    row.querySelector('.nm').innerHTML = (p.title ? titleBadge(p.title) + ' ' : '') + escapeHtml(p.name) + (p.me ? ' <span class="muted">(bạn)</span>' : '');
    setAvatar(row.querySelector('.avatar'), { name: p.name, photo: p.photo, me: true }, 'w');
    list.appendChild(row);
  }
  if (!all.length) list.innerHTML = `<p class="empty">${medal ? 'Chưa có ai giành huy chương. Contest đầu tiên đang chờ bạn!' : 'Chưa có ai trên bảng. Chơi một ván Online để có tên ở đây!'}</p>`;
  else if (!rows.length) list.innerHTML = '<p class="empty">Không có người chơi nào khớp.</p>';
}

function lbGap(above, me) {
  if (lbBy === 'medal') return 'vài huy chương';
  return lbBy === 'elo' ? `${above.elo - me.elo} Elo` : `${above.exp - me.exp} exp`;
}

for (const b of document.querySelectorAll('#lbTabs button')) b.addEventListener('click', () => { lbBy = b.dataset.by; loadLeaderboard(); });
$('lbSearch').addEventListener('input', renderLeaderboard);

// ---------------- Bảng quản trị (chỉ tài khoản ADMIN) ----------------

let adminRows = [];

async function openAdmin() {
  if (!Profile.isOwner()) return;
  openModal('adminModal');
  muteFormFor = null;
  $('adminSearch').value = '';
  $('adminMsg').className = 'admin-msg';
  $('adminMsg').textContent = '';
  $('adminCount').textContent = '';
  $('adminNote').textContent = Profile.remote
    ? ''
    : 'Chế độ cục bộ: chỉ thấy tài khoản tạo trên trình duyệt này, người chơi ở máy khác sẽ không hiện ở đây (bật Firebase: xem README).';
  $('adminList').innerHTML = '<p class="empty">Đang tải…</p>';
  try {
    const { rows, adminsDenied } = await Profile.listPlayers();
    adminRows = rows;
    renderAdminList();
    if (adminsDenied) {
      $('adminMsg').className = 'admin-msg err';
      $('adminMsg').textContent = 'Chưa đọc được danh sách admin: hãy dán luật Firebase mới (có mục "admins") rồi bấm Publish. Tới lúc đó nút cấp / thu hồi chưa hoạt động.';
    }
  } catch (err) {
    const why = err.message === 'NETWORK' ? 'Kiểm tra mạng Internet.'
      : err.message === 'DENIED' ? 'Máy chủ từ chối đọc, kiểm tra luật Firebase.'
      : err.message === 'SERVER' ? 'Kiểm tra lại databaseURL trong config.js.'
      : 'Kiểm tra mạng và cấu hình Firebase (xem README).';
    $('adminList').innerHTML = '';
    const msg = document.createElement('p');
    msg.className = 'empty';
    msg.textContent = `Không tải được danh sách (mã lỗi: ${err.message}). ${why}`;
    $('adminList').appendChild(msg);
  }
}

let adminFilter = 'all';
let muteFormFor = null; // uid đang mở form mute

const MUTE_DURATIONS = [['3600000', '1 giờ'], ['86400000', '1 ngày'], ['604800000', '7 ngày'], ['0', 'Vĩnh viễn']];

function renderAdminStats() {
  const n = adminRows.length;
  const admins = adminRows.filter(p => p.owner || p.admin).length;
  const muted = adminRows.filter(p => p.muted).length;
  const games = Math.round(adminRows.reduce((a, p) => a + (p.games || 0), 0) / 2);
  const hasLast = adminRows.some(p => p.lastGame);
  const active = adminRows.filter(p => p.lastGame && Date.now() - p.lastGame < 7 * 86400000).length;
  $('adminStats').innerHTML = [
    ['Người chơi', n, 'i-users'], ['Hoạt động 7 ngày', hasLast ? active : '–', 'i-flame'], ['Ván Online', games, 'i-globe'],
    ['Admin', admins, 'i-shield'], ['Bị mute', muted, 'i-mute'],
  ].map(([k, v, ic]) => `<div class="as-tile"><svg class="ic"><use href="#${ic}"/></svg><b>${v}</b><span>${k}</span></div>`).join('');
  $('adminCount').textContent = `${n} người chơi · ${admins} admin · ${muted} bị mute chat`;
}

function renderAdminFilters() {
  const defs = [
    ['all', 'Tất cả', () => true], ['admin', 'Admin', p => p.owner || p.admin], ['muted', 'Bị mute', p => p.muted],
    ['titled', 'Có danh hiệu', p => !!p.title], ['new', 'Chưa chơi Online', p => !p.games],
  ];
  const box = $('adminFilters');
  box.innerHTML = defs.map(([k, t, f]) => `<button type="button" class="lib-filter${adminFilter === k ? ' on' : ''}" data-f="${k}">${t}<span>${adminRows.filter(f).length}</span></button>`).join('');
  box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { adminFilter = b.dataset.f; renderAdminList(); }));
  return Object.fromEntries(defs.map(d => [d[0], d[2]]));
}

function muteText(info) {
  if (!info) return '';
  const left = info.until ? Number(info.until) - Date.now() : 0;
  return 'Mute' + (info.until ? ` · còn ${fmtSpan(left)}` : ' · vĩnh viễn') + (info.by ? ` · bởi ${info.by}` : '') + (info.reason ? ` · ${info.reason}` : '');
}

function renderAdminList() {
  renderAdminStats();
  const filters = renderAdminFilters();
  const q = $('adminSearch').value.trim().toLowerCase();
  const sort = $('adminSort').value;
  const cmp = {
    role: (x, y) => (y.owner - x.owner) || (y.admin - x.admin) || (y.muted - x.muted) || x.name.localeCompare(y.name),
    name: (x, y) => x.name.localeCompare(y.name),
    elo: (x, y) => y.elo - x.elo, exp: (x, y) => y.exp - x.exp, games: (x, y) => y.games - x.games,
    active: (x, y) => (y.lastGame || 0) - (x.lastGame || 0),
  }[sort] || (() => 0);
  const rows = adminRows.filter(p => (!q || p.name.toLowerCase().includes(q)) && filters[adminFilter](p)).sort(cmp);
  const list = $('adminList');
  list.innerHTML = '';
  for (const p of rows) {
    const row = document.createElement('div');
    row.className = 'admin-row' + (p.me ? ' me' : '') + (p.muted ? ' muted-user' : '');
    const r = Profile.rankOf(p.exp);
    row.innerHTML = `<button type="button" class="admin-who" title="Xem hồ sơ"><span class="avatar"></span>
        <span class="admin-name"><b></b><small></small><small class="admin-mute-info"></small></span></button>
      <div class="admin-actions"></div>`;
    row.querySelector('b').innerHTML = (p.title ? titleBadge(p.title) + ' ' : '') + escapeHtml(p.name) + (p.me ? ' <span class="muted">(bạn)</span>' : '')
      + (p.owner ? ' <span class="role-badge">Chủ web</span>' : p.admin ? ' <span class="role-badge">Admin</span>' : '');
    row.querySelector('small').innerHTML = `<span style="color:${r.color}">${r.name}</span> · ${p.elo} Elo · ${p.games} ván${p.lastGame ? ` · ${timeAgo(p.lastGame)}` : ''}`;
    const mi = row.querySelector('.admin-mute-info');
    mi.textContent = p.muted ? muteText(p.muteInfo) : '';
    mi.hidden = !p.muted;
    setAvatar(row.querySelector('.avatar'), { name: p.name, photo: p.photo, me: true }, 'w');
    row.querySelector('.admin-who').addEventListener('click', () => openProfile(p.uid));
    const acts = row.querySelector('.admin-actions');

    const sel = document.createElement('select');
    sel.className = 'title-select';
    sel.title = 'Cấp danh hiệu (GM, IM, …)';
    sel.innerHTML = '<option value="">Danh hiệu</option>' + (Profile.TITLES || []).map(t => `<option value="${t}" ${p.title === t ? 'selected' : ''}>${t}</option>`).join('');
    sel.addEventListener('change', () => setPlayerTitle(p, sel));
    acts.appendChild(sel);

    if (!p.me && !p.owner) {
      const m = document.createElement('button');
      m.type = 'button';
      m.className = p.muted ? 'act-on' : 'act-danger';
      m.innerHTML = `<svg class="ic"><use href="#${p.muted ? 'i-volume' : 'i-mute'}"/></svg>${p.muted ? 'Bỏ mute' : 'Mute'}`;
      m.title = p.muted ? 'Cho phép chat lại' : 'Tắt chat vì nói tục / spam';
      m.addEventListener('click', () => {
        if (p.muted) toggleMute(p, m);
        else { muteFormFor = muteFormFor === p.uid ? null : p.uid; renderAdminList(); }
      });
      acts.appendChild(m);
    }
    if (!p.owner) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = p.admin ? 'act-plain' : 'act-on';
      b.innerHTML = `<svg class="ic"><use href="#i-shield"/></svg>${p.admin ? 'Thu hồi' : 'Cấp admin'}`;
      b.addEventListener('click', () => toggleAdmin(p, b));
      acts.appendChild(b);
    }
    list.appendChild(row);

    if (muteFormFor === p.uid && !p.muted) {
      const f = document.createElement('form');
      f.className = 'mute-form';
      f.innerHTML = `<input name="reason" maxlength="100" placeholder="Lý do (không bắt buộc)" value="Nói tục / spam trong chat">
        <select name="dur">${MUTE_DURATIONS.map(([v, t]) => `<option value="${v}"${v === '86400000' ? ' selected' : ''}>${t}</option>`).join('')}</select>
        <button type="submit" class="act-danger">Mute chat</button><button type="button" class="act-plain">Hủy</button>`;
      f.addEventListener('submit', e => { e.preventDefault(); toggleMute(p, f.querySelector('[type=submit]'), f.reason.value.trim(), Number(f.dur.value)); });
      f.querySelector('.act-plain').addEventListener('click', () => { muteFormFor = null; renderAdminList(); });
      list.appendChild(f);
      setTimeout(() => f.reason.focus(), 0);
    }
  }
  if (!rows.length) list.innerHTML = '<p class="empty">Không có người chơi nào khớp.</p>';
  else if (adminRows.length <= 1 && !q) list.insertAdjacentHTML('beforeend', '<p class="empty">Mới chỉ có tài khoản ADMIN. Người khác cần đăng ký và vào web ít nhất một lần thì mới hiện ở đây.</p>');
}

// Xuất danh sách người chơi ra CSV (mở bằng Excel / Google Sheets)
function exportPlayersCsv() {
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Tên', 'Danh hiệu', 'Vai trò', 'Rank', 'Exp', 'Elo', 'Ván Online', 'Thắng', 'Hòa', 'Thua', 'Bị mute', 'Hoạt động gần nhất'];
  const lines = [head.map(cell).join(',')];
  for (const p of adminRows) {
    lines.push([p.name, p.title, p.owner ? 'Chủ web' : p.admin ? 'Admin' : '', Profile.rankOf(p.exp).name, p.exp, p.elo, p.games, p.wins, p.draws, p.losses,
      p.muted ? 'Có' : '', p.lastGame ? new Date(p.lastGame).toLocaleString('vi-VN') : ''].map(cell).join(','));
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = `royal-gambit-nguoi-choi-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ----- Thông báo toàn web -----
let annKind = 'info';
async function renderAnnounceAdmin() {
  const box = $('annCurrent');
  box.innerHTML = '<p class="muted">Đang tải…</p>';
  const a = await Profile.getAnnounce();
  box.innerHTML = '';
  if (!a) { box.innerHTML = '<p class="muted">Hiện không có thông báo nào.</p>'; return; }
  const el = document.createElement('div');
  el.className = 'announce-bar preview ' + a.kind;
  el.innerHTML = '<svg class="ic"><use href="#i-megaphone"/></svg><span></span>';
  el.querySelector('span').textContent = a.text;
  box.appendChild(el);
  box.insertAdjacentHTML('beforeend', `<p class="muted">Đăng bởi ${escapeHtml(a.by)} · ${timeAgo(a.at)}${a.until ? ` · tự ẩn sau ${fmtSpan(a.until - Date.now())}` : ''}</p>`);
}

for (const b of document.querySelectorAll('#annKind button')) {
  b.addEventListener('click', () => { annKind = b.dataset.k; for (const x of document.querySelectorAll('#annKind button')) x.classList.toggle('on', x === b); });
}
$('annPost').addEventListener('click', async () => {
  const text = $('annText').value.trim();
  const msg = $('annMsg');
  if (text.length < 3) { setContestMsg(msg, 'Nội dung thông báo quá ngắn.', true); return; }
  const h = Number($('annDur').value);
  $('annPost').disabled = true;
  try {
    const mail = Profile.remote && $('annMail').checked;
    await Profile.setAnnounce({ text, kind: annKind, until: h ? Date.now() + h * 3600000 : 0, mail });
    setContestMsg(msg, mail ? 'Đã đăng thông báo. Email sẽ được gửi tới người đã bật thông báo Gmail trong vòng 5 phút.' : 'Đã đăng thông báo cho mọi người chơi.');
    $('annText').value = '';
    renderAnnounceAdmin();
    refreshAnnounce(true);
  } catch (err) {
    setContestMsg(msg, err.message === 'DENIED' ? 'Máy chủ từ chối: hãy dán luật Firebase mới (có mục "announce") rồi bấm Publish.' : AUTH_ERRORS[err.message] || 'Có lỗi xảy ra, thử lại sau.', true);
  }
  $('annPost').disabled = false;
});
$('annClear').addEventListener('click', async () => {
  if (!confirm('Gỡ thông báo đang hiện?')) return;
  try {
    await Profile.setAnnounce(null);
    setContestMsg($('annMsg'), 'Đã gỡ thông báo.');
    renderAnnounceAdmin();
    refreshAnnounce(true);
  } catch (err) {
    setContestMsg($('annMsg'), err.message === 'DENIED' ? 'Máy chủ từ chối: hãy dán luật Firebase mới (có mục "announce") rồi bấm Publish.' : 'Có lỗi xảy ra, thử lại sau.', true);
  }
});
for (const b of document.querySelectorAll('#adminTabs button')) {
  b.addEventListener('click', () => {
    for (const x of document.querySelectorAll('#adminTabs button')) x.classList.toggle('on', x === b);
    $('adminPlayers').hidden = b.dataset.tab !== 'players';
    $('adminAnnounce').hidden = b.dataset.tab !== 'announce';
    if (b.dataset.tab === 'announce') { $('annMailRow').hidden = !Profile.remote; renderAnnounceAdmin(); }
  });
}
$('adminSort').addEventListener('change', renderAdminList);
$('adminCsv').addEventListener('click', exportPlayersCsv);

// Thanh thông báo cho mọi người (đầu trang). Ẩn thì nhớ theo thời điểm đăng.
const ANN_HIDE_KEY = 'rg-announce-hidden';
let annShown = null;
async function refreshAnnounce(force) {
  const a = await Profile.getAnnounce().catch(() => null);
  const bar = $('announceBar');
  let hidden = 0;
  try { hidden = Number(localStorage.getItem(ANN_HIDE_KEY)) || 0; } catch {}
  if (!a || (hidden === a.at && !force)) { bar.hidden = true; annShown = null; return; }
  annShown = a;
  bar.className = 'announce-bar ' + a.kind;
  $('announceText').textContent = a.text;
  bar.hidden = false;
}
$('announceClose').addEventListener('click', () => {
  if (annShown) try { localStorage.setItem(ANN_HIDE_KEY, String(annShown.at)); } catch {}
  $('announceBar').hidden = true;
});
setInterval(() => refreshAnnounce(false), 5 * 60000);
refreshAnnounce(false);

async function setPlayerTitle(p, sel) {
  const title = sel.value || '';
  const msg = $('adminMsg');
  sel.disabled = true;
  msg.className = 'admin-msg';
  msg.textContent = '';
  try {
    await Profile.setTitle(p.uid, title);
    p.title = title;
    msg.textContent = title
      ? `Đã cấp danh hiệu ${title} cho ${p.name}.`
      : `Đã gỡ danh hiệu của ${p.name}.`;
    if (p.me) renderHeader();
    renderAdminList();
  } catch (err) {
    msg.className = 'admin-msg err';
    msg.textContent = err.message === 'DENIED' ? 'Chỉ chủ web (tài khoản admin) mới cấp được danh hiệu.'
      : err.message === 'NETWORK' ? AUTH_ERRORS.NETWORK
      : 'Có lỗi, thử lại. Hãy Publish luật Firebase mới (mục titles).';
    sel.value = p.title || '';
  }
  sel.disabled = false;
}

async function toggleMute(p, btn, reason = '', durationMs = 0) {
  const on = !p.muted;
  if (!on && !confirm(`Bỏ mute chat cho ${p.name}?`)) return;
  const msg = $('adminMsg');
  btn.disabled = true;
  msg.className = 'admin-msg';
  msg.textContent = '';
  try {
    await Profile.setMute(p.uid, on, reason || undefined, durationMs || undefined);
    p.muted = on;
    p.muteInfo = on ? { by: Profile.me().name, at: Date.now(), reason: reason || '', ...(durationMs ? { until: Date.now() + durationMs } : {}) } : null;
    muteFormFor = null;
    msg.textContent = on ? `Đã mute chat của ${p.name}. Họ không gửi được tin nhắn trong ván online.` : `Đã bỏ mute chat cho ${p.name}.`;
  } catch (err) {
    msg.className = 'admin-msg err';
    msg.textContent = err.message === 'DENIED' ? 'Chỉ admin / chủ web mới mute được. Hãy dán luật Firebase mới (có mục "mutes") rồi Publish.'
      : err.message === 'NETWORK' ? AUTH_ERRORS.NETWORK
      : 'Có lỗi xảy ra, thử lại sau.';
  }
  renderAdminList();
}

async function toggleAdmin(p, btn) {
  const on = !p.admin;
  if (!confirm(on ? `Cấp quyền admin cho ${p.name}?` : `Thu hồi quyền admin của ${p.name}?`)) return;
  const msg = $('adminMsg');
  btn.disabled = true;
  msg.className = 'admin-msg';
  msg.textContent = '';
  try {
    await Profile.setAdmin(p.uid, on);
    p.admin = on;
    msg.textContent = on ? `Đã cấp quyền admin cho ${p.name}.` : `Đã thu hồi quyền admin của ${p.name}.`;
  } catch (err) {
    msg.className = 'admin-msg err';
    msg.textContent = err.message === 'DENIED' ? 'Máy chủ từ chối: hãy dán luật Firebase mới (có mục "admins") và bấm Publish.'
      : err.message === 'NETWORK' ? AUTH_ERRORS.NETWORK
      : 'Có lỗi xảy ra, thử lại sau.';
  }
  renderAdminList();
}

// ---------------- Contest ----------------
// Chỉ admin tạo / xóa được contest (giao diện ẩn với người khác, luật Firebase chặn ở máy chủ).
// Người chơi đăng ký trước giờ bắt đầu; đến giờ web tự ghép cặp (xem "Contest: tự ghép cặp" bên dưới).

let contestView = null;        // contest đang xem chi tiết
let contestScores = null;      // bảng điểm của contest đang xem (null = chưa tải được)
let contestPhase = '';         // pha đang hiển thị, để biết khi nào cần vẽ lại
let contestTimer = null;

const CONTEST_ERRORS = {
  NAME: 'Tên contest cần 3–60 ký tự.',
  TIME: 'Thời gian không hợp lệ (contest dài tối đa 7 ngày).',
  PAST: 'Giờ bắt đầu phải ở tương lai để mọi người kịp đăng ký.',
  DENIED: 'Máy chủ từ chối: chỉ admin mới tạo / xóa được contest. Nếu bạn là admin, hãy dán lại firebase-rules.json mới rồi bấm Publish (xem README).',
  ENDED: 'Contest đã kết thúc.',
  CLOSED: 'Contest đã bắt đầu nên đã đóng đăng ký.',
  STARTED: 'Contest đã bắt đầu nên không đổi được giờ.',
  GONE: 'Contest này không còn tồn tại.',
  NETWORK: AUTH_ERRORS.NETWORK,
};
const contestError = err => CONTEST_ERRORS[err.message] || 'Có lỗi xảy ra, thử lại sau.';
const PHASE_TEXT = { live: 'Đang diễn ra', upcoming: 'Mở đăng ký', ended: 'Đã kết thúc' };

const p2 = n => String(n).padStart(2, '0');
function fmtDate(t) {
  const d = new Date(t);
  return `${p2(d.getHours())}:${p2(d.getMinutes())} ${p2(d.getDate())}/${p2(d.getMonth() + 1)}`;
}
function fmtDuration(ms) {
  const m = Math.round(ms / 60000);
  if (m % 1440 === 0) return `${m / 1440} ngày`;
  if (m >= 120 && m % 60 === 0) return `${m / 60} giờ`;
  return `${m} phút`;
}
function fmtSpan(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  if (d) return `${d} ngày ${h} giờ`;
  return h ? `${h}:${p2(m)}:${p2(s % 60)}` : `${p2(m)}:${p2(s % 60)}`;
}
function localInputValue(t) { // giá trị cho <input type="datetime-local"> theo giờ máy
  const d = new Date(t);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

function setContestMsg(el, text, err) {
  el.className = 'admin-msg' + (err ? ' err' : '');
  el.textContent = text || '';
}

async function openContests() {
  openModal('contestModal');
  showContestList();
  $('contestNote').textContent = Profile.remote
    ? 'Đăng ký trước · đến giờ web tự ghép cặp · Thắng +2 · Hòa +1 · Thua 0 · Top 3 nhận huy chương'
    : 'Chế độ cục bộ: contest chỉ có trên trình duyệt này (bật bản toàn thế giới: xem README)';
  $('contestAdminBox').hidden = !Profile.isAdmin();
  $('contestPlain').textContent = Profile.isAdmin() ? '' : 'Chỉ admin mới tạo được contest.';
  Profile.refreshAdmin().then(() => {
    $('contestAdminBox').hidden = !Profile.isAdmin();
    $('contestPlain').textContent = Profile.isAdmin() ? '' : 'Chỉ admin mới tạo được contest.';
  });
  startContestClock();
  await loadContests();
}

function showContestList() {
  contestView = null;
  $('contestListView').hidden = false;
  $('contestDetailView').hidden = true;
}

async function loadContests() {
  const box = $('contestList');
  box.innerHTML = '<p class="empty">Đang tải…</p>';
  try {
    const rows = await Contest.list();
    for (const c of rows) contestById.set(c.id, c);
    const [regs, champs, stats, mineAll] = await Promise.all([
      Promise.all(rows.map(c => Contest.phase(c) === 'ended' ? false : Contest.registered(c).catch(() => false))),
      Contest.winners().catch(() => ({})),
      Contest.stats().catch(() => ({})),
      Contest.history(Profile.uid()).catch(() => []),
    ]);
    const mine = new Set(rows.filter((c, i) => regs[i]).map(c => c.id));
    for (const h of mineAll) mine.add(h.id);
    contestListCache = { rows, mine, champs, stats };
    renderContestList(rows, mine, champs, stats);
  } catch (err) {
    box.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = `Không tải được danh sách contest (mã lỗi: ${err.message}). Kiểm tra mạng và luật Firebase (xem README).`;
    box.appendChild(p);
  }
}

let contestTab = 'all';
let contestListCache = null;

function contestCountdown(c, now = Date.now()) {
  const ph = Contest.phase(c, now);
  return ph === 'live' ? `Còn ${fmtSpan(c.end - now)}` : ph === 'upcoming' ? `Bắt đầu sau ${fmtSpan(c.start - now)}` : fmtDate(c.end);
}

function renderContestList(rows, mine, champs = {}, stats = {}) {
  const box = $('contestList');
  const tabs = [
    ['all', 'Tất cả', () => true], ['live', 'Đang diễn ra', c => Contest.phase(c) === 'live'], ['upcoming', 'Sắp diễn ra', c => Contest.phase(c) === 'upcoming'],
    ['ended', 'Đã kết thúc', c => Contest.phase(c) === 'ended'], ['mine', 'Của tôi', c => mine.has(c.id)],
  ];
  const tabBox = $('contestTabs');
  tabBox.innerHTML = tabs.map(([k, t, f]) => `<button type="button" class="lib-filter${contestTab === k ? ' on' : ''}" data-t="${k}">${t}<span>${rows.filter(f).length}</span></button>`).join('');
  tabBox.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { contestTab = b.dataset.t; renderContestList(rows, mine, champs, stats); }));
  const keep = tabs.find(t => t[0] === contestTab)[2];
  box.innerHTML = '';
  const groups = [
    ['live', rows.filter(c => Contest.phase(c) === 'live').sort((a, b) => a.end - b.end)],
    ['upcoming', rows.filter(c => Contest.phase(c) === 'upcoming').sort((a, b) => a.start - b.start)],
    ['ended', rows.filter(c => Contest.phase(c) === 'ended').sort((a, b) => b.end - a.end).slice(0, 30)],
  ];
  let shown = 0;
  for (const [ph, all] of groups) {
    const items = all.filter(keep);
    if (!items.length) continue;
    shown += items.length;
    const h = document.createElement('div');
    h.className = 'contest-group ' + ph;
    h.textContent = ph === 'upcoming' ? 'Sắp diễn ra' : PHASE_TEXT[ph];
    box.appendChild(h);
    for (const c of items) {
      const st = stats[c.id] || { players: 0, games: 0 };
      const champ = (champs[c.id] || []).find(r => r.place === 1);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'contest-item ' + ph + (mine.has(c.id) ? ' joined' : '');
      btn.innerHTML = `<span class="ci-icon"><svg class="ic"><use href="#${ph === 'live' ? 'i-bolt' : ph === 'upcoming' ? 'i-calendar' : 'i-trophy'}"/></svg></span>
        <span class="ci-main"><b></b><small></small><span class="ci-extra"></span></span>
        <span class="ci-side"><span class="ci-count" data-id="${c.id}"></span><span class="ci-people"><svg class="ic"><use href="#i-users"/></svg>${st.players}</span></span>
        ${ph === 'live' ? `<span class="ci-prog"><i style="width:${Math.min(100, 100 * (Date.now() - c.start) / (c.end - c.start))}%"></i></span>` : ''}`;
      btn.querySelector('b').textContent = c.name;
      btn.querySelector('small').textContent = `${fmtDate(c.start)} · ${fmtDuration(c.end - c.start)}` + (c.byName ? ` · tạo bởi ${c.byName}` : '');
      const extra = btn.querySelector('.ci-extra');
      if (champ) { extra.appendChild(medalEl(1)); extra.append(`Vô địch: ${champ.name} · ${champ.pts} điểm`); }
      else if (mine.has(c.id)) extra.textContent = ph === 'ended' ? 'Bạn đã tham gia' : 'Bạn đã đăng ký ✓';
      else if (ph !== 'ended' && st.games) extra.textContent = `${st.games} ván đã đấu`;
      btn.querySelector('.ci-count').textContent = contestCountdown(c);
      btn.addEventListener('click', () => openContestDetail(c.id));
      if (Profile.isAdmin()) {
        const del = document.createElement('span');
        del.className = 'ci-del';
        del.setAttribute('role', 'button');
        del.tabIndex = 0;
        del.title = 'Xoá contest';
        del.innerHTML = '<svg class="ic"><use href="#i-trash"/></svg>';
        const go = e => { e.stopPropagation(); e.preventDefault(); contestDelete(null, c); };
        del.addEventListener('click', go);
        del.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') go(e); });
        btn.querySelector('.ci-side').appendChild(del);
      }
      box.appendChild(btn);
    }
  }
  if (!rows.length) box.innerHTML = '<p class="empty">Chưa có contest nào.' + (Profile.isAdmin() ? ' Hãy bấm "Tạo contest" ở trên.' : '') + '</p>';
  else if (!shown) box.innerHTML = '<p class="empty">Không có contest nào ở mục này.</p>';
}

// Link chia sẻ thẳng tới một contest
const contestLink = c => location.href.split(/[?#]/)[0] + '#contest/' + c.id;

// File lịch (.ics) để thêm contest vào Google Calendar / Lịch điện thoại
function downloadIcs(c) {
  const t = ms => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = x => String(x || '').replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Royal Gambit//Contest//VI', 'BEGIN:VEVENT',
    `UID:${c.id}@royal-gambit`, `DTSTAMP:${t(Date.now())}`, `DTSTART:${t(c.start)}`, `DTEND:${t(c.end)}`,
    `SUMMARY:${esc('Royal Gambit · ' + c.name)}`, `DESCRIPTION:${esc((c.desc ? c.desc + '\n' : '') + 'Mở web trước giờ bắt đầu để được ghép cặp: ' + contestLink(c))}`,
    `URL:${contestLink(c)}`, 'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', `DESCRIPTION:${esc(c.name)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `contest-${c.id}.ics`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// Mở contest từ link #contest/<id>
function routeContest() {
  const m = /^#contest\/([a-z0-9]+)$/.exec(location.hash);
  if (!m || !entered) return;
  history.replaceState(null, '', location.pathname + location.search);
  openContestById(m[1]);
}
window.addEventListener('hashchange', routeContest);

// ----- Chi tiết một contest -----

async function openContestDetail(id) {
  const c = contestById.get(id);
  if (!c) return;
  contestView = c;
  contestScores = null;
  $('contestListView').hidden = true;
  $('contestDetailView').hidden = false;
  setContestMsg($('contestMsg'), '');
  $('cdName').textContent = c.name;
  $('cdDesc').textContent = c.desc;
  $('cdTime').textContent = `${fmtDate(c.start)} → ${fmtDate(c.end)} · ${fmtDuration(c.end - c.start)}`;
  $('cdEdit').hidden = !Profile.isAdmin();
  $('cdDelete').hidden = !Profile.isAdmin();
  $('cdCal').hidden = Contest.phase(c) === 'ended';
  $('cdStats').innerHTML = '';
  $('cdMine').hidden = true;
  contestPhase = '';
  updateContestClock();
  $('contestBoard').innerHTML = '<p class="empty">Đang tải…</p>';
  await loadContestScores();
}

async function loadContestScores() {
  const c = contestView;
  if (!c) return;
  let rows = null;
  try {
    const [list, photos] = await Promise.all([Contest.scores(c.id), Profile.photos().catch(() => ({}))]);
    rows = list.map(p => ({ ...p, photo: p.me && Profile.me().photo ? Profile.me().photo : (photos[p.uid] || '') }));
  } catch {}
  if (contestView !== c) return; // người dùng đã chuyển sang màn khác
  contestScores = rows;
  renderContestBoard();
  renderContestActions();
}

function renderContestStats() {
  const c = contestView, rows = contestScores || [];
  const games = Math.round(rows.reduce((a, r) => a + r.games, 0) / 2);
  const leader = rows[0] && rows[0].games ? rows[0] : null;
  $('cdStats').innerHTML = [
    ['i-users', rows.length, 'người tham gia'], ['i-swords', games, 'ván đã đấu'],
    ['i-clock', fmtDuration(c.end - c.start), 'thời lượng'], ['i-crown', leader ? escapeHtml(leader.name) : '–', Contest.isFinal(c) ? 'vô địch' : 'đang dẫn đầu'],
  ].map(([ic, v, k]) => `<div class="cd-stat"><svg class="ic"><use href="#${ic}"/></svg><b>${v}</b><span>${k}</span></div>`).join('');
  const me = rows.find(r => r.me);
  const box = $('cdMine');
  box.hidden = !me || Contest.phase(c) === 'upcoming';
  if (me && !box.hidden) {
    box.innerHTML = `<span class="cd-mine-place">${me.medal ? '' : '#' + me.place}</span>
      <span class="cd-mine-main"><b>Thành tích của bạn</b><small>Hạng ${me.place}/${rows.length} · ${me.games} ván</small></span>
      <span class="cd-mine-pts"><b>${me.pts}</b><small>điểm</small></span>
      <span class="wdl"><i class="w">${me.wins}</i> / ${me.draws} / <i class="l">${me.losses}</i></span>`;
    if (me.medal) box.querySelector('.cd-mine-place').appendChild(medalEl(me.medal));
  }
}

function renderContestBoard() {
  const box = $('contestBoard');
  box.innerHTML = '';
  if (contestScores === null) { box.innerHTML = '<p class="empty">Không tải được bảng điểm. Kiểm tra mạng và luật Firebase.</p>'; return; }
  if (!contestScores.length) {
    box.innerHTML = `<p class="empty">${Contest.phase(contestView) === 'upcoming' ? 'Chưa có ai đăng ký. Hãy là người đầu tiên!' : 'Không có ai đăng ký contest này.'}</p>`;
    return;
  }
  const final = Contest.isFinal(contestView);
  renderContestPodium(final);
  renderContestStats();
  for (const p of contestScores) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'contest-row clickable' + (p.me ? ' me' : '');
    row.title = `Xem hồ sơ ${p.name}`;
    row.addEventListener('click', () => openProfile(p.uid));
    row.innerHTML = `<span class="rank-no"></span>
      <span class="rank-name"><span class="avatar sm"></span><span class="nm"></span></span>
      <span class="pts">${p.pts}</span>
      <span>${p.games}</span>
      <span class="wdl"><i class="w">${p.wins}</i> / ${p.draws} / <i class="l">${p.losses}</i></span>`;
    const no = row.querySelector('.rank-no');
    if (p.medal) no.appendChild(medalEl(p.medal)); else no.textContent = p.place;
    row.querySelector('.nm').innerHTML = (p.title ? titleBadge(p.title) + ' ' : '') + escapeHtml(p.name) + (p.me ? ' <span class="muted">(bạn)</span>' : '');
    setAvatar(row.querySelector('.avatar'), { name: p.name, photo: p.photo, me: !!p.me }, 'w');
    box.appendChild(row);
  }
  if (final) {
    const me = contestScores.find(r => r.me);
    if (me) {
      const note = document.createElement('p');
      note.className = 'empty';
      note.textContent = me.medal ? `Chúc mừng! Bạn giành huy chương ${MEDAL_NAME[me.medal]} (hạng ${me.place}) – huy chương đã được thêm vào trang Hồ sơ.`
        : `Bạn xếp hạng ${me.place}/${contestScores.length}.`;
      box.prepend(note);
    }
  }
}

// Bục trao giải cho contest đã chốt kết quả: hạng 2 · hạng 1 · hạng 3
function renderContestPodium(final) {
  const stage = $('contestPodium');
  const top = final && contestScores ? contestScores.filter(r => r.medal).slice(0, 3) : [];
  stage.hidden = !top.length;
  stage.innerHTML = '';
  if (!top.length) return; // chưa có ai đạt huy chương (contest chưa kết thúc / chưa ai đánh ván nào)
  const order = top.length === 1 ? [0] : top.length === 2 ? [1, 0] : [1, 0, 2];
  for (const i of order) {
    const r = top[i];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'podium-step ' + MEDAL_CLS[r.medal] + (r.me ? ' me' : '');
    b.title = `Xem hồ sơ ${r.name}`;
    b.innerHTML = '<span class="avatar"></span><b class="ps-name"></b><small></small><span class="ps-block"></span>';
    setAvatar(b.querySelector('.avatar'), { name: r.name, photo: r.photo, me: true }, 'w');
    b.querySelector('.ps-name').textContent = r.name;
    b.querySelector('small').textContent = `${r.pts} điểm · ${r.wins} thắng`;
    b.querySelector('.ps-block').appendChild(medalEl(r.medal));
    b.addEventListener('click', () => openProfile(r.uid));
    stage.appendChild(b);
  }
}

function renderContestActions() {
  const c = contestView;
  const box = $('contestActions');
  box.innerHTML = '';
  if (!c) return;
  const ph = Contest.phase(c);
  const joined = !!(contestScores && contestScores.some(r => r.me));
  const add = (text, cls, fn, disabled) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = text;
    b.disabled = !!disabled;
    b.addEventListener('click', () => fn(b));
    box.appendChild(b);
    return b;
  };
  const note = text => box.insertAdjacentHTML('beforeend', `<p class="muted center">${text}</p>`);
  if (Profile.isGuest()) { // khách: xem được contest nhưng không tham gia
    if (ph !== 'ended') add('Đăng nhập để tham gia contest', 'primary big', leaveGuest);
    note('Chế độ khách không tham gia contest được.');
    return;
  }
  if (ph === 'upcoming') {
    if (joined) {
      add('Đã đăng ký ✓', 'big', () => {}, true);
      add('Hủy đăng ký', 'ghost', contestUnregister);
      note('Đến giờ bắt đầu, web sẽ tự ghép cặp bạn với những người đã đăng ký. Chỉ cần mở web lúc đó.');
    } else {
      add('Đăng ký tham gia', 'primary big', contestRegister);
      note('Đăng ký đóng khi contest bắt đầu.');
    }
  } else if (ph === 'live') {
    if (joined) {
      const busy = Auto.running === c.id && !Auto.paused.has(c.id) && mode === 'online' && !Online.idle();
      if (busy) add(Online.searching() ? 'Đang tự ghép cặp…' : 'Đang thi đấu', 'big', () => {}, true);
      else add(Auto.paused.has(c.id) ? 'Tiếp tục thi đấu' : 'Vào thi đấu ngay', 'primary big', contestPlay);
      note('Web tự ghép cặp bạn với người đã đăng ký đang mở web; xong ván sẽ tự tìm ván tiếp.');
    } else {
      add('Đăng ký đã đóng', 'big', () => {}, true);
      note('Contest đã bắt đầu, chỉ người đăng ký trước mới được thi đấu.');
    }
  }
}

// Đồng hồ: đếm ngược tới giờ bắt đầu / kết thúc, tự làm mới bảng điểm, tự đổi nút khi đổi pha
function updateContestClock() {
  const c = contestView;
  if (!c) return;
  const ph = Contest.phase(c), now = Date.now();
  $('cdClock').textContent = ph === 'live' ? `Còn ${fmtSpan(c.end - now)}`
    : ph === 'upcoming' ? `Bắt đầu sau ${fmtSpan(c.start - now)}`
    : Contest.isFinal(c) ? 'Đã kết thúc · kết quả chung cuộc' : 'Đã kết thúc · đang chờ các ván cuối';
  $('cdProg').style.width = (ph === 'upcoming' ? 0 : ph === 'live' ? Math.min(100, 100 * (now - c.start) / (c.end - c.start)) : 100) + '%';
  $('cdHero').className = 'cd-hero ' + ph;
  $('cdPhase').textContent = ph === 'upcoming' ? 'Mở đăng ký' : PHASE_TEXT[ph];
  const key = ph + Contest.isFinal(c);
  if (key !== contestPhase) {
    contestPhase = key;
    renderContestActions();
    if (contestScores) renderContestBoard();
  }
}

function startContestClock() {
  clearInterval(contestTimer);
  let n = 0;
  contestTimer = setInterval(() => {
    if ($('contestModal').hidden) { clearInterval(contestTimer); return; }
    if (!contestView) {
      for (const el of document.querySelectorAll('#contestList .ci-count')) { const c = contestById.get(el.dataset.id); if (c) el.textContent = contestCountdown(c); }
      return;
    }
    updateContestClock();
    if (++n % 15 === 0 && Contest.phase(contestView) !== 'upcoming') loadContestScores();
  }, 1000);
}

async function contestRegister(btn) {
  if (Profile.isGuest()) return guestBlocked('tham gia contest');
  const c = contestView;
  btn.disabled = true;
  setContestMsg($('contestMsg'), '');
  try {
    await Contest.join(c);
    setContestMsg($('contestMsg'), `Đã đăng ký! Contest bắt đầu lúc ${fmtDate(c.start)}, web sẽ tự ghép cặp cho bạn.`
      + (Profile.prefs().notify ? '' : ' Muốn được nhắc giờ? Bật "Thông báo" trong Hồ sơ › Cài đặt.'));
    if (!Auto.mine.some(x => x.id === c.id)) Auto.mine.push(c);
    await loadContestScores();
  } catch (err) {
    setContestMsg($('contestMsg'), contestError(err), true);
    btn.disabled = false;
  }
}

async function contestUnregister(btn) {
  const c = contestView;
  if (!confirm(`Hủy đăng ký contest "${c.name}"?`)) return;
  btn.disabled = true;
  try {
    await Contest.unjoin(c);
    Auto.mine = Auto.mine.filter(x => x.id !== c.id);
    setContestMsg($('contestMsg'), 'Đã hủy đăng ký.');
    await loadContestScores();
  } catch (err) {
    setContestMsg($('contestMsg'), contestError(err), true);
    btn.disabled = false;
  }
}

// Vào thi đấu ngay (hoặc tiếp tục sau khi đã tạm dừng tự ghép)
function contestPlay() {
  const c = contestView;
  if (mode === 'online' && !Online.idle() && Online.contest() !== c.id) {
    setContestMsg($('contestMsg'), 'Bạn đang trong phòng hoặc ván Online khác. Hãy rời phòng trước.', true);
    return;
  }
  if (!Auto.mine.some(x => x.id === c.id)) Auto.mine.push(c);
  Auto.paused.delete(c.id);
  Auto.retryAt = 0;
  $('contestModal').hidden = true;
  autoStart(c, true);
}

// Xoá contest (chỉ admin): từ trang chi tiết hoặc nút thùng rác trong danh sách
async function contestDelete(btn, c = contestView) {
  if (!c) return;
  const ph = Contest.phase(c);
  const warn = ph === 'live' ? '\n\nContest đang diễn ra: các ván đang đấu sẽ không được tính nữa.' : ph === 'ended' ? '\n\nHuy chương của contest này cũng sẽ bị xoá khỏi hồ sơ người chơi.' : '';
  if (!confirm(`Xoá contest "${c.name}" cùng toàn bộ bảng điểm? Không thể hoàn tác.${warn}`)) return;
  if (btn) btn.disabled = true;
  try {
    await Contest.remove(c.id);
    contestById.delete(c.id);
    Auto.mine = Auto.mine.filter(x => x.id !== c.id);
    showContestList();
    setContestMsg($('contestAdminMsg'), `Đã xoá contest "${c.name}".`);
    toast(`Đã xoá contest "${c.name}"`);
    if (location.hash === '#contest/' + c.id) history.replaceState(null, '', location.pathname + location.search);
    await loadContests();
  } catch (err) {
    const box = !$('contestDetailView').hidden ? $('contestMsg') : $('contestAdminMsg');
    setContestMsg(box, contestError(err), true);
    if (btn) btn.disabled = false;
  }
}

// ----- Tạo contest (chỉ admin) -----

$('cdDelete').addEventListener('click', e => contestDelete(e.currentTarget));
$('cdShare').addEventListener('click', () => contestView && copyText(contestLink(contestView), 'Đã sao chép link contest'));
$('cdCal').addEventListener('click', () => contestView && downloadIcs(contestView));
$('cdEdit').addEventListener('click', () => {
  const c = contestView;
  if (!c || !Profile.isAdmin()) return;
  showContestList();
  const f = $('contestForm');
  f.dataset.edit = c.id;
  $('cFormTitle').textContent = 'Sửa contest';
  $('cSubmit').textContent = 'Lưu thay đổi';
  $('cName').value = c.name;
  $('cDesc').value = c.desc || '';
  $('cStart').value = localInputValue(c.start);
  const dur = Math.round((c.end - c.start) / 60000);
  if (![...$('cDur').options].some(o => Number(o.value) === dur)) $('cDur').insertAdjacentHTML('beforeend', `<option value="${dur}">${fmtDuration(dur * 60000)}</option>`);
  $('cDur').value = String(dur);
  const started = Date.now() >= c.start;
  $('cStart').disabled = $('cDur').disabled = started;
  setContestMsg($('contestAdminMsg'), started ? 'Contest đã bắt đầu: chỉ sửa được tên và mô tả.' : '');
  f.hidden = false;
  $('cName').focus();
  loadContests();
});

$('contestNewBtn').addEventListener('click', () => {
  if (!Profile.isAdmin()) return;
  const f = $('contestForm');
  delete f.dataset.edit;
  $('cFormTitle').textContent = 'Tạo contest mới';
  $('cSubmit').textContent = 'Tạo contest';
  $('cStart').disabled = $('cDur').disabled = false;
  const t = new Date(Date.now() + 3600000);
  t.setMinutes(0, 0, 0); // mặc định: đầu giờ kế tiếp, cho mọi người thời gian đăng ký
  $('cStart').value = localInputValue(t.getTime() + 3600000);
  setContestMsg($('contestAdminMsg'), '');
  $('contestForm').hidden = false;
  $('cName').focus();
});
$('cCancel').addEventListener('click', () => { $('contestForm').hidden = true; delete $('contestForm').dataset.edit; });
$('contestForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('contestAdminMsg');
  if (!Profile.isAdmin()) { setContestMsg(msg, CONTEST_ERRORS.DENIED, true); return; }
  const start = new Date($('cStart').value).getTime();
  const end = start + Number($('cDur').value) * 60000;
  $('cSubmit').disabled = true;
  const editId = $('contestForm').dataset.edit;
  try {
    if (editId) {
      const timeLocked = $('cStart').disabled;
      const row = await Contest.update(editId, { name: $('cName').value, desc: $('cDesc').value, ...(timeLocked ? {} : { start, end }) });
      contestById.set(editId, { ...contestById.get(editId), ...row, id: editId });
      delete $('contestForm').dataset.edit;
    } else {
      await Contest.create({ name: $('cName').value, desc: $('cDesc').value, start, end });
    }
    $('contestForm').hidden = true;
    $('contestForm').reset();
    setContestMsg(msg, editId ? 'Đã lưu thay đổi.' : 'Đã tạo contest! Người chơi có thể đăng ký tới giờ bắt đầu.');
    await loadContests();
  } catch (err) {
    setContestMsg(msg, contestError(err), true);
  }
  $('cSubmit').disabled = false;
});

$('contestBack').addEventListener('click', () => { showContestList(); loadContests(); });
$('contestRefresh').addEventListener('click', () => { if (contestView) loadContestScores(); else loadContests(); });

// ---------------- Contest: tự ghép cặp ----------------
// Không có máy chủ riêng nên việc ghép chạy trên trình duyệt của từng người đã đăng ký:
// đến giờ contest, web tự chuyển sang Online và vào phòng chờ riêng của contest đó (xem online.js),
// ván xong thì sau AUTO_NEXT tự tìm ván tiếp. Không cắt ngang ván đang chơi với máy / bài học đang dở:
// đợi xong mới ghép. Hủy tìm trận, rời phòng hoặc rời tab Online thì tạm dừng tự ghép (bấm Tiếp tục để chơi lại).

const MEDAL_SEEN_KEY = 'rg-medal-seen';

async function refreshAuto() {
  if (!Profile.signedIn()) return;
  try {
    const rows = await Contest.list();
    for (const c of rows) contestById.set(c.id, c);
    const open = rows.filter(c => Contest.phase(c) !== 'ended');
    const regs = await Promise.all(open.map(c => Contest.registered(c, true).catch(() => Auto.mine.some(x => x.id === c.id))));
    Auto.mine = open.filter((c, i) => regs[i]);
    if (rows.some(c => Contest.isFinal(c) && Date.now() - c.end < 3 * 86400000)) checkNewMedals();
  } catch {}
  autoTick();
}

// Báo khi vừa giành huy chương (mỗi huy chương báo một lần)
async function checkNewMedals() {
  let list;
  try { list = (await Contest.medals())[Profile.uid()] || []; } catch { return; }
  const key = MEDAL_SEEN_KEY + ':' + Profile.uid();
  let seen;
  try { seen = new Set(JSON.parse(localStorage.getItem(key)) || []); } catch { seen = new Set(); }
  const fresh = list.filter(m => !seen.has(m.id) && Date.now() - m.end < 3 * 86400000);
  for (const m of list) seen.add(m.id);
  try { localStorage.setItem(key, JSON.stringify([...seen])); } catch {}
  if (fresh.length) {
    const m = fresh[0];
    toast(`Chúc mừng! Bạn giành huy chương ${MEDAL_NAME[m.place]} ở contest "${m.name}"`, m.place);
    celebrate();
  }
}

function toast(text, medal) {
  const el = $('toast');
  el.innerHTML = '';
  if (medal) el.appendChild(medalEl(medal));
  el.appendChild(document.createTextNode(text));
  el.hidden = false;
  clearTimeout(toast.t);
  // Câu ngắn ("Đã bật âm") ẩn nhanh, câu dài / báo huy chương giữ lâu hơn để kịp đọc
  toast.t = setTimeout(() => { el.hidden = true; }, medal ? 7000 : Math.min(7000, 2200 + String(text).length * 45));
}

// Đang làm dở việc khác (ván với máy, ván 2 người, bài học) thì chưa tự chuyển sang contest
function autoCanStart() {
  if (!$('promo').hidden || !$('placeModal').hidden || !$('authModal').hidden) return false;
  if (mode === 'online') return Online.idle();
  if (mode === 'learn') return !Learn.inLesson();
  if (typeof Puzzles !== 'undefined' && Puzzles.isActive()) return false; // đang giải câu đố: đợi giải xong
  return !game.history.length || game.isGameOver() || !!playResult;
}

function autoStart(c, manual = false) {
  Auto.running = c.id;
  Auto.doneAt = 0;
  if (mode === 'online' && !Online.idle()) {
    quietResult = true;
    Online.leave(); // chỉ gọi khi ván trước đã xong nên không bị tính thua
    quietResult = false;
  }
  if (mode !== 'online') {
    setMode('online');
    if (mode !== 'online') { if (!manual) Auto.paused.add(c.id); return; } // người chơi không muốn bỏ ván đang dở
    Auto.paused.delete(c.id);
  }
  $('resultModal').hidden = true;
  Online.findMatch({ id: c.id, end: c.end });
  autoBanner();
}

// Bấm "Ván contest tiếp theo" trong hộp kết quả
function autoNow() {
  const c = contestById.get(Online.contest());
  if (c && Contest.phase(c) === 'live') { Auto.paused.delete(c.id); autoStart(c, true); }
}

function liveAuto(now = Date.now()) {
  const live = Auto.mine.filter(c => Contest.phase(c, now) === 'live').sort((a, b) => a.end - b.end);
  return live.find(c => !Auto.paused.has(c.id)) || live[0] || null;
}

// Thông báo trình duyệt: 5 phút trước giờ và lúc contest đã đăng ký bắt đầu (khi đang ở tab khác)
const notified = new Set();
function contestNotify() {
  if (!Profile.prefs().notify || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const now = Date.now();
  for (const c of Auto.mine) {
    const ph = Contest.phase(c, now);
    const key = ph === 'live' ? c.id + ':live' : c.start - now < 5 * 60000 && ph === 'upcoming' ? c.id + ':soon' : null;
    if (!key || notified.has(key)) continue;
    notified.add(key);
    if (!document.hidden) continue; // đang xem web: thanh thông báo contest đã đủ
    try {
      const n = new Notification(ph === 'live' ? `${c.name} đã bắt đầu!` : `${c.name} bắt đầu sau ${Math.max(1, Math.ceil((c.start - now) / 60000))} phút`, {
        body: ph === 'live' ? 'Quay lại Royal Gambit để được ghép cặp thi đấu.' : 'Bạn đã đăng ký contest này. Hãy mở sẵn web để được ghép cặp.',
        icon: 'img/apple-touch-icon.png', tag: key,
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {}
  }
}

// Pháo giấy khi thắng / giành huy chương / giải câu đố hoàn hảo
function celebrate() {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  const W = cv.width = innerWidth, H = cv.height = innerHeight;
  document.body.appendChild(cv);
  const g = cv.getContext('2d');
  const colors = ['#f5c03d', '#81b64c', '#ece9e1', '#e2533f', '#5aa9ff'];
  const parts = Array.from({ length: 140 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 4,
    w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  (function frame(t) {
    const k = (t - t0) / 1000;
    g.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r);
      g.globalAlpha = Math.max(0, 1 - k / 2.4);
      g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
      g.restore();
    }
    if (k < 2.4) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

function autoTick() {
  autoBanner();
  contestNotify();
  if (!entered) return;
  const now = Date.now();
  const c = liveAuto(now);
  if (!c || Auto.paused.has(c.id)) return;
  if (mode === 'online' && Online.contest() === c.id) {
    // Ván contest đã xong (hoặc đối thủ bỏ đi): đợi một chút rồi tự tìm ván tiếp
    if (!Online.outcome() && Online.connected()) return;
    if (!Auto.doneAt) Auto.doneAt = now;
    if (now - Auto.doneAt >= AUTO_NEXT) autoStart(c);
    return;
  }
  if (mode === 'online' && Online.searchContest() === c.id) return;
  if (now < Auto.retryAt || !autoCanStart()) return;
  autoStart(c);
}

Online.onFail((code, ct) => {
  if (!ct) return;
  if (code === 'self') Auto.paused.add(ct);
  else if (code !== 'ended') Auto.retryAt = Date.now() + 15000; // lỗi mạng: thử lại sau 15 giây
});
// Người chơi tự hủy tìm / rời phòng: tạm dừng tự ghép contest đó
for (const id of ['cancelSearch', 'leaveRoom']) {
  $(id).addEventListener('click', () => { if (Auto.running && Online.idle()) Auto.paused.add(Auto.running); autoBanner(); });
}

// Thanh thông báo contest dưới thanh trên cùng
function autoBanner() {
  const el = $('contestBanner');
  const now = Date.now();
  const c = liveAuto(now);
  const soon = Auto.mine.filter(x => Contest.phase(x, now) === 'upcoming' && x.start - now < 86400000).sort((a, b) => a.start - b.start)[0];
  if (!entered || (!c && !soon)) { el.hidden = true; return; }
  el.hidden = false;
  let text, action = null, cls = 'live';
  if (c) {
    const left = `còn ${fmtSpan(c.end - now)}`;
    if (Auto.paused.has(c.id)) {
      text = `${c.name} đang diễn ra (${left}) · bạn đã tạm dừng tự ghép cặp`;
      action = ['Tiếp tục thi đấu', 'resume'];
      cls = 'paused';
    } else if (mode === 'online' && Online.contest() === c.id && (Online.outcome() || !Online.connected())) {
      text = `${c.name} · ván tiếp theo sau ${Math.max(0, Math.ceil((AUTO_NEXT - (now - (Auto.doneAt || now))) / 1000))} giây`;
      action = ['Tạm dừng', 'pause'];
    } else if (mode === 'online' && Online.contest() === c.id) {
      text = `${c.name} · đang thi đấu (${left})`;
    } else if (mode === 'online' && Online.searchContest() === c.id) {
      text = `${c.name} · đang tự ghép cặp với người đã đăng ký… (${left})`;
      action = ['Tạm dừng', 'pause'];
    } else {
      text = `${c.name} đang diễn ra (${left}) · web sẽ tự ghép cặp khi bạn xong việc đang làm`;
      action = ['Vào thi đấu ngay', 'resume'];
    }
  } else {
    text = `${soon.name} bắt đầu sau ${fmtSpan(soon.start - now)} · bạn đã đăng ký, đến giờ web sẽ tự ghép cặp`;
    cls = 'soon';
  }
  el.className = 'contest-banner ' + cls;
  $('cbText').textContent = text;
  const btn = $('cbAction');
  btn.hidden = !action;
  if (action) { btn.textContent = action[0]; btn.dataset.act = action[1]; }
  el.dataset.id = (c || soon).id;
}

$('cbAction').addEventListener('click', () => {
  const c = contestById.get($('contestBanner').dataset.id);
  if (!c) return;
  if ($('cbAction').dataset.act === 'pause') {
    Auto.paused.add(c.id);
    if (mode === 'online' && Online.searchContest() === c.id) Online.leave();
  } else {
    Auto.paused.delete(c.id);
    Auto.retryAt = 0;
    if (mode === 'online' && !Online.idle() && Online.contest() !== c.id) {
      toast('Bạn đang trong phòng Online khác, hãy rời phòng trước.');
    } else autoStart(c, true);
  }
  autoBanner();
});
$('cbOpen').addEventListener('click', () => openContestById($('contestBanner').dataset.id));

setInterval(autoTick, 1000);
setInterval(refreshAuto, 60000);
