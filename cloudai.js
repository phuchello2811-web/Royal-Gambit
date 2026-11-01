// AI qua máy chủ: gọi Cloudflare Worker (tools/ai-worker.js) chạy GLM-4.7 của Z.ai. Không cần tải gì về máy.
// Bật bằng cách điền aiApi trong config.js; để trống thì Trợ lý dùng chế độ cơ bản (trả lời theo mẫu + Thư viện kiến thức).
// Worker trả về luồng SSE dạng chung: data: {"t":"đoạn chữ"} … data: {"tools":[{id,name,arguments}]} data: [DONE],
// lỗi thì JSON { error }. AI muốn tra công cụ thì assistant.js thực hiện rồi gửi kết quả ở lượt gọi tiếp theo.

const CloudAI = (() => {
  const url = () => String((window.LEADERBOARD && window.LEADERBOARD.aiApi) || '').trim();
  const available = () => /^https:\/\//.test(url()) || /^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(url());
  const LABEL = 'GLM-4.7 (Z.ai)';
  let ctrl = null;
  let failAt = 0; // lần lỗi gần nhất: tạm dùng chế độ cơ bản trong 1 phút

  // Một lượt gọi. final = true: Worker không cho dùng công cụ, buộc trả lời bằng chữ.
  // Trả về { text, tools, stopped }
  async function chat(messages, onText, final = false) {
    if (ctrl) throw new Error('BUSY');
    ctrl = new AbortController();
    let text = '', tools = [];
    try {
      let res;
      try {
        res = await fetch(url(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, final }), signal: ctrl.signal });
      } catch (e) {
        if (e.name === 'AbortError') return { text, tools, stopped: true };
        throw new Error('NETWORK');
      }
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        if (d.detail) console.warn('Máy chủ trợ lý:', d.status, d.detail); // mã lỗi của nhà cung cấp mô hình, giúp chủ web tìm nguyên nhân
        throw new Error(d.error || 'SERVER');
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        let r;
        try { r = await reader.read(); } catch (e) { if (e.name === 'AbortError') return { text, tools, stopped: true }; throw new Error('NETWORK'); }
        if (r.done) break;
        buf += dec.decode(r.value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const ev = buf.slice(0, i);
          buf = buf.slice(i + 2);
          for (const line of ev.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            let j = null;
            try { j = JSON.parse(data); } catch {}
            if (!j) continue;
            if (j.error) throw new Error(String(j.error));
            if (j.t) { text += j.t; onText(text); }
            if (Array.isArray(j.tools)) tools = tools.concat(j.tools);
          }
        }
      }
      return { text, tools, stopped: false };
    } catch (e) {
      // Quá tải / hỏi quá nhanh chỉ là tạm thời: không chuyển hẳn sang chế độ cơ bản
      if (e.message !== 'LIMIT' && e.message !== 'BUSY') failAt = Date.now();
      throw e;
    } finally {
      ctrl = null;
    }
  }

  return {
    available, label: () => LABEL, chat,
    usable: () => available() && Date.now() - failAt > 60000,
    busy: () => !!ctrl,
    stop: () => { if (ctrl) ctrl.abort(); },
  };
})();
