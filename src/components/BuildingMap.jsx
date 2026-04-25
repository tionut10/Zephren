/**
 * BuildingMap — Hartă OSM + ANCPI stub (Sprint B Task 6)
 *
 * Afișează poziția clădirii pe hartă OpenStreetMap (iframe embed, fără Leaflet)
 * + buton stub "Verifică cadastru ANCPI" cu date simulate explicit marcate.
 *
 * Iframe embed OSM standard:
 *   https://www.openstreetmap.org/export/embed.html?bbox=...&marker=lat,lon
 *
 * Avantaje față de Leaflet:
 *   - 0 dependențe noi (~150 KB economie)
 *   - tiles OSM gratis, fără API key
 *   - funcționează în SSR / build static
 * Limită:
 *   - nu putem desena overlay custom (zonă seismică, UHI) — viitor cu Leaflet în Sprint C+
 */
import { useState, useMemo } from "react";
import { cn } from "./ui.jsx";

const OSM_EMBED_BASE = "https://www.openstreetmap.org/export/embed.html";
const OSM_FULL_BASE = "https://www.openstreetmap.org/";

function buildEmbedUrl(lat, lon, zoom = 16) {
  // Bounding box în jurul punctului — aproximare ~1 km la zoom 16
  const delta = 0.005; // ~500 m pe direcție
  const bbox = [
    (lon - delta).toFixed(5),
    (lat - delta).toFixed(5),
    (lon + delta).toFixed(5),
    (lat + delta).toFixed(5),
  ].join(",");
  return `${OSM_EMBED_BASE}?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)},${lon.toFixed(5)}`;
}

function buildOSMFullUrl(lat, lon, zoom = 18) {
  return `${OSM_FULL_BASE}?mlat=${lat.toFixed(5)}&mlon=${lon.toFixed(5)}#map=${zoom}/${lat.toFixed(5)}/${lon.toFixed(5)}`;
}

// Stub ANCPI — returnează date simulate cu marcaj clar
function fetchANCPIStub({ lat, lon, address }) {
  return new Promise((resolve) => {
    // Simulează latency rețea
    setTimeout(() => {
      // Generăm cadastru pseudo-random deterministic din coordonate
      const seed = Math.floor((lat * 1000 + lon * 1000) * 100) % 100000;
      const cadNr = String(100000 + seed).padStart(6, "0");
      const uat = address?.match(/Bucureș|Cluj|Timiș|Iași|Constanț|Sibiu|Brașov|Oradea/i)?.[0] || "Necunoscut";
      const suprafata = 200 + (seed % 800); // 200-1000 m²
      resolve({
        _simulated: true,
        cadastral_nr: cadNr,
        carte_funciara: `${cadNr}-CF-${(seed % 9000) + 1000}`,
        uat: uat,
        suprafata_teren_m2: suprafata,
        regim_juridic: seed % 3 === 0 ? "Proprietate privată — persoană fizică" : seed % 3 === 1 ? "Proprietate privată — persoană juridică" : "Proprietate publică",
        notă: "API ANCPI public nu este încă disponibil. Date generate determinist din coordonate pentru testing UI. Pentru date reale: extras CF emis de OCPI sau verificare pe ancpi.ro.",
      });
    }, 600);
  });
}

