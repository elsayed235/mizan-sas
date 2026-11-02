/* الصفحة التعريفية العامة (قبل تسجيل الدخول): المميزات، الخطوات، الأسعار — بنفس هوية التطبيق */
(function () {
  const FEATURES = [
    ['receipt', 'المبيعات والعملاء', 'فواتير ومرتجعات وتحصيلات، وكشف حساب لكل عميل يتحدث لحظيًا.', '#168a4c'],
    ['cart', 'المشتريات والموردين', 'فواتير الموردين ومستحقاتهم ومواعيد السداد في مكان واحد.', '#3b7cf0'],
    ['bank', 'الخزائن والبنوك', 'كل جنيه يدخل أو يخرج بسند، ورصيد كل خزينة وحساب بنكي أمامك.', '#0ea5c6'],
    ['boxes', 'المخزون والجرد', 'أرصدة لكل مخزن بمتوسط تكلفة مرجح، وتنبيه عند الوصول لحد الطلب.', '#ee8a3c'],
    ['factory', 'المصنعية الخارجية', 'صرف الخامات للورش، استلام الإنتاج، ومطابقة الفاقد بالكيلو.', '#8b5cf6'],
    ['user', 'العمالة والأجور', 'يوميات الإنتاج ومسيرات الأجور بالقطعة أو الساعة أو الشهر.', '#e5484d'],
    ['shirt', 'الموديلات والرسم', 'ملف لكل موديل بخاماته وتكلفة رسمه وبرمجته على الماكينات.', '#c99a3b'],
    ['chart', 'التقارير والتحليلات', 'أرباح وخسائر، أعمار الديون، التدفقات النقدية، ومقارنة السنوات.', '#168a4c'],
    ['shield', 'الفريق والصلاحيات', 'أدوار مخصصة لكل فرد، دعوات آمنة، وسجل لكل تعديل ومن قام به.', '#3b7cf0'],
  ];
  const TRUST = [
    ['scale', 'أرصدة محسوبة لا مكتوبة', 'كل رصيد يُحسب من المستندات المعتمدة نفسها — لا مجال لرقم يدوي خاطئ.'],
    ['history', 'لا شيء يُمسح', 'الإلغاء بقيود عكسية موثقة بالسبب، والمستند الأصلي يبقى للتاريخ.'],
    ['calendar', 'فحص في تاريخ كل حركة', 'لا تُباع بضاعة ولا يُصرف مبلغ لم يكن موجودًا في تاريخ المستند.'],
  ];
  const STEPS = [['أنشئ حساب مصنعك', 'دقيقة واحدة — بياناتك التجريبية جاهزة لتستكشف'], ['ادعُ فريقك', 'حدد دور كل فرد وما يراه وما يعدّله'], ['ابدأ التسجيل', 'فواتير، مخزون، ورش، وأجور — والتقارير تُبنى وحدها']];

  let lp = null;
  const prices = (cycle) => Object.keys(Auth.PLANS).map((k) => Auth.planCard(k, cycle, `<button class="btn ${Auth.PLANS[k].popular ? 'primary' : ''}" data-act="lp-auth" data-v="signup" data-plan="${k}" data-cycle="${cycle}">ابدأ مع ${Auth.PLANS[k].label}</button>`)).join('');
  const reveal = (root) => {
    if (!('IntersectionObserver' in window)) { root.querySelectorAll('.rv').forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root, threshold: 0.15 });
    root.querySelectorAll('.rv').forEach((e) => io.observe(e));
  };
  // معاينة مصغرة للوحة التحكم مبنية بالكود (بدون صور)
  // المعاينة في المنتصف، والأقسام مثبتة على حافتيها بتماثل وتومض بالتتابع كأنها تتزامن معها
  const NODES = [['receipt', 'المبيعات'], ['boxes', 'المخزون'], ['factory', 'الورش'], ['bank', 'الخزائن']];
  const stage = () => `<div class="lp-stage"><div class="lp-glow"></div>
      <svg class="lp-orbit" viewBox="0 0 400 400" aria-hidden="true"><circle cx="200" cy="200" r="196"/><circle cx="200" cy="200" r="150" class="o2"/><circle cx="200" cy="4" r="3" class="o-dot"/></svg>
      <div class="lp-mockwrap">${mock()}
        ${NODES.map(([ic, l], i) => `<span class="lp-node n${i}" style="--d:${i * 0.8}s;--p:${i}"><span class="lp-ni">${icon(ic)}</span><b>${l}</b></span>`).join('')}
        <div class="lp-team"><span class="lp-av" style="--c:#3b7cf0">أ</span><span class="lp-av" style="--c:#ee8a3c">م</span><span class="lp-av" style="--c:#8b5cf6">ك</span><span class="lp-online"><i></i>3 متصلين الآن</span></div></div></div>`;
  const mock = () => `<div class="lp-mock rv"><div class="lm-top"><i></i><i></i><i></i><span></span></div>
    <div class="lm-body"><div class="lm-side"><b></b><b class="on"></b><b></b><b></b><b></b></div>
      <div class="lm-main"><div class="lm-kpis">${[['صافي المبيعات', '4.75M', '21.7%'], ['التحصيلات', '4.55M', '21.2%'], ['صافي الربح', '2.09M', '77.7%']].map(([l, v, t]) => `<div class="lm-kpi"><span>${l}</span><b class="num">${v}</b><em>${icon('arrowUp')}${t}</em></div>`).join('')}</div>
        <div class="lm-chart"><svg viewBox="0 0 300 90" preserveAspectRatio="none"><defs><linearGradient id="lmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".22"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs><path d="M0,70 C30,60 45,66 70,52 C95,38 110,58 140,46 C170,34 185,16 215,24 C245,32 265,12 300,8 L300,90 L0,90Z" fill="url(#lmg)"/><path class="lm-line" d="M0,70 C30,60 45,66 70,52 C95,38 110,58 140,46 C170,34 185,16 215,24 C245,32 265,12 300,8" fill="none" stroke="var(--primary)" stroke-width="2.4" stroke-linecap="round" pathLength="1"/></svg></div>
        <div class="lm-rows">${[70, 55, 85].map((w) => `<div><i></i><b style="width:${w}%"></b><span></span></div>`).join('')}</div></div></div>
    <div class="lm-float rv"><span class="lm-fi">${icon('checkCircle')}</span><span><b>تم اعتماد الفاتورة</b><small class="num">INV-2026-0051 · 23,130.00</small></span></div></div>`;

  window.Landing = {
    show() {
      document.body.classList.add('auth-mode');
      if (lp) return;
      const P = Auth.PLANS, L = Auth.LAUNCH, offer = Pricing.offerActive(U.today());
      lp = document.createElement('div');
      lp.className = 'lp';
      lp.innerHTML = `<header class="lp-nav"><div class="lp-wrap"><a class="lp-logo" href="#" data-act="lp-top"><img src="${Brand.LOGO}" alt=""><b>ميزان ERP</b></a>
          <nav class="lp-links"><a href="#" data-act="lp-to" data-t="features">المميزات</a><a href="#" data-act="lp-to" data-t="how">كيف يعمل</a><a href="#" data-act="lp-to" data-t="pricing">الأسعار</a></nav>
          <span class="grow"></span><button class="btn ghost sm lang-btn" data-act="lang" data-no-tr>${I18N.en ? 'عربي' : 'EN'}</button><button class="btn ghost sm icon" data-act="auth-theme" title="الوضع الليلي">${icon(Look.theme() === 'dark' ? 'sun' : 'moon')}</button>
          <button class="btn sm lp-login" data-act="lp-auth" data-v="login">تسجيل الدخول</button><button class="btn primary sm" data-act="lp-auth" data-v="signup">ابدأ مجانًا</button></div></header>
        <section class="lp-hero"><div class="lp-wrap lp-hero-in">
          <div class="lp-hero-txt">${offer ? `<button type="button" class="lp-offer rv" data-act="lp-to" data-t="pricing"><b>${icon('sparkle')} عرض الإطلاق</b><span>خصم ${L.pct}% على أول ${L.months === 12 ? 'سنة' : L.months + ' أشهر'} — حتى ${U.date(L.ends)}</span>${icon('chevLeft')}</button>` : `<span class="ap-badge rv">${icon('sparkle')} نظام ERP مصمم خصيصًا لمصانع التريكو</span>`}
            <h1 class="rv">أدِر مصنعك كله<br><span>من شاشة واحدة</span></h1>
            <p class="rv">من صرف الخيط للورشة حتى تحصيل الفاتورة — مبيعات ومخازن وورش وعمالة وخزائن، بأرقام دقيقة محسوبة من كل حركة.</p>
            <div class="lp-cta rv"><button class="btn primary" data-act="lp-auth" data-v="signup">ابدأ تجربتك المجانية ${icon('chevLeft')}</button><button class="btn" data-act="lp-auth" data-v="login">لدي حساب بالفعل</button></div>
            <div class="lp-trust rv"><span>${icon('check')} 14 يومًا مجانًا</span><span>${icon('check')} بدون بطاقة دفع</span><span>${icon('check')} عربي وإنجليزي</span></div></div>
          ${stage()}</div></section>
        ${LandingBento.html()}
        <section class="lp-sec" id="lp-features"><div class="lp-wrap"><div class="lp-head rv"><span class="lp-eyebrow">المميزات</span><h2>كل أقسام المصنع مترابطة</h2><p>كل مستند يؤثر تلقائيًا في المخزون والحسابات والتقارير — بدون إدخال مكرر.</p></div>
          <div class="lp-feats">${FEATURES.map(([ic, t, d, c], i) => `<div class="lp-feat rv" style="--fc:${c};transition-delay:${(i % 3) * 0.06}s"><span class="lp-fi">${icon(ic)}</span><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></div></section>
        <section class="lp-sec lp-trust-sec"><div class="lp-wrap"><div class="lp-band rv"><div class="lp-head"><span class="lp-eyebrow">دقة الأرقام</span><h2>حسابات لا تقبل الخطأ</h2></div>
          <div class="lp-trusts">${TRUST.map(([ic, t, d]) => `<div class="lp-tr"><span>${icon(ic)}</span><div><b>${t}</b><p>${d}</p></div></div>`).join('')}</div></div></div></section>
        <section class="lp-sec" id="lp-how"><div class="lp-wrap"><div class="lp-head rv"><span class="lp-eyebrow">كيف يعمل</span><h2>تبدأ في ثلاث خطوات</h2></div>
          <div class="lp-steps">${STEPS.map(([t, d], i) => `<div class="lp-step rv" style="transition-delay:${i * 0.08}s"><span class="lp-sn num">${i + 1}</span><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></div></section>
        <section class="lp-sec" id="lp-pricing"><div class="lp-wrap"><div class="lp-head rv"><span class="lp-eyebrow">الأسعار</span><h2>خطة تناسب حجم مصنعك</h2><p>كل الخطط تبدأ بتجربة مجانية 14 يومًا، ويمكنك التغيير في أي وقت.</p></div>
          ${offer ? `<div class="lp-offer-band rv"><span class="lob-pct num">${L.pct}%</span><div class="grow"><b>عرض الإطلاق: خصم ${L.pct}% على أول ${L.months === 12 ? 'سنة' : L.months + ' أشهر'}</b><p>اشترك قبل ${U.date(L.ends)} وسعرك المخفّض يفضل ثابت طول مدة العرض — حتى لو انتهى العرض. التجربة المجانية 14 يومًا كما هي.</p></div></div>` : ''}
          <div class="pr-wrap rv">${Auth.cycleSwitch('monthly', 'lp-cycle')}<div class="pr-grid" id="lp-prices">${prices('monthly')}</div>
          <p class="pr-fine">${icon('info')} كل الخطط تبدأ بتجربة مجانية 14 يومًا بدون بطاقة — والبيانات تنتقل معك عند الترقية.</p></div></div></div></section>
        <section class="lp-sec"><div class="lp-wrap"><div class="lp-final rv"><div class="aa-rings"></div><h2>جاهز تنظّم مصنعك؟</h2><p>أنشئ حسابك الآن وجرّب البرنامج ببيانات تجريبية كاملة.</p><button class="btn" data-act="lp-auth" data-v="signup">ابدأ مجانًا ${icon('chevLeft')}</button></div></div></section>
        <footer class="lp-foot"><div class="lp-wrap"><span class="lp-logo"><img src="${Brand.LOGO}" alt=""><b>ميزان ERP</b></span><span class="grow"></span><span class="muted small">© ${new Date().getFullYear()} ميزان ERP · <span>نظام إدارة مصانع التريكو</span></span></div></footer>`;
      document.body.appendChild(lp);
      if (I18N.en) I18N.translate(lp);
      LandingBento.mount(lp);
      reveal(lp);
      const hero = lp.querySelector('.lp-hero-in');
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
      let ticking = false;
      lp.addEventListener('scroll', () => {
        lp.classList.toggle('scrolled', lp.scrollTop > 10);
        if (still || ticking) return;
        ticking = true;
        requestAnimationFrame(() => { ticking = false; const v = Math.min(1, lp.scrollTop / (hero.offsetHeight || 1)); hero.style.setProperty('--hp', v.toFixed(3)); });
      }, { passive: true });
    },
    hide() { if (!lp) return; const el = lp; lp = null; el.classList.add('out'); setTimeout(() => el.remove(), 350); },
  };
  UI.acts['lp-to'] = (el) => { const t = document.getElementById('lp-' + el.dataset.t); if (t) lp.scrollTo({ top: t.offsetTop - 70, behavior: 'smooth' }); };
  UI.acts['lp-top'] = () => lp && lp.scrollTo({ top: 0, behavior: 'smooth' });
  UI.acts['lp-auth'] = (el) => { Landing.hide(); Auth.show(el.dataset.v, el.dataset.plan ? { plan: el.dataset.plan, cycle: el.dataset.cycle } : {}); };
  UI.acts['lp-cycle'] = (el) => {
    el.parentElement.querySelectorAll('.btn').forEach((b) => b.classList.toggle('on', b === el));
    const g = lp.querySelector('#lp-prices');
    g.innerHTML = prices(el.dataset.v);
    if (I18N.en) I18N.translate(g);
  };
})();
