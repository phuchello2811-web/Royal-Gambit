// Trợ lý Royal Gambit (trang riêng, mở bằng tab Trợ lý): huấn luyện viên riêng và lộ trình học: đọc các ván trong Nhật ký (đã được Stockfish chấm từng nước), Sổ luyện lỗi và tiến độ Học cờ,
// tìm điểm yếu của người chơi rồi gợi ý lộ trình: phần học, câu đố theo chủ đề, khai cuộc nên ôn, mức máy nên đấu.
// Chạy hoàn toàn trên máy người chơi (không gửi dữ liệu đi đâu), không cần khoá API.
// Hỏi đáp: nếu đã cài máy chủ AI (aiApi trong config.js, tools/ai-worker.js), câu hỏi được gửi cho GLM-4.7 của Z.ai;
// AI tự gọi công cụ để tra Thư viện kiến thức (knowledge.js), hồ sơ và ván đấu của người chơi, phân tích thế cờ
// (Lichess cloud eval / Stockfish) và bảng tàn cuộc, rồi mới trả lời. Chưa cài / máy chủ lỗi: trả lời theo mẫu như cũ,
// câu hỏi lạ thì tra Thư viện kiến thức. Cách chẩn đoán điểm yếu và lộ trình bên dưới vẫn chạy hoàn toàn trên máy.
//
//   • Giai đoạn mỗi nước: khai cuộc (10 nước đầu), tàn cuộc (mỗi bên còn ≤ 13 điểm quân, không tính Tốt), còn lại là trung cuộc.
//   • Kiểu lỗi: để quân treo, bỏ lỡ đòn chiến thuật, bỏ lỡ chiếu hết, ra Hậu sớm, chậm nhập thành, thua ngay từ khai cuộc,
//     để tuột ván đang thắng (≥ +3 mà không thắng).
//   • Mỗi điểm yếu có một "mức nặng"; 3 điểm yếu nặng nhất quyết định lộ trình. Phần học được chọn theo `key` trong lessons.js.

