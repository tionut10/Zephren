/**
 * MobileWizard.jsx
 * Wizard simplificat, optimizat mobil, pentru colectare date de audit pe teren.
 * Salvează proiectul direct în IndexedDB (fără props drilling).
 * Accesibil via ruta /mobile sau ?mobile=1
 */
import { useState, useCallback } from "react";
import { ZephrenDB } from "../lib/indexed-db.js";

const BUILDING_TYPES = [
  { id: "RI",  label: "Casă / Vilă",  icon: "🏠", tplId: "VILA_P1M_2005" },
  { id: "RC",  label: "Bloc / Apar.", icon: "🏢", tplId: "APT2_BLOC_P4_70" },
  { id: "BI",  label: "Birou",        icon: "🏦", tplId: "BIROURI_P3_2010" },
  { id: "ED",  label: "Școală",       icon: "🏫", tplId: "SCOALA_P1_80" },
  { id: "HO",  label: "Hotel",        icon: "🏨", tplId: "HOTEL_P5_1995" },
  { id: "CO",  label: "Comerț",       icon: "🛒", tplId: "SUPERMARKET_P" },
];

const ENVELOPE_OPTIONS = [
  {
    id: "poor",
    label: "Neizolat",
    desc: "Pereți zidărie fără izolație, ferestre lemn simplu sau dublu",
    icon: "🧱",
    wallU: 1.5, roofU: 1.0, windowU: 2.5,
  },
  {
    id: "medium",
    label: "Parțial izolat",
    desc: "Izolație de bază (EPS 5–8 cm), ferestre PVC dublu vitraj",
    icon: "🔶",
    wallU: 0.7, roofU: 0.5, windowU: 1.6,
  },
  {
    id: "good",
    label: "Bine izolat",
    desc: "Izolație EPS 12+ cm sau vată, ferestre PVC triplu Low-E",
    icon: "⭐",
    wallU: 0.3, roofU: 0.2, windowU: 1.0,
  },
];

const HEATING_TYPES = [
  { id: "gaz",      label: "Gaz natural",     icon: "🔥" },
  { id: "pompa",    label: "Pompă de căldură", icon: "♨️" },
  { id: "electric", label: "Electric",         icon: "⚡" },
  { id: "district", label: "Termoficare",      icon: "🏭" },
  { id: "biomasa",  label: "Biomasă/lemne",    icon: "🪵" },
  { id: "altul",    label: "Altul",            icon: "❓" },
];

const VENT_TYPES = [
  { id: "natural",    label: "Naturală",        icon: "🌬️" },
  { id: "mecanica",   label: "Mecanică",         icon: "💨" },
  { id: "vmc_hr",     label: "VMC cu recuperare", icon: "🔄" },
];

const STEPS_COUNT = 5;
const STEP_LABELS = ["Clădire", "Anvelopă", "Sisteme", "Foto", "Salvare"];

