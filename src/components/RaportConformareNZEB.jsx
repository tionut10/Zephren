/**
 * RaportConformareNZEB.jsx — Sprint Tranziție 2026 (2 mai 2026)
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
 *   `nzebReport` în grade-features.js (minGrade: Ici, minPlan: pro).
 *
 * Tranziție (T1.6 Sprint Tranziție 2026):
 *   În fereastra 14.IV.2026 → 11.X.2026 (`isInTransitionWindow`), dacă blocaj
 *   se datorează gradului, randăm raportul cu banner amber soft. După 11.X.2026
 *   sau cu `window.__forceStrictGrade=true`, gating-ul e strict.
 *   Plan-restricția (minPlan: pro) rămâne strict comercial (nu e legată de
 *   tranziția legală).
 *
 * Documentul generat (DOCX A4 portret) este destinat clădirilor în FAZA
 * DE PROIECTARE (înainte de execuție/recepție), nu pentru clădiri existente
 * (acelea folosesc CPE + Audit energetic Mc 001-2022).
 */

import { useState, useCallback } from "react";
import { evaluateGate } from "../lib/effectiveGate.js";
import { generateNZEBConformanceReport } from "../lib/report-generators.js";
import { Card, Badge, Select, cn } from "./ui.jsx";

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

  // Verdict combinat plan + grad cu suport tranziție legală.
  // În tranziție: dacă blocaj e doar pe grad → allowed=true + softWarning amber.
  // Plan-restricția rămâne strict (e separare comercială, nu legală).
  const verdict = evaluateGate({
    feature: "nzebReport",
    plan: userPlan,
    auditorGrad: auditor?.gradMdlpa || null,
  });
  const allowed = verdict.allowed;
  const inTransition = verdict.inTransition;
  const blockedByPlan = verdict.blockedBy === "plan";
  const showSoftWarning = inTransition && verdict.softWarning;

  const handleGenerate = useCallback(async () => {
    if (!allowed) {
      const msg = blockedByPlan
        ? (lang === "EN"
            ? "nZEB conformance report requires plan Zephren AE Ici or higher."
            : "Raportul nZEB necesită planul Zephren AE Ici sau superior.")
        : (lang === "EN"
            ? "AE IIci auditors cannot issue nZEB conformance reports (Art. 6 par. 2 Ord. 348/2026)."
            : "Auditorii AE IIci nu pot emite rapoarte de conformare nZEB (Art. 6 alin. 2 Ord. 348/2026).");
      showToast?.(msg, "error");
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
    allowed, blockedByPlan, instSummary, selectedClimate, building, renewSummary, envelopeSummary,
    opaqueElements, glazingElements, heating, cooling, ventilation, lighting, acm,
    solarThermal, photovoltaic, heatPump, biomass, auditor, phase, lang, showToast,
  ]);

  // ── Locked state STRICT — blocaj plan sau grad post-tranziție ──
  if (!allowed) {
    const isPlan = blockedByPlan;
    return (
      <Card
        title={lang === "EN" ? "nZEB Conformance Report" : "Raport conformare nZEB"}
        badge={<Badge color={isPlan ? "amber" : "red"}>{isPlan ? "Plan upgrade" : "Blocaj legal"}</Badge>}
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
            {isPlan
              ? (lang === "EN"
                  ? "Your plan does not include this feature. Upgrade to Zephren AE Ici 1.499 RON/lună."
                  : "Planul curent nu include această funcționalitate. Upgrade la Zephren AE Ici 1.499 RON/lună.")
              : (lang === "EN"
                  ? "Your stamp grade is AE IIci. Update your auditor profile if your stamp is actually AE Ici."
                  : "Ștampila ta este AE IIci. Actualizează profilul auditorului dacă ștampila ta este, de fapt, AE Ici.")}
          </div>
        </div>
      </Card>
    );
  }

  // ── UI funcțional ──
  return (
    <Card
      title={lang === "EN" ? "nZEB Conformance Report (design phase)" : "Raport conformare nZEB (fază de proiectare)"}
      subtitle={<Badge color={showSoftWarning ? "amber" : "emerald"}>Art. 6 alin. (1) lit. c</Badge>}
      className="mb-4"
    >
      <div className="space-y-4">
        {showSoftWarning && (
          <div
            role="alert"
            className="rounded-lg bg-amber-500/10 border border-amber-500/40 p-3 text-[11px] text-amber-200 leading-relaxed"
          >
            <div className="font-semibold mb-1">
              {lang === "EN" ? "⏱️ Legal transition window" : "⏱️ Perioadă de tranziție legală"}
            </div>
            <p>
              {lang === "EN" ? (
                <>
                  Your stamp grade (AE IIci) would normally block nZEB report generation
                  under Art. 6 par. (1)(c) Ord. MDLPA 348/2026. During the legal transition
                  period (until 11 October 2026, repeal of Ord. 2237/2010 per Art. 7 Ord.
                  348/2026), this restriction is non-blocking. After that date, only AE Ici
                  auditors will be able to issue this document.
                </>
              ) : (
                <>
                  Gradul ștampilei (AE IIci) ar bloca normal generarea raportului nZEB
                  conform Art. 6 alin. (1) lit. c) Ord. MDLPA 348/2026. În perioada de
                  tranziție legală (până la 11 octombrie 2026, abrogarea Ord. 2237/2010
                  prin Art. 7 Ord. 348/2026), restricția este informativă. După acea dată,
                  doar auditorii AE Ici vor putea emite acest document.
                </>
              )}
            </p>
          </div>
        )}

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
