/**
 * useProposedMeasures.js — React hooks pentru store proposed-measures.
 *
 * Pattern useSyncExternalStore (React 19 nativ) — re-render minim.
 * Componentele subscrie DOAR la slice-ul de interes prin selector.
 */

import { useSyncExternalStore, useCallback, useMemo } from "react";
import {
  subscribeProposedMeasures,
  getProposedMeasuresSnapshot,
  getMeasures,
  getMeasuresStats,
} from "./proposed-measures.js";

/**
 * Hook principal — returnează snapshot reactive al întregului state.
 * Re-render la ORICE modificare (use cu reținere).
 *
 * @returns {{ schemaVersion: number, measures: Array }}
 */
export function useProposedMeasuresState() {
  return useSyncExternalStore(
    subscribeProposedMeasures,
    getProposedMeasuresSnapshot,
    getProposedMeasuresSnapshot, // SSR — same snapshot
  );
}

/**
 * Hook filtrat — returnează doar măsurile care match filtrul.
 * Re-render DOAR când lista filtrată se schimbă (referință-egală).
 *
 * @param {Object} filter — { sourceStep, category, status }
 * @returns {Array<Measure>}
 */
export function useProposedMeasures(filter) {
  // Wrap getMeasures cu stabilitate referință (filter serializat)
  const filterKey = useMemo(
    () => filter ? JSON.stringify(filter) : "",
    [filter]
  );

  const getSnapshot = useCallback(
    () => {
      // Trigger re-evaluare bazată pe state global — getMeasures citește _state intern
      return getMeasures(filter || {});
    },
    [filterKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Stable reference cache între re-render-uri când lista nu se schimbă
  const cacheRef = { current: { sig: null, value: null } };

  const cachedSnapshot = useCallback(
    () => {
      const list = getSnapshot();
      // Signature: ids + statuses concatenat → schimbă DOAR când conținutul efectiv se schimbă
      const sig = list.map(m => `${m.id}:${m.status}:${m.auditorEdits ? "e" : ""}`).join("|");
      if (cacheRef.current.sig === sig && cacheRef.current.value) {
        return cacheRef.current.value;
      }
      cacheRef.current = { sig, value: list };
      return list;
    },
    [getSnapshot] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return useSyncExternalStore(
    subscribeProposedMeasures,
    cachedSnapshot,
    cachedSnapshot,
  );
}

/**
 * Hook statistici — pentru badge-uri count în UI.
 *
 * @returns {{ total, bySource, byCategory, byStatus }}
 */
export function useProposedMeasuresStats() {
  return useSyncExternalStore(
    subscribeProposedMeasures,
    getMeasuresStats,
    getMeasuresStats,
  );
}

/**
 * Hook count compact (per sursă/categorie/status).
 * Re-render DOAR la schimbare count (nu la conținut).
 *
 * @example
 *   const count = useProposedMeasuresCount({ sourceStep: "Step3" });
 *   // <Badge>{count}</Badge>
 */
export function useProposedMeasuresCount(filter) {
  const list = useProposedMeasures(filter);
  return list.length;
}
