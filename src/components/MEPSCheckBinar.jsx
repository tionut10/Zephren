/**
 * MEPSCheckBinar.jsx — v6.0 (25 apr 2026)
 *
 * Verificare binară MEPS (Minimum Energy Performance Standards) EPBD 2024.
 * Pentru pachetul Pro 499 RON — versiune EPBD-conformă obligatorie.
 *
 * Pentru optimizator + roadmap 2050 → MEPSCheck (detaliat) în Step 8 (Expert+).
 *
 * EPBD 2024 art. 9 — Praguri 2030/2033 pentru clădiri existente:
 *   • 2030: clasele G și F → trebuie reabilitare la cel puțin clasa E
 *   • 2033: clasele E → trebuie reabilitare la cel puțin clasa D
 */

import React from "react";
import { Card, Badge } from "./ui.jsx";

const MEPS_THRESHOLDS_2030 = {
  REZ:  { mustBeBelow: "F", description: "Rezidențial — clasele G/F obligatoriu reabilitate până 2030" },
  NREZ: { mustBeBelow: "E", description: "Non-rezidențial — clasele G/F/E obligatoriu reabilitate până 2030" },
};

const ENERGY_CLASS_RANK = { "A+": 1, "A": 2, "B": 3, "C": 4, "D": 5, "E": 6, "F": 7, "G": 8 };

export default function MEPSCheckBinar({ energyClass, buildingCategory }) {
  const isResidential = ["RI", "RC", "RA"].includes(buildingCategory);
  const ruleSet = isResidential ? MEPS_THRESHOLDS_2030.REZ : MEPS_THRESHOLDS_2030.NREZ;

  const currentRank = ENERGY_CLASS_RANK[energyClass] || 8;
  const thresholdRank = ENERGY_CLASS_RANK[ruleSet.mustBeBelow] || 7;
  const isConform = currentRank <= thresholdRank;

  const yearDeadline = isConform ? null : 2030;
  const targetClass = isResidential ? "E" : "D";

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "16px" }}>
          🏛️ MEPS EPBD 2024 — Verificare 2030
        </h3>
        <Badge color={isConform ? "green" : "red"}>
          {isConform ? "✓ CONFORM" : "✗ NECONFORM"}
        </Badge>
      </div>

      <p style={{ fontSize: "13px", opacity: 0.75, marginTop: 0, marginBottom: "12px" }}>
        Verificare binară EPBD 2024 art. 9. Pentru roadmap optimizator 2030/2033/2050
        + LCC → upgrade la <strong>Zephren Expert</strong>.
      </p>

      <div style={{
        padding: "16px",
        background: isConform ? "#10B98115" : "#EF444415",
        borderLeft: `3px solid ${isConform ? "#10B981" : "#EF4444"}`,
        borderRadius: "6px",
      }}>
        <div style={{ fontSize: "14px", fontWeight: 600 }}>
          Clasa actuală: <span style={{ color: isConform ? "#10B981" : "#EF4444" }}>
            {energyClass || "—"}
          </span>
        </div>
        <div style={{ marginTop: "8px", fontSize: "13px", opacity: 0.85 }}>
          {ruleSet.description}
        </div>
        {!isConform && (
          <div style={{ marginTop: "12px", fontSize: "13px", color: "#EF4444" }}>
            ⚠️ <strong>Termen 2030</strong>: clădirea trebuie reabilitată la minimum clasa{" "}
            <strong>{targetClass}</strong> sau mai bună.
          </div>
        )}
        {isConform && (
          <div style={{ marginTop: "12px", fontSize: "13px", color: "#10B981" }}>
            ✓ Clădirea respectă pragurile MEPS 2030. Verificați și pragurile 2033 / 2050
            în <strong>Zephren Expert</strong>.
          </div>
        )}
      </div>
    </Card>
  );
}
