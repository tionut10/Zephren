/**
 * voiceCommandsRO — Sprint Smart Input 2026 (D3)
 *
 * Clasificator simplu pentru comenzi vocale RO. Detectează intenția
 * proceduralizatoare ("aplică șablon", "duplică ultimul") din text
 * recunoscut prin Web Speech API, vs. descriere liberă de clădire.
 *
 * Filozofie: heuristică client-side fără cost API. Pentru fraze complexe
 * (>1 verb), nu match-uim → fallback la text normal → Chat AI.
 *
 * API:
 *   classifyVoiceCommand(transcript) → { command, params } | null
 *
 * Comenzi suportate:
 *   - apply_template     — „aplică șablon", „șablon casă unifamilială"
 *   - duplicate_recent   — „duplică ultimul", „duplică proiectul anterior"
 *   - open_tutorial      — „deschide tutorial", „pornește tutorial"
 *   - open_quickfill     — „quick fill", „completare rapidă", „wizard"
 *   - open_chat          — „deschide chat", „chat AI"
 *   - cancel             — „anulează", „stop", „șterge tot"
 *
 * Nematch → null → caller-ul tratează ca submit text normal.
 */

const NORMALIZE = (s) => String(s || "")
  .toLowerCase()
  .trim()
  // Normalizează diacritice pentru match robust (utilizatorii dictează variat)
  .replace(/[ăâ]/g, "a")
  .replace(/î/g, "i")
  .replace(/[șş]/g, "s")
  .replace(/[țţ]/g, "t");

// Pattern-uri în ordinea priorității (primul match câștigă)
const PATTERNS = [
  {
    command: "duplicate_recent",
    rx: /\b(duplic[aă]|reia|deschide)\s+(ultim[ua]l|proiectul\s+anterior|recent|cel\s+mai\s+recent)\b/i,
  },
  {
    command: "apply_template",
    rx: /\b(aplic[aă]|foloseste|fol\s*oseste|deschide)\s+(sablon|template|model)(?:ul)?(?:\s+(?<name>[\w\s-]+))?\b/i,
    extract: (m) => ({ name: (m.groups?.name || "").trim() || null }),
  },
  {
    command: "open_tutorial",
    rx: /\b(deschide|porneste|incepe)\s+tutorial\b/i,
  },
  {
    command: "open_quickfill",
    rx: /\b(quick\s*fill|completare\s+rapida|wizard|vrajitor)\b/i,
  },
  {
    command: "open_chat",
    rx: /\b(deschide|porneste)\s+(chat|chat\s*ai|asistent)\b/i,
  },
  {
    command: "cancel",
    rx: /^\s*(anuleaza|opreste|stop|sterge\s+tot|reseteaza)\s*[.!]?\s*$/i,
  },
];

export function classifyVoiceCommand(transcript) {
  if (!transcript || typeof transcript !== "string") return null;
  const normalized = NORMALIZE(transcript);
  if (normalized.length < 3) return null;

  for (const pattern of PATTERNS) {
    const match = pattern.rx.exec(normalized);
    if (match) {
      const params = pattern.extract ? pattern.extract(match) : {};
      return { command: pattern.command, params, originalText: transcript.trim() };
    }
  }
  return null;
}

// Lista publică pentru testare + UI help
export const SUPPORTED_COMMANDS = [
  {
    command: "duplicate_recent",
    examples: ["duplică ultimul", "deschide proiectul anterior", "reia recent"],
    description: "Duplică ultimul proiect editat",
  },
  {
    command: "apply_template",
    examples: ["aplică șablon", "aplică șablon casă unifamilială", "deschide template"],
    description: "Deschide selectorul de șabloane (sau aplică direct dacă nume specificat)",
  },
  {
    command: "open_tutorial",
    examples: ["deschide tutorial", "începe tutorial"],
    description: "Pornește tutorialul interactiv",
  },
  {
    command: "open_quickfill",
    examples: ["quick fill", "completare rapidă", "wizard"],
    description: "Deschide QuickFill Wizard",
  },
  {
    command: "open_chat",
    examples: ["deschide chat AI", "asistent"],
    description: "Deschide Chat AI",
  },
  {
    command: "cancel",
    examples: ["anulează", "stop", "reseteaza"],
    description: "Anulează acțiunea curentă",
  },
];
