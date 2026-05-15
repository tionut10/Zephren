/**
 * Teste pentru voiceCommandsRO — Sprint Smart Input 2026 (D3)
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import { classifyVoiceCommand, SUPPORTED_COMMANDS } from "../voiceCommandsRO.js";

describe("classifyVoiceCommand — Sprint D3", () => {
  // ─── duplicate_recent ───────────────────────────────────────────────────
  describe("duplicate_recent", () => {
    it("recunoaște 'duplică ultimul'", () => {
      expect(classifyVoiceCommand("duplică ultimul")?.command).toBe("duplicate_recent");
    });
    it("recunoaște 'duplică recent'", () => {
      expect(classifyVoiceCommand("duplica recent")?.command).toBe("duplicate_recent");
    });
    it("recunoaște 'reia ultimul'", () => {
      expect(classifyVoiceCommand("reia ultimul")?.command).toBe("duplicate_recent");
    });
    it("recunoaște fără diacritice", () => {
      expect(classifyVoiceCommand("duplica ultimul proiect")?.command).toBe("duplicate_recent");
    });
  });

  // ─── apply_template ─────────────────────────────────────────────────────
  describe("apply_template", () => {
    it("recunoaște 'aplică șablon'", () => {
      expect(classifyVoiceCommand("aplică șablon")?.command).toBe("apply_template");
    });
    it("recunoaște 'aplică template'", () => {
      expect(classifyVoiceCommand("aplica template")?.command).toBe("apply_template");
    });
    it("extract name din 'aplică șablon casă unifamilială'", () => {
      const r = classifyVoiceCommand("aplica sablon casa unifamiliala");
      expect(r?.command).toBe("apply_template");
      expect(r?.params?.name).toMatch(/casa\s+unifamiliala/);
    });
    it("recunoaște și 'folosește șablon'", () => {
      expect(classifyVoiceCommand("foloseste sablon bloc")?.command).toBe("apply_template");
    });
  });

  // ─── open_tutorial ──────────────────────────────────────────────────────
  describe("open_tutorial", () => {
    it("recunoaște 'deschide tutorial'", () => {
      expect(classifyVoiceCommand("deschide tutorial")?.command).toBe("open_tutorial");
    });
    it("recunoaște 'pornește tutorial'", () => {
      expect(classifyVoiceCommand("porneste tutorial")?.command).toBe("open_tutorial");
    });
    it("recunoaște 'începe tutorial'", () => {
      expect(classifyVoiceCommand("incepe tutorial")?.command).toBe("open_tutorial");
    });
  });

  // ─── open_quickfill ─────────────────────────────────────────────────────
  describe("open_quickfill", () => {
    it("recunoaște 'quick fill'", () => {
      expect(classifyVoiceCommand("quick fill")?.command).toBe("open_quickfill");
    });
    it("recunoaște 'completare rapidă'", () => {
      expect(classifyVoiceCommand("completare rapida")?.command).toBe("open_quickfill");
    });
    it("recunoaște 'wizard'", () => {
      expect(classifyVoiceCommand("wizard")?.command).toBe("open_quickfill");
    });
  });

  // ─── open_chat ──────────────────────────────────────────────────────────
  describe("open_chat", () => {
    it("recunoaște 'deschide chat AI'", () => {
      expect(classifyVoiceCommand("deschide chat ai")?.command).toBe("open_chat");
    });
    it("recunoaște 'deschide asistent'", () => {
      expect(classifyVoiceCommand("deschide asistent")?.command).toBe("open_chat");
    });
  });

  // ─── cancel ─────────────────────────────────────────────────────────────
  describe("cancel", () => {
    it("recunoaște 'anulează'", () => {
      expect(classifyVoiceCommand("anuleaza")?.command).toBe("cancel");
    });
    it("recunoaște 'stop'", () => {
      expect(classifyVoiceCommand("stop")?.command).toBe("cancel");
    });
    it("recunoaște 'resetează'", () => {
      expect(classifyVoiceCommand("reseteaza")?.command).toBe("cancel");
    });
    it("nu recunoaște dacă text e descriere ('stop la stație')", () => {
      // cancel e ancorat ^...$ ca să nu match-eze fraze cu „stop" în mijloc
      expect(classifyVoiceCommand("stop la statie")).toBeNull();
    });
  });

  // ─── No match (descriere clădire) ───────────────────────────────────────
  describe("no match (descriere liberă)", () => {
    it("descriere clădire → null", () => {
      expect(classifyVoiceCommand("bloc P+4 din 1985, București, cazan gaz, 80 apartamente")).toBeNull();
    });
    it("text scurt → null", () => {
      expect(classifyVoiceCommand("a")).toBeNull();
    });
    it("null/undefined → null", () => {
      expect(classifyVoiceCommand(null)).toBeNull();
      expect(classifyVoiceCommand(undefined)).toBeNull();
      expect(classifyVoiceCommand("")).toBeNull();
    });
  });

  // ─── Edge cases ─────────────────────────────────────────────────────────
  describe("edge cases", () => {
    it("returnează originalText în rezultat", () => {
      const r = classifyVoiceCommand("Deschide Tutorial");
      expect(r?.originalText).toBe("Deschide Tutorial");
    });
    it("normalize diacritice consistent", () => {
      expect(classifyVoiceCommand("șterge tot")?.command).toBe("cancel");
      expect(classifyVoiceCommand("STERGE TOT")?.command).toBe("cancel");
    });
  });

  // ─── SUPPORTED_COMMANDS metadata ────────────────────────────────────────
  it("SUPPORTED_COMMANDS conține 6 comenzi cu metadata complete", () => {
    expect(SUPPORTED_COMMANDS).toHaveLength(6);
    SUPPORTED_COMMANDS.forEach(c => {
      expect(c.command).toBeTruthy();
      expect(Array.isArray(c.examples)).toBe(true);
      expect(c.examples.length).toBeGreaterThan(0);
      expect(c.description).toBeTruthy();
    });
  });
});
