// indexed-db.js — Wrapper IndexedDB pentru stocare proiecte Zephren
// Pct. 55 — Infrastructură tehnică Zephren v3.4
//
// Înlocuiește localStorage ca mecanism principal de persistență.
// Fallback transparent la localStorage dacă IndexedDB nu este disponibil.

const DB_NAME = 'ZephrenDB';
const DB_VERSION = 1;

const STORES = {
  projects:  { keyPath: 'id' },
  settings:  { keyPath: 'key' },
  cpe_alerts: { keyPath: 'id' },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Detectează suport IndexedDB. */
const IDB_SUPPORTED =
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

/** Promisifică o cerere IDBRequest. */
function idbRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Singleton DB ─────────────────────────────────────────────────────────────

let _db = /** @type {IDBDatabase | null} */ (null);

async function openDB() {
  if (_db) return _db;

  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      for (const [storeName, options] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: options.keyPath });
        }
      }
    };

    req.onsuccess = () => {
      _db = req.result;
      // Curăță referința dacă conexiunea se închide neașteptat
      _db.onclose = () => { _db = null; };
      _db.onerror = (e) => console.error('[ZephrenDB] Eroare DB:', e);
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
    req.onblocked = () => {
      console.warn('[ZephrenDB] Upgrade blocat — alte tab-uri au DB-ul deschis.');
    };
  });
}

// ── Fallback localStorage ────────────────────────────────────────────────────

