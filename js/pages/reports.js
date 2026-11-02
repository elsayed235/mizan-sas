/* التقارير: كل تقرير بفلتر فترة، طباعة، وتصدير Excel */
(function () {
  const esc = U.esc;
  const R = {};
  const st = { from: null, to: null, opt: '' };
  const sumBy = (arr, keyFn, valFn) => { const m = new Map(); for (const x of arr) { const k = keyFn(x); m.set(k, U.r2((m.get(k) || 0) + valFn(x))); } return m; };

  const CATALOG = [
    { g: 'المالية والأرباح', items: [
      ['pnl', 'قائمة الأرباح والخسائر التشغيلية', 'الإيراد − تكلفة المباع − المصروفات − الأجور، مع مقارنة بنفس الفترة من السنة السابقة', 'trend'],
      ['annual', 'الملخص السنوي ومقارنة السنوات', 'كل سنة مالية جنبًا إلى جنب', 'calendar'],
      ['cashflow', 'التدفقات النقدية', 'الوارد والصادر لكل خزينة وحسب نوع العملية', 'bank'],
      ['expenses', 'المصروفات حسب البند', 'مع طريقة الدفع والتوزيع الشهري', 'wallet'],
      ['tax', 'تقرير الضريبة', 'ضريبة المبيعات مقابل ضريبة المشتريات', 'percent'],
    ] },
    { g: 'العملاء والموردون', items: [
      ['sales-customers', 'المبيعات والتحصيلات حسب العميل', 'المبيعات، المرتجعات، المحصل والرصيد', 'users'],
      ['sales-items', 'المبيعات والربحية حسب الصنف', 'الكمية، الإيراد، التكلفة والهامش', 'tag'],
      ['aging', 'أعمار الديون والمتأخرات', 'المتبقي على العملاء موزعًا حسب عمر الفاتورة', 'clock'],
      ['purchases', 'المشتريات والمدفوعات حسب المورد', '', 'truck'],
      ['balances', 'أرصدة جميع الأطراف حتى تاريخ', 'العملاء والموردون والورش والرسامون', 'scale'],
    ] },
    { g: 'المخزون والإنتاج', items: [
      ['stock-move', 'حركة المخزون للفترة', 'أول المدة، الوارد، الصادر، آخر المدة', 'boxes'],
      ['outwork', 'المصنعية حسب الورشة والموديل', 'الساعات، الإنتاج، المصنعية، السلف', 'factory'],
      ['materials', 'الخامات المسلمة والمستهلكة والفروق', 'لكل ورشة', 'yarn'],
      ['labor', 'تكلفة العمالة الداخلية', 'حسب القسم والشهر', 'users'],
      ['design', 'تكلفة الرسم والبرمجة', 'حسب الموديل والرسام', 'pen'],
    ] },
  ];
  const TITLES = Object.fromEntries(CATALOG.flatMap((g) => g.items.map((x) => [x[0], x[1]])));

  Pages.reports = {
    render() {
      return `<div class="page-h"><div class="titles"><h1>التقارير</h1><div class="desc">كل التقارير مبنية على المستندات المعتمدة فقط، وكل رقم يمكن تتبعه لمستنده الأصلي</div></div></div>
        ${CATALOG.map((g) => `<h3 class="mb-12 mt-16" style="font-size:14px;color:var(--text-2)">${g.g}</h3><div class="grid g3 mb-16" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">${g.items.map(([k, t, d, ic]) => `<a class="kpi ${App.reportLocked(k) ? 'rep-locked' : ''}" href="#/report/${k}" ${App.reportLocked(k) ? `data-act="upsell" data-m="${App.REPORT_MOD[k]}"` : ''} style="text-decoration:none;color:inherit"><div class="k-top"><span class="k-ico">${icon(ic)}</span><b style="color:var(--text)">${t}</b>${App.reportLocked(k) ? `<span class="nav-lock">${icon('lock')}<b>${Auth.PLANS.pro.label}</b></span>` : ''}</div><div class="k-foot" style="margin-top:8px">${d}</div></a>`).join('')}</div>`).join('')}`;
    },
  };

  Pages.report = {
    render({ key }) {
      if (!st.from) { st.from = App.period.from; st.to = App.period.to; }
      const fn = R[key];
      if (!fn) return UI.empty('تقرير غير موجود');
      const out = fn(st.from, st.to);
      const years = DB.s.fiscalYears.map((f) => f.name);
      return `
      <div class="crumbs"><a href="#/reports">التقارير</a> ‹</div>
      <div class="page-h"><div class="titles"><h1>${TITLES[key]}</h1><div class="desc">${out.noPeriod ? 'حتى ' + U.date(st.to) : `الفترة: ${U.date(st.from)} ← ${U.date(st.to)}`} · مبني على المستندات المعتمدة فقط</div></div>
        <div class="actions period-bar">${out.noPeriod ? '' : `<input type="date" class="input" value="${st.from}" data-change="rp-f" data-k="from">`}<input type="date" class="input" value="${st.to}" data-change="rp-f" data-k="to">
          <div class="btn-group">${years.map((y) => `<button class="btn sm ${st.from === y + '-01-01' && st.to === y + '-12-31' ? 'on' : ''}" data-act="rp-year" data-y="${y}">${y}</button>`).join('')}</div>
          ${out.table ? `<button class="btn sm" data-act="tbl-print" data-id="${out.table}">${icon('printer')} طباعة</button><button class="btn sm" data-act="tbl-csv" data-id="${out.table}">${icon('download')} Excel</button>` : ''}</div></div>
      ${out.strip ? `<div class="stat-strip mb-16">${out.strip.map(([l, v, c]) => `<div><div class="s-l">${l}</div><div class="s-v ${c || ''}">${v}</div></div>`).join('')}</div>` : ''}
      ${out.note ? `<div class="notice info mb-16">${icon('info')}<div class="n-body small">${out.note}</div></div>` : ''}
      ${out.html}`;
    },
    mount(el, { key }) {
      const t = el.querySelector('[data-tbl]');
      if (t && UI.tables[t.dataset.tbl]) { UI.tables[t.dataset.tbl].cfg.printTitle = TITLES[key]; UI.tables[t.dataset.tbl].cfg.printSub = `${U.date(st.from)} ← ${U.date(st.to)}`; }
    },
  };
  UI.acts['rp-f'] = (el) => { st[el.dataset.k] = el.value; App.refresh(); };
  UI.acts['rp-year'] = (el) => { st.from = el.dataset.y + '-01-01'; st.to = el.dataset.y + '-12-31'; App.refresh(); };
  UI.acts['rp-opt'] = (el) => { st.opt = el.dataset.v; App.refresh(); };
  const tbl = (id, rows, cols, o = {}) => `<div class="card">${UI.table(Object.assign({ id, rows, cols, csv: id, noPage: rows.length < 400 }, o))}</div>`;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');

  /* قائمة الدخل */
  R.pnl = (from, to) => {
    const p = E.pnl(from, to);
    const py = E.pnl(U.year(from) - 1 + from.slice(4), U.year(to) - 1 + to.slice(4));
    const row = (l, a, b, o = {}) => `<tr class="${o.cls || ''}"><td style="padding-inline-start:${o.indent ? 32 : 12}px">${o.bold ? `<b>${l}</b>` : l}</td><td class="num ${o.bold ? 'bold' : ''}">${o.neg ? '(' + U.money(a) + ')' : U.money(a)}</td><td class="num muted">${o.neg ? '(' + U.money(b) + ')' : U.money(b)}</td><td class="num small ${a >= b ? (o.neg ? 'neg' : 'pos') : o.neg ? 'pos' : 'neg'}">${b ? (a >= b ? '▲' : '▼') + Math.abs(Math.round(((a - b) / Math.abs(b)) * 100)) + '%' : '—'}</td><td class="num small muted" style="min-width:110px">${pct(a, p.revenue)}${p.revenue && a ? UI.ibar(Math.abs(a) / p.revenue, o.neg ? 'var(--chart-3)' : 'var(--chart-1)') : ''}</td></tr>`;
    const cats = [...new Set([...p.expByCat.keys(), ...py.expByCat.keys()])].sort((a, b) => (p.expByCat.get(b) || 0) - (p.expByCat.get(a) || 0));
    return {
      strip: [['صافي الإيراد', `<span class="num">${U.money(p.revenue)}</span>`], ['مجمل الربح', `<span class="num">${U.money(p.gross)}</span> <span class="small muted">${pct(p.gross, p.revenue)}</span>`], ['إجمالي التكاليف التشغيلية', `<span class="num">${U.money(p.expenses + p.wages + p.design + p.outworkExpensed + p.materialLoss)}</span>`], ['صافي الربح التشغيلي', `<span class="num ${p.net < 0 ? 'neg' : 'pos'}">${U.money(p.net)}</span> <span class="small muted">${pct(p.net, p.revenue)}</span>`]],
      note: 'الإيراد بدون ضريبة. تكلفة المباع بالمتوسط المرجح وتشمل تكلفة الخامات والمصنعية المرسملة في المنتج. السلف والتحويلات والمشتريات المخزنية ليست مصروفًا — الاستهلاك الداخلي هو الذي يُحمّل على المصروفات. هذا تقرير تشغيلي وليس قوائم مالية بالقيد المزدوج.',
      html: `<div class="card"><div class="tbl-wrap"><table class="tbl pnl-tbl"><thead><tr><th>البند</th><th class="num">الفترة الحالية</th><th class="num">نفس الفترة ${U.year(from) - 1}</th><th class="num">التغير</th><th class="num">% من الإيراد</th></tr></thead><tbody>
        ${row('صافي المبيعات (بعد المرتجعات، بدون ضريبة)', p.revenue, py.revenue, { bold: true })}
        ${row('(−) تكلفة البضاعة المباعة', p.cogs, py.cogs, { neg: true, indent: true })}
        ${row('مجمل الربح', p.gross, py.gross, { bold: true, cls: 'sel' })}
        <tr><td colspan="5" class="small muted" style="background:var(--surface-2)"><b>المصروفات التشغيلية</b></td></tr>
        ${cats.map((c) => row(esc(E.nameOf('expenseCats', c)), p.expByCat.get(c) || 0, py.expByCat.get(c) || 0, { neg: true, indent: true })).join('')}
        ${row('أجور العمالة الداخلية', p.wages, py.wages, { neg: true, indent: true })}
        ${row('تكلفة الرسم والبرمجة', p.design, py.design, { neg: true, indent: true })}
        ${p.outworkExpensed || py.outworkExpensed ? row('مصنعية غير مرسملة (ساعات بدون إنتاج مستلم)', p.outworkExpensed, py.outworkExpensed, { neg: true, indent: true }) : ''}
        ${p.materialLoss || py.materialLoss ? row('فاقد خامات غير محمل', p.materialLoss, py.materialLoss, { neg: true, indent: true }) : ''}
        ${p.adjustments || py.adjustments ? row('فروق الجرد (عجز/زيادة)', p.adjustments, py.adjustments, { indent: true }) : ''}
        ${row('إيرادات أخرى', p.otherIncome, py.otherIncome, { indent: true })}
        ${row('صافي الربح التشغيلي', p.net, py.net, { bold: true, cls: 'sel' })}
      </tbody></table></div></div>`,
    };
  };

  /* الملخص السنوي */
  R.annual = () => {
    const ys = DB.s.fiscalYears.slice().sort((a, b) => (a.start < b.start ? -1 : 1));
    const data = ys.map((f) => {
      const p = E.pnl(f.start, f.end);
      const cin = U.sum(DB.s.cash.filter((c) => c.date >= f.start && c.date <= f.end && c.amount > 0 && !['TR', 'OA'].includes(c.docType)), (c) => c.amount);
      const cout = -U.sum(DB.s.cash.filter((c) => c.date >= f.start && c.date <= f.end && c.amount < 0 && c.docType !== 'TR'), (c) => c.amount);
      const end = f.end > U.today() ? U.today() : f.end;
      let rec = 0, pay = 0;
      for (const pp of DB.s.parties) { const b = E.balance('party', pp.id, end); if (b > 0) rec += b; else pay -= b; }
      const prc = E.posted('PRC', f.start, f.end);
      return { f, p, cin, cout, rec, pay, cash: U.sum(DB.s.accounts, (a) => E.cashBalance(a.id, end)), hours: U.sum(prc, (d) => d.hours), qty: U.sum(prc, (d) => d.qtyGood), inv: E.posted('SI', f.start, f.end).length };
    });
    const line = (l, fn, o = {}) => `<tr><td>${o.bold ? `<b>${l}</b>` : l}</td>${data.map((x, i) => { const v = fn(x); const pv = i ? fn(data[i - 1]) : null; return `<td class="num ${o.bold ? 'bold' : ''}">${o.int ? U.int(v) : U.money(v)}${pv ? ` <span class="tiny ${v >= pv ? 'pos' : 'neg'}">${v >= pv ? '▲' : '▼'}${Math.abs(Math.round(((v - pv) / Math.abs(pv || 1)) * 100))}%</span>` : ''}</td>`; }).join('')}</tr>`;
    return {
      noPeriod: true,
      html: `<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>البند</th>${data.map((x) => `<th class="num">${x.f.name} ${x.f.status === 'closed' ? '<span class="pill closed">مقفلة</span>' : ''}</th>`).join('')}</tr></thead><tbody>
        ${line('صافي المبيعات', (x) => x.p.revenue, { bold: true })}${line('عدد فواتير البيع', (x) => x.inv, { int: true })}${line('تكلفة المباع', (x) => x.p.cogs)}${line('مجمل الربح', (x) => x.p.gross, { bold: true })}
        ${line('المصروفات التشغيلية', (x) => x.p.expenses)}${line('أجور العمالة الداخلية', (x) => x.p.wages)}${line('الرسم والبرمجة', (x) => x.p.design)}${line('إيرادات أخرى', (x) => x.p.otherIncome)}
        ${line('صافي الربح التشغيلي', (x) => x.p.net, { bold: true })}
        <tr><td colspan="${data.length + 1}" style="background:var(--surface-2)" class="small muted"><b>النقدية والأرصدة</b></td></tr>
        ${line('النقدية الواردة', (x) => x.cin)}${line('النقدية الصادرة', (x) => x.cout)}${line('أرصدة الخزائن في نهاية السنة', (x) => x.cash)}${line('مستحق على الأطراف في نهاية السنة', (x) => x.rec)}${line('مستحق للأطراف في نهاية السنة', (x) => x.pay)}
        <tr><td colspan="${data.length + 1}" style="background:var(--surface-2)" class="small muted"><b>الإنتاج</b></td></tr>
        ${line('ساعات تشغيل الورش', (x) => x.hours, { int: true })}${line('القطع المستلمة من الورش', (x) => x.qty, { int: true })}
      </tbody></table></div></div>`,
    };
  };

  R['sales-customers'] = (from, to) => {
    const custs = DB.s.parties.filter((p) => p.types.includes('customer'));
    const si = E.posted('SI', from, to), sr = E.posted('SR', from, to), rc = E.posted('RC', from, to);
    const rows = custs.map((p) => {
      const s = si.filter((d) => d.sid === p.id), r = sr.filter((d) => d.sid === p.id);
      const sales = U.sum(s, (d) => d.totals.total), ret = U.sum(r, (d) => d.totals.total);
      const coll = U.sum(rc.filter((d) => d.sid === p.id), (d) => d.amount) + U.sum(s, (d) => d.paid || 0) - U.sum(r, (d) => d.paid || 0);
      return { p, n: s.length, sales, ret, net: U.r2(sales - ret), coll: U.r2(coll), profit: U.sum(s, (d) => d.calc.profit || 0) - U.sum(r, (d) => d.totals.net - d.calc.cogs), bal: E.balance('party', p.id, to) };
    }).filter((r) => r.n || r.ret || r.coll || Math.abs(r.bal) > 0.004);
    return {
      table: 'r-sc',
      strip: [['صافي المبيعات', `<span class="num">${U.money(U.sum(rows, (r) => r.net))}</span>`], ['المحصل', `<span class="num">${U.money(U.sum(rows, (r) => r.coll))}</span>`], ['نسبة التحصيل', pct(U.sum(rows, (r) => r.coll), U.sum(rows, (r) => r.net))], ['عدد العملاء النشطين', rows.filter((r) => r.n).length]],
      html: tbl('r-sc', rows, [
        { k: 'c', label: 'الكود', v: (r) => r.p.code, html: (r) => `<span class="code">${esc(r.p.code)}</span>` },
        { k: 'n', label: 'العميل', v: (r) => r.p.name, html: (r) => `<a href="#/party/${r.p.id}">${esc(r.p.name)}</a>` },
        { k: 'i', label: 'فواتير', num: true, v: (r) => r.n },
        { k: 's', label: 'المبيعات', num: true, v: (r) => r.sales, html: (r) => UI.money(r.sales), sum: true },
        { k: 'r', label: 'المرتجعات', num: true, v: (r) => r.ret, html: (r) => UI.money(r.ret, true), sum: true },
        { k: 'ne', label: 'الصافي', num: true, v: (r) => r.net, html: (r) => `<b>${U.money(r.net)}</b>`, sum: true },
        { k: 'co', label: 'المحصل', num: true, v: (r) => r.coll, html: (r) => UI.money(r.coll), sum: true },
        { k: 'pr', label: 'مجمل الربح', num: true, v: (r) => r.profit, html: (r) => UI.money(r.profit), sum: true },
        { k: 'b', label: 'الرصيد في ' + U.date(to), num: true, v: (r) => r.bal, html: (r) => UI.bal(r.bal), sum: (rs) => UI.bal(U.sum(rs, (r) => r.bal)) },
      ], { open: (r) => '#/party/' + r.p.id, sort: 'ne' }),
    };
  };

  R['sales-items'] = (from, to) => {
    const lines = E.posted('SI', from, to).flatMap((d) => d.lines.filter((l) => l.itemId).map((l) => ({ l, sign: 1 })))
      .concat(E.posted('SR', from, to).flatMap((d) => d.lines.filter((l) => l.itemId).map((l) => ({ l, sign: -1 }))));
    const by = U.groupBy(lines, (x) => x.l.itemId);
    const rows = [...by].map(([id, arr]) => {
      const qty = U.sum(arr, (x) => x.sign * x.l.baseQty), rev = U.sum(arr, (x) => x.sign * x.l.netExTax), cogs = U.sum(arr, (x) => x.sign * (x.l.cost || 0));
      return { it: DB.get('items', id), qty, rev, cogs, profit: U.r2(rev - cogs) };
    });
    return {
      table: 'r-si',
      strip: [['الكمية المباعة', U.int(U.sum(rows, (r) => r.qty))], ['الإيراد', `<span class="num">${U.money(U.sum(rows, (r) => r.rev))}</span>`], ['مجمل الربح', `<span class="num">${U.money(U.sum(rows, (r) => r.profit))}</span>`], ['الهامش', pct(U.sum(rows, (r) => r.profit), U.sum(rows, (r) => r.rev))]],
      html: tbl('r-si', rows, [
        { k: 'c', label: 'الكود', v: (r) => r.it.code, html: (r) => `<span class="code">${esc(r.it.code)}</span>` },
        { k: 'n', label: 'الصنف', v: (r) => r.it.name, html: (r) => UI.itemLink(r.it.id) },
        { k: 'q', label: 'الكمية', num: true, v: (r) => r.qty, html: (r) => U.qty(r.qty), sum: (rs) => U.qty(U.sum(rs, (r) => r.qty)) },
        { k: 'av', label: 'متوسط السعر', num: true, v: (r) => (r.qty ? r.rev / r.qty : 0), html: (r) => UI.money(r.qty ? r.rev / r.qty : 0) },
        { k: 'r', label: 'الإيراد (بدون ضريبة)', num: true, v: (r) => r.rev, html: (r) => UI.money(r.rev), sum: true },
        { k: 'co', label: 'التكلفة', num: true, v: (r) => r.cogs, html: (r) => UI.money(r.cogs), sum: true },
        { k: 'p', label: 'مجمل الربح', num: true, v: (r) => r.profit, html: (r) => `<b class="${r.profit < 0 ? 'neg' : ''}">${U.money(r.profit)}</b>`, sum: true },
        { k: 'm', label: 'الهامش', num: true, v: (r) => (r.rev ? r.profit / r.rev : 0), html: (r) => pct(r.profit, r.rev) },
      ], { open: (r) => '#/item/' + r.it.id, sort: 'r' }),
    };
  };

  R.purchases = (from, to) => {
    const sups = DB.s.parties.filter((p) => p.types.includes('supplier'));
    const pi = E.posted('PI', from, to), pr = E.posted('PR', from, to), py = E.posted('PY', from, to), ex = E.posted('EX', from, to);
    const rows = sups.map((p) => {
      const a = pi.filter((d) => d.sid === p.id);
      const purch = U.sum(a, (d) => d.totals.total), ret = U.sum(pr.filter((d) => d.sid === p.id), (d) => d.totals.total);
      const exC = U.sum(ex.filter((d) => d.sid === p.id && d.payMode === 'credit'), (d) => d.amount);
      const paid = U.sum(py.filter((d) => d.st === 'party' && d.sid === p.id), (d) => d.amount) + U.sum(a, (d) => d.paid || 0);
      return { p, n: a.length, purch, ret, exC, paid: U.r2(paid), bal: E.balance('party', p.id, to) };
    }).filter((r) => r.n || r.paid || Math.abs(r.bal) > 0.004);
    return {
      table: 'r-pu',
      html: tbl('r-pu', rows, [
        { k: 'n', label: 'المورد', v: (r) => r.p.name, html: (r) => `<a href="#/party/${r.p.id}">${esc(r.p.name)}</a>` },
        { k: 'i', label: 'فواتير', num: true, v: (r) => r.n },
        { k: 'p', label: 'المشتريات', num: true, v: (r) => r.purch, html: (r) => UI.money(r.purch), sum: true },
        { k: 'r', label: 'المرتجعات', num: true, v: (r) => r.ret, html: (r) => UI.money(r.ret, true), sum: true },
        { k: 'e', label: 'مصروفات آجلة', num: true, v: (r) => r.exC, html: (r) => UI.money(r.exC, true), sum: true },
        { k: 'pa', label: 'المدفوع', num: true, v: (r) => r.paid, html: (r) => UI.money(r.paid), sum: true },
        { k: 'b', label: 'الرصيد', num: true, v: (r) => r.bal, html: (r) => UI.bal(r.bal), sum: (rs) => UI.bal(U.sum(rs, (r) => r.bal)) },
      ], { open: (r) => '#/party/' + r.p.id }),
    };
  };

  R.expenses = (from, to) => {
    const items = [];
    E.posted('EX', from, to).forEach((d) => items.push({ catId: d.catId, v: d.amount, m: d.payMode === 'credit' ? 'آجل' : E.PAY_METHODS[d.method], ym: U.ym(d.date), src: 'سند مصروف' }));
    E.posted('PI', from, to).forEach((d) => d.lines.filter((l) => l.kind === 'expense').forEach((l) => items.push({ catId: l.catId, v: l.expValue != null ? l.expValue : l.netExTax, m: 'فاتورة مورد', ym: U.ym(d.date), src: 'بند في فاتورة شراء' })));
    E.posted('CI', from, to).forEach((d) => items.push({ catId: d.catId, v: d.calc.value, m: 'استهلاك مخزون', ym: U.ym(d.date), src: 'استهلاك داخلي' }));
    const by = U.groupBy(items, (x) => x.catId);
    const months = [...new Set(items.map((x) => x.ym))].sort();
    const total = U.sum(items, (x) => x.v);
    const rows = [...by].map(([catId, arr]) => ({ catId, total: U.sum(arr, (x) => x.v), n: arr.length, cash: U.sum(arr.filter((x) => !['آجل', 'استهلاك مخزون', 'فاتورة مورد'].includes(x.m)), (x) => x.v), credit: U.sum(arr.filter((x) => x.m === 'آجل' || x.m === 'فاتورة مورد'), (x) => x.v), stock: U.sum(arr.filter((x) => x.m === 'استهلاك مخزون'), (x) => x.v), byM: sumBy(arr, (x) => x.ym, (x) => x.v) }));
    return {
      table: 'r-ex',
      strip: [['إجمالي المصروفات', `<span class="num">${U.money(total)}</span>`], ['عدد البنود', rows.length], ['متوسط شهري', `<span class="num">${U.money(months.length ? total / months.length : 0)}</span>`]],
      note: 'يشمل: سندات المصروفات (نقدي/آجل) + بنود المصروف المباشر داخل فواتير الشراء + الاستهلاك الداخلي من المخزون (قطع غيار، إبر، شمع). لا يشمل شراء الخيوط والمستلزمات للمخزن.',
      html: tbl('r-ex', rows, [
        { k: 'c', label: 'البند', v: (r) => E.nameOf('expenseCats', r.catId), html: (r) => `<b>${esc(E.nameOf('expenseCats', r.catId))}</b>` },
        { k: 'n', label: 'عدد', num: true, v: (r) => r.n },
        { k: 'ca', label: 'مدفوع نقدًا/بنك', num: true, v: (r) => r.cash, html: (r) => UI.money(r.cash, true), sum: true },
        { k: 'cr', label: 'آجل/فواتير', num: true, v: (r) => r.credit, html: (r) => UI.money(r.credit, true), sum: true },
        { k: 'st', label: 'من المخزون', num: true, v: (r) => r.stock, html: (r) => UI.money(r.stock, true), sum: true },
        ...months.slice(-6).map((m) => ({ k: 'm' + m, label: U.monthLabel(m), num: true, v: (r) => r.byM.get(m) || 0, html: (r) => UI.money(r.byM.get(m) || 0, true) })),
        { k: 't', label: 'الإجمالي', num: true, v: (r) => r.total, html: (r) => `<b>${U.money(r.total)}</b>`, sum: true },
        { k: 'p', label: '%', num: true, v: (r) => r.total / (total || 1), html: (r) => pct(r.total, total) + UI.ibar(r.total / (rows.reduce((m, x) => Math.max(m, x.total), 0) || 1), 'var(--chart-3)') },
      ], { sort: 't' }),
    };
  };

  R.aging = (from, to) => {
    const side = st.opt === 'pay' ? 'pay' : 'rec';
    const parties = DB.s.parties.filter((p) => (side === 'rec' ? p.types.includes('customer') : p.types.some((t) => t !== 'customer')));
    const today = U.today();
    const rows = [];
    for (const p of parties) {
      const oi = E.openItems('party', p.id);
      if ((side === 'rec') !== (oi.side === 'receivable')) continue;
      const b = { p, b0: 0, b30: 0, b60: 0, b90: 0, total: 0, oldest: null };
      for (const x of oi.map.values()) {
        if (x.remaining <= 0.004) continue;
        const d = DB.get('docs', x.docId);
        const age = U.daysBetween(d.date, today);
        if (age <= 30) b.b0 += x.remaining; else if (age <= 60) b.b30 += x.remaining; else if (age <= 90) b.b60 += x.remaining; else b.b90 += x.remaining;
        b.total += x.remaining;
        if (!b.oldest || d.date < b.oldest) b.oldest = d.date;
      }
      if (b.total > 0.004) rows.push(b);
    }
    return {
      noPeriod: true, table: 'r-ag',
      strip: [['الإجمالي', `<span class="num">${U.money(U.sum(rows, (r) => r.total))}</span>`], ['حتى 30 يوم', `<span class="num">${U.money(U.sum(rows, (r) => r.b0))}</span>`], ['31-60', `<span class="num">${U.money(U.sum(rows, (r) => r.b30))}</span>`], ['61-90', `<span class="num warn">${U.money(U.sum(rows, (r) => r.b60))}</span>`], ['أكثر من 90', `<span class="num neg">${U.money(U.sum(rows, (r) => r.b90))}</span>`]],
      note: 'المتبقي من كل مستند بعد توزيع الدفعات على الأقدم أولًا (أو حسب التخصيص الصريح للدفعة). العمر محسوب من تاريخ المستند حتى اليوم.',
      html: `<div class="btn-group mb-12"><button class="btn sm ${side === 'rec' ? 'on' : ''}" data-act="rp-opt" data-v="rec">مستحق على العملاء</button><button class="btn sm ${side === 'pay' ? 'on' : ''}" data-act="rp-opt" data-v="pay">مستحق للموردين والورش</button></div>` + tbl('r-ag', rows, [
        { k: 'n', label: 'الطرف', v: (r) => r.p.name, html: (r) => `<a href="#/party/${r.p.id}">${esc(r.p.name)}</a>` },
        { k: 'o', label: 'أقدم مستند', v: (r) => r.oldest, html: (r) => `${U.date(r.oldest)} <span class="tiny muted">(${U.daysBetween(r.oldest, today)} يوم)</span>` },
        { k: 'a', label: '0–30', num: true, v: (r) => r.b0, html: (r) => UI.money(r.b0, true), sum: true },
        { k: 'b', label: '31–60', num: true, v: (r) => r.b30, html: (r) => UI.money(r.b30, true), sum: true },
        { k: 'c', label: '61–90', num: true, v: (r) => r.b60, html: (r) => `<span class="warn">${UI.money(r.b60, true)}</span>`, sum: true },
        { k: 'd', label: '+90', num: true, v: (r) => r.b90, html: (r) => `<span class="neg">${UI.money(r.b90, true)}</span>`, sum: true },
        { k: 't', label: 'الإجمالي', num: true, v: (r) => r.total, html: (r) => `<b>${U.money(r.total)}</b>`, sum: true },
      ], { open: (r) => '#/party/' + r.p.id, sort: 't' }),
    };
  };

  R.balances = (from, to) => {
    const rows = DB.s.parties.map((p) => ({ p, b: E.balance('party', p.id, to) })).filter((r) => Math.abs(r.b) > 0.004);
    return {
      noPeriod: true, table: 'r-bal',
      strip: [['إجمالي عليهم', `<span class="num" style="color:var(--info)">${U.money(U.sum(rows.filter((r) => r.b > 0), (r) => r.b))}</span>`], ['إجمالي لهم', `<span class="num" style="color:var(--accent)">${U.money(-U.sum(rows.filter((r) => r.b < 0), (r) => r.b))}</span>`]],
      html: tbl('r-bal', rows, [
        { k: 'c', label: 'الكود', v: (r) => r.p.code, html: (r) => `<span class="code">${esc(r.p.code)}</span>` },
        { k: 'n', label: 'الطرف', v: (r) => r.p.name, html: (r) => `<a href="#/party/${r.p.id}">${esc(r.p.name)}</a>` },
        { k: 't', label: 'النوع', v: (r) => r.p.types.map((t) => E.PARTY_TYPES[t]).join('، ') },
        { k: 'd', label: 'عليه (مدين)', num: true, v: (r) => (r.b > 0 ? r.b : 0), html: (r) => (r.b > 0 ? UI.money(r.b) : ''), sum: true },
        { k: 'cr', label: 'له (دائن)', num: true, v: (r) => (r.b < 0 ? -r.b : 0), html: (r) => (r.b < 0 ? UI.money(-r.b) : ''), sum: true },
      ], { open: (r) => '#/party/' + r.p.id }),
    };
  };

  R['stock-move'] = (from, to) => {
    const rows = DB.s.items.filter((i) => i.kind !== 'service').map((it) => {
      const c = E.stockCard(it.id, null, from, to);
      const inn = U.sum(c.rows, (r) => r.in), out = U.sum(c.rows, (r) => r.out);
      return { it, open: c.opening, inn, out, close: c.closing, val: U.r2(c.closing * E.avgCost(it.id)) };
    }).filter((r) => r.open || r.inn || r.out || r.close);
    return {
      table: 'r-sm',
      html: tbl('r-sm', rows, [
        { k: 'c', label: 'الكود', v: (r) => r.it.code, html: (r) => `<span class="code">${esc(r.it.code)}</span>` },
        { k: 'n', label: 'الصنف', v: (r) => r.it.name, html: (r) => UI.itemLink(r.it.id) },
        { k: 'u', label: 'الوحدة', v: (r) => r.it.unit },
        { k: 'o', label: 'أول المدة', num: true, v: (r) => r.open, html: (r) => U.qty(r.open) },
        { k: 'i', label: 'الوارد', num: true, v: (r) => r.inn, html: (r) => `<span class="pos">${U.qty(r.inn)}</span>` },
        { k: 'x', label: 'الصادر', num: true, v: (r) => r.out, html: (r) => `<span class="neg">${U.qty(r.out)}</span>` },
        { k: 'cl', label: 'آخر المدة', num: true, v: (r) => r.close, html: (r) => `<b>${U.qty(r.close)}</b>` },
        { k: 'v', label: 'القيمة (بمتوسط اليوم)', num: true, v: (r) => r.val, html: (r) => UI.money(r.val), sum: true },
      ], { open: (r) => '#/item/' + r.it.id }),
    };
  };

  R.outwork = (from, to) => {
    const prc = E.posted('PRC', from, to);
    const py = E.posted('PY', from, to).filter((d) => d.st === 'party');
    const key = (d) => d.sid + ':' + (DB.get('orders', d.woId) || {}).modelId;
    const by = U.groupBy(prc, key);
    const rows = [...by].map(([k, arr]) => {
      const [pid, mid] = k.split(':').map(Number);
      return { pid, mid, n: arr.length, hours: U.sum(arr, (d) => d.hours), qty: U.sum(arr, (d) => d.qtyGood), rej: U.sum(arr, (d) => d.qtyRejected), fees: U.sum(arr, (d) => d.calc.fee), mat: U.sum(arr, (d) => d.calc.materialCost || 0) };
    });
    const shops = [...new Set(rows.map((r) => r.pid))];
    return {
      table: 'r-ow',
      strip: [['الساعات', U.qty(U.sum(rows, (r) => r.hours))], ['القطع المستلمة', U.int(U.sum(rows, (r) => r.qty))], ['المصنعية', `<span class="num">${U.money(U.sum(rows, (r) => r.fees))}</span>`], ['السلف المدفوعة', `<span class="num">${U.money(U.sum(py.filter((d) => d.purpose === 'advance' && shops.includes(d.sid)), (d) => d.amount))}</span>`], ['المدفوعات للورش', `<span class="num">${U.money(U.sum(py.filter((d) => d.purpose !== 'advance' && shops.includes(d.sid)), (d) => d.amount))}</span>`]],
      html: tbl('r-ow', rows, [
        { k: 'p', label: 'الورشة', v: (r) => E.nameOf('parties', r.pid), html: (r) => `<a href="#/party/${r.pid}">${esc(E.nameOf('parties', r.pid))}</a>` },
        { k: 'm', label: 'الموديل', v: (r) => E.nameOf('models', r.mid) },
        { k: 'n', label: 'استلامات', num: true, v: (r) => r.n },
        { k: 'h', label: 'الساعات', num: true, v: (r) => r.hours, html: (r) => U.qty(r.hours), sum: (rs) => U.qty(U.sum(rs, (r) => r.hours)) },
        { k: 'q', label: 'المقبول', num: true, v: (r) => r.qty, html: (r) => U.int(r.qty), sum: (rs) => U.int(U.sum(rs, (r) => r.qty)) },
        { k: 'rj', label: 'المرفوض', num: true, v: (r) => r.rej, html: (r) => U.int(r.rej) },
        { k: 'f', label: 'المصنعية', num: true, v: (r) => r.fees, html: (r) => UI.money(r.fees), sum: true },
        { k: 'mt', label: 'تكلفة الخامات', num: true, v: (r) => r.mat, html: (r) => UI.money(r.mat), sum: true },
        { k: 'u', label: 'تكلفة القطعة', num: true, v: (r) => (r.qty ? (r.fees + r.mat) / r.qty : 0), html: (r) => UI.money(r.qty ? (r.fees + r.mat) / r.qty : 0) },
      ], { sort: 'f' }),
    };
  };

  R.materials = (from, to) => {
    const rows = DB.s.parties.filter((p) => p.types.includes('workshop')).map((p) => ({ p, r: E.reconcile(p.id, from, to) })).filter((x) => x.r.rows.length);
    return {
      table: 'r-mt',
      html: tbl('r-mt', rows, [
        { k: 'p', label: 'الورشة', v: (x) => x.p.name, html: (x) => `<a href="#/reconcile?p=${x.p.id}">${esc(x.p.name)}</a>` },
        { k: 'i', label: 'المسلم', num: true, v: (x) => U.sum(x.r.rows, (r) => r.issued), html: (x) => U.qty(U.sum(x.r.rows, (r) => r.issued)) },
        { k: 'r', label: 'المرتجع', num: true, v: (x) => U.sum(x.r.rows, (r) => r.returned), html: (x) => U.qty(U.sum(x.r.rows, (r) => r.returned)) },
        { k: 'c', label: 'المستهلك', num: true, v: (x) => x.r.consumed, html: (x) => U.qty(x.r.consumed) },
        { k: 'w', label: 'فاقد مُسوى', num: true, v: (x) => U.sum(x.r.rows, (r) => r.wasted), html: (x) => U.qty(U.sum(x.r.rows, (r) => r.wasted)) },
        { k: 'q', label: 'المنتج المستلم', num: true, v: (x) => x.r.qtyGood, html: (x) => U.int(x.r.qtyGood) },
        { k: 'e', label: 'المعياري', num: true, v: (x) => x.r.expected, html: (x) => U.qty(x.r.expected) },
        { k: 'a', label: 'المسموح', num: true, v: (x) => x.r.allowed, html: (x) => U.qty(x.r.allowed) },
        { k: 'v', label: 'الفرق', num: true, v: (x) => x.r.variance, html: (x) => `<b class="${x.r.variance > 0.5 ? 'neg' : 'pos'}">${x.r.variance > 0 ? '+' : ''}${U.qty(x.r.variance)}</b>` },
        { k: 'cu', label: 'العهدة الآن', num: true, v: (x) => U.sum(x.r.rows, (r) => r.custody), html: (x) => U.qty(U.sum(x.r.rows, (r) => r.custody)) },
      ]),
    };
  };

  R.labor = (from, to) => {
    const lines = E.posted('PAYR', from, to).flatMap((d) => d.lines.map((l) => ({ l, ym: U.ym(d.to) })));
    const months = [...new Set(lines.map((x) => x.ym))].sort();
    const by = U.groupBy(lines, (x) => x.l.deptId);
    const rows = [...by].map(([dep, arr]) => ({ dep, workers: new Set(arr.map((x) => x.l.workerId)).size, gross: U.sum(arr, (x) => x.l.gross), bonus: U.sum(arr, (x) => x.l.bonus), ded: U.sum(arr, (x) => x.l.deduction), net: U.sum(arr, (x) => x.l.net), byM: sumBy(arr, (x) => x.ym, (x) => x.l.net) }));
    return {
      table: 'r-lb',
      strip: [['إجمالي الأجور', `<span class="num">${U.money(U.sum(rows, (r) => r.net))}</span>`], ['المكافآت', `<span class="num">${U.money(U.sum(rows, (r) => r.bonus))}</span>`], ['الخصومات', `<span class="num">${U.money(U.sum(rows, (r) => r.ded))}</span>`], ['السلف القائمة', `<span class="num">${U.money(U.sum(DB.s.workers, (w) => Math.max(0, E.balance('worker', w.id))))}</span>`]],
      html: tbl('r-lb', rows, [
        { k: 'd', label: 'القسم', v: (r) => E.nameOf('departments', r.dep), html: (r) => `<b>${esc(E.nameOf('departments', r.dep))}</b>` },
        { k: 'w', label: 'العمال', num: true, v: (r) => r.workers },
        { k: 'g', label: 'الأجر المحسوب', num: true, v: (r) => r.gross, html: (r) => UI.money(r.gross), sum: true },
        { k: 'b', label: 'إضافي', num: true, v: (r) => r.bonus, html: (r) => UI.money(r.bonus, true), sum: true },
        { k: 'x', label: 'خصومات', num: true, v: (r) => r.ded, html: (r) => UI.money(r.ded, true), sum: true },
        ...months.slice(-6).map((m) => ({ k: 'm' + m, label: U.monthLabel(m), num: true, v: (r) => r.byM.get(m) || 0, html: (r) => UI.money(r.byM.get(m) || 0, true) })),
        { k: 'n', label: 'الصافي', num: true, v: (r) => r.net, html: (r) => `<b>${U.money(r.net)}</b>`, sum: true },
      ], { sort: 'n' }),
    };
  };

  R.design = (from, to) => {
    const lines = E.posted('DJ', from, to).flatMap((d) => d.lines.map((l) => ({ d, l })));
    return {
      table: 'r-ds',
      strip: [['عدد الموديلات', lines.length], ['إجمالي التكلفة', `<span class="num">${U.money(U.sum(lines, (x) => x.l.amount))}</span>`], ['المستحق للرسامين الآن', `<span class="num">${U.money(-U.sum(DB.s.parties.filter((p) => p.types.includes('designer')), (p) => Math.min(0, E.balance('party', p.id))))}</span>`]],
      html: tbl('r-ds', lines, [
        { k: 'm', label: 'الموديل', v: (x) => { const m = DB.get('models', x.l.modelId); return m.code + ' ' + m.name; }, html: (x) => { const m = DB.get('models', x.l.modelId); return `<a href="#/model/${m.id}"><span class="code">${esc(m.code)}</span> ${esc(m.name)}</a>`; } },
        { k: 'p', label: 'الرسام', v: (x) => E.nameOf('parties', x.d.sid) },
        { k: 'j', label: 'المهمة', v: (x) => x.d.no, html: (x) => UI.docLink(x.d) },
        { k: 'dt', label: 'التاريخ', v: (x) => x.d.date, html: (x) => U.date(x.d.date) },
        { k: 's', label: 'حالة السداد', v: (x) => E.modelDesign(x.l.modelId).label, html: (x) => { const ds = E.modelDesign(x.l.modelId); return `<span class="pill ${ds.status === 'paid' ? 'paid' : 'partial'}">${esc(ds.label)}</span>`; } },
        { k: 'a', label: 'التكلفة', num: true, v: (x) => x.l.amount, html: (x) => UI.money(x.l.amount), sum: true },
      ]),
    };
  };

  R.cashflow = (from, to) => {
    const ents = DB.s.cash.filter((c) => c.date >= from && c.date <= to);
    const typeRows = [...U.groupBy(ents, (c) => c.docType)].map(([t, arr]) => ({ t, in: U.sum(arr.filter((c) => c.amount > 0), (c) => c.amount), out: -U.sum(arr.filter((c) => c.amount < 0), (c) => c.amount) }));
    const accRows = DB.s.accounts.map((a) => { const s = E.cashStatement(a.id, from, to); return { a, open: s.opening, in: s.in, out: s.out, close: s.closing }; });
    return {
      table: 'r-cf',
      note: 'التحويلات بين الخزائن تظهر واردًا في حساب وصادرًا في آخر — صافيها صفر وليست إيرادًا أو مصروفًا. الأرقام تشمل الحركات العكسية للمستندات الملغاة (صافيها صفر).',
      html: `<div class="card mb-16"><div class="card-h"><h3>حسب الخزينة / البنك</h3></div>${UI.table({ id: 'r-cf', rows: accRows, search: false, noPage: true, csv: 'cashflow', open: (r) => '#/account/' + r.a.id, cols: [
        { k: 'a', label: 'الحساب', v: (r) => r.a.name, html: (r) => `<b>${esc(r.a.name)}</b>` },
        { k: 'o', label: 'أول المدة', num: true, v: (r) => r.open, html: (r) => UI.money(r.open), sum: true },
        { k: 'i', label: 'الوارد', num: true, v: (r) => r.in, html: (r) => `<span class="pos">${U.money(r.in)}</span>`, sum: true },
        { k: 'x', label: 'الصادر', num: true, v: (r) => r.out, html: (r) => `<span class="neg">${U.money(r.out)}</span>`, sum: true },
        { k: 'c', label: 'آخر المدة', num: true, v: (r) => r.close, html: (r) => `<b>${U.money(r.close)}</b>`, sum: true },
      ] })}</div>
      <div class="card"><div class="card-h"><h3>حسب نوع العملية</h3></div>${UI.table({ id: 'r-cf2', rows: typeRows, search: false, noPage: true, csv: 'cashflow-types', cols: [
        { k: 't', label: 'نوع المستند', v: (r) => E.TYPES[r.t].label },
        { k: 'i', label: 'الوارد', num: true, v: (r) => r.in, html: (r) => UI.money(r.in, true), sum: true },
        { k: 'o', label: 'الصادر', num: true, v: (r) => r.out, html: (r) => UI.money(r.out, true), sum: true },
        { k: 'n', label: 'الصافي', num: true, v: (r) => r.in - r.out, html: (r) => `<b class="${r.in - r.out < 0 ? 'neg' : 'pos'}">${U.money(r.in - r.out)}</b>`, sum: true },
      ] })}</div>`,
    };
  };

  R.tax = (from, to) => {
    const out = E.posted(['SI'], from, to).filter((d) => d.totals.tax), outR = E.posted(['SR'], from, to).filter((d) => d.totals.tax);
    const inn = E.posted(['PI'], from, to).filter((d) => d.totals.tax), innR = E.posted(['PR'], from, to).filter((d) => d.totals.tax);
    const outT = U.sum(out, (d) => d.totals.tax) - U.sum(outR, (d) => d.totals.tax), inT = U.sum(inn, (d) => d.totals.tax) - U.sum(innR, (d) => d.totals.tax);
    const docs = out.concat(outR, inn, innR).sort((a, b) => (a.date < b.date ? -1 : 1));
    return {
      table: 'r-tx',
      strip: [['ضريبة المبيعات (مخرجات)', `<span class="num">${U.money(outT)}</span>`], ['ضريبة المشتريات (مدخلات)', `<span class="num">${U.money(inT)}</span>`], ['الصافي المستحق', `<span class="num ${outT - inT > 0 ? 'neg' : 'pos'}">${U.money(outT - inT)}</span>`]],
      note: 'تقرير استرشادي من الفواتير المعتمدة. لا يفترض النظام أي امتثال ضريبي تلقائي — راجع الإعدادات مع المحاسب.',
      html: tbl('r-tx', docs, [
        { k: 'n', label: 'المستند', v: (d) => d.no, html: (d) => UI.docLink(d) },
        { k: 't', label: 'النوع', v: (d) => E.TYPES[d.type].label },
        { k: 'd', label: 'التاريخ', v: (d) => d.date, html: (d) => U.date(d.date) },
        { k: 'p', label: 'الطرف', v: (d) => E.nameOf('parties', d.sid) },
        { k: 'tn', label: 'الرقم الضريبي', v: (d) => (DB.get('parties', d.sid) || {}).taxNo || '' },
        { k: 'b', label: 'الوعاء', num: true, v: (d) => d.totals.net * (['SR', 'PR'].includes(d.type) ? -1 : 1), html: (d) => UI.money(d.totals.net * (['SR', 'PR'].includes(d.type) ? -1 : 1)) },
        { k: 'x', label: 'الضريبة', num: true, v: (d) => d.totals.tax * (['SR', 'PR'].includes(d.type) ? -1 : 1), html: (d) => UI.money(d.totals.tax * (['SR', 'PR'].includes(d.type) ? -1 : 1)) },
      ], { open: (d) => '#/doc/' + d.id }),
    };
  };
})();
