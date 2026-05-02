// ═══════════════════════════════════════════════════════════════
// EXPORT DATE EPBD — Format XML compatibil EPBDcheck / Directiva 2024/1275
// Structura conform SR EN ISO 52000-1:2017 și Mc 001-2022
// Generează fișier XML descărcabil pentru importare în sisteme naționale
// ═══════════════════════════════════════════════════════════════

import { getValidityYears } from "../utils/cpe-validity.js";

// S30A·A4 — DH (termoficare) factor PE conform Tab A.16 SR EN ISO 52000-1/NA:2023.
const DH_FACTOR_PE_NREN = 0.92;

// S30A·A5 — versiune program centralizată (Vite env, fallback v3.5).
const APP_VERSION = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_APP_VERSION) || "v3.5";

// S30A·A8 — formatare consistentă pentru EP (kWh/(m²·an) → 1 zecimală).
function fmtSpec(v) {
  return (typeof v === "number" && isFinite(v)) ? +v.toFixed(1) : v;
}

function xmlEscape(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function tag(name, value, attrs) {
  const attrStr = attrs ? ' ' + Object.entries(attrs).map(([k,v]) => `${k}="${xmlEscape(v)}"`).join(' ') : '';
  if (value === null || value === undefined || value === '') return `<${name}${attrStr}/>`;
  return `<${name}${attrStr}>${xmlEscape(value)}</${name}>`;
}

export function generateEPBDXML(data) {
  const {
    building,       // date identificare clădire
    climate,        // date climatice
    instSummary,    // rezumat instalații
    renewSummary,   // rezumat regenerabile
    opaqueElements, // elemente opace
    glazingElements,// elemente vitrate
    energyClass,    // clasa energetică
    certDate,       // data certificat
    auditorName,    // nume auditor
    auditorCode,    // cod auditor
  } = data;

  const today = certDate || new Date().toISOString().split('T')[0];
  const epTotal = renewSummary?.ep_adjusted_m2 || instSummary?.ep_total_m2 || 0;
  const rer = renewSummary?.rer || 0;

  // ─── Secțiune anvelopă ───
  const envelopeXML = (opaqueElements || []).map(el => {
    const R = (el.layers || []).reduce((r, l) => r + ((parseFloat(l.thickness)||0)/1000) / (l.lambda||1), 0.17);
    const U = Math.round(1/Math.max(R, 0.05) * 1000) / 1000;
    return `      <BuildingElement type="${xmlEscape(el.type)}" name="${xmlEscape(el.name || el.type)}">
        ${tag('Area', el.area, {unit:'m2'})}
        ${tag('U_value', U, {unit:'W/(m2.K)'})}
        ${tag('TauAdiab', el.tau || 1.0)}
        <Layers count="${(el.layers||[]).length}">
${(el.layers||[]).map(l => `          <Layer>
            ${tag('Material', l.matName || l.material)}
            ${tag('Thickness', l.thickness, {unit:'mm'})}
            ${tag('Lambda', l.lambda, {unit:'W/(m.K)'})}
            ${tag('Density', l.rho, {unit:'kg/m3'})}
          </Layer>`).join('\n')}
        </Layers>
      </BuildingElement>`;
  }).join('\n');

  const glazingXML = (glazingElements || []).map(gl => `      <GlazingElement orientation="${xmlEscape(gl.orientation || 'S')}">
        ${tag('Area', gl.area, {unit:'m2'})}
        ${tag('U_window', gl.u, {unit:'W/(m2.K)'})}
        ${tag('g_value', gl.g)}
        ${tag('FrameRatio', gl.frameRatio, {unit:'pct'})}
        ${tag('Name', gl.name)}
      </GlazingElement>`).join('\n');

  // ─── Secțiune instalații ───
  // S30A·A4 — DH (TERMOFICARE) → combustibil "termoficare_mix" + fP_nren = 0.92 (Tab A.16 NA:2023).
  const isDH = instSummary?.heatingSource === "TERMOFICARE";
  const heatingFuelId = isDH ? "termoficare_mix" : (instSummary?.fuel?.id || instSummary?.heatingFuel || "");
  const heatingFpNren = isDH ? DH_FACTOR_PE_NREN : null;
  const instXML = instSummary ? `    <Systems>
      ${tag('HeatingSource', instSummary.heatingSource)}
      ${tag('HeatingFuel', heatingFuelId)}
      ${heatingFpNren !== null ? tag('HeatingFpNren', heatingFpNren) : ''}
      ${tag('HeatingEta', instSummary.eta_gen)}
      ${tag('EmissionSystem', instSummary.emissionSystem)}
      ${tag('DistributionEta', instSummary.eta_dist)}
      ${tag('ControlType', instSummary.controlType)}
      ${tag('VentilationType', instSummary.ventType)}
      ${tag('HREfficiency', instSummary.hrEta)}
      ${tag('ACMSource', instSummary.acmSource)}
      ${tag('CoolingSystem', instSummary.coolingSystem)}
      ${tag('LightingType', instSummary.lightingType)}
    </Systems>` : '';

  // ─── Secțiune energie ───
  // S30A·A8 — fmtSpec aplicat pentru toate valorile kWh/(m²·an) → 1 zecimală.
  const energyXML = `    <EnergyPerformance>
      ${tag('EP_total', fmtSpec(epTotal), {unit:'kWh/(m2.an)'})}
      ${tag('EP_heating', fmtSpec(instSummary?.ep_heating_m2), {unit:'kWh/(m2.an)'})}
      ${tag('EP_cooling', fmtSpec(instSummary?.ep_cooling_m2), {unit:'kWh/(m2.an)'})}
      ${tag('EP_ACM', fmtSpec(instSummary?.ep_acm_m2), {unit:'kWh/(m2.an)'})}
      ${tag('EP_lighting', fmtSpec(instSummary?.ep_light_m2), {unit:'kWh/(m2.an)'})}
      ${tag('RER', fmtSpec(rer), {unit:'pct'})}
      ${tag('EnergyClass', energyClass?.class || 'N/A')}
      ${tag('CO2_specific', fmtSpec(instSummary?.co2_m2), {unit:'kgCO2eq/(m2.an)'})}
    </EnergyPerformance>`;

  // S30A·A3 — valabilitate unificată: scaleVersion 2026 → EPBD (5/10), altfel Ord. 16/2023 (10).
  const validityYears = getValidityYears(energyClass?.class, {
    scopCpe: data.scopCpe || (building?.isNew === true ? "receptie" : undefined),
    scaleVersion: building?.scaleVersion || data.scaleVersion || "2023",
  });
  // S30A·A7 — cod poștal: building.postalCode preferat, fallback building.postal.
  const postalCode = building?.postalCode || building?.postal || "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Certificat Performanță Energetică — generat de Zephren ${APP_VERSION} -->
<!-- Cadru legal aplicat: L.372/2005 republicată mod. L.238/2024, Mc 001-2022 (Ord. MDLPA 16/2023), SR EN ISO 52000-1:2017/NA:2023 -->
<!-- Format derivat (cadru viitor): Directiva UE 2024/1275 (EPBD IV) — termen transpunere RO 29.05.2026; NU este transpus la data emiterii -->
<EnergyPerformanceCertificate xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  version="2024" country="RO" language="ro" generated="${today}">

  <BuildingIdentification>
    ${tag('Address', building?.address)}
    ${tag('City', building?.city)}
    ${tag('County', building?.county)}
    ${tag('PostalCode', postalCode)}
    ${tag('BuildingCategory', building?.category)}
    ${tag('YearBuilt', building?.yearBuilt)}
    ${tag('AreaUseful', building?.areaUseful, {unit:'m2'})}
    ${tag('Volume', building?.volume, {unit:'m3'})}
    ${tag('Floors', building?.floors)}
    ${tag('Structure', building?.structure)}
    ${tag('IsNew', building?.isNew ? 'true' : 'false')}
    ${tag('IsMajorRenovation', building?.isMajorRenov ? 'true' : 'false')}
  </BuildingIdentification>

  <ClimateData>
    ${tag('Station', climate?.name)}
    ${tag('ClimateZone', climate?.zone)}
    ${tag('ThetaE_design', climate?.theta_e, {unit:'degC'})}
    ${tag('NGZ', climate?.ngz, {unit:'grade.zile'})}
    ${tag('ThetaA_annual', climate?.theta_a, {unit:'degC'})}
    ${tag('Altitude', climate?.alt, {unit:'m'})}
    ${tag('Latitude', climate?.lat, {unit:'deg'})}
  </ClimateData>

  <BuildingEnvelope>
${envelopeXML}
${glazingXML}
  </BuildingEnvelope>

${instXML}

${energyXML}

  <Certification>
    ${tag('CertDate', today)}
    ${/* S30A·A3 — valabilitate unificată: 10 ani uniform (Ord. 16/2023) sau 5/10 EPBD 2026 */''}
    ${tag('ValidityYears', validityYears, {unit:'ani'})}
    ${tag('ValidUntil', today.replace(/^(\d{4})/, y => String(parseInt(y) + validityYears)))}
    ${tag('AuditorName', auditorName)}
    ${tag('AuditorCode', auditorCode)}
    ${tag('Software', `Zephren ${APP_VERSION} — zephren.energy`)}
  </Certification>

</EnergyPerformanceCertificate>`;

  return xml;
}

export function downloadXML(xmlString, filename) {
  const blob = new Blob([xmlString], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'cpe-epbd.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
