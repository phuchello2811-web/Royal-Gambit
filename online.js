// Chơi online qua WebRTC (thư viện PeerJS): hai trình duyệt kết nối trực tiếp với nhau,
// không cần server riêng nên vẫn chạy được trên GitHub Pages.
// Người tạo phòng (host) chọn màu; người vào phòng nhận màu còn lại.
//
// Tìm trận tự động (không cần server riêng): mọi người đang tìm trận cùng tranh một "phòng chờ"
// có ID cố định trên PeerJS. Ai giành được ID thì ngồi chờ, người đến sau thấy ID đã có chủ thì
// nối vào, thế là hai người được ghép. Ngay khi ghép xong, người chờ nhả ID ra (peer.disconnect(),
// kết nối trận đấu vẫn giữ nguyên) để cặp tiếp theo dùng. Contest dùng phòng chờ riêng cho từng contest.

const Online = (() => {
  const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
  // Mã kiểm tra toàn vẹn (SRI): trình duyệt từ chối chạy nếu file trên CDN bị sửa. Đổi phiên bản thì phải tính lại mã này.
  const PEERJS_SRI = 'sha384-x0YgkOr/3UOZP2CRDxGW9e0Q+2Qjyr3uJrm4xU32Y7ZCNAo7Cc7bjhrZMi/dwczu';
  const PREFIX = 'covua-vn-';
  const SEARCH_LIMIT = 3 * 60 * 1000; // tìm trận tối đa 3 phút
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  // Nhịp tim: hai bên gửi 'ping' mỗi 2 giây. Im lặng 5 giây = mất kết nối (hiện đếm ngược);
  // vắng mặt quá 15 giây = xử thua. Kết nối WebRTC nhiều khi không báo 'close' khi đối thủ đóng tab / mất mạng.
  const HB_EVERY = 2000, HB_SILENT = 5000, FORFEIT_MS = 15000;
  const PENDING_KEY = 'rg-online-forfeit';
  // Đồng hồ: 'phút+giây cộng mỗi nước'. Tìm trận chỉ ghép người chọn cùng thời gian (mỗi mức một phòng chờ;
  // 'none' dùng phòng chờ cũ 'mm-main' nên vẫn ghép được với bản web chưa có đồng hồ). Contest: 10 phút mỗi bên.
  const ONLINE_TCS = ['none', '60+0', '180+2', '300+0', '600+0', '900+10'];
  const CONTEST_TC = '600+0';
  const TC_TEXT = { none: 'không giới hạn thời gian', '60+0': '1 phút', '180+2': '3 phút + 2 giây', '300+0': '5 phút', '600+0': '10 phút', '900+10': '15 phút + 10 giây' };
  const LAG_MS = 2000;   // bù độ trễ mạng tối đa mỗi nước: giờ đối thủ tự báo không được nhiều hơn ước tính của mình quá mức này
  const FLAG_GRACE = 2000; // đối thủ hết giờ mà máy họ không tự báo thua: chờ thêm chừng này rồi mới xử thắng
  const $ = id => document.getElementById(id);

  let peer = null, conn = null;
  let state = 'idle';  // 'idle' | 'connecting' | 'waiting' | 'playing'
  let isHost = false;
  let code = '';
  let color = null;    // màu của mình
  let result = null;   // { text, score }: kết quả do xin thua / thỏa thuận hòa / rời ván
  let opp = { name: 'Đối thủ', exp: 0, elo: 800, photo: '', uid: '', title: '' };
  let left = false;    // đối thủ đã rời phòng
  let offer = null;    // lời đề nghị đối thủ gửi tới: 'draw' | 'rematch'
  let search = null;   // đang tìm trận: { lobby, contest, until, started, timer, guard, tick, expire }
  let contestId = null; // ván này tính điểm contest nào (null nếu không)
  let startedAt = 0;   // lúc ván hiện tại bắt đầu
  let waitHello = false; // host: chờ lời chào của khách rồi mới bắt đầu ván
  let sentDraw = false;    // mình đã xin hòa và đối thủ chưa trả lời
  let sentRematch = false; // mình đã mời ván mới và đối thủ chưa trả lời
  let lastSeen = 0;        // lần cuối nhận được tin của đối thủ
  let goneAt = 0;          // lúc đối thủ bị coi là đã thoát (0 = vẫn đang kết nối)
  let oppHb = false;       // đối thủ dùng bản web có nhịp tim (bản cũ thì chỉ dựa vào sự kiện đóng kết nối)
  let hbTimer = null, hbTick = 0;
  let oppKnown = false;    // đã nhận được lời chào của đối thủ
  let tcValue = 'none';    // thời gian của ván đang đánh (chủ phòng quyết định, gửi kèm lệnh 'start')
  let clk = null;          // { base, inc, w, b, turn, at }: giờ còn lại (ms); at = lúc bắt đầu đếm lượt hiện tại (0 = đang dừng)
  let clkTimer = null;
  const hooks = { fail: null };

  function loadLib() {
    if (window.Peer) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = PEERJS_URL;
      s.integrity = PEERJS_SRI;
      s.crossOrigin = 'anonymous';
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
    $('onlineSearching').hidden = s !== 'searching';
    $('onlineWaiting').hidden = s !== 'waiting';
    $('onlineGame').hidden = s !== 'playing';
    $('createRoom').disabled = $('joinRoom').disabled = $('findMatch').disabled = s === 'connecting';
    if (s === 'waiting') {
      $('roomCodeShow').textContent = code;
      $('roomTime').textContent = `Thời gian: ${TC_TEXT[pickedTc()]}`; // chủ phòng quyết định thời gian của ván
      $('inviteLink').value = inviteLink();
    }
    renderOffer();
    render();
    try { refreshMuteBtn(); } catch {}
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
      sendHello(c);
      // Trạng thái kết nối mạng thật (ICE): 'failed' / 'closed' nghĩa là đối thủ đã mất hẳn
      const pc = c.peerConnection;
      if (pc) pc.addEventListener('iceconnectionstatechange', () => {
        if (conn === c && /failed|closed/.test(pc.iceConnectionState)) markGone('Mất kết nối với đối thủ.');
      });
      if (isHost) waitHello = true; // bắt đầu ván khi nhận được lời chào (xem onData 'hello')
    });
    // Bỏ qua sự kiện của kết nối cũ (vòng tìm trận trước, phòng đã rời)
    c.on('data', d => { if (conn === c) { seen(); onData(d); } });
    c.on('close', () => { if (conn === c) onClose(); });
  }

  // Lời chào: gói nhỏ (tên, rank, Elo) gửi riêng; ảnh đại diện (tới 40KB) gửi sau thành gói khác.
  // Trước đây gửi chung một gói lớn nên thỉnh thoảng bị rơi → hiện "Đối thủ · 800 Elo" và tính Elo sai.
  function sendHello(c = conn, photo = true) {
    if (!c || !c.open) return;
    const me = Profile.me();
    c.send({ t: 'hello', hb: 1, uid: Profile.uid() || '', name: me.name, exp: me.exp, elo: me.elo, title: me.title || '', contest: search && search.contest ? search.contest.id : null });
    if (photo && me.photo) c.send({ t: 'photo', photo: me.photo });
  }

  // Lời chào do trình duyệt đối thủ tự khai. Bản Firebase: lấy Elo, exp và danh hiệu thật từ máy chủ
  // (Elo đối thủ quyết định mình được / mất bao nhiêu Elo). uid giả hoặc không khớp tên thì giữ số liệu trong lời chào.
  // Mỗi đối thủ chỉ kiểm tra một lần; ván chơi lại sau đó dùng Elo mới trong lời chào (máy chủ có thể chưa kịp cập nhật).
  let verified = { uid: '', title: '' };
  async function verifyOpp() {
    const id = opp.uid, name = opp.name;
    if (!Profile.remote || !id || typeof Profile.player !== 'function') return;
    if (verified.uid === id) { opp.title = verified.title; return; }
    verified = { uid: id, title: opp.title };
    let p = null;
    try { p = await Profile.player(id); } catch { return; }
    if (!p || opp.uid !== id || opp.name !== name || p.name.toLowerCase() !== name.toLowerCase()) return;
    verified.title = opp.title = p.title || '';
    opp.exp = p.exp;
    opp.elo = p.elo;
    render();
  }

  // Sau khi vào ván mà vẫn chưa biết đối thủ là ai thì hỏi lại (tối đa 3 lần)
  let whoTimer = null;
  function askWho(n = 0) {
    clearTimeout(whoTimer);
    whoTimer = setTimeout(() => {
      if (state !== 'playing' || left || oppKnown) return;
      send({ t: 'who' });
      if (n < 2) askWho(n + 1);
    }, 2000);
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
    // Đang đánh: lỗi của máy chủ trung gian không làm đứt kết nối trực tiếp giữa hai bên, ván vẫn tiếp tục
    // (nếu đối thủ thật sự mất kết nối, nhịp tim sẽ phát hiện và xử thua sau 15 giây)
    if (state === 'playing') return info(messages[err.type] || messages.network);
    // Chưa vào ván mà không nối được máy chủ trung gian (mạng yếu, hoặc máy chủ PeerJS miễn phí đang quá tải / tạm chặn)
    if (err.type === 'network' || err.type === 'socket-error' || err.type === 'socket-closed' || err.type === 'server-error') {
      return fail('Không kết nối được máy chủ trung gian (mạng yếu hoặc máy chủ đang quá tải). Hãy thử lại sau ít phút.');
    }
    fail(messages[err.type] || 'Lỗi kết nối: ' + err.type);
  }

  function fail(text, code) {
    const ct = search && search.contest ? search.contest.id : null;
    cleanup();
    setState('idle');
    info(text);
    if (hooks.fail) hooks.fail(code || 'error', ct);
  }

  // Host bắt đầu ván sau khi nhận lời chào của khách
  function startAsHost() {
    waitHello = false;
    const pref = search ? 'r' : $('hostColor').value; // tìm trận tự động: màu ngẫu nhiên
    const mine = pref === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : pref;
    const tcv = search ? search.tc : pickedTc();
    send({ t: 'start', color: opposite(mine), tc: tcv });
    begin(mine, tcv);
  }

  // Từ chối người vừa nối vào phòng chờ contest (sai contest hoặc chính mình ở tab khác), tiếp tục chờ
  function reject(c, why) {
    waitHello = false;
    try { c.send({ t: 'reject', why }); } catch {}
    conn = null;
    setTimeout(() => { try { c.close(); } catch {} }, 500);
  }

  // tcv: thời gian của ván; chơi lại (rematch) giữ nguyên thời gian ván trước
  function begin(myColor, tcv = tcValue) {
    if (search) { // vừa ghép trận tự động
      contestId = search.contest ? search.contest.id : null;
      stopSearch();
      // Người giữ phòng chờ nhả ID cho cặp sau; kết nối trận đấu đã mở thì không bị ảnh hưởng
      if (isHost && peer && !peer.disconnected) peer.disconnect();
    }
    const again = startedAt > 0; // chơi lại với cùng đối thủ (đã có ván trước trên kết nối này)
    color = myColor;
    result = null;
    offer = null;
    left = false;
    sentDraw = sentRematch = false;
    startedAt = Date.now();
    $('rematch').hidden = !!contestId; // ván contest: không chơi lại với cùng đối thủ, web tự ghép ván sau
    game.reset();
    startRatedGame();
    flipped = color === 'b';
    clearSelection();
    hint = null;
    info('');
    setState('playing');
    startHeartbeat();
    startClock(tcv);
    if (!oppKnown) askWho();
    else if (again) sendHello(conn, false); // chơi lại: gửi Elo / exp vừa đổi sau ván trước để đối thủ tính đúng
    chat(null, `Bắt đầu ván mới – bạn cầm quân ${COLOR_NAME[color]}.` + (contestId ? ' Ván này tính điểm Contest.' : ''));
    if (clk) chat(null, clk.inc ? `Đồng hồ: ${clk.base / 60000} phút mỗi bên, cộng ${clk.inc / 1000} giây mỗi nước.` : `Đồng hồ: ${clk.base / 60000} phút mỗi bên.`);
  }

  // ---- Đồng hồ ----
  // Mỗi bên tự đếm giờ cả hai phía. Người vừa đi gửi kèm giờ còn lại của mình; máy nhận chỉ chấp nhận nhiều hơn
  // ước tính của mình tối đa LAG_MS (bù độ trễ mạng, chặn việc sửa code để tự cộng giờ). Hết giờ: máy của người hết giờ
  // tự báo thua ('flag'); máy đó im lặng (bản cũ / bị sửa) thì quá FLAG_GRACE máy bên kia tự xử thắng ('timeout').
  // Đồng hồ Trắng chỉ chạy sau nước đầu của Trắng (như đấu với máy).

  function parseTc(v) {
    if (!ONLINE_TCS.includes(v) || v === 'none') return null;
    const [m, s] = v.split('+').map(Number);
    return { base: m * 1000, inc: (s || 0) * 1000 };
  }
  function pickedTc() {
    const v = Profile.prefs().onlineTc;
    return ONLINE_TCS.includes(v) ? v : '600+0';
  }

  function startClock(tcv) {
    stopClockTimer();
    const t = parseTc(tcv);
    tcValue = t ? tcv : 'none';
    clk = t ? { ...t, w: t.base, b: t.base, turn: 'w', at: 0 } : null;
    if (clk) clkTimer = setInterval(clockTick, 100);
    renderClocks();
  }
  function stopClockTimer() { clearInterval(clkTimer); clkTimer = null; }

  // Giờ còn lại thô (có thể âm khi đã quá giờ)
  const rawLeft = c => clk[c] - (clk.at && clk.turn === c ? Date.now() - clk.at : 0);
  function freezeClock() {
    if (!clk || !clk.at) return;
    clk[clk.turn] = Math.max(0, rawLeft(clk.turn));
    clk.at = 0;
  }
  const clockDone = () => !!result || game.isGameOver() || state !== 'playing';

  // Sau một nước (của mình hoặc đối thủ): chốt giờ người vừa đi, bắt đầu đếm giờ người kia
  function clockAfterMove(by, reported) {
    if (!clk) return;
    const now = Date.now();
    const running = !!clk.at && clk.turn === by;
    let left = running ? rawLeft(by) + clk.inc : clk[by]; // nước đầu của mỗi bên (đồng hồ chưa chạy): không cộng giờ
    if (by !== color && reported != null && Number.isFinite(Number(reported))) {
      left = Math.min(Number(reported), left + LAG_MS); // đối thủ tự báo: tin trong giới hạn bù trễ mạng
    }
    clk[by] = Math.max(0, left);
    clk.turn = opposite(by);
    clk.at = clockDone() ? 0 : now;
    renderClocks();
  }

  // Bên còn giờ chỉ còn Vua thì không thể chiếu hết: hết giờ xử hòa
  const onlyKingLeft = c => game.board.every(p => !p || p[0] !== c || p[1] === 'K');

  function flagResult(loser) {
    freezeClock();
    clk[loser] = 0;
    const draw = onlyKingLeft(opposite(loser));
    const mine = loser === color;
    result = draw
      ? { text: mine ? 'Bạn hết giờ nhưng đối thủ không đủ quân chiếu hết – Hòa' : 'Đối thủ hết giờ nhưng bạn không đủ quân chiếu hết – Hòa', reason: 'Hết giờ, bên còn giờ không đủ quân chiếu hết', score: 0.5 }
      : mine
        ? { text: 'Bạn hết giờ – Bạn thua', reason: 'Hết giờ', score: 0 }
        : { text: 'Đối thủ hết giờ – Bạn thắng', reason: 'Đối thủ hết giờ', score: 1 };
    chat(null, mine ? 'Bạn đã hết giờ.' : 'Đối thủ đã hết giờ.');
    render();
  }

  function clockTick() {
    if (!clk || state !== 'playing') return stopClockTimer();
    if (clockDone()) { freezeClock(); stopClockTimer(); return renderClocks(); }
    if (clk.at) {
      if (clk.turn === color && rawLeft(color) <= 0) {
        send({ t: 'flag' });            // tự báo mình hết giờ
        return flagResult(color);
      }
      if (clk.turn !== color && rawLeft(clk.turn) <= -FLAG_GRACE) {
        send({ t: 'timeout' });         // máy đối thủ không tự báo: xử thắng
        return flagResult(clk.turn);
      }
    }
    renderClocks();
  }

  // Cho app.js vẽ đồng hồ: null nếu ván không có đồng hồ
  function clockView() {
    if (!clk || state !== 'playing') return null;
    if (clk.at && clockDone()) freezeClock();
    return {
      left: c => Math.max(0, rawLeft(c)),
      running: c => !!clk.at && clk.turn === c,
    };
  }

  function send(msg) { if (conn && conn.open) conn.send(msg); }

  function onData(d) {
    if (!d || typeof d !== 'object') return;
    switch (d.t) {
      case 'hello': {
        const name = String(d.name || '').replace(/\s+/g, ' ').trim().slice(0, 20);
        const exp = Number(d.exp), elo = Number(d.elo);
        opp = {
          name: name.length >= 2 ? name : 'Đối thủ',
          exp: exp >= 0 && exp <= 100000 ? Math.floor(exp) : 0,
          elo: elo >= 100 && elo <= 3500 ? Math.floor(elo) : 800,
          photo: Profile.validPhoto(d.photo) ? d.photo : (opp.name === name ? opp.photo : ''), // bản cũ gửi ảnh chung trong lời chào
          title: (Profile.TITLES || []).includes(String(d.title || '').toUpperCase()) ? String(d.title).toUpperCase() : '',
          uid: typeof d.uid === 'string' ? d.uid.slice(0, 64) : '',
        };
        const ct = search && search.contest ? search.contest.id : null;
        oppHb = d.hb === 1;
        oppKnown = true;
        verifyOpp();
        const self = name.toLowerCase() === Profile.me().name.toLowerCase();
        if (ct && self) { // tự ghép với chính mình ở tab / máy khác
          if (isHost) return reject(conn, 'self');
          try { conn.send({ t: 'reject', why: 'self' }); } catch {}
          return fail('Bạn đang thi đấu contest này ở một tab hoặc máy khác, nên tab này dừng tự ghép cặp.', 'self');
        }
        if (isHost && waitHello && state !== 'playing') {
          if (ct && d.contest !== ct) return reject(conn, 'contest');
          startAsHost();
        }
        render();
        break;
      }
      case 'ping':
        break;
      case 'photo':
        if (Profile.validPhoto(d.photo)) { opp.photo = d.photo; render(); }
        break;
      case 'who': // đối thủ chưa nhận được lời chào của mình: gửi lại
        sendHello();
        break;
      case 'bye': // đối thủ đóng tab / rời trang
        markGone('Đối thủ đã thoát khỏi trang.');
        break;
      case 'forfeit': // đối thủ báo mình đã vắng quá 15 giây
        if (state !== 'playing' || result || game.isGameOver()) return;
        result = { text: 'Bạn mất kết nối quá 15 giây – xử thua', reason: 'Mất kết nối quá 15 giây', score: 0 };
        chat(null, 'Bạn đã vắng mặt quá 15 giây nên bị xử thua.');
        render();
        break;
      case 'reject':
        if (!search) return fail('Phòng từ chối kết nối.');
        if (d.why === 'self') return fail('Bạn đang thi đấu contest này ở một tab hoặc máy khác, nên tab này dừng tự ghép cặp.', 'self');
        retrySearch(search);
        break;
      case 'start': // giữa ván không nhận lệnh bắt đầu lại (gói tin lạc / đối thủ sửa code)
        if (!isHost && state !== 'playing' && (d.color === 'w' || d.color === 'b')) begin(d.color, ONLINE_TCS.includes(d.tc) ? d.tc : 'none');
        break;
      case 'move': {
        if (state !== 'playing' || game.turn === color || result || game.isGameOver()) return;
        const m = game.move({ from: d.from, to: d.to, promotion: d.promotion || undefined });
        if (!m) chat(null, 'Nhận được nước đi không hợp lệ từ đối thủ.');
        else clockAfterMove(opposite(color), d.left);
        offer = offer === 'draw' ? null : offer; // đối thủ đi tiếp coi như rút lời xin hòa
        sentDraw = false;                        // và coi như từ chối lời xin hòa của mình
        renderOffer();
        render();
        break;
      }
      case 'flag': // đối thủ báo họ đã hết giờ
        if (!clk || state !== 'playing' || result || game.isGameOver()) return;
        flagResult(opposite(color));
        break;
      case 'timeout': // đối thủ thấy mình đã quá giờ (máy mình bị treo / chậm báo)
        if (!clk || state !== 'playing' || result || game.isGameOver() || clk.turn !== color) return;
        if (rawLeft(color) > 5000) return; // đồng hồ của mình còn hẳn vài giây (chênh quá độ trễ mạng): bỏ qua
        flagResult(color);
        break;
      case 'resign':
        if (state !== 'playing' || result || game.isGameOver()) return;
        result = { text: 'Đối thủ xin thua – Bạn thắng', reason: 'Đối thủ xin thua', score: 1 };
        chat(null, 'Đối thủ đã xin thua.');
        render();
        break;
      case 'draw-offer':
        if (result || game.isGameOver()) return;
        offer = 'draw';
        renderOffer();
        break;
      case 'draw-accept':
        if (!sentDraw || result || game.isGameOver()) return; // chỉ nhận khi mình đã xin hòa
        sentDraw = false;
        result = { text: 'Hòa – hai bên đồng ý', reason: 'Hai bên đồng ý hòa', score: 0.5 };
        render();
        break;
      case 'draw-decline':
        sentDraw = false;
        chat(null, 'Đối thủ từ chối hòa.');
        break;
      case 'rematch': // chỉ nhận lời mời khi ván hiện tại đã xong (tránh huỷ ván đang đánh mà không ai bị tính)
        if (contestId || !outcome()) return send({ t: 'rematch-decline' });
        offer = 'rematch';
        renderOffer();
        break;
      case 'rematch-ok':
        if (!sentRematch || contestId) return; // chỉ nhận khi mình đã mời
        begin(opposite(color));
        break;
      case 'rematch-decline':
        sentRematch = false;
        chat(null, contestId ? 'Ván contest không chơi lại được, web sẽ tự ghép ván tiếp theo.' : 'Đối thủ chưa muốn chơi ván mới.');
        break;
      case 'chat':
        chat(opp.name, String(d.text || '').slice(0, 200));
        break;
      case 'full':
        if (search) retrySearch(search); // phòng chờ đang bận ghép người khác: thử lại
        else fail('Phòng này đã đủ 2 người.');
        break;
    }
  }

  function onClose() {
    if (state === 'playing') {
      left = true;
      offer = null;
      renderOffer();
      markGone('Đối thủ đã rời phòng.');
    } else if (state === 'searching') {
      if (isHost) conn = null; // người vừa nối vào bỏ đi trước khi ván bắt đầu: tiếp tục chờ
      else retrySearch(search);
    } else if (state !== 'idle') {
      fail('Kết nối bị đóng.');
    }
  }

  // ---- Nhịp tim & xử thua khi vắng mặt ----

  function seen() {
    lastSeen = Date.now();
    if (goneAt && !left && state === 'playing') { // đối thủ kết nối lại kịp trước 15 giây
      goneAt = 0;
      if (!result) chat(null, 'Đối thủ đã kết nối lại.');
      renderStatus();
    }
  }

  // Đối thủ thoát / mất kết nối: bắt đầu đếm 15 giây tính từ lần cuối còn thấy họ
  function markGone(msg) {
    if (state !== 'playing' || goneAt) return;
    goneAt = lastSeen || Date.now();
    if (!result && !game.isGameOver()) chat(null, `${msg} Nếu không quay lại trong ${Math.ceil((FORFEIT_MS - (Date.now() - goneAt)) / 1000)} giây, đối thủ sẽ bị xử thua.`);
    else chat(null, msg);
    render();
  }

  function startHeartbeat() {
    stopHeartbeat();
    lastSeen = hbTick = Date.now();
    goneAt = 0;
    hbTimer = setInterval(heartbeat, 1000);
  }
  function stopHeartbeat() { clearInterval(hbTimer); hbTimer = null; goneAt = 0; }

  function heartbeat() {
    const now = Date.now(), gap = now - hbTick;
    hbTick = now;
    if (state !== 'playing') return stopHeartbeat();
    const live = !result && !game.isGameOver();
    // Trang của MÌNH bị treo (điện thoại khoá màn hình, chuyển app…): không đổ lỗi cho đối thủ
    if (gap > 3000) {
      if (live && gap > FORFEIT_MS && game.history.length >= 2) {
        send({ t: 'resign' });
        result = { text: 'Bạn rời ván quá 15 giây – xử thua', reason: 'Rời ván quá 15 giây', score: 0 };
        chat(null, 'Bạn đã rời ván quá 15 giây nên bị xử thua.');
        render();
        return;
      }
      lastSeen = Math.max(lastSeen, now); // vắng ngắn: cho đối thủ thêm thời gian
      if (!left) goneAt = 0;
    }
    if (!left) send({ t: 'ping' });
    if (!live) return;
    if (!goneAt && oppHb && now - lastSeen > HB_SILENT) markGone('Đối thủ mất kết nối.');
    if (!goneAt) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { // mình mất mạng: không xử ai thắng
      goneAt = now; lastSeen = now;
      info('Bạn đang mất kết nối mạng…');
      return renderStatus();
    }
    if ($('onlineInfo').textContent === 'Bạn đang mất kết nối mạng…') info('');
    if (now - goneAt < FORFEIT_MS) return renderStatus();
    // Hết 15 giây
    if (game.history.length < 2) {
      left = true;
      goneAt = 0;
      chat(null, 'Ván bị huỷ vì đối thủ thoát trước khi ván bắt đầu.');
      return render();
    } else {
      result = { text: 'Đối thủ thoát quá 15 giây – Bạn thắng', reason: 'Đối thủ thoát quá 15 giây', score: 1 };
      send({ t: 'forfeit' }); // nếu họ còn kết nối được thì họ cũng thấy mình bị xử thua
      chat(null, 'Đối thủ vắng mặt quá 15 giây nên bị xử thua.');
    }
    left = true;
    render();
  }

  // Đóng tab / rời trang giữa ván: báo đối thủ và ghi nhớ để trừ điểm ở lần mở web sau
  function onPageHide() {
    if (!inGame()) return;
    send({ t: 'bye' });
    if (game.history.length < 2) return;
    try {
      const ct = contestId && typeof contestById !== 'undefined' ? contestById.get(contestId) : null;
      localStorage.setItem(PENDING_KEY, JSON.stringify({
        uid: Profile.uid(), oppElo: opp.elo, opp: opp.name, at: Date.now(), startedAt,
        contest: ct ? { id: ct.id, name: ct.name, start: ct.start, end: ct.end } : null,
      }));
    } catch {}
  }
  window.addEventListener('pagehide', onPageHide);
  // Trang được khôi phục từ bộ nhớ đệm (bấm Back): ván vẫn tiếp tục nên huỷ án phạt
  window.addEventListener('pageshow', e => { if (e.persisted && inGame()) try { localStorage.removeItem(PENDING_KEY); } catch {} });

  // Lần mở web sau: ván bỏ dở lần trước bị tính thua
  function takePendingForfeit() {
    let p = null;
    try { p = JSON.parse(localStorage.getItem(PENDING_KEY)); } catch {}
    if (!p) return null;
    if (p.uid !== Profile.uid()) return null; // của tài khoản khác: giữ lại tới khi tài khoản đó đăng nhập
    try { localStorage.removeItem(PENDING_KEY); } catch {}
    return Date.now() - p.at > 7 * 86400000 ? null : p;
  }

  function killPeer() {
    const c = conn, p = peer;
    conn = peer = null; // gỡ trước để sự kiện đóng của kết nối cũ bị bỏ qua
    if (c) try { c.close(); } catch {}
    if (p) try { p.destroy(); } catch {}
  }

  function cleanup() {
    stopSearch();
    stopHeartbeat();
    clearTimeout(whoTimer);
    oppHb = oppKnown = false;
    stopClockTimer();
    clk = null;
    tcValue = 'none';
    killPeer();
    contestId = null;
    color = result = offer = null;
    left = waitHello = sentDraw = sentRematch = false;
    startedAt = 0;
    $('rematch').hidden = false;
    opp = { name: 'Đối thủ', exp: 0, elo: 800, photo: '', uid: '', title: '' };
    verified = { uid: '', title: '' };
  }

  // ---- Tìm trận tự động ----

  function stopSearch() {
    if (!search) return;
    clearTimeout(search.timer);
    clearTimeout(search.guard);
    clearTimeout(search.expire);
    clearInterval(search.tick);
    search = null;
  }

  // contest: null (tìm trận thường) hoặc { id, end } (tìm trận trong contest: tìm liên tục tới hết giờ contest)
  async function findMatch(contest = null) {
    if (state !== 'idle') return false;
    if (contest && Date.now() >= contest.end) { info('Contest đã kết thúc.'); return false; }
    info('');
    const now = Date.now();
    const tc = contest ? CONTEST_TC : pickedTc();
    const s = search = {
      lobby: PREFIX + (contest ? 'ct-' + contest.id : tc === 'none' ? 'mm-main' : 'mm-' + tc.replace('+', '-')),
      contest, tc, started: now, until: contest ? contest.end : now + SEARCH_LIMIT,
    };
    isHost = false;
    setState('searching');
    $('searchLabel').textContent = contest ? 'Đang tự ghép cặp contest…' : `Đang tìm đối thủ · ${TC_TEXT[tc]}…`;
    $('searchTime').textContent = '0:00';
    s.tick = setInterval(() => {
      const t = Math.floor((Date.now() - s.started) / 1000);
      $('searchTime').textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
    }, 1000);
    s.expire = setTimeout(() => {
      if (search !== s) return;
      if (contest) fail('Contest đã kết thúc.', 'ended');
      else fail('Chưa tìm được đối thủ. Hãy thử lại sau ít phút hoặc rủ bạn bè cùng bấm Tìm trận.', 'timeout');
    }, Math.max(0, s.until - now));
    try { await loadLib(); } catch { if (search === s) fail('Không tải được thư viện kết nối. Kiểm tra mạng Internet.'); return true; }
    searchRound(s);
    return true;
  }

  // Mỗi vòng: thử giành phòng chờ; nếu đã có người giữ thì nối vào họ
  function searchRound(s) {
    if (search !== s) return;
    killPeer();
    isHost = true;
    const p = peer = new Peer(s.lobby);
    p.on('connection', c => {
      if (peer !== p || search !== s) return;
      if (conn) { // đã có người nối vào trước, người này tìm vòng sau
        c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 500); });
        return;
      }
      attach(c);
    });
    p.on('error', err => {
      if (peer !== p || search !== s) return;
      if (err.type === 'unavailable-id') return joinLobby(s); // đã có người chờ: nối vào họ
      onPeerError(err);
    });
  }

  function joinLobby(s) {
    killPeer();
    isHost = false;
    const p = peer = new Peer();
    p.on('open', () => {
      if (peer !== p || search !== s) return;
      attach(p.connect(s.lobby, { reliable: true }));
      // Không được phản hồi (người chờ đã đóng tab...) thì thử lại
      s.guard = setTimeout(() => { if (search === s && peer === p) retrySearch(s); }, 7000);
    });
    p.on('error', err => {
      if (peer !== p || search !== s) return;
      if (err.type === 'peer-unavailable') return retrySearch(s); // người chờ vừa rời
      onPeerError(err);
    });
  }

  function retrySearch(s) {
    if (!s || search !== s) return;
    clearTimeout(s.guard);
    killPeer();
    s.timer = setTimeout(() => searchRound(s), 600 + Math.random() * 1400);
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
      p.className = who === 'Bạn' ? 'me' : 'opp';
      const b = document.createElement('b');
      b.textContent = who;
      p.appendChild(b);
      const t = document.createElement('span');
      t.textContent = text;
      p.appendChild(t);
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
      return;
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
      if (contestId) yes = false;
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

  function sendMove(m) {
    clockAfterMove(color);
    send({ t: 'move', from: m.from, to: m.to, promotion: m.promotion || null, left: clk ? Math.round(clk[color]) : undefined });
  }

  function status() {
    if (state === 'idle') return { text: 'Sẵn sàng đấu Online' };
    if (state === 'connecting') return { text: 'Đang kết nối…', cls: 'thinking' };
    if (state === 'searching') return { text: search && search.contest ? 'Đang tự ghép cặp contest…' : 'Đang tìm đối thủ…', cls: 'thinking' };
    if (state === 'waiting') return { text: 'Đang chờ đối thủ vào phòng…', cls: 'thinking' };
    if (result) return { text: result.text, cls: 'over' };
    const s = game.status();
    if (s === 'checkmate') return { text: game.turn === color ? 'Chiếu hết – Bạn thua' : 'Chiếu hết – Bạn thắng', cls: 'over' };
    if (s !== 'playing') return null; // các kiểu hòa: dùng thông báo chung
    if (goneAt && !result) {
      const sec = Math.max(0, Math.ceil((FORFEIT_MS - (Date.now() - goneAt)) / 1000));
      return { text: game.history.length < 2 ? `Đối thủ mất kết nối · huỷ ván sau ${sec} giây` : `Đối thủ mất kết nối · xử thắng sau ${sec} giây`, cls: 'in-check' };
    }
    if (left) return { text: 'Đối thủ đã rời phòng', cls: 'in-check' };
    const check = game.inCheck() ? ' – đang bị chiếu!' : '';
    return game.turn === color
      ? { text: 'Lượt của bạn' + check, cls: check ? 'in-check' : '' }
      : { text: 'Chờ đối thủ đi…' + check, cls: 'thinking' };
  }

  function player(c) {
    if (!color) return { name: 'Người chơi ' + COLOR_NAME[c], rank: null, pieceAv: true };
    if (c === color) { const me = Profile.me(); return { name: me.name, rank: Profile.rankOf(me.exp), elo: me.elo, photo: me.photo, me: true, title: me.title || '' }; }
    return { name: opp.name, rank: Profile.rankOf(opp.exp), elo: opp.elo, photo: opp.photo, title: opp.title || '' };
  }

  // Kết quả ván để tính Elo: { score, reason } hoặc null nếu ván chưa xong
  function outcome() {
    if (state !== 'playing' || !color) return null;
    const base = {};
    if (result) return { ...base, score: result.score, reason: result.reason };
    const s = game.status();
    if (s === 'checkmate') return { ...base, score: game.turn === color ? 0 : 1, reason: 'Chiếu hết' };
    if (s !== 'playing') return { ...base, score: 0.5, reason: null };
    return null;
  }

  // Đang trong 15 giây chờ đối thủ mất kết nối quay lại thì không coi là "đang đấu" (rời phòng lúc đó không bị tính thua)
  function inGame() { return state === 'playing' && !left && !goneAt && !result && !game.isGameOver(); }

  // ---- Nút bấm ----

  $('findMatch').addEventListener('click', () => findMatch());
  $('cancelSearch').addEventListener('click', leave);
  $('createRoom').addEventListener('click', create);
  $('joinRoom').addEventListener('click', () => join($('roomCode').value));
  $('roomCode').addEventListener('keydown', e => { if (e.key === 'Enter') join($('roomCode').value); });
  $('cancelRoom').addEventListener('click', leave);
  $('leaveRoom').addEventListener('click', () => {
    if (inGame() && game.history.length >= 2 && !confirm('Rời phòng giữa ván sẽ bị tính thua. Tiếp tục?')) return;
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
    sentDraw = true;
    send({ t: 'draw-offer' });
    chat(null, 'Đã gửi lời xin hòa.');
  });
  $('rematch').addEventListener('click', () => {
    if (left || contestId || state !== 'playing') return;
    if (!outcome()) { chat(null, 'Chỉ mời được ván mới khi ván hiện tại đã kết thúc.'); return; }
    sentRematch = true;
    send({ t: 'rematch' });
    chat(null, 'Đã gửi lời mời chơi ván mới.');
  });
  $('offerYes').addEventListener('click', () => answerOffer(true));
  $('offerNo').addEventListener('click', () => answerOffer(false));
  $('chatForm').addEventListener('submit', async e => {
    e.preventDefault();
    const text = $('chatInput').value.trim();
    if (!text || left) return;
    // Admin đã mute → không gửi được chat
    try {
      if (await Profile.isMuted()) {
        chat(null, 'Bạn đã bị admin tắt chat (mute). Không gửi được tin nhắn.');
        $('chatInput').value = '';
        return;
      }
    } catch {}
    send({ t: 'chat', text: text.slice(0, 200) });
    chat('Bạn', text.slice(0, 200));
    $('chatInput').value = '';
  });

  // Nút mute đối thủ (chỉ hiện với admin khi đang chơi) + khoá ô chat nếu bị mute
  async function refreshMuteBtn() {
    const btn = $('muteOpp');
    if (btn) {
      const show = state === 'playing' && !left && Profile.isAdmin() && opp.name && opp.name !== 'Đối thủ';
      btn.hidden = !show;
      if (!show) {
        delete btn.dataset.done;
        btn.disabled = false;
        btn.textContent = 'Mute chat đối thủ';
      } else if (!btn.dataset.done) {
        btn.disabled = false;
        btn.textContent = 'Mute chat đối thủ';
      }
    }
    const input = $('chatInput');
    const form = $('chatForm');
    if (input && state === 'playing') {
      try {
        const muted = await Profile.isMuted();
        input.disabled = muted;
        input.placeholder = muted ? 'Bạn đã bị admin tắt chat…' : 'Nhắn tin cho đối thủ…';
        if (form) form.classList.toggle('chat-input-muted', muted);
      } catch {
        input.disabled = false;
      }
    } else if (input) {
      input.disabled = false;
      input.placeholder = 'Nhắn tin cho đối thủ…';
      if (form) form.classList.remove('chat-input-muted');
    }
  }

  const muteOppBtn = $('muteOpp');
  if (muteOppBtn) muteOppBtn.addEventListener('click', async () => {
    if (!Profile.isAdmin() || !opp.name) return;
    const reason = prompt(`Mute chat của ${opp.name}?\n(Tuỳ chọn) Lý do:`, 'Nói tục / spam trong chat');
    if (reason === null) return;
    const btn = $('muteOpp');
    btn.disabled = true;
    try {
      if (opp.uid) await Profile.setMute(opp.uid, true, reason || undefined);
      else await Profile.setMuteByName(opp.name, true, reason || undefined);
      chat(null, `Admin đã mute chat của ${opp.name}.`);
      btn.textContent = 'Đã mute';
      btn.dataset.done = '1';
    } catch (err) {
      chat(null, err.message === 'NOTFOUND'
        ? 'Không tìm thấy tài khoản đối thủ để mute.'
        : err.message === 'DENIED'
        ? 'Chỉ admin mới mute được. Cần luật Firebase có mục "mutes".'
        : 'Không mute được, thử lại sau.');
      btn.disabled = false;
    }
  });

  return {
    join, leave, canMove, sendMove, status, player, outcome, inGame, findMatch,
    clock: clockView, TCS: ONLINE_TCS, pickedTc,
    idle: () => state === 'idle',
    searching: () => state === 'searching',
    searchContest: () => (search && search.contest ? search.contest.id : null),
    contest: () => contestId,
    startedAt: () => startedAt,
    onFail: f => { hooks.fail = f; },
    oppElo: () => opp.elo,
    rematch: () => $('rematch').click(),
    // Còn "kết nối" cả trong 15 giây chờ đối thủ quay lại (để contest không vội ghép ván mới)
    connected: () => state === 'playing' && (!left || (!!goneAt && !result && !game.isGameOver())),
    takePendingForfeit,
    refreshMuteBtn,
  };
})();
