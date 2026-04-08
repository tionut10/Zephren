/**
 * weather.js — Generare date meteorologice sintetice TMY
 * Sintetizează 8760 ore de temperatură și radiație solară
 * din medii lunare, folosind interpolare sinusoidală.
 */

export function generateTMY(tempMonth, lat) {
  if (!tempMonth || tempMonth.length < 12) return null;
  const monthDays = [31,28,31,30,31,30,31,31,30,31,30,31];
  const totalHours = 8760;
  const T_ext = new Array(totalHours);
  const Q_sol_horiz = new Array(totalHours);
  const absLat = Math.abs(lat || 45);
  const solarDecl = 23.45 * Math.PI / 180;

  let h = 0;
  for (let m = 0; m < 12; m++) {
    const days = monthDays[m];
    const tAvg = tempMonth[m];
    const dailyAmp = 4 + 2 * Math.cos((m - 6) * Math.PI / 6);
    const dayOfYear = monthDays.slice(0, m).reduce((s, d) => s + d, 0) + days / 2;
    const decl = solarDecl * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365);
    const latRad = absLat * Math.PI / 180;
    const maxAlt = Math.PI / 2 - latRad + decl;
    const peakIrr = Math.max(0, 1000 * Math.sin(maxAlt) * 0.7);

    for (let d = 0; d < days; d++) {
      for (let hr = 0; hr < 24; hr++) {
        T_ext[h] = tAvg + dailyAmp * Math.cos((hr - 15) * Math.PI / 12);
        const hourAngle = (hr - 12) * Math.PI / 12;
        const sinAlt = Math.max(0, Math.sin(maxAlt) * Math.cos(hourAngle));
        Q_sol_horiz[h] = sinAlt > 0.05 ? peakIrr * sinAlt * 0.001 : 0;
        h++;
      }
    }
  }
  return { T_ext, Q_sol_horiz };
}
