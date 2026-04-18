// useCalcWorker.js — Hook React pentru calcule ISO pe Web Worker
// Pct. 54 — Infrastructură tehnică Zephren v3.4
//
// Creează worker-ul lazy (la primul apel runCalc), nu la mount.
// Fallback sincron automat dacă Worker nu este disponibil (SSR / Vitest).

import { useRef, useState, useCallback, useEffect } from 'react';
import { calcMonthlyISO13790 } from '../calc/iso13790.js';
import { calcHourlyISO52016 } from '../calc/hourly.js';

/** Detectează dacă Web Workers sunt disponibili în mediul curent. */
const WORKERS_SUPPORTED =
  typeof window !== 'undefined' && typeof Worker !== 'undefined';

/**
 * Hook pentru rularea calculelor ISO 52016 / ISO 13790 pe un Web Worker dedicat.
 *
 * @returns {{
 *   runCalc: (type: string, payload: object) => Promise<any>,
 *   isCalculating: boolean,
 *   error: string | null,
 *   terminateWorker: () => void,
 * }}
 */
export function useCalcWorker() {
  const workerRef = useRef(/** @type {Worker | null} */ (null));
  const pendingRef = useRef(/** @type {Map<string, { resolve: Function, reject: Function }>} */ (new Map()));
  const callIdRef = useRef(0);

  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  // Curăță worker-ul la unmount pentru a evita memory leaks.
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  /** Inițializează worker-ul la primul apel (lazy). */
  const getWorker = useCallback(() => {
    if (!WORKERS_SUPPORTED) return null;

    if (!workerRef.current) {
      try {
        // Vite bundlează worker-ul ca modul ES separat (worker: { format: 'es' })
        workerRef.current = new Worker(
          new URL('../workers/calc-worker.js', import.meta.url),
          { type: 'module' },
        );

        workerRef.current.addEventListener('message', (event) => {
          const { type, result, error: workerError, calcType } = event.data ?? {};

          if (type === 'CALC_RESULT') {
            // Găsim promise-ul în așteptare prin calcType sau primul disponibil
            const pending = pendingRef.current.get(calcType) ?? pendingRef.current.values().next().value;
            if (pending) {
              pendingRef.current.delete(calcType);
              if (pendingRef.current.size === 0) setIsCalculating(false);
              pending.resolve(result);
            }
          } else if (type === 'CALC_ERROR') {
            const pending = pendingRef.current.get(calcType) ?? pendingRef.current.values().next().value;
            if (pending) {
              pendingRef.current.delete(calcType);
              if (pendingRef.current.size === 0) setIsCalculating(false);
              setError(workerError ?? 'Eroare necunoscută în worker.');
              pending.reject(new Error(workerError));
            }
          }
        });

        workerRef.current.addEventListener('error', (event) => {
          const msg = event.message ?? 'Eroare fatală în Web Worker.';
          setError(msg);
          setIsCalculating(false);
          // Respinge toate promise-urile în așteptare
          pendingRef.current.forEach(({ reject }) => reject(new Error(msg)));
          pendingRef.current.clear();
          // Termină worker-ul compromis
          workerRef.current?.terminate();
          workerRef.current = null;
        });
      } catch (initErr) {
        console.warn('[useCalcWorker] Nu s-a putut inițializa Worker-ul:', initErr);
        return null;
      }
    }

    return workerRef.current;
  }, []);

  /**
   * Rulează un calcul pe worker sau sincron (fallback).
   *
   * Sprint 13 (18 apr 2026): FIX semnătură — contractul este `payload = params obiect unic`,
   * respectând exact ce acceptă calcMonthlyISO13790(params) și calcHourlyISO52016(params).
   * Anterior codul desfășura 11/9 args poziționale care produceau `null` la rulare.
   *
   * @param {'CALC_ISO13790' | 'CALC_HOURLY'} type — tipul de calcul
   * @param {object} payload — parametrii calculului (obiect pentru calcMonthlyISO13790 sau calcHourlyISO52016)
   * @returns {Promise<any>} rezultatul calculului
   */
  const runCalc = useCallback(
    async (type, payload) => {
      setError(null);

      const worker = getWorker();

      // ── Fallback sincron (SSR, Vitest, browser fără Worker support) ──
      if (!worker) {
        setIsCalculating(true);
        try {
          let result;
          if (type === 'CALC_ISO13790') {
            result = calcMonthlyISO13790(payload);
          } else if (type === 'CALC_HOURLY') {
            result = calcHourlyISO52016(payload);
          } else {
            throw new Error(`Tip necunoscut: ${type}`);
          }
          return result;
        } finally {
          setIsCalculating(false);
        }
      }

      // ── Calcul pe Worker ──
      return new Promise((resolve, reject) => {
        const calcType = type === 'CALC_ISO13790' ? 'ISO13790' : 'ISO52016';
        pendingRef.current.set(calcType, { resolve, reject });
        setIsCalculating(true);
        worker.postMessage({ type, payload });
      });
    },
    [getWorker],
  );

  /** Termină manual worker-ul (util înainte de reconfigurare). */
  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    pendingRef.current.clear();
    setIsCalculating(false);
  }, []);

  return { runCalc, isCalculating, error, terminateWorker };
}
