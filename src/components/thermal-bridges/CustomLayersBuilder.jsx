/**
 * CustomLayersBuilder — builder pentru stratigrafii personalizate.
 *
 * Permite utilizatorului să construiască o stratigrafie cu straturi exterior→interior,
 * alegând materialele din biblioteca MATERIAL_LIBRARY (C107/3 Anexa E + EN ISO 12524)
 * sau introducând λ manual. Calculează automat R per strat + U total conform
 * SR EN ISO 6946:2017 (cu Rsi+Rse per orientare).
 *
 * Persistență: localStorage key "zephren-custom-layers" — stratigrafiile salvate
 * apar în istoric la reîncărcarea paginii.
 *
 * Props:
 *   - orientation : "perete_vertical" | "planseu_ascendent_vertical" | ... (default perete)
 *   - onChange(layers, U) : callback la fiecare modificare
 *   - initialLayers : array strat de pornire (optional)
 */

import { useState, useMemo, useEffect } from "react";
import {
  MATERIAL_LIBRARY,
  getMaterialsByGroup,
  findMaterial,
  airGapResistance,
  calcRFromLayers,
} from "../../calc/thermal-bridges-layers.js";

const STORAGE_KEY = "zephren-custom-layers-v1";

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 10); // max 10 salvate
  } catch {
    return [];
  }
}

function persistSaved(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    // localStorage quota — ignoră
  }
}

function makeEmptyLayer() {
  return { material: "", d_mm: 100, lambda: 0.040, R_override: null, _id: Math.random().toString(36).slice(2, 10) };
}

