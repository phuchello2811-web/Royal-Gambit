// Tạo các bộ quân cờ (skin) từ bộ gốc pieces/*.svg: giữ nguyên hình dáng, tô lại thân quân bằng gradient,
// đổi màu viền và các nét trang trí riêng cho quân Trắng và quân Đen.
// Chạy: node tools/make-skins.js  → ghi ra pieces/<skin>/wK.svg … bR.svg
// Thêm skin: thêm một mục vào SKINS bên dưới, chạy lại lệnh trên, rồi thêm tên skin vào PIECE_SKINS trong app.js.

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'pieces');
const PIECES = ['K', 'Q', 'R', 'B', 'N', 'P'];

// Mỗi bên: body = các điểm màu của gradient thân quân (sáng → tối), line = màu viền, detail = nét trang trí
const SKINS = {
  royal: { // Hoàng gia: ngà vàng / huyền thạch viền vàng
    w: { body: ['#fffdf5', '#f6e2a4', '#c9972c'], line: '#4a3008', detail: '#4a3008' },
    b: { body: ['#4a4757', '#1d1b26', '#09080d'], line: '#d9ad45', detail: '#f1cf72' },
  },
  crystal: { // Pha lê: băng xanh / thạch anh tím
    w: { body: ['#ffffff', '#c9eeff', '#5fb8ec'], line: '#123f63', detail: '#123f63' },
    b: { body: ['#d29bff', '#6a1fb0', '#2a0652'], line: '#16022c', detail: '#f1dcff' },
  },
  walnut: { // Gỗ khắc: gỗ phong / gỗ óc chó
    w: { body: ['#fbe9c6', '#e3b977', '#b9803f'], line: '#4e2c12', detail: '#4e2c12' },
    b: { body: ['#9a6634', '#5a3416', '#2b170a'], line: '#140a03', detail: '#f0d3a6' },
  },
  jewel: { // Ngọc: lục bảo / hồng ngọc
    w: { body: ['#d6ffe8', '#3fd690', '#0a7046'], line: '#03331f', detail: '#03331f' },
    b: { body: ['#ff9db1', '#d3123f', '#62001a'], line: '#2a0009', detail: '#ffe1e8' },
  },
  cyber: { // Neon: thân tối, viền phát sáng xanh ngọc / hồng (app.js thêm quầng sáng)
    w: { body: ['#16324a', '#0b1a2b', '#050b14'], line: '#2ff5dc', detail: '#2ff5dc' },
    b: { body: ['#3b0f3f', '#1d0620', '#0b020c'], line: '#ff3fd8', detail: '#ff3fd8' },
  },
};

function restyle(svg, side, s) {
  const defs = `<defs><linearGradient id="g" x1="0.15" y1="0" x2="0.85" y2="1">` +
    s.body.map((c, i) => `<stop offset="${i / (s.body.length - 1)}" stop-color="${c}"/>`).join('') +
    `</linearGradient></defs>`;
  let out = svg;
  if (side === 'w') {
    out = out.replace(/fill="#000"/g, `fill="${s.detail}"`)   // mắt Mã…
      .replace(/fill="#fff"/g, 'fill="url(#g)"');
  } else {
    out = out.replace(/fill="#000"/g, 'fill="url(#g)"')
      .replace(/#ececec/g, s.detail);
  }
  out = out.replace(/stroke="#000"/g, `stroke="${s.line}"`);
  // Quân Đen có phần thân không ghi fill (mặc định đen): cho thừa kế gradient từ thẻ <svg>
  return out.replace(/<svg([^>]*)>/, (m, attrs) => `<svg${attrs}${side === 'b' ? ' fill="url(#g)"' : ''}>${defs}`);
}

for (const [name, skin] of Object.entries(SKINS)) {
  const dir = path.join(DIR, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const side of ['w', 'b']) {
    for (const t of PIECES) {
      const src = fs.readFileSync(path.join(DIR, side + t + '.svg'), 'utf8');
      fs.writeFileSync(path.join(dir, side + t + '.svg'), restyle(src, side, skin[side]));
    }
  }
  console.log('pieces/' + name + '/ (12 quân)');
}
