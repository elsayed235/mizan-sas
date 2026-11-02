/* الأسعار وعرض الإطلاق — مصدر واحد لكل شاشات الأسعار والدفع (الصفحة التعريفية، التسجيل، الاشتراك، الترقية)
   كل الأسعار بالجنيه وشاملة ضريبة القيمة المضافة 14%. */
(function () {
  // السنوي = 10 أشهر (شهران مجانًا). مدى الحياة دفعة واحدة تشمل أول سنة استضافة ودعم
  const PLANS = {
    starter: { label: 'الأساسية', seats: 2, modules: ['sales', 'purchases', 'finance', 'stock'], prices: { monthly: 149, yearly: 1490, lifetime: 4500 }, desc: 'لورشة أو مصنع صغير يبدأ التنظيم', features: ['مستخدمان', 'المبيعات والمشتريات والخزائن', 'المخزون والجرد', 'التقارير الأساسية'] },
    pro: { label: 'الاحترافية', seats: 6, popular: true, prices: { monthly: 299, yearly: 2990, lifetime: 8900 }, desc: 'لمصنع بفريق كامل', features: ['6 مستخدمين', 'كل ما في الأساسية', 'الورش والمصنعية والعمالة والأجور', 'أدوار وصلاحيات مخصصة', 'كل التقارير والتحليلات'] },
    enterprise: { label: 'المؤسسات', seats: 0, prices: { monthly: 599, yearly: 5990, lifetime: null }, desc: 'لأكثر من مصنع وفرع', features: ['مستخدمون بلا حد', 'كل ما في الاحترافية', 'عدة مخازن وفروع', 'دعم فني مخصص وتدريب'] },
  };
  const LIFETIME_RENEW = 750;

  /* عرض الإطلاق: خصم على أول 12 شهرًا لكل مصنع يشترك قبل نهاية العرض.
     - يُثبَّت للمصنع عند أول دفعة (sub.promo) ويستمر على كل تجديد حتى انتهاء مدته، حتى لو انتهى العرض نفسه.
     - لا يشمل مدى الحياة: سعره دائم ولا نريد خسارة دائمة في الإيراد.
     لتغيير العرض (مثلًا 80% لأول 6 أشهر) عدّل pct و months فقط. */
  const LAUNCH = { on: true, code: 'LAUNCH70', pct: 70, months: 12, ends: '2027-03-31' };

  const addMonths = (iso, n) => {
    const [y, m, d] = iso.split('-').map(Number), t = new Date(Date.UTC(y, m - 1 + n, 1));
    const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
    t.setUTCDate(Math.min(d, last));
    return t.toISOString().slice(0, 10);
  };
  const offerActive = (today) => LAUNCH.on && today <= LAUNCH.ends;
  // هل يستحق المصنع الخصم الآن؟ خصم مثبّت ما زال ساريًا، أو عرض قائم ومصنع لم يدفع قبل ذلك بدون خصم
  const promoFor = (sub, today) => {
    if (sub && sub.promo) return today < sub.promo.until ? sub.promo : null;
    if (!offerActive(today)) return null;
    if (sub && (sub.payments || []).length) return null; // عميل قائم دفع بالسعر الكامل قبل العرض
    return { code: LAUNCH.code, pct: LAUNCH.pct, months: LAUNCH.months, until: addMonths(today, LAUNCH.months) };
  };
  /* سعر الخطة في دورة الدفع: { base, amount, saved, pct, promo } — amount هو ما يُدفع فعلًا (مقرّب لأقرب جنيه) */
  const quote = (plan, cycle, o = {}) => {
    const p = PLANS[plan], base = p && p.prices[cycle];
    if (base == null) return null;
    const promo = cycle === 'lifetime' ? null : promoFor(o.sub, o.today);
    // السنوي يغطي 12 شهرًا: لو العرض أقصر من سنة يُخصم بنسبة مدته فقط
    const pct = !promo ? 0 : cycle === 'yearly' ? Math.round((promo.pct * Math.min(promo.months || 12, 12)) / 12) : promo.pct;
    const amount = Math.round(base * (1 - pct / 100));
    return { base, amount, saved: base - amount, pct, promo };
  };

  window.Pricing = { PLANS, LIFETIME_RENEW, LAUNCH, addMonths, offerActive, promoFor, quote };
})();
