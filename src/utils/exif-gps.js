/**
 * exif-gps.js — extragere GPS din EXIF (Sprint D Task 6)
 *
 * Folosește biblioteca `exifr` (~5 KB gzip) pentru a extrage GPS din
 * fotografii JPEG/HEIC fără încărcarea totală a fișierului.
 *
 * Coordinatele EXIF sunt în format DMS (degrees-minutes-seconds) cu
 * referință N/S/E/W. exifr returnează deja decimal degrees după conversie.
 *
 * Returnează `null` dacă fișierul nu are GPS sau parsing eșuează.
 */

/**
 * @param {File|Blob} file
 * @returns {Promise<{lat:number, lon:number, alt?:number, timestamp?:string}|null>}
 */
export async function extractGPSFromFile(file) {
  if (!file || !(file instanceof Blob)) return null;
  try {
    // Lazy import — evită bundle size penalty când nu e necesar
    const exifr = (await import("exifr")).default;
    // Doar tag-urile GPS — exifr v7 acceptă opțiuni pickTags
    const data = await exifr.parse(file, {
      gps: true,
      tiff: false,
      ifd0: false,
      exif: false,
      xmp: false,
      icc: false,
      pick: ["GPSLatitude", "GPSLongitude", "GPSAltitude", "DateTimeOriginal", "latitude", "longitude"],
    });
    if (!data) return null;

    // exifr expune `latitude`/`longitude` ca shortcut decimal
    const lat = typeof data.latitude === "number" ? data.latitude : null;
    const lon = typeof data.longitude === "number" ? data.longitude : null;
    if (lat == null || lon == null) return null;
    if (isNaN(lat) || isNaN(lon)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

    return {
      lat: parseFloat(lat.toFixed(5)),
      lon: parseFloat(lon.toFixed(5)),
      alt: typeof data.GPSAltitude === "number" ? Math.round(data.GPSAltitude) : null,
      timestamp: data.DateTimeOriginal ? new Date(data.DateTimeOriginal).toISOString() : null,
    };
  } catch (e) {
    // exifr aruncă pe fișiere fără EXIF / format necunoscut — tratăm ca lipsă GPS
    return null;
  }
}

/**
 * Verifică dacă o coordonată GPS este în România (cu margini ±0.5° pentru
 * cazuri border și off-shore Marea Neagră).
 */
export function isInRomania(lat, lon) {
  if (typeof lat !== "number" || typeof lon !== "number") return false;
  // Borderele administrative RO: 43.62-48.27 N, 20.27-29.69 E
  return lat >= 43.0 && lat <= 48.5 && lon >= 20.0 && lon <= 30.0;
}

/**
 * Calculează distanța haversine între 2 coordonate (m).
 */
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // m
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Găsește cea mai apropiată localitate din CLIMATE_DB față de o coordonată GPS dată.
 * Returnează entry-ul cu cea mai mică distanță haversine.
 */
export function findNearestLocality(lat, lon, climateDB) {
  if (!Array.isArray(climateDB) || climateDB.length === 0) return null;
  let best = null;
  let bestDist = Infinity;
  for (const c of climateDB) {
    if (typeof c.lat !== "number" || typeof c.lon !== "number") continue;
    const d = haversineMeters(lat, lon, c.lat, c.lon);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best ? { ...best, _distanceMeters: Math.round(bestDist) } : null;
}
