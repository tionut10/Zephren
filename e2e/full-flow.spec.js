import { test, expect } from "@playwright/test";

// Helper: navigate from landing page to the calculator app
async function goToCalculator(page) {
  await page.goto("/#app");
  // Wait for the calculator's main heading — uses text match since the
  // heading includes "Identificare și clasificare clădire"
  await expect(
    page.getByText("Identificare și clasificare clădire")
  ).toBeVisible({ timeout: 20000 });
}

// Helper: click a step in the sidebar navigation
async function navigateToStep(page, stepNumber, stepLabel) {
  // Steps are in a <nav> as buttons: "📋 1. Identificare Date generale clădire"
  const stepButton = page.locator("nav button", {
    hasText: new RegExp(`${stepNumber}\\.\\s*${stepLabel}`),
  });
  await stepButton.click();
  await page.waitForTimeout(500);
}

test.describe("Energy Calculator — Landing Page", () => {
  test("should display landing page with branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Zephren").first()).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("button", { hasText: /Începe calculul gratuit/ })
    ).toBeVisible();
  });

  test("should navigate to calculator when CTA is clicked", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const cta = page.locator("button", { hasText: /Începe calculul gratuit/ });
    await expect(cta).toBeVisible({ timeout: 10000 });
    await cta.click();
    await expect(
      page.getByText("Identificare și clasificare clădire")
    ).toBeVisible({ timeout: 20000 });
  });
});

test.describe("Energy Calculator — Step 1: Identificare", () => {
  test.beforeEach(async ({ page }) => {
    await goToCalculator(page);
  });

  test("should display identification form", async ({ page }) => {
    await expect(page.getByText(/Adresa cl[aă]dirii/i).first()).toBeVisible();
    await expect(page.getByText(/Clasificare/i).first()).toBeVisible();
    await expect(page.getByText(/Geometrie|Dimensiuni/i).first()).toBeVisible();
  });

  test("should load a demo building template", async ({ page }) => {
    const demoBtn = page.locator("button", { hasText: /DEMO COMPLET/ }).first();
    await demoBtn.click();
    await page.waitForTimeout(1500);
    // Verify area field got populated (demo sets Au)
    const mainText = await page.locator("main").textContent();
    // Demo sets numeric values in dimension fields
    expect(mainText.length).toBeGreaterThan(500);
  });

  test("should have building category selector", async ({ page }) => {
    await expect(page.getByText("CATEGORIE FUNCȚIONALĂ")).toBeVisible();
  });
});

test.describe("Energy Calculator — Step Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await goToCalculator(page);
  });

  test("should navigate to Step 2 (Anvelopă)", async ({ page }) => {
    await navigateToStep(page, 2, "Anvelopă");
    await expect(page.getByText(/Elemente opace|ELEMENTE OPACE/).first()).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to Step 3 (Instalații)", async ({ page }) => {
    await navigateToStep(page, 3, "Instalații");
    await expect(page.getByText(/ÎNCĂLZIRE|Sursă|încălzire/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to Step 4 (Regenerabile)", async ({ page }) => {
    await navigateToStep(page, 4, "Regenerabile");
    await expect(page.getByText(/fotovoltaic|solar|regenerabil/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to Step 5 (Calcul)", async ({ page }) => {
    await navigateToStep(page, 5, "Calcul");
    const mainText = await page.locator("main").textContent();
    expect(mainText.length).toBeGreaterThan(50);
  });

  test("should navigate to Step 6 (Certificat)", async ({ page }) => {
    await navigateToStep(page, 6, "Certificat");
    const mainText = await page.locator("main").textContent();
    expect(mainText.length).toBeGreaterThan(50);
  });

  test("should navigate to Step 7 (Audit)", async ({ page }) => {
    await navigateToStep(page, 7, "Audit");
    const mainText = await page.locator("main").textContent();
    expect(mainText.length).toBeGreaterThan(50);
  });

  test("should navigate through all 7 steps sequentially", async ({ page }) => {
    const steps = [
      { num: 1, label: "Identificare" },
      { num: 2, label: "Anvelopă" },
      { num: 3, label: "Instalații" },
      { num: 4, label: "Regenerabile" },
      { num: 5, label: "Calcul" },
      { num: 6, label: "Certificat" },
      { num: 7, label: "Audit" },
    ];
    for (const step of steps) {
      await navigateToStep(page, step.num, step.label);
      const mainText = await page.locator("main").textContent();
      expect(mainText.length).toBeGreaterThan(10);
    }
  });
});

test.describe("Energy Calculator — Full Demo Flow", () => {
  test("demo data should persist across steps", async ({ page }) => {
    await goToCalculator(page);
    await page.locator("button", { hasText: /DEMO COMPLET/ }).first().click();
    await page.waitForTimeout(1500);

    // Navigate to Step 5 — should show calculation results
    await navigateToStep(page, 5, "Calcul");
    await page.waitForTimeout(500);
    const mainText = await page.locator("main").textContent();
    expect(mainText.length).toBeGreaterThan(200);
  });

  test("demo data should show energy content on Step 6", async ({ page }) => {
    await goToCalculator(page);
    await page.locator("button", { hasText: /DEMO COMPLET/ }).first().click();
    await page.waitForTimeout(1500);

    await navigateToStep(page, 6, "Certificat");
    await page.waitForTimeout(500);
    const mainText = await page.locator("main").textContent();
    expect(/kWh|certificat|clasă|energetic/i.test(mainText)).toBeTruthy();
  });
});

test.describe("Energy Calculator — Keyboard Shortcuts", () => {
  test("Alt+Right should navigate to next step", async ({ page }) => {
    await goToCalculator(page);
    // Press Alt+ArrowRight to go to Step 2
    await page.keyboard.press("Alt+ArrowRight");
    await page.waitForTimeout(500);
    // Should now be on Step 2 — check for envelope-related content
    await expect(page.getByText(/Elemente opace|ELEMENTE OPACE/).first()).toBeVisible({ timeout: 5000 });
  });
});
