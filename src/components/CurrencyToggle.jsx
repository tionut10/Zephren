/**
 * CurrencyToggle.jsx — Sprint Îmbunătățiri #3 (9 mai 2026)
 *
 * Toggle în header pentru schimbare moneda afișată: AUTO | EUR | RON.
 * State global persistat în localStorage prin currency-context.js.
 *
 * UI compact pentru a nu aglomera header-ul (segmented control 3 butoane mici).
 */

import React, { useSyncExternalStore } from "react";
import {
  getCurrencyMode,
  setCurrencyMode,
  subscribeCurrencyMode,
} from "../data/currency-context.js";
import { logPriceEvent } from "../data/price-telemetry.js";

const MODES = [
  { value: "auto", label: "Auto", title: "Afișează ambele monede unde relevant" },
  { value: "EUR",  label: "€",    title: "Toate sumele afișate în EUR" },
  { value: "RON",  label: "RON",  title: "Toate sumele afișate în RON" },
];

/**
 * Hook React pentru consumarea modului curent (re-render automat la change).
 */
export function useCurrencyMode() {
  return useSyncExternalStore(subscribeCurrencyMode, getCurrencyMode, getCurrencyMode);
}

/**
 * Toggle 3 butoane segmented (compact, ~80px lățime).
 */
export default function CurrencyToggle({ className = "" }) {
  const mode = useCurrencyMode();

  return (
    <div className={`inline-flex items-center rounded-lg border border-white/10 bg-white/[0.03] p-0.5 ${className}`}
      title="Moneda afișată în interfață și PDF-uri">
      {MODES.map(m => {
        const active = mode === m.value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => {
              if (mode !== m.value) {
                setCurrencyMode(m.value);
                logPriceEvent("currency.changed", { mode: m.value, prev: mode });
              }
            }}
            title={m.title}
            className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
              active
                ? "bg-amber-500/30 text-amber-200 shadow-sm"
                : "text-white/45 hover:text-white/75"
            }`}>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
