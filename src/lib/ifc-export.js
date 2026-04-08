/**
 * ifc-export.js — Export date energetice în format IFC 2x3 STEP
 *
 * Generează un fișier IFC minim valid cu:
 *   - IfcProject, IfcSite, IfcBuilding, IfcBuildingStorey, IfcSpace
 *   - IfcPropertySet "Pset_BuildingEnergyTarget" (EP, CO2, clasă energetică)
 *   - IfcPropertySet "Pset_ZephrenEnergyResults" (detalii calcul Zephren)
 *   - IfcPropertySet "Pset_BuildingCommon" (date generale clădire)
 *
 * Standard: IFC 2x3 TC1 (ISO 16739:2013) — format STEP (ISO 10303-21)
 *
 * Export: exportEnergyDataToIFC, IFC_ENERGY_PSET_TEMPLATE
 */

// ── Utilități ──────────────────────────────────────────────────────────────────

/** Generează un GUID IFC valid (format: 22 caractere base64-like) */
function generateIfcGuid() {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
  let guid = "";
  for (let i = 0; i < 22; i++) {
    guid += chars[Math.floor(Math.random() * chars.length)];
  }
  return guid;
}

/** Formatează un număr pentru STEP (virgulă engleză, max 4 zecimale) */
function fmt(val, decimals = 4) {
  if (val == null || isNaN(val)) return "$";
  return parseFloat(val.toFixed(decimals)).toString();
}

/** Scapă un string pentru STEP (apostroafe duble) */
function stepStr(str) {
  if (!str) return "''";
  return `'${String(str).replace(/'/g, "''")}'`;
}

/** Formatează data curentă în format IFC (YYYY-MM-DD) */
function ifcDate(date = new Date()) {
  return date.toISOString().split("T")[0];
}

/** Formatează timestamp IFC */
function ifcTimestamp(date = new Date()) {
  return Math.floor(date.getTime() / 1000);
}

// ── Template PropertySet energie ──────────────────────────────────────────────
/**
 * Template pentru proprietățile din Pset_BuildingEnergyTarget.
 * Poate fi utilizat de componente UI pentru a afișa câmpurile disponibile.
 */
export const IFC_ENERGY_PSET_TEMPLATE = {
  pset_name: "Pset_BuildingEnergyTarget",
  properties: [
    { name: "EnergyPerformanceClass",   type: "IfcLabel",   description: "Clasa energetică (A+, A, B, C, D, E, F, G)" },
    { name: "EPtotal",                  type: "IfcReal",    unit: "kWh/(m²·an)", description: "Consumul total de energie primară" },
    { name: "EPheating",                type: "IfcReal",    unit: "kWh/(m²·an)", description: "Energie primară încălzire" },
    { name: "EPcooling",                type: "IfcReal",    unit: "kWh/(m²·an)", description: "Energie primară răcire" },
    { name: "EPdomesticHotWater",       type: "IfcReal",    unit: "kWh/(m²·an)", description: "Energie primară apă caldă menajeră" },
    { name: "EPlighting",               type: "IfcReal",    unit: "kWh/(m²·an)", description: "Energie primară iluminat" },
    { name: "EPventilation",            type: "IfcReal",    unit: "kWh/(m²·an)", description: "Energie primară ventilație" },
    { name: "CO2emissions",             type: "IfcReal",    unit: "kgCO2/(m²·an)", description: "Emisii CO₂ echivalent" },
    { name: "ReferenceArea",            type: "IfcReal",    unit: "m²",           description: "Suprafața de referință (Au)" },
    { name: "EnergyRatingMethod",       type: "IfcLabel",   description: "Metodologie calcul (ex: MC001/2022)" },
    { name: "CertificateIssueDate",     type: "IfcDate",    description: "Data emiterii certificatului energetic" },
    { name: "CertificateValidUntil",    type: "IfcDate",    description: "Data expirării certificatului energetic" },
    { name: "AuditorName",             type: "IfcLabel",   description: "Numele auditorului energetic" },
    { name: "AuditorCertificate",      type: "IfcLabel",   description: "Nr. certificat auditor energetic" },
  ],
};

// ── Builder entități STEP ──────────────────────────────────────────────────────

