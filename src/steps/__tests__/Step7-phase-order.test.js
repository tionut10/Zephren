/**
 * Smoke tests Sprint reorg-pas7 v1+v2 (16 mai 2026) — ordine PhaseHeader în Step7Audit.jsx
 *
 * Verifică prin lectură statică (fs.readFileSync) că structura 8 faze logice
 * este respectată conform Mc 001-2022 §11 + EPBD 2024/1275 + EN 15459-1 + Ord. 2237/2010:
 *
 *   F1 📊 Diagnostic            [Mc 001-2022 §8.2 + EN 16247-2]
 *   F2 🔧 Identificare măsuri   [Mc 001-2022 §6.2-6.4]              (era F3 v1)
 *   F3 ⚖️  Prioritizare          [EPBD Art. 6 + Reg. UE 244/2012]    (era F4 v1)
 *   F4 💰 Analiză economică     [EN 15459-1 + Mc 001-2022 §6.6-6.7] (era F5 v1)
 *   F5 🗺️  Roadmap               [EPBD Art. 12 + Anexa VIII]         (era F6 v1)
 *   F6 ✅ Conformare            [Mc 001-2022 Cap. 7 + Ord. 348/2026] (era F7 v1)
 *   F7 📂 Anexe documente       [Mc 001-2022 Anexa G]               (MUTAT din F2 v1)
 *   F8 📑 Output Export         [Ord. 2237/2010 Anexa 1]            (unchanged)
 *
 * Detectează regresii de tipul:
 *   - PhaseHeader lipsă sau ordine schimbată
 *   - Faze re-numerotate accidental
 *   - F7 Anexe documente mutat înapoi după F1 (regresie v2→v1)
 *   - END markers desincronizate cu opening markers
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const step7Path = path.resolve(__dirname, "../Step7Audit.jsx");
const source = readFileSync(step7Path, "utf-8");

const phaseHeaderPath = path.resolve(__dirname, "../../components/PhaseHeader.jsx");

describe("Sprint reorg-pas7 — componenta PhaseHeader", () => {
  it("PhaseHeader.jsx există ca componentă reutilizabilă", () => {
    const phaseHeaderSource = readFileSync(phaseHeaderPath, "utf-8");
    expect(phaseHeaderSource).toMatch(/export function PhaseHeader/);
  });

  it("PhaseHeader acceptă props: icon, title, normative, color, hideIfEmpty, children", () => {
    const phaseHeaderSource = readFileSync(phaseHeaderPath, "utf-8");
    // Multi-line destructuring în signature
    expect(phaseHeaderSource).toMatch(/icon[\s,]/);
    expect(phaseHeaderSource).toMatch(/title[\s,]/);
    expect(phaseHeaderSource).toMatch(/normative[\s,]/);
    expect(phaseHeaderSource).toMatch(/color\s*=\s*"amber"/);
    expect(phaseHeaderSource).toMatch(/hideIfEmpty\s*=\s*true/);
    expect(phaseHeaderSource).toMatch(/children/);
  });

  it("PhaseHeader implementează hideIfEmpty safety (React.Children.toArray + filter Boolean)", () => {
    const phaseHeaderSource = readFileSync(phaseHeaderPath, "utf-8");
    expect(phaseHeaderSource).toMatch(/React\.Children\.toArray\(children\)\.filter\(Boolean\)/);
  });

  it("PhaseHeader e importat în Step7Audit.jsx", () => {
    expect(source).toMatch(/import\s*{\s*PhaseHeader\s*}\s*from\s*["']\.\.\/components\/PhaseHeader\.jsx["']/);
  });
});

describe("Sprint reorg-pas7 — ordine 8 PhaseHeader (F1→F8)", () => {
  // Extrage titlu prop din fiecare PhaseHeader (în ordinea de apariție în fișier)
  const titleMatches = [...source.matchAll(/<PhaseHeader[^>]*title="(F\d) · ([^"]+)"/g)];
  const phaseNumbers = titleMatches.map(m => m[1]);
  const phaseTitles = titleMatches.map(m => m[2]);

  it("exact 8 PhaseHeader-uri în Step7Audit.jsx", () => {
    expect(titleMatches.length).toBe(8);
  });

  it("ordine F1→F8 secvențială (fără numere sărite)", () => {
    expect(phaseNumbers).toEqual(["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"]);
  });

  it("titlu F1 = 'Diagnostic'", () => {
    expect(phaseTitles[0]).toMatch(/Diagnostic/i);
  });

  it("titlu F2 = 'Identificare măsuri' (era F3 în v1, renumerotat v2)", () => {
    expect(phaseTitles[1]).toMatch(/Identificare m[ăa]suri/i);
  });

  it("titlu F3 = 'Prioritizare & Selecție pachet' (era F4 în v1)", () => {
    expect(phaseTitles[2]).toMatch(/Prioritizare.*Selec[țt]ie/i);
  });

  it("titlu F4 = 'Analiză economică' (era F5 în v1)", () => {
    expect(phaseTitles[3]).toMatch(/Analiz[ăa] economic[ăa]/i);
  });

  it("titlu F5 = 'Scenariu proiectat & Roadmap' (era F6 în v1)", () => {
    expect(phaseTitles[4]).toMatch(/Scenariu.*Roadmap/i);
  });

  it("titlu F6 = 'Conformare' (era F7 în v1)", () => {
    expect(phaseTitles[5]).toMatch(/Conformare/i);
  });

  it("titlu F7 = 'Anexe documente' (MUTAT din F2 v1 — atașamente ZIP final)", () => {
    expect(phaseTitles[6]).toMatch(/Anexe documente/i);
  });

  it("titlu F8 = 'Output — Export dosar audit'", () => {
    expect(phaseTitles[7]).toMatch(/Output.*Export/i);
  });
});

describe("Sprint reorg-pas7 — normative props (chip referință)", () => {
  it("F1 referă Mc 001-2022 §8.2 + EN 16247-2", () => {
    expect(source).toMatch(/title="F1 · Diagnostic"[\s\S]*?normative="Mc 001-2022 §8\.2 \+ EN 16247-2"/);
  });

  it("F2 referă Mc 001-2022 §6.2-6.4", () => {
    expect(source).toMatch(/title="F2 · Identificare m[ăa]suri"[\s\S]*?normative="Mc 001-2022 §6\.2-6\.4"/);
  });

  it("F3 referă EPBD Art. 6 + Reg. UE 244/2012", () => {
    expect(source).toMatch(/title="F3 · Prioritizare[^"]*"[\s\S]*?normative="EPBD Art\. 6 \+ Reg\. UE 244\/2012"/);
  });

  it("F4 referă EN 15459-1 + Mc 001-2022 §6.6-6.7", () => {
    expect(source).toMatch(/title="F4 · Analiz[ăa] economic[ăa]"[\s\S]*?normative="EN 15459-1 \+ Mc 001-2022 §6\.6-6\.7"/);
  });

  it("F5 referă EPBD Art. 12 + Anexa VIII", () => {
    expect(source).toMatch(/title="F5 · Scenariu[^"]*"[\s\S]*?normative="EPBD Art\. 12 \+ Anexa VIII"/);
  });

  it("F6 referă Mc 001-2022 Cap. 7 + Ord. 348/2026 Art. 6c", () => {
    expect(source).toMatch(/title="F6 · Conformare"[\s\S]*?normative="Mc 001-2022 Cap\. 7 \+ Ord\. 348\/2026 Art\. 6c"/);
  });

  it("F7 Anexe referă Mc 001-2022 Anexa G + Ord. 348/2026 Art. 4.6", () => {
    expect(source).toMatch(/title="F7 · Anexe documente"[\s\S]*?normative="Mc 001-2022 Anexa G \+ Ord\. 348\/2026 Art\. 4\.6"/);
  });

  it("F8 referă Ord. 2237/2010 Anexa 1", () => {
    expect(source).toMatch(/title="F8 · Output[^"]*"[\s\S]*?normative="Ord\. 2237\/2010 Anexa 1"/);
  });
});

describe("Sprint reorg-pas7 — END markers ordonate F1→F8", () => {
  // Extrage END markers în ordinea de apariție
  const endMatches = [...source.matchAll(/END F(\d)/g)];
  const endNumbers = endMatches.map(m => m[1]);

  it("exact 8 END markers", () => {
    expect(endMatches.length).toBe(8);
  });

  it("END markers ordonați F1→F8 secvențial", () => {
    expect(endNumbers).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  });
});

describe("Sprint reorg-pas7 v2 — F7 Anexe documente plasat OUTSIDE ternary, înainte de F8", () => {
  it("F7 Anexe documente apare în source ÎNAINTE de F8 Output Export", () => {
    const f7Idx = source.indexOf('title="F7 · Anexe documente"');
    const f8Idx = source.indexOf('title="F8 · Output — Export dosar audit"');
    expect(f7Idx).toBeGreaterThan(0);
    expect(f8Idx).toBeGreaterThan(0);
    expect(f7Idx).toBeLessThan(f8Idx);
  });

  it("F7 Anexe documente conține DocumentUploadCenter + BuildingPhotos (componente mutate)", () => {
    // Extrage blocul între F7 open și END F7
    const f7BlockMatch = source.match(/title="F7 · Anexe documente"[\s\S]*?END F7/);
    expect(f7BlockMatch).toBeTruthy();
    expect(f7BlockMatch[0]).toMatch(/<DocumentUploadCenter/);
    expect(f7BlockMatch[0]).toMatch(/<BuildingPhotos/);
  });

  it("F7 Anexe documente este OUTSIDE ternary (după închiderea space-y-5 div)", () => {
    // Ternary close pattern: </div>\n              )}
    const ternaryCloseIdx = source.indexOf("              )}\n");
    const f7OpenIdx = source.indexOf('title="F7 · Anexe documente"');
    expect(ternaryCloseIdx).toBeGreaterThan(0);
    expect(f7OpenIdx).toBeGreaterThan(ternaryCloseIdx);
  });
});

describe("Sprint reorg-pas7 v1 — mutări carduri (regression guards)", () => {
  it("Benchmarking este în F1 Diagnostic (nu în secțiunea financiară veche 2072)", () => {
    // F1 PhaseHeader trebuie să conțină GradeGate benchmarkPeer
    const f1BlockMatch = source.match(/title="F1 · Diagnostic"[\s\S]*?END F1/);
    expect(f1BlockMatch).toBeTruthy();
    expect(f1BlockMatch[0]).toMatch(/feature="benchmarkPeer"/);
  });

  it("MCCL Catalog este integrat ca <details> în R1 Anvelopă (nu Card separat)", () => {
    expect(source).toMatch(/details[^>]*>\s*<summary[^>]*>[\s\S]*?Catalog MCCL[\s\S]*?Pun[țt]i termice/);
    // Card MCCL ORIGINAL (cu title="MCCL — Catalog ponți termice") nu mai există ca standalone
    expect(source).not.toMatch(/<Card\s+title=\{?`?MCCL — Catalog pon[țt]i termice/);
  });

  it("CHP Cogenerare este integrat ca <details> în R2 Instalații (nu Card separat)", () => {
    expect(source).toMatch(/details[^>]*>\s*<summary[^>]*>[\s\S]*?Cogenerare \(CHP\)/);
    // Card CHP ORIGINAL nu mai există ca standalone
    expect(source).not.toMatch(/<Card\s+title="Cogenerare \(CHP\)/);
  });

  it("Narativ AI Card este în F8 Output (înaintea Master Card Generare documente)", () => {
    const f8BlockMatch = source.match(/title="F8 · Output[\s\S]*?END F8/);
    expect(f8BlockMatch).toBeTruthy();
    expect(f8BlockMatch[0]).toMatch(/Narativ AI documente/);
    expect(f8BlockMatch[0]).toMatch(/Generare documente — pachet client/);
    // Narativ AI trebuie să apară ÎNAINTE de Master Card
    const narrativIdx = f8BlockMatch[0].indexOf("Narativ AI documente");
    const masterIdx = f8BlockMatch[0].indexOf("Generare documente — pachet client");
    expect(narrativIdx).toBeLessThan(masterIdx);
  });

  it("IEQ Calitate aer este în F2 Identificare măsuri (mutat din poziția veche 2231)", () => {
    const f2BlockMatch = source.match(/title="F2 · Identificare m[ăa]suri"[\s\S]*?END F2/);
    expect(f2BlockMatch).toBeTruthy();
    expect(f2BlockMatch[0]).toMatch(/IEQ — Calitate aer interior/);
  });

  it("Scenariu Reabilitare Proiecție este în F5 Roadmap (mutat din poziția veche F4 v1)", () => {
    const f5BlockMatch = source.match(/title="F5 · Scenariu[^"]*"[\s\S]*?END F5/);
    expect(f5BlockMatch).toBeTruthy();
    expect(f5BlockMatch[0]).toMatch(/Scenariu Reabilitare — Proiectie/);
  });
});

describe("Sprint reorg-pas7 — subtitle clarificator pe carduri gemene 1426/1460", () => {
  it("'Cost anual energie estimat' are subtitle 'Sumar rapid · toate planurile'", () => {
    expect(source).toMatch(/title=\{t\("Cost anual energie estimat[^"]*",lang\)\}[\s\S]*?subtitle=\{<span[^>]*>Sumar rapid · toate planurile<\/span>\}/);
  });

  it("'Estimare cost energie anual' are subtitle 'Editor tarife ANRE · AE Ici+'", () => {
    expect(source).toMatch(/title=\{t\("Estimare cost energie anual",lang\)\}[\s\S]*?subtitle=\{<span[^>]*>Editor tarife ANRE · AE Ici\+<\/span>\}/);
  });
});
