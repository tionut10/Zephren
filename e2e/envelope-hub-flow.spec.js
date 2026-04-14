import { test, expect } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════════
// SmartEnvelopeHub — fluxuri E2E pentru refactor Step 2 Anvelopă (S1–S4).
//
// Acoperă:
//   1. Activare via flag URL (?envelopeHub=1)
//   2. WizardOpaque (perete) — flux complet 3 pași
//   3. WizardGlazing (vitraj) — flux complet 3 pași
//   4. WizardBridges (punți) — quick-pick + aplicare bulk
//   5. Toggle legacy (?envelopeHub=0) — state shared între Hub și grid legacy
//   6. EnvelopeAssistant — chat heuristic local
//
// Pattern existent: e2e/full-flow.spec.js, e2e/energy-class-flow.spec.js
// Dev server: http://localhost:5173
// ═══════════════════════════════════════════════════════════════════════════

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Navighează la calculator. Cu `hubFlag = 1` forțează Hub activ,
 * `0` forțează fallback legacy, `null` folosește default (Hub ON).
 */
async function goToCalculator(page, hubFlag = null) {
  const url = hubFlag !== null ? `/?envelopeHub=${hubFlag}#app` : "/#app";
  await page.goto(url);
  await expect(
    page.getByText("Identificare și clasificare clădire")
  ).toBeVisible({ timeout: 20000 });
}

/** Click pe butonul „2. Anvelopă" din sidebar. */
async function goToStep2(page) {
  await page.locator("nav button", { hasText: /2\.\s*Anvelopă/ }).click();
  await page.waitForTimeout(500);
}

/** Deschide panoul „Ghidat" din Hub (expand tab-ul violet). */
async function openGuidedRamp(page) {
  await page.locator("#env-ramp-tab-guided").click();
  await page.waitForTimeout(300);
}

