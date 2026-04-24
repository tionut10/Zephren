import { useState, useMemo, useEffect, useRef } from "react";
import THERMAL_BRIDGES_DB from "../data/thermal-bridges.json";
import BridgeIllustration from "./thermal-bridges/bridgeIllustrations.jsx";
import {
  getBridgeSource,
  classifyIsoLevel,
  validatePsiRange,
  getBridgeDetails,
  calcAnnualLossPerMeter,
  classifyCondensationRisk,
  repairPriorityLabel,
} from "../calc/thermal-bridges-metadata.js";
import {
  getAllConstructions,
  getConstructionById,
  adjustPsiForConstruction,
  formatLayersSummary,
  calcRFromLayers,
} from "../calc/thermal-bridges-layers.js";
import CustomLayersBuilder from "./thermal-bridges/CustomLayersBuilder.jsx";

// ── Mapping emoji per categorie ──────────────────────────────────────────────
const CAT_ICONS = {
  "Joncțiuni pereți": "🧱",
  "Ferestre": "🪟",
  "Balcoane": "🏗️",
  "Acoperiș": "🏠",
  "Stâlpi/grinzi": "🔩",
  "Instalații": "⚙️",
  "Fundații și subsol": "🧱",
  "Structuri din lemn": "🪵",
  "Structuri prefabricate": "🏭",
  "Fațade și ferestre avansate": "🏢",
  "Acoperiș avansat": "🏘️",
  "Balcoane avansate": "🏛️",
  "Sisteme ETICS": "🧊",
  "Elemente punctuale (chi)": "📍",
  "Instalații avansate": "🔧",
  "Joncțiuni pereți – tipuri speciale": "🧱",
  "Ferestre și uși – tipuri speciale": "🚪",
  "Balcoane și logii – tipuri speciale": "🏛️",
  "Acoperiș – tipuri speciale": "🏠",
  "Structuri speciale": "🔩",
  "Instalații – tipuri speciale": "⚙️",
  "Joncțiuni speciale": "✨",
};

const ISO_CLASS_COLOR = {
  A: { bg: "rgba(16,185,129,0.15)", fg: "#34d399", border: "rgba(16,185,129,0.35)" },
  B: { bg: "rgba(56,189,248,0.15)", fg: "#7dd3fc", border: "rgba(56,189,248,0.35)" },
  C: { bg: "rgba(251,191,36,0.15)", fg: "#fbbf24", border: "rgba(251,191,36,0.35)" },
  D: { bg: "rgba(248,113,113,0.15)", fg: "#f87171", border: "rgba(248,113,113,0.35)" },
};

