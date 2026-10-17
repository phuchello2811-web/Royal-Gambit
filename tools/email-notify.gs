/**
 * Royal Gambit – máy chủ email nhỏ chạy trên Google Apps Script (miễn phí), gửi bằng Gmail của chủ web (~100 thư / ngày).
 * Web là trang tĩnh nên không tự gửi email được; script này làm 2 việc:
 *
 * A) Chạy tự động mỗi 5 phút (hàm checkContests) – gửi tới người đã bật "Gửi thông báo về Gmail" (Hồ sơ › Cài đặt):
 *   • Contest mới.
 *   • Contest đã đăng ký sắp bắt đầu (≤ 15 phút).
 *   • Thông báo toàn web mà admin đăng có tick "Gửi cả về Gmail".
 *   Mỗi việc chỉ báo một lần. Danh sách nhận thư nằm ở /notify trong Firebase; luật Firebase chỉ cho mỗi người đăng ký
 *   đúng Gmail đã xác minh của chính mình (Gmail đăng nhập Google hoặc Gmail khôi phục đã nhập mã).
 *
 * B) Web app (hàm doPost) – Gmail khôi phục và Quên mật khẩu:
 *   • Người chơi thêm Gmail khôi phục → script gửi mã 6 số → nhập đúng mã thì lưu /recovery/<uid>.
 *   • Quên mật khẩu → script gửi mã tới Gmail khôi phục → nhập đúng mã thì script đặt mật khẩu mới
 *     (dùng quyền chủ project Firebase của chính tài khoản Google đang chạy script).
 *   Mã hết hạn sau 10 phút, sai 5 lần là huỷ, mỗi tài khoản tối đa 1 mã / phút và 5 mã / giờ.
 *
 * CÀI ĐẶT (xem thêm README, mục "Thông báo qua Gmail" và "Quên mật khẩu"):
 *   1. https://script.google.com › New project (hoặc project cũ), dán toàn bộ file này vào Code.gs, bấm Save.
 *   2. Project Settings (bánh răng) › tick "Show appsscript.json manifest file in editor". Mở appsscript.json,
 *      thay toàn bộ bằng nội dung file tools/appsscript.json, bấm Save.
 *   3. Project Settings › Script properties › thêm 3 thuộc tính:
 *        DB_URL     = địa chỉ Realtime Database (giống databaseURL trong config.js)
 *        DB_SECRET  = Firebase Console › Project settings › Service accounts › Database secrets › Show
 *        SITE_URL   = địa chỉ web (ví dụ https://ten-ban.github.io/royal-gambit/)
 *      (Tuỳ chọn) PROJECT_ID = mã project Firebase; bỏ trống thì tự suy ra từ DB_URL.
 *      Tài khoản Google đang mở Apps Script phải là chủ (Owner) của project Firebase.
 *   4. Chọn hàm `setup` ở thanh trên, bấm Run, cho phép các quyền. Hàm này tạo lịch chạy mỗi 5 phút.
 *   5. Chọn hàm `testAdmin`, bấm Run: phải thấy "OK" (kiểm tra quyền đặt lại mật khẩu).
 *   6. Deploy › New deployment › chọn loại "Web app" › Execute as: Me › Who has access: Anyone › Deploy.
 *      Copy "Web app URL" (dạng https://script.google.com/macros/s/.../exec) dán vào mailApi trong config.js.
 *      Lần sau sửa code: Deploy › Manage deployments › bút chì › Version: New version › Deploy (URL giữ nguyên).
 *   7. (Tuỳ chọn) chạy `testEmail` để gửi thử một thư cho chính bạn.
 */

const SOON_MS = 15 * 60 * 1000; // báo "sắp bắt đầu" khi còn ≤ 15 phút
const TZ = 'Asia/Ho_Chi_Minh';
const EMAIL_DOMAIN = '@rg-user.app'; // giống profile.js
const CODE_TTL = 600;                // mã hết hạn sau 10 phút
const MAX_TRIES = 5;                 // nhập sai 5 lần thì huỷ mã
const RESERVE_QUOTA = 5;             // chừa lại vài thư / ngày cho việc quan trọng

