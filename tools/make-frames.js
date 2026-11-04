// Vẽ các khung avatar: node tools/make-frames.js  → ghi ra img/frames/<khung>.svg
// Mỗi khung là ảnh 150×150 đặt đè lên avatar. Avatar nằm giữa, chiếm ô 100×100 (từ 25 tới 125), bo góc khoảng 22;
// style.css đặt khung lớn hơn avatar 50%. Thêm khung: thêm một mục vào FRAMES ở đây, rồi vào FRAMES (app.js), FRAME_KEYS (profile.js).
//
// Vì sao trông có khối: kim loại dùng bộ lọc ánh sáng thật (#bev: feDiffuseLighting + feSpecularLighting), nên mọi hình
// đều có cạnh vát và vệt bóng theo cùng một hướng sáng từ góc trên trái. Mép trong khung đổ bóng lên avatar (recess)
// để avatar như nằm lõm vào. Không dùng nét viền đen dày; đường nét là tông tối của chính vật liệu.

const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'img', 'frames');

const S = 150, C = 75;
const n = v => +v.toFixed(2);
const pt = (x, y) => `${n(x)} ${n(y)}`;
const dir = a => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)];
const rr = (i, r) => {
  const a = i, b = S - i;
  return `M${n(a + r)} ${n(a)}H${n(b - r)}Q${n(b)} ${n(a)} ${n(b)} ${n(a + r)}V${n(b - r)}Q${n(b)} ${n(b)} ${n(b - r)} ${n(b)}H${n(a + r)}Q${n(a)} ${n(b)} ${n(a)} ${n(b - r)}V${n(a + r)}Q${n(a)} ${n(a)} ${n(a + r)} ${n(a)}Z`;
};
const band = (i0, r0, i1, r1) => rr(i0, r0) + rr(i1, r1);
const stops = l => l.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('');
const lg = (id, l, x1 = 0, y1 = 0, x2 = S, y2 = S) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(l)}</linearGradient>`;
const rg = (id, l, r = 80, cx = C, cy = C) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops(l)}</radialGradient>`;
const blur = (id, d) => `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${d}"/></filter>`;
// Bộ lọc khối nổi: chiếu sáng theo độ dày của hình, nhân với màu gốc rồi cộng vệt bóng
const bevel = (id, soft = 1.1, scale = 3.2, exp = 26, spec = .9) => `<filter id="${id}" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">` +
  `<feGaussianBlur in="SourceAlpha" stdDeviation="${soft}" result="a"/>` +
  `<feDiffuseLighting in="a" surfaceScale="${scale}" diffuseConstant="1.05" lighting-color="#fff" result="d"><feDistantLight azimuth="235" elevation="58"/></feDiffuseLighting>` +
  `<feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1.15" k2="0" k3="0" k4="0" result="lit"/>` +
  `<feSpecularLighting in="a" surfaceScale="${scale}" specularConstant="${spec}" specularExponent="${exp}" lighting-color="#fff" result="s"><feDistantLight azimuth="235" elevation="52"/></feSpecularLighting>` +
  `<feComposite in="s" in2="SourceAlpha" operator="in" result="ss"/>` +
  `<feComposite in="lit" in2="ss" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="o"/>` +
  `<feComposite in="o" in2="SourceAlpha" operator="in"/></filter>`;
const shadow = id => `<filter id="${id}" x="-15%" y="-15%" width="130%" height="130%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.6" flood-color="#000" flood-opacity=".55"/></filter>`;
// Mép trong đổ bóng lên avatar: avatar như nằm lõm dưới khung
const recess = (c = '#000', o = .6) => `<path d="${rr(28.5, 19)}" fill="none" stroke="${c}" stroke-opacity="${o}" stroke-width="3.2" filter="url(#rcs)"/>`;
const RCS = blur('rcs', 1.4);

// Vàng / bạc nhiều dải như kim loại đánh bóng
const GOLD = [[0, '#fff8d6'], [.14, '#f4cf63'], [.3, '#a8761a'], [.42, '#ffeeA6'], [.55, '#d8a22f'], [.68, '#8a5c0d'], [.82, '#f7d873'], [1, '#7a4e08']];
const STEEL = [[0, '#f4f6ff'], [.16, '#9aa2c4'], [.32, '#4a4f72'], [.46, '#dfe3f7'], [.6, '#7a80a4'], [.76, '#2c2f4c'], [.9, '#b9bfdc'], [1, '#3a3d5c']];

// Đá quý tròn có độ bóng: viền kim loại + thân + quầng tối + vệt sáng
let gemN = 0;
function cabochon(x, y, r, c1, c2, c3) {
  const id = `gm${++gemN}`;
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(x - r * .3)}" cy="${n(y - r * .35)}" r="${n(r * 1.5)}">${stops([[0, c1], [.45, c2], [1, c3]])}</radialGradient>` +
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r + 1.3)}" fill="url(#metal)" filter="url(#bevS)"/>` +
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#${id})"/>` +
    `<ellipse cx="${n(x - r * .32)}" cy="${n(y - r * .4)}" rx="${n(r * .36)}" ry="${n(r * .22)}" fill="#fff" fill-opacity=".9" transform="rotate(-30 ${n(x - r * .32)} ${n(y - r * .4)})"/>` +
    `<path d="M${pt(x + r * .55, y + r * .3)}A${n(r * .75)} ${n(r * .75)} 0 0 1 ${pt(x - r * .1, y + r * .72)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="${n(r * .13)}" stroke-linecap="round"/>`;
}
const RUBY = ['#ffb3bd', '#e0123c', '#5c0015'], SAPPHIRE = ['#b9dcff', '#1565d8', '#07205c'], EMERALD = ['#c8ffdc', '#109a57', '#043a22'], AMBER = ['#fff3b0', '#ff9f1c', '#7a2d00'], AMETHYST = ['#f0d4ff', '#8a2be2', '#2c0a5c'];

