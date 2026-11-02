/* الأطراف: العملاء، الموردون، الورش، الرسامون — مع كشف الحساب والتاريخ متعدد السنوات */
(function () {
  const esc = U.esc;
  const KINDS = {
    customers: { type: 'customer', title: 'العملاء', one: 'عميل', desc: 'كل عميل له كشف حساب ممتد عبر السنوات: ماذا أخذ، ماذا دفع، ومتى وكيف', ic: 'users' },
    suppliers: { type: 'supplier', title: 'الموردون', one: 'مورد', desc: 'موردو الخيوط وقطع الغيار والمستلزمات — المستحق لهم والمدفوع', ic: 'truck' },
    workshops: { type: 'workshop', title: 'الورش والمصانع المتعاقدة', one: 'ورشة', desc: 'الخطوط التي تعمل إنتاجًا لحساب المصنع: الخامات المسلمة، الساعات، المصنعية، السلف', ic: 'factory' },
    designers: { type: 'designer', title: 'الرسامون والمبرمجون', one: 'رسام/مبرمج', desc: 'رسم وبرمجة الموديلات على الماكينات وتكلفتها', ic: 'pen' },
  };
  const LF = {};

  Pages.parties = {
    render({ kind }) {
      const K = KINDS[kind];
      const f = LF[kind] || (LF[kind] = 'all');
      const yearStart = U.year(U.today()) + '-01-01';
      let rows = DB.s.parties.filter((p) => p.types.includes(K.type)).map((p) => {
        const ents = E.ledgerOf('party', p.id);
        const last = ents.length ? ents.reduce((a, e) => (e.date > a ? e.date : a), '') : '';
        return { p, bal: E.balance('party', p.id), last, year: U.sum(E.posted(null, yearStart, U.today()).filter((d) => d.sid === p.id && ['SI', 'PI', 'PRC', 'DJ'].includes(d.type)), (d) => d.totals.total) };
      });
      const all = rows;
      if (f === 'dr') rows = rows.filter((r) => r.bal > 0.004);
      if (f === 'cr') rows = rows.filter((r) => r.bal < -0.004);
      if (f === 'stopped') rows = rows.filter((r) => !r.p.active);
      if (f === 'all') rows = rows.filter((r) => r.p.active);
      const maxBal = Math.max(1, ...all.map((r) => Math.abs(r.bal)));
      const totDr = U.sum(all.filter((r) => r.bal > 0), (r) => r.bal), totCr = -U.sum(all.filter((r) => r.bal < 0), (r) => r.bal);
      const cols = [
        { k: 'code', label: 'الكود', v: (r) => r.p.code, html: (r) => `<span class="code">${esc(r.p.code)}</span>` },
        { k: 'name', label: 'الاسم', v: (r) => r.p.name, html: (r) => `<b>${esc(r.p.name)}</b>${r.p.types.length > 1 ? ' ' + r.p.types.filter((t) => t !== K.type).map((t) => `<span class="tag">${E.PARTY_TYPES[t]}</span>`).join(' ') : ''}${!r.p.active ? ' <span class="pill void">موقوف</span>' : ''}` },
        { k: 'phone', label: 'الهاتف', v: (r) => r.p.phone || '', html: (r) => `<span class="ltr small">${esc(r.p.phone || '')}</span>` },
      ];
      if (K.type === 'workshop') cols.push(
        { k: 'line', label: 'الخط', v: (r) => r.p.lineName || '', html: (r) => `<span class="small">${esc(r.p.lineName || '')}</span>` },
        { k: 'rate', label: 'السعر الساري', v: (r) => { const x = E.rateFor('workshop', r.p.id, r.p.rule || 'hour', U.today()); return x ? x.rate : 0; }, html: (r) => { const x = E.rateFor('workshop', r.p.id, r.p.rule || 'hour', U.today()); return x ? `<span class="num">${U.money(x.rate)}</span> <span class="tiny muted">/${{ hour: 'ساعة', piece: 'قطعة', kg: 'كجم' }[r.p.rule || 'hour']}</span>` : '—'; } },
        { k: 'wo', label: 'أوامر مفتوحة', v: (r) => DB.s.orders.filter((o) => o.partyId === r.p.id && o.status === 'open').length },
        { k: 'cust', label: 'عهدة خامات', num: true, v: (r) => U.sum(E.custodyItems(r.p.id), (x) => x.qty), html: (r) => `${U.qty(U.sum(E.custodyItems(r.p.id), (x) => x.qty))} <span class="tiny muted">كجم</span>` },
      );
      cols.push(
        { k: 'year', label: K.type === 'customer' ? 'مبيعات السنة' : K.type === 'supplier' ? 'مشتريات السنة' : 'تكلفة السنة', num: true, v: (r) => r.year, html: (r) => UI.money(r.year, true), sum: true },
        { k: 'last', label: 'آخر تعامل', v: (r) => r.last, html: (r) => (r.last ? `<span class="small">${U.date(r.last)}</span>` : '<span class="muted small">لا يوجد</span>') },
        { k: 'bal', label: 'الرصيد الحالي', num: true, v: (r) => r.bal, html: (r) => UI.bal(r.bal) + (Math.abs(r.bal) > 0.004 ? UI.ibar(Math.abs(r.bal) / maxBal, r.bal > 0 ? 'var(--info)' : 'var(--accent)') : ''), sum: (rs) => UI.bal(U.sum(rs, (r) => r.bal)) },
      );
      return `
      <div class="page-h"><div class="titles"><h1>${K.title}</h1><div class="desc">${K.desc}</div></div>
        <div class="actions"><a class="btn" href="#/import?k=${{ customer: 'customers', supplier: 'suppliers', workshop: 'workshops' }[K.type] || 'customers'}">${icon('upload')} استيراد من Excel</a><button class="btn primary" data-act="party-new" data-type="${K.type}">${icon('plus')} ${K.one} جديد ${UI.k('alt+n')}</button></div></div>
      <div class="stat-strip mb-16">
        <div><div class="s-l">عدد ${K.title}</div><div class="s-v">${all.filter((r) => r.p.active).length} <span class="small muted">نشط</span></div></div>
        <div><div class="s-l">إجمالي "عليهم" لنا</div><div class="s-v num" style="text-align:right;color:var(--info)">${U.money(totDr)}</div></div>
        <div><div class="s-l">إجمالي "لهم" علينا</div><div class="s-v num" style="text-align:right;color:var(--accent)">${U.money(totCr)}</div></div>
        <div><div class="s-l">الصافي</div><div class="s-v">${UI.bal(totDr - totCr)}</div></div>
      </div>
      <div class="card">
        <div class="tabs" style="padding:0 12px;margin:0">${[['all', 'النشطون'], ['dr', 'عليهم رصيد'], ['cr', 'لهم رصيد'], ['stopped', 'موقوفون']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="party-f" data-kind="${kind}" data-v="${k}">${l}</button>`).join('')}</div>
        ${UI.table({ id: 'parties-' + kind, rows, cols, open: (r) => '#/party/' + r.p.id, csv: kind, print: true, printTitle: K.title, sort: 'bal', empty: 'لا يوجد ' + K.title, extraSearch: (r) => (r.p.address || '') + ' ' + (r.p.notes || '') })}
      </div>`;
    },
    mount(el, { kind }) { App.current.newFn = () => Pages.editParty(null, KINDS[kind].type); },
  };
  UI.acts['party-f'] = (el) => { LF[el.dataset.kind] = el.dataset.v; App.refresh(); };
  UI.acts['party-new'] = (el) => Pages.editParty(null, el.dataset.type);

  /* ───────── نموذج الطرف ───────── */
  Pages.editParty = (id, type) => {
    const p = id ? DB.get('parties', id) : { types: [type], active: true, startDate: U.today(), rule: 'hour' };
    const prefix = { customer: 'C-', supplier: 'S-', workshop: 'WS-', designer: 'D-' }[p.types[0]];
    const code = p.code || App.nextCode(prefix, DB.s.parties);
    const hasHist = id && E.ledgerOf('party', id).length > 0;
    UI.modal({
      title: id ? 'تعديل بيانات ' + esc(p.name) : 'إضافة ' + E.PARTY_TYPES[type], size: 'lg',
      body: `<div class="grid g3">
        ${UI.field('الكود', UI.inp('code', code), { req: true, hint: 'فريد — يُستخدم في البحث والتقارير' })}
        ${UI.field('الاسم', UI.inp('name', p.name, { attrs: 'autofocus' }), { req: true, cls: 'span-2' })}
        ${UI.field('الهاتف', UI.inp('phone', p.phone))}${UI.field('العنوان', UI.inp('address', p.address), { cls: 'span-2' })}
        ${UI.field('الرقم الضريبي', UI.inp('taxNo', p.taxNo, { attrs: 'dir="ltr" maxlength="9"' }), { hint: '9 أرقام — مطلوب للفاتورة الإلكترونية لو العميل شركة' })}${UI.field('نوعه في الفاتورة الإلكترونية', UI.sel('etaType', [['', 'تلقائي (شركة لو له رقم ضريبي)'], ['B', 'شركة'], ['P', 'فرد'], ['F', 'أجنبي']], p.etaType || ''))}${UI.field('الرقم القومي (للأفراد)', UI.inp('nationalId', p.nationalId, { attrs: 'dir="ltr" maxlength="14"' }), { hint: 'مطلوب لفواتير الأفراد من 50,000 ج.م' })}${UI.field('المحافظة', UI.inp('gov', p.gov))}${UI.field('المدينة', UI.inp('city', p.city))}${UI.field('تاريخ بداية التعامل', UI.inp('startDate', p.startDate, { type: 'date' }))}
        <div class="field"><label>نوع الطرف (يمكن اختيار أكثر من نوع)</label><div class="row wrap">${Object.entries(E.PARTY_TYPES).map(([k, l]) => UI.chk('t_' + k, p.types.includes(k), l)).join('')}</div></div>
        <div class="field span-all" data-ws ${p.types.includes('workshop') ? '' : 'hidden'}><div class="grid g3">${UI.field('اسم الخط / الماكينات', UI.inp('lineName', p.lineName))}${UI.field('طريقة حساب المصنعية', UI.sel('rule', Object.entries(E.RULES), p.rule || 'hour'))}</div></div>
        ${UI.field('', UI.chk('taxable', p.taxable, 'عميل خاضع للضريبة (تطبيق الضريبة تلقائيًا في فواتيره)'), { cls: 'span-2' })}
        ${UI.field('ملاحظات', UI.area('notes', p.notes, { rows: 2 }), { cls: 'span-all' })}
        ${!id && E.can('opening') ? `<div class="span-all card" style="box-shadow:none"><div class="card-h"><h3>${icon('flag')} رصيد افتتاحي (اختياري)</h3><span class="sub">يُسجل كمستند موثق — ليس تعديلًا يدويًا للرصيد</span></div><div class="card-b grid g3">${UI.field('المبلغ', UI.inp('obAmount', '', { num: true, ph: '0' }))}${UI.field('طبيعة الرصيد', UI.sel('obSide', [['debit', 'عليه لنا (مدين)'], ['credit', 'له علينا (دائن)']], type === 'customer' ? 'debit' : 'credit'))}${UI.field('بتاريخ', UI.inp('obDate', U.today(), { type: 'date' }))}</div></div>` : ''}
        ${id ? `<div class="span-all row">${UI.sw('active', p.active)} <span>نشط</span> <span class="small muted">— إيقاف الطرف يمنع المستندات الجديدة ولا يحذف تاريخه</span></div>` : ''}
      </div>`,
      onMount: (m) => m.querySelector('[name="t_workshop"]').addEventListener('change', (e) => (m.querySelector('[data-ws]').hidden = !e.target.checked)),
      actions: [
        { label: 'حفظ', cls: 'primary', primary: true, act: (m) => {
          const v = UI.readForm(m.el);
          const types = Object.keys(E.PARTY_TYPES).filter((k) => v['t_' + k]);
          if (!v.name.trim()) return UI.toast('الاسم مطلوب', 'danger');
          if (!types.length) return UI.toast('اختر نوعًا واحدًا على الأقل', 'danger');
          if (DB.s.parties.some((x) => x.code === v.code.trim() && x.id !== id)) return UI.toast('الكود مستخدم لطرف آخر', 'danger');
          if (hasHist && p.types.some((t) => !types.includes(t)) && E.balance('party', id) !== 0) UI.toast('تنبيه: تم إزالة نوع من طرف له رصيد قائم', 'warning');
          const saved = UI.run(() => DB.tx(() => {
            const data = { code: v.code.trim(), name: v.name.trim(), phone: v.phone, address: v.address, taxNo: (v.taxNo || '').trim(), etaType: v.etaType || '', nationalId: (v.nationalId || '').trim(), gov: v.gov, city: v.city, startDate: v.startDate, types, notes: v.notes, taxable: v.taxable, lineName: v.lineName, rule: v.rule };
            let x;
            if (id) { x = DB.get('parties', id); Object.assign(x, data, { active: v.active }); DB.audit('تعديل طرف', 'party', id, x.name); }
            else {
              E.need(types.includes('customer') ? 'sales' : types.includes('supplier') ? 'purchases' : types.includes('workshop') ? 'outwork' : 'models');
              x = DB.add('parties', Object.assign(data, { active: true })); DB.audit('إضافة طرف', 'party', x.id, x.name);
              if (v.obAmount > 0) { const d = E.saveDraft(E.newDoc('OB', { st: 'party', sid: x.id, side: v.obSide, amount: v.obAmount, date: v.obDate, notes: 'رصيد افتتاحي عند إضافة الطرف' })); E.post(d.id); }
            }
            return x;
          }), 'تم الحفظ');
          if (saved) { m.close(); if (!id) location.hash = '#/party/' + saved.id; else App.refresh(); }
        } },
        { label: 'تراجع' },
        ...(id && !hasHist ? [{ label: 'حذف', cls: 'danger', act: async (m) => { if (await UI.confirm({ title: 'حذف الطرف', message: 'لا توجد أي حركات لهذا الطرف، سيتم حذفه نهائيًا.', danger: true, ok: 'حذف' })) { UI.run(() => DB.tx(() => { DB.remove('parties', id); DB.audit('حذف طرف', 'party', id, p.name); }), 'تم الحذف'); m.close(); history.back(); } } }] : []),
      ],
    });
  };

  /* ───────── ملف الطرف ───────── */
  const PS = {};
  Pages.party = {
    render({ id, tab }) {
      const p = DB.get('parties', id);
      if (!p) return UI.empty('الطرف غير موجود', '', 'users');
      const t = tab || (p.types.includes('workshop') ? 'orders' : 'statement');
      const st = PS[id] || (PS[id] = { from: U.year(U.today()) + '-01-01', to: U.today(), showVoid: false });
      const bal = E.balance('party', id);
      const isC = p.types.includes('customer'), isS = p.types.includes('supplier'), isW = p.types.includes('workshop'), isD = p.types.includes('designer');
      const ys = E.yearlySummary('party', id);
      const cy = ys.find((y) => y.year === U.year(U.today())) || {};
      const first = E.ledgerOf('party', id).reduce((a, e) => (!a || e.date < a ? e.date : a), '');
      const kindKey = isW ? 'workshops' : isC ? 'customers' : isS ? 'suppliers' : 'designers';
      const acts = [];
      if (isC) acts.push(`<button class="btn" data-act="new-doc" data-type="SI" data-q='{"sid":${id}}'>${icon('receipt')} فاتورة بيع</button>`, `<button class="btn" data-act="new-doc" data-type="RC" data-q='{"sid":${id}}'>${icon('in')} تحصيل</button>`);
      if (isS) acts.push(`<button class="btn" data-act="new-doc" data-type="PI" data-q='{"sid":${id}}'>${icon('cart')} فاتورة شراء</button>`);
      if (isW) acts.push(`<button class="btn" data-act="wo-new" data-party="${id}">${icon('layers')} أمر تشغيل</button>`, `<button class="btn" data-act="new-doc" data-type="PY" data-q='{"sid":${id},"purpose":"advance"}'>${icon('coins')} سلفة</button>`);
      if (isD) acts.push(`<button class="btn" data-act="new-doc" data-type="DJ" data-q='{"sid":${id}}'>${icon('pen')} مهمة رسم</button>`);
      if (isS || isW || isD) acts.push(`<button class="btn ${bal < 0 ? 'primary' : ''}" data-act="new-doc" data-type="PY" data-q='${JSON.stringify(bal < 0 ? { sid: id, amount: -bal } : { sid: id })}'>${icon('out')} ${bal < 0 ? 'سداد المستحق' : 'دفعة'}</button>`);
      const tabs = [['statement', 'كشف الحساب'], ['docs', 'المستندات'], ['years', 'التاريخ عبر السنوات']];
      if (isW) tabs.unshift(['orders', 'التشغيل والعهدة']);
      if (isD) tabs.splice(1, 0, ['models', 'الموديلات']);
      tabs.push(['info', 'البيانات']);
      return `
      <div class="crumbs"><a href="#/${kindKey}">${KINDS[kindKey].title}</a> ‹ <span>${esc(p.code)}</span></div>
      <div class="page-h">
        <div class="titles"><div class="profile-h"><div class="big-avatar">${UI.initials(p.name)}</div><div>
          <h1>${esc(p.name)} ${!p.active ? '<span class="pill void">موقوف</span>' : ''}</h1>
          <div class="desc"><span class="code">${esc(p.code)}</span> · ${p.types.map((x) => E.PARTY_TYPES[x]).join('، ')}${p.phone ? ` · <span class="ltr">${esc(p.phone)}</span>` : ''}${p.address ? ' · ' + esc(p.address) : ''}</div></div></div></div>
        <div class="actions">${acts.join('')}<button class="btn icon" data-act="party-edit" data-id="${id}" title="تعديل">${icon('edit')}</button></div>
      </div>
      <div class="stat-strip mb-16">
        <div><div class="s-l">الرصيد الحالي</div><div class="s-v" style="font-size:20px">${UI.bal(bal)}</div></div>
        ${isC ? `<div><div class="s-l">مبيعات ${U.year(U.today())}</div><div class="s-v num" style="text-align:right">${U.money(cy.sales || 0)}</div></div><div><div class="s-l">تحصيلات ${U.year(U.today())}</div><div class="s-v num" style="text-align:right">${U.money(cy.receipts || 0)}</div></div>` : ''}
        ${isS ? `<div><div class="s-l">مشتريات ${U.year(U.today())}</div><div class="s-v num" style="text-align:right">${U.money(cy.purchases || 0)}</div></div>` : ''}
        ${isW ? `<div><div class="s-l">مصنعية ${U.year(U.today())}</div><div class="s-v num" style="text-align:right">${U.money(cy.outwork || 0)}</div></div>` : ''}
        ${isD ? `<div><div class="s-l">تكلفة رسم ${U.year(U.today())}</div><div class="s-v num" style="text-align:right">${U.money(cy.design || 0)}</div></div>` : ''}
        ${!isC ? `<div><div class="s-l">مدفوعات ${U.year(U.today())}</div><div class="s-v num" style="text-align:right">${U.money(cy.payments || 0)}</div></div>` : ''}
        <div><div class="s-l">أول تعامل</div><div class="s-v small">${first ? U.date(first) : '—'}</div></div>
        <div><div class="s-l">سنوات التعامل</div><div class="s-v small">${ys.filter((y) => y.active).map((y) => y.year).join('، ') || '—'}</div></div>
      </div>
      ${(() => {
        const lm = UI.ledgerMonths('party', id);
        if (!lm.dr.some((v) => v) && !lm.cr.some((v) => v)) return '';
        const names = isC ? ['المبيعات والمستحق عليه', 'التحصيلات والمرتجعات'] : ['المدفوعات والسلف', isW ? 'المصنعية المستحقة' : isD ? 'تكلفة الرسم' : 'المشتريات والمستحق له'];
        const c1 = UI.chartColor('--chart-1'), c2 = UI.chartColor('--chart-2');
        return `<div class="card mb-16"><div class="card-h"><h3>${icon('chart')} حركة الحساب آخر 12 شهرًا</h3><span class="grow"></span><div class="legend"><span><i style="background:${c1}"></i>${names[0]}</span><span><i style="background:${c2}"></i>${names[1]}</span></div></div><div class="mini-chart">${UI.barChart({ labels: lm.labels, series: [{ name: names[0], color: c1, values: lm.dr }, { name: names[1], color: c2, values: lm.cr }], height: 150 })}</div></div>`;
      })()}
      <div class="tabs">${tabs.map(([k, l]) => `<a href="#/party/${id}/${k}" class="${t === k ? 'on' : ''}">${l}</a>`).join('')}</div>
      ${tabBody(p, t, st)}`;
    },
    mount(el, { id }) {
      const p = DB.get('parties', id);
      if (!p) return;
      App.current.newFn = () => App.newDoc(p.types.includes('customer') ? 'SI' : p.types.includes('supplier') ? 'PI' : p.types.includes('workshop') ? 'MI' : 'DJ', { sid: id });
      UI.pageKeys = { 'mod+p': () => Pages.printStatement('party', id) };
    },
  };
  UI.acts['party-edit'] = (el) => Pages.editParty(+el.dataset.id);

  function tabBody(p, t, st) {
    const id = p.id;
    if (t === 'statement') return Pages.statementCard('party', id, st);
    if (t === 'docs') {
      const docs = DB.s.docs.filter((d) => d.sid === id && (d.st || 'party') === 'party').sort((a, b) => (a.date < b.date ? 1 : -1));
      return `<div class="card">${UI.table({ id: 'pdocs-' + id, rows: docs, open: (d) => '#/doc/' + d.id, csv: 'docs-' + p.code, rowCls: (d) => (d.status === 'void' ? 'is-void' : ''), cols: [
        { k: 'no', label: 'الرقم', v: (d) => E.docNo(d), html: (d) => `<span class="code">${esc(E.docNo(d))}</span>` },
        { k: 't', label: 'النوع', v: (d) => E.TYPES[d.type].label, html: (d) => `<span class="tag">${E.TYPES[d.type].label}</span>` },
        { k: 'date', label: 'التاريخ', v: (d) => d.date, html: (d) => U.date(d.date) },
        { k: 'det', label: 'البيان', v: Pages.detailOf, html: (d) => `<span class="small text-2">${esc(Pages.detailOf(d))}</span>` },
        { k: 'v', label: 'القيمة', num: true, v: (d) => d.totals.total || 0, html: (d) => UI.money(d.totals.total || 0) },
        { k: 'pay', label: 'السداد', html: (d) => UI.payPill(d.status === 'posted' && ['SI', 'PI', 'PRC', 'DJ', 'EX', 'OB'].includes(d.type) ? E.payStatus(d) : null) },
        { k: 's', label: 'الحالة', v: (d) => E.STATUS[d.status], html: UI.status },
      ] })}</div>`;
    }
    if (t === 'years') return Pages.yearCards('party', id, p);
    if (t === 'info') return `<div class="card"><div class="card-b"><div class="grid g3">${[['الكود', p.code], ['الاسم', p.name], ['الهاتف', p.phone], ['العنوان', p.address], ['الرقم الضريبي', p.taxNo], ['بداية التعامل', U.date(p.startDate)], ['الخط', p.lineName], ['طريقة المصنعية', p.rule && p.types.includes('workshop') ? E.RULES[p.rule] : ''], ['خاضع للضريبة', p.taxable ? 'نعم' : 'لا']].filter((x) => x[1]).map(([l, v]) => `<div><div class="lbl">${l}</div><div class="bold">${esc(v)}</div></div>`).join('')}</div>${p.notes ? `<div class="mt-16"><div class="lbl">ملاحظات</div><div>${esc(p.notes)}</div></div>` : ''}</div><div class="card-f row"><button class="btn sm" data-act="party-edit" data-id="${id}">${icon('edit')} تعديل البيانات</button>${E.can('opening') ? `<button class="btn sm" data-act="new-doc" data-type="OB" data-q='{"sid":${id}}'>${icon('flag')} رصيد افتتاحي</button>` : ''}</div></div>`;
    if (t === 'models') {
      const jobs = DB.s.docs.filter((d) => d.type === 'DJ' && d.sid === id && d.status !== 'void');
      const lines = jobs.flatMap((j) => j.lines.map((l) => ({ j, l, m: DB.get('models', l.modelId) })));
      return `<div class="card">${UI.table({ id: 'dmodels-' + id, rows: lines, open: (r) => '#/model/' + r.m.id, cols: [
        { k: 'c', label: 'الموديل', v: (r) => r.m.code + ' ' + r.m.name, html: (r) => `<span class="code">${esc(r.m.code)}</span> ${esc(r.m.name)}` },
        { k: 'j', label: 'المهمة', v: (r) => E.docNo(r.j), html: (r) => UI.docLink(r.j) },
        { k: 'd', label: 'التاريخ', v: (r) => r.j.date, html: (r) => U.date(r.j.date) },
        { k: 'a', label: 'التكلفة', num: true, v: (r) => r.l.amount, html: (r) => UI.money(r.l.amount), sum: true },
        { k: 's', label: 'حالة المحاسبة', v: (r) => E.modelDesign(r.m.id).label, html: (r) => { const ds = E.modelDesign(r.m.id); return `<span class="pill ${ds.status === 'paid' ? 'paid' : ds.status === 'draft' ? 'draft' : 'partial'}">${esc(ds.label)}</span>`; } },
      ] })}</div>`;
    }
    if (t === 'orders') return Pages.workshopPanel(p);
    return '';
  }

  /* ───────── كشف الحساب (مشترك للأطراف والعمال) ───────── */
  Pages.statementCard = (stp, id, st) => {
    const s = E.statement(stp, id, st.from, st.to, { showVoid: st.showVoid });
    const kind = stp === 'worker' ? 'worker' : null;
    const years = [...new Set(E.ledgerOf(stp, id).map((e) => U.year(e.date)).concat([U.year(U.today())]))].sort();
    const rows = [{ opening: true }].concat(s.rows);
    return `<div class="card">
      ${UI.table({
        id: `stmt-${stp}-${id}`, rows, noPage: true, csv: 'statement', search: true, searchPh: 'بحث في الكشف…',
        rowCls: (r) => (r.opening ? '' : r.d && r.d.status === 'void' ? 'is-void' : ''),
        open: (r) => (r.d ? '#/doc/' + r.d.id : null),
        toolbar: `<div class="period-bar"><input type="date" class="input" value="${st.from}" data-change="stmt-from" data-st="${stp}" data-id="${id}"><input type="date" class="input" value="${st.to}" data-change="stmt-to" data-st="${stp}" data-id="${id}">
          <div class="btn-group">${years.map((y) => `<button class="btn sm ${st.from === y + '-01-01' && (st.to === y + '-12-31' || (y === U.year(U.today()) && st.to === U.today())) ? 'on' : ''}" data-act="stmt-year" data-st="${stp}" data-id="${id}" data-y="${y}">${y}</button>`).join('')}<button class="btn sm ${!st.from ? 'on' : ''}" data-act="stmt-year" data-st="${stp}" data-id="${id}" data-y="">من البداية</button></div>
          <label class="check small">${UI.sw('', st.showVoid, `data-change="stmt-void" data-st="${stp}" data-id="${id}"`)} إظهار الملغى</label></div>
          <button class="btn sm" data-act="stmt-print" data-st="${stp}" data-id="${id}">${icon('printer')} طباعة الكشف</button>`,
        cols: [
          { k: 'date', label: 'التاريخ', v: (r) => (r.opening ? '' : r.date), html: (r) => (r.opening ? '' : U.date(r.date)), sort: false },
          { k: 'no', label: 'المستند', v: (r) => (r.opening ? 'رصيد أول المدة' : E.docNo(r.d)), html: (r) => (r.opening ? `<b>رصيد أول المدة${st.from ? ' في ' + U.date(st.from) : ''}</b>` : `<span class="code">${esc(E.docNo(r.d))}</span>`), sort: false },
          { k: 'type', label: 'النوع', v: (r) => (r.opening ? '' : E.TYPES[r.d.type].label), html: (r) => (r.opening ? '' : `<span class="tag">${E.TYPES[r.d.type].label}</span>`), sort: false },
          { k: 'memo', label: 'البيان', v: (r) => (r.opening ? '' : (r.e.memo || '') + ' ' + Pages.detailOf(r.d)), html: (r) => (r.opening ? '' : `<span class="small">${esc(r.e.memo || '')}</span> <span class="tiny muted">${esc(Pages.detailOf(r.d))}</span>`), cls: 'wrap', sort: false },
          { k: 'dr', label: stp === 'worker' ? 'مدين (صرف/سلف)' : 'مدين (عليه)', num: true, v: (r) => (r.opening ? 0 : r.debit), html: (r) => (r.opening ? '' : UI.money(r.debit, true)), sum: () => UI.money(s.debit), sort: false },
          { k: 'cr', label: stp === 'worker' ? 'دائن (استحقاق)' : 'دائن (له)', num: true, v: (r) => (r.opening ? 0 : r.credit), html: (r) => (r.opening ? '' : UI.money(r.credit, true)), sum: () => UI.money(s.credit), sort: false },
          { k: 'bal', label: 'الرصيد', num: true, v: (r) => (r.opening ? s.opening : r.balance), html: (r) => UI.bal(r.opening ? s.opening : r.balance, kind), sum: () => UI.bal(s.closing, kind), sort: false },
        ],
      })}
      <div class="card-f row between small"><span>عدد الحركات: <b>${s.rows.length}</b></span><span>رصيد أول المدة: ${UI.bal(s.opening, kind)}</span><span>حركة الفترة: مدين ${UI.money(s.debit)} · دائن ${UI.money(s.credit)}</span><span>رصيد آخر المدة: <b>${UI.bal(s.closing, kind)}</b></span></div>
    </div>`;
  };
  const stState = (stp, id) => (stp === 'worker' ? Pages.WS : PS)[id];
  UI.acts['stmt-from'] = (el) => { stState(el.dataset.st, +el.dataset.id).from = el.value; App.refresh(); };
  UI.acts['stmt-to'] = (el) => { stState(el.dataset.st, +el.dataset.id).to = el.value; App.refresh(); };
  UI.acts['stmt-void'] = (el) => { stState(el.dataset.st, +el.dataset.id).showVoid = el.checked; App.refresh(); };
  UI.acts['stmt-year'] = (el) => { const s = stState(el.dataset.st, +el.dataset.id); const y = el.dataset.y; if (y) { s.from = y + '-01-01'; s.to = +y === U.year(U.today()) ? U.today() : y + '-12-31'; } else { s.from = ''; s.to = U.today(); } App.refresh(); };
  UI.acts['stmt-print'] = (el) => Pages.printStatement(el.dataset.st, +el.dataset.id);

  Pages.printStatement = (stp, id) => {
    const st = stState(stp, id) || { from: '', to: U.today() };
    const s = E.statement(stp, id, st.from, st.to, { showVoid: false });
    const subj = stp === 'worker' ? DB.get('workers', id) : DB.get('parties', id);
    const co = DB.s.settings.company;
    const side = (n) => (Math.abs(n) < 0.005 ? '' : stp === 'worker' ? (n > 0 ? 'سلف عليه' : 'مستحق له') : n > 0 ? 'عليه' : 'له');
    UI.print(`<div class="paper A4 rep-paper rep-print"><div class="rp-h"><div class="row">${co.logo ? `<img src="${co.logo}" style="width:46px;height:46px">` : ''}<div><b style="font-size:16px">${esc(co.name)}</b><div class="tiny">${esc(co.address || '')} · ${esc(co.phone || '')}</div></div></div><div style="text-align:left"><b style="font-size:18px;color:#34449c">كشف حساب</b><div class="small">${st.from ? U.date(st.from) : 'من البداية'} ← ${U.date(st.to)}</div></div></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:12px"><div><b>${esc(subj.name)}</b> <span class="mono">(${esc(subj.code)})</span>${subj.phone ? ' · ' + esc(subj.phone) : ''}</div><div>رصيد أول المدة: <b>${U.money(Math.abs(s.opening))} ${side(s.opening)}</b></div></div>
      <table><thead><tr><th>التاريخ</th><th>المستند</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>
      ${s.rows.map((r) => `<tr><td>${U.date(r.date)}</td><td class="mono">${esc(r.d.no)}</td><td>${esc(E.TYPES[r.d.type].label)} — ${esc(r.e.memo || '')}</td><td class="num">${r.debit ? U.money(r.debit) : ''}</td><td class="num">${r.credit ? U.money(r.credit) : ''}</td><td class="num">${U.money(Math.abs(r.balance))} ${side(r.balance)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="3">الإجمالي / رصيد آخر المدة</td><td class="num">${U.money(s.debit)}</td><td class="num">${U.money(s.credit)}</td><td class="num">${U.money(Math.abs(s.closing))} ${side(s.closing)}</td></tr></tfoot></table>
      <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:12px"><div>توقيع الطرف: .....................</div><div>المحاسب: .....................</div><div class="tiny muted">طُبع ${U.dateTime(U.now())}</div></div></div>`);
  };

  /* ───────── بطاقات السنوات ───────── */
  Pages.yearCards = (stp, id, subj) => {
    const ys = E.yearlySummary(stp, id);
    if (!ys.length) return UI.empty('لا يوجد تاريخ تعامل بعد', '', 'calendar');
    const isC = subj.types && subj.types.includes('customer'), isS = subj.types && subj.types.includes('supplier'), isW = subj.types && subj.types.includes('workshop'), isD = subj.types && subj.types.includes('designer');
    const line = (l, v) => (v ? `<div class="row between small" style="padding:3px 0"><span class="text-2">${l}</span><span class="num">${U.money(v)}</span></div>` : '');
    return `<div class="year-cards">${ys.map((y) => `<div class="year-card ${y.active ? '' : 'inactive'}">
      <div class="y">${y.year} ${y.active ? `<span class="pill ok">${y.count} مستند</span>` : '<span class="pill plain">لم يتعامل</span>'}</div>
      <div class="mt-8">${stp === 'worker' ? line('الأجور المستحقة', y.wages) + line('المصروف له', y.payments) : (isC ? line('المبيعات', y.sales) + line('مرتجعات المبيعات', y.salesReturns) + line('التحصيلات', y.receipts) : '') + (isS ? line('المشتريات', y.purchases) + line('مرتجعات المشتريات', y.purchaseReturns) : '') + (isW ? line('المصنعية', y.outwork) : '') + (isD ? line('تكلفة الرسم', y.design) : '') + (!isC || isS ? line('المدفوعات', y.payments) : '')}</div>
      <div class="row between mt-8" style="border-top:1px solid var(--border);padding-top:8px"><span class="small text-2">الرصيد في نهاية السنة</span>${UI.bal(y.closing, stp === 'worker' ? 'worker' : null)}</div>
      ${y.active ? `<button class="btn xs mt-8" data-act="stmt-year" data-st="${stp}" data-id="${id}" data-y="${y.year}" onclick="location.hash='#/${stp === 'worker' ? 'worker' : 'party'}/${id}/statement'">${icon('file')} كشف ${y.year}</button>` : ''}
    </div>`).join('')}</div>`;
  };
})();
