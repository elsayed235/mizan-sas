/* بيانات تجريبية واقعية لمصنع تريكو (2024 → اليوم)
   كل الأرقام تُنشأ عبر محرك الاعتماد نفسه، فالأرصدة متسقة تمامًا مع المستندات. */
(function () {
  const LOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3b764"/><stop offset="1" stop-color="#a87522"/></linearGradient></defs><rect width="96" height="96" rx="24" fill="url(#g)"/><path d="M22 20 L70 76" stroke="#fff6e4" stroke-width="5" stroke-linecap="round" opacity=".9"/><path d="M76 22 L28 78" stroke="#fff6e4" stroke-width="5" stroke-linecap="round" opacity=".9"/><circle cx="48" cy="50" r="23" fill="#13265a"/><g stroke="#f3d79c" stroke-width="3" stroke-linecap="round" fill="none"><path d="M28 42 C40 33 58 33 69 43"/><path d="M26 53 C40 43 58 43 71 55"/><path d="M30 64 C42 56 56 56 66 66"/><path d="M42 28 C34 42 34 60 44 73"/></g><path d="M66 63 C76 68 80 75 74 81" stroke="#fff6e4" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>`);

  function run() {
    const R = U.rng(20261102);
    const today = U.today();
    DB.reset();
    DB.bulk = true;
    const s = DB.s;
    const add = (coll, o) => DB.add(coll, o);

    s.settings = {
      company: {
        name: 'مصنع النور للتريكو', nameEn: 'Al Nour Knitwear', logo: LOGO,
        address: 'المنطقة الصناعية الثالثة — العاشر من رمضان — الشرقية', phone: '0554 000 111', mobile: '0100 000 1111',
        email: 'info@alnour-knit.example', taxNo: '512-334-901', cr: 'س.ت 45678',
      },
      currency: 'ج.م', currencyCode: 'EGP', country: 'مصر',
      allowNegativeStock: false, allowNegativeCash: false, purchaseTaxRecoverable: true,
      valuation: 'avg', fyStartMonth: 1, defaultSalesTaxId: null, density: 'comfortable',
    };

    // المستخدمون والأدوار
    const users = [
      ['المدير العام', 'admin', 'owner'], ['أحمد سمير', 'ahmed', 'accountant'], ['محمود علي', 'mahmoud', 'storekeeper'],
      ['كريم حسن', 'karim', 'production'], ['زائر', 'guest', 'viewer'],
    ].map(([name, username, role]) => add('users', { name, username, role, active: true }));

    // السنوات المالية
    for (const y of [2024, 2025, 2026]) add('fiscalYears', { name: String(y), start: `${y}-01-01`, end: `${y}-12-31`, status: 'open' });

    const taxes = [
      add('taxes', { name: 'ضريبة القيمة المضافة 14%', rate: 14, country: 'مصر' }),
      add('taxes', { name: 'VAT 15% — السعودية', rate: 15, country: 'السعودية' }),
      add('taxes', { name: 'VAT 5% — الإمارات', rate: 5, country: 'الإمارات' }),
    ];
    const VAT = taxes[0].id;
    s.settings.defaultSalesTaxId = null;

    ['كجم', 'قطعة', 'دستة', 'علبة', 'بكرة', 'لتر', 'كرتونة', 'متر'].forEach((n) => add('units', { name: n }));

    const WH = {
      raw: add('warehouses', { name: 'مخزن الخامات والخيوط', code: 'WH-1', active: true }).id,
      fg: add('warehouses', { name: 'مخزن المنتج التام', code: 'WH-2', active: true }).id,
      sp: add('warehouses', { name: 'مخزن قطع الغيار والمستلزمات', code: 'WH-3', active: true }).id,
    };
    const cat = {};
    [['yarn', 'خيوط', 'YRN'], ['fg', 'منتج تام', 'FG'], ['sp', 'قطع غيار', 'SP'], ['nd', 'إبر', 'ND'], ['wx', 'شمع وزيوت', 'WX'], ['fin', 'مستلزمات تجهيز', 'FN'], ['pk', 'مستلزمات تغليف', 'PK']]
      .forEach(([k, name, prefix]) => (cat[k] = add('itemCats', { name, prefix }).id));

    const ACC = {
      main: add('accounts', { name: 'الخزينة الرئيسية', type: 'cash', active: true }).id,
      fac: add('accounts', { name: 'خزينة المصنع — مصروفات يومية', type: 'cash', active: true }).id,
      misr: add('accounts', { name: 'بنك مصر — حساب جاري', type: 'bank', number: '1020-3344-55', active: true }).id,
      ahly: add('accounts', { name: 'البنك الأهلي المصري', type: 'bank', number: '0099-1188-77', active: true }).id,
      wallet: add('accounts', { name: 'محفظة إنستاباي', type: 'wallet', active: true }).id,
    };
    const EXC = {};
    [['elec', 'كهرباء'], ['water', 'مياه وغاز'], ['rent', 'إيجار'], ['maint', 'صيانة ماكينات'], ['spare', 'قطع غيار'], ['needle', 'إبر'],
      ['wax', 'شمع وزيوت'], ['finish', 'خيوط ومستلزمات تجهيز'], ['ship', 'نقل وشحن'], ['hosp', 'ضيافة وبوفيه'], ['office', 'أدوات مكتبية'],
      ['net', 'اتصالات وإنترنت'], ['gov', 'رسوم حكومية وتأمينات'], ['mkt', 'تسويق ومعارض'], ['pack', 'تغليف'], ['other', 'مصروفات أخرى']]
      .forEach(([k, name]) => (EXC[k] = add('expenseCats', { name, active: true }).id));
    const INC = {};
    [['scrap', 'بيع هالك ومخلفات'], ['job', 'تشغيل للغير'], ['bank', 'عوائد بنكية'], ['other', 'إيرادات أخرى']].forEach(([k, name]) => (INC[k] = add('incomeCats', { name, active: true }).id));

    const DEP = {};
    [['knit', 'تريكو'], ['link', 'تجهيز وخياطة'], ['iron', 'مكواة وكي'], ['pack', 'تشطيب وتغليف'], ['maint', 'صيانة'], ['admin', 'إدارة ومخازن']]
      .forEach(([k, name]) => (DEP[k] = add('departments', { name }).id));
    const OP = {};
    [['link', 'ريمايل وتجميع قطعة', 'link', [3.0, 3.5, 4.0]], ['over', 'أوفرلوك قطعة', 'link', [1.0, 1.25, 1.5]], ['iron', 'كي قطعة', 'iron', [0.75, 1.0, 1.25]], ['pack', 'تطبيق وتغليف قطعة', 'pack', [0.4, 0.5, 0.6]]]
      .forEach(([k, name, dep, rates]) => {
        OP[k] = add('operations', { name, deptId: DEP[dep] }).id;
        rates.forEach((rate, i) => add('rates', { kind: 'operation', refId: OP[k], rule: 'piece', rate, from: `${2024 + i}-01-01`, note: 'تسعيرة سنة ' + (2024 + i) }));
      });

    // الأصناف
    let ic = 0;
    const item = (o) => add('items', Object.assign({ active: true, reorder: 0, salePrice: 0, lastCost: 0, altUnit: '', altFactor: 0 }, o, { code: o.code }));
    const Y = {
      wht: item({ code: 'YRN-001', name: 'أكريليك 2/32 أبيض', catId: cat.yarn, kind: 'raw', unit: 'كجم', altUnit: 'كرتونة', altFactor: 20, reorder: 400, base: 165 }),
      blk: item({ code: 'YRN-002', name: 'أكريليك 2/32 أسود', catId: cat.yarn, kind: 'raw', unit: 'كجم', altUnit: 'كرتونة', altFactor: 20, reorder: 400, base: 170 }),
      wol: item({ code: 'YRN-003', name: 'صوف ميرينو 2/48 رمادي', catId: cat.yarn, kind: 'raw', unit: 'كجم', altUnit: 'كرتونة', altFactor: 10, reorder: 150, base: 520 }),
      cot: item({ code: 'YRN-004', name: 'قطن مخلوط 30/2 بيج', catId: cat.yarn, kind: 'raw', unit: 'كجم', altUnit: 'كرتونة', altFactor: 20, reorder: 300, base: 190 }),
      vis: item({ code: 'YRN-005', name: 'فسكوز لامع كحلي', catId: cat.yarn, kind: 'raw', unit: 'كجم', altUnit: 'كرتونة', altFactor: 20, reorder: 200, base: 230 }),
    };
    const yarns = Object.values(Y);
    const SUP = {
      thr: item({ code: 'FN-001', name: 'خيط تجهيز بوليستر', catId: cat.fin, kind: 'consumable', unit: 'بكرة', reorder: 60, base: 45 }),
      sp1: item({ code: 'SP-001', name: 'سكينة ماكينة شيما', catId: cat.sp, kind: 'spare', unit: 'قطعة', reorder: 4, base: 350 }),
      sp2: item({ code: 'SP-002', name: 'سير ماكينة تريكو', catId: cat.sp, kind: 'spare', unit: 'قطعة', reorder: 3, base: 600 }),
      sp3: item({ code: 'SP-003', name: 'حساس قطع خيط', catId: cat.sp, kind: 'spare', unit: 'قطعة', reorder: 2, base: 900 }),
      nd1: item({ code: 'ND-001', name: 'إبر ماكينة 12 جيج (علبة 100)', catId: cat.nd, kind: 'consumable', unit: 'علبة', reorder: 5, base: 1200 }),
      wx1: item({ code: 'WX-001', name: 'شمع خيوط', catId: cat.wx, kind: 'consumable', unit: 'كجم', reorder: 20, base: 120 }),
      wx2: item({ code: 'WX-002', name: 'زيت ماكينات', catId: cat.wx, kind: 'consumable', unit: 'لتر', reorder: 15, base: 180 }),
      pk1: item({ code: 'PK-001', name: 'أكياس تغليف شفافة (100)', catId: cat.pk, kind: 'consumable', unit: 'علبة', reorder: 20, base: 85 }),
      pk2: item({ code: 'PK-002', name: 'تيكت وليبل مطبوع (1000)', catId: cat.pk, kind: 'consumable', unit: 'علبة', reorder: 5, base: 300 }),
    };

    // الموديلات والمنتجات التامة
    const MC = {};
    ['رجالي', 'حريمي', 'أطفال', 'إكسسوارات'].forEach((n, i) => (MC[i] = add('modelCats', { name: n }).id));
    const models = [];
    const model = (code, name, mc, yarn, ypp, hrs, price, status, created, desc) => {
      const m = add('models', { code, name, catId: MC[mc], season: 'شتاء', yarnId: yarn ? yarn.id : null, yarnPerPiece: ypp, wastePct: 5, stdHours: hrs, status, createdAt: created, description: desc, sizes: 'S-M-L-XL', colors: '' });
      if (price) {
        const it = item({ code: 'FG-' + code.replace('-', ''), name, catId: cat.fg, kind: 'finished', unit: 'قطعة', salePrice: price, modelId: m.id, reorder: 40 });
        m.itemId = it.id;
      }
      models.push(m);
      return m;
    };
    const M = {
      m101: model('M-101', 'بلوفر رجالي ضفيرة', 0, Y.wht, 0.45, 0.6, 420, 'done', '2023-11-10', 'ضفيرة أمامية، رقبة دائرية، جيج 12'),
      w205: model('W-205', 'كارديجان حريمي طويل', 1, Y.wol, 0.65, 0.9, 640, 'done', '2023-11-18', 'كارديجان بأزرار وجيوب جانبية'),
      k310: model('K-310', 'سويتر أطفال مقلم', 2, Y.cot, 0.28, 0.4, 260, 'done', '2023-12-02', 'خطوط عرضية بلونين'),
      a050: model('A-050', 'طقم طاقية وكوفية', 3, Y.blk, 0.12, 0.2, 150, 'done', '2023-12-05', ''),
      m118: model('M-118', 'بلوفر رجالي نص رقبة سادة', 0, Y.blk, 0.42, 0.5, 380, 'done', '2024-09-01', 'سوستة نص رقبة'),
      w230: model('W-230', 'فستان تريكو ضلع', 1, Y.vis, 0.75, 1.1, 790, 'done', '2025-08-20', 'ضلع 2×2 بطول الركبة'),
      m125: model('M-125', 'بلوفر جاكار نورديك', 0, Y.wht, 0.55, 0.8, 0, 'in_progress', '2026-09-12', 'جاكار 3 ألوان — قيد البرمجة'),
      w240: model('W-240', 'بونشو حريمي', 1, Y.wol, 0.7, 0.9, 0, 'in_progress', '2026-09-15', ''),
      k322: model('K-322', 'جاكيت أطفال بسوستة', 2, Y.cot, 0.35, 0.5, 0, 'new', '2026-10-05', ''),
      w250: model('W-250', 'كارديجان قصير بأكمام منفوخة', 1, Y.vis, 0.5, 0.7, 0, 'new', '2026-10-18', ''),
      m130: model('M-130', 'فيست رجالي', 0, Y.blk, 0.3, 0.4, 0, 'new', '2026-10-25', ''),
    };
    const sellable = [M.m101, M.w205, M.k310, M.a050];

    // الأطراف
    let pc = { customer: 0, supplier: 0, workshop: 0, designer: 0 };
    const PFX = { customer: 'C', supplier: 'S', workshop: 'WS', designer: 'D' };
    const party = (types, name, phone, address, extra) => {
      const t = types[0]; pc[t]++;
      return add('parties', Object.assign({ code: PFX[t] + '-' + U.pad(pc[t], 3), name, types, phone, address, notes: '', active: true, startDate: '2024-01-01', taxNo: '' }, extra || {}));
    };
    const C = [
      party(['customer'], 'محلات الأمل للملابس', '0100 123 4567', 'القاهرة — الموسكي'),
      party(['customer'], 'مؤسسة الفجر للتوزيع', '0122 765 4321', 'الإسكندرية — سموحة', { taxNo: '300-221-118', taxable: true }),
      party(['customer'], 'بوتيك لمسة', '0111 222 3344', 'المنصورة — شارع الجمهورية'),
      party(['customer'], 'شركة النيل للتجارة', '0155 444 6677', 'طنطا — شارع البحر', { taxNo: '411-908-552', taxable: true }),
      party(['customer'], 'معرض الشروق', '0128 900 1122', 'أسيوط — شارع الجمهورية', { startDate: '2025-03-01' }),
      party(['customer'], 'متجر دفا أونلاين', '0109 555 7788', 'القاهرة الجديدة', { startDate: '2025-10-01' }),
      party(['customer'], 'محلات زمان', '0100 999 0000', 'الزقازيق', { notes: 'توقف التعامل منذ 2025' }),
    ];
    const SP = [
      party(['supplier'], 'شركة مصر للغزل والنسيج', '040 333 1234', 'المحلة الكبرى'),
      party(['supplier', 'customer'], 'الشرق للخيوط المستوردة', '03 488 7766', 'الإسكندرية — المنطقة الحرة', { notes: 'مورد خيوط ويشتري منا أحيانًا' }),
      party(['supplier'], 'المتحدة لقطع غيار الماكينات', '02 2590 4433', 'القاهرة — شبرا'),
      party(['supplier'], 'الحرمين للمستلزمات', '0100 333 2211', 'العاشر من رمضان'),
      party(['supplier'], 'مطبعة الأمانة', '0114 777 8899', 'الزقازيق'),
    ];
    const WS = [
      party(['workshop'], 'ورشة الحاج سعيد للتريكو', '0100 444 1111', 'بلبيس', { lineName: 'خط 1 — ماكينات شيما 12', rule: 'hour' }),
      party(['workshop'], 'مصنع الإخلاص للتريكو', '0122 444 2222', 'العاشر من رمضان', { lineName: 'خط 2 — جاكار', rule: 'hour' }),
      party(['workshop'], 'ورشة أبناء رمضان', '0111 444 3333', 'منيا القمح', { lineName: 'خط 3 — أطفال', rule: 'piece' }),
      party(['workshop'], 'مصنع النجمة', '0155 444 4444', 'الزقازيق', { lineName: 'خط 4', rule: 'kg', notes: 'تعامل موسمي' }),
    ];
    const DS = [
      party(['designer'], 'م. شريف عادل — رسم وبرمجة شيما', '0100 777 1212', 'القاهرة'),
      party(['designer'], 'ستوديو خيط للتصميم', '0122 777 3434', 'الإسكندرية'),
    ];

    // أسعار المصنعية عبر السنوات
    [[15, 18, 20, 'hour'], [12, 14, 16, 'piece'], [40, 45, 50, 'kg']].forEach(([a, b, c, rule]) =>
      [a, b, c].forEach((rate, i) => add('rates', { kind: 'workshop', refId: null, rule, rate, from: `${2024 + i}-01-01`, note: 'السعر العام لسنة ' + (2024 + i) })));
    add('rates', { kind: 'workshop', refId: WS[1].id, rule: 'hour', rate: 22, from: '2026-01-01', note: 'اتفاق خاص — ماكينات جاكار' });
    add('rates', { kind: 'workshop', refId: WS[2].id, rule: 'piece', rate: 17, from: '2026-01-01', note: 'اتفاق خاص' });

    // العمال
    let wc = 0;
    const worker = (name, dep, payType, rate, phone, startDate) => add('workers', { code: 'W-' + U.pad(++wc, 3), name, deptId: DEP[dep], payType, rate, phone, startDate: startDate || '2024-01-01', active: true, job: '' });
    const W = [
      worker('محمد عبد الله', 'knit', 'weekly', 1500, '0100 111 0001'),
      worker('سيد إبراهيم', 'knit', 'weekly', 1400, '0100 111 0002'),
      worker('فاطمة حسن', 'link', 'piece', 0, '0100 111 0003'),
      worker('منى سعيد', 'link', 'piece', 0, '0100 111 0004'),
      worker('هاني رمضان', 'iron', 'piece', 0, '0100 111 0005'),
      worker('رضا السيد', 'iron', 'daily', 250, '0100 111 0006'),
      worker('أسماء علي', 'pack', 'piece', 0, '0100 111 0007'),
      worker('عم حسين', 'maint', 'monthly', 7000, '0100 111 0008'),
      worker('مصطفى كمال', 'admin', 'monthly', 8500, '0100 111 0009'),
      worker('يوسف عادل', 'knit', 'hour', 35, '0100 111 0010', '2025-02-01'),
    ];

    // قوالب الفواتير
    const cols = (on) => [['idx', 'م'], ['code', 'الكود'], ['name', 'الصنف / الوصف'], ['unit', 'الوحدة'], ['qty', 'الكمية'], ['price', 'السعر'], ['disc', 'الخصم'], ['tax', 'الضريبة'], ['total', 'الإجمالي']]
      .map(([key, label]) => ({ key, label, on: on.includes(key) }));
    add('templates', {
      name: 'القالب الأساسي', isDefault: true, paper: 'A4', style: 'classic', color: '#1d4fd8', title: 'فاتورة',
      columns: cols(['idx', 'code', 'name', 'unit', 'qty', 'price', 'disc', 'total']),
      show: { logo: true, companyInfo: true, partyPhone: true, partyAddress: true, taxNo: true, balance: true, notes: true, signature: true, payment: true, terms: true, stamp: false },
      footer: 'شكرًا لتعاملكم معنا', terms: 'البضاعة المباعة تُستبدل خلال 14 يومًا بحالتها الأصلية.', customFields: [],
    });
    add('templates', {
      name: 'فاتورة ضريبية مفصلة', isDefault: false, paper: 'A4', style: 'modern', color: '#13233a', title: 'فاتورة ضريبية',
      columns: cols(['idx', 'code', 'name', 'unit', 'qty', 'price', 'disc', 'tax', 'total']),
      show: { logo: true, companyInfo: true, partyPhone: true, partyAddress: true, taxNo: true, balance: false, notes: true, signature: true, payment: true, terms: true, stamp: true },
      footer: 'هذه الفاتورة صادرة إلكترونيًا', terms: 'الأسعار شاملة/غير شاملة الضريبة كما هو موضح.', customFields: [{ label: 'رقم أمر الشراء', value: '' }],
    });
    add('templates', {
      name: 'إيصال حراري 80مم', isDefault: false, paper: 'thermal', style: 'minimal', color: '#000000', title: 'إيصال بيع',
      columns: cols(['name', 'qty', 'price', 'total']),
      show: { logo: true, companyInfo: true, partyPhone: false, partyAddress: false, taxNo: false, balance: true, notes: false, signature: false, payment: true, terms: false, stamp: false },
      footer: 'شكرًا لزيارتكم', terms: '', customFields: [],
    });

    /* ───────── محرك توليد المستندات ───────── */
    let fails = 0, retryDate = null;
    const mk = (type, date, fields) => {
      DB._clock = date + 'T10:00:00.000Z';
      const d = E.newDoc(type, Object.assign({ date }, fields));
      d.createdAt = DB._clock;
      E.calcDoc(d);
      DB.add('docs', d);
      try { E.post(d.id); d.postedAt = DB._clock; return d; }
      catch (e) {
        // المحاكاة تولّد مستندات الشهر حسب النوع لا حسب التاريخ؛ إن لم يكفِ الرصيد في تاريخه نؤجله لآخر الشهر
        if (e.biz && /الرصيد غير كافٍ/.test(e.message) && retryDate && date < retryDate) {
          try { d.date = retryDate; DB._clock = retryDate + 'T16:00:00.000Z'; d.createdAt = DB._clock; E.post(d.id); d.postedAt = DB._clock; return d; } catch (e2) { e = e2; }
        }
        fails++; DB.remove('docs', d.id); if (fails < 15) console.warn('seed', type, date, e.message, e.details); return null; }
    };
    const draft = (type, date, fields) => { const d = E.newDoc(type, Object.assign({ date }, fields)); E.calcDoc(d); d.createdAt = date + 'T09:00:00.000Z'; return DB.add('docs', d); };
    const richest = (types) => s.accounts.filter((a) => !types || types.includes(a.type)).map((a) => ({ a, b: E.cashBalance(a.id) })).sort((x, y) => y.b - x.b)[0];
    const payFrom = (pref, amount) => {
      const b = E.cashBalance(pref);
      if (b >= amount) return pref;
      const r = richest();
      return r && r.b >= amount ? r.a.id : null;
    };
    const itemLine = (it, qty, price, extra) => Object.assign({ kind: 'item', itemId: it.id, qty, unit: 'base', price, disc: 0 }, extra || {});
    const r = (lo, hi) => lo + R() * (hi - lo);
    const roundTo = (n, step) => Math.round(n / step) * step;

    // الأرصدة الافتتاحية
    const D0 = '2024-01-01';
    [[ACC.main, 350000], [ACC.fac, 40000], [ACC.misr, 1100000], [ACC.ahly, 450000], [ACC.wallet, 15000]].forEach(([accountId, amount]) => mk('OA', D0, { accountId, amount, notes: 'رصيد أول المدة' }));
    mk('OB', D0, { st: 'party', sid: C[0].id, side: 'debit', amount: 48500, notes: 'مديونية مرحلة من الدفاتر الورقية' });
    mk('OB', D0, { st: 'party', sid: C[6].id, side: 'debit', amount: 12800, notes: 'رصيد قديم' });
    mk('OB', D0, { st: 'party', sid: SP[0].id, side: 'credit', amount: 86000, notes: 'مستحق مرحل' });
    mk('OB', D0, { st: 'party', sid: WS[0].id, side: 'credit', amount: 9500, notes: 'مصنعية ديسمبر 2023' });
    mk('OS', D0, { whId: WH.raw, notes: 'جرد أول المدة', lines: [itemLine(Y.wht, 0, 0, { qty: 900, cost: 160 }), itemLine(Y.blk, 0, 0, { qty: 700, cost: 165 }), itemLine(Y.wol, 0, 0, { qty: 250, cost: 500 }), itemLine(Y.cot, 0, 0, { qty: 500, cost: 185 })] });
    mk('OS', D0, { whId: WH.sp, notes: 'جرد أول المدة', lines: [itemLine(SUP.sp1, 0, 0, { qty: 6, cost: 330 }), itemLine(SUP.nd1, 0, 0, { qty: 8, cost: 1150 }), itemLine(SUP.wx1, 0, 0, { qty: 40, cost: 115 }), itemLine(SUP.wx2, 0, 0, { qty: 30, cost: 170 }), itemLine(SUP.pk1, 0, 0, { qty: 40, cost: 80 }), itemLine(SUP.thr, 0, 0, { qty: 120, cost: 42 })] });
    mk('OS', D0, { whId: WH.fg, notes: 'جرد أول المدة', lines: [itemLine(s.items.find((i) => i.modelId === M.m101.id), 0, 0, { qty: 220, cost: 190 }), itemLine(s.items.find((i) => i.modelId === M.k310.id), 0, 0, { qty: 180, cost: 120 })] });

    // مهام رسم
    const dj = (date, designer, list, rate, payPct) => {
      const d = mk('DJ', date, { sid: designer.id, notes: 'تسليم ملفات برمجة ماكينات شيما', lines: list.map((m) => ({ modelId: m.id, amount: rate })) });
      if (d && payPct) { const a = U.r2(d.totals.total * payPct); const acc = payFrom(ACC.main, a); if (acc) mk('PY', U.addDays(date, 10), { st: 'party', sid: designer.id, amount: a, accountId: acc, method: 'cash', purpose: 'payment', allocId: d.id }); }
    };
    dj('2024-01-08', DS[0], [M.m101, M.w205, M.k310, M.a050], 350, 1);
    dj('2024-08-20', DS[0], [M.m118], 400, 1);
    dj('2025-08-10', DS[1], [M.w230], 650, 1);

    // ───── الحلقة الشهرية ─────
    const start = new Date('2024-01-01T12:00:00');
    const endYm = U.ym(today);
    const fgItem = (m) => s.items.find((i) => i.id === m.itemId);
    let woCount = 0;
    for (let mi = 0; ; mi++) {
      const dt = new Date(start); dt.setMonth(start.getMonth() + mi);
      const ym = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
      if (ym > endYm) break;
      const y = +ym.slice(0, 4);
      const isCurrent = ym === endYm;
      const lastDay = isCurrent ? today : U.endOfMonth(ym + '-01');
      retryDate = lastDay;
      const day = (n) => { const d = ym + '-' + String(Math.min(n, 28)).padStart(2, '0'); return d > lastDay ? lastDay : d; };
      const infl = 1 + mi * 0.011;
      const winter = [9, 10, 11, 12, 1, 2].includes(+ym.slice(5));

      if (y === 2025 && ym === '2025-01') { sellable.push(M.m118); }
      if (ym === '2025-10') { sellable.push(M.w230); }
      if (ym === '2025-01') { s.items.forEach((it) => { if (it.kind === 'finished') it.salePrice = roundTo(it.salePrice * 1.12, 5); }); }
      if (ym === '2026-01') { s.items.forEach((it) => { if (it.kind === 'finished') it.salePrice = roundTo(it.salePrice * 1.1, 5); }); }

      // مشتريات خيوط
      // نشتري الخيط فقط عندما يقترب من حد إعادة الطلب
      const lowYarns = yarns.filter((yy) => E.onHand(yy.id, WH.raw) < yy.reorder * 2.2);
      const buckets = [lowYarns.filter((_, i) => i % 2 === 0), lowYarns.filter((_, i) => i % 2 === 1)];
      for (let k = 0; k < 2; k++) {
        const sup = k === 0 ? SP[0] : SP[1];
        const pick = buckets[k];
        if (!pick.length) continue;
        const lines = pick.map((yy) => itemLine(yy, roundTo(yy.reorder * r(1.8, 3), 20), U.r2(yy.base * infl * r(0.97, 1.03))));
        if (R() < 0.3) lines[0].unit = 'alt', lines[0].qty = roundTo(lines[0].qty / yy0(lines[0]), 1), (lines[0].price = U.r2(lines[0].price * yy0(lines[0])));
        const disc = R() < 0.2 ? 500 : 0;
        const d0 = E.newDoc('PI', { whId: WH.raw, sid: sup.id, taxId: VAT, lines: U.clone(lines), discount: disc }); E.calcTrade(d0);
        const paid = R() < 0.35 ? d0.totals.total : R() < 0.5 ? roundTo(d0.totals.total * 0.4, 100) : 0;
        const acc = paid ? payFrom(ACC.misr, paid) : null;
        mk('PI', day(3 + k * 12), { whId: WH.raw, sid: sup.id, taxId: VAT, lines, discount: disc, paid: acc ? paid : 0, accountId: acc, method: 'transfer', supplierRef: 'F-' + R.int(10000, 99999) });
      }
      function yy0(l) { const it = s.items.find((i) => i.id === l.itemId); return it.altFactor || 1; }
      // مستلزمات وقطع غيار كل شهرين
      if (mi % 2 === 0) {
        const lines = [itemLine(SUP.nd1, R.int(2, 5), U.r2(1200 * infl)), itemLine(SUP.wx1, R.int(10, 25), U.r2(120 * infl)), itemLine(SUP.wx2, R.int(8, 15), U.r2(180 * infl)), itemLine(SUP.thr, R.int(40, 80), U.r2(45 * infl))];
        if (R() < 0.5) lines.push({ kind: 'expense', catId: EXC.maint, desc: 'صيانة دورية لماكينة شيما', qty: 1, price: roundTo(1500 * infl, 50), disc: 0 });
        mk('PI', day(6), { whId: WH.sp, sid: SP[3].id, lines, paid: 0 });
      }
      if (mi % 3 === 1) mk('PI', day(9), { whId: WH.sp, sid: SP[2].id, lines: [itemLine(R.pick([SUP.sp1, SUP.sp2, SUP.sp3]), R.int(1, 3), U.r2(600 * infl)), itemLine(SUP.sp1, 2, U.r2(350 * infl))], taxId: VAT, paid: 0 });
      if (mi % 4 === 2) mk('PI', day(11), { whId: WH.sp, sid: SP[4].id, lines: [itemLine(SUP.pk1, R.int(20, 40), U.r2(85 * infl)), itemLine(SUP.pk2, R.int(2, 5), U.r2(300 * infl))], paid: 0 });

      // استهلاك داخلي
      const cons = [[SUP.wx1, 6, EXC.wax], [SUP.wx2, 4, EXC.wax], [SUP.nd1, 1, EXC.needle], [SUP.thr, 25, EXC.finish], [SUP.pk1, 12, EXC.pack]];
      const grp = U.groupBy(cons, (c) => c[2]);
      for (const [catId, arr] of grp) {
        const lines = arr.map(([it, q]) => ({ kind: 'item', itemId: it.id, qty: Math.min(q, Math.max(0, E.onHand(it.id, WH.sp))) })).filter((l) => l.qty > 0);
        if (lines.length) mk('CI', day(20), { whId: WH.sp, catId, lines, notes: 'صرف للماكينات وخط التشطيب' });
      }
      if (R() < 0.25 && E.onHand(SUP.sp1.id, WH.sp) >= 1) mk('CI', day(15), { whId: WH.sp, catId: EXC.spare, lines: [{ kind: 'item', itemId: SUP.sp1.id, qty: 1 }], notes: 'تغيير سكينة ماكينة 3' });

      // أوامر التشغيل للورش
      const shops = y === 2025 ? [WS[0], WS[1], WS[3]] : [WS[0], WS[1], WS[2]];
      const nWO = winter ? 3 : 2;
      for (let k = 0; k < nWO; k++) {
        const shop = shops[(mi + k) % shops.length];
        const m = R.pick(sellable);
        const target = roundTo(r(250, 600), 10);
        woCount++;
        const wo = add('orders', { no: `WO-${y}-${U.pad(woCount, 4)}`, date: day(2 + k * 7), partyId: shop.id, modelId: m.id, itemId: m.itemId, targetQty: target, rule: shop.rule, agreedRate: 0, status: 'open', notes: '', createdAt: day(2 + k * 7) + 'T09:00:00.000Z' });
        const yarn = s.items.find((i) => i.id === m.yarnId);
        const need = U.r2(target * m.yarnPerPiece * 1.06);
        const avail = E.onHand(yarn.id, WH.raw);
        const issueQty = Math.min(roundTo(need, 5), Math.floor(avail));
        if (issueQty <= 0) { wo.status = 'cancelled'; continue; }
        mk('MI', wo.date, { sid: shop.id, woId: wo.id, whId: WH.raw, lines: [{ kind: 'item', itemId: yarn.id, qty: issueQty }], notes: 'تسليم خيط للتشغيل' });
        // سلفة
        if (R() < 0.6) { const a = roundTo(r(1500, 5000), 500); const acc = payFrom(ACC.fac, a); if (acc) mk('PY', U.addDays(wo.date, 3) > lastDay ? lastDay : U.addDays(wo.date, 3), { st: 'party', sid: shop.id, amount: a, accountId: acc, method: 'cash', purpose: 'advance', woId: wo.id, notes: 'سلفة على أمر التشغيل' }); }
        // دفعات استلام
        const batches = isCurrent && k > 0 ? 0 : isCurrent ? 1 : 2;
        let made = 0;
        const possible = Math.floor(issueQty / (m.yarnPerPiece * 1.04));
        for (let b = 0; b < batches; b++) {
          const q = b === batches - 1 && !isCurrent ? Math.min(target, possible) - made : roundTo(Math.min(target, possible) * 0.5, 10);
          if (q <= 0) break;
          const wasteFactor = shop.id === WS[3].id ? r(1.09, 1.14) : r(1.01, 1.045);
          const custody = E.custodyQty(shop.id, yarn.id);
          const consumed = Math.min(U.r2(q * m.yarnPerPiece * wasteFactor), custody);
          const date = U.addDays(wo.date, 8 + b * 9) > lastDay ? lastDay : U.addDays(wo.date, 8 + b * 9);
          const pr = mk('PRC', date, { sid: shop.id, woId: wo.id, itemId: m.itemId, whId: WH.fg, qtyGood: q, qtyRejected: R() < 0.3 ? R.int(1, 6) : 0, hours: U.r2(q * m.stdHours * r(0.95, 1.1)), lines: [{ kind: 'item', itemId: yarn.id, qty: consumed }], notes: '' });
          if (pr) made += q;
        }
        if (!isCurrent && made > 0) {
          const left = E.custodyQty(shop.id, yarn.id);
          if (left > 0.5 && R() < 0.7) mk('MR', U.addDays(wo.date, 20) > lastDay ? lastDay : U.addDays(wo.date, 20), { sid: shop.id, woId: wo.id, whId: WH.raw, lines: [{ kind: 'item', itemId: yarn.id, qty: U.r2(left * 0.6) }], notes: 'مرتجع خيط زائد' });
          if (mi < 30) wo.status = 'closed';
        }
      }
      // تسوية حسابات الورش (سداد المستحق)
      if (!isCurrent) for (const shop of WS) {
        const b = E.balance('party', shop.id);
        if (b < -500 && R() < 0.8) {
          const a = roundTo(-b * (mi > 30 ? 0.6 : 1), 100);
          const acc = payFrom(ACC.main, a);
          if (acc && a > 0) mk('PY', day(27), { st: 'party', sid: shop.id, amount: a, accountId: acc, method: R() < 0.5 ? 'cash' : 'transfer', purpose: 'payment', notes: 'تسوية مصنعية الشهر' });
        }
      }
      // إنتاج داخلي (طقم إكسسوار)
      if (R() < 0.15) {
        const it = fgItem(M.a050); const q = R.int(40, 90);
        const need = U.r2(q * 0.12 * 1.03);
        if (E.onHand(Y.blk.id, WH.raw) > need) mk('IP', day(14), { whId: WH.raw, whTo: WH.fg, itemId: it.id, qtyGood: q, lines: [{ kind: 'item', itemId: Y.blk.id, qty: need }], notes: 'إنتاج على ماكينات المصنع' });
      }

      // المبيعات
      const custs = C.filter((c) => (c.startDate <= day(1)) && !(c.id === C[6].id && y >= 2025));
      const nSales = isCurrent ? 2 : winter ? R.int(6, 9) : R.int(3, 5);
      for (let k = 0; k < nSales; k++) {
        const cu = R.pick(custs.concat(R() < 0.1 ? [SP[1]] : []));
        const lines = [];
        for (const m of [R.pick(sellable), R.pick(sellable)].filter((v, i, a) => a.indexOf(v) === i)) {
          const it = fgItem(m);
          const av = E.onHand(it.id, WH.fg);
          const q = Math.min(roundTo(r(40, 180), 5), Math.floor(av * 0.35));
          if (q > 0) lines.push(itemLine(it, q, it.salePrice, { disc: R() < 0.3 ? 5 : 0 }));
        }
        if (!lines.length) continue;
        const taxable = cu.taxable;
        const d0 = E.newDoc('SI', { lines, taxId: taxable ? VAT : null }); E.calcTrade(d0);
        const paid = R() < 0.3 ? d0.totals.total : R() < 0.4 ? roundTo(d0.totals.total * 0.3, 100) : 0;
        const acc = paid ? (R() < 0.5 ? ACC.main : ACC.ahly) : null;
        mk('SI', day(R.int(4, 27)), { whId: WH.fg, sid: cu.id, lines, taxId: taxable ? VAT : null, paid, accountId: acc, method: acc === ACC.main ? 'cash' : 'transfer', templateId: taxable ? s.templates[1].id : null });
      }
      // مرتجع عرضي
      if (R() < 0.15) {
        const inv = s.docs.filter((d) => d.type === 'SI' && d.status === 'posted' && d.date.startsWith(ym) && d.sid !== SP[1].id)[0];
        if (inv) {
          const l = inv.lines[0];
          mk('SR', U.addDays(inv.date, 2) > lastDay ? lastDay : U.addDays(inv.date, 2), { whId: WH.fg, sid: inv.sid, refId: inv.id, taxId: inv.taxId, lines: [Object.assign({}, l, { qty: Math.max(1, Math.round(l.qty * 0.1)), srcCostUnit: l.costUnit })], notes: 'عيوب تشطيب', paid: 0 });
        }
      }
      // التحصيلات
      if (!isCurrent || true) for (const cu of custs) {
        const b = E.balance('party', cu.id);
        if (b > 1000 && R() < 0.75) {
          const a = roundTo(b * r(0.4, 0.9), 100);
          const method = R.pick(['cash', 'transfer', 'transfer', 'cheque', 'wallet']);
          const acc = method === 'cash' ? ACC.main : method === 'wallet' ? ACC.wallet : R() < 0.5 ? ACC.misr : ACC.ahly;
          const date = day(R.int(10, 28));
          if (date <= lastDay) mk('RC', date, { st: 'party', sid: cu.id, amount: a, accountId: acc, method, chequeNo: method === 'cheque' ? String(R.int(100000, 999999)) : '', notes: '' });
        }
      }
      // سداد الموردين
      for (const sp of SP) {
        const b = E.balance('party', sp.id);
        if (b < -2000 && R() < 0.7) {
          const a = roundTo(-b * r(0.7, 0.95), 100);
          const acc = payFrom(R() < 0.6 ? ACC.misr : ACC.ahly, a);
          if (acc) mk('PY', day(R.int(12, 26)), { st: 'party', sid: sp.id, amount: a, accountId: acc, method: s.accounts.find((x) => x.id === acc).type === 'cash' ? 'cash' : 'transfer', purpose: 'payment' });
        }
      }
      // تحويلات تمويل الخزائن
      const facNeed = 70000 - E.cashBalance(ACC.fac);
      if (facNeed > 5000) { const src = payFrom(ACC.main, facNeed); if (src && src !== ACC.fac) mk('TR', day(1), { accountId: src, accountTo: ACC.fac, amount: roundTo(facNeed, 1000), notes: 'تمويل خزينة المصنع' }); }
      if (E.cashBalance(ACC.main) < 120000 && E.cashBalance(ACC.misr) > 200000) mk('TR', day(2), { accountId: ACC.misr, accountTo: ACC.main, amount: 100000, method: 'transfer', notes: 'سحب نقدي من البنك' });
      if (E.cashBalance(ACC.wallet) > 30000) mk('TR', day(25), { accountId: ACC.wallet, accountTo: ACC.ahly, amount: roundTo(E.cashBalance(ACC.wallet) - 5000, 1000), method: 'transfer', notes: 'تحويل رصيد المحفظة' });

      // المصروفات
      const ex = (catId, amount, dayN, beneficiary, acc, extra) => { const a = roundTo(amount, 5); const pa = payFrom(acc || ACC.fac, a); if (pa) mk('EX', day(dayN), Object.assign({ catId, amount: a, accountId: pa, method: s.accounts.find((x) => x.id === pa).type === 'cash' ? 'cash' : 'transfer', payMode: 'paid', beneficiary }, extra || {})); };
      ex(EXC.elec, r(9000, 15000) * infl, 5, 'شركة توزيع الكهرباء — شحن عداد', ACC.fac);
      ex(EXC.rent, 25000 * (y === 2024 ? 1 : y === 2025 ? 1.1 : 1.2), 1, 'إيجار عنبر المصنع', ACC.main);
      ex(EXC.water, r(800, 1600), 8, 'المياه والغاز', ACC.fac);
      ex(EXC.net, 950, 10, 'اشتراك إنترنت ومحمول', ACC.wallet);
      ex(EXC.hosp, r(1200, 2400), 15, 'بوفيه العمال', ACC.fac);
      ex(EXC.ship, r(1500, 4500), 18, 'نقل بضاعة للعملاء', ACC.fac);
      if (R() < 0.4) ex(EXC.maint, r(1000, 6000), 22, 'فني صيانة ماكينات', ACC.fac);
      if (R() < 0.3) ex(EXC.office, r(200, 900), 12, 'أدوات مكتبية', ACC.fac);
      if (mi % 3 === 0) ex(EXC.gov, r(4000, 9000), 24, 'تأمينات اجتماعية', ACC.misr);
      if (ym === '2025-02' || ym === '2026-02') ex(EXC.mkt, 35000, 16, 'معرض القاهرة للملابس الجاهزة', ACC.misr);
      if (R() < 0.25) { const a = roundTo(r(800, 2500), 5); mk('EX', day(19), { catId: EXC.wax, amount: a, payMode: 'credit', sid: SP[3].id, beneficiary: SP[3].name, notes: 'شمع على الحساب' }); }

      // إيرادات أخرى
      if (mi % 3 === 2) { const a = roundTo(r(2500, 6000), 50); mk('IN', day(23), { catId: INC.scrap, amount: a, accountId: ACC.main, method: 'cash', source: 'تاجر هالك', notes: 'بيع بواقي خيوط وكراتين' }); }
      if (mi % 6 === 5) mk('IN', day(28), { catId: INC.bank, amount: roundTo(r(3000, 8000), 10), accountId: ACC.misr, method: 'transfer', source: 'بنك مصر' });

      // يوميات العمال
      const monthEnd = lastDay;
      for (const w of W) {
        if (w.startDate > monthEnd) continue;
        const base = isCurrent ? 0.08 : 1;
        if (w.payType === 'piece') {
          const ops = w.deptId === DEP.link ? [OP.link, OP.over] : w.deptId === DEP.iron ? [OP.iron] : [OP.pack];
          for (const op of ops) { const q = Math.round(r(900, 1600) * base * (winter ? 1.2 : 0.8)); if (q > 0) add('workLogs', { workerId: w.id, date: isCurrent ? lastDay : day(25), kind: 'pieces', opId: op, qty: q, modelId: R.pick(sellable).id, note: '' }); }
        } else if (w.payType === 'daily') add('workLogs', { workerId: w.id, date: isCurrent ? lastDay : day(25), kind: 'days', qty: isCurrent ? 1 : R.int(22, 26), note: '' });
        else if (w.payType === 'hour') add('workLogs', { workerId: w.id, date: isCurrent ? lastDay : day(25), kind: 'hours', qty: isCurrent ? 9 : R.int(180, 215), note: '' });
      }
      // سلف العمال
      if (R() < 0.5) { const w = R.pick(W.filter((x) => x.startDate <= day(10))); const a = roundTo(r(500, 2000), 100); const acc = payFrom(ACC.fac, a); if (acc) mk('PY', day(12), { st: 'worker', sid: w.id, amount: a, accountId: acc, method: 'cash', purpose: 'advance', notes: 'سلفة' }); }
      // مسير الأجور الشهري + صرف الكل
      if (!isCurrent) {
        const from = ym + '-01', to = U.endOfMonth(from);
        const pv = E.payrollPreview(from, to);
        pv.lines.forEach((l) => { if (R() < 0.12) l.bonus = roundTo(r(100, 500), 50); if (R() < 0.08) l.deduction = roundTo(r(100, 300), 50); });
        const pd = mk('PAYR', to, { from, to, lines: pv.lines, notes: 'مسير أجور ' + U.monthLabel(ym) });
        if (pd) for (const w of W) {
          const b = E.balance('worker', w.id);
          if (b < -1) { const acc = payFrom(ACC.fac, -b); if (acc) mk('PY', to, { st: 'worker', sid: w.id, amount: -b, accountId: acc, method: 'cash', purpose: 'payment', payrollId: pd.id, notes: 'صرف أجر ' + U.monthLabel(ym) }); }
        }
      }
      // جرد نهاية السنة
      if (ym.endsWith('-12')) {
        const lines = yarns.map((yy) => ({ kind: 'item', itemId: yy.id, qty: Math.max(0, U.r2(E.onHand(yy.id, WH.raw) + r(-8, 3))) }));
        mk('ADJ', U.endOfMonth(ym + '-01'), { whId: WH.raw, lines, notes: 'جرد سنوي ' + y });
      }
      // فاقد ورشة النجمة
      if (ym === '2025-11') {
        const it = Y.cot; const q = Math.min(25, E.custodyQty(WS[3].id, it.id));
        if (q > 0) mk('WL', day(28), { sid: WS[3].id, itemId: it.id, qty: q, reason: 'فاقد زائد عن النسبة المسموحة', charge: true, chargeAmount: 0 });
      }
    }

    // مهام رسم 2026
    dj('2026-09-20', DS[0], [M.m125, M.w240], 750, 0.5);
    const lastJob = draft('DJ', '2026-10-28', { sid: DS[0].id, notes: 'موديلات الموسم الجديد — بانتظار المراجعة', lines: [M.k322, M.w250, M.m130].map((m) => ({ modelId: m.id, amount: 750 })) });
    // مسودات للتجربة
    const lastInv = draft('SI', today, { whId: WH.fg, sid: C[2].id, lines: [itemLine(fgItem(M.m101), 30, fgItem(M.m101).salePrice), itemLine(fgItem(M.k310), 24, fgItem(M.k310).salePrice)], taxId: null, paid: 0, notes: 'بانتظار تأكيد العميل' });

    // إقفال 2024
    s.fiscalYears.find((f) => f.name === '2024').status = 'closed';

    s.currentUserId = users[0].id;
    DB.bulk = false;
    DB._clock = null;
    DB.audit('تهيئة', 'system', null, 'تحميل البيانات التجريبية');
    DB.save();
    return { fails, docs: s.docs.length };
  }

  window.Seed = { run, LOGO };
})();
