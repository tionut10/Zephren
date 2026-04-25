/**
 * Agent 1: Test Analyzer
 * Trigger: pull_request (GitHub Actions)
 * Model: Sonnet 4.6 (medium effort)
 *
 * Flux:
 *  1. Citește output Vitest + Playwright din artefact GitHub Actions.
 *  2. Identifică testele eșuate + extrage stack traces.
 *  3. Cere Claude diagnostic: cauza probabilă + fișier + linie + propunere fix.
 *  4. Postează comentariu pe PR cu sumar markdown.
 *
 * NU modifică niciodată cod direct — doar comentează.
 */

import { readFileSync } from "node:fs";
import { assertEnabled, createClient, ask, log } from "./_shared.js";

const AGENT = "test-analyzer";

async function main() {
  const cfg = assertEnabled(AGENT);
  const client = createClient();

  const vitestReport = process.env.VITEST_REPORT_PATH || "./test-results/vitest-report.json";
  const playwrightReport = process.env.PLAYWRIGHT_REPORT_PATH || "./test-results/playwright-report.json";

  let vitestData = null;
  let playwrightData = null;

  try {
    vitestData = JSON.parse(readFileSync(vitestReport, "utf8"));
  } catch (e) {
    log(AGENT, "warn", "no-vitest-report", { error: e.message });
  }
  try {
    playwrightData = JSON.parse(readFileSync(playwrightReport, "utf8"));
  } catch (e) {
    log(AGENT, "warn", "no-playwright-report", { error: e.message });
  }

  const failed = extractFailures(vitestData, playwrightData);
  if (failed.length === 0) {
    log(AGENT, "info", "all-tests-pass");
    console.log("✅ Toate testele PASS — nimic de analizat.");
    return;
  }

  const userMessage = buildAnalysisPrompt(failed);
  const { text } = await ask(client, AGENT, {
    model: cfg.model,
    userMessage,
    maxTokens: 4096,
  });

  // Output → stdout (GitHub Actions îl preia și îl postează ca PR comment)
  console.log("## 🤖 Diagnostic Claude — eșecuri teste\n");
  console.log(text);
  console.log("\n---\n_Generat automat de `automation/agents/test-analyzer.js` — Sonnet 4.6_");

  log(AGENT, "info", "analysis-complete", { failures: failed.length });
}

function extractFailures(vitest, playwright) {
  const failures = [];
  if (vitest?.testResults) {
    vitest.testResults.forEach((suite) => {
      suite.assertionResults?.filter((t) => t.status === "failed").forEach((t) => {
        failures.push({
          source: "vitest",
          file: suite.name,
          test: t.fullName || t.title,
          message: t.failureMessages?.[0] || "no message",
        });
      });
    });
  }
  if (playwright?.suites) {
    walkPlaywright(playwright.suites, failures);
  }
  return failures;
}

function walkPlaywright(suites, out) {
  for (const s of suites) {
    s.specs?.forEach((spec) => {
      spec.tests?.forEach((t) => {
        t.results?.filter((r) => r.status === "failed").forEach((r) => {
          out.push({
            source: "playwright",
            file: spec.file,
            test: spec.title,
            message: r.error?.message || "no message",
          });
        });
      });
    });
    if (s.suites) walkPlaywright(s.suites, out);
  }
}

function buildAnalysisPrompt(failures) {
  const limited = failures.slice(0, 10);
  return `Analizează aceste ${failures.length} eșecuri de teste din Zephren și produ un diagnostic structurat.

${limited.map((f, i) => `### ${i + 1}. [${f.source}] ${f.test}
**Fișier**: ${f.file}
**Mesaj**:
\`\`\`
${f.message.slice(0, 800)}
\`\`\`
`).join("\n")}

Pentru fiecare eșec, raportează în markdown:
- **Cauză probabilă** (1 linie)
- **Fișier sursă suspect** (cale + linie estimată)
- **Propunere fix** (1-2 linii cod sau abordare)
- **Severitate**: 🔴 critic / 🟡 mediu / 🟢 minor

Sumarizează la final cu o recomandare: merge / block / human-review.

NU propune commit — doar diagnostic. Răspunde în română cu diacritice.`;
}

main().catch((err) => {
  log(AGENT, "error", err.message, { stack: err.stack });
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
