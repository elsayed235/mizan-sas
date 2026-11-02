/* الاستيراد من Excel/CSV: قراءة الملف ← مطابقة الأعمدة ← معاينة وتحقق ← استيراد ذري ← تراجع
   منطق خالص بلا واجهة (يُختبر في Node). الأرصدة الافتتاحية تُنشأ كمستندات معتمدة عبر المحرك نفسه، فتنطبق عليها كل القواعد. */
(function () {
  const r2 = (n) => Math.round(n * 100) / 100;
  // تطبيع للمقارنة: بدون تشكيل، همزات موحدة، مسافات مختصرة، حروف صغيرة
  const norm = (s) => String(s == null ? '' : s).trim().toLowerCase()
    .replace(/[ً-ْـ]/g, '').replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[_\-./]+/g, ' ').replace(/\s+/g, ' ');
  const num = (v) => {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    const s = String(v == null ? '' : v).trim();
    if (!s) return NaN;
    const t = s.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫]/g, '.').replace(/[,،\s]/g, '').replace(/[^\d.\-()]/g, '');
    const neg = /^\(.*\)$/.test(t); // (1,250) = سالب بأسلوب المحاسبة
    const n = parseFloat(t.replace(/[()]/g, ''));
    return isFinite(n) ? (neg ? -n : n) : NaN;
  };

  /* ───────── قراءة النص (CSV أو لصق من Excel) ───────── */
  function parseText(text) {
    const src = String(text || '').replace(/^﻿/, '');
    const first = src.split(/\r?\n/).find((l) => l.trim()) || '';
    const delim = (first.match(/\t/g) || []).length ? '\t' : (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (q) {
        if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
      } else if (c === '"' && cell === '') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some((x) => x !== ''));
  }

  /* ───────── أنواع الاستيراد ───────── */
  const F = (k, label, o) => Object.assign({ k, label, aliases: [] }, o || {});
  const ITEM_KIND = [[/خام|خيط|خيوط|raw|yarn/, 'raw'], [/تام|منتج|finished|product/, 'finished'], [/غيار|spare/, 'spare'], [/خدم|service/, 'service'], [/مستلزم|مستهلك|consum/, 'consumable']];
  const KINDS = {
    items: {
      label: 'الأصناف', icon: 'tag', perm: 'stock', desc: 'الكود والاسم والفئة والوحدة والسعر',
      fields: [
        F('code', 'الكود', { aliases: ['كود', 'كود الصنف', 'رقم الصنف', 'code', 'sku', 'item code', 'باركود', 'barcode'], sample: 'YRN-001' }),
        F('name', 'اسم الصنف', { req: true, aliases: ['الاسم', 'الصنف', 'اسم', 'name', 'item', 'item name', 'description', 'البيان'], sample: 'خيط أكريليك أبيض' }),
        F('category', 'الفئة', { aliases: ['الفئه', 'المجموعة', 'التصنيف', 'category', 'group'], sample: 'خيوط' }),
        F('unit', 'الوحدة', { aliases: ['وحده', 'وحدة القياس', 'unit', 'uom'], sample: 'كجم' }),
        F('kind', 'النوع', { aliases: ['نوع الصنف', 'type', 'kind'], sample: 'خامة' }),
        F('salePrice', 'سعر البيع', { num: true, aliases: ['سعر', 'السعر', 'سعر البيع للمستهلك', 'price', 'sale price', 'selling price'], sample: '0' }),
        F('cost', 'سعر الشراء', { num: true, aliases: ['التكلفة', 'تكلفة', 'سعر التكلفة', 'cost', 'purchase price', 'buy price'], sample: '160' }),
        F('reorder', 'حد الطلب', { num: true, aliases: ['حد اعادة الطلب', 'الحد الادني', 'reorder', 'min', 'minimum'], sample: '100' }),
      ],
    },
    customers: { label: 'العملاء', icon: 'users', perm: 'sales', party: 'customer', prefix: 'C-', desc: 'الاسم والهاتف والعنوان' },
    suppliers: { label: 'الموردون', icon: 'truck', perm: 'purchases', party: 'supplier', prefix: 'S-', desc: 'الاسم والهاتف والعنوان' },
    workshops: { label: 'الورش', icon: 'factory', perm: 'outwork', party: 'workshop', prefix: 'WS-', desc: 'ورش ومصانع التشغيل' },
    partyBalances: {
      label: 'أرصدة العملاء والموردين', icon: 'scale', perm: 'opening', opening: true, desc: 'أرصدة أول المدة لكل طرف',
      fields: [
        F('party', 'العميل/المورد (كود أو اسم)', { req: true, aliases: ['الاسم', 'العميل', 'المورد', 'الطرف', 'اسم العميل', 'اسم المورد', 'كود', 'name', 'customer', 'supplier', 'party', 'account'], sample: 'معرض الشروق' }),
        F('amount', 'الرصيد', { req: true, num: true, aliases: ['المبلغ', 'رصيد', 'الرصيد الحالي', 'balance', 'amount'], sample: '48500' }),
        F('side', 'الاتجاه (عليه / له)', { aliases: ['مدين دائن', 'الحالة', 'side', 'dr cr', 'type'], sample: 'عليه' }),
      ],
    },
    stockOpening: {
      label: 'رصيد المخزون الافتتاحي', icon: 'boxes', perm: 'opening', opening: true, desc: 'الكمية والتكلفة لكل صنف',
      fields: [
        F('item', 'الصنف (كود أو اسم)', { req: true, aliases: ['الصنف', 'اسم الصنف', 'الكود', 'كود الصنف', 'item', 'code', 'name'], sample: 'YRN-001' }),
        F('qty', 'الكمية', { req: true, num: true, aliases: ['كميه', 'الرصيد', 'qty', 'quantity', 'stock', 'on hand'], sample: '900' }),
        F('cost', 'تكلفة الوحدة', { req: true, num: true, aliases: ['التكلفة', 'سعر التكلفة', 'سعر الشراء', 'cost', 'unit cost'], sample: '160' }),
        F('warehouse', 'المخزن', { aliases: ['مخزن', 'المستودع', 'warehouse', 'store', 'location'], sample: '' }),
      ],
    },
    cashOpening: {
      label: 'أرصدة الخزائن والبنوك', icon: 'bank', perm: 'opening', opening: true, desc: 'الرصيد الحالي لكل خزينة أو حساب',
      fields: [
        F('account', 'الخزينة/الحساب', { req: true, aliases: ['الخزينة', 'الحساب', 'البنك', 'اسم الحساب', 'account', 'cash', 'bank', 'name'], sample: 'الخزينة الرئيسية' }),
        F('amount', 'الرصيد', { req: true, num: true, aliases: ['المبلغ', 'رصيد', 'balance', 'amount'], sample: '25000' }),
      ],
    },
  };
  const PARTY_FIELDS = [
    F('code', 'الكود', { aliases: ['كود', 'رقم', 'code', 'id', 'كود العميل', 'كود المورد'], sample: '' }),
    F('name', 'الاسم', { req: true, aliases: ['اسم', 'اسم العميل', 'اسم المورد', 'العميل', 'المورد', 'name', 'customer', 'supplier', 'company'], sample: 'معرض الشروق' }),
    F('phone', 'الهاتف', { aliases: ['تليفون', 'موبايل', 'الموبايل', 'رقم الهاتف', 'phone', 'mobile', 'tel'], sample: '01000000000' }),
    F('address', 'العنوان', { aliases: ['عنوان', 'المدينة', 'address', 'city'], sample: 'القاهرة' }),
    F('taxNo', 'الرقم الضريبي', { aliases: ['رقم ضريبي', 'التسجيل الضريبي', 'tax', 'tax no', 'vat'], sample: '' }),
    F('notes', 'ملاحظات', { aliases: ['ملاحظة', 'notes', 'note', 'remarks'], sample: '' }),
  ];
  ['customers', 'suppliers', 'workshops'].forEach((k) => { KINDS[k].fields = PARTY_FIELDS; });

  // مطابقة تلقائية لعناوين الأعمدة
  function autoMap(kind, headers) {
    const H = headers.map(norm), used = new Set(), map = {};
    for (const f of KINDS[kind].fields) {
      const names = [f.label, f.k].concat(f.aliases).map(norm);
      let i = H.findIndex((h, j) => !used.has(j) && names.includes(h));
      if (i < 0) i = H.findIndex((h, j) => !used.has(j) && h && names.some((n) => n.length > 2 && (h.includes(n) || n.includes(h))));
      if (i >= 0) { map[f.k] = i; used.add(i); }
    }
    return map;
  }
  // هل الصف الأول عناوين؟ (أغلب خلاياه نصوص غير رقمية)
  const looksLikeHeader = (row) => row.filter((c) => c && isNaN(num(c))).length >= Math.ceil(row.filter((c) => c).length / 2);

  /* ───────── البحث عن السجلات الموجودة ───────── */
  const byCodeOrName = (list, v) => { const n = norm(v); if (!n) return null; return list.find((x) => norm(x.code) === n) || list.find((x) => norm(x.name) === n) || null; };
  function nextCode(prefix, list, taken) {
    let max = 0;
    for (const x of list) { const m = String(x.code || '').match(/(\d+)$/); if (m && String(x.code).startsWith(prefix)) max = Math.max(max, +m[1]); }
    let c;
    do { c = prefix + String(++max).padStart(3, '0'); } while (taken.has(c));
    return c;
  }

  /* ───────── المعاينة: كل صف ← جديد / تحديث / تخطي / خطأ ───────── */
  function preview(kind, rows, map, opts = {}) {
    const K = KINDS[kind], out = [], seen = new Map();
    const val = (row, k) => (map[k] == null ? '' : String(row[map[k]] == null ? '' : row[map[k]]).trim());
    rows.forEach((row, idx) => {
      const d = {}, errs = [];
      for (const f of K.fields) {
        const raw = val(row, f.k);
        if (f.num) { const n = raw === '' ? NaN : num(raw); d[f.k] = isNaN(n) ? null : n; if (raw !== '' && isNaN(n)) errs.push(`${f.label}: "${raw}" ليس رقمًا`); }
        else d[f.k] = raw;
        if (f.req && (d[f.k] === '' || d[f.k] == null)) errs.push(`${f.label} مطلوب`);
      }
      const r = { idx: idx + 1, d, status: 'new', msg: '', ref: null };
      if (errs.length) { r.status = 'error'; r.msg = errs.join(' · '); out.push(r); return; }
      const dupKey = norm(d.code || d.name || d.party || d.item || d.account) + '|' + norm(d.warehouse || '');
      if (seen.has(dupKey)) { r.status = 'error'; r.msg = `مكرر مع الصف ${seen.get(dupKey)}`; out.push(r); return; }
      seen.set(dupKey, r.idx);
      check[kind] ? check[kind](r, opts) : checkParty(r, K, opts);
      out.push(r);
    });
    const count = (s) => out.filter((x) => x.status === s).length;
    return { kind, opts, rows: out, counts: { new: count('new'), update: count('update'), skip: count('skip'), error: count('error') } };
  }
  const check = {
    items(r, opts) {
      const d = r.d;
      const ex = (d.code && DB.s.items.find((x) => norm(x.code) === norm(d.code))) || DB.s.items.find((x) => norm(x.name) === norm(d.name));
      if (ex) { r.ref = ex.id; r.status = opts.onExisting === 'update' ? 'update' : 'skip'; r.msg = `موجود: ${ex.code} — ${ex.name}`; }
      if (d.salePrice != null && d.salePrice < 0) { r.status = 'error'; r.msg = 'السعر لا يكون سالبًا'; }
      if (d.cost != null && d.cost < 0) { r.status = 'error'; r.msg = 'التكلفة لا تكون سالبة'; }
    },
    partyBalances(r, opts) {
      const d = r.d, p = byCodeOrName(DB.s.parties, d.party);
      if (!p) { r.status = 'error'; r.msg = 'الطرف غير موجود — استورد العملاء/الموردين أولًا'; return; }
      r.ref = p.id;
      const s = norm(d.side);
      let side = /مدين|عليه|debit|dr|لنا/.test(s) ? 'debit' : /دائن|له|credit|cr|علينا/.test(s) ? 'credit' : (p.types.includes('customer') ? 'debit' : 'credit');
      let amt = d.amount;
      if (amt < 0) { amt = -amt; side = side === 'debit' ? 'credit' : 'debit'; }
      if (!(amt > 0)) { r.status = 'skip'; r.msg = 'رصيد صفر — لا يحتاج قيدًا'; return; }
      r.d.amount = r2(amt); r.d.side = side;
      r.msg = `${p.name} — ${side === 'debit' ? 'عليه لنا' : 'له علينا'}`;
      // لا نسجل رصيدًا افتتاحيًا مرتين لنفس الطرف — يُلغى القديم أولًا لو أردت استبداله
      if (DB.s.docs.some((x) => x.type === 'OB' && x.status === 'posted' && x.sid === p.id)) { r.status = 'skip'; r.msg += ' · له رصيد افتتاحي مسجل بالفعل (ألغِه أولًا لاستبداله)'; return; }
      fyCheck(r, opts);
    },
    stockOpening(r, opts) {
      const d = r.d, it = byCodeOrName(DB.s.items, d.item);
      if (!it) { r.status = 'error'; r.msg = 'الصنف غير موجود — استورد الأصناف أولًا'; return; }
      const wh = d.warehouse ? DB.s.warehouses.find((w) => norm(w.name) === norm(d.warehouse)) : DB.get('warehouses', opts.whId);
      if (!wh) { r.status = 'error'; r.msg = d.warehouse ? `المخزن "${d.warehouse}" غير موجود` : 'اختر المخزن'; return; }
      if (!(d.qty > 0)) { r.status = d.qty === 0 ? 'skip' : 'error'; r.msg = d.qty === 0 ? 'كمية صفر' : 'الكمية يجب أن تكون أكبر من صفر'; return; }
      if (!(d.cost > 0)) { r.status = 'error'; r.msg = 'أدخل تكلفة الوحدة (أكبر من صفر)'; return; }
      r.ref = it.id; r.d.whId = wh.id;
      r.msg = `${it.name} ← ${wh.name} · قيمة ${r2(d.qty * d.cost)}`;
      fyCheck(r, opts);
    },
    cashOpening(r, opts) {
      const d = r.d, a = DB.s.accounts.find((x) => norm(x.name) === norm(d.account));
      if (!(d.amount > 0)) { r.status = d.amount === 0 ? 'skip' : 'error'; r.msg = d.amount === 0 ? 'رصيد صفر' : 'رصيد الخزينة الافتتاحي لا يكون سالبًا'; return; }
      r.ref = a ? a.id : null;
      r.msg = a ? a.name : `خزينة جديدة: ${d.account}`;
      fyCheck(r, opts);
    },
  };
  function checkParty(r, K, opts) {
    const d = r.d;
    const ex = (d.code && DB.s.parties.find((x) => norm(x.code) === norm(d.code))) || DB.s.parties.find((x) => norm(x.name) === norm(d.name));
    if (!ex) return;
    r.ref = ex.id;
    const hasType = ex.types.includes(K.party);
    r.status = opts.onExisting === 'update' || !hasType ? 'update' : 'skip';
    r.msg = `موجود: ${ex.code} — ${ex.name}${hasType ? '' : ' (سيُضاف له نوع ' + E.PARTY_TYPES[K.party] + ')'}`;
  }
  function fyCheck(r, opts) {
    const fy = E.fyOf(opts.date);
    if (!fy) { r.status = 'error'; r.msg = 'لا توجد سنة مالية تغطي تاريخ الأرصدة'; }
    else if (fy.status === 'closed') { r.status = 'error'; r.msg = `السنة ${fy.name} مقفلة`; }
  }

  /* ───────── الاستيراد: كله أو لا شيء، مع سجل يسمح بالتراجع ───────── */
  function commit(pv, o = {}) {
    const opts = Object.assign({}, pv.opts, o);
    const K = KINDS[pv.kind];
    const rows = pv.rows.filter((r) => r.status === 'new' || r.status === 'update');
    if (!rows.length) E.fail('لا توجد صفوف صالحة للاستيراد');
    if (pv.counts.error && !opts.skipErrors) E.fail(`يوجد ${pv.counts.error} صف به أخطاء — صححها أو اختر تجاهلها`);
    return DB.tx(() => {
      E.need(K.perm);
      const log = { id: DB.nextId(), kind: pv.kind, label: K.label, file: opts.file || '', at: new Date().toISOString(), by: (E.user() || {}).name || 'النظام', created: {}, updated: [], docs: [], counts: { new: 0, update: 0 } };
      const made = (coll, x) => { (log.created[coll] = log.created[coll] || []).push(x.id); return x; };
      const snap = (coll, x) => log.updated.push({ coll, id: x.id, before: JSON.parse(JSON.stringify(x)) });
      const taken = new Set();
      if (pv.kind === 'items') {
        for (const r of rows) {
          const d = r.d;
          let cat = d.category ? DB.s.itemCats.find((c) => norm(c.name) === norm(d.category)) : null;
          if (d.category && !cat) cat = made('itemCats', DB.add('itemCats', { name: d.category, prefix: 'IT', active: true }));
          if (d.unit && !DB.s.units.some((u) => norm(u.name) === norm(d.unit))) made('units', DB.add('units', { name: d.unit }));
          const kind = (ITEM_KIND.find(([re]) => re.test(norm(d.kind))) || [null, null])[1];
          const unit = d.unit ? DB.s.units.find((u) => norm(u.name) === norm(d.unit)).name : null;
          if (r.status === 'update') {
            const x = DB.get('items', r.ref);
            snap('items', x);
            if (d.name) x.name = d.name;
            if (cat) x.catId = cat.id;
            if (kind) x.kind = kind;
            if (unit && !E.movesOf(x.id).length) x.unit = unit; // لا نغير وحدة صنف عليه حركات
            if (d.salePrice != null) x.salePrice = d.salePrice;
            if (d.cost != null) x.lastCost = d.cost;
            if (d.reorder != null) x.reorder = d.reorder;
            log.counts.update++;
          } else {
            const c = cat || DB.s.itemCats[0];
            const code = d.code || nextCode((c && c.prefix ? c.prefix : 'IT') + '-', DB.s.items, taken);
            taken.add(code);
            made('items', DB.add('items', { code, name: d.name, catId: c ? c.id : null, unit: unit || (DB.s.units[0] || {}).name || 'قطعة', kind: kind || 'consumable', salePrice: d.salePrice || 0, lastCost: d.cost || 0, reorder: d.reorder || 0, active: true, altUnit: '', altFactor: 0 }));
            log.counts.new++;
          }
        }
      } else if (K.party) {
        for (const r of rows) {
          const d = r.d;
          if (r.status === 'update') {
            const x = DB.get('parties', r.ref);
            snap('parties', x);
            if (!x.types.includes(K.party)) x.types.push(K.party);
            if (opts.onExisting === 'update') ['phone', 'address', 'taxNo', 'notes'].forEach((k) => { if (d[k]) x[k] = d[k]; });
            log.counts.update++;
          } else {
            const code = d.code || nextCode(K.prefix, DB.s.parties, taken);
            taken.add(code);
            made('parties', DB.add('parties', { code, name: d.name, types: [K.party], phone: d.phone, address: d.address, taxNo: d.taxNo, notes: d.notes, active: true, startDate: opts.date || U.today() }));
            log.counts.new++;
          }
        }
      } else {
        // الأرصدة الافتتاحية: مستندات معتمدة عبر المحرك (نفس قواعد التحقق والسنوات المالية)
        const post = (type, f) => { const doc = E.post(E.saveDraft(E.newDoc(type, Object.assign({ date: opts.date, notes: 'استيراد: ' + (opts.file || K.label) }, f))).id); log.docs.push(doc.id); return doc; };
        if (pv.kind === 'partyBalances') rows.forEach((r) => { post('OB', { st: 'party', sid: r.ref, side: r.d.side, amount: r.d.amount }); log.counts.new++; });
        if (pv.kind === 'cashOpening') rows.forEach((r) => {
          let acc = r.ref ? DB.get('accounts', r.ref) : null;
          if (!acc) acc = made('accounts', DB.add('accounts', { name: r.d.account, type: /بنك|bank/.test(norm(r.d.account)) ? 'bank' : 'cash', active: true }));
          post('OA', { accountId: acc.id, amount: r.d.amount }); log.counts.new++;
        });
        if (pv.kind === 'stockOpening') {
          const byWh = new Map();
          rows.forEach((r) => { if (!byWh.has(r.d.whId)) byWh.set(r.d.whId, []); byWh.get(r.d.whId).push(r); });
          for (const [whId, rs] of byWh) { post('OS', { whId, lines: rs.map((r) => ({ kind: 'item', itemId: r.ref, qty: r.d.qty, cost: r.d.cost })) }); log.counts.new += rs.length; }
        }
      }
      (DB.s.imports = DB.s.imports || []).push(log);
      DB.audit('استيراد من Excel', 'import', log.id, `${K.label}: ${log.counts.new} جديد · ${log.counts.update} تحديث${opts.file ? ' — ' + opts.file : ''}`);
      return log;
    });
  }

  // التراجع: إلغاء المستندات بقيود عكسية، استرجاع ما عُدّل، وحذف ما أُنشئ إن لم يُستخدم بعد
  function undo(logId) {
    return DB.tx(() => {
      const log = (DB.s.imports || []).find((x) => x.id === logId);
      if (!log) E.fail('عملية الاستيراد غير موجودة');
      if (log.undone) E.fail('تم التراجع عن هذه العملية بالفعل');
      E.need(KINDS[log.kind].perm);
      for (const id of log.docs.slice().reverse()) { const d = DB.get('docs', id); if (d && d.status === 'posted') E.voidDoc(id, 'تراجع عن استيراد ' + log.label); }
      const used = [];
      const inUse = {
        items: (id) => E.movesOf(id).some((m) => !log.docs.includes(m.docId)) || DB.s.docs.some((d) => d.status !== 'void' && !log.docs.includes(d.id) && (d.itemId === id || (d.lines || []).some((l) => l.itemId === id))),
        parties: (id) => DB.s.docs.some((d) => d.status !== 'void' && !log.docs.includes(d.id) && (d.sid === id || d.partyId === id)) || DB.s.orders.some((o) => o.partyId === id),
        accounts: (id) => DB.s.docs.some((d) => d.status !== 'void' && !log.docs.includes(d.id) && (d.accountId === id || d.accountTo === id)),
        itemCats: (id) => DB.s.items.some((i) => i.catId === id && !(log.created.items || []).includes(i.id)),
        units: () => false,
      };
      for (const coll of ['items', 'parties', 'accounts']) for (const id of log.created[coll] || []) if (DB.get(coll, id) && inUse[coll](id)) used.push(DB.get(coll, id).name);
      if (used.length) E.fail('لا يمكن التراجع: بعض السجلات المستوردة استُخدمت بعد الاستيراد', used.slice(0, 10).map((n) => `"${n}" عليه حركات — أوقفه بدل الحذف`));
      for (const u of log.updated) { const x = DB.get(u.coll, u.id); if (x) { Object.keys(x).forEach((k) => delete x[k]); Object.assign(x, u.before); } }
      // المستندات الملغاة تبقى للتاريخ، فالخزائن التي أُنشئت لها تبقى موقوفة بدل حذفها
      for (const id of log.created.accounts || []) { const a = DB.get('accounts', id); if (a) a.active = false; }
      for (const coll of ['items', 'parties', 'itemCats', 'units']) for (const id of log.created[coll] || []) if (DB.get(coll, id) && !inUse[coll](id)) DB.remove(coll, id);
      log.undone = new Date().toISOString();
      DB.audit('تراجع عن استيراد', 'import', log.id, log.label);
      return log;
    });
  }

  // قالب جاهز: عناوين الأعمدة + صف مثال
  const template = (kind) => [KINDS[kind].fields.map((f) => f.label), KINDS[kind].fields.map((f) => f.sample || '')];

  window.Importer = { KINDS, parseText, autoMap, looksLikeHeader, preview, commit, undo, template, norm, num };
})();
