/**
 * Pașaport de renovare digital — Schema JSON
 * Conform EPBD 2024/1275 Art. 12 + Anexa VIII
 * Transpus prin L.238/2024, termen ordin MDLPA: 29 mai 2026.
 *
 * Versiune schema: 0.1.0-preliminary (aliniere draft Anexa VIII EU)
 * JSON Schema Draft 07 interoperabil.
 *
 * La publicarea ordinului MDLPA oficial, adaptarea va fi chirurgicală (1-2h).
 */

export const RENOVATION_PASSPORT_SCHEMA_VERSION = "0.1.0-preliminary";
export const RENOVATION_PASSPORT_SCHEMA_URL =
  "https://zephren.ro/schemas/renovation-passport/0.1.0.json";

export const XML_SCHEMA_NAMESPACE =
  "http://zephren.ro/schemas/renovation-passport/0.1.0";

export const JSON_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: RENOVATION_PASSPORT_SCHEMA_URL,
  title: "Pașaport Renovare Clădire — EPBD 2024/1275 Art. 12",
  type: "object",
  required: [
    "passportId",
    "version",
    "building",
    "baseline",
    "roadmap",
    "auditor",
    "timestamp",
  ],
  properties: {
    passportId: {
      type: "string",
      // Sprint 25 P0.4: acceptă UUID v4 (random, legacy) și v5 (determinist din cpeCode/clădire)
      pattern:
        "^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
      description:
        "UUID unic pașaport (v5 determinist din cpeCode dacă disponibil; v4 random fallback)",
    },
    legacyPassportId: {
      type: "string",
      pattern:
        "^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
      description:
        "ID pașaport anterior (v4) — păstrat la migrare către UUID v5 deterministic",
    },
    cpeCode: {
      type: "string",
      description:
        "Cod CPE Ord. MDLPA 16/2023 — cross-ref CPE↔Pașaport↔Raport (Sprint 17/25)",
    },
    version: {
      type: "string",
      description: "Versiune schema pașaport (ex. 0.1.0-preliminary)",
    },
    schemaUrl: { type: "string", format: "uri" },
    timestamp: {
      type: "string",
      format: "date-time",
      description: "ISO 8601 timestamp creare pașaport",
    },
    lastModified: { type: "string", format: "date-time" },
    status: {
      type: "string",
      enum: ["draft", "active", "updated", "archived"],
    },
    history: {
      type: "array",
      items: {
        type: "object",
        required: ["version", "timestamp", "changedBy"],
        properties: {
          version: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
          changedBy: { type: "string" },
          changeReason: { type: "string" },
        },
      },
    },
    building: {
      type: "object",
      required: ["address", "category", "areaUseful", "climateZone"],
      properties: {
        name: { type: "string" },
        address: { type: "string" },
        county: { type: "string" },
        cadastralNumber: { type: "string" },
        category: {
          type: "string",
          enum: [
            "RI",
            "RC",
            "RA",
            "BI",
            "ED",
            "SA",
            "AL",
            "HO",
            "CO",
            "SP",
            "IN",
          ],
        },
        areaUseful: { type: "number", minimum: 0 },
        yearBuilt: { type: ["integer", "null"] },
        climateZone: {
          type: "string",
          enum: ["I", "II", "III", "IV", "V"],
        },
        floors: { type: ["integer", "null"] },
        apartments: { type: ["integer", "null"] },
        heightRegime: { type: "string" },
        protectedStatus: { type: "boolean" },
        cpePreviousNumber: {
          type: ["string", "null"],
          description: "Nr. CPE anterior (din Ord. 16/2023 Anexa 1 sau 2)",
        },
      },
    },
    baseline: {
      type: "object",
      required: ["date", "ep_total", "co2", "energyClass"],
      description: "Stare energetică inițială (înainte renovare)",
      properties: {
        date: { type: "string", format: "date" },
        ep_total: {
          type: "number",
          description: "kWh/(m²·an)",
        },
        ep_nren: { type: "number" },
        ep_ren: { type: "number" },
        co2: {
          type: "number",
          description: "kg CO₂/(m²·an)",
        },
        energyClass: {
          type: "string",
          enum: ["A+", "A", "B", "C", "D", "E", "F", "G"],
        },
        rer_pct: { type: "number", minimum: 0, maximum: 100 },
        meps2030_compliant: { type: "boolean" },
        meps2033_compliant: { type: "boolean" },
        cpeNumber: { type: ["string", "null"] },
        cpeIssueDate: { type: ["string", "null"], format: "date" },
      },
    },
    roadmap: {
      type: "object",
      required: ["strategy", "totalYears", "phases"],
      properties: {
        strategy: {
          type: "string",
          enum: [
            "quick_wins",
            "envelope_first",
            "systems_first",
            "balanced",
          ],
        },
        totalYears: { type: "integer", minimum: 0, maximum: 20 },
        annualBudgetRON: { type: "number" },
        energyPriceRON: { type: "number" },
        discountRate: { type: "number" },
        phases: {
          type: "array",
          items: {
            type: "object",
            required: ["year", "measures", "ep_after", "class_after"],
            properties: {
              year: { type: "integer" },
              measures: {
                type: "array",
                items: {
                  type: "object",
                  required: ["id", "name"],
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    category: { type: "string" },
                    ep_reduction_kWh_m2: { type: "number" },
                    co2_reduction: { type: "number" },
                    cost_RON: { type: "number" },
                    lifespan_years: { type: "integer" },
                    fundingProgram: { type: ["string", "null"] },
                  },
                },
              },
              phaseCost_RON: { type: "number" },
              cumulativeCost_RON: { type: "number" },
              ep_after: { type: "number" },
              class_after: { type: "string" },
              annualSaving_RON: { type: "number" },
              mepsComplianceAfterPhase: {
                type: "object",
                properties: {
                  meps2030: { type: "boolean" },
                  meps2033: { type: "boolean" },
                },
              },
            },
          },
        },
        epTrajectory: {
          type: "array",
          items: { type: "number" },
          description: "EP per an (inclusiv baseline la index 0)",
        },
        classTrajectory: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    targetState: {
      type: "object",
      required: ["ep_target", "energyClass_target"],
      properties: {
        ep_target: { type: "number" },
        energyClass_target: { type: "string" },
        nzebCompliant: { type: "boolean" },
        costOptimalCompliant: {
          type: "boolean",
          description: "Reg. UE 2025/2273 ≤50 kWh/m²·an",
        },
        mepsComplianceTarget: {
          type: "object",
          properties: {
            meps2030: { type: "boolean" },
            meps2033: { type: "boolean" },
          },
        },
      },
    },
    financial: {
      type: "object",
      properties: {
        totalInvestment_RON: { type: "number" },
        totalGrant_RON: { type: "number" },
        netInvestment_RON: { type: "number" },
        fundingPrograms: {
          type: "array",
          items: { type: "string" },
          description:
            "ex. ['PNRR C5-I3', 'Casa Verde Plus', 'AFM termoizolare']",
        },
        npv_30years_RON: { type: "number" },
        irr_pct: { type: "number" },
        paybackSimple_years: { type: "number" },
        paybackDiscounted_years: { type: "number" },
        perspective: {
          type: "string",
          enum: ["financial", "social", "macroeconomic"],
        },
      },
    },
    auditor: {
      type: "object",
      required: ["name", "certNumber"],
      properties: {
        name: { type: "string" },
        certNumber: {
          type: "string",
          description: "Număr atestat ANRE/MDLPA",
        },
        category: {
          type: "string",
          enum: ["", "GI_CI", "GI_CII", "GII_CI", "GII_CII"],
        },
        firm: { type: "string" },
        contact: { type: "string" },
      },
    },
    registry: {
      type: "object",
      description:
        "Placeholder pentru registru central MDLPA (când API disponibil)",
      properties: {
        registryId: { type: ["string", "null"] },
        registryUrl: { type: ["string", "null"], format: "uri" },
        syncStatus: {
          type: "string",
          enum: ["pending", "synced", "failed", "not_registered"],
        },
        lastSync: { type: ["string", "null"], format: "date-time" },
      },
    },
  },
};
