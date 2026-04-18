/**
 * Generare QR code pentru pașaport renovare EPBD.
 * Link destinat registrului MDLPA viitor (fallback canvas local).
 */

export const DEFAULT_PASSPORT_LOCAL_BASE = "https://zephren.ro/passport/";

function buildPassportUrl(passportId, options = {}) {
  const { registryBase = null, localFallback = DEFAULT_PASSPORT_LOCAL_BASE } = options;
  if (registryBase) {
    const trimmed = String(registryBase).replace(/\/+$/, "");
    return `${trimmed}/passport/${passportId}`;
  }
  return `${localFallback}${passportId}`;
}

export async function generatePassportQR(passportId, options = {}) {
  const { size = 200, margin = 2 } = options;
  if (!passportId) throw new Error("passportId lipsă pentru QR");

  const { default: QRCode } = await import("qrcode");
  const url = buildPassportUrl(passportId, options);
  const dataURL = await QRCode.toDataURL(url, {
    width: size,
    margin,
    errorCorrectionLevel: "M",
    color: { dark: "#0d0f1a", light: "#ffffff" },
  });
  return { dataURL, url, size };
}

export async function generatePassportQRString(passportId, options = {}) {
  const { default: QRCode } = await import("qrcode");
  const url = buildPassportUrl(passportId, options);
  const svg = await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M" });
  return { svg, url };
}
