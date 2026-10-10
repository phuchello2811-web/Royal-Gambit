// Giao diện: vẽ bàn cờ, kéo thả quân, hiệu ứng, tính Elo, bảng xếp hạng.

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
];

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
let unrated = false;    // đã dùng Đi lại / Gợi ý nên không tính Elo
let quietResult = false;
let seenMove = null, seenLen = 0; // để nhận ra nước mới cần hiệu ứng
let skipAnim = false;   // nước vừa đi bằng kéo thả thì không cần trượt
let drag = null;

const pieceSrc = p => `pieces/${p}.svg`;
const disp = i => flipped ? 63 - i : i; // vị trí hiển thị của ô i
const rowCol = i => [disp(i) >> 3, disp(i) & 7];

// ---------------- Vẽ bàn cờ ----------------

function render() {
  const h = game.history;
  const last = h.length ? h[h.length - 1].move : null;
  const isNew = last && last !== seenMove && h.length === seenLen + 1;
  seenMove = last;
  seenLen = h.length;

  const checkSq = game.inCheck() ? game.kingSquare(game.turn) : -1;
  const targets = new Map(selectedMoves.map(m => [m.to, m]));
  const stars = mode === 'learn' ? Learn.stars() : new Set();

  boardEl.innerHTML = '';
  for (let k = 0; k < 64; k++) {
    const i = flipped ? 63 - k : k;
    const r = i >> 3, c = i & 7;
    const sq = document.createElement('div');
    sq.className = 'sq ' + ((r + c) % 2 ? 'dark' : 'light');
    if (i === selected) sq.classList.add('selected');
    if (last && (i === last.from || i === last.to)) sq.classList.add('last');
    if (i === checkSq) sq.classList.add('check');
    if (marks.has(i)) sq.classList.add('marked');
    if (targets.has(i)) sq.classList.add(targets.get(i).captured ? 'capture' : 'target');
    if (hint && (i === hint.from || i === hint.to)) sq.classList.add('hint');

    const p = game.board[i];
    if (p) {
      const img = document.createElement('img');
      img.className = 'piece';
      img.src = pieceSrc(p);
      img.alt = '';
      img.draggable = false;
      if (drag && drag.moved && drag.from === i) img.classList.add('dragging');
      sq.appendChild(img);
    }
    if (stars.has(i)) sq.insertAdjacentHTML('beforeend', '<span class="star">★</span>');
    if ((k & 7) === 0) sq.insertAdjacentHTML('beforeend', `<span class="coord rank">${8 - r}</span>`);
    if (k >= 56) sq.insertAdjacentHTML('beforeend', `<span class="coord file">${'abcdefgh'[c]}</span>`);
    boardEl.appendChild(sq);
  }

  if (isNew) {
    if (!skipAnim) animate(last);
    const over = game.isGameOver();
    Sound.play(over ? 'end' : game.inCheck() ? 'check' : last.captured ? 'capture' : 'move');
  }
  skipAnim = false;

  renderStatus();
  renderMoves();
  renderPlayers();
  renderRatedNote();
  checkResult();
}

// Trượt quân từ ô cũ sang ô mới (và Xe khi nhập thành)
function animate(m) {
  const slide = (from, to) => {
    const img = boardEl.children[disp(to)].querySelector('.piece');
    if (!img) return;
    const [fr, fc] = rowCol(from), [tr, tc] = rowCol(to);
    img.classList.add('moving');
    img.style.transition = 'none';
    img.style.transform = `translate(${(fc - tc) * 100}%, ${(fr - tr) * 100}%)`;
    img.getBoundingClientRect(); // ép trình duyệt áp vị trí đầu
    img.style.transition = '';
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
    el.textContent = custom.text;
    if (custom.cls) el.classList.add(custom.cls);
    return;
  }
  const s = game.status();
  if (playResult) {
    el.textContent = `${playResult.reason} – ${COLOR_NAME[playResult.winner]} thắng`;
    el.classList.add('over');
  } else if (s === 'checkmate') {
    el.textContent = `Chiếu hết! ${COLOR_NAME[opposite(game.turn)]} thắng 🎉`;
    el.classList.add('over');
  } else if (s !== 'playing') {
    el.textContent = 'Hòa – ' + REASONS[s].toLowerCase();
    el.classList.add('over');
  } else if (thinking) {
    el.textContent = 'Máy đang suy nghĩ…';
    el.classList.add('thinking');
  } else {
    el.textContent = `Lượt ${COLOR_NAME[game.turn]} đi` + (game.inCheck() ? ' – đang bị chiếu!' : '');
    if (game.inCheck()) el.classList.add('in-check');
  }
}

