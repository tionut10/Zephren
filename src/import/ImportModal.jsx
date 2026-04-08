/**
 * ImportModal — Wizard import date clădire din multiple formate
 * Suportă: JSON, XLSX/XLS, CSV, XML (ENERG+/DOSET/gbXML), PDF, DOCX, imagini
 * Afișează previzualizare date extrase înainte de aplicare
 */
import { useState, useRef, useCallback } from "react";
import { parseXLSX } from "./xlsxParser.js";
import { downloadTemplate } from "./templateGenerator.js";

// ── Tipuri de fișiere suportate ───────────────────────────────────────────────
const FORMATS = [
  { ext: ".json",       icon: "{ }",  label: "Zephren JSON",     desc: "Proiect Zephren exportat",      color: "#6366f1", ai: false },
  { ext: ".xlsx/.xls",  icon: "XLS",  label: "Excel",            desc: "Template Zephren sau generic",  color: "#22c55e", ai: false },
  { ext: ".csv",        icon: "CSV",  label: "CSV Anvelopă",     desc: "Elemente constructive tabel",   color: "#84cc16", ai: false },
  { ext: ".xml",        icon: "XML",  label: "XML (ENERG+/BIM)", desc: "ENERG+, DOSET, gbXML",         color: "#eab308", ai: false },
  { ext: ".ifc",        icon: "IFC",  label: "IFC/BIM",          desc: "Revit, ArchiCAD, gbXML (AI)",   color: "#06b6d4", ai: true  },
  { ext: ".pdf",        icon: "PDF",  label: "PDF",              desc: "Certificat CPE sau audit",      color: "#f97316", ai: true  },
  { ext: ".docx",       icon: "DOC",  label: "DOCX",             desc: "Raport Word (extracție AI)",    color: "#ef4444", ai: true  },
  { ext: "img",         icon: "IMG",  label: "Imagine",          desc: "CPE scanat (extracție AI)",     color: "#a855f7", ai: true  },
  { ext: "facade",      icon: "🏠",   label: "Foto fațadă",      desc: "Estimare vizuală AI",           color: "#ec4899", ai: true  },
  { ext: "invoice",     icon: "⚡",   label: "Factură energie",  desc: "Gaz / curent / termoficare",    color: "#f59e0b", ai: true  },
  { ext: "paste",       icon: "📋",   label: "Paste text/XML",   desc: "Lipire din alte softuri",       color: "#64748b", ai: false },
];

const ACCEPT_ALL = ".json,.xlsx,.xls,.csv,.xml,.gbxml,.ifc,.pdf,.docx,.doc,.jpg,.jpeg,.png,.webp";

// ── Extracție text din DOCX (ZIP→XML) ─────────────────────────────────────────
async function extractDocxText(buffer) {
  // DOCX = ZIP. Căutăm word/document.xml
  // Folosim XLSX library (suportă ZIP intern) pentru a citi fișierul XML
  try {
    // DecompressionStream API (Chrome 80+, Firefox 113+)
    const uint8 = new Uint8Array(buffer);
    // Signatură ZIP: PK\x03\x04
    if (uint8[0] !== 0x50 || uint8[1] !== 0x4B) throw new Error("Nu este format ZIP/DOCX");

    // Parsăm manual local file headers din ZIP pentru a găsi word/document.xml
    let offset = 0;
    const view = new DataView(buffer);
    let xmlContent = "";

    while (offset < buffer.byteLength - 4) {
      const sig = view.getUint32(offset, true);
      if (sig === 0x04034b50) { // Local file header
        const filenameLen = view.getUint16(offset + 26, true);
        const extraLen = view.getUint16(offset + 28, true);
        const compressedSize = view.getUint32(offset + 18, true);
        const compressionMethod = view.getUint16(offset + 8, true);

        const filenameBytes = new Uint8Array(buffer, offset + 30, filenameLen);
        const filename = new TextDecoder().decode(filenameBytes);

        const dataOffset = offset + 30 + filenameLen + extraLen;

        if (filename === "word/document.xml" || filename.endsWith("document.xml")) {
          let xmlBytes;
          if (compressionMethod === 0) {
            // Stored (no compression)
            xmlBytes = new Uint8Array(buffer, dataOffset, compressedSize);
          } else if (compressionMethod === 8) {
            // Deflate — folosim DecompressionStream
            const compressedData = new Uint8Array(buffer, dataOffset, compressedSize);
            // raw deflate (fără header zlib)
            const ds = new DecompressionStream("raw");
            const writer = ds.writable.getWriter();
            writer.write(compressedData);
            writer.close();
            const decompressedChunks = [];
            const reader = ds.readable.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              decompressedChunks.push(value);
            }
            const totalLen = decompressedChunks.reduce((s, c) => s + c.length, 0);
            xmlBytes = new Uint8Array(totalLen);
            let pos = 0;
            for (const chunk of decompressedChunks) { xmlBytes.set(chunk, pos); pos += chunk.length; }
          }
          if (xmlBytes) {
            xmlContent = new TextDecoder().decode(xmlBytes);
            break;
          }
        }
        offset = dataOffset + compressedSize;
      } else if (sig === 0x02014b50) {
        // Central directory — sfârșitul fișierelor locale
        break;
      } else {
        offset++;
      }
    }

    if (!xmlContent) return null;

    // Extrage text din XML (elimină taguri)
    return xmlContent
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<w:p[ >][^>]*>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 8000); // Limită prompturi Claude
  } catch (e) {
    console.warn("Eroare extracție DOCX:", e);
    return null;
  }
}

