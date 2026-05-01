import React from "react";
import { U_REF_NZEB_RES as U_REF_RES, U_REF_NZEB_NRES as U_REF_NRES, U_REF_GLAZING } from "../data/u-reference.js";
import { NZEB_THRESHOLDS } from "../data/energy-classes.js";
import { calcPenalties } from "../calc/penalties.js";
import { computeAutoSRI } from "../calc/sri-auto-map.js";
import { SRI_CLASS_LABELS } from "../calc/sri-indicator.js";
import AnexaBloc from "./AnexaBloc.jsx";

/**
 * CpeAnexa — Preview Anexa 1 + Anexa 2 Certificat Performanță Energetică
 * Conform Mc 001-2022 / Ordinul MDLPA nr. 2641/2017 (modificat 2024)
 *
 * Anexa 1: Date generale + tehnice + instalații + indicator energetic
 * Anexa 2: Recomandări de îmbunătățire a performanței energetice (apartament)
 *          SAU tabel multi-apartament cu clase individuale (bloc, Sprint 16)
 *
 * Prop `annexType`:
 *   - "apartment" (default) → Anexa 2 = recomandări îmbunătățire
 *   - "building"            → Anexa 2 = tabel multi-apartament (AnexaBloc)
 *
 * Auto-detectare (dacă annexType lipsește): dacă building.apartments.length > 1
 * și category ∈ {RC, RA, BC}, se comportă ca "building".
 */

const ELEMENT_LABELS = {
  PE:"Perete exterior", PR:"Perete la rost", PS:"Perete subsol",
  PT:"Planșeu terasă", PP:"Planșeu pod neîncălzit", PB:"Planșeu subsol neîncălzit",
  PL:"Placă pe sol", SE:"Planșeu bow-window",
};

