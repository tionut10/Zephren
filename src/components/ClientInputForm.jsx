import { useState, useEffect, useRef } from "react";
import { cn } from "./ui.jsx";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  TableLayoutType, VerticalAlign, convertInchesToTwip, ImageRun,
  CheckBox,
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
      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white
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

// ─── Date demo pentru testare ─────────────────────────────────────────────────
const DEMO_DATA = {
  // 1. Identificare
  numeProprietar: "Ionescu Maria",
  telefonProprietar: "0721 234 567",
  emailProprietar: "maria.ionescu@gmail.com",
  judet: "Brașov",
  localitate: "Brașov",
  adresaCompleta: "Str. Florilor nr. 12, bl. A2, ap. 5",
  latitude: 45.6427,
  longitude: 25.5887,
  "tipClădire": "casa_unifamiliala",
  anConstructie: 1978,
  nrCadastral: "123456",
  scopulCPE: "Reabilitare termică",
  reabilitarePrecedenta: "Da — parțial",
  descriereReabilitare: "Înlocuire ferestre cu termopane PVC dublu vitraj în 2010. Nu s-a realizat izolație termică pe fațadă sau acoperiș.",
  // 2. Geometrie
  arieTotala: 185,
  arieUtila: 142,
  numarEtaje: "P+1",
  areSubsol: "Nu",
  arePod: "Pod neamenajat",
  numarOcupanti: 4,
  // 3. Încălzire
  tipSursa: "cazan_gaz",
  combustibil: "Gaz natural",
  marcaCazan: "Vaillant ecoTEC Plus 24",
  anCazan: 2008,
  putereKw: 24,
  distributieIncalzire: "radiatoare",
  robinetiTermostati: "Da — la unele",
  termostatAmbient: "Da — simplu",
  // 4. ACM
  surseACM: "cazan_combinat",
  volumBoiler: 0,
  // 5. Răcire
  areRacire: "Da — în unele camere",
  tipRacire: "Aparat split (aer condiționat perete)",
  // 6. Regenerabile
  arePV: "Nu",
  areSolarTermicRenew: "Nu",
  // 7. Consumuri
  consumGaz: 1850,
  consumElectricitate: 3200,
  consumLemn: 0,
  consumPeleti: 0,
  consumTermoficare: 0,
  // 8. Documente
  areActProp: true,
  areAutorizatie: false,
  arePlanuri: true,
  areCarteTehn: false,
  areFisaCazan: true,
  areFisaVMC: false,
  areFisaPV: false,
  areFacGaz: true,
  areFacElec: true,
  areFacTermo: false,
  areFotoExter: true,
  alteDocumente: "Clădire construită circa 1978, fără izolație termică pe pereții exteriori. Se solicită reabilitare termică completă în vederea reducerii consumului energetic și îmbunătățirii clasei energetice.",
};

