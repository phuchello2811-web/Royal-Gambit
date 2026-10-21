// Câu đố chiến thuật. Mọi câu đã được kiểm chứng bằng bộ giải trong lessons.js:
//   • mate: n  → chiếu hết đúng trong n nước (không có cách ngắn hơn). Nhận mọi nước dẫn tới chiếu hết đúng hạn,
//                máy tự đáp trả bằng nước chống cự dai nhất.
//   • line: [...] → chuỗi nước bắt buộc (nước của mình và nước đáp của máy xen kẽ), "a|b" = chấp nhận nhiều đáp án.
// Tiến độ (câu đã giải, câu đố hôm nay, chuỗi ngày) lưu trong trình duyệt theo từng tài khoản.

const PUZZLES = [
  { id: 'backrank', title: 'Chiếu hết hàng cuối', level: 'Dễ', theme: 'Hàng cuối', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', mate: 1, hint: 'Vua Đen bị chính các tốt nhà nhốt ở hàng 8.' },
  { id: 'black-backrank', title: 'Đen phản đòn hàng cuối', level: 'Dễ', theme: 'Hàng cuối', fen: 'r5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', mate: 1, hint: 'Vua Trắng cũng bị tốt nhà nhốt y hệt.' },
  { id: 'scholar', title: 'Hậu vào f7', level: 'Dễ', theme: 'Chiếu hết 1 nước', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', mate: 1, hint: 'Ô f7 chỉ có Vua bảo vệ, còn Tượng c4 đang nhắm vào đó.' },
  { id: 'fools', title: 'Thế cờ "ngốc" nhất', level: 'Dễ', theme: 'Chiếu hết 1 nước', fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2', mate: 1, hint: 'Đường chéo e1–h4 đã mở toang.' },
  { id: 'smothered', title: 'Chiếu hết nghẹt', level: 'Dễ', theme: 'Mã', fen: '6rk/6pp/8/6N1/8/8/8/7K w - - 0 1', mate: 1, hint: 'Vua Đen bị chính quân nhà vây kín, chỉ Mã mới chiếu tới được.' },
  { id: 'arabian', title: 'Thế chiếu hết Ả Rập', level: 'Dễ', theme: 'Xe và Mã', fen: '7k/8/5N2/8/8/8/8/6RK w - - 0 1', mate: 1, hint: 'Mã f6 khống chế g8 và h7.' },
  { id: 'anastasia', title: 'Thế chiếu hết Anastasia', level: 'Trung bình', theme: 'Xe và Mã', fen: 'r4r2/4Nppk/8/8/8/4R3/6PP/6K1 w - - 0 1', mate: 1, hint: 'Mã e7 chặn đường thoát của Vua, Xe chỉ cần lên cột h.' },
  { id: 'damiano', title: 'Thế chiếu hết Damiano', level: 'Dễ', theme: 'Hậu và Tốt', fen: '5rk1/5p2/6P1/7Q/8/8/8/6K1 w - - 0 1', mate: 1, hint: 'Tốt g6 bảo vệ một ô sát Vua Đen.' },
  { id: 'epaulette', title: 'Thế chiếu hết "cầu vai"', level: 'Trung bình', theme: 'Hậu', fen: '3rkr2/8/8/8/8/1Q6/8/4K3 w - - 0 1', mate: 1, hint: 'Hai Xe hai bên chặn mất đường lui của Vua.' },
  { id: 'battery', title: 'Hậu–Tượng cùng hàng', level: 'Dễ', theme: 'Hậu và Tượng', fen: '5rk1/5ppp/8/8/8/3Q4/8/1B4K1 w - - 0 1', mate: 1, hint: 'Tượng b1 đứng sau Hậu trên cùng một đường chéo.' },
  { id: 'queen-king', title: 'Hậu và Vua phối hợp', level: 'Dễ', theme: 'Tàn cuộc', fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', mate: 1, hint: 'Vua g6 khống chế g7 và h7.' },
  { id: 'ladder', title: 'Xe bậc thang', level: 'Trung bình', theme: 'Chiếu hết 2 nước', fen: '6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1', mate: 2, hint: 'Một Xe cắt hàng 7, Xe kia chiếu ở hàng 8.' },
  { id: 'philidor', title: 'Hy sinh Hậu – chiếu hết nghẹt', level: 'Khó', theme: 'Chiếu hết 2 nước', fen: '4r2k/6pp/7N/8/2Q5/8/8/6K1 w - - 0 1', mate: 2, hint: 'Ép Xe Đen tự lấp ô g8, rồi Mã ra đòn.' },
  { id: 'rook-king', title: 'Xe và Vua dồn góc', level: 'Trung bình', theme: 'Chiếu hết 2 nước', fen: '7k/8/5K2/8/8/8/8/R7 w - - 0 1', mate: 2, hint: 'Đừng chiếu vội: hãy lấy thêm một ô của Vua Đen trước.' },
  { id: 'king-rook-corner', title: 'Nhường một nhịp', level: 'Trung bình', theme: 'Chiếu hết 2 nước', fen: 'k7/8/2K5/8/8/8/8/7R w - - 0 1', mate: 2, hint: 'Đưa Vua lại gần để khoá các ô thoát trước khi chiếu.' },
  { id: 'queen-knight-h7', title: 'Hậu và Mã đánh h7', level: 'Dễ', theme: 'Hậu và Mã', fen: '5rk1/5ppp/8/6N1/8/8/7Q/6RK w - - 0 1', mate: 1, hint: 'Mã g5 đang yểm trợ ô h7.' },
  { id: 'fork-royal', title: 'Mã chĩa Vua và Xe', level: 'Dễ', theme: 'Chĩa đôi', fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', line: ['Nc7+', 'Kd7', 'Nxa8'], hint: 'Tìm ô Mã vừa chiếu Vua vừa đánh Xe.' },
  { id: 'fork-queen', title: 'Mã chĩa Vua và Hậu', level: 'Dễ', theme: 'Chĩa đôi', fen: '2q3k1/8/8/3N4/8/8/8/6K1 w - - 0 1', line: ['Ne7+', 'Kf7', 'Nxc8'], hint: 'Ô e7 nằm đúng tầm Mã tới cả g8 lẫn c8.' },
  { id: 'skewer', title: 'Xiên Vua – lấy Hậu', level: 'Trung bình', theme: 'Xiên', fen: 'q7/8/8/3k4/8/8/8/2K2B2 w - - 0 1', line: ['Bg2+', 'Kc5', 'Bxa8'], hint: 'Vua và Hậu Đen đứng cùng một đường chéo dài.' },
  { id: 'pin', title: 'Ghim Hậu vào Vua', level: 'Trung bình', theme: 'Ghim', fen: '4k3/8/8/4q3/8/8/8/R4K2 w - - 0 1', line: ['Re1', 'Qxe1+', 'Kxe1'], hint: 'Đặt Xe lên cột e: Hậu không được rời khỏi đó.' },
  { id: 'discovered', title: 'Chiếu mở bắt Hậu', level: 'Trung bình', theme: 'Chiếu mở', fen: '3qk3/8/8/4N3/8/8/8/4R1K1 w - - 0 1', line: ['Nc6+', 'Kd7', 'Nxd8'], hint: 'Mã rời cột e để Xe chiếu, đồng thời Mã tấn công Hậu.' },
  { id: 'underpromote', title: 'Phong Mã chĩa đôi', level: 'Khó', theme: 'Phong cấp', fen: '8/4P1k1/3q4/8/8/8/8/K7 w - - 0 1', line: ['e8=N+', 'Kf7', 'Nxd6+'], hint: 'Phong Hậu chưa chắc là hay nhất: quân nào vừa chiếu Vua g7 vừa đánh Hậu d6?' },
  { id: 'pawn-fork', title: 'Tốt chĩa đôi', level: 'Dễ', theme: 'Chĩa đôi', fen: 'r3k3/8/2n1b3/8/3P4/8/8/4K3 w - - 0 1', line: ['d5', 'Bf5', 'dxc6'], hint: 'Một bước Tốt đánh cùng lúc hai quân nhẹ.' },
];

// Bản tiếng Anh (dùng khi chọn English, xem i18n.js): id → [tên, gợi ý]
const PUZZLES_EN = {
  'backrank': ['Back-rank mate', 'The black king is trapped on the 8th rank by its own pawns.'],
  'black-backrank': ['Black strikes back on the back rank', 'The white king is trapped by its own pawns in exactly the same way.'],
  'scholar': ['Queen to f7', 'Only the king defends f7, and the c4 bishop is aiming at it.'],
  'fools': ['The "Fool\'s" position', 'The e1–h4 diagonal is wide open.'],
  'smothered': ['Smothered mate', 'The black king is boxed in by its own pieces; only a knight can reach it.'],
  'arabian': ['Arabian mate', 'The f6 knight covers g8 and h7.'],
  'anastasia': ['Anastasia\'s mate', 'The e7 knight cuts off the king\'s escape; the rook just needs the h-file.'],
  'damiano': ['Damiano\'s mate', 'The g6 pawn guards a square next to the black king.'],
  'epaulette': ['Epaulette mate', 'The two rooks on either side take away the king\'s retreat.'],
  'battery': ['Queen–bishop battery', 'The b1 bishop stands behind the queen on the same diagonal.'],
  'queen-king': ['Queen and king together', 'The g6 king controls g7 and h7.'],
  'ladder': ['Rook ladder', 'One rook cuts off the 7th rank, the other gives check on the 8th.'],
  'philidor': ['Queen sacrifice – smothered mate', 'Force the black rook to block g8, then the knight strikes.'],
  'rook-king': ['Rook and king to the corner', 'Don\'t check yet: take another square from the black king first.'],
  'king-rook-corner': ['Waste a tempo', 'Bring the king closer to cover the escape squares before checking.'],
  'queen-knight-h7': ['Queen and knight hit h7', 'The g5 knight supports h7.'],
  'fork-royal': ['Knight forks king and rook', 'Find the square where the knight checks the king and attacks the rook.'],
  'fork-queen': ['Knight forks king and queen', 'e7 is a knight\'s jump from both g8 and c8.'],
  'skewer': ['Skewer the king, win the queen', 'The black king and queen stand on the same long diagonal.'],
  'pin': ['Pin the queen to the king', 'Put the rook on the e-file: the queen can\'t leave it.'],
  'discovered': ['Discovered check wins the queen', 'The knight leaves the e-file so the rook gives check, and the knight hits the queen.'],
  'underpromote': ['Promote to a knight with a fork', 'A queen is not always best: which piece checks the g7 king and attacks the d6 queen?'],
  'pawn-fork': ['Pawn fork', 'One pawn step attacks two minor pieces at once.'],
};
for (const p of PUZZLES) { const e = PUZZLES_EN[p.id]; if (e) p.en = { title: e[0], hint: e[1] }; }

const Puzzles = (() => {
  const strip = s => String(s || '').replace(/[+#?!]/g, '');
  const pad = n => String(n).padStart(2, '0');
  const p2 = pad;
  const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const storeKey = () => 'rg-puzzles:' + (typeof Profile !== 'undefined' && Profile.signedIn() ? Profile.me().name.toLowerCase() : 'guest');
  const load = () => { try { return { solved: {}, daily: { last: '', streak: 0 }, ...JSON.parse(localStorage.getItem(storeKey())) }; } catch { return { solved: {}, daily: { last: '', streak: 0 } }; } };
  const save = s => { try { localStorage.setItem(storeKey(), JSON.stringify(s)); } catch {} };

  let current = null;
  let step = 0;       // số nước của mình đã đi đúng
  let ply = 0;        // vị trí trong line
  let active = false;
  let mistakes = 0, helped = false;
  let filter = 'all';

  // Câu đố hôm nay: đổi mỗi ngày, mọi người cùng một câu
  function daily() {
    const d = new Date();
    const n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    return PUZZLES[(n * 7) % PUZZLES.length];
  }
  function dailyStreak(s = load()) {
    const y = dayKey(Date.now() - 86400000);
    return s.daily.last === dayKey() || s.daily.last === y ? s.daily.streak : 0;
  }

  const sideOf = p => (p.fen.split(/\s+/)[1] || 'w');
  const movesOf = p => p.mate || Math.ceil(p.line.length / 2);
  const groupOf = p => p.mate === 1 ? 'm1' : p.mate ? 'm2' : 'tac';
  const GROUPS = [
    ['m1', 'Chiếu hết 1 nước', 'i-crown', 'Tìm nước chiếu hết ngay lập tức'],
    ['m2', 'Chiếu hết 2 nước', 'i-target', 'Một nước chuẩn bị, máy đáp trả, rồi chiếu hết'],
    ['tac', 'Đòn chiến thuật', 'i-bolt', 'Chĩa đôi, ghim, xiên, chiếu mở, phong cấp'],
  ];
  const LV = { 'Dễ': 1, 'Trung bình': 2, 'Khó': 3 };
  const board = p => (typeof Library !== 'undefined' && Library.fenBoard ? Library.fenBoard(p.fen, sideOf(p) === 'b') : '');
  const sideTag = p => `<span class="pz-side ${sideOf(p)}"></span>${sideOf(p) === 'w' ? 'Trắng' : 'Đen'} đi`;

  function open() {
    renderList();
    openModal('puzzleModal');
  }

  // Vòng tiến độ (SVG)
  function ring(done, total) {
    const r = 30, c = 2 * Math.PI * r, f = total ? done / total : 0;
    return `<svg class="pz-ring" viewBox="0 0 76 76" aria-hidden="true">
      <circle cx="38" cy="38" r="${r}" class="track"/>
      <circle cx="38" cy="38" r="${r}" class="fill" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 38 38)"/>
    </svg>`;
  }

  function card(p, s) {
    const done = s.solved[p.id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pz-card' + (done ? ' solved' : '');
    btn.innerHTML = `
      <span class="pz-thumb">
        <span class="pz-board lib-card-board lib-frame">${board(p)}</span>
        <span class="pz-lv lv-${LV[p.level] || 2}">${p.level}</span>
        ${done ? `<span class="pz-check" title="${done.clean ? 'Giải hoàn hảo' : 'Đã giải'}">${done.clean ? '★' : '✓'}</span>` : ''}
        <span class="pz-play"><svg class="ic"><use href="#i-play"/></svg></span>
      </span>
      <span class="pz-meta"><b></b><small>${sideTag(p)} · ${movesOf(p)} nước</small><span class="pz-theme"></span></span>`;
    btn.querySelector('b').textContent = p.title;
    btn.querySelector('.pz-theme').textContent = p.theme;
    btn.title = `${p.title} · ${p.theme} · ${p.level}`;
    btn.addEventListener('click', () => start(p));
    return btn;
  }

  // ----- Sổ luyện lỗi (coach.js) -----
  let session = false; // đang ôn liên tục các thẻ đến hạn

  function coachCard() {
    if (typeof Coach === 'undefined') return '';
    const all = Coach.cards();
    const due = Coach.due();
    const avg = Coach.averageAccuracy();
    if (!all.length) {
      return `<section class="coach-card empty">
        <span class="coach-ic"><svg class="ic"><use href="#i-target"/></svg></span>
        <div><b>Sổ luyện lỗi của bạn</b>
        <p>Chơi một ván với máy hoặc Online: sau ván, web tự chấm từng nước bằng Stockfish và biến các nước hớ của bạn thành câu đố riêng để ôn lại. Càng chơi, sổ càng sát điểm yếu của bạn.</p></div>
      </section>`;
    }
    const recent = all.slice().sort((a, b) => b.at - a.at).slice(0, 4);
    return `<section class="coach-card">
      <div class="coach-main">
        <span class="coach-ic"><svg class="ic"><use href="#i-target"/></svg></span>
        <div class="coach-text">
          <small>Huấn luyện viên riêng</small>
          <b>Sổ luyện lỗi của bạn</b>
          <p>${due.length ? `${due.length} thế cờ đến hạn ôn hôm nay` : 'Hôm nay không còn thế cờ nào đến hạn'} · ${all.length} thế cờ lấy từ ván của bạn · ${Coach.mastered()} đã thuộc${avg != null ? ` · độ chính xác TB ${avg}%` : ''}</p>
        </div>
        <button type="button" id="coachStart" class="primary"${due.length ? '' : ' disabled'}>${due.length ? `Ôn ngay (${due.length})` : 'Đã ôn xong'}</button>
      </div>
      <div class="coach-list">${recent.map(c => `<button type="button" class="coach-mini" data-id="${c.id}" title="Nước ${c.no} · ${escapeText(c.label)}">
          <span class="pz-board lib-card-board lib-frame">${Library.fenBoard(c.fen, c.side === 'b')}</span>
          <span class="coach-mini-meta"><b>Nước ${c.no}: ${escapeText(c.played)}</b><small class="k-${c.kind}">${c.kind === 'blunder' ? 'Nước hớ' : 'Nước sai'} · −${c.drop}%</small><small>${escapeText(c.label)}</small></span>
        </button>`).join('')}</div>
    </section>`;
  }
  const escapeText = t => String(t || '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  function startReview() {
    const due = Coach.due();
    if (!due.length) { toast('Hôm nay đã ôn hết sổ luyện lỗi!'); return; }
    session = true;
    start(Coach.toPuzzle(due[0]));
  }

  function renderList() {
    const box = $('puzzleList');
    if (!box) return;
    const s = load();
    const solvedN = PUZZLES.filter(p => s.solved[p.id]).length;
    const perfectN = PUZZLES.filter(p => s.solved[p.id] && s.solved[p.id].clean).length;
    const d = daily();
    const doneToday = s.daily.last === dayKey();
    const today = new Date();
    box.innerHTML = coachCard() + `
      <div class="pz-hero">
        <button type="button" class="pz-daily${doneToday ? ' done' : ''}">
          <span class="pz-daily-board"><span class="pz-board lib-card-board lib-frame gold">${board(d)}</span></span>
          <span class="pz-daily-main">
            <span class="pz-ribbon"><svg class="ic"><use href="#i-star"/></svg>Câu đố hôm nay · ${p2(today.getDate())}/${p2(today.getMonth() + 1)}</span>
            <b></b>
            <span class="pz-chips"><span class="pz-lv lv-${LV[d.level] || 2}">${d.level}</span><span class="pz-chip">${sideTag(d)}</span><span class="pz-chip">${movesOf(d)} nước</span></span>
            <span class="pz-daily-theme"></span>
            <span class="pz-go">${doneToday ? '✓ Đã giải hôm nay · giải lại' : 'Giải ngay'}</span>
          </span>
        </button>
        <div class="pz-progress-card">
          <div class="pz-ring-wrap">${ring(solvedN, PUZZLES.length)}<span><b>${solvedN}</b><small>/${PUZZLES.length}</small></span></div>
          <p>câu đã giải</p>
          <div class="pz-mini-stats">
            <span title="Số ngày liên tiếp giải câu đố hôm nay"><svg class="ic flame"><use href="#i-flame"/></svg><b>${dailyStreak(s)}</b> ngày</span>
            <span title="Giải không sai, không gợi ý"><span class="pz-star">★</span><b>${perfectN}</b> hoàn hảo</span>
          </div>
        </div>
      </div>
      <div class="pz-tabs" role="tablist">
        ${[['all', 'Tất cả'], ...GROUPS.map(g => [g[0], g[1]]), ['todo', 'Chưa giải']]
          .map(([k, t]) => `<button type="button" role="tab" class="pz-tab${filter === k ? ' on' : ''}" data-f="${k}">${t}</button>`).join('')}
      </div>
      <div class="pz-sections"></div>`;
    const cb = box.querySelector('#coachStart');
    if (cb) cb.addEventListener('click', startReview);
    box.querySelectorAll('.coach-mini').forEach(b => b.addEventListener('click', () => {
      const c = Coach.cards().find(x => x.id === b.dataset.id);
      if (c) { session = true; start(Coach.toPuzzle(c)); }
    }));
    box.querySelector('.pz-daily b').textContent = d.title;
    box.querySelector('.pz-daily-theme').textContent = 'Chủ đề: ' + d.theme;
    box.querySelector('.pz-daily').addEventListener('click', () => start(d));
    box.querySelectorAll('.pz-tab').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; renderList(); }));
    const wrap = box.querySelector('.pz-sections');
    const groups = filter === 'all' || filter === 'todo' ? GROUPS : GROUPS.filter(g => g[0] === filter);
    let shown = 0;
    for (const [key, title, icon, sub] of groups) {
      const list = PUZZLES.filter(p => groupOf(p) === key && (filter !== 'todo' || !s.solved[p.id]));
      if (!list.length) continue;
      shown += list.length;
      const all = PUZZLES.filter(p => groupOf(p) === key);
      const done = all.filter(p => s.solved[p.id]).length;
      const sec = document.createElement('section');
      sec.className = 'pz-section';
      sec.innerHTML = `<header><span class="pz-sec-ic ${key}"><svg class="ic"><use href="#${icon}"/></svg></span>
        <span class="pz-sec-title"><b>${title}</b><small>${sub}</small></span>
        <span class="pz-sec-count"><span><b>${done}</b>/${all.length} đã giải</span><span class="pz-sec-bar"><i style="width:${100 * done / all.length}%"></i></span></span></header>
        <div class="pz-grid"></div>`;
      const grid = sec.querySelector('.pz-grid');
      list.forEach(p => grid.appendChild(card(p, s)));
      wrap.appendChild(sec);
    }
    if (!shown) wrap.innerHTML = '<p class="pz-all-done">🎉 Bạn đã giải hết các câu ở mục này!</p>';
  }

  function start(p) {
    // Gán current SAU newGame/setMode — vì newGame gọi showBanner(false) và xóa current
    active = false;
    $('puzzleModal').hidden = true;
    if (mode !== 'play') {
      if ($('mode')) $('mode').value = 'none';
      setMode('play');
      if (mode !== 'play') return;
    } else {
      if (typeof abandonBotGame === 'function' && !abandonBotGame()) return;
      newGame();
    }
    if (typeof clockOff === 'function') clockOff();
    current = p;
    step = ply = mistakes = 0;
    helped = false;
    active = true;
    try { game.load(p.fen); } catch { game.reset(); }
    aiColor = 'none';
    if ($('mode')) $('mode').value = 'none';
    flipped = sideOf(p) === 'b';
    viewPly = null;
    clearSelection();
    hint = null;
    marks.clear();
    playResult = null;
    ratedDone = true;
    thinking = false;
    renderRatedNote();
    render();
    showBanner(true);
  }

  function destroyBanner() {
    document.querySelectorAll('#puzzleBanner, .puzzle-banner').forEach(el => el.remove());
  }

  function setBanner(text, cls = '') {
    const s = document.querySelector('#puzzleBanner .pz-ban-msg');
    if (!s) return;
    s.textContent = text;
    s.className = 'pz-ban-msg ' + cls;
  }

  function showBanner(on) {
    if (!on) {
      const wasActive = active || !!current;
      destroyBanner();
      active = false;
      current = null;
      step = ply = 0;
      if (wasActive) {
        try {
          thinking = false;
          hint = null;
          game.reset();
          clearSelection();
          render();
        } catch {}
      }
      return;
    }
    if (!current) return;
    destroyBanner();
    const panel = $('playPanel') || document.querySelector('.controls');
    const el = document.createElement('div');
    el.id = 'puzzleBanner';
    el.className = 'puzzle-banner-panel';
    el.innerHTML = `
      <div class="pz-ban-head">
        <span class="pz-ban-side ${sideOf(current)}"></span>
        <div class="pz-ban-text"><b></b><span class="muted"></span></div>
      </div>
      <p class="pz-ban-msg"></p>
      <div class="pz-ban-actions">
        <button type="button" id="pzHint"><svg class="ic"><use href="#i-bulb"/></svg>Gợi ý</button>
        <button type="button" id="pzGive"><svg class="ic"><use href="#i-target"/></svg>Đáp án</button>
        <button type="button" id="pzNext"><svg class="ic"><use href="#i-chevron-right"/></svg>Câu khác</button>
        <button type="button" id="pzExit"><svg class="ic"><use href="#i-close"/></svg>Thoát</button>
      </div>`;
    el.querySelector('b').textContent = current.title;
    el.querySelector('.pz-ban-text span').textContent = current.mistake
      ? `Sổ luyện lỗi · ${current.mistake.kind === 'blunder' ? 'nước hớ' : 'nước sai'} · hộp ${current.mistake.box}/${Coach.BOX_DAYS.length}`
      : `${current.theme} · ${current.level} · ${movesOf(current)} nước`;
    if (current.mistake) el.classList.add('coach');
    el.querySelector('#pzHint').onclick = giveHint;
    el.querySelector('#pzGive').onclick = reveal;
    el.querySelector('#pzNext').onclick = next;
    el.querySelector('#pzExit').onclick = () => { showBanner(false); toast('Đã thoát câu đố'); };
    const note = $('ratedNote');
    if (panel && note && note.parentNode === panel) panel.insertBefore(el, note);
    else if (panel) panel.appendChild(el);
    else document.body.appendChild(el);
    if (current.mistake) setBanner(`Trong ván "${current.mistake.label}", bạn cầm ${sideOf(current) === 'w' ? 'Trắng' : 'Đen'} và đã đi ${current.mistake.played}. Hãy tìm nước tốt hơn.`);
    else setBanner(`${sideOf(current) === 'w' ? 'Trắng' : 'Đen'} đi. ${current.mate ? `Chiếu hết trong ${current.mate} nước.` : 'Tìm nước mạnh nhất.'}`);
  }

  // Nước đúng tiếp theo (để gợi ý / đáp án)
  function solutionMove() {
    if (current.mate) return LessonSolver.mateIn(game, current.mate - step);
    const alts = current.line[ply].split('|').map(strip);
    for (const m of game.legalMoves()) {
      if (!game.move({ from: m.from, to: m.to, promotion: m.promotion || undefined })) continue;
      const ok = alts.includes(strip(game.history[game.history.length - 1].san));
      game.undo();
      if (ok) return m;
    }
    return null;
  }

  // Gợi ý: lần 1 đọc mẹo, lần 2 tô ô quân cần đi
  function giveHint() {
    if (!active || thinking) return;
    if (!helped) { helped = true; setBanner(current.hint || 'Tìm nước mạnh nhất.', 'hint'); return; }
    const m = solutionMove();
    if (m) { hint = { from: m.from, to: m.from }; render(); setBanner('Quân cần đi đã được tô sáng.', 'hint'); }
  }

  function reveal() {
    if (!active || thinking) return;
    helped = true;
    const m = solutionMove();
    if (!m) return;
    hint = null;
    game.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
    afterCorrect(true);
  }

  // Máy đáp trả: theo line, hoặc (câu chiếu hết) nước khiến bị chiếu hết lâu nhất
  function replyMove() {
    if (!current.mate) {
      const alt = strip(current.line[ply].split('|')[0]);
      for (const m of game.legalMoves()) {
        if (!game.move({ from: m.from, to: m.to, promotion: m.promotion || undefined })) continue;
        if (strip(game.history[game.history.length - 1].san) === alt) return true;
        game.undo();
      }
      return false;
    }
    const left = current.mate - step;
    let best = null, bestN = -1;
    for (const m of game.legalMoves()) {
      const u = game._apply(m);
      let n = 1;
      while (n < left && !LessonSolver.mateIn(game, n)) n++;
      game._undo(u);
      if (n > bestN || (n === bestN && Math.random() < 0.5)) { best = m; bestN = n; }
    }
    return !!(best && game.move({ from: best.from, to: best.to, promotion: best.promotion || undefined }));
  }

  function finished() {
    return current.mate ? game.status() === 'checkmate' : ply >= current.line.length;
  }

  function afterCorrect(auto = false) {
    step++;
    if (!current.mate) ply++;
    hint = null;
    if (finished()) return solve();
    setBanner(auto ? 'Đây là nước đúng. Máy đang đáp trả…' : 'Chính xác! Máy đang đáp trả…', 'ok');
    thinking = true;
    render();
    const token = current;
    setTimeout(() => {
      if (current !== token) return;
      if (!current.mate) ply++;
      replyMove();
      thinking = false;
      render();
      setBanner('Tiếp tục: tìm nước mạnh nhất.');
    }, 550);
  }

  function solve() {
    active = false;
    thinking = false;
    render();
    const clean = !mistakes && !helped;
    if (current.mistake) {
      const c = Coach.review(current.id, clean);
      const left = Coach.due().length;
      setBanner(clean
        ? `Chính xác! Thế cờ lên hộp ${c ? c.box : ''}, sẽ gặp lại sau ${c ? Coach.BOX_DAYS[c.box] || 60 : ''} ngày.` + (left ? ` Còn ${left} thế cờ cần ôn.` : ' Đã ôn hết hôm nay!')
        : `Đã giải, nhưng có sai / dùng gợi ý nên thế cờ sẽ quay lại sau 10 phút.` + (left ? ` Còn ${left} thế cờ cần ôn.` : ''), 'ok');
      if (clean && typeof celebrate === 'function' && !left) celebrate();
      const nb = $('pzNext');
      if (nb) { nb.classList.add('primary'); nb.lastChild.textContent = left ? 'Thế cờ tiếp' : 'Xong'; }
      return;
    }
    const s = load();
    const prev = s.solved[current.id];
    s.solved[current.id] = { at: Date.now(), clean: clean || !!(prev && prev.clean) };
    let extra = '';
    if (current.id === daily().id && s.daily.last !== dayKey()) {
      s.daily.streak = dailyStreak(s) + 1;
      s.daily.last = dayKey();
      extra = ` Chuỗi câu đố hôm nay: ${s.daily.streak} ngày.`;
    }
    save(s);
    setBanner((clean ? 'Hoàn hảo! Giải không sai lần nào.' : 'Hoàn thành câu đố!') + extra, 'ok');
    if (clean && typeof celebrate === 'function') celebrate();
    const nb = $('pzNext');
    if (nb) { nb.classList.add('primary'); nb.lastChild.textContent = 'Câu tiếp theo'; }
  }

  function next() {
    if (current && current.mistake) {
      const nextCard = Coach.due().find(c => c.id !== current.id) || null;
      if (nextCard) return start(Coach.toPuzzle(nextCard));
      showBanner(false);
      session = false;
      toast('Đã ôn hết sổ luyện lỗi hôm nay!');
      return open();
    }
    const s = load();
    const i = PUZZLES.indexOf(current);
    const order = PUZZLES.slice(i + 1).concat(PUZZLES.slice(0, i + 1));
    start(order.find(p => !s.solved[p.id] && p !== current) || order[0]);
  }

  // Gọi từ play() sau khi người chơi đi một nước trong câu đố
  function onMove() {
    if (!active || !current) return false;
    const san = strip(game.history[game.history.length - 1].san);
    let ok;
    if (current.mate) {
      const left = current.mate - step;
      ok = game.status() === 'checkmate' || (left > 1 && LessonSolver.forced(game, left - 1));
    } else {
      ok = current.line[ply].split('|').some(a => strip(a) === san);
    }
    if (!ok && current.mistake) {
      // Nước khác nước của máy: nhờ Stockfish xem có tốt ngang không
      const token = current;
      thinking = true;
      setBanner('Đang kiểm tra nước của bạn…');
      Coach.goodEnough(current.mistake, new Chess(Engine.positionFen(game))).then(good => {
        if (current !== token) return;
        thinking = false;
        if (good) { setBanner('Nước này cũng tốt ngang nước của máy!', 'ok'); afterCorrect(); return; }
        game.undo();
        mistakes++;
        render();
        setBanner(`Chưa đủ tốt: nước này vẫn để mất nhiều lợi thế. Thử lại nhé.`, 'bad');
      });
      return true;
    }
    if (!ok) {
      game.undo();
      mistakes++;
      setBanner('Chưa đúng, thử nước khác.', 'bad');
      return true;
    }
    afterCorrect();
    return true;
  }

  const isActive = () => !!active || !!(current && thinking);

  // Tóm tắt cho Trang chủ
  function summary() {
    const s = load(), d = daily();
    return {
      daily: d, board: board(d), side: sideOf(d), moves: movesOf(d),
      doneToday: s.daily.last === dayKey(), streak: dailyStreak(s),
      solved: PUZZLES.filter(p => s.solved[p.id]).length, total: PUZZLES.length,
    };
  }

  return { open, bind() {}, onMove, isActive, showBanner, startReview, summary, playDaily: () => start(daily()), list: PUZZLES };
})();