function props_() { return PropertiesService.getScriptProperties(); }
function dbBase_() {
  const base = String(props_().getProperty('DB_URL') || '').replace(/\/+$/, '');
  if (!base || !props_().getProperty('DB_SECRET')) throw new Error('Thiếu DB_URL hoặc DB_SECRET trong Script properties');
  return base;
}

// Đọc / ghi Firebase bằng Database secret (bỏ qua luật bảo mật, chỉ dùng phía máy chủ Google, không lộ ra web)
function db_(path, method, body) {
  const opts = { muteHttpExceptions: true, method: method || 'get' };
  if (body !== undefined) { opts.payload = JSON.stringify(body); opts.contentType = 'application/json'; }
  const res = UrlFetchApp.fetch(dbBase_() + '/' + path + '.json?auth=' + encodeURIComponent(props_().getProperty('DB_SECRET')), opts);
  if (res.getResponseCode() !== 200) throw new Error('Firebase ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
  return JSON.parse(res.getContentText());
}

const fmt_ = t => Utilities.formatDate(new Date(t), TZ, 'HH:mm dd/MM/yyyy');
const esc_ = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const site_ = () => String(props_().getProperty('SITE_URL') || '').replace(/[#?].*$/, '');

function mail_(to, subject, title, lines, link, footer) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#262421">
    <h2 style="color:#5d8a32;margin:0 0 12px">${esc_(title)}</h2>
    ${lines.map(l => `<p style="margin:0 0 8px;line-height:1.5">${l}</p>`).join('')}
    ${link ? `<p style="margin:18px 0"><a href="${esc_(link)}" style="background:#81b64c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Mở Royal Gambit</a></p>` : ''}
    <p style="color:#8b8987;font-size:12px;margin-top:24px">${footer || 'Bạn nhận thư này vì đã bật "Gửi thông báo về Gmail" trong Royal Gambit. Tắt trong Hồ sơ › Cài đặt.'}</p>
  </div>`;
  try { MailApp.sendEmail({ to, subject, htmlBody: html, name: 'Royal Gambit' }); return true; }
  catch (e) { console.warn('Không gửi được tới ' + to + ': ' + e); return false; } // hết lượt gửi trong ngày… thì bỏ qua
}

// ======================= A) Thông báo tự động =======================

/** Chạy tự động mỗi 5 phút (do hàm setup tạo lịch) */
function checkContests() {
  const p = props_();
  const sent = JSON.parse(p.getProperty('SENT') || '{}');
  const site = site_();
  const notify = db_('notify') || {};
  const on = uid => notify[uid] && notify[uid].on === true && /@/.test(notify[uid].email || '');
  const subs = Object.keys(notify).filter(on);
  const now = Date.now();

  // Thông báo toàn web (admin tick "Gửi cả về Gmail")
  const ann = db_('announce');
  if (ann && ann.mail === true && typeof ann.at === 'number' && typeof ann.text === 'string' && !sent['ann:' + ann.at]
      && now - ann.at < 2 * 86400000 && (!ann.until || now < ann.until)) {
    sent['ann:' + ann.at] = now;
    const label = { event: 'Sự kiện', warn: 'Lưu ý' }[ann.kind] || 'Thông báo';
    for (const uid of subs) {
      mail_(notify[uid].email, `Royal Gambit – ${label}`, `${label} từ Royal Gambit`,
        [`Chào ${esc_(notify[uid].name || 'bạn')},`, esc_(ann.text).replace(/\n/g, '<br>'), ann.by ? `<span style="color:#8b8987">— ${esc_(ann.by)}</span>` : ''].filter(Boolean), site);
    }
  }

  const contests = db_('contests') || {};
  for (const id of Object.keys(contests)) {
    const c = contests[id];
    if (!c || typeof c.start !== 'number' || c.start <= now) continue; // chỉ contest chưa bắt đầu
    const link = site ? site + '#contest/' + id : '';
    const when = `Bắt đầu lúc <b>${fmt_(c.start)}</b>, kéo dài tới ${fmt_(c.end)}.`;
    // 1) Contest mới
    if (!sent['new:' + id]) {
      sent['new:' + id] = now;
      for (const uid of subs) {
        mail_(notify[uid].email, `Contest mới: ${c.name}`, `Contest mới: ${c.name}`,
          [`Chào ${esc_(notify[uid].name || 'bạn')},`, when, c.desc ? esc_(c.desc) : '', 'Hãy đăng ký trước giờ bắt đầu để được ghép cặp thi đấu.'].filter(Boolean), link);
      }
    }
    // 2) Contest đã đăng ký sắp bắt đầu
    if (!sent['soon:' + id] && c.start - now <= SOON_MS) {
      sent['soon:' + id] = now;
      const regs = db_('contestScores/' + id) || {};
      for (const uid of Object.keys(regs)) {
        if (!on(uid)) continue;
        mail_(notify[uid].email, `Sắp bắt đầu: ${c.name}`, `${c.name} sắp bắt đầu!`,
          [`Chào ${esc_(notify[uid].name || 'bạn')},`, `Contest bạn đã đăng ký bắt đầu sau khoảng ${Math.max(1, Math.round((c.start - now) / 60000))} phút (${fmt_(c.start)}).`,
            'Mở web trước giờ bắt đầu để được tự ghép cặp.'], link);
      }
    }
  }
  for (const k of Object.keys(sent)) if (now - sent[k] > 30 * 86400000) delete sent[k]; // dọn dấu cũ
  p.setProperty('SENT', JSON.stringify(sent));
}

// ======================= B) Gmail khôi phục & Quên mật khẩu (web app) =======================

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function fail_(code) { return { ok: false, err: code }; }
const validEmail_ = e => /^[^\s@<>"]{1,64}@[A-Za-z0-9.-]{1,180}\.[A-Za-z]{2,}$/.test(e) && e.length <= 120;
const validName_ = n => /^[A-Za-z0-9_]{3,20}$/.test(n);
const mask_ = e => { const [u, d] = e.split('@'); return u.slice(0, Math.min(2, u.length)) + '***@' + d; };
function hash_(s) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }
// Mã 6 số lấy từ SHA-256 của một UUID ngẫu nhiên (an toàn hơn Math.random)
function newCode_() {
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + ':' + Date.now(), Utilities.Charset.UTF_8);
  let n = 0;
  for (let i = 0; i < 6; i++) n = n * 256 + (b[i] & 255);
  return String(n % 1000000).padStart(6, '0');
}

function projectId_() {
  const id = props_().getProperty('PROJECT_ID');
  if (id) return id;
  const m = /^https:\/\/([a-z0-9-]+?)(?:-default-rtdb)?\.(?:firebaseio\.com|[a-z0-9-]+\.firebasedatabase\.app)/.exec(dbBase_());
  if (!m) throw new Error('Không suy ra được PROJECT_ID từ DB_URL, hãy thêm Script property PROJECT_ID');
  return m[1];
}
// Gọi Firebase Auth với quyền quản trị (OAuth của chủ project đang chạy script)
function admin_(action, body) {
  const pid = projectId_();
  const res = UrlFetchApp.fetch(`https://identitytoolkit.googleapis.com/v1/projects/${pid}/accounts:${action}`, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': pid },
  });
  const out = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() !== 200) throw new Error('Auth ' + res.getResponseCode() + ': ' + JSON.stringify(out).slice(0, 300));
  return out;
}
function uidOfName_(name) {
  const r = admin_('lookup', { email: [name.toLowerCase() + EMAIL_DOMAIN] });
  return r.users && r.users[0] ? r.users[0].localId : null;
}
// Xác minh người gửi đúng là chủ uid: đọc /recovery/<uid> bằng idToken của họ (luật chỉ cho chính chủ đọc)
function ownsUid_(uid, idToken) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(uid)) || !idToken) return false;
  const res = UrlFetchApp.fetch(dbBase_() + '/recovery/' + uid + '.json?auth=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  return res.getResponseCode() === 200;
}