// ─── Export PDF/JSON ──────────────────────────────────────────────────────────
function exportJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `date-client-audit-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Download Formular Gol variante ──────────────────────────────────────────
function downloadBlankPrint()       { exportDOCX({}, [], true, false); } // ☐ simbol printabil
function downloadBlankWordInteract(){ exportDOCX({}, [], true, true);  } // ☑ Word interactiv SDT

// ─── Export DOCX ─────────────────────────────────────────────────────────────
// isBlank=true          → formular gol (câmpuri cu linie de completare)
// isWordInteractive=true → checkbox-uri Word SDT interactive (w:sdt)
async function exportDOCX(data, planuri = [], isBlank = false, isWordInteractive = false) {
  const v   = (key) => data[key] ?? "";
  const has = (key) => { const val = data[key]; return val !== undefined && val !== "" && val !== null && val !== false; };
  const txt = (key, unit = "") => has(key) ? String(v(key)) + (unit ? "\u00a0" + unit : "") : "";

  // ─── Culori ───────────────────────────────────────────────────────────────────
  const C = {
    amber:   "F59E0B", ambLight: "FFFBEB",
    dark:    "1E293B", gray:     "475569",
    lGray:   "94A3B8", light:    "F8FAFC",
    border:  "E2E8F0", white:    "FFFFFF",
    blue:    "1E40AF", blueLight:"EFF6FF",
    green:   "16A34A", label:    "F1F5F9",
    line:    "CBD5E1",
  };
  // aliases compat
  const AMBER = C.amber, DARK = C.dark, GRAY = C.gray, LGRAY = C.lGray,
        LIGHT = C.light, GREEN = C.green, BORDER = C.border, WHITE = C.white,
        BLUE = C.blue, BLU_LT = C.blueLight, AMB_LT = C.ambLight;

  // ─── Border helpers ───────────────────────────────────────────────────────────
  const NB = { top: { style: BorderStyle.NONE, size: 0, color: WHITE }, bottom: { style: BorderStyle.NONE, size: 0, color: WHITE }, left: { style: BorderStyle.NONE, size: 0, color: WHITE }, right: { style: BorderStyle.NONE, size: 0, color: WHITE } };
  const nb = () => NB;
  const ln = (col = C.border, sz = 4) => ({ style: BorderStyle.SINGLE, size: sz, color: col });
  const bd = (color = BORDER, sz = 4) => ({ style: BorderStyle.SINGLE, size: sz, color });
  const allBd = (col = C.border) => ({ top: ln(col), bottom: ln(col), left: ln(col), right: ln(col) });

  const children = [];
  const add = (...items) => items.flat().forEach(i => i && children.push(i));
  const sp  = (after = 80) => new Paragraph({ spacing: { before: 0, after } });
  const gap = (after = 200) => new Paragraph({ spacing: { before: 0, after }, children: [new TextRun({ text: "" })] });

  // ─── Helper: titlu secțiune (rând header în tabel) ────────────────────────────
  const headerRow = (nr, title) => new TableRow({
    children: [new TableCell({
      columnSpan: 2,
      shading: { type: ShadingType.SOLID, color: C.dark, fill: C.dark },
      borders: NB,
      children: [new Paragraph({
        children: [
          new TextRun({ text: `${nr}. `, font: "Calibri", size: 24, bold: true, color: C.amber }),
          new TextRun({ text: title.toUpperCase(), font: "Calibri", size: 22, bold: true, color: WHITE }),
        ],
        spacing: { before: 110, after: 110 }, indent: { left: 160 },
      })],
    })],
  });

  // ─── Helper: rând notă informativă (full-width) ───────────────────────────────
  const noteRow = (text) => new TableRow({
    children: [new TableCell({
      columnSpan: 2,
      shading: { type: ShadingType.SOLID, color: C.blueLight, fill: C.blueLight },
      borders: { top: ln(C.border), bottom: ln(C.border), left: ln("3B82F6", 14), right: ln(C.border) },
      children: [new Paragraph({
        children: [new TextRun({ text: "ℹ  " + text, font: "Calibri", size: 18, italics: true, color: C.blue })],
        spacing: { before: 80, after: 80 }, indent: { left: 140 },
      })],
    })],
  });

  // ─── Helper: rând câmp (label | valoare) ──────────────────────────────────────
  const fieldRow = (label, key, unit = "", req = false, valueOverride = null) => {
    const val = valueOverride !== null ? valueOverride : txt(key, unit);
    const filled = val !== "" && !isBlank;
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 42, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: C.label, fill: C.label },
          borders: allBd(),
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            children: [
              new TextRun({ text: label, font: "Calibri", size: 19, color: C.gray }),
              req ? new TextRun({ text: " \u2731", font: "Calibri", size: 17, bold: true, color: C.amber }) : new TextRun({ text: "" }),
            ],
            spacing: { before: 90, after: 90 }, indent: { left: 140 },
          })],
        }),
        new TableCell({
          width: { size: 58, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: filled ? C.ambLight : WHITE, fill: filled ? C.ambLight : WHITE },
          borders: { top: ln(C.border), bottom: ln(C.border), left: ln(filled ? C.amber : C.line, filled ? 12 : 4), right: ln(C.border) },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            children: [new TextRun({ text: filled ? val : (isBlank ? "" : "\u2014"), font: "Calibri", size: 20, bold: filled, color: filled ? C.dark : C.lGray })],
            spacing: { before: 90, after: 90 }, indent: { left: 160 },
          })],
        }),
      ],
    });
  };

  // ─── Helper: rând checkbox ─────────────────────────────────────────────────────
  // Mod 1 (isBlank=false): celulă colorată verde/gri cu ✓ — formular completat online
  // Mod 2 (isBlank=true, isWordInteractive=false): simbol ☐ — printabil
  // Mod 3 (isBlank=true, isWordInteractive=true): CheckBox SDT Word — interactiv în Word
  const checkRow = (label, key, hint = "") => {
    const on = !isBlank && !!data[key];

    let checkCell;
    if (isBlank && isWordInteractive) {
      // MOD 3 — Word SDT checkbox interactiv (click în Word pentru bifă)
      checkCell = new TableCell({
        width: { size: 7, type: WidthType.PERCENTAGE },
        borders: allBd(),
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          children: [new CheckBox({ checked: false })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
        })],
      });
    } else if (isBlank) {
      // MOD 2 — simbol ☐ printabil (MS Gothic pentru redare corectă)
      checkCell = new TableCell({
        width: { size: 7, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: C.label, fill: C.label },
        borders: allBd(),
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          children: [new TextRun({ text: "\u2610", font: "MS Gothic", size: 26, color: C.dark })],
          alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 },
        })],
      });
    } else {
      // MOD 1 — formular completat: verde cu ✓ sau gri
      checkCell = new TableCell({
        width: { size: 7, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: on ? C.green : C.label, fill: on ? C.green : C.label },
        borders: allBd(on ? C.green : C.border),
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          children: [new TextRun({ text: on ? "\u2713" : " ", font: "Calibri", size: 22, bold: true, color: WHITE })],
          alignment: AlignmentType.CENTER, spacing: { before: 70, after: 70 },
        })],
      });
    }

    return new TableRow({
      children: [
        checkCell,
        new TableCell({
          borders: allBd(),
          children: [new Paragraph({
            children: [
              new TextRun({ text: "  " + label, font: "Calibri", size: 20, bold: on, color: on ? C.dark : C.gray }),
              hint ? new TextRun({ text: "  \u2014  " + hint, font: "Calibri", size: 18, italics: true, color: C.lGray }) : new TextRun({ text: "" }),
            ],
            spacing: { before: 80, after: 80 },
          })],
        }),
      ],
    });
  };

  // ─── Helper: construiește tabelul de secțiune ──────────────────────────────────
  const makeSection = (rows) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allBd(),
    rows,
  });

  // ════════════════════════════════════════════════════════════════════════════
  //  CONȚINUT DOCUMENT
  // ════════════════════════════════════════════════════════════════════════════

  // ── ANTET ───────────────────────────────────────────────────────────────────
  add(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED,
    borders: NB,
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: C.amber, fill: C.amber }, borders: NB, children: [sp(0)] }),
      new TableCell({
        shading: { type: ShadingType.SOLID, color: C.dark, fill: C.dark }, borders: NB,
        children: [
          new Paragraph({ children: [new TextRun({ text: "ZEPHREN", font: "Calibri", size: 56, bold: true, color: C.amber })], spacing: { before: 160, after: 40 }, indent: { left: 220 } }),
          new Paragraph({ children: [new TextRun({ text: "FORMULAR CLIENT \u2014 AUDIT ENERGETIC / CPE", font: "Calibri", size: 22, bold: true, color: WHITE })], spacing: { before: 0, after: 40 }, indent: { left: 220 } }),
          new Paragraph({ children: [new TextRun({ text: "Data: " + new Date().toLocaleDateString("ro-RO") + "\u2003|\u2003Mc 001-2022\u2003|\u2003EPBD 2024/1275", font: "Calibri", size: 17, italics: true, color: "94A3B8" })], spacing: { before: 0, after: 160 }, indent: { left: 220 } }),
        ],
      }),
    ]})]
  }));
  add(gap(260));

  // ── INTRO ───────────────────────────────────────────────────────────────────
  add(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NB,
    rows: [new TableRow({ children: [new TableCell({
      shading: { type: ShadingType.SOLID, color: C.blueLight, fill: C.blueLight },
      borders: { top: ln("BFDBFE", 6), bottom: ln("BFDBFE", 6), left: ln("3B82F6", 18), right: ln("BFDBFE", 6) },
      children: [
        new Paragraph({ children: [new TextRun({ text: "  Stimate proprietar,", font: "Calibri", size: 22, bold: true, color: "1E3A8A" })], spacing: { before: 100, after: 60 } }),
        new Paragraph({ children: [new TextRun({ text: "  V\u0103 rug\u0103m s\u0103 completa\u021bi c\u00e2mpurile de mai jos cu informa\u021biile disponibile despre cl\u0103direa dumneavoastr\u0103 \u015fi s\u0103 transmite\u021bi documentul auditorului energetic \u00ednainte de inspec\u021bie. C\u00e2mpurile marcate cu \u2731 sunt obligatorii.", font: "Calibri", size: 20, color: C.blue })], spacing: { before: 0, after: 100 } }),
      ],
    })] })]
  }));
  add(gap(280));

  // ══ 1. DATE DE IDENTIFICARE ══
  add(makeSection([
    headerRow("1", "Date de identificare \u015fi contact"),
    fieldRow("Nume \u015fi prenume proprietar", "numeProprietar", "", true),
    fieldRow("Telefon de contact", "telefonProprietar", "", true),
    fieldRow("Adres\u0103 de e-mail", "emailProprietar"),
    fieldRow("Jude\u021b", "judet", "", true),
    fieldRow("Localitate / Municipiu", "localitate", "", true),
    fieldRow("Adresa complet\u0103 a cl\u0103dirii", "adresaCompleta", "", true),
    fieldRow("Tipul cl\u0103dirii", "tip\u0106l\u0103dire", "", true),
    fieldRow("Anul construc\u021biei (aproximativ)", "anConstructie", "", true),
    fieldRow("Num\u0103r cadastral", "nrCadastral"),
    fieldRow("Num\u0103r apartamente \u00een cl\u0103dire", "numarApartamenteBloc", "buc."),
    fieldRow("Scopul auditului / CPE \u2731", "scopulCPE", "", true),
    fieldRow("Lucr\u0103ri de reabilitare anterioare?", "reabilitarePrecedenta"),
    ...(has("descriereReabilitare") ? [fieldRow("Descrierea lucr\u0103rilor de reabilitare efectuate", "descriereReabilitare")] : []),
  ]));
  add(gap(200));

  // ══ 2. DIMENSIUNILE CLĂDIRII ══
  add(makeSection([
    headerRow("2", "Dimensiunile cl\u0103dirii"),
    noteRow("Furniza\u021bi cel pu\u021bin suprafa\u021ba util\u0103 total\u0103. Auditorul va efectua m\u0103sur\u0103tori suplimentare la fa\u021ba locului."),
    fieldRow("Suprafa\u021ba total\u0103 construit\u0103", "arieTotala", "m\u00b2", true),
    fieldRow("Suprafa\u021ba util\u0103 total\u0103", "arieUtila", "m\u00b2"),
    fieldRow("Num\u0103r de niveluri (f\u0103r\u0103 subsol)", "numarEtaje", "", true),
    fieldRow("Subsol sau demisol?", "areSubsol"),
    fieldRow("Pod sau mansard\u0103?", "arePod"),
    fieldRow("Num\u0103r de persoane care locuiesc permanent", "numarOcupanti", "pers."),
  ]));
  add(gap(200));

  // ══ 3. SISTEMUL DE ÎNCĂLZIRE ══
  add(makeSection([
    headerRow("3", "Sistemul de \u00eenc\u0103lzire"),
    noteRow("Informa\u021biile despre cazan / pomp\u0103 de c\u0103ldur\u0103 le g\u0103si\u021bi pe eticheta aparatului din centrala termic\u0103."),
    fieldRow("Sursa principal\u0103 de c\u0103ldur\u0103", "tipSursa", "", true),
    fieldRow("Combustibilul utilizat", "combustibil", "", true),
    fieldRow("Marca \u015fi modelul cazanului / pompei de c\u0103ldur\u0103", "marcaCazan"),
    fieldRow("Anul fabrica\u021biei", "anCazan"),
    fieldRow("Puterea nominal\u0103 (de pe eticheta aparatului)", "putereKw", "kW"),
    fieldRow("Tipul de distribu\u021bie a c\u0103ldurii", "distributieIncalzire"),
    fieldRow("Robine\u021bi termosta\u021ba\u021bi pe radiatoare?", "robinetiTermostati"),
    fieldRow("Termostat de ambient programabil?", "termostatAmbient"),
  ]));
  add(gap(200));

  // ══ 4. APA CALDĂ MENAJERĂ ══
  add(makeSection([
    headerRow("4", "Prepararea apei calde menajere"),
    fieldRow("Cum este preparat\u0103 apa cald\u0103 menajer\u0103?", "surseACM", "", true),
    fieldRow("Volumul boilerului de acumulare (scris pe aparat)", "volumBoiler", "litri"),
    ...(v("surseACM") === "solar_termic" ? [
      fieldRow("Suprafa\u021ba panourilor solare", "suprafataSolarTermic", "m\u00b2"),
      fieldRow("Anul instal\u0103rii panourilor solare", "anSolarTermic"),
    ] : []),
  ]));
  add(gap(200));

  // ══ 5. RĂCIRE ȘI AER CONDIȚIONAT ══
  add(makeSection([
    headerRow("5", "R\u0103cire \u015fi aer condi\u021bionat"),
    fieldRow("Exist\u0103 sistem de r\u0103cire / aer condi\u021bionat?", "areRacire", "", true),
    ...(has("areRacire") && v("areRacire") !== "Nu" ? [fieldRow("Tipul sistemului de r\u0103cire", "tipRacire")] : []),
  ]));
  add(gap(200));

  // ══ 6. SURSE REGENERABILE ══
  add(makeSection([
    headerRow("6", "Surse de energie regenerabil\u0103"),
    fieldRow("Sistem fotovoltaic (panouri pentru electricitate)?", "arePV", "", true),
    ...(v("arePV") === "Da" ? [
      fieldRow("Puterea instalat\u0103 a sistemului PV", "putereKwp", "kWp"),
      fieldRow("Num\u0103rul de panouri fotovoltaice", "numarPanouriPV", "buc."),
      fieldRow("Orientarea panourilor fotovoltaice", "orientarePV"),
      fieldRow("Anul instal\u0103rii sistemului PV", "anPV"),
      fieldRow("Produc\u021bie anual\u0103 estimat\u0103", "productieAnualaPV", "kWh/an"),
    ] : []),
    fieldRow("Panouri solare termice (pentru ap\u0103 cald\u0103)?", "areSolarTermicRenew", "", true),
    ...(v("areSolarTermicRenew") === "Da" ? [
      fieldRow("Suprafa\u021ba panourilor solare termice", "suprafataSolarRenew", "m\u00b2"),
      fieldRow("Orientarea panourilor solare termice", "orientareSolar"),
    ] : []),
  ]));
  add(gap(200));

  // ══ 7. CONSUMURI ENERGETICE ══
  add(makeSection([
    headerRow("7", "Consumuri energetice anuale"),
    noteRow("Valorile se preiau din facturile ultimelor 12 luni. Anexa\u021bi copii ale facturilor dac\u0103 este posibil."),
    fieldRow("Consum anual gaz natural", "consumGaz", "m\u00b3/an"),
    fieldRow("Consum anual electricitate", "consumElectricitate", "kWh/an"),
    fieldRow("Consum agent termic (termoficare)", "consumTermoficare", "Gcal/an"),
    fieldRow("Consum anual lemne de foc", "consumLemn", "mc/an"),
    fieldRow("Consum anual pele\u021bi / brichete", "consumPeleti", "tone/an"),
  ]));
  add(gap(200));

  // ══ 8. DOCUMENTE DISPONIBILE ══
  add(makeSection([
    headerRow("8", "Documente disponibile pentru auditor"),
    noteRow("Bifa\u021bi documentele pe care le pute\u021bi pune la dispozi\u021bia auditorului. Cu c\u00e2t furniza\u021bi mai multe, cu at\u00e2t calculul va fi mai precis."),
    checkRow("Act de proprietate sau extras de carte funciar\u0103 actualizat", "areActProp", "obligatoriu pentru identificare"),
    checkRow("Autoriza\u021bie de construire (num\u0103rul \u015fi data)", "areAutorizatie", "util pentru stabilirea anului construc\u021biei"),
    checkRow("Planuri arhitecturale: parter, etaje, fa\u021bade, sec\u021biuni", "arePlanuri", "esen\u021bial pentru calcul suprafe\u021be"),
    checkRow("Cartea tehnic\u0103 a cl\u0103dirii (dosarul construc\u021biei)", "areCarteTehn"),
    checkRow("Fi\u015fa tehnic\u0103 / cartea cazanului sau pompei de c\u0103ldur\u0103", "areFisaCazan", "con\u021bine puterea nominal\u0103 \u015fi randamentul"),
    checkRow("Documenta\u021bia sistemului fotovoltaic", "areFisaPV"),
    checkRow("Facturi gaz natural \u2014 ultimele 12 luni (sau ultimii 3 ani)", "areFacGaz"),
    checkRow("Facturi electricitate \u2014 ultimele 12 luni (sau ultimii 3 ani)", "areFacElec"),
    checkRow("Facturi agent termic (termoficare / CET)", "areFacTermo"),
    checkRow("Fotografii ale cl\u0103dirii: exterior, interior, instala\u021bii", "areFotoExter", "foarte utile pentru evaluare"),
    ...(has("alteDocumente") ? [fieldRow("Alte documente sau informa\u021bii suplimentare", "alteDocumente")] : []),
  ]));
  add(gap(280));

  // ══ DECLARAȚIE ȘI SEMNĂTURĂ ══
  add(makeSection([
    new TableRow({ children: [new TableCell({
      columnSpan: 2,
      shading: { type: ShadingType.SOLID, color: C.light, fill: C.light },
      borders: NB,
      children: [
        new Paragraph({ children: [new TextRun({ text: "Declara\u021bie", font: "Calibri", size: 22, bold: true, color: C.dark })], spacing: { before: 110, after: 60 }, indent: { left: 160 } }),
        new Paragraph({ children: [new TextRun({ text: "Subsemnatul/a confirm c\u0103 informa\u021biile furnizate \u00een prezentul formular sunt corecte \u015fi complete, \u00een conformitate cu documentele de\u021binute \u015fi cu situa\u021bia real\u0103 a cl\u0103dirii.", font: "Calibri", size: 20, color: C.gray })], spacing: { before: 0, after: 110 }, indent: { left: 160 } }),
      ],
    })] }),
    new TableRow({ children: [
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: { top: ln(C.border), bottom: NB.bottom, left: NB.left, right: NB.right },
        children: [
          new Paragraph({ children: [new TextRun({ text: "Data complet\u0103rii:", font: "Calibri", size: 18, color: C.lGray })], spacing: { before: 120, after: 40 }, indent: { left: 160 } }),
          new Paragraph({ children: [new TextRun({ text: ".".repeat(46), font: "Calibri", size: 20, color: C.line })], spacing: { before: 0, after: 120 }, indent: { left: 160 } }),
        ],
      }),
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: { top: ln(C.border), bottom: NB.bottom, left: ln(C.border), right: NB.right },
        children: [
          new Paragraph({ children: [new TextRun({ text: "Semn\u0103tura proprietarului:", font: "Calibri", size: 18, color: C.lGray })], spacing: { before: 120, after: 40 }, indent: { left: 160 } }),
          new Paragraph({ children: [new TextRun({ text: ".".repeat(46), font: "Calibri", size: 20, color: C.line })], spacing: { before: 0, after: 120 }, indent: { left: 160 } }),
        ],
      }),
    ]}),
  ]));

  // ══ PLANȘE ══
  const imgPlanuri = planuri.filter(p => p.type && p.type.startsWith("image/"));
  if (imgPlanuri.length > 0) {
    add(gap(280));
    add(makeSection([headerRow("9", "Plan\u015fe \u015fi fotografii ata\u015fate")]));
    add(gap(100));
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
    const MAX_W = 3000000, MAX_H = 2200000;
    for (let i = 0; i < imgPlanuri.length; i += 2) {
      const cells = [];
      for (let j = i; j < Math.min(i + 2, imgPlanuri.length); j++) {
        const pl = imgPlanuri[j];
        const { w, h } = await getImageDims(pl.dataUrl);
        const ratio = w / h;
        let ew = MAX_W, eh = Math.round(MAX_W / ratio);
        if (eh > MAX_H) { eh = MAX_H; ew = Math.round(MAX_H * ratio); }
        cells.push(new TableCell({
          borders: allBd(),
          children: [
            new Paragraph({ children: [new ImageRun({ data: dataUrlToBuffer(pl.dataUrl), transformation: { width: Math.round(ew / 9144), height: Math.round(eh / 9144) } })], alignment: AlignmentType.CENTER, spacing: { before: 80, after: 40 } }),
            new Paragraph({ children: [new TextRun({ text: pl.name || pl.fileName, font: "Calibri", size: 18, italics: true, color: C.gray })], alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 } }),
          ],
        }));
        if (imgPlanuri.length % 2 !== 0 && j === imgPlanuri.length - 1)
          cells.push(new TableCell({ borders: NB, children: [sp(0)] }));
      }
      add(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, rows: [new TableRow({ children: cells })] }));
      add(gap(80));
    }
  }

  // ══ FOOTER ══
  add(gap(200));
  add(new Paragraph({
    children: [new TextRun({ text: "Generat de Zephren \u2014 " + new Date().toLocaleString("ro-RO") + "\u2003|\u2003ZEPHREN.COM", font: "Calibri", size: 17, italics: true, color: C.lGray })],
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.border } },
    spacing: { before: 80, after: 0 },
  }));

  // ══ CREARE DOCUMENT ══
  const doc = new Document({
    creator: "Zephren Energy Performance Calculator",
    title: isBlank ? "Formular Client (Gol) \u2014 Audit Energetic" : "Formular Client \u2014 Audit Energetic",
    description: "Formular colectare date pentru calculul performan\u021bei energetice conform Mc 001-2022",
    styles: { default: { document: { run: { font: "Calibri", size: 20, color: C.dark } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 851, right: 851, bottom: 851, left: 851 } } },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = !isBlank
    ? "formular-date-client-" + new Date().toISOString().slice(0, 10) + ".docx"
    : isWordInteractive
      ? "Formular_Client_Audit_Energetic_Word.docx"
      : "Formular_Client_Audit_Energetic_Print.docx";
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

  const loadDemoData = () => {
    if (Object.keys(data).length > 0 && !confirm("Formularul conține deja date. Le înlocuiți cu datele demo?")) return;
    setData(DEMO_DATA);
  };

  useEffect(() => {
    const id = setTimeout(() => {
      localStorage.setItem("clientFormData", JSON.stringify(data));
      onDataChange?.(data);
    }, 500);
    return () => clearTimeout(id);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setTimeout(() => {
      localStorage.setItem("clientFormPlanuri", JSON.stringify(planuri));
    }, 500);
    return () => clearTimeout(id);
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
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <button onClick={loadDemoData}
              className="px-4 py-2 bg-teal-500/20 border border-teal-500/30 hover:bg-teal-500/30 text-teal-300 rounded-lg text-sm font-medium transition-all"
              title="Pre-populează cu date fictive pentru testare">
              🧪 Demo
            </button>
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
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl px-6 py-4 space-y-4">
        <ProgressBar sections={SECTIONS_META} data={data} />

        {/* Formular Gol — 3 opțiuni */}
        <div className="border border-white/[0.08] rounded-xl p-4 bg-white/[0.02]">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            Formular gol pentru client — alegeți modul de completare
          </p>
          <div className="flex flex-wrap gap-2">
            {/* Opțiunea 1 — Print */}
            <button
              onClick={downloadBlankPrint}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 text-white/70 hover:text-amber-300 rounded-lg text-sm transition-all"
              title="Descarcă formular cu căsuțe ☐ — imprimă și completează cu pixul"
            >
              <span className="text-base">🖨️</span>
              <span>
                <span className="font-medium">Print</span>
                <span className="text-white/40 ml-1 text-xs">☐ imprimă + bifează cu pixul</span>
              </span>
            </button>

            {/* Opțiunea 2 — Word interactiv */}
            <button
              onClick={downloadBlankWordInteract}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 text-white/70 hover:text-blue-300 rounded-lg text-sm transition-all"
              title="Descarcă formular cu checkbox-uri Word interactive — deschide în Word și bifează cu click"
            >
              <span className="text-base">📝</span>
              <span>
                <span className="font-medium">Word</span>
                <span className="text-white/40 ml-1 text-xs">☑ bifează cu click în Word</span>
              </span>
            </button>

            {/* Opțiunea 3 — Online (copiază link producție) */}
            <button
              onClick={() => {
                const url = "https://energy-app-ruby.vercel.app";
                if (navigator.clipboard && window.isSecureContext) {
                  navigator.clipboard.writeText(url).then(() => {
                    alert("Link copiat în clipboard!\n\nTrimite-l clientului:\n" + url);
                  }).catch(() => {
                    prompt("Copiază manual și trimite clientului:", url);
                  });
                } else {
                  prompt("Copiază manual și trimite clientului:", url);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-green-500/30 hover:bg-green-500/5 text-white/70 hover:text-green-300 rounded-lg text-sm transition-all"
              title="Copiază link-ul paginii pentru a-l trimite clientului — acesta poate completa online"
            >
              <span className="text-base">🔗</span>
              <span>
                <span className="font-medium">Online</span>
                <span className="text-white/40 ml-1 text-xs">copiază link pentru client</span>
              </span>
            </button>
          </div>
        </div>

        {/* Butoane auditor */}
        <div className="flex justify-end gap-3">
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