export default function BuildingMap({ lat, lon, address, lang = "RO" }) {
  const [ancpiData, setAncpiData] = useState(null);
  const [ancpiLoading, setAncpiLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const hasCoords = lat != null && lon != null && !isNaN(lat) && !isNaN(lon);
  const embedUrl = useMemo(() => hasCoords ? buildEmbedUrl(lat, lon) : null, [lat, lon, hasCoords]);
  const fullUrl = useMemo(() => hasCoords ? buildOSMFullUrl(lat, lon) : null, [lat, lon, hasCoords]);

  const handleCheckANCPI = async () => {
    if (!hasCoords) return;
    setAncpiLoading(true);
    try {
      const data = await fetchANCPIStub({ lat, lon, address });
      setAncpiData(data);
    } catch (e) {
      setAncpiData({ error: e.message });
    } finally {
      setAncpiLoading(false);
    }
  };

  if (!hasCoords) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
        🗺️ {lang === "EN"
          ? "Map will appear after selecting a locality with valid GPS coordinates."
          : "Harta va apărea după selectarea unei localități cu coordonate GPS valide."}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/40 overflow-hidden">
      {/* Header colapsabil */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🗺️</span>
          <span className="text-sm font-semibold text-white">
            {lang === "EN" ? "Building location" : "Locație clădire"}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
          </span>
        </div>
        <span className="text-slate-500 text-xs">{collapsed ? "▼" : "▲"}</span>
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-3">
          {/* Iframe OSM */}
          <div className="rounded-lg overflow-hidden border border-white/10 bg-slate-900">
            <iframe
              title={lang === "EN" ? "Map" : "Hartă locație clădire"}
              src={embedUrl}
              width="100%"
              height="280"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ border: 0, display: "block" }}
            />
          </div>

          {/* Buton extern + ANCPI */}
          <div className="flex flex-wrap gap-2">
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
            >
              🔗 {lang === "EN" ? "Open in OSM" : "Deschide în OSM"}
            </a>
            <button
              onClick={handleCheckANCPI}
              disabled={ancpiLoading}
              className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                ancpiLoading
                  ? "bg-slate-700 text-slate-500 cursor-wait"
                  : "bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200"
              )}
            >
              {ancpiLoading
                ? <><span className="w-3 h-3 rounded-full border border-amber-300 border-t-transparent animate-spin" /> {lang === "EN" ? "Loading..." : "Se încarcă..."}</>
                : <>🏛️ {lang === "EN" ? "Check cadastre (ANCPI)" : "Verifică cadastru ANCPI"}</>}
            </button>
          </div>

          {/* Rezultat ANCPI */}
          {ancpiData && !ancpiData.error && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
              {/* Banner SIMULAT */}
              {ancpiData._simulated && (
                <div className="rounded bg-amber-500/20 border border-amber-500/40 px-2.5 py-1.5 text-[11px] text-amber-100">
                  ⚠ <strong>{lang === "EN" ? "Simulated data" : "Date simulate"}</strong> —
                  {lang === "EN"
                    ? " ANCPI public API is not yet available. Generated deterministically from coordinates for UI testing only."
                    : " API public ANCPI nu este încă disponibil. Datele sunt generate determinist din coordonate, doar pentru testing UI."}
                </div>
              )}
              {/* Date */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/40 rounded px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-500">{lang === "EN" ? "Cadastre nr." : "Nr. cadastral"}</div>
                  <div className="font-mono text-slate-200">{ancpiData.cadastral_nr}</div>
                </div>
                <div className="bg-slate-900/40 rounded px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-500">{lang === "EN" ? "Land book (CF)" : "Carte funciară"}</div>
                  <div className="font-mono text-slate-200">{ancpiData.carte_funciara}</div>
                </div>
                <div className="bg-slate-900/40 rounded px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-500">{lang === "EN" ? "Land area" : "Suprafață teren"}</div>
                  <div className="font-mono text-slate-200">{ancpiData.suprafata_teren_m2} m²</div>
                </div>
                <div className="bg-slate-900/40 rounded px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-500">UAT</div>
                  <div className="text-slate-200">{ancpiData.uat}</div>
                </div>
              </div>
              <div className="text-[11px] text-slate-300 bg-slate-900/40 rounded px-2.5 py-1.5">
                <span className="text-slate-500">{lang === "EN" ? "Legal regime: " : "Regim juridic: "}</span>
                {ancpiData.regim_juridic}
              </div>
              {ancpiData.notă && (
                <div className="text-[10px] text-slate-500 italic pt-1 border-t border-white/5">
                  ℹ {ancpiData.notă}
                </div>
              )}
            </div>
          )}

          {ancpiData?.error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-300">
              ✗ {lang === "EN" ? "Error: " : "Eroare: "}{ancpiData.error}
            </div>
          )}

          {/* Footer */}
          <div className="text-[10px] text-slate-500 italic">
            {lang === "EN"
              ? "Map data © OpenStreetMap contributors. ANCPI verification is currently simulated."
              : "Date hartă © contribuitori OpenStreetMap. Verificarea ANCPI este momentan simulată."}
          </div>
        </div>
      )}
    </div>
  );
}