// Giới hạn: 1 mã / phút và 5 mã / giờ cho mỗi tài khoản
function rateOk_(uid, kind) {
  const cache = CacheService.getScriptCache();
  if (cache.get('cd:' + kind + uid)) return 'WAIT';
  const n = Number(cache.get('hr:' + uid) || 0);
  if (n >= 5) return 'TOO_MANY';
  if (MailApp.getRemainingDailyQuota() <= RESERVE_QUOTA) return 'QUOTA';
  cache.put('cd:' + kind + uid, '1', 60);
  cache.put('hr:' + uid, String(n + 1), 3600);
  return '';
}
function putCode_(key, uid, code, extra) {
  CacheService.getScriptCache().put(key, JSON.stringify(Object.assign({ h: hash_(uid + ':' + code), tries: 0, exp: Date.now() + CODE_TTL * 1000 }, extra || {})), CODE_TTL);
}
// Kiểm tra mã; đúng thì trả về dữ liệu kèm theo và xoá mã, sai thì trả về mã lỗi
function takeCode_(key, uid, code) {
  const cache = CacheService.getScriptCache();
  const raw = cache.get(key);
  if (!raw) return { err: 'EXPIRED' };
  const d = JSON.parse(raw);
  const ttl = Math.floor(((d.exp || 0) - Date.now()) / 1000);
  if (ttl <= 1) { cache.remove(key); return { err: 'EXPIRED' }; } // không gia hạn mã khi nhập sai
  if (!/^\d{6}$/.test(String(code || '')) || hash_(uid + ':' + code) !== d.h) {
    d.tries++;
    if (d.tries >= MAX_TRIES) { cache.remove(key); return { err: 'EXPIRED' }; }
    cache.put(key, JSON.stringify(d), ttl);
    return { err: 'BAD_CODE', left: MAX_TRIES - d.tries };
  }
  cache.remove(key);
  return { d };
}
function codeMail_(to, title, intro, code) {
  return mail_(to, `${code} là mã Royal Gambit của bạn`, title,
    [intro, `<span style="display:inline-block;font-size:28px;letter-spacing:8px;font-weight:bold;background:#f2f1ee;padding:10px 16px;border-radius:8px">${code}</span>`,
      'Mã có hiệu lực trong 10 phút. Không chia sẻ mã này cho ai, kể cả người tự xưng là admin.'], '',
    'Nếu bạn không yêu cầu mã này, hãy bỏ qua thư; tài khoản của bạn vẫn an toàn.');
}

