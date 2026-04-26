/**
 * BACSSelectorSimple.jsx — v6.0 (25 apr 2026)
 *
 * Selector simplu BACS A-D pentru pachetul Pro 499 RON.
 * Versiune EPBD-conformă (obligatoriu Legea 238/2024 + EPBD 2024).
 *
 * Pentru calculator detaliat 200 factori → BACSCalculatorDetailed în Step 8 (Expert+).
 *
 * SR EN ISO 52120-1:2022 — Building Automation, Controls and building Management
 * Factori f_BAC: A=0.80 · B=0.93 · C=1.00 (referință) · D=1.10
 */

import React from "react";
import { Card, Select, Badge, ResultRow } from "./ui.jsx";

const BACS_CLASSES = {
  A: { label: "Clasa A — Înaltă energetic",      factor: 0.80, color: "green",  hex: "#10B981", desc: "Sisteme automate avansate · BMS integrat · optimizare AI" },
  B: { label: "Clasa B — Avansată",              factor: 0.93, color: "blue",   hex: "#3B82F6", desc: "Control zonal automat · senzori prezență/CO₂" },
  C: { label: "Clasa C — Standard (referință)",  factor: 1.00, color: "amber",  hex: "#F59E0B", desc: "Termostate digitale · timer programabil" },
  D: { label: "Clasa D — Non-energetic",         factor: 1.10, color: "red",    hex: "#EF4444", desc: "Control manual · fără automatizare" },
};

export default function BACSSelectorSimple({ value, onChange, epBase, lang = "RO" }) {
  const selected = BACS_CLASSES[value] || BACS_CLASSES.C;
  const epAdjusted = epBase ? (epBase * selected.factor) : null;
  const savings = epBase && value === "A" ? (epBase * 0.20) : 0;

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "16px" }}>
          🤖 BACS — Building Automation (EPBD obligatoriu)
        </h3>
        <Badge color={selected.color}>{value || "C"}</Badge>
      </div>

      <p style={{ fontSize: "13px", opacity: 0.75, marginTop: 0, marginBottom: "12px" }}>
        Conform SR EN ISO 52120-1:2022 + L.238/2024 art. 14. Pentru calculator detaliat
        cu 200 factori personalizabili → upgrade la <strong>Zephren Expert</strong>.
      </p>

      <Select
        label="Clasa BACS"
        value={value || "C"}
        onChange={(e) => onChange?.(e.target.value)}
        options={Object.entries(BACS_CLASSES).map(([k, v]) => ({
          value: k,
          label: v.label,
        }))}
      />

      <div style={{
        marginTop: "12px",
        padding: "12px",
        background: `${selected.hex}15`,
        borderLeft: `3px solid ${selected.hex}`,
        borderRadius: "6px",
        fontSize: "13px",
      }}>
        <strong style={{ color: selected.hex }}>{selected.label}</strong>
        <div style={{ opacity: 0.85, marginTop: "4px" }}>{selected.desc}</div>
        <div style={{ marginTop: "8px", fontSize: "12px" }}>
          Factor f_BAC = <strong>{selected.factor.toFixed(2)}</strong>
        </div>
      </div>

      {epAdjusted !== null && (
        <div style={{ marginTop: "12px" }}>
          <ResultRow label="EP ajustat cu BACS" value={`${epAdjusted.toFixed(1)} kWh/(m²·an)`} />
          {savings > 0 && (
            <ResultRow label="Economie vs. clasa C" value={`${savings.toFixed(1)} kWh/(m²·an) (-20%)`} />
          )}
        </div>
      )}

      {/* Sprint 27 P2.15 — NIS2 cybersecurity warning pentru BACS clasa A */}
      {value === "A" && (
        <div style={{
          marginTop: "12px",
          padding: "10px 12px",
          background: "#FCD34D15",
          borderLeft: "3px solid #F59E0B",
          borderRadius: "6px",
          fontSize: "11px",
          lineHeight: 1.5,
          color: "#FCD34D",
        }}>
          <strong style={{ color: "#FBBF24" }}>🔐 NIS2 — risc cybersecurity</strong>
          <div style={{ opacity: 0.9, marginTop: "4px", color: "rgba(252, 211, 77, 0.9)" }}>
            Clasa A include sisteme cu conexiune cloud → expunere atacuri OT/IT.
            Conform <strong>Directiva UE 2022/2555 (NIS2)</strong> + transpunere RO 2026,
            clădirile cu BACS clasa A sunt obligate să implementeze măsuri minime
            de securitate IT (MFA, audit log, segmentare rețea OT/IT, plan IRP).
            Verificați conformitate cu furnizorul BMS înainte de instalare.
          </div>
        </div>
      )}
    </Card>
  );
}

export { BACS_CLASSES };