// ── Component principal ──────────────────────────────────────────────────────
export default function ThermalBridgeCatalog({ onSelect, onClose }) {
  const [selectedCat, setSelectedCat] = useState("Joncțiuni pereți");
  const [selectedBridge, setSelectedBridge] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedConstruction, setSelectedConstruction] = useState("");
  const [customLayers, setCustomLayers] = useState([]);
  const [customU, setCustomU] = useState(0);

  const allConstructions = useMemo(() => getAllConstructions(), []);

  const categoriesWithCount = useMemo(() => {
    const counts = {};
    THERMAL_BRIDGES_DB.forEach(b => { counts[b.cat] = (counts[b.cat] || 0) + 1; });
    return Object.entries(counts).map(([cat, count]) => ({ cat, count }));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      // Căutare globală peste toate categoriile
      return THERMAL_BRIDGES_DB.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.cat.toLowerCase().includes(q) ||
        (b.desc || "").toLowerCase().includes(q)
      );
    }
    return THERMAL_BRIDGES_DB.filter(b => b.cat === selectedCat);
  }, [search, selectedCat]);

  // Închide picker la Escape sau click afară
  const pickerRef = useRef(null);
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        if (pickerOpen) setPickerOpen(false);
        else onClose?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen, onClose]);

  const activeCat = categoriesWithCount.find(c => c.cat === selectedCat);

  return (
    <div
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#12141f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", width: "100%", maxWidth: "960px", height: "86vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700 }}>Catalog Punți Termice</div>
            <div style={{ fontSize: "11px", opacity: 0.45, marginTop: 2 }}>
              Secțiuni ilustrative — SR EN ISO 14683:2017, Mc 001-2022 · {THERMAL_BRIDGES_DB.length} tipuri
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Închide catalog"
            style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "white", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ✕
          </button>
        </div>

        {/* ── Bar picker + search ────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, position: "relative" }}>
          <button
            onClick={() => setPickerOpen(p => !p)}
            aria-expanded={pickerOpen}
            aria-haspopup="menu"
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 10,
              background: pickerOpen ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.05)",
              border: pickerOpen ? "1px solid rgba(245,158,11,0.45)" : "1px solid rgba(255,255,255,0.1)",
              color: pickerOpen ? "#fbbf24" : "#e5e7eb",
              cursor: "pointer", fontSize: 13, fontWeight: 500, minWidth: 240
            }}
          >
            <span style={{ fontSize: 16 }}>{CAT_ICONS[selectedCat] || "📁"}</span>
            <span style={{ flex: 1, textAlign: "left" }}>{selectedCat}</span>
            <span style={{ opacity: 0.5, fontSize: 11 }}>({activeCat?.count || 0})</span>
            <span style={{ fontSize: 10, opacity: 0.6, transition: "transform 0.15s", transform: pickerOpen ? "rotate(180deg)" : "none" }}>▾</span>
          </button>

          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Caută în toate cele 165 tipuri (nume, categorie, descriere)…"
              aria-label="Caută punți termice"
              style={{
                width: "100%", padding: "9px 12px 9px 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#e5e7eb", fontSize: 12, outline: "none"
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Șterge căutarea"
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)", border: "none", color: "#9ca3af", width: 20, height: 20, borderRadius: 10, cursor: "pointer", fontSize: 10 }}
              >
                ✕
              </button>
            )}
          </div>

          {/* ── Panou dropdown categorii ─────────────────────────────────── */}
          {pickerOpen && (
            <div
              ref={pickerRef}
              role="menu"
              style={{
                position: "absolute", top: "calc(100% + 4px)", left: 20, zIndex: 50,
                width: 620, maxWidth: "calc(100vw - 40px)", maxHeight: "60vh",
                background: "#1a1d2e", border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 12, padding: 8, overflowY: "auto",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 4 }}>
                {categoriesWithCount.map(({ cat, count }) => {
                  const isActive = cat === selectedCat;
                  return (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCat(cat); setSelectedBridge(null); setPickerOpen(false); setSearch(""); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                        borderRadius: 8, border: isActive ? "1px solid rgba(245,158,11,0.4)" : "1px solid transparent",
                        background: isActive ? "rgba(245,158,11,0.12)" : "transparent",
                        color: isActive ? "#fbbf24" : "#e5e7eb",
                        cursor: "pointer", fontSize: 12, textAlign: "left",
                        transition: "background 0.1s"
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 14 }}>{CAT_ICONS[cat] || "📁"}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat}</span>
                      <span style={{ fontSize: 10, opacity: 0.5, fontFamily: "monospace" }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Content — scrollable ───────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "scroll", padding: "20px", WebkitOverflowScrolling: "touch" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", opacity: 0.4 }}>
              Niciun rezultat pentru "{search}".
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "18px", maxWidth: 900, margin: "0 auto" }}>
              {filtered.map((bridge, i) => {
                const isOpen = selectedBridge === i;
                const isoClass = classifyIsoLevel(bridge.psi);
                const color = ISO_CLASS_COLOR[isoClass];
                const source = getBridgeSource(bridge.name);
                const validation = validatePsiRange(bridge.name, bridge.psi);
                const details = getBridgeDetails(bridge.name);
                const condRisk = details ? classifyCondensationRisk(details.fRsi_typical) : null;
                const annualLoss = details ? calcAnnualLossPerMeter(bridge.psi, { factor: details.annual_loss_factor }) : null;
                return (
                  <div
                    key={`${bridge.cat}-${bridge.name}-${i}`}
                    onClick={() => setSelectedBridge(isOpen ? null : i)}
                    style={{
                      borderRadius: 12,
                      border: isOpen ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.06)",
                      padding: 14, cursor: "pointer",
                      background: isOpen ? "rgba(245,158,11,0.05)" : "rgba(255,255,255,0.02)",
                      transition: "background 0.1s, border 0.1s"
                    }}
                  >
                    <div style={{ borderRadius: 8, overflow: "hidden", marginBottom: 12, background: "#f7f3e8" }}>
                      <BridgeIllustration
                        bridge={bridge}
                        details={details ? { fRsi: details.fRsi_typical, priority: details.repair_priority, isoClass } : { isoClass }}
                        mode="card"
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span
                            style={{
                              fontSize: 9, fontFamily: "monospace", padding: "2px 5px", borderRadius: 4,
                              background: color.bg, color: color.fg, border: `1px solid ${color.border}`,
                              flexShrink: 0
                            }}
                            title={`Clasă ISO 14683: ${isoClass}`}
                          >
                            {isoClass}
                          </span>
                          <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {bridge.name}
                          </div>
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.45, marginTop: 2 }}>
                          {search && <span style={{ opacity: 0.7, marginRight: 6 }}>{CAT_ICONS[bridge.cat]} {bridge.cat} · </span>}
                          {bridge.desc}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: color.fg }}>Ψ = {bridge.psi}</div>
                        <div style={{ fontSize: 9, opacity: 0.3 }}>W/(m·K)</div>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.55 }}>{bridge.detail}</div>

                        {bridge.psi_izolat !== undefined && (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, marginTop: 10, padding: "6px 10px", background: "rgba(34,197,94,0.06)", borderRadius: 6 }}>
                            <span style={{ opacity: 0.5 }}>Neizolat:</span>
                            <span style={{ fontWeight: 700, color: "#f87171" }}>{bridge.psi}</span>
                            <span style={{ opacity: 0.3 }}>→</span>
                            <span style={{ opacity: 0.5 }}>Izolat:</span>
                            <span style={{ fontWeight: 700, color: "#4ade80" }}>{bridge.psi_izolat}</span>
                            <span style={{ opacity: 0.3 }}>W/(m·K)</span>
                            <span style={{ color: "#4ade80", fontSize: 10, marginLeft: "auto" }}>
                              −{Math.round((1 - bridge.psi_izolat / bridge.psi) * 100)}%
                            </span>
                          </div>
                        )}

                        <div style={{ fontSize: 10, marginTop: 10, padding: "6px 10px", background: "rgba(59,130,246,0.05)", borderRadius: 6, border: "1px solid rgba(59,130,246,0.1)" }}>
                          <div style={{ opacity: 0.5, marginBottom: 3 }}>📚 Sursă normativă:</div>
                          <div style={{ color: "#93c5fd", lineHeight: 1.4 }}>{source}</div>
                        </div>

                        {/* ── Secțiuni detaliate din template (fRsi, risc, prioritate, remedii) ─── */}
                        {details && (
                          <>
                            {/* Risc condensare + prioritate intervenție */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
                              <div style={{ padding: "6px 10px", background: condRisk === "D" ? "rgba(239,68,68,0.08)" : condRisk === "C" ? "rgba(245,158,11,0.08)" : condRisk === "B" ? "rgba(56,189,248,0.06)" : "rgba(16,185,129,0.06)", border: `1px solid ${condRisk === "D" ? "rgba(239,68,68,0.25)" : condRisk === "C" ? "rgba(245,158,11,0.25)" : condRisk === "B" ? "rgba(56,189,248,0.2)" : "rgba(16,185,129,0.2)"}`, borderRadius: 6, fontSize: 10 }}>
                                <div style={{ opacity: 0.55, fontSize: 9 }}>💧 Risc condensare (ISO 13788)</div>
                                <div style={{ fontWeight: 700, marginTop: 2, color: condRisk === "D" ? "#f87171" : condRisk === "C" ? "#fbbf24" : condRisk === "B" ? "#7dd3fc" : "#4ade80" }}>
                                  Clasă {condRisk} · fRsi ≈ {details.fRsi_typical.toFixed(2)}
                                </div>
                                <div style={{ fontSize: 9, opacity: 0.5, marginTop: 2 }}>
                                  {condRisk === "D" ? "Condensare iarnă frecventă" : condRisk === "C" ? "Risc la HR>60%" : condRisk === "B" ? "Acceptabil la HR<50%" : "Fără risc"}
                                </div>
                              </div>
                              <div style={{ padding: "6px 10px", background: details.repair_priority >= 4 ? "rgba(220,38,38,0.08)" : details.repair_priority >= 3 ? "rgba(249,115,22,0.08)" : "rgba(251,191,36,0.05)", border: `1px solid ${details.repair_priority >= 4 ? "rgba(220,38,38,0.25)" : details.repair_priority >= 3 ? "rgba(249,115,22,0.25)" : "rgba(251,191,36,0.15)"}`, borderRadius: 6, fontSize: 10 }}>
                                <div style={{ opacity: 0.55, fontSize: 9 }}>⚠ Prioritate intervenție</div>
                                <div style={{ fontWeight: 700, marginTop: 2, color: details.repair_priority >= 4 ? "#f87171" : details.repair_priority >= 3 ? "#fb923c" : "#fbbf24" }}>
                                  {repairPriorityLabel(details.repair_priority)}
                                </div>
                              </div>
                            </div>

                            {/* Pierderi anuale estimate */}
                            {annualLoss > 0 && (
                              <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(168,85,247,0.06)", borderRadius: 6, border: "1px solid rgba(168,85,247,0.15)", fontSize: 10, display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ opacity: 0.55, fontSize: 9 }}>🔥 Pierderi estimate:</span>
                                <span style={{ fontWeight: 700, color: "#c084fc", fontFamily: "monospace" }}>
                                  {annualLoss.toFixed(1)} kWh/m·an
                                </span>
                                <span style={{ fontSize: 9, opacity: 0.5, marginLeft: "auto" }}>București DD=3170 K·zi × factor {details.annual_loss_factor}</span>
                              </div>
                            )}

                            {/* Detectare în teren */}
                            {details.detection?.length > 0 && (
                              <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(14,165,233,0.05)", borderRadius: 6, border: "1px solid rgba(14,165,233,0.15)", fontSize: 10 }}>
                                <div style={{ opacity: 0.55, fontSize: 9, marginBottom: 3 }}>🔍 Detectare în teren:</div>
                                <ul style={{ margin: 0, paddingLeft: 16, color: "#7dd3fc", lineHeight: 1.4 }}>
                                  {details.detection.map((d, i) => <li key={i}>{d}</li>)}
                                </ul>
                              </div>
                            )}

                            {/* Consecințe */}
                            {details.consequences?.length > 0 && (
                              <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(244,63,94,0.05)", borderRadius: 6, border: "1px solid rgba(244,63,94,0.15)", fontSize: 10 }}>
                                <div style={{ opacity: 0.55, fontSize: 9, marginBottom: 3 }}>⚡ Consecințe:</div>
                                <ul style={{ margin: 0, paddingLeft: 16, color: "#fca5a5", lineHeight: 1.4 }}>
                                  {details.consequences.map((c, i) => <li key={i}>{c}</li>)}
                                </ul>
                              </div>
                            )}

                            {/* Defecte frecvente */}
                            {details.common_failures?.length > 0 && (
                              <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(251,146,60,0.05)", borderRadius: 6, border: "1px solid rgba(251,146,60,0.15)", fontSize: 10 }}>
                                <div style={{ opacity: 0.55, fontSize: 9, marginBottom: 3 }}>🔧 Defecte frecvente:</div>
                                <ul style={{ margin: 0, paddingLeft: 16, color: "#fdba74", lineHeight: 1.4 }}>
                                  {details.common_failures.map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                              </div>
                            )}

                            {/* Remedii tipice */}
                            {details.typical_remedies?.length > 0 && (
                              <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(34,197,94,0.06)", borderRadius: 6, border: "1px solid rgba(34,197,94,0.2)", fontSize: 10 }}>
                                <div style={{ opacity: 0.55, fontSize: 9, marginBottom: 3 }}>✓ Remedii tipice:</div>
                                <ul style={{ margin: 0, paddingLeft: 16, color: "#86efac", lineHeight: 1.4 }}>
                                  {details.typical_remedies.map((r, i) => <li key={i}>{r}</li>)}
                                </ul>
                              </div>
                            )}
                          </>
                        )}

                        {/* ── Selector stratigrafie + ψ ajustat ─────────── */}
                        <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(139,92,246,0.06)", borderRadius: 6, border: "1px solid rgba(139,92,246,0.18)" }} onClick={e => e.stopPropagation()}>
                          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                            <span>🏗️</span>
                            <span style={{ fontWeight: 600 }}>Tipologie constructivă (straturi) — C107/3 + SR EN ISO 6946</span>
                          </div>
                          <select
                            value={selectedConstruction}
                            onChange={e => { setSelectedConstruction(e.target.value); if (e.target.value !== "__custom__") setCustomLayers([]); }}
                            style={{ width: "100%", padding: "6px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 4, color: "#e5e7eb", fontSize: 11 }}
                          >
                            <option value="">— selectează stratigrafia peretelui/planșeului —</option>
                            <option value="__custom__">✏️ Stratigrafie personalizată (adaugă straturi manual)</option>
                            {["PE", "PT", "PP", "PL"].map(cat => (
                              <optgroup key={cat} label={cat === "PE" ? "Pereți exteriori" : cat === "PT" ? "Planșee terasă" : cat === "PP" ? "Planșee pod/șarpantă" : "Planșee pe sol"}>
                                {allConstructions.filter(c => c.category === cat).map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.id} · {c.name_ro} (U={c.U_total})
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>

                          {selectedConstruction === "__custom__" && (
                            <div style={{ marginTop: 10, padding: 8, background: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                              <CustomLayersBuilder
                                orientation="perete_vertical"
                                onChange={(layers, U) => { setCustomLayers(layers); setCustomU(U); }}
                                initialLayers={customLayers.length > 0 ? customLayers : undefined}
                              />
                              {customLayers.length > 0 && customU > 0 && (
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed rgba(139,92,246,0.2)", fontSize: 10 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                                    <span style={{ opacity: 0.55 }}>ψ tipologie (din catalog):</span>
                                    <span style={{ fontWeight: 700, color: "#a78bfa" }}>{bridge.psi} W/(m·K)</span>
                                    <span style={{ fontSize: 9, opacity: 0.5, marginLeft: "auto" }}>
                                      (fără factor corecție — stratigrafie custom)
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {selectedConstruction && selectedConstruction !== "__custom__" && (() => {
                            const c = getConstructionById(selectedConstruction);
                            if (!c) return null;
                            const adj = adjustPsiForConstruction(bridge, selectedConstruction);
                            const layersSummary = formatLayersSummary(selectedConstruction);
                            return (
                              <div style={{ marginTop: 8, fontSize: 10, lineHeight: 1.5 }}>
                                <div style={{ opacity: 0.6 }}>Straturi (ext → int):</div>
                                <div style={{ color: "#d1d5db", marginTop: 2, fontFamily: "monospace", fontSize: 9 }}>{layersSummary}</div>
                                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                                  <span style={{ opacity: 0.5 }}>U perete:</span>
                                  <span style={{ fontWeight: 700, color: "#c084fc" }}>{c.U_total} W/(m²·K)</span>
                                  <span style={{ opacity: 0.3 }}>·</span>
                                  <span style={{ opacity: 0.5 }}>ψ ajustat:</span>
                                  <span style={{ fontWeight: 700, color: adj.psi_adjusted < adj.psi_base ? "#4ade80" : adj.psi_adjusted > adj.psi_base ? "#f87171" : "#a78bfa" }}>
                                    {adj.psi_adjusted} W/(m·K)
                                  </span>
                                  <span style={{ fontSize: 9, color: adj.factor < 1 ? "#4ade80" : adj.factor > 1 ? "#f87171" : "#9ca3af", marginLeft: "auto" }}>
                                    ×{adj.factor.toFixed(2)} → clasă ISO {adj.iso_class_adjusted}
                                  </span>
                                </div>
                                {c.notes && (
                                  <div style={{ marginTop: 6, fontSize: 9, opacity: 0.55, fontStyle: "italic" }}>
                                    💡 {c.notes}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {validation && (
                          <div style={{ fontSize: 10, marginTop: 6, padding: "4px 10px", background: validation.inRange ? "rgba(34,197,94,0.06)" : "rgba(248,113,113,0.08)", borderRadius: 6, color: validation.inRange ? "#86efac" : "#fca5a5" }}>
                            {validation.inRange ? "✓" : "⚠"} Interval tipologie: ψ ∈ [{validation.min}, {validation.max}] · tipic {validation.typical}
                          </div>
                        )}

                        {onSelect && (
                          <button
                            onClick={e => { e.stopPropagation(); onSelect(bridge); onClose(); }}
                            style={{ marginTop: 12, width: "100%", padding: "9px", borderRadius: 8, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                          >
                            + Adaugă această punte termică
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.5, flexShrink: 0 }}>
          <span>
            {search
              ? `${filtered.length} rezultate pentru „${search}"`
              : `${filtered.length} punți în „${selectedCat}"`}
          </span>
          <span>Total catalog: {THERMAL_BRIDGES_DB.length} tipuri</span>
        </div>
      </div>
    </div>
  );
}