function renderMoves() {
  const box = $('moves');
  box.innerHTML = '';
  const h = game.history;
  if (!h.length) box.innerHTML = '<p class="empty">Chưa có nước đi nào</p>';
  for (let i = 0; i < h.length; i += 2) {
    const row = document.createElement('div');
    row.className = 'move-row';
    row.innerHTML = `<span class="num">${i / 2 + 1}.</span><span class="mv"></span><span class="mv"></span>`;
    row.children[1].textContent = h[i].san;
    if (h[i + 1]) row.children[2].textContent = h[i + 1].san;
    const cur = row.children[(h.length - 1 - i) + 1];
    if (cur && h.length - 1 - i < 2) cur.classList.add('current');
    box.appendChild(row);
  }
  box.scrollTop = box.scrollHeight;
}

// Thông tin người chơi ở mỗi bên bàn cờ
function playerInfo(c) {
  if (mode === 'online') return Online.player(c);
  if (mode === 'play' && aiColor !== 'none') {
    if (c === aiColor) return { name: 'Máy · ' + LEVEL_NAME[gameLevel], rating: Profile.aiRating(gameLevel), bot: true };
    const me = Profile.me();
    return { name: me.name, rating: me.rating, me: true };
  }
  return { name: 'Người chơi ' + COLOR_NAME[c], rating: null };
}

