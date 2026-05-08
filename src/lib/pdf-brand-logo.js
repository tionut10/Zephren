/**
 * pdf-brand-logo.js — Logo Zephren rendering pentru jsPDF
 *
 * Sprint Visual-1 (8 mai 2026)
 *
 * Re-implementare vector a logo.svg (public/logo.svg) folosind primitivele
 * jsPDF: rect, polygon, text, line. Acest approach evită embed PNG/raster
 * care ar mări dimensiunea PDF-ului fără beneficii vizuale.
 *
 * Logo conține:
 *   - Casă cu acoperiș + perete + podea (slate-400 #94A3B8)
 *   - Coș (slate-400 #94A3B8)
 *   - 7 trapeze scala A-G colorate (UE standard)
 *   - Text "Zephren" cu Z verde (#007A3D) + restul slate-200 (#E2E8F0)
 *   - Linie separator + tagline "Energy Performance Calculator"
 *
 * Variante de redare:
 *   - "full":     logo complet 30×35mm (cover page)
 *   - "compact":  doar text "Zephren" + tagline 30×8mm (header repetat)
 *   - "icon":     doar casa + scala A-G 12×14mm (favicon-style)
 */

import { BRAND_COLORS, ENERGY_CLASS_COLORS } from "./pdf-brand-kit.js";

/**
 * Desenează logo Zephren COMPLET (casa + scala + text + tagline).
 *
 * Dimensiune nativă: 30mm lățime × 35mm înălțime.
 * Scalare: parametrul `width` (default 30) — înălțimea se ajustează proporțional (raport 30:35 = 0.857).
 *
 * @param {jsPDF} doc
 * @param {number} x — poziție X (mm)
 * @param {number} y — poziție Y (mm)
 * @param {number} [width=30] — lățime totală (mm)
 */
export function drawZephrenLogoFull(doc, x, y, width = 30) {
  // Raport SVG original: viewBox 500×580 → 30×34.8mm
  const scale = width / 30;
  const w = width;
  const h = 34.8 * scale;

  // ── Coș (rect)
  doc.setFillColor(...BRAND_COLORS.SLATE_400);
  doc.rect(x + 19.92 * scale, y + 4.44 * scale, 2.16 * scale, 5.40 * scale, "F");

  // ── Acoperiș (polilinie deschisă, 2 segmente formează V inversat)
  doc.setDrawColor(...BRAND_COLORS.SLATE_400);
  doc.setLineWidth(0.84 * scale);
  doc.setLineCap("butt");
  doc.setLineJoin("miter");
  // 50,205 → 250,50 → 450,205 (px) = 3,12.3 → 15,3 → 27,12.3 (mm la scale=1)
  doc.line(x + 3.0 * scale, y + 12.30 * scale, x + 15.0 * scale, y + 3.00 * scale);
  doc.line(x + 15.0 * scale, y + 3.00 * scale, x + 27.0 * scale, y + 12.30 * scale);

  // ── Perete stâng
  doc.setFillColor(...BRAND_COLORS.SLATE_400);
  doc.rect(x + 3.0 * scale, y + 12.30 * scale, 0.84 * scale, 14.46 * scale, "F");

  // ── Podea
  doc.rect(x + 3.0 * scale, y + 26.76 * scale, 24.0 * scale, 0.84 * scale, "F");

  // ── Scala A-G — 7 bare colorate (folosim ENERGY_CLASS_COLORS)
  // Coordonate aproximative bazate pe SVG original (toate la scale=1):
  //   Bara A+: y=12.30, lățime ~7.86
  //   Bara A:  y=14.10, lățime ~9.18
  //   Bara B:  y=15.90, lățime ~11.16
  //   Bara C:  y=17.70, lățime ~13.14
  //   Bara D:  y=19.50, lățime ~15.12
  //   Bara E:  y=21.30, lățime ~17.10
  //   Bara F:  y=23.10, lățime ~19.08
  //   Bara G:  y=24.90, lățime ~21.06
  const bars = [
    { y: 12.30, w: 7.86,  cls: "A+" },
    { y: 14.10, w: 9.18,  cls: "A"  },
    { y: 15.90, w: 11.16, cls: "B"  },
    { y: 17.70, w: 13.14, cls: "C"  },
    { y: 19.50, w: 15.12, cls: "D"  },
    { y: 21.30, w: 17.10, cls: "E"  },
    { y: 23.10, w: 19.08, cls: "F"  },
    { y: 24.90, w: 21.06, cls: "G"  },
  ];
  bars.forEach(b => {
    const [r, g, bl] = ENERGY_CLASS_COLORS[b.cls] || [128, 128, 128];
    doc.setFillColor(r, g, bl);
    doc.rect(x + 3.84 * scale, y + b.y * scale, b.w * scale, 1.50 * scale, "F");
  });

  // ── Text "Zephren" sub casă (la 30.9mm scale=1, deci offset y)
  // Z verde + ephren slate
  doc.setFont(undefined, "bold");
  doc.setFontSize(16 * scale);
  // Calculăm centrare manual: textWidth aproximativ 22mm pentru "Zephren" 16pt
  const cx = x + w / 2;
  // Litera Z (verde) — desenată separat la stânga
  const ZWidth = doc.getTextWidth("Z") || (4 * scale);
  const restText = "ephren";
  const restWidth = doc.getTextWidth(restText) || (15 * scale);
  const totalW = ZWidth + restWidth;
  const startX = cx - totalW / 2;
  doc.setTextColor(...BRAND_COLORS.PRIMARY); // #007A3D
  doc.text("Z", startX, y + 30.9 * scale);
  doc.setTextColor(...BRAND_COLORS.SLATE_500); // mai vizibil decât E2E8F0 pe alb
  doc.text(restText, startX + ZWidth, y + 30.9 * scale);

  // ── Linie separator
  doc.setDrawColor(...BRAND_COLORS.SLATE_400);
  doc.setLineWidth(0.1);
  doc.line(x + 7.2 * scale, y + 31.8 * scale, x + 22.8 * scale, y + 31.8 * scale);

  // ── Tagline
  doc.setFont(undefined, "normal");
  doc.setFontSize(5 * scale);
  doc.setTextColor(...BRAND_COLORS.SLATE_500);
  doc.text("Energy Performance Calculator", cx, y + 33.6 * scale, { align: "center" });

  // Reset
  doc.setTextColor(...BRAND_COLORS.BLACK);
  doc.setDrawColor(...BRAND_COLORS.BLACK);
  doc.setLineWidth(0.2);
}

