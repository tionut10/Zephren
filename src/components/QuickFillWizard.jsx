/**
 * QuickFillWizard — Completare rapidă Pași 1–4 prin selecții vizuale
 * 6 ecrane cu tap/click, fără tastatură (mobil-friendly)
 * ~60 secunde pentru un auditor experimentat
 */
import { useState, useCallback } from "react";
import CLIMATE_DB from "../data/climate.json";

// ── Tabele de inferență ────────────────────────────────────────────────────────

const BUILDING_TYPES = [
  { id: "apartment", icon: "🏠", label: "Apartament", sub: "în bloc", category: "RA", structure: "Zidărie portantă", heightFloor: "2.75" },
  { id: "block",     icon: "🏢", label: "Bloc",       sub: "clădire colectivă", category: "RC", structure: "Panouri prefabricate mari", heightFloor: "2.70" },
  { id: "house",     icon: "🏡", label: "Casă",       sub: "individuală / vilă", category: "RI", structure: "Zidărie portantă", heightFloor: "2.80" },
  { id: "office",    icon: "💼", label: "Birouri",    sub: "clădire de birouri", category: "BI", structure: "Cadre beton armat", heightFloor: "3.00" },
  { id: "commercial",icon: "🏪", label: "Comercial",  sub: "magazin / mall", category: "CO", structure: "Cadre beton armat", heightFloor: "4.00" },
  { id: "education", icon: "🏫", label: "Educație",   sub: "școală / grădiniță", category: "ED", structure: "Cadre beton armat", heightFloor: "3.20" },
  { id: "health",    icon: "🏥", label: "Sănătate",   sub: "spital / clinică", category: "SA", structure: "Cadre beton armat", heightFloor: "3.50" },
  { id: "other",     icon: "🏗️", label: "Altele",     sub: "hotel / sport / etc.", category: "AL", structure: "Zidărie portantă", heightFloor: "2.80" },
];

const PERIODS = [
  { id: "pre1960",  label: "Înainte de 1960", sub: "Interbelic / primii ani",  yearBuilt: "1950", n50: "9.0",
    upe: 1.80, upt: 0.90, upl: 0.80, structure_bloc: "Zidărie portantă" },
  { id: "p1960_80", label: "1960 – 1980",     sub: "Comunism timpuriu",        yearBuilt: "1972", n50: "7.0",
    upe: 1.20, upt: 0.60, upl: 0.55, structure_bloc: "Zidărie portantă" },
  { id: "p1981_89", label: "1981 – 1989",     sub: "Panouri prefabricate",     yearBuilt: "1985", n50: "6.0",
    upe: 1.00, upt: 0.50, upl: 0.45, structure_bloc: "Panouri prefabricate mari" },
  { id: "p1990_05", label: "1990 – 2005",     sub: "Postcomunism",             yearBuilt: "1997", n50: "5.0",
    upe: 0.80, upt: 0.40, upl: 0.40, structure_bloc: "Cadre beton armat" },
  { id: "p2006_20", label: "2006 – 2020",     sub: "Modern / norme UE",        yearBuilt: "2013", n50: "3.0",
    upe: 0.45, upt: 0.25, upl: 0.35, structure_bloc: "Cadre beton armat" },
  { id: "post2020", label: "După 2020",       sub: "nZEB / actual",            yearBuilt: "2022", n50: "1.5",
    upe: 0.22, upt: 0.15, upl: 0.20, structure_bloc: "Cadre beton armat" },
];

const INSULATION_OPTS = [
  { id: "none",     icon: "❌", label: "Neizolată",    sub: "perete original, fără ETICS",   upe_mult: 1.0,  upt_mult: 1.0 },
  { id: "partial",  icon: "🔶", label: "Parțial",      sub: "câteva zone izolate",           upe_mult: 0.6,  upt_mult: 0.8 },
  { id: "etics10",  icon: "✅", label: "ETICS 10 cm",  sub: "EPS/vată minerală 10 cm",       upe_final: 0.35, upt_mult: 0.5 },
  { id: "etics15",  icon: "⭐", label: "ETICS 15+ cm", sub: "EPS/vată minerală 15+ cm",      upe_final: 0.25, upt_mult: 0.4 },
];

