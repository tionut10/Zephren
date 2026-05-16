/**
 * SuggestionCatalogBrowser.jsx — Sprint Suggestion Queue B (16 mai 2026)
 *
 * Browser-ul de catalog sugestii pentru auditor, plasat ÎN PAS 7 (Audit).
 *
 * Filozofie B (alternativa aleasă): sugestiile NU mai apar în Pas 3+4 (acolo
 * auditorul introduce DOAR baseline-ul existent). Toate sugestiile pentru audit
 * sunt accesate prin acest browser, organizate pe 6 secțiuni accordion:
 *   - 🔥 Încălzire
 *   - 🚿 ACM
 *   - ❄️ Climatizare
 *   - 💨 Ventilare
 *   - 💡 Iluminat
 *   - ☀️ Fotovoltaic
 *
 * Fiecare secțiune este COLAPSATĂ default — auditorul deschide doar categoriile
 * relevante. Header arată badge cu "X disponibile · Y propuse".
 *
 * Click pe „📋 Propune" pe o sugestie → adăugare în store + redirect natural
 * la ProposedMeasuresPanel imediat dedesubt.
 *
 * Surse: Mc 001-2022 §10 (soluții îmbunătățire) + suggestions-catalog.js
 */

import { useState, useMemo, useCallback } from "react";
import { Card } from "./ui.jsx";
import SuggestionPanel from "./SuggestionPanel.jsx";
import { suggestHVAC, suggestACM, suggestPV, filterByCategory } from "../data/suggestions-catalog.js";
import { proposeMeasure } from "../store/proposed-measures.js";
import { useProposedMeasures } from "../store/useProposedMeasures.js";

// ─── Helper-uri tag derivation (copiate din Step3Systems pentru a fi self-contained) ──

function deriveHeatingTags(building, climate) {
  const tags = [];
  const cat = building?.category || "";
  const zone = climate?.zone;
  const isPublic = ["BCC", "BCA", "BC", "BI"].includes(cat);
  const isResSmall = ["RI", "RA"].includes(cat);
  if (isPublic) tags.push("fire-safe", "publica");
  if (isResSmall) tags.push("rezidential");
  if (zone === "I" || zone === "II") tags.push("premium");
  else tags.push("nZEB");
  return tags;
}

function deriveCoolingTags(building) {
  const cat = building?.category || "";
  const isResSmall = ["RI", "RA"].includes(cat);
  const isResMed = cat === "RC";
  if (isResSmall) return ["rezidential", "low-cost"];
  if (isResMed) return ["modular", "rezidential"];
  return ["birouri", "comercial"];
}

// ─── Categorii suportate + meta ─────────────────────────────────────────────

const CATEGORY_META = [
  { id: "heating",     icon: "🔥", labelRO: "Încălzire",      labelEN: "Heating",       category: "heating" },
  { id: "acm",         icon: "🚿", labelRO: "ACM",            labelEN: "DHW",           category: "acm" },
  { id: "cooling",     icon: "❄️", labelRO: "Climatizare",    labelEN: "Cooling",       category: "cooling" },
  { id: "ventilation", icon: "💨", labelRO: "Ventilare",      labelEN: "Ventilation",   category: "ventilation" },
  { id: "lighting",    icon: "💡", labelRO: "Iluminat",       labelEN: "Lighting",      category: "lighting" },
  { id: "pv",          icon: "☀️", labelRO: "Fotovoltaic",    labelEN: "Photovoltaic",  category: "pv" },
];

// ─── Container principal ─────────────────────────────────────────────────────

