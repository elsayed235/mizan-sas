/* أدوات عامة: تنسيق الأرقام والتواريخ، تقريب، تجميع */
(function () {
  const nfMoney = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nfQty = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });
  const nfInt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  const roundTo = (n, d) => {
    n = +n || 0;
    const f = Math.pow(10, d);
    return (Math.sign(n) * Math.round(Math.abs(n) * f + 1e-7)) / f;
  };

  const U = {
    MONTHS,
    r2: (n) => roundTo(n, 2),
    r3: (n) => roundTo(n, 3),
    r4: (n) => roundTo(n, 4),
    money: (n) => nfMoney.format(roundTo(n, 2)),
    qty: (n) => nfQty.format(roundTo(n, 3)),
    int: (n) => nfInt.format(n || 0),
    // مبلغ مختصر للوحة المعلومات: 1.2M / 350K
    short(n) {
      const a = Math.abs(n);
      if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.0+$/, '') + 'M';
      if (a >= 1e4) return (n / 1e3).toFixed(0) + 'K';
      return nfInt.format(Math.round(n));
    },
    num(v) {
      if (typeof v === 'number') return isFinite(v) ? v : 0;
      if (v == null || v === '') return 0;
      // يقبل الأرقام العربية والفواصل
      const s = String(v).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫]/g, '.').replace(/[,،\s]/g, '');
      const n = parseFloat(s);
      return isFinite(n) ? n : 0;
    },
    pad: (n, w = 4) => String(n).padStart(w, '0'),
    today() {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    now: () => new Date().toISOString(),
    date(s) {
      if (!s) return '—';
      const [y, m, d] = s.slice(0, 10).split('-');
      return `${d}/${m}/${y}`;
    },
    dateTime(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return U.date(iso.slice(0, 10)) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    },
    year: (s) => +String(s).slice(0, 4),
    month: (s) => +String(s).slice(5, 7),
    ym: (s) => String(s).slice(0, 7),
    monthLabel(ym) {
      const [y, m] = ym.split('-');
      return MONTHS[+m - 1] + ' ' + y;
    },
    addDays(s, n) {
      const d = new Date(s + 'T12:00:00');
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    },
    daysBetween(a, b) {
      return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
    },
    startOfMonth: (s) => s.slice(0, 7) + '-01',
    endOfMonth(s) {
      const [y, m] = s.split('-').map(Number);
      const d = new Date(y, m, 0);
      return `${y}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    },
    sum(arr, f) {
      let t = 0;
      for (const x of arr) t += f ? +f(x) || 0 : +x || 0;
      return roundTo(t, 4);
    },
    groupBy(arr, f) {
      const m = new Map();
      for (const x of arr) {
        const k = f(x);
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(x);
      }
      return m;
    },
    clone: (o) => JSON.parse(JSON.stringify(o)),
    debounce(fn, ms = 200) {
      let t;
      return (...a) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...a), ms);
      };
    },
    // مطابقة بحث عربية مرنة: تجاهل الهمزات والتاء المربوطة والتشكيل
    norm(s) {
      return String(s || '')
        .toLowerCase()
        .replace(/[ً-ْـ]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .trim();
    },
    match(hay, q) {
      if (!q) return true;
      const h = U.norm(hay);
      return U.norm(q).split(/\s+/).every((t) => h.includes(t));
    },
    csv(rows) {
      return '﻿' + rows.map((r) => r.map((c) => {
        const s = String(c == null ? '' : c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',')).join('\n');
    },
    download(name, content, type = 'text/csv;charset=utf-8') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([content], { type }));
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },
    isMac: /Mac|iPhone|iPad/.test(navigator.platform),
  };

  // مولد أرقام عشوائية ثابت للبيانات التجريبية
  U.rng = function (seed) {
    let a = seed >>> 0;
    const f = () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    return f;
  };

  window.U = U;
})();
