import React, { useState, useCallback } from "react";
import { cn, Card, Input, Select, Badge } from "./ui.jsx";
// Audit 2 mai 2026 — P1.15: bilingv RO/EN — translations central
import { T } from "../data/translations.js";

// ═══════════════════════════════════════════════════════════════
// Pure helpers exportate pentru testare (nu necesită DOM)
// ═══════════════════════════════════════════════════════════════

/** Generează următorul cod ZU incremental pentru spații neîncălzite */
export function nextUnheatedCode(spaces = []) {
  const used = new Set((spaces || []).map((s) => (s?.code || "").toUpperCase()));
  let i = 1;
  while (used.has(`ZU${i}`)) i++;
  return `ZU${i}`;
}

/** Returnează defaults rezidențiale pentru obiecte sanitare (1 per apartament) */
export function getResidentialFixturesDefaults(nApartments = 1) {
  const n = Math.max(1, parseInt(nApartments) || 1);
  return {
    lavoare: String(n),
    cada_baie: String(n),
    spalatoare: String(n),
    rezervor_wc: String(n),
    bideuri: "0",
    pisoare: "0",
    dus: String(n),
    masina_spalat_vase: "0",
    masina_spalat_rufe: String(n),
  };
}

/** Verifică dacă obiectul fixtures e "efectiv gol" (toate 0/""). */
export function isFixturesEmpty(fixtures = {}) {
  const vals = Object.values(fixtures || {});
  if (vals.length === 0) return true;
  return vals.every((v) => !v || v === "0" || v === "");
}

/** Calculează flaguri vizibilitate per grup din state-ul complet. */
export function computeVisibility({
  building = {}, heating = {}, cooling = {}, ventilation = {}, acm = {}, otherRenew = {}, lighting = {},
} = {}) {
  const category = building?.category || "";
  const ventType = String(ventilation?.type || "").toLowerCase();
  return {
    hasCooling: !!cooling?.hasCooling,
    hasVentHR: ventType.includes("hr"),
    hasWind: !!otherRenew?.windEnabled,
    isBlock: ["RC", "RA", "BC"].includes(category),
    isResidential: ["RI", "RC", "RA", "BC"].includes(category),
    hasLocalHeating: [
      "soba_teracota", "cazan_lemn", "cazan_peleti",
      "SOBA", "CAZAN_LEMN", "CAZAN_PELET",
    ].includes(heating?.source),
    hasInstantBoiler: ["boiler_instant", "BOILER_INSTANT"].includes(acm?.source),
    lightingMixt: ["mixt", "MIXT"].includes(lighting?.type),
  };
}

/** Validare simplă câmp numeric cu range (returnează mesaj eroare sau ""). */
export function validateNumericRange(value, { min, max, label = "Valoare" } = {}) {
  if (value === "" || value === null || value === undefined) return "";
  const num = parseFloat(value);
  if (Number.isNaN(num)) return `${label}: format numeric invalid`;
  if (min != null && num < min) return `${label}: minim ${min}`;
  if (max != null && num > max) return `${label}: maxim ${max}`;
  return "";
}

/**
 * AnexaMDLPAFields — UI pentru 35 câmpuri extinse Anexa 1+2 MDLPA
 *
 * Acoperă gap-urile din completarea automată DOCX identificate în Sprint monolith
 * (commit 5ed62bc, 20 apr 2026) — câmpurile sunt deja în state (`INITIAL_BUILDING`),
 * payload (`Step6Certificate`) și procesate server-side (`generate-document.py`).
 * Această componentă doar le expune în UI prin formular structurat.
 *
 * Grupe:
 *  A. Încălzire extensii (9 câmpuri + tabel radiatoare editabil)
 *  B. Anvelopă / Clădire (2 câmpuri + tabel spații neîncălzite)
 *  C. ACM extensii (7 câmpuri + tabel obiecte sanitare)
 *  D. Răcire extensii (8 câmpuri, condiționat cooling activ)
 *  E. Ventilare + Iluminat (5 câmpuri, condiționat)
 *  F. Regenerabile eoliene (4 câmpuri, condiționat wind activ)
 *  + Umidificare opțional
 *
 * Vizibilitate condiționată pe state-ul existent (heating/cooling/ventilation/
 * acm/otherRenew) — stub UI transparent când feature-ul nu e activ.
 *
 * Props:
 *  - building: obiect state clădire (INITIAL_BUILDING)
 *  - setBuilding: setter pentru clădire
 *  - heating, cooling, ventilation, acm, otherRenew, lighting: obiecte state
 *    pentru vizibilitate condiționată
 *  - lang: "RO" | "EN"
 */
