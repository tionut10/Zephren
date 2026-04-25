/**
 * Agent 3: Normative Watcher
 * Trigger: schedule (luni 08:00 RO)
 * Model: Opus 4.7 (high effort)
 *
 * Flux:
 *  1. Fetch surse normative (MDLPA, ASRO, EUR-Lex EPBD).
 *  2. Compară cu snapshot anterior (automation/state/normative-snapshot.json).
 *  3. Dacă există modificări → cere Claude analiza impactului asupra Zephren.
 *  4. Creează issue GitHub cu label "normative-update" + analiza + propuneri patch.
 *
 * NU modifică nimic direct — doar raportează.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { assertEnabled, createClient, ask, log, config } from "./_shared.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(__dirname, "..", "state");
const SNAPSHOT_PATH = join(STATE_DIR, "normative-snapshot.json");
const AGENT = "normative-watcher";

if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });

async function main() {
  const cfg = assertEnabled(AGENT);
  const client = createClient();

  log(AGENT, "info", "fetching-sources", { count: cfg.sources.length });

  const current = await Promise.all(
    cfg.sources.map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Zephren-NormativeWatcher/1.0" },
          signal: AbortSignal.timeout(30000),
        });
        const text = await res.text();
        return { url, status: res.status, hash: simpleHash(text), length: text.length };
      } catch (e) {
        log(AGENT, "warn", "fetch-failed", { url, error: e.message });
        return { url, status: 0, hash: null, error: e.message };
      }
    })
  );

  const previous = existsSync(SNAPSHOT_PATH) ? JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) : { snapshots: [] };
  const changed = current.filter((c) => {
    const prev = previous.snapshots?.find((p) => p.url === c.url);
    return prev && c.hash && prev.hash && prev.hash !== c.hash;
  });

  if (changed.length === 0) {
    log(AGENT, "info", "no-changes");
    console.log("✅ Niciun normativ modificat săptămâna aceasta.");
    writeFileSync(SNAPSHOT_PATH, JSON.stringify({ snapshots: current, ts: new Date().toISOString() }, null, 2));
    return;
  }

  log(AGENT, "warn", "changes-detected", { count: changed.length });

  const userMessage = `Au fost detectate modificări la ${changed.length} sursă/surse normativ(e) urmărite de Zephren.

**Surse modificate**:
${changed.map((c) => `- ${c.url} (hash ${c.hash})`).join("\n")}

Pentru fiecare URL, raportează în markdown:
1. **Tip normativ** (Mc 001 / EN 15232 / EN 16798 / EPBD 2024 / etc.)
2. **Tip schimbare probabil** (revizuire / completare / abrogare)
3. **Impact estimat asupra Zephren** (modul cod afectat: src/calc/**, api/**, src/data/**)
4. **Acțiuni recomandate** (3-5 pași concreți: fetch text complet, identifică delta, propune PR)
5. **Urgență**: 🔴 imediat / 🟡 30 zile / 🟢 monitorizare

La final, generează **lista issue-uri GitHub** de creat (titlu + body scurt) — câte unul per modificare majoră.

Format JSON la final:
\`\`\`json
{
  "issues_to_create": [
    { "title": "[Normativ] Mc 001-2026 — verificare delta cap. III", "body": "...", "labels": ["normative-update", "P1"] }
  ],
  "summary_ro": "frază sumar săptămână"
}
\`\`\`

Răspunde în română cu diacritice.`;

  const { text } = await ask(client, AGENT, {
    model: cfg.model,
    userMessage,
    maxTokens: 8192,
  });

  console.log(text);

  // Salvează snapshot nou
  writeFileSync(SNAPSHOT_PATH, JSON.stringify({ snapshots: current, ts: new Date().toISOString() }, null, 2));
  log(AGENT, "info", "snapshot-updated");
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h.toString(16);
}

main().catch((err) => {
  log(AGENT, "error", err.message, { stack: err.stack });
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
