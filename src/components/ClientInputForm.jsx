import { useState, useEffect, useRef } from "react";
import { cn } from "./ui.jsx";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  TableLayoutType, VerticalAlign, convertInchesToTwip, ImageRun,
} from "docx";

// ─── Helpers vizuale ──────────────────────────────────────────────────────────
function Section({ icon, title, subtitle, children }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-white/90">{title}</h3>
          {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, required, span2, children }) {
  return (
    <div className={cn("flex flex-col gap-1.5", span2 && "md:col-span-2")}>
      <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
        {label}{required && <span className="text-amber-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-white/30 leading-relaxed">{hint}</p>}
    </div>
  );
}

function FInput({ value, onChange, type = "text", placeholder, unit, min, max }) {
  return (
    <div className="relative">
      <input
        type={type} value={value ?? ""} min={min} max={max}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20
          focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all"
      />
      {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">{unit}</span>}
    </div>
  );
}

function FSelect({ value, onChange, options, placeholder = "Selectați..." }) {
  return (
    <select
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white
        focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all appearance-none"
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  );
}

function FRadio({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2 pt-0.5">
      {options.map(o => {
        const val = o.value ?? o;
        const lab = o.label ?? o;
        const active = value === val;
        return (
          <button key={val} type="button" onClick={() => onChange(val)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm border transition-all",
              active
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-medium"
                : "bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
            )}
          >{lab}</button>
        );
      })}
    </div>
  );
}