export default function AnexaMDLPAFields({
  building, setBuilding,
  heating, cooling, ventilation, acm, otherRenew, lighting,
  lang = "RO",
}) {
  // Audit 2 mai 2026 — P1.15: helper de traducere (RO=key, EN=T[key].EN)
  const t = useCallback((key) => (lang === "EN" ? (T[key]?.EN || key) : key), [lang]);

  // Grupa expandat-colapsat pentru ergonomie (toate deschise default)
  // Audit 2 mai 2026 — P1.5: grup G „Detalii tehnice extinse" (EPBD 2024 indicatori)
  // Audit 2 mai 2026 — P1.13: grup H „Sisteme comune bloc" (RC only)
  // 2 mai 2026 — I „Etape implementare + Stimulente financiare"
  const [expanded, setExpanded] = useState({
    A: true, B: false, C: false, D: false, E: false, F: false, G: false, H: false, I: false,
  });
  const toggle = useCallback((key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Helper update câmp simplu în building
  const update = useCallback((field, value) => {
    setBuilding((prev) => ({ ...prev, [field]: value }));
  }, [setBuilding]);

  // Helper update câmp nested (ex. acmFixtures.lavoare)
  const updateNested = useCallback((parent, key, value) => {
    setBuilding((prev) => ({
      ...prev,
      [parent]: { ...(prev[parent] || {}), [key]: value },
    }));
  }, [setBuilding]);

  // Audit 2 mai 2026 — P1.13: helper pentru commonSystems (nested 2x).
  // Path: building.commonSystems[systemKey].field
  const updateCommonSystem = useCallback((systemKey, field, value) => {
    setBuilding((prev) => ({
      ...prev,
      commonSystems: {
        ...(prev.commonSystems || {}),
        [systemKey]: {
          ...(prev.commonSystems?.[systemKey] || {}),
          [field]: value,
        },
      },
    }));
  }, [setBuilding]);

  // ── Vizibilități condiționate ──
  const hasCooling = !!cooling?.hasCooling;
  const hasVentHR = ventilation?.type && String(ventilation.type).toLowerCase().includes("hr");
  const hasWind = !!otherRenew?.windEnabled;
  const isBlock = ["RC", "RA", "BC"].includes(building?.category);
  const isResidential = ["RI", "RC", "RA", "BC"].includes(building?.category);
  const hasLocalHeating = ["soba_teracota", "cazan_lemn", "cazan_peleti", "SOBA", "CAZAN_LEMN", "CAZAN_PELET"].includes(heating?.source);
  const hasInstantBoiler = ["boiler_instant", "BOILER_INSTANT"].includes(acm?.source);
  const lightingMixt = ["mixt", "MIXT"].includes(lighting?.type);

  // ── HEATING RADIATORS tabel ──
  const radiators = Array.isArray(building?.heatingRadiators) ? building.heatingRadiators : [];
  const addRadiator = () => {
    setBuilding((prev) => ({
      ...prev,
      heatingRadiators: [
        ...(prev.heatingRadiators || []),
        { type: "Radiator oțel", count_private: 1, count_common: 0, power_kw: "" },
      ],
    }));
  };
  const removeRadiator = (i) => {
    setBuilding((prev) => ({
      ...prev,
      heatingRadiators: (prev.heatingRadiators || []).filter((_, idx) => idx !== i),
    }));
  };
  const updateRadiator = (i, key, value) => {
    setBuilding((prev) => ({
      ...prev,
      heatingRadiators: (prev.heatingRadiators || []).map((r, idx) =>
        idx === i ? { ...r, [key]: value } : r
      ),
    }));
  };

  // ── UNHEATED SPACES tabel ──
  const unheatedSpaces = Array.isArray(building?.unheatedSpaces) ? building.unheatedSpaces : [];
  const addUnheatedSpace = () => {
    setBuilding((prev) => {
      const prevList = prev.unheatedSpaces || [];
      return {
        ...prev,
        unheatedSpaces: [
          ...prevList,
          { code: nextUnheatedCode(prevList), diameter_mm: "", length_m: "" },
        ],
      };
    });
  };
  const removeUnheatedSpace = (i) => {
    setBuilding((prev) => ({
      ...prev,
      unheatedSpaces: (prev.unheatedSpaces || []).filter((_, idx) => idx !== i),
    }));
  };
  const updateUnheatedSpace = (i, key, value) => {
    setBuilding((prev) => ({
      ...prev,
      unheatedSpaces: (prev.unheatedSpaces || []).map((r, idx) =>
        idx === i ? { ...r, [key]: value } : r
      ),
    }));
  };

  // ── ACM FIXTURES defaults ──
  const fixtures = building?.acmFixtures || {};
  const fillFixturesDefaults = () => {
    const nApt = parseInt(building?.nApartments || building?.units || "1") || 1;
    setBuilding((prev) => ({
      ...prev,
      acmFixtures: getResidentialFixturesDefaults(nApt),
    }));
  };
  const fixturesEmpty = isFixturesEmpty(fixtures);

  // ── Common UI atoms ──
  const SectionHeader = ({ id, title, subtitle, visible = true }) => (
    <button
      type="button"
      onClick={() => toggle(id)}
      aria-expanded={expanded[id]}
      aria-controls={`mdlpa-section-${id}`}
      className={cn(
        "w-full flex items-start justify-between gap-2 px-3 py-2 rounded-lg transition-all",
        visible ? "bg-white/5 hover:bg-white/10" : "bg-white/[0.02] opacity-60"
      )}
    >
      <div className="text-left min-w-0">
        <div className="text-xs font-semibold leading-snug">{title}</div>
        {subtitle && <div className="text-[11px] opacity-40 mt-0.5 leading-snug">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        {!visible && <Badge color="amber">Inactiv</Badge>}
        <span className="text-base opacity-50" aria-hidden="true">
          {expanded[id] ? "−" : "+"}
        </span>
      </div>
    </button>
  );

  const Radio = ({ value, options, onChange, ariaLabel }) => (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const lab = typeof opt === "string" ? opt : opt.label;
        const active = value === val;
        return (
          <button
            key={val}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? "" : val)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs border transition-all",
              active
                ? "bg-amber-500/20 border-amber-500/50 text-amber-200"
                : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70"
            )}
          >
            {lab}
          </button>
        );
      })}
    </div>
  );

  const FieldWrap = ({ label, children, help, className = "" }) => (
    <div className={cn("flex flex-col justify-between gap-1.5", className)}>
      <div className="text-[11px] font-medium opacity-60 leading-tight min-h-[2.5rem] flex items-start">
        <span>
          {label}
          {help && <span className="ml-1 opacity-40 cursor-help" title={help}>ⓘ</span>}
        </span>
      </div>
      {children}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  return (
    <Card
      title="Anexa 1+2 MDLPA — Completare automată detaliată"
      subtitle={<Badge color="blue">Ord. 16/2023</Badge>}
      className="mb-4"
    >
      <div className="text-[11px] opacity-50 mb-4">
        Câmpuri opționale pentru creșterea gradului de completare automată în
        DOCX Anexa 1+2 (de la ~60% la &gt;90%). Toate au defaults sensibile
        server-side. Completează doar ceea ce ai măsurat pe teren.
      </div>

      <div className="space-y-4">
        {/* ──────────── GRUP A — ÎNCĂLZIRE ──────────── */}
        <div>
          <SectionHeader
            id="A"
            title="A. Încălzire — detalii generator + corpuri statice"
            subtitle="Locație generator, radiatoare, contor, diametre racord centralizat"
          />
          {expanded.A && (
            <div id="mdlpa-section-A" className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-4">
              <FieldWrap
                label="Locație generator căldură"
                help="Unde este amplasat generatorul principal"
              >
                <Select
                  value={building?.heatGenLocation || ""}
                  onChange={(v) => update("heatGenLocation", v)}
                  placeholder="Selectează locația..."
                  options={[
                    { value: "CT_PROP", label: "Centrală termică proprie în clădire" },
                    { value: "CT_EXT", label: "Centrală termică în exteriorul clădirii" },
                    { value: "TERMOFICARE", label: "Termoficare cu racordare la punct termic" },
                    { value: "SURSA_PROPRIE", label: "Sursă proprie (individuală, lemn foc etc.)" },
                  ]}
                />
              </FieldWrap>

              <FieldWrap label="Altă sursă sau sursă mixtă (precizați)">
                <Input
                  type="text"
                  value={building?.heatingOtherSource || ""}
                  onChange={(v) => update("heatingOtherSource", v)}
                  placeholder="ex: pompă geotermală + cazan backup"
                  ariaLabel="Altă sursă încălzire precizare"
                />
              </FieldWrap>

              <FieldWrap label="Tip corp static dominant">
                <Select
                  value={building?.heatingRadiatorType || ""}
                  onChange={(v) => update("heatingRadiatorType", v)}
                  placeholder="Selectează tip..."
                  options={[
                    "Radiator oțel",
                    "Radiator fontă",
                    "Radiator aluminiu",
                    "Convector",
                    "Fan-coil",
                    "Încălzire prin pardoseală",
                    "Alte",
                  ]}
                />
              </FieldWrap>

              <FieldWrap
                label="Contor de căldură încălzire"
                help="Contor individual la nivel de apartament/zonă"
              >
                <Radio
                  ariaLabel="Contor căldură încălzire"
                  value={building?.heatingHasMeter || ""}
                  onChange={(v) => update("heatingHasMeter", v)}
                  options={[
                    { value: "da", label: "Există" },
                    { value: "nu", label: "Nu există" },
                    { value: "nu_caz", label: "N/A" },
                  ]}
                />
              </FieldWrap>

              <FieldWrap
                label="Repartitoare costuri"
                help="Repartitoare pe fiecare corp static"
              >
                <Radio
                  ariaLabel="Repartitoare costuri"
                  value={building?.heatingCostAllocator || ""}
                  onChange={(v) => update("heatingCostAllocator", v)}
                  options={[
                    { value: "da", label: "Există" },
                    { value: "nu", label: "Nu există" },
                    { value: "nu_caz", label: "N/A" },
                  ]}
                />
              </FieldWrap>

              <FieldWrap
                label="Diametru nominal racord centralizat"
                help="Pentru termoficare sau CT exterior (10-500 mm)"
              >
                <Input
                  type="number"
                  unit="mm"
                  value={building?.heatingPipeDiameterMm || ""}
                  onChange={(v) => update("heatingPipeDiameterMm", v)}
                  min={10}
                  max={500}
                  placeholder="ex: 50"
                />
              </FieldWrap>

              <FieldWrap
                label="Presiune disponibilă racord"
                help="mCA = metri coloană apă (0.5-15)"
              >
                <Input
                  type="number"
                  unit="mCA"
                  value={building?.heatingPipePressureMca || ""}
                  onChange={(v) => update("heatingPipePressureMca", v)}
                  min={0.5}
                  max={15}
                  step={0.1}
                  placeholder="ex: 3.5"
                />
              </FieldWrap>

              {hasLocalHeating && (
                <FieldWrap
                  label="Număr sobe"
                  help="Vizibil doar pentru surse locale (sobe, cazan lemn/peleți)"
                >
                  <Input
                    type="number"
                    value={building?.stoveCount || ""}
                    onChange={(v) => update("stoveCount", v)}
                    min={0}
                    max={20}
                    placeholder="ex: 2"
                  />
                </FieldWrap>
              )}

              {/* ── Tabel radiatoare — vizibil când heatingRadiatorType e setat ── */}
              {building?.heatingRadiatorType && (
                <div className="col-span-full mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium uppercase tracking-wider opacity-70">
                      Tabel corpuri statice (detaliat per tip)
                    </div>
                    <button
                      type="button"
                      onClick={addRadiator}
                      className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition"
                      aria-label="Adaugă rând radiator"
                    >
                      + Adaugă rând
                    </button>
                  </div>
                  {radiators.length === 0 ? (
                    <div className="text-[11px] opacity-40 italic py-3 text-center border border-dashed border-white/10 rounded-lg">
                      Fără radiatoare — apasă &quot;Adaugă rând&quot; pentru primul
                    </div>
                  ) : (
                    <table className="w-full table-fixed text-xs">
                      <colgroup>
                        <col className="w-[40%]" />
                        <col className="w-[20%]" />
                        <col className="w-[20%]" />
                        <col className="w-[15%]" />
                        <col className="w-[5%]" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-1.5 px-2 font-medium opacity-60">Tip</th>
                          <th className="text-center py-1.5 px-1 font-medium opacity-60">Nr. spațiu privat</th>
                          <th className="text-center py-1.5 px-1 font-medium opacity-60">Nr. spațiu comun</th>
                          <th className="text-center py-1.5 px-1 font-medium opacity-60">Putere [kW]</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {radiators.map((r, i) => (
                          <tr key={i} className="border-b border-white/5">
                            <td className="py-1 px-1">
                              <input
                                type="text"
                                value={r.type || ""}
                                onChange={(e) => updateRadiator(i, "type", e.target.value)}
                                className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500/50"
                                aria-label={`Tip radiator rândul ${i + 1}`}
                              />
                            </td>
                            <td className="py-1 px-1">
                              <input
                                type="number"
                                value={r.count_private || ""}
                                onChange={(e) => updateRadiator(i, "count_private", e.target.value)}
                                className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-amber-500/50"
                                min={0}
                                aria-label={`Număr privat rândul ${i + 1}`}
                              />
                            </td>
                            <td className="py-1 px-1">
                              <input
                                type="number"
                                value={r.count_common || ""}
                                onChange={(e) => updateRadiator(i, "count_common", e.target.value)}
                                className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-amber-500/50"
                                min={0}
                                aria-label={`Număr comun rândul ${i + 1}`}
                              />
                            </td>
                            <td className="py-1 px-1">
                              <input
                                type="number"
                                value={r.power_kw || ""}
                                onChange={(e) => updateRadiator(i, "power_kw", e.target.value)}
                                className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-amber-500/50"
                                min={0}
                                step={0.1}
                                aria-label={`Putere radiator rândul ${i + 1}`}
                              />
                            </td>
                            <td className="py-1 text-center">
                              <button
                                type="button"
                                onClick={() => removeRadiator(i)}
                                className="text-red-400/70 hover:text-red-400 text-lg"
                                aria-label={`Șterge rândul ${i + 1}`}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ──────────── GRUP B — ANVELOPĂ / CLĂDIRE ──────────── */}
        <div>
          <SectionHeader
            id="B"
            title="B. Anvelopă / Clădire — spații neîncălzite + apartamente"
            subtitle="Conducte în spații neîncălzite + apartamente debranșate (RC/RA/BC)"
          />
          {expanded.B && (
            <div id="mdlpa-section-B" className="mt-3 space-y-4">
              {/* Tabel spații neîncălzite */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium uppercase tracking-wider opacity-70">
                    Spații neîncălzite — conducte agent termic
                  </div>
                  <button
                    type="button"
                    onClick={addUnheatedSpace}
                    className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition"
                    aria-label="Adaugă spațiu neîncălzit"
                  >
                    + Adaugă zonă
                  </button>
                </div>
                {unheatedSpaces.length === 0 ? (
                  <div className="text-[11px] opacity-40 italic py-3 text-center border border-dashed border-white/10 rounded-lg">
                    Fără spații neîncălzite declarate
                  </div>
                ) : (
                  <table className="w-full table-fixed text-xs">
                    <colgroup>
                      <col className="w-[28%]" />
                      <col className="w-[33%]" />
                      <col className="w-[33%]" />
                      <col className="w-[6%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-1.5 px-2 font-medium opacity-60">Cod zonă</th>
                        <th className="text-center py-1.5 px-1 font-medium opacity-60">Diametru tronson [mm]</th>
                        <th className="text-center py-1.5 px-1 font-medium opacity-60">Lungime tronson [m]</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {unheatedSpaces.map((s, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="py-1 px-1">
                            <input
                              type="text"
                              value={s.code || ""}
                              onChange={(e) => updateUnheatedSpace(i, "code", e.target.value)}
                              className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500/50"
                              aria-label={`Cod zonă rândul ${i + 1}`}
                            />
                          </td>
                          <td className="py-1 px-1">
                            <input
                              type="number"
                              value={s.diameter_mm || ""}
                              onChange={(e) => updateUnheatedSpace(i, "diameter_mm", e.target.value)}
                              className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-amber-500/50"
                              min={10}
                              max={500}
                              aria-label={`Diametru rândul ${i + 1}`}
                            />
                          </td>
                          <td className="py-1 px-1">
                            <input
                              type="number"
                              value={s.length_m || ""}
                              onChange={(e) => updateUnheatedSpace(i, "length_m", e.target.value)}
                              className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-amber-500/50"
                              min={0}
                              step={0.5}
                              aria-label={`Lungime rândul ${i + 1}`}
                            />
                          </td>
                          <td className="py-1 text-center">
                            <button
                              type="button"
                              onClick={() => removeUnheatedSpace(i)}
                              className="text-red-400/70 hover:text-red-400 text-lg"
                              aria-label={`Șterge rândul ${i + 1}`}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Apartamente debranșate (RC/RA/BC only) */}
              {isBlock && (
                <FieldWrap
                  label="Apartamente debranșate în condominiu"
                  help="Vizibil doar pentru bloc (RC/RA/BC)"
                >
                  <Radio
                    ariaLabel="Apartamente debranșate"
                    value={building?.buildingHasDisconnectedApartments || ""}
                    onChange={(v) => update("buildingHasDisconnectedApartments", v)}
                    options={[
                      { value: "da", label: "Există debranșate" },
                      { value: "nu", label: "Fără debranșate" },
                    ]}
                  />
                </FieldWrap>
              )}
            </div>
          )}
        </div>

        {/* ──────────── GRUP C — ACM ──────────── */}
        <div>
          <SectionHeader
            id="C"
            title="C. Apă caldă de consum — echipamente + obiecte sanitare"
            subtitle="Boiler, recirculare, contor, debitmetre, puncte consum"
          />
          {expanded.C && (
            <div id="mdlpa-section-C" className="mt-3 space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <FieldWrap label="Număr total puncte consum ACM">
                  <Input
                    type="number"
                    value={building?.acmConsumePointsCount || ""}
                    onChange={(v) => update("acmConsumePointsCount", v)}
                    min={0}
                    placeholder="ex: 8"
                  />
                </FieldWrap>

                <FieldWrap label="Diametru nominal racord ACM">
                  <Input
                    type="number"
                    unit="mm"
                    value={building?.acmPipeDiameterMm || ""}
                    onChange={(v) => update("acmPipeDiameterMm", v)}
                    min={10}
                    max={200}
                    placeholder="ex: 25"
                  />
                </FieldWrap>

                {hasInstantBoiler && (
                  <FieldWrap
                    label="Putere boiler instant"
                    help="Vizibil doar pentru sursă instant"
                  >
                    <Input
                      type="number"
                      unit="kW"
                      value={building?.acmInstantPowerKw || ""}
                      onChange={(v) => update("acmInstantPowerKw", v)}
                      min={0}
                      step={0.1}
                      placeholder="ex: 18"
                    />
                  </FieldWrap>
                )}

                <FieldWrap label="Contor general ACM">
                  <Radio
                    ariaLabel="Contor ACM"
                    value={building?.acmHasMeter || ""}
                    onChange={(v) => update("acmHasMeter", v)}
                    options={[
                      { value: "da", label: "Există" },
                      { value: "nu", label: "Nu există" },
                      { value: "nu_caz", label: "N/A" },
                    ]}
                  />
                </FieldWrap>

                <FieldWrap label="Debitmetre puncte consum">
                  <Radio
                    ariaLabel="Debitmetre"
                    value={building?.acmFlowMeters || ""}
                    onChange={(v) => update("acmFlowMeters", v)}
                    options={[
                      { value: "peste_tot", label: "Peste tot" },
                      { value: "partial", label: "Parțial" },
                      { value: "nu_exista", label: "Nu există" },
                    ]}
                  />
                </FieldWrap>

                <FieldWrap label="Conductă recirculare ACM">
                  <Radio
                    ariaLabel="Recirculare"
                    value={building?.acmRecirculation || ""}
                    onChange={(v) => update("acmRecirculation", v)}
                    options={[
                      { value: "functionala", label: "Funcțională" },
                      { value: "nu_functioneaza", label: "Nefuncțională" },
                      { value: "nu_exista", label: "Nu există" },
                    ]}
                  />
                </FieldWrap>
              </div>

              {/* Tabel obiecte sanitare */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium uppercase tracking-wider opacity-70">
                    Obiecte sanitare (bucăți)
                  </div>
                  {fixturesEmpty && isResidential && (
                    <button
                      type="button"
                      onClick={fillFixturesDefaults}
                      className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition"
                      aria-label="Completează cu defaults rezidențial"
                    >
                      ⚡ Completează defaults (rezidențial)
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {[
                    { key: "lavoare", label: "Lavoare" },
                    { key: "cada_baie", label: "Cadă de baie" },
                    { key: "spalatoare", label: "Spălătoare" },
                    { key: "rezervor_wc", label: "Rezervor WC" },
                    { key: "bideuri", label: "Bideuri" },
                    { key: "pisoare", label: "Pisoare" },
                    { key: "dus", label: "Duș" },
                    { key: "masina_spalat_vase", label: "Mașini spălat vase" },
                    { key: "masina_spalat_rufe", label: "Mașini spălat rufe" },
                  ].map(({ key, label }) => (
                    <FieldWrap key={key} label={label}>
                      <Input
                        type="number"
                        value={fixtures[key] ?? ""}
                        onChange={(v) => updateNested("acmFixtures", key, v)}
                        min={0}
                        placeholder="0"
                        ariaLabel={`Număr ${label}`}
                      />
                    </FieldWrap>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ──────────── GRUP D — RĂCIRE ──────────── */}
        <div>
          <SectionHeader
            id="D"
            title="D. Răcire / Climatizare — detalii sursă + control"
            subtitle="Agent frigorific, unități split, control umiditate"
            visible={hasCooling}
          />
          {expanded.D && hasCooling && (
            <div id="mdlpa-section-D" className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-4">
              <FieldWrap label="Agent frigorific utilizat (cod)">
                <Select
                  value={building?.coolingRefrigerant || ""}
                  onChange={(v) => update("coolingRefrigerant", v)}
                  placeholder="Selectează cod..."
                  options={[
                    { value: "R32", label: "R32 (ecologic)" },
                    { value: "R410A", label: "R410A" },
                    { value: "R290", label: "R290 (propan, ecologic)" },
                    { value: "R407C", label: "R407C" },
                    { value: "R134a", label: "R134a" },
                    { value: "R22", label: "R22 (vechi, reglementat)" },
                    { value: "alt_cod", label: "Altul" },
                  ]}
                />
              </FieldWrap>

              <FieldWrap label="Necesar frig dezumidificare">
                <Input
                  type="number"
                  unit="kW"
                  value={building?.coolingDehumPowerKw || ""}
                  onChange={(v) => update("coolingDehumPowerKw", v)}
                  min={0}
                  step={0.1}
                  placeholder="ex: 2.5"
                />
              </FieldWrap>

              <FieldWrap label="Număr unități interioare (split)">
                <Input
                  type="number"
                  value={building?.coolingIndoorUnits || ""}
                  onChange={(v) => update("coolingIndoorUnits", v)}
                  min={0}
                  placeholder="ex: 3"
                />
              </FieldWrap>

              <FieldWrap label="Număr unități exterioare (split)">
                <Input
                  type="number"
                  value={building?.coolingOutdoorUnits || ""}
                  onChange={(v) => update("coolingOutdoorUnits", v)}
                  min={0}
                  placeholder="ex: 1"
                />
              </FieldWrap>

              <FieldWrap label="Diametru nominal conducte răcire">
                <Input
                  type="number"
                  unit="mm"
                  value={building?.coolingPipeDiameterMm || ""}
                  onChange={(v) => update("coolingPipeDiameterMm", v)}
                  min={6}
                  max={200}
                  placeholder="ex: 12"
                />
              </FieldWrap>

              <FieldWrap label="Spațiul climatizat">
                <Radio
                  ariaLabel="Spațiu climatizat"
                  value={building?.coolingSpaceScope || ""}
                  onChange={(v) => update("coolingSpaceScope", v)}
                  options={[
                    { value: "complet", label: "Complet (excl. comune)" },
                    { value: "global", label: "Global (incl. comune)" },
                    { value: "partial", label: "Parțial" },
                  ]}
                />
              </FieldWrap>

              <FieldWrap label="Control umiditate interioară">
                <Radio
                  ariaLabel="Control umiditate"
                  value={building?.coolingHumidityControl || ""}
                  onChange={(v) => update("coolingHumidityControl", v)}
                  options={[
                    { value: "fara", label: "Fără control" },
                    { value: "cu_control", label: "Cu control" },
                    { value: "cu_partial", label: "Parțial (ex: iarna)" },
                  ]}
                />
              </FieldWrap>

              <FieldWrap label="Contorizare individuală consumatori">
                <Radio
                  ariaLabel="Contorizare individuală răcire"
                  value={building?.coolingIndividualMeter || ""}
                  onChange={(v) => update("coolingIndividualMeter", v)}
                  options={[
                    { value: "da", label: "Da" },
                    { value: "nu", label: "Nu" },
                  ]}
                />
              </FieldWrap>
            </div>
          )}
        </div>

        {/* ──────────── GRUP E — VENTILARE + ILUMINAT ──────────── */}
        <div>
          <SectionHeader
            id="E"
            title="E. Ventilare + Iluminat — caracteristici operaționale"
            subtitle="Număr ventilatoare, tip recuperator, control ventilare, stare rețea iluminat"
          />
          {expanded.E && (
            <div id="mdlpa-section-E" className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-4">
              <FieldWrap label="Număr total ventilatoare">
                <Input
                  type="number"
                  value={building?.ventilationFanCount || ""}
                  onChange={(v) => update("ventilationFanCount", v)}
                  min={0}
                  placeholder="ex: 4"
                />
              </FieldWrap>

              {hasVentHR && (
                <FieldWrap
                  label="Tip recuperator căldură"
                  help="Vizibil doar cu recuperator HR activ"
                >
                  <Select
                    value={building?.ventilationHrType || ""}
                    onChange={(v) => update("ventilationHrType", v)}
                    placeholder="Selectează tip..."
                    options={[
                      { value: "rotativ", label: "Rotativ" },
                      { value: "placi", label: "Cu plăci (cross-flow)" },
                      { value: "dublu_flux", label: "Dublu flux contra-curent" },
                      { value: "regenerativ", label: "Regenerativ" },
                      { value: "alt", label: "Alt tip" },
                    ]}
                  />
                </FieldWrap>
              )}

              <FieldWrap label="Control ventilare">
                <Radio
                  ariaLabel="Control ventilare"
                  value={building?.ventilationControlType || ""}
                  onChange={(v) => update("ventilationControlType", v)}
                  options={[
                    { value: "program", label: "După program" },
                    { value: "manual_simpla", label: "Acționare manuală" },
                    { value: "temporizare", label: "Cu temporizare" },
                    { value: "jaluzele_reglate", label: "Jaluzele reglate automat" },
                  ]}
                />
              </FieldWrap>

              <FieldWrap label="Starea rețelei electrice iluminat">
                <Radio
                  ariaLabel="Stare rețea iluminat"
                  value={building?.lightingNetworkState || ""}
                  onChange={(v) => update("lightingNetworkState", v)}
                  options={[
                    { value: "buna", label: "Bună" },
                    { value: "uzata", label: "Uzată" },
                    { value: "indisp", label: "Date indisponibile" },
                  ]}
                />
              </FieldWrap>

              {lightingMixt && (
                <FieldWrap
                  label="Iluminat mixt — precizați"
                  help="Vizibil doar pentru iluminat tip mixt"
                >
                  <Input
                    type="text"
                    value={building?.lightingOtherType || ""}
                    onChange={(v) => update("lightingOtherType", v)}
                    placeholder="ex: LED 70% + fluorescent 30%"
                  />
                </FieldWrap>
              )}

              <FieldWrap
                label="Necesar umidificare (opțional)"
                help="Completează doar dacă ai sistem de umidificare dedicat"
              >
                <Input
                  type="number"
                  unit="kW"
                  value={building?.humidificationPowerKw || ""}
                  onChange={(v) => update("humidificationPowerKw", v)}
                  min={0}
                  step={0.1}
                  placeholder="ex: 1.5"
                />
              </FieldWrap>
            </div>
          )}
        </div>

        {/* ──────────── GRUP F — REGENERABILE EOLIENE ──────────── */}
        <div>
          <SectionHeader
            id="F"
            title="F. Regenerabile eoliene — detalii centrale"
            subtitle="Număr, putere, dimensiuni rotor"
            visible={hasWind}
          />
          {expanded.F && hasWind && (
            <div id="mdlpa-section-F" className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-4">
              <FieldWrap label="Număr centrale eoliene">
                <Input
                  type="number"
                  value={building?.windCentralsCount || ""}
                  onChange={(v) => update("windCentralsCount", v)}
                  min={1}
                  placeholder="ex: 1"
                />
              </FieldWrap>

              <FieldWrap label="Putere nominală totală">
                <Input
                  type="number"
                  unit="kW"
                  value={building?.windPowerKw || ""}
                  onChange={(v) => update("windPowerKw", v)}
                  min={0}
                  step={0.1}
                  placeholder="ex: 3.5"
                />
              </FieldWrap>

              <FieldWrap label="Înălțime ax rotor">
                <Input
                  type="number"
                  unit="m"
                  value={building?.windHubHeightM || ""}
                  onChange={(v) => update("windHubHeightM", v)}
                  min={0}
                  step={0.1}
                  placeholder="ex: 12"
                />
              </FieldWrap>

              <FieldWrap label="Diametru rotor">
                <Input
                  type="number"
                  unit="m"
                  value={building?.windRotorDiameterM || ""}
                  onChange={(v) => update("windRotorDiameterM", v)}
                  min={0}
                  step={0.1}
                  placeholder="ex: 5"
                />
              </FieldWrap>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          G. Detalii tehnice extinse (EPBD 2024 + ani echipamente)
          Audit 2 mai 2026 — P1.5: înainte 8+ câmpuri erau trimise mereu
          goale în payload Step6Certificate (no UI). Acum expuse explicit:
            - Calitate aer interior (CO₂ ppm, PM2.5)
            - EV charging (puncte instalate + pre-cablate)
            - Vechime echipamente (an instalare HVAC)
            - Detalii distribuție (izolație conducte, valve echilibrare)
            - Mod operare confort (factor umbrire, atic încălzit)
          ════════════════════════════════════════════════════════════ */}
      <div className="mt-3">
        <SectionHeader
          id="G"
          title={t("G. Detalii tehnice extinse (EPBD 2024 + vechime echipamente)")}
          subtitle={lang === "EN"
            ? "Air quality · EV charging · HVAC/DHW/vent installation years · pipe insulation · shading factor"
            : "Calitate aer · EV charging · ani instalare HVAC/ACM/ventilare · izolație conducte · factor umbrire"}
        />
        {expanded.G && (
          <div id="mdlpa-section-G" className="grid grid-cols-2 gap-4 px-3 pt-3 pb-1">
            {/* Calitate aer interior — EPBD Art. 14 (IAQ) */}
            <FieldWrap
              label="CO₂ maxim încăpere de referință [ppm]"
              help="Indicator IAQ EPBD 2024 Art. 14. Standard SR EN 16798-1: cat. I ≤ 750, cat. II ≤ 950, cat. III ≤ 1200 ppm."
            >
              <Input
                type="number"
                value={building?.co2MaxPpm || ""}
                onChange={(v) => update("co2MaxPpm", v)}
                min={400} max={5000} step={10}
                placeholder="ex: 950"
              />
            </FieldWrap>
            <FieldWrap
              label="PM2.5 mediu interior [µg/m³]"
              help="Pulberi fine — EPBD 2024 IAQ. WHO 2021: media anuală ≤ 5 µg/m³."
            >
              <Input
                type="number"
                value={building?.pm25Avg || ""}
                onChange={(v) => update("pm25Avg", v)}
                min={0} max={500} step={0.5}
                placeholder="ex: 8"
              />
            </FieldWrap>

            {/* EV charging — EPBD Art. 14 (clădiri rezidențiale + nerezidențiale > 5 locuri) */}
            <FieldWrap
              label="Puncte încărcare EV instalate"
              help="EPBD 2024 Art. 14: parcări asociate clădirii — min. 1 punct la 10 locuri (nerezidențial existent), 1 punct la 5 (nou). Rezidențial nou: min. 50% locuri pre-cablate."
            >
              <Input
                type="number"
                value={building?.evChargingPoints || ""}
                onChange={(v) => update("evChargingPoints", v)}
                min={0} step={1}
                placeholder="ex: 2"
              />
            </FieldWrap>
            <FieldWrap
              label="Locuri pre-cablate EV (fără echipament)"
              help="Pre-pregătire infrastructură EV — instalare ulterioară punct fără re-săpături."
            >
              <Input
                type="number"
                value={building?.evChargingPrepared || ""}
                onChange={(v) => update("evChargingPrepared", v)}
                min={0} step={1}
                placeholder="ex: 6"
              />
            </FieldWrap>

            {/* Vechime echipamente HVAC */}
            <FieldWrap
              label="An instalare echipament încălzire"
              help="Pentru evaluare vechime și recomandare modernizare. Cazane > 15 ani au randament real semnificativ degradat."
            >
              <Input
                type="number"
                value={building?.heatingYearInstalled || ""}
                onChange={(v) => update("heatingYearInstalled", v)}
                min={1950} max={new Date().getFullYear()} step={1}
                placeholder="ex: 2008"
              />
            </FieldWrap>
            <FieldWrap
              label="An instalare boiler/sistem ACM"
              help="Boilere ACM > 10 ani prezintă pierderi de stocare crescute (corodare, izolație degradată)."
            >
              <Input
                type="number"
                value={building?.acmYearInstalled || ""}
                onChange={(v) => update("acmYearInstalled", v)}
                min={1950} max={new Date().getFullYear()} step={1}
                placeholder="ex: 2015"
              />
            </FieldWrap>
            <FieldWrap
              label="An instalare ventilație mecanică"
              help="HRV > 10 ani: degradare schimbător căldură (eficiență tipic −10–20%)."
            >
              <Input
                type="number"
                value={building?.ventilationYearInstalled || ""}
                onChange={(v) => update("ventilationYearInstalled", v)}
                min={1990} max={new Date().getFullYear()} step={1}
                placeholder="ex: 2018"
              />
            </FieldWrap>

            {/* Detalii distribuție */}
            <FieldWrap
              label="Conducte încălzire izolate?"
              help="Distribuție termică izolată reduce pierderi cu 5–15% (Mc 001-2022 Cap. 6)."
            >
              <Radio
                value={building?.heatingPipeInsulated || ""}
                onChange={(v) => update("heatingPipeInsulated", v)}
                ariaLabel="Conducte încălzire izolate"
                options={[
                  { value: "yes", label: "Da" },
                  { value: "partial", label: "Parțial" },
                  { value: "no", label: "Nu" },
                ]}
              />
            </FieldWrap>
            <FieldWrap
              label="Conducte ACM izolate?"
              help="Conducte ACM neizolate: pierderi de stand-by 10–25% din consumul anual ACM."
            >
              <Radio
                value={building?.acmPipeInsulated || ""}
                onChange={(v) => update("acmPipeInsulated", v)}
                ariaLabel="Conducte ACM izolate"
                options={[
                  { value: "yes", label: "Da" },
                  { value: "partial", label: "Parțial" },
                  { value: "no", label: "Nu" },
                ]}
              />
            </FieldWrap>
            <FieldWrap
              label="Robinete echilibrare circuit încălzire?"
              help="Valve dinamice/statice de echilibrare — necesare pentru distribuție orizontală corectă (L.196/2018)."
            >
              <Radio
                value={building?.heatingHasBalancingValves || ""}
                onChange={(v) => update("heatingHasBalancingValves", v)}
                ariaLabel="Robinete echilibrare"
                options={[
                  { value: "yes", label: "Da" },
                  { value: "no", label: "Nu" },
                  { value: "unknown", label: "Necunoscut" },
                ]}
              />
            </FieldWrap>
            <FieldWrap
              label="Baterii sanitare debit redus?"
              help="Baterii cu aerator/limitator (5–8 L/min) reduc consumul ACM cu 20–30%."
            >
              <Radio
                value={building?.acmFixturesLowFlow || ""}
                onChange={(v) => update("acmFixturesLowFlow", v)}
                ariaLabel="Baterii debit redus"
                options={[
                  { value: "yes", label: "Da" },
                  { value: "partial", label: "Parțial" },
                  { value: "no", label: "Nu" },
                ]}
              />
            </FieldWrap>

            {/* Confort vară + atic */}
            <FieldWrap
              label="Factor umbrire ferestre vară [0–1]"
              help="Coeficient mediu reducere aporturi solare (jaluzele, copertine, copaci). 1 = fără umbrire, 0.3 = umbrire eficientă."
            >
              <Input
                type="number"
                value={building?.shadingFactor || ""}
                onChange={(v) => update("shadingFactor", v)}
                min={0} max={1} step={0.05}
                placeholder="ex: 0.7"
              />
            </FieldWrap>
            <FieldWrap
              label="Atic / pod este încălzit?"
              help="Dacă podul/aticul e încălzit, intră în volumul Vu și anvelopa termică. Altfel, planșeul superior e limita anvelopei."
            >
              <Radio
                value={building?.atticHeated || ""}
                onChange={(v) => update("atticHeated", v)}
                ariaLabel="Atic încălzit"
                options={[
                  { value: "yes", label: "Încălzit" },
                  { value: "no", label: "Neîncălzit" },
                  { value: "na", label: "Nu există" },
                ]}
              />
            </FieldWrap>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          H. Sisteme comune bloc (RC only)
          Audit 2 mai 2026 — P1.13: înainte commonSystems era citit de
          AnexaBloc.jsx dar nepopulat (mereu {} default → niciodată
          afișat). Acum auditorul poate declara liftul, iluminat scări,
          centrală termică comună, ventilație comună, grup pompe.
          Fiecare sistem: instalat (toggle) + putere [kW] + ore/an +
          combustibil (doar centrală termică).
          ════════════════════════════════════════════════════════════ */}
      {isBlock && (
        <div className="mt-3">
          <SectionHeader
            id="H"
            title={t("H. Sisteme comune bloc (multi-apartament)")}
            subtitle={lang === "EN"
              ? "Elevator · stairs lighting · common boiler · common ventilation · pump group"
              : "Lift · iluminat scări · centrală termică comună · ventilație comună · grup pompe"}
          />
          {expanded.H && (
            <div id="mdlpa-section-H" className="grid grid-cols-1 gap-3 px-3 pt-3 pb-1">
              {[
                { key: "elevator", label: t("🛗 Lift"), showFuel: false },
                { key: "stairsLighting", label: t("💡 Iluminat scări/holuri"), showFuel: false },
                { key: "centralHeating", label: t("🔥 Centrală termică comună"), showFuel: true },
                { key: "commonVentilation", label: t("🌬️ Ventilație comună"), showFuel: false },
                { key: "pumpGroup", label: t("💧 Grup pompe (booster apă)"), showFuel: false },
              ].map(({ key, label, showFuel }) => {
                const sys = building?.commonSystems?.[key] || {};
                const installed = !!sys.installed;
                return (
                  <div
                    key={key}
                    className={cn(
                      "rounded-lg border p-3 transition-all",
                      installed
                        ? "bg-emerald-500/[0.04] border-emerald-500/20"
                        : "bg-white/[0.02] border-white/[0.06]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">{label}</span>
                      <button
                        type="button"
                        onClick={() => updateCommonSystem(key, "installed", !installed)}
                        aria-pressed={installed}
                        className={cn(
                          "px-3 py-1 rounded-md text-[11px] font-medium border transition-all",
                          installed
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                            : "bg-white/[0.03] border-white/[0.10] text-white/60 hover:bg-white/[0.06]"
                        )}
                      >
                        {installed ? t("✓ Instalat") : t("Nu există")}
                      </button>
                    </div>
                    {installed && (
                      <div className="grid grid-cols-2 gap-3">
                        <FieldWrap label="Putere [kW]">
                          <Input
                            type="number"
                            value={sys.powerKW || ""}
                            onChange={(v) => updateCommonSystem(key, "powerKW", v)}
                            min={0} step={0.1}
                            placeholder="ex: 5"
                          />
                        </FieldWrap>
                        <FieldWrap label="Ore funcționare/an">
                          <Input
                            type="number"
                            value={sys.hoursYear || ""}
                            onChange={(v) => updateCommonSystem(key, "hoursYear", v)}
                            min={0} step={50}
                            placeholder="ex: 1500"
                          />
                        </FieldWrap>
                        {showFuel && (
                          <FieldWrap label="Combustibil">
                            <Select
                              value={sys.fuel || ""}
                              onChange={(v) => updateCommonSystem(key, "fuel", v)}
                              placeholder="Selectează..."
                              options={[
                                { value: "gaz", label: "Gaz natural" },
                                { value: "termoficare", label: "Termoficare" },
                                { value: "electric", label: "Electric" },
                                { value: "biomasa", label: "Biomasă" },
                                { value: "alt", label: "Altul" },
                              ]}
                            />
                          </FieldWrap>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="text-[10px] opacity-50 mt-1">
                Sistemele declarate aici alimentează tabelul „Sisteme comune bloc" din Anexa 2 multi-apartament și calculul consumurilor comune (L.196/2018).
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── I. Etape implementare + Stimulente financiare ─── */}
      <div className="mt-2 rounded-xl border border-white/10 overflow-hidden">
        <SectionHeader
          id="I"
          title="I. Etape de implementare + Stimulente financiare"
          subtitle="Text liber transferat direct în Anexa 1+2 — auditorul poate edita"
          visible
        />
        {expanded.I && (
          <div className="px-3 pt-3 pb-4 flex flex-col gap-4">

            {/* Etape implementare */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium opacity-60">
                  Etapele de implementare a soluțiilor de creștere a performanței energetice
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const cat = building?.category || "RI";
                    const isBloc = cat === "RC";
                    const isNonRes = ["BI","ED","SA","HC","CO","SP"].includes(cat);
                    const lines = [
                      "1. Identificați minimum 3 oferte comparative de la contractori autorizați.",
                      "2. Verificați eligibilitatea pentru programele de finanțare disponibile (PNRR, Casa Verde Plus, fonduri locale).",
                      isBloc
                        ? "3. Obțineți acordul adunării generale a proprietarilor (L.196/2018) și mandatați asociația de proprietari."
                        : isNonRes
                          ? "3. Aprobați planul de investiții prin decizia conducerii / consiliului de administrație."
                          : "3. Obțineți autorizațiile legale necesare (AC, avize — dacă lucrările le impun).",
                      "4. Implementați măsurile în ordinea priorităților: anvelopă → sisteme termice → surse regenerabile.",
                      "5. Documentați toate lucrările executate și obțineți declarațiile de performanță ale produselor (Reg. 305/2011/UE).",
                      "6. Solicitați o nouă auditare energetică după finalizarea renovării pentru confirmarea clasei energetice.",
                    ];
                    update("etapeImplementare", lines.join("\n"));
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
                >
                  ↺ Generează automat
                </button>
              </div>
              <textarea
                value={building?.etapeImplementare || ""}
                onChange={(e) => update("etapeImplementare", e.target.value)}
                rows={6}
                placeholder={"Completați etapele de implementare sau apăsați «Generează automat» pentru un text pre-completat.\n\nEx: 1. Obțineți oferte de la contractori autorizați.\n2. Verificați eligibilitatea pentru PNRR / Casa Verde Plus."}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 resize-y leading-relaxed"
              />
              <div className="text-[10px] opacity-30">
                Înlocuiește textul implicit din Anexa 1+2 Mc 001-2022 — secțiunea „Enunțarea etapelor".
              </div>
            </div>

            {/* Stimulente financiare */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium opacity-60">
                  Stimulente financiare și posibilități de finanțare disponibile
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const cat = building?.category || "RI";
                    const isResIndiv = ["RI","RA"].includes(cat);
                    const isBloc = cat === "RC";
                    const isPub = ["ED","SA","HC"].includes(cat);
                    const isComm = ["BI","CO","SP"].includes(cat);
                    let lines;
                    if (isResIndiv) {
                      lines = [
                        "— AFM Casa Verde Plus: finanțare 100% pentru pompe de căldură și panouri solare termice (persoane fizice).",
                        "— PNRR C5.2 – Valul Renovării: granturi pentru renovarea energetică a caselor individuale până la standard nZEB.",
                        "— Credite verzi BRD Eco Home / ING Green Loan / BCR Casa Ta: dobânzi preferențiale 3–5% pe an.",
                        "— Deducere din impozitul pe venit (L.227/2015 art. 68 ind.1) pentru instalații pe surse regenerabile.",
                      ];
                    } else if (isBloc) {
                      lines = [
                        "— PNRR C5.2 – Valul Renovării: granturi pentru asociații de proprietari — renovare energetică bloc până la standard nZEB.",
                        "— Programul Național de Renovare Energetică a Blocurilor (ANL/MDLPA): cofinanțare 50–100%.",
                        "— AFM Casa Verde Plus: pompe de căldură și panouri solare termice pentru sistemele comune ale blocului.",
                        "— Credite ipotecare verzi colective (BERD/EIB prin băncile partenere).",
                      ];
                    } else if (isPub) {
                      lines = [
                        "— PNRR C5.1 – Eficiență energetică clădiri publice: finanțare 100% din fonduri europene (prioritate maximă ED/SA/HC).",
                        "— PODD – Programul Operațional Dezvoltare Durabilă (FEDR): accesibil unităților administrativ-teritoriale.",
                        "— Buget de stat și buget local: investiții în infrastructura publică (HG 907/2016 — expertiză tehnică + PT).",
                      ];
                    } else if (isComm) {
                      lines = [
                        "— PNRR C5 – Eficiență energetică clădiri comerciale și de birouri: granturi pentru companii private.",
                        "— Schema de ajutor de stat pentru eficiență energetică (Regulamentul CE 651/2014, art. 38–39).",
                        "— EIB/BERD: credite verzi directe sau prin intermediari bancari autorizați.",
                        "— Deduceri fiscale pentru investiții în eficiență energetică (Codul fiscal, art. 25).",
                      ];
                    } else {
                      lines = [
                        "— PNRR C5 – Eficiență energetică: granturi pentru renovare energetică.",
                        "— Fonduri structurale FEDR (PODD 2021–2027): finanțare investiții cu impact energetic.",
                        "— Credite verzi prin intermediari bancari parteneri BERD/EIB.",
                        "— Scheme ajutor de stat pentru eficiență energetică (CE 651/2014).",
                      ];
                    }
                    update("stimulenteFinanciare", lines.join("\n"));
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
                >
                  ↺ Generează automat
                </button>
              </div>
              <textarea
                value={building?.stimulenteFinanciare || ""}
                onChange={(e) => update("stimulenteFinanciare", e.target.value)}
                rows={5}
                placeholder={"Completați stimulentele aplicabile sau apăsați «Generează automat» pentru lista recomandată.\n\nEx: — AFM Casa Verde Plus: finanțare 100% pompe de căldură.\n— PNRR C5.2 – Valul Renovării: granturi renovare energetică."}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 resize-y leading-relaxed"
              />
              <div className="text-[10px] opacity-30">
                Înlocuiește textul implicit din Anexa 1+2 — secțiunea „Informații privind stimulentele financiare".
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Footer help */}
      <div className="mt-4 pt-3 border-t border-white/5 text-[10px] opacity-30">
        Câmpurile de mai sus sunt folosite pentru completarea automată a
        DOCX Anexa 1+2 MDLPA (Ord. 16/2023). Pentru câmpuri lipsă, generatorul
        server-side aplică defaults sensibile (EN 16798-1, Mc 001-2022).
      </div>
    </Card>
  );
}
