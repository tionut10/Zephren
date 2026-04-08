/**
 * HistoricBuildingPanel — Panou UI pentru clădiri istorice/protejate patrimoniu
 * Pct. 64 — Integrează historic-buildings.js
 * Props: { building, opaqueElements, onUpdateElement, onUpdateBuilding }
 */
import { useState, useMemo } from "react";
import {
  HISTORIC_BUILDING_CLASSES,
  checkHistoricConstraints,
  calcHistoricInsulationOptions,
  calcUElement,
  HISTORIC_INSULATION_CATALOG,
} from "../calc/historic-buildings.js";

// ──────────────────────────────────────────────
// Sub-componente interne
// ──────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h4 className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">{children}</h4>
  );
}

function Badge({ children, color = "amber" }) {
  const colors = {
    amber:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
    red:    "bg-red-500/15   text-red-400   border-red-500/30",
    green:  "bg-green-500/15 text-green-400 border-green-500/30",
    blue:   "bg-blue-500/15  text-blue-400  border-blue-500/30",
    gray:   "bg-white/5      text-white/40  border-white/10",
  };
  return (
    <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

function LMIClassSelector({ value, onChange }) {
  const descriptions = { A: 'Importanță națională excepțională / UNESCO', B: 'Importanță locală / regională', C: 'Zonă protejată', D: 'Valoare arhitecturală' };
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {HISTORIC_BUILDING_CLASSES.map(cls => (
        <button
          key={cls}
          onClick={() => onChange(value === cls ? null : cls)}
          className={`rounded-xl border p-2.5 text-left transition-all ${
            value === cls
              ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
              : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
          }`}
        >
          <div className="font-bold text-base leading-none mb-1">Clasa {cls}</div>
          <div className="text-[10px] leading-tight opacity-70">{descriptions[cls]}</div>
        </button>
      ))}
    </div>
  );
}

function ConstraintsList({ constraints, forbidden, allowed, notes }) {
  return (
    <div className="space-y-3">
      {constraints.length > 0 && (
        <div>
          <SectionTitle>Constrângeri active</SectionTitle>
          <div className="space-y-1.5">
            {constraints.map((c, i) => (
              <div key={i} className="flex gap-2 text-xs text-white/70">
                <span className="text-amber-400 flex-shrink-0">⚠</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {forbidden.length > 0 && (
        <div>
          <SectionTitle>Intervenții interzise</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {forbidden.map((f, i) => <Badge key={i} color="red">✕ {f}</Badge>)}
          </div>
        </div>
      )}
      {allowed.length > 0 && (
        <div>
          <SectionTitle>Intervenții permise</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {allowed.map((a, i) => <Badge key={i} color="green">✓ {a}</Badge>)}
          </div>
        </div>
      )}
      {notes.length > 0 && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 space-y-1">
          <SectionTitle>Note legale</SectionTitle>
          {notes.map((n, i) => (
            <div key={i} className="flex gap-2 text-[11px] text-blue-300/80">
              <span className="text-blue-400 flex-shrink-0">ℹ</span>
              <span>{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InsulationOption({ opt, isSelected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-3 transition-all ${
        isSelected
          ? "border-amber-500/50 bg-amber-500/10"
          : opt.feasible
            ? "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
            : "border-red-500/20 bg-red-500/5 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div>
          <span className={`text-xs font-semibold ${isSelected ? "text-amber-300" : "text-white/80"}`}>
            {opt.material}
          </span>
          {opt.breathable && <span className="ml-2 text-[10px] text-green-400 border border-green-500/30 rounded px-1">respirabil</span>}
          {!opt.feasible && <span className="ml-2 text-[10px] text-red-400 border border-red-500/30 rounded px-1">grosime dep.</span>}
          {opt.target_met && <span className="ml-2 text-[10px] text-green-400 border border-green-500/30 rounded px-1">U atins</span>}
        </div>
        <span className="text-[10px] text-amber-400 font-mono flex-shrink-0">
          {opt.U_achieved?.toFixed(3)} W/(m²·K)
        </span>
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] text-white/40">
        {opt.thickness_mm > 0 && <span>Grosime: <span className="text-white/60">{opt.thickness_mm} mm</span></span>}
        {opt.cost_m2 > 0 && <span>Cost: <span className="text-white/60">~{opt.cost_m2} RON/m²</span></span>}
        {opt.cost_total_eur && <span>Total: <span className="text-white/60">~{opt.cost_total_eur} EUR</span></span>}
      </div>
      {opt.notes && (
        <p className="text-[10px] text-white/30 mt-1.5 leading-tight">{opt.notes}</p>
      )}
    </button>
  );
}

function ElementInsulationPanel({ element, lmiClass, onUpdateElement }) {
  const [targetU, setTargetU] = useState(0.35);
  const [selectedOptId, setSelectedOptId] = useState(null);
  const [open, setOpen] = useState(false);

  const currentU = useMemo(() => calcUElement(element, element.type === 'PD' ? 'floor' : 'wall'), [element]);
  const options  = useMemo(
    () => calcHistoricInsulationOptions(element, targetU, lmiClass),
    [element, targetU, lmiClass]
  );

  const elementTypeLabel = { PE: 'Perete exterior', PD: 'Planșeu/Podea', PT: 'Tavan/Acoperiș', PP: 'Planșeu peste teren', PI: 'Planșeu intermediar' }[element.type] || element.type;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">{elementTypeLabel}</span>
          <span className="text-xs text-white/70 font-medium">{element.name || element.id || "Element"}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-white/50">U = {currentU.toFixed(3)} W/(m²·K)</span>
          <span className={`text-[10px] ${open ? "rotate-180" : ""} transition-transform text-white/30`}>▼</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">
          {/* Selector U țintă */}
          <div className="flex items-center gap-3">
            <label className="text-[10px] text-white/40 whitespace-nowrap">U țintă:</label>
            <input
              type="range" min={0.10} max={1.00} step={0.05}
              value={targetU}
              onChange={e => setTargetU(parseFloat(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="font-mono text-xs text-amber-400 w-20 text-right">{targetU.toFixed(2)} W/(m²·K)</span>
          </div>

          {/* Opțiuni izolație */}
          {options.length === 0 && (
            <p className="text-xs text-white/30 text-center py-2">Nu există soluții compatibile.</p>
          )}
          <div className="grid gap-2">
            {options.slice(0, 5).map(opt => (
              <InsulationOption
                key={opt.id}
                opt={opt}
                isSelected={selectedOptId === opt.id}
                onSelect={() => {
                  setSelectedOptId(prev => prev === opt.id ? null : opt.id);
                  if (selectedOptId !== opt.id && onUpdateElement) {
                    onUpdateElement(element.id, {
                      historic_insulation: opt.id,
                      historic_thickness_mm: opt.thickness_mm,
                      historic_U_achieved: opt.U_achieved,
                    });
                  }
                }}
              />
            ))}
          </div>
          {options.length > 5 && (
            <p className="text-[10px] text-white/30 text-center">+{options.length - 5} opțiuni suplimentare disponibile</p>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Componenta principală
// ──────────────────────────────────────────────
export default function HistoricBuildingPanel({ building, opaqueElements = [], onUpdateElement, onUpdateBuilding }) {
  const [isActive, setIsActive] = useState(!!(building?.lmiClass));
  const [lmiClass, setLmiClass] = useState(building?.lmiClass || null);
  const [activeTab, setActiveTab] = useState("constraints");

  const constraintData = useMemo(
    () => checkHistoricConstraints({ ...building, lmiClass }, opaqueElements),
    [building, lmiClass, opaqueElements]
  );

  const handleToggle = () => {
    const newActive = !isActive;
    setIsActive(newActive);
    if (!newActive) {
      setLmiClass(null);
      onUpdateBuilding?.({ lmiClass: null });
    }
  };

  const handleClassChange = (cls) => {
    setLmiClass(cls);
    onUpdateBuilding?.({ lmiClass: cls });
  };

  // Elemente de anvelopă relevante (pereți exteriori, planșee)
  const relevantElements = opaqueElements.filter(e => ['PE', 'PD', 'PP'].includes(e.type));

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0f1a] overflow-hidden">
      {/* Header toggle */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 transition-all"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🏛</span>
          <div>
            <div className="text-sm font-semibold text-white/90">Clădire cu statut de monument / protejată</div>
            <div className="text-[10px] text-white/35 mt-0.5">
              LMI — Lista Monumentelor Istorice (Legea 422/2001, OG 43/2000)
            </div>
          </div>
        </div>
        <div className={`w-11 h-6 rounded-full border transition-all flex items-center px-1 ${
          isActive ? "bg-amber-500/30 border-amber-500/50" : "bg-white/5 border-white/15"
        }`}>
          <div className={`w-4 h-4 rounded-full transition-all ${isActive ? "bg-amber-400 translate-x-5" : "bg-white/25"}`} />
        </div>
      </div>

      {isActive && (
        <div className="border-t border-white/10 px-5 pb-5 pt-4 space-y-5">
          {/* Selector clasă LMI */}
          <div>
            <SectionTitle>Clasă LMI (Clasa monumentului)</SectionTitle>
            <LMIClassSelector value={lmiClass} onChange={handleClassChange} />
            {!lmiClass && (
              <p className="text-[10px] text-amber-400/60 mt-2">Selectați clasa LMI pentru a vedea constrângerile aplicabile.</p>
            )}
          </div>

          {lmiClass && (
            <>
              {/* Tab-uri */}
              <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                {[
                  { id: "constraints", label: "Constrângeri" },
                  { id: "catalog",     label: "Catalog izolații" },
                  { id: "elements",    label: `Elemente (${relevantElements.length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab: Constrângeri */}
              {activeTab === "constraints" && (
                <ConstraintsList
                  constraints={constraintData.constraints}
                  forbidden={constraintData.forbiddenInterventions}
                  allowed={constraintData.allowedInterventions}
                  notes={constraintData.notes}
                />
              )}

              {/* Tab: Catalog izolații */}
              {activeTab === "catalog" && (
                <div className="space-y-3">
                  <SectionTitle>Catalog soluții izolație interioară — compatibile clasă {lmiClass}</SectionTitle>
                  <div className="grid gap-2">
                    {HISTORIC_INSULATION_CATALOG.filter(m => m.suitable_for.includes(lmiClass)).map(mat => (
                      <div key={mat.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-white/80">{mat.name}</span>
                          <div className="flex gap-2 text-[10px] font-mono">
                            <span className="text-amber-400">λ = {mat.lambda}</span>
                            <span className="text-white/30">W/(m·K)</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-[10px] text-white/40 mb-2">
                          <span>ρ = {mat.rho} kg/m³</span>
                          <span>μ = {mat.vapor_mu === 999 ? "∞" : mat.vapor_mu}</span>
                          <span>Cost: ~{mat.cost_m2_per_cm} RON/m²·cm</span>
                          <span>Max: {mat.maxThickness_mm} mm</span>
                          {mat.breathable && <Badge color="green">respirabil</Badge>}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <p className="text-green-400/70 mb-1">Avantaje:</p>
                            {mat.pros.map((p, i) => <p key={i} className="text-white/45 leading-tight">+ {p}</p>)}
                          </div>
                          <div>
                            <p className="text-red-400/70 mb-1">Dezavantaje:</p>
                            {mat.cons.map((c, i) => <p key={i} className="text-white/45 leading-tight">− {c}</p>)}
                          </div>
                        </div>
                        {mat.notes && <p className="text-[10px] text-white/30 mt-2 italic leading-tight">{mat.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Elemente */}
              {activeTab === "elements" && (
                <div className="space-y-3">
                  <SectionTitle>Recalcul U cu izolație interioară per element</SectionTitle>
                  {relevantElements.length === 0 ? (
                    <div className="rounded-xl border border-white/10 p-4 text-center text-xs text-white/30">
                      Nu există elemente de anvelopă definite. Adăugați pereți/planșee în pasul Anvelopă.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {relevantElements.map(el => (
                        <ElementInsulationPanel
                          key={el.id || el.name}
                          element={el}
                          lmiClass={lmiClass}
                          onUpdateElement={onUpdateElement}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
