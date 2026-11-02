/* الجولة التعريفية (How to use): إضاءة على عنصر حقيقي في الواجهة + بطاقة شرح، بنفس أسلوب تطبيقات الموبايل
   تبدأ تلقائيًا أول دخول لكل مستخدم، ويمكن إعادتها من قائمة المستخدم أو البحث الشامل. */
(function () {
  const esc = (s) => U.esc(s);
  const mobile = () => matchMedia('(max-width: 640px)').matches;
  const visible = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && getComputedStyle(el).visibility !== 'hidden'; };
  const pick = (...sels) => { for (const s of sels) { const el = document.querySelector(s); if (visible(el)) return el; } return null; };
  const K = () => (U.isMac ? '⌘' : 'Ctrl');

  // كل خطوة: الصفحة (اختياري) + العنصر + الشرح. الخطوات التي لا يملك المستخدم صلاحيتها تُتخطى تلقائيًا
  const STEPS = [
    { center: true, hero: true, icon: 'sparkle', title: 'أهلًا بك في ميزان', text: 'جولة سريعة (دقيقة واحدة) تعرّفك على أهم ما في البرنامج — يمكنك تخطيها والعودة إليها في أي وقت من قائمة حسابك.' },
    { route: '#/', target: () => pick('#nav', '.tabbar', '.tb-menu'), icon: 'list', title: 'كل أقسام المصنع في مكان واحد', text: () => (mobile() ? 'الشريط السفلي يوصلك للرئيسية والمبيعات والتقارير، و"القائمة" تفتح كل الأقسام.' : 'الأقسام مرتبة حسب شغل المصنع: التجارة، المالية، الإنتاج والمخزون. كل فئة تفتح على صفحاتها، وتظهر لك فقط الأقسام المسموح لك بها.') },
    { target: () => pick('.side-search', '.topbar [data-act="palette"]'), icon: 'search', title: 'ابحث عن أي شيء', text: () => `اكتب اسم عميل أو صنف أو رقم فاتورة — أو أمرًا مثل "فاتورة بيع جديدة". الاختصار: ${K()}+K من أي شاشة.` },
    { target: () => pick('.tb-new', '.tb-fab'), perm: 'any-create', icon: 'plus', title: 'إنشاء أي مستند بسرعة', text: 'فاتورة بيع أو شراء، تحصيل، صرف، مصروف، صرف خامات لورشة… كلها من هنا. وكل نوع له اختصار كيبورد يظهر بجانبه.' },
    { route: '#/', target: () => pick('.hero-side', '.hero-photo'), perm: 'view', icon: 'calendar', title: 'اختر الفترة', text: 'غيّر الفترة (هذا الشهر، الربع، السنة أو تاريخ مخصص) وكل الأرقام والرسوم في لوحة التحكم تتحدث فورًا.' },
    { target: () => pick('.quick'), perm: 'view', icon: 'zap', title: 'عمليات يومك بضغطة', text: 'أكثر المستندات استخدامًا في اختصار واحد — مرّر على أي زر لترى اختصار الكيبورد الخاص به.' },
    { target: () => pick('.kpi-main'), perm: 'reports', icon: 'chart', title: 'مؤشرات مقارنة بالعام الماضي', text: 'صافي المبيعات والتحصيلات والمصروفات والربح، مع نسبة التغير عن نفس الفترة من السنة الماضية. اضغط أي بطاقة لتفتح تقريرها التفصيلي.' },
    { target: () => pick('.dash-grid .card.c-8', '.dash-grid'), perm: 'reports', icon: 'trend', title: 'رسوم تفاعلية', text: 'مرّر على الرسم لترى أرقام كل شهر، وتوزيع التكاليف، وآخر العمليات وأفضل العملاء.' },
    { route: '#/sales', target: () => pick('.card.fill .tbl-tools', '.card.fill', '.page-h'), perm: 'view_sales', icon: 'receipt', title: 'قوائم المستندات', text: 'ابحث بالضغط على "/"، صفِّ حسب الحالة والسنة، وصدّر أي قائمة إلى Excel. المسودة لا تؤثر في الأرصدة حتى تعتمدها.' },
    { route: '#/new/SI', target: () => pick('.doc-head', '.page-h'), perm: 'sales', icon: 'edit', title: 'إدخال سريع بالكيبورد', text: () => `اكتب أول حروف العميل أو الصنف واختر بالأسهم، وEnter ينقلك للحقل التالي. ${K()}+S حفظ كمسودة، و${K()}+Enter اعتماد.` },
    { route: '#/reports', target: () => pick('.content .grid', '.page-h'), perm: 'reports', icon: 'pie', title: 'تقارير جاهزة', text: 'أرباح وخسائر، أعمار ديون، تدفقات نقدية، حركة المخزون والورش — وكل رقم يفتح المستند الأصلي الذي جاء منه.' },
    { route: '#/import', target: () => pick('.im-kinds', '.page-h'), icon: 'upload', title: 'انقل بياناتك من Excel', text: 'استورد الأصناف والعملاء والموردين والأرصدة الافتتاحية من Excel أو برنامجك القديم، مع مراجعة قبل الحفظ وإمكانية التراجع.' },
    { route: '#/settings/roles', target: () => pick('.roles-edit', '.roles-layout'), perm: 'settings', icon: 'shield', title: 'فريقك وصلاحياته', text: 'ادعُ فريقك وحدد لكل دور ما يراه وما يعدّله في كل قسم — والنظام يطبقها على كل شاشة وكل عملية.' },
    { route: '#/', target: () => pick('#user-btn', '.tabbar button[data-act="nav-toggle"]'), icon: 'user', title: 'حسابك', text: 'من هنا: المظهر والألوان، تغيير كلمة المرور، قفل الشاشة، وتسجيل الخروج — ويمكنك إعادة هذه الجولة في أي وقت.' },
    { center: true, done: true, icon: 'check', title: 'أنت جاهز!', text: 'ابدأ بإضافة عملائك وأصنافك أو استوردها من Excel، ثم سجّل أول فاتورة. بالتوفيق في شغلك 👋' },
  ];
  const allowed = (s) => !s.perm || (s.perm === 'any-create' ? !!document.querySelector('[data-act="quick-new"]:not([hidden])') : E.can(s.perm)) && (!s.route || App.canRoute(s.route.replace(/^#\/?/, '').split(/[/?]/)[0]));

  let st = null;
  const Tour = {
    start(from = 0) {
      if (st) return;
      UI.closePop();
      const steps = STEPS.filter(allowed);
      st = { steps, i: from, home: location.hash || '#/' };
      const el = document.createElement('div');
      el.className = 'tour';
      el.innerHTML = '<div class="tour-spot"></div><div class="tour-tip" role="dialog" aria-live="polite"></div>';
      document.body.appendChild(el);
      st.el = el;
      requestAnimationFrame(() => el.classList.add('on'));
      st.onKey = (e) => {
        const rtl = document.documentElement.dir !== 'ltr';
        if (e.key === 'Escape') Tour.end(true);
        else if (e.key === 'Enter' || e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) Tour.go(st.i + 1);
        else if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) Tour.go(st.i - 1);
        else return;
        e.preventDefault(); e.stopPropagation();
      };
      st.onMove = () => st && place(false);
      document.addEventListener('keydown', st.onKey, true);
      addEventListener('resize', st.onMove);
      document.getElementById('view') && document.getElementById('view').addEventListener('scroll', st.onMove, { passive: true });
      Tour.go(from);
    },
    async go(i) {
      if (!st) return;
      if (i < 0) return;
      if (i >= st.steps.length) return Tour.end(false);
      const s = st.steps[i], dir = i >= st.i ? 1 : -1;
      st.i = i;
      st.el.classList.add('moving');
      if (s.route && location.hash !== s.route) {
        App.dirty = false;
        location.hash = s.route;
        await waitFor(() => App.current && App.current.hash === s.route, 1500);
        await wait(350);
      }
      let target = null;
      if (!s.center) {
        target = await waitFor(() => s.target(), 1200);
        if (!target) return Tour.go(dir > 0 ? i + 1 : Math.max(1, i - 1)); // العنصر غير موجود في هذه الشاشة: نتخطاه
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        await wait(320);
      }
      st.target = target;
      render(s);
      place(true);
      st.el.classList.remove('moving');
    },
    end(skipped) {
      if (!st) return;
      const u = E.user();
      if (u && !u.tourDone) { u.tourDone = new Date().toISOString(); DB.save(); }
      document.removeEventListener('keydown', st.onKey, true);
      removeEventListener('resize', st.onMove);
      const el = st.el, home = st.home;
      st = null;
      el.classList.remove('on');
      setTimeout(() => el.remove(), 350);
      if (!skipped && location.hash !== '#/') location.hash = '#/';
      else if (skipped && /#\/new\//.test(location.hash)) location.hash = home && !/#\/new\//.test(home) ? home : '#/';
    },
    active: () => !!st,
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function waitFor(fn, ms) { const t0 = performance.now(); let v; while (!(v = fn()) && performance.now() - t0 < ms) await wait(60); return v || null; }

  function render(s) {
    const n = st.steps.length, i = st.i;
    const text = typeof s.text === 'function' ? s.text() : s.text;
    const tip = st.el.querySelector('.tour-tip');
    tip.className = 'tour-tip' + (s.center ? ' center' : '') + (s.hero ? ' hero' : '') + (s.done ? ' done' : '');
    tip.innerHTML = `${s.center ? `<div class="tt-art"><span class="tt-ring"></span><span class="tt-ico">${icon(s.icon)}</span></div>` : `<div class="tt-head"><span class="tt-ico sm">${icon(s.icon)}</span><span class="tt-count num">${i} / ${n - 2}</span><button class="tt-x" data-tour="skip" aria-label="إغلاق">${icon('x')}</button></div>`}
      <h3>${esc(s.title)}</h3><p>${esc(text)}</p>
      ${!s.center ? `<div class="tt-dots">${st.steps.slice(1, -1).map((_, j) => `<i class="${j + 1 === i ? 'on' : j + 1 < i ? 'done' : ''}"></i>`).join('')}</div>` : ''}
      <div class="tt-btns">${s.hero ? `<button class="btn ghost" data-tour="skip">لاحقًا</button><button class="btn primary" data-tour="next">ابدأ الجولة ${icon('chevLeft')}</button>`
        : s.done ? `<button class="btn ghost" data-tour="restart">${icon('undo')} إعادة الجولة</button><button class="btn primary" data-tour="finish">ابدأ العمل ${icon('chevLeft')}</button>`
        : `<button class="btn ghost sm" data-tour="skip">تخطي</button><span class="grow"></span>${i > 1 ? `<button class="btn sm" data-tour="prev">${icon('chevRight')} السابق</button>` : ''}<button class="btn primary sm" data-tour="next">${i === n - 2 ? 'إنهاء' : 'التالي'} ${icon('chevLeft')}</button>`}</div>`;
    if (I18N.en) I18N.translate(tip);
    tip.onclick = (e) => {
      const b = e.target.closest('[data-tour]');
      if (!b) return;
      const a = b.dataset.tour;
      if (a === 'next') Tour.go(st.i + 1); else if (a === 'prev') Tour.go(st.i - 1); else if (a === 'skip') Tour.end(true);
      else if (a === 'finish') Tour.end(false); else if (a === 'restart') Tour.go(1);
    };
  }

  // موضع الإضاءة والبطاقة: تحت العنصر أو فوقه أو بجانبه — وعلى الموبايل البطاقة لوح سفلي
  function place() {
    if (!st) return;
    const spot = st.el.querySelector('.tour-spot'), tip = st.el.querySelector('.tour-tip');
    const s = st.steps[st.i];
    if (s.center || !st.target) {
      st.el.classList.add('dim');
      Object.assign(spot.style, { left: innerWidth / 2 + 'px', top: innerHeight / 2 + 'px', width: '0px', height: '0px' });
      Object.assign(tip.style, { left: '', top: '', right: '', bottom: '' });
      tip.removeAttribute('data-side');
      return;
    }
    st.el.classList.remove('dim');
    const r = st.target.getBoundingClientRect(), pad = 8, z = 1;
    const R = { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
    const rad = Math.min(24, parseFloat(getComputedStyle(st.target).borderRadius) + 6 || 16);
    Object.assign(spot.style, { left: R.x + 'px', top: R.y + 'px', width: R.w + 'px', height: R.h + 'px', borderRadius: rad + 'px' });
    if (mobile()) {
      const low = R.y + R.h / 2 > innerHeight * 0.55;
      tip.setAttribute('data-side', low ? 'sheet-top' : 'sheet');
      Object.assign(tip.style, { left: '12px', right: '12px', top: low ? '14px' : '', bottom: low ? '' : '14px' });
      return;
    }
    tip.style.right = ''; tip.style.bottom = '';
    const tw = tip.offsetWidth * z, th = tip.offsetHeight * z, gap = 16;
    let side = R.y + R.h + gap + th < innerHeight - 10 ? 'bottom' : R.y - gap - th > 10 ? 'top' : 'side';
    let x, y;
    if (side === 'side') {
      // العنصر طويل (مثل القائمة الجانبية): البطاقة بجانبه
      const rtl = document.documentElement.dir !== 'ltr';
      const leftRoom = R.x, rightRoom = innerWidth - R.x - R.w;
      const toLeft = rtl ? leftRoom > tw + gap : !(rightRoom > tw + gap);
      x = toLeft ? R.x - gap - tw : R.x + R.w + gap;
      y = Math.min(Math.max(10, R.y + R.h / 2 - th / 2), innerHeight - th - 10);
      side = toLeft ? 'left' : 'right';
    } else {
      x = Math.min(Math.max(12, R.x + R.w / 2 - tw / 2), innerWidth - tw - 12);
      y = side === 'bottom' ? R.y + R.h + gap : R.y - gap - th;
    }
    tip.setAttribute('data-side', side);
    tip.style.setProperty('--ax', Math.min(Math.max(24, R.x + R.w / 2 - x), tw - 24) / z + 'px');
    tip.style.left = x / z + 'px';
    tip.style.top = y / z + 'px';
  }

  UI.acts['tour'] = () => Tour.start(0);
  window.Tour = Tour;
})();
