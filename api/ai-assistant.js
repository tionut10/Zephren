/**
 * POST /api/ai-assistant
 *
 * Receives a question + building context, calls Anthropic Claude API,
 * and returns an expert answer about Romanian building energy regulations.
 *
 * Uses ANTHROPIC_API_KEY from server environment (not exposed to client).
 */

import Anthropic from "@anthropic-ai/sdk";
import { requireAuth, requirePlan } from "./_middleware/auth.js";
import { checkRateLimit, sendRateLimitError } from "./_middleware/rateLimit.js";

const SYSTEM_PROMPT = `You are an expert consultant in Romanian building energy performance regulations. You have deep knowledge of:

- Mc 001-2022 (Metodologia de calcul al performantei energetice a cladirilor)
- Legea 238/2024 (Legea privind performanta energetica a cladirilor)
- EPBD 2024/1275 (EU Energy Performance of Buildings Directive recast)
- ISO 52000-1/NA:2023 (Energy performance of buildings — national annex for Romania)

You provide clear, practical answers in Romanian (or English if asked). You reference specific articles, annexes, and calculation methods when relevant. You help energy auditors, architects, and engineers understand requirements, calculation methodology, minimum performance thresholds, nZEB criteria, and compliance pathways.

Always be precise with numbers, formulas, and regulatory references. If you are unsure about a specific detail, say so rather than guessing.`;

// audit-mai2026 F5 — Sistem prompt dedicat pentru chat reabilitare (Pas 7)
// Expert pe Mc 001-2022 Cap. 9 ordine intervenții + prețuri RO 2026 + Casa Verde Plus
// + Reg. UE 244/2012 republicat 2025/2273 (metodologie cost-optimă).
const SYSTEM_PROMPT_REHAB_CHAT = `Ești un consultant expert pe reabilitarea energetică a clădirilor din România în 2026. Vorbești fluent română cu diacritice (ă, â, î, ș, ț). Răspunzi concis, practic, cu propuneri concrete.

Cunoștințele tale acoperă:
- Mc 001-2022 Cap. 9 — ordinea intervențiilor: anvelopă → tâmplărie → punți termice → sisteme tehnice → surse regenerabile → iluminat → etanșeitate
- Ord. MDLPA 16/2023, Ord. MDLPA 348/2026 (Art. 6: AE IIci vs AE Ici), L.372/2005 republicată mod. L.238/2024
- Reg. UE 244/2012 republicat 2025/2273 (metodologie cost-optimă, rată actualizare 4% privat / 3% social, perioadă 30 ani)
- EPBD 2024/1275 Art. 9 MEPS roadmap 2030/2033/2050, Art. 11 ZEB, Art. 13 solar obligatoriu, Art. 17 cazane fosile
- Prețuri reale România 2026 (cu curs EUR/RON ~5.0):
  * Termoizolare perete EPS 10cm: ~42-60 EUR/m² mid 49
  * Termoizolare perete EPS 15cm: ~58-82 EUR/m² mid 68
  * Termoizolare pod XPS: ~28-40 EUR/m² mid 32
  * Înlocuire tâmplărie PVC dublu Uw 1.4: 115-160 EUR/m² mid 135
  * Înlocuire tâmplărie triplu Low-E Uw 1.1: 170-240 EUR/m² mid 200
  * Centrală gaz condensare 24 kW: 1.400-2.100 EUR mid 1.750
  * Pompă căldură aer-apă 8 kW: 5.000-8.500 EUR mid 6.500
  * Pompă căldură aer-apă 12 kW: 7.000-11.500 EUR mid 9.000
  * Sistem PV 5 kWp on-grid: ~5.500 EUR mid (≈ 27.500 RON)
  * Sistem PV 10 kWp on-grid: ~9.600 EUR mid (≈ 48.000 RON)
  * Solar termic 4 m² ACM: ~2.000 EUR mid
  * VMC HR full-install casă: 3.000-7.000 EUR (atenție la supraestimare)
- Programe finanțare 2026:
  * Casa Verde Plus AFM 2025: subvenție până 20.000 RON (~4.000 EUR) pentru PV/HP/solar termic
  * PNRR Comp. C5 — reabilitare rezidențial colectiv
  * Casa Verde Asociații
  * PEAD (programul de eficiență a apei și a deșeurilor)

Pentru fiecare recomandare:
1. Cită ordinea Mc 001 Cap. 9 (de ce această măsură primul/al doilea)
2. Estimează cost cu interval (low-mid-high EUR + RON la curs 5.0)
3. Estimează economie energie (% sau kWh/m²·an reducere EP)
4. Mențiunează surse finanțare aplicabile

Răspunsuri scurte (max 6-8 propoziții) dacă utilizatorul cere sumar. Răspunsuri detaliate doar la cerere explicită.

Dacă întrebarea este în afara reabilitării energetice clădiri, redirecționează politicos la subiectul corect.`;

