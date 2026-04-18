// calc-worker.js — Web Worker pentru calcule ISO 52016 grele
// Rulează calcule intensive pe thread separat, fără a bloca UI-ul React.
// Pct. 54 — Infrastructură tehnică Zephren v3.4
//
// Sprint 13 (18 apr 2026): FIX semnătură — atât calcMonthlyISO13790 cât și calcHourlyISO52016
// acceptă un obiect `params` unic (nu 11/9 args poziționale cum se apela înainte).
// Payload-ul Worker-ului trebuie să respecte contractul funcției țintă:
//   CALC_ISO13790 → { G_env, V, Au, climate, theta_int, glazingElements, hrEta, category,
//                     n50, structure, shadingFactor, windExposure, n_vent }
//   CALC_HOURLY   → { T_ext[8760], Au, H_tr, H_ve, C_m, theta_int_set_h, theta_int_set_c,
//                     Q_int[8760], Q_sol[8760], Am? }

import { calcMonthlyISO13790 } from '../calc/iso13790.js';
import { calcHourlyISO52016 } from '../calc/hourly.js';

/**
 * Handler principal pentru mesaje primite din thread-ul principal.
 * Mesaje suportate:
 *   { type: 'CALC_ISO13790', payload: <obiect params ISO 13790> }
 *   { type: 'CALC_HOURLY',   payload: <obiect params ISO 52016-1> }
 */
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data ?? {};

  if (!type || !payload) {
    self.postMessage({
      type: 'CALC_ERROR',
      error: 'Mesaj invalid: lipsesc câmpurile type sau payload.',
    });
    return;
  }

  try {
    let result;

    switch (type) {
      case 'CALC_ISO13790': {
        // Sprint 13: apel cu obiect unic (semnătura corectă a calcMonthlyISO13790)
        result = calcMonthlyISO13790(payload);
        self.postMessage({ type: 'CALC_RESULT', calcType: 'ISO13790', result });
        break;
      }

      case 'CALC_HOURLY': {
        // Sprint 13: apel cu obiect unic (semnătura corectă a calcHourlyISO52016)
        result = calcHourlyISO52016(payload);
        self.postMessage({ type: 'CALC_RESULT', calcType: 'ISO52016', result });
        break;
      }

      default:
        self.postMessage({
          type: 'CALC_ERROR',
          error: `Tip de calcul necunoscut: "${type}". Tipuri suportate: CALC_ISO13790, CALC_HOURLY.`,
        });
    }
  } catch (err) {
    self.postMessage({
      type: 'CALC_ERROR',
      calcType: type,
      error: err?.message ?? String(err),
      stack: err?.stack ?? null,
    });
  }
});
