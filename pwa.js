// Cài Royal Gambit như một ứng dụng (PWA) trên điện thoại và máy tính:
// • Đăng ký service worker (sw.js) để chạy được khi mất mạng và mở nhanh hơn.
// • Nút "Cài ứng dụng": Android / Chrome / Edge dùng hộp cài đặt của trình duyệt; iPhone / iPad hiện hướng dẫn
//   "Chia sẻ › Thêm vào MH chính" (Safari không có hộp cài đặt tự động).
// • Có bản mới thì hiện thanh "Cập nhật" thay vì tự tải lại giữa ván.
// • Thanh điều hướng dưới đáy màn hình trên điện thoại (5 mục chính + "Thêm").

const PWA = (() => {
  const $ = id => document.getElementById(id);
  const UA = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
  const standalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch { return false; } };
  const DISMISS_KEY = 'rg-install-dismissed';
  let deferred = null; // sự kiện beforeinstallprompt
  let waiting = null;  // service worker mới đang chờ

  const say = t => (typeof toast === 'function' ? toast(t) : null);
  const canInstall = () => !standalone() && (!!deferred || (isIOS && /Safari/i.test(UA) && !/CriOS|FxiOS|EdgiOS/i.test(UA)));

  function render() {
    document.documentElement.classList.toggle('standalone', standalone());
    const show = canInstall();
    for (const el of document.querySelectorAll('[data-install]')) el.hidden = !show;
    const card = $('hmInstall');
    if (card) {
      let off = false;
      try { off = Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < 14 * 86400000; } catch {}
      card.hidden = !show || off;
    }
  }

  async function install() {
    if (deferred) {
      deferred.prompt();
      const r = await deferred.userChoice.catch(() => null);
      deferred = null;
      render();
      if (r && r.outcome === 'accepted') say('Đang cài Royal Gambit…');
      return;
    }
    if (isIOS) { $('installModal').hidden = false; return; }
    $('installModal').hidden = false;
  }

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    render();
  }

  function showUpdate() {
    const bar = $('updateBar');
    if (bar) bar.hidden = false;
  }

  function register() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1' && location.protocol !== 'https:') return;
    window.addEventListener('load', async () => {
      let reg;
      try { reg = await navigator.serviceWorker.register('sw.js', { scope: './' }); } catch { return; }
      const track = sw => {
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) { waiting = sw; showUpdate(); }
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) { waiting = reg.waiting; showUpdate(); }
      track(reg.installing);
      reg.addEventListener('updatefound', () => track(reg.installing));
      // Mở lâu (để tab cả ngày): kiểm tra bản mới mỗi giờ
      setInterval(() => reg.update().catch(() => {}), 3600000);
    });
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading || !waiting) return;
      reloading = true;
      location.reload();
    });
  }

  // ---------- Thanh điều hướng dưới đáy (điện thoại) ----------
  // Các tab gốc ở thanh trên vẫn giữ nguyên (mọi sự kiện gắn sẵn); thanh dưới chỉ là bản sao gọi lại .click() của tab gốc.
  const PRIMARY = ['homeTab', 'mode:play', 'mode:learn', 'puzzleTab', 'aiTab'];
  const tabOf = k => (k.startsWith('mode:') ? document.querySelector(`.tabs .tab[data-mode="${k.slice(5)}"]`) : $(k));

  function buildDock() {
    const dock = $('mobileDock');
    if (!dock) return;
    const items = PRIMARY.map(tabOf).filter(Boolean);
    dock.innerHTML = '';
    for (const t of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dock-item';
      b.dataset.for = t.id || 'mode-' + t.dataset.mode;
      b.innerHTML = t.innerHTML;
      b.addEventListener('click', () => { closeMore(); t.click(); });
      b._tab = t;
      dock.appendChild(b);
    }
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'dock-item dock-more';
    more.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg><span>Khác</span>';
    more.addEventListener('click', toggleMore);
    dock.appendChild(more);
    syncDock();
    // Theo dõi tab đang chọn / huy hiệu / tab bị ẩn (Admin) để thanh dưới luôn khớp
    const mo = new MutationObserver(syncDock);
    for (const t of document.querySelectorAll('.tabs .tab')) mo.observe(t, { attributes: true, subtree: true, childList: true, characterData: true });
  }

  function syncDock() {
    const dock = $('mobileDock');
    if (!dock) return;
    let anySel = false;
    for (const b of dock.querySelectorAll('.dock-item:not(.dock-more)')) {
      const t = b._tab;
      const sel = t.getAttribute('aria-selected') === 'true';
      anySel = anySel || sel;
      b.classList.toggle('on', sel);
      b.hidden = t.hidden;
      const badge = t.querySelector('.nav-badge'), mine = b.querySelector('.nav-badge');
      if (badge && mine) { mine.hidden = badge.hidden; mine.textContent = badge.textContent; }
    }
    // Ván đang ở chế độ Online / trang khác: "Thêm" sáng khi tab đang chọn nằm trong danh sách Thêm
    const others = [...document.querySelectorAll('.tabs .tab')].filter(t => !PRIMARY.map(tabOf).includes(t));
    dock.querySelector('.dock-more').classList.toggle('on', !anySel && others.some(t => t.getAttribute('aria-selected') === 'true'));
  }

  function toggleMore() {
    const sheet = $('moreSheet');
    if (!sheet.hidden) { closeMore(); return; }
    const list = $('moreList');
    list.innerHTML = '';
    for (const t of document.querySelectorAll('.tabs .tab')) {
      if (PRIMARY.map(tabOf).includes(t) || t.hidden) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'more-item';
      b.innerHTML = t.innerHTML;
      b.addEventListener('click', () => { closeMore(); t.click(); });
      list.appendChild(b);
    }
    // Nút ở thanh trên (ngôn ngữ, rank, hồ sơ) cũng gom vào đây cho dễ bấm bằng một tay
    for (const id of ['profileBtn', 'rankBtn', 'langBtn']) {
      const src = $(id);
      if (!src) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'more-item';
      b.innerHTML = id === 'profileBtn' ? '<svg class="ic"><use href="#i-user"/></svg><span>Hồ sơ</span>'
        : id === 'rankBtn' ? '<svg class="ic"><use href="#i-star"/></svg><span>Rank & Elo</span>'
        : `<svg class="ic"><use href="#i-globe"/></svg><span>${src.textContent.trim() || 'Ngôn ngữ'}</span>`;
      b.addEventListener('click', () => { closeMore(); src.click(); });
      list.appendChild(b);
    }
    if (canInstall()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'more-item';
      b.innerHTML = '<svg class="ic"><use href="#i-download"/></svg><span>Cài ứng dụng</span>';
      b.addEventListener('click', () => { closeMore(); install(); });
      list.appendChild(b);
    }
    sheet.hidden = false;
    document.body.classList.add('more-open');
  }
  function closeMore() { const s = $('moreSheet'); if (s) s.hidden = true; document.body.classList.remove('more-open'); }

  function bind() {
    for (const el of document.querySelectorAll('[data-install]')) el.addEventListener('click', install);
    const card = $('hmInstall');
    if (card) {
      card.querySelector('[data-install-go]').addEventListener('click', install);
      card.querySelector('[data-install-no]').addEventListener('click', dismiss);
    }
    $('updateGo').addEventListener('click', () => {
      $('updateBar').hidden = true;
      if (waiting) waiting.postMessage('skipWaiting');
      else location.reload();
    });
    $('updateLater').addEventListener('click', () => { $('updateBar').hidden = true; });
    $('moreSheet').addEventListener('click', e => { if (e.target === $('moreSheet')) closeMore(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMore(); });
    buildDock();
    render();
    // Mất mạng / có mạng lại
    const net = () => document.documentElement.classList.toggle('offline', !navigator.onLine);
    window.addEventListener('online', () => { net(); say('Đã có mạng trở lại'); });
    window.addEventListener('offline', () => { net(); say('Mất mạng: vẫn chơi được với máy, câu đố, học cờ'); });
    net();
  }

  // ---------- Giữ màn hình sáng khi đang ở bàn cờ (Chơi / Online) ----------
  // Điện thoại tự tắt màn hình giữa ván rất khó chịu; nhả ra ngay khi rời bàn cờ hoặc ẩn ứng dụng.
  let lock = null;
  const wantLock = () => document.visibilityState === 'visible' && !document.body.dataset.page
    && (document.body.dataset.mode === 'play' || document.body.dataset.mode === 'online');
  async function syncLock() {
    if (!('wakeLock' in navigator)) return;
    if (wantLock()) {
      if (lock) return;
      try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } catch { lock = null; }
    } else if (lock) {
      const l = lock; lock = null;
      l.release().catch(() => {});
    }
  }
  document.addEventListener('visibilitychange', syncLock);
  new MutationObserver(syncLock).observe(document.body, { attributes: true, attributeFilter: ['data-mode', 'data-page'] });

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e;
    render();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    render();
    say('Đã cài Royal Gambit! Mở từ màn hình chính hoặc menu ứng dụng.');
  });
  try { matchMedia('(display-mode: standalone)').addEventListener('change', render); } catch {}

  register();
  return { bind, install, render, standalone, isIOS, syncDock };
})();
