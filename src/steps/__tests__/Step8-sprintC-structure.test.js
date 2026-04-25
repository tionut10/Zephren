/**
 * Smoke tests Sprint C Task 4 — structura Step8Advanced.jsx după Sprint C
 *
 * Verifică prin lectură statică că:
 *   • Task 1: tab-urile diagnostic + sandbox sunt prezente, importurile OK
 *   • Task 2: a11y patterns aplicate (role=tablist/tab, aria-label, aria-selected)
 *   • Task 3: Sandbox component integrat
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const step8Path = path.resolve(__dirname, "../Step8Advanced.jsx");
const source = readFileSync(step8Path, "utf-8");

describe("Sprint C — Task 1: tab Diagnostic aplicație", () => {
  it("AppDiagnostic component există", () => {
    const p = path.resolve(__dirname, "../../components/AppDiagnostic.jsx");
    expect(existsSync(p)).toBe(true);
  });
  it("Step8 importă AppDiagnostic", () => {
    expect(source).toMatch(/import\s+AppDiagnostic\s+from/);
  });
  it("tab-ul diagnostic e definit în TAB_SECTIONS", () => {
    expect(source).toMatch(/id:"diagnostic"/);
  });
  it("rendering activeTab === \"diagnostic\" prezent", () => {
    expect(source).toMatch(/activeTab === "diagnostic"/);
  });
});

describe("Sprint C — Task 2: a11y patterns aplicate", () => {
  it("grila tab-urilor are role=\"tablist\" + aria-label", () => {
    expect(source).toMatch(/role="tablist"/);
    expect(source).toMatch(/aria-label=\{lang==="EN" \? "Advanced module tabs"/);
  });

  it("fiecare tab are role=\"tab\" + aria-selected + aria-controls", () => {
    expect(source).toMatch(/role="tab"/);
    expect(source).toMatch(/aria-selected=\{isSelected\}/);
    expect(source).toMatch(/aria-controls=\{"panel-" \+ tab\.id\}/);
  });

  it("focus-visible pattern aplicat pe butoane tab", () => {
    expect(source).toMatch(/focus-visible:ring-2/);
  });

  it("emoji icons marcate aria-hidden=\"true\"", () => {
    expect(source).toMatch(/aria-hidden="true"/);
  });

  it("aria-label descriptiv generat dinamic per tab", () => {
    // Trebuie să existe construcția ariaLabel (nu hardcodat)
    expect(source).toMatch(/const ariaLabel\s*=/);
  });

  it("rândul „Frecvent folosite\" are role=\"region\"", () => {
    expect(source).toMatch(/role="region"/);
  });
});

describe("Sprint C — Task 3: tab Sandbox calcule", () => {
  it("Sandbox component există", () => {
    const p = path.resolve(__dirname, "../../components/Sandbox.jsx");
    expect(existsSync(p)).toBe(true);
  });
  it("sandbox-sensitivity calc există", () => {
    const p = path.resolve(__dirname, "../../calc/sandbox-sensitivity.js");
    expect(existsSync(p)).toBe(true);
  });
  it("Step8 importă Sandbox", () => {
    expect(source).toMatch(/import\s+Sandbox\s+from/);
  });
  it("tab-ul sandbox e definit în TAB_SECTIONS", () => {
    expect(source).toMatch(/id:"sandbox"/);
  });
  it("rendering activeTab === \"sandbox\" prezent", () => {
    expect(source).toMatch(/activeTab === "sandbox"/);
  });
});
