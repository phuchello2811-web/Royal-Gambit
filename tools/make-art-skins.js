// Tạo 5 bộ quân cờ "có hình vẽ riêng" (không chỉ đổi màu): mỗi quân có lớp trang trí phía sau (tinh thể băng,
// ngọn lửa, hào quang, lá cây, vành sao), hoa văn phủ lên thân quân (vân băng, vết nứt dung nham, ánh kim, vân gỗ,
// bụi sao) và chi tiết phía trước (tuyết, lửa, vòng nguyệt quế, rêu, vành hành tinh).
// Chạy: node tools/make-art-skins.js  → ghi ra pieces/<skin>/wK.svg … bR.svg
// Hình dáng quân lấy từ bộ gốc pieces/*.svg (thu nhỏ 88% để chừa chỗ cho phần trang trí).

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'pieces');
const PIECES = ['K', 'Q', 'R', 'B', 'N', 'P'];

// ---------- hình học ----------
const f = n => +n.toFixed(2);
const rad = d => d * Math.PI / 180;
// Quân thu nhỏ quanh điểm (22.5, 41): đáy quân gần như giữ nguyên chỗ
const S = 0.88, TX = 22.5 * (1 - S), TY = 41 * (1 - S);
const ty = y => y * S + TY, tx = x => x * S + TX;
// Số đo của từng quân (toạ độ gốc trước khi thu nhỏ): đỉnh, mép trái / phải của đế
const M = {
  K: { top: 6, x0: 11, x1: 34 },
  Q: { top: 6, x0: 9, x1: 36 },
  R: { top: 9, x0: 9, x1: 36 },
  B: { top: 5.5, x0: 8, x1: 37 },
  N: { top: 10, x0: 15, x1: 38 },
  P: { top: 9, x0: 11, x1: 34 },
};
function rng(seed) { // số ngẫu nhiên cố định (mulberry32): chạy lại cho ra đúng hình cũ
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const dirOf = a => [Math.cos(rad(a)), Math.sin(rad(a))];
const pt = (x, y) => `${f(x)},${f(y)}`;

// Tinh thể băng: cột nhọn có hai vai, thêm một mặt cắt sáng
function shard(x, y, a, len, w, fill, line) {
  const [dx, dy] = dirOf(a), px = -dy, py = dx;
  const b1 = [x + px * w * 0.32, y + py * w * 0.32], b2 = [x - px * w * 0.32, y - py * w * 0.32];
  const s1 = [x + dx * len * 0.7 + px * w * 0.5, y + dy * len * 0.7 + py * w * 0.5];
  const s2 = [x + dx * len * 0.7 - px * w * 0.5, y + dy * len * 0.7 - py * w * 0.5];
  const tip = [x + dx * len, y + dy * len];
  const mid = [x + dx * len * 0.7, y + dy * len * 0.7];
  return `<path d="M${pt(...b1)}L${pt(...s1)}L${pt(...tip)}L${pt(...s2)}L${pt(...b2)}Z" fill="${fill}" stroke="${line}" stroke-width=".6" stroke-linejoin="round"/>` +
    `<path d="M${pt(x, y)}L${pt(...mid)}L${pt(...tip)}M${pt(...mid)}L${pt(...s1)}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width=".45"/>` +
    `<path d="M${pt(...b2)}L${pt(...s2)}L${pt(...tip)}L${pt(...mid)}Z" fill="#fff" fill-opacity=".28"/>`;
}
// Ngọn lửa: lưỡi lửa uốn cong, `lean` nghiêng đỉnh sang trái / phải
function flame(x, y, h, w, lean, fill, op = 1) {
  return `<path d="M${pt(x - w / 2, y)}C${pt(x - w / 2, y - h * 0.42)} ${pt(x - w * 0.12 + lean * 0.3, y - h * 0.58)} ${pt(x + lean, y - h)}` +
    `C${pt(x + w * 0.22 + lean * 0.45, y - h * 0.62)} ${pt(x + w / 2, y - h * 0.4)} ${pt(x + w / 2, y)}Q${pt(x, y + w * 0.28)} ${pt(x - w / 2, y)}Z" fill="${fill}"${op < 1 ? ` fill-opacity="${op}"` : ''}/>`;
}
// Lá cây: hai đường cong gặp nhau ở ngọn, có gân giữa
function leaf(x, y, a, len, w, fill, line, vein = '#ffffff') {
  const [dx, dy] = dirOf(a), px = -dy, py = dx;
  const P = (t, s) => pt(x + dx * len * t + px * w * s, y + dy * len * t + py * w * s);
  return `<path d="M${pt(x, y)}C${P(0.3, 1)} ${P(0.75, 0.75)} ${P(1, 0)}C${P(0.75, -0.75)} ${P(0.3, -1)} ${pt(x, y)}Z" fill="${fill}" stroke="${line}" stroke-width=".55" stroke-linejoin="round"/>` +
    `<path d="M${pt(x, y)}Q${P(0.5, 0.12)} ${P(0.92, 0)}" fill="none" stroke="${vein}" stroke-opacity=".55" stroke-width=".45" stroke-linecap="round"/>`;
}
// Ngôi sao 4 cánh lấp lánh
const sparkle = (x, y, r, fill, op = 1) =>
  `<path d="M${pt(x, y - r)}Q${pt(x, y)} ${pt(x + r, y)}Q${pt(x, y)} ${pt(x, y + r)}Q${pt(x, y)} ${pt(x - r, y)}Q${pt(x, y)} ${pt(x, y - r)}Z" fill="${fill}"${op < 1 ? ` fill-opacity="${op}"` : ''}/>`;
const grad = (id, stops, x1 = 12, y1 = 6, x2 = 34, y2 = 42) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
  stops.map((c, i) => { const [col, op] = c.split('@'); return `<stop offset="${f(i / (stops.length - 1))}" stop-color="${col}"${op ? ` stop-opacity="${op}"` : ''}/>`; }).join('') + `</linearGradient>`;
const rgrad = (id, cx, cy, r, stops) =>
  `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">` +
  stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${op}"/>`).join('') + `</radialGradient>`;
// Đường gồ ghề (tuyết, rêu) phủ phần đáy quân
function mound(x0, x1, y, h, fill, line, seed) {
  const r = rng(seed), n = Math.max(4, Math.round((x1 - x0) / 4));
  let d = `M${pt(x0, y + 1.5)}`;
  for (let i = 0; i < n; i++) {
    const a = x0 + (x1 - x0) * i / n, b = x0 + (x1 - x0) * (i + 1) / n;
    d += `Q${pt((a + b) / 2, y - h * (0.6 + r() * 0.6))} ${pt(b, y - h * 0.15 * r())}`;
  }
  d += `L${pt(x1 + 0.5, y + 2.6)}Q${pt((x0 + x1) / 2, y + 4.6)} ${pt(x0 - 0.5, y + 2.6)}Z`;
  return `<path d="${d}" fill="${fill}" stroke="${line}" stroke-width=".6" stroke-linejoin="round"/>`;
}
// Các đường nứt / vân phân nhánh ngẫu nhiên trong vùng thân quân
function veins(seed, n, x0, x1, y0, y1, step = 3.2) {
  const r = rng(seed); let d = '';
  for (let i = 0; i < n; i++) {
    let x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), a = r() * 360;
    d += `M${pt(x, y)}`;
    const k = 3 + Math.floor(r() * 3);
    for (let j = 0; j < k; j++) {
      a += (r() - 0.5) * 80; x += Math.cos(rad(a)) * step; y += Math.sin(rad(a)) * step;
      d += `L${pt(x, y)}`;
    }
  }
  return d;
}

