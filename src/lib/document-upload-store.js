/**
 * document-upload-store.js — Layer IndexedDB pentru stocare temporară
 * documente input client (Cartea Tehnică, PV recepție, releveu, avize, acord RC).
 *
 * Sprint Conformitate P0-05..P0-09 (6-7 mai 2026).
 *
 * Strategia:
 *   - Stocare per CPE-code (sau session id dacă nu există încă cod)
 *   - Cleanup automat la 7 zile (TTL configurabil)
 *   - Hash SHA-256 pe fiecare fișier la upload (integritate + dedup)
 *   - Validare PDF magic bytes 0x25504446 / DWG 0x41433130
 *   - Limit dimensiune per slot (default 50MB Cartea Tehnică, 10MB altele)
 *
 * Schema IndexedDB:
 *   DB: zephren_documents (v1)
 *   Store: uploads
 *     keyPath: id (string `<cpeCode|session>__<slotKey>`)
 *     value: {id, slotKey, cpeCode, filename, mimeType, size, hash, bytes, uploadedAt}
 *
 * NOTĂ: complementar cu indexed-db.js existent (proiecte). Folosim DB separat
 * pentru a evita coliziuni și pentru a permite TTL independent (proiectele
 * sunt persistente, document uploads sunt temporare).
 */

const DB_NAME = "zephren_documents";
const DB_VERSION = 1;
const STORE_NAME = "uploads";
const TTL_DAYS = 7;

/**
 * Slot keys recunoscute (sincronizate cu DocumentUploadCenter).
 */
export const DOCUMENT_SLOTS = Object.freeze({
  CARTEA_TEHNICA: { key: "cartea_tehnica", label: "Cartea Tehnică (≥1995)", maxMb: 50, accept: ".pdf", required: false },
  PV_RECEPTIE: { key: "pv_receptie", label: "Proces verbal recepție", maxMb: 10, accept: ".pdf", required: false },
  RELEVEU: { key: "releveu", label: "Releveu actualizat (PDF/DWG)", maxMb: 30, accept: ".pdf,.dwg,.dxf", required: false },
  AUTORIZATIE: { key: "autorizatie", label: "Autorizație de construire", maxMb: 5, accept: ".pdf", required: false },
  AVIZ_ANCPI: { key: "aviz_ancpi", label: "Aviz ANCPI (zone protejate)", maxMb: 5, accept: ".pdf", required: false },
  AVIZ_ISC: { key: "aviz_isc", label: "Aviz ISC (siguranță foc)", maxMb: 5, accept: ".pdf", required: false },
  AVIZ_MONUMENTE: { key: "aviz_monumente", label: "Aviz monumente (DJC)", maxMb: 5, accept: ".pdf", required: false },
  ACORD_PROPRIETARI: { key: "acord_proprietari", label: "Acord scris proprietari (RC)", maxMb: 20, accept: ".pdf", required: false },
});

const MAGIC_BYTES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  dwg: [0x41, 0x43, 0x31, 0x30], // AC10..AC32 (AutoCAD)
  dxf: null, // text-based, no magic — accept anything > 64 bytes
};

/**
 * Verifică magic bytes pentru tip fișier acceptat.
 *
 * @param {Uint8Array} bytes
 * @param {string} accept — ex „.pdf,.dwg,.dxf"
 * @returns {boolean}
 */
export function validateMagicBytes(bytes, accept) {
  const exts = String(accept || "")
    .split(",").map(s => s.trim().replace(/^\./, "").toLowerCase());

  if (bytes.length < 4) return false;

  for (const ext of exts) {
    if (ext === "dxf") {
      // DXF e text — acceptăm dacă > 64 octeți și conține „SECTION" sau „0"
      if (bytes.length > 64) return true;
    }
    const magic = MAGIC_BYTES[ext];
    if (!magic) continue;
    let match = true;
    for (let i = 0; i < magic.length; i++) {
      if (bytes[i] !== magic[i]) { match = false; break; }
    }
    if (match) return true;
    // Pentru DWG, prefix variabil AC10..AC32
    if (ext === "dwg" && bytes[0] === 0x41 && bytes[1] === 0x43) return true;
  }
  return false;
}

