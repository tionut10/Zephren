/**
 * BuildingMapAdvanced — Hartă Leaflet + clădiri vecine + shading (Sprint D Task 5)
 *
 * Înlocuiește varianta iframe OSM (BuildingMap.jsx) cu o hartă Leaflet
 * interactivă care afișează:
 *   • Marker clădire curentă (cerc roșu)
 *   • Polygon-uri clădiri vecine (Overpass API) colorate după înălțime
 *   • Buton „Calculează umbrire" → apelează calcBuildingShading din
 *     shading-dynamic.js per fiecare clădire vecină dominantă pe direcție
 *
 * Leaflet + react-leaflet sunt încărcate dinamic pentru a NU bloca
 * primul render al Step 1 (~150 KB).
 */
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { cn } from "./ui.jsx";
import { fetchNearbyBuildings, computeShadingFromBuildings } from "../calc/overpass-buildings.js";
import { calcBuildingShading } from "../calc/shading-dynamic.js";

// Lazy import pentru Leaflet (evită impactul pe initial bundle)
const LeafletMapInner = lazy(() => import("./LeafletMapInner.jsx"));

const HEIGHT_COLORS = [
  { max: 6,   color: "#22c55e", label: "≤ 6 m (P)" },
  { max: 12,  color: "#84cc16", label: "≤ 12 m (P+1-2)" },
  { max: 25,  color: "#eab308", label: "≤ 25 m (P+3-7)" },
  { max: 50,  color: "#f97316", label: "≤ 50 m (P+8-15)" },
  { max: 999, color: "#ef4444", label: "> 50 m" },
];

function getHeightColor(h) {
  return HEIGHT_COLORS.find(c => h <= c.max)?.color || "#6b7280";
}

