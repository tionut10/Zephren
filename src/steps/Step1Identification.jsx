import { useState, useCallback, useMemo } from "react";
import { Select, Input, Card, Badge, ResultRow, cn } from "../components/ui.jsx";
import AutocompleteInput from "../components/AutocompleteInput.jsx";
import BuildingPhotos from "../components/BuildingPhotos.jsx";
import IFCImport from "../components/IFCImport.jsx";
import SmartDataHub from "../components/SmartDataHub/SmartDataHub.jsx";
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

// ── Validare câmpuri critice Step 1 (Sprint 18 UX) ───────────────────────────
function validateStep1Critical(b, lang) {
  const L = (ro, en) => lang === "EN" ? en : ro;
  const errs = {};
  const Au = parseFloat(b.areaUseful);
  if (!Au || Au <= 0)
    errs.areaUseful = L("Suprafața utilă trebuie să fie > 0 m²", "Usable area must be > 0 m²");
  const yr = parseInt(b.yearBuilt);
  if (!yr || yr < 1800 || yr > 2030)
    errs.yearBuilt = L("An construcție invalid (1800–2030)", "Invalid year built (1800–2030)");
  if (!b.city || !String(b.city).trim())
    errs.city = L("Localitatea este obligatorie", "City is required");
  if (!b.category)
    errs.category = L("Selectați categoria clădirii", "Select building category");
  if (!b.floors || !String(b.floors).trim())
    errs.floors = L("Regimul de înălțime este obligatoriu (ex: P+4E)", "Height regime is required (e.g. P+4E)");
  return errs;
}

