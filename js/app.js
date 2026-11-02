/* التطبيق: الهيكل، التنقل، مصادر البحث، الاختصارات العامة، التشغيل */
(function () {
  const esc = U.esc;
  window.Pages = window.Pages || {};

  // شجرة القائمة الجانبية: أقسام ← فئات قابلة للفتح ← صفحات
  const TREE = [
    { group: 'نظرة عامة', items: [
      { r: '', label: 'لوحة التحكم', ic: 'home', k: 'alt+1' },
      { r: 'reports', label: 'التقارير', ic: 'chart', k: 'alt+9' },
    ] },
    { group: 'التجارة', items: [
      { label: 'المبيعات', ic: 'receipt', children: [
        { r: 'sales', label: 'فواتير المبيعات', ic: 'receipt', k: 'alt+2' },
        { r: 'sales-returns', label: 'مرتجعات المبيعات', ic: 'undo' },
        { r: 'customers', label: 'العملاء', ic: 'users' },
        { r: 'receipts', label: 'التحصيلات', ic: 'in' },
      ] },
      { r: 'einvoice', label: 'الفاتورة الإلكترونية', ic: 'globe' },
      { label: 'المشتريات', ic: 'cart', children: [
        { r: 'purchases', label: 'فواتير المشتريات', ic: 'cart', k: 'alt+3' },
        { r: 'purchase-returns', label: 'مرتجعات المشتريات', ic: 'undo' },
        { r: 'suppliers', label: 'الموردون', ic: 'truck' },
        { r: 'payments', label: 'سندات الصرف', ic: 'out' },
      ] },
    ] },
    { group: 'المالية', items: [
      { r: 'accounts', label: 'الخزائن والبنوك', ic: 'bank', k: 'alt+4' },
      { r: 'expenses', label: 'المصروفات', ic: 'wallet' },
      { r: 'incomes', label: 'الإيرادات الأخرى', ic: 'coins' },
      { r: 'transfers', label: 'التحويلات', ic: 'swap' },
    ] },
    { group: 'الإنتاج والمخزون', items: [
      { label: 'المخزون', ic: 'boxes', children: [
        { r: 'items', label: 'الأصناف والتكويد', ic: 'tag', k: 'alt+5' },
        { r: 'stock', label: 'أرصدة المخازن', ic: 'boxes' },
        { r: 'consumption', label: 'صرف استهلاك داخلي', ic: 'out' },
        { r: 'internal-prod', label: 'إنتاج داخلي', ic: 'box' },
        { r: 'stocktakes', label: 'الجرد والتسويات', ic: 'clipboard' },
        { r: 'stock-transfers', label: 'تحويلات مخزنية', ic: 'swap' },
      ] },
      { label: 'المصنعية الخارجية', ic: 'factory', children: [
        { r: 'workshops', label: 'الورش والمصانع', ic: 'factory', k: 'alt+6' },
        { r: 'orders', label: 'أوامر التشغيل', ic: 'layers' },
        { r: 'issues', label: 'صرف ومرتجع الخامات', ic: 'yarn' },
        { r: 'receipts-prod', label: 'استلام الإنتاج', ic: 'box' },
        { r: 'reconcile', label: 'مطابقة الخامات', ic: 'scale' },
        { r: 'rates', label: 'أسعار المصنعية', ic: 'clock' },
      ] },
      { label: 'العمالة الداخلية', ic: 'user', children: [
        { r: 'workers', label: 'العمال', ic: 'user', k: 'alt+7' },
        { r: 'worklogs', label: 'يوميات الإنتاج', ic: 'calendar' },
        { r: 'payroll', label: 'مسيرات الأجور', ic: 'users' },
      ] },
      { label: 'الموديلات والرسم', ic: 'shirt', children: [
        { r: 'models', label: 'الموديلات', ic: 'shirt', k: 'alt+8' },
        { r: 'design-jobs', label: 'مهام الرسم والبرمجة', ic: 'pen' },
        { r: 'designers', label: 'الرسامون والمبرمجون', ic: 'users' },
      ] },
    ] },
    { group: 'النظام', items: [
      { r: 'opening', label: 'الأرصدة الافتتاحية', ic: 'flag' },
      { r: 'import', label: 'استيراد وتصدير Excel', ic: 'upload' },
      { r: 'settings', label: 'الإعدادات', ic: 'cog', k: 'alt+0' },
    ] },
  ];
  // نفس الصفحات كقائمة مسطحة (للاختصارات ولوحة الأوامر وأيقونة عنوان الصفحة)
  const NAV = TREE.map((s) => ({ group: s.group, items: s.items.flatMap((i) => (i.children ? i.children.map((c) => Object.assign({ parent: i.label }, c)) : [i])) }));

  const App = {
    NAV, TREE, dirty: false, current: null,
    period: null,
    go(h) { location.hash = h; },
    refresh() { render(true); },
    setDirty(v) { App.dirty = v; },
  };
  window.App = App;

  /* ───────── مصادر البحث في الحقول ───────── */
  const S = UI.sources;
  const nextCode = (prefix, list) => {
    let max = 0;
    for (const x of list) { const m = String(x.code || '').match(/(\d+)$/); if (m && String(x.code).startsWith(prefix)) max = Math.max(max, +m[1]); }
    return prefix + U.pad(max + 1, 3);
  };
  App.nextCode = nextCode;
  S.parties = (q, arg) => {
    const types = arg ? arg.split(',') : null;
    return DB.s.parties.filter((p) => p.active !== false && (!types || p.types.some((t) => types.includes(t))) && U.match(p.name + ' ' + p.code + ' ' + (p.phone || ''), q))
      .map((p) => ({ id: p.id, label: p.name, code: p.code, sub: p.types.map((t) => E.PARTY_TYPES[t]).join('، ') + (p.phone ? ' · ' + p.phone : ''), hint: UI.bal(E.balance('party', p.id)) }));
  };
  S.parties.label = (id) => E.nameOf('parties', id);
  S.parties.create = (name, arg, done) => App.quickParty(name, (arg || 'customer').split(',')[0], done);
  S.workers = (q) => DB.s.workers.filter((w) => w.active !== false && U.match(w.name + ' ' + w.code, q)).map((w) => ({ id: w.id, label: w.name, code: w.code, sub: E.nameOf('departments', w.deptId) + ' · ' + E.PAY_TYPES[w.payType], hint: UI.bal(E.balance('worker', w.id), 'worker') }));
  S.workers.label = (id) => E.nameOf('workers', id);
  S.items = (q, arg) => {
    const [mode, val] = String(arg || '').split(':');
    return DB.s.items.filter((i) => i.active !== false && (mode !== 'kind' || val.split('|').includes(i.kind)) && U.match(i.name + ' ' + i.code, q))
      .map((i) => { const oh = E.onHand(i.id, mode === 'wh' ? +val : null); return { id: i.id, label: i.name, code: i.code, sub: E.nameOf('itemCats', i.catId) + ' · ' + i.unit, hint: `<span class="${oh <= 0 ? 'neg' : ''}">${U.qty(oh)}</span>` }; });
  };
  S.items.label = (id) => { const i = DB.get('items', id); return i ? i.name : ''; };
  S.items.create = (name, arg, done) => App.quickItem(name, done);
  S.models = (q) => DB.s.models.filter((m) => U.match(m.name + ' ' + m.code, q)).map((m) => ({ id: m.id, label: m.name, code: m.code, sub: E.nameOf('modelCats', m.catId) }));
  S.models.label = (id) => { const m = DB.get('models', id); return m ? m.code + ' — ' + m.name : ''; };
  S.orders = (q, arg) => DB.s.orders.filter((o) => o.status === 'open' && (!arg || o.partyId === +arg) && U.match(o.no + ' ' + E.nameOf('models', o.modelId) + ' ' + E.nameOf('parties', o.partyId), q))
    .map((o) => { const sm = E.orderSummary(o.id); return { id: o.id, label: o.no + ' — ' + E.nameOf('models', o.modelId), sub: E.nameOf('parties', o.partyId) + ' · ' + E.RULES[o.rule], hint: `${U.int(sm.qtyGood)}/${U.int(o.targetQty)}` }; });
  S.orders.label = (id) => { const o = DB.get('orders', id); return o ? o.no + ' — ' + E.nameOf('models', o.modelId) : ''; };
  S.accounts = (q) => DB.s.accounts.filter((a) => a.active !== false && U.match(a.name, q)).map((a) => ({ id: a.id, label: a.name, sub: { cash: 'خزينة نقدية', bank: 'حساب بنكي', wallet: 'محفظة' }[a.type], hint: UI.money(E.cashBalance(a.id)) }));
  S.accounts.label = (id) => E.nameOf('accounts', id);
  const catSource = (coll) => {
    const f = (q) => DB.s[coll].filter((c) => c.active !== false && U.match(c.name, q)).map((c) => ({ id: c.id, label: c.name }));
    f.label = (id) => E.nameOf(coll, id);
    f.create = (name, arg, done) => { const c = UI.run(() => DB.tx(() => { const x = DB.add(coll, { name, active: true }); DB.audit('إضافة فئة', coll, x.id, name); return x; }), 'تمت إضافة "' + name + '"'); if (c) done(c.id); };
    return f;
  };
  S.expenseCats = catSource('expenseCats');
  S.incomeCats = catSource('incomeCats');
  S.invoices = (q, arg) => DB.s.docs.filter((d) => d.type === 'SI' && d.status === 'posted' && (!arg || d.sid === +arg) && U.match(d.no + ' ' + U.date(d.date), q)).reverse()
    .map((d) => ({ id: d.id, label: d.no, sub: U.date(d.date) + ' · ' + d.lines.length + ' بند', hint: UI.money(d.totals.total) }));
  S.invoices.label = (id) => { const d = DB.get('docs', id); return d ? d.no : ''; };

  /* إضافة سريعة من داخل الحقول */
  App.quickParty = (name, type, done) => {
    UI.modal({
      title: 'إضافة ' + E.PARTY_TYPES[type] + ' سريعًا', size: 'sm',
      body: `<div class="grid">${UI.field('الاسم', UI.inp('name', name), { req: true })}${UI.field('الهاتف', UI.inp('phone', ''))}${UI.field('العنوان', UI.inp('address', ''))}</div>`,
      actions: [{ label: 'حفظ', cls: 'primary', primary: true, act: (m) => {
        const v = UI.readForm(m.el);
        if (!v.name.trim()) return UI.toast('الاسم مطلوب', 'danger');
        const prefix = { customer: 'C-', supplier: 'S-', workshop: 'WS-', designer: 'D-' }[type];
        const p = UI.run(() => DB.tx(() => { const x = DB.add('parties', { code: nextCode(prefix, DB.s.parties), name: v.name.trim(), types: [type], phone: v.phone, address: v.address, active: true, notes: '', startDate: U.today() }); DB.audit('إضافة طرف', 'party', x.id, x.name); return x; }), 'تمت الإضافة');
        if (p) { m.close(); done(p.id); }
      } }, { label: 'تراجع' }],
    });
  };
  App.quickItem = (name, done) => {
    UI.modal({
      title: 'إضافة صنف سريعًا', size: 'sm',
      body: `<div class="grid g2">${UI.field('الاسم', UI.inp('name', name), { req: true, cls: 'span-2' })}${UI.field('الفئة', UI.sel('catId', UI.opts('itemCats'), DB.s.itemCats[0] && DB.s.itemCats[0].id))}${UI.field('الوحدة', UI.sel('unit', DB.s.units.map((u) => [u.name, u.name]), 'قطعة'))}${UI.field('النوع', UI.sel('kind', Object.entries(Pages.ITEM_KINDS || {}), 'consumable'))}${UI.field('سعر البيع', UI.inp('salePrice', 0, { num: true }))}</div>`,
      actions: [{ label: 'حفظ', cls: 'primary', primary: true, act: (m) => {
        const v = UI.readForm(m.el);
        if (!v.name.trim()) return UI.toast('الاسم مطلوب', 'danger');
        const cat = DB.get('itemCats', +v.catId);
        const it = UI.run(() => DB.tx(() => { const x = DB.add('items', { code: nextCode((cat ? cat.prefix || 'IT' : 'IT') + '-', DB.s.items), name: v.name.trim(), catId: +v.catId, unit: v.unit, kind: v.kind, salePrice: v.salePrice, lastCost: 0, reorder: 0, active: true, altUnit: '', altFactor: 0 }); DB.audit('إضافة صنف', 'item', x.id, x.name); return x; }), 'تمت إضافة الصنف');
        if (it) { m.close(); done(it.id); }
      } }, { label: 'تراجع' }],
    });
  };

  /* ───────── الهيكل ───────── */
  function shell() {
    const c = DB.s.settings.company || {};
    document.body.insertAdjacentHTML('afterbegin', `
    <div class="app ${localStorage.getItem('knit-sidebar') === '0' ? 'collapsed' : ''}" id="app">
      <aside class="sidebar">
        <div class="brand"><img id="brand-logo" src="${c.logo || ''}" alt=""><div class="b-text"><div class="b-name" id="brand-name">${esc(c.name || 'المصنع')}</div><div class="b-sub">نظام إدارة المصنع المتكامل</div></div><button class="btn ghost icon sm b-toggle" data-act="nav-toggle" aria-label="طي/فتح القائمة">${icon('sidebar')}</button></div>
        <button class="side-search" data-act="palette" title="البحث الشامل (${UI.MOD}+K)">${icon('search')}<span class="ss-text">بحث…</span>${UI.k('mod+k')}</button>
        <nav class="nav" id="nav"></nav>
        <div class="side-foot">
          <div class="side-promo"><span class="sp-ico">${icon('keyboard')}</span><b>اشتغل أسرع بالكيبورد</b><p>كل شاشة وكل عملية لها اختصار — ابدأ بالبحث الشامل</p><button class="btn sm" data-act="help">عرض الاختصارات</button></div>
          <button class="side-user" data-act="user-menu" id="user-btn"></button>
        </div>
      </aside>
      <div class="nav-backdrop" data-act="nav-close"></div>
      <div class="main">
        <header class="topbar">
          <button class="btn ghost icon tb-menu" data-act="nav-toggle" title="القائمة الجانبية (${UI.MOD}+B)">${icon('sidebar')}</button>
          <div class="crumb-bar" id="crumbs"></div>
          <span class="grow"></span>
          <button class="btn ghost icon only-sm" data-act="palette" title="البحث">${icon('search')}</button>
          <button class="btn ghost lang-btn" data-act="lang" data-no-tr title="${I18N.en ? 'التبديل إلى العربية' : 'Switch to English'}">${I18N.en ? 'عربي' : 'EN'}</button>
          <button class="btn ghost icon" data-act="theme" title="الوضع الليلي (Alt+T)">${icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')}</button>
          <button class="btn ghost icon hide-sm" data-act="help" title="اختصارات لوحة المفاتيح (?)">${icon('keyboard')}</button>
          <button class="btn dark tb-new" data-act="quick-new">${icon('plus')}<span>جديد</span>${icon('chevDown')}</button>
        </header>
        <main class="content" id="view" tabindex="-1"></main>
      </div>
      <nav class="tabbar">
        <a href="#/" data-tabs="">${icon('home')}<span>الرئيسية</span></a>
        <a href="#/sales" data-tabs="sales,sales-returns,customers,receipts">${icon('receipt')}<span>المبيعات</span></a>
        <button class="tb-fab" data-act="quick-new" title="جديد">${icon('plus')}</button>
        <a href="#/reports" data-tabs="reports">${icon('chart')}<span>التقارير</span></a>
        <button data-act="nav-toggle">${icon('menu')}<span>القائمة</span></button>
      </nav>
    </div>`);
    renderNav();
    renderUser();
  }
  // الصلاحية المطلوبة لفتح كل صفحة (العرض فقط؛ الإنشاء والاعتماد يتحقق منهما المحرك نفسه)
  const V = (m, routes) => Object.fromEntries(routes.map((r) => [r, m]));
  const ROUTE_PERM = Object.assign({ '': 'view', reports: 'reports', opening: 'opening' },
    V('view_sales', ['sales', 'sales-returns', 'customers', 'einvoice']), V('view_purchases', ['purchases', 'purchase-returns', 'suppliers']),
    V('view_finance', ['receipts', 'payments', 'accounts', 'expenses', 'incomes', 'transfers']),
    V('view_stock', ['items', 'stock', 'consumption', 'internal-prod', 'stocktakes', 'stock-transfers']),
    V('view_outwork', ['workshops', 'orders', 'issues', 'receipts-prod', 'reconcile', 'rates']),
    V('view_workers', ['workers', 'worklogs', 'payroll']), V('view_models', ['models', 'design-jobs', 'designers']));
  App.ROUTE_PERM = ROUTE_PERM;
  App.canRoute = (r) => !ROUTE_PERM[r] || E.can(ROUTE_PERM[r]);
  // قفل الخطة منفصل عن صلاحيات الدور: ما لا يسمح به الدور يختفي، وما لا تشمله الخطة يظهر بقفل وزر ترقية
  const REPORT_MOD = { outwork: 'outwork', materials: 'outwork', labor: 'workers', design: 'models' };
  const TYPE_MOD = (t) => ({ outwork: 'outwork', workers: 'workers', models: 'models' })[(E.TYPES[t] || {}).perm] || null;
  App.routeModule = (r) => { const pm = ROUTE_PERM[r]; return pm && pm.startsWith('view_') ? pm.slice(5) : null; };
  App.routeLocked = (r) => { const m = App.routeModule(r); return !!m && !Auth.planHas(m); };
  App.typeLocked = (t) => { const m = TYPE_MOD(t); return !!m && !Auth.planHas(m); };
  App.reportLocked = (k) => !!REPORT_MOD[k] && !Auth.planHas(REPORT_MOD[k]);
  App.REPORT_MOD = REPORT_MOD;
  // الفئات المفتوحة في القائمة الجانبية تُحفظ بين الجلسات
  const navOpen = new Set((() => { try { return JSON.parse(localStorage.getItem('knit-nav-open')) || []; } catch (e) { return []; } })());
  const saveNavOpen = () => { try { localStorage.setItem('knit-nav-open', JSON.stringify([...navOpen])); } catch (e) { /* التخزين غير متاح */ } };
  const keyHint = (k) => (k ? `<span class="k">${k.replace('alt', U.isMac ? '⌥' : 'Alt').replace('+', '')}</span>` : '');
  function renderNav() {
    const ok = (it) => (it.children ? it.children.some((c) => App.canRoute(c.r)) : App.canRoute(it.r));
    const tree = TREE.map((g) => ({ group: g.group, items: g.items.filter(ok).map((it) => (it.children ? Object.assign({}, it, { children: it.children.filter((c) => App.canRoute(c.r)) }) : it)) })).filter((g) => g.items.length);
    document.querySelectorAll('.tabbar a').forEach((a) => { a.hidden = !App.canRoute(a.dataset.tabs.split(',')[0]); });
    const canCreate = App.NEW.some((n) => n.t && E.can(E.TYPES[n.t].perm)) || E.can('stock') || E.can('sales') || E.can('outwork');
    document.querySelectorAll('[data-act="quick-new"]').forEach((b) => { b.hidden = !canCreate; });
    document.getElementById('nav').innerHTML = tree.map((g) => `<div class="nav-sec"><div class="nav-label">${g.group}</div>${g.items.map((it) => it.children
      ? (it.children.every((c) => App.routeLocked(c.r)) ? `<button type="button" class="nav-i nav-locked" data-act="upsell" data-m="${App.routeModule(it.children[0].r)}" data-label="${it.label}">${icon(it.ic)}<span class="nl">${it.label}</span><span class="nav-lock">${icon('lock')}<b>${Auth.PLANS.pro.label}</b></span></button>`
      : `<div class="nav-par ${navOpen.has(it.label) ? 'open' : ''}" data-pid="${it.label}"><button type="button" class="nav-i nav-ph" data-act="nav-par" data-label="${it.label}">${icon(it.ic)}<span class="nl">${it.label}</span><span class="nav-chev">${icon('chevDown')}</span></button><div class="nav-sub"><div class="nav-sub-in">${it.children.map((c) => `<a href="#/${c.r}" data-r="${c.r}" data-label="${c.label}"><span class="nl">${c.label}</span>${keyHint(c.k)}</a>`).join('')}</div></div></div>`)
      : `<a class="nav-i" href="#/${it.r}" data-r="${it.r}" data-label="${it.label}">${icon(it.ic)}<span class="nl">${it.label}</span>${it.r === '' ? '<span class="cnt" title="مسودات غير معتمدة" hidden></span>' : ''}${keyHint(it.k)}</a>`).join('')}</div>`).join('');
    updateBadges();
  }
  function updateBadges() {
    const drafts = DB.s.docs.filter((d) => d.status === 'draft').length;
    const c = document.querySelector('#nav .cnt');
    if (c) { c.textContent = drafts; c.hidden = !drafts; }
  }
  function renderUser() {
    const u = E.user();
    document.getElementById('user-btn').innerHTML = `<span class="avatar">${UI.initials(u ? u.name : '?')}</span><span class="su-text"><b>${esc(u ? u.name : '')}</b><span>${u ? (E.roleOf(u.role) || {}).label || '' : ''}</span></span>${icon('chevDown')}`;
  }
  App.renderChrome = () => {
    renderNav(); renderUser();
    const c = DB.s.settings.company || {};
    document.getElementById('brand-logo').src = c.logo || '';
    document.getElementById('brand-name').textContent = c.name || '';
    setActiveNav();
  };
  function setActiveNav() {
    const r = App.current ? App.current.navKey : null;
    document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.r === r));
    // الفئة التي تحتوي الصفحة الحالية تُفتح تلقائيًا
    let sec = null, par = null, leaf = null;
    for (const g of TREE) for (const it of g.items) {
      if (it.children) { const c = it.children.find((x) => x.r === r); if (c) { sec = g; par = it; leaf = c; } } else if (it.r === r) { sec = g; leaf = it; }
    }
    document.querySelectorAll('#nav .nav-par').forEach((p) => {
      const mine = par && p.dataset.pid === par.label;
      p.classList.toggle('has-active', !!mine);
      if (mine && !p.classList.contains('open')) { p.classList.add('open'); navOpen.add(par.label); saveNavOpen(); }
    });
    const sep = icon('chevLeft');
    document.getElementById('crumbs').innerHTML = leaf ? `<span class="cb-sec">${sec.group}</span>${sep}${par ? `<span class="cb-par">${par.label}</span>${sep}` : ''}<b>${leaf.label}</b>` : '';
    document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('on', r != null && a.dataset.tabs.split(',').includes(r)));
  }
  UI.acts['nav-par'] = (el) => {
    const p = el.closest('.nav-par');
    const app = document.getElementById('app');
    // القائمة مطوية: الفئة تفتح كقائمة منبثقة بجوار الأيقونة
    if (app.classList.contains('collapsed') && !matchMedia('(max-width: 1024px)').matches) {
      const node = TREE.flatMap((g) => g.items).find((x) => x.label === p.dataset.pid);
      return UI.menu(el, [{ header: true, label: node.label }].concat(node.children.map((c) => ({ label: c.label, icon: c.ic, act: () => (location.hash = '#/' + c.r) }))), { minWidth: 220 });
    }
    p.classList.toggle('open');
    if (p.classList.contains('open')) navOpen.add(p.dataset.pid); else navOpen.delete(p.dataset.pid);
    saveNavOpen();
  };

  /* ───────── التوجيه ───────── */
  function parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    const query = Object.fromEntries(new URLSearchParams(qs || ''));
    return { parts, query, hash: location.hash || '#/' };
  }
  function resolve(parts) {
    const [a, b, c] = parts;
    if (!a) return { page: 'dashboard', params: {}, navKey: '' };
    if (a === 'new') return { page: 'editor', params: { type: b }, navKey: (E.TYPES[b] || {}).route };
    if (a === 'doc') { const d = DB.get('docs', +b); return { page: 'doc', params: { id: +b }, navKey: d ? E.TYPES[d.type].route : null }; }
    if (a === 'party') { const p = DB.get('parties', +b); const t = p && p.types[0]; return { page: 'party', params: { id: +b, tab: c }, navKey: t ? { customer: 'customers', supplier: 'suppliers', workshop: 'workshops', designer: 'designers' }[t] : null }; }
    if (a === 'item') return { page: 'item', params: { id: +b }, navKey: 'items' };
    if (a === 'account') return { page: 'account', params: { id: +b }, navKey: 'accounts' };
    if (a === 'order') return { page: 'order', params: { id: +b }, navKey: 'orders' };
    if (a === 'worker') return { page: 'worker', params: { id: +b }, navKey: 'workers' };
    if (a === 'model') return { page: 'model', params: { id: +b }, navKey: 'models' };
    if (a === 'report') return { page: 'report', params: { key: b }, navKey: 'reports' };
    if (a === 'settings') return { page: 'settings', params: { tab: b || (E.can('settings') ? 'company' : 'profile') }, navKey: 'settings' };
    if (['customers', 'suppliers', 'workshops', 'designers'].includes(a)) return { page: 'parties', params: { kind: a }, navKey: a };
    if (Pages.DOC_LISTS && Pages.DOC_LISTS[a]) return { page: 'doclist', params: { list: a }, navKey: a };
    if (Pages[a]) return { page: a, params: {}, navKey: a };
    return { page: 'notfound', params: {}, navKey: null };
  }
  let lastHash = null;
  function render(keepScroll) {
    const { parts, query, hash } = parse();
    const r = resolve(parts);
    Auth.check();
    const needPerm = r.page === 'editor' ? (E.TYPES[r.params.type] || {}).perm : ROUTE_PERM[r.navKey];
    if (needPerm && !E.can(needPerm)) { r.denied = needPerm; r.page = 'denied'; }
    else if (App.routeLocked(r.navKey) || (r.page === 'editor' && App.typeLocked(r.params.type)) || (r.page === 'report' && App.reportLocked(r.params.key))) {
      r.upsell = r.page === 'report' ? REPORT_MOD[r.params.key] : r.page === 'editor' ? TYPE_MOD(r.params.type) : App.routeModule(r.navKey); r.page = 'upsell';
    }
    const page = Pages[r.page] || Pages.notfound;
    const view = document.getElementById('view');
    const sameRoute = lastHash === hash;
    const scroll = view.scrollTop;
    App.current = Object.assign({ hash, query }, r);
    UI.pageKeys = {};
    UI.closePop();
    // حركة دخول ناعمة عند الانتقال لصفحة جديدة فقط (وليس عند تحديث نفس الصفحة)
    const animate = !(keepScroll || sameRoute);
    clearTimeout(App._animT);
    view.classList.toggle('anim', animate);
    if (animate) App._animT = setTimeout(() => view.classList.remove('anim'), 1100);
    try {
      view.innerHTML = page.render(Object.assign({ perm: r.denied, mod: r.upsell }, r.params), query);
      const last = view.lastElementChild;
      if (last && last.classList.contains('card') && last.querySelector('.tbl-host')) last.classList.add('fill');
      page.mount && page.mount(view, r.params, query);
      // أيقونة القسم بجوار عنوان كل صفحة
      const h1 = view.querySelector('.page-h h1');
      const navItem = NAV.flatMap((g) => g.items).find((i) => i.r === r.navKey);
      if (h1 && !h1.querySelector('svg, .title-ico, .big-avatar') && !view.querySelector('.profile-h') && navItem) h1.insertAdjacentHTML('afterbegin', `<span class="title-ico">${icon(navItem.ic)}</span>`);
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="notice danger">${icon('alert')}<div><b>تعذر عرض الصفحة</b><div class="n-body small">${esc(e.message)}</div></div></div>`;
    }
    if (page.keys) Object.assign(UI.pageKeys, page.keys);
    document.getElementById('app').classList.remove('nav-open');
    setActiveNav();
    const t = view.querySelector('.page-h h1');
    document.title = (t ? t.textContent.trim() + ' — ' : '') + (DB.s.settings.company.name || 'ERP');
    if (keepScroll || sameRoute) view.scrollTop = scroll; else view.scrollTop = 0;
    lastHash = hash;
    updateBadges();
  }
  window.addEventListener('hashchange', () => {
    if (App.dirty && App._guardHash && location.hash !== App._guardHash) {
      const target = location.hash;
      history.replaceState(null, '', App._guardHash);
      UI.confirm({ title: 'تغييرات غير محفوظة', message: 'لديك تعديلات على هذا المستند لم تُحفظ. هل تريد المغادرة وتجاهلها؟', ok: 'مغادرة بدون حفظ', danger: true }).then((ok) => {
        if (ok) { App.dirty = false; location.hash = target; }
      });
      return;
    }
    App.dirty = false;
    render();
  });
  window.addEventListener('beforeunload', (e) => { if (App.dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ───────── أوامر عامة ───────── */
  const NEW = [
    { t: 'SI', k: 'alt+s', ic: 'receipt' }, { t: 'PI', k: 'alt+p', ic: 'cart' }, { t: 'RC', k: 'alt+r', ic: 'in' }, { t: 'PY', k: 'alt+y', ic: 'out' },
    { t: 'EX', k: 'alt+e', ic: 'wallet' }, { t: 'MI', k: 'alt+m', ic: 'yarn' }, { t: 'PRC', k: 'alt+i', ic: 'box' }, { sep: true },
    { t: 'SR' }, { t: 'PR' }, { t: 'IN' }, { t: 'TR' }, { t: 'CI' }, { t: 'ADJ' }, { t: 'PAYR' }, { t: 'DJ' },
  ];
  App.NEW = NEW;
  App.newDoc = (type, q) => {
    if (App.typeLocked(type)) return App.upsell(TYPE_MOD(type));
    if (!E.can(E.TYPES[type].perm)) return UI.toast('ليس لديك صلاحية: ' + E.PERMS[E.TYPES[type].perm], 'danger');
    location.hash = '#/new/' + type + (q ? '?' + new URLSearchParams(q).toString() : '');
  };
  UI.acts['quick-new'] = (el) => {
    const docs = NEW.filter((n) => n.sep || (E.can(E.TYPES[n.t].perm) && !App.typeLocked(n.t))).filter((n, i, a) => !n.sep || (i > 0 && i < a.length - 1));
    const extra = [E.can('outwork') && Auth.planHas('outwork') && { label: 'أمر تشغيل جديد', icon: 'layers', act: () => Pages.newOrder() }, E.can('sales') && { label: 'عميل جديد', icon: 'users', act: () => Pages.editParty(null, 'customer') }, E.can('stock') && { label: 'صنف جديد', icon: 'tag', act: () => Pages.editItem(null) }].filter(Boolean);
    if (!docs.length && !extra.length) return UI.toast('دورك الحالي لا يسمح بإنشاء مستندات', 'warning');
    UI.menu(el, [{ header: true, label: 'إنشاء مستند' }].concat(docs.map((n) => (n.sep ? { sep: true } : { label: E.TYPES[n.t].label, icon: E.TYPES[n.t].icon, kbd: n.k, act: () => App.newDoc(n.t) }))).concat(extra.length ? [{ sep: true }].concat(extra) : []), { minWidth: 260 });
  };
  UI.acts.palette = () => UI.palette();
  // زر واحد: على الشاشات الكبيرة يطوي القائمة، وعلى الصغيرة يفتحها كدرج جانبي
  const isNarrow = () => matchMedia('(max-width: 1024px)').matches;
  UI.acts['nav-toggle'] = () => {
    const a = document.getElementById('app');
    if (isNarrow()) return a.classList.toggle('nav-open');
    a.classList.toggle('collapsed');
    localStorage.setItem('knit-sidebar', a.classList.contains('collapsed') ? '0' : '1');
    hideTip();
  };
  UI.acts['nav-close'] = () => document.getElementById('app').classList.remove('nav-open');
  // تلميح باسم الصفحة عند المرور على الأيقونات والقائمة مطوية
  let tip = null;
  const hideTip = () => tip && tip.classList.remove('on');
  document.addEventListener('mouseover', (e) => {
    const app = document.getElementById('app');
    // زر الطي يعرض اختصاريه دائمًا، وأيقونات القائمة تعرض أسماءها وهي مطوية
    const tg = e.target.closest && e.target.closest('.b-toggle');
    const a = tg || (e.target.closest && e.target.closest('#nav [data-label]'));
    if (!a || !app || (!tg && !app.classList.contains('collapsed')) || isNarrow()) return hideTip();
    if (!tip) { tip = document.createElement('div'); tip.className = 'side-tip'; document.body.appendChild(tip); }
    const r = a.getBoundingClientRect();
    if (tg) tip.innerHTML = `${app.classList.contains('collapsed') ? 'فتح القائمة' : 'طي القائمة'} <span class="st-k">${UI.k('[')}<i>أو</i><span dir="ltr">${UI.k('mod+b')}</span></span>`;
    else tip.textContent = a.dataset.label;
    const ltr = document.documentElement.dir === 'ltr';
    tip.style.left = (ltr ? r.right + 10 : r.left - 10) + 'px';
    tip.style.transform = ltr ? 'translate(0, -50%)' : '';
    tip.style.top = r.top + r.height / 2 + 'px';
    tip.classList.add('on');
  });
  // بعد تغيير المظهر: أيقونة الزر + إعادة رسم الصفحات التي تحسب ألوان الرسوم عند العرض
  App.onThemeChange = () => {
    const btn = document.querySelector('[data-act="theme"]');
    if (btn) btn.innerHTML = icon(Look.theme() === 'dark' ? 'sun' : 'moon');
    if (App.current && ['dashboard', 'settings', 'party', 'item', 'account'].includes(App.current.page) && !App.dirty) App.refresh();
  };
  const smoothMotion = () => document.startViewTransition && Look.get().motion === 'full' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  // تغيير المظهر بتلاشٍ ناعم؛ وتبديل الوضع بدائرة تتسع من الزر الذي ضُغط
  App.restyle = (patch, el) => {
    const run = () => { Look.set(patch); App.onThemeChange(); };
    if (!smoothMotion()) return run();
    const d = document.documentElement;
    const circle = el && 'mode' in patch && Look.theme() !== (patch.mode === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : patch.mode);
    if (!circle) return document.startViewTransition(run);
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    d.classList.add('vt-circle');
    const t = document.startViewTransition(run);
    t.ready.then(() => d.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] }, { duration: 620, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' }));
    t.finished.finally(() => d.classList.remove('vt-circle'));
  };
  UI.acts.theme = (el) => App.restyle({ mode: Look.theme() === 'dark' ? 'light' : 'dark' }, el || document.querySelector('[data-act="theme"]'));
  UI.acts['user-menu'] = (el) => {
    const u = E.user();
    UI.menu(el, [{ header: true, label: `${u.name} · ${u.email || ''}` },
      { label: 'حسابي وكلمة المرور', icon: 'user', act: () => (location.hash = '#/settings/profile') },
      { label: 'المظهر والألوان', icon: 'palette', act: () => (location.hash = '#/settings/appearance') },
    ].concat(E.can('settings') ? [{ label: 'المستخدمون والصلاحيات', icon: 'shield', act: () => (location.hash = '#/settings/users') }] : [])
      .concat([{ label: 'جولة تعريفية: كيف أستخدم البرنامج', icon: 'sparkle', act: () => Tour.start() }, { sep: true }, { label: 'قفل الشاشة', icon: 'lock', act: () => Auth.lock() }, { label: 'تسجيل الخروج', icon: 'external', danger: true, act: () => Auth.signOut() }]), { minWidth: 250 });
  };
  const upsellHTML = (mod, page) => {
    const f = Auth.LOCKED_INFO[mod] || Auth.LOCKED_INFO.outwork, pl = Auth.PLANS.pro, owner = E.can('settings');
    const sub = DB.s.settings.subscription || {};
    return `<div class="ups ${page ? 'ups-page' : ''}"><div class="ups-art"><span class="ups-ring"></span><span class="ups-ico">${icon(f.icon)}</span><span class="ups-lock">${icon('lock')}</span></div>
      <span class="ups-badge">${icon('sparkle')} متاح في خطة ${pl.label}</span><h2>${f.title}</h2><p>${f.desc}</p>
      <ul class="ups-pts">${f.points.map((x) => `<li>${icon('check')}${x}</li>`).join('')}</ul>
      ${owner ? `<div class="ups-btns"><button class="btn primary" data-act="upgrade" data-plan="pro">${icon('sparkle')} ${sub.status === 'trial' ? 'جرّب الاحترافية ضمن تجربتك المجانية' : 'الترقية إلى ' + pl.label}</button><a class="btn" href="#/settings/subscription" data-act="ups-close">قارن الخطط</a></div>
        ${(() => { const qm = Auth.quote('pro', 'monthly', sub), qy = Auth.quote('pro', 'yearly', sub); return `<div class="ups-price muted small">${qm.promo ? `<s class="num">${U.int(qm.base)}</s> ` : ''}${U.int(qm.amount)} ج.م شهريًا · أو ${U.int(qy.amount)} ج.م سنويًا${qm.promo ? ` <span class="pr-off">${icon('sparkle')} خصم ${qm.pct}%</span>` : ''}</div>`; })()}`
        : `<div class="notice info small">${icon('info')}<div class="n-body">اطلب من مالك المصنع الترقية إلى خطة ${pl.label} لتفعيل هذا القسم.</div></div>`}</div>`;
  };
  let upsModal = null;
  App.upsell = (mod) => { upsModal = UI.modal({ title: '', size: 'md ups-modal', body: upsellHTML(mod), actions: [] }); };
  UI.acts.upsell = (el) => App.upsell(el.dataset.m);
  UI.acts['ups-close'] = (el) => { if (upsModal) upsModal.close(); location.hash = el.getAttribute('href'); };
  Pages.upsell = { render: ({ mod }) => upsellHTML(mod, true) };
  // الترقية: أثناء التجربة تغيير مباشر للخطة، وبعد التفعيل عبر شاشة الدفع
  UI.acts.upgrade = (el) => {
    const plan = el.dataset.plan, sub = DB.s.settings.subscription;
    const done = (msg) => { if (upsModal) { upsModal.close(); upsModal = null; } App.renderChrome(); App.refresh(); UI.toast(msg, 'success'); };
    if (sub.status === 'trial') {
      if (UI.run(() => DB.tx(() => { E.need('settings'); sub.plan = plan; DB.audit('ترقية الخطة أثناء التجربة', 'auth', null, Auth.PLANS[plan].label); return true; }))) done(`تم التحويل إلى ${Auth.PLANS[plan].label} — كل الأقسام مفتوحة الآن`);
      return;
    }
    if (upsModal) { upsModal.close(); upsModal = null; }
    Auth.openCheckout({ plan, cycle: Auth.PLANS[plan].prices[sub.cycle] != null ? sub.cycle : 'monthly' }, (pay) => {
      if (UI.run(() => DB.tx(() => { E.need('settings'); Auth.applyPayment(sub, pay); DB.audit('ترقية الخطة', 'auth', null, `${Auth.PLANS[plan].label} · ${pay.no}`); return true; }))) done(`تمت الترقية إلى ${Auth.PLANS[plan].label}`);
    });
  };
  UI.acts.help = () => App.help();
  UI.acts.lang = () => I18N.toggle();
  UI.acts.go = (el) => (location.hash = el.dataset.href);

  App.help = () => {
    const rows = (arr) => arr.map(([k, d]) => `<div class="kb-row"><span>${d}</span><span class="keys">${k.split(' / ').map((x) => UI.k(x)).join('<span class="muted tiny">أو</span>')}</span></div>`).join('');
    UI.modal({
      title: 'اختصارات لوحة المفاتيح', size: 'lg',
      body: `<div class="kb-grid">
        <div class="kb-sec">عام</div>${rows([['mod+k', 'البحث الشامل ولوحة الأوامر'], ['/', 'البحث داخل الجدول الحالي'], ['alt+n / f2', 'إنشاء جديد في الصفحة الحالية'], ['?', 'عرض هذه القائمة'], ['[ / mod+b', 'طي/فتح القائمة الجانبية'], ['alt+t', 'الوضع الليلي'], ['Esc', 'إغلاق النافذة / رجوع']])}
        <div class="kb-sec">إنشاء سريع من أي مكان</div>${rows(NEW.filter((n) => n.k).map((n) => [n.k, E.TYPES[n.t].label]))}
        <div class="kb-sec">التنقل</div>${rows(NAV.flatMap((g) => g.items).filter((i) => i.k).map((i) => [i.k, i.label]))}
        <div class="kb-sec">داخل المستند</div>${rows([['mod+s', 'حفظ كمسودة'], ['mod+enter', 'اعتماد المستند'], ['mod+p', 'طباعة'], ['alt+l / Insert', 'إضافة بند جديد'], ['mod+Delete', 'حذف البند الحالي'], ['Enter', 'الانتقال للحقل التالي'], ['↓ / F4', 'فتح قائمة البحث في الحقل'], ['alt+d', 'نسخ المستند كجديد']])}
        <div class="kb-sec">الجداول</div>${rows([['↑ / ↓', 'التنقل بين الصفوف'], ['Enter', 'فتح الصف المحدد'], ['PageDown / PageUp', 'الصفحة التالية/السابقة']])}
      </div>`,
    });
  };

  function bindGlobal() {
    UI.bind('mod+k', () => UI.palette(), { inFields: true });
    UI.bind('?', () => App.help());
    UI.bind('mod+b', () => UI.acts['nav-toggle']());
    UI.bind('[', () => UI.acts['nav-toggle']()); // مفتاح واحد خارج الحقول، مثل Linear
    UI.bind('alt+t', () => UI.acts.theme());
    UI.bind('/', () => { const s = document.querySelector('#view [data-tbl-q]'); if (s) { s.focus(); s.select(); } });
    NAV.flatMap((g) => g.items).filter((i) => i.k).forEach((i) => UI.bind(i.k, () => (location.hash = '#/' + i.r)));
    NEW.filter((n) => n.k).forEach((n) => UI.bind(n.k, () => App.newDoc(n.t)));
    const pageNew = () => { if (App.current && App.current.newFn) App.current.newFn(); else UI.acts['quick-new'](document.querySelector('[data-act="quick-new"]')); };
    UI.bind('alt+n', pageNew);
    UI.bind('f2', pageNew);
    // أوامر لوحة الأوامر
    UI.commands = NAV.flatMap((g) => g.items.filter((i) => App.canRoute(i.r)).map((i) => ({ label: i.label, keywords: g.group || '', ico: i.ic, kbd: i.k, go: '#/' + i.r })))
      .concat(NEW.filter((n) => n.t && E.can(E.TYPES[n.t].perm)).map((n) => ({ label: E.TYPES[n.t].label + ' جديد', keywords: 'جديد انشاء اضافة', ico: 'plus', kbd: n.k, run: () => App.newDoc(n.t) })))
      .concat([
        { label: 'أمر تشغيل جديد', keywords: 'ورشة مصنعية', ico: 'layers', run: () => Pages.newOrder() },
        { label: 'إضافة عميل', keywords: 'جديد', ico: 'users', run: () => Pages.editParty(null, 'customer') },
        { label: 'إضافة مورد', keywords: 'جديد', ico: 'truck', run: () => Pages.editParty(null, 'supplier') },
        { label: 'إضافة ورشة', keywords: 'جديد مصنع', ico: 'factory', run: () => Pages.editParty(null, 'workshop') },
        { label: 'إضافة صنف', keywords: 'جديد كود', ico: 'tag', run: () => Pages.editItem(null) },
        { label: 'إضافة عامل', keywords: 'جديد', ico: 'user', run: () => Pages.editWorker(null) },
        { label: 'إضافة موديل', keywords: 'جديد', ico: 'shirt', run: () => Pages.editModel(null) },
        { label: 'تصميم قالب الفاتورة', keywords: 'لوجو ضريبة طباعة', ico: 'file', go: '#/settings/templates' },
        { label: 'قائمة الأرباح والخسائر', keywords: 'تقرير ربح', ico: 'chart', go: '#/report/pnl' },
        { label: 'أعمار ديون العملاء', keywords: 'تقرير متأخرات', ico: 'chart', go: '#/report/aging' },
        { label: 'الملخص السنوي ومقارنة السنوات', keywords: 'تقرير', ico: 'chart', go: '#/report/annual' },
        { label: 'English / العربية — تبديل اللغة', keywords: 'language lang انجليزي عربي', ico: 'globe', run: () => I18N.toggle() },
        { label: 'التبديل للوضع الليلي/النهاري', keywords: 'theme dark', ico: 'moon', run: () => UI.acts.theme() },
        { label: 'المظهر والألوان وحجم الخط', keywords: 'appearance theme color font لون خط ستايل', ico: 'palette', go: '#/settings/appearance' },
        { label: 'اختصارات لوحة المفاتيح', keywords: 'مساعدة', ico: 'keyboard', kbd: '?', run: () => App.help() },
        { label: 'سجل التغييرات', keywords: 'audit', ico: 'history', go: '#/settings/audit' },
        { label: 'نسخة احتياطية', keywords: 'backup تصدير', ico: 'database', go: '#/settings/backup' },
        { label: 'استيراد من Excel', keywords: 'import excel csv استيراد نقل بيانات سهل', ico: 'upload', go: '#/import' },
        { label: 'تصدير البيانات إلى Excel', keywords: 'export excel تصدير', ico: 'download', go: '#/import' },
        { label: 'قفل الشاشة', keywords: 'lock قفل', ico: 'lock', run: () => Auth.lock() },
        { label: 'جولة تعريفية: كيف أستخدم البرنامج', keywords: 'tour help how to use مساعدة شرح تعليم', ico: 'sparkle', run: () => Tour.start() },
        { label: 'تسجيل الخروج', keywords: 'logout خروج', ico: 'external', run: () => Auth.signOut() },
      ]).filter((c) => !c.go || !/^#\/(settings\/(?!appearance|profile)|report)/.test(c.go) || E.can(/report/.test(c.go) ? 'reports' : 'settings'));
  }

  /* ───────── التشغيل ───────── */
  function boot() {
    Look.apply();
    I18N.start();
    Auth.start();
  }
  // يُستدعى بعد التحقق من الجلسة وتحميل بيانات مصنع المستخدم
  App.enter = () => {
    // ترقية الهوية القديمة في البيانات المحفوظة (اللوجو ولون القالب الافتراضي)
    const co = DB.s.settings.company || {};
    if (co.logo && (co.logo.includes('0f6e78') || co.logo.includes('3a4ba8'))) { co.logo = Seed.LOGO; DB.save(); }
    DB.s.templates.forEach((t) => { if (t.color === '#0f6e78' || t.color === '#34449c') t.color = '#1d4fd8'; });
    document.documentElement.dataset.density = DB.s.settings.density || 'comfortable';
    shell();
    bindGlobal();
    render();
    // أول دخول لكل مستخدم: جولة تعريفية
    const u = E.user();
    if (u && !u.tourDone && window.Tour) setTimeout(() => !document.body.classList.contains('is-locked') && Tour.start(), 1200);
  };
  // يضيف اسم العمود لكل خلية (data-label) — تستخدمه شاشات الموبايل لعرض الصفوف كبطاقات
  const labelTables = (root) => {
    root.querySelectorAll('table').forEach((t) => {
      const ths = t.tHead ? [...t.tHead.rows[0].cells] : [];
      if (!ths.length) return;
      const labels = ths.map((th) => th.textContent.replace(/[▲▼]/g, '').trim());
      t.querySelectorAll('tbody tr, tfoot tr').forEach((tr) => {
        if (tr.dataset.labeled) return;
        let i = 0;
        for (const td of tr.cells) { if (!td.hasAttribute('data-label')) td.setAttribute('data-label', labels[i] || ''); i += td.colSpan || 1; }
        tr.dataset.labeled = '1';
      });
    });
  };
  let labelQueued = false;
  new MutationObserver(() => { if (labelQueued) return; labelQueued = true; requestAnimationFrame(() => { labelQueued = false; const v = document.getElementById('view'); if (v) labelTables(v); const m = document.querySelector('.overlay'); if (m) labelTables(m); }); })
    .observe(document.documentElement, { childList: true, subtree: true });
  App.boot = boot;
  document.addEventListener('DOMContentLoaded', boot);
})();
