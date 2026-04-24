/**
 * EnvelopeHealthCheck.jsx — verificări automate pe anvelopă:
 *   1. Coerență geometrică (Σ arii opace+vitrate vs perimetru × H × N etaje)
 *   2. Detectare punți termice lipsă (PE fără soclu/streașină/colț)
 *   3. Avertizare elemente cu U peste U'max nZEB
 *
 * Afișează un banner colorat (ok/warn/fail) cu lista problemelor detectate,
 * expandabil pentru detalii. Folosit în SmartEnvelopeHub sub ElementsList.
 */

import { useState, useMemo } from "react";
import { cn } from "../ui.jsx";

// ── Catalog indicii de punți termice esențiale per tipologie ─────────────────
const ESSENTIAL_BRIDGES = {
  PE: [
    { keywords: ["soclu", "fundație", "fundatie"], label: "Punte termică soclu / fundație", ref: "SR EN ISO 14683 §E.5" },
    { keywords: ["streașină", "streasina", "atic", "cornișă", "cornisa", "coamă", "coama"], label: "Punte termică acoperiș (streașină/atic/coamă)", ref: "SR EN ISO 14683 §E.3" },
    { keywords: ["colț", "colt", "corner"], label: "Colț exterior / interior", ref: "SR EN ISO 14683 §E.1" },
    { keywords: ["intermediar", "planșeu intermediar", "planseu intermediar"], label: "Planșeu intermediar (beton BA penetrant)", ref: "SR EN ISO 14683 §E.2" },
  ],
  PT: [
    { keywords: ["atic", "parapet", "streașină", "streasina"], label: "Atic / parapet terasă", ref: "SR EN ISO 14683 §E.3" },
  ],
  PL: [
    { keywords: ["soclu", "fundație", "fundatie", "radier"], label: "Punte soclu placă pe sol", ref: "SR EN ISO 14683 §E.5" },
  ],
  WINDOW: [
    { keywords: ["glaf", "pervaz", "sub fereastră", "prag"], label: "Glaf / pervaz / prag (integrare vitraj-perete)", ref: "SR EN ISO 14683 §E.4" },
  ],
};

/**
 * Calculează verificările asupra anvelopei.
 * @returns {{ geometry: {...}, missingBridges: [...], failingElements: [...], overallStatus }}
 */
