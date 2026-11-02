/* رسومات "داخل ميزان" في الصفحة التعريفية — نسخة بلا React من مكوّن ink-orbit-features
   ثلاثة رسوم حية: فريق المصنع ← ميزان ← تقارير تُطبع باستمرار، أقسام تتزامن واحدًا تلو الآخر، ورسم مبيعات تمرّر عليه */
(function () {
  const esc = (s) => U.esc(s);
  const COPY = {
    tag: 'داخل ميزان',
    title: ['كل حركة في المصنع', '*تصنع تقريرها بنفسها*'],
    team: ['فريقك على نفس الشاشة', 'المحاسب وأمين المخزن ومسؤول الإنتاج يعملون معًا لحظيًا، وكل واحد يرى ما يخصه فقط.'],
    reports: ['تقارير تُبنى وحدها', 'كل مستند معتمد يحدّث الأرباح والمخزون وكشوف الحساب فورًا — بدون إكسل ولا إدخال مكرر.'],
    hub: ['أقسام مترابطة', 'فاتورة بيع واحدة تُخصم من المخزن وتُضاف لحساب العميل وتدخل الخزينة — تلقائيًا.'],
    tools: [['المبيعات', 'receipt'], ['المخزون', 'boxes'], ['الخزائن', 'bank'], ['الورش', 'factory']],
    chart: ['تحليلات لحظية', 'مرّر على الرسم لترى مبيعات كل شهر ونسبة نموها عن بداية السنة.'],
    values: [182, 205, 196, 238, 229, 274, 262, 301, 296, 342, 371, 418],
  };
  const TEAM = [
    { x: 58, y: 38, n: 'أحمد', t: 'أحمد · يعتمد فاتورة', c: '#3b7cf0' },
    { x: 104, y: 22, n: 'محمود', t: 'محمود · جرد المخزن', c: '#ee8a3c' },
    { x: 150, y: 40, n: 'كريم', t: 'كريم · استلام إنتاج', c: '#8b5cf6' },
    { x: 46, y: 92, n: 'سارة', t: 'سارة · تراجع التقارير', c: '#e5484d' },
    { x: 146, y: 114, n: 'المدير', t: 'المدير · غير متصل', c: '#64748b', off: true },
  ];
  const rtl = () => document.documentElement.dir !== 'ltr';
  const title = (lines) => lines.map((l) => `<span>${l.replace(/\*([^*]+)\*/g, '<em>$1</em>')}</span>`).join('');
  const brackets = '<i class="bx-c tl"></i><i class="bx-c tr"></i><i class="bx-c bl"></i><i class="bx-c br"></i>';
  const svgIcon = (name, x, y, s) => icon(name).replace('<svg ', `<svg x="${x}" y="${y}" width="${s}" height="${s}" `);

  /* البطاقة العريضة: الفريق ← ميزان ← التقارير (تنعكس مع اتجاه اللغة) */
  function flowCard() {
    const W = 640, r = rtl();
    const X = (x) => (r ? W - x : x);
    const RX = (x, w) => (r ? W - x - w : x);
    const path = (pts) => 'M' + pts.map(([x, y], i) => (i === 1 ? 'C' : '') + X(x) + ',' + y).join(' ');
    const L1 = path([[117, 67], [196, 67], [210, 100], [262, 100]]), L2 = path([[117, 73], [186, 73], [206, 120], [262, 120]]);
    const R1 = path([[378, 100], [412, 100], [418, 86], [450, 86]]), R2 = path([[378, 120], [412, 120], [418, 134], [450, 134]]);
    const rays = [-62, -38, -14, 14, 38, 62].map((a) => { const p = (d) => [320 + Math.sin((d * Math.PI) / 180) * 260, 110 - Math.cos((d * Math.PI) / 180) * 260]; const [x1, y1] = p(a), [x2, y2] = p(a + 7); return `<path d="M320,110 L${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}Z" fill="url(#bxRays)" opacity=".5"/>`; }).join('');
    const team = TEAM.map((m, i) => `<line x1="${X(m.x)}" y1="${m.y}" x2="${X(104)}" y2="70" class="bx-dot-line"/>`).join('') +
      `<g transform="translate(${RX(91, 26)},57)"><rect width="26" height="26" rx="7" class="bx-node"/><image href="${Brand.LOGO}" x="4" y="4" width="18" height="18"/></g>` +
      TEAM.map((m) => `<g class="bx-av" tabindex="0" role="img" aria-label="${esc(m.t)}"><circle cx="${X(m.x)}" cy="${m.y}" r="11" fill="${m.c}" opacity="${m.off ? 0.55 : 1}"/><circle cx="${X(m.x)}" cy="${m.y}" r="10.5" fill="none" stroke="var(--surface)" stroke-width="1.5"/>
        <text x="${X(m.x)}" y="${m.y + 3.5}" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">${esc(m.n.slice(0, 1))}</text>
        <circle cx="${X(m.x + 8)}" cy="${m.y + 8}" r="2.8" fill="${m.off ? 'var(--text-3)' : '#22c55e'}" stroke="var(--surface)" class="${m.off ? '' : 'bx-presence'}"/>
        <g class="bx-tip" transform="translate(${X(m.x)},${m.y - 19})"><rect x="${-m.t.length * 2.6 - 7}" y="-9" width="${m.t.length * 5.2 + 14}" height="15" rx="5" fill="var(--ink)"/><text x="0" y="2" text-anchor="middle" font-size="7.5" fill="var(--ink-text)">${esc(m.t)}</text></g></g>`).join('');
    const flows = [L1, L2, R1, R2].map((d, i) => `<path d="${d}" class="bx-flow ${i % 2 ? 'bx-dash' : ''}" data-side="${i < 2 ? 'team' : 'rep'}"/>`).join('');
    const pkts = [L1, L2, R1, R2].map((d, i) => `<circle r="2.4" class="bx-pkt"><animateMotion dur="${2.2 + (i % 2) * 0.6}s" begin="${i * 0.35}s" repeatCount="indefinite" path="${d}"/></circle>`).join('');
    const hub = `<g transform="translate(262,88)"><rect x="-4" y="-4" width="124" height="52" rx="12" fill="none" stroke="var(--primary)" stroke-opacity=".35" class="bx-glow"/>
      <rect width="116" height="44" rx="10" class="bx-node bx-hub"/><image href="${Brand.LOGO}" x="${r ? 87 : 13}" y="13" width="18" height="18"/>
      <text x="${r ? 80 : 36}" y="27" text-anchor="${r ? 'end' : 'start'}" font-size="10" font-weight="800" fill="var(--text)">${I18N.en ? 'MIZAN' : 'ميزان'}</text>
      <path d="${r ? 'M16 18l-4 4 4 4' : 'M100 18l4 4-4 4'}" fill="none" stroke="var(--primary)" stroke-width="1.5"/></g>`;
    return `<div class="bx-frame bx-wide">${brackets}<div class="bx-card bx-flowcard">
      <svg class="bx-svg" viewBox="0 0 ${W} 178" direction="ltr" role="img" aria-label="${esc(COPY.team[0])}"><defs>
        <radialGradient id="bxGlow" cx="320" cy="110" r="190" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--primary)" stop-opacity=".1"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></radialGradient>
        <linearGradient id="bxRays" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".18"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
        <rect width="${W}" height="178" fill="url(#bxGlow)"/>${rays}
        <g class="bx-side" data-side="team"><rect x="${RX(20, 170)}" y="8" width="170" height="130" fill="transparent"/>${team}</g>
        ${flows}${pkts}${hub}
        <g class="bx-side bx-stack" data-side="rep" data-x0="${r ? 52 : 450}" data-dir="${r ? -1 : 1}"></g>
      </svg>
      <div class="bx-copy2"><div><h3>${COPY.team[0]}</h3><p>${COPY.team[1]}</p></div><div><h3>${COPY.reports[0]}</h3><p>${COPY.reports[1]}</p></div></div></div></div>`;
  }
  // رزمة التقارير: كل ورقة جديدة تهبط فوق السابقة
  function sheets(g, n) {
    const x0 = +g.dataset.x0, dir = +g.dataset.dir, r = dir < 0;
    g.innerHTML = [2, 1, 0].map((k) => `<g transform="translate(${x0 + dir * k * 12},${40 - k * 10})" opacity="${1 - k * 0.25}"><g class="${k === 0 ? 'bx-sheet-new' : ''}">
      <rect width="138" height="102" rx="6" fill="var(--surface)" stroke="var(--border-strong)"/>
      ${k === 0 ? `<text x="${r ? 128 : 10}" y="17" text-anchor="${r ? 'end' : 'start'}" font-size="7.5" fill="var(--text-3)" font-weight="600">${I18N.en ? 'SALES REPORT' : 'تقرير المبيعات'} #${n}</text>
        <rect x="${r ? 64 : 10}" y="24" width="64" height="5" rx="2" fill="var(--text)" opacity=".75"/><rect x="${r ? 36 : 10}" y="33" width="92" height="3" rx="1.5" fill="var(--border-strong)"/><rect x="${r ? 48 : 10}" y="39" width="80" height="3" rx="1.5" fill="var(--border-strong)"/>
        ${[18, 26, 14, 30, 22, 34].map((h, j) => `<rect x="${(r ? 60 : 12) + j * 12}" y="${92 - h}" width="8" height="${h}" rx="2" fill="var(--primary)" opacity="${0.3 + j * 0.12}"/>`).join('')}
        <path d="${r ? 'M12 64h34M12 72h28M12 80h32' : 'M92 64h34M92 72h28M92 80h32'}" stroke="var(--border-strong)" stroke-width="2.5" stroke-linecap="round"/>` : ''}</g></g>`).join('');
  }

  /* أقسام مترابطة: ميزان في المنتصف وكل قسم يتزامن بدوره */
  const tiles = [{ x: 66, y: 34 }, { x: 66, y: 116 }, { x: 234, y: 34 }, { x: 234, y: 116 }];
  const tPath = (i) => { const t = tiles[i], d = t.x < 150 ? -1 : 1; return `M${150 + d * 17},75 H${150 + d * 42} V${t.y} H${t.x - d * 15}`; };
  function hubCard() {
    return `<div class="bx-frame">${brackets}<div class="bx-card"><svg class="bx-svg bx-hubsvg" viewBox="0 0 300 150" direction="ltr" role="group" aria-label="${esc(COPY.hub[0])}">
      ${tiles.map((_, i) => `<path d="${tPath(i)}" class="bx-flow" data-i="${i}"/>`).join('')}<g class="bx-hubpkt"></g>
      <g transform="translate(133,58)"><rect width="34" height="34" rx="10" class="bx-node bx-hub"/><image href="${Brand.LOGO}" x="7" y="7" width="20" height="20"/></g>
      ${tiles.map((t, i) => `<g class="bx-tool" data-i="${i}" tabindex="0" role="img" aria-label="${esc(COPY.tools[i][0])}"><rect x="${t.x - 15}" y="${t.y - 15}" width="30" height="30" rx="9" class="bx-node"/>${svgIcon(COPY.tools[i][1], t.x - 8, t.y - 8, 16)}
        <text x="${t.x}" y="${t.y + (t.y < 75 ? -21 : 29)}" text-anchor="middle" font-size="8.5" font-weight="700" class="bx-tl">${COPY.tools[i][0]}</text></g>`).join('')}
      <text x="150" y="113" text-anchor="middle" font-size="7.5" class="bx-status"></text></svg>
      <div class="bx-copy"><h3>${COPY.hub[0]}</h3><p>${COPY.hub[1]}</p></div></div></div>`;
  }

  /* رسم المبيعات: منحنى ناعم، ومرور يعرض الشهر ونسبة النمو */
  const CW = 300, CH = 130, PAD = 14;
  function chartPts() {
    const v = COPY.values, lo = Math.min(...v), hi = Math.max(...v), n = v.length;
    return v.map((x, i) => [PAD + (i / (n - 1)) * (CW - PAD * 2), CH - PAD - ((x - lo) / (hi - lo)) * (CH - PAD * 2)]);
  }
  function chartCard() {
    const p = chartPts();
    let line = '';
    p.forEach(([x, y], i) => { if (!i) { line = `M${x.toFixed(1)},${y.toFixed(1)}`; return; } const [px, py] = p[i - 1], cx = (px + x) / 2; line += ` C${cx.toFixed(1)},${py.toFixed(1)} ${cx.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`; });
    const area = `${line} L${p[p.length - 1][0]},${CH - PAD} L${p[0][0]},${CH - PAD} Z`;
    const cur = p.length - 1;
    return `<div class="bx-frame">${brackets}<div class="bx-card"><svg class="bx-svg bx-chart" viewBox="0 0 ${CW} ${CH + 6}" role="img" aria-label="${esc(COPY.chart[0])}" direction="ltr">
      <defs><linearGradient id="bxArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".16"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
      ${[0.25, 0.5, 0.75].map((g) => `<line x1="${PAD}" x2="${CW - PAD}" y1="${CH * g}" y2="${CH * g}" stroke="var(--border)" stroke-dasharray="3 5"/>`).join('')}
      <path d="${area}" fill="url(#bxArea)"/><path d="${line}" fill="none" stroke="var(--primary)" stroke-width="1.8" stroke-linecap="round" pathLength="1" class="bx-draw"/>
      <line x1="${p[cur - 1][0]}" x2="${p[cur - 1][0]}" y1="10" y2="${CH - PAD}" stroke="var(--border-strong)" stroke-dasharray="2 3"/>
      <text x="${p[cur - 1][0] - 4}" y="${CH - 18}" text-anchor="end" font-size="7.5" font-weight="700" fill="var(--text-3)">${I18N.en ? 'THIS MONTH' : 'الشهر الحالي'}</text>
      <line class="bx-hl" y1="8" y2="${CH - PAD}" stroke="var(--primary)" stroke-opacity=".4"/>
      <circle cx="${p[cur][0]}" cy="${p[cur][1]}" r="8" fill="var(--primary)" opacity=".15" class="bx-glow"/>
      <circle class="bx-pt" r="3.6" fill="var(--surface)" stroke="var(--primary)" stroke-width="2"/>
      <g class="bx-bub"><rect x="-38" y="-12" width="76" height="17" rx="6" fill="var(--ink)"/><text x="0" y="0" text-anchor="middle" font-size="8" font-weight="700" fill="var(--ink-text)"></text></g></svg>
      <div class="bx-copy"><h3>${COPY.chart[0]}</h3><p>${COPY.chart[1]}</p></div></div></div>`;
  }
  function setPoint(svg, i) {
    const p = chartPts(), [x, y] = p[i], v = COPY.values;
    const pct = Math.round(((v[i] - v[0]) / v[0]) * 100);
    const mon = (I18N.en ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'])[i];
    svg.querySelector('.bx-pt').setAttribute('cx', x); svg.querySelector('.bx-pt').setAttribute('cy', y);
    const b = svg.querySelector('.bx-bub');
    b.setAttribute('transform', `translate(${Math.min(CW - 40, Math.max(40, x))},${y < 34 ? y + 22 : y - 12})`);
    b.querySelector('text').textContent = `${mon} \u2066${pct >= 0 ? '+' : ''}${pct}%\u2069`;
  }

  window.LandingBento = {
    html() {
      return `<section class="lp-sec bx-sec"><div class="lp-wrap"><div class="bx-shell rv">
        <div class="lp-head"><span class="lp-eyebrow">${COPY.tag}</span><h2 class="bx-title">${title(COPY.title)}</h2></div>
        <div class="bx-bento">${flowCard()}${hubCard()}${chartCard()}</div></div></div></section>`;
    },
    mount(root) {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
      const alive = () => root.isConnected;
      // التقارير تُطبع باستمرار
      const stack = root.querySelector('.bx-stack');
      let n = 128;
      sheets(stack, n);
      if (!reduced) { const t = setInterval(() => { if (!alive()) return clearInterval(t); sheets(stack, ++n); }, 2800); }
      // إبراز مسار جانب عند المرور على الفريق أو التقارير
      root.querySelectorAll('.bx-side').forEach((g) => {
        g.addEventListener('mouseenter', () => root.querySelectorAll(`.bx-flowcard .bx-flow[data-side="${g.dataset.side}"]`).forEach((f) => f.classList.add('on')));
        g.addEventListener('mouseleave', () => root.querySelectorAll('.bx-flowcard .bx-flow').forEach((f) => f.classList.remove('on')));
      });
      // الأقسام تتزامن واحدًا تلو الآخر، والمرور يثبت قسمًا
      const hub = root.querySelector('.bx-hubsvg');
      let auto = 0, hover = -1;
      const paint = () => {
        const on = hover >= 0 ? hover : reduced ? -1 : auto;
        hub.querySelectorAll('.bx-flow').forEach((f) => f.classList.toggle('on', +f.dataset.i === on));
        hub.querySelectorAll('.bx-tool').forEach((t) => t.classList.toggle('on', +t.dataset.i === on));
        hub.querySelector('.bx-hubpkt').innerHTML = !reduced && on >= 0 ? `<circle r="2.4" class="bx-pkt"><animateMotion dur="1.1s" repeatCount="indefinite" path="${tPath(on)}"/></circle>` : '';
        hub.querySelector('.bx-status').textContent = on >= 0 ? (I18N.en ? 'syncing · ' : 'مزامنة · ') + I18N.t(COPY.tools[on][0]) : I18N.t('4 أقسام مترابطة');
      };
      hub.querySelectorAll('.bx-tool').forEach((t) => {
        const i = +t.dataset.i;
        t.addEventListener('mouseenter', () => { hover = i; paint(); }); t.addEventListener('focus', () => { hover = i; paint(); });
        t.addEventListener('mouseleave', () => { hover = -1; paint(); }); t.addEventListener('blur', () => { hover = -1; paint(); });
      });
      paint();
      if (!reduced) { const t = setInterval(() => { if (!alive()) return clearInterval(t); if (hover < 0) { auto = (auto + 1) % 4; paint(); } }, 1700); }
      // الرسم: المؤشر يتبع الفأرة
      const ch = root.querySelector('.bx-chart'), xs = chartPts().map((q) => q[0]), last = xs.length - 1, hl = ch.querySelector('.bx-hl');
      setPoint(ch, last);
      ch.addEventListener('pointermove', (e) => {
        const r = ch.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * CW;
        let best = 0; xs.forEach((v, i) => { if (Math.abs(v - x) < Math.abs(xs[best] - x)) best = i; });
        setPoint(ch, best); hl.setAttribute('x1', xs[best]); hl.setAttribute('x2', xs[best]); hl.style.opacity = 1;
      });
      ch.addEventListener('pointerleave', () => { setPoint(ch, last); hl.style.opacity = 0; });
      // رسم الخط عند ظهور القسم
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { root.querySelector('.bx-bento').dataset.in = 'true'; io.disconnect(); } }, { root: root.closest('.lp'), threshold: 0.25 });
        io.observe(root.querySelector('.bx-bento'));
      } else root.querySelector('.bx-bento').dataset.in = 'true';
    },
  };
})();
