// Trợ lý AI chọn lộ trình: đọc các ván trong Nhật ký (đã được Stockfish chấm từng nước), Sổ luyện lỗi và tiến độ Học cờ,
// tìm điểm yếu của người chơi rồi gợi ý lộ trình: phần học, câu đố theo chủ đề, khai cuộc nên ôn, mức máy nên đấu.
// Chạy hoàn toàn trên máy người chơi (không gửi dữ liệu đi đâu), không cần khoá API.
// Hỏi đáp: nếu đã bật AI mã nguồn mở chạy trên máy (localai.js, Qwen3.5 qua WebLLM), mỗi câu hỏi được gửi cho mô hình
// kèm số liệu thật của người chơi và các bài liên quan trong Thư viện kiến thức (knowledge.js), mô hình chỉ diễn giải
// dữ liệu đó. Chưa bật / máy không hỗ trợ: trả lời theo mẫu như cũ, câu hỏi lạ thì tra Thư viện kiến thức.
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
  let chat = [];         // hội thoại hỏi đáp (chỉ trong phiên)

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
    $('aiModal').hidden = true;
    if (!a) return;
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
        if ($('aiModal').hidden) break;
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
    chat = chat.slice(-12);
    renderChat();
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
    if (!hits.length) return 'Mình chưa hiểu câu hỏi và cũng chưa tìm thấy bài nào phù hợp trong Thư viện kiến thức. Hãy thử một câu gợi ý bên dưới, hoặc bật <b>AI chạy trên máy</b> để hỏi tự do.';
    return `Mình tìm thấy trong Thư viện kiến thức:${hits.map(a => `<div class="ai-ref"><b>${esc(a.title)}</b><p>${esc(snippet(a.body, 280))}</p>
      <button type="button" class="ai-inline" data-kb-open="${esc(a.id)}">Đọc cả bài</button>${seeActs([a], 1).map(actBtn).join('')}</div>`).join('')}`;
  }

  let kb = { q: '', topic: 'tactics', open: '' };
  function renderKb() {
    const box = $('aiKb');
    if (!box || !hasKb()) return;
    const art = kb.open && Knowledge.get(kb.open);
    if (art) {
      box.innerHTML = `<div class="kb-article">
        <button type="button" class="ghost kb-back" data-kb-back><svg class="ic"><use href="#i-chevron-left"/></svg>Quay lại</button>
        <small class="kb-topic">${esc(Knowledge.topicName(art.topic))}</small><h4>${esc(art.title)}</h4><p>${esc(art.body)}</p>
        <div class="kb-acts">${seeActs([art]).map(actBtn).join('')}<button type="button" class="ai-inline" data-kb-ask="${esc(art.id)}">Hỏi trợ lý về bài này</button></div></div>`;
      return;
    }
    const list = kb.q.trim() ? Knowledge.search(kb.q, 'any', 8) : Knowledge.byTopic(kb.topic);
    box.innerHTML = `<div class="kb-search"><input id="kbInput" type="search" maxlength="80" autocomplete="off" placeholder="Tìm: ghim, tốt thông, Lucena, Sicily…" aria-label="Tìm trong thư viện kiến thức" value="${esc(kb.q)}"></div>
      <div class="ai-chips kb-topics">${Knowledge.TOPICS.filter(t => t[0] !== 'lesson').map(([id, n]) => `<button type="button" class="${!kb.q.trim() && kb.topic === id ? 'on' : ''}" data-kb-topic="${id}">${esc(n)}</button>`).join('')}</div>
      <div class="kb-list">${list.length ? list.map(a => `<button type="button" class="kb-item" data-kb-open="${esc(a.id)}"><b>${esc(a.title)}</b><small>${esc(snippet(a.body, 110))}</small></button>`).join('')
        : '<p class="muted">Không tìm thấy bài nào. Thử từ khác (có thể gõ không dấu).</p>'}</div>
      <p class="ai-privacy">${Knowledge.count()} bài: kiến thức soạn sẵn, ${Library.OPENINGS.length} khai cuộc, các thế tàn cuộc và 20 phần Học cờ.</p>`;
  }

  // ---------- AI chạy trên máy ----------

  const hasAI = () => typeof LocalAI !== 'undefined';
  const aiOn = () => hasAI() && LocalAI.state() === 'ready';
  const en = () => typeof I18N !== 'undefined' && I18N.lang() === 'en';
  let last = null; // câu hỏi + trả lời trước (cho câu hỏi nối tiếp)

  const OUT = { win: 'thắng', draw: 'hoà', loss: 'thua' };
  // Tóm tắt một ván: kết quả, khai cuộc, 3 lỗi lớn nhất của mình (theo bản chấm Stockfish)
  function gameBrief(g) {
    const tmp = new Chess();
    const moves = GameHistory.replay(g.pgn, tmp);
    if (!moves || !moves.length) return '';
    const sans = tmp.history.map(h => h.san);
    const o = typeof OPENING_BOOK !== 'undefined' && !/\[FEN\s/.test(g.pgn || '') ? OPENING_BOOK.name(sans.slice(0, 16)) : null;
    let s = `cầm ${g.color === 'w' ? 'Trắng' : 'Đen'} gặp ${g.opp || g.title || 'đối thủ'}, ${OUT[GameHistory.outcome(g)] || 'chưa rõ kết quả'}, ${Math.ceil(sans.length / 2)} nước`
      + (o ? `, khai cuộc ${o.vi}` : '') + (Number.isFinite(g.acc) ? `, độ chính xác ${Math.round(g.acc)}%` : '');
    const rev = g.rev;
    if (rev && typeof rev.cls === 'string' && typeof Coach !== 'undefined') {
      const first = new Chess(tmp.startFen).turn;
      const ev = Array.isArray(rev.evals) ? rev.evals : [], best = Array.isArray(rev.best) ? rev.best : [];
      const pov = cp => (g.color === 'w' ? cp : -cp) / 100;
      const bad = [];
      for (let i = 0; i < rev.cls.length && i < sans.length; i++) {
        const side = i % 2 === 0 ? first : first === 'w' ? 'b' : 'w';
        const cls = (Coach.BY_CODE[rev.cls[i]] || {}).id;
        if (side !== g.color || !/blunder|mistake|miss/.test(cls || '')) continue;
        const drop = ev.length > i + 1 ? pov(ev[i]) - pov(ev[i + 1]) : 0;
        bad.push({ i, drop, txt: `nước ${Math.floor(i / 2) + 1}${side === 'w' ? '.' : '...'}${sans[i]}${best[i] ? ` (nên đi ${best[i]})` : ''}${ev.length > i + 1 ? `, đánh giá từ ${pov(ev[i]).toFixed(1)} xuống ${pov(ev[i + 1]).toFixed(1)}` : ''}` });
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
    } else L.push('Chưa đủ ván đã chấm (cần ít nhất 2) để chẩn đoán điểm yếu.');
    const ops = Object.values(d.openings).sort((a, b) => b.n - a.n).slice(0, 3);
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

  const SELF = /t[oô]i|m[iì]nh|\bem\b|y[eế]u|thua|sai|l[oỗ]i|t[aậ]p g[iì]|h[oô]m nay|ti[eế]n b[oộ]|elo|v[aá]n (v[uừ]a|g[aầ]n|tr[uư][oớ]c)|\bmy\b|\bme\b|\bi\b/i;
  const FOLLOW = /^(c[oò]n|v[aậ]y|th[eế] th[iì]|t[aạ]i sao|v[iì] sao v[aậ]y|v[ií] d[uụ]|n[oó]i r[oõ]|gi[aả]i th[ií]ch th[eê]m|c[uụ] th[eể]|and |what about|why|example)/i;
  function buildPrompt(q, d) {
    // Câu hỏi về bản thân: kèm số liệu ván đấu; câu hỏi khái niệm: chỉ kèm kiến thức (mô hình nhỏ dễ lẫn khi đọc thừa dữ liệu)
    const personal = SELF.test(q) && !CONCEPT.test(q);
    const top = d.analysed >= 2 && d.weak[0] && d.weak[0].sev >= 0.15 ? d.weak[0] : null;
    const query = personal ? q + ' ' + (top ? top.name : 'nên học gì theo trình độ xem lại ván') : q;
    const hits = hasKb() ? Knowledge.search(query, 'any', personal ? 2 : 3) : [];
    const system = `Bạn là huấn luyện viên cờ vua của web Royal Gambit. Trả lời trực tiếp câu hỏi của người chơi ${en() ? 'bằng tiếng Anh' : 'bằng tiếng Việt'}, giọng thân thiện, ngắn gọn: 3-6 câu hoặc 3-5 gạch đầu dòng, in đậm ý chính bằng **...**.
Chỉ dùng thông tin trong TÀI LIỆU; không tự nghĩ ra số liệu, nước đi hay thế cờ. Nếu tài liệu không đủ để trả lời, nói ngắn gọn là chưa đủ dữ liệu.
Không nhắc tới tài liệu, quy tắc hay cách bạn trả lời. Chỉ nói về cờ vua.`;
    const kbText = hits.map(a => `- ${a.title}: ${snippet(a.body, personal ? 450 : 700)}`).join('\n');
    // Chỉ kèm lượt trước khi câu hỏi là câu hỏi nối tiếp ("còn…", "ví dụ?"): mô hình nhỏ hay chép lại câu trả lời cũ
    const prev = last && FOLLOW.test(q.trim()) ? `\n\nCÂU HỎI TRƯỚC: ${last.q}\nTRẢ LỜI TRƯỚC: ${snippet(last.a, 300)}` : '';
    const user = `TÀI LIỆU:\n${kbText ? 'Kiến thức:\n' + kbText : ''}${personal ? '\n\nSố liệu của người chơi (từ Nhật ký và bản chấm Stockfish):\n' + playerBrief(d) : `\n\nNgười chơi khoảng ${elo()} Elo.`}${prev}\n\nCÂU HỎI: ${q}`;
    return { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], hits };
  }

  async function askAI(q) {
    if (LocalAI.busy()) { toast('Trợ lý đang trả lời câu trước, đợi chút nhé.'); return; }
    const d = analyse();
    const { messages, hits } = buildPrompt(q, d);
    chat.push({ me: true, text: q });
    const msg = { me: false, md: '', live: true, hits };
    chat.push(msg);
    chat = chat.slice(-12);
    renderChat();
    let raf = 0;
    try {
      const text = await LocalAI.chat(messages, t => {
        msg.md = t;
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderLive(msg); });
      });
      msg.md = text || 'Mình chưa nghĩ ra câu trả lời, bạn hỏi lại theo cách khác nhé.';
      last = { q, a: msg.md };
    } catch (e) {
      console.warn(e);
      msg.md = '';
      msg.html = 'AI trên máy gặp lỗi khi trả lời, mình dùng chế độ cơ bản nhé:<br>' + (() => { const hit = INTENTS.find(([, re]) => re.test(q)); return hit ? answer(hit[0], d) : kbAnswer(q); })();
    }
    msg.live = false;
    if (raf) cancelAnimationFrame(raf);
    renderChat();
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
    const body = md(m.md) || '<p class="ai-typing"><span></span><span></span><span></span></p>';
    if (m.live) return body + '<button type="button" class="ai-inline ai-stop" data-ai-stop>Dừng</button>';
    return body + (m.hits && m.hits.length ? `<div class="ai-acts">${seeActs(m.hits, 2).map(actBtn).join('')}</div>${refChips(m.hits)}` : '');
  }
  function renderLive(m) {
    const box = $('aiChat');
    const el = box && box.lastElementChild;
    if (!el || chat[chat.length - 1] !== m) return;
    el.innerHTML = botHtml(m);
    box.scrollTop = box.scrollHeight;
  }

  // Khung bật / tải AI
  let gpuInfo = null;
  function renderEngine() {
    const box = $('aiEngine');
    if (!box) return;
    if (!hasAI()) { box.hidden = true; return; }
    box.hidden = false;
    const st = LocalAI.state(), p = LocalAI.pref();
    if (!gpuInfo) {
      box.innerHTML = '<p class="ai-engine-note">Đang kiểm tra thiết bị…</p>';
      LocalAI.checkGpu().then(g => { gpuInfo = g; renderEngine(); });
      return;
    }
    if (!gpuInfo.ok) {
      box.innerHTML = `<p class="ai-engine-note"><b>Chế độ cơ bản.</b> Trình duyệt này chưa hỗ trợ WebGPU nên chưa chạy được AI trên máy. Dùng Chrome hoặc Edge bản mới (máy tính, Android) hoặc Safari trên iOS 26 trở lên để bật AI hỏi tự do.</p>`;
      return;
    }
    if (st === 'ready') {
      const m = LocalAI.model(LocalAI.loaded());
      box.innerHTML = `<div class="ai-engine-on"><span class="ai-dot"></span><span><b>AI đang chạy trên máy bạn</b><small>${esc(m.label)} · mã nguồn mở · miễn phí · không gửi dữ liệu đi đâu</small></span>
        <button type="button" class="ghost" data-ai-off>Tắt</button></div>`;
      return;
    }
    if (st === 'loading') {
      const pr = LocalAI.progress();
      box.innerHTML = `<div class="ai-engine-load"><b>Đang tải ${esc(LocalAI.model(p.id).label)}…</b>
        <span class="ai-bar"><i style="width:${Math.round(100 * pr.p)}%"></i></span><small>${Math.round(100 * pr.p)}% · Chỉ tải lần đầu, lần sau mở ngay. Có thể tiếp tục dùng web trong lúc chờ.</small></div>`;
      return;
    }
    const ERR = { MEMORY: 'Máy không đủ bộ nhớ đồ hoạ cho mô hình này. Hãy chọn mức nhẹ hơn.', NETWORK: 'Mất mạng khi đang tải. Bấm tải lại để tiếp tục (phần đã tải được giữ lại).',
      STORAGE: 'Trình duyệt hết chỗ lưu. Hãy giải phóng dung lượng hoặc chọn mức nhẹ hơn.', NO_GPU: 'Trình duyệt chưa hỗ trợ WebGPU.', FAIL: 'Không mở được mô hình trên máy này. Thử mức nhẹ hơn hoặc trình duyệt khác.' };
    box.innerHTML = `<div class="ai-engine-off">
      <p><b>Bật AI hỏi tự do (miễn phí, chạy ngay trên máy bạn)</b><small>Mô hình mã nguồn mở Qwen3.5 đọc số liệu ván đấu của bạn và Thư viện kiến thức để trả lời. Tải một lần, nên dùng Wi-Fi.</small></p>
      ${st === 'error' ? `<p class="ai-engine-err">${esc(ERR[LocalAI.error()] || ERR.FAIL)}</p>` : ''}
      <div class="ai-models">${LocalAI.MODELS.map(m => `<label class="ai-model${m.id === p.id ? ' on' : ''}"><input type="radio" name="aiModel" value="${m.id}"${m.id === p.id ? ' checked' : ''}>
        <b>${esc(m.name)}</b><small>${esc(m.size)} · ${esc(m.note)}</small></label>`).join('')}</div>
      <button type="button" class="primary" data-ai-load><svg class="ic"><use href="#i-download"/></svg>Tải và bật AI</button></div>`;
  }

  // ---------- Giao diện ----------

  const bar = (v, max, cls = '') => `<span class="ai-bar ${cls}"><i style="width:${max ? Math.min(100, Math.round(100 * v / max)) : 0}%"></i></span>`;

  function render() {
    const box = $('aiBody');
    if (!box) return;
    const d = analyse();
    const games = d.total;
    const avg = d.acc.length ? Math.round(d.acc.reduce((a, x) => a + x, 0) / d.acc.length) : null;
    const recent = d.acc.slice(0, 5), older = d.acc.slice(5, 10);
    const trend = recent.length >= 3 && older.length >= 3 ? Math.round(recent.reduce((a, x) => a + x, 0) / recent.length - older.reduce((a, x) => a + x, 0) / older.length) : null;
    const score = games ? Math.round(100 * (d.res.win + d.res.draw / 2) / games) : null;
    const steps = roadmap(d);
    const P = d.phase;
    const maxErr = Math.max(0.0001, ...PHASES.map(([k]) => (P[k].n ? P[k].err / P[k].n : 0)));

    let html = `<div class="ai-stats">
        <div><b>${games}</b><small>ván trong nhật ký</small></div>
        <div><b>${d.analysed}</b><small>ván đã chấm</small></div>
        <div><b>${avg != null ? avg + '%' : '–'}</b><small>độ chính xác TB${trend != null ? ` · <span class="${trend >= 0 ? 'up' : 'down'}">${trend >= 0 ? '▲' : '▼'} ${Math.abs(trend)}</span>` : ''}</small></div>
        <div><b>${score != null ? score + '%' : '–'}</b><small>điểm số (thắng + ½ hòa)</small></div>
      </div>`;

    if (d.unanalysed.length) {
      html += `<div class="ai-note"><span>${d.analysed < 2 ? '<b>Cần thêm dữ liệu.</b> ' : ''}Còn ${d.unanalysed.length} ván chưa được Stockfish chấm. Chấm xong thì lộ trình sát với lỗi của bạn hơn.</span>
        <button type="button" id="aiBatch" class="primary"${busy ? ' disabled' : ''}><svg class="ic"><use href="#i-cpu"/></svg>Chấm ${Math.min(5, d.unanalysed.length)} ván gần nhất</button></div>`;
    } else if (!games) {
      html += `<div class="ai-note"><span><b>Chưa có ván nào.</b> Chơi vài ván với máy hoặc Online: sau mỗi ván, web tự chấm từng nước và trợ lý sẽ tìm điểm yếu của bạn. Trong lúc chờ, đây là lộ trình theo tiến độ học.</span></div>`;
    }

    // Lộ trình
    html += `<section class="ai-sec"><h3><svg class="ic"><use href="#i-route"/></svg>Lộ trình đề xuất cho bạn</h3><ol class="ai-road">
      ${steps.map((s, i) => `<li><span class="ai-step-n">${i + 1}</span><span class="ai-step-ic"><svg class="ic"><use href="#${s.icon}"/></svg></span>
        <span class="ai-step-text"><b>${esc(s.title)}</b><small>${esc(s.why)}</small></span>
        <button type="button" class="${i === 0 ? 'primary' : ''}" data-act='${esc(JSON.stringify(s.act))}'>${esc(s.btn)}</button></li>`).join('')}
    </ol></section>`;

    if (d.analysed >= 2) {
      // Điểm yếu
      html += `<section class="ai-sec"><h3><svg class="ic"><use href="#i-search"/></svg>Chẩn đoán từ ván của bạn</h3><div class="ai-weak">
        ${d.weak.slice(0, 5).map(w => `<div class="ai-weak-row${w.sev >= 0.5 ? ' hot' : w.sev >= 0.2 ? ' warm' : ''}">
          <span class="ai-weak-name"><svg class="ic"><use href="#${w.icon}"/></svg>${esc(w.name)}</span>${bar(w.sev, 1)}
          <small>${esc(w.why)}</small></div>`).join('')}
      </div></section>`;
      // Giai đoạn
      html += `<section class="ai-sec"><h3><svg class="ic"><use href="#i-gauge"/></svg>Theo giai đoạn ván</h3><div class="ai-phase">
        ${PHASES.map(([k, n]) => { const p = P[k]; return `<div><b>${n}</b>${bar(p.n ? p.err / p.n : 0, maxErr, 'err')}
          <small>${p.n} nước · ${p.err} lỗi lớn${p.n ? ` · chính xác ~${Math.round(p.acc / p.n)}%` : ''}</small></div>`; }).join('')}
      </div></section>`;
    }

    // Khai cuộc
    const ops = Object.values(d.openings).sort((a, b) => b.n - a.n).slice(0, 6);
    if (ops.length) {
      html += `<section class="ai-sec"><h3><svg class="ic"><use href="#i-book"/></svg>Khai cuộc bạn hay chơi</h3><div class="ai-ops">
        ${ops.map(o => { const sc = Math.round(100 * (o.win + o.draw / 2) / o.n); const id = libIdByName(o.name);
          return `<div class="ai-op"><span class="pz-side ${o.color}"></span><b>${esc(o.name)}</b>
          <small>${o.n} ván · ${o.win}T ${o.draw}H ${o.loss}B${o.accN ? ` · ${Math.round(o.acc / o.accN)}%` : ''}</small>
          <span class="ai-score ${sc >= 55 ? 'good' : sc < 40 ? 'bad' : ''}">${sc}%</span>
          ${id ? `<button type="button" class="ghost" data-act='${esc(JSON.stringify({ kind: 'lib', id }))}'>Ôn</button>` : '<span></span>'}</div>`; }).join('')}
      </div></section>`;
    }

    // Hỏi đáp
    html += `<section class="ai-sec ai-chat-sec"><h3><svg class="ic"><use href="#i-spark"/></svg>Hỏi trợ lý</h3>
      <div id="aiEngine" class="ai-engine"></div>
      <div id="aiChat" class="ai-chat"></div>
      <div class="ai-chips">${QUESTIONS.map(([k, q]) => `<button type="button" data-ask="${k}">${esc(q)}</button>`).join('')}</div>
      <form id="aiForm" class="ai-form"><input id="aiInput" maxlength="300" autocomplete="off" placeholder="Hỏi về khai cuộc, tàn cuộc, chiến thuật, ván vừa chơi…" aria-label="Câu hỏi cho trợ lý">
        <button type="submit" class="primary" title="Gửi"><svg class="ic"><use href="#i-send"/></svg></button></form>
      <p class="ai-privacy">Trợ lý chạy ngay trên máy bạn, dựa trên các ván đã được Stockfish chấm và Thư viện kiến thức. Không gửi dữ liệu ra ngoài.</p>
    </section>`;

    if (hasKb()) html += `<section class="ai-sec"><h3><svg class="ic"><use href="#i-book"/></svg>Thư viện kiến thức</h3><div id="aiKb" class="ai-kb"></div></section>`;

    box.innerHTML = html;
    const b = $('aiBatch');
    if (b) b.addEventListener('click', () => analyseBatch(5));
    renderEngine();
    renderChat();
    renderKb();
  }

  function renderChat() {
    const box = $('aiChat');
    if (!box) return;
    if (!chat.length) {
      box.innerHTML = '<p class="ai-msg bot">Xin chào! Mình là trợ lý của Royal Gambit. Hãy chọn một câu hỏi bên dưới, hoặc gõ câu hỏi của bạn.</p>';
      return;
    }
    box.innerHTML = chat.map(m => (m.me ? `<p class="ai-msg me">${esc(m.text)}</p>` : `<div class="ai-msg bot"${m.md != null && m.html == null ? ' data-raw' : ''}>${botHtml(m)}</div>`)).join('');
    box.scrollTop = box.scrollHeight;
  }

  function open() {
    cache = null;
    openModal('aiModal');
    render();
    if (hasAI()) LocalAI.resume();
  }

  function bind() {
    $('aiTab').addEventListener('click', () => {
      if (typeof Profile !== 'undefined' && !Profile.signedIn() && !Profile.isGuest()) return;
      open();
    });
    $('aiModal').addEventListener('click', e => {
      const a = e.target.closest('[data-act]');
      if (a) { try { act(JSON.parse(a.dataset.act)); } catch {} return; }
      const q = e.target.closest('[data-ask]');
      if (q) { ask(q.dataset.ask); return; }
      if (e.target.closest('[data-ai-load]')) { LocalAI.load(LocalAI.pref().id); return; }
      if (e.target.closest('[data-ai-off]')) { LocalAI.unload(); return; }
      if (e.target.closest('[data-ai-stop]')) { LocalAI.stop(); return; }
      const ko = e.target.closest('[data-kb-open]');
      if (ko) {
        kb.open = ko.dataset.kbOpen;
        renderKb();
        const sec = $('aiKb');
        if (sec && !ko.closest('#aiKb')) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (e.target.closest('[data-kb-back]')) { kb.open = ''; renderKb(); return; }
      const kt = e.target.closest('[data-kb-topic]');
      if (kt) { kb.topic = kt.dataset.kbTopic; kb.q = ''; renderKb(); return; }
      const ka = e.target.closest('[data-kb-ask]');
      if (ka && hasKb()) {
        const art = Knowledge.get(ka.dataset.kbAsk);
        if (art) { const inp = $('aiInput'); if (inp) { inp.value = `Giải thích "${art.title}" và áp dụng vào ván của tôi`; inp.focus(); inp.scrollIntoView({ block: 'center' }); } }
      }
    });
    $('aiModal').addEventListener('change', e => {
      if (e.target.name === 'aiModel') { LocalAI.setPref(e.target.value); renderEngine(); }
    });
    let kbT = 0;
    $('aiModal').addEventListener('input', e => {
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
    if (hasAI()) LocalAI.onChange(renderEngine);
    $('aiModal').addEventListener('submit', e => {
      if (e.target.id !== 'aiForm') return;
      e.preventDefault();
      const t = $('aiInput').value.trim();
      if (!t) return;
      $('aiInput').value = '';
      askText(t);
    });
    if (typeof GameHistory !== 'undefined' && GameHistory.onChange) GameHistory.onChange(() => { cache = null; });
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
    el.innerHTML = `<header class="hm-card-head"><h2><svg class="ic"><use href="#i-spark"/></svg>Trợ lý AI gợi ý</h2>
        <button type="button" class="hm-link" data-ai-open>Lộ trình<svg class="ic"><use href="#i-chevron-right"/></svg></button></header>
      <p class="hm-ai-text">${top ? `Điểm cần cải thiện nhất: <b>${esc(top.name)}</b> · ${esc(top.why)}.` : d.total ? `Đã đọc ${d.total} ván của bạn${d.analysed ? ` (${d.analysed} ván đã chấm)` : ''}. Chơi và chấm thêm vài ván để trợ lý tìm điểm yếu chính xác hơn.` : 'Chơi vài ván để trợ lý tìm điểm yếu và xây lộ trình riêng cho bạn.'}</p>
      ${s ? `<button type="button" class="hm-ai-step" data-act='${esc(JSON.stringify(s.act))}'><span class="ai-step-ic"><svg class="ic"><use href="#${s.icon}"/></svg></span><span><b>${esc(s.title)}</b><small>${esc(s.why)}</small></span><svg class="ic"><use href="#i-chevron-right"/></svg></button>` : ''}`;
    el.onclick = e => {
      if (e.target.closest('[data-ai-open]')) { open(); return; }
      const a = e.target.closest('[data-act]');
      if (a) { try { act(JSON.parse(a.dataset.act)); } catch {} }
    };
  }

  return { open, bind, render, homeCard, analyse, roadmap, reply: intent => answer(intent, analyse()) };
})();
