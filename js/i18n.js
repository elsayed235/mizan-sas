/* تبديل اللغة عربي / English
   الواجهة مكتوبة بالعربية في القوالب، وهذه الطبقة تترجم نصوص الواجهة لحظيًا عند العرض
   (بيانات المستخدم مثل أسماء العملاء والأصناف تبقى كما أُدخلت). في نسخة Angular تتحول لملفات ترجمة عادية. */
(function () {
  const KEY = 'knit-lang';
  const AR = /[؀-ۿ]/;
  const AR_WORD = /[؀-ۿ][؀-ۿً-ْـ]*/g;
  const I18N = {
    lang: (() => { try { return localStorage.getItem(KEY) || 'ar'; } catch (e) { return 'ar'; } })(),
    get en() { return I18N.lang === 'en'; },
    set(lang) { try { localStorage.setItem(KEY, lang); } catch (e) { /* التخزين غير متاح */ } location.reload(); },
    toggle() { I18N.set(I18N.en ? 'ar' : 'en'); },
  };

  // إضافات لا تظهر في القوالب نفسها (نصوص من البيانات المولدة أو المتصفح)
  const EXTRA = {
    'ج.م': 'EGP',
    'يناير': 'January', 'فبراير': 'February', 'مارس': 'March', 'أبريل': 'April', 'مايو': 'May', 'يونيو': 'June',
    'يوليو': 'July', 'أغسطس': 'August', 'سبتمبر': 'September', 'أكتوبر': 'October', 'نوفمبر': 'November', 'ديسمبر': 'December',
    'مصنع النور للتريكو': 'Al Nour Knitwear Factory',
    'نظام إدارة المصنع المتكامل': 'Integrated Factory Management',
    'المدير العام': 'General Manager',
    'هذا التطبيق يحتاج تفعيل JavaScript': 'This app requires JavaScript',
    'إعادة احتساب الأجور للفترة': 'Recalculate Wages for Period',
    'فاتورة': 'Invoice',
    'عن نفس الفترة': 'vs same period',
    'نقدية دخلت الخزائن فعلًا': 'Cash actually received',
    'سندات المصروفات': 'Expense vouchers',
    'هامش': 'Margin',
    'من المبيعات': 'of sales',
    'خلال الفترة': 'This period',
    'مستحق للموردين': 'Payable to Suppliers',
    'ساعات التشغيل': 'Operating Hours',
    'قطعة مستلمة': 'pcs received',
    'سلف زائدة': 'Excess advances',
    'لا سلف زائدة': 'No excess advances',
    'المبيعات والمصروفات': 'Sales & Expenses',
    'آخر 12 شهرًا': 'Last 12 months',
    'المصروفات والأجور': 'Expenses & Wages',
    'صافي الربح': 'Net Profit',
    'توزيع التكاليف': 'Cost Breakdown',
    'السجل الكامل': 'Full Log',
    'أفضل العملاء': 'Top Customers',
    'مبيعات الفترة': 'Period sales',
    'لا مبيعات في الفترة': 'No sales in this period',
    'الخزائن': 'Cash Boxes',
    'أمر مفتوح': 'open orders',
    'إنجاز': 'progress',
    'فاتورة · بعد المرتجعات': 'invoices · after returns',
    'المشتريات': 'Purchases',
    'المدفوعات': 'Payments',
    'مستحق على العملاء': 'Receivable from Customers',
    'مستحقات الورش': 'Workshop Dues',
    'قيمة المخزون': 'Stock Value',
    'صافي المبيعات': 'Net Sales',
    'التحصيلات الفعلية': 'Actual Collections',
    'المصروفات': 'Expenses',
    'صافي الربح التشغيلي': 'Net Operating Profit',
    'الإجمالي': 'Total',
    'ما علينا دفعه': 'What we owe',
    'بيانات مباشرة': 'Live Data', 'صورة خلفية لوحة التحكم': 'Dashboard Background Image', 'تظهر أعلى لوحة التحكم خلف التحية — ارفع صورة مصنعك أو منتجاتك': 'Shown at the top of the dashboard behind the greeting — upload a photo of your factory or products',
    'إظهار الصورة': 'Show image', 'رفع صورة جديدة': 'Upload New Image', 'استعادة الصورة الافتراضية': 'Restore Default Image',
    'يفضل صورة عرضية (1600×900 أو أكبر) — تُضغط تلقائيًا، والجزء المهم يكون في الناحية البعيدة عن النص': 'A wide image works best (1600×900 or larger) — it is compressed automatically; keep the key subject away from the text side',
    'اختر ملف صورة': 'Choose an image file', 'الصورة كبيرة جدًا بعد الضغط — جرّب صورة أبسط': 'Image is still too large after compression — try a simpler one',
    'تم تحديث صورة الخلفية': 'Background image updated', 'تمت استعادة الصورة الافتراضية': 'Default image restored', 'تغيير صورة الخلفية': 'Background image changed', 'استعادة صورة الخلفية الافتراضية': 'Default background restored',
    'التبديل إلى العربية': 'Switch to Arabic', 'English / العربية — تبديل اللغة': 'العربية / English — Switch language',
    'الإيراد بدون ضريبة. تكلفة المباع بالمتوسط المرجح وتشمل تكلفة الخامات والمصنعية المرسملة في المنتج. السلف والتحويلات والمشتريات المخزنية ليست مصروفًا — الاستهلاك الداخلي هو الذي يُحمّل على المصروفات. هذا تقرير تشغيلي وليس قوائم مالية بالقيد المزدوج.': 'Revenue excludes tax. Cost of sales uses the weighted average and includes materials and workshop fees capitalized into the product. Advances, transfers and stock purchases are not expenses — internal consumption is what gets charged to expenses. This is an operational report, not double-entry financial statements.',
    'يشمل: سندات المصروفات (نقدي/آجل) + بنود المصروف المباشر داخل فواتير الشراء + الاستهلاك الداخلي من المخزون (قطع غيار، إبر، شمع). لا يشمل شراء الخيوط والمستلزمات للمخزن.': 'Includes: expense vouchers (cash/credit) + direct expense lines inside purchase invoices + internal consumption from stock (spare parts, needles, wax). Excludes yarn and supplies bought for stock.',
    'التحويلات بين الخزائن تظهر واردًا في حساب وصادرًا في آخر — صافيها صفر وليست إيرادًا أو مصروفًا. الأرقام تشمل الحركات العكسية للمستندات الملغاة (صافيها صفر).': 'Transfers between cash boxes show as inflow in one account and outflow in another — they net to zero and are neither income nor expense. Figures include reversing entries of voided documents (net zero).',
    'إزالة': 'Remove', 'يُصغّر تلقائيًا · PNG بخلفية شفافة أفضل': 'Auto-resized · PNG with transparent background works best',
    'اسم المصنع': 'Factory Name', 'الاسم بالإنجليزية': 'English Name', 'الموبايل': 'Mobile', 'البريد الإلكتروني': 'Email', 'السجل التجاري': 'Commercial Register', 'العملة (الرمز)': 'Currency (Symbol)',
    'تغيير اللوجو': 'Logo changed', 'تم تحديث اللوجو': 'Logo updated', 'اسم المصنع مطلوب': 'Factory name is required', 'تعديل بيانات المصنع': 'Factory details updated',
    'الأرصدة تنتقل تلقائيًا بين السنوات لأنها محسوبة من كل الحركات منذ البداية — بدء سنة جديدة لا يصفّر أرصدة العملاء أو الموردين. إقفال السنة يمنع إنشاء أو إلغاء أي عملية بتاريخ داخلها.': 'Balances carry over between years automatically because they are computed from all movements since the start — a new year does not reset customer or supplier balances. Closing a year blocks creating or voiding any transaction dated inside it.',
    'نظرة عامة': 'Overview', 'التجارة': 'Trade', 'الإنتاج والمخزون': 'Production & Stock', 'بحث…': 'Search…',
    'اشتغل أسرع بالكيبورد': 'Work faster with the keyboard', 'كل شاشة وكل عملية لها اختصار — ابدأ بالبحث الشامل': 'Every screen and action has a shortcut — start with global search',
    'المظهر': 'Appearance', 'معاينة مباشرة': 'Live preview', 'شكّل الواجهة على ذوقك': 'Make the interface yours',
    'كل تغيير يظهر فورًا في البرنامج كله. هذه التفضيلات خاصة بهذا الجهاز ولا تغيّر شيئًا عند باقي المستخدمين.': 'Every change applies instantly across the app. These preferences belong to this device and do not affect other users.',
    'وضع العرض': 'Display mode', 'فاتح للنهار، داكن مريح للعين ليلًا، أو تلقائي يتبع إعداد الجهاز': 'Light for daytime, dark for easy night viewing, or auto to follow the device',
    'فاتح': 'Light', 'خلفية فاتحة وبطاقات بيضاء': 'Light background, white cards', 'داكن': 'Dark', 'مريح في الإضاءة المنخفضة': 'Comfortable in low light', 'تلقائي': 'Auto', 'يتبع إعداد الجهاز': 'Follows device setting',
    'اللون الأساسي': 'Accent color', 'لون الأزرار والعناصر النشطة والرسم البياني الرئيسي': 'Color of buttons, active items and the main chart',
    'أخضر زمردي': 'Emerald', 'أزرق ملكي': 'Royal Blue', 'بنفسجي': 'Violet', 'فيروزي': 'Teal', 'برتقالي': 'Orange', 'وردي': 'Rose', 'ذهبي': 'Gold', 'جرافيت': 'Graphite',
    'حجم الخط والعناصر': 'Text & element size', 'كبّر الواجهة للقراءة من مسافة أو صغّرها لعرض بيانات أكثر': 'Enlarge for reading from a distance, or shrink to fit more data',
    'صغير': 'Small', 'افتراضي': 'Default', 'كبير': 'Large', 'أكبر': 'Larger',
    'خط الواجهة': 'Interface font', 'الخط العربي المستخدم في كل الشاشات (الأرقام تبقى بنفس الخط الواضح)': 'The Arabic typeface used on every screen (numbers keep the same clear font)',
    'افتراضي · رسمي': 'Default · formal', 'عصري وعريض': 'Modern & bold', 'خفيف وأنيق': 'Light & elegant', 'هادئ ومقروء': 'Calm & readable',
    'شكل الحواف': 'Corner style', 'استدارة زوايا البطاقات والأزرار والحقول': 'Roundness of cards, buttons and fields', 'حاد': 'Sharp', 'ناعم': 'Soft', 'مستدير': 'Rounded', 'كبسولة': 'Pill',
    'كثافة الجداول': 'Table density', 'مريح': 'Comfortable', 'مضغوط': 'Compact', 'مسافات أوسع بين الصفوف': 'More space between rows', 'صفوف أكثر في نفس الشاشة': 'More rows on one screen',
    'الحركة والانتقالات': 'Motion & transitions', 'حركات الدخول والرسوم المتحركة عند فتح الصفحات': 'Entrance effects and animated charts when pages open',
    'كاملة': 'Full', 'انتقالات ناعمة ورسوم تتحرك': 'Smooth transitions and animated charts', 'مخففة': 'Reduced', 'ظهور فوري بلا حركة': 'Instant, no motion',
    'صورة لوحة التحكم': 'Dashboard image', 'الصورة أعلى لوحة التحكم خلف التحية — هذا الإعداد للمصنع كله': 'The image behind the greeting on the dashboard — this setting applies to the whole factory',
    'مع صورة': 'With image', 'صورة مصنعك خلف التحية': 'Your factory photo behind the greeting', 'بدون صورة': 'No image', 'تصميم هادئ بلون الواجهة': 'A calm design in your accent color',
    'تُحفظ تفضيلاتك تلقائيًا على هذا الجهاز': 'Your preferences are saved automatically on this device', 'استعادة الإعدادات الافتراضية': 'Restore Defaults',
    'تمت استعادة المظهر الافتراضي': 'Default appearance restored', 'ستظهر الصورة في لوحة التحكم': 'The image will show on the dashboard', 'تم إخفاء الصورة من لوحة التحكم': 'The image is hidden from the dashboard',
    'إظهار صورة لوحة التحكم': 'Dashboard image shown', 'إخفاء صورة لوحة التحكم': 'Dashboard image hidden', 'تخصيص المظهر': 'Customize appearance',
    'المظهر والألوان': 'Appearance & Colors', 'المظهر والألوان وحجم الخط': 'Appearance, colors & font size',
    'عرض الاختصارات': 'View Shortcuts',
    // الصفحة التعريفية
    'ميزان ERP': 'Mizan ERP', 'نظام إدارة مصانع التريكو': 'Knitwear factory management system', 'المميزات': 'Features', 'كيف يعمل': 'How it works', 'الأسعار': 'Pricing',
    'ابدأ مجانًا': 'Start free', 'نظام ERP مصمم خصيصًا لمصانع التريكو': 'An ERP built specifically for knitwear factories', 'أدِر مصنعك كله': 'Run your whole factory', 'من شاشة واحدة': 'from one screen',
    'من صرف الخيط للورشة حتى تحصيل الفاتورة — مبيعات ومخازن وورش وعمالة وخزائن، بأرقام دقيقة محسوبة من كل حركة.': 'From issuing yarn to the workshop to collecting the invoice — sales, warehouses, workshops, labor and cash, with exact figures computed from every movement.',
    'ابدأ تجربتك المجانية': 'Start your free trial', 'لدي حساب بالفعل': 'I already have an account', '14 يومًا مجانًا': '14 days free', 'بدون بطاقة دفع': 'No card required', 'عربي وإنجليزي': 'Arabic & English',
    'كل أقسام المصنع مترابطة': 'Every part of the factory, connected', 'كل مستند يؤثر تلقائيًا في المخزون والحسابات والتقارير — بدون إدخال مكرر.': 'Every document flows into stock, accounts and reports automatically — no double entry.',
    'المبيعات والعملاء': 'Sales & Customers', 'فواتير ومرتجعات وتحصيلات، وكشف حساب لكل عميل يتحدث لحظيًا.': 'Invoices, returns and collections, with a live statement for every customer.',
    'المشتريات والموردين': 'Purchases & Suppliers', 'فواتير الموردين ومستحقاتهم ومواعيد السداد في مكان واحد.': 'Supplier invoices, dues and payment dates in one place.',
    'الخزائن والبنوك': 'Cash & Banks', 'كل جنيه يدخل أو يخرج بسند، ورصيد كل خزينة وحساب بنكي أمامك.': 'Every pound in or out has a voucher, with each cash box and bank balance in front of you.',
    'المخزون والجرد': 'Inventory & Counts', 'أرصدة لكل مخزن بمتوسط تكلفة مرجح، وتنبيه عند الوصول لحد الطلب.': 'Balances per warehouse at weighted average cost, with reorder alerts.',
    'المصنعية الخارجية': 'Outsourced Workshops', 'صرف الخامات للورش، استلام الإنتاج، ومطابقة الفاقد بالكيلو.': 'Issue materials to workshops, receive production, and reconcile losses by the kilo.',
    'العمالة والأجور': 'Labor & Wages', 'يوميات الإنتاج ومسيرات الأجور بالقطعة أو الساعة أو الشهر.': 'Production logs and payroll by piece, hour or month.',
    'الموديلات والرسم': 'Models & Design', 'ملف لكل موديل بخاماته وتكلفة رسمه وبرمجته على الماكينات.': 'A file per model with its materials and machine design costs.',
    'التقارير والتحليلات': 'Reports & Analytics', 'أرباح وخسائر، أعمار الديون، التدفقات النقدية، ومقارنة السنوات.': 'Profit & loss, debt aging, cash flow and year-over-year comparisons.',
    'الفريق والصلاحيات': 'Team & Permissions', 'أدوار مخصصة لكل فرد، دعوات آمنة، وسجل لكل تعديل ومن قام به.': 'Custom roles, secure invites, and a log of every change and who made it.',
    'دقة الأرقام': 'Accurate numbers', 'حسابات لا تقبل الخطأ': 'Accounts with no room for error', 'أرصدة محسوبة لا مكتوبة': 'Computed, never typed balances',
    'كل رصيد يُحسب من المستندات المعتمدة نفسها — لا مجال لرقم يدوي خاطئ.': 'Every balance is computed from posted documents — no room for a wrong manual number.',
    'لا شيء يُمسح': 'Nothing gets erased', 'الإلغاء بقيود عكسية موثقة بالسبب، والمستند الأصلي يبقى للتاريخ.': 'Voids post reversing entries with a reason, and the original stays on record.',
    'فحص في تاريخ كل حركة': 'Checked at every date', 'لا تُباع بضاعة ولا يُصرف مبلغ لم يكن موجودًا في تاريخ المستند.': 'You cannot sell stock or spend cash that did not exist on the document date.',
    'تبدأ في ثلاث خطوات': 'Get started in three steps', 'أنشئ حساب مصنعك': 'Create your factory account', 'دقيقة واحدة — بياناتك التجريبية جاهزة لتستكشف': 'One minute — demo data ready to explore',
    'ادعُ فريقك': 'Invite your team', 'حدد دور كل فرد وما يراه وما يعدّله': 'Set what each person can see and edit', 'ابدأ التسجيل': 'Start recording', 'فواتير، مخزون، ورش، وأجور — والتقارير تُبنى وحدها': 'Invoices, stock, workshops and wages — reports build themselves',
    'خطة تناسب حجم مصنعك': 'A plan for every factory size', 'كل الخطط تبدأ بتجربة مجانية 14 يومًا، ويمكنك التغيير في أي وقت.': 'Every plan starts with a 14-day free trial, and you can switch anytime.',
    'جاهز تنظّم مصنعك؟': 'Ready to organize your factory?', 'أنشئ حسابك الآن وجرّب البرنامج ببيانات تجريبية كاملة.': 'Create your account and try it with full demo data.',
    'الأساسية': 'Starter', 'الاحترافية': 'Professional', 'المؤسسات': 'Enterprise', 'الأكثر اختيارًا': 'Most popular', 'لورشة صغيرة تبدأ التنظيم': 'For a small workshop getting organized', 'لمصنع بفريق كامل': 'For a factory with a full team', 'لأكثر من مصنع وفرع': 'For multiple factories and branches',
    '3 مستخدمين': '3 users', '10 مستخدمين': '10 users', 'مستخدمون بلا حد': 'Unlimited users', 'المبيعات والمشتريات والخزائن': 'Sales, purchases & cash', 'المخزون والأصناف': 'Inventory & items', 'التقارير الأساسية': 'Core reports',
    'كل ما في الأساسية': 'Everything in Starter', 'المصنعية الخارجية والعمالة': 'Workshops & labor', 'أدوار وصلاحيات مخصصة': 'Custom roles & permissions', 'كل التقارير والتحليلات': 'All reports & analytics', 'كل ما في الاحترافية': 'Everything in Professional', 'عدة مخازن وفروع': 'Multiple warehouses & branches', 'دعم فني مخصص': 'Dedicated support',
    'ج.م': 'EGP', '/ شهريًا': '/ month', '/ سنويًا': '/ year', 'مرة واحدة': 'one-time', 'موصى به': 'Recommended', 'شهران مجانًا': '2 months free', 'مدى الحياة': 'Lifetime',
    'تواصل معنا': 'Contact us', 'ترخيص مخصص حسب عدد الفروع': 'Custom license based on branches', 'يُجدَّد شهريًا ويمكنك الإلغاء في أي وقت': 'Renews monthly, cancel anytime',
    'توفّر': 'Save', 'يعادل': 'equals', 'شهريًا': 'per month', 'يشمل أول سنة استضافة ودعم، ثم': 'Includes the first year of hosting & support, then', 'سنويًا': 'per year',
    'مستخدمان': '2 users', '6 مستخدمين': '6 users', 'لورشة أو مصنع صغير يبدأ التنظيم': 'For a small workshop or factory getting organized', 'الورش والمصنعية والعمالة والأجور': 'Workshops, labor & payroll', 'دعم فني مخصص وتدريب': 'Dedicated support & training',
    'كل الخطط تبدأ بتجربة مجانية 14 يومًا بدون بطاقة — والبيانات تنتقل معك عند الترقية.': 'Every plan starts with a 14-day free trial, no card — your data moves with you when you upgrade.',
    // الفاتورة الإلكترونية
    'الفاتورة الإلكترونية': 'E-Invoicing', 'منظومة مصلحة الضرائب المصرية': 'Egyptian Tax Authority system', 'لم تُرسل': 'Not sent', 'جاهزة للإرسال': 'Ready to send', 'تحتاج استكمال': 'Needs data', 'قيد المراجعة': 'Submitted', 'صالحة': 'Valid', 'مرفوضة': 'Rejected', 'ملغاة على المنظومة': 'Cancelled on ETA',
    'إرسال للمنظومة': 'Send to ETA', 'معاينة JSON': 'Preview JSON', 'المستند (JSON)': 'Document (JSON)', 'صفحة التحقق': 'Verification page', 'إلغاء على المنظومة': 'Cancel on ETA', 'الرقم الموحد UUID': 'UUID', 'قُبلت في': 'Accepted at', 'الإجمالي على المنظومة': 'Total on ETA',
    'رفضت المنظومة المستند': 'ETA rejected the document', 'صححت البيانات — أعد الفحص': 'Data fixed — check again', 'كل بيانات المنظومة مكتملة': 'All ETA data is complete', 'استكمال': 'Complete', 'فتح العميل': 'Open customer', 'فتح الصنف': 'Open item',
    'قبلت المنظومة الفاتورة ✓': 'ETA accepted the invoice ✓', 'رفضت المنظومة الفاتورة — راجع الأسباب': 'ETA rejected the invoice — see reasons', 'إرسال الجاهز': 'Send ready', 'إرسال الفواتير الجاهزة': 'Send ready invoices', 'استكمل هذه البيانات مرة واحدة لتصبح فواتيرك جاهزة': 'Complete this data once to make your invoices ready',
    'توليد الأكواد': 'Generate codes', 'توليد الأكواد الناقصة': 'Generate missing codes', 'تصدير الأصناف': 'Export items', 'أكواد الأصناف (EGS)': 'Item codes (EGS)', 'أكواد الوحدات': 'Unit codes', 'ربط وحدات البرنامج بأكواد وحدات المنظومة': 'Map your units to ETA unit codes',
    'اربط مصنعك بمنظومة الفاتورة الإلكترونية': 'Connect your factory to e-invoicing', 'ابدأ الإعداد': 'Start setup', 'بيانات المصنع': 'Factory details', 'أكواد الأصناف': 'Item codes', 'بيانات العملاء': 'Customer data',
    'رقم التسجيل الضريبي': 'Tax registration number', 'كود النشاط الاقتصادي': 'Activity code', 'رقم الفرع': 'Branch number', 'المحافظة': 'Governorate', 'المدينة / المنطقة': 'City / area', 'رقم المبنى': 'Building no.', 'الشارع': 'Street', 'البيئة': 'Environment', 'مفعّلة': 'Enabled',
    'نوعه في الفاتورة الإلكترونية': 'E-invoice receiver type', 'الرقم القومي (للأفراد)': 'National ID (individuals)', 'المدينة': 'City', 'كود الفاتورة الإلكترونية (EGS/GS1)': 'E-invoice code (EGS/GS1)', 'إشعار دائن': 'Credit note',
    // أقسام خارج الخطة
    'متاح في خطة': 'Available on', 'قارن الخطط': 'Compare plans', 'جرّب الاحترافية ضمن تجربتك المجانية': 'Try Professional in your free trial', 'الترقية إلى': 'Upgrade to', 'اطلب من مالك المصنع الترقية إلى خطة': 'Ask the factory owner to upgrade to',
    'لتفعيل هذا القسم.': 'to unlock this section.', 'اعرف أكثر': 'Learn more', 'الأدوار المخصصة متاحة في خطة': 'Custom roles are available on', 'في خطتك الحالية تستخدم الأدوار الجاهزة كما هي — رقِّ لتعديل الصلاحيات وإنشاء أدوار بأسمائك.': 'Your current plan uses the built-in roles as-is — upgrade to edit permissions and create your own roles.',
    'العمالة الداخلية والأجور': 'In-house labor & payroll', 'تابع خاماتك من لحظة خروجها للورشة لحد ما ترجع إنتاج جاهز.': 'Track your materials from the moment they leave for the workshop until they come back as finished goods.',
    'أجور عمالك محسوبة من إنتاجهم الفعلي — بدون كشكول ولا آلة حاسبة.': 'Wages computed from actual production — no notebook, no calculator.', 'ملف كامل لكل موديل من الرسم والبرمجة حتى المنتج التام.': 'A full file for every model, from design to finished product.',
    'أدوار وصلاحيات مخصصة': 'Custom roles & permissions', 'حدد بالضبط ما يراه ويعدّله كل فرد في فريقك.': 'Decide exactly what each team member can see and edit.',
    'صرف الخامات لكل ورشة ومتابعة العهدة بالكيلو': 'Issue materials per workshop and track custody by the kilo', 'استلام الإنتاج وحساب المصنعية تلقائيًا بالساعة أو القطعة': 'Receive production with fees auto-calculated by hour or piece', 'مطابقة الفاقد وتحميله على الورشة': 'Reconcile losses and charge them to the workshop', 'تكلفة حقيقية لكل قطعة منتجة': 'True cost per produced piece',
    'يوميات إنتاج لكل عامل وقسم': 'Production logs per worker and department', 'مسيرات أجور بالقطعة أو الساعة أو الشهر': 'Payroll by piece, hour or month', 'السلف والخصومات وصافي المستحق تلقائيًا': 'Advances, deductions and net pay automatically', 'تكلفة العمالة في التقارير': 'Labor cost in reports',
    'ملف لكل موديل بخاماته': 'A file per model with its materials', 'مهام الرسم والبرمجة على الماكينات وتكلفتها': 'Machine design and programming jobs and their cost', 'ربط الموديل بالمنتج التام في المخزن': 'Link the model to its finished item in stock',
    'أنشئ أدوارًا بأسماء تناسب مصنعك': 'Create roles named for your factory', 'لكل قسم: بدون وصول أو عرض فقط أو إدارة كاملة': 'Per section: no access, view only or full access', 'صلاحيات حساسة مثل إلغاء المستندات وتعديل الأسعار': 'Sensitive permissions like voiding documents and editing prices',
    // الجولة التعريفية
    'أهلًا بك في ميزان': 'Welcome to Mizan', 'جولة سريعة (دقيقة واحدة) تعرّفك على أهم ما في البرنامج — يمكنك تخطيها والعودة إليها في أي وقت من قائمة حسابك.': 'A quick one-minute tour of the essentials — skip it and come back anytime from your account menu.',
    'كل أقسام المصنع في مكان واحد': 'Every part of the factory in one place', 'ابحث عن أي شيء': 'Search anything', 'إنشاء أي مستند بسرعة': 'Create any document fast', 'اختر الفترة': 'Pick the period', 'عمليات يومك بضغطة': 'Your daily actions in one click',
    'مؤشرات مقارنة بالعام الماضي': 'KPIs vs last year', 'رسوم تفاعلية': 'Interactive charts', 'قوائم المستندات': 'Document lists', 'إدخال سريع بالكيبورد': 'Fast keyboard entry', 'تقارير جاهزة': 'Ready-made reports', 'انقل بياناتك من Excel': 'Bring your data from Excel', 'فريقك وصلاحياته': 'Your team and permissions', 'حسابك': 'Your account', 'أنت جاهز!': "You're all set!",
    'لاحقًا': 'Later', 'ابدأ الجولة': 'Start tour', 'تخطي': 'Skip', 'السابق': 'Back', 'التالي': 'Next', 'إنهاء': 'Finish', 'إعادة الجولة': 'Replay tour', 'ابدأ العمل': 'Start working', 'جولة تعريفية: كيف أستخدم البرنامج': 'Product tour: how to use the app',
    // الدفع
    'إتمام الاشتراك': 'Complete subscription', 'طريقة الدفع': 'Payment method', 'ملخص الطلب': 'Order summary', 'بطاقة بنكية': 'Bank card', 'محفظة إلكترونية': 'Mobile wallet', 'فوري': 'Fawry', 'إنستاباي': 'InstaPay',
    'ادفع نقدًا من أي فرع أو تطبيق فوري': 'Pay cash at any Fawry outlet or app', 'تحويل لحظي من تطبيق البنك': 'Instant transfer from your bank app', 'قيمة الاشتراك': 'Subscription', 'ضريبة القيمة المضافة 14%': 'VAT 14%', 'وفّرت شهرين': 'You saved 2 months', 'الإجمالي': 'Total',
    'دفع آمن عبر بوابة دفع معتمدة — بيانات بطاقتك لا تُحفظ لدينا أبدًا': 'Secure payment via a certified gateway — your card details are never stored by us', 'ادفع': 'Pay', 'احصل على رقم فوري': 'Get Fawry code', 'نسخة تجريبية: لا يتم خصم أي مبلغ فعليًا.': 'Demo: no money is actually charged.',
    'رقم المحفظة': 'Wallet number', 'تم الدفع بنجاح': 'Payment successful', 'تم إنشاء رقم فوري': 'Fawry code created', 'رقم الإيصال': 'Receipt no.', 'المبلغ': 'Amount', 'التجديد القادم': 'Next renewal', 'متابعة': 'Continue', 'رجوع للخطط': 'Back to plans',
    'أو ادفع الآن وفعّل الاشتراك مباشرة': 'Or pay now and activate right away', 'اشتراك شهري': 'Monthly subscription', 'اشتراك سنوي': 'Yearly subscription', 'ترخيص مدى الحياة': 'Lifetime license', 'المدفوعات والإيصالات': 'Payments & receipts',
    // الاستيراد والتصدير
    'استيراد وتصدير Excel': 'Excel Import & Export', 'استيراد وتصدير البيانات': 'Import & Export Data', 'انقل بياناتك من Excel أو من برنامجك القديم في دقائق — مع مراجعة كاملة قبل الحفظ وإمكانية التراجع': 'Move your data from Excel or your old system in minutes — fully reviewed before saving, and reversible',
    'نوع البيانات': 'Data type', 'الملف': 'File', 'مطابقة الأعمدة': 'Match columns', 'المراجعة': 'Review', 'البدء من جديد': 'Start over', 'البيانات الأساسية': 'Master data', 'الأرصدة الافتتاحية': 'Opening balances', '— بعد استيراد الأصناف والأطراف': '— after importing items and parties',
    'القالب': 'Template', 'تحميل القالب': 'Download template', 'بدون صلاحية': 'No access', 'تصدير بياناتك إلى Excel': 'Export your data to Excel', 'تصدير ملف Excel': 'Export Excel file', 'عمليات الاستيراد السابقة': 'Previous imports', 'تراجع': 'Undo', 'تم التراجع': 'Undone', 'لا توجد عمليات استيراد بعد': 'No imports yet',
    'الكود والاسم والفئة والوحدة والسعر': 'Code, name, category, unit and price', 'الاسم والهاتف والعنوان': 'Name, phone and address', 'ورش ومصانع التشغيل': 'Contract workshops', 'أرصدة العملاء والموردين': 'Customer & supplier balances', 'أرصدة أول المدة لكل طرف': 'Opening balance per party',
    'رصيد المخزون الافتتاحي': 'Opening stock', 'الكمية والتكلفة لكل صنف': 'Quantity and cost per item', 'أرصدة الخزائن والبنوك': 'Cash & bank balances', 'الرصيد الحالي لكل خزينة أو حساب': 'Current balance per cash box or account',
    'اسحب ملف Excel هنا أو اضغط للاختيار': 'Drop an Excel file here or click to choose', 'انسخ الخلايا من Excel والصقها هنا': 'Copy cells from Excel and paste them here', 'قراءة البيانات الملصقة': 'Read pasted data', 'أو': 'or',
    'تاريخ الأرصدة الافتتاحية': 'Opening balance date', 'عند وجود سجل بنفس الكود أو الاسم': 'When a record with the same code or name exists', 'تخطيه (الأكثر أمانًا)': 'Skip it (safest)', 'تحديث بياناته من الملف': 'Update it from the file', 'المخزن (إن لم يُحدد في الملف)': 'Warehouse (if not in the file)',
    'الصف الأول عناوين أعمدة': 'First row is headers', 'اربط كل حقل بعمود من ملفك': 'Link each field to a column in your file', 'طابقنا الأعمدة تلقائيًا من أسمائها — راجعها وعدّل أي اختيار غير صحيح': 'We matched columns by their names — review and fix any wrong match',
    '— لا يوجد في الملف —': '— not in file —', 'كل الحقول المطلوبة مربوطة': 'All required fields are linked', 'مراجعة البيانات': 'Review data', 'الأخطاء فقط': 'Errors only', 'تجاهل الصفوف التي بها أخطاء واستيراد الباقي': 'Skip rows with errors and import the rest', 'لا توجد أخطاء': 'No errors',
    'جديد': 'New', 'تحديث': 'Update', 'تخطي': 'Skip', 'خطأ': 'Error', 'أخطاء': 'Errors', 'ملاحظة': 'Note', 'استيراد من Excel': 'Import from Excel', 'تصدير البيانات إلى Excel': 'Export data to Excel', 'استيراد ملف آخر': 'Import another file', 'تراجع عن هذا الاستيراد': 'Undo this import', 'تم الاستيراد بنجاح': 'Imported successfully', 'التراجع عن الاستيراد': 'Undo import',
    'أحمد اعتمد فاتورة بيع': 'Ahmed posted a sales invoice', 'الورشة سلّمت إنتاجًا': 'Workshop delivered production', '240 قطعة': '240 pcs', 'تقرير الأرباح تحدّث': 'Profit report updated', 'الآن': 'just now',
    'عرض الإطلاق': 'Launch offer', 'خصم عرض الإطلاق': 'Launch discount', 'عرض الإطلاق: خصم': 'Launch offer:', 'على أول سنة': 'off your first year', 'على أول': 'off your first', 'للسنة الأولى': 'for the first year', 'لأول': 'for the first', 'شهرًا': 'months', 'أشهر': 'months', 'سعر الخطة': 'Plan price', 'شامل ضريبة القيمة المضافة 14%': 'Includes 14% VAT', 'وفّرت شهرين مقارنة بالشهري': '2 months free vs monthly', 'سعرك المخفّض ثابت حتى': 'Your discounted price is locked until', 'مثبّت لمصنعك حتى': 'locked for your factory until', 'اشترك قبل': 'Subscribe before', 'وسعرك المخفّض يفضل ثابت طول مدة العرض — حتى لو انتهى العرض. التجربة المجانية 14 يومًا كما هي.': 'and your discounted price stays locked for the whole offer period — even after the offer ends. The 14-day free trial still applies.',
    'تحصيل جديد': 'New receipt', 'تم اعتماد الفاتورة': 'Invoice posted', '3 متصلين الآن': '3 online now', 'طي القائمة': 'Collapse sidebar', 'فتح القائمة': 'Expand sidebar', 'طي/فتح القائمة': 'Toggle sidebar',
    'داخل ميزان': 'Inside Mizan', 'كل حركة في المصنع': 'Every movement in the factory', 'تصنع تقريرها بنفسها': 'builds its own report',
    'فريقك على نفس الشاشة': 'Your team on one screen', 'المحاسب وأمين المخزن ومسؤول الإنتاج يعملون معًا لحظيًا، وكل واحد يرى ما يخصه فقط.': 'Accountant, storekeeper and production lead work together in real time — each sees only what is theirs.',
    'تقارير تُبنى وحدها': 'Reports that build themselves', 'كل مستند معتمد يحدّث الأرباح والمخزون وكشوف الحساب فورًا — بدون إكسل ولا إدخال مكرر.': 'Every posted document updates profit, stock and statements instantly — no Excel, no double entry.',
    'أقسام مترابطة': 'Connected departments', 'فاتورة بيع واحدة تُخصم من المخزن وتُضاف لحساب العميل وتدخل الخزينة — تلقائيًا.': 'One sales invoice reduces stock, charges the customer and lands in the cash box — automatically.',
    'تحليلات لحظية': 'Live analytics', 'مرّر على الرسم لترى مبيعات كل شهر ونسبة نموها عن بداية السنة.': 'Hover the chart to see each month’s sales and growth since January.',
    '4 أقسام مترابطة': '4 departments connected', 'المبيعات': 'Sales', 'المخزون': 'Inventory', 'الخزائن': 'Cash', 'الورش': 'Workshops',
    'أحمد · يعتمد فاتورة': 'Ahmed · posting an invoice', 'محمود · جرد المخزن': 'Mahmoud · counting stock', 'كريم · استلام إنتاج': 'Karim · receiving production', 'سارة · تراجع التقارير': 'Sara · reviewing reports', 'المدير · غير متصل': 'Manager · offline',
    // الدخول
    'الصفحة الرئيسية': 'Home', 'كل مصنعك في شاشة واحدة — من الخيط حتى الفاتورة': 'Your whole factory on one screen — from yarn to invoice', 'مبيعات ومشتريات ومخازن وورش وعمالة، بأرقام دقيقة محسوبة من كل حركة.': 'Sales, purchases, warehouses, workshops and labor, with exact figures from every movement.',
    'صلاحيات دقيقة': 'Precise permissions', 'لكل فرد في فريقك': 'for everyone on your team', 'تقارير لحظية': 'Live reports', 'للأرباح والخزائن والمخزون': 'for profit, cash and stock', 'سريع بالكيبورد': 'Keyboard-fast', 'لمن يعمل تحت ضغط': 'for people working under pressure',
    'مرحبًا بعودتك': 'Welcome back', 'سجّل الدخول لمتابعة العمل في مصنعك': 'Sign in to continue working in your factory', 'البريد الإلكتروني أو اسم الدخول': 'Email or username', 'كلمة المرور': 'Password', 'نسيت كلمة المرور؟': 'Forgot password?',
    'تذكرني على هذا الجهاز': 'Remember me on this device', 'تسجيل الدخول': 'Sign in', 'لدي رمز دعوة من مصنعي': 'I have an invite code from my factory', 'ليس لديك حساب؟': 'No account?', 'أنشئ حساب مصنعك مجانًا': 'Create your factory account for free',
    'حسابات تجريبية — كلمة المرور': 'Demo accounts — password', 'أدخل اسم الدخول وكلمة المرور': 'Enter your username and password', 'بيانات الدخول غير صحيحة': 'Invalid sign-in details', 'Caps Lock مفعّل': 'Caps Lock is on',
    'تم إيقاف هذا الحساب — تواصل مع مالك المصنع': 'This account has been disabled — contact the factory owner', 'هذا الحساب لم يُفعّل بعد — استخدم رمز الدعوة لتعيين كلمة المرور': 'This account is not activated yet — use your invite code to set a password',
    'اختر المصنع': 'Choose a factory', 'حسابك مرتبط بأكثر من مصنع على هذا الجهاز': 'Your account belongs to more than one factory on this device', 'رجوع لتسجيل الدخول': 'Back to sign in',
    'حسابك': 'Your account', 'مصنعك': 'Your factory', 'الخطة': 'Plan', 'أنشئ حساب مصنعك': 'Create your factory account', 'تجربة مجانية 14 يومًا — بدون بطاقة دفع': '14-day free trial — no card required',
    'اسمك الكامل': 'Your full name', 'البريد الإلكتروني': 'Email', 'تأكيد كلمة المرور': 'Confirm password', 'متابعة': 'Continue', 'لديك حساب بالفعل؟': 'Already have an account?', 'رجوع': 'Back',
    '8 أحرف على الأقل': 'At least 8 characters', 'حروف وأرقام معًا': 'Letters and numbers', 'رمز (!@#) أو حرف كبير': 'A symbol (!@#) or capital letter', 'ضعيفة': 'Weak', 'متوسطة': 'Fair', 'جيدة': 'Good', 'قوية جدًا': 'Very strong',
    'اكتب اسمك الكامل': 'Enter your full name', 'البريد الإلكتروني غير صحيح': 'Invalid email', 'كلمة المرور لا تحقق الشروط': 'Password does not meet the requirements', 'كلمتا المرور غير متطابقتين': 'Passwords do not match',
    'هذا البريد مسجل بالفعل — سجّل الدخول أو استعد كلمة المرور': 'This email is already registered — sign in or reset your password',
    'بيانات المصنع': 'Factory details', 'تظهر في الفواتير وكشوف الحساب — يمكنك تعديلها لاحقًا': 'Shown on invoices and statements — you can edit them later', 'اسم المصنع': 'Factory name', 'رقم الهاتف': 'Phone number', 'حجم الفريق': 'Team size',
    'كيف تحب أن تبدأ؟': 'How would you like to start?', 'ببيانات تجريبية': 'With demo data', 'استكشف البرنامج بأمثلة جاهزة': 'Explore with ready-made examples', 'بداية نظيفة': 'Clean start', 'إعدادات جاهزة بدون حركات': 'Ready settings, no transactions', 'اكتب اسم المصنع': 'Enter the factory name',
    'اختر خطتك': 'Choose your plan', 'كل الخطط تبدأ بتجربة مجانية 14 يومًا ويمكنك التغيير في أي وقت': 'Every plan starts with a 14-day free trial and you can switch anytime', 'شهري': 'Monthly', 'سنوي': 'Yearly', 'وفّر 20%': 'Save 20%',
    'أوافق على': 'I agree to the', 'شروط الاستخدام': 'Terms of Use', 'سياسة الخصوصية': 'Privacy Policy', 'ابدأ التجربة المجانية': 'Start free trial', 'لن نطلب بيانات دفع الآن — يُربط الدفع الإلكتروني عند انتهاء التجربة.': 'No payment details now — online payment is set up when the trial ends.',
    'يجب الموافقة على الشروط للمتابعة': 'You must accept the terms to continue', 'أهلًا بك في ميزان ERP': 'Welcome to Mizan ERP', 'ادعُ فريقك من الإعدادات ← المستخدمون': 'Invite your team from Settings → Users', 'حدد صلاحيات كل دور': 'Set permissions for each role', 'خصّص المظهر والألوان': 'Customize appearance and colors', 'ادخل إلى لوحة التحكم': 'Go to dashboard',
    'اكتب بريدك أو اسم الدخول وسنرسل لك رمز تحقق من 6 أرقام': 'Enter your email or username and we will send a 6-digit code', 'إرسال رمز التحقق': 'Send verification code', 'اكتب البريد أو اسم الدخول': 'Enter email or username',
    'أدخل رمز التحقق': 'Enter verification code', 'نسخة تجريبية بدون بريد — رمزك هو': 'Demo without email — your code is', 'تحقق ومتابعة': 'Verify and continue', 'لم يصلك الرمز؟': "Didn't get the code?", 'إعادة الإرسال بعد': 'Resend in', 'إعادة إرسال الرمز': 'Resend code', 'أدخل الأرقام الستة': 'Enter all six digits',
    'الرمز غير صحيح': 'Incorrect code', 'انتهت صلاحية الرمز — اطلب رمزًا جديدًا': 'Code expired — request a new one', 'محاولات كثيرة — اطلب رمزًا جديدًا': 'Too many attempts — request a new code',
    'كلمة مرور جديدة': 'New password', 'اختر كلمة مرور قوية لم تستخدمها من قبل': 'Choose a strong password you have not used before', 'كلمة المرور الجديدة': 'New password', 'حفظ كلمة المرور': 'Save password', 'تم تغيير كلمة المرور': 'Password changed',
    'تم تسجيل الخروج من كل الأجهزة الأخرى. سجّل الدخول الآن بكلمة المرور الجديدة.': 'You were signed out on all other devices. Sign in now with your new password.',
    'الانضمام إلى مصنعك': 'Join your factory', 'أدخل رمز الدعوة الذي أرسله لك مالك المصنع': 'Enter the invite code the factory owner sent you', 'رمز الدعوة': 'Invite code', 'رمز الدعوة غير صحيح': 'Invalid invite code', 'انتهت صلاحية الدعوة — اطلب دعوة جديدة من مالك المصنع': 'The invite has expired — ask the factory owner for a new one',
    'تمت دعوتك للانضمام إلى': 'You were invited to join', 'بدور': 'as', 'اختر كلمة المرور': 'Choose a password', 'تفعيل الحساب والدخول': 'Activate account and sign in',
    'الشاشة مقفلة لحماية بيانات المصنع': 'Screen locked to protect factory data', 'فتح القفل': 'Unlock', 'ليس أنت؟ تسجيل الخروج': 'Not you? Sign out', 'قفل الشاشة': 'Lock screen', 'تسجيل الخروج': 'Sign out', 'تجاوزت عدد المحاولات المسموح': 'Too many attempts', 'انتهت الجلسة أو تغيرت صلاحيات الحساب': 'Session ended or account permissions changed',
    // الصلاحيات والفريق
    'لا تملك صلاحية الوصول لهذه الصفحة': "You don't have access to this page", 'دورك الحالي': 'Your current role', 'لا يتضمن صلاحية:': 'does not include:', 'اطلب من مالك المصنع إضافة الصلاحية لدورك من الإعدادات ← الأدوار والصلاحيات': 'Ask the factory owner to add it to your role in Settings → Roles & Permissions',
    'المؤشرات المالية مخفية لدورك': 'Financial figures are hidden for your role', 'دورك الحالي لا يسمح بإنشاء مستندات': 'Your role cannot create documents',
    'حسابي': 'My Account', 'حسابي وكلمة المرور': 'Account & Password', 'المصنع': 'Factory', 'الفريق والأمان': 'Team & Security', 'النظام': 'System', 'المستخدمون': 'Users', 'الأدوار والصلاحيات': 'Roles & Permissions', 'الأمان وتسجيل الدخول': 'Security & Sign-in', 'الاشتراك والخطة': 'Subscription & Plan',
    'البيانات الشخصية': 'Personal details', 'الاسم الكامل': 'Full name', 'اسم الدخول': 'Username', 'حفظ البيانات': 'Save details', 'تغيير كلمة المرور': 'Change password', 'كلمة المرور الحالية': 'Current password', 'تحديث كلمة المرور': 'Update password', 'الجلسات والأجهزة': 'Sessions & devices', 'هذا الجهاز': 'This device', 'الجلسة الحالية': 'Current session',
    'تسجيل الخروج من كل الأجهزة الأخرى': 'Sign out of all other devices', 'قفل الشاشة الآن': 'Lock screen now', 'آخر دخول': 'Last sign-in',
    'أعضاء الفريق': 'Team members', 'دعوة عضو': 'Invite member', 'دعوة عضو جديد': 'Invite new member', 'نشط': 'Active', 'بانتظار القبول': 'Pending', 'بانتظار قبول الدعوة': 'Pending invites', 'موقوف': 'Disabled', 'مقفل مؤقتًا': 'Temporarily locked', 'أنت': 'You',
    'الدور والصلاحيات': 'Role & permissions', 'إنشاء الدعوة': 'Create invite', 'عرض رمز ورابط الدعوة': 'Show invite code & link', 'إنشاء رمز دعوة جديد': 'Generate new invite code', 'إعادة تعيين الدخول (رمز جديد)': 'Reset sign-in (new code)', 'إيقاف الحساب': 'Disable account', 'إعادة تفعيل الحساب': 'Re-enable account', 'إلغاء الدعوة': 'Cancel invite', 'تعديل البيانات والدور': 'Edit details & role',
    'نسخ الرابط': 'Copy link', 'نسخ الرمز فقط': 'Copy code only', 'تم النسخ': 'Copied', 'تم': 'Done',
    'الأدوار': 'Roles', 'دور جديد': 'New role', 'نسخ': 'Duplicate', 'حذف': 'Delete', 'نظام': 'System', 'اسم الدور': 'Role name', 'الوصف': 'Description', 'اللون': 'Color', 'الوصول للأقسام': 'Section access', 'الإدارة تشمل العرض والإنشاء والتعديل': 'Manage includes view, create and edit',
    'بدون وصول': 'No access', 'عرض فقط': 'View only', 'إدارة كاملة': 'Full access', 'صلاحيات خاصة': 'Special permissions', 'حساسة': 'Sensitive', 'تراجع': 'Undo', 'حفظ الصلاحيات': 'Save permissions', 'تم حفظ صلاحيات الدور': 'Role permissions saved',
    'سياسة الدخول': 'Sign-in policy', 'قفل الشاشة تلقائيًا بعد الخمول': 'Auto-lock when idle', 'المحاولات الخاطئة قبل القفل': 'Failed attempts before lockout', 'مدة القفل المؤقت': 'Lockout duration', 'كلمات مرور قوية إلزاميًا': 'Require strong passwords', 'إجراءات طارئة': 'Emergency actions', 'تسجيل خروج الجميع': 'Sign everyone out', 'نشاط الدخول': 'Sign-in activity',
    'تجربة مجانية': 'Free trial', 'اشتراك نشط': 'Active subscription', 'مقارنة الخطط': 'Compare plans', 'خطتك الحالية': 'Your current plan', 'الترقية': 'Upgrade', 'تفعيل الاشتراك': 'Activate subscription', 'مقاعد الخطة': 'Plan seats',
    // رسائل المحاسبة الجديدة
    'خصم الفاتورة لا يكون سالبًا': 'Invoice discount cannot be negative', 'ليس لديك صلاحية إعطاء خصم على الفاتورة': 'You are not allowed to give an invoice discount', 'الساعات والكميات لا تكون سالبة': 'Hours and quantities cannot be negative', 'قيمة المصنعية لا تكون سالبة': 'Workshop fee cannot be negative',
    'مبلغ التحميل على الورشة لا يكون سالبًا': 'Charge to workshop cannot be negative', 'سجّل مرتجع مشتريات بدلًا من الإلغاء': 'Record a purchase return instead of voiding', 'ألغِ المستندات اللاحقة أولًا أو سجّل تسوية': 'Void the later documents first or record an adjustment', 'الرئيسية': 'Home', 'القائمة': 'Menu', 'اختر الفترة': 'Choose period',
    'إضافة عميل سريعًا': 'Quick Add Customer', 'إضافة مورد سريعًا': 'Quick Add Supplier', 'إضافة صنف سريعًا': 'Quick Add Item',
  };

  let dict = null, re = null, singles = null;
  function build() {
    const src = Object.assign({}, window.I18N_EN || {}, EXTRA);
    dict = new Map(); singles = new Map();
    for (const [k, v] of Object.entries(src)) {
      const key = String(k).trim();
      if (!key || v == null || !AR.test(key)) continue;
      dict.set(key, String(v));
      if (!/\s/.test(key) && (key.match(AR_WORD) || []).length === 1 && key.match(AR_WORD)[0] === key) singles.set(key, String(v));
    }
    // العبارات متعددة الكلمات تُستبدل داخل أي نص (الأطول أولًا)؛ الكلمة المفردة لا تُترجم إلا إذا كان النص كله مفردات واجهة
    const multi = [...dict.keys()].filter((k) => !singles.has(k)).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // حدود الكلمة: لا نستبدل جزءًا من كلمة عربية أطول
    re = multi.length ? new RegExp('(?<![\\u0600-\\u06FF])(?:' + multi.join('|') + ')(?![\\u0600-\\u06FF])', 'g') : null;
  }

  // أسماء البيانات (عملاء، أصناف، مخازن، خزائن، فئات…) تبقى كما أُدخلت ولا تُترجم جزئيًا
  let namesRe = null, namesSig = '';
  const DATA_COLLS = ['parties', 'items', 'workers', 'models', 'accounts', 'warehouses', 'itemCats', 'expenseCats', 'incomeCats', 'departments', 'operations', 'modelCats', 'templates', 'rates'];
  function protectedNames() {
    if (!window.DB || !DB.s) return null;
    const sig = DATA_COLLS.map((c) => (DB.s[c] || []).length).join(',');
    if (sig === namesSig) return namesRe;
    namesSig = sig;
    const set = new Set();
    for (const c of DATA_COLLS) for (const x of DB.s[c] || []) for (const v of [x.name, x.note, x.lineName]) if (v && AR.test(v) && String(v).trim().length > 1) set.add(String(v).trim());
    const list = [...set].sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    namesRe = list.length ? new RegExp(list.join('|'), 'g') : null;
    return namesRe;
  }

  function tr(text) {
    if (!text || !AR.test(text)) return text;
    const t = text.trim();
    let out;
    if (dict.has(t)) out = text.replace(t, dict.get(t));
    else {
      const saved = [];
      const nre = protectedNames();
      out = nre ? text.replace(nre, (m) => { saved.push(m); return '\uE000' + (saved.length - 1) + '\uE001'; }) : text;
      out = re ? out.replace(re, (m) => dict.get(m)) : out;
      const left = out.match(AR_WORD);
      if (left && left.every((w) => singles.has(w))) out = out.replace(AR_WORD, (w) => singles.get(w));
      if (saved.length) out = out.replace(/\uE000(\d+)\uE001/g, (_, i) => saved[+i]);
    }
    // أسهم الاتجاه تنقلب مع اتجاه الصفحة
    return out.replace(/‹/g, '›').replace(/←/g, '→').replace(/،/g, ',').replace(/؟/g, '?');
  }
  I18N.t = (s) => (I18N.en ? tr(s) : s);

  const ATTRS = ['placeholder', 'title', 'aria-label', 'data-label'];
  function translate(root) {
    if (!root) return;
    if (root.nodeType === 3) { const v = tr(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
    if (root.nodeType !== 1) return;
    if (root.closest && root.closest('[data-no-tr]')) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (AR.test(n.nodeValue) && !(n.parentElement && n.parentElement.closest('script,style,textarea,[data-no-tr]')) ? 1 : 3),
    });
    const nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    for (const n of nodes) { const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
    const els = [root, ...root.querySelectorAll('[placeholder],[title],[aria-label],[data-label]')];
    for (const el of els) for (const a of ATTRS) { const v = el.getAttribute && el.getAttribute(a); if (v && AR.test(v)) el.setAttribute(a, tr(v)); }
  }
  I18N.translate = translate;

  I18N.start = () => {
    document.documentElement.lang = I18N.lang;
    document.documentElement.dir = I18N.en ? 'ltr' : 'rtl';
    if (!I18N.en) return;
    build();
    if (window.U) U.MONTHS.splice(0, 12, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December');
    translate(document.body);
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'characterData') translate(m.target);
        else for (const n of m.addedNodes) translate(n);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    // عنوان التبويب
    const titleObs = () => { const v = tr(document.title); if (v !== document.title) document.title = v; };
    new MutationObserver(titleObs).observe(document.querySelector('title'), { childList: true, characterData: true, subtree: true });
    titleObs();
  };

  window.I18N = I18N;
})();