function FCheckbox({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div onClick={() => onChange(!checked)}
        className={cn(
          "mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all",
          checked ? "bg-amber-500 border-amber-500" : "bg-white/5 border-white/20 group-hover:border-white/40"
        )}
      >
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <div>
        <span className="text-sm text-white/70">{label}</span>
        {hint && <p className="text-xs text-white/30 mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ sections, data }) {
  const allRequired = sections.flatMap(s => s.required || []);
  const filled = allRequired.filter(key => {
    const v = data[key];
    return v !== undefined && v !== "" && v !== null;
  }).length;
  const pct = allRequired.length ? Math.round((filled / allRequired.length) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-white/40">
        <span>{filled}/{allRequired.length} câmpuri obligatorii completate</span>
        <span className={cn("font-bold", pct === 100 ? "text-emerald-400" : pct > 60 ? "text-amber-400" : "text-white/40")}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500",
          pct === 100 ? "bg-emerald-500" : pct > 60 ? "bg-amber-500" : "bg-white/30"
        )} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Export PDF/JSON ──────────────────────────────────────────────────────────
function exportJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `date-client-audit-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Export DOCX ─────────────────────────────────────────────────────────────
async function exportDOCX(data, planuri = []) {
  const v = (key) => data[key] ?? "";
  const has = (key) => { const val = data[key]; return val !== undefined && val !== "" && val !== null && val !== false; };

  // ── Culori și stiluri ────────────────────────────────────────────────────────
  const AMBER   = "F59E0B";
  const DARK    = "16183A";
  const GRAY    = "6B7280";
  const LIGHT   = "F3F4F6";
  const WHITE   = "FFFFFF";
  const GREEN   = "16A34A";
  const BORDER  = "D1D5DB";

  const noBorder = {
    top:    { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right:  { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };

  const thinBorder = {
    top:    { style: BorderStyle.SINGLE, size: 4, color: BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
    left:   { style: BorderStyle.SINGLE, size: 4, color: BORDER },
    right:  { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  };

  const bottomBorder = {
    top:    { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
    left:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right:  { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };

  // ── Helper: paragraf simplu ──────────────────────────────────────────────────
  const p = (text, opts = {}) => new Paragraph({
    children: [new TextRun({
      text,
      font: "Calibri",
      size: opts.size ?? 20,
      bold: opts.bold ?? false,
      italics: opts.italic ?? false,
      color: opts.color ?? DARK,
    })],
    spacing: { before: opts.spaceBefore ?? 0, after: opts.spaceAfter ?? 60 },
    alignment: opts.align ?? AlignmentType.LEFT,
  });

  const blank = (spacing = 80) => new Paragraph({ spacing: { before: 0, after: spacing } });

  // ── Helper: titlu secțiune cu fundal ────────────────────────────────────────
  const sectionHeading = (nr, title) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 400, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: AMBER, fill: AMBER },
          borders: noBorder,
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            children: [new TextRun({ text: `${nr}.`, font: "Calibri", size: 22, bold: true, color: WHITE })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40 },
          })],
        }),
        new TableCell({
          shading: { type: ShadingType.SOLID, color: DARK, fill: DARK },
          borders: noBorder,
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            children: [new TextRun({ text: `  ${title.toUpperCase()}`, font: "Calibri", size: 22, bold: true, color: WHITE })],
            spacing: { before: 40, after: 40 },
          })],
        }),
      ],
    })],
  });

  // ── Helper: câmp cu etichetă și valoare / linie goală ───────────────────────
  const fieldRow = (label, key, unit = "", req = false) => {
    const val = has(key) ? String(v(key)) : "";
    const labelText = `${label}${req ? " *" : ""}${unit ? `  [${unit}]` : ""}`;
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 3800, type: WidthType.DXA },
            borders: { ...noBorder, bottom: { style: BorderStyle.NONE, size: 0, color: WHITE } },
            children: [new Paragraph({
              children: [new TextRun({ text: labelText, font: "Calibri", size: 18, bold: req, color: req ? DARK : GRAY })],
              spacing: { before: 20, after: 20 },
            })],
          }),
          new TableCell({
            borders: { ...noBorder, bottom: { style: BorderStyle.SINGLE, size: 6, color: val ? AMBER : BORDER } },
            shading: val ? { type: ShadingType.SOLID, color: "FFFBF0", fill: "FFFBF0" } : undefined,
            children: [new Paragraph({
              children: [new TextRun({ text: val || "", font: "Calibri", size: 20, bold: !!val, color: DARK })],
              spacing: { before: 30, after: 30 },
            })],
          }),
        ],
      })],
    });
  };

  // ── Helper: două câmpuri pe un rând ─────────────────────────────────────────
  const fieldRow2 = (label1, key1, unit1, req1, label2, key2, unit2, req2) => {
    const val1 = has(key1) ? String(v(key1)) : "";
    const val2 = has(key2) ? String(v(key2)) : "";
    const lbl1 = `${label1}${req1 ? " *" : ""}${unit1 ? `  [${unit1}]` : ""}`;
    const lbl2 = `${label2}${req2 ? " *" : ""}${unit2 ? `  [${unit2}]` : ""}`;
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [new TableRow({
        children: [
          // Coloana 1 - etichetă
          new TableCell({
            width: { size: 2800, type: WidthType.DXA },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: lbl1, font: "Calibri", size: 18, bold: req1, color: req1 ? DARK : GRAY })], spacing: { before: 20, after: 20 } })],
          }),
          // Coloana 1 - valoare
          new TableCell({
            width: { size: 2000, type: WidthType.DXA },
            borders: { ...noBorder, bottom: { style: BorderStyle.SINGLE, size: 6, color: val1 ? AMBER : BORDER } },
            shading: val1 ? { type: ShadingType.SOLID, color: "FFFBF0", fill: "FFFBF0" } : undefined,
            children: [new Paragraph({ children: [new TextRun({ text: val1 || "", font: "Calibri", size: 20, bold: !!val1, color: DARK })], spacing: { before: 30, after: 30 } })],
          }),
          // Separator
          new TableCell({
            width: { size: 200, type: WidthType.DXA },
            borders: noBorder,
            children: [new Paragraph({ children: [] })],
          }),
          // Coloana 2 - etichetă
          new TableCell({
            width: { size: 2800, type: WidthType.DXA },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: lbl2, font: "Calibri", size: 18, bold: req2, color: req2 ? DARK : GRAY })], spacing: { before: 20, after: 20 } })],
          }),
          // Coloana 2 - valoare
          new TableCell({
            borders: { ...noBorder, bottom: { style: BorderStyle.SINGLE, size: 6, color: val2 ? AMBER : BORDER } },
            shading: val2 ? { type: ShadingType.SOLID, color: "FFFBF0", fill: "FFFBF0" } : undefined,
            children: [new Paragraph({ children: [new TextRun({ text: val2 || "", font: "Calibri", size: 20, bold: !!val2, color: DARK })], spacing: { before: 30, after: 30 } })],
          }),
        ],
      })],
    });
  };

  // ── Helper: opțiuni radio inline ────────────────────────────────────────────
  const optionsRow = (label, key, options, req = false) => {
    const selected = v(key);
    const cells = options.map(opt => {
      const isSelected = selected === opt;
      return new TableCell({
        shading: isSelected
          ? { type: ShadingType.SOLID, color: AMBER, fill: AMBER }
          : { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT },
        borders: { top: { style: BorderStyle.SINGLE, size: 4, color: isSelected ? AMBER : BORDER },
                   bottom: { style: BorderStyle.SINGLE, size: 4, color: isSelected ? AMBER : BORDER },
                   left: { style: BorderStyle.SINGLE, size: 4, color: isSelected ? AMBER : BORDER },
                   right: { style: BorderStyle.SINGLE, size: 4, color: isSelected ? AMBER : BORDER } },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          children: [new TextRun({ text: `${isSelected ? "● " : "○ "}${opt}`, font: "Calibri", size: 18, bold: isSelected, color: isSelected ? WHITE : GRAY })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 30, after: 30 },
        })],
      });
    });

    return [
      new Paragraph({ children: [new TextRun({ text: `${label}${req ? " *" : ""}`, font: "Calibri", size: 18, bold: req, color: req ? DARK : GRAY })], spacing: { before: 60, after: 40 } }),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, rows: [new TableRow({ children: cells })] }),
    ];
  };

  // ── Helper: rând checklist ───────────────────────────────────────────────────
  const checkRow = (label, key, hint = "") => {
    const checked = !!data[key];
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 400, type: WidthType.DXA },
            shading: checked ? { type: ShadingType.SOLID, color: GREEN, fill: GREEN } : undefined,
            borders: thinBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              children: [new TextRun({ text: checked ? "  ✓" : "", font: "Calibri", size: 22, bold: true, color: WHITE })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 30, after: 30 },
            })],
          }),
          new TableCell({
            borders: { ...noBorder, bottom: bottomBorder.bottom },
            children: [new Paragraph({
              children: [
                new TextRun({ text: `  ${label}`, font: "Calibri", size: 20, bold: checked, color: checked ? DARK : GRAY }),
                hint ? new TextRun({ text: `  — ${hint}`, font: "Calibri", size: 17, italics: true, color: GRAY }) : new TextRun({ text: "" }),
              ],
              spacing: { before: 40, after: 40 },
            })],
          }),
        ],
      })],
    });
  };

  // ── Helper: notă informativă ─────────────────────────────────────────────────
  const infoBox = (text) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 200, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: AMBER, fill: AMBER },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "ℹ", font: "Calibri", size: 20, color: WHITE })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })],
        }),
        new TableCell({
          shading: { type: ShadingType.SOLID, color: "FFFBEB", fill: "FFFBEB" },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: `  ${text}`, font: "Calibri", size: 18, italics: true, color: "92400E" })], spacing: { before: 60, after: 60 } })],
        }),
      ],
    })],
  });

  // ── Helper: subsecțiune ──────────────────────────────────────────────────────
  const subSection = (title) => new Paragraph({
    children: [new TextRun({ text: title, font: "Calibri", size: 20, bold: true, color: DARK })],
    spacing: { before: 120, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER } },
  });

  // ════════════════════════════════════════════════════════════════════════════
  //  CONȚINUT DOCUMENT
  // ════════════════════════════════════════════════════════════════════════════
  const children = [];
  const add = (...items) => items.flat().forEach(i => children.push(i));

  // ── HEADER ──────────────────────────────────────────────────────────────────
  add(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 1200, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: DARK, fill: DARK },
          borders: noBorder,
          children: [
            new Paragraph({ children: [new TextRun({ text: "ZEPHREN", font: "Calibri", size: 32, bold: true, color: AMBER })], spacing: { before: 80, after: 20 } }),
            new Paragraph({ children: [new TextRun({ text: "Energy Performance Calculator", font: "Calibri", size: 16, color: "9CA3AF" })], spacing: { before: 0, after: 80 } }),
          ],
        }),
        new TableCell({
          shading: { type: ShadingType.SOLID, color: DARK, fill: DARK },
          borders: noBorder,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({ children: [new TextRun({ text: "FORMULAR DE COLECTARE DATE CLIENT", font: "Calibri", size: 24, bold: true, color: WHITE })], alignment: AlignmentType.RIGHT, spacing: { before: 40, after: 20 } }),
            new Paragraph({ children: [new TextRun({ text: `Audit energetic / Certificat de performanță energetică  |  Data: ${new Date().toLocaleDateString("ro-RO")}`, font: "Calibri", size: 16, color: "9CA3AF" })], alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 20 } }),
            new Paragraph({ children: [new TextRun({ text: "Mc 001-2022  |  ISO 52000-1:2023  |  EPBD 2024/1275", font: "Calibri", size: 15, italics: true, color: "6B7280" })], alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 40 } }),
          ],
        }),
      ],
    })],
  }));

  add(blank(120));

  // ── INSTRUCȚIUNI ────────────────────────────────────────────────────────────
  add(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [new TableCell({
        shading: { type: ShadingType.SOLID, color: "EFF6FF", fill: "EFF6FF" },
        borders: { top: { style: BorderStyle.SINGLE, size: 12, color: "3B82F6" }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.SINGLE, size: 12, color: "3B82F6" }, right: { style: BorderStyle.NONE } },
        children: [
          new Paragraph({ children: [new TextRun({ text: "  Instrucțiuni de completare", font: "Calibri", size: 22, bold: true, color: "1E3A8A" })], spacing: { before: 80, after: 40 } }),
          new Paragraph({ children: [new TextRun({ text: "  Completați câmpurile de mai jos cu informații despre clădirea dumneavoastră și transmiteți documentul auditorului energetic înainte de inspecția la fața locului.", font: "Calibri", size: 19, color: "1E40AF" })], spacing: { before: 0, after: 40 } }),
          new Paragraph({ children: [new TextRun({ text: "  • Câmpurile marcate cu * sunt obligatorii.", font: "Calibri", size: 18, bold: true, color: "1E40AF" })], spacing: { before: 0, after: 20 } }),
          new Paragraph({ children: [new TextRun({ text: "  • Câmpurile necompletate vor fi determinate de auditor la fața locului pe baza inspecției.", font: "Calibri", size: 18, color: "1E40AF" })], spacing: { before: 0, after: 20 } }),
          new Paragraph({ children: [new TextRun({ text: "  • Anexați copii ale facturilor de energie și fișele tehnice ale echipamentelor, acolo unde este posibil.", font: "Calibri", size: 18, color: "1E40AF" })], spacing: { before: 0, after: 80 } }),
        ],
      })],
    })],
  }));

  add(blank(160));

  // ════════════════════════════════════════
  // 1. DATE DE IDENTIFICARE
  // ════════════════════════════════════════
  add(sectionHeading("1", "Date de identificare și contact"));
  add(blank(80));
  add(fieldRow2("Nume și prenume proprietar", "numeProprietar", "", true,   "Telefon de contact", "telefonProprietar", "", true));
  add(blank(60));
  add(fieldRow2("Adresă de e-mail", "emailProprietar", "", false,           "Cod numeric personal (CNP)", "cnpProprietar", "", false));
  add(blank(60));
  add(fieldRow2("Județ", "judet", "", true,                                 "Localitate / Municipiu", "localitate", "", true));
  add(blank(60));
  add(fieldRow("Adresa completă a clădirii (stradă, număr, bloc, scară, apartament)", "adresaCompleta", "", true));
  add(blank(60));
  add(fieldRow2("Tipul clădirii", "tipClădire", "", true,                   "Anul construcției (aproximativ)", "anConstructie", "", true));
  add(blank(60));
  add(fieldRow2("Act de proprietate (număr și dată)", "propertyAct", "", false,    "Număr cadastral (din actul de proprietate)", "nrCadastral", "", false));
  add(blank(60));
  add(fieldRow2("Autorizație de construire (număr și dată)", "buildingAuthority", "", false, "Număr de apartamente în clădire (dacă este bloc)", "numarApartamenteBloc", "buc.", false));
  add(blank(60));
  add(...optionsRow("Scopul pentru care solicitați auditul energetic / CPE:", "scopulCPE",
    ["Vânzare", "Închiriere", "Recepție lucrare nouă", "Refinanțare credit", "Reabilitare termică", "Audit voluntar"], true));
  add(blank(60));
  add(...optionsRow("Au fost efectuate lucrări de reabilitare anterioare?", "reabilitarePrecedenta",
    ["Nu", "Da — parțial", "Da — integral"]));
  if (has("descriereReabilitare")) {
    add(blank(60));
    add(fieldRow("Descrierea lucrărilor de reabilitare efectuate anterior", "descriereReabilitare", "", false));
  }
  add(blank(160));

  // ════════════════════════════════════════
  // 2. DIMENSIUNILE CLĂDIRII
  // ════════════════════════════════════════
  add(sectionHeading("2", "Dimensiunile clădirii"));
  add(blank(80));
  add(infoBox("Dacă nu dispuneți de planuri, auditorul va efectua măsurători la fața locului. Furnizați cel puțin suprafața utilă totală."));
  add(blank(80));
  add(fieldRow2("Suprafața totală construită", "arieTotala", "m²", true,    "Suprafața utilă totală", "arieUtila", "m²", false));
  add(blank(60));
  add(fieldRow2("Număr de niveluri (fără subsol)", "numarEtaje", "", true,  "Înălțimea unui nivel", "inaltimeNivel", "m", false));
  add(blank(60));
  add(fieldRow2("Număr unități locative", "numarApartamente", "buc.", false, "Număr ocupanți permanenți", "numarOcupanti", "pers.", false));
  add(blank(60));
  add(...optionsRow("Orientarea fațadei principale (cu cele mai multe ferestre):", "orientareFațadaPrincipala",
    ["Nord", "Nord-Est", "Est", "Sud-Est", "Sud", "Sud-Vest", "Vest", "Nord-Vest"], true));
  add(blank(60));
  add(fieldRow2("Subsol / demisol", "areSubsol", "", false,                 "Pod / mansardă", "arePod", "", false));
  add(blank(160));

  // ════════════════════════════════════════
  // 3. ANVELOPA CLĂDIRII
  // ════════════════════════════════════════
  add(sectionHeading("3", "Anvelopa clădirii — Pereți, acoperiș și ferestre"));
  add(blank(80));
  add(subSection("3.1  Pereți exteriori"));
  add(fieldRow("Materialul principal al pereților exteriori", "materialPereti", "", true));
  add(blank(60));
  add(...optionsRow("Există izolație termică pe pereții exteriori?", "areIzolatiePeretiExteriori", ["Nu", "Da", "Nu știu"]));
  add(blank(80));
  add(subSection("3.2  Acoperiș / planșeu superior"));
  add(...optionsRow("Tipul acoperișului:", "tipAcoperis",
    ["Terasă necirculabilă", "Terasă circulabilă", "Șarpantă cu țiglă", "Șarpantă cu tablă"], true));
  add(blank(60));
  add(...optionsRow("Există izolație termică la acoperiș / pod?", "areIzolatieAcoperis", ["Nu", "Da", "Nu știu"]));
  add(blank(80));
  add(subSection("3.3  Ferestre și uși exterioare"));
  add(...optionsRow("Tipul ferestrelor:", "tipFerestre",
    ["Simplu vitraj (vechi)", "Dublu vitraj standard", "Dublu vitraj Low-E", "Triplu vitraj", "Mixte"], true));
  add(blank(60));
  add(fieldRow2("Materialul ramei ferestrelor", "profilRam", "", false,     "Anul montajului ferestrelor actuale", "anMontajFerestre", "", false));
  add(blank(160));

  // ════════════════════════════════════════
  // 4. SISTEMUL DE ÎNCĂLZIRE
  // ════════════════════════════════════════
  add(sectionHeading("4", "Sistemul de încălzire"));
  add(blank(80));
  add(infoBox("Dacă dețineți cartea tehnică a cazanului / pompei de căldură, anexați-o. Informațiile se găsesc pe eticheta aparatului."));
  add(blank(80));
  add(...optionsRow("Sursa principală de căldură:", "tipSursa",
    ["Cazan gaz natural", "Cazan GPL", "Cazan motorină", "Cazan lemne / peleți", "Pompă de căldură", "Încălzire electrică", "Termoficare (CET)"], true));
  add(blank(60));
  add(...optionsRow("Combustibilul utilizat:", "combustibil",
    ["Gaz natural", "GPL", "Motorină", "Lemne", "Peleți", "Electricitate", "Termoficare"]));
  add(blank(60));
  add(fieldRow2("Marca și modelul cazanului (de pe eticheta aparatului)", "marcaCazan", "", false, "Anul fabricației cazanului", "anCazan", "", false));
  add(blank(60));
  add(fieldRow("Puterea nominală a cazanului (de pe eticheta aparatului)", "putereKw", "kW", false));
  add(blank(60));
  add(...optionsRow("Corpuri de încălzire:", "distributieIncalzire",
    ["Radiatoare (calorifere)", "Încălzire în pardoseală", "Fan-coil", "Sobe / șemineu", "Altele"]));
  add(blank(60));
  add(fieldRow2("Există robineți termostatați pe radiatoare?", "robinetiTermostati", "", false, "Există termostat de ambient programabil?", "termostatAmbient", "", false));
  add(blank(160));

  // ════════════════════════════════════════
  // 5. APA CALDĂ MENAJERĂ
  // ════════════════════════════════════════
  add(sectionHeading("5", "Prepararea apei calde menajere (ACM)"));
  add(blank(80));
  add(...optionsRow("Cum este preparată apa caldă menajeră?", "surseACM",
    ["Centrală termică combinată", "Boiler electric", "Boiler gaz (separat)", "Panouri solare termice", "Termoficare", "Instant gaz", "Pompă de căldură ACM"], true));
  add(blank(60));
  add(fieldRow("Volumul boilerului de acumulare (scris pe aparat)", "volumBoiler", "litri", false));
  add(blank(160));

  // ════════════════════════════════════════
  // 6. RĂCIRE ȘI AER CONDIȚIONAT
  // ════════════════════════════════════════
  add(sectionHeading("6", "Răcire și aer condiționat"));
  add(blank(80));
  add(...optionsRow("Există sistem de răcire / aer condiționat?", "areRacire",
    ["Nu", "Da — în unele încăperi", "Da — în toată clădirea"], true));
  add(blank(60));
  add(fieldRow("Tipul sistemului de răcire", "tipRacire", "", false));
  add(blank(160));

  // ════════════════════════════════════════
  // 7. VENTILAȚIE
  // ════════════════════════════════════════
  add(sectionHeading("7", "Sistemul de ventilație"));
  add(blank(80));
  add(...optionsRow("Tipul de ventilație al clădirii:", "tipVentilatie",
    ["Naturală (ferestre / fisuri)", "Mecanică fără recuperare de căldură", "Mecanică cu recuperare de căldură (VMC)"], true));
  add(blank(60));
  add(fieldRow("Marca și modelul unității de ventilație (VMC)", "marcaVMC", "", false));
  add(blank(160));

  // ════════════════════════════════════════
  // 8. ILUMINAT INTERIOR
  // ════════════════════════════════════════
  add(sectionHeading("8", "Iluminatul interior"));
  add(blank(80));
  add(...optionsRow("Tipul principal de iluminat:", "tipIluminat",
    ["Becuri cu incandescență (vechi)", "Halogeni", "Fluorescente / neoane", "LED — parțial", "LED — integral"], true));
  add(blank(60));
  add(...optionsRow("Sistem de control al iluminatului:", "controlIluminat",
    ["Nu există", "Senzori de prezență", "Timer programat", "Reglaj după lumina naturală"]));
  add(blank(160));

  // ════════════════════════════════════════
  // 9. SURSE DE ENERGIE REGENERABILĂ
  // ════════════════════════════════════════
  add(sectionHeading("9", "Surse de energie regenerabilă"));
  add(blank(80));
  add(subSection("9.1  Sistem fotovoltaic (panouri pentru producerea electricității)"));
  add(...optionsRow("Există sistem fotovoltaic instalat?", "arePV", ["Nu", "Da"], true));
  add(blank(60));
  add(fieldRow2("Puterea totală instalată a sistemului PV", "putereKwp", "kWp", false, "Numărul de panouri fotovoltaice", "numarPanouriPV", "buc.", false));
  add(blank(60));
  add(fieldRow("Orientarea panourilor fotovoltaice", "orientarePV", "", false));
  add(blank(60));
  add(fieldRow2("Producția anuală estimată a sistemului PV", "productieAnualaPV", "kWh/an", false, "Anul instalării sistemului fotovoltaic", "anPV", "", false));
  add(blank(80));
  add(subSection("9.2  Panouri solare termice (pentru producerea apei calde)"));
  add(...optionsRow("Există panouri solare termice instalate?", "areSolarTermicRenew", ["Nu", "Da"], true));
  add(blank(60));
  add(fieldRow2("Suprafața panourilor solare termice", "suprafataSolarRenew", "m²", false, "Orientarea panourilor solare termice", "orientareSolar", "", false));
  add(blank(60));
  add(fieldRow("Anul instalării panourilor solare termice", "anSolarTermic", "", false));
  add(blank(160));

  // ════════════════════════════════════════
  // 10. CONSUMURI ENERGETICE
  // ════════════════════════════════════════
  add(sectionHeading("10", "Consumuri energetice anuale"));
  add(blank(80));
  add(infoBox("Valorile se preiau din facturile ultimelor 12 luni. Aceste date permit compararea consumului real cu cel calculat prin bilanțul energetic. Anexați copii ale facturilor dacă este posibil."));
  add(blank(80));
  add(fieldRow2("Consum anual gaz natural", "consumGaz", "m³/an", false,   "Consum anual electricitate", "consumElectricitate", "kWh/an", false));
  add(blank(60));
  add(fieldRow2("Consum agent termic (termoficare / CET)", "consumTermoficare", "Gcal/an", false, "Consum anual lemne de foc", "consumLemn", "mc/an", false));
  add(blank(60));
  add(fieldRow2("Consum anual peleți / brichete", "consumPeleti", "tone/an", false, "Consum anual motorină / GPL", "consumCombLichid", "litri/an", false));
  add(blank(160));

  // ════════════════════════════════════════
  // 11. DOCUMENTE DISPONIBILE
  // ════════════════════════════════════════
  add(sectionHeading("11", "Documente disponibile pentru auditor"));
  add(blank(80));
  add(infoBox("Cu cât dispuneți de mai multe documente, cu atât calculul va fi mai precis. Lipsa unui document nu blochează auditul energetic."));
  add(blank(80));
  add(checkRow("Act de proprietate sau extras de carte funciară actualizat", "areActProp", "obligatoriu pentru identificare"));
  add(blank(40));
  add(checkRow("Autorizație de construire (numărul și data)", "areAutorizatie", "util pentru stabilirea anului construcției"));
  add(blank(40));
  add(checkRow("Planuri arhitecturale: plan parter, etaje, fațade, secțiuni", "arePlanuri", "esențial pentru calculul suprafețelor"));
  add(blank(40));
  add(checkRow("Cartea tehnică a clădirii (dosarul construcției)", "areCarteTehn"));
  add(blank(40));
  add(checkRow("Fișa tehnică / cartea cazanului sau pompei de căldură", "areFisaCazan", "conține randamentul și puterea nominală"));
  add(blank(40));
  add(checkRow("Fișa tehnică a sistemului de ventilație mecanică (dacă există)", "areFisaVMC"));
  add(blank(40));
  add(checkRow("Documentația sistemului fotovoltaic (contract, schemă electrică)", "areFisaPV"));
  add(blank(40));
  add(checkRow("Facturi gaz natural — ultimele 12 luni (sau ultimii 3 ani)", "areFacGaz"));
  add(blank(40));
  add(checkRow("Facturi electricitate — ultimele 12 luni (sau ultimii 3 ani)", "areFacElec"));
  add(blank(40));
  add(checkRow("Facturi agent termic (termoficare / CET) — ultimele 12 luni", "areFacTermo"));
  add(blank(40));
  add(checkRow("Fotografii ale clădirii: exterior (toate fațadele), interior, instalații", "areFotoExter", "foarte utile pentru evaluare"));
  add(blank(100));

  // ── Observații suplimentare ─────────────────────────────────────────────────
  add(new Paragraph({ children: [new TextRun({ text: "Alte informații sau observații pe care le considerați utile auditorului:", font: "Calibri", size: 19, bold: true, color: DARK })], spacing: { before: 0, after: 60 } }));
  const obsVal = has("alteDocumente") ? String(v("alteDocumente")) : "";
  add(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [new TableCell({
        borders: thinBorder,
        shading: obsVal ? { type: ShadingType.SOLID, color: "FFFBF0", fill: "FFFBF0" } : undefined,
        children: [new Paragraph({
          children: [new TextRun({ text: obsVal || " ", font: "Calibri", size: 20, color: DARK })],
          spacing: { before: 120, after: 400 },
        })],
      })],
    })],
  }));
  add(blank(160));

  // ════════════════════════════════════════
  // 12. PLANȘE ȘI SCHIȚE
  // ════════════════════════════════════════
  if (planuri.length > 0) {
    add(sectionHeading("12", "Planșe și schițe"));
    add(blank(80));

    // Convertim dataUrl în buffer pentru ImageRun
    const dataUrlToBuffer = (dataUrl) => {
      const base64 = dataUrl.split(",")[1];
      const binary = atob(base64);
      const buffer = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
      return buffer;
    };

    // Calculăm dimensiunile imaginii păstrând proporțiile (max 14cm lățime)
    const getImageDims = (dataUrl) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 530000; // EMU — ~14.8cm (lățimea utilă A4)
        const ratio = img.naturalWidth / img.naturalHeight;
        const w = maxW;
        const h = Math.round(maxW / ratio);
        resolve({ w, h });
      };
      img.src = dataUrl;
    });

    // Planșe pe două coloane
    const planChunks = [];
    for (let i = 0; i < planuri.length; i += 2) planChunks.push(planuri.slice(i, i + 2));

    for (const chunk of planChunks) {
      const cells = await Promise.all(chunk.map(async (plansa) => {
        const buf = dataUrlToBuffer(plansa.dataUrl);
        const ext = plansa.type.includes("png") ? "png" : "jpg";
        const { w, h } = await getImageDims(plansa.dataUrl);
        // Max lățime per coloană ~8.5cm = 3060000 EMU
        const maxColW = 3060000;
        const colW = maxColW;
        const colH = Math.round(maxColW / (w / h));

        return new TableCell({
          borders: thinBorder,
          children: [
            new Paragraph({
              children: [new ImageRun({ data: buf, transformation: { width: Math.round(colW / 9525), height: Math.round(colH / 9525) }, type: ext })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 40 },
            }),
            new Paragraph({
              children: [new TextRun({ text: plansa.name || plansa.fileName, font: "Calibri", size: 18, bold: true, color: DARK })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 60 },
            }),
          ],
        });
      }));

      // Dacă chunk are un singur element, adăugăm o celulă goală
      if (cells.length === 1) {
        cells.push(new TableCell({
          borders: { ...noBorder },
          children: [new Paragraph({ children: [] })],
        }));
      }

      add(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        rows: [new TableRow({ children: cells })],
      }));
      add(blank(120));
    }
  }

  // ── Declarație și semnătură ─────────────────────────────────────────────────
  add(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [new TableCell({
        shading: { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT },
        borders: { ...noBorder, left: { style: BorderStyle.SINGLE, size: 12, color: DARK } },
        children: [
          new Paragraph({ children: [new TextRun({ text: "  Declarație", font: "Calibri", size: 20, bold: true, color: DARK })], spacing: { before: 80, after: 40 } }),
          new Paragraph({ children: [new TextRun({ text: "  Subsemnatul/a confirm că informațiile furnizate în prezentul formular sunt corecte și complete, în conformitate cu documentele deținute și cu situația reală a clădirii.", font: "Calibri", size: 18, color: GRAY })], spacing: { before: 0, after: 80 } }),
        ],
      })],
    })],
  }));
  add(blank(120));
  add(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: noBorder,
          children: [
            new Paragraph({ children: [new TextRun({ text: "Data completării:", font: "Calibri", size: 18, color: GRAY })], spacing: { before: 0, after: 20 } }),
            new Paragraph({ children: [new TextRun({ text: ".................................................", font: "Calibri", size: 20 })], spacing: { before: 0, after: 0 } }),
          ],
        }),
        new TableCell({
          width: { size: 400, type: WidthType.DXA },
          borders: noBorder,
          children: [new Paragraph({ children: [] })],
        }),
        new TableCell({
          borders: noBorder,
          children: [
            new Paragraph({ children: [new TextRun({ text: "Semnătura proprietarului:", font: "Calibri", size: 18, color: GRAY })], spacing: { before: 0, after: 20 } }),
            new Paragraph({ children: [new TextRun({ text: ".................................................", font: "Calibri", size: 20 })], spacing: { before: 0, after: 0 } }),
          ],
        }),
      ],
    })],
  }));

  // ════════════════════════════════════════════════════════════════════════════
  //  CREARE DOCUMENT
  // ════════════════════════════════════════════════════════════════════════════
  const doc = new Document({
    creator: "Zephren Energy Performance Calculator",
    title: "Formular Date Client — Audit Energetic",
    description: "Formular de colectare date pentru calculul performanței energetice conform Mc 001-2022",
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 20, color: DARK } },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.8),
            bottom: convertInchesToTwip(0.8),
            left: convertInchesToTwip(0.9),
            right: convertInchesToTwip(0.9),
          },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `formular-date-client-${new Date().toISOString().slice(0, 10)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Date pentru sectiuni ─────────────────────────────────────────────────────
const SECTIONS_META = [
  { key: "identificare", required: ["numeProprietar", "telefonProprietar", "adresaCompleta", "judet", "localitate", "anConstructie", "tipClădire", "scopulCPE"] },
  { key: "geometrie",    required: ["arieTotala", "numarEtaje", "orientareFațadaPrincipala"] },
  { key: "anvelopa",     required: ["materialPereti", "grosimePereti", "tipFerestre"] },
  { key: "incalzire",    required: ["tipSursa", "combustibil"] },
  { key: "acm",          required: ["surseACM"] },
  { key: "racire",       required: ["areRacire"] },
  { key: "ventilatie",   required: ["tipVentilatie"] },
  { key: "iluminat",     required: ["tipIluminat"] },
  { key: "regenerabile", required: ["arePV", "areSolarTermic"] },
  { key: "consum",       required: [] },
  { key: "documente",    required: [] },
];

// ─── COMPONENTA PRINCIPALA ────────────────────────────────────────────────────
export default function ClientInputForm({ onDataChange }) {
  const stored = (() => { try { return JSON.parse(localStorage.getItem("clientFormData") || "{}"); } catch { return {}; } })();
  const [data, setData] = useState(stored);
  const [planuri, setPlanuri] = useState(() => {
    try { return JSON.parse(localStorage.getItem("clientFormPlanuri") || "[]"); } catch { return []; }
  });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    localStorage.setItem("clientFormData", JSON.stringify(data));
    onDataChange?.(data);
  }, [data]);

  useEffect(() => {
    localStorage.setItem("clientFormPlanuri", JSON.stringify(planuri));
  }, [planuri]);

  const addPlanuri = (files) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") return;
      if (file.size > 10 * 1024 * 1024) { alert(`Fișierul "${file.name}" depășește 10 MB.`); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        setPlanuri(prev => [...prev, {
          id: Date.now() + Math.random(),
          name: file.name.replace(/\.[^.]+$/, ""),
          fileName: file.name,
          type: file.type,
          dataUrl: e.target.result,
          size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePlansa = (id) => setPlanuri(prev => prev.filter(p => p.id !== id));
  const renamePlansa = (id, name) => setPlanuri(prev => prev.map(p => p.id === id ? { ...p, name } : p));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Formular Date Clădire</h2>
            <p className="text-sm text-white/50 mt-1">
              Completați câmpurile de mai jos pentru a permite auditorului energetic să calculeze performanța clădirii dvs.
              Câmpurile marcate cu <span className="text-amber-400 font-bold">*</span> sunt obligatorii.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => exportDOCX(data, planuri)}
              className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 text-blue-300 rounded-lg text-sm font-medium transition-all">
              ↓ DOCX
            </button>
            <button onClick={() => exportJSON(data)}
              className="px-4 py-2 bg-white/5 border border-white/10 hover:border-amber-500/30 text-white/70 hover:text-amber-300 rounded-lg text-sm transition-all">
              ↓ JSON
            </button>
            <button onClick={() => { if (confirm("Ștergeți toate datele introduse?")) { setData({}); localStorage.removeItem("clientFormData"); } }}
              className="px-4 py-2 bg-white/5 border border-white/10 hover:border-red-500/30 text-white/40 hover:text-red-400 rounded-lg text-sm transition-all">
              ✕
            </button>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar sections={SECTIONS_META} data={data} />
        </div>
      </div>

      {/* 1. IDENTIFICARE */}
      <Section icon="👤" title="Date de identificare" subtitle="Informații despre proprietar și clădire">
        <Field label="Nume și prenume proprietar" required>
          <FInput value={data.numeProprietar} onChange={v => set("numeProprietar", v)} placeholder="ex: Ionescu Maria" />
        </Field>
        <Field label="Telefon" required>
          <FInput value={data.telefonProprietar} onChange={v => set("telefonProprietar", v)} placeholder="07xx xxx xxx" type="tel" />
        </Field>
        <Field label="Email">
          <FInput value={data.emailProprietar} onChange={v => set("emailProprietar", v)} placeholder="adresa@email.ro" type="email" />
        </Field>
        <Field label="Județ" required>
          <FSelect value={data.judet} onChange={v => set("judet", v)} options={[
            "Alba","Arad","Argeș","Bacău","Bihor","Bistrița-Năsăud","Botoșani","Brăila","Brașov",
            "București","Buzău","Călărași","Caraș-Severin","Cluj","Constanța","Covasna","Dâmbovița",
            "Dolj","Galați","Giurgiu","Gorj","Harghita","Hunedoara","Ialomița","Iași","Ilfov",
            "Maramureș","Mehedinți","Mureș","Neamț","Olt","Prahova","Sălaj","Satu Mare",
            "Sibiu","Suceava","Teleorman","Timiș","Tulcea","Vâlcea","Vaslui","Vrancea"
          ]} />
        </Field>
        <Field label="Localitate" required>
          <FInput value={data.localitate} onChange={v => set("localitate", v)} placeholder="ex: Cluj-Napoca" />
        </Field>
        <Field label="Adresă completă (stradă, număr)" required span2>
          <FInput value={data.adresaCompleta} onChange={v => set("adresaCompleta", v)} placeholder="ex: Str. Florilor nr. 12, ap. 3" />
        </Field>
        <Field label="Tipul clădirii" required>
          <FSelect value={data.tipClădire} onChange={v => set("tipClădire", v)} options={[
            { value: "casa_unifamiliala", label: "Casă unifamilială (casă individuală)" },
            { value: "apartament", label: "Apartament în bloc" },
            { value: "bloc_locuinte", label: "Bloc de locuințe (întreg)" },
            { value: "birouri", label: "Clădire de birouri" },
            { value: "comercial", label: "Spațiu comercial" },
            { value: "institutie", label: "Instituție publică / școală / spital" },
            { value: "industrial", label: "Hală industrială / depozit" },
            { value: "altul", label: "Alt tip" },
          ]} />
        </Field>
        <Field label="Anul construcției (aproximativ)" required>
          <FInput value={data.anConstructie} onChange={v => set("anConstructie", v)} type="number" min={1800} max={2025} placeholder="ex: 1978" />
        </Field>
        <Field label="Număr cadastral" hint="Din actul de proprietate sau extras CF">
          <FInput value={data.nrCadastral} onChange={v => set("nrCadastral", v)} placeholder="ex: 12345" />
        </Field>
        <Field label="Număr apartamente în clădire" hint="Completați doar dacă este bloc de locuințe">
          <FInput value={data.numarApartamenteBloc} onChange={v => set("numarApartamenteBloc", v)} type="number" min={1} placeholder="ex: 32" unit="buc." />
        </Field>
        <Field label="Scopul pentru care solicitați auditul energetic / CPE" required span2>
          <FRadio value={data.scopulCPE} onChange={v => set("scopulCPE", v)}
            options={["Vânzare", "Închiriere", "Recepție lucrare nouă", "Refinanțare credit", "Reabilitare termică", "Audit voluntar"]} />
        </Field>
        <Field label="Au fost efectuate lucrări de reabilitare?" span2>
          <FRadio value={data.reabilitarePrecedenta} onChange={v => set("reabilitarePrecedenta", v)}
            options={["Nu", "Da — parțial", "Da — integral"]} />
        </Field>
        {(data.reabilitarePrecedenta || "").startsWith("Da") && (
          <Field label="Ce lucrări de reabilitare au fost efectuate?" span2
            hint="ex: schimb ferestre, termoizolație fațadă, schimb cazan">
            <textarea value={data.descriereReabilitare ?? ""} onChange={e => set("descriereReabilitare", e.target.value)}
              rows={2} placeholder="Descrieți pe scurt..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20
                focus:outline-none focus:border-amber-500/40 transition-all resize-none" />
          </Field>
        )}
      </Section>

      {/* 2. GEOMETRIE */}
      <Section icon="📐" title="Dimensiunile clădirii" subtitle="Suprafețe și dimensiuni principale">
        <Field label="Suprafața totală construită (m²)" required
          hint="Suma tuturor nivelurilor — din act sau estimată">
          <FInput value={data.arieTotala} onChange={v => set("arieTotala", v)} type="number" min={10} placeholder="ex: 120" unit="m²" />
        </Field>
        <Field label="Suprafața utilă totală (m²)"
          hint="Suprafața efectiv locuibilă/utilizabilă, fără ziduri">
          <FInput value={data.arieUtila} onChange={v => set("arieUtila", v)} type="number" min={5} placeholder="ex: 100" unit="m²" />
        </Field>
        <Field label="Număr niveluri (fără subsol)" required>
          <FSelect value={data.numarEtaje} onChange={v => set("numarEtaje", v)} options={["Parter (P)","P+1","P+2","P+3","P+4","P+5 sau mai multe"]} />
        </Field>
        <Field label="Înălțimea unui nivel (m)"
          hint="De la pardoseală la tavan">
          <FInput value={data.inaltimeNivel} onChange={v => set("inaltimeNivel", v)} type="number" min={2} max={6} placeholder="ex: 2.8" unit="m" />
        </Field>
        <Field label="Orientarea fațadei principale" required
          hint="Direcția spre care este orientată fațada cu cele mai multe ferestre">
          <FRadio value={data.orientareFațadaPrincipala} onChange={v => set("orientareFațadaPrincipala", v)}
            options={["Nord","Nord-Est","Est","Sud-Est","Sud","Sud-Vest","Vest","Nord-Vest"]} />
        </Field>
        <Field label="Există subsol sau demisol?">
          <FRadio value={data.areSubsol} onChange={v => set("areSubsol", v)}
            options={["Nu","Da — neîncălzit","Da — încălzit / locuit"]} />
        </Field>
        <Field label="Există pod / mansardă?">
          <FRadio value={data.arePod} onChange={v => set("arePod", v)}
            options={["Nu","Pod neamenajat","Mansardă amenajată"]} />
        </Field>
      </Section>

      {/* 3. ANVELOPA */}
      <Section icon="🧱" title="Pereți, acoperiș și ferestre" subtitle="Materialele și izolația clădirii">
        <Field label="Materialul principal al pereților exteriori" required>
          <FSelect value={data.materialPereti} onChange={v => set("materialPereti", v)} options={[
            { value: "caramida_plina", label: "Cărămidă plină (veche, înainte de 1990)" },
            { value: "caramida_goluri", label: "Cărămidă cu goluri / BCA" },
            { value: "beton", label: "Beton (panou prefabricat / monolit)" },
            { value: "lemn", label: "Lemn / structură lemn" },
            { value: "metal", label: "Metal / structură metalică" },
            { value: "mixt", label: "Mixt / nu știu" },
          ]} />
        </Field>
        <Field label="Există izolație termică pe pereții exteriori?">
          <FRadio value={data.areIzolatiePeretiExteriori} onChange={v => set("areIzolatiePeretiExteriori", v)}
            options={["Nu","Da","Nu știu"]} />
        </Field>
        <Field label="Tipul acoperișului / planșeului superior" required>
          <FSelect value={data.tipAcoperis} onChange={v => set("tipAcoperis", v)} options={[
            { value: "terasa_necirc", label: "Terasă necirculabilă (plată)" },
            { value: "terasa_circ", label: "Terasă circulabilă" },
            { value: "sarpanta_tigla", label: "Șarpantă cu țiglă / olane" },
            { value: "sarpanta_tabla", label: "Șarpantă cu tablă" },
            { value: "sarpanta_onduline", label: "Șarpantă cu onduline / materiale ușoare" },
          ]} />
        </Field>
        <Field label="Există izolație termică la acoperiș/pod?">
          <FRadio value={data.areIzolatieAcoperis} onChange={v => set("areIzolatieAcoperis", v)}
            options={["Nu","Da","Nu știu"]} />
        </Field>
        <Field label="Tipul ferestrelor" required>
          <FSelect value={data.tipFerestre} onChange={v => set("tipFerestre", v)} options={[
            { value: "simplu_vitraj", label: "Simplu vitraj (geam simplu — vechi)" },
            { value: "dublu_vechi", label: "Dublu vitraj obișnuit (termopan standard)" },
            { value: "dublu_lowe", label: "Dublu vitraj cu sticlă low-e (mai nou)" },
            { value: "triplu", label: "Triplu vitraj" },
            { value: "mixt", label: "Mix — unele schimbate, altele nu" },
          ]} />
        </Field>
        <Field label="Materialul ramei ferestrelor">
          <FSelect value={data.profilRam} onChange={v => set("profilRam", v)} options={[
            "Lemn (vechi)","PVC","Aluminiu fără barieră termică","Aluminiu cu barieră termică","Lemn stratificat","Nu știu"
          ]} />
        </Field>
        <Field label="Anul montajului ferestrelor actuale">
          <FInput value={data.anMontajFerestre} onChange={v => set("anMontajFerestre", v)} type="number" min={1950} max={2025} placeholder="ex: 2010" />
        </Field>
      </Section>

      {/* 4. INCALZIRE */}
      <Section icon="🔥" title="Sistemul de încălzire" subtitle="Cum este încălzită clădirea">
        <Field label="Sursa principală de căldură" required>
          <FSelect value={data.tipSursa} onChange={v => set("tipSursa", v)} options={[
            { value: "cazan_gaz", label: "Cazan pe gaz natural (centrală termică)" },
            { value: "cazan_gpl", label: "Cazan pe GPL (butelie / rezervor)" },
            { value: "cazan_motorina", label: "Cazan pe motorină / păcură" },
            { value: "cazan_lemn", label: "Cazan pe lemne / peleți / brichete" },
            { value: "pompa_caldura", label: "Pompă de căldură" },
            { value: "electric_rezistive", label: "Încălzire electrică (calorifere electrice / rezistive)" },
            { value: "termoficare", label: "Agent termic de la rețea (termoficare / CET)" },
            { value: "sobe", label: "Sobe individuale (fiecare cameră separat)" },
            { value: "fara", label: "Nu există sistem de încălzire" },
          ]} />
        </Field>
        <Field label="Combustibilul folosit" required>
          <FSelect value={data.combustibil} onChange={v => set("combustibil", v)} options={[
            "Gaz natural","GPL","Motorină / păcură","Lemne","Peleți","Brichete","Electricitate","Termoficare","Nu știu"
          ]} />
        </Field>
        {!["termoficare","sobe","fara","electric_rezistive"].includes(data.tipSursa) && (
          <>
            <Field label="Marca și modelul cazanului / pompei de căldură"
              hint="Scrieți ce este menționat pe aparatul din centrală">
              <FInput value={data.marcaCazan} onChange={v => set("marcaCazan", v)} placeholder="ex: Vaillant ecoTEC Plus 24" />
            </Field>
            <Field label="Anul fabricației">
              <FInput value={data.anCazan} onChange={v => set("anCazan", v)} type="number" min={1980} max={2025} placeholder="ex: 2018" />
            </Field>
            <Field label="Puterea cazanului" hint="Scrisă pe eticheta aparatului">
              <FInput value={data.putereKw} onChange={v => set("putereKw", v)} type="number" min={5} max={500} placeholder="ex: 24" unit="kW" />
            </Field>
          </>
        )}
        <Field label="Cum este distribuită căldura în cameră?">
          <FSelect value={data.distributieIncalzire} onChange={v => set("distributieIncalzire", v)} options={[
            { value: "radiatoare", label: "Radiatoare (calorifere)" },
            { value: "pardoseala_calda", label: "Încălzire în pardoseală (pardoseală caldă)" },
            { value: "fan_coil", label: "Fan-coil (aparate cu ventilator)" },
            { value: "aer_cald", label: "Aer cald (instalație centrală de aer)" },
            { value: "sobe", label: "Sobe / șeminee individuale" },
            { value: "mixt", label: "Mixt" },
          ]} />
        </Field>
        <Field label="Există robineți termostatați pe radiatoare?">
          <FRadio value={data.robinetiTermostati} onChange={v => set("robinetiTermostati", v)}
            options={["Nu","Da — la unele","Da — la toate"]} />
        </Field>
        <Field label="Există termostat de ambient programabil?">
          <FRadio value={data.termostatAmbient} onChange={v => set("termostatAmbient", v)}
            options={["Nu","Da — simplu","Da — programabil","Da — smart"]} />
        </Field>
      </Section>

      {/* 5. ACM */}
      <Section icon="🚿" title="Apa caldă menajeră" subtitle="Cum este preparată apa caldă">
        <Field label="Cum este preparată apa caldă?" required>
          <FSelect value={data.surseACM} onChange={v => set("surseACM", v)} options={[
            { value: "cazan_combinat", label: "Centrală termică combinată (aceeași cu încălzirea)" },
            { value: "boiler_electric", label: "Boiler electric (rezervor cu rezistență)" },
            { value: "boiler_gaz", label: "Boiler pe gaz (separat de centrală)" },
            { value: "solar_termic", label: "Panouri solare termice" },
            { value: "termoficare", label: "De la rețeaua de termoficare" },
            { value: "instant_gaz", label: "Instant gaz (boiler fără rezervor)" },
            { value: "pompa_caldura_acm", label: "Pompă de căldură pentru ACM" },
          ]} />
        </Field>
        <Field label="Volumul boilerului (dacă există)"
          hint="Scrieți în litri — de obicei scris pe aparat">
          <FInput value={data.volumBoiler} onChange={v => set("volumBoiler", v)} type="number" min={10} max={1000} placeholder="ex: 80" unit="litri" />
        </Field>
        {data.surseACM === "solar_termic" && (
          <>
            <Field label="Suprafața panourilor solare (m²)">
              <FInput value={data.suprafataSolarTermic} onChange={v => set("suprafataSolarTermic", v)} type="number" min={1} max={100} placeholder="ex: 4" unit="m²" />
            </Field>
            <Field label="Anul instalării panourilor solare">
              <FInput value={data.anSolarTermic} onChange={v => set("anSolarTermic", v)} type="number" min={1990} max={2025} placeholder="ex: 2015" />
            </Field>
          </>
        )}
      </Section>

      {/* 6. RACIRE */}
      <Section icon="❄️" title="Răcire și aer condiționat" subtitle="Sistemul de răcire în sezonul cald">
        <Field label="Există sistem de răcire / aer condiționat?" required span2>
          <FRadio value={data.areRacire} onChange={v => set("areRacire", v)}
            options={["Nu","Da — în unele camere","Da — în toată clădirea"]} />
        </Field>
        {data.areRacire && data.areRacire !== "Nu" && (
          <Field label="Tipul sistemului de răcire">
            <FSelect value={data.tipRacire} onChange={v => set("tipRacire", v)} options={[
              "Aparat split (aer condiționat perete)","Aparat multi-split","Aparat portabil","Chiller (aparat central)","Altul"
            ]} />
          </Field>
        )}
      </Section>

      {/* 7. VENTILATIE */}
      <Section icon="💨" title="Ventilație" subtitle="Cum este asigurată circulația aerului">
        <Field label="Tipul de ventilație al clădirii" required span2>
          <FSelect value={data.tipVentilatie} onChange={v => set("tipVentilatie", v)} options={[
            { value: "naturala", label: "Naturală — prin ferestre deschise și fisuri" },
            { value: "mecanica_fara", label: "Mecanică fără recuperare de căldură (hote, ventilatoare de baie)" },
            { value: "mecanica_cu", label: "Mecanică cu recuperare de căldură (VMC cu recuperator)" },
            { value: "nu_stiu", label: "Nu știu" },
          ]} />
        </Field>
        {data.tipVentilatie === "mecanica_cu" && (
          <Field label="Marca și modelul unității de ventilație">
            <FInput value={data.marcaVMC} onChange={v => set("marcaVMC", v)} placeholder="ex: Zehnder ComfoAir 200" />
          </Field>
        )}
      </Section>

      {/* 8. ILUMINAT */}
      <Section icon="💡" title="Iluminat interior" subtitle="Tipul surselor de lumină utilizate">
        <Field label="Tipul principal de iluminat" required span2>
          <FSelect value={data.tipIluminat} onChange={v => set("tipIluminat", v)} options={[
            { value: "becuri_clasice", label: "Becuri clasice cu incandescență (vechi, cu filament)" },
            { value: "halogeni", label: "Halogeni" },
            { value: "fluorescente", label: "Fluorescente / neoane" },
            { value: "led_partial", label: "LED — parțial (unele schimbate)" },
            { value: "led_total", label: "LED — toată clădirea" },
          ]} />
        </Field>
        <Field label="Există sisteme de control automat al iluminatului?">
          <FRadio value={data.controlIluminat} onChange={v => set("controlIluminat", v)}
            options={["Nu","Senzori de prezență","Timer programat","Reglaj după lumina naturală"]} />
        </Field>
      </Section>

      {/* 9. REGENERABILE */}
      <Section icon="☀️" title="Surse de energie regenerabilă" subtitle="Panouri fotovoltaice, solare sau alte surse">
        <Field label="Există sistem fotovoltaic (panouri pentru electricitate)?" required span2>
          <FRadio value={data.arePV} onChange={v => set("arePV", v)} options={["Nu","Da"]} />
        </Field>
        {data.arePV === "Da" && (
          <>
            <Field label="Puterea instalată a sistemului PV"
              hint="De obicei scrisă pe invertor sau în documentul de instalare">
              <FInput value={data.putereKwp} onChange={v => set("putereKwp", v)} type="number" min={0.5} max={1000} placeholder="ex: 5" unit="kWp" />
            </Field>
            <Field label="Numărul de panouri PV">
              <FInput value={data.numarPanouriPV} onChange={v => set("numarPanouriPV", v)} type="number" min={1} max={500} placeholder="ex: 12" />
            </Field>
            <Field label="Orientarea panourilor fotovoltaice">
              <FRadio value={data.orientarePV} onChange={v => set("orientarePV", v)}
                options={["Sud","Sud-Est","Sud-Vest","Est","Vest","Plan orizontal"]} />
            </Field>
<Field label="Anul instalării sistemului PV">
              <FInput value={data.anPV} onChange={v => set("anPV", v)} type="number" min={2000} max={2025} placeholder="ex: 2022" />
            </Field>
            <Field label="Producție anuală estimată (dacă o știți)"
              hint="Din aplicația invertorului sau de la instalator">
              <FInput value={data.productieAnualaPV} onChange={v => set("productieAnualaPV", v)} type="number" min={0} placeholder="ex: 5500" unit="kWh/an" />
            </Field>
          </>
        )}
        <Field label="Există panouri solare termice (pentru apă caldă)?" required span2>
          <FRadio value={data.areSolarTermicRenew} onChange={v => set("areSolarTermicRenew", v)} options={["Nu","Da"]} />
        </Field>
        {data.areSolarTermicRenew === "Da" && (
          <>
            <Field label="Suprafața panourilor solare (m²)">
              <FInput value={data.suprafataSolarRenew} onChange={v => set("suprafataSolarRenew", v)} type="number" min={1} max={100} placeholder="ex: 4" unit="m²" />
            </Field>
            <Field label="Orientarea panourilor solare termice">
              <FRadio value={data.orientareSolar} onChange={v => set("orientareSolar", v)}
                options={["Sud","Sud-Est","Sud-Vest","Est","Vest"]} />
            </Field>
          </>
        )}
      </Section>

      {/* 10. CONSUM */}
      <Section icon="📊" title="Consumuri energetice" subtitle="Din facturi — ultimele 12 luni (dacă sunt disponibile)">
        <Field label="Consum anual gaz natural"
          hint="Suma lunilor din ultimele 12 facturi">
          <FInput value={data.consumGaz} onChange={v => set("consumGaz", v)} type="number" min={0} placeholder="ex: 1200" unit="m³/an" />
        </Field>
        <Field label="Consum anual electricitate"
          hint="Suma lunilor din ultimele 12 facturi">
          <FInput value={data.consumElectricitate} onChange={v => set("consumElectricitate", v)} type="number" min={0} placeholder="ex: 3500" unit="kWh/an" />
        </Field>
        <Field label="Consum anual lemne de foc">
          <FInput value={data.consumLemn} onChange={v => set("consumLemn", v)} type="number" min={0} placeholder="ex: 5" unit="mc/an" />
        </Field>
        <Field label="Consum anual peleți">
          <FInput value={data.consumPeleti} onChange={v => set("consumPeleti", v)} type="number" min={0} placeholder="ex: 2" unit="tone/an" />
        </Field>
        <Field label="Consum anual agent termic termoficare">
          <FInput value={data.consumTermoficare} onChange={v => set("consumTermoficare", v)} type="number" min={0} placeholder="ex: 10" unit="Gcal/an" />
        </Field>
        <Field label="Numărul de persoane care locuiesc permanent">
          <FInput value={data.numarOcupanti} onChange={v => set("numarOcupanti", v)} type="number" min={1} max={50} placeholder="ex: 4" unit="pers." />
        </Field>
      </Section>

      {/* 11. DOCUMENTE DISPONIBILE */}
      <Section icon="📁" title="Documente disponibile" subtitle="Bifați documentele pe care le puteți pune la dispoziția auditorului">
        <div className="md:col-span-2 space-y-3">
          {[
            { key: "areActProp",   label: "Act de proprietate / extras de carte funciară" },
            { key: "areAutorizatie", label: "Autorizație de construire", hint: "Utilă pentru stabilirea anului construcției" },
            { key: "arePlanuri",   label: "Planuri arhitecturale (plan parter, etaje, fațade)", hint: "Dacă există proiect tehnic" },
            { key: "areCarteTehn", label: "Cartea tehnică a clădirii" },
            { key: "areFisaCazan", label: "Fișa tehnică / cartea cazanului sau pompei de căldură" },
            { key: "areFisaVMC",   label: "Fișa tehnică a sistemului de ventilație (dacă există)" },
            { key: "areFisaPV",    label: "Documentația sistemului fotovoltaic (dacă există)" },
            { key: "areFacGaz",    label: "Facturi gaz — ultimele 12 luni" },
            { key: "areFacElec",   label: "Facturi electricitate — ultimele 12 luni" },
            { key: "areFacTermo",  label: "Facturi termoficare — ultimele 12 luni (dacă este cazul)" },
            { key: "areFotoExter", label: "Fotografii ale clădirii (exterior, interior, instalații)", hint: "Foarte utile pentru auditor" },
          ].map(doc => (
            <FCheckbox key={doc.key}
              label={doc.label}
              hint={doc.hint}
              checked={!!data[doc.key]}
              onChange={v => set(doc.key, v)}
            />
          ))}
        </div>
        <Field label="Alte documente sau informații suplimentare" span2>
          <textarea value={data.alteDocumente ?? ""} onChange={e => set("alteDocumente", e.target.value)}
            rows={3} placeholder="Orice altă informație pe care o considerați utilă auditorului..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20
              focus:outline-none focus:border-amber-500/40 transition-all resize-none" />
        </Field>
      </Section>

      {/* 12. PLANȘE */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <span className="text-2xl">📐</span>
          <div>
            <h3 className="font-semibold text-white/90">Planșe și schițe</h3>
            <p className="text-xs text-white/40 mt-0.5">Planuri arhitecturale, schițe, fotografii — vor fi incluse în documentul DOCX</p>
          </div>
          <span className="ml-auto text-xs text-white/30">{planuri.length} fișier{planuri.length !== 1 ? "e" : ""} adăugate</span>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); addPlanuri(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
              dragOver
                ? "border-amber-500/60 bg-amber-500/10"
                : "border-white/15 hover:border-white/30 hover:bg-white/[0.02]"
            )}
          >
            <div className="text-3xl mb-2">📎</div>
            <p className="text-sm text-white/60 font-medium">Trageți fișierele aici sau faceți click pentru a le selecta</p>
            <p className="text-xs text-white/30 mt-1">Imagini (JPG, PNG, WEBP) — max. 10 MB per fișier</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => addPlanuri(e.target.files)}
            />
          </div>

          {/* Grid planșe */}
          {planuri.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {planuri.map(plansa => (
                <div key={plansa.id} className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden group">
                  {/* Preview imagine */}
                  <div className="relative aspect-[4/3] bg-black/20">
                    <img
                      src={plansa.dataUrl}
                      alt={plansa.name}
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => removePlansa(plansa.id)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >✕</button>
                  </div>
                  {/* Etichetă editabilă */}
                  <div className="px-3 py-2">
                    <input
                      value={plansa.name}
                      onChange={e => renamePlansa(plansa.id, e.target.value)}
                      className="w-full bg-transparent text-xs text-white/70 border-b border-white/10 focus:border-amber-500/40 focus:outline-none pb-0.5"
                      placeholder="Denumire planșă..."
                    />
                    <p className="text-[10px] text-white/25 mt-1">{plansa.fileName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl px-6 py-4">
        <ProgressBar sections={SECTIONS_META} data={data} />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => exportDOCX(data, planuri)}
            className="px-6 py-2.5 bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 text-blue-300 rounded-xl text-sm font-medium transition-all">
            ↓ Descarcă DOCX
          </button>
          <button onClick={() => exportJSON(data)}
            className="px-6 py-2.5 bg-white/5 border border-white/10 hover:border-white/20 text-white/60 hover:text-white/80 rounded-xl text-sm transition-all">
            ↓ JSON
          </button>
        </div>
      </div>

    </div>
  );
}
