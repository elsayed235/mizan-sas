/* شاشة الاستيراد والتصدير: اختيار النوع ← الملف أو اللصق ← مطابقة الأعمدة ← المراجعة ← تم (مع التراجع) */
(function () {
  const esc = U.esc;
  const I = window.Importer;
  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const ROUTES = { items: 'items', customers: 'customers', suppliers: 'suppliers', workshops: 'workshops', partyBalances: 'opening', stockOpening: 'opening', cashOpening: 'opening' };
  const GROUPS = [['البيانات الأساسية', ['items', 'customers', 'suppliers', 'workshops']], ['الأرصدة الافتتاحية', ['partyBalances', 'stockOpening', 'cashOpening']]];
  const fyStart = () => { const fy = E.fyOf(U.today()); return fy ? fy.start : U.today(); };
  let st = null;
  const reset = (kind) => { st = { step: kind ? 2 : 1, kind: kind || null, rows: [], headers: [], hasHeader: true, map: {}, file: '', pv: null, log: null, errorsOnly: false, skipErrors: false, opts: { date: fyStart(), whId: (DB.s.warehouses[0] || {}).id, onExisting: 'skip' } }; };

  // مكتبة Excel تُحمّل عند الحاجة فقط
  let xlsxP = null;
  const loadXLSX = () => xlsxP || (xlsxP = new Promise((res, rej) => {
    if (window.XLSX) return res(window.XLSX);
    const s = document.createElement('script');
    s.src = XLSX_URL; s.onload = () => res(window.XLSX); s.onerror = () => { xlsxP = null; rej(new Error('تعذر تحميل قارئ Excel — احفظ الملف بصيغة CSV وأعد المحاولة')); };
    document.head.appendChild(s);
  }));

  const allowed = (k) => E.can(I.KINDS[k].perm);
  const steps = () => `<ol class="im-steps">${['نوع البيانات', 'الملف', 'مطابقة الأعمدة', 'المراجعة', 'تم'].map((l, i) => `<li class="${i + 1 < st.step ? 'done' : i + 1 === st.step ? 'on' : ''}"><span>${i + 1 < st.step ? icon('check') : i + 1}</span>${l}</li>`).join('')}</ol>`;

  Pages['import'] = {
    render(p, q) {
      if (!st || (q.k && q.k !== st.kind && I.KINDS[q.k])) reset(q.k && I.KINDS[q.k] && allowed(q.k) ? q.k : null);
      const body = { 1: stepKind, 2: stepSource, 3: stepMap, 4: stepReview, 5: stepDone }[st.step]();
      return `<div class="page-h"><div class="titles"><h1>استيراد وتصدير البيانات</h1><div class="desc">انقل بياناتك من Excel أو من برنامجك القديم في دقائق — مع مراجعة كاملة قبل الحفظ وإمكانية التراجع</div></div>
        ${st.step > 1 && st.step < 5 ? `<div class="actions"><button class="btn" data-act="im-restart">${icon('undo')} البدء من جديد</button></div>` : ''}</div>
        ${steps()}<div class="im-body">${body}</div>`;
    },
    mount(el) {
      const dz = el.querySelector('.im-drop');
      if (dz) {
        const input = dz.querySelector('input');
        input.addEventListener('change', () => input.files[0] && readFile(input.files[0]));
        ['dragenter', 'dragover'].forEach((e) => dz.addEventListener(e, (ev) => { ev.preventDefault(); dz.classList.add('over'); }));
        ['dragleave', 'drop'].forEach((e) => dz.addEventListener(e, (ev) => { ev.preventDefault(); dz.classList.remove('over'); }));
        dz.addEventListener('drop', (ev) => ev.dataTransfer.files[0] && readFile(ev.dataTransfer.files[0]));
      }
      el.querySelectorAll('[data-imo]').forEach((x) => x.addEventListener('change', () => { st.opts[x.dataset.imo] = x.type === 'number' || x.dataset.imo === 'whId' ? +x.value : x.value; }));
      el.querySelectorAll('[data-map]').forEach((x) => x.addEventListener('change', () => { if (x.value === '') delete st.map[x.dataset.map]; else st.map[x.dataset.map] = +x.value; App.refresh(); }));
    },
  };

  /* 1) نوع البيانات */
  function stepKind() {
    const logs = (DB.s.imports || []).slice().reverse().slice(0, 8);
    return `${GROUPS.map(([g, ks]) => `<div class="im-group"><div class="im-gl">${g}${g === 'الأرصدة الافتتاحية' ? '<span class="muted small"> — بعد استيراد الأصناف والأطراف</span>' : ''}</div><div class="im-kinds">${ks.map((k) => {
      const K = I.KINDS[k], ok = allowed(k);
      return `<div class="im-kind ${ok ? '' : 'off'}"><button class="im-kpick" data-act="im-kind" data-k="${k}" ${ok ? '' : 'disabled'}><span class="im-ki">${icon(K.icon)}</span><span class="grow"><b>${K.label}</b><span>${K.desc}</span></span>${ok ? icon('chevLeft') : `<span class="tag">${icon('lock')} بدون صلاحية</span>`}</button>
        <button class="im-tpl" data-act="im-template" data-k="${k}">${icon('download')} القالب</button></div>`;
    }).join('')}</div></div>`).join('')}
      <div class="im-row2">
        <section class="card"><div class="card-h"><span class="ap-ico">${icon('download')}</span><div class="grow"><h3>تصدير بياناتك إلى Excel</h3><div class="sub">ملف واحد فيه الأصناف والعملاء والموردون والورش والخزائن بأرصدتها — بنفس أعمدة القوالب</div></div></div>
          <div class="card-b"><button class="btn primary" data-act="im-export">${icon('download')} تصدير ملف Excel</button></div></section>
        <section class="card"><div class="card-h"><span class="ap-ico">${icon('history')}</span><div class="grow"><h3>عمليات الاستيراد السابقة</h3><div class="sub">يمكنك التراجع عن أي عملية ما دامت سجلاتها لم تُستخدم بعد</div></div></div>
          ${logs.length ? `<div class="im-logs">${logs.map((l) => `<div class="im-log ${l.undone ? 'undone' : ''}"><span class="im-li">${icon(I.KINDS[l.kind].icon)}</span><span class="grow"><b>${esc(l.label)}</b><span class="muted small">${l.counts.new} جديد · ${l.counts.update} تحديث · ${esc(l.by)} · ${U.dateTime(l.at)}${l.file ? ' · ' + esc(l.file) : ''}</span></span>
            ${l.undone ? '<span class="pill void">تم التراجع</span>' : `<button class="btn sm ghost" data-act="im-undo" data-id="${l.id}">${icon('undo')} تراجع</button>`}</div>`).join('')}</div>` : `<div class="card-b">${UI.empty('لا توجد عمليات استيراد بعد', '', 'upload')}</div>`}</section>
      </div>`;
  }

  /* 2) الملف أو اللصق + الخيارات */
  function stepSource() {
    const K = I.KINDS[st.kind];
    const opening = K.opening;
    return `<div class="im-chosen"><span class="im-ki">${icon(K.icon)}</span><span class="grow"><b>${K.label}</b><span class="muted small">الأعمدة: ${K.fields.map((f) => f.label + (f.req ? ' *' : '')).join('، ')}</span></span>
        <button class="btn sm" data-act="im-template" data-k="${st.kind}">${icon('download')} تحميل القالب</button><button class="btn sm ghost" data-act="im-restart">تغيير</button></div>
      <div class="im-src">
        <label class="im-drop"><input type="file" accept=".xlsx,.xls,.csv,.txt" hidden><span class="im-dico">${icon('upload')}</span><b>اسحب ملف Excel هنا أو اضغط للاختيار</b><span class="muted small">xlsx · xls · csv — أول ورقة في الملف</span></label>
        <div class="im-or"><span>أو</span></div>
        <div class="im-paste"><label class="lbl">${icon('copy')} انسخ الخلايا من Excel والصقها هنا</label><textarea class="input" id="im-paste" placeholder="${esc(K.fields.map((f) => f.label).join('\t'))}"></textarea><button class="btn" data-act="im-paste">${icon('check')} قراءة البيانات الملصقة</button></div>
      </div>
      <div class="card mt-16"><div class="card-b im-opts">
        ${opening ? UI.field('تاريخ الأرصدة الافتتاحية', `<input type="date" class="input" data-imo="date" value="${st.opts.date}">`, { hint: 'عادة أول يوم في السنة المالية التي تبدأ بها على النظام' }) : UI.field('عند وجود سجل بنفس الكود أو الاسم', `<select class="input" data-imo="onExisting"><option value="skip" ${st.opts.onExisting === 'skip' ? 'selected' : ''}>تخطيه (الأكثر أمانًا)</option><option value="update" ${st.opts.onExisting === 'update' ? 'selected' : ''}>تحديث بياناته من الملف</option></select>`)}
        ${st.kind === 'stockOpening' ? UI.field('المخزن (إن لم يُحدد في الملف)', `<select class="input" data-imo="whId">${DB.s.warehouses.map((w) => `<option value="${w.id}" ${w.id === st.opts.whId ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}</select>`) : ''}
        <div class="notice info small">${icon('info')}<div class="n-body">لن يُحفظ أي شيء قبل أن تراجع البيانات وتؤكد. ${opening ? 'الأرصدة تُسجل كمستندات افتتاحية معتمدة يمكن إلغاؤها.' : 'الأكواد الناقصة تُولَّد تلقائيًا.'}</div></div>
      </div></div>`;
  }
  async function readFile(f) {
    try {
      let rows;
      if (/\.(xlsx|xls)$/i.test(f.name)) {
        UI.toast('جارٍ قراءة ملف Excel…');
        const X = await loadXLSX();
        const wb = X.read(await f.arrayBuffer(), { type: 'array' });
        rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }).map((r) => r.map((c) => String(c).trim())).filter((r) => r.some((c) => c !== ''));
      } else rows = I.parseText(await f.text());
      load(rows, f.name);
    } catch (e) { UI.toast(e.message || 'تعذر قراءة الملف', 'danger'); }
  }
  function load(rows, file) {
    if (!rows.length) return UI.toast('الملف فارغ', 'danger');
    st.file = file;
    st.hasHeader = I.looksLikeHeader(rows[0]);
    st.raw = rows;
    applyHeader();
    st.step = 3;
    App.refresh();
  }
  function applyHeader() {
    const w = Math.max(...st.raw.map((r) => r.length));
    st.headers = st.hasHeader ? st.raw[0].map((h, i) => h || `عمود ${i + 1}`) : Array.from({ length: w }, (_, i) => `عمود ${i + 1}`);
    st.rows = st.hasHeader ? st.raw.slice(1) : st.raw;
    // بدون عناوين: نفترض ترتيب القالب
    st.map = st.hasHeader ? I.autoMap(st.kind, st.headers) : Object.fromEntries(I.KINDS[st.kind].fields.map((f, i) => [f.k, i]).filter(([, i]) => i < w));
  }

  /* 3) مطابقة الأعمدة */
  function stepMap() {
    const K = I.KINDS[st.kind], first = st.rows[0] || [];
    const missing = K.fields.filter((f) => f.req && st.map[f.k] == null);
    return `<div class="im-chosen"><span class="im-ki">${icon('file')}</span><span class="grow"><b>${esc(st.file)}</b><span class="muted small">${U.int(st.rows.length)} صف · ${st.headers.length} عمود</span></span>
        <label class="check small">${UI.sw('', st.hasHeader, 'data-change="im-header"')} الصف الأول عناوين أعمدة</label></div>
      <div class="card"><div class="card-h"><div class="grow"><h3>اربط كل حقل بعمود من ملفك</h3><div class="sub">طابقنا الأعمدة تلقائيًا من أسمائها — راجعها وعدّل أي اختيار غير صحيح</div></div></div>
        <div class="im-map">${K.fields.map((f) => { const ci = st.map[f.k]; return `<div class="im-mrow ${ci != null ? 'ok' : f.req ? 'need' : ''}"><span class="im-mf"><b>${f.label}${f.req ? ' <span class="req">*</span>' : ''}</b></span>
          <span class="im-arrow">${icon('chevLeft')}</span>
          <select class="input" data-map="${f.k}"><option value="">— لا يوجد في الملف —</option>${st.headers.map((h, i) => `<option value="${i}" ${ci === i ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select>
          <span class="im-sample">${ci != null && first[ci] != null && first[ci] !== '' ? esc(first[ci]) : '<span class="muted">—</span>'}</span></div>`; }).join('')}</div>
        <div class="card-f row"><span class="grow small ${missing.length ? 'neg' : 'muted'}">${missing.length ? `${icon('alert')} حقول مطلوبة غير مربوطة: ${missing.map((f) => f.label).join('، ')}` : `${icon('checkCircle')} كل الحقول المطلوبة مربوطة`}</span>
          <button class="btn" data-act="im-back">${icon('chevRight')} رجوع</button><button class="btn primary" data-act="im-review" ${missing.length ? 'disabled' : ''}>مراجعة البيانات ${icon('chevLeft')}</button></div></div>`;
  }
  UI.acts['im-header'] = (el) => { st.hasHeader = el.checked; applyHeader(); App.refresh(); };

  /* 4) المراجعة */
  const STATUS = { new: ['ok', 'جديد'], update: ['info', 'تحديث'], skip: ['plain', 'تخطي'], error: ['danger', 'خطأ'] };
  function stepReview() {
    const pv = st.pv, K = I.KINDS[st.kind], c = pv.counts;
    const rows = pv.rows.filter((r) => !st.errorsOnly || r.status === 'error');
    const cols = K.fields.filter((f) => st.map[f.k] != null);
    const go = c.new + c.update;
    return `<div class="im-stats">${[['new', 'جديد', 'ok'], ['update', 'تحديث', 'info'], ['skip', 'تخطي', 'plain'], ['error', 'أخطاء', 'danger']].map(([k, l, t]) => `<div class="card im-stat ${t} ${c[k] ? '' : 'zero'}"><b class="num">${U.int(c[k])}</b><span>${l}</span></div>`).join('')}</div>
      <div class="card"><div class="card-h"><div class="grow"><h3>مراجعة ${U.int(pv.rows.length)} صف</h3><div class="sub">كل صف بحالته قبل الحفظ — لن يُحفظ شيء حتى تضغط استيراد</div></div>
        ${c.error ? `<label class="check small">${UI.sw('', st.errorsOnly, 'data-change="im-errs"')} الأخطاء فقط</label>` : ''}</div>
        <div class="tbl-wrap" style="max-height:460px"><table class="tbl im-tbl"><thead><tr><th>#</th><th>الحالة</th>${cols.map((f) => `<th>${f.label}</th>`).join('')}<th>ملاحظة</th></tr></thead><tbody>
          ${rows.slice(0, 300).map((r) => `<tr class="${r.status === 'error' ? 'im-err' : ''}"><td class="muted">${r.idx}</td><td><span class="pill ${STATUS[r.status][0]}">${STATUS[r.status][1]}</span></td>${cols.map((f) => `<td class="${f.num ? 'num' : ''}">${r.d[f.k] == null || r.d[f.k] === '' ? '<span class="muted">—</span>' : esc(f.num ? U.money(r.d[f.k]) : r.d[f.k])}</td>`).join('')}<td class="wrap small ${r.status === 'error' ? 'neg' : 'muted'}">${esc(r.msg)}</td></tr>`).join('')}
        </tbody></table></div>${rows.length > 300 ? `<div class="tbl-foot">يعرض أول 300 صف من ${U.int(rows.length)}</div>` : ''}
        <div class="card-f row wrap">${c.error ? `<label class="check small grow">${UI.sw('', st.skipErrors, 'data-change="im-skip"')} تجاهل الصفوف التي بها أخطاء واستيراد الباقي</label>` : '<span class="grow small muted">' + icon('checkCircle') + ' لا توجد أخطاء</span>'}
          <button class="btn" data-act="im-back">${icon('chevRight')} رجوع</button>
          <button class="btn primary" data-act="im-commit" ${!go || (c.error && !st.skipErrors) ? 'disabled' : ''}>${icon('upload')} استيراد ${U.int(go)} ${go === 1 ? 'سجل' : 'سجلات'}</button></div></div>`;
  }
  UI.acts['im-errs'] = (el) => { st.errorsOnly = el.checked; App.refresh(); };
  UI.acts['im-skip'] = (el) => { st.skipErrors = el.checked; App.refresh(); };

  /* 5) تم */
  function stepDone() {
    const l = st.log, K = I.KINDS[st.kind];
    return `<div class="card im-done"><span class="au-burst">${icon('check')}</span><h2>تم استيراد ${K.label}</h2>
      <p class="muted">${U.int(l.counts.new)} جديد · ${U.int(l.counts.update)} تحديث${l.docs.length ? ` · ${l.docs.length} مستند افتتاحي معتمد` : ''}</p>
      <div class="row wrap" style="justify-content:center"><a class="btn primary" href="#/${ROUTES[st.kind]}">${icon('eye')} عرض ${K.label}</a><button class="btn" data-act="im-restart">${icon('upload')} استيراد ملف آخر</button><button class="btn ghost" data-act="im-undo" data-id="${l.id}">${icon('undo')} تراجع عن هذا الاستيراد</button></div></div>`;
  }

  /* الأوامر */
  UI.acts['im-kind'] = (el) => { reset(el.dataset.k); App.refresh(); };
  UI.acts['im-restart'] = () => { reset(null); history.replaceState(null, '', '#/import'); App.refresh(); };
  UI.acts['im-back'] = () => { st.step = Math.max(1, st.step - 1); App.refresh(); };
  UI.acts['im-paste'] = () => { const t = document.getElementById('im-paste').value; if (!t.trim()) return UI.toast('الصق الخلايا أولًا', 'warning'); load(I.parseText(t), 'بيانات ملصقة'); };
  UI.acts['im-review'] = () => { st.pv = I.preview(st.kind, st.rows, st.map, st.opts); st.skipErrors = false; st.errorsOnly = false; st.step = 4; App.refresh(); };
  UI.acts['im-commit'] = () => {
    const log = UI.run(() => I.commit(st.pv, { skipErrors: st.skipErrors, file: st.file }));
    if (!log) return;
    st.log = log; st.step = 5;
    App.renderChrome(); App.refresh();
    UI.toast('تم الاستيراد بنجاح', 'success');
  };
  UI.acts['im-undo'] = (el) => {
    const id = +el.dataset.id, l = (DB.s.imports || []).find((x) => x.id === id);
    UI.confirm({ title: 'التراجع عن الاستيراد', message: `سيتم حذف ما أُضيف في "${esc(l.label)}" وإلغاء مستنداته الافتتاحية بقيود عكسية، واسترجاع البيانات التي عُدّلت.`, ok: 'تراجع', danger: true }).then((ok) => {
      if (!ok) return;
      if (UI.run(() => I.undo(id), 'تم التراجع عن الاستيراد')) { reset(null); App.renderChrome(); App.refresh(); }
    });
  };
  // القوالب: ملف Excel (أو CSV لو تعذر تحميل المكتبة)
  UI.acts['im-template'] = async (el) => {
    const k = el.dataset.k, K = I.KINDS[k], rows = I.template(k), name = 'قالب-' + K.label.replace(/\s+/g, '-');
    try { const X = await loadXLSX(); const wb = X.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] }; const ws = X.utils.aoa_to_sheet(rows); ws['!cols'] = rows[0].map(() => ({ wch: 22 })); X.utils.book_append_sheet(wb, ws, K.label.slice(0, 31)); X.writeFile(wb, name + '.xlsx'); }
    catch (e) { U.download(name + '.csv', U.csv(rows)); }
  };
  // التصدير: نفس أعمدة القوالب ليعود الملف للاستيراد مباشرة
  UI.acts['im-export'] = async () => {
    const lbl = (k) => I.KINDS[k].fields.map((f) => f.label);
    const party = (type) => [lbl('customers').concat(['الرصيد', 'الاتجاه (عليه / له)'])].concat(DB.s.parties.filter((p) => p.types.includes(type)).map((p) => { const b = E.balance('party', p.id); return [p.code, p.name, p.phone || '', p.address || '', p.taxNo || '', p.notes || '', Math.abs(b), b > 0 ? 'عليه' : b < 0 ? 'له' : '']; }));
    const sheets = [
      ['الأصناف', [lbl('items').concat(['الرصيد الحالي', 'متوسط التكلفة'])].concat(DB.s.items.map((it) => [it.code, it.name, E.nameOf('itemCats', it.catId), it.unit, (Pages.ITEM_KINDS || {})[it.kind] || it.kind, it.salePrice || 0, it.lastCost || 0, it.reorder || 0, E.onHand(it.id), E.avgCost(it.id)]))],
      ['العملاء', party('customer')], ['الموردون', party('supplier')], ['الورش', party('workshop')],
      ['الخزائن', [lbl('cashOpening')].concat(DB.s.accounts.map((a) => [a.name, E.cashBalance(a.id)]))],
    ];
    const name = 'بيانات-' + (DB.s.settings.company.name || 'المصنع').replace(/\s+/g, '-') + '-' + U.today();
    try {
      const X = await loadXLSX(), wb = X.utils.book_new();
      wb.Workbook = { Views: [{ RTL: true }] };
      sheets.forEach(([n, rows]) => { const ws = X.utils.aoa_to_sheet(rows); ws['!cols'] = rows[0].map(() => ({ wch: 20 })); X.utils.book_append_sheet(wb, ws, n); });
      X.writeFile(wb, name + '.xlsx');
    } catch (e) { sheets.forEach(([n, rows]) => U.download(name + '-' + n + '.csv', U.csv(rows))); }
    DB.audit('تصدير البيانات إلى Excel', 'import', null, ''); DB.save();
    UI.toast('تم تصدير البيانات', 'success');
  };
})();
