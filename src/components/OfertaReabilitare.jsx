import React, { useState, useCallback } from "react";
import { cn } from "./ui.jsx";
import { nextDocNumber } from "../utils/doc-counter.js";
import { setupRomanianFont, makeTextWriter, ROMANIAN_FONT } from "../utils/pdf-fonts.js";
// Sprint Audit Prețuri (9 mai 2026) Task D — scenariu MID + selector low/mid/high
// Sursa canonică prețuri: rehab-prices.js (Q1 2026). Multiplicatorii sunt calibrați
// pe raportul mediu low/mid și high/mid din REHAB_PRICES (vezi audit §5.4).
import { getEurRonSync, REHAB_PRICES } from "../data/rehab-prices.js";
// Tier 1 — indexare inflație construcții (Eurostat sts_copi_q RO)
import { getCostInflationFactor, getCostInflationFactorSync } from "../data/cost-index.js";
// Sprint Îmbunătățiri #4 — telemetrie prețuri
import { logPriceEvent } from "../data/price-telemetry.js";
// Sprint Îmbunătățiri #2 — outlier detection investiție
import { detectOutlier } from "../calc/cost-outlier-detector.js";

const YEAR = new Date().getFullYear();
const TODAY_ISO = new Date().toISOString().slice(0, 10);
const TODAY_RO = new Date().toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });

// Multiplicatori scenariu vs valoarea de bază (MID). Calibrare conservatoare:
// — low ≈ 85% mid (raport mediu rehab-prices: 42/49=0.86, 28/32=0.87, 1.400/1.750=0.80, 5.000/6.500=0.77 → ~0.85 mediu)
// — high ≈ 118% mid (60/49=1.22, 40/32=1.25, 2.100/1.750=1.20, 8.500/6.500=1.31 → ~1.18 conservator)
export const SCENARIO_MULTIPLIERS = { low: 0.85, mid: 1.0, high: 1.18 };
export const SCENARIO_LABELS = {
  low:  { name: "Optimist",   sub: "(low)",  desc: "preț minim piață" },
  mid:  { name: "Realist",    sub: "(mid)",  desc: "preț mediu piață" },
  high: { name: "Conservator",sub: "(high)", desc: "preț max piață" },
};

// Sprint A Task 7: counter secvențial, fără Math.random (risc coliziune)
function makeOfertaNr() {
  return nextDocNumber("OF");
}

function epToClasa(ep) {
  if (ep <= 50)  return "A+";
  if (ep <= 100) return "A";
  if (ep <= 150) return "B";
  if (ep <= 200) return "C";
  if (ep <= 300) return "D";
  if (ep <= 400) return "E";
  if (ep <= 500) return "F";
  return "G";
}

const FINANTARI = ["PNRR", "Casa Verde", "Credit verde", "Fondul de Mediu"];
const SUBVENTII_DEFAULT = { "PNRR": 70, "Casa Verde": 90, "Credit verde": 0, "Fondul de Mediu": 40 };
const CLASA_CULORI = { "A+": "#059669", "A": "#10b981", "B": "#34d399", "C": "#fbbf24", "D": "#f97316", "E": "#ef4444", "F": "#dc2626", "G": "#991b1b" };

const inputCls = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all";
const labelCls = "text-xs font-medium uppercase tracking-wider text-white/50";

function Field({ label, className = "", children }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && <label className={labelCls}>{label}</label>}
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-400/80 border-b border-white/10 pb-1 mb-3">{children}</h3>;
}

function mkScenariu() {
  return { id: Date.now(), denumire: "", reducereEP: 40, investitie: "", finantari: [], subventii: { ...SUBVENTII_DEFAULT } };
}

// Sprint 06may2026 audit P0 (B3) — prepopulare scenarii din pașaport
// (anterior „Scenariu 1: (fără denumire)" + Investiție 0 RON + Payback 0 ani — neprofesional)
function mkScenariiFromPassport(passport, baselineEP) {
  if (!passport?.roadmap?.phases?.length || !baselineEP) {
    return [{ ...mkScenariu(), denumire: "Pachet — Reabilitare cuprinzătoare" }];
  }
  const phases = passport.roadmap.phases;
  const epEnd = phases[phases.length - 1].ep_after || baselineEP;
  const reducPct = Math.max(5, Math.min(95, Math.round(((baselineEP - epEnd) / baselineEP) * 100)));
  const totalCost = phases.reduce((acc, p) => acc + (p.phaseCost_RON || 0), 0);
  const measureNames = phases
    .flatMap((p) => (p.measures || []).map((m) => m.name))
    .slice(0, 3)
    .join(", ");
  return [
    {
      id: Date.now(),
      denumire: `Pachet integrat (${phases.length} faze) — clasă ${phases[phases.length - 1].class_after || "—"}`,
      reducereEP: reducPct,
      investitie: String(Math.round(totalCost)),
      finantari: [],
      subventii: { ...SUBVENTII_DEFAULT },
      _autoDescription: measureNames,
    },
  ];
}

