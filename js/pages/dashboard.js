/* لوحة التحكم: كل رقم يوضح فترته (حركة فترة أم رصيد حتى تاريخ) ويفتح تقريره */
(function () {
  const esc = U.esc;
  const PERIODS = {
    month: 'هذا الشهر', lastMonth: 'الشهر الماضي', quarter: 'هذا الربع', year: 'هذه السنة', lastYear: 'السنة الماضية', custom: 'مخصص',
  };
  function range(key) {
    const t = U.today(), y = U.year(t), m = U.month(t);
    switch (key) {
      case 'month': return [U.startOfMonth(t), t];
      case 'lastMonth': { const d = U.addDays(U.startOfMonth(t), -1); return [U.startOfMonth(d), d]; }
      case 'quarter': { const qm = Math.floor((m - 1) / 3) * 3 + 1; return [`${y}-${String(qm).padStart(2, '0')}-01`, t]; }
      case 'year': return [`${y}-01-01`, t];
      case 'lastYear': return [`${y - 1}-01-01`, `${y - 1}-12-31`];
    }
    return null;
  }
  App.period = App.period || { key: 'year', from: range('year')[0], to: range('year')[1] };
  App.reportPeriod = () => ({ from: App.period.from, to: App.period.to });

  Pages.dashboard = {
    render() {
      const P = App.period;
      const k = E.kpis(P.from, P.to);
      const pl = E.pnl(P.from, P.to);
      const u = E.user();
      const hr = new Date().getHours();
      const greet = hr < 12 ? 'صباح الخير' : 'مساء الخير';
      const ser = E.monthlySeries(12, P.to);
      const dark = document.documentElement.dataset.theme === 'dark';
      const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#34449c';
      const c1 = css('--chart-1'), c2 = css('--chart-2'), c3 = css('--chart-3'), c4 = css('--chart-4');
      const scope = `${U.date(P.from)} ← ${U.date(P.to)}`;
      const kpi = (o) => `<button class="kpi ${o.c ? 'c-' + o.c : ''}" data-act="go" data-href="${o.href}" title="${esc(o.tip || '')}">
        <div class="k-top"><span class="k-ico">${icon(o.ic)}</span><span class="grow">${o.label}</span><span class="k-scope" title="${o.bal ? 'رصيد تراكمي حتى ' + U.date(P.to) : 'مجموع حركة الفترة ' + scope}">${o.bal ? 'رصيد' : 'فترة'}</span></div>
        <div class="k-val"><span data-count="${U.r2(o.v)}">${U.money(o.v)}</span><small>${UI.cur()}</small></div>
        <div class="k-foot">${o.foot || ''}</div>${o.extra || ''}</button>`;
      // سلاسل شهرية خفيفة للخطوط الصغيرة داخل البطاقات (آخر 12 شهرًا)
      const months = ser.map((x) => x.ym);
      const byMonth = (arr, dateOf, valOf) => { const m = new Map(months.map((x) => [x, 0])); for (const a of arr) { const k2 = U.ym(dateOf(a)); if (m.has(k2)) m.set(k2, m.get(k2) + valOf(a)); } return [...m.values()]; };
      const live = (c) => E.TYPES[c.docType] && DB.get('docs', c.docId) && DB.get('docs', c.docId).status !== 'void';
      const cashIn = byMonth(DB.s.cash.filter((c) => c.amount > 0 && ['SI', 'RC'].includes(c.docType) && live(c)), (c) => c.date, (c) => c.amount);
      const cashOut = byMonth(DB.s.cash.filter((c) => c.amount < 0 && ['PI', 'PY', 'EX'].includes(c.docType) && live(c)), (c) => c.date, (c) => -c.amount);
      const purch = byMonth(E.posted('PI'), (d) => d.date, (d) => d.totals.total);
      const exps = byMonth(E.posted('EX'), (d) => d.date, (d) => d.amount);
      const hrs = byMonth(E.posted('PRC'), (d) => d.date, (d) => d.hours);
      const sp = (vals, c) => `<div class="spark-wrap">${UI.spark(vals, c)}</div>`;
      const aging = [0, 0, 0, 0];
      for (const p of DB.s.parties.filter((x) => x.types.includes('customer'))) {
        for (const x of E.openItems('party', p.id).map.values()) { if (x.remaining <= 0) continue; const age = U.daysBetween(DB.get('docs', x.docId).date, U.today()); aging[age <= 30 ? 0 : age <= 60 ? 1 : age <= 90 ? 2 : 3] += x.remaining; }
      }
      const agingBar = UI.stack([{ l: '0–30 يوم', v: aging[0], c: c1 }, { l: '31–60', v: aging[1], c: c4 }, { l: '61–90', v: aging[2], c: c2 }, { l: '+90', v: aging[3], c: c3 }], true);
      const accColors = [c1, c4, c2, css('--chart-5'), css('--chart-6'), c3];
      const cashBar = UI.stack(k.cash.map((x, i) => ({ l: x.a.name, v: x.b, c: accColors[i % accColors.length] })));
      const whBar = UI.stack(DB.s.warehouses.map((w, i) => ({ l: w.name, v: U.sum(DB.s.items, (it) => E.onHand(it.id, w.id) * E.avgCost(it.id)), c: accColors[i % accColors.length] })), true);
      const expParts = [...pl.expByCat.entries()].sort((a, b) => b[1] - a[1]);
      const palette = [c1, c2, css('--chart-5'), c4, css('--chart-6'), c3, '#b3a796', '#9aa39d'];
      const top = expParts.slice(0, 6).map(([id, v], i) => ({ l: E.nameOf('expenseCats', id), v, c: palette[i] }));
      const rest = U.sum(expParts.slice(6), (x) => x[1]);
      if (rest > 0) top.push({ l: 'أخرى', v: rest, c: palette[7] });
      if (pl.wages) top.push({ l: 'أجور العمالة الداخلية', v: pl.wages, c: css('--g-sky') });
      const recent = DB.s.docs.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || b.id - a.id).slice(0, 8);
      const openWO = DB.s.orders.filter((o) => o.status === 'open');
      const flagged = openWO.map((o) => ({ o, s: E.orderSummary(o.id) })).filter((x) => x.s.expected > 0 && x.s.variance > 0.5);
      const overdue = (() => {
        let n = 0, v = 0;
        for (const p of DB.s.parties.filter((x) => x.types.includes('customer'))) {
          const oi = E.openItems('party', p.id);
          for (const x of oi.map.values()) { const d = DB.get('docs', x.docId); if (x.remaining > 0 && U.daysBetween(d.date, U.today()) > 60) { n++; v += x.remaining; } }
        }
        return { n, v };
      })();
      // ملخص اليوم للبطل
      const t0 = U.today();
      const todaySI = E.posted('SI', t0, t0);
      const today = { sales: U.sum(todaySI, (d) => d.totals.total), cashIn: U.sum(DB.s.cash.filter((c) => c.date === t0 && c.amount > 0 && ['SI', 'RC'].includes(c.docType)), (c) => c.amount), docs: E.posted(null, t0, t0).length };
      const todayLine = today.docs ? `سُجل اليوم ${today.docs} مستند معتمد · ${todaySI.length} فاتورة بيع` : 'لم يُسجل أي مستند اليوم بعد — ابدأ من الأزرار بالأسفل أو اضغط ' + (U.isMac ? '⌘' : 'Ctrl') + '+K';
      const QG = { SI: 'var(--g-blue)', PI: 'var(--g-amber)', RC: 'var(--g-green)', PY: 'var(--g-gold)', EX: 'var(--g-red)', MI: 'var(--g-purple)', PRC: 'var(--g-sky)' };
      const heroOn = DB.s.settings.heroEnabled !== false;
      const heroImg = DB.s.settings.heroImage || 'assets/hero-factory.jpg';
      // رسم خلفية البطل: أقسام المصنع تتدفق إلى شارة المصنع (شعار العميل واسمه) — نفس لغة رسوم الصفحة التعريفية
      const heroArt = () => {
        const co = DB.s.settings.company || {}, rtl = document.documentElement.dir !== 'ltr', X = (x) => (rtl ? 100 - x : x);
        const hub = [50, 50], nodes = [['receipt', 8, 22], ['boxes', 15, 84], ['factory', 86, 16], ['bank', 93, 76]];
        const paths = nodes.map(([, x, y]) => { const sx = X(x), hx = X(hub[0]), mx = (sx + hx) / 2; return `M${sx},${y} C${mx},${y} ${mx},${hub[1]} ${hx},${hub[1]}`; });
        const logo = co.logo ? `<img src="${co.logo}" alt="">` : `<span class="ha-ini">${esc((co.name || 'م').trim().slice(0, 1))}</span>`;
        return `<div class="hero-art" aria-hidden="true"><svg class="ha-flow" viewBox="0 0 100 100" preserveAspectRatio="none">
          ${paths.map((d, i) => `<path d="${d}" class="ha-fl${i % 2 ? ' dash' : ''}" vector-effect="non-scaling-stroke"/>`).join('')}
          ${paths.map((d, i) => `<circle r="1" class="ha-pk"><animateMotion dur="${2.8 + i * 0.4}s" begin="${i * 0.6}s" repeatCount="indefinite" path="${d}"/></circle>`).join('')}</svg>
          ${nodes.map(([ic, x, y], i) => `<span class="ha-node" style="left:${X(x)}%;top:${y}%;--d:${i * 0.8}s">${icon(ic)}</span>`).join('')}
          <span class="ha-hub" style="left:${X(hub[0])}%;top:${hub[1]}%"><span class="ha-logo">${logo}</span><b>${esc(co.name || 'المصنع')}</b><span class="ha-chev">${icon(rtl ? 'chevLeft' : 'chevRight')}</span></span></div>`;
      };
      const QC = { SI: 'var(--primary)', PI: 'var(--camel)', RC: 'var(--success)', PY: 'var(--accent)', EX: 'var(--danger)', MI: 'var(--chart-6)', PRC: 'var(--chart-4)' };
      const QL = { SI: 'فاتورة بيع', PI: 'فاتورة شراء', RC: 'تحصيل', PY: 'سند صرف', EX: 'مصروف', MI: 'صرف خامات', PRC: 'استلام إنتاج' };
      const alerts = [];
      if (k.drafts) alerts.push(`<a class="notice warn" href="#/sales" style="text-decoration:none">${icon('file')}<div><b>${k.drafts} مسودة</b> لم تُعتمد بعد — لا تؤثر على الأرصدة</div></a>`);
      if (k.low.length) alerts.push(`<a class="notice danger" href="#/stock?low=1" style="text-decoration:none">${icon('alert')}<div><b>${k.low.length} صنف</b> وصل لحد إعادة الطلب</div></a>`);
      if (overdue.n) alerts.push(`<a class="notice danger" href="#/report/aging" style="text-decoration:none">${icon('clock')}<div><b>${overdue.n} فاتورة</b> متأخرة أكثر من 60 يومًا بقيمة ${U.money(overdue.v)}</div></a>`);
      if (flagged.length) alerts.push(`<a class="notice warn" href="#/reconcile" style="text-decoration:none">${icon('scale')}<div><b>${flagged.length} أمر تشغيل</b> استهلاك الخامات فيه أعلى من المسموح — يحتاج مراجعة</div></a>`);
      // مقارنة بنفس الفترة من العام السابق
      const shiftY = (d) => (+d.slice(0, 4) - 1) + d.slice(4);
      const kp = E.kpis(shiftY(P.from), shiftY(P.to));
      const plp = E.pnl(shiftY(P.from), shiftY(P.to));
      const prevLbl = 'عن نفس الفترة ' + (U.year(P.from) - 1);
      const trend = (v, pv, lowerIsBetter) => {
        if (!pv) return '<span class="trend flat">—</span>';
        const pct = ((v - pv) / Math.abs(pv)) * 100;
        const up = pct >= 0, good = lowerIsBetter ? !up : up;
        return `<span class="trend ${good ? 'good' : 'bad'}">${icon(up ? 'arrowUp' : 'arrowDown')}${Math.abs(pct).toFixed(1)}%</span>`;
      };
      const big = (o) => `<a class="kbig" href="${o.href}" style="--kg:${o.g}">
        <div class="kb-head"><span class="kb-l">${o.label}</span><span class="kb-ico">${icon(o.ic)}</span></div>
        <div class="kb-v"><span data-count="${U.r2(o.v)}">${U.money(o.v)}</span><small>${UI.cur()}</small></div>
        <div class="kb-note">${o.note || ''}</div>
        <div class="kb-spark">${UI.spark(o.vals, o.c, 58)}</div>
        <div class="kb-t"><span class="muted">${prevLbl}</span>${trend(o.v, o.pv, o.lowerIsBetter)}</div></a>`;
      const mini = (o) => `<a class="kmini" href="${o.href}" style="--kg:${o.g}"><span class="km-ico">${icon(o.ic)}</span><span class="grow"><span class="km-l">${o.label}</span><span class="km-v num">${o.int ? U.int(o.v) : U.money(o.v)} <small>${o.unit || UI.cur()}</small></span>${o.extra ? o.extra : `<span class="km-s">${o.sub || ''}</span>`}</span></a>`;
      const TG = { SI: 'var(--g-blue)', SR: 'var(--g-sky)', PI: 'var(--g-amber)', PR: 'var(--g-amber)', RC: 'var(--g-green)', PY: 'var(--g-gold)', EX: 'var(--g-red)', IN: 'var(--g-green)', TR: 'var(--g-sky)', MI: 'var(--g-purple)', MR: 'var(--g-purple)', PRC: 'var(--g-sky)', PAYR: 'var(--g-purple)', DJ: 'var(--g-purple)', CI: 'var(--g-red)', ADJ: 'var(--g-amber)' };
      const RC = [c1, css('--success'), c2, css('--chart-6'), c3, css('--chart-5')];
      const siP = E.posted('SI', P.from, P.to);
      const salesTotal = U.sum(siP, (d) => d.totals.total);
      const topCust = [...U.groupBy(siP, (d) => d.sid)].map(([sid, arr]) => ({ p: DB.get('parties', sid), v: U.sum(arr, (d) => d.totals.total) })).filter((x) => x.p).sort((a, b) => b.v - a.v).slice(0, 5);
      const topTotal = U.sum(top, (x) => x.v);
      return `
      <section class="${heroOn ? 'hero-photo' : 'hero-photo no-img'}">
        ${heroOn ? `<div class="hp-bg" aria-hidden="true" style="background-image:url('${heroImg}')"></div>` : ''}
        ${heroArt()}
        <div class="hero-main">
          <div class="hero-date"><span class="row gap-4">${icon('calendar')} ${new Intl.DateTimeFormat(I18N.en ? 'en-GB' : 'ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span><span class="live">بيانات مباشرة</span></div>
          <h1>${greet}، ${esc(u ? u.name : '')}</h1>
          <div class="hero-sub">${todayLine}</div>
          <div class="chips">
            <a class="chip" href="#/sales">${icon('receipt')} مبيعات اليوم <b>${U.money(today.sales)}</b></a>
            <a class="chip" href="#/receipts">${icon('in')} تحصيلات اليوم <b>${U.money(today.cashIn)}</b></a>
            <a class="chip" href="#/orders">${icon('layers')} أوامر تشغيل مفتوحة <b>${openWO.length}</b></a>
            <a class="chip" href="#/accounts">${icon('bank')} في الخزائن <b>${U.short(k.cashTotal)}</b></a>
          </div>
        </div>
        <a class="hero-cust" href="#/settings/appearance" title="تخصيص المظهر">${icon('palette')}</a>
        <div class="hero-side">
          <div class="btn-group">${Object.entries(PERIODS).filter(([x]) => x !== 'custom').map(([key, l]) => `<button class="btn sm ${P.key === key ? 'on' : ''}" data-act="dash-period" data-k="${key}">${l}</button>`).join('')}</div>
          <div class="row"><input type="date" class="input" value="${P.from}" data-change="dash-from"><input type="date" class="input" value="${P.to}" data-change="dash-to"></div>
        </div>
      </section>
      <div class="quick">
        ${App.NEW.filter((n) => n.k && E.can(E.TYPES[n.t].perm) && !App.typeLocked(n.t)).map((n) => `<button class="qa" style="--qc:${QC[n.t]};--qg:${QG[n.t]}" data-act="new-doc" data-type="${n.t}"><span class="qa-ico">${icon(n.ic)}</span><span class="qa-l" title="${E.TYPES[n.t].label}">${QL[n.t]}</span><kbd>${(U.isMac ? '⌥' : 'Alt+') + n.k.split('+')[1].toUpperCase()}</kbd></button>`).join('')}
      </div>
      ${E.can('reports') ? `${alerts.length ? `<div class="alerts">${alerts.join('')}</div>` : ''}

      <div class="kpi-main">
        ${big({ label: 'صافي المبيعات', v: k.salesNet, pv: kp.salesNet, ic: 'receipt', g: 'var(--g-green)', c: c1, href: '#/report/sales-customers', vals: ser.map((x) => x.sales), note: `${U.int(k.invoiceCount)} فاتورة · بعد المرتجعات` })}
        ${big({ label: 'التحصيلات الفعلية', v: k.receipts, pv: kp.receipts, ic: 'in', g: 'var(--g-blue)', c: c4, href: '#/report/cashflow', vals: cashIn, note: 'نقدية دخلت الخزائن فعلًا' })}
        ${big({ label: 'المصروفات', v: k.expensesP, pv: kp.expensesP, ic: 'wallet', g: 'var(--g-red)', c: c3, href: '#/report/expenses', vals: exps, note: 'سندات المصروفات', lowerIsBetter: true })}
        ${big({ label: 'صافي الربح التشغيلي', v: pl.net, pv: plp.net, ic: pl.net >= 0 ? 'trend' : 'trendDown', g: 'var(--g-amber)', c: css('--accent'), href: '#/report/pnl', vals: ser.map((x) => x.profit), note: `هامش ${pl.revenue ? Math.round((pl.net / pl.revenue) * 100) : 0}% من المبيعات` })}
      </div>

      <div class="kpi-strip">
        ${mini({ label: 'المشتريات', v: k.purchases, ic: 'cart', g: 'var(--g-amber)', href: '#/report/purchases', sub: 'خلال الفترة' })}
        ${mini({ label: 'المدفوعات', v: k.payments, ic: 'out', g: 'var(--g-purple)', href: '#/report/cashflow', sub: 'خلال الفترة' })}
        ${mini({ label: 'مستحق على العملاء', v: k.receivable, ic: 'users', g: 'var(--g-sky)', href: '#/report/aging', extra: agingBar })}
        ${mini({ label: 'مستحق للموردين', v: k.payable, ic: 'truck', g: 'var(--g-amber)', href: '#/suppliers', sub: 'ما علينا دفعه' })}
        ${mini({ label: 'مستحقات الورش', v: k.workshopDue, ic: 'factory', g: 'var(--g-purple)', href: '#/workshops', sub: k.workshopAdv ? 'سلف زائدة ' + U.short(k.workshopAdv) : 'لا سلف زائدة' })}
        ${mini({ label: 'الخزائن والبنوك', v: k.cashTotal, ic: 'bank', g: 'var(--g-green)', href: '#/accounts', extra: cashBar })}
        ${mini({ label: 'قيمة المخزون', v: k.stockVal, ic: 'boxes', g: 'var(--g-blue)', href: '#/stock', extra: whBar })}
        ${mini({ label: 'ساعات التشغيل', v: k.hours, int: true, unit: 'ساعة', ic: 'clock', g: 'var(--g-sky)', href: '#/report/outwork', sub: U.int(k.produced) + ' قطعة مستلمة' })}
      </div>

      <div class="dash-grid">
        <div class="card c-8"><div class="card-h"><h3>${icon('chart')} المبيعات والمصروفات</h3><span class="sub">آخر 12 شهرًا</span><span class="grow"></span>
          <div class="legend"><span><i style="background:${c1}"></i>صافي المبيعات</span><span><i style="background:${c2}"></i>المصروفات والأجور</span><span><i style="background:${css('--chart-6')}"></i>صافي الربح</span></div></div>
          <div class="card-b chart-pad">${UI.lineChart({ labels: ser.map((s) => U.MONTHS[+s.ym.slice(5) - 1].slice(0, 3)), series: [{ name: 'صافي المبيعات', color: c1, values: ser.map((s) => s.sales), fill: true }, { name: 'المصروفات والأجور', color: c2, values: ser.map((s) => s.expenses) }, { name: 'صافي الربح', color: css('--chart-6'), values: ser.map((s) => s.profit), dashed: true }], height: 270 })}</div></div>
        <div class="card c-4"><div class="card-h"><h3>${icon('pie')} توزيع التكاليف</h3><span class="sub">${scope}</span></div>
          <div class="card-b donut-box"><div class="donut-wrap">${UI.donut(top, 176)}<div class="donut-center"><div class="dc-l">الإجمالي</div><div class="dc-v">${U.short(topTotal)}</div><div class="dc-l">${UI.cur()}</div></div></div>
          <div class="donut-legend">${top.map((x) => `<div class="dl-row"><i style="background:${x.c}"></i><span class="grow ellipsis">${esc(x.l)}</span><b>${topTotal ? Math.round((x.v / topTotal) * 100) : 0}%</b></div>`).join('')}</div></div></div>

        <div class="card c-5"><div class="card-h"><h3>${icon('history')} آخر العمليات</h3><span class="grow"></span><a class="small" href="#/settings/audit">السجل الكامل</a></div>
          <div class="activity">${recent.map((d) => { const T = E.TYPES[d.type]; return `<a class="act-row" href="#/doc/${d.id}"><span class="act-ico" style="--kg:${TG[d.type] || 'var(--g-blue)'}">${icon(T.icon)}</span><span class="grow"><span class="act-t">${T.label} <span class="code">${esc(E.docNo(d))}</span></span><span class="act-s">${esc(d.sid ? E.subjectName(d.st || 'party', d.sid) : Pages.detailOf(d))} · ${U.date(d.date)}</span></span><span class="act-v"><b class="num">${U.money((d.totals && d.totals.total) || 0)}</b>${d.status === 'posted' ? '' : UI.status(d)}</span></a>`; }).join('')}</div></div>
        <div class="card c-4"><div class="card-h"><h3>${icon('users')} أفضل العملاء</h3><span class="sub">مبيعات الفترة</span><span class="grow"></span><a class="small" href="#/report/sales-customers">الكل</a></div>
          <div class="rank">${topCust.length ? topCust.map((x, i) => `<a class="rank-row" href="#/party/${x.p.id}"><span class="rank-n">${i + 1}</span><span class="grow"><span class="row between"><span class="ellipsis bold">${esc(x.p.name)}</span><b class="num">${U.short(x.v)}</b></span><span class="rank-bar"><i style="width:${(x.v / topCust[0].v) * 100}%;background:${RC[i % RC.length]}"></i></span></span><span class="rank-p">${salesTotal ? Math.round((x.v / salesTotal) * 100) : 0}%</span></a>`).join('') : `<div class="card-b">${UI.empty('لا مبيعات في الفترة', '', 'receipt')}</div>`}</div></div>
        <div class="card c-3"><div class="card-h"><h3>${icon('bank')} الخزائن</h3><span class="grow"></span><a class="small" href="#/accounts">الكل</a></div>
          ${k.cash.map((x) => `<a class="list-row" href="#/account/${x.a.id}"><span class="mini-ico" style="--kg:${x.a.type === 'bank' ? 'var(--g-blue)' : x.a.type === 'wallet' ? 'var(--g-purple)' : 'var(--g-green)'}">${icon(x.a.type === 'bank' ? 'bank' : x.a.type === 'wallet' ? 'wallet' : 'coins')}</span><span class="grow ellipsis">${esc(x.a.name)}</span><b class="num ${x.b < 0 ? 'neg' : ''}">${U.short(x.b)}</b></a>`).join('')}
          <div class="card-f row between"><b>الإجمالي</b><b class="num">${U.money(k.cashTotal)}</b></div></div>

        <div class="card c-6"><div class="card-h"><h3>${icon('factory')} حسابات الورش</h3><span class="grow"></span><a class="small" href="#/workshops">الكل</a></div>
          ${k.shops.map((x) => { const open = DB.s.orders.filter((o) => o.partyId === x.p.id && o.status === 'open'); const prog = open.length ? Math.round(open.reduce((a, o) => a + E.orderSummary(o.id).progress, 0) / open.length) : 0; return `<a class="list-row" href="#/party/${x.p.id}"><span class="avatar sm">${UI.initials(x.p.name)}</span><span class="grow"><span class="ellipsis bold" style="display:block">${esc(x.p.name)}</span><span class="tiny muted">${open.length} أمر مفتوح${open.length ? ' · إنجاز ' + prog + '%' : ''}</span>${open.length ? `<div class="meter mt-8" style="margin-top:5px"><i style="width:${prog}%"></i></div>` : ''}</span>${UI.bal(x.b)}</a>`; }).join('')}</div>
        <div class="card c-6"><div class="card-h"><h3>${icon('alert')} أصناف تحتاج إعادة طلب</h3><span class="grow"></span><a class="small" href="#/stock">المخزون</a></div>
          ${k.low.length ? k.low.slice(0, 7).map((x) => { const pct = x.it.reorder ? Math.max(0, Math.min(100, (x.q / x.it.reorder) * 100)) : 0; return `<a class="list-row" href="#/item/${x.it.id}"><span class="mini-ico" style="--kg:var(--g-red)">${icon('tag')}</span><span class="grow"><span class="ellipsis bold" style="display:block">${esc(x.it.name)}</span><div class="meter ${pct < 40 ? 'danger' : 'warn'}" style="margin-top:5px"><i style="width:${pct}%"></i></div></span><span class="num small" style="min-width:110px;text-align:end"><b>${U.qty(x.q)}</b> / ${U.qty(x.it.reorder)} ${esc(x.it.unit)}</span></a>`; }).join('') : `<div class="card-b">${UI.empty('كل الأصناف فوق حد الطلب', '', 'checkCircle')}</div>`}</div>
      </div>` : `<div class="notice info">${icon('lock')}<div><b>المؤشرات المالية مخفية لدورك</b><div class="n-body small">تحتاج صلاحية "التقارير وكشوف الحساب" لعرض أرقام المبيعات والأرباح والخزائن — استخدم القائمة الجانبية للوصول إلى أقسامك.</div></div></div>`}`;
    },
  };
  Pages.dashboard.mount = (el) => { if (el.classList.contains('anim')) UI.countUp(el); };
  const setP = (key, from, to) => { App.period = { key, from, to }; App.refresh(); };
  UI.acts['dash-period'] = (el) => { const r = range(el.dataset.k); setP(el.dataset.k, r[0], r[1]); };
  UI.acts['dash-from'] = (el) => setP('custom', el.value, App.period.to);
  UI.acts['dash-to'] = (el) => setP('custom', App.period.from, el.value);

  // صفحة "لا صلاحية": الحارس في التوجيه يعرضها بدل المحتوى
  Pages.denied = { render: ({ perm }) => {
    const u = E.user(), role = E.roleOf(u.role) || {};
    return `<div class="denied"><div class="dn-art">${icon('lock')}</div><h1>لا تملك صلاحية الوصول لهذه الصفحة</h1>
      <p>دورك الحالي <b>${esc(role.label || '')}</b> لا يتضمن صلاحية: <b>${esc(E.PERMS[perm] || perm)}</b></p>
      <p class="muted small">اطلب من مالك المصنع إضافة الصلاحية لدورك من الإعدادات ← الأدوار والصلاحيات</p>
      <div class="row" style="justify-content:center">${E.can('view') ? `<a class="btn primary" href="#/">${icon('home')} لوحة التحكم</a>` : ''}<button class="btn" data-act="go" data-href="#/settings/profile">${icon('user')} حسابي</button></div></div>`;
  } };
  Pages.notfound = { render: () => UI.empty('الصفحة غير موجودة', '<a href="#/">العودة للوحة التحكم</a>', 'alert') };
})();
