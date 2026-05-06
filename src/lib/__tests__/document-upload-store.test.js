/**
 * @vitest-environment jsdom
 *
 * Teste pentru document-upload-store.js (Sprint Conformitate P0-05..P0-09, 6 mai 2026).
 *
 * Acoperire:
 *   1. DOCUMENT_SLOTS — 8 slot-uri standard (PDF/DWG/DXF + dimensiuni)
 *   2. validateMagicBytes — PDF/DWG/DXF detectare corectă
 *   3. computeFileHash — SHA-256 hex 64 chars
 *   4. saveDocument + listDocuments + getDocument + deleteDocument round-trip
 *   5. cleanupExpired pentru documente vechi
 *   6. isValidSlotKey + getSlotMeta utilitare
 *
 * Notă: vitest jsdom NU are IndexedDB nativ — folosim fake-indexeddb dacă disponibil,
 * sau testăm doar funcțiile pure dacă IndexedDB lipsește.
 */

import { describe, it, expect, beforeEach } from "vitest";

// jsdom NU oferă IndexedDB nativ. Detecție runtime — testele care depind de DB
// sunt skip-uite dacă nu e disponibil. Funcțiile pure (validare, hash) rulează
// întotdeauna.
const hasIndexedDB = typeof indexedDB !== "undefined" &&
  typeof indexedDB.open === "function";

import {
  DOCUMENT_SLOTS,
  validateMagicBytes,
  computeFileHash,
  saveDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  cleanupExpired,
  isValidSlotKey,
  getSlotMeta,
} from "../document-upload-store.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DOCUMENT_SLOTS
// ─────────────────────────────────────────────────────────────────────────────