// Đá cắt mặt hình thoi
const diamond = (x, y, w, h, light, mid, dark) =>
  `<path d="M${pt(x, y - h)}L${pt(x + w, y)}L${pt(x, y + h)}L${pt(x - w, y)}Z" fill="${mid}"/>` +
  `<path d="M${pt(x, y - h)}L${pt(x + w * .45, y)}L${pt(x, y + h * .45)}L${pt(x - w * .45, y)}Z" fill="${light}"/>` +
  `<path d="M${pt(x, y + h)}L${pt(x + w, y)}L${pt(x + w * .45, y)}L${pt(x, y + h * .45)}Z" fill="${dark}"/>`;

const sparkle = (x, y, r, fill = '#fff', o = 1) => `<path d="M${pt(x, y - r)}Q${pt(x, y)} ${pt(x + r, y)}Q${pt(x, y)} ${pt(x, y + r)}Q${pt(x, y)} ${pt(x - r, y)}Q${pt(x, y)} ${pt(x, y - r)}Z" fill="${fill}" fill-opacity="${o}"/>`;
const mirror = s => `${s}<g transform="translate(${S} 0) scale(-1 1)">${s}</g>`;
const quad = s => `${s}<g transform="translate(${S} 0) scale(-1 1)">${s}</g><g transform="translate(0 ${S}) scale(1 -1)">${s}</g><g transform="rotate(180 ${C} ${C})">${s}</g>`;
// Điểm đều quanh viền
function around(count, i) {
  const out = [], len = S - 2 * i, per = len * 4;
  for (let k = 0; k < count; k++) {
    const d = (k + .5) / count * per;
    let x, y;
    if (d < len) { x = i + d; y = i; } else if (d < 2 * len) { x = S - i; y = i + d - len; } else if (d < 3 * len) { x = S - i - (d - 2 * len); y = S - i; } else { x = i; y = S - i - (d - 3 * len); }
    out.push([n(x), n(y)]);
  }
  return out;
}

// Lưỡi lửa uốn lượn: gốc (x, y), hướng a, cao h, rộng w, curl = độ uốn sang ngang
function tongue(x, y, a, h, w, curl, fill) {
  const [dx, dy] = dir(a), px = -dy, py = dx;
  const P = (t, s) => pt(x + dx * h * t + px * s, y + dy * h * t + py * s);
  return `<path d="M${P(0, -w / 2)}C${P(.3, -w * .7)} ${P(.55, -w * .1 + curl * .5)} ${P(1, curl)}C${P(.68, w * .05 + curl * .6)} ${P(.34, w * .65)} ${P(0, w / 2)}Q${P(-.14, 0)} ${P(0, -w / 2)}Z" fill="${fill}"/>`;
}
// Tinh thể cắt mặt: nửa sáng, nửa tối, viền sáng mảnh, có độ trong
function crystal(x, y, a, h, w) {
  const [dx, dy] = dir(a), px = -dy, py = dx;
  const P = (t, s) => pt(x + dx * h * t + px * w * s, y + dy * h * t + py * w * s);
  return `<path d="M${P(0, -.38)}L${P(.7, -.5)}L${P(1, 0)}L${P(.7, 0)}L${P(0, 0)}Z" fill="url(#iceL)"/>` +
    `<path d="M${P(0, .38)}L${P(.7, .5)}L${P(1, 0)}L${P(.7, 0)}L${P(0, 0)}Z" fill="url(#iceD)"/>` +
    `<path d="M${P(.7, -.5)}L${P(.7, .5)}" stroke="#fff" stroke-opacity=".55" stroke-width=".6"/>` +
    `<path d="M${P(0, -.38)}L${P(.7, -.5)}L${P(1, 0)}L${P(.7, .5)}L${P(0, .38)}" fill="none" stroke="#f2fbff" stroke-width=".8" stroke-linejoin="round"/>`;
}
// Lá: hai mép cong, nửa sáng nửa tối theo gân giữa
function leaf(x, y, a, h, w, fillL, fillD) {
  const [dx, dy] = dir(a), px = -dy, py = dx;
  const P = (t, s) => pt(x + dx * h * t + px * w * s, y + dy * h * t + py * w * s);
  return `<path d="M${pt(x, y)}C${P(.3, -1)} ${P(.72, -.72)} ${P(1, 0)}Z" fill="${fillL}"/><path d="M${pt(x, y)}C${P(.3, 1)} ${P(.72, .72)} ${P(1, 0)}Z" fill="${fillD}"/><path d="M${pt(x, y)}L${P(.94, 0)}" stroke="#ffffff" stroke-opacity=".4" stroke-width=".5"/>`;
}
// Tia sét sắc nét
function bolt(x, y, a, h, w, fill) {
  const [dx, dy] = dir(a), px = -dy, py = dx;
  const P = (t, s) => pt(x + dx * h * t + px * w * s, y + dy * h * t + py * w * s);
  return `<path d="M${P(0, -.34)}L${P(.54, -.5)}L${P(.46, -.08)}L${P(1, .24)}L${P(.5, .46)}L${P(.58, .08)}L${P(0, .3)}Z" fill="${fill}"/>`;
}