const Assistant = (() => {
  const $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const MAX_GAMES = 40;
  const VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
  const PHASES = [['open', 'Khai cuộc'], ['middle', 'Trung cuộc'], ['end', 'Tàn cuộc']];
  const wp = cp => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-1500, Math.min(1500, cp)))) - 1);

  // Chủ đề câu đố (puzzles.js) cho từng nhóm điểm yếu
  const PZ = {
    tactics: ['Chĩa đôi', 'Ghim', 'Xiên', 'Chiếu mở', 'Phong cấp'],
    mates: ['Chiếu hết 1 nước', 'Chiếu hết 2 nước', 'Hàng cuối', 'Mã', 'Xe và Mã', 'Hậu', 'Hậu và Mã', 'Hậu và Tượng', 'Hậu và Tốt'],
    end: ['Tàn cuộc', 'Phong cấp'],
  };
  // Điểm yếu → các phần học (theo `key` của phần, hoặc số thứ tự phần cho chặng 1)
  const WEAK = {
    hang:    { name: 'Để mất quân oan', icon: 'i-shield', units: ['defense', 7, 'calc'], pz: 'tactics',
               tip: 'Trước mỗi nước, hỏi: "Đối thủ vừa dọa gì? Sau nước này quân nào của mình không được bảo vệ?"' },
    tactics: { name: 'Bỏ lỡ đòn chiến thuật', icon: 'i-bolt', units: [7, 'tactics2', 'calc'], pz: 'tactics',
               tip: 'Mỗi lượt, xét các nước chiếu, ăn quân và đe dọa trước tiên: đòn thắng thường nằm ở đó.' },
    mates:   { name: 'Bỏ lỡ chiếu hết', icon: 'i-crown', units: [6, 8, 'mates'], pz: 'mates',
               tip: 'Thuộc các mẫu chiếu hết (hàng cuối, Ả Rập, Boden, chiếu ngạt…) để thấy chúng ngay trong ván.' },
    opening: { name: 'Khai cuộc chưa vững', icon: 'i-book', units: [10, 'strategy'], lib: true,
               tip: 'Chiếm trung tâm, ra Mã và Tượng trước, nhập thành sớm; đừng đi một quân hai lần khi chưa cần.' },
    king:    { name: 'Vua kém an toàn', icon: 'i-flag', units: [4, 'defense', 'attack'],
               tip: 'Nhập thành trước nước 10 và giữ Tốt che Vua; khi Vua đối thủ còn ở giữa, hãy mở trung tâm tấn công.' },
    middle:  { name: 'Trung cuộc thiếu kế hoạch', icon: 'i-target', units: ['strategy', 'tactics2', 'calc'], pz: 'tactics',
               tip: 'Khi không có chiến thuật: tìm quân kém nhất của mình và đưa nó tới ô tốt hơn, chiếm cột mở bằng Xe.' },
    end:     { name: 'Kết thúc ván / tàn cuộc', icon: 'i-crown', units: [9, 'pawnend', 'rookend'], pz: 'end', endLib: true,
               tip: 'Khi hơn quân: đổi bớt quân, đưa Vua lên, đẩy Tốt thông. Đừng vội: kiểm tra mỗi nước để không bị pat.' },
  };

  let cache = null;      // { sig, data }
  let busy = false;      // đang phân tích hàng loạt
  let chat = [];         // hội thoại hỏi đáp (lưu theo tài khoản trong trình duyệt, xem saveChat)

  // ---------- Phân tích dữ liệu ----------

  const games = () => (typeof GameHistory !== 'undefined' ? GameHistory.read() : []).filter(g => g.color === 'w' || g.color === 'b');

  function material(g, side) {
    let n = 0;
    for (const p of g.board) if (p && p[0] === side && p[1] !== 'P' && p[1] !== 'K') n += VAL[p[1]];
    return n;
  }
  const phaseOf = (g, ply) => (ply < 20 ? 'open' : material(g, 'w') <= 13 && material(g, 'b') <= 13 ? 'end' : 'middle');

  // Sau nước của `side`: có quân (không phải Tốt / Vua) bị đối thủ ăn lời không?
  function hanging(g, side) {
    const opp = side === 'w' ? 'b' : 'w';
    let worst = 0;
    for (let sq = 0; sq < 64; sq++) {
      const p = g.board[sq];
      if (!p || p[0] !== side || p[1] === 'K' || p[1] === 'P' || !g.isAttacked(sq, opp)) continue;
      // Quân bị tấn công: không có bảo vệ, hoặc bị một quân rẻ hơn tấn công
      let cheapest = 99;
      for (const m of g.legalMoves()) if (m.to === sq && m.captured) cheapest = Math.min(cheapest, VAL[m.piece[1]] || 0);
      if (cheapest === 99) continue;
      const defended = g.isAttacked(sq, side);
      const gain = defended ? VAL[p[1]] - cheapest : VAL[p[1]];
      worst = Math.max(worst, gain);
    }
    return worst >= 2;
  }

  // "Sicily: Biến Najdorf" → "Phòng thủ Sicily", "Ý: Giuoco Pianissimo" → "Khai cuộc Ý" (tên đầy đủ trong sách khai cuộc)
  let fullNames = null;
  function familyOf(name) {
    const n = String(name || '');
    if (!n.includes(':')) return n.trim();
    const pre = n.split(':')[0].trim();
    if (!fullNames) fullNames = typeof OPENING_BOOK !== 'undefined' && OPENING_BOOK.pairs ? OPENING_BOOK.pairs().map(p => p[0]) : [];
    return fullNames.find(v => !v.includes(':') && v.endsWith(' ' + pre)) || pre;
  }

  function signature(list) {
    return list.length + '|' + list.slice(0, 5).map(g => g.id + (g.rev ? 'r' : '') + (g.u || '')).join(',')
      + '|' + (typeof Coach !== 'undefined' ? Coach.cards().length : 0);
  }

  function analyse() {
    const list = games().slice(0, MAX_GAMES);
    const sig = signature(list);
    if (cache && cache.sig === sig) return cache.data;
    const d = {
      total: list.length, analysed: 0, unanalysed: [], moves: 0,
      res: { win: 0, draw: 0, loss: 0 }, byColor: { w: { win: 0, draw: 0, loss: 0 }, b: { win: 0, draw: 0, loss: 0 } },
      phase: { open: { n: 0, err: 0, bl: 0, inacc: 0, acc: 0 }, middle: { n: 0, err: 0, bl: 0, inacc: 0, acc: 0 }, end: { n: 0, err: 0, bl: 0, inacc: 0, acc: 0 } },
      pat: { hang: 0, tactic: 0, mate: 0, earlyQueen: 0, lateCastle: 0, badOpening: 0, thrown: 0, mated: 0, endGames: 0 },
      openings: {}, acc: [], examples: {},
    };
    for (const g of list) {
      const out = GameHistory.outcome(g);
      if (d.res[out] != null) { d.res[out]++; d.byColor[g.color][out]++; }
      const tmp = new Chess();
      const moves = GameHistory.replay(g.pgn, tmp);
      if (!moves || !moves.length) continue;
      const sans = tmp.history.map(h => h.san);
      const fromStart = !/\[FEN\s/.test(g.pgn || '');
      // Khai cuộc theo bên mình cầm
      if (fromStart && typeof OPENING_BOOK !== 'undefined') {
        const o = OPENING_BOOK.name(sans.slice(0, 16));
        if (o) {
          const fam = familyOf(o.vi);
          const k = g.color + '|' + fam;
          const row = d.openings[k] || (d.openings[k] = { name: fam, color: g.color, n: 0, win: 0, draw: 0, loss: 0, acc: 0, accN: 0 });
          row.n++;
          if (row[out] != null) row[out]++;
          if (Number.isFinite(g.acc)) { row.acc += g.acc; row.accN++; }
        }
      }
      if (/#$/.test(sans[sans.length - 1] || '') && out === 'loss') d.pat.mated++;
      // Thói quen khai cuộc (không cần bản phân tích)
      if (fromStart) {
        const mine = tmp.history.filter((h, i) => (i % 2 === 0 ? 'w' : 'b') === g.color);
        if (mine.slice(0, 5).some(h => h.move.piece[1] === 'Q')) d.pat.earlyQueen++;
        if (mine.length >= 12 && !mine.slice(0, 12).some(h => /^O-O/.test(h.san))) d.pat.lateCastle++;
      }
      const rev = g.rev;
      if (!rev || typeof rev.cls !== 'string' || !rev.cls.length || typeof Coach === 'undefined') { d.unanalysed.push(g); continue; }
      d.analysed++;
      if (Number.isFinite(g.acc)) d.acc.push(g.acc);
      const evals = Array.isArray(rev.evals) ? rev.evals : [];
      const best = Array.isArray(rev.best) ? rev.best : [];
      const pov = cp => (g.color === 'w' ? cp : -cp);
      // Thua từ khai cuộc / để tuột ván thắng
      if (evals.length > 21 && pov(evals[20]) <= -150) d.pat.badOpening++;
      if (out !== 'win' && evals.slice(20).some(v => pov(v) >= 300)) d.pat.thrown++;
      const gg = new Chess(tmp.startFen);
      let reachedEnd = false;
      for (let i = 0; i < rev.cls.length && i < moves.length; i++) {
        const side = gg.turn;
        const ph = phaseOf(gg, i);
        if (ph === 'end') reachedEnd = true;
        const cls = (Coach.BY_CODE[rev.cls[i]] || Coach.CLASS.good).id;
        if (!gg.move(moves[i])) break;
        if (side !== g.color || cls === 'forced' || cls === 'book') continue;
        const P = d.phase[ph];
        P.n++;
        d.moves++;
        if (evals.length > i + 1) {
          const drop = Math.max(0, wp(pov(evals[i])) - wp(pov(evals[i + 1])));
          P.acc += Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669));
        } else P.acc += 80;
        const bad = cls === 'blunder' || cls === 'mistake' || cls === 'miss';
        if (cls === 'inaccuracy') P.inacc++;
        if (!bad) continue;
        P.err++;
        if (cls === 'blunder') P.bl++;
        const b = best[i] || '';
        const ex = { g: g.id, no: Math.floor(i / 2) + 1, side, san: sans[i], best: b, opp: g.opp || g.title };
        if (/#/.test(b) || (evals.length > i + 1 && pov(evals[i]) >= 5000 && pov(evals[i + 1]) < 5000)) { d.pat.mate++; d.examples.mates = d.examples.mates || ex; }
        else if (hanging(gg, side)) { d.pat.hang++; d.examples.hang = d.examples.hang || ex; }
        else if (/x|\+/.test(b)) { d.pat.tactic++; d.examples.tactics = d.examples.tactics || ex; }
      }
      if (reachedEnd) d.pat.endGames++;
    }
    d.weak = weaknesses(d);
    cache = { sig, data: d };
    return d;
  }

  // Mức nặng 0..1 của từng điểm yếu
  function weaknesses(d) {
    const A = Math.max(1, d.analysed), G = Math.max(1, d.total);
    const P = d.phase;
    const rate = p => (p.n ? p.err / p.n : 0); // lỗi trên mỗi nước
    const avgRate = d.moves ? (P.open.err + P.middle.err + P.end.err) / d.moves : 0;
    const clamp = x => Math.max(0, Math.min(1, x));
    const list = [
      ['hang', clamp(d.pat.hang / A / 1.2), `${d.pat.hang} lần để quân bị ăn lời trong ${d.analysed} ván đã chấm`],
      ['tactics', clamp(d.pat.tactic / A / 1.5), `${d.pat.tactic} lần bỏ lỡ nước ăn quân / chiếu tốt hơn hẳn`],
      ['mates', clamp(d.pat.mate / A / 0.4), `${d.pat.mate} lần bỏ lỡ (hoặc để tuột) chiếu hết`],
      ['opening', clamp((d.pat.badOpening / A) * 1.6 + (d.pat.earlyQueen / G) * 0.5 + (P.open.n > 20 ? rate(P.open) * 8 : 0)),
        `${d.pat.badOpening} ván bất lợi ngay sau 10 nước, ${d.pat.earlyQueen} ván ra Hậu trong 5 nước đầu`],
      ['king', clamp((d.pat.lateCastle / G) * 0.9 + (d.pat.mated / G) * 1.2), `${d.pat.lateCastle} ván chưa nhập thành sau 12 nước, ${d.pat.mated} ván bị chiếu hết`],
      ['middle', clamp(P.middle.n > 30 ? (rate(P.middle) - avgRate * 0.6) * 14 + P.middle.inacc / P.middle.n * 3 : 0),
        `${P.middle.err} lỗi lớn và ${P.middle.inacc} nước thiếu chính xác ở trung cuộc`],
      ['end', clamp((d.pat.thrown / A) * 2 + (P.end.n > 15 ? rate(P.end) * 10 : 0)), `${d.pat.thrown} ván đang hơn ≥ 3 điểm mà không thắng, ${P.end.err} lỗi lớn ở tàn cuộc`],
    ];
    // Đủ dữ liệu để kết luận "không phải điểm yếu" (dùng khi nói về điểm mạnh)
    const enough = { middle: P.middle.n >= 30, end: P.end.n >= 15, opening: P.open.n >= 20 };
    return list.map(([id, sev, why]) => ({ id, sev, why, sure: id in enough ? enough[id] : d.analysed >= 3, ...WEAK[id] })).sort((a, b) => b.sev - a.sev);
  }

  // ---------- Gợi ý ----------

  const elo = () => { try { return Profile.me().elo || 800; } catch { return 800; } };
  const units = () => (typeof Learn !== 'undefined' && Learn.units ? Learn.units() : []);
  function unitFor(keys) {
    const all = units();
    const found = keys.map(k => (typeof k === 'number' ? all[k] : all.find(u => u.key === k))).filter(Boolean);
    return found.find(u => u.done < u.total) || found[0] || null;
  }

  // Bộ khai cuộc gợi ý theo trình độ: [Trắng, Đen gặp 1.e4, Đen gặp 1.d4]
  function repertoire() {
    const e = elo();
    if (e < 900) return [['italian', 'Khai cuộc Ý'], ['italian', 'Đáp 1.e4 bằng 1...e5 (Ván mở)'], ['qgd', 'Gambit Hậu từ chối']];
    if (e < 1400) return [['london', 'Hệ thống London'], ['caro-kann', 'Phòng thủ Caro-Kann'], ['qgd', 'Gambit Hậu từ chối']];
    return [['ruy-lopez', 'Khai cuộc Tây Ban Nha'], ['sicilian', 'Phòng thủ Sicily'], ['nimzo-indian', 'Phòng thủ Nimzo-Ấn']];
  }
  const libHas = id => typeof Library !== 'undefined' && Library.OPENINGS.some(o => o.id === id);
  const libIdByName = name => {
    if (typeof Library === 'undefined') return null;
    const L = Library.OPENINGS;
    const o = L.find(x => x.nameVi === name) || L.find(x => x.nameVi.endsWith(' ' + name)) || L.find(x => x.nameVi.startsWith(name));
    return o ? o.id : null;
  };

  function botFor() {
    const e = elo();
    if (e < 950) return 'Tốt Con (800)';
    if (e < 1350) return 'Mã Chiến (1200)';
    if (e < 1750) return 'Hậu Đen (1600)';
    return 'Stockfish tuỳ chỉnh (~' + Math.min(3000, Math.round((e + 150) / 50) * 50) + ')';
  }

  // Lộ trình: danh sách bước { title, why, act: { kind, ... }, btn }
  function roadmap(d) {
    const steps = [];
    const dueN = typeof Coach !== 'undefined' ? Coach.due().length : 0;
    if (dueN) steps.push({ icon: 'i-target', title: `Ôn ${dueN} thế cờ trong Sổ luyện lỗi`, why: 'Các thế cờ lấy từ chính nước sai của bạn, đang đến hạn ôn.', act: { kind: 'review' }, btn: 'Ôn ngay' });
    const top = d.analysed >= 2 ? d.weak.filter(w => w.sev >= 0.15).slice(0, 3) : [];
    for (const w of top) {
      const u = unitFor(w.units);
      if (u) {
        const left = u.total - u.done;
        steps.push({ icon: w.icon, weak: w.id, title: `${w.name}: học phần "${u.title}"`,
          why: left ? `${u.done}/${u.total} bài · ${w.tip}` : `Đã học xong phần này, ôn lại cho chắc · ${w.tip}`,
          act: { kind: 'unit', u: u.u }, btn: u.unlocked ? (u.done ? 'Học tiếp' : 'Bắt đầu') : 'Mở phần học' });
      }
      if (w.pz) steps.push({ icon: 'i-puzzle', weak: w.id, title: `Giải câu đố: ${w.id === 'mates' ? 'mẫu chiếu hết' : w.id === 'end' ? 'tàn cuộc' : 'chiến thuật'}`,
        why: 'Luyện nhận ra mẫu hình nhanh hơn: 3–5 câu mỗi ngày.', act: { kind: 'puzzle', themes: PZ[w.pz] }, btn: 'Giải câu đố' });
      if (w.lib) {
        const r = repertoire();
        steps.push({ icon: 'i-library', weak: w.id, title: `Ôn khai cuộc: ${r[0][1]}`, why: 'Xem từng nước rồi "Tập với máy" tới khi đi đúng mà không cần nhìn.', act: { kind: 'lib', id: r[0][0] }, btn: 'Mở Thư viện' });
      }
      if (w.endLib) steps.push({ icon: 'i-library', weak: w.id, title: 'Ôn thế Lucena và Philidor', why: 'Hai thế tàn cuộc Xe quan trọng nhất, gặp rất thường xuyên.', act: { kind: 'lib', id: 'lucena' }, btn: 'Xem thế cờ' });
    }
    // Chưa đủ dữ liệu hoặc không có điểm yếu rõ: theo tiến độ học
    if (!top.length) {
      const all = units();
      const next = all.find(u => u.done < u.total && u.unlocked) || all.find(u => u.done < u.total);
      if (next) steps.push({ icon: 'i-cap', title: `Học tiếp phần "${next.title}"`, why: `${next.done}/${next.total} bài · ${next.desc}`, act: { kind: 'unit', u: next.u }, btn: 'Học tiếp' });
      steps.push({ icon: 'i-puzzle', title: 'Giải câu đố chiến thuật', why: 'Chiến thuật quyết định phần lớn ván cờ dưới 1800 Elo.', act: { kind: 'puzzle', themes: PZ.tactics }, btn: 'Giải câu đố' });
    }
    steps.push({ icon: 'i-cpu', title: `Chơi một ván với ${botFor()}`, why: 'Áp dụng điều vừa học. Sau ván, web tự chấm từng nước để trợ lý hiểu bạn hơn.', act: { kind: 'play' }, btn: 'Chơi ngay' });
    // Bỏ bước trùng (cùng phần học / cùng hành động)
    const seen = new Set();
    return steps.filter(s => { const k = JSON.stringify(s.act); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 7);
  }

  // ---------- Thực hiện gợi ý ----------

  function act(a) {
    if (!a) return;
    // Câu đố, ôn lỗi, chơi, học cần bàn cờ: rời trang Trợ lý trước (Thư viện là hộp thoại, mở đè lên trang)
    if (a.kind !== 'lib' && typeof showBoard === 'function') showBoard();
    if (a.kind === 'review') { Puzzles.startReview(); return; }
    if (a.kind === 'puzzle') { if (!Puzzles.startTheme(a.themes)) Puzzles.open(); return; }
    if (a.kind === 'lib') { Library.show(a.id); return; }
    if (a.kind === 'play') { if (typeof showBoard === 'function') showBoard(); setMode('play'); return; }
    if (a.kind === 'unit') {
      if (typeof showBoard === 'function') showBoard();
      setMode('learn');
      if (typeof mode !== 'undefined' && mode !== 'learn') return; // người chơi không muốn rời ván đang dở
      setTimeout(() => {
        const r = Learn.focusUnit(a.u);
        if (r === 'locked') toast('Phần này còn khoá: bấm "Nhảy cóc" để làm bài kiểm tra mở khoá, hoặc học các phần trước.');
        else if (r === 'done') toast('Bạn đã học xong phần này. Chọn một bài để ôn lại.');
      }, 60);
    }
  }

  // Phân tích hàng loạt các ván chưa chấm (Stockfish, chạy trên máy)
  async function analyseBatch(n = 5) {
    if (busy) return;
    const todo = analyse().unanalysed.slice(0, n);
    if (!todo.length) return;
    busy = true;
    const btn = $('aiBatch');
    let done = 0;
    try {
      for (const g of todo) {
        if ($('coachPage').hidden) break;
        if (btn) btn.innerHTML = `<svg class="ic"><use href="#i-cpu"/></svg>Đang chấm ván ${done + 1}/${todo.length}…`;
        const r = await GameHistory.runAnalysis(g, f => { if (btn) btn.innerHTML = `<svg class="ic"><use href="#i-cpu"/></svg>Đang chấm ván ${done + 1}/${todo.length} · ${Math.round(f * 100)}%`; });
        if (!r) break;
        done++;
      }
    } finally {
      busy = false;
      cache = null;
    }
    toast(done ? `Đã chấm xong ${done} ván` : 'Chưa chấm được ván nào (đang bận phân tích ván khác?)');
    render();
  }

  // ---------- Hỏi đáp ----------

  const QUESTIONS = [
    ['why', 'Vì sao tôi hay thua?'], ['today', 'Hôm nay nên tập gì?'], ['opening', 'Tôi nên chơi khai cuộc nào?'],
    ['strong', 'Điểm mạnh của tôi là gì?'], ['elo', 'Làm sao để lên Elo?'],
  ];
  const INTENTS = [
    ['opening', /khai cu[oộ]c|opening|m[oở] [đd][aầ]u|e4|d4/i], ['end', /t[aà]n cu[oộ]c|endgame|k[eế]t th[uú]c/i],
    ['tactic', /chi[eế]n thu[aậ]t|tactic|[đd][oò]n|ch[iĩ]a|ghim/i], ['elo', /elo|rank|l[eê]n h[aạ]ng|m[aạ]nh h[oơ]n|ti[eế]n b[oộ]/i],
    ['today', /h[oô]m nay|today|t[aậ]p g[iì]|l[aà]m g[iì]/i], ['why', /thua|lose|sai|l[oỗ]i|h[oớ]/i], ['strong', /m[aạ]nh|gi[oỏ]i|strength/i],
  ];

  function answer(intent, d) {
    const w = d.weak, top = w[0];
    const pct = (a, b) => (b ? Math.round(100 * a / b) : 0);
    const P = d.phase;
    const steps = roadmap(d);
    const stepBtn = s => `<button type="button" class="ai-inline" data-act='${esc(JSON.stringify(s.act))}'>${esc(s.btn)} · ${esc(s.title)}</button>`;
    if (d.analysed < 2 && intent !== 'today' && intent !== 'opening' && intent !== 'elo') {
      return `Mình cần ít nhất 2 ván đã được chấm bằng Stockfish để nhận xét chính xác (hiện có ${d.analysed}). Hãy chơi thêm vài ván, hoặc bấm <b>Chấm các ván chưa phân tích</b> ở trên.`;
    }
    switch (intent) {
      case 'why': {
        const ph = PHASES.map(([k, n]) => [n, P[k].n ? P[k].err / P[k].n : 0, P[k].err]).sort((a, b) => b[1] - a[1])[0];
        return `Trong ${d.analysed} ván đã chấm, nguyên nhân lớn nhất là <b>${esc(top.name.toLowerCase())}</b> (${esc(top.why)}).
          Bạn mắc lỗi nhiều nhất ở <b>${ph[0].toLowerCase()}</b> (${ph[2]} lỗi lớn).
          ${d.examples[top.id] ? `Ví dụ: nước ${d.examples[top.id].no} ván với ${esc(d.examples[top.id].opp)}, bạn đi <b>${esc(d.examples[top.id].san)}</b>, nước tốt hơn là <b>${esc(d.examples[top.id].best)}</b>.` : ''}
          <br>Mẹo: ${esc(top.tip)}<br>${steps.filter(s => s.weak === top.id).slice(0, 1).map(stepBtn).join('')}`;
      }
      case 'today': {
        const list = steps.slice(0, 3);
        return `Kế hoạch khoảng 20 phút hôm nay:<ol>${list.map(s => `<li><b>${esc(s.title)}</b><br><small>${esc(s.why)}</small><br>${stepBtn(s)}</li>`).join('')}</ol>`;
      }
      case 'opening': {
        const rows = Object.values(d.openings).filter(r => r.n >= 2).map(r => ({ ...r, score: (r.win + r.draw / 2) / r.n }));
        const worst = rows.sort((a, b) => a.score - b.score)[0];
        const r = repertoire();
        const libBtn = (id, t) => (libHas(id) ? `<button type="button" class="ai-inline" data-act='${esc(JSON.stringify({ kind: 'lib', id }))}'>Mở ${esc(t)}</button>` : '');
        let s = `Với ${elo()} Elo, bộ khai cuộc dễ học và chắc chắn:<ul>
          <li>Cầm Trắng: <b>${esc(r[0][1])}</b> ${libBtn(r[0][0], r[0][1])}</li>
          <li>Cầm Đen gặp 1.e4: <b>${esc(r[1][1])}</b> ${libBtn(r[1][0], r[1][1])}</li>
          <li>Cầm Đen gặp 1.d4: <b>${esc(r[2][1])}</b> ${libBtn(r[2][0], r[2][1])}</li></ul>`;
        if (worst && worst.score < 0.45) {
          const id = libIdByName(worst.name);
          s += `Khai cuộc bạn đang chơi kém nhất: <b>${esc(worst.name)}</b> (cầm ${worst.color === 'w' ? 'Trắng' : 'Đen'}, ${worst.n} ván, ${pct(worst.win + worst.draw / 2, worst.n)}% điểm). ${id ? libBtn(id, worst.name) : ''}`;
        }
        return s;
      }
      case 'strong': {
        const good = w.slice().reverse().filter(x => x.sev < 0.15 && x.sure).slice(0, 2);
        const ph = PHASES.map(([k, n]) => [n, P[k].n ? P[k].acc / P[k].n : 0, P[k].n]).filter(x => x[2] >= 10).sort((a, b) => b[1] - a[1])[0];
        const avg = d.acc.length ? Math.round(d.acc.reduce((a, x) => a + x, 0) / d.acc.length) : null;
        return `${ph ? `Giai đoạn bạn chơi tốt nhất là <b>${ph[0].toLowerCase()}</b> (độ chính xác ~${Math.round(ph[1])}%). ` : ''}
          ${good.length ? `Bạn ít gặp vấn đề về: ${good.map(x => `<b>${esc(x.name.toLowerCase())}</b>`).join(', ')}. ` : ''}
          ${avg != null ? `Độ chính xác trung bình ${avg}%.` : ''} Giữ thói quen tốt đó và tập trung vào ${esc(top.name.toLowerCase())}.`;
      }
      case 'elo': {
        const e = elo();
        const target = Math.ceil((e + 1) / 200) * 200;
        return `Để từ ${e} lên ${target} Elo: (1) mỗi ngày 10–15 phút câu đố chiến thuật, (2) ôn Sổ luyện lỗi đều đặn, (3) chơi ván dài hơn (10 phút trở lên) với ${esc(botFor())} và xem lại mọi ván thua,
          (4) sửa điểm yếu lớn nhất hiện tại: <b>${esc(top.name.toLowerCase())}</b>.<br>${steps.slice(0, 1).map(stepBtn).join('')}`;
      }
      case 'end': {
        const u = unitFor(WEAK.end.units);
        return `Tàn cuộc: ${P.end.n} nước đã chấm, ${P.end.err} lỗi lớn; ${d.pat.thrown} ván đang thắng mà không thắng được. ${esc(WEAK.end.tip)}
          ${u ? `<br>${stepBtn({ act: { kind: 'unit', u: u.u }, btn: 'Học', title: u.title })}` : ''}`;
      }
      case 'tactic': {
        const u = unitFor(WEAK.tactics.units);
        return `Bạn đã bỏ lỡ ${d.pat.tactic} đòn chiến thuật, ${d.pat.mate} lần chiếu hết và ${d.pat.hang} lần để quân bị ăn lời. ${esc(WEAK.tactics.tip)}
          <br>${stepBtn({ act: { kind: 'puzzle', themes: PZ.tactics }, btn: 'Giải', title: 'câu đố chiến thuật' })}${u ? stepBtn({ act: { kind: 'unit', u: u.u }, btn: 'Học', title: u.title }) : ''}`;
      }
      default:
        return 'Mình chưa hiểu câu hỏi. Hãy thử một trong các câu gợi ý bên dưới.';
    }
  }

  function ask(intent, text) {
    const q = text || (QUESTIONS.find(x => x[0] === intent) || [, ''])[1];
    if (aiOn()) return askAI(q);
    const d = analyse();
    chat.push({ me: true, text: q });
    chat.push({ me: false, html: intent === 'unknown' ? kbAnswer(q) : answer(intent, d) });
    chat = chat.slice(-20);
    renderChat();
    saveChat();
  }
  // Câu hỏi về khái niệm ("ghim là gì?") thì tra Thư viện kiến thức thay vì nhận xét ván của người chơi
  const CONCEPT = /l[aà] g[iì]|gi[aả]i th[ií]ch|ngh[iĩ]a l[aà]|th[eế] n[aà]o l[aà]|kh[aá]i ni[eệ]m|what is|explain|meaning of/i;
  function askText(t) {
    if (aiOn()) return askAI(t);
    if (CONCEPT.test(t)) return ask('unknown', t);
    const hit = INTENTS.find(([, re]) => re.test(t));
    ask(hit ? hit[0] : 'unknown', t);
  }

  // ---------- Thư viện kiến thức ----------

  const hasKb = () => typeof Knowledge !== 'undefined';
  const snippet = (t, n) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t);
  const PZ_NAME = { tactics: 'chiến thuật', mates: 'chiếu hết', end: 'tàn cuộc' };

  // Gợi ý `see` của bài viết → hành động của web (bỏ những gì web không có)
  function seeAct(s) {
    if (s.kind === 'unit') { const u = units().find(x => x.key === s.key); return u ? { act: { kind: 'unit', u: u.u }, label: 'Học: ' + u.title } : null; }
    if (s.kind === 'puzzle' && PZ[s.group]) return { act: { kind: 'puzzle', themes: PZ[s.group] }, label: 'Câu đố ' + PZ_NAME[s.group] };
    if (s.kind === 'lib' && libHas(s.id)) {
      const o = Library.OPENINGS.concat(Library.ENDGAMES).find(x => x.id === s.id);
      return { act: { kind: 'lib', id: s.id }, label: 'Thư viện: ' + (o ? o.nameVi : s.id) };
    }
    if (s.kind === 'review') return { act: { kind: 'review' }, label: 'Ôn Sổ luyện lỗi' };
    return null;
  }
  const actBtn = a => `<button type="button" class="ai-inline" data-act='${esc(JSON.stringify(a.act))}'>${esc(a.label)}</button>`;
  function seeActs(articles, max = 3) {
    const out = [], seen = new Set();
    for (const a of articles) for (const s of a.see || []) {
      const x = seeAct(s);
      if (!x || seen.has(JSON.stringify(x.act))) continue;
      seen.add(JSON.stringify(x.act));
      out.push(x);
    }
    return out.slice(0, max);
  }
  const refChips = list => (list.length ? `<div class="ai-refs"><small>Nguồn:</small>${list.map(a => `<button type="button" class="ai-ref-chip" data-kb-open="${esc(a.id)}">${esc(a.title)}</button>`).join('')}</div>` : '');

  // Chế độ cơ bản: câu hỏi không khớp mẫu nào thì tra Thư viện kiến thức
  function kbAnswer(q) {
    const hits = hasKb() ? Knowledge.search(q, 'any', 3) : [];
    if (!hits.length) return 'Mình chưa hiểu câu hỏi và cũng chưa tìm thấy bài nào phù hợp trong Thư viện kiến thức. Hãy thử một câu gợi ý bên dưới, hoặc gõ không dấu / từ khoá ngắn hơn (ví dụ: ghim, tốt thông, Lucena).';
    return `Mình tìm thấy trong Thư viện kiến thức:${hits.map(a => `<div class="ai-ref"><b>${esc(a.title)}</b><p>${esc(snippet(a.body, 280))}</p>
      <button type="button" class="ai-inline" data-kb-open="${esc(a.id)}">Đọc cả bài</button>${seeActs([a], 1).map(actBtn).join('')}</div>`).join('')}`;
  }

  let kb = { q: '', topic: 'tactics', open: '' };
  // Các thế cờ của một ván có nước đi (bài "Ván cờ nổi tiếng"): fens[0] là thế xuất phát, sans[i] là nước thứ i
  const gameCache = new Map();
  function gamePositions(art) {
    if (!art || !art.pgn || typeof Library === 'undefined') return null;
    if (gameCache.has(art.id)) return gameCache.get(art.id);
    const g = new Chess();
    const fens = [fenOf(g)], sans = [], last = [null];
    for (const san of Library.sanList(art.pgn)) {
      const mv = Library.playSan(g, san);
      if (!mv) break;
      sans.push(g.history[g.history.length - 1].san);
      fens.push(fenOf(g));
      last.push({ from: mv.from, to: mv.to });
    }
    const r = { fens, sans, last };
    gameCache.set(art.id, r);
    return r;
  }
  const RESULT_TEXT = { '1-0': 'Trắng thắng', '0-1': 'Đen thắng', '1/2-1/2': 'Hoà' };

  const TOPIC_IC = { opening: 'i-book', tactics: 'i-bolt', mates: 'i-crown', strategy: 'i-target', endgame: 'i-flag', games: 'i-trophy', rules: 'i-shield', training: 'i-route', general: 'i-globe' };
  function gameViewer(art) {
    const P = gamePositions(art);
    if (!P) return '';
    const n = P.sans.length;
    const ply = kb.ply == null || kb.ply > n ? n : Math.max(0, kb.ply);
    const moves = P.sans.map((m, i) => `${i % 2 === 0 ? `<span class="kg-no">${i / 2 + 1}.</span>` : ''}<button type="button" class="kg-mv${i + 1 === ply ? ' on' : ''}" data-kg-ply="${i + 1}">${esc(m)}</button>`).join('');
    return `<div class="kb-game">
      <div class="kb-game-board"><div class="lib-board">${Library.fenBoard(P.fens[ply], false, P.last[ply])}</div>
        <div class="kg-nav"><button type="button" class="ghost" data-kg-ply="0" title="Về đầu">⏮</button><button type="button" class="ghost" data-kg-ply="${Math.max(0, ply - 1)}" title="Lùi">◀</button>
          <span>${ply ? `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '...'} ${esc(P.sans[ply - 1])}` : 'Thế xuất phát'}</span>
          <button type="button" class="ghost" data-kg-ply="${Math.min(n, ply + 1)}" title="Tiến">▶</button><button type="button" class="ghost" data-kg-ply="${n}" title="Về cuối">⏭</button></div></div>
      <div class="kb-game-side"><div class="kg-meta"><b>${esc(art.white || '')}</b> – <b>${esc(art.black || '')}</b>${art.year ? ` · ${art.year}` : ''}${art.result ? ` · ${esc(RESULT_TEXT[art.result] || art.result)} (${esc(art.result)})` : ''}</div>
        <div class="kg-moves">${moves}</div>
        <div class="kg-acts"><button type="button" class="ghost" data-cp-setup="${esc(P.fens[ply])}"><svg class="ic"><use href="#i-play"/></svg>Đặt thế này lên bàn</button></div></div>
    </div>`;
  }

  function renderKb() {
    const box = $('aiKb');
    if (!box || !hasKb()) return;
    const cnt = $('cpKbCount');
    if (cnt) cnt.textContent = `${Knowledge.count()} bài`;
    const art = kb.open && Knowledge.get(kb.open);
    if (art) {
      const related = Knowledge.search(art.title + ' ' + art.tags, 'any', 5).filter(a => a.id !== art.id).slice(0, 3);
      box.innerHTML = `<article class="kb-article">
        <button type="button" class="ghost kb-back" data-kb-back><svg class="ic"><use href="#i-chevron-left"/></svg>Quay lại</button>
        <small class="kb-topic"><svg class="ic"><use href="#${TOPIC_IC[art.topic] || 'i-book'}"/></svg>${esc(Knowledge.topicName(art.topic))}</small>
        <h3>${esc(art.title)}</h3>${art.pgn ? gameViewer(art) : ''}<p>${esc(art.body)}</p>
        <div class="kb-acts">${seeActs([art]).map(actBtn).join('')}<button type="button" class="ai-inline primary" data-kb-ask="${esc(art.id)}"><svg class="ic"><use href="#i-spark"/></svg>Hỏi huấn luyện viên về bài này</button></div>
        ${related.length ? `<div class="kb-related"><small>Đọc thêm</small>${related.map(a => `<button type="button" class="ai-ref-chip" data-kb-open="${esc(a.id)}">${esc(a.title)}</button>`).join('')}</div>` : ''}
      </article>`;
      return;
    }
    const q = kb.q.trim();
    const list = q ? Knowledge.search(q, 'any', 12) : Knowledge.byTopic(kb.topic);
    box.innerHTML = `<div class="kb-search"><svg class="ic"><use href="#i-search"/></svg><input id="kbInput" type="search" maxlength="80" autocomplete="off" placeholder="Tìm: ghim, tốt thông, Lucena, Sicily, nhà vô địch…" aria-label="Tìm trong thư viện kiến thức" value="${esc(kb.q)}"></div>
      <div class="kb-topics">${Knowledge.TOPICS.filter(t => t[0] !== 'lesson').map(([id, n]) => `<button type="button" class="${!q && kb.topic === id ? 'on' : ''}" data-kb-topic="${id}"><svg class="ic"><use href="#${TOPIC_IC[id] || 'i-book'}"/></svg>${esc(n)}<small>${Knowledge.byTopic(id).length}</small></button>`).join('')}</div>
      <div class="kb-grid">${list.length ? list.map(a => `<button type="button" class="kb-item" data-kb-open="${esc(a.id)}"><small class="kb-topic">${esc(Knowledge.topicName(a.topic))}</small><b>${esc(a.title)}</b><span>${esc(snippet(a.body, 120))}</span></button>`).join('')
        : '<p class="muted">Không tìm thấy bài nào. Thử từ khác (có thể gõ không dấu).</p>'}</div>
      <p class="ai-privacy">Gồm bài soạn sẵn, ${Library.OPENINGS.length} khai cuộc và các thế tàn cuộc trong Thư viện, 20 phần Học cờ. Huấn luyện viên tra thư viện này trước khi giải thích.</p>`;
  }

  // ---------- AI qua máy chủ (GLM-4.7) ----------
  // AI tự gọi công cụ (định nghĩa trong tools/ai-worker.js), trình duyệt thực hiện rồi gửi kết quả ở lượt gọi tiếp:
  // Thư viện kiến thức, hồ sơ / ván đấu của người chơi, thế cờ trên bàn, phân tích thế cờ, bảng tàn cuộc.

  const hasCloud = () => typeof CloudAI !== 'undefined' && CloudAI.available();
  const aiOn = () => hasCloud() && CloudAI.usable();
  const aiBusy = () => typeof CloudAI !== 'undefined' && CloudAI.busy();
  const MAX_ROUNDS = 4; // số lượt tra công cụ tối đa cho mỗi câu hỏi
  let hist = [];        // các lượt hỏi đáp gần nhất (chỉ câu hỏi và câu trả lời, không kèm dữ liệu công cụ)
  const en = () => typeof I18N !== 'undefined' && I18N.lang() === 'en';

  const OUT = { win: 'thắng', draw: 'hoà', loss: 'thua' };
  const openingText = vi => (/^(khai cuộc|phòng thủ|gambit|phản|hệ thống|ván)/i.test(vi) ? vi : 'khai cuộc ' + vi);
  const fenOf = g => (typeof Engine !== 'undefined' ? Engine.positionFen(g) : g.fen());
  // Tóm tắt một ván: kết quả, khai cuộc, các lỗi lớn nhất của mình (theo bản chấm Stockfish); withFen: kèm FEN trước mỗi lỗi
  function gameBrief(g, withFen = false) {
    const tmp = new Chess();
    const moves = GameHistory.replay(g.pgn, tmp);
    if (!moves || !moves.length) return '';
    const sans = tmp.history.map(h => h.san);
    const o = typeof OPENING_BOOK !== 'undefined' && !/\[FEN\s/.test(g.pgn || '') ? OPENING_BOOK.name(sans.slice(0, 16)) : null;
    let s = `cầm ${g.color === 'w' ? 'Trắng' : 'Đen'} gặp ${g.opp || g.title || 'đối thủ'}, ${OUT[GameHistory.outcome(g)] || 'chưa rõ kết quả'}, ${Math.ceil(sans.length / 2)} nước`
      + (o ? `, ${openingText(o.vi)}` : '') + (Number.isFinite(g.acc) ? `, độ chính xác ${Math.round(g.acc)}%` : '');
    const rev = g.rev;
    if (rev && typeof rev.cls === 'string' && typeof Coach !== 'undefined') {
      const gg = new Chess(tmp.startFen);
      const ev = Array.isArray(rev.evals) ? rev.evals : [], best = Array.isArray(rev.best) ? rev.best : [];
      const pov = cp => (g.color === 'w' ? cp : -cp) / 100;
      const bad = [];
      for (let i = 0; i < rev.cls.length && i < sans.length; i++) {
        const side = gg.turn, no = gg.fullmove;
        const fen = withFen ? fenOf(gg) : '';
        const cls = (Coach.BY_CODE[rev.cls[i]] || {}).id;
        if (!gg.move(moves[i])) break;
        if (side !== g.color || !/blunder|mistake|miss/.test(cls || '')) continue;
        const drop = ev.length > i + 1 ? pov(ev[i]) - pov(ev[i + 1]) : 0;
        bad.push({ drop, txt: `nước ${no}${side === 'w' ? '.' : '...'}${sans[i]}${best[i] ? ` (Stockfish đề nghị ${best[i]})` : ''}`
          + (ev.length > i + 1 ? `, đánh giá theo phía mình từ ${pov(ev[i]).toFixed(1)} xuống ${pov(ev[i + 1]).toFixed(1)}` : '') + (fen ? `, FEN trước nước này: ${fen}` : '') });
      }
      bad.sort((a, b) => b.drop - a.drop);
      s += bad.length ? `. Lỗi lớn: ${bad.slice(0, 3).map(b => b.txt).join('; ')}` : '. Không có lỗi lớn.';
    } else s += '. Ván này chưa được chấm.';
    return s;
  }

  function playerBrief(d) {
    const L = [];
    const P = d.phase;
    L.push(`Elo hiện tại: ${elo()}.`);
    L.push(`Nhật ký: ${d.total} ván (${d.res.win} thắng, ${d.res.draw} hoà, ${d.res.loss} thua), ${d.analysed} ván đã được Stockfish chấm từng nước.`);
    if (d.acc.length) {
      const avg = Math.round(d.acc.reduce((a, x) => a + x, 0) / d.acc.length);
      const r = d.acc.slice(0, 5), o = d.acc.slice(5, 10);
      const tr = r.length >= 3 && o.length >= 3 ? Math.round(r.reduce((a, x) => a + x, 0) / r.length - o.reduce((a, x) => a + x, 0) / o.length) : null;
      L.push(`Độ chính xác trung bình ${avg}%${tr != null ? ` (5 ván gần nhất ${tr >= 0 ? 'tăng' : 'giảm'} ${Math.abs(tr)} điểm so với 5 ván trước)` : ''}.`);
    }
    if (d.analysed >= 2) {
      L.push('Theo giai đoạn: ' + PHASES.map(([k, n]) => `${n} ${P[k].n} nước, ${P[k].err} lỗi lớn${P[k].n ? `, chính xác ~${Math.round(P[k].acc / P[k].n)}%` : ''}`).join('; ') + '.');
      const top = d.weak.filter(w => w.sev >= 0.15).slice(0, 3);
      if (top.length) L.push('Điểm yếu lớn nhất (mức nặng 0-1): ' + top.map(w => `${w.name} (${w.sev.toFixed(2)}: ${w.why})`).join('; ') + '.');
      const good = d.weak.filter(w => w.sev < 0.15 && w.sure).map(w => w.name);
      if (good.length) L.push('Ít gặp vấn đề về: ' + good.join(', ') + '.');
      const ex = top[0] && d.examples[top[0].id];
      if (ex) L.push(`Ví dụ lỗi "${top[0].name}": nước ${ex.no} ván với ${ex.opp}, đi ${ex.san}, nên đi ${ex.best}.`);
      L.push(`Thói quen: ${d.pat.earlyQueen} ván ra Hậu trong 5 nước đầu, ${d.pat.lateCastle} ván chưa nhập thành sau 12 nước, ${d.pat.mated} ván bị chiếu hết, ${d.pat.thrown} ván đang hơn ≥ 3 điểm mà không thắng.`);
    } else L.push('Chưa đủ ván đã chấm (cần ít nhất 2) để chẩn đoán điểm yếu.');
    const ops = Object.values(d.openings).sort((a, b) => b.n - a.n).slice(0, 4);
    if (ops.length) L.push('Khai cuộc hay chơi: ' + ops.map(o => `${o.name} cầm ${o.color === 'w' ? 'Trắng' : 'Đen'} ${o.n} ván, ${Math.round(100 * (o.win + o.draw / 2) / o.n)}% điểm`).join('; ') + '.');
    const us = units();
    if (us.length) {
      const done = us.reduce((a, u) => a + u.done, 0), tot = us.reduce((a, u) => a + u.total, 0);
      const next = us.find(u => u.done < u.total && u.unlocked);
      L.push(`Học cờ: xong ${done}/${tot} bài${next ? `, phần đang học: "${next.title}"` : ''}.`);
    }
    if (typeof Coach !== 'undefined') L.push(`Sổ luyện lỗi: ${Coach.due().length} thế cờ đến hạn ôn.`);
    const g = games()[0];
    if (g) { const b = gameBrief(g); if (b) L.push('Ván gần nhất: ' + b + '.'); }
    L.push('Lộ trình web đang gợi ý: ' + roadmap(d).slice(0, 3).map(s => s.title).join('; ') + '.');
    return L.join('\n');
  }

  // Ván đang đấu (online, hoặc với máy chưa xong): không xem / phân tích thế cờ của ván đó để giữ công bằng
  function liveGame() {
    try { if (typeof Online !== 'undefined' && Online.inGame && Online.inGame()) return true; } catch {}
    try { return mode === 'play' && aiColor !== 'none' && !playResult && !game.isGameOver() && game.history.length > 0; } catch { return false; }
  }
  const placement = fen => String(fen || '').trim().split(/\s+/).slice(0, 2).join(' ');
  const LIVE_NO = 'Ván đang diễn ra nên không xem hay phân tích thế cờ của ván này (giữ công bằng). Hãy hỏi lại sau khi ván kết thúc.';

  // Kiểm tra FEN: đúng 8 hàng, mỗi bên đúng một Vua
  function parseFen(fen) {
    const f = String(fen || '').trim();
    const pl = f.split(/\s+/)[0];
    if (pl.split('/').length !== 8 || (pl.match(/K/g) || []).length !== 1 || (pl.match(/k/g) || []).length !== 1) return null;
    try { const g = new Chess(f); return g.board && g.board.length === 64 ? g : null; } catch { return null; }
  }
  // Chuỗi nước UCI → SAN có số nước ("12. Nf3 Nc6 13. Bb5")
  function sanLine(fen, ucis, max = 10) {
    const g = new Chess(fen);
    const out = [];
    for (const raw of ucis.slice(0, max)) {
      // Lichess ghi nhập thành là Vua đi tới ô Xe (e1h1, e8a8…): đổi về ô đích của Vua (e1g1, e8c8…)
      const p = g.board[sqIndex(raw.slice(0, 2))];
      const u = p && p[1] === 'K' ? ({ e1h1: 'e1g1', e1a1: 'e1c1', e8h8: 'e8g8', e8a8: 'e8c8' }[raw] || raw) : raw;
      const from = sqIndex(u.slice(0, 2)), to = sqIndex(u.slice(2, 4)), promo = u[4] ? u[4].toUpperCase() : undefined;
      const m = g.legalMoves().find(x => x.from === from && x.to === to && (!promo || x.promotion === promo));
      const side = g.turn, no = g.fullmove;
      if (!m || !g.move({ from: m.from, to: m.to, promotion: m.promotion || undefined })) break;
      out.push((side === 'w' ? no + '. ' : !out.length ? no + '... ' : '') + g.history[g.history.length - 1].san);
    }
    return out.join(' ');
  }
  const evalText = (cp, mate) => (mate != null ? (mate > 0 ? `Trắng chiếu hết sau ${mate} nước` : `Đen chiếu hết sau ${-mate} nước`)
    : `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(2)} (${Math.abs(cp) < 40 ? 'cân bằng' : cp > 0 ? (cp < 120 ? 'Trắng hơn một chút' : cp < 300 ? 'Trắng hơn rõ' : 'Trắng thắng thế') : (cp > -120 ? 'Đen hơn một chút' : cp > -300 ? 'Đen hơn rõ' : 'Đen thắng thế')})`);
  const getJson = async (u, ms) => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    try { const r = await fetch(u, { signal: c.signal }); return r.ok ? await r.json() : null; } catch { return null; } finally { clearTimeout(t); }
  };

  // Stockfish 19 trên máy người chơi (điểm theo bên tới lượt → đổi về góc nhìn Trắng), kèm Lichess cloud eval nếu thế cờ đã có sẵn
  let sfTag = 0; // mỗi lượt phân tích một nhãn riêng: Engine huỷ lượt cũ cùng nhãn, mà AI có thể phân tích nhiều thế cờ cùng lúc
  async function analysePos(fen, out) {
    const tag = 'coach-' + (++sfTag);
    const g = parseFen(fen);
    if (!g) return 'FEN không hợp lệ.';
    if (liveGame() && placement(fenOf(game)) === placement(fen)) return LIVE_NO;
    const st = g.status();
    if (st === 'checkmate') return `Thế cờ đã chiếu hết, ${g.turn === 'w' ? 'Đen' : 'Trắng'} thắng.`;
    if (st !== 'playing') return 'Thế cờ đã kết thúc (hoà).';
    if (out) out.boards.push({ fen, cap: 'Thế cờ đã phân tích', flip: g.turn === 'b' });
    const head = `Bên tới lượt: ${g.turn === 'w' ? 'Trắng' : 'Đen'}.`;
    const sf = (async () => {
      if (typeof Engine === 'undefined' || !Engine.analyse) return null;
      try { return await Engine.analyse(fen, { depth: 20, movetime: 4000, multipv: 2, tag }); } catch { return null; }
    })();
    const cloud = getJson('https://lichess.org/api/cloud-eval?multiPv=2&fen=' + encodeURIComponent(fen), 5000);
    const [lines, c] = await Promise.all([sf, cloud]);
    const parts = [head];
    if (lines && lines.length) {
      const s = g.turn === 'w' ? 1 : -1;
      parts.push(`${typeof Engine !== 'undefined' && Engine.name ? Engine.name() : 'Stockfish 19'} (trên máy, độ sâu ~20):\n` + lines.slice(0, 2).map((l, i) =>
        `Biến ${i + 1}: ${evalText(l.mate != null ? 0 : s * l.cp, l.mate != null ? s * l.mate : null)} · ${sanLine(fen, l.pv || [l.move])}`).join('\n'));
    }
    if (c && Array.isArray(c.pvs) && c.pvs.length) {
      parts.push(`Lichess cloud eval (độ sâu ${c.depth}):\n` + c.pvs.slice(0, 2).map((p, i) => `Biến ${i + 1}: ${evalText(p.cp, p.mate)} · ${sanLine(fen, String(p.moves || '').split(' '))}`).join('\n'));
    }
    // Đe doạ: nếu bên tới lượt "bỏ lượt", bên kia sẽ làm gì (giúp giải thích ý đồ của nước vừa đi)
    if (lines && lines.length && !g.inCheck?.()) {
      const parts2 = fen.trim().split(/\s+/);
      parts2[1] = parts2[1] === 'w' ? 'b' : 'w';
      parts2[3] = '-';
      const nf = parts2.join(' ');
      const gg = parseFen(nf);
      if (gg && gg.status() === 'playing' && typeof Engine !== 'undefined') {
        let t = null;
        try { t = await Engine.analyse(nf, { depth: 14, movetime: 1200, multipv: 1, tag: tag + 't' }); } catch {}
        if (t && t[0]) parts.push(`Đe doạ của ${gg.turn === 'w' ? 'Trắng' : 'Đen'} nếu được đi tiếp: ${sanLine(nf, t[0].pv || [t[0].move], 3)}`);
      }
    }
    return parts.length > 1 ? parts.join('\n') : 'Không phân tích được thế cờ này lúc này.';
  }

  const TB_CAT = { win: 'thắng', 'cursed-win': 'thắng nhưng vướng luật 50 nước (thực tế hoà)', 'maybe-win': 'có thể thắng', draw: 'hoà', 'blessed-loss': 'thua nhưng được cứu nhờ luật 50 nước (thực tế hoà)', 'maybe-loss': 'có thể thua', loss: 'thua', unknown: 'chưa rõ' };
  const TB_FLIP = { win: 'loss', 'cursed-win': 'blessed-loss', 'maybe-win': 'maybe-loss', draw: 'draw', 'blessed-loss': 'cursed-win', 'maybe-loss': 'maybe-win', loss: 'win', unknown: 'unknown' };
  async function tablebase(fen, out) {
    const g = parseFen(fen);
    if (!g) return 'FEN không hợp lệ.';
    if (liveGame() && placement(fenOf(game)) === placement(fen)) return LIVE_NO;
    if (out && !out.boards.some(b => b.fen === fen)) out.boards.push({ fen, cap: 'Thế tàn cuộc', flip: g.turn === 'b' });
    const n = g.board.filter(Boolean).length;
    if (n > 7) return `Thế cờ còn ${n} quân, bảng tàn cuộc chỉ dùng được khi còn tối đa 7 quân. Hãy dùng analyse_position.`;
    const r = await getJson('https://tablebase.lichess.ovh/standard?fen=' + encodeURIComponent(fen), 6000);
    if (!r || !r.category) return 'Không tra được bảng tàn cuộc lúc này.';
    const side = g.turn === 'w' ? 'Trắng' : 'Đen';
    const mateIn = dtm => (dtm ? ` (chiếu hết sau khoảng ${Math.ceil(Math.abs(dtm) / 2)} nước)` : '');
    const dist = mateIn(r.dtm);
    const moves = (r.moves || []).slice(0, 4).map(m => `${m.san}: ${side} ${TB_CAT[TB_FLIP[m.category] || 'unknown']}${mateIn(m.dtm)}`);
    return `Bảng tàn cuộc Lichess (chính xác tuyệt đối): ${side} tới lượt, kết quả với nước đi tốt nhất: ${side} ${TB_CAT[r.category] || r.category}${dist}.\nCác nước: ${moves.join('; ')}.`;
  }

  function currentPos() {
    if (liveGame()) return LIVE_NO;
    const sans = game.history.map(h => h.san);
    if (!sans.length) return `Bàn cờ chưa có nước nào. FEN: ${fenOf(game)}`;
    const g0 = new Chess(game.startFen || undefined);
    let no = g0.fullmove, side = g0.turn;
    const list = sans.map((s, i) => { const t = (side === 'w' ? no + '. ' : i === 0 ? no + '... ' : '') + s; if (side === 'b') no++; side = side === 'w' ? 'b' : 'w'; return t; });
    const o = typeof OPENING_BOOK !== 'undefined' && (!game.startFen || /^rnbqkbnr\/pppppppp\/8\/8\/8\/8\/PPPPPPPP\/RNBQKBNR w/.test(game.startFen)) ? OPENING_BOOK.name(sans.slice(0, 16)) : null;
    const st = game.status();
    return `FEN: ${fenOf(game)}\nBên tới lượt: ${game.turn === 'w' ? 'Trắng' : 'Đen'}. Trạng thái: ${st === 'checkmate' ? 'chiếu hết' : st === 'playing' ? (game.isGameOver() ? 'đã kết thúc' : 'ván đã dừng / đang xem lại') : 'hoà'}.`
      + (o ? ` Khai cuộc: ${o.vi}.` : '') + `\nCác nước${list.length > 40 ? ' (40 nước cuối)' : ''}: ${list.slice(-40).join(' ') || '(chưa có)'}`;
  }

  // Nhận xét một ván: Stockfish 19 chấm từng nước (chấm ngay nếu ván chưa chấm), trả về các khoảnh khắc quyết định
  async function reviewGame(index, out, onStep) {
    const list = games();
    let g = list[Math.max(1, Math.min(20, Number(index) || 1)) - 1];
    if (!g) return list.length ? `Nhật ký chỉ có ${list.length} ván.` : 'Nhật ký chưa có ván nào.';
    if (!g.rev || typeof g.rev.cls !== 'string') {
      onStep('Stockfish 19 đang chấm ván…');
      const r = await GameHistory.runAnalysis(g, f => onStep(`Stockfish 19 đang chấm ván · ${Math.round(f * 100)}%`));
      if (!r) return 'Chưa chấm được ván này (máy phân tích đang bận). Hãy thử lại sau ít phút.';
      g = GameHistory.read().find(x => x.id === g.id) || g;
      cache = null;
    }
    const tmp = new Chess();
    const moves = GameHistory.replay(g.pgn, tmp);
    if (!moves || !moves.length) return 'Không đọc được nước đi của ván này.';
    const rev = g.rev, ev = Array.isArray(rev.evals) ? rev.evals : [], best = Array.isArray(rev.best) ? rev.best : [];
    const sans = tmp.history.map(h => h.san);
    const o = typeof OPENING_BOOK !== 'undefined' && !/\[FEN\s/.test(g.pgn || '') ? OPENING_BOOK.name(sans.slice(0, 16)) : null;
    const gg = new Chess(tmp.startFen);
    const rows = [];
    for (let i = 0; i < rev.cls.length && i < sans.length; i++) {
      const side = gg.turn, no = gg.fullmove, fen = fenOf(gg);
      const c = Coach.BY_CODE[rev.cls[i]] || Coach.CLASS.good;
      if (!gg.move(moves[i])) break;
      const b = ev.length > i + 1 ? ev[i] / 100 : null, a = ev.length > i + 1 ? ev[i + 1] / 100 : null;
      rows.push({ i, side, no, fen, san: sans[i], cls: c.id, name: c.name, best: best[i] || '', b, a, swing: b != null ? Math.abs(a - b) : 0 });
    }
    const mine = rows.filter(r => r.side === g.color);
    const cnt = ids => mine.filter(r => ids.includes(r.cls)).length;
    const acc = rev.acc || {};
    const key = rows.filter(r => /blunder|mistake|miss/.test(r.cls) || (r.side === g.color && /brilliant|great/.test(r.cls)))
      .sort((x, y) => y.swing - x.swing).slice(0, 7).sort((x, y) => x.i - y.i);
    const fmt = v => (v == null ? '?' : (Math.abs(v) >= 90 ? (v > 0 ? 'Trắng chiếu hết' : 'Đen chiếu hết') : (v >= 0 ? '+' : '') + v.toFixed(1)));
    const worst = mine.filter(r => /blunder|mistake|miss/.test(r.cls)).sort((x, y) => y.swing - x.swing)[0];
    if (worst && out) out.boards.push({ fen: worst.fen, cap: `Trước nước ${worst.no}${worst.side === 'w' ? '.' : '...'}${worst.san}: tìm nước tốt hơn`, flip: g.color === 'b' });
    const L = [
      `Ván ${index}: ${new Date(g.at).toLocaleDateString('vi-VN')}, ${g.mode === 'online' ? 'online' : g.mode === 'import' ? 'ván nhập' : 'với máy'}, người chơi cầm ${g.color === 'w' ? 'Trắng' : 'Đen'} gặp ${g.opp || g.title || 'đối thủ'}, kết quả: ${OUT[GameHistory.outcome(g)] || 'chưa rõ'}, ${Math.ceil(sans.length / 2)} nước${o ? `, ${openingText(o.vi)}` : ''}.`,
      `Độ chính xác (Stockfish 19): Trắng ${acc.w != null ? acc.w + '%' : '?'}, Đen ${acc.b != null ? acc.b + '%' : '?'}.`,
      `Nước của người chơi: ${cnt(['brilliant', 'great'])} nước hay, ${cnt(['best', 'excellent'])} nước tốt nhất / xuất sắc, ${cnt(['inaccuracy'])} thiếu chính xác, ${cnt(['mistake', 'miss'])} sai lầm / bỏ lỡ, ${cnt(['blunder'])} nước hớ.`,
      'Khoảnh khắc quyết định (đánh giá theo góc nhìn Trắng, trước → sau):',
      ...key.map(r => `- Nước ${r.no}${r.side === 'w' ? '.' : '...'}${r.san} (${r.side === g.color ? 'người chơi' : 'đối thủ'}, ${r.name})${r.best ? `, tốt nhất là ${r.best}` : ''}, ${fmt(r.b)} → ${fmt(r.a)}. FEN trước nước này: ${r.fen}`),
      `Toàn bộ nước đi: ${sans.map((x, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : '') + x).join(' ').slice(0, 1600)}`,
    ];
    if (!key.length) L.splice(3, 1, 'Không có sai lầm lớn nào của hai bên.');
    return L.join('\n');
  }

  // Tra Wikipedia (tiếng Việt hoặc tiếng Anh, API công khai, không cần khoá): lịch sử, kỳ thủ, giải đấu, ván cờ ngoài thư viện
  async function wikipedia(query, lang, out) {
    if (!query.trim()) return 'Thiếu từ khoá.';
    const langs = lang ? [lang, lang === 'vi' ? 'en' : 'vi'] : ['vi', 'en'];
    for (const L of langs) {
      const api = `https://${L}.wikipedia.org/w/api.php?format=json&origin=*&`;
      const sr = await getJson(api + 'action=query&list=search&srlimit=3&srsearch=' + encodeURIComponent(query), 6000);
      const titles = ((sr && sr.query && sr.query.search) || []).map(x => x.title).slice(0, 2);
      if (!titles.length) continue;
      const ex = await getJson(api + 'action=query&prop=extracts&exintro=1&explaintext=1&exchars=2500&redirects=1&titles=' + encodeURIComponent(titles.join('|')), 6000);
      const pages = Object.values((ex && ex.query && ex.query.pages) || {}).filter(p => p.extract);
      if (!pages.length) continue;
      for (const pg of pages) if (out) out.links.push({ title: `Wikipedia: ${pg.title}`, url: `https://${L}.wikipedia.org/wiki/${encodeURIComponent(pg.title.replace(/ /g, '_'))}` });
      return `Nguồn: Wikipedia tiếng ${L === 'vi' ? 'Việt' : 'Anh'} (có thể chưa cập nhật hoặc chưa chính xác tuyệt đối).\n\n` + pages.map(pg => `## ${pg.title}\n${pg.extract}`).join('\n\n');
    }
    return 'Không tìm thấy bài Wikipedia phù hợp.';
  }

  // Thực hiện một công cụ, trả về chữ cho AI đọc. hitsOut: gom các bài kiến thức đã dùng (để hiện nút và nguồn)
  async function runTool(name, args, hitsOut, out, onStep) {
    switch (name) {
      case 'search_knowledge': {
        const hs = hasKb() ? Knowledge.search(String(args.query || ''), 'any', 3) : [];
        for (const a of hs) if (!hitsOut.includes(a)) hitsOut.push(a);
        for (const a of hs) {
          const P = a.pgn && gamePositions(a);
          if (P && out && !out.boards.some(b => b.fen === P.fens[P.fens.length - 1])) out.boards.push({ fen: P.fens[P.fens.length - 1], cap: `${a.title}: thế cuối`, flip: false });
        }
        return hs.length ? hs.map(a => `## ${a.title}\n${a.body}${a.pgn ? `\nTrắng: ${a.white}; Đen: ${a.black}; năm ${a.year}; kết quả ${a.result}.\nNước đi: ${a.pgn}` : ''}`).join('\n\n') : 'Không tìm thấy bài phù hợp trong Thư viện kiến thức.';
      }
      case 'get_player_profile': return playerBrief(analyse());
      case 'get_recent_games': {
        const n = Math.max(1, Math.min(5, Number(args.count) || 3));
        const list = games().slice(0, n);
        if (!list.length) return 'Nhật ký chưa có ván nào.';
        return list.map((g, i) => `Ván ${i + 1} (${new Date(g.at).toLocaleDateString('vi-VN')}${g.mode === 'online' ? ', online' : g.mode === 'import' ? ', ván nhập' : ', với máy'}): ${gameBrief(g, true)}`).join('\n');
      }
      case 'get_current_position': return currentPos();
      case 'review_game': return reviewGame(args.index, out, onStep);
      case 'search_wikipedia': return wikipedia(String(args.query || ''), args.lang === 'en' ? 'en' : args.lang === 'vi' ? 'vi' : '', out);
      case 'analyse_position': return analysePos(args.fen, out);
      case 'endgame_tablebase': return tablebase(args.fen, out);
      default: return 'Công cụ không tồn tại.';
    }
  }
  const TOOL_LABEL = { search_knowledge: 'Tra Thư viện kiến thức', get_player_profile: 'Đọc hồ sơ lối chơi', get_recent_games: 'Xem các ván gần đây',
    get_current_position: 'Xem thế cờ trên bàn', analyse_position: 'Stockfish 19 phân tích thế cờ', endgame_tablebase: 'Tra bảng tàn cuộc', review_game: 'Xem lại ván với Stockfish 19', search_wikipedia: 'Tra Wikipedia' };

  const CLOUD_ERR = { LIMIT: 'Bạn hỏi hơi nhanh, đợi một phút rồi hỏi tiếp nhé.', BUSY: 'Máy chủ đang đông người dùng, bạn thử lại sau ít phút nhé.', NETWORK: 'Không kết nối được máy chủ của trợ lý.' };
  async function askAI(q) {
    if (aiBusy()) { toast('Trợ lý đang trả lời câu trước, đợi chút nhé.'); return; }
    const d = analyse();
    chat.push({ me: true, text: q });
    const msg = { me: false, md: '', live: true, hits: [], steps: [], boards: [], links: [] };
    chat.push(msg);
    chat = chat.slice(-20);
    renderChat();
    let raf = 0;
    const paint = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderLive(msg); }); };
    const sys = `Trả lời ${en() ? 'bằng tiếng Anh' : 'bằng tiếng Việt'}. Tên người chơi: ${meName() || 'không rõ'}. Khoảng ${elo()} Elo, có ${d.total} ván trong Nhật ký (${d.analysed} ván đã được Stockfish 19 chấm).`;
    // Luôn kèm bài liên quan nhất trong Thư viện kiến thức (mô hình đôi khi quên tự tra, định nghĩa phải khớp thư viện)
    const refs = hasKb() ? Knowledge.search(q, 'any', 2).filter(a => !a.id.startsWith('unit:')) : [];
    const userMsg = refs.length ? `${q}\n\n---\nTHAM KHẢO TỪ THƯ VIỆN KIẾN THỨC (có thể không liên quan, chỉ dùng khi đúng chủ đề):\n${refs.map(a => `## ${a.title}\n${snippet(a.body, 900)}`).join('\n\n')}` : q;
    for (const a of refs) if (!msg.hits.includes(a)) msg.hits.push(a);
    const messages = [{ role: 'system', content: sys }, ...hist.flatMap(h => [{ role: 'user', content: h.q }, { role: 'assistant', content: h.a }]), { role: 'user', content: userMsg }];
    try {
      for (let round = 0; ; round++) {
        const final = round >= MAX_ROUNDS;
        let r;
        try { r = await CloudAI.chat(messages, t => { msg.md = t; paint(); }, final); } catch (e) {
          if (e.message !== 'BUSY') throw e;
          // Máy chủ mô hình đang quá tải: đợi một chút rồi hỏi lại một lần
          const k = msg.steps.push('Máy chủ đang đông, đang thử lại…') - 1;
          paint();
          await new Promise(res => setTimeout(res, 2500));
          r = await CloudAI.chat(messages, t => { msg.md = t; paint(); }, final);
          msg.steps.splice(k, 1);
        }
        if (r.stopped) { msg.md = msg.md || 'Đã dừng.'; break; }
        if (!r.tools.length || final) { msg.md = r.text || 'Mình chưa nghĩ ra câu trả lời, bạn hỏi lại theo cách khác nhé.'; break; }
        // AI muốn tra cứu: thực hiện các công cụ rồi gửi kết quả
        messages.push({ role: 'assistant', content: r.text || '', tool_calls: r.tools.map(t => ({ id: t.id, type: 'function', function: { name: t.name, arguments: t.arguments } })) });
        msg.md = '';
        const results = await Promise.all(r.tools.map(async t => {
          let args = {};
          try { args = JSON.parse(t.arguments || '{}') || {}; } catch {}
          const k = msg.steps.push(TOOL_LABEL[t.name] + (/search_/.test(t.name) && args.query ? `: ${String(args.query).slice(0, 40)}` : '')) - 1;
          paint();
          const onStep = txt => { msg.steps[k] = txt; paint(); };
          let out;
          try { out = await runTool(t.name, args, msg.hits, msg, onStep); } catch (e) { console.warn(e); out = 'Công cụ gặp lỗi.'; }
          if (t.name === 'review_game') msg.steps[k] = TOOL_LABEL.review_game;
          return { role: 'tool', tool_call_id: t.id, content: String(out).slice(0, 12000) };
        }));
        messages.push(...results);
      }
      hist = [...hist, { q, a: snippet(msg.md, 1500) }].slice(-4);
    } catch (e) {
      console.warn(e);
      msg.md = '';
      msg.html = esc(CLOUD_ERR[e.message] || 'Máy chủ của trợ lý gặp lỗi.') + ' Mình trả lời theo chế độ cơ bản nhé:<br>' + (() => { const hit = INTENTS.find(([, re]) => re.test(q)); return hit && !CONCEPT.test(q) ? answer(hit[0], d) : kbAnswer(q); })();
      renderEngine();
    }
    msg.live = false;
    if (raf) cancelAnimationFrame(raf);
    if (!msg.hits.length && hasKb()) msg.hits = Knowledge.search(q, 'any', 2); // vẫn gợi ý bài đọc thêm
    renderChat();
    saveChat();
  }

  // Markdown tối giản cho câu trả lời của AI (chữ đã được thoát HTML trước)
  function md(t) {
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
    let html = '', list = '';
    const close = () => { if (list) { html += `</${list}>`; list = ''; } };
    for (const raw of String(t).split('\n')) {
      const line = raw.trim();
      let m;
      if (!line) { close(); continue; }
      if ((m = /^#{1,4}\s+(.*)$/.exec(line))) { close(); html += `<p><b>${inline(m[1])}</b></p>`; continue; }
      if ((m = /^[-*•]\s+(.*)$/.exec(line))) { if (list !== 'ul') { close(); html += '<ul>'; list = 'ul'; } html += `<li>${inline(m[1])}</li>`; continue; }
      if ((m = /^\d+[.)]\s+(.*)$/.exec(line))) { if (list !== 'ol') { close(); html += '<ol>'; list = 'ol'; } html += `<li>${inline(m[1])}</li>`; continue; }
      close();
      html += `<p>${inline(line)}</p>`;
    }
    close();
    return html;
  }

  function botHtml(m) {
    if (m.html != null) return m.html;
    const steps = m.steps && m.steps.length ? `<div class="ai-steps">${m.steps.map(s => `<span>${esc(s)}</span>`).join('')}</div>` : '';
    const body = md(m.md) || '<p class="ai-typing"><span></span><span></span><span></span></p>';
    if (m.live) return steps + body + '<button type="button" class="ai-inline ai-stop" data-ai-stop>Dừng</button>';
    const boards = (m.boards || []).slice(0, 2).map(b => `<figure class="cp-board"><div class="lib-board">${typeof Library !== 'undefined' ? Library.fenBoard(b.fen, b.flip) : ''}</div>
      <figcaption>${esc(b.cap)}</figcaption><button type="button" class="ghost" data-cp-setup="${esc(b.fen)}"><svg class="ic"><use href="#i-play"/></svg>Đặt lên bàn</button></figure>`).join('');
    const links = (m.links || []).slice(0, 4).map(l => `<a class="ai-ref-chip" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)} ↗</a>`).join('');
    return steps + body + (boards ? `<div class="cp-boards">${boards}</div>` : '') + (m.hits && m.hits.length ? `<div class="ai-acts">${seeActs(m.hits, 2).map(actBtn).join('')}</div>${refChips(m.hits)}` : '')
      + (links ? `<div class="ai-refs"><small>Nguồn ngoài:</small>${links}</div>` : '');
  }
  function renderLive(m) {
    const box = $('aiChat');
    const el = box && box.lastElementChild;
    if (!el || chat[chat.length - 1] !== m) return;
    const body = el.querySelector('.cp-msg-body') || el;
    body.innerHTML = botHtml(m);
    box.scrollTop = box.scrollHeight;
  }

  // Dòng trạng thái AI
  function renderEngine() {
    const st = $('cpStatus'), priv = $('aiPrivacy');
    if (!st) return;
    const ok = aiOn();
    st.className = 'cp-status' + (ok ? ' on' : hasCloud() ? ' warn' : '');
    st.innerHTML = ok ? '<span class="ai-dot"></span>Đang trực tuyến · kiểm tra nước đi bằng Stockfish 19'
      : hasCloud() ? '<span class="ai-dot"></span>Máy chủ tạm bận · đang dùng chế độ cơ bản, 1 phút nữa thử lại'
        : '<span class="ai-dot"></span>Chế độ cơ bản · chẩn đoán bằng Stockfish 19 trên máy bạn';
    if (hasCloud() && !ok) setTimeout(() => { renderEngine(); renderQuick(); }, 61000);
    if (priv) priv.textContent = hasCloud()
      ? 'Câu hỏi và số liệu ván được gửi tới máy chủ của Royal Gambit (mô hình GLM-4.7 của Z.ai) để trả lời, thế cờ có thể được gửi tới Lichess. Stockfish 19 chạy trên máy bạn.'
      : 'Mọi phân tích chạy ngay trên máy bạn (Stockfish 19 và Thư viện kiến thức). Không gửi dữ liệu ra ngoài.';
  }

  // ---------- Giao diện (trang Trợ lý) ----------
  // Bốn phần chuyển bằng thanh thẻ: Trò chuyện · Lộ trình · Ván đấu · Kiến thức (mỗi lúc chỉ hiện một phần cho gọn mắt).

  const bar = (v, max, cls = '') => `<span class="ai-bar ${cls}"><i style="width:${max ? Math.min(100, Math.round(100 * v / max)) : 0}%"></i></span>`;
  const meName = () => { try { return Profile.me().name || ''; } catch { return ''; } };
  const AVATAR = '<span class="cp-avatar"><img src="img/logo.svg?v=2" alt=""></span>';
  let pane = 'chat';

  function setPane(p) {
    pane = p;
    const page = $('coachPage');
    if (!page) return;
    page.dataset.pane = p;
    for (const b of page.querySelectorAll('[data-cp-tab]')) b.setAttribute('aria-selected', String(b.dataset.cpTab === p));
    if (p === 'chat') { const box = $('aiChat'); if (box) box.scrollTop = box.scrollHeight; }
  }

  function statsOf(d) {
    const avg = d.acc.length ? Math.round(d.acc.reduce((a, x) => a + x, 0) / d.acc.length) : null;
    const recent = d.acc.slice(0, 5), older = d.acc.slice(5, 10);
    const trend = recent.length >= 3 && older.length >= 3 ? Math.round(recent.reduce((a, x) => a + x, 0) / recent.length - older.reduce((a, x) => a + x, 0) / older.length) : null;
    const score = d.total ? Math.round(100 * (d.res.win + d.res.draw / 2) / d.total) : null;
    return { avg, trend, score };
  }
  function renderStats(d) {
    const { avg, trend, score } = statsOf(d);
    $('cpMini').innerHTML = `<span><b>${elo()}</b> Elo</span><span><b>${d.total}</b> ván</span>${avg != null ? `<span><b>${avg}%</b> chính xác</span>` : ''}`;
    $('cpStats').innerHTML = `
      <div><b>${elo()}</b><small>Elo</small></div>
      <div><b>${d.total}</b><small>ván · ${d.analysed} đã chấm</small></div>
      <div><b>${avg != null ? avg + '%' : '–'}</b><small>chính xác${trend != null ? ` <span class="${trend >= 0 ? 'up' : 'down'}">${trend >= 0 ? '▲' : '▼'}${Math.abs(trend)}</span>` : ''}</small></div>
      <div><b>${score != null ? score + '%' : '–'}</b><small>điểm số</small></div>`;
  }

  function renderPlan(d) {
    const steps = roadmap(d);
    let html = '';
    if (d.unanalysed.length) {
      html += `<div class="ai-note"><span>${d.analysed < 2 ? '<b>Cần thêm dữ liệu.</b> ' : ''}Còn ${d.unanalysed.length} ván chưa được Stockfish 19 chấm. Chấm xong thì lộ trình sát với lỗi của bạn hơn.</span>
        <button type="button" id="aiBatch" class="primary"${busy ? ' disabled' : ''}><svg class="ic"><use href="#i-cpu"/></svg>Chấm ${Math.min(5, d.unanalysed.length)} ván</button></div>`;
    } else if (!d.total) {
      html += '<div class="ai-note"><span><b>Chưa có ván nào.</b> Chơi vài ván với máy hoặc Online: Stockfish 19 chấm từng nước và trợ lý sẽ tìm điểm yếu của bạn. Trong lúc chờ, đây là lộ trình theo tiến độ học.</span></div>';
    }
    html += `<ol class="ai-road">${steps.map((s, i) => `<li><span class="ai-step-n">${i + 1}</span><span class="ai-step-ic"><svg class="ic"><use href="#${s.icon}"/></svg></span>
      <span class="ai-step-text"><b>${esc(s.title)}</b><small>${esc(s.why)}</small></span>
      <button type="button" class="${i === 0 ? 'primary' : ''}" data-act='${esc(JSON.stringify(s.act))}'>${esc(s.btn)}</button></li>`).join('')}</ol>`;
    $('cpPlan').innerHTML = html;
    const b = $('aiBatch');
    if (b) b.addEventListener('click', () => analyseBatch(5));
  }

  function renderDiag(d) {
    const P = d.phase;
    if (d.analysed < 2) {
      $('cpDiag').innerHTML = '<p class="muted cp-empty">Cần ít nhất 2 ván đã được Stockfish 19 chấm để chẩn đoán lối chơi.</p>';
      return;
    }
    const maxErr = Math.max(0.0001, ...PHASES.map(([k]) => (P[k].n ? P[k].err / P[k].n : 0)));
    $('cpDiag').innerHTML = `<div class="ai-weak">${d.weak.slice(0, 5).map(w => `<div class="ai-weak-row${w.sev >= 0.5 ? ' hot' : w.sev >= 0.2 ? ' warm' : ''}">
        <span class="ai-weak-name"><svg class="ic"><use href="#${w.icon}"/></svg>${esc(w.name)}</span>${bar(w.sev, 1)}<small>${esc(w.why)}</small></div>`).join('')}</div>
      <h3 class="cp-sub">Theo giai đoạn ván</h3>
      <div class="ai-phase">${PHASES.map(([k, n]) => { const p = P[k]; return `<div><b>${n}</b>${bar(p.n ? p.err / p.n : 0, maxErr, 'err')}
        <small>${p.n} nước · ${p.err} lỗi lớn${p.n ? ` · ~${Math.round(p.acc / p.n)}%` : ''}</small></div>`; }).join('')}</div>`;
  }

  function renderOps(d) {
    const ops = Object.values(d.openings).sort((a, b) => b.n - a.n).slice(0, 6);
    $('cpOps').innerHTML = ops.length ? `<div class="ai-ops">${ops.map(o => { const sc = Math.round(100 * (o.win + o.draw / 2) / o.n); const id = libIdByName(o.name);
      return `<div class="ai-op"><span class="pz-side ${o.color}"></span><b>${esc(o.name)}</b>
        <small>${o.n} ván · ${o.win}T ${o.draw}H ${o.loss}B${o.accN ? ` · ${Math.round(o.acc / o.accN)}%` : ''}</small>
        <span class="ai-score ${sc >= 55 ? 'good' : sc < 40 ? 'bad' : ''}">${sc}%</span>
        ${id ? `<button type="button" class="ghost" data-act='${esc(JSON.stringify({ kind: 'lib', id }))}'>Ôn</button>` : '<span></span>'}</div>`; }).join('')}</div>`
      : '<p class="muted cp-empty">Chơi vài ván từ thế xuất phát để thấy khai cuộc bạn hay chơi và tỉ lệ điểm của từng khai cuộc.</p>';
  }

  const RES = { win: ['win', 'Thắng'], draw: ['draw', 'Hoà'], loss: ['loss', 'Thua'] };
  function renderGames() {
    const list = games().slice(0, 12);
    if (!list.length) { $('cpGames').innerHTML = '<p class="muted cp-empty">Chưa có ván nào trong Nhật ký. Chơi một ván với máy hoặc Online, ván sẽ hiện ở đây để trợ lý nhận xét.</p>'; return; }
    $('cpGames').innerHTML = `<div class="cp-games">${list.map((g, i) => {
      const [cls, label] = RES[GameHistory.outcome(g)] || ['', '–'];
      return `<div class="cp-game"><span class="cp-res ${cls}">${label}</span>
        <span class="cp-game-text"><b>${esc(g.opp || g.title || 'Ván cờ')}</b><small>${esc(new Date(g.at).toLocaleDateString('vi-VN'))} · cầm ${g.color === 'w' ? 'Trắng' : 'Đen'} · ${Math.ceil((g.moves || 0) / 2)} nước${Number.isFinite(g.acc) ? ` · chính xác ${Math.round(g.acc)}%` : g.rev ? '' : ' · chưa chấm'}</small></span>
        <span class="cp-game-btns">${aiOn() ? `<button type="button" class="primary" data-cp-review="${i + 1}"><svg class="ic"><use href="#i-spark"/></svg>Nhận xét</button>` : ''}
        <button type="button" class="ghost" data-cp-replay="${esc(g.id)}">Xem lại</button></span></div>`; }).join('')}</div>`;
  }

  // Gợi ý câu hỏi: chế độ huấn luyện viên (máy chủ) hỏi tự do, chế độ cơ bản dùng câu mẫu
  const QUICK = [
    ['i-history', 'Nhận xét ván gần nhất', 'Bước ngoặt, bài học và bài tập từ ván vừa chơi', 'Nhận xét ván gần nhất của tôi'],
    ['i-target', 'Điểm yếu lớn nhất', 'Mình hay sai ở đâu và sửa thế nào', 'Điểm yếu lớn nhất trong lối chơi của tôi là gì và sửa thế nào?'],
    ['i-route', 'Hôm nay tập gì?', 'Kế hoạch 30 phút hợp với trình độ', 'Hôm nay tôi nên tập gì trong khoảng 30 phút?'],
    ['i-cpu', 'Phân tích thế cờ trên bàn', 'Stockfish 19 + lời giải thích dễ hiểu', 'Phân tích thế cờ đang trên bàn giúp tôi'],
    ['i-book', 'Chọn khai cuộc', 'Bộ khai cuộc phù hợp với bạn', 'Tôi nên chơi khai cuộc nào với trình độ của mình?'],
  ];
  const BASIC_SUB = { why: 'Nguyên nhân từ các ván đã chấm', today: 'Kế hoạch ngắn theo lộ trình', opening: 'Bộ khai cuộc theo Elo', strong: 'Những gì bạn làm tốt', elo: 'Các bước để tăng Elo' };
  const BASIC_IC = { why: 'i-target', today: 'i-route', opening: 'i-book', strong: 'i-star', elo: 'i-podium' };
  function suggestions() {
    return aiOn() ? QUICK.slice(0, 4).map(([ic, t, sub, q]) => ({ ic, t, sub, attr: `data-cp-ask="${esc(q)}"` }))
      : QUESTIONS.slice(0, 4).map(([k, q]) => ({ ic: BASIC_IC[k] || 'i-spark', t: q, sub: BASIC_SUB[k] || '', attr: `data-ask="${k}"` }));
  }
  // Hàng gợi ý nhỏ phía trên ô nhập (chỉ hiện khi đã có cuộc trò chuyện)
  function renderQuick() {
    const box = $('cpQuick');
    if (!box) return;
    box.hidden = !chat.length;
    if (!chat.length) return;
    const chips = aiOn() ? QUICK.map(([ic, label, , q]) => `<button type="button" data-cp-ask="${esc(q)}"><svg class="ic"><use href="#${ic}"/></svg>${esc(label)}</button>`)
      : QUESTIONS.map(([k, q]) => `<button type="button" data-ask="${k}">${esc(q)}</button>`);
    box.innerHTML = `<button type="button" class="cp-new" data-cp-new title="Bắt đầu cuộc trò chuyện mới"><svg class="ic"><use href="#i-plus"/></svg>Mới</button>${chips.join('')}`;
  }

  function render() {
    if (!$('coachPage')) return;
    loadChat();
    const d = analyse();
    renderStats(d);
    renderEngine();
    renderChat();
    renderPlan(d);
    renderGames();
    renderDiag(d);
    renderOps(d);
    renderKb();
    setPane(pane);
  }

  function welcome() {
    const n = meName();
    return `<div class="cp-hello">
      <img class="cp-hello-crest" src="img/logo.svg?v=2" alt="">
      <h2>Chào ${esc(n || 'bạn')}, hôm nay mình giúp gì cho bạn?</h2>
      <p>${aiOn() ? 'Mình đọc các ván của bạn, kiểm tra từng biến cờ bằng Stockfish 19 và tra Thư viện kiến thức trước khi trả lời.'
        : 'Mình đọc các ván đã được Stockfish 19 chấm để tìm điểm yếu và gợi ý lộ trình. Gõ một khái niệm (ghim, Lucena, Sicily…) để tra Thư viện kiến thức.'}</p>
      <div class="cp-suggest">${suggestions().map(s => `<button type="button" ${s.attr}><svg class="ic"><use href="#${s.ic}"/></svg><b>${esc(s.t)}</b>${s.sub ? `<small>${esc(s.sub)}</small>` : ''}</button>`).join('')}</div>
    </div>`;
  }

  function renderChat() {
    const box = $('aiChat');
    if (!box) return;
    box.classList.toggle('empty', !chat.length);
    box.innerHTML = !chat.length ? welcome() : chat.map(m => (m.me ? `<div class="ai-msg me"><p>${esc(m.text)}</p></div>`
      : `<div class="ai-msg bot"${m.md != null && m.html == null ? ' data-raw' : ''}>${AVATAR}<div class="cp-msg-body">${botHtml(m)}</div></div>`)).join('');
    box.scrollTop = box.scrollHeight;
    renderQuick();
  }

  // Giữ cuộc trò chuyện khi rời trang / tải lại web: lưu 20 tin gần nhất theo tài khoản (chỉ trên trình duyệt này)
  const CHAT_KEY = () => 'rg-coach-chat:' + ((typeof Profile !== 'undefined' && Profile.uid && Profile.uid()) || 'guest');
  let chatKey = '';
  function saveChat() {
    try {
      const keep = chat.filter(m => !m.live).slice(-20).map(m => (m.me ? { me: true, text: m.text }
        : { md: m.md, html: m.html, steps: m.steps || [], boards: m.boards || [], links: m.links || [], hits: (m.hits || []).map(a => a.id) }));
      localStorage.setItem(chatKey || CHAT_KEY(), JSON.stringify({ chat: keep, hist }));
    } catch {}
  }
  function loadChat() {
    const k = CHAT_KEY();
    if (k === chatKey) return;
    chatKey = k;
    chat = []; hist = [];
    try {
      const d = JSON.parse(localStorage.getItem(k) || 'null');
      if (!d) return;
      chat = (d.chat || []).map(m => (m.me ? m : { ...m, me: false, live: false, hits: hasKb() ? (m.hits || []).map(id => Knowledge.get(id)).filter(Boolean) : [] }));
      hist = Array.isArray(d.hist) ? d.hist.slice(-4) : [];
    } catch {}
  }

  function open() {
    cache = null;
    if (typeof openCoach === 'function') openCoach();
  }

  function autosize(t) { t.style.height = 'auto'; t.style.height = Math.min(160, t.scrollHeight) + 'px'; }

  function bind() {
    const page = $('coachPage');
    $('aiTab').addEventListener('click', () => {
      if (typeof Profile !== 'undefined' && !Profile.signedIn() && !Profile.isGuest()) return;
      open();
    });
    page.addEventListener('click', e => {
      const a = e.target.closest('[data-act]');
      if (a) { try { act(JSON.parse(a.dataset.act)); } catch {} return; }
      const q = e.target.closest('[data-ask]');
      if (q) { setPane('chat'); ask(q.dataset.ask); return; }
      const cq = e.target.closest('[data-cp-ask]');
      if (cq) { setPane('chat'); askText(cq.dataset.cpAsk); return; }
      const tab = e.target.closest('[data-cp-tab]');
      if (tab) { setPane(tab.dataset.cpTab); return; }
      const rv = e.target.closest('[data-cp-review]');
      if (rv) { setPane('chat'); const g = games()[Number(rv.dataset.cpReview) - 1]; askAI(`Nhận xét ván số ${rv.dataset.cpReview} của tôi${g && g.opp ? ` (gặp ${g.opp})` : ''}`); return; }
      const rp = e.target.closest('[data-cp-replay]');
      if (rp) { const g = games().find(x => String(x.id) === rp.dataset.cpReplay); if (g) { if (typeof showBoard === 'function') showBoard(); GameHistory.loadOnBoard(g, true); } return; }
      const sb = e.target.closest('[data-cp-setup]');
      if (sb) { if (typeof showBoard === 'function') showBoard(); GameHistory.loadPosition(sb.dataset.cpSetup); return; }
      if (e.target.closest('[data-cp-new]')) { if (aiBusy()) CloudAI.stop(); chat = []; hist = []; renderChat(); saveChat(); $('aiInput').focus(); return; }
      if (e.target.closest('[data-ai-stop]')) { if (typeof CloudAI !== 'undefined') CloudAI.stop(); return; }
      const ko = e.target.closest('[data-kb-open]');
      if (ko) {
        kb.open = ko.dataset.kbOpen;
        kb.ply = null;
        renderKb();
        if (!ko.closest('#aiKb')) { setPane('kb'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        return;
      }
      if (e.target.closest('[data-kb-back]')) { kb.open = ''; renderKb(); return; }
      const kp = e.target.closest('[data-kg-ply]');
      if (kp) { kb.ply = Number(kp.dataset.kgPly); renderKb(); return; }
      const kt = e.target.closest('[data-kb-topic]');
      if (kt) { kb.topic = kt.dataset.kbTopic; kb.q = ''; renderKb(); return; }
      const ka = e.target.closest('[data-kb-ask]');
      if (ka && hasKb()) {
        const art = Knowledge.get(ka.dataset.kbAsk);
        if (art) { setPane('chat'); const inp = $('aiInput'); inp.value = `Giải thích "${art.title}" và cho mình một ví dụ áp dụng vào ván của mình`; autosize(inp); inp.focus(); }
      }
    });
    let kbT = 0;
    page.addEventListener('input', e => {
      if (e.target.id === 'aiInput') { autosize(e.target); return; }
      if (e.target.id !== 'kbInput') return;
      kb.q = e.target.value;
      clearTimeout(kbT);
      kbT = setTimeout(() => {
        const pos = e.target.selectionStart;
        renderKb();
        const inp = $('kbInput');
        if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch {} }
      }, 180);
    });
    const send = () => {
      const inp = $('aiInput');
      const t = inp.value.trim();
      if (!t) return;
      inp.value = '';
      autosize(inp);
      askText(t);
    };
    $('aiForm').addEventListener('submit', e => { e.preventDefault(); send(); });
    // Enter gửi, Shift+Enter xuống dòng (trên máy tính)
    $('aiInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(pointer: fine)').matches) { e.preventDefault(); send(); } });
    // Bản trước cho tải mô hình AI về máy (WebLLM, vài trăm MB tới vài GB): đã bỏ, dọn bộ nhớ đệm còn sót lại
    try { localStorage.removeItem('rg-ai-model'); } catch {}
    if (typeof caches !== 'undefined') caches.keys().then(ks => ks.filter(k => /^webllm/i.test(k)).forEach(k => caches.delete(k))).catch(() => {});
    if (typeof GameHistory !== 'undefined' && GameHistory.onChange) GameHistory.onChange(() => { cache = null; if (!page.hidden && !aiBusy()) { const d = analyse(); renderStats(d); renderPlan(d); renderGames(); renderDiag(d); renderOps(d); } });
  }

  // Thẻ gợi ý trên Trang chủ: điểm yếu lớn nhất + bước đầu tiên của lộ trình
  function homeCard(el) {
    if (!el) return;
    let d;
    try { d = analyse(); } catch { el.hidden = true; return; }
    const steps = roadmap(d);
    const s = steps.find(x => x.act.kind !== 'review') || steps[0];
    const top = d.analysed >= 2 && d.weak[0] && d.weak[0].sev >= 0.15 ? d.weak[0] : null;
    el.hidden = false;
    el.innerHTML = `<header class="hm-card-head"><h2><svg class="ic"><use href="#i-spark"/></svg>Trợ lý Royal Gambit</h2>
        <button type="button" class="hm-link" data-ai-open>Trò chuyện<svg class="ic"><use href="#i-chevron-right"/></svg></button></header>
      <p class="hm-ai-text">${top ? `Điểm cần cải thiện nhất: <b>${esc(top.name)}</b> · ${esc(top.why)}.` : d.total ? `Đã đọc ${d.total} ván của bạn${d.analysed ? ` (${d.analysed} ván đã chấm)` : ''}. Chơi và chấm thêm vài ván để trợ lý tìm điểm yếu chính xác hơn.` : 'Chơi vài ván để trợ lý tìm điểm yếu và xây lộ trình riêng cho bạn.'}</p>
      ${s ? `<button type="button" class="hm-ai-step" data-act='${esc(JSON.stringify(s.act))}'><span class="ai-step-ic"><svg class="ic"><use href="#${s.icon}"/></svg></span><span><b>${esc(s.title)}</b><small>${esc(s.why)}</small></span><svg class="ic"><use href="#i-chevron-right"/></svg></button>` : ''}`;
    el.onclick = e => {
      if (e.target.closest('[data-ai-open]')) { open(); return; }
      const a = e.target.closest('[data-act]');
      if (a) { try { act(JSON.parse(a.dataset.act)); } catch {} }
    };
  }

  // Nhờ trợ lý nhận xét một ván trong Nhật ký (theo id). Chưa có máy chủ trò chuyện: mở phần Ván đấu của trang Trợ lý.
  function reviewGameById(id) {
    const list = games();
    const i = list.findIndex(g => g.id === id);
    open();
    if (i < 0 || i >= 20 || !aiOn()) { setPane('games'); return; }
    const g = list[i];
    setPane('chat');
    askAI(`Nhận xét ván số ${i + 1} của tôi${g.opp ? ` (gặp ${g.opp})` : ''}`);
  }
  // Ván mới nhất trong Nhật ký (vừa chơi xong) có nhờ nhận xét được không
  const canReviewLatest = () => { const g = typeof GameHistory !== 'undefined' ? GameHistory.read()[0] : null; return !!(g && (g.color === 'w' || g.color === 'b') && Date.now() - g.at < 5 * 60000); };
  const reviewLatest = () => { const g = GameHistory.read()[0]; if (g) reviewGameById(g.id); };

  return { open, bind, render, homeCard, analyse, roadmap, reviewGameById, reviewLatest, canReviewLatest, chatReady: () => aiOn(), reply: intent => answer(intent, analyse()) };
})();
