import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "./ui.jsx";
import { canAccess } from "../lib/planGating.js";
import PlanGate from "./PlanGate.jsx";
import {
  buildSubmitEmail,
  submitToMDLPA,
  loadTracking,
  appendAttempt,
  setFinalStatus,
  splitFilesBySize,
  MDLPA_EMAIL,
  MAX_EMAIL_ATTACHMENT_MB,
} from "../lib/mdlpa-submit.js";

/**
 * MDLPASubmitPanel — Workflow producție submit CPE la MDLPA (Sprint 17).
 *
 * Procedura oficială MDLPA 2024-2026 (Ord. 348/2026):
 *   1. Auditor trimite XML + DOCX + PDF prin email la birou.atestari@mdlpa.ro
 *   2. Fișiere >25 MB → urcate în Supabase Storage, link în email
 *   3. Tracking persistent localStorage (audit-trail per CPE)
 *
 * MDLPA NU are API REST; acest panel pregătește submit-ul + persistă status.
 */

const VALIDATION_RULES = [
  { id: "cpe_code",       label: "Cod unic CPE generat",                  field: "cpeCode",      check: c => !!c },
  { id: "building_id",    label: "Identificare clădire (adresă, cadastru)", field: "building",   check: d => d?.address && d?.cadastralNumber },
  { id: "envelope",       label: "Anvelopă termică completă",             field: "envelope",     check: d => d?.elements?.length > 0 || d?.opaque?.length > 0 },
  { id: "ep_value",       label: "EP calculat (kWh/m²/an)",               field: "calculation",  check: d => typeof d?.ep_primary === "number" && d.ep_primary > 0 },
  { id: "energy_class",   label: "Clasă energetică atribuită",            field: "calculation",  check: d => !!d?.energy_class },
  { id: "auditor",        label: "Date auditor (nume, atestat)",          field: "auditor",      check: d => d?.name && (d?.atestat || d?.license_number) },
  { id: "signature",      label: "Semnătură / ștampilă auditor",          field: "auditor",      check: d => d?.signature || d?.signatureDataURL || d?.stamp || d?.stampDataURL },
];

function escXml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generateCPEXML(projectData, cpeCode) {
  const b = projectData?.building || {};
  const c = projectData?.calculation || {};
  const a = projectData?.auditor || {};
  const passportUUID = projectData?.passportUUID || "";
  const now = new Date().toISOString();

  const passportBlock = passportUUID
    ? `\n  <PasaportRenovare>
    <UUID>${escXml(passportUUID)}</UUID>
    <URL>https://zephren.ro/passport/${escXml(passportUUID)}</URL>
  </PasaportRenovare>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<CertificatPerformantaEnergetica xmlns="urn:mdlpa:cpe:2024" versiune="2.0">
  <Metadata>
    <CodUnicCPE>${escXml(cpeCode || "")}</CodUnicCPE>
    <DataGenerare>${now}</DataGenerare>
    <VersiuneSoftware>Zephren Energy Calculator</VersiuneSoftware>
    <NormativReferinta>Mc 001-2022</NormativReferinta>
  </Metadata>

  <Cladire>
    <Adresa>${escXml(b.address || "")}</Adresa>
    <NumarCadastral>${escXml(b.cadastralNumber || b.cadastral_number || "")}</NumarCadastral>
    <CarteFunciara>${escXml(b.landBook || "")}</CarteFunciara>
    <Localitate>${escXml(b.locality || "")}</Localitate>
    <Judet>${escXml(b.county || "")}</Judet>
    <AnConstructie>${b.yearBuilt || b.year_built || ""}</AnConstructie>
    <SuprafataUtila>${b.areaUseful || b.useful_area || ""}</SuprafataUtila>
    <SuprafataConstruita>${b.areaBuilt || ""}</SuprafataConstruita>
    <NumarApartamente>${b.nApartments || ""}</NumarApartamente>
    <DestinatieUtilizare>${escXml(b.category || b.building_type || "rezidential")}</DestinatieUtilizare>
    <ZonaClimatica>${escXml(b.climate_zone || "")}</ZonaClimatica>
  </Cladire>

  <PerformantaEnergetica>
    <EPPrimar>${c.ep_primary?.toFixed?.(2) ?? "0"}</EPPrimar>
    <EPReferinta>${c.ep_reference?.toFixed?.(2) ?? "0"}</EPReferinta>
    <ClasaEnergetica>${escXml(c.energy_class || "")}</ClasaEnergetica>
    <EmisiiCO2>${c.co2?.toFixed?.(2) ?? "0"}</EmisiiCO2>
    <NZEBConform>${c.nzeb_compliant ? "da" : "nu"}</NZEBConform>
    <Descompunere>
      <Incalzire>${c.ep_heating?.toFixed?.(2) ?? "0"}</Incalzire>
      <Racire>${c.ep_cooling?.toFixed?.(2) ?? "0"}</Racire>
      <ACM>${c.ep_dhw?.toFixed?.(2) ?? "0"}</ACM>
      <Iluminat>${c.ep_lighting?.toFixed?.(2) ?? "0"}</Iluminat>
      <Ventilare>${c.ep_ventilation?.toFixed?.(2) ?? "0"}</Ventilare>
    </Descompunere>
  </PerformantaEnergetica>

  <Auditor>
    <Nume>${escXml(a.name || "")}</Nume>
    <NumarAtestat>${escXml(a.atestat || a.license_number || "")}</NumarAtestat>
    <GradAtestare>${escXml(a.grade || "")}</GradAtestare>
    <DataAudit>${a.audit_date || a.date || ""}</DataAudit>
    <CodMDLPA>${escXml(a.mdlpaCode || "")}</CodMDLPA>
  </Auditor>${passportBlock}
</CertificatPerformantaEnergetica>`;
}

