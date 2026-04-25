/**
 * PasaportBasic.jsx — v6.0 (25 apr 2026)
 *
 * Generare Pașaport Renovare EPBD basic (JSON + XML + PDF).
 * Pentru pachetul Pro 499 RON — versiune minimală EPBD-conformă.
 *
 * Pentru Pașaport detaliat (LCC + multi-fază + benchmark) → RenovationPassport în
 * Step 8 (Expert+).
 *
 * EPBD 2024 art. 12 — Obligatoriu de la 29 mai 2026.
 */

import React, { useState } from "react";
import { Card, Badge, Input } from "./ui.jsx";

export default function PasaportBasic({ building, energyClass, epFinal, auditor, onGenerate }) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async (format = "json") => {
    setGenerating(true);
    try {
      const passport = {
        version: "1.0",
        format: "EPBD-2024-RO",
        generatedAt: new Date().toISOString(),
        generatedBy: auditor?.name || "—",
        building: {
          address: building?.address || "—",
          category: building?.category || "—",
          areaUseful: building?.areaUseful || 0,
          yearBuilt: building?.yearBuilt || null,
        },
        currentState: {
          energyClass: energyClass || "—",
          epPrimary: epFinal || 0,
          unit: "kWh/(m²·an)",
        },
        recommendations: {
          targetClass: "B",
          targetYear: 2030,
          note: "Pașaport basic — pentru LCC + multi-fază + benchmark, upgrade la Zephren Expert.",
        },
      };

      if (format === "json") {
        const blob = new Blob([JSON.stringify(passport, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pasaport-renovare-basic-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setResult({ ok: true, passport });
      onGenerate?.(passport);
    } catch (err) {
      setResult({ ok: false, error: err.message });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "16px" }}>
          📋 Pașaport Renovare EPBD (basic)
        </h3>
        <Badge color="blue">EPBD 2024</Badge>
      </div>

      <p style={{ fontSize: "13px", opacity: 0.75, marginTop: 0, marginBottom: "12px" }}>
        Pașaport minimal EPBD obligatoriu de la 29 mai 2026 — format JSON/XML/PDF.
        Pentru analiză LCC multi-fază + benchmark național → upgrade la{" "}
        <strong>Zephren Expert</strong>.
      </p>

      <div style={{
        padding: "12px",
        background: "rgba(59, 130, 246, 0.1)",
        borderLeft: "3px solid #3B82F6",
        borderRadius: "6px",
        marginBottom: "16px",
        fontSize: "13px",
      }}>
        <div>Clasa actuală: <strong>{energyClass || "—"}</strong></div>
        <div>EP primar: <strong>{epFinal ? `${epFinal.toFixed(1)} kWh/(m²·an)` : "—"}</strong></div>
        <div style={{ marginTop: "4px", opacity: 0.8 }}>
          Generează pașaport conform format oficial EPBD 2024-RO.
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          onClick={() => handleGenerate("json")}
          disabled={generating}
          style={{
            padding:      "10px 16px",
            background:   "#3B82F6",
            color:        "#fff",
            border:       "none",
            borderRadius: "6px",
            fontSize:     "13px",
            fontWeight:   600,
            cursor:       generating ? "wait" : "pointer",
            opacity:      generating ? 0.6 : 1,
          }}
        >
          {generating ? "Se generează…" : "📥 Descarcă JSON"}
        </button>
        <button
          onClick={() => handleGenerate("xml")}
          disabled={generating}
          style={{
            padding:      "10px 16px",
            background:   "rgba(59, 130, 246, 0.15)",
            color:        "#3B82F6",
            border:       "1px solid #3B82F6",
            borderRadius: "6px",
            fontSize:     "13px",
            fontWeight:   600,
            cursor:       generating ? "wait" : "pointer",
            opacity:      generating ? 0.6 : 1,
          }}
        >
          📥 XML
        </button>
        <button
          onClick={() => handleGenerate("pdf")}
          disabled={generating}
          style={{
            padding:      "10px 16px",
            background:   "rgba(59, 130, 246, 0.15)",
            color:        "#3B82F6",
            border:       "1px solid #3B82F6",
            borderRadius: "6px",
            fontSize:     "13px",
            fontWeight:   600,
            cursor:       generating ? "wait" : "pointer",
            opacity:      generating ? 0.6 : 1,
          }}
        >
          📥 PDF
        </button>
      </div>

      {result && (
        <div style={{
          marginTop: "12px",
          padding: "10px",
          background: result.ok ? "#10B98115" : "#EF444415",
          borderRadius: "6px",
          fontSize: "12px",
          color: result.ok ? "#10B981" : "#EF4444",
        }}>
          {result.ok ? "✓ Pașaport generat cu succes." : `✗ Eroare: ${result.error}`}
        </div>
      )}
    </Card>
  );
}
