import { useState, useCallback, useMemo, useRef } from "react";
import { cn, Select, Input, Card, Badge, ResultRow } from "../components/ui.jsx";
import AutocompleteInput from "../components/AutocompleteInput.jsx";
import IFCImport from "../components/IFCImport.jsx";
import InvoiceOCR from "../components/InvoiceOCR.jsx";
import CLIMATE_DB from "../data/climate.json";
import { T } from "../data/translations.js";
import {
  parseClimateCSV,
  parseEPW,
  fetchOpenMeteo,
  openMeteoToClimateData,
  validateClimateData,
} from "../calc/climate-import.js";

// ── Lazy-load localități România ───────────────────────────────────────────────
let _localitiesCache = null;
async function getLocalitiesDB() {
  if (_localitiesCache) return _localitiesCache;
  try {
    const m = await import("../data/ro-localities.json");
    _localitiesCache = m.default || m;
  } catch {
    _localitiesCache = { counties: [], localities: [] };
  }
  return _localitiesCache;
}

// ── OSM Street autocomplete ────────────────────────────────────────────────────
async function searchStreetOSM(query, city, county) {
  const q = city ? `${query}, ${city}, Romania` : `${query}, Romania`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=7&countrycodes=ro`;
  try {
    const res = await fetch(url, { headers: { "Accept-Language": "ro", "User-Agent": "Zephren/3.2" } });
    if (!res.ok) return [];
    const data = await res.json();
    return data
      .filter(r => r.address)
      .map(r => {
        const a = r.address;
        const road = a.road || a.pedestrian || a.path || a.footway || "";
        const houseNr = a.house_number || "";
        const label = [road, houseNr].filter(Boolean).join(", nr. ") || r.display_name.split(",")[0];
        return { label, value: label, sub: a.city || a.town || a.village || "" };
      })
      .filter(r => r.label);
  } catch {
    return [];
  }
}

// ── OSM Geocodare ─────────────────────────────────────────────────────────────
async function geocodeAddress({ address, city, county }) {
  const q = [address, city, county, "Romania"].filter(Boolean).join(", ");
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "ro", "User-Agent": "Zephren/3.2" } });
  if (!res.ok) throw new Error("Nominatim error");
  const data = await res.json();
  if (!data.length) throw new Error("Adresa nu a fost găsită");
  const r = data[0];
  const addr = r.address || {};
  return {
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    city: addr.city || addr.town || addr.village || addr.municipality || "",
    county: addr.county?.replace(/^Județul\s*/i, "") || addr.state || "",
    postal: addr.postcode || "",
  };
}

async function getBuildingFootprint(lat, lon) {
  // Overpass API: caută clădiri în raza de 30m
  const query = `[out:json][timeout:10];way["building"](around:30,${lat},${lon});out geom;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.elements?.length) return null;
  const way = data.elements[0];
  if (!way.geometry?.length) return null;
  // Calculează aria poligonului (formula shoelace pe coordonate sferice)
  const coords = way.geometry;
  let area = 0;
  const R = 6371000; // raza Pământ în metri
  for (let i = 0; i < coords.length - 1; i++) {
    const lat1 = coords[i].lat * Math.PI / 180;
    const lon1 = coords[i].lon * Math.PI / 180;
    const lat2 = coords[i + 1].lat * Math.PI / 180;
    const lon2 = coords[i + 1].lon * Math.PI / 180;
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = Math.abs(area * R * R / 2);
  const tags = way.tags || {};
  return {
    footprintM2: Math.round(area),
    levels: parseInt(tags["building:levels"] || tags.levels || "0") || null,
    yearBuilt: tags["start_date"] || tags["construction_date"] || null,
    buildingType: tags.building || null,
  };
}

