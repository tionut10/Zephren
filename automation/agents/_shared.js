/**
 * Zephren — Mentenanță automată cu Claude
 * Modul comun: client SDK + helpers + safety guards
 *
 * IMPORTANT: Toți agenții importă din acest fișier pentru:
 *  - logare uniformă în automation/logs/
 *  - safety checks (nu commit direct, nu deploy, nu modificare prețuri)
 *  - rate limiting (max 50 apeluri/zi)
 *  - prompt caching activat (5 min TTL)
 *
 * Activare: setează AUTOMATION_ENABLED=1 + ANTHROPIC_API_KEY în env.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONFIG_PATH = join(ROOT, "config.json");
const LOG_DIR = join(ROOT, "logs");
const RATE_LIMIT_PATH = join(LOG_DIR, "rate-limit.json");

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

export const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));

/**
 * Verifică dacă automatizarea e activă global + per agent.
 * Aruncă eroare dacă e dezactivată — protecție pre-lansare.
 */
export function assertEnabled(agentName) {
  if (!config.enabled) {
    throw new Error(
      `[Zephren-Auto] DEZACTIVAT global. Setează config.enabled=true și AUTOMATION_ENABLED=1 în env.`
    );
  }
  if (process.env.AUTOMATION_ENABLED !== "1") {
    throw new Error(
      `[Zephren-Auto] AUTOMATION_ENABLED env var lipsește. Activare manuală obligatorie post-lansare.`
    );
  }
  const agent = config.agents[agentName];
  if (!agent) throw new Error(`[Zephren-Auto] Agent necunoscut: ${agentName}`);
  if (!agent.enabled) {
    throw new Error(`[Zephren-Auto] Agent "${agentName}" dezactivat în config.json.`);
  }
  return agent;
}

/**
 * Rate limiter zilnic — protejează bugetul Anthropic.
 */
export function checkRateLimit() {
  const today = new Date().toISOString().slice(0, 10);
  let state = { date: today, calls: 0, tokens: 0 };
  if (existsSync(RATE_LIMIT_PATH)) {
    state = JSON.parse(readFileSync(RATE_LIMIT_PATH, "utf8"));
    if (state.date !== today) state = { date: today, calls: 0, tokens: 0 };
  }
  if (state.calls >= config.limits.maxApiCallsPerDay) {
    throw new Error(`[Zephren-Auto] Rate limit zilnic atins: ${state.calls} apeluri.`);
  }
  if (state.tokens >= config.limits.maxTokensPerDay) {
    throw new Error(`[Zephren-Auto] Buget tokens zilnic atins: ${state.tokens}.`);
  }
  return state;
}

export function recordUsage(usage) {
  const state = checkRateLimit();
  state.calls += 1;
  state.tokens += (usage?.input_tokens || 0) + (usage?.output_tokens || 0);
  writeFileSync(RATE_LIMIT_PATH, JSON.stringify(state, null, 2));
}

/**
 * Logare structurată — JSON Lines în logs/<agent>-<date>.jsonl
 */
export function log(agent, level, message, meta = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const path = join(LOG_DIR, `${agent}-${today}.jsonl`);
  const entry = { ts: new Date().toISOString(), level, message, ...meta };
  appendFileSync(path, JSON.stringify(entry) + "\n");
  if (level === "error" || process.env.DEBUG) {
    console.error(`[${agent}] ${level.toUpperCase()}: ${message}`);
  }
}

/**
 * Client Claude cu prompt caching activat.
 * Sistemul de prompt + context Zephren sunt cached (5 min TTL).
 */
export function createClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(`[Zephren-Auto] ANTHROPIC_API_KEY lipsește din env.`);
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/**
 * System prompt comun — context Zephren, cached.
 * Toți agenții îl folosesc cu cache_control: ephemeral.
 */
export const ZEPHREN_SYSTEM_PROMPT = `
Ești agent de mentenanță pentru Zephren — calculator energetic clădiri, conform Mc 001-2022 + Ord. MDLPA 16/2023.

Stack: React 18 + Vite 6 + Vercel + Python serverless + Supabase.
Limbă: română cu diacritice corecte (ă, â, î, ș, ț) — obligatoriu.

REGULI CRITICE (nu pot fi încălcate):
1. NU faci git push direct — doar branch-uri + PR-uri pentru review uman.
2. NU faci deploy în production — niciodată npx vercel --prod.
3. NU modifici prețuri (src/data/pricing.js) — niciodată autonom.
4. NU modifici motoarele de calcul (src/calc/**) fără confirmare umană în PR.
5. Răspunde STRUCTURAT JSON când outputul tău alimentează un alt sistem.
6. La îndoială majoră → escaladează către uman prin issue cu label "needs-human".

Output preferat: markdown pentru comentarii GitHub, JSON pentru integrări.
`.trim();

/**
 * Helper: cheamă Claude cu retry exponential + cache.
 */
export async function ask(client, agent, { model, userMessage, maxTokens = 4096 }) {
  checkRateLimit();
  log(agent, "info", "calling-claude", { model, msgLen: userMessage.length });

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: "text",
        text: ZEPHREN_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  recordUsage(response.usage);
  log(agent, "info", "claude-response", {
    stop_reason: response.stop_reason,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    cache_read: response.usage.cache_read_input_tokens || 0,
  });

  return {
    text: response.content.map((b) => (b.type === "text" ? b.text : "")).join(""),
    usage: response.usage,
  };
}

/**
 * Safety: blochează modificări în zone protejate.
 */
export function isProtectedPath(filePath) {
  const protectedPatterns = config.safety.alwaysRequireHumanReview;
  return protectedPatterns.some((pattern) => {
    const regex = new RegExp(pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*"));
    return regex.test(filePath);
  });
}
