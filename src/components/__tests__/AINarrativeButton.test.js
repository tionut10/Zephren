/**
 * AINarrativeButton.test.js — audit-mai2026 P1.2 foundation
 *
 * Verifică structura helper-ului fetchNarrativeAI + SECTION_LABELS.
 * NU testează render React (fetch este mock-uit prin global).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchNarrativeAI, SECTION_LABELS } from "../AINarrativeButton.jsx";

describe("audit-mai2026 P1.2 — AINarrativeButton helpers", () => {
  describe("SECTION_LABELS", () => {
    it("conține toate 6 secțiuni narrative din intent='narrative'", () => {
      expect(SECTION_LABELS.cap1_descriere).toBeDefined();
      expect(SECTION_LABELS.cap8_concluzii).toBeDefined();
      expect(SECTION_LABELS.intro_pasaport).toBeDefined();
      expect(SECTION_LABELS.intro_foaie_parcurs).toBeDefined();
      expect(SECTION_LABELS.recomandari_anexa_aeIIci).toBeDefined();
      expect(SECTION_LABELS.summary_audit_exec).toBeDefined();
    });

    it("label-urile sunt în română cu diacritice corecte", () => {
      expect(SECTION_LABELS.cap1_descriere).toContain("clădirii");
      expect(SECTION_LABELS.cap8_concluzii).toContain("Concluzii");
      expect(SECTION_LABELS.recomandari_anexa_aeIIci).toContain("Recomandări");
    });
  });

  describe("fetchNarrativeAI helper", () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("aruncă eroare dacă section lipsește", async () => {
      await expect(fetchNarrativeAI({})).rejects.toThrow("section obligatoriu");
    });

    it("apelează /api/ai-assistant cu intent='narrative'", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ answer: "Text generat de AI." }),
      });
      global.fetch = mockFetch;

      const result = await fetchNarrativeAI({
        section: "cap1_descriere",
        context: { building: { category: "RA" } },
        sectionLength: 250,
      });

      expect(result).toBe("Text generat de AI.");
      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("/api/ai-assistant");
      expect(options.method).toBe("POST");
      const body = JSON.parse(options.body);
      expect(body.intent).toBe("narrative");
      expect(body.context.section).toBe("cap1_descriere");
      expect(body.context.sectionLength).toBe(250);
      expect(body.context.building.category).toBe("RA");
    });

    it("default sectionLength=300 dacă nu specificat", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ answer: "Text." }),
      });
      global.fetch = mockFetch;

      await fetchNarrativeAI({ section: "cap8_concluzii" });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.context.sectionLength).toBe(300);
    });

    it("aruncă eroare HTTP la status non-200", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(
        fetchNarrativeAI({ section: "intro_pasaport" })
      ).rejects.toThrow("HTTP 500");
    });

    it("răspuns gol → returnează string gol (nu null)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await fetchNarrativeAI({ section: "summary_audit_exec" });
      expect(result).toBe("");
    });
  });
});
