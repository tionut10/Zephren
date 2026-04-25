/**
 * Dry-run — verifică toți agenții fără a apela Claude API.
 * Util pentru CI și pentru a confirma că structura e validă pre-activare.
 *
 * Rulare: cd automation && node tools/dry-run.js
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const config = JSON.parse(readFileSync(join(ROOT, "config.json"), "utf8"));

console.log("─".repeat(60));
console.log("  ZEPHREN AUTOMATION — DRY RUN");
console.log("─".repeat(60));
console.log(`Status global         : ${config.enabled ? "✅ ACTIV" : "🔒 DEZACTIVAT"}`);
console.log(`Activare prevăzută    : ${config.activation.earliestActivationDate}`);
console.log(`Politică              : ${config.activation.policy}`);
console.log(`Buget zilnic          : ${config.limits.maxApiCallsPerDay} apeluri / ${(config.limits.maxTokensPerDay / 1000).toFixed(0)}k tokens`);
console.log(`Buget lunar           : $${config.limits.monthlyBudgetUSD}`);
console.log("");
console.log("Agenți configurați:");

for (const [name, agent] of Object.entries(config.agents)) {
  const flag = agent.enabled ? "✅" : "🔒";
  console.log(`  ${flag}  ${name.padEnd(22)} model=${agent.model.padEnd(20)} trigger=${agent.trigger}`);
  console.log(`      └─ ${agent.description}`);
}

console.log("");
console.log("Zone protejate (require human review):");
config.safety.alwaysRequireHumanReview.forEach((p) => console.log(`  ⛔ ${p}`));

console.log("");
console.log("Pentru activare → vezi automation/ACTIVATION.md");
console.log("─".repeat(60));
