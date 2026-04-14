// ═══════════════════════════════════════════════════════════════════════════
// useProjectHistory — hook React pentru undo/redo + versioning localStorage
// Extras din energy-calc.jsx (refactor S5.4, pct.80). Hookul se montează static
// pe EnergyCalcApp — NU este lazy (state React must be known at mount time).
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";

const MAX_UNDO_LEVELS = 20;

/**
 * Undo/redo + versioning pentru proiectul curent.
 *
 * @param {Object} opts
 * @param {() => Object} opts.getFullSnapshot - Returns entire state as a plain object
 *   (including battery, useNA2023, finAnalysisInputs — câmpuri ce nu sunt în
 *   getProjectData).
 * @param {(snapshot: Object) => void} opts.applyFullSnapshot - Applies a full snapshot
 *   back to component state (sets all fields via setters).
 * @param {() => Object} opts.getProjectData - Lightweight state getter used pentru
 *   snapshot de versiune (subset al lui getFullSnapshot — fără battery/flags).
 * @param {(data: Object) => void} opts.loadProjectData - Aplică snapshot de versiune.
 * @param {(msg: string, type?: string, duration?: number) => void} opts.showToast
 * @param {(id: string|null) => void} [opts.setExpandedVersionProjectId] - Optional:
 *   închide drawer-ul de versiuni după restore.
 */
export function useProjectHistory({
  getFullSnapshot,
  applyFullSnapshot,
  getProjectData,
  loadProjectData,
  showToast,
  setExpandedVersionProjectId,
}) {
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const pushUndo = useCallback(() => {
    const snapshot = JSON.stringify(getFullSnapshot());
    setUndoStack(prev => {
      const next = [...prev, snapshot];
      return next.length > MAX_UNDO_LEVELS ? next.slice(-MAX_UNDO_LEVELS) : next;
    });
    setRedoStack([]);
  }, [getFullSnapshot]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const current = JSON.stringify(getFullSnapshot());
    setRedoStack(prev => [...prev, current]);
    let prev;
    try { prev = JSON.parse(undoStack[undoStack.length - 1]); }
    catch { showToast("Eroare undo — date corupte", "error", 2000); return; }
    setUndoStack(s => s.slice(0, -1));
    applyFullSnapshot(prev);
    showToast("Undo aplicat", "info", 1500);
  }, [undoStack, getFullSnapshot, applyFullSnapshot, showToast]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const current = JSON.stringify(getFullSnapshot());
    setUndoStack(prev => [...prev, current]);
    let next;
    try { next = JSON.parse(redoStack[redoStack.length - 1]); }
    catch { showToast("Eroare redo — date corupte", "error", 2000); return; }
    setRedoStack(s => s.slice(0, -1));
    applyFullSnapshot(next);
    showToast("Redo aplicat", "info", 1500);
  }, [redoStack, getFullSnapshot, applyFullSnapshot, showToast]);

  const saveVersion = useCallback(async (projectId, label) => {
    if (typeof window === "undefined" || !window.storage) return;
    const data = getProjectData();
    const ts = Date.now();
    const key = "ep-ver:" + projectId + ":" + ts;
    const payload = { ...data, meta: { label: label || "Versiune " + new Date(ts).toLocaleString("ro-RO"), ts, projectId } };
    try {
      await window.storage.set(key, JSON.stringify(payload));
      const res = await window.storage.list("ep-ver:" + projectId + ":");
      if (res && res.keys && res.keys.length > 10) {
        const sorted = [...res.keys].sort();
        for (const old of sorted.slice(0, sorted.length - 10)) { await window.storage.delete(old); }
      }
    } catch (e) { /* silent */ }
  }, [getProjectData]);

  const listVersions = useCallback(async (projectId) => {
    if (typeof window === "undefined" || !window.storage) return [];
    try {
      const res = await window.storage.list("ep-ver:" + projectId + ":");
      if (!res || !res.keys) return [];
      const versions = [];
      for (const key of res.keys) {
        try {
          const r = await window.storage.get(key);
          if (r && r.value) {
            const d = JSON.parse(r.value);
            versions.push({ key, ts: d.meta?.ts || 0, label: d.meta?.label || "—", data: d });
          }
        } catch (e) { /* skip corrupt entry */ }
      }
      return versions.sort((a, b) => b.ts - a.ts);
    } catch (e) { return []; }
  }, []);

  const restoreProjectVersion = useCallback(async (versionData) => {
    loadProjectData(versionData);
    showToast("Versiune restaurată: " + (versionData.meta?.label || "—"), "success");
    if (setExpandedVersionProjectId) setExpandedVersionProjectId(null);
  }, [loadProjectData, showToast, setExpandedVersionProjectId]);

  return {
    undoStack, redoStack,
    pushUndo, undo, redo,
    saveVersion, listVersions, restoreProjectVersion,
  };
}