export default function Step1Identification({
  building, updateBuilding, lang, selectedClimate,
  BUILDING_CATEGORIES, STRUCTURE_TYPES,
  autoDetectLocality, estimateGeometry, avRatio,
  loadDemoByIndex,
  loadTypicalBuilding, showToast,
  goToStep,
  onOpenTutorial,
  onOpenQuickFill,
  onOpenChat,
  onOpenJSONImport,
  buildingPhotos, setBuildingPhotos,
  userPlan,
}) {
  const t = (key) => lang === "RO" ? key : (T[key]?.EN || key);
  const [geoStatus, setGeoStatus] = useState(null); // null | "loading" | "ok" | "error"
  const [geoSuggestion, setGeoSuggestion] = useState(null);
  const [showIFC, setShowIFC] = useState(false);
  const [drawingLoading, setDrawingLoading] = useState(false);
  const [cadastralNr, setCadastralNr] = useState("");
  const [cadastralLoading, setCadastralLoading] = useState(false);
  const [cadastralMsg, setCadastralMsg] = useState("");
  // Sprint 18 UX — validare + banner
  const [showValidationBanner, setShowValidationBanner] = useState(false);
  const validationErrors = useMemo(() => validateStep1Critical(building, lang), [building, lang]);
  const hasErrors = Object.keys(validationErrors).length > 0;
  const fieldErr = (key) => showValidationBanner ? validationErrors[key] || "" : "";

  // ── State ERA5/TMY import ────────────────────────────────────────────────────
  const [importStatus, setImportStatus] = useState(null); // null | "loading" | "ok" | "error"
  const [importStatusMsg, setImportStatusMsg] = useState("");
  const [importedClimateData, setImportedClimateData] = useState(null);

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
  // ── ANCPI Cadastru lookup ────────────────────────────────────────────────────
  const handleCadastralLookup = useCallback(async () => {
    const nr = cadastralNr.trim();
    if (!nr) return;
    setCadastralLoading(true);
    setCadastralMsg("");
    try {
      // ANCPI nu are API public; simulăm lookup via OSM building tags sau Wikidata
      // Alternativ: utilizatorul introduce manual numărul, iar noi căutăm adresa via Nominatim
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(nr + " Romania")}&format=json&addressdetails=1&limit=3`;
      const res = await fetch(url, { headers: { "Accept-Language": "ro", "User-Agent": "Zephren/3.6" } });
      const data = await res.json();
      if (data.length > 0) {
        const r = data[0];
        const a = r.address || {};
        const city = a.city || a.town || a.village || "";
        const county = a.county?.replace(/^Județul\s*/i,"") || "";
        updateBuilding?.({ city, county });
        setCadastralMsg(`✓ Găsit: ${city}${county ? ", " + county : ""}`);
      } else {
        setCadastralMsg("Nu s-au găsit date. Verificați numărul cadastral sau introduceți manual.");
      }
    } catch {
      setCadastralMsg("Eroare la interogare. Verificați conexiunea.");
    } finally {
      setCadastralLoading(false);
    }
  }, [cadastralNr, updateBuilding]);

  const handleIFCApply = useCallback((data) => {
    if (data.address) updateBuilding("address", data.address);
    if (data.areaUseful != null) updateBuilding("areaUseful", String(data.areaUseful));
    if (data.volume != null) updateBuilding("volume", String(data.volume));
    setShowIFC(false);
    showToast("Date IFC/BIM aplicate cu succes", "success");
  }, [updateBuilding, showToast]);

  // ── Handler upload planșă tehnică ─────────────────────────────────────────────
  const handleDrawingUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast("Planșa depășește limita de 5 MB.", "error");
      return;
    }

    setDrawingLoading(true);
    showToast("Se analizează planșa tehnică...", "info", 8000);

    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = ev => resolve(ev.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/import-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileType: "drawing",
          fileData: base64,
          mimeType: file.type || "image/jpeg",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.data) {
        showToast(json.error || "Analiză planșă eșuată.", "error");
        return;
      }

      const b = json.data.building || {};
      let applied = 0;
      const apply = (key, val) => {
        if (val && String(val).trim()) { updateBuilding(key, String(val).trim()); applied++; }
      };
      apply("address", b.address);
      apply("city", b.city);
      apply("county", b.county);
      apply("postal", b.postal);
      apply("category", b.category);
      apply("structure", b.structure);
      apply("yearBuilt", b.yearBuilt);
      apply("yearRenov", b.yearRenov);
      apply("floors", b.floors);
      apply("areaUseful", b.areaUseful);
      apply("volume", b.volume);
      apply("areaEnvelope", b.areaEnvelope);
      apply("heightFloor", b.heightFloor);
      apply("n50", b.n50);
      apply("scopCpe", b.scopCpe);

      const conf = json.data.confidence || "medium";
      const confLabel = conf === "high" ? "ridicată" : conf === "low" ? "scăzută" : "medie";
      showToast(
        `Planșă analizată: ${applied} câmpuri completate (încredere ${confLabel}).`,
        applied > 0 ? "success" : "info",
        6000
      );
    } catch (err) {
      showToast("Eroare la analiza planșei: " + err.message, "error");
    } finally {
      setDrawingLoading(false);
    }
  }, [updateBuilding, showToast]);


  // Proiect gol = niciun câmp esențial completat
  const isEmptyProject = !building.address && !building.city && !building.areaUseful;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">{lang==="EN" ? "Building identification & classification" : "Identificare și clasificare clădire"}</h2>
        <p className="text-xs opacity-40">Date generale necesare conform Cap. 1 Mc 001-2022</p>
      </div>

      {/* ── Smart Data Hub — toate metodele de introducere date centralizate ── */}
      <SmartDataHub
        building={building}
        isEmptyProject={isEmptyProject}
        onOpenTutorial={onOpenTutorial}
        loadDemoByIndex={loadDemoByIndex}
        loadTypicalBuilding={loadTypicalBuilding}
        userPlan={userPlan}
        onGeocode={handleGeocode}
        geoStatus={geoStatus}
        cadastralNr={cadastralNr}
        onCadastralNrChange={setCadastralNr}
        onCadastralLookup={handleCadastralLookup}
        cadastralLoading={cadastralLoading}
        cadastralMsg={cadastralMsg}
        selectedClimate={selectedClimate}
        importStatus={importStatus}
        importStatusMsg={importStatusMsg}
        importedClimateData={importedClimateData}
        onOpenMeteoImport={handleOpenMeteoImport}
        drawingLoading={drawingLoading}
        onDrawingFile={handleDrawingUpload}
        onOpenIFC={() => setShowIFC(true)}
        onCSVImport={handleCSVImport}
        onEPWImport={handleEPWImport}
        onOpenJSONImport={onOpenJSONImport}
        onOpenQuickFill={onOpenQuickFill}
        onOpenChat={onOpenChat}
        showToast={showToast}
      />

      <div data-manual-form-anchor className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
                autoComplete="street-address"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <AutocompleteInput
                    label={t("Localitate",lang)}
                    value={building.city}
                    onChange={v => { updateBuilding("city", v); autoDetectLocality(v); }}
                    onSelect={handleCitySelect}
                    suggestions={citySuggestions}
                    onFocusCapture={ensureLocalitiesLoaded}
                    placeholder="Cluj-Napoca"
                    maxItems={8}
                    autoComplete="address-level2"
                  />
                  {fieldErr("city") && (
                    <p role="alert" aria-live="assertive" className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <span aria-hidden="true">⚠</span>{fieldErr("city")}
                    </p>
                  )}
                </div>
                <AutocompleteInput
                  label={t("Județ",lang)}
                  value={building.county}
                  onChange={v => updateBuilding("county", v)}
                  onSelect={handleCountySelect}
                  suggestions={countySuggestions}
                  onFocusCapture={ensureLocalitiesLoaded}
                  placeholder="Cluj"
                  maxItems={8}
                  autoComplete="address-level1"
                />
              </div>
              <Input label={t("Cod poștal",lang)} value={building.postal} onChange={v => updateBuilding("postal",v)} autoComplete="postal-code" />

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
              <div>
                <Select label={t("Categorie funcțională",lang)} value={building.category} onChange={v => updateBuilding("category",v)}
                  options={BUILDING_CATEGORIES.map(c=>({value:c.id,label:c.label}))} />
                {fieldErr("category") && (
                  <p role="alert" aria-live="assertive" className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <span aria-hidden="true">⚠</span>{fieldErr("category")}
                  </p>
                )}
              </div>
              <Select label={t("Tip structură",lang)} value={building.structure} onChange={v => updateBuilding("structure",v)}
                options={STRUCTURE_TYPES} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label={t("An construcție",lang)} value={building.yearBuilt} onChange={v => updateBuilding("yearBuilt",v)} type="number" placeholder="1975" error={fieldErr("yearBuilt")} />
                <Input label={t("An renovare",lang)} value={building.yearRenov} onChange={v => updateBuilding("yearRenov",v)} type="number" placeholder="—" />
              </div>
            </div>
          </Card>

          {/* Sprint 15 — Identificare juridică (Ord. MDLPA 16/2023 Anexa 1) */}
          <Card title={t("Identificare juridică",lang)} badge={<Badge color="amber">Ord. 16/2023</Badge>}>
            <div className="space-y-3">
              <Input label={t("Nume proprietar",lang)} value={building.owner || ""} onChange={v => updateBuilding("owner",v)} placeholder="Popescu Ion / SC Exemplu SRL" />
              <Input
                label={t("Nr. cadastral",lang)}
                tooltip="Format ANCPI: 5-6 cifre, opțional litera corpului, ex: 123456-A"
                value={building.cadastralNumber || ""}
                onChange={v => updateBuilding("cadastralNumber",v)}
                placeholder="123456-A"
              />
              {building.cadastralNumber && !/^\d{5,6}([-][A-Z]\d*)?$/.test(building.cadastralNumber.trim()) && (
                <div className="text-[10px] text-amber-400/80 bg-amber-500/5 rounded-lg p-2">
                  ⚠️ Format neobișnuit — ANCPI uzual: „123456" sau „123456-A"
                </div>
              )}
              <Input
                label={t("Carte Funciară",lang)}
                tooltip="Nr. CF + localitate + sector/sat (ex: CF nr. 123456 București Sector 3)"
                value={building.landBook || ""}
                onChange={v => updateBuilding("landBook",v)}
                placeholder="CF nr. 123456 București Sector 3"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={t("Arie construită desfășurată (Acd)",lang)}
                  tooltip="Suprafață construită desfășurată — Ord. MDLPA 16/2023 Anexa 1. Poate diferi de Au."
                  value={building.areaBuilt || ""}
                  onChange={v => updateBuilding("areaBuilt",v)}
                  type="number" unit="m²" min="0" step="0.1"
                />
                <Input
                  label={t("Arie încălzită",lang)}
                  tooltip="Suprafață efectiv încălzită. Lasă gol dacă = Au."
                  value={building.areaHeated || ""}
                  onChange={v => updateBuilding("areaHeated",v)}
                  type="number" unit="m²" min="0" step="0.1"
                />
              </div>
              {/* Pentru bloc (RC) — număr apartamente obligatoriu */}
              {building.category === "RC" && (
                <Input
                  label={t("Număr apartamente (pentru bloc)",lang)}
                  tooltip="Obligatoriu pentru Anexa 2 CPE (multi-apartament)"
                  value={building.nApartments || "1"}
                  onChange={v => updateBuilding("nApartments",v)}
                  type="number" min="1" step="1"
                />
              )}
              {/* Pentru apartament (RA) — identificare apartament specific */}
              {building.category === "RA" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input label={t("Nr. apartament",lang)} value={building.apartmentNo || ""} onChange={v => updateBuilding("apartmentNo",v)} placeholder="12" />
                  <Input label={t("Scara",lang)} value={building.staircase || ""} onChange={v => updateBuilding("staircase",v)} placeholder="A" />
                  <Input label={t("Etaj",lang)} value={building.floor || ""} onChange={v => updateBuilding("floor",v)} placeholder="3" />
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* Coloana 2: Geometrie */}
        <div className="space-y-5">
          <Card title={t("Geometrie",lang)}>
            <div className="space-y-3">
              <Input label={t("Regim de înălțime",lang)} value={building.floors} onChange={v => updateBuilding("floors",v)} placeholder="P+4E, S+P+2E+M" error={fieldErr("floors")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={building.basement} onChange={e => updateBuilding("basement",e.target.checked)}
                    className="accent-amber-500 rounded" />
                  {t("Subsol/demisol",lang)}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={building.attic} onChange={e => updateBuilding("attic",e.target.checked)}
                    className="accent-amber-500 rounded" />
                  {t("Mansardă/pod",lang)}
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
                {t("Estimare automată din Au + etaje", lang)}
              </button>
              <Input label={t("Suprafață utilă încălzită (Au)",lang)} tooltip="Suma suprafețelor utile ale tuturor spațiilor încălzite — Mc 001 Cap.1" value={building.areaUseful} onChange={v => updateBuilding("areaUseful",v)} type="number" unit="m²" min="0" step="0.1" error={fieldErr("areaUseful")} />
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
                options={[{value:"vanzare",label:t("Vânzare")},{value:"inchiriere",label:t("Închiriere")},{value:"receptie",label:t("Recepție clădire nouă")},{value:"informare",label:t("Informare proprietar")},{value:"renovare",label:t("Renovare majoră")},{value:"alt",label:t("Alt scop")}]} />

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

              {/* EV Charging — L.238/2024 + EPBD 2024/1275 Art. 14 */}
              {!["RI","RA"].includes(building.category) && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input label="Nr. locuri parcare" value={building.parkingSpaces} onChange={v => updateBuilding("parkingSpaces",v)} type="number" min="0" />
                    <Input
                      label="Pct. încărcare EV instalate"
                      tooltip="Puncte funcționale — EPBD 2024 Art. 14"
                      value={building.evChargingPoints || "0"}
                      onChange={v => updateBuilding("evChargingPoints",v)}
                      type="number" min="0"
                    />
                    <Input
                      label="Locuri EV precablate"
                      tooltip="Precablare ≥50% din locuri pentru rezidențial (Art. 14 §3)"
                      value={building.evChargingPrepared || "0"}
                      onChange={v => updateBuilding("evChargingPrepared",v)}
                      type="number" min="0"
                    />
                  </div>
                  {parseInt(building.parkingSpaces) >= 10 && (() => {
                    const isRecent = (parseInt(building.yearRenov) || parseInt(building.yearBuilt) || 0) >= 2024;
                    const n = parseInt(building.parkingSpaces) || 0;
                    const installedMin = n > 20 && isRecent ? Math.ceil(n / 10) : Math.max(1, Math.ceil(n / 20));
                    const preparedMin = n > 20 && isRecent ? Math.ceil(n * 0.5) : Math.ceil(n * 0.2);
                    const iOk = (parseInt(building.evChargingPoints) || 0) >= installedMin;
                    const pOk = (parseInt(building.evChargingPrepared) || 0) >= preparedMin;
                    return (
                      <div className={cn(
                        "text-[10px] rounded-lg p-2 border",
                        iOk && pOk ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300/80" : "bg-amber-500/5 border-amber-500/20 text-amber-400/80"
                      )}>
                        ⚡ EPBD 2024 Art. 14: min {installedMin} pct. instalate + min {preparedMin} precablate
                        {iOk && pOk ? " — ✓ conform" : ` — lipsă ${!iOk ? `${installedMin - (parseInt(building.evChargingPoints)||0)} instalate` : ""}${!iOk && !pOk ? " + " : ""}${!pOk ? `${preparedMin - (parseInt(building.evChargingPrepared)||0)} precablate` : ""}`}
                      </div>
                    );
                  })()}
                </>
              )}

              {/* Sprint 15 — IAQ (EN 16798-1 + EPBD 2024 Art. 11 + OMS 2021) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <Input
                  label={t("CO₂ max interior", lang)}
                  tooltip="CO₂ max în spațiu ocupat (ppm). EN 16798-1 Cat. II: ≤1200 ppm. Se măsoară cu senzor calibrat."
                  value={building.co2MaxPpm || ""}
                  onChange={v => updateBuilding("co2MaxPpm",v)}
                  type="number" unit="ppm" min="0" step="10"
                  placeholder="800"
                />
                <Input
                  label={t("PM2.5 mediu anual", lang)}
                  tooltip="PM2.5 mediu anual (μg/m³). OMS 2021: ≤5, UE 2030: ≤10"
                  value={building.pm25Avg || ""}
                  onChange={v => updateBuilding("pm25Avg",v)}
                  type="number" unit="μg/m³" min="0" step="0.1"
                  placeholder="7.5"
                />
              </div>
              {(building.co2MaxPpm || building.pm25Avg) && (() => {
                const co2 = parseFloat(building.co2MaxPpm);
                const pm = parseFloat(building.pm25Avg);
                let co2Label = null, pmLabel = null;
                if (!isNaN(co2) && co2 > 0) {
                  co2Label = co2 <= 950 ? { label: "Cat. I — ridicat", color: "text-emerald-400" }
                    : co2 <= 1200 ? { label: "Cat. II — standard", color: "text-lime-400" }
                    : co2 <= 1750 ? { label: "Cat. III — minim", color: "text-amber-400" }
                    : { label: "Cat. IV — ventilație slabă", color: "text-red-400" };
                }
                if (!isNaN(pm) && pm >= 0) {
                  pmLabel = pm <= 5 ? { label: "OMS 2021 ✓", color: "text-emerald-400" }
                    : pm <= 10 ? { label: "UE 2030 ✓", color: "text-lime-400" }
                    : pm <= 25 ? { label: "UE actual ✓", color: "text-amber-400" }
                    : { label: "Depășește UE", color: "text-red-400" };
                }
                return (
                  <div className="text-[10px] flex flex-wrap gap-3 px-1">
                    {co2Label && <span>CO₂: <span className={co2Label.color}>{co2Label.label}</span></span>}
                    {pmLabel && <span>PM2.5: <span className={pmLabel.color}>{pmLabel.label}</span></span>}
                  </div>
                );
              })()}

              {/* Sprint 15 — Rescalare A-G ZEB=A (EPBD 2024 Art. 19, din 2030) */}
              <Select
                label={t("Versiune scală energetică", lang)}
                tooltip="2023 = Mc 001-2022 (A+..G) · 2030_zeb = EPBD 2024 Art. 19 (ZEB=A, clasele existente shifted)"
                value={building.scaleVersion || "2023"}
                onChange={v => updateBuilding("scaleVersion", v)}
                options={[
                  { value: "2023", label: "2023 — Mc 001-2022 (A+..G)" },
                  { value: "2030_zeb", label: "2030 — EPBD 2024 Art. 19 (ZEB=A)" },
                ]}
              />
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
                  <ResultRow label={t("Zona climatică")} value={selectedClimate.zone} />
                  <ResultRow label="Temp. ext. calcul (θe)" value={selectedClimate.theta_e} unit="°C" />
                  <ResultRow label={t("Temp. medie anuală (θa)")} value={selectedClimate.theta_a} unit="°C" />
                  <ResultRow label="Grade-zile (NGZ)" value={selectedClimate.ngz.toLocaleString()} unit="K·zile" />
                  <ResultRow label={t("Durata sezon încălzire")} value={selectedClimate.season} unit="zile" />
                  <ResultRow label="Altitudine" value={selectedClimate.alt} unit="m" />
                </div>
              )}

              <div className="text-[10px] text-slate-500 italic mt-1">
                Import date climatice externe disponibil în hub-ul de import de mai sus (tab Climă).
              </div>
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

      {/* ── Documentare vizuală (fotografii clădire) ─────────────────────── */}
      <div className="mt-6">
        <Card title={t("Documentare vizuală", lang)} badge={<span className="text-[10px] opacity-40">incluse în Anexa fotografică CPE</span>}>
          <p className="text-[11px] text-slate-400 mb-3">
            Fotografii grupate pe categorii — utile pentru Anexa fotografică din CPE și pentru raportul de audit energetic.
          </p>
          <BuildingPhotos
            buildingPhotos={buildingPhotos || []}
            setBuildingPhotos={setBuildingPhotos}
            showToast={showToast}
            cn={cn}
          />
        </Card>
      </div>

      {/* Banner avertisment validare (Sprint 18 UX) */}
      {showValidationBanner && hasErrors && (
        <div role="alert" className="mt-6 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex justify-between items-start gap-3">
          <span className="leading-relaxed">
            <span aria-hidden="true">⚠ </span>
            {lang==="EN"
              ? "Incomplete fields detected. Calculation may be inaccurate or the certificate invalid. Complete the fields marked in red."
              : "Câmpuri incomplete detectate. Calculul poate fi inexact sau certificatul invalid. Completați câmpurile marcate cu roșu."}
          </span>
          <button onClick={() => setShowValidationBanner(false)} aria-label={lang==="EN"?"Close warning":"Închide avertisment"}
            className="text-amber-400 hover:text-amber-300 text-base shrink-0 leading-none">✕</button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
        <div />
        <button onClick={() => {
            if (hasErrors) {
              setShowValidationBanner(true);
              showToast?.(lang==="EN" ? "Incomplete fields — please complete the highlighted ones." : "Câmpuri incomplete — completați cele evidențiate.", "warning", 5000);
              return;
            }
            goToStep(2, 1);
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all text-sm">
          {lang==="EN" ? "Step 2: Envelope →" : "Pasul 2: Anvelopă →"}
        </button>
      </div>

      {showIFC && <IFCImport onApply={handleIFCApply} onClose={() => setShowIFC(false)} />}
    </div>
  );
}
