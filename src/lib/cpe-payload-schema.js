/**
 * cpe-payload-schema.js — Schema JSON + validare AJV pentru payload-ul
 * trimis către /api/generate-document.py la generarea CPE/Anexa 1+2 DOCX.
 *
 * #14 (audit Pas 6+7 — V6, 7 mai 2026) — Anterior payload-ul era construit
 * fără validare schema. Dacă o cheie critică lipsea, DOCX-ul se genera tăcut
 * cu „—" în loc de valori reale, iar auditorul descoperea problema doar la
 * inspecția finală a documentului.
 *
 * Strategie: validare WARNING-only (nu blocăm exportul), dar afișăm toast
 * clar cu lista câmpurilor lipsă pentru ca auditorul să decidă conștient
 * dacă continuă sau corectează.
 *
 * Bază normativă:
 *   - Mc 001-2022 (Ord. MDLPA 16/2023) — câmpuri obligatorii Anexa 1
 *   - Ord. MDLPA 348/2026 — câmpuri auditor (atestat, MDLPA cod)
 *   - L.372/2005 R2 mod. L.238/2024 Art. 17/18 — date tehnice CPE
 */

import Ajv from "ajv";

/**
 * Schema JSON minimă pentru payload-ul CPE/Anexa.
 * NU include toate cele ~100 câmpuri — doar cele OBLIGATORII conform
 * Ord. MDLPA 16/2023 Anexa 1+2. Câmpuri opționale (foto, GPS, observații)
 * sunt verificate doar pentru tip/format dacă sunt prezente.
 */
export const CPE_PAYLOAD_SCHEMA = {
  type: "object",
  required: [
    // Identificare CPE (Ord. MDLPA 16/2023 Anexa 1 — secțiunea I)
    "cpe_code",
    "auditor_name",
    "auditor_atestat",
    "auditor_grade",
    "auditor_date",
    "address",
    "category_label",

    // Date geometrice (Mc 001-2022 §3.2)
    "area_ref",        // Au [m²]
    "year",            // an construire
    "regime",          // regim înălțime

    // Performanță energetică (Mc 001-2022 Cap. 5)
    "ep_specific",     // EP total [kWh/m²·an]
    "ep_class_real",   // clasa A+..G

    // Scale clasificare (din ENERGY_CLASSES_DB per categorie)
    "s_ap", "s_a", "s_b", "s_c", "s_d", "s_e", "s_f",

    // Scop CPE (vânzare/închiriere/recepție/renovare/etc.)
    "scope",
  ],
  properties: {
    cpe_code: { type: "string", minLength: 5 },
    auditor_name: { type: "string", minLength: 3 },
    auditor_atestat: { type: "string", minLength: 3 },
    auditor_grade: {
      type: "string",
      // Ord. MDLPA 348/2026 Art. 6 — categorii atestare
      // (Ici/IIci pentru tranziție, AE Ici / AE IIci nou)
      pattern: "^(AE )?(I|II)ci$|^(I|II)ci$",
    },
    auditor_date: {
      type: "string",
      // dd.mm.yyyy (format DOCX) sau YYYY-MM-DD (format ISO/XML)
      pattern: "^([0-3][0-9]\\.[0-1][0-9]\\.[0-9]{4}|[0-9]{4}-[0-1][0-9]-[0-3][0-9])$",
    },
    address: { type: "string", minLength: 5 },
    category_label: { type: "string", minLength: 3 },
    area_ref: {
      type: "string",
      pattern: "^[0-9]+(,[0-9]+)?$", // format RO virgulă
    },
    year: {
      anyOf: [
        { type: "string", pattern: "^[0-9]{4}$|^_+$" }, // 4 cifre sau ____
        { type: "number" },
      ],
    },
    regime: { type: "string" },
    ep_specific: {
      type: "string",
      pattern: "^[0-9]+(,[0-9]+)?$",
    },
    ep_class_real: {
      type: "string",
      enum: ["A+", "A", "B", "C", "D", "E", "F", "G", "—"],
    },
    s_ap: { type: "string" },
    s_a: { type: "string" },
    s_b: { type: "string" },
    s_c: { type: "string" },
    s_d: { type: "string" },
    s_e: { type: "string" },
    s_f: { type: "string" },
    scope: { type: "string", minLength: 3 },

    // CR-2 — clase per utilitate (opționale, dar recomandate Mc 001-2022 Tab I.1)
    cls_incalzire: { type: "string", enum: ["A+", "A", "B", "C", "D", "E", "F", "G", "—", ""] },
    cls_acm:       { type: "string", enum: ["A+", "A", "B", "C", "D", "E", "F", "G", "—", ""] },
    cls_racire:    { type: "string", enum: ["A+", "A", "B", "C", "D", "E", "F", "G", "—", ""] },
    cls_ventilare: { type: "string", enum: ["A+", "A", "B", "C", "D", "E", "F", "G", "—", ""] },
    cls_iluminat:  { type: "string", enum: ["A+", "A", "B", "C", "D", "E", "F", "G", "—", ""] },

    // GPS coordonate (opțional)
    gps: { type: "string" },

    // Semnătură + ștampilă (opționale, recomandate)
    signature_png_b64: { type: "string" },
    stamp_png_b64: { type: "string" },

    // QR cod verificare (opțional)
    qr_verify_url: { type: "string" },
  },
  additionalProperties: true, // permitem orice câmp extra
};

