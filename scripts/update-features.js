#!/usr/bin/env node
/**
 * scripts/update-features.js
 * Scanează src/calc/*.js și api/*.{js,py} pentru module noi.
 * Scrie src/data/program-stats.generated.js cu statistici reale.
 * Avertizează când un modul nou apare și nu e în features.json.
 *
 * Rulează automat la fiecare build (prebuild hook).
 */

import { readdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Citire features.json ────────────────────────────────────
const featuresJson = JSON.parse(
  readFileSync(join(ROOT, "src/data/features.json"), "utf-8")
);
const knownModules = new Set(Object.keys(featuresJson.calcModules || {}));

// ── Scanare directoare ──────────────────────────────────────
function scanDir(dir, exts) {
  try {
    return readdirSync(dir)
      .filter(f => exts.includes(extname(f)) && !f.startsWith("_") && !f.startsWith("."))
      .map(f => basename(f, extname(f)));
  } catch { return []; }
}

const calcModules   = scanDir(join(ROOT, "src/calc"),      [".js"]);
const apiEndpoints  = scanDir(join(ROOT, "api"),           [".js", ".py"]);
const components    = scanDir(join(ROOT, "src/components"),[".jsx", ".tsx", ".js"]);
const importFiles   = scanDir(join(ROOT, "src/import"),    [".jsx", ".tsx", ".js"]);

// Exclude fișiere de test și utilitare interne
const calcReal = calcModules.filter(m => !m.includes("test") && !m.includes("spec"));
const apiReal  = apiEndpoints.filter(m => !["stripe-webhook","create-checkout","ancpi-proxy"].includes(m));

// ── Detectare module noi (necunoscute în features.json) ─────
const newModules = calcReal.filter(m => !knownModules.has(m));
if (newModules.length > 0) {
  console.warn(`\n⚠️  Module noi detectate în src/calc/ — adaugă-le în features.json:`);
  newModules.forEach(m => console.warn(`   + ${m}.js`));
  console.warn("");
}

// ── Categorii module de calcul ──────────────────────────────
const categories = {};
for (const [mod, meta] of Object.entries(featuresJson.calcModules || {})) {
  const cat = meta.category || "altele";
  categories[cat] = (categories[cat] || 0) + 1;
}

// ── Statistici export ───────────────────────────────────────
const exportFormats = (featuresJson.exports || []).length;
const importSources = (featuresJson.imports || []).length;
const mainFeatures  = (featuresJson.main    || []).length;
const steps         = (featuresJson.steps   || []).length;

// ── Scriere program-stats.generated.js ─────────────────────
const out = `// GENERAT AUTOMAT — nu edita manual
// Script: scripts/update-features.js
// Ultima generare: ${new Date().toISOString().slice(0,10)}

export const CALC_MODULES_COUNT  = ${calcReal.length};
export const API_ENDPOINTS_COUNT = ${apiReal.length};
export const COMPONENTS_COUNT    = ${components.length};
export const IMPORT_SOURCES_COUNT= ${importSources};
export const EXPORT_FORMATS_COUNT= ${exportFormats};
export const STEPS_REAL_COUNT    = ${steps};
export const FEATURES_COUNT      = ${mainFeatures};

export const NEW_MODULES = ${JSON.stringify(newModules)};
`;

writeFileSync(join(ROOT, "src/data/program-stats.generated.js"), out, "utf-8");
console.log(`✅ program-stats.generated.js — ${calcReal.length} module calc · ${apiReal.length} API · ${components.length} componente`);