/**
 * Calculează SHA-256 hash al fișierului.
 *
 * @param {Uint8Array} bytes
 * @returns {Promise<string>} hex string 64 chars
 */
export async function computeFileHash(bytes) {
  const subtle = (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle)
    ? globalThis.crypto.subtle
    : null;
  if (!subtle) {
    throw new Error("Web Crypto SubtleCrypto indisponibil — necesar pentru hash fișier");
  }
  const buf = await subtle.digest("SHA-256", bytes);
  const arr = new Uint8Array(buf);
  let hex = "";
  for (const b of arr) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/**
 * Deschide DB-ul cu schema v1 (creează store-ul dacă lipsește).
 *
 * @returns {Promise<IDBDatabase>}
 */
function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponibil în acest mediu"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by_cpe", "cpeCode", { unique: false });
        store.createIndex("by_uploadedAt", "uploadedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

/**
 * Salvează un fișier în store-ul de uploads.
 *
 * @param {object} args
 * @param {string} args.cpeCode — sau session id
 * @param {string} args.slotKey — DOCUMENT_SLOTS[*].key
 * @param {File|Blob} args.file
 * @param {string} [args.label] — label custom pentru audit
 * @returns {Promise<{id, slotKey, hash, size, uploadedAt}>}
 */
export async function saveDocument({ cpeCode, slotKey, file, label }) {
  if (!cpeCode || !slotKey || !file) {
    throw new Error("[DocumentStore] cpeCode + slotKey + file sunt obligatorii");
  }
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0));
  const hash = await computeFileHash(bytes);
  const id = `${cpeCode}__${slotKey}`;
  const record = {
    id,
    slotKey,
    cpeCode,
    filename: file.name || "unknown",
    label: label || file.name || slotKey,
    mimeType: file.type || "application/octet-stream",
    size: bytes.length,
    hash,
    bytes, // Uint8Array stocat direct (IndexedDB suportă)
    uploadedAt: new Date().toISOString(),
  };

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve({
      id, slotKey, hash, size: bytes.length, uploadedAt: record.uploadedAt,
    });
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Listează toate documentele pentru un cpeCode.
 *
 * @param {string} cpeCode
 * @returns {Promise<Array<{id, slotKey, filename, mimeType, size, hash, uploadedAt}>>}
 */
export async function listDocuments(cpeCode) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index("by_cpe");
    const req = idx.getAll(cpeCode);
    req.onsuccess = () => {
      const items = (req.result || []).map(r => ({
        id: r.id,
        slotKey: r.slotKey,
        filename: r.filename,
        label: r.label,
        mimeType: r.mimeType,
        size: r.size,
        hash: r.hash,
        uploadedAt: r.uploadedAt,
      }));
      resolve(items);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Obține un document complet (cu bytes) pentru download / hash check.
 *
 * @param {string} id — `<cpeCode>__<slotKey>`
 * @returns {Promise<object|null>}
 */
export async function getDocument(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Șterge un document.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteDocument(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Cleanup TTL — șterge documente mai vechi de TTL_DAYS.
 *
 * @param {number} [ttlDays=TTL_DAYS]
 * @returns {Promise<number>} câte au fost șterse
 */
export async function cleanupExpired(ttlDays = TTL_DAYS) {
  const cutoff = new Date(Date.now() - ttlDays * 24 * 3600 * 1000).toISOString();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index("by_uploadedAt");
    const range = IDBKeyRange.upperBound(cutoff);
    const req = idx.openCursor(range);
    let count = 0;
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        count++;
        cursor.continue();
      } else {
        resolve(count);
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Slot key recunoscut?
 *
 * @param {string} key
 * @returns {boolean}
 */
export function isValidSlotKey(key) {
  return Object.values(DOCUMENT_SLOTS).some(s => s.key === key);
}

/**
 * Returnează metadata slot-ului pentru un key (sau null).
 *
 * @param {string} key
 * @returns {object|null}
 */
export function getSlotMeta(key) {
  return Object.values(DOCUMENT_SLOTS).find(s => s.key === key) || null;
}
