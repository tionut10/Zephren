// ═════════════════════════════════════════════════════════════════════════════
// tutorial-content.test.js — Toate 8 pași încarcă, fiecare are 20+ secțiuni
// ═════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";

import pas1 from "../content/pas1-identificare.js";
import pas2 from "../content/pas2-anvelopa.js";
import pas3 from "../content/pas3-instalatii.js";
import pas4 from "../content/pas4-surse-regen.js";
import pas5 from "../content/pas5-calcul-energetic.js";
import pas6 from "../content/pas6-certificat-cpe.js";
import pas7 from "../content/pas7-audit-energetic.js";
import pas8 from "../content/pas8-instrumente.js";

const ALL_PASI = { pas1, pas2, pas3, pas4, pas5, pas6, pas7, pas8 };

describe("Tutorial content — structură", () => {
  Object.entries(ALL_PASI).forEach(([key, pas]) => {
    describe(`${key}`, () => {
      it("are intro (string)", () => {
        expect(pas.intro).toBeDefined();
        expect(typeof pas.intro).toBe("string");
        expect(pas.intro.length).toBeGreaterThan(50);
      });

      it("are sections array cu minim 20 secțiuni", () => {
        expect(Array.isArray(pas.sections)).toBe(true);
        expect(pas.sections.length).toBeGreaterThanOrEqual(20);
      });

      it("fiecare secțiune are id, type, title", () => {
        pas.sections.forEach((s, i) => {
          expect(s.id, `${key} sec[${i}] id`).toBeDefined();
          expect(s.type, `${key} sec[${i}] type`).toBeDefined();
          expect(s.title, `${key} sec[${i}] title`).toBeDefined();
        });
      });

      it("are secțiune hero la început", () => {
        expect(pas.sections[0].type).toBe("hero");
      });

      it("are secțiune recap la sfârșit", () => {
        const lastSection = pas.sections[pas.sections.length - 1];
        expect(lastSection.type).toBe("recap");
        expect(lastSection.nextStep || pas.sections[pas.sections.length - 1].type === "recap").toBeTruthy();
      });

      it("are minim un quiz (mini-quiz)", () => {
        const quizes = pas.sections.filter((s) => s.type === "quiz");
        expect(quizes.length, `${key} are quiz`).toBeGreaterThanOrEqual(1);
      });

      it("are minim un what-if (simulator)", () => {
        const whatIfs = pas.sections.filter((s) => s.type === "what-if");
        expect(whatIfs.length, `${key} are what-if`).toBeGreaterThanOrEqual(1);
      });

      it("are secțiune normative (referințe legale)", () => {
        const normative = pas.sections.filter((s) => s.type === "normative");
        expect(normative.length, `${key} are normative refs`).toBeGreaterThanOrEqual(1);
      });

      it("are minim 3 greșeli frecvente", () => {
        const mistakes = pas.sections.filter((s) => s.type === "mistakes");
        expect(mistakes.length, `${key} are mistakes section`).toBeGreaterThanOrEqual(1);
        const items = mistakes[0]?.items || [];
        expect(items.length, `${key} mistakes count`).toBeGreaterThanOrEqual(3);
      });

      it("are export section", () => {
        const exportSections = pas.sections.filter((s) => s.type === "export");
        expect(exportSections.length).toBeGreaterThanOrEqual(1);
      });

      it("are FAQ minim 3 întrebări", () => {
        const faqs = pas.sections.filter((s) => s.type === "faq");
        expect(faqs.length).toBeGreaterThanOrEqual(1);
        expect((faqs[0]?.items || []).length).toBeGreaterThanOrEqual(3);
      });

      it("are propagation (cum se duc datele mai departe)", () => {
        const props = pas.sections.filter((s) => s.type === "propagation");
        expect(props.length).toBeGreaterThanOrEqual(1);
      });

      it("toate secțiunile au type valid (whitelist)", () => {
        const VALID_TYPES = [
          "hero", "decision", "fields", "branching", "normative", "glossary",
          "mistakes", "propagation", "what-if", "checks", "limits",
          "demo-snapshot", "quiz", "pro-tip", "legislation",
          "special-cases", "export", "faq", "resources", "recap", "text",
        ];
        pas.sections.forEach((s, i) => {
          expect(VALID_TYPES, `${key} sec[${i}] type=${s.type}`).toContain(s.type);
        });
      });
    });
  });

  it("toate 8 pași sunt definite", () => {
    expect(Object.keys(ALL_PASI).length).toBe(8);
  });

  it("ID-urile secțiunilor sunt unice în cadrul fiecărui pas", () => {
    Object.entries(ALL_PASI).forEach(([key, pas]) => {
      const ids = pas.sections.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size, `${key} duplicate IDs`).toBe(ids.length);
    });
  });
});
