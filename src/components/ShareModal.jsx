/**
 * ShareModal — partajare proiect prin link scurt + cod QR
 * Codifică starea proiectului (Pașii 1–4) în URL base64.
 * Clientul deschide link-ul pe mobil și completează un formular simplificat.
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

export default function ShareModal({ projectState, onClose, showToast }) {
  const [shareUrl, setShareUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [urlSize, setUrlSize] = useState(0);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef();

  useEffect(() => {
    const compressed = extractShareableData(projectState);
    const encoded = encodeState(compressed);
    if (!encoded) return;

    const base = window.location.origin + window.location.pathname;
    const url = `${base}?import=${encoded}`;
    setShareUrl(url);
    setUrlSize(Math.round(url.length / 1024 * 10) / 10);

    // Generare QR code
    QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: { dark: "#ffffff", light: "#12141f" },
      errorCorrectionLevel: url.length > 2000 ? "L" : "M",
    }).then(dataUrl => {
      setQrDataUrl(dataUrl);
    }).catch(() => {
      // URL prea lung pentru QR — afișăm doar link-ul
    });
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
            <p className="text-[11px] opacity-40 mt-0.5">Link + QR cod pentru acces rapid</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">&times;</button>
        </div>

        {/* Info proiect */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="text-xs font-semibold truncate">{projectTitle}</div>
          <div className="text-[10px] opacity-40 mt-0.5">
            Pași 1–4 ·{" "}
            {projectState.opaqueElements?.length || 0} elem. opace ·{" "}
            {projectState.glazingElements?.length || 0} vitraje ·{" "}
            {urlSize}KB
          </div>
        </div>

        {/* QR Code */}
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

        {/* Link copiabil */}
        <div className="space-y-2">
          <div className="text-[10px] opacity-50 font-medium">LINK PARTAJARE</div>
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-mono opacity-60 truncate">
              {shareUrl.slice(0, 60)}{shareUrl.length > 60 ? "..." : ""}
            </div>
            <button
              onClick={copyLink}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 ${
                copied
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {copied ? "✓ Copiat" : "Copiază"}
            </button>
          </div>
        </div>

        {/* Instrucțiuni */}
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-1.5">
          <div className="text-xs font-semibold text-indigo-300">Cum funcționează</div>
          <div className="text-[10px] opacity-60 space-y-1">
            <div>1. Copiați link-ul sau scanați QR-ul</div>
            <div>2. Deschideți în orice browser (mobil sau desktop)</div>
            <div>3. Calculatorul Zephren se deschide cu datele preîncărcate</div>
            <div>4. Completați câmpurile lipsă și continuați calculul</div>
          </div>
        </div>

        {/* Avertisment dimensiune */}
        {urlSize > 4 && (
          <div className="text-[10px] opacity-40 text-center">
            ⚠️ Link lung ({urlSize}KB) — funcționează în toate browserele moderne, dar unele aplicații email pot trunchia URL-uri lungi.
          </div>
        )}

        <button onClick={onClose} className="w-full py-2 rounded-xl border border-white/10 hover:bg-white/5 text-sm transition-all">
          Închide
        </button>
      </div>
    </div>
  );
}