export default function CpeAnexa({
  building,
  heating, cooling, ventilation, lighting, acm,
  solarThermal, photovoltaic, heatPump, biomass,
  instSummary, renewSummary, envelopeSummary,
  opaqueElements, glazingElements,
  selectedClimate,
  auditor,
  enClass, co2Class, epFinal, co2Final, rer,
  getNzebEpMax,
  bacsClass,
  BUILDING_CATEGORIES, ELEMENT_TYPES,
  HEAT_SOURCES, ACM_SOURCES, COOLING_SYSTEMS, VENTILATION_TYPES, LIGHTING_TYPES,
  calcOpaqueR,
  lang,
  // ── Sprint 16 — Anexa 2 bloc multi-apartament ──
  annexType,          // "apartment" | "building" | undefined (auto)
  categoryKey,        // ex: "RC_cool", "RA_nocool" — pentru clasificare apt
}) {
  // Auto-detectare annexType dacă nu e furnizat explicit
  const aptCount = Array.isArray(building?.apartments) ? building.apartments.length : 0;
  const isBuildingCategory = ["RC", "RA", "BC"].includes(building?.category);
  const resolvedAnnexType = annexType || (aptCount > 1 && isBuildingCategory ? "building" : "apartment");
  const Au = parseFloat(building.areaUseful) || 0;
  const V = parseFloat(building.volume) || 0;
  const catLabel = BUILDING_CATEGORIES?.find(c => c.id === building.category)?.label || building.category;
  const epRefMax = getNzebEpMax ? getNzebEpMax(building.category, selectedClimate?.zone) : 148;
  // Sprint 14 Task 5: parametrizare RER prag din NZEB_THRESHOLDS (în loc de hardcoded 30)
  const rerMinRequired = NZEB_THRESHOLDS?.[building.category]?.rer_min ?? 30;
  const nzebOk = epFinal <= epRefMax && rer >= rerMinRequired;

  // ═══════════════════════════════════════════════════════
  // Sprint 14 — Penalizări p0-p11 (Mc 001-2022 Partea III §8.10)
  // ═══════════════════════════════════════════════════════
  const penaltiesInput = {
    envelope: {
      opaque: opaqueElements?.map((el) => {
        const r = calcOpaqueR ? calcOpaqueR(el.layers, el.type) : null;
        return { type: el.type, area: parseFloat(el.area) || 0, u: r?.u || 0 };
      }) || [],
      glazing: glazingElements?.map((el) => ({ u: parseFloat(el.u) || 0 })) || [],
      bridges: [], // TODO Sprint 15: pull from thermalBridges
    },
    instSummary: {
      heating: {
        eta_gen: parseFloat(heating?.eta_gen) || 0,
        eta_dist: parseFloat(heating?.eta_dist) || 0,
        controls: heating?.control || "",
      },
      dhw: {
        eta_dhw: parseFloat(acm?.eta_dhw ?? acm?.eta_gen) || 0,
        storage: {
          volume: parseFloat(acm?.storageVolume) || 0,
          standing_loss: parseFloat(acm?.standingLoss) || 0,
        },
      },
      lighting: { leni: parseFloat(instSummary?.leni) || 0 },
      bacs: bacsClass || "D",
    },
    ventilation: {
      type: ventilation?.type || "",
      hrEfficiency: parseFloat(ventilation?.hrEfficiency) || 0,
    },
    building: { category: building.category },
    renewables: { rer: parseFloat(rer) || 0 },
  };
  const penalties = calcPenalties(penaltiesInput);
  const epWithPenalties = (parseFloat(epFinal) || 0) * penalties.summary.ep_multiplier;

  const fmt = (v, d = 1) => v != null && !isNaN(v) ? parseFloat(v).toFixed(d) : "—";
  const fmtRo = (v, d = 1) => fmt(v, d).replace(".", ",");

  const Row = ({ label, value, unit, status }) => (
    <div className="flex items-baseline justify-between py-1 border-b border-white/5 text-xs">
      <span className="opacity-50 mr-2">{label}</span>
      <span className={`font-mono font-medium ${status === "ok" ? "text-emerald-400" : status === "fail" ? "text-red-400" : status === "warn" ? "text-yellow-400" : ""}`}>
        {value}{unit ? <span className="opacity-40 text-[10px] ml-1">{unit}</span> : null}
      </span>
    </div>
  );

  const Section = ({ title, children }) => (
    <div className="mb-5">
      <div className="text-[10px] uppercase tracking-widest opacity-30 mb-2 border-b border-white/10 pb-1">{title}</div>
      {children}
    </div>
  );

  // Generare recomandări Anexa 2
  const recommendations = [];
  if (envelopeSummary) {
    if (envelopeSummary.G > 0.8) {
      recommendations.push({
        code: "A1", priority: "înaltă",
        measure: "Termoizolare pereți exteriori",
        detail: `G = ${fmtRo(envelopeSummary.G, 3)} W/(m³·K) — depășește 0.8. Aplicare sistem ETICS cu EPS 10-15 cm.`,
        savings: "15-25%",
      });
    }
    if (glazingElements?.some(g => parseFloat(g.u) > 2.5)) {
      recommendations.push({
        code: "A2", priority: "înaltă",
        measure: "Înlocuire tâmplărie exterioară",
        detail: "Ferestre cu U > 2.5 W/(m²·K). Înlocuire cu tâmplărie PVC/AL cu geam termoizolant Low-E (U ≤ 1.1).",
        savings: "8-15%",
      });
    }
    if (opaqueElements?.some(el => {
      const r = calcOpaqueR ? calcOpaqueR(el.layers, el.type) : null;
      return r && r.u > 0.5 && ["PT", "PP"].includes(el.type);
    })) {
      recommendations.push({
        code: "A3", priority: "medie",
        measure: "Termoizolare planșeu superior (terasă/pod)",
        detail: "Termoizolație insuficientă la planșeul superior. Aplicare vată minerală sau XPS ≥ 20 cm.",
        savings: "8-12%",
      });
    }
  }
  if (instSummary) {
    if (instSummary.isCOP === false && ["gaz_conv", "gaz_cond", "centrala_gpl"].includes(heating?.source)) {
      recommendations.push({
        code: "B1", priority: "medie",
        measure: "Înlocuire cazan cu pompă de căldură",
        detail: "Cazanul actual are η_gen < COP. Înlocuire cu pompă de căldură aer-apă SCOP ≥ 3.0.",
        savings: "20-40%",
      });
    }
    if (!solarThermal?.enabled) {
      recommendations.push({
        code: "B2", priority: "medie",
        measure: "Instalare colectoare solare termice pentru ACM",
        detail: "Nu există sistem solar termic. Instalare 4-8 m² colectoare plane → fracție solară 40-60%.",
        savings: "5-10%",
      });
    }
    if (!photovoltaic?.enabled) {
      recommendations.push({
        code: "C1", priority: "scăzută",
        measure: "Instalare sistem fotovoltaic",
        detail: "Producere locală energie electrică. Sistem 3-5 kWp → acoperire 30-50% consum electric.",
        savings: "8-15%",
      });
    }
    if (instSummary.leni > 15) {
      recommendations.push({
        code: "D1", priority: "medie",
        measure: "Modernizare sistem iluminat",
        detail: `LENI = ${fmtRo(instSummary.leni, 1)} kWh/(m²·an) — ridicat. Înlocuire corpuri luminoase cu LED + control prezență/luminozitate.`,
        savings: "5-10%",
      });
    }
  }

  const priorityColor = { "înaltă": "#ef4444", "medie": "#eab308", "scăzută": "#22c55e" };

  return (
    <div className="space-y-6 text-xs">
      {/* ═══════ ANEXA 1 ═══════ */}
      <div>
        <h3 className="text-sm font-bold mb-4 text-amber-400">ANEXA 1 — Date generale și tehnice</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Secțiunea I — Date generale */}
          <div>
            {/* Badge nZEB prominent */}
            <div className="mb-3 p-3 rounded-lg border-2 text-center" style={{
              borderColor: nzebOk ? "#22c55e" : "#ef4444",
              backgroundColor: nzebOk ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
            }}>
              <div className="text-[11px] opacity-50 mb-1">Conformitate nZEB</div>
              <div className="text-2xl font-bold" style={{ color: nzebOk ? "#22c55e" : "#ef4444" }}>
                {nzebOk ? "DA" : "NU"}
              </div>
            </div>

            <Section title="I. Date generale clădire">
              <Row label="Adresă" value={[building.address, building.city, building.county].filter(Boolean).join(", ") || "—"} />
              <Row label="Destinație" value={catLabel} />
              <Row label="Categorie" value={building.category} />
              <Row label="An construcție" value={building.yearBuilt || "—"} />
              <Row label="Regim înălțime" value={building.floors || "—"} />
              <Row label="Număr unități/apartamente" value={building.units || "—"} />
              <Row label="Scop certificare" value={building.scopCpe || "Vânzare"} />
              <Row label="Zonă climatică" value={selectedClimate?.zone ? `Zona ${selectedClimate.zone}` : "—"} />
              <Row label="Localitate" value={selectedClimate?.name || building.city || "—"} />
            </Section>

            <Section title="II. Date tehnice geometrie">
              <Row label="Arie utilă de referință (Au)" value={fmtRo(Au, 1)} unit="m²" />
              <Row label="Volum încălzit (V)" value={fmtRo(V, 1)} unit="m³" />
              <Row label="Arie anvelopă (Aenv)" value={fmtRo(building.areaEnvelope, 1)} unit="m²" />
              <Row label="Raport A/V" value={Au > 0 && V > 0 ? fmtRo(parseFloat(building.areaEnvelope) / V, 3) : "—"} unit="m⁻¹" />
              <Row label="Coeficient global G" value={envelopeSummary ? fmtRo(envelopeSummary.G, 3) : "—"} unit="W/(m³·K)"
                status={envelopeSummary?.G ? (envelopeSummary.G < 0.6 ? "ok" : envelopeSummary.G < 0.9 ? "warn" : "fail") : undefined} />
              <Row label="Perim. fundație (P)" value={fmtRo(building.perimeter, 1)} unit="m" />
              <Row label="Test permeabilitate n50" value={fmtRo(building.n50, 2)} unit="h⁻¹" />
            </Section>
          </div>

          {/* Secțiunea II.b — U-values per element */}
          {opaqueElements?.length > 0 && calcOpaqueR && (() => {
            const isRes = ["RI","RC","RA"].includes(building.category);
            const uRef = isRes ? U_REF_RES : U_REF_NRES;
            const uRefGlaz = isRes ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres;
            return (
              <Section title="II.b. Coeficienți U per element (Mc 001-2022 Tabel 2.4/2.7)">
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-1 opacity-40 font-normal pr-2">Element</th>
                        <th className="text-left py-1 opacity-40 font-normal pr-2">Descriere</th>
                        <th className="text-right py-1 opacity-40 font-normal pr-2">U calc</th>
                        <th className="text-right py-1 opacity-40 font-normal pr-2">U ref</th>
                        <th className="text-right py-1 opacity-40 font-normal">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opaqueElements.map((el, i) => {
                        const r = calcOpaqueR(el.layers, el.type);
                        const uCalc = r?.u || 0;
                        const uRefVal = uRef[el.type];
                        const ok = uRefVal == null || uCalc <= uRefVal;
                        return (
                          <tr key={i} className="border-b border-white/[0.04]">
                            <td className="py-1 pr-2 font-mono text-amber-400/70">{el.type}</td>
                            <td className="py-1 pr-2 opacity-70">{el.name || ELEMENT_LABELS[el.type] || el.type}</td>
                            <td className={`py-1 pr-2 text-right font-mono ${ok ? "text-emerald-400" : "text-red-400"}`}>{fmtRo(uCalc, 3)}</td>
                            <td className="py-1 pr-2 text-right opacity-40">{uRefVal != null ? fmtRo(uRefVal, 2) : "—"}</td>
                            <td className={`py-1 text-right font-mono text-[10px] ${ok ? "text-emerald-400/60" : "text-red-400"}`}>
                              {uRefVal != null ? (ok ? "✓" : `+${fmtRo(uCalc - uRefVal, 3)}`) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                      {glazingElements?.map((el, i) => {
                        const uCalc = parseFloat(el.u) || 0;
                        const ok = uCalc <= uRefGlaz;
                        return (
                          <tr key={`g${i}`} className="border-b border-white/[0.04]">
                            <td className="py-1 pr-2 font-mono text-sky-400/70">VM</td>
                            <td className="py-1 pr-2 opacity-70">{el.name || "Vitraj/Tâmplărie"}</td>
                            <td className={`py-1 pr-2 text-right font-mono ${ok ? "text-emerald-400" : "text-red-400"}`}>{fmtRo(uCalc, 3)}</td>
                            <td className="py-1 pr-2 text-right opacity-40">{fmtRo(uRefGlaz, 2)}</td>
                            <td className={`py-1 text-right font-mono text-[10px] ${ok ? "text-emerald-400/60" : "text-red-400"}`}>
                              {ok ? "✓" : `+${fmtRo(uCalc - uRefGlaz, 3)}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            );
          })()}

          {/* Secțiunea III — Instalații */}
          <div>
            <Section title="III. Instalații">
              <div className="space-y-2">
                <div className="text-[10px] opacity-40 font-medium">ÎNCĂLZIRE</div>
                <Row label="Sursă" value={HEAT_SOURCES?.find(s => s.id === heating?.source)?.label || heating?.source || "—"} />
                <Row label="η generare" value={heating?.eta_gen || "—"} />
                <Row label="η emitere" value={heating?.eta_em || "—"} />
                <Row label="θ_int setpoint" value={`${heating?.theta_int || 20}°C`} />

                <div className="text-[10px] opacity-40 font-medium mt-2">PREPARARE ACM</div>
                <Row label="Sursă ACM" value={ACM_SOURCES?.find(s => s.id === acm?.source)?.label || acm?.source || "—"} />
                <Row label="Consum specific" value={fmtRo(acm?.dailyLiters, 0)} unit="L/zi" />

                <div className="text-[10px] opacity-40 font-medium mt-2">RĂCIRE</div>
                <Row label="Sistem răcire" value={cooling?.hasCooling ? (COOLING_SYSTEMS?.find(s => s.id === cooling?.system)?.label || "DA") : "Nu există"} />
                {cooling?.hasCooling && <Row label="EER" value={cooling?.eer || "—"} />}

                <div className="text-[10px] opacity-40 font-medium mt-2">VENTILARE</div>
                <Row label="Tip ventilare" value={VENTILATION_TYPES?.find(t => t.id === ventilation?.type)?.label || ventilation?.type || "—"} />
                {ventilation?.hrEfficiency && <Row label="Eficiență recuperare" value={`${ventilation.hrEfficiency}%`} />}

                <div className="text-[10px] opacity-40 font-medium mt-2">ILUMINAT</div>
                <Row label="Tip iluminat" value={LIGHTING_TYPES?.find(t => t.id === lighting?.type)?.label || lighting?.type || "—"} />
                <Row label="Densitate putere" value={fmtRo(lighting?.pDensity, 1)} unit="W/m²" />
                <Row label="LENI" value={fmtRo(instSummary?.leni, 1)} unit="kWh/(m²·an)" />

                <div className="text-[10px] opacity-40 font-medium mt-2">SURSE REGENERABILE</div>
                {solarThermal?.enabled && <Row label="Solar termic" value={`${fmtRo(solarThermal.area, 1)} m² — η₀=${solarThermal.eta0}`} status="ok" />}
                {photovoltaic?.enabled && <Row label="Fotovoltaic" value={`${fmtRo(photovoltaic.area, 1)} m² (${fmtRo(photovoltaic.peakPower, 2)} kWp)`} status="ok" />}
                {heatPump?.enabled && <Row label="Pompă căldură" value={`COP=${heatPump.cop} / SCOP=${heatPump.scopHeating}`} status="ok" />}
                {biomass?.enabled && <Row label="Biomasă" value={biomass.type || "lemn/peleți"} status="ok" />}
                {!solarThermal?.enabled && !photovoltaic?.enabled && !heatPump?.enabled && !biomass?.enabled &&
                  <Row label="Regenerabile" value="Nu există surse regenerabile locale" />}

                {/* BACS & SRI — conform SR EN ISO 52120-1:2022 + Reg. UE 2020/2155 */}
                {bacsClass && (() => {
                  const bacsLabels = { A:"Clasă A — Înalt performantă", B:"Clasă B — Avansată", C:"Clasă C — Standard (referință)", D:"Clasă D — Nonautomatizată" };
                  const bacsFactors = { A:0.80, B:0.93, C:1.00, D:1.10 };
                  const bacsColor = { A:"text-emerald-400", B:"text-lime-400", C:"text-yellow-400", D:"text-red-400" };
                  const sriColor = { A:"text-emerald-400", B:"text-lime-400", C:"text-yellow-400", D:"text-orange-400", E:"text-red-400" };
                  const sri = computeAutoSRI({ building, heating, cooling, ventilation, lighting, acm, solarThermal, photovoltaic, heatPump, bacsClass });
                  const sriVal = sri.total;
                  const sriClass = sri.class;
                  const sriLabel = SRI_CLASS_LABELS[sriClass]?.label || "";
                  return (
                    <>
                      <div className="text-[10px] opacity-40 font-medium mt-2">AUTOMATIZARE & SRI</div>
                      <Row label="Clasă BACS (ISO 52120-1:2022)" value={
                        <span className={bacsColor[bacsClass] || ""}>{bacsClass} — factor {bacsFactors[bacsClass]}</span>
                      } />
                      <Row label={lang === "EN" ? "BACS description" : "Descriere BACS"} value={bacsLabels[bacsClass] || bacsClass} />
                      <Row label="Indice SRI (Reg. UE 2020/2155)"
                        value={<span className={sriColor[sriClass] || ""}>{sriVal.toFixed(1)}% — clasă {sriClass} ({sriLabel})</span>}
                        status={sriVal >= 60 ? "ok" : sriVal >= 40 ? "warn" : "fail"} />
                      <Row label="SRI — Eficiență energetică" value={`${sri.impact.energy_efficiency.score.toFixed(1)}%`} />
                      <Row label="SRI — Flexibilitate rețea" value={`${sri.impact.flexibility.score.toFixed(1)}%`} />
                      <Row label="SRI — Confort" value={`${sri.impact.comfort.score.toFixed(1)}%`} />
                    </>
                  );
                })()}
              </div>
            </Section>
          </div>
        </div>

        {/* Secțiunea IV — Indicator energetic */}
        <Section title="IV. Indicator de performanță energetică">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {[
              { label: "EP specific final", value: fmtRo(epFinal, 1), unit: "kWh/(m²·an)", color: enClass?.color },
              { label: "EP referință nZEB", value: fmtRo(epRefMax, 1), unit: "kWh/(m²·an)", color: "#6b7280" },
              { label: "CO₂ specific", value: fmtRo(co2Final, 1), unit: "kg/(m²·an)", color: co2Class?.color },
              { label: "RER", value: `${fmtRo(rer, 1)}%`, unit: "", color: rer >= 30 ? "#22c55e" : rer >= 20 ? "#eab308" : "#ef4444" },
            ].map(item => (
              <div key={item.label} className="text-center p-2 rounded-lg bg-white/[0.03]">
                <div className="text-[10px] opacity-40 mb-1">{item.label}</div>
                <div className="text-base font-mono font-bold" style={{ color: item.color }}>{item.value}</div>
                {item.unit && <div className="text-[10px] opacity-30">{item.unit}</div>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Row label="Clasă energetică EP" value={enClass?.cls || "—"}
              status={enClass?.idx <= 1 ? "ok" : enClass?.idx <= 3 ? "warn" : "fail"} />
            <Row label="Clasă CO₂" value={co2Class?.cls || "—"} />
            <Row label="Conformitate nZEB" value={nzebOk ? "DA ✓" : "NU ✗"} status={nzebOk ? "ok" : "fail"} />
            <Row label="Energie finală totală" value={fmtRo(instSummary?.qf_total, 0)} unit="kWh/an" />
            <Row label="qf specific" value={fmtRo(instSummary?.qf_total_m2, 1)} unit="kWh/(m²·an)" />
            <Row label="Emisii CO₂ totale" value={fmtRo(instSummary?.co2_total, 0)} unit="kg/an" />
          </div>
          {instSummary && (
            <div className="mt-3 grid grid-cols-5 gap-1 text-[10px]">
              {[
                { label: "Încălzire", ep: instSummary.ep_h, color: "#ef4444" },
                { label: "ACM", ep: instSummary.ep_w, color: "#f97316" },
                { label: "Răcire", ep: instSummary.ep_c, color: "#3b82f6" },
                { label: "Ventilare", ep: instSummary.ep_v, color: "#8b5cf6" },
                { label: "Iluminat", ep: instSummary.ep_l, color: "#eab308" },
              ].map(u => (
                <div key={u.label} className="text-center">
                  <div className="text-[10px] opacity-40">{u.label}</div>
                  <div className="font-mono" style={{ color: u.color }}>{fmtRo(Au > 0 ? u.ep / Au : 0, 1)}</div>
                  <div className="text-[10px] opacity-30">kWh/(m²·an)</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Sprint 14 — Penalizări p0-p11 (Mc 001-2022 Partea III §8.10) */}
        <Section title="V. Penalizări — utilizare irațională energie (Mc 001-2022 §8.10)">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-1 opacity-40 font-normal pr-2">Cod</th>
                  <th className="text-left py-1 opacity-40 font-normal pr-2">Indicator</th>
                  <th className="text-right py-1 opacity-40 font-normal pr-2">Valoare</th>
                  <th className="text-right py-1 opacity-40 font-normal pr-2">ΔEP [%]</th>
                  <th className="text-left py-1 opacity-40 font-normal">Status / Motiv</th>
                </tr>
              </thead>
              <tbody>
                {["p0","p1","p2","p3","p4","p5","p6","p7","p8","p9","p10","p11"].map((key) => {
                  const p = penalties[key];
                  if (!p) return null;
                  const labels = {
                    p0: "Anvelopa subizolată",
                    p1: "Ferestre slabe",
                    p2: "Punți termice",
                    p3: "Cazan ineficient",
                    p4: "Distribuție neoptimă",
                    p5: "Reglare inadecvată",
                    p6: "ACM ineficient",
                    p7: "Stocaj neizolat",
                    p8: "Ventilație fără HR",
                    p9: "Iluminat ineficient",
                    p10: "Lipsă BACS",
                    p11: "Lipsă regenerabile",
                  };
                  return (
                    <tr key={key} className="border-b border-white/[0.04]">
                      <td className="py-1 pr-2 font-mono text-amber-400/70">{key}</td>
                      <td className="py-1 pr-2 opacity-70">{labels[key]}</td>
                      <td className="py-1 pr-2 text-right font-mono opacity-60">{String(p.value)}</td>
                      <td className={`py-1 pr-2 text-right font-mono ${p.applied ? "text-red-400" : "text-emerald-400/60"}`}>
                        {p.applied ? `+${p.delta_EP_pct}%` : "0%"}
                      </td>
                      <td className={`py-1 text-[9px] ${p.applied ? "text-red-400/70" : "text-emerald-400/50"}`}>
                        {p.applied ? "✗" : "✓"} {p.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sumar penalizări + EP majorat */}
          <div className="mt-3 p-3 rounded-lg border-2" style={{
            borderColor: penalties.summary.count_applied === 0 ? "#22c55e40" : penalties.summary.total_delta_pct >= 20 ? "#ef444440" : "#eab30840",
            backgroundColor: penalties.summary.count_applied === 0 ? "rgba(34,197,94,0.05)" : penalties.summary.total_delta_pct >= 20 ? "rgba(239,68,68,0.05)" : "rgba(234,179,8,0.05)",
          }}>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[11px] opacity-60">
                <strong>{penalties.summary.count_applied}</strong> din 12 penalizări aplicate —
                majorare EP: <strong>+{penalties.summary.total_delta_pct.toFixed(1)}%</strong>
              </div>
              <div className="text-[10px] opacity-40">
                Formula: EP_total = EP_base × (1 + ΣΔ/100)
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <div className="opacity-40">EP bază (fără penalizări)</div>
                <div className="font-mono text-base">{fmtRo(epFinal, 1)} <span className="opacity-40 text-[10px]">kWh/(m²·an)</span></div>
              </div>
              <div>
                <div className="opacity-40">EP majorat cu penalizări</div>
                <div className={`font-mono text-base ${penalties.summary.count_applied === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {fmtRo(epWithPenalties, 1)} <span className="opacity-40 text-[10px]">kWh/(m²·an)</span>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* ═══════ ANEXA 2 ═══════ */}
      {/* Sprint 16 — comutare apartment vs. building */}
      {resolvedAnnexType === "building" ? (
        <AnexaBloc
          building={building}
          apartments={building?.apartments || []}
          commonSystems={building?.commonSystems || {}}
          epBuildingM2={parseFloat(epFinal) || 0}
          co2BuildingM2={parseFloat(co2Final) || 0}
          categoryKey={categoryKey}
          auditor={auditor}
          selectedClimate={selectedClimate}
        />
      ) : (
      <div>
        <h3 className="text-sm font-bold mb-4 text-amber-400">ANEXA 2 — Recomandări de îmbunătățire</h3>

        {recommendations.length === 0 ? (
          <div className="text-center py-6 opacity-30">
            <div className="text-2xl mb-2">✅</div>
            <div>Performanța energetică este satisfăcătoare. Nu sunt necesare măsuri prioritare.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((r) => (
              <div key={r.code} className="p-3 rounded-lg border" style={{
                borderColor: (priorityColor[r.priority] || "#6b7280") + "30",
                backgroundColor: (priorityColor[r.priority] || "#6b7280") + "08",
              }}>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono opacity-50">{r.code}</span>
                    <span className="font-medium text-xs">{r.measure}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                      backgroundColor: (priorityColor[r.priority] || "#6b7280") + "20",
                      color: priorityColor[r.priority] || "#6b7280",
                    }}>
                      {r.priority}
                    </span>
                    <span className="text-[10px] text-emerald-400/70">-{r.savings}</span>
                  </div>
                </div>
                <p className="text-[10px] opacity-50">{r.detail}</p>
              </div>
            ))}
          </div>
        )}

        {/* Notă auditor */}
        {auditor?.name && (
          <div className="mt-4 pt-3 border-t border-white/10 text-[10px] opacity-40">
            Certificat emis de: {auditor.name}
            {auditor.atestat && ` — Atestat nr. ${auditor.atestat}`}
            {auditor.date && ` — Data: ${new Date(auditor.date).toLocaleDateString("ro-RO")}`}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
