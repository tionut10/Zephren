/**
 * useRecentProjects — Sprint Smart Input 2026 (1.5)
 *
 * Hook async care citește lista de proiecte salvate în ZephrenDB (IndexedDB,
 * fallback localStorage) și returnează top N proiecte sortate descrescător
 * după `_backupTimestamp` (de la `useAutoBackup`).
 *
 * De ce contează: auditorul face 30 CPE/lună, multe pe același tip de bloc.
 * Cardul „Continuă din proiect recent" elimină 80% din munca repetitivă.
 *
 * API:
 *   const { projects, loading, error, refresh } = useRecentProjects({
 *     limit: 3,
 *     excludeId: currentProjectId,
 *   });
 *
 * Fiecare project în array conține:
 *   {
 *     id: string,
 *     building: object,          // pentru summary
 *     auditor: object,
 *     savedAt: ISO timestamp,
 *     summary: {
 *       title: string,           // adresa sau cod CPE
 *       categoryLabel: string,   // ex: "Rezidențial colectiv"
 *       fieldsCount: number,     // câmpuri Step 1 completate
 *     },
 *     raw: object,               // datele complete pentru a fi pasate la importProject
 *   }
 */

import { useState, useEffect, useCallback } from "react";
import { ZephrenDB } from "../lib/indexed-db.js";

const TRACKED_FIELDS = [
  "category", "yearBuilt", "areaUseful", "locality",
  "city", "county", "structure", "floors", "volume", "areaEnvelope",
  "heightFloor", "scopCpe", "apartmentNo", "nApartments",
  "cadastralNumber", "landBook", "address",
];

function countFilledFields(building) {
  if (!building || typeof building !== "object") return 0;
  let n = 0;
  for (const f of TRACKED_FIELDS) {
    const v = building[f];
    if (v != null && String(v).trim() !== "") n++;
  }
  return n;
}

// Mapă minimă RO pentru afișaj rapid în card. Pentru lista completă, vezi
// `src/data/building-catalog.js`. Aici doar top 8 categorii uzuale RO.
const CATEGORY_LABELS_SHORT = {
  RI: "Rezidențial individual",
  RC: "Rezidențial colectiv",
  RA: "Apartament",
  BI: "Birouri",
  AD: "Administrativ",
  SC: "Școală",
  GR: "Grădiniță",
  SPA_H: "Spital",
  HC: "Hotel",
  CO: "Comerț",
  REST: "Restaurant",
  SP: "Sport",
  AL: "Industrial / alt",
};

function summarizeProject(project) {
  const building = project.building || {};
  const auditor = project.auditor || {};

  // Title preferință: adresă > cod CPE > id
  let title = (building.address || "").trim();
  if (!title && building.city) title = building.city;
  if (!title && auditor.cpeCode) title = auditor.cpeCode;
  if (!title) title = project.id?.slice(-8) || "Proiect fără titlu";

  const categoryLabel = CATEGORY_LABELS_SHORT[building.category] || building.category || "—";
  const fieldsCount = countFilledFields(building);

  return { title, categoryLabel, fieldsCount };
}

function formatRelativeShort(isoString) {
  if (!isoString) return "—";
  try {
    const then = new Date(isoString).getTime();
    if (!Number.isFinite(then)) return "—";
    const diffMs = Date.now() - then;
    const mins = Math.round(diffMs / 60_000);
    if (mins < 1) return "acum";
    if (mins < 60) return `${mins}min`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}z`;
    const months = Math.round(days / 30);
    return `${months}lu`;
  } catch {
    return "—";
  }
}

export function useRecentProjects({ limit = 3, excludeId = null } = {}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0); // pentru refresh

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        await ZephrenDB.init();
        const raw = await ZephrenDB.listProjects();
        if (cancelled) return;

        const enriched = (raw || [])
          .filter(p => p && typeof p === "object")
          .filter(p => !excludeId || p.id !== excludeId)
          .map(p => {
            const savedAt = p._backupTimestamp || p.updated_at || null;
            const summary = summarizeProject(p);
            return {
              id: p.id,
              building: p.building || {},
              auditor: p.auditor || {},
              savedAt,
              savedAtShort: formatRelativeShort(savedAt),
              summary,
              raw: p,
            };
          })
          // Filtrăm proiectele cu prea puține date (sub 3 câmpuri = goale)
          .filter(p => p.summary.fieldsCount >= 3)
          // Sortare DESC după savedAt
          .sort((a, b) => {
            const ta = a.savedAt ? new Date(a.savedAt).getTime() : 0;
            const tb = b.savedAt ? new Date(b.savedAt).getTime() : 0;
            return tb - ta;
          })
          .slice(0, limit);

        setProjects(enriched);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || String(err));
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [limit, excludeId, tick]);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  return { projects, loading, error, refresh };
}

export { summarizeProject, countFilledFields, formatRelativeShort, CATEGORY_LABELS_SHORT };
