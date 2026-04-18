/**
 * POST /api/generate-xml
 *
 * Receives project data and returns XML in MDLPA format
 * (Romanian energy performance certificate XML schema).
 *
 * Sprint 20 (18 apr 2026) — auth + rate-limit + CORS allowlist.
 */
import { requireAuth } from "./_middleware/auth.js";
import { checkRateLimit, sendRateLimitError } from "./_middleware/rateLimit.js";
import { applyCors } from "./_middleware/cors.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth + rate-limit (Sprint 20)
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const limit = checkRateLimit(auth.user.id, 30);
  if (!limit.allowed) return sendRateLimitError(res, limit);

  // Size limit (max 1 MB JSON — raportul complet poate fi mare)
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 1024 * 1024) {
    return res.status(413).json({ error: "Request body too large (max 1 MB)" });
  }

  try {
    const body = req.body;

    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Request body is required" });
    }

    const {
      building,       // { name, address, county, locality, cadastral, yearBuilt, ... }
      owner,          // { name, cnp_cui, address }
      auditor,        // { name, attestation, company, cpeCode, mdlpaCode, registryIndex }
      results,        // { ep, energyClass, co2, rer, breakdown }
      envelope,       // { walls_u, roof_u, floor_u, windows_u }
      systems,        // { heating, cooling, hotWater, ventilation, lighting }
      issuedDate,     // ISO date string
      cpeCode,        // Sprint 14: cod unic CPE (Ord. MDLPA 16/2023 + L.238/2024)
      sri,            // Sprint 17: { total, class, impact:{energy_efficiency,flexibility,comfort}, domains[] }
      passportUUID,   // Sprint 17: UUID pașaport renovare asociat (EPBD 2024/1275 Art. 12)
      bacsClass,      // Sprint 17: clasa BACS ISO 52120-1:2022 (A/B/C/D)
    } = body;

    if (!building || !results) {
      return res
        .status(400)
        .json({ error: "'building' and 'results' fields are required" });
    }

    const escapeXml = (str) =>
      String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const e = escapeXml;
    const date = issuedDate || new Date().toISOString().split("T")[0];

    const cpeCodeFinal = cpeCode || auditor?.cpeCode || "";

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CertificatPerformantaEnergetica xmlns="urn:mdlpa:certificat-energetic:v1">
  <Antet>
    <DataEmitere>${e(date)}</DataEmitere>
    <Scop>Certificat de performanta energetica</Scop>
    <Legislatie>Mc 001-2022, Legea 238/2024</Legislatie>
    <CodUnicCPE>${e(cpeCodeFinal)}</CodUnicCPE>
  </Antet>

  <Cladire>
    <Denumire>${e(building.name)}</Denumire>
    <Adresa>${e(building.address)}</Adresa>
    <Judet>${e(building.county)}</Judet>
    <Localitate>${e(building.locality)}</Localitate>
    <NumarCadastral>${e(building.cadastral)}</NumarCadastral>
    <AnConstructie>${e(building.yearBuilt)}</AnConstructie>
    <SuprafataUtila>${e(building.area)}</SuprafataUtila>
    <Volum>${e(building.volume)}</Volum>
    <TipCladire>${e(building.buildingType)}</TipCladire>
    <ZonaClimatica>${e(building.climateZone)}</ZonaClimatica>
  </Cladire>

  <Proprietar>
    <Nume>${e(owner?.name)}</Nume>
    <CNP_CUI>${e(owner?.cnp_cui)}</CNP_CUI>
    <Adresa>${e(owner?.address)}</Adresa>
  </Proprietar>

  <AuditorEnergetic>
    <Nume>${e(auditor?.name)}</Nume>
    <Atestare>${e(auditor?.attestation)}</Atestare>
    <Firma>${e(auditor?.company)}</Firma>
  </AuditorEnergetic>

  <AnvelopaTermica>
    <PereteExterior_U>${e(envelope?.walls_u)}</PereteExterior_U>
    <Acoperis_U>${e(envelope?.roof_u)}</Acoperis_U>
    <Planeu_U>${e(envelope?.floor_u)}</Planeu_U>
    <Ferestre_U>${e(envelope?.windows_u)}</Ferestre_U>
  </AnvelopaTermica>

  <SistemeTehniceInstalatii>
    <SistemIncalzire>${e(systems?.heating)}</SistemIncalzire>
    <SistemRacire>${e(systems?.cooling)}</SistemRacire>
    <ApaCalda>${e(systems?.hotWater)}</ApaCalda>
    <Ventilatie>${e(systems?.ventilation)}</Ventilatie>
    <Iluminat>${e(systems?.lighting)}</Iluminat>
  </SistemeTehniceInstalatii>

  <RezultateCalcul>
    <EnergieSpecificaPrimara unit="kWh/m2/an">${e(results.ep)}</EnergieSpecificaPrimara>
    <ClasaEnergetica>${e(results.energyClass)}</ClasaEnergetica>
    <EmisiiCO2 unit="kgCO2/m2/an">${e(results.co2)}</EmisiiCO2>
    <RER>${e(results.rer)}</RER>
    <Defalcare>
      <Incalzire unit="kWh/m2/an">${e(results.breakdown?.heating)}</Incalzire>
      <ApaCalda unit="kWh/m2/an">${e(results.breakdown?.hotWater)}</ApaCalda>
      <Racire unit="kWh/m2/an">${e(results.breakdown?.cooling)}</Racire>
      <Iluminat unit="kWh/m2/an">${e(results.breakdown?.lighting)}</Iluminat>
      <Regenerabile unit="kWh/m2/an">${e(results.breakdown?.renewable)}</Regenerabile>
    </Defalcare>
  </RezultateCalcul>

  <Automatizare>
    <ClasaBACS standard="SR EN ISO 52120-1:2022">${e(bacsClass || "")}</ClasaBACS>
    ${sri ? `<SRI standard="Reg. UE 2020/2155">
      <Scor>${e(typeof sri.total === "number" ? sri.total.toFixed(1) : sri.total)}</Scor>
      <Clasa>${e(sri.class || "")}</Clasa>
      <Eficienta>${e(sri.impact?.energy_efficiency?.score ?? "")}</Eficienta>
      <Flexibilitate>${e(sri.impact?.flexibility?.score ?? "")}</Flexibilitate>
      <Confort>${e(sri.impact?.comfort?.score ?? "")}</Confort>
    </SRI>` : ""}
  </Automatizare>
  ${passportUUID ? `<PasaportRenovare standard="EPBD 2024/1275 Art. 12">
    <UUID>${e(passportUUID)}</UUID>
    <URL>https://zephren.ro/passport/${e(passportUUID)}</URL>
  </PasaportRenovare>` : ""}
</CertificatPerformantaEnergetica>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificat_energetic_${date}.xml"`
    );
    return res.status(200).send(xml);
  } catch (err) {
    console.error("[api/generate-xml] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
