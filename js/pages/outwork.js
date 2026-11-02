/* المصنعية الخارجية: أوامر التشغيل، العهدة، مطابقة الخامات، الأسعار عبر السنوات، التسوية بضغطة */
(function () {
  const esc = U.esc;
  const WO_STATUS = { open: ['open', 'مفتوح'], closed: ['closed', 'مغلق'], cancelled: ['void', 'ملغى'] };
  const woPill = (o) => `<span class="pill ${WO_STATUS[o.status][0]}">${WO_STATUS[o.status][1]}</span>`;
  const OF = { status: 'open', party: '' };

  Pages.orders = {
    render() {
      let rows = DB.s.orders.slice().reverse();
      if (OF.status !== 'all') rows = rows.filter((o) => o.status === OF.status);
      if (OF.party) rows = rows.filter((o) => o.partyId === +OF.party);
      rows = rows.map((o) => ({ o, s: E.orderSummary(o.id) }));
      const cnt = (s) => DB.s.orders.filter((o) => s === 'all' || o.status === s).length;
      return `
      <div class="page-h"><div class="titles"><h1>أوامر التشغيل</h1><div class="desc">كل أمر يربط ورشة بموديل: الخامات المسلمة، الساعات، الإنتاج المستلم، المصنعية، والسلف — حتى لا تختلط حسابات الأعمال</div></div>
        <div class="actions"><button class="btn primary" data-act="wo-new">${icon('plus')} أمر تشغيل جديد ${UI.k('alt+n')}</button></div></div>
      <div class="card">
        <div class="tabs" style="padding:0 12px;margin:0">${[['open', 'مفتوحة'], ['closed', 'مغلقة'], ['cancelled', 'ملغاة'], ['all', 'الكل']].map(([k, l]) => `<button class="${OF.status === k ? 'on' : ''}" data-act="wo-f" data-v="${k}">${l} <span class="cnt">${cnt(k)}</span></button>`).join('')}</div>
        ${UI.table({
          id: 'orders', rows, open: (r) => '#/order/' + r.o.id, csv: 'work-orders',
          toolbar: UI.sel('', [['', 'كل الورش']].concat(DB.s.parties.filter((p) => p.types.includes('workshop')).map((p) => [p.id, p.name])), OF.party, { attrs: 'data-change="wo-party" style="width:auto;height:34px"' }),
          cols: [
            { k: 'no', label: 'الرقم', v: (r) => r.o.no, html: (r) => `<span class="code">${esc(r.o.no)}</span>` },
            { k: 'd', label: 'التاريخ', v: (r) => r.o.date, html: (r) => U.date(r.o.date) },
            { k: 'p', label: 'الورشة', v: (r) => E.nameOf('parties', r.o.partyId) },
            { k: 'm', label: 'الموديل', v: (r) => { const m = DB.get('models', r.o.modelId); return m ? m.code + ' ' + m.name : ''; }, html: (r) => { const m = DB.get('models', r.o.modelId); return m ? `<span class="code">${esc(m.code)}</span> ${esc(m.name)}` : ''; } },
            { k: 'r', label: 'الحساب', v: (r) => E.RULES[r.o.rule], html: (r) => `<span class="small">${E.RULES[r.o.rule]}</span>` },
            { k: 'prog', label: 'الإنتاج', v: (r) => r.s.progress, html: (r) => `<div style="min-width:130px"><div class="row between tiny"><span class="num">${U.int(r.s.qtyGood)} / ${U.int(r.o.targetQty)}</span><span>${r.s.progress}%</span></div><div class="meter"><i style="width:${r.s.progress}%"></i></div></div>` },
            { k: 'h', label: 'الساعات', num: true, v: (r) => r.s.hours, html: (r) => U.qty(r.s.hours), sum: (rs) => U.qty(U.sum(rs, (r) => r.s.hours)) },
            { k: 'iss', label: 'خامة مسلمة', num: true, v: (r) => r.s.issued, html: (r) => U.qty(r.s.issued) },
            { k: 'cus', label: 'في العهدة', num: true, v: (r) => r.s.inCustody, html: (r) => `<span class="${r.s.inCustody > 0.5 && r.o.status !== 'open' ? 'warn bold' : ''}">${U.qty(r.s.inCustody)}</span>` },
            { k: 'var', label: 'الهالك', v: (r) => r.s.variance, html: (r) => (r.s.expected ? (r.s.variance > 0.5 ? `<span class="pill warn" title="الاستهلاك أعلى من المسموح">+${U.qty(r.s.variance)} كجم</span>` : '<span class="pill ok">ضمن المسموح</span>') : '<span class="muted">—</span>') },
            { k: 'f', label: 'المصنعية', num: true, v: (r) => r.s.fees, html: (r) => UI.money(r.s.fees), sum: true },
            { k: 's', label: 'الحالة', v: (r) => r.o.status, html: (r) => woPill(r.o) },
          ],
        })}
      </div>`;
    },
    mount() { App.current.newFn = () => Pages.newOrder(); },
  };
  UI.acts['wo-f'] = (el) => { OF.status = el.dataset.v; App.refresh(); };
  UI.acts['wo-party'] = (el) => { OF.party = el.value; App.refresh(); };
  UI.acts['wo-new'] = (el) => Pages.newOrder(el.dataset.party ? +el.dataset.party : null);

  Pages.newOrder = (partyId, edit) => {
    if (!E.can('outwork')) return UI.toast('ليس لديك صلاحية المصنعية الخارجية', 'danger');
    const o = edit || { partyId, date: U.today(), rule: partyId ? (DB.get('parties', partyId).rule || 'hour') : 'hour', targetQty: '', agreedRate: '' };
    UI.modal({
      title: edit ? 'تعديل أمر التشغيل ' + esc(o.no) : 'أمر تشغيل جديد', size: 'lg',
      body: `<div class="grid g2">
        ${UI.field('الورشة / المصنع', UI.combo({ source: 'parties', arg: 'workshop', name: 'partyId', value: o.partyId, attrs: 'data-wo-party' }), { req: true })}
        ${UI.field('التاريخ', UI.inp('date', o.date, { type: 'date' }), { req: true })}
        ${UI.field('الموديل', UI.combo({ source: 'models', name: 'modelId', value: o.modelId, attrs: 'data-wo-model' }), { req: true })}
        ${UI.field('صنف المنتج التام', UI.combo({ source: 'items', arg: 'kind:finished', name: 'itemId', value: o.itemId, attrs: 'data-wo-item' }), { req: true, hint: 'يُحدد تلقائيًا من الموديل' })}
        ${UI.field('الكمية المستهدفة (قطعة)', UI.inp('targetQty', o.targetQty, { num: true }), { req: true })}
        ${UI.field('طريقة حساب المصنعية', UI.sel('rule', Object.entries(E.RULES), o.rule, { attrs: 'data-wo-rule' }))}
        ${UI.field('سعر متفق عليه (اختياري)', UI.inp('agreedRate', o.agreedRate || '', { num: true, ph: 'فارغ = السعر الساري حسب التاريخ' }), { hint: '<span data-wo-rate></span>' })}
        ${UI.field('ملاحظات', UI.inp('notes', o.notes))}
        <div class="span-all notice info" data-wo-need>${icon('yarn')}<div class="n-body small">اختر الموديل لحساب الخامة المطلوبة</div></div>
      </div>`,
      onMount: (m) => {
        const upd = () => {
          const v = UI.readForm(m);
          const r = v.partyId ? E.rateFor('workshop', v.partyId, v.rule, v.date || U.today()) : null;
          m.querySelector('[data-wo-rate]').innerHTML = r ? `الساري: <b class="num">${U.money(r.rate)}</b> (${r.refId ? 'خاص بالورشة' : 'عام'} من ${U.date(r.from)})` : v.partyId ? '<span class="neg">لا يوجد سعر ساري لهذه الطريقة</span>' : '';
          const md = v.modelId && DB.get('models', v.modelId);
          const need = m.querySelector('[data-wo-need] .n-body');
          if (md && v.targetQty) { const y = DB.get('items', md.yarnId); const q = U.r2(v.targetQty * md.yarnPerPiece * (1 + (md.wastePct || 0) / 100)); need.innerHTML = `الخامة المطلوبة: <b>${U.qty(q)} كجم</b> من ${esc(y ? y.name : '—')} (${md.yarnPerPiece} كجم/قطعة + ${md.wastePct}% هالك) · المتاح في المخزن: <b>${U.qty(y ? E.onHand(y.id) : 0)}</b> · ساعات متوقعة: ${U.qty(v.targetQty * (md.stdHours || 0))}`; }
        };
        m.addEventListener('combo', (e) => {
          if (e.target.matches('[data-wo-model]') && e.detail.value) { const md = DB.get('models', e.detail.value); if (md && md.itemId) UI.comboSet(m.querySelector('[data-wo-item]'), md.itemId); }
          if (e.target.matches('[data-wo-party]') && e.detail.value) { const p = DB.get('parties', e.detail.value); if (p && p.rule) m.querySelector('[data-wo-rule]').value = p.rule; }
          upd();
        });
        m.addEventListener('input', upd);
        upd();
      },
      actions: [{ label: edit ? 'حفظ' : 'إنشاء الأمر', cls: 'primary', primary: true, act: (m) => {
        const v = UI.readForm(m.el);
        if (!v.partyId || !v.modelId || !v.itemId || !(v.targetQty > 0)) return UI.toast('أكمل الورشة والموديل والصنف والكمية', 'danger');
        const r = UI.run(() => DB.tx(() => {
          E.need('outwork');
          E.checkFY(v.date);
          if (edit) { const x = DB.get('orders', edit.id); Object.assign(x, { partyId: v.partyId, modelId: v.modelId, itemId: v.itemId, targetQty: v.targetQty, rule: v.rule, agreedRate: v.agreedRate || 0, notes: v.notes, date: v.date }); DB.audit('تعديل أمر تشغيل', 'order', x.id, x.no); return x; }
          const y = U.year(v.date);
          const n = DB.s.seq.numbers; n.WO = n.WO || {}; n.WO[y] = Math.max(n.WO[y] || 0, DB.s.orders.filter((o) => o.no.includes('-' + y + '-')).length) + 1;
          const x = DB.add('orders', { no: `WO-${y}-${U.pad(n.WO[y])}`, date: v.date, partyId: v.partyId, modelId: v.modelId, itemId: v.itemId, targetQty: v.targetQty, rule: v.rule, agreedRate: v.agreedRate || 0, status: 'open', notes: v.notes, createdAt: U.now() });
          DB.audit('إنشاء أمر تشغيل', 'order', x.id, x.no);
          return x;
        }), edit ? 'تم الحفظ' : 'تم إنشاء أمر التشغيل');
        if (r) { m.close(); location.hash = '#/order/' + r.id; App.refresh(); }
      } }, { label: 'تراجع' }],
    });
  };

  Pages.order = {
    render({ id }) {
      const o = DB.get('orders', id);
      if (!o) return UI.empty('أمر التشغيل غير موجود');
      const s = E.orderSummary(id);
      const m = DB.get('models', o.modelId), p = DB.get('parties', o.partyId);
      const bal = E.balance('party', o.partyId);
      const prc = s.docs.filter((d) => d.type === 'PRC');
      const open = o.status === 'open';
      const q = (x) => `'${JSON.stringify(Object.assign({ wo: id }, x || {}))}'`;
      const allDocs = DB.s.docs.filter((d) => d.woId === id).sort((a, b) => (a.date < b.date ? 1 : -1));
      return `
      <div class="crumbs"><a href="#/orders">أوامر التشغيل</a> ‹ <span class="code">${esc(o.no)}</span></div>
      <div class="page-h"><div class="titles"><h1>${icon('layers')} أمر تشغيل <span class="mono">${esc(o.no)}</span> ${woPill(o)}</h1>
        <div class="desc"><a href="#/party/${p.id}">${esc(p.name)}</a> · <a href="#/model/${m.id}">${esc(m.code)} — ${esc(m.name)}</a> · ${E.RULES[o.rule]}${o.agreedRate ? ` · سعر متفق ${U.money(o.agreedRate)}` : ''} · ${U.date(o.date)}</div></div>
        <div class="actions">
          ${open ? `<button class="btn" data-act="new-doc" data-type="MI" data-q=${q()}>${icon('out')} صرف خامات</button><button class="btn primary" data-act="new-doc" data-type="PRC" data-q=${q()}>${icon('box')} استلام إنتاج ${UI.k('alt+i')}</button><button class="btn" data-act="new-doc" data-type="PY" data-q=${q({ sid: o.partyId, purpose: 'advance' })}>${icon('coins')} سلفة</button>` : ''}
          <button class="btn icon" data-act="wo-more" data-id="${id}">${icon('menu')}</button>
        </div></div>
      <div class="card mb-16"><div class="card-b"><div class="row between mb-8"><b>التقدم</b><span class="num">${U.int(s.qtyGood)} من ${U.int(o.targetQty)} قطعة · ${s.progress}%${s.qtyRejected ? ` · <span class="neg">${U.int(s.qtyRejected)} مرفوض</span>` : ''}</span></div><div class="meter" style="height:10px"><i style="width:${s.progress}%"></i></div></div></div>
      <div class="stat-strip mb-16">
        <div><div class="s-l">ساعات التشغيل</div><div class="s-v">${U.qty(s.hours)}</div></div>
        <div><div class="s-l">المصنعية المستحقة</div><div class="s-v num" style="text-align:right">${U.money(s.fees)}</div></div>
        <div><div class="s-l">تكلفة الخامات</div><div class="s-v num" style="text-align:right">${U.money(s.materialCost)}</div></div>
        <div><div class="s-l">تكلفة القطعة</div><div class="s-v num" style="text-align:right">${s.qtyGood ? U.money((s.fees + s.materialCost) / s.qtyGood) : '—'}</div></div>
        <div><div class="s-l">سلف على الأمر</div><div class="s-v num" style="text-align:right">${U.money(s.advances)}</div></div>
        <div><div class="s-l">رصيد الورشة الكلي</div><div class="s-v">${UI.bal(bal)}</div></div>
      </div>
      <div class="grid g2" style="align-items:start">
        <div class="card"><div class="card-h"><h3>${icon('scale')} مطابقة الخامات بالإنتاج</h3></div>
          <div class="info-list">
            <div class="i-row"><span>الخامة المسلمة للورشة</span><b class="num">${U.qty(s.issued)} كجم</b></div>
            <div class="i-row"><span>(−) المرتجع للمخزن</span><span class="num">${U.qty(s.returned)}</span></div>
            <div class="i-row"><span>(−) المستهلك في الإنتاج المستلم</span><span class="num">${U.qty(s.consumed)}</span></div>
            <div class="i-row"><span>(−) فاقد مُسوى</span><span class="num">${U.qty(s.wasted)}</span></div>
            <div class="i-row" style="background:var(--surface-2)"><b>= المتبقي في عهدة الورشة</b><b class="num">${U.qty(s.inCustody)} كجم</b></div>
            <div class="i-row"><span>الاستهلاك المعياري (${U.int(s.qtyGood)} × ${m.yarnPerPiece} كجم)</span><span class="num">${U.qty(s.expected)}</span></div>
            <div class="i-row"><span>المسموح شاملًا هالك ${m.wastePct}%</span><span class="num">${U.qty(s.allowed)}</span></div>
            <div class="i-row"><span>الفرق عن المسموح</span><b class="num ${s.variance > 0.5 ? 'neg' : 'pos'}">${s.variance > 0 ? '+' : ''}${U.qty(s.variance)} كجم</b></div>
          </div>
          ${s.variance > 0.5 ? `<div class="card-b"><div class="notice warn">${icon('alert')}<div class="n-body small">الاستهلاك أعلى من المسموح بـ ${U.qty(s.variance)} كجم. هذا مؤشر للمراجعة (وزن المنتج، الهالك الفعلي، أو خطأ تسجيل) — لا يُفترض أنه سرقة تلقائيًا.</div></div></div>` : ''}
          ${s.inCustody > 0.5 && open ? `<div class="card-f row"><button class="btn sm" data-act="new-doc" data-type="MR" data-q=${q()}>${icon('in')} مرتجع للمخزن</button><button class="btn sm" data-act="new-doc" data-type="WL" data-q=${q({ item: m.yarnId })}>${icon('alert')} تسوية فاقد</button></div>` : ''}
        </div>
        <div class="card"><div class="card-h"><h3>${icon('clock')} تفاصيل الساعات والاستلامات</h3></div>
          ${prc.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>التاريخ</th><th>المستند</th><th class="num">ساعات</th><th class="num">مقبول</th><th class="num">السعر</th><th class="num">المصنعية</th></tr></thead><tbody>${prc.map((d) => `<tr class="click" data-href="#/doc/${d.id}"><td>${U.date(d.date)}</td><td class="code">${esc(d.no)}</td><td class="num">${U.qty(d.hours)}</td><td class="num">${U.int(d.qtyGood)}</td><td class="num">${U.money(d.calc.rate)}</td><td class="num">${U.money(d.calc.fee)}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="2">الإجمالي</td><td class="num">${U.qty(s.hours)}</td><td class="num">${U.int(s.qtyGood)}</td><td></td><td class="num">${U.money(s.fees)}</td></tr></tfoot></table></div>` : `<div class="card-b">${UI.empty('لم يُستلم إنتاج بعد', '', 'box')}</div>`}
        </div>
      </div>
      <div class="card mt-16"><div class="card-h"><h3>كل مستندات الأمر</h3></div>${UI.table({ id: 'wo-docs-' + id, rows: allDocs, search: false, noPage: true, open: (d) => '#/doc/' + d.id, rowCls: (d) => (d.status === 'void' ? 'is-void' : ''), cols: [
        { k: 't', label: 'النوع', html: (d) => `<span class="tag">${E.TYPES[d.type].label}</span>` },
        { k: 'n', label: 'الرقم', html: (d) => `<span class="code">${esc(E.docNo(d))}</span>` },
        { k: 'd', label: 'التاريخ', html: (d) => U.date(d.date) },
        { k: 'det', label: 'البيان', html: (d) => `<span class="small text-2">${esc(Pages.detailOf(d))}</span>` },
        { k: 'v', label: 'القيمة', num: true, html: (d) => UI.money((d.totals && d.totals.total) || 0, true) },
        { k: 's', label: '', html: UI.status },
      ] })}</div>`;
    },
    mount(el, { id }) { App.current.newFn = () => App.newDoc('PRC', { wo: id }); },
  };
  UI.acts['wo-more'] = (el) => {
    const o = DB.get('orders', +el.dataset.id);
    const items = [{ label: 'تعديل بيانات الأمر', icon: 'edit', act: () => Pages.newOrder(null, o) }];
    if (o.status === 'open') {
      items.push({ label: 'مرتجع خامات', icon: 'in', act: () => App.newDoc('MR', { wo: o.id }) }, { label: 'تسوية فاقد', icon: 'alert', act: () => App.newDoc('WL', { wo: o.id }) }, { sep: true });
      items.push({ label: 'إغلاق الأمر', icon: 'lock', act: () => closeOrder(o) });
      if (!DB.s.docs.some((d) => d.woId === o.id && d.status === 'posted')) items.push({ label: 'إلغاء الأمر', icon: 'ban', danger: true, act: () => setStatus(o, 'cancelled', 'تم إلغاء الأمر') });
    } else items.push({ label: 'إعادة فتح الأمر', icon: 'unlock', act: () => setStatus(o, 'open', 'تمت إعادة فتح الأمر') });
    items.push({ sep: true }, { label: 'صرف مستحق الورشة', icon: 'wallet', act: () => Pages.payDue(o.partyId) });
    UI.menu(el, items);
  };
  const setStatus = (o, s, msg) => { if (UI.run(() => DB.tx(() => { E.need('outwork'); DB.get('orders', o.id).status = s; DB.audit('تغيير حالة أمر تشغيل', 'order', o.id, o.no + ' ← ' + WO_STATUS[s][1]); return true; }), msg)) App.refresh(); };
  async function closeOrder(o) {
    const s = E.orderSummary(o.id);
    const warn = [];
    if (s.inCustody > 0.5) warn.push(`ما زال في عهدة الورشة ${U.qty(s.inCustody)} كجم من هذا الأمر — يُفضل تسجيل مرتجع أو تسوية فاقد أولًا`);
    if (s.qtyGood < o.targetQty) warn.push(`المستلم ${U.int(s.qtyGood)} من ${U.int(o.targetQty)} قطعة`);
    const ok = await UI.confirm({ title: 'إغلاق أمر التشغيل ' + esc(o.no), message: (warn.length ? `<div class="notice warn mb-12">${icon('alert')}<div><ul>${warn.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div></div>` : '') + 'بعد الإغلاق لن يمكن تسجيل صرف أو استلام على هذا الأمر (يمكن إعادة فتحه).', ok: 'إغلاق الأمر' });
    if (ok) setStatus(o, 'closed', 'تم إغلاق أمر التشغيل');
  }

  /* صرف المستحق للورشة/المورد بضغطة واحدة */
  Pages.payDue = (partyId) => {
    const bal = E.balance('party', partyId);
    if (bal >= -0.004) return UI.toast('لا يوجد مستحق للطرف حاليًا' + (bal > 0 ? ' — بل عليه ' + U.money(bal) + ' (سلف زائدة)' : ''), 'info');
    const p = DB.get('parties', partyId);
    const docs = DB.s.docs.filter((d) => d.sid === partyId && d.status === 'posted');
    const fees = U.sum(docs.filter((d) => d.type === 'PRC'), (d) => d.calc.fee);
    const adv = U.sum(docs.filter((d) => d.type === 'PY' && d.purpose === 'advance'), (d) => d.amount);
    UI.modal({
      title: 'صرف مستحق ' + esc(p.name),
      body: `<div class="stat-strip mb-16"><div><div class="s-l">إجمالي المصنعية (كل الفترات)</div><div class="s-v num" style="text-align:right">${U.money(fees)}</div></div><div><div class="s-l">سلف مدفوعة</div><div class="s-v num" style="text-align:right">${U.money(adv)}</div></div><div><div class="s-l">المستحق الآن</div><div class="s-v num" style="text-align:right;color:var(--accent)">${U.money(-bal)}</div></div></div>
        <div class="grid g3">${UI.field('المبلغ', UI.inp('amount', -bal, { num: true }))}${UI.field('من خزينة', UI.combo({ source: 'accounts', name: 'accountId', value: (DB.s.accounts.find((a) => a.type === 'cash') || {}).id }))}${UI.field('الطريقة', UI.sel('method', Object.entries(E.PAY_METHODS), 'cash'))}</div>`,
      actions: [{ label: 'اعتماد الصرف', cls: 'primary', primary: true, act: (m) => {
        const v = UI.readForm(m.el);
        const r = UI.run(() => DB.tx(() => { const d = E.saveDraft(E.newDoc('PY', { st: 'party', sid: partyId, amount: v.amount, accountId: v.accountId, method: v.method, purpose: 'payment', notes: 'تسوية المستحق' })); return E.post(d.id); }), 'تم الصرف واعتماد السند');
        if (r) { m.close(); App.refresh(); }
      } }, { label: 'تراجع' }],
    });
  };
  UI.acts['pay-due'] = (el) => Pages.payDue(+el.dataset.id);

  /* لوحة الورشة داخل ملفها */
  Pages.workshopPanel = (p) => {
    const orders = DB.s.orders.filter((o) => o.partyId === p.id).slice().reverse();
    const open = orders.filter((o) => o.status === 'open');
    const cust = E.custodyItems(p.id).filter((x) => Math.abs(x.qty) > 0.0005);
    const bal = E.balance('party', p.id);
    const rule = p.rule || 'hour';
    const rate = E.rateFor('workshop', p.id, rule, U.today());
    const yr = U.year(U.today());
    const prcY = E.posted('PRC', yr + '-01-01', yr + '-12-31').filter((d) => d.sid === p.id);
    return `<div class="grid g3 mb-16" style="align-items:start">
      <div class="card"><div class="card-h"><h3>${icon('wallet')} الموقف المالي</h3></div><div class="info-list">
        <div class="i-row"><span>الرصيد</span><b>${UI.bal(bal)}</b></div>
        <div class="i-row"><span>السعر الساري (${E.RULES[rule]})</span><span>${rate ? `<b class="num">${U.money(rate.rate)}</b> <span class="tiny muted">${rate.refId ? 'خاص' : 'عام'}</span>` : '<span class="neg">غير محدد</span>'}</span></div>
        <div class="i-row"><span>ساعات ${yr}</span><span class="num">${U.qty(U.sum(prcY, (d) => d.hours))}</span></div>
        <div class="i-row"><span>إنتاج ${yr}</span><span class="num">${U.int(U.sum(prcY, (d) => d.qtyGood))} قطعة</span></div>
        <div class="i-row"><span>مصنعية ${yr}</span><span class="num">${U.money(U.sum(prcY, (d) => d.calc.fee))}</span></div>
      </div><div class="card-f row">${bal < -0.004 ? `<button class="btn sm primary" data-act="pay-due" data-id="${p.id}">${icon('wallet')} صرف المستحق ${U.money(-bal)}</button>` : '<span class="small muted">لا يوجد مستحق</span>'}</div></div>
      <div class="card"><div class="card-h"><h3>${icon('yarn')} العهدة الحالية</h3><span class="grow"></span><a class="small" href="#/reconcile?p=${p.id}">المطابقة</a></div>${cust.length ? `<div class="info-list">${cust.map((x) => `<div class="i-row"><span>${esc(E.nameOf('items', x.itemId))}</span><span><b class="num">${U.qty(x.qty)}</b> <span class="tiny muted">${U.money(x.value)}</span></span></div>`).join('')}</div>` : '<div class="card-b small muted">لا توجد خامات في عهدة الورشة</div>'}</div>
      <div class="card"><div class="card-h"><h3>${icon('layers')} أوامر مفتوحة (${open.length})</h3><span class="grow"></span><button class="btn xs" data-act="wo-new" data-party="${p.id}">${icon('plus')}</button></div>${open.length ? open.map((o) => { const s = E.orderSummary(o.id); return `<div class="list-row" data-act="go" data-href="#/order/${o.id}"><span class="grow"><span class="code">${esc(o.no)}</span> ${esc(E.nameOf('models', o.modelId))}<div class="meter mt-8" style="margin-top:4px"><i style="width:${s.progress}%"></i></div></span><span class="num small">${U.int(s.qtyGood)}/${U.int(o.targetQty)}</span></div>`; }).join('') : '<div class="card-b small muted">لا توجد أوامر مفتوحة</div>'}</div>
    </div>
    <div class="card">${UI.table({ id: 'ws-orders-' + p.id, rows: orders.map((o) => ({ o, s: E.orderSummary(o.id) })), open: (r) => '#/order/' + r.o.id, cols: [
      { k: 'no', label: 'الأمر', v: (r) => r.o.no, html: (r) => `<span class="code">${esc(r.o.no)}</span>` },
      { k: 'd', label: 'التاريخ', v: (r) => r.o.date, html: (r) => U.date(r.o.date) },
      { k: 'm', label: 'الموديل', v: (r) => E.nameOf('models', r.o.modelId) },
      { k: 'q', label: 'المستلم', num: true, v: (r) => r.s.qtyGood, html: (r) => `${U.int(r.s.qtyGood)} / ${U.int(r.o.targetQty)}` },
      { k: 'h', label: 'الساعات', num: true, v: (r) => r.s.hours, html: (r) => U.qty(r.s.hours), sum: (rs) => U.qty(U.sum(rs, (r) => r.s.hours)) },
      { k: 'i', label: 'خامة مسلمة', num: true, v: (r) => r.s.issued, html: (r) => U.qty(r.s.issued) },
      { k: 'c', label: 'مستهلك', num: true, v: (r) => r.s.consumed, html: (r) => U.qty(r.s.consumed) },
      { k: 'f', label: 'المصنعية', num: true, v: (r) => r.s.fees, html: (r) => UI.money(r.s.fees), sum: true },
      { k: 'a', label: 'السلف', num: true, v: (r) => r.s.advances, html: (r) => UI.money(r.s.advances, true), sum: true },
      { k: 's', label: 'الحالة', v: (r) => r.o.status, html: (r) => woPill(r.o) },
    ] })}</div>`;
  };

  /* مطابقة الخامات */
  const RF = { party: null, from: '', to: '' };
  Pages.reconcile = {
    render(p, q) {
      const shops = DB.s.parties.filter((x) => x.types.includes('workshop'));
      if (q.p) RF.party = +q.p;
      if (!RF.party && shops[0]) RF.party = shops[0].id;
      const r = RF.party ? E.reconcile(RF.party, RF.from, RF.to) : null;
      const orders = DB.s.orders.filter((o) => o.partyId === RF.party && (!RF.from || o.date >= RF.from) && (!RF.to || o.date <= RF.to)).map((o) => ({ o, s: E.orderSummary(o.id) })).reverse();
      return `
      <div class="page-h"><div class="titles"><h1>مطابقة الخامات</h1><div class="desc">"استلم طن خيط وجاب 700" — المقارنة بين الخامة المسلمة والمرتجعة والمستهلكة والمنتج المستلم والفاقد المعتمد</div></div>
        <div class="actions period-bar"><input type="date" class="input" value="${RF.from}" data-change="rc-f" data-k="from"><input type="date" class="input" value="${RF.to}" data-change="rc-f" data-k="to"></div></div>
      <div class="tabs">${shops.map((s) => `<button class="${RF.party === s.id ? 'on' : ''}" data-act="rc-party" data-id="${s.id}">${esc(s.name)}</button>`).join('')}</div>
      ${r ? `
      <div class="stat-strip mb-16">
        <div><div class="s-l">المنتج المستلم</div><div class="s-v">${U.int(r.qtyGood)} قطعة</div></div>
        <div><div class="s-l">الاستهلاك المعياري</div><div class="s-v">${U.qty(r.expected)} كجم</div></div>
        <div><div class="s-l">المسموح شاملًا الهالك</div><div class="s-v">${U.qty(r.allowed)} كجم</div></div>
        <div><div class="s-l">المستهلك المسجل</div><div class="s-v">${U.qty(r.consumed)} كجم</div></div>
        <div><div class="s-l">الفرق عن المسموح</div><div class="s-v ${r.variance > 0.5 ? 'neg' : 'pos'}">${r.variance > 0 ? '+' : ''}${U.qty(r.variance)} كجم</div></div>
      </div>
      <div class="card mb-16"><div class="card-h"><h3>حركة الخامات حسب الصنف</h3></div>${UI.table({ id: 'rec-items', rows: r.rows, search: false, noPage: true, cols: [
        { k: 'i', label: 'الخامة', v: (x) => E.nameOf('items', x.itemId), html: (x) => UI.itemLink(x.itemId) },
        { k: 'is', label: 'المسلم', num: true, v: (x) => x.issued, html: (x) => U.qty(x.issued), sum: (rs) => U.qty(U.sum(rs, (x) => x.issued)) },
        { k: 're', label: 'المرتجع', num: true, v: (x) => x.returned, html: (x) => U.qty(x.returned), sum: (rs) => U.qty(U.sum(rs, (x) => x.returned)) },
        { k: 'co', label: 'المستهلك في الإنتاج', num: true, v: (x) => x.consumed, html: (x) => U.qty(x.consumed), sum: (rs) => U.qty(U.sum(rs, (x) => x.consumed)) },
        { k: 'wa', label: 'فاقد مُسوى', num: true, v: (x) => x.wasted, html: (x) => U.qty(x.wasted) + (x.charged ? ` <span class="tiny muted">(محمل ${U.qty(x.charged)})</span>` : '') },
        { k: 'b', label: 'صافي الفترة', num: true, v: (x) => x.balance, html: (x) => `<b>${U.qty(x.balance)}</b>` },
        { k: 'c', label: 'العهدة الآن', num: true, v: (x) => x.custody, html: (x) => `<b>${U.qty(x.custody)}</b>` },
        { k: 'a', label: '', html: (x) => (x.custody > 0.5 && E.can('outwork') ? `<button class="btn xs" data-act="new-doc" data-type="WL" data-q='${JSON.stringify({ sid: RF.party, item: x.itemId })}'>تسوية فاقد</button>` : '') },
      ] })}</div>
      <div class="card"><div class="card-h"><h3>المطابقة لكل أمر تشغيل</h3></div>${UI.table({ id: 'rec-wo', rows: orders, open: (x) => '#/order/' + x.o.id, search: false, cols: [
        { k: 'n', label: 'الأمر', v: (x) => x.o.no, html: (x) => `<span class="code">${esc(x.o.no)}</span>` },
        { k: 'm', label: 'الموديل', v: (x) => E.nameOf('models', x.o.modelId) },
        { k: 'q', label: 'مستلم', num: true, v: (x) => x.s.qtyGood, html: (x) => U.int(x.s.qtyGood) },
        { k: 'i', label: 'مسلم', num: true, v: (x) => x.s.issued, html: (x) => U.qty(x.s.issued) },
        { k: 'c', label: 'مستهلك', num: true, v: (x) => x.s.consumed, html: (x) => U.qty(x.s.consumed) },
        { k: 'e', label: 'معياري', num: true, v: (x) => x.s.expected, html: (x) => U.qty(x.s.expected) },
        { k: 'al', label: 'مسموح', num: true, v: (x) => x.s.allowed, html: (x) => U.qty(x.s.allowed) },
        { k: 'v', label: 'الفرق', num: true, v: (x) => x.s.variance, html: (x) => (x.s.expected ? `<b class="${x.s.variance > 0.5 ? 'neg' : 'pos'}">${x.s.variance > 0 ? '+' : ''}${U.qty(x.s.variance)}</b>` : '—') },
        { k: 'cu', label: 'في العهدة', num: true, v: (x) => x.s.inCustody, html: (x) => U.qty(x.s.inCustody) },
        { k: 's', label: '', v: (x) => x.o.status, html: (x) => woPill(x.o) },
      ] })}</div>` : UI.empty('لا توجد ورش', '', 'factory')}`;
    },
  };
  UI.acts['rc-party'] = (el) => { RF.party = +el.dataset.id; history.replaceState(null, '', '#/reconcile'); App.refresh(); };
  UI.acts['rc-f'] = (el) => { RF[el.dataset.k] = el.value; App.refresh(); };

  /* أسعار المصنعية والقطعة عبر السنوات */
  Pages.rates = {
    render() {
      const today = U.today();
      const wr = DB.s.rates.filter((r) => r.kind === 'workshop').sort((a, b) => (a.from < b.from ? 1 : -1));
      const orr = DB.s.rates.filter((r) => r.kind === 'operation').sort((a, b) => (a.from < b.from ? 1 : -1));
      const isCurrent = (r) => { const c = E.rateFor(r.kind, r.refId, r.rule, today); return c && c.id === r.id; };
      const curGeneral = Object.keys(E.RULES).map((rule) => ({ rule, r: E.rateFor('workshop', null, rule, today) }));
      const cols = (kind) => [
        { k: 'scope', label: kind === 'workshop' ? 'النطاق' : 'العملية', v: (r) => (kind === 'workshop' ? (r.refId ? E.nameOf('parties', r.refId) : 'كل الورش (عام)') : E.nameOf('operations', r.refId)), html: (r) => (kind === 'workshop' ? (r.refId ? `<a href="#/party/${r.refId}">${esc(E.nameOf('parties', r.refId))}</a>` : '<b>كل الورش (عام)</b>') : esc(E.nameOf('operations', r.refId))) },
        kind === 'workshop' ? { k: 'rule', label: 'الطريقة', v: (r) => E.RULES[r.rule] } : null,
        { k: 'rate', label: 'السعر', num: true, v: (r) => r.rate, html: (r) => `<b>${U.money(r.rate)}</b>` },
        { k: 'from', label: 'ساري من', v: (r) => r.from, html: (r) => U.date(r.from) },
        { k: 'year', label: 'السنة', v: (r) => U.year(r.from) },
        { k: 'cur', label: '', v: (r) => (isCurrent(r) ? 1 : 0), html: (r) => (isCurrent(r) ? '<span class="pill ok">الساري اليوم</span>' : r.from > today ? '<span class="pill info">مستقبلي</span>' : '<span class="pill plain">سابق</span>') },
        { k: 'note', label: 'ملاحظات', v: (r) => r.note || '', html: (r) => `<span class="small muted">${esc(r.note || '')}</span>` },
        { k: 'x', label: '', html: (r) => (E.can('outwork') || E.can('workers') ? `<button class="btn xs ghost" data-act="rate-edit" data-id="${r.id}">${icon('edit')}</button>` : '') },
      ].filter(Boolean);
      return `
      <div class="page-h"><div class="titles"><h1>أسعار المصنعية عبر السنوات</h1><div class="desc">سعر الساعة يختلف من سنة لأخرى — كل سعر له تاريخ سريان، والسعر يُحفظ داخل كل عملية معتمدة فلا تتغير العمليات القديمة أبدًا</div></div>
        <div class="actions"><button class="btn primary" data-act="rate-new" data-kind="workshop">${icon('plus')} سعر ورش جديد</button><button class="btn" data-act="rate-new" data-kind="operation">${icon('plus')} سعر قطعة للعمال</button></div></div>
      <div class="stat-strip mb-16">${curGeneral.map((x) => `<div><div class="s-l">السعر العام ${E.RULES[x.rule]} اليوم</div><div class="s-v">${x.r ? `<span class="num">${U.money(x.r.rate)}</span> <span class="small muted">من ${U.date(x.r.from)}</span>` : '—'}</div></div>`).join('')}</div>
      <div class="notice info mb-16">${icon('info')}<div class="n-body small">ترتيب الأولوية: السعر المتفق عليه في أمر التشغيل ← السعر الخاص بالورشة ← السعر العام. ويُختار السعر الذي تاريخ سريانه ≤ تاريخ الاستلام.</div></div>
      <div class="card mb-16"><div class="card-h"><h3>${icon('factory')} أسعار الورش والمصانع</h3></div>${UI.table({ id: 'rates-w', rows: wr, cols: cols('workshop'), search: false, noPage: true })}</div>
      <div class="card"><div class="card-h"><h3>${icon('users')} أسعار القطعة للعمالة الداخلية (بالإنتاج)</h3></div>${UI.table({ id: 'rates-o', rows: orr, cols: cols('operation'), search: false, noPage: true })}</div>`;
    },
  };
  const editRate = (kind, id) => {
    const r = id ? DB.get('rates', id) : { kind, refId: null, rule: 'hour', rate: '', from: U.year(U.today()) + 1 + '-01-01' };
    const used = id && DB.s.docs.some((d) => d.status === 'posted' && d.type === 'PRC' && d.calc && d.calc.rate === r.rate && d.date >= r.from);
    UI.modal({
      title: id ? 'تعديل سعر' : kind === 'workshop' ? 'سعر مصنعية جديد' : 'سعر قطعة جديد', size: 'sm',
      body: `<div class="grid">
        ${kind === 'workshop' ? UI.field('النطاق', UI.sel('refId', [['', 'كل الورش (سعر عام)']].concat(DB.s.parties.filter((p) => p.types.includes('workshop')).map((p) => [p.id, p.name])), r.refId || '')) + UI.field('طريقة الحساب', UI.sel('rule', Object.entries(E.RULES), r.rule)) : UI.field('العملية', UI.sel('refId', DB.s.operations.map((o) => [o.id, o.name]), r.refId))}
        ${UI.field('السعر', UI.inp('rate', r.rate, { num: true }), { req: true })}
        ${UI.field('ساري من تاريخ', UI.inp('from', r.from, { type: 'date' }), { req: true, hint: 'مثال: 01/01 من السنة الجديدة' })}
        ${UI.field('ملاحظات', UI.inp('note', r.note))}
        ${used ? `<div class="notice warn">${icon('alert')}<div class="n-body small">تعديل هذا السعر لن يغير المستندات المعتمدة سابقًا (السعر محفوظ داخلها) — سيؤثر فقط على العمليات الجديدة.</div></div>` : ''}
      </div>`,
      actions: [{ label: 'حفظ', cls: 'primary', primary: true, act: (m) => {
        const v = UI.readForm(m.el);
        if (!(v.rate > 0) || !v.from) return UI.toast('أدخل السعر وتاريخ السريان', 'danger');
        const refId = v.refId ? +v.refId : null;
        const rule = kind === 'workshop' ? v.rule : 'piece';
        if (DB.s.rates.some((x) => x.id !== id && x.kind === kind && x.refId === refId && x.rule === rule && x.from === v.from)) return UI.toast('يوجد سعر بنفس النطاق وتاريخ السريان', 'danger');
        const ok = UI.run(() => DB.tx(() => {
          E.need(kind === 'workshop' ? 'outwork' : 'workers');
          if (id) { Object.assign(DB.get('rates', id), { refId, rule, rate: v.rate, from: v.from, note: v.note }); DB.audit('تعديل سعر', 'rate', id, `${v.rate} من ${v.from}`); }
          else { const x = DB.add('rates', { kind, refId, rule, rate: v.rate, from: v.from, note: v.note }); DB.audit('إضافة سعر', 'rate', x.id, `${v.rate} من ${v.from}`); }
          return true;
        }), 'تم حفظ السعر');
        if (ok) { m.close(); App.refresh(); }
      } }, { label: 'تراجع' }, ...(id ? [{ label: 'حذف', cls: 'danger', act: async (m) => { if (await UI.confirm({ title: 'حذف السعر', message: 'المستندات المعتمدة لن تتأثر. هل تريد الحذف؟', danger: true, ok: 'حذف' })) { UI.run(() => DB.tx(() => { DB.remove('rates', id); DB.audit('حذف سعر', 'rate', id, ''); }), 'تم الحذف'); m.close(); App.refresh(); } } }] : [])],
    });
  };
  UI.acts['rate-new'] = (el) => editRate(el.dataset.kind, null);
  UI.acts['rate-edit'] = (el) => { const r = DB.get('rates', +el.dataset.id); editRate(r.kind, r.id); };
})();