const HEATING_OPTS = [
  { id: "gaz_cond",  icon: "🔵", label: "Gaz condensare", sub: "centrală condensație",     source: "GAZ_COND",  eta: "0.97", acm: "CAZAN_H" },
  { id: "gaz_conv",  icon: "🟠", label: "Gaz clasic",      sub: "centrală convențională",   source: "GAZ_CONV",  eta: "0.85", acm: "CAZAN_H" },
  { id: "heat_pump", icon: "♻️", label: "Pompă căldură",   sub: "aer-apă / sol-apă",       source: "HP_AA",     eta: "3.50", acm: "HP_ACM" },
  { id: "district",  icon: "🏙️", label: "Termoficare",     sub: "RADET / rețea urbană",     source: "DISTRICT",  eta: "0.95", acm: "DISTRICT" },
  { id: "electric",  icon: "⚡", label: "Electric",        sub: "rezistențe / calorifere",  source: "ELECTRICA", eta: "1.00", acm: "ELECTRICA" },
  { id: "wood",      icon: "🪵", label: "Lemne / Peleti",  sub: "sobă / centrală biomasă",  source: "BIOMASA",   eta: "0.80", acm: "CAZAN_H" },
];

const VENTILATION_OPTS = [
  { id: "nat",      icon: "🌬️", label: "Naturală",           sub: "ferestre + fisuri",           type: "NAT",  hr: "" },
  { id: "mech",     icon: "💨", label: "Mecanică simplă",    sub: "VMC fără recuperare",          type: "VMC",  hr: "" },
  { id: "recovery", icon: "♻️", label: "Recuperare căldură", sub: "VMCR, HR ≥ 80%",              type: "VMCR", hr: "0.80" },
];

const WINDOW_OPTS = [
  { id: "single",    icon: "🪟", label: "Simplu vitraj",    sub: "lemn vechi, 1 geam",        u: "5.5", g: "0.85", type: "Simplu vitraj" },
  { id: "old_dbl",   icon: "🔲", label: "Dublu vechi",      sub: "termopan din '90-2000",     u: "2.8", g: "0.70", type: "Dublu vitraj vechi" },
  { id: "pvc_dbl",   icon: "🏠", label: "PVC/Al dublu",     sub: "termopan modern",           u: "1.3", g: "0.65", type: "Dublu vitraj PVC" },
  { id: "triple",    icon: "⭐", label: "Triplu vitraj",    sub: "ferestre pasivhaus",        u: "0.7", g: "0.50", type: "Triplu vitraj" },
];

const SCOPE_OPTS = [
  { id: "vanzare",           icon: "🏷️", label: "Vânzare",          sub: "CPE la tranzacție" },
  { id: "inchiriere",        icon: "🔑", label: "Închiriere",        sub: "CPE la contract chirie" },
  { id: "reabilitare",       icon: "🔨", label: "Reabilitare",       sub: "audit energetic, renovare" },
  { id: "constructie_noua",  icon: "🏗️", label: "Construcție nouă",  sub: "recepție clădire nouă" },
];

const FLOORS_OPTS = [
  { id: "P",     label: "Parter (P)",     num: 1 },
  { id: "P+1E",  label: "P+1 etaj",       num: 2 },
  { id: "P+2E",  label: "P+2 etaje",      num: 3 },
  { id: "P+3E",  label: "P+3 etaje",      num: 4 },
  { id: "P+4E",  label: "P+4 etaje",      num: 5 },
  { id: "P+5E",  label: "P+5 etaje",      num: 6 },
  { id: "P+7E",  label: "P+6-7 etaje",    num: 7 },
  { id: "P+9E",  label: "P+8-9 etaje",    num: 9 },
  { id: "P+10E+",label: "P+10+ etaje",    num: 12 },
];

