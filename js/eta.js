/* الفاتورة الإلكترونية — منظومة مصلحة الضرائب المصرية (ETA)
   بناء المستند بصيغة المنظومة من فاتورة/مرتجع معتمد، فحص الجاهزية، والإرسال وتتبع الحالة.
   ⚠️ النموذج يحاكي الإرسال. في النسخة الفعلية: التوقيع بالختم الإلكتروني (USB token / HSM) والإرسال لواجهة ETA يتمان على الخادم،
   وبيانات الربط (Client ID/Secret) لا تُحفظ في المتصفح أبدًا. منطق خالص بلا واجهة (يُختبر في Node). */
(function () {
  const r5 = (n) => Math.round(n * 1e5) / 1e5;
  const r2 = (n) => Math.round(n * 100) / 100;
  const DEFAULT_UNITS = { 'قطعة': 'EA', 'كجم': 'KGM', 'دستة': 'DZN', 'علبة': 'BX', 'بكرة': 'RO', 'لتر': 'LTR', 'كرتونة': 'CT', 'متر': 'MTR' };
  const STATUS = {
    none: ['plain', 'لم تُرسل'], ready: ['info', 'جاهزة للإرسال'], blocked: ['warn', 'تحتاج استكمال'], submitted: ['info', 'قيد المراجعة'],
    valid: ['ok', 'صالحة'], invalid: ['danger', 'مرفوضة'], cancelled: ['void', 'ملغاة على المنظومة'],
  };
  const cfg = () => Object.assign({ enabled: false, env: 'preprod', rin: '', activity: '1430', branchId: '0', gov: '', city: '', street: '', building: '', units: Object.assign({}, DEFAULT_UNITS) }, DB.s.settings.eta || {});
  const unitCode = (name) => cfg().units[name] || DEFAULT_UNITS[name] || '';
  const isTrade = (d) => d && (d.type === 'SI' || d.type === 'SR') && d.status !== 'draft';
  const receiverType = (p) => (p.etaType || (p.taxNo ? 'B' : 'P'));
  const egs = (it) => it.etaCode || '';

  /* فحص الجاهزية: كل ما تحتاجه المنظومة قبل الإرسال */
  function check(d) {
    const errs = [], warns = [];
    const c = cfg(), p = DB.get('parties', d.sid), total = d.totals.total;
    if (!/^\d{9}$/.test(c.rin)) errs.push({ k: 'issuer', m: 'رقم التسجيل الضريبي للمصنع غير مكتمل (9 أرقام) — من إعدادات الفاتورة الإلكترونية' });
    if (!c.gov || !c.city || !c.street) errs.push({ k: 'issuer', m: 'عنوان المصنع (المحافظة والمدينة والشارع) مطلوب في إعدادات الفاتورة الإلكترونية' });
    if (!/^\d{4}$/.test(String(c.activity))) errs.push({ k: 'issuer', m: 'كود النشاط الاقتصادي (4 أرقام) مطلوب' });
    if (!p) errs.push({ k: 'receiver', m: 'العميل غير موجود' });
    else {
      const t = receiverType(p);
      if (t === 'B' && !/^\d{9}$/.test(String(p.taxNo || ''))) errs.push({ k: 'receiver', ref: p.id, m: `العميل "${p.name}" شركة ويحتاج رقم تسجيل ضريبي من 9 أرقام` });
      if (t === 'B' && !(p.address || '').trim()) errs.push({ k: 'receiver', ref: p.id, m: `عنوان العميل "${p.name}" مطلوب للفاتورة الضريبية` });
      if (t === 'P' && total >= 50000 && !/^\d{14}$/.test(String(p.nationalId || ''))) errs.push({ k: 'receiver', ref: p.id, m: `فاتورة لفرد بقيمة 50,000 ج.م أو أكثر تحتاج الرقم القومي (14 رقمًا) للعميل "${p.name}"` });
    }
    for (const l of d.lines) {
      if (l.kind === 'expense') { errs.push({ k: 'line', m: 'بند مصروف داخل الفاتورة — المنظومة تقبل أصنافًا وخدمات مكودة فقط' }); continue; }
      const it = DB.get('items', l.itemId);
      if (!it) continue;
      if (!egs(it)) errs.push({ k: 'item', ref: it.id, m: `الصنف "${it.name}" بدون كود منظومة (EGS/GS1)` });
      const un = l.unit === 'alt' ? it.altUnit : it.unit;
      if (!unitCode(un)) errs.push({ k: 'unit', m: `الوحدة "${un}" بدون كود وحدة المنظومة` });
    }
    if (d.type === 'SR' && d.refId) {
      const inv = DB.get('docs', d.refId);
      if (!inv || !inv.eta || inv.eta.status !== 'valid') errs.push({ k: 'ref', m: 'إشعار الدائن يحتاج أن تكون الفاتورة الأصلية صالحة على المنظومة أولًا' });
    }
    if (d.status === 'void') errs.push({ k: 'void', m: 'المستند ملغى' });
    const age = U.daysBetween(d.date, U.today());
    if (age > 7) warns.push(`تاريخ الفاتورة منذ ${age} يومًا — المنظومة تطلب الإرسال خلال 7 أيام من الإصدار`);
    if (d.date > U.today()) errs.push({ k: 'date', m: 'لا يمكن إرسال فاتورة بتاريخ مستقبلي' });
    const doc = errs.length ? null : build(d);
    if (doc && Math.abs(doc.totalAmount - total) > 0.05) warns.push(`فرق تقريب ${r2(doc.totalAmount - total)} ج.م بين إجمالي المنظومة والفاتورة (الضريبة تُحسب على كل بند)`);
    return { ok: !errs.length, errs, warns, doc };
  }

  /* بناء المستند بصيغة المنظومة (documentTypeVersion 1.0) */
  function build(d) {
    const c = cfg(), p = DB.get('parties', d.sid), t = d.totals;
    const rate = (t.taxRate || 0) / 100;
    const lines = d.lines.filter((l) => l.kind !== 'expense').map((l) => {
      const it = DB.get('items', l.itemId);
      const un = l.unit === 'alt' ? it.altUnit : it.unit;
      const gross = d.priceIncludesTax && rate ? l.gross / (1 + rate) : l.gross; // قبل الضريبة
      const salesTotal = r5(gross);
      const netTotal = r5(l.netExTax); // بعد خصم البند ونصيبه من خصم الفاتورة
      const disc = r5(salesTotal - netTotal);
      const tax = r5(netTotal * rate);
      return {
        description: it.name, itemType: /^EG-/.test(egs(it)) ? 'EGS' : 'GS1', itemCode: egs(it), internalCode: it.code, unitType: unitCode(un),
        quantity: r5(l.qty), unitValue: { currencySold: 'EGP', amountEGP: r5(salesTotal / l.qty) }, salesTotal,
        discount: { rate: salesTotal ? r5((disc / salesTotal) * 100) : 0, amount: disc }, netTotal, itemsDiscount: 0, valueDifference: 0, totalTaxableFees: 0,
        taxableItems: [{ taxType: 'T1', amount: tax, subType: rate ? 'V009' : 'V003', rate: r2(rate * 100) }],
        total: r5(netTotal + tax),
      };
    });
    const sum = (k) => r5(lines.reduce((a, x) => a + (typeof k === 'function' ? k(x) : x[k]), 0));
    const taxT1 = sum((x) => x.taxableItems[0].amount);
    const rt = p ? receiverType(p) : 'P';
    return {
      issuer: { type: 'B', id: c.rin, name: (DB.s.settings.company || {}).name || '', address: { branchID: String(c.branchId || '0'), country: 'EG', governate: c.gov, regionCity: c.city, street: c.street, buildingNumber: c.building || '0' } },
      receiver: { type: rt, id: rt === 'B' ? String(p.taxNo) : rt === 'P' ? String(p.nationalId || '') : '', name: p ? p.name : '', address: { country: 'EG', governate: p && p.gov || '', regionCity: p && p.city || '', street: p && p.address || '', buildingNumber: '0' } },
      documentType: d.type === 'SR' ? 'C' : 'I', documentTypeVersion: '1.0',
      dateTimeIssued: new Date(d.date + 'T10:00:00').toISOString().replace(/\.\d{3}Z$/, 'Z'), taxpayerActivityCode: String(c.activity), internalID: d.no,
      ...(d.type === 'SR' && d.refId ? { references: [(DB.get('docs', d.refId).eta || {}).uuid || ''] } : {}),
      invoiceLines: lines,
      totalSalesAmount: sum('salesTotal'), totalDiscountAmount: sum((x) => x.discount.amount), netAmount: sum('netTotal'),
      taxTotals: [{ taxType: 'T1', amount: taxT1 }], extraDiscountAmount: 0, totalItemsDiscountAmount: 0, totalAmount: r5(sum('netTotal') + taxT1),
      signatures: [{ signatureType: 'I', value: '' }],
    };
  }

  // حالة المستند على المنظومة (بدون الإرسال)
  function state(d) {
    if (d.eta && d.eta.status) return d.eta.status;
    if (d.status === 'void') return 'none';
    return check(d).ok ? 'ready' : 'blocked';
  }

  /* الإرسال (محاكاة لرد المنظومة): صالحة مع UUID، أو مرفوضة بأسباب الفحص */
  function submit(id) {
    return DB.tx(() => {
      const d = DB.get('docs', id);
      if (!isTrade(d)) E.fail('يمكن إرسال فواتير ومرتجعات المبيعات المعتمدة فقط');
      E.need('sales');
      if (!cfg().enabled) E.fail('فعّل الفاتورة الإلكترونية من الإعدادات أولًا');
      if (d.eta && ['valid', 'submitted'].includes(d.eta.status)) E.fail('تم إرسال هذا المستند بالفعل');
      const r = check(d);
      const at = new Date().toISOString();
      if (!r.ok) {
        d.eta = { status: 'invalid', at, env: cfg().env, errors: r.errs.map((e) => e.m) };
      } else {
        const hex = (n) => Array.from({ length: n }, () => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[Math.floor(Math.random() * 32)]).join('');
        d.eta = { status: 'valid', at, env: cfg().env, uuid: hex(26), longId: hex(36), submissionId: hex(26), total: r.doc.totalAmount, warns: r.warns };
      }
      DB.audit(d.eta.status === 'valid' ? 'إرسال فاتورة إلكترونية' : 'رفض فاتورة إلكترونية', d.type, d.id, `${d.no} — ${STATUS[d.eta.status][1]}`);
      return d.eta;
    });
  }
  // إلغاء على المنظومة (مسموح للمُصدِر خلال 7 أيام من القبول)
  function cancel(id, reason) {
    return DB.tx(() => {
      const d = DB.get('docs', id);
      E.need('sales');
      if (!d.eta || d.eta.status !== 'valid') E.fail('المستند ليس صالحًا على المنظومة');
      if ((Date.now() - Date.parse(d.eta.at)) / 864e5 > 7) E.fail('مضى أكثر من 7 أيام على القبول — أصدر إشعار دائن بدلًا من الإلغاء');
      d.eta.status = 'cancelled'; d.eta.cancelledAt = new Date().toISOString(); d.eta.cancelReason = reason || '';
      DB.audit('إلغاء فاتورة إلكترونية', d.type, d.id, d.no);
      return d.eta;
    });
  }
  // إعادة المحاولة بعد تصحيح البيانات: نمسح الرفض السابق
  function reset(id) { return DB.tx(() => { const d = DB.get('docs', id); if (d.eta && d.eta.status === 'invalid') delete d.eta; return d; }); }

  // أكواد EGS الداخلية بالصيغة المعتمدة: EG-رقم التسجيل-كود الصنف
  function generateCodes(onlyMissing = true) {
    const rin = cfg().rin;
    if (!/^\d{9}$/.test(rin)) E.fail('أدخل رقم التسجيل الضريبي للمصنع أولًا (9 أرقام)');
    return DB.tx(() => {
      E.need('stock');
      let n = 0;
      for (const it of DB.s.items) {
        if (it.kind !== 'finished' && it.kind !== 'service') continue; // ما يُباع فقط
        if (onlyMissing && it.etaCode) continue;
        it.etaCode = `EG-${rin}-${String(it.code).replace(/[^A-Za-z0-9]/g, '')}`;
        n++;
      }
      DB.audit('توليد أكواد EGS', 'eta', null, `${n} صنف`);
      return n;
    });
  }
  const verifyUrl = (d) => (d.eta && d.eta.uuid ? `https://${d.eta.env === 'prod' ? '' : 'preprod.'}invoicing.eta.gov.eg/print/documents/${d.eta.uuid}/share/${d.eta.longId}` : '');
  const docs = () => DB.s.docs.filter(isTrade).sort((a, b) => (b.date + b.id > a.date + a.id ? 1 : -1));

  window.ETA = { STATUS, DEFAULT_UNITS, cfg, check, build, state, submit, cancel, reset, generateCodes, verifyUrl, docs, isTrade, receiverType };
})();