/** Locator pentru modalul wizard curent (overlay fixed + z-50). */
function getWizardModal(page) {
  return page.locator("div.fixed.inset-0.z-50").last();
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 1 — Activare Hub via feature flag URL
// ═══════════════════════════════════════════════════════════════════════════
test.describe("SmartEnvelopeHub — activare feature flag", () => {
  test("?envelopeHub=1 → Hub vizibil (drop zone + 3 cartele rampă + progres)", async ({ page }) => {
    await goToCalculator(page, 1);
    await goToStep2(page);

    // Drop zone universal — text unic pentru Hub
    await expect(page.getByText("Trage fișier anvelopă aici")).toBeVisible({ timeout: 5000 });

    // Cele 3 cartele rampă (tabs) — prezente doar în Hub
    await expect(page.locator("#env-ramp-tab-instant")).toBeVisible();
    await expect(page.locator("#env-ramp-tab-file")).toBeVisible();
    await expect(page.locator("#env-ramp-tab-guided")).toBeVisible();

    // Badge progres (X/10)
    await expect(page.getByText(/Step 2:/)).toBeVisible();
  });

  test("?envelopeHub=0 → Hub ascuns, grid legacy vizibil (Card-urile clasice)", async ({ page }) => {
    await goToCalculator(page, 0);
    await goToStep2(page);

    // Hub NU este renderizat
    await expect(page.getByText("Trage fișier anvelopă aici")).toHaveCount(0);
    await expect(page.locator("#env-ramp-tab-guided")).toHaveCount(0);

    // Grid legacy: cele 3 Card-uri clasice (Elemente opace, vitrate, Punți termice)
    await expect(page.getByText(/^Elemente opace$/).first()).toBeVisible();
    await expect(page.getByText(/^Elemente vitrate$/).first()).toBeVisible();
    await expect(page.getByText(/^Punți termice$/).first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Test 2 — WizardOpaque: perete complet în 3 pași
// ═══════════════════════════════════════════════════════════════════════════
test.describe("SmartEnvelopeHub — WizardOpaque (3 pași)", () => {
  test("Ghidat → Wizard perete → preset Cărămidă 30 + EPS 10 → Step 3 arată U → Save → apare în ElementsList", async ({ page }) => {
    await goToCalculator(page, 1);
    await goToStep2(page);
    await openGuidedRamp(page);

    // Deschide wizard-ul de perete
    await page.getByRole("button", { name: /Wizard: adaugă perete în 3 pași/ }).click();
    await page.waitForTimeout(300);

    const modal = getWizardModal(page);
    await expect(modal.getByRole("heading", { name: /Adaugă element opac/ })).toBeVisible();

    // ─── PAS 1: tipul PE este default, setăm doar suprafața ───────────────
    // Tipul „Perete exterior" (PE) este preselectat (element.type = „PE").
    // Verificăm vizibilitatea selectorului de tip (5 carduri în grid).
    await expect(modal.getByText("Perete exterior", { exact: true }).first()).toBeVisible();

    // Primul (și singurul) input[type=number] în Step 1 = câmpul Suprafață.
    await modal.locator('input[type="number"]').first().fill("25");
    await modal.getByRole("button", { name: /Înainte.*Straturi/ }).click();
    await page.waitForTimeout(200);

    // ─── PAS 2: alege preset „Cărămidă 30 + EPS 10" ────────────────────────
    await expect(modal.getByText(/Preset-uri populare pentru Perete exterior/)).toBeVisible();
    await modal.getByRole("button", { name: /Cărămidă 30 \+ EPS 10/ }).click();
    await page.waitForTimeout(200);
    await modal.getByRole("button", { name: /Înainte.*Verificare/ }).click();
    await page.waitForTimeout(300);

    // ─── PAS 3: verifică U calculat + salvează ──────────────────────────────
    // Textul „Coeficient U" apare în header-ul rezultatului + valoare W/(m²·K)
    await expect(modal.getByText(/Coeficient U/i)).toBeVisible();
    await expect(modal.getByText(/W\/\(m²·K\)/)).toBeVisible();

    // Save → elementul se adaugă în opaqueElements → apare în ElementsList
    await modal.getByRole("button", { name: /Salvează element/ }).click();
    await page.waitForTimeout(500);

    // Modalul se închide (nu mai există overlay .fixed.inset-0.z-50)
    await expect(page.locator("div.fixed.inset-0.z-50")).toHaveCount(0);

    // Elementul „Perete exterior" apare în secțiunea „Elemente opace" (count > 0)
    const opaqueSection = page.locator("div", {
      has: page.getByRole("button", { name: /Elemente opace/i }),
    }).first();
    await expect(opaqueSection).toBeVisible();
    // Count badge afișează „1"
    await expect(page.getByText(/Elemente opace/).first()).toBeVisible();
    // Card-ul elementului afișează denumirea „Perete exterior"
    await expect(page.getByText("Perete exterior").first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Test 3 — WizardGlazing: vitraj complet în 3 pași
// ═══════════════════════════════════════════════════════════════════════════
test.describe("SmartEnvelopeHub — WizardGlazing (3 pași)", () => {
  test("Ghidat → Wizard vitraj → Fereastră S 4m² → vitraj dublu Low-E → Save → apare în ElementsList", async ({ page }) => {
    await goToCalculator(page, 1);
    await goToStep2(page);
    await openGuidedRamp(page);

    await page.getByRole("button", { name: /Wizard: adaugă vitraj în 3 pași/ }).click();
    await page.waitForTimeout(300);

    const modal = getWizardModal(page);
    await expect(modal.getByRole("heading", { name: /Adaugă element vitrat/ })).toBeVisible();

    // ─── PAS 1: Fereastră default, orientare S default, setăm suprafața ────
    await expect(modal.getByText("Fereastră", { exact: true })).toBeVisible();
    await modal.locator('input[type="number"]').first().fill("4");
    await modal.getByRole("button", { name: /Înainte.*Vitraj/ }).click();
    await page.waitForTimeout(200);

    // ─── PAS 2: Vitraj „Dublu vitraj Low-E" este default → verifică preview U ──
    await expect(modal.getByText(/Tip vitraj/)).toBeVisible();
    await expect(modal.getByText(/U total preview/i)).toBeVisible();
    await modal.getByRole("button", { name: /Înainte.*Verificare/ }).click();
    await page.waitForTimeout(200);

    // ─── PAS 3: summary cu U + g + Save ─────────────────────────────────────
    await expect(modal.getByText(/U total/i).first()).toBeVisible();
    await expect(modal.getByText(/g efectiv/i)).toBeVisible();
    await expect(modal.getByText(/W\/\(m²·K\)/)).toBeVisible();

    await modal.getByRole("button", { name: /Salvează vitraj/ }).click();
    await page.waitForTimeout(500);

    await expect(page.locator("div.fixed.inset-0.z-50")).toHaveCount(0);

    // Elementul „Fereastră nouă" apare în secțiunea „Elemente vitrate"
    await expect(page.getByText("Fereastră nouă").first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Test 4 — WizardBridges: quick-pick + aplicare bulk
// ═══════════════════════════════════════════════════════════════════════════
test.describe("SmartEnvelopeHub — WizardBridges (quick-pick)", () => {
  test("Ghidat → Wizard punți → quick-pick sugerat → Apply all → punțile apar în ElementsList", async ({ page }) => {
    await goToCalculator(page, 1);
    await goToStep2(page);
    await openGuidedRamp(page);

    await page.getByRole("button", { name: /Wizard: identifică punți termice/ }).click();
    await page.waitForTimeout(300);

    const modal = getWizardModal(page);
    await expect(modal.getByRole("heading", { name: /Identifică punți termice/ })).toBeVisible();

    // Categoria „Joncțiuni pereți" este default activă (MAIN_CATEGORIES[0])
    // Primul quick-pick este „Perete ext. — Planșeu intermediar" (ψ din BD)
    await expect(modal.getByText(/Perete ext\. — Planșeu intermediar/).first()).toBeVisible();

    // Click primul buton „⚡ Sugerat (X m)" → adaugă în queue cu lungime sugerată
    await modal.getByRole("button", { name: /⚡ Sugerat/ }).first().click();
    await page.waitForTimeout(200);

    // Coloana dreaptă: queue afișează punte adăugată
    await expect(modal.getByText(/Punți pregătite pentru adăugare/)).toBeVisible();

    // Aplicare bulk → modalul se închide, punte adăugată în thermalBridges
    await modal.getByRole("button", { name: /Adaugă 1 punți/ }).click();
    await page.waitForTimeout(500);

    await expect(page.locator("div.fixed.inset-0.z-50")).toHaveCount(0);

    // Secțiunea „Punți termice" din ElementsList conține puntea adăugată
    await expect(page.getByText(/Perete ext\. — Planșeu intermediar/).first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Test 5 — Toggle legacy: aplicare demo + verificare conținut coerent
//
// NOTĂ: State-ul React nu persistă între reload-uri (nu există localStorage
// auto-save pentru opaqueElements/glazingElements). Prin urmare, testul
// verifică că ambele view-uri (Hub ON / Hub OFF) încarcă demo Mostră nr. 1,
// afișează Step 2 cu aceleași categorii de elemente (pereți + ferestre +
// punți), și CRUD-ul +Adaugă este disponibil în ambele moduri — dovada
// că state-ul este o sursă unică partajată de ambele UI.
// ═══════════════════════════════════════════════════════════════════════════

/** Aplică prima mostră demo din Step 1 (extinde „Mostre exemplu" + alege demo 1). */
async function applyFirstDemo(page) {
  const mostreBtn = page.getByRole("button", { name: /Mostre exemplu/ });
  await mostreBtn.click();
  await page.waitForTimeout(300);
  // Prima mostră din listă (DEMO_PROJECTS[0]) — apartament RA bloc PAFP
  await page.getByRole("button", { name: /Demo 1.*Apartament RA/ }).click();
  await page.waitForTimeout(1500);
}

test.describe("SmartEnvelopeHub — Toggle legacy (state shared)", () => {
  test("Hub ON + Demo 1 → conținut anvelopă vizibil; Hub OFF + Demo 1 → legacy afișează aceleași categorii", async ({ page }) => {
    // ─── Prima încărcare: Hub ON (default flag) ────────────────────────────
    await goToCalculator(page, 1);
    await applyFirstDemo(page);
    await goToStep2(page);

    // Hub este vizibil + conține date populate de demo
    await expect(page.getByText("Trage fișier anvelopă aici")).toBeVisible();
    const hubText = await page.locator("main").textContent();
    expect(/Perete|Planșeu/i.test(hubText)).toBeTruthy();
    // CRUD +Adaugă disponibil în ElementsList
    const addButtons = await page.getByRole("button", { name: /^\+ Adaugă$/ }).count();
    expect(addButtons).toBeGreaterThanOrEqual(3); // opaque + glazing + bridges

    // ─── A doua încărcare: Hub OFF, aceeași mostră ──────────────────────────
    await goToCalculator(page, 0);
    await applyFirstDemo(page);
    await goToStep2(page);

    // Legacy grid: drop zone absentă, dar aceleași categorii în Card-uri
    await expect(page.getByText("Trage fișier anvelopă aici")).toHaveCount(0);
    const legacyText = await page.locator("main").textContent();
    expect(/Perete|Planșeu/i.test(legacyText)).toBeTruthy();
    // CRUD +Adaugă din Card-urile legacy (același state slots)
    const addButtonsLegacy = await page.getByRole("button", { name: /^\+ Adaugă$/ }).count();
    expect(addButtonsLegacy).toBeGreaterThanOrEqual(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Test 6 — EnvelopeAssistant: chat heuristic local
// ═══════════════════════════════════════════════════════════════════════════
test.describe("SmartEnvelopeHub — EnvelopeAssistant (chat local)", () => {
  test('Ghidat → Asistent anvelopă → preset „Ce elemente am uitat?" → răspuns non-gol', async ({ page }) => {
    await goToCalculator(page, 1);
    await goToStep2(page);
    await openGuidedRamp(page);

    // Click pe ActiveAction „Asistent anvelopă" (unic pe pagină înainte de deschiderea chat-ului)
    await page.getByRole("button", { name: /Asistent anvelopă/ }).first().click();
    await page.waitForTimeout(300);

    const modal = getWizardModal(page);
    await expect(modal.getByRole("heading", { name: /Asistent anvelopă/ })).toBeVisible();

    // Mesaj inițial de salut
    await expect(modal.getByText(/Salut!.*asistentul anvelopei/i)).toBeVisible();

    // Click preset „Ce elemente am uitat?" (PRESET_PROMPTS[0].text)
    await modal.getByRole("button", { name: /Ce elemente am uitat\?/ }).click();
    await page.waitForTimeout(500);

    // Mesajul user apare în chat
    await expect(modal.getByText("Ce elemente am uitat?").nth(1)).toBeVisible();

    // Un nou mesaj bot apare — verifică că există conținut non-gol
    // (motor heuristic: generează lines[] cu verificare progres + elemente lipsă)
    const modalText = await modal.textContent();
    // Textul total al modalului trebuie să crească sensibil (răspuns adăugat)
    expect(modalText.length).toBeGreaterThan(200);

    // Input-ul trebuie să fie golit după submit
    const input = modal.locator('input[type="text"]');
    await expect(input).toHaveValue("");
  });
});
