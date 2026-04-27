/**
 * AuditReport.jsx — Raport Audit Energetic complet
 * Distinct de CPE (Certificat de Performanță Energetică)
 * Include 6 secțiuni + export PDF cu jsPDF
 */

import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import { cn, Card, Badge } from "./ui.jsx";
import {
  Capitol4_Conformitate,
  Capitol7_Concluzii,
  Capitol8_Anexe,
  generateConclusionsText,
} from "./AuditReportChapters.jsx";
import { getMepsStatus } from "./MEPSCheck.jsx";
import { NZEB_THRESHOLDS } from "../data/energy-classes.js";
import {
  setupRomanianFont,
  makeTextWriter,
  buildPdfOutline,
  drawTocPage,
  ROMANIAN_FONT,
} from "../utils/pdf-fonts.js";

// ─── Constante clase energetice ───────────────────────────────────────────────
const CLASS_COLORS = {
  "A+": "#00A550", "A": "#4CB848", "B": "#BDD630",
  "C": "#FFF200", "D": "#FDB913", "E": "#F37021",
  "F": "#ED1C24", "G": "#B31217",
};

// ─── Utilitar calcul U din straturi ──────────────────────────────────────────
function calcU(element) {
  if (!element?.layers || element.layers.length === 0) return 0;
  const rLayers = element.layers.reduce((sum, layer) => {
    const d = parseFloat(layer.thickness) || 0;
    const lambda = parseFloat(layer.lambda) || 1;
    return sum + (d / 1000) / lambda;
  }, 0);
  return 1 / (rLayers + 0.17);
}

// ─── Utilitar parsare costuri din string ─────────────────────────────────────
function parseCostEUR(costStr) {
  if (!costStr) return 0;
  const nums = costStr.match(/\d[\d.]*(?:[\d]+)?/g);
  if (!nums) return 0;
  if (nums.length >= 2) {
    return (parseFloat(nums[0].replace(/\./g, "")) + parseFloat(nums[1].replace(/\./g, ""))) / 2;
  }
  return parseFloat(nums[0].replace(/\./g, "")) || 0;
}

function parseSavingKWh(savingStr) {
  if (!savingStr) return 0;
  const match = savingStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

// ─── Badge prioritate ─────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  if (priority === "HIGH") return <Badge color="red">🔴 Ridicată</Badge>;
  if (priority === "MED")  return <Badge color="amber">🟡 Medie</Badge>;
  return <Badge color="green">🟢 Scăzută</Badge>;
}

// ─── Culoare deviație ─────────────────────────────────────────────────────────
function deviationColor(pct) {
  if (pct < 15) return "text-emerald-400";
  if (pct < 30) return "text-amber-400";
  return "text-red-400";
}

