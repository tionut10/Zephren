/**
 * AsbestosWarning — Avertizare automată azbest și materiale periculoase
 * Afișat automat dacă building.yearBuilt < 1993
 * Conform HG 124/2003, Legea 360/2003
 */
import { useState, useEffect } from "react";

const STORAGE_KEY = "asbestos_warning_acknowledged";

// Materiale cu potențial azbest per perioadă de construcție
const ASBESTOS_MATERIALS_BY_ERA = {
  before_1960: {
    label: "Înainte de 1960",
    risk: "very_high",
    materials: [
      { name: "Tencuieli cu azbest pe pereți și plafoane", zone: "Pereți / Plafoane" },
      { name: "Izolație conducte termice (mansoane azbociment)", zone: "Instalații termice" },
      { name: "Plăci acoperișuri azbociment ondulat", zone: "Acoperiș" },
      { name: "Garnituri și etanșări la cazane/boilere", zone: "Centrale termice" },
      { name: "Izolație la cuptoare și echipamente industriale", zone: "Tehnic" },
    ],
  },
  "1960_1975": {
    label: "1960 – 1975",
    risk: "high",
    materials: [
      { name: "Plăci fibrociment (Eternit) — acoperiș și fațade", zone: "Acoperiș / Fațade" },
      { name: "Izolație conductă apă caldă și abur", zone: "Instalații termice" },
      { name: "Pardoseli vinilice cu substrat azbest", zone: "Pardoseli" },
      { name: "Tencuieli de tip spray (popcorn ceiling)", zone: "Plafoane" },
      { name: "Garnituri robinete și flanșe", zone: "Instalații sanitare" },
    ],
  },
  "1975_1990": {
    label: "1975 – 1990",
    risk: "medium",
    materials: [
      { name: "Șindrilă bituminoasă cu umplutură azbest", zone: "Acoperiș" },
      { name: "Plăci azbociment decorative interior", zone: "Finisaje interioare" },
      { name: "Izolație acustică cu azbest (panouri tehnice)", zone: "Tavane false" },
      { name: "Pardoseli PVC tip mozaic cu azbest", zone: "Pardoseli" },
      { name: "Garnituri uși antifoc vechi", zone: "Tâmplărie" },
    ],
  },
  "1990_1993": {
    label: "1990 – 1993",
    risk: "low",
    materials: [
      { name: "Garnituri rezidue azbociment (stocuri vechi)", zone: "Instalații" },
      { name: "Plăci de frânare / garnituri industriale (dacă există)", zone: "Echipamente tehnice" },
    ],
  },
};

