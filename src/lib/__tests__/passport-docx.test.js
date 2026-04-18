/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportPassportDOCX } from "../passport-docx.js";
import { buildRenovationPassport } from "../../calc/renovation-passport.js";

describe("exportPassportDOCX", () => {
  let clickSpy;
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("produce Blob cu MIME DOCX și filename corect", async () => {
    const p = buildRenovationPassport({
      building: { address: "Str. Demo", category: "RC", areaUseful: 100 },
      instSummary: { ep_total_m2: 250, co2_total_m2: 50, energyClass: "D" },
      climate: { zone: "II" },
      auditor: { name: "Ing. Test", certNr: "GI-1" },
    });
    const r = await exportPassportDOCX(p);
    expect(r.size).toBeGreaterThan(2000);
    expect(r.filename).toMatch(/^pasaport_renovare_[0-9a-f]{8}_\d{4}-\d{2}-\d{2}\.docx$/i);
    expect(clickSpy).toHaveBeenCalled();
  }, 10000);

  it("acceptă filename custom", async () => {
    const p = buildRenovationPassport({
      building: { address: "X", category: "BI", areaUseful: 200 },
      instSummary: { ep_total_m2: 180, energyClass: "C" },
      climate: { zone: "II" },
      auditor: { name: "A", certNr: "B" },
    });
    const r = await exportPassportDOCX(p, { filename: "custom_nume.docx" });
    expect(r.filename).toBe("custom_nume.docx");
  }, 10000);
});