function avatarColor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 45% 42%)`;
}

function setAvatar(el, info, c) {
  el.innerHTML = '';
  el.className = el.className.replace(/ ?(bot|piece-av)/g, '');
  if (info.bot || (!info.me && info.rating == null)) {
    el.classList.add(info.bot ? 'bot' : 'piece-av');
    el.style.background = '';
    const img = document.createElement('img');
    img.src = pieceSrc(c + (info.bot ? 'N' : 'K'));
    img.alt = '';
    el.appendChild(img);
  } else {
    el.textContent = (info.name.trim()[0] || '?').toUpperCase();
    el.style.background = avatarColor(info.name);
  }
}

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
    $(pos + 'Name').textContent = info.name;
    $(pos + 'Rating').textContent = info.rating != null ? `(${info.rating})` : '';
    setAvatar($(pos + 'Avatar'), info, c);
    const diff = material[c] - material[opposite(c)];
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
    $(pos + 'Player').classList.toggle('active', game.turn === c && !game.isGameOver() && !playResult && mode !== 'learn');
  };
  const bottom = flipped ? 'b' : 'w';
  fill('bottom', bottom);
  fill('top', opposite(bottom));
}

function renderRatedNote() {
  const el = $('ratedNote');
  if (aiColor === 'none') el.textContent = 'Chơi 2 người cùng máy không tính Elo';
  else if (unrated) el.textContent = 'Ván này không tính Elo vì đã dùng Đi lại / Gợi ý';
  else el.textContent = `Ván tính Elo · đối thủ ${Profile.aiRating(gameLevel)}`;
  el.classList.toggle('off', aiColor === 'none' || unrated);
}

function renderHeader() {
  const me = Profile.me();
  $('meName').textContent = me.name;
  $('meRating').textContent = 'Elo ' + me.rating;
  setAvatar($('meAvatar'), { name: me.name, me: true }, 'w');
  document.body.dataset.board = Profile.prefs().board;
}

// ---------------- Thao tác trên bàn cờ ----------------

function canHumanMove() {
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
    if (matches.length > 1) askPromotion(matches, dragged);
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

function squareAt(e) {
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
  if (e.button !== 0) return;
  Sound.unlock();
  const i = squareAt(e);
  if (i < 0) return;
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
boardEl.addEventListener('contextmenu', e => {
  e.preventDefault();
  const i = squareAt(e);
  if (i < 0) return;
  if (marks.has(i)) marks.delete(i); else marks.add(i);
  render();
});

function askPromotion(moves, dragged) {
  const modal = $('promo');
  const box = $('promoChoices');
  box.innerHTML = '';
  for (const m of moves) {
    const btn = document.createElement('button');
    btn.innerHTML = `<img src="${pieceSrc(m.piece[0] + m.promotion)}" alt="${m.promotion}">`;
    btn.addEventListener('click', () => { modal.hidden = true; play(m, dragged); });
    box.appendChild(btn);
  }
  modal.hidden = false;
}

function play(m, dragged = false) {
  clearSelection();
  hint = null;
  marks.clear();
  skipAnim = dragged;
  if (mode === 'learn') return Learn.onMove(m);
  game.move(m);
  if (mode === 'online') Online.sendMove(m);
  render();
  maybeAiMove();
}

// Gợi ý nước đi tốt (dùng AI mức Trung bình) khi chơi với máy hoặc 2 người
function showHint() {
  if (mode !== 'play' || !canHumanMove()) return;
  const m = findBestMove(game, 2);
  if (m) hint = { from: m.from, to: m.to };
  if (aiColor !== 'none') unrated = true;
  render();
}

function maybeAiMove() {
  if (mode !== 'play' || game.turn !== aiColor || game.isGameOver() || playResult) return;
  thinking = true;
  render();
  const id = gameId;
  // setTimeout để trình duyệt kịp vẽ lại trước khi AI tính toán
  setTimeout(() => {
    if (id !== gameId) return;
    const m = findBestMove(game, gameLevel);
    thinking = false;
    if (m) game.move(m);
    render();
  }, 350);
}

// ---------------- Ván đấu & Elo ----------------

function startRatedGame() {
  ratedDone = false;
  unrated = false;
  playResult = null;
  $('resultModal').hidden = true;
}

// Ván đang chơi với máy mà bỏ ngang thì tính thua. Trả về false nếu người chơi hủy.
function confirmAbandon() {
  if (mode !== 'play' || aiColor === 'none' || ratedDone || unrated || game.history.length < 2 || game.isGameOver()) return true;
  if (!confirm('Bỏ ván đang chơi sẽ bị tính thua. Tiếp tục?')) return false;
  ratedDone = true;
  Profile.record(0, Profile.aiRating(gameLevel));
  return true;
}

function newGame() {
  gameId++;
  thinking = false;
  game.reset();
  clearSelection();
  hint = null;
  marks.clear();
  aiColor = $('mode').value;
  gameLevel = Number($('level').value);
  flipped = aiColor === 'w';
  startRatedGame();
  render();
  maybeAiMove();
}

function undo() {
  if (thinking || playResult || !game.history.length) return;
  hint = null;
  game.undo();
  // Khi đấu với máy, lùi thêm một nước để quay về lượt của người chơi
  if (game.turn === aiColor && game.history.length) game.undo();
  if (aiColor !== 'none') unrated = true;
  clearSelection();
  render();
  maybeAiMove();
}

function resignPlay() {
  if (playResult || game.isGameOver() || !game.history.length) return;
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
  const rating = human ? Profile.aiRating(gameLevel) : null;
  if (playResult) return { ...playResult, rating };
  const s = game.status();
  if (s === 'playing') return null;
  const winner = s === 'checkmate' ? opposite(game.turn) : null;
  return { winner, reason: REASONS[s], rating, score: human ? (winner ? (winner === human ? 1 : 0) : 0.5) : null };
}

function checkResult() {
  if (ratedDone) return;
  const o = gameOutcome();
  if (!o) return;
  ratedDone = true;
  let change = null;
  if (o.score != null && !unrated) change = Profile.record(o.score, o.rating);
  if (!quietResult) setTimeout(() => showResult(o, change), 600);
}

function showResult(o, change) {
  const title = o.score == null
    ? (o.winner ? `${COLOR_NAME[o.winner]} thắng!` : 'Hòa!')
    : o.score === 1 ? 'Bạn thắng!' : o.score === 0 ? 'Bạn thua' : 'Hòa!';
  const kind = o.score == null ? (o.winner ? 'win' : 'draw') : o.score === 1 ? 'win' : o.score === 0 ? 'loss' : 'draw';
  $('resultIcon').className = 'result-icon ' + kind;
  $('resultIcon').innerHTML = `<svg class="ic"><use href="#i-${kind === 'win' ? 'trophy' : kind === 'loss' ? 'flag' : 'handshake'}"/></svg>`;
  $('resultTitle').textContent = title;
  $('resultReason').textContent = o.reason || '';
  const box = $('resultRating');
  if (change) {
    const sign = change.delta > 0 ? '+' : '';
    box.innerHTML = `<span class="muted">Elo</span> <b>${change.before}</b> → <b>${change.after}</b>
      <span class="delta ${change.delta > 0 ? 'up' : change.delta < 0 ? 'down' : ''}">${sign}${change.delta}</span>`;
  } else if (o.score != null && unrated) {
    box.innerHTML = '<span class="muted">Ván không tính Elo (đã dùng Đi lại / Gợi ý)</span>';
  } else {
    box.innerHTML = '';
  }
  $('resultAgain').textContent = mode === 'online' ? 'Mời chơi ván mới' : 'Ván mới';
  $('resultAgain').hidden = mode === 'online' && !Online.connected();
  $('resultModal').hidden = false;
}

// ---------------- Chuyển chế độ ----------------

function setMode(m) {
  if (m === mode) return;
  if (mode === 'play' && !confirmAbandon()) return;
  if (mode === 'online' && Online.inGame() && game.history.length >= 2 &&
      !confirm('Rời phòng giữa ván sẽ bị tính thua. Tiếp tục?')) return;
  quietResult = true;
  if (mode === 'online') Online.leave();
  if (mode === 'learn') Learn.leave();
  quietResult = false;
  mode = m;
  gameId++;
  thinking = false;
  aiColor = 'none';
  hint = null;
  marks.clear();
  ratedDone = true;
  playResult = null;
  $('resultModal').hidden = true;
  document.body.dataset.mode = m;
  for (const tab of document.querySelectorAll('.tab')) tab.setAttribute('aria-selected', tab.dataset.mode === m);
  $('playPanel').hidden = m !== 'play';
  $('onlinePanel').hidden = m !== 'online';
  $('learnPanel').hidden = m !== 'learn';
  if (m === 'play') newGame();
  else if (m === 'learn') Learn.open();
  else render();
}

// ---------------- Hộp thoại ----------------

function openModal(id) { $(id).hidden = false; }

for (const modal of document.querySelectorAll('.modal')) {
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('[data-close]')) modal.hidden = true;
  });
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') for (const m of document.querySelectorAll('.modal')) m.hidden = true;
});

$('resultAgain').addEventListener('click', () => {
  $('resultModal').hidden = true;
  if (mode === 'online') Online.rematch();
  else newGame();
});

// Bảng xếp hạng
async function openRanking() {
  openModal('rankModal');
  $('rankNote').textContent = Profile.remote
    ? 'Toàn cầu · Elo tính từ ván đấu với máy và online'
    : 'Chỉ trên máy này · bật bảng toàn cầu: xem README';
  const list = $('rankList');
  list.innerHTML = '<p class="empty">Đang tải…</p>';
  try {
    const rows = await Profile.leaderboard();
    list.innerHTML = '';
    let n = 0;
    for (const p of rows) {
      const row = document.createElement('div');
      row.className = 'rank-row' + (p.me ? ' me' : '') + (p.bot ? ' bot' : '');
      const rank = p.bot ? '' : ++n;
      row.innerHTML = `<span class="rank-no">${rank <= 3 && rank ? ['🥇', '🥈', '🥉'][rank - 1] : rank}</span>
        <span class="rank-name"><span class="avatar sm"></span><span class="nm"></span></span>
        <span class="rank-elo">${p.rating}</span>
        <span>${p.bot ? '–' : p.games}</span>
        <span class="wdl">${p.bot ? '' : `<i class="w">${p.wins}</i> / ${p.draws} / <i class="l">${p.losses}</i>`}</span>`;
      row.querySelector('.nm').textContent = p.name + (p.me ? ' (bạn)' : '');
      setAvatar(row.querySelector('.avatar'), { name: p.name, bot: p.bot, me: !p.bot }, 'w');
      list.appendChild(row);
    }
    if (!n) list.insertAdjacentHTML('afterbegin', '<p class="empty">Chơi một ván với máy hoặc online để có tên trên bảng!</p>');
  } catch (err) {
    list.innerHTML = '<p class="empty">Không tải được bảng xếp hạng. Kiểm tra mạng và cấu hình Firebase.</p>';
  }
}

// Hồ sơ & cài đặt
function openProfile() {
  const me = Profile.me();
  $('profileName').value = me.name;
  setAvatar($('profileAvatar'), { name: me.name, me: true }, 'w');
  $('statRating').textContent = me.rating;
  $('statGames').textContent = me.games;
  $('statWins').textContent = me.wins;
  $('statDraws').textContent = me.draws;
  $('statLosses').textContent = me.losses;
  $('soundToggle').checked = Profile.prefs().sound;
  $('profileMsg').textContent = '';
  renderThemes();
  openModal('profileModal');
}

function renderThemes() {
  const box = $('themeChoices');
  box.innerHTML = '';
  for (const [key, name, light, dark] of THEMES) {
    const b = document.createElement('button');
    b.className = 'theme' + (Profile.prefs().board === key ? ' on' : '');
    b.title = name;
    b.innerHTML = `<span style="background:linear-gradient(135deg, ${light} 50%, ${dark} 50%)"></span><small>${name}</small>`;
    b.addEventListener('click', () => { Profile.setPref('board', key); renderThemes(); });
    box.appendChild(b);
  }
}

$('profileSave').addEventListener('click', () => {
  if (!Profile.setName($('profileName').value)) {
    $('profileMsg').textContent = 'Tên cần từ 2 đến 20 ký tự.';
    return;
  }
  $('profileModal').hidden = true;
});
$('soundToggle').addEventListener('change', e => Profile.setPref('sound', e.target.checked));

Profile.onChange(() => { renderHeader(); renderPlayers(); renderRatedNote(); });

// ---------------- Nút bấm ----------------

for (const tab of document.querySelectorAll('.tab')) tab.addEventListener('click', () => setMode(tab.dataset.mode));
$('newGame').addEventListener('click', () => { if (confirmAbandon()) newGame(); });
$('hint').addEventListener('click', showHint);
$('undo').addEventListener('click', undo);
$('playResign').addEventListener('click', resignPlay);
$('flip').addEventListener('click', () => { flipped = !flipped; render(); });
$('mode').addEventListener('change', () => { if (confirmAbandon()) newGame(); else $('mode').value = aiColor; });
$('level').addEventListener('change', () => { if (confirmAbandon()) newGame(); else $('level').value = gameLevel; });
$('rankBtn').addEventListener('click', openRanking);
$('rankRefresh').addEventListener('click', openRanking);
$('profileBtn').addEventListener('click', openProfile);
$('promo').addEventListener('click', e => {
  if (e.target === $('promo')) $('promo').hidden = true;
});

// Mở bằng link mời (?room=MÃ) thì vào thẳng phòng online
const room = new URLSearchParams(location.search).get('room');
renderHeader();
newGame();
if (room) {
  setMode('online');
  Online.join(room);
}