const FRAMES = {
  // VƯƠNG MIỆN: vàng ròng đánh bóng, rãnh hạt cườm, bốn góc gắn hồng ngọc, vương miện chạm nổi và huy hiệu nguyệt quế
  crown() {
    const defs = lg('metal', GOLD) + lg('metalV', GOLD, 0, 0, 0, 40) + bevel('bev') + bevel('bevS', .6, 2, 20, .7) + shadow('sh') + RCS;
    let s = recess();
    let body = `<path d="${band(15, 30, 26.5, 20)}" fill="url(#metal)" fill-rule="evenodd"/>`;
    // góc trang trí dạng lá cuốn
    const corner = `<path d="M17 45C13 33 15 22 21 19C24 13 34 11 45 16C39 19 34 21 30 24C28 29 25 36 24 42C22 44 19 46 17 45Z" fill="url(#metal)"/>`;
    body += quad(corner);
    s += `<g filter="url(#sh)"><g filter="url(#bev)">${body}</g></g>`;
    // rãnh giữa viền + hạt cườm
    s += `<path d="${rr(20.5, 25.5)}" fill="none" stroke="#3a2400" stroke-opacity=".75" stroke-width="3"/>`;
    s += around(52, 20.5).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#ffe99a"/>`).join('');
    s += `<path d="${rr(26.5, 20)}" fill="none" stroke="#5c3b06" stroke-width="1"/>`;
    // đá 4 góc
    for (const [x, y] of [[23, 23], [127, 23], [23, 127], [127, 127]]) s += cabochon(x, y, 5.4, ...RUBY);
    // cành nguyệt quế dưới đáy
    let lau = '';
    for (let k = 0; k < 6; k++) {
      const x = 84 + k * 7, y = 142 - k * 1.1 - (k * k) * .12, tilt = -14 - k * 3;
      lau += leaf(x, y, tilt - 26, 10.5, 2.9, 'url(#metal)', '#8a5c0d') + leaf(x, y, tilt + 34, 9.5, 2.6, 'url(#metal)', '#7a4e08');
    }
    lau = `<path d="M78 143.500C96 143 112 140 124 132" fill="none" stroke="#7a4e08" stroke-width="1.300"/>` + lau;
    s += `<g filter="url(#sh)">${mirror(lau)}</g>`;
    s += cabochon(C, 138, 6, ...SAPPHIRE);
    // vương miện
    const X = x => C + x;
    const cr = `<path d="M${X(-29)} 27L${X(-33)} 11L${X(-20)} 19L${X(-14)} 6L${X(-6)} 17L${X(0)} 1.500L${X(6)} 17L${X(14)} 6L${X(20)} 19L${X(33)} 11L${X(29)} 27Z" fill="url(#metalV)"/>` +
      `<rect x="${X(-30.5)}" y="24.500" width="61" height="7" rx="2.500" fill="url(#metalV)"/>`;
    s += `<g filter="url(#sh)"><g filter="url(#bev)">${cr}</g></g>`;
    s += `<path d="M${X(-26)} 26H${X(26)}" stroke="#5c3b06" stroke-opacity=".7" stroke-width=".8"/>`;
    for (const [x, y, r, g] of [[0, 3.4, 2.8, RUBY], [-14, 7.6, 2.3, SAPPHIRE], [14, 7.6, 2.3, SAPPHIRE], [-33, 11.6, 2.2, EMERALD], [33, 11.6, 2.2, EMERALD]]) s += cabochon(X(x), y, r, ...g);
    s += cabochon(C, 28, 3.3, ...RUBY);
    for (const x of [-20, -10, 10, 20]) s += diamond(X(x), 28, 2.4, 2.4, '#e8f6ff', '#79b8ff', '#2a5fb0');
    return [defs, s];
  },

  // LONG HỎA: lửa uốn lượn nhiều lớp sau lưng, viền vảy đá đen có khe dung nham, sừng rồng ngà và mắt rồng hổ phách
  dragon() {
    const defs = rg('fO', [[.5, '#ff9a1f'], [.7, '#f4410c'], [.9, '#b50d0d'], [1, '#5a0000', .9]], 96) +
      rg('fM', [[.5, '#ffe14d'], [.72, '#ffa51f'], [1, '#f2460f']], 92) +
      rg('fI', [[.5, '#fffde8'], [.72, '#ffe77a'], [1, '#ffb52e']], 86) +
      lg('metal', [[0, '#574341'], [.3, '#201212'], [.55, '#4a3330'], [.8, '#150b0b'], [1, '#3a2522']]) +
      lg('horn', [[0, '#ffd27a'], [.22, '#c8561a'], [.5, '#4a2a22'], [1, '#160b0b']], 26, 0, 66, 24) +
      bevel('bev', 1, 3, 30, .75) + bevel('bevS', .6, 2, 20, .6) + shadow('sh') + blur('gl', 3) + blur('gl2', 1.1) + RCS;
    // Lửa: lưỡi lửa cong đan vào nhau, dài ngắn xen kẽ, cùng cuốn lên trên như đang bốc. [x, y, góc, cao, rộng, uốn]
    const F = [
      [28, 30, -128, 30, 20, 9], [41, 21, -108, 26, 18, -8], [18, 42, -150, 25, 18, 9], [58, 19, -96, 22, 15, 6],
      [15, 58, -166, 22, 16, 9], [15, 73, -176, 17, 14, 8], [15, 88, -186, 21, 15, 9], [16, 103, -198, 18, 14, 8],
      [20, 118, 150, 19, 15, 8], [32, 130, 122, 17, 15, 8], [48, 134, 104, 14, 13, -6], [64, 135, 92, 11, 11, 5],
    ];
    const fl = (fill, k) => F.map(([x, y, a, h, w, c]) => tongue(x, y, a, h * k, w * (.35 + k * .65), c * k, fill)).join('');
    // lõi lửa liền sau viền để các lưỡi không rời rạc
    let s = `<path d="${rr(11, 32)}" fill="none" stroke="#ff4d00" stroke-width="12" opacity=".55" filter="url(#gl)"/>`;
    s += `<g filter="url(#gl)" opacity=".8">${mirror(fl('#ff3c00', 1.06))}</g>` + mirror(fl('url(#fO)', 1)) + mirror(fl('url(#fM)', .74)) + mirror(fl('url(#fI)', .48));
    s += recess('#000', .75);
    s += `<g filter="url(#sh)"><path d="${band(16, 28, 26.5, 20)}" fill="url(#metal)" fill-rule="evenodd" filter="url(#bev)"/></g>`;
    // vảy trên viền
    s += around(40, 21).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="none" stroke="#000" stroke-opacity=".55" stroke-width=".8"/>`).join('');
    // khe dung nham phát sáng
    const cracks = `<path d="M46 19L60 22L68 19L82 22L98 19M131 44L128 60L131 72L128 92L131 106M104 131L88 128L74 131L60 128L44 131M19 106L22 90L19 76L22 60L19 44" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    s += `${cracks} stroke="#ff5a00" stroke-width="3.2" filter="url(#gl2)"/>${cracks} stroke="#ffd98a" stroke-width="1"/>`;
    s += `<path d="${rr(26.5, 20)}" fill="none" stroke="#ff7a1a" stroke-width="1.100"/>`;
    // sừng
    const horn = `<path d="M50 24C42 20 34 14 26 1C42 5 56 9 66 20C62 22 56 23 50 24Z" fill="url(#horn)"/>` +
      `<path d="M50 20C44 16 38 12 33 7M56 20C50 15 44 11 38 8" stroke="#000" stroke-opacity=".5" stroke-width=".9" fill="none"/>`;
    s += `<g filter="url(#sh)"><g filter="url(#bevS)">${mirror(horn)}</g></g>`;
    // mắt rồng
    const eye = `<path d="M${C} 7L${C + 13} 19L${C} 31L${C - 13} 19Z" fill="url(#metal)"/>`;
    s += `<g filter="url(#sh)"><g filter="url(#bevS)">${eye}</g></g>`;
    s += `<path d="M${C} 11L${C + 8.500} 19L${C} 27L${C - 8.500} 19Z" fill="url(#eyeG)"/><ellipse cx="${C}" cy="19" rx="1.500" ry="6.800" fill="#1a0500"/><ellipse cx="${C - 3}" cy="16" rx="1.800" ry="1.100" fill="#fff" fill-opacity=".85"/>`;
    return [defs + rg('eyeG', [[0, '#fff3a0'], [.5, '#ff9f1c'], [1, '#a83200']], 11, C, 19), s];
  },

  // BĂNG TINH: viền băng trong suốt, cụm tinh thể cắt mặt ở bốn góc và trên đỉnh, sương giá mảnh, lấp lánh
  frost() {
    const defs = lg('iceL', [[0, '#ffffff'], [.5, '#d4f2ff', .95], [1, '#8fd6fa', .85]]) + lg('iceD', [[0, '#a8e2ff', .95], [.5, '#4aa8e6', .9], [1, '#1c64ae', .9]]) +
      lg('glass', [[0, '#d9f4ff'], [.18, '#7cc6ee'], [.36, '#2f86c8'], [.52, '#a9e2fb'], [.7, '#2a7cc0'], [.86, '#7fcbf0'], [1, '#2f7fbf']]) + blur('gl', 3.2) + bevel('bev', .8, 2.2, 46, .85) + RCS;
    let s = `<path d="${rr(17, 28)}" fill="none" stroke="#7fdcff" stroke-width="5" opacity=".6" filter="url(#gl)"/>`;
    s += recess('#04223f', .55);
    const cl = [[24, 24, -135, 26, 11], [24, 24, -162, 19, 8], [24, 24, -108, 19, 8], [22, 30, -178, 12, 5.500], [30, 22, -92, 12, 5.500]];
    const corners = cl.map(c => crystal(...c)).join('');
    s += quad(corners);
    s += `<path d="${band(17, 28, 26.5, 20)}" fill="url(#glass)" fill-rule="evenodd" filter="url(#bev)"/>`;
    s += `<path d="${rr(26.5, 20)}" fill="none" stroke="#e8f9ff" stroke-width="1"/><path d="${rr(17.5, 27.5)}" fill="none" stroke="#e8f9ff" stroke-opacity=".85" stroke-width=".7"/>`;
    // vân sương trên viền
    const fr = `M40 19L47 22L52 19.500M50 21L54 24M100 19L106 22L111 19.500M109 21L112 24M131 42L128 49L130.500 54M129 52L126 56M131 96L128 103L130.500 108M129 106L126 110M110 131L103 128L98 130.500M100 129L96 126M50 131L43 128L38 130.500M40 129L36 126M19 108L22 101L19.500 96M21 98L24 94M19 54L22 47L19.500 42M21 44L24 40`;
    s += `<path d="${fr}" fill="none" stroke="#fff" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round"/>`;
    // tinh thể trên đỉnh và dưới đáy
    s += crystal(C, 19, -90, 19, 10) + crystal(C - 7, 19, -112, 13, 7) + crystal(C + 7, 19, -68, 13, 7);
    s += crystal(C, 131, 90, 14, 8) + crystal(C - 6, 131, 112, 9, 5.500) + crystal(C + 6, 131, 68, 9, 5.500);
    for (const [x, y, r] of [[C, 3.500, 3.600], [10, 10, 3.200], [140, 10, 3.200], [10, 140, 2.800], [140, 140, 2.800], [8, C, 2.600], [142, C, 2.600]]) s += sparkle(x, y, r);
    return [defs, s];
  },

  // ÁNH NEON: khung kính tối, hai ống đèn chạy song song, hoạ tiết nghệ thuật Art Deco ở đỉnh và đáy, nút sáng bốn góc
  neon() {
    const defs = blur('g1', 1.3) + blur('g2', 3) + lg('gl', [[0, '#1c1040', .94], [.5, '#0a0620', .96], [1, '#1a0b38', .94]]) + RCS;
    const tube = (d, c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w + 2.200}" opacity=".5" filter="url(#g2)"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w + .8}" opacity=".85" filter="url(#g1)"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff" stroke-width="${n(w * .36)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    let s = recess('#000', .7) + `<path d="${band(15.5, 29, 26.5, 20)}" fill="url(#gl)" fill-rule="evenodd"/>`;
    s += tube(rr(16.5, 28), '#19f6ff', 1.700) + tube(rr(25.5, 20.5), '#ff2bd6', 1.500);
    // Art Deco trên đỉnh + dưới đáy
    const deco = (y, k) => {
      const Y = v => y + k * v;
      return tube(`M${C - 24} ${Y(0)}L${C} ${Y(-14)}L${C + 24} ${Y(0)}`, '#ffe14d', 1.500) + tube(`M${C - 12} ${Y(0)}L${C} ${Y(-7)}L${C + 12} ${Y(0)}`, '#19f6ff', 1.200);
    };
    s += deco(16, 1) + deco(134, -1);
    s += `<circle cx="${C}" cy="2.800" r="2.800" fill="#ffe14d" filter="url(#g1)"/><circle cx="${C}" cy="2.800" r="1.400" fill="#fff"/><circle cx="${C}" cy="147.200" r="2.800" fill="#ffe14d" filter="url(#g1)"/><circle cx="${C}" cy="147.200" r="1.400" fill="#fff"/>`;
    // nút góc hình thoi
    const nodes = [[21, 21], [129, 21], [21, 129], [129, 129]];
    for (const [x, y] of nodes) s += tube(`M${x} ${y - 7}L${x + 7} ${y}L${x} ${y + 7}L${x - 7} ${y}Z`, '#ffe14d', 1.300);
    // hai bên
    for (const x of [8, 142]) s += tube(`M${x} 60V90`, '#ff2bd6', 1.500);
    return [defs, s];
  },

  // THIÊN HÀ: viền bầu trời sao có tinh vân, vành hợp kim bạc, quỹ đạo sáng vắt qua hai góc, hành tinh phát sáng và trăng khuyết
  galaxy() {
    const defs = lg('sky', [[0, '#34137e'], [.28, '#0b0426'], [.5, '#3a0f6e'], [.72, '#07132e'], [1, '#2a0e66']]) +
      rg('nb1', [[0, '#ff4fd0', .95], [.6, '#a02be0', .5], [1, '#a02be0', 0]], 34, 118, 124) + rg('nb2', [[0, '#35d6ff', .9], [.6, '#3b5bff', .45], [1, '#3b5bff', 0]], 34, 30, 28) +
      lg('metal', [[0, '#f6f2ff'], [.2, '#a595d8'], [.45, '#ffffff'], [.7, '#6a5ca8'], [1, '#d8cfff']]) + lg('orb', [[0, '#a8f4ff'], [.5, '#ff9fe0'], [1, '#ffe28a']], 0, 150, 150, 0) +
      rg('pl', [[0, '#fff6dc'], [.42, '#ffb36b'], [.8, '#c8431a'], [1, '#4a1208']], 15, 122, 21) + rg('hal', [[0, '#ffb36b', .75], [1, '#ffb36b', 0]], 24, 126, 25) + rg('hal2', [[0, '#fff2c0', .55], [1, '#fff2c0', 0]], 22, 24, 126) + lg('moon', [[0, '#fffbe0'], [.6, '#ffe28a'], [1, '#d9a531']], 12, 110, 36, 142) +
      `<clipPath id="bc"><path d="${band(16, 29, 26.5, 20)}" clip-rule="evenodd"/></clipPath>` + blur('gl', 3.5) + bevel('bevS', .55, 1.8, 30, 1) + RCS;
    let s = `<path d="${rr(16, 29)}" fill="none" stroke="#8a5cff" stroke-width="7" opacity=".55" filter="url(#gl)"/>`;
    s += recess('#000', .7);
    s += `<path d="${band(16, 29, 26.5, 20)}" fill="url(#sky)" fill-rule="evenodd"/>`;
    s += `<g clip-path="url(#bc)"><rect width="150" height="150" fill="url(#nb1)"/><rect width="150" height="150" fill="url(#nb2)"/>`;
    const st = [[30, 19, .9], [44, 22, .6], [58, 19, 1], [76, 21.500, .6], [92, 19, .9], [108, 22, .6], [128, 42, .8], [131, 58, .6], [128, 74, 1], [131, 92, .6], [128, 108, .8], [112, 131, .9], [96, 128, .6], [78, 131, 1], [60, 128, .6], [42, 131, .8], [19, 108, .9], [22, 92, .6], [19, 76, 1], [22, 58, .6], [19, 44, .8]];
    s += st.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join('') + `</g>`;
    s += `<g filter="url(#bevS)"><path d="${band(15, 30, 16.8, 28.5)}" fill="url(#metal)" fill-rule="evenodd"/><path d="${band(25.5, 20.5, 26.8, 19.5)}" fill="url(#metal)" fill-rule="evenodd"/></g>`;
    // quỹ đạo: bóng tối + vệt sáng
    const o1 = 'M98 6C126 2 148 22 145 52', o2 = 'M5 98C2 126 22 148 52 145';
    for (const d of [o1, o2]) s += `<path d="${d}" fill="none" stroke="#0a0322" stroke-opacity=".8" stroke-width="4.200" stroke-linecap="round"/><path d="${d}" fill="none" stroke="url(#orb)" stroke-width="2.400" stroke-linecap="round"/>`;
    // hành tinh có vành
    s += `<circle cx="124" cy="24" r="22" fill="url(#hal)"/><ellipse cx="124" cy="24" rx="17.500" ry="4.200" transform="rotate(-22 124 24)" fill="none" stroke="#ffe7b0" stroke-opacity=".5" stroke-width="2.600"/>`;
    s += `<circle cx="124" cy="24" r="10.500" fill="url(#pl)"/><path d="M114 22C118 25 128 25 134 21M115 28C120 30 128 30 132 27" fill="none" stroke="#7a2a10" stroke-opacity=".45" stroke-width="1.100"/>`;
    s += `<path d="M107.800 30.500A17.500 4.200 -22 0 0 140.200 17.500" fill="none" stroke="#fff3cf" stroke-width="2.200" stroke-linecap="round"/>`;
    // trăng khuyết
    s += `<circle cx="24" cy="126" r="20" fill="url(#hal2)"/><path d="M34 110A16.500 16.500 0 1 0 34 142A20 20 0 0 1 34 110Z" fill="url(#moon)" filter="url(#bevS)"/>`;
    for (const [x, y, r, c] of [[14, 14, 6.500, '#fff'], [136, 136, 5, '#fff'], [C, 8, 3.200, '#a8f4ff'], [C, 143, 3, '#ffc4ef'], [7, C, 2.800, '#fff'], [143, C, 2.800, '#fff']]) s += sparkle(x, y, r, c);
    return [defs, s];
  },

  // CỔ THỤ: gỗ mun chạm khắc, đường khảm vàng, vòng lá ngọc lục bảo ôm hai bên gặp nhau trên đỉnh, ngọc và hoa vàng
  forest() {
    const defs = lg('wood', [[0, '#6b4322'], [.22, '#2e1a0c'], [.45, '#5a3618'], [.7, '#22130a'], [1, '#4a2c13']]) + lg('metal', GOLD) +
      lg('lL', [[0, '#dcffb0'], [.5, '#7ed957'], [1, '#2e9e4f']]) + lg('lD', [[0, '#49b85a'], [.5, '#1c7a3e'], [1, '#0d4a28']]) +
      bevel('bev', 1, 3, 24, .55) + bevel('bevS', .6, 2, 20, .8) + shadow('sh') + RCS;
    let s = recess('#000', .7);
    s += `<g filter="url(#sh)"><path d="${band(16, 29, 26.5, 20)}" fill="url(#wood)" fill-rule="evenodd" filter="url(#bev)"/></g>`;
    // vân gỗ
    const grain = 'M36 20C50 18 60 22 75 20S100 18 114 20M36 23C52 21 64 25 78 23S104 22 114 23M130 36C132 50 128 60 130 75S132 100 130 114M127 36C129 52 125 64 127 78S128 104 127 114M114 130C100 132 90 128 75 130S50 132 36 130M114 127C98 129 86 125 72 127S46 128 36 127M20 114C18 100 22 90 20 75S18 50 20 36M23 114C21 98 25 86 23 72S22 46 23 36';
    s += `<path d="${grain}" fill="none" stroke="#120904" stroke-opacity=".7" stroke-width=".8"/>`;
    s += `<g filter="url(#bevS)"><path d="${band(15, 30, 16.6, 28.6)}" fill="url(#metal)" fill-rule="evenodd"/><path d="${band(25.3, 20.6, 26.8, 19.5)}" fill="url(#metal)" fill-rule="evenodd"/></g>`;
    // Vòng lá: đi từ đáy lên đỉnh dọc mép phải, soi gương sang trái
    const pts = [];
    const pathPts = [[88, 139], [100, 137], [112, 134], [122, 128], [130, 118], [134, 106], [136, 94], [137, 82], [137, 70], [136, 58], [134, 46], [130, 34], [122, 24], [112, 17], [100, 12], [88, 10]];
    for (let i = 0; i < pathPts.length; i++) {
      const [x, y] = pathPts[i], [px, py] = pathPts[Math.max(0, i - 1)], [qx, qy] = pathPts[Math.min(pathPts.length - 1, i + 1)];
      pts.push([x, y, Math.atan2(qy - py, qx - px) * 180 / Math.PI]);
    }
    let w = `<path d="M${pathPts.map(p => pt(...p)).join('L')}" fill="none" stroke="#4a2c13" stroke-width="1.500" stroke-linejoin="round"/>`;
    pts.forEach(([x, y, a], i) => {
      const L = 13 - Math.abs(i - 7.5) * .35;
      w += leaf(x, y, a - 38, L, 3.800, 'url(#lL)', 'url(#lD)') + leaf(x, y, a + 42, L * .92, 3.500, 'url(#lL)', 'url(#lD)');
    });
    s += `<g filter="url(#sh)">${mirror(w)}</g>`;
    // quả vàng
    for (const [x, y] of [[127, 124], [139, 88], [126, 22], [95, 7]]) s += `<circle cx="${x}" cy="${y}" r="1.800" fill="url(#metal)"/><circle cx="${S - x}" cy="${y}" r="1.800" fill="url(#metal)"/>`;
    // ngọc trên đỉnh, dưới đáy
    const mount = (y, r) => `<path d="M${C} ${y - r - 6}C${C + 7} ${y - r - 3} ${C + r + 5} ${y - 3} ${C + r + 4} ${y}C${C + r + 5} ${y + 3} ${C + 7} ${y + r + 3} ${C} ${y + r + 6}C${C - 7} ${y + r + 3} ${C - r - 5} ${y + 3} ${C - r - 4} ${y}C${C - r - 5} ${y - 3} ${C - 7} ${y - r - 3} ${C} ${y - r - 6}Z" fill="url(#metal)"/>`;
    s += `<g filter="url(#sh)"><g filter="url(#bevS)">${mount(13, 5.5)}${mount(137, 4.5)}</g></g>`;
    s += cabochon(C, 13, 5.5, ...EMERALD) + cabochon(C, 137, 4.5, ...EMERALD);
    return [defs, s];
  },

  // LÔI THẦN: giáp thép đánh bóng có đinh tán, bão điện tím xanh quanh viền, sét vàng trắng sắc nét ở đỉnh và bốn góc
  thunder() {
    const defs = lg('metal', STEEL) + lg('y', [[0, '#fffbd0'], [.4, '#ffe14d'], [1, '#ff9f1c']], 0, 0, 40, 40) + blur('g1', 1.300) + blur('g2', 3.400) +
      bevel('bev', 1.1, 3.4, 34, 1) + bevel('bevS', .7, 2.2, 30, .9) + shadow('sh') + RCS;
    const arc = 'M30 20L42 23L50 18L62 22L75 18L88 22L100 18L108 23L120 20L130 30L127 42L132 50L128 62L132 75L128 88L132 100L127 108L130 120L120 130L108 127L100 132L88 128L75 132L62 128L50 132L42 127L30 130L20 120L23 108L18 100L22 88L18 75L22 62L18 50L23 42L20 30Z';
    let s = `<path d="${rr(15, 30)}" fill="none" stroke="#7a4dff" stroke-width="8" opacity=".6" filter="url(#g2)"/>`;
    s += recess('#000', .7);
    s += `<g filter="url(#sh)"><path d="${band(15.5, 30, 26.5, 20)}" fill="url(#metal)" fill-rule="evenodd" filter="url(#bev)"/></g>`;
    s += `<path d="${rr(21, 25)}" fill="none" stroke="#0c0c20" stroke-opacity=".85" stroke-width="3.200"/>`;
    s += `<path d="${arc}" fill="none" stroke="#6fb6ff" stroke-width="3" opacity=".9" filter="url(#g1)"/><path d="${arc}" fill="none" stroke="#e8f6ff" stroke-width=".9" stroke-linejoin="round"/>`;
    s += `<path d="${rr(26.5, 20)}" fill="none" stroke="#c9d2ff" stroke-width=".9"/>`;
    // đinh tán
    for (const [x, y] of [[50, 18.500], [100, 18.500], [50, 131.500], [100, 131.500], [18.500, 50], [18.500, 100], [131.500, 50], [131.500, 100]]) s += `<circle cx="${x}" cy="${y}" r="2.100" fill="url(#metal)" filter="url(#bevS)"/>`;
    // sét: vẽ một tia cho góc trên trái rồi soi sang ba góc còn lại, để cả bốn đều đối xứng
    const cornerBolt = fill => bolt(31, 31, -135, 41, 17, fill);
    s += `<g filter="url(#g2)" opacity=".95">${quad(cornerBolt('#6fb6ff'))}</g>`;
    s += `<g filter="url(#sh)">${quad(cornerBolt('url(#y)'))}</g>`;
    // sét lớn trên đỉnh (biểu tượng), sét nhỏ dưới đáy
    const top = `M${C + 7} 1L${C - 11} 19H${C - 2.500}L${C - 7} 35L${C + 11} 15H${C + 2.500}Z`;
    s += `<path d="${top}" fill="#6fb6ff" filter="url(#g2)"/><g filter="url(#sh)"><path d="${top}" fill="url(#y)"/></g><path d="M${C + 7} 1L${C - 2.500} 19H${C - 11}Z" fill="#fff" fill-opacity=".55"/>`;
    const low = `M${C - 5} 149L${C + 8} 136H${C + 2}L${C + 5} 126L${C - 8} 140H${C - 2}Z`;
    s += `<path d="${low}" fill="#6fb6ff" filter="url(#g2)"/><g filter="url(#sh)"><path d="${low}" fill="url(#y)"/></g>`;
    return [defs, s];
  },

  // KỲ VƯƠNG: đá onyx đen viền vàng, vòng ô cờ khảm vàng mảnh, nắp góc vàng, huy hiệu quân Vua chạm nổi trên đỉnh
  checker() {
    const defs = lg('metal', GOLD) + lg('metalV', GOLD, 0, 0, 0, 34) + lg('onyx', [[0, '#3c3a4c'], [.28, '#0f0e16'], [.55, '#2a2836'], [.8, '#08070e'], [1, '#26242f']]) +
      bevel('bev', 1, 3, 40, 1) + bevel('bevS', .6, 2, 22, .8) + shadow('sh') + RCS;
    let s = recess('#000', .75);
    s += `<g filter="url(#sh)"><path d="${band(15, 30, 26.5, 20)}" fill="url(#onyx)" fill-rule="evenodd" filter="url(#bev)"/></g>`;
    // vòng ô cờ: một hàng ô so le trong rãnh
    let cells = '';
    const m = 18, cell = 100 / m, A = 25;
    for (let i = 0; i < m; i++) for (let row = 0; row < 2; row++) {
      if ((i + row) % 2) continue;
      const o = A + i * cell, d1 = 18.4 + row * 2.8, d2 = S - 18.4 - (row + 1) * 2.8;
      cells += `<rect x="${n(o)}" y="${n(d1)}" width="${n(cell)}" height="2.800" /><rect x="${n(o)}" y="${n(d2)}" width="${n(cell)}" height="2.800"/><rect x="${n(d1)}" y="${n(o)}" width="2.800" height="${n(cell)}"/><rect x="${n(d2)}" y="${n(o)}" width="2.800" height="${n(cell)}"/>`;
    }
    s += `<g fill="url(#metal)">${cells}</g>`;
    s += `<g filter="url(#bevS)"><path d="${band(14.6, 30.5, 17.2, 28)}" fill="url(#metal)" fill-rule="evenodd"/><path d="${band(24.6, 21, 26.8, 19.5)}" fill="url(#metal)" fill-rule="evenodd"/></g>`;
    // nắp góc
    const cap = `<path d="M15 44C13 28 22 15 44 15L46 24C34 23 25 31 24 46C21 48 17 47 15 44Z" fill="url(#metal)"/>`;
    s += `<g filter="url(#sh)"><g filter="url(#bev)">${quad(cap)}</g></g>`;
    for (const [x, y] of [[22.5, 22.5], [127.5, 22.5], [22.5, 127.5], [127.5, 127.5]]) s += diamond(x, y, 4.5, 4.5, '#ffffff', '#c7d4e8', '#6f7f99');
    // huy hiệu + Vua
    const crest = `<path d="M${C - 19} 13C${C - 19} 8 ${C - 10} 6 ${C} 3C${C + 10} 6 ${C + 19} 8 ${C + 19} 13V24C${C + 19} 32 ${C + 8} 37 ${C} 40C${C - 8} 37 ${C - 19} 32 ${C - 19} 24Z" fill="url(#metalV)"/>`;
    s += `<g filter="url(#sh)"><g filter="url(#bev)">${crest}</g></g>`;
    s += `<path d="M${C - 15} 14C${C - 15} 11 ${C - 8} 9.500 ${C} 7C${C + 8} 9.500 ${C + 15} 11 ${C + 15} 14V24C${C + 15} 30 ${C + 6} 33.500 ${C} 36C${C - 6} 33.500 ${C - 15} 30 ${C - 15} 24Z" fill="url(#onyx)"/>`;
    const king = `<path d="M${C - 1.100} 9.500H${C + 1.100}V11.700H${C + 3.300}V13.900H${C + 1.100}V17H${C - 1.100}V13.900H${C - 3.300}V11.700H${C - 1.100}Z"/>` +
      `<path d="M${C} 23C${C - 2} 19 ${C - 5} 16.500 ${C - 8} 17.500C${C - 11.500} 19 ${C - 11} 23.500 ${C - 8} 26L${C - 7.500} 30H${C + 7.500}L${C + 8} 26C${C + 11} 23.500 ${C + 11.500} 19 ${C + 8} 17.500C${C + 5} 16.500 ${C + 2} 19 ${C} 23Z"/>`;
    s += `<g fill="url(#metalV)" filter="url(#bevS)">${king}</g>`;
    // chân dưới
    const foot = `<path d="M${C - 20} 134C${C - 10} 132 ${C + 10} 132 ${C + 20} 134L${C + 12} 142C${C + 5} 145 ${C - 5} 145 ${C - 12} 142Z" fill="url(#metal)"/>`;
    s += `<g filter="url(#sh)"><g filter="url(#bev)">${foot}</g></g>`;
    s += diamond(C, 138, 5, 4.5, '#ffffff', '#c7d4e8', '#6f7f99');
    return [defs, s];
  },
};

fs.mkdirSync(DIR, { recursive: true });
let total = 0;
for (const [name, draw] of Object.entries(FRAMES)) {
  gemN = 0;
  const [defs, body] = draw();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><defs>${defs}</defs>${body}</svg>`;
  total += svg.length;
  fs.writeFileSync(path.join(DIR, name + '.svg'), svg);
}
console.log(`img/frames/ (${Object.keys(FRAMES).length} khung, ${(total / 1024).toFixed(1)} KB)`);
