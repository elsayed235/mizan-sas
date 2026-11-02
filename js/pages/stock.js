/* المخزون: الأصناف والتكويد، كارت الصنف، أرصدة المخازن — والخزائن والبنوك */
(function () {
  const esc = U.esc;
  Pages.ITEM_KINDS = { raw: 'خامة (خيوط)', finished: 'منتج تام', spare: 'قطعة غيار', consumable: 'مستلزمات مستهلكة', service: 'خدمة (غير مخزني)' };
  const IF = { cat: '', kind: '' };

  Pages.items = {
    render() {
      let items = DB.s.items.slice();
      if (IF.cat) items = items.filter((i) => i.catId === +IF.cat);
      if (IF.kind) items = items.filter((i) => i.kind === IF.kind);
      const rows = items.map((it) => { const q = it.kind === 'service' ? 0 : E.onHand(it.id); const c = E.avgCost(it.id); return { it, q, c, v: U.r2(q * c) }; });
      return `
      <div class="page-h"><div class="titles"><h1>الأصناف والتكويد</h1><div class="desc">خيوط، منتجات تامة مربوطة بموديلاتها، قطع غيار، إبر، شمع، مستلزمات — كل صنف بكود فريد</div></div>
        <div class="actions"><a class="btn" href="#/import?k=items">${icon('upload')} استيراد من Excel</a><a class="btn" href="#/stock">${icon('boxes')} أرصدة المخازن</a><button class="btn primary" data-act="item-new">${icon('plus')} صنف جديد ${UI.k('alt+n')}</button></div></div>
      <div class="card">${UI.table({
        id: 'items', rows, open: (r) => '#/item/' + r.it.id, csv: 'items', print: true, printTitle: 'الأصناف', sort: 'code', dir: 'asc',
        toolbar: `${UI.sel('', [['', 'كل الفئات']].concat(DB.s.itemCats.map((c) => [c.id, c.name])), IF.cat, { attrs: 'data-change="items-f" data-k="cat" style="width:auto;height:34px"' })}${UI.sel('', [['', 'كل الأنواع']].concat(Object.entries(Pages.ITEM_KINDS)), IF.kind, { attrs: 'data-change="items-f" data-k="kind" style="width:auto;height:34px"' })}`,
        rowCls: (r) => (r.it.active === false ? 'is-void' : ''),
        cols: [
          { k: 'code', label: 'الكود', v: (r) => r.it.code, html: (r) => `<span class="code">${esc(r.it.code)}</span>` },
          { k: 'name', label: 'الصنف', v: (r) => r.it.name, html: (r) => `<b>${esc(r.it.name)}</b>${r.it.modelId ? ` <span class="tag">موديل ${esc((DB.get('models', r.it.modelId) || {}).code || '')}</span>` : ''}${r.it.active === false ? ' <span class="pill void">موقوف</span>' : ''}` },
          { k: 'cat', label: 'الفئة', v: (r) => E.nameOf('itemCats', r.it.catId) },
          { k: 'kind', label: 'النوع', v: (r) => Pages.ITEM_KINDS[r.it.kind], html: (r) => `<span class="small text-2">${Pages.ITEM_KINDS[r.it.kind]}</span>` },
          { k: 'unit', label: 'الوحدة', v: (r) => r.it.unit + (r.it.altUnit ? ' / ' + r.it.altUnit : ''), html: (r) => `${esc(r.it.unit)}${r.it.altUnit ? `<span class="tiny muted"> · ${esc(r.it.altUnit)}=${U.qty(r.it.altFactor)}</span>` : ''}` },
          { k: 'q', label: 'الرصيد', num: true, v: (r) => r.q, html: (r) => (r.it.kind === 'service' ? '—' : `<span class="${r.q <= (r.it.reorder || 0) && r.it.reorder ? 'neg bold' : ''}">${U.qty(r.q)}</span>`) },
          { k: 'c', label: 'متوسط التكلفة', num: true, v: (r) => r.c, html: (r) => UI.money(r.c, true) },
          { k: 'p', label: 'سعر البيع', num: true, v: (r) => r.it.salePrice || 0, html: (r) => UI.money(r.it.salePrice, true) },
          { k: 'v', label: 'قيمة المخزون', num: true, v: (r) => r.v, html: (r) => UI.money(r.v, true), sum: true },
        ],
      })}</div>`;
    },
    mount() { App.current.newFn = () => Pages.editItem(null); },
  };
  UI.acts['items-f'] = (el) => { IF[el.dataset.k] = el.value; App.refresh(); };
  UI.acts['item-new'] = () => Pages.editItem(null);
  UI.acts['item-edit'] = (el) => Pages.editItem(+el.dataset.id);

  Pages.editItem = (id) => {
    const it = id ? DB.get('items', id) : { kind: 'raw', unit: 'كجم', active: true, catId: DB.s.itemCats[0] && DB.s.itemCats[0].id, reorder: 0, salePrice: 0 };
    const hasMoves = id && E.movesOf(id).length > 0;
    const units = DB.s.units.map((u) => [u.name, u.name]);
    UI.modal({
      title: id ? 'تعديل الصنف' : 'صنف جديد', size: 'lg',
      body: `<div class="grid g3">
        ${UI.field('الفئة', UI.sel('catId', UI.opts('itemCats'), it.catId, { attrs: 'data-cat' }), { req: true })}
        ${UI.field('الكود', UI.inp('code', it.code || ''), { req: true, hint: 'يُقترح تلقائيًا من بادئة الفئة' })}
        ${UI.field('النوع', UI.sel('kind', Object.entries(Pages.ITEM_KINDS), it.kind))}
        ${UI.field('اسم الصنف', UI.inp('name', it.name, { attrs: 'autofocus' }), { req: true, cls: 'span-2' })}
        ${UI.field('الموديل المرتبط (للمنتج التام)', UI.combo({ source: 'models', name: 'modelId', value: it.modelId }))}
        ${UI.field('الوحدة الأساسية', UI.sel('unit', units, it.unit, { attrs: hasMoves ? 'disabled' : '' }), { hint: hasMoves ? 'لا تُغير بعد وجود حركات' : '' })}
        ${UI.field('وحدة بديلة (اختياري)', UI.sel('altUnit', units, it.altUnit, { empty: '— لا يوجد —' }))}
        ${UI.field('معامل التحويل', UI.inp('altFactor', it.altFactor || '', { num: true, ph: 'مثال: الكرتونة = 20 كجم' }), { hint: 'كم وحدة أساسية في الوحدة البديلة' })}
        ${UI.field('سعر البيع', UI.inp('salePrice', it.salePrice || '', { num: true }))}
        ${UI.field('حد إعادة الطلب', UI.inp('reorder', it.reorder || '', { num: true }), { hint: 'تنبيه عند وصول الرصيد لهذا الحد' })}
        ${UI.field('آخر تكلفة شراء', `<input class="input num" readonly value="${U.money(it.lastCost || 0)}">`, { hint: 'تتحدث تلقائيًا من فواتير الشراء' })}
        ${UI.field('المقاسات/الألوان (اختياري)', UI.inp('variant', it.variant), { cls: 'span-2' })}
        ${UI.field('كود الفاتورة الإلكترونية (EGS/GS1)', UI.inp('etaCode', it.etaCode || '', { attrs: 'dir="ltr"' }), { hint: 'يُولّد تلقائيًا من صفحة الفاتورة الإلكترونية' })}
        ${id ? `<div class="row">${UI.sw('active', it.active !== false)} <span>نشط</span></div>` : ''}
      </div>`,
      onMount: (m) => {
        const cat = m.querySelector('[data-cat]'), code = m.querySelector('[name=code]');
        const sug = () => { const c = DB.get('itemCats', +cat.value); return App.nextCode((c && c.prefix ? c.prefix : 'IT') + '-', DB.s.items); };
        if (!id) code.value = sug();
        cat.addEventListener('change', () => { if (!id) code.value = sug(); });
      },
      actions: [{ label: 'حفظ', cls: 'primary', primary: true, act: (m) => {
        const v = UI.readForm(m.el);
        if (!v.name.trim() || !v.code.trim()) return UI.toast('الاسم والكود مطلوبان', 'danger');
        if (DB.s.items.some((x) => x.code === v.code.trim() && x.id !== id)) return UI.toast('الكود مستخدم لصنف آخر', 'danger');
        if (v.altUnit && !(v.altFactor > 0)) return UI.toast('حدد معامل التحويل للوحدة البديلة', 'danger');
        const r = UI.run(() => DB.tx(() => {
          E.need('stock');
          const data = { code: v.code.trim(), name: v.name.trim(), catId: +v.catId, kind: v.kind, modelId: v.modelId || null, altUnit: v.altUnit || '', altFactor: v.altUnit ? v.altFactor : 0, salePrice: v.salePrice, reorder: v.reorder, variant: v.variant, etaCode: (v.etaCode || '').trim() };
          if (!hasMoves && v.unit) data.unit = v.unit;
          let x;
          if (id) { x = DB.get('items', id); Object.assign(x, data, { active: v.active }); DB.audit('تعديل صنف', 'item', id, x.name); }
          else { x = DB.add('items', Object.assign(data, { unit: v.unit, lastCost: 0, active: true })); DB.audit('إضافة صنف', 'item', x.id, x.name); }
          if (data.modelId) { const md = DB.get('models', data.modelId); if (md && !md.itemId) md.itemId = x.id; }
          return x;
        }), 'تم حفظ الصنف');
        if (r) { m.close(); App.refresh(); }
      } }, { label: 'تراجع' }],
    });
  };

  /* كارت الصنف */
  const IS = {};
  Pages.item = {
    render({ id }) {
      const it = DB.get('items', id);
      if (!it) return UI.empty('الصنف غير موجود');
      const st = IS[id] || (IS[id] = { wh: '', from: '', to: U.today() });
      const total = E.onHand(id), avg = E.avgCost(id);
      const byWh = DB.s.warehouses.map((w) => ({ w, q: E.onHand(id, w.id) })).filter((x) => Math.abs(x.q) > 0.0005 || E.movesOf(id).some((m) => m.whId === x.w.id));
      const card = E.stockCard(id, st.wh ? +st.wh : null, st.from, st.to);
      const sold = E.posted('SI').flatMap((d) => d.lines.filter((l) => l.itemId === id));
      const model = it.modelId ? DB.get('models', it.modelId) : null;
      const custody = DB.s.parties.filter((p) => p.types.includes('workshop')).map((p) => ({ p, q: E.custodyQty(p.id, id) })).filter((x) => Math.abs(x.q) > 0.0005);
      return `
      <div class="crumbs"><a href="#/items">الأصناف</a> ‹ <span class="code">${esc(it.code)}</span></div>
      <div class="page-h"><div class="titles"><h1>${esc(it.name)} ${it.active === false ? '<span class="pill void">موقوف</span>' : ''}</h1><div class="desc"><span class="code">${esc(it.code)}</span> · ${esc(E.nameOf('itemCats', it.catId))} · ${Pages.ITEM_KINDS[it.kind]} · ${esc(it.unit)}${it.altUnit ? ` (${esc(it.altUnit)} = ${U.qty(it.altFactor)} ${esc(it.unit)})` : ''}${model ? ` · موديل <a href="#/model/${model.id}">${esc(model.code)}</a>` : ''}</div></div>
        <div class="actions">${it.kind !== 'service' ? `<button class="btn" data-act="new-doc" data-type="ADJ" data-q='{"wh":${byWh[0] ? byWh[0].w.id : 1}}'>${icon('clipboard')} جرد</button>` : ''}<button class="btn" data-act="item-edit" data-id="${id}">${icon('edit')} تعديل</button></div></div>
      <div class="stat-strip mb-16">
        <div><div class="s-l">الرصيد الإجمالي</div><div class="s-v ${total <= (it.reorder || 0) && it.reorder ? 'neg' : ''}">${U.qty(total)} <span class="small muted">${esc(it.unit)}</span></div></div>
        <div><div class="s-l">متوسط التكلفة المرجح</div><div class="s-v num" style="text-align:right">${U.money(avg)}</div></div>
        <div><div class="s-l">قيمة المخزون</div><div class="s-v num" style="text-align:right">${U.money(total * avg)}</div></div>
        ${it.salePrice ? `<div><div class="s-l">سعر البيع · الهامش</div><div class="s-v small"><span class="num">${U.money(it.salePrice)}</span> · ${avg ? Math.round(((it.salePrice - avg) / it.salePrice) * 100) : 0}%</div></div>` : ''}
        <div><div class="s-l">حد إعادة الطلب</div><div class="s-v">${U.qty(it.reorder || 0)}</div></div>
        ${sold.length ? `<div><div class="s-l">إجمالي المباع</div><div class="s-v">${U.qty(U.sum(sold, (l) => l.baseQty))}</div></div>` : ''}
      </div>
      ${card.rows.length > 1 ? `<div class="card mb-16"><div class="card-h"><h3>${icon('trend')} مستوى الرصيد عبر الزمن</h3><span class="sub">${it.reorder ? 'حد الطلب ' + U.qty(it.reorder) + ' ' + esc(it.unit) : ''}</span></div><div class="mini-chart">${UI.areaChart({ values: [card.opening].concat(card.rows.map((r) => r.after)), labels: [''].concat(card.rows.map((r) => U.date(r.m.date).slice(3))), color: UI.chartColor('--chart-4'), height: 160 })}</div></div>` : ''}
      <div class="grid" style="grid-template-columns:minmax(0,1fr) 300px;align-items:start">
        <div class="card"><div class="card-h"><h3>كارت الصنف — الحركات</h3><span class="sub">كل حركة مرتبطة بمستندها الأصلي</span></div>
          ${UI.table({
            id: 'card-' + id, rows: [{ opening: true }].concat(card.rows), noPage: true, csv: 'stock-card-' + it.code, open: (r) => (r.d ? '#/doc/' + r.d.id : null), search: false,
            toolbar: `<div class="period-bar">${UI.sel('', [['', 'كل المخازن']].concat(DB.s.warehouses.map((w) => [w.id, w.name])), st.wh, { attrs: `data-change="ic-f" data-id="${id}" data-k="wh" style="width:auto;height:34px"` })}<input type="date" class="input" value="${st.from}" data-change="ic-f" data-id="${id}" data-k="from"><input type="date" class="input" value="${st.to}" data-change="ic-f" data-id="${id}" data-k="to"></div>`,
            cols: [
              { k: 'd', label: 'التاريخ', v: (r) => (r.opening ? '' : r.m.date), html: (r) => (r.opening ? '' : U.date(r.m.date)) },
              { k: 'doc', label: 'المستند', v: (r) => (r.opening ? 'رصيد أول المدة' : E.docNo(r.d)), html: (r) => (r.opening ? '<b>رصيد أول المدة</b>' : `<span class="tag">${E.TYPES[r.d.type].label}</span> <span class="code">${esc(E.docNo(r.d))}</span>`) },
              { k: 'memo', label: 'البيان', v: (r) => (r.opening ? '' : r.m.memo), html: (r) => (r.opening ? '' : `<span class="small">${esc(r.m.memo || '')}</span>${!st.wh ? ` <span class="tiny muted">${esc(E.nameOf('warehouses', r.m.whId))}</span>` : ''}`) },
              { k: 'b', label: 'قبل', num: true, v: (r) => (r.opening ? 0 : r.before), html: (r) => (r.opening ? '' : `<span class="muted">${U.qty(r.before)}</span>`) },
              { k: 'in', label: 'وارد', num: true, v: (r) => (r.opening ? 0 : r.in), html: (r) => (r.opening || !r.in ? '' : `<span class="pos">+${U.qty(r.in)}</span>`) },
              { k: 'out', label: 'صادر', num: true, v: (r) => (r.opening ? 0 : r.out), html: (r) => (r.opening || !r.out ? '' : `<span class="neg">−${U.qty(r.out)}</span>`) },
              { k: 'a', label: 'بعد', num: true, v: (r) => (r.opening ? card.opening : r.after), html: (r) => `<b>${U.qty(r.opening ? card.opening : r.after)}</b>` },
              { k: 'c', label: 'التكلفة', num: true, v: (r) => (r.opening ? 0 : r.m.cost), html: (r) => (r.opening ? '' : `<span class="small muted">${U.money(r.m.cost)}</span>`) },
            ],
          })}</div>
        <div class="col gap-12">
          <div class="card"><div class="card-h"><h3>${icon('boxes')} الرصيد حسب المخزن</h3></div><div class="info-list">${byWh.length ? byWh.map((x) => `<div class="i-row"><span>${esc(x.w.name)}</span><b class="num ${x.q < 0 ? 'neg' : ''}">${U.qty(x.q)}</b></div>`).join('') : '<div class="i-row muted">لا يوجد رصيد</div>'}</div></div>
          ${custody.length ? `<div class="card"><div class="card-h"><h3>${icon('yarn')} في عهدة الورش</h3></div><div class="info-list">${custody.map((x) => `<div class="i-row"><a href="#/party/${x.p.id}">${esc(x.p.name)}</a><b class="num">${U.qty(x.q)}</b></div>`).join('')}</div><div class="card-f tiny muted">العهدة خارج المخزن لكنها ما زالت ملك المصنع</div></div>` : ''}
        </div>
      </div>`;
    },
  };
  UI.acts['ic-f'] = (el) => { IS[+el.dataset.id][el.dataset.k] = el.value; App.refresh(); };

  /* أرصدة المخازن */
  const SF = { wh: '', low: false };
  Pages.stock = {
    render(p, q) {
      if (q.low) SF.low = true;
      const whs = DB.s.warehouses;
      let rows = DB.s.items.filter((i) => i.kind !== 'service').map((it) => {
        const per = whs.map((w) => E.onHand(it.id, w.id));
        const q2 = SF.wh ? E.onHand(it.id, +SF.wh) : U.sum(per);
        const c = E.avgCost(it.id);
        return { it, per, q: q2, c, v: U.r2(q2 * c), low: it.reorder > 0 && U.sum(per) <= it.reorder };
      }).filter((r) => Math.abs(r.q) > 0.0005 || r.low || !SF.wh);
      if (SF.low) rows = rows.filter((r) => r.low);
      const tot = U.sum(rows, (r) => r.v);
      return `
      <div class="page-h"><div class="titles"><h1>أرصدة المخازن</h1><div class="desc">الرصيد = مجموع الحركات الموثقة فقط · التقييم بالمتوسط المرجح</div></div>
        <div class="actions"><button class="btn" data-act="new-doc" data-type="STR">${icon('swap')} تحويل مخزني</button><button class="btn" data-act="new-doc" data-type="ADJ">${icon('clipboard')} جرد وتسوية</button><button class="btn" data-act="wh-manage">${icon('cog')} المخازن</button></div></div>
      <div class="stat-strip mb-16">${whs.map((w) => `<div><div class="s-l">${esc(w.name)}</div><div class="s-v num" style="text-align:right">${U.money(U.sum(DB.s.items, (it) => E.onHand(it.id, w.id) * E.avgCost(it.id)))}</div></div>`).join('')}<div><div class="s-l">الإجمالي</div><div class="s-v num" style="text-align:right">${U.money(U.sum(DB.s.items, (it) => E.onHand(it.id) * E.avgCost(it.id)))}</div></div></div>
      <div class="card">${UI.table({
        id: 'stock', rows, open: (r) => '#/item/' + r.it.id, csv: 'stock-balances', print: true, printTitle: 'أرصدة المخازن', printSub: 'حتى ' + U.date(U.today()),
        toolbar: `${UI.sel('', [['', 'كل المخازن']].concat(whs.map((w) => [w.id, w.name])), SF.wh, { attrs: 'data-change="stock-wh" style="width:auto;height:34px"' })}<label class="check small">${UI.sw('', SF.low, 'data-change="stock-low"')} تحت حد الطلب فقط</label>`,
        cols: [
          { k: 'code', label: 'الكود', v: (r) => r.it.code, html: (r) => `<span class="code">${esc(r.it.code)}</span>` },
          { k: 'name', label: 'الصنف', v: (r) => r.it.name, html: (r) => `${esc(r.it.name)}${r.low ? ' <span class="pill danger">إعادة طلب</span>' : ''}` },
          { k: 'cat', label: 'الفئة', v: (r) => E.nameOf('itemCats', r.it.catId) },
          ...(!SF.wh ? whs.map((w, i) => ({ k: 'w' + w.id, label: w.name.replace('مخزن ', ''), num: true, v: (r) => r.per[i], html: (r) => (Math.abs(r.per[i]) > 0.0005 ? U.qty(r.per[i]) : '<span class="muted">—</span>') })) : []),
          { k: 'q', label: 'الرصيد', num: true, v: (r) => r.q, html: (r) => `<b class="${r.q < 0 ? 'neg' : ''}">${U.qty(r.q)}</b> <span class="tiny muted">${esc(r.it.unit)}</span>${r.it.reorder ? UI.ibar(r.q / (r.it.reorder * 3), r.low ? 'var(--danger)' : 'var(--success)') : ''}` },
          { k: 'r', label: 'حد الطلب', num: true, v: (r) => r.it.reorder || 0, html: (r) => (r.it.reorder ? U.qty(r.it.reorder) : '—') },
          { k: 'c', label: 'متوسط التكلفة', num: true, v: (r) => r.c, html: (r) => UI.money(r.c) },
          { k: 'v', label: 'القيمة', num: true, v: (r) => r.v, html: (r) => UI.money(r.v), sum: () => UI.money(tot) },
        ],
      })}</div>`;
    },
  };
  UI.acts['stock-wh'] = (el) => { SF.wh = el.value; App.refresh(); };
  UI.acts['stock-low'] = (el) => { SF.low = el.checked; App.refresh(); };
  UI.acts['wh-manage'] = () => (location.hash = '#/settings/lists');

  /* ───────── الخزائن والبنوك ───────── */
  Pages.accounts = {
    render() {
      const rows = DB.s.accounts.map((a) => {
        const ent = E.ledgerOf ? null : null;
        const y0 = U.year(U.today()) + '-01-01';
        const cs = E.cashStatement(a.id, y0, U.today());
        return { a, b: E.cashBalance(a.id), inY: cs.in, outY: cs.out };
      });
      const types = { cash: 'خزينة نقدية', bank: 'حساب بنكي', wallet: 'محفظة إلكترونية' };
      return `
      <div class="page-h"><div class="titles"><h1>الخزائن والبنوك</h1><div class="desc">كل قبض أو دفع يحدد الخزينة/الحساب المتأثر — الرصيد يُحسب من الحركات فقط</div></div>
        <div class="actions"><button class="btn" data-act="new-doc" data-type="TR">${icon('swap')} تحويل بين الحسابات</button><button class="btn primary" data-act="acc-new">${icon('plus')} حساب جديد</button></div></div>
      <div class="grid g3 mb-16" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">${rows.map((r) => `<a class="kpi" href="#/account/${r.a.id}" style="text-decoration:none;color:inherit"><div class="k-top"><span class="k-ico">${icon(r.a.type === 'bank' ? 'bank' : r.a.type === 'wallet' ? 'wallet' : 'coins')}</span>${esc(r.a.name)}</div><div class="k-val ${r.b < 0 ? 'neg' : ''}">${U.money(r.b)}<small>${UI.cur()}</small></div><div class="k-foot">${types[r.a.type]}${r.a.number ? ' · ' + esc(r.a.number) : ''}${r.a.active === false ? ' · موقوف' : ''}</div></a>`).join('')}</div>
      <div class="card">${UI.table({ id: 'accounts', rows, open: (r) => '#/account/' + r.a.id, search: false, cols: [
        { k: 'n', label: 'الحساب', v: (r) => r.a.name, html: (r) => `<b>${esc(r.a.name)}</b>` },
        { k: 't', label: 'النوع', v: (r) => types[r.a.type] },
        { k: 'i', label: 'وارد ' + U.year(U.today()), num: true, v: (r) => r.inY, html: (r) => `<span class="pos">${U.money(r.inY)}</span>`, sum: true },
        { k: 'o', label: 'صادر ' + U.year(U.today()), num: true, v: (r) => r.outY, html: (r) => `<span class="neg">${U.money(r.outY)}</span>`, sum: true },
        { k: 'b', label: 'الرصيد الحالي', num: true, v: (r) => r.b, html: (r) => `<b class="${r.b < 0 ? 'neg' : ''}">${U.money(r.b)}</b>`, sum: true },
        { k: 'e', label: '', html: (r) => `<button class="btn xs ghost" data-act="acc-edit" data-id="${r.a.id}">${icon('edit')}</button>` },
      ] })}</div>`;
    },
    mount() { App.current.newFn = () => editAccount(null); },
  };
  const editAccount = (id) => {
    const a = id ? DB.get('accounts', id) : { type: 'cash', active: true };
    UI.modal({
      title: id ? 'تعديل الحساب' : 'خزينة / حساب بنكي جديد', size: 'sm',
      body: `<div class="grid">${UI.field('الاسم', UI.inp('name', a.name), { req: true })}${UI.field('النوع', UI.sel('type', [['cash', 'خزينة نقدية'], ['bank', 'حساب بنكي'], ['wallet', 'محفظة إلكترونية']], a.type))}${UI.field('رقم الحساب (اختياري)', UI.inp('number', a.number))}${id ? `<div class="row">${UI.sw('active', a.active !== false)} نشط</div>` : `<div class="notice info">${icon('info')}<div class="n-body small">لإدخال رصيد افتتاحي استخدم مستند "رصيد افتتاحي خزينة" بعد الحفظ.</div></div>`}</div>`,
      actions: [{ label: 'حفظ', cls: 'primary', primary: true, act: (m) => {
        const v = UI.readForm(m.el);
        if (!v.name.trim()) return UI.toast('الاسم مطلوب', 'danger');
        const r = UI.run(() => DB.tx(() => { E.need('finance'); if (id) { Object.assign(DB.get('accounts', id), { name: v.name, type: v.type, number: v.number, active: v.active }); DB.audit('تعديل حساب', 'account', id, v.name); return DB.get('accounts', id); } const x = DB.add('accounts', { name: v.name, type: v.type, number: v.number, active: true }); DB.audit('إضافة حساب', 'account', x.id, x.name); return x; }), 'تم الحفظ');
        if (r) { m.close(); App.refresh(); }
      } }, { label: 'تراجع' }],
    });
  };
  UI.acts['acc-new'] = () => editAccount(null);
  UI.acts['acc-edit'] = (el) => editAccount(+el.dataset.id);

  const AS = {};
  Pages.account = {
    render({ id }) {
      const a = DB.get('accounts', id);
      if (!a) return UI.empty('الحساب غير موجود');
      const st = AS[id] || (AS[id] = { from: U.startOfMonth(U.today()), to: U.today() });
      const s = E.cashStatement(id, st.from, st.to);
      return `
      <div class="crumbs"><a href="#/accounts">الخزائن والبنوك</a> ‹</div>
      <div class="page-h"><div class="titles"><h1>${icon(a.type === 'bank' ? 'bank' : 'coins')} ${esc(a.name)}</h1><div class="desc">حركة الخزينة — كل سطر يفتح مستنده</div></div>
        <div class="actions"><button class="btn" data-act="new-doc" data-type="RC">${icon('in')} قبض</button><button class="btn" data-act="new-doc" data-type="PY">${icon('out')} صرف</button><button class="btn" data-act="new-doc" data-type="TR">${icon('swap')} تحويل</button>${E.can('opening') ? `<button class="btn" data-act="new-doc" data-type="OA" data-q='{"acc":${id}}'>${icon('flag')} رصيد افتتاحي</button>` : ''}</div></div>
      <div class="stat-strip mb-16">
        <div><div class="s-l">رصيد أول المدة</div><div class="s-v num" style="text-align:right">${U.money(s.opening)}</div></div>
        <div><div class="s-l">الوارد</div><div class="s-v num pos" style="text-align:right">${U.money(s.in)}</div></div>
        <div><div class="s-l">الصادر</div><div class="s-v num neg" style="text-align:right">${U.money(s.out)}</div></div>
        <div><div class="s-l">رصيد آخر المدة</div><div class="s-v num" style="text-align:right">${U.money(s.closing)}</div></div>
        <div><div class="s-l">الرصيد الحالي</div><div class="s-v num" style="text-align:right">${U.money(E.cashBalance(id))}</div></div>
      </div>
      ${s.rows.length > 1 ? `<div class="card mb-16"><div class="card-h"><h3>${icon('trend')} الرصيد خلال الفترة</h3><span class="sub">${U.date(st.from)} ← ${U.date(st.to)}</span></div><div class="mini-chart">${UI.areaChart({ values: [s.opening].concat(s.rows.map((r) => r.balance)), labels: [U.date(st.from).slice(0, 5)].concat(s.rows.map((r) => U.date(r.date).slice(0, 5))), color: UI.chartColor('--chart-1'), height: 170 })}</div></div>` : ''}
      <div class="card">${UI.table({
        id: 'acc-' + id, rows: [{ opening: true }].concat(s.rows), noPage: true, csv: 'cash-' + id, print: true, printTitle: 'حركة ' + a.name, printSub: U.date(st.from) + ' ← ' + U.date(st.to), open: (r) => (r.d ? '#/doc/' + r.d.id : null),
        rowCls: (r) => (r.d && r.d.status === 'void' ? 'is-void' : ''),
        toolbar: `<div class="period-bar"><input type="date" class="input" value="${st.from}" data-change="acc-f" data-id="${id}" data-k="from"><input type="date" class="input" value="${st.to}" data-change="acc-f" data-id="${id}" data-k="to"></div>`,
        cols: [
          { k: 'd', label: 'التاريخ', v: (r) => (r.opening ? '' : r.date), html: (r) => (r.opening ? '' : U.date(r.date)), sort: false },
          { k: 'doc', label: 'المستند', v: (r) => (r.opening ? 'رصيد أول المدة' : E.docNo(r.d)), html: (r) => (r.opening ? '<b>رصيد أول المدة</b>' : `<span class="tag">${E.TYPES[r.d.type].label}</span> <span class="code">${esc(E.docNo(r.d))}</span>`), sort: false },
          { k: 'm', label: 'البيان', v: (r) => (r.opening ? '' : r.e.memo), html: (r) => (r.opening ? '' : `<span class="small">${esc(r.e.memo || '')}</span>`), cls: 'wrap', sort: false },
          { k: 'me', label: 'الطريقة', v: (r) => (r.opening ? '' : E.PAY_METHODS[r.e.method] || ''), html: (r) => (r.opening ? '' : `<span class="small muted">${E.PAY_METHODS[r.e.method] || ''}</span>`), sort: false },
          { k: 'i', label: 'وارد', num: true, v: (r) => (r.opening ? 0 : r.in), html: (r) => (r.opening || !r.in ? '' : `<span class="pos">${U.money(r.in)}</span>`), sum: () => UI.money(s.in), sort: false },
          { k: 'o', label: 'صادر', num: true, v: (r) => (r.opening ? 0 : r.out), html: (r) => (r.opening || !r.out ? '' : `<span class="neg">${U.money(r.out)}</span>`), sum: () => UI.money(s.out), sort: false },
          { k: 'b', label: 'الرصيد', num: true, v: (r) => (r.opening ? s.opening : r.balance), html: (r) => `<b>${U.money(r.opening ? s.opening : r.balance)}</b>`, sum: () => UI.money(s.closing), sort: false },
        ],
      })}</div>`;
    },
  };
  UI.acts['acc-f'] = (el) => { AS[+el.dataset.id][el.dataset.k] = el.value; App.refresh(); };
})();
