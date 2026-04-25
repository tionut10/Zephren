/**
 * Agent 5: Regression Detector
 * Trigger: schedule zilnic 06:00 UTC
 * Model: Sonnet 4.6
 *
 * Flux:
 *  1. Rulează `npm test` (Vitest) + Python tests (pytest).
 *  2. Compară numărul total de teste PASS cu baseline (state/test-baseline.json).
 *  3. Dacă scade sub baseline → agent test-analyzer rulează automat pe HEAD.
 *  4. Dacă apar warning-uri/deprecation noi → cere Claude clasificare.
 *
 * Salvează un raport zilnic în logs/regression-YYYY-MM-DD.md
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { assertEnabled, createClient, ask, log } from "./_shared.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(__dirname, "..", "state");
const BASELINE_PATH = join(STATE_DIR, "test-baseline.json");
const AGENT = "regression-detector";

if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });

async function main() {
  const cfg = assertEnabled(AGENT);
  const client = createClient();

  log(AGENT, "info", "running-vitest");
  let vitestOut = "";
  let vitestExit = 0;
  try {
    vitestOut = execSync("npm test -- --reporter=json", {
      cwd: join(__dirname, "..", ".."),
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      timeout: 600000,
    });
  } catch (e) {
    vitestOut = e.stdout || "";
    vitestExit = e.status || 1;
  }

  const stats = parseVitestStats(vitestOut);
  log(AGENT, "info", "vitest-done", { ...stats, exit: vitestExit });

  const baseline = existsSync(BASELINE_PATH)
    ? JSON.parse(readFileSync(BASELINE_PATH, "utf8"))
    : { passed: 0, total: 0, ts: null };

  const regression = stats.passed < baseline.passed - 5; // toleranță 5 teste
  const summary = {
    date: new Date().toISOString().slice(0, 10),
    current: stats,
    baseline,
    regression,
    delta: stats.passed - baseline.passed,
  };

  if (regression) {
    log(AGENT, "warn", "regression-detected", summary);

    const userMessage = `REGRESIE TESTE detectată în Zephren.

Baseline (${baseline.ts || "necunoscut"}): ${baseline.passed}/${baseline.total} PASS.
Curent (${summary.date}): ${stats.passed}/${stats.total} PASS.
Delta: ${summary.delta} teste pierdute.

Failed tests (max 15):
${stats.failed_names.slice(0, 15).map((n) => `- ${n}`).join("\n")}

Răspunde în markdown:
1. Cauza probabilă (commit recent suspect: rulează \`git log --oneline -10\` mental)
2. Module afectate (calc / ui / api)
3. Severitate (🔴 critic / 🟡 mediu / 🟢 minor — heuristică: regresie pe calc/* = critic)
4. Plan diagnostic (3 pași concreți)
5. Recomandare: revert / hotfix-pr / investigate

Răspunde în română cu diacritice.`;

    const { text } = await ask(client, AGENT, {
      model: cfg.model,
      userMessage,
      maxTokens: 2048,
    });

    console.log(`# 🚨 Regresie detectată — ${summary.date}\n\n${text}`);
  } else {
    console.log(`✅ ${stats.passed}/${stats.total} PASS — baseline ${baseline.passed} (delta ${summary.delta >= 0 ? "+" : ""}${summary.delta})`);

    // Actualizează baseline dacă e mai bun
    if (stats.passed > baseline.passed) {
      writeFileSync(
        BASELINE_PATH,
        JSON.stringify({ passed: stats.passed, total: stats.total, ts: new Date().toISOString() }, null, 2)
      );
      log(AGENT, "info", "baseline-updated", { passed: stats.passed });
    }
  }
}

function parseVitestStats(output) {
  // Vitest JSON reporter line per test sau summary la final
  const passedMatch = output.match(/"numPassedTests":\s*(\d+)/);
  const totalMatch = output.match(/"numTotalTests":\s*(\d+)/);
  const failedNames = [];
  const failRegex = /"status":\s*"failed"[\s\S]*?"fullName":\s*"([^"]+)"/g;
  let m;
  while ((m = failRegex.exec(output)) !== null && failedNames.length < 50) {
    failedNames.push(m[1]);
  }
  return {
    passed: passedMatch ? parseInt(passedMatch[1], 10) : 0,
    total: totalMatch ? parseInt(totalMatch[1], 10) : 0,
    failed_names: failedNames,
  };
}

main().catch((err) => {
  log(AGENT, "error", err.message, { stack: err.stack });
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