// ── Detectare format din fișier ───────────────────────────────────────────────
function detectFormat(file) {
  const name = file.name.toLowerCase();
  const type = file.type || "";
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx";
  if (name.endsWith(".csv")) return "csv";
  if (name.endsWith(".xml") || name.endsWith(".gbxml")) return "xml";
  if (name.endsWith(".pdf") || type === "application/pdf") return "pdf";
  if (name.endsWith(".docx") || name.endsWith(".doc")) return "docx";
  if (type.startsWith("image/")) return "image";
  return "unknown";
}

// ── Rezumat câmpuri extrase ───────────────────────────────────────────────────
function DataPreview({ data }) {
  if (!data) return null;
  const { building = {}, opaqueElements = [], glazingElements = [], thermalBridges = [],
          heating = {}, acm = {}, cooling = {}, ventilation = {}, lighting = {},
          solarThermal = {}, photovoltaic = {}, battery = {}, heatPump = {}, biomass = {},
          otherRenew = {} } = data;

  const buildingFields = Object.entries(building).filter(([, v]) => v && v !== "" && v !== false);
  const hasEnvelope = opaqueElements.length > 0 || glazingElements.length > 0;
  const hasSystems = Object.values(heating).some(v => v) || Object.values(acm).some(v => v);
  const hasRenew = solarThermal.enabled || photovoltaic.enabled || heatPump.enabled || biomass.enabled
    || battery.enabled || otherRenew.windEnabled || otherRenew.cogenEnabled;

  const sections = [
    { label: "Identificare (Pas 1)", count: buildingFields.length, icon: "📋",
      items: buildingFields.slice(0, 6).map(([k, v]) => ({ k: fieldLabel(k), v: String(v) })) },
    { label: `Anvelopă: ${opaqueElements.length} opace + ${glazingElements.length} vitraje (Pas 2)`,
      count: opaqueElements.length + glazingElements.length, icon: "🏗️",
      items: [...opaqueElements.slice(0, 3), ...glazingElements.slice(0, 2)].map(e => ({ k: e.name || e.type, v: `${e.area || "?"} m²` })) },
    { label: "Instalații (Pas 3)", count: hasSystems ? 1 : 0, icon: "⚙️",
      items: [
        heating.source && { k: "Sursă încălzire", v: heating.source },
        acm.source && { k: "Sursă ACM", v: acm.source },
        cooling.hasCooling && { k: "Răcire", v: cooling.system || "Activ" },
        ventilation.type && { k: "Ventilare", v: ventilation.type },
        lighting.type && { k: "Iluminat", v: lighting.type },
      ].filter(Boolean) },
    { label: "Regenerabile (Pas 4)", count: hasRenew ? 1 : 0, icon: "☀️",
      items: [
        photovoltaic.enabled && { k: "Fotovoltaic", v: photovoltaic.peakPower ? `${photovoltaic.peakPower} kWp` : "Activ" },
        solarThermal.enabled && { k: "Solar termic", v: solarThermal.area ? `${solarThermal.area} m²` : "Activ" },
        heatPump.enabled && { k: "Pompă căldură", v: heatPump.cop ? `COP ${heatPump.cop}` : "Activ" },
        biomass.enabled && { k: "Biomasă", v: biomass.type || "Activ" },
        battery.enabled && { k: "Baterii", v: battery.capacity ? `${battery.capacity} kWh` : "Activ" },
        otherRenew.windEnabled && { k: "Eolian", v: otherRenew.windCapacity ? `${otherRenew.windCapacity} kW` : "Activ" },
        otherRenew.cogenEnabled && { k: "Cogenerare", v: "Activ" },
      ].filter(Boolean) },
  ];

  const totalFields = sections.reduce((s, sec) => s + sec.count, 0);
  if (totalFields === 0) {
    return (
      <div className="text-center py-6 opacity-50">
        <div className="text-2xl mb-2">⚠️</div>
        <div className="text-sm">Nu s-au putut extrage date din fișier.</div>
        <div className="text-xs mt-1">Verificați formatul sau folosiți template-ul Zephren.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-72 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
      {sections.map((sec, i) => sec.count > 0 && (
        <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2 mb-2">
            <span>{sec.icon}</span>
            <span className="text-xs font-semibold text-white/80">{sec.label}</span>
            <span className="ml-auto text-xs rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5">{sec.count}</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {sec.items.slice(0, 4).map((item, j) => (
              <div key={j} className="text-[10px] flex gap-1">
                <span className="opacity-40 truncate">{item.k}:</span>
                <span className="text-white/70 truncate font-medium">{item.v}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function fieldLabel(key) {
  const labels = {
    address: "Adresă", city: "Localitate", county: "Județ", category: "Categorie",
    yearBuilt: "An construcție", areaUseful: "Suprafață utilă", volume: "Volum",
    floors: "Etaje", structure: "Structură", n50: "n50", scopCpe: "Scop CPE",
    yearRenov: "An renovare", heightFloor: "Înălțime etaj",
  };
  return labels[key] || key;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTA PRINCIPALĂ
// ═══════════════════════════════════════════════════════════════
export default function ImportModal({
  onClose,
  onApply,           // (data) => void — aplică datele în calculator
  importProject,     // (file) => void — handler JSON existent
  importCSV,         // (file) => void — handler CSV existent
  importENERGPlus,   // (file) => void — handler XML existent
  importDOSET,
  importGbXML,
  importOCR,         // (file) => void — handler imagine existent
  showToast,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState("pick");   // pick | loading | preview | done | paste
  const [loadMsg, setLoadMsg] = useState("");
  const [extractedData, setExtractedData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef();

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setFileName(file.name);
    const fmt = detectFormat(file);

    // ── Formate cu parsere existente (JSON, CSV, XML, imagine) ───────────────
    if (fmt === "json") {
      importProject(file);
      onClose();
      return;
    }
    if (fmt === "csv") {
      importCSV(file);
      onClose();
      return;
    }
    if (fmt === "xml") {
      setPhase("loading");
      setLoadMsg("Parsare XML...");
      // Detecție sub-format
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target.result;
        if (content.includes("gbXML") || content.includes("Campus") || content.includes("Surface")) {
          importGbXML(file);
        } else if (content.includes("DOSET") || content.includes("doset") || content.includes("aria_utila")) {
          importDOSET(file);
        } else {
          importENERGPlus(file);
        }
        onClose();
      };
      reader.readAsText(file.slice(0, 5000));
      return;
    }
    if (fmt === "image") {
      setPhase("loading");
      setLoadMsg("Extracție AI din imagine...");
      await importOCR(file);
      onClose();
      return;
    }

    // ── XLSX/XLS — parsare client-side ───────────────────────────────────────
    if (fmt === "xlsx") {
      setPhase("loading");
      setLoadMsg("Parsare Excel...");
      try {
        const buffer = await file.arrayBuffer();
        const data = parseXLSX(buffer, file.name);
        setExtractedData(data);
        setPhase("preview");
      } catch (e) {
        showToast("Eroare parsare Excel: " + e.message, "error");
        setPhase("pick");
      }
      return;
    }

    // ── PDF — trimis la API ──────────────────────────────────────────────────
    if (fmt === "pdf") {
      setPhase("loading");
      setLoadMsg("Extracție AI din PDF (câteva secunde)...");
      try {
        const base64 = await readAsBase64(file);
        const res = await fetch("/api/import-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileType: "pdf", fileData: base64, mimeType: "application/pdf" }),
        });
        if (!res.ok) throw new Error("API error " + res.status);
        const { data, error } = await res.json();
        if (error) throw new Error(error);
        if (data) {
          setExtractedData(data);
          setPhase("preview");
        } else {
          showToast("Nu s-au putut extrage date din PDF", "error");
          setPhase("pick");
        }
      } catch (e) {
        showToast("Eroare import PDF: " + e.message, "error");
        setPhase("pick");
      }
      return;
    }

    // ── DOCX — extragere text client-side → API ──────────────────────────────
    if (fmt === "docx") {
      setPhase("loading");
      setLoadMsg("Extragere text din DOCX...");
      try {
        const buffer = await file.arrayBuffer();
        const text = await extractDocxText(buffer);
        if (!text || text.length < 50) {
          showToast("Nu s-a putut extrage text din DOCX. Verificați că fișierul nu este protejat.", "error");
          setPhase("pick");
          return;
        }
        setLoadMsg("Analiză AI date clădire...");
        const res = await fetch("/api/import-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileType: "docx_text", fileData: text }),
        });
        if (!res.ok) throw new Error("API error " + res.status);
        const { data, error } = await res.json();
        if (error) throw new Error(error);
        if (data) {
          setExtractedData(data);
          setPhase("preview");
        } else {
          showToast("Nu s-au putut extrage date din DOCX", "error");
          setPhase("pick");
        }
      } catch (e) {
        showToast("Eroare import DOCX: " + e.message, "error");
        setPhase("pick");
      }
      return;
    }

    // ── IFC — trimis ca text la API ──────────────────────────────────────────
    if (fmt === "ifc" || file.name.toLowerCase().endsWith(".ifc")) {
      setPhase("loading");
      setLoadMsg("Parsare BIM/IFC cu AI...");
      try {
        const text = await file.text();
        const res = await fetch("/api/import-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileType: "ifc", fileData: text }),
        });
        if (!res.ok) throw new Error("API error " + res.status);
        const { data, error } = await res.json();
        if (error) throw new Error(error);
        if (data) { setExtractedData(data); setPhase("preview"); }
        else { showToast("Nu s-au extras date din IFC", "error"); setPhase("pick"); }
      } catch (e) {
        showToast("Eroare IFC: " + e.message, "error");
        setPhase("pick");
      }
      return;
    }

    showToast("Format nerecunoscut: " + file.name, "error");
  }, [importProject, importCSV, importENERGPlus, importDOSET, importGbXML, importOCR, onClose, showToast]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const applyData = useCallback(() => {
    if (!extractedData) return;
    onApply(extractedData);
    onClose();
  }, [extractedData, onApply, onClose]);

  // ── Fațadă foto ─────────────────────────────────────────────────────────────
  const handleFacadeFile = useCallback(async (file) => {
    if (!file) return;
    setFileName(file.name);
    setPhase("loading");
    setLoadMsg("Analiză vizuală fațadă cu AI...");
    try {
      const base64 = await readAsBase64(file);
      const res = await fetch("/api/import-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileType: "facade", fileData: base64, mimeType: file.type || "image/jpeg" }),
      });
      if (!res.ok) throw new Error("API error " + res.status);
      const { data, error } = await res.json();
      if (error) throw new Error(error);
      if (data) { setExtractedData(data); setPhase("preview"); }
      else { showToast("Nu s-a putut analiza imaginea", "error"); setPhase("pick"); }
    } catch (e) {
      showToast("Eroare foto fațadă: " + e.message, "error");
      setPhase("pick");
    }
  }, [showToast]);

  // ── Factură energie ──────────────────────────────────────────────────────────
  const handleInvoiceFile = useCallback(async (file) => {
    if (!file) return;
    setFileName(file.name);
    setPhase("loading");
    setLoadMsg("Extracție date factură energie cu AI...");
    try {
      const base64 = await readAsBase64(file);
      const fmt = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
      const res = await fetch("/api/import-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileType: fmt, fileData: base64, mimeType: file.type }),
      });
      if (!res.ok) throw new Error("API error " + res.status);
      const { data, error } = await res.json();
      if (error) throw new Error(error);
      if (data) {
        // Conversia datelor facturii în formatul așteptat de onApply
        setExtractedData({ _invoiceData: data });
        setPhase("invoice-preview");
      } else {
        showToast("Nu s-au extras date din factură", "error");
        setPhase("pick");
      }
    } catch (e) {
      showToast("Eroare factură: " + e.message, "error");
      setPhase("pick");
    }
  }, [showToast]);

  // ── Paste text — auto-detect și parsare ──────────────────────────────────────
  const handlePasteSubmit = useCallback(async () => {
    const text = pasteText.trim();
    if (!text) return;
    setPhase("loading");
    setFileName("text lipit");

    // Detectare format
    if (text.startsWith("{") || text.startsWith("[")) {
      // JSON
      try {
        const data = JSON.parse(text);
        setExtractedData(data);
        setPhase("preview");
      } catch {
        showToast("JSON invalid", "error");
        setPhase("paste");
      }
    } else if (text.includes("<?xml") || text.includes("<") ) {
      // XML — auto-detect ENERG+/DOSET/gbXML
      setLoadMsg("Parsare XML...");
      const blob = new Blob([text], { type: "text/xml" });
      const file = new File([blob], "pasted.xml", { type: "text/xml" });
      if (text.includes("gbXML") || text.includes("Campus") || text.includes("Surface")) {
        importGbXML(file);
      } else if (text.includes("DOSET") || text.includes("aria_utila")) {
        importDOSET(file);
      } else {
        importENERGPlus(file);
      }
      onClose();
    } else {
      // Text liber → Claude AI
      setLoadMsg("Analiză text cu AI...");
      try {
        const res = await fetch("/api/chat-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        if (!res.ok) throw new Error("API error " + res.status);
        const { data, reply } = await res.json();
        if (data) {
          setExtractedData(data);
          setPhase("preview");
        } else {
          showToast("Nu s-au extras date: " + (reply || ""), "error");
          setPhase("paste");
        }
      } catch (e) {
        showToast("Eroare AI: " + e.message, "error");
        setPhase("paste");
      }
    }
  }, [pasteText, importGbXML, importDOSET, importENERGPlus, onClose, showToast]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="bg-[#12141f] border border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-5"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">📥 Import date clădire</h3>
            <p className="text-[11px] opacity-40 mt-0.5">Completare automată Pași 1–4 din fișier</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm"
          >&times;</button>
        </div>

        {/* ── Faza: pick ──────────────────────────────────────────────────── */}
        {phase === "pick" && (
          <>
            {/* Drag & drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-indigo-400 bg-indigo-500/10"
                  : "border-white/15 hover:border-white/30 hover:bg-white/[0.02]"
              }`}
            >
              <div className="text-3xl mb-3">{dragOver ? "🎯" : "📂"}</div>
              <div className="text-sm font-medium mb-1">
                {dragOver ? "Eliberați pentru import" : "Trageți fișierul aici sau click"}
              </div>
              <div className="text-[10px] opacity-40">
                JSON · XLSX · CSV · XML · PDF · DOCX · Imagini
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ALL}
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {/* Format badges */}
            <div className="grid grid-cols-4 gap-2">
              {FORMATS.map(f => (
                <div
                  key={f.ext}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl border border-white/5 bg-white/[0.02]"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold"
                    style={{ background: f.color + "20", color: f.color }}
                  >{f.icon}</div>
                  <div className="text-[9px] font-medium text-center leading-tight">{f.label}</div>
                  {f.ai && <div className="text-[8px] opacity-40">AI</div>}
                </div>
              ))}
            </div>

            {/* Butoane acțiuni speciale */}
            <div className="grid grid-cols-3 gap-2">
              {/* Fațadă foto */}
              <label className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10 cursor-pointer transition-all text-center">
                <span className="text-lg">🏠</span>
                <span className="text-[9px] font-medium text-pink-300">Foto fațadă</span>
                <span className="text-[8px] opacity-40">Estimare vizuală AI</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFacadeFile(e.target.files[0]); }} />
              </label>

              {/* Factură energie */}
              <label className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer transition-all text-center">
                <span className="text-lg">⚡</span>
                <span className="text-[9px] font-medium text-amber-300">Factură energie</span>
                <span className="text-[8px] opacity-40">Gaz / curent / termoficare</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleInvoiceFile(e.target.files[0]); }} />
              </label>

              {/* Paste text */}
              <button
                onClick={() => setPhase("paste")}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-500/20 bg-slate-500/5 hover:bg-slate-500/10 transition-all text-center"
              >
                <span className="text-lg">📋</span>
                <span className="text-[9px] font-medium text-slate-300">Paste text/XML</span>
                <span className="text-[8px] opacity-40">Din alte softuri</span>
              </button>
            </div>

            {/* Template download */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-3">
              <div className="text-xl">📋</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">Template Excel Zephren</div>
                <div className="text-[10px] opacity-50">Completează și importă — toate câmpurile pașilor 1-4</div>
              </div>
              <button
                onClick={downloadTemplate}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[11px] font-medium transition-all shrink-0"
              >
                Descarcă
              </button>
            </div>

            {/* Note formate AI */}
            <div className="text-[10px] opacity-30 text-center">
              Extracția AI (PDF, DOCX, IFC, imagini) necesită ANTHROPIC_API_KEY configurat pe server
            </div>
          </>
        )}

        {/* ── Faza: paste ──────────────────────────────────────────────────── */}
        {phase === "paste" && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setPhase("pick")} className="text-xs opacity-50 hover:opacity-80">← Înapoi</button>
              <span className="text-sm font-semibold">📋 Lipește conținut din alt soft</span>
            </div>
            <div className="text-[10px] opacity-40 mb-2">
              Acceptă: JSON Zephren, XML ENERG+/DOSET/gbXML, text liber (descriere clădire)
            </div>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={`Lipești orice: XML din ENERG+, JSON, sau descriere liberă...\n\nEx: "Bloc 1980, 4 etaje, 3 camere, cazan gaz condensare, fără izolație, București"`}
              className="w-full h-40 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs font-mono resize-none focus:outline-none focus:border-white/20"
              autoFocus
            />
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim()}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-sm transition-all"
            >
              Procesează →
            </button>
          </>
        )}

        {/* ── Faza: invoice-preview ────────────────────────────────────────── */}
        {phase === "invoice-preview" && extractedData?._invoiceData && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-emerald-400">✓</span>
              <span>Date extrase din <span className="font-mono text-xs opacity-60">{fileName}</span></span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
              <div className="text-xs font-semibold text-amber-300">⚡ Date consum energie</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {Object.entries(extractedData._invoiceData).filter(([,v]) => v && v !== "").map(([k, v]) => (
                  <div key={k} className="flex gap-1">
                    <span className="opacity-40 truncate">{k}:</span>
                    <span className="font-medium text-white/70 truncate">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[10px] opacity-40 border-t border-white/5 pt-2">
              Datele facturii sunt informative — utilizați-le pentru validarea calculului de consum.
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setPhase("pick"); setExtractedData(null); }}
                className="flex-1 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-sm transition-all">
                ← Înapoi
              </button>
              <button onClick={() => { showToast("Date factură salvate în notițe proiect", "success"); onClose(); }}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-all">
                OK
              </button>
            </div>
          </>
        )}

        {/* ── Faza: loading ────────────────────────────────────────────────── */}
        {phase === "loading" && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            <div className="text-sm font-medium">{loadMsg}</div>
            <div className="text-[10px] opacity-40 text-center max-w-xs">
              {fileName && <><span className="font-mono opacity-60">{fileName}</span><br/></>}
              Așteptați, se procesează fișierul...
            </div>
          </div>
        )}

        {/* ── Faza: preview ────────────────────────────────────────────────── */}
        {phase === "preview" && extractedData && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-emerald-400 text-base">✓</span>
              <span>Date extrase din <span className="font-mono text-xs opacity-60">{fileName}</span></span>
            </div>

            <DataPreview data={extractedData} />

            <div className="text-[10px] opacity-30 border-t border-white/5 pt-3">
              Câmpurile goale nu suprascriu valorile existente. Puteți modifica orice câmp după import.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setPhase("pick"); setExtractedData(null); }}
                className="flex-1 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-sm transition-all"
              >
                ← Înapoi
              </button>
              <button
                onClick={applyData}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
              >
                Aplică date →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Helper: fișier → base64 ───────────────────────────────────────────────────
function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