// ── Funcție de inferență date din selecții ─────────────────────────────────────
export function inferData(answers) {
  const { type, period, insulation, heating, ventilation, windows, dimensions, scope } = answers;

  const btype = BUILDING_TYPES.find(b => b.id === type) || BUILDING_TYPES[0];
  const per   = PERIODS.find(p => p.id === period) || PERIODS[2];
  const ins   = INSULATION_OPTS.find(i => i.id === insulation) || INSULATION_OPTS[0];
  const heat  = HEATING_OPTS.find(h => h.id === heating) || HEATING_OPTS[0];
  const vent  = VENTILATION_OPTS.find(v => v.id === ventilation) || VENTILATION_OPTS[0];
  const win   = WINDOW_OPTS.find(w => w.id === windows) || WINDOW_OPTS[1];
  const flr   = FLOORS_OPTS.find(f => f.id === dimensions.floors) || FLOORS_OPTS[0];
  const sc    = SCOPE_OPTS.find(s => s.id === scope) || SCOPE_OPTS[0];

  // Structura (pentru bloc, depinde de perioadă)
  let structure = btype.structure;
  if (type === "block" || type === "apartment") {
    structure = per.structure_bloc || btype.structure;
  }

  // U-valori perete exterior
  let upe = per.upe;
  if (ins.upe_final) {
    upe = ins.upe_final;
  } else {
    upe = per.upe * ins.upe_mult;
  }
  const upt = +(per.upt * ins.upt_mult).toFixed(2);
  const upl = +per.upl.toFixed(2);

  // n50 (îmbunătățit dacă VMCR)
  let n50 = parseFloat(per.n50);
  if (vent.type === "VMCR") n50 = Math.min(n50, 2.0);
  if (insulation === "etics15" || period === "post2020") n50 = Math.min(n50, 1.5);

  // Dimensiuni estimate
  const au = parseFloat(dimensions.areaUseful) || 0;
  const nFloors = flr.num;
  const hFloor = parseFloat(btype.heightFloor) || 2.80;
  const footprint = au > 0 ? Math.round(au / nFloors) : 0;
  const volume = au > 0 ? Math.round(au * hFloor) : 0;
  const perimeter = footprint > 0 ? Math.round(4 * Math.sqrt(footprint)) : 0;

  // Arii elemente anvelopă estimate
  const wallArea = perimeter > 0 ? Math.round(perimeter * hFloor * nFloors * 0.85) : 0; // -15% goluri
  const glazingArea = wallArea > 0 ? Math.round(wallArea * 0.20) : 0; // ~20% din perete = ferestre
  const roofArea = footprint;
  const floorArea = footprint;

  // Clădire
  const buildingData = {
    category: btype.category,
    structure,
    yearBuilt: per.yearBuilt,
    n50: String(n50),
    scopCpe: sc.id,
    heightFloor: btype.heightFloor,
    floors: flr.id,
    ...(au > 0 && { areaUseful: String(au) }),
    ...(volume > 0 && { volume: String(volume) }),
    ...(dimensions.city && { city: dimensions.city, locality: dimensions.city }),
    ...(dimensions.county && { county: dimensions.county }),
    ...(dimensions.address && { address: dimensions.address }),
  };

  // Elemente opace (estimate)
  const opaqueElements = [];
  if (wallArea > 0) {
    opaqueElements.push({
      name: "Perete exterior",
      type: "PE",
      area: String(wallArea - glazingArea),
      orientation: "S",
      tau: "1",
      uValue: String(+upe.toFixed(2)),
      layers: [
        { matName: "Zidărie", thickness: "30", lambda: "0.45", rho: "1800" },
        ...(insulation !== "none" ? [{ matName: "EPS", thickness: insulation === "etics15" ? "15" : "10", lambda: "0.035", rho: "15" }] : []),
        { matName: "Tencuială", thickness: "2", lambda: "0.87", rho: "1800" },
      ],
    });
    if (roofArea > 0) {
      opaqueElements.push({
        name: period === "post2020" ? "Planșeu terasă" : (type === "house" ? "Planșeu sub pod" : "Planșeu terasă"),
        type: type === "house" ? "PP" : "PT",
        area: String(roofArea),
        orientation: "H",
        tau: type === "house" ? "0.9" : "1",
        uValue: String(upt),
        layers: [{ matName: "Beton", thickness: "15", lambda: "1.74", rho: "2400" }],
      });
    }
    if (floorArea > 0) {
      opaqueElements.push({
        name: "Planșeu pe sol / peste subsol",
        type: "PB",
        area: String(floorArea),
        orientation: "H",
        tau: "0.5",
        uValue: String(upl),
        layers: [{ matName: "Beton", thickness: "15", lambda: "1.74", rho: "2400" }],
      });
    }
  }

  // Elemente vitrate
  const glazingElements = [];
  if (glazingArea > 0) {
    glazingElements.push({
      name: "Ferestre",
      area: String(glazingArea),
      u: win.u,
      g: win.g,
      orientation: "S",
      frameRatio: "25",
      type: win.type,
    });
  }

  // Punți termice tipice (liniare)
  const thermalBridges = wallArea > 0 ? [
    { name: "Perimetru planșeu terasă", type: "PT", psi: "0.50", length: String(perimeter) },
    { name: "Perimetru ferestră tipică", type: "FC", psi: "0.10", length: String(Math.round(glazingArea / 1.5 * 4)) },
    { name: "Colț vertical exterior",   type: "CV", psi: "0.10", length: String(nFloors * hFloor * 4) },
  ] : [];

  // Instalații
  const heatingData = {
    source: heat.source,
    eta_gen: heat.eta,
    theta_int: type === "office" || type === "commercial" ? "21" : "20",
    ...(heat.source === "BIOMASA" && { biomassType: heating === "wood" ? "LEMNE" : "PELETI" }),
  };

  const acmData = {
    source: heat.acm,
    dailyLiters: type === "office" ? "10" : type === "apartment" || type === "block" ? "60" : "40",
  };

  const ventData = {
    type: vent.type,
    ...(vent.hr && { hrEfficiency: vent.hr }),
  };

  const lightingData = {
    type: (period === "post2020" || period === "p2006_20") ? "LED" : "FLUOR",
    pDensity: type === "office" ? "9" : type === "commercial" ? "14" : "4.5",
  };

  return {
    building: buildingData,
    opaqueElements,
    glazingElements,
    thermalBridges,
    heating: heatingData,
    acm: acmData,
    ventilation: ventData,
    lighting: lightingData,
    _meta: {
      upe: +upe.toFixed(2), upt, upl, u_win: parseFloat(win.u), wallArea, glazingArea,
      footprint, nFloors, volume, perimeter,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTA WIZARD
// ══════════════════════════════════════════════════════════════════════════════
const WIZARD_STEPS = [
  { id: "type",       title: "Tip clădire",          icon: "🏢" },
  { id: "period",     title: "Perioadă construcție",  icon: "📅" },
  { id: "insulation", title: "Izolație termică",      icon: "🧱" },
  { id: "heating",    title: "Sistem încălzire",      icon: "🔥" },
  { id: "ventilation",title: "Ventilare + Ferestre",  icon: "🪟" },
  { id: "dimensions", title: "Dimensiuni + Locație",  icon: "📐" },
  { id: "summary",    title: "Sumar + Aplică",         icon: "✅" },
];

function OptionCard({ icon, label, sub, selected, onClick, small = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all p-3 text-center cursor-pointer select-none ${
        selected
          ? "border-indigo-500 bg-indigo-500/15 shadow-lg shadow-indigo-500/10"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
      } ${small ? "p-2" : "p-3"}`}
    >
      <span className={small ? "text-xl" : "text-2xl"}>{icon}</span>
      <span className={`font-semibold leading-tight ${small ? "text-[10px]" : "text-xs"}`}>{label}</span>
      {sub && <span className={`opacity-40 leading-tight ${small ? "text-[8px]" : "text-[10px]"}`}>{sub}</span>}
    </button>
  );
}

export default function QuickFillWizard({ onClose, onApply, showToast }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    type: null,
    period: null,
    insulation: null,
    heating: null,
    ventilation: null,
    windows: null,
    dimensions: { areaUseful: "", floors: "P", city: "", county: "", address: "" },
    scope: "vanzare",
  });
  const [citySearch, setCitySearch] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);

  const set = useCallback((key, val) => setAnswers(a => ({ ...a, [key]: val })), []);
  const setDim = useCallback((key, val) => setAnswers(a => ({ ...a, dimensions: { ...a.dimensions, [key]: val } })), []);

  // Autocomplete localitate
  const onCityInput = useCallback((val) => {
    setCitySearch(val);
    setDim("city", val);
    if (val.length >= 2) {
      const sugg = CLIMATE_DB.filter(c => c.name.toLowerCase().includes(val.toLowerCase())).slice(0, 6);
      setCitySuggestions(sugg);
    } else {
      setCitySuggestions([]);
    }
  }, [setDim]);

  const canNext = useCallback(() => {
    const { type, period, insulation, heating, ventilation, windows, dimensions } = answers;
    switch (step) {
      case 0: return !!type;
      case 1: return !!period;
      case 2: return !!insulation;
      case 3: return !!heating;
      case 4: return !!ventilation && !!windows;
      case 5: return !!dimensions.areaUseful && parseFloat(dimensions.areaUseful) > 0;
      case 6: return true;
      default: return true;
    }
  }, [step, answers]);

  const preview = step === 6 ? inferData(answers) : null;

  const handleApply = useCallback(() => {
    const data = inferData(answers);
    onApply(data);
    showToast("Date completate automat din Quick Fill", "success");
    onClose();
  }, [answers, onApply, showToast, onClose]);

  const stepId = WIZARD_STEPS[step]?.id;
  const progress = ((step) / (WIZARD_STEPS.length - 1)) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.80)" }}
      onClick={onClose}
    >
      <div
        className="bg-[#12141f] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: "92vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold">⚡ Completare rapidă</h3>
              <p className="text-[10px] opacity-40">Pas {step + 1} din {WIZARD_STEPS.length} · {WIZARD_STEPS[step]?.title}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm">&times;</button>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: progress + "%" }} />
          </div>
          {/* Step pills */}
          <div className="flex gap-1 mt-2">
            {WIZARD_STEPS.map((s, i) => (
              <div key={s.id} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? "bg-indigo-500" : "bg-white/5"}`} />
            ))}
          </div>
        </div>

        {/* Conținut step */}
        <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "thin" }}>

          {/* ── Pasul 0: Tip clădire ────────────────────────────────────────── */}
          {stepId === "type" && (
            <div className="grid grid-cols-4 gap-2">
              {BUILDING_TYPES.map(b => (
                <OptionCard key={b.id} icon={b.icon} label={b.label} sub={b.sub}
                  selected={answers.type === b.id} onClick={() => set("type", b.id)} small />
              ))}
            </div>
          )}

          {/* ── Pasul 1: Perioadă ───────────────────────────────────────────── */}
          {stepId === "period" && (
            <div className="grid grid-cols-2 gap-2.5">
              {PERIODS.map(p => (
                <OptionCard key={p.id} icon={p.id === "pre1960" ? "🏛️" : p.id === "p1981_89" ? "🏗️" : p.id === "post2020" ? "🆕" : "📅"}
                  label={p.label} sub={p.sub}
                  selected={answers.period === p.id} onClick={() => set("period", p.id)} />
              ))}
            </div>
          )}

          {/* ── Pasul 2: Izolație ──────────────────────────────────────────── */}
          {stepId === "insulation" && (
            <div className="grid grid-cols-2 gap-2.5">
              {INSULATION_OPTS.map(i => (
                <OptionCard key={i.id} icon={i.icon} label={i.label} sub={i.sub}
                  selected={answers.insulation === i.id} onClick={() => set("insulation", i.id)} />
              ))}
            </div>
          )}

          {/* ── Pasul 3: Încălzire ─────────────────────────────────────────── */}
          {stepId === "heating" && (
            <div className="grid grid-cols-2 gap-2.5">
              {HEATING_OPTS.map(h => (
                <OptionCard key={h.id} icon={h.icon} label={h.label} sub={h.sub}
                  selected={answers.heating === h.id} onClick={() => set("heating", h.id)} />
              ))}
            </div>
          )}

          {/* ── Pasul 4: Ventilare + Ferestre ─────────────────────────────── */}
          {stepId === "ventilation" && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold opacity-60 mb-2">💨 Tip ventilare</div>
                <div className="grid grid-cols-3 gap-2">
                  {VENTILATION_OPTS.map(v => (
                    <OptionCard key={v.id} icon={v.icon} label={v.label} sub={v.sub}
                      selected={answers.ventilation === v.id} onClick={() => set("ventilation", v.id)} small />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold opacity-60 mb-2">🪟 Tip ferestre</div>
                <div className="grid grid-cols-2 gap-2">
                  {WINDOW_OPTS.map(w => (
                    <OptionCard key={w.id} icon={w.icon} label={w.label} sub={`U=${w.u} W/m²K`}
                      selected={answers.windows === w.id} onClick={() => set("windows", w.id)} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Pasul 5: Dimensiuni + Locație ─────────────────────────────── */}
          {stepId === "dimensions" && (
            <div className="space-y-4">
              {/* Suprafață utilă */}
              <div>
                <label className="text-xs font-semibold opacity-60 block mb-1.5">📐 Suprafață utilă (m²) *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="ex: 65"
                  value={answers.dimensions.areaUseful}
                  onChange={e => setDim("areaUseful", e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-lg font-bold text-center focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>

              {/* Regim înălțime */}
              <div>
                <label className="text-xs font-semibold opacity-60 block mb-1.5">🏢 Regim înălțime</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {FLOORS_OPTS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setDim("floors", f.id)}
                      className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                        answers.dimensions.floors === f.id
                          ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/70"
                      }`}
                    >{f.label}</button>
                  ))}
                </div>
              </div>

              {/* Adresă */}
              <div>
                <label className="text-xs font-semibold opacity-60 block mb-1.5">📍 Adresă (opțional)</label>
                <input
                  type="text"
                  placeholder="Strada, nr."
                  value={answers.dimensions.address}
                  onChange={e => setDim("address", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs focus:outline-none focus:border-white/20"
                />
              </div>

              {/* Localitate cu autocomplete */}
              <div className="relative">
                <label className="text-xs font-semibold opacity-60 block mb-1.5">🌍 Localitate (opțional)</label>
                <input
                  type="text"
                  placeholder="ex: București, Cluj-Napoca..."
                  value={citySearch || answers.dimensions.city}
                  onChange={e => onCityInput(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs focus:outline-none focus:border-white/20"
                />
                {citySuggestions.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 z-10 bg-[#1a1c2e] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                    {citySuggestions.map(c => (
                      <button
                        key={c.name}
                        onClick={() => {
                          setDim("city", c.name);
                          setCitySearch(c.name);
                          setCitySuggestions([]);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-all border-b border-white/5 last:border-0"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="opacity-40 ml-2">{c.county}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Scop CPE */}
              <div>
                <label className="text-xs font-semibold opacity-60 block mb-1.5">📋 Scopul certificatului</label>
                <div className="grid grid-cols-2 gap-2">
                  {SCOPE_OPTS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => set("scope", s.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        answers.scope === s.id
                          ? "border-indigo-500 bg-indigo-500/15"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <span>{s.icon}</span>
                      <div>
                        <div className="text-xs font-semibold">{s.label}</div>
                        <div className="text-[10px] opacity-40">{s.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Pasul 6: Sumar ─────────────────────────────────────────────── */}
          {stepId === "summary" && preview && (
            <div className="space-y-3">
              <div className="text-xs font-semibold opacity-60 mb-1">Date generate automat:</div>

              {/* Clădire */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
                <div className="text-[10px] font-bold opacity-50 uppercase tracking-wide">📋 Identificare</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                  {[
                    ["Categorie", preview.building.category],
                    ["Structură", preview.building.structure?.slice(0, 20)],
                    ["An construcție", preview.building.yearBuilt],
                    ["n₅₀", preview.building.n50 + " h⁻¹"],
                    ["Suprafață utilă", (preview.building.areaUseful || "—") + " m²"],
                    ["Regim", answers.dimensions.floors],
                    ["Volum", preview._meta.volume ? preview._meta.volume + " m³" : "—"],
                    ["Scop CPE", preview.building.scopCpe],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-1">
                      <span className="opacity-40 shrink-0">{k}:</span>
                      <span className="font-medium text-white/80 truncate">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anvelopă */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
                <div className="text-[10px] font-bold opacity-50 uppercase tracking-wide">🏗️ Anvelopă estimată</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                  {[
                    ["U perete ext.", preview._meta.upe + " W/m²K"],
                    ["U terasă/pod", preview._meta.upt + " W/m²K"],
                    ["U pardoseală", preview._meta.upl + " W/m²K"],
                    ["U ferestre", preview._meta.u_win + " W/m²K"],
                    ["Arie pereți", (preview._meta.wallArea || "—") + " m²"],
                    ["Arie vitraje", (preview._meta.glazingArea || "—") + " m²"],
                    ["Elemente opace", preview.opaqueElements.length],
                    ["Punți termice", preview.thermalBridges.length],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-1">
                      <span className="opacity-40 shrink-0">{k}:</span>
                      <span className="font-medium text-white/80">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instalații */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
                <div className="text-[10px] font-bold opacity-50 uppercase tracking-wide">⚙️ Instalații</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                  {[
                    ["Încălzire", preview.heating.source],
                    ["η generare", preview.heating.eta_gen],
                    ["ACM", preview.acm.source],
                    ["Ventilare", preview.ventilation.type],
                    ["HR ventilare", preview.ventilation.hrEfficiency || "—"],
                    ["Iluminat", preview.lighting.type],
                    ["θ interior", preview.heating.theta_int + " °C"],
                    ["L ACM", preview.acm.dailyLiters + " L/pers·zi"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-1">
                      <span className="opacity-40 shrink-0">{k}:</span>
                      <span className="font-medium text-white/80">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[10px] opacity-30 text-center">
                Valorile sunt estimate tipice — verificați și ajustați în Pașii 1–4
              </div>
            </div>
          )}
        </div>

        {/* Footer navigare */}
        <div className="px-5 pb-5 pt-3 border-t border-white/5 shrink-0 flex gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-sm transition-all"
            >
              ← Înapoi
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-sm transition-all opacity-50">
              Anulează
            </button>
          )}

          {step < WIZARD_STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
            >
              Continuă →
            </button>
          ) : (
            <button
              onClick={handleApply}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-500/20"
            >
              ✓ Aplică date în calculator
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
