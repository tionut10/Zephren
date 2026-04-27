/**
 * MDLPATransitionBanner.jsx — Sprint v6.2 (27 apr 2026)
 *
 * Banner informativ privind tranziția legislativă între Ordinul MDLPA 2237/2010
 * și Ordinul MDLPA 348/2026 (MO 292/14.IV.2026).
 *
 *  Art. 7 din Ord. 348/2026: „La data intrării în vigoare a prezentului ordin,
 *    Ordinul ministrului dezvoltării regionale și turismului nr. 2.237/2010
 *    [...], cu modificările și completările ulterioare, se abrogă, cu excepția
 *    prevederilor art. 11, care se abrogă în termen de 180 de zile de la data
 *    intrării în vigoare a prezentului ordin."
 *
 *  Calendar:
 *    • 14.IV.2026 — Ord. 348/2026 publicat și intră în vigoare (cu excepția Art. 10/11)
 *    • 11.X.2026  — Abrogare completă Ord. 2237/2010 (180 zile calendaristice)
 *    • 8.VII.2026 — Operaționalizare portal electronic MDLPA (60 zile lucrătoare)
 *
 *  Auditorii cu atestate emise pe Ord. 2237/2010 își continuă activitatea
 *  conform vechiului regulament până la expirarea naturală a dreptului de
 *  practică (5 ani de la emitere). La prelungire, atestatul nou se emite
 *  conform noului regulament 348/2026.
 *
 * Banner este afișat global în header-ul app pe toată durata tranziției.
 * Utilizatorul poate ascunde banner-ul (persistă în localStorage).
 */

import { useEffect, useState } from "react";
import {
  ORD_2237_REPEAL_DATE,
  isInTransitionWindow,
} from "../calc/auditor-attestation-validity.js";

const LS_DISMISS_KEY = "zephren_mdlpa_transition_banner_dismissed";

function daysUntil(target, now = new Date()) {
  return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 86_400_000));
}

/**
 * MDLPATransitionBanner
 *
 * @param {object} props
 * @param {string} [props.lang="RO"]
 * @param {string} [props.className=""]
 */
export default function MDLPATransitionBanner({ lang = "RO", className = "" }) {
  const [dismissed, setDismissed] = useState(false);
  const [now] = useState(() => new Date());

  // Hidratare client-only pentru localStorage (evită SSR mismatch)
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        if (window.localStorage.getItem(LS_DISMISS_KEY) === "1") {
          setDismissed(true);
        }
      }
    } catch { /* localStorage indisponibil */ }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(LS_DISMISS_KEY, "1");
      }
    } catch { /* noop */ }
  };

  // Nu afișăm banner-ul dacă suntem în afara ferestrei de tranziție
  if (!isInTransitionWindow(now)) return null;
  if (dismissed) return null;

  const daysLeft = daysUntil(ORD_2237_REPEAL_DATE, now);
  const expiryStr = ORD_2237_REPEAL_DATE.toLocaleDateString("ro-RO", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <div
      role="region"
      aria-label={lang === "EN" ? "MDLPA legal transition notice" : "Notă tranziție legală MDLPA"}
      className={`relative w-full bg-gradient-to-r from-blue-500/10 via-amber-500/10 to-blue-500/10 border-b border-amber-500/30 px-4 py-2 text-[11px] ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <span className="text-base mt-0.5" aria-hidden="true">⚖</span>
        <div className="flex-1 leading-relaxed">
          {lang === "EN" ? (
            <>
              <strong className="text-amber-300">MDLPA legal transition</strong>{" "}
              — Order 2237/2010 remains in force for attestations issued before
              14.IV.2026 until <strong>{expiryStr}</strong> ({daysLeft} days remaining).
              From {expiryStr}, only the new Order MDLPA 348/2026 applies.
              Existing AE attestations stay valid until natural expiry of the practice
              right (5 years). Renewals issue under the new regulation.
            </>
          ) : (
            <>
              <strong className="text-amber-300">Tranziție legală MDLPA</strong>{" "}
              — Ordinul 2237/2010 rămâne valabil pentru atestatele emise înainte
              de 14.IV.2026 până la <strong>{expiryStr}</strong> ({daysLeft} zile rămase).
              Din {expiryStr}, se aplică exclusiv Ordinul MDLPA 348/2026.
              Atestatele AE existente rămân valabile până la expirarea naturală
              a dreptului de practică (5 ani). Prelungirile se emit conform noului
              regulament. (Art. 7 Ord. 348/2026)
            </>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={lang === "EN" ? "Dismiss notice" : "Închide notificarea"}
          className="text-base opacity-50 hover:opacity-100 transition-opacity px-2 leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
