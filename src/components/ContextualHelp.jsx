/**
 * ContextualHelp — pct. 36
 * Tooltip normativ per câmp: hover → explicație + referință standard
 */
import { useState, useRef, useEffect } from "react";

const HELP_TEXTS = {
  // Identificare
  areaUseful:    { text: "Suprafața utilă (Au) — suma suprafețelor tuturor încăperilor cu înălțime ≥ 2.10m. Exclude pereții, scările, balcoanele neîncălzite.", norm: "Mc 001-2022 Art.3.1.2" },
  yearBuilt:     { text: "Anul construirii influențează tipologia constructivă implicită și obligativitatea auditului energetic (reglementare MEPS 2030).", norm: "EPBD 2024/1275 Art.9" },
  volume:        { text: "Volumul interior net (Vi) al spațiului încălzit. Se calculează: lungime × lățime × înălțime medie per nivel.", norm: "Mc 001-2022 Art.3.1.3" },
  floors:        { text: "Numărul de niveluri supraterane (P+1, P+2E etc.). Influențează suprafața anvelopei și sarcina termică.", norm: "Mc 001-2022 Cap.4" },
  // Climă
  climateZone:   { text: "Zona climatică determină temperatura de calcul exterior și gradul-zilele de încălzire (GZI). România: zona I (Dobrogea, litoralul) → zona V (munte).", norm: "SR EN ISO 52010-1:2017/NA:2023 / C107-2002 Anexa A" },
  // Anvelopă
  uValue:        { text: "Coeficientul de transfer termic U [W/(m²K)]. Cu cât valoarea e mai mică, cu atât elementul e mai izolat. NZEB impune U≤0.22 pentru pereți exteriori.", norm: "SR EN ISO 6946:2017 / Mc 001-2022 Tab.2.5" },
  thermalMass:   { text: "Masa termică (MC) exprimă capacitatea clădirii de a stoca căldură. Clădirile grele (beton, cărămidă) au inerție termică mai bună → confort mai bun vara.", norm: "SR EN ISO 52016-1:2017/NA:2023 Tab.12" },
  psiValue:      { text: "Coeficientul linear de transfer termic Ψ [W/(mK)] al punților termice. Valori tipice: colț perete-planșeu 0.08, fereastră-zidărie 0.04.", norm: "SR EN ISO 14683:2017 Tab.A.1" },
  // Sisteme
  etaGen:        { text: "Randamentul generatorului de căldură (%) la putere nominală. Cazane condensare: 105-109%. Cazane clasice: 85-92%. Pompe căldură: COP 3-5.", norm: "Mc 001-2022 Tab.3.2 / EN 15316-4" },
  cop:           { text: "COP (Coefficient of Performance) — raportul căldură produsă / energie electrică consumată. SCOP (sezonier) este mai relevant pentru calcul anual.", norm: "EN 14825 / Mc 001-2022 Tab.3.8" },
  hrEta:         { text: "Eficiența recuperatorului de căldură din VMC. EN 16798 impune η≥75% pentru clădiri NZEB. SFP (factor putere specifică) ≤ 0.45 W/(m³/h).", norm: "SR EN 16798-1:2019/NA:2019 / SR EN 16798-3:2017 / EN 13141-7" },
  // Regenerabile
  pvPeak:        { text: "Puterea de vârf a instalației PV [kWp]. 1 kWp necesită ~6-8 m² suprafață (panouri standard 400W). Randament sistem tipic: 75-85%.", norm: "EN 15316-4-6 / PVGIS JRC EU" },
  solarArea:     { text: "Suprafața colectoarelor solare termice [m²]. Regula de baz: 1-1.5 m² per persoană pentru ACM. Factor de umbrire și orientare reduc producția.", norm: "SR EN 15316-4-3:2017 / GP 123-2004" },
  // Calcul
  ep:            { text: "Energia primară [kWh/(m²·an)] — indicator principal pentru clasare. Include factori de conversie pentru fiecare sursă de energie (fP_gaz=1.1, fP_elec=2.62).", norm: "Mc 001-2022 Anexa A / SR EN ISO 52000-1:2017" },
  nZEB:          { text: "nZEB (nearly Zero Energy Building) — clădire cu consum aproape zero. Condiții: EP ≤ prag per categorie/zonă + RER ≥ 30% + RER_onsite ≥ 10%.", norm: "Mc 001-2022 Art.2.10 / Legea 238/2024" },
  sri:           { text: "SRI (Smart Readiness Indicator) — gradul de pregătire a clădirii pentru sisteme inteligente. Scala 0-100%. EPBD Art.8 impune calculul pentru clădiri comerciale.", norm: "EPBD 2024/1275 Art.8 / Reg. delegat 2025/2287" },
};

export default function ContextualHelp({ fieldKey, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const help = HELP_TEXTS[fieldKey];

  useEffect(() => {
    if (!open) return;
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!help) return null;

  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-4 h-4 rounded-full border border-white/20 bg-white/5 hover:bg-amber-500/20 hover:border-amber-500/40 flex items-center justify-center text-[10px] font-bold text-white/40 hover:text-amber-400 transition-all"
        title="Ajutor normativ"
      >?</button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[#0d0f1a] border border-amber-500/20 rounded-xl p-3 shadow-2xl">
          <div className="text-xs text-white/80 leading-relaxed">{help.text}</div>
          <div className="text-[10px] text-amber-400/60 mt-2 font-mono border-t border-white/[0.05] pt-1.5">{help.norm}</div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-amber-500/20" />
        </div>
      )}
    </span>
  );
}

// Hook pentru help inline în câmpuri
export function useFieldHelp() {
  return (fieldKey) => <ContextualHelp fieldKey={fieldKey} className="ml-1 align-middle" />;
}

export { HELP_TEXTS };
