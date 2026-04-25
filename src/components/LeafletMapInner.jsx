/**
 * LeafletMapInner — Hartă Leaflet propriu-zisă (Sprint D Task 5)
 *
 * Component separat pentru a permite lazy import (~150 KB Leaflet bundle).
 * Folosește react-leaflet 4.x compatibil cu React 18.
 */
import { MapContainer, TileLayer, CircleMarker, Polygon, Tooltip, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function LeafletMapInner({ lat, lon, radius, neighbors, getHeightColor, shadingResults }) {
  return (
    <div className="h-72 relative" style={{ zIndex: 0 }}>
      <MapContainer
        key={`${lat}-${lon}`} // re-init la schimbare coords
        center={[lat, lon]}
        zoom={18}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Cerc pentru raza de căutare */}
        <Circle
          center={[lat, lon]}
          radius={radius}
          pathOptions={{ color: "#6366f1", fillOpacity: 0.05, weight: 1, dashArray: "4 4" }}
        />

        {/* Marker clădire curentă */}
        <CircleMarker
          center={[lat, lon]}
          radius={8}
          pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.8, weight: 2 }}
        >
          <Tooltip permanent direction="top" offset={[0, -8]}>
            <strong>📍 Clădire curentă</strong><br />
            <small>{lat.toFixed(4)}°N, {lon.toFixed(4)}°E</small>
          </Tooltip>
        </CircleMarker>

        {/* Polygon-uri vecini */}
        {(neighbors || []).map((b) => {
          const positions = b.coords.map(c => [c.lat, c.lon]);
          const color = getHeightColor(b.height);
          return (
            <Polygon
              key={b.id}
              positions={positions}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.5,
                weight: 1.5,
              }}
            >
              <Tooltip>
                <strong>{b.name || `Clădire #${b.id}`}</strong><br />
                <small>
                  H = {b.height} m ({b.levels} etaje, {b.heightSource})<br />
                  Distanță: {b.distance} m · Orientare: {b.orientation}
                </small>
              </Tooltip>
            </Polygon>
          );
        })}
      </MapContainer>
    </div>
  );
}
