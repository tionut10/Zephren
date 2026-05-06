/**
 * renovation-passport-schema-v1.js — Pașaport renovare schema v1.0 OneClickRENO.
 *
 * SKELETON pentru aliniere la schema XML oficială OneClickRENO (publicare prin
 * ordin MDLPA termen 29.V.2026 — transpunere RO Directiva (UE) 2024/1275 EPBD,
 * Anexa VIII).
 *
 * Sprint Conformitate P0-12 (6 mai 2026).
 *
 * STATUS LA 6 mai 2026:
 *   - Schema oficială OneClickRENO NU este încă publicată oficial de MDLPA
 *   - Folosim schema 0.1.0-preliminary (`renovation-passport-schema.js`) pentru
 *     funcționalitate curentă
 *   - Acest fișier conține INFRASTRUCTURĂ pregătită pentru migrare:
 *     - Constanta SCHEMA_VERSION = „1.0.0-pending-mdlpa"
 *     - Helper migrateLegacyToV1(passportV0) care convertește 0.1 → 1.0
 *     - Stub pentru AJV validation (validateAgainstV1Schema) — populat la publicare
 *     - Banner UI „Migrare în curs" exportat ca string constant
 *
 * MONITOR PUBLICARE:
 *   - URL portal MDLPA pentru schema: https://portal.mdlpa.ro/schemas/renovation-passport
 *     (URL provizoriu; verificare după 25.V.2026)
 *   - GitHub OneClickRENO: https://github.com/OneClickRENO (proiect EU pilot)
 *   - Comisia UE EPBD: https://energy.ec.europa.eu/topics/energy-efficiency/epbd_en
 *
 * POST-PUBLICARE (P0-12-bis):
 *   1. Populează SCHEMA_DEFINITION cu JSON Schema oficial sau XSD
 *   2. Implementează validateAgainstV1Schema cu AJV (deja în deps prin alte fișiere)
 *   3. Mută banner-ul „Migrare în curs" la „Schema 1.0 oficială MDLPA"
 *   4. Adaugă în passport-export.js opțiune `schemaVersion: "0.1" | "1.0"` cu
 *      migrare automată la export XML
 *
 * Adaptare estimată post-publicare: 4-6 ore + 5-10 teste suplimentare.
 */

/**
 * Versiunea schemei (sentinel pentru detectare migrare).
 */
export const SCHEMA_VERSION_V1 = "1.0.0-pending-mdlpa";

/**
 * URL canonical pentru schema oficială (când va fi publicată).
 * Provizoriu — actualizare la publicare ordin MDLPA.
 */
export const SCHEMA_URL_V1 = "https://portal.mdlpa.ro/schemas/renovation-passport/1.0.json";

/**
 * Namespace XML pentru schema v1 oficială.
 * Provizoriu — actualizare la publicare.
 */
export const XML_NAMESPACE_V1 = "https://portal.mdlpa.ro/schemas/renovation-passport/1.0";

/**
 * Definiție JSON Schema (Draft 2020-12 EU oficial).
 * SKELETON: structura de bază; câmpurile vor fi populate la publicare ordin MDLPA.
 *
 * Aliniere preliminară la EPBD 2024/1275 Anexa VIII (12 secțiuni minimale):
 *   identification, building, baseline, milestones, targetState, financial,
 *   indoorEnvironment, embodiedCarbon, auditor, history, validation, metadata.
 */
