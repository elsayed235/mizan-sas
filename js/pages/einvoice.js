/* شاشات الفاتورة الإلكترونية: بطاقة على كل فاتورة، صفحة المتابعة، والإعدادات */
(function () {
  const esc = U.esc;
  const pill = (st) => `<span class="pill ${ETA.STATUS[st][0]}">${ETA.STATUS[st][1]}</span>`;
  const QR_URL = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  let qrP = null;
  const loadQR = () => qrP || (qrP = new Promise((res, rej) => { if (window.QRCode) return res(); const s = document.createElement('script'); s.src = QR_URL; s.onload = res; s.onerror = () => { qrP = null; rej(); }; document.head.appendChild(s); }));
  // رموز QR تُرسم عند ظهورها
  new MutationObserver(() => document.querySelectorAll('.eta-qr:not([data-done])').forEach((el) => {
    el.dataset.done = 1;
    loadQR().then(() => { el.innerHTML = ''; new QRCode(el, { text: el.dataset.qr, width: 112, height: 112, colorDark: '#111714', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M }); }).catch(() => { el.innerHTML = `<span class="muted tiny">تعذر رسم الرمز</span>`; });
  })).observe(document.documentElement, { childList: true, subtree: true });

  /* بطاقة على صفحة الفاتورة */
  Pages.etaCard = (d) => {
    if (!ETA.isTrade(d) || !ETA.cfg().enabled) return '';
    const st = ETA.state(d), e = d.eta || {};
    const r = ['ready', 'blocked'].includes(st) ? ETA.check(d) : null;
    return `<div class="card eta-card eta-${st}"><div class="card-h"><span class="eta-ico">${icon('globe')}</span><div class="grow"><h3>الفاتورة الإلكترونية</h3><div class="sub">منظومة مصلحة الضرائب · ${e.env === 'prod' || (!e.env && ETA.cfg().env === 'prod') ? 'الإنتاج' : 'البيئة التجريبية'}</div></div>${pill(st)}</div>
      <div class="card-b">
      ${st === 'valid' || st === 'cancelled' ? `<div class="eta-ok"><div class="eta-qr" data-qr="${esc(ETA.verifyUrl(d))}"></div><div class="info-list grow">
          <div class="i-row"><span>الرقم الموحد UUID</span><b class="mono small" data-no-tr>${esc(e.uuid)}</b></div>
          <div class="i-row"><span>${st === 'cancelled' ? 'أُلغيت في' : 'قُبلت في'}</span><b>${U.dateTime(st === 'cancelled' ? e.cancelledAt : e.at)}</b></div>
          <div class="i-row"><span>الإجمالي على المنظومة</span><b class="num">${U.money(e.total)}</b></div></div></div>
        ${(e.warns || []).map((w) => `<div class="notice warn small mt-8">${icon('alert')}<div class="n-body">${esc(w)}</div></div>`).join('')}
        <div class="row wrap mt-12"><a class="btn sm" href="${esc(ETA.verifyUrl(d))}" target="_blank" rel="noopener">${icon('external')} صفحة التحقق</a><button class="btn sm ghost" data-act="eta-json" data-id="${d.id}">${icon('file')} المستند (JSON)</button>
          ${st === 'valid' ? `<button class="btn sm ghost danger" data-act="eta-cancel" data-id="${d.id}">${icon('ban')} إلغاء على المنظومة</button>` : ''}</div>`
      : st === 'invalid' ? `<div class="notice danger small">${icon('alert')}<div class="n-body"><b>رفضت المنظومة المستند</b><ul>${(e.errors || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
        <div class="row wrap mt-12"><button class="btn sm primary" data-act="eta-retry" data-id="${d.id}">${icon('undo')} صححت البيانات — أعد الفحص</button></div>`
      : `<ul class="eta-checks">${r.errs.length ? r.errs.map((x) => `<li class="bad">${icon('x')}<span>${esc(x.m)}${fixLink(x)}</span></li>`).join('') : `<li class="good">${icon('check')}<span>كل بيانات المنظومة مكتملة</span></li>`}${r.warns.map((w) => `<li class="warn">${icon('alert')}<span>${esc(w)}</span></li>`).join('')}</ul>
        <div class="row wrap mt-12"><button class="btn sm primary" data-act="eta-send" data-id="${d.id}" ${r.ok && d.status !== 'void' ? '' : 'disabled'}>${icon('upload')} إرسال للمنظومة</button><button class="btn sm ghost" data-act="eta-json" data-id="${d.id}" ${r.ok ? '' : 'disabled'}>${icon('file')} معاينة JSON</button></div>`}
      </div></div>`;
  };
  const fixLink = (x) => (x.k === 'issuer' || x.k === 'unit' ? ` <a href="#/settings/einvoice">استكمال</a>` : x.k === 'receiver' && x.ref ? ` <a href="#/party/${x.ref}">فتح العميل</a>` : x.k === 'item' && x.ref ? ` <a href="#/item/${x.ref}">فتح الصنف</a>` : '');
  UI.acts['eta-send'] = (el) => {
    const r = UI.run(() => ETA.submit(+el.dataset.id));
    if (r) { UI.toast(r.status === 'valid' ? 'قبلت المنظومة الفاتورة ✓' : 'رفضت المنظومة الفاتورة — راجع الأسباب', r.status === 'valid' ? 'success' : 'danger'); App.refresh(); }
  };
  UI.acts['eta-retry'] = (el) => { UI.run(() => ETA.reset(+el.dataset.id)); App.refresh(); };
  UI.acts['eta-cancel'] = (el) => UI.prompt({ title: 'إلغاء على المنظومة', label: 'سبب الإلغاء', danger: true, ok: 'إلغاء على المنظومة', required: true, message: 'الإلغاء على المنظومة لا يلغي المستند في دفاترك — ألغِ الفاتورة نفسها أيضًا أو أصدر مرتجعًا.' }).then((reason) => {
    if (!reason) return;
    if (UI.run(() => ETA.cancel(+el.dataset.id, reason), 'تم الإلغاء على المنظومة')) App.refresh();
  });
  UI.acts['eta-json'] = (el) => {
    const d = DB.get('docs', +el.dataset.id), doc = ETA.build(d);
    const json = JSON.stringify(doc, null, 2);
    UI.modal({ title: `المستند بصيغة المنظومة — ${d.no}`, size: 'lg', body: `<div class="notice info small mb-12">${icon('info')}<div class="n-body">هذا ما يُرسل لمنظومة الضرائب بعد توقيعه بالختم الإلكتروني على الخادم.</div></div><pre class="eta-json" dir="ltr" data-no-tr>${esc(json)}</pre>`,
      actions: [{ label: 'نسخ', icon: 'copy', act: () => navigator.clipboard && navigator.clipboard.writeText(json).then(() => UI.toast('تم النسخ', 'success')) }, { label: 'إغلاق', cls: 'primary', primary: true, act: (m) => m.close() }] });
  };

  /* صفحة المتابعة */
  let F = { tab: 'all', days: 30 };
  Pages.einvoice = {
    render() {
      const c = ETA.cfg();
      if (!c.enabled) return `<div class="page-h"><div class="titles"><h1>الفاتورة الإلكترونية</h1><div class="desc">إرسال فواتيرك لمنظومة مصلحة الضرائب المصرية تلقائيًا من البرنامج</div></div></div>
        <div class="eta-setup card"><span class="eta-big">${icon('globe')}</span><h2>اربط مصنعك بمنظومة الفاتورة الإلكترونية</h2><p>أدخل بيانات التسجيل الضريبي مرة واحدة، وولّد أكواد الأصناف بضغطة — ثم ترسل أي فاتورة بزر واحد وتتابع حالتها هنا.</p>
          <ol class="eta-steps"><li><b>بيانات المصنع</b><span>رقم التسجيل الضريبي، كود النشاط، والعنوان</span></li><li><b>أكواد الأصناف</b><span>توليد أكواد EGS لكل منتج يُباع</span></li><li><b>بيانات العملاء</b><span>الرقم الضريبي للشركات</span></li></ol>
          ${E.can('settings') ? `<a class="btn primary" href="#/settings/einvoice">${icon('cog')} ابدأ الإعداد</a>` : '<div class="muted small">اطلب من مالك المصنع تفعيلها من الإعدادات</div>'}</div>`;
      const from = U.addDays(U.today(), -F.days);
      const all = ETA.docs().filter((d) => d.status !== 'void' || d.eta).filter((d) => d.date >= from).map((d) => ({ d, st: ETA.state(d) }));
      const cnt = (s) => all.filter((x) => x.st === s).length;
      const rows = all.filter((x) => F.tab === 'all' || x.st === F.tab || (F.tab === 'pending' && ['ready', 'blocked'].includes(x.st)));
      const ready = all.filter((x) => x.st === 'ready');
      // أكثر المشكلات تكرارًا: تُصلح مرة واحدة لكل الفواتير
      const issues = new Map();
      all.filter((x) => x.st === 'blocked').forEach((x) => ETA.check(x.d).errs.forEach((e) => { const k = e.k + ':' + (e.ref || e.m); if (!issues.has(k)) issues.set(k, { e, n: 0 }); issues.get(k).n++; }));
      const noCode = DB.s.items.filter((i) => (i.kind === 'finished' || i.kind === 'service') && !i.etaCode).length;
      return `<div class="page-h"><div class="titles"><h1>الفاتورة الإلكترونية</h1><div class="desc">منظومة مصلحة الضرائب المصرية · <span class="pill ${c.env === 'prod' ? 'ok' : 'warn'} plain">${c.env === 'prod' ? 'بيئة الإنتاج' : 'البيئة التجريبية'}</span> · الرقم الضريبي <span class="mono" data-no-tr>${esc(c.rin || '—')}</span></div></div>
        <div class="actions"><a class="btn" href="#/settings/einvoice">${icon('cog')} الإعدادات</a><button class="btn primary" data-act="eta-bulk" ${ready.length ? '' : 'disabled'}>${icon('upload')} إرسال الجاهز (${ready.length})</button></div></div>
        <div class="eta-stats">${[['ready', 'جاهزة للإرسال', 'upload'], ['blocked', 'تحتاج استكمال', 'alert'], ['valid', 'صالحة', 'checkCircle'], ['invalid', 'مرفوضة', 'x']].map(([k, l, ic]) => `<button class="card eta-stat s-${k} ${F.tab === k ? 'on' : ''}" data-act="eta-tab" data-v="${k}"><span class="eta-si">${icon(ic)}</span><span><b class="num">${cnt(k)}</b><span>${l}</span></span></button>`).join('')}</div>
        ${issues.size || noCode ? `<div class="card mb-16"><div class="card-h"><h3>${icon('alert')} استكمل هذه البيانات مرة واحدة لتصبح فواتيرك جاهزة</h3></div><div class="eta-issues">
          ${noCode ? `<div class="eta-issue"><span class="grow"><b>${noCode} صنف مُباع بدون كود منظومة (EGS)</b><span class="muted small">التوليد التلقائي بالصيغة المعتمدة EG-رقم التسجيل-كود الصنف</span></span><button class="btn sm primary" data-act="eta-gen">${icon('zap')} توليد الأكواد</button></div>` : ''}
          ${[...issues.values()].filter((x) => x.e.k !== 'item').slice(0, 8).map((x) => `<div class="eta-issue"><span class="grow"><b>${esc(x.e.m)}</b><span class="muted small">يؤثر على ${x.n} ${x.n === 1 ? 'فاتورة' : 'فواتير'}</span></span>${fixLink(x.e)}</div>`).join('')}
        </div></div>` : ''}
        <div class="card">${UI.table({ id: 'eta', rows, csv: 'e-invoices', open: (x) => '#/doc/' + x.d.id,
          toolbar: `<div class="btn-group">${[['all', 'الكل'], ['pending', 'لم تُرسل'], ['valid', 'صالحة'], ['invalid', 'مرفوضة'], ['cancelled', 'ملغاة']].map(([k, l]) => `<button class="btn sm ${F.tab === k ? 'on' : ''}" data-act="eta-tab" data-v="${k}">${l}</button>`).join('')}</div>
            ${UI.sel('', [[7, 'آخر 7 أيام'], [30, 'آخر 30 يومًا'], [90, 'آخر 90 يومًا'], [3650, 'الكل']], F.days, { attrs: 'data-change="eta-days" style="width:auto;height:34px"' })}`,
          cols: [
            { k: 'no', label: 'المستند', v: (x) => x.d.no, html: (x) => `<span class="code">${esc(x.d.no)}</span> <span class="muted small">${x.d.type === 'SR' ? 'إشعار دائن' : 'فاتورة'}</span>` },
            { k: 'date', label: 'التاريخ', v: (x) => x.d.date, html: (x) => U.date(x.d.date) },
            { k: 'p', label: 'العميل', v: (x) => E.nameOf('parties', x.d.sid) },
            { k: 't', label: 'الإجمالي', num: true, v: (x) => x.d.totals.total, html: (x) => U.money(x.d.totals.total), sum: true },
            { k: 's', label: 'حالة المنظومة', v: (x) => x.st, html: (x) => pill(x.st) },
            { k: 'a', label: '', html: (x) => (x.st === 'ready' ? `<button class="btn xs primary" data-act="eta-send" data-id="${x.d.id}">${icon('upload')} إرسال</button>` : '') },
          ] })}</div>`;
    },
  };
  UI.acts['eta-tab'] = (el) => { F.tab = F.tab === el.dataset.v && el.classList.contains('eta-stat') ? 'all' : el.dataset.v; App.refresh(); };
  UI.acts['eta-days'] = (el) => { F.days = +el.value; App.refresh(); };
  UI.acts['eta-gen'] = () => { const n = UI.run(() => ETA.generateCodes(true)); if (n != null) { UI.toast(`تم توليد ${n} كود`, 'success'); App.refresh(); } };
  UI.acts['eta-bulk'] = () => {
    const ready = ETA.docs().filter((d) => ETA.state(d) === 'ready');
    UI.confirm({ title: 'إرسال الفواتير الجاهزة', message: `سيتم إرسال ${ready.length} مستند للمنظومة.`, ok: 'إرسال' }).then((ok) => {
      if (!ok) return;
      let v = 0, bad = 0;
      for (const d of ready) { try { const r = ETA.submit(d.id); if (r.status === 'valid') v++; else bad++; } catch (e) { bad++; } }
      UI.toast(`تم إرسال ${v} مستند بنجاح${bad ? ` · ${bad} مرفوض` : ''}`, bad ? 'warning' : 'success');
      App.refresh();
    });
  };

  /* الإعدادات */
  Pages.etaSettings = () => {
    const c = ETA.cfg(), noCode = DB.s.items.filter((i) => (i.kind === 'finished' || i.kind === 'service') && !i.etaCode).length;
    const inp = (k, ph, o = {}) => `<input class="input ${o.cls || ''}" data-eta="${k}" value="${esc(c[k] || '')}" placeholder="${ph}" ${o.dir ? `dir="${o.dir}"` : ''} ${o.max ? `maxlength="${o.max}"` : ''}>`;
    return `<section class="card"><div class="card-h"><span class="ap-ico">${icon('globe')}</span><div class="grow"><h3>الفاتورة الإلكترونية — مصلحة الضرائب المصرية</h3><div class="sub">بعد التفعيل يظهر على كل فاتورة مبيعات زر الإرسال للمنظومة وحالتها</div></div>
        <label class="check small">${UI.sw('', c.enabled, 'data-eta="enabled"')} مفعّلة</label></div>
      <div class="card-b grid g3">
        ${UI.field('رقم التسجيل الضريبي', inp('rin', '9 أرقام', { dir: 'ltr', max: 9, cls: 'num' }), { req: true })}
        ${UI.field('كود النشاط الاقتصادي', inp('activity', 'مثال 1430', { dir: 'ltr', max: 4, cls: 'num' }), { req: true, hint: '1430 = تصنيع الملابس المحبوكة والكروشيه' })}
        ${UI.field('رقم الفرع', inp('branchId', '0 للمركز الرئيسي', { dir: 'ltr', cls: 'num' }))}
        ${UI.field('المحافظة', inp('gov', 'مثال: القاهرة'), { req: true })}${UI.field('المدينة / المنطقة', inp('city', 'مثال: مدينة نصر'), { req: true })}${UI.field('رقم المبنى', inp('building', '0', { dir: 'ltr' }))}
        ${UI.field('الشارع', inp('street', 'اسم الشارع'), { req: true, cls: 'span-2' })}
        ${UI.field('البيئة', `<select class="input" data-eta="env"><option value="preprod" ${c.env !== 'prod' ? 'selected' : ''}>تجريبية (Pre-production)</option><option value="prod" ${c.env === 'prod' ? 'selected' : ''}>الإنتاج (فواتير حقيقية)</option></select>`)}
      </div>
      <div class="card-b" style="padding-top:0"><div class="notice info small">${icon('lock')}<div class="n-body"><b>الربط والتوقيع</b> — بيانات الربط (Client ID / Secret) وشهادة الختم الإلكتروني تُضبط على الخادم بواسطة فريق الدعم ولا تُحفظ في المتصفح. هذه النسخة تحاكي رد المنظومة.</div></div></div>
      <div class="card-f row"><span class="grow"></span><button class="btn primary" data-act="eta-save">${icon('check')} حفظ</button></div></section>
    <div class="ap-grid mt-16">
      <section class="card"><div class="card-h"><span class="ap-ico">${icon('tag')}</span><div class="grow"><h3>أكواد الأصناف (EGS)</h3><div class="sub">كل صنف يُباع يحتاج كودًا مسجلًا في المنظومة</div></div></div>
        <div class="card-b"><div class="eta-big-n"><b class="num">${noCode}</b><span>${noCode ? 'صنف مُباع بدون كود' : 'كل الأصناف المباعة لها أكواد'}</span></div>
          <p class="small muted">الصيغة المعتمدة للأكواد الداخلية: <span class="mono" data-no-tr>EG-${esc(c.rin || 'رقم التسجيل')}-كود الصنف</span> — بعد التوليد سجّلها على بوابة المنظومة (يمكن تصدير الأصناف إلى Excel).</p>
          <div class="row wrap"><button class="btn primary" data-act="eta-gen" ${noCode ? '' : 'disabled'}>${icon('zap')} توليد الأكواد الناقصة</button><a class="btn" href="#/import">${icon('download')} تصدير الأصناف</a></div></div></section>
      <section class="card"><div class="card-h"><span class="ap-ico">${icon('scale')}</span><div class="grow"><h3>أكواد الوحدات</h3><div class="sub">ربط وحدات البرنامج بأكواد وحدات المنظومة</div></div></div>
        <div class="eta-units">${DB.s.units.map((u) => `<label class="eta-unit"><span>${esc(u.name)}</span><input class="input mono" data-unit="${esc(u.name)}" value="${esc(c.units[u.name] || '')}" placeholder="مثال EA" dir="ltr" maxlength="6"></label>`).join('')}</div></section>
    </div>`;
  };
  Pages.etaSettingsMount = (el) => {
    el.querySelector('[data-eta="enabled"]').addEventListener('change', (e) => saveEta({ enabled: e.target.checked }, e.target.checked ? 'تم تفعيل الفاتورة الإلكترونية' : 'تم إيقاف الفاتورة الإلكترونية'));
    el.querySelectorAll('[data-unit]').forEach((i) => i.addEventListener('change', () => { const units = Object.assign({}, ETA.cfg().units, { [i.dataset.unit]: i.value.trim().toUpperCase() }); saveEta({ units }, 'تم حفظ كود الوحدة'); }));
  };
  function saveEta(patch, msg) {
    if (UI.run(() => DB.tx(() => { E.need('settings'); DB.s.settings.eta = Object.assign(ETA.cfg(), patch); DB.audit('إعدادات الفاتورة الإلكترونية', 'settings', null, Object.keys(patch).join('، ')); return true; }), msg || 'تم الحفظ')) { App.renderChrome(); App.refresh(); }
  }
  UI.acts['eta-save'] = () => {
    const v = {};
    document.querySelectorAll('[data-eta]').forEach((i) => { if (i.type !== 'checkbox') v[i.dataset.eta] = i.value.trim(); });
    if (v.rin && !/^\d{9}$/.test(v.rin)) return UI.toast('رقم التسجيل الضريبي 9 أرقام', 'danger');
    if (v.activity && !/^\d{4}$/.test(v.activity)) return UI.toast('كود النشاط 4 أرقام', 'danger');
    saveEta(v, 'تم حفظ بيانات المنظومة');
  };
})();
