/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildSubmitEmail,
  splitFilesBySize,
  appendAttempt,
  setFinalStatus,
  loadTracking,
  clearTracking,
  listAllTracked,
  MDLPA_EMAIL,
  MAX_EMAIL_ATTACHMENT_MB,
} from "../mdlpa-submit.js";

describe("buildSubmitEmail", () => {
  it("include cod CPE în subject", () => {
    const r = buildSubmitEmail({ cpeCode: "ZEP_2026_001", auditor: { name: "Ion Popescu", atestat: "GI-123" } });
    expect(r.subject).toContain("ZEP_2026_001");
    expect(r.subject).toContain("Depunere CPE");
  });

  it("include adresa clădirii în subject dacă e furnizată", () => {
    const r = buildSubmitEmail({ cpeCode: "X", auditor: {}, buildingAddress: "Bd. Unirii 1" });
    expect(r.subject).toContain("Bd. Unirii 1");
  });

  it("listează atașamentele directe în body", () => {
    const r = buildSubmitEmail({
      cpeCode: "X", auditor: {},
      files: [{ name: "cpe.xml", sizeMB: 0.05 }, { name: "report.pdf", sizeMB: 1.2 }],
    });
    expect(r.body).toContain("cpe.xml");
    expect(r.body).toContain("report.pdf");
    expect(r.body).toContain("0.05 MB");
    expect(r.body).toContain("1.20 MB");
  });

  it("listează linkurile cloud separat de atașamente", () => {
    const r = buildSubmitEmail({
      cpeCode: "X", auditor: {},
      files: [
        { name: "small.xml", sizeMB: 0.1 },
        { name: "big.zip", sizeMB: 50, url: "https://supabase.example/big.zip" },
      ],
    });
    expect(r.body).toContain("Linkuri cloud");
    expect(r.body).toContain("https://supabase.example/big.zip");
    expect(r.body).toContain("Fișiere atașate");
  });

  it("URL mailto are encodare corectă", () => {
    const r = buildSubmitEmail({ cpeCode: "X & Y", auditor: { name: "A", atestat: "B" } });
    expect(r.mailtoUrl).toMatch(/^mailto:/);
    expect(r.mailtoUrl).toContain(encodeURIComponent("X & Y"));
    expect(r.mailtoUrl).toContain(MDLPA_EMAIL);
  });

  it("adaugă semnătura auditorului la final", () => {
    const r = buildSubmitEmail({ cpeCode: "X", auditor: { name: "Ana Pop", atestat: "GI-456", email: "ana@x.ro" } });
    expect(r.body).toContain("Ana Pop");
    expect(r.body).toContain("atestat GI-456");
    expect(r.body).toContain("ana@x.ro");
  });
});

describe("splitFilesBySize", () => {
  function fakeFile(name, sizeMB) {
    return { name, size: sizeMB * 1024 * 1024, type: "application/pdf" };
  }

  it("separă fișierele mici de cele mari", () => {
    const files = [
      fakeFile("small1.pdf", 5),
      fakeFile("small2.xml", 0.1),
      fakeFile("big1.zip", MAX_EMAIL_ATTACHMENT_MB + 5),
      fakeFile("big2.tar", 100),
    ];
    const { attachable, oversize } = splitFilesBySize(files);
    expect(attachable).toHaveLength(2);
    expect(oversize).toHaveLength(2);
    expect(attachable[0].name).toBe("small1.pdf");
    expect(oversize[0].name).toBe("big1.zip");
  });

  it("prag inclusiv: fișier exact 25 MB rămâne atașabil", () => {
    const { attachable, oversize } = splitFilesBySize([fakeFile("edge.pdf", MAX_EMAIL_ATTACHMENT_MB)]);
    expect(attachable).toHaveLength(1);
    expect(oversize).toHaveLength(0);
  });

  it("returnează arrays goale pentru input gol", () => {
    expect(splitFilesBySize([])).toEqual({ attachable: [], oversize: [] });
    expect(splitFilesBySize()).toEqual({ attachable: [], oversize: [] });
  });
});

describe("tracking persistent (localStorage)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("appendAttempt creează tracking dacă nu există", () => {
    const t = appendAttempt("cpe123", { method: "email", status: "sent", finalStatus: "email_opened" });
    expect(t.cpeId).toBe("cpe123");
    expect(t.attempts).toHaveLength(1);
    expect(t.finalStatus).toBe("email_opened");
    expect(t.lastUpdate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("appendAttempt adaugă la istoric existent", () => {
    appendAttempt("cpe123", { method: "cloud", status: "uploaded" });
    appendAttempt("cpe123", { method: "email", status: "sent", finalStatus: "submitted" });
    const t = loadTracking("cpe123");
    expect(t.attempts).toHaveLength(2);
    expect(t.finalStatus).toBe("submitted");
  });

  it("setFinalStatus actualizează statusul + adaugă entry", () => {
    appendAttempt("cpe999", { method: "email", status: "sent" });
    const t = setFinalStatus("cpe999", "acknowledged", "MDLPA confirmare email");
    expect(t.finalStatus).toBe("acknowledged");
    expect(t.attempts).toHaveLength(2);
    expect(t.attempts[1].note).toContain("MDLPA");
  });

  it("listAllTracked returnează toate sortate descendent", () => {
    appendAttempt("cpe_a", { method: "email", status: "sent" });
    appendAttempt("cpe_b", { method: "email", status: "sent" });
    const all = listAllTracked();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all[0].cpeId).toBeDefined();
  });

  it("clearTracking șterge entry-ul", () => {
    appendAttempt("cpe_del", { method: "email", status: "sent" });
    clearTracking("cpe_del");
    expect(loadTracking("cpe_del")).toBeNull();
  });
});
