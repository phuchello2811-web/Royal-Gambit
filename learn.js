// Chế độ học cờ: người chơi phải đi đúng mục tiêu của bài để qua bài.
// Dùng chung bàn cờ `game`, `hint` và hàm `render` của app.js.

const Learn = (() => {
  const STORE_KEY = 'covua-learn-done';
  const $ = id => document.getElementById(id);

  let index = 0;
  let stars = new Set();
  let step = 0;       // vị trí hiện tại trong `line`
  let busy = false;   // đang chờ máy đi nước kịch bản hoặc hoàn tác nước sai
  let done = false;
  let message = null; // { text, cls }
  let token = 0;      // để hủy setTimeout của bài cũ
  let completed = loadProgress();

  function loadProgress() {
    try { return new Set(JSON.parse(localStorage.getItem(STORE_KEY)) || []); } catch { return new Set(); }
  }
  function saveProgress() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify([...completed])); } catch {}
  }

  function parse(uci) {
    return { from: sqIndex(uci.slice(0, 2)), to: sqIndex(uci.slice(2, 4)), promotion: uci[4] ? uci[4].toUpperCase() : undefined };
  }
  const same = (m, w) => m.from === w.from && m.to === w.to && (!w.promotion || m.promotion === w.promotion);

  // Điều kiện cho các bài chỉ cần một nước; gọi sau khi đã đi nước đó
  const CHECKS = {
    castle: m => m.flag === 'castleK' || m.flag === 'castleQ',
    promote: m => !!m.promotion,
    check: () => game.inCheck(),
    mate: () => game.status() === 'checkmate',
  };

  const lesson = () => LESSONS[index];

  function open(i = index) {
    index = Math.max(0, Math.min(LESSONS.length - 1, i));
    const l = lesson();
    token++;
    game.load(l.fen);
    stars = new Set((l.stars || []).map(sqIndex));
    step = 0;
    done = false;
    busy = false;
    hint = null;
    message = null;
    flipped = false;
    clearSelection();
    if (l.pre) {
      busy = true;
      const t = token;
      setTimeout(() => {
        if (t !== token) return;
        for (const u of l.pre) game.move(parse(u));
        busy = false;
        render();
      }, 600);
    }
    renderPanel();
    render();
  }

  function finish() {
    done = true;
    message = { text: 'Chính xác! Bạn đã hoàn thành bài này 🎉', cls: 'over' };
    completed.add(index);
    saveProgress();
    renderPanel();
  }

  function wrong() {
    message = { text: 'Chưa đúng, thử lại nhé!', cls: 'in-check' };
    busy = true;
    const t = token;
    setTimeout(() => {
      if (t !== token) return;
      game.undo();
      busy = false;
      message = null;
      render();
    }, 700);
  }

  function onMove(m) {
    const l = lesson();
    game.move(m);
    message = null;

    if (l.goal === 'stars') {
      stars.delete(m.to);
      game.turn = 'w'; // chỉ có bên Trắng đi
      game.ep = -1;
      if (!stars.size) finish();
      else message = { text: `Tốt lắm! Còn ${stars.size} ngôi sao.` };
    } else if (l.goal === 'line') {
      if (!same(m, parse(l.line[step]))) wrong();
      else if (++step >= l.line.length) finish();
      else {
        message = { text: 'Đúng rồi! Chờ Đen đi…' };
        busy = true;
        const t = token;
        setTimeout(() => {
          if (t !== token) return;
          game.move(parse(l.line[step++]));
          busy = false;
          message = { text: 'Tiếp tục nào!' };
          if (step >= l.line.length) finish();
          render();
        }, 600);
      }
    } else if (CHECKS[l.goal](m)) {
      finish();
    } else {
      wrong();
    }
    render();
  }

  // Tìm một nước đúng để gợi ý
  function findHint() {
    const l = lesson();
    const moves = game.legalMoves();
    if (l.goal === 'line') {
      const w = parse(l.line[step]);
      return moves.find(m => same(m, w));
    }
    if (l.goal === 'stars') return moves.find(m => stars.has(m.to)) || moves[0];
    return moves.find(m => {
      const u = game._apply(m);
      const ok = CHECKS[l.goal](m);
      game._undo(u);
      return ok;
    });
  }

  function showHint() {
    if (!canMove()) return;
    const m = findHint();
    if (m) hint = { from: m.from, to: m.to };
    message = { text: 'Gợi ý: đi quân ở ô được tô xanh tới ô đánh dấu.' };
    render();
  }

  function canMove() { return !busy && !done; }

  function status() {
    if (message) return message;
    const l = lesson();
    return { text: l.goal === 'stars' ? 'Hãy ăn hết các ngôi sao ★' : 'Lượt Trắng đi' };
  }

  function renderPanel() {
    const l = lesson();
    $('lessonGroup').textContent = `${l.group} · Bài ${index + 1}/${LESSONS.length}`;
    $('lessonTitle').textContent = l.title;
    $('lessonText').textContent = l.text;
    $('lessonPrev').disabled = index === 0;
    $('lessonNext').disabled = index === LESSONS.length - 1;
    $('lessonNext').classList.toggle('primary', done);

    const list = $('lessonList');
    list.innerHTML = '';
    let group = '';
    LESSONS.forEach((x, i) => {
      if (x.group !== group) {
        group = x.group;
        const h = document.createElement('li');
        h.className = 'lesson-group';
        h.textContent = group;
        list.appendChild(h);
      }
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'lesson-item' + (i === index ? ' current' : '');
      btn.innerHTML = `<span>${i + 1}. </span><span></span><span class="tick">${completed.has(i) ? '✓' : ''}</span>`;
      btn.children[1].textContent = x.title;
      btn.addEventListener('click', () => open(i));
      li.appendChild(btn);
      list.appendChild(li);
    });
    $('lessonProgress').textContent = `${completed.size}/${LESSONS.length} bài`;
    $('lessonBar').style.width = (100 * completed.size / LESSONS.length) + '%';
  }

  $('lessonPrev').addEventListener('click', () => open(index - 1));
  $('lessonNext').addEventListener('click', () => open(index + 1));
  $('lessonRetry').addEventListener('click', () => open(index));
  $('lessonHint').addEventListener('click', showHint);

  return { open, onMove, canMove, status, stars: () => stars, leave: () => { token++; } };
})();
