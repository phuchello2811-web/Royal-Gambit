// Service worker: cho Royal Gambit cài được như ứng dụng (điện thoại + máy tính) và chạy khi mất mạng.
// • Trang (index.html): lấy từ mạng trước, mất mạng thì dùng bản đã lưu.
// • File tĩnh cùng tên miền (js, css, ảnh, quân cờ, Stockfish .wasm): dùng bản đã lưu ngay, đồng thời tải bản mới ở nền.
//   Các file trong index.html có ?v=N nên đổi phiên bản là thành địa chỉ mới, không bao giờ dùng nhầm bản cũ.
// • Không đụng tới Firebase, PeerJS, Google đăng nhập (/__/auth/…) và mọi yêu cầu khác GET.
// Sửa danh sách CORE hoặc đổi VERSION khi thêm file mới cần có sẵn lúc offline.

const VERSION = 'rg-v41';
const CORE = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'i18n.js', 'chess.js', 'ai.js', 'engine.js', 'config.js', 'profile.js', 'contest.js', 'sound.js',
  'lessons.js', 'lessons-en.js', 'learn.js', 'online.js', 'library.js', 'coach.js', 'puzzles.js',
  'history.js', 'openings.js', 'knowledge.js', 'cloudai.js', 'assistant.js', 'pwa.js', 'app.js',
  'img/logo.svg', 'img/favicon.svg', 'img/favicon.png', 'img/apple-touch-icon.png',
  'img/icon-192.png', 'img/icon-512.png', 'img/icon-maskable-512.png',
  ...['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'].map(p => `pieces/${p}.svg`),
];
// Stockfish (vài MB): chỉ lưu khi dùng tới lần đầu.
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Từng file một: thiếu một file (ví dụ đổi tên) cũng không làm hỏng cả lần cài
    await Promise.all(CORE.map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

// Trang báo "có bản mới" và người chơi bấm Cập nhật
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

async function fromNetwork(req, cache) {
  const res = await fetch(req);
  if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) cache.put(req, res.clone()).catch(() => {});
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (same && url.pathname.includes('/__/')) return; // trang đăng nhập Google của Firebase Hosting
  if (!same && !FONT_HOSTS.includes(url.hostname)) return;

  // Trang chính: mạng trước (luôn có bản mới nhất), mất mạng thì dùng bản lưu
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try { return await fromNetwork(req, cache); }
      catch {
        return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('index.html')) || (await cache.match('./'))
          || new Response('<h1>Đang mất mạng</h1><p>Hãy kết nối Internet rồi tải lại trang.</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  // File tĩnh: bản lưu ngay + cập nhật ở nền
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req);
    const net = fromNetwork(req, cache);
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    try { return await net; }
    catch {
      // Mất mạng và chưa có đúng phiên bản này: dùng tạm bản cũ cùng tên file
      const old = same && await cache.match(req, { ignoreSearch: true });
      if (old) return old;
      throw new Error('offline');
    }
  })());
});