function ProgressBar({ step }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className={`h-1.5 w-full rounded-full transition-all ${i < step ? "bg-amber-400" : i === step ? "bg-amber-500" : "bg-white/10"}`} />
          <span className={`text-[9px] ${i === step ? "text-amber-300" : "text-white/30"}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function BigButton({ onClick, children, variant = "primary" }) {
  const cls = variant === "primary"
    ? "bg-amber-500 active:bg-amber-400 text-black font-bold"
    : variant === "secondary"
    ? "bg-white/10 active:bg-white/15 text-white"
    : "bg-white/5 border border-white/10 text-white/60";
  return (
    <button onClick={onClick}
      className={`w-full py-4 rounded-2xl text-base transition-all ${cls}`}
      style={{ minHeight: 56, touchAction: "manipulation" }}>
      {children}
    </button>
  );
}

export default function MobileWizard({ userPlan, onFinish }) {
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState(null);

  // Datele colectate
  const [buildingType, setBuildingType] = useState(null);
  const [yearBuilt, setYearBuilt] = useState(1980);
  const [areaUseful, setAreaUseful] = useState("");
  const [locality, setLocality] = useState("");
  const [envelope, setEnvelope] = useState(null);
  const [heating, setHeating] = useState(null);
  const [ventilation, setVentilation] = useState(null);
  const [photos, setPhotos] = useState([]);

  const canNext = [
    buildingType !== null,
    envelope !== null,
    heating !== null,
    true,
    true,
  ][step];

  const handlePhotos = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map(f => ({
      name: f.name,
      url: URL.createObjectURL(f),
      size: f.size,
    }));
    setPhotos(p => [...p, ...newPhotos]);
  }, []);

  const handleSave = useCallback(async () => {
    const id = `mobile_${Date.now()}`;
    const envOpt = ENVELOPE_OPTIONS.find(o => o.id === envelope) || ENVELOPE_OPTIONS[1];
    const btType = BUILDING_TYPES.find(t => t.id === buildingType) || BUILDING_TYPES[0];

    const data = {
      id,
      name: `${btType.label} — ${locality || "fără localitate"} (mobil)`,
      savedFrom: "mobile_wizard",
      timestamp: new Date().toISOString(),
      building: {
        category: buildingType || "RI",
        address: locality || "",
        yearBuilt: String(yearBuilt),
        areaUseful: String(areaUseful || ""),
        structure: "Necunoscută",
      },
      opaqueElements: [
        {
          name: "Pereți exteriori (estimat)",
          type: "PE",
          area: String(Math.round((parseFloat(areaUseful) || 100) * 0.6)),
          layers: [],
          u_override: envOpt.wallU,
        },
        {
          name: "Plafon/acoperiș (estimat)",
          type: "PT",
          area: String(Math.round((parseFloat(areaUseful) || 100) * 0.3)),
          layers: [],
          u_override: envOpt.roofU,
        },
      ],
      glazingElements: [
        {
          name: "Ferestre (estimat)",
          area: String(Math.round((parseFloat(areaUseful) || 100) * 0.15)),
          u: String(envOpt.windowU),
          g: "0.6",
          orientation: "Mixt",
        },
      ],
      heating: {
        source: heating || "gaz",
        eta_gen: heating === "pompa" ? 3.0 : heating === "electric" ? 1.0 : 0.88,
      },
      ventilation: {
        type: ventilation || "natural",
        efficiency: ventilation === "vmc_hr" ? 0.75 : 0,
      },
      buildingPhotos: photos.map(p => ({ url: p.url, name: p.name })),
      _mobile: true,
    };

    try {
      await ZephrenDB.saveProject(id, data);
      setSavedId(id);
      setSaved(true);
    } catch {
      // Fallback localStorage
      try {
        localStorage.setItem(`zephren_project_${id}`, JSON.stringify(data));
        setSavedId(id);
        setSaved(true);
      } catch {
        alert("Nu s-a putut salva proiectul. Verificați spațiul de stocare.");
      }
    }
  }, [buildingType, yearBuilt, areaUseful, locality, envelope, heating, ventilation, photos]);

  // ── Paywall pentru Free ──
  if (userPlan === "free") {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
        <div className="max-w-xs w-full text-center">
          <div className="text-5xl mb-4">📱</div>
          <h1 className="text-xl font-bold text-white mb-2">Wizard Mobil</h1>
          <p className="text-sm text-white/50 mb-6">Colectare rapidă de date pe teren, sincronizare automată cu aplicația desktop</p>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-4">
            <p className="text-sm text-amber-300 font-medium">Disponibil din planul Standard</p>
          </div>
          <a href="/" className="block w-full py-4 rounded-2xl bg-white/10 text-white text-base font-medium text-center">
            ← Înapoi la aplicație
          </a>
        </div>
      </div>
    );
  }

  // ── Ecran succes ──
  if (saved) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
        <div className="max-w-xs w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-white mb-2">Proiect salvat!</h1>
          <p className="text-sm text-white/50 mb-6">
            Datele au fost salvate local și vor fi disponibile în aplicația desktop.
          </p>
          <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-4 mb-5 text-left">
            <div className="text-xs text-slate-400">ID proiect:</div>
            <div className="text-xs font-mono text-green-300 mt-0.5 break-all">{savedId}</div>
          </div>
          <a href="/" className="block w-full py-4 rounded-2xl bg-amber-500 text-black text-base font-bold text-center mb-2">
            Deschide pe desktop →
          </a>
          <button onClick={() => { setSaved(false); setStep(0); setBuildingType(null); setEnvelope(null); setHeating(null); setVentilation(null); setPhotos([]); }}
            className="w-full py-4 rounded-2xl bg-white/5 text-white/60 text-base">
            + Proiect nou
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col" style={{ maxWidth: 480, margin: "0 auto" }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold">🏗️ Audit rapid</h1>
          <a href="/" className="text-xs text-white/30 hover:text-white/60">✕ Ieși</a>
        </div>
        <ProgressBar step={step} />
      </div>

      {/* Conținut pas */}
      <div className="flex-1 px-5 pb-4 overflow-y-auto">

        {/* Pas 0 — Clădire */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Tip clădire</h2>
            <div className="grid grid-cols-3 gap-2">
              {BUILDING_TYPES.map(bt => (
                <button key={bt.id}
                  onClick={() => setBuildingType(bt.id)}
                  style={{ touchAction: "manipulation", minHeight: 72 }}
                  className={`rounded-2xl border p-3 flex flex-col items-center gap-1 transition-all ${
                    buildingType === bt.id
                      ? "border-amber-500 bg-amber-500/20"
                      : "border-white/10 bg-white/5"
                  }`}>
                  <span className="text-2xl">{bt.icon}</span>
                  <span className="text-[11px] text-center leading-tight">{bt.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-white/50 block mb-1">An construcție: <strong className="text-white">{yearBuilt}</strong></label>
                <input type="range" min={1920} max={2024} step={5}
                  value={yearBuilt} onChange={e => setYearBuilt(parseInt(e.target.value))}
                  className="w-full accent-amber-500" style={{ touchAction: "manipulation" }} />
                <div className="flex justify-between text-[10px] text-white/30 mt-0.5">
                  <span>1920</span><span>1970</span><span>2000</span><span>2024</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Suprafață utilă (m²)</label>
                <input type="number" inputMode="decimal" value={areaUseful}
                  onChange={e => setAreaUseful(e.target.value)}
                  placeholder="ex: 150"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50"
                  style={{ fontSize: 16 }} />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Localitate</label>
                <input type="text" value={locality}
                  onChange={e => setLocality(e.target.value)}
                  placeholder="ex: Cluj-Napoca"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50"
                  style={{ fontSize: 16 }} />
              </div>
            </div>
          </div>
        )}

        {/* Pas 1 — Anvelopă */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Starea anvelopei</h2>
            <p className="text-xs text-white/40">Estimați nivelul de izolație al clădirii</p>
            {ENVELOPE_OPTIONS.map(opt => (
              <button key={opt.id}
                onClick={() => setEnvelope(opt.id)}
                style={{ touchAction: "manipulation", minHeight: 72 }}
                className={`w-full text-left rounded-2xl border p-4 transition-all ${
                  envelope === opt.id
                    ? "border-amber-500 bg-amber-500/15"
                    : "border-white/10 bg-white/5"
                }`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{opt.icon}</span>
                  <div>
                    <div className="font-semibold text-base">{opt.label}</div>
                    <div className="text-xs text-white/50 mt-0.5">{opt.desc}</div>
                    <div className="text-[10px] text-white/30 mt-1">
                      U pereți: {opt.wallU} · U acoperiș: {opt.roofU} · U ferestre: {opt.windowU} W/(m²K)
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pas 2 — Sisteme */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold mb-3">Sistem de încălzire</h2>
              <div className="grid grid-cols-3 gap-2">
                {HEATING_TYPES.map(ht => (
                  <button key={ht.id}
                    onClick={() => setHeating(ht.id)}
                    style={{ touchAction: "manipulation", minHeight: 64 }}
                    className={`rounded-2xl border p-2.5 flex flex-col items-center gap-1 transition-all ${
                      heating === ht.id
                        ? "border-amber-500 bg-amber-500/20"
                        : "border-white/10 bg-white/5"
                    }`}>
                    <span className="text-xl">{ht.icon}</span>
                    <span className="text-[10px] text-center leading-tight">{ht.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-base font-semibold mb-3">Ventilare</h2>
              <div className="grid grid-cols-3 gap-2">
                {VENT_TYPES.map(vt => (
                  <button key={vt.id}
                    onClick={() => setVentilation(vt.id)}
                    style={{ touchAction: "manipulation", minHeight: 64 }}
                    className={`rounded-2xl border p-2.5 flex flex-col items-center gap-1 transition-all ${
                      ventilation === vt.id
                        ? "border-amber-500 bg-amber-500/20"
                        : "border-white/10 bg-white/5"
                    }`}>
                    <span className="text-xl">{vt.icon}</span>
                    <span className="text-[10px] text-center leading-tight">{vt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pas 3 — Foto */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Fotografii clădire</h2>
            <p className="text-xs text-white/40">Opțional — faceți poze fațadelor, detaliilor problematice</p>

            <label className="block w-full">
              <div className="border-2 border-dashed border-white/20 rounded-2xl p-6 text-center cursor-pointer active:bg-white/5 transition-all"
                style={{ touchAction: "manipulation" }}>
                <div className="text-4xl mb-2">📷</div>
                <div className="text-sm text-white/60">Apasă pentru a face poze</div>
                <div className="text-xs text-white/30 mt-1">sau selectează din galerie</div>
              </div>
              <input type="file" accept="image/*" capture="environment" multiple
                onChange={handlePhotos}
                className="hidden" />
            </label>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
                    <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-white/30">
              {photos.length > 0 ? `${photos.length} ${photos.length === 1 ? "fotografie adăugată" : "fotografii adăugate"}` : "Nicio fotografie"}
            </p>
          </div>
        )}

        {/* Pas 4 — Salvare / Sumar */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Sumar proiect</h2>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5">
              {[
                { label: "Tip", value: BUILDING_TYPES.find(t => t.id === buildingType)?.label || "—" },
                { label: "An construcție", value: yearBuilt },
                { label: "Suprafață utilă", value: areaUseful ? `${areaUseful} m²` : "—" },
                { label: "Localitate", value: locality || "—" },
                { label: "Anvelopă", value: ENVELOPE_OPTIONS.find(o => o.id === envelope)?.label || "—" },
                { label: "Încălzire", value: HEATING_TYPES.find(h => h.id === heating)?.label || "—" },
                { label: "Ventilare", value: VENT_TYPES.find(v => v.id === ventilation)?.label || "—" },
                { label: "Fotografii", value: `${photos.length} poze` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-white/40">{label}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
            </div>

            <BigButton onClick={handleSave}>💾 Salvează proiectul</BigButton>
            <p className="text-xs text-white/30 text-center">
              Proiectul se salvează local și este disponibil în aplicația desktop
            </p>
          </div>
        )}
      </div>

      {/* Footer navigare */}
      <div className="px-5 pb-6 pt-3 space-y-2 shrink-0 border-t border-white/5">
        {step < STEPS_COUNT - 1 && (
          <BigButton
            onClick={() => setStep(s => s + 1)}
            variant={canNext ? "primary" : "ghost"}>
            {canNext ? "Continuă →" : "Selectați o opțiune"}
          </BigButton>
        )}
        {step > 0 && (
          <BigButton onClick={() => setStep(s => s - 1)} variant="secondary">
            ← Înapoi
          </BigButton>
        )}
      </div>
    </div>
  );
}
