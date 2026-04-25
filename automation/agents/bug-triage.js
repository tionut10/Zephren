/**
 * Agent 2: Bug Triage
 * Trigger: issue_opened (GitHub Actions)
 * Model: Sonnet 4.6
 *
 * Flux:
 *  1. Citește titlu + descriere issue din env (GITHUB_EVENT_PATH).
 *  2. Cere Claude clasificare: tip, severitate, modul afectat, propunere reproducere.
 *  3. Postează comentariu cu triajul + sugerează label-uri (P0..P3, area:*).
 *  4. La severitate 🔴 critic → escaladează cu label "needs-human-urgent".
 */

import { readFileSync } from "node:fs";
import { assertEnabled, createClient, ask, log } from "./_shared.js";

const AGENT = "bug-triage";

async function main() {
  const cfg = assertEnabled(AGENT);
  const client = createClient();

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error("GITHUB_EVENT_PATH lipsește (rulare în afara GitHub Actions?).");
  const event = JSON.parse(readFileSync(eventPath, "utf8"));
  const issue = event.issue;
  if (!issue) throw new Error("Event-ul nu conține issue.");

  log(AGENT, "info", "issue-received", { number: issue.number, title: issue.title });

  const userMessage = `Triază acest bug raportat în Zephren.

**Titlu**: ${issue.title}

**Descriere**:
${issue.body || "(fără descriere)"}

**Autor**: ${issue.user?.login || "necunoscut"}
**Etichete existente**: ${(issue.labels || []).map((l) => l.name).join(", ") || "niciuna"}

Răspunde STRICT în JSON cu schema:

\`\`\`json
{
  "type": "bug | feature | question | docs | duplicate | invalid",
  "severity": "critic | major | mediu | minor",
  "priority": "P0 | P1 | P2 | P3",
  "area": "calc | ui | api | export | auth | normative | infra",
  "step_affected": "Step1 | Step2 | ... | Step8 | none",
  "module_suspect": "cale/fișier.ext sau null",
  "reproduction_steps_clear": true | false,
  "missing_info": ["lista informații lipsă"],
  "suggested_labels": ["P0", "area:calc", ...],
  "needs_human_urgent": true | false,
  "summary_ro": "1 frază în română cu diacritice",
  "next_action": "ce urmează concret"
}
\`\`\`

Reguli:
- Bug-uri pe motoare calcul (src/calc/**) sau API (api/**) → severity ≥ major.
- Pierdere date / coruption → critic + needs_human_urgent=true.
- Întrebări fără reproducere → cere info lipsă.
- Răspuns DOAR JSON valid, fără text adițional.`;

  const { text } = await ask(client, AGENT, {
    model: cfg.model,
    userMessage,
    maxTokens: 2048,
  });

  const json = parseJsonBlock(text);
  log(AGENT, "info", "triage-result", json);

  // Output pentru GitHub Actions: comentariu markdown + label-uri suggested
  console.log(formatComment(json));

  // Side-channel: scrie label-urile într-un file ca workflow să le aplice via gh CLI
  if (process.env.LABELS_OUTPUT_PATH) {
    const labels = json.suggested_labels.concat(json.needs_human_urgent ? ["needs-human-urgent"] : []);
    const fs = await import("node:fs");
    fs.writeFileSync(process.env.LABELS_OUTPUT_PATH, labels.join("\n"));
  }
}

function parseJsonBlock(text) {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error("Răspuns Claude nu conține JSON valid.");
  return JSON.parse(match[1]);
}

function formatComment(t) {
  const sevEmoji = { critic: "🔴", major: "🟠", mediu: "🟡", minor: "🟢" }[t.severity] || "⚪";
  const flag = t.needs_human_urgent ? "\n\n🚨 **ESCALARE URGENTĂ — review uman imediat.**" : "";

  return `## 🤖 Triaj automat — ${sevEmoji} ${t.severity.toUpperCase()} / ${t.priority}

**Tip**: \`${t.type}\` · **Modul**: \`${t.area}\` · **Step**: \`${t.step_affected}\`
${t.module_suspect ? `**Fișier suspect**: \`${t.module_suspect}\`` : ""}

**Sumar**: ${t.summary_ro}

**Reproducere clară**: ${t.reproduction_steps_clear ? "✅ da" : "❌ nu"}
${t.missing_info?.length ? `**Lipsește**: ${t.missing_info.join(", ")}` : ""}

**Label-uri propuse**: ${t.suggested_labels.map((l) => `\`${l}\``).join(", ")}

**Următorul pas**: ${t.next_action}${flag}

---
_Triaj generat de Claude (Sonnet 4.6) — verifică & ajustează manual._`;
}

main().catch((err) => {
  log(AGENT, "error", err.message, { stack: err.stack });
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