export default function SuggestionCatalogBrowser({
  building,
  selectedClimate,
  heating,
  cooling,
  ventilation,
  acm,
  photovoltaic,
  lang = "RO",
}) {
  // Default toate colapsate — auditorul deschide ce vrea
  const [openSections, setOpenSections] = useState({});

  const toggleSection = useCallback((id) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // ─── Sugestii calculate per categorie (replicat din Step3+4) ──────────────

  const heatingSuggestions = useMemo(() => {
    const peakLoad = parseFloat(heating?.power) || 0;
    const buildingArea = parseFloat(building?.areaUseful) || undefined;
    return suggestHVAC({
      functionType: "heating",
      peakLoad_kW: peakLoad > 0 ? peakLoad : undefined,
      climateZone: selectedClimate?.zone,
      buildingCategory: building?.category,
      buildingArea,
      preferredTags: deriveHeatingTags(building, selectedClimate),
      limit: 3,
    });
  }, [heating?.power, selectedClimate?.zone, building?.category, building?.areaUseful, selectedClimate, building]);

  const coolingSuggestions = useMemo(() => {
    const peakLoad = parseFloat(cooling?.power) || 0;
    const buildingArea = parseFloat(building?.areaUseful) || undefined;
    return suggestHVAC({
      functionType: "cooling",
      peakLoad_kW: peakLoad > 0 ? peakLoad : undefined,
      climateZone: selectedClimate?.zone,
      buildingCategory: building?.category,
      buildingArea,
      preferredTags: deriveCoolingTags(building),
      limit: 3,
    });
  }, [building?.category, building?.areaUseful, cooling?.power, selectedClimate?.zone, selectedClimate, building]);

  const ventilationSuggestions = useMemo(() => {
    const type = ventilation?.type || "";
    const buildingArea = parseFloat(building?.areaUseful) || 0;
    let sizeFilter;
    if (buildingArea > 0) {
      if (buildingArea < 120) sizeFilter = "small";
      else if (buildingArea < 500) sizeFilter = "medium";
      else sizeFilter = "large";
    }
    // În Pas 7 NU mai filtrăm pe baseline-ul ventilation.type (auditorul vrea tot catalogul)
    let pool = filterByCategory("ventilation");
    if (sizeFilter) {
      const sized = pool.filter(s => s.tech?.sizeTag === sizeFilter && s.tech?.recoveryEff > 0);
      pool = sized.length > 0 ? sized : pool.filter(s => s.tech?.recoveryEff > 0);
    } else {
      pool = pool.filter(s => s.tech?.recoveryEff > 0);
    }
    return pool.slice(0, 3);
  }, [ventilation?.type, building?.areaUseful]);

  const lightingSuggestions = useMemo(() => {
    const cat = building?.category || "";
    const isResidential = ["RI", "RC", "RA"].includes(cat);
    const all = filterByCategory("lighting");
    if (isResidential) return all.filter(s => s.id === "led-control-presence");
    return all;
  }, [building?.category]);

  const acmSuggestions = useMemo(() => {
    const residents = parseInt(acm?.consumers, 10) || 0;
    return suggestACM({
      residents: residents > 0 ? residents : undefined,
      preferredTags: ["nZEB", "regenerabil-partial", "casa-verde"],
      limit: 3,
    });
  }, [acm?.consumers]);

  const pvSuggestions = useMemo(() => {
    const targetKWp = parseFloat(photovoltaic?.peakPower) || undefined;
    const buildingArea = parseFloat(building?.areaUseful) || undefined;
    return suggestPV({
      targetKWp,
      buildingArea,
      preferredTags: ["nZEB", "regenerabil"],
      limit: 3,
    });
  }, [photovoltaic?.peakPower, building?.areaUseful]);

  // ─── Map categorie → sugestii ───────────────────────────────────────────────

  const suggestionsByCategory = useMemo(() => ({
    heating: heatingSuggestions,
    acm: acmSuggestions,
    cooling: coolingSuggestions,
    ventilation: ventilationSuggestions,
    lighting: lightingSuggestions,
    pv: pvSuggestions,
  }), [heatingSuggestions, acmSuggestions, coolingSuggestions, ventilationSuggestions, lightingSuggestions, pvSuggestions]);

  // ─── IDs propuse (pentru badge "✓ Propusă") ─────────────────────────────────

  const proposedMeasures = useProposedMeasures();
  const proposedIdsByCategory = useMemo(() => {
    const map = {};
    for (const m of proposedMeasures) {
      if (!m.catalogEntryId) continue;
      if (!map[m.category]) map[m.category] = new Set();
      map[m.category].add(m.catalogEntryId);
    }
    return map;
  }, [proposedMeasures]);

  // ─── Handler propunere (unified) ─────────────────────────────────────────────

  const handlePropose = useCallback((entry, meta) => {
    proposeMeasure(entry, meta);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────

  const totalSuggestions = Object.values(suggestionsByCategory).reduce(
    (sum, arr) => sum + (arr?.length || 0), 0
  );
  const totalProposed = proposedMeasures.length;

  return (
    <Card title={lang === "EN" ? "💡 Improvement suggestions catalog (Mc 001-2022 §10)" : "💡 Catalog soluții îmbunătățire (Mc 001-2022 §10)"}>
      {/* Intro + stats */}
      <div className="mb-3 text-[11px] text-white/70 leading-relaxed">
        {lang === "EN"
          ? "Browse the catalog by category and click \"📋 Propose\" on suggestions you want to include in the audit report. They will appear in the queue below."
          : `Parcurge catalogul pe categorii și apasă „📋 Propune” pe soluțiile pe care vrei să le incluzi în raportul de audit. Vor apărea în coada de mai jos.`}
      </div>

      <div className="flex items-center gap-3 flex-wrap mb-3 pb-3 border-b border-white/5 text-[11px]">
        <span className="text-white/60">
          {lang === "EN" ? "Catalog" : "Catalog"}:
        </span>
        <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-200 border border-violet-500/30 text-[10px]">
          {totalSuggestions} {lang === "EN" ? "available" : "disponibile"}
        </span>
        {totalProposed > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 text-[10px]">
            ✓ {totalProposed} {lang === "EN" ? "already proposed" : "deja propuse"}
          </span>
        )}
      </div>

      {/* Accordion per categorie */}
      <div className="space-y-2">
        {CATEGORY_META.map(cat => {
          const suggestions = suggestionsByCategory[cat.id] || [];
          const proposedIds = proposedIdsByCategory[cat.category] || new Set();
          const isOpen = !!openSections[cat.id];
          const availableCount = suggestions.length;
          const proposedCount = proposedIds.size;

          if (availableCount === 0) {
            return (
              <div
                key={cat.id}
                className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] text-white/40"
              >
                <span aria-hidden="true">{cat.icon}</span>{" "}
                <span className="font-medium">{lang === "EN" ? cat.labelEN : cat.labelRO}</span>
                <span className="ml-2 italic">
                  ({lang === "EN" ? "no suggestions for current baseline" : "fără sugestii pentru baseline-ul curent"})
                </span>
              </div>
            );
          }

          return (
            <div key={cat.id} className="rounded-lg border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection(cat.id)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] transition text-left"
                aria-expanded={isOpen}
              >
                <span className="text-base" aria-hidden="true">{cat.icon}</span>
                <span className="text-sm font-medium text-white/85 flex-1">
                  {lang === "EN" ? cat.labelEN : cat.labelRO}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-200 border border-violet-500/30">
                  {availableCount} {lang === "EN" ? "available" : "disponibile"}
                </span>
                {proposedCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
                    ✓ {proposedCount}
                  </span>
                )}
                <span className="text-white/40 text-sm" aria-hidden="true">
                  {isOpen ? "▾" : "▸"}
                </span>
              </button>

              {isOpen && (
                <div className="p-3 bg-white/[0.01]">
                  <SuggestionPanel
                    suggestions={suggestions}
                    mode="card"
                    onPropose={handlePropose}
                    proposeMeta={{ sourceStep: "manual", category: cat.category }}
                    proposedEntryIds={proposedIds}
                    lang={lang}
                    showDisclaimer={false}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
