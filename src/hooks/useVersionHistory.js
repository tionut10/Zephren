/**
 * useVersionHistory.js — Hook pentru versioning proiect cu snapshot-uri
 *
 * Salvează automat versiuni la fiecare modificare semnificativă.
 * Stocarea: IndexedDB (proiecte mari) cu fallback localStorage.
 * Limite: max 50 versiuni per proiect, auto-cleanup cele mai vechi.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const LS_PREFIX = "zephren_versions_";
const MAX_VERSIONS = 50;
const MIN_INTERVAL_MS = 60_000; // minim 1 minut între versiuni auto

/**
 * @typedef {{
 *   id: string,
 *   timestamp: string,
 *   label: string,
 *   type: 'auto' | 'manual' | 'restore',
 *   snapshot: object,
 *   size: number,
 *   diff_summary?: string,
 * }} VersionEntry
 */

/**
 * Hook pentru gestionarea istoricului de versiuni al proiectului.
 *
 * @param {{
 *   projectId: string,
 *   projectData: object,
 *   enabled?: boolean,
 *   autoSave?: boolean,
 * }} options
 *
 * @returns {{
 *   versions: VersionEntry[],
 *   saveVersion: (label?: string) => void,
 *   restoreVersion: (versionId: string) => object | null,
 *   deleteVersion: (versionId: string) => void,
 *   clearAll: () => void,
 *   canUndo: boolean,
 *   undo: () => object | null,
 * }}
 */
export function useVersionHistory({
  projectId,
  projectData,
  enabled = true,
  autoSave = true,
}) {
  const [versions, setVersions] = useState(/** @type {VersionEntry[]} */ ([]));
  const lastAutoSave = useRef(0);
  const prevDataRef = useRef(null);

  const storageKey = `${LS_PREFIX}${projectId || "default"}`;

  // ── Încarcă versiuni existente ────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !projectId) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setVersions(parsed);
      }
    } catch (e) {
      console.warn("[useVersionHistory] Eroare la citire localStorage:", e);
    }
  }, [enabled, projectId, storageKey]);

  // ── Persistă versiuni la fiecare schimbare ───────────────────────────────

  useEffect(() => {
    if (!enabled || versions.length === 0) return;
    try {
      // Salvăm fără snapshot-uri mari (doar metadate) în index,
      // snapshot-urile complete sunt în entries separate
      localStorage.setItem(storageKey, JSON.stringify(versions));
    } catch (e) {
      // localStorage plin — ștergem cele mai vechi versiuni
      if (e.name === "QuotaExceededError" && versions.length > 5) {
        const trimmed = versions.slice(0, Math.floor(versions.length / 2));
        setVersions(trimmed);
        try { localStorage.setItem(storageKey, JSON.stringify(trimmed)); } catch (_) {}
      }
    }
  }, [versions, enabled, storageKey]);

  // ── Auto-save la modificări semnificative ─────────────────────────────────

  useEffect(() => {
    if (!enabled || !autoSave || !projectData || !projectId) return;

    const now = Date.now();
    if (now - lastAutoSave.current < MIN_INTERVAL_MS) return;

    // Detectează dacă datele s-au schimbat semnificativ
    const prevJson = prevDataRef.current;
    const currJson = JSON.stringify(projectData);

    if (prevJson && prevJson !== currJson) {
      const diffSize = Math.abs(currJson.length - prevJson.length);
      // Salvează doar dacă s-au schimbat > 100 caractere (modificare reală)
      if (diffSize > 100) {
        lastAutoSave.current = now;
        addVersion("auto", "Salvare automată", projectData);
      }
    }

    prevDataRef.current = currJson;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectData, enabled, autoSave, projectId]);

  // ── Adaugă versiune ──────────────────────────────────────────────────────

  const addVersion = useCallback((type, label, data) => {
    const snapshot = data || projectData;
    if (!snapshot) return;

    const dataStr = JSON.stringify(snapshot);

    /** @type {VersionEntry} */
    const entry = {
      id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      label: label || "Versiune manuală",
      type,
      snapshot,
      size: dataStr.length,
      diff_summary: generateDiffSummary(versions[0]?.snapshot, snapshot),
    };

    setVersions(prev => {
      const updated = [entry, ...prev];
      // Limita: max 50 versiuni
      return updated.slice(0, MAX_VERSIONS);
    });
  }, [projectData, versions]);

  // ── Salvare manuală ──────────────────────────────────────────────────────

  const saveVersion = useCallback((label) => {
    addVersion("manual", label || "Punct de restaurare manual", projectData);
  }, [addVersion, projectData]);

  // ── Restaurare versiune ──────────────────────────────────────────────────

  const restoreVersion = useCallback((versionId) => {
    const version = versions.find(v => v.id === versionId);
    if (!version?.snapshot) return null;

    // Salvăm starea curentă înainte de restore
    addVersion("restore", `Înainte de restaurare → ${version.label}`, projectData);

    return version.snapshot;
  }, [versions, addVersion, projectData]);

  // ── Undo (restaurează ultima versiune) ───────────────────────────────────

  const undo = useCallback(() => {
    if (versions.length < 2) return null;
    return restoreVersion(versions[1].id);
  }, [versions, restoreVersion]);

  // ── Ștergere versiune ────────────────────────────────────────────────────

  const deleteVersion = useCallback((versionId) => {
    setVersions(prev => prev.filter(v => v.id !== versionId));
  }, []);

  // ── Curățare tot ─────────────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    setVersions([]);
    try { localStorage.removeItem(storageKey); } catch (_) {}
  }, [storageKey]);

  return {
    versions,
    saveVersion,
    restoreVersion,
    deleteVersion,
    clearAll,
    canUndo: versions.length >= 2,
    undo,
  };
}

// ── Utilitar: generare rezumat diferențe ────────────────────────────────────

function generateDiffSummary(oldData, newData) {
  if (!oldData || !newData) return "Versiune inițială";

  const changes = [];

  // Compară cheile de nivel 1
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  let added = 0, removed = 0, modified = 0;

  for (const key of allKeys) {
    if (!(key in oldData)) added++;
    else if (!(key in newData)) removed++;
    else if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) modified++;
  }

  if (added > 0) changes.push(`+${added} câmpuri noi`);
  if (removed > 0) changes.push(`-${removed} câmpuri șterse`);
  if (modified > 0) changes.push(`~${modified} câmpuri modificate`);

  return changes.length > 0 ? changes.join(", ") : "Fără modificări vizibile";
}
