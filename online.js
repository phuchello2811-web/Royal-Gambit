// Chơi online qua WebRTC (thư viện PeerJS): hai trình duyệt kết nối trực tiếp với nhau,
// không cần server riêng nên vẫn chạy được trên GitHub Pages.
// Người tạo phòng (host) chọn màu; người vào phòng nhận màu còn lại.

const Online = (() => {
  const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
  const PREFIX = 'covua-vn-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const $ = id => document.getElementById(id);

  let peer = null, conn = null;
  let state = 'idle';  // 'idle' | 'connecting' | 'waiting' | 'playing'
  let isHost = false;
  let code = '';
  let color = null;    // màu của mình
  let result = null;   // { text, score }: kết quả do xin thua / thỏa thuận hòa / rời ván
  let opp = { name: 'Đối thủ', rating: 1200 };
  let left = false;    // đối thủ đã rời phòng
  let offer = null;    // lời đề nghị đối thủ gửi tới: 'draw' | 'rematch'

  function loadLib() {
    if (window.Peer) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = PEERJS_URL;
      s.onload = resolve;
      s.onerror = () => reject(new Error('lib'));
      document.head.appendChild(s);
    });
  }

  function randomCode() {
    let s = '';
    for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }

  function inviteLink() { return location.href.split(/[?#]/)[0] + '?room=' + code; }

  function info(text) { $('onlineInfo').textContent = text || ''; }

  function setState(s) {
    state = s;
    $('onlineLobby').hidden = s !== 'idle';
    $('onlineWaiting').hidden = s !== 'waiting';
    $('onlineGame').hidden = s !== 'playing';
    $('createRoom').disabled = $('joinRoom').disabled = s === 'connecting';
    if (s === 'waiting') {
      $('roomCodeShow').textContent = code;
      $('inviteLink').value = inviteLink();
    }
    renderOffer();
    render();
  }

  async function create() {
    isHost = true;
    info('');
    setState('connecting');
    try { await loadLib(); } catch { return fail('Không tải được thư viện kết nối. Kiểm tra mạng Internet.'); }
    code = randomCode();
    peer = new Peer(PREFIX + code);
    peer.on('open', () => setState('waiting'));
    peer.on('connection', c => {
      if (conn) { // phòng đã đủ 2 người
        c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 500); });
        return;
      }
      attach(c);
    });
    peer.on('error', onPeerError);
  }

  async function join(raw) {
    code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) return info('Mã phòng gồm 6 ký tự.');
    isHost = false;
    info('');
    setState('connecting');
    try { await loadLib(); } catch { return fail('Không tải được thư viện kết nối. Kiểm tra mạng Internet.'); }
    peer = new Peer();
    peer.on('open', () => attach(peer.connect(PREFIX + code, { reliable: true })));
    peer.on('error', onPeerError);
  }

  function attach(c) {
    conn = c;
    c.on('open', () => {
      const me = Profile.me();
      c.send({ t: 'hello', name: me.name, rating: me.rating });
      if (!isHost) return;
      const pref = $('hostColor').value;
      const mine = pref === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : pref;
      c.send({ t: 'start', color: opposite(mine) });
      begin(mine);
    });
    c.on('data', onData);
    c.on('close', onClose);
  }

  function onPeerError(err) {
    if (err.type === 'unavailable-id' && isHost) { // trùng mã phòng, tạo mã khác
      peer.destroy(); peer = null;
      return create();
    }
    const messages = {
      'peer-unavailable': 'Không tìm thấy phòng. Kiểm tra lại mã phòng.',
      'network': 'Mất kết nối tới máy chủ trung gian.',
      'server-error': 'Máy chủ kết nối đang lỗi, thử lại sau.',
      'browser-incompatible': 'Trình duyệt không hỗ trợ WebRTC.',
    };
    if (state === 'playing' && err.type === 'network') return info(messages.network); // trận vẫn có thể tiếp tục
    fail(messages[err.type] || 'Lỗi kết nối: ' + err.type);
  }

  function fail(text) {
    cleanup();
    setState('idle');
    info(text);
  }

  function begin(myColor) {
    color = myColor;
    result = null;
    offer = null;
    left = false;
    game.reset();
    startRatedGame();
    flipped = color === 'b';
    clearSelection();
    hint = null;
    info('');
    setState('playing');
    chat(null, `Bắt đầu ván mới – bạn cầm quân ${COLOR_NAME[color]}.`);
  }

  function send(msg) { if (conn && conn.open) conn.send(msg); }

  function onData(d) {
    if (!d || typeof d !== 'object') return;
    switch (d.t) {
      case 'hello': {
        const name = String(d.name || '').replace(/\s+/g, ' ').trim().slice(0, 20);
        const rating = Number(d.rating);
        opp = { name: name.length >= 2 ? name : 'Đối thủ', rating: rating >= 100 && rating <= 3000 ? Math.round(rating) : 1200 };
        render();
        break;
      }
      case 'start':
        if (d.color === 'w' || d.color === 'b') begin(d.color);
        break;
      case 'move': {
        if (state !== 'playing' || game.turn === color || result) return;
        const m = game.move({ from: d.from, to: d.to, promotion: d.promotion || undefined });
        if (!m) chat(null, 'Nhận được nước đi không hợp lệ từ đối thủ.');
        offer = offer === 'draw' ? null : offer; // đối thủ đi tiếp coi như rút lời xin hòa
        renderOffer();
        render();
        break;
      }
      case 'resign':
        result = { text: 'Đối thủ xin thua – Bạn thắng 🎉', reason: 'Đối thủ xin thua', score: 1 };
        chat(null, 'Đối thủ đã xin thua.');
        render();
        break;
      case 'draw-offer':
        if (result || game.isGameOver()) return;
        offer = 'draw';
        renderOffer();
        break;
      case 'draw-accept':
        result = { text: 'Hòa – hai bên đồng ý', reason: 'Hai bên đồng ý hòa', score: 0.5 };
        render();
        break;
      case 'draw-decline':
        chat(null, 'Đối thủ từ chối hòa.');
        break;
      case 'rematch':
        offer = 'rematch';
        renderOffer();
        break;
      case 'rematch-ok':
        begin(opposite(color));
        break;
      case 'rematch-decline':
        chat(null, 'Đối thủ chưa muốn chơi ván mới.');
        break;
      case 'chat':
        chat(opp.name, String(d.text || '').slice(0, 200));
        break;
      case 'full':
        fail('Phòng này đã đủ 2 người.');
        break;
    }
  }

  function onClose() {
    if (state === 'playing') {
      left = true;
      offer = null;
      renderOffer();
      chat(null, 'Đối thủ đã rời phòng.');
      render();
    } else if (state !== 'idle') {
      fail('Kết nối bị đóng.');
    }
  }

  function cleanup() {
    if (conn) conn.close();
    if (peer) peer.destroy();
    conn = peer = null;
    color = result = offer = null;
    left = false;
    opp = { name: 'Đối thủ', rating: 1200 };
  }

  // Rời phòng giữa ván (đã đi ít nhất 2 nước) bị tính thua
  function leave() {
    if (inGame() && game.history.length >= 2) {
      result = { text: 'Bạn đã rời ván', reason: 'Bạn rời ván giữa chừng', score: 0 };
      send({ t: 'resign' });
      render();
    }
    cleanup();
    $('chatLog').innerHTML = '';
    game.reset();
    flipped = false;
    clearSelection();
    info('');
    setState('idle');
  }

  function chat(who, text) {
    const log = $('chatLog');
    const p = document.createElement('p');
    if (who) {
      const b = document.createElement('b');
      b.textContent = who + ': ';
      p.appendChild(b);
    } else {
      p.className = 'system';
    }
    p.appendChild(document.createTextNode(text));
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  }

  function renderOffer() {
    const box = $('onlineOffer');
    box.hidden = !offer;
    if (offer) $('offerText').textContent = offer === 'draw' ? 'Đối thủ xin hòa.' : 'Đối thủ muốn chơi ván mới (đổi màu).';
  }

  function answerOffer(yes) {
    if (offer === 'draw') {
      send({ t: yes ? 'draw-accept' : 'draw-decline' });
      if (yes) result = { text: 'Hòa – hai bên đồng ý', reason: 'Hai bên đồng ý hòa', score: 0.5 };
      offer = null;
    } else if (offer === 'rematch') {
      send({ t: yes ? 'rematch-ok' : 'rematch-decline' });
      offer = null;
      if (yes) return begin(opposite(color));
    }
    renderOffer();
    render();
  }

  // ---- Giao tiếp với app.js ----

  function canMove() {
    return state === 'playing' && !left && !result && game.turn === color && !game.isGameOver();
  }

  function sendMove(m) { send({ t: 'move', from: m.from, to: m.to, promotion: m.promotion || null }); }

  function status() {
    if (state === 'idle') return { text: 'Tạo phòng hoặc nhập mã phòng để chơi với bạn bè' };
    if (state === 'connecting') return { text: 'Đang kết nối…', cls: 'thinking' };
    if (state === 'waiting') return { text: 'Đang chờ đối thủ vào phòng…', cls: 'thinking' };
    if (result) return { text: result.text, cls: 'over' };
    const s = game.status();
    if (s === 'checkmate') return { text: game.turn === color ? 'Chiếu hết – Bạn thua 😢' : 'Chiếu hết – Bạn thắng 🎉', cls: 'over' };
    if (s !== 'playing') return null; // các kiểu hòa: dùng thông báo chung
    if (left) return { text: 'Đối thủ đã rời phòng', cls: 'in-check' };
    const check = game.inCheck() ? ' – đang bị chiếu!' : '';
    return game.turn === color
      ? { text: 'Lượt của bạn' + check, cls: check ? 'in-check' : '' }
      : { text: 'Chờ đối thủ đi…' + check, cls: 'thinking' };
  }

  function player(c) {
    if (!color) return { name: 'Người chơi ' + COLOR_NAME[c], rating: null, avatar: c === 'w' ? '♔' : '♚' };
    if (c === color) { const me = Profile.me(); return { name: me.name, rating: me.rating, me: true }; }
    return { name: opp.name, rating: opp.rating };
  }

  // Kết quả ván để tính Elo: { score, rating, reason } hoặc null nếu ván chưa xong
  function outcome() {
    if (state !== 'playing' || !color) return null;
    const base = { rating: opp.rating };
    if (result) return { ...base, score: result.score, reason: result.reason };
    const s = game.status();
    if (s === 'checkmate') return { ...base, score: game.turn === color ? 0 : 1, reason: 'Chiếu hết' };
    if (s !== 'playing') return { ...base, score: 0.5, reason: null };
    if (left && game.history.length >= 2) return { ...base, score: 1, reason: 'Đối thủ đã rời ván' };
    return null;
  }

  function inGame() { return state === 'playing' && !left && !result && !game.isGameOver(); }

  // ---- Nút bấm ----

  $('createRoom').addEventListener('click', create);
  $('joinRoom').addEventListener('click', () => join($('roomCode').value));
  $('roomCode').addEventListener('keydown', e => { if (e.key === 'Enter') join($('roomCode').value); });
  $('cancelRoom').addEventListener('click', leave);
  $('leaveRoom').addEventListener('click', () => {
    if (!left && !result && !game.isGameOver() && !confirm('Rời phòng giữa ván sẽ bị tính thua. Tiếp tục?')) return;
    leave();
  });
  $('copyLink').addEventListener('click', () => {
    const input = $('inviteLink');
    const done = () => info('Đã sao chép link mời!');
    if (navigator.clipboard) navigator.clipboard.writeText(input.value).then(done, () => { input.select(); });
    else { input.select(); document.execCommand('copy'); done(); }
  });
  $('resign').addEventListener('click', () => {
    if (result || left || game.isGameOver() || !confirm('Bạn chắc chắn muốn xin thua?')) return;
    send({ t: 'resign' });
    result = { text: 'Bạn đã xin thua', reason: 'Bạn xin thua', score: 0 };
    render();
  });
  $('offerDraw').addEventListener('click', () => {
    if (result || left || game.isGameOver()) return;
    send({ t: 'draw-offer' });
    chat(null, 'Đã gửi lời xin hòa.');
  });
  $('rematch').addEventListener('click', () => {
    if (left) return;
    send({ t: 'rematch' });
    chat(null, 'Đã gửi lời mời chơi ván mới.');
  });
  $('offerYes').addEventListener('click', () => answerOffer(true));
  $('offerNo').addEventListener('click', () => answerOffer(false));
  $('chatForm').addEventListener('submit', e => {
    e.preventDefault();
    const text = $('chatInput').value.trim();
    if (!text || left) return;
    send({ t: 'chat', text });
    chat('Bạn', text);
    $('chatInput').value = '';
  });

  return {
    join, leave, canMove, sendMove, status, player, outcome, inGame,
    rematch: () => $('rematch').click(),
    connected: () => state === 'playing' && !left,
  };
})();