export const SCHEMA_DEFINITION_V1 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: SCHEMA_URL_V1,
  title: "Pașaport renovare clădire — schema v1.0 OneClickRENO (skeleton)",
  type: "object",
  required: [
    "schemaVersion",
    "passportId",
    "issueDate",
    "building",
    "baseline",
    "milestones",
    "targetState",
    "auditor",
  ],
  properties: {
    schemaVersion: { type: "string", const: SCHEMA_VERSION_V1 },
    passportId: {
      type: "string",
      pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
      description: "UUID v5 deterministic din cpeCode + clădire",
    },
    issueDate: { type: "string", format: "date-time" },
    building: {
      type: "object",
      required: ["address", "category", "areaUseful"],
      properties: {
        address: { type: "string" },
        cadastralNumber: { type: "string" },
        category: { type: "string" },
        areaUseful: { type: "number", minimum: 0 },
        yearBuilt: { type: "integer" },
        location: {
          type: "object",
          properties: {
            latitude: { type: "number" },
            longitude: { type: "number" },
            climateZone: { type: "string" },
          },
        },
      },
    },
    baseline: {
      type: "object",
      properties: {
        epPrimary: { type: "number" },
        epClass: { type: "string", pattern: "^[A-G]\\+?$" },
        co2Emissions: { type: "number" },
        renewableShare: { type: "number" },
      },
    },
    milestones: {
      type: "array",
      description: "Foaie de parcurs etapizată (EPBD 2024 Anexa VIII §2)",
      items: {
        type: "object",
        properties: {
          year: { type: "integer" },
          measures: { type: "array", items: { type: "string" } },
          targetEpPrimary: { type: "number" },
          targetClass: { type: "string", pattern: "^[A-G]\\+?$" },
          investmentEur: { type: "number" },
          paybackYears: { type: "number" },
        },
      },
    },
    targetState: {
      type: "object",
      properties: {
        epPrimary: { type: "number" },
        epClass: { type: "string" },
        co2Reduction: { type: "number" },
        targetYear: { type: "integer" },
        complianceLevel: {
          type: "string",
          enum: ["nZEB", "ZEB", "MEPS-2030", "MEPS-2033", "MEPS-2050"],
        },
      },
    },
    financial: {
      type: "object",
      properties: {
        totalInvestment: { type: "number" },
        annualSavings: { type: "number" },
        npv25y: { type: "number" },
        irr: { type: "number" },
        availableSubsidies: {
          type: "array",
          items: { type: "object" },
        },
      },
    },
    indoorEnvironment: {
      type: "object",
      description: "Calitate aer interior + confort (EPBD 2024 Anexa VIII §4)",
      properties: {
        ventilation: { type: "string" },
        co2ConcentrationPpm: { type: "number" },
        thermalComfortClass: { type: "string", enum: ["I", "II", "III", "IV"] },
      },
    },
    embodiedCarbon: {
      type: "object",
      description: "Carbon încorporat materiale (Level(s) framework)",
      properties: {
        gwpTotalKgCo2eq: { type: "number" },
        gwpPerSqm: { type: "number" },
      },
    },
    auditor: {
      type: "object",
      required: ["name", "atestat", "grade"],
      properties: {
        name: { type: "string" },
        atestat: { type: "string" },
        grade: { type: "string", enum: ["Ici", "IIci"] },
        registryIndex: { type: "string" },
      },
    },
    history: {
      type: "array",
      description: "Istoric versiuni pașaport (versionare incrementală)",
      items: {
        type: "object",
        properties: {
          version: { type: "string" },
          modifiedAt: { type: "string", format: "date-time" },
          changes: { type: "string" },
        },
      },
    },
    validation: {
      type: "object",
      properties: {
        signatureType: { type: "string", enum: ["PAdES-B-T", "PAdES-B-LT", "PAdES-B-LTA"] },
        signedAt: { type: "string", format: "date-time" },
        verificationStatus: { type: "string", enum: ["valid", "expired", "revoked", "unknown"] },
      },
    },
    metadata: {
      type: "object",
      properties: {
        generator: { type: "string" },
        generatorVersion: { type: "string" },
        legalBasis: { type: "array", items: { type: "string" } },
      },
    },
  },
};

/**
 * Banner UI pentru afișare în export XML pașaport până la publicarea schemei oficiale.
 */
export const MIGRATION_BANNER_TEXT =
  "⚠️ Pașaport în schema preliminary 0.1.0-preliminary. " +
  "Schema oficială OneClickRENO MDLPA în curs de publicare (termen 29.V.2026). " +
  "Migrarea automată la versiunea 1.0 va fi disponibilă post-publicare ordin MDLPA.";

/**
 * Convertește un pașaport în format 0.1.0-preliminary la format 1.0.0 OneClickRENO.
 *
 * SKELETON: implementare best-effort cu mapping câmpuri cunoscute. Detalii finale
 * adăugate la publicarea schemei oficiale.
 *
 * @param {object} passportV0 — pașaport schema 0.1.0
 * @returns {object} pașaport schema 1.0 (parțial — câmpuri necunoscute null)
 */
