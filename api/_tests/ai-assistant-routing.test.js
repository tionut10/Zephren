/**
 * ai-assistant-routing.test.js — audit-mai2026 F5+F6
 *
 * Verifică structura system prompts și routing per intent pentru
 * api/ai-assistant.js (DOAR statice — fără apel API real).
 *
 * Tests:
 *   1. SYSTEM_PROMPT_REHAB_CHAT conține elementele cheie Mc 001 Cap.9 + prețuri RO
 *   2. SYSTEM_PROMPT_NARRATIVE conține lista celor 6 secțiuni narrative
 *   3. SYSTEM_PROMPT default conține Mc 001-2022 + EPBD + ISO 52000
 *
 * NU testăm handler-ul (necesită Anthropic mock + Vercel env) — focus pe content.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// audit-mai2026 production-fix (12 mai 2026): test smoke care prinde erori
// de sintaxă JS la deploy-time. Anterior testele citeau fișierul ca string
// (readFileSync) și nu îl executau ca modul → bug F6 cu backticks duble în
// template literal (`section` în interior de \`...\`) a trecut de teste DAR
// a făcut FUNCTION_INVOCATION_FAILED pe production Vercel.
describe("audit-mai2026 production-fix — module importable smoke test", () => {
  it("api/ai-assistant.js poate fi importat ca ES module (no syntax errors)", async () => {
    const mod = await import("../ai-assistant.js");
    expect(typeof mod.default).toBe("function");
  });
});
const AI_ASSISTANT_PATH = join(__dirname, "..", "ai-assistant.js");
const FILE_CONTENT = readFileSync(AI_ASSISTANT_PATH, "utf-8");

describe("audit-mai2026 F5+F6 — ai-assistant.js system prompts", () => {
  describe("SYSTEM_PROMPT default (Q&A normativ)", () => {
    it("conține Mc 001-2022 + EPBD 2024 + Legea 238/2024 + ISO 52000", () => {
      expect(FILE_CONTENT).toContain("Mc 001-2022");
      expect(FILE_CONTENT).toContain("EPBD 2024/1275");
      expect(FILE_CONTENT).toContain("Legea 238/2024");
      expect(FILE_CONTENT).toContain("ISO 52000-1/NA:2023");
    });
  });

  describe("SYSTEM_PROMPT_REHAB_CHAT (Pas 7 chat reabilitare)", () => {
    it("conține referința Mc 001 Cap. 9 ordine intervenții", () => {
      expect(FILE_CONTENT).toContain("Mc 001-2022 Cap. 9");
      expect(FILE_CONTENT).toContain("anvelopă → tâmplărie → punți termice");
    });

    it("conține Ord. MDLPA 348/2026 Art. 6 (AE IIci vs Ici)", () => {
      expect(FILE_CONTENT).toContain("Ord. MDLPA 348/2026");
      expect(FILE_CONTENT).toContain("AE IIci");
      expect(FILE_CONTENT).toContain("AE Ici");
    });

    it("conține Reg. UE 244/2012 republicat 2025/2273", () => {
      expect(FILE_CONTENT).toContain("Reg. UE 244/2012");
      expect(FILE_CONTENT).toContain("2025/2273");
    });

    it("conține tabel prețuri RO 2026 — anvelopă, HP, PV, VMC", () => {
      expect(FILE_CONTENT).toContain("Termoizolare perete EPS 10cm");
      expect(FILE_CONTENT).toContain("Pompă căldură aer-apă");
      expect(FILE_CONTENT).toContain("Sistem PV 5 kWp");
      expect(FILE_CONTENT).toContain("VMC HR");
    });

    it("conține programe finanțare 2026 (Casa Verde Plus + PNRR)", () => {
      expect(FILE_CONTENT).toContain("Casa Verde Plus");
      expect(FILE_CONTENT).toContain("PNRR");
    });

    it("instrucțiune pentru output structurat (Cap. 9 + cost + economie + finanțare)", () => {
      expect(FILE_CONTENT).toContain("Cită ordinea Mc 001 Cap. 9");
      expect(FILE_CONTENT).toContain("Estimează cost");
      expect(FILE_CONTENT).toContain("Estimează economie energie");
      expect(FILE_CONTENT).toContain("surse finanțare");
    });
  });

  describe("SYSTEM_PROMPT_NARRATIVE (text narativ documente)", () => {
    it("conține cele 6 tipuri secțiuni narrative", () => {
      expect(FILE_CONTENT).toContain("cap1_descriere");
      expect(FILE_CONTENT).toContain("cap8_concluzii");
      expect(FILE_CONTENT).toContain("intro_pasaport");
      expect(FILE_CONTENT).toContain("intro_foaie_parcurs");
      expect(FILE_CONTENT).toContain("recomandari_anexa_aeIIci");
      expect(FILE_CONTENT).toContain("summary_audit_exec");
    });

    it("conține reguli stricte anti-hallucination și anti-marketing", () => {
      expect(FILE_CONTENT).toContain("NU inventa date");
      expect(FILE_CONTENT).toContain("NU folosi formulări marketing");
      expect(FILE_CONTENT).toContain("NU promova brand-uri");
    });

    it("conține interval realistic reduceri (8-25% per măsură)", () => {
      expect(FILE_CONTENT).toContain("8-25%");
    });

    it("specifică diacritice românești obligatorii", () => {
      expect(FILE_CONTENT).toMatch(/diacritice/);
      expect(FILE_CONTENT).toContain("ă, â, î, ș, ț");
    });
  });

  describe("Routing handler — intent dispatching", () => {
    it("isRehabChat verifică intent === 'rehab-chat'", () => {
      expect(FILE_CONTENT).toContain('intent === "rehab-chat"');
    });

    it("isNarrative verifică intent === 'narrative'", () => {
      expect(FILE_CONTENT).toContain('intent === "narrative"');
    });

    it("useSonnet = (isRehabChat || isNarrative)", () => {
      expect(FILE_CONTENT).toContain("useSonnet = isRehabChat || isNarrative");
    });

    it("Model selection: Sonnet 4.6 pentru rehab/narrative, Haiku altfel", () => {
      expect(FILE_CONTENT).toContain('"claude-sonnet-4-6"');
      expect(FILE_CONTENT).toContain('"claude-haiku-4-5-20251001"');
    });

    it("Max tokens: 2000 narrative / 1500 rehab / 1024 default", () => {
      expect(FILE_CONTENT).toContain("isNarrative ? 2000");
      expect(FILE_CONTENT).toContain("isRehabChat ? 1500 : 1024");
    });

    it("Response include intent + model în payload", () => {
      expect(FILE_CONTENT).toContain('intent: intent || "qa"');
      expect(FILE_CONTENT).toMatch(/model\s*[,}]/); // response model field
    });
  });

  describe("Context extras pentru narrative", () => {
    it("context narrative include section + sectionLength + measures + nzebStatus + tier", () => {
      expect(FILE_CONTENT).toContain("context.section");
      expect(FILE_CONTENT).toContain("context.sectionLength");
      expect(FILE_CONTENT).toContain("context.measures");
      expect(FILE_CONTENT).toContain("context.nzebStatus");
      expect(FILE_CONTENT).toContain("context.tier");
    });
  });
});