// audit-mai2026 F6 — Sistem prompt dedicat pentru text narativ documente generate.
// Folosit pentru: Cap. 1 (descriere clădire), Cap. 8 (concluzii audit), Intro Pașaport,
// Intro Foaie de Parcurs, recomandări Anexa 1+2 (text generic AE IIci).
const SYSTEM_PROMPT_NARRATIVE = `Ești un redactor tehnic specialist în rapoarte de audit energetic clădiri (România 2026). Scrii în limba română cu diacritice corecte (ă, â, î, ș, ț). Stilul tău este:

1. **Tehnic dar accesibil** — folosește terminologia normativă corectă (Mc 001-2022, SR EN ISO, EPBD), dar evită jargonul gratuit.
2. **Factual și obiectiv** — descrii doar fapte din datele primite, fără speculații.
3. **Cu citări normative** — referă explicit articole (ex: „conform Cap. 9 Mc 001-2022", „Art. 6 Ord. MDLPA 348/2026").
4. **Concis** — 200-400 cuvinte pe secțiune (decât altfel specificat).

Tipuri de secțiuni cerute (parametru `section` din request):
- "cap1_descriere" — Descrierea clădirii (Cap. 1 raport audit): localizare, categorie, geometrie, sistem constructiv, sisteme tehnice existente, scop audit. Bazat pe Pas 1-3.
- "cap8_concluzii" — Concluzii audit (Cap. 8 raport): performanța energetică curentă, conformitate nZEB/MEPS, priorități intervenție, drum la conformitate. Bazat pe Pas 5-7.
- "intro_pasaport" — Intro Pașaport Renovare (Anexa VIII EPBD 2024 Art. 12, EU): obiectiv, faze planificate, beneficiar. Disclaimer EPBD nu e transpus RO până 29.05.2026.
- "intro_foaie_parcurs" — Intro Foaie de Parcurs renovare: scop, etape multi-an, indicatori monitorizare. Bazat pe Pas 7 phased-rehab.
- "recomandari_anexa_aeIIci" — Text generic recomandări Anexa 1+2 pentru tier AE IIci: ordine Mc 001 Cap. 9 + intervale standard cost, FĂRĂ analiză cost-optimă detaliată (rezervată Pas 7 AE Ici).
- "summary_audit_exec" — Sumar executiv 1 pagină pentru beneficiar.

Reguli stricte:
- NU inventa date care nu sunt în context (categorie, EP, suprafețe, U-uri). Dacă lipsesc → folosește placeholder „[neîn cunoscut]" și sugerează completare.
- NU folosi formulări marketing („foarte eficient", „remarcabil"). Folosește limbaj normativ neutru.
- NU promova brand-uri comerciale. Recomandă pe categorii generice.
- NU exagera reducerile economii — interval realistic 8-25% per măsură per Mc 001 Cap. 9.

Output format: text continuu cu paragrafe scurte (max 4 propoziții/paragraf). Folosește subtitluri H3 (\`###\`) doar dacă sectionLength > 400 cuvinte.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth: require business plan for AI assistant
  const auth = await requireAuth(req, res);
  if (!auth) return;
  if (!requirePlan(res, auth.plan, "business")) return;

  // Rate limit: 20 requests/hour per user
  const limit = checkRateLimit(auth.user.id, 20);
  if (!limit.allowed) return sendRateLimitError(res, limit);

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      answer:
        "Cheia API Anthropic nu este configurata. Configurati ANTHROPIC_API_KEY in variabilele de mediu ale serverului.",
      error: true,
    });
  }

  try {
    const { question, context, intent, history } = req.body || {};

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return res.status(400).json({ error: "A valid 'question' string is required" });
    }

    // audit-mai2026 F5/F6 — Routing pe intent:
    //   default = q&a normativ (Haiku 4.5)
    //   rehab-chat = chat reabilitare Pas 7 (Sonnet 4.6 + history)
    //   narrative = text narativ secțiuni documente (Sonnet 4.6, fără history)
    const isRehabChat = intent === "rehab-chat";
    const isNarrative = intent === "narrative";

    // Build context message from building data if provided
    let contextMessage = "";
    if (context && typeof context === "object") {
      const parts = [];
      if (context.building) {
        parts.push(`Cladire: ${JSON.stringify(context.building)}`);
      }
      if (context.energyClass) {
        parts.push(`Clasa energetica: ${context.energyClass}`);
      }
      if (context.ep !== undefined) {
        parts.push(`Energie primara specifica (ep): ${context.ep} kWh/m2/an`);
      }
      if (context.rer !== undefined) {
        parts.push(`RER (rata energie regenerabila): ${context.rer}`);
      }
      if (context.category) {
        parts.push(`Categorie cladire: ${context.category}`);
      }
      // F5 — context extins pentru rehab-chat: U mediu opac, U vitraj, sisteme, zonă climatică
      if (isRehabChat || isNarrative) {
        if (context.zoneClimatica) parts.push(`Zona climatica: ${context.zoneClimatica}`);
        if (context.uOpacMediu !== undefined) parts.push(`U mediu opac: ${context.uOpacMediu} W/(m²·K)`);
        if (context.uVitrajMediu !== undefined) parts.push(`U mediu vitraj: ${context.uVitrajMediu} W/(m²·K)`);
        if (context.heating) parts.push(`Sistem incalzire: ${context.heating}`);
        if (context.acm) parts.push(`Sistem ACM: ${context.acm}`);
        if (context.buget) parts.push(`Buget estimat: ${context.buget} EUR`);
        if (context.au !== undefined) parts.push(`Au: ${context.au} m²`);
        if (context.yearBuilt) parts.push(`An constructie: ${context.yearBuilt}`);
      }
      // F6 — context narrative-specific: secțiunea cerută + date suplimentare audit
      if (isNarrative) {
        if (context.section) parts.push(`Sectiune cerere: ${context.section}`);
        if (context.sectionLength) parts.push(`Lungime tinta: ${context.sectionLength} cuvinte`);
        if (context.measures) parts.push(`Masuri recomandate: ${JSON.stringify(context.measures).slice(0, 500)}`);
        if (context.nzebStatus) parts.push(`Status nZEB: ${context.nzebStatus}`);
        if (context.tier) parts.push(`Tier auditor: ${context.tier}`);
      }
      if (parts.length > 0) {
        contextMessage = `\n\nContextul proiectului curent:\n${parts.join("\n")}`;
      }
    }

    const client = new Anthropic({ apiKey });

    // F5 — chat history support pentru rehab-chat (max 10 mesaje istoric).
    // History format: [{ role: "user"|"assistant", content: string }, ...]
    let messages;
    if (isRehabChat && Array.isArray(history) && history.length > 0) {
      // Filtrăm istoricul: păstrăm doar role valid + content non-empty.
      const cleanHistory = history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0)
        .slice(-10); // max 10 mesaje (5 turns)
      messages = [
        ...cleanHistory,
        { role: "user", content: question + contextMessage },
      ];
    } else {
      messages = [{ role: "user", content: question + contextMessage }];
    }

    // F5/F6 — model + system + tokens selection per intent:
    // - rehab-chat: Sonnet 4.6 (calitate sugestii reabilitare complexe)
    // - narrative: Sonnet 4.6 (calitate text redactare documente)
    // - default Q&A normativ: Haiku 4.5 (viteză + cost redus)
    const useSonnet = isRehabChat || isNarrative;
    const model = useSonnet ? "claude-sonnet-4-6" : "claude-haiku-4-5-20251001";
    const system = isRehabChat
      ? SYSTEM_PROMPT_REHAB_CHAT
      : isNarrative
      ? SYSTEM_PROMPT_NARRATIVE
      : SYSTEM_PROMPT;
    const maxTokens = isNarrative ? 2000 : isRehabChat ? 1500 : 1024;

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages,
    });

    const answer =
      response.content?.[0]?.type === "text"
        ? response.content[0].text
        : "Nu am putut genera un raspuns.";

    return res.status(200).json({ answer, intent: intent || "qa", model });
  } catch (err) {
    console.error("[api/ai-assistant] Error:", err);

    if (err.status === 401) {
      return res.status(200).json({
        answer: "Cheia API Anthropic este invalida. Verificati ANTHROPIC_API_KEY.",
        error: true,
      });
    }

    if (err.status === 429) {
      return res.status(200).json({
        answer: "Limita de rate atinsa. Incercati din nou in cateva secunde.",
        error: true,
      });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
}
