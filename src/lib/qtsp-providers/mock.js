/**
 * qtsp-providers/mock.js — Provider mock pentru semnături PAdES.
 *
 * Produce o semnătură PADES B-T cu structură PDF VALIDĂ (ByteRange + AcroForm + SigField
 * + Sig dict cu /Contents real hex), DAR cu cryptographic content fictiv:
 *   - Hash semnat este derivat deterministic din input hash + timestamp (HMAC-like simulat)
 *   - „Certificate" stocat e un placeholder ASN.1 minimal
 *   - Trust chain incomplet (CRL/OCSP placeholders)
 *
 * Adobe Reader și veraPDF vor flagga semnătura ca „Identity Unknown" sau „Signature
 * Invalid (cert chain incomplete)" — comportament corect pentru mock.
 *
 * UI Zephren afișează banner explicit „🟡 Semnătură mock — necesită cont QTSP RO".
 *
 * STRATEGIC: Acest provider permite Zephren să livreze pilot funcțional până la
 * onboarding QTSP, fără bundle bloat (zero noi librării crypto). Pentru lansare
 * comercială, swap la `certsign.js` (sau alt provider QTSP) prin signerConfig.provider.
 *
 * Sprint Conformitate P0-02 (6 mai 2026).
 */

/**
 * Construiește placeholder CMS SignedData hex deterministic pentru mock.
 *
 * Pentru MVP, generăm un hex string cu pattern recognizable (zerouri + hash + ts) astfel
 * încât veraPDF/Adobe să recunoască structura PKCS#7 (lungime ≥ 64 bytes), dar verificarea
 * să eșueze grațios cu „Identity Unknown".
 *
 * Pentru un mock cripto-valid (self-signed cert + RSA real signing via Web Crypto +
 * ASN.1 DER encoder minimal), vezi docs/PADES_CRYPTO_MOCK_UPGRADE.md (TBD).
 *
 * @param {Uint8Array} hash — SHA-256 hash 32 octeți
 * @param {Date} signingTime
 * @returns {string} hex string CMS SignedData placeholder
 */
function buildMockCmsHex(hash, signingTime) {
  // Producem un hex „CMS-shaped" cu tag-uri ASN.1 vizibile pentru parsers debug:
  //   30 82 LL LL  — SEQUENCE (lungime 2 octeți)
  //     06 09 2A 86 48 86 F7 0D 01 07 02  — OID signedData (1.2.840.113549.1.7.2)
  //     A0 82 LL LL  — [0] EXPLICIT (lungime)
  //       30 82 LL LL  — SEQUENCE (SignedData)
  //         02 01 01  — version = 1 (INTEGER 1)
  //         31 0D ... — DigestAlgorithms SET
  //         ...
  //
  // Implementare minimală: doar primele 100 bytes au structură ASN.1; restul = padding hash + ts.

  const ts = Math.floor(signingTime.getTime() / 1000); // seconds since epoch
  const tsBytes = [
    (ts >> 24) & 0xff, (ts >> 16) & 0xff, (ts >> 8) & 0xff, ts & 0xff,
  ];

  // Tag-uri ASN.1 pentru SignedData minimal (pentru recognition în parsers)
  const asn1Header = [
    0x30, 0x82, 0x01, 0x00,                           // SEQUENCE len=256 (placeholder)
    0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D,   // OID 1.2.840.113549.1.7.2 (signedData)
    0x01, 0x07, 0x02,
    0xA0, 0x82, 0x00, 0xF0,                           // [0] EXPLICIT len=240
    0x30, 0x82, 0x00, 0xEC,                           // SEQUENCE SignedData len=236
    0x02, 0x01, 0x01,                                 // INTEGER version=1
    0x31, 0x0D, 0x30, 0x0B,                           // SET DigestAlgorithms
    0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03,   // OID 2.16.840.1.101.3.4.2.1 (SHA-256)
    0x04, 0x02, 0x01,
  ];

  // Combine: header ASN.1 + timestamp + hash original + padding mock
  const allBytes = new Uint8Array([
    ...asn1Header,
    ...tsBytes,
    ...hash,
    // Mock „signature value" = hash repetat (pentru recognition determinist în testing)
    ...hash,
    ...hash,
  ]);

  // Convertește la hex
  let hex = "";
  for (const b of allBytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/**
 * Creează signer-ul mock.
 *
 * @param {object} [credentials] — ignorat pentru mock; păstrat pentru consistență interfață
 * @returns {{providerName: string, label: string, sign: Function}}
 */
export function createSigner(credentials = {}) {
  return {
    providerName: "mock",
    label: "Mock signer (testing/pilot)",

    /**
     * Semnează un hash → returnează CMS hex.
     *
     * @param {Uint8Array} hash — SHA-256 hash 32 octeți
     * @param {object} options
     * @param {Date} [options.signingTime]
     * @param {string} [options.subFilter]
     * @param {string} [options.level]
     * @returns {Promise<{cmsHex: string, providerLabel: string, certificateSubject: string, certificateIssuer: string, isMock: true, warnings: string[]}>}
     */
    async sign(hash, options = {}) {
      const signingTime = options.signingTime || new Date();
      const cmsHex = buildMockCmsHex(hash, signingTime);

      return {
        cmsHex,
        providerLabel: "Mock (Zephren MVP)",
        certificateSubject: "CN=Mock Auditor,O=Zephren,C=RO",
        certificateIssuer: "CN=Zephren Mock CA,O=Zephren,C=RO",
        isMock: true,
        warnings: [
          "Semnătură MOCK — fără valoare juridică conform eIDAS 2.",
          "Adobe Reader va flagga ca „Identity Unknown”.",
          "Pentru lansare comercială, configurează provider QTSP RO real " +
          "(certSIGN/DigiSign/TransSped). Vezi docs/CERTSIGN_SETUP.md.",
        ],
      };
    },
  };
}
