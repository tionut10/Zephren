/**
 * Generator template XLSX Zephren pentru import date clădire.
 * Produce un workbook cu 4 foi pre-formatate + instrucțiuni.
 * Auditorul completează datele, apoi importă înapoi în calculator.
 *
 * v3.5 — câmpuri complete acoperind toate funcțiile programului:
 *   Pas 1 (Identificare), Pas 2 (Anvelopă), Pas 3 (Instalații), Pas 4 (Regenerabile)
 */
import * as XLSX from "xlsx";
import { APP_VERSION } from "../data/app-version.js";

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
    ["Suprafata anvelopa", "", "m² — suprafața totală anvelopă (opțional, calculat automat din elemente)"],
    ["Inaltime etaj", "2.80", "m"],
    ["Etaje", "P+2E", "ex: P, P+1E, P+4E, S+P+3E"],
    ["Perimetru", "", "m — perimetrul planșeului (pentru EN 12831, opțional)"],
    ["Nr unitati", "", "număr apartamente/unități (pentru RC/RA)"],
    ["n50", "4.0", "permeabilitate aer @50Pa [h⁻¹] — standard: 4, etanș: 1, Pasivhaus: 0.6"],
    ["Scop CPE", "vanzare", "vanzare / inchiriere / reabilitare / constructie_noua"],
  ];

  const wsId = XLSX.utils.aoa_to_sheet(identificare);
  wsId["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 70 }];
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
    // ── ÎNCĂLZIRE ──
    ["── ÎNCĂLZIRE ──", "", ""],
    ["Sursa incalzire", "GAZ_COND", "GAZ_COND / GAZ_CONV / BIOMASA / HP_AA / HP_AW / HP_WW / ELECTRICA / DISTRICT"],
    ["Putere incalzire [kW]", "", "puterea nominală a generatorului (kW)"],
    ["Eficienta incalzire [%]", "97", "randament generare (%) sau COP pentru pompele de căldură"],
    ["Tip emisie", "RADIATOARE", "RADIATOARE / PARDOSEALA / VENTILOCONVECTOARE / AEROTERME / PANOU_RADIANT"],
    ["Randament emisie [%]", "", "eta_em — lasă gol pentru valoare automată"],
    ["Calitate distributie", "STANDARD", "STANDARD / IZOLAT / NEIZOLAT / PERFORMANT"],
    ["Randament distributie [%]", "", "eta_dist — lasă gol pentru valoare automată"],
    ["Tip control", "INDIVIDUAL", "FARA / CENTRAL / INDIVIDUAL / INDIVIDUAL_PROG / SMART"],
    ["Randament control [%]", "", "eta_ctrl — lasă gol pentru valoare automată"],
    ["Regim functionare", "continuu", "continuu / intermitent / oprire"],
    ["Temperatura interioara [°C]", "20", "temperatura de proiectare interior — 20°C rezidențial, 22°C birouri, 24°C sănătate"],
    ["Reducere nocturna [°C]", "", "reducere nocturnă (ex: 3) — pentru regim intermitent"],
    ["T scara hol comun [°C]", "15", "temperatura medie a scării/holului neîncălzit (afectează τ perete interior)"],
    ["T subsol [°C]", "10", "temperatura medie a subsolului neîncălzit"],
    ["T pod [°C]", "5", "temperatura medie a podului neîncălzit"],
    // ── ACM ──
    ["── ACM ──", "", ""],
    ["Sursa ACM", "CAZAN_H", "CAZAN_H / SOLAR_TH / HP_ACM / ELECTRICA / DISTRICT / CAZAN_SEP"],
    ["Nr consumatori", "", "număr consumatori echivalenți (auto dacă gol: Au/30)"],
    ["Litri/persoana/zi", "60", "consum specific ACM [l/pers/zi]"],
    ["Volum boiler [L]", "", "volum vas de stocare [litri], 0 = fără vas"],
    ["Pierderi stocare [%]", "", "pierderi stocare ACM (ex: 5)"],
    ["Lungime conducte ACM [m]", "", "lungimea totală a conductelor de distribuție ACM"],
    ["Conducte izolate", "Nu", "Da / Nu — conducte de distribuție ACM izolate termic"],
    ["Circuit recirculare", "Nu", "Da / Nu — circuit de recirculare ACM"],
    ["Ore recirculare/zi [h]", "", "ore funcționare circuit recirculare (dacă Da)"],
    // ── RĂCIRE ──
    ["── RĂCIRE ──", "", ""],
    ["Sistem racire", "Nu", "Da / Nu — clădirea dispune de sistem de răcire/climatizare"],
    ["Tip sistem racire", "AC_SPLIT", "AC_SPLIT / VRV_VRF / CHILLER / FREE_COOLING / EVAPORATIV"],
    ["EER racire", "", "COP/EER răcire (ex: 3.0)"],
    ["Putere frigorifica [kW]", "", "puterea frigorifică instalată"],
    ["Suprafata racita [m²]", "", "suprafața răcită (implicit = Au)"],
    ["Distributie racire", "STANDARD", "STANDARD / IZOLAT / NEIZOLAT / PERFORMANT"],
    // ── VENTILARE ──
    ["── VENTILARE ──", "", ""],
    ["Tip ventilare", "NAT", "NAT=naturală, VMC=mecanică simplă, VMCR=mecanică+recuperare căldură"],
    ["Recuperare caldura [%]", "", "eficiența recuperare HR (pentru VMCR), ex: 80"],
    ["Debit aer [m³/h]", "", "debitul de aer proaspăt (auto: V×0.5)"],
    ["Putere ventilator [W]", "", "puterea totală a ventilatoarelor (pentru VMC/VMCR)"],
    ["Ore ventilare/an [h/an]", "", "ore de funcționare ventilatoare/an (auto din sezon)"],
    // ── ILUMINAT ──
    ["── ILUMINAT ──", "", ""],
    ["Tip iluminat", "LED", "LED / FLUOR / HALOGEN / INCAND / LED_SMART"],
    ["Densitate putere [W/m²]", "4.5", "puterea specifică instalată [W/m²]"],
    ["Sistem control iluminat", "MANUAL", "MANUAL / DETECTOR_PREZENTA / FOTOCELULA / DIMMER / SMART_BMS"],
    ["Factor control FC", "", "factorul de control F_C (1.0=manual, 0.7=detector, 0.5=smart)"],
    ["Ore iluminat/an [h/an]", "", "ore de funcționare iluminat/an (ex: 2500)"],
    ["Lumina naturala [%]", "", "raportul de lumină naturală disponibilă [%] (0-80)"],
  ];

  const wsInst = XLSX.utils.aoa_to_sheet(instalatii);
  wsInst["!cols"] = [{ wch: 32 }, { wch: 20 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsInst, "Instalatii");

  // ── Foaie 4: Regenerabile ──────────────────────────────────────────────────
  const regenerabile = [
    ["SURSE REGENERABILE", "", ""],
    ["Câmp", "Valoare", "Notă"],
    // ── SOLAR TERMIC ──
    ["── SOLAR TERMIC ──", "", ""],
    ["Solar termic", "Nu", "Da / Nu"],
    ["Tip colector solar", "PLAN", "PLAN / EVACUATE_TUBE / CONCENTRATOR"],
    ["Suprafata captatori [m²]", "", "suprafața totală colectoare solare termice"],
    ["Orientare captatori", "S", "N, NE, E, SE, S, SV, V, NV"],
    ["Inclinare captatori [°]", "35", "unghi față de orizontală"],
    ["Utilizare solar", "acm", "acm / heating / both (ACM+Încălzire)"],
    ["Volum stocare solar [L]", "", "volum rezervor stocare solar (ex: 50–80 l/m²)"],
    ["Randament optic eta0", "", "randamentul optic al colectorului (ex: 0.80)"],
    ["Coef pierderi a1 [W/m²K]", "", "coeficientul de pierderi termice (ex: 3.5)"],
    // ── FOTOVOLTAIC ──
    ["── FOTOVOLTAIC ──", "", ""],
    ["Fotovoltaic", "Nu", "Da / Nu"],
    ["Tip celule PV", "MONO", "MONO / POLI / THIN_FILM / BIFACIAL / HIT"],
    ["Putere pv [kWp]", "", "puterea de vârf instalată"],
    ["Suprafata pv [m²]", "", "suprafața totală panouri"],
    ["Orientare pv", "S", "N, NE, E, SE, S, SV, V, NV, Orizontal"],
    ["Inclinare pv [°]", "30", "unghi față de orizontală"],
    ["Tip invertor", "STRING", "STRING / MICRO / CENTRAL / OPTIMIZAT"],
    ["Utilizare pv", "all", "all / lighting / hvac / export"],
    // ── STOCARE BATERII ──
    ["── STOCARE BATERII ──", "", ""],
    ["Baterii", "Nu", "Da / Nu — sistem de stocare în baterii (BESS)"],
    ["Tip baterie", "LFP", "LFP / NMC / LEAD_ACID / FLOW"],
    ["Capacitate baterie [kWh]", "", "capacitate nominală"],
    ["Putere maxima baterie [kW]", "", "puterea maximă de descărcare"],
    ["Adancime descarcare DoD", "0.90", "fracție utilizabilă (ex: 0.90 = 90%)"],
    ["Autoconsum local [%]", "80", "procent energie PV consumată local"],
    // ── POMPĂ DE CĂLDURĂ ──
    ["── POMPĂ DE CĂLDURĂ ──", "", ""],
    ["Pompa de caldura", "Nu", "Da / Nu"],
    ["Tip pompa caldura", "HP_AA", "HP_AA (aer-aer) / HP_AW (aer-apă) / HP_WW (apă-apă) / HP_GEO (geotermală)"],
    ["COP nominal", "", "coeficientul de performanță nominal (ex: 4.0)"],
    ["SCOP sezonier incalzire", "", "SCOP sezonier (ex: 3.5)"],
    ["Acoperire PdC", "heating_acm", "heating / acm / heating_acm"],
    ["Temperatura bivalenta [°C]", "", "temperatura bivalentă pentru sistem bivalent"],
    ["Sursa auxiliara", "GAZ_CONV", "sursa de căldură auxiliară: GAZ_CONV / GAZ_COND / ELECTRICA"],
    // ── BIOMASĂ ──
    ["── BIOMASĂ ──", "", ""],
    ["Biomasa", "Nu", "Da / Nu"],
    ["Tip biomasa", "PELETI", "PELETI / BRICHETE / LEMNE / CHIPS"],
    ["Randament cazan biomasa [%]", "", "randamentul cazanului pe biomasă (ex: 90)"],
    ["Putere biomasa [kW]", "", "puterea nominală cazan biomasă"],
    ["Acoperire biomasa", "heating_acm", "heating / acm / heating_acm"],
    ["Consum anual biomasa [t/an]", "", "consum anual estimat/măsurat (opțional, auto dacă gol)"],
    // ── EOLIAN / COGENERARE ──
    ["── EOLIAN / COGENERARE ──", "", ""],
    ["Turbina eoliana", "Nu", "Da / Nu"],
    ["Capacitate eolian [kW]", "", "capacitate instalată turbină eoliană"],
    ["Productie eolian [kWh/an]", "", "producție anuală estimată"],
    ["Cogenerare CHP", "Nu", "Da / Nu"],
    ["Productie electrica CHP [kWh/an]", "", "producție electrică anuală cogenerare"],
    ["Productie termica CHP [kWh/an]", "", "producție termică anuală cogenerare"],
    ["Combustibil CHP", "GAZ_COND", "GAZ_COND / GAZ_CONV / BIOMASA / HIDROGEN"],
  ];

  const wsRen = XLSX.utils.aoa_to_sheet(regenerabile);
  wsRen["!cols"] = [{ wch: 32 }, { wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsRen, "Regenerabile");

  // ── Foaie 5: Instrucțiuni ─────────────────────────────────────────────────
  const instructiuni = [
    [`INSTRUCȚIUNI IMPORT ZEPHREN ${APP_VERSION}`],
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
    [" • .xml — format XML energetic, DOSET, gbXML (BIM)"],
    [" • .pdf — certificat CPE, raport audit (extracție AI)"],
    [" • .docx — raport Word (extracție AI)"],
    [" • imagine JPG/PNG — CPE scanat (extracție AI)"],
    [""],
    ["Foaia Instalatii — câmpuri cheie:"],
    [" • Sursa incalzire: GAZ_COND / HP_AA / HP_AW / DISTRICT / ELECTRICA / BIOMASA"],
    [" • Tip emisie: RADIATOARE / PARDOSEALA / VENTILOCONVECTOARE"],
    [" • Tip control: FARA / CENTRAL / INDIVIDUAL / INDIVIDUAL_PROG / SMART"],
    [" • Tip ventilare: NAT / VMC / VMCR"],
    [" • Tip iluminat: LED / FLUOR / HALOGEN / INCAND"],
    [""],
    ["Foaia Regenerabile — câmpuri cheie:"],
    [" • Tip colector solar: PLAN / EVACUATE_TUBE"],
    [" • Utilizare solar: acm / heating / both"],
    [" • Tip celule PV: MONO / POLI / THIN_FILM / BIFACIAL"],
    [" • Tip invertor: STRING / MICRO / CENTRAL / OPTIMIZAT"],
    [" • Tip pompa caldura: HP_AA / HP_AW / HP_WW / HP_GEO"],
    [" • Acoperire PdC/Biomasă: heating / acm / heating_acm"],
    [""],
    ["NOTĂ: Câmpurile lăsate goale nu suprascriu valorile existente în calculator."],
    ["Extracția AI (PDF/DOCX/imagine) necesită conexiune la internet."],
    ["Câmpurile marcate cu secțiuni '── ... ──' sunt anteturi și sunt ignorate la parsare."],
  ];

  const wsInstr = XLSX.utils.aoa_to_sheet(instructiuni);
  wsInstr["!cols"] = [{ wch: 85 }];
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
