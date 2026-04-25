import { useState, useCallback, useMemo } from "react";
import { Select, Input, Card, Badge, ResultRow, cn } from "../components/ui.jsx";
import AutocompleteInput from "../components/AutocompleteInput.jsx";
import BuildingPhotos from "../components/BuildingPhotos.jsx";
import IFCImport from "../components/IFCImport.jsx";
import SmartDataHub from "../components/SmartDataHub/SmartDataHub.jsx";
import BuildingMap from "../components/BuildingMap.jsx"; // Sprint B Task 6: hartă OSM + ANCPI stub
import CLIMATE_DB from "../data/climate.json";
import { T } from "../data/translations.js";
import {
  parseClimateCSV,
  parseEPW,
  fetchOpenMeteo,
  openMeteoToClimateData,
  validateClimateData,
} from "../calc/climate-import.js";
import { fetchCadastralData } from "../lib/external-apis.js";
import {
  validateStep1,
  computeStep1Progress,
  classifyN50,
  getEVRequirements,
  SCOP_CPE_OPTIONS,
  OWNER_TYPE_OPTIONS,
  isResidential,
  parseFloorsRegime,
} from "../calc/step1-validators.js";

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

// Cache Overpass (item 26) — evită request-uri repetate la aceleași coordonate
const _overpassCache = new Map();
const _OVERPASS_TTL_MS = 10 * 60 * 1000; // 10 min

/**
 * Aria unui poligon geografic — shoelace planară pe proiecție echidistantă locală
 * (centrată pe centroidul poligonului). Eroare <0.5% pentru clădiri normale.
 */
function polygonAreaM2(coords) {
  if (!coords || coords.length < 3) return 0;
  // Închide poligonul dacă nu e închis
  const ring = coords[0].lat === coords[coords.length - 1].lat && coords[0].lon === coords[coords.length - 1].lon
    ? coords
    : [...coords, coords[0]];
  // Centroid simplu (pentru proiecție locală)
  let latSum = 0, lonSum = 0;
  for (const p of ring) { latSum += p.lat; lonSum += p.lon; }
  const lat0 = (latSum / ring.length) * Math.PI / 180;
  const R = 6371008.8; // raza medie Pământ (m) — IUGG 2015
  const cosLat0 = Math.cos(lat0);
  // Proiecție echidistantă locală: x = R·cos(lat0)·Δλ, y = R·Δφ
  const pts = ring.map(p => ({
    x: R * cosLat0 * (p.lon * Math.PI / 180),
    y: R * (p.lat * Math.PI / 180),
  }));
  // Shoelace planară
  let area2 = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    area2 += pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y;
  }
  return Math.abs(area2) / 2;
}

