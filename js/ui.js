/* مكونات الواجهة: إشعارات، نوافذ، قوائم بحث، جداول، اختصارات، لوحة أوامر، رسوم بيانية */
(function () {
  const esc = U.esc;
  const UI = { acts: {}, sources: {}, tables: {}, pageKeys: {} };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  UI.$ = $; UI.$$ = $$;
  const MOD = U.isMac ? '⌘' : 'Ctrl';
  UI.MOD = MOD;
  UI.k = (combo) => combo.split('+').map((p) => `<kbd>${p === 'mod' ? MOD : p === 'alt' ? (U.isMac ? '⌥' : 'Alt') : p === 'shift' ? '⇧' : p === 'enter' ? 'Enter' : p.length === 1 ? p.toUpperCase() : p}</kbd>`).join('');

  /* ───────── عرض القيم ───────── */
  UI.money = (n, dash) => (dash && !n ? '<span class="muted">—</span>' : `<span class="num">${U.money(n)}</span>`);
  UI.qty = (n) => `<span class="num">${U.qty(n)}</span>`;
  UI.cur = () => esc(DB.s.settings.currency || '');
  // رصيد بصيغة واضحة: "عليه / له" بدل الإشارات
  UI.bal = (n, kind) => {
    if (Math.abs(n) < 0.005) return '<span class="bal zero"><span class="num">0.00</span></span>';
    const dr = n > 0;
    const lbl = kind === 'worker' ? (dr ? 'سلف عليه' : 'مستحق له') : kind === 'cash' ? (dr ? '' : 'سالب') : dr ? 'عليه' : 'له';
    return `<span class="bal ${dr ? 'dr' : 'cr'}"><span class="num">${U.money(Math.abs(n))}</span>${lbl ? `<span class="side">${lbl}</span>` : ''}</span>`;
  };
  UI.status = (d) => `<span class="pill ${d.status}">${E.STATUS[d.status]}</span>`;
  UI.payPill = (ps) => {
    if (!ps) return '';
    const m = { paid: ['paid', 'مسدد'], partial: ['partial', 'مسدد جزئيًا'], unpaid: ['unpaid', 'غير مسدد'] }[ps.status];
    return `<span class="pill ${m[0]}">${m[1]}</span>`;
  };
  UI.initials = (name) => { const p = String(name || '?').replace(/^(م\.|د\.)\s*/, '').split(/\s+/); return esc((p[0] || '?')[0] + (p[1] ? p[1][0] : '')); };
  UI.docLink = (d) => d ? `<a href="#/doc/${d.id}">${esc(E.docNo(d))}</a>` : '—';
  UI.partyLink = (id) => { const p = DB.get('parties', id); return p ? `<a href="#/party/${p.id}">${esc(p.name)}</a>` : '—'; };
  UI.subjLink = (st, id) => (st === 'worker' ? (() => { const w = DB.get('workers', id); return w ? `<a href="#/worker/${w.id}">${esc(w.name)}</a>` : '—'; })() : UI.partyLink(id));
  UI.itemLink = (id) => { const it = DB.get('items', id); return it ? `<a href="#/item/${it.id}">${esc(it.name)}</a>` : '—'; };
  UI.empty = (title, sub, ic) => `<div class="empty"><div class="empty-art"><span class="ea-dot d1"></span><span class="ea-dot d2"></span><span class="ea-dot d3"></span>${icon(ic || 'list')}</div><div class="e-title">${esc(title)}</div><div>${sub || ''}</div></div>`;

  /* ───────── إشعارات ───────── */
  UI.toast = (msg, type = 'info', details) => {
    let host = $('.toasts');
    if (!host) { host = document.createElement('div'); host.className = 'toasts'; document.body.appendChild(host); }
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    const ic = { danger: 'alert', success: 'checkCircle', warning: 'alert', info: 'info' }[type] || 'info';
    t.innerHTML = `${icon(ic)}<div class="grow"><div>${esc(msg)}</div>${details && details.length ? '<ul>' + details.slice(0, 8).map((d) => `<li>${esc(d)}</li>`).join('') + (details.length > 8 ? `<li>و${details.length - 8} أخرى…</li>` : '') + '</ul>' : ''}</div><button class="t-close" aria-label="إغلاق">${icon('x')}</button>`;
    host.appendChild(t);
    const kill = () => { t.style.opacity = '0'; t.style.transition = 'opacity .2s'; setTimeout(() => t.remove(), 200); };
    t.querySelector('.t-close').onclick = kill;
    setTimeout(kill, type === 'danger' ? 9000 : 3800);
  };
  UI.error = (e) => {
    if (e && e.biz) UI.toast(e.message, 'danger', e.details);
    else { console.error(e); UI.toast('حدث خطأ غير متوقع: ' + (e && e.message), 'danger'); }
  };
  // تنفيذ آمن مع منع الضغط المزدوج
  let busy = false;
  UI.run = (fn, okMsg) => {
    if (busy) return null;
    busy = true;
    try { const r = fn(); if (okMsg) UI.toast(okMsg, 'success'); return r; }
    catch (e) { UI.error(e); return null; }
    finally { setTimeout(() => (busy = false), 250); }
  };

  /* ───────── نوافذ ───────── */
  const stack = [];
  UI.modal = (o) => {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="modal ${o.size || ''}" role="dialog" aria-modal="true">
      <div class="modal-h"><h3>${o.title || ''}</h3>${o.headExtra || ''}<button class="btn ghost icon sm" data-x aria-label="إغلاق">${icon('x')}</button></div>
      <div class="modal-b">${o.body || ''}</div>
      ${o.actions ? `<div class="modal-f">${o.actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-i="${i}">${a.label}${a.key ? ' ' + UI.k(a.key) : ''}</button>`).join('')}<span class="grow"></span>${o.footNote || ''}</div>` : ''}
    </div>`;
    document.body.appendChild(ov);
    const m = { el: ov.querySelector('.modal'), ov, o };
    const close = (v) => {
      const i = stack.indexOf(m);
      if (i >= 0) stack.splice(i, 1);
      ov.remove();
      o.onClose && o.onClose(v);
      if (m.prevFocus && document.contains(m.prevFocus)) m.prevFocus.focus();
    };
    m.close = close;
    m.prevFocus = document.activeElement;
    ov.addEventListener('mousedown', (e) => { if (e.target === ov && o.dismissable !== false) close(); });
    ov.querySelector('[data-x]').onclick = () => close();
    (o.actions || []).forEach((a, i) => (ov.querySelector(`[data-i="${i}"]`).onclick = () => a.act ? a.act(m) : close()));
    m.primary = () => { const a = (o.actions || []).find((x) => x.primary) || (o.actions || [])[0]; if (a && a.act) a.act(m); };
    stack.push(m);
    o.onMount && o.onMount(m.el, m);
    setTimeout(() => { const f = m.el.querySelector('[autofocus]') || m.el.querySelector('.modal-b input:not([type=hidden]):not([readonly]), .modal-b select, .modal-b textarea'); f && f.focus(); }, 30);
    return m;
  };
  UI.topModal = () => stack[stack.length - 1] || null;
  UI.confirm = (o) => new Promise((res) => {
    UI.modal({
      title: o.title || 'تأكيد', size: 'sm', body: `<div class="text-2">${o.message || ''}</div>`,
      actions: [{ label: o.ok || 'تأكيد', cls: o.danger ? 'danger solid' : 'primary', primary: true, act: (m) => { m.close(true); } }, { label: 'تراجع', act: (m) => m.close(false) }],
      onClose: (v) => res(!!v),
    });
  });
  UI.prompt = (o) => new Promise((res) => {
    UI.modal({
      title: o.title, size: 'sm',
      body: `${o.message ? `<div class="text-2 mb-12">${o.message}</div>` : ''}<div class="field"><label>${o.label || ''}</label>${o.textarea ? `<textarea class="input" id="pv" placeholder="${esc(o.placeholder || '')}" autofocus>${esc(o.value || '')}</textarea>` : `<input class="input" id="pv" value="${esc(o.value || '')}" placeholder="${esc(o.placeholder || '')}" autofocus>`}</div>`,
      actions: [{ label: o.ok || 'حفظ', cls: o.danger ? 'danger solid' : 'primary', primary: true, act: (m) => { const v = m.el.querySelector('#pv').value.trim(); if (o.required && !v) { m.el.querySelector('#pv').classList.add('invalid'); return; } m.close(v); } }, { label: 'تراجع', act: (m) => m.close(null) }],
      onClose: (v) => res(v == null ? null : v),
    });
  });

  /* ───────── قوائم منبثقة ───────── */
  let curPop = null;
  UI.closePop = () => { if (curPop) { curPop.el.remove(); curPop.onClose && curPop.onClose(); curPop = null; } };
  UI.pop = (anchor, html, o = {}) => {
    UI.closePop();
    const el = document.createElement('div');
    el.className = 'pop ' + (o.cls || '');
    el.innerHTML = html;
    document.body.appendChild(el);
    const r = anchor.getBoundingClientRect();
    const w = Math.max(o.width || r.width, o.minWidth || 240);
    el.style.width = w + 'px';
    let left = o.alignStart ? r.right - w : r.left;
    if (left < 8) left = 8;
    if (left + w > innerWidth - 8) left = innerWidth - w - 8;
    el.style.left = left + 'px';
    const h = el.offsetHeight;
    el.style.top = (r.bottom + h + 6 > innerHeight && r.top > h ? r.top - h - 4 : r.bottom + 4) + 'px';
    curPop = { el, anchor, onClose: o.onClose };
    return el;
  };
  document.addEventListener('mousedown', (e) => { if (curPop && !curPop.el.contains(e.target) && !curPop.anchor.contains(e.target)) UI.closePop(); });
  window.addEventListener('resize', () => UI.closePop());
  document.addEventListener('scroll', (e) => { if (curPop && !curPop.el.contains(e.target)) UI.closePop(); }, true);
  UI.menu = (anchor, items, o = {}) => {
    const el = UI.pop(anchor, `<div class="menu">${items.map((it, i) => it.sep ? '<div class="sep"></div>' : it.label && it.header ? `<div class="m-label">${it.label}</div>` : `<div class="opt ${it.danger ? 'neg' : ''}" data-i="${i}">${it.icon ? icon(it.icon) : ''}<span>${it.label}</span>${it.kbd ? UI.k(it.kbd) : ''}</div>`).join('')}</div>`, Object.assign({ minWidth: 230, alignStart: true }, o));
    el.querySelectorAll('[data-i]').forEach((x) => x.addEventListener('mousedown', (e) => { e.preventDefault(); const it = items[+x.dataset.i]; UI.closePop(); it.act && it.act(); }));
    el.querySelectorAll('.opt svg').forEach((s) => { s.style.width = '16px'; s.style.height = '16px'; s.style.color = 'var(--text-3)'; });
  };

  /* ───────── حقل بحث واختيار (Combobox) ───────── */
  UI.combo = (o) => {
    const src = UI.sources[o.source];
    const label = o.value != null && o.value !== '' && src && src.label ? src.label(o.value, o.arg) : '';
    return `<div class="combo ${o.cls || ''}" data-combo="${o.source}" data-arg="${esc(o.arg || '')}" ${o.attrs || ''}>
      <input class="input" autocomplete="off" value="${esc(label)}" placeholder="${esc(o.placeholder || 'ابحث بالاسم أو الكود…')}" ${o.disabled ? 'disabled' : ''} ${o.inputAttrs || ''}>
      <input type="hidden" name="${o.name || ''}" value="${o.value == null ? '' : esc(o.value)}">${icon('chevDown', 'c-arrow')}</div>`;
  };
  function comboOpen(box, showAll) {
    const input = box.querySelector('input:not([type=hidden])');
    const src = UI.sources[box.dataset.combo];
    if (!src) return;
    const q = showAll ? '' : input.value;
    let list = src(q, box.dataset.arg) || [];
    const max = 60;
    const more = list.length > max;
    list = list.slice(0, max);
    box._list = list;
    box._idx = list.length ? 0 : -1;
    const createOpt = src.create && q.trim() ? `<div class="opt create" data-create="1">${icon('plus')} إضافة "${esc(q.trim())}"</div>` : '';
    const html = (list.length ? list.map((x, i) => `<div class="opt ${i === 0 ? 'on' : ''}" data-i="${i}">${x.code ? `<span class="code">${esc(x.code)}</span>` : ''}<div class="grow"><div class="ellipsis">${esc(x.label)}</div>${x.sub ? `<div class="o-sub ellipsis">${esc(x.sub)}</div>` : ''}</div>${x.hint ? `<span class="o-hint">${x.hint}</span>` : ''}</div>`).join('') : '<div class="none">لا توجد نتائج</div>') + (more ? '<div class="none tiny">اكتب لتضييق النتائج…</div>' : '') + createOpt;
    const el = UI.pop(input, html, { minWidth: 300, onClose: () => { box._open = false; } });
    box._open = true;
    el.querySelectorAll('[data-i]').forEach((o) => o.addEventListener('mousedown', (e) => { e.preventDefault(); comboPick(box, +o.dataset.i); }));
    const c = el.querySelector('[data-create]');
    if (c) c.addEventListener('mousedown', (e) => { e.preventDefault(); UI.closePop(); src.create(q.trim(), box.dataset.arg, (id) => comboSet(box, id)); });
  }
  function comboSet(box, id) {
    const src = UI.sources[box.dataset.combo];
    const input = box.querySelector('input:not([type=hidden])');
    const hid = box.querySelector('input[type=hidden]');
    hid.value = id == null ? '' : id;
    input.value = id == null ? '' : src.label(id, box.dataset.arg);
    box.dispatchEvent(new CustomEvent('combo', { bubbles: true, detail: { value: id == null ? null : +id || id } }));
  }
  function comboPick(box, i) {
    const x = box._list && box._list[i];
    UI.closePop();
    if (!x) return;
    const input = box.querySelector('input:not([type=hidden])');
    const key = box.dataset.f ? `[data-f="${box.dataset.f}"]` : box.dataset.l ? `[data-l="${box.dataset.l}"][data-i="${box.dataset.i}"]` : null;
    comboSet(box, x.id);
    if (box._advance === false) return;
    // المعالج قد يعيد رسم الحقل أو ينقل التركيز بنفسه — ننقل التركيز فورًا حتى لا تضيع ضغطات الكتابة السريعة
    const a = document.activeElement;
    if (a && a !== input && a !== document.body && document.contains(a)) return;
    let target = input;
    if (!document.contains(input) && key) { const nb = document.querySelector('.combo' + key); target = nb && nb.querySelector('input:not([type=hidden])'); }
    if (target) UI.focusNext(target);
  }
  UI.comboSet = comboSet;
  UI.focusNext = (el) => {
    const scope = el.closest('.modal, .content') || document;
    const f = $$('input:not([type=hidden]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]), button.focus-stop', scope).filter((x) => x.offsetParent);
    const i = f.indexOf(el);
    if (i >= 0 && f[i + 1]) { f[i + 1].focus(); f[i + 1].select && f[i + 1].select(); }
  };
  document.addEventListener('focusin', (e) => {
    const box = e.target.closest && e.target.closest('.combo');
    if (box && e.target.tagName === 'INPUT' && e.target.type !== 'hidden') { e.target.select(); comboOpen(box, true); }
  });
  document.addEventListener('input', (e) => {
    const box = e.target.closest && e.target.closest('.combo');
    if (box && e.target.type !== 'hidden') comboOpen(box, false);
  });
  document.addEventListener('focusout', (e) => {
    const box = e.target.closest && e.target.closest('.combo');
    if (!box || e.target.type === 'hidden') return;
    setTimeout(() => {
      if (box.contains(document.activeElement)) return;
      const hid = box.querySelector('input[type=hidden]');
      const src = UI.sources[box.dataset.combo];
      // إذا كتب المستخدم نصًا ولم يختر: نرجع للقيمة المحفوظة
      if (e.target.value.trim() === '' && hid.value !== '') comboSet(box, null);
      else e.target.value = hid.value ? src.label(hid.value, box.dataset.arg) : '';
      if (curPop && curPop.anchor === e.target) UI.closePop();
    }, 120);
  });
  document.addEventListener('keydown', (e) => {
    const box = e.target.closest && e.target.closest('.combo');
    if (!box || e.target.type === 'hidden') return;
    if (!box._open) { if (e.key === 'ArrowDown' || (e.altKey && e.key === 'ArrowDown') || e.key === 'F4') { e.preventDefault(); comboOpen(box, true); } return; }
    const opts = curPop ? $$('[data-i]', curPop.el) : [];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      box._idx = Math.max(0, Math.min(opts.length - 1, box._idx + (e.key === 'ArrowDown' ? 1 : -1)));
      opts.forEach((o, i) => o.classList.toggle('on', i === box._idx));
      opts[box._idx] && opts[box._idx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (box._idx >= 0 && opts.length && e.target.value.trim() !== '') { e.preventDefault(); e.stopPropagation(); comboPick(box, box._idx); }
      else if (box._idx >= 0 && opts.length && e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); comboPick(box, box._idx); }
      else UI.closePop();
    } else if (e.key === 'Escape') { e.stopPropagation(); UI.closePop(); }
  }, true);

  /* ───────── الجداول ───────── */
  UI.table = (cfg) => {
    const st = UI.tables[cfg.id] || (UI.tables[cfg.id] = { q: '', sort: cfg.sort || null, dir: cfg.dir || 'desc', page: 0, sel: -1 });
    st.cfg = cfg;
    const tools = cfg.search === false && !cfg.toolbar && !cfg.csv ? '' : `<div class="tbl-tools">
      ${cfg.search === false ? '' : `<div class="tbl-search">${icon('search')}<input class="input" data-tbl-q="${cfg.id}" placeholder="${esc(cfg.searchPh || 'بحث… (اضغط /)')}" value="${esc(st.q)}"></div>`}
      ${cfg.toolbar || ''}<span class="grow"></span>
      ${cfg.csv ? `<button class="btn sm ghost" data-act="tbl-csv" data-id="${cfg.id}" title="تصدير Excel/CSV">${icon('download')} تصدير</button>` : ''}
      ${cfg.print ? `<button class="btn sm ghost" data-act="tbl-print" data-id="${cfg.id}">${icon('printer')} طباعة</button>` : ''}
    </div>`;
    return `<div class="tbl-host" data-tbl="${cfg.id}" tabindex="0">${tools}<div class="tbl-body">${tableBody(cfg.id)}</div></div>`;
  };
  function tableRows(id) {
    const st = UI.tables[id], cfg = st.cfg;
    let rows = cfg.rows;
    if (st.q) rows = rows.filter((r) => U.match(cfg.cols.map((c) => (c.v ? c.v(r) : '')).join(' ') + ' ' + (cfg.extraSearch ? cfg.extraSearch(r) : ''), st.q));
    if (st.sort != null) {
      const c = cfg.cols.find((x) => x.k === st.sort);
      if (c && c.v) {
        const dir = st.dir === 'asc' ? 1 : -1;
        rows = rows.slice().sort((a, b) => { const x = c.v(a), y = c.v(b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ar')) * dir; });
      }
    }
    return rows;
  }
  function tableBody(id) {
    const st = UI.tables[id], cfg = st.cfg;
    const rows = tableRows(id);
    st.view = rows;
    const ps = cfg.pageSize || 50;
    const pages = Math.max(1, Math.ceil(rows.length / ps));
    if (st.page >= pages) st.page = pages - 1;
    const slice = cfg.noPage ? rows : rows.slice(st.page * ps, st.page * ps + ps);
    const head = cfg.cols.map((c) => `<th class="${c.num ? 'num' : ''} ${c.v && c.sort !== false ? 'sortable' : ''}" ${c.w ? `style="width:${c.w}"` : ''} ${c.v && c.sort !== false ? `data-tbl-sort="${id}" data-k="${c.k}"` : ''}>${c.label}${st.sort === c.k ? `<span class="sort">${st.dir === 'asc' ? '▲' : '▼'}</span>` : ''}</th>`).join('');
    const body = slice.length ? slice.map((r, i) => {
      const href = cfg.open ? cfg.open(r) : null;
      return `<tr class="${href ? 'click' : ''} ${cfg.rowCls ? cfg.rowCls(r) : ''} ${st.sel === i ? 'sel' : ''}" ${href ? `data-href="${href}"` : ''}>${cfg.cols.map((c) => `<td class="${c.num ? 'num' : ''} ${c.cls || ''}">${c.html ? c.html(r) : esc(c.v ? c.v(r) : '')}</td>`).join('')}</tr>`;
    }).join('') : `<tr><td colspan="${cfg.cols.length}">${UI.empty(cfg.empty || 'لا توجد بيانات', cfg.emptySub || (st.q ? 'جرّب كلمة بحث أخرى' : ''), cfg.emptyIcon)}</td></tr>`;
    const hasSum = cfg.cols.some((c) => c.sum);
    const foot = hasSum && rows.length ? `<tfoot><tr>${cfg.cols.map((c, i) => `<td class="${c.num ? 'num' : ''}">${c.sum ? (typeof c.sum === 'function' ? c.sum(rows) : UI.money(U.sum(rows, c.v))) : i === 0 ? 'الإجمالي' : ''}</td>`).join('')}</tr></tfoot>` : '';
    const pager = !cfg.noPage && rows.length > ps ? `<div class="tbl-foot"><span>${U.int(st.page * ps + 1)}–${U.int(Math.min(rows.length, (st.page + 1) * ps))} من ${U.int(rows.length)}</span><span class="grow"></span>
      <button class="btn xs" data-tbl-page="${id}" data-d="-1" ${st.page === 0 ? 'disabled' : ''}>${icon('chevRight')} السابق</button>
      <button class="btn xs" data-tbl-page="${id}" data-d="1" ${st.page >= pages - 1 ? 'disabled' : ''}>التالي ${icon('chevLeft')}</button></div>`
      : rows.length ? `<div class="tbl-foot"><span>${U.int(rows.length)} سجل</span></div>` : '';
    return `<div class="tbl-wrap" ${cfg.maxH ? `style="max-height:${cfg.maxH}"` : ''}><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table></div>${cfg.noFoot ? '' : pager}`;
  }
  UI.refreshTable = (id) => { const h = $(`[data-tbl="${id}"] .tbl-body`); if (h && UI.tables[id]) h.innerHTML = tableBody(id); };
  document.addEventListener('input', U.debounce((e) => {
    const id = e.target.dataset && e.target.dataset.tblQ;
    if (!id || !UI.tables[id]) return;
    UI.tables[id].q = e.target.value; UI.tables[id].page = 0; UI.tables[id].sel = -1;
    UI.refreshTable(id);
  }, 120));
  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-tbl-sort]');
    if (s) { const st = UI.tables[s.dataset.tblSort]; if (st.sort === s.dataset.k) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = s.dataset.k; st.dir = 'desc'; } UI.refreshTable(s.dataset.tblSort); return; }
    const p = e.target.closest('[data-tbl-page]');
    if (p) { UI.tables[p.dataset.tblPage].page += +p.dataset.d; UI.tables[p.dataset.tblPage].sel = -1; UI.refreshTable(p.dataset.tblPage); return; }
    const tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a,button,input,select,label')) location.hash = tr.dataset.href;
  });
  document.addEventListener('keydown', (e) => {
    const host = e.target.closest && e.target.closest('.tbl-host');
    if (!host || (e.target !== host && !e.target.matches('[data-tbl-q]'))) return;
    const id = host.dataset.tbl, st = UI.tables[id];
    if (!st) return;
    const trs = $$('tbody tr', host);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (e.target.matches('[data-tbl-q]')) host.focus();
      st.sel = Math.max(0, Math.min(trs.length - 1, st.sel + (e.key === 'ArrowDown' ? 1 : -1)));
      trs.forEach((t, i) => t.classList.toggle('sel', i === st.sel));
      trs[st.sel] && trs[st.sel].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && st.sel >= 0 && trs[st.sel] && trs[st.sel].dataset.href) { e.preventDefault(); location.hash = trs[st.sel].dataset.href; }
    else if ((e.key === 'PageDown' || e.key === 'PageUp') && st.cfg) { e.preventDefault(); const d = e.key === 'PageDown' ? 1 : -1; const pages = Math.ceil(st.view.length / (st.cfg.pageSize || 50)); st.page = Math.max(0, Math.min(pages - 1, st.page + d)); st.sel = -1; UI.refreshTable(id); }
  });
  UI.tableCSV = (id) => {
    const st = UI.tables[id]; if (!st) return;
    const cols = st.cfg.cols.filter((c) => c.v && c.csv !== false);
    const rows = [cols.map((c) => String(c.label).replace(/<[^>]+>/g, ''))].concat(st.view.map((r) => cols.map((c) => { const v = c.v(r); return typeof v === 'number' ? U.r2(v) : v; })));
    U.download((st.cfg.csv || id) + '-' + U.today() + '.csv', U.csv(rows));
    UI.toast('تم تصدير ' + st.view.length + ' سجل — يفتح مباشرة في Excel', 'success');
  };
  UI.tablePrint = (id, title) => {
    const st = UI.tables[id]; if (!st) return;
    const cols = st.cfg.cols.filter((c) => c.v && c.csv !== false);
    const c = DB.s.settings.company;
    const html = `<div class="paper A4 rep-paper rep-print"><div class="rp-h"><div><b style="font-size:16px">${esc(title || st.cfg.printTitle || '')}</b><div class="small muted">${esc(st.cfg.printSub || '')}</div></div><div class="row"><div style="text-align:left"><b>${esc(c.name)}</b><div class="tiny muted">طُبع في ${U.dateTime(U.now())}</div></div>${c.logo ? `<img src="${c.logo}" style="width:40px;height:40px">` : ''}</div></div>
      <table><thead><tr>${cols.map((x) => `<th>${x.label}</th>`).join('')}</tr></thead><tbody>${st.view.map((r) => `<tr>${cols.map((x) => { const v = x.v(r); return `<td class="${x.num ? 'num' : ''}">${typeof v === 'number' && x.num ? U.money(v) : esc(v)}</td>`; }).join('')}</tr>`).join('')}</tbody>
      ${cols.some((x) => x.sum) ? `<tfoot><tr>${cols.map((x, i) => `<td class="num">${x.sum ? U.money(U.sum(st.view, x.v)) : i === 0 ? 'الإجمالي' : ''}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
    UI.print(html);
  };
  UI.acts['tbl-csv'] = (el) => UI.tableCSV(el.dataset.id);
  UI.acts['tbl-print'] = (el) => UI.tablePrint(el.dataset.id);

  /* ───────── نماذج ───────── */
  UI.field = (label, input, o = {}) => `<div class="field ${o.cls || ''}">${label ? `<label>${label}${o.req ? ' <span class="req">*</span>' : ''}${o.extra || ''}</label>` : ''}${input}${o.hint ? `<div class="hint">${o.hint}</div>` : ''}</div>`;
  UI.inp = (name, value, o = {}) => `<input class="input ${o.num ? 'num' : ''} ${o.cls || ''}" name="${name}" type="${o.type || 'text'}" value="${esc(value == null ? '' : value)}" ${o.num ? 'inputmode="decimal" data-num' : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.attrs || ''}>`;
  UI.sel = (name, opts, value, o = {}) => `<select class="input ${o.cls || ''}" name="${name}" ${o.attrs || ''}>${o.empty != null ? `<option value="">${esc(o.empty)}</option>` : ''}${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  UI.area = (name, value, o = {}) => `<textarea class="input" name="${name}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} rows="${o.rows || 3}">${esc(value || '')}</textarea>`;
  UI.chk = (name, checked, label) => `<label class="check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}> ${label}</label>`;
  UI.sw = (name, checked, attrs) => `<label class="switch"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''} ${attrs || ''}><span></span></label>`;
  UI.readForm = (el) => {
    const o = {};
    $$('[name]', el).forEach((x) => {
      if (!x.name) return;
      if (x.type === 'checkbox') o[x.name] = x.checked;
      else if (x.type === 'radio') { if (x.checked) o[x.name] = x.value; }
      else if (x.dataset.num != null) o[x.name] = U.num(x.value);
      else if (x.type === 'hidden' && x.closest('.combo')) o[x.name] = x.value === '' ? null : isNaN(+x.value) ? x.value : +x.value;
      else o[x.name] = x.value;
    });
    return o;
  };
  UI.opts = (coll, filter) => DB.s[coll].filter((x) => x.active !== false && (!filter || filter(x))).map((x) => [x.id, x.name]);

  /* ───────── طباعة ───────── */
  UI.print = (html) => {
    let root = $('#print-root');
    root.innerHTML = html;
    const go = () => setTimeout(() => window.print(), 60);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  };

  /* ───────── اختصارات لوحة المفاتيح ───────── */
  const global = [];
  UI.bind = (combo, fn, o = {}) => global.push({ combo, fn, o });
  UI.comboOf = (e) => {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('mod');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey && (e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey)) parts.push('shift');
    let k;
    if (/^Key[A-Z]$/.test(e.code)) k = e.code.slice(3).toLowerCase();
    else if (/^Digit\d$/.test(e.code)) k = e.code.slice(5);
    else if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) k = '?';
    else if (e.code === 'BracketLeft' && !e.shiftKey) k = '[';
    else k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
    parts.push(k);
    return parts.join('+');
  };
  const typing = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || document.body.classList.contains('is-locked')) return; // الشاشة مقفلة: لا اختصارات
    const combo = UI.comboOf(e);
    const inField = typing(e.target);
    const m = UI.topModal();
    if (combo === 'escape') {
      if (curPop) { UI.closePop(); e.preventDefault(); return; }
      if (m) { m.close(); e.preventDefault(); return; }
      if (inField) { e.target.blur(); return; }
    }
    if (m) {
      if ((combo === 'mod+enter' || (combo === 'enter' && !inField)) || (combo === 'enter' && e.target.tagName === 'INPUT' && !e.target.closest('.combo') && m.o.enterSubmits !== false)) { e.preventDefault(); m.primary(); }
      if (m.o.keys && m.o.keys[combo]) { e.preventDefault(); m.o.keys[combo](m); }
      return;
    }
    const handlers = [UI.pageKeys[combo] ? { fn: UI.pageKeys[combo], o: { any: true } } : null].concat(global.filter((g) => g.combo === combo)).filter(Boolean);
    for (const h of handlers) {
      const hasMod = /mod\+|alt\+/.test(combo) || /^f\d+$/.test(combo);
      if (inField && !hasMod && !h.o.inFields) continue;
      e.preventDefault();
      h.fn(e);
      return;
    }
  });

  /* ───────── لوحة الأوامر ───────── */
  UI.commands = []; // تُملأ من التطبيق
  UI.palette = () => {
    if (UI.topModal() && UI.topModal().o.isPalette) return;
    let items = [], idx = 0;
    const m = UI.modal({
      isPalette: true, size: 'palette', title: '', body: '', enterSubmits: false,
    });
    m.el.classList.add('palette');
    m.el.innerHTML = `<div class="p-input">${icon('search')}<input placeholder="اكتب اسم صفحة، عميل، صنف، رقم فاتورة… أو أمرًا مثل: فاتورة جديدة" autofocus></div><div class="p-list"></div>
      <div class="p-foot"><span>${UI.k('↑')}${UI.k('↓')} تنقل</span><span>${UI.k('enter')} فتح</span><span>${UI.k('Esc')} إغلاق</span><span class="grow"></span><span>اكتب <b>#</b> للبحث برقم مستند</span></div>`;
    const input = m.el.querySelector('input'), list = m.el.querySelector('.p-list');
    const render = () => {
      const q = input.value.trim();
      items = [];
      const cmds = UI.commands.filter((c) => U.match(c.label + ' ' + (c.keywords || ''), q));
      const add = (sec, arr) => { if (arr.length) items.push({ sec }); items.push(...arr); };
      add('أوامر وصفحات', cmds.slice(0, q ? 12 : 9));
      if (q.length >= 1) {
        const qq = q.replace(/^#/, '');
        add('الأطراف', DB.s.parties.filter((p) => U.match(p.name + ' ' + p.code + ' ' + (p.phone || ''), qq)).slice(0, 6).map((p) => ({ label: p.name, sub: p.code + ' · ' + p.types.map((t) => E.PARTY_TYPES[t]).join('، '), ico: 'users', hint: UI.bal(E.balance('party', p.id)), go: '#/party/' + p.id })));
        add('الأصناف', DB.s.items.filter((i) => U.match(i.name + ' ' + i.code, qq)).slice(0, 6).map((i) => ({ label: i.name, sub: i.code + ' · رصيد ' + U.qty(E.onHand(i.id)) + ' ' + i.unit, ico: 'tag', go: '#/item/' + i.id })));
        add('المستندات', DB.s.docs.filter((d) => U.match((d.no || '') + ' ' + E.TYPES[d.type].label + ' ' + (d.sid ? E.subjectName(d.st || 'party', d.sid) : ''), qq)).slice(-8).reverse().map((d) => ({ label: E.docTitle(d), sub: U.date(d.date) + (d.sid ? ' · ' + E.subjectName(d.st || 'party', d.sid) : '') + ' · ' + E.STATUS[d.status], ico: E.TYPES[d.type].icon, hint: d.totals && d.totals.total ? UI.money(d.totals.total) : '', go: '#/doc/' + d.id })));
        add('العمال', DB.s.workers.filter((w) => U.match(w.name + ' ' + w.code, qq)).slice(0, 4).map((w) => ({ label: w.name, sub: w.code + ' · ' + E.nameOf('departments', w.deptId), ico: 'user', go: '#/worker/' + w.id })));
        add('الموديلات وأوامر التشغيل', DB.s.models.filter((x) => U.match(x.name + ' ' + x.code, qq)).slice(0, 4).map((x) => ({ label: x.code + ' — ' + x.name, ico: 'shirt', go: '#/model/' + x.id })).concat(DB.s.orders.filter((o) => U.match(o.no + ' ' + E.nameOf('parties', o.partyId), qq)).slice(-4).map((o) => ({ label: 'أمر تشغيل ' + o.no, sub: E.nameOf('parties', o.partyId), ico: 'factory', go: '#/order/' + o.id }))));
      }
      idx = items.findIndex((x) => !x.sec);
      list.innerHTML = items.length ? items.map((x, i) => x.sec ? `<div class="p-sec">${x.sec}</div>` : `<div class="opt ${i === idx ? 'on' : ''}" data-i="${i}"><span class="p-ico">${icon(x.ico || 'zap')}</span><div class="grow"><div>${esc(x.label)}</div>${x.sub ? `<div class="p-sub">${esc(x.sub)}</div>` : ''}</div>${x.kbd ? UI.k(x.kbd) : x.hint ? `<span class="p-hint small">${x.hint}</span>` : ''}</div>`).join('') : UI.empty('لا توجد نتائج', 'جرّب الاسم أو الكود أو رقم المستند', 'search');
    };
    const exec = (i) => { const x = items[i]; if (!x || x.sec) return; m.close(); if (x.go) location.hash = x.go; else x.run && x.run(); };
    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      const sel = () => { list.querySelectorAll('.opt').forEach((o) => o.classList.toggle('on', +o.dataset.i === idx)); const on = list.querySelector('.opt.on'); on && on.scrollIntoView({ block: 'nearest' }); };
      if (e.key === 'ArrowDown') { e.preventDefault(); let j = idx + 1; while (items[j] && items[j].sec) j++; if (items[j]) idx = j; sel(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); let j = idx - 1; while (items[j] && items[j].sec) j--; if (j >= 0 && items[j]) idx = j; sel(); }
      else if (e.key === 'Enter') { e.preventDefault(); exec(idx); }
    });
    list.addEventListener('mousedown', (e) => { const o = e.target.closest('[data-i]'); if (o) { e.preventDefault(); exec(+o.dataset.i); } });
    render();
    setTimeout(() => input.focus(), 20);
  };

  /* ───────── رسوم بيانية SVG ───────── */
  // منحنى ناعم يمر بكل النقاط (Catmull-Rom → Bezier)
  const smoothPath = (pts) => pts.map((p, i) => {
    if (!i) return `M${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    const p0 = pts[i - 2] || pts[i - 1], p1 = pts[i - 1], p2 = p, p3 = pts[i + 1] || p;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    return `C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }).join(' ');
  const gid = () => 'g' + Math.random().toString(36).slice(2, 9);
  // فقاعة القيمة فوق آخر نقطة
  const bubble = (cx, cy, text) => {
    const w = Math.max(38, text.length * 7 + 16);
    return `<g class="v-bubble"><rect x="${(cx - w / 2).toFixed(1)}" y="${(cy - 34).toFixed(1)}" width="${w}" height="22" rx="11"/><text x="${cx.toFixed(1)}" y="${(cy - 19).toFixed(1)}" text-anchor="middle">${esc(text)}</text></g>`;
  };
  const chartW = () => Math.round(Math.min(820, Math.max(320, innerWidth - (innerWidth < 1025 ? 56 : 340))));
  const R = {};
  R.bar = (o) => {
    const W = o.width || chartW(), H = o.height || 240, P = { t: 14, r: 10, b: 28, l: 54 };
    const thin = W < 560 && o.labels.length > 7;
    const all = o.series.flatMap((s) => s.values);
    const max = Math.max(1, ...all) * 1.1, min = Math.min(0, ...all) * 1.1;
    const n = o.labels.length, gw = (W - P.l - P.r) / n, bw = Math.min(26, (gw - 10) / o.series.length);
    const y = (v) => P.t + (H - P.t - P.b) * (1 - (v - min) / (max - min));
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = min + ((max - min) * i) / 4; g += `<line class="grid-line" x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${P.l - 8}" y="${y(v) + 4}" text-anchor="end">${U.short(v)}</text>`; }
    o.labels.forEach((l, i) => {
      const x0 = P.l + gw * i + (gw - bw * o.series.length) / 2;
      const tip = esc(JSON.stringify({ l, rows: o.series.map((s) => [s.name, s.color, U.money(s.values[i])]) }));
      g += `<g class="bar-g hover-col" data-tip="${tip}"><rect x="${P.l + gw * i}" y="${P.t}" width="${gw}" height="${H - P.t - P.b}" fill="transparent"/>`;
      o.series.forEach((s, j) => {
        const v = s.values[i];
        const top = y(Math.max(0, v)), bot = y(Math.min(0, v));
        const bx = x0 + j * bw, w = bw - 4, r = Math.min(w / 2, 7);
        g += `<rect class="bar-bg" x="${bx}" y="${P.t}" width="${w}" height="${y(min) - P.t}" rx="${r}"/>`;
        g += `<rect class="bar" style="animation-delay:${(i * 0.04 + j * 0.03).toFixed(3)}s" x="${bx}" y="${top}" width="${w}" height="${Math.max(2, bot - top)}" rx="${r}" fill="${s.color}"/>`;
      });
      g += '</g>';
      if (!thin || (o.labels.length - 1 - i) % 2 === 0) g += `<text x="${P.l + gw * i + gw / 2}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`;
    });
    if (o.line) {
      const pts = o.line.values.map((v, i) => [P.l + gw * i + gw / 2, y(v)]);
      g += `<path class="draw" pathLength="1" d="${smoothPath(pts)}" fill="none" stroke="${o.line.color}" stroke-width="2.5" stroke-linecap="round"/>` + pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--surface)" stroke="${o.line.color}" stroke-width="2"><title>${esc(o.line.name)}: ${U.money(o.line.values[i])}</title></circle>`).join('');
    }
    return `<svg class="chart bar-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px" direction="ltr">${g}</svg>`;
  };
  // رسم خطي متوهج متعدد السلاسل: منحنيات ناعمة + تدرج + توهج + فقاعة آخر قيمة + قراءة عند المرور
  R.line = (o) => {
    const W = o.width || chartW(), H = o.height || 260, P = { t: 40, r: 26, b: 30, l: 56 };
    const all = o.series.flatMap((s) => s.values);
    let max = Math.max(1, ...all), min = Math.min(0, ...all);
    const step = Math.pow(10, Math.floor(Math.log10((max - min) / 4 || 1)));
    max = Math.ceil(max / step) * step; min = Math.floor(min / step) * step;
    const n = o.labels.length;
    const x = (i) => P.l + ((W - P.l - P.r) * i) / Math.max(1, n - 1);
    const y = (v) => P.t + (H - P.t - P.b) * (1 - (v - min) / (max - min || 1));
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = min + ((max - min) * i) / 4; g += `<line class="grid-line" x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${P.l - 10}" y="${y(v) + 4}" text-anchor="end">${U.short(v)}</text>`; }
    if (min < 0) g += `<line class="base-line" x1="${P.l}" x2="${W - P.r}" y1="${y(0)}" y2="${y(0)}"/>`;
    const thin = W < 560 && n > 7;
    o.labels.forEach((l, i) => { if (!thin || (n - 1 - i) % 2 === 0) g += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`; });
    // عمود مضيء خلف آخر قيمة
    const cw = (W - P.l - P.r) / Math.max(1, n - 1);
    const main = o.series[0];
    if (main) {
      const bid = gid();
      g += `<defs><linearGradient id="${bid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${main.color}" stop-opacity=".05"/><stop offset="1" stop-color="${main.color}" stop-opacity="0"/></linearGradient></defs><rect class="a-fill" x="${x(n - 1) - cw / 2}" y="${P.t - 8}" width="${cw / 2 + P.r}" height="${H - P.t - P.b + 8}" fill="url(#${bid})"/>`;
    }
    o.series.forEach((s) => {
      const pts = s.values.map((v, i) => [x(i), y(v)]);
      const d = smoothPath(pts);
      if (s.fill) {
        const id = gid();
        g += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".13"/><stop offset=".7" stop-color="${s.color}" stop-opacity=".02"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient></defs><path class="a-fill" d="${d} L${x(n - 1)},${y(Math.max(min, 0))} L${x(0)},${y(Math.max(min, 0))} Z" fill="url(#${id})"/>`;
      }
      if (s.dashed) g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="5 6" class="a-fill"/>`;
      else g += `<path class="draw" pathLength="1" d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.fill ? 3 : 2.4}" stroke-linecap="round"/>`;
    });
    if (main && n) {
      const lx = x(n - 1), ly = y(main.values[n - 1]);
      g += `<circle class="s-dot" cx="${lx}" cy="${ly}" r="5" fill="var(--surface)" stroke="${main.color}" stroke-width="3"/>` + bubble(lx - 10, ly, U.short(main.values[n - 1]));
    }
    // أعمدة شفافة للقراءة عند المرور
    o.labels.forEach((l, i) => {
      g += `<g class="hover-col" data-tip="${esc(JSON.stringify({ l, rows: o.series.map((s) => [s.name, s.color, U.money(s.values[i])]) }))}"><rect x="${x(i) - cw / 2}" y="${P.t}" width="${cw}" height="${H - P.t - P.b}" fill="transparent"></rect><line x1="${x(i)}" x2="${x(i)}" y1="${P.t}" y2="${H - P.b}" class="hover-line"/>${o.series.map((s) => `<circle cx="${x(i)}" cy="${y(s.values[i])}" r="5" fill="${s.color}" class="hover-dot"/>`).join('')}</g>`;
    });
    return `<svg class="chart line-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px" direction="ltr">${g}</svg>`;
  };
  // تلميح عائم للرسوم البيانية
  let chartTip = null;
  document.addEventListener('mouseover', (e) => {
    const col = e.target.closest && e.target.closest('.hover-col');
    if (!col) { if (chartTip) chartTip.classList.remove('on'); return; }
    if (!chartTip) { chartTip = document.createElement('div'); chartTip.className = 'chart-tip'; document.body.appendChild(chartTip); }
    const d = JSON.parse(col.dataset.tip);
    chartTip.innerHTML = `<div class="ct-h">${esc(d.l)}</div>` + d.rows.map(([n, c, v]) => `<div class="ct-r"><i style="background:${c}"></i><span>${esc(n)}</span><b>${v}</b></div>`).join('');
    if (window.I18N && I18N.en) I18N.translate(chartTip);
    const r = col.getBoundingClientRect();
    const left = r.left + r.width / 2;
    chartTip.style.left = Math.min(innerWidth - 120, Math.max(120, left)) + 'px';
    chartTip.style.top = r.top + 'px';
    chartTip.classList.add('on');
  });
  // خط اتجاه صغير متوهج داخل البطاقات (نقطة النهاية مرسومة بخط دائري حتى لا تتمدد مع العرض)
  UI.spark = (vals, color, h = 34) => {
    if (!vals || vals.length < 2) return '';
    const max = Math.max(...vals), min = Math.min(0, ...vals), rng = max - min || 1;
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * 100, 29 - ((v - min) / rng) * 24]);
    const line = smoothPath(pts);
    const last = pts[pts.length - 1], id = gid();
    const dot = (w, c, op = 1) => `<path opacity="${op}" d="M${last[0]},${last[1]} l0,0" stroke="${c}" stroke-width="${w}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
    return `<svg class="spark" viewBox="0 0 100 32" preserveAspectRatio="none" style="height:${h}px"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".12"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><line class="s-base" x1="0" x2="100" y1="${pts[0][1]}" y2="${pts[0][1]}" vector-effect="non-scaling-stroke"/><path class="s-area" d="${line} L100,32 L0,32 Z" fill="url(#${id})"/><path class="s-line draw" d="${line}" stroke="${color}" pathLength="1" vector-effect="non-scaling-stroke"/><g class="s-dot">${dot(9, color)}${dot(4, 'var(--surface)')}</g></svg>`;
  };
  // شريط مقسم (توزيع نسب) مع وسيلة إيضاح اختيارية
  UI.stack = (parts, legend) => {
    const tot = U.sum(parts, (p) => Math.max(0, p.v)) || 1;
    return `<div class="stack">${parts.filter((p) => p.v > 0).map((p, i) => `<i style="width:${((p.v / tot) * 100).toFixed(2)}%;background:${p.c};animation-delay:${i * 0.06}s" title="${esc(p.l)}: ${U.money(p.v)}"></i>`).join('')}</div>${legend ? `<div class="stack-legend">${parts.filter((p) => p.v > 0).map((p) => `<span><i style="background:${p.c}"></i>${esc(p.l)}</span>`).join('')}</div>` : ''}`;
  };
  UI.ibar = (frac, color) => `<span class="ibar"><i style="width:${Math.max(0, Math.min(100, frac * 100)).toFixed(1)}%;${color ? `background:${color}` : ''}"></i></span>`;
  // منحنى مساحة متوهج لرصيد عبر الزمن
  R.area = (o) => {
    const vals = o.values;
    if (!vals.length) return '';
    const W = o.width || chartW(), H = o.height || 170, P = { t: 36, r: 22, b: 24, l: 56 };
    const max = Math.max(...vals), min = Math.min(0, ...vals);
    const rng = (max - min) * 1.1 || 1;
    const x = (i) => P.l + ((W - P.l - P.r) * i) / Math.max(1, vals.length - 1);
    const y = (v) => P.t + (H - P.t - P.b) * (1 - (v - min) / rng);
    let g = '';
    for (let i = 0; i <= 3; i++) { const v = min + (rng * i) / 3; g += `<line class="grid-line" x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${P.l - 8}" y="${y(v) + 4}" text-anchor="end">${U.short(v)}</text>`; }
    // الأرصدة تتغير على درجات، فالمنحنى الناعم يكفي لعدد قليل من النقاط فقط
    const pts = vals.map((v, i) => [x(i), y(v)]);
    const line = vals.length <= 40 ? smoothPath(pts) : pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const id = gid();
    g += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.color}" stop-opacity=".14"/><stop offset="1" stop-color="${o.color}" stop-opacity="0"/></linearGradient></defs>`;
    g += `<path class="a-fill" d="${line} L${x(vals.length - 1)},${y(min)} L${x(0)},${y(min)} Z" fill="url(#${id})"/><path class="draw" pathLength="1" d="${line}" fill="none" stroke="${o.color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
    const step = Math.max(1, Math.ceil(vals.length / (W < 560 ? 3 : 6)));
    (o.labels || []).forEach((l, i) => { if (i % step === 0 || i === vals.length - 1) g += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`; });
    const lx = x(vals.length - 1), ly = y(vals[vals.length - 1]);
    g += `<circle class="s-dot" cx="${lx}" cy="${ly}" r="4.5" fill="var(--surface)" stroke="${o.color}" stroke-width="2.8"/>` + bubble(lx - 8, ly, U.short(vals[vals.length - 1]));
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px" direction="ltr">${g}</svg>`;
  };
  // الرسم يتم بعرض الحاوية الفعلي (نص ونقاط بلا تمدد) ويُعاد عند تغيير المقاس
  const pendingCharts = new Map();
  let chartSeq = 0;
  const chartHost = (kind, def) => (o) => {
    if (kind === 'area' && !o.values.length) return '';
    const id = String(++chartSeq);
    pendingCharts.set(id, { kind, o });
    return `<div class="chart-host" data-ch="${id}" style="height:${o.height || def}px"></div>`;
  };
  UI.barChart = chartHost('bar', 240);
  UI.lineChart = chartHost('line', 260);
  UI.areaChart = chartHost('area', 170);
  const paintChart = (el) => {
    if (!el._spec) { el._spec = pendingCharts.get(el.dataset.ch); pendingCharts.delete(el.dataset.ch); }
    const w = Math.round(el.clientWidth);
    if (!el._spec || !w || el._w === w) return;
    el._w = w;
    el.innerHTML = R[el._spec.kind](Object.assign({}, el._spec.o, { width: w }));
  };
  const chartRO = new ResizeObserver((entries) => entries.forEach((e) => paintChart(e.target)));
  new MutationObserver(() => document.querySelectorAll('.chart-host:not([data-on])').forEach((el) => { el.dataset.on = 1; paintChart(el); chartRO.observe(el); }))
    .observe(document.documentElement, { childList: true, subtree: true });
  // آخر 12 شهرًا من حركة طرف: المدين والدائن لكل شهر
  UI.ledgerMonths = (st, sid) => {
    const end = U.today();
    const months = [];
    let [y, m] = end.split('-').map(Number);
    for (let i = 0; i < 12; i++) { months.unshift(y + '-' + String(m).padStart(2, '0')); m--; if (!m) { m = 12; y--; } }
    const dr = new Map(months.map((x) => [x, 0])), cr = new Map(months.map((x) => [x, 0]));
    for (const e of E.ledgerOf(st, sid)) {
      const k = U.ym(e.date); if (!dr.has(k)) continue;
      const d = DB.get('docs', e.docId); if (d && d.status === 'void') continue;
      if (e.amount > 0) dr.set(k, dr.get(k) + e.amount); else cr.set(k, cr.get(k) - e.amount);
    }
    return { labels: months.map((x) => U.MONTHS[+x.slice(5) - 1].slice(0, 3)), dr: [...dr.values()], cr: [...cr.values()] };
  };
  UI.chartColor = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  // عدّاد متحرك للأرقام الكبيرة
  UI.countUp = (root) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced') return;
    root.querySelectorAll('[data-count]').forEach((el) => {
      const to = +el.dataset.count, dec = el.dataset.int ? 0 : 2, t0 = performance.now(), dur = 750;
      const fmt = (v) => (dec ? U.money(v) : U.int(v));
      const tick = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.firstChild.nodeValue = fmt(to * e); if (k < 1) requestAnimationFrame(tick); };
      el.firstChild.nodeValue = fmt(0);
      requestAnimationFrame(tick);
    });
  };

  UI.donut = (parts, size = 150) => {
    const total = U.sum(parts, (p) => p.v) || 1;
    let a = -Math.PI / 2, s = '';
    const R = size / 2, r = R * 0.7;
    for (const p of parts) {
      const a2 = a + (p.v / total) * Math.PI * 2;
      const large = a2 - a > Math.PI ? 1 : 0;
      const pt = (ang, rad) => `${R + rad * Math.cos(ang)},${R + rad * Math.sin(ang)}`;
      if (p.v > 0) s += `<path class="seg" style="animation-delay:${(a + Math.PI / 2) * 0.08}s" d="M${pt(a, R)} A${R},${R} 0 ${large} 1 ${pt(a2, R)} L${pt(a2, r)} A${r},${r} 0 ${large} 0 ${pt(a, r)} Z" fill="${p.c}"><title>${esc(p.l)}: ${U.money(p.v)}</title></path>`;
      a = a2;
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${s}</svg>`;
  };

  /* ───────── تفويض الأحداث ───────── */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled) return;
    const fn = UI.acts[a.dataset.act];
    if (fn) { e.preventDefault(); fn(a, e); }
  });
  document.addEventListener('change', (e) => {
    const a = e.target.closest('[data-change]');
    if (a && UI.acts[a.dataset.change]) UI.acts[a.dataset.change](a, e);
  });

  window.UI = UI;
})();