class IfcBuilder {
  constructor() {
    this._lines  = [];  // linii STEP (DATA section)
    this._nextId = 1;   // contor ID entitate
  }

  /** Adaugă o linie STEP și returnează ID-ul entității */
  _add(definition) {
    const id = this._nextId++;
    this._lines.push(`#${id}=${definition};`);
    return id;
  }

  // ── Entități de bază ─────────────────────────────────────────────────────────

  addOwnerHistory(applicationName = "Zephren Energy App") {
    const personId = this._add(`IFCPERSON($,$,${stepStr(applicationName)},$,$,$,$,$)`);
    const orgId    = this._add(`IFCORGANIZATION($,${stepStr(applicationName)},$,$,$)`);
    const personOrgId = this._add(`IFCPERSONANDORGANIZATION(#${personId},#${orgId},$)`);
    const appOrgId    = this._add(`IFCORGANIZATION($,${stepStr("Zephren")},$,$,$)`);
    const appId       = this._add(
      `IFCAPPLICATION(#${appOrgId},'3.4',${stepStr(applicationName)},'ZEPHREN')`
    );
    const ownerId = this._add(
      `IFCOWNERHISTORY(#${personOrgId},#${appId},$,.ADDED.,$,#${personOrgId},#${appId},${ifcTimestamp()})`
    );
    return ownerId;
  }

  addUnit(type, name) {
    return this._add(`IFCSIUNIT(*,.${type}.,$.${name}.)`);
  }

  addUnitAssignment(unitIds) {
    const refs = unitIds.map(id => `#${id}`).join(",");
    return this._add(`IFCUNITASSIGNMENT((${refs}))`);
  }

  addGeometricRepresentationContext() {
    const worldCoordId = this._add(`IFCAXIS2PLACEMENT3D(#${this._add("IFCCARTESIANPOINT((0.,0.,0.))")},$,$)`);
    const ctxId = this._add(
      `IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-05,#${worldCoordId},$)`
    );
    return ctxId;
  }

  addProject(name, description, ownerHistoryId, unitAssignmentId, ctxId) {
    return this._add(
      `IFCPROJECT('${generateIfcGuid()}',#${ownerHistoryId},` +
      `${stepStr(name)},${stepStr(description)},` +
      `$,$,$,(#${ctxId}),#${unitAssignmentId})`
    );
  }

  addSite(name, ownerHistoryId, projectId, lat, lon) {
    // Latitudine/longitudine în format IFC CompoundPlaneAngleMeasure
    const latDMS  = _decimalToDMS(lat  ?? 44.43);
    const lonDMS  = _decimalToDMS(lon  ?? 26.10);
    const latStr  = `(${latDMS.d},${latDMS.m},${latDMS.s},0)`;
    const lonStr  = `(${lonDMS.d},${lonDMS.m},${lonDMS.s},0)`;
    const placeId = this._add(`IFCLOCALPLACEMENT($,#${this._add("IFCAXIS2PLACEMENT3D(#" + this._add("IFCCARTESIANPOINT((0.,0.,0.))") + ",$,$)")})`);
    const siteId  = this._add(
      `IFCSITE('${generateIfcGuid()}',#${ownerHistoryId},${stepStr(name)},` +
      `$,$,#${placeId},$,$,.ELEMENT.,$,${latStr},${lonStr},$,$)`
    );
    const relId = this._add(
      `IFCRELAGGREGATES('${generateIfcGuid()}',#${ownerHistoryId},$,$,#${projectId},(#${siteId}))`
    );
    void relId;
    return siteId;
  }

  addBuilding(name, description, ownerHistoryId, siteId, address) {
    const placeId = this._add(
      `IFCLOCALPLACEMENT($,#${this._add("IFCAXIS2PLACEMENT3D(#" + this._add("IFCCARTESIANPOINT((0.,0.,0.))") + ",$,$)")})`
    );
    const addrId = address
      ? this._add(
          `IFCPOSTALADDRESS($,$,$,${stepStr(address.street || "")},` +
          `$,${stepStr(address.city || "")},${stepStr(address.county || "")},` +
          `$,${stepStr(address.postalCode || "")},${stepStr("RO")})`
        )
      : null;

    const buildingId = this._add(
      `IFCBUILDING('${generateIfcGuid()}',#${ownerHistoryId},` +
      `${stepStr(name)},${stepStr(description)},` +
      `$,#${placeId},$,$,.ELEMENT.,${fmt(0)},${fmt(0)},` +
      `${addrId ? `#${addrId}` : "$"})`
    );
    this._add(
      `IFCRELAGGREGATES('${generateIfcGuid()}',#${ownerHistoryId},$,$,#${siteId},(#${buildingId}))`
    );
    return buildingId;
  }