export function migrateLegacyToV1(passportV0) {
  if (!passportV0 || typeof passportV0 !== "object") {
    return null;
  }

  // Mapping câmpuri cunoscute (best-effort)
  const v1 = {
    schemaVersion: SCHEMA_VERSION_V1,
    passportId: passportV0.passportId || null,
    legacyPassportId: passportV0.legacyPassportId || null,
    issueDate: passportV0.timestamp || passportV0.createdAt || new Date().toISOString(),

    building: {
      address: passportV0.building?.address || passportV0.buildingAddress || null,
      cadastralNumber: passportV0.building?.cadastralNumber || null,
      category: passportV0.building?.category || null,
      areaUseful: passportV0.building?.areaUseful || passportV0.building?.areaUtila || null,
      yearBuilt: passportV0.building?.yearBuilt || null,
      location: {
        latitude: passportV0.building?.latitude || null,
        longitude: passportV0.building?.longitude || null,
        climateZone: passportV0.building?.climateZone || null,
      },
    },

    baseline: {
      epPrimary: passportV0.baseline?.epPrimary || passportV0.baseline?.ep || null,
      epClass: passportV0.baseline?.epClass || null,
      co2Emissions: passportV0.baseline?.co2 || null,
      renewableShare: passportV0.baseline?.rer || null,
    },

    milestones: (passportV0.roadmap?.phases || []).map(phase => ({
      year: phase.year || phase.targetYear || null,
      measures: phase.measures || [],
      targetEpPrimary: phase.targetEp || null,
      targetClass: phase.targetClass || null,
      investmentEur: phase.investment || phase.cost || null,
      paybackYears: phase.payback || null,
    })),

    targetState: {
      epPrimary: passportV0.targetState?.ep || null,
      epClass: passportV0.targetState?.epClass || null,
      co2Reduction: passportV0.targetState?.co2Reduction || null,
      targetYear: passportV0.targetState?.year || null,
      complianceLevel: passportV0.targetState?.compliance || "nZEB",
    },

    financial: {
      totalInvestment: passportV0.financial?.totalInvestment || null,
      annualSavings: passportV0.financial?.savings || null,
      npv25y: passportV0.financial?.npv || null,
      irr: passportV0.financial?.irr || null,
      availableSubsidies: passportV0.financial?.subsidies || [],
    },

    indoorEnvironment: {
      ventilation: passportV0.indoor?.ventilation || null,
      co2ConcentrationPpm: passportV0.indoor?.co2Ppm || null,
      thermalComfortClass: passportV0.indoor?.comfortClass || null,
    },

    embodiedCarbon: {
      gwpTotalKgCo2eq: passportV0.gwp?.total || null,
      gwpPerSqm: passportV0.gwp?.perSqm || null,
    },

    auditor: {
      name: passportV0.auditor?.name || null,
      atestat: passportV0.auditor?.atestat || passportV0.auditor?.certNumber || null,
      grade: passportV0.auditor?.grade || passportV0.auditor?.gradMdlpa || null,
      registryIndex: passportV0.auditor?.registryIndex || null,
    },

    history: passportV0.history || [],

    validation: {
      signatureType: passportV0.signature?.type || null,
      signedAt: passportV0.signature?.signedAt || null,
      verificationStatus: passportV0.signature?.status || "unknown",
    },

    metadata: {
      generator: passportV0.metadata?.generator || "Zephren v4.0+",
      generatorVersion: passportV0.metadata?.version || null,
      legalBasis: passportV0.metadata?.legalBasis || [
        "EPBD 2024/1275 Anexa VIII",
        "L. 372/2005 republicată cu L. 238/2024",
        "Ord. MDLPA 348/2026",
      ],
    },
  };

  return v1;
}

/**
 * Validează un pașaport împotriva schemei v1 (skeleton — populat post-publicare).
 *
 * @param {object} passport
 * @returns {{valid: boolean, errors: Array<{path:string, message:string}>}}
 */
export function validateAgainstV1Schema(passport) {
  const errors = [];

  if (!passport || typeof passport !== "object") {
    return { valid: false, errors: [{ path: "/", message: "Pașaportul lipsește sau invalid" }] };
  }

  // Verificări basic (înainte de publicare AJV)
  for (const requiredField of SCHEMA_DEFINITION_V1.required) {
    if (passport[requiredField] === undefined || passport[requiredField] === null) {
      errors.push({
        path: `/${requiredField}`,
        message: `Câmp obligatoriu lipsă: ${requiredField}`,
      });
    }
  }

  // Verifică passportId UUID v5 format
  if (passport.passportId && typeof passport.passportId === "string") {
    const uuidV5Re = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    if (!uuidV5Re.test(passport.passportId)) {
      errors.push({
        path: "/passportId",
        message: "passportId trebuie să fie UUID v5 (deterministic din cpeCode)",
      });
    }
  }

  // Verifică auditor.grade enum
  if (passport.auditor && passport.auditor.grade) {
    if (!["Ici", "IIci"].includes(passport.auditor.grade)) {
      errors.push({
        path: "/auditor/grade",
        message: "grade trebuie să fie „Ici” sau „IIci”",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    note: "Validare basic — AJV strict cu schemă oficială MDLPA disponibil post-29.V.2026",
  };
}

/**
 * Generator XML preliminary cu namespace v1 (folosit la export XML).
 *
 * @param {object} passport — schema v1
 * @returns {string} XML cu namespace v1
 */
export function passportToXmlV1(passport) {
  if (!passport) return "";
  const passportV1 = passport.schemaVersion === SCHEMA_VERSION_V1
    ? passport
    : migrateLegacyToV1(passport);

  const escape = (s) => String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const renderObject = (obj, indent = 2) => {
    if (obj === null || obj === undefined) return "";
    if (typeof obj !== "object") return escape(obj);
    const pad = " ".repeat(indent);
    let out = "";
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "_");
      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        out += `${pad}<${safeKey}>\n`;
        for (const item of value) {
          out += `${pad}  <item>\n${renderObject(item, indent + 4)}${pad}  </item>\n`;
        }
        out += `${pad}</${safeKey}>\n`;
      } else if (typeof value === "object") {
        out += `${pad}<${safeKey}>\n${renderObject(value, indent + 2)}${pad}</${safeKey}>\n`;
      } else {
        out += `${pad}<${safeKey}>${escape(value)}</${safeKey}>\n`;
      }
    }
    return out;
  };

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<renovationPassport xmlns="${XML_NAMESPACE_V1}" schemaVersion="${SCHEMA_VERSION_V1}">\n` +
    renderObject(passportV1, 2) +
    `</renovationPassport>\n`;
}