const STATUS_LABELS = {
  draft: { label: "Pregătit", color: "bg-white/10 text-white/60 border-white/20" },
  email_opened: { label: "Email deschis", color: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
  cloud_uploaded: { label: "Cloud urcat", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" },
  submitted: { label: "Trimis", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  acknowledged: { label: "Confirmat MDLPA", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  rejected: { label: "Respins", color: "bg-red-500/20 text-red-300 border-red-500/40" },
};

export default function MDLPASubmitPanel(props) {
  // Pricing v6.0 — Submit oficial MDLPA disponibil Audit/Pro/Expert/Birou/Enterprise.
  // Free + Edu: BLOCAT (Edu nu are atestat → NU poate trimite oficial).
  if (!canAccess(props.userPlan, "submitMDLPA")) {
    return <PlanGate feature="submitMDLPA" plan={props.userPlan} requiredPlan="audit" mode="upgrade" />;
  }
  return <MDLPASubmitPanelInternal {...props} />;
}

function MDLPASubmitPanelInternal({ projectData = {}, cpeCode = "", attachments = [] }) {
  const [showXML, setShowXML] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("idle"); // idle | working | success | error
  const [submitError, setSubmitError] = useState(null);
  const [progressStage, setProgressStage] = useState("");
  const [tracking, setTracking] = useState(null);
  const fileInputRef = useRef(null);
  const [extraFiles, setExtraFiles] = useState([]);

  const cpeId = projectData?.cpeId || cpeCode || "default";
  const buildingAddress = projectData?.building?.address || "";

  // Încarcă tracking la mount
  useEffect(() => {
    setTracking(loadTracking(cpeId));
  }, [cpeId]);

  const validation = useMemo(() => {
    return VALIDATION_RULES.map(rule => {
      const data = rule.field === "cpeCode" ? cpeCode : projectData?.[rule.field];
      const passed = rule.check(data);
      return { ...rule, passed };
    });
  }, [projectData, cpeCode]);

  const allPassed = validation.every(v => v.passed);
  const passedCount = validation.filter(v => v.passed).length;
  const xml = useMemo(() => generateCPEXML(projectData, cpeCode), [projectData, cpeCode]);

  const allFiles = useMemo(() => {
    const xmlBlob = new Blob([xml], { type: "application/xml" });
    Object.defineProperty(xmlBlob, "name", { value: `CPE_${cpeCode || "export"}.xml` });
    return [xmlBlob, ...attachments, ...extraFiles];
  }, [xml, attachments, extraFiles, cpeCode]);

  const fileSplit = useMemo(() => splitFilesBySize(allFiles), [allFiles]);

  async function handleSubmit() {
    setSubmitStatus("working");
    setSubmitError(null);
    try {
      await submitToMDLPA({
        cpeId,
        cpeCode,
        auditor: projectData.auditor || {},
        files: allFiles,
        buildingAddress,
        onProgress: (stage) => setProgressStage(stage),
      });
      setSubmitStatus("success");
      setTracking(loadTracking(cpeId));
    } catch (err) {
      setSubmitError(err.message || String(err));
      setSubmitStatus("error");
    } finally {
      setProgressStage("");
    }
  }

  function handleAddFiles(e) {
    const files = Array.from(e.target.files || []);
    setExtraFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemoveExtra(idx) {
    setExtraFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function downloadXML() {
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `CPE_${cpeCode || "export"}_${new Date().toISOString().slice(0, 10)}.xml`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function copyXML() {
    navigator.clipboard?.writeText(xml);
  }

  function openEmailOnly() {
    const meta = allFiles.map(f => ({ name: f.name, sizeMB: (f.size || 0) / 1048576 }));
    const { mailtoUrl } = buildSubmitEmail({ cpeCode, auditor: projectData.auditor || {}, files: meta, buildingAddress });
    window.open(mailtoUrl, "_self");
    appendAttempt(cpeId, { method: "email", status: "sent", finalStatus: "email_opened", note: "Email draft deschis (fără upload cloud)" });
    setTracking(loadTracking(cpeId));
  }

  function markFinalStatus(status) {
    setFinalStatus(cpeId, status, `Marcat manual ca ${STATUS_LABELS[status]?.label || status}`);
    setTracking(loadTracking(cpeId));
  }

  const finalStatus = tracking?.finalStatus || "draft";
  const statusInfo = STATUS_LABELS[finalStatus] || STATUS_LABELS.draft;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">
            Submit CPE — MDLPA
          </h3>
          <div className="text-[11px] text-white/40 mt-0.5">
            Procedura oficială: email la <code className="text-white/60">{MDLPA_EMAIL}</code>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border", statusInfo.color)}>
            {statusInfo.label}
          </span>
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border",
            allPassed
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30")}>
            {passedCount}/{VALIDATION_RULES.length} verificări
          </span>
        </div>
      </div>

      {/* Cod unic CPE */}
      {cpeCode && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">Cod unic CPE</div>
          <code className="text-xs text-amber-200 break-all font-mono">{cpeCode}</code>
        </div>
      )}

      {/* Checklist validare */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
          Verificări pre-submit
        </div>
        {validation.map(v => (
          <div key={v.id} className="flex items-center gap-2">
            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
              v.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
              {v.passed ? "✓" : "✗"}
            </div>
            <span className={cn("text-sm", v.passed ? "text-white/60" : "text-red-300/80")}>{v.label}</span>
          </div>
        ))}
      </div>

      {/* Fișiere de trimis */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Fișiere ({allFiles.length})
          </div>
          <label className="cursor-pointer text-xs text-amber-300 hover:text-amber-200">
            + Adaugă fișiere
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleAddFiles} />
          </label>
        </div>

        {fileSplit.attachable.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-emerald-400/70 mb-1">
              Atașate direct la email (≤{MAX_EMAIL_ATTACHMENT_MB} MB)
            </div>
            {fileSplit.attachable.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 text-white/70">
                <span>📎 {f.name}</span>
                <span className="text-white/40 font-mono">{f.sizeMB.toFixed(2)} MB</span>
              </div>
            ))}
          </div>
        )}

        {fileSplit.oversize.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-indigo-400/70 mb-1">
              Vor urca în cloud (Supabase, link în email)
            </div>
            {fileSplit.oversize.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 text-white/70">
                <span>☁️ {f.name}</span>
                <span className="text-white/40 font-mono">{f.sizeMB.toFixed(2)} MB</span>
              </div>
            ))}
          </div>
        )}

        {extraFiles.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Adăugate manual</div>
            {extraFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 text-white/60">
                <span>{f.name}</span>
                <button onClick={() => handleRemoveExtra(i)} className="text-red-400 hover:text-red-300">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acțiuni */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleSubmit}
          disabled={!allPassed || submitStatus === "working"}
          className={cn("px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            allPassed && submitStatus !== "working"
              ? "bg-amber-500 text-slate-900 hover:bg-amber-400"
              : "bg-white/10 text-white/30 cursor-not-allowed")}>
          {submitStatus === "working" ? `Se procesează (${progressStage})...` : "Submit complet (cloud + email)"}
        </button>

        <button onClick={openEmailOnly}
          disabled={!allPassed}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all disabled:opacity-30">
          📧 Doar email (fără upload)
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

      {/* Marcaj manual status final */}
      {tracking && tracking.attempts.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
            Marcaj status final (manual)
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => markFinalStatus("submitted")}
              className="px-3 py-1.5 rounded-lg text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30">
              Marchează ca trimis
            </button>
            <button onClick={() => markFinalStatus("acknowledged")}
              className="px-3 py-1.5 rounded-lg text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30">
              Confirmare MDLPA primită
            </button>
            <button onClick={() => markFinalStatus("rejected")}
              className="px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30">
              Marchează respins
            </button>
          </div>
        </div>
      )}

      {/* Tracking history */}
      {tracking && tracking.attempts.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
            Istoric submission ({tracking.attempts.length})
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {[...tracking.attempts].reverse().map((att, i) => (
              <div key={i} className="text-xs border-l-2 border-white/10 pl-3 py-1">
                <div className="flex items-center gap-2">
                  <span className="text-white/40">{new Date(att.date).toLocaleString("ro-RO")}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-white/60">{att.method}</span>
                  <span className="text-emerald-400 font-medium">{att.status}</span>
                </div>
                {att.note && <div className="text-white/50 mt-0.5">{att.note}</div>}
                {att.links?.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {att.links.map((l, j) => (
                      <div key={j} className="text-indigo-300/80 truncate">
                        ☁ {l.name} → <a href={l.url} target="_blank" rel="noopener noreferrer" className="underline">link</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status mesaje */}
      {submitStatus === "success" && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm text-emerald-300">
          ✓ Workflow finalizat. Verifică clientul de email și trimite mesajul la {MDLPA_EMAIL}.
        </div>
      )}
      {submitStatus === "error" && submitError && (
        <div className="bg-red-950/20 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-300">
          ✗ {submitError}
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
        Schema XML conform Mc 001-2022 + Ord. MDLPA 348/2026 · Submit: email + cloud Supabase
      </p>
    </div>
  );
}
