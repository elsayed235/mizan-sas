/* المستندات: القوائم، المحرر (بأسلوب الجدول السريع)، العرض مع الآثار المحاسبية، الطباعة */
(function () {
  const esc = U.esc;
  const T = () => E.TYPES;

  Pages.DOC_LISTS = {
    sales: { types: ['SI'], title: 'فواتير المبيعات', desc: 'كل فاتورة معتمدة تخصم من المخزن وتضيف على حساب العميل تلقائيًا' },
    'sales-returns': { types: ['SR'], title: 'مرتجعات المبيعات', desc: 'المرتجع يعيد الكمية للمخزن ويخفض مديونية العميل' },
    receipts: { types: ['RC'], title: 'التحصيلات', desc: 'سندات القبض من العملاء أو أي طرف — تزيد الخزينة وتخفض المديونية' },
    purchases: { types: ['PI'], title: 'فواتير المشتريات', desc: 'شراء مخزني يزيد المخزون، وبنود المصروف المباشر تظهر في المصروفات' },
    'purchase-returns': { types: ['PR'], title: 'مرتجعات المشتريات', desc: '' },
    payments: { types: ['PY'], title: 'سندات الصرف', desc: 'دفعات للموردين والورش والرسامين والعمال، والسلف المقدمة' },
    expenses: { types: ['EX'], title: 'المصروفات', desc: 'كهرباء، شمع، إبر، صيانة، شحن… أي بند صرف — نقدي أو آجل على مورد' },
    incomes: { types: ['IN'], title: 'الإيرادات الأخرى', desc: 'إيرادات غير مرتبطة بفاتورة بيع (بيع هالك، تشغيل للغير…)' },
    transfers: { types: ['TR'], title: 'التحويلات بين الخزائن والبنوك', desc: 'التحويل الداخلي ليس إيرادًا ولا مصروفًا' },
    consumption: { types: ['CI'], title: 'صرف استهلاك داخلي', desc: 'صرف قطع غيار وإبر وشمع من المخزن للماكينات — يتحول لمصروف بتكلفته' },
    'internal-prod': { types: ['IP'], title: 'الإنتاج الداخلي', desc: 'إنتاج على ماكينات المصنع: خامات تخرج ومنتج تام يدخل بتكلفته' },
    stocktakes: { types: ['ADJ'], title: 'الجرد والتسويات', desc: 'الكمية المعدودة فعليًا مقابل رصيد النظام — الفرق يُسجل كحركة موثقة' },
    'stock-transfers': { types: ['STR'], title: 'التحويلات المخزنية', desc: '' },
    issues: { types: ['MI', 'MR'], title: 'صرف ومرتجع الخامات للورش', desc: 'الخيط المسلم للورشة يخرج من المخزن ويُسجل عهدة باسمها' },
    'receipts-prod': { types: ['PRC'], title: 'استلام الإنتاج من الورش', desc: 'استلام المنتج + تسجيل الساعات + استهلاك الخامات من العهدة + احتساب المصنعية' },
    payroll: { types: ['PAYR'], title: 'مسيرات الأجور', desc: 'احتساب أجور العمال حسب نوع الأجر، ثم الصرف بضغطة واحدة' },
    'design-jobs': { types: ['DJ'], title: 'مهام الرسم والبرمجة', desc: 'الموديلات المسلمة للرسام وتكلفتها المستحقة' },
    opening: { types: ['OB', 'OA', 'OS'], title: 'الأرصدة الافتتاحية', desc: 'أرصدة أول المدة للأطراف والخزائن والمخزون — تُسجل كمستندات موثقة' },
  };

  /* ───────── أدوات ───────── */
  const whFor = (role) => {
    const w = DB.s.warehouses.filter((x) => x.active !== false);
    const key = { fg: 'تام', raw: 'خام', sp: 'غيار' }[role];
    return (w.find((x) => key && x.name.includes(key)) || w[0] || {}).id || null;
  };
  const accFor = (type) => { const a = DB.s.accounts.filter((x) => x.active !== false); return (a.find((x) => x.type === type) || a[0] || {}).id || null; };
  Pages.whFor = whFor;
  const subjOf = (d) => (d.st === 'worker' ? DB.get('workers', d.sid) : DB.get('parties', d.sid));
  const blank = (type) => ({ kind: 'item', itemId: null, qty: type === 'ADJ' ? '' : 1, unit: 'base', price: 0, disc: 0, cost: 0 });
  const detailOf = (d) => {
    const L = d.lines || [];
    const firstItems = () => L.filter((l) => l.itemId).slice(0, 2).map((l) => E.nameOf('items', l.itemId)).join('، ') + (L.length > 2 ? ` +${L.length - 2}` : '');
    switch (d.type) {
      case 'SI': case 'SR': case 'PI': case 'PR': return firstItems() || (L[0] && L[0].desc) || '';
      case 'RC': return E.PAY_METHODS[d.method] + ' ← ' + E.nameOf('accounts', d.accountId);
      case 'PY': return (d.purpose === 'advance' ? 'سلفة · ' : '') + E.PAY_METHODS[d.method] + ' من ' + E.nameOf('accounts', d.accountId);
      case 'EX': return E.nameOf('expenseCats', d.catId) + (d.beneficiary ? ' · ' + d.beneficiary : '') + (d.payMode === 'credit' ? ' (آجل)' : '');
      case 'IN': return E.nameOf('incomeCats', d.catId) + (d.source ? ' · ' + d.source : '');
      case 'TR': return E.nameOf('accounts', d.accountId) + ' ← ' + E.nameOf('accounts', d.accountTo);
      case 'CI': return E.nameOf('expenseCats', d.catId) + ' · ' + firstItems();
      case 'IP': return U.qty(d.qtyGood) + ' × ' + E.nameOf('items', d.itemId);
      case 'ADJ': return E.nameOf('warehouses', d.whId) + ' · ' + L.length + ' صنف';
      case 'STR': return E.nameOf('warehouses', d.whId) + ' ← ' + E.nameOf('warehouses', d.whTo);
      case 'MI': case 'MR': { const o = DB.get('orders', d.woId); return (o ? o.no + ' · ' : '') + L.map((l) => U.qty(l.qty) + ' ' + E.nameOf('items', l.itemId)).join('، '); }
      case 'PRC': return (d.qtyGood ? U.int(d.qtyGood) + ' قطعة · ' : '') + (d.hours ? U.qty(d.hours) + ' ساعة · ' : '') + E.nameOf('items', d.itemId);
      case 'WL': return U.qty(d.qty) + ' ' + E.nameOf('items', d.itemId) + ' · ' + (d.reason || '');
      case 'PAYR': return U.date(d.from) + ' ← ' + U.date(d.to) + ' · ' + L.length + ' عامل';
      case 'DJ': return L.length + ' موديل: ' + L.slice(0, 3).map((l) => (DB.get('models', l.modelId) || {}).code).join('، ');
      case 'OB': return d.side === 'credit' ? 'له (دائن)' : 'عليه (مدين)';
      case 'OA': return E.nameOf('accounts', d.accountId);
      case 'OS': return E.nameOf('warehouses', d.whId) + ' · ' + L.length + ' صنف';
    }
    return '';
  };
  Pages.detailOf = detailOf;

  /* ───────── قائمة المستندات ───────── */
  const LS = {}; // حالة الفلاتر لكل قائمة
  Pages.doclist = {
    render({ list }) {
      const cfg = Pages.DOC_LISTS[list];
      const st = LS[list] || (LS[list] = { status: 'all', from: '', to: '', type: 'all' });
      const multi = cfg.types.length > 1;
      let docs = DB.s.docs.filter((d) => cfg.types.includes(d.type));
      const counts = { all: docs.length, draft: 0, posted: 0, void: 0 };
      docs.forEach((d) => counts[d.status]++);
      if (st.status !== 'all') docs = docs.filter((d) => d.status === st.status);
      if (st.type !== 'all') docs = docs.filter((d) => d.type === st.type);
      if (st.from) docs = docs.filter((d) => d.date >= st.from);
      if (st.to) docs = docs.filter((d) => d.date <= st.to);
      docs = docs.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
      const postedDocs = docs.filter((d) => d.status === 'posted');
      const hasParty = cfg.types.some((t) => T()[t].partyTypes || ['RC', 'PY', 'OB'].includes(t));
      const hasPay = cfg.types.some((t) => ['SI', 'PI', 'DJ'].includes(t));
      const cols = [
        { k: 'no', label: 'الرقم', v: (d) => d.no || 'مسودة', html: (d) => `<span class="code">${esc(E.docNo(d))}</span>` },
        multi ? { k: 'type', label: 'النوع', v: (d) => T()[d.type].label, html: (d) => `<span class="tag">${T()[d.type].label}</span>` } : null,
        { k: 'date', label: 'التاريخ', v: (d) => d.date, html: (d) => U.date(d.date) },
        hasParty ? { k: 'party', label: 'الطرف', v: (d) => (d.sid ? E.subjectName(d.st || 'party', d.sid) : ''), html: (d) => (d.sid ? esc(E.subjectName(d.st || 'party', d.sid)) : '—'), cls: 'strike' } : null,
        { k: 'det', label: 'البيان', v: detailOf, html: (d) => `<span class="text-2 ellipsis" style="max-width:340px;display:inline-block;vertical-align:middle">${esc(detailOf(d))}</span>` },
        { k: 'total', label: 'القيمة', num: true, v: (d) => (d.totals && d.totals.total) || 0, html: (d) => (d.type === 'ADJ' ? UI.money((d.calc && d.calc.value) || 0) : UI.money((d.totals && d.totals.total) || 0)), cls: 'strike', sum: (rows) => UI.money(U.sum(rows.filter((d) => d.status === 'posted'), (d) => (d.totals && d.totals.total) || 0)) },
        hasPay ? { k: 'pay', label: 'السداد', v: (d) => { const ps = E.payStatus(d); return ps ? ps.status : ''; }, html: (d) => { const ps = d.status === 'posted' ? E.payStatus(d) : null; return ps ? UI.payPill(ps) + (ps.remaining > 0 ? ` <span class="tiny muted num">${U.money(ps.remaining)}</span>` : '') : ''; } } : null,
        { k: 'status', label: 'الحالة', v: (d) => E.STATUS[d.status], html: UI.status },
        { k: 'by', label: 'بواسطة', v: (d) => d.postedBy || d.createdBy || '', html: (d) => `<span class="small muted">${esc(d.postedBy || d.createdBy || '')}</span>` },
      ].filter(Boolean);
      const years = [...new Set(DB.s.fiscalYears.map((f) => f.name))];
      const newBtns = cfg.types.filter((t) => E.can(T()[t].perm)).map((t, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-act="new-doc" data-type="${t}">${icon('plus')} ${T()[t].label}${i === 0 ? ' ' + UI.k('alt+n') : ''}</button>`).join('');
      return `
      <div class="page-h"><div class="titles"><h1>${cfg.title}</h1><div class="desc">${cfg.desc}</div></div><div class="actions">${list === 'payroll' ? `<a class="btn" href="#/worklogs">${icon('calendar')} يوميات الإنتاج</a>` : ''}${newBtns}</div></div>
      <div class="stat-strip mb-16">
        <div><div class="s-l">عدد المستندات المعتمدة</div><div class="s-v">${U.int(postedDocs.length)}</div></div>
        <div><div class="s-l">إجمالي القيمة (معتمد)</div><div class="s-v num" style="text-align:right">${U.money(U.sum(postedDocs, (d) => (d.totals && d.totals.total) || 0))}</div></div>
        ${hasPay ? `<div><div class="s-l">المتبقي غير المسدد</div><div class="s-v num neg" style="text-align:right">${U.money(U.sum(postedDocs, (d) => { const p = E.payStatus(d); return p ? p.remaining : 0; }))}</div></div>` : ''}
        <div><div class="s-l">مسودات بانتظار الاعتماد</div><div class="s-v ${counts.draft ? 'warn' : ''}">${counts.draft}</div></div>
      </div>
      <div class="card">
        <div class="tabs" style="padding:0 12px;margin:0">
          ${[['all', 'الكل'], ['draft', 'مسودات'], ['posted', 'معتمد'], ['void', 'ملغى']].map(([k, l]) => `<button class="${st.status === k ? 'on' : ''}" data-act="dl-status" data-list="${list}" data-v="${k}">${l} <span class="cnt">${counts[k]}</span></button>`).join('')}
        </div>
        ${UI.table({
          id: 'dl-' + list, rows: docs, cols, open: (d) => '#/doc/' + d.id, csv: list, print: true, printTitle: cfg.title,
          rowCls: (d) => (d.status === 'void' ? 'is-void' : ''),
          toolbar: `<div class="period-bar">
            ${multi ? UI.sel('dl-type', [['all', 'كل الأنواع']].concat(cfg.types.map((t) => [t, T()[t].label])), st.type, { attrs: `data-change="dl-filter" data-list="${list}" data-k="type" style="width:auto;height:34px"` }) : ''}
            <input type="date" class="input" value="${st.from}" data-change="dl-filter" data-list="${list}" data-k="from" title="من تاريخ">
            <input type="date" class="input" value="${st.to}" data-change="dl-filter" data-list="${list}" data-k="to" title="إلى تاريخ">
            <div class="btn-group">${years.map((y) => `<button class="btn sm ${st.from === y + '-01-01' && st.to === y + '-12-31' ? 'on' : ''}" data-act="dl-year" data-list="${list}" data-y="${y}">${y}</button>`).join('')}<button class="btn sm ${!st.from && !st.to ? 'on' : ''}" data-act="dl-year" data-list="${list}" data-y="">الكل</button></div>
          </div>`,
          empty: 'لا توجد مستندات', emptySub: `ابدأ بإنشاء ${T()[cfg.types[0]].label} جديد`, emptyIcon: T()[cfg.types[0]].icon,
        })}
      </div>`;
    },
    mount(el, { list }) {
      const cfg = Pages.DOC_LISTS[list];
      App.current.newFn = () => App.newDoc(cfg.types[0]);
    },
  };
  UI.acts['new-doc'] = (el) => App.newDoc(el.dataset.type, el.dataset.q ? JSON.parse(el.dataset.q) : null);
  UI.acts['dl-status'] = (el) => { LS[el.dataset.list].status = el.dataset.v; App.refresh(); };
  UI.acts['dl-filter'] = (el) => { LS[el.dataset.list][el.dataset.k] = el.value; App.refresh(); };
  UI.acts['dl-year'] = (el) => { const y = el.dataset.y; Object.assign(LS[el.dataset.list], y ? { from: y + '-01-01', to: y + '-12-31' } : { from: '', to: '' }); App.refresh(); };

  /* ───────── القيم الافتراضية للمستند الجديد ───────── */
  function defaults(type, q) {
    const S = DB.s.settings;
    const tpl = (DB.s.templates.find((t) => t.isDefault) || {}).id;
    const o = { lines: [] };
    const sid = q.sid ? +q.sid : null;
    switch (type) {
      case 'SI': Object.assign(o, { sid, whId: whFor('fg'), taxId: S.defaultSalesTaxId || null, templateId: tpl, paid: 0, accountId: accFor('cash'), method: 'cash', discount: 0, lines: [blank(type)] }); break;
      case 'SR': {
        Object.assign(o, { sid, whId: whFor('fg'), paid: 0, accountId: accFor('cash'), method: 'cash', discount: 0, lines: [blank(type)] });
        if (q.ref) { const inv = DB.get('docs', +q.ref); if (inv) loadInvoice(o, inv); }
        break;
      }
      case 'PI': Object.assign(o, { sid, whId: whFor('raw'), taxId: null, paid: 0, accountId: accFor('bank'), method: 'transfer', discount: 0, lines: [blank(type)] }); break;
      case 'PR': Object.assign(o, { sid, whId: whFor('raw'), paid: 0, accountId: accFor('bank'), method: 'transfer', discount: 0, lines: [blank(type)] }); break;
      case 'RC': Object.assign(o, { st: q.st || 'party', sid, amount: q.amount ? +q.amount : 0, accountId: accFor('cash'), method: 'cash', allocId: q.alloc ? +q.alloc : null }); break;
      case 'PY': Object.assign(o, { st: q.st || 'party', sid, amount: q.amount ? +q.amount : 0, accountId: accFor('cash'), method: 'cash', purpose: q.purpose || 'payment', woId: q.wo ? +q.wo : null, allocId: q.alloc ? +q.alloc : null }); break;
      case 'EX': Object.assign(o, { catId: q.cat ? +q.cat : null, amount: 0, payMode: 'paid', accountId: accFor('cash'), method: 'cash', beneficiary: '' }); break;
      case 'IN': Object.assign(o, { catId: null, amount: 0, accountId: accFor('cash'), method: 'cash', source: '' }); break;
      case 'TR': Object.assign(o, { accountId: accFor('bank'), accountTo: accFor('cash'), amount: 0, method: 'transfer' }); break;
      case 'OB': Object.assign(o, { st: q.st || 'party', sid, side: 'debit', amount: 0 }); break;
      case 'OA': Object.assign(o, { accountId: q.acc ? +q.acc : accFor('cash'), amount: 0 }); break;
      case 'OS': Object.assign(o, { whId: whFor('raw'), lines: [blank(type)] }); break;
      case 'ADJ': Object.assign(o, { whId: q.wh ? +q.wh : whFor('raw'), lines: [blank(type)] }); break;
      case 'STR': Object.assign(o, { whId: whFor('raw'), whTo: whFor('sp'), lines: [blank(type)] }); break;
      case 'CI': Object.assign(o, { whId: whFor('sp'), catId: null, lines: [blank(type)] }); break;
      case 'IP': Object.assign(o, { whId: whFor('raw'), whTo: whFor('fg'), itemId: null, qtyGood: 0, lines: [blank(type)] }); break;
      case 'MI': case 'MR': case 'PRC': case 'WL': {
        const wo = q.wo ? DB.get('orders', +q.wo) : null;
        Object.assign(o, { sid: wo ? wo.partyId : sid, woId: wo ? wo.id : null, whId: type === 'PRC' ? whFor('fg') : whFor('raw'), lines: [] });
        if (type === 'PRC') Object.assign(o, { itemId: wo ? wo.itemId : null, hours: 0, qtyGood: 0, qtyRejected: 0 });
        if (type === 'WL') Object.assign(o, { itemId: q.item ? +q.item : null, qty: 0, reason: '', charge: false, chargeAmount: 0 });
        if (type === 'MI' || type === 'MR') {
          const m = wo && DB.get('models', wo.modelId);
          o.lines = [Object.assign(blank(type), { itemId: m && m.yarnId ? m.yarnId : null, qty: type === 'MI' && m ? U.r2(wo.targetQty * m.yarnPerPiece * (1 + (m.wastePct || 0) / 100)) : 1 })];
          if (type === 'MR' && wo) { const c = E.custodyItems(wo.partyId).filter((x) => x.qty > 0); if (c.length) o.lines = c.map((x) => Object.assign(blank(type), { itemId: x.itemId, qty: x.qty })); }
        }
        if (type === 'PRC' && wo) o.lines = E.custodyItems(wo.partyId).filter((x) => x.qty > 0).map((x) => ({ kind: 'item', itemId: x.itemId, qty: 0 }));
        break;
      }
      case 'DJ': Object.assign(o, { sid, lines: q.models ? q.models.split(',').map((id) => ({ modelId: +id, amount: 0 })) : [{ modelId: null, amount: 0 }] }); break;
      case 'PAYR': {
        const t = U.today();
        Object.assign(o, { from: U.startOfMonth(t), to: U.endOfMonth(t), lines: [] });
        break;
      }
    }
    return o;
  }
  function loadInvoice(d, inv) {
    d.refId = inv.id; d.sid = inv.sid; d.taxId = inv.taxId; d.priceIncludesTax = inv.priceIncludesTax; d.whId = inv.whId;
    const prev = DB.s.docs.filter((x) => x.type === 'SR' && x.status === 'posted' && x.refId === inv.id);
    d.lines = inv.lines.filter((l) => l.kind !== 'expense').map((l) => {
      const ret = U.sum(prev.flatMap((p) => p.lines.filter((x) => x.itemId === l.itemId)), (x) => x.baseQty);
      return { kind: 'item', itemId: l.itemId, qty: Math.max(0, U.r3(l.baseQty - ret)), unit: 'base', price: l.baseQty ? +((inv.priceIncludesTax ? l.totalShare : l.netExTax) / l.baseQty).toFixed(4) : l.price, disc: 0, srcCostUnit: l.costUnit, maxQty: U.r3(l.baseQty - ret) };
    }).filter((l) => l.qty > 0);
    if (!d.lines.length) UI.toast('كل بنود هذه الفاتورة تم إرجاعها بالفعل', 'warning');
  }

  /* ───────── تعريف رأس كل مستند ───────── */
  const F = (f, t, label, o) => Object.assign({ f, t, label }, o || {});
  const HEAD = {
    SI: [F('sid', 'party', 'العميل', { arg: 'customer', req: true, wide: true }), F('date', 'date', 'التاريخ', { req: true }), F('whId', 'wh', 'المخزن', { req: true }), F('taxId', 'tax', 'الضريبة'), F('priceIncludesTax', 'check', 'الأسعار شاملة الضريبة', { show: (d) => !!d.taxId }), F('templateId', 'template', 'قالب الطباعة')],
    SR: [F('sid', 'party', 'العميل', { arg: 'customer', req: true, wide: true }), F('refId', 'invoice', 'الفاتورة الأصلية', { hint: 'اختيار الفاتورة يحمّل بنودها ويمنع إرجاع أكثر من المباع' }), F('date', 'date', 'التاريخ', { req: true }), F('whId', 'wh', 'المخزن', { req: true }), F('taxId', 'tax', 'الضريبة')],
    PI: [F('sid', 'party', 'المورد', { arg: 'supplier', req: true, wide: true }), F('supplierRef', 'text', 'رقم فاتورة المورد'), F('date', 'date', 'التاريخ', { req: true }), F('whId', 'wh', 'مخزن الاستلام', { req: true }), F('taxId', 'tax', 'الضريبة'), F('priceIncludesTax', 'check', 'الأسعار شاملة الضريبة', { show: (d) => !!d.taxId })],
    PR: [F('sid', 'party', 'المورد', { arg: 'supplier', req: true, wide: true }), F('date', 'date', 'التاريخ', { req: true }), F('whId', 'wh', 'المخزن', { req: true }), F('taxId', 'tax', 'الضريبة')],
    RC: [F('st', 'subjType', 'نوع الطرف'), F('sid', 'subject', 'المحصل منه', { req: true, wide: true }), F('date', 'date', 'التاريخ', { req: true }), F('amount', 'money', 'المبلغ', { req: true, big: true }), F('accountId', 'account', 'الخزينة / البنك المستلم', { req: true }), F('method', 'method', 'طريقة الاستلام'), F('chequeNo', 'text', 'رقم الشيك / التحويل', { show: (d) => d.method !== 'cash' }), F('allocId', 'openDoc', 'ربط بفاتورة (اختياري)', { show: (d) => d.st === 'party' && d.sid })],
    PY: [F('st', 'subjType', 'نوع الطرف'), F('sid', 'subject', 'المدفوع له', { req: true, wide: true }), F('purpose', 'purpose', 'نوع الدفعة'), F('date', 'date', 'التاريخ', { req: true }), F('amount', 'money', 'المبلغ', { req: true, big: true }), F('accountId', 'account', 'من خزينة / بنك', { req: true }), F('method', 'method', 'طريقة الدفع'), F('chequeNo', 'text', 'رقم الشيك / التحويل', { show: (d) => d.method !== 'cash' }), F('woId', 'order', 'أمر التشغيل (للورش)', { show: (d) => d.st === 'party' && isType(d.sid, 'workshop') }), F('allocId', 'openDoc', 'ربط بمستند (اختياري)', { show: (d) => d.st === 'party' && d.sid && d.purpose !== 'advance' })],
    EX: [F('catId', 'expcat', 'بند المصروف', { req: true, wide: true }), F('date', 'date', 'التاريخ', { req: true }), F('amount', 'money', 'المبلغ', { req: true, big: true }), F('payMode', 'payMode', 'طريقة السداد'), F('accountId', 'account', 'دُفع من', { req: true, show: (d) => d.payMode !== 'credit' }), F('method', 'method', 'وسيلة الدفع', { show: (d) => d.payMode !== 'credit' }), F('sid', 'party', 'المورد المستحق له', { arg: 'supplier', req: true, show: (d) => d.payMode === 'credit' }), F('beneficiary', 'text', 'المستفيد / الجهة', { wide: true }), F('attachment', 'file', 'صورة الإيصال')],
    IN: [F('catId', 'inccat', 'بند الإيراد', { req: true, wide: true }), F('date', 'date', 'التاريخ', { req: true }), F('amount', 'money', 'المبلغ', { req: true, big: true }), F('accountId', 'account', 'استُلم في', { req: true }), F('method', 'method', 'طريقة الاستلام'), F('source', 'text', 'المصدر', { wide: true })],
    TR: [F('accountId', 'account', 'من حساب', { req: true }), F('accountTo', 'account', 'إلى حساب', { req: true }), F('date', 'date', 'التاريخ', { req: true }), F('amount', 'money', 'المبلغ', { req: true, big: true })],
    OB: [F('st', 'subjType', 'نوع الطرف'), F('sid', 'subject', 'الطرف', { req: true, wide: true }), F('side', 'side', 'طبيعة الرصيد'), F('date', 'date', 'تاريخ الرصيد', { req: true }), F('amount', 'money', 'المبلغ', { req: true, big: true })],
    OA: [F('accountId', 'account', 'الخزينة / البنك', { req: true, wide: true }), F('date', 'date', 'تاريخ الرصيد', { req: true }), F('amount', 'money', 'المبلغ', { req: true, big: true })],
    OS: [F('whId', 'wh', 'المخزن', { req: true }), F('date', 'date', 'تاريخ الرصيد', { req: true })],
    ADJ: [F('whId', 'wh', 'المخزن', { req: true }), F('date', 'date', 'تاريخ الجرد', { req: true })],
    STR: [F('whId', 'wh', 'من مخزن', { req: true }), F('whTo', 'wh', 'إلى مخزن', { req: true }), F('date', 'date', 'التاريخ', { req: true })],
    CI: [F('whId', 'wh', 'من مخزن', { req: true }), F('catId', 'expcat', 'يُحمَّل على بند مصروف', { req: true, wide: true }), F('date', 'date', 'التاريخ', { req: true })],
    IP: [F('whId', 'wh', 'مخزن الخامات', { req: true }), F('whTo', 'wh', 'مخزن المنتج التام', { req: true }), F('itemId', 'item', 'المنتج التام', { req: true, arg: 'kind:finished', wide: true }), F('qtyGood', 'number', 'الكمية المنتجة', { req: true }), F('date', 'date', 'التاريخ', { req: true })],
    MI: [F('sid', 'party', 'الورشة / المصنع', { arg: 'workshop', req: true, wide: true }), F('woId', 'order', 'أمر التشغيل', { req: true, wide: true }), F('whId', 'wh', 'من مخزن', { req: true }), F('date', 'date', 'التاريخ', { req: true })],
    MR: [F('sid', 'party', 'الورشة / المصنع', { arg: 'workshop', req: true, wide: true }), F('woId', 'order', 'أمر التشغيل', { req: true, wide: true }), F('whId', 'wh', 'إلى مخزن', { req: true }), F('date', 'date', 'التاريخ', { req: true })],
    PRC: [F('sid', 'party', 'الورشة / المصنع', { arg: 'workshop', req: true, wide: true }), F('woId', 'order', 'أمر التشغيل', { req: true, wide: true }), F('date', 'date', 'تاريخ الاستلام', { req: true }), F('hours', 'number', 'ساعات التشغيل'), F('qtyGood', 'number', 'الكمية المقبولة'), F('qtyRejected', 'number', 'المرفوض (يرجع للورشة)'), F('itemId', 'item', 'صنف المنتج التام', { arg: 'kind:finished' }), F('whId', 'wh', 'مخزن الاستلام')],
    WL: [F('sid', 'party', 'الورشة / المصنع', { arg: 'workshop', req: true, wide: true }), F('woId', 'order', 'أمر التشغيل (اختياري)'), F('itemId', 'custodyItem', 'الخامة', { req: true }), F('qty', 'number', 'الكمية', { req: true }), F('date', 'date', 'التاريخ', { req: true }), F('reason', 'text', 'سبب التسوية', { req: true, wide: true }), F('charge', 'check', 'تحميل قيمة الفاقد على حساب الورشة'), F('chargeAmount', 'money', 'المبلغ المحمّل (فارغ = بالتكلفة)', { show: (d) => d.charge })],
    DJ: [F('sid', 'party', 'الرسام / المبرمج', { arg: 'designer', req: true, wide: true }), F('date', 'date', 'تاريخ التسليم', { req: true })],
    PAYR: [F('from', 'date', 'من تاريخ', { req: true }), F('to', 'date', 'إلى تاريخ', { req: true })],
  };
  const isType = (pid, t) => { const p = DB.get('parties', pid); return p && p.types.includes(t); };

  function headField(d, def) {
    if (def.show && !def.show(d)) return '';
    const v = d[def.f];
    const a = `data-f="${def.f}"`;
    let inp = '';
    switch (def.t) {
      case 'party': inp = UI.combo({ source: 'parties', arg: def.arg, value: v, attrs: a, placeholder: 'اكتب الاسم أو الكود…' }); break;
      case 'subject': inp = UI.combo({ source: d.st === 'worker' ? 'workers' : 'parties', value: v, attrs: a }); break;
      case 'subjType': inp = `<div class="btn-group">${[['party', 'عميل/مورد/ورشة'], ['worker', 'عامل']].map(([k, l]) => `<button type="button" class="btn sm ${d.st === k ? 'on' : ''}" data-act="ed-st" data-v="${k}">${l}</button>`).join('')}</div>`; break;
      case 'wh': inp = UI.sel('', UI.opts('warehouses'), v, { attrs: a, empty: '— اختر —' }); break;
      case 'account': inp = UI.combo({ source: 'accounts', value: v, attrs: a }); break;
      case 'date': inp = `<input type="date" class="input" value="${v || ''}" ${a}>`; break;
      case 'text': inp = `<input class="input" value="${esc(v || '')}" ${a}>`; break;
      case 'money': case 'number': inp = `<input class="input num" inputmode="decimal" value="${v ? v : ''}" placeholder="0" ${a} ${def.big ? 'style="font-size:16px;font-weight:700"' : ''}>`; break;
      case 'tax': inp = UI.sel('', DB.s.taxes.map((t) => [t.id, t.name]), v, { attrs: a, empty: 'بدون ضريبة' }); break;
      case 'template': inp = UI.sel('', DB.s.templates.map((t) => [t.id, t.name + (t.isDefault ? ' (افتراضي)' : '')]), v, { attrs: a }); break;
      case 'check': inp = `<label class="check" style="height:36px">${UI.sw('', !!v, a)} <span class="small">${def.label}</span></label>`; return `<div class="field">${'<label>&nbsp;</label>'}${inp}</div>`;
      case 'method': inp = UI.sel('', Object.entries(E.PAY_METHODS), v, { attrs: a }); break;
      case 'purpose': inp = UI.sel('', [['payment', 'دفعة / سداد مستحق'], ['advance', 'سلفة مقدمة']], v, { attrs: a }); break;
      case 'payMode': inp = `<div class="btn-group">${[['paid', 'مدفوع الآن'], ['credit', 'آجل على مورد']].map(([k, l]) => `<button type="button" class="btn sm ${d.payMode === k ? 'on' : ''}" data-act="ed-set" data-f="payMode" data-v="${k}">${l}</button>`).join('')}</div>`; break;
      case 'side': inp = `<div class="btn-group">${[['debit', 'عليه لنا (مدين)'], ['credit', 'له علينا (دائن)']].map(([k, l]) => `<button type="button" class="btn sm ${d.side === k ? 'on' : ''}" data-act="ed-set" data-f="side" data-v="${k}">${l}</button>`).join('')}</div>`; break;
      case 'expcat': inp = UI.combo({ source: 'expenseCats', value: v, attrs: a, placeholder: 'كهرباء، شمع، إبر… (أو اكتب بندًا جديدًا)' }); break;
      case 'inccat': inp = UI.combo({ source: 'incomeCats', value: v, attrs: a }); break;
      case 'item': inp = UI.combo({ source: 'items', arg: def.arg || '', value: v, attrs: a }); break;
      case 'order': inp = UI.combo({ source: 'orders', arg: d.sid || '', value: v, attrs: a, placeholder: d.sid ? 'اختر أمر التشغيل المفتوح…' : 'اختر الورشة أولًا' }); break;
      case 'invoice': inp = UI.combo({ source: 'invoices', arg: d.sid || '', value: v, attrs: a, placeholder: 'رقم الفاتورة…' }); break;
      case 'openDoc': {
        const oi = d.sid ? E.openItems('party', d.sid) : null;
        const open = oi ? [...oi.map.values()].filter((x) => x.remaining > 0.004) : [];
        inp = UI.sel('', open.map((x) => { const od = DB.get('docs', x.docId); return [x.docId, `${E.docNo(od)} — متبقي ${U.money(x.remaining)}`]; }), v, { attrs: a, empty: 'توزيع تلقائي على الأقدم (FIFO)' });
        break;
      }
      case 'custodyItem': {
        const c = d.sid ? E.custodyItems(d.sid).filter((x) => x.qty > 0) : [];
        inp = UI.sel('', c.map((x) => [x.itemId, `${E.nameOf('items', x.itemId)} — عهدة ${U.qty(x.qty)}`]), v, { attrs: a, empty: c.length ? '— اختر —' : 'لا توجد عهدة لدى الورشة' });
        break;
      }
      case 'file': inp = `<div class="row">${v ? `<a href="${v}" target="_blank" class="btn sm">${icon('image')} عرض</a><button class="btn sm ghost" data-act="ed-set" data-f="attachment" data-v="">${icon('x')}</button>` : `<label class="btn sm">${icon('upload')} إرفاق صورة<input type="file" accept="image/*" data-file="attachment" hidden></label>`}</div>`; break;
    }
    return UI.field(def.label, inp, { req: def.req, cls: def.wide ? 'wide' : '', hint: def.hint });
  }

  /* ───────── أعمدة البنود ───────── */
  const LCOLS = {
    trade: (d) => [
      { k: 'item', label: 'الصنف', w: '34%' }, { k: 'avail', label: 'المتاح', w: '80px' }, { k: 'qty', label: 'الكمية', w: '90px' }, { k: 'unit', label: 'الوحدة', w: '100px' },
      { k: 'price', label: d.type === 'PI' || d.type === 'PR' ? 'سعر الشراء' : 'السعر', w: '110px' }, { k: 'disc', label: 'خصم %', w: '70px' }, { k: 'net', label: 'الإجمالي', w: '120px' },
    ],
    OS: () => [{ k: 'item', label: 'الصنف', w: '45%' }, { k: 'qty', label: 'الكمية', w: '110px' }, { k: 'cost', label: 'تكلفة الوحدة', w: '120px' }, { k: 'value', label: 'القيمة', w: '120px' }],
    ADJ: () => [{ k: 'item', label: 'الصنف', w: '40%' }, { k: 'system', label: 'رصيد النظام', w: '110px' }, { k: 'qty', label: 'المعدود فعليًا', w: '120px' }, { k: 'diff', label: 'الفرق', w: '100px' }, { k: 'dvalue', label: 'قيمة الفرق', w: '110px' }],
    move: () => [{ k: 'item', label: 'الصنف / الخامة', w: '50%' }, { k: 'avail', label: 'المتاح', w: '110px' }, { k: 'qty', label: 'الكمية', w: '120px' }, { k: 'uom', label: 'الوحدة', w: '80px' }, { k: 'estv', label: 'القيمة التقديرية', w: '120px' }],
    PRC: () => [{ k: 'item', label: 'الخامة المستهلكة من العهدة', w: '45%' }, { k: 'avail', label: 'في العهدة', w: '110px' }, { k: 'qty', label: 'المستهلك (كجم)', w: '130px' }, { k: 'estv', label: 'التكلفة', w: '120px' }],
    DJ: () => [{ k: 'model', label: 'الموديل', w: '60%' }, { k: 'dstat', label: 'الحالة', w: '160px' }, { k: 'amount', label: 'تكلفة الرسم/البرمجة', w: '160px' }],
  };
  const lineKind = (t) => (['SI', 'SR', 'PI', 'PR'].includes(t) ? 'trade' : ['MI', 'MR', 'STR', 'CI', 'IP'].includes(t) ? 'move' : t);
  const availOf = (d, l) => {
    if (!l.itemId) return null;
    if (d.type === 'MR' || d.type === 'PRC') return d.sid ? E.custodyQty(d.sid, l.itemId) : 0;
    if (d.type === 'PI' || d.type === 'SR') return E.onHand(l.itemId, d.whId);
    return E.onHand(l.itemId, d.whId);
  };
  function lineCell(d, l, i, c) {
    const it = l.itemId ? DB.get('items', l.itemId) : null;
    const a = (k) => `data-l="${k}" data-i="${i}"`;
    const numIn = (k, val, ro) => `<input class="input num" inputmode="decimal" value="${val === '' || val == null ? '' : val}" ${a(k)} ${ro ? 'readonly tabindex="-1"' : ''}>`;
    switch (c.k) {
      case 'item': {
        if (l.kind === 'expense') return `<div class="row gap-4">${UI.combo({ source: 'expenseCats', value: l.catId, attrs: a('catId'), placeholder: 'بند مصروف مباشر…' })}<input class="input" style="max-width:45%" placeholder="وصف" value="${esc(l.desc || '')}" ${a('desc')}></div>`;
        const arg = d.type === 'PRC' || d.type === 'MR' ? '' : d.whId ? 'wh:' + d.whId : '';
        return UI.combo({ source: 'items', arg, value: l.itemId, attrs: a('itemId'), placeholder: 'اكتب اسم/كود الصنف…' });
      }
      case 'avail': {
        const av = availOf(d, l);
        if (av == null || l.kind === 'expense') return '';
        const need = U.num(l.qty) * E.unitFactor(l);
        const out = ['SI', 'PR', 'MI', 'MR', 'STR', 'CI', 'IP', 'PRC'].includes(d.type);
        const short = out && need > av + 0.0005;
        return `<span class="num ${short ? 'neg bold' : 'muted'}" title="${short ? 'الكمية أكبر من المتاح' : 'الرصيد الحالي'}">${U.qty(av)}</span>`;
      }
      case 'qty': return numIn('qty', l.qty);
      case 'unit': {
        if (l.kind === 'expense') return '<span class="muted small">خدمة</span>';
        if (!it) return '';
        return it.altUnit && it.altFactor ? `<select class="input" ${a('unit')}><option value="base" ${l.unit !== 'alt' ? 'selected' : ''}>${esc(it.unit)}</option><option value="alt" ${l.unit === 'alt' ? 'selected' : ''}>${esc(it.altUnit)} (${U.qty(it.altFactor)})</option></select>` : `<span class="small text-2" style="padding:0 8px">${esc(it.unit)}</span>`;
      }
      case 'uom': return it ? `<span class="small text-2">${esc(it.unit)}</span>` : '';
      case 'price': {
        const locked = d.type === 'SI' && !E.can('edit_prices') && l.unit !== 'alt';
        return numIn('price', l.price, locked);
      }
      case 'disc': return numIn('disc', l.disc || '');
      case 'net': return `<span class="num">${U.money(l.net || 0)}</span>`;
      case 'cost': return numIn('cost', l.cost);
      case 'value': return `<span class="num">${U.money(U.num(l.qty) * U.num(l.cost))}</span>`;
      case 'system': return l.itemId ? `<span class="num text-2">${U.qty(E.onHand(l.itemId, d.whId))}</span>` : '';
      case 'diff': { if (!l.itemId || l.qty === '' || l.qty == null) return ''; const df = U.r3(U.num(l.qty) - E.onHand(l.itemId, d.whId)); return `<span class="num bold ${df < 0 ? 'neg' : df > 0 ? 'pos' : 'muted'}">${df > 0 ? '+' : ''}${U.qty(df)}</span>`; }
      case 'dvalue': { if (!l.itemId || l.qty === '' || l.qty == null) return ''; const df = U.num(l.qty) - E.onHand(l.itemId, d.whId); return `<span class="num ${df < 0 ? 'neg' : ''}">${U.money(df * E.avgCost(l.itemId))}</span>`; }
      case 'estv': { if (!l.itemId) return ''; const c2 = d.type === 'MR' || d.type === 'PRC' ? E.custodyAvg(d.sid, l.itemId) : E.avgCost(l.itemId); return `<span class="num muted">${U.money(U.num(l.qty) * c2)}</span>`; }
      case 'model': return UI.combo({ source: 'models', value: l.modelId, attrs: a('modelId'), placeholder: 'كود أو اسم الموديل…' });
      case 'dstat': { if (!l.modelId) return ''; const ds = E.modelDesign(l.modelId); return ds.status === 'none' || (ds.job && ds.job.id === d.id) ? '<span class="pill plain">جديد</span>' : `<span class="pill warn" title="${esc(ds.label)}">مسند سابقًا</span>`; }
      case 'amount': return numIn('amount', l.amount);
    }
    return '';
  }

  /* ───────── المحرر ───────── */
  const ED = { d: null, orig: '', errors: null };
  const dirty = () => { App.setDirty(JSON.stringify(ED.d) !== ED.orig); App._guardHash = location.hash; };

  function editorHTML() {
    const d = ED.d;
    const t = T()[d.type];
    E.calcDoc(d);
    const lk = lineKind(d.type);
    const hasLines = !!LCOLS[lk] && d.type !== 'PAYR';
    const back = Object.entries(Pages.DOC_LISTS).find(([, v]) => v.types.includes(d.type));
    const can = E.can(t.perm);
    return `
    <div class="page-h">
      <div class="titles"><div class="crumbs">${back ? `<a href="#/${back[0]}">${back[1].title}</a> ‹` : ''} <span>${d.id ? 'تعديل مسودة' : 'مستند جديد'}</span></div>
        <h1>${icon(t.icon)} ${t.label} ${d.id ? `<span class="pill draft">مسودة #${d.id}</span>` : '<span class="pill plain">جديد</span>'} ${d.copyOf ? `<span class="tag">نسخة من ${esc(E.docNo(DB.get('docs', d.copyOf)))}</span>` : ''}</h1>
      </div>
      <div class="actions">
        ${d.id ? `<button class="btn ghost danger" data-act="ed-delete">${icon('trash')} حذف المسودة</button>` : ''}
        ${['SI', 'SR', 'PI', 'PR', 'RC', 'PY'].includes(d.type) ? `<button class="btn" data-act="ed-print">${icon('printer')} معاينة ${UI.k('mod+p')}</button>` : ''}
      </div>
    </div>
    ${!can ? `<div class="notice warn mb-16">${icon('lock')}<div>ليس لديك صلاحية ${esc(E.PERMS[t.perm])} — يمكنك المشاهدة فقط.</div></div>` : ''}
    <div id="ed-errors"></div>
    <div class="doc-layout">
      <div class="col gap-16" style="min-width:0">
        <div class="card"><div class="doc-head" id="ed-head">${HEAD[d.type].map((f) => headField(d, f)).join('')}</div></div>
        ${d.type === 'PAYR' ? `<div class="card" id="ed-payroll">${payrollGrid(d)}</div>` : ''}
        ${hasLines ? `<div class="card"><div class="card-h"><h3>${d.type === 'DJ' ? 'الموديلات المسلمة' : d.type === 'PRC' ? 'استهلاك الخامات' : 'البنود'}</h3><span class="sub" id="ed-count"></span><span class="grow"></span>${linesTools(d)}</div>
          <div class="tbl-wrap"><table class="lines" id="ed-lines"></table></div>
          <div class="add-line"><button class="btn sm" data-act="ed-add">${icon('plus')} إضافة بند</button>${d.type === 'PI' || d.type === 'PR' ? `<button class="btn sm ghost" data-act="ed-add-exp">${icon('wallet')} بند مصروف مباشر</button>` : ''}<span class="grow"></span><span>${UI.k('Enter')} للتنقل · ${UI.k('alt+l')} بند جديد · ${UI.k('mod+Delete')} حذف بند</span></div>
        </div>` : ''}
        ${['SI', 'SR', 'PI', 'PR'].includes(d.type) ? `<div class="card"><div class="totals" id="ed-totals"></div></div>` : ''}
        <div class="card"><div class="card-b">${UI.field('ملاحظات', `<textarea class="input" data-f="notes" rows="2" placeholder="تظهر في المستند المطبوع">${esc(d.notes || '')}</textarea>`)}</div></div>
      </div>
      <div class="doc-side" id="ed-side"></div>
    </div>
    <div class="sticky-actions">
      <button class="btn primary" data-act="ed-post" ${!can || !E.can('post') ? 'disabled' : ''}>${icon('check')} اعتماد ${UI.k('mod+enter')}</button>
      <button class="btn" data-act="ed-save" ${!can ? 'disabled' : ''}>حفظ كمسودة ${UI.k('mod+s')}</button>
      <span class="grow"></span>
      <span class="small muted" id="ed-dirty"></span>
      <button class="btn ghost" data-act="ed-cancel">إلغاء</button>
    </div>`;
  }
  function linesTools(d) {
    if (d.type === 'ADJ') return `<button class="btn sm" data-act="ed-load-wh">${icon('download')} تحميل كل أصناف المخزن</button>`;
    if (d.type === 'SR') return d.refId ? `<button class="btn sm" data-act="ed-load-inv">${icon('undo')} إعادة تحميل بنود الفاتورة</button>` : '';
    if (d.type === 'PRC') return `<button class="btn sm" data-act="ed-suggest">${icon('zap')} حساب الاستهلاك المعياري</button>`;
    if (d.type === 'DJ') return `<div class="row"><input class="input num" style="width:110px;height:30px" placeholder="سعر موحد" id="dj-rate"><button class="btn sm" data-act="ed-dj-rate">تطبيق على الكل</button><button class="btn sm" data-act="ed-dj-new">${icon('plus')} كل الموديلات غير المرسومة</button></div>`;
    return '';
  }
  function renderLines() {
    const d = ED.d;
    const el = document.getElementById('ed-lines');
    if (!el) return;
    const cols = LCOLS[lineKind(d.type)](d);
    el.innerHTML = `<thead><tr><th class="idx">#</th>${cols.map((c) => `<th style="width:${c.w}" class="${['qty', 'price', 'disc', 'net', 'cost', 'value', 'system', 'diff', 'dvalue', 'avail', 'estv', 'amount'].includes(c.k) ? 'num' : ''}">${c.label}</th>`).join('')}<th style="width:40px"></th></tr></thead>
      <tbody>${d.lines.map((l, i) => `<tr data-row="${i}">${`<td class="idx">${i + 1}</td>`}${cols.map((c) => `<td class="${['net', 'value', 'diff', 'dvalue', 'estv', 'system'].includes(c.k) ? 'calc' : c.k === 'avail' ? 'avail' : ''}" data-c="${c.k}">${lineCell(d, l, i, c)}</td>`).join('')}<td><button class="btn ghost xs icon rm" data-act="ed-rm" data-i="${i}" tabindex="-1" title="حذف البند">${icon('x')}</button></td></tr>`).join('')}</tbody>`;
    const cnt = document.getElementById('ed-count');
    if (cnt) cnt.textContent = d.lines.filter((l) => l.itemId || l.catId || l.modelId).length + ' بند';
  }
  function updateLineCalcs() {
    const d = ED.d;
    const colsFn = LCOLS[lineKind(d.type)];
    if (!colsFn || !document.getElementById('ed-lines')) return;
    const cols = colsFn(d);
    document.querySelectorAll('#ed-lines tbody tr').forEach((tr) => {
      const i = +tr.dataset.row, l = d.lines[i];
      if (!l) return;
      tr.querySelectorAll('td[data-c]').forEach((td) => {
        const c = cols.find((x) => x.k === td.dataset.c);
        if (['net', 'value', 'diff', 'dvalue', 'estv', 'avail', 'system', 'dstat'].includes(c.k)) td.innerHTML = lineCell(d, l, i, c);
      });
    });
  }
  function renderTotals() {
    const d = ED.d, el = document.getElementById('ed-totals');
    if (!el) return;
    const t = d.totals;
    const isIn = d.type === 'SI' || d.type === 'PR';
    const paidLbl = { SI: 'المحصل الآن', SR: 'المردود نقدًا للعميل', PI: 'المدفوع الآن', PR: 'المسترد نقدًا من المورد' }[d.type];
    const rem = U.r2(t.total - U.num(d.paid));
    el.innerHTML = `
      <div class="t-row"><span>الإجمالي قبل الخصم</span><span class="num">${U.money(t.sub)}</span></div>
      <div class="t-row"><span>خصم على الفاتورة</span><input class="input num" data-f="discount" value="${d.discount || ''}" placeholder="0"></div>
      ${t.taxRate ? `<div class="t-row"><span>${esc(t.taxName)} ${d.priceIncludesTax ? '<span class="tag">مضمنة في السعر</span>' : ''}</span><span class="num">${U.money(t.tax)}</span></div>` : ''}
      <div class="t-row grand"><span>الإجمالي النهائي</span><span class="num">${U.money(t.total)} <small>${UI.cur()}</small></span></div>
      <div class="t-row" style="flex-wrap:wrap"><span>${paidLbl}</span><div class="row wrap" style="justify-content:flex-end">
        <button class="btn xs ghost" data-act="ed-paid-all">${isIn ? 'تحصيل' : 'سداد'} الكل</button>
        <input class="input num" data-f="paid" value="${d.paid || ''}" placeholder="0" style="width:130px">
        <div style="width:200px">${UI.combo({ source: 'accounts', value: d.accountId, attrs: 'data-f="accountId"', placeholder: 'الخزينة/البنك' })}</div>
        ${UI.sel('', Object.entries(E.PAY_METHODS), d.method, { attrs: 'data-f="method" style="width:130px"' })}
      </div></div>
      <div class="t-row"><span>${d.type === 'SI' ? 'المتبقي على العميل (آجل)' : d.type === 'PI' ? 'المتبقي للمورد (آجل)' : 'المتبقي'}</span><span class="num bold ${rem > 0 ? 'neg' : rem < 0 ? 'warn' : 'pos'}">${U.money(rem)}</span></div>
      ${rem < -0.004 ? `<div class="notice danger" style="margin:6px 16px 10px">${icon('alert')}<div>المبلغ المدفوع أكبر من الإجمالي — سجّل الزيادة كسند مستقل.</div></div>` : ''}`;
  }
  function renderSide() {
    const el = document.getElementById('ed-side');
    if (el) el.innerHTML = Pages.sidePanel(ED.d, true);
    const dl = document.getElementById('ed-dirty');
    if (dl) dl.textContent = App.dirty ? '● تغييرات غير محفوظة' : '';
  }
  function renderHead() {
    const h = document.getElementById('ed-head');
    if (h) h.innerHTML = HEAD[ED.d.type].map((f) => headField(ED.d, f)).join('');
  }
  function recalc(parts) {
    E.calcDoc(ED.d);
    dirty();
    if (parts.includes('lines')) renderLines(); else updateLineCalcs();
    if (parts.includes('head')) renderHead();
    if (parts.includes('payroll')) { const p = document.getElementById('ed-payroll'); if (p) p.innerHTML = payrollGrid(ED.d); }
    else updatePayrollCalcs();
    renderTotals();
    renderSide();
  }

  /* شبكة مسير الأجور */
  function payrollGrid(d) {
    const rows = d.lines;
    return `<div class="card-h"><h3>عمال المسير</h3><span class="sub">${rows.length} عامل</span><span class="grow"></span>
      <button class="btn sm primary" data-act="ed-payr-gen">${icon('zap')} ${rows.length ? 'إعادة' : ''} احتساب الأجور للفترة</button></div>
      ${rows.length ? `<div class="tbl-wrap"><table class="lines"><thead><tr><th>العامل</th><th>القسم</th><th>أساس الحساب</th><th class="num">الأجر المحسوب</th><th class="num">إضافي/مكافأة</th><th class="num">خصومات</th><th class="num">صافي الاستحقاق</th><th class="num" title="سلف قائمة على العامل ستُخصم تلقائيًا من رصيده">سلف قائمة</th><th class="num">صافي الصرف المتوقع</th><th></th></tr></thead><tbody>
      ${rows.map((l, i) => { const w = DB.get('workers', l.workerId); return `<tr data-row="${i}"><td style="white-space:nowrap;min-width:150px"><b>${esc(w ? w.name : '')}</b><div class="tiny muted">${esc(E.PAY_TYPES[l.payType] || '')}</div></td><td class="small">${esc(E.nameOf('departments', l.deptId))}</td><td class="small text-2" style="white-space:normal;max-width:260px">${esc(l.basis)}</td>
        <td style="width:110px"><input class="input num" data-pl="gross" data-i="${i}" value="${l.gross}"></td><td style="width:100px"><input class="input num" data-pl="bonus" data-i="${i}" value="${l.bonus || ''}" placeholder="0"></td><td style="width:100px"><input class="input num" data-pl="deduction" data-i="${i}" value="${l.deduction || ''}" placeholder="0"></td>
        <td class="calc" data-pc="net">${U.money(l.net)}</td><td class="calc muted">${l.advance ? U.money(l.advance) : '—'}</td><td class="calc" data-pc="cash">${U.money(Math.max(0, l.net - (l.advance || 0)))}</td>
        <td><button class="btn ghost xs icon rm" data-act="ed-payr-rm" data-i="${i}" tabindex="-1">${icon('x')}</button></td></tr>`; }).join('')}
      </tbody><tfoot><tr><td colspan="3"><b>الإجمالي</b></td><td class="num" data-pt="gross">${U.money(d.totals.gross)}</td><td class="num" data-pt="bonus">${U.money(d.totals.bonus)}</td><td class="num" data-pt="deduction">${U.money(d.totals.deduction)}</td><td class="num" data-pt="total"><b>${U.money(d.totals.total)}</b></td><td></td><td></td><td></td></tr></tfoot></table></div>`
      : `<div class="card-b">${UI.empty('حدد الفترة ثم اضغط "احتساب الأجور"', 'يُحسب أجر كل عامل حسب نوعه: أسبوعي/شهري ثابت، يومية، بالساعة، أو بالإنتاج من اليوميات المسجلة غير المحتسبة', 'users')}</div>`}`;
  }
  function updatePayrollCalcs() {
    const d = ED.d;
    if (d.type !== 'PAYR') return;
    document.querySelectorAll('#ed-payroll tbody tr').forEach((tr) => {
      const l = d.lines[+tr.dataset.row];
      tr.querySelector('[data-pc="net"]').textContent = U.money(l.net);
      tr.querySelector('[data-pc="cash"]').textContent = U.money(Math.max(0, l.net - (l.advance || 0)));
    });
    ['gross', 'bonus', 'deduction', 'total'].forEach((k) => { const c = document.querySelector(`#ed-payroll [data-pt="${k}"]`); if (c) c.innerHTML = k === 'total' ? `<b>${U.money(d.totals[k])}</b>` : U.money(d.totals[k]); });
  }

  /* ───────── اللوحة الجانبية (معلومات حية) ───────── */
  Pages.sidePanel = (d, live) => {
    const out = [];
    const t = d.totals || {};
    const card = (title, body, ic) => `<div class="card"><div class="card-h"><h3>${ic ? icon(ic) : ''} ${title}</h3></div>${body}</div>`;
    const row = (a, b) => `<div class="i-row"><span>${a}</span><span>${b}</span></div>`;
    // رصيد الطرف قبل/بعد
    const subj = d.sid ? subjOf(d) : null;
    if (subj && ['SI', 'SR', 'PI', 'PR', 'RC', 'PY', 'OB', 'EX', 'PRC', 'DJ', 'WL'].includes(d.type) && (d.type !== 'EX' || d.payMode === 'credit')) {
      const st = d.st || 'party';
      const before = live || d.status !== 'posted' ? E.balance(st, d.sid) : E.balance(st, d.sid) - effectNet(d, st);
      const delta = live ? previewDelta(d) : effectNet(d, st);
      const after = U.r2(before + delta);
      const kind = st === 'worker' ? 'worker' : null;
      out.push(card(esc(subj.name), `<div class="info-list">
        ${row('الكود', `<span class="code">${esc(subj.code)}</span>`)}
        ${subj.phone ? row('الهاتف', `<span class="ltr">${esc(subj.phone)}</span>`) : ''}
        ${row(live ? 'الرصيد الحالي' : 'الرصيد قبل المستند', UI.bal(before, kind))}
        ${row('أثر هذا المستند', `<span class="num ${delta > 0 ? '' : ''}">${delta > 0 ? '+' : ''}${U.money(delta)}</span>`)}
        ${row(live ? 'الرصيد بعد الاعتماد' : 'الرصيد بعد المستند', `<b>${UI.bal(after, kind)}</b>`)}
      </div><div class="card-f row"><a class="btn sm" href="#/${st === 'worker' ? 'worker' : 'party'}/${d.sid}">${icon('file')} كشف الحساب</a></div>`, 'user'));
    }
    // تحذيرات المخزون
    if (live && ['SI', 'PR', 'MI', 'STR', 'CI', 'IP'].includes(d.type) && d.whId) {
      const need = new Map();
      d.lines.filter((l) => l.itemId && l.kind !== 'expense').forEach((l) => need.set(l.itemId, (need.get(l.itemId) || 0) + U.num(l.qty) * E.unitFactor(l)));
      const short = [...need].filter(([id, q]) => q > E.onHand(id, d.whId) + 0.0005);
      if (short.length) out.push(`<div class="notice danger">${icon('alert')}<div><b>الرصيد غير كافٍ</b><ul>${short.map(([id, q]) => `<li>${esc(E.nameOf('items', id))}: مطلوب ${U.qty(q)} والمتاح ${U.qty(E.onHand(id, d.whId))}</li>`).join('')}</ul>
        ${E.can('negative_stock') && !DB.s.settings.allowNegativeStock ? `<label class="check mt-8 small n-body">${UI.sw('', !!d.overrideNegative, 'data-f="overrideNegative"')} السماح بالتجاوز كاستثناء (موثق في السجل)</label>` : '<div class="small n-body mt-8">لن يُسمح بالاعتماد حتى يتوفر الرصيد.</div>'}</div></div>`);
    }
    // نسبة السداد للمستند المعتمد
    if (!live && d.status === 'posted') {
      const ps = E.payStatus(d);
      if (ps && ps.total > 0) {
        const pc = Math.round((ps.paid / ps.total) * 100);
        out.push(card('حالة السداد', `<div class="pay-meter"><div class="row between small"><span>${UI.payPill(ps)}</span><b class="num">${pc}%</b></div><div class="meter ${pc >= 100 ? '' : pc > 0 ? 'warn' : 'danger'}"><i style="width:${pc}%"></i></div><div class="row between small mt-8"><span class="muted">مسدد <span class="num">${U.money(ps.paid)}</span></span><span class="muted">متبقي <b class="num">${U.money(ps.remaining)}</b></span></div></div>`, 'wallet'));
      }
    }
    // ربحية فاتورة البيع
    if (d.type === 'SI' && t.net) {
      const cogs = live ? U.sum(d.lines.filter((l) => l.itemId), (l) => (l.baseQty || 0) * E.avgCost(l.itemId)) : (d.calc && d.calc.cogs) || 0;
      const profit = U.r2(t.net - cogs);
      out.push(card('ربحية الفاتورة', `<div class="info-list">${row('صافي المبيعات (بدون ضريبة)', UI.money(t.net))}${row('تكلفة البضاعة (متوسط مرجح)', UI.money(cogs))}${row('مجمل الربح', `<b class="num ${profit < 0 ? 'neg' : 'pos'}">${U.money(profit)}</b>`)}${row('هامش الربح', `<span class="num">${t.net ? Math.round((profit / t.net) * 100) : 0}%</span>`)}</div>`, 'trend'));
    }
    // أوامر التشغيل
    if (['MI', 'MR', 'PRC', 'WL', 'PY'].includes(d.type) && d.woId && DB.get('orders', d.woId)) {
      const sm = E.orderSummary(d.woId), o = sm.wo, m = DB.get('models', o.modelId);
      out.push(card('أمر التشغيل ' + esc(o.no), `<div class="card-b" style="padding-bottom:6px"><div class="row between small mb-8"><span>${esc(m ? m.code + ' — ' + m.name : '')}</span><span class="num">${U.int(sm.qtyGood)} / ${U.int(o.targetQty)}</span></div><div class="meter"><i style="width:${sm.progress}%"></i></div></div>
        <div class="info-list">${row('طريقة الحساب', E.RULES[o.rule])}${row('الخامة المسلمة', UI.qty(sm.issued) + ' كجم')}${row('المستهلك', UI.qty(sm.consumed) + ' كجم')}${row('في العهدة حاليًا', `<b class="num">${U.qty(sm.inCustody)}</b> كجم`)}${row('الساعات', UI.qty(sm.hours))}${row('المصنعية المستحقة', UI.money(sm.fees))}${row('السلف', UI.money(sm.advances))}</div>
        <div class="card-f"><a class="btn sm" href="#/order/${o.id}">${icon('layers')} فتح أمر التشغيل</a></div>`, 'layers'));
    }
    // حساب المصنعية
    if (d.type === 'PRC' && d.calc) {
      const c = d.calc;
      const wo = DB.get('orders', d.woId), m = wo && DB.get('models', wo.modelId);
      const expected = m ? U.r3(U.num(d.qtyGood) * m.yarnPerPiece) : 0;
      const allowed = m ? U.r3(expected * (1 + (m.wastePct || 0) / 100)) : 0;
      const cons = U.sum(d.lines, (l) => U.num(l.qty));
      const over = cons > allowed + 0.001 && expected > 0;
      const mat = live ? U.sum(d.lines.filter((l) => l.itemId), (l) => U.num(l.qty) * E.custodyAvg(d.sid, l.itemId)) : c.materialCost || 0;
      out.push(card('حساب المصنعية', `<div class="card-b"><div class="small muted">المعادلة</div><div class="num bold" style="font-size:16px;text-align:right;margin:4px 0 6px">${esc(c.formula)}</div><div class="tiny muted">${esc(c.rateSrc || 'لا يوجد سعر ساري — عرّفه من أسعار المصنعية')}</div></div>
        <div class="info-list">${row('تكلفة الخامات المستهلكة', UI.money(mat))}${row('المصنعية', UI.money(c.fee))}${U.num(d.qtyGood) > 0 ? row('تكلفة القطعة الواحدة', `<b class="num">${U.money((mat + c.fee) / U.num(d.qtyGood))}</b>`) : ''}</div>`, 'clock'));
      if (expected) out.push(`<div class="notice ${over ? 'warn' : 'ok'}">${icon(over ? 'alert' : 'checkCircle')}<div><b>مطابقة الاستهلاك</b><div class="n-body small">المعياري ${U.qty(expected)} كجم + هالك ${m.wastePct}% = ${U.qty(allowed)} كجم · المسجل ${U.qty(cons)} كجم${over ? `<br>زيادة ${U.qty(cons - allowed)} كجم تحتاج مراجعة (لا تعني سرقة تلقائيًا)` : ''}</div></div></div>`);
    }
    // العهدة
    if (['MI', 'MR', 'PRC', 'WL'].includes(d.type) && d.sid) {
      const c = E.custodyItems(d.sid).filter((x) => Math.abs(x.qty) > 0.0005);
      out.push(card('عهدة الورشة حاليًا', c.length ? `<div class="info-list">${c.map((x) => row(esc(E.nameOf('items', x.itemId)), `<span class="num">${U.qty(x.qty)}</span> <span class="tiny muted">${U.money(x.value)}</span>`)).join('')}</div>` : '<div class="card-b muted small">لا توجد خامات في عهدة الورشة</div>', 'yarn'));
    }
    // الخزينة
    if (['RC', 'PY', 'EX', 'IN', 'TR', 'OA'].includes(d.type) && d.accountId && (d.type !== 'EX' || d.payMode !== 'credit')) {
      const a = DB.get('accounts', d.accountId);
      const b = E.cashBalance(d.accountId);
      const sign = ['RC', 'IN', 'OA'].includes(d.type) ? 1 : -1;
      const after = U.r2(b + (live ? sign * U.num(d.amount) : 0));
      out.push(card(esc(a ? a.name : ''), `<div class="info-list">${row('الرصيد الحالي', UI.money(b))}${live ? row('بعد الاعتماد', `<b class="num ${after < 0 ? 'neg' : ''}">${U.money(after)}</b>`) : ''}${d.type === 'TR' && d.accountTo ? row(esc(E.nameOf('accounts', d.accountTo)), UI.money(E.cashBalance(d.accountTo))) : ''}</div>`, 'bank'));
      if (live && after < 0 && !DB.s.settings.allowNegativeCash) out.push(`<div class="notice danger">${icon('alert')}<div>رصيد الخزينة لا يكفي — لن يُسمح بالاعتماد.</div></div>`);
    }
    // الفواتير المفتوحة للطرف
    if (live && ['RC', 'PY'].includes(d.type) && d.st === 'party' && d.sid) {
      const oi = E.openItems('party', d.sid);
      const open = [...oi.map.values()].filter((x) => x.remaining > 0.004).slice(0, 8);
      if (open.length) out.push(card('مستندات غير مسددة', `<div class="info-list">${open.map((x) => { const od = DB.get('docs', x.docId); return `<div class="i-row" style="cursor:pointer" data-act="ed-alloc" data-id="${x.docId}" data-amt="${x.remaining}" title="اضغط لتخصيص الدفعة لهذا المستند"><span><span class="code">${esc(E.docNo(od))}</span> <span class="tiny muted">${U.date(od.date)}</span></span><span class="num">${U.money(x.remaining)}</span></div>`; }).join('')}</div><div class="card-f tiny muted">اضغط على مستند لتخصيص الدفعة له وملء المبلغ</div>`, 'file'));
    }
    if (d.type === 'PAYR' && live) out.push(`<div class="notice info">${icon('info')}<div class="n-body small">بعد الاعتماد يُسجل صافي أجر كل عامل كمستحق له، وتُخصم السلف تلقائيًا من رصيده. ثم اضغط "صرف الكل" من صفحة المسير لصرف المستحق دفعة واحدة.</div></div>`);
    if (d.type === 'OB' && live) out.push(`<div class="notice info">${icon('info')}<div class="n-body small">"عليه لنا" = الطرف مدين للمصنع (مثل عميل لم يسدد). "له علينا" = المصنع مدين للطرف (مثل مورد أو ورشة لها مستحقات).</div></div>`);
    if (d.type === 'EX' && live) out.push(`<div class="notice info">${icon('info')}<div class="n-body small">المصروف لا يظهر أبدًا ضمن المبيعات أو التحصيلات. ${d.payMode === 'credit' ? 'المصروف الآجل يُسجل مستحقًا للمورد ولا يخصم من الخزينة الآن.' : ''}</div></div>`);
    if (d.type === 'CI' && live) out.push(`<div class="notice info">${icon('info')}<div class="n-body small">يخرج الصنف من المخزن بمتوسط تكلفته ويظهر كمصروف في بند "${esc(E.nameOf('expenseCats', d.catId) || 'المصروف')}" — الشراء المخزني ليس مصروفًا حتى يُستهلك.</div></div>`);
    if (d.type === 'PY' && d.purpose === 'advance' && live) out.push(`<div class="notice info">${icon('info')}<div class="n-body small">السلفة دفعة مقدمة: تخفض المستحق للطرف ولا تُحسب كتكلفة مرة ثانية.</div></div>`);
    return out.join('');
  };
  function previewDelta(d) {
    const t = d.totals || {}, paid = U.num(d.paid);
    switch (d.type) {
      case 'SI': return U.r2(t.total - paid);
      case 'SR': return U.r2(-t.total + paid);
      case 'PI': return U.r2(-t.total + paid);
      case 'PR': return U.r2(t.total - paid);
      case 'RC': return -U.num(d.amount);
      case 'PY': return U.num(d.amount);
      case 'OB': return d.side === 'credit' ? -U.num(d.amount) : U.num(d.amount);
      case 'EX': return -U.num(d.amount);
      case 'PRC': return -((d.calc && d.calc.fee) || 0);
      case 'DJ': return -(t.total || 0);
      case 'WL': return d.charge ? U.num(d.chargeAmount) || U.num(d.qty) * E.custodyAvg(d.sid, d.itemId) : 0;
    }
    return 0;
  }
  function effectNet(d, st) { return U.sum(E.effectsOf(d.id).ledger.filter((e) => e.st === st && e.sid === d.sid), (e) => e.amount); }

  /* ───────── أحداث المحرر ───────── */
  function editorMount(el) {
    renderLines(); renderTotals(); renderSide();
    App._guardHash = location.hash;
    App.current.newFn = () => App.newDoc(ED.d.type);
    // التركيز الأول: أول حقل إلزامي فارغ في الرأس، ثم أول بند فارغ
    const pick = () => {
      if (ED.d.type === 'PRC' && ED.d.woId) return el.querySelector('#ed-head [data-f="hours"]');
      for (const f of el.querySelectorAll('#ed-head .field')) {
        if (!f.querySelector('.req')) continue;
        const hid = f.querySelector('.combo input[type=hidden]');
        const inp = f.querySelector('input:not([type=hidden]):not([type=checkbox])');
        if (hid ? !hid.value : inp && !inp.value) return inp;
      }
      const rows = [...el.querySelectorAll('#ed-lines tbody tr')];
      for (const tr of rows) { const h = tr.querySelector('.combo input[type=hidden]'); if (h && !h.value) return tr.querySelector('.combo input:not([type=hidden])'); }
      return el.querySelector('#ed-lines [data-l="qty"]');
    };
    const first = pick();
    if (first) setTimeout(() => { first.focus(); first.select && first.select(); }, 50);

    el.addEventListener('combo', (e) => {
      const box = e.target;
      const v = e.detail.value;
      const d = ED.d;
      if (box.dataset.f) {
        const f = box.dataset.f;
        d[f] = v;
        const parts = [];
        if (f === 'sid') {
          if (['MI', 'MR', 'PRC', 'WL'].includes(d.type)) { const wo = DB.get('orders', d.woId); if (wo && wo.partyId !== v) d.woId = null; if (!d.woId) { const open = DB.s.orders.filter((o) => o.status === 'open' && o.partyId === v); if (open.length === 1) { applyOrder(d, open[0]); parts.push('lines'); } } }
          if (d.type === 'SR' && d.refId) { const inv = DB.get('docs', d.refId); if (!inv || inv.sid !== v) d.refId = null; }
          if (d.type === 'SI') { const p = DB.get('parties', v); if (p && p.taxable && !d.taxId) { d.taxId = DB.s.taxes[0] && DB.s.taxes[0].id; const tt = DB.s.templates.find((x) => x.name.includes('ضريب')); if (tt) d.templateId = tt.id; UI.toast('عميل خاضع للضريبة — تم تطبيق ' + DB.s.taxes[0].name, 'info'); } }
          parts.push('head');
          if (d.type === 'WL') parts.push('head');
        }
        if (f === 'woId' && v) { applyOrder(d, DB.get('orders', v)); parts.push('head', 'lines'); }
        if (f === 'refId' && v) { loadInvoice(d, DB.get('docs', v)); parts.push('head', 'lines'); }
        if (f === 'itemId' && d.type === 'PRC') parts.push('head');
        recalc(parts);
      } else if (box.dataset.l) {
        const i = +box.dataset.i, k = box.dataset.l, l = d.lines[i];
        l[k] = v;
        if (k === 'itemId' && v) {
          const it = DB.get('items', v);
          l.unit = 'base';
          if (d.type === 'SI' || d.type === 'SR') l.price = it.salePrice || 0;
          if (d.type === 'PI' || d.type === 'PR') l.price = U.r2(it.lastCost || E.avgCost(v));
          if (d.type === 'OS') l.cost = U.r2(it.lastCost || 0);
          // صنف مكرر في نفس المستند: ننبه فقط
          if (d.lines.filter((x) => x.itemId === v).length > 1 && d.type !== 'ADJ') UI.toast('تنبيه: الصنف مضاف أكثر من مرة في نفس المستند', 'warning');
          if (i === d.lines.length - 1) d.lines.push(d.type === 'DJ' ? { modelId: null, amount: lastAmount(d) } : blank(d.type));
          recalc(['lines']);
          const q = document.querySelector(`#ed-lines [data-l="qty"][data-i="${i}"]`);
          if (q) { q.focus(); q.select(); }
          return;
        }
        if (k === 'modelId' && v && i === d.lines.length - 1) { d.lines.push({ modelId: null, amount: lastAmount(d) }); recalc(['lines']); const q = document.querySelector(`#ed-lines [data-l="amount"][data-i="${i}"]`); if (q) { q.focus(); q.select(); } return; }
        recalc(['lines']);
      }
    });
    el.addEventListener('input', (e) => {
      const x = e.target;
      const d = ED.d;
      if (x.dataset.f && !x.closest('.combo')) {
        const f = x.dataset.f;
        if (x.type === 'checkbox') d[f] = x.checked;
        else if (x.classList.contains('num')) d[f] = x.value === '' ? 0 : U.num(x.value);
        else if (x.tagName === 'SELECT') d[f] = x.value === '' ? null : isNaN(+x.value) ? x.value : +x.value;
        else d[f] = x.value;
        const parts = [];
        if (['taxId', 'whId', 'sid', 'from', 'to'].includes(f) && x.tagName === 'SELECT') parts.push('lines', 'head');
        if (f === 'whId') parts.push('lines');
        if (f === 'method' && x.closest('#ed-head')) parts.push('head');
        if (f === 'itemId' && d.type === 'WL') parts.push('head');
        if (f === 'charge') parts.push('head');
        if (['taxId', 'priceIncludesTax', 'purpose'].includes(f)) parts.push('head');
        recalc(parts);
      } else if (x.dataset.l) {
        const l = d.lines[+x.dataset.i];
        if (x.tagName === 'SELECT') { l[x.dataset.l] = x.value; const it = DB.get('items', l.itemId); if (x.dataset.l === 'unit' && it && (d.type === 'SI' || d.type === 'SR')) l.price = x.value === 'alt' ? U.r2(it.salePrice * it.altFactor) : it.salePrice; if (x.dataset.l === 'unit' && it && (d.type === 'PI' || d.type === 'PR')) { const base = it.lastCost || E.avgCost(it.id); l.price = x.value === 'alt' ? U.r2(base * it.altFactor) : U.r2(base); } recalc(['lines']); return; }
        l[x.dataset.l] = x.dataset.l === 'desc' ? x.value : x.value;
        recalc([]);
      } else if (x.dataset.pl) {
        const l = d.lines[+x.dataset.i];
        l[x.dataset.pl] = x.value;
        recalc([]);
      }
    });
    el.addEventListener('change', (e) => {
      const x = e.target;
      if (x.dataset.file) {
        const f = x.files[0];
        if (!f) return;
        if (f.size > 600 * 1024) return UI.toast('حجم الصورة كبير (الحد 600 كيلوبايت في النموذج الأولي)', 'warning');
        const rd = new FileReader();
        rd.onload = () => { ED.d[x.dataset.file] = rd.result; recalc(['head']); };
        rd.readAsDataURL(f);
      }
      if (x.dataset.f && x.tagName === 'SELECT' && ['whId', 'taxId', 'templateId', 'method', 'allocId', 'itemId', 'purpose'].includes(x.dataset.f)) { /* handled in input */ }
    });
    el.addEventListener('keydown', (e) => {
      const x = e.target;
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && x.tagName === 'INPUT' && !x.closest('.combo') && (x.dataset.l || x.dataset.f || x.dataset.pl)) {
        e.preventDefault();
        if (x.dataset.l) {
          const i = +x.dataset.i;
          const row = x.closest('tr');
          const inputs = [...row.querySelectorAll('input:not([type=hidden]):not([readonly]), select')];
          const pos = inputs.indexOf(x);
          if (pos === inputs.length - 1) {
            const d = ED.d;
            if (i === d.lines.length - 1) { d.lines.push(d.type === 'DJ' ? { modelId: null, amount: lastAmount(d) } : blank(d.type)); recalc(['lines']); }
            const nx = document.querySelector(`#ed-lines tr[data-row="${i + 1}"] input:not([type=hidden])`);
            nx && nx.focus();
          } else { inputs[pos + 1].focus(); inputs[pos + 1].select && inputs[pos + 1].select(); }
        } else UI.focusNext(x);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Delete' || e.key === 'Backspace') && x.dataset.i != null && x.closest('#ed-lines')) { e.preventDefault(); removeLine(+x.dataset.i); }
      if (e.key === 'Insert') { e.preventDefault(); addLine(); }
    });
    UI.pageKeys = {
      'mod+s': () => save(false),
      'mod+enter': () => save(true),
      'mod+p': () => preview(),
      'alt+l': () => addLine(),
      'alt+d': () => {},
    };
  }
  const lastAmount = (d) => { const l = d.lines.filter((x) => x.modelId); return l.length ? l[l.length - 1].amount : 0; };
  function applyOrder(d, wo) {
    if (!wo) return;
    d.woId = wo.id; d.sid = wo.partyId;
    const m = DB.get('models', wo.modelId);
    if (d.type === 'PRC') { d.itemId = wo.itemId; d.lines = E.custodyItems(wo.partyId).filter((x) => x.qty > 0).map((x) => ({ kind: 'item', itemId: x.itemId, qty: 0 })); }
    if (d.type === 'MI') { const sm = E.orderSummary(wo.id); const need = m ? U.r2(Math.max(0, wo.targetQty * m.yarnPerPiece * (1 + (m.wastePct || 0) / 100) - sm.issued + sm.returned)) : 1; d.lines = [Object.assign(blank('MI'), { itemId: m && m.yarnId, qty: need || 1 })]; }
    if (d.type === 'MR') { const c = E.custodyItems(wo.partyId).filter((x) => x.qty > 0); d.lines = c.length ? c.map((x) => Object.assign(blank('MR'), { itemId: x.itemId, qty: x.qty })) : [blank('MR')]; }
  }
  function addLine() {
    const d = ED.d;
    if (!LCOLS[lineKind(d.type)] || d.type === 'PAYR') return;
    d.lines.push(d.type === 'DJ' ? { modelId: null, amount: lastAmount(d) } : blank(d.type));
    recalc(['lines']);
    const rows = document.querySelectorAll('#ed-lines tbody tr');
    const last = rows[rows.length - 1];
    last && last.querySelector('input:not([type=hidden])').focus();
  }
  function removeLine(i) {
    const d = ED.d;
    d.lines.splice(i, 1);
    if (!d.lines.length) d.lines.push(d.type === 'DJ' ? { modelId: null, amount: 0 } : blank(d.type));
    recalc(['lines']);
    const r = document.querySelector(`#ed-lines tr[data-row="${Math.min(i, d.lines.length - 1)}"] input:not([type=hidden])`);
    r && r.focus();
  }
  function cleaned() {
    const d = U.clone(ED.d);
    if (d.lines) d.lines = d.lines.filter((l) => (l.itemId || l.catId || l.modelId || l.workerId) && !(d.type !== 'ADJ' && d.type !== 'PRC' && d.type !== 'DJ' && !U.num(l.qty) && l.kind !== 'expense' && !l.workerId));
    if (d.type === 'PRC') d.lines = d.lines.filter((l) => U.num(l.qty) > 0);
    if (d.type === 'ADJ') d.lines = d.lines.filter((l) => l.itemId && l.qty !== '' && l.qty != null);
    return d;
  }
  function showErrors(e) {
    const box = document.getElementById('ed-errors');
    if (!box) return UI.error(e);
    if (e && e.biz) {
      box.innerHTML = `<div class="notice danger mb-16">${icon('alert')}<div><b>${esc(e.message)}</b>${e.details && e.details.length ? `<ul>${e.details.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div></div>`;
      document.getElementById('view').scrollTo({ top: 0, behavior: 'smooth' });
      UI.toast(e.message, 'danger');
    } else UI.error(e);
  }
  let saving = false;
  function save(andPost) {
    if (saving) return;
    saving = true;
    setTimeout(() => (saving = false), 400);
    const d = cleaned();
    try {
      const saved = E.saveDraft(d);
      ED.d.id = saved.id;
      ED.orig = JSON.stringify(ED.d);
      App.setDirty(false);
      if (!andPost) {
        history.replaceState(null, '', '#/doc/' + saved.id);
        UI.toast('تم حفظ المسودة #' + saved.id + ' — لم تؤثر على أي رصيد', 'success');
        App.refresh();
        return;
      }
      const p = E.post(saved.id);
      UI.toast(`تم اعتماد ${E.docTitle(p)}`, 'success', postSummary(p));
      const target = '#/doc/' + p.id;
      if (location.hash === target) App.refresh(); else location.hash = target;
    } catch (e) {
      if (ED.d.id && location.hash !== '#/doc/' + ED.d.id) history.replaceState(null, '', '#/doc/' + ED.d.id);
      App._guardHash = location.hash;
      showErrors(e);
    }
  }
  function postSummary(d) {
    const ef = E.effectsOf(d.id), out = [];
    if (ef.stock.length) out.push(`${ef.stock.length} حركة مخزون`);
    ef.ledger.forEach((l) => out.push(`${E.subjectName(l.st, l.sid)}: ${l.amount > 0 ? 'مدين' : 'دائن'} ${U.money(Math.abs(l.amount))}`));
    ef.cash.forEach((c) => out.push(`${E.nameOf('accounts', c.accountId)}: ${c.amount > 0 ? '+' : '−'}${U.money(Math.abs(c.amount))}`));
    if (ef.custody.length) out.push(`${ef.custody.length} حركة عهدة`);
    return out.slice(0, 6);
  }
  function preview() {
    const d = U.clone(ED.d);
    E.calcDoc(d);
    Pages.printDoc(d);
  }
  UI.acts['ed-save'] = () => save(false);
  UI.acts['ed-post'] = () => save(true);
  UI.acts['ed-print'] = () => preview();
  UI.acts['ed-add'] = () => addLine();
  UI.acts['ed-add-exp'] = () => { ED.d.lines.push({ kind: 'expense', catId: null, desc: '', qty: 1, price: 0, disc: 0 }); recalc(['lines']); };
  UI.acts['ed-rm'] = (el) => removeLine(+el.dataset.i);
  UI.acts['ed-cancel'] = () => history.back();
  UI.acts['ed-st'] = (el) => { ED.d.st = el.dataset.v; ED.d.sid = null; ED.d.allocId = null; recalc(['head']); };
  UI.acts['ed-set'] = (el) => { ED.d[el.dataset.f] = el.dataset.v; recalc(['head']); };
  UI.acts['ed-paid-all'] = () => { ED.d.paid = ED.d.totals.total; recalc([]); const p = document.querySelector('#ed-totals [data-f="paid"]'); if (p) p.value = ED.d.paid; };
  UI.acts['ed-alloc'] = (el) => { ED.d.allocId = +el.dataset.id; ED.d.amount = +el.dataset.amt; recalc(['head']); };
  UI.acts['ed-delete'] = async () => { if (await UI.confirm({ title: 'حذف المسودة', message: 'المسودة لم تؤثر على أي رصيد، وسيتم حذفها نهائيًا.', ok: 'حذف', danger: true })) { UI.run(() => E.deleteDraft(ED.d.id), 'تم حذف المسودة'); App.setDirty(false); history.back(); } };
  UI.acts['ed-load-inv'] = () => { loadInvoice(ED.d, DB.get('docs', ED.d.refId)); recalc(['lines']); };
  UI.acts['ed-load-wh'] = () => {
    const d = ED.d;
    const ids = new Set(DB.s.stock.filter((m) => m.whId === d.whId).map((m) => m.itemId));
    d.lines = [...ids].map((id) => ({ kind: 'item', itemId: id, qty: '' })).sort((a, b) => E.nameOf('items', a.itemId).localeCompare(E.nameOf('items', b.itemId), 'ar'));
    d.lines.push(blank('ADJ'));
    recalc(['lines']);
    UI.toast(`تم تحميل ${ids.size} صنف — اكتب الكمية المعدودة لكل صنف (الفارغ لا يُسوى)`, 'info');
  };
  UI.acts['ed-suggest'] = () => {
    const d = ED.d, wo = DB.get('orders', d.woId), m = wo && DB.get('models', wo.modelId);
    if (!m || !U.num(d.qtyGood)) return UI.toast('أدخل الكمية المقبولة أولًا', 'warning');
    const need = U.r2(U.num(d.qtyGood) * m.yarnPerPiece * (1 + (m.wastePct || 0) / 100));
    let line = d.lines.find((l) => l.itemId === m.yarnId);
    if (!line) { line = { kind: 'item', itemId: m.yarnId, qty: 0 }; d.lines.unshift(line); }
    line.qty = Math.min(need, E.custodyQty(d.sid, m.yarnId));
    recalc(['lines']);
    UI.toast(`الاستهلاك المعياري: ${U.qty(d.qtyGood)} × ${m.yarnPerPiece} كجم + ${m.wastePct}% هالك = ${U.qty(need)} كجم`, 'info');
  };
  UI.acts['ed-dj-rate'] = () => { const r = U.num(document.getElementById('dj-rate').value); ED.d.lines.forEach((l) => { if (l.modelId) l.amount = r; }); recalc(['lines']); };
  UI.acts['ed-dj-new'] = () => {
    const d = ED.d;
    const free = DB.s.models.filter((m) => E.modelDesign(m.id).status === 'none' && !d.lines.some((l) => l.modelId === m.id));
    if (!free.length) return UI.toast('كل الموديلات مسندة بالفعل', 'info');
    d.lines = d.lines.filter((l) => l.modelId).concat(free.map((m) => ({ modelId: m.id, amount: lastAmount(d) })));
    recalc(['lines']);
  };
  UI.acts['ed-payr-gen'] = () => {
    const d = ED.d;
    if (!d.from || !d.to || d.from > d.to) return UI.toast('حدد فترة صحيحة', 'danger');
    const pv = E.payrollPreview(d.from, d.to, null, d.id);
    d.lines = pv.lines;
    recalc(['payroll']);
    UI.toast(`تم احتساب أجور ${pv.lines.length} عامل لفترة ${pv.days} يوم`, 'success');
  };
  UI.acts['ed-payr-rm'] = (el) => { ED.d.lines.splice(+el.dataset.i, 1); recalc(['payroll']); };

  /* ───────── عرض مستند معتمد/ملغى ───────── */
  function viewHTML(d) {
    const t = T()[d.type];
    const back = Object.entries(Pages.DOC_LISTS).find(([, v]) => v.types.includes(d.type));
    const ps = E.payStatus(d);
    const ef = E.effectsOf(d.id);
    const actions = [];
    if (['SI', 'SR', 'PI', 'PR', 'RC', 'PY', 'EX', 'IN'].includes(d.type)) actions.push(`<button class="btn" data-act="dv-print" data-id="${d.id}">${icon('printer')} طباعة ${UI.k('mod+p')}</button>`);
    if (d.status === 'posted') {
      if (d.type === 'SI' && ps && ps.remaining > 0) actions.push(`<button class="btn primary" data-act="new-doc" data-type="RC" data-q='${JSON.stringify({ sid: d.sid, alloc: d.id, amount: ps.remaining })}'>${icon('in')} تحصيل ${U.money(ps.remaining)}</button>`);
      if ((d.type === 'PI' || d.type === 'DJ') && ps && ps.remaining > 0) actions.push(`<button class="btn primary" data-act="new-doc" data-type="PY" data-q='${JSON.stringify({ sid: d.sid, alloc: d.id, amount: ps.remaining })}'>${icon('out')} سداد ${U.money(ps.remaining)}</button>`);
      if (d.type === 'SI') actions.push(`<button class="btn" data-act="new-doc" data-type="SR" data-q='${JSON.stringify({ ref: d.id })}'>${icon('undo')} مرتجع</button>`);
      if (d.type === 'PAYR') actions.push(`<button class="btn primary" data-act="payr-payall" data-id="${d.id}">${icon('wallet')} صرف المستحق للجميع</button>`);
    }
    actions.push(`<button class="btn icon" data-act="dv-more" data-id="${d.id}" title="المزيد">${icon('menu')}</button>`);
    const info = viewInfo(d);
    return `
    <div class="page-h">
      <div class="titles"><div class="crumbs">${back ? `<a href="#/${back[0]}">${back[1].title}</a> ‹` : ''} <span>${esc(E.docNo(d))}</span></div>
        <h1>${icon(t.icon)} ${t.label} <span class="mono" style="font-size:16px">${esc(d.no)}</span> ${UI.status(d)} ${d.status === 'posted' ? UI.payPill(ps) : ''}</h1>
        <div class="desc">${U.date(d.date)}${d.sid ? ' · ' + UI.subjLink(d.st || 'party', d.sid) : ''}</div>
      </div>
      <div class="actions">${actions.join('')}</div>
    </div>
    ${d.status === 'void' ? `<div class="notice danger void-banner mb-16">${icon('ban')}<div><b>مستند ملغى</b><div class="n-body small">ألغاه ${esc(d.voidBy)} في ${U.dateTime(d.voidAt)} — السبب: ${esc(d.voidReason)}. تم تسجيل حركات عكسية بنفس القيم، والمستند محفوظ للتاريخ.</div></div></div>` : ''}
    <div class="doc-layout">
      <div class="col gap-16" style="min-width:0">
        <div class="card"><div class="card-b"><div class="grid g4">${info.map(([l, v]) => `<div><div class="lbl">${l}</div><div class="bold mt-8" style="margin-top:2px">${v}</div></div>`).join('')}</div></div></div>
        ${viewBody(d)}
        ${d.notes ? `<div class="card"><div class="card-b"><div class="lbl">ملاحظات</div><div class="mt-8">${esc(d.notes)}</div></div></div>` : ''}
        ${d.attachment ? `<div class="card"><div class="card-h"><h3>${icon('image')} المرفق</h3></div><div class="card-b"><a href="${d.attachment}" target="_blank"><img src="${d.attachment}" style="max-width:100%;max-height:340px;border-radius:8px"></a></div></div>` : ''}
      </div>
      <div class="doc-side">
        ${Pages.etaCard ? Pages.etaCard(d) : ''}
        ${Pages.sidePanel(d, false)}
        <div class="card"><div class="card-h"><h3>${icon('layers')} أثر المستند على الأرصدة</h3></div><div class="fx">${fxHTML(ef)}</div></div>
        <div class="card"><div class="card-h"><h3>${icon('history')} سجل المستند</h3></div><div class="timeline">
          <div class="tl"><span class="dot gray"></span><div><b>أُنشئ</b> بواسطة ${esc(d.createdBy || '')}<div class="muted tiny">${U.dateTime(d.createdAt)}</div></div></div>
          ${d.postedAt ? `<div class="tl"><span class="dot"></span><div><b>اعتُمد</b> بواسطة ${esc(d.postedBy || '')}<div class="muted tiny">${U.dateTime(d.postedAt)}</div></div></div>` : ''}
          ${d.voidAt ? `<div class="tl"><span class="dot red"></span><div><b>أُلغي</b> بواسطة ${esc(d.voidBy)}<div class="muted tiny">${U.dateTime(d.voidAt)} — ${esc(d.voidReason)}</div></div></div>` : ''}
          ${DB.s.docs.filter((x) => x.copyOf === d.id).map((x) => `<div class="tl"><span class="dot gray"></span><div>نسخة: <a href="#/doc/${x.id}">${esc(E.docNo(x))}</a> ${UI.status(x)}</div></div>`).join('')}
        </div></div>
      </div>
    </div>`;
  }
  function viewInfo(d) {
    const out = [];
    const add = (l, v) => v != null && v !== '' && out.push([l, v]);
    add('التاريخ', U.date(d.date));
    if (d.sid) add(d.st === 'worker' ? 'العامل' : 'الطرف', UI.subjLink(d.st || 'party', d.sid));
    if (d.whId) add(d.type === 'STR' ? 'من مخزن' : 'المخزن', esc(E.nameOf('warehouses', d.whId)));
    if (d.whTo) add('إلى مخزن', esc(E.nameOf('warehouses', d.whTo)));
    if (d.woId) { const o = DB.get('orders', d.woId); add('أمر التشغيل', o ? `<a href="#/order/${o.id}">${esc(o.no)}</a>` : '—'); }
    if (d.refId) add('الفاتورة الأصلية', UI.docLink(DB.get('docs', d.refId)));
    if (d.supplierRef) add('رقم فاتورة المورد', esc(d.supplierRef));
    if (d.catId) add(d.type === 'IN' ? 'بند الإيراد' : 'بند المصروف', esc(E.nameOf(d.type === 'IN' ? 'incomeCats' : 'expenseCats', d.catId)));
    if (d.accountId && !['SI', 'SR', 'PI', 'PR'].includes(d.type) && !(d.type === 'EX' && d.payMode === 'credit')) add(d.type === 'TR' ? 'من حساب' : 'الخزينة / البنك', `<a href="#/account/${d.accountId}">${esc(E.nameOf('accounts', d.accountId))}</a>`);
    if (d.accountTo) add('إلى حساب', `<a href="#/account/${d.accountTo}">${esc(E.nameOf('accounts', d.accountTo))}</a>`);
    if (d.method && ['RC', 'PY', 'EX', 'IN'].includes(d.type) && d.payMode !== 'credit') add('طريقة الدفع', E.PAY_METHODS[d.method] + (d.chequeNo ? ` <span class="code">#${esc(d.chequeNo)}</span>` : ''));
    if (d.type === 'PY') add('نوع الدفعة', d.purpose === 'advance' ? '<span class="pill warn">سلفة مقدمة</span>' : 'دفعة / سداد');
    if (d.type === 'EX') add('السداد', d.payMode === 'credit' ? '<span class="pill warn">آجل على المورد</span>' : 'مدفوع');
    if (d.beneficiary) add('المستفيد', esc(d.beneficiary));
    if (d.source) add('المصدر', esc(d.source));
    if (d.allocId) add('مخصص لـ', UI.docLink(DB.get('docs', d.allocId)));
    if (d.type === 'PAYR') add('الفترة', U.date(d.from) + ' ← ' + U.date(d.to));
    if (d.type === 'OB') add('طبيعة الرصيد', d.side === 'credit' ? 'له علينا (دائن)' : 'عليه لنا (مدين)');
    if (['RC', 'PY', 'EX', 'IN', 'TR', 'OB', 'OA'].includes(d.type)) add('المبلغ', `<span class="num" style="font-size:18px">${U.money(d.amount)}</span> <small class="muted">${UI.cur()}</small>`);
    if (d.type === 'WL') { add('الخامة', UI.itemLink(d.itemId)); add('الكمية', U.qty(d.qty)); add('القيمة بالتكلفة', UI.money(d.calc.value)); add('محمل على الورشة', d.charge ? UI.money(d.calc.charged) : 'لا — يُسجل كفاقد'); add('السبب', esc(d.reason)); }
    if (d.type === 'IP') { add('المنتج', UI.itemLink(d.itemId)); add('الكمية', U.qty(d.qtyGood)); add('تكلفة الوحدة', UI.money(d.calc.unitCost)); }
    if (d.snapshot && d.snapshot.template) add('قالب الطباعة', esc(d.snapshot.template.name));
    return out;
  }
  function viewBody(d) {
    const t = d.totals || {};
    if (['SI', 'SR', 'PI', 'PR'].includes(d.type)) {
      const cost = d.type === 'SI' || d.type === 'SR';
      return `<div class="card"><div class="card-h"><h3>البنود</h3><span class="sub">${d.lines.length} بند</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>الصنف</th><th class="num">الكمية</th><th>الوحدة</th><th class="num">السعر</th><th class="num">خصم</th><th class="num">الإجمالي</th>${cost ? '<th class="num">التكلفة</th>' : d.type === 'PI' ? '<th class="num">تكلفة الوحدة</th>' : ''}</tr></thead><tbody>
        ${d.lines.map((l, i) => { const it = DB.get('items', l.itemId); return `<tr><td class="muted">${i + 1}</td><td>${l.kind === 'expense' ? `<span class="tag">مصروف</span> ${esc(E.nameOf('expenseCats', l.catId))} ${esc(l.desc || '')}` : `<span class="code">${esc(it ? it.code : '')}</span> ${UI.itemLink(l.itemId)}`}</td><td class="num">${U.qty(l.qty)}</td><td class="small">${l.kind === 'expense' ? '—' : esc(l.unit === 'alt' && it ? it.altUnit : it ? it.unit : '')}</td><td class="num">${U.money(l.price)}</td><td class="num">${l.disc ? l.disc + '%' : '—'}</td><td class="num bold">${U.money(l.net)}</td>${cost ? `<td class="num muted">${U.money(l.cost || 0)}</td>` : d.type === 'PI' ? `<td class="num muted">${l.kind === 'expense' ? '—' : U.money(l.costUnit || 0)}</td>` : ''}</tr>`; }).join('')}
        </tbody></table></div>
        <div class="totals" style="border-top:1px solid var(--border)">
          <div class="t-row"><span>الإجمالي قبل الخصم</span><span class="num">${U.money(t.sub)}</span></div>
          ${t.discount ? `<div class="t-row"><span>الخصم</span><span class="num">−${U.money(t.discount)}</span></div>` : ''}
          ${t.taxRate ? `<div class="t-row"><span>${esc(t.taxName)}</span><span class="num">${U.money(t.tax)}</span></div>` : ''}
          <div class="t-row grand"><span>الإجمالي</span><span class="num">${U.money(t.total)} <small>${UI.cur()}</small></span></div>
          ${d.paid ? `<div class="t-row"><span>${d.type === 'SI' ? 'محصل مع الفاتورة' : d.type === 'PI' ? 'مدفوع مع الفاتورة' : 'مردود نقدًا'} — ${esc(E.nameOf('accounts', d.accountId))}</span><span class="num">${U.money(d.paid)}</span></div>` : ''}
        </div></div>`;
    }
    if (['OS', 'ADJ', 'STR', 'MI', 'MR', 'CI', 'IP'].includes(d.type)) {
      const extra = d.type === 'ADJ';
      return `<div class="card"><div class="card-h"><h3>${d.type === 'IP' ? 'الخامات المستهلكة' : 'البنود'}</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>الصنف</th>${extra ? '<th class="num">رصيد النظام</th><th class="num">المعدود</th><th class="num">الفرق</th>' : '<th class="num">الكمية</th>'}<th class="num">تكلفة الوحدة</th><th class="num">القيمة</th></tr></thead><tbody>
        ${d.lines.map((l, i) => `<tr><td class="muted">${i + 1}</td><td>${UI.itemLink(l.itemId)}</td>${extra ? `<td class="num">${U.qty(l.system)}</td><td class="num">${U.qty(l.qty)}</td><td class="num bold ${l.diff < 0 ? 'neg' : l.diff > 0 ? 'pos' : ''}">${U.qty(l.diff)}</td>` : `<td class="num">${U.qty(l.qty)}</td>`}<td class="num">${U.money(l.costUnit != null ? l.costUnit : l.cost || 0)}</td><td class="num">${U.money(extra ? l.value : l.qty * (l.costUnit != null ? l.costUnit : l.cost || 0))}</td></tr>`).join('')}
        </tbody></table></div></div>`;
    }
    if (d.type === 'PRC') {
      const c = d.calc;
      return `<div class="card"><div class="card-h"><h3>تفاصيل الاستلام والمصنعية</h3></div><div class="card-b"><div class="stat-strip">
        <div><div class="s-l">ساعات التشغيل</div><div class="s-v">${U.qty(d.hours)}</div></div><div><div class="s-l">المقبول</div><div class="s-v">${U.int(d.qtyGood)}</div></div><div><div class="s-l">المرفوض</div><div class="s-v ${d.qtyRejected ? 'neg' : ''}">${U.int(d.qtyRejected)}</div></div>
        <div><div class="s-l">المصنعية</div><div class="s-v num" style="text-align:right">${U.money(c.fee)}</div></div><div><div class="s-l">تكلفة القطعة</div><div class="s-v num" style="text-align:right">${U.money(c.unitCost)}</div></div></div>
        <div class="notice info mt-12">${icon('clock')}<div class="n-body"><b class="num">${esc(c.formula)}</b><div class="small muted">${esc(c.rateSrc || '')} · السعر محفوظ مع المستند ولا يتغير بتغيير الأسعار لاحقًا</div></div></div></div>
        ${d.lines.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>الخامة المستهلكة من العهدة</th><th class="num">الكمية</th><th class="num">تكلفة الوحدة</th><th class="num">القيمة</th></tr></thead><tbody>${d.lines.map((l) => `<tr><td>${UI.itemLink(l.itemId)}</td><td class="num">${U.qty(l.qty)}</td><td class="num">${U.money(l.costUnit)}</td><td class="num">${U.money(l.qty * l.costUnit)}</td></tr>`).join('')}</tbody></table></div>` : ''}</div>`;
    }
    if (d.type === 'DJ') return `<div class="card"><div class="card-h"><h3>الموديلات</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الموديل</th><th>حالة المحاسبة</th><th class="num">التكلفة</th></tr></thead><tbody>${d.lines.map((l) => { const m = DB.get('models', l.modelId); const ds = E.modelDesign(l.modelId); return `<tr><td><a href="#/model/${m.id}"><span class="code">${esc(m.code)}</span> ${esc(m.name)}</a></td><td><span class="pill ${ds.status === 'paid' ? 'paid' : 'partial'}">${esc(ds.label)}</span></td><td class="num">${U.money(l.amount)}</td></tr>`; }).join('')}</tbody><tfoot><tr><td>الإجمالي</td><td></td><td class="num">${U.money(t.total)}</td></tr></tfoot></table></div></div>`;
    if (d.type === 'PAYR') {
      return `<div class="card"><div class="card-h"><h3>تفاصيل المسير</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>العامل</th><th>القسم</th><th>أساس الحساب</th><th class="num">الأجر</th><th class="num">إضافي</th><th class="num">خصم</th><th class="num">الصافي</th><th class="num">رصيده الآن</th></tr></thead><tbody>
        ${d.lines.map((l) => `<tr><td><a href="#/worker/${l.workerId}">${esc(E.nameOf('workers', l.workerId))}</a></td><td class="small">${esc(E.nameOf('departments', l.deptId))}</td><td class="small text-2 wrap" style="max-width:280px">${esc(l.basis)}</td><td class="num">${U.money(l.gross)}</td><td class="num">${l.bonus ? U.money(l.bonus) : '—'}</td><td class="num">${l.deduction ? U.money(l.deduction) : '—'}</td><td class="num bold">${U.money(l.net)}</td><td class="num">${UI.bal(E.balance('worker', l.workerId), 'worker')}</td></tr>`).join('')}
        </tbody><tfoot><tr><td colspan="3">الإجمالي</td><td class="num">${U.money(t.gross)}</td><td class="num">${U.money(t.bonus)}</td><td class="num">${U.money(t.deduction)}</td><td class="num">${U.money(t.total)}</td><td></td></tr></tfoot></table></div></div>`;
    }
    return '';
  }
  function fxHTML(ef) {
    const sec = (title, ic, arr, fn) => (arr.length ? `<div class="fx-h">${icon(ic)} ${title}</div>${arr.map((e) => `<div class="fx-r ${e.rev ? 'rev' : ''}">${fn(e)}</div>`).join('')}` : '');
    const html = sec('المخزون', 'boxes', ef.stock, (m) => `<span class="grow ellipsis">${esc(E.nameOf('items', m.itemId))} <span class="tiny muted">${esc(E.nameOf('warehouses', m.whId))}</span></span><span class="num ${m.qty < 0 ? 'neg' : 'pos'}">${m.qty > 0 ? '+' : ''}${U.qty(m.qty)}</span>`)
      + sec('حسابات الأطراف', 'users', ef.ledger, (l) => `<span class="grow ellipsis">${esc(E.subjectName(l.st, l.sid))} <span class="tiny muted">${esc(l.memo || '')}</span></span><span class="num">${l.amount > 0 ? 'مدين' : 'دائن'} ${U.money(Math.abs(l.amount))}</span>`)
      + sec('الخزائن والبنوك', 'bank', ef.cash, (c) => `<span class="grow ellipsis">${esc(E.nameOf('accounts', c.accountId))}</span><span class="num ${c.amount < 0 ? 'neg' : 'pos'}">${c.amount > 0 ? '+' : '−'}${U.money(Math.abs(c.amount))}</span>`)
      + sec('عهدة الورش', 'yarn', ef.custody, (c) => `<span class="grow ellipsis">${esc(E.nameOf('parties', c.partyId))} · ${esc(E.nameOf('items', c.itemId))}</span><span class="num ${c.qty < 0 ? 'neg' : 'pos'}">${c.qty > 0 ? '+' : ''}${U.qty(c.qty)}</span>`);
    return html || '<div class="card-b muted small">هذا المستند لا يولد حركات (معلوماتي فقط)</div>';
  }

  Pages.doc = {
    render({ id }) {
      const d = DB.get('docs', id);
      if (!d) return UI.empty('المستند غير موجود', '<a href="#/">العودة للرئيسية</a>', 'file');
      if (d.status === 'draft') { ED.d = U.clone(d); ED.orig = JSON.stringify(ED.d); return editorHTML(); }
      return viewHTML(d);
    },
    mount(el, { id }) {
      const d = DB.get('docs', id);
      if (!d) return;
      if (d.status === 'draft') return editorMount(el);
      App.current.newFn = () => App.newDoc(d.type);
      UI.pageKeys = { 'mod+p': () => Pages.printDoc(d), 'alt+d': () => copyDoc(d.id) };
    },
  };
  Pages.editor = {
    render({ type }, q) {
      if (!E.TYPES[type]) return UI.empty('نوع مستند غير معروف');
      const d = E.newDoc(type, defaults(type, q));
      ED.d = d; ED.orig = JSON.stringify(d);
      return editorHTML();
    },
    mount: (el) => editorMount(el),
  };
  function copyDoc(id) {
    const c = E.duplicate(id);
    c.date = U.today();
    const nd = UI.run(() => E.saveDraft(c), 'تم إنشاء نسخة كمسودة');
    if (nd) location.hash = '#/doc/' + nd.id;
  }
  UI.acts['dv-print'] = (el) => Pages.printDoc(DB.get('docs', +el.dataset.id));
  UI.acts['dv-more'] = (el) => {
    const d = DB.get('docs', +el.dataset.id);
    const items = [
      { label: 'نسخ كمستند جديد', icon: 'copy', kbd: 'alt+d', act: () => copyDoc(d.id) },
    ];
    if (d.sid) items.push({ label: 'كشف حساب الطرف', icon: 'file', act: () => (location.hash = (d.st === 'worker' ? '#/worker/' : '#/party/') + d.sid) });
    if (d.status === 'posted') {
      items.push({ sep: true });
      items.push({ label: 'تعديل (إلغاء موثق + نسخة جديدة)', icon: 'edit', act: () => voidFlow(d, true) });
      items.push({ label: 'إلغاء المستند', icon: 'ban', danger: true, act: () => voidFlow(d, false) });
    }
    UI.menu(el, items);
  };
  async function voidFlow(d, copy) {
    if (!E.can('void')) return UI.toast('ليس لديك صلاحية إلغاء المستندات المعتمدة', 'danger');
    const reason = await UI.prompt({
      title: copy ? 'تعديل مستند معتمد' : 'إلغاء ' + E.docTitle(d), danger: true, ok: copy ? 'إلغاء وفتح نسخة للتعديل' : 'تأكيد الإلغاء', required: true, textarea: true, label: 'سبب الإلغاء (إلزامي — يظهر في سجل التغييرات)',
      message: `سيتم تسجيل حركات عكسية بنفس القيم بالضبط لكل الآثار (${Object.values(E.effectsOf(d.id)).reduce((a, x) => a + x.filter((e) => !e.rev).length, 0)} حركة)، ويبقى المستند الأصلي محفوظًا بحالة "ملغى".${copy ? ' ثم تُفتح نسخة مسودة لتعديلها واعتمادها من جديد.' : ''}`,
    });
    if (!reason) return;
    const r = UI.run(() => (copy ? E.voidAndCopy(d.id, reason) : E.voidDoc(d.id, reason)), copy ? 'تم الإلغاء — عدّل النسخة ثم اعتمدها' : 'تم إلغاء المستند وعكس آثاره');
    // فاتورة صالحة على المنظومة: تُلغى هناك أيضًا (خلال 7 أيام) وإلا ننبه لإصدار إشعار دائن
    if (r && window.ETA && d.eta && d.eta.status === 'valid') { try { ETA.cancel(d.id, reason); UI.toast('تم إلغاء الفاتورة على منظومة الضرائب أيضًا', 'success'); } catch (e) { UI.toast(e.message, 'warning'); } }
    if (r) { if (copy) location.hash = '#/doc/' + r.id; else App.refresh(); }
  }
  UI.acts['payr-payall'] = (el) => {
    const d = DB.get('docs', +el.dataset.id);
    const due = d.lines.map((l) => ({ l, b: E.balance('worker', l.workerId) })).filter((x) => x.b < -0.004);
    if (!due.length) return UI.toast('لا توجد مستحقات قائمة — كل عمال المسير تم صرف أجورهم', 'info');
    const total = U.sum(due, (x) => -x.b);
    UI.modal({
      title: 'صرف المستحق لعمال المسير', size: 'lg',
      body: `<div class="grid g3 mb-16">${UI.field('من خزينة', UI.combo({ source: 'accounts', name: 'accountId', value: accFor('cash') }))}${UI.field('طريقة الدفع', UI.sel('method', Object.entries(E.PAY_METHODS), 'cash'))}${UI.field('تاريخ الصرف', UI.inp('date', U.today(), { type: 'date' }))}</div>
        <table class="tbl"><thead><tr><th><input type="checkbox" checked data-all></th><th>العامل</th><th class="num">المستحق الآن</th></tr></thead><tbody>${due.map((x, i) => `<tr><td><input type="checkbox" checked data-w="${i}"></td><td>${esc(E.nameOf('workers', x.l.workerId))}</td><td class="num">${U.money(-x.b)}</td></tr>`).join('')}</tbody><tfoot><tr><td></td><td>الإجمالي</td><td class="num">${U.money(total)}</td></tr></tfoot></table>
        <div class="notice info mt-12">${icon('info')}<div class="n-body small">يُنشأ سند صرف معتمد لكل عامل بقيمة رصيده المستحق (بعد خصم السلف تلقائيًا) — في عملية واحدة: تنجح كلها أو لا يُسجل شيء.</div></div>`,
      onMount: (m) => { m.querySelector('[data-all]').onchange = (e) => m.querySelectorAll('[data-w]').forEach((c) => (c.checked = e.target.checked)); },
      actions: [{ label: 'صرف ' + U.money(total), cls: 'primary', primary: true, act: (m) => {
        const v = UI.readForm(m.el);
        const sel = due.filter((x, i) => m.el.querySelector(`[data-w="${i}"]`).checked);
        if (!sel.length) return UI.toast('اختر عاملًا واحدًا على الأقل', 'warning');
        const ok = UI.run(() => DB.tx(() => { for (const x of sel) { const p = E.saveDraft(E.newDoc('PY', { st: 'worker', sid: x.l.workerId, amount: -x.b, accountId: v.accountId, method: v.method, date: v.date, purpose: 'payment', payrollId: d.id, notes: 'صرف أجر ' + d.no })); E.post(p.id); } return true; }), `تم صرف أجور ${sel.length} عامل`);
        if (ok) { m.close(); App.refresh(); }
      } }, { label: 'تراجع' }],
    });
  };

  /* ───────── الطباعة ───────── */
  const tafqit = (n) => {
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hund = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    const tri = (x) => { const h = Math.floor(x / 100), r = x % 100; const p = []; if (h) p.push(hund[h]); if (r) p.push(r < 20 ? ones[r] : (r % 10 ? ones[r % 10] + ' و' : '') + tens[Math.floor(r / 10)]); return p.join(' و'); };
    const scale = (x, one, two, few, many) => (x === 1 ? one : x === 2 ? two : x <= 10 ? tri(x) + ' ' + few : tri(x) + ' ' + many);
    n = Math.floor(Math.abs(n));
    if (!n) return 'صفر';
    const parts = [];
    const m = Math.floor(n / 1e6), t = Math.floor((n % 1e6) / 1000), r = n % 1000;
    if (m) parts.push(scale(m, 'مليون', 'مليونان', 'ملايين', 'مليون'));
    if (t) parts.push(scale(t, 'ألف', 'ألفان', 'آلاف', 'ألف'));
    if (r) parts.push(tri(r));
    return parts.join(' و');
  };
  Pages.tafqit = tafqit;
  // المبلغ بالحروف بالإنجليزية للواجهة الإنجليزية
  const enWords = (n) => {
    const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const tri = (x) => { const h = Math.floor(x / 100), r = x % 100; return [h ? a[h] + ' hundred' : '', r < 20 ? a[r] : b[Math.floor(r / 10)] + (r % 10 ? '-' + a[r % 10] : '')].filter(Boolean).join(' '); };
    n = Math.floor(Math.abs(n));
    if (!n) return 'zero';
    return [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand'], [1, '']].reduce((acc, [d, w]) => { const q = Math.floor(n / d) % 1000; return q ? acc.concat(tri(q) + (w ? ' ' + w : '')) : acc; }, []).join(' ');
  };
  const words = (v) => { if (I18N.en) { const p = Math.round((v - Math.floor(v)) * 100); const w = enWords(v); return `Only ${w.charAt(0).toUpperCase() + w.slice(1)} ${DB.s.settings.currency === 'ج.م' ? 'Egyptian Pounds' : DB.s.settings.currency}${p ? ' and ' + enWords(p) + ' piasters' : ''}`; } return wordsAr(v); };
  const wordsAr = (v) => { const p = Math.round((v - Math.floor(v)) * 100); return `فقط ${tafqit(v)} ${DB.s.settings.currency === 'ج.م' ? 'جنيهًا مصريًا' : DB.s.settings.currency}${p ? ` و${tafqit(p)} قرشًا` : ''} لا غير`; };

  Pages.renderInvoice = (d, tplIn) => {
    const snap = d.status === 'posted' || d.status === 'void' ? d.snapshot : null;
    const tpl = tplIn || (snap && snap.template) || DB.s.templates.find((t) => t.id === d.templateId) || DB.s.templates.find((t) => t.isDefault) || DB.s.templates[0];
    const co = (snap && snap.company) || DB.s.settings.company;
    const p = (snap && snap.party) || (() => { const x = DB.get('parties', d.sid); return x ? { name: x.name, code: x.code, phone: x.phone, address: x.address, taxNo: x.taxNo } : { name: '—' }; })();
    const t = d.totals || {};
    const show = tpl.show || {};
    const cols = tpl.columns.filter((c) => c.on);
    const titles = { SI: tpl.title || 'فاتورة', SR: 'إشعار مرتجع مبيعات', PI: 'فاتورة مشتريات', PR: 'إشعار مرتجع مشتريات' };
    const cell = (c, l, i) => {
      const it = DB.get('items', l.itemId);
      switch (c.key) {
        case 'idx': return i + 1;
        case 'code': return esc(it ? it.code : '');
        case 'name': return l.kind === 'expense' ? esc(E.nameOf('expenseCats', l.catId) + ' ' + (l.desc || '')) : esc(it ? it.name : '');
        case 'unit': return esc(l.kind === 'expense' ? '' : l.unit === 'alt' && it ? it.altUnit : it ? it.unit : '');
        case 'qty': return U.qty(l.qty);
        case 'price': return U.money(l.price);
        case 'disc': return l.disc ? l.disc + '%' : '—';
        case 'tax': return t.taxRate ? U.money(l.netExTax * (t.taxRate / 100)) : '—';
        case 'total': return U.money(l.net);
      }
      return '';
    };
    const numCols = ['qty', 'price', 'disc', 'tax', 'total'];
    const bal = snap ? snap.balanceAfter : d.sid ? E.balance('party', d.sid) : null;
    return `<div class="paper ${tpl.paper || 'A4'} inv ${tpl.style || 'classic'}" style="--tc:${tpl.color || '#34449c'}">
      ${d.status === 'void' ? '<div class="void-stamp">ملغاة</div>' : d.status === 'draft' ? '<div class="void-stamp draft-stamp">مسودة</div>' : ''}
      <div class="inv-h">
        <div class="inv-co">${show.logo && co.logo ? `<img src="${co.logo}" alt="">` : ''}<div><div class="co-name">${esc(co.name)}</div>${show.companyInfo ? `<div class="co-info">${esc(co.address || '')}<br>${esc(co.phone || '')}${co.mobile ? ' · ' + esc(co.mobile) : ''}${show.taxNo && co.taxNo ? `<br>الرقم الضريبي: ${esc(co.taxNo)}` : ''}${co.cr ? ' · ' + esc(co.cr) : ''}</div>` : ''}</div></div>
        <div class="inv-title"><h2>${esc(titles[d.type])}</h2><div class="meta">رقم: <b>${esc(E.docNo(d))}</b><br>التاريخ: ${U.date(d.date)}${d.supplierRef ? `<br>مرجع المورد: ${esc(d.supplierRef)}` : ''}${d.refId ? `<br>الفاتورة الأصلية: ${esc(E.docNo(DB.get('docs', d.refId)))}` : ''}</div></div>
      </div>
      <div class="inv-parties">
        <div class="box"><div class="bl">${d.type === 'PI' || d.type === 'PR' ? 'المورد' : 'العميل'}</div><div class="bv">${esc(p.name)}</div>${show.partyPhone && p.phone ? `<div>هاتف: <span class="ltr">${esc(p.phone)}</span></div>` : ''}${show.partyAddress && p.address ? `<div>${esc(p.address)}</div>` : ''}${show.taxNo && p.taxNo ? `<div>الرقم الضريبي: ${esc(p.taxNo)}</div>` : ''}</div>
        <div class="box"><div class="bl">بيانات إضافية</div>${(tpl.customFields || []).map((f) => `<div>${esc(f.label)}: ${esc(f.value || '................')}</div>`).join('')}${show.payment ? `<div>طريقة الدفع: ${d.paid >= t.total - 0.004 ? E.PAY_METHODS[d.method] || 'نقدي' : d.paid > 0 ? 'جزئي — ' + (E.PAY_METHODS[d.method] || '') : 'آجل'}</div>` : ''}<div>عدد البنود: ${d.lines.length}</div></div>
      </div>
      <table><thead><tr>${cols.map((c) => `<th style="${numCols.includes(c.key) ? 'text-align:left' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead>
        <tbody>${d.lines.map((l, i) => `<tr>${cols.map((c) => `<td class="${numCols.includes(c.key) ? 'num' : ''}">${cell(c, l, i)}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <div class="inv-sum">
        <div style="flex:1">${show.notes && d.notes ? `<div class="box"><div class="bl">ملاحظات</div>${esc(d.notes)}</div>` : ''}<div class="words">${words(t.total || 0)}</div></div>
        <div class="tot">
          <div><span>الإجمالي</span><span class="num">${U.money(t.sub)}</span></div>
          ${t.discount ? `<div><span>الخصم</span><span class="num">−${U.money(t.discount)}</span></div>` : ''}
          ${t.taxRate ? `<div><span>${esc(t.taxName)}</span><span class="num">${U.money(t.tax)}</span></div>` : ''}
          <div class="g"><span>الإجمالي المستحق</span><span class="num">${U.money(t.total)} ${UI.cur()}</span></div>
          ${show.payment && d.paid ? `<div><span>المدفوع</span><span class="num">${U.money(d.paid)}</span></div><div><span>المتبقي</span><span class="num">${U.money(t.total - d.paid)}</span></div>` : ''}
          ${show.balance && bal != null && (d.type === 'SI' || d.type === 'SR') ? `<div><span>رصيد العميل بعد الفاتورة</span><span class="num">${U.money(Math.abs(bal))} ${bal > 0 ? 'عليه' : bal < 0 ? 'له' : ''}</span></div>` : ''}
        </div>
      </div>
      ${show.signature ? `<div class="inv-foot"><div class="sign">توقيع المستلم</div><div class="sign">توقيع المسؤول</div></div>` : ''}
      ${show.terms && tpl.terms ? `<div class="terms">${esc(tpl.terms)}</div>` : ''}
      ${tpl.footer ? `<div class="terms" style="text-align:center;border:none">${esc(tpl.footer)}</div>` : ''}
      ${show.stamp ? `<div class="stamp">${esc(co.name)}<br>معتمد</div>` : ''}
    </div>`;
  };
  Pages.renderVoucher = (d) => {
    const co = DB.s.settings.company;
    const title = { RC: 'سند قبض', PY: d.purpose === 'advance' ? 'سند صرف سلفة' : 'سند صرف', EX: 'سند صرف مصروف', IN: 'سند قبض إيراد' }[d.type];
    const who = d.sid ? E.subjectName(d.st || 'party', d.sid) : d.beneficiary || d.source || '';
    const row = (l, v) => `<div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px dashed #ccc"><b style="min-width:150px">${l}</b><span>${v}</span></div>`;
    return `<div class="paper A5 inv classic" style="--tc:#34449c">
      ${d.status === 'void' ? '<div class="void-stamp">ملغى</div>' : d.status === 'draft' ? '<div class="void-stamp draft-stamp">مسودة</div>' : ''}
      <div class="inv-h"><div class="inv-co">${co.logo ? `<img src="${co.logo}">` : ''}<div><div class="co-name">${esc(co.name)}</div><div class="co-info">${esc(co.phone || '')}</div></div></div><div class="inv-title"><h2>${title}</h2><div class="meta">رقم: <b>${esc(E.docNo(d))}</b><br>التاريخ: ${U.date(d.date)}</div></div></div>
      <div style="margin:18px 0;padding:14px;border:2px solid var(--tc);border-radius:10px;text-align:center"><div style="font-size:12px;color:#666">المبلغ</div><div style="font-size:26px;font-weight:800" class="num">${U.money(d.amount)} ${UI.cur()}</div><div class="words" style="margin-top:4px">${words(d.amount)}</div></div>
      ${row(d.type === 'RC' || d.type === 'IN' ? 'استلمنا من' : 'صرفنا إلى', esc(who))}
      ${d.catId ? row('البند', esc(E.nameOf(d.type === 'IN' ? 'incomeCats' : 'expenseCats', d.catId))) : ''}
      ${d.accountId && d.payMode !== 'credit' ? row('الخزينة / البنك', esc(E.nameOf('accounts', d.accountId))) : ''}
      ${row('طريقة الدفع', d.payMode === 'credit' ? 'آجل' : esc(E.PAY_METHODS[d.method] || '') + (d.chequeNo ? ' — رقم ' + esc(d.chequeNo) : ''))}
      ${d.allocId ? row('وذلك عن', esc(E.docTitle(DB.get('docs', d.allocId)))) : ''}
      ${d.notes ? row('ملاحظات', esc(d.notes)) : ''}
      <div class="inv-foot"><div class="sign">المستلم</div><div class="sign">المحاسب</div><div class="sign">المدير</div></div>
    </div>`;
  };
  Pages.printDoc = (d) => {
    if (['SI', 'SR', 'PI', 'PR'].includes(d.type)) UI.print(Pages.renderInvoice(d));
    else if (['RC', 'PY', 'EX', 'IN'].includes(d.type)) UI.print(Pages.renderVoucher(d));
    else UI.toast('هذا النوع لا يحتاج طباعة — استخدم التقارير', 'info');
  };
})();
