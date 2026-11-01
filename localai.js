// AI mã nguồn mở chạy ngay trên máy người chơi (miễn phí, không cần máy chủ hay khoá API, không gửi dữ liệu đi đâu).
// Dùng WebLLM (MLC, giấy phép Apache-2.0) chạy mô hình Qwen3.5 (Apache-2.0) bằng WebGPU của trình duyệt.
//   • Tải mô hình một lần (lưu trong bộ nhớ đệm của trình duyệt), những lần sau mở lại chỉ mất vài giây.
//   • Mô hình chạy trong Web Worker nên bàn cờ không bị giật khi AI đang viết.
//   • Máy / trình duyệt chưa có WebGPU (hoặc thiếu bộ nhớ) thì Trợ lý tự dùng chế độ cơ bản (assistant.js).
// Trợ lý không để mô hình tự "đánh giá" thế cờ: số liệu lấy từ Stockfish và Nhật ký, kiến thức lấy từ knowledge.js,
// mô hình chỉ đọc các dữ liệu đó rồi giải thích (xem buildPrompt trong assistant.js).

const LocalAI = (() => {
  // Đổi phiên bản WebLLM thì kiểm tra lại các model_id bên dưới vẫn có trong prebuiltAppConfig của bản đó
  const LIB = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/lib/index.js';
  const MODELS = [
    { id: 'small', name: 'Nhẹ', size: '~450 MB', label: 'Qwen3.5 0.8B', f16: 'Qwen3.5-0.8B-q4f16_1-MLC', f32: 'Qwen3.5-0.8B-q4f32_1-MLC', note: 'Hợp với điện thoại' },
    { id: 'std', name: 'Chuẩn', size: '~1,1 GB', label: 'Qwen3.5 2B', f16: 'Qwen3.5-2B-q4f16_1-MLC', f32: 'Qwen3.5-2B-q4f32_1-MLC', note: 'Cân bằng, khuyên dùng trên máy tính' },
    { id: 'big', name: 'Mạnh', size: '~2,4 GB', label: 'Qwen3.5 4B', f16: 'Qwen3.5-4B-q4f16_1-MLC', f32: 'Qwen3.5-4B-q4f32_1-MLC', note: 'Trả lời tốt nhất, cần máy mạnh' },
  ];
  const PREF_KEY = 'rg-ai-model'; // { id, on }

  let lib = null, engine = null, worker = null;
  let state = 'off';              // off | loading | ready | error
  let loaded = '';                // id mô hình đang chạy
  let progress = { p: 0, text: '' };
  let error = '';
  let gpu = null;                 // null = chưa kiểm tra; { ok, f16 }
  const listeners = [];
  const emit = () => listeners.forEach(f => { try { f(); } catch {} });

  const readPref = () => { try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { return {}; } };
  const writePref = p => { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch {} };
  const phone = () => { try { return matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820; } catch { return false; } };
  const defaultId = () => (phone() ? 'small' : 'std');
  const pref = () => { const p = readPref(); return { id: MODELS.some(m => m.id === p.id) ? p.id : defaultId(), on: !!p.on }; };
  const model = id => MODELS.find(m => m.id === id) || MODELS[1];
  const modelId = id => (gpu && gpu.f16 ? model(id).f16 : model(id).f32);

  async function checkGpu() {
    if (gpu) return gpu;
    if (!('gpu' in navigator)) return (gpu = { ok: false });
    try {
      const ad = await navigator.gpu.requestAdapter();
      gpu = ad ? { ok: true, f16: ad.features.has('shader-f16') } : { ok: false };
    } catch { gpu = { ok: false }; }
    return gpu;
  }

  async function loadLib() {
    if (!lib) lib = await import(LIB);
    return lib;
  }

  // Worker dạng module tạo từ Blob: tải WebLLM trong luồng riêng
  function makeWorker() {
    const src = `import { WebWorkerMLCEngineHandler } from '${LIB}';
const h = new WebWorkerMLCEngineHandler();
self.onmessage = e => h.onmessage(e);`;
    return new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })), { type: 'module' });
  }

  async function isCached(id) {
    try { const L = await loadLib(); await checkGpu(); return await L.hasModelInCache(modelId(id)); } catch { return false; }
  }

  // Tải (lần đầu) hoặc mở mô hình đã lưu
  async function load(id = pref().id) {
    if (state === 'loading') return false;
    if (state === 'ready' && loaded === id) return true;
    await checkGpu();
    if (!gpu.ok) { state = 'error'; error = 'NO_GPU'; emit(); return false; }
    state = 'loading'; error = ''; progress = { p: 0, text: 'Đang chuẩn bị…' }; emit();
    try {
      const L = await loadLib();
      await unload(true);
      const cfg = { initProgressCallback: r => { progress = { p: r.progress || 0, text: r.text || '' }; emit(); } };
      try {
        worker = makeWorker();
        engine = await L.CreateWebWorkerMLCEngine(worker, modelId(id), cfg);
      } catch (e) {
        // Trình duyệt không cho Worker dạng module: chạy ngay trong trang
        if (worker) { try { worker.terminate(); } catch {} worker = null; }
        if (String(e && e.message).match(/memory|device|adapter|webgpu/i)) throw e;
        engine = await L.CreateMLCEngine(modelId(id), cfg);
      }
      loaded = id;
      state = 'ready';
      writePref({ id, on: true });
      emit();
      return true;
    } catch (e) {
      console.warn('LocalAI', e);
      state = 'error';
      const m = String((e && e.message) || e);
      error = /memory|allocate|OOM|too large|maxBufferSize|maxStorageBufferBindingSize/i.test(m) ? 'MEMORY'
        : /fetch|network|Failed to fetch|NetworkError/i.test(m) ? 'NETWORK'
          : /quota|storage/i.test(m) ? 'STORAGE' : 'FAIL';
      await unload(true);
      emit();
      return false;
    }
  }

  async function unload(silent) {
    const e = engine, w = worker;
    engine = worker = null;
    loaded = '';
    if (e) try { await e.unload(); } catch {}
    if (w) try { w.terminate(); } catch {}
    if (!silent) { state = 'off'; writePref({ ...pref(), on: false }); emit(); }
  }

  async function remove(id) {
    if (loaded === id) await unload();
    try { const L = await loadLib(); await checkGpu(); await L.deleteModelAllInfoInCache(modelId(id)); } catch {}
    emit();
  }

  let busy = false;
  // messages: [{ role: 'system' | 'user' | 'assistant', content }] · onText(toàn bộ chữ đã viết)
  async function chat(messages, onText, maxTokens = 450) {
    if (state !== 'ready' || !engine) throw new Error('NOT_READY');
    if (busy) throw new Error('BUSY');
    busy = true;
    let out = '';
    try {
      const stream = await engine.chat.completions.create({
        messages, stream: true, max_tokens: maxTokens, temperature: 0.4, top_p: 0.85, frequency_penalty: 0.3, presence_penalty: 0,
        extra_body: { enable_thinking: false }, // Qwen3.5: trả lời ngay, không viết phần "suy nghĩ"
      });
      for await (const chunk of stream) {
        const d = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
        if (d && d.content) { out += d.content; onText(clean(out)); }
      }
    } finally {
      busy = false;
    }
    return clean(out);
  }
  // Phòng khi mô hình vẫn viết khối <think>…</think>
  const clean = t => t.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').replace(/^\s+/, '');

  function stop() { if (engine && busy) try { engine.interruptGenerate(); } catch {} }

  // Đã bật từ lần trước và mô hình đã có sẵn trên máy: tự mở lại (không tự tải mới)
  async function resume() {
    const p = pref();
    if (!p.on || state !== 'off') return;
    if (await isCached(p.id)) load(p.id);
  }

  return {
    MODELS, model, pref, setPref: id => writePref({ ...pref(), id }), checkGpu, isCached, load, unload, remove, chat, stop, resume,
    state: () => state, loaded: () => loaded, progress: () => progress, error: () => error, busy: () => busy,
    onChange: f => listeners.push(f),
  };
})();
