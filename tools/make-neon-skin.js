// Bộ quân Neon vẽ từ đầu (không dựa trên bộ cburnett): mỗi quân ghép từ nhiều "ống đèn neon" rời nhau như biển hiệu,
// thân kính phát sáng bên trong, ống neon có lõi trắng nóng, quầng sáng hai lớp toả ra ngoài.
//   Trắng: thân kính sáng, ống neon xanh băng, chi tiết xanh điện
//   Đen:   thân kính tối, ống neon hồng tím, chi tiết cam hoàng hôn
// Chạy: node tools/make-neon-skin.js  → ghi ra pieces/neon/wK.svg … bR.svg

const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'pieces', 'neon');

// ---------- hình học dùng chung ----------
const rr = (x0, y0, x1, y1, r) => // hình chữ nhật bo góc
  `M${x0 + r} ${y0}H${x1 - r}Q${x1} ${y0} ${x1} ${y0 + r}V${y1 - r}Q${x1} ${y1} ${x1 - r} ${y1}H${x0 + r}Q${x0} ${y1} ${x0} ${y1 - r}V${y0 + r}Q${x0} ${y0} ${x0 + r} ${y0}Z`;
const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
// Đế chung: bệ trên hẹp + đế dưới rộng, hơi vát cạnh
const base = w => [
  rr(22.5 - w / 2 + 2, 33.2, 22.5 + w / 2 - 2, 35.4, 1),
  `M${22.5 - w / 2 + 1} 36.6H${22.5 + w / 2 - 1}L${22.5 + w / 2} 39.2Q${22.5 + w / 2} 40.6 ${22.5 + w / 2 - 1.4} 40.6H${22.5 - w / 2 + 1.4}Q${22.5 - w / 2} 40.6 ${22.5 - w / 2} 39.2Z`,
];
const collar = (x0, x1, y) => rr(x0, y, x1, y + 2.2, 1.1);
const trunk = (y0, top, bot) => `M${22.5 - top / 2} ${y0}H${22.5 + top / 2}L${22.5 + bot / 2} 32H${22.5 - bot / 2}Z`;

// Mỗi quân: parts = các mảnh thân (được tô kính + viền ống neon), lines = nét chi tiết (ống mảnh, không tô),
// dots = chấm sáng đặc (mắt, đá quý)
const PIECES = {
  P: {
    parts: [circle(22.5, 11.6, 4.6), collar(16.6, 28.4, 17.6),
      'M19.2 21.2H25.8C25.8 25.6 28.6 28.6 30.4 32H14.6C16.4 28.6 19.2 25.6 19.2 21.2Z', ...base(22)],
    lines: ['M20.6 10.2Q21.4 8.6 23.2 8.4'],
    dots: [],
  },
  R: {
    parts: ['M13 7.6H17V10.6H20.5V7.6H24.5V10.6H28V7.6H32V15H13Z', collar(14, 31, 16.3),
      'M16.2 19.8H28.8L30.4 32H14.6Z', ...base(25)],
    lines: ['M22.5 22.4V27.6', 'M17.6 29.4H27.4'],
    dots: [],
  },
  B: {
    parts: [circle(22.5, 6.6, 2.2),
      'M22.5 9.6C28.6 13.4 30.2 19 27.6 23.4H17.4C14.8 19 16.4 13.4 22.5 9.6Z', collar(16.4, 28.6, 24.6),
      'M18.4 28H26.6L29.6 32H15.4Z', ...base(25)],
    lines: ['M24.8 13.6L20.4 19.6', 'M19.6 16.8H21.2'],
    dots: [],
  },
  Q: {
    parts: [circle(10.4, 9.6, 1.6), circle(16.5, 7.1, 1.6), circle(22.5, 5.5, 1.7), circle(28.5, 7.1, 1.6), circle(34.6, 9.6, 1.6),
      'M13.6 24.6L10.4 12.4L14 19.2L16.5 9.8L19.6 18.6L22.5 8.4L25.4 18.6L28.5 9.8L31 19.2L34.6 12.4L31.4 24.6Z',
      collar(14, 31, 25.8), 'M17 29.2H28L30.6 32H14.4Z', ...base(27)],
    lines: [],
    dots: ['M22.5 19.4L24 21.4L22.5 23.4L21 21.4Z'],
  },
  K: {
    parts: ['M21.3 2.8H23.7V5H26.2V7.4H23.7V10.4H21.3V7.4H18.8V5H21.3Z',
      'M13.2 24.6C9.4 19.6 11 13.2 16.6 13.2C19.6 13.2 21.6 15.2 22.5 17.4C23.4 15.2 25.4 13.2 28.4 13.2C34 13.2 35.6 19.6 31.8 24.6Z',
      collar(14, 31, 25.8), 'M17 29.2H28L30.6 32H14.4Z', ...base(27)],
    lines: ['M22.5 17.4V23', 'M14.6 21.4Q22.5 18.8 30.4 21.4'],
    dots: [],
  },
  N: { // đầu ngựa cách điệu dạng khối cắt mặt, quay sang trái
    parts: ['M15.4 32L17.2 27L19.8 22.6L16.4 23.8L12.6 25.6L9.6 24.2L9.2 21.4L16.2 11.2L21.4 8.2L23.6 4L25.6 8.2C30.2 9.8 33.4 15.2 33.1 22L31.6 32Z', ...base(25)],
    lines: ['M26.6 10.2L28.8 13.6L27.8 14.4L30.6 18.4L29.6 19.2L31.6 23.6', 'M19.8 22.6L21.8 15.8L25.6 8.2', 'M9.2 21.4L13.4 21'],
    dots: [circle(17.4, 14.6, 1.05), circle(11.4, 23, 0.55)],
  },
};