// ---------- chuyển bộ gốc ----------
function inner(svg) { return svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''); }
function paint(svg, side, c) { // tô lại thân quân bằng gradient #body, viền và nét trang trí theo bộ
  let s = inner(svg);
  if (side === 'w') s = s.replace(/fill="#000"/g, `fill="${c.detail}"`).replace(/fill="#fff"/g, 'fill="url(#body)"');
  else s = s.replace(/fill="#000"/g, 'fill="url(#body)"').replace(/#ececec/g, c.detail);
  s = s.replace(/stroke="#000"/g, `stroke="${c.line}"`);
  return `<g fill="${side === 'b' ? 'url(#body)' : 'none'}">${s}</g>`;
}
function silhouette(svg) { // cùng hình quân nhưng toàn màu trắng: làm mặt nạ cho hoa văn phủ thân quân
  const s = inner(svg).replace(/fill="(?!none)[^"]*"/g, 'fill="#fff"').replace(/stroke="(?!none)[^"]*"/g, 'stroke="#fff"');
  return `<g fill="#fff">${s}</g>`;
}

// ---------- 5 bộ ----------
const T = `transform="matrix(${S} 0 0 ${S} ${f(TX)} ${f(TY)})"`;
const SKINS = {
  // Băng giá: tinh thể băng mọc sau lưng, vân băng trên thân, tuyết đọng và tinh thể nhỏ ở chân
  ice: {
    w: { body: ['#ffffff', '#e6f7ff', '#a6dcf7', '#5aaee0'], line: '#0b3557', detail: '#0b3557', shard: ['#ffffff', '#c4ecff', '#6cc1ef'], shardLine: '#1d5d8c' },
    b: { body: ['#7aa0d2', '#2d4f86', '#13284c', '#060f22'], line: '#d4f0ff', detail: '#d4f0ff', shard: ['#bfe4ff', '#4f8fd0', '#1c477e'], shardLine: '#0a2240' },
    defs: c => grad('shard', c.shard, 10, 0, 30, 40),
    back(t, c) {
      const L = t === 'P' ? 0.78 : t === 'R' ? 0.88 : 1, F = 'url(#shard)';
      if (t === 'N') return [[34, 38, -76, 32, 7.5], [36.5, 38, -54, 25, 6.5], [38, 39, -32, 16, 5], [31, 38, -97, 23, 6], [9, 41, -128, 9, 4]]
        .map(s => shard(...s, F, c.shardLine)).join('');
      return [[22.5, 37, -90, 34 * L, 7.5], [19, 37, -116, 27 * L, 6.5], [26, 37, -64, 27 * L, 6.5], [16, 38, -146, 17 * L, 5], [29, 38, -34, 17 * L, 5]]
        .map(s => shard(...s, F, c.shardLine)).join('');
    },
    skin(t, side) {
      const col = side === 'w' ? '#3b97d1' : '#e4f6ff', op = side === 'w' ? 0.5 : 0.55;
      return `<path d="${veins(t.charCodeAt(0) * 7 + (side === 'w' ? 1 : 2), 7, 9, 36, 12, 38, 2.6)}" fill="none" stroke="${col}" stroke-opacity="${op}" stroke-width=".5" stroke-linecap="round"/>` +
        `<path d="M8 14L40 6V14L8 24Z" fill="#fff" fill-opacity="${side === 'w' ? 0.35 : 0.14}"/>` +
        sparkle(17, 22, 1.4, '#fff', 0.9) + sparkle(28, 31, 1, '#fff', 0.8);
    },
    front(t, c, side) {
      const m = M[t], x0 = tx(m.x0) - 1, x1 = tx(m.x1) + 1;
      const snow = side === 'w' ? '#ffffff' : '#eaf7ff';
      return shard(x0 + 1, 41, -118, 8, 3.4, 'url(#shard)', c.shardLine) + shard(x1 - 1, 41, -62, 9, 3.6, 'url(#shard)', c.shardLine) +
        mound(x0 + 2, x1 - 2, 40.2, 2.2, snow, '#2a6c9c', t.charCodeAt(0)) +
        sparkle(x0 + 5, 41.5, 0.9, '#9fdcff') + sparkle(x1 - 6, 41.8, 0.8, '#9fdcff');
    },
  },

  // Hỏa ngục: lửa bùng sau lưng, thân đá núi lửa nứt toác phát sáng, lửa liếm chân quân và tàn lửa bay
  fire: {
    w: { body: ['#fffbe0', '#ffd96b', '#ff9a2e', '#d9480f'], line: '#4a0e00', detail: '#4a0e00', fl: ['#fff3a0', '#ffb703', '#fb5607', '#d00000@0.85'] },
    b: { body: ['#55403c', '#26171a', '#10080a', '#030102'], line: '#ff7a1a', detail: '#ffb347', fl: ['#ffe1a8', '#ff4d6d', '#c1121f', '#5a0010@0.9'] },
    defs: c => grad('fl', c.fl, 0, 44, 0, 0) + grad('core', ['#ffffff', '#fff3a0', '#ffd166@0.2'], 0, 42, 0, 14),
    back(t, c) {
      const F = 'url(#fl)', C = 'url(#core)';
      if (t === 'N') return flame(33, 38, 34, 14, 5, F) + flame(39, 38, 22, 9, 4, F) + flame(27, 36, 24, 9, 2, F) +
        flame(33, 37, 22, 7, 4, C, 0.85) + flame(8, 41, 12, 6, -3, F);
      const top = ty(M[t].top), h = 40 - top + 6;
      return flame(22.5, 38, h, 26, 0, F) + flame(9, 39, h * 0.62, 11, -4, F) + flame(36, 39, h * 0.62, 11, 4, F) +
        flame(4.5, 41, h * 0.36, 6.5, -2.5, F) + flame(40.5, 41, h * 0.36, 6.5, 2.5, F) +
        flame(22.5, 37, h * 0.7, 13, 0, C, 0.8);
    },
    skin(t, side) {
      const d = veins(t.charCodeAt(0) * 13 + (side === 'w' ? 3 : 4), 6, 10, 35, 13, 38, 3);
      return side === 'b'
        ? `<path d="${d}" fill="none" stroke="#ff6a00" stroke-opacity=".7" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#ffe08a" stroke-width=".45" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<path d="${d}" fill="none" stroke="#a41b00" stroke-opacity=".4" stroke-width=".55" stroke-linecap="round"/><path d="M6 16L40 6V12L6 24Z" fill="#fff" fill-opacity=".3"/>`;
    },
    front(t, c, side) {
      const m = M[t], x0 = tx(m.x0), x1 = tx(m.x1), r = rng(t.charCodeAt(0) + (side === 'w' ? 50 : 90));
      let s = '';
      const n = Math.max(4, Math.round((x1 - x0) / 4.5));
      for (let i = 0; i <= n; i++) {
        const x = x0 + (x1 - x0) * i / n;
        s += flame(x, 42.2, 3.5 + r() * 3, 3.6, (r() - 0.5) * 2, 'url(#fl)');
      }
      for (let i = 0; i < 5; i++) {
        const x = 4 + r() * 37, y = 2 + r() * 12;
        s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.3 + r() * 0.6)}" fill="#ff7b00" fill-opacity=".35"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(0.5 + r() * 0.35)}" fill="#ffe066"/>`;
      }
      return s;
    },
  },

  // Hoàng kim: tia nắng toả sau lưng, vầng hào quang, thân vàng ròng loáng sáng, vòng nguyệt quế và viên hồng ngọc ở chân
  gold: {
    w: { body: ['#fffbe3', '#ffe27a', '#f0b90b', '#9c6a06'], line: '#4d3300', detail: '#4d3300' },
    b: { body: ['#3e4f98', '#1d285e', '#0d1435', '#04081a'], line: '#f2c94c', detail: '#ffe08a' },
    defs: (c, t) => {
      const cx = t === 'N' ? 30 : 22.5, cy = t === 'N' ? 18 : 22;
      return rgrad('ray', cx, cy, 23, [[0, '#fff6c8', 1], [0.55, '#f5c518', 0.95], [1, '#e09b00', 0]]) +
        grad('lau', ['#fff1a8', '#e8b923', '#9c6a06'], 0, 30, 0, 44);
    },
    back(t, c, side) {
      const cx = t === 'N' ? 30 : 22.5, cy = t === 'N' ? 18 : 22;
      let s = '';
      for (let i = 0; i < 20; i++) {
        const a = i * 18 - 90, R = i % 2 ? 17 : 22.5, w = i % 2 ? 2.6 : 3.4;
        const [dx, dy] = dirOf(a), [ex, ey] = dirOf(a + w), [gx, gy] = dirOf(a - w);
        s += `M${pt(cx + gx * 3, cy + gy * 3)}L${pt(cx + dx * R, cy + dy * R)}L${pt(cx + ex * 3, cy + ey * 3)}Z`;
      }
      let out = `<path d="${s}" fill="url(#ray)"/>`;
      if ('KQB'.includes(t)) {
        const hy = ty(M[t].top) + 2;
        out += `<circle cx="22.5" cy="${f(hy)}" r="6.6" fill="#fff6c8" fill-opacity=".35" stroke="#f7d046" stroke-width="1.3"/><circle cx="22.5" cy="${f(hy)}" r="5.6" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width=".4"/>`;
      }
      return out;
    },
    skin(t, side) {
      return `<path d="M2 30L32 0H38L8 30Z" fill="#fff" fill-opacity="${side === 'w' ? 0.45 : 0.18}"/><path d="M10 38L40 8V11L10 41Z" fill="#fff" fill-opacity="${side === 'w' ? 0.35 : 0.12}"/>` +
        sparkle(30, 15, 1.6, '#fff', 0.95) + sparkle(15, 30, 1.1, '#fff', 0.85);
    },
    front(t, c) {
      let s = '';
      for (const sgn of [-1, 1]) { // hai cành nguyệt quế từ dưới lên hai bên
        const P = u => { // đường cong bậc hai từ (22.5, 43.4) tới (22.5 ± 15, 31)
          const x = (1 - u) ** 2 * 22.5 + 2 * (1 - u) * u * (22.5 + sgn * 15.5) + u * u * (22.5 + sgn * 15);
          const y = (1 - u) ** 2 * 43.4 + 2 * (1 - u) * u * 43 + u * u * 31;
          return [x, y];
        };
        let d = '';
        for (let k = 0; k <= 10; k++) { const [x, y] = P(k / 10); d += (k ? 'L' : 'M') + pt(x, y); }
        s += `<path d="${d}" fill="none" stroke="#6b4a00" stroke-width=".9" stroke-linecap="round"/>`;
        for (let k = 1; k <= 6; k++) {
          const u = k / 6.6, [x, y] = P(u), [x2, y2] = P(u + 0.02);
          const a = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI;
          s += leaf(x, y, a - sgn * 50, 4.2, 1.5, 'url(#lau)', '#6b4a00', '#fff') + leaf(x, y, a + sgn * 40, 3.6, 1.3, 'url(#lau)', '#6b4a00', '#fff');
        }
      }
      s += `<path d="M22.5 40.6L24.6 42.6L22.5 44.6L20.4 42.6Z" fill="#e63946" stroke="#5a0a10" stroke-width=".55" stroke-linejoin="round"/><path d="M22.5 41.3L23.6 42.4L22.5 42.8Z" fill="#fff" fill-opacity=".8"/>`;
      return s;
    },
  },

  // Rừng thiêng: tán lá xoè sau lưng, vân gỗ trên thân, thảm rêu, chồi non, hoa và nấm ở chân
  forest: {
    w: { body: ['#fffbea', '#f0e3b9', '#cfb27c', '#8f6d3c'], line: '#2b2410', detail: '#2b2410', lf: ['#d6f59a', '#79c74f', '#2e7d32'], moss: '#8fcf5a' },
    b: { body: ['#62733a', '#33421f', '#1a240f', '#080c04'], line: '#070a03', detail: '#d8f0a8', lf: ['#ffe08a', '#f4a03a', '#c0392b'], moss: '#4f9a3a', ln: '#5a1a08', vein: '#fff3c4' },
    defs: c => grad('lf', c.lf, 0, 4, 0, 40),
    back(t, c) { // quân Trắng: lá non mùa xuân; quân Đen: lá thu đỏ cam (nổi rõ thân quân tối)
      const F = 'url(#lf)', ln = c.ln || '#10300f', vein = c.vein || '#eaffc8';
      if (t === 'N') return [[33, 38, -74, 27, 5.6], [36, 38, -48, 21, 5], [37, 39, -24, 14, 4.2], [30, 37, -100, 19, 4.8], [9, 41, -132, 9, 3]]
        .map(l => leaf(...l, F, ln, vein)).join('');
      const L = t === 'P' ? 0.8 : t === 'R' ? 0.88 : 1;
      return [[22.5, 37, -90, 33 * L, 6.4], [20, 37, -118, 26 * L, 5.6], [25, 37, -62, 26 * L, 5.6], [17, 38, -150, 17 * L, 4.4], [28, 38, -30, 17 * L, 4.4]]
        .map(l => leaf(...l, F, ln, vein)).join('');
    },
    skin(t, side) {
      const r = rng(t.charCodeAt(0) * 3 + (side === 'w' ? 5 : 6)); let d = '';
      for (let i = 0; i < 7; i++) {
        const x = 9 + i * 4.2 + r() * 1.5;
        d += `M${pt(x, 6)}C${pt(x + 2.2, 15)} ${pt(x - 2.2, 25)} ${pt(x + 0.6, 34)}S${pt(x - 1, 40)} ${pt(x, 44)}`;
      }
      const col = side === 'w' ? '#8f6d3c' : '#a5d46a';
      return `<path d="${d}" fill="none" stroke="${col}" stroke-opacity="${side === 'w' ? 0.45 : 0.3}" stroke-width=".5"/>` +
        `<ellipse cx="27" cy="27" rx="1.6" ry="2.4" fill="none" stroke="${col}" stroke-opacity=".5" stroke-width=".45"/>`;
    },
    front(t, c, side) {
      const m = M[t], x0 = tx(m.x0) - 1, x1 = tx(m.x1) + 1;
      const ln = c.ln || '#10300f', vein = c.vein || '#eaffc8';
      let s = leaf(x0 + 1.5, 41, -128, 7.5, 2.4, 'url(#lf)', ln, vein) + leaf(x1 - 1.5, 41, -52, 7.5, 2.4, 'url(#lf)', ln, vein);
      s += mound(x0 + 1.5, x1 - 1.5, 40.3, 2, c.moss, '#1d4d14', t.charCodeAt(0) + 11);
      // hoa nhỏ bên trái
      const fx = x0 + 3.5, fy = 40.6;
      for (let i = 0; i < 5; i++) { const [dx, dy] = dirOf(i * 72 - 90); s += `<circle cx="${f(fx + dx * 1.15)}" cy="${f(fy + dy * 1.15)}" r=".95" fill="#fff" stroke="#c75b8a" stroke-width=".3"/>`; }
      s += `<circle cx="${f(fx)}" cy="${f(fy)}" r=".7" fill="#ffd23f"/>`;
      // nấm đỏ bên phải
      const mx = x1 - 3.8, my = 41.6;
      s += `<path d="M${pt(mx - 0.6, my)}L${pt(mx - 0.5, my - 1.8)}H${pt(mx + 0.5, my - 1.8).split(',')[0]}L${pt(mx + 0.6, my)}Z" fill="#fff4dc" stroke="#5a3a1a" stroke-width=".3"/>` +
        `<path d="M${pt(mx - 2, my - 1.6)}Q${pt(mx, my - 4.4)} ${pt(mx + 2, my - 1.6)}Z" fill="#e63946" stroke="#5a0a10" stroke-width=".35"/>` +
        `<circle cx="${f(mx - 0.7)}" cy="${f(my - 2.5)}" r=".35" fill="#fff"/><circle cx="${f(mx + 0.8)}" cy="${f(my - 2.2)}" r=".3" fill="#fff"/>`;
      return s;
    },
  },

  // Thiên hà: tinh vân phát sáng sau lưng, thân quân chứa bụi sao, vành hành tinh vòng qua quân, hành tinh / trăng khuyết
  galaxy: {
    w: { body: ['#ffffff', '#efeaff', '#c6b8ff', '#8a72f0'], line: '#1e0f4d', detail: '#1e0f4d', neb: ['#ff5fd2', '#7b5cff'], ring: ['#ffe28a', '#ff8fd8', '#a78bff'] },
    b: { body: ['#6a3fbf', '#2f1668', '#140935', '#05020f'], line: '#cdbdff', detail: '#e6dcff', neb: ['#3ad1ff', '#5b3cff'], ring: ['#a8f4ff', '#3ad1ff', '#7b5cff'] },
    defs: (c, t) => rgrad('neb', t === 'N' ? 27 : 22.5, 22, 22, [[0, c.neb[0], 0.55], [0.5, c.neb[1], 0.3], [1, c.neb[1], 0]]) +
      grad('ring', c.ring, 2, 30, 43, 30) + rgrad('pl', 39.2, 7.8, 3.4, [[0, '#ffffff', 1], [0.45, c.ring[0], 1], [1, c.ring[2], 1]]),
    back(t, c, side) {
      let s = `<circle cx="${t === 'N' ? 27 : 22.5}" cy="22" r="22" fill="url(#neb)"/>`;
      const r = rng(t.charCodeAt(0) * 17 + (side === 'w' ? 7 : 8));
      for (let i = 0; i < 9; i++) s += `<circle cx="${f(2 + r() * 41)}" cy="${f(1.5 + r() * 26)}" r="${f(0.25 + r() * 0.35)}" fill="#fff"/>`;
      s += sparkle(5, 6, 1.9, '#fff') + sparkle(6.5, 25, 1.1, '#fff', 0.9) + sparkle(39.5, 33, 1.2, '#fff', 0.9);
      if (t === 'N') s += `<path d="M37.5 3.2a5.2 5.2 0 1 0 4.4 8.6a4.3 4.3 0 1 1 -4.4 -8.6Z" fill="${c.ring[0]}" stroke="${c.line === '#cdbdff' ? '#1a0b40' : '#1e0f4d'}" stroke-width=".5"/>`;
      else s += `<circle cx="39.2" cy="7.8" r="3.2" fill="url(#pl)" stroke="#1e0f4d" stroke-width=".45"/><ellipse cx="39.2" cy="7.8" rx="5.2" ry="1.3" transform="rotate(-20 39.2 7.8)" fill="none" stroke="${c.ring[1]}" stroke-width=".6"/>`;
      // nửa sau của vành (khuất sau quân)
      s += `<g transform="rotate(-12 22.5 31)"><path d="M2.5 31A20 5.4 0 0 1 42.5 31" fill="none" stroke="url(#ring)" stroke-width="1.5" stroke-opacity=".85"/></g>`;
      return s;
    },
    skin(t, side) {
      const r = rng(t.charCodeAt(0) * 29 + (side === 'w' ? 9 : 10));
      let s = side === 'w'
        ? `<circle cx="16" cy="24" r="9" fill="#ff8fd8" fill-opacity=".3"/><circle cx="29" cy="32" r="8" fill="#7bdcff" fill-opacity=".25"/>`
        : `<circle cx="16" cy="24" r="9" fill="#3ad1ff" fill-opacity=".28"/><circle cx="29" cy="32" r="8" fill="#ff5fd2" fill-opacity=".26"/>`;
      const dot = side === 'w' ? '#4b2bb8' : '#ffffff';
      for (let i = 0; i < 26; i++) s += `<circle cx="${f(7 + r() * 31)}" cy="${f(6 + r() * 34)}" r="${f(0.2 + r() * 0.38)}" fill="${dot}" fill-opacity="${f(0.5 + r() * 0.5)}"/>`;
      return s + sparkle(19, 20, 1.3, side === 'w' ? '#6a4cff' : '#fff');
    },
    front() { // nửa trước của vành, vắt ngang thân quân
      return `<g transform="rotate(-12 22.5 31)"><path d="M42.5 31A20 5.4 0 0 1 2.5 31" fill="none" stroke="#0b0420" stroke-opacity=".5" stroke-width="2.6"/><path d="M42.5 31A20 5.4 0 0 1 2.5 31" fill="none" stroke="url(#ring)" stroke-width="1.6"/><path d="M38 34.2A20 5.4 0 0 1 8 34.6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".4"/></g>`;
    },
  },
};

