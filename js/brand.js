/* هوية المنتج: ميزان — اسم واحد وشعار واحد لكل الشاشات (الصفحة التعريفية، الدخول، الرسوم، الإيصالات).
   شعار المصنع نفسه (شعار العميل) منفصل ويُحفظ في إعدادات المصنع. */
(function () {
  // الشعار: ميزان أبيض متزن فوق أخضر الهوية (الزمردي) — دقة الأرقام وثقة الحسابات
  const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs>
    <linearGradient id="mzb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22a35e"/><stop offset="1" stop-color="#0d6a37"/></linearGradient>
    <linearGradient id="mzg" gradientUnits="userSpaceOnUse" x1="0" y1="18" x2="0" y2="74"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d6f2e2"/></linearGradient></defs>
    <rect width="96" height="96" rx="24" fill="url(#mzb)"/><rect x="1" y="1" width="94" height="94" rx="23" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="2"/>
    <g stroke="url(#mzg)" stroke-linecap="round" fill="none"><path d="M48 30V70" stroke-width="6"/><path d="M34 72H62" stroke-width="6.5"/><path d="M21 35H75" stroke-width="6"/>
      <path d="M24 37L16 56M24 37L32 56M72 37L64 56M72 37L80 56" stroke-width="2.6"/></g>
    <g fill="url(#mzg)"><circle cx="48" cy="24" r="6"/><path d="M13 56H35Q34 66 24 66Q14 66 13 56Z"/><path d="M61 56H83Q82 66 72 66Q62 66 61 56Z"/></g></svg>`;
  window.Brand = { name: 'ميزان', nameEn: 'Mizan', full: 'ميزان ERP', MARK, LOGO: 'data:image/svg+xml;utf8,' + encodeURIComponent(MARK) };
})();