export default function BuildingMapAdvanced({ lat, lon, address, building, lang = "RO" }) {
  const [neighbors, setNeighbors] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [radius, setRadius] = useState(80);
  const [shadingResults, setShadingResults] = useState(null);

  const hasCoords = lat != null && lon != null && !isNaN(lat) && !isNaN(lon);

  const fetchBuildings = useCallback(async () => {
    if (!hasCoords) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchNearbyBuildings(lat, lon, radius);
      setNeighbors(result);
    } catch (e) {
      setError((lang === "EN" ? "Overpass error: " : "Eroare Overpass: ") + e.message);
    } finally {
      setLoading(false);
    }
  }, [lat, lon, radius, hasCoords, lang]);

  // Înălțimea estimată a clădirii curente
  const currentHeight = useMemo(() => {
    const h = parseFloat(building?.heightBuilding) || parseFloat(building?.heightFloor) * (building?.floors || 1) || 10;
    return Math.max(3, h);
  }, [building]);

  const computeShading = useCallback(() => {
    if (!neighbors || !neighbors.buildings.length) return;
    const results = computeShadingFromBuildings(
      { lat, lon, height: currentHeight },
      neighbors.buildings,
      calcBuildingShading
    );
    setShadingResults(results);
  }, [neighbors, lat, lon, currentHeight]);

  if (!hasCoords) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
        🗺️ {lang === "EN"
          ? "Map will appear after selecting a locality with valid GPS coordinates."
          : "Harta va apărea după selectarea unei localități cu coordonate GPS valide."}
      </div>
    );
  }

  // Statistici clădiri vecine
  const stats = useMemo(() => {
    if (!neighbors?.buildings.length) return null;
    const heights = neighbors.buildings.map(b => b.height);
    const mean = heights.reduce((s, h) => s + h, 0) / heights.length;
    const max = Math.max(...heights);
    const closest = neighbors.buildings[0]; // sortat după distanță
    return {
      count: neighbors.buildings.length,
      meanHeight: mean.toFixed(1),
      maxHeight: max.toFixed(1),
      closestDist: closest.distance,
      closestHeight: closest.height,
    };
  }, [neighbors]);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-base">🗺️</span>
          <span className="text-sm font-semibold text-white">
            {lang === "EN" ? "Building location + neighbors (shading)" : "Locație clădire + vecini (shading)"}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
          </span>
        </div>
      </div>

      {/* Hartă Leaflet (lazy) */}
      <Suspense fallback={
        <div className="h-72 flex items-center justify-center text-slate-500 text-xs">
          {lang === "EN" ? "Loading map..." : "Se încarcă harta..."}
        </div>
      }>
        <LeafletMapInner
          lat={lat}
          lon={lon}
          radius={radius}
          neighbors={neighbors?.buildings || []}
          getHeightColor={getHeightColor}
          shadingResults={shadingResults}
        />
      </Suspense>

      {/* Controale */}
      <div className="px-3 py-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-[10px] text-slate-400">
            {lang === "EN" ? "Search radius:" : "Rază căutare:"}
          </label>
          <input
            type="range"
            min="20" max="200" step="10"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            aria-label={`${lang === "EN" ? "Radius" : "Rază"}: ${radius} m`}
            className="flex-1 max-w-32 accent-indigo-500"
          />
          <span className="text-xs font-mono text-slate-300">{radius} m</span>
          <button
            onClick={fetchBuildings}
            disabled={loading}
            className={cn("px-3 py-1 rounded text-xs font-medium transition-colors",
              loading ? "bg-slate-700 text-slate-400 cursor-wait" :
              "bg-indigo-600 hover:bg-indigo-500 text-white"
            )}>
            {loading
              ? <><span className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1" />OSM…</>
              : (lang === "EN" ? "🔄 Fetch buildings" : "🔄 Încarcă vecini")}
          </button>
        </div>

        {error && (
          <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
            ✗ {error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Stat label={lang === "EN" ? "Neighbors" : "Vecini"} value={stats.count} />
            <Stat label={lang === "EN" ? "Mean H" : "H mediu"} value={stats.meanHeight + " m"} />
            <Stat label={lang === "EN" ? "Max H" : "H max"} value={stats.maxHeight + " m"} />
            <Stat label={lang === "EN" ? "Closest" : "Cel mai apropiat"} value={stats.closestDist + " m"} />
          </div>
        )}

        {/* Legendă înălțime */}
        {neighbors?.buildings.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            {HEIGHT_COLORS.map((c, i) => (
              <div key={i} className="flex items-center gap-1 bg-slate-900/40 rounded px-1.5 py-0.5">
                <span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: c.color }} />
                <span className="text-slate-400">{c.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Buton calcul shading */}
        {neighbors?.buildings.length > 0 && !shadingResults && (
          <button
            onClick={computeShading}
            className="w-full px-3 py-2 rounded bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-200 text-xs font-medium">
            🌒 {lang === "EN" ? "Compute shading per orientation" : "Calculează umbrire per orientare"}
          </button>
        )}

        {/* Rezultate shading */}
        {shadingResults && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              🌒 {lang === "EN" ? "Shading factors per orientation" : "Factori de umbrire per orientare"}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(shadingResults).map(([ori, res]) => {
                const sf = res.shadingFactor || 0;
                const hasN = res.hasNeighbor;
                const sevColor = sf > 0.40 ? "#ef4444" : sf > 0.20 ? "#f97316" : sf > 0.05 ? "#eab308" : "#22c55e";
                return (
                  <div key={ori} className="bg-slate-900/40 rounded p-2 text-center">
                    <div className="text-[10px] text-slate-500">{ori}</div>
                    <div className="text-base font-bold font-mono" style={{ color: sevColor }}>
                      {hasN ? (sf * 100).toFixed(0) + "%" : "—"}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {hasN
                        ? `H=${res.neighbor.height}m d=${res.neighbor.distance}m`
                        : (lang === "EN" ? "no neighbor" : "fără vecin")}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-slate-500">
              {lang === "EN"
                ? "% reduction of solar gains per facade. Source: SR EN ISO 52010-1:2017/NA:2023 + EN 13363-1:2003."
                : "% reducere câștiguri solare per fațadă. Sursă: SR EN ISO 52010-1:2017/NA:2023 + EN 13363-1:2003."}
            </div>
            <button
              onClick={() => setShadingResults(null)}
              className="text-[10px] text-slate-500 hover:text-slate-300 underline">
              {lang === "EN" ? "Clear" : "Resetează"}
            </button>
          </div>
        )}

        <div className="text-[10px] text-slate-500 italic">
          {lang === "EN"
            ? "Map data © OpenStreetMap contributors. Buildings via Overpass API. Heights estimated from `building:levels` tag (3 m/level) when `height` is missing."
            : "Date hartă © contribuitori OpenStreetMap. Clădiri via Overpass API. Înălțimi estimate din tag-ul `building:levels` (3 m/etaj) când `height` lipsește."}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-slate-900/40 rounded p-2 text-center">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-sm font-bold font-mono text-white">{value}</div>
    </div>
  );
}