const SIDES = {
  w: { glass: ['#ffffff', '#d8fdff', '#7aeefc', '#2bb8d6'], tube: '#19f6ff', detail: '#3d7dff', edge: '#00303a', bloom: '#19f6ff', core: '#ffffff', shine: 0.75 },
  b: { glass: ['#5a1670', '#2c0838', '#160320', '#07000c'], tube: '#ff2bd6', detail: '#ffb13d', edge: '#1a0014', bloom: '#ff2bd6', core: '#ffe6fb', shine: 0.22 },
};

function build(t, side) {
  const p = PIECES[t], c = SIDES[side];
  const body = p.parts.join('');
  const lines = p.lines.join('');
  const dots = p.dots.join('');
  const stops = c.glass.map((col, i) => `<stop offset="${(i / (c.glass.length - 1)).toFixed(2)}" stop-color="${col}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme:light only" width="45" height="45" viewBox="0 0 45 45">` +
    `<defs>` +
    `<linearGradient id="gl" gradientUnits="userSpaceOnUse" x1="14" y1="4" x2="30" y2="41">${stops}</linearGradient>` +
    `<linearGradient id="sh" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="45" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity="${c.shine}"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<filter id="b1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.1"/></filter>` +
    `<filter id="b2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>` +
    `<clipPath id="cl"><path d="${body}"/></clipPath>` +
    `</defs>` +
    // quầng sáng: lớp rộng mờ + lớp sát thân rõ
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${body}" stroke="${c.bloom}" stroke-width="3.4" opacity=".55" filter="url(#b2)"/>` +
    `<path d="${body}${lines}" stroke="${c.bloom}" stroke-width="2" opacity=".9" filter="url(#b1)"/>` +
    `</g>` +
    // thân kính + vệt sáng chéo
    `<path d="${body}" fill="url(#gl)"/>` +
    `<g clip-path="url(#cl)"><path d="M6 45L30 0H36L12 45Z" fill="url(#sh)" transform="translate(-4 0)"/><path d="${body}" fill="none" stroke="${c.tube}" stroke-width="3.2" opacity=".35" filter="url(#b1)"/></g>` +
    // ống neon: viền tối (để rõ trên ô sáng) → ống màu → lõi trắng
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${body}" stroke="${c.edge}" stroke-width="2.5" stroke-opacity=".85"/>` +
    `<path d="${body}" stroke="${c.tube}" stroke-width="1.5"/>` +
    `<path d="${body}" stroke="${c.core}" stroke-width=".5" stroke-opacity=".9"/>` +
    (lines ? `<path d="${lines}" stroke="${c.detail}" stroke-width="2.2" opacity=".5" filter="url(#b1)"/><path d="${lines}" stroke="${c.detail}" stroke-width="1.2"/><path d="${lines}" stroke="#fff" stroke-width=".4" stroke-opacity=".85"/>` : '') +
    `</g>` +
    (dots ? `<path d="${dots}" fill="${c.detail}" stroke="${c.edge}" stroke-width=".4"/><path d="${dots}" fill="#fff" fill-opacity=".55" transform="translate(.15 -.15)"/>` : '') +
    `</svg>`;
}

fs.mkdirSync(DIR, { recursive: true });
let bytes = 0;
for (const side of ['w', 'b']) for (const t of Object.keys(PIECES)) {
  const svg = build(t, side);
  bytes += svg.length;
  fs.writeFileSync(path.join(DIR, side + t + '.svg'), svg);
}
console.log(`pieces/neon/ (12 quân, ${(bytes / 1024).toFixed(1)} KB)`);
