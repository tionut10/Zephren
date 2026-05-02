import React, { useRef, useState, useEffect, lazy, Suspense } from "react";
import { renderAsync } from "docx-preview";
const PDFViewer = lazy(() => import("../components/PDFViewer.jsx"));
import ApartmentClasses from "../components/ApartmentClasses.jsx";
import CpeAnexa from "../components/CpeAnexa.jsx";
// Sprint Reorganizare Pas 5/6 (1 mai 2026) — BACSSelectorSimple/SRIScoreAuto/MEPSCheckBinar
// imports eliminate; secțiunea "Conformitate EPBD 2024" e acum în Step5Calculation.jsx.
import { APP_VERSION as TECH_VERSION } from "../data/landingData.js";
// S30A·A5 — versiune document marketing (v3.5) pentru CPE/Anexe, separată de tech_version (0.5.0).
import { APP_VERSION } from "../data/app-version.js";
import { cn, Select, Input, Badge, Card, ResultRow } from "../components/ui.jsx";
import { getEnergyClass, getCO2Class } from "../calc/classification.js";
import { getNzebEpMax } from "../calc/smart-rehab.js";
import { calcOpaqueR } from "../calc/opaque.js";
import { calcSummerComfort } from "../calc/summer-comfort.js";
import { ENERGY_CLASSES_DB, CLASS_LABELS, CLASS_COLORS, CO2_CLASSES_DB, NZEB_THRESHOLDS } from "../data/energy-classes.js";
import { ZEB_THRESHOLDS, ZEB_FACTOR, U_REF_NZEB_RES, U_REF_NZEB_NRES, U_REF_GLAZING, getURefNZEB, NZEB_EP_FALLBACK, getNzebEpMaxWithFallback } from "../data/u-reference.js";
import { CATEGORY_BASE_MAP, BUILDING_CATEGORIES, ELEMENT_TYPES, CPE_TEMPLATES } from "../data/building-catalog.js";
import { FUELS, HEAT_SOURCES, ACM_SOURCES, COOLING_SYSTEMS, VENTILATION_TYPES, LIGHTING_TYPES, LIGHTING_CONTROL, SOLAR_THERMAL_TYPES, PV_TYPES } from "../data/constants.js";
import { REHAB_COSTS } from "../data/rehab-costs.js";
import { T } from "../data/translations.js";
import { generateNZEBConformanceReport } from "../lib/report-generators.js";
import { generateCPECode, validateCPECode } from "../utils/cpe-code.js";
import { autoGenerateCPECode, canAutoGenerateCPE } from "../utils/cpe-auto-gen.js";
// Audit 2 mai 2026 — P1.1: completeness centralizat (sursă unică de adevăr)
import {
  getCpeCompletenessItems,
  getCpeCompletenessScore,
  groupCompletenessItems,
  ANCPI_REQUIRED_SCOPES,
} from "../utils/cpe-completeness.js";
// Audit 2 mai 2026 — P1.4: motor unificat recomandări CPE/Anexa 2
import { generateCpeRecommendations } from "../calc/cpe-recommendations.js";
// Audit 2 mai 2026 — P1.9: bilanț clădire de referință cu echipamente standard
import { calcReferenceBuilding } from "../calc/reference-building.js";
// Audit 2 mai 2026 — P2.8: format dată per limbă (RO=dd.mm.yyyy, EN=yyyy-mm-dd)
import { fmtDate } from "../utils/format.js";
import { supabase } from "../lib/supabase.js";
import { getExpiryDate, getValidityYears, getValidityLabel } from "../utils/cpe-validity.js";
import AuditorSignatureStampUpload from "../components/AuditorSignatureStampUpload.jsx";
import AnexaMDLPAFields from "../components/AnexaMDLPAFields.jsx";
import RaportConformareNZEB from "../components/RaportConformareNZEB.jsx";
import { canAccess as canAccessFn, resolvePlan } from "../lib/planGating.js";
import { canEmitForBuilding } from "../lib/canEmitForBuilding.js";
import { getAttestationOrdinanceLabel } from "../calc/auditor-attestation-validity.js";
import { mapLegacyGradeToNew } from "../calc/auditor-grad-validation.js";
import { calcPenalties } from "../calc/penalties.js";
import { calcSRI } from "../calc/epbd.js";
import { getCityCoordinates } from "../utils/city-coordinates.js";

/**
 * Step6Certificate — Extracted from energy-calc.jsx lines 10211-12317
 * Certificate preview/generation, DOCX/PDF/XML export, auditor data,
 * nZEB report, energy class radar chart
 */
