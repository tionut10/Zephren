/**
 * SRIScoreAuto.jsx — v6.0 (25 apr 2026)
 *
 * Display read-only SRI score calculat automat din configurația clădirii.
 * Pentru pachetul Pro 499 RON — versiune EPBD-conformă.
 *
 * Pentru SRICalculator complet 42 servicii → SRICalculator în Step 8 (Expert+).
 *
 * EPBD 2024 art. 14 + L.238/2024 — SRI obligatoriu pentru CPE
 */

import React, { useMemo } from "react";
import { Card, Badge, ResultRow } from "./ui.jsx";
import { calcSRI } from "../calc/epbd.js";

const SRI_GRADES = [
  { min: 90, label: "A — Inteligență superioară",  color: "green",  hex: "#10B981" },
  { min: 75, label: "B — Inteligență ridicată",    color: "blue",   hex: "#3B82F6" },
  { min: 60, label: "C — Inteligență moderată",    color: "amber",  hex: "#F59E0B" },
  { min: 40, label: "D — Inteligență scăzută",     color: "red",    hex: "#EF4444" },
  { min: 0,  label: "E — Fără inteligență",        color: "purple", hex: "#6B7280" },
];

function getGrade(score) {
  return SRI_GRADES.find(g => score >= g.min) || SRI_GRADES[SRI_GRADES.length - 1];
}

export default function SRIScoreAuto({ building, heating, cooling, ventilation, lighting, acm, photovoltaic }) {
  const sri = useMemo(() => {
    try {
      return calcSRI({
        building, heating, cooling, ventilation, lighting, acm,
        hasPV: photovoltaic?.enabled,
      });
    } catch {
      return { score: 0, breakdown: {} };
    }
  }, [building, heating, cooling, ventilation, lighting, acm, photovoltaic]);

  const score = Math.round(sri.score || 0);
  const grade = getGrade(score);

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "16px" }}>
          🧠 SRI — Smart Readiness Indicator (auto)
        </h3>
        <Badge color={grade.color}>{score} / 100</Badge>
      </div>

      <p style={{ fontSize: "13px", opacity: 0.75, marginTop: 0, marginBottom: "12px" }}>
        Calculat automat din configurația sistemelor (17 servicii). Pentru evaluare
        manuală pe 42 servicii ponderate → upgrade la <strong>Zephren Expert</strong>.
      </p>

      <div style={{
        padding: "16px",
        background: `${grade.hex}15`,
        borderLeft: `3px solid ${grade.hex}`,
        borderRadius: "6px",
      }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: grade.hex }}>
          {grade.label}
        </div>
        <div style={{ marginTop: "8px", fontSize: "12px", opacity: 0.8 }}>
          Conform EPBD 2024 art. 14 + L.238/2024 — transpunere în curs (termen mai 2026).
        </div>
      </div>

      {sri.breakdown && Object.keys(sri.breakdown).length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
            Defalcare per domeniu:
          </div>
          {Object.entries(sri.breakdown).map(([domain, val]) => (
            <ResultRow
              key={domain}
              label={domain}
              value={`${Math.round(val)} pct`}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