const RISK_CONFIG = {
  very_high: { label: "Risc foarte ridicat",  color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30" },
  high:      { label: "Risc ridicat",          color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  medium:    { label: "Risc mediu",            color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30" },
  low:       { label: "Risc scăzut",           color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
};

function getEraKey(yearBuilt) {
  const y = parseInt(yearBuilt);
  if (isNaN(y)) return null;
  if (y < 1960)   return "before_1960";
  if (y <= 1975)  return "1960_1975";
  if (y <= 1990)  return "1975_1990";
  if (y <= 1992)  return "1990_1993";
  return null; // >= 1993 → fără avertizare
}

export default function AsbestosWarning({ building, cn }) {
  const yearBuilt = parseInt(building?.yearBuilt || building?.year_built);
  const eraKey    = getEraKey(yearBuilt);

  const storageKey = `${STORAGE_KEY}_${yearBuilt}`;
  const [acknowledged, setAcknowledged] = useState(() => {
    try { return localStorage.getItem(storageKey) === "true"; } catch { return false; }
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Resetăm dacă s-a schimbat anul
    setAcknowledged(() => {
      try { return localStorage.getItem(storageKey) === "true"; } catch { return false; }
    });
  }, [storageKey]);

  // Nu afișăm dacă: an >= 1993, an necunoscut, sau utilizatorul a confirmat
  if (!eraKey || acknowledged) return null;

  const eraData  = ASBESTOS_MATERIALS_BY_ERA[eraKey];
  const riskConf = RISK_CONFIG[eraData.risk];

  const handleAcknowledge = () => {
    try { localStorage.setItem(storageKey, "true"); } catch { /* ignore */ }
    setAcknowledged(true);
  };

  const clsx = (...args) => args.filter(Boolean).join(" ");

  return (
    <div className={clsx(
      "rounded-xl border p-4 space-y-3",
      riskConf.bg,
      riskConf.border,
      cn
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5" role="img" aria-label="Avertizare">⚠️</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx("font-bold text-sm", riskConf.color)}>
              Atenție: Risc potențial azbest
            </span>
            <span className={clsx(
              "text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide",
              riskConf.color, riskConf.border
            )}>
              {riskConf.label}
            </span>
          </div>
          <p className="text-xs text-white/70 mt-1 leading-relaxed">
            Clădirea a fost construită în <span className={clsx("font-semibold", riskConf.color)}>{yearBuilt}</span> —
            înainte de interzicerea utilizării azbestului în construcții în România (1993).
            Pot exista materiale cu azbest care necesită evaluare înainte de orice intervenție.
          </p>
        </div>
      </div>

      {/* Materiale posibil cu azbest */}
      <div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white/80 transition-colors"
        >
          <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
          <span>Materiale potențial cu azbest — {eraData.label}</span>
          <span className="opacity-40">({eraData.materials.length} tipuri identificate)</span>
        </button>

        {expanded && (
          <div className="mt-2 space-y-1.5 pl-4">
            {eraData.materials.map((mat, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={clsx("text-[10px] mt-0.5 flex-shrink-0", riskConf.color)}>•</span>
                <div>
                  <span className="text-white/80">{mat.name}</span>
                  <span className="text-white/35 ml-1.5 text-[10px]">({mat.zone})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Obligații legale */}
      <div className={clsx("rounded-lg p-3 border space-y-1.5", "bg-white/5 border-white/10")}>
        <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wide">Obligații legale aplicabile:</p>
        <div className="space-y-1">
          {[
            { ref: "HG 124/2003", desc: "Protecția lucrătorilor față de riscurile azbest (transpunere Directivă 83/477/CEE)" },
            { ref: "Legea 360/2003", desc: "Regimul substanțelor și preparatelor chimice periculoase" },
            { ref: "HG 1093/2006", desc: "Cerințe minime SSM pentru lucrul cu azbest (demolări, reabilitări)" },
            { ref: "Ord. MS 869/2010", desc: "Norme metodologice îndepărtare materiale cu azbest" },
          ].map((item, i) => (
            <div key={i} className="flex gap-2 text-[10px]">
              <span className="text-amber-400 font-semibold flex-shrink-0 w-28">{item.ref}</span>
              <span className="text-white/50">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Link-uri utile */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        <a
          href="https://legislatie.just.ro/Public/DetaliiDocument/40979"
          target="_blank" rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
        >
          HG 124/2003 ↗
        </a>
        <a
          href="https://www.anpm.ro"
          target="_blank" rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
        >
          ANPM — Ghid azbest ↗
        </a>
        <a
          href="https://www.inspectiamuncii.ro"
          target="_blank" rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
        >
          Inspecția Muncii ↗
        </a>
      </div>

      {/* Recomandare + Buton confirmare */}
      <div className="flex items-start justify-between gap-4 pt-1 border-t border-white/10">
        <p className="text-[10px] text-white/40 leading-relaxed">
          Înainte de orice intervenție (demolări, reabilitare), solicitați un audit pentru prezența azbestului
          de la o firmă autorizată ANPM. Manipularea azbestului fără autorizație este interzisă prin lege.
        </p>
        <button
          onClick={handleAcknowledge}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-semibold hover:bg-amber-500/30 transition-all whitespace-nowrap"
        >
          Am luat la cunoștință
        </button>
      </div>
    </div>
  );
}
