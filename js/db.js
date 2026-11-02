/* طبقة البيانات: الحالة الكاملة + معاملات ذرية (تنجح كلها أو تُلغى كلها) + سجل التغييرات
   في النسخة الفعلية يحل محلها API + قاعدة بيانات بمعاملات، والواجهة لا تتغير. */
(function () {
  // كل مصنع (مساحة عمل) له مفتاح تخزين مستقل؛ المصنع التجريبي يستخدم المفتاح الأصلي
  let KEY = 'knit-erp-v1';
  const listeners = new Set();

  const empty = () => ({
    version: 1,
    seq: { id: 1, numbers: {} },
    settings: {},
    users: [],
    currentUserId: null,
    fiscalYears: [],
    parties: [],
    workers: [],
    items: [],
    itemCats: [],
    units: [],
    warehouses: [],
    accounts: [],
    expenseCats: [],
    incomeCats: [],
    departments: [],
    operations: [],
    models: [],
    modelCats: [],
    rates: [],
    taxes: [],
    templates: [],
    workLogs: [],
    orders: [],
    docs: [],
    stock: [],
    ledger: [],
    cash: [],
    custody: [],
    audit: [],
  });

  const DB = {
    s: empty(),
    bulk: false,
    _idx: {},

    setKey(k) { KEY = k; DB.reset(); },
    key() { return KEY; },
    // قراءة بيانات مصنع آخر دون تحميلها (للبحث عن حساب عند تسجيل الدخول)
    peek(k) { try { const s = JSON.parse(localStorage.getItem(k)); return s && s.version === 1 ? s : null; } catch (e) { return null; } },
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (s && s.version === 1) {
            DB.s = Object.assign(empty(), s);
            DB._idx = {};
            return true;
          }
        }
      } catch (e) { console.warn(e); }
      return false;
    },
    save() {
      if (DB.bulk) return;
      try { localStorage.setItem(KEY, JSON.stringify(DB.s)); }
      catch (e) { console.error(e); window.UI && UI.toast('تعذر الحفظ المحلي — مساحة التخزين ممتلئة', 'danger'); }
    },
    reset() { DB.s = empty(); DB._idx = {}; },
    wipe() { localStorage.removeItem(KEY); },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit() { if (!DB.bulk) listeners.forEach((f) => f()); },

    nextId() { return DB.s.seq.id++; },

    // معاملة ذرية: لو حصل أي خطأ ترجع الحالة كما كانت بالضبط
    tx(fn) {
      if (DB.bulk) return fn();
      if (DB._inTx) return fn();
      const snap = JSON.stringify(DB.s);
      DB._inTx = true;
      try {
        const r = fn();
        DB._inTx = false;
        DB.save();
        DB.emit();
        return r;
      } catch (e) {
        DB._inTx = false;
        DB.s = JSON.parse(snap);
        DB._idx = {};
        throw e;
      }
    },

    add(coll, obj) {
      if (obj.id == null) obj.id = DB.nextId();
      DB.s[coll].push(obj);
      delete DB._idx[coll];
      return obj;
    },
    remove(coll, id) {
      const i = DB.s[coll].findIndex((x) => x.id === id);
      if (i >= 0) DB.s[coll].splice(i, 1);
      delete DB._idx[coll];
    },
    get(coll, id) {
      if (id == null) return null;
      let m = DB._idx[coll];
      if (!m || m.size !== DB.s[coll].length) {
        m = new Map(DB.s[coll].map((x) => [x.id, x]));
        DB._idx[coll] = m;
      }
      return m.get(+id) || null;
    },
    list(coll) { return DB.s[coll]; },

    audit(action, entity, entityId, details) {
      const u = DB.s.users.find((x) => x.id === DB.s.currentUserId);
      DB.s.audit.push({
        id: DB.nextId(),
        at: DB.bulk && DB._clock ? DB._clock : new Date().toISOString(),
        userId: u ? u.id : null,
        user: u ? u.name : 'النظام',
        action, entity, entityId, details: details || '',
      });
    },

    exportJSON() { return JSON.stringify(DB.s, null, 1); },
    importJSON(text) {
      const s = JSON.parse(text);
      if (!s || s.version !== 1 || !Array.isArray(s.docs)) throw new Error('ملف نسخة احتياطية غير صالح');
      DB.s = Object.assign(empty(), s);
      DB._idx = {};
      DB.save();
      DB.emit();
    },
    sizeKB() { try { return Math.round((localStorage.getItem(KEY) || '').length / 1024); } catch (e) { return 0; } },
  };

  window.DB = DB;
})();
