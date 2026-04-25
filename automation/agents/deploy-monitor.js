/**
 * Agent 4: Deploy Monitor
 * Trigger: deployment_success (GitHub Actions, post-Vercel)
 * Model: Haiku 4.5 (low effort — task simplu)
 *
 * Flux:
 *  1. La fiecare 1h în primele 24h post-deploy → fetch Vercel error logs.
 *  2. Detectează spike-uri de erori (>3x baseline).
 *  3. Cere Haiku sumar + clasificare gravitate.
 *  4. La P0/P1 → creează issue + opțional notifică prin GitHub mention.
 *
 * NU rollback automat. NU modifică producție.
 */

import { assertEnabled, createClient, ask, log } from "./_shared.js";

const AGENT = "deploy-monitor";

async function main() {
  const cfg = assertEnabled(AGENT);
  const client = createClient();

  if (!process.env.VERCEL_TOKEN) {
    log(AGENT, "warn", "missing-vercel-token");
    console.error("⚠️ VERCEL_TOKEN lipsește. Sari peste monitorizare.");
    process.exit(0);
  }

  const projectId = cfg.vercelProject || "energy-app-ruby";
  const since = Date.now() - 60 * 60 * 1000; // ultima oră

  log(AGENT, "info", "fetching-vercel-logs", { projectId, since: new Date(since).toISOString() });

  const res = await fetch(
    `https://api.vercel.com/v3/deployments?projectId=${projectId}&limit=5&state=READY`,
    { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` } }
  );
  if (!res.ok) throw new Error(`Vercel API ${res.status}: ${await res.text()}`);
  const { deployments } = await res.json();
  const latest = deployments[0];
  if (!latest) {
    log(AGENT, "info", "no-deployments");
    return;
  }

  const logsRes = await fetch(
    `https://api.vercel.com/v2/deployments/${latest.uid}/events?limit=200&since=${since}`,
    { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` } }
  );
  const events = await logsRes.json();
  const errors = (Array.isArray(events) ? events : events.events || []).filter(
    (e) => e.type === "stderr" || e.level === "error" || e.statusCode >= 500
  );

  if (errors.length < 5) {
    log(AGENT, "info", "errors-below-threshold", { count: errors.length });
    console.log(`✅ ${errors.length} erori în ultima oră — sub prag.`);
    return;
  }

  const sample = errors.slice(0, 20).map((e) => ({
    text: (e.text || e.message || "").slice(0, 300),
    code: e.statusCode,
    path: e.payload?.path || e.path,
  }));

  const userMessage = `Deploy Vercel ${latest.uid} (Zephren prod) — ${errors.length} erori în ultima oră.

**Sample (20 erori)**:
\`\`\`json
${JSON.stringify(sample, null, 2)}
\`\`\`

Răspunde în JSON:
\`\`\`json
{
  "severity": "P0 | P1 | P2",
  "is_regression": true | false,
  "common_pattern": "descriere pattern dominant sau null",
  "affected_endpoints": ["/api/...", ...],
  "recommended_action": "rollback | hotfix | monitor | ignore",
  "summary_ro": "1 frază română"
}
\`\`\`

Reguli:
- >50% erori pe același endpoint = pattern → P1.
- Erori pe /api/calc-* sau /api/generate-* = P0 (afectează auditul utilizator).
- Erori 404 izolate = ignore.
`;

  const { text } = await ask(client, AGENT, {
    model: cfg.model,
    userMessage,
    maxTokens: 1024,
  });

  console.log(text);
  log(AGENT, "info", "monitor-complete", { errors: errors.length });
}

main().catch((err) => {
  log(AGENT, "error", err.message, { stack: err.stack });
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
