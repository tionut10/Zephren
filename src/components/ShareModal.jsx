/**
 * ShareModal — partajare proiect prin link scurt + cod QR
 * Codifică starea proiectului (Pașii 1–4) în URL base64.
 * Tab "Colaborare" — editabil; Tab "Raport Client" — read-only cu rezultate.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";

// ── Compresie minimă base64 (fără lib extern) ─────────────────────────────────
function encodeState(state) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  } catch { return null; }
}

function decodeState(encoded) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch { return null; }
}

// ── Extrage doar datele relevante Pași 1-4 ────────────────────────────────────
function extractShareableData(projectState) {
  const {
    building, opaqueElements, glazingElements, thermalBridges,
    heating, acm, cooling, ventilation, lighting,
    solarThermal, photovoltaic, heatPump, biomass
  } = projectState;

  // Curăță câmpuri goale pentru a reduce dimensiunea URL-ului
  const clean = (obj) => {
    if (!obj) return obj;
    if (Array.isArray(obj)) return obj.filter(el => el && Object.values(el).some(v => v));
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== null && v !== undefined));
  };

  return {
    b: clean(building),
    oe: (opaqueElements || []).slice(0, 20).map(e => ({ n: e.name, t: e.type, a: e.area, u: e.uValue, o: e.orientation })),
    ge: (glazingElements || []).slice(0, 10).map(e => ({ n: e.name, a: e.area, u: e.u, g: e.g, o: e.orientation })),
    tb: (thermalBridges || []).slice(0, 10).map(e => ({ n: e.name, t: e.type, p: e.psi, l: e.length })),
    h: clean(heating),
    ac: clean(acm),
    c: clean(cooling),
    v: clean(ventilation),
    l: clean(lighting),
    st: clean(solarThermal),
    pv: clean(photovoltaic),
    hp: clean(heatPump),
    bm: clean(biomass),
  };
}

// ── Reconstituie starea din datele comprimate ─────────────────────────────────
export function decodeShareableData(compressed) {
  if (!compressed) return null;
  const d = compressed;
  return {
    building: d.b || {},
    opaqueElements: (d.oe || []).map(e => ({ name: e.n, type: e.t, area: e.a, uValue: e.u, orientation: e.o, tau: 1, layers: [] })),
    glazingElements: (d.ge || []).map(e => ({ name: e.n, area: e.a, u: e.u, g: e.g, orientation: e.o, frameRatio: "25", type: "" })),
    thermalBridges: (d.tb || []).map(e => ({ name: e.n, type: e.t, psi: e.p, length: e.l })),
    heating: d.h || {},
    acm: d.ac || {},
    cooling: d.c || {},
    ventilation: d.v || {},
    lighting: d.l || {},
    solarThermal: d.st || {},
    photovoltaic: d.pv || {},
    heatPump: d.hp || {},
    biomass: d.bm || {},
  };
}

// ── Codifică rezultatele pentru raportul client ────────────────────────────────
function extractClientReport(projectState) {
  const { building, instSummary, renewSummary, energyClass, co2Class, rer } = projectState;
  return {
    b: {
      addr: building?.address || "",
      city: building?.city || "",
      cat: building?.category || "",
      au: building?.areaUseful || 0,
      year: building?.yearConstruction || "",
    },
    s: instSummary ? {
      ep: instSummary.ep_total_m2,
      co2: instSummary.co2_total_m2,
      qfH: instSummary.qf_h,
      qfW: instSummary.qf_w,
      qfC: instSummary.qf_c,
      qfV: instSummary.qf_v,
      qfL: instSummary.qf_l,
    } : null,
    r: renewSummary ? {
      ep: renewSummary.ep_adjusted_m2,
      co2: renewSummary.co2_adjusted_m2,
      rer: renewSummary.rer,
    } : null,
    ec: energyClass || null,
    cc: co2Class || null,
    ro: 1, // read-only flag
  };
}

export default function ShareModal({ projectState, onClose, showToast }) {
  const [shareTab, setShareTab] = useState("collab"); // "collab" | "client"
  const [shareUrl, setShareUrl] = useState("");
  const [clientUrl, setClientUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [clientQrDataUrl, setClientQrDataUrl] = useState("");
  const [urlSize, setUrlSize] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copiedClient, setCopiedClient] = useState(false);
  const canvasRef = useRef();

  useEffect(() => {
    const base = window.location.origin + window.location.pathname;

    // URL colaborare (editabil)
    const compressed = extractShareableData(projectState);
    const encoded = encodeState(compressed);
    if (encoded) {
      const url = `${base}?import=${encoded}`;
      setShareUrl(url);
      setUrlSize(Math.round(url.length / 1024 * 10) / 10);
      QRCode.toDataURL(url, {
        width: 200, margin: 1,
        color: { dark: "#ffffff", light: "#12141f" },
        errorCorrectionLevel: url.length > 2000 ? "L" : "M",
      }).then(setQrDataUrl).catch(() => {});
    }

    // URL raport client (read-only)
    const clientData = extractClientReport(projectState);
    const clientEncoded = encodeState(clientData);
    if (clientEncoded) {
      const cUrl = `${base}?view=${clientEncoded}`;
      setClientUrl(cUrl);
      QRCode.toDataURL(cUrl, {
        width: 200, margin: 1,
        color: { dark: "#ffffff", light: "#12141f" },
        errorCorrectionLevel: "M",
      }).then(setClientQrDataUrl).catch(() => {});
    }
  }, [projectState]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Nu s-a putut copia link-ul", "error");
    }
  }, [shareUrl, showToast]);

  const copyClientLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(clientUrl);
      setCopiedClient(true);
      setTimeout(() => setCopiedClient(false), 2000);
    } catch {
      showToast("Nu s-a putut copia link-ul", "error");
    }
  }, [clientUrl, showToast]);

  const { building } = projectState;
  const projectTitle = [building?.address, building?.city].filter(Boolean).join(", ") || "Proiect Zephren";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="bg-[#12141f] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">🔗 Partajare proiect</h3>
            <p className="text-[11px] opacity-40 mt-0.5">{projectTitle}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
          <button onClick={() => setShareTab("collab")}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${shareTab === "collab" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "hover:bg-white/5"}`}>
            🤝 Colaborare
          </button>
          <button onClick={() => setShareTab("client")}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${shareTab === "client" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "hover:bg-white/5"}`}>
            👁 Raport Client
          </button>
        </div>

        {/* ── Tab Colaborare ── */}
        {shareTab === "collab" && (<>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] opacity-40">
              Pași 1–4 · {projectState.opaqueElements?.length || 0} elem. opace · {projectState.glazingElements?.length || 0} vitraje · {urlSize}KB
            </div>
            <div className="text-[10px] opacity-60 mt-1">Destinatarul poate edita și continua calculul.</div>
          </div>

          {qrDataUrl ? (
            <div className="flex justify-center">
              <div className="p-3 rounded-2xl bg-[#12141f] border border-white/10">
                <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 rounded-lg" />
              </div>
            </div>
          ) : shareUrl && (
            <div className="text-center py-4 opacity-40 text-xs">
              {urlSize > 3 ? "URL prea lung pentru QR — copiați link-ul direct" : "Generare QR..."}
            </div>
          )}

          <div className="space-y-2">
            <div className="text-[10px] opacity-50 font-medium">LINK COLABORARE (editabil)</div>
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-mono opacity-60 truncate">
                {shareUrl.slice(0, 60)}{shareUrl.length > 60 ? "..." : ""}
              </div>
              <button onClick={copyLink}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 ${copied ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 hover:bg-white/20"}`}>
                {copied ? "✓ Copiat" : "Copiază"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-1">
            <div className="text-xs font-semibold text-indigo-300">Cum funcționează</div>
            <div className="text-[10px] opacity-60 space-y-1">
              <div>1. Copiați link-ul sau scanați QR-ul</div>
              <div>2. Destinatarul completează câmpurile lipsă</div>
              <div>3. Continuă calculul și exportul certificat</div>
            </div>
          </div>

          {urlSize > 4 && (
            <div className="text-[10px] opacity-40 text-center">
              ⚠️ Link lung ({urlSize}KB) — unele aplicații email pot trunchia URL-uri lungi.
            </div>
          )}
        </>)}

        {/* ── Tab Raport Client ── */}
        {shareTab === "client" && (<>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
            <div className="text-xs font-semibold text-emerald-300">🔒 Vizualizare read-only</div>
            <div className="text-[10px] opacity-60">
              Clientul vede doar rezultatele (clasă energetică, consum, emisii CO₂).
              Nu poate edita datele proiectului.
            </div>
          </div>

          {clientQrDataUrl ? (
            <div className="flex justify-center">
              <div className="p-3 rounded-2xl bg-[#12141f] border border-emerald-500/20">
                <img src={clientQrDataUrl} alt="QR Client" className="w-40 h-40 rounded-lg" />
              </div>
            </div>
          ) : (
            <div className="text-center py-4 opacity-40 text-xs">Generare QR...</div>
          )}

          <div className="space-y-2">
            <div className="text-[10px] opacity-50 font-medium">LINK RAPORT CLIENT (read-only)</div>
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-mono opacity-60 truncate">
                {clientUrl.slice(0, 60)}{clientUrl.length > 60 ? "..." : ""}
              </div>
              <button onClick={copyClientLink}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 ${copiedClient ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 hover:bg-white/20"}`}>
                {copiedClient ? "✓ Copiat" : "Copiază"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1">
            <div className="text-[10px] opacity-50 font-medium">CONȚINUT RAPORT</div>
            <div className="text-[10px] opacity-60 space-y-0.5">
              <div>• Adresa și categoria clădirii</div>
              <div>• Clasă energetică (A+ → G) + clasă CO₂</div>
              <div>• Consum energie primară [kWh/m²an]</div>
              <div>• Emisii CO₂ [kg CO₂/m²an]</div>
              <div>• Defalcare consum pe utilități</div>
              <div>• Cotă surse regenerabile (RER %)</div>
            </div>
          </div>
        </>)}

        <button onClick={onClose} className="w-full py-2 rounded-xl border border-white/10 hover:bg-white/5 text-sm transition-all">
          Închide
        </button>
      </div>
    </div>
  );
}
