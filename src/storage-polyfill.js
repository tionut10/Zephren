/**
 * Polyfill pentru window.storage — înlocuiește API-ul Claude Artifacts
 * cu localStorage pentru rulare standalone (Vite / Vercel).
 *
 * API compatibil:
 *   await window.storage.get(key)    → { key, value } | throw
 *   await window.storage.set(key, v) → { key, value }
 *   await window.storage.delete(key) → { key, deleted: true }
 *   await window.storage.list(prefix) → { keys: [...] }
 */

const STORAGE_PREFIX = "zephren_";

function prefixedKey(key) {
  return STORAGE_PREFIX + key;
}

if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      const raw = localStorage.getItem(prefixedKey(key));
      if (raw === null) {
        throw new Error(`Key not found: ${key}`);
      }
      return { key, value: raw, shared: false };
    },

    async set(key, value, shared = false) {
      try {
        const v = typeof value === "string" ? value : JSON.stringify(value);
        localStorage.setItem(prefixedKey(key), v);
        return { key, value: v, shared };
      } catch (e) {
        console.error("storage.set failed:", e);
        return null;
      }
    },

    async delete(key) {
      localStorage.removeItem(prefixedKey(key));
      return { key, deleted: true, shared: false };
    },

    async list(prefix = "", shared = false) {
      const keys = [];
      const fullPrefix = prefixedKey(prefix);
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(fullPrefix)) {
          keys.push(k.slice(STORAGE_PREFIX.length));
        }
      }
      return { keys, prefix, shared };
    },
  };
}
