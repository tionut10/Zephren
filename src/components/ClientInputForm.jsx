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

// ─── Download Client Form Template ────────────────────────────────────────
function downloadClientFormTemplate() {
  const a = document.createElement("a");
  a.href = "/templates/Formular_Client_Audit_Energetic.docx";
  a.download = "Formular_Client_Audit_Energetic.docx";
  a.click();
}

// ─── Export DOCX ─────────────────────────────────────────────────────────────
async function exportDOCX(data, planuri = []) {
  const v   = (key) => data[key] ?? "";
  const has = (key) => { const val = data[key]; return val !== undefined && val !== "" && val !== null && val !== false; };
  const str = (key, unit = "") => has(key) ? String(v(key)) + (unit ? " " + unit : "") : "";

  // ─── Paletă culori ────────────────────────────────────────────────────────────
  const AMBER  = "F59E0B";
  const AMB_LT = "FFFBEB";
  const DARK   = "1E293B";
  const GRAY   = "475569";
  const LGRAY  = "94A3B8";
  const LIGHT  = "F8FAFC";
  const GREEN  = "16A34A";
  const BORDER = "E2E8F0";
  const WHITE  = "FFFFFF";
  const BLUE   = "1E40AF";
  const BLU_LT = "EFF6FF";

  const nb = () => ({
    top:    { style: BorderStyle.NONE, size: 0, color: WHITE },
    bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
    left:   { style: BorderStyle.NONE, size: 0, color: WHITE },
    right:  { style: BorderStyle.NONE, size: 0, color: WHITE },
  });
  const bd = (color = BORDER, sz = 4) => ({ style: BorderStyle.SINGLE, size: sz, color });

  const children = [];
  const add = (...items) => items.flat().forEach(i => i && children.push(i));
  const sp  = (after = 80) => new Paragraph({ spacing: { before: 0, after } });

  // ─── Helper: titlu secțiune ────────────────────────────────────────────────────
  const sectionHead = (nr, title) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 220, type: WidthType.DXA }, shading: { type: ShadingType.SOLID, color: AMBER, fill: AMBER }, borders: nb(), children: [sp(0)] }),
      new TableCell({
        shading: { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT }, borders: nb(),
        children: [new Paragraph({
          children: [
            new TextRun({ text: nr + ".  ", font: "Calibri", size: 28, bold: true, color: AMBER }),
            new TextRun({ text: title.toUpperCase(), font: "Calibri", size: 26, bold: true, color: DARK }),
          ],
          spacing: { before: 100, after: 100 }, indent: { left: 160 },
        })],
      }),
    ]})]
  });

  // ─── Helper: etichetă câmp ────────────────────────────────────────────────────
  const lbl = (text, req = false) => new Paragraph({
    children: [
      new TextRun({ text: text.toUpperCase(), font: "Calibri", size: 15, bold: true, color: LGRAY }),
      req ? new TextRun({ text: "  \u2731", font: "Calibri", size: 15, bold: true, color: AMBER }) : new TextRun({ text: "" }),
    ],
    spacing: { before: 140, after: 40 },
  });

  // ─── Helper: valoare câmp ─────────────────────────────────────────────────────
  const valBox = (key, unit = "") => {
    const txt = str(key, unit);
    return txt
      ? new Paragraph({
          children: [new TextRun({ text: txt, font: "Calibri", size: 23, bold: true, color: DARK })],
          shading: { type: ShadingType.SOLID, color: AMB_LT, fill: AMB_LT },
          border: { left: { style: BorderStyle.SINGLE, size: 14, color: AMBER } },
          indent: { left: 120 }, spacing: { before: 0, after: 60 },
        })
      : new Paragraph({
          children: [new TextRun({ text: " ", font: "Calibri", size: 21, color: WHITE })],
          border: { bottom: bd(BORDER, 6) },
          spacing: { before: 0, after: 80 },
        });
  };

  // ─── Helper: câmp pe lățime întreagă ─────────────────────────────────────────
  const field = (label, key, unit = "", req = false) => [lbl(label, req), valBox(key, unit)];

  // ─── Helper: două câmpuri pe un rând ─────────────────────────────────────────
  const field2 = (l1, k1, u1, r1, l2, k2, u2, r2) => {
    const mkCell = (label, key, unit, req) => new TableCell({
      borders: nb(), width: { size: 4600, type: WidthType.DXA },
      children: [lbl(label, req), valBox(key, unit)],
    });
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED,
      rows: [new TableRow({ children: [
        mkCell(l1, k1, u1, r1),
        new TableCell({ width: { size: 300, type: WidthType.DXA }, borders: nb(), children: [sp(0)] }),
        mkCell(l2, k2, u2, r2),
      ]})]
    });
  };

  // ─── Helper: opțiuni radio (2 pe rând) ────────────────────────────────────────
  const radioGroup = (label, key, opts, req = false) => {
    const sel = v(key);
    const mkOpt = (opt) => {
      if (!opt) return new TableCell({ borders: nb(), children: [sp(0)] });
      const on = sel === opt;
      return new TableCell({
        borders: { top: bd(on ? AMBER : BORDER), bottom: bd(on ? AMBER : BORDER), left: bd(on ? AMBER : BORDER), right: bd(on ? AMBER : BORDER) },
        shading: on ? { type: ShadingType.SOLID, color: AMBER, fill: AMBER } : { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          children: [
            new TextRun({ text: on ? "\u2713  " : "   ", font: "Calibri", size: 19, bold: true, color: on ? WHITE : LGRAY }),
            new TextRun({ text: opt, font: "Calibri", size: 19, bold: on, color: on ? WHITE : DARK }),
          ],
          spacing: { before: 50, after: 50 }, indent: { left: 60 },
        })],
      });
    };

    const rows = [];
    for (let i = 0; i < opts.length; i += 2) {
      const hasSecond = i + 1 < opts.length;
      rows.push(new TableRow({ children: [
        mkOpt(opts[i]),
        new TableCell({ width: { size: 160, type: WidthType.DXA }, borders: nb(), children: [sp(0)] }),
        hasSecond ? mkOpt(opts[i + 1]) : new TableCell({ borders: nb(), children: [sp(0)] }),
      ]}));
      if (i + 2 < opts.length) {
        rows.push(new TableRow({ children: [
          new TableCell({ borders: nb(), children: [sp(40)] }),
          new TableCell({ width: { size: 160, type: WidthType.DXA }, borders: nb(), children: [sp(0)] }),
          new TableCell({ borders: nb(), children: [sp(0)] }),
        ]}));
      }
    }

    return [lbl(label, req), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, rows }), sp(80)];
  };

  // ─── Helper: linie checklist ──────────────────────────────────────────────────
  const checkRow = (label, key, hint = "") => {
    const on = !!data[key];
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED,
      rows: [new TableRow({ children: [
        new TableCell({
          width: { size: 480, type: WidthType.DXA },
          shading: on ? { type: ShadingType.SOLID, color: GREEN, fill: GREEN } : { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT },
          borders: { top: bd(on ? GREEN : BORDER), bottom: bd(on ? GREEN : BORDER), left: bd(on ? GREEN : BORDER), right: bd(on ? GREEN : BORDER) },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: on ? "  \u2713" : "  ", font: "Calibri", size: 22, bold: true, color: WHITE })], alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 } })],
        }),
        new TableCell({
          borders: { top: { style: BorderStyle.NONE, size: 0, color: WHITE }, bottom: bd(BORDER), left: { style: BorderStyle.NONE, size: 0, color: WHITE }, right: { style: BorderStyle.NONE, size: 0, color: WHITE } },
          children: [new Paragraph({
            children: [
              new TextRun({ text: "  " + label, font: "Calibri", size: 20, bold: on, color: on ? DARK : GRAY }),
              hint ? new TextRun({ text: "  \u2014  " + hint, font: "Calibri", size: 18, italics: true, color: LGRAY }) : new TextRun({ text: "" }),
            ],
            spacing: { before: 55, after: 55 },
          })],
        }),
      ]})]
    });
  };

  // ─── Helper: notă informativă ─────────────────────────────────────────────────
  const note = (text) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [
      new TableCell({
        width: { size: 180, type: WidthType.DXA },
        shading: { type: ShadingType.SOLID, color: AMBER, fill: AMBER }, borders: nb(),
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: "i", font: "Calibri", size: 22, bold: true, color: WHITE })], alignment: AlignmentType.CENTER, spacing: { before: 70, after: 70 } })],
      }),
      new TableCell({
        shading: { type: ShadingType.SOLID, color: AMB_LT, fill: AMB_LT },
        borders: { top: { style: BorderStyle.NONE, size: 0, color: WHITE }, bottom: { style: BorderStyle.NONE, size: 0, color: WHITE }, left: bd(AMBER, 8), right: { style: BorderStyle.NONE, size: 0, color: WHITE } },
        children: [new Paragraph({ children: [new TextRun({ text: "  " + text, font: "Calibri", size: 18, italics: true, color: "92400E" })], spacing: { before: 70, after: 70 } })],
      }),
    ]})]
  });

  // ─── Helper: separator ────────────────────────────────────────────────────────
  const divider = () => new Paragraph({ border: { bottom: bd(BORDER) }, spacing: { before: 60, after: 60 } });

  // ════════════════════════════════════════════════════════════════════════════
  //  CONȚINUT DOCUMENT
  // ════════════════════════════════════════════════════════════════════════════

  // ── ANTET ───────────────────────────────────────────────────────────────────
  add(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 280, type: WidthType.DXA }, shading: { type: ShadingType.SOLID, color: AMBER, fill: AMBER }, borders: nb(), children: [sp(0)] }),
      new TableCell({
        shading: { type: ShadingType.SOLID, color: DARK, fill: DARK }, borders: nb(),
        children: [
          new Paragraph({ children: [new TextRun({ text: "ZEPHREN", font: "Calibri", size: 44, bold: true, color: AMBER })], spacing: { before: 140, after: 40 }, indent: { left: 220 } }),
          new Paragraph({ children: [new TextRun({ text: "FORMULAR CLIENTULUI \u2014 AUDIT ENERGETIC / CPE", font: "Calibri", size: 24, bold: true, color: WHITE })], spacing: { before: 0, after: 40 }, indent: { left: 220 } }),
          new Paragraph({ children: [new TextRun({ text: "Data: " + new Date().toLocaleDateString("ro-RO") + "  |  Mc 001-2022  |  EPBD 2024/1275", font: "Calibri", size: 17, italics: true, color: "94A3B8" })], spacing: { before: 0, after: 140 }, indent: { left: 220 } }),
        ],
      }),
    ]})]
  }));

  add(sp(240));

  // ── INTRO ───────────────────────────────────────────────────────────────────
  add(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [new TableCell({
      shading: { type: ShadingType.SOLID, color: BLU_LT, fill: BLU_LT },
      borders: { top: bd("BFDBFE", 6), bottom: { style: BorderStyle.NONE, size: 0, color: WHITE }, left: bd("3B82F6", 18), right: { style: BorderStyle.NONE, size: 0, color: WHITE } },
      children: [
        new Paragraph({ children: [new TextRun({ text: "  Stimate proprietar,", font: "Calibri", size: 22, bold: true, color: "1E3A8A" })], spacing: { before: 100, after: 60 } }),
        new Paragraph({ children: [new TextRun({ text: "  V\u0103 rug\u0103m s\u0103 completa\u021bi câmpurile de mai jos cu informa\u021biile disponibile despre cl\u0103direa dumneavoastr\u0103 \u0219i s\u0103 transmite\u021bi documentul auditorului energetic \u00eenainte de inspec\u021bie.", font: "Calibri", size: 20, color: BLUE })], spacing: { before: 0, after: 60 } }),
        new Paragraph({ children: [
          new TextRun({ text: "  Câmpurile marcate cu ", font: "Calibri", size: 20, color: BLUE }),
          new TextRun({ text: "\u2731", font: "Calibri", size: 20, bold: true, color: AMBER }),
          new TextRun({ text: " sunt obligatorii. Celelalte câmpuri vor fi completate de auditor dac\u0103 nu le cunoa\u0219te\u021bi.", font: "Calibri", size: 20, color: BLUE }),
        ], spacing: { before: 0, after: 100 } }),
      ],
    })]})]
  }));

  add(sp(280));

  // ════════════════════════
  // 1. DATE DE IDENTIFICARE
  // ════════════════════════
  add(sectionHead("1", "Date de identificare \u0219i contact"));
  add(sp(100));
  add(field2("Nume \u0219i prenume proprietar", "numeProprietar", "", true, "Telefon de contact", "telefonProprietar", "", true));
  add(field2("Adres\u0103 de e-mail", "emailProprietar", "", false, "Jude\u021b", "judet", "", true));
  add(field2("Localitate / Municipiu", "localitate", "", true, "Tipul cl\u0103dirii", "tip\u0106l\u0103dire", "", true));
  add(...field("Adresa complet\u0103 a cl\u0103dirii (strad\u0103, num\u0103r, bloc, scar\u0103, apartament)", "adresaCompleta", "", true));
  add(field2("Anul construc\u021biei (aproximativ)", "anConstructie", "", true, "Num\u0103r cadastral", "nrCadastral", "", false));
  add(field2("Num\u0103r de apartamente \u00een cl\u0103dire", "numarApartamenteBloc", "buc.", false, "Act de proprietate (num\u0103r \u0219i dat\u0103)", "propertyAct", "", false));
  add(...radioGroup("Scopul auditului / CPE:", "scopulCPE", ["Vânzare", "Închiriere", "Recep\u021bie lucrare nou\u0103", "Refinan\u021bare credit", "Reabilitare termic\u0103", "Audit voluntar"], true));
  add(...radioGroup("Au fost efectuate lucr\u0103ri de reabilitare anterioare?", "reabilitarePrecedenta", ["Nu", "Da \u2014 par\u021bial", "Da \u2014 integral"]));
  if (has("descriereReabilitare")) add(...field("Descrierea lucr\u0103rilor de reabilitare efectuate", "descriereReabilitare"));
  add(sp(280));

  // ═══════════════════════
  // 2. DIMENSIUNILE CLĂDIRII
  // ═══════════════════════
  add(sectionHead("2", "Dimensiunile cl\u0103dirii"));
  add(sp(100));
  add(note("Furniza\u021bi cel pu\u021bin suprafa\u021ba util\u0103 total\u0103. Auditorul va efectua m\u0103sur\u0103tori suplimentare la fa\u021ba locului."));
  add(sp(80));
  add(field2("Suprafa\u021ba total\u0103 construit\u0103", "arieTotala", "m\u00b2", true, "Suprafa\u021ba util\u0103 total\u0103", "arieUtila", "m\u00b2", false));
  add(field2("Num\u0103r de niveluri (f\u0103r\u0103 subsol)", "numarEtaje", "", true, "Num\u0103r de persoane care locuiesc permanent", "numarOcupanti", "pers.", false));
  add(field2("Exist\u0103 subsol sau demisol?", "areSubsol", "", false, "Exist\u0103 pod sau mansard\u0103?", "arePod", "", false));
  add(sp(280));

  // ═══════════════════════
  // 3. SISTEMUL DE ÎNCĂLZIRE
  // ═══════════════════════
  add(sectionHead("3", "Sistemul de \u00eenc\u0103lzire"));
  add(sp(100));
  add(note("Informa\u021biile despre cazan / pomp\u0103 de c\u0103ldur\u0103 le g\u0103si\u021bi pe eticheta aparatului din centrala termic\u0103."));
  add(sp(80));
  add(...radioGroup("Sursa principal\u0103 de c\u0103ldur\u0103:", "tipSursa", ["Cazan gaz natural", "Cazan GPL", "Cazan motorin\u0103", "Cazan lemne / pele\u021bi", "Pomp\u0103 de c\u0103ldur\u0103", "\u00cenc\u0103lzire electric\u0103", "Termoficare (CET)"], true));
  add(...radioGroup("Combustibilul utilizat:", "combustibil", ["Gaz natural", "GPL", "Motorin\u0103", "Lemne", "Pele\u021bi", "Brichete", "Electricitate", "Termoficare"]));
  add(field2("Marca \u0219i modelul cazanului / pompei de c\u0103ldur\u0103", "marcaCazan", "", false, "Anul fabrica\u021biei", "anCazan", "", false));
  add(...field("Puterea nominal\u0103 (de pe eticheta aparatului)", "putereKw", "kW"));
  add(...radioGroup("Tipul de distribu\u021bie a c\u0103ldurii:", "distributieIncalzire", ["Radiatoare (calorifere)", "\u00cenc\u0103lzire \u00een pardoseal\u0103", "Fan-coil", "Sobe / \u0219emineu", "Altele"]));
  add(...radioGroup("Exist\u0103 robine\u021bi termosta\u021ba\u021bi pe radiatoare?", "robinetiTermostati", ["Nu", "Da \u2014 la unele", "Da \u2014 la toate"]));
  add(...radioGroup("Exist\u0103 termostat de ambient programabil?", "termostatAmbient", ["Nu", "Da \u2014 simplu", "Da \u2014 programabil", "Da \u2014 smart"]));
  add(sp(280));

  // ═══════════════════════════
  // 4. APA CALDĂ MENAJERĂ
  // ═══════════════════════════
  add(sectionHead("4", "Prepararea apei calde menajere"));
  add(sp(100));
  add(...radioGroup("Cum este preparat\u0103 apa cald\u0103 menajer\u0103?", "surseACM", ["Central\u0103 termic\u0103 combinat\u0103", "Boiler electric", "Boiler gaz (separat)", "Panouri solare termice", "Termoficare", "Instant gaz", "Pomp\u0103 de c\u0103ldur\u0103 ACM"], true));
  add(...field("Volumul boilerului de acumulare (scris pe aparat)", "volumBoiler", "litri"));
  add(sp(280));

  // ═══════════════════════════════
  // 5. RĂCIRE ȘI AER CONDIȚIONAT
  // ═══════════════════════════════
  add(sectionHead("5", "R\u0103cire \u0219i aer condi\u021bionat"));
  add(sp(100));
  add(...radioGroup("Exist\u0103 sistem de r\u0103cire / aer condi\u021bionat?", "areRacire", ["Nu", "Da \u2014 \u00een unele \u00eenc\u0103peri", "Da \u2014 \u00een toat\u0103 cl\u0103direa"], true));
  add(...field("Tipul sistemului de r\u0103cire (dac\u0103 exist\u0103)", "tipRacire"));
  add(sp(280));

  // ═══════════════════════════════════
  // 6. SURSE DE ENERGIE REGENERABILĂ
  // ═══════════════════════════════════
  add(sectionHead("6", "Surse de energie regenerabil\u0103"));
  add(sp(100));
  add(...radioGroup("Exist\u0103 sistem fotovoltaic (panouri pentru electricitate)?", "arePV", ["Nu", "Da"], true));
  if (has("arePV") && v("arePV") === "Da") {
    add(field2("Puterea total\u0103 instalat\u0103 a sistemului PV", "putereKwp", "kWp", false, "Num\u0103rul de panouri fotovoltaice", "numarPanouriPV", "buc.", false));
    add(field2("Orientarea panourilor fotovoltaice", "orientarePV", "", false, "Anul instal\u0103rii sistemului PV", "anPV", "", false));
    add(...field("Produc\u021bia anual\u0103 estimat\u0103 (din aplica\u021bia invertorului)", "productieAnualaPV", "kWh/an"));
  }
  add(...radioGroup("Exist\u0103 panouri solare termice (pentru ap\u0103 cald\u0103)?", "areSolarTermicRenew", ["Nu", "Da"], true));
  if (has("areSolarTermicRenew") && v("areSolarTermicRenew") === "Da") {
    add(field2("Suprafa\u021ba panourilor solare termice", "suprafataSolarRenew", "m\u00b2", false, "Orientarea panourilor solare", "orientareSolar", "", false));
    add(...field("Anul instal\u0103rii panourilor solare termice", "anSolarTermic"));
  }
  add(sp(280));

  // ══════════════════════════════
  // 7. CONSUMURI ENERGETICE
  // ══════════════════════════════
  add(sectionHead("7", "Consumuri energetice anuale"));
  add(sp(100));
  add(note("Valorile se preiau din facturile ultimelor 12 luni. Anexa\u021bi copii ale facturilor dac\u0103 este posibil."));
  add(sp(80));
  add(field2("Consum anual gaz natural", "consumGaz", "m\u00b3/an", false, "Consum anual electricitate", "consumElectricitate", "kWh/an", false));
  add(field2("Consum agent termic (termoficare)", "consumTermoficare", "Gcal/an", false, "Consum anual lemne de foc", "consumLemn", "mc/an", false));
  add(field2("Consum anual pele\u021bi / brichete", "consumPeleti", "tone/an", false, "Consum anual motorin\u0103 / GPL", "consumCombLichid", "litri/an", false));
  add(sp(280));

  // ══════════════════════════════════════
  // 8. DOCUMENTE DISPONIBILE
  // ══════════════════════════════════════
  add(sectionHead("8", "Documente disponibile pentru auditor"));
  add(sp(100));
  add(note("Bifa\u021bi documentele pe care le pute\u021bi pune la dispozi\u021bia auditorului. Cu cât furniza\u021bi mai multe, cu atât calculul va fi mai precis."));
  add(sp(80));
  add(checkRow("Act de proprietate sau extras de carte funciar\u0103 actualizat", "areActProp", "obligatoriu pentru identificare"));
  add(sp(40));
  add(checkRow("Autoriza\u021bie de construire (num\u0103rul \u0219i data)", "areAutorizatie", "util pentru stabilirea anului construc\u021biei"));
  add(sp(40));
  add(checkRow("Planuri arhitecturale: plan parter, etaje, fa\u021bade, sec\u021biuni", "arePlanuri", "esen\u021bial pentru calcul suprafe\u021be"));
  add(sp(40));
  add(checkRow("Cartea tehnic\u0103 a cl\u0103dirii (dosarul construc\u021biei)", "areCarteTehn"));
  add(sp(40));
  add(checkRow("Fi\u015fa tehnic\u0103 / cartea cazanului sau pompei de c\u0103ldur\u0103", "areFisaCazan", "con\u021bine puterea nominal\u0103 \u0219i randamentul"));
  add(sp(40));
  add(checkRow("Documenta\u021bia sistemului fotovoltaic (contract instalator, schem\u0103)", "areFisaPV"));
  add(sp(40));
  add(checkRow("Facturi gaz natural \u2014 ultimele 12 luni (sau ultimii 3 ani)", "areFacGaz"));
  add(sp(40));
  add(checkRow("Facturi electricitate \u2014 ultimele 12 luni (sau ultimii 3 ani)", "areFacElec"));
  add(sp(40));
  add(checkRow("Facturi agent termic (termoficare / CET) \u2014 ultimele 12 luni", "areFacTermo"));
  add(sp(40));
  add(checkRow("Fotografii ale cl\u0103dirii: exterior (toate fa\u021badele), interior, instala\u021bii", "areFotoExter", "foarte utile pentru evaluare"));
  if (has("alteDocumente")) {
    add(sp(80));
    add(...field("Alte documente sau informa\u021bii suplimentare", "alteDocumente"));
  }
  add(sp(280));

  // ── DECLARAȚIE ȘI SEMNĂTURĂ ──────────────────────────────────────────────────
  add(divider());
  add(new Paragraph({ children: [new TextRun({ text: "Declara\u021bie", font: "Calibri", size: 22, bold: true, color: DARK })], spacing: { before: 140, after: 60 } }));
  add(new Paragraph({ children: [new TextRun({ text: "Subsemnatul/a confirm c\u0103 informa\u021biile furnizate \u00een prezentul formular sunt corecte \u0219i complete, \u00een conformitate cu documentele de\u021binute \u0219i cu situa\u021bia real\u0103 a cl\u0103dirii.", font: "Calibri", size: 20, color: GRAY })], spacing: { before: 0, after: 120 } }));
  add(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [
      new TableCell({ borders: nb(), children: [
        new Paragraph({ children: [new TextRun({ text: "Data complet\u0103rii:", font: "Calibri", size: 18, color: LGRAY })], spacing: { before: 0, after: 30 } }),
        new Paragraph({ children: [new TextRun({ text: "..................................................", font: "Calibri", size: 20, color: DARK })], spacing: { before: 0, after: 0 } }),
      ]}),
      new TableCell({ width: { size: 400, type: WidthType.DXA }, borders: nb(), children: [sp(0)] }),
      new TableCell({ borders: nb(), children: [
        new Paragraph({ children: [new TextRun({ text: "Semn\u0103tura proprietarului:", font: "Calibri", size: 18, color: LGRAY })], spacing: { before: 0, after: 30 } }),
        new Paragraph({ children: [new TextRun({ text: "..................................................", font: "Calibri", size: 20, color: DARK })], spacing: { before: 0, after: 0 } }),
      ]}),
    ]})]
  }));

  // ── PLANȘE ───────────────────────────────────────────────────────────────────
  const imgPlanuri = planuri.filter(p => p.type && p.type.startsWith("image/"));
  if (imgPlanuri.length > 0) {
    add(sp(280));
    add(sectionHead("9", "Plan\u015fe \u0219i fotografii ata\u015fate"));
    add(sp(100));

    const dataUrlToBuffer = (dataUrl) => {
      const base64 = dataUrl.split(",")[1];
      const bin = atob(base64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    };

    const getImageDims = (dataUrl) => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 800, h: 600 });
      img.src = dataUrl;
    });

    const MAX_W = 3200000;
    const MAX_H = 2400000;

    for (let i = 0; i < imgPlanuri.length; i += 2) {
      const cells = [];
      for (let j = i; j < Math.min(i + 2, imgPlanuri.length); j++) {
        const pl = imgPlanuri[j];
        const { w, h } = await getImageDims(pl.dataUrl);
        const ratio = w / h;
        let ew = MAX_W, eh = Math.round(MAX_W / ratio);
        if (eh > MAX_H) { eh = MAX_H; ew = Math.round(MAX_H * ratio); }
        cells.push(new TableCell({
          borders: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER }, bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER }, left: { style: BorderStyle.SINGLE, size: 4, color: BORDER }, right: { style: BorderStyle.SINGLE, size: 4, color: BORDER } },
          children: [
            new Paragraph({
              children: [new ImageRun({ data: dataUrlToBuffer(pl.dataUrl), transformation: { width: Math.round(ew / 9144), height: Math.round(eh / 9144) } })],
              alignment: AlignmentType.CENTER, spacing: { before: 80, after: 40 },
            }),
            new Paragraph({ children: [new TextRun({ text: pl.name || pl.fileName, font: "Calibri", size: 18, italics: true, color: GRAY })], alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 } }),
          ],
        }));
        if (imgPlanuri.length % 2 !== 0 && j === imgPlanuri.length - 1) {
          cells.push(new TableCell({ borders: nb(), children: [sp(0)] }));
        }
      }
      add(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, rows: [new TableRow({ children: cells })] }));
      add(sp(80));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  CREARE DOCUMENT
  // ════════════════════════════════════════════════════════════════════════════
  const doc = new Document({
    creator: "Zephren Energy Performance Calculator",
    title: "Formular Client \u2014 Audit Energetic",
    description: "Formular de colectare date pentru calculul performan\u021bei energetice conform Mc 001-2022",
    styles: { default: { document: { run: { font: "Calibri", size: 20, color: DARK } } } },
    sections: [{ properties: { page: { margin: { top: convertInchesToTwip(1.0), bottom: convertInchesToTwip(1.0), left: convertInchesToTwip(1.1), right: convertInchesToTwip(1.1) } } }, children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "formular-date-client-" + new Date().toISOString().slice(0, 10) + ".docx";
  a.click();
  URL.revokeObjectURL(url);
}


// ─── Date pentru sectiuni ─────────────────────────────────────────────────────
const SECTIONS_META = [
  { key: "identificare", required: ["numeProprietar", "telefonProprietar", "adresaCompleta", "judet", "localitate", "anConstructie", "tipClădire", "scopulCPE"] },
  { key: "geometrie",    required: ["arieTotala", "numarEtaje"] },
  { key: "incalzire",    required: ["tipSursa", "combustibil"] },
  { key: "acm",          required: ["surseACM"] },
  { key: "racire",       required: ["areRacire"] },
  { key: "regenerabile", required: ["arePV", "areSolarTermicRenew"] },
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
        {/* Coordonate geografice — Anexa 6, Ord. MDLPA 348/2026 */}
        {/* TODO: auto-populare din geocodare — ancpi-proxy.js nu returnează
            coordonate în prezent (API ANCPI fără acces public la date spațiale).
            Alternativă: integrare Nominatim/OpenStreetMap pe baza adresei complete. */}
        <div className="md:col-span-2">
          <p className="text-xs font-medium text-white/30 uppercase tracking-wider pb-1 border-b border-white/[0.06]">
            Coordonate geografice (Anexa 6 MDLPA)
          </p>
        </div>
        <Field label="Latitudine" hint="Opțional — completat automat dacă este disponibil din geocodare">
          <FInput value={data.latitude} onChange={v => set("latitude", v)} type="number"
            min={-90} max={90} placeholder="44.4268" unit="°N" />
        </Field>
        <Field label="Longitudine" hint="Opțional — completat automat dacă este disponibil din geocodare">
          <FInput value={data.longitude} onChange={v => set("longitude", v)} type="number"
            min={-180} max={180} placeholder="26.1025" unit="°E" />
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
        <Field label="Există subsol sau demisol?">
          <FRadio value={data.areSubsol} onChange={v => set("areSubsol", v)}
            options={["Nu","Da — neîncălzit","Da — încălzit / locuit"]} />
        </Field>
        <Field label="Există pod / mansardă?">
          <FRadio value={data.arePod} onChange={v => set("arePod", v)}
            options={["Nu","Pod neamenajat","Mansardă amenajată"]} />
        </Field>
      </Section>

      {/* 3. INCALZIRE */}
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

      {/* 7. REGENERABILE */}
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
        <div className="flex justify-between items-center mt-4">
          <button onClick={() => downloadClientFormTemplate()}
            className="px-6 py-2.5 bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 text-green-300 rounded-xl text-sm font-medium transition-all">
            ↓ Descarcă Formular Gol
          </button>
          <div className="flex gap-3">
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

    </div>
  );
}