  addBuildingStorey(name, elevation, ownerHistoryId, buildingId) {
    const placeId = this._add(
      `IFCLOCALPLACEMENT($,#${this._add("IFCAXIS2PLACEMENT3D(#" + this._add("IFCCARTESIANPOINT((0.,0.," + fmt(elevation, 2) + "))") + ",$,$)")})`
    );
    const storeyId = this._add(
      `IFCBUILDINGSTOREY('${generateIfcGuid()}',#${ownerHistoryId},` +
      `${stepStr(name)},$,$,#${placeId},$,$,.ELEMENT.,${fmt(elevation, 2)})`
    );
    this._add(
      `IFCRELAGGREGATES('${generateIfcGuid()}',#${ownerHistoryId},$,$,#${buildingId},(#${storeyId}))`
    );
    return storeyId;
  }

  addSpace(name, area, ownerHistoryId, storeyId) {
    const placeId = this._add(
      `IFCLOCALPLACEMENT($,#${this._add("IFCAXIS2PLACEMENT3D(#" + this._add("IFCCARTESIANPOINT((0.,0.,0.))") + ",$,$)")})`
    );
    const spaceId = this._add(
      `IFCSPACE('${generateIfcGuid()}',#${ownerHistoryId},` +
      `${stepStr(name)},$,$,#${placeId},$,$,.ELEMENT.,.INTERNAL.,` +
      `${fmt(area, 2)})`
    );
    this._add(
      `IFCRELAGGREGATES('${generateIfcGuid()}',#${ownerHistoryId},$,$,#${storeyId},(#${spaceId}))`
    );
    return spaceId;
  }

  // ── PropertySet helpers ──────────────────────────────────────────────────────

  /** Adaugă o proprietate IfcPropertySingleValue */
  addProperty(name, value, valueType = "IFCLABEL") {
    let valueStr;
    if (value == null) {
      valueStr = "$";
    } else if (valueType === "IFCREAL" || valueType === "IFCINTEGER") {
      valueStr = `${valueType}(${fmt(value)})`;
    } else {
      valueStr = `${valueType}(${stepStr(String(value))})`;
    }
    return this._add(
      `IFCPROPERTYSINGLEVALUE(${stepStr(name)},$,${valueStr},$)`
    );
  }

  /** Adaugă un IfcPropertySet și îl asociază cu entitățile date */
  addPropertySet(psetName, propIds, ownerHistoryId, entityIds) {
    const propsStr = propIds.map(id => `#${id}`).join(",");
    const psetId   = this._add(
      `IFCPROPERTYSET('${generateIfcGuid()}',#${ownerHistoryId},` +
      `${stepStr(psetName)},$,(${propsStr}))`
    );
    const entStr = entityIds.map(id => `#${id}`).join(",");
    this._add(
      `IFCRELDEFINESBYPROPERTIES('${generateIfcGuid()}',#${ownerHistoryId},$,$,` +
      `(${entStr}),#${psetId})`
    );
    return psetId;
  }

  /** Returnează liniile DATA colectate */
  getLines() {
    return this._lines;
  }
}

// ── Helper coordonate ─────────────────────────────────────────────────────────
function _decimalToDMS(decimal) {
  const abs = Math.abs(decimal);
  const d   = Math.floor(abs);
  const m   = Math.floor((abs - d) * 60);
  const s   = Math.round(((abs - d) * 60 - m) * 60);
  return { d: decimal < 0 ? -d : d, m, s };
}