export default function Step1Identification({
  building, updateBuilding, lang, selectedClimate,
  BUILDING_CATEGORIES, STRUCTURE_TYPES,
  autoDetectLocality, estimateGeometry, avRatio,
  loadFullDemo, loadFullDemo2, loadFullDemo3, loadFullDemo4, loadFullDemo5, loadFullDemo6, loadFullDemo7, loadFullDemo8,
  loadFullDemo9, loadFullDemo10,
  loadFullDemo11, loadFullDemo12, loadFullDemo13, loadFullDemo14,
  loadTypicalBuilding, showToast,
  goToStep,
}) {
  const t = (key) => lang === "RO" ? key : (T[key]?.EN || key);
  const [geoStatus, setGeoStatus] = useState(null); // null | "loading" | "ok" | "error"
  const [geoSuggestion, setGeoSuggestion] = useState(null);
  const [showIFC, setShowIFC] = useState(false);
  const [showOCR, setShowOCR] = useState(false);

  // ── State ERA5/TMY import ────────────────────────────────────────────────────
  const [importPanelOpen, setImportPanelOpen] = useState(false);
  const [importStatus, setImportStatus] = useState(null); // null | "loading" | "ok" | "error"
  const [importStatusMsg, setImportStatusMsg] = useState("");
  const [importedClimateData, setImportedClimateData] = useState(null);
  const csvFileRef = useRef(null);
  const epwFileRef = useRef(null);

  // ── State localități ────────────────────────────────────────────────────────
  const [localitiesDB, setLocalitiesDB] = useState({ counties: [], localities: [] });

  // Încarcă DB la prima interacțiune
  const ensureLocalitiesLoaded = useCallback(async () => {
    if (localitiesDB.counties.length > 0) return;
    const db = await getLocalitiesDB();
    setLocalitiesDB(db);
  }, [localitiesDB.counties.length]);

  // Lista județe pentru autocomplete
  const countySuggestions = useMemo(() =>
    localitiesDB.counties.map(c => ({ label: c.name, value: c.name, sub: c.code })),
  [localitiesDB.counties]);

  // Lista localități filtrată după județ selectat
  const citySuggestions = useMemo(() => {
    const all = localitiesDB.localities;
    const filtered = building.county
      ? all.filter(l => l.county === building.county)
      : all;
    return filtered.map(l => ({
      label: l.name,
      value: l.name,
      sub: l.type + (l.county && !building.county ? ` · ${l.county}` : ""),
      postal: l.postal,
      county: l.county,
    }));
  }, [localitiesDB.localities, building.county]);

  // Handler selectare localitate → auto-completează județ și cod poștal
  const handleCitySelect = useCallback((item) => {
    if (item.county) updateBuilding("county", item.county);
    if (item.postal) updateBuilding("postal", item.postal);
    autoDetectLocality(item.value);
  }, [updateBuilding, autoDetectLocality]);

  // Handler selectare județ → filtrează localitățile
  const handleCountySelect = useCallback((item) => {
    updateBuilding("county", item.value || item.label);
  }, [updateBuilding]);

  // Street autocomplete via OSM
  const searchStreet = useCallback(async (q) => {
    return searchStreetOSM(q, building.city, building.county);
  }, [building.city, building.county]);

  const handleGeocode = useCallback(async () => {
    if (!building.address && !building.city) {
      showToast("Completați adresa sau localitatea mai întâi", "info");
      return;
    }
    setGeoStatus("loading");
    setGeoSuggestion(null);
    try {
      const geo = await geocodeAddress({ address: building.address, city: building.city, county: building.county });
      if (geo.city && !building.city) updateBuilding("city", geo.city);
      if (geo.county && !building.county) updateBuilding("county", geo.county);
      if (geo.postal && !building.postal) updateBuilding("postal", geo.postal);
      autoDetectLocality(geo.city || building.city);

      // Caută footprint clădire
      try {
        const fp = await getBuildingFootprint(geo.lat, geo.lon);
        if (fp) {
          setGeoSuggestion(fp);
        } else {
          setGeoStatus("ok");
        }
      } catch { setGeoStatus("ok"); }
    } catch (e) {
      setGeoStatus("error");
      showToast("Geocodare eșuată: " + e.message, "error");
    }
  }, [building, updateBuilding, autoDetectLocality, showToast]);

  // ── Handlers ERA5/TMY import ─────────────────────────────────────────────────
  const applyImportedClimate = useCallback((data, sourceName) => {
    const validation = validateClimateData(data);
    if (!validation.valid) {
      setImportStatus("error");
      setImportStatusMsg("Erori validare: " + validation.errors.join("; "));
      showToast("Import climă eșuat: " + validation.errors[0], "error");
      return;
    }
    setImportedClimateData({ ...data, _source: sourceName });
    setImportStatus("ok");
    setImportStatusMsg(`Date importate: ${sourceName}`);
    if (validation.warnings.length > 0) {
      showToast("Import climă OK (cu avertismente): " + validation.warnings[0], "info", 5000);
    } else {
      showToast(`Date climatice importate: ${sourceName}`, "success");
    }
  }, [showToast]);

  const handleOpenMeteoImport = useCallback(async () => {
    const lat = selectedClimate?.lat || null;
    const lon = selectedClimate?.lon || null;
    if (!lat || !lon) {
      showToast("Selectați mai întâi o localitate cu coordonate valide.", "error");
      return;
    }
    setImportStatus("loading");
    setImportStatusMsg("Se descarcă date ERA5 de la Open-Meteo...");
    try {
      const raw = await fetchOpenMeteo(lat, lon, 2023);
      const data = openMeteoToClimateData(raw);
      applyImportedClimate(data, `Open-Meteo ERA5 2023 (${lat.toFixed(2)}, ${lon.toFixed(2)})`);
    } catch (err) {
      setImportStatus("error");
      setImportStatusMsg("Eroare: " + err.message);
      showToast("Eroare Open-Meteo: " + err.message, "error");
    }
  }, [selectedClimate, applyImportedClimate, showToast]);

  const handleCSVImport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const data = parseClimateCSV(text);
      applyImportedClimate(data, `CSV: ${file.name}`);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }, [applyImportedClimate]);

  const handleEPWImport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const data = parseEPW(text);
      applyImportedClimate(data, `EPW: ${file.name}${data.city && data.city !== "Necunoscut" ? " (" + data.city + ")" : ""}`);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }, [applyImportedClimate]);

  // ── Handler IFC/BIM import ───────────────────────────────────────────────────
  const handleIFCApply = useCallback((data) => {
    if (data.address) updateBuilding("address", data.address);
    if (data.areaUseful != null) updateBuilding("areaUseful", String(data.areaUseful));
    if (data.volume != null) updateBuilding("volume", String(data.volume));
    setShowIFC(false);
    showToast("Date IFC/BIM aplicate cu succes", "success");
  }, [updateBuilding, showToast]);

  // ── Handler InvoiceOCR import ────────────────────────────────────────────────
  const handleOCRApply = useCallback((data) => {
    try {
      localStorage.setItem("zephren_measured_consumption", JSON.stringify(data));
    } catch {}
    setShowOCR(false);
    showToast("Date consum din factură salvate", "success");
  }, [showToast]);

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
              <AutocompleteInput
                label={t("Strada, nr.",lang)}
                value={building.address}
                onChange={v => updateBuilding("address", v)}
                onSelect={item => updateBuilding("address", item.value || item.label)}
                onSearch={searchStreet}
                debounce={400}
                placeholder="Str. Exemplu, nr. 10"
                maxItems={7}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AutocompleteInput
                  label={t("Localitate",lang)}
                  value={building.city}
                  onChange={v => { updateBuilding("city", v); autoDetectLocality(v); }}
                  onSelect={handleCitySelect}
                  suggestions={citySuggestions}
                  onFocusCapture={ensureLocalitiesLoaded}
                  placeholder="Cluj-Napoca"
                  maxItems={8}
                />
                <AutocompleteInput
                  label={t("Județ",lang)}
                  value={building.county}
                  onChange={v => updateBuilding("county", v)}
                  onSelect={handleCountySelect}
                  suggestions={countySuggestions}
                  onFocusCapture={ensureLocalitiesLoaded}
                  placeholder="Cluj"
                  maxItems={8}
                />
              </div>
              <Input label={t("Cod poștal",lang)} value={building.postal} onChange={v => updateBuilding("postal",v)} />

              {/* Geocodare OSM */}
              <button
                onClick={handleGeocode}
                disabled={geoStatus === "loading"}
                className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-medium transition-all disabled:opacity-50"
              >
                {geoStatus === "loading"
                  ? <><span className="w-3 h-3 rounded-full border border-sky-400 border-t-transparent animate-spin" /> Geocodare OSM...</>
                  : <><span>🔍</span> Autocompletare adresă (OSM)</>}
              </button>

              {/* Import IFC/BIM și OCR Factură */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowIFC(true)}
                  className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium transition-all"
                >
                  <span>📎</span> Import IFC/BIM
                </button>
                <button
                  onClick={() => setShowOCR(true)}
                  className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 text-xs font-medium transition-all"
                >
                  <span>📄</span> OCR Factură
                </button>
              </div>

              {/* Sugestie footprint clădire */}
              {geoSuggestion && (
                <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 space-y-2">
                  <div className="text-xs font-semibold text-sky-300">📐 Date clădire din OpenStreetMap</div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="opacity-60">Amprentă:</div>
                    <div className="font-medium">{geoSuggestion.footprintM2} m²</div>
                    {geoSuggestion.levels && <><div className="opacity-60">Etaje:</div><div className="font-medium">{geoSuggestion.levels}</div></>}
                    {geoSuggestion.yearBuilt && <><div className="opacity-60">An construcție:</div><div className="font-medium">{geoSuggestion.yearBuilt}</div></>}
                    {geoSuggestion.buildingType && <><div className="opacity-60">Tip OSM:</div><div className="font-medium">{geoSuggestion.buildingType}</div></>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (geoSuggestion.footprintM2 && !building.areaUseful) {
                          const estimatedUseful = Math.round(geoSuggestion.footprintM2 * (geoSuggestion.levels || 1) * 0.85);
                          updateBuilding("areaUseful", String(estimatedUseful));
                        }
                        if (geoSuggestion.yearBuilt && !building.yearBuilt) updateBuilding("yearBuilt", geoSuggestion.yearBuilt);
                        if (geoSuggestion.levels && !building.floors) updateBuilding("floors", `P+${geoSuggestion.levels - 1}E`);
                        setGeoSuggestion(null);
                        setGeoStatus("ok");
                        showToast("Date OSM aplicate", "success");
                      }}
                      className="flex-1 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] font-medium transition-all"
                    >Aplică date</button>
                    <button
                      onClick={() => { setGeoSuggestion(null); setGeoStatus("ok"); }}
                      className="px-3 py-1 rounded-lg border border-white/10 text-[10px] opacity-50 hover:opacity-70 transition-all"
                    >Ignoră</button>
                  </div>
                </div>
              )}
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
              {/* 8 DEMO-URI COMPLETE — scenarii reale piața certificării energetice România */}
              <button onClick={() => loadFullDemo()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏢</span>
                  <div>
                    <div className="font-bold text-emerald-300">Ap. 2 cam. bloc P+4 '82 București — VÂNZARE</div>
                    <div className="opacity-50 mt-0.5">Cel mai frecvent CPE · cazan gaz condensare 24kW · fără izolație · fără regenerabile · Clasă D-E</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo2()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏢</span>
                  <div>
                    <div className="font-bold text-emerald-300">Ap. 3 cam. bloc P+10 '74 reabilitat Cluj — VÂNZARE</div>
                    <div className="opacity-50 mt-0.5">ETICS EPS 10cm · centrală de scară gaz condensare · PVC dublu Low-E · Clasă C</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo3()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏠</span>
                  <div>
                    <div className="font-bold text-emerald-300">Casă nouă P+1 nZEB Constanța 2025 — RECEPȚIE</div>
                    <div className="opacity-50 mt-0.5">PC aer-apă 10kW + PV 6kWp + HR 90% · BCA 30cm + EPS 15cm · Clasă A nZEB</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo4()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏚️</span>
                  <div>
                    <div className="font-bold text-emerald-300">Casă veche P '62 sat rural Vaslui — VÂNZARE</div>
                    <div className="opacity-50 mt-0.5">Sobă teracotă lemne · zidărie 50cm · ferestre lemn · fără izolație · Clasă F-G (cel mai rău scenariu)</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo5()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏡</span>
                  <div>
                    <div className="font-bold text-emerald-300">Vilă P+1+M reab. cu PC Brașov — REABILITARE</div>
                    <div className="opacity-50 mt-0.5">GVP 25cm + vată 15cm · PC aer-apă 12kW + PV 5kWp + solar termic 4m² · Clasă B</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo6()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏗️</span>
                  <div>
                    <div className="font-bold text-emerald-300">Bloc nou P+6 nZEB Iași 2025 — RECEPȚIE</div>
                    <div className="opacity-50 mt-0.5">Gaz condensare 200kW · EPS grafitat 15cm · PV 20kWp · HR 70% · Clasă B nZEB</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo7()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏬</span>
                  <div>
                    <div className="font-bold text-emerald-300">Birouri P+3 Cluj-Napoca 2024 — ÎNCHIRIERE</div>
                    <div className="opacity-50 mt-0.5">VRF Daikin + fațadă cortină tripan + PV 30kWp + LED BMS + HR 80% · Clasă A</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo8()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏨</span>
                  <div>
                    <div className="font-bold text-emerald-300">Pensiune P+1 Sibiu reab. 2024 — TURISM</div>
                    <div className="opacity-50 mt-0.5">Cazan peleți 60kW + solar termic 8m² + PV 8kWp + EPS 12cm · Clasă C</div>
                  </div>
                </div>
              </button>

              <div className="border-t border-white/[0.06] my-2 flex items-center gap-2">
                <span className="text-[10px] opacity-30 whitespace-nowrap">exemple reale validate</span>
                <div className="flex-1 border-t border-white/[0.06]"></div>
              </div>

              <button onClick={() => loadFullDemo9()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏠</span>
                  <div>
                    <div className="font-bold text-amber-300">Casă P+M Brașov 2009 — VALIDARE (lucrare master)</div>
                    <div className="opacity-50 mt-0.5">GVP 25cm + EPS 10cm · vată 20cm pod · cazan gaz cond. 24kW · Ref. MC2006: q_tot=174,9 kWh/m²an Cl.B</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo10()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏫</span>
                  <div>
                    <div className="font-bold text-amber-300">Cămin studențesc 2S+P+4E Brașov 1997 — VALIDARE (disertație)</div>
                    <div className="opacity-50 mt-0.5">BA 30cm + EPS 10cm · terasă neizolată · cazan gaz 350kW · Ref. MC2006: q_tot=240,7 kWh/m²an Cl.C</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo11()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏥</span>
                  <div>
                    <div className="font-bold text-amber-300">Spital Petroșani C8 P+4E 1965 — VALIDARE Mc 001-2022</div>
                    <div className="opacity-50 mt-0.5">Cărămidă 38cm + simplu vitraj · termoficare · Ref. Mc2022: EP=246 kWh/m²an Cl.C · deviatıe −1,7 % VALID</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo12()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <div>
                    <div className="font-bold text-red-400">Liceu Târgoviște C6 P+2E 1975 — ATENȚIE sol dublu-contabilizat</div>
                    <div className="opacity-50 mt-0.5">Cărămidă 38cm + simplu vitraj mare · gaz · H_tr=9936 W/K · deviatıe +120 % (metodologie sol)</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo13()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏢</span>
                  <div>
                    <div className="font-bold text-amber-300">Bloc T770 Timișoara P+9E 1985 — VALIDARE U teoretic</div>
                    <div className="opacity-50 mt-0.5">Panel vibropor 17cm (U=1,86 catalog) · termoficare · H_tr=2334 W/K · deviatıe +8,0 % VALID</div>
                  </div>
                </div>
              </button>

              <button onClick={() => loadFullDemo14()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏢</span>
                  <div>
                    <div className="font-bold text-emerald-300">Bloc T770 Timișoara P+9E 1985 — VALIDARE U măsurat</div>
                    <div className="opacity-50 mt-0.5">Panel măsurat in-situ (U=1,32) · termoficare · H_tr=1966 W/K · deviatıe +2,7 % EXCELENT</div>
                  </div>
                </div>
              </button>
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

              {/* ── Buton import ERA5/TMY ── */}
              <button
                onClick={() => setImportPanelOpen(v => !v)}
                className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 text-xs font-medium transition-all mt-2"
              >
                <span>📡</span>
                {importPanelOpen ? "Ascunde panel import ERA5/TMY" : "Import ERA5/TMY — date climatice externe"}
              </button>

              {/* ── Panel import inline ── */}
              {importPanelOpen && (
                <div className="mt-2 rounded-xl border border-violet-500/20 bg-violet-900/10 p-3 space-y-3">
                  <div className="text-xs font-semibold text-violet-300 mb-1">📡 Import date climatice externe</div>

                  {/* Opțiunea 1: Open-Meteo ERA5 */}
                  <div className="bg-slate-800/60 rounded-lg p-2.5 space-y-1.5">
                    <div className="text-xs font-medium text-slate-200">1. Open-Meteo ERA5 (auto)</div>
                    <div className="text-[10px] text-slate-400">Descarcă medii lunare 2023 pentru coordonatele localității selectate (gratuit, fără API key).</div>
                    <button
                      onClick={handleOpenMeteoImport}
                      disabled={importStatus === "loading" || !selectedClimate}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium transition-all"
                    >
                      {importStatus === "loading"
                        ? <><span className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" /> Se descarcă...</>
                        : <><span>🌍</span> Descarcă date ERA5</>}
                    </button>
                    {!selectedClimate && (
                      <div className="text-[10px] text-amber-400">Selectați mai întâi o localitate din lista de mai sus.</div>
                    )}
                  </div>

                  {/* Opțiunea 2: CSV */}
                  <div className="bg-slate-800/60 rounded-lg p-2.5 space-y-1.5">
                    <div className="text-xs font-medium text-slate-200">2. Import CSV</div>
                    <div className="text-[10px] text-slate-400">Format: Lună, T_medie, T_min, T_max, GHI (kWh/m²/lună), RH (%), Vânt (m/s) — 12 rânduri.</div>
                    <input
                      ref={csvFileRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCSVImport}
                      className="hidden"
                    />
                    <button
                      onClick={() => csvFileRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-all"
                    >
                      <span>📂</span> Alege fișier CSV
                    </button>
                  </div>

                  {/* Opțiunea 3: EPW */}
                  <div className="bg-slate-800/60 rounded-lg p-2.5 space-y-1.5">
                    <div className="text-xs font-medium text-slate-200">3. Import EPW (EnergyPlus)</div>
                    <div className="text-[10px] text-slate-400">Fișier .epw standard EnergyPlus — extrage automat medii lunare.</div>
                    <input
                      ref={epwFileRef}
                      type="file"
                      accept=".epw"
                      onChange={handleEPWImport}
                      className="hidden"
                    />
                    <button
                      onClick={() => epwFileRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-all"
                    >
                      <span>📂</span> Alege fișier EPW
                    </button>
                  </div>

                  {/* Status import */}
                  {importStatus === "ok" && importStatusMsg && (
                    <div className="flex items-start gap-2 rounded-lg bg-green-900/30 border border-green-700/30 p-2 text-xs text-green-300">
                      <span className="mt-0.5">✓</span>
                      <div>
                        <div className="font-medium">{importStatusMsg}</div>
                        {importedClimateData?.temp_month && (
                          <div className="text-[10px] text-green-400 mt-0.5">
                            T medie ian.: {importedClimateData.temp_month[0]}°C · T medie iul.: {importedClimateData.temp_month[6]}°C
                            {importedClimateData.GHI_month?.length === 12
                              ? ` · GHI iul.: ${importedClimateData.GHI_month[6]} kWh/m²`
                              : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {importStatus === "error" && importStatusMsg && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-900/30 border border-red-700/30 p-2 text-xs text-red-300">
                      <span className="mt-0.5">✗</span>
                      <div>{importStatusMsg}</div>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 italic">
                    Notă: datele importate sunt afișate informativ. Calculele principale folosesc datele climatice Mc 001-2022 din baza de date internă.
                  </div>
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

      {showIFC && <IFCImport onApply={handleIFCApply} onClose={() => setShowIFC(false)} />}
      {showOCR && <InvoiceOCR onApply={handleOCRApply} onClose={() => setShowOCR(false)} />}
    </div>
  );
}
