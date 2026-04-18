/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import {
  generatePassportQR,
  generatePassportQRString,
  DEFAULT_PASSPORT_LOCAL_BASE,
} from "../qr-passport.js";

const VALID_ID = "12345678-1234-4234-8234-123456789012";

describe("generatePassportQR", () => {
  it("returnează dataURL base64 PNG + URL local default", async () => {
    const r = await generatePassportQR(VALID_ID);
    expect(r.dataURL).toMatch(/^data:image\/png;base64,/);
    expect(r.url).toBe(`${DEFAULT_PASSPORT_LOCAL_BASE}${VALID_ID}`);
    expect(r.size).toBe(200);
  });

  it("folosește registryBase când e furnizat", async () => {
    const r = await generatePassportQR(VALID_ID, {
      registryBase: "https://api.mdlpa.gov.ro/v1",
    });
    expect(r.url).toBe(`https://api.mdlpa.gov.ro/v1/passport/${VALID_ID}`);
  });

  it("normalizează trailing slash în registryBase", async () => {
    const r = await generatePassportQR(VALID_ID, {
      registryBase: "https://api.mdlpa.gov.ro/v1///",
    });
    expect(r.url).toBe(`https://api.mdlpa.gov.ro/v1/passport/${VALID_ID}`);
  });

  it("respectă parametrul size", async () => {
    const r = await generatePassportQR(VALID_ID, { size: 512 });
    expect(r.size).toBe(512);
  });

  it("aruncă eroare pentru passportId lipsă", async () => {
    await expect(generatePassportQR("")).rejects.toThrow();
    await expect(generatePassportQR(null)).rejects.toThrow();
  });
});

describe("generatePassportQRString", () => {
  it("returnează SVG string", async () => {
    const r = await generatePassportQRString(VALID_ID);
    expect(r.svg).toContain("<svg");
    expect(r.url).toContain(VALID_ID);
  });
});