async function getBuildingFootprint(lat, lon) {
  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  const cached = _overpassCache.get(key);
  if (cached && Date.now() - cached.t < _OVERPASS_TTL_MS) return cached.v;
  // Overpass API: caută clădiri în raza de 30m
  const query = `[out:json][timeout:10];way["building"](around:30,${lat},${lon});out geom;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.elements?.length) {
    _overpassCache.set(key, { t: Date.now(), v: null });
    return null;
  }
  const way = data.elements[0];
  if (!way.geometry?.length) return null;
  const area = polygonAreaM2(way.geometry);
  const tags = way.tags || {};
  const result = {
    footprintM2: Math.round(area),
    levels: parseInt(tags["building:levels"] || tags.levels || "0") || null,
    yearBuilt: tags["start_date"] || tags["construction_date"] || null,
    buildingType: tags.building || null,
  };
  _overpassCache.set(key, { t: Date.now(), v: result });
  return result;
}

// ── Validare câmpuri critice Step 1 — DEPRECATED ──────────────────────────────
// Delegată în `src/calc/step1-validators.js` (Sprint 21). Păstrăm stub-ul pentru
// compatibilitate, dar Step1 folosește direct `validateStep1` din modul.
// eslint-disable-next-line no-unused-vars
function _legacyValidateStep1(b, lang) {
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
  // P0-3 (18 apr 2026) — banner date simulate când ANCPI_API_KEY lipsește
  const [cadastralSimulated, setCadastralSimulated] = useState(false);
  const [cadastralBannerDismissed, setCadastralBannerDismissed] = useState(false);
  // Sprint 18 UX + Sprint 21 — validare extinsă + banner
  const [showValidationBanner, setShowValidationBanner] = useState(false);
  const { errors: validationErrors, warnings: validationWarnings } = useMemo(
    () => validateStep1(building, lang),
    [building, lang],
  );
  const hasErrors = Object.keys(validationErrors).length > 0;
  const hasWarnings = Object.keys(validationWarnings).length > 0;
  const fieldErr = (key) => (showValidationBanner ? validationErrors[key] || "" : "");
  const fieldWarn = (key) => validationWarnings[key] || "";
  const progress = useMemo(() => computeStep1Progress(building, lang), [building, lang]);

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

      // Setăm ok implicit; dacă footprint-ul găsit → afișăm sugestie, dar starea rămâne "ok"
      setGeoStatus("ok");
      try {
        const fp = await getBuildingFootprint(geo.lat, geo.lon);
        if (fp) setGeoSuggestion(fp);
      } catch {
        // footprint opțional — geocodarea principală a reușit
      }
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
    setCadastralSimulated(false);
    setCadastralBannerDismissed(false);
    try {
      // P0-3: încearcă proxy-ul ANCPI server-side (foloseste ANCPI_API_KEY dacă e setat).
      // Dacă răspunsul are _simulated: true → setăm flag pentru banner.
      const ancpi = await fetchCadastralData(nr);
      if (ancpi && !ancpi.error) {
        const simulated = !!ancpi._simulated;
        setCadastralSimulated(simulated);
        const addr = ancpi.address || "";
        const city = ancpi.city && ancpi.city !== "—" ? ancpi.city : "";
        const county = ancpi.county && ancpi.county !== "—" ? ancpi.county : "";
        // FIX (Sprint 21 Bug #1) — updateBuilding are signature (key, val)
        if (city) updateBuilding("city", city);
        if (county) updateBuilding("county", county);
        if (addr) updateBuilding("address", addr);
        if (ancpi.area_mp && !building.areaBuilt) updateBuilding("areaBuilt", String(ancpi.area_mp));
        if (ancpi.year_built && !building.yearBuilt) updateBuilding("yearBuilt", String(ancpi.year_built));
        // Auto-populare cadastralNumber în datele clădirii
        updateBuilding("cadastralNumber", nr);
        setCadastralMsg(simulated
          ? `Găsit (simulat): ${addr}${city ? " · " + city : ""}`
          : `✓ Găsit: ${addr}${city ? " · " + city : ""}`
        );
        setCadastralLoading(false);
        return;
      }
    } catch {
      // Proxy indisponibil → fallback Nominatim mai jos
    }

    // Fallback secundar — Nominatim (OSM)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(nr + " Romania")}&format=json&addressdetails=1&limit=3`;
      const res = await fetch(url, { headers: { "Accept-Language": "ro", "User-Agent": "Zephren/3.6" } });
      const data = await res.json();
      if (data.length > 0) {
        const r = data[0];
        const a = r.address || {};
        const city = a.city || a.town || a.village || "";
        const county = a.county?.replace(/^Județul\s*/i,"") || "";
        // FIX (Sprint 21 Bug #1) — signature (key, val)
        if (city) updateBuilding("city", city);
        if (county) updateBuilding("county", county);
        updateBuilding("cadastralNumber", nr);
        setCadastralSimulated(true); // Nominatim nu e ANCPI oficial
        setCadastralMsg(`Găsit (OSM fallback): ${city}${county ? ", " + county : ""}`);
      } else {
        setCadastralMsg("Nu s-au găsit date. Verificați numărul cadastral sau introduceți manual.");
      }
    } catch {
      setCadastralMsg("Eroare la interogare. Verificați conexiunea.");
    } finally {
      setCadastralLoading(false);
    }
  }, [cadastralNr, updateBuilding, building.areaBuilt, building.yearBuilt]);

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
        cadastralSimulated={cadastralSimulated}
        cadastralBannerDismissed={cadastralBannerDismissed}
        onCadastralBannerDismiss={() => setCadastralBannerDismissed(true)}
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
                    <p role="alert" aria-live="polite" className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                      <span aria-hidden="true">⚠</span>{fieldErr("city")}
                    </p>
                  )}
                </div>
                <div>
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
                  {fieldErr("county") && (
                    <p role="alert" aria-live="polite" className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                      <span aria-hidden="true">⚠</span>{fieldErr("county")}
                    </p>
                  )}
                </div>
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
                      type="button"
                      aria-label={lang === "EN"
                        ? `Apply OSM building data: ${geoSuggestion.footprintM2} m² footprint, ${geoSuggestion.levels || "?"} floors`
                        : `Aplică datele OSM: amprentă ${geoSuggestion.footprintM2} m², ${geoSuggestion.levels || "?"} etaje`
                      }
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
                      className="flex-1 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                    >Aplică date</button>
                    <button
                      type="button"
                      aria-label={lang === "EN" ? "Dismiss OSM suggestion" : "Ignoră sugestia OSM"}
                      onClick={() => { setGeoSuggestion(null); setGeoStatus("ok"); }}
                      className="px-3 py-1 rounded-lg border border-white/10 text-[10px] opacity-50 hover:opacity-70 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    >Ignoră</button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title={t("Clasificare",lang)}>
            <div className="space-y-3">
              <Select
                label={t("Categorie funcțională", lang)}
                value={building.category}
                onChange={v => updateBuilding("category", v)}
                options={BUILDING_CATEGORIES.map(c => ({ value: c.id, label: c.label }))}
                error={fieldErr("category")}
                tooltip="Categoria determină profilul orar, regimul de temperatură, debitele ventilație și pragurile nZEB."
              />
              <Select
                label={t("Tip structură", lang)}
                value={building.structure}
                onChange={v => updateBuilding("structure", v)}
                options={STRUCTURE_TYPES}
                error={fieldErr("structure")}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label={t("An construcție",lang)} value={building.yearBuilt} onChange={v => updateBuilding("yearBuilt",v)} type="number" placeholder="1975" error={fieldErr("yearBuilt")} />
                <Input
                  label={t("An renovare",lang)}
                  value={building.yearRenov}
                  onChange={v => updateBuilding("yearRenov", v)}
                  type="number"
                  placeholder="—"
                  error={fieldWarn("yearRenov")}
                />
              </div>
            </div>
          </Card>

          {/* Sprint 15 + 21 — Identificare juridică (Ord. MDLPA 16/2023 Anexa 1) */}
          <Card title={t("Identificare juridică",lang)} badge={<Badge color="amber">Ord. 16/2023</Badge>}>
            <div className="space-y-3">
              {/* Sprint 21 #8 — tip proprietar + CUI validat */}
              <Select
                label={t("Tip proprietar", lang)}
                tooltip="Persoană fizică, juridică, publică sau asociație. Pentru PJ/PUB, CUI este obligatoriu."
                value={building.ownerType || ""}
                onChange={v => updateBuilding("ownerType", v)}
                options={OWNER_TYPE_OPTIONS.map(o => ({
                  value: o.value,
                  label: lang === "EN" ? o.labelEN : o.label,
                }))}
                placeholder={lang === "EN" ? "Select..." : "Selectează..."}
              />
              <Input
                label={t("Nume proprietar",lang)}
                value={building.owner || ""}
                onChange={v => updateBuilding("owner",v)}
                placeholder={building.ownerType === "PJ" ? "SC Exemplu SRL" : "Popescu Ion"}
              />
              {(building.ownerType === "PJ" || building.ownerType === "PUB") && (
                <Input
                  label={t("CUI / CIF", lang)}
                  tooltip="Cod Unic de Înregistrare (ANAF). Validat cu cheia de control."
                  value={building.ownerCUI || ""}
                  onChange={v => updateBuilding("ownerCUI", v)}
                  placeholder="RO12345678"
                  error={fieldWarn("ownerCUI")}
                />
              )}
              <Input
                label={t("Nr. cadastral",lang)}
                tooltip="Format ANCPI modern: 5-10 cifre, opțional corp (-C1) și UI (-U5). Ex: 123456, 123456-A, 123456-C1-U5."
                value={building.cadastralNumber || ""}
                onChange={v => updateBuilding("cadastralNumber",v)}
                placeholder="123456-C1-U5"
                error={fieldWarn("cadastralNumber")}
              />
              <Input
                label={t("Carte Funciară",lang)}
                tooltip="Nr. CF + localitate + sector/sat (ex: CF nr. 123456 București Sector 3)"
                value={building.landBook || ""}
                onChange={v => updateBuilding("landBook",v)}
                placeholder="CF nr. 123456 București Sector 3"
                error={fieldWarn("landBook")}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={t("Arie construită desfășurată (Acd)",lang)}
                  tooltip="Suprafață construită desfășurată — Ord. MDLPA 16/2023 Anexa 1. Poate diferi de Au."
                  value={building.areaBuilt || ""}
                  onChange={v => updateBuilding("areaBuilt",v)}
                  type="number" unit="m²" min="0" step="0.1"
                  error={fieldWarn("areaBuilt")}
                />
                <Input
                  label={t("Arie încălzită",lang)}
                  tooltip="Suprafață efectiv încălzită. Lasă gol dacă = Au."
                  value={building.areaHeated || ""}
                  onChange={v => updateBuilding("areaHeated",v)}
                  type="number" unit="m²" min="0" step="0.1"
                  error={fieldWarn("areaHeated")}
                />
              </div>
              {/* Pentru bloc (RC) — număr apartamente obligatoriu (Sprint 21 #6) */}
              {building.category === "RC" && (
                <Input
                  label={t("Număr apartamente (pentru bloc)",lang)}
                  tooltip="Obligatoriu ≥ 2 pentru Anexa 2 CPE (multi-apartament)"
                  value={building.nApartments || ""}
                  onChange={v => updateBuilding("nApartments",v)}
                  type="number" min="2" step="1"
                  placeholder="12"
                  error={fieldErr("nApartments")}
                />
              )}
              {/* Pentru apartament (RA) — identificare apartament specific (Sprint 21 #6) */}
              {building.category === "RA" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label={t("Nr. apartament",lang)}
                    value={building.apartmentNo || ""}
                    onChange={v => updateBuilding("apartmentNo",v)}
                    placeholder="12"
                    error={fieldErr("apartmentNo")}
                  />
                  <Input label={t("Scara",lang)} value={building.staircase || ""} onChange={v => updateBuilding("staircase",v)} placeholder="A" />
                  <Input label={t("Etaj",lang)} value={building.floor || ""} onChange={v => updateBuilding("floor",v)} placeholder="3" />
                </div>
              )}
              {/* Sprint 21 #27 — Hint cross-step Step 1 → Step 7 */}
              {(building.owner || building.cadastralNumber || building.landBook) && (
                <div className="text-[10px] text-sky-300/80 bg-sky-500/5 border border-sky-500/20 rounded-lg p-2">
                  ℹ {lang === "EN"
                    ? "These fields auto-populate the Audit Client Form (Step 7)."
                    : "Aceste câmpuri se transferă automat în Formularul de audit client (Step 7)."}
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
              <Input label={t("Volum încălzit (V)",lang)} tooltip="Volumul interior al spațiilor încălzite delimitat de anvelopa termică — m³" value={building.volume} onChange={v => updateBuilding("volume",v)} type="number" unit="m³" min="0" step="0.1" error={fieldErr("volume")} />
              {fieldWarn("volumeConsistency") && (
                <div className="text-[10px] text-amber-300/80 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
                  ⚠ {fieldWarn("volumeConsistency")}
                </div>
              )}
              <Input label={t("Suprafață anvelopă (Aenv)",lang)} value={building.areaEnvelope} onChange={v => updateBuilding("areaEnvelope",v)} type="number" unit="m²" min="0" step="0.1" error={fieldErr("areaEnvelope")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label={t("Înălțime clădire",lang)} value={building.heightBuilding} onChange={v => updateBuilding("heightBuilding",v)} type="number" unit="m" step="0.1" />
                <Input label={t("Înălțime etaj",lang)} value={building.heightFloor} onChange={v => updateBuilding("heightFloor",v)} type="number" unit="m" step="0.01" error={fieldErr("heightFloor")} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label={t("Perimetru clădire",lang)} value={building.perimeter} onChange={v => updateBuilding("perimeter",v)} type="number" unit="m" step="0.1" />
                <Input
                  label={t("n50 (blower door)",lang)}
                  tooltip="Rata de schimb aer la 50Pa — EN 13829. Prag nZEB: rezidențial ≤1.0 · non-rez ventilat mecanic ≤1.5 (Ord. MDLPA 161/2022)"
                  value={building.n50}
                  onChange={v => updateBuilding("n50",v)}
                  type="number" unit="h⁻¹" step="0.1"
                  error={fieldWarn("n50")}
                />
              </div>
              {/* Sprint 21 #12 — GWP lifecycle Level(s) EN 17392 breakdown */}
              <details className="bg-white/[0.02] rounded-lg border border-white/5">
                <summary className="cursor-pointer px-3 py-2 text-xs opacity-80 hover:opacity-100 select-none">
                  🌍 GWP lifecycle (EPBD IV Art. 7 · Level(s) EN 17392)
                </summary>
                <div className="p-3 space-y-3">
                  <Input
                    label={t("GWP total lifecycle", lang)}
                    tooltip="Total kgCO₂eq/m²·an — Art. 7 obligatoriu din 2028 pentru >1000m², 2030 pentru toate."
                    value={building.gwpLifecycle}
                    onChange={v => updateBuilding("gwpLifecycle", v)}
                    type="number" unit="kgCO₂eq/m²a" step="0.1"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      label="A1-A3 (produse)"
                      tooltip="Faza de producție (extracție + transport + fabricație)"
                      value={building.gwpA1A3 || ""}
                      onChange={v => updateBuilding("gwpA1A3", v)}
                      type="number" unit="kgCO₂eq/m²a" step="0.1"
                    />
                    <Input
                      label="B6 (operațional)"
                      tooltip="Consum energetic în utilizare — se calculează automat din Step 5"
                      value={building.gwpB6 || ""}
                      onChange={v => updateBuilding("gwpB6", v)}
                      type="number" unit="kgCO₂eq/m²a" step="0.1"
                    />
                    <Input
                      label="C3-C4 (sfârșit viață)"
                      tooltip="Demolare + procesare deșeuri"
                      value={building.gwpC3C4 || ""}
                      onChange={v => updateBuilding("gwpC3C4", v)}
                      type="number" unit="kgCO₂eq/m²a" step="0.1"
                    />
                  </div>
                </div>
              </details>
              {/* Solar-ready + albedo override (Sprint 21 #23) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer py-2">
                  <input type="checkbox" checked={building.solarReady} onChange={e => updateBuilding("solarReady",e.target.checked)} className="accent-amber-500" />
                  {lang==="EN"?"Solar-ready building":"Clădire solar-ready"}
                </label>
                <Input
                  label={t("Albedo override (teren)", lang)}
                  tooltip="Reflectanță sol (0–1). Implicit calculat pe zonă climatică (post-S20). Override manual: zăpadă=0.7, beton=0.3, asfalt=0.12, iarbă=0.2."
                  value={building.albedoOverride || ""}
                  onChange={v => updateBuilding("albedoOverride", v)}
                  type="number" step="0.01" min="0" max="1"
                  placeholder="auto"
                />
              </div>
              {/* Sprint 21 #28 — shadingFactor per-orientare */}
              <details className="bg-white/[0.02] rounded-lg border border-white/5">
                <summary className="cursor-pointer px-3 py-2 text-xs opacity-80 hover:opacity-100 select-none">
                  🌓 Factor umbrire — per orientare (SR EN ISO 52010-1 §6.5.1)
                </summary>
                <div className="p-3 space-y-2">
                  <Input
                    label={t("Global (legacy)", lang)}
                    tooltip="Factor global Fc=0..1. Recomandat: setează per orientare pentru horizon real."
                    value={building.shadingFactor}
                    onChange={v => updateBuilding("shadingFactor", v)}
                    type="number" step="0.01" min="0" max="1"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    {["N", "S", "E", "V"].map(dir => (
                      <Input
                        key={dir}
                        label={dir}
                        value={(building.shadingByOrientation?.[dir]) || ""}
                        onChange={v => updateBuilding("shadingByOrientation", {
                          ...(building.shadingByOrientation || {}),
                          [dir]: v,
                        })}
                        type="number" step="0.01" min="0" max="1"
                        placeholder="1.00"
                      />
                    ))}
                  </div>
                  {/* Sprint 21 #21 — Horizon obstacole (stub button) */}
                  <button
                    type="button"
                    onClick={() => showToast?.(
                      lang === "EN"
                        ? "Horizon editor coming soon (SR EN ISO 52010-1 §6.5.1). For now, enter per-orientation shading factors."
                        : "Editor orizont în lucru (SR EN ISO 52010-1 §6.5.1). Deocamdată, introdu factori per orientare.",
                      "info", 5000
                    )}
                    className="w-full text-[10px] py-1.5 rounded-lg border border-sky-500/20 bg-sky-500/5 text-sky-300 hover:bg-sky-500/10 transition-colors"
                    aria-label={lang === "EN" ? "Open horizon editor" : "Deschide editorul de orizont"}
                  >
                    📐 {lang === "EN" ? "Horizon profile editor (soon)" : "Editor profil orizont (în curând)"}
                  </button>
                </div>
              </details>

              {/* Scop CPE — L.372/2005 Art. 8¹ + extensii post-2024 (Sprint 21 #10) */}
              <Select
                label={lang==="EN"?"CPE purpose":"Scop elaborare CPE"}
                tooltip="Obligatoriu conform L. 372/2005 Art. 8¹. 'Renovare majoră' declanșează cost-optimal SR EN 15459-1."
                value={building.scopCpe}
                onChange={v => updateBuilding("scopCpe", v)}
                error={fieldErr("scopCpe")}
                options={SCOP_CPE_OPTIONS.map(o => ({
                  value: o.value,
                  label: lang === "EN" ? o.labelEN : o.label,
                }))}
              />
              {building.scopCpe === "renovare" && (
                <div className="text-[10px] text-amber-300/80 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
                  ⚡ Renovare majoră detectată — cost-optimal SR EN 15459-1 necesar (Step 6) + MEPS 2030/2033 (EPBD Art. 9).
                </div>
              )}

              {/* Sprint 21 #9 — n50 diferențiat rezidențial vs. non-rezidențial (Ord. MDLPA 161/2022) */}
              {(() => {
                const classification = classifyN50(building.n50, building.category);
                if (!classification) {
                  return (
                    <div className="text-[10px] opacity-40 italic">
                      Etanșeitate n50: introduceți valoarea pentru evaluare nZEB.
                    </div>
                  );
                }
                const { label, color, value, ref } = classification;
                return (
                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="opacity-40">Etanșeitate n50:</span>
                    <Badge color={color}>{label} — {value} h⁻¹</Badge>
                    <span className="opacity-30">
                      nZEB {ref.residential ? "rezidențial" : "non-rezidențial"}: ≤{ref.nZEB} h⁻¹
                    </span>
                  </div>
                );
              })()}

              {/* Sprint 21 #11 — EV Charging diferențiat rezidențial §3 vs non-rez §4 (EPBD 2024 Art. 14) */}
              {building.category !== "RA" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input label="Nr. locuri parcare" value={building.parkingSpaces} onChange={v => updateBuilding("parkingSpaces",v)} type="number" min="0" />
                    <Input
                      label="Pct. încărcare EV instalate"
                      tooltip="Puncte EV funcționale — EPBD 2024 Art. 14"
                      value={building.evChargingPoints || "0"}
                      onChange={v => updateBuilding("evChargingPoints",v)}
                      type="number" min="0"
                    />
                    <Input
                      label="Locuri EV precablate"
                      tooltip="Rezidențial §3: ≥50% · Non-rez §4: 1/5 (existent) sau 1/2 (renovare majoră)"
                      value={building.evChargingPrepared || "0"}
                      onChange={v => updateBuilding("evChargingPrepared",v)}
                      type="number" min="0"
                    />
                  </div>
                  {(() => {
                    const isRecent = (parseInt(building.yearRenov) || parseInt(building.yearBuilt) || 0) >= 2024;
                    const req = getEVRequirements({
                      parkingSpaces: building.parkingSpaces,
                      category: building.category,
                      isRecent,
                    });
                    if (!req) return null;
                    const iHave = parseInt(building.evChargingPoints) || 0;
                    const pHave = parseInt(building.evChargingPrepared) || 0;
                    const iOk = iHave >= req.installedMin;
                    const pOk = pHave >= req.preparedMin;
                    const gaps = [];
                    if (!iOk) gaps.push(`${req.installedMin - iHave} instalate`);
                    if (!pOk) gaps.push(`${req.preparedMin - pHave} precablate`);
                    return (
                      <div className={cn(
                        "text-[10px] rounded-lg p-2 border",
                        iOk && pOk ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300/80" : "bg-amber-500/5 border-amber-500/20 text-amber-400/80"
                      )}>
                        ⚡ {req.reference}: {req.description}
                        {iOk && pOk ? " — ✓ conform" : ` — lipsă ${gaps.join(" + ")}`}
                      </div>
                    );
                  })()}
                </>
              )}

              {/* Sprint 15 + 21 #13 — IAQ (EN 16798-1 + EPBD 2024 Art. 11 + OMS 2021) */}
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
                  tooltip="PM2.5 mediu anual (μg/m³). OMS 2021: ≤5, UE 2030: ≤10, UE actual: ≤25"
                  value={building.pm25Avg || ""}
                  onChange={v => updateBuilding("pm25Avg",v)}
                  type="number" unit="μg/m³" min="0" step="0.1"
                  placeholder="7.5"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={t("PM10 mediu anual", lang)}
                  tooltip="PM10 mediu anual (μg/m³). OMS 2021: ≤15, UE 2030: ≤20, UE actual: ≤45"
                  value={building.pm10Avg || ""}
                  onChange={v => updateBuilding("pm10Avg", v)}
                  type="number" unit="μg/m³" min="0" step="0.1"
                  placeholder="15"
                />
                <Input
                  label={t("NO₂ mediu anual", lang)}
                  tooltip="NO₂ mediu anual (μg/m³). EN 16798-1 Cat. II: ≤40. OMS 2021: ≤10"
                  value={building.no2Avg || ""}
                  onChange={v => updateBuilding("no2Avg", v)}
                  type="number" unit="μg/m³" min="0" step="0.1"
                  placeholder="20"
                />
              </div>
              {(building.co2MaxPpm || building.pm25Avg || building.pm10Avg || building.no2Avg) && (() => {
                const co2 = parseFloat(building.co2MaxPpm);
                const pm25 = parseFloat(building.pm25Avg);
                const pm10 = parseFloat(building.pm10Avg);
                const no2 = parseFloat(building.no2Avg);
                const out = [];
                if (!isNaN(co2) && co2 > 0) {
                  const c = co2 <= 950 ? { label: "Cat. I ✓", color: "text-emerald-400" }
                    : co2 <= 1200 ? { label: "Cat. II ✓", color: "text-lime-400" }
                    : co2 <= 1750 ? { label: "Cat. III", color: "text-amber-400" }
                    : { label: "Cat. IV ✗", color: "text-red-400" };
                  out.push(<span key="co2">CO₂: <span className={c.color}>{c.label}</span></span>);
                }
                if (!isNaN(pm25) && pm25 >= 0) {
                  const c = pm25 <= 5 ? { label: "OMS 2021 ✓", color: "text-emerald-400" }
                    : pm25 <= 10 ? { label: "UE 2030 ✓", color: "text-lime-400" }
                    : pm25 <= 25 ? { label: "UE actual", color: "text-amber-400" }
                    : { label: "✗", color: "text-red-400" };
                  out.push(<span key="pm25">PM2.5: <span className={c.color}>{c.label}</span></span>);
                }
                if (!isNaN(pm10) && pm10 >= 0) {
                  const c = pm10 <= 15 ? { label: "OMS ✓", color: "text-emerald-400" }
                    : pm10 <= 20 ? { label: "UE 2030 ✓", color: "text-lime-400" }
                    : pm10 <= 45 ? { label: "UE actual", color: "text-amber-400" }
                    : { label: "✗", color: "text-red-400" };
                  out.push(<span key="pm10">PM10: <span className={c.color}>{c.label}</span></span>);
                }
                if (!isNaN(no2) && no2 >= 0) {
                  const c = no2 <= 10 ? { label: "OMS ✓", color: "text-emerald-400" }
                    : no2 <= 40 ? { label: "EN 16798 Cat. II ✓", color: "text-lime-400" }
                    : { label: "✗", color: "text-red-400" };
                  out.push(<span key="no2">NO₂: <span className={c.color}>{c.label}</span></span>);
                }
                return (
                  <div className="text-[10px] flex flex-wrap gap-x-3 gap-y-1 px-1">
                    {out}
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
              {building.scaleVersion === "2030_zeb" && (
                <div className="text-[10px] text-violet-300/80 bg-violet-500/5 border border-violet-500/20 rounded-lg p-2">
                  ℹ EPBD 2024 Art. 19: din 1 ian 2030, ZEB = clasa A (shift). Clasele actuale A→B, B→C etc.
                </div>
              )}
              {/* Sprint 21 #25 — Scenariu climatic viitor (EPBD 2024 Art. 11 adaptare) */}
              <Select
                label={t("Scenariu climatic proiecție", lang)}
                tooltip="EPBD 2024 Art. 11 cere adaptare la schimbări climatice. Scenariile CORDEX RCP 4.5/8.5 modifică temperaturile medii și radiația solară pentru prognoză 2050."
                value={building.climateScenario || "current"}
                onChange={v => updateBuilding("climateScenario", v)}
                options={[
                  { value: "current", label: lang === "EN" ? "Current (TMY)" : "Curent (TMY)" },
                  { value: "rcp45_2050", label: "RCP 4.5 · 2050 (moderat)" },
                  { value: "rcp85_2050", label: "RCP 8.5 · 2050 (pesimist)" },
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
            <svg
              viewBox="0 0 180 150" width="180" height="130" className="mx-auto block opacity-80"
              role="img"
              aria-label={(() => {
                // Fix audit 24 apr 2026: parseFloorsRegime numără corect S+P+4E+M (7), nu doar "4"
                const fr = parseFloorsRegime(building.floors, {
                  basementHeated: !!building.basement,
                  atticHeated: !!building.attic,
                });
                const nF = Math.max(1, fr.aboveGround || 1);
                const extras = [];
                if (building.basement) extras.push(lang === "EN" ? "with basement" : "cu subsol");
                if (building.attic) extras.push(lang === "EN" ? "with attic" : "cu mansardă");
                return lang === "EN"
                  ? `Building preview: ${building.floors || "P"} (${nF} floor${nF>1?"s":""}) ${extras.join(", ")}`
                  : `Preview clădire: ${building.floors || "P"} (${nF} nivel${nF>1?"uri":""}) ${extras.join(", ")}`;
              })()}
            >
              {(() => {
                // Fix audit 24 apr 2026: parseFloorsRegime pentru SVG viz niveluri deasupra solului
                var fr = parseFloorsRegime(building.floors, {
                  basementHeated: !!building.basement,
                  atticHeated: !!building.attic,
                });
                var nF = Math.max(1, fr.aboveGround || 1);
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
              <Select
                label={t("Localitatea de calcul",lang)}
                value={building.locality}
                onChange={v => updateBuilding("locality",v)}
                placeholder="Selectează localitatea..."
                options={CLIMATE_DB.map(c=>({value:c.name, label:`${c.name} (Zona ${c.zone})`}))}
                error={fieldErr("locality")}
                tooltip="Localitatea de calcul determină zona climatică (I–V), grade-zile și durata sezonului."
              />


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

          {/* Sprint B Task 6: hartă OSM + ANCPI stub */}
          {selectedClimate?.lat != null && selectedClimate?.lon != null && (
            <BuildingMap
              lat={selectedClimate.lat}
              lon={selectedClimate.lon}
              address={building?.address}
              lang={lang}
            />
          )}

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

      {/* Banner avertisment validare (Sprint 18 + 21 — extins cu warnings + progress) */}
      {showValidationBanner && hasErrors && (
        <div role="alert" className="mt-6 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs flex justify-between items-start gap-3">
          <span className="leading-relaxed">
            <span aria-hidden="true">⚠ </span>
            {lang==="EN"
              ? `${Object.keys(validationErrors).length} required field(s) missing or invalid. Complete the fields marked in red before proceeding.`
              : `${Object.keys(validationErrors).length} câmp(uri) obligatorii lipsă sau invalide. Completați câmpurile marcate cu roșu înainte de a continua.`}
          </span>
          <button type="button" onClick={() => setShowValidationBanner(false)} aria-label={lang==="EN"?"Close warning":"Închide avertisment"}
            className="text-red-400 hover:text-red-300 text-base shrink-0 leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 rounded">✕</button>
        </div>
      )}
      {hasWarnings && !hasErrors && (
        <div role="status" className="mt-6 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-300/90 text-xs">
          <span aria-hidden="true">ℹ </span>
          {lang === "EN"
            ? `${Object.keys(validationWarnings).length} field(s) have warnings (values acceptable but unusual). Review the yellow hints.`
            : `${Object.keys(validationWarnings).length} câmp(uri) cu avertismente (valori acceptabile dar neobișnuite). Verificați indicațiile galbene.`}
        </div>
      )}
      {/* Sprint 21 #14 — Progress tracker sincronizat cu validare */}
      <div className="mt-4 px-1">
        <div className="flex items-center justify-between text-[10px] opacity-60 mb-1">
          <span>
            {lang === "EN" ? "Completion" : "Completitudine"}:
            {" "}<strong className="text-amber-300">{progress.filled}/{progress.total}</strong>
            {" "}{lang === "EN" ? "required fields" : "câmpuri obligatorii"}
          </span>
          <span>{Math.round((progress.filled / Math.max(1, progress.total)) * 100)}%</span>
        </div>
        <div
          className="h-1.5 bg-white/5 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.filled}
          aria-label={lang === "EN" ? "Step 1 completion progress" : "Progres completare Step 1"}
        >
          <div
            className={cn(
              "h-full transition-all",
              progress.filled === progress.total ? "bg-emerald-400" : progress.filled > progress.total / 2 ? "bg-amber-400" : "bg-red-400",
            )}
            style={{ width: `${(progress.filled / Math.max(1, progress.total)) * 100}%` }}
          />
        </div>
      </div>

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