const SCENARIO_COLORS = ["bg-amber-500/20 border-amber-500/40 text-amber-300", "bg-green-500/20 border-green-500/40 text-green-300", "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"];

export default function OfertaReabilitare({ building, instSummary, auditor, passport = null, onClose }) {
  const ep = instSummary?.ep_total_m2 ?? 0;
  const co2 = instSummary?.co2_total_m2 ?? 0;
  const au = building?.areaUseful ?? 0;

  const [nr, setNr] = useState(makeOfertaNr);
  const [dataOferta, setDataOferta] = useState(TODAY_ISO);
  const [valabilitate, setValabilitate] = useState("30");
  const [clientNume, setClientNume] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [salut, setSalut] = useState("Stimate Domn/Doamnă");
  const [pretKwh, setPretKwh] = useState("0.92");
  const [scenarii, getScenarii] = useState([mkScenariu()]);
  const setScenarii = getScenarii;
  const [generating, setGenerating] = useState(false);
  // Sprint Audit Prețuri Task D — scenariu activ pentru aplicarea multiplicatorului
  // pe investiția de bază (introdusă manual sau din pașaport, considerată MID).
  const [scenarioMode, setScenarioMode] = useState("mid");
  // Sprint Îmbunătățiri #6 — modal GHID auditor
  const [showScenarioGuide, setShowScenarioGuide] = useState(false);

  const pretKwhNum = parseFloat(pretKwh) || 0.92;
  const costAnual = +(ep * au * pretKwhNum).toFixed(0);
  const clasaActuala = epToClasa(ep);
  // Curs EUR/RON live BNR (cache 24h) sau fallback canonic pentru afișare în footer.
  const eurRon = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
  const scenarioMultiplier = SCENARIO_MULTIPLIERS[scenarioMode] || 1.0;

  // Tier 1 — factor inflație construcții (Eurostat sts_copi_q). State + auto-fetch.
  const [costIndex, setCostIndex] = React.useState(() => getCostInflationFactorSync());
  React.useEffect(() => {
    let cancelled = false;
    getCostInflationFactor().then(r => { if (!cancelled && r) setCostIndex(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const inflationFactor = costIndex.factor || 1.0;

  // Sprint 06may2026 audit P0 (B3) — la primul mount, dacă există passport,
  // prepopulez scenariul cu denumire + investiție derivate din pașaport.
  // Altfel rămâne placeholder „(fără denumire)" + 0 RON.
  React.useEffect(() => {
    if (passport?.roadmap?.phases?.length && scenarii.length === 1 && !scenarii[0].denumire && !scenarii[0].investitie) {
      setScenarii(mkScenariiFromPassport(passport, ep));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passport?.passportId]);

  const updateScenariu = useCallback((id, patch) => {
    setScenarii(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, []);

  const toggleFinantare = useCallback((id, fin) => {
    setScenarii(prev => prev.map(s => {
      if (s.id !== id) return s;
      const has = s.finantari.includes(fin);
      return { ...s, finantari: has ? s.finantari.filter(f => f !== fin) : [...s.finantari, fin] };
    }));
  }, []);

  function calcScenariu(s) {
    const epNou = +(ep * (1 - s.reducereEP / 100)).toFixed(1);
    const co2Nou = +(co2 * (1 - s.reducereEP / 100)).toFixed(2);
    const clasaNou = epToClasa(epNou);
    const econAn = +((ep - epNou) * au * pretKwhNum).toFixed(0);
    // Investiția stocată (s.investitie) este valoarea de bază MID. La afișare/PDF
    // se aplică DOI multiplicatori:
    //   1) scenariu (low 0.85 / mid 1.0 / high 1.18) — bandă preț piață
    //   2) inflație construcții (Tier 1, Eurostat sts_copi_q) — actualizare temporală
    const baseInv = parseFloat(s.investitie) || 0;
    const inv = +(baseInv * scenarioMultiplier * inflationFactor).toFixed(0);
    const subvTotal = s.finantari.reduce((acc, f) => acc + (s.subventii[f] || 0), 0);
    const subvPct = Math.min(subvTotal, 90);
    const invNet = +(inv * (1 - subvPct / 100)).toFixed(0);
    const payback = econAn > 0 ? +(invNet / econAn).toFixed(1) : "—";
    return { epNou, co2Nou, clasaNou, econAn, inv, baseInv, subvPct, invNet, payback };
  }

  async function handleGeneratePDF() {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      // S30A·A1 — diacritice RO via Liberation Sans embedded
      const fontOk = await setupRomanianFont(doc);
      const writeText = makeTextWriter(doc, fontOk);
      const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
      const M = 15;
      let y = 18;
      const W = 210;

      // QR pașaport renovare (EPBD 2024 Art. 12), dacă e disponibil
      let qrDataURL = null;
      if (passport?.passportId) {
        try {
          const { generatePassportQR } = await import("../lib/qr-passport.js");
          const qr = await generatePassportQR(passport.passportId, { size: 120 });
          qrDataURL = qr.dataURL;
        } catch (err) {
          console.warn("QR pașaport nu a putut fi generat:", err);
        }
      }

      // Header bar
      doc.setFillColor(20, 20, 35);
      doc.rect(0, 0, W, 30, "F");
      doc.setFontSize(18);
      doc.setTextColor(251, 191, 36);
      doc.setFont(baseFont, "bold");
      writeText("ZEPHREN", M, 14);
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
      doc.setFont(baseFont, "normal");
      const audLine = [auditor?.firma || auditor?.name, auditor?.certNr ? `Cert. ${auditor.certNr}` : null].filter(Boolean).join("  |  ");
      if (audLine) writeText(audLine, M, 20);
      writeText(`Data: ${TODAY_RO}`, W - M, 14, { align: "right" });
      y = 38;

      // Titlu
      doc.setFontSize(13);
      doc.setFont(baseFont, "bold");
      doc.setTextColor(30, 30, 30);
      writeText("OFERTĂ DE REABILITARE ENERGETICĂ", W / 2, y, { align: "center" });
      y += 6;
      doc.setFontSize(9);
      doc.setFont(baseFont, "normal");
      doc.setTextColor(100, 100, 100);
      writeText(`Nr. ${nr}  |  Data: ${dataOferta}  |  Valabilitate: ${valabilitate} zile`, W / 2, y, { align: "center" });
      y += 10;

      // Salut + client
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.setFont(baseFont, "normal");
      writeText(`${salut},`, M, y); y += 6;
      const intro = `Vă prezentăm oferta de reabilitare energetică pentru imobilul dumneavoastră, elaborată în baza analizei energetice efectuate.`;
      const introLines = doc.splitTextToSize(intro, W - M * 2);
      writeText(introLines, M, y); y += introLines.length * 4 + 6;

      // Date imobil
      doc.setFillColor(245, 245, 250);
      doc.rect(M, y - 3, W - M * 2, 26, "F");
      doc.setFont(baseFont, "bold");
      doc.setFontSize(9);
      writeText("DATE IMOBIL", M + 3, y + 2);
      doc.setFont(baseFont, "normal");
      doc.setFontSize(8.5);
      const imobilLines = [
        `Adresă: ${building?.address || "—"}`,
        `Categorie: ${building?.category || "—"}  |  Suprafață utilă: ${au} m²  |  An construcție: ${building?.yearBuilt || "—"}`,
        building?.county ? `Județ: ${building.county}` : null,
      ].filter(Boolean);
      imobilLines.forEach((l, i) => { writeText(l, M + 3, y + 8 + i * 5); });
      y += 32;

      // Situație actuală
      doc.setFont(baseFont, "bold");
      doc.setFontSize(10);
      writeText("1. SITUAȚIE ACTUALĂ", M, y); y += 6;
      doc.setFillColor(240, 240, 245);
      doc.rect(M, y, W - M * 2, 6, "F");
      doc.setFontSize(8);
      ["Indicator", "Valoare", "Clasă"].forEach((h, i) => writeText(h, M + 3 + i * 55, y + 4));
      y += 7;
      doc.setFont(baseFont, "normal");
      const rows = [
        ["EP total", `${ep.toFixed(1)} kWh/m²·an`, clasaActuala],
        ["CO₂ total", `${co2.toFixed(2)} kgCO₂/m²·an`, ""],
        ["Cost anual estimat", `${costAnual.toLocaleString("ro-RO")} RON/an`, ""],
      ];
      rows.forEach(r => {
        writeText(r[0], M + 3, y + 4);
        writeText(r[1], M + 58, y + 4);
        if (r[2]) { doc.setFont(baseFont, "bold"); writeText(r[2], M + 113, y + 4); doc.setFont(baseFont, "normal"); }
        y += 6;
      });
      y += 6;

      // Scenarii
      doc.setFont(baseFont, "bold");
      doc.setFontSize(10);
      writeText("2. SCENARII PROPUSE", M, y); y += 6;
      // Sprint Audit Prețuri Task D — indicator scenariu preț activ
      doc.setFont(baseFont, "italic");
      doc.setFontSize(8);
      doc.setTextColor(140, 100, 30);
      const lblScenariu = SCENARIO_LABELS[scenarioMode];
      writeText(`Bandă preț: ${lblScenariu.name} ${lblScenariu.sub} — ${lblScenariu.desc} (multiplicator ×${scenarioMultiplier.toFixed(2)} pe valoarea de bază mid)`, M, y);
      doc.setTextColor(30, 30, 30);
      doc.setFont(baseFont, "normal");
      y += 5;

      scenarii.forEach((s, idx) => {
        const c = calcScenariu(s);
        doc.setFillColor(idx === 0 ? 254 : idx === 1 ? 209 : 167, idx === 0 ? 215 : idx === 1 ? 250 : 243, idx === 0 ? 170 : idx === 1 ? 205 : 210);
        doc.rect(M, y, W - M * 2, 5, "F");
        doc.setFont(baseFont, "bold");
        doc.setFontSize(9);
        writeText(`Scenariu ${idx + 1}: ${s.denumire || "(fără denumire)"}`, M + 3, y + 3.5);
        y += 7;
        doc.setFont(baseFont, "normal");
        doc.setFontSize(8.5);
        writeText(`EP: ${ep.toFixed(1)} → ${c.epNou} kWh/m²·an  |  Clasă: ${clasaActuala} → ${c.clasaNou}  |  CO₂: ${co2.toFixed(2)} → ${c.co2Nou} kgCO₂/m²·an`, M + 3, y);
        y += 5;
        writeText(`Reducere EP: ${s.reducereEP}%  |  Economie anuală: ${c.econAn.toLocaleString("ro-RO")} RON/an  |  Payback simplu: ${c.payback} ani`, M + 3, y);
        y += 5;
        writeText(`Investiție estimată: ${c.inv.toLocaleString("ro-RO")} RON  |  Subvenție: ${c.subvPct}%  |  Cost net: ${c.invNet.toLocaleString("ro-RO")} RON`, M + 3, y);
        y += 5;
        if (s.finantari.length) writeText(`Finanțare: ${s.finantari.join(", ")}`, M + 3, y);
        y += 9;
      });

      // Notă finală
      doc.setFont(baseFont, "italic");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const inflationNote = costIndex.source !== 'fallback'
        ? ` · indexare inflație construcții ${inflationFactor >= 1 ? '+' : ''}${((inflationFactor - 1) * 100).toFixed(1)}% (Eurostat ${costIndex.currentPeriod || costIndex.basePeriod})`
        : '';
      const nota = `Prețuri orientative ${YEAR} · sursa: piața RO + HG 907/2016 · rehab-prices.js (${REHAB_PRICES.last_updated}) · curs EUR/RON: ${eurRon.toFixed(2)} (BNR live)${inflationNote}. Fără TVA. Auditul energetic detaliat va preciza costurile exacte. Valoarea subvențiilor depinde de eligibilitate și disponibilitatea fondurilor.`;
      const notaLines = doc.splitTextToSize(nota, W - M * 2);
      writeText(notaLines, M, y); y += notaLines.length * 4 + 10;

      // Semnătură
      doc.setTextColor(30, 30, 30);
      doc.setFont(baseFont, "normal");
      doc.setFontSize(9);
      writeText("Auditor energetic:", M, y);
      writeText("Semnătură și ștampilă:", W - M - 60, y);
      y += 5;
      doc.setFont(baseFont, "bold");
      if (auditor?.name)   writeText(auditor.name, M, y);
      if (auditor?.certNr) { y += 5; doc.setFont(baseFont, "normal"); writeText(`Cert. nr. ${auditor.certNr}`, M, y); }
      y += 5;
      doc.setFont(baseFont, "normal");
      writeText(`Data: ${TODAY_RO}`, M, y);

      // QR pașaport renovare (EPBD 2024/1275 Art. 12) — jos-dreapta
      if (qrDataURL && passport?.passportId) {
        try {
          doc.addImage(qrDataURL, "PNG", W - M - 24, 258, 22, 22);
          doc.setFontSize(6);
          doc.setTextColor(120, 120, 140);
          writeText("Pașaport renovare EPBD", W - M - 24, 283);
          writeText(`ID: ${passport.passportId.slice(0, 8)}…`, W - M - 24, 286);
        } catch {
          /* ignore embed failures */
        }
      }

      doc.save(`Oferta_Reabilitare_${nr}.pdf`);
    } catch {
      alert("jsPDF nu este instalat. Adaugă 'jspdf' în package.json.");
    }
    setGenerating(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl flex flex-col" style={{ scrollbarWidth: "thin" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-slate-900 z-10">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Ofertă de Reabilitare Energetică</h2>
            <p className="text-xs text-white/40 mt-0.5">{building?.address || "Imobil"}</p>
            <p className="text-[10px] opacity-45 mt-0.5">
              Scenariu activ: <span className="text-amber-400/80">{SCENARIO_LABELS[scenarioMode].name} {SCENARIO_LABELS[scenarioMode].sub}</span>
              {" · "}Multiplicator preț: ×{scenarioMultiplier.toFixed(2)}
              {" · "}Sursa: <span className="font-mono">rehab-prices.js</span> ({REHAB_PRICES.last_updated})
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl leading-none">&times;</button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* 1. Config document */}
          <section>
            <SectionTitle>1. Date ofertă</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Nr. ofertă">
                <input className={inputCls} value={nr} onChange={e => setNr(e.target.value)} />
              </Field>
              <Field label="Data ofertei">
                <input type="date" className={inputCls} value={dataOferta} onChange={e => setDataOferta(e.target.value)} />
              </Field>
              <Field label="Valabilitate (zile)">
                <input type="number" className={inputCls} value={valabilitate} onChange={e => setValabilitate(e.target.value)} min="1" />
              </Field>
              <Field label="Client — Nume">
                <input className={inputCls} value={clientNume} onChange={e => setClientNume(e.target.value)} placeholder="Ion Popescu" />
              </Field>
              <Field label="Telefon client">
                <input className={inputCls} value={clientTel} onChange={e => setClientTel(e.target.value)} placeholder="+40 7xx xxx xxx" />
              </Field>
              <Field label="Email client">
                <input className={inputCls} value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" />
              </Field>
              <Field label="Formulă de adresare" className="col-span-2 sm:col-span-3">
                <select className={inputCls} value={salut} onChange={e => setSalut(e.target.value)}>
                  <option>Stimate Domn/Doamnă</option>
                  <option>Stimată Doamnă</option>
                  <option>Stimate Domn</option>
                </select>
              </Field>
            </div>
          </section>

          {/* 2. Situație actuală */}
          <section>
            <SectionTitle>2. Situație actuală (din audit)</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "EP actual", val: `${ep.toFixed(1)} kWh/m²·an` },
                { label: "Clasă actuală", val: clasaActuala, color: CLASA_CULORI[clasaActuala] },
                { label: "CO₂ actual", val: `${co2.toFixed(2)} kgCO₂/m²·an` },
                { label: "Cost anual estimat", val: `${costAnual.toLocaleString("ro-RO")} RON` },
              ].map(item => (
                <div key={item.label} className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="text-xs text-white/40 mb-1">{item.label}</div>
                  <div className="text-sm font-bold" style={item.color ? { color: item.color } : {}}>{item.val}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label className={labelCls}>Preț energie (RON/kWh):</label>
              <input type="number" step="0.01" className={cn(inputCls, "w-28")} value={pretKwh} onChange={e => setPretKwh(e.target.value)} />
            </div>
          </section>

          {/* 3. Scenarii */}
          <section>
            <SectionTitle>3. Scenarii propuse</SectionTitle>

            {/* Sprint Audit Prețuri Task D — selector scenariu preț (low/mid/high) */}
            {/* Sprint Îmbunătățiri #6 (9 mai 2026) — modal GHID cu tabel orientativ */}
            <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    Bandă preț estimat
                    <button type="button" onClick={() => setShowScenarioGuide(true)}
                      title="Ghid selecție scenariu — când să folosești fiecare"
                      className="w-4 h-4 rounded-full bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 text-[10px] font-bold flex items-center justify-center transition-all">
                      ℹ
                    </button>
                  </div>
                  <div className="text-[10px] text-white/50 mt-0.5">
                    Selectați scenariul aplicat investiției — multiplicator pe valoarea de bază (mid).
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {(["low", "mid", "high"]).map(mode => {
                    const active = scenarioMode === mode;
                    const lbl = SCENARIO_LABELS[mode];
                    return (
                      <button key={mode} type="button"
                        onClick={() => {
                          setScenarioMode(mode);
                          // Sprint Îmbunătățiri #4 — telemetrie distribuție low/mid/high
                          logPriceEvent("scenario.changed", { mode, multiplier: SCENARIO_MULTIPLIERS[mode], context: "OfertaReabilitare" });
                        }}
                        title={`${lbl.name} ${lbl.sub} — ${lbl.desc} · ×${SCENARIO_MULTIPLIERS[mode].toFixed(2)}`}
                        className={cn("text-xs px-3 py-1.5 rounded-lg border transition-all font-medium",
                          active
                            ? "bg-amber-500/30 border-amber-500/60 text-amber-200 shadow-sm"
                            : "bg-white/5 border-white/10 text-white/50 hover:border-amber-500/30 hover:text-white/70")}>
                        {lbl.name} <span className="opacity-60 ml-1 text-[10px]">{lbl.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal GHID auditor — Sprint Îmbunătățiri #6 */}
            {showScenarioGuide && (
              <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={(e) => e.target === e.currentTarget && setShowScenarioGuide(false)}>
                <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 sticky top-0 bg-slate-900">
                    <div>
                      <h3 className="text-sm font-bold text-amber-300">Ghid selecție scenariu preț</h3>
                      <p className="text-[10px] text-white/50">Când să folosești fiecare bandă · sursa: rehab-prices.js + experiență contractori RO 2025-2026</p>
                    </div>
                    <button onClick={() => setShowScenarioGuide(false)} className="text-white/40 hover:text-white text-xl leading-none">&times;</button>
                  </div>
                  <div className="p-5 space-y-4 text-sm text-white/80">
                    <p className="text-xs leading-relaxed">
                      Banda de prețuri în <span className="font-mono text-amber-300">rehab-prices.js</span> reflectă o gamă realistă a pieței româneşti
                      la Q1 2026. Selectați scenariul în funcție de context proiect, locație și sezonul construcțiilor.
                    </p>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-amber-300/80">
                          <th className="text-left py-2 px-2 font-semibold">Context</th>
                          <th className="text-center py-2 px-2 font-semibold text-emerald-300">Optimist (low)<br/>×0.85</th>
                          <th className="text-center py-2 px-2 font-semibold text-amber-300">Realist (mid)<br/>×1.00</th>
                          <th className="text-center py-2 px-2 font-semibold text-orange-300">Conservator (high)<br/>×1.18</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/70">
                        <tr className="border-b border-white/5">
                          <td className="py-2 px-2 font-medium">📍 Localizare geografică</td>
                          <td className="py-2 px-2 text-center text-[11px]">Rural · oraș mic</td>
                          <td className="py-2 px-2 text-center text-[11px]">Reședință județ · suburb major</td>
                          <td className="py-2 px-2 text-center text-[11px]">București · Cluj · centru istoric protejat</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-2 px-2 font-medium">📅 Sezonul construcțiilor</td>
                          <td className="py-2 px-2 text-center text-[11px]">Iarnă · contractori liberi</td>
                          <td className="py-2 px-2 text-center text-[11px]">Primăvară / toamnă</td>
                          <td className="py-2 px-2 text-center text-[11px]">Vară · cerere maximă</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-2 px-2 font-medium">🏢 Tip clădire</td>
                          <td className="py-2 px-2 text-center text-[11px]">Renovare standard rezidențial</td>
                          <td className="py-2 px-2 text-center text-[11px]">Mixed-use · birou clasic</td>
                          <td className="py-2 px-2 text-center text-[11px]">Patrimoniu · spital · școală</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-2 px-2 font-medium">⚡ Acces utilități</td>
                          <td className="py-2 px-2 text-center text-[11px]">Acces facil · branșament existent</td>
                          <td className="py-2 px-2 text-center text-[11px]">Standard</td>
                          <td className="py-2 px-2 text-center text-[11px]">Branșament nou · acces dificil</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-2 px-2 font-medium">💼 Tip ofertă</td>
                          <td className="py-2 px-2 text-center text-[11px]">Best-case marketing · negociere</td>
                          <td className="py-2 px-2 text-center text-[11px]">Ofertă oficială realistă</td>
                          <td className="py-2 px-2 text-center text-[11px]">Buget public · achiziție</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2 font-medium">🎯 Recomandat pentru</td>
                          <td className="py-2 px-2 text-center text-[11px]">Audit preliminar pre-vânzare</td>
                          <td className="py-2 px-2 text-center text-[11px] text-amber-300 font-semibold">Default · ofertă audit</td>
                          <td className="py-2 px-2 text-center text-[11px]">Plan financiar bancar · PNRR</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-[11px] text-amber-200/90">
                      <strong>💡 Recomandare profesională:</strong> Folosiți întotdeauna <span className="font-semibold">Realist (mid)</span> ca default
                      pentru raportul oficial. Folosiți <span className="font-semibold">Conservator (high)</span> când clientul are buget rigid (PNRR/AFM)
                      — surprizele costă mai mult decât marja extra. <span className="font-semibold">Optimist (low)</span> e doar pentru a indica
                      potențialul de negociere în text comercial.
                    </div>
                    <div className="text-[10px] text-white/40">
                      Calibrare bandă: low ≈ 85% mid (raport mediu rehab-prices) · high ≈ 118% mid · derivat din wall_eps_10cm 42/49/60
                      + roof_eps_15cm 28/32/40 + boiler_cond_24kw 1400/1750/2100 + hp_aw_8kw 5000/6500/8500 EUR.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {scenarii.map((s, idx) => {
                const c = calcScenariu(s);
                return (
                  <div key={s.id} className="rounded-xl border border-white/10 bg-white/3 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Scenariu {idx + 1}</span>
                      {scenarii.length > 1 && (
                        <button onClick={() => setScenarii(prev => prev.filter(x => x.id !== s.id))}
                          className="text-xs text-white/30 hover:text-red-400 transition-colors">Elimină</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <Field label="Denumire scenariu" className="sm:col-span-2">
                        <input className={inputCls} value={s.denumire} placeholder="ex: Izolație pereți + ferestre noi"
                          onChange={e => updateScenariu(s.id, { denumire: e.target.value })} />
                      </Field>
                      <Field label={`Reducere EP: ${s.reducereEP}%`}>
                        <input type="range" min="0" max="90" value={s.reducereEP}
                          onChange={e => updateScenariu(s.id, { reducereEP: +e.target.value })}
                          className="w-full accent-amber-500" />
                      </Field>
                      <Field label="Investiție bază — mid (RON)">
                        <input type="number" className={inputCls} value={s.investitie} placeholder="0"
                          onChange={e => updateScenariu(s.id, { investitie: e.target.value })} />
                        {s.investitie && scenarioMode !== "mid" && (
                          <div className="text-[10px] text-amber-300/70 mt-1">
                            Aplicat scenariu {SCENARIO_LABELS[scenarioMode].name.toLowerCase()}: <span className="font-mono">{c.inv.toLocaleString("ro-RO")} RON</span>
                            {" "}(×{scenarioMultiplier.toFixed(2)})
                          </div>
                        )}
                        {/* Sprint Îmbunătățiri #2 — outlier detection vs benchmark rehab-prices */}
                        {s.investitie && au > 0 && (() => {
                          const out = detectOutlier(parseFloat(s.investitie) || 0, au, { category: building?.category });
                          if (out.level === "ok" || out.level === "unknown") return null;
                          const colorMap = {
                            "warn-low":      "bg-amber-500/10 border-amber-500/30 text-amber-200",
                            "critical-low":  "bg-red-500/15 border-red-500/40 text-red-200",
                            "warn-high":     "bg-amber-500/10 border-amber-500/30 text-amber-200",
                            "critical-high": "bg-red-500/15 border-red-500/40 text-red-200",
                          };
                          const cls = colorMap[out.level] || "bg-white/5 border-white/10 text-white/60";
                          // Logează outlier flag pentru telemetrie
                          // (NOTĂ: efect lateral în render — ok pentru analitică simplă)
                          if (typeof window !== "undefined") {
                            try { logPriceEvent("outlier.flagged", { level: out.level, deltaPct: out.deltaPct, category: building?.category, Au: au }); } catch {}
                          }
                          return (
                            <div className={cn("text-[10px] mt-1 px-2 py-1.5 rounded border", cls)}
                              title={`Benchmark rehab-prices: ${(out.benchmark.low / 1000).toFixed(0)}–${(out.benchmark.high / 1000).toFixed(0)}k RON pentru ${au} m² · curs ${out.benchmark.eurRon.toFixed(2)}`}>
                              {out.message}
                            </div>
                          );
                        })()}
                      </Field>
                    </div>

                    {/* Finanțare */}
                    <div className="mb-3">
                      <label className={cn(labelCls, "mb-2 block")}>Finanțare disponibilă</label>
                      <div className="flex flex-wrap gap-2">
                        {FINANTARI.map(f => {
                          const active = s.finantari.includes(f);
                          return (
                            <button key={f} type="button" onClick={() => toggleFinantare(s.id, f)}
                              className={cn("text-xs px-3 py-1 rounded-full border transition-all",
                                active ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "bg-white/5 border-white/10 text-white/50 hover:border-white/30")}>
                              {f}
                            </button>
                          );
                        })}
                      </div>
                      {s.finantari.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-3">
                          {s.finantari.map(f => (
                            <div key={f} className="flex items-center gap-2">
                              <span className="text-xs text-white/40">{f} subvenție %:</span>
                              <input type="number" min="0" max="100"
                                className={cn(inputCls, "w-16 text-xs py-1")}
                                value={s.subventii[f] ?? 0}
                                onChange={e => updateScenariu(s.id, { subventii: { ...s.subventii, [f]: +e.target.value } })} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Rezultate calc */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: "EP nou", val: `${c.epNou} kWh/m²·an` },
                        { label: "Clasă nouă", val: c.clasaNou, color: CLASA_CULORI[c.clasaNou] },
                        { label: "Economie anuală", val: `${c.econAn.toLocaleString("ro-RO")} RON` },
                        { label: "Payback net", val: `${c.payback} ani` },
                      ].map(item => (
                        <div key={item.label} className="bg-white/5 rounded-lg p-2 border border-white/10">
                          <div className="text-xs text-white/40">{item.label}</div>
                          <div className="text-sm font-bold mt-0.5" style={item.color ? { color: item.color } : {}}>{item.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {scenarii.length < 3 && (
              <button onClick={() => setScenarii(prev => [...prev, mkScenariu()])}
                className="mt-3 text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 rounded-lg px-4 py-2 transition-all">
                + Adaugă scenariu
              </button>
            )}
          </section>

          {/* Footer informativ Task D + Tier 1 — sursa + curs + inflație */}
          <div className="text-[10px] text-white/30 -mt-3 text-center">
            Prețuri orientative {YEAR} · sursa: piață RO + HG 907/2016 · <span className="font-mono">rehab-prices.js</span> ({REHAB_PRICES.last_updated})
            {" · "}curs EUR/RON: {eurRon.toFixed(2)} (BNR live)
            {costIndex.source !== 'fallback' && (
              <> {" · "}<span className="text-amber-300/60">📈 inflație construcții {inflationFactor >= 1 ? '+' : ''}{((inflationFactor - 1) * 100).toFixed(1)}%</span> (Eurostat {costIndex.currentPeriod || costIndex.basePeriod})</>
            )}
            {" · "}fără TVA
          </div>

          {/* 4. Preview comparativ */}
          <section>
            <SectionTitle>4. Previzualizare comparativă</SectionTitle>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${1 + scenarii.length}, 1fr)` }}>
              {/* Situație actuală */}
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 flex flex-col gap-1">
                <div className="text-xs font-semibold text-red-400 mb-1">Actual</div>
                <div className="text-lg font-bold text-white">{ep.toFixed(0)}</div>
                <div className="text-xs text-white/40">kWh/m²·an</div>
                <div className="mt-1 text-xs font-bold" style={{ color: CLASA_CULORI[clasaActuala] }}>Clasă {clasaActuala}</div>
                <div className="text-xs text-white/40">{costAnual.toLocaleString("ro-RO")} RON/an</div>
              </div>
              {scenarii.map((s, idx) => {
                const c = calcScenariu(s);
                return (
                  <div key={s.id} className={cn("rounded-xl border p-3 flex flex-col gap-1", SCENARIO_COLORS[idx])}>
                    <div className="text-xs font-semibold mb-1">Sc. {idx + 1}</div>
                    <div className="text-lg font-bold text-white">{c.epNou}</div>
                    <div className="text-xs text-white/40">kWh/m²·an</div>
                    <div className="mt-1 text-xs font-bold" style={{ color: CLASA_CULORI[c.clasaNou] }}>Clasă {c.clasaNou}</div>
                    <div className="text-xs text-white/40">-{s.reducereEP}% EP</div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 sticky bottom-0 bg-slate-900 flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-sm text-white/40 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/20">
            Anulează
          </button>
          <button onClick={handleGeneratePDF} disabled={generating}
            className={cn("flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-lg transition-all",
              generating ? "bg-amber-500/30 text-amber-300 cursor-wait" : "bg-amber-500 hover:bg-amber-400 text-slate-900")}>
            {generating ? "Se generează..." : "Generează PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