export default function Step6Certificate(props) {
  const {
    monthlyISO, instSummary, renewSummary, envelopeSummary,
    building, setBuilding,  // Sprint v6.2 — mutare AnexaMDLPAFields Step 7→Step 6 (Ord. 348/2026)
    selectedClimate, lang, theme,
    heating, cooling, ventilation, lighting, acm,
    solarThermal, photovoltaic, heatPump, biomass, otherRenew,
    opaqueElements, glazingElements, thermalBridges,
    auditor, setAuditor,
    setStep, goToStep,
    energyPrices,
    pdfPreviewHtml, setPdfPreviewHtml,
    pdfPreviewUrl, setPdfPreviewUrl,
    nzebReportHtml, setNzebReportHtml,
    certCount, incrementCertCount,
    projectList,
    showToast, tier, userTier,
    canExportDocx, canNzebReport, requireUpgrade, hasWatermark,
    presentationMode, setPresentationMode,
    financialAnalysis, finAnalysisInputs, setFinAnalysisInputs,
    fetchTemplate,
    bacsClass, bacsCheck, setBacsClass,
    buildingPhotos,
    userPlan,           // Sprint Pricing v6.0 — pentru gating BACS/SRI/MEPS detaliate
  } = props;
  const t = (key) => lang === "RO" ? key : (T[key]?.EN || key);
  // Pricing v6.1 — watermark diferențiat: Free → "Zephren DEMO", Edu → "SCOP DIDACTIC".
  // Backward-compat: hasWatermark flag-ul rămâne ca master-switch.
  const watermarkText = userPlan === "edu" ? "SCOP DIDACTIC" : "Zephren DEMO";

            // Preview DOCX local — render cu docx-preview (identic cu fișierul descărcat)
            const docxPreviewRef = useRef(null);
            const previewBtnRef = useRef(null);
            const hasAutoPreviewd = useRef(false);
            const [docxRendering, setDocxRendering] = useState(false);
            const [docxRendered, setDocxRendered] = useState(false);
            // Guard împotriva generărilor multiple simultane (anti-spam-click).
            // Previne payload-uri concurente identice → reduce risc de System Rule
            // challenge la Vercel edge când user-ul dă click rapid pe buton.
            const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
            // Audit 2 mai 2026 — P0.5: pe Vercel HTTPS cu CSP strict, range requests pe
            // blob:// eșuează cu „Unexpected server response (0)". Pasăm ArrayBuffer-ul
            // direct la PDFViewer (PDF.js îl tratează cu disableRange/disableStream).
            // Păstrăm și pdfPreviewUrl ca prop legacy pentru fallback Office Online iframe.
            const [pdfPreviewBuffer, setPdfPreviewBuffer] = useState(null);
            // Audit 2 mai 2026 — P1.3: QR code real (înlocuiește Code128 vechi din
            // preview HTML). Pre-generat ca dataURL pentru a fi folosit în template
            // literal sync — librăria `qrcode` are doar API async (toDataURL).
            // Server-side Python folosește deja `segno` pentru QR în DOCX.
            const [qrVerifyDataUrl, setQrVerifyDataUrl] = useState("");
            useEffect(() => {
              const code = auditor?.cpeCode || auditor?.mdlpaCode || "";
              if (!code) { setQrVerifyDataUrl(""); return; }
              let cancelled = false;
              const verifyUrl = `https://zephren.ro/cpe/verifica?cod=${encodeURIComponent(code)}`;
              import("qrcode").then((mod) => {
                if (cancelled) return;
                const QRCode = mod.default || mod;
                QRCode.toDataURL(verifyUrl, {
                  width: 120, margin: 1, errorCorrectionLevel: "M",
                  color: { dark: "#000000", light: "#FFFFFF" },
                }).then((url) => { if (!cancelled) setQrVerifyDataUrl(url); })
                  .catch(() => { if (!cancelled) setQrVerifyDataUrl(""); });
              }).catch(() => { if (!cancelled) setQrVerifyDataUrl(""); });
              return () => { cancelled = true; };
            }, [auditor?.cpeCode, auditor?.mdlpaCode]);

            // Audit 2 mai 2026 — P1.6: auto-populare câmpuri Step 6 din pașii 1-5.
            // Auditorul nu trebuie să reintroducă date deja completate (heating
            // emission, wind capacity, distribuție conducte). Doar setăm dacă
            // câmpul Step 6 e gol (nu suprascriem alegeri explicite ale auditorului).
            useEffect(() => {
              if (!setBuilding) return;
              const updates = {};

              // Tip corp static dominant ← heating.emission (catalog Step 3)
              if (!building?.heatingRadiatorType && heating?.emission) {
                const e = String(heating.emission).toLowerCase();
                let mapped = "";
                if (e.includes("radiator") || e.startsWith("rad_")) {
                  if (e.includes("otel") || e.includes("oțel") || e.includes("steel")) mapped = "Radiator oțel";
                  else if (e.includes("font") || e.includes("cast")) mapped = "Radiator fontă";
                  else if (e.includes("aluminiu") || e.includes("alu_")) mapped = "Radiator aluminiu";
                  else mapped = "Radiator oțel";
                } else if (e.includes("convector")) mapped = "Convector";
                else if (e.includes("fan_coil") || e.includes("fan-coil") || e.includes("fcu")) mapped = "Fan-coil";
                else if (e.includes("ufh") || e.includes("pardoseal") || e.includes("floor") || e.includes("tabs")) mapped = "Încălzire prin pardoseală";
                else mapped = "Alte";
                if (mapped) updates.heatingRadiatorType = mapped;
              }

              // Capacitate eoliană ← otherRenew.windCapacity (Pas 4)
              if (!building?.windPowerKw && otherRenew?.windCapacity) {
                updates.windPowerKw = String(otherRenew.windCapacity);
              }

              // Izolație conducte încălzire ← heating.distribution quality (Pas 3)
              if (!building?.heatingPipeInsulated && heating?.distribution) {
                const d = String(heating.distribution).toLowerCase();
                if (d.includes("bun") || d.includes("good") || d.includes("izolat")) updates.heatingPipeInsulated = "yes";
                else if (d.includes("med")) updates.heatingPipeInsulated = "partial";
                else if (d.includes("slab") || d.includes("poor") || d.includes("neizolat")) updates.heatingPipeInsulated = "no";
              }

              // Izolație conducte ACM — același tipar dacă acm are distribuție explicită
              if (!building?.acmPipeInsulated && acm?.distribution) {
                const d = String(acm.distribution).toLowerCase();
                if (d.includes("bun") || d.includes("good") || d.includes("izolat")) updates.acmPipeInsulated = "yes";
                else if (d.includes("med")) updates.acmPipeInsulated = "partial";
                else if (d.includes("slab") || d.includes("poor") || d.includes("neizolat")) updates.acmPipeInsulated = "no";
              }

              if (Object.keys(updates).length > 0) {
                setBuilding((prev) => ({ ...prev, ...updates }));
              }
              // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [
              heating?.emission, heating?.distribution,
              otherRenew?.windCapacity,
              acm?.distribution,
              setBuilding,
              // intentionally NOT including building.* — auto-populare doar la
              // schimbarea sursei (Pas 3/4); altfel ar suprascrie editări manuale ale auditorului.
            ]);

            // Auto-generare preview la prima deschidere a Pasului 6
            useEffect(() => {
              if (!instSummary || hasAutoPreviewd.current) return;
              hasAutoPreviewd.current = true;
              const t = setTimeout(() => {
                previewBtnRef.current?.click();
              }, 400);
              return () => clearTimeout(t);
            }, [instSummary]);

            // Sprint 14 / Etapa 1 (19 apr 2026) — auto-generare cod unic CPE
            // Fără click manual: când nume + cod MDLPA + data sunt complete și
            // auditor.cpeCode e gol, generăm automat. Butonul "🔄 Generează automat"
            // rămâne ca fallback dacă useEffect eșuează sau auditorul vrea regenerare.
            useEffect(() => {
              if (!setAuditor) return;
              if (auditor?.cpeCode) return;
              if (!canAutoGenerateCPE(auditor)) return;
              const code = autoGenerateCPECode({ auditor, building });
              if (code) {
                setAuditor((p) => ({ ...p, cpeCode: code }));
              }
            }, [
              auditor?.name,
              auditor?.mdlpaCode,
              auditor?.date,
              auditor?.atestat,
              auditor?.registryIndex,
              auditor?.cpeCode,
              setAuditor,
              building,
            ]);

            const Au = parseFloat(building.areaUseful) || 0;
            const baseCatResolved = (CATEGORY_BASE_MAP?.[building.category]) || building.category;
            const catKey = baseCatResolved + (["RI","RC","RA"].includes(baseCatResolved) ? (cooling.hasCooling ? "_cool" : "_nocool") : "");
            const epFinal = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary?.ep_total_m2 || 0);
            const co2Final = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary?.co2_total_m2 || 0);
            const enClass = getEnergyClass(epFinal, catKey);
            const co2Class = getCO2Class(co2Final, baseCatResolved);
            const rer = renewSummary?.rer || 0;
            const grid = ENERGY_CLASSES_DB[catKey] || ENERGY_CLASSES_DB[building.category];
            const catLabel = BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label || "";
            // Audit 2 mai 2026 — P1.10: fallback per categorie (în loc de 148 hardcoded)
            const epRefMax = getNzebEpMaxWithFallback(baseCatResolved, getNzebEpMax, selectedClimate?.zone);

            // ═══════════════════════════════════════════════════════════
            // GENERARE DOCX CU DOCXTEMPLATER + PIZZIP
            // ═══════════════════════════════════════════════════════════

            const fmtRo = (v, dec=1) => {
              const n = parseFloat(v) || 0;
              return n.toFixed(dec).replace(".", ",");
            };

            const generateDocxCPE = async (fileOrBuffer, mode="cpe", {download=true}={}) => {
              if (!fileOrBuffer) return;
              if (Au <= 0) { showToast("Completați Au în Pasul 1.", "error"); return; }
              if (!instSummary) { showToast("Completați pașii 1-4.", "error"); return; }

              // Sprint v6.3 — Verificare HARD legal pre-export per Ord. MDLPA 348/2026 Art. 6.
              // Plasele de siguranță anti-bypass: chiar dacă utilizatorul a ocolit
              // banner-ul Step 1 (DevTools, race condition), aici se refuză exportul.
              const legalCheck = canEmitForBuilding({
                plan: userPlan,
                auditorGrad: building?.auditorGrad || null,
                building,
                operation: "cpe",
              });
              if (!legalCheck.ok) {
                showToast(
                  `Export blocat legal: ${legalCheck.reason} (${legalCheck.legalRef})`,
                  "error",
                );
                return;
              }

              try {
                const arrayBuffer = fileOrBuffer instanceof ArrayBuffer ? fileOrBuffer : await fileOrBuffer.arrayBuffer();

                // ── Calcul valori finale ──
                const co2Final_m2 = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary.co2_total_m2 || 0);
                const qfFinal_t = Au > 0 ? (instSummary.qf_h + instSummary.qf_w) / Au : 0;
                const qfFinal_e = Au > 0 ? (instSummary.qf_c + instSummary.qf_v + instSummary.qf_l) / Au : 0;

                const sre_st = renewSummary && Au > 0 ? renewSummary.qSolarTh / Au : 0;
                const sre_pv = renewSummary && Au > 0 ? renewSummary.qPV_kWh / Au : 0;
                const sre_pc = renewSummary && Au > 0 ? renewSummary.qPC_ren / Au : 0;
                const sre_bio = renewSummary && Au > 0 ? renewSummary.qBio_ren / Au : 0;
                const sre_other = renewSummary && Au > 0 ? (renewSummary.qWind + (renewSummary.qCogen_el||0) + (renewSummary.qCogen_th||0)) / Au : 0;
                const sre_total = renewSummary && Au > 0 ? renewSummary.totalRenewable / Au : 0;

                const Aref = parseFloat(building.areaUseful) || 0;
                const Vol = parseFloat(building.volume) || 0;
                const latV = selectedClimate?.lat || 0;
                // Etapa 2 — fix BUG-6: longitude din catalog 120 orașe + fallback centroid județ
                // (înainte: 60 orașe inline + fallback 25.0 generic → coordonate greșite pentru orașe mici)
                const cityCoords = getCityCoordinates(selectedClimate?.name, building?.county);
                const lngV = selectedClimate ? cityCoords.lng : 0;

                const fullAddress = [building.address, building.city, building.county].filter(Boolean).join(", ");
                const yearStr = building.yearBuilt || "____";
                const regimStr = building.floors || "____";
                const nrCam = building.units || "3";
                const arieDesf = Aref * 1.15;

                const baseCat = baseCatResolved; // sub-categorie rezolvată la baza Mc 001-2022
                const co2Grid = CO2_CLASSES_DB[baseCat] || CO2_CLASSES_DB.AL;
                // Audit 2 mai 2026 — P1.10: fallback per categorie (în loc de 148 hardcoded)
                const epRefMax = getNzebEpMaxWithFallback(baseCat, getNzebEpMax, selectedClimate?.zone);

                // Audit 2 mai 2026 — P1.9: bilanț clădire de referință cu echipamente
                // standard Mc 001-2022 (η_ref=0.92 încălzire / 0.85 ACM, EER_ref=3.5,
                // hrEta_ref=0, LENI_ref=8). Înainte: scalare proporțională epRef/epFinal
                // care nu recunoștea că nevoia termică e identică pentru aceeași anvelopă.
                // Fallback la scalare proporțională dacă instSummary lipsește.
                const refBuilding = calcReferenceBuilding({
                  building: { ...building, areaUseful: Aref },
                  instSummary,
                  epRefMax,
                  epFinal,
                });
                const qfRef_t = refBuilding.qf_thermal;
                const qfRef_e = refBuilding.qf_electric;

                const scaleEP = (ENERGY_CLASSES_DB[catKey] || ENERGY_CLASSES_DB[baseCat] || ENERGY_CLASSES_DB.AL).thresholds;

                // S30A·A15 — mapping unificat scopCpe (suport renovare + renovare_majora).
                const scopeLabels = {"vanzare":"Vânzare","inchiriere":"Închiriere","receptie":"Recepție","informare":"Informare","renovare":"Renovare majoră","renovare_majora":"Renovare majoră","alt":"Alt scop"};
                const nzebDocx = NZEB_THRESHOLDS[baseCat] || NZEB_THRESHOLDS.AL;
                const nzebOk = epFinal <= epRefMax && (renewSummary?.rer || 0) >= nzebDocx.rer_min;
                const enClassDocx = getEnergyClass(epFinal, catKey);
                // Sprint 15 — valabilitate EPBD 2024 Art. 17: 10 ani A+..C / 5 ani D..G
                const expiryD = getExpiryDate(auditor.date || new Date(), enClassDocx) || new Date();
                const validYearsDocx = getValidityYears(enClassDocx);
                const epTotalReal = Au > 0 ? epFinal * Au : 0;
                const epTotalRef = Au > 0 ? epRefMax * Au : 0;
                const gwpVal = parseFloat(building.gwpLifecycle) || 0;
                const ybDocx = parseInt(building.yearBuilt) || 2000;
                const embodiedDocx = ybDocx >= 2020 ? (["RI","RC","RA"].includes(baseCat) ? 10 : 12) : 5;
                const gwpTotalDocx = gwpVal > 0 ? gwpVal : (co2Final_m2 + embodiedDocx);

                // ═══════════════════════════════════════════
                // APEL API PYTHON — python-docx pe template original
                // ═══════════════════════════════════════════
                const templateBase64 = btoa(new Uint8Array(arrayBuffer).reduce((s, b) => s + String.fromCharCode(b), ""));

                const payload = {
                  template: templateBase64,
                  mode: mode,
                  category: baseCat,
                  photo: auditor.photo || null,
                  data: {
                    year: yearStr,
                    expiry: expiryD.toLocaleDateString("ro-RO"),
                    validity_years: validYearsDocx,
                    // Audit 2 mai 2026 — P0.1: EPBD 2024/1275 nu e transpus în RO până la
                    // 29.05.2026; folosim L.372/2005 republicată mod. L.238/2024 ca referință legală.
                    validity_label: `valabil ${validYearsDocx} ani (L.372/2005 mod. L.238/2024)`,
                    address: fullAddress,
                    gps: fmtRo(latV, 4) + " x " + fmtRo(lngV, 4),
                    regime: regimStr,
                    scope: scopeLabels[building.scopCpe] || "Vânzare",
                    software: "ZEPHREN " + APP_VERSION,
                    area_ref: fmtRo(Aref, 1),
                    area_gross: fmtRo(arieDesf, 1),
                    volume: Math.round(Vol).toString(),
                    nr_units: nrCam,
                    category_label: BUILDING_CATEGORIES.find(c=>c.id===baseCat)?.label || "",
                    city: building.city || "",
                    county: building.county || "",
                    climate_zone: selectedClimate?.zone ? "zona " + selectedClimate.zone : "",
                    ep_total_real: fmtRo(epTotalReal, 1),
                    ep_total_ref: fmtRo(epTotalRef, 1),
                    qf_thermal: fmtRo(qfFinal_t, 1),
                    qf_electric: fmtRo(qfFinal_e, 1),
                    qf_thermal_ref: fmtRo(qfRef_t, 1),
                    qf_electric_ref: fmtRo(qfRef_e, 1),
                    ep_specific: fmtRo(epFinal, 1),
                    ep_ref: fmtRo(epRefMax, 1),
                    co2_val: fmtRo(co2Final_m2, 1),
                    sre_st: fmtRo(sre_st, 1),
                    sre_pv: fmtRo(sre_pv, 1),
                    sre_pc: fmtRo(sre_pc, 1),
                    sre_bio: fmtRo(sre_bio, 1),
                    sre_other: fmtRo(sre_other, 1),
                    sre_total: fmtRo(sre_total, 1),
                    // Scale EP + CO2: pentru baseCat="AL" (categorii specializate —
                    // CIN/TEA/MUZ/IU/HAL/DEP/CUL etc.) nu există scală standard MDLPA.
                    // Folosim template "3-formă generală clădire" cu scală goală, auditorul
                    // completează manual. Opțiunea aleasă de user: B (19 apr 2026).
                    s_ap: baseCat === "AL" ? "0" : String(scaleEP[0]),
                    s_a:  baseCat === "AL" ? "0" : String(scaleEP[1]),
                    s_b:  baseCat === "AL" ? "0" : String(scaleEP[2]),
                    s_c:  baseCat === "AL" ? "0" : String(scaleEP[3]),
                    s_d:  baseCat === "AL" ? "0" : String(scaleEP[4]),
                    s_e:  baseCat === "AL" ? "0" : String(scaleEP[5]),
                    s_f:  baseCat === "AL" ? "0" : String(scaleEP[6]),
                    co2_ap: baseCat === "AL" ? "0" : fmtRo(co2Grid.thresholds[0],1),
                    co2_a:  baseCat === "AL" ? "0" : fmtRo(co2Grid.thresholds[1],1),
                    co2_b:  baseCat === "AL" ? "0" : fmtRo(co2Grid.thresholds[2],1),
                    co2_c:  baseCat === "AL" ? "0" : fmtRo(co2Grid.thresholds[3],1),
                    co2_d:  baseCat === "AL" ? "0" : fmtRo(co2Grid.thresholds[4],1),
                    co2_e:  baseCat === "AL" ? "0" : fmtRo(co2Grid.thresholds[5],1),
                    co2_f:  baseCat === "AL" ? "0" : fmtRo(co2Grid.thresholds[6],1),
                    auditor_name: auditor.name || "",
                    auditor_atestat: auditor.atestat || "",
                    auditor_grade: auditor.grade || "",
                    auditor_company: auditor.company || "",
                    auditor_phone: auditor.phone || "",
                    auditor_email: auditor.email || "",
                    auditor_date: auditor.date ? auditor.date.split("-").reverse().join(".") : "",
                    auditor_mdlpa: auditor.mdlpaCode || "",
                    // Audit 2 mai 2026 — P0.4: observațiile auditorului trimise în payload
                    // pentru export DOCX. Fallback identic cu cel din preview HTML pag. 3
                    // (linia ~2024) ca să avem aceleași defaults în UI și document.
                    auditor_observations: auditor.observations || "Clădirea a fost evaluată conform Mc 001-2022 (Ord. MDLPA 16/2023). Valorile sunt calculate pe baza datelor furnizate și a inspecției vizuale.",
                    // Sprint 14 — cod unic CPE (Ord. MDLPA 16/2023 + L.238/2024)
                    cpe_code: auditor.cpeCode || "",
                    registry_index: auditor.registryIndex || "1",
                    // Sprint 15 — Semnătură + ștampilă (PNG base64 dataURL, fără prefix)
                    signature_png_b64: auditor.signatureDataURL ? (auditor.signatureDataURL.split(",")[1] || "") : "",
                    stamp_png_b64: auditor.stampDataURL ? (auditor.stampDataURL.split(",")[1] || "") : "",
                    // Sprint 15 — QR code URL verificare (va genera QR pe server)
                    // Audit 2 mai 2026 — P0.3: URL pointează la landing static cu form de
                    // căutare manuală (registrul MDLPA central nu există încă). Cod-ul e
                    // pasat ca query param `cod` ca să poată fi prepopulat în form.
                    qr_verify_url: auditor.cpeCode ? `https://zephren.ro/cpe/verifica?cod=${encodeURIComponent(auditor.cpeCode)}` : "",
                    // Sprint 15 — EPBD 2024 indicatori
                    ev_charging_points: building.evChargingPoints || "0",
                    ev_charging_prepared: building.evChargingPrepared || "0",
                    co2_max_ppm: building.co2MaxPpm || "",
                    pm25_avg: building.pm25Avg || "",
                    scale_version: building.scaleVersion || "2023",
                    // Sprint 15 — Identificare juridică
                    cadastral_number: building.cadastralNumber || "",
                    land_book: building.landBook || "",
                    // Nota *** CPE — ore cu T_interior > T_confort în regim liber (fără răcire)
                    // Python: dacă cooling_has=true → forțează "0"; altfel folosește această valoare.
                    // Calcul: max overheatingHours între toate elementele opace (C107/7-2002 + ISO 7730).
                    overheating_hours: (() => {
                      if (instSummary?.hasCool) return "0";
                      try {
                        const hours = (opaqueElements || []).map((el) => {
                          if (!el?.layers || el.layers.length === 0) return 0;
                          const r = calcSummerComfort(el.layers, selectedClimate, el.orientation || "S");
                          return r?.overheatingHours || 0;
                        });
                        const maxH = hours.length > 0 ? Math.max(...hours) : 0;
                        return String(maxH);
                      } catch { return "0"; }
                    })(),
                    // Sprint 17 — Pașaport renovare (EPBD 2024/1275 Art. 12)
                    // Audit 2 mai 2026 — P0.2: EPBD Art. 12 NU este transpus în drept român
                    // până la 29.05.2026. Pașaportul rămâne disponibil ca PREVIEW intern Zephren
                    // (export separat via passport-docx/passport-export), dar NU este integrat în
                    // CPE oficial. Pentru `mode === "cpe"` trimitem string-uri goale (Python tratează
                    // empty cu graceful fallback — fără QR pașaport, fără rânduri populate).
                    passport_uuid: mode === "cpe" ? "" : (building.passportUUID || ""),
                    passport_url: mode === "cpe" ? "" : (building.passportURL || (building.passportUUID ? `https://zephren.ro/passport/${building.passportUUID}` : "")),
                    passport_qr_url: mode === "cpe" ? "" : (building.passportURL || (building.passportUUID ? `https://zephren.ro/passport/${building.passportUUID}` : "")),
                    // Arie construită desfășurată — fallback automat din Au × 1.15
                    // (standard RO: Acd ≈ Au × factor formă clădire ~1.15)
                    area_built: building.areaBuilt || (Aref > 0 ? fmtRo(Aref * 1.15, 1) : ""),
                    n_apartments: building.nApartments || building.units || "1",
                    // Sprint 14 — Penalizări Mc 001-2022 Partea III §8.10 (serializate)
                    // Etapa 2 (BUG-7): trimit summary + lista aplicate cu reason+delta_EP_pct
                    // pentru ca Python să le poată afișa în pagina supliment legală.
                    penalties_summary: (() => {
                      try {
                        const pen = calcPenalties({
                          envelope: {
                            opaque: opaqueElements?.map((el) => {
                              if (!el.layers || el.layers.length === 0) return { type: el.type, area: parseFloat(el.area) || 0, u: 0 };
                              const elType = ELEMENT_TYPES.find((t) => t.id === el.type);
                              const rsi = elType ? elType.rsi : 0.13;
                              const rse = elType ? elType.rse : 0.04;
                              const rL = el.layers.reduce((s, l) => {
                                const d = (parseFloat(l.thickness) || 0) / 1000;
                                return s + (d > 0 && l.lambda > 0 ? d / l.lambda : 0);
                              }, 0);
                              const u = rL > 0 ? 1 / (rsi + rL + rse) : 0;
                              return { type: el.type, area: parseFloat(el.area) || 0, u };
                            }) || [],
                            glazing: glazingElements?.map((el) => ({ u: parseFloat(el.u) || 0 })) || [],
                            // Etapa 5 (BUG-8): legare thermalBridges în calcPenalties pentru
                            // penalizarea p2 (punți termice neacordate, Mc 001-2022 P3 §8.10).
                            // Înainte: hardcoded [] → p2 nu se aplica niciodată.
                            bridges: thermalBridges?.map((b) => ({
                              psi: parseFloat(b.psi) || 0,
                              length: parseFloat(b.length) || 0,
                              type: b.type || "",
                            })) || [],
                          },
                          instSummary: {
                            heating: { eta_gen: parseFloat(heating?.eta_gen) || 0, eta_dist: parseFloat(heating?.eta_dist) || 0, controls: heating?.control || "" },
                            dhw: { eta_dhw: parseFloat(acm?.eta_dhw ?? acm?.eta_gen) || 0, storage: { volume: parseFloat(acm?.storageVolume) || 0, standing_loss: parseFloat(acm?.standingLoss) || 0 } },
                            lighting: { leni: parseFloat(instSummary?.leni) || 0 },
                            // Audit 2 mai 2026 — P1.17: bacs_class are o singură sursă (prop bacsClass)
                            bacs: bacsClass || "D",
                          },
                          ventilation: { type: ventilation?.type || "", hrEfficiency: parseFloat(ventilation?.hrEfficiency) || 0 },
                          building: { category: building.category },
                          renewables: { rer: renewSummary?.rer || 0 },
                        });
                        const applied = Object.entries(pen)
                          .filter(([k, v]) => k !== "summary" && v?.applied)
                          .map(([k, v]) => ({
                            id: k,
                            reason: String(v?.reason || ""),
                            delta_EP_pct: Number(v?.delta_EP_pct || 0),
                          }));
                        return JSON.stringify({ summary: pen.summary, applied });
                      } catch { return ""; }
                    })(),
                    energy_class: enClassDocx.cls,
                    ep_class_real: enClassDocx.cls,
                    ep_class_ref: getEnergyClass(epRefMax, catKey).cls,
                    co2_class_real: getCO2Class(co2Final_m2, baseCatResolved).cls,
                    rer: renewSummary ? fmtRo(renewSummary.rer, 1) : "0,0",
                    nzeb: nzebOk ? "DA" : "NU",
                    gwp: fmtRo(gwpTotalDocx, 1),
                    // Etapa 2 — BACS class + SRI + n50 propagate corect (BUG-1, BUG-2, BUG-3)
                    // Python așteaptă bacs_class la line ~2447, sri_total la line ~2459, n50 la line ~2479
                    // Audit 2 mai 2026 — P1.17: bacs_class are o singură sursă (prop bacsClass).
                    // Eliminat fallback-ul `heating?.bacsClass` (legacy nemaifolosit).
                    bacs_class: bacsClass || "D",
                    n50: building.n50 || "",
                    sri_total: (() => {
                      try {
                        const s = calcSRI(
                          heating, cooling, ventilation, lighting,
                          solarThermal, photovoltaic, heatPump,
                          bacsClass || "D"
                        );
                        return String(s?.total ?? "");
                      } catch { return ""; }
                    })(),
                    sri_grade: (() => {
                      try {
                        const s = calcSRI(
                          heating, cooling, ventilation, lighting,
                          solarThermal, photovoltaic, heatPump,
                          bacsClass || "D"
                        );
                        return s?.grade ?? "";
                      } catch { return ""; }
                    })(),
                    // Date instalații + anvelopă (pentru checkbox-uri Anexa)
                    heating_source: heating.source || "",
                    heating_fuel: (HEAT_SOURCES.find(function(s){return s.id===heating.source;})?.fuel) || "",
                    heating_control: heating.control || "",
                    heating_power: String(heating.power || 0),
                    acm_source: acm.source || "",
                    cooling_source: cooling.system || "",
                    cooling_has: instSummary?.hasCool ? "true" : "false",
                    ventilation_type: ventilation.type || "",
                    lighting_type: lighting.type || "",
                    lighting_control: lighting.controlType || "",
                    solar_thermal_enabled: solarThermal.enabled ? "true" : "false",
                    pv_enabled: photovoltaic.enabled ? "true" : "false",
                    heat_pump_enabled: heatPump.enabled ? "true" : "false",
                    heat_pump_type: heatPump.type || "",
                    biomass_enabled: biomass.enabled ? "true" : "false",
                    biomass_type: biomass.type || "",
                    wind_enabled: (otherRenew && otherRenew.windEnabled) ? "true" : "false",
                    structure: building.structure || "",
                    year_built: building.yearBuilt || "",
                    climate_zone_num: String(parseInt(selectedClimate?.zone) || 3),
                    opaque_u_values: JSON.stringify(opaqueElements.map(function(el) {
                      // FIX 21 apr 2026: trimit și `area` (lipsea înainte) — Python avea
                      // filtrare area>0 → toate elementele opace erau respinse → Tabel 2
                      // anvelopă populat doar cu ferestre (FE din glazing_area_total_m2).
                      var area = parseFloat(el.area) || 0;
                      if (!el.layers || el.layers.length === 0) return {type: el.type, area: area, u: parseFloat(el.u) || 0};
                      var elType = ELEMENT_TYPES.find(function(t){return t.id===el.type;});
                      var rsi = elType ? elType.rsi : 0.13;
                      var rse = elType ? elType.rse : 0.04;
                      var rL = el.layers.reduce(function(s,l){var d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0);},0);
                      return {type: el.type, area: area, u: rL > 0 ? 1/(rsi+rL+rse) : 0};
                    })),
                    glazing_max_u: String(glazingElements.length > 0 ? Math.max(0, ...glazingElements.map(function(e){return parseFloat(e.u)||0;})) : 0),
                    // EP per utilitate (kWh/m²·an) — pentru colorare celule tabel clase
                    ep_incalzire: fmtRo(Au > 0 ? (instSummary?.ep_h || 0) / Au : 0, 1),
                    ep_acm:       fmtRo(Au > 0 ? (instSummary?.ep_w || 0) / Au : 0, 1),
                    ep_racire:    fmtRo(Au > 0 ? (instSummary?.ep_c || 0) / Au : 0, 1),
                    ep_ventilare: fmtRo(Au > 0 ? (instSummary?.ep_v || 0) / Au : 0, 1),
                    ep_iluminat:  fmtRo(Au > 0 ? (instSummary?.ep_l || 0) / Au : 0, 1),
                    // ── Etapa 7 (20 apr 2026) — câmpuri Anexa 2 detaliate ──
                    // Completare automată câmpuri lipsă din audit Anexa (gap-uri identificate
                    // 20 apr 2026): EER, putere frigorifică, ventilare HR, putere iluminat,
                    // energie regenerabilă exportată, nr. apartamente.
                    cooling_power_kw: cooling?.power ? fmtRo(parseFloat(cooling.power), 1) : "",
                    cooling_eer:      cooling?.eer ? fmtRo(parseFloat(cooling.eer), 2) : "",
                    cooling_seer:     cooling?.seer ? fmtRo(parseFloat(cooling.seer), 2) : "",
                    cooled_area_m2:   cooling?.cooledArea ? fmtRo(parseFloat(cooling.cooledArea), 1) : "",
                    ventilation_hr_efficiency_pct: ventilation?.hrEfficiency
                      ? fmtRo(parseFloat(ventilation.hrEfficiency) * (parseFloat(ventilation.hrEfficiency) <= 1 ? 100 : 1), 0)
                      : "",
                    ventilation_type_label: (() => {
                      const map = {
                        natural_neorg: "Naturală neorganizată",
                        natural_org:   "Naturală organizată",
                        mecanica:      "Mecanică",
                        mecanica_hr:   "Mecanică cu recuperare căldură",
                        UTA:           "Unitate de tratare aer (UTA)",
                        VMC:           "Ventilație mecanică controlată (VMC)",
                      };
                      return map[ventilation?.type] || ventilation?.type || "";
                    })(),
                    ventilation_has_hr: (() => {
                      // FIX 21 apr 2026: detectare HR mai cuprinzătoare:
                      // hr / HR / UTA (orice prefix) / ERV / recuperator / hrEfficiency > 0
                      const vt = String(ventilation?.type || "").toLowerCase();
                      const eff = parseFloat(ventilation?.hrEfficiency) || 0;
                      const hasHR =
                        vt.includes("hr") ||
                        vt.includes("uta") ||
                        vt.includes("erv") ||
                        vt.includes("recup") ||
                        eff > 0;
                      return hasHR ? "Da" : "Nu";
                    })(),
                    lighting_power_kw: (() => {
                      // Putere iluminat: din W_P × Au sau qf_l / ore funcționare standard
                      const wp = parseFloat(lighting?.totalPowerInstalled) || 0;
                      if (wp > 0) return fmtRo(wp / 1000, 2);  // W → kW
                      // Fallback: leni × Au / 8760h → kW mediu
                      const leni = parseFloat(instSummary?.leni) || 0;
                      if (leni > 0 && Au > 0) return fmtRo(leni * Au / 8760, 2);
                      return "";
                    })(),
                    pv_kwh_year:        renewSummary?.qPV_kWh ? fmtRo(renewSummary.qPV_kWh, 0) : "",
                    solar_th_kwh_year:  renewSummary?.qSolarTh ? fmtRo(renewSummary.qSolarTh, 0) : "",
                    wind_kwh_year:      renewSummary?.qWind ? fmtRo(renewSummary.qWind, 0) : "",
                    glazing_area_total_m2: glazingElements?.length
                      ? fmtRo(glazingElements.reduce((s, g) => s + (parseFloat(g.area) || 0), 0), 1)
                      : "",
                    n_apartments_count: (() => {
                      const fromArr = (building?.apartments || []).length;
                      if (fromArr > 0) return String(fromArr);
                      return building?.units || "";
                    })(),
                    // Etapa 7d (20 apr 2026) — câmpuri suplimentare pentru gap-urile P0
                    acm_power: acm?.power ? fmtRo(parseFloat(acm.power), 1) : "",
                    ventilation_flow_m3h: (() => {
                      // Debit aer proaspăt: priority pe ventilation.flowRate, fallback calc EN 16798-1
                      // (4.5 l/s/persoană × ocupanți)
                      const direct = ventilation?.flowRate || ventilation?.flow_m3h;
                      if (direct) return fmtRo(parseFloat(direct), 0);
                      // Fallback: 4.5 l/s × ocupanți (15 m²/pers nrez, 30 m²/pers rez) → m³/h
                      const isRes = ["RI","RC","RA"].includes(building?.category);
                      const occ = Math.max(1, Math.round(Au / (isRes ? 30 : 15)));
                      return String(Math.round(occ * 4.5 * 3.6));  // l/s → m³/h
                    })(),
                    // ── Sprint monolith (20 apr 2026) — Anexa 1+2 MDLPA extinderi ──
                    // Toate câmpurile opționale pentru completarea automată a tabelelor
                    // și placeholder-elor din Anexa 1+2 (Ord. MDLPA 16/2023)
                    heating_gen_location: building.heatGenLocation || "",
                    heating_other_source_text: building.heatingOtherSource || "",
                    heating_radiator_type: building.heatingRadiatorType || "",
                    heating_radiators: JSON.stringify(building.heatingRadiators || []),
                    heating_has_meter: building.heatingHasMeter || "",
                    heating_cost_allocator: building.heatingCostAllocator || "",
                    heating_pipe_diameter_mm: building.heatingPipeDiameterMm || "",
                    heating_pipe_pressure_mca: building.heatingPipePressureMca || "",
                    // ── Sprint 25 P0.2 — extinderi pentru 14 chei REC_* nedeclanșate ──
                    heating_year_installed: building.heatingYearInstalled || "",
                    heating_pipe_insulated: building.heatingPipeInsulated || "",
                    heating_has_balancing_valves: building.heatingHasBalancingValves || "",
                    heating_eta_gen: instSummary?.heating?.eta_gen || building.heatingEtaGen || "",
                    acm_year_installed: building.acmYearInstalled || "",
                    acm_pipe_insulated: building.acmPipeInsulated || "",
                    acm_fixtures_low_flow: building.acmFixturesLowFlow || "",
                    ventilation_year_installed: building.ventilationYearInstalled || "",
                    co2_max_ppm: building.co2MaxPpm || "",
                    shading_factor: building.shadingFactor || "",
                    attic_heated: building.atticHeated || "",
                    stove_count: building.stoveCount || "",
                    building_unheated_spaces: JSON.stringify(building.unheatedSpaces || []),
                    building_has_disconnected_apartments: building.buildingHasDisconnectedApartments || "",
                    acm_fixtures: JSON.stringify(building.acmFixtures || {}),
                    acm_consume_points_count: building.acmConsumePointsCount || "",
                    acm_pipe_diameter_mm: building.acmPipeDiameterMm || "",
                    acm_instant_power_kw: building.acmInstantPowerKw || "",
                    acm_has_meter: building.acmHasMeter || "",
                    acm_flow_meters: building.acmFlowMeters || "",
                    acm_recirculation: building.acmRecirculation || (acm?.circRecirculation ? "functionala" : "nu_exista"),
                    acm_storage_volume: acm?.storageVolume || "",
                    cooling_refrigerant: building.coolingRefrigerant || "",
                    cooling_dehum_power_kw: building.coolingDehumPowerKw || "",
                    cooling_indoor_units: building.coolingIndoorUnits || "",
                    cooling_outdoor_units: building.coolingOutdoorUnits || "",
                    cooling_pipe_diameter_mm: building.coolingPipeDiameterMm || "",
                    cooling_space_scope: building.coolingSpaceScope || "",
                    cooling_humidity_control: building.coolingHumidityControl || "",
                    cooling_individual_meter: building.coolingIndividualMeter || "",
                    ventilation_fan_count: building.ventilationFanCount || "",
                    ventilation_hr_type: building.ventilationHrType || "",
                    ventilation_control_type: building.ventilationControlType || "",
                    lighting_network_state: building.lightingNetworkState || "",
                    lighting_other_type: building.lightingOtherType || "",
                    humidification_power_kw: building.humidificationPowerKw || "",
                    wind_centrals_count: building.windCentralsCount || (otherRenew?.windEnabled ? "1" : ""),
                    wind_power_kw: building.windPowerKw || otherRenew?.windCapacity || "",
                    wind_hub_height_m: building.windHubHeightM || "",
                    wind_rotor_diameter_m: building.windRotorDiameterM || "",
                    heat_pump_covers: heatPump?.covers || "",
                    heat_pump_scop_heating: heatPump?.scopHeating || "",
                    heat_pump_scop_cooling: heatPump?.scopCooling || "",
                    // ── Sprint post-deploy fix (20 apr 2026) — extinderi regenerabile ──
                    // FIX 20 apr: trimitem DETALII DOAR DACĂ `enabled=true` (altfel
                    // detaliile apar în DOCX pentru "Nu există" ⊠ — inconsistență logică).
                    solar_th_type_label: (() => {
                      if (!solarThermal?.enabled) return "";
                      const map = { PLAN: "Plan", VACUUM: "Cu tuburi vidate", TUBURI: "Cu tuburi vidate" };
                      return map[solarThermal?.type] || "";
                    })(),
                    solar_th_area: (solarThermal?.enabled && solarThermal?.area) ? fmtRo(parseFloat(solarThermal.area), 1) : "",
                    solar_th_panels: (() => {
                      if (!solarThermal?.enabled) return "";
                      const area = parseFloat(solarThermal?.area) || 0;
                      if (solarThermal?.panels) return String(solarThermal.panels);
                      if (area > 0) return String(Math.max(1, Math.ceil(area / 2)));
                      return "";
                    })(),
                    solar_th_orientation: (solarThermal?.enabled && solarThermal?.orientation) || "",
                    solar_th_tilt: (solarThermal?.enabled && solarThermal?.tilt) || "",
                    solar_th_usage: (() => {
                      if (!solarThermal?.enabled) return "";
                      const map = { acm: "preparare acc", acm_heating: "preparare acc și încălzire", heating: "încălzire" };
                      return map[solarThermal?.usage] || solarThermal?.usage || "";
                    })(),
                    pv_type_label: (() => {
                      if (!photovoltaic?.enabled) return "";
                      const map = { MONO: "Monocristalin", POLI: "Policristalin", POLY: "Policristalin", THIN: "Film subțire" };
                      return map[photovoltaic?.type] || "";
                    })(),
                    pv_area: (photovoltaic?.enabled && photovoltaic?.area) ? fmtRo(parseFloat(photovoltaic.area), 1) : "",
                    pv_peak_power: (photovoltaic?.enabled && photovoltaic?.peakPower) ? fmtRo(parseFloat(photovoltaic.peakPower), 2) : "",
                    pv_panels: (() => {
                      if (!photovoltaic?.enabled) return "";
                      const peak = parseFloat(photovoltaic?.peakPower) || 0;
                      if (photovoltaic?.panels) return String(photovoltaic.panels);
                      if (peak > 0) return String(Math.max(1, Math.ceil(peak / 0.4)));
                      return "";
                    })(),
                    pv_orientation: (photovoltaic?.enabled && photovoltaic?.orientation) || "",
                    pv_tilt: (photovoltaic?.enabled && photovoltaic?.tilt) || "",
                    pv_usage: (() => {
                      if (!photovoltaic?.enabled) return "";
                      const map = { all: "consum total + injecție rețea", self: "autoconsum", heating: "încălzire", cooling: "răcire" };
                      return map[photovoltaic?.usage] || photovoltaic?.usage || "";
                    })(),
                    heat_pump_count: heatPump?.enabled ? String(heatPump?.count || 1) : "",
                    heat_pump_type_label: (() => {
                      if (!heatPump?.enabled) return "";
                      const map = {
                        PC_AA: "aer-aer", PC_AW: "aer-apă", pc_aer_apa: "aer-apă",
                        pc_aer_aer: "aer-aer", pc_sol_apa: "sol-apă buclă închisă",
                        pc_apa_apa: "apă-apă", sol_apa_deschisa: "sol-apă buclă deschisă",
                        sol_apa_inchisa: "sol-apă buclă închisă", apa_aer: "apă-aer",
                        sol_aer: "sol-aer",
                      };
                      return map[heatPump?.type] || heatPump?.type || "";
                    })(),
                    biomass_type_label: (() => {
                      // FIX 20 apr 2026: trimit DOAR când enabled (altfel contaminare
                      // "alt tip, precizați PELETI" în secțiuni străine)
                      if (!biomass?.enabled) return "";
                      const bt = biomass?.type;
                      // Standard types: PELETI, BRICHETE, LEMN → nu trimit ca "alt tip"
                      if (["PELETI", "BRICHETE", "LEMN", "peleti", "brichete", "lemn"].includes(bt)) {
                        return "";  // tipul standard se bifează via CB, nu prin "alt tip"
                      }
                      const map = { PELETI: "peleți", BRICHETE: "brichete", LEMN: "lemn tocat" };
                      return map[bt] || bt || "";
                    })(),
                    biomass_power_kw: (biomass?.enabled && biomass?.power) ? fmtRo(parseFloat(biomass.power), 1) : "",
                    renewable_mount_location: (solarThermal?.enabled || photovoltaic?.enabled) ? "pe clădire" : "",
                    // Fix 20 apr 2026: subsol/pod flags pentru regim înălțime complet
                    basement: building.basement ? "true" : "false",
                    attic: building.attic ? "true" : "false",
                    biomass_enabled: biomass?.enabled ? "true" : "false",
                    // 2 mai 2026 — Etape implementare + Stimulente financiare (secțiunea I AnexaMDLPA)
                    // Completate de auditor din formularul COMPLETARE AUTOMATĂ DETALIATĂ (Pas 6)
                    etape_implementare: building.etapeImplementare || "",
                    stimulente_financiare: building.stimulenteFinanciare || "",
                    // 2 mai 2026 — Soluții și măsuri custom (Anexa secțiunile 1, 2, 3.A, 3.B + regenerabile)
                    // Înlocuiesc placeholder-ele „Alte soluții: ..." din template Anexa
                    solutii_anvelopa: building.solutiiAnvelopa || "",
                    solutii_instalatii: building.solutiiInstalatii || "",
                    masuri_organizare: building.masuriOrganizare || "",
                    masuri_locale: building.masuriLocale || "",
                    regenerabile_custom: building.regenerabileCustom || "",
                    // 2 mai 2026 — câmpuri pentru bifare automată în Anexa 1+2
                    nr_persoane: building.nrOcupanti || "",
                    structure_code: (() => {
                      const s = String(building.structure || "").toLowerCase();
                      if (s.includes("zidăr") || s.includes("zidar") || s.includes("cărămid")) return "zidarie";
                      if (s.includes("pafp") || s.includes("panou") || s.includes("beton armat")) return "beton_armat";
                      if (s.includes("cadre")) return "cadre_ba";
                      if (s.includes("stâlp") || s.includes("stalp") || s.includes("grin")) return "stalpi_grinzi";
                      if (s.includes("lemn")) return "lemn";
                      if (s.includes("metal")) return "metalica";
                      return "alt_tip";
                    })(),
                    heating_source_type: (() => {
                      const fuel = String(heating?.fuel || heating?.heatGenLocation || "").toLowerCase();
                      if (fuel.includes("termo") || fuel.includes("dh") || fuel.includes("racord")) return "centrala_exterioara";
                      if (fuel.includes("centrala") || fuel.includes("gaz") || fuel.includes("naftă")) return "centrala_proprie";
                      if (fuel.includes("electr") || fuel.includes("calor")) return "aparate_independente";
                      return "alt_tip";
                    })(),
                    contor_caldura: heating?.allocator === "da" ? "exista" : "nu_exista",
                    repartitoare_costuri: building.heatingCostAllocator === "da" ? "exista" : "nu_exista",
                    acm_recirculare: building.acmRecirculation || "nu_exista",
                    iluminat_control: (() => {
                      const c = String(lighting?.control || "").toLowerCase();
                      if (c.includes("auto") || c.includes("dali") || c.includes("knx")) return "automat";
                      if (c.includes("manu")) return "manuala";
                      return "fara_reglare";
                    })(),
                    zona_climatica: (() => {
                      // Mc 001-2022: 5 zone climatice România (I-V)
                      const z = String(building.climateZone || climate?.zone || "").toUpperCase().replace(/[^IVX]/g, "");
                      return ["I", "II", "III", "IV", "V"].includes(z) ? z : "II";
                    })(),
                    zona_eoliana: (() => {
                      const z = String(building.windZone || climate?.windZone || "").toUpperCase().replace(/[^IV]/g, "");
                      return ["I", "II", "III", "IV"].includes(z) ? z : "II";
                    })(),
                    regim_inaltime: building.floors || "P",
                  },
                  // Fotografiile se trimit DOAR pentru Anexa (mode=anexa/anexa_bloc).
                  // Pentru CPE (mode=cpe) fotografiile nu sunt procesate de Python →
                  // excludem din payload pentru a rămâne sub limita Vercel Hobby (4.5MB).
                  // Limită dinamică pe bytes: max 2.5MB fotografii → payload total < 4.5MB.
                  buildingPhotos: mode === "cpe" ? [] : (() => {
                    const all = buildingPhotos || [];
                    const MAX_PHOTO_BYTES = 2.5 * 1024 * 1024; // 2.5MB total pentru fotografii
                    let totalBytes = 0;
                    const selected = [];
                    for (const p of all) {
                      const sz = (p.url || "").length * 0.75; // base64 → bytes estimate
                      if (totalBytes + sz > MAX_PHOTO_BYTES) break;
                      totalBytes += sz;
                      selected.push(p);
                    }
                    if (selected.length < all.length) {
                      showToast(`Au fost incluse ${selected.length} din ${all.length} fotografii (limită 2.5MB)`, "warning");
                    }
                    return selected.map(p => ({
                      url: p.url, label: p.label || "", zone: p.zone || "altele", note: p.note || ""
                    }));
                  })(),
                };

                // Etapa 4 (BUG-4) — Anexa Bloc multi-apartament: payload extins
                if (mode === "anexa_bloc") {
                  const apartmentsRaw = building?.apartments || [];
                  if (apartmentsRaw.length === 0) {
                    showToast("Nu există apartamente definite pentru bloc — adaugă în Pasul 1.", "error");
                    return;
                  }
                  // Calcul EP/CO2 + clase per apartament (logică Mc 001-2022 Anexa 7)
                  // Audit 2 mai 2026 — P1.14: mid_interior 1.00 → 0.95
                  // (apt curent interior fără pereți exteriori → pierderi reduse).
                  const POSITION_FACTORS = {
                    ground_interior: 1.10, ground_corner: 1.18,
                    mid_interior: 0.95,    mid_corner: 1.07,
                    top_interior: 1.08,    top_corner: 1.15,
                  };
                  const totalAuApt = apartmentsRaw.reduce((s, a) => s + (parseFloat(a.areaUseful) || 0), 0);
                  const apartmentsRich = apartmentsRaw.map((apt) => {
                    const isGround = apt.groundFloor || String(apt.floor).toLowerCase() === "p" || apt.floor === 0 || apt.floor === "0";
                    const isTop = !!apt.topFloor;
                    const isCorner = !!apt.corner;
                    const posKey = isGround
                      ? (isCorner ? "ground_corner" : "ground_interior")
                      : isTop
                        ? (isCorner ? "top_corner" : "top_interior")
                        : (isCorner ? "mid_corner" : "mid_interior");
                    const posFactor = POSITION_FACTORS[posKey] || 1.0;
                    const epAptM2 = epFinal * posFactor;
                    const co2AptM2 = (co2Final_m2 || 0) * posFactor;
                    const enClsApt = getEnergyClass(epAptM2, catKey);
                    const co2ClsApt = getCO2Class(co2AptM2, baseCatResolved);
                    const au = parseFloat(apt.areaUseful) || 0;
                    return {
                      number: apt.number || "",
                      staircase: apt.staircase || "",
                      floor: apt.floor,
                      areaUseful: au,
                      orientation: apt.orientation || [],
                      occupants: apt.occupants || 2,
                      corner: apt.corner, topFloor: apt.topFloor, groundFloor: apt.groundFloor,
                      posKey, posFactor,
                      epAptM2, co2AptM2,
                      enClass: enClsApt?.cls || "—",
                      co2Class: co2ClsApt?.cls || "—",
                      allocatedPct: totalAuApt > 0 ? (au / totalAuApt) * 100 : 0,
                    };
                  });
                  // Sumar
                  const wEp = apartmentsRich.reduce((s, r) => s + r.epAptM2 * r.areaUseful, 0);
                  const wCo2 = apartmentsRich.reduce((s, r) => s + r.co2AptM2 * r.areaUseful, 0);
                  const epAvgWeighted = totalAuApt > 0 ? wEp / totalAuApt : 0;
                  const co2AvgWeighted = totalAuApt > 0 ? wCo2 / totalAuApt : 0;
                  const dist = {};
                  apartmentsRich.forEach((r) => { dist[r.enClass] = (dist[r.enClass] || 0) + 1; });
                  payload.apartments = apartmentsRich;
                  payload.apartmentSummary = {
                    totalAu: totalAuApt,
                    epAvgWeighted, co2AvgWeighted,
                    avgEnergyClass: getEnergyClass(epAvgWeighted, catKey)?.cls || "—",
                    avgCo2Class: getCO2Class(co2AvgWeighted, baseCatResolved)?.cls || "—",
                    classDistribution: dist,
                    count: apartmentsRich.length,
                  };
                  payload.commonSystems = building?.commonSystems || {};
                }

                // Routing query: cpe / anexa / anexa_bloc
                const typeQuery = mode === "anexa_bloc" ? "anexa_bloc" : (mode === "anexa" ? "anexa" : "cpe");
                const resp = await fetch(`/api/generate-document?type=${typeQuery}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });

                if (!resp.ok) {
                  const contentType = resp.headers.get("content-type") || "";
                  if (resp.status === 404 && !contentType.includes("json")) {
                    throw new Error("API indisponibil (404). Reporniți dev server — proxy-ul trebuie să fie activ.");
                  }
                  const err = await resp.json().catch(() => ({ error: "Eroare server " + resp.status }));
                  throw new Error(err.error || "Eroare server: " + resp.status);
                }

                const blob = await resp.blob();

                // Tot post-processing-ul (checkboxes, foto, scale) se face server-side în Python

                // [Checkpoint: tot codul vechi de post-processing (checkboxes, foto, repack) a fost eliminat]
                // [Python API gestionează totul server-side]
                //
                // ════════════════════════════════════════════════════════════════════
                // AUDIT 2 mai 2026 — P1.11: tot blocul de mai jos e DEZACTIVAT.
                // python-docx (api/generate-document.py) este motorul real care
                // gestionează checkbox-urile DOCX, foto, scale și repack.
                //
                // Pentru audit complet al acoperirii CB-urilor (verificare împotriva
                // formularului oficial MDLPA Ord. 16/2023, mapare pe categoriile
                // RI/RC/RA/BI/ED/SA/HC/CO/SP/AL/BC), vezi sprint dedicat:
                //   docs/API_CHECKBOX_AUDIT.md  (de creat în Sprint 5+)
                //
                // Blocul rămâne aici ca referință istorică pentru cazuri în care
                // se reactivează rendering client-side (ex: preview offline).
                // ════════════════════════════════════════════════════════════════════
                if (false && mode === "anexa_DISABLED") {
                  // TOT ACEST BLOC E DEZACTIVAT — python-docx face totul server-side
                  const checkCB = (n) => {
                    let count = 0;
                    xml = xml.replace(/<w:checkBox><w:sizeAuto\/><w:default w:val="0"\/><\/w:checkBox>/g, (match) => {
                      if (count === n) { count++; return '<w:checkBox><w:sizeAuto/><w:default w:val="1"/></w:checkBox>'; }
                      count++;
                      return match;
                    });
                  };

                  // ── Helper: bifează mai multe checkbox-uri dintr-o dată (eficient) ──
                  const checkCBs = (indices) => {
                    const set = new Set(indices);
                    let count = 0;
                    xml = xml.replace(/<w:checkBox><w:sizeAuto\/><w:default w:val="0"\/><\/w:checkBox>/g, (match) => {
                      const result = set.has(count) ? '<w:checkBox><w:sizeAuto/><w:default w:val="1"/></w:checkBox>' : match;
                      count++;
                      return result;
                    });
                  };

                  const isRes = ["RI","RC","RA"].includes(building.category);
                  const uRef = isRes ? U_REF_NZEB_RES : U_REF_NZEB_NRES;
                  const hSource = HEAT_SOURCES.find(function(h){return h.id===heating.source;});
                  const acmSrc = ACM_SOURCES.find(function(a){return a.id===acm.source;});
                  const coolSrc = COOLING_SYSTEMS.find(function(c){return c.id===cooling.source;});
                  const ventType = VENTILATION_TYPES.find(function(v){return v.id===ventilation.type;});
                  const lightType = LIGHTING_TYPES.find(function(l){return l.id===lighting.type;});
                  const lightCtrl = LIGHTING_CONTROL.find(function(l){return l.id===lighting.control;});

                  // ══════════════════════════════════════
                  // ANEXA 1 — RECOMANDĂRI (CB 0-64)
                  // ══════════════════════════════════════
                  const cbAnex1 = [];

                  // Anvelopă — bifăm dacă U calculat > U referință
                  const opaqueU = opaqueElements.map(function(el) {
                    if (!el.layers || el.layers.length === 0) return { type: el.type, u: 999 };
                    const elType = ELEMENT_TYPES.find(function(t){return t.id===el.type;});
                    const rsi = elType ? elType.rsi : 0.13;
                    const rse = elType ? elType.rse : 0.04;
                    const rL = el.layers.reduce(function(s,l){var d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0);},0);
                    return { type: el.type, u: 1/(rsi+rL+rse) };
                  });
                  // CB0: pereți exteriori neconformi
                  if (opaqueU.some(function(e){ return e.type==="PE" && e.u > (uRef.PE||0.25); })) cbAnex1.push(0);
                  // CB1: planșeu peste subsol
                  if (opaqueU.some(function(e){ return e.type==="PB" && e.u > (uRef.PB||0.29); })) cbAnex1.push(1);
                  // CB2: terasă/planșeu sub pod
                  if (opaqueU.some(function(e){ return (e.type==="PT"||e.type==="PP") && e.u > (uRef[e.type]||0.15); })) cbAnex1.push(2);
                  // CB3: planșee contact exterior / placă pe sol
                  if (opaqueU.some(function(e){ return (e.type==="PL"||e.type==="SE") && e.u > (uRef[e.type]||0.20); })) cbAnex1.push(3);
                  // CB5: tâmplărie
                  const uGlazRef = isRes ? 1.30 : 1.80;
                  if (glazingElements.some(function(e){ return (parseFloat(e.u)||0) > uGlazRef; })) cbAnex1.push(5);
                  // CB6: grile ventilare higroreglabile
                  if (!ventilation.type || ventilation.type === "natural_neorg") cbAnex1.push(6);
                  // CB13: robinete termostat
                  if (heating.source && !["electric_direct","pc_aer_aer"].includes(heating.source)) cbAnex1.push(13);
                  // CB21: automatizare
                  if (!heating.control || heating.control === "manual") cbAnex1.push(21);
                  // CB25: iluminat LED
                  if (lighting.type && lighting.type !== "led") cbAnex1.push(25);
                  // CB26: senzori prezență
                  if (!lighting.control || !["sensor_presence","daylight_dimming"].includes(lighting.control)) cbAnex1.push(26);
                  // CB27: regenerabile
                  if (!solarThermal.enabled && !photovoltaic.enabled) cbAnex1.push(27);
                  // CB28: recuperare căldură
                  if (!ventilation.type || !ventilation.type.includes("mec_hr")) cbAnex1.push(28);

                  // Estimare costuri (CB 48-53): < 1000, 1k-10k, 10k-25k, 25k-50k, 50k-100k, > 100k
                  const totalCostEst = (financialAnalysis?.totalInvestment || annualEnergyCost?.totalEur || 0);
                  if (totalCostEst < 1000) cbAnex1.push(48);
                  else if (totalCostEst < 10000) cbAnex1.push(49);
                  else if (totalCostEst < 25000) cbAnex1.push(50);
                  else if (totalCostEst < 50000) cbAnex1.push(51);
                  else if (totalCostEst < 100000) cbAnex1.push(52);
                  else cbAnex1.push(53);

                  // Estimare economii energie (CB 54-59): <10%, 10-20, 20-30, 30-40, 40-50, >60%
                  // Audit 2 mai 2026 — P1.12: NU mai folosim fallback `|| 20` (bias optimist).
                  // Dacă financialAnalysis nu e calculat, marcăm explicit "necalculat" prin
                  // a NU bifa niciun checkbox de economii — auditorul completează manual.
                  // (Acest cod e oricum în blocul DEAD code dezactivat — vezi P1.11.)
                  const savings = financialAnalysis?.energySavingsPercent;
                  if (Number.isFinite(savings)) {
                    if (savings < 10) cbAnex1.push(54);
                    else if (savings < 20) cbAnex1.push(55);
                    else if (savings < 30) cbAnex1.push(56);
                    else if (savings < 40) cbAnex1.push(57);
                    else if (savings < 50) cbAnex1.push(58);
                    else cbAnex1.push(59);
                  }

                  // Durată recuperare (CB 60-64): <1 an, 1-3, 3-7, 7-10, >10
                  const payback = financialAnalysis?.paybackYears || 5;
                  if (payback < 1) cbAnex1.push(60);
                  else if (payback < 3) cbAnex1.push(61);
                  else if (payback < 7) cbAnex1.push(62);
                  else if (payback < 10) cbAnex1.push(63);
                  else cbAnex1.push(64);

                  // ══════════════════════════════════════
                  // ANEXA 2 — DATE CLĂDIRE (CB 65+)
                  // ══════════════════════════════════════

                  // Tipul clădirii: CB65=existentă, CB66=nouă finalizată, CB67=existentă nefinalizată
                  const yearB = parseInt(building.yearBuilt) || 2000;
                  if (yearB >= new Date().getFullYear() - 1) cbAnex1.push(66); // nouă finalizată
                  else cbAnex1.push(65); // existentă

                  // Categoria clădirii (CB 68-111)
                  const catCBMap = {
                    RI: [68, 69],   // rezidențial + casă individuală
                    RC: [68, 71],   // rezidențial + bloc locuințe
                    RA: [68, 71],   // rezidențial + bloc locuințe
                    BI: [79, 80],   // birouri + birouri
                    ED: [74, 76],   // învățământ + școală
                    SA: [86, 87],   // sănătate + spital
                    HC: [94, 95],   // turism + hotel
                    CO: [103, 104], // comerț + magazin mic
                    SP: [99, 100],  // sport + sală
                    AL: [108, 111], // alte tipuri + alte clădiri
                  };
                  const catCBs = catCBMap[building.category] || catCBMap.AL;
                  catCBs.forEach(function(cb){ cbAnex1.push(cb); });

                  // Zone climatice (CB 112-116 = zone I-V)
                  const zoneNum = parseInt(selectedClimate?.zone) || 3;
                  if (zoneNum >= 1 && zoneNum <= 5) cbAnex1.push(111 + zoneNum); // CB112=I, CB113=II, ...

                  // Zone eoliene (CB 117-120 = zone I-IV)
                  // Derivăm zona eoliană din locație (simplificat: câmpie=I-II, munte=III-IV)
                  const windZone = zoneNum <= 2 ? 1 : (zoneNum <= 4 ? 2 : 3);
                  if (windZone >= 1 && windZone <= 4) cbAnex1.push(116 + windZone);

                  // Structura constructivă (CB 127-134)
                  const structCBMap = {
                    "Zidărie portantă": 127,
                    "Cadre beton armat": 129,
                    "Panouri prefabricate mari": 133,
                    "Structură metalică": 132,
                    "Structură lemn": 131,
                    "Mixtă": 134,
                  };
                  const structCB = structCBMap[building.structure];
                  if (structCB) cbAnex1.push(structCB);

                  // ── ÎNCĂLZIRE (CB 135+) ──
                  // CB135=Da funcțională, CB136=Da nefuncțională, CB137=Nu
                  if (heating.source) cbAnex1.push(135); else cbAnex1.push(137);

                  // Sursa încălzire (CB 138-149)
                  if (heating.source) {
                    const heatSrcCBMap = {
                      gaz_conv: 144,    // CT în clădire
                      gaz_cond: 144,
                      termoficare: 146, // Termoficare
                      electric_direct: 139, // Sursă electrică
                      pc_aer_apa: 149,  // Altă sursă
                      pc_aer_aer: 139,
                      pc_sol_apa: 149,
                      pc_apa_apa: 149,
                      centrala_gpl: 144,
                      cazan_lemn: 138,  // Sursă proprie
                      cazan_peleti: 138,
                      soba_teracota: 138,
                      pompa_caldura: 149,
                    };
                    const hCB = heatSrcCBMap[heating.source];
                    if (hCB) cbAnex1.push(hCB);
                  }

                  // Tipul sistemului de încălzire (CB 150-157)
                  if (heating.source === "soba_teracota") cbAnex1.push(150);
                  else if (heating.source === "electric_direct") cbAnex1.push(154);
                  else cbAnex1.push(151); // corpuri statice (default)

                  // Tip distribuție (CB 160=inferioară, 161=superioară, 162=mixtă)
                  cbAnex1.push(160); // default inferioară

                  // ── ACM (CB 176+) ──
                  if (acm.source) cbAnex1.push(176); else cbAnex1.push(178);

                  // Sursa ACM (CB 179-186)
                  if (acm.source) {
                    const acmSrcCBMap = {
                      ct_prop: 181,     // CT în clădire
                      boiler_electric: 180, // Sursă electrică
                      termoficare: 183,
                      solar_termic: 179,
                      pc: 186,
                    };
                    const aCB = acmSrcCBMap[acm.source];
                    if (aCB) cbAnex1.push(aCB);
                  }

                  // Echipament ACM (CB 187-190)
                  if (acm.source === "boiler_electric") cbAnex1.push(187); // Boiler acumulare
                  else if (acm.source === "ct_prop") cbAnex1.push(188); // Instant

                  // Recirculare ACM (CB 193=funcțională, 194=nu funcționează, 195=nu există)
                  cbAnex1.push(195); // default: nu există

                  // ── RĂCIRE/CLIMATIZARE (CB 202+) ──
                  const hasCool = instSummary && instSummary.hasCool;
                  if (hasCool) cbAnex1.push(202); else cbAnex1.push(204);

                  // Tip sursă frig (CB 205-215)
                  if (hasCool && cooling.source) {
                    const coolCBMap = {
                      split: 214,
                      chiller_aer: 205,
                      chiller_apa: 206,
                      pc_aer_apa: 207,
                      pc_apa_apa: 208,
                      pc_aer_aer: 209,
                      monobloc: 213,
                    };
                    const cCB = coolCBMap[cooling.source];
                    if (cCB) cbAnex1.push(cCB);
                  }

                  // Climatizat complet/parțial (CB 229=complet, 230=global, 231=parțial)
                  if (hasCool) cbAnex1.push(229);

                  // Fără controlul umidității (CB 232)
                  if (hasCool) cbAnex1.push(232);

                  // ── VENTILARE MECANICĂ (CB 256+) ──
                  const hasVent = ventilation.type && ventilation.type !== "natural_neorg";
                  if (hasVent) cbAnex1.push(256); else cbAnex1.push(258);

                  // Tip ventilare (CB 259-265)
                  if (ventilation.type === "natural_neorg") cbAnex1.push(259);
                  else if (ventilation.type === "natural_org") cbAnex1.push(260);
                  else if (hasVent) cbAnex1.push(261); // Mecanică

                  // Recuperator (CB 270=Da, 271=Nu)
                  if (ventilation.type && ventilation.type.includes("hr")) cbAnex1.push(270);
                  else cbAnex1.push(271);

                  // ── ILUMINAT (CB 272+) ──
                  if (lighting.type) cbAnex1.push(272); else cbAnex1.push(274);

                  // Control iluminat (CB 275-280)
                  if (lighting.control === "manual") cbAnex1.push(276);
                  else if (lighting.control === "daylight_dimming") { cbAnex1.push(277); cbAnex1.push(278); }
                  else if (lighting.control === "sensor_presence") { cbAnex1.push(277); cbAnex1.push(279); }
                  else cbAnex1.push(275); // Funcționare on/off

                  // Tip iluminat (CB 281-284)
                  if (lighting.type === "fluorescent") cbAnex1.push(281);
                  else if (lighting.type === "incandescent") cbAnex1.push(282);
                  else if (lighting.type === "led") cbAnex1.push(283);
                  else cbAnex1.push(284); // Mixt

                  // Stare rețea (CB 285=Bună default)
                  cbAnex1.push(285);

                  // ── REGENERABILE (CB 288+) ──
                  // Panouri termosolare: CB288=Există, CB289=Nu
                  if (solarThermal.enabled) cbAnex1.push(288); else cbAnex1.push(289);
                  // PV: CB290=Există, CB291=Nu există
                  if (photovoltaic.enabled) cbAnex1.push(290); else cbAnex1.push(291);
                  // Pompă căldură: CB292=Există, CB293=Nu
                  if (heatPump.enabled) cbAnex1.push(292); else cbAnex1.push(293);
                  // Tip PC (CB 294-300)
                  if (heatPump.enabled) {
                    const pcCBMap = { "sol_apa_deschisa":294, "sol_apa_inchisa":295, "aer_apa":296, "aer_aer":297, "apa_aer":298, "sol_aer":299 };
                    const pcCB = pcCBMap[heatPump.type];
                    if (pcCB) cbAnex1.push(pcCB);
                  }
                  // Biomasă: CB301=Există, CB302=Nu
                  if (biomass.enabled) cbAnex1.push(301); else cbAnex1.push(302);
                  // Tip biomasă (CB 303-305)
                  if (biomass.enabled) {
                    if (biomass.type === "peleti") cbAnex1.push(303);
                    else if (biomass.type === "brichete") cbAnex1.push(304);
                    else cbAnex1.push(305);
                  }
                  // Eoliană: CB306=Există, CB307=Nu
                  if (otherRenew && otherRenew.windEnabled) cbAnex1.push(306); else cbAnex1.push(307);

                  // ── Aplică toate checkbox-urile dintr-o dată ──
                  checkCBs(cbAnex1);

                  // ══════════════════════════════════════
                  // ANEXA 1 — TEXT: adresa, nr certificat
                  // ══════════════════════════════════════
                  rWTpart("[adresa]", fullAddress);
                  xml = xml.replace(/(<w:t[^>]*>)\.{6,}(<\/w:t>)/g, function(match, p1, p2) {
                    // Golim primele 2 grupuri de puncte (nr certificat)
                    return p1 + " " + p2;
                  });

                  // An construcție/renovare
                  rWTpart(".................","" + yearStr + (building.yearRenov ? " / " + building.yearRenov : ""));

                  // ══════════════════════════════════════
                  // ANEXA 2 — GEOMETRIE + CLIMAT
                  // ══════════════════════════════════════
                  const seV = Vol > 0 ? (parseFloat(building.areaEnvelope) || 0) / Vol : 0;
                  const nrPers = Math.max(1, Math.round(Aref / (isRes ? 30 : 15)));

                  // Regim înălțime — numerele din template: noduri "2 (nr)" și "5 (nr)"
                  const floorCount = parseInt(building.floors?.replace(/[^0-9]/g, "")) || 0;
                  rWT("2\n(nr)", String(building.basement ? 1 : 0));

                  // Arii și volume
                  // Nodurile din Anexa 2 ce conțin "m2" sau "m³" sunt lângă valori
                  // Folosim rWTpart pentru a completa valorile

                  // Arie referință totală pardoseală
                  rWTpart("Aria de referință totală", "Aria de referință totală a pardoselii: " + fmtRo(Aref, 1));
                  // Volumul interior de referință
                  rWTpart("Volumul interior de referință", "Volumul interior de referință V: " + fmtRo(Vol, 1));

                  // Factor formă
                  rWTpart("Factorul de formă", "Factorul de formă al clădirii, SE/V: " + fmtRo(seV, 3));

                  // Număr persoane
                  rWTpart("pers.", fmtRo(nrPers, 0) + " pers.");

                  // ══════════════════════════════════════
                  // ANEXA 2 — TABEL ANVELOPĂ
                  // ══════════════════════════════════════
                  // Template-ul are rânduri fixe: PE 1, PE 2, FE, UE, TE, Sb, CS, ...
                  // Completăm cu valorile calculate per element
                  opaqueElements.forEach(function(el, idx) {
                    const n = idx + 1;
                    const elType = ELEMENT_TYPES.find(function(t){return t.id===el.type;});
                    const rsi = elType ? elType.rsi : 0.13;
                    const rse = elType ? elType.rse : 0.04;
                    const rL = el.layers ? el.layers.reduce(function(s,l){var d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0);},0) : 0;
                    const uCalc = rL > 0 ? 1/(rsi+rL+rse) : 0;
                    const rCalc = uCalc > 0 ? 1/uCalc : 0;
                    const uRefEl = uRef[el.type] || 0;
                    const rRefEl = uRefEl > 0 ? 1/uRefEl : 0;
                    rWT("E" + n + "_den", el.name || "Element " + n);
                    rWT("E" + n + "_tip", elType?.label || el.type);
                    rWT("E" + n + "_sup", fmtRo(el.area || 0, 1));
                    rWT("E" + n + "_U", fmtRo(uCalc, 3));
                    rWT("E" + n + "_R", fmtRo(rCalc, 3));
                    rWT("E" + n + "_Rref", fmtRo(rRefEl, 3));
                    rWT("E" + n + "_ori", el.orientation || "—");
                    if (el.layers && el.layers.length > 0) {
                      const layerStr = el.layers.map(function(l){ return (l.matName||"?") + " " + (l.thickness||0) + "mm, λ=" + (l.lambda||0); }).join("; ");
                      rWT("E" + n + "_str", layerStr);
                    }
                  });

                  // Arie totală anvelopă
                  const seTotal = parseFloat(building.areaEnvelope) || opaqueElements.reduce(function(s,e){ return s + (parseFloat(e.area)||0); }, 0) + glazingElements.reduce(function(s,e){ return s + (parseFloat(e.area)||0); }, 0);
                  rWTpart("Aria totală a anvelopei", "Aria totală a anvelopei, SE: " + fmtRo(seTotal, 1));

                  // Tabel elemente vitrate
                  glazingElements.forEach(function(el, idx) {
                    const n = idx + 1;
                    rWT("V" + n + "_den", el.name || "Vitraj " + n);
                    rWT("V" + n + "_sup", fmtRo(el.area || 0, 1));
                    rWT("V" + n + "_U", fmtRo(el.u || 0, 2));
                    rWT("V" + n + "_g", fmtRo(el.g || 0, 2));
                    rWT("V" + n + "_ori", el.orientation || "—");
                    rWT("V" + n + "_tip", el.glazingType || "—");
                  });

                  // Punți termice sumar
                  const tbTotal = thermalBridges.reduce(function(s,b){ return s + (parseFloat(b.psi)||0) * (parseFloat(b.length)||0); }, 0);
                  rWT("PT_total", fmtRo(tbTotal, 1));
                  rWT("PT_nr", String(thermalBridges.length));

                  // ══════════════════════════════════════
                  // ANEXA 2 — DETALII INSTALAȚII
                  // ══════════════════════════════════════
                  // Încălzire
                  if (hSource) {
                    rWTpart("sursa incalzire", hSource.label);
                    rWTpart("sursa încălzire", hSource.label);
                    rWTpart("randament generare", fmtRo(heating.eta_gen || (hSource.eta_gen || 0), 2));
                    rWTpart("putere nominala", fmtRo(heating.nominalPower || 0, 1));
                    // Combustibil — completăm textul "combustibil ....."
                    const fuelLabel = FUELS.find(function(f){return f.id===heating.fuel;})?.label || "";
                    if (fuelLabel) {
                      rWTpart("combustibil .....................", "combustibil " + fuelLabel);
                      rWTpart("cu combustibil\n", "cu combustibil " + fuelLabel + "\n");
                    }
                    // Putere nominală în kW
                    rWTpart("Necesarul de căldură de calcul", "Necesarul de căldură de calcul (sarcina termică necesară) " + fmtRo(heating.nominalPower || 0, 1));
                    rWTpart("Puterea termică instalată totală pentru încălzire", "Puterea termică instalată totală pentru încălzire " + fmtRo(heating.nominalPower || 0, 1));
                  }

                  // ACM
                  if (acmSrc) {
                    rWTpart("sursa ACM", acmSrc.label);
                    const acmFuel = FUELS.find(function(f){return f.id===acm.fuel;})?.label || "";
                    if (acmFuel) rWTpart("combustibil ...........", "combustibil " + acmFuel);
                  }

                  // Răcire
                  if (hasCool && coolSrc) {
                    rWTpart("Valoarea nominală medie a coeficientului", "Valoarea nominală medie a coeficientului de performanță EER al sursei de răcire: " + fmtRo(cooling.eer || cooling.cop || 3.0, 1));
                  }

                  // Ventilare — eficiență HR
                  if (hasVent) {
                    const hrEta = ventilation.hrEta || (instSummary?.hrEta || 0);
                    rWTpart("Eficiență declarată pe durata verii/iernii", "Eficiență declarată pe durata verii/iernii: " + fmtRo(hrEta * 100, 0) + " / " + fmtRo(hrEta * 100, 0));
                  }

                  // Iluminat — puteri
                  const pNecIlum = Au > 0 && instSummary?.leni ? (instSummary.leni * Au / 8760 || 0) : 0;
                  rWTpart("Puterea electrică totală necesară a sistemului de iluminat", "Puterea electrică totală necesară a sistemului de iluminat: " + fmtRo(pNecIlum, 1));
                  rWTpart("Puterea electrică instalată totală a sistemului de iluminat", "Puterea electrică instalată totală a sistemului de iluminat: " + fmtRo(pNecIlum * 1.2, 1));

                  // ══════════════════════════════════════
                  // ANEXA 2 — SURSE REGENERABILE (detalii text)
                  // ══════════════════════════════════════
                  if (solarThermal.enabled) {
                    const stType = SOLAR_THERMAL_TYPES.find(function(t){return t.id===solarThermal.type;});
                    rWTpart("Tip panou (plan, cu tuburi vidate etc.)", "Tip panou: " + (stType?.label || solarThermal.type || "plan"));
                    rWTpart("Număr panouri\n", "Număr panouri: " + (solarThermal.panels || Math.ceil((parseFloat(solarThermal.area)||4)/2)) + "\n");
                  }
                  if (photovoltaic.enabled) {
                    const pvType = PV_TYPES.find(function(t){return t.id===photovoltaic.type;});
                    rWTpart("Tip panou (\nmonocristalin", "Tip panou: " + (pvType?.label || "monocristalin"));
                    rWTpart("Număr panouri\n", "Număr panouri: " + (photovoltaic.panels || Math.ceil((parseFloat(photovoltaic.kWp)||3)/0.4)) + "\n");
                  }
                  if (heatPump.enabled) {
                    rWTpart("Număr pompe de căldură", "Număr pompe de căldură: 1");
                    rWTpart("Valoarea medie", "Valoarea medie SCOP/SEER: " + fmtRo(heatPump.cop || 3.5, 1));
                  }

                  // Energie exportată
                  const expTh = renewSummary ? (renewSummary.exportedThermal || 0) : 0;
                  const expEl = renewSummary ? (renewSummary.exportedElectric || renewSummary.qPV_kWh || 0) : 0;
                  // Nod "Energia termică exportată:" urmat de un nod cu valoare
                  rWTpart("Energia termică exportată:", "Energia termică exportată: " + fmtRo(expTh, 0));
                  rWTpart("Energia electrică exportată:", "Energia electrică exportată: " + fmtRo(expEl, 0));
                  rWTpart("Energia termică exportată din surse regenerabile", "Energia termică exportată din surse regenerabile: " + fmtRo(expTh, 0));
                  rWTpart("Energia electrică exportată din surse regenerabile", "Energia electrică exportată din surse regenerabile: " + fmtRo(expEl, 0));

                  // ══════════════════════════════════════
                  // ANEXA 2 — INDICATORI + CONSUM DETALIAT
                  // ══════════════════════════════════════
                  // Clasa energetică text
                  rWT("CLASA_EP", enClassDocx.cls);
                  rWT("NOTA_EP", String(enClassDocx.score));

                  // Consum specific pe utilități (Anexa detaliată)
                  if (instSummary) {
                    rWT("qf_inc", fmtRo(Au > 0 ? instSummary.qf_h / Au : 0, 1));
                    rWT("qf_acm", fmtRo(Au > 0 ? instSummary.qf_w / Au : 0, 1));
                    rWT("qf_rac", fmtRo(Au > 0 ? instSummary.qf_c / Au : 0, 1));
                    rWT("qf_ven", fmtRo(Au > 0 ? instSummary.qf_v / Au : 0, 1));
                    rWT("qf_ilu", fmtRo(Au > 0 ? instSummary.qf_l / Au : 0, 1));
                    rWT("ep_inc", fmtRo(Au > 0 ? (instSummary.ep_h||0) / Au : 0, 1));
                    rWT("ep_acm", fmtRo(Au > 0 ? (instSummary.ep_w||0) / Au : 0, 1));
                    rWT("ep_rac", fmtRo(Au > 0 ? (instSummary.ep_c||0) / Au : 0, 1));
                    rWT("ep_ven", fmtRo(Au > 0 ? (instSummary.ep_v||0) / Au : 0, 1));
                    rWT("ep_ilu", fmtRo(Au > 0 ? (instSummary.ep_l||0) / Au : 0, 1));
                    // CO2 per utilitate
                    rWT("co2_inc", fmtRo(Au > 0 ? (instSummary.co2_h_m2||0) : 0, 1));
                    rWT("co2_acm", fmtRo(Au > 0 ? (instSummary.co2_w_m2||0) : 0, 1));
                    rWT("co2_rac", fmtRo(Au > 0 ? (instSummary.co2_c_m2||0) : 0, 1));
                    rWT("co2_ven", fmtRo(Au > 0 ? (instSummary.co2_v_m2||0) : 0, 1));
                    rWT("co2_ilu", fmtRo(Au > 0 ? (instSummary.co2_l_m2||0) : 0, 1));
                  }

                  // Indicatori EPP, RERP, CO2, SRI
                  rWTpart("Indicatorul energiei primare EP", "Indicatorul energiei primare EPP: " + fmtRo(epFinal, 1));
                  rWTpart("Indicele RER", "Indicele RERP: " + fmtRo((renewSummary?.rer || 0), 1));
                  rWTpart("Indicatorul emisiilor de CO", "Indicatorul emisiilor de CO2: " + fmtRo(co2Final_m2, 1));
                  // SRI — Smart Readiness Indicator (simplificat)
                  const sriVal = (heating.control === "pid" || heating.control === "bacs_a") ? 60 : (heating.control === "termostat" ? 30 : 10);
                  rWTpart("Indicele SRI", "Indicele SRI: " + sriVal + "%");

                  // Ore depășire temperatură confort (răcire)
                  if (hasCool) {
                    rWTpart("Timpul dintr-un an în care temperatura interioară depășește", "Timpul dintr-un an: " + (instSummary.overheatingHours || 0));
                    rWTpart("Volumul de referință al zonei climatizate", "Volumul de referință al zonei climatizate: " + fmtRo(Vol, 0));
                  }
                }

                // Foto + scale + repack se fac server-side în Python API

                const filename = mode === "anexa"
                  ? "Anexa_CPE_" + (building.address || "proiect").replace(/[^a-zA-Z0-9]/g,"_").slice(0,40) + "_" + new Date().toISOString().slice(0,10) + ".docx"
                  : "CPE_" + (building.address || "proiect").replace(/[^a-zA-Z0-9]/g,"_").slice(0,40) + "_" + new Date().toISOString().slice(0,10) + ".docx";

                if (download) {
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
                  if (canExportDocx && mode === "cpe") incrementCertCount();
                  showToast("DOCX generat: " + filename, "success");
                }
                return blob;

              } catch (err) {
                console.error("Eroare generare DOCX:", err);
                showToast("Eroare DOCX: " + err.message, "error", 6000);
                return null;
              }
            };


            // ═══════════════════════════════════════════════════════════
            // EXPORT XML MDLPA — Registrul electronic al certificatelor
            // Format conform Ord. MDLPA 16/2023 Anexa 4
            // ═══════════════════════════════════════════════════════════
            const generateXMLMDLPA = () => {
              if (!instSummary) { showToast("Completați pașii 1-4.", "error"); return; }
              // Pricing v6.0 — XML MDLPA disponibil Audit/Pro/Expert/Birou/Enterprise.
              // Free + Edu: BLOCAT (Free are watermark; Edu n-are atestat → fără registru oficial).
              if (!canAccessFn(userPlan, "exportXML")) {
                showToast("Export XML MDLPA disponibil din planul Zephren AE IIci (199 RON/lună).", "error");
                return;
              }
              // Sprint v6.3 — verificare HARD legal pre-export XML (Ord. 348/2026 Art. 6)
              const legalCheckXml = canEmitForBuilding({
                plan: userPlan,
                auditorGrad: building?.auditorGrad || null,
                building,
                operation: "cpe",
              });
              if (!legalCheckXml.ok) {
                showToast(
                  `Export XML blocat legal: ${legalCheckXml.reason} (${legalCheckXml.legalRef})`,
                  "error",
                );
                return;
              }
              const esc = (s) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
              const fmtD = (d) => d ? d.split("-").reverse().join(".") : "";
              const validDate = auditor.date ? fmtD(auditor.date) : new Date().toISOString().slice(0,10).split("-").reverse().join(".");
              // Sprint 15 — valabilitate diferențiată (acum L.372/2005 mod. L.238/2024)
              const expDateObj = getExpiryDate(auditor.date || new Date(), enClass?.cls);
              const expDate = expDateObj ? expDateObj.toISOString().slice(0,10).split("-").reverse().join(".") : "";
              const validityYearsXml = getValidityYears(enClass?.cls);

              // Audit 2 mai 2026 — P1.8: lipsuri XML MDLPA
              // Calculez penalități + SRI pentru includere în XML.
              let penaltiesXml = { summary: { total_pct: 0, count: 0 }, items: [] };
              try {
                penaltiesXml = calcPenalties({
                  envelope: {
                    opaque: opaqueElements?.map((el) => {
                      const r = calcOpaqueR ? calcOpaqueR(el.layers, el.type) : null;
                      return { type: el.type, area: parseFloat(el.area) || 0, u: r?.u || 0 };
                    }) || [],
                    glazing: glazingElements?.map((el) => ({ u: parseFloat(el.u) || 0 })) || [],
                    bridges: thermalBridges?.map((b) => ({
                      psi: parseFloat(b.psi) || 0,
                      length: parseFloat(b.length) || 0,
                      type: b.type || "",
                    })) || [],
                  },
                  instSummary: {
                    heating: { eta_gen: parseFloat(heating?.eta_gen) || 0, eta_dist: parseFloat(heating?.eta_dist) || 0, controls: heating?.control || "" },
                    dhw: { eta_dhw: parseFloat(acm?.eta_dhw ?? acm?.eta_gen) || 0, storage: { volume: parseFloat(acm?.storageVolume) || 0, standing_loss: parseFloat(acm?.standingLoss) || 0 } },
                    lighting: { leni: parseFloat(instSummary?.leni) || 0 },
                    bacs: bacsClass || "D",
                  },
                  ventilation: { type: ventilation?.type || "", hrEfficiency: parseFloat(ventilation?.hrEta) || 0 },
                  building: { category: building.category },
                  renewables: { rer: parseFloat(rer) || 0 },
                });
              } catch { /* penalties opt — XML rămâne valid fără ele */ }

              // SRI auto-mapped (Sprint 28 — calcSRI din epbd.js)
              let sriResult = { sri: 0, grade: "—" };
              try {
                sriResult = calcSRI({
                  building: { category: building.category },
                  heating, cooling, ventilation, lighting, acm,
                  bacsClass: bacsClass || "D",
                });
              } catch { /* SRI opt */ }

              const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<CertificatPerformantaEnergetica xmlns="urn:ro:mdlpa:certificat-performanta-energetica:2023" versiune="1.0">
  <DateIdentificare>
    <CodUnic>${esc(auditor.mdlpaCode)}</CodUnic>
    <CodCPE>${esc(auditor.cpeCode || auditor.mdlpaCode || "")}</CodCPE>
    <DataElaborare>${validDate}</DataElaborare>
    <DataExpirare>${expDate}</DataExpirare>
    <ValabilitateAni>${validityYearsXml}</ValabilitateAni>
    <NormativValabilitate>L.372/2005 republicată mod. L.238/2024 Art. 18</NormativValabilitate>
    <ScopElaborare>${esc(building.scopCpe || "vanzare")}</ScopElaborare>
    <ProgramCalcul>ZEPHREN ${APP_VERSION}</ProgramCalcul>
  </DateIdentificare>
  <Auditor>
    <Nume>${esc(auditor.name)}</Nume>
    <Atestat>${esc(auditor.atestat)}</Atestat>
    <Grad>${esc(auditor.grade)}</Grad>
    <Firma>${esc(auditor.company)}</Firma>
    <Telefon>${esc(auditor.phone)}</Telefon>
    <Email>${esc(auditor.email)}</Email>
  </Auditor>
  <Cladire>
    <Categorie>${esc(building.category)}</Categorie>
    <CategorieLabel>${esc(catLabel)}</CategorieLabel>
    <Adresa>${esc(building.address)}</Adresa>
    <Localitate>${esc(building.city)}</Localitate>
    <Judet>${esc(building.county)}</Judet>
    <CodPostal>${esc(building.postal)}</CodPostal>
    <AnConstructie>${esc(building.yearBuilt)}</AnConstructie>
    <AnRenovare>${esc(building.yearRenov)}</AnRenovare>
    <RegimInaltime>${esc(building.floors)}</RegimInaltime>
    <ArieUtila unit="mp">${Au.toFixed(1)}</ArieUtila>
    <Volum unit="mc">${(parseFloat(building.volume)||0).toFixed(1)}</Volum>
    <ZonaClimatica>${esc(selectedClimate?.zone)}</ZonaClimatica>
    <Localitate_calcul>${esc(selectedClimate?.name)}</Localitate_calcul>
    <n50 unit="1_per_h">${(parseFloat(building.n50)||0).toFixed(2)}</n50>
  </Cladire>
  <Anvelopa>
    <ElementeOpace>${opaqueElements.map(el => {
      const {u} = calcOpaqueR(el.layers, el.type);
      return `\n      <Element tip="${esc(el.type)}" denumire="${esc(el.name)}" aria="${parseFloat(el.area)||0}" U="${u.toFixed(3)}" orientare="${esc(el.orientation)}"/>`;
    }).join("")}
    </ElementeOpace>
    <ElementeVitrate>${glazingElements.map(el =>
      `\n      <Vitraj denumire="${esc(el.name)}" aria="${parseFloat(el.area)||0}" U="${parseFloat(el.u)||0}" g="${parseFloat(el.g)||0}" orientare="${esc(el.orientation)}"/>`
    ).join("")}
    </ElementeVitrate>
    <PuntiTermice>${thermalBridges.map(b =>
      `\n      <Punte denumire="${esc(b.name)}" psi="${parseFloat(b.psi)||0}" lungime="${parseFloat(b.length)||0}"/>`
    ).join("")}
    </PuntiTermice>
    <CoeficientG unit="W_per_m3K">${(envelopeSummary?.G||0).toFixed(3)}</CoeficientG>
  </Anvelopa>
  <Instalatii>
    <Incalzire sursa="${esc(heating.source)}" combustibil="${esc(instSummary.fuel?.id)}" eta_gen="${parseFloat(heating.eta_gen)||0}"/>
    <ACM sursa="${esc(acm.source)}"/>
    <Racire activ="${instSummary.hasCool}" EER="${parseFloat(cooling.eer)||0}"/>
    <Ventilare tip="${esc(ventilation.type)}" recuperare="${instSummary.hrEta||0}"/>
    <BACS clasa="${esc(bacsClass || "D")}"/>
    <SRI total="${parseFloat(sriResult.sri||0).toFixed(0)}" grad="${esc(sriResult.grade || "—")}"/>
  </Instalatii>
  <RezultateEnergetice>
    <EnergiePrimaraSpecifica unit="kWh_per_mp_an">${epFinal.toFixed(1)}</EnergiePrimaraSpecifica>
    <ClasaEnergetica>${enClass.cls}</ClasaEnergetica>
    <NotaEnergetica>${enClass.score}</NotaEnergetica>
    <EmisiiCO2Specifice unit="kgCO2_per_mp_an">${co2Final.toFixed(1)}</EmisiiCO2Specifice>
    <ClasaCO2>${co2Class.cls}</ClasaCO2>
    <RER unit="procent">${rer.toFixed(1)}</RER>
    <ConsumFinal>
      <Incalzire unit="kWh_an">${(instSummary.qf_h||0).toFixed(0)}</Incalzire>
      <ACM unit="kWh_an">${(instSummary.qf_w||0).toFixed(0)}</ACM>
      <Racire unit="kWh_an">${(instSummary.qf_c||0).toFixed(0)}</Racire>
      <Ventilare unit="kWh_an">${(instSummary.qf_v||0).toFixed(0)}</Ventilare>
      <Iluminat unit="kWh_an">${(instSummary.qf_l||0).toFixed(0)}</Iluminat>
      <Total unit="kWh_an">${(instSummary.qf_total||0).toFixed(0)}</Total>
    </ConsumFinal>
    <nZEB indeplineste="${epFinal <= (getNzebEpMax(building.category, selectedClimate?.zone)||999) && rer >= (NZEB_THRESHOLDS[building.category]?.rer_min||30)}"/>
  </RezultateEnergetice>
  <Penalizari total_pct="${(parseFloat(penaltiesXml.summary?.total_pct)||0).toFixed(1)}" numar="${penaltiesXml.summary?.count||0}">${
    (penaltiesXml.items || []).filter(p => p.applied).map(p =>
      `\n    <Penalizare cod="${esc(p.code)}" delta_ep_pct="${(parseFloat(p.delta_EP_pct)||0).toFixed(2)}" motiv="${esc(p.reason || p.label || "")}"/>`
    ).join("")
  }
  </Penalizari>
</CertificatPerformantaEnergetica>`;

              const blob = new Blob([xmlContent], {type: "application/xml;charset=utf-8"});
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "CPE_XML_" + (auditor.mdlpaCode || building.address || "export").replace(/[^a-zA-Z0-9]/g,"_").slice(0,30) + ".xml";
              document.body.appendChild(a); a.click();
              setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
              showToast("XML MDLPA exportat cu succes", "success");
            };

            const generatePDF = (showOverlay = true) => {
              try {
              showToast("Generare CPE...", "info", 2000);
              // Build HTML string, then show in inline iframe via srcdoc
              const isEN = lang === "EN";
              // Audit 2 mai 2026 — P1.4: motor unificat recomandări
              // (eliminat motor inline divergent față de CpeAnexa.jsx)
              const unifiedRecs = generateCpeRecommendations({
                building, envelopeSummary, opaqueElements, glazingElements,
                thermalBridges, heating, acm, cooling, ventilation, lighting,
                solarThermal, photovoltaic,
                instSummary, renewSummary,
                rer: renewSummary?.rer,
                calcOpaqueR,
                financialAnalysis,
              });
              const T = {
                title: isEN ? "Energy Performance Certificate" : "Certificat de Performan\u021b\u0103 Energetic\u0103",
                subtitle: isEN ? "of the building / building unit" : "a cl\u0103dirii / unit\u0103\u021bii de cl\u0103dire",
                ministry: isEN ? "ROMANIA \u2022 Ministry of Development, Public Works and Administration" : "ROM\u00c2NIA \u2022 Ministerul Dezvolt\u0103rii, Lucr\u0103rilor Publice \u0219i Administra\u021biei",
                s1: isEN ? "I. CPE IDENTIFICATION & ENERGY AUDITOR" : "I. IDENTIFICARE CPE \u0218I AUDITOR ENERGETIC",
                s2: isEN ? "II. CERTIFIED BUILDING" : "II. CL\u0102DIREA CERTIFICAT\u0102",
                s3ep: isEN ? "III. CALCULATED ENERGY PERFORMANCE" : "III. PERFORMAN\u021aA ENERGETIC\u0102",
                s3co2: isEN ? "CO\u2082 EMISSIONS" : "EMISII CO\u2082",
                s5: isEN ? "V. RENEWABLE ENERGY SOURCES (RES) & nZEB STATUS" : "V. SURSE REGENERABILE DE ENERGIE (SRE) \u0218I STATUT nZEB",
                cpeNr: isEN ? "CPE No.:" : "Nr. CPE:",
                codMdlpa: isEN ? "MDLPA Code:" : "Cod MDLPA:",
                valid: isEN ? "Valid:" : "Valabil:",
                auditor: isEN ? "Auditor:" : "Auditor:",
                cert: isEN ? "Certificate:" : "Atestat:",
                company: isEN ? "Company:" : "Firma:",
                tel: isEN ? "Phone:" : "Tel:",
                email: isEN ? "Email:" : "Email:",
                date: isEN ? "Date:" : "Data:",
                category: isEN ? "Category:" : "Categorie:",
                yrBuilt: isEN ? "Year built:" : "An constr.:",
                yrRenov: isEN ? "Year renov.:" : "An renov.:",
                address: isEN ? "Address:" : "Adresa:",
                height: isEN ? "Height reg.:" : "Regim H:",
                program: isEN ? "Software:" : "Program:",
                perfHigh: isEN ? "\u25B2 High performance" : "\u25B2 Performan\u021b\u0103 ridicat\u0103",
                perfLow: isEN ? "\u25BC Low performance" : "\u25BC Performan\u021b\u0103 sc\u0103zut\u0103",
                pollLow: isEN ? "\u25B2 Low pollution" : "\u25B2 Poluare sc\u0103zut\u0103",
                pollHigh: isEN ? "\u25BC High pollution" : "\u25BC Poluare ridicat\u0103",
                thisBuilding: isEN ? "THIS BUILDING:" : "ACEAST\u0102 CL\u0102DIRE:",
                refBuilding: isEN ? "REF. BUILDING:" : "CL. REFERIN\u021a\u0102:",
                utility: isEN ? "Utility" : "Utilitate",
                system: isEN ? "System" : "Sistem",
                finalEn: isEN ? "Final energy" : "Energie final\u0103",
                primaryEn: isEN ? "Primary energy" : "Energie primar\u0103",
                co2em: isEN ? "CO\u2082 emissions" : "Emisii CO\u2082",
                clsEp: isEN ? "Cls. Ep" : "Cls. Ep",
                total: isEN ? "TOTAL" : "TOTAL",
                heating: isEN ? "Heating" : "\u00CEnc\u0103lzire",
                dhw: isEN ? "DHW" : "Ap\u0103 cald\u0103 consum",
                cooling: isEN ? "Cooling" : "R\u0103cire",
                ventilation: isEN ? "Mech. ventilation" : "Ventilare mec.",
                lighting: isEN ? "Lighting" : "Iluminat",
                solarTh: isEN ? "Solar thermal" : "Solar termic",
                heatPumps: isEN ? "Heat pumps" : "Pompe c\u0103ld.",
                solarPV: isEN ? "Solar PV" : "Solar PV",
                biomass: isEN ? "Biomass" : "Biomas\u0103",
                otherRes: isEN ? "Other RES" : "Alte SRE",
                totalRes: isEN ? "Total RES" : "Total SRE",
                nzebYes: isEN ? "Building MEETS nZEB requirements" : "Cl\u0103direa \u00eendepline\u0219te cerin\u021bele nZEB",
                nzebNo: isEN ? "Building DOES NOT meet nZEB requirements" : "Cl\u0103direa NU \u00eendepline\u0219te cerin\u021bele nZEB",
                signature: isEN ? "Signature/stamp" : "Semn\u0103tura/\u0219tampila",
                cpeCode: isEN ? "CPE UNIQUE IDENTIFICATION CODE" : "COD UNIC DE IDENTIFICARE CPE",
                p2title: isEN ? "CPE \u2013 Technical details" : "CPE \u2013 Detalii tehnice",
                envTitle: isEN ? "A. BUILDING THERMAL ENVELOPE" : "A. ANVELOPA TERMIC\u0102 A CL\u0102DIRII",
                opaqueEl: isEN ? "A.1 Opaque elements" : "A.1 Elemente opace",
                glazEl: isEN ? "A.2 Glazing elements" : "A.2 Elemente vitrate",
                bridges: isEN ? "A.3 Thermal bridges & global indicators" : "A.3 Pun\u021bi termice \u0219i indicatori globali",
                instTitle: isEN ? "B. BUILDING SYSTEMS" : "B. SISTEME DE INSTALA\u021aII",
                balTitle: isEN ? "C. ENERGY BALANCE PER UTILITY" : "C. BILAN\u021a ENERGETIC PE UTILIT\u0102\u021aI",
                p3title: isEN ? "CPE \u2013 Rehabilitation recommendations" : "CPE \u2013 Recomand\u0103ri de reabilitare energetic\u0103",
                recTitle: isEN ? "D. ENERGY REHABILITATION RECOMMENDATIONS" : "D. RECOMAND\u0102RI PENTRU REABILITAREA / MODERNIZAREA ENERGETIC\u0102",
                obsTitle: isEN ? "E. AUDITOR OBSERVATIONS" : "E. OBSERVA\u021aII ALE AUDITORULUI",
                measure: isEN ? "Proposed measure" : "M\u0103sura propus\u0103",
                domain: isEN ? "Domain" : "Domeniu",
                savings: isEN ? "Estimated savings" : "Economie estimat\u0103",
                priority: isEN ? "Priority" : "Prioritate",
                envelope: isEN ? "Envelope" : "Anvelop\u0103",
                systems: isEN ? "Systems" : "Instala\u021bii",
                high: isEN ? "HIGH" : "RIDICAT\u0102",
                medium: isEN ? "MEDIUM" : "MEDIE",
                auditorSig: isEN ? "Auditor signature" : "Semn\u0103tura auditor",
                benefSig: isEN ? "Beneficiary signature" : "Semn\u0103tura beneficiar",
                back: isEN ? "Back" : "\u00cenapoi",
                photo: isEN ? "BUILDING PHOTO" : "FOTO CL\u0102DIRE",
                name: isEN ? "Name" : "Denumire",
                type: isEN ? "Type" : "Tip",
                area: isEN ? "Area" : "Aria",
                fuel: isEN ? "Fuel" : "Combustibil",
                efficiency: isEN ? "Efficiency / COP" : "Randament / COP",
              };

              // Per-utility specific values
              const getUtilClass = (epVal) => {
                if (!grid) return "\u2014";
                const t = grid.thresholds;
                for (let i = 0; i < t.length; i++) { if (epVal <= t[i]) return CLASS_LABELS[i]; }
                return CLASS_LABELS[CLASS_LABELS.length - 1];
              };

              const ep_h_m2 = Au > 0 ? (instSummary?.ep_h || 0) / Au : 0;
              const ep_w_m2 = Au > 0 ? (instSummary?.ep_w || 0) / Au : 0;
              const ep_c_m2 = Au > 0 ? (instSummary?.ep_c || 0) / Au : 0;
              const ep_v_m2 = Au > 0 ? (instSummary?.ep_v || 0) / Au : 0;
              const ep_l_m2 = Au > 0 ? (instSummary?.ep_l || 0) / Au : 0;

              const qf_h_m2 = Au > 0 ? (instSummary?.qf_h || 0) / Au : 0;
              const qf_w_m2 = Au > 0 ? (instSummary?.qf_w || 0) / Au : 0;
              const qf_c_m2 = Au > 0 ? (instSummary?.qf_c || 0) / Au : 0;
              const qf_v_m2 = Au > 0 ? (instSummary?.qf_v || 0) / Au : 0;
              const qf_l_m2 = Au > 0 ? (instSummary?.qf_l || 0) / Au : 0;

              const co2_h_m2 = Au > 0 ? (instSummary?.co2_h || 0) / Au : 0;
              const co2_w_m2 = Au > 0 ? (instSummary?.co2_w || 0) / Au : 0;
              const co2_c_m2 = Au > 0 ? (instSummary?.co2_c || 0) / Au : 0;
              const co2_v_m2 = Au > 0 ? (instSummary?.co2_v || 0) / Au : 0;
              const co2_l_m2 = Au > 0 ? (instSummary?.co2_l || 0) / Au : 0;

              const qf_total_m2 = qf_h_m2 + qf_w_m2 + qf_c_m2 + qf_v_m2 + qf_l_m2;
              const ep_sum_m2 = ep_h_m2 + ep_w_m2 + ep_c_m2 + ep_v_m2 + ep_l_m2;
              const co2_sum_m2 = co2_h_m2 + co2_w_m2 + co2_c_m2 + co2_v_m2 + co2_l_m2;

              const utilClassH = getUtilClass(ep_h_m2);
              const utilClassW = getUtilClass(ep_w_m2);
              const utilClassC = getUtilClass(ep_c_m2);
              const utilClassV = getUtilClass(ep_v_m2);
              const utilClassL = getUtilClass(ep_l_m2);

              // SRE
              const sre_solar_th = renewSummary ? (Au > 0 ? renewSummary.qSolarTh / Au : 0) : 0;
              const sre_pv = renewSummary ? (Au > 0 ? renewSummary.qPV_kWh / Au : 0) : 0;
              const sre_pc = renewSummary ? (Au > 0 ? renewSummary.qPC_ren / Au : 0) : 0;
              const sre_bio = renewSummary ? (Au > 0 ? renewSummary.qBio_ren / Au : 0) : 0;
              const sre_total = Au > 0 && renewSummary ? renewSummary.totalRenewable / Au : 0;

              // Scale — culori MDLPA standard (aceeași schemă verde→roșu pentru EP și CO₂)
              const scaleColors    = ["#009B00","#32C831","#00FF00","#FFFF00","#F39C00","#FF6400","#FE4101","#FE0000"];
              const co2ScaleColors = scaleColors; // același standard de culori — clasă C = galben indiferent de indicator
              // Clasele clădirii de referință (nZEB EP max)
              const enRefClass = getEnergyClass(epRefMax, catKey);
              const co2RefFinal = (epFinal > 0) ? co2Final * epRefMax / epFinal : co2Final;
              const co2RefClass = getCO2Class(co2RefFinal, baseCatResolved);
              const scaleLabels = CLASS_LABELS;
              const co2Thresholds = (CO2_CLASSES_DB[baseCatResolved] || CO2_CLASSES_DB[building.category] || CO2_CLASSES_DB.AL).thresholds;
              // Culori text fixe per clasă (conform specificației MDLPA): A+=alb, A=alb, B-F=negru, G=alb
              const SCALE_TEXT_COLORS = ["#fff","#fff","#000","#000","#000","#000","#000","#fff"];

              // Systems
              const heatSrc = HEAT_SOURCES.find(s => s.id === heating.source);
              const heatDesc = heatSrc ? heatSrc.label : "\u2014";
              const heatFuel = instSummary?.fuel?.label || "Gaz natural";
              const acmSrc = ACM_SOURCES.find(s => s.id === acm.source);
              const acmDesc = acmSrc ? acmSrc.label : "\u2014";
              const coolSys = COOLING_SYSTEMS.find(s => s.id === cooling.system);
              const coolDesc = cooling.hasCooling && coolSys ? coolSys.label : "Nu este cazul";
              const ventTypeObj = VENTILATION_TYPES.find(t => t.id === ventilation.type);
              const ventDesc = ventTypeObj?.label || "Natural\u0103";
              const lightDesc = LIGHTING_TYPES.find(t => t.id === lighting.type)?.label || "\u2014";

              // nZEB
              const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
              const nzebOk = rer >= nzeb.rer_min && epFinal < getNzebEpMax(building.category, selectedClimate?.zone);
              const nzebLabel = nzebOk ? "DA" : "NU";

              // Dates — Sprint 15 — EPBD 2024 Art. 17 diferențiere 10/5 ani
              // Audit 2 mai 2026 — P2.8: format dată per limbă în preview HTML
              // (DOCX server-side rămâne RO indiferent — Ord. MDLPA 16/2023 dd.mm.yyyy).
              const validDate = new Date(auditor.date);
              const expiryDate = getExpiryDate(auditor.date, enClass?.cls) || new Date(validDate);
              const expiryStr = fmtDate(expiryDate, lang);
              const dateNow = fmtDate(new Date(), lang);
              const validYearsPreview = getValidityYears(enClass?.cls);

              // Envelope
              const envG = envelopeSummary?.G?.toFixed(3) || "\u2014";
              const envBridgeLoss = envelopeSummary?.bridgeLoss?.toFixed(1) || "0.0";
              const envTotalArea = envelopeSummary?.totalArea?.toFixed(1) || "\u2014";

              const envRows = opaqueElements.map(el => {
                const elType = ELEMENT_TYPES?.find(t => t.id === el.type);
                const typeName = elType?.label || el.type;
                const area = parseFloat(el.area) || 0;
                const rCalc = calcOpaqueR ? calcOpaqueR(el.layers, el.type) : {u:0, r_total:0};
                return { name: el.name || typeName, type: typeName, area: area.toFixed(1), u: rCalc.u.toFixed(3), r: rCalc.r_total.toFixed(3) };
              });
              const glazRows = glazingElements.map(el => {
                return { name: el.name || "Fereastr\u0103", area: (parseFloat(el.area)||0).toFixed(1), u: (parseFloat(el.u)||0).toFixed(2), g: (parseFloat(el.g)||0).toFixed(2) };
              });

              // Utility data for 15-col table
              const utilData = [
                { label: T.heating, sys: heatDesc, qf: qf_h_m2, ep: ep_h_m2, co2: co2_h_m2, cls: utilClassH },
                { label: T.dhw, sys: acmDesc, qf: qf_w_m2, ep: ep_w_m2, co2: co2_w_m2, cls: utilClassW },
                { label: T.cooling, sys: coolDesc, qf: qf_c_m2, ep: ep_c_m2, co2: co2_c_m2, cls: utilClassC },
                { label: T.ventilation, sys: ventDesc, qf: qf_v_m2, ep: ep_v_m2, co2: co2_v_m2, cls: utilClassV },
                { label: T.lighting, sys: lightDesc, qf: qf_l_m2, ep: ep_l_m2, co2: co2_l_m2, cls: utilClassL },
              ];

              // === BUILD HTML ===
              const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=0.5, maximum-scale=2">
<title>CPE - ${building.address || "Cl\u0103dire"}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:9pt;color:#000;background:#fff;-webkit-text-size-adjust:100%}
@media print{@page{size:A4 portrait;margin:8mm 10mm} .page-break{page-break-before:always} body{padding:0} .no-print{display:none!important} table.d tr,table.u tr,table.c tr{page-break-inside:avoid} table.d,table.u,table.c{page-break-inside:auto}}
@media screen{body{padding:8mm 12mm;max-width:210mm;margin:0 auto} .page-break{margin-top:20px;padding-top:15px;border-top:2px dashed #ccc}}
@media screen and (max-width:600px){
  body{padding:3mm 2mm;font-size:7pt;max-width:100%;overflow-x:auto}
  .hdr h1{font-size:10pt!important;letter-spacing:0}
  .hdr .flag{font-size:5.5pt}
  table.c td,table.c th{padding:1px 2px;font-size:6.5pt}
  table.u td,table.u th{padding:1px 1px;font-size:5.5pt}
  table.u .uh{font-size:5pt}
  table.u .us{font-size:5pt}
  table.d td,table.d th{padding:1px 2px;font-size:6.5pt}
  .S{font-size:7pt;padding:2px}
  .V{font-size:7.5pt}
  .Vs{font-size:6.5pt}
  .L{font-size:6pt;padding:1px 2px}
  .br td{height:13px;font-size:6pt}
  .bl{padding:1px 3px!important;font-size:6.5pt}
  .brng{font-size:5.5pt}
  .bm{font-size:7pt;right:-10px}
  .stmp{min-height:30px}
  .nz{font-size:6pt;padding:1px 4px}
}
.hdr{text-align:center;margin-bottom:5px;padding-bottom:3px;border-bottom:2.5px solid #003366}
.hdr .flag{font-size:6.5pt;color:#003366;letter-spacing:1px;text-transform:uppercase;margin-bottom:1px}
.hdr h1{font-size:13pt;font-weight:bold;text-transform:uppercase;color:#003366;letter-spacing:1px;margin:0}
.hdr .sub{font-size:7.5pt;color:#555}
.hdr .ref{font-size:6.5pt;color:#999}
table.c{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:3px}
table.c td,table.c th{border:1px solid #444;padding:2px 4px;font-size:7.5pt;vertical-align:middle}
.S{background:#003366;color:#fff;font-weight:bold;font-size:8.5pt;text-align:center;padding:3px;letter-spacing:0.3px}
.S2{background:#e8edf5;font-weight:bold;font-size:7.5pt;padding:2px 4px}
.S3{background:#f0f4fa;font-size:7pt;text-align:center;font-weight:bold}
.V{text-align:center;font-weight:bold;font-size:9pt}
.Vs{text-align:center;font-weight:bold;font-size:7.5pt}
.L{font-size:7pt;padding:2px 4px}
.Ls{font-size:6.5pt;padding:1px 3px}
/* Scale bars */
.br td{padding:0;height:16px;font-size:7.5pt}
.bl{color:#fff;font-weight:bold;padding:1px 5px !important;text-align:left;letter-spacing:0.5px}
.brng{font-size:6.5pt;padding:1px 3px !important;color:#444}
.ba{outline:2.5px solid #000;outline-offset:-1px;position:relative}
.bm{position:absolute;right:-14px;top:50%;transform:translateY(-50%);color:inherit;font-size:10pt;font-weight:bold}
/* Utility table */
table.u{width:100%;border-collapse:collapse;margin-bottom:3px}
table.u td,table.u th{border:1px solid #444;padding:1px 3px;font-size:7pt;text-align:center;vertical-align:middle}
table.u .uh{background:#003366;color:#fff;font-weight:bold;font-size:6.5pt;padding:2px}
table.u .us{background:#e0e8f0;font-weight:bold;font-size:6.5pt}
table.u .un{text-align:left;padding-left:3px;font-size:7pt}
table.u .uy{font-size:6pt;color:#555;font-style:italic}
table.u .uc{font-weight:bold;font-size:7.5pt;color:#fff;padding:1px}
table.u .ut td{background:#f0f4fa;font-weight:bold;font-size:7.5pt}
/* Detail tables */
table.d{width:100%;border-collapse:collapse;margin-bottom:5px}
table.d td,table.d th{border:1px solid #555;padding:2px 4px;font-size:7.5pt;vertical-align:top}
table.d .dh{background:#003366;color:#fff;font-weight:bold;font-size:8pt;text-align:center;padding:3px}
table.d .ds{background:#e8edf5;font-weight:bold;font-size:7.5pt}
table.d .dv{text-align:center;font-weight:bold;font-size:7.5pt}
/* nZEB */
.nz{display:inline-block;padding:1px 6px;border-radius:2px;font-weight:bold;font-size:7.5pt;letter-spacing:0.3px}
.nz-ok{background:#00642d;color:#fff}
.nz-no{background:#d42517;color:#fff}
/* Misc */
.stmp{border:1px dashed #999;min-height:45px;text-align:center;font-size:6pt;color:#999;padding:4px;vertical-align:middle}
.bcd{text-align:center;font-size:6.5pt;color:#555;padding:5px;border:1px solid #bbb;margin-top:3px;background:#fafafa}
.ft{font-size:6pt;color:#999;text-align:center;margin-top:4px;padding-top:2px;border-top:1px solid #ddd}
/* Back button for mobile */
.back-btn{display:none;position:fixed;top:8px;right:8px;z-index:100;background:#003366;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:10pt;cursor:pointer;font-family:sans-serif}
@media screen and (max-width:600px){.back-btn{display:block}}
</style>
</head><body>
<button class="back-btn no-print" onclick="window.history.back()">&#x2190; ${T.back}</button>
${hasWatermark ? '<div style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;display:flex;align-items:center;justify-content:center;opacity:0.07"><div style="transform:rotate(-35deg);font-size:80pt;font-weight:900;color:#003366;white-space:nowrap;font-family:sans-serif;letter-spacing:10px">' + watermarkText + '</div></div>' : ''}

<!-- ======== PAGINA 1 ======== -->
<div class="hdr">
  <div class="flag">${T.ministry}</div>
  <h1>${T.title}</h1>
  <div class="sub">${T.subtitle}</div>
  <div class="ref">Legea 372/2005 (modif. L.238/2024), Mc 001-2022 (Ord. MDLPA 16/2023)</div>
</div>

<!-- TABLE 1: IDENTIFICARE CPE ȘI AUDITOR -->
<table class="c">
<tr><td colspan="20" class="S" style="background:#E7E6E6">DATE PRIVIND IDENTIFICAREA CPE \u0218I A AUDITORULUI ENERGETIC</td></tr>
<tr>
  <td colspan="4" class="L"><strong>CPE num\u0103rul</strong></td>
  <td colspan="4" class="Vs" style="font-size:7pt;letter-spacing:1.5px">${auditor.mdlpaCode || ".................."}</td>
  <td colspan="2" class="L" style="text-align:right"><strong>valabil ${validYearsPreview} ani</strong><br><span style="font-size:5pt;color:#888">L.372/2005 mod. L.238/2024 · clasa ${enClass?.cls || "—"}</span></td>
  <td colspan="5" class="L"><strong>Nume &amp; prenume auditor energetic</strong></td>
  <td colspan="5" class="L">${auditor.name || "________________"}</td>
</tr>
<tr>
  <td colspan="4" class="L" style="font-size:6.5pt;color:#666">Cod \u00eenregistrare MDLPA</td>
  <td colspan="4" class="Vs" style="font-size:6.5pt;letter-spacing:2px">${auditor.mdlpaCode || "\u2014"}</td>
  <td colspan="2" class="L"></td>
  <td colspan="5" class="L"><strong>Certificat atestare:</strong> ${auditor.atestat || "XX/XXXXX"}</td>
  <td colspan="2" class="L"><strong>gradul</strong></td>
  <td colspan="3" class="Vs"><strong>${auditor.grade || "AE Ici / AE IIci"}</strong></td>
</tr>
</table>

<!-- TABLE 2: DATE PRIVIND CLĂDIREA/APARTAMENTUL -->
<table class="c">
<tr><td colspan="20" class="S" style="background:#E7E6E6">DATE PRIVIND ${ building.category === "AP" ? "APARTAMENTUL CERTIFICAT" : "CL\u0102DIREA CERTIFICAT\u0102" }</td></tr>
<tr>
  <td colspan="7" class="L"><strong>Categoria cl\u0103dirii:</strong> ${catLabel}</td>
  <td colspan="4" class="L"><strong>Anul construirii:</strong> ${building.yearBuilt || "AAAA"}</td>
  <td colspan="3" class="L"><strong>Renov.:</strong> ${building.yearRenov || "\u2014"}</td>
  <td colspan="6" rowspan="5" class="stmp" style="padding:2px;vertical-align:middle;text-align:center">${auditor.photo ? '<img src="' + auditor.photo + '" style="max-width:100%;max-height:100px;object-fit:contain;display:inline-block;" />' : '<div style="font-size:7pt;color:#999;text-align:center;width:100%">' + T.photo + '</div>'}</td>
</tr>
<tr>
  <td colspan="14" class="L"><strong>Adresa cl\u0103dirii:</strong> ${building.address || "\u2014"}, ${building.city || "\u2014"}, jud. ${building.county || "\u2014"}</td>
</tr>
<tr>
  <td colspan="8" class="L">${building.address ? '' : '.....................................'}</td>
  <td colspan="3" class="L"><strong>Aria de referin\u021b\u0103:</strong></td>
  <td colspan="2" class="V">${Au.toFixed(1)}</td>
  <td colspan="1" class="L">m\u00b2</td>
</tr>
<tr>
  <td colspan="8" class="L"><strong>Coordonate GPS:</strong> ${(selectedClimate?.lat || 0).toFixed(4)} x ${(selectedClimate ? ({"Bucure\u0219ti":26.10,"Cluj-Napoca":23.60,"Constan\u021ba":28.65,"Timi\u0219oara":21.23,"Ia\u0219i":27.59,"Bra\u0219ov":25.59}[selectedClimate.name] || 25.0) : 0).toFixed(4)}</td>
  <td colspan="3" class="L"><strong>Aria util\u0103:</strong></td>
  <td colspan="2" class="V">${Au.toFixed(1)}</td>
  <td colspan="1" class="L">m\u00b2</td>
</tr>
<tr>
  <td colspan="8" class="L"><strong>Regim de \u00een\u0103l\u021bime:</strong> ${building.floors || "\u2014"}</td>
  <td colspan="3" class="L"><strong>Volumul interior:</strong></td>
  <td colspan="2" class="V">${building.volume || "\u2014"}</td>
  <td colspan="1" class="L">m\u00b3</td>
</tr>
</table>

<!-- TABLE 3: SCOP ȘI PROGRAM -->
<table class="c">
<tr>
  <td colspan="5" class="L" style="background:#E7E6E6"><strong>Scopul elabor\u0103rii CPE:</strong></td>
  <td colspan="8" class="L">${({"vanzare":"V\u00e2nzare","inchiriere":"\u00cenchiriere","receptie":"Recep\u021bie cl\u0103dire nou\u0103","informare":"Informare proprietar","renovare":"Renovare major\u0103","renovare_majora":"Renovare major\u0103","alt":"Alt scop"})[building.scopCpe] || "V\u00e2nzare"}</td>
  <td colspan="7" class="L"><strong>Program de calcul:</strong> Zephren ${APP_VERSION}</td>
</tr>
</table>

<!-- TABLE 4: SCALA ENERGETICĂ A+ → G (DUAL: EP + CO₂) -->
<table class="c">
<tr>
  <td colspan="13" class="S" style="font-size:8pt;background:#E7E6E6">PERFORMAN\u021aA ENERGETIC\u0102 CALCULAT\u0102<br><span style="font-size:6pt;font-weight:normal">[kWh/m\u00b2,an]</span></td>
  <td colspan="7" class="S" style="font-size:8pt;background:#E7E6E6">EMISII CO\u2082<br><span style="font-size:6pt;font-weight:normal">[kgCO\u2082/m\u00b2,an]</span></td>
</tr>
<tr>
  <td colspan="13" style="text-align:center;font-size:6pt;color:#009B00;padding:1px;font-weight:bold">Performan\u021b\u0103 energetic\u0103 ridicat\u0103</td>
  <td colspan="7" style="text-align:center;font-size:6pt;color:#0000FE;padding:1px;font-weight:bold">Nivel de poluare sc\u0103zut</td>
</tr>
${scaleLabels.map((cls, idx) => {
  const t = grid?.thresholds || [];
  const rangeStr = idx === 0 ? ("\u2264 " + (t[0]||"")) : idx < t.length ? ((t[idx-1]||"") + " \u2013 " + (t[idx]||"")) : ("> " + (t[t.length-1]||""));
  const ct = co2Thresholds;
  const co2Str = idx === 0 ? ("\u2264 " + (ct[0]||"")) : idx < ct.length ? ((ct[idx-1]||"") + " \u2013 " + (ct[idx]||"")) : ("> " + (ct[ct.length-1]||""));
  const isEp = idx === enClass.idx;
  const isEpRef = idx === enRefClass.idx;
  const isCO2 = idx === co2Class.idx;
  const isCO2Ref = idx === co2RefClass.idx;
  const bg = scaleColors[idx];
  const co2bg = co2ScaleColors[idx];
  const bw = 9 - idx;
  const rw = 13 - bw;
  const cw = Math.max(2, 5 - Math.floor(idx*0.5));
  const crw = 7 - cw;
  return '<tr class="br">' +
    '<td colspan="' + bw + '" class="bl' + (isEp?' ba':'') + '" style="background:' + bg + ';color:' + SCALE_TEXT_COLORS[idx] + '">' + cls + (isEp?'<span class="bm">\u25C0</span>':'') + '</td>' +
    '<td colspan="' + rw + '" class="brng" style="border-left:none">' + rangeStr +
      (isEp?' <strong style="color:' + bg + '">\u25C0 ' + T.thisBuilding + ' ' + epFinal.toFixed(1) + ' kWh/m\u00b2,an</strong>':'') +
      (isEpRef && !isEp?' <span style="color:' + bg + '">&#9668; ' + T.refBuilding + ' ' + epRefMax.toFixed(1) + ' kWh/m\u00b2,an</span>':'') +
      (isEpRef && isEp?' <span style="color:' + bg + '"> | &#9668; ' + T.refBuilding + ' ' + epRefMax.toFixed(1) + '</span>':'') +
    '</td>' +
    '<td colspan="' + cw + '" class="bl' + (isCO2?' ba':'') + '" style="background:' + co2bg + ';color:' + SCALE_TEXT_COLORS[idx] + '">' + cls + (isCO2?'<span class="bm">\u25C0</span>':'') + '</td>' +
    '<td colspan="' + crw + '" class="brng" style="border-left:none">' + co2Str +
      (isCO2?' <strong style="color:' + co2bg + '">\u25C0 ' + T.thisBuilding + ' ' + co2Final.toFixed(1) + ' kgCO\u2082/m\u00b2</strong>':'') +
      (isCO2Ref && !isCO2?' <span style="color:' + co2bg + '">&#9668; ' + T.refBuilding + ' ' + co2RefFinal.toFixed(1) + '</span>':'') +
      (isCO2Ref && isCO2?' <span style="color:' + co2bg + '"> | &#9668; ' + T.refBuilding + ' ' + co2RefFinal.toFixed(1) + '</span>':'') +
    '</td>' +
  '</tr>';
}).join("")}
<tr>
  <td colspan="13" style="text-align:center;font-size:6pt;color:#FE0000;padding:1px;font-weight:bold">Performan\u021b\u0103 energetic\u0103 sc\u0103zut\u0103</td>
  <td colspan="7" style="text-align:center;font-size:6pt;color:#333333;padding:1px;font-weight:bold">Nivel de poluare ridicat</td>
</tr>
<tr>
  <td colspan="6" class="L" style="font-size:7pt"><strong>Consum specific anual [kWh/m\u00b2,an]:</strong></td>
  <td colspan="3" class="V" style="font-size:7pt"><strong>final\u0103:</strong> ${qf_total_m2.toFixed(1)}</td>
  <td colspan="4" class="V" style="font-size:7pt"><strong>primar\u0103:</strong> ${epFinal.toFixed(1)}</td>
  <td colspan="3" class="L" style="font-size:7pt"><strong>CO\u2082:</strong></td>
  <td colspan="4" class="V" style="font-size:7pt">${co2Final.toFixed(1)} kgCO\u2082/m\u00b2,an</td>
</tr>
</table>

<!-- TABLE 5: SURSE REGENERABILE -->
<table class="c" style="margin-top:2px">
<tr>
  <td colspan="2" class="S3" style="background:#E7E6E6;font-size:6.5pt"><strong>Consum specific anual din surse regenerabile</strong></td>
  <td colspan="3" class="S3">${T.solarTh}</td>
  <td colspan="3" class="S3">${T.solarPV}</td>
  <td colspan="3" class="S3">${T.heatPumps}</td>
  <td colspan="3" class="S3">${T.biomass}</td>
  <td colspan="2" class="S3">${T.otherRes}</td>
  <td colspan="4" class="S3" style="background:#003366;color:#fff">${T.totalRes}</td>
</tr>
<tr>
  <td colspan="2" class="L" style="font-size:6.5pt;text-align:center">kWh/m\u00b2,an</td>
  <td colspan="3" class="Vs">${sre_solar_th.toFixed(1)}</td>
  <td colspan="3" class="Vs">${sre_pv.toFixed(1)}</td>
  <td colspan="3" class="Vs">${sre_pc.toFixed(1)}</td>
  <td colspan="3" class="Vs">${sre_bio.toFixed(1)}</td>
  <td colspan="2" class="Vs">0.0</td>
  <td colspan="4" class="V" style="background:#f0f4fa"><strong>${sre_total.toFixed(1)}</strong></td>
</tr>
</table>

<!-- TABLE 6: CONSUM PER UTILITATE (cu clasa energetică pe celule colorate) -->
<table class="c" style="margin-top:2px">
<tr>
  <td colspan="4" rowspan="2" class="S3" style="background:#E7E6E6;vertical-align:middle">Tip sistem instala\u021bie cl\u0103dire real\u0103</td>
  <td colspan="16" class="S3" style="background:#E7E6E6">Clas\u0103 energetic\u0103 / Consum specific anual de energie primar\u0103 per utilitate [kWh/m\u00b2,an]</td>
</tr>
<tr>
  ${scaleLabels.map((lbl, i) => '<td colspan="2" style="background:' + scaleColors[i] + ';color:' + SCALE_TEXT_COLORS[i] + ';text-align:center;font-size:7pt;font-weight:bold;padding:2px">' + lbl + '</td>').join("")}
</tr>
${[
  { label: T.heating, sys: heatDesc, ep: ep_h_m2, cls: utilClassH },
  { label: T.dhw, sys: acmDesc, ep: ep_w_m2, cls: utilClassW },
  { label: T.cooling, sys: coolDesc, ep: ep_c_m2, cls: utilClassC },
  { label: T.ventilation, sys: ventDesc, ep: ep_v_m2, cls: utilClassV },
  { label: T.lighting, sys: lightDesc, ep: ep_l_m2, cls: utilClassL },
].map(u => {
  const clsIdx = CLASS_LABELS.indexOf(u.cls);
  return '<tr>' +
    '<td colspan="1" class="L" style="font-size:7pt;font-weight:bold;padding:2px 3px">' + u.label + '</td>' +
    '<td colspan="3" class="L" style="font-size:6.5pt;padding:2px 3px">' + u.sys + '</td>' +
    scaleLabels.map((lbl, i) => {
      if (i === clsIdx) {
        return '<td colspan="2" style="background:' + scaleColors[i] + ';color:' + SCALE_TEXT_COLORS[i] + ';text-align:center;font-size:7pt;font-weight:bold;padding:2px">' + u.ep.toFixed(1) + '</td>';
      } else {
        return '<td colspan="2" style="border:1px solid #ddd;padding:2px"></td>';
      }
    }).join("") +
  '</tr>';
}).join("")}
</table>

<!-- TABLE 7: COD DE BARE -->
<table class="c" style="margin-top:3px">
<tr><td colspan="20" class="S3" style="background:#E7E6E6;text-align:center;font-size:7pt"><strong>COD UNIC DE IDENTIFICARE CPE (generat local de Zephren \u2014 registru MDLPA \u00een preg\u0103tire)</strong></td></tr>
</table>

<!-- Semnătură și validitate -->
<div style="display:flex;gap:8px;margin-top:3px;font-size:7pt">
  <div style="flex:1;line-height:1.5">
    <strong>Auditor energetic:</strong> ${auditor.name || "________"}<br>
    <strong>Firma:</strong> ${auditor.company || "________"} | <strong>Tel:</strong> ${auditor.phone || "____"} | <strong>Email:</strong> ${auditor.email || "________"}<br>
    <strong>Data elabor\u0103rii:</strong> ${auditor.date || dateNow} | <strong>Valabil ${validYearsPreview} ani (L.372/2005 mod. L.238/2024, clasa ${enClass?.cls || "—"}), p\u00e2n\u0103 la:</strong> ${expiryStr}
  </div>
  <div style="text-align:center;width:120px">
    <div style="font-size:5.5pt;color:#999">${T.signature}</div>
    <div class="stmp" style="min-height:35px"></div>
  </div>
</div>
<div class="bcd" id="qr-area" style="text-align:center;padding:4px">
  <div style="margin-bottom:3px;font-size:7pt"><strong>${T.cpeCode}</strong></div>
  ${qrVerifyDataUrl
    ? `<img src="${qrVerifyDataUrl}" alt="QR verificare CPE" style="display:block;margin:0 auto 3px auto;width:100px;height:100px" />`
    : `<div style="display:inline-block;width:100px;height:100px;border:1px dashed #999;color:#999;font-size:6pt;line-height:100px;margin:0 auto 3px auto">QR în curs</div>`}
  <div style="font-size:6pt;letter-spacing:1px;color:#333">${auditor.cpeCode || auditor.mdlpaCode || "XXXXXX"}</div>
  <div style="font-size:5.5pt;color:#666;margin-top:1px">zephren.ro/cpe/verifica</div>
</div>
<script>
(function(){
  // Audit 2 mai 2026 — P1.3: Code128 vechi (1D barcode) eliminat. QR code real
  // pre-generat în React (qrcode npm) și injectat ca <img> deasupra. Acest
  // script-block rămâne pentru compatibilitate (no-op acum) — generarea
  // tehnică și URL-ul de verificare sunt deja în <img> din DOM.
  // Server-side Python foloseste segno pentru QR in DOCX (linia ~286).
  return;
})();
</script>
<div class="ft">Pagina 1/2 | Mc 001-2022 (Ord. MDLPA 16/2023) | Zephren ${APP_VERSION} | ${dateNow}</div>


<!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
     Audit 2 mai 2026 \u2014 P1.2: Pagina 2 \u201eDetalii tehnice" eliminat\u0103.
     Con\u021binutul (anvelop\u0103 tabelar\u0103 + bilan\u021b instala\u021bii + sintez\u0103 utilit\u0103\u021bi)
     era duplicat \u0219i nu face parte din formularul oficial CPE Ord. MDLPA
     16/2023. Vizualiz\u0103rile tabelare detaliate sunt disponibile separat
     prin:
       - Anexa 1+2 DOCX export (tab dedicat \u00een UI Pas 6)
       - CpeAnexa.jsx preview UI (Card \u201eAnexa 1+2 oficial\u0103")
     CPE-ul oficial r\u0103m\u00e2ne acum 2 pagini: Pag.1 = identificare + scal\u0103
     EP/CO\u2082 + tabel utilit\u0103\u021bi + barcode; Pag.2 (fost\u0103 3) = recomand\u0103ri
     + observa\u021bii + cadru legislativ + semn\u0103turi.
     \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->

<!-- (Anvelop\u0103 tabelar\u0103 eliminat\u0103 \u2014 vezi Anexa 1+2 DOCX export pentru detalii oficiale) -->

<!-- (Bilan\u021b instala\u021bii + sintez\u0103 utilit\u0103\u021bi eliminate \u2014 vezi Anexa 1+2 DOCX export pentru tabele oficiale MDLPA) -->


<!-- ======== PAGINA 2 (recomand\u0103ri + observa\u021bii + cadru legislativ) ======== -->
<div class="page-break"></div>
<div class="hdr">
  <h1 style="font-size:10pt">${T.p3title || T.p2title}</h1>
  <div class="ref">CPE nr. ${auditor.mdlpaCode || "......"} | ${building.address || "\u2014"} | ${catLabel}</div>
</div>

<table class="d">
<tr><td colspan="5" class="dh">${T.recTitle}</td></tr>
<tr>
  <td class="ds" style="width:5%">${isEN?"No.":"Nr."}</td>
  <td class="ds" style="width:38%">${T.measure}</td>
  <td class="ds" style="width:13%">${T.domain}</td>
  <td class="ds" style="width:22%">${T.savings}</td>
  <td class="ds" style="width:22%">${T.priority}</td>
</tr>
${(() => {
  // Audit 2 mai 2026 — P1.4: folosește unifiedRecs (sursă unică).
  // Mapăm la formatul vechi {n, m, d, e, p} pentru compatibilitate render HTML.
  const PRIO_MAP = { "înaltă": "RIDICATĂ", "medie": "MEDIE", "scăzută": "SCĂZUTĂ" };
  const recs = unifiedRecs.map((r, i) => ({
    n: i + 1,
    m: r.measure,
    d: r.category,
    e: r.savings,
    p: PRIO_MAP[r.priority] || r.priority.toUpperCase(),
  }));
  // Variabile retained pentru compatibilitate cu cod legacy (no-op acum)
  const avgUOp = 0; const avgUGl = 0;
  void avgUOp; void avgUGl;
  return recs.map(r => '<tr><td style="text-align:center">' + r.n + '</td><td>' + r.m + '</td><td style="text-align:center">' + r.d + '</td><td style="text-align:center">' + r.e + '</td><td style="text-align:center;font-weight:bold;color:' + (r.p==='RIDICAT\u0102'?'#d42517':r.p==='MEDIE'?'#e17000':'#555') + '">' + r.p + '</td></tr>').join("");
})()}
</table>

<!-- E. OBSERVA\u021aII -->
<table class="d">
<tr><td class="dh">${T.obsTitle}</td></tr>
<tr><td style="min-height:50px;line-height:1.5;padding:5px 6px;font-size:7.5pt">${auditor.observations || 'Cl\u0103direa a fost evaluat\u0103 conform Mc 001-2022. Valorile sunt calculate pe baza datelor furnizate \u0219i a inspec\u021biei vizuale.'}</td></tr>
</table>

<!-- Note legislative -->
<div style="font-size:6pt;color:#666;margin-top:4px;line-height:1.4;padding:3px;border:1px solid #ddd;background:#fafafa">
  <strong>Cadru legislativ aplicat:</strong> L.372/2005 republicată (modif. L.238/2024), Mc 001-2022 (Ord. MDLPA 16/2023), C107/0-7, NP048, SR EN ISO 52000-1:2017/NA:2023, SR EN ISO 52003-1:2017/NA:2023, SR EN ISO 52016-1:2017/NA:2023, SR EN ISO 13790, SR EN 12831-1:2017/NA:2022, SR EN 16798-1:2019/NA:2019.<br>
  <strong>Cadru de referință viitor</strong> (termen transpunere RO: 29.05.2026): Directiva UE 2024/1275 (EPBD IV) — NU este transpus în drept român la data emiterii prezentului CPE.<br>
  * Valori calculate. Valabilitate CPE: 10 ani uniform conform L.372/2005 republicată mod. L.238/2024 — prezent CPE ${validYearsPreview} ani. Diferențierea 10/5 ani per clasă energetică va deveni aplicabilă după transpunerea EPBD în drept român (estimat 29.05.2026). Nu garanteaz\u0103 consumul real.
</div>

<!-- Semn\u0103turi finale -->
<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;font-size:7pt">
  <div><strong>Auditor:</strong> ${auditor.name || "________"}<br>Atestat: ${auditor.atestat || "...."} / Gr. ${auditor.grade}<br>Data: ${auditor.date || dateNow}</div>
  <div style="text-align:center"><div style="font-size:5.5pt;color:#999">${T.auditorSig}</div><div class="stmp" style="width:120px;height:40px"></div></div>
  <div style="text-align:center"><div style="font-size:5.5pt;color:#999">${T.benefSig}</div><div class="stmp" style="width:120px;height:40px"></div></div>
</div>

<div class="ft">Pagina 2/2 | CPE nr. ${auditor.mdlpaCode || "......"} | ${building.address || "\u2014"} | ${dateNow}</div>

</body></html>`;
              // Show in state-driven overlay iframe via srcdoc
              if (showOverlay) setPdfPreviewHtml(htmlContent);
              return htmlContent;
              } catch(err) { showToast("Eroare generare CPE: " + err.message, "error", 8000); console.error("generatePDF error:", err); return null; }
            };

            return (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <button onClick={() => setStep(5)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 5</button>
                  <h2 className="text-xl font-bold">Certificat de Performanță Energetică (CPE)</h2>
                </div>
                <p className="text-xs opacity-40">Generare CPE conform Ordinului MDLPA nr. 16/2023 — format oficial cu clasare dublă</p>
              </div>

              {/* Banner BACS L.238/2024 — termen expirat (31.12.2024) */}
              {bacsCheck?.deadlineExpired && (
                <div className="mb-5 p-4 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-xs space-y-1">
                  <div className="font-bold uppercase tracking-wide">🛑 BACS — Termen legal DEPĂȘIT</div>
                  <div>{bacsCheck.reason}</div>
                  <div className="text-red-300/80">{bacsCheck.epbdRef} · Clădirea NU respectă Legea 238/2024 Art. 14 la momentul emiterii CPE. Auditorul este obligat să consemneze neconformitatea.</div>
                </div>
              )}
              {/* Banner BACS viitor (avertisment auditor) */}
              {!bacsCheck?.deadlineExpired && bacsCheck?.mandatory && bacsCheck?.deadline && (
                <div className="mb-5 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                  <div className="font-semibold">⚠️ BACS obligatoriu</div>
                  <div>{bacsCheck.reason}</div>
                  <div className="text-amber-300/80">Termen: {bacsCheck.deadline} · {bacsCheck.epbdRef}</div>
                </div>
              )}

              {/* T3 Sprint Tranziție 2026 — citare ordin atestare auditor.
                  Pe baza datei emiterii atestatului, citează ordinul prin care
                  auditorul a fost atestat (Ord. 2237/2010 vs Ord. 348/2026). */}
              {(() => {
                const ordLabel = getAttestationOrdinanceLabel(auditor?.attestationIssueDate);
                if (!ordLabel.version) {
                  // Fără dată completată — invitație discretă
                  return (
                    <div
                      className="mb-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[11px] opacity-60 italic"
                      role="note"
                    >
                      {lang === "EN"
                        ? "💡 Add attestation issue date in auditor profile to cite the correct ordinance on the EPC."
                        : "💡 Adaugă data emiterii atestatului în profilul auditorului pentru a cita ordinul corect pe CPE."}
                    </div>
                  );
                }
                const isLegacy = ordLabel.version === "legacy_2237";
                return (
                  <div
                    className={`mb-3 px-3 py-2 rounded-lg text-[11px] flex items-center gap-2 ${
                      isLegacy
                        ? "bg-violet-500/10 border border-violet-500/30 text-violet-200"
                        : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
                    }`}
                    role="note"
                  >
                    <span className="text-base">{isLegacy ? "📜" : "🆕"}</span>
                    <div className="flex-1">
                      <strong>{ordLabel.short}</strong>
                      {" — "}
                      {lang === "EN"
                        ? "the EPC will cite this ordinance per your attestation."
                        : "CPE va cita acest ordin conform atestatului tău."}
                      {isLegacy && (
                        <span className="opacity-70 italic ml-1">
                          {lang === "EN"
                            ? "(transition regime, valid until natural attestation expiry)"
                            : "(regim tranziție, valabil până la expirarea naturală a atestatului)"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* T1.7 Sprint Tranziție 2026 — banner informativ pentru plan AE IIci.
                  Filozofie: plan-urile sunt orientate FUNCȚIONAL (nu pe grad atestat).
                  Plan AE IIci 599 RON = produs valid pentru cei care fac DOAR CPE
                  (Step 1-6). Pentru audit + nZEB + LCC → upgrade AE Ici 1.499 RON. */}
              {resolvePlan(userPlan) === "audit" && (
                <div
                  className="mb-5 p-3 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-200 text-xs flex items-start gap-3"
                  role="note"
                >
                  <span className="text-base shrink-0">💡</span>
                  <div className="space-y-1 leading-relaxed">
                    <div className="font-semibold">
                      {lang === "EN"
                        ? "Plan Zephren AE IIci · CPE only (Step 1-6)"
                        : "Plan Zephren AE IIci · doar CPE (Pas 1-6)"}
                    </div>
                    <div className="opacity-80">
                      {lang === "EN" ? (
                        <>
                          Your plan covers EPC issuance for residential buildings (Art. 6 par. (2)
                          Ord. MDLPA 348/2026). For energy audit, nZEB conformance report, and LCC
                          analysis (Step 7), upgrade to <strong>Zephren AE Ici · 1.499 RON/lună</strong>.
                        </>
                      ) : (
                        <>
                          Planul tău acoperă emiterea CPE pentru locuințe (Art. 6 alin. (2) Ord.
                          MDLPA 348/2026). Pentru audit energetic, raport conformare nZEB și
                          analiză LCC (Pas 7), upgrade la <strong>Zephren AE Ici · 1.499 RON/lună</strong>.
                        </>
                      )}
                    </div>
                    <div className="text-[10px] opacity-60 italic">
                      {lang === "EN"
                        ? "Note: plans are organized FUNCTIONALLY, not by attestation grade. An AE Ici auditor doing only EPC may use this plan."
                        : "Notă: plan-urile sunt orientate FUNCȚIONAL, nu pe gradul atestatului. Un auditor AE Ici care face doar CPE poate folosi acest plan."}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* Date auditor + generare */}
                <div className="space-y-5">
                  <Card title={t("Date auditor energetic",lang)}>
                    <div className="space-y-3">
                      <Input label={t("Nume complet auditor",lang)} value={auditor.name} onChange={v => setAuditor(p=>({...p,name:v}))} placeholder="Ing. Popescu Ion" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label={t("Nr. atestat MLPAT/MDLPA",lang)} value={auditor.atestat} onChange={v => setAuditor(p=>({...p,atestat:v}))} placeholder="12345" />
                        <Input
                          label={t("Data emiterii atestatului",lang)}
                          value={auditor.attestationIssueDate || ""}
                          onChange={v => setAuditor(p => ({ ...p, attestationIssueDate: v }))}
                          type="date"
                        />
                      </div>

                      {/* T5 Sprint Tranziție 2026 — selector ordin atestare + grad adaptat. */}
                      {(() => {
                        const issueDate = auditor.attestationIssueDate;
                        const auto = issueDate
                          ? (new Date(issueDate) < new Date("2026-04-14T00:00:00.000Z")
                              ? "2237_2010"
                              : "348_2026")
                          : null;
                        const ordinanceVal = auditor.attestationOrdinance || auto || "348_2026";
                        const isLegacy = ordinanceVal === "2237_2010";
                        const legacyText = auditor.attestationLegacyGrade || "";
                        const legacyMap = isLegacy ? mapLegacyGradeToNew(legacyText) : null;

                        return (
                          <div className="space-y-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.08]">
                            <div className="text-[10px] uppercase tracking-wider opacity-50">
                              {lang === "EN" ? "Attestation regime" : "Regim atestare"}
                            </div>
                            <Select
                              label={t("Ordin atestare",lang)}
                              value={ordinanceVal}
                              onChange={v => setAuditor(p => ({ ...p, attestationOrdinance: v }))}
                              options={[
                                { value: "348_2026", label: "Ord. MDLPA 348/2026 (după 14.IV.2026)" },
                                { value: "2237_2010", label: "Ord. MDLPA 2237/2010 (regim tranziție)" },
                              ]}
                              tooltip={lang === "EN"
                                ? "Auto-detected from attestation issue date if available"
                                : "Auto-detectat din data emiterii atestatului dacă e completată"}
                            />
                            {isLegacy ? (
                              <div className="space-y-2">
                                <Input
                                  label={t("Grad atestat (text exact din certificat)",lang)}
                                  value={legacyText}
                                  onChange={v => {
                                    const mapped = mapLegacyGradeToNew(v);
                                    setAuditor(p => ({
                                      ...p,
                                      attestationLegacyGrade: v,
                                      grade: mapped.grade ? `AE ${mapped.grade}` : p.grade,
                                    }));
                                  }}
                                  placeholder="grad I civile / grad II civile / grad I+II constructii"
                                />
                                {legacyText && (
                                  <div
                                    className={`text-[11px] p-2 rounded ${
                                      legacyMap?.grade === "Ici"
                                        ? "bg-emerald-500/10 text-emerald-200"
                                        : legacyMap?.grade === "IIci"
                                          ? "bg-amber-500/10 text-amber-200"
                                          : "bg-red-500/10 text-red-200"
                                    }`}
                                  >
                                    <strong>
                                      {legacyMap?.grade
                                        ? `→ AE ${legacyMap.grade} (${legacyMap.confidence})`
                                        : "→ Necunoscut"}
                                    </strong>
                                    <span className="opacity-80 block mt-0.5">{legacyMap?.interpretation}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Select
                                label={t("Grad atestat",lang)}
                                value={auditor.grade}
                                onChange={v => setAuditor(p => ({ ...p, grade: v }))}
                                options={[
                                  { value: "AE Ici",  label: "AE Ici — Grad I civile (scop complet)" },
                                  { value: "AE IIci", label: "AE IIci — Grad II civile (CPE locuințe)" },
                                ]}
                              />
                            )}
                          </div>
                        );
                      })()}
                      <Input label={t("Firma / PFA",lang)} value={auditor.company} onChange={v => setAuditor(p=>({...p,company:v}))} />
                      {tier.brandingCPE && (
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/10">
                          {auditor.companyLogo && <img src={auditor.companyLogo} alt="Logo" className="h-8 object-contain" />}
                          <label className="text-xs opacity-50 cursor-pointer hover:opacity-80">
                            {auditor.companyLogo ? "Schimbă logo" : "📎 Adaugă logo firmă (Business)"}
                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => setAuditor(p=>({...p,companyLogo:reader.result}));
                              reader.readAsDataURL(file);
                              e.target.value = "";
                            }} />
                          </label>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label={t("Telefon",lang)} value={auditor.phone} onChange={v => setAuditor(p=>({...p,phone:v}))} />
                        <Input label={t("Email",lang)} value={auditor.email} onChange={v => setAuditor(p=>({...p,email:v}))} />
                      </div>
                      <Input label={t("Data elaborării CPE",lang)} value={auditor.date} onChange={v => setAuditor(p=>({...p,date:v}))} type="date" />
                      <Input label={t("Cod unic MDLPA (după înregistrare)",lang)} value={auditor.mdlpaCode} onChange={v => {
                        // Format validation: allow digits, letters, dots, dashes
                        const cleaned = v.replace(/[^A-Za-z0-9.\-\/]/g, "").toUpperCase().slice(0, 20);
                        setAuditor(p=>({...p,mdlpaCode:cleaned}));
                      }}
                        placeholder="ex: CPE-12345/2026" />
                      {auditor.mdlpaCode && auditor.mdlpaCode.length > 3 && (
                        <div className="text-[10px] mt-0.5 opacity-30 flex items-center gap-2">
                          <span>Cod: <strong>{auditor.mdlpaCode}</strong></span>
                          <span>•</span>
                          <span>Format așteptat: CPE-XXXXX/AAAA sau numeric</span>
                        </div>
                      )}
                      {/* Sprint 14 — cod unic CPE (Ord. MDLPA 16/2023 + L.238/2024) */}
                      <div className="mt-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[11px] font-medium opacity-70">Cod unic CPE</div>
                          <button
                            type="button"
                            className="text-[10px] px-2 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={!auditor.name || !auditor.mdlpaCode || !auditor.date}
                            title={!auditor.name || !auditor.mdlpaCode || !auditor.date
                              ? "Completează nume, cod MDLPA și dată mai întâi"
                              : "Generează automat"}
                            onClick={() => {
                              try {
                                const nameParts = String(auditor.name || "").trim().split(/\s+/);
                                const lastName = nameParts[0] || "";
                                const firstName = nameParts.slice(1).join(" ") || "";
                                const code = generateCPECode({
                                  auditor: {
                                    lastName,
                                    firstName,
                                    atestat: auditor.atestat || "NONE",
                                    mdlpaCode: auditor.mdlpaCode,
                                  },
                                  building,
                                  date: auditor.date,
                                  registryIndex: parseInt(auditor.registryIndex || "1", 10) || 1,
                                });
                                setAuditor(p => ({ ...p, cpeCode: code }));
                              } catch (e) {
                                alert("Eroare generare cod CPE: " + e.message);
                              }
                            }}
                          >
                            🔄 Generează automat
                          </button>
                        </div>
                        <Input
                          label={t("Index registru local", lang)}
                          value={auditor.registryIndex || "1"}
                          onChange={v => {
                            const cleaned = v.replace(/[^0-9]/g, "").slice(0, 6) || "1";
                            setAuditor(p => ({ ...p, registryIndex: cleaned }));
                          }}
                          placeholder="1"
                        />
                        {auditor.cpeCode && (
                          <div className="mt-2">
                            <div className="text-[9px] opacity-40 mb-1">Cod generat:</div>
                            <div className="text-[10px] font-mono break-all p-2 rounded bg-black/30 border border-white/5">
                              {auditor.cpeCode}
                            </div>
                            <div className="text-[9px] mt-1 flex items-center gap-1">
                              {validateCPECode(auditor.cpeCode) ? (
                                <span className="text-emerald-400/80">✓ Format valid (Ord. MDLPA 16/2023)</span>
                              ) : (
                                <span className="text-amber-400/80">⚠ Format nestandard — verifică manual</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sprint 17 — Pașaport renovare asociat
                          Audit 2 mai 2026 — P0.2: EPBD Art. 12 NU este transpus în drept român
                          până la 29.05.2026. Pașaportul rămâne disponibil ca PREVIEW intern
                          Zephren (export separat), dar NU mai este integrat automat în CPE oficial. */}
                      {building?.passportUUID && (
                        <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[11px] font-medium opacity-80">🆔 Pașaport renovare (preview Zephren)</div>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold uppercase tracking-wider">PREVIEW</span>
                          </div>
                          <div className="text-[10px] mb-2 text-amber-200/90 leading-snug">
                            ⚠ Format derivat din <strong>EPBD 2024/1275 Art. 12</strong> (cadru european viitor). <strong>L.238/2024 NU transpune Art. 12.</strong> Documentul nu are valoare juridică în România până la actul național de transpunere (estimat 29.05.2026).
                          </div>
                          <div className="text-[9px] opacity-40 mb-1">UUID:</div>
                          <div className="text-[10px] font-mono break-all p-2 rounded bg-black/30 border border-white/5">
                            {building.passportUUID}
                          </div>
                          {building.passportURL && (
                            <div className="text-[9px] mt-2 flex items-center gap-1">
                              <span className="opacity-50">URL preview:</span>
                              <a href={building.passportURL} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline truncate">
                                {building.passportURL}
                              </a>
                            </div>
                          )}
                          <div className="text-[9px] opacity-50 mt-2 italic">
                            Pașaportul NU mai este integrat automat în CPE DOCX/XML oficial (audit P0.2). Export separat disponibil prin meniul „Pașaport renovare".
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Sprint 15 — Semnătură + ștampilă auditor (PNG cu transparență)
                      Setup one-time per cont auditor — ascuns într-un <details>
                      collapsible (default închis) ca să nu aglomereze wizard-ul.
                      Datele se persistă în starea `auditor` cross-CPE prin storage. */}
                  <details className="group">
                    <summary className="cursor-pointer text-[11px] opacity-50 hover:opacity-80 px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] transition-all flex items-center gap-2">
                      <span className="group-open:rotate-90 transition-transform">▶</span>
                      <span>{t("Semnătură & ștampilă auditor",lang)}</span>
                      <span className="text-[9px] opacity-60 ml-auto">{lang==="EN" ? "one-time setup" : "setup unic"}</span>
                    </summary>
                    <div className="mt-2">
                      <Card title={t("Semnătură & ștampilă",lang)}>
                        <div className="text-[10px] opacity-50 mb-3">
                          {lang==="EN"
                            ? "Upload PNG (transparent background) — used for embedding in CPE DOCX + Annex 2 official. Saved in auditor profile, not per CPE."
                            : "Încarcă PNG (fundal transparent) — folosit pentru integrare în CPE DOCX + Anexa 2 oficială. Se salvează în profilul auditorului, nu per CPE."}
                        </div>
                        <AuditorSignatureStampUpload auditor={auditor} setAuditor={setAuditor} />
                      </Card>
                    </div>
                  </details>

                  {/* ── Sprint v6.2 (27 apr 2026) — Raport conformare nZEB ──
                      Conform Art. 6 alin. (1) lit. c) Ord. MDLPA 348/2026, doar
                      AE Ici poate emite acest raport pentru clădiri în faza de
                      proiectare. Componenta validează intern gating-ul. */}
                  {canAccessFn(userPlan, "nzebReport") && (
                    <details className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 group">
                      <summary className="cursor-pointer flex items-center gap-2 text-xs opacity-80 hover:opacity-100 list-none [&::-webkit-details-marker]:hidden">
                        <span className="text-base">🌿</span>
                        <span>{lang === "EN" ? "nZEB Conformance Report (design phase)" : "Raport conformare nZEB (proiectare)"}</span>
                        <span className="text-[9px] opacity-60 ml-auto">AE Ici · Art. 6 lit. c</span>
                      </summary>
                      <div className="mt-2">
                        <RaportConformareNZEB
                          building={building}
                          selectedClimate={selectedClimate}
                          instSummary={instSummary}
                          renewSummary={renewSummary}
                          envelopeSummary={envelopeSummary}
                          opaqueElements={opaqueElements}
                          glazingElements={glazingElements}
                          heating={heating}
                          cooling={cooling}
                          ventilation={ventilation}
                          lighting={lighting}
                          acm={acm}
                          solarThermal={solarThermal}
                          photovoltaic={photovoltaic}
                          heatPump={heatPump}
                          biomass={biomass}
                          auditor={auditor}
                          userPlan={userPlan}
                          lang={lang}
                          showToast={showToast}
                        />
                      </div>
                    </details>
                  )}


                  {/* MDLPA Registry info */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                    <div className="text-[10px] opacity-50 font-medium mb-1">Registru MDLPA</div>
                    <div className="text-[10px] opacity-35 space-y-1">
                      <div>Codul unic se obține după înregistrarea CPE pe platforma electronică a MDLPA.</div>
                      <div>Platforma: <strong>https://www.mdlpa.ro</strong> → Registru certificate energetice</div>
                      <div>Conform Art.19 L.372/2005 mod. L.238/2024, CPE se înregistrează în max 30 zile de la elaborare.</div>
                    </div>
                  </div>

                  {/* Sprint Reorganizare Pas 5/6 (1 mai 2026) — Card "Analiză cost-optimă rapidă"
                      mutat în Pas 7 Audit (apropriat de CostOptimalCurve detaliat).
                      Costul anual € + recomandările PV/anvelopă aparțin auditului, nu CPE. */}

                  <Card title={t("Observatii suplimentare",lang)}>
                    <textarea value={auditor.observations} onChange={e => setAuditor(p=>({...p,observations:e.target.value}))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm min-h-[100px] focus:outline-none focus:border-amber-500/50 resize-y"
                      placeholder="Observatii privind starea cladirii, limitari ale evaluarii, etc." />
                  </Card>

                  {/* Sprint Reorganizare Pas 5/6 (1 mai 2026) — Card "Statistici auditor"
                      mutat în AuditorStatsBadge (sidebar global). Vizibil pe orice pas. */}

                  {/* Google Maps localizare — skip în DEV (Claude Preview blochează URL-uri externe) */}
                  {building.city && !import.meta.env.DEV && (
                    <Card title="Localizare">
                      <div className="rounded-lg overflow-hidden border border-white/10" style={{height:"150px"}}>
                        <iframe
                          src={`https://maps.google.com/maps?q=${encodeURIComponent((building.address||"") + ", " + building.city + ", Romania")}&z=15&output=embed`}
                          className="w-full h-full border-0" title="Map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                      </div>
                    </Card>
                  )}

                  <Card title={t("Foto cladire (optional)",lang)}>
                    <div className="space-y-2">
                      {auditor.photo && (
                        <div className="relative">
                          <img src={auditor.photo} alt="Foto cladire" className="w-full max-h-40 object-contain rounded-lg border border-white/10" />
                          <button onClick={() => setAuditor(p=>({...p,photo:""}))}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center hover:bg-red-500">&times;</button>
                        </div>
                      )}
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-all text-sm">
                        <span>📷</span> {auditor.photo ? "Schimba foto" : "Incarca foto cladire"}
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) { showToast("Imaginea trebuie să fie sub 2 MB", "error"); return; }
                          // #8 Compresie foto — redimensionare la max 600px și compresie JPEG 0.7
                          const img = new Image();
                          img.onload = () => {
                            const maxDim = 600;
                            let w = img.width, h = img.height;
                            if (w > maxDim || h > maxDim) {
                              const ratio = Math.min(maxDim / w, maxDim / h);
                              w = Math.round(w * ratio);
                              h = Math.round(h * ratio);
                            }
                            const canvas = document.createElement('canvas');
                            canvas.width = w; canvas.height = h;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, w, h);
                            const compressed = canvas.toDataURL('image/jpeg', 0.7);
                            setAuditor(p => ({...p, photo: compressed}));
                          };
                          img.src = URL.createObjectURL(file);
                          e.target.value = "";
                        }} />
                      </label>
                      <div className="text-[10px] opacity-30">Max 2 MB, JPG/PNG. Apare in CPE la rubrica foto cladire.</div>
                    </div>
                  </Card>

                  {/* Validation warnings */}
                  {(() => {
                    const warns = [];
                    const infos = [];
                    // CRITICE — blochează generarea
                    if (Au <= 0) warns.push("❌ Suprafața utilă (Au) nu este definită — Pasul 1");
                    if (!building.locality) warns.push("❌ Localitatea de calcul nu este selectată — Pasul 1");
                    if (!building.category) warns.push("❌ Categoria funcțională nu este selectată — Pasul 1");
                    if (opaqueElements.length === 0 && glazingElements.length === 0) warns.push("❌ Niciun element de anvelopă definit — Pasul 2");
                    if ((parseFloat(building.volume) || 0) <= 0) warns.push("❌ Volumul interior nu este definit — Pasul 1");
                    if (!heating.source) warns.push("❌ Sursa de încălzire nu este configurată — Pasul 3");
                    if (!instSummary) warns.push("❌ Calculul energetic nu este disponibil (completați pașii 1-4)");
                    // IMPORTANTE — afectează calitatea
                    if (!auditor.name) warns.push("⚠ Numele auditorului nu este completat");
                    if (!auditor.atestat) warns.push("⚠ Nr. atestat MDLPA lipsește");
                    if (!auditor.date) infos.push("ℹ Data elaborării CPE nu este setată");
                    if (!building.yearBuilt) infos.push("ℹ Anul construcției lipsește");
                    else if (parseInt(building.yearBuilt) < 1800 || parseInt(building.yearBuilt) > new Date().getFullYear()) warns.push("⚠ Anul construcției (" + building.yearBuilt + ") pare incorect");
                    if (!building.address) infos.push("ℹ Adresa clădirii nu este completată");
                    if (parseFloat(building.volume) <= 0) infos.push("ℹ Volumul încălzit (V) nu este definit");
                    if (!building.floors) infos.push("ℹ Regimul de înălțime nu este completat");
                    // RECOMANDĂRI nZEB
                    if (renewSummary && renewSummary.rer < 30) infos.push("ℹ RER < 30% — clădirea nu îndeplinește cerința nZEB");
                    if (thermalBridges.length === 0) infos.push("ℹ Punțile termice nu sunt definite (se folosesc valori forfetare)");
                    if (!photovoltaic.enabled && !solarThermal.enabled && !heatPump.enabled && !biomass.enabled) infos.push("ℹ Nicio sursă regenerabilă configurată — Pasul 4");
                    // Audit 2 mai 2026 — P1.1: scor unic via cpe-completeness.js
                    // (înainte: 12 check-uri inline aici + 6 în block 2 → divergență).
                    // Acum: o singură sursă de adevăr, identică în ambele blocuri.
                    const completenessResult = getCpeCompletenessScore({
                      building, selectedClimate, opaqueElements, glazingElements,
                      heating, acm, instSummary, renewSummary, auditor,
                    });
                    const completePct = completenessResult.pct;

                    if (warns.length === 0 && infos.length === 0) return (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                        <div className="text-xs font-bold text-emerald-400">✓ Toate datele sunt complete ({completePct}%)</div>
                        <div className="text-[10px] opacity-40 mt-1">CPE-ul poate fi generat fără probleme.</div>
                      </div>
                    );
                    return (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-bold text-amber-400">Verificări necesare</div>
                          <div className="text-[10px] px-2 py-0.5 rounded bg-white/5">{completePct}% complet</div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
                          <div className="h-full rounded-full transition-all" style={{width:completePct+"%",background:completePct>=80?"#22c55e":completePct>=50?"#eab308":"#ef4444"}} />
                        </div>
                        {warns.map((w,i) => <div key={"w"+i} className="text-[11px] text-amber-300/80">{w}</div>)}
                        {infos.map((w,i) => <div key={"i"+i} className="text-[10px] opacity-40">{w}</div>)}
                      </div>
                    );
                  })()}


                  <button onClick={function() {
                    if (!canNzebReport) { requireUpgrade("Raport nZEB necesită plan Pro"); return; }
                    if (!instSummary || !renewSummary) { showToast("Completați pașii 1-5 pentru raport nZEB.", "error"); return; }
                    try {
                    const Au = parseFloat(building.areaUseful) || 0;
                    const V = parseFloat(building.volume) || 0;
                    const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
                    const epF = renewSummary.ep_adjusted_m2;
                    const n50Val = parseFloat(building.n50) || 4.0;
                    const isEN = lang === "EN";
                    const dateNow = new Date().toISOString().slice(0,10);
                    const catLabel = BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label || "";
                    const zebMax = getNzebEpMax(building.category, selectedClimate?.zone) * ZEB_FACTOR;
                    const hasFossil = ["gaz","motorina","carbune"].includes(instSummary.fuel?.id);
                    const isZEB = epF <= zebMax && !hasFossil && renewSummary.rer >= 30;

                    // Verificari U per element
                    const uChecks = opaqueElements.map(function(el) {
                      const uRef = getURefNZEB(building.category, el.type);
                      const uCalc = el.layers && el.layers.length > 0 ? (function() {
                        const elType = ELEMENT_TYPES.find(function(t){return t.id===el.type;});
                        const rsi = elType ? elType.rsi : 0.13;
                        const rse = elType ? elType.rse : 0.04;
                        const rLayers = el.layers.reduce(function(s,l){var d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0);},0);
                        return 1/(rsi+rLayers+rse);
                      })() : null;
                      return { name: el.name || el.type, type: el.type, uCalc: uCalc, uRef: uRef, ok: uRef ? (uCalc !== null ? uCalc <= uRef : null) : null };
                    });
                    const glazUChecks = glazingElements.map(function(el) {
                      const uVal = parseFloat(el.u) || 3.0;
                      const uRef = ["RI","RC","RA"].includes(building.category) ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres;
                      return { name: el.name || "Vitraj", uCalc: uVal, uRef: uRef, ok: uVal <= uRef };
                    });

                    // Criterii complete nZEB L.238/2024
                    const criteria = [
                      { id: "EP", name: "Energie primară (Ep)", value: epF.toFixed(1) + " kWh/m²·an", limit: "< " + getNzebEpMax(building.category, selectedClimate?.zone) + " kWh/m²·an", ok: epF <= getNzebEpMax(building.category, selectedClimate?.zone), weight: "CRITIC" },
                      { id: "RER", name: "RER total (Renewable Energy Ratio)", value: renewSummary.rer.toFixed(1) + "%", limit: "≥ " + nzeb.rer_min + "%", ok: renewSummary.rer >= nzeb.rer_min, weight: "CRITIC" },
                      { id: "RER_ONSITE", name: "RER on-site (producție proprie)", value: renewSummary.rerOnSite.toFixed(1) + "%", limit: "≥ 10%", ok: renewSummary.rerOnSiteOk, weight: "CRITIC" },
                      { id: "N50", name: "Permeabilitate la aer (n50)", value: n50Val.toFixed(1) + " h⁻¹", limit: "≤ 1.0 h⁻¹ (nZEB) / ≤ 3.0 h⁻¹ (renovare)", ok: n50Val <= 3.0, ideal: n50Val <= 1.0, weight: "MAJOR" },
                    ];
                    const allOpOk = uChecks.every(function(c){return c.ok === null || c.ok === true;});
                    const allGlOk = glazUChecks.every(function(c){return c.ok;});
                    const globalNzeb = epF <= getNzebEpMax(building.category, selectedClimate?.zone) && renewSummary.rer >= nzeb.rer_min && renewSummary.rerOnSiteOk && allOpOk && allGlOk;

                    // Cost-optim simplu per măsură (NPV pe 20 ani, discount 5%)
                    const costEn = instSummary ? (instSummary.qf_h + instSummary.qf_w + instSummary.qf_c + instSummary.qf_v + instSummary.qf_l) : 0;
                    const priceKwh = instSummary?.fuel?.id === "electricitate" ? 1.30 : instSummary?.fuel?.id === "gaz" ? 0.32 : 0.30;
                    const annualCostEur = costEn * priceKwh / 4.95;

                    const nzebHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Raport nZEB — ${building.address || "Clădire"}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Segoe UI","Roboto",sans-serif;font-size:10pt;color:#1a1a2e;background:#fff;padding:12mm 15mm;max-width:210mm;margin:0 auto;line-height:1.5}
@media print{@page{size:A4;margin:10mm 12mm} body{padding:0} .no-print{display:none!important}}
@media screen and (max-width:600px){body{padding:4mm 3mm;font-size:8.5pt}}
h1{font-size:14pt;color:#003366;text-align:center;margin-bottom:2px;letter-spacing:0.5px}
h2{font-size:11pt;color:#003366;margin:14px 0 6px;padding:4px 8px;background:#e8edf5;border-left:4px solid #003366}
h3{font-size:9.5pt;color:#003366;margin:10px 0 4px}
.sub{text-align:center;font-size:8pt;color:#555;margin-bottom:12px}
.meta{display:flex;flex-wrap:wrap;gap:6px 20px;font-size:8pt;color:#444;margin-bottom:10px;padding:6px 8px;background:#f8f9fc;border:1px solid #ddd;border-radius:4px}
.meta b{color:#003366}
table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:8.5pt}
th,td{border:1px solid #999;padding:3px 6px;vertical-align:middle}
th{background:#003366;color:#fff;font-weight:600;text-align:center;font-size:8pt}
.ok{background:#d4edda;color:#155724;font-weight:bold;text-align:center}
.fail{background:#f8d7da;color:#721c24;font-weight:bold;text-align:center}
.warn{background:#fff3cd;color:#856404;font-weight:bold;text-align:center}
.crit{font-weight:bold;color:#721c24}
.badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:8pt;font-weight:bold;letter-spacing:0.3px}
.badge-ok{background:#00642d;color:#fff}
.badge-fail{background:#d42517;color:#fff}
.badge-warn{background:#e17000;color:#fff}
.global{text-align:center;padding:12px;margin:10px 0;border:2px solid;border-radius:8px;font-size:12pt;font-weight:bold}
.global-ok{border-color:#00642d;background:#d4edda;color:#00642d}
.global-fail{border-color:#d42517;background:#f8d7da;color:#d42517}
.note{font-size:7.5pt;color:#666;padding:4px 8px;background:#fafafa;border:1px solid #eee;margin-top:6px;border-radius:3px}
.bar{height:14px;border-radius:3px;display:inline-block;vertical-align:middle}
.ft{text-align:center;font-size:7pt;color:#999;margin-top:10px;padding-top:4px;border-top:1px solid #ddd}
.cost-row td{font-size:8pt}
.flex-row{display:flex;gap:12px;margin:8px 0}
.flex-row>div{flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;text-align:center}
.flex-row .big{font-size:16pt;font-weight:bold;color:#003366}
.flex-row .lbl{font-size:7.5pt;color:#888;margin-top:2px}
</style></head><body>
<h1>RAPORT DE CONFORMARE nZEB</h1>
<div class="sub">conform Legii 372/2005 (modificată prin Legea 238/2024) și Mc 001-2022 (Ord. MDLPA 16/2023)</div>

<div class="meta">
<div><b>Clădire:</b> ${building.address || "—"}, ${building.city || ""} ${building.county || ""}</div>
<div><b>Categorie:</b> ${catLabel}</div>
<div><b>An constr.:</b> ${building.yearBuilt || "—"}</div>
<div><b>Au:</b> ${Au.toFixed(1)} m²</div>
<div><b>V:</b> ${V.toFixed(0)} m³</div>
<div><b>Zonă climatică:</b> ${selectedClimate?.zone || "—"} (${selectedClimate?.name || "—"})</div>
<div><b>Auditor:</b> ${auditor.name || "—"} (At. ${auditor.atestat || "—"})</div>
<div><b>Data:</b> ${dateNow}</div>
</div>

<div class="global ${globalNzeb ? 'global-ok' : 'global-fail'}">
${globalNzeb ? '✓ CLĂDIREA ÎNDEPLINEȘTE CERINȚELE nZEB' : '✗ CLĂDIREA NU ÎNDEPLINEȘTE CERINȚELE nZEB'}
</div>

<h2>1. Criterii principale nZEB</h2>
<table>
<tr><th style="width:5%">Nr.</th><th style="width:28%">Criteriu</th><th style="width:18%">Valoare calculată</th><th style="width:20%">Limită nZEB</th><th style="width:12%">Rezultat</th><th style="width:17%">Importanță</th></tr>
${criteria.map(function(c,i){return '<tr><td style="text-align:center">'+(i+1)+'</td><td>'+c.name+'</td><td style="text-align:center;font-weight:bold">'+c.value+'</td><td style="text-align:center">'+c.limit+'</td><td class="'+(c.ok?'ok':'fail')+'">'+(c.ok?'✓ DA':'✗ NU')+'</td><td style="text-align:center" class="'+(c.weight==='CRITIC'?'crit':'')+'">'+c.weight+'</td></tr>';}).join("")}
</table>

<h2>2. Verificare transmitanță termică U vs. U'max nZEB</h2>
<h3>2.1 Elemente opace</h3>
<table>
<tr><th>Nr.</th><th>Element</th><th>Tip</th><th>U calculat [W/m²K]</th><th>U'max nZEB [W/m²K]</th><th>Rezultat</th></tr>
${uChecks.length > 0 ? uChecks.map(function(c,i){return '<tr><td style="text-align:center">'+(i+1)+'</td><td>'+c.name+'</td><td>'+c.type+'</td><td style="text-align:center;font-weight:bold">'+(c.uCalc!==null?c.uCalc.toFixed(3):'—')+'</td><td style="text-align:center">'+(c.uRef!==null?c.uRef.toFixed(2):'N/A')+'</td><td class="'+(c.ok===null?'warn':c.ok?'ok':'fail')+'">'+(c.ok===null?'—':c.ok?'✓':'✗')+'</td></tr>';}).join("") : '<tr><td colspan="6" style="text-align:center;color:#999">— Niciun element opac definit —</td></tr>'}
</table>
<h3>2.2 Elemente vitrate</h3>
<table>
<tr><th>Nr.</th><th>Element</th><th>U [W/m²K]</th><th>U'max nZEB [W/m²K]</th><th>Rezultat</th></tr>
${glazUChecks.length > 0 ? glazUChecks.map(function(c,i){return '<tr><td style="text-align:center">'+(i+1)+'</td><td>'+c.name+'</td><td style="text-align:center;font-weight:bold">'+c.uCalc.toFixed(2)+'</td><td style="text-align:center">'+c.uRef.toFixed(2)+'</td><td class="'+(c.ok?'ok':'fail')+'">'+(c.ok?'✓':'✗')+'</td></tr>';}).join("") : '<tr><td colspan="5" style="text-align:center;color:#999">— Niciun element vitrat definit —</td></tr>'}
</table>

<h2>3. Surse regenerabile de energie (SRE)</h2>
<div class="flex-row">
<div><div class="big">${renewSummary.rer.toFixed(1)}%</div><div class="lbl">RER Total (min 30%)</div></div>
<div><div class="big">${renewSummary.rerOnSite.toFixed(1)}%</div><div class="lbl">RER On-site (min 10%)</div></div>
<div><div class="big">${(renewSummary.totalRenewable/Math.max(Au,1)).toFixed(1)}</div><div class="lbl">kWh/m²·an din SRE</div></div>
</div>
<table>
<tr><th>Sursă SRE</th><th>Producție [kWh/an]</th><th>kWh/m²·an</th><th>Activă</th></tr>
<tr><td>Solar termic</td><td style="text-align:right">${renewSummary.qSolarTh.toFixed(0)}</td><td style="text-align:right">${(renewSummary.qSolarTh/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${solarThermal.enabled?'✓':'—'}</td></tr>
<tr><td>Fotovoltaic (PV)</td><td style="text-align:right">${renewSummary.qPV_kWh.toFixed(0)}</td><td style="text-align:right">${(renewSummary.qPV_kWh/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${photovoltaic.enabled?'✓':'—'}</td></tr>
<tr><td>Pompă de căldură (ambientală)</td><td style="text-align:right">${renewSummary.qPC_ren.toFixed(0)}</td><td style="text-align:right">${(renewSummary.qPC_ren/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${heatPump.enabled?'✓':'—'}</td></tr>
<tr><td>Biomasă</td><td style="text-align:right">${renewSummary.qBio_ren.toFixed(0)}</td><td style="text-align:right">${(renewSummary.qBio_ren/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${biomass.enabled?'✓':'—'}</td></tr>
<tr><td>Eolian + Cogenerare</td><td style="text-align:right">${(renewSummary.qWind+(renewSummary.qCogen_el||0)+(renewSummary.qCogen_th||0)).toFixed(0)}</td><td style="text-align:right">${((renewSummary.qWind+(renewSummary.qCogen_el||0)+(renewSummary.qCogen_th||0))/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${otherRenew.windEnabled||otherRenew.cogenEnabled?'✓':'—'}</td></tr>
<tr style="font-weight:bold;background:#e8edf5"><td>TOTAL SRE</td><td style="text-align:right">${renewSummary.totalRenewable.toFixed(0)}</td><td style="text-align:right">${renewSummary.totalRenewable_m2.toFixed(1)}</td><td></td></tr>
</table>

<h2>4. Verificare ZEB Ready (EPBD IV — Dir. UE 2024/1275)</h2>
<table>
<tr><th style="width:35%">Criteriu ZEB</th><th style="width:25%">Valoare</th><th style="width:25%">Cerință</th><th style="width:15%">Rezultat</th></tr>
<tr><td>Ep ≤ nZEB × 0.90</td><td style="text-align:center">${epF.toFixed(1)} kWh/m²a</td><td style="text-align:center">≤ ${zebMax.toFixed(0)} kWh/m²a</td><td class="${epF<=zebMax?'ok':'fail'}">${epF<=zebMax?'✓':'✗'}</td></tr>
<tr><td>Combustibil fosil on-site</td><td style="text-align:center">${hasFossil?'DA — '+instSummary.fuel?.label:'NU'}</td><td style="text-align:center">NU (zero emisii)</td><td class="${!hasFossil?'ok':'fail'}">${!hasFossil?'✓':'✗'}</td></tr>
<tr><td>RER ≥ 30%</td><td style="text-align:center">${renewSummary.rer.toFixed(1)}%</td><td style="text-align:center">≥ 30%</td><td class="${renewSummary.rer>=30?'ok':'fail'}">${renewSummary.rer>=30?'✓':'✗'}</td></tr>
<tr style="font-weight:bold"><td>Status ZEB</td><td colspan="2" style="text-align:center">Obligatoriu: cl. publice noi 01.01.2028 / toate cl. noi 01.01.2030</td><td class="${isZEB?'ok':'warn'}">${isZEB?'✓ ZEB READY':'⚠ NU ZEB'}</td></tr>
</table>

${["BI","ED","SA","HC","CO","SP"].includes(building.category) && Au > 250 ? '<div class="note" style="border-color:#e17000;background:#fff8f0"><strong>⚠ Obligație solară EPBD IV Art.10:</strong> Clădire non-rezidențială > 250 m² — instalație solară obligatorie de la sfârșitul 2026. ' + (photovoltaic.enabled || solarThermal.enabled ? '<span class="badge badge-ok">✓ Instalație solară configurată</span>' : '<span class="badge badge-fail">✗ Nicio instalație solară configurată</span>') + '</div>' : ''}

<h2>5. GWP Lifecycle (EPBD IV Art.7)</h2>
<table>
<tr><th style="width:35%">Parametru</th><th style="width:25%">Valoare</th><th style="width:40%">Observații</th></tr>
<tr><td>CO₂ operațional</td><td style="text-align:center;font-weight:bold">${renewSummary.co2_adjusted_m2.toFixed(1)} kg/m²·an</td><td>Din calcul Mc 001-2022</td></tr>
<tr><td>Carbon înglobat (estimare)</td><td style="text-align:center">${(function(){var yb=parseInt(building.yearBuilt)||2000; return yb>=2020?(["RI","RC","RA"].includes(building.category)?10:12):5;})().toFixed(0)} kg CO₂eq/m²·an</td><td>Estimare simplificată EN 15978 (50 ani)</td></tr>
<tr style="font-weight:bold;background:#e8edf5"><td>GWP Lifecycle Total</td><td style="text-align:center">${(function(){var co2O=renewSummary.co2_adjusted_m2; var gwpM=parseFloat(building.gwpLifecycle)||0; var yb=parseInt(building.yearBuilt)||2000; var emb=yb>=2020?(["RI","RC","RA"].includes(building.category)?10:12):5; return gwpM>0?gwpM:(co2O+emb);})().toFixed(1)} kg CO₂eq/m²·an</td><td>${Au>1000?'<span class="badge badge-warn">OBLIGATORIU (>1000 m²)</span>':'Opțional (obligatoriu >1000m² din 2028)'}</td></tr>
</table>
<div class="note">Conform EPBD IV Art.7, declararea GWP lifecycle devine obligatorie: clădiri noi >1000 m² din 2028, toate clădirile noi din 2030. Calculul complet necesită analiza ciclului de viață (LCA) conform EN 15978.</div>

<h2>6. Analiză cost-optimă simplificată</h2>
<div class="flex-row">
<div><div class="big">${annualCostEur.toFixed(0)} €</div><div class="lbl">Cost energie anual estimat</div></div>
<div><div class="big">${epF.toFixed(0)}</div><div class="lbl">kWh/m²·an (Ep)</div></div>
<div><div class="big">${renewSummary.co2_adjusted_m2.toFixed(1)}</div><div class="lbl">kg CO₂/m²·an</div></div>
</div>
<div class="note"><strong>Metodă cost-optimă:</strong> Pentru atingerea nZEB, se recomandă prioritizarea măsurilor cu raportul economie/investiție cel mai favorabil: (1) termoizolarea anvelopei opace, (2) înlocuirea tâmplăriei, (3) pompe de căldură/PV, (4) ventilare cu recuperare. Analiza cost-optimă detaliată necesită calcul conform Regulamentului Delegat UE 244/2012.</div>

<h2>7. Cadru legislativ aplicabil</h2>
<div class="note" style="line-height:1.6">
<strong>Legislație națională:</strong> Legea 372/2005 privind performanța energetică a clădirilor (mod. Legea 238/2024 + OUG 59/2025 RED III); Mc 001-2022 (Ord. MDLPA 16/2023); C107/2005 + Ord. 2641/2017; I5-2022 (ventilare și climatizare); SR 4839:2014 (date climatice).<br>
<strong>Legislație europeană:</strong> Directiva UE 2024/1275 (EPBD IV) — termen transpunere 29 mai 2026; Reg. Delegat UE 2025/2273 (republicare metodologie cost-optimă, referință 50 kWh/m²·an); SR EN ISO 52000-1:2017/NA:2023; SR EN ISO 52003-1:2017/NA:2023; SR EN ISO 52010-1:2017/NA:2023; SR EN ISO 52016-1:2017/NA:2023; SR EN ISO 52018-1:2018/NA:2023; SR EN 12831-1:2017/NA:2022 (+C91:2024); SR EN 16798-1:2019/NA:2019; SR EN ISO 13790; I5-2022 (ventilare).<br>
<strong>Praguri nZEB categoria ${building.category}:</strong> Ep < ${getNzebEpMax(building.category, selectedClimate?.zone)} kWh/m²·an, RER ≥ ${nzeb.rer_min}%, RER on-site ≥ ${NZEB_THRESHOLDS[building.category]?.rer_onsite_min || 10}%.<br>
<strong>Notă:</strong> Acest raport este generat automat și are caracter orientativ. Nu înlocuiește raportul de audit energetic elaborat de un auditor atestat MDLPA.
</div>

<div style="display:flex;justify-content:space-between;margin-top:15px;font-size:8pt">
<div><strong>Auditor:</strong> ${auditor.name || "________"}<br>Atestat: ${auditor.atestat || "____"} / Gr. ${auditor.grade}</div>
<div style="text-align:center;border:1px dashed #999;padding:4px 20px;min-height:40px;font-size:6pt;color:#999">Semnătura / ștampila</div>
</div>

<div class="ft">Raport nZEB generat cu EnergoPro Mc001 v1.0 | ${dateNow} | L.372/2005 mod. L.238/2024, Mc 001-2022</div>
</body></html>`;

                    setNzebReportHtml(nzebHtml);
                    showToast("Raport nZEB generat.", "success");
                    } catch(e) { showToast("Eroare raport nZEB: " + e.message, "error", 6000); }
                  }}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 transition-all text-sm mt-3">
                    <span className="text-lg">📋</span> Raport conformare nZEB (L.238/2024)
                    {!canNzebReport && <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">PRO</span>}
                  </button>

                  {/* nZEB Report as downloadable HTML file */}
                  {nzebReportHtml && (
                    <button onClick={function() {
                      try {
                        const blob = new Blob([nzebReportHtml], {type:"text/html;charset=utf-8"});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "Raport_nZEB_" + (building.address||"cladire").replace(/[^a-zA-Z0-9]/g,"_").slice(0,30) + "_" + new Date().toISOString().slice(0,10) + ".html";
                        document.body.appendChild(a); a.click();
                        setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                        showToast("Raport nZEB descărcat ca HTML (deschide în browser → Print → Save as PDF)", "success", 5000);
                      } catch(e) { showToast("Eroare: " + e.message, "error"); }
                    }}
                      className="w-full flex items-center justify-center gap-3 px-4 py-2 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] text-emerald-400/70 hover:bg-emerald-500/10 transition-all text-xs">
                      <span>💾</span> Descarcă raport nZEB (.html → Print to PDF)
                    </button>
                  )}

                  {/* ───────────────────────────────────────────────────────────────
                      RAPORT DE CONFORMARE nZEB — PDF OFICIAL
                      Art. 6 alin. (1) lit. c) Ord. MDLPA 348/2026
                      Conținut-cadru Mc 001-2022 §2.4 + Legea 238/2024 Art.6
                      Emis de auditor energetic Grad I (AE Ici)
                  ─────────────────────────────────────────────────────────────── */}
                  <button onClick={async function() {
                    if (!canNzebReport) { requireUpgrade("Raport conformare nZEB necesită plan Starter+"); return; }
                    if (!instSummary || !renewSummary) { showToast("Completați pașii 1-5 pentru raport conformare nZEB.", "error"); return; }
                    if (!selectedClimate?.zone) { showToast("Selectați o localitate climatică (Pasul 1).", "error"); return; }
                    try {
                      showToast("Se generează raportul de conformare nZEB (PDF oficial)...", "info", 3500);
                      const projectPhase = building?.scopCpe === "renovare" ? "renovare" : (building?.yearBuilt && parseInt(building.yearBuilt) >= new Date().getFullYear() ? "proiectare" : "audit");
                      await generateNZEBConformanceReport({
                        building, selectedClimate, instSummary, renewSummary, envelopeSummary,
                        opaqueElements, glazingElements,
                        heating, cooling, ventilation, lighting, acm,
                        solarThermal, photovoltaic, heatPump, biomass,
                        auditor, projectPhase,
                        download: true,
                      });
                      showToast("✓ Raport de conformare nZEB generat cu succes (PDF oficial)", "success", 3500);
                    } catch (e) {
                      showToast("Eroare la generarea raportului: " + e.message, "error", 6000);
                    }
                  }}
                    className="w-full flex items-start gap-3 px-5 py-3.5 rounded-xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-emerald-500/5 text-amber-300 hover:from-amber-500/15 hover:to-emerald-500/10 hover:border-amber-500/50 transition-all mt-3 group">
                    <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">📜</span>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-bold text-amber-200 flex items-center gap-2 flex-wrap">
                        Raport conformare nZEB — PDF oficial
                        {!canNzebReport && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">PRO</span>}
                        {auditor?.grade && (() => {
                          const g = String(auditor.grade).trim().toUpperCase();
                          const isGradeOne = g === "I" || g === "1" || g.includes("AE ICI") || g.includes("GRAD I");
                          return !isGradeOne;
                        })() && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300" title="Raport rezervat auditorilor Grad I (AE Ici)">⚠ Grad I necesar</span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/50 mt-0.5">
                        Art. 6 alin. (1) lit. c) Ord. MDLPA 348/2026 · conținut-cadru Mc 001-2022 · 4-5 pagini A4
                      </div>
                      <div className="text-[10px] text-white/35 mt-0.5">
                        Verdict EP/RER/RER on-site · recomandări prioritizate · declarație auditor · semnătură
                      </div>
                    </div>
                  </button>

                  {/* Banner informativ pentru clădiri atipice (Mc 001-2022: "alte destinații") */}
                  {baseCatResolved === "AL" && (
                    <div className="rounded-xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-3 text-[11px] leading-relaxed">
                      <div className="flex items-start gap-2">
                        <span className="text-base shrink-0">⚠️</span>
                        <div className="flex-1 space-y-1">
                          <div className="font-bold text-amber-200">
                            {lang === "EN"
                              ? "Atypical building (Mc 001-2022: \"other destinations\")"
                              : "Clădire atipică (Mc 001-2022: „alte destinații\")"}
                          </div>
                          <div className="text-white/75">
                            {lang === "EN"
                              ? "Thresholds A+...G are not imposed by MDLPA for this category. The reference building (ep_ref) is calculated dynamically from the real building data. The auditor fills in the energy class scale manually or omits the classification."
                              : "Pragurile A+...G nu sunt impuse de MDLPA pentru această categorie. Clădirea de referință (ep_ref) se calculează dinamic din datele clădirii reale. Auditorul completează manual scala clasei energetice sau omite clasificarea."}
                          </div>
                          <div className="text-white/45 text-[10px] pt-1">
                            {lang === "EN"
                              ? "Ref: Mc 001-2022 cap. 5 — buildings with \"other destinations\" are explicitly excluded from tables 5.7 ... 5.14."
                              : "Referință: Mc 001-2022 cap. 5 — clădirile cu „alte destinații\" sunt excluse explicit din tabelele 5.7 ... 5.14."}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button onClick={async function() {
                    try {
                      setDocxRendering(true);
                      setDocxRendered(false);
                      // Audit 2 mai 2026 — P0.5: reset buffer la fiecare regenerare,
                      // ca să nu păstrăm stale data dintr-un preview anterior.
                      setPdfPreviewBuffer(null);
                      showToast("Se generează preview CPE...", "info", 4000);
                      const tpl = CPE_TEMPLATES[building.category] || CPE_TEMPLATES.AL;
                      const buf = await fetchTemplate(tpl.cpe);
                      const docxBlob = await generateDocxCPE(buf, "cpe", {download: false});

                      // ── Încearcă preview server-side (Gotenberg PDF sau Office Online) ──
                      // PUBLIC_API_MODE=1 pe server bypass-ează auth → trimitem request
                      // fără token. Dacă user e logat, trimitem și token (viitor util).
                      let authToken = null;
                      try {
                        if (supabase) {
                          const { data: { session } } = await supabase.auth.getSession();
                          authToken = session?.access_token || null;
                        }
                      } catch { /* ignore */ }

                      if (docxBlob) {
                        try {
                          // În DEV local (Vite) endpoint-ul /api/* nu e servit → folosim
                          // prod direct (CORS allowlist include localhost:5173).
                          const apiBase = import.meta.env.DEV ? "https://energy-app-ruby.vercel.app" : "";
                          const headers = {};
                          if (authToken) headers.Authorization = `Bearer ${authToken}`;
                          const previewResp = await fetch(apiBase + "/api/preview-document", {
                            method: "POST",
                            headers,
                            body: docxBlob,
                          });
                          if (previewResp.ok) {
                            const ct = previewResp.headers.get("content-type") || "";
                            if (ct.includes("application/pdf")) {
                              // Gotenberg → PDF direct
                              // Audit 2 mai 2026 — P0.5: pasăm ArrayBuffer la PDFViewer
                              // (evită range requests pe blob URL care eșuează pe Vercel HTTPS).
                              // Păstrăm și blob URL pentru orice path de download legacy.
                              const pdfBlob = await previewResp.blob();
                              const pdfBuf = await pdfBlob.arrayBuffer();
                              setPdfPreviewBuffer(pdfBuf);
                              if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
                              const url = URL.createObjectURL(pdfBlob);
                              setPdfPreviewUrl(url);
                              setDocxRendered(true);
                              setDocxRendering(false);
                              showToast("Preview PDF generat", "success", 1500);
                              return;
                            } else if (ct.includes("application/json")) {
                              // Vercel Blob → Office Online Viewer
                              const json = await previewResp.json();
                              if (json.viewerUrl) {
                                if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
                                setPdfPreviewBuffer(null); // viewer URL → nu folosim PDFViewer cu data
                                setPdfPreviewUrl(json.viewerUrl);
                                setDocxRendered(true);
                                setDocxRendering(false);
                                showToast("Preview generat (Office Online)", "success", 1500);
                                return;
                              }
                            }
                          }
                        } catch (apiErr) {
                          console.warn("preview-document API error, falling back to docx-preview:", apiErr.message);
                        }
                      }

                      // ── Fallback: docx-preview în browser ──
                      if (docxBlob && docxPreviewRef.current) {
                        const container = docxPreviewRef.current;
                        container.innerHTML = "";
                        await renderAsync(docxBlob, container, null, {
                          className: "docx-preview-content",
                          inWrapper: true,
                          ignoreWidth: false,
                          ignoreHeight: true,
                          ignoreFonts: false,
                          breakPages: true,
                          useBase64URL: true,
                          experimental: true,
                        });

                        // Stilizare fundal
                        const styleEl = document.createElement('style');
                        styleEl.textContent = `
                          .docx-preview-content .docx-wrapper { background:#e8e8e8!important; padding:12px!important; min-width:0!important; }
                          .docx-preview-content .docx-wrapper section.page { position:relative!important; box-shadow:0 2px 8px rgba(0,0,0,0.2); margin-bottom:12px!important; overflow:visible!important; }
                        `;
                        container.appendChild(styleEl);

                        // Așteptăm render complet
                        await new Promise(r => setTimeout(r, 120));

                        // ── SCALARE RESPONSIVĂ ──
                        const outerBox = container.closest('.docx-preview-outer') || container.parentElement;
                        const wrapper = container.querySelector('.docx-preview-content-wrapper') || container.firstElementChild;
                        if (wrapper) {
                          const availW = outerBox.clientWidth - 8;
                          const natW = wrapper.scrollWidth;
                          if (natW > availW && availW > 0) {
                            const sc = availW / natW;
                            wrapper.style.transformOrigin = "top left";
                            wrapper.style.transform = `scale(${sc})`;
                            container.style.height = Math.ceil(wrapper.scrollHeight * sc) + "px";
                            container.style.overflow = "hidden";
                          }
                        }

                        // Săgețile EP / REF / CO2 sunt randate nativ din template-ul DOCX.
                        // Nu mai facem overlay JS — calculul de poziții era incompatibil cu
                        // transform:scale aplicat pe wrapper (rect-uri post-scalare + dublă scalare).

                        setDocxRendered(true);
                        showToast("Preview generat", "success", 1500);
                      }
                    } catch(e) {
                      showToast("Nu s-a putut genera preview-ul CPE.", "error", 3000);
                      console.error("DOCX preview error:", e);
                    } finally {
                      setDocxRendering(false);
                    }
                  }}
                    ref={previewBtnRef}
                    data-auto-preview="true"
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all text-sm">
                    {docxRendering
                      ? <><span className="animate-spin">⏳</span> {lang==="EN"?"Generating preview...":"Se generează preview..."}</>
                      : <><span className="text-lg">📄</span> {lang==="EN"?"Generate EPC Preview":"Generează Preview CPE"}</>
                    }
                  </button>

                  {/* Certificate counter */}
                  {userTier !== "free" && (
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2.5 text-[10px]">
                      <span className="opacity-50">{lang==="EN"?"Certificates this month":"Certificate luna aceasta"}</span>
                      <span className="font-bold">{certCount} / {tier.maxCerts === 999 ? "∞" : tier.maxCerts}</span>
                    </div>
                  )}

                  {/* #20 Mod prezentare */}
                  <button onClick={() => setPresentationMode(true)}
                    disabled={!instSummary}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-xs opacity-60 hover:opacity-100 transition-all">
                    <span>🖥️</span> Mod prezentare (ecran complet)
                  </button>

                </div>

                {/* Preview CPE + Anexa preview — coloana 2+3 */}
                <div className="xl:col-span-2 space-y-5">
                  <div>
                    <Card title={t("Preview Certificat",lang)} className="border-amber-500/30 shadow-lg shadow-amber-500/5">
                      <div className="docx-preview-outer rounded-lg overflow-hidden"
                        style={{minHeight: docxRendered ? undefined : "320px", height: docxRendered ? "85vh" : undefined, position: "relative", background: "#e8e8e8"}}>

                        {/* Placeholder — niciun preview generat */}
                        {!docxRendered && !docxRendering && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center pointer-events-none">
                            <div className="text-5xl opacity-30">📜</div>
                            <div className="text-sm opacity-40">
                              {lang==="EN" ? "Click \"Generate EPC Preview\" to see the certificate" : "Apasă \"Generează Preview CPE\" pentru a vedea certificatul"}
                            </div>
                          </div>
                        )}

                        {/* Loading */}
                        {docxRendering && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <div className="text-2xl animate-spin">⏳</div>
                            <div className="text-sm opacity-60 animate-pulse">
                              {lang==="EN" ? "Uploading & rendering certificate..." : "Se încarcă și randează certificatul..."}
                            </div>
                          </div>
                        )}

                        {/* Preview certificat — doar pentru vizualizare.
                            • blob PDF (Gotenberg) → randat prin PDF.js într-un canvas
                              controlat de noi (fără toolbar nativ Chrome → fără buton
                              descărcare/print indiferent de browser).
                            • Office Online viewer URL → iframe Microsoft (nu putem
                              ascunde controalele Microsoft; descărcarea oficială
                              rămâne pe butoanele "Generează CPE DOCX" / "Export PDF cu
                              QR" care includ codul unic CPE și restul aparatului).
                         */}
                        {docxRendered && (pdfPreviewBuffer || pdfPreviewUrl) && (
                          // Audit 2 mai 2026 — P0.5: prioritizăm ArrayBuffer (data) peste blob URL.
                          // PDF.js cu data + disableRange/disableStream evită eroarea
                          // „Unexpected server response (0)" pe Vercel HTTPS cu CSP strict.
                          pdfPreviewBuffer ? (
                            <Suspense fallback={
                              <div className="w-full flex items-center justify-center text-xs opacity-60" style={{height: "85vh"}}>
                                Se încarcă preview-ul…
                              </div>
                            }>
                              <PDFViewer data={pdfPreviewBuffer} height="85vh" title="Preview CPE" />
                            </Suspense>
                          ) : pdfPreviewUrl && pdfPreviewUrl.startsWith("blob:") ? (
                            <Suspense fallback={
                              <div className="w-full flex items-center justify-center text-xs opacity-60" style={{height: "85vh"}}>
                                Se încarcă preview-ul…
                              </div>
                            }>
                              <PDFViewer url={pdfPreviewUrl} height="85vh" title="Preview CPE" />
                            </Suspense>
                          ) : (
                            <iframe
                              src={pdfPreviewUrl}
                              className="w-full h-full border-0"
                              title="CPE Preview"
                              style={{display: "block", height: "85vh"}}
                            />
                          )
                        )}

                        {/* Fallback: docx-preview în browser (fără pdfPreviewUrl) */}
                        {!pdfPreviewUrl && (
                          <div className="w-full h-full overflow-auto"
                               style={{maxHeight: "85vh", display: docxRendered ? "block" : "none"}}>
                            <div ref={docxPreviewRef} className="docx-preview-wrapper" />
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* ── Anexa 1+2 MDLPA — câmpuri extinse (full-width între preview-uri) ── */}
                  {setBuilding && (
                    <Card title={lang === "EN" ? "📋 Annex 1+2 MDLPA — Extended Fields" : "📋 Anexa 1+2 MDLPA — câmpuri extinse"}>
                      <AnexaMDLPAFields
                        building={building}
                        setBuilding={setBuilding}
                        heating={heating}
                        cooling={cooling}
                        ventilation={ventilation}
                        acm={acm}
                        otherRenew={otherRenew}
                        lighting={lighting}
                        lang={lang}
                      />
                    </Card>
                  )}

                  {/* Anexa 1 + 2 preview — sub preview CPE */}
                  {instSummary && (
                    <Card title="📋 Anexa 1 + Anexa 2 CPE — Preview date complete">
                      <CpeAnexa
                        building={building}
                        heating={heating} cooling={cooling} ventilation={ventilation}
                        lighting={lighting} acm={acm}
                        solarThermal={solarThermal} photovoltaic={photovoltaic}
                        heatPump={heatPump} biomass={biomass}
                        instSummary={instSummary} renewSummary={renewSummary}
                        envelopeSummary={envelopeSummary}
                        opaqueElements={opaqueElements} glazingElements={glazingElements}
                        selectedClimate={selectedClimate}
                        auditor={auditor}
                        enClass={enClass} co2Class={co2Class}
                        epFinal={epFinal} co2Final={co2Final} rer={rer}
                        getNzebEpMax={getNzebEpMax}
                        bacsClass={bacsClass}
                        BUILDING_CATEGORIES={BUILDING_CATEGORIES} ELEMENT_TYPES={ELEMENT_TYPES}
                        HEAT_SOURCES={HEAT_SOURCES} ACM_SOURCES={ACM_SOURCES}
                        COOLING_SYSTEMS={COOLING_SYSTEMS} VENTILATION_TYPES={VENTILATION_TYPES}
                        LIGHTING_TYPES={LIGHTING_TYPES}
                        calcOpaqueR={calcOpaqueR}
                        lang={lang}
                      />
                    </Card>
                  )}
                </div>
              </div>

              {/* ═══ CHECKLIST COMPLETITUDINE CPE ═══
                  Audit 2 mai 2026 — P1.1: 6 itemi → 23 itemi (21 standard + 2 condiționali)
                  via modul centralizat `cpe-completeness.js`. Scorul include doar itemii
                  obligatorii (filtru `optional`), iar UI-ul afișează grupat pe 9 secțiuni
                  cu hint contextual pentru itemii condiționali (Cadastru, Apartamente). */}
              {(() => {
                const ctx = {
                  building, selectedClimate, opaqueElements, glazingElements,
                  heating, acm, instSummary, renewSummary, auditor,
                };
                const r = getCpeCompletenessScore(ctx);
                const groups = groupCompletenessItems(r.items);
                const groupOrder = [
                  "Identificare", "Geometrie", "Climatică",
                  "Anvelopă", "Instalații", "Calcul",
                  "Auditor", "Cadastru", "Multi-apartament",
                ];
                const barColor = r.allDone ? "#22c55e" : r.pct >= 70 ? "#eab308" : "#f97316";

                return (
                  <div className={`mt-5 rounded-xl border p-4 ${r.allDone ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/20 bg-white/[0.02]"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`text-xs font-semibold ${r.allDone ? "text-emerald-400" : "text-amber-400"}`}>
                        {r.allDone ? "✓ Date complete pentru generare CPE" : "Completitudine date CPE DOCX"}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold" style={{color: barColor}}>
                          {r.score}/{r.total} câmpuri obligatorii completate
                        </span>
                        <span className="text-[10px] opacity-40">({r.pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: r.pct + "%", background: barColor }}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {groupOrder.filter((g) => groups[g]).map((g) => (
                        <div key={g} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5">{g}</div>
                          <div className="space-y-0.5">
                            {groups[g].map((item, i) => (
                              <div key={i} className="flex items-start gap-1.5" title={item.hint || ""}>
                                <span className={`text-[11px] flex-shrink-0 mt-px ${
                                  item.optional
                                    ? (item.ok ? "text-emerald-400/60" : "text-white/25")
                                    : (item.ok ? "text-emerald-400" : "text-red-400/70")
                                }`}>
                                  {item.optional ? (item.ok ? "✓" : "○") : (item.ok ? "✓" : "○")}
                                </span>
                                <span className={`text-[11px] leading-snug ${
                                  item.optional ? "opacity-40 italic" : (item.ok ? "opacity-75" : "opacity-50")
                                }`}>
                                  {item.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {r.missing.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.06] text-[10px] opacity-50">
                        <strong className="opacity-80">Lipsă obligatorie ({r.missing.length}):</strong>{" "}
                        {r.missing.map((m) => m.label).join(" · ")}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ═══ EXPORT DOCX OFICIAL — full-width sub grid ═══ */}
              {/* Sprint D Task 2: blocaj hard export oficial dacă cadastru ANCPI neverificat
                  Audit 2 mai 2026 — P1.7: banner-ul amber apare DOAR pentru scopuri care
                  necesită ANCPI (vânzare/închiriere/renovare). Pentru recepție/construire/
                  informare/alt afișăm un info-banner discret (regim juridic nu se aplică). */}
              {(() => {
                const scop = building?.scopCpe || "vanzare";
                const scopLabels = {
                  vanzare: lang === "EN" ? "sale" : "vânzare",
                  inchiriere: lang === "EN" ? "rental" : "închiriere",
                  receptie: lang === "EN" ? "new building reception" : "recepție clădire nouă",
                  construire: lang === "EN" ? "construction" : "construire",
                  informare: lang === "EN" ? "owner information" : "informare proprietar",
                  renovare: lang === "EN" ? "renovation" : "renovare",
                  renovare_majora: lang === "EN" ? "major renovation" : "renovare majoră",
                  alt: lang === "EN" ? "other" : "alt scop",
                };
                const scopLabel = scopLabels[scop] || scop;
                const ancpiRequired = ANCPI_REQUIRED_SCOPES.includes(scop);
                const ancpiVerified = !!building?.ancpi?.verified;

                if (ancpiRequired && !ancpiVerified) {
                  return (
                    <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-base shrink-0 mt-0.5">🏛️</span>
                        <div className="text-xs text-amber-200">
                          <div className="font-semibold mb-0.5">
                            {lang === "EN" ? "Cadastre verification required" : "Verificare cadastru ANCPI obligatorie"}
                            {" "}<span className="text-[10px] opacity-70">(scop: {scopLabel})</span>
                          </div>
                          <div className="text-[11px] text-amber-300/90 leading-relaxed">
                            {lang === "EN"
                              ? `Official CPE export is blocked until you upload the CF extract PDF and confirm manual verification in Step 1 (ANCPI panel). The legal regime of the building must be confirmed before issuing the certificate for "${scopLabel}".`
                              : `Exportul CPE oficial este blocat până când încarci PDF-ul extrasului de carte funciară și confirmi verificarea manuală în Pas 1 (panou ANCPI). Regimul juridic al clădirii trebuie confirmat înainte de emiterea certificatului pentru „${scopLabel}".`}
                          </div>
                          {goToStep && (
                            <button
                              onClick={() => goToStep(1)}
                              className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 transition-colors"
                            >
                              → {lang === "EN" ? "Go to Step 1 — ANCPI verification" : "Mergi la Pas 1 — verificare ANCPI"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                if (!ancpiRequired) {
                  return (
                    <div className="mt-4 rounded-lg bg-white/[0.02] border border-white/[0.06] px-3 py-2">
                      <div className="text-[11px] opacity-60 italic flex items-center gap-2">
                        <span className="text-sm">ℹ️</span>
                        <span>
                          {lang === "EN"
                            ? `Cadastre verification (ANCPI) is optional for the selected scope ("${scopLabel}"). Export is unblocked.`
                            : `Verificarea cadastrului ANCPI nu este obligatorie pentru scopul selectat („${scopLabel}"). Exportul este permis.`}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              {(() => {
                const tpl = CPE_TEMPLATES[building.category] || CPE_TEMPLATES.AL;
                const ancpiVerified = !!building?.ancpi?.verified;
                // Audit 2 mai 2026 — P1.7: bypass ANCPI per scopCpe.
                // Pentru recepție/construire/informare/alt, regimul juridic ANCPI nu e
                // obligatoriu (clădirea e nouă/preliminar/uz intern). ANCPI rămâne
                // obligatoriu doar pentru vânzare/închiriere/renovare(majoră).
                const scop = building?.scopCpe || "vanzare";
                const ancpiOk = !ANCPI_REQUIRED_SCOPES.includes(scop) || ancpiVerified;
                const dataComplete = Au > 0 && instSummary && building.locality && building.category && ancpiOk;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-5">
                    <button
                      disabled={!dataComplete || isGeneratingDocx}
                      onClick={async () => {
                        if (isGeneratingDocx) return;
                        if (!canExportDocx) { requireUpgrade("Export DOCX CPE necesită plan Standard sau superior"); return; }
                        if (!dataComplete) { showToast("Completați datele obligatorii (Au, localitate, categorie, instalații)", "error"); return; }
                        setIsGeneratingDocx(true);
                        try {
                          showToast("Se generează CPE DOCX...", "info", 2000);
                          const buf = await fetchTemplate(tpl.cpe);
                          await generateDocxCPE(buf, "cpe");
                        } catch(e) {
                          showToast("Eroare: " + e.message, "error", 5000);
                        } finally {
                          setIsGeneratingDocx(false);
                        }
                      }}
                      className={`w-full rounded-xl border transition-all text-sm ${
                        !dataComplete || isGeneratingDocx
                          ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                          : !canExportDocx
                            ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 cursor-pointer"
                            : "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-center gap-2 px-4 py-3">
                        <span className="text-lg">{isGeneratingDocx ? "⏳" : "📋"}</span>
                        <div className="text-left">
                          <div className="font-medium flex items-center gap-1.5">
                            {isGeneratingDocx
                              ? (lang==="EN" ? "Generating…" : "Se generează…")
                              : (lang==="EN" ? "Generate CPE DOCX" : "Generează CPE DOCX")}
                            {!canExportDocx && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">STANDARD+</span>}
                          </div>
                          <div className="text-[10px] opacity-60">{tpl.cpe}</div>
                        </div>
                      </div>
                    </button>
                    <button
                      disabled={!dataComplete || isGeneratingDocx}
                      onClick={async () => {
                        if (isGeneratingDocx) return;
                        if (!canExportDocx) { requireUpgrade("Export DOCX Anexe necesită plan Standard sau superior"); return; }
                        if (!dataComplete) { showToast("Completați datele obligatorii", "error"); return; }
                        setIsGeneratingDocx(true);
                        try {
                          showToast("Se generează Anexa DOCX...", "info", 2000);
                          const buf = await fetchTemplate(tpl.anexa);
                          await generateDocxCPE(buf, "anexa");
                        } catch(e) {
                          showToast("Eroare: " + e.message, "error", 5000);
                        } finally {
                          setIsGeneratingDocx(false);
                        }
                      }}
                      className={`w-full rounded-xl border transition-all text-sm ${
                        !dataComplete || isGeneratingDocx
                          ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                          : !canExportDocx
                            ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 cursor-pointer"
                            : "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-center gap-2 px-4 py-3">
                        <span className="text-lg">{isGeneratingDocx ? "⏳" : "📎"}</span>
                        <div className="text-left">
                          <div className="font-medium flex items-center gap-1.5">
                            {isGeneratingDocx
                              ? (lang==="EN" ? "Generating…" : "Se generează…")
                              : (lang==="EN" ? "Generate Annex 1+2 DOCX" : "Generează Anexa 1+2 DOCX")}
                            {!canExportDocx && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">STANDARD+</span>}
                          </div>
                          <div className="text-[10px] opacity-60">{tpl.anexa}</div>
                        </div>
                      </div>
                    </button>
                    {/* Etapa 4 (BUG-4) — Anexa Bloc multi-apartament: vizibil doar dacă există apartamente */}
                    {(building?.apartments || []).length > 0 && (
                      <button
                        disabled={!dataComplete || isGeneratingDocx}
                        onClick={async () => {
                          if (isGeneratingDocx) return;
                          if (!canExportDocx) { requireUpgrade("Export Anexa Bloc necesită plan Standard sau superior"); return; }
                          if (!dataComplete) { showToast("Completați datele obligatorii", "error"); return; }
                          setIsGeneratingDocx(true);
                          try {
                            const aptCount = (building.apartments || []).length;
                            showToast(`Se generează Anexa Bloc DOCX (${aptCount} apartamente)...`, "info", 2000);
                            const buf = await fetchTemplate(tpl.anexa);
                            await generateDocxCPE(buf, "anexa_bloc");
                          } catch(e) {
                            showToast("Eroare: " + e.message, "error", 5000);
                          } finally {
                            setIsGeneratingDocx(false);
                          }
                        }}
                        className={`w-full rounded-xl border transition-all text-sm ${
                          !dataComplete || isGeneratingDocx
                            ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                            : !canExportDocx
                              ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 cursor-pointer"
                              : "border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 cursor-pointer"
                        }`}>
                        <div className="flex items-center justify-center gap-2 px-4 py-3">
                          <span className="text-lg">{isGeneratingDocx ? "⏳" : "🏢"}</span>
                          <div className="text-left">
                            <div className="font-medium flex items-center gap-1.5">
                              {isGeneratingDocx
                                ? (lang==="EN" ? "Generating…" : "Se generează…")
                                : (lang==="EN"
                                  ? `Generate Block Annex DOCX (${(building.apartments || []).length} apt.)`
                                  : `Generează Anexa Bloc DOCX (${(building.apartments || []).length} ap.)`)}
                              {!canExportDocx && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">STANDARD+</span>}
                            </div>
                            <div className="text-[10px] opacity-60">
                              {lang==="EN"
                                ? "Annex 2 + per-apartment table + common systems"
                                : "Anexa 2 + tabel apartamente + sisteme comune"}
                            </div>
                          </div>
                        </div>
                      </button>
                    )}
                    <button
                      onClick={generateXMLMDLPA}
                      disabled={!instSummary}
                      className={`w-full rounded-xl border transition-all text-sm ${
                        !instSummary
                          ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-center gap-2 px-4 py-3">
                        <span className="text-lg">📤</span>
                        <div className="text-left">
                          <div className="font-medium">Export XML MDLPA</div>
                          <div className="text-[10px] opacity-60">Registru electronic Ord. 16/2023</div>
                        </div>
                      </div>
                    </button>

                    {/* Audit 2 mai 2026 — P2.7: Buton „Generează pachet complet"
                        Bundlează toate exporturile într-un ZIP unic:
                          - CPE DOCX (mereu)
                          - Anexa 1+2 DOCX (mereu)
                          - Anexa Bloc DOCX (dacă apartments > 0)
                          - XML MDLPA (mereu)
                          - Raport nZEB DOCX (dacă plan permite)
                        Util pentru auditori care depun pachetul integral
                        la beneficiar / OAR / Primărie într-o singură arhivă. */}
                    <button
                      disabled={!dataComplete || isGeneratingDocx}
                      onClick={async () => {
                        if (isGeneratingDocx) return;
                        if (!canExportDocx) { requireUpgrade("Pachet complet necesită plan Standard sau superior"); return; }
                        if (!dataComplete) { showToast("Completați datele obligatorii", "error"); return; }
                        setIsGeneratingDocx(true);
                        try {
                          showToast(lang === "EN" ? "Building complete package…" : "Se construiește pachetul complet…", "info", 3000);
                          const { default: JSZip } = await import("jszip");
                          const zip = new JSZip();
                          const dateSlug = new Date().toISOString().slice(0, 10);
                          const addrSlug = (building.address || "proiect").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);

                          // 1. CPE DOCX
                          const tplBuf1 = await fetchTemplate(tpl.cpe);
                          const cpeBlob = await generateDocxCPE(tplBuf1, "cpe", { download: false });
                          if (cpeBlob) zip.file(`1_CPE_${addrSlug}_${dateSlug}.docx`, cpeBlob);

                          // 2. Anexa 1+2 DOCX
                          const tplBuf2 = await fetchTemplate(tpl.anexa);
                          const anexaBlob = await generateDocxCPE(tplBuf2, "anexa", { download: false });
                          if (anexaBlob) zip.file(`2_Anexa_${addrSlug}_${dateSlug}.docx`, anexaBlob);

                          // 3. Anexa Bloc DOCX (dacă există apartamente)
                          if ((building.apartments || []).length > 0) {
                            const tplBuf3 = await fetchTemplate(tpl.anexa);
                            const blocBlob = await generateDocxCPE(tplBuf3, "anexa_bloc", { download: false });
                            if (blocBlob) zip.file(`3_Anexa_Bloc_${addrSlug}_${dateSlug}.docx`, blocBlob);
                          }

                          // 4. XML MDLPA — generez inline (replică generateXMLMDLPA fără download)
                          try {
                            const escx = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
                            const validDateXml = auditor.date ? auditor.date.split("-").reverse().join(".") : new Date().toISOString().slice(0, 10).split("-").reverse().join(".");
                            const expDateObj2 = getExpiryDate(auditor.date || new Date(), enClass?.cls);
                            const expDateXml = expDateObj2 ? expDateObj2.toISOString().slice(0, 10).split("-").reverse().join(".") : "";
                            const validityYearsXml2 = getValidityYears(enClass?.cls);
                            const xmlMin = `<?xml version="1.0" encoding="UTF-8"?>
<CertificatPerformantaEnergetica xmlns="urn:ro:mdlpa:certificat-performanta-energetica:2023" versiune="1.0">
  <DateIdentificare>
    <CodUnic>${escx(auditor.mdlpaCode)}</CodUnic>
    <CodCPE>${escx(auditor.cpeCode || auditor.mdlpaCode || "")}</CodCPE>
    <DataElaborare>${validDateXml}</DataElaborare>
    <DataExpirare>${expDateXml}</DataExpirare>
    <ValabilitateAni>${validityYearsXml2}</ValabilitateAni>
    <NormativValabilitate>L.372/2005 republicată mod. L.238/2024 Art. 18</NormativValabilitate>
    <ScopElaborare>${escx(building.scopCpe || "vanzare")}</ScopElaborare>
    <ProgramCalcul>ZEPHREN ${APP_VERSION}</ProgramCalcul>
  </DateIdentificare>
  <Cladire>
    <Categorie>${escx(building.category)}</Categorie>
    <Adresa>${escx(building.address)}</Adresa>
    <ArieUtila unit="mp">${Au.toFixed(1)}</ArieUtila>
  </Cladire>
  <RezultateEnergetice>
    <EnergiePrimaraSpecifica unit="kWh_per_mp_an">${epFinal.toFixed(1)}</EnergiePrimaraSpecifica>
    <ClasaEnergetica>${enClass?.cls || ""}</ClasaEnergetica>
  </RezultateEnergetice>
</CertificatPerformantaEnergetica>`;
                            zip.file(`4_XML_MDLPA_${addrSlug}_${dateSlug}.xml`, xmlMin);
                          } catch { /* XML opt — ZIP rămâne valid fără el */ }

                          // 5. Raport nZEB (dacă HTML deja generat în state — opțional)
                          if (nzebReportHtml) {
                            zip.file(`5_Raport_nZEB_${addrSlug}_${dateSlug}.html`, nzebReportHtml);
                          }

                          // README
                          zip.file("README.txt", [
                            "PACHET COMPLET CPE — generat de Zephren",
                            `Data generare: ${new Date().toISOString()}`,
                            `Adresă clădire: ${building.address || "—"}`,
                            `Auditor: ${auditor.name || "—"} (atestat ${auditor.atestat || "—"})`,
                            `Cod CPE: ${auditor.cpeCode || auditor.mdlpaCode || "—"}`,
                            "",
                            "Conținut:",
                            "  1_CPE — Certificatul de Performanță Energetică (DOCX, format MDLPA)",
                            "  2_Anexa — Anexa 1+2 (date tehnice + recomandări)",
                            ((building.apartments || []).length > 0) ? "  3_Anexa_Bloc — Tabel multi-apartament (RC)" : "",
                            "  4_XML_MDLPA — Format registru electronic (Ord. 16/2023)",
                            nzebReportHtml ? "  5_Raport_nZEB — Raport conformare nZEB (HTML)" : "",
                            "",
                            "Cadru legal: L.372/2005 republicată (modif. L.238/2024), Mc 001-2022 (Ord. MDLPA 16/2023).",
                            "Atestare auditor: Ord. MDLPA 348/2026 (intrat în vigoare 14.04.2026).",
                            "",
                            "Audit Zephren — 2 mai 2026 / P2.7 (pachet complet ZIP).",
                          ].filter(Boolean).join("\n"));

                          const zipBlob = await zip.generateAsync({ type: "blob" });
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(zipBlob);
                          a.download = `CPE_pachet_complet_${addrSlug}_${dateSlug}.zip`;
                          document.body.appendChild(a); a.click();
                          setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
                          showToast(lang === "EN" ? "Complete package generated ✓" : "Pachet complet generat ✓", "success", 3000);
                        } catch (e) {
                          console.error("complete package error:", e);
                          showToast("Eroare pachet: " + e.message, "error", 5000);
                        } finally {
                          setIsGeneratingDocx(false);
                        }
                      }}
                      className={`w-full rounded-xl border transition-all text-sm md:col-span-2 xl:col-span-3 ${
                        !dataComplete || isGeneratingDocx
                          ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                          : !canExportDocx
                            ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 cursor-pointer"
                            : "border-cyan-500/40 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 text-cyan-300 cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-center gap-2 px-4 py-3">
                        <span className="text-lg">{isGeneratingDocx ? "⏳" : "📦"}</span>
                        <div className="text-left">
                          <div className="font-medium flex items-center gap-1.5">
                            {isGeneratingDocx
                              ? (lang === "EN" ? "Generating package…" : "Se construiește pachetul…")
                              : (lang === "EN" ? "Generate complete package (ZIP)" : "Generează pachet complet (ZIP)")}
                            {!canExportDocx && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">STANDARD+</span>}
                          </div>
                          <div className="text-[10px] opacity-60">
                            {lang === "EN"
                              ? "CPE + Annex 1+2 + Block (if RC) + XML MDLPA + nZEB report (if available)"
                              : "CPE + Anexa 1+2 + Bloc (dacă RC) + XML MDLPA + Raport nZEB (dacă disponibil)"}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })()}

              {/* ═══ CLASE ENERGETICE PER APARTAMENT (doar RC — bloc colectiv) ═══ */}
              {(building.category === "RC") && (() => {
                const catKey = "RC" + (cooling.hasCooling ? "_cool" : "_nocool");
                const epBloc = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary?.ep_total_m2 || 0);
                const grid = ENERGY_CLASSES_DB[catKey] || ENERGY_CLASSES_DB["RC_nocool"];
                return (
                  <div className="mt-6">
                    <Card title="🏢 Clase energetice per apartament">
                      <div className="mb-3 text-[11px] opacity-50">
                        Calculul distribuie energia blocului pe fiecare apartament cu corecții pentru poziție termică (parter, colț, ultimul etaj) conform Mc 001-2022 Anexa 7.
                      </div>
                      <ApartmentClasses
                        epBuildingM2={epBloc}
                        thresholds={grid?.thresholds}
                        buildingArea={Au}
                        cn={cn}
                        showToast={showToast}
                      />
                    </Card>
                  </div>
                );
              })()}

              {/* Sprint Reorganizare Pas 5/6 (1 mai 2026) — secțiunea
                  "Conformitate EPBD 2024" (BACS+SRI+MEPS) mutată în Pas 5 (Calcul).
                  f_BAC ajustează EP final, deci aparține bilanțului energetic. */}

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
                <button onClick={() => setStep(5)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
                  ← Pas 5: Calcul
                </button>
                <button onClick={() => goToStep(7, 6)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all text-sm">
                  Pasul 7: Audit →
                </button>
              </div>
            </div>
            );
}