export function runEnvelopeHealthCheck({ building, opaqueElements, glazingElements, thermalBridges, calcOpaqueR, ELEMENT_TYPES, getURefNZEB, U_REF_GLAZING }) {
  // ── 1. Coerență geometrică ──────────────────────────────────────
  const perimeter = parseFloat(building?.perimeter) || 0;
  const height = parseFloat(building?.height) || 2.8;
  const nFloors = parseFloat(building?.nFloors) || 1;
  const nUnderground = parseFloat(building?.nUnderground) || 0;
  const expectedWallArea = perimeter * height * (nFloors + nUnderground);

  const peArea = opaqueElements
    .filter(el => ["PE", "PR", "PS"].includes(el.type))
    .reduce((s, el) => s + (parseFloat(el.area) || 0), 0);
  const glazingArea = glazingElements.reduce((s, el) => s + (parseFloat(el.area) || 0), 0);
  const totalEnvelopeArea = peArea + glazingArea;

  const geometryIssues = [];
  if (expectedWallArea > 0 && totalEnvelopeArea > 0) {
    const ratio = totalEnvelopeArea / expectedWallArea;
    if (ratio < 0.7) {
      geometryIssues.push({
        severity: "warn",
        msg: `Suma ariilor verticale (${totalEnvelopeArea.toFixed(0)} m²) este mai mică decât perimetru×H×N etaje (${expectedWallArea.toFixed(0)} m²). Lipsește ${((1 - ratio) * 100).toFixed(0)}% din fațade?`,
      });
    } else if (ratio > 1.3) {
      geometryIssues.push({
        severity: "warn",
        msg: `Suma ariilor verticale (${totalEnvelopeArea.toFixed(0)} m²) depășește perimetru×H×N etaje (${expectedWallArea.toFixed(0)} m²) cu ${((ratio - 1) * 100).toFixed(0)}%. Dubluri sau gresit repartizate?`,
      });
    }
  }

  // Verificare raport vitraje vs opac (warning dacă e >60% — posibil eroare introducere)
  if (peArea > 0 && glazingArea > 0) {
    const glazingRatio = glazingArea / (peArea + glazingArea);
    if (glazingRatio > 0.6) {
      geometryIssues.push({
        severity: "warn",
        msg: `Raport vitraje/fațadă = ${(glazingRatio * 100).toFixed(0)}% — neobișnuit peste 60%. Verifică ariile introduse.`,
      });
    }
  }

  // ── 2. Detectare punți termice lipsă ────────────────────────────
  const missingBridges = [];
  const bridgeNames = thermalBridges.map(b => (b.name || "").toLowerCase()).join(" || ");

  const hasPE = opaqueElements.some(el => el.type === "PE");
  const hasPT = opaqueElements.some(el => el.type === "PT");
  const hasPL = opaqueElements.some(el => el.type === "PL");
  const hasGlazing = glazingElements.length > 0;

  const checkCategory = (categoryKey, presentInEnvelope) => {
    if (!presentInEnvelope) return;
    const essentials = ESSENTIAL_BRIDGES[categoryKey] || [];
    essentials.forEach(ess => {
      const found = ess.keywords.some(kw => bridgeNames.includes(kw.toLowerCase()));
      if (!found) {
        missingBridges.push({ ...ess, categoryKey });
      }
    });
  };

  checkCategory("PE", hasPE);
  checkCategory("PT", hasPT);
  checkCategory("PL", hasPL);
  checkCategory("WINDOW", hasGlazing);

  // ── 3. Elemente cu U peste U'max nZEB ───────────────────────────
  const failingElements = [];
  opaqueElements.forEach((el, idx) => {
    if (!calcOpaqueR || !getURefNZEB) return;
    const r = calcOpaqueR(el.layers, el.type) || {};
    const u = r.u || 0;
    const uRef = getURefNZEB(building?.category, el.type);
    if (u > 0 && uRef && u > uRef) {
      failingElements.push({
        idx,
        kind: "opaque",
        name: el.name || `Element ${idx + 1}`,
        u,
        uRef,
        excess: ((u / uRef - 1) * 100),
      });
    }
  });
  glazingElements.forEach((el, idx) => {
    if (!U_REF_GLAZING) return;
    const u = parseFloat(el.u) || 0;
    const uRef = ["RI", "RC", "RA"].includes(building?.category) ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres;
    if (u > 0 && u > uRef) {
      failingElements.push({
        idx,
        kind: "glazing",
        name: el.name || `Fereastră ${idx + 1}`,
        u,
        uRef,
        excess: ((u / uRef - 1) * 100),
      });
    }
  });

  // ── Status general ──────────────────────────────────────────────
  const allIssues = geometryIssues.length + missingBridges.length + failingElements.length;
  let overallStatus = "ok";
  if (failingElements.length > 0 || geometryIssues.some(g => g.severity === "fail")) overallStatus = "fail";
  else if (allIssues > 0) overallStatus = "warn";

  return { geometry: geometryIssues, missingBridges, failingElements, overallStatus, totalIssues: allIssues };
}

