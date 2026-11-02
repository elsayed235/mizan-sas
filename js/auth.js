/* الدخول والحسابات: مساحات عمل لكل مصنع، تسجيل الدخول، إنشاء حساب باشتراك، استعادة كلمة المرور، قبول الدعوات، قفل الشاشة
   ⚠️ هذه طبقة نموذج أولي داخل المتصفح توضح السلوك وتجربة الاستخدام فقط.
   في النسخة الفعلية: التحقق من كلمات المرور، الجلسات، القفل بعد المحاولات، الرموز والدعوات — كلها على الخادم،
   والجلسة رمز موقّع (HttpOnly cookie) وليست بيانات في المتصفح. */
(function () {
  const esc = (s) => U.esc(s);
  const REG = 'knit-tenants', SESS = 'knit-session', LOCKED = 'knit-locked';
  const DEMO_PW = 'Demo@2026';
  // الخطط والأسعار وعرض الإطلاق في js/pricing.js — مصدر واحد لكل الشاشات
  const { PLANS, LIFETIME_RENEW, LAUNCH } = Pricing;
  // sub = اشتراك المصنع الحالي (داخل التطبيق)؛ بدونه يُحسب السعر لعميل جديد (الصفحة التعريفية والتسجيل)
  const quote = (plan, cycle, sub) => Pricing.quote(plan, cycle, { sub, today: U.today() });
  // ما تفتحه الترقية: يظهر في بطاقة الترقية عند الضغط على قسم مقفول
  const LOCKED_INFO = {
    outwork: { icon: 'factory', title: 'المصنعية الخارجية', desc: 'تابع خاماتك من لحظة خروجها للورشة لحد ما ترجع إنتاج جاهز.', points: ['صرف الخامات لكل ورشة ومتابعة العهدة بالكيلو', 'استلام الإنتاج وحساب المصنعية تلقائيًا بالساعة أو القطعة', 'مطابقة الفاقد وتحميله على الورشة', 'تكلفة حقيقية لكل قطعة منتجة'] },
    workers: { icon: 'user', title: 'العمالة الداخلية والأجور', desc: 'أجور عمالك محسوبة من إنتاجهم الفعلي — بدون كشكول ولا آلة حاسبة.', points: ['يوميات إنتاج لكل عامل وقسم', 'مسيرات أجور بالقطعة أو الساعة أو الشهر', 'السلف والخصومات وصافي المستحق تلقائيًا', 'تكلفة العمالة في التقارير'] },
    models: { icon: 'shirt', title: 'الموديلات والرسم', desc: 'ملف كامل لكل موديل من الرسم والبرمجة حتى المنتج التام.', points: ['ملف لكل موديل بخاماته', 'مهام الرسم والبرمجة على الماكينات وتكلفتها', 'ربط الموديل بالمنتج التام في المخزن'] },
    roles: { icon: 'shield', title: 'أدوار وصلاحيات مخصصة', desc: 'حدد بالضبط ما يراه ويعدّله كل فرد في فريقك.', points: ['أنشئ أدوارًا بأسماء تناسب مصنعك', 'لكل قسم: بدون وصول أو عرض فقط أو إدارة كاملة', 'صلاحيات حساسة مثل إلغاء المستندات وتعديل الأسعار'] },
  };
  // هل خطة المصنع الحالية تشمل القسم؟ (الخطط بدون قائمة modules تشمل كل شيء)
  const planHas = (mod) => { const sub = (window.DB && DB.s.settings && DB.s.settings.subscription) || {}; const pl = PLANS[sub.plan]; return !mod || !pl || !pl.modules || pl.modules.includes(mod); };
  const CYCLES = [['monthly', 'شهري'], ['yearly', 'سنوي', 'شهران مجانًا'], ['lifetime', 'مدى الحياة']];
  // سعر الخطة في دورة الدفع + سطر توضيحي صغير
  function priceHTML(p, cycle, sub) {
    const k = typeof p === 'string' ? p : Object.keys(PLANS).find((x) => PLANS[x] === p);
    p = PLANS[k];
    const q = quote(k, cycle, sub), v = q && q.amount;
    if (v == null) return `<div class="pr-price"><span class="pr-amt">تواصل معنا</span></div><div class="pr-note">ترخيص مخصص حسب عدد الفروع</div>`;
    const unit = { monthly: '/ شهريًا', yearly: '/ سنويًا', lifetime: 'مرة واحدة' }[cycle];
    const note = cycle === 'yearly' ? `توفّر ${U.int(p.prices.monthly * 12 - v)} ج.م — يعادل ${U.int(Math.round(v / 12))} شهريًا`
      : cycle === 'lifetime' ? `يشمل أول سنة استضافة ودعم، ثم ${U.int(LIFETIME_RENEW)} ج.م سنويًا` : 'يُجدَّد شهريًا ويمكنك الإلغاء في أي وقت';
    if (q.promo) {
      const per = { monthly: 'شهريًا', yearly: 'سنويًا' }[cycle];
      const span = sub && sub.promo ? `حتى ${U.date(q.promo.until)}` : cycle === 'yearly' ? 'للسنة الأولى' : `لأول ${q.promo.months} شهرًا`;
      return `<div class="pr-was"><s class="num">${U.int(q.base)}</s><span class="pr-off">${icon('sparkle')} خصم ${q.pct}%</span></div>
        <div class="pr-price"><span class="pr-amt num">${U.int(v)}</span><span class="pr-cur">ج.م</span><span class="pr-unit">${unit}</span></div><div class="pr-note">${span}، ثم ${U.int(q.base)} ج.م ${per}</div>`;
    }
    return `<div class="pr-price"><span class="pr-amt num">${U.int(v)}</span><span class="pr-cur">ج.م</span><span class="pr-unit">${unit}</span></div><div class="pr-note">${note}</div>`;
  }
  // بطاقة خطة موحدة: الصفحة التعريفية، التسجيل، والاشتراك
  function planCard(k, cycle, foot, o = {}) {
    const p = PLANS[k];
    return `<${o.tag || 'div'} class="pr-card ${p.popular ? 'pr-pop' : ''} ${o.cls || ''}" ${o.attrs || ''}>${o.pre || ''}<div class="pr-body">
      <div class="pr-top"><b>${p.label}</b>${p.popular ? `<span class="pr-badge">${icon('sparkle')} موصى به</span>` : ''}</div>
      <p class="pr-desc">${p.desc}</p>${priceHTML(k, cycle, o.sub)}${foot || ''}
      <ul class="pr-feats">${p.features.map((f) => `<li>${icon('check')}${f}</li>`).join('')}</ul></div></${o.tag || 'div'}>`;
  }
  const cycleSwitch = (cur, act) => `<div class="btn-group pr-cycle">${CYCLES.map(([k, l, tag]) => `<button type="button" class="btn sm ${cur === k ? 'on' : ''}" data-act="${act}" data-v="${k}">${l}${tag ? ` <span class="pr-save">${tag}</span>` : ''}</button>`).join('')}</div>`;
  const POLICY = { idleMinutes: 15, maxAttempts: 5, lockMinutes: 5, sessionDays: 30, strongPasswords: true };
  const ROLE_META = {
    owner: { color: '#168a4c', desc: 'كل الصلاحيات — يدير الفريق والاشتراك' },
    accountant: { color: '#3b7cf0', desc: 'المبيعات والمشتريات والخزائن والتقارير' },
    storekeeper: { color: '#ee8a3c', desc: 'المخزون والجرد والتحويلات المخزنية' },
    production: { color: '#8b5cf6', desc: 'الورش وأوامر التشغيل والعمالة والموديلات' },
    viewer: { color: '#64748b', desc: 'يشاهد البيانات والتقارير دون أي تعديل' },
  };

  /* ───────── التشفير: PBKDF2-SHA256 بملح عشوائي لكل مستخدم ───────── */
  const enc = new TextEncoder();
  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
  const randCode = (n, abc) => { const r = crypto.getRandomValues(new Uint32Array(n)); return [...r].map((x) => abc[x % abc.length]).join(''); };
  async function derive(secret, salt, iter) {
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: iter, hash: 'SHA-256' }, key, 256));
  }
  // مقارنة بزمن ثابت حتى لا يُستنتج التطابق من سرعة الرد
  const safeEq = (a, b) => { if (!a || !b || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
  const makeSecret = async (secret, iter = 120000) => { const salt = randHex(16); return { salt, iter, hash: await derive(secret, salt, iter) }; };
  const checkSecret = async (rec, secret) => !!rec && safeEq(await derive(secret, rec.salt, rec.iter), rec.hash);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ───────── قوة كلمة المرور ───────── */
  const pwRules = (pw) => [
    [pw.length >= 8, '8 أحرف على الأقل'],
    [/\d/.test(pw) && /[^\d\s]/.test(pw), 'حروف وأرقام معًا'],
    [/[^A-Za-z0-9؀-ۿ\s]/.test(pw) || (/[A-Z]/.test(pw) && /[a-z]/.test(pw)), 'رمز (!@#) أو حرف كبير'],
  ];
  const pwScore = (pw) => (pw ? Math.min(4, pwRules(pw).filter((r) => r[0]).length + (pw.length >= 12 ? 1 : 0)) : 0);
  const pwValid = (pw, strong = true) => (strong ? pwRules(pw).every((r) => r[0]) : pw.length >= 8);
  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

  /* ───────── مساحات العمل (مصنع = مساحة عمل مستقلة) ───────── */
  const reg = () => { try { return JSON.parse(localStorage.getItem(REG)) || []; } catch (e) { return []; } };
  const saveReg = (r) => localStorage.setItem(REG, JSON.stringify(r));
  const ensureRegistry = () => { if (!reg().length) saveReg([{ id: 'demo', key: 'knit-erp-v1', name: 'مصنع النور للتريكو', demo: true, createdAt: new Date().toISOString() }]); };
  // تحميل مساحة عمل وتجهيزها (إنشاء البيانات التجريبية أول مرة + ترقية البيانات القديمة)
  async function open(ws) {
    DB.setKey(ws.key);
    if (!DB.load()) { if (!ws.demo) return false; Seed.run(); }
    await migrate(ws);
    return true;
  }
  async function migrate(ws) {
    const s = DB.s, st = s.settings;
    let ch = false;
    if (!s.roles || !s.roles.length) {
      s.roles = Object.entries(E.ROLES).map(([key, r]) => ({ key, label: r.label, desc: (ROLE_META[key] || {}).desc || '', color: (ROLE_META[key] || {}).color || '#64748b', perms: r.perms.slice(), system: key === 'owner' }));
      ch = true;
    }
    if (!st.security) { st.security = Object.assign({}, POLICY); ch = true; }
    if (!st.subscription) { st.subscription = { plan: 'pro', cycle: 'monthly', status: 'trial', started: U.today(), trialEnds: U.addDays(U.today(), 14) }; ch = true; }
    for (const u of s.users) {
      if (!u.email) { u.email = (u.username || 'user' + u.id) + (ws.demo ? '@alnour.demo' : '@factory.local'); ch = true; }
      if (!u.status) { u.status = u.active === false ? 'disabled' : 'active'; ch = true; }
      if (u.sessionVer == null) { u.sessionVer = 1; ch = true; }
      if (!u.cred && ws.demo && u.status === 'active' && !u.invite) { u.cred = await makeSecret(DEMO_PW); ch = true; }
    }
    if (ch) DB.save();
  }
  const policy = () => Object.assign({}, POLICY, DB.s.settings.security || {});
  // كل الحسابات المطابقة لاسم الدخول أو البريد في كل المصانع على هذا الجهاز
  async function findAccounts(identifier) {
    const id = identifier.trim().toLowerCase();
    const out = [];
    for (const ws of reg()) {
      let s = DB.peek(ws.key);
      if (!s && ws.demo) { await open(ws); s = DB.peek(ws.key); }
      if (!s) continue;
      for (const u of s.users) if ((u.username || '').toLowerCase() === id || (u.email || '').toLowerCase() === id) out.push({ ws, uid: u.id, name: u.name, company: (s.settings.company || {}).name || ws.name });
    }
    return out;
  }
  // تعديل بيانات مستخدم في مصنعه ثم الحفظ
  async function mutate(ws, uid, fn) {
    await open(ws);
    const u = DB.get('users', uid);
    DB.s.currentUserId = uid;
    const r = fn(u, DB.s);
    DB.save();
    return r;
  }

  /* ───────── الجلسة ───────── */
  const readSess = () => { try { return JSON.parse(sessionStorage.getItem(SESS) || localStorage.getItem(SESS)); } catch (e) { return null; } };
  const writeSess = (sess, remember) => { clearSess(); (remember ? localStorage : sessionStorage).setItem(SESS, JSON.stringify(sess)); };
  const clearSess = () => { try { sessionStorage.removeItem(SESS); localStorage.removeItem(SESS); sessionStorage.removeItem(LOCKED); } catch (e) { /* التخزين غير متاح */ } };
  function startSession(ws, u, remember) {
    const days = policy().sessionDays;
    writeSess({ ws: ws.id, uid: u.id, ver: u.sessionVer, token: randHex(16), at: Date.now(), exp: Date.now() + (remember ? days * 864e5 : 12 * 36e5) }, remember);
    DB.s.currentUserId = u.id;
    u.lastLogin = new Date().toISOString();
    u.failed = 0; u.lockedUntil = null;
    DB.audit('تسجيل دخول', 'auth', u.id, remember ? 'مع تذكر الجهاز' : '');
    DB.save();
  }
  // هل الجلسة الحالية ما زالت صالحة؟ (المستخدم موقوف، أو خرج من كل الأجهزة، أو انتهت المدة)
  function sessionUser() {
    const sess = readSess();
    if (!sess || sess.exp < Date.now()) return null;
    const u = DB.get('users', sess.uid);
    if (!u || u.status !== 'active' || u.sessionVer !== sess.ver) return null;
    return u;
  }

  const Auth = { PLANS, LAUNCH, quote, LOCKED_INFO, planHas, CYCLES, LIFETIME_RENEW, priceHTML, planCard, cycleSwitch, ROLE_META, DEMO_PW, pwRules, pwScore, pwValid, makeSecret, checkSecret, randCode, policy, reg };

  /* ───────── التشغيل ───────── */
  Auth.start = async () => {
    if (!window.crypto || !crypto.subtle) { document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif">يحتاج التطبيق اتصالًا آمنًا (https أو localhost).</div>'; return; }
    ensureRegistry();
    const sess = readSess();
    const ws = sess && reg().find((w) => w.id === sess.ws);
    if (ws && (await open(ws)) && sessionUser()) {
      DB.s.currentUserId = sess.uid;
      App.enter();
      Auth.watch();
      if (sessionStorage.getItem(LOCKED)) Auth.lock();
      return;
    }
    clearSess();
    const inv = (location.hash.match(/invite=([A-Z0-9-]+)/i) || [])[1];
    if (inv) Auth.show('invite', { code: inv.toUpperCase() });
    else if (/^#\/?login/.test(location.hash)) Auth.show('login');
    else Landing.show();
  };
  Auth.ws = () => { const sess = readSess(); return sess && reg().find((w) => w.id === sess.ws); };
  Auth.signOut = (reason) => {
    const u = E.user();
    if (u) { DB.audit('تسجيل خروج', 'auth', u.id, reason || ''); DB.save(); }
    clearSess();
    if (reason) sessionStorage.setItem('knit-signout-reason', reason);
    location.hash = '#login';
    location.reload();
  };
  // خروج من كل الأجهزة: رفع رقم إصدار الجلسات يُبطل كل الجلسات القديمة
  Auth.revokeSessions = (u, keepMine) => {
    u.sessionVer = (u.sessionVer || 1) + 1;
    if (keepMine && u.id === DB.s.currentUserId) { const s = readSess(); s.ver = u.sessionVer; (localStorage.getItem(SESS) ? localStorage : sessionStorage).setItem(SESS, JSON.stringify(s)); }
  };
  Auth.check = () => { if (!sessionUser()) Auth.signOut('انتهت الجلسة أو تغيرت صلاحيات الحساب'); };

  /* ───────── الخمول وقفل الشاشة ───────── */
  let lastAct = Date.now(), idleTimer = null;
  Auth.watch = () => {
    const bump = () => { lastAct = Date.now(); };
    ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'].forEach((ev) => document.addEventListener(ev, bump, { passive: true }));
    clearInterval(idleTimer);
    idleTimer = setInterval(() => {
      const m = +policy().idleMinutes;
      if (m && !document.body.classList.contains('is-locked') && Date.now() - lastAct > m * 6e4) Auth.lock();
      Auth.check();
    }, 15000);
    // تسجيل الخروج من تبويب آخر ينعكس هنا فورًا
    window.addEventListener('storage', (e) => { if (e.key === SESS && !e.newValue) location.reload(); });
  };
  Auth.lock = () => {
    const u = E.user();
    if (!u || document.querySelector('.lock-screen')) return;
    sessionStorage.setItem(LOCKED, '1');
    document.body.classList.add('is-locked');
    UI.closePop();
    const el = document.createElement('div');
    el.className = 'lock-screen';
    const time = new Intl.DateTimeFormat(I18N.en ? 'en-GB' : 'ar-EG', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    el.innerHTML = `<form class="lock-card" autocomplete="off">
      <div class="lock-time num">${time}</div>
      <span class="avatar lock-av">${UI.initials(u.name)}</span>
      <h2>${esc(u.name)}</h2><div class="muted small">${esc(u.email || '')}</div>
      <div class="lock-note">${icon('lock')} الشاشة مقفلة لحماية بيانات المصنع</div>
      ${field('password', 'كلمة المرور', 'lock', 'current-password', true)}
      <div class="au-err" role="alert"></div>
      <button class="btn primary au-submit" type="submit">${icon('unlock')} فتح القفل</button>
      <button class="btn ghost" type="button" data-act="auth-signout">ليس أنت؟ تسجيل الخروج</button></form>`;
    document.body.appendChild(el);
    if (I18N.en) I18N.translate(el);
    const f = el.querySelector('form');
    bindPwFields(f);
    setTimeout(() => f.password.focus(), 60);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      busy(f, true);
      const ok = await checkSecret(u.cred, f.password.value);
      if (ok) {
        u.failed = 0; DB.save();
        el.classList.add('out');
        setTimeout(() => { el.remove(); document.body.classList.remove('is-locked'); sessionStorage.removeItem(LOCKED); lastAct = Date.now(); }, 380);
        return;
      }
      u.failed = (u.failed || 0) + 1;
      DB.audit('محاولة فتح قفل فاشلة', 'auth', u.id, `المحاولة ${u.failed}`); DB.save();
      busy(f, false);
      const left = policy().maxAttempts - u.failed;
      if (left <= 0) { Auth.signOut('تجاوزت عدد المحاولات المسموح'); return; }
      fail(f, `كلمة المرور غير صحيحة — متبقٍ ${left} ${left === 1 ? 'محاولة' : 'محاولات'}`);
      f.password.select();
    });
  };
  UI.acts['auth-signout'] = () => Auth.signOut();
  UI.acts['auth-lock'] = () => Auth.lock();

  /* ═══════════ شاشات الدخول ═══════════ */
  // حقل إدخال بأيقونة؛ حقول كلمة المرور فيها زر إظهار/إخفاء وتنبيه Caps Lock
  function field(name, label, ic, ac, pw, o = {}) {
    return `<label class="au-field ${o.cls || ''}"><span class="au-lbl">${label}${o.extra || ''}</span><span class="au-inp">${icon(ic)}<input name="${name}" type="${pw ? 'password' : o.type || 'text'}" autocomplete="${ac || 'off'}" ${o.dir ? `dir="${o.dir}"` : ''} placeholder="${o.ph || ''}" value="${esc(o.value || '')}" ${o.req === false ? '' : 'required'}>${pw ? `<button type="button" class="au-eye" tabindex="-1" aria-label="إظهار كلمة المرور">${icon('eye')}</button>` : ''}</span>${pw ? '<span class="au-caps">Caps Lock مفعّل</span>' : ''}</label>`;
  }
  const meter = () => `<div class="au-meter"><div class="au-bars"><i></i><i></i><i></i><i></i></div><span class="au-mlabel"></span></div><ul class="au-rules">${pwRules('').map(([, l]) => `<li>${icon('check')}${l}</li>`).join('')}</ul>`;
  function bindPwFields(root) {
    root.querySelectorAll('.au-eye').forEach((b) => b.addEventListener('click', () => {
      const i = b.parentElement.querySelector('input');
      i.type = i.type === 'password' ? 'text' : 'password';
      b.classList.toggle('on', i.type === 'text');
      i.focus();
    }));
    root.querySelectorAll('input[type=password]').forEach((i) => i.addEventListener('keyup', (e) => {
      const c = i.closest('.au-field').querySelector('.au-caps');
      if (c && e.getModifierState) c.classList.toggle('on', e.getModifierState('CapsLock'));
    }));
    const m = root.querySelector('.au-meter');
    if (m) {
      const pw = root.querySelector('input[name=password]');
      const L = ['', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية جدًا'];
      const upd = () => {
        const sc = pwScore(pw.value);
        m.dataset.s = sc;
        m.querySelector('.au-mlabel').textContent = pw.value ? I18N.t(L[sc] || L[1]) : '';
        root.querySelectorAll('.au-rules li').forEach((li, i) => li.classList.toggle('ok', pwRules(pw.value)[i][0]));
      };
      pw.addEventListener('input', upd);
      upd();
    }
  }
  const busy = (f, on) => { const b = f.querySelector('.au-submit'); if (b) { b.disabled = on; b.classList.toggle('loading', on); } };
  const fail = (f, msg) => {
    const e = f.querySelector('.au-err');
    e.innerHTML = `${icon('alert')}<span>${I18N.t(msg)}</span>`;
    e.classList.add('on');
    const card = f.closest('.au-card, .lock-card');
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
  };
  const clearErr = (f) => { const e = f.querySelector('.au-err'); if (e) e.classList.remove('on'); };

  let root = null, state = {};
  Auth.show = (view, data) => {
    state = Object.assign({}, data || {});
    if (!root) {
      document.body.classList.add('auth-mode');
      root = document.createElement('div');
      root.className = 'auth';
      root.innerHTML = `${artPanel()}<main class="auth-main"><div class="auth-top"><button type="button" class="auth-logo-sm" data-act="auth-home"><img src="${Brand.LOGO}" alt=""><b>ميزان ERP</b></button><button type="button" class="au-home" data-act="auth-home">${icon('chevRight')} الصفحة الرئيسية</button><span class="grow"></span>
        <button class="btn ghost sm lang-btn" type="button" data-act="lang" data-no-tr>${I18N.en ? 'عربي' : 'EN'}</button><button class="btn ghost sm icon" type="button" data-act="auth-theme" title="الوضع الليلي">${icon(Look.theme() === 'dark' ? 'sun' : 'moon')}</button></div>
        <div class="au-stage" id="au-stage"></div><div class="auth-foot">© ${new Date().getFullYear()} ميزان ERP · <span>نظام إدارة مصانع التريكو</span></div></main>`;
      document.body.appendChild(root);
      liveTicker(root);
      const why = sessionStorage.getItem('knit-signout-reason');
      if (why) { sessionStorage.removeItem('knit-signout-reason'); setTimeout(() => UI.toast(why, 'warning'), 400); }
    }
    const stage = root.querySelector('#au-stage');
    const html = `<div class="au-card" data-view="${view}">${VIEWS[view]()}</div>`;
    const old = stage.firstElementChild;
    if (old) { old.classList.add('leave'); setTimeout(() => old.remove(), 260); }
    stage.insertAdjacentHTML('beforeend', html);
    const card = stage.lastElementChild;
    if (I18N.en) I18N.translate(card);
    bindPwFields(card);
    MOUNT[view] && MOUNT[view](card);
    const first = card.querySelector('input:not([type=hidden]):not([value]):not([type=checkbox]), input[autofocus]') || card.querySelector('input:not([type=checkbox])');
    if (first) setTimeout(() => first.focus(), 80);
  };
  UI.acts['auth-home'] = () => { if (/login|invite/.test(location.hash)) history.replaceState(null, '', '#/'); const r = root; root = null; r.classList.add('leaving'); setTimeout(() => r.remove(), 300); Landing.show(); };
  UI.acts['auth-go'] = (el) => Auth.show(el.dataset.view, el.dataset.keep ? state : {});
  UI.acts['auth-theme'] = (el) => { Look.set({ mode: Look.theme() === 'dark' ? 'light' : 'dark' }); el.innerHTML = icon(Look.theme() === 'dark' ? 'sun' : 'moon'); };

  // مشهد حي في لوحة الهوية: الفريق ← ميزان ← تقارير تُبنى — نفس لغة رسوم "داخل ميزان" بالأبيض فوق لون الهوية
  const LIVE = [['check', 'أحمد اعتمد فاتورة بيع', 'INV-2026-0052'], ['in', 'تحصيل جديد', '+12,500'], ['factory', 'الورشة سلّمت إنتاجًا', '240 قطعة'], ['chart', 'تقرير الأرباح تحدّث', 'الآن']];
  function scene() {
    const W = 560, H = 260, r = document.documentElement.dir !== 'ltr';
    const X = (x) => (r ? W - x : x), RX = (x, w) => (r ? W - x - w : x);
    const path = (pts) => 'M' + pts.map(([x, y], i) => (i === 1 ? 'C' : '') + X(x) + ',' + y).join(' ');
    const team = [[52, 62, '#3b7cf0', 'أ', 0, 'A'], [148, 48, '#ee8a3c', 'م', 0, 'M'], [30, 150, '#8b5cf6', 'ك', 0, 'K'], [92, 214, '#ef4444', 'س', 0, 'S'], [172, 196, '#94a3b8', 'ي', 1, 'Y']];
    const flows = [path([[127, 122], [178, 122], [186, 120], [220, 120]]), path([[127, 138], [172, 138], [186, 142], [220, 142]]), path([[340, 120], [370, 120], [376, 104], [404, 104]]), path([[340, 142], [372, 142], [378, 162], [404, 162]])];
    const rays = [-58, -34, -10, 14, 38].map((a) => { const p = (d) => [280 + Math.sin((d * Math.PI) / 180) * 300, 131 - Math.cos((d * Math.PI) / 180) * 300]; const [x1, y1] = p(a), [x2, y2] = p(a + 8); return `<path d="M280,131 L${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}Z" class="as-ray" style="--i:${a}"/>`; }).join('');
    const bars = [34, 52, 28, 64, 46, 78].map((h, i) => `<rect x="${RX(422 + i * 15, 9)}" y="${190 - h}" width="9" height="${h}" rx="2.5" class="as-bar" style="--i:${i}"/>`).join('');
    return `<div class="aa-scene" aria-hidden="true"><svg viewBox="0 0 ${W} ${H}" direction="ltr" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="asRay" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".15"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <radialGradient id="asGlow"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <g class="as-rays">${rays}</g><circle cx="${X(280)}" cy="131" r="120" fill="url(#asGlow)"/>
      ${team.map(([x, y]) => `<line x1="${X(x)}" y1="${y}" x2="${X(110)}" y2="130" class="as-tie"/>`).join('')}
      ${flows.map((d, i) => `<path d="${d}" class="as-flow${i % 2 ? ' dash' : ''}"/>`).join('')}
      ${flows.map((d, i) => `<circle r="3" class="as-pkt"><animateMotion dur="${2.4 + (i % 2) * 0.7}s" begin="${i * 0.45}s" repeatCount="indefinite" path="${d}"/></circle>`).join('')}
      <g><rect x="${RX(93, 34)}" y="113" width="34" height="34" rx="10" class="as-glass"/><image href="${Brand.LOGO}" x="${RX(100, 20)}" y="120" width="20" height="20"/></g>
      ${team.map(([x, y, c, ar, off, en], i) => `<g class="as-av" style="--i:${i}"><circle cx="${X(x)}" cy="${y}" r="15" fill="${c}" opacity="${off ? 0.6 : 1}" stroke="rgba(255,255,255,.85)" stroke-width="2"/>
        <text x="${X(x)}" y="${y + 4.5}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${I18N.en ? en : ar}</text>
        <circle cx="${X(x + 11)}" cy="${y + 11}" r="4" fill="${off ? '#cbd5e1' : '#22c55e'}" stroke="#fff" stroke-width="1.5" class="${off ? '' : 'as-on'}"/></g>`).join('')}
      <g class="as-hub"><rect x="${X(280) - 66}" y="105" width="132" height="52" rx="16" class="as-halo"/><rect x="${X(280) - 60}" y="109" width="120" height="44" rx="12" class="as-glass strong"/>
        <image href="${Brand.LOGO}" x="${r ? X(280) + 26 : X(280) - 46}" y="120" width="22" height="22"/>
        <text x="${r ? X(280) + 18 : X(280) - 18}" y="136" text-anchor="${r ? 'end' : 'start'}" font-size="14" font-weight="800" fill="#fff">${I18N.en ? 'Mizan' : 'ميزان'}</text>
        <path d="${r ? `M${X(280) - 40},126 l-5,5 5,5` : `M${X(280) + 40},126 l5,5 -5,5`}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/></g>
      <rect x="${RX(420, 116)}" y="62" width="116" height="140" rx="12" class="as-sheet back2"/><rect x="${RX(412, 116)}" y="70" width="116" height="140" rx="12" class="as-sheet back"/>
      <g class="as-front"><rect x="${RX(404, 120)}" y="78" width="120" height="140" rx="12" class="as-sheet"/>
        <rect x="${RX(418, 60)}" y="94" width="60" height="6" rx="3" fill="#fff" opacity=".9"/><rect x="${RX(418, 88)}" y="106" width="88" height="4" rx="2" fill="#fff" opacity=".4"/>${bars}</g>
    </svg><div class="aa-live"><span class="aa-li">${icon(LIVE[0][0])}</span><span class="aa-lt"><b>${LIVE[0][1]}</b><small class="num">${LIVE[0][2]}</small></span></div></div>`;
  }
  // شريط الأحداث يتبدل بهدوء كل بضع ثوانٍ، ويتوقف من تلقاء نفسه عند مغادرة الشاشة
  function liveTicker(host) {
    const el = host.querySelector('.aa-live');
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced') return;
    let i = 0;
    const t = setInterval(() => {
      if (!el.isConnected) return clearInterval(t);
      el.classList.add('out');
      setTimeout(() => {
        i = (i + 1) % LIVE.length; const [ic, a, b] = LIVE[i];
        el.querySelector('.aa-li').innerHTML = icon(ic);
        el.querySelector('b').textContent = I18N.en ? I18N.t(a) : a; el.querySelector('small').textContent = I18N.en ? I18N.t(b) : b;
        el.classList.remove('out');
      }, 380);
    }, 3600);
  }

  function artPanel() {
    return `<aside class="auth-art"><div class="aa-rings"></div>
      <div class="aa-brand"><img src="${Brand.LOGO}" alt=""><div><b>ميزان ERP</b><span>نظام إدارة مصانع التريكو</span></div></div>
      ${scene()}
      <div class="aa-copy"><h2>كل مصنعك في شاشة واحدة — من الخيط حتى الفاتورة</h2>
        <p>مبيعات ومشتريات ومخازن وورش وعمالة، بأرقام دقيقة محسوبة من كل حركة.</p>
        <ul class="aa-feats"><li>${icon('shield')}<span><b>صلاحيات دقيقة</b> لكل فرد في فريقك</span></li><li>${icon('chart')}<span><b>تقارير لحظية</b> للأرباح والخزائن والمخزون</span></li><li>${icon('zap')}<span><b>سريع بالكيبورد</b> لمن يعمل تحت ضغط</span></li></ul></div>
      <div class="aa-preview"><div class="aa-pv-h"><span>صافي المبيعات</span><span class="trend good">${icon('arrowUp')}21.7%</span></div><b class="num">4,753,177.64</b>
        <svg viewBox="0 0 200 50" preserveAspectRatio="none"><defs><linearGradient id="aag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="M0,38 C20,30 30,34 45,26 C60,18 70,30 90,24 C110,18 120,8 140,14 C160,20 175,6 200,4 L200,50 L0,50Z" fill="url(#aag)"/><path d="M0,38 C20,30 30,34 45,26 C60,18 70,30 90,24 C110,18 120,8 140,14 C160,20 175,6 200,4" fill="none" stroke="#fff" stroke-width="2"/></svg></div>
    </aside>`;
  }

  const VIEWS = {}, MOUNT = {};

  /* تسجيل الدخول */
  VIEWS.login = () => `<div class="au-head"><h1>مرحبًا بعودتك</h1><p>سجّل الدخول لمتابعة العمل في مصنعك</p></div>
    <form class="au-form" novalidate>
      ${field('ident', 'البريد الإلكتروني أو اسم الدخول', 'user', 'username', false, { dir: 'ltr', value: state.id, ph: 'name@factory.com' })}
      ${field('password', 'كلمة المرور', 'lock', 'current-password', true, { extra: `<a href="#" class="au-link" data-act="auth-go" data-view="forgot">نسيت كلمة المرور؟</a>` })}
      <label class="check au-remember"><input type="checkbox" name="remember" checked> تذكرني على هذا الجهاز</label>
      <div class="au-err" role="alert"></div>
      <button class="btn primary au-submit" type="submit">تسجيل الدخول ${icon('chevLeft')}</button>
    </form>
    <div class="au-alt"><button class="btn" type="button" data-act="auth-go" data-view="invite">${icon('hash')} لدي رمز دعوة من مصنعي</button></div>
    <div class="au-switch">ليس لديك حساب؟ <a href="#" data-act="auth-go" data-view="signup">أنشئ حساب مصنعك مجانًا</a></div>
    ${reg().some((w) => w.demo) ? `<div class="au-demo"><div class="au-demo-h">${icon('sparkle')} حسابات تجريبية — كلمة المرور <b class="mono" data-no-tr>${DEMO_PW}</b></div><div class="au-demo-list">${[['admin', 'مالك النظام'], ['ahmed', 'محاسب'], ['mahmoud', 'أمين مخزن'], ['karim', 'مسؤول إنتاج'], ['guest', 'عرض فقط']].map(([u, r]) => `<button type="button" class="au-chip" data-act="auth-demo" data-u="${u}"><b class="mono" data-no-tr>${u}</b>${r}</button>`).join('')}</div></div>` : ''}`;
  UI.acts['auth-demo'] = (el) => { const f = root.querySelector('.au-card:last-child form'); f.ident.value = el.dataset.u; f.password.value = DEMO_PW; f.requestSubmit(); };
  MOUNT.login = (card) => {
    const f = card.querySelector('form');
    f.addEventListener('input', () => clearErr(f));
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = f.ident.value.trim(), pw = f.password.value;
      if (!id || !pw) return fail(f, 'أدخل اسم الدخول وكلمة المرور');
      busy(f, true);
      const r = await login(id, pw);
      busy(f, false);
      if (r.error) { fail(f, r.error); f.password.select(); return; }
      if (r.choose) return Auth.show('choose', { list: r.choose, remember: f.remember.checked });
      await enterAs(r.ws, r.uid, f.remember.checked);
    });
  };
  async function login(id, pw) {
    const found = await findAccounts(id);
    const good = [];
    let msg = null;
    for (const m of found) {
      await open(m.ws);
      const u = DB.get('users', m.uid), pol = policy();
      DB.s.currentUserId = u.id;
      if (u.lockedUntil && Date.parse(u.lockedUntil) > Date.now()) { msg = `الحساب مقفل مؤقتًا بعد محاولات خاطئة — حاول بعد ${Math.ceil((Date.parse(u.lockedUntil) - Date.now()) / 6e4)} دقيقة`; continue; }
      if (await checkSecret(u.cred, pw)) {
        if (u.status === 'disabled') { msg = 'تم إيقاف هذا الحساب — تواصل مع مالك المصنع'; continue; }
        good.push(m);
        continue;
      }
      if (u.status === 'invited' && !u.cred) { msg = 'هذا الحساب لم يُفعّل بعد — استخدم رمز الدعوة لتعيين كلمة المرور'; continue; }
      u.failed = (u.failed || 0) + 1;
      if (u.failed >= pol.maxAttempts) {
        u.lockedUntil = new Date(Date.now() + pol.lockMinutes * 6e4).toISOString(); u.failed = 0;
        DB.audit('قفل الحساب مؤقتًا', 'auth', u.id, `${pol.maxAttempts} محاولات خاطئة`);
        msg = `تم قفل الحساب ${pol.lockMinutes} دقائق بسبب محاولات خاطئة متكررة`;
      } else {
        DB.audit('محاولة دخول فاشلة', 'auth', u.id, `المحاولة ${u.failed} من ${pol.maxAttempts}`);
        const left = pol.maxAttempts - u.failed;
        if (left <= 2) msg = `بيانات الدخول غير صحيحة — متبقٍ ${left} ${left === 1 ? 'محاولة' : 'محاولات'} قبل القفل المؤقت`;
      }
      DB.save();
    }
    if (good.length === 1) return good[0];
    if (good.length > 1) return { choose: good };
    await wait(350); // تأخير بسيط يبطئ التخمين
    return { error: msg || 'بيانات الدخول غير صحيحة' };
  }
  async function enterAs(ws, uid, remember) {
    await open(ws);
    startSession(ws, DB.get('users', uid), remember);
    if (/invite=/.test(location.hash)) history.replaceState(null, '', '#/');
    root.classList.add('leaving');
    setTimeout(() => location.reload(), 420);
  }

  /* اختيار المصنع عند وجود الحساب في أكثر من مصنع */
  VIEWS.choose = () => `<div class="au-head"><h1>اختر المصنع</h1><p>حسابك مرتبط بأكثر من مصنع على هذا الجهاز</p></div>
    <div class="au-list">${state.list.map((m, i) => `<button class="au-ws" type="button" data-act="auth-pick" data-i="${i}"><span class="avatar">${UI.initials(m.company)}</span><span class="grow"><b>${esc(m.company)}</b><span class="muted small">${esc(m.name)}</span></span>${icon('chevLeft')}</button>`).join('')}</div>
    <div class="au-switch"><a href="#" data-act="auth-go" data-view="login">رجوع لتسجيل الدخول</a></div>`;
  UI.acts['auth-pick'] = (el) => { const m = state.list[+el.dataset.i]; enterAs(m.ws, m.uid, state.remember); };

  /* إنشاء حساب مصنع جديد: 3 خطوات */
  const steps = (n) => `<ol class="au-steps">${['حسابك', 'مصنعك', 'الخطة'].map((l, i) => `<li class="${i + 1 < n ? 'done' : i + 1 === n ? 'on' : ''}"><span>${i + 1 < n ? icon('check') : i + 1}</span>${l}</li>`).join('')}</ol>`;
  VIEWS.signup = () => `${steps(1)}<div class="au-head"><h1>أنشئ حساب مصنعك</h1><p>تجربة مجانية 14 يومًا — بدون بطاقة دفع</p></div>
    <form class="au-form" novalidate>
      ${field('fullname', 'اسمك الكامل', 'user', 'name', false, { value: state.name, ph: 'مثال: محمد عبد الله' })}
      ${field('email', 'البريد الإلكتروني', 'globe', 'email', false, { dir: 'ltr', type: 'email', value: state.email, ph: 'name@factory.com' })}
      ${field('password', 'كلمة المرور', 'lock', 'new-password', true)}${meter()}
      ${field('confirm', 'تأكيد كلمة المرور', 'lock', 'new-password', true)}
      <div class="au-err" role="alert"></div>
      <button class="btn primary au-submit" type="submit">متابعة ${icon('chevLeft')}</button>
    </form>
    <div class="au-switch">لديك حساب بالفعل؟ <a href="#" data-act="auth-go" data-view="login">تسجيل الدخول</a></div>`;
  MOUNT.signup = (card) => {
    const f = card.querySelector('form');
    f.addEventListener('input', () => clearErr(f));
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = f.fullname.value.trim(), email = f.email.value.trim().toLowerCase(), pw = f.password.value;
      if (name.length < 3) return fail(f, 'اكتب اسمك الكامل');
      if (!emailOk(email)) return fail(f, 'البريد الإلكتروني غير صحيح');
      if (!pwValid(pw)) return fail(f, 'كلمة المرور لا تحقق الشروط');
      if (pw !== f.confirm.value) return fail(f, 'كلمتا المرور غير متطابقتين');
      busy(f, true);
      if ((await findAccounts(email)).length) { busy(f, false); return fail(f, 'هذا البريد مسجل بالفعل — سجّل الدخول أو استعد كلمة المرور'); }
      state = Object.assign(state, { name, email, cred: await makeSecret(pw) });
      Auth.show('signup2', state);
    });
  };
  VIEWS.signup2 = () => `${steps(2)}<div class="au-head"><h1>بيانات المصنع</h1><p>تظهر في الفواتير وكشوف الحساب — يمكنك تعديلها لاحقًا</p></div>
    <form class="au-form" novalidate>
      ${field('company', 'اسم المصنع', 'factory', 'organization', false, { value: state.company, ph: 'مثال: مصنع الأمل للتريكو' })}
      <div class="au-row">${field('phone', 'رقم الهاتف', 'hash', 'tel', false, { dir: 'ltr', type: 'tel', value: state.phone, req: false })}
      <label class="au-field"><span class="au-lbl">حجم الفريق</span><span class="au-inp">${icon('users')}<select name="size">${['1–5', '6–20', '21–50', '+50'].map((x) => `<option ${state.size === x ? 'selected' : ''}>${x}</option>`).join('')}</select></span></label></div>
      <span class="au-lbl">كيف تحب أن تبدأ؟</span>
      <div class="au-tiles">
        <label class="au-tile"><input type="radio" name="start" value="demo" ${state.start !== 'blank' ? 'checked' : ''}><span>${icon('sparkle')}<b>ببيانات تجريبية</b><small>استكشف البرنامج بأمثلة جاهزة</small></span></label>
        <label class="au-tile"><input type="radio" name="start" value="blank" ${state.start === 'blank' ? 'checked' : ''}><span>${icon('file')}<b>بداية نظيفة</b><small>إعدادات جاهزة بدون حركات</small></span></label>
      </div>
      <div class="au-err" role="alert"></div>
      <div class="au-btns"><button class="btn" type="button" data-act="auth-go" data-view="signup" data-keep="1">${icon('chevRight')} رجوع</button><button class="btn primary au-submit" type="submit">متابعة ${icon('chevLeft')}</button></div>
    </form>`;
  MOUNT.signup2 = (card) => {
    const f = card.querySelector('form');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const company = f.company.value.trim();
      if (company.length < 3) return fail(f, 'اكتب اسم المصنع');
      Object.assign(state, { company, phone: f.phone.value.trim(), size: f.size.value, start: f.start.value });
      Auth.show('signup3', state);
    });
  };
  VIEWS.signup3 = () => {
    const cyc = state.cycle || 'monthly', pl = state.plan || 'pro';
    return `${steps(3)}<div class="au-head"><h1>اختر خطتك</h1><p>كل الخطط تبدأ بتجربة مجانية 14 يومًا ويمكنك التغيير في أي وقت</p></div>
    <form class="au-form" novalidate>
      ${cycleSwitch(cyc, 'auth-cycle')}
      <div class="pr-grid pr-pick">${Object.keys(PLANS).map((k) => planCard(k, cyc, '', { tag: 'label', pre: `<input type="radio" name="plan" value="${k}" ${pl === k ? 'checked' : ''}>` })).join('')}</div>
      <label class="check au-terms"><input type="checkbox" name="terms"> أوافق على <a href="#" onclick="return false">شروط الاستخدام</a> و<a href="#" onclick="return false">سياسة الخصوصية</a></label>
      <div class="au-err" role="alert"></div>
      <div class="au-btns"><button class="btn" type="button" data-act="auth-go" data-view="signup2" data-keep="1">${icon('chevRight')} رجوع</button><button class="btn primary au-submit" type="submit">${icon('sparkle')} ابدأ التجربة المجانية</button></div>
      <button class="btn au-paynow" type="button" data-act="auth-pay">${icon('card')} أو ادفع الآن وفعّل الاشتراك مباشرة</button>
      <p class="au-fine">التجربة المجانية لا تحتاج بيانات دفع — تختار طريقة الدفع عند انتهائها.</p>
    </form>`;
  };
  UI.acts['auth-cycle'] = (el) => { const f = el.closest('form'); state.plan = f.plan.value; state.cycle = el.dataset.v; Auth.show('signup3', state); };
  MOUNT.signup3 = (card) => {
    const f = card.querySelector('form');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!f.terms.checked) return fail(f, 'يجب الموافقة على الشروط للمتابعة');
      state.plan = f.plan.value;
      busy(f, true);
      const r = await createWorkspace(state);
      Auth.show('welcome', Object.assign(state, r));
    });
  };
  // إنشاء مساحة عمل جديدة بمفتاح تخزين مستقل
  async function createWorkspace(o) {
    const id = 'ws-' + randHex(4), key = 'knit-erp-' + id;
    DB.setKey(key);
    Seed.run();
    const s = DB.s;
    if (o.start === 'blank') {
      ['docs', 'stock', 'ledger', 'cash', 'custody', 'workLogs', 'orders', 'parties', 'workers', 'items', 'models', 'rates', 'audit'].forEach((c) => { s[c] = []; });
      s.seq.numbers = {};
      DB._idx = {};
    }
    s.audit = [];
    Object.assign(s.settings.company, { name: o.company, nameEn: '', phone: o.phone || '', mobile: '', address: '', email: o.email, taxNo: '', cr: '' });
    s.settings.subscription = { plan: o.plan, cycle: o.cycle || 'monthly', status: 'trial', started: U.today(), trialEnds: U.addDays(U.today(), 14), teamSize: o.size };
    if (o.payment) applyPayment(s.settings.subscription, o.payment);
    s.users = [];
    s.roles = null;
    const owner = DB.add('users', { name: o.name, username: o.email.split('@')[0], email: o.email, role: 'owner', active: true, status: 'active', cred: o.cred, sessionVer: 1, createdAt: new Date().toISOString() });
    const ws = { id, key, name: o.company, createdAt: new Date().toISOString() };
    await migrate(ws);
    saveReg(reg().concat([ws]));
    DB.s.currentUserId = owner.id;
    DB.audit('إنشاء حساب المصنع', 'auth', owner.id, `${PLANS[o.plan].label} · ${o.start === 'blank' ? 'بداية نظيفة' : 'بيانات تجريبية'}`);
    DB.save();
    return { ws, uid: owner.id };
  }
  VIEWS.welcome = () => `<div class="au-done"><span class="au-burst">${icon('check')}</span><h1>أهلًا بك في ميزان ERP</h1>
    <p>تم إنشاء حساب <b>${esc(state.company)}</b> على خطة <b>${PLANS[state.plan].label}</b> — ${state.payment ? `اشتراكك مفعّل (إيصال <span class="mono" data-no-tr>${state.payment.no}</span>)` : `تجربتك المجانية تنتهي ${U.date(U.addDays(U.today(), 14))}`}.</p>
    <ul class="au-next"><li>${icon('users')} ادعُ فريقك من الإعدادات ← المستخدمون</li><li>${icon('shield')} حدد صلاحيات كل دور</li><li>${icon('palette')} خصّص المظهر والألوان</li></ul>
    <button class="btn primary au-submit" type="button" data-act="auth-enter">ادخل إلى لوحة التحكم ${icon('chevLeft')}</button></div>`;
  UI.acts['auth-enter'] = () => enterAs(state.ws, state.uid, true);

  /* استعادة كلمة المرور: تحديد الحساب ← رمز التحقق ← كلمة جديدة */
  VIEWS.forgot = () => `<button class="au-back" type="button" data-act="auth-go" data-view="login">${icon('chevRight')} رجوع</button>
    <div class="au-head"><span class="au-hico">${icon('lock')}</span><h1>نسيت كلمة المرور؟</h1><p>اكتب بريدك أو اسم الدخول وسنرسل لك رمز تحقق من 6 أرقام</p></div>
    <form class="au-form" novalidate>${field('ident', 'البريد الإلكتروني أو اسم الدخول', 'user', 'username', false, { dir: 'ltr', value: state.id })}
      <div class="au-err" role="alert"></div><button class="btn primary au-submit" type="submit">إرسال رمز التحقق</button></form>`;
  MOUNT.forgot = (card) => {
    const f = card.querySelector('form');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = f.ident.value.trim();
      if (!id) return fail(f, 'اكتب البريد أو اسم الدخول');
      busy(f, true);
      const m = (await findAccounts(id))[0];
      let demoCode = null;
      if (m) {
        demoCode = randCode(6, '0123456789');
        const rec = await makeSecret(demoCode, 20000);
        await mutate(m.ws, m.uid, (u) => { u.reset = Object.assign(rec, { exp: Date.now() + 10 * 6e4, tries: 0 }); DB.audit('طلب استعادة كلمة المرور', 'auth', u.id, ''); });
      }
      // نفس الرسالة سواء وُجد الحساب أم لا — حتى لا يُعرف من مسجّل
      Auth.show('verify', { id, m, demoCode, sentAt: Date.now() });
    });
  };
  const otp = () => `<div class="au-otp" dir="ltr">${[0, 1, 2, 3, 4, 5].map(() => '<input inputmode="numeric" maxlength="1" autocomplete="one-time-code">').join('')}</div>`;
  VIEWS.verify = () => `<button class="au-back" type="button" data-act="auth-go" data-view="forgot" data-keep="1">${icon('chevRight')} رجوع</button>
    <div class="au-head"><span class="au-hico">${icon('hash')}</span><h1>أدخل رمز التحقق</h1><p>إذا كان الحساب <b dir="ltr">${esc(state.id)}</b> مسجلًا فقد أرسلنا له رمزًا صالحًا لمدة 10 دقائق</p></div>
    <form class="au-form" novalidate>${otp()}
      ${state.demoCode ? `<div class="au-demo-code">${icon('info')}<span>نسخة تجريبية بدون بريد — رمزك هو <b class="mono" data-no-tr>${state.demoCode}</b></span></div>` : ''}
      <div class="au-err" role="alert"></div><button class="btn primary au-submit" type="submit">تحقق ومتابعة</button>
      <div class="au-resend">لم يصلك الرمز؟ <button type="button" class="au-link" data-act="auth-resend" disabled>إعادة الإرسال بعد <span class="num">60</span> ث</button></div></form>`;
  function bindOtp(card) {
    const ins = [...card.querySelectorAll('.au-otp input')];
    ins.forEach((i, k) => {
      i.addEventListener('input', () => { i.value = i.value.replace(/\D/g, '').slice(-1); i.classList.toggle('filled', !!i.value); if (i.value && ins[k + 1]) ins[k + 1].focus(); if (ins.every((x) => x.value)) card.querySelector('form').requestSubmit(); });
      i.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !i.value && ins[k - 1]) ins[k - 1].focus(); });
      i.addEventListener('paste', (e) => { const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (!t) return; e.preventDefault(); t.split('').forEach((c, j) => { ins[j].value = c; ins[j].classList.add('filled'); }); (ins[t.length] || ins[5]).focus(); if (t.length === 6) card.querySelector('form').requestSubmit(); });
    });
    return () => ins.map((x) => x.value).join('');
  }
  MOUNT.verify = (card) => {
    const f = card.querySelector('form'), get = bindOtp(card);
    const rb = card.querySelector('[data-act="auth-resend"]');
    const tick = setInterval(() => {
      const s = 60 - Math.floor((Date.now() - state.sentAt) / 1000);
      if (!card.isConnected) return clearInterval(tick);
      if (s <= 0) { rb.disabled = false; rb.textContent = I18N.t('إعادة إرسال الرمز'); clearInterval(tick); } else rb.querySelector('span').textContent = s;
    }, 1000);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = get();
      if (code.length < 6) return fail(f, 'أدخل الأرقام الستة');
      busy(f, true);
      let ok = false, msg = 'الرمز غير صحيح';
      if (state.m) {
        ok = await mutate(state.m.ws, state.m.uid, (u) => {
          const r = u.reset;
          if (!r || r.exp < Date.now()) { msg = 'انتهت صلاحية الرمز — اطلب رمزًا جديدًا'; return false; }
          if (r.tries >= 5) { msg = 'محاولات كثيرة — اطلب رمزًا جديدًا'; return false; }
          r.tries++;
          return r;
        });
        if (ok) ok = await checkSecret(ok, code);
      }
      busy(f, false);
      if (!ok) { fail(f, msg); card.querySelectorAll('.au-otp input').forEach((i) => { i.value = ''; i.classList.remove('filled'); }); card.querySelector('.au-otp input').focus(); return; }
      Auth.show('newpw', Object.assign(state, { code }));
    });
  };
  UI.acts['auth-resend'] = () => Auth.show('forgot', state);
  VIEWS.newpw = () => `<div class="au-head"><span class="au-hico">${icon('shield')}</span><h1>كلمة مرور جديدة</h1><p>اختر كلمة مرور قوية لم تستخدمها من قبل</p></div>
    <form class="au-form" novalidate>${field('password', 'كلمة المرور الجديدة', 'lock', 'new-password', true)}${meter()}${field('confirm', 'تأكيد كلمة المرور', 'lock', 'new-password', true)}
      <div class="au-err" role="alert"></div><button class="btn primary au-submit" type="submit">حفظ كلمة المرور</button></form>`;
  MOUNT.newpw = (card) => {
    const f = card.querySelector('form');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pw = f.password.value;
      if (!pwValid(pw)) return fail(f, 'كلمة المرور لا تحقق الشروط');
      if (pw !== f.confirm.value) return fail(f, 'كلمتا المرور غير متطابقتين');
      busy(f, true);
      const cred = await makeSecret(pw);
      await mutate(state.m.ws, state.m.uid, (u) => {
        u.cred = cred; u.reset = null; u.failed = 0; u.lockedUntil = null;
        u.sessionVer = (u.sessionVer || 1) + 1; // تغيير كلمة المرور يُخرج كل الأجهزة الأخرى
        DB.audit('تغيير كلمة المرور', 'auth', u.id, 'عبر رمز الاستعادة');
      });
      Auth.show('resetdone', { id: state.id });
    });
  };
  VIEWS.resetdone = () => `<div class="au-done"><span class="au-burst">${icon('check')}</span><h1>تم تغيير كلمة المرور</h1><p>تم تسجيل الخروج من كل الأجهزة الأخرى. سجّل الدخول الآن بكلمة المرور الجديدة.</p>
    <button class="btn primary au-submit" type="button" data-act="auth-go" data-view="login" data-keep="1">تسجيل الدخول ${icon('chevLeft')}</button></div>`;

  /* قبول دعوة: رمز الدعوة ← تعيين كلمة المرور */
  VIEWS.invite = () => `<button class="au-back" type="button" data-act="auth-go" data-view="login">${icon('chevRight')} رجوع</button>
    <div class="au-head"><span class="au-hico">${icon('users')}</span><h1>الانضمام إلى مصنعك</h1><p>أدخل رمز الدعوة الذي أرسله لك مالك المصنع</p></div>
    <form class="au-form" novalidate>${field('code', 'رمز الدعوة', 'hash', 'off', false, { dir: 'ltr', value: state.code, ph: 'XXXX-XXXX', cls: 'au-code' })}
      <div class="au-err" role="alert"></div><button class="btn primary au-submit" type="submit">متابعة ${icon('chevLeft')}</button></form>`;
  async function findInvite(code) {
    const c = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    for (const ws of reg()) {
      const s = DB.peek(ws.key);
      if (!s) continue;
      const u = s.users.find((x) => x.invite && x.invite.code.replace(/-/g, '') === c);
      if (u) return { ws, uid: u.id, u, company: (s.settings.company || {}).name || ws.name, role: ((s.roles || []).find((r) => r.key === u.role) || E.ROLES[u.role] || {}).label };
    }
    return null;
  }
  MOUNT.invite = (card) => {
    const f = card.querySelector('form');
    f.code.addEventListener('input', () => { const v = f.code.value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8); f.code.value = v.length > 4 ? v.slice(0, 4) + '-' + v.slice(4) : v; clearErr(f); });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      busy(f, true);
      const inv = await findInvite(f.code.value);
      busy(f, false);
      if (!inv) return fail(f, 'رمز الدعوة غير صحيح');
      if (inv.u.invite.exp < Date.now()) return fail(f, 'انتهت صلاحية الدعوة — اطلب دعوة جديدة من مالك المصنع');
      Auth.show('join', inv);
    });
  };
  VIEWS.join = () => `<div class="au-head"><span class="au-hico">${icon('sparkle')}</span><h1>أهلًا ${esc(state.u.name)}</h1><p>تمت دعوتك للانضمام إلى <b>${esc(state.company)}</b> بدور <b>${esc(state.role || '')}</b></p></div>
    <form class="au-form" novalidate><div class="au-who"><span class="avatar">${UI.initials(state.u.name)}</span><span><b>${esc(state.u.name)}</b><span class="muted small" dir="ltr">${esc(state.u.email)}</span></span></div>
      ${field('password', 'اختر كلمة المرور', 'lock', 'new-password', true)}${meter()}${field('confirm', 'تأكيد كلمة المرور', 'lock', 'new-password', true)}
      <div class="au-err" role="alert"></div><button class="btn primary au-submit" type="submit">تفعيل الحساب والدخول</button></form>`;
  MOUNT.join = (card) => {
    const f = card.querySelector('form');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pw = f.password.value;
      if (!pwValid(pw)) return fail(f, 'كلمة المرور لا تحقق الشروط');
      if (pw !== f.confirm.value) return fail(f, 'كلمتا المرور غير متطابقتين');
      busy(f, true);
      const cred = await makeSecret(pw);
      await mutate(state.ws, state.uid, (u) => {
        u.cred = cred; u.invite = null; u.status = 'active'; u.active = true; u.joinedAt = new Date().toISOString();
        u.sessionVer = (u.sessionVer || 1) + 1;
        DB.audit('قبول الدعوة وتفعيل الحساب', 'auth', u.id, '');
      });
      await enterAs(state.ws, state.uid, false);
    });
  };

  /* ═══════════ الدفع: ملخص الطلب + طريقة الدفع + إيصال ═══════════
     بيانات البطاقة لا تمر على نظامنا إطلاقًا: تُدخل في صفحة بوابة الدفع المعتمدة (مثل Paymob) وتعود لنا نتيجة العملية فقط. */
  const METHODS = [
    ['card', 'بطاقة بنكية', 'Visa · Mastercard · ميزة', 'card'],
    ['wallet', 'محفظة إلكترونية', 'فودافون كاش · اتصالات · أورانج · WE', 'phone'],
    ['fawry', 'فوري', 'ادفع نقدًا من أي فرع أو تطبيق فوري', 'store'],
    ['instapay', 'إنستاباي', 'تحويل لحظي من تطبيق البنك', 'zap'],
  ];
  const VAT = 0.14;
  const cycleName = { monthly: 'اشتراك شهري', yearly: 'اشتراك سنوي', lifetime: 'ترخيص مدى الحياة' };
  const renewOf = (cycle) => U.addDays(U.today(), cycle === 'monthly' ? 30 : 365);
  function summaryHTML(o) {
    const p = PLANS[o.plan], q = quote(o.plan, o.cycle, o.sub), v = q.amount, vat = Math.round((v - v / (1 + VAT)) * 100) / 100;
    return `<div class="co-plan"><span class="co-pi">${icon('sparkle')}</span><span class="grow"><b>خطة ${p.label}</b><span class="muted small">${cycleName[o.cycle]} · ${p.seats ? p.seats + ' مستخدمين' : 'مستخدمون بلا حد'}</span></span></div>
      ${cycleSwitch(o.cycle, 'co-cycle').replace('pr-cycle', 'pr-cycle co-cyc')}
      <div class="co-lines"><div><span>سعر الخطة</span><b class="num">${U.money(q.base)}</b></div>
        ${q.promo ? `<div class="co-save"><span>${icon('sparkle')} خصم عرض الإطلاق ${q.pct}%</span><b class="num">− ${U.money(q.saved)}</b></div>` : o.cycle === 'yearly' ? `<div class="co-save"><span>${icon('check')} وفّرت شهرين مقارنة بالشهري</span><b class="num">${U.money(p.prices.monthly * 12 - v)}</b></div>` : ''}
        <div class="co-total"><span>الإجمالي</span><b><span class="num">${U.money(v)}</span> ج.م</b></div><div class="co-vat"><span>شامل ضريبة القيمة المضافة 14%</span><span class="num">${U.money(vat)}</span></div></div>
      ${q.promo ? `<div class="co-promo">${icon('sparkle')}<span>سعرك المخفّض ثابت حتى <b>${U.date(q.promo.until)}</b>، ثم ${U.int(q.base)} ج.م ${o.cycle === 'monthly' ? 'شهريًا' : 'سنويًا'}</span></div>` : ''}
      <div class="co-note">${o.cycle === 'monthly' ? 'يُجدَّد تلقائيًا كل شهر — يمكنك الإلغاء في أي وقت' : o.cycle === 'yearly' ? `يُجدَّد في ${U.date(renewOf('yearly'))}` : `دفعة واحدة — يشمل الاستضافة والدعم حتى ${U.date(renewOf('lifetime'))}، ثم ${U.int(LIFETIME_RENEW)} ج.م سنويًا`}</div>`;
  }
  function checkoutHTML(o) {
    return `<div class="co">
      <div class="co-main"><h2>طريقة الدفع</h2>
        <div class="co-methods">${METHODS.map(([k, l, d, ic], i) => `<label class="co-m"><input type="radio" name="co-method" value="${k}" ${i === 0 ? 'checked' : ''}><span class="co-mi">${icon(ic)}</span><span class="grow"><b>${l}</b><span>${d}</span></span><span class="co-dot"></span></label>`).join('')}</div>
        <div class="co-detail"></div>
        <div class="co-secure">${icon('lock')}<span>دفع آمن عبر بوابة دفع معتمدة — بيانات بطاقتك لا تُحفظ لدينا أبدًا</span></div></div>
      <aside class="co-side"><h2>ملخص الطلب</h2><div class="co-sum">${summaryHTML(o)}</div>
        <div class="au-err" role="alert"></div>
        <button class="btn primary co-pay au-submit" type="button">${icon('lock')} ادفع <span class="num co-amt">${U.money(quote(o.plan, o.cycle, o.sub).amount)}</span> ج.م</button>
        <p class="co-fine">نسخة تجريبية: لا يتم خصم أي مبلغ فعليًا.</p></aside></div>`;
  }
  const DETAIL = {
    card: () => `<div class="co-info">${icon('external')}<span>بعد الضغط على "ادفع" تنتقل لصفحة البوابة الآمنة لإدخال بيانات البطاقة، ثم تعود تلقائيًا.</span></div><div class="co-brands"><span>VISA</span><span>Mastercard</span><span>ميزة</span></div>`,
    wallet: () => `${field('wallet', 'رقم المحفظة', 'phone', 'tel', false, { dir: 'ltr', type: 'tel', ph: '01XXXXXXXXX' })}<div class="co-info">${icon('info')}<span>ستصلك رسالة على المحفظة لتأكيد الدفع برقمك السري.</span></div>`,
    fawry: () => `<div class="co-info">${icon('info')}<span>بعد التأكيد ستحصل على رقم مرجعي تدفع به من أي فرع أو تطبيق فوري خلال 48 ساعة، ويُفعّل اشتراكك فور الدفع.</span></div>`,
    instapay: () => `<div class="co-info">${icon('info')}<span>حوّل المبلغ إلى العنوان <b class="mono" data-no-tr>mizan@instapay</b> ثم اضغط "ادفع" لتأكيد التحويل.</span></div>`,
  };
  // يربط شاشة الدفع؛ onPaid يستقبل بيانات العملية بعد نجاحها
  function bindCheckout(root, o, onPaid) {
    const det = root.querySelector('.co-detail');
    const sync = () => {
      const m = root.querySelector('input[name=co-method]:checked').value;
      det.innerHTML = DETAIL[m]();
      if (I18N.en) I18N.translate(det);
      root.querySelector('.co-pay').innerHTML = `${icon('lock')} ${m === 'fawry' ? 'احصل على رقم فوري' : 'ادفع'} <span class="num co-amt">${U.money(quote(o.plan, o.cycle, o.sub).amount)}</span> ج.م`;
    };
    root.querySelectorAll('input[name=co-method]').forEach((r) => r.addEventListener('change', sync));
    root.querySelector('.co-sum').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act="co-cycle"]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      if (PLANS[o.plan].prices[b.dataset.v] == null) return UI.toast('خطة المؤسسات بترخيص مخصص — تواصل معنا', 'warning');
      o.cycle = b.dataset.v;
      root.querySelector('.co-sum').innerHTML = summaryHTML(o);
      if (I18N.en) I18N.translate(root.querySelector('.co-sum'));
      sync();
    }, true);
    sync();
    root.querySelector('.co-pay').addEventListener('click', async () => {
      const m = root.querySelector('input[name=co-method]:checked').value, form = root.querySelector('.co');
      const err = (t) => { const e = root.querySelector('.au-err'); e.innerHTML = `${icon('alert')}<span>${I18N.t(t)}</span>`; e.classList.add('on'); };
      if (m === 'wallet' && !/^01[0125]\d{8}$/.test((root.querySelector('[name=wallet]').value || '').replace(/\D/g, ''))) return err('اكتب رقم محفظة مصري صحيح (11 رقمًا يبدأ بـ 01)');
      const btn = root.querySelector('.co-pay');
      btn.disabled = true; btn.classList.add('loading');
      form.classList.add('paying');
      await wait(1600); // في النسخة الفعلية: انتظار رد بوابة الدفع
      const q = quote(o.plan, o.cycle, o.sub);
      const pay = { no: 'MZ-' + U.year(U.today()) + '-' + randCode(6, '0123456789'), at: new Date().toISOString(), method: m, plan: o.plan, cycle: o.cycle, base: q.base, amount: q.amount, promo: q.promo ? Object.assign({}, q.promo, { applied: q.pct }) : null, ref: m === 'fawry' ? randCode(9, '0123456789') : null };
      root.innerHTML = receiptHTML(pay);
      if (I18N.en) I18N.translate(root);
      root.querySelector('[data-act="co-done"]').addEventListener('click', () => onPaid(pay));
    });
  }
  function receiptHTML(pay) {
    const ml = METHODS.find((x) => x[0] === pay.method)[1];
    return `<div class="co-ok"><span class="au-burst">${icon('check')}</span><h2>${pay.method === 'fawry' ? 'تم إنشاء رقم فوري' : 'تم الدفع بنجاح'}</h2>
      <p class="muted">${pay.method === 'fawry' ? `ادفع بالرقم المرجعي <b class="mono" data-no-tr>${pay.ref}</b> خلال 48 ساعة — اشتراكك مفعّل الآن مؤقتًا` : 'تم تفعيل اشتراكك وأرسلنا الإيصال على بريدك'}</p>
      <div class="co-receipt"><div><span>رقم الإيصال</span><b class="mono" data-no-tr>${pay.no}</b></div><div><span>الخطة</span><b>${PLANS[pay.plan].label} · ${cycleName[pay.cycle]}</b></div>
        <div><span>طريقة الدفع</span><b>${ml}</b></div>${pay.promo ? `<div><span>خصم عرض الإطلاق</span><b class="co-ok-save"><span class="num" dir="ltr">− ${U.money(pay.base - pay.amount)}</span> (${pay.promo.applied}%)</b></div>` : ''}<div><span>المبلغ</span><b><span class="num">${U.money(pay.amount)}</span> ج.م</b></div>
        <div><span>${pay.cycle === 'lifetime' ? 'الاستضافة حتى' : 'التجديد القادم'}</span><b>${U.date(renewOf(pay.cycle))}</b></div></div>
      <button class="btn primary au-submit" type="button" data-act="co-done">متابعة ${icon('chevLeft')}</button></div>`;
  }
  // تطبيق الدفع على اشتراك المصنع
  const applyPayment = (sub, pay) => Object.assign(sub, { plan: pay.plan, cycle: pay.cycle, status: 'active', renews: renewOf(pay.cycle), activated: U.today(), payments: (sub.payments || []).concat([pay]) },
    pay.promo && !sub.promo ? { promo: { code: pay.promo.code, pct: pay.promo.pct, months: pay.promo.months, until: pay.promo.until } } : {});
  // داخل التطبيق: نافذة الدفع للتفعيل أو الترقية
  Auth.openCheckout = (o, done) => {
    o.sub = o.sub || DB.s.settings.subscription;
    const m = UI.modal({ title: 'إتمام الاشتراك', size: 'xl co-modal', body: checkoutHTML(o), actions: [] });
    bindCheckout(m.el.querySelector('.modal-b'), o, (pay) => { m.close(); done(pay); });
  };
  Object.assign(Auth, { applyPayment, checkoutHTML, bindCheckout });

  VIEWS.checkout = () => `<button class="au-back" type="button" data-act="auth-go" data-view="signup3" data-keep="1">${icon('chevRight')} رجوع للخطط</button>
    <div class="au-head"><h1>إتمام الاشتراك</h1><p>${esc(state.company || '')} — بعد الدفع يُنشأ حساب مصنعك مفعّلًا مباشرة</p></div><div class="co-host">${checkoutHTML(state)}</div>`;
  MOUNT.checkout = (card) => bindCheckout(card.querySelector('.co-host'), state, async (pay) => {
    const r = await createWorkspace(Object.assign(state, { payment: pay }));
    Auth.show('welcome', Object.assign(state, r));
  });
  UI.acts['auth-pay'] = (el) => {
    const f = el.closest('form');
    if (!f.terms.checked) return fail(f, 'يجب الموافقة على الشروط للمتابعة');
    state.plan = f.plan.value;
    state.cycle = state.cycle || 'monthly';
    if (PLANS[state.plan].prices[state.cycle] == null) return fail(f, 'خطة المؤسسات بترخيص مخصص — اختر شهري أو سنوي أو تواصل معنا');
    Auth.show('checkout', state);
  };

  Object.assign(Auth, { field, meter, bindPwFields, busy, fail, clearErr, emailOk });
  window.Auth = Auth;
})();
