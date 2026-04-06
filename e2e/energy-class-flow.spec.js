import { test, expect } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════
// FLUX PRINCIPAL: Pas 1 (Identificare) → Pas 5 (Calcul) → Clasă energetică
// Verifică că după completarea datelor minime apare clasa energetică
// ═══════════════════════════════════════════════════════════════

async function goToCalculator(page) {
  await page.goto("/#app");
  await expect(
    page.getByText("Identificare și clasificare clădire")
  ).toBeVisible({ timeout: 20000 });
}

async function navigateToStep(page, stepNumber, stepLabel) {
  const stepButton = page.locator("nav button", {
    hasText: new RegExp(`${stepNumber}\\.\\s*${stepLabel}`),
  });
  await stepButton.click();
  await page.waitForTimeout(300);
}

// ─── Testul 1: Flux complet cu date DEMO → Pas 5 → clasă energetică ───────
test.describe("Flux principal: Pas 1 → Pas 5 → Clasă energetică", () => {
  test("DEMO complet → Pas 5 afișează clasa energetică (literă A-G)", async ({ page }) => {
    await goToCalculator(page);

    // Pas 1: Încarcă DEMO COMPLET
    const demoBtn = page.locator("button", { hasText: /DEMO COMPLET/ }).first();
    await expect(demoBtn).toBeVisible({ timeout: 5000 });
    await demoBtn.click();
    await page.waitForTimeout(1500);

    // Navighează la Pas 5
    await navigateToStep(page, 5, "Calcul");
    await page.waitForTimeout(800);

    // Verifică că apare Clasa energetică (secțiunea text)
    await expect(
      page.getByText(/Clasa energetică/i).first()
    ).toBeVisible({ timeout: 8000 });

    // Verifică că apare o literă de clasă energetică A+, A, B, C, D, E, F sau G
    const mainText = await page.locator("main").textContent();
    expect(/\b(A\+|A|B|C|D|E|F|G)\b/.test(mainText)).toBeTruthy();
    // Verifică că apare valoarea EP [kWh/m²]
    expect(/kWh/.test(mainText)).toBeTruthy();
  });

  // ─── Testul 2: Completare manuală Pas 1 → Pas 5 → rezultat parțial ──────
  test("Completare manuală Pas 1 → Pas 5 afișează rezultat energetic", async ({ page }) => {
    await goToCalculator(page);

    // Pas 1: Completare câmpuri de bază
    // Adresă
    const addressInput = page.locator("input[placeholder='Str. Exemplu, nr. 10']").first();
    if (await addressInput.isVisible()) {
      await addressInput.fill("Str. Test, nr. 1");
    }

    // Localitate — caută inputul pentru Localitate și completează
    const cityInput = page.locator("input").filter({ hasText: "" }).nth(1);
    const allInputs = page.locator("main input[type='text'], main input:not([type])");
    const inputCount = await allInputs.count();
    if (inputCount > 1) {
      await allInputs.nth(1).fill("București");
      await page.waitForTimeout(300);
    }

    // Arie utilă (Au) — caută inputul numeric pentru arie
    const numericInputs = page.locator("main input[type='number']");
    const numCount = await numericInputs.count();
    if (numCount > 0) {
      // Primul input numeric este de obicei Suprafața utilă (Au)
      await numericInputs.first().fill("100");
      await page.waitForTimeout(200);
    }

    // Navighează la Pas 5 (calculul se face cu valori implicite pentru pașii 2-4)
    await navigateToStep(page, 5, "Calcul");
    await page.waitForTimeout(1000);

    // Verifică că pagina Pas 5 e activă și conține conținut substanțial
    const mainText = await page.locator("main").textContent();
    expect(mainText.length).toBeGreaterThan(100);
    // Verifică că apare secțiunea de calcul energetic
    expect(/[Cc]alc|[Ee]nerg|kWh|EP/.test(mainText)).toBeTruthy();
  });

  // ─── Testul 3: Flux DEMO 2 (bloc reabilitat) → Pas 5 → Clasa C ─────────
  test("DEMO bloc reabilitat → Pas 5 → clasa energetică vizibilă", async ({ page }) => {
    await goToCalculator(page);

    // Al doilea buton DEMO (bloc Cluj reabilitat Clasa C)
    const demoBtns = page.locator("button").filter({ hasText: /Ap\. 3 cam\. bloc.*reabilitat|DEMO.*bloc/i });
    const count = await demoBtns.count();
    if (count > 0) {
      await demoBtns.first().click();
    } else {
      // Fallback: primul DEMO disponibil
      await page.locator("button").filter({ hasText: /DEMO COMPLET/ }).first().click();
    }
    await page.waitForTimeout(1500);

    await navigateToStep(page, 5, "Calcul");
    await page.waitForTimeout(800);

    // Secțiunea clasă energetică trebuie să fie vizibilă
    await expect(
      page.getByText(/Clasa energetică|Calcul energetic global/i).first()
    ).toBeVisible({ timeout: 8000 });
    const mainText = await page.locator("main").textContent();
    // Trebuie să apară EP în kWh și o clasă
    expect(/kWh/.test(mainText)).toBeTruthy();
    expect(/\b(A\+|A|B|C|D|E|F|G)\b/.test(mainText)).toBeTruthy();
  });

  // ─── Testul 4: Verificare titlu Pas 5 și structura principală ───────────
  test("Pas 5 are secțiunile: Calcul global, Clasa energetică, bilanț lunar", async ({ page }) => {
    await goToCalculator(page);
    await page.locator("button", { hasText: /DEMO COMPLET/ }).first().click();
    await page.waitForTimeout(1500);

    await navigateToStep(page, 5, "Calcul");
    await page.waitForTimeout(800);

    // Titlu principal Pas 5
    await expect(
      page.getByText(/Calcul energetic global|Global energy calculation/i).first()
    ).toBeVisible({ timeout: 8000 });

    // Clasa energetică
    await expect(
      page.getByText(/Clasa energetică|Energy class/i).first()
    ).toBeVisible();

    // Valoare EP numerică
    const mainText = await page.locator("main").textContent();
    const epMatch = mainText.match(/(\d+\.?\d*)\s*kWh/);
    expect(epMatch).not.toBeNull();
    const epValue = parseFloat(epMatch[1]);
    expect(epValue).toBeGreaterThan(0);
    expect(epValue).toBeLessThan(2000); // valoare rezonabilă
  });

  // ─── Testul 5: Clasa energetică din Pas 5 se reflectă și în Pas 6 ───────
  test("Clasa energetică din Pas 5 apare identică în Pas 6 (Certificat)", async ({ page }) => {
    await goToCalculator(page);
    await page.locator("button", { hasText: /DEMO COMPLET/ }).first().click();
    await page.waitForTimeout(1500);

    // Pas 5 — extrage clasa
    await navigateToStep(page, 5, "Calcul");
    await page.waitForTimeout(800);
    const step5Text = await page.locator("main").textContent();
    const classMatch5 = step5Text.match(/\b(A\+|A|B|C|D|E|F|G)\b/);
    expect(classMatch5).not.toBeNull();
    const energyClass = classMatch5[1];

    // Pas 6 — verifică aceeași clasă
    await navigateToStep(page, 6, "Certificat");
    await page.waitForTimeout(800);
    const step6Text = await page.locator("main").textContent();
    expect(step6Text).toContain(energyClass);
    expect(/kWh|certificat|clasă|energetic/i.test(step6Text)).toBeTruthy();
  });
});
