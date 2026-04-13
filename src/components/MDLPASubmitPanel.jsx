import { useState, useMemo } from "react";
import { cn } from "./ui.jsx";

/**
 * MDLPASubmitPanel — Pregătire și submit CPE la MDLPA
 *
 * Status actual: MDLPA nu are API public. Acest panel:
 * 1. Generează XML-ul CPE conform schemei MDLPA (format anticipat)
 * 2. Validează completitudinea datelor
 * 3. Pregătește fișierul pentru upload manual pe portal
 * 4. Când API-ul devine disponibil → submit automat
 */

const VALIDATION_RULES = [
  { id: "building_id",    label: "Identificare clădire (adresă, CF)",   field: "building",     check: d => d?.address && d?.cadastral_number },
  { id: "envelope",       label: "Anvelopă termică completă",           field: "envelope",     check: d => d?.elements?.length > 0 },
  { id: "systems",        label: "Sisteme instalații definite",          field: "systems",      check: d => d?.heating || d?.cooling },
  { id: "ep_value",       label: "EP calculat (kWh/m²/an)",             field: "calculation",  check: d => typeof d?.ep_primary === "number" && d.ep_primary > 0 },
  { id: "energy_class",   label: "Clasă energetică atribuită",          field: "calculation",  check: d => d?.energy_class },
  { id: "auditor",        label: "Date auditor (nume, legitimație)",     field: "auditor",      check: d => d?.name && d?.license_number },
  { id: "signature",      label: "Semnătura digitală auditor",          field: "auditor",      check: d => d?.signature },
  { id: "photos",         label: "Fotografii clădire atașate",          field: "photos",       check: d => d?.length > 0 },
];

