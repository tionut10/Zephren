import { useState, useMemo, useEffect, useRef } from "react";
import THERMAL_BRIDGES_DB from "../data/thermal-bridges.json";
import BridgeIllustration from "./thermal-bridges/bridgeIllustrations.jsx";
import ElementSectionModal from "./sections/ElementSectionModal.jsx";

const SHOW_BRIDGE_ILLUSTRATIONS = false;
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

// ── SVG icon specific per categorie de punte termică ─────────────────────────
function CatIcon({ cat, size = 16 }) {
  const p = { width: size, height: size, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", style: { flexShrink: 0 } };
  switch (cat) {
    case "Joncțiuni pereți":
      // Colț L — două pereți care se întâlnesc
      return <svg {...p}><path d="M3 13V3H13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "Ferestre":
      // Tâmplărie — cadru cu 4 ochiuri
      return <svg {...p}><rect x="2" y="2" width="12" height="12" rx="0.5" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1"/><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1"/></svg>;
    case "Balcoane":
      // Consolă planșeu — ieșire laterală
      return <svg {...p}><rect x="1" y="6" width="6" height="4" fill="currentColor" opacity="0.9"/><rect x="7" y="6" width="6" height="4" fill="currentColor" opacity="0.3"/><rect x="1" y="2" width="2.5" height="12" fill="currentColor" opacity="0.55"/></svg>;
    case "Acoperiș":
      // Triunghi acoperiș simplu cu perete
      return <svg {...p}><polyline points="1,11 8,3 15,11" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="3" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1.5"/></svg>;
    case "Stâlpi/grinzi":
      // Profil I — grindă metalică sau BA
      return <svg {...p}><rect x="2" y="1" width="12" height="2.5" fill="currentColor"/><rect x="6.5" y="3.5" width="3" height="9" fill="currentColor"/><rect x="2" y="12.5" width="12" height="2.5" fill="currentColor"/></svg>;
    case "Instalații":
      // Conductă circulară prin perete
      return <svg {...p}><rect x="1" y="5" width="4" height="6" fill="currentColor" opacity="0.45"/><rect x="11" y="5" width="4" height="6" fill="currentColor" opacity="0.45"/><circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="1.5" fill="currentColor" opacity="0.4"/></svg>;
    case "Fundații și subsol":
      // Fundație T cu sol
      return <svg {...p}><rect x="1" y="9" width="14" height="3" fill="currentColor"/><rect x="5.5" y="4" width="5" height="5" fill="currentColor" opacity="0.7"/><line x1="1" y1="12.5" x2="15" y2="12.5" stroke="currentColor" strokeWidth="1" opacity="0.35"/><line x1="3" y1="14" x2="13" y2="14" stroke="currentColor" strokeWidth="0.8" opacity="0.25"/></svg>;
    case "Structuri din lemn":
      // Cadru din lemn — 4 secțiuni pătrate
      return <svg {...p}><rect x="2" y="2" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="2" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/></svg>;
    case "Structuri prefabricate":
      // Panouri prefabricate cu rosturi verticale
      return <svg {...p}><rect x="1" y="3" width="6" height="10" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="3" width="6" height="10" stroke="currentColor" strokeWidth="1.5"/><path d="M7 6H9M7 8H9M7 10H9" stroke="currentColor" strokeWidth="1.5"/></svg>;
    case "Fațade și ferestre avansate":
      // Grilă curtain wall
      return <svg {...p}><rect x="1" y="1" width="14" height="14" stroke="currentColor" strokeWidth="1.2"/><line x1="6" y1="1" x2="6" y2="15" stroke="currentColor" strokeWidth="0.8"/><line x1="10" y1="1" x2="10" y2="15" stroke="currentColor" strokeWidth="0.8"/><line x1="1" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="0.8"/><line x1="1" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="0.8"/></svg>;
    case "Acoperiș avansat":
      // Acoperiș cu straturi și parapet
      return <svg {...p}><polyline points="1,10 8,3 15,10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M3,10 L3,13 L13,13 L13,10" stroke="currentColor" strokeWidth="1.5"/><line x1="3" y1="11.5" x2="13" y2="11.5" stroke="currentColor" strokeWidth="0.8" opacity="0.55"/></svg>;
    case "Balcoane avansate":
      // Balcon cu ruptor termic (linie întreruptă la mijloc)
      return <svg {...p}><rect x="1" y="6" width="5" height="4" fill="currentColor" opacity="0.9"/><path d="M6,6.5 L6,10.5" stroke="currentColor" strokeWidth="1.8" strokeDasharray="1.5,1"/><rect x="8" y="6" width="7" height="4" fill="currentColor" opacity="0.3"/><rect x="1" y="2" width="2" height="12" fill="currentColor" opacity="0.5"/></svg>;
    case "Sisteme ETICS":
      // Secțiune perete ETICS — 4 straturi vizibile
      return <svg {...p}><rect x="1" y="2" width="3" height="12" fill="currentColor" opacity="0.85"/><rect x="4" y="2" width="5" height="12" fill="currentColor" opacity="0.3"/><rect x="9" y="2" width="2" height="12" fill="currentColor" opacity="0.6"/><rect x="11" y="3" width="4" height="10" stroke="currentColor" strokeWidth="1"/></svg>;
    case "Elemente punctuale (chi)":
      // Punct central cu 4 raze (chi = element punctual)
      return <svg {...p}><circle cx="8" cy="8" r="2.5" fill="currentColor"/><line x1="8" y1="1.5" x2="8" y2="5.5" stroke="currentColor" strokeWidth="1.3"/><line x1="8" y1="10.5" x2="8" y2="14.5" stroke="currentColor" strokeWidth="1.3"/><line x1="1.5" y1="8" x2="5.5" y2="8" stroke="currentColor" strokeWidth="1.3"/><line x1="10.5" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="1.3"/></svg>;
    case "Instalații avansate":
      // Secțiune conductă dreptunghiulară cu interior
      return <svg {...p}><rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2"/><line x1="6" y1="4" x2="6" y2="12" stroke="currentColor" strokeWidth="0.7" opacity="0.45"/><line x1="10" y1="4" x2="10" y2="12" stroke="currentColor" strokeWidth="0.7" opacity="0.45"/></svg>;
    case "Joncțiuni pereți – tipuri speciale":
      // Colț L cu marcaj cerc (special)
      return <svg {...p}><path d="M3 12V4H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="13" cy="4" r="2.5" fill="currentColor" opacity="0.8"/></svg>;
    case "Ferestre și uși – tipuri speciale":
      // Ușă + fereastră combinată
      return <svg {...p}><rect x="2" y="2" width="8" height="13" rx="0.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 5L14 5L14 15L10 15" stroke="currentColor" strokeWidth="1" opacity="0.5"/><circle cx="9.5" cy="8.5" r="0.9" fill="currentColor"/></svg>;
    case "Balcoane și logii – tipuri speciale":
      // Loggie — recesă cu 4 lame
      return <svg {...p}><rect x="1" y="2" width="14" height="3.5" fill="currentColor" opacity="0.6"/><rect x="1" y="10.5" width="14" height="3.5" fill="currentColor" opacity="0.6"/><rect x="1" y="5.5" width="3" height="5" fill="currentColor" opacity="0.6"/><rect x="12" y="5.5" width="3" height="5" fill="currentColor" opacity="0.6"/></svg>;
    case "Acoperiș – tipuri speciale":
      // Acoperiș mansardă — linie frântă
      return <svg {...p}><polyline points="1,13 4,7 8,4 12,7 15,13" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="3" y1="13" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5"/></svg>;
    case "Structuri speciale":
      // Fermă triunghiulară
      return <svg {...p}><rect x="1" y="12" width="14" height="2.5" fill="currentColor"/><polygon points="8,2 1,12 15,12" stroke="currentColor" strokeWidth="1.5" fill="none"/><line x1="8" y1="2" x2="8" y2="12" stroke="currentColor" strokeWidth="1"/></svg>;
    case "Instalații – tipuri speciale":
      // Trei conducte de dimensiuni diferite
      return <svg {...p}><circle cx="5.5" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="11.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.2"/><circle cx="11.5" cy="11" r="2" stroke="currentColor" strokeWidth="1.2"/></svg>;
    case "Joncțiuni speciale":
      // Asterisk 8 brațe — joncțiune complexă
      return <svg {...p}><circle cx="8" cy="8" r="2" fill="currentColor"/><line x1="8" y1="1.5" x2="8" y2="6" stroke="currentColor" strokeWidth="1.4"/><line x1="8" y1="10" x2="8" y2="14.5" stroke="currentColor" strokeWidth="1.4"/><line x1="1.5" y1="8" x2="6" y2="8" stroke="currentColor" strokeWidth="1.4"/><line x1="10" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="1.4"/><line x1="3.3" y1="3.3" x2="6.3" y2="6.3" stroke="currentColor" strokeWidth="1.1"/><line x1="9.7" y1="9.7" x2="12.7" y2="12.7" stroke="currentColor" strokeWidth="1.1"/><line x1="12.7" y1="3.3" x2="9.7" y2="6.3" stroke="currentColor" strokeWidth="1.1"/><line x1="6.3" y1="9.7" x2="3.3" y2="12.7" stroke="currentColor" strokeWidth="1.1"/></svg>;
    case "Reabilitare ETICS":
      // Straturi cu săgeată adăugare
      return <svg {...p}><rect x="1" y="4" width="4" height="8" fill="currentColor" opacity="0.8"/><rect x="5" y="4" width="4" height="8" fill="currentColor" opacity="0.35"/><rect x="9" y="4" width="2" height="8" fill="currentColor" opacity="0.6"/><path d="M12 6L15 8L12 10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;
    case "Pasivhaus / nZEB":
      // Casă cu simbol + (plus → nZEB)
      return <svg {...p}><polyline points="1,9 8,2 15,9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><rect x="3.5" y="9" width="9" height="6" stroke="currentColor" strokeWidth="1.2"/><line x1="8" y1="10.5" x2="8" y2="13.5" stroke="currentColor" strokeWidth="1.5"/><line x1="6.5" y1="12" x2="9.5" y2="12" stroke="currentColor" strokeWidth="1.5"/></svg>;
    case "CLT / Lemn masiv":
      // Straturi lemn încrucișat CLT
      return <svg {...p}><rect x="1" y="2" width="14" height="3" fill="currentColor" opacity="0.85"/><line x1="1" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="0.5"/><rect x="1" y="5" width="14" height="3" fill="currentColor" opacity="0.45"/><line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="0.5"/><rect x="1" y="8" width="14" height="3" fill="currentColor" opacity="0.85"/><line x1="1" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="0.5"/><rect x="1" y="11" width="14" height="3" fill="currentColor" opacity="0.45"/></svg>;
    case "Panou sandwich":
      // Panou sandwich — 2 fețe + miez
      return <svg {...p}><rect x="1" y="3" width="3" height="10" fill="currentColor" opacity="0.9"/><rect x="4" y="3" width="8" height="10" fill="currentColor" opacity="0.2"/><rect x="12" y="3" width="3" height="10" fill="currentColor" opacity="0.9"/><line x1="4" y1="5" x2="12" y2="5" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/><line x1="4" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/><line x1="4" y1="11" x2="12" y2="11" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/></svg>;
    case "Balcoane moderne":
      // Balcon modern cu ruptor termic explicit
      return <svg {...p}><rect x="1" y="6" width="5" height="4" fill="currentColor"/><path d="M6,6.5 L6,10.5" stroke="currentColor" strokeWidth="2" strokeDasharray="1.5,0.8"/><rect x="8" y="6" width="7" height="4" fill="currentColor" opacity="0.35"/><rect x="1" y="2" width="2.5" height="12" fill="currentColor" opacity="0.55"/></svg>;
    case "Fundații moderne":
      // Fundație pe piloți
      return <svg {...p}><rect x="2" y="2" width="12" height="3.5" fill="currentColor" opacity="0.7"/><rect x="4.5" y="5.5" width="2.5" height="7" fill="currentColor" opacity="0.8"/><rect x="9" y="5.5" width="2.5" height="7" fill="currentColor" opacity="0.8"/><path d="M4.5 12.5L4.5 14.5" stroke="currentColor" strokeWidth="1.5"/><path d="M9 12.5L9 14.5" stroke="currentColor" strokeWidth="1.5"/><path d="M11.5 12.5L11.5 14.5" stroke="currentColor" strokeWidth="1.5"/></svg>;
    case "Fațadă cortină":
      // Fațadă cortină — grila verticală accentuată
      return <svg {...p}><rect x="2" y="1" width="12" height="14" stroke="currentColor" strokeWidth="1.2"/><line x1="7" y1="1" x2="7" y2="15" stroke="currentColor" strokeWidth="1.6"/><line x1="11" y1="1" x2="11" y2="15" stroke="currentColor" strokeWidth="0.8"/><line x1="2" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="0.8"/><line x1="2" y1="8.5" x2="14" y2="8.5" stroke="currentColor" strokeWidth="0.8"/><line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="0.8"/></svg>;
    case "Acoperiș complex":
      // Acoperiș cu mai multe straturi vizibile
      return <svg {...p}><polyline points="1,9 8,2 15,9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="2.5" y1="9" x2="13.5" y2="9" stroke="currentColor" strokeWidth="1.5"/><line x1="3.5" y1="10.5" x2="12.5" y2="10.5" stroke="currentColor" strokeWidth="1"/><line x1="4.5" y1="12" x2="11.5" y2="12" stroke="currentColor" strokeWidth="0.8" opacity="0.55"/></svg>;
    case "Tradițional RO":
      // Casă tradițională românească — acoperiș înalt cu ușiță
      return <svg {...p}><polyline points="1,10 8,2 15,10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><rect x="3" y="10" width="10" height="5" stroke="currentColor" strokeWidth="1.2"/><rect x="6.5" y="11.5" width="3" height="3.5" fill="currentColor" opacity="0.5"/></svg>;
    default:
      return <svg {...p}><path d="M2 4h4l2 2h6v8H2V4z" stroke="currentColor" strokeWidth="1.2"/></svg>;
  }
}

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
  const [detailBridge, setDetailBridge] = useState(null);  // bridge pentru modalul mare de detaliu
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
        // Dacă modalul de detaliu e deschis, lasă-l pe el să gestioneze Escape
        if (detailBridge) return;
        if (pickerOpen) setPickerOpen(false);
        else onClose?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen, onClose, detailBridge]);

  const activeCat = categoriesWithCount.find(c => c.cat === selectedCat);

  return (
    <div
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={(e) => {
        // Nu închide catalogul dacă e deschis modalul de detaliu
        if (detailBridge) return;
        onClose?.();
      }}
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
            <CatIcon cat={selectedCat} size={16} />
            <span style={{ flex: 1, textAlign: "left" }}>{selectedCat}</span>
            <span style={{ opacity: 0.5, fontSize: 11 }}>({activeCat?.count || 0})</span>
            <span style={{ fontSize: 10, opacity: 0.6, transition: "transform 0.15s", transform: pickerOpen ? "rotate(180deg)" : "none" }}>▾</span>
          </button>

          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`🔍 Caută în toate cele ${THERMAL_BRIDGES_DB.length} tipuri (nume, categorie, descriere)…`}
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
                      <CatIcon cat={cat} size={14} />
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
                    <div
                      style={{ borderRadius: 8, overflow: "hidden", marginBottom: 12, background: "#f7f3e8", position: "relative", cursor: "zoom-in" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailBridge({
                          bridge,
                          details: details ? { fRsi: details.fRsi_typical, priority: details.repair_priority, isoClass } : { isoClass },
                        });
                      }}
                      title="Click pentru a deschide secțiunea în fereastră mare"
                    >
                      {SHOW_BRIDGE_ILLUSTRATIONS && bridge.illustration !== false && (
                        <BridgeIllustration
                          bridge={bridge}
                          details={details ? { fRsi: details.fRsi_typical, priority: details.repair_priority, isoClass } : { isoClass }}
                          mode="card"
                        />
                      )}
                      <div style={{
                        position: "absolute", top: 6, right: 6, padding: "3px 8px",
                        background: "rgba(15,23,42,0.85)", color: "#fbbf24",
                        fontSize: 10, fontWeight: 700, borderRadius: 5,
                        pointerEvents: "none", letterSpacing: "0.3px"
                      }}>
                        🔍 Click pentru detaliu
                      </div>
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
                          {search && <span style={{ opacity: 0.7, marginRight: 6, display: "inline-flex", alignItems: "center", gap: 4 }}><CatIcon cat={bridge.cat} size={12} /> {bridge.cat} · </span>}
                          {bridge.desc}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {bridge.is_point_bridge ? (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 700, color: color.fg }}>χ = {bridge.chi ?? 0}</div>
                            <div style={{ fontSize: 9, opacity: 0.3 }}>W/K · punctual</div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 700, color: color.fg }}>Ψ = {bridge.psi}</div>
                            <div style={{ fontSize: 9, opacity: 0.3 }}>W/(m·K)</div>
                          </>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.55 }}>{bridge.detail}</div>

                        {/* Comparație baseline pentru ruptoare termice (produs vs consolă fără ruptor) */}
                        {bridge.psi_baseline_no_break !== undefined && (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, marginTop: 10, padding: "6px 10px", background: "rgba(34,197,94,0.06)", borderRadius: 6, flexWrap: "wrap" }}>
                            <span style={{ opacity: 0.5 }}>Fără ruptor:</span>
                            <span style={{ fontWeight: 700, color: "#f87171" }}>{bridge.psi_baseline_no_break}</span>
                            <span style={{ opacity: 0.3 }}>→</span>
                            <span style={{ opacity: 0.5 }}>Cu produs:</span>
                            <span style={{ fontWeight: 700, color: "#4ade80" }}>{bridge.psi}</span>
                            <span style={{ opacity: 0.3 }}>W/(m·K)</span>
                            <span style={{ opacity: 0.5, marginLeft: "auto", fontSize: 10 }}>−{Math.round((1 - bridge.psi / bridge.psi_baseline_no_break) * 100)}%</span>
                          </div>
                        )}
                        {/* Comparație psi-izolat pentru punți cu retrofit posibil */}
                        {bridge.psi_izolat !== undefined && bridge.psi_baseline_no_break === undefined && !bridge.is_point_bridge && (
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
                            {["PE", "PT", "PP", "PL", "PB"].map(cat => {
                              const CAT_LABELS = {
                                PE: "Pereți exteriori",
                                PT: "Planșee terasă",
                                PP: "Planșee pod/șarpantă",
                                PL: "Planșee pe sol",
                                PB: "Planșee peste subsol neîncălzit",
                              };
                              const items = allConstructions.filter(c => c.category === cat);
                              if (!items.length) return null;
                              return (
                                <optgroup key={cat} label={CAT_LABELS[cat]}>
                                  {items.map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.id} · {c.name_ro} (U={c.U_total})
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })}
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

      {/* Modal mare de detaliu pentru punte termică (deasupra catalogului) */}
      {detailBridge && (
        <ElementSectionModal
          type="bridge"
          element={detailBridge.bridge}
          bridgeDetails={detailBridge.details}
          onClose={() => setDetailBridge(null)}
        />
      )}
    </div>
  );
}