function handle_(b) {
  const act = String(b.action || '');
  // --- Thêm / đổi Gmail khôi phục (đã đăng nhập) ---
  if (act === 'linkStart') {
    if (!ownsUid_(b.uid, b.idToken)) return fail_('SESSION');
    const email = String(b.email || '').trim().toLowerCase();
    if (!validEmail_(email)) return fail_('BAD_EMAIL');
    const r = rateOk_(b.uid, 'lk:'); if (r) return fail_(r);
    const code = newCode_();
    putCode_('lk:' + b.uid, b.uid, code, { email });
    if (!codeMail_(email, 'Xác minh Gmail khôi phục', `Chào ${esc_(b.name || 'bạn')}, đây là mã để thêm Gmail này làm email khôi phục cho tài khoản Royal Gambit:`, code)) return fail_('SERVER');
    return { ok: true, to: mask_(email) };
  }
  if (act === 'linkConfirm') {
    if (!ownsUid_(b.uid, b.idToken)) return fail_('SESSION');
    const t = takeCode_('lk:' + b.uid, b.uid, b.code);
    if (t.err) return { ok: false, err: t.err, left: t.left };
    const old = db_('recovery/' + b.uid);
    db_('recovery/' + b.uid, 'put', { email: t.d.email, at: Date.now() });
    // Đổi Gmail khôi phục: thư thông báo cũng chuyển sang Gmail mới (không gửi tiếp về Gmail cũ)
    const n = db_('notify/' + b.uid);
    if (n && old && n.email === old.email && n.email !== t.d.email) db_('notify/' + b.uid + '/email', 'put', t.d.email);
    return { ok: true, email: t.d.email };
  }
  if (act === 'unlink') {
    if (!ownsUid_(b.uid, b.idToken)) return fail_('SESSION');
    const rec = db_('recovery/' + b.uid);
    const n = db_('notify/' + b.uid);
    if (rec && n && n.email === rec.email) db_('notify/' + b.uid, 'delete'); // thôi gửi thư tới Gmail đã gỡ
    db_('recovery/' + b.uid, 'delete');
    return { ok: true };
  }
  // --- Quên mật khẩu (chưa đăng nhập) ---
  if (act === 'resetStart' || act === 'resetConfirm') {
    const name = String(b.username || '').trim();
    if (!validName_(name)) return fail_('NAME');
    const uid = uidOfName_(name);
    if (!uid) return fail_(db_('usernames/' + name.toLowerCase()) ? 'GOOGLE_ACC' : 'NO_ACCOUNT');
    const rec = db_('recovery/' + uid);
    if (!rec || !rec.email) return fail_('NO_EMAIL');
    if (act === 'resetStart') {
      const r = rateOk_(uid, 'rs:'); if (r) return fail_(r);
      const code = newCode_();
      putCode_('rs:' + uid, uid, code);
      if (!codeMail_(rec.email, 'Đặt lại mật khẩu', `Ai đó (hy vọng là bạn) muốn đặt lại mật khẩu tài khoản <b>${esc_(name)}</b>. Nhập mã sau trên web:`, code)) return fail_('SERVER');
      return { ok: true, to: mask_(rec.email) };
    }
    const pw = String(b.password || '');
    if (pw.length < 6 || pw.length > 128) return fail_('WEAK');
    const t = takeCode_('rs:' + uid, uid, b.code);
    if (t.err) return { ok: false, err: t.err, left: t.left };
    admin_('update', { localId: uid, password: pw });
    mail_(rec.email, 'Mật khẩu Royal Gambit đã được đổi', 'Mật khẩu đã được đặt lại',
      [`Mật khẩu tài khoản <b>${esc_(name)}</b> vừa được đặt lại lúc ${fmt_(Date.now())}.`, 'Nếu không phải bạn, hãy dùng "Quên mật khẩu" để đặt lại ngay.'], site_(),
      'Thư bảo mật tự động từ Royal Gambit.');
    return { ok: true };
  }
  return fail_('BAD_ACTION');
}