function build(name, skin, side, t) {
  const src = fs.readFileSync(path.join(DIR, side + t + '.svg'), 'utf8');
  const c = skin[side];
  const defs = grad('body', c.body) + skin.defs(c, t) +
    `<mask id="sil" maskUnits="userSpaceOnUse" x="0" y="0" width="45" height="45"><g ${T}>${silhouette(src)}</g></mask>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme:light only" width="45" height="45" viewBox="0 0 45 45">` +
    `<defs>${defs}</defs>` +
    `<g>${skin.back(t, c, side)}</g>` +
    `<g ${T}>${paint(src, side, c)}</g>` +
    `<g mask="url(#sil)">${skin.skin(t, side)}</g>` +
    `<g>${skin.front(t, c, side)}</g></svg>`;
}

for (const [name, skin] of Object.entries(SKINS)) {
  const dir = path.join(DIR, name);
  fs.mkdirSync(dir, { recursive: true });
  let bytes = 0;
  for (const side of ['w', 'b']) for (const t of PIECES) {
    const svg = build(name, skin, side, t);
    bytes += svg.length;
    fs.writeFileSync(path.join(dir, side + t + '.svg'), svg);
  }
  console.log(`pieces/${name}/ (12 quân, ${(bytes / 1024).toFixed(1)} KB)`);
}
