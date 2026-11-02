/* العمالة الداخلية: العمال، اليوميات، والموديلات والرسم */
(function () {
  const esc = U.esc;
  Pages.WS = {};
  const WF = { dept: '', type: '' };

  Pages.workers = {
    render() {
      let ws = DB.s.workers.slice();
      if (WF.dept) ws = ws.filter((w) => w.deptId === +WF.dept);
      if (WF.type) ws = ws.filter((w) => w.payType === WF.type);
      const y0 = U.year(U.today()) + '-01-01';
      const rows = ws.map((w) => ({ w, b: E.balance('worker', w.id), y: U.sum(E.posted('PAYR', y0, U.today()).flatMap((d) => d.lines.filter((l) => l.workerId === w.id)), (l) => l.net), pend: DB.s.workLogs.filter((l) => l.workerId === w.id && !l.payrollId).length }));
      const byDept = U.groupBy(DB.s.workers.filter((w) => w.active), (w) => w.deptId);
      return `
      <div class="page-h"><div class="titles"><h1>العمال</h1><div class="desc">عمال بالإنتاج، بالأسبوع، باليومية، بالساعة أو بالشهر — تريكو، تجهيز، مكواة، تشطيب… كل عامل بحسابه وسلفه</div></div>
        <div class="actions"><a class="btn" href="#/worklogs">${icon('calendar')} تسجيل يومية</a><button class="btn" data-act="new-doc" data-type="PAYR">${icon('users')} مسير أجور</button><button class="btn primary" data-act="worker-new">${icon('plus')} عامل جديد ${UI.k('alt+n')}</button></div></div>
      <div class="stat-strip mb-16">${[...byDept].map(([d, arr]) => `<div><div class="s-l">${esc(E.nameOf('departments', d))}</div><div class="s-v">${arr.length} <span class="small muted">عامل</span></div></div>`).join('')}
        <div><div class="s-l">مستحقات قائمة للعمال</div><div class="s-v num" style="text-align:right;color:var(--accent)">${U.money(-U.sum(rows.filter((r) => r.b < 0), (r) => r.b))}</div></div><div><div class="s-l">سلف قائمة على العمال</div><div class="s-v num" style="text-align:right;color:var(--info)">${U.money(U.sum(rows.filter((r) => r.b > 0), (r) => r.b))}</div></div></div>
      <div class="card">${UI.table({
        id: 'workers', rows, open: (r) => '#/worker/' + r.w.id, csv: 'workers', print: true, printTitle: 'العمال',
        toolbar: `${UI.sel('', [['', 'كل الأقسام']].concat(DB.s.departments.map((d) => [d.id, d.name])), WF.dept, { attrs: 'data-change="wk-f" data-k="dept" style="width:auto;height:34px"' })}${UI.sel('', [['', 'كل أنواع الأجر']].concat(Object.entries(E.PAY_TYPES)), WF.type, { attrs: 'data-change="wk-f" data-k="type" style="width:auto;height:34px"' })}`,
        rowCls: (r) => (!r.w.active ? 'is-void' : ''),
        cols: [
          { k: 'c', label: 'الكود', v: (r) => r.w.code, html: (r) => `<span class="code">${esc(r.w.code)}</span>` },
          { k: 'n', label: 'الاسم', v: (r) => r.w.name, html: (r) => `<b>${esc(r.w.name)}</b>${!r.w.active ? ' <span class="pill void">موقوف</span>' : ''}` },
          { k: 'd', label: 'القسم', v: (r) => E.nameOf('departments', r.w.deptId) },
          { k: 't', label: 'نوع الأجر', v: (r) => E.PAY_TYPES[r.w.payType], html: (r) => `<span class="tag">${E.PAY_TYPES[r.w.payType]}</span>` },
          { k: 'r', label: 'الأجر', num: true, v: (r) => r.w.rate || 0, html: (r) => (r.w.payType === 'piece' ? '<span class="small muted">حسب العملية</span>' : UI.money(r.w.rate)) },
          { k: 'p', label: 'يوميات غير محتسبة', num: true, v: (r) => r.pend, html: (r) => (r.pend ? `<span class="pill warn">${r.pend}</span>` : '<span class="muted">—</span>') },
          { k: 'y', label: 'أجور ' + U.year(U.today()), num: true, v: (r) => r.y, html: (r) => UI.money(r.y, true), sum: true },
          { k: 'b', label: 'الرصيد', num: true, v: (r) => r.b, html: (r) => UI.bal(r.b, 'worker') },
        ],
      })}</div>`;
    },
    mount() { App.current.newFn = () => Pages.editWorker(null); },
  };
  UI.acts['wk-f'] = (el) => { WF[el.dataset.k] = el.value; App.refresh(); };
  UI.acts['worker-new'] = () => Pages.editWorker(null);
  UI.acts['worker-edit'] = (el) => Pages.editWorker(+el.dataset.id);

  Pages.editWorker = (id) => {
    const w = id ? DB.get('workers', id) : { payType: 'weekly', active: true, startDate: U.today(), deptId: DB.s.departments[0] && DB.s.departments[0].id };
    UI.modal({
      title: id ? 'تعديل بيانات العامل' : 'عامل جديد',
      body: `<div class="grid g2">${UI.field('الكود', UI.inp('code', w.code || App.nextCode('W-', DB.s.workers)), { req: true })}${UI.field('الاسم', UI.inp('name', w.name, { attrs: 'autofocus' }), { req: true })}
        ${UI.field('القسم', UI.sel('deptId', DB.s.departments.map((d) => [d.id, d.name]), w.deptId))}${UI.field('الوظيفة', UI.inp('job', w.job, { ph: 'عامل تريكو، مكوجي…' }))}
        ${UI.field('نوع الأجر', UI.sel('payType', Object.entries(E.PAY_TYPES), w.payType, { attrs: 'data-pt' }))}${UI.field('قيمة الأجر', UI.inp('rate', w.rate || '', { num: true }), { hint: '<span data-pth></span>' })}
        ${UI.field('الهاتف', UI.inp('phone', w.phone))}${UI.field('تاريخ بداية العمل', UI.inp('startDate', w.startDate, { type: 'date' }))}
        ${id ? `<div class="row span-all">${UI.sw('active', w.active)} نشط <span class="small muted">— العامل الموقوف لا يدخل المسيرات الجديدة ويبقى تاريخه</span></div>` : ''}</div>`,
      onMount: (m) => { const s = m.querySelector('[data-pt]'), h = m.querySelector('[data-pth]'); const u = () => (h.textContent = { weekly: 'أجر الأسبوع', monthly: 'الراتب الشهري', daily: 'أجر اليوم', hour: 'أجر الساعة', piece: 'يُحسب من أسعار القطعة لكل عملية — اتركه صفرًا' }[s.value]); s.addEventListener('change', u); u(); },
      actions: [{ label: 'حفظ', cls: 'primary', primary: true, act: (m) => {
        const v = UI.readForm(m.el);
        if (!v.name.trim()) return UI.toast('الاسم مطلوب', 'danger');
        if (DB.s.workers.some((x) => x.code === v.code && x.id !== id)) return UI.toast('الكود مستخدم', 'danger');
        if (v.payType !== 'piece' && !(v.rate > 0)) return UI.toast('حدد قيمة الأجر', 'danger');
        const r = UI.run(() => DB.tx(() => { E.need('workers'); const data = { code: v.code, name: v.name.trim(), deptId: +v.deptId, job: v.job, payType: v.payType, rate: v.rate, phone: v.phone, startDate: v.startDate }; if (id) { Object.assign(DB.get('workers', id), data, { active: v.active }); DB.audit('تعديل عامل', 'worker', id, v.name); return DB.get('workers', id); } const x = DB.add('workers', Object.assign(data, { active: true })); DB.audit('إضافة عامل', 'worker', x.id, x.name); return x; }), 'تم الحفظ');
        if (r) { m.close(); if (!id) location.hash = '#/worker/' + r.id; else App.refresh(); }
      } }, { label: 'تراجع' }],
    });
  };

  Pages.worker = {
    render({ id }, q) {
      const w = DB.get('workers', id);
      if (!w) return UI.empty('العامل غير موجود');
      const tab = q.tab || 'statement';
      const st = Pages.WS[id] || (Pages.WS[id] = { from: U.year(U.today()) + '-01-01', to: U.today(), showVoid: false });
      const b = E.balance('worker', id);
      const y0 = U.year(U.today()) + '-01-01';
      const payr = E.posted('PAYR').filter((d) => d.lines.some((l) => l.workerId === id)).reverse();
      const yW = U.sum(payr.filter((d) => d.date >= y0).flatMap((d) => d.lines.filter((l) => l.workerId === id)), (l) => l.net);
      const adv = U.sum(E.posted('PY', y0).filter((d) => d.st === 'worker' && d.sid === id && d.purpose === 'advance'), (d) => d.amount);
      const logs = DB.s.workLogs.filter((l) => l.workerId === id).slice().reverse();
      return `
      <div class="crumbs"><a href="#/workers">العمال</a> ‹ <span class="code">${esc(w.code)}</span></div>
      <div class="page-h"><div class="titles"><div class="profile-h"><div class="big-avatar">${UI.initials(w.name)}</div><div><h1>${esc(w.name)} ${!w.active ? '<span class="pill void">موقوف</span>' : ''}</h1><div class="desc"><span class="code">${esc(w.code)}</span> · ${esc(E.nameOf('departments', w.deptId))}${w.job ? ' · ' + esc(w.job) : ''} · ${E.PAY_TYPES[w.payType]}${w.payType !== 'piece' ? ' ' + U.money(w.rate) : ''}</div></div></div></div>
        <div class="actions"><a class="btn" href="#/worklogs?w=${id}">${icon('calendar')} يومية</a><button class="btn" data-act="new-doc" data-type="PY" data-q='${JSON.stringify({ st: 'worker', sid: id, purpose: 'advance' })}'>${icon('coins')} سلفة</button>${b < -0.004 ? `<button class="btn primary" data-act="new-doc" data-type="PY" data-q='${JSON.stringify({ st: 'worker', sid: id, amount: -b })}'>${icon('wallet')} صرف المستحق ${U.money(-b)}</button>` : ''}<button class="btn icon" data-act="worker-edit" data-id="${id}">${icon('edit')}</button></div></div>
      <div class="stat-strip mb-16"><div><div class="s-l">الرصيد</div><div class="s-v">${UI.bal(b, 'worker')}</div></div><div><div class="s-l">أجور ${U.year(U.today())}</div><div class="s-v num" style="text-align:right">${U.money(yW)}</div></div><div><div class="s-l">سلف ${U.year(U.today())}</div><div class="s-v num" style="text-align:right">${U.money(adv)}</div></div><div><div class="s-l">يوميات غير محتسبة</div><div class="s-v">${logs.filter((l) => !l.payrollId).length}</div></div><div><div class="s-l">بداية العمل</div><div class="s-v small">${U.date(w.startDate)}</div></div></div>
      <div class="tabs">${[['statement', 'كشف الحساب'], ['payroll', 'المسيرات'], ['logs', 'اليوميات'], ['years', 'عبر السنوات']].map(([k, l]) => `<a href="#/worker/${id}?tab=${k}" class="${tab === k ? 'on' : ''}">${l}</a>`).join('')}</div>
      ${tab === 'statement' ? Pages.statementCard('worker', id, st) : ''}
      ${tab === 'payroll' ? `<div class="card">${UI.table({ id: 'wpr-' + id, rows: payr, open: (d) => '#/doc/' + d.id, cols: [
        { k: 'n', label: 'المسير', v: (d) => d.no, html: (d) => `<span class="code">${esc(d.no)}</span>` },
        { k: 'p', label: 'الفترة', v: (d) => d.from, html: (d) => U.date(d.from) + ' ← ' + U.date(d.to) },
        { k: 'bs', label: 'أساس الحساب', v: (d) => d.lines.find((l) => l.workerId === id).basis, html: (d) => `<span class="small text-2">${esc(d.lines.find((l) => l.workerId === id).basis)}</span>`, cls: 'wrap' },
        { k: 'g', label: 'الأجر', num: true, v: (d) => d.lines.find((l) => l.workerId === id).gross, html: (d) => UI.money(d.lines.find((l) => l.workerId === id).gross) },
        { k: 'bo', label: 'إضافي', num: true, v: (d) => d.lines.find((l) => l.workerId === id).bonus, html: (d) => UI.money(d.lines.find((l) => l.workerId === id).bonus, true) },
        { k: 'de', label: 'خصم', num: true, v: (d) => d.lines.find((l) => l.workerId === id).deduction, html: (d) => UI.money(d.lines.find((l) => l.workerId === id).deduction, true) },
        { k: 'ne', label: 'الصافي', num: true, v: (d) => d.lines.find((l) => l.workerId === id).net, html: (d) => `<b>${UI.money(d.lines.find((l) => l.workerId === id).net)}</b>`, sum: true },
      ] })}</div>` : ''}
      ${tab === 'logs' ? `<div class="card">${logsTable('wlogs-' + id, logs, false)}</div>` : ''}
      ${tab === 'years' ? Pages.yearCards('worker', id, w) : ''}`;
    },
    mount(el, { id }) { UI.pageKeys = { 'mod+p': () => Pages.printStatement('worker', id) }; },
  };

  function logsTable(tid, logs, showWorker) {
    return UI.table({ id: tid, rows: logs, csv: 'work-logs', cols: [
      showWorker ? { k: 'w', label: 'العامل', v: (l) => E.nameOf('workers', l.workerId), html: (l) => `<a href="#/worker/${l.workerId}">${esc(E.nameOf('workers', l.workerId))}</a>` } : null,
      { k: 'd', label: 'التاريخ', v: (l) => l.date, html: (l) => U.date(l.date) },
      { k: 'k', label: 'النوع', v: (l) => ({ pieces: 'إنتاج', days: 'حضور', hours: 'ساعات' }[l.kind]) },
      { k: 'op', label: 'العملية / الموديل', v: (l) => (l.opId ? E.nameOf('operations', l.opId) : '') + ' ' + (l.modelId ? E.nameOf('models', l.modelId) : ''), html: (l) => `${l.opId ? esc(E.nameOf('operations', l.opId)) : ''}${l.modelId ? ` <span class="tiny muted">${esc((DB.get('models', l.modelId) || {}).code || '')}</span>` : ''}` },
      { k: 'q', label: 'الكمية', num: true, v: (l) => l.qty, html: (l) => `${U.qty(l.qty)} <span class="tiny muted">${{ pieces: 'قطعة', days: 'يوم', hours: 'ساعة' }[l.kind]}</span>` },
      { k: 'r', label: 'السعر', num: true, v: (l) => (l.kind === 'pieces' ? E.opRate(l.opId, l.date) : (DB.get('workers', l.workerId) || {}).rate || 0), html: (l) => UI.money(l.kind === 'pieces' ? E.opRate(l.opId, l.date) : (DB.get('workers', l.workerId) || {}).rate || 0) },
      { k: 'v', label: 'القيمة التقديرية', num: true, v: (l) => l.qty * (l.kind === 'pieces' ? E.opRate(l.opId, l.date) : (DB.get('workers', l.workerId) || {}).rate || 0), html: (l) => UI.money(l.qty * (l.kind === 'pieces' ? E.opRate(l.opId, l.date) : (DB.get('workers', l.workerId) || {}).rate || 0)), sum: true },
      { k: 'p', label: 'الاحتساب', v: (l) => (l.payrollId ? 'محتسب' : 'غير محتسب'), html: (l) => (l.payrollId ? `<a class="pill ok" href="#/doc/${l.payrollId}">محتسب ${esc((DB.get('docs', l.payrollId) || {}).no || '')}</a>` : '<span class="pill warn">غير محتسب</span>') },
      { k: 'x', label: '', html: (l) => (!l.payrollId && E.can('workers') ? `<button class="btn xs ghost" data-act="log-del" data-id="${l.id}" title="حذف">${icon('trash')}</button>` : '') },
    ].filter(Boolean) });
  }
  UI.acts['log-del'] = async (el) => {
    if (!(await UI.confirm({ title: 'حذف اليومية', message: 'اليومية غير محتسبة في أي مسير — سيتم حذفها.', danger: true, ok: 'حذف' }))) return;
    if (UI.run(() => DB.tx(() => { E.need('workers'); const l = DB.get('workLogs', +el.dataset.id); if (l.payrollId) E.fail('اليومية محتسبة في مسير معتمد — ألغِ المسير أولًا'); DB.remove('workLogs', l.id); DB.audit('حذف يومية', 'worklog', l.id, E.nameOf('workers', l.workerId)); return true; }), 'تم الحذف')) App.refresh();
  };

  /* يوميات الإنتاج — إدخال سريع جماعي */
  const LG = { date: U.today(), from: U.startOfMonth(U.today()), to: U.today() };
  Pages.worklogs = {
    render(p, q) {
      const ws = DB.s.workers.filter((w) => w.active && ['piece', 'daily', 'hour'].includes(w.payType) && (!q.w || w.id === +q.w));
      const logs = DB.s.workLogs.filter((l) => l.date >= LG.from && l.date <= LG.to && (!q.w || l.workerId === +q.w)).slice().reverse();
      const ops = DB.s.operations;
      return `
      <div class="page-h"><div class="titles"><h1>يوميات الإنتاج والحضور</h1><div class="desc">سجّل إنتاج عمال القطعة وحضور عمال اليومية وساعات عمال الساعة — تُحتسب تلقائيًا في المسير ولا تُحتسب مرتين</div></div>
        <div class="actions"><button class="btn" data-act="new-doc" data-type="PAYR">${icon('users')} احتساب مسير</button></div></div>
      <div class="card mb-16"><div class="card-h"><h3>${icon('zap')} إدخال سريع</h3><span class="grow"></span><div class="row"><span class="small">التاريخ</span><input type="date" class="input" style="width:150px;height:32px" value="${LG.date}" data-change="lg-date"></div></div>
        <div class="tbl-wrap"><table class="lines" id="lg-grid"><thead><tr><th>العامل</th><th>القسم</th><th>نوع الأجر</th><th style="width:220px">العملية</th><th style="width:220px">الموديل (اختياري)</th><th style="width:120px" class="num">الكمية</th><th style="width:120px" class="num">القيمة</th></tr></thead><tbody>
        ${ws.map((w) => `<tr data-w="${w.id}"><td><b>${esc(w.name)}</b> <span class="code">${esc(w.code)}</span></td><td class="small">${esc(E.nameOf('departments', w.deptId))}</td><td><span class="tag">${E.PAY_TYPES[w.payType]}</span></td>
          <td>${w.payType === 'piece' ? `<select class="input" data-lg="op">${ops.filter((o) => o.deptId === w.deptId).concat(ops.filter((o) => o.deptId !== w.deptId)).map((o) => `<option value="${o.id}">${esc(o.name)} (${U.money(E.opRate(o.id, LG.date))})</option>`).join('')}</select>` : `<span class="small muted">${w.payType === 'daily' ? 'أيام حضور' : 'ساعات عمل'}</span>`}</td>
          <td>${w.payType === 'piece' ? UI.combo({ source: 'models', attrs: 'data-lg="model"', placeholder: '—' }) : ''}</td>
          <td><input class="input num" data-lg="qty" placeholder="0" inputmode="decimal"></td><td class="calc" data-lg="val">—</td></tr>`).join('')}
        </tbody></table></div>
        <div class="card-f row"><button class="btn primary" data-act="lg-save">${icon('check')} حفظ اليوميات ${UI.k('mod+s')}</button><span class="small muted">الصفوف الفارغة تُتجاهل · ${UI.k('Enter')} للانتقال للصف التالي</span></div></div>
      <div class="card"><div class="card-h"><h3>اليوميات المسجلة</h3><span class="grow"></span><div class="period-bar"><input type="date" class="input" value="${LG.from}" data-change="lg-f" data-k="from"><input type="date" class="input" value="${LG.to}" data-change="lg-f" data-k="to"></div></div>${logsTable('worklogs', logs, true)}</div>`;
    },
    mount(el) {
      const grid = el.querySelector('#lg-grid');
      const val = (tr) => {
        const w = DB.get('workers', +tr.dataset.w);
        const q = U.num(tr.querySelector('[data-lg="qty"]').value);
        const op = tr.querySelector('[data-lg="op"]');
        const r = w.payType === 'piece' ? E.opRate(+op.value, LG.date) : w.rate;
        tr.querySelector('[data-lg="val"]').textContent = q ? U.money(q * r) : '—';
      };
      grid.addEventListener('input', (e) => { const tr = e.target.closest('tr[data-w]'); if (tr) val(tr); });
      grid.addEventListener('change', (e) => { const tr = e.target.closest('tr[data-w]'); if (tr) val(tr); });
      grid.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-lg="qty"]')) { e.preventDefault(); const tr = e.target.closest('tr').nextElementSibling; const n = tr && tr.querySelector('[data-lg="qty"]'); if (n) n.focus(); else UI.acts['lg-save'](); } });
      UI.pageKeys = { 'mod+s': () => UI.acts['lg-save']() };
      const f = grid.querySelector('[data-lg="qty"]'); f && setTimeout(() => f.focus(), 50);
    },
  };
  UI.acts['lg-date'] = (el) => { LG.date = el.value; App.refresh(); };
  UI.acts['lg-f'] = (el) => { LG[el.dataset.k] = el.value; App.refresh(); };
  UI.acts['lg-save'] = () => {
    const rows = [...document.querySelectorAll('#lg-grid tr[data-w]')].map((tr) => {
      const w = DB.get('workers', +tr.dataset.w);
      const qty = U.num(tr.querySelector('[data-lg="qty"]').value);
      const op = tr.querySelector('[data-lg="op"]');
      const md = tr.querySelector('[data-lg="model"] input[type=hidden]');
      return { w, qty, opId: op ? +op.value : null, modelId: md && md.value ? +md.value : null };
    }).filter((r) => r.qty > 0);
    if (!rows.length) return UI.toast('اكتب كمية لعامل واحد على الأقل', 'warning');
    if (rows.some((r) => r.qty > (r.w.payType === 'daily' ? 31 : r.w.payType === 'hour' ? 24 * 31 : 1e6))) return UI.toast('كمية غير منطقية — راجع الأرقام', 'danger');
    const ok = UI.run(() => DB.tx(() => {
      E.need('workers');
      E.checkFY(LG.date);
      for (const r of rows) { const l = DB.add('workLogs', { workerId: r.w.id, date: LG.date, kind: r.w.payType === 'piece' ? 'pieces' : r.w.payType === 'daily' ? 'days' : 'hours', opId: r.opId, modelId: r.modelId, qty: r.qty, note: '', payrollId: null }); DB.audit('تسجيل يومية', 'worklog', l.id, `${r.w.name}: ${r.qty}`); }
      return true;
    }), `تم حفظ ${rows.length} يومية`);
    if (ok) App.refresh();
  };

  /* ───────── الموديلات ───────── */
  const MS = { new: 'جديد', in_progress: 'قيد العمل', done: 'مكتمل', archived: 'مؤرشف' };
  const msPill = (s) => `<span class="pill ${{ new: 'info', in_progress: 'warn', done: 'ok', archived: 'plain' }[s]}">${MS[s]}</span>`;
  const MF = { status: '' };
  Pages.models = {
    render() {
      let ms = DB.s.models.slice().reverse();
      if (MF.status) ms = ms.filter((m) => m.status === MF.status);
      const rows = ms.map((m) => ({ m, ds: E.modelDesign(m.id), it: m.itemId ? DB.get('items', m.itemId) : null }));
      const undesigned = DB.s.models.filter((m) => E.modelDesign(m.id).status === 'none');
      return `
      <div class="page-h"><div class="titles"><h1>الموديلات</h1><div class="desc">كود واسم ووصف كل موديل، استهلاك الخيط للقطعة، حالة الرسم والبرمجة، وتكلفته — وربطه بالمنتج في المخزن</div></div>
        <div class="actions">${undesigned.length ? `<button class="btn" data-act="new-doc" data-type="DJ" data-q='${JSON.stringify({ models: undesigned.map((m) => m.id).join(',') })}'>${icon('pen')} إسناد ${undesigned.length} موديل للرسام</button>` : ''}<button class="btn primary" data-act="model-new">${icon('plus')} موديل جديد ${UI.k('alt+n')}</button></div></div>
      <div class="card">
        <div class="tabs" style="padding:0 12px;margin:0">${[['', 'الكل'], ...Object.entries(MS)].map(([k, l]) => `<button class="${MF.status === k ? 'on' : ''}" data-act="md-f" data-v="${k}">${l} <span class="cnt">${DB.s.models.filter((m) => !k || m.status === k).length}</span></button>`).join('')}</div>
        ${UI.table({ id: 'models', rows, open: (r) => '#/model/' + r.m.id, csv: 'models', cols: [
          { k: 'c', label: 'الكود', v: (r) => r.m.code, html: (r) => `<span class="code">${esc(r.m.code)}</span>` },
          { k: 'n', label: 'الموديل', v: (r) => r.m.name, html: (r) => `<b>${esc(r.m.name)}</b>${r.m.description ? `<div class="tiny muted ellipsis" style="max-width:280px">${esc(r.m.description)}</div>` : ''}`, cls: 'wrap' },
          { k: 'cat', label: 'التصنيف', v: (r) => E.nameOf('modelCats', r.m.catId) },
          { k: 'y', label: 'الخيط / القطعة', v: (r) => r.m.yarnPerPiece, html: (r) => `<span class="num">${r.m.yarnPerPiece} كجم</span> <span class="tiny muted">${esc(E.nameOf('items', r.m.yarnId))}</span>` },
          { k: 'ds', label: 'الرسم والبرمجة', v: (r) => r.ds.label, html: (r) => `<span class="pill ${{ none: 'plain', draft: 'draft', due: 'partial', paid: 'paid' }[r.ds.status]}">${esc(r.ds.label)}</span>` },
          { k: 'dc', label: 'تكلفة الرسم', num: true, v: (r) => r.ds.cost, html: (r) => UI.money(r.ds.cost, true), sum: true },
          { k: 'st', label: 'المخزون', num: true, v: (r) => (r.it ? E.onHand(r.it.id) : 0), html: (r) => (r.it ? U.qty(E.onHand(r.it.id)) : '<span class="muted small">غير مربوط</span>') },
          { k: 's', label: 'الحالة', v: (r) => MS[r.m.status], html: (r) => msPill(r.m.status) },
          { k: 'd', label: 'تاريخ الإنشاء', v: (r) => r.m.createdAt, html: (r) => `<span class="small">${U.date(r.m.createdAt)}</span>` },
        ] })}
      </div>`;
    },
    mount() { App.current.newFn = () => Pages.editModel(null); },
  };
  UI.acts['md-f'] = (el) => { MF.status = el.dataset.v; App.refresh(); };
  UI.acts['model-new'] = () => Pages.editModel(null);
  UI.acts['model-edit'] = (el) => Pages.editModel(+el.dataset.id);

  Pages.editModel = (id) => {
    const m = id ? DB.get('models', id) : { status: 'new', wastePct: 5, yarnPerPiece: '', stdHours: '', createdAt: U.today(), catId: DB.s.modelCats[0] && DB.s.modelCats[0].id };
    UI.modal({
      title: id ? 'تعديل الموديل ' + esc(m.code) : 'موديل جديد', size: 'lg',
      body: `<div class="grid g3">${UI.field('كود الموديل', UI.inp('code', m.code || ''), { req: true, hint: 'مثال: M-130' })}${UI.field('اسم الموديل', UI.inp('name', m.name, { attrs: 'autofocus' }), { req: true, cls: 'span-2' })}
        ${UI.field('التصنيف', UI.sel('catId', DB.s.modelCats.map((c) => [c.id, c.name]), m.catId))}${UI.field('الموسم', UI.inp('season', m.season || 'شتاء'))}${UI.field('الحالة', UI.sel('status', Object.entries(MS), m.status))}
        ${UI.field('الخيط الأساسي', UI.combo({ source: 'items', arg: 'kind:raw', name: 'yarnId', value: m.yarnId }))}${UI.field('استهلاك الخيط للقطعة (كجم)', UI.inp('yarnPerPiece', m.yarnPerPiece, { num: true }), { req: true })}${UI.field('نسبة الهالك المسموحة %', UI.inp('wastePct', m.wastePct, { num: true }))}
        ${UI.field('ساعات تشغيل معيارية للقطعة', UI.inp('stdHours', m.stdHours, { num: true }))}${UI.field('المقاسات', UI.inp('sizes', m.sizes))}${UI.field('الألوان', UI.inp('colors', m.colors))}
        ${UI.field('الوصف', UI.area('description', m.description, { rows: 2 }), { cls: 'span-all' })}
        ${!id ? `<div class="span-all">${UI.chk('makeItem', true, 'إنشاء صنف منتج تام مربوط بالموديل في المخزن')} <span class="small muted">— بسعر بيع:</span> <input class="input num" name="salePrice" data-num style="width:120px;display:inline-block;height:30px" placeholder="0"></div>` : ''}</div>`,
      actions: [{ label: 'حفظ', cls: 'primary', primary: true, act: (mm) => {
        const v = UI.readForm(mm.el);
        if (!v.code.trim() || !v.name.trim()) return UI.toast('الكود والاسم مطلوبان', 'danger');
        if (DB.s.models.some((x) => x.code === v.code.trim() && x.id !== id)) return UI.toast('كود الموديل مستخدم', 'danger');
        const r = UI.run(() => DB.tx(() => {
          E.need('models');
          const data = { code: v.code.trim(), name: v.name.trim(), catId: +v.catId, season: v.season, status: v.status, yarnId: v.yarnId, yarnPerPiece: v.yarnPerPiece, wastePct: v.wastePct, stdHours: v.stdHours, sizes: v.sizes, colors: v.colors, description: v.description };
          if (id) { Object.assign(DB.get('models', id), data); DB.audit('تعديل موديل', 'model', id, data.code); return DB.get('models', id); }
          const x = DB.add('models', Object.assign(data, { createdAt: U.today() }));
          if (v.makeItem) { const fg = DB.s.itemCats.find((c) => c.name.includes('تام')); const it = DB.add('items', { code: 'FG-' + data.code.replace(/[^A-Za-z0-9]/g, ''), name: data.name, catId: fg ? fg.id : DB.s.itemCats[0].id, kind: 'finished', unit: 'قطعة', salePrice: v.salePrice || 0, lastCost: 0, reorder: 0, modelId: x.id, active: true, altUnit: '', altFactor: 0 }); x.itemId = it.id; }
          DB.audit('إضافة موديل', 'model', x.id, data.code);
          return x;
        }), 'تم حفظ الموديل');
        if (r) { mm.close(); if (!id) location.hash = '#/model/' + r.id; else App.refresh(); }
      } }, { label: 'تراجع' }],
    });
  };

  Pages.model = {
    render({ id }) {
      const m = DB.get('models', id);
      if (!m) return UI.empty('الموديل غير موجود');
      const ds = E.modelDesign(id);
      const it = m.itemId ? DB.get('items', m.itemId) : null;
      const orders = DB.s.orders.filter((o) => o.modelId === id).map((o) => ({ o, s: E.orderSummary(o.id) })).reverse();
      const prod = U.sum(orders, (x) => x.s.qtyGood), hrs = U.sum(orders, (x) => x.s.hours), fees = U.sum(orders, (x) => x.s.fees), mat = U.sum(orders, (x) => x.s.materialCost);
      const sold = it ? E.posted('SI').flatMap((d) => d.lines.filter((l) => l.itemId === it.id)) : [];
      const yarn = DB.get('items', m.yarnId);
      const estCost = U.r2(m.yarnPerPiece * (1 + (m.wastePct || 0) / 100) * (yarn ? E.avgCost(yarn.id) : 0) + (m.stdHours || 0) * ((E.rateFor('workshop', null, 'hour', U.today()) || {}).rate || 0));
      return `
      <div class="crumbs"><a href="#/models">الموديلات</a> ‹ <span class="code">${esc(m.code)}</span></div>
      <div class="page-h"><div class="titles"><h1>${icon('shirt')} ${esc(m.code)} — ${esc(m.name)} ${msPill(m.status)}</h1><div class="desc">${esc(E.nameOf('modelCats', m.catId))} · ${esc(m.season || '')} · ${esc(m.description || '')}</div></div>
        <div class="actions">${ds.status === 'none' ? `<button class="btn" data-act="new-doc" data-type="DJ" data-q='${JSON.stringify({ models: String(id) })}'>${icon('pen')} إسناد للرسام</button>` : ''}${it ? `<button class="btn" data-act="wo-new">${icon('layers')} أمر تشغيل</button>` : ''}<button class="btn icon" data-act="model-edit" data-id="${id}">${icon('edit')}</button></div></div>
      <div class="stat-strip mb-16">
        <div><div class="s-l">الرسم والبرمجة</div><div class="s-v small">${esc(ds.label)}${ds.job ? ` · <a href="#/doc/${ds.job.id}">${esc(E.docNo(ds.job))}</a>` : ''}</div></div>
        <div><div class="s-l">تكلفة الرسم</div><div class="s-v num" style="text-align:right">${U.money(ds.cost)}</div></div>
        <div><div class="s-l">الإنتاج الكلي</div><div class="s-v">${U.int(prod)} قطعة</div></div>
        <div><div class="s-l">ساعات التشغيل</div><div class="s-v">${U.qty(hrs)}</div></div>
        <div><div class="s-l">تكلفة القطعة الفعلية</div><div class="s-v num" style="text-align:right">${prod ? U.money((fees + mat) / prod) : '—'}</div></div>
        <div><div class="s-l">تكلفة تقديرية حالية</div><div class="s-v num" style="text-align:right">${U.money(estCost)}</div></div>
        ${it ? `<div><div class="s-l">المباع · المخزون</div><div class="s-v">${U.int(U.sum(sold, (l) => l.baseQty))} · ${U.int(E.onHand(it.id))}</div></div>` : ''}
      </div>
      <div class="grid g2" style="align-items:start">
        <div class="card"><div class="card-h"><h3>المواصفات الفنية</h3></div><div class="info-list">
          <div class="i-row"><span>الخيط الأساسي</span><span>${yarn ? UI.itemLink(yarn.id) : '—'}</span></div>
          <div class="i-row"><span>استهلاك الخيط للقطعة</span><b class="num">${m.yarnPerPiece} كجم</b></div>
          <div class="i-row"><span>الهالك المسموح</span><span class="num">${m.wastePct}%</span></div>
          <div class="i-row"><span>ساعات معيارية للقطعة</span><span class="num">${m.stdHours || '—'}</span></div>
          <div class="i-row"><span>المقاسات</span><span>${esc(m.sizes || '—')}</span></div>
          <div class="i-row"><span>الصنف في المخزن</span><span>${it ? `<a href="#/item/${it.id}"><span class="code">${esc(it.code)}</span></a> · سعر ${U.money(it.salePrice)}` : '<span class="muted">غير مربوط</span>'}</span></div>
        </div></div>
        <div class="card"><div class="card-h"><h3>أوامر التشغيل لهذا الموديل</h3></div>${orders.length ? UI.table({ id: 'm-orders-' + id, rows: orders, search: false, noPage: true, open: (x) => '#/order/' + x.o.id, cols: [
          { k: 'n', label: 'الأمر', html: (x) => `<span class="code">${esc(x.o.no)}</span>` }, { k: 'p', label: 'الورشة', html: (x) => esc(E.nameOf('parties', x.o.partyId)) },
          { k: 'q', label: 'مستلم', num: true, html: (x) => U.int(x.s.qtyGood) }, { k: 'h', label: 'ساعات', num: true, html: (x) => U.qty(x.s.hours) }, { k: 'f', label: 'مصنعية', num: true, html: (x) => UI.money(x.s.fees) },
        ] }) : `<div class="card-b">${UI.empty('لم يُشغل بعد', '', 'layers')}</div>`}</div>
      </div>`;
    },
  };
})();
