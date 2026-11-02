/* محرك منطق الأعمال
   القاعدة الذهبية: لا يوجد رصيد يُخزَّن أو يُعدَّل يدويًا.
   كل رصيد (عميل/مورد/ورشة/عامل/خزينة/صنف/عهدة) = مجموع حركات ناتجة عن مستندات معتمدة.
   الاعتماد يولد الحركات داخل معاملة واحدة، والإلغاء يولد حركات عكسية ويحتفظ بالمستند الأصلي. */
(function () {
  const { r2, r3, r4, sum } = U;
  const EPS = 0.0005;

  class BizError extends Error {
    constructor(msg, details) { super(msg); this.biz = true; this.details = details || []; }
  }
  const fail = (msg, details) => { throw new BizError(msg, details); };

  /* ───────── الصلاحيات ───────── */
  const PERMS = {
    view: 'عرض لوحة التحكم',
    view_sales: 'عرض المبيعات والعملاء',
    view_purchases: 'عرض المشتريات والموردين',
    view_finance: 'عرض الخزائن والمصروفات والتحصيلات',
    view_stock: 'عرض المخزون والأصناف',
    view_outwork: 'عرض المصنعية الخارجية',
    view_workers: 'عرض العمالة والأجور',
    view_models: 'عرض الموديلات والرسم',
    sales: 'المبيعات والعملاء',
    purchases: 'المشتريات والموردين',
    finance: 'الخزائن والمصروفات والتحصيلات',
    stock: 'المخزون والأصناف والجرد',
    outwork: 'المصنعية الخارجية',
    workers: 'العمالة والأجور',
    models: 'الموديلات والرسم',
    reports: 'التقارير وكشوف الحساب',
    post: 'اعتماد المستندات',
    void: 'إلغاء المستندات المعتمدة',
    edit_prices: 'تعديل الأسعار في الفواتير',
    negative_stock: 'تجاوز الرصيد المتاح (استثناء)',
    opening: 'الأرصدة الافتتاحية',
    settings: 'الإعدادات والمستخدمين',
    close_year: 'إقفال وفتح السنوات المالية',
  };
  // كل قسم له صلاحيتان: عرض فقط، وإدارة (إنشاء/تعديل) — الإدارة تتضمن العرض
  const MODULES = [
    { key: 'sales', view: 'view_sales', manage: 'sales', icon: 'receipt' },
    { key: 'purchases', view: 'view_purchases', manage: 'purchases', icon: 'cart' },
    { key: 'finance', view: 'view_finance', manage: 'finance', icon: 'bank' },
    { key: 'stock', view: 'view_stock', manage: 'stock', icon: 'boxes' },
    { key: 'outwork', view: 'view_outwork', manage: 'outwork', icon: 'factory' },
    { key: 'workers', view: 'view_workers', manage: 'workers', icon: 'user' },
    { key: 'models', view: 'view_models', manage: 'models', icon: 'shirt' },
  ];
  // الأدوار الافتراضية — تُنسخ إلى بيانات المصنع (DB.s.roles) ويعدّلها المالك من الإعدادات
  const ROLES = {
    owner: { label: 'مالك النظام', perms: Object.keys(PERMS) },
    accountant: { label: 'محاسب', perms: ['view', 'view_sales', 'view_purchases', 'view_finance', 'view_stock', 'sales', 'purchases', 'finance', 'reports', 'post', 'edit_prices', 'opening'] },
    storekeeper: { label: 'أمين مخزن', perms: ['view', 'view_stock', 'view_purchases', 'stock', 'post', 'reports'] },
    production: { label: 'مسؤول إنتاج', perms: ['view', 'view_stock', 'view_outwork', 'view_workers', 'view_models', 'outwork', 'workers', 'models', 'post', 'reports'] },
    viewer: { label: 'عرض فقط', perms: ['view', 'reports', ...MODULES.map((m) => m.view)] },
  };
  const user = () => DB.s.users.find((u) => u.id === DB.s.currentUserId) || null;
  const roleOf = (key) => (DB.s.roles && DB.s.roles.find((r) => r.key === key)) || ROLES[key] || null;
  const can = (p) => {
    const u = user();
    if (!u) return DB.bulk; // البيانات التجريبية تُنشأ بصلاحية النظام
    if (u.active === false) return false;
    if (u.role === 'owner') return true; // المالك يملك كل الصلاحيات دائمًا ولا يمكن تقييده
    const role = roleOf(u.role);
    if (!role) return false;
    if (role.perms.includes(p)) return true;
    return p.startsWith('view_') && role.perms.includes(p.slice(5));
  };
  const need = (p) => { if (!can(p)) fail(`ليس لديك صلاحية: ${PERMS[p] || p}`); };

  /* ───────── أنواع المستندات ───────── */
  const TYPES = {
    SI: { label: 'فاتورة مبيعات', prefix: 'INV', perm: 'sales', icon: 'receipt', lines: true, partyTypes: ['customer'], route: 'sales' },
    SR: { label: 'مرتجع مبيعات', prefix: 'SRN', perm: 'sales', icon: 'undo', lines: true, partyTypes: ['customer'], route: 'sales-returns' },
    PI: { label: 'فاتورة مشتريات', prefix: 'PUR', perm: 'purchases', icon: 'cart', lines: true, partyTypes: ['supplier'], route: 'purchases' },
    PR: { label: 'مرتجع مشتريات', prefix: 'PRN', perm: 'purchases', icon: 'undo', lines: true, partyTypes: ['supplier'], route: 'purchase-returns' },
    RC: { label: 'سند تحصيل', prefix: 'RCV', perm: 'finance', icon: 'in', route: 'receipts' },
    PY: { label: 'سند صرف', prefix: 'PAY', perm: 'finance', icon: 'out', route: 'payments' },
    EX: { label: 'مصروف', prefix: 'EXP', perm: 'finance', icon: 'wallet', route: 'expenses' },
    IN: { label: 'إيراد آخر', prefix: 'INC', perm: 'finance', icon: 'coins', route: 'incomes' },
    TR: { label: 'تحويل بين الخزائن', prefix: 'TRF', perm: 'finance', icon: 'swap', route: 'transfers' },
    OB: { label: 'رصيد افتتاحي طرف', prefix: 'OBP', perm: 'opening', icon: 'flag', route: 'opening' },
    OA: { label: 'رصيد افتتاحي خزينة', prefix: 'OBC', perm: 'opening', icon: 'flag', route: 'opening' },
    OS: { label: 'رصيد مخزون افتتاحي', prefix: 'OBS', perm: 'opening', icon: 'flag', lines: true, route: 'opening' },
    ADJ: { label: 'جرد وتسوية', prefix: 'ADJ', perm: 'stock', icon: 'clipboard', lines: true, route: 'stocktakes' },
    STR: { label: 'تحويل مخزني', prefix: 'STR', perm: 'stock', icon: 'swap', lines: true, route: 'stock-transfers' },
    CI: { label: 'صرف استهلاك داخلي', prefix: 'CNS', perm: 'stock', icon: 'out', lines: true, route: 'consumption' },
    IP: { label: 'إنتاج داخلي', prefix: 'IPR', perm: 'stock', icon: 'box', lines: true, route: 'internal-prod' },
    MI: { label: 'صرف خامات لورشة', prefix: 'MIS', perm: 'outwork', icon: 'out', lines: true, partyTypes: ['workshop'], route: 'issues' },
    MR: { label: 'مرتجع خامات من ورشة', prefix: 'MRT', perm: 'outwork', icon: 'in', lines: true, partyTypes: ['workshop'], route: 'issues' },
    PRC: { label: 'استلام إنتاج', prefix: 'PRC', perm: 'outwork', icon: 'box', partyTypes: ['workshop'], route: 'receipts-prod' },
    WL: { label: 'تسوية فاقد خامات', prefix: 'WST', perm: 'outwork', icon: 'alert', partyTypes: ['workshop'], route: 'reconcile' },
    DJ: { label: 'مهمة رسم/برمجة', prefix: 'DSN', perm: 'models', icon: 'pen', partyTypes: ['designer'], route: 'design-jobs' },
    PAYR: { label: 'مسير أجور', prefix: 'PRL', perm: 'workers', icon: 'users', route: 'payroll' },
  };

  const PARTY_TYPES = {
    customer: 'عميل', supplier: 'مورد', workshop: 'ورشة/مصنع تشغيل', designer: 'رسام/مبرمج',
  };
  const PAY_METHODS = { cash: 'نقدي', transfer: 'تحويل بنكي', cheque: 'شيك', wallet: 'محفظة/إنستاباي', card: 'بطاقة' };
  const RULES = { hour: 'بالساعة', piece: 'بالقطعة', kg: 'بالكيلو' };
  const PAY_TYPES = { weekly: 'أسبوعي ثابت', monthly: 'شهري ثابت', daily: 'يومية', hour: 'بالساعة', piece: 'بالإنتاج (قطعة)' };
  const STATUS = { draft: 'مسودة', posted: 'معتمد', void: 'ملغى' };

  /* ───────── بحث وأسماء ───────── */
  const S = () => DB.s.settings;
  const get = DB.get;
  const nameOf = (coll, id) => { const x = get(coll, id); return x ? x.name : '—'; };
  const subjectName = (st, sid) => (st === 'worker' ? nameOf('workers', sid) : nameOf('parties', sid));
  const docNo = (d) => (d.status === 'draft' ? `مسودة #${d.id}` : d.no);
  const docTitle = (d) => `${TYPES[d.type].label} ${docNo(d)}`;
  const tax = (id) => DB.s.taxes.find((t) => t.id === id) || null;

  /* ───────── السنوات المالية ───────── */
  const fyOf = (date) => DB.s.fiscalYears.find((f) => date >= f.start && date <= f.end) || null;
  function checkFY(date) {
    const fy = fyOf(date);
    if (!fy) fail(`لا توجد سنة مالية تغطي تاريخ ${U.date(date)} — أضفها من الإعدادات`);
    if (fy.status === 'closed') fail(`السنة المالية ${fy.name} مقفلة — لا يمكن تسجيل أو إلغاء عمليات بتاريخ ${U.date(date)}`);
    return fy;
  }

  /* ───────── فهارس الحركات (تُبنى عند الحاجة) ───────── */
  const memo = {};
  function indexBy(coll, keyFn) {
    const arr = DB.s[coll];
    const m = memo[coll + keyFn.name];
    if (m && m.arr === arr && m.len === arr.length) return m.map;
    const map = new Map();
    for (const x of arr) {
      const k = keyFn(x);
      let a = map.get(k);
      if (!a) map.set(k, (a = []));
      a.push(x);
    }
    memo[coll + keyFn.name] = { arr, len: arr.length, map };
    return map;
  }
  const kItem = function kItem(m) { return m.itemId; };
  const kSubj = function kSubj(e) { return e.st + ':' + e.sid; };
  const kAcc = function kAcc(e) { return e.accountId; };
  const kCust = function kCust(c) { return c.partyId + ':' + c.itemId; };
  const kDoc = function kDoc(x) { return x.docId; };

  const movesOf = (itemId) => indexBy('stock', kItem).get(itemId) || [];
  const ledgerOf = (st, sid) => indexBy('ledger', kSubj).get(st + ':' + sid) || [];
  const cashOf = (accountId) => indexBy('cash', kAcc).get(accountId) || [];
  const custodyOf = (partyId, itemId) => indexBy('custody', kCust).get(partyId + ':' + itemId) || [];
  const effectsOf = (docId) => ({
    stock: indexBy('stock', kDoc).get(docId) || [],
    ledger: indexBy('ledger', kDoc).get(docId) || [],
    cash: indexBy('cash', kDoc).get(docId) || [],
    custody: indexBy('custody', kDoc).get(docId) || [],
  });

  /* ───────── الأرصدة ───────── */
  function onHand(itemId, whId, asOf) {
    let q = 0;
    for (const m of movesOf(itemId)) {
      if (whId != null && m.whId !== whId) continue;
      if (asOf && m.date > asOf) continue;
      q += m.qty;
    }
    return r3(q);
  }
  // متوسط مرجح متحرك بترتيب التسجيل (للصنف في كل المخازن)
  // الكمية السالبة (بيع بالتجاوز) تبقى محمّلة بتكلفة صرفها؛ والوارد الذي يغطيها يدخل بتكلفته
  // والفرق بين التكلفتين يُسجل "فرق تكلفة" على مستند الوارد ويدخل تكلفة المبيعات (costVariance)
  function stepCost(st, qty, cost) {
    if (qty > 0 && st.q < -EPS) {
      const negUnit = st.v / st.q;
      st.q += qty;
      st.v = st.q > EPS ? st.q * cost : st.q * negUnit;
    } else { st.q += qty; st.v += qty * cost; }
    if (Math.abs(st.q) <= EPS) { st.q = 0; st.v = 0; }
    return st;
  }
  function costState(itemId, asOf) {
    const st = { q: 0, v: 0 };
    for (const m of movesOf(itemId)) { if (asOf && m.date > asOf) continue; stepCost(st, m.qty, m.cost); }
    return st;
  }
  function avgCost(itemId) {
    const st = costState(itemId);
    if (Math.abs(st.q) > EPS) return r4(st.v / st.q);
    const it = get('items', itemId);
    return it ? +it.lastCost || 0 : 0;
  }
  // القيمة من مجموع الحركات نفسه (وليس الكمية × متوسط مقرّب)
  const stockValue = (itemId, whId) => { if (whId == null) { const st = costState(itemId); return r2(st.q > EPS ? st.v : 0); } return r2(onHand(itemId, whId) * avgCost(itemId)); };
  // آخر تكلفة شراء من المستندات المعتمدة (تُستعاد تلقائيًا عند إلغاء فاتورة شراء)
  function refreshLastCost(itemId) {
    const it = get('items', itemId);
    if (!it) return;
    const ms = movesOf(itemId).filter((m) => m.qty > 0 && !m.rev && ['PI', 'OS'].includes(m.docType) && (get('docs', m.docId) || {}).status === 'posted');
    it.lastCost = ms.length ? ms[ms.length - 1].cost : 0;
  }
  function balance(st, sid, asOf) {
    let b = 0;
    for (const e of ledgerOf(st, sid)) if (!asOf || e.date <= asOf) b += e.amount;
    return r2(b);
  }
  function cashBalance(accountId, asOf) {
    let b = 0;
    for (const e of cashOf(accountId)) if (!asOf || e.date <= asOf) b += e.amount;
    return r2(b);
  }
  function custodyQty(partyId, itemId) { return r3(sum(custodyOf(partyId, itemId), (c) => c.qty)); }
  function custodyAvg(partyId, itemId) {
    let q = 0, v = 0;
    for (const c of custodyOf(partyId, itemId)) {
      q += c.qty; v += c.qty * c.cost;
      if (q <= EPS) { q = Math.max(q, 0); v = 0; }
    }
    return q > EPS ? r4(v / q) : avgCost(itemId);
  }
  function custodyItems(partyId) {
    const out = [];
    const seen = new Set(DB.s.custody.filter((c) => c.partyId === partyId).map((c) => c.itemId));
    for (const itemId of seen) {
      const q = custodyQty(partyId, itemId);
      out.push({ itemId, qty: q, avg: custodyAvg(partyId, itemId), value: r2(q * custodyAvg(partyId, itemId)) });
    }
    return out;
  }

  /* ───────── أسعار الساعة/القطعة عبر الزمن ───────── */
  function rateFor(kind, refId, rule, date) {
    const c = DB.s.rates
      .filter((r) => r.kind === kind && r.rule === rule && r.from <= date && (r.refId === refId || r.refId == null))
      .sort((a, b) => (a.refId == null) - (b.refId == null) || (a.from < b.from ? 1 : -1));
    return c[0] || null;
  }
  const opRate = (opId, date) => { const r = rateFor('operation', opId, 'piece', date); return r ? r.rate : 0; };

  // تقسيم مبلغ على أوزان بالقرش (أكبر باقٍ) بحيث يساوي مجموع الأجزاء المبلغ تمامًا
  function alloc(amount, weights) {
    const cents = Math.round(amount * 100), tw = weights.reduce((a, b) => a + b, 0);
    if (!tw) return weights.map(() => 0);
    const raw = weights.map((x) => (cents * x) / tw), fl = raw.map(Math.floor);
    let rem = cents - fl.reduce((a, b) => a + b, 0);
    raw.map((x, i) => [x - fl[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rem > 0) { fl[i]++; rem--; } });
    return fl.map((c) => c / 100);
  }
  /* ───────── حساب الفواتير (مبيعات/مشتريات/مرتجعات) ───────── */
  function unitFactor(line) {
    const it = get('items', line.itemId);
    return line.unit === 'alt' && it && it.altFactor ? +it.altFactor : 1;
  }
  function calcTrade(d) {
    const t = d.taxId ? tax(d.taxId) : null;
    const rate = t ? t.rate / 100 : 0;
    let sub = 0;
    for (const l of d.lines) {
      l.qty = U.num(l.qty); l.price = U.num(l.price); l.disc = Math.min(100, Math.max(0, U.num(l.disc)));
      l.baseQty = l.kind === 'expense' ? 0 : r4(l.qty * unitFactor(l));
      l.gross = r2(l.qty * l.price);
      l.discAmt = r2((l.gross * l.disc) / 100);
      l.net = r2(l.gross - l.discAmt);
      sub += l.net;
    }
    sub = r2(sub);
    const discount = Math.max(0, Math.min(r2(U.num(d.discount)), sub));
    const taxable = r2(sub - discount);
    let net, taxAmt, total;
    if (!rate) { net = taxable; taxAmt = 0; total = taxable; }
    else if (d.priceIncludesTax) { total = taxable; net = r2(total / (1 + rate)); taxAmt = r2(total - net); }
    else { net = taxable; taxAmt = r2(net * rate); total = r2(net + taxAmt); }
    const w = d.lines.map((l) => l.net);
    const nets = alloc(net, w), tots = alloc(total, w);
    d.lines.forEach((l, i) => { l.netExTax = nets[i]; l.totalShare = tots[i]; });
    d.totals = { sub, discount, taxable, taxRate: t ? t.rate : 0, taxName: t ? t.name : '', tax: taxAmt, net, total };
    return d.totals;
  }

  /* ───────── ورديات/أجور ───────── */
  function payrollPreview(from, to, workerIds, draftId) {
    const days = U.daysBetween(from, to) + 1;
    const fullMonths = (() => {
      if (from.slice(8) !== '01' || to !== U.endOfMonth(to)) return null;
      return (U.year(to) - U.year(from)) * 12 + U.month(to) - U.month(from) + 1;
    })();
    const months = fullMonths || r2(days / 30);
    // الأسبوعي يُحسب بعدد الأسابيع الفعلي في الفترة (نسبة وتناسب للفترات غير الكاملة)
    const weeks = days % 7 === 0 ? days / 7 : r2(days / 7);
    const lines = [];
    for (const w of DB.s.workers) {
      if (workerIds && !workerIds.includes(w.id)) continue;
      if (!w.active && !workerIds) continue;
      if (w.startDate && w.startDate > to) continue;
      const logs = DB.s.workLogs.filter((l) => l.workerId === w.id && l.date >= from && l.date <= to && (!l.payrollId || l.payrollId === draftId));
      let gross = 0, basis = '';
      const rate = +w.rate || 0;
      if (w.payType === 'weekly') { gross = (rate * days) / 7; basis = `${weeks} أسبوع × ${U.money(rate)}`; }
      else if (w.payType === 'monthly') { gross = fullMonths ? rate * fullMonths : (rate * days) / 30; basis = `${months} شهر × ${U.money(rate)}`; }
      else if (w.payType === 'daily') {
        const d = sum(logs.filter((l) => l.kind === 'days'), (l) => l.qty);
        gross = d * rate; basis = `${U.qty(d)} يوم × ${U.money(rate)}`;
      } else if (w.payType === 'hour') {
        const h = sum(logs.filter((l) => l.kind === 'hours'), (l) => l.qty);
        gross = h * rate; basis = `${U.qty(h)} ساعة × ${U.money(rate)}`;
      } else if (w.payType === 'piece') {
        const parts = [];
        for (const l of logs.filter((x) => x.kind === 'pieces')) {
          const r = opRate(l.opId, l.date);
          gross += l.qty * r;
          parts.push(`${U.int(l.qty)} ${nameOf('operations', l.opId)} × ${U.money(r)}`);
        }
        basis = parts.length ? parts.join(' + ') : 'لا يوجد إنتاج مسجل';
      }
      gross = r2(gross);
      const bal = balance('worker', w.id); // موجب = سلف على العامل
      lines.push({
        workerId: w.id, deptId: w.deptId, payType: w.payType, basis, gross, bonus: 0, deduction: 0, net: gross,
        advance: bal > 0 ? bal : 0, logIds: logs.map((l) => l.id),
      });
    }
    return { from, to, days, lines };
  }
  function calcPayroll(d) {
    for (const l of d.lines) {
      l.gross = r2(U.num(l.gross)); l.bonus = r2(U.num(l.bonus)); l.deduction = r2(U.num(l.deduction));
      l.net = r2(l.gross + l.bonus - l.deduction);
    }
    d.totals = { gross: sum(d.lines, (l) => l.gross), bonus: sum(d.lines, (l) => l.bonus), deduction: sum(d.lines, (l) => l.deduction), total: sum(d.lines, (l) => l.net) };
    return d.totals;
  }

  /* ───────── حساب استلام الإنتاج (المصنعية) ───────── */
  function calcPRC(d) {
    const wo = get('orders', d.woId);
    d.hours = r2(U.num(d.hours)); d.qtyGood = r3(U.num(d.qtyGood)); d.qtyRejected = r3(U.num(d.qtyRejected));
    for (const l of d.lines) { l.qty = r3(U.num(l.qty)); }
    const kg = sum(d.lines, (l) => l.qty);
    const rule = wo ? wo.rule : 'hour';
    let rate = 0, rateSrc = '';
    if (wo && wo.agreedRate) { rate = +wo.agreedRate; rateSrc = 'سعر متفق عليه في أمر التشغيل'; }
    else if (wo) {
      const r = rateFor('workshop', wo.partyId, rule, d.date);
      if (r) { rate = r.rate; rateSrc = (r.refId ? 'سعر خاص بالورشة' : 'السعر العام') + ` ساري من ${U.date(r.from)}`; }
    }
    const basisQty = rule === 'hour' ? d.hours : rule === 'piece' ? d.qtyGood : kg;
    const unitLbl = rule === 'hour' ? 'ساعة' : rule === 'piece' ? 'قطعة' : 'كجم';
    const fee = r2(basisQty * rate);
    d.calc = Object.assign(d.calc || {}, {
      rule, rate, rateSrc, basisQty, kg, fee,
      formula: `${U.qty(basisQty)} ${unitLbl} × ${U.money(rate)} = ${U.money(fee)}`,
    });
    d.totals = { total: fee };
    return d.calc;
  }

  function calcDoc(d) {
    if (['SI', 'SR', 'PI', 'PR'].includes(d.type)) return calcTrade(d);
    if (d.type === 'PAYR') return calcPayroll(d);
    if (d.type === 'PRC') return calcPRC(d);
    if (d.type === 'DJ') {
      for (const l of d.lines) l.amount = r2(U.num(l.amount));
      d.totals = { total: sum(d.lines, (l) => l.amount) };
      return d.totals;
    }
    if (['OS'].includes(d.type)) {
      for (const l of d.lines) { l.qty = U.num(l.qty); l.cost = U.num(l.cost); l.value = r2(l.qty * l.cost); }
      d.totals = { total: sum(d.lines, (l) => l.value) };
      return d.totals;
    }
    if (['ADJ', 'STR', 'MI', 'MR', 'CI', 'IP'].includes(d.type)) {
      for (const l of d.lines) { l.qty = U.num(l.qty); }
      if (d.type === 'IP') d.qtyGood = r3(U.num(d.qtyGood));
      d.totals = { total: 0 };
      return d.totals;
    }
    d.amount = r2(U.num(d.amount));
    d.totals = { total: d.amount };
    return d.totals;
  }

  /* ───────── مسودات ───────── */
  function newDoc(type, init) {
    const d = Object.assign({
      id: null, type, no: null, date: U.today(), status: 'draft', notes: '', lines: [],
      createdAt: U.now(), createdBy: user() ? user().name : 'النظام',
    }, init || {});
    if (TYPES[type].lines && !d.lines.length) d.lines = [];
    return d;
  }
  function saveDraft(d) {
    need(TYPES[d.type].perm);
    return DB.tx(() => {
      calcDoc(d);
      if (d.id) {
        const cur = get('docs', d.id);
        if (!cur) fail('المستند غير موجود');
        if (cur.status !== 'draft') fail('لا يمكن تعديل مستند معتمد — استخدم "إلغاء وتعديل"');
        const keep = { createdAt: cur.createdAt, createdBy: cur.createdBy };
        Object.keys(cur).forEach((k) => delete cur[k]);
        Object.assign(cur, U.clone(d), keep, { updatedAt: U.now(), status: 'draft' });
        DB.audit('تعديل مسودة', d.type, cur.id, docTitle(cur));
        return cur;
      }
      const nd = DB.add('docs', Object.assign(U.clone(d), { status: 'draft', createdAt: U.now() }));
      DB.audit('إنشاء مسودة', d.type, nd.id, docTitle(nd));
      return nd;
    });
  }
  function deleteDraft(id) {
    const d = get('docs', id);
    if (!d) return;
    need(TYPES[d.type].perm);
    if (d.status !== 'draft') fail('لا يُحذف المستند المعتمد نهائيًا — استخدم الإلغاء الموثق');
    DB.tx(() => { DB.remove('docs', id); DB.audit('حذف مسودة', d.type, id, docTitle(d)); });
  }

  /* ───────── قواعد الترحيل: كل نوع مستند ← حركاته ───────── */
  function buildEffects(d) {
    const fx = { stock: [], ledger: [], cash: [], custody: [] };
    const st = (itemId, whId, qty, cost, memo) => fx.stock.push({ itemId, whId, qty: r4(qty), cost: r4(cost), memo });
    const lg = (stp, sid, amount, memo) => { if (Math.abs(amount) > 0.004) fx.ledger.push({ st: stp, sid, amount: r2(amount), memo }); };
    const ch = (accountId, amount, memo, extra) => { if (Math.abs(amount) > 0.004) fx.cash.push(Object.assign({ accountId, amount: r2(amount), memo, method: d.method || 'cash', st: d.st || null, sid: d.sid || null }, extra || {})); };
    const cu = (partyId, itemId, qty, cost, memo) => fx.custody.push({ partyId, itemId, qty: r4(qty), cost: r4(cost), memo, woId: d.woId || null });
    const T = d.totals || {};
    const itemLines = () => d.lines.filter((l) => l.kind !== 'expense');

    switch (d.type) {
      case 'SI': {
        let cogs = 0;
        // نجمع تكلفة كل صنف مرة واحدة حتى لا يتغير المتوسط داخل نفس الفاتورة
        for (const l of itemLines()) {
          const c = avgCost(l.itemId);
          l.costUnit = c; l.cost = r2(c * l.baseQty); cogs += l.cost;
          st(l.itemId, d.whId, -l.baseQty, c, 'بيع');
        }
        d.calc = { cogs: r2(cogs), profit: r2(T.net - cogs) };
        lg('party', d.sid, T.total, 'فاتورة مبيعات');
        if (d.paid > 0) { lg('party', d.sid, -d.paid, 'دفعة مع الفاتورة'); ch(d.accountId, d.paid, 'تحصيل مع فاتورة مبيعات'); }
        break;
      }
      case 'SR': {
        let cost = 0;
        const inv = d.refId ? get('docs', d.refId) : null;
        for (const l of itemLines()) {
          const src = inv && inv.lines.find((x) => x.itemId === l.itemId && x.costUnit != null);
          const c = src ? src.costUnit : avgCost(l.itemId);
          l.costUnit = c; l.cost = r2(c * l.baseQty); cost += l.cost;
          st(l.itemId, d.whId, l.baseQty, c, 'مرتجع مبيعات');
        }
        d.calc = { cogs: r2(cost) };
        lg('party', d.sid, -T.total, 'مرتجع مبيعات');
        if (d.paid > 0) { lg('party', d.sid, d.paid, 'رد قيمة مرتجع'); ch(d.accountId, -d.paid, 'رد نقدية مرتجع مبيعات'); }
        break;
      }
      case 'PI': {
        const recoverable = S().purchaseTaxRecoverable !== false;
        for (const l of d.lines) {
          if (l.kind === 'expense') { l.expValue = recoverable ? l.netExTax : l.totalShare; continue; }
          const base = recoverable ? l.netExTax : l.totalShare;
          l.costUnit = l.baseQty ? r4(base / l.baseQty) : 0;
          st(l.itemId, d.whId, l.baseQty, l.costUnit, 'شراء');
          const it = get('items', l.itemId);
          if (it) it.lastCost = l.costUnit;
        }
        lg('party', d.sid, -T.total, 'فاتورة مشتريات');
        if (d.paid > 0) { lg('party', d.sid, d.paid, 'دفعة مع الفاتورة'); ch(d.accountId, -d.paid, 'سداد مع فاتورة مشتريات'); }
        break;
      }
      case 'PR': {
        const recoverable = S().purchaseTaxRecoverable !== false;
        for (const l of d.lines) {
          if (l.kind === 'expense') { l.expValue = recoverable ? l.netExTax : l.totalShare; continue; }
          const c = l.baseQty ? r4((recoverable ? l.netExTax : l.totalShare) / l.baseQty) : 0;
          l.costUnit = c;
          st(l.itemId, d.whId, -l.baseQty, c, 'مرتجع مشتريات');
        }
        lg('party', d.sid, T.total, 'مرتجع مشتريات');
        if (d.paid > 0) { lg('party', d.sid, -d.paid, 'استرداد قيمة مرتجع'); ch(d.accountId, d.paid, 'استرداد من مورد'); }
        break;
      }
      case 'RC':
        lg(d.st, d.sid, -d.amount, 'تحصيل');
        ch(d.accountId, d.amount, 'تحصيل من ' + subjectName(d.st, d.sid));
        break;
      case 'PY':
        lg(d.st, d.sid, d.amount, d.purpose === 'advance' ? 'سلفة' : 'دفعة');
        ch(d.accountId, -d.amount, (d.purpose === 'advance' ? 'سلفة إلى ' : 'صرف إلى ') + subjectName(d.st, d.sid));
        break;
      case 'EX':
        if (d.payMode === 'credit') lg('party', d.sid, -d.amount, 'مصروف آجل: ' + nameOf('expenseCats', d.catId));
        else ch(d.accountId, -d.amount, 'مصروف: ' + nameOf('expenseCats', d.catId));
        break;
      case 'IN':
        ch(d.accountId, d.amount, 'إيراد: ' + nameOf('incomeCats', d.catId));
        break;
      case 'TR':
        ch(d.accountId, -d.amount, 'تحويل إلى ' + nameOf('accounts', d.accountTo));
        ch(d.accountTo, d.amount, 'تحويل من ' + nameOf('accounts', d.accountId));
        break;
      case 'OB':
        lg(d.st, d.sid, d.side === 'credit' ? -d.amount : d.amount, 'رصيد افتتاحي');
        break;
      case 'OA':
        ch(d.accountId, d.amount, 'رصيد افتتاحي');
        break;
      case 'OS':
        for (const l of d.lines) {
          st(l.itemId, d.whId, l.qty, l.cost, 'رصيد افتتاحي');
          const it = get('items', l.itemId);
          if (it && !it.lastCost) it.lastCost = l.cost;
        }
        break;
      case 'ADJ': {
        let value = 0;
        for (const l of d.lines) {
          l.system = onHand(l.itemId, d.whId, d.date);
          l.diff = r3(l.qty - l.system);
          l.costUnit = avgCost(l.itemId);
          l.value = r2(l.diff * l.costUnit);
          value += l.value;
          if (Math.abs(l.diff) > EPS) st(l.itemId, d.whId, l.diff, l.costUnit, l.diff > 0 ? 'زيادة جرد' : 'عجز جرد');
        }
        d.calc = { value: r2(value) };
        break;
      }
      case 'STR':
        for (const l of d.lines) {
          const c = avgCost(l.itemId);
          st(l.itemId, d.whId, -l.qty, c, 'تحويل إلى ' + nameOf('warehouses', d.whTo));
          st(l.itemId, d.whTo, l.qty, c, 'تحويل من ' + nameOf('warehouses', d.whId));
        }
        break;
      case 'CI': {
        let value = 0;
        for (const l of d.lines) {
          const c = avgCost(l.itemId);
          l.costUnit = c; l.value = r2(c * l.qty); value += l.value;
          st(l.itemId, d.whId, -l.qty, c, 'استهلاك: ' + nameOf('expenseCats', d.catId));
        }
        d.calc = { value: r2(value) };
        d.totals = { total: r2(value) };
        break;
      }
      case 'IP': {
        let mat = 0;
        for (const l of d.lines) {
          const c = avgCost(l.itemId);
          l.costUnit = c; mat += c * l.qty;
          st(l.itemId, d.whId, -l.qty, c, 'خامات إنتاج داخلي');
        }
        const unit = r4(mat / d.qtyGood);
        st(d.itemId, d.whTo, d.qtyGood, unit, 'إنتاج داخلي');
        d.calc = { materialCost: r2(mat), unitCost: unit };
        d.totals = { total: r2(mat) };
        break;
      }
      case 'MI': {
        let value = 0;
        for (const l of d.lines) {
          const c = avgCost(l.itemId);
          l.costUnit = c; value += c * l.qty;
          st(l.itemId, d.whId, -l.qty, c, 'صرف لورشة ' + nameOf('parties', d.sid));
          cu(d.sid, l.itemId, l.qty, c, 'استلام خامات');
        }
        d.calc = { value: r2(value) };
        break;
      }
      case 'MR':
        for (const l of d.lines) {
          const c = custodyAvg(d.sid, l.itemId);
          l.costUnit = c;
          cu(d.sid, l.itemId, -l.qty, c, 'مرتجع للمخزن');
          st(l.itemId, d.whId, l.qty, c, 'مرتجع من ورشة ' + nameOf('parties', d.sid));
        }
        break;
      case 'PRC': {
        const c = d.calc;
        let mat = 0;
        for (const l of d.lines) {
          const u = custodyAvg(d.sid, l.itemId);
          l.costUnit = u; mat += u * l.qty;
          cu(d.sid, l.itemId, -l.qty, u, 'استهلاك في إنتاج');
        }
        c.materialCost = r2(mat);
        if (d.qtyGood > 0) {
          c.unitCost = r4((mat + c.fee) / d.qtyGood);
          st(d.itemId, d.whId, d.qtyGood, c.unitCost, 'استلام إنتاج من ' + nameOf('parties', d.sid));
          c.capitalized = true;
        } else { c.unitCost = 0; c.capitalized = false; }
        lg('party', d.sid, -c.fee, 'مصنعية: ' + c.formula);
        break;
      }
      case 'WL': {
        const u = custodyAvg(d.sid, d.itemId);
        d.qty = r3(U.num(d.qty));
        const value = r2(u * d.qty);
        cu(d.sid, d.itemId, -d.qty, u, 'تسوية فاقد');
        const hasAmt = d.chargeAmount !== '' && d.chargeAmount != null;
        d.calc = { costUnit: u, value, charged: d.charge ? r2(hasAmt ? U.num(d.chargeAmount) : value) : 0 };
        if (d.charge) lg('party', d.sid, d.calc.charged, 'تحميل فاقد خامات على الورشة');
        d.totals = { total: value };
        break;
      }
      case 'DJ':
        lg('party', d.sid, -T.total, `رسم/برمجة ${d.lines.length} موديل`);
        break;
      case 'PAYR':
        for (const l of d.lines) lg('worker', l.workerId, -l.net, `أجر الفترة ${U.date(d.from)} - ${U.date(d.to)}`);
        break;
    }
    return fx;
  }

  /* ───────── التحقق قبل الاعتماد ───────── */
  function validate(d) {
    const T = TYPES[d.type];
    const errs = [];
    if (!d.date) errs.push('التاريخ مطلوب');
    if (T.partyTypes) {
      const p = get('parties', d.sid);
      if (!p) errs.push('اختر ' + T.partyTypes.map((t) => PARTY_TYPES[t]).join(' / '));
      else if (!p.active) errs.push(`الطرف "${p.name}" موقوف — أعد تنشيطه أولًا`);
      else if (!T.partyTypes.some((t) => p.types.includes(t))) errs.push(`"${p.name}" ليس ${PARTY_TYPES[T.partyTypes[0]]}`);
    }
    if (T.lines) {
      if (!d.lines.length) errs.push('أضف بندًا واحدًا على الأقل');
      d.lines.forEach((l, i) => {
        const n = i + 1;
        if (l.kind === 'expense') { if (!l.catId) errs.push(`البند ${n}: اختر فئة المصروف`); }
        else if (!get('items', l.itemId)) errs.push(`البند ${n}: اختر الصنف`);
        if (d.type !== 'ADJ' && !(U.num(l.qty) > 0)) errs.push(`البند ${n}: الكمية يجب أن تكون أكبر من صفر`);
        if (d.type === 'ADJ' && U.num(l.qty) < 0) errs.push(`البند ${n}: الكمية المعدودة لا تكون سالبة`);
        if (U.num(l.price) < 0 || U.num(l.cost) < 0) errs.push(`البند ${n}: السعر لا يكون سالبًا`);
        if (d.type === 'OS' && !(U.num(l.cost) > 0)) errs.push(`البند ${n}: أدخل تكلفة الوحدة للرصيد الافتتاحي`);
      });
      const ids = d.lines.filter((l) => l.kind !== 'expense').map((l) => l.itemId);
      if (['ADJ'].includes(d.type) && new Set(ids).size !== ids.length) errs.push('لا تكرر الصنف في نفس الجرد');
    }
    if (['SI', 'SR', 'PI', 'PR', 'OS', 'ADJ', 'STR', 'MI', 'MR', 'CI', 'IP'].includes(d.type) && !get('warehouses', d.whId)) errs.push('اختر المخزن');
    if (d.type === 'STR') { if (!get('warehouses', d.whTo)) errs.push('اختر المخزن المحول إليه'); if (d.whTo === d.whId) errs.push('لا يمكن التحويل لنفس المخزن'); }
    if (d.type === 'CI' && !get('expenseCats', d.catId)) errs.push('اختر بند المصروف الذي يُحمَّل عليه الاستهلاك');
    if (d.type === 'IP') {
      if (!get('warehouses', d.whTo)) errs.push('اختر مخزن استلام المنتج التام');
      if (!get('items', d.itemId)) errs.push('اختر المنتج التام');
      if (!(U.num(d.qtyGood) > 0)) errs.push('الكمية المنتجة يجب أن تكون أكبر من صفر');
    }
    if (['SI', 'SR', 'PI', 'PR'].includes(d.type)) {
      if (U.num(d.discount) < 0) errs.push('خصم الفاتورة لا يكون سالبًا');
      d.paid = r2(U.num(d.paid));
      if (d.paid < 0) errs.push('المبلغ المدفوع لا يكون سالبًا');
      if (d.paid > d.totals.total + 0.004) errs.push('المدفوع أكبر من إجمالي الفاتورة — سجّل الزيادة كسند تحصيل/صرف مستقل');
      if (d.paid > 0 && !get('accounts', d.accountId)) errs.push('اختر الخزينة/الحساب الذي استلم أو دفع المبلغ');
      if (d.type === 'SI' && !can('edit_prices')) {
        d.lines.forEach((l, i) => {
          const it = get('items', l.itemId);
          if (it && Math.abs(l.price - r4(it.salePrice * unitFactor(l))) > 0.004) errs.push(`البند ${i + 1}: ليس لديك صلاحية تعديل السعر`);
          if (l.disc > 0) errs.push(`البند ${i + 1}: ليس لديك صلاحية إعطاء خصم`);
        });
        if (U.num(d.discount) > 0) errs.push('ليس لديك صلاحية إعطاء خصم على الفاتورة');
      }
      if (d.type === 'SR' && d.refId) {
        const inv = get('docs', d.refId);
        if (!inv || inv.status !== 'posted' || inv.type !== 'SI') errs.push('الفاتورة الأصلية غير معتمدة');
        else {
          if (inv.sid !== d.sid) errs.push('العميل لا يطابق الفاتورة الأصلية');
          const prev = DB.s.docs.filter((x) => x.type === 'SR' && x.status === 'posted' && x.refId === inv.id && x.id !== d.id);
          const items = [...new Set(d.lines.filter((l) => l.kind !== 'expense').map((l) => l.itemId))];
          for (const itemId of items) {
            const mine = d.lines.filter((x) => x.itemId === itemId), soldL = inv.lines.filter((x) => x.itemId === itemId);
            const qty = sum(mine, (x) => x.baseQty), val = sum(mine, (x) => x.totalShare);
            const sold = sum(soldL, (x) => x.baseQty), soldVal = sum(soldL, (x) => x.totalShare);
            const ret = sum(prev.flatMap((p) => p.lines.filter((x) => x.itemId === itemId)), (x) => x.baseQty);
            const retVal = sum(prev.flatMap((p) => p.lines.filter((x) => x.itemId === itemId)), (x) => x.totalShare);
            if (!soldL.length) { errs.push(`${nameOf('items', itemId)}: غير موجود في الفاتورة الأصلية`); continue; }
            if (qty > sold - ret + EPS) errs.push(`${nameOf('items', itemId)}: المرتجع (${U.qty(qty)}) أكبر من المتبقي في الفاتورة (${U.qty(sold - ret)})`);
            // القيمة المردودة لا تتجاوز ما دفعه العميل فعلًا لنفس الكمية (بعد خصم الفاتورة)
            else {
              const maxVal = r2(Math.min(soldVal - retVal, (soldVal / sold) * qty) + 0.01);
              if (val > maxVal) errs.push(`${nameOf('items', itemId)}: قيمة المرتجع ${U.money(val)} أكبر من قيمة بيعه ${U.money(maxVal - 0.01)}`);
            }
          }
        }
      }
    }
    if (['RC', 'PY', 'EX', 'IN', 'TR', 'OB', 'OA'].includes(d.type)) {
      if (!(d.amount > 0)) errs.push('المبلغ يجب أن يكون أكبر من صفر');
    }
    if (['RC', 'PY', 'OB'].includes(d.type)) {
      const subj = d.st === 'worker' ? get('workers', d.sid) : get('parties', d.sid);
      if (!subj) errs.push('اختر الطرف');
      else if (subj.active === false) errs.push(`"${subj.name}" موقوف`);
    }
    if (['RC', 'PY', 'IN', 'TR', 'OA'].includes(d.type) && !get('accounts', d.accountId)) errs.push('اختر الخزينة/الحساب');
    if (d.type === 'TR') { if (!get('accounts', d.accountTo)) errs.push('اختر الحساب المحول إليه'); if (d.accountTo === d.accountId) errs.push('لا يمكن التحويل لنفس الحساب'); }
    if (d.type === 'EX') {
      if (!get('expenseCats', d.catId)) errs.push('اختر فئة المصروف');
      if (d.payMode === 'credit') { const p = get('parties', d.sid); if (!p) errs.push('المصروف الآجل يحتاج تحديد المورد المستحق له'); }
      else if (!get('accounts', d.accountId)) errs.push('اختر الخزينة التي دفعت المصروف');
    }
    if (d.type === 'IN' && !get('incomeCats', d.catId)) errs.push('اختر فئة الإيراد');
    if (['MI', 'MR', 'PRC'].includes(d.type)) {
      const wo = get('orders', d.woId);
      if (!wo) errs.push('اختر أمر التشغيل');
      else {
        if (wo.partyId !== d.sid) errs.push('أمر التشغيل لا يخص هذه الورشة');
        if (wo.status !== 'open') errs.push(`أمر التشغيل ${wo.no} ${wo.status === 'closed' ? 'مغلق' : 'ملغى'}`);
      }
    }
    if (d.type === 'PRC') {
      if (d.hours < 0 || d.qtyGood < 0 || d.qtyRejected < 0) errs.push('الساعات والكميات لا تكون سالبة');
      if (!(d.hours > 0) && !(d.qtyGood > 0)) errs.push('سجّل ساعات تشغيل أو كمية منتجة');
      d.lines.forEach((l, i) => { if (!get('items', l.itemId)) errs.push(`خامة ${i + 1}: اختر الصنف`); if (!(l.qty > 0)) errs.push(`خامة ${i + 1}: الكمية يجب أن تكون أكبر من صفر`); });
      if (d.calc && d.calc.fee < 0) errs.push('قيمة المصنعية لا تكون سالبة');
      if (d.qtyGood > 0 && !get('items', d.itemId)) errs.push('اختر صنف المنتج التام');
      if (d.qtyGood > 0 && !get('warehouses', d.whId)) errs.push('اختر مخزن الاستلام');
      if (d.lines.some((l) => l.qty > 0) && !(d.qtyGood > 0)) errs.push('لا يمكن تسجيل استهلاك خامات بدون كمية منتجة مستلمة');
      if (d.calc && !(d.calc.rate > 0)) errs.push('لا يوجد سعر ساري لهذه الورشة في تاريخ الاستلام — عرّف السعر من "أسعار المصنعية"');
    }
    if (d.type === 'WL') {
      if (!get('items', d.itemId)) errs.push('اختر الخامة');
      if (!(U.num(d.qty) > 0)) errs.push('الكمية يجب أن تكون أكبر من صفر');
      if (!d.reason) errs.push('سبب التسوية مطلوب');
      if (d.charge && d.chargeAmount !== '' && d.chargeAmount != null && !(U.num(d.chargeAmount) >= 0)) errs.push('مبلغ التحميل على الورشة لا يكون سالبًا');
    }
    if (d.type === 'DJ') {
      if (!d.lines.length) errs.push('أضف موديلًا واحدًا على الأقل');
      d.lines.forEach((l, i) => { if (!get('models', l.modelId)) errs.push(`السطر ${i + 1}: اختر الموديل`); if (!(l.amount >= 0)) errs.push(`السطر ${i + 1}: التكلفة غير صحيحة`); });
      const ids = d.lines.map((l) => l.modelId);
      if (new Set(ids).size !== ids.length) errs.push('موديل مكرر في نفس المهمة');
    }
    if (d.type === 'PAYR') {
      if (!d.from || !d.to || d.from > d.to) errs.push('حدد فترة الاستحقاق بشكل صحيح');
      if (!d.lines.length) errs.push('لا يوجد عمال في المسير');
      d.lines.forEach((l) => { if (l.net < 0) errs.push(`${nameOf('workers', l.workerId)}: صافي الأجر سالب`); });
      // منع احتساب نفس الفترة مرتين لنفس العامل
      for (const o of DB.s.docs.filter((x) => x.type === 'PAYR' && x.status === 'posted' && x.id !== d.id)) {
        if (o.from <= d.to && o.to >= d.from) {
          const dup = d.lines.filter((l) => o.lines.some((x) => x.workerId === l.workerId) && ['weekly', 'monthly'].includes(l.payType));
          dup.forEach((l) => errs.push(`${nameOf('workers', l.workerId)}: تم احتساب أجره الثابت لفترة متداخلة في ${o.no}`));
        }
      }
    }
    if (errs.length) fail('راجع البيانات قبل الاعتماد', errs);
  }

  // أقل رصيد سيصل إليه الحساب من تاريخ المستند فصاعدًا لو أُضيفت الحركة في ذلك التاريخ
  function lowestFrom(moves, date, delta, val) {
    let base = 0;
    const later = [];
    for (const m of moves) { if (m.date <= date) base += val(m); else later.push(m); }
    later.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    let run = base + delta, min = run, at = date;
    for (const m of later) { run += val(m); if (run < min) { min = run; at = m.date; } }
    return { have: base, min, at };
  }
  // فحص الأرصدة بعد تطبيق الحركات: مخزون/عهدة/خزائن — في تاريخ المستند وكل تاريخ لاحق
  function checkBalances(fx, opts) {
    const date = opts.date;
    const errs = [];
    const allowNeg = S().allowNegativeStock || (opts.override && can('negative_stock'));
    const sd = new Map();
    for (const m of fx.stock) { const k = m.itemId + ':' + m.whId; sd.set(k, (sd.get(k) || 0) + m.qty); }
    for (const [k, delta] of sd) {
      if (delta >= 0) continue;
      const [itemId, whId] = k.split(':').map(Number);
      const r = lowestFrom(movesOf(itemId).filter((m) => m.whId === whId), date, delta, (m) => m.qty);
      if (r.min < -EPS && !allowNeg) errs.push(r.have + delta < -EPS ? `${nameOf('items', itemId)} في ${nameOf('warehouses', whId)}: المتاح في ${U.date(date)} هو ${U.qty(r.have)} والمطلوب ${U.qty(-delta)}` : `${nameOf('items', itemId)} في ${nameOf('warehouses', whId)}: الرصيد سيصبح سالبًا في ${U.date(r.at)} لأن حركات لاحقة اعتمدت على هذه الكمية`);
    }
    const cd = new Map();
    for (const c of fx.custody) { const k = c.partyId + ':' + c.itemId; cd.set(k, (cd.get(k) || 0) + c.qty); }
    for (const [k, delta] of cd) {
      if (delta >= 0) continue;
      const [partyId, itemId] = k.split(':').map(Number);
      const r = lowestFrom(custodyOf(partyId, itemId), date, delta, (m) => m.qty), have = r3(r.have);
      if (r.min < -EPS && !allowNeg) errs.push(`عهدة ${nameOf('parties', partyId)} من ${nameOf('items', itemId)}: ${U.qty(have)} فقط والمطلوب ${U.qty(-delta)}`);
    }
    if (!S().allowNegativeCash) {
      const ad = new Map();
      for (const c of fx.cash) ad.set(c.accountId, (ad.get(c.accountId) || 0) + c.amount);
      for (const [acc, delta] of ad) {
        if (delta >= 0) continue;
        const r = lowestFrom(cashOf(acc), date, delta, (m) => m.amount);
        if (r.min < -0.004) errs.push(r.have + delta < -0.004 ? `رصيد ${nameOf('accounts', acc)} في ${U.date(date)} هو ${U.money(r2(r.have))} ولا يكفي لصرف ${U.money(-delta)}` : `رصيد ${nameOf('accounts', acc)} سيصبح سالبًا في ${U.date(r.at)} بسبب مدفوعات لاحقة اعتمدت عليه`);
      }
    }
    if (errs.length) fail(opts.reversal ? 'لا يمكن الإلغاء لأن الأرصدة لا تسمح' : 'الرصيد غير كافٍ', errs);
  }

  function writeEffects(d, fx, rev) {
    const base = { date: d.date, docId: d.id, docType: d.type, rev: !!rev };
    for (const k of ['stock', 'ledger', 'cash', 'custody']) for (const e of fx[k]) DB.add(k, Object.assign({}, e, base));
  }

  function nextNumber(d) {
    const T = TYPES[d.type];
    const y = U.year(d.date);
    const n = DB.s.seq.numbers;
    n[d.type] = n[d.type] || {};
    n[d.type][y] = (n[d.type][y] || 0) + 1;
    return `${T.prefix}-${y}-${U.pad(n[d.type][y])}`;
  }

  /* اعتماد: مسودة ← معتمد (ذري، ولا يتكرر) */
  function post(id, opts = {}) {
    return DB.tx(() => {
      const d = get('docs', id);
      if (!d) fail('المستند غير موجود');
      need(TYPES[d.type].perm); need('post');
      if (d.status === 'posted') fail('هذا المستند معتمد بالفعل — لم يتم تكرار أي حركة');
      if (d.status !== 'draft') fail('لا يمكن اعتماد مستند ملغى');
      checkFY(d.date);
      calcDoc(d);
      validate(d);
      const fx = buildEffects(d);
      checkBalances(fx, { override: d.overrideNegative, date: d.date });
      // وارد يغطي كمية سالبة: فرق التكلفة يدخل تكلفة المبيعات بدل أن يضيع
      if (d.type !== 'STR') {
        const states = new Map();
        let variance = 0;
        for (const m of fx.stock) {
          const st = states.get(m.itemId) || costState(m.itemId);
          if (m.qty > 0 && st.q < -EPS) variance += Math.min(m.qty, -st.q) * (m.cost - st.v / st.q);
          states.set(m.itemId, stepCost(st, m.qty, m.cost));
        }
        if (Math.abs(variance) > 0.004) d.calc = Object.assign(d.calc || {}, { costVariance: r2(variance) });
      }
      d.no = nextNumber(d);
      d.status = 'posted';
      d.postedAt = U.now();
      d.postedBy = user() ? user().name : 'النظام';
      if (['SI', 'SR', 'PI', 'PR'].includes(d.type)) {
        // لقطة ثابتة: تغيير القالب أو بيانات الشركة لاحقًا لا يغير الفاتورة التاريخية
        const tpl = DB.s.templates.find((t) => t.id === d.templateId) || DB.s.templates.find((t) => t.isDefault) || DB.s.templates[0];
        d.snapshot = {
          company: U.clone(S().company),
          template: tpl ? U.clone(tpl) : null,
          party: (() => { const p = get('parties', d.sid); return p ? { name: p.name, code: p.code, phone: p.phone, address: p.address, taxNo: p.taxNo } : null; })(),
          balanceAfter: null,
        };
      }
      if (d.type === 'PAYR') for (const l of d.lines) for (const lid of l.logIds || []) { const wl = get('workLogs', lid); if (wl) wl.payrollId = d.id; }
      writeEffects(d, fx, false);
      if (d.snapshot && d.sid) d.snapshot.balanceAfter = balance('party', d.sid);
      DB.audit('اعتماد', d.type, d.id, docTitle(d) + ' — ' + U.money((d.totals && d.totals.total) || 0));
      return d;
    });
  }

  /* إلغاء موثق: حركات عكسية بنفس القيم، والمستند الأصلي يبقى للتاريخ */
  function voidDoc(id, reason) {
    return DB.tx(() => {
      const d = get('docs', id);
      if (!d) fail('المستند غير موجود');
      need(TYPES[d.type].perm); need('void');
      if (d.status !== 'posted') fail('يمكن إلغاء المستندات المعتمدة فقط');
      if (!reason || reason.trim().length < 3) fail('اكتب سبب الإلغاء');
      checkFY(d.date);
      if (d.type === 'SI') {
        const r = DB.s.docs.find((x) => x.type === 'SR' && x.status === 'posted' && x.refId === d.id);
        if (r) fail(`لا يمكن إلغاء الفاتورة لوجود مرتجع معتمد مرتبط بها (${r.no}) — ألغِ المرتجع أولًا`);
      }
      if (d.type === 'DJ' || d.type === 'PAYR' || d.type === 'PRC') { /* مسموح: الرصيد يعاد حسابه تلقائيًا */ }
      const ef = effectsOf(d.id);
      if (['PI', 'OS', 'SR', 'MR', 'PRC', 'IP', 'ADJ'].includes(d.type)) {
        const ins = ef.stock.filter((e) => !e.rev && e.qty > 0);
        if (ins.length) {
          const from = DB.s.stock.indexOf(ins[0]), items = new Set(ins.map((e) => e.itemId));
          const later = DB.s.stock.slice(from + 1).find((m) => items.has(m.itemId) && m.qty < 0 && !m.rev && m.docId !== d.id && (get('docs', m.docId) || {}).status === 'posted');
          if (later) fail(`لا يمكن إلغاء المستند: تم صرف ${nameOf('items', later.itemId)} بعده (${docNo(get('docs', later.docId))}) بتكلفة محسوبة على أساسه`, [d.type === 'PI' ? 'سجّل مرتجع مشتريات بدلًا من الإلغاء' : 'ألغِ المستندات اللاحقة أولًا أو سجّل تسوية']);
        }
      }
      const neg = (arr) => arr.filter((e) => !e.rev).map((e) => { const c = Object.assign({}, e); delete c.id; c.qty != null && (c.qty = -c.qty); c.amount != null && (c.amount = -c.amount); c.memo = 'إلغاء: ' + (e.memo || ''); return c; });
      const fx = { stock: neg(ef.stock), ledger: neg(ef.ledger), cash: neg(ef.cash), custody: neg(ef.custody) };
      checkBalances(fx, { reversal: true, date: d.date });
      writeEffects(d, fx, true);
      d.status = 'void';
      d.voidAt = U.now();
      d.voidBy = user() ? user().name : 'النظام';
      d.voidReason = reason.trim();
      if (d.type === 'PI') for (const id of new Set(ef.stock.map((e) => e.itemId))) refreshLastCost(id);
      if (d.type === 'PAYR') for (const wl of DB.s.workLogs) if (wl.payrollId === d.id) wl.payrollId = null;
      DB.audit('إلغاء', d.type, d.id, docTitle(d) + ' — السبب: ' + d.voidReason);
      return d;
    });
  }

  function duplicate(id) {
    const d = get('docs', id);
    const c = U.clone(d);
    ['id', 'no', 'postedAt', 'postedBy', 'voidAt', 'voidBy', 'voidReason', 'snapshot', 'calc', 'updatedAt'].forEach((k) => delete c[k]);
    c.status = 'draft'; c.createdAt = U.now(); c.createdBy = user() ? user().name : 'النظام';
    c.copyOf = d.id;
    if (c.lines) c.lines.forEach((l) => { delete l.costUnit; delete l.cost; delete l.system; delete l.diff; });
    if (c.type === 'PAYR') c.lines.forEach((l) => (l.logIds = []));
    return c;
  }
  // تعديل مستند معتمد = إلغاء موثق + نسخة مسودة جديدة
  function voidAndCopy(id, reason) {
    return DB.tx(() => {
      voidDoc(id, reason);
      const c = duplicate(id);
      c.date = get('docs', id).date;
      const nd = DB.add('docs', c);
      if (nd.type === 'PAYR') {
        const prev = payrollPreview(nd.from, nd.to, nd.lines.map((l) => l.workerId), nd.id);
        nd.lines.forEach((l) => { const p = prev.lines.find((x) => x.workerId === l.workerId); l.logIds = p ? p.logIds : []; });
      }
      DB.audit('نسخة تعديل', nd.type, nd.id, 'نسخة من ' + get('docs', id).no);
      return nd;
    });
  }

  /* ───────── كشوف الحساب ───────── */
  const docStatus = (docId) => { const d = get('docs', docId); return d ? d.status : 'posted'; };
  function statement(st, sid, from, to, opts = {}) {
    const all = ledgerOf(st, sid).filter((e) => opts.showVoid || docStatus(e.docId) !== 'void');
    const sorted = all.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
    let opening = 0;
    const rows = [];
    for (const e of sorted) {
      if (from && e.date < from) { opening += e.amount; continue; }
      if (to && e.date > to) continue;
      rows.push(e);
    }
    let run = r2(opening);
    const out = rows.map((e) => {
      run = r2(run + e.amount);
      const d = get('docs', e.docId);
      return { e, d, date: e.date, debit: e.amount > 0 ? e.amount : 0, credit: e.amount < 0 ? -e.amount : 0, balance: run };
    });
    return {
      opening: r2(opening), rows: out, closing: run,
      debit: sum(out, (r) => r.debit), credit: sum(out, (r) => r.credit),
    };
  }
  function cashStatement(accountId, from, to) {
    const sorted = cashOf(accountId).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
    let opening = 0; const rows = [];
    for (const e of sorted) {
      if (from && e.date < from) { opening += e.amount; continue; }
      if (to && e.date > to) continue;
      rows.push(e);
    }
    let run = r2(opening);
    const out = rows.map((e) => { run = r2(run + e.amount); return { e, d: get('docs', e.docId), date: e.date, in: e.amount > 0 ? e.amount : 0, out: e.amount < 0 ? -e.amount : 0, balance: run }; });
    return { opening: r2(opening), rows: out, closing: run, in: sum(out, (r) => r.in), out: sum(out, (r) => r.out) };
  }
  function stockCard(itemId, whId, from, to) {
    const ms = movesOf(itemId).filter((m) => whId == null || m.whId === whId);
    let opening = 0; const rows = [];
    for (const m of ms.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id))) {
      if (from && m.date < from) { opening += m.qty; continue; }
      if (to && m.date > to) continue;
      rows.push(m);
    }
    let run = r3(opening);
    const out = rows.map((m) => { const before = run; run = r3(run + m.qty); return { m, d: get('docs', m.docId), before, in: m.qty > 0 ? m.qty : 0, out: m.qty < 0 ? -m.qty : 0, after: run }; });
    return { opening: r3(opening), rows: out, closing: run };
  }

  /* حالة سداد كل مستند (FIFO مع أولوية التخصيص الصريح) */
  function openItems(st, sid) {
    const byDoc = new Map();
    for (const e of ledgerOf(st, sid)) {
      if (docStatus(e.docId) === 'void') continue;
      const x = byDoc.get(e.docId) || { docId: e.docId, date: e.date, net: 0, gross: 0 };
      x.net += e.amount;
      if (Math.abs(e.amount) > Math.abs(x.gross)) x.gross = e.amount;
      byDoc.set(e.docId, x);
    }
    const items = [...byDoc.values()].map((x) => Object.assign(x, { net: r2(x.net) }));
    const debit = items.filter((x) => x.gross > 0), credit = items.filter((x) => x.gross < 0);
    const totD = sum(debit, (x) => x.gross), totC = -sum(credit, (x) => x.gross);
    const obligDebit = totD >= totC;
    const obl = (obligDebit ? debit : credit).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.docId - b.docId));
    const map = new Map();
    for (const o of obl) {
      const total = Math.abs(o.gross);
      const inDocPaid = r2(total - Math.abs(o.net)); // دفعة مع نفس المستند
      map.set(o.docId, { docId: o.docId, total, paid: Math.max(0, inDocPaid), remaining: 0 });
    }
    let pool = 0;
    for (const x of (obligDebit ? credit : debit)) {
      let amt = Math.abs(x.net);
      const d = get('docs', x.docId);
      if (d && d.allocId && map.has(d.allocId)) {
        const t = map.get(d.allocId);
        const a = Math.min(amt, t.total - t.paid);
        t.paid = r2(t.paid + a); amt -= a;
      }
      pool += amt;
    }
    for (const o of obl) {
      const t = map.get(o.docId);
      const a = Math.min(pool, t.total - t.paid);
      t.paid = r2(t.paid + a); pool = r2(pool - a);
      t.remaining = r2(t.total - t.paid);
      t.status = t.remaining <= 0.004 ? 'paid' : t.paid > 0.004 ? 'partial' : 'unpaid';
    }
    return { map, unapplied: r2(pool), side: obligDebit ? 'receivable' : 'payable' };
  }
  function payStatus(d) {
    if (d.status !== 'posted' || !d.sid) return null;
    return openItems(d.st || 'party', d.sid).map.get(d.id) || null;
  }

  /* ───────── تجميعات للتقارير ───────── */
  const posted = (type, from, to) => DB.s.docs.filter((d) => d.status === 'posted' && (!type || (Array.isArray(type) ? type.includes(d.type) : d.type === type)) && (!from || d.date >= from) && (!to || d.date <= to));

  function yearlySummary(st, sid) {
    const docs = DB.s.docs.filter((d) => d.status === 'posted' && ((d.st || 'party') === st) && (d.sid === sid || (d.type === 'PAYR' && st === 'worker' && d.lines.some((l) => l.workerId === sid))));
    const years = new Set(docs.map((d) => U.year(d.date)));
    const ent = ledgerOf(st, sid);
    if (!years.size && !ent.length) return [];
    const ys = [...new Set([...years, ...ent.map((e) => U.year(e.date))])];
    const min = Math.min(...ys), max = Math.max(U.year(U.today()), ...ys);
    const out = [];
    for (let y = min; y <= max; y++) {
      const dd = docs.filter((d) => U.year(d.date) === y);
      const tot = (t) => sum(dd.filter((d) => d.type === t), (d) => d.totals.total);
      const row = {
        year: y, count: dd.length,
        sales: tot('SI'), salesReturns: tot('SR'), purchases: tot('PI'), purchaseReturns: tot('PR'),
        receipts: sum(dd.filter((d) => d.type === 'RC'), (d) => d.amount) + sum(dd.filter((d) => d.type === 'SI' || d.type === 'PR'), (d) => d.paid || 0),
        payments: sum(dd.filter((d) => d.type === 'PY'), (d) => d.amount) + sum(dd.filter((d) => d.type === 'PI' || d.type === 'SR'), (d) => d.paid || 0),
        outwork: tot('PRC'), design: tot('DJ'),
        wages: st === 'worker' ? sum(dd.filter((d) => d.type === 'PAYR'), (d) => sum(d.lines.filter((l) => l.workerId === sid), (l) => l.net)) : 0,
        closing: balance(st, sid, y + '-12-31'),
      };
      row.active = dd.length > 0;
      out.push(row);
    }
    return out.reverse();
  }

  function orderSummary(woId) {
    const wo = get('orders', woId);
    const docs = DB.s.docs.filter((d) => d.woId === woId && d.status === 'posted');
    const prc = docs.filter((d) => d.type === 'PRC');
    const by = (t) => docs.filter((d) => d.type === t);
    const qtyOf = (arr) => sum(arr.flatMap((d) => d.lines), (l) => l.qty);
    const issued = qtyOf(by('MI')), returned = qtyOf(by('MR')), consumed = qtyOf(prc);
    const wasted = sum(by('WL'), (d) => d.qty);
    const model = get('models', wo.modelId);
    const qtyGood = sum(prc, (d) => d.qtyGood), qtyRejected = sum(prc, (d) => d.qtyRejected);
    const expected = model ? r3(qtyGood * (model.yarnPerPiece || 0)) : 0;
    const allowed = model ? r3(expected * (1 + (model.wastePct || 0) / 100)) : 0;
    return {
      wo, docs, hours: sum(prc, (d) => d.hours), qtyGood, qtyRejected,
      fees: sum(prc, (d) => d.calc.fee), materialCost: sum(prc, (d) => d.calc.materialCost || 0),
      issued, returned, consumed, wasted, inCustody: r3(issued - returned - consumed - wasted),
      expected, allowed, variance: r3(consumed - allowed),
      advances: sum(by('PY').filter((d) => d.purpose === 'advance'), (d) => d.amount),
      payments: sum(by('PY').filter((d) => d.purpose !== 'advance'), (d) => d.amount),
      progress: wo.targetQty ? Math.min(100, Math.round((qtyGood / wo.targetQty) * 100)) : 0,
    };
  }

  // مطابقة الخامات لكل ورشة لكل خامة
  function reconcile(partyId, from, to) {
    const rows = new Map();
    const inRange = (d) => (!from || d.date >= from) && (!to || d.date <= to);
    const docs = DB.s.docs.filter((d) => d.sid === partyId && d.status === 'posted' && inRange(d));
    const row = (itemId) => { if (!rows.has(itemId)) rows.set(itemId, { itemId, issued: 0, returned: 0, consumed: 0, wasted: 0, charged: 0 }); return rows.get(itemId); };
    let qtyGood = 0, expected = 0, allowed = 0;
    for (const d of docs) {
      if (d.type === 'MI') d.lines.forEach((l) => (row(l.itemId).issued += l.qty));
      if (d.type === 'MR') d.lines.forEach((l) => (row(l.itemId).returned += l.qty));
      if (d.type === 'PRC') {
        d.lines.forEach((l) => (row(l.itemId).consumed += l.qty));
        qtyGood += d.qtyGood;
        const wo = get('orders', d.woId); const m = wo && get('models', wo.modelId);
        if (m) { expected += d.qtyGood * (m.yarnPerPiece || 0); allowed += d.qtyGood * (m.yarnPerPiece || 0) * (1 + (m.wastePct || 0) / 100); }
      }
      if (d.type === 'WL') { row(d.itemId).wasted += d.qty; if (d.charge) row(d.itemId).charged += d.qty; }
    }
    const list = [...rows.values()].map((r) => Object.assign(r, { custody: custodyQty(partyId, r.itemId), balance: r3(r.issued - r.returned - r.consumed - r.wasted) }));
    const consumed = sum(list, (r) => r.consumed);
    return { rows: list, qtyGood, expected: r3(expected), allowed: r3(allowed), consumed, variance: r3(consumed - allowed) };
  }

  // حالة الرسم لكل موديل
  function modelDesign(modelId) {
    const jobs = DB.s.docs.filter((d) => d.type === 'DJ' && d.status !== 'void' && d.lines.some((l) => l.modelId === modelId));
    if (!jobs.length) return { status: 'none', label: 'لم يُسند للرسام', cost: 0 };
    const j = jobs.find((x) => x.status === 'posted') || jobs[0];
    const line = j.lines.find((l) => l.modelId === modelId);
    if (j.status === 'draft') return { status: 'draft', label: 'مسند — لم يُعتمد الحساب', cost: line.amount, job: j };
    const ps = payStatus(j);
    const paid = ps && ps.status === 'paid';
    return { status: paid ? 'paid' : 'due', label: paid ? 'تمت المحاسبة والسداد' : ps && ps.status === 'partial' ? 'محسوب — مسدد جزئيًا' : 'محسوب — مستحق للرسام', cost: line.amount, job: j, ps };
  }

  // الأطراف حسب النوع مع أرصدتها
  function partiesWithBalance(type) {
    return DB.s.parties.filter((p) => !type || p.types.includes(type)).map((p) => ({ p, bal: balance('party', p.id) }));
  }

  /* ───────── لوحة المعلومات والأرباح ───────── */
  function pnl(from, to) {
    const si = posted('SI', from, to), sr = posted('SR', from, to);
    const revenue = r2(sum(si, (d) => d.totals.net) - sum(sr, (d) => d.totals.net));
    const variance = sum(posted(null, from, to), (d) => (d.calc && d.calc.costVariance) || 0);
    const cogs = r2(sum(si, (d) => (d.calc && d.calc.cogs) || 0) - sum(sr, (d) => (d.calc && d.calc.cogs) || 0) + variance);
    const expByCat = new Map();
    const addExp = (catId, v) => expByCat.set(catId, r2((expByCat.get(catId) || 0) + v));
    posted('EX', from, to).forEach((d) => addExp(d.catId, d.amount));
    posted('PI', from, to).forEach((d) => d.lines.filter((l) => l.kind === 'expense').forEach((l) => addExp(l.catId, l.expValue != null ? l.expValue : l.netExTax)));
    posted('PR', from, to).forEach((d) => d.lines.filter((l) => l.kind === 'expense').forEach((l) => addExp(l.catId, -(l.expValue != null ? l.expValue : l.netExTax))));
    posted('CI', from, to).forEach((d) => addExp(d.catId, d.calc.value));
    const expenses = sum([...expByCat.values()]);
    const wages = sum(posted('PAYR', from, to), (d) => d.totals.total);
    const design = sum(posted('DJ', from, to), (d) => d.totals.total);
    const outworkExpensed = sum(posted('PRC', from, to).filter((d) => !d.calc.capitalized), (d) => d.calc.fee);
    const wl = posted('WL', from, to);
    const materialLoss = r2(sum(wl, (d) => d.calc.value) - sum(wl, (d) => d.calc.charged));
    const adjustments = sum(posted('ADJ', from, to), (d) => (d.calc && d.calc.value) || 0);
    const otherIncome = sum(posted('IN', from, to), (d) => d.amount);
    const gross = r2(revenue - cogs);
    const net = r2(gross - expenses - wages - design - outworkExpensed - materialLoss + adjustments + otherIncome);
    return { revenue, cogs, gross, expByCat, expenses, wages, design, outworkExpensed, materialLoss, adjustments, otherIncome, net };
  }

  function kpis(from, to) {
    const cashIn = (types) => sum(DB.s.cash.filter((c) => c.date >= from && c.date <= to && types.includes(c.docType) && docStatus(c.docId) !== 'void' && c.amount > 0), (c) => c.amount);
    const cashOut = (types) => -sum(DB.s.cash.filter((c) => c.date >= from && c.date <= to && types.includes(c.docType) && docStatus(c.docId) !== 'void' && c.amount < 0), (c) => c.amount);
    const si = posted('SI', from, to), sr = posted('SR', from, to);
    const salesNet = r2(sum(si, (d) => d.totals.net) - sum(sr, (d) => d.totals.net));
    const receipts = cashIn(['SI', 'RC']);
    const pi = posted('PI', from, to), pr = posted('PR', from, to);
    const purchases = r2(sum(pi, (d) => d.totals.total) - sum(pr, (d) => d.totals.total));
    const expensesP = r2(sum(posted('EX', from, to), (d) => d.amount));
    const payments = cashOut(['PI', 'PY', 'EX']);
    let receivable = 0, payable = 0, customerCredit = 0;
    const custs = [], sups = [];
    for (const p of DB.s.parties) {
      const b = balance('party', p.id, to);
      if (p.types.includes('customer') && b > 0) { receivable += b; custs.push({ p, b }); }
      else if (p.types.includes('customer') && b < 0 && !p.types.some((t) => t !== 'customer')) customerCredit += -b;
      if (p.types.some((t) => t === 'supplier' || t === 'designer') && b < 0) { payable += -b; sups.push({ p, b: -b }); }
    }
    let workshopDue = 0, workshopAdv = 0;
    const shops = [];
    for (const p of DB.s.parties.filter((x) => x.types.includes('workshop'))) {
      const b = balance('party', p.id, to);
      if (b < 0) workshopDue += -b; else workshopAdv += b;
      shops.push({ p, b });
    }
    let workersDue = 0, workersAdv = 0;
    for (const w of DB.s.workers) { const b = balance('worker', w.id, to); if (b < 0) workersDue += -b; else workersAdv += b; }
    const prc = posted('PRC', from, to);
    let stockVal = 0;
    const low = [];
    for (const it of DB.s.items) {
      if (it.kind === 'service') continue;
      const q = onHand(it.id);
      const cs = costState(it.id, to);
      if (cs.q > EPS) stockVal += cs.v;
      if (it.active !== false && it.reorder > 0 && q <= it.reorder) low.push({ it, q });
      if (q < -EPS) low.push({ it, q, negative: true });
    }
    const cash = DB.s.accounts.map((a) => ({ a, b: cashBalance(a.id, to) }));
    return {
      salesNet, invoiceCount: si.length, receipts, purchases, expensesP, payments,
      receivable: r2(receivable), payable: r2(payable), customerCredit: r2(customerCredit),
      workshopDue: r2(workshopDue), workshopAdv: r2(workshopAdv), workersDue: r2(workersDue), workersAdv: r2(workersAdv),
      hours: sum(prc, (d) => d.hours), produced: sum(prc, (d) => d.qtyGood), stockVal: r2(stockVal), low,
      cash, cashTotal: sum(cash, (c) => c.b), topDebtors: custs.sort((a, b) => b.b - a.b).slice(0, 6), topCreditors: sups.sort((a, b) => b.b - a.b).slice(0, 6), shops,
      drafts: DB.s.docs.filter((d) => d.status === 'draft').length,
    };
  }
  function monthlySeries(months, endDate) {
    const out = [];
    let ym = U.ym(endDate);
    const list = [];
    for (let i = 0; i < months; i++) {
      list.unshift(ym);
      let [y, m] = ym.split('-').map(Number);
      m--; if (!m) { m = 12; y--; }
      ym = y + '-' + String(m).padStart(2, '0');
    }
    for (const k of list) {
      const from = k + '-01', to = U.endOfMonth(from);
      const p = pnl(from, to);
      out.push({ ym: k, sales: p.revenue, expenses: r2(p.gross - p.net), profit: p.net, cogs: p.cogs });
    }
    return out;
  }

  window.E = {
    BizError, fail, PERMS, ROLES, MODULES, roleOf, TYPES, PARTY_TYPES, PAY_METHODS, RULES, PAY_TYPES, STATUS,
    user, can, need, fyOf, checkFY, nameOf, subjectName, docNo, docTitle, tax,
    onHand, avgCost, costState, stockValue, balance, cashBalance, custodyQty, custodyAvg, custodyItems,
    rateFor, opRate, calcDoc, calcTrade, payrollPreview, unitFactor,
    newDoc, saveDraft, deleteDraft, post, voidDoc, voidAndCopy, duplicate, buildEffects, effectsOf,
    statement, cashStatement, stockCard, openItems, payStatus, posted, yearlySummary, orderSummary, reconcile, modelDesign,
    partiesWithBalance, pnl, kpis, monthlySeries, ledgerOf, movesOf,
  };
})();