function generateCPEXML(projectData) {
  const b = projectData?.building || {};
  const c = projectData?.calculation || {};
  const a = projectData?.auditor || {};
  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<CertificatPerformantaEnergetica xmlns="urn:mdlpa:cpe:2024" versiune="2.0">
  <Metadata>
    <DataGenerare>${now}</DataGenerare>
    <VersiuneSoftware>Zephren Energy Calculator</VersiuneSoftware>
    <NormativReferinta>Mc 001-2022</NormativReferinta>
  </Metadata>

  <Cladire>
    <Adresa>${escXml(b.address || "")}</Adresa>
    <NumarCadastral>${escXml(b.cadastral_number || "")}</NumarCadastral>
    <Localitate>${escXml(b.locality || "")}</Localitate>
    <Judet>${escXml(b.county || "")}</Judet>
    <AnConstructie>${b.year_built || ""}</AnConstructie>
    <SuprafataUtila>${b.useful_area || ""}</SuprafataUtila>
    <DestinatieUtilizare>${escXml(b.building_type || "rezidential")}</DestinatieUtilizare>
    <ZonaClimatica>${escXml(b.climate_zone || "")}</ZonaClimatica>
  </Cladire>

  <PerformantaEnergetica>
    <EPPrimar>${c.ep_primary?.toFixed(2) || "0"}</EPPrimar>
    <EPReferinta>${c.ep_reference?.toFixed(2) || "0"}</EPReferinta>
    <ClasaEnergetica>${c.energy_class || ""}</ClasaEnergetica>
    <EmisiiCO2>${c.co2?.toFixed(2) || "0"}</EmisiiCO2>
    <NZEBConform>${c.nzeb_compliant ? "da" : "nu"}</NZEBConform>
    <Descompunere>
      <Incalzire>${c.ep_heating?.toFixed(2) || "0"}</Incalzire>
      <Racire>${c.ep_cooling?.toFixed(2) || "0"}</Racire>
      <ACM>${c.ep_dhw?.toFixed(2) || "0"}</ACM>
      <Iluminat>${c.ep_lighting?.toFixed(2) || "0"}</Iluminat>
      <Ventilare>${c.ep_ventilation?.toFixed(2) || "0"}</Ventilare>
    </Descompunere>
  </PerformantaEnergetica>

  <Auditor>
    <Nume>${escXml(a.name || "")}</Nume>
    <NumarLegitimatie>${escXml(a.license_number || "")}</NumarLegitimatie>
    <GradAtestare>${escXml(a.grade || "")}</GradAtestare>
    <DataAudit>${a.audit_date || ""}</DataAudit>
  </Auditor>
</CertificatPerformantaEnergetica>`;
}

function escXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function MDLPASubmitPanel({ projectData = {} }) {
  const [showXML, setShowXML] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("idle"); // idle | validating | ready | submitting | success | error
  const [submitError, setSubmitError] = useState(null);

  const validation = useMemo(() => {
    return VALIDATION_RULES.map(rule => {
      const data = projectData?.[rule.field];
      const passed = rule.check(data);
      return { ...rule, passed };
    });
  }, [projectData]);

  const allPassed = validation.every(v => v.passed);
  const passedCount = validation.filter(v => v.passed).length;
  const xml = useMemo(() => generateCPEXML(projectData), [projectData]);

  async function handleSubmit() {
    setSubmitStatus("submitting");
    setSubmitError(null);

    try {
      // TODO: Când MDLPA publică API-ul, înlocuiește cu endpoint-ul real
      const response = await fetch("/api/mdlpa-submit", {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: xml,
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      setSubmitStatus("success");
    } catch (err) {
      if (err.message.includes("404") || err.message.includes("Failed to fetch")) {
        setSubmitError("API MDLPA nu este încă disponibil. Descărcați XML-ul și încărcați-l manual pe portal.mdlpa.ro");
      } else {
        setSubmitError(err.message);
      }
      setSubmitStatus("error");
    }
  }

  function downloadXML() {
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `CPE_${projectData?.building?.address?.replace(/\s+/g, "_") || "export"}_${new Date().toISOString().slice(0, 10)}.xml`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function copyXML() {
    navigator.clipboard?.writeText(xml).then(() => {
      // feedback vizual scurt
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">
          Submit CPE — Portal MDLPA
        </h3>
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border",
          allPassed
            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
            : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30")}>
          {passedCount}/{VALIDATION_RULES.length} verificări trecute
        </span>
      </div>

      {/* Checklist validare */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
          Verificări pre-submit
        </div>
        {validation.map(v => (
          <div key={v.id} className="flex items-center gap-2">
            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
              v.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
              {v.passed ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className={cn("text-sm", v.passed ? "text-white/60" : "text-red-300/80")}>{v.label}</span>
          </div>
        ))}
      </div>

      {/* Acțiuni */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleSubmit}
          disabled={!allPassed || submitStatus === "submitting"}
          className={cn("px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            allPassed
              ? "bg-amber-500 text-slate-900 hover:bg-amber-400"
              : "bg-white/10 text-white/30 cursor-not-allowed")}>
          {submitStatus === "submitting" ? "Se trimite..." : "Submit la MDLPA"}
        </button>

        <button onClick={downloadXML}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all">
          Descarcă XML
        </button>

        <button onClick={() => setShowXML(v => !v)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all">
          {showXML ? "Ascunde XML" : "Preview XML"}
        </button>

        <button onClick={copyXML}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all">
          Copiază XML
        </button>
      </div>

      {/* Status mesaje */}
      {submitStatus === "success" && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm text-emerald-300">
          CPE transmis cu succes la MDLPA. Număr de înregistrare va fi transmis prin email.
        </div>
      )}
      {submitStatus === "error" && submitError && (
        <div className="bg-red-950/20 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-300">
          {submitError}
        </div>
      )}

      {/* Preview XML */}
      {showXML && (
        <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">XML Preview</span>
            <span className="text-[10px] text-white/20">{xml.length.toLocaleString("ro-RO")} caractere</span>
          </div>
          <pre className="px-4 py-3 text-xs text-white/50 overflow-x-auto max-h-96 font-mono leading-relaxed">
            {xml}
          </pre>
        </div>
      )}

      <p className="text-xs text-white/20 text-right">
        Schema XML: format anticipat MDLPA 2024 · Mc 001-2022 · La disponibilitatea API-ului → submit automat
      </p>
    </div>
  );
}
