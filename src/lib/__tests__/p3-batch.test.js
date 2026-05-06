/**
 * @vitest-environment jsdom
 *
 * Teste P3 — Studiu ZEB + Construction docs (Note CT, Foto-album, ENERGOBILANȚ).
 * Sprint Conformitate P3-01..P3-04 + P3-06 (7 mai 2026).
 */

import { describe, it, expect } from "vitest";
import {
  ZEB_THRESHOLDS_RO,
  checkZebCompliance,
  generateZebStudyPdf,
} from "../zeb-study-pdf.js";
import {
  PHOTO_CATEGORIES,
  generateCarteaTehnicaNotesPdf,
  generatePhotoAlbumPdf,
  generateEnergobilantPdf,
} from "../construction-docs-pdf.js";

async function blobIsPdf(blob) {
  const ab = await blob.arrayBuffer();
  const text = new TextDecoder("latin1").decode(new Uint8Array(ab));
  return text.startsWith("%PDF-");
}

// ─────────────────────────────────────────────────────────────────────────────
// P3-01 — Studiu ZEB
// ─────────────────────────────────────────────────────────────────────────────

describe("Studiu ZEB (P3-01)", () => {
  it("ZEB_THRESHOLDS_RO conține 11 categorii", () => {
    const cats = Object.keys(ZEB_THRESHOLDS_RO);
    expect(cats.length).toBe(11);
    expect(cats).toContain("RI");
    expect(cats).toContain("BC");
    expect(cats).toContain("AL");
  });

  it("este înghețat", () => {
    expect(Object.isFrozen(ZEB_THRESHOLDS_RO)).toBe(true);
  });

  it("checkZebCompliance — clădire conformă (ep low + RER high)", () => {
    const r = checkZebCompliance({
      category: "RI",
      epPrimary: 40,
      epNren: 4,
      rer: 0.80,
    });
    expect(r.compliant).toBe(true);
    expect(Object.keys(r.gaps).length).toBe(0);
  });

  it("checkZebCompliance — clădire neconformă (ep high)", () => {
    const r = checkZebCompliance({
      category: "RI",
      epPrimary: 200,
      epNren: 50,
      rer: 0.20,
    });
    expect(r.compliant).toBe(false);
    expect(r.gaps.epPrimary).toBeDefined();
    expect(r.gaps.epNren).toBeDefined();
    expect(r.gaps.rer).toBeDefined();
  });

  it("checkZebCompliance — public (BI/ED/SP/HC/AL) → year 2030", () => {
    const r = checkZebCompliance({ category: "BI", epPrimary: 70, epNren: 7, rer: 0.75 });
    expect(r.year).toBe(2030);
  });

  it("checkZebCompliance — privat (RI/RC/RA) → year 2033", () => {
    const r = checkZebCompliance({ category: "RI", epPrimary: 40, epNren: 4, rer: 0.80 });
    expect(r.year).toBe(2033);
  });

  it("generateZebStudyPdf — produce PDF valid", async () => {
    const blob = await generateZebStudyPdf({
      building: { address: "Str. Test 1", category: "BI" },
      energy: { epPrimary: 90, epNren: 12, rer: 0.45, co2: 18 },
      scenarios: {
        current: { epPrimary: 90, rer: 0.45, co2: 18 },
        nzebTarget: { epPrimary: 65, rer: 0.30, co2: 13 },
        zebTarget: { epPrimary: 50, rer: 0.75, co2: 5 },
      },
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(await blobIsPdf(blob)).toBe(true);
    expect(blob.size).toBeGreaterThan(2000);
  });

  it("generateZebStudyPdf — clădire conformă afișează ✓ banner", async () => {
    const blob = await generateZebStudyPdf({
      building: { address: "Casa ZEB", category: "RI" },
      energy: { epPrimary: 30, epNren: 2, rer: 0.85 },
      download: false,
    });
    expect(blob.size).toBeGreaterThan(1500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P3-02 — Note Cartea Tehnică
// ─────────────────────────────────────────────────────────────────────────────

describe("Note Cartea Tehnică (P3-02)", () => {
  it("produce PDF cu abateri + măsurători", async () => {
    const blob = await generateCarteaTehnicaNotesPdf({
      building: { address: "Test", category: "RI", areaUseful: 100 },
      deviations: [
        { spec: "Izolație ETICS pereți", planned: "16 cm EPS", executed: "14 cm EPS", deviation: "-12.5% grosime" },
        { spec: "Ferestre triple-vitraj", planned: "U=0.8", executed: "U=1.0", deviation: "+25% U" },
      ],
      measurements: [
        { name: "n50 blower-door", value: "1.2 h⁻¹", target: "≤ 1.5" },
        { name: "Test EP", value: "85 kWh/m²a", target: "≤ 90" },
      ],
      auditor: { name: "Test", atestat: "AE-X" },
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(await blobIsPdf(blob)).toBe(true);
    expect(blob.size).toBeGreaterThan(2000);
  });

  it("fără abateri → afișează mesaj conformitate", async () => {
    const blob = await generateCarteaTehnicaNotesPdf({
      building: { address: "OK build" },
      deviations: [],
      measurements: [],
      download: false,
    });
    expect(blob.size).toBeGreaterThan(1500);
  });

  it("default args → PDF valid fără throw", async () => {
    const blob = await generateCarteaTehnicaNotesPdf({ download: false });
    expect(blob).toBeInstanceOf(Blob);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P3-03 — Foto-album
// ─────────────────────────────────────────────────────────────────────────────

describe("Foto-album construcții (P3-03)", () => {
  it("PHOTO_CATEGORIES conține 6 categorii standard", () => {
    expect(Object.keys(PHOTO_CATEGORIES).length).toBe(6);
    expect(PHOTO_CATEGORIES.SAPATURI).toBeDefined();
    expect(PHOTO_CATEGORIES.ANVELOPA).toBeDefined();
  });

  it("este înghețat", () => {
    expect(Object.isFrozen(PHOTO_CATEGORIES)).toBe(true);
  });

  it("produce PDF cu placeholder pentru imagini fără dataUrl", async () => {
    const photos = [
      { category: "SAPATURI", caption: "Săpătură fundație", timestamp: "2026-03-15" },
      { category: "STRUCTURA", caption: "Stâlpi beton armat" },
      { category: "ANVELOPA", caption: "ETICS pereți", gpsLat: 47.16, gpsLng: 27.59 },
    ];
    const blob = await generatePhotoAlbumPdf({
      building: { address: "Str. Foto 1" },
      photos,
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(await blobIsPdf(blob)).toBe(true);
    expect(blob.size).toBeGreaterThan(1500);
  });

  it("0 photos → cover only PDF valid", async () => {
    const blob = await generatePhotoAlbumPdf({
      building: { address: "Empty" },
      photos: [],
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
  });

  it("multiple categorii grupate corect", async () => {
    const photos = Array.from({ length: 8 }, (_, i) => ({
      category: i < 4 ? "STRUCTURA" : "FINISAJE",
      caption: `Foto ${i + 1}`,
    }));
    const blob = await generatePhotoAlbumPdf({ photos, download: false });
    expect(blob.size).toBeGreaterThan(2000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P3-06 — ENERGOBILANȚ MO industrial
// ─────────────────────────────────────────────────────────────────────────────

describe("ENERGOBILANȚ MO (P3-06)", () => {
  it("produce PDF cu procese + total consum", async () => {
    const blob = await generateEnergobilantPdf({
      facility: {
        name: "Fabrica Test SRL",
        address: "Zona Industrială 1",
        caen: "1071",
        areaTotal: 5000,
      },
      processes: [
        { name: "Producție A", consumption_kwh: 250000, productionUnits: 10000 },
        { name: "Producție B", consumption_kwh: 150000, productionUnits: 5000 },
        { name: "Iluminat hală", consumption_kwh: 50000 },
      ],
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(await blobIsPdf(blob)).toBe(true);
    expect(blob.size).toBeGreaterThan(2000);
  });

  it("fără procese → PDF valid", async () => {
    const blob = await generateEnergobilantPdf({
      facility: { name: "Test" },
      processes: [],
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
  });

  it("default args → PDF valid fără throw", async () => {
    const blob = await generateEnergobilantPdf({ download: false });
    expect(blob).toBeInstanceOf(Blob);
  });
});
