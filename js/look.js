/* المظهر: تفضيلات شخصية لكل جهاز (الوضع، اللون، حجم الخط، الخط، الحواف، الحركة)
   تُحفظ في المتصفح وليست جزءًا من بيانات المصنع — كل مستخدم يرى الواجهة كما يحب */
(function () {
  const KEY = 'knit-look';
  // لكل لون: قيم الوضع الفاتح ثم الداكن [أساسي، عند المرور، خلفية خفيفة، لون النص فوقه]
  const ACCENTS = {
    emerald: { label: 'أخضر زمردي', light: ['#168a4c', '#10783f', '#e5f4eb', '#ffffff'], dark: ['#3ad883', '#5ee39b', '#11291b', '#04120a'] },
    blue: { label: 'أزرق ملكي', light: ['#2563eb', '#1d4fd8', '#e8effe', '#ffffff'], dark: ['#6ea0ff', '#8fb5ff', '#14213b', '#050c1f'] },
    violet: { label: 'بنفسجي', light: ['#7c4ddc', '#6a3bc9', '#f0eafd', '#ffffff'], dark: ['#b39dff', '#c7b6ff', '#221a3d', '#120a26'] },
    teal: { label: 'فيروزي', light: ['#0d8f8a', '#0a7a76', '#e2f4f3', '#ffffff'], dark: ['#3dd6cc', '#66e0d8', '#0f2b2a', '#021514'] },
    orange: { label: 'برتقالي', light: ['#e0701f', '#c95f12', '#fdeee2', '#ffffff'], dark: ['#ffa264', '#ffb684', '#33200f', '#1f0f03'] },
    rose: { label: 'وردي', light: ['#d6336c', '#bf2a5d', '#fce8ef', '#ffffff'], dark: ['#ff7aa5', '#ff97ba', '#3a1424', '#24060f'] },
    gold: { label: 'ذهبي', light: ['#b8862b', '#a17322', '#f8f0de', '#ffffff'], dark: ['#f2c45a', '#f6d27e', '#2e2512', '#1a1203'] },
    graphite: { label: 'جرافيت', light: ['#2d3330', '#1d221f', '#eceeec', '#ffffff'], dark: ['#e4e4e7', '#ffffff', '#26262b', '#0c0c0e'] },
  };
  const FONTS = {
    plex: { label: 'IBM Plex', family: 'IBM Plex Sans Arabic', css: 'IBM+Plex+Sans+Arabic:wght@400;500;600;700' },
    cairo: { label: 'Cairo', family: 'Cairo', css: 'Cairo:wght@400..800' },
    tajawal: { label: 'Tajawal', family: 'Tajawal', css: 'Tajawal:wght@400;500;700;800' },
    almarai: { label: 'Almarai', family: 'Almarai', css: 'Almarai:wght@400;700;800' },
  };
  const DEFAULTS = { mode: 'system', accent: 'emerald', scale: 100, font: 'plex', radius: 'round', motion: 'full' };
  const RADII = { sharp: 10, soft: 16, round: 20, pill: 26 };

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const Look = {
    ACCENTS, FONTS, DEFAULTS, RADII,
    get() {
      const v = Object.assign({}, DEFAULTS, read());
      // الوضع القديم كان يُحفظ منفصلًا — نحترمه إن وُجد
      if (!read().mode) { try { const t = localStorage.getItem('knit-theme'); if (t === 'light' || t === 'dark') v.mode = t; } catch (e) { /* التخزين غير متاح */ } }
      return v;
    },
    set(patch) {
      const v = Object.assign(Look.get(), patch);
      try { localStorage.setItem(KEY, JSON.stringify(v)); if (patch.mode) localStorage.setItem('knit-theme', patch.mode); } catch (e) { /* التخزين غير متاح */ }
      Look.apply();
      return v;
    },
    reset() { try { localStorage.removeItem(KEY); localStorage.removeItem('knit-theme'); } catch (e) { /* التخزين غير متاح */ } Look.apply(); },
    theme() { const m = Look.get().mode; return m === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : m; },
    apply() {
      const v = Look.get(), d = document.documentElement, t = Look.theme();
      d.dataset.theme = t;
      d.dataset.radius = v.radius;
      d.dataset.motion = v.motion;
      const a = (ACCENTS[v.accent] || ACCENTS.emerald)[t];
      const st = d.style;
      st.setProperty('--primary', a[0]); st.setProperty('--primary-hover', a[1]); st.setProperty('--primary-soft', a[2]); st.setProperty('--primary-ink', a[3]);
      st.setProperty('--chart-1', a[0]);
      st.setProperty('--radius', (RADII[v.radius] || 20) + 'px');
      st.setProperty('--zoom', String((+v.scale || 100) / 100));
      const f = FONTS[v.font] || FONTS.plex;
      st.setProperty('--font', `'Plus Jakarta Sans', '${f.family}', 'Segoe UI', Tahoma, system-ui, sans-serif`);
      if (v.font !== 'plex' && !document.getElementById('font-' + v.font)) {
        const l = document.createElement('link');
        l.id = 'font-' + v.font; l.rel = 'stylesheet';
        l.href = `https://fonts.googleapis.com/css2?family=${f.css}&display=swap`;
        document.head.appendChild(l);
      }
    },
  };
  // الوضع "تلقائي" يتبع الجهاز لحظيًا
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (Look.get().mode === 'system') { Look.apply(); if (window.App && App.onThemeChange) App.onThemeChange(); } });
  window.Look = Look;
})();
