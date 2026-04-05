import { cn, Select, Input, Card, Badge, ResultRow } from "../components/ui.jsx";
import CLIMATE_DB from "../data/climate.json";
import { T } from "../data/translations.js";
import { TYPICAL_BUILDINGS } from "../data/typical-buildings.js";
import { TYPICAL_BUILDINGS_EXTRA } from "../data/typical-buildings.js";

export default function Step1Identification({
  building, updateBuilding, lang, selectedClimate,
  BUILDING_CATEGORIES, STRUCTURE_TYPES,
  autoDetectLocality, estimateGeometry, avRatio,
  loadFullDemo, loadFullDemo2, loadFullDemo3, loadFullDemo4, loadFullDemo5, loadFullDemo6,
  loadTypicalBuilding, showToast,
  goToStep,
}) {
  const t = (key) => lang === "RO" ? key : (T[key]?.EN || key);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">{lang==="EN" ? "Building identification & classification" : "Identificare și clasificare clădire"}</h2>
        <p className="text-xs opacity-40">Date generale necesare conform Cap. 1 Mc 001-2022</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* Coloana 1: Adresă & Clasificare */}
        <div className="space-y-5">
          <Card title={t("Adresa clădirii",lang)}>
            <div className="space-y-3">
              <Input label={t("Strada, nr.",lang)} value={building.address} onChange={v => updateBuilding("address",v)} placeholder="Str. Exemplu, nr. 10" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label={t("Localitate",lang)} value={building.city} onChange={v => { updateBuilding("city",v); autoDetectLocality(v); }} />
                <Input label={t("Județ",lang)} value={building.county} onChange={v => updateBuilding("county",v)} />
              </div>
              <Input label={t("Cod poștal",lang)} value={building.postal} onChange={v => updateBuilding("postal",v)} />
            </div>
          </Card>

          <Card title={t("Clasificare",lang)}>
            <div className="space-y-3">
              <Select label={t("Categorie funcțională",lang)} value={building.category} onChange={v => updateBuilding("category",v)}
                options={BUILDING_CATEGORIES.map(c=>({value:c.id,label:c.label}))} />
              <Select label={t("Tip structură",lang)} value={building.structure} onChange={v => updateBuilding("structure",v)}
                options={STRUCTURE_TYPES} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label={t("An construcție",lang)} value={building.yearBuilt} onChange={v => updateBuilding("yearBuilt",v)} type="number" placeholder="1975" />
                <Input label={t("An renovare",lang)} value={building.yearRenov} onChange={v => updateBuilding("yearRenov",v)} type="number" placeholder="—" />
              </div>
            </div>
          </Card>

          <Card title={t("Clădiri tip românești",lang)} badge={<span className="text-[10px] opacity-30">template rapid</span>}>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1" style={{scrollbarWidth:"thin"}}>
              {/* DEMO COMPLET — exemplu fictiv cu toate câmpurile */}
              <button onClick={() => {
                  loadFullDemo();
              }}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏠</span>
                  <div>
                    <div className="font-bold text-emerald-300">DEMO COMPLET — Casă nouă nZEB Constanța 2025</div>
                    <div className="opacity-50 mt-0.5">PC sol-apă + PV 6kWp + solar termic + HR 92% · 5 elem. opace · 4 vitraje · 7 punți · Toți pașii 1-7</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo2()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏢</span>
                  <div>
                    <div className="font-bold text-emerald-300">DEMO — Bloc P+4 '73 reabilitat București</div>
                    <div className="opacity-50 mt-0.5">Cazan gaz condensare · fără regenerabile · 3 elem. opace · 1 vitraje · 5 punți · Toți pașii 1-7</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo3()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏬</span>
                  <div>
                    <div className="font-bold text-emerald-300">DEMO — Birouri noi P+3 Cluj-Napoca</div>
                    <div className="opacity-50 mt-0.5">VRF + PV 30kWp + HR 80% + LED BMS · 3 elem. opace · 2 vitraje · 4 punți · Toți pașii 1-7</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo4()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏫</span>
                  <div>
                    <div className="font-bold text-emerald-300">DEMO — Grădiniță reabilitată Iași</div>
                    <div className="opacity-50 mt-0.5">Cazan peleți + solar termic + PV 10kWp + HR 70% · 3 elem. opace · 2 vitraje · 5 punți · Toți pașii 1-7</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo5()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏚️</span>
                  <div>
                    <div className="font-bold text-emerald-300">DEMO — Casă interbelică reabilitată Brașov</div>
                    <div className="opacity-50 mt-0.5">PC aer-apă + PV 5kWp + solar termic + HR 85% · 3 elem. opace · 2 vitraje · 4 punți · Toți pașii 1-7</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo6()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🛒</span>
                  <div>
                    <div className="font-bold text-emerald-300">DEMO — Supermarket nou Timișoara</div>
                    <div className="opacity-50 mt-0.5">Chiller + UTA + PV 50kWp + LED senzori · 3 elem. opace · 2 vitraje · 3 punți · Toți pașii 1-7</div>
                  </div>
                </div>
              </button>

              <div className="border-t border-white/[0.06] my-2"></div>

              {[...TYPICAL_BUILDINGS, ...TYPICAL_BUILDINGS_EXTRA].map(tpl => (
                <button key={tpl.id} onClick={() => { loadTypicalBuilding(tpl.id); showToast(`Template "${tpl.label}" încărcat`, "success"); }}
                  className="w-full text-left px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-amber-500/20 transition-all text-xs">
                  <div className="font-medium">{tpl.label}</div>
                  <div className="opacity-30 mt-0.5">{tpl.opaque.length} elem. opace · {tpl.glazing.length} vitraje · {tpl.bridges.length} punți</div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Coloana 2: Geometrie */}
        <div className="space-y-5">
          <Card title={t("Geometrie",lang)}>
            <div className="space-y-3">
              <Input label={t("Regim de înălțime",lang)} value={building.floors} onChange={v => updateBuilding("floors",v)} placeholder="P+4E, S+P+2E+M" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={building.basement} onChange={e => updateBuilding("basement",e.target.checked)}
                    className="accent-amber-500 rounded" />
                  Subsol/demisol
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={building.attic} onChange={e => updateBuilding("attic",e.target.checked)}
                    className="accent-amber-500 rounded" />
                  Mansardă/pod
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label={t("Nr. unități",lang)} value={building.units} onChange={v => updateBuilding("units",v)} type="number" min="1" />
                <Input label={t("Nr. scări",lang)} value={building.stairs} onChange={v => updateBuilding("stairs",v)} type="number" min="1" />
              </div>
            </div>
          </Card>

          <Card title={t("Dimensiuni",lang)}>
            <div className="space-y-3">
              <button onClick={estimateGeometry}
                className="w-full py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs hover:bg-amber-500/10 transition-colors">
                Estimare automată din Au + etaje
              </button>
              <Input label={t("Suprafață utilă încălzită (Au)",lang)} tooltip="Suma suprafețelor utile ale tuturor spațiilor încălzite — Mc 001 Cap.1" value={building.areaUseful} onChange={v => updateBuilding("areaUseful",v)} type="number" unit="m²" min="0" step="0.1" />
              <Input label={t("Volum încălzit (V)",lang)} tooltip="Volumul interior al spațiilor încălzite delimitat de anvelopa termică — m³" value={building.volume} onChange={v => updateBuilding("volume",v)} type="number" unit="m³" min="0" step="0.1" />
              <Input label={t("Suprafață anvelopă (Aenv)",lang)} value={building.areaEnvelope} onChange={v => updateBuilding("areaEnvelope",v)} type="number" unit="m²" min="0" step="0.1" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label={t("Înălțime clădire",lang)} value={building.heightBuilding} onChange={v => updateBuilding("heightBuilding",v)} type="number" unit="m" step="0.1" />
                <Input label={t("Înălțime etaj",lang)} value={building.heightFloor} onChange={v => updateBuilding("heightFloor",v)} type="number" unit="m" step="0.01" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label={t("Perimetru clădire",lang)} value={building.perimeter} onChange={v => updateBuilding("perimeter",v)} type="number" unit="m" step="0.1" />
                <Input label={t("n50 (blower door)",lang)} tooltip="Rata de schimb aer la 50Pa presiune — test etanșeitate conform EN 13829" value={building.n50} onChange={v => updateBuilding("n50",v)} type="number" unit="h⁻¹" step="0.1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label={t("GWP lifecycle",lang)} tooltip="Potențial de Încălzire Globală pe ciclu de viață — EPBD IV Art.7, obligatoriu din 2028 pentru >1000m²" value={building.gwpLifecycle} onChange={v => updateBuilding("gwpLifecycle",v)} type="number" unit="kgCO₂eq/m²a" step="0.1" />
                <label className="flex items-center gap-2 text-xs cursor-pointer mt-auto py-2"><input type="checkbox" checked={building.solarReady} onChange={e => updateBuilding("solarReady",e.target.checked)} className="accent-amber-500" />{lang==="EN"?"Solar-ready building":"Clădire solar-ready"}</label>
              </div>
              <Input label={t("Factor umbrire",lang)} tooltip="Factor global umbrire Fc=0..1 — 1.0=fără umbrire, 0.5=umbrire puternică — SR EN ISO 13790" value={building.shadingFactor} onChange={v => updateBuilding("shadingFactor",v)} type="number" step="0.01" min="0" max="1" />

              {/* Scop CPE — obligatoriu conform Mc 001-2022, subcap 5.1 */}
              <Select label={lang==="EN"?"CPE purpose":"Scop elaborare CPE"} value={building.scopCpe} onChange={v => updateBuilding("scopCpe",v)}
                options={[{value:"vanzare",label:"Vânzare"},{value:"inchiriere",label:"Închiriere"},{value:"receptie",label:"Recepție clădire nouă"},{value:"informare",label:"Informare proprietar"},{value:"renovare",label:"Renovare majoră"},{value:"alt",label:"Alt scop"}]} />

              {/* n50 verification indicator */}
              {(() => {
                const n50V = parseFloat(building.n50) || 4.0;
                const n50Ref = n50V <= 1.0 ? {label:"nZEB (≤1.0)", color:"emerald"} : n50V <= 1.5 ? {label:"Vent. mecanică (≤1.5)", color:"emerald"} : n50V <= 3.0 ? {label:"Vent. naturală (≤3.0)", color:"amber"} : {label:"Peste limită (>3.0)", color:"red"};
                return (
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="opacity-40">Etanșeitate n50:</span>
                    <Badge color={n50Ref.color}>{n50Ref.label} — {n50V} h⁻¹</Badge>
                    {n50V > 1.0 && <span className="opacity-30">nZEB necesită ≤1.0 h⁻¹</span>}
                  </div>
                );
              })()}

              {/* EV Charging — L.238/2024 */}
              {!["RI","RA"].includes(building.category) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Nr. locuri de parcare" value={building.parkingSpaces} onChange={v => updateBuilding("parkingSpaces",v)} type="number" min="0" />
                  {parseInt(building.parkingSpaces) >= 10 && (
                    <div className="flex items-center text-[10px] text-amber-400/80 bg-amber-500/5 rounded-lg p-2">
                      ⚡ L.238/2024: min {Math.ceil(parseInt(building.parkingSpaces) * 0.2)} locuri pregătite VE (20%)
                    </div>
                  )}
                </div>
              )}
              {avRatio !== "—" && (
                <div className="bg-white/[0.03] rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs opacity-50">Raport A/V (compacitate)</span>
                  <span className="font-mono text-sm font-medium text-amber-400">{avRatio} <span className="text-xs opacity-40">m⁻¹</span></span>
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* Coloana 3: Vizualizare + Date climatice */}
        <div className="space-y-5">
          <Card title={t("Vizualizare clădire",lang)}>
            <svg viewBox="0 0 180 150" width="180" height="130" className="mx-auto block opacity-80">
              {(() => {
                var nF = Math.max(1, parseInt(String(building.floors).replace(/[^0-9]/g,"")) || 1);
                var fH = Math.min(20, 100/nF), bW = 90, bX = 45, gY = 125;
                var topY = gY - nF * fH;
                var els = [];
                els.push(<line key="g" x1="10" y1={gY} x2="170" y2={gY} stroke="#555" strokeWidth="0.5" strokeDasharray="3 2"/>);
                if (building.basement) {
                  els.push(<rect key="bs" x={bX} y={gY} width={bW} height={15} fill="#4a3728" stroke="#6b5744" strokeWidth="0.5" rx="1"/>);
                  els.push(<text key="bt" x={bX+bW/2} y={gY+10} textAnchor="middle" fontSize="6" fill="#a08060">S</text>);
                }
                for (var f = 0; f < nF; f++) {
                  var fy = gY - (f+1)*fH;
                  els.push(<rect key={"f"+f} x={bX} y={fy} width={bW} height={fH} fill={f===0?"#2a3a4a":"#1e2d3d"} stroke="#3a5060" strokeWidth="0.5"/>);
                  for (var w = 0; w < 4; w++) els.push(<rect key={"w"+f+"-"+w} x={bX+10+w*20} y={fy+fH*0.2} width={7} height={fH*0.5} fill="#4a8ab5" rx="0.5" opacity="0.6"/>);
                  if (f===0) els.push(<rect key="dr" x={bX+bW/2-5} y={fy+fH*0.3} width={10} height={fH*0.65} fill="#6b4423" rx="1"/>);
                }
                if (building.attic) els.push(<polygon key="rf" points={bX+","+topY+" "+(bX+bW/2)+","+(topY-20)+" "+(bX+bW)+","+topY} fill="#5a3a2a" stroke="#7a5a4a" strokeWidth="0.5"/>);
                else els.push(<rect key="tr" x={bX-2} y={topY-2} width={bW+4} height={3} fill="#4a4a4a" rx="1"/>);
                els.push(<text key="fl" x={bX+bW+8} y={(topY+gY)/2+3} fontSize="8" fill="#f59e0b">{building.floors||"P"}</text>);
                return els;
              })()}
            </svg>
          </Card>
          <Card title={t("Localizare climatică",lang)} badge={selectedClimate && <Badge color="blue">Auto-detectat</Badge>}>
            <div className="space-y-3">
              <Select label={t("Localitatea de calcul",lang)} value={building.locality} onChange={v => updateBuilding("locality",v)}
                placeholder="Selectează localitatea..."
                options={CLIMATE_DB.map(c=>({value:c.name, label:`${c.name} (Zona ${c.zone})`}))} />


              {selectedClimate && (
                <div className="space-y-1 mt-3">
                  <ResultRow label="Zona climatică" value={selectedClimate.zone} />
                  <ResultRow label="Temp. ext. calcul (θe)" value={selectedClimate.theta_e} unit="°C" />
                  <ResultRow label="Temp. medie anuală (θa)" value={selectedClimate.theta_a} unit="°C" />
                  <ResultRow label="Grade-zile (NGZ)" value={selectedClimate.ngz.toLocaleString()} unit="K·zile" />
                  <ResultRow label="Durata sezon încălzire" value={selectedClimate.season} unit="zile" />
                  <ResultRow label="Altitudine" value={selectedClimate.alt} unit="m" />
                </div>
              )}
            </div>
          </Card>


          {selectedClimate && (
            <Card title={t("Profil temperatură lunară",lang)}>
              <svg viewBox="0 0 280 100" width="100%" height="90">
                {(() => {
                  const temps = selectedClimate.temp_month;
                  const tMin = Math.min(...temps);
                  const tMax = Math.max(...temps);
                  const range = Math.max(tMax - tMin, 1);
                  const months = ["I","F","M","A","M","I","I","A","S","O","N","D"];
                  const barW = 18, gap = 5, offsetX = 8;
                  const chartH = 60, baseY = 75;
                  var els = [];
                  // zero line
                  var zeroY = baseY - ((0 - tMin) / range) * chartH;
                  if (tMin < 0 && tMax > 0) els.push(<line key="z" x1={offsetX} y1={zeroY} x2={offsetX + 12*(barW+gap)} y2={zeroY} stroke="#555" strokeWidth="0.5" strokeDasharray="2 2"/>);
                  temps.forEach(function(t, i) {
                    var x = offsetX + i * (barW + gap);
                    var h = Math.abs(t - Math.max(0, tMin)) / range * chartH;
                    var y = t >= 0 ? baseY - ((t - tMin) / range) * chartH : baseY - ((0 - tMin) / range) * chartH;
                    var barH = t >= 0 ? ((t - Math.max(0, tMin)) / range) * chartH : ((0 - t) / range) * chartH;
                    var isHeat = t < 15;
                    els.push(<rect key={"b"+i} x={x} y={t >= 0 ? baseY - ((t-tMin)/range)*chartH : zeroY} width={barW} height={Math.max(1, Math.abs(t)/range*chartH)} fill={isHeat ? "#3b82f6" : "#ef4444"} opacity="0.6" rx="2"/>);
                    els.push(<text key={"v"+i} x={x+barW/2} y={baseY - ((t-tMin)/range)*chartH - 3} textAnchor="middle" fontSize="6" fill={isHeat ? "#60a5fa" : "#f87171"}>{t.toFixed(0)}</text>);
                    els.push(<text key={"m"+i} x={x+barW/2} y={baseY+10} textAnchor="middle" fontSize="7" fill="#666">{months[i]}</text>);
                  });
                  // Season heating indicator
                  els.push(<text key="leg" x="140" y="98" textAnchor="middle" fontSize="6" fill="#555">Albastru = sezon incalzire (&lt;15C) | Rosu = sezon racire</text>);
                  return els;
                })()}
              </svg>
            </Card>
          )}

          {selectedClimate && (
            <Card title={t("Radiație solară anuală",lang)}>
              <div className="space-y-1">
                {Object.entries(selectedClimate.solar).map(([dir, val]) => (
                  <div key={dir} className="flex items-center justify-between py-1">
                    <span className="text-xs opacity-50">{dir}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${(val/450)*100}%`, background:`linear-gradient(90deg, #f59e0b, #ef4444)`}} />
                      </div>
                      <span className="text-xs font-mono w-12 text-right opacity-60">{val}</span>
                    </div>
                  </div>
                ))}
                <div className="text-[10px] opacity-30 mt-2">kWh/(m²·an) — valori medii Mc 001-2022</div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
        <div />
        <button onClick={() => goToStep(2, 1)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all text-sm">
          Pasul 2: Anvelopă →
        </button>
      </div>
    </div>
  );
}
