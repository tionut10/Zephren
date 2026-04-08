// calc-worker.js — Web Worker pentru calcule ISO 52016 grele
// Rulează calcule intensive pe thread separat, fără a bloca UI-ul React.
// Pct. 54 — Infrastructură tehnică Zephren v3.4

import { calcMonthlyISO13790 } from '../calc/iso13790.js';
import { calcHourlyISO52016 } from '../calc/hourly.js';

/**
 * Handler principal pentru mesaje primite din thread-ul principal.
 * Mesaje suportate:
 *   { type: 'CALC_ISO13790', payload: { building, climate, opaqueElements, glazingElements, ... } }
 *   { type: 'CALC_HOURLY',   payload: { building, climate, opaqueElements, glazingElements, ... } }
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
        const {
          building,
          climate,
          opaqueElements,
          glazingElements,
          thermalBridges,
          ventilation,
          heating,
          cooling,
          lighting,
          renewables,
          options,
        } = payload;

        result = calcMonthlyISO13790(
          building,
          climate,
          opaqueElements,
          glazingElements,
          thermalBridges,
          ventilation,
          heating,
          cooling,
          lighting,
          renewables,
          options,
        );

        self.postMessage({ type: 'CALC_RESULT', calcType: 'ISO13790', result });
        break;
      }

      case 'CALC_HOURLY': {
        const {
          building,
          climate,
          opaqueElements,
          glazingElements,
          thermalBridges,
          ventilation,
          heating,
          cooling,
          options,
        } = payload;

        result = calcHourlyISO52016(
          building,
          climate,
          opaqueElements,
          glazingElements,
          thermalBridges,
          ventilation,
          heating,
          cooling,
          options,
        );

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
