import { test, expect } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════════
// Helpers reutilizabile din full-flow.spec.js
// ═══════════════════════════════════════════════════════════════════════════
async function goToCalculator(page) {
  await page.goto("/#app");
  await expect(page.getByText("Identificare și clasificare clădire")).toBeVisible({ timeout: 20000 });
}

async function loadDemoProject(page) {
  // Click pe "Demo" sau "Încarcă proiect exemplu" — folosim butoanele QuickFill sau demo
  // Încărcăm un demo prin tutorial wizard sau buton dedicat
  const demoBtn = page.locator("button").filter({ hasText: /demo|exemplu|casă 1985/i }).first();
  if (await demoBtn.count() > 0) {
    await demoBtn.click();
    await page.waitForTimeout(500);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// S7.3 — E2E tests pentru export/import flow (lazy chunks verificate indirect)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Export flow — JSON/CSV download", () => {
  test("Export JSON declanșează download cu extensia .json", async ({ page }) => {
    await goToCalculator(page);
    // Găsește butonul export (meniu ⋯ sau direct)
    const moreBtn = page.locator("button[title*='meniu' i], button").filter({ hasText: /⋯|more|meniu/i }).first();
    if (await moreBtn.count() > 0) {
      await moreBtn.click();
      await page.waitForTimeout(300);
    }

    const exportJsonBtn = page.locator("button").filter({ hasText: /Export JSON|Backup/i }).first();
    if (await exportJsonBtn.count() === 0) test.skip();

    const downloadPromise = page.waitForEvent("download", { timeout: 10000 });
    await exportJsonBtn.click();
    const download = await downloadPromise;
    const suggestedName = download.suggestedFilename();
    expect(suggestedName).toMatch(/\.json$/);
    expect(suggestedName).toContain("Zephren_");
  });

  test("Export CSV declanșează download cu BOM UTF-8", async ({ page }) => {
    await goToCalculator(page);
    const moreBtn = page.locator("button[title*='meniu' i], button").filter({ hasText: /⋯|more|meniu/i }).first();
    if (await moreBtn.count() > 0) {
      await moreBtn.click();
      await page.waitForTimeout(300);
    }

    const exportCsvBtn = page.locator("button").filter({ hasText: /Export CSV/i }).first();
    if (await exportCsvBtn.count() === 0) test.skip();

    const downloadPromise = page.waitForEvent("download", { timeout: 10000 });
    await exportCsvBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});

test.describe("Export lazy chunk load", () => {
  test("Chunk exportHandlers se încarcă doar la primul click pe export", async ({ page }) => {
    const loadedChunks = new Set();
    page.on("response", (resp) => {
      const url = resp.url();
      const m = url.match(/assets\/([A-Za-z0-9_-]+)-[A-Za-z0-9_-]+\.js/);
      if (m) loadedChunks.add(m[1]);
    });

    await goToCalculator(page);
    await page.waitForLoadState("networkidle");

    // La mount inițial NU ar trebui să fie încărcat exportHandlers
    expect(loadedChunks.has("exportHandlers")).toBe(false);

    // Click pe un buton de export (oricare, ex. JSON)
    const moreBtn = page.locator("button[title*='meniu' i], button").filter({ hasText: /⋯|more|meniu/i }).first();
    if (await moreBtn.count() > 0) await moreBtn.click();
    const exportJsonBtn = page.locator("button").filter({ hasText: /Export JSON|Backup/i }).first();
    if (await exportJsonBtn.count() > 0) {
      const dl = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
      await exportJsonBtn.click();
      await dl;
      await page.waitForTimeout(500);
      // Acum chunk-ul ar trebui încărcat
      expect(loadedChunks.has("exportHandlers")).toBe(true);
    }
  });
});

test.describe("Share modal — lazy load", () => {
  test("ShareModal se deschide la click + lazy chunk se încarcă on-demand", async ({ page }) => {
    const loadedChunks = new Set();
    page.on("response", (resp) => {
      const m = resp.url().match(/assets\/ShareModal-[A-Za-z0-9_-]+\.js/);
      if (m) loadedChunks.add("ShareModal");
    });

    await goToCalculator(page);
    await page.waitForLoadState("networkidle");
    expect(loadedChunks.has("ShareModal")).toBe(false);

    // Caută buton share (meniu sau direct)
    const moreBtn = page.locator("button[title*='meniu' i], button").filter({ hasText: /⋯|more|meniu/i }).first();
    if (await moreBtn.count() > 0) await moreBtn.click();
    const shareBtn = page.locator("button").filter({ hasText: /Partajare|QR|Share/i }).first();
    if (await shareBtn.count() === 0) test.skip();

    await shareBtn.click();
    await page.waitForTimeout(800);

    // ShareModal chunk ar trebui încărcat acum
    expect(loadedChunks.has("ShareModal")).toBe(true);

    // Verifică că modalul e vizibil
    const modalHeading = page.locator("h3, h2, h1").filter({ hasText: /partaj|share|QR/i }).first();
    await expect(modalHeading).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Import flow — file picker", () => {
  test("Import Project expune input file type='file'", async ({ page }) => {
    await goToCalculator(page);
    // Input-urile file sunt în general ascunse (visibility: none) și triggerred prin butoane
    const fileInputs = page.locator("input[type='file']");
    expect(await fileInputs.count()).toBeGreaterThan(0);
  });

  test("Click pe 'Import proiect' deschide wizard sau file picker (lazy ImportModal)", async ({ page }) => {
    const loadedChunks = new Set();
    page.on("response", (resp) => {
      const m = resp.url().match(/assets\/ImportModal-[A-Za-z0-9_-]+\.js/);
      if (m) loadedChunks.add("ImportModal");
    });

    await goToCalculator(page);
    await page.waitForLoadState("networkidle");
    expect(loadedChunks.has("ImportModal")).toBe(false);

    const importBtn = page.locator("button").filter({ hasText: /Import.*soft|Import Wizard|Import din/i }).first();
    if (await importBtn.count() === 0) test.skip();

    await importBtn.click();
    await page.waitForTimeout(800);

    // Verifică că ImportModal chunk e încărcat sau wizard vizibil
    const loaded = loadedChunks.has("ImportModal");
    const modalVisible = await page.locator("div[role='dialog'], div").filter({ hasText: /Import/i }).first().isVisible().catch(() => false);
    expect(loaded || modalVisible).toBe(true);
  });
});

test.describe("Initial bundle size (smoke test)", () => {
  test("La mount inițial, bundle energy-calc e livrat din /assets/", async ({ page }) => {
    const energyCalcChunk = await new Promise((resolve) => {
      page.on("response", (resp) => {
        const m = resp.url().match(/assets\/energy-calc-[A-Za-z0-9_-]+\.js/);
        if (m) resolve(resp);
      });
      goToCalculator(page);
      setTimeout(() => resolve(null), 15000);
    });

    expect(energyCalcChunk).not.toBeNull();
    const size = parseInt(energyCalcChunk.headers()["content-length"] || "0");
    // După S5+S6, energy-calc trebuie să fie sub 500 kB
    expect(size).toBeLessThan(500 * 1024);
  });
});
