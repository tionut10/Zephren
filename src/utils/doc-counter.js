/**
 * Counter secvențial persistent pentru numere documente (Sprint A Task 7)
 * Înlocuiește Math.random() — elimină riscul de coliziune
 *
 * Cheile localStorage sunt separate per tip document:
 * - zephren_doc_counter_AE (factură/invoice audit energetic)
 * - zephren_doc_counter_CS (contract servicii)
 * - zephren_doc_counter_FV (e-factură ANAF)
 * - zephren_doc_counter_OF (ofertă reabilitare)
 *
 * Format număr: <PREFIX>-<YEAR>-<NNN> (zero-padded la 3 cifre, 999+ fallback la 4+)
 */

/**
 * Returnează următorul număr document secvențial pentru tipul dat, anul curent.
 * Counter-ul se resetează automat la început de an.
 *
 * @param {string} prefix - Prefix document (ex: "AE", "CS", "FV", "OF")
 * @param {number} [startAt=100] - Valoare de start pentru counter (evită coliziunea cu numere istorice)
 * @returns {string} Numărul generat, ex: "AE-2026-101"
 */
export function nextDocNumber(prefix, startAt = 100) {
  const year = new Date().getFullYear();
  // S30A·A14 — în demo mode prefixăm cu DEMO- și folosim counter sesiune separat,
  // ca să nu polueze numerotarea reală a auditorului. Resetare la fiecare reload.
  const isDemo = (typeof window !== "undefined") && (window.__demoModeActive ||
    ((typeof sessionStorage !== "undefined") && sessionStorage.getItem("zephren_demo_mode") === "1"));
  if (isDemo) {
    const sessKey = `zephren_demo_counter_${prefix}`;
    let n = 1;
    try {
      const v = sessionStorage.getItem(sessKey);
      if (v) n = (parseInt(v, 10) || 0) + 1;
      sessionStorage.setItem(sessKey, String(n));
    } catch { /* ignore */ }
    const padded = String(n).padStart(3, "0");
    return `DEMO-${prefix}-${year}-${padded}`;
  }

  const key = `zephren_doc_counter_${prefix}`;

  let raw = null;
  try { raw = localStorage.getItem(key); } catch { /* SSR / private mode */ }

  let state = { year, n: startAt };
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.year === "number" && typeof parsed.n === "number") {
        // Reset automat la început de an
        state = parsed.year === year
          ? { year, n: parsed.n + 1 }
          : { year, n: startAt };
      }
    } catch { /* malformed → reset */ }
  }

  try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* ignore */ }

  const padded = String(state.n).padStart(3, "0");
  return `${prefix}-${year}-${padded}`;
}

/**
 * Previzualizează următorul număr FĂRĂ a incrementa counter-ul.
 * Util pentru afișare UI înainte de confirmare.
 */
export function peekNextDocNumber(prefix, startAt = 100) {
  const year = new Date().getFullYear();
  const key = `zephren_doc_counter_${prefix}`;

  let raw = null;
  try { raw = localStorage.getItem(key); } catch { /* ignore */ }

  if (!raw) return `${prefix}-${year}-${String(startAt).padStart(3, "0")}`;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.year === year) {
      return `${prefix}-${year}-${String(parsed.n + 1).padStart(3, "0")}`;
    }
  } catch { /* ignore */ }

  return `${prefix}-${year}-${String(startAt).padStart(3, "0")}`;
}
