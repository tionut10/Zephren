// useAutoBackup.js — Hook backup automat la modificări
// Pct. 63 — Infrastructură tehnică Zephren v3.4
//
// Debounce 30s după ultima modificare a proiectului.
// Cloud (Supabase) dacă utilizatorul este autentificat, altfel IndexedDB local.

import { useState, useEffect, useRef, useCallback } from 'react';
import { ZephrenDB } from '../lib/indexed-db.js';

const DEBOUNCE_MS = 30_000; // 30 secunde

/**
 * @typedef {'idle' | 'pending' | 'saving' | 'saved' | 'error'} BackupStatus
 */

/**
 * Hook pentru backup automat al datelor proiectului.
 *
 * @param {{
 *   projectData: object,        — datele proiectului (triggează backup la schimbare)
 *   cloud?: {
 *     isLoggedIn: boolean,      — dacă utilizatorul este autentificat în cloud
 *     supabase?: object,        — instanța Supabase client (@supabase/supabase-js)
 *     userId?: string,
 *     tableName?: string,       — tabelul Supabase (default: 'projects')
 *   },
 *   enabled?: boolean,          — activează/dezactivează backup-ul automat
 *   projectId?: string,         — ID proiect pentru stocare; generat automat dacă lipsește
 * }} options
 *
 * @returns {{
 *   lastBackup: Date | null,
 *   backupStatus: BackupStatus,
 *   backupLocation: 'cloud' | 'local' | null,
 *   forceBackup: () => Promise<void>,
 *   error: string | null,
 * }}
 */
export function useAutoBackup({
  projectData,
  cloud = {},
  enabled = true,
  projectId,
}) {
  const [lastBackup, setLastBackup]       = useState(/** @type {Date | null} */ (null));
  const [backupStatus, setBackupStatus]   = useState(/** @type {BackupStatus} */ ('idle'));
  const [backupLocation, setBackupLocation] = useState(/** @type {'cloud'|'local'|null} */ (null));
  const [error, setError]                 = useState(/** @type {string | null} */ (null));

  const debounceTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const isFirstRender    = useRef(true);

  // Generează un ID stabil dacă nu e furnizat
  const effectiveProjectId = useRef(
    projectId ?? `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  );

  // ── Funcția principală de backup ──────────────────────────────────────────

  const performBackup = useCallback(
    async (data) => {
      if (!data) return;

      setBackupStatus('saving');
      setError(null);

      const id     = effectiveProjectId.current;
      const { isLoggedIn, supabase, userId, tableName = 'projects' } = cloud;

      try {
        if (isLoggedIn && supabase) {
          // ── Backup cloud (Supabase) ──────────────────────────────────────
          const payload = {
            id,
            user_id: userId,
            data: JSON.stringify(data),
            updated_at: new Date().toISOString(),
          };

          const { error: sbError } = await supabase
            .from(tableName)
            .upsert(payload, { onConflict: 'id' });

          if (sbError) throw new Error(sbError.message ?? 'Eroare Supabase.');

          setBackupLocation('cloud');
        } else {
          // ── Backup local (IndexedDB) ─────────────────────────────────────
          await ZephrenDB.init();
          await ZephrenDB.saveProject(id, {
            ...data,
            _backupTimestamp: new Date().toISOString(),
          });
          setBackupLocation('local');
        }

        setLastBackup(new Date());
        setBackupStatus('saved');

        // Revino la 'idle' după 3s pentru a nu afișa "salvat" permanent
        setTimeout(() => setBackupStatus('idle'), 3_000);
      } catch (err) {
        const msg = err?.message ?? String(err);
        console.error('[useAutoBackup] Backup eșuat:', msg);
        setError(msg);
        setBackupStatus('error');

        // Fallback la IndexedDB dacă cloud-ul a eșuat
        if (cloud.isLoggedIn) {
          try {
            await ZephrenDB.init();
            await ZephrenDB.saveProject(id, {
              ...data,
              _backupTimestamp: new Date().toISOString(),
              _backupFallback: true,
            });
            setBackupLocation('local');
            setLastBackup(new Date());
            setBackupStatus('saved');
            setTimeout(() => setBackupStatus('idle'), 3_000);
          } catch (fallbackErr) {
            console.error('[useAutoBackup] Fallback IndexedDB eșuat:', fallbackErr?.message);
          }
        }
      }
    },
    [cloud],
  );

  // ── Debounce la modificări ─────────────────────────────────────────────────

  useEffect(() => {
    // Sărește primul render — datele nu s-au modificat
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!enabled || !projectData) return;

    // Anulează timer-ul anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setBackupStatus('pending');

    debounceTimerRef.current = setTimeout(() => {
      performBackup(projectData);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectData, enabled]);

  // Curăță timer la unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // ── Backup forțat (apelabil manual) ───────────────────────────────────────

  const forceBackup = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await performBackup(projectData);
  }, [performBackup, projectData]);

  return {
    lastBackup,
    backupStatus,
    backupLocation,
    forceBackup,
    error,
  };
}