/**
 * Desenează logo COMPACT (doar wordmark "Zephren" + Z verde, fără casă).
 *
 * Dimensiune: ~30×6mm — pentru header repetat pe pagini.
 *
 * @param {jsPDF} doc
 * @param {number} x — poziție X (mm)
 * @param {number} y — poziție Y (mm)
 * @param {number} [width=30] — lățime totală (mm)
 */
export function drawZephrenLogoCompact(doc, x, y, width = 30) {
  const scale = width / 30;
  const cx = x + width / 2;
  const baselineY = y + 4.5 * scale;

  doc.setFont(undefined, "bold");
  doc.setFontSize(13 * scale);

  const ZWidth = doc.getTextWidth("Z") || (3.5 * scale);
  const restWidth = doc.getTextWidth("ephren") || (13 * scale);
  const totalW = ZWidth + restWidth;
  const startX = cx - totalW / 2;

  doc.setTextColor(...BRAND_COLORS.PRIMARY);
  doc.text("Z", startX, baselineY);
  doc.setTextColor(...BRAND_COLORS.SLATE_700);
  doc.text("ephren", startX + ZWidth, baselineY);

  // Tagline mic dedesubt (opțional — doar dacă width >= 25mm)
  if (width >= 25) {
    doc.setFont(undefined, "normal");
    doc.setFontSize(4 * scale);
    doc.setTextColor(...BRAND_COLORS.SLATE_500);
    doc.text("Energy Performance Calculator", cx, baselineY + 2.5 * scale, { align: "center" });
  }

  // Reset
  doc.setTextColor(...BRAND_COLORS.BLACK);
}

/**
 * Desenează logo ICON (doar casa + scala A-G fără text).
 *
 * Dimensiune: 12×14mm — pentru badge-uri, footer, semnături.
 *
 * @param {jsPDF} doc
 * @param {number} x — poziție X (mm)
 * @param {number} y — poziție Y (mm)
 * @param {number} [width=12] — lățime totală (mm)
 */
export function drawZephrenLogoIcon(doc, x, y, width = 12) {
  const scale = width / 30; // raport mai mic vs full

  // Casa — simplificată
  doc.setDrawColor(...BRAND_COLORS.SLATE_400);
  doc.setLineWidth(0.5 * scale);
  doc.line(x + 3.0 * scale, y + 12.30 * scale, x + 15.0 * scale, y + 3.00 * scale);
  doc.line(x + 15.0 * scale, y + 3.00 * scale, x + 27.0 * scale, y + 12.30 * scale);
  doc.setFillColor(...BRAND_COLORS.SLATE_400);
  doc.rect(x + 3.0 * scale, y + 12.30 * scale, 0.84 * scale, 14.46 * scale, "F");
  doc.rect(x + 3.0 * scale, y + 26.76 * scale, 24.0 * scale, 0.84 * scale, "F");

  // Scala A-G — folosim doar 4 bare reprezentative (A, C, E, G)
  const iconBars = [
    { y: 14.10, w: 9.18,  cls: "A"  },
    { y: 17.70, w: 13.14, cls: "C"  },
    { y: 21.30, w: 17.10, cls: "E"  },
    { y: 24.90, w: 21.06, cls: "G"  },
  ];
  iconBars.forEach(b => {
    const [r, g, bl] = ENERGY_CLASS_COLORS[b.cls] || [128, 128, 128];
    doc.setFillColor(r, g, bl);
    doc.rect(x + 3.84 * scale, y + b.y * scale, b.w * scale, 1.50 * scale, "F");
  });

  // Reset
  doc.setDrawColor(...BRAND_COLORS.BLACK);
  doc.setLineWidth(0.2);
}

/**
 * Helper unic — alege variantă logo după dimensiune disponibilă.
 *
 * @param {jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {"full"|"compact"|"icon"|"auto"} [variant="auto"]
 */
export function drawZephrenLogo(doc, x, y, width, variant = "auto") {
  if (variant === "auto") {
    if (width >= 25) variant = "full";
    else if (width >= 12) variant = "compact";
    else variant = "icon";
  }
  if (variant === "full") return drawZephrenLogoFull(doc, x, y, width);
  if (variant === "compact") return drawZephrenLogoCompact(doc, x, y, width);
  return drawZephrenLogoIcon(doc, x, y, width);
}

export default {
  drawZephrenLogo,
  drawZephrenLogoFull,
  drawZephrenLogoCompact,
  drawZephrenLogoIcon,
};