let _ajv = null;
let _validator = null;

function getValidator() {
  if (!_validator) {
    _ajv = new Ajv({ allErrors: true, strict: false });
    _validator = _ajv.compile(CPE_PAYLOAD_SCHEMA);
  }
  return _validator;
}

/**
 * Etichete prietenoase pentru auditor (în limba română).
 * Mapează numele tehnic al câmpului la o descriere clară.
 */
const FIELD_LABELS = {
  cpe_code: "Cod CPE / cod unic MDLPA",
  auditor_name: "Numele auditorului",
  auditor_atestat: "Numărul atestatului auditor",
  auditor_grade: "Gradul atestării (Ici/IIci)",
  auditor_date: "Data emiterii CPE (Pas 6 → Date auditor)",
  address: "Adresa clădirii (Pas 1 → Identificare)",
  category_label: "Categoria clădirii (Pas 1 → Identificare)",
  area_ref: "Aria utilă Au (Pas 1 → Geometrie)",
  year: "Anul construirii (Pas 1 → Identificare)",
  regime: "Regimul de înălțime (Pas 1 → Geometrie)",
  ep_specific: "EP total calculat (Pas 5 → Bilanț energetic)",
  ep_class_real: "Clasa energetică (Pas 5)",
  s_ap: "Pragurile scalei A+ (auto din categoria clădirii)",
  scope: "Scopul CPE (Pas 1 → Identificare)",
  signature_png_b64: "Semnătura auditor (Pas 6 → Auditor)",
  stamp_png_b64: "Ștampila auditor (Pas 6 → Auditor)",
};

/**
 * Validează payload-ul CPE împotriva schemei.
 *
 * @param {object} payload — datele care vor fi trimise la /api/generate-document
 * @param {string} mode — "cpe" | "anexa" | "anexa_bloc" (afectează field-uri obligatorii)
 * @returns {{ ok: boolean, errors: Array<{field, label, message}>, warnings: string[] }}
 *
 * Note:
 *   - ok=false NU înseamnă că exportul trebuie blocat — auditorul poate continua
 *     dacă acceptă riscul (auditor.observations: "Date incomplete").
 *   - errors[].label e în RO și conține locația din UI unde se setează valoarea.
 *   - warnings[] conține semnale moi (ex. semnătură lipsă pentru CPE oficial).
 */
export function validateCpePayload(payload, mode = "cpe") {
  const validator = getValidator();
  const valid = validator(payload);

  const errors = [];
  if (!valid && validator.errors) {
    for (const err of validator.errors) {
      const fieldPath = (err.instancePath || "").replace(/^\//, "");
      const missingProp = err.params?.missingProperty;
      const field = missingProp || fieldPath || "(unknown)";
      const label = FIELD_LABELS[field] || field;
      let message = err.message || "câmp invalid";
      if (err.keyword === "required") message = "lipsește";
      else if (err.keyword === "pattern") message = `format invalid (${err.params.pattern})`;
      else if (err.keyword === "enum") message = `valoare invalidă (acceptă: ${err.params.allowedValues?.join("/")})`;
      else if (err.keyword === "minLength") message = `prea scurt (minim ${err.params.limit} caractere)`;
      errors.push({ field, label, message });
    }
  }

  // Warnings soft — Ord. MDLPA 16/2023 recomandă semnătură + ștampilă
  // pe CPE oficial, dar nu sunt strict obligatorii pentru validare schema.
  const warnings = [];
  if (mode === "cpe") {
    if (!payload.signature_png_b64) {
      warnings.push("Semnătură auditor lipsă — CPE va fi generat fără semnătură vizuală (Pas 6 → Auditor → Upload semnătură).");
    }
    if (!payload.stamp_png_b64) {
      warnings.push("Ștampilă auditor lipsă — CPE va fi generat fără ștampilă vizuală (Pas 6 → Auditor → Upload ștampilă).");
    }
    if (!payload.qr_verify_url) {
      warnings.push("Cod CPE lipsă — QR-ul de verificare nu va fi generat.");
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format mesaj user-friendly din rezultatul validării.
 * Util pentru afișare în toast/banner.
 *
 * @param {object} result — output din validateCpePayload
 * @returns {string} — mesaj multi-linie pentru afișare
 */
export function formatValidationMessage(result) {
  if (!result || (result.ok && result.warnings.length === 0)) {
    return "✓ Payload CPE complet — toate câmpurile obligatorii prezente.";
  }
  const lines = [];
  if (!result.ok) {
    lines.push(`⚠️ ${result.errors.length} câmpuri obligatorii lipsă:`);
    result.errors.slice(0, 5).forEach((e) => {
      lines.push(`  • ${e.label}: ${e.message}`);
    });
    if (result.errors.length > 5) {
      lines.push(`  ... +${result.errors.length - 5} câmpuri suplimentare`);
    }
  }
  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("ℹ️ Avertizări:");
    result.warnings.forEach((w) => lines.push(`  • ${w}`));
  }
  return lines.join("\n");
}
