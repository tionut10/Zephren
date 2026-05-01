/**
 * RaportConformareNZEB.jsx — Sprint v6.2 (27 apr 2026)
 *
 * Componentă UI pentru emiterea Raportului de conformare nZEB conform
 * Art. 6 alin. (1) lit. c) din Ordinul MDLPA nr. 348/2026:
 *
 *   „Auditorii energetici pentru clădiri, grad profesional I [AE Ici],
 *    întocmesc raportul de conformare nZEB privind cerințele minime de
 *    conformare a unei clădiri cu consum de energie aproape egal cu zero,
 *    în conformitate cu conținutul-cadru prevăzut în metodologia de calcul
 *    al performanței energetice a clădirilor, prin care o clădire aflată
 *    în faza de proiectare îndeplinește condițiile de încadrare la categoria
 *    clădirilor al căror consum de energie este aproape egal cu zero."
 *
 * COMPETENȚĂ EXCLUSIVĂ AE Ici:
 *   AE IIci nu poate emite acest raport (Art. 6 alin. 2 limitează AE IIci
 *   exclusiv la CPE pentru rezidențial). Componenta este gated cu feature
 *   `nzebReport` în planGating.js — disponibil doar pe planurile pro
 *   (Zephren AE Ici), expert, birou, enterprise, edu.
 *
 * Documentul generat (DOCX A4 portret) este destinat clădirilor în FAZA
 * DE PROIECTARE (înainte de execuție/recepție), nu pentru clădiri existente
 * (acelea folosesc CPE + Audit energetic Mc 001-2022).
 *
 * Tehnic: folosește `generateNZEBConformanceReport()` din lib/report-generators
 * (existent din Sprint 14-17). Această componentă este shell-ul UI care:
 *   1. Validează gating-ul (canAccess plan).
 *   2. Afișează preview status conformare nZEB (pass/fail + criterii).
 *   3. Solicită faza proiectului (DTAC / PT / DTOE / detalii execuție).
 *   4. Lansează generarea DOCX la apăsarea butonului.
 */

import { useState, useMemo, useCallback } from "react";
import { canAccess } from "../lib/planGating.js";
import { generateNZEBConformanceReport } from "../lib/report-generators.js";
import { Card, Badge, Select, Input, ResultRow, cn } from "./ui.jsx";

// ── Faze de proiectare conform Lege 50/1991 + HG 907/2016 ──
const PROJECT_PHASES = [
  { value: "DTAC",       label: "DTAC — Documentație tehnică pentru autorizația de construire" },
  { value: "PT",         label: "PT — Proiect tehnic" },
  { value: "DTOE",       label: "DTOE — Documentație tehnică de organizare a execuției" },
  { value: "DDE",        label: "DDE — Detalii de execuție" },
  { value: "PAC",        label: "PAC — Proiect pentru autorizația de construire" },
  { value: "anteproiect",label: "Anteproiect / fază preliminară" },
];

/**
 * RaportConformareNZEB — UI generator pentru raportul de conformare nZEB.
 *
 * @param {object} props
 * @param {object} props.building - state clădire
 * @param {object} props.selectedClimate - zonă climatică selectată
 * @param {object} props.instSummary - sumar consum (din motorul de calcul)
 * @param {object} props.renewSummary - sumar regenerabile
 * @param {object} props.envelopeSummary - sumar anvelopă
 * @param {Array}  props.opaqueElements - elemente opace
 * @param {Array}  props.glazingElements - elemente vitrate
 * @param {object} props.heating
 * @param {object} props.cooling
 * @param {object} props.ventilation
 * @param {object} props.lighting
 * @param {object} props.acm
 * @param {object} props.solarThermal
 * @param {object} props.photovoltaic
 * @param {object} props.heatPump
 * @param {object} props.biomass
 * @param {object} props.auditor - date auditor (semnătură + grad MDLPA)
 * @param {string} props.userPlan - cheie plan abonament
 * @param {string} props.lang - "RO" | "EN"
 * @param {(msg:string, type?:string) => void} props.showToast
 */