/** Web app: web gọi bằng fetch POST (body là JSON dạng text/plain để không bị chặn CORS) */
function doPost(e) {
  let b;
  try { b = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return json_(fail_('BAD_ACTION')); }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    return json_(handle_(b));
  } catch (err) {
    console.error(err);
    return json_(fail_('SERVER'));
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}
function doGet() { return json_({ ok: true, app: 'royal-gambit-mail' }); }

// ======================= Cài đặt & kiểm tra =======================

/** Chạy MỘT LẦN khi cài: đánh dấu contest / thông báo đang có là "đã báo" và tạo lịch chạy checkContests mỗi 5 phút */
function setup() {
  const p = props_();
  const sent = JSON.parse(p.getProperty('SENT') || '{}');
  for (const id of Object.keys(db_('contests') || {})) sent['new:' + id] = Date.now();
  const ann = db_('announce');
  if (ann && ann.at) sent['ann:' + ann.at] = Date.now();
  p.setProperty('SENT', JSON.stringify(sent));
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'checkContests') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('checkContests').timeBased().everyMinutes(5).create();
  console.log('Đã cài: checkContests sẽ chạy mỗi 5 phút.');
}

/** Kiểm tra quyền quản trị Firebase Auth (cần cho Quên mật khẩu) */
function testAdmin() {
  const pid = projectId_();
  const uid = uidOfName_('admin');
  console.log('OK – project ' + pid + (uid ? ', tìm thấy tài khoản admin.' : ' (chưa có tài khoản tên "admin", vẫn dùng được).'));
}

/** Gửi thử một thư cho chính bạn */
function testEmail() {
  mail_(Session.getActiveUser().getEmail(), 'Royal Gambit: thử thông báo', 'Thông báo qua Gmail đã hoạt động', ['Nếu bạn đọc được thư này thì script đã cài đúng.'], '');
}