export default function CustomLayersBuilder({ orientation = "perete_vertical", onChange, initialLayers }) {
  const [layers, setLayers] = useState(() =>
    initialLayers && initialLayers.length
      ? initialLayers.map(l => ({ ...l, _id: l._id || Math.random().toString(36).slice(2, 10) }))
      : [makeEmptyLayer()]
  );
  const [saved, setSaved] = useState(() => loadSaved());
  const [saveName, setSaveName] = useState("");

  const materialsByGroup = useMemo(() => getMaterialsByGroup(), []);

  // Calcul R total + U
  const { R_total, U } = useMemo(() => {
    const R = calcRFromLayers(layers, orientation);
    return { R_total: R, U: R > 0 ? Math.round((1 / R) * 1000) / 1000 : 0 };
  }, [layers, orientation]);

  // Notify parent on any change
  useEffect(() => {
    onChange?.(layers, U);
  }, [layers, U, onChange]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const updateLayer = (id, changes) =>
    setLayers(prev => prev.map(l => (l._id === id ? { ...l, ...changes } : l)));

  const removeLayer = (id) =>
    setLayers(prev => prev.length > 1 ? prev.filter(l => l._id !== id) : prev);

  const addLayerAt = (index) => {
    setLayers(prev => {
      const next = [...prev];
      next.splice(index + 1, 0, makeEmptyLayer());
      return next;
    });
  };

  const moveLayer = (id, direction) => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l._id === id);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const applyMaterial = (id, materialName) => {
    if (materialName === "__air__") {
      // Strat de aer neventilat — calcul R din tabelul 2 ISO 6946
      updateLayer(id, { material: "Spațiu aer neventilat", lambda: null, R_override: airGapResistance(30, "horizontal") });
      return;
    }
    const m = findMaterial(materialName);
    if (m) updateLayer(id, { material: m.name, lambda: m.lambda, R_override: null });
  };

  const saveCurrent = () => {
    if (!saveName.trim()) return;
    const snapshot = {
      name: saveName.trim(),
      saved_at: new Date().toISOString(),
      orientation,
      layers: layers.map(({ _id, ...rest }) => rest),
    };
    const next = [snapshot, ...saved.filter(s => s.name !== snapshot.name)].slice(0, 10);
    setSaved(next);
    persistSaved(next);
    setSaveName("");
  };

  const loadSavedOne = (snapshot) => {
    setLayers(snapshot.layers.map(l => ({ ...l, _id: Math.random().toString(36).slice(2, 10) })));
  };

  const deleteSaved = (name) => {
    const next = saved.filter(s => s.name !== name);
    setSaved(next);
    persistSaved(next);
  };

  const resetAll = () => setLayers([makeEmptyLayer()]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 8 }} onClick={e => e.stopPropagation()}>
      <div style={{ opacity: 0.7, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 600 }}>🏗️ Stratigrafie personalizată (EXT → INT)</span>
        <span style={{ fontSize: 9, opacity: 0.5 }}>SR EN ISO 6946:2017</span>
      </div>

      {/* ── Header tabel ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 72px 72px 72px 28px", gap: 4, fontSize: 9, opacity: 0.5, padding: "0 2px" }}>
        <div>#</div>
        <div>Material</div>
        <div style={{ textAlign: "right" }}>d [mm]</div>
        <div style={{ textAlign: "right" }}>λ [W/mK]</div>
        <div style={{ textAlign: "right" }}>R [m²K/W]</div>
        <div></div>
      </div>

      {/* ── Straturi ─────────────────────────────────────────────────────── */}
      {layers.map((layer, idx) => {
        const isAir = layer.R_override != null && layer.material.toLowerCase().includes("aer");
        const d = Number(layer.d_mm) || 0;
        const lam = Number(layer.lambda) || 0;
        const R = isAir ? layer.R_override : (d > 0 && lam > 0 ? Math.round((d / 1000 / lam) * 1000) / 1000 : 0);
        return (
          <div key={layer._id} style={{ display: "grid", gridTemplateColumns: "28px 1fr 72px 72px 72px 28px", gap: 4, alignItems: "center", padding: "3px 2px", borderRadius: 4, background: idx === 0 ? "rgba(59,130,246,0.05)" : idx === layers.length - 1 ? "rgba(34,197,94,0.05)" : idx % 2 ? "rgba(255,255,255,0.015)" : "transparent", outline: idx === 0 ? "1px solid rgba(59,130,246,0.22)" : idx === layers.length - 1 ? "1px solid rgba(34,197,94,0.22)" : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "center" }}>
              <button
                onClick={() => moveLayer(layer._id, "up")}
                disabled={idx === 0}
                aria-label="Mută sus"
                style={{ fontSize: 8, padding: "0 3px", lineHeight: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, color: idx === 0 ? "#555" : "#9ca3af", cursor: idx === 0 ? "default" : "pointer" }}
              >▲</button>
              <button
                onClick={() => moveLayer(layer._id, "down")}
                disabled={idx === layers.length - 1}
                aria-label="Mută jos"
                style={{ fontSize: 8, padding: "0 3px", lineHeight: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, color: idx === layers.length - 1 ? "#555" : "#9ca3af", cursor: idx === layers.length - 1 ? "default" : "pointer" }}
              >▼</button>
              {idx === 0 && (
                <span style={{ fontSize: 6.5, fontWeight: 700, color: "#60a5fa", lineHeight: 1, marginTop: 2, letterSpacing: 0.3 }}>EXT</span>
              )}
              {idx === layers.length - 1 && layers.length > 1 && (
                <span style={{ fontSize: 6.5, fontWeight: 700, color: "#4ade80", lineHeight: 1, marginTop: 2, letterSpacing: 0.3 }}>INT</span>
              )}
            </div>

            <select
              value={layer.material}
              onChange={e => applyMaterial(layer._id, e.target.value)}
              style={{ padding: "3px 4px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, color: "#e5e7eb", fontSize: 10, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
            >
              <option value="">— alege material sau scrie λ manual —</option>
              <option value="__air__">Spațiu aer neventilat (R tabelar ISO 6946)</option>
              {Object.entries(materialsByGroup).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map(m => (
                    <option key={m.name} value={m.name}>{m.name} (λ={m.lambda})</option>
                  ))}
                </optgroup>
              ))}
            </select>

            <input
              type="number"
              min="0"
              step="1"
              value={layer.d_mm ?? ""}
              onChange={e => updateLayer(layer._id, { d_mm: Math.max(0, parseFloat(e.target.value) || 0) })}
              style={{ padding: "3px 4px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, color: "#e5e7eb", fontSize: 10, textAlign: "right", fontFamily: "monospace" }}
              aria-label="Grosime în mm"
            />

            <input
              type="number"
              min="0"
              step="0.001"
              value={isAir ? "" : (layer.lambda ?? "")}
              onChange={e => updateLayer(layer._id, { lambda: parseFloat(e.target.value) || 0, R_override: null })}
              disabled={isAir}
              style={{ padding: "3px 4px", background: isAir ? "rgba(100,100,100,0.05)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, color: isAir ? "#555" : "#e5e7eb", fontSize: 10, textAlign: "right", fontFamily: "monospace" }}
              aria-label="Conductivitate λ"
            />

            <div style={{ padding: "3px 4px", fontSize: 10, textAlign: "right", fontFamily: "monospace", color: R > 0 ? "#a7f3d0" : "#6b7280" }}>
              {R > 0 ? R.toFixed(3) : "—"}
            </div>

            <button
              onClick={() => removeLayer(layer._id)}
              disabled={layers.length === 1}
              aria-label="Elimină strat"
              style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: layers.length === 1 ? "#555" : "#f87171", borderRadius: 3, cursor: layers.length === 1 ? "default" : "pointer", fontSize: 10, padding: "2px 0" }}
            >✕</button>
          </div>
        );
      })}

      {/* ── Buton adăugare strat ─────────────────────────────────────────── */}
      <button
        onClick={() => addLayerAt(layers.length - 1)}
        style={{ padding: "5px 10px", background: "rgba(139,92,246,0.12)", border: "1px dashed rgba(139,92,246,0.35)", borderRadius: 4, color: "#c4b5fd", cursor: "pointer", fontSize: 10, fontWeight: 500 }}
      >
        + Adaugă strat nou
      </button>

      {/* ── Rezumat U + R ─────────────────────────────────────────────────── */}
      <div style={{ marginTop: 2, padding: "6px 10px", background: "rgba(139,92,246,0.08)", borderRadius: 4, display: "flex", alignItems: "center", gap: 12, fontSize: 11 }}>
        <span style={{ opacity: 0.55 }}>R<sub>total</sub>:</span>
        <span style={{ fontWeight: 700, fontFamily: "monospace", color: "#c4b5fd" }}>{R_total.toFixed(3)} m²·K/W</span>
        <span style={{ opacity: 0.3 }}>·</span>
        <span style={{ opacity: 0.55 }}>U:</span>
        <span style={{ fontWeight: 700, fontFamily: "monospace", color: U <= 0.18 ? "#4ade80" : U <= 0.30 ? "#fbbf24" : "#f87171" }}>
          {U.toFixed(3)} W/(m²·K)
        </span>
        <span style={{ fontSize: 9, opacity: 0.5, marginLeft: "auto" }}>
          {U <= 0.18 ? "✓ nZEB" : U <= 0.30 ? "⚠ C107/Mc 001 renovare" : "✗ peste U_max"}
        </span>
      </div>

      {/* ── Salvare / încărcare ──────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
        <input
          type="text"
          value={saveName}
          onChange={e => setSaveName(e.target.value)}
          placeholder="Nume stratigrafie pentru salvare…"
          style={{ flex: 1, padding: "4px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, color: "#e5e7eb", fontSize: 10 }}
          aria-label="Nume pentru salvare stratigrafie"
        />
        <button
          onClick={saveCurrent}
          disabled={!saveName.trim()}
          style={{ padding: "4px 10px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 3, color: saveName.trim() ? "#86efac" : "#555", cursor: saveName.trim() ? "pointer" : "default", fontSize: 10, fontWeight: 500 }}
        >💾 Salvează</button>
        <button
          onClick={resetAll}
          style={{ padding: "4px 10px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 3, color: "#fca5a5", cursor: "pointer", fontSize: 10 }}
        >↺ Reset</button>
      </div>

      {/* ── Lista salvate ────────────────────────────────────────────────── */}
      {saved.length > 0 && (
        <div style={{ marginTop: 4, padding: 6, background: "rgba(255,255,255,0.02)", borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: 9, opacity: 0.55, marginBottom: 4 }}>📋 Stratigrafii salvate (localStorage):</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {saved.map(s => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 6px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, fontSize: 9 }}>
                <button
                  onClick={() => loadSavedOne(s)}
                  style={{ background: "transparent", border: "none", color: "#c4b5fd", cursor: "pointer", padding: 0, fontSize: 9 }}
                  title={`Încarcă "${s.name}" — ${s.layers.length} straturi`}
                >{s.name}</button>
                <button
                  onClick={() => deleteSaved(s.name)}
                  style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: 0, fontSize: 9 }}
                  title="Șterge"
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
