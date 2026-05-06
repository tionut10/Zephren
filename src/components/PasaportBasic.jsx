/**
 * PasaportBasic.jsx — v7.0 Sprint P0-A (6 mai 2026)
 *
 * Generare Pașaport Renovare EPBD 2024/1275 Art. 12 + Anexa VIII.
 * Refactor major (P0-02 + P1-05 + P1-12):
 *
 *   P0-02 — Înlocuiește schema cosmetică cu 4 secțiuni cu apelul real
 *           buildRenovationPassport({...}) → schema completă Anexa VIII (12 secțiuni)
 *           cu UUID v5 deterministic din cpeCode (cross-ref CPE↔Pașaport stabil).
 *   P1-05 — Generează plan de renovare etapizat real prin calcPhasedRehabPlan()
 *           din măsurile smartSuggestions, în locul reducerilor fixe [0,20,40,60]%.
 *   P1-12 — targetClass + targetYear dinamici din getMepsThresholdsFor(category)
 *           (EPBD Art. 9: rezidențial → milestone 2035, nerezidențial → milestone 2033).
 *
 * Watermark juridic „PREVIEW EPBD 2024 — fără valoare juridică în RO până la
 * actul național de transpunere" e aplicat:
 *   - banner UI prominent la generare (acest fișier)
 *   - header DOCX (passport-docx.js — Sprint P0-A consolidare)
 *   - header PDF (passport-export.js — Sprint P0-A consolidare)
 *
 * Pentru pașaport detaliat (LCC + multi-fază + benchmark) → RenovationPassport
 * în Step 8 (Expert+).
 *
 * EPBD 2024 art. 12 — Termen transpunere RO: 29 mai 2026.
 */

import React, { useState, useMemo } from "react";
import { Card, Badge } from "./ui.jsx";
import { canAccess } from "../lib/planGating.js";
import PlanGate from "./PlanGate.jsx";
import { buildRenovationPassport } from "../calc/renovation-passport.js";
import { calcPhasedRehabPlan } from "../calc/phased-rehab.js";
import { getMepsThresholdsFor, getMepsStatus } from "./MEPSCheck.jsx";
import { getEurRonSync } from "../data/rehab-prices.js";

/**
 * Convertor smartSuggestions[] → measures[] format așteptat de calcPhasedRehabPlan.
 * Extrage costul în EUR din string-ul „X EUR" și convertește la RON la cursul curent.
 *
 * @param {Array} smartSuggestions
 * @param {number} eurRon
 * @returns {Array<{id, name, category, system, cost_RON, ep_reduction_kWh_m2, co2_reduction, priority}>}
 */
function suggestionsToMeasures(smartSuggestions, eurRon = 5.05) {
  if (!Array.isArray(smartSuggestions)) return [];
  return smartSuggestions.map((s, i) => {
    const costEur = parseFloat(String(s.costEstimate || "0").replace(/[^0-9.]/g, "")) || 0;
    const epSav = parseFloat(s.epSaving_m2) || 0;
    return {
      id: `m_${i}_${(s.measure || "").slice(0, 8).replace(/\s+/g, "_")}`,
      name: s.measure || `Măsură ${i + 1}`,
      category: s.system || "Nespecificat",
      system: s.system || "Nespecificat",
      cost_RON: Math.round(costEur * eurRon),
      ep_reduction_kWh_m2: epSav,
      // Factor CO2 mediu energie primară RO ~0.230 kg/kWh (Mc 001-2022 Tab 5.17 mediu).
      // Aproximare conservativă pentru pașaport — valorile exacte calculate în motor.
      co2_reduction: Math.round(epSav * 0.230 * 100) / 100,
      lifespan_years: s.system === "Anvelopă" ? 30 : (s.system === "Regenerabile" ? 25 : 20),
      priority: s.priority || 3,
    };
  });
}

