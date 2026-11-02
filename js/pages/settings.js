/* الإعدادات: الشركة، السنوات المالية، الضرائب، مصمم الفواتير، القوائم، المستخدمون، السجل، النسخ الاحتياطي */
(function () {
  const esc = U.esc;
  const TABS = [
    { g: 'حسابي', own: true, items: [['profile', 'حسابي وكلمة المرور', 'user'], ['appearance', 'المظهر', 'palette']] },
    { g: 'المصنع', items: [['company', 'بيانات المصنع', 'factory'], ['years', 'السنوات المالية', 'calendar'], ['taxes', 'الضرائب', 'percent'], ['templates', 'قوالب الفواتير', 'file'], ['lists', 'القوائم والتصنيفات', 'list'], ['einvoice', 'الفاتورة الإلكترونية', 'globe'], ['prefs', 'قواعد العمل', 'scale']] },
    { g: 'الفريق والأمان', items: [['users', 'المستخدمون', 'users'], ['roles', 'الأدوار والصلاحيات', 'shield'], ['security', 'الأمان وتسجيل الدخول', 'lock'], ['subscription', 'الاشتراك والخطة', 'sparkle']] },
    { g: 'النظام', items: [['audit', 'سجل التغييرات', 'history'], ['backup', 'النسخ الاحتياطي', 'database']] },
  ];
  const OWN = ['profile', 'appearance'];
  const save = (fn, msg) => { if (UI.run(() => DB.tx(() => { E.need('settings'); return fn() || true; }), msg || 'تم الحفظ')) { App.renderChrome(); App.refresh(); } };

  Pages.settings = {
    render({ tab }) {
      const full = E.can('settings');
      const allowed = OWN.includes(tab) || full;
      const body = allowed ? (T[tab] || T.company)() : Pages.denied.render({ perm: 'settings' });
      const nav = TABS.filter((g) => g.own || full).map((g) => `<div class="sn-label">${g.g}</div>${g.items.map(([k, l, ic]) => `<a href="#/settings/${k}" class="${tab === k ? 'on' : ''}">${icon(ic)} ${l}</a>`).join('')}`).join('');
      return `<div class="page-h"><div class="titles"><h1>الإعدادات</h1></div></div>
        <div class="settings-layout"><nav class="side-nav">${nav}</nav><div style="min-width:0">${body}</div></div>`;
    },
    mount(el, { tab }) { if (OWN.includes(tab) || E.can('settings')) M[tab] && M[tab](el); },
  };
  const T = {}, M = {};

  T.einvoice = () => Pages.etaSettings();
  M.einvoice = (el) => Pages.etaSettingsMount(el);

  /* بيانات المصنع */
  T.company = () => {
    const c = DB.s.settings.company;
    return `<div class="card"><div class="card-h"><h3>بيانات المصنع</h3><span class="sub">تظهر في رأس الفواتير وكشوف الحساب والتقارير</span></div><div class="card-b" id="co-form">
      <div class="row gap-16 mb-16"><img class="logo-prev" id="logo-prev" src="${c.logo || ''}"><div class="col"><label class="btn sm">${icon('upload')} رفع اللوجو<input type="file" accept="image/*" id="logo-file" hidden></label>${c.logo ? `<button class="btn sm ghost danger" data-act="logo-rm">إزالة</button>` : ''}<span class="tiny muted">يُصغّر تلقائيًا · PNG بخلفية شفافة أفضل</span></div></div>
      <div class="grid g2">${UI.field('اسم المصنع', UI.inp('name', c.name), { req: true })}${UI.field('الاسم بالإنجليزية', UI.inp('nameEn', c.nameEn, { attrs: 'dir="ltr"' }))}
      ${UI.field('العنوان', UI.inp('address', c.address), { cls: 'span-2' })}${UI.field('الهاتف', UI.inp('phone', c.phone))}${UI.field('الموبايل', UI.inp('mobile', c.mobile))}
      ${UI.field('البريد الإلكتروني', UI.inp('email', c.email, { attrs: 'dir="ltr"' }))}${UI.field('الرقم الضريبي', UI.inp('taxNo', c.taxNo))}${UI.field('السجل التجاري', UI.inp('cr', c.cr))}${UI.field('العملة (الرمز)', UI.inp('currency', DB.s.settings.currency))}</div>
    </div><div class="card-f"><button class="btn primary" data-act="co-save">${icon('check')} حفظ</button></div></div>
`;
  };
  M.company = (el) => {
    el.querySelector('#logo-file').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const img = new Image(), rd = new FileReader();
      rd.onload = () => { img.onload = () => { const s = Math.min(1, 256 / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = img.width * s; cv.height = img.height * s; cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); const url = cv.toDataURL('image/png'); save(() => { DB.s.settings.company.logo = url; DB.audit('تغيير اللوجو', 'settings', null, ''); }, 'تم تحديث اللوجو'); }; img.src = rd.result; };
      rd.readAsDataURL(f);
    });
  };
  // صورة الخلفية: تُصغر إلى 1600 بكسل وتُضغط JPEG حتى لا تثقل التخزين
  const loadHero = (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) return UI.toast('اختر ملف صورة', 'danger');
    const img = new Image(), rd = new FileReader();
    rd.onload = () => {
      img.onload = () => {
        const sc = Math.min(1, 1600 / img.width);
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        const url = cv.toDataURL('image/jpeg', 0.8);
        if (url.length > 900 * 1024) return UI.toast('الصورة كبيرة جدًا بعد الضغط — جرّب صورة أبسط', 'danger');
        save(() => { DB.s.settings.heroImage = url; DB.s.settings.heroEnabled = true; DB.audit('تغيير صورة الخلفية', 'settings', null, ''); }, 'تم تحديث صورة الخلفية');
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  };
  UI.acts['hero-reset'] = () => save(() => { delete DB.s.settings.heroImage; DB.audit('استعادة صورة الخلفية الافتراضية', 'settings', null, ''); }, 'تمت استعادة الصورة الافتراضية');
  UI.acts['logo-rm'] = () => save(() => { DB.s.settings.company.logo = null; });
  UI.acts['co-save'] = () => { const v = UI.readForm(document.getElementById('co-form')); if (!v.name.trim()) return UI.toast('اسم المصنع مطلوب', 'danger'); save(() => { const c = DB.s.settings.company; ['name', 'nameEn', 'address', 'phone', 'mobile', 'email', 'taxNo', 'cr'].forEach((k) => (c[k] = v[k])); DB.s.settings.currency = v.currency || 'ج.م'; DB.audit('تعديل بيانات المصنع', 'settings', null, c.name); }); };

  /* المظهر: تفضيلات شخصية (على هذا الجهاز) + صورة لوحة التحكم (للمصنع كله) */
  const SCALES = [[90, 'صغير'], [100, 'افتراضي'], [110, 'كبير'], [120, 'أكبر']];
  T.appearance = () => {
    const v = Look.get(), s = DB.s.settings, th = Look.theme();
    const heroOn = s.heroEnabled !== false;
    const heroImg = s.heroImage || 'assets/hero-factory.jpg';
    const check = `<span class="ap-check">${icon('check')}</span>`;
    const opt = (k, val, art, label, sub, on) => `<button class="ap-opt ${(on != null ? on : v[k] === val) ? 'on' : ''}" data-act="look" data-k="${k}" data-v="${val}">${art}<span class="ap-txt"><span class="ap-l">${label}</span>${sub ? `<span class="ap-s">${sub}</span>` : ''}</span>${check}</button>`;
    const sec = (ic, title, desc, body, side) => `<section class="card ap-sec"><div class="card-h"><span class="ap-ico">${icon(ic)}</span><div class="grow"><h3>${title}</h3><div class="sub">${desc}</div></div>${side || ''}</div><div class="card-b">${body}</div></section>`;
    const mini = (m) => `<span class="ap-mini m-${m}"><i class="mm-side"><b></b><b></b><b></b></i><i class="mm-main"><b class="mm-h"></b><span class="mm-cards"><b></b><b></b></span><b class="mm-chart"></b></i></span>`;
    const spark = UI.spark([12, 18, 14, 22, 19, 27, 24, 31], getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(), 52);
    return `<div class="ap">
      <section class="ap-preview card">
        <div class="ap-pv-text"><span class="ap-badge">${icon('sparkle')} معاينة مباشرة</span><h2>شكّل الواجهة على ذوقك</h2><p>كل تغيير يظهر فورًا في البرنامج كله. هذه التفضيلات خاصة بهذا الجهاز ولا تغيّر شيئًا عند باقي المستخدمين.</p>
          <div class="row wrap"><button class="btn primary">${icon('plus')} فاتورة بيع</button><button class="btn">${icon('printer')} طباعة</button><span class="pill ok">معتمد</span><span class="pill draft">مسودة</span></div></div>
        <div class="ap-pv-card"><div class="row between"><span class="kb-l">صافي المبيعات</span><span class="kb-ico" style="--kg:var(--primary)">${icon('receipt')}</span></div>
          <div class="ap-pv-v num">4,753,177.64 <small>${UI.cur()}</small></div><div class="ap-pv-spark">${spark}</div>
          <div class="row between ap-pv-f"><span class="muted small">عن نفس الفترة 2025</span><span class="trend good">${icon('arrowUp')}21.7%</span></div></div>
      </section>
      <div class="ap-grid">
      ${sec('sun', 'وضع العرض', 'فاتح للنهار، داكن مريح للعين ليلًا، أو تلقائي يتبع إعداد الجهاز', `<div class="ap-opts c3">
        ${opt('mode', 'light', mini('light'), 'فاتح', 'خلفية فاتحة وبطاقات بيضاء')}${opt('mode', 'dark', mini('dark'), 'داكن', 'مريح في الإضاءة المنخفضة')}${opt('mode', 'system', mini('system'), 'تلقائي', 'يتبع إعداد الجهاز')}</div>`)}
      ${sec('palette', 'اللون الأساسي', 'لون الأزرار والعناصر النشطة والرسم البياني الرئيسي', `<div class="ap-swatches">${Object.entries(Look.ACCENTS).map(([k, a]) => `<button class="ap-sw ${v.accent === k ? 'on' : ''}" data-act="look" data-k="accent" data-v="${k}" style="--sw:${a[th][0]}" title="${a.label}"><span class="sw-dot">${icon('check')}</span><span class="ap-l">${a.label}</span></button>`).join('')}</div>`)}
      ${sec('type', 'حجم الخط والعناصر', 'كبّر الواجهة للقراءة من مسافة أو صغّرها لعرض بيانات أكثر', `
        <div class="ap-scale"><span class="ap-a sm">أ</span><input type="range" class="ap-range" id="ap-scale" min="85" max="125" step="5" value="${v.scale}" style="--p:${((v.scale - 85) / 40) * 100}%"><span class="ap-a lg">أ</span><output class="ap-val num" id="ap-scale-v">${v.scale}%</output></div>
        <div class="btn-group mt-12">${SCALES.map(([n, l]) => `<button class="btn sm ${+v.scale === n ? 'on' : ''}" data-act="look" data-k="scale" data-v="${n}">${l}</button>`).join('')}</div>`)}
      ${sec('type', 'خط الواجهة', 'الخط العربي المستخدم في كل الشاشات (الأرقام تبقى بنفس الخط الواضح)', `<div class="ap-opts c4">${Object.entries(Look.FONTS).map(([k, f]) => opt('font', k, `<span class="ap-font" style="font-family:'${f.family}'">أبجد هوز</span>`, f.label, k === 'plex' ? 'افتراضي · رسمي' : k === 'cairo' ? 'عصري وعريض' : k === 'tajawal' ? 'خفيف وأنيق' : 'هادئ ومقروء')).join('')}</div>`)}
      ${sec('corner', 'شكل الحواف', 'استدارة زوايا البطاقات والأزرار والحقول', `<div class="ap-opts c4">${[['sharp', 'حاد'], ['soft', 'ناعم'], ['round', 'مستدير'], ['pill', 'كبسولة']].map(([k, l]) => opt('radius', k, `<span class="ap-corner" style="--r:${Look.RADII[k]}px"></span>`, l, k === 'round' ? 'افتراضي' : '')).join('')}</div>`)}
      ${sec('rows', 'كثافة الجداول', 'مضغوط = صفوف أكثر في الشاشة لمن يعمل تحت ضغط', `<div class="ap-opts c2">${[['comfortable', 'مريح', 'مسافات أوسع بين الصفوف'], ['compact', 'مضغوط', 'صفوف أكثر في نفس الشاشة']].map(([k, l, d]) => `<button class="ap-opt ${(s.density || 'comfortable') === k ? 'on' : ''}" data-act="density" data-v="${k}"><span class="ap-rows ${k}"><b></b><b></b><b></b><b></b></span><span class="ap-txt"><span class="ap-l">${l}</span><span class="ap-s">${d}</span></span>${check}</button>`).join('')}</div>`)}
      ${sec('zap', 'الحركة والانتقالات', 'حركات الدخول والرسوم المتحركة عند فتح الصفحات', `<div class="ap-opts c2">${opt('motion', 'full', `<span class="ap-motion">${icon('sparkle')}</span>`, 'كاملة', 'انتقالات ناعمة ورسوم تتحرك')}${opt('motion', 'reduced', `<span class="ap-motion">${icon('minus')}</span>`, 'مخففة', 'ظهور فوري بلا حركة')}</div>`)}
      </div>
      ${!E.can('settings') ? '' : sec('image', 'صورة لوحة التحكم', 'الصورة أعلى لوحة التحكم خلف التحية — هذا الإعداد للمصنع كله', `
        <div class="ap-opts c2 ap-hero-opts">
          <button class="ap-opt ${heroOn ? 'on' : ''}" data-act="hero-set" data-v="1"><span class="ap-hero-th" style="background-image:url('${heroImg}')"><b></b><i></i></span><span class="ap-txt"><span class="ap-l">مع صورة</span><span class="ap-s">صورة مصنعك خلف التحية</span></span>${check}</button>
          <button class="ap-opt ${heroOn ? '' : 'on'}" data-act="hero-set" data-v="0"><span class="ap-hero-th plain"><b></b><i></i></span><span class="ap-txt"><span class="ap-l">بدون صورة</span><span class="ap-s">تصميم هادئ بلون الواجهة</span></span>${check}</button>
        </div>
        <div class="row wrap mt-16"><label class="btn sm">${icon('upload')} رفع صورة جديدة<input type="file" accept="image/*" id="hero-file" hidden></label>${s.heroImage ? `<button class="btn sm ghost" data-act="hero-reset">${icon('history')} استعادة الصورة الافتراضية</button>` : ''}<span class="small muted">يفضل صورة عرضية (1600×900 أو أكبر) — تُضغط تلقائيًا، والجزء المهم يكون في الناحية البعيدة عن النص</span></div>`)}
      <div class="ap-foot"><span class="muted small">${icon('info')} تُحفظ تفضيلاتك تلقائيًا على هذا الجهاز</span><button class="btn" data-act="look-reset">${icon('undo')} استعادة الإعدادات الافتراضية</button></div>
    </div>`;
  };
  M.appearance = (el) => {
    // تحميل الخطوط لمعاينتها داخل البطاقات
    Object.entries(Look.FONTS).forEach(([k, f]) => { if (k !== 'plex' && !document.getElementById('font-' + k)) { const l = document.createElement('link'); l.id = 'font-' + k; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${f.css}&display=swap`; document.head.appendChild(l); } });
    el.querySelector('#hero-file').addEventListener('change', (e) => loadHero(e.target.files[0]));
    const r = el.querySelector('#ap-scale');
    r.addEventListener('input', () => {
      r.style.setProperty('--p', ((r.value - 85) / 40) * 100 + '%');
      el.querySelector('#ap-scale-v').textContent = r.value + '%';
      Look.set({ scale: +r.value });
    });
    r.addEventListener('change', () => App.refresh());
  };
  UI.acts.look = (el) => {
    const k = el.dataset.k, v = k === 'scale' ? +el.dataset.v : el.dataset.v;
    if (Look.get()[k] === v) return;
    App.restyle({ [k]: v }, el);
  };
  UI.acts['look-reset'] = () => { if (document.startViewTransition && Look.get().motion === 'full') document.startViewTransition(() => { Look.reset(); App.onThemeChange(); }); else { Look.reset(); App.onThemeChange(); } UI.toast('تمت استعادة المظهر الافتراضي', 'success'); };
  UI.acts['hero-set'] = (el) => { const on = el.dataset.v === '1'; if ((DB.s.settings.heroEnabled !== false) === on) return; save(() => { DB.s.settings.heroEnabled = on; DB.audit(on ? 'إظهار صورة لوحة التحكم' : 'إخفاء صورة لوحة التحكم', 'settings', null, ''); }, on ? 'ستظهر الصورة في لوحة التحكم' : 'تم إخفاء الصورة من لوحة التحكم'); };

  /* السنوات المالية */
  T.years = () => {
    const ys = DB.s.fiscalYears.slice().sort((a, b) => (a.start < b.start ? 1 : -1));
    return `<div class="card"><div class="card-h"><h3>السنوات المالية</h3><span class="grow"></span><button class="btn sm primary" data-act="fy-add">${icon('plus')} إضافة السنة التالية</button></div>
      <div class="card-b"><div class="notice info mb-16">${icon('info')}<div class="n-body small">الأرصدة تنتقل تلقائيًا بين السنوات لأنها محسوبة من كل الحركات منذ البداية — بدء سنة جديدة لا يصفّر أرصدة العملاء أو الموردين. إقفال السنة يمنع إنشاء أو إلغاء أي عملية بتاريخ داخلها.</div></div></div>
      ${UI.table({ id: 'fys', rows: ys, search: false, noPage: true, cols: [
        { k: 'n', label: 'السنة', html: (f) => `<b>${esc(f.name)}</b>` },
        { k: 's', label: 'من', html: (f) => U.date(f.start) }, { k: 'e', label: 'إلى', html: (f) => U.date(f.end) },
        { k: 'd', label: 'المستندات', num: true, html: (f) => U.int(DB.s.docs.filter((d) => d.date >= f.start && d.date <= f.end && d.status === 'posted').length) },
        { k: 'dr', label: 'مسودات', num: true, html: (f) => { const n = DB.s.docs.filter((d) => d.date >= f.start && d.date <= f.end && d.status === 'draft').length; return n ? `<span class="pill draft">${n}</span>` : '—'; } },
        { k: 'st', label: 'الحالة', html: (f) => (f.status === 'closed' ? '<span class="pill closed">مقفلة</span>' : '<span class="pill open">مفتوحة</span>') },
        { k: 'a', label: '', html: (f) => (E.can('close_year') ? `<button class="btn xs" data-act="fy-toggle" data-id="${f.id}">${icon(f.status === 'closed' ? 'unlock' : 'lock')} ${f.status === 'closed' ? 'إعادة فتح' : 'إقفال'}</button>` : '') },
      ] })}</div>`;
  };
  UI.acts['fy-add'] = () => {
    const last = DB.s.fiscalYears.slice().sort((a, b) => (a.end < b.end ? 1 : -1))[0];
    const start = last ? U.addDays(last.end, 1) : U.year(U.today()) + '-01-01';
    const end = U.addDays(start.slice(0, 4) * 1 + 1 + start.slice(4), -1);
    save(() => { const f = DB.add('fiscalYears', { name: start.slice(5) === '01-01' ? start.slice(0, 4) : start.slice(0, 4) + '/' + end.slice(0, 4), start, end, status: 'open' }); DB.audit('إضافة سنة مالية', 'fy', f.id, f.name); }, 'تمت إضافة السنة');
  };
  UI.acts['fy-toggle'] = async (el) => {
    const f = DB.get('fiscalYears', +el.dataset.id);
    const drafts = DB.s.docs.filter((d) => d.date >= f.start && d.date <= f.end && d.status === 'draft').length;
    if (f.status === 'open' && !(await UI.confirm({ title: 'إقفال السنة ' + esc(f.name), message: (drafts ? `<div class="notice warn mb-12">${icon('alert')}<div>يوجد ${drafts} مسودة بتاريخ داخل السنة — لن يمكن اعتمادها بعد الإقفال.</div></div>` : '') + 'لن يمكن تسجيل أو إلغاء أي عملية بتاريخ داخل هذه السنة حتى إعادة فتحها.', ok: 'إقفال' }))) return;
    if (UI.run(() => DB.tx(() => { E.need('close_year'); f.status = f.status === 'closed' ? 'open' : 'closed'; DB.audit(f.status === 'closed' ? 'إقفال سنة' : 'إعادة فتح سنة', 'fy', f.id, f.name); return true; }), 'تم')) App.refresh();
  };

  /* الضرائب */
  T.taxes = () => `<div class="card"><div class="card-h"><h3>الضرائب</h3><span class="sub">لا يفترض النظام أي ضريبة لأي دولة تلقائيًا — عرّف ما يخصك</span><span class="grow"></span><button class="btn sm primary" data-act="tax-edit">${icon('plus')} ضريبة</button></div>
    ${UI.table({ id: 'taxes', rows: DB.s.taxes, search: false, noPage: true, cols: [
      { k: 'n', label: 'الاسم', html: (t) => `<b>${esc(t.name)}</b>` }, { k: 'r', label: 'النسبة', num: true, html: (t) => t.rate + '%' }, { k: 'c', label: 'الدولة', html: (t) => esc(t.country || '') },
      { k: 'u', label: 'الاستخدام', num: true, html: (t) => U.int(DB.s.docs.filter((d) => d.taxId === t.id).length) + ' مستند' },
      { k: 'd', label: '', html: (t) => (DB.s.settings.defaultSalesTaxId === t.id ? '<span class="pill ok">افتراضية للمبيعات</span>' : `<button class="btn xs ghost" data-act="tax-default" data-id="${t.id}">تعيين افتراضية</button>`) },
      { k: 'a', label: '', html: (t) => `<button class="btn xs ghost" data-act="tax-edit" data-id="${t.id}">${icon('edit')}</button>` },
    ] })}
    <div class="card-f row"><span class="small">الضريبة الافتراضية للمبيعات:</span>${DB.s.settings.defaultSalesTaxId ? `<b class="small">${esc((E.tax(DB.s.settings.defaultSalesTaxId) || {}).name)}</b> <button class="btn xs ghost" data-act="tax-default" data-id="">إلغاء</button>` : '<span class="small muted">بدون — تُطبق يدويًا أو تلقائيًا للعملاء الخاضعين</span>'}</div>
    <div class="card-b"><div class="row wrap gap-8"><span class="small muted">قوالب جاهزة:</span>${[['ضريبة القيمة المضافة 14%', 14, 'مصر'], ['VAT 15% — السعودية', 15, 'السعودية'], ['VAT 5% — الإمارات', 5, 'الإمارات'], ['VAT 10% — الأردن (مخفضة)', 10, 'الأردن']].map(([n, r, c]) => `<button class="btn xs" data-act="tax-preset" data-n="${esc(n)}" data-r="${r}" data-c="${esc(c)}">${esc(n)}</button>`).join('')}</div></div></div>`;
  UI.acts['tax-default'] = (el) => save(() => { DB.s.settings.defaultSalesTaxId = el.dataset.id ? +el.dataset.id : null; });
  UI.acts['tax-preset'] = (el) => { if (DB.s.taxes.some((t) => t.name === el.dataset.n)) return UI.toast('موجودة بالفعل', 'info'); save(() => { DB.add('taxes', { name: el.dataset.n, rate: +el.dataset.r, country: el.dataset.c }); }); };
  UI.acts['tax-edit'] = (el) => {
    const id = el.dataset.id ? +el.dataset.id : null;
    const t = id ? E.tax(id) : { name: '', rate: '', country: '' };
    const used = id && DB.s.docs.some((d) => d.taxId === id && d.status !== 'draft');
    UI.modal({ title: id ? 'تعديل الضريبة' : 'ضريبة جديدة', size: 'sm', body: `<div class="grid">${UI.field('الاسم', UI.inp('name', t.name), { req: true })}${UI.field('النسبة %', UI.inp('rate', t.rate, { num: true, attrs: used ? 'readonly' : '' }), { hint: used ? 'مستخدمة في مستندات معتمدة — لتغيير النسبة أضف ضريبة جديدة' : '' })}${UI.field('الدولة', UI.inp('country', t.country))}</div>`,
      actions: [{ label: 'حفظ', cls: 'primary', primary: true, act: (m) => { const v = UI.readForm(m.el); if (!v.name || !(v.rate >= 0)) return UI.toast('أكمل البيانات', 'danger'); save(() => { if (id) Object.assign(E.tax(id), { name: v.name, rate: used ? t.rate : v.rate, country: v.country }); else DB.add('taxes', { name: v.name, rate: v.rate, country: v.country }); DB.audit('حفظ ضريبة', 'tax', id, v.name); }); m.close(); } }, { label: 'تراجع' },
        ...(id && !DB.s.docs.some((d) => d.taxId === id) ? [{ label: 'حذف', cls: 'danger', act: (m) => { save(() => { DB.remove('taxes', id); if (DB.s.settings.defaultSalesTaxId === id) DB.s.settings.defaultSalesTaxId = null; }); m.close(); } }] : [])] });
  };

  /* ───────── مصمم قوالب الفواتير ───────── */
  const TD = { id: null, draft: null };
  T.templates = () => {
    const list = DB.s.templates;
    if (!TD.id || !DB.get('templates', TD.id)) TD.id = (list.find((t) => t.isDefault) || list[0]).id;
    if (!TD.draft || TD.draft.id !== TD.id) TD.draft = U.clone(DB.get('templates', TD.id));
    const t = TD.draft;
    const showLbl = { logo: 'اللوجو', companyInfo: 'بيانات المصنع', partyPhone: 'هاتف العميل', partyAddress: 'عنوان العميل', taxNo: 'الأرقام الضريبية', balance: 'رصيد العميل بعد الفاتورة', payment: 'طريقة الدفع والمدفوع', notes: 'الملاحظات', signature: 'خانات التوقيع', terms: 'الشروط والأحكام', stamp: 'ختم المصنع' };
    return `<div class="row wrap mb-12">${list.map((x) => `<button class="btn sm ${x.id === TD.id ? 'primary' : ''}" data-act="tpl-pick" data-id="${x.id}">${esc(x.name)}${x.isDefault ? ' ★' : ''}</button>`).join('')}<button class="btn sm ghost" data-act="tpl-new">${icon('plus')} قالب جديد</button></div>
    <div class="designer">
      <div class="card" id="tpl-form"><div class="card-h"><h3>إعدادات القالب</h3><span class="grow"></span>${t.isDefault ? '<span class="pill ok">الافتراضي</span>' : `<button class="btn xs" data-act="tpl-default">تعيين كافتراضي</button>`}</div>
        <div class="card-b col gap-12">
          <div class="grid g2">${UI.field('اسم القالب', UI.inp('name', t.name))}${UI.field('عنوان الفاتورة', UI.inp('title', t.title))}
          ${UI.field('حجم الورق', UI.sel('paper', [['A4', 'A4'], ['A5', 'A5'], ['thermal', 'إيصال حراري 80مم']], t.paper))}${UI.field('النمط', UI.sel('style', [['classic', 'كلاسيكي'], ['modern', 'حديث (رأس ملون)'], ['minimal', 'مبسط']], t.style))}
          ${UI.field('اللون الأساسي', `<input type="color" class="input" name="color" value="${t.color}" style="padding:2px;height:36px">`)}</div>
          <div><div class="lbl mb-8">أعمدة جدول البنود <span class="tiny muted">(اسحب للترتيب · فعّل/أخفِ · عدّل الاسم)</span></div><div id="tpl-cols">${t.columns.map((c, i) => `<div class="col-item ${c.on ? '' : 'off'}" draggable="true" data-ci="${i}"><span class="grip">${icon('grip')}</span>${UI.sw('', c.on, `data-col-on="${i}"`)}<input class="input" style="height:28px" value="${esc(c.label)}" data-col-label="${i}"><span class="tiny muted mono">${c.key}</span><button class="btn xs ghost icon" data-act="tpl-mv" data-i="${i}" data-d="-1">${icon('arrowUp')}</button><button class="btn xs ghost icon" data-act="tpl-mv" data-i="${i}" data-d="1">${icon('arrowDown')}</button></div>`).join('')}</div></div>
          <div><div class="lbl mb-8">العناصر الظاهرة</div><div class="grid g2" style="gap:6px">${Object.entries(showLbl).map(([k, l]) => `<label class="check small">${UI.sw('', t.show[k], `data-show="${k}"`)} ${l}</label>`).join('')}</div></div>
          <div><div class="lbl mb-8">حقول مخصصة <span class="tiny muted">(تظهر في رأس الفاتورة)</span></div>${(t.customFields || []).map((f, i) => `<div class="row mb-8"><input class="input" placeholder="اسم الحقل" value="${esc(f.label)}" data-cf="${i}" data-k="label"><input class="input" placeholder="قيمة ثابتة (اختياري)" value="${esc(f.value || '')}" data-cf="${i}" data-k="value"><button class="btn sm ghost icon" data-act="tpl-cf-rm" data-i="${i}">${icon('x')}</button></div>`).join('')}<button class="btn xs" data-act="tpl-cf-add">${icon('plus')} إضافة حقل</button></div>
          ${UI.field('الشروط والأحكام', UI.area('terms', t.terms, { rows: 2 }))}${UI.field('تذييل', UI.inp('footer', t.footer))}
        </div>
        <div class="card-f row"><button class="btn primary" data-act="tpl-save">${icon('check')} حفظ القالب</button><button class="btn" data-act="tpl-dup">${icon('copy')} نسخ</button><span class="grow"></span>${!t.isDefault ? `<button class="btn ghost danger" data-act="tpl-del">${icon('trash')}</button>` : ''}</div>
        <div class="card-b"><div class="notice info">${icon('info')}<div class="n-body small">الفواتير المعتمدة تحتفظ بنسخة من القالب وقت اعتمادها — تعديل القالب لا يغير الفواتير التاريخية.</div></div></div>
      </div>
      <div class="preview-wrap" id="tpl-preview"></div>
    </div>`;
  };
  const sampleDoc = () => {
    const last = DB.s.docs.filter((d) => d.type === 'SI' && d.status === 'posted').slice(-1)[0];
    if (last) { const c = U.clone(last); c.status = 'posted'; c.snapshot = null; return c; }
    const it = DB.s.items.filter((i) => i.kind === 'finished').slice(0, 3);
    const d = E.newDoc('SI', { no: 'INV-0000', status: 'posted', sid: (DB.s.parties.find((p) => p.types.includes('customer')) || {}).id, lines: it.map((x) => ({ kind: 'item', itemId: x.id, qty: 10, unit: 'base', price: x.salePrice, disc: 0 })), taxId: DB.s.taxes[0] && DB.s.taxes[0].id, paid: 0 });
    E.calcTrade(d);
    return d;
  };
  const renderPreview = () => {
    const el = document.getElementById('tpl-preview');
    if (!el) return;
    const d = sampleDoc();
    if (TD.draft.columns.some((c) => c.key === 'tax' && c.on) && !d.taxId && DB.s.taxes[0]) { d.taxId = DB.s.taxes[0].id; E.calcTrade(d); }
    el.innerHTML = `<div class="tpl-scale" style="transform-origin:top right;width:max-content">${Pages.renderInvoice(d, TD.draft)}</div>`;
    // تصغير المعاينة لتناسب العمود مهما كان حجم الورق
    const box = el.querySelector('.tpl-scale'), paper = box.firstElementChild;
    const avail = el.clientWidth - 48;
    const s = Math.min(1, avail / paper.offsetWidth);
    box.style.transform = `scale(${s})`;
    box.style.height = paper.offsetHeight * s + 'px';
    box.style.marginInlineStart = Math.max(0, (avail - paper.offsetWidth * s) / 2) + 'px';
  };
  M.templates = (el) => {
    renderPreview();
    const form = el.querySelector('#tpl-form');
    const t = () => TD.draft;
    form.addEventListener('input', (e) => {
      const x = e.target;
      if (x.dataset.colOn != null) { t().columns[+x.dataset.colOn].on = x.checked; x.closest('.col-item').classList.toggle('off', !x.checked); }
      else if (x.dataset.colLabel != null) t().columns[+x.dataset.colLabel].label = x.value;
      else if (x.dataset.show) t().show[x.dataset.show] = x.checked;
      else if (x.dataset.cf != null) t().customFields[+x.dataset.cf][x.dataset.k] = x.value;
      else if (x.name && x.name in t()) t()[x.name] = x.value;
      renderPreview();
    });
    form.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT') renderPreview(); });
    let drag = null;
    const cols = form.querySelector('#tpl-cols');
    cols.addEventListener('dragstart', (e) => { drag = +e.target.closest('[data-ci]').dataset.ci; e.target.classList.add('dragging'); });
    cols.addEventListener('dragover', (e) => e.preventDefault());
    cols.addEventListener('drop', (e) => { e.preventDefault(); const to = e.target.closest('[data-ci]'); if (!to || drag == null) return; const arr = t().columns; const [c] = arr.splice(drag, 1); arr.splice(+to.dataset.ci, 0, c); App.refresh(); });
  };
  UI.acts['tpl-pick'] = (el) => { TD.id = +el.dataset.id; TD.draft = null; App.refresh(); };
  UI.acts['tpl-mv'] = (el) => { const a = TD.draft.columns, i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; App.refresh(); };
  UI.acts['tpl-cf-add'] = () => { TD.draft.customFields = TD.draft.customFields || []; TD.draft.customFields.push({ label: '', value: '' }); App.refresh(); };
  UI.acts['tpl-cf-rm'] = (el) => { TD.draft.customFields.splice(+el.dataset.i, 1); App.refresh(); };
  UI.acts['tpl-save'] = () => save(() => { const x = DB.get('templates', TD.id); Object.assign(x, U.clone(TD.draft)); DB.audit('تعديل قالب فاتورة', 'template', x.id, x.name); }, 'تم حفظ القالب');
  UI.acts['tpl-default'] = () => save(() => { DB.s.templates.forEach((x) => (x.isDefault = x.id === TD.id)); TD.draft.isDefault = true; });
  UI.acts['tpl-dup'] = () => save(() => { const c = U.clone(TD.draft); delete c.id; c.name += ' (نسخة)'; c.isDefault = false; const x = DB.add('templates', c); TD.id = x.id; TD.draft = null; }, 'تم نسخ القالب');
  UI.acts['tpl-new'] = () => save(() => { const base = U.clone(DB.s.templates.find((x) => x.isDefault) || DB.s.templates[0]); delete base.id; base.name = 'قالب جديد'; base.isDefault = false; const x = DB.add('templates', base); TD.id = x.id; TD.draft = null; });
  UI.acts['tpl-del'] = async () => { if (await UI.confirm({ title: 'حذف القالب', message: 'الفواتير المعتمدة به تحتفظ بنسختها ولن تتأثر.', danger: true, ok: 'حذف' })) save(() => { DB.remove('templates', TD.id); DB.s.docs.forEach((d) => { if (d.status === 'draft' && d.templateId === TD.id) d.templateId = null; }); TD.id = null; TD.draft = null; }, 'تم الحذف'); };

  /* القوائم */
  const LISTS = [
    ['itemCats', 'فئات الأصناف', [['name', 'الاسم'], ['prefix', 'بادئة الكود']]],
    ['warehouses', 'المخازن', [['name', 'الاسم'], ['code', 'الكود']]],
    ['units', 'وحدات القياس', [['name', 'الاسم']]],
    ['expenseCats', 'بنود المصروفات', [['name', 'الاسم']]],
    ['incomeCats', 'بنود الإيرادات', [['name', 'الاسم']]],
    ['departments', 'أقسام العمالة', [['name', 'الاسم']]],
    ['operations', 'عمليات الإنتاج (للقطعة)', [['name', 'الاسم'], ['deptId', 'القسم']]],
    ['modelCats', 'تصنيفات الموديلات', [['name', 'الاسم']]],
  ];
  const usedIn = (coll, id) => {
    const x = DB.get(coll, id);
    switch (coll) {
      case 'itemCats': return DB.s.items.some((i) => i.catId === id);
      case 'warehouses': return DB.s.stock.some((m) => m.whId === id) || DB.s.docs.some((d) => d.whId === id || d.whTo === id);
      case 'units': return DB.s.items.some((i) => i.unit === x.name || i.altUnit === x.name);
      case 'expenseCats': return DB.s.docs.some((d) => d.catId === id || (d.lines || []).some((l) => l.catId === id));
      case 'incomeCats': return DB.s.docs.some((d) => d.type === 'IN' && d.catId === id);
      case 'departments': return DB.s.workers.some((w) => w.deptId === id) || DB.s.operations.some((o) => o.deptId === id);
      case 'operations': return DB.s.workLogs.some((l) => l.opId === id) || DB.s.rates.some((r) => r.kind === 'operation' && r.refId === id);
      case 'modelCats': return DB.s.models.some((m) => m.catId === id);
    }
    return false;
  };
  T.lists = () => `<div class="grid g2" style="align-items:start">${LISTS.map(([coll, title, fields]) => `<div class="card"><div class="card-h"><h3>${title}</h3><span class="sub">${DB.s[coll].length}</span><span class="grow"></span><button class="btn xs" data-act="ls-edit" data-coll="${coll}">${icon('plus')} إضافة</button></div>
    <div class="info-list" style="max-height:280px;overflow:auto">${DB.s[coll].map((x) => `<div class="i-row"><span>${esc(x.name)}${fields[1] ? ` <span class="tiny muted">${esc(fields[1][0] === 'deptId' ? E.nameOf('departments', x.deptId) : x[fields[1][0]] || '')}</span>` : ''}${x.active === false ? ' <span class="pill void">موقوف</span>' : ''}</span><span><button class="btn xs ghost icon" data-act="ls-edit" data-coll="${coll}" data-id="${x.id}">${icon('edit')}</button></span></div>`).join('')}</div></div>`).join('')}</div>`;
  UI.acts['ls-edit'] = (el) => {
    const coll = el.dataset.coll, id = el.dataset.id ? +el.dataset.id : null;
    const [, title, fields] = LISTS.find((l) => l[0] === coll);
    const x = id ? DB.get(coll, id) : { active: true };
    const used = id && usedIn(coll, id);
    UI.modal({ title: (id ? 'تعديل' : 'إضافة') + ' — ' + title, size: 'sm',
      body: `<div class="grid">${fields.map(([k, l]) => UI.field(l, k === 'deptId' ? UI.sel(k, DB.s.departments.map((d) => [d.id, d.name]), x[k]) : UI.inp(k, x[k], { attrs: k === 'name' ? 'autofocus' : '' }), { req: k === 'name' })).join('')}${id && 'active' in x ? `<div class="row">${UI.sw('active', x.active !== false)} نشط</div>` : ''}${used ? `<div class="notice info">${icon('info')}<div class="n-body small">مستخدم في سجلات — يمكن تعديله أو إيقافه، ولا يمكن حذفه.</div></div>` : ''}</div>`,
      actions: [{ label: 'حفظ', cls: 'primary', primary: true, act: (m) => {
        const v = UI.readForm(m.el);
        if (!v.name || !v.name.trim()) return UI.toast('الاسم مطلوب', 'danger');
        if (DB.s[coll].some((o) => o.name === v.name.trim() && o.id !== id)) return UI.toast('الاسم موجود بالفعل', 'danger');
        if (coll === 'units' && id && used && v.name !== x.name) return UI.toast('لا يمكن تغيير اسم وحدة مستخدمة', 'danger');
        save(() => { const data = {}; fields.forEach(([k]) => (data[k] = k === 'deptId' ? +v[k] : (v[k] || '').trim())); if (id) Object.assign(DB.get(coll, id), data, 'active' in v ? { active: v.active } : {}); else DB.add(coll, Object.assign(data, { active: true })); DB.audit('حفظ قائمة', coll, id, data.name); });
        m.close();
      } }, { label: 'تراجع' }, ...(id && !used ? [{ label: 'حذف', cls: 'danger', act: (m) => { save(() => { DB.remove(coll, id); DB.audit('حذف من قائمة', coll, id, x.name); }, 'تم الحذف'); m.close(); } }] : [])] });
  };

  /* قواعد العمل */
  T.prefs = () => {
    const s = DB.s.settings;
    const row = (k, title, desc) => `<div class="row" style="padding:14px 0;border-bottom:1px solid var(--border);align-items:flex-start;gap:14px">${UI.sw('', !!s[k], `data-pref="${k}"`)}<div><b>${title}</b><div class="small muted">${desc}</div></div></div>`;
    return `<div class="card"><div class="card-h"><h3>قواعد العمل</h3><span class="sub">قرارات يجب اعتمادها من صاحب المصنع/المحاسب</span></div><div class="card-b" style="padding-top:0">
      ${row('allowNegativeStock', 'السماح بالبيع/الصرف بأكثر من الرصيد', 'الافتراضي: ممنوع. عند الإيقاف يمكن لمن لديه صلاحية "تجاوز الرصيد" عمل استثناء موثق لكل مستند.')}
      ${row('allowNegativeCash', 'السماح بأن يصبح رصيد الخزينة سالبًا', 'الافتراضي: ممنوع — لا يمكن صرف أكثر من الموجود في الخزينة.')}
      ${row('purchaseTaxRecoverable', 'ضريبة المشتريات قابلة للاسترداد', 'إذا كانت مفعلة تُستبعد الضريبة من تكلفة المخزون؛ وإلا تُضاف لتكلفة الصنف.')}
      <div class="row" style="padding:14px 0;gap:14px"><span class="pill info">ثابت</span><div><b>طريقة تقييم المخزون: المتوسط المرجح المتحرك</b><div class="small muted">تكلفة الصرف = متوسط تكلفة الرصيد لحظة الاعتماد. (FIFO قابل للإضافة في النسخة الفعلية بعد اعتماد المحاسب)</div></div></div>
    </div></div>`;
  };
  M.prefs = (el) => el.addEventListener('change', (e) => { const k = e.target.dataset.pref; if (k) save(() => { DB.s.settings[k] = e.target.checked; DB.audit('تغيير قاعدة عمل', 'settings', null, k + ' = ' + e.target.checked); }); });
  UI.acts.density = (el) => { DB.s.settings.density = el.dataset.v; DB.save(); document.documentElement.dataset.density = el.dataset.v; App.refresh(); };

  /* ═══════════ الفريق والأمان ═══════════ */
  const roleOf = (k) => E.roleOf(k) || { label: k, color: '#64748b', perms: [] };
  const roleBadge = (k) => { const r = roleOf(k); return `<span class="role-badge" style="--rc:${r.color || '#64748b'}"><i></i>${esc(r.label)}</span>`; };
  const isLocked = (u) => u.lockedUntil && Date.parse(u.lockedUntil) > Date.now();
  const statusPill = (u) => (u.status === 'disabled' ? '<span class="pill void">موقوف</span>' : u.status === 'invited' ? '<span class="pill draft">بانتظار القبول</span>' : isLocked(u) ? '<span class="pill danger">مقفل مؤقتًا</span>' : '<span class="pill ok">نشط</span>');
  const seatsUsed = () => DB.s.users.filter((u) => u.status !== 'disabled').length;
  const plan = () => Auth.PLANS[(DB.s.settings.subscription || {}).plan] || Auth.PLANS.pro;
  const activeOwners = () => DB.s.users.filter((u) => u.role === 'owner' && u.status === 'active');
  const ago = (iso) => {
    if (!iso) return '—';
    const m = Math.round((Date.now() - Date.parse(iso)) / 6e4);
    return m < 1 ? 'الآن' : m < 60 ? `منذ ${m} دقيقة` : m < 1440 ? `منذ ${Math.round(m / 60)} ساعة` : U.date(iso.slice(0, 10));
  };
  const newCode = () => { const c = Auth.randCode(8, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'); return c.slice(0, 4) + '-' + c.slice(4); };
  const inviteLink = (code) => `${location.origin}${location.pathname}#invite=${code}`;
  // تغييرات الفريق تمر بنفس الحارس: صلاحية الإعدادات + معاملة ذرية + سجل
  const teamSave = (fn, msg) => save(fn, msg);

  /* حسابي */
  T.profile = () => {
    const u = E.user(), r = roleOf(u.role);
    return `<div class="card prof-hero"><span class="avatar prof-av">${UI.initials(u.name)}</span><div class="grow"><h2>${esc(u.name)}</h2><div class="muted" dir="ltr" style="text-align:start">${esc(u.email || '')}</div>
        <div class="row wrap mt-8">${roleBadge(u.role)}<span class="pill plain">${icon('clock')} آخر دخول ${ago(u.lastLogin)}</span></div></div></div>
      <div class="ap-grid mt-16">
        <section class="card"><div class="card-h"><span class="ap-ico">${icon('user')}</span><div class="grow"><h3>البيانات الشخصية</h3><div class="sub">الاسم يظهر في سجل التغييرات وعلى المستندات</div></div></div>
          <form class="card-b grid" id="prof-form">${UI.field('الاسم الكامل', UI.inp('name', u.name), { req: true })}${UI.field('البريد الإلكتروني', UI.inp('email', u.email, { attrs: 'dir="ltr" type="email"' }), { req: true })}${UI.field('اسم الدخول', UI.inp('username', u.username, { attrs: 'dir="ltr"' }), { req: true })}
          <div><button class="btn primary" type="submit">${icon('check')} حفظ البيانات</button></div></form></section>
        <section class="card"><div class="card-h"><span class="ap-ico">${icon('lock')}</span><div class="grow"><h3>تغيير كلمة المرور</h3><div class="sub">تغيير كلمة المرور يُخرج حسابك من كل الأجهزة الأخرى</div></div></div>
          <form class="card-b au-form" id="pw-form" novalidate>${Auth.field('current', 'كلمة المرور الحالية', 'lock', 'current-password', true)}${Auth.field('password', 'كلمة المرور الجديدة', 'lock', 'new-password', true)}${Auth.meter()}${Auth.field('confirm', 'تأكيد كلمة المرور', 'lock', 'new-password', true)}
          <div class="au-err" role="alert"></div><div><button class="btn primary au-submit" type="submit">${icon('shield')} تحديث كلمة المرور</button></div></form></section>
      </div>
      <section class="card mt-16"><div class="card-h"><span class="ap-ico">${icon('monitor')}</span><div class="grow"><h3>الجلسات والأجهزة</h3><div class="sub">إذا سجّلت الدخول من جهاز لم تعد تستخدمه، أخرجه من هنا</div></div></div>
        <div class="card-b"><div class="sess-row"><span class="sess-ico">${icon('monitor')}</span><span class="grow"><b>هذا الجهاز</b><span class="muted small">${esc(navigator.platform || '')} · نشط الآن</span></span><span class="pill ok">الجلسة الحالية</span></div>
        <div class="row wrap mt-16"><button class="btn" data-act="prof-revoke">${icon('external')} تسجيل الخروج من كل الأجهزة الأخرى</button><button class="btn" data-act="auth-lock">${icon('lock')} قفل الشاشة الآن</button><span class="grow"></span><button class="btn danger" data-act="auth-signout">تسجيل الخروج</button></div></div></section>`;
  };
  M.profile = (el) => {
    const pf = el.querySelector('#prof-form');
    pf.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = UI.readForm(pf), u = E.user();
      if (!v.name.trim() || !v.username.trim()) return UI.toast('أكمل البيانات', 'danger');
      if (!Auth.emailOk(v.email.trim())) return UI.toast('البريد الإلكتروني غير صحيح', 'danger');
      if (DB.s.users.some((x) => x.id !== u.id && ((x.email || '').toLowerCase() === v.email.trim().toLowerCase() || x.username === v.username.trim()))) return UI.toast('البريد أو اسم الدخول مستخدم لعضو آخر', 'danger');
      if (UI.run(() => DB.tx(() => { Object.assign(u, { name: v.name.trim(), email: v.email.trim().toLowerCase(), username: v.username.trim() }); DB.audit('تعديل بيانات الحساب', 'auth', u.id, ''); }), 'تم حفظ بياناتك')) { App.renderChrome(); App.refresh(); }
    });
    const f = el.querySelector('#pw-form');
    Auth.bindPwFields(f);
    f.addEventListener('input', () => Auth.clearErr(f));
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = E.user();
      if (!Auth.pwValid(f.password.value, policy().strongPasswords)) return Auth.fail(f, 'كلمة المرور الجديدة لا تحقق الشروط');
      if (f.password.value !== f.confirm.value) return Auth.fail(f, 'كلمتا المرور غير متطابقتين');
      Auth.busy(f, true);
      if (!(await Auth.checkSecret(u.cred, f.current.value))) { Auth.busy(f, false); return Auth.fail(f, 'كلمة المرور الحالية غير صحيحة'); }
      const cred = await Auth.makeSecret(f.password.value);
      DB.tx(() => { u.cred = cred; Auth.revokeSessions(u, true); DB.audit('تغيير كلمة المرور', 'auth', u.id, 'من صفحة الحساب'); });
      Auth.busy(f, false);
      f.reset(); Auth.bindPwFields(f);
      UI.toast('تم تحديث كلمة المرور وتسجيل خروج الأجهزة الأخرى', 'success');
    });
  };
  UI.acts['prof-revoke'] = () => { const u = E.user(); DB.tx(() => { Auth.revokeSessions(u, true); DB.audit('تسجيل خروج من كل الأجهزة', 'auth', u.id, ''); }); UI.toast('تم تسجيل الخروج من كل الأجهزة الأخرى', 'success'); };
  const policy = () => Auth.policy();

  /* المستخدمون */
  T.users = () => {
    const p = plan(), used = seatsUsed(), lim = p.seats;
    const users = DB.s.users.slice().sort((a, b) => (a.role === 'owner' ? -1 : 0) - (b.role === 'owner' ? -1 : 0) || a.name.localeCompare(b.name, 'ar'));
    const by = (st) => DB.s.users.filter((u) => u.status === st).length;
    return `<div class="team-stats">
        <div class="card ts-card ts-seats"><span class="ts-l">مقاعد الخطة ${esc(p.label)}</span><b class="num">${used} <small>/ ${lim || '∞'}</small></b><div class="meter ${lim && used >= lim ? 'warn' : ''}"><i style="width:${lim ? Math.min(100, (used / lim) * 100) : 12}%"></i></div></div>
        <div class="card ts-card"><span class="ts-l">نشط</span><b class="num">${by('active')}</b></div>
        <div class="card ts-card"><span class="ts-l">بانتظار قبول الدعوة</span><b class="num">${by('invited')}</b></div>
        <div class="card ts-card"><span class="ts-l">موقوف</span><b class="num">${by('disabled')}</b></div>
      </div>
      <div class="card mt-16"><div class="card-h"><div class="grow"><h3>أعضاء الفريق</h3><div class="sub">كل عضو يدخل بحسابه الخاص، ويرى فقط ما يسمح به دوره</div></div><button class="btn primary" data-act="team-invite">${icon('plus')} دعوة عضو</button></div>
        <div class="team-list">${users.map((u) => `<div class="team-row ${u.status === 'disabled' ? 'off' : ''}"><span class="avatar">${UI.initials(u.name)}</span>
          <span class="tr-who"><b>${esc(u.name)}${u.id === DB.s.currentUserId ? ' <span class="pill primary plain">أنت</span>' : ''}</b><span class="muted small" dir="ltr">${esc(u.email || u.username)}</span></span>
          <span class="tr-role">${roleBadge(u.role)}</span><span class="tr-st">${statusPill(u)}</span>
          <span class="tr-last muted small">${u.status === 'invited' ? (u.invite && u.invite.exp < Date.now() ? 'انتهت الدعوة' : 'دعوة صالحة حتى ' + U.date(new Date(u.invite ? u.invite.exp : Date.now()).toISOString().slice(0, 10))) : 'آخر دخول ' + ago(u.lastLogin)}</span>
          <button class="btn ghost sm icon" data-act="team-menu" data-id="${u.id}" title="إجراءات">${icon('list')}</button></div>`).join('')}</div></div>`;
  };
  UI.acts['team-invite'] = () => editMember(null);
  UI.acts['team-menu'] = (el) => {
    const u = DB.get('users', +el.dataset.id), me = u.id === DB.s.currentUserId;
    const lastOwner = u.role === 'owner' && activeOwners().length <= 1 && u.status === 'active';
    const items = [{ label: 'تعديل البيانات والدور', icon: 'edit', act: () => editMember(u) }];
    if (u.status === 'invited') items.push({ label: 'عرض رمز ورابط الدعوة', icon: 'hash', act: () => showInvite(u) }, { label: 'إنشاء رمز دعوة جديد', icon: 'undo', act: () => renewInvite(u) });
    if (isLocked(u)) items.push({ label: 'فك القفل المؤقت', icon: 'unlock', act: () => teamSave(() => { u.lockedUntil = null; u.failed = 0; DB.audit('فك قفل الحساب', 'auth', u.id, u.name); }, 'تم فك القفل') });
    if (!me && u.status === 'active') {
      items.push({ sep: true }, { label: 'إعادة تعيين الدخول (رمز جديد)', icon: 'lock', act: () => resetMember(u) }, { label: 'تسجيل خروجه من كل الأجهزة', icon: 'external', act: () => teamSave(() => { Auth.revokeSessions(u); DB.audit('تسجيل خروج عضو من كل الأجهزة', 'auth', u.id, u.name); }, 'تم تسجيل خروجه') });
    }
    if (!me && !lastOwner) {
      items.push({ sep: true });
      if (u.status === 'disabled') items.push({ label: 'إعادة تفعيل الحساب', icon: 'checkCircle', act: () => { if (plan().seats && seatsUsed() >= plan().seats) return UI.toast('لا توجد مقاعد متاحة في خطتك — قم بالترقية', 'warning'); teamSave(() => { u.status = u.cred ? 'active' : 'invited'; u.active = true; DB.audit('إعادة تفعيل عضو', 'auth', u.id, u.name); }, 'تمت إعادة التفعيل'); } });
      else if (u.status === 'invited') items.push({ label: 'إلغاء الدعوة', icon: 'trash', danger: true, act: () => UI.confirm({ title: 'إلغاء الدعوة', message: `سيتم حذف دعوة ${esc(u.name)} ولن يعمل رمزها.`, ok: 'إلغاء الدعوة', danger: true }).then((ok) => ok && teamSave(() => { DB.remove('users', u.id); DB.audit('إلغاء دعوة', 'auth', u.id, u.name); }, 'تم إلغاء الدعوة')) });
      else items.push({ label: 'إيقاف الحساب', icon: 'ban', danger: true, act: () => UI.confirm({ title: 'إيقاف الحساب', message: `لن يتمكن ${esc(u.name)} من الدخول، وتُغلق جلساته فورًا. تبقى كل مستنداته وسجلاته كما هي.`, ok: 'إيقاف', danger: true }).then((ok) => ok && teamSave(() => { u.status = 'disabled'; u.active = false; Auth.revokeSessions(u); DB.audit('إيقاف عضو', 'auth', u.id, u.name); }, 'تم إيقاف الحساب')) });
    }
    UI.menu(el, items, { minWidth: 250 });
  };
  const roleTiles = (sel) => `<div class="role-tiles">${DB.s.roles.map((r) => `<label class="role-tile" style="--rc:${r.color}"><input type="radio" name="role" value="${r.key}" ${sel === r.key ? 'checked' : ''}><span><i></i><b>${esc(r.label)}</b><small>${esc(r.desc || '')}</small></span></label>`).join('')}</div>`;
  function editMember(u) {
    const isNew = !u;
    if (isNew && plan().seats && seatsUsed() >= plan().seats) {
      return UI.confirm({ title: 'وصلت لحد مقاعد خطتك', message: `خطة ${plan().label} تسمح بـ ${plan().seats} مستخدمين. قم بالترقية لإضافة أعضاء أكثر.`, ok: 'عرض الخطط' }).then((ok) => ok && (location.hash = '#/settings/subscription'));
    }
    UI.modal({ title: isNew ? 'دعوة عضو جديد' : 'تعديل العضو', size: 'md',
      body: `<div class="grid g2">${UI.field('الاسم الكامل', UI.inp('name', u ? u.name : ''), { req: true })}${UI.field('البريد الإلكتروني', UI.inp('email', u ? u.email : '', { attrs: 'dir="ltr" type="email"' }), { req: true })}</div>
        <div class="lbl mt-16 mb-8">الدور والصلاحيات</div>${roleTiles(u ? u.role : (DB.s.roles.find((r) => r.key === 'accountant') || DB.s.roles[1] || DB.s.roles[0]).key)}
        ${isNew ? `<div class="notice info mt-16">${icon('info')}<div class="n-body small">سيحصل العضو على رمز دعوة صالح 7 أيام ليختار كلمة المرور بنفسه — لن تعرف أنت كلمة مروره أبدًا.</div></div>` : ''}`,
      actions: [{ label: isNew ? 'إنشاء الدعوة' : 'حفظ', cls: 'primary', primary: true, act: (m) => {
        const v = UI.readForm(m.el), email = (v.email || '').trim().toLowerCase();
        if (!v.name.trim()) return UI.toast('اكتب الاسم', 'danger');
        if (!Auth.emailOk(email)) return UI.toast('البريد الإلكتروني غير صحيح', 'danger');
        if (DB.s.users.some((x) => (!u || x.id !== u.id) && (x.email || '').toLowerCase() === email)) return UI.toast('هذا البريد مضاف بالفعل في فريقك', 'danger');
        if (u && u.role === 'owner' && v.role !== 'owner' && activeOwners().length <= 1) return UI.toast('يجب أن يبقى مالك واحد نشط على الأقل', 'danger');
        let created = null;
        teamSave(() => {
          if (u) { Object.assign(u, { name: v.name.trim(), email, role: v.role }); DB.audit('تعديل عضو', 'auth', u.id, `${u.name} — ${roleOf(v.role).label}`); return; }
          let un = email.split('@')[0].replace(/[^a-z0-9._-]/gi, '') || 'user';
          while (DB.s.users.some((x) => x.username === un)) un += Math.floor(Math.random() * 9);
          created = DB.add('users', { name: v.name.trim(), username: un, email, role: v.role, active: true, status: 'invited', invite: { code: newCode(), exp: Date.now() + 7 * 864e5 }, sessionVer: 1, invitedBy: E.user().id, createdAt: new Date().toISOString() });
          DB.audit('دعوة عضو', 'auth', created.id, `${created.name} — ${roleOf(v.role).label}`);
        }, isNew ? 'تم إنشاء الدعوة' : 'تم الحفظ');
        m.close();
        if (created) setTimeout(() => showInvite(DB.get('users', created.id)), 200);
      } }, { label: 'تراجع' }] });
  }
  function showInvite(u) {
    const link = inviteLink(u.invite.code);
    UI.modal({ title: 'رمز الدعوة', size: 'sm',
      body: `<div class="inv-share"><span class="avatar">${UI.initials(u.name)}</span><b>${esc(u.name)}</b><span class="muted small" dir="ltr">${esc(u.email)}</span>
        <div class="inv-code mono" data-no-tr>${u.invite.code}</div><div class="muted small">صالح حتى ${U.date(new Date(u.invite.exp).toISOString().slice(0, 10))} · يُستخدم مرة واحدة</div>
        <div class="inv-link"><input class="input mono" readonly dir="ltr" value="${esc(link)}"><button class="btn sm primary" data-act="copy" data-v="${esc(link)}">${icon('copy')} نسخ الرابط</button></div>
        <button class="btn sm" data-act="copy" data-v="${u.invite.code}">${icon('copy')} نسخ الرمز فقط</button>
        <div class="notice info small">${icon('info')}<div class="n-body">في النسخة الفعلية تُرسل الدعوة تلقائيًا إلى بريد العضو. هنا انسخ الرابط أو الرمز وأرسله له.</div></div></div>`,
      actions: [{ label: 'تم', cls: 'primary', primary: true, act: (m) => m.close() }] });
  }
  UI.acts.copy = (el) => { (navigator.clipboard ? navigator.clipboard.writeText(el.dataset.v) : Promise.reject()).then(() => UI.toast('تم النسخ', 'success'), () => UI.toast('انسخ يدويًا: ' + el.dataset.v)); };
  const renewInvite = (u) => { teamSave(() => { u.invite = { code: newCode(), exp: Date.now() + 7 * 864e5 }; DB.audit('تجديد رمز الدعوة', 'auth', u.id, u.name); }, 'تم إنشاء رمز جديد — الرمز القديم لم يعد يعمل'); setTimeout(() => showInvite(DB.get('users', u.id)), 200); };
  const resetMember = (u) => UI.confirm({ title: 'إعادة تعيين الدخول', message: `سيتم إبطال كلمة مرور ${esc(u.name)} وتسجيل خروجه من كل الأجهزة، ويحصل على رمز جديد ليختار كلمة مرور بنفسه.`, ok: 'إعادة التعيين', danger: true }).then((ok) => {
    if (!ok) return;
    teamSave(() => { u.cred = null; u.status = 'invited'; u.invite = { code: newCode(), exp: Date.now() + 7 * 864e5 }; Auth.revokeSessions(u); DB.audit('إعادة تعيين دخول عضو', 'auth', u.id, u.name); }, 'تم إبطال الدخول القديم');
    setTimeout(() => showInvite(DB.get('users', u.id)), 200);
  });

  /* الأدوار والصلاحيات */
  const LEVELS = [['none', 'بدون وصول'], ['view', 'عرض فقط'], ['manage', 'إدارة كاملة']];
  const MOD_LABEL = { sales: ['المبيعات والعملاء', 'فواتير ومرتجعات المبيعات والعملاء'], purchases: ['المشتريات والموردين', 'فواتير ومرتجعات المشتريات والموردون'], finance: ['الخزائن والمالية', 'التحصيلات والصرف والمصروفات والتحويلات'], stock: ['المخزون والأصناف', 'الأصناف والأرصدة والجرد والتحويلات المخزنية'], outwork: ['المصنعية الخارجية', 'الورش وأوامر التشغيل والخامات والاستلام'], workers: ['العمالة الداخلية', 'العمال واليوميات ومسيرات الأجور'], models: ['الموديلات والرسم', 'الموديلات ومهام الرسم والبرمجة'] };
  const SPECIAL = [['view', 'لوحة التحكم', 'فتح الصفحة الرئيسية'], ['reports', 'التقارير وكشوف الحساب', 'الأرقام المالية والأرباح والتحليلات'], ['post', 'اعتماد المستندات', 'تحويل المسودة لمستند يؤثر في الأرصدة'], ['void', 'إلغاء المستندات المعتمدة', 'بقيود عكسية', 1], ['edit_prices', 'تعديل الأسعار والخصومات', 'البيع بسعر مختلف عن سعر الصنف', 1], ['negative_stock', 'تجاوز الرصيد المتاح', 'استثناء موثق عند نقص المخزون', 1], ['opening', 'الأرصدة الافتتاحية', 'إدخال أرصدة أول المدة', 1], ['close_year', 'إقفال السنوات المالية', 'إقفال وفتح السنة', 1], ['settings', 'الإعدادات والفريق', 'إدارة المستخدمين والأدوار والاشتراك', 1]];
  let roleDraft = null;
  const levelOf = (perms, m) => (perms.includes(m.manage) ? 'manage' : perms.includes(m.view) ? 'view' : 'none');
  T.roles = () => {
    const key = (App.current.query && App.current.query.r) || (roleDraft && roleDraft.key) || DB.s.roles[1].key;
    const saved = DB.s.roles.find((r) => r.key === key) || DB.s.roles[0];
    if (!roleDraft || roleDraft.key !== saved.key) roleDraft = JSON.parse(JSON.stringify(saved));
    // في الخطة الأساسية الأدوار الافتراضية فقط: تُعرض للقراءة مع دعوة للترقية
    const ro = !Auth.planHas('roles');
    const d = roleDraft, owner = d.key === 'owner' || ro, dirty = JSON.stringify(d) !== JSON.stringify(saved);
    const count = (k) => DB.s.users.filter((u) => u.role === k && u.status !== 'disabled').length;
    return `${ro ? `<div class="ups-strip"><span class="ups-sico">${icon('shield')}</span><span class="grow"><b>الأدوار المخصصة متاحة في خطة ${Auth.PLANS.pro.label}</b><span class="muted small">في خطتك الحالية تستخدم الأدوار الجاهزة كما هي — رقِّ لتعديل الصلاحيات وإنشاء أدوار بأسمائك.</span></span><button class="btn primary sm" data-act="upsell" data-m="roles">${icon('sparkle')} اعرف أكثر</button></div>` : ''}<div class="roles-layout">
      <aside class="card roles-list"><div class="card-h"><h3>الأدوار</h3><span class="grow"></span><button class="btn sm" data-act="role-new" ${ro ? 'hidden' : ''}>${icon('plus')} دور جديد</button></div>
        <div class="rl-items">${DB.s.roles.map((r) => `<a class="rl-item ${r.key === d.key ? 'on' : ''}" href="#/settings/roles?r=${r.key}"><i style="background:${r.color}"></i><span class="grow"><b>${esc(r.label)}</b><span class="muted small">${count(r.key)} ${count(r.key) === 1 ? 'عضو' : 'أعضاء'}</span></span>${r.system ? '<span class="tag">نظام</span>' : ''}</a>`).join('')}</div></aside>
      <section class="card roles-edit">
        <div class="card-h"><span class="ap-ico" style="background:color-mix(in srgb, ${d.color} 14%, transparent);color:${d.color}">${icon('shield')}</span><div class="grow"><h3>${esc(d.label)}</h3><div class="sub">${esc(d.desc || '')}</div></div>
          ${owner ? '' : `<button class="btn sm ghost" data-act="role-copy">${icon('copy')} نسخ</button><button class="btn sm ghost danger" data-act="role-del">${icon('trash')} حذف</button>`}</div>
        <div class="card-b">
          ${owner ? (ro ? '' : `<div class="notice info mb-16">${icon('lock')}<div class="n-body small">المالك يملك كل الصلاحيات دائمًا ولا يمكن تقييده — حتى لا يُغلق المصنع على نفسه.</div></div>`) : `<div class="grid g3 mb-16 role-meta">${UI.field('اسم الدور', `<input class="input" data-rf="label" value="${esc(d.label)}">`)}${UI.field('الوصف', `<input class="input" data-rf="desc" value="${esc(d.desc || '')}">`, { cls: 'span-2' })}
            <div class="field span-all"><label>اللون</label><div class="row wrap">${['#168a4c', '#3b7cf0', '#ee8a3c', '#8b5cf6', '#e5484d', '#0ea5c6', '#c99a3b', '#64748b'].map((c) => `<button type="button" class="rc-dot ${d.color === c ? 'on' : ''}" style="--c:${c}" data-act="role-color" data-v="${c}"></button>`).join('')}</div></div></div>`}
          <div class="perm-h"><b>الوصول للأقسام</b><span class="muted small">الإدارة تشمل العرض والإنشاء والتعديل</span></div>
          <div class="perm-mods">${E.MODULES.map((m) => { const lv = d.key === 'owner' ? 'manage' : levelOf(d.perms, m); return `<div class="pm-row"><span class="pm-ico">${icon(m.icon)}</span><span class="grow"><b>${MOD_LABEL[m.key][0]}</b><span class="muted small">${MOD_LABEL[m.key][1]}</span></span>
            <div class="btn-group pm-seg lv-${lv}">${LEVELS.map(([k, l]) => `<button type="button" class="btn sm ${lv === k ? 'on' : ''}" data-act="role-level" data-m="${m.key}" data-v="${k}" ${owner ? 'disabled' : ''}>${l}</button>`).join('')}</div></div>`; }).join('')}</div>
          <div class="perm-h mt-16"><b>صلاحيات خاصة</b><span class="muted small">المميزة بـ "حساسة" تؤثر في الأرقام أو الأمان</span></div>
          <div class="perm-specs">${SPECIAL.map(([k, l, desc, sens]) => `<label class="ps-row">${UI.sw('', d.key === 'owner' || d.perms.includes(k), `data-rp="${k}" ${owner ? 'disabled' : ''}`)}<span class="grow"><b>${l}${sens ? ' <span class="pill warn plain">حساسة</span>' : ''}</b><span class="muted small">${desc}</span></span></label>`).join('')}</div>
        </div>
        ${owner ? '' : `<div class="role-bar ${dirty ? 'on' : ''}"><span class="grow">${icon('info')} تغييرات غير محفوظة على الدور — تنطبق فور الحفظ على ${count(d.key)} ${count(d.key) === 1 ? 'عضو' : 'أعضاء'}</span><button class="btn" data-act="role-reset">تراجع</button><button class="btn primary" data-act="role-save">${icon('check')} حفظ الصلاحيات</button></div>`}
      </section></div>`;
  };
  M.roles = (el) => {
    el.querySelectorAll('[data-rf]').forEach((i) => i.addEventListener('input', () => { roleDraft[i.dataset.rf] = i.value; markDirty(el); }));
    el.querySelectorAll('[data-rp]').forEach((i) => i.addEventListener('change', () => {
      const k = i.dataset.rp, p = roleDraft.perms;
      if (i.checked && !p.includes(k)) p.push(k); else if (!i.checked) roleDraft.perms = p.filter((x) => x !== k);
      markDirty(el);
    }));
  };
  const markDirty = (el) => { const saved = DB.s.roles.find((r) => r.key === roleDraft.key); el.querySelector('.role-bar').classList.toggle('on', JSON.stringify(roleDraft) !== JSON.stringify(saved)); };
  UI.acts['role-level'] = (el) => {
    const m = E.MODULES.find((x) => x.key === el.dataset.m);
    roleDraft.perms = roleDraft.perms.filter((p) => p !== m.view && p !== m.manage);
    if (el.dataset.v === 'view') roleDraft.perms.push(m.view);
    if (el.dataset.v === 'manage') roleDraft.perms.push(m.view, m.manage);
    const seg = el.parentElement;
    seg.querySelectorAll('.btn').forEach((b) => b.classList.toggle('on', b === el));
    seg.className = 'btn-group pm-seg lv-' + el.dataset.v;
    markDirty(document.getElementById('view'));
  };
  UI.acts['role-color'] = (el) => { roleDraft.color = el.dataset.v; el.parentElement.querySelectorAll('.rc-dot').forEach((b) => b.classList.toggle('on', b === el)); markDirty(document.getElementById('view')); };
  UI.acts['role-reset'] = () => { roleDraft = null; App.refresh(); };
  UI.acts['role-save'] = () => {
    if (!Auth.planHas('roles')) return App.upsell('roles');
    const d = roleDraft;
    if (!d.label.trim()) return UI.toast('اكتب اسم الدور', 'danger');
    if (DB.s.roles.some((r) => r.key !== d.key && r.label.trim() === d.label.trim())) return UI.toast('يوجد دور بنفس الاسم', 'danger');
    teamSave(() => { const r = DB.s.roles.find((x) => x.key === d.key); Object.assign(r, JSON.parse(JSON.stringify(d)), { label: d.label.trim() }); DB.audit('تعديل صلاحيات دور', 'auth', null, `${r.label}: ${r.perms.length} صلاحية`); }, 'تم حفظ صلاحيات الدور');
    roleDraft = null;
  };
  UI.acts['role-new'] = () => !Auth.planHas('roles') ? App.upsell('roles') : UI.prompt({ title: 'دور جديد', label: 'اسم الدور', placeholder: 'مثال: مندوب مبيعات' }).then((name) => {
    if (!name || !name.trim()) return;
    const key = 'role_' + Date.now().toString(36);
    teamSave(() => { DB.s.roles.push({ key, label: name.trim(), desc: '', color: '#0ea5c6', perms: ['view'], system: false }); DB.audit('إنشاء دور', 'auth', null, name.trim()); }, 'تم إنشاء الدور — حدد صلاحياته الآن');
    roleDraft = null; location.hash = '#/settings/roles?r=' + key;
  });
  UI.acts['role-copy'] = () => {
    const src = DB.s.roles.find((r) => r.key === roleDraft.key), key = 'role_' + Date.now().toString(36);
    teamSave(() => { DB.s.roles.push(Object.assign(JSON.parse(JSON.stringify(src)), { key, label: src.label + ' (نسخة)', system: false })); DB.audit('نسخ دور', 'auth', null, src.label); }, 'تم نسخ الدور');
    roleDraft = null; location.hash = '#/settings/roles?r=' + key;
  };
  UI.acts['role-del'] = () => {
    const r = DB.s.roles.find((x) => x.key === roleDraft.key), n = DB.s.users.filter((u) => u.role === r.key).length;
    if (n) return UI.toast(`لا يمكن حذف دور مرتبط بـ ${n} ${n === 1 ? 'عضو' : 'أعضاء'} — انقلهم لدور آخر أولًا`, 'danger');
    UI.confirm({ title: 'حذف الدور', message: `حذف دور "${esc(r.label)}" نهائيًا؟`, ok: 'حذف', danger: true }).then((ok) => {
      if (!ok) return;
      teamSave(() => { DB.s.roles = DB.s.roles.filter((x) => x.key !== r.key); DB.audit('حذف دور', 'auth', null, r.label); }, 'تم حذف الدور');
      roleDraft = null; location.hash = '#/settings/roles';
    });
  };

  /* الأمان وتسجيل الدخول */
  T.security = () => {
    const p = policy();
    const sel = (k, opts) => `<select class="input" data-sec="${k}">${opts.map(([v, l]) => `<option value="${v}" ${String(p[k]) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const ev = DB.s.audit.filter((a) => a.entity === 'auth').slice().reverse();
    const tone = (a) => (/فاشلة|قفل الحساب|إيقاف|إعادة تعيين/.test(a) ? 'red' : /دخول|قبول|تفعيل|إنشاء حساب/.test(a) ? 'ok' : 'gray');
    return `<div class="ap-grid">
      <section class="card"><div class="card-h"><span class="ap-ico">${icon('shield')}</span><div class="grow"><h3>سياسة الدخول</h3><div class="sub">تنطبق على كل أعضاء الفريق</div></div></div>
        <div class="card-b sec-rows">
          <div class="sec-row"><span class="grow"><b>قفل الشاشة تلقائيًا بعد الخمول</b><span class="muted small">يطلب كلمة المرور للعودة</span></span>${sel('idleMinutes', [[0, 'معطّل'], [5, '5 دقائق'], [10, '10 دقائق'], [15, '15 دقيقة'], [30, '30 دقيقة'], [60, 'ساعة']])}</div>
          <div class="sec-row"><span class="grow"><b>المحاولات الخاطئة قبل القفل</b><span class="muted small">يُقفل الحساب مؤقتًا بعدها</span></span>${sel('maxAttempts', [[3, '3 محاولات'], [5, '5 محاولات'], [10, '10 محاولات']])}</div>
          <div class="sec-row"><span class="grow"><b>مدة القفل المؤقت</b></span>${sel('lockMinutes', [[5, '5 دقائق'], [15, '15 دقيقة'], [30, '30 دقيقة'], [60, 'ساعة']])}</div>
          <div class="sec-row"><span class="grow"><b>مدة "تذكرني على هذا الجهاز"</b></span>${sel('sessionDays', [[1, 'يوم واحد'], [7, '7 أيام'], [30, '30 يومًا'], [90, '90 يومًا']])}</div>
          <label class="sec-row"><span class="grow"><b>كلمات مرور قوية إلزاميًا</b><span class="muted small">8 أحرف على الأقل بحروف وأرقام ورمز</span></span>${UI.sw('', p.strongPasswords, 'data-sec="strongPasswords"')}</label>
        </div></section>
      <section class="card"><div class="card-h"><span class="ap-ico" style="background:var(--danger-soft);color:var(--danger)">${icon('alert')}</span><div class="grow"><h3>إجراءات طارئة</h3><div class="sub">عند فقد جهاز أو الشك في تسريب كلمة مرور</div></div></div>
        <div class="card-b"><p class="small muted" style="margin-top:0">تسجيل خروج كل الأعضاء من كل الأجهزة فورًا — يحتاج كل عضو لتسجيل الدخول من جديد. جلستك الحالية تبقى.</p>
        <button class="btn danger" data-act="sec-revoke-all">${icon('external')} تسجيل خروج الجميع</button></div></section>
    </div>
    <section class="card mt-16"><div class="card-h"><h3>${icon('history')} نشاط الدخول</h3><span class="sub">كل محاولات الدخول وتغييرات الحسابات</span></div>
      <div class="login-log">${ev.length ? ev.slice(0, 60).map((a) => `<div class="ll-row"><span class="ll-dot ${tone(a.action)}"></span><span class="grow"><b>${esc(a.action)}</b><span class="muted small">${esc(a.user)}${a.details ? ' · ' + esc(a.details) : ''}</span></span><span class="muted small num">${U.dateTime(a.at)}</span></div>`).join('') : `<div class="card-b">${UI.empty('لا يوجد نشاط بعد', '', 'history')}</div>`}</div></section>`;
  };
  M.security = (el) => el.addEventListener('change', (e) => {
    const k = e.target.dataset.sec;
    if (!k) return;
    const v = e.target.type === 'checkbox' ? e.target.checked : +e.target.value;
    teamSave(() => { DB.s.settings.security = Object.assign(policy(), { [k]: v }); DB.audit('تعديل سياسة الأمان', 'auth', null, `${k} = ${v}`); }, 'تم تحديث سياسة الأمان');
  });
  UI.acts['sec-revoke-all'] = () => UI.confirm({ title: 'تسجيل خروج الجميع', message: 'سيتم إنهاء كل الجلسات المفتوحة لكل الأعضاء ما عدا جلستك.', ok: 'تسجيل خروج الجميع', danger: true }).then((ok) => ok && teamSave(() => { DB.s.users.forEach((u) => Auth.revokeSessions(u, true)); DB.audit('تسجيل خروج كل الأعضاء', 'auth', null, ''); }, 'تم إنهاء كل الجلسات الأخرى'));

  /* الاشتراك والخطة */
  T.subscription = () => {
    const sub = DB.s.settings.subscription || {}, cur = Auth.PLANS[sub.plan] || Auth.PLANS.pro, used = seatsUsed();
    const cyc = Auth.PLANS[sub.plan] && cur.prices[sub.cycle] != null ? sub.cycle : 'monthly';
    const left = Math.max(0, U.daysBetween(U.today(), sub.trialEnds || U.today()));
    const cycLabel = { monthly: 'شهري', yearly: 'سنوي', lifetime: 'مدى الحياة' }[cyc];
    const status = sub.status === 'trial' ? `متبقٍ <b>${left}</b> يوم على انتهاء التجربة (${U.date(sub.trialEnds)})`
      : cyc === 'lifetime' ? `ترخيص دائم — الاستضافة والدعم حتى ${U.date(sub.renews || U.today())}` : `يتجدد تلقائيًا في ${U.date(sub.renews || U.today())}`;
    return `<section class="card sub-hero"><div class="grow"><span class="ap-badge">${icon('sparkle')} ${sub.status === 'trial' ? 'تجربة مجانية' : 'اشتراك نشط'}</span>
        <h2>خطة ${esc(cur.label)}</h2><p class="muted">${status} · الدفع ${cycLabel}</p>
        ${sub.promo && U.today() < sub.promo.until ? `<div class="co-promo mt-8">${icon('sparkle')}<span>خصم عرض الإطلاق ${sub.promo.pct}% مثبّت لمصنعك حتى <b>${U.date(sub.promo.until)}</b></span></div>` : ''}
        ${sub.status === 'trial' ? `<div class="meter mt-12" style="max-width:340px"><i style="width:${Math.min(100, ((14 - left) / 14) * 100)}%"></i></div>` : ''}</div>
      <div class="sub-side">${Auth.priceHTML(cur, cyc, sub)}<div class="muted small mt-8">${used} من ${cur.seats || '∞'} مستخدمين</div>
        ${sub.status === 'trial' ? `<button class="btn primary mt-12" data-act="sub-activate">${icon('check')} تفعيل الاشتراك</button>` : ''}</div></section>
    <div class="row between wrap mt-16 mb-12"><h3 style="font-size:16px">مقارنة الخطط</h3>${Auth.cycleSwitch(cyc, 'sub-cycle')}</div>
    <div class="pr-grid">${Object.keys(Auth.PLANS).map((k) => { const p = Auth.PLANS[k], up = p.prices.monthly > cur.prices.monthly;
      return Auth.planCard(k, cyc, k === sub.plan ? `<button class="btn" disabled>${icon('check')} خطتك الحالية</button>` : `<button class="btn ${up ? 'primary' : ''}" data-act="sub-plan" data-v="${k}">${up ? 'الترقية' : 'التحويل'} إلى ${p.label}</button>`, { cls: k === sub.plan ? 'cur' : '', sub }); }).join('')}</div>
    ${(sub.payments || []).length ? `<section class="card mt-16"><div class="card-h"><h3>${icon('receipt')} المدفوعات والإيصالات</h3></div><div class="login-log">${sub.payments.slice().reverse().map((x) => `<div class="ll-row"><span class="ll-dot ok"></span><span class="grow"><b>${Auth.PLANS[x.plan].label} · ${{ monthly: 'شهري', yearly: 'سنوي', lifetime: 'مدى الحياة' }[x.cycle]}</b><span class="muted small"><span class="mono">${x.no}</span> · ${U.dateTime(x.at)}</span></span><b class="num">${x.promo ? `<s class="muted small">${U.money(x.base)}</s> ` : ''}${U.money(x.amount)} ج.م</b></div>`).join('')}</div></section>` : ''}
    <p class="small muted mt-16">${icon('info')} نسخة تجريبية: الدفع هنا للمعاينة ولا يُخصم أي مبلغ — تُربط بوابة الدفع (بطاقات، محافظ، فوري، إنستاباي) في النسخة الفعلية.</p>`;
  };
  UI.acts['sub-plan'] = (el) => {
    const k = el.dataset.v, p = Auth.PLANS[k], sub = DB.s.settings.subscription;
    if (p.seats && seatsUsed() > p.seats) return UI.toast(`فريقك ${seatsUsed()} أعضاء وخطة ${p.label} تسمح بـ ${p.seats} — أوقف بعض الحسابات أولًا`, 'danger');
    const cyc = p.prices[sub.cycle] != null ? sub.cycle : 'monthly';
    if (sub.status === 'active') return payFor(k, cyc, `تم التحويل إلى خطة ${p.label}`);
    UI.confirm({ title: `التحويل إلى خطة ${p.label}`, message: `يبدأ تطبيق الخطة الجديدة فورًا بسعر ${U.int(Auth.quote(k, cyc, sub).amount)} ج.م ${{ monthly: 'شهريًا', yearly: 'سنويًا', lifetime: 'مرة واحدة' }[cyc]}.`, ok: 'تأكيد التحويل' }).then((ok) => ok && teamSave(() => { sub.plan = k; sub.cycle = cyc; DB.audit('تغيير خطة الاشتراك', 'auth', null, p.label); }, 'تم تغيير الخطة'));
  };
  UI.acts['sub-cycle'] = (el) => { const sub = DB.s.settings.subscription; if (Auth.PLANS[sub.plan].prices[el.dataset.v] == null) return UI.toast('خطة المؤسسات بترخيص مخصص — تواصل معنا للشراء الدائم', 'warning'); teamSave(() => { sub.cycle = el.dataset.v; }, 'تم تغيير دورة الدفع'); };
  const payFor = (plan, cycle, msg) => Auth.openCheckout({ plan, cycle }, (pay) => teamSave(() => { Auth.applyPayment(DB.s.settings.subscription, pay); DB.audit('دفع اشتراك', 'auth', null, `${Auth.PLANS[pay.plan].label} · ${pay.no} · ${U.money(pay.amount)}`); }, msg));
  UI.acts['sub-activate'] = () => { const sub = DB.s.settings.subscription; payFor(sub.plan, Auth.PLANS[sub.plan].prices[sub.cycle] != null ? sub.cycle : 'monthly', 'تم تفعيل الاشتراك'); };

  /* سجل التغييرات */
  T.audit = () => {
    const rows = DB.s.audit.slice().reverse();
    return `<div class="card"><div class="card-h"><h3>سجل التغييرات</h3><span class="sub">من أنشأ أو عدّل أو اعتمد أو ألغى — ومتى</span></div>
      ${UI.table({ id: 'audit', rows, csv: 'audit-log', pageSize: 100, cols: [
        { k: 'at', label: 'الوقت', v: (a) => a.at, html: (a) => `<span class="small">${U.dateTime(a.at)}</span>` },
        { k: 'u', label: 'المستخدم', v: (a) => a.user },
        { k: 'a', label: 'الإجراء', v: (a) => a.action, html: (a) => `<span class="pill ${a.action === 'إلغاء' ? 'void' : a.action === 'اعتماد' ? 'posted' : a.action.includes('حذف') ? 'danger' : 'plain'}">${esc(a.action)}</span>` },
        { k: 'e', label: 'الكيان', v: (a) => (E.TYPES[a.entity] ? E.TYPES[a.entity].label : a.entity) },
        { k: 'd', label: 'التفاصيل', v: (a) => a.details, html: (a) => (E.TYPES[a.entity] && a.entityId && DB.get('docs', a.entityId) ? `<a href="#/doc/${a.entityId}">${esc(a.details)}</a>` : esc(a.details)), cls: 'wrap' },
      ] })}</div>`;
  };

  /* النسخ الاحتياطي */
  T.backup = () => `<div class="grid g2" style="align-items:start">
    <div class="card"><div class="card-h"><h3>${icon('download')} تصدير نسخة احتياطية</h3></div><div class="card-b"><p class="small text-2" style="margin-top:0">ملف واحد يحتوي كل البيانات: المستندات، الحركات، الأطراف، الأصناف، الإعدادات وسجل التغييرات.</p><div class="info-list" style="margin:0 -16px 12px"><div class="i-row"><span>حجم البيانات</span><b>${DB.sizeKB()} KB</b></div><div class="i-row"><span>المستندات</span><b>${U.int(DB.s.docs.length)}</b></div><div class="i-row"><span>الحركات</span><b>${U.int(DB.s.stock.length + DB.s.ledger.length + DB.s.cash.length + DB.s.custody.length)}</b></div></div><button class="btn primary" data-act="bk-export">${icon('download')} تنزيل النسخة</button></div></div>
    <div class="card"><div class="card-h"><h3>${icon('upload')} استعادة نسخة</h3></div><div class="card-b"><p class="small text-2" style="margin-top:0">استعادة ملف نسخة احتياطية تستبدل كل البيانات الحالية.</p><label class="drop-zone" style="display:block">${icon('upload')}<div>اختر ملف النسخة (.json)</div><input type="file" accept=".json,application/json" id="bk-file" hidden></label></div></div>
    <div class="card span-all"><div class="card-h"><h3>${icon('zap')} البيانات التجريبية</h3></div><div class="card-b row wrap"><p class="small text-2 grow" style="margin:0">إعادة تحميل بيانات المصنع التجريبية (2024 حتى اليوم) — مفيد بعد التجارب. يمسح كل البيانات الحالية.</p><button class="btn danger" data-act="bk-reset">${icon('history')} إعادة تحميل البيانات التجريبية</button></div></div>
  </div>`;
  M.backup = (el) => el.querySelector('#bk-file').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!E.can('settings')) return UI.toast('تحتاج صلاحية الإعدادات', 'danger');
    if (!(await UI.confirm({ title: 'استعادة نسخة احتياطية', message: 'سيتم استبدال كل البيانات الحالية بمحتوى الملف. هل أنت متأكد؟', danger: true, ok: 'استعادة' }))) return;
    const text = await f.text();
    try { DB.importJSON(text); UI.toast('تمت الاستعادة بنجاح', 'success'); App.renderChrome(); location.hash = '#/'; } catch (err) { UI.toast(err.message, 'danger'); }
  });
  UI.acts['bk-export'] = () => { U.download(`knit-erp-backup-${U.today()}.json`, DB.exportJSON(), 'application/json'); DB.audit('تصدير نسخة احتياطية', 'system', null, ''); DB.save(); };
  UI.acts['bk-reset'] = async () => {
    if (!E.can('settings')) return UI.toast('تحتاج صلاحية الإعدادات', 'danger');
    if (!(await UI.confirm({ title: 'إعادة تحميل البيانات التجريبية', message: 'سيتم مسح كل البيانات الحالية واستبدالها بالبيانات التجريبية.', danger: true, ok: 'مسح وإعادة التحميل' }))) return;
    // الفريق وحساباتهم والأدوار والاشتراك تبقى كما هي — تُستبدل بيانات العمل فقط
    const keep = { users: DB.s.users, roles: DB.s.roles, me: DB.s.currentUserId, security: DB.s.settings.security, subscription: DB.s.settings.subscription };
    Seed.run();
    Object.assign(DB.s, { users: keep.users, roles: keep.roles, currentUserId: keep.me });
    Object.assign(DB.s.settings, { security: keep.security, subscription: keep.subscription });
    DB._idx = {}; DB.audit('إعادة تحميل البيانات التجريبية', 'system', null, ''); DB.save();
    App.dirty = false; location.hash = '#/'; location.reload();
  };
})();