export default function RaportConformareNZEB({
  building,
  selectedClimate,
  instSummary,
  renewSummary,
  envelopeSummary,
  opaqueElements,
  glazingElements,
  heating,
  cooling,
  ventilation,
  lighting,
  acm,
  solarThermal,
  photovoltaic,
  heatPump,
  biomass,
  auditor,
  userPlan,
  lang = "RO",
  showToast,
}) {
  const [phase, setPhase] = useState("PT");
  const [generating, setGenerating] = useState(false);
  const [lastError, setLastError] = useState("");
  const [lastSuccess, setLastSuccess] = useState(false);

  const allowed = canAccess(userPlan, "nzebReport");
  const gradOk = !auditor?.gradMdlpa || auditor.gradMdlpa === "Ici";
  // Doar AE Ici poate emite raport conformare nZEB (Art. 6 alin. 1 lit. c)

  const handleGenerate = useCallback(async () => {
    if (!allowed) {
      showToast?.(
        lang === "EN"
          ? "nZEB conformance report requires AE Ici grade (upgrade plan)."
          : "Raportul nZEB necesită gradul AE Ici (upgrade plan).",
        "error",
      );
      return;
    }
    if (!gradOk) {
      showToast?.(
        lang === "EN"
          ? "AE IIci auditors cannot issue nZEB conformance reports (Art. 6 par. 2 Ord. 348/2026)."
          : "Auditorii AE IIci nu pot emite rapoarte de conformare nZEB (Art. 6 alin. 2 Ord. 348/2026).",
        "error",
      );
      return;
    }
    if (!instSummary || !selectedClimate) {
      showToast?.(
        lang === "EN" ? "Complete steps 1-5 before generating the report." : "Completează pașii 1-5 înainte de generare.",
        "error",
      );
      return;
    }

    setGenerating(true);
    setLastError("");
    setLastSuccess(false);
    try {
      await generateNZEBConformanceReport({
        building, selectedClimate, instSummary, renewSummary, envelopeSummary,
        opaqueElements, glazingElements,
        heating, cooling, ventilation, lighting, acm,
        solarThermal, photovoltaic, heatPump, biomass,
        auditor, projectPhase: phase, download: true,
      });
      setLastSuccess(true);
      showToast?.(
        lang === "EN"
          ? "nZEB conformance report generated and downloaded."
          : "Raport conformare nZEB generat și descărcat.",
        "success",
      );
    } catch (e) {
      console.error("[RaportConformareNZEB]", e);
      setLastError(e?.message || String(e));
      showToast?.(
        lang === "EN" ? "Error generating report. See console." : "Eroare la generare. Verifică consola.",
        "error",
      );
    } finally {
      setGenerating(false);
    }
  }, [
    allowed, gradOk, instSummary, selectedClimate, building, renewSummary, envelopeSummary,
    opaqueElements, glazingElements, heating, cooling, ventilation, lighting, acm,
    solarThermal, photovoltaic, heatPump, biomass, auditor, phase, lang, showToast,
  ]);

  // ── Locked state — plan fără acces (AE IIci, Free) ──
  if (!allowed) {
    return (
      <Card
        title={lang === "EN" ? "nZEB Conformance Report" : "Raport conformare nZEB"}
        badge={<Badge color="amber">AE Ici only</Badge>}
        className="mb-4"
      >
        <div className="text-xs space-y-2 opacity-80">
          <p>
            {lang === "EN" ? (
              <>
                The nZEB conformance report is mandatory for buildings in the design phase
                (DTAC/PT/DDE) under Romanian Law 372/2005 and Mc 001-2022. According to
                Art. 6 par. (1)(c) of Order MDLPA 348/2026, only auditors with grade
                AE Ici may issue this report.
              </>
            ) : (
              <>
                Raportul de conformare nZEB este obligatoriu pentru clădirile aflate în
                faza de proiectare (DTAC/PT/DDE) conform Legii 372/2005 și Mc 001-2022.
                Conform Art. 6 alin. (1) lit. c) din Ordinul MDLPA 348/2026, doar
                auditorii cu gradul AE Ici pot emite acest raport.
              </>
            )}
          </p>
          <div className="text-[11px] italic opacity-60">
            {lang === "EN"
              ? "Upgrade to Zephren AE Ici to unlock this feature."
              : "Treci la planul Zephren AE Ici pentru acces la această funcționalitate."}
          </div>
        </div>
      </Card>
    );
  }

  // ── Auditor pe AE IIci (grad declarat) — blocaj soft ──
  if (!gradOk) {
    return (
      <Card
        title={lang === "EN" ? "nZEB Conformance Report" : "Raport conformare nZEB"}
        badge={<Badge color="red">Blocaj legal</Badge>}
        className="mb-4"
      >
        <div className="text-xs text-red-300 leading-relaxed">
          {lang === "EN" ? (
            <>
              Your stamp grade is AE IIci, restricted by Art. 6 par. (2) Ord. MDLPA
              348/2026 to residential CPE only. The nZEB conformance report is
              reserved exclusively for AE Ici (5+ years experience). Update your
              auditor profile if your stamp is actually AE Ici.
            </>
          ) : (
            <>
              Ștampila ta este AE IIci, restricționată prin Art. 6 alin. (2) Ord.
              MDLPA 348/2026 doar la CPE rezidențial. Raportul de conformare nZEB
              este rezervat exclusiv AE Ici (vechime ≥ 5 ani). Actualizează profilul
              auditorului dacă ștampila ta este, de fapt, AE Ici.
            </>
          )}
        </div>
      </Card>
    );
  }

  // ── UI funcțional ──
  return (
    <Card
      title={lang === "EN" ? "nZEB Conformance Report (design phase)" : "Raport conformare nZEB (fază de proiectare)"}
      subtitle={<Badge color="emerald">Art. 6 alin. (1) lit. c</Badge>}
      className="mb-4"
    >
      <div className="space-y-4">
        <div className="text-xs opacity-70 leading-relaxed">
          {lang === "EN" ? (
            <>
              Document required for buildings in the design phase to certify they
              meet near-zero energy criteria (nZEB) under Mc 001-2022 and EPBD
              2024/1275. Issued by AE Ici prior to construction permit.
            </>
          ) : (
            <>
              Document obligatoriu pentru clădirile aflate în faza de proiectare,
              prin care se atestă încadrarea în criteriile de clădire cu consum de
              energie aproape egal cu zero (nZEB) conform Mc 001-2022 și EPBD
              2024/1275. Emis de AE Ici înainte de autorizația de construire.
            </>
          )}
        </div>

        <Select
          label={lang === "EN" ? "Project phase" : "Faza proiectului"}
          value={phase}
          onChange={setPhase}
          options={PROJECT_PHASES}
          tooltip={lang === "EN"
            ? "The design phase determines the level of detail required."
            : "Faza determină nivelul de detaliu cerut documentației."}
        />

        <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-3 text-[11px] space-y-1">
          <div className="font-semibold opacity-80">
            {lang === "EN" ? "Output document" : "Documentul rezultat"}
          </div>
          <div className="opacity-60">
            {lang === "EN" ? "Format:" : "Format:"} <strong>DOCX A4 portret</strong>
            {" · "}
            {lang === "EN" ? "Sections:" : "Secțiuni:"} {lang === "EN"
              ? "identification, climate, envelope, EP, RER, nZEB criteria, conclusion, auditor signature"
              : "identificare, climat, anvelopă, EP, RER, criterii nZEB, concluzie, semnătură auditor"}
            {" · "}
            {lang === "EN" ? "Issuer:" : "Emitent:"} <strong>AE Ici</strong>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className={cn(
            "w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all",
            generating
              ? "bg-white/5 text-white/40 cursor-not-allowed"
              : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30",
          )}
          aria-busy={generating}
        >
          {generating
            ? (lang === "EN" ? "Generating..." : "Generez...")
            : (lang === "EN" ? "📄 Generate nZEB conformance DOCX" : "📄 Generează DOCX conformare nZEB")}
        </button>

        {lastSuccess && (
          <div role="status" className="text-[11px] text-emerald-300 italic">
            ✓ {lang === "EN" ? "Document downloaded successfully." : "Document descărcat cu succes."}
          </div>
        )}
        {lastError && (
          <div role="alert" className="text-[11px] text-red-300 italic">
            ⚠ {lastError}
          </div>
        )}

        <div className="text-[10px] opacity-40 italic pt-2 border-t border-white/[0.05]">
          {lang === "EN"
            ? "Legal reference: Art. 6 par. (1) (c) Order MDLPA 348/2026 (Official Gazette no. 292 / 14.IV.2026)."
            : "Referință legală: Art. 6 alin. (1) lit. c) Ordinul MDLPA nr. 348/2026 (MO nr. 292 / 14.IV.2026)."}
        </div>
      </div>
    </Card>
  );
}