export default function PasaportBasic(props) {
  const { userPlan } = props;
  if (!canAccess(userPlan, "pasaportBasic")) {
    return <PlanGate feature="pasaportBasic" plan={userPlan} requiredPlan="pro" mode="upgrade" />;
  }
  return <PasaportBasicInternal {...props} />;
}

function PasaportBasicInternal({
  building,
  energyClass,
  epFinal,
  auditor,
  onGenerate,
  // Sprint P0-A — props noi pentru schema completă Anexa VIII
  cpeCode = null,
  instSummary = null,
  renewSummary = null,
  climate = null,
  smartSuggestions = null,
  financialSummary = null,
  fundingEligible = null,
  // Sprint Pas 7 docs (6 mai 2026) — centralizare butoane în Step 7.
  // noButtons=true ascunde rândul cu butoane export (JSON/XML/PDF/DOCX) +
  // bara de rezultat. Componenta rămâne PREVIEW-ONLY (banner + stare + plan
  // etapizat). Butoanele PDF + XML se mută în Card central, JSON + DOCX
  // foaie parcurs sunt eliminate (redundante: JSON=debug, DOCX≡PDF secțiunea 4).
  noButtons = false,
}) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  // Sprint P0-A P1-12 — targetClass + targetYear DINAMICI din getMepsThresholdsFor.
  // EPBD Art. 9: rezidențial (RI/RC/RA) milestone 2035 clasă E; nerezidențial 2033 clasă E.
  // Prima țintă obligatorie 2030 clasă F pentru toate categoriile.
  const mepsThresholds = useMemo(
    () => getMepsThresholdsFor(building?.category),
    [building?.category]
  );
  const mepsStatusObj = useMemo(
    () => getMepsStatus(energyClass, epFinal, building?.category),
    [energyClass, epFinal, building?.category]
  );

  // Sprint P0-A P1-05 — Plan etapizat REAL prin calcPhasedRehabPlan din smartSuggestions.
  // Buget anual implicit 50.000 RON (configurabil în viitor); strategie balanced (mix anvelopă+sisteme).
  const phasedPlan = useMemo(() => {
    const eurRon = getEurRonSync() || 5.05;
    const measures = suggestionsToMeasures(smartSuggestions, eurRon);
    if (measures.length === 0) return null;
    const Au = parseFloat(building?.areaUseful) || 100;
    const energyPriceRON = 0.45; // RON/kWh mediu ponderat (gaz+electricitate)
    return calcPhasedRehabPlan(
      measures,
      50000,                       // buget anual RON
      "balanced",                  // strategie mix
      epFinal || 200,
      building?.category || "AL",
      Au,
      energyPriceRON,
    );
  }, [smartSuggestions, epFinal, building]);

  const handleGenerate = async (format = "json") => {
    setGenerating(true);
    try {
      // Sprint P0-A P0-02 — apel REAL buildRenovationPassport în loc de schema 4 secțiuni cosmetice.
      // UUID v5 deterministic din cpeCode (cross-ref CPE↔Pașaport stabil pentru registru MDLPA).
      const passport = buildRenovationPassport({
        cpeCode,
        building: building || {},
        instSummary: instSummary || { ep_total_m2: epFinal, energyClass },
        renewSummary: renewSummary || {},
        climate: climate || {},
        auditor: auditor || {},
        phasedPlan: phasedPlan ? {
          strategy: "balanced",
          totalYears: phasedPlan.totalYears,
          annualBudget: 50000,
          energyPrice: 0.45,
          discountRate: 0.04,
          phases: phasedPlan.phases,
          epTrajectory: phasedPlan.epTrajectory,
          classTrajectory: phasedPlan.classTrajectory,
          summary: phasedPlan.summary,
        } : null,
        mepsStatus: { thresholds: mepsThresholds, level: mepsStatusObj.level },
        financialSummary,
        fundingEligible,
        changeReason: "Generare pașaport renovare basic (Pas 7)",
        changedBy: auditor?.name || "Auditor",
      });

      const lib = await import("../lib/passport-export.js");

      if (format === "json") {
        lib.exportPassportJSON(passport);
      } else if (format === "xml") {
        lib.exportPassportXML(passport);
      } else if (format === "pdf") {
        await lib.exportPassportPDF(passport, {
          building,
          auditor,
          energyClass,
          epPrimary: epFinal,
        });
      } else if (format === "docx") {
        // Sprint P0-A — DOCX A4 portret cu watermark juridic + 7 secțiuni Anexa VIII.
        const docxLib = await import("../lib/passport-docx.js");
        await docxLib.exportPassportDOCX(passport);
      }

      setResult({ ok: true, passport, format });
      onGenerate?.(passport);
    } catch (err) {
      console.error("[PasaportBasic] export error:", err);
      setResult({ ok: false, error: err.message });
    } finally {
      setGenerating(false);
    }
  };

  // Format dinamic milestone EPBD pentru afișare UI
  const targetClass = mepsThresholds.class2nd || "E";
  const targetYear = mepsThresholds.milestone2 || 2033;
  const phaseCount = phasedPlan?.phases?.length || 0;
  const epFinalAfterRenov = phasedPlan?.summary?.ep_final ?? null;
  const classFinalAfterRenov = phasedPlan?.summary?.class_final ?? null;

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "16px" }}>
          📋 Pașaport Renovare EPBD 2024 — Anexa VIII
        </h3>
        <Badge color="amber">PREVIEW</Badge>
      </div>

      {/* Sprint P0-A — banner watermark juridic prominent */}
      <div style={{
        padding: "10px 12px",
        background: "rgba(180, 83, 9, 0.10)",
        borderLeft: "3px solid #B45309",
        borderRadius: "6px",
        marginBottom: "12px",
        fontSize: "12px",
        color: "#FCD34D",
      }}>
        <strong>⚠️ PREVIEW EPBD 2024 — fără valoare juridică în RO până la actul național de transpunere.</strong>
        {" "}Termen transpunere națională: <strong>29.05.2026</strong>. Document intern Zephren — referință viitoare.
      </div>

      <p style={{ fontSize: "13px", opacity: 0.75, marginTop: 0, marginBottom: "12px" }}>
        Pașaport derivat din EPBD 2024/1275 Art. 12 + Anexa VIII — schema completă cu 12 secțiuni
        (identificare, baseline, plan etapizat, stare țintă, financiar, MEPS, auditor, registru).
        Format export: JSON, XML, PDF (A4), DOCX (A4 portret). Pentru analiză LCC multi-fază + benchmark
        național → upgrade la <strong>Zephren Expert</strong>.
      </p>

      {/* Stare actuală + țintă dinamică EPBD Art. 9 */}
      <div style={{
        padding: "12px",
        background: "rgba(59, 130, 246, 0.1)",
        borderLeft: "3px solid #3B82F6",
        borderRadius: "6px",
        marginBottom: "12px",
        fontSize: "13px",
      }}>
        <div style={{ marginBottom: "4px" }}>
          <strong>Stare actuală:</strong> Clasă {energyClass || "—"} ·
          EP <strong>{epFinal ? `${epFinal.toFixed(1)} kWh/(m²·an)` : "—"}</strong>
        </div>
        <div style={{ marginBottom: "4px" }}>
          <strong>Țintă MEPS 2030:</strong> Clasă {mepsThresholds.class2030} ·
          EP ≤ {mepsThresholds.ep2030} kWh/(m²·an) (EPBD Art. 9 — toate categoriile)
        </div>
        <div style={{ marginBottom: "4px" }}>
          <strong>Țintă MEPS {targetYear}:</strong> Clasă {targetClass} ·
          EP ≤ {mepsThresholds.ep2nd} kWh/(m²·an)
          {" "}({building?.category && ["RI", "RC", "RA"].includes(building.category)
            ? "rezidențial — Art. 9.1.a"
            : "nerezidențial — Art. 9.1.b"})
        </div>
        {phasedPlan && (
          <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed rgba(59,130,246,0.3)" }}>
            <strong>Plan etapizat real:</strong> {phaseCount} faze · {phasedPlan.totalYears} ani ·
            EP final estimat <strong>{epFinalAfterRenov?.toFixed(1) || "—"} kWh/(m²·an)</strong>
            {classFinalAfterRenov && <> · clasă <strong>{classFinalAfterRenov}</strong></>}
            {phasedPlan.summary?.nzeb_reached && <> · ✓ atinge nZEB</>}
          </div>
        )}
      </div>

      {/* Vizualizare faze plan etapizat */}
      {phasedPlan && phasedPlan.phases.length > 0 && (
        <div style={{
          padding: "10px 12px",
          background: "rgba(34, 197, 94, 0.06)",
          borderLeft: "3px solid #22C55E",
          borderRadius: "6px",
          marginBottom: "12px",
          fontSize: "12px",
        }}>
          <div style={{ fontWeight: 600, marginBottom: "6px", color: "#22C55E" }}>
            📅 Foaie de parcurs etapizată ({phaseCount} faze)
          </div>
          {phasedPlan.phases.map((ph, idx) => (
            <div key={idx} style={{
              padding: "4px 0",
              borderTop: idx > 0 ? "1px dotted rgba(34,197,94,0.2)" : "none",
              opacity: 0.85,
            }}>
              <strong>Faza {idx + 1} — Anul {ph.year}</strong>
              {": "}
              <span>EP {ph.ep_after.toFixed(0)} kWh · clasă {ph.class_after}</span>
              {" · "}
              <span>{ph.measures.length} măsuri · {ph.phaseCost_RON.toLocaleString("ro-RO")} RON</span>
              {ph.measures.length > 0 && (
                <div style={{ fontSize: "11px", opacity: 0.6, marginTop: "2px" }}>
                  {ph.measures.map(m => m.name).join(" · ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sprint Pas 7 docs (6 mai 2026) — butoanele JSON/XML/PDF/DOCX sunt mutate
          în Cardul central „Generare documente" (Step7Audit) când noButtons=true.
          JSON + DOCX foaie parcurs ELIMINATE (redundante). Doar PDF + XML rămân
          ca livrabile activate prin Cardul central. */}
      {!noButtons && (
        <>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => handleGenerate("xml")}
              disabled={generating}
              style={{
                padding:      "10px 16px",
                background:   "rgba(59, 130, 246, 0.15)",
                color:        "#3B82F6",
                border:       "1px solid #3B82F6",
                borderRadius: "6px",
                fontSize:     "13px",
                fontWeight:   600,
                cursor:       generating ? "wait" : "pointer",
                opacity:      generating ? 0.6 : 1,
              }}
            >
              {generating ? "Se generează…" : "📥 XML"}
            </button>
            <button
              onClick={() => handleGenerate("pdf")}
              disabled={generating}
              style={{
                padding:      "10px 16px",
                background:   "#3B82F6",
                color:        "#fff",
                border:       "none",
                borderRadius: "6px",
                fontSize:     "13px",
                fontWeight:   600,
                cursor:       generating ? "wait" : "pointer",
                opacity:      generating ? 0.6 : 1,
              }}
            >
              📥 PDF (A4)
            </button>
          </div>

          {result && (
            <div style={{
              marginTop: "12px",
              padding: "10px",
              background: result.ok ? "#10B98115" : "#EF444415",
              borderRadius: "6px",
              fontSize: "12px",
              color: result.ok ? "#10B981" : "#EF4444",
            }}>
              {result.ok
                ? `✓ Pașaport ${(result.format || "").toUpperCase()} descărcat. UUID: ${result.passport?.passportId?.slice(0, 8) || "—"}…`
                : `✗ Eroare: ${result.error}`}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
