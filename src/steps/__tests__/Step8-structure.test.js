/**
 * Smoke tests Sprint A Task 9 — structura Step8Advanced.jsx după fuzionări + restructurare
 *
 * Verifică prin lectură statică (fs.readFileSync) că:
 * - Task 1: xml_export FUZIONAT în mdlpa (nu mai există tab dedicat)
 * - Task 2: rehab_compare FUZIONAT în rehab (toggle Card/Tabel)
 * - Task 3: c107, conformitate, proiect_tehnic FUZIONATE în verificare_U (cu sub-tab-uri)
 * - Task 4: multi_building FUZIONAT în portofoliu (onOpenProject funcțional)
 * - Task 8: 8 categorii workflow-centric (conformitate, rehab, calcul, diagnostic,
 *            rapoarte, cabinet, date_ext, expert) în loc de 6 techno-centric
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const step8Path = path.resolve(__dirname, "../Step8Advanced.jsx");
const source = readFileSync(step8Path, "utf-8");

describe("Sprint A — Task 1: fuziune xml_export + mdlpa", () => {
  it("tab-ul xml_export NU mai apare în TAB_SECTIONS", () => {
    expect(source).not.toMatch(/\{\s*id:"xml_export"/);
  });

  it("blocul de rendering activeTab === \"xml_export\" a fost eliminat", () => {
    expect(source).not.toMatch(/activeTab === "xml_export"/);
  });

  it("tab-ul mdlpa există și conține handleXMLExport inline", () => {
    expect(source).toMatch(/id:"mdlpa"/);
    // MDLPA trebuie să aibă acum descrierea XML-ului (fuziune xml_export)
    expect(source).toMatch(/Descarcă CPE\.xml/);
  });
});

describe("Sprint A — Task 2: fuziune rehab + rehab_compare", () => {
  it("tab-ul rehab_compare NU mai apare în TAB_SECTIONS", () => {
    expect(source).not.toMatch(/\{\s*id:"rehab_compare"/);
  });

  it("blocul de rendering activeTab === \"rehab_compare\" a fost eliminat", () => {
    expect(source).not.toMatch(/activeTab === "rehab_compare"/);
  });

  it("tab-ul rehab conține toggle Card/Tabel (rehabView state)", () => {
    expect(source).toMatch(/rehabView/);
    expect(source).toMatch(/setRehabView/);
  });
});

describe("Sprint A — Task 3: fuziune c107 + conformitate + proiect_tehnic → verificare_U", () => {
  it("cele 3 tab-uri vechi NU mai apar în TAB_SECTIONS", () => {
    expect(source).not.toMatch(/\{\s*id:"c107"/);
    expect(source).not.toMatch(/\{\s*id:"conformitate"/);
    expect(source).not.toMatch(/\{\s*id:"proiect_tehnic"/);
  });

  it("blocurile vechi de rendering au fost eliminate", () => {
    expect(source).not.toMatch(/activeTab === "c107"/);
    expect(source).not.toMatch(/activeTab === "conformitate"/);
    expect(source).not.toMatch(/activeTab === "proiect_tehnic"/);
  });

  it("tab-ul verificare_U există și conține state uVerifSubTab", () => {
    expect(source).toMatch(/id:"verificare_U"/);
    expect(source).toMatch(/activeTab === "verificare_U"/);
    expect(source).toMatch(/uVerifSubTab/);
    expect(source).toMatch(/setUVerifSubTab/);
  });

  it("sub-tab-urile verificare_U (c107, renovare, proiect) sunt prezente", () => {
    expect(source).toMatch(/uVerifSubTab === "c107"/);
    expect(source).toMatch(/uVerifSubTab === "renovare"/);
    expect(source).toMatch(/uVerifSubTab === "proiect"/);
  });
});

describe("Sprint A — Task 4: fuziune multi_building + portofoliu + onOpenProject reload", () => {
  it("tab-ul multi_building NU mai apare în TAB_SECTIONS", () => {
    expect(source).not.toMatch(/\{\s*id:"multi_building"/);
  });

  it("blocul de rendering activeTab === \"multi_building\" a fost eliminat", () => {
    expect(source).not.toMatch(/activeTab === "multi_building"/);
  });

  it("tab-ul portofoliu conține handler onOpenProject cu reload", () => {
    expect(source).toMatch(/handleOpenProject/);
    expect(source).toMatch(/zephren_pending_open_project/);
    expect(source).toMatch(/window\.location\.reload/);
  });

  it("butonul \"Deschide\" nu mai este disabled", () => {
    // Butonul vechi: disabled, funcționalitate viitoare
    expect(source).not.toMatch(/Butonul "Deschide" va fi disponibil/);
  });
});

describe("Sprint A — Task 8: restructurare 8 categorii workflow-centric", () => {
  it("exportă TAB_SECTIONS pentru testare", () => {
    expect(source).toMatch(/export const TAB_SECTIONS/);
  });

  it("exportă CATEGORIES_RO pentru testare", () => {
    expect(source).toMatch(/export const CATEGORIES_RO/);
  });

  const expectedCategories = [
    "conformitate", "rehab", "calcul", "diagnostic",
    "rapoarte", "cabinet", "date_ext", "expert",
  ];

  expectedCategories.forEach(cat => {
    it(`categoria "${cat}" există în CATEGORIES_RO`, () => {
      expect(source).toMatch(new RegExp(`id:\\s*"${cat}"`));
    });
  });

  it("categoriile vechi techno-centric au fost înlocuite", () => {
    // Vechiul set: "analiza", "export", "import", "documente", "cloud" în TAB_SECTIONS
    // NU verificăm "calcul" fiindcă noul set îl păstrează (cu semantică nouă)
    const oldSet = ["analiza", "export", "import", "documente", "cloud"];
    oldSet.forEach(oldCat => {
      // Nu trebuie să existe `category:"analiza"` etc. în TAB_SECTIONS
      expect(source).not.toMatch(new RegExp(`category\\s*:\\s*"${oldCat}"`));
    });
  });
});

describe("Sprint A — Task 6: climate import override", () => {
  it("handler-ul de Apply scrie zephren_climate_override în localStorage", () => {
    expect(source).toMatch(/zephren_climate_override/);
  });

  it("există banner pentru override activ cu buton Șterge", () => {
    expect(source).toMatch(/Override climatic activ/);
    expect(source).toMatch(/Șterge override/);
  });
});