// ─── Component principal ──────────────────────────────────────────────────────
export default function AuditReport({
  building,
  instSummary,
  renewSummary,
  opaqueElements,
  glazingElements,
  thermalBridges,
  energyClass,
  auditor,
  onClose,
}) {
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [docxGenerating, setDocxGenerating] = useState(false);
  // Sprint 16 — Cap. 7 text concluzii (editabil) + Cap. 8 anexe (uploaded files)
  const [conclusionsText, setConclusionsText] = useState("");
  const [attachments, setAttachments] = useState({});

  const showToast = (msg, level) => {
    if (level === "error") console.warn("[AuditReport]", msg);
    else console.log("[AuditReport]", msg);
  };

  const generateDOCX = async () => {
    setDocxGenerating(true);
    try {
      const payload = {
        building, instSummary, renewSummary, auditor,
        opaqueElements, glazingElements, thermalBridges, energyClass,
        measuredConsumption: (() => {
          try { return JSON.parse(localStorage.getItem("zephren_measured_consumption") || "{}"); }
          catch { return {}; }
        })(),
        systems: (() => {
          try { return JSON.parse(localStorage.getItem("zephren_systems") || "{}"); }
          catch { return {}; }
        })(),
      };
      const res = await fetch("/api/generate-document?type=audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("API error " + res.status);
      const { docx, filename } = await res.json();
      const bytes = Uint8Array.from(atob(docx), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = filename || "raport_audit_energetic.docx"; a.click();
    } catch (e) {
      alert("Eroare generare DOCX: " + e.message);
    } finally {
      setDocxGenerating(false);
    }
  };

  // ── Date măsurate din localStorage (salvate de InvoiceOCR) ────────────────
  const measuredRaw = (() => {
    try {
      const raw = localStorage.getItem("zephren_measured_consumption");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  // ── Consum calculat din instSummary ──────────────────────────────────────
  const au = parseFloat(building?.au || building?.usableArea || 0);
  const calcHeating = instSummary?.ep_heating_m2 && au ? Math.round(instSummary.ep_heating_m2 * au) : null;
  const calcCooling = instSummary?.ep_cooling_m2 && au ? Math.round(instSummary.ep_cooling_m2 * au) : null;
  const calcACM     = instSummary?.ep_acm_m2     && au ? Math.round(instSummary.ep_acm_m2     * au) : null;
  const calcLight   = instSummary?.ep_light_m2   && au ? Math.round(instSummary.ep_light_m2   * au) : null;

  const consumptionRows = [
    { label: "Încălzire",  calc: calcHeating, meas: measuredRaw?.heating },
    { label: "Răcire",     calc: calcCooling, meas: measuredRaw?.cooling },
    { label: "ACM",        calc: calcACM,     meas: measuredRaw?.acm     },
    { label: "Iluminat",   calc: calcLight,   meas: measuredRaw?.lighting },
  ].filter(r => r.calc !== null || r.meas !== null);

  // ── Recomandări automate ──────────────────────────────────────────────────
  const recs = [];

  opaqueElements?.forEach(el => {
    const u = calcU(el);
    const area = parseFloat(el.area || 0);
    if (el.type === "PE" && u > 0.5) {
      recs.push({
        priority: "HIGH",
        icon: "🧱",
        measure: `Termoizolare ${el.name || el.type}`,
        saving: `~${Math.round(u * area * 20)} kWh/an`,
        cost: `~${Math.round(area * 50)} EUR`,
      });
    }
  });

  glazingElements?.forEach(gl => {
    const u = parseFloat(gl.u || 0);
    const area = parseFloat(gl.area || 0);
    if (u > 1.8) {
      recs.push({
        priority: "HIGH",
        icon: "🪟",
        measure: `Înlocuire tâmplărie ${gl.name || gl.orientation || "vitrată"}`,
        saving: `~${Math.round(u * area * 15)} kWh/an`,
        cost: `~${Math.round(area * 250)} EUR`,
      });
    }
  });

  if (instSummary?.ep_total_m2 > 200) {
    recs.push({
      priority: "MED",
      icon: "♨️",
      measure: "Înlocuire sursă termică cu pompă de căldură (COP ≥ 3.5)",
      saving: "~30% EP încălzire",
      cost: "~8.000-15.000 EUR",
    });
  }

  if ((renewSummary?.rer || 0) < 20) {
    recs.push({
      priority: "MED",
      icon: "⚡",
      measure: "Instalare sistem fotovoltaic (min. 3 kWp)",
      saving: "~3.500 kWh/an",
      cost: "~4.500-6.000 EUR",
    });
  }

  // ── Deviz estimativ ───────────────────────────────────────────────────────
  const totalCostEUR = recs.reduce((sum, r) => sum + parseCostEUR(r.cost), 0);
  const totalSavingKWh = recs.reduce((sum, r) => sum + parseSavingKWh(r.saving), 0);
  // 0,08 EUR/kWh preț orientativ electricitate
  const annualSavingEUR = totalSavingKWh * 0.08;
  const paybackYears = annualSavingEUR > 0 ? (totalCostEUR / annualSavingEUR).toFixed(1) : "—";

  // ── Sprint 16 — Context Cap. 4/7 ─────────────────────────────────────────
  const epFinal = instSummary?.ep_total_m2 || 0;
  const rer = renewSummary?.rer;
  const rerOnsite = renewSummary?.rer_onsite;
  const category = building?.category || "RI";
  const zone = building?.climateZone || 2;
  const nzebOk = useMemo(() => {
    const thr = NZEB_THRESHOLDS[category] || NZEB_THRESHOLDS.AL;
    const epMax = thr?.ep_max?.[(zone || 2) - 1] || 148;
    const rerMin = thr?.rer_min ?? 30;
    return epFinal > 0 && epFinal <= epMax && (parseFloat(rer) || 0) >= rerMin;
  }, [epFinal, rer, category, zone]);
  const mepsStatus = useMemo(
    () => getMepsStatus(energyClass, epFinal, category),
    [energyClass, epFinal, category]
  );

  // ── Pierderi anvelopă estimat ─────────────────────────────────────────────
  const totalEnvLoss = (() => {
    const opaqueLoss = (opaqueElements || []).reduce((sum, el) => {
      return sum + calcU(el) * parseFloat(el.area || 0);
    }, 0);
    const glazLoss = (glazingElements || []).reduce((sum, gl) => {
      return sum + parseFloat(gl.u || 0) * parseFloat(gl.area || 0);
    }, 0);
    return Math.round((opaqueLoss + glazLoss) * 2000); // W aprox anual în kWh
  })();

  // ── Funcție export PDF ────────────────────────────────────────────────────
  const generatePDF = async () => {
    setPdfGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const w = 210;
      const margin = 15;
      const colW = w - 2 * margin;
      let y = 20;

      // S29 fix #28 — folosește ROMANIAN_FONT (LiberationSans) în loc de "Roboto"
      // (numele înregistrat în pdf-fonts.js — "Roboto" hardcoded făcea ca jsPDF
      // să nu găsească fontul → fallback Helvetica → diacriticele se pierdeau)
      const fontOk = await setupRomanianFont(doc);
      const writeText = makeTextWriter(doc, fontOk);
      const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";

      // Secțiuni înregistrate pentru TOC + outline PDF
      const tocEntries = [];

      const addPageIfNeeded = (needed = 10) => {
        if (y + needed > 275) {
          doc.addPage();
          y = 20;
        }
      };

      const sectionTitle = (title) => {
        addPageIfNeeded(12);
        doc.setFontSize(11);
        doc.setFont(baseFont, "bold");
        doc.setTextColor(40, 40, 40);
        writeText(title, margin, y);
        doc.setDrawColor(180, 180, 180);
        doc.line(margin, y + 2, w - margin, y + 2);
        // Înregistrează pentru TOC (pagina curentă)
        tocEntries.push({
          title,
          page: doc.internal.getNumberOfPages(),
          level: 0,
        });
        y += 8;
        doc.setFont(baseFont, "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
      };

      const row = (label, value, indent = 0) => {
        addPageIfNeeded(6);
        doc.setFont(baseFont, "bold");
        writeText(label, margin + indent, y);
        doc.setFont(baseFont, "normal");
        writeText(String(value ?? "—"), margin + indent + 55, y);
        y += 5.5;
      };

      // ── Header ──────────────────────────────────────────────────────────
      doc.setFontSize(16);
      doc.setFont(baseFont, "bold");
      doc.setTextColor(20, 20, 60);
      writeText("RAPORT AUDIT ENERGETIC", w / 2, y, { align: "center" });
      y += 8;

      doc.setFontSize(10);
      doc.setFont(baseFont, "normal");
      doc.setTextColor(80, 80, 80);
      const addrLine = [building?.address, building?.city].filter(Boolean).join(", ");
      if (addrLine) {
        writeText(addrLine, w / 2, y, { align: "center" });
        y += 6;
      }

      doc.setFontSize(8);
      writeText(`Data audit: ${auditor?.auditDate || new Date().toLocaleDateString("ro-RO")}`, w / 2, y, { align: "center" });
      y += 12;

      // ── Secțiunea 1 — Date generale ──────────────────────────────────────
      sectionTitle("1. DATE GENERALE");
      row("Adresă:", building?.address || "—");
      row("Localitate:", building?.city || "—");
      row("An construcție:", building?.year || "—");
      row("Categorie:", building?.category || building?.destinatie || "—");
      row("Suprafață utilă:", `${au || "—"} m²`);
      if (building?.volume) row("Volum:", `${building.volume} m³`);
      y += 3;
      row("Auditor:", auditor?.name || "—");
      row("Cod auditor:", auditor?.code || "—");
      row("Dată audit:", auditor?.auditDate || new Date().toLocaleDateString("ro-RO"));
      y += 4;

      // ── Secțiunea 2 — Consum calculat vs. măsurat ────────────────────────
      sectionTitle("2. CONSUM ENERGETIC CALCULAT vs. MASURAT");
      if (consumptionRows.length > 0) {
        // header tabel
        doc.setFont(baseFont, "bold");
        writeText("Purtător energie", margin, y);
        writeText("Calculat (kWh/an)", margin + 50, y);
        writeText("Măsurat (kWh/an)", margin + 90, y);
        writeText("Deviație %", margin + 135, y);
        y += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, w - margin, y);
        y += 3;
        doc.setFont(baseFont, "normal");

        consumptionRows.forEach(r => {
          addPageIfNeeded(6);
          const dev = r.calc && r.meas
            ? Math.abs(r.calc - r.meas) / r.calc * 100
            : null;
          writeText(r.label, margin, y);
          writeText(r.calc != null ? String(r.calc) : "—", margin + 50, y);
          writeText(r.meas != null ? String(r.meas) : "—", margin + 90, y);
          if (dev !== null) {
            writeText(`${dev.toFixed(1)}%`, margin + 135, y);
          } else {
            writeText("—", margin + 135, y);
          }
          y += 5.5;
        });
      } else {
        writeText("Date de consum insuficiente.", margin, y);
        y += 6;
      }
      y += 4;

      // ── Secțiunea 3 — Anvelopă termică ───────────────────────────────────
      sectionTitle("3. ANVELOPA TERMICA");
      if (opaqueElements && opaqueElements.length > 0) {
        doc.setFont(baseFont, "bold");
        writeText("Elemente opace:", margin, y);
        y += 5;
        writeText("Tip/Denumire", margin + 2, y);
        writeText("Suprafață (m²)", margin + 55, y);
        writeText("U calculat (W/m²K)", margin + 95, y);
        writeText("Obs.", margin + 148, y);
        y += 4;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, w - margin, y);
        y += 3;
        doc.setFont(baseFont, "normal");
        opaqueElements.forEach(el => {
          addPageIfNeeded(6);
          const u = calcU(el).toFixed(3);
          writeText(el.name || el.type || "—", margin + 2, y);
          writeText(String(el.area || "—"), margin + 55, y);
          writeText(u, margin + 95, y);
          writeText(el.notes || "", margin + 148, y);
          y += 5.5;
        });
        y += 3;
      }

      if (glazingElements && glazingElements.length > 0) {
        addPageIfNeeded(8);
        doc.setFont(baseFont, "bold");
        writeText("Elemente vitrate:", margin, y);
        y += 5;
        writeText("Orientare/Denumire", margin + 2, y);
        writeText("Suprafață (m²)", margin + 60, y);
        writeText("U (W/m²K)", margin + 100, y);
        writeText("g (—)", margin + 135, y);
        y += 4;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, w - margin, y);
        y += 3;
        doc.setFont(baseFont, "normal");
        glazingElements.forEach(gl => {
          addPageIfNeeded(6);
          writeText(gl.name || gl.orientation || "—", margin + 2, y);
          writeText(String(gl.area || "—"), margin + 60, y);
          writeText(String(gl.u || "—"), margin + 100, y);
          writeText(String(gl.g || "—"), margin + 135, y);
          y += 5.5;
        });
        y += 3;
      }

      if (totalEnvLoss > 0) {
        doc.setFont(baseFont, "bold");
        writeText(`Total pierderi anvelopă estimat: `, margin, y);
        doc.setFont(baseFont, "normal");
        writeText(`~${totalEnvLoss.toLocaleString("ro-RO")} kWh/an`, margin + 65, y);
        y += 6;
      }
      y += 2;

      // ── Secțiunea 4 — Sisteme energetice ────────────────────────────────
      sectionTitle("4. SISTEME ENERGETICE");
      row("Sursă încălzire:", instSummary?.heatSource || "—");
      row("η încălzire:", instSummary?.eta_heating ? `${(instSummary.eta_heating * 100).toFixed(0)}%` : "—");
      row("Sursă răcire:", instSummary?.coolSource || "—");
      row("Ventilație (HR%):", instSummary?.hr_eff ? `${instSummary.hr_eff}%` : "—");
      row("ACM:", instSummary?.acmSource || "—");
      row("Iluminat:", instSummary?.lightingType || "—");
      addPageIfNeeded(8);
      doc.setFont(baseFont, "bold");
      writeText("Clasă energetică finală:", margin, y);
      doc.setFont(baseFont, "normal");
      writeText(energyClass || "—", margin + 55, y);
      if (instSummary?.ep_total_m2) {
        writeText(`  (${instSummary.ep_total_m2.toFixed(1)} kWh/m²·an EP)`, margin + 65, y);
      }
      y += 8;

      // ── Secțiunea 5 — Recomandări ────────────────────────────────────────
      sectionTitle("5. RECOMANDARI PRIORITIZATE");
      if (recs.length > 0) {
        doc.setFont(baseFont, "bold");
        writeText("Prioritate", margin, y);
        writeText("Măsură", margin + 28, y);
        writeText("Economie estimată", margin + 110, y);
        writeText("Cost estimat", margin + 152, y);
        y += 4;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, w - margin, y);
        y += 3;
        doc.setFont(baseFont, "normal");
        recs.forEach(r => {
          addPageIfNeeded(7);
          const pLabel = r.priority === "HIGH" ? "Ridicată" : r.priority === "MED" ? "Medie" : "Scăzută";
          writeText(pLabel, margin, y);
          const measureLines = doc.splitTextToSize(r.measure, 75);
          writeText(measureLines, margin + 28, y);
          writeText(r.saving || "—", margin + 110, y);
          writeText(r.cost || "—", margin + 152, y);
          y += Math.max(measureLines.length * 4.5, 6);
        });
      } else {
        writeText("Nu s-au identificat recomandări semnificative.", margin, y);
        y += 6;
      }
      y += 4;

      // ── Secțiunea 6 — Deviz estimativ ────────────────────────────────────
      sectionTitle("6. DEVIZ ESTIMATIV REABILITARE");
      row("Total investiție estimată:", `~${Math.round(totalCostEUR).toLocaleString("ro-RO")} EUR`);
      row("Economie anuală estimată:", totalSavingKWh > 0 ? `~${Math.round(totalSavingKWh).toLocaleString("ro-RO")} kWh/an` : "—");
      row("Termen recuperare simplu:", paybackYears !== "—" ? `${paybackYears} ani` : "—");
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const disclaimer = doc.splitTextToSize(
        "Prețuri orientative — necesită ofertare de la furnizori autorizați. " +
        "Valorile de economie sunt estimate pe baza condițiilor climatice standard.",
        colW
      );
      writeText(disclaimer, margin, y);
      y += disclaimer.length * 4 + 6;

      // ── Secțiunea 7 — Concluzii (Sprint 16) ──────────────────────────────
      sectionTitle("7. CONCLUZII");
      doc.setFontSize(9);
      doc.setFont(baseFont, "normal");
      doc.setTextColor(40, 40, 40);
      const textToPrint = conclusionsText ||
        generateConclusionsText({ energyClass, epFinal, rer, nzebOk, mepsStatus, recs, building });
      const conclusionsLines = doc.splitTextToSize(textToPrint, colW);
      conclusionsLines.forEach((line) => {
        addPageIfNeeded(5);
        writeText(line, margin, y);
        y += 5;
      });
      y += 4;

      // ── Secțiunea 8 — Anexe (doar listă, fișierele rămân separate) ───────
      sectionTitle("8. ANEXE RAPORT");
      const anexaLabels = {
        plans: "A. Planuri clădire",
        facade: "B. Fotografii fațade",
        interior: "C. Fotografii interior",
        basement: "D. Fotografii subsol/terasă/pod",
        thermography: "E. Termografie IR",
        blowerDoor: "F. Raport blower-door (n50)",
        prevCPE: "G. Copie CPE anterior",
        auditorCert: "H. Copie atestat auditor",
      };
      Object.entries(attachments || {}).forEach(([key, files]) => {
        if (!files?.length) return;
        addPageIfNeeded(6);
        doc.setFont(baseFont, "bold");
        writeText(`${anexaLabels[key] || key}:`, margin, y);
        doc.setFont(baseFont, "normal");
        writeText(`${files.length} fișier${files.length > 1 ? "e" : ""}`, margin + 70, y);
        y += 5.5;
        files.forEach((f) => {
          addPageIfNeeded(4);
          writeText(`   • ${f.name} (${Math.round((f.size || 0) / 1024)} KB)`, margin + 5, y);
          y += 4.5;
        });
      });
      if (!Object.values(attachments || {}).some((v) => v?.length)) {
        writeText("Nu există anexe atașate raportului.", margin, y);
        y += 6;
      }

      // ── TOC navigabil (Sprint 16 Task 6) ─────────────────────────────────
      buildPdfOutline(doc, tocEntries);

      // ── Footer ────────────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        writeText(
          `Raport Audit Energetic · Generat cu Zephren · Pagina ${i}/${pageCount}`,
          w / 2,
          290,
          { align: "center" }
        );
      }

      const filename = `Raport_Audit_${(building?.address || "cladire").replace(/[^a-z0-9]/gi, "_")}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("Eroare generare PDF:", err);
    } finally {
      setPdfGenerating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ── RENDER ───────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-slate-900/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight">Raport Audit Energetic</h2>
            {building?.address && (
              <p className="text-xs opacity-40 mt-0.5">
                {[building.address, building.city].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generatePDF}
            disabled={pdfGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {pdfGenerating ? "Se generează..." : "Generează PDF"}
          </button>
          <button
            onClick={generateDOCX}
            disabled={docxGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            {docxGenerating ? "Se generează..." : "Export DOCX"}
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Conținut scrollabil */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* ── Secțiunea 1 — Date generale ──────────────────────────────── */}
        <Card className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3">
            1. Date generale
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            <DataRow label="Adresă" value={building?.address} />
            <DataRow label="Localitate" value={building?.city} />
            <DataRow label="An construcție" value={building?.year} />
            <DataRow label="Categorie" value={building?.category || building?.destinatie} />
            <DataRow label="Suprafață utilă" value={au ? `${au} m²` : undefined} />
            <DataRow label="Volum" value={building?.volume ? `${building.volume} m³` : undefined} />
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            <DataRow label="Auditor" value={auditor?.name} />
            <DataRow label="Cod auditor" value={auditor?.code} />
            <DataRow label="Dată audit" value={auditor?.auditDate || new Date().toLocaleDateString("ro-RO")} />
          </div>
        </Card>

        {/* ── Secțiunea 2 — Consum calculat vs. măsurat ────────────────── */}
        <Card className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3">
            2. Consum energetic calculat vs. măsurat
          </h3>
          {consumptionRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs opacity-40 uppercase tracking-wider">
                    <th className="text-left py-2 pr-4 font-medium">Purtător energie</th>
                    <th className="text-right py-2 px-4 font-medium">Calculat (kWh/an)</th>
                    <th className="text-right py-2 px-4 font-medium">Măsurat (kWh/an)</th>
                    <th className="text-right py-2 pl-4 font-medium">Deviație %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {consumptionRows.map((r) => {
                    const dev = r.calc && r.meas
                      ? Math.abs(r.calc - r.meas) / r.calc * 100
                      : null;
                    return (
                      <tr key={r.label}>
                        <td className="py-2 pr-4 font-medium">{r.label}</td>
                        <td className="text-right py-2 px-4 font-mono opacity-80">
                          {r.calc != null ? r.calc.toLocaleString("ro-RO") : "—"}
                        </td>
                        <td className="text-right py-2 px-4 font-mono opacity-80">
                          {r.meas != null ? r.meas.toLocaleString("ro-RO") : "—"}
                        </td>
                        <td className={cn("text-right py-2 pl-4 font-mono font-medium", dev !== null ? deviationColor(dev) : "opacity-40")}>
                          {dev !== null ? `${dev.toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!measuredRaw && (
                <p className="text-xs opacity-40 mt-2 italic">
                  Date măsurate indisponibile. Importați facturi cu InvoiceOCR pentru comparație.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm opacity-40 italic">Date de consum insuficiente pentru comparație.</p>
          )}
        </Card>

        {/* ── Secțiunea 3 — Anvelopă termică ───────────────────────────── */}
        <Card className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3">
            3. Anvelopă termică
          </h3>

          {opaqueElements && opaqueElements.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold opacity-60 mb-2">Elemente opace</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs opacity-40 uppercase tracking-wider">
                    <th className="text-left py-1.5 pr-4 font-medium">Tip / Denumire</th>
                    <th className="text-right py-1.5 px-3 font-medium">Suprafață (m²)</th>
                    <th className="text-right py-1.5 px-3 font-medium">U (W/m²K)</th>
                    <th className="text-left py-1.5 pl-3 font-medium">Observații</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {opaqueElements.map((el, i) => {
                    const u = calcU(el);
                    const uColor = u > 0.5 ? "text-red-400" : u > 0.3 ? "text-amber-400" : "text-emerald-400";
                    return (
                      <tr key={i}>
                        <td className="py-1.5 pr-4">{el.name || el.type || "—"}</td>
                        <td className="text-right py-1.5 px-3 font-mono opacity-70">{el.area || "—"}</td>
                        <td className={cn("text-right py-1.5 px-3 font-mono font-medium", uColor)}>
                          {u.toFixed(3)}
                        </td>
                        <td className="py-1.5 pl-3 text-xs opacity-50">{el.notes || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {glazingElements && glazingElements.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold opacity-60 mb-2">Elemente vitrate</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs opacity-40 uppercase tracking-wider">
                    <th className="text-left py-1.5 pr-4 font-medium">Orientare / Denumire</th>
                    <th className="text-right py-1.5 px-3 font-medium">Suprafață (m²)</th>
                    <th className="text-right py-1.5 px-3 font-medium">U (W/m²K)</th>
                    <th className="text-right py-1.5 pl-3 font-medium">g (—)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {glazingElements.map((gl, i) => {
                    const u = parseFloat(gl.u || 0);
                    const uColor = u > 1.8 ? "text-red-400" : u > 1.2 ? "text-amber-400" : "text-emerald-400";
                    return (
                      <tr key={i}>
                        <td className="py-1.5 pr-4">{gl.name || gl.orientation || "—"}</td>
                        <td className="text-right py-1.5 px-3 font-mono opacity-70">{gl.area || "—"}</td>
                        <td className={cn("text-right py-1.5 px-3 font-mono font-medium", uColor)}>
                          {u > 0 ? u.toFixed(2) : "—"}
                        </td>
                        <td className="text-right py-1.5 pl-3 font-mono opacity-70">{gl.g || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalEnvLoss > 0 && (
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-sm">
              <span className="opacity-50 text-xs">Total pierderi anvelopă estimat</span>
              <span className="font-mono font-semibold text-amber-400">
                ~{totalEnvLoss.toLocaleString("ro-RO")} kWh/an
              </span>
            </div>
          )}

          {(!opaqueElements || opaqueElements.length === 0) && (!glazingElements || glazingElements.length === 0) && (
            <p className="text-sm opacity-40 italic">Nu există date de anvelopă definite.</p>
          )}
        </Card>

        {/* ── Secțiunea 4 — Sisteme energetice ────────────────────────── */}
        <Card className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3">
            4. Sisteme energetice
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            <DataRow label="Sursă încălzire" value={instSummary?.heatSource} />
            <DataRow
              label="η încălzire"
              value={instSummary?.eta_heating
                ? `${(instSummary.eta_heating * 100).toFixed(0)}%`
                : undefined}
            />
            <DataRow label="Sursă răcire" value={instSummary?.coolSource} />
            <DataRow
              label="Ventilație recuperare"
              value={instSummary?.hr_eff ? `${instSummary.hr_eff}%` : undefined}
            />
            <DataRow label="Sistem ACM" value={instSummary?.acmSource} />
            <DataRow label="Iluminat" value={instSummary?.lightingType} />
          </div>

          {energyClass && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-3">
              <span className="text-xs opacity-50">Clasă energetică finală:</span>
              <span
                className="text-2xl font-black w-10 h-10 flex items-center justify-center rounded-lg"
                style={{
                  background: CLASS_COLORS[energyClass] || "#888",
                  color: ["B", "C"].includes(energyClass) ? "#333" : "#fff",
                }}
              >
                {energyClass}
              </span>
              {instSummary?.ep_total_m2 && (
                <span className="text-sm opacity-60">
                  {instSummary.ep_total_m2.toFixed(1)} kWh/m²·an EP
                </span>
              )}
            </div>
          )}
        </Card>

        {/* ── Secțiunea 4 — Conformitate normativă (Sprint 16) ─────────── */}
        <Card className="p-4">
          <Capitol4_Conformitate
            building={building}
            instSummary={instSummary}
            opaqueElements={opaqueElements}
            glazingElements={glazingElements}
            epFinal={epFinal}
            rer={rer}
            rerOnsite={rerOnsite}
            energyClass={energyClass}
          />
        </Card>

        {/* ── Secțiunea 5 — Recomandări ────────────────────────────────── */}
        <Card className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3">
            5. Recomandări prioritizate
          </h3>
          {recs.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs opacity-40 uppercase tracking-wider">
                  <th className="text-left py-1.5 pr-3 font-medium">Prioritate</th>
                  <th className="text-left py-1.5 pr-3 font-medium">Măsură</th>
                  <th className="text-right py-1.5 px-3 font-medium">Economie estimată</th>
                  <th className="text-right py-1.5 pl-3 font-medium">Cost estimat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recs.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <PriorityBadge priority={r.priority} />
                    </td>
                    <td className="py-2 pr-3">
                      <span className="mr-1.5">{r.icon}</span>
                      {r.measure}
                    </td>
                    <td className="text-right py-2 px-3 font-mono text-emerald-400 text-xs">
                      {r.saving}
                    </td>
                    <td className="text-right py-2 pl-3 font-mono text-amber-400 text-xs">
                      {r.cost}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm opacity-40 italic">
              Nu s-au identificat recomandări semnificative pe baza datelor curente.
            </p>
          )}
        </Card>

        {/* ── Secțiunea 6 — Deviz estimativ ───────────────────────────── */}
        <Card className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3">
            6. Deviz estimativ reabilitare
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-xl font-black text-amber-400">
                ~{Math.round(totalCostEUR).toLocaleString("ro-RO")} EUR
              </div>
              <div className="text-xs opacity-40 mt-1">Total investiție estimată</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-xl font-black text-emerald-400">
                {totalSavingKWh > 0
                  ? `~${Math.round(totalSavingKWh).toLocaleString("ro-RO")} kWh/an`
                  : "—"}
              </div>
              <div className="text-xs opacity-40 mt-1">Economie anuală estimată</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-xl font-black text-sky-400">
                {paybackYears !== "—" ? `${paybackYears} ani` : "—"}
              </div>
              <div className="text-xs opacity-40 mt-1">Termen recuperare simplu</div>
            </div>
          </div>
          <p className="text-xs opacity-30 italic border-t border-white/5 pt-3">
            Prețuri orientative — necesită ofertare de la furnizori autorizați.
            Economia anuală este estimată la 0,08 EUR/kWh (preț orientativ electricitate).
          </p>
        </Card>

        {/* ── Secțiunea 7 — Concluzii (Sprint 16) ───────────────────────── */}
        <Card className="p-4">
          <Capitol7_Concluzii
            energyClass={energyClass}
            epFinal={epFinal}
            rer={rer}
            nzebOk={nzebOk}
            mepsStatus={mepsStatus}
            recs={recs}
            building={building}
            initialText={conclusionsText}
            onTextChange={setConclusionsText}
          />
        </Card>

        {/* ── Secțiunea 8 — Anexe upload (Sprint 16) + Anexa G Pașaport (Sprint 17) ────── */}
        <Card className="p-4">
          <Capitol8_Anexe
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            showToast={showToast}
            passportInfo={building?.passportUUID ? {
              passportId: building.passportUUID,
              url: building.passportURL || `https://zephren.ro/passport/${building.passportUUID}`,
              timestamp: building.passportTimestamp,
            } : null}
          />
        </Card>

      </div>{/* /scroll */}
    </div>
  );
}

// ─── Component auxiliar linie date ───────────────────────────────────────────
function DataRow({ label, value }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs opacity-40 shrink-0 w-32">{label}</span>
      <span className="text-xs font-medium">{value || <span className="opacity-25">—</span>}</span>
    </div>
  );
}
