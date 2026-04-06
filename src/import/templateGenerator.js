/**
 * Generator template XLSX Zephren pentru import date clădire.
 * Produce un workbook cu 4 foi pre-formatate + instrucțiuni.
 * Auditorul completează datele, apoi importă înapoi în calculator.
 */
import * as XLSX from "xlsx";

export function generateImportTemplate() {
  const wb = XLSX.utils.book_new();

  // ── Foaie 1: Identificare ──────────────────────────────────────────────────
  const identificare = [
    ["IDENTIFICARE CLĂDIRE", "", ""],
    ["Câmp", "Valoare", "Notă"],
    ["Adresa", "", "ex: Str. Exemplu, nr. 10"],
    ["Localitate", "", "ex: București"],
    ["Județ", "", "ex: Ilfov"],
    ["Cod postal", "", "ex: 010101"],
    ["Categorie", "RI", "RI=casă, RC=bloc, RA=apt, BI=birouri, ED=educație, SA=sănătate, HC=hotel, CO=comercial, SP=sport, AL=altele"],
    ["Structura", "Zidărie portantă", "Zidărie portantă / Cadre beton / Structură metalică / Lemn"],
    ["An constructie", "", "ex: 1975"],
    ["An renovare", "", "ex: 2010 (opțional)"],
    ["Suprafata utila", "", "m² — suprafața utilă totală"],
    ["Volum", "", "m³ — volumul interior încălzit"],
    ["Suprafata anvelopa", "", "m² — suprafața totală anvelopă (opțional)"],
    ["Inaltime etaj", "2.80", "m"],
    ["Etaje", "P+2E", "ex: P, P+1E, P+4E, S+P+3E"],
    ["n50", "4.0", "permeabilitate aer @50Pa [h⁻¹] — standard: 4, etanș: 1, Pasivhaus: 0.6"],
    ["Scop CPE", "vanzare", "vanzare / inchiriere / reabilitare / constructie_noua"],
  ];

  const wsId = XLSX.utils.aoa_to_sheet(identificare);
  wsId["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsId, "Identificare");

  // ── Foaie 2: Anvelopa ──────────────────────────────────────────────────────
  const anvelopa = [
    ["ELEMENTE ANVELOPĂ", "", "", "", "", "", ""],
    ["Denumire", "Tip", "Suprafata [m²]", "U [W/m²K]", "g (vitraj)", "Orientare", "Observatii"],
    // Exemple opace
    ["Perete exterior N", "PE", "45.0", "0.50", "", "N", "Perete exterior spre Nord"],
    ["Perete exterior S", "PE", "50.0", "0.50", "", "S", ""],
    ["Terasă", "PT", "80.0", "0.30", "", "", "Terasă circulabilă"],
    ["Planșeu sol", "PL", "80.0", "0.40", "", "", "Planșeu pe sol"],
    // Exemple vitraje
    ["Ferestre S PVC tripan", "Vitraj", "8.0", "0.80", "0.52", "S", "PVC 3 camere Low-E"],
    ["Ferestre N PVC dublu", "Vitraj", "4.0", "1.10", "0.60", "N", "PVC dublu vitraj"],
  ];

  const wsAnv = XLSX.utils.aoa_to_sheet(anvelopa);
  wsAnv["!cols"] = [{ wch: 30 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];

  // Notă tip elemente
  XLSX.utils.sheet_add_aoa(wsAnv, [
    [""],
    ["Tipuri elemente opace: PE=perete exterior, PT=terasă, PP=pod/acoperiș, PL=planșeu sol, PB=planșeu beci, PI=perete interior"],
    ["Tip Vitraj: scrieți 'Vitraj', 'Fereastra' sau 'Window' — câmpul g este obligatoriu"],
    ["Orientare: N, NE, E, SE, S, SV, V, NV"],
  ], { origin: { r: anvelopa.length + 1, c: 0 } });

  XLSX.utils.book_append_sheet(wb, wsAnv, "Anvelopa");

  // ── Foaie 3: Instalatii ────────────────────────────────────────────────────
  const instalatii = [
    ["INSTALAȚII", "", ""],
    ["Câmp", "Valoare", "Notă"],
    ["── ÎNCĂLZIRE ──", "", ""],
    ["Sursa incalzire", "GAZ_COND", "GAZ_COND / GAZ_CONV / BIOMASA / HP_AA / ELECTRICA / DISTRICT"],
    ["Putere incalzire [kW]", "", "puterea cazanului / pompei de căldură"],
    ["Eficienta incalzire [%]", "97", "eficiența termică (%) sau COP (pentru PdC)"],
    ["Temperatura interioara [°C]", "20", "temperatura de proiectare interior"],
    ["── ACM ──", "", ""],
    ["Sursa ACM", "CAZAN_H", "CAZAN_H / SOLAR_TH / HP_ACM / ELECTRICA / DISTRICT"],
    ["Litri/persoana/zi", "60", "consum specific ACM"],
    ["Volum boiler [L]", "", ""],
    ["── RĂCIRE ──", "", ""],
    ["Sistem racire", "Nu", "Da / Nu"],
    ["EER racire", "", "COP răcire (ex: 3.0)"],
    ["── VENTILARE ──", "", ""],
    ["Tip ventilare", "NAT", "NAT=naturală, VMC=mecanică, VMCR=mecanică+recuperare"],
    ["Recuperare caldura [%]", "", "eficiența HR (pentru VMCR), ex: 80"],
    ["Debit aer [m³/h]", "", ""],
    ["── ILUMINAT ──", "", ""],
    ["Tip iluminat", "LED", "LED / FLUOR / INCAND"],
    ["Densitate putere [W/m²]", "4.5", "puterea specifică instalată"],
    ["Ore functionare/an", "", "ex: 2500"],
  ];

  const wsInst = XLSX.utils.aoa_to_sheet(instalatii);
  wsInst["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsInst, "Instalatii");

  // ── Foaie 4: Regenerabile ──────────────────────────────────────────────────
  const regenerabile = [
    ["SURSE REGENERABILE", "", ""],
    ["Câmp", "Valoare", "Notă"],
    ["── SOLAR TERMIC ──", "", ""],
    ["Solar termic", "Nu", "Da / Nu"],
    ["Suprafata captatori [m²]", "", "suprafata totala captatori solari termici"],
    ["Orientare captatori", "S", "N, NE, E, SE, S, SV, V, NV"],
    ["Inclinare captatori [°]", "35", "unghi față de orizontală"],
    ["── FOTOVOLTAIC ──", "", ""],
    ["Fotovoltaic", "Nu", "Da / Nu"],
    ["Putere pv [kWp]", "", "puterea de vârf instalată"],
    ["Suprafata pv [m²]", "", "suprafata totala panouri"],
    ["Orientare pv", "S", ""],
    ["Inclinare pv [°]", "30", ""],
    ["── POMPĂ DE CĂLDURĂ ──", "", ""],
    ["Pompa de caldura", "Nu", "Da / Nu"],
    ["COP pompa", "", "coeficient de performanță (ex: 4.0)"],
    ["── BIOMASĂ ──", "", ""],
    ["Biomasa", "Nu", "Da / Nu"],
    ["Tip biomasa", "PELETI", "PELETI / BRICHETE / LEMNE"],
  ];

  const wsRen = XLSX.utils.aoa_to_sheet(regenerabile);
  wsRen["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsRen, "Regenerabile");

  // ── Foaie 5: Instrucțiuni ─────────────────────────────────────────────────
  const instructiuni = [
    ["INSTRUCȚIUNI IMPORT ZEPHREN"],
    [""],
    ["Cum se folosește acest template:"],
    ["1. Completați foile 'Identificare', 'Anvelopa', 'Instalatii', 'Regenerabile'"],
    ["2. Salvați fișierul ca .xlsx"],
    ["3. În Zephren: buton 'Import date' → trageți fișierul sau apăsați 'Alege fișier'"],
    ["4. Verificați previzualizarea datelor extrase"],
    ["5. Apăsați 'Aplică date' — câmpurile pașilor 1-4 se completează automat"],
    [""],
    ["Formate acceptate pentru import:"],
    [" • .xlsx / .xls — Excel (recomandat, template-ul acesta)"],
    [" • .csv — tabel CSV cu elemente anvelopă"],
    [" • .json — proiect Zephren exportat anterior"],
    [" • .xml — ENERG+, DOSET, gbXML (BIM)"],
    [" • .pdf — certificat CPE, raport audit (extracție AI)"],
    [" • .docx — raport Word (extracție AI)"],
    [" • imagine JPG/PNG — CPE scanat (extracție AI)"],
    [""],
    ["NOTĂ: Câmpurile lăsate goale nu suprascriu valorile existente în calculator."],
    ["Extracția AI (PDF/DOCX/imagine) necesită conexiune la internet."],
  ];

  const wsInstr = XLSX.utils.aoa_to_sheet(instructiuni);
  wsInstr["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instructiuni");

  // Generare buffer și download
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([wbout], { type: "application/octet-stream" });
}

export function downloadTemplate() {
  const blob = generateImportTemplate();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Zephren_Template_Import_Cladire.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