// ── Export principal ──────────────────────────────────────────────────────────
/**
 * Generează un fișier IFC 2x3 STEP cu datele energetice ale clădirii.
 *
 * @param {object} building       — date clădire (address, city, county, lat, lon,
 *                                  yearBuilt, floors, area_m2, etc.)
 * @param {object} instSummary    — sumar instalații (EP_total, EP_heating, EP_cooling,
 *                                  EP_dhw, EP_lighting, EP_ventilation, CO2, energyClass)
 * @param {object[]} [opaqueElements]  — elemente opace (opțional, pentru metadate)
 * @param {object[]} [glazingElements] — elemente vitrate (opțional, pentru metadate)
 * @returns {string}              — conținut fișier IFC STEP (text)
 */
export function exportEnergyDataToIFC(
  building     = {},
  instSummary  = {},
  opaqueElements  = [],
  glazingElements = [],
) {
  const now     = new Date();
  const builder = new IfcBuilder();

  // ── 1. Entități de bază ───────────────────────────────────────────────────
  const ownerHistId = builder.addOwnerHistory("Zephren Energy App v3.4");

  // Unități SI
  const unitLength   = builder.addUnit("LENGTHUNIT",      "METRE");
  const unitArea     = builder.addUnit("AREAUNIT",        "SQUARE_METRE");
  const unitVolume   = builder.addUnit("VOLUMEUNIT",      "CUBIC_METRE");
  const unitAngle    = builder.addUnit("PLANEANGLEUNIT",  "RADIAN");
  const unitMass     = builder.addUnit("MASSUNIT",        "KILOGRAM");
  const unitTime     = builder.addUnit("TIMEUNIT",        "SECOND");
  const unitTemp     = builder.addUnit("THERMODYNAMICTEMPERATUREUNIT", "KELVIN");
  const unitAssignId = builder.addUnitAssignment([
    unitLength, unitArea, unitVolume, unitAngle, unitMass, unitTime, unitTemp,
  ]);

  const ctxId = builder.addGeometricRepresentationContext();

  const projectName = building.address
    ? `${building.address}${building.city ? ", " + building.city : ""}`
    : "Clădire Zephren";

  const projectId = builder.addProject(
    projectName,
    `CPE generat de Zephren Energy App — ${ifcDate(now)}`,
    ownerHistId,
    unitAssignId,
    ctxId,
  );

  // ── 2. Site, Building, Storey, Space ─────────────────────────────────────
  const siteId = builder.addSite(
    building.city || "Localitate",
    ownerHistId,
    projectId,
    building.lat  ?? null,
    building.lon  ?? null,
  );

  const buildingId = builder.addBuilding(
    building.address || "Adresă nespecificată",
    `An construcție: ${building.yearBuilt || "—"} | Regim înălțime: ${building.floors ? "P+" + (building.floors - 1) : "—"}`,
    ownerHistId,
    siteId,
    {
      street:     building.address  || "",
      city:       building.city     || "",
      county:     building.county   || "",
      postalCode: building.postalCode || "",
    },
  );

  const storeyId = builder.addBuildingStorey(
    "Parter",
    0,
    ownerHistId,
    buildingId,
  );

  const spaceId = builder.addSpace(
    "Spațiu principal",
    building.area_m2 ?? 0,
    ownerHistId,
    storeyId,
  );

  // ── 3. Pset_BuildingEnergyTarget ─────────────────────────────────────────
  const energyClass = instSummary.energyClass ?? instSummary.clasa_energetica ?? "—";
  const EP_total    = instSummary.EP_total    ?? instSummary.EP_ref  ?? null;

  const energyProps = [
    builder.addProperty("EnergyPerformanceClass", energyClass, "IFCLABEL"),
    builder.addProperty("EPtotal",           EP_total,                      "IFCREAL"),
    builder.addProperty("EPheating",         instSummary.EP_heating         ?? instSummary.EP_inc  ?? null, "IFCREAL"),
    builder.addProperty("EPcooling",         instSummary.EP_cooling         ?? instSummary.EP_rac  ?? null, "IFCREAL"),
    builder.addProperty("EPdomesticHotWater",instSummary.EP_dhw             ?? instSummary.EP_acm  ?? null, "IFCREAL"),
    builder.addProperty("EPlighting",        instSummary.EP_lighting        ?? instSummary.EP_ilum ?? null, "IFCREAL"),
    builder.addProperty("EPventilation",     instSummary.EP_ventilation     ?? instSummary.EP_vent ?? null, "IFCREAL"),
    builder.addProperty("CO2emissions",      instSummary.CO2                ?? instSummary.co2_total ?? null, "IFCREAL"),
    builder.addProperty("ReferenceArea",     building.area_m2               ?? null, "IFCREAL"),
    builder.addProperty("EnergyRatingMethod","MC001/2022 (România)",        "IFCLABEL"),
    builder.addProperty("CertificateIssueDate", ifcDate(now),               "IFCLABEL"),
    builder.addProperty("CertificateValidUntil",
      `${now.getFullYear() + 10}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
      "IFCLABEL"),
  ];

  builder.addPropertySet(
    "Pset_BuildingEnergyTarget",
    energyProps,
    ownerHistId,
    [buildingId, spaceId],
  );

  // ── 4. Pset_BuildingCommon ───────────────────────────────────────────────
  const commonProps = [
    builder.addProperty("YearOfConstruction", building.yearBuilt    ?? null, "IFCINTEGER"),
    builder.addProperty("GrossFloorArea",      building.area_m2      ?? null, "IFCREAL"),
    builder.addProperty("NumberOfStoreys",     building.floors       ?? null, "IFCINTEGER"),
    builder.addProperty("BuildingType",        building.buildingType ?? building.tip_cladire ?? "Rezidențial", "IFCLABEL"),
    builder.addProperty("Latitude",            building.lat          ?? null, "IFCREAL"),
    builder.addProperty("Longitude",           building.lon          ?? null, "IFCREAL"),
  ];

  builder.addPropertySet(
    "Pset_BuildingCommon",
    commonProps,
    ownerHistId,
    [buildingId],
  );

  // ── 5. Pset_ZephrenEnergyResults (date detaliate calcul) ─────────────────
  const calcDate  = instSummary.calcDate  ?? ifcDate(now);
  const zephrenProps = [
    builder.addProperty("ZephrenVersion",   "3.4",  "IFCLABEL"),
    builder.addProperty("CalculationDate",  calcDate, "IFCLABEL"),
    builder.addProperty("OpaqueElementsCount",  String(opaqueElements.length),  "IFCLABEL"),
    builder.addProperty("GlazingElementsCount", String(glazingElements.length), "IFCLABEL"),
    builder.addProperty("HeatingSystem",    instSummary.heatingSystem    ?? instSummary.sistem_inc   ?? "—", "IFCLABEL"),
    builder.addProperty("CoolingSystem",    instSummary.coolingSystem    ?? instSummary.sistem_rac   ?? "—", "IFCLABEL"),
    builder.addProperty("DHWSystem",        instSummary.dhwSystem        ?? instSummary.sistem_acm   ?? "—", "IFCLABEL"),
    builder.addProperty("VentilationSystem",instSummary.ventilationSystem ?? instSummary.sistem_vent ?? "—", "IFCLABEL"),
    builder.addProperty("RenewableEnergy",  instSummary.renewable_kwh    != null
      ? String(instSummary.renewable_kwh) + " kWh/an" : "—", "IFCLABEL"),
    builder.addProperty("ClimateDataSource",instSummary.climateSource    ?? "Zephren DB România", "IFCLABEL"),
  ];

  builder.addPropertySet(
    "Pset_ZephrenEnergyResults",
    zephrenProps,
    ownerHistId,
    [buildingId],
  );

  // ── 6. Asamblare fișier STEP ─────────────────────────────────────────────
  const lines   = builder.getLines();
  const header  = [
    "ISO-10303-21;",
    "HEADER;",
    `FILE_DESCRIPTION(('IFC 2x3 Export — Zephren Energy App','Date energetice clădire'),'2;1');`,
    `FILE_NAME(${stepStr(projectName + ".ifc")},${stepStr(now.toISOString())},('Zephren'),(''),` +
      `'Zephren Energy App v3.4','','');`,
    "FILE_SCHEMA(('IFC2X3'));",
    "ENDSEC;",
    "",
    "DATA;",
  ];

  const footer = [
    "ENDSEC;",
    "",
    "END-ISO-10303-21;",
  ];

  return [
    ...header,
    ...lines,
    ...footer,
  ].join("\r\n");
}