export default function EnvelopeHealthCheck({ building, opaqueElements, glazingElements, thermalBridges, calcOpaqueR, ELEMENT_TYPES, getURefNZEB, U_REF_GLAZING, onOpenBridgeCatalog }) {
  const [expanded, setExpanded] = useState(false);

  const result = useMemo(() =>
    runEnvelopeHealthCheck({ building, opaqueElements, glazingElements, thermalBridges, calcOpaqueR, ELEMENT_TYPES, getURefNZEB, U_REF_GLAZING }),
    [building, opaqueElements, glazingElements, thermalBridges, calcOpaqueR, ELEMENT_TYPES, getURefNZEB, U_REF_GLAZING]
  );

  // Nu afișa nimic dacă nu există elemente
  if (opaqueElements.length === 0 && glazingElements.length === 0) return null;

  const { geometry, missingBridges, failingElements, overallStatus, totalIssues } = result;

  const containerClass = cn(
    "rounded-lg border p-3 mx-4 mb-3 transition-colors",
    overallStatus === "ok"   && "bg-emerald-500/[0.06] border-emerald-500/25",
    overallStatus === "warn" && "bg-amber-500/[0.06] border-amber-500/25",
    overallStatus === "fail" && "bg-red-500/[0.06] border-red-500/30",
  );

  const icon = overallStatus === "ok" ? "✓" : overallStatus === "warn" ? "⚠" : "✗";
  const iconColor = overallStatus === "ok" ? "text-emerald-400" : overallStatus === "warn" ? "text-amber-400" : "text-red-400";
  const label = overallStatus === "ok"
    ? "Anvelopa trece verificările automate"
    : `Anvelopa are ${totalIssues} problem${totalIssues === 1 ? "ă" : "e"} detectat${totalIssues === 1 ? "ă" : "e"}`;

  return (
    <div className={containerClass}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <span className={cn("text-lg", iconColor)}>{icon}</span>
          <span className="text-sm font-semibold">Verificare sănătate anvelopă</span>
          <span className={cn("text-xs", iconColor)}>{label}</span>
        </div>
        <span className={cn("text-[10px] transition-transform opacity-60", expanded && "rotate-180")}>▾</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 text-xs">
          {/* 1. Geometry */}
          {geometry.length > 0 && (
            <div>
              <div className="font-semibold opacity-70 mb-1 flex items-center gap-1">📐 Coerență geometrică</div>
              <ul className="space-y-1 pl-4">
                {geometry.map((g, i) => (
                  <li key={i} className={cn("flex items-start gap-2", g.severity === "fail" ? "text-red-300" : "text-amber-300")}>
                    <span className="mt-0.5">⚠</span>
                    <span>{g.msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 2. Missing bridges */}
          {missingBridges.length > 0 && (
            <div>
              <div className="font-semibold opacity-70 mb-1 flex items-center gap-1 justify-between">
                <span>🔗 Punți termice lipsă ({missingBridges.length})</span>
                {onOpenBridgeCatalog && (
                  <button
                    onClick={onOpenBridgeCatalog}
                    className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30"
                  >
                    📖 Deschide catalog
                  </button>
                )}
              </div>
              <ul className="space-y-1 pl-4">
                {missingBridges.map((mb, i) => (
                  <li key={i} className="flex items-start gap-2 text-amber-300">
                    <span className="mt-0.5">⚠</span>
                    <div>
                      <div>{mb.label}</div>
                      <div className="text-[10px] opacity-60">{mb.ref}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="text-[10px] opacity-50 mt-1 pl-4">
                💡 Adaugă aceste punți — în caz contrar H_tb (pierderi punți) e subestimat cu 2-8%.
              </div>
            </div>
          )}

          {/* 3. Failing elements */}
          {failingElements.length > 0 && (
            <div>
              <div className="font-semibold opacity-70 mb-1">🔥 Elemente peste U'max nZEB ({failingElements.length})</div>
              <ul className="space-y-1 pl-4">
                {failingElements.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-red-300">
                    <span className="mt-0.5">✗</span>
                    <div className="flex-1">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-[10px] opacity-70 font-mono">
                        U={f.u.toFixed(3)} &gt; U'max={f.uRef.toFixed(3)} · depășire +{f.excess.toFixed(0)}%
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {totalIssues === 0 && (
            <div className="text-emerald-300 text-xs opacity-80">
              ✓ Coerență geometrică OK · Toate elementele respectă U'max · Punți termice esențiale prezente
            </div>
          )}
        </div>
      )}
    </div>
  );
}