const LS = {
  _key: (store, id) => `zephren_${store}_${id}`,
  _listKey: (store) => `zephren_${store}_keys`,

  set(store, id, data) {
    try {
      localStorage.setItem(this._key(store, id), JSON.stringify(data));
      const keys = this._keys(store);
      if (!keys.includes(String(id))) {
        keys.push(String(id));
        localStorage.setItem(this._listKey(store), JSON.stringify(keys));
      }
    } catch (e) {
      console.error('[ZephrenDB LS fallback] set error:', e);
    }
  },

  get(store, id) {
    try {
      const raw = localStorage.getItem(this._key(store, id));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  _keys(store) {
    try {
      return JSON.parse(localStorage.getItem(this._listKey(store)) ?? '[]');
    } catch { return []; }
  },

  list(store) {
    return this._keys(store).map((id) => this.get(store, id)).filter(Boolean);
  },

  delete(store, id) {
    localStorage.removeItem(this._key(store, id));
    const keys = this._keys(store).filter((k) => k !== String(id));
    localStorage.setItem(this._listKey(store), JSON.stringify(keys));
  },

  clearStore(store) {
    this._keys(store).forEach((id) => localStorage.removeItem(this._key(store, id)));
    localStorage.removeItem(this._listKey(store));
  },
};

// ── API public ───────────────────────────────────────────────────────────────

export const ZephrenDB = {
  /**
   * Deschide baza de date și creează store-urile dacă nu există.
   * Sigur de apelat de mai multe ori (singleton intern).
   */
  async init() {
    if (!IDB_SUPPORTED) {
      console.info('[ZephrenDB] IndexedDB indisponibil — se folosește fallback localStorage.');
      return;
    }
    try {
      await openDB();
    } catch (err) {
      console.error('[ZephrenDB] init() eșuat:', err);
    }
  },

  /** Salvează un proiect. Câmpul `id` trebuie să existe în `data`. */
  async saveProject(id, data) {
    const record = { ...data, id };
    if (!IDB_SUPPORTED) { LS.set('projects', id, record); return; }
    try {
      const db = await openDB();
      const tx = db.transaction('projects', 'readwrite');
      await idbRequest(tx.objectStore('projects').put(record));
    } catch (err) {
      console.warn('[ZephrenDB] saveProject IDB eșuat, fallback LS:', err);
      LS.set('projects', id, record);
    }
  },

  /** Încarcă un proiect după id. Returnează `null` dacă nu există. */
  async loadProject(id) {
    if (!IDB_SUPPORTED) return LS.get('projects', id);
    try {
      const db = await openDB();
      const tx = db.transaction('projects', 'readonly');
      return await idbRequest(tx.objectStore('projects').get(id)) ?? null;
    } catch (err) {
      console.warn('[ZephrenDB] loadProject IDB eșuat, fallback LS:', err);
      return LS.get('projects', id);
    }
  },

  /** Returnează lista tuturor proiectelor salvate. */
  async listProjects() {
    if (!IDB_SUPPORTED) return LS.list('projects');
    try {
      const db = await openDB();
      const tx = db.transaction('projects', 'readonly');
      return await idbRequest(tx.objectStore('projects').getAll()) ?? [];
    } catch (err) {
      console.warn('[ZephrenDB] listProjects IDB eșuat, fallback LS:', err);
      return LS.list('projects');
    }
  },

  /** Șterge un proiect după id. */
  async deleteProject(id) {
    if (!IDB_SUPPORTED) { LS.delete('projects', id); return; }
    try {
      const db = await openDB();
      const tx = db.transaction('projects', 'readwrite');
      await idbRequest(tx.objectStore('projects').delete(id));
    } catch (err) {
      console.warn('[ZephrenDB] deleteProject IDB eșuat, fallback LS:', err);
      LS.delete('projects', id);
    }
  },

  /** Salvează o setare (cheie-valoare). */
  async saveSettings(key, value) {
    const record = { key, value };
    if (!IDB_SUPPORTED) { LS.set('settings', key, record); return; }
    try {
      const db = await openDB();
      const tx = db.transaction('settings', 'readwrite');
      await idbRequest(tx.objectStore('settings').put(record));
    } catch (err) {
      console.warn('[ZephrenDB] saveSettings IDB eșuat, fallback LS:', err);
      LS.set('settings', key, record);
    }
  },

  /** Încarcă o setare după cheie. Returnează `null` dacă nu există. */
  async loadSettings(key) {
    if (!IDB_SUPPORTED) {
      const rec = LS.get('settings', key);
      return rec ? rec.value : null;
    }
    try {
      const db = await openDB();
      const tx = db.transaction('settings', 'readonly');
      const rec = await idbRequest(tx.objectStore('settings').get(key));
      return rec ? rec.value : null;
    } catch (err) {
      console.warn('[ZephrenDB] loadSettings IDB eșuat, fallback LS:', err);
      const rec = LS.get('settings', key);
      return rec ? rec.value : null;
    }
  },

  /**
   * Salvează o alertă CPE.
   * @param {string} id
   * @param {object} data
   */
  async saveCpeAlert(id, data) {
    const record = { ...data, id };
    if (!IDB_SUPPORTED) { LS.set('cpe_alerts', id, record); return; }
    try {
      const db = await openDB();
      const tx = db.transaction('cpe_alerts', 'readwrite');
      await idbRequest(tx.objectStore('cpe_alerts').put(record));
    } catch (err) {
      console.warn('[ZephrenDB] saveCpeAlert IDB eșuat, fallback LS:', err);
      LS.set('cpe_alerts', id, record);
    }
  },

  /** Returnează toate alertele CPE. */
  async listCpeAlerts() {
    if (!IDB_SUPPORTED) return LS.list('cpe_alerts');
    try {
      const db = await openDB();
      const tx = db.transaction('cpe_alerts', 'readonly');
      return await idbRequest(tx.objectStore('cpe_alerts').getAll()) ?? [];
    } catch (err) {
      console.warn('[ZephrenDB] listCpeAlerts IDB eșuat, fallback LS:', err);
      return LS.list('cpe_alerts');
    }
  },

  /**
   * Șterge toate datele din toate store-urile.
   * ATENȚIE: operație distructivă ireversibilă.
   */
  async clear() {
    if (!IDB_SUPPORTED) {
      Object.keys(STORES).forEach((store) => LS.clearStore(store));
      return;
    }
    try {
      const db = await openDB();
      const tx = db.transaction(Object.keys(STORES), 'readwrite');
      await Promise.all(
        Object.keys(STORES).map((store) => idbRequest(tx.objectStore(store).clear())),
      );
    } catch (err) {
      console.warn('[ZephrenDB] clear() IDB eșuat, fallback LS:', err);
      Object.keys(STORES).forEach((store) => LS.clearStore(store));
    }
  },
};