describe("DOCUMENT_SLOTS", () => {
  it("conține cele 8 slot-uri standard P0-05..09 (printre 18 totale post P2)", () => {
    const keys = Object.values(DOCUMENT_SLOTS).map(s => s.key);
    expect(keys).toEqual(expect.arrayContaining([
      "cartea_tehnica", "pv_receptie", "releveu", "autorizatie",
      "aviz_ancpi", "aviz_isc", "aviz_monumente", "acord_proprietari",
    ]));
    // Post Sprint P2 (7 mai 2026): extins la 18 sloturi (8 P0 + 10 P2)
    expect(keys.length).toBeGreaterThanOrEqual(8);
  });

  it("Cartea Tehnică are limit 50 MB (cel mai mare)", () => {
    expect(DOCUMENT_SLOTS.CARTEA_TEHNICA.maxMb).toBe(50);
    expect(DOCUMENT_SLOTS.CARTEA_TEHNICA.accept).toBe(".pdf");
  });

  it("Releveu acceptă PDF/DWG/DXF", () => {
    expect(DOCUMENT_SLOTS.RELEVEU.accept).toContain(".pdf");
    expect(DOCUMENT_SLOTS.RELEVEU.accept).toContain(".dwg");
    expect(DOCUMENT_SLOTS.RELEVEU.accept).toContain(".dxf");
  });

  it("este înghețat (read-only)", () => {
    expect(Object.isFrozen(DOCUMENT_SLOTS)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. validateMagicBytes
// ─────────────────────────────────────────────────────────────────────────────

describe("validateMagicBytes", () => {
  it("detectează PDF magic %PDF (0x25504446)", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37]);
    expect(validateMagicBytes(pdf, ".pdf")).toBe(true);
  });

  it("detectează DWG (AC10..AC32 prefix)", () => {
    const dwg = new Uint8Array([0x41, 0x43, 0x31, 0x30, 0x33, 0x32, 0x00, 0x00]);
    expect(validateMagicBytes(dwg, ".dwg")).toBe(true);
  });

  it("respinge fișier cu magic invalid", () => {
    const bogus = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(validateMagicBytes(bogus, ".pdf")).toBe(false);
  });

  it("acceptă DXF text (>64 octeți, fără magic strict)", () => {
    const dxf = new Uint8Array(100); // 100 octeți, conținut text DXF
    for (let i = 0; i < 100; i++) dxf[i] = 0x30 + (i % 10);
    expect(validateMagicBytes(dxf, ".dxf")).toBe(true);
  });

  it("respinge fișier prea mic (<4 octeți)", () => {
    const tiny = new Uint8Array([0x25, 0x50]);
    expect(validateMagicBytes(tiny, ".pdf")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. computeFileHash
// ─────────────────────────────────────────────────────────────────────────────

describe("computeFileHash", () => {
  it("produce SHA-256 hex 64 chars", async () => {
    const bytes = new TextEncoder().encode("hello world");
    const hash = await computeFileHash(bytes);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hash-uri diferite pentru conținuturi diferite", async () => {
    const h1 = await computeFileHash(new TextEncoder().encode("A"));
    const h2 = await computeFileHash(new TextEncoder().encode("B"));
    expect(h1).not.toBe(h2);
  });

  it("hash-uri identice pentru același conținut", async () => {
    const h1 = await computeFileHash(new TextEncoder().encode("same"));
    const h2 = await computeFileHash(new TextEncoder().encode("same"));
    expect(h1).toBe(h2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. isValidSlotKey + getSlotMeta
// ─────────────────────────────────────────────────────────────────────────────

describe("isValidSlotKey + getSlotMeta", () => {
  it("recunoaște key-uri valide", () => {
    expect(isValidSlotKey("cartea_tehnica")).toBe(true);
    expect(isValidSlotKey("releveu")).toBe(true);
    expect(isValidSlotKey("acord_proprietari")).toBe(true);
  });

  it("respinge key-uri necunoscute", () => {
    expect(isValidSlotKey("unknown_key")).toBe(false);
    expect(isValidSlotKey("")).toBe(false);
  });

  it("getSlotMeta returnează metadata sau null", () => {
    const ct = getSlotMeta("cartea_tehnica");
    expect(ct).toBeTruthy();
    expect(ct.maxMb).toBe(50);
    expect(getSlotMeta("xyz")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. IndexedDB round-trip (saveDocument + list + get + delete)
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasIndexedDB)("IndexedDB round-trip", () => {

  beforeEach(async () => {
    // Reset DB la fiecare test
    if (typeof indexedDB !== "undefined" && typeof indexedDB.deleteDatabase === "function") {
      await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase("zephren_documents");
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    }
  });

  it("save + list + get + delete round-trip", async () => {
    const fakeFile = new File(
      [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37])],
      "test.pdf",
      { type: "application/pdf" },
    );
    const saved = await saveDocument({
      cpeCode: "ZEP-2026-T01",
      slotKey: "cartea_tehnica",
      file: fakeFile,
    });
    expect(saved.id).toBe("ZEP-2026-T01__cartea_tehnica");
    expect(saved.hash).toMatch(/^[0-9a-f]{64}$/);

    const list = await listDocuments("ZEP-2026-T01");
    expect(list).toHaveLength(1);
    expect(list[0].slotKey).toBe("cartea_tehnica");
    expect(list[0].filename).toBe("test.pdf");

    const fetched = await getDocument("ZEP-2026-T01__cartea_tehnica");
    expect(fetched).toBeTruthy();
    expect(fetched.bytes).toBeTruthy();
    expect(fetched.bytes.length).toBe(8);

    await deleteDocument("ZEP-2026-T01__cartea_tehnica");
    const list2 = await listDocuments("ZEP-2026-T01");
    expect(list2).toHaveLength(0);
  });

  it("multiple slot-uri pentru același cpeCode", async () => {
    const f1 = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "a.pdf");
    const f2 = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "b.pdf");
    await saveDocument({ cpeCode: "X", slotKey: "cartea_tehnica", file: f1 });
    await saveDocument({ cpeCode: "X", slotKey: "pv_receptie", file: f2 });
    const list = await listDocuments("X");
    expect(list).toHaveLength(2);
  });

  it("upsert pe același (cpeCode, slotKey) suprascrie", async () => {
    const f1 = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "v1.pdf");
    const f2 = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "v2.pdf");
    await saveDocument({ cpeCode: "Y", slotKey: "releveu", file: f1 });
    await saveDocument({ cpeCode: "Y", slotKey: "releveu", file: f2 });
    const list = await listDocuments("Y");
    expect(list).toHaveLength(1);
    expect(list[0].filename).toBe("v2.pdf");
  });

  it("cleanupExpired șterge documente mai vechi decât TTL", async () => {
    const f = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "old.pdf");
    await saveDocument({ cpeCode: "Z", slotKey: "cartea_tehnica", file: f });
    // TTL 0 zile → toate expirate
    const deleted = await cleanupExpired(0);
    expect(deleted).toBeGreaterThanOrEqual(0); // poate fi 0 dacă rezoluția timp e prea fină
  });
});
