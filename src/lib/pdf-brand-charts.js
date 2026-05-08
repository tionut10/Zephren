/**
 * pdf-brand-charts.js — Chart helpers nativi pentru jsPDF (Sprint Visual-3)
 *
 * 8 mai 2026
 *
 * Implementare native (fără Chart.js / D3) folosind primitive jsPDF:
 *   • renderBarChart       — bar chart vertical/orizontal pentru consum,
 *                              pierderi, costuri per măsură
 *   • renderPieChart       — pie/donut chart pentru pierderi anvelopă
 *                              (perete/fereastră/planseu/ventilare/ACM)
 *   • renderLineChart      — line chart pentru NPV cumulativ 25 ani sau
 *                              evoluție EP în timp
 *   • renderTimelineChart  — timeline orizontal pentru foaie de parcurs
 *                              renovare etapizată (faze cu măsuri pe ani)
 *   • renderStackedBar     — stacked bar pentru break-down energie pe surse
 *
 * Toate folosesc paleta brand kit (PRIMARY verde + slate + warning + danger).
 * Output: chart-uri vector (path/rect/line/text) — NU rasterizate.
 */

import {
  BRAND_COLORS,
  ENERGY_CLASS_COLORS,
  FONT_SIZES,
  STROKE_WIDTH,
  setBrandColor,
  formatRomanianNumber,
} from "./pdf-brand-kit.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. BAR CHART (vertical sau orizontal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bar chart vertical sau orizontal cu axă valori + etichete + grid lines.
 *
 * @param {jsPDF} doc
 * @param {number} x — colț stânga-sus (mm)
 * @param {number} y — colț stânga-sus (mm)
 * @param {number} width — lățime totală (inclusiv axe)
 * @param {number} height — înălțime totală
 * @param {object} options
 * @param {Array<{label:string, value:number, color?:[number,number,number]}>} options.data
 * @param {string} [options.title] — titlu deasupra chart-ului
 * @param {string} [options.unit] — unitate (ex: "kWh/an")
 * @param {"vertical"|"horizontal"} [options.orientation="vertical"]
 * @param {[number,number,number]} [options.defaultColor] — culoare default bare (PRIMARY)
 * @param {number} [options.maxValue] — override scale max (auto-fit if omitted)
 * @param {boolean} [options.showValues=true] — afișează valorile pe bare
 * @param {boolean} [options.showGrid=true] — grid lines
 */
export function renderBarChart(doc, x, y, width, height, options = {}) {
  const {
    data = [],
    title,
    unit,
    orientation = "vertical",
    defaultColor = BRAND_COLORS.PRIMARY,
    maxValue,
    showValues = true,
    showGrid = true,
  } = options;

  if (data.length === 0) return;

  // Padding pentru axe + titlu
  const padTop = title ? 8 : 4;
  const padBottom = orientation === "vertical" ? 12 : 4;
  const padLeft = orientation === "vertical" ? 12 : 35;
  const padRight = 4;

  const chartX = x + padLeft;
  const chartY = y + padTop;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Calcul max value
  const values = data.map(d => Number(d.value) || 0);
  const max = maxValue || Math.max(...values, 1);
  const niceMax = niceCeiling(max);

  // Titlu
  if (title) {
    doc.setFont(undefined, "bold");
    doc.setFontSize(FONT_SIZES.H3);
    setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
    doc.text(String(title), x + width / 2, y + 4, { align: "center" });
  }

  // Grid lines + axă
  if (showGrid) {
    setBrandColor(doc, BRAND_COLORS.SLATE_200, "draw");
    doc.setLineWidth(STROKE_WIDTH.HAIRLINE);
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      if (orientation === "vertical") {
        const ty = chartY + chartH - (chartH * i) / ticks;
        doc.line(chartX, ty, chartX + chartW, ty);
        // Labels
        doc.setFont(undefined, "normal");
        doc.setFontSize(FONT_SIZES.FOOTER);
        setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
        const tickValue = (niceMax * i) / ticks;
        doc.text(
          formatRomanianNumber(tickValue, tickValue > 100 ? 0 : 1),
          chartX - 1,
          ty + 1,
          { align: "right" },
        );
      } else {
        const tx = chartX + (chartW * i) / ticks;
        doc.line(tx, chartY, tx, chartY + chartH);
        // Labels jos
        doc.setFont(undefined, "normal");
        doc.setFontSize(FONT_SIZES.FOOTER);
        setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
        const tickValue = (niceMax * i) / ticks;
        doc.text(
          formatRomanianNumber(tickValue, tickValue > 100 ? 0 : 1),
          tx,
          chartY + chartH + 3,
          { align: "center" },
        );
      }
    }
  }

  // Bare
  const barCount = data.length;
  const barGap = 2;
  if (orientation === "vertical") {
    const barWidth = (chartW - barGap * (barCount - 1)) / barCount;
    data.forEach((d, i) => {
      const v = Number(d.value) || 0;
      const barH = (v / niceMax) * chartH;
      const bx = chartX + i * (barWidth + barGap);
      const by = chartY + chartH - barH;

      const color = d.color || defaultColor;
      setBrandColor(doc, color, "fill");
      doc.rect(bx, by, barWidth, barH, "F");

      // Valoare deasupra
      if (showValues && v > 0) {
        doc.setFont(undefined, "bold");
        doc.setFontSize(FONT_SIZES.FOOTER);
        setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
        doc.text(
          formatRomanianNumber(v, v > 100 ? 0 : 1),
          bx + barWidth / 2,
          by - 1,
          { align: "center" },
        );
      }

      // Label dedesubt (rotit dacă lung)
      doc.setFont(undefined, "normal");
      doc.setFontSize(FONT_SIZES.FOOTER);
      setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
      const lbl = String(d.label || "");
      const lblShort = lbl.length > 12 ? lbl.slice(0, 11) + "…" : lbl;
      doc.text(lblShort, bx + barWidth / 2, chartY + chartH + 4, { align: "center" });
    });
  } else {
    // Orizontal
    const barHeight = (chartH - barGap * (barCount - 1)) / barCount;
    data.forEach((d, i) => {
      const v = Number(d.value) || 0;
      const barW = (v / niceMax) * chartW;
      const bx = chartX;
      const by = chartY + i * (barHeight + barGap);

      const color = d.color || defaultColor;
      setBrandColor(doc, color, "fill");
      doc.rect(bx, by, barW, barHeight, "F");

      // Valoare la capăt
      if (showValues && v > 0) {
        doc.setFont(undefined, "bold");
        doc.setFontSize(FONT_SIZES.FOOTER);
        setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
        doc.text(
          formatRomanianNumber(v, v > 100 ? 0 : 1),
          bx + barW + 1,
          by + barHeight / 2 + 1,
        );
      }

      // Label stânga
      doc.setFont(undefined, "normal");
      doc.setFontSize(FONT_SIZES.FOOTER);
      setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
      const lbl = String(d.label || "");
      const lblShort = lbl.length > 16 ? lbl.slice(0, 15) + "…" : lbl;
      doc.text(lblShort, chartX - 1, by + barHeight / 2 + 1, { align: "right" });
    });
  }

  // Unit (axe label)
  if (unit) {
    doc.setFont(undefined, "italic");
    doc.setFontSize(FONT_SIZES.FOOTER);
    setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
    if (orientation === "vertical") {
      doc.text(unit, chartX, y + padTop - 1);
    } else {
      doc.text(unit, x + width - padRight, chartY + chartH + 6, { align: "right" });
    }
  }

  // Reset
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
  setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
  doc.setLineWidth(STROKE_WIDTH.THIN);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PIE / DONUT CHART
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pie chart sau donut chart cu segmente colorate + legendă.
 *
 * jsPDF nu are primitive arc nativ pentru filled sectors, dar avem doc.lines()
 * cu `closed=true`. Aproximăm fiecare segment prin polilinii cu n=24 puncte.
 *
 * @param {jsPDF} doc
 * @param {number} x — centrul X
 * @param {number} y — centrul Y
 * @param {number} radius — rază exterior (mm)
 * @param {object} options
 * @param {Array<{label:string, value:number, color?:[number,number,number]}>} options.data
 * @param {string} [options.title]
 * @param {boolean} [options.donut=true] — desenează donut (cu hole interior)
 * @param {number} [options.innerRadiusRatio=0.5] — pentru donut (0..1)
 * @param {boolean} [options.showLegend=true]
 * @param {boolean} [options.showPercentages=true]
 */
export function renderPieChart(doc, x, y, radius, options = {}) {
  const {
    data = [],
    title,
    donut = true,
    innerRadiusRatio = 0.55,
    showLegend = true,
    showPercentages = true,
  } = options;

  if (data.length === 0) return;

  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  if (total <= 0) return;

  const SEGMENTS = 48; // discretizare pentru fiecare cerc complet
  const TWO_PI = Math.PI * 2;

  // Titlu deasupra
  if (title) {
    doc.setFont(undefined, "bold");
    doc.setFontSize(FONT_SIZES.H3);
    setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
    doc.text(String(title), x, y - radius - 4, { align: "center" });
  }

  // Construire segmente
  let cumAngle = -Math.PI / 2; // start sus
  const segments = [];
  data.forEach((d, i) => {
    const v = Number(d.value) || 0;
    const angle = (v / total) * TWO_PI;
    const startA = cumAngle;
    const endA = cumAngle + angle;
    const color = d.color || segmentColorByIndex(i);
    segments.push({ startA, endA, color, value: v, label: d.label || "—", pct: (v / total) * 100 });
    cumAngle = endA;
  });

  // Desenare fiecare segment ca poligon (24 puncte arc + center sau inner)
  segments.forEach(seg => {
    const arcSpan = seg.endA - seg.startA;
    const numSegPts = Math.max(2, Math.ceil((arcSpan / TWO_PI) * SEGMENTS));
    const points = [];

    if (donut) {
      // Outer arc (forward)
      for (let i = 0; i <= numSegPts; i++) {
        const a = seg.startA + (arcSpan * i) / numSegPts;
        points.push([x + Math.cos(a) * radius, y + Math.sin(a) * radius]);
      }
      // Inner arc (reverse)
      const innerR = radius * innerRadiusRatio;
      for (let i = numSegPts; i >= 0; i--) {
        const a = seg.startA + (arcSpan * i) / numSegPts;
        points.push([x + Math.cos(a) * innerR, y + Math.sin(a) * innerR]);
      }
    } else {
      // Pie cu center
      points.push([x, y]);
      for (let i = 0; i <= numSegPts; i++) {
        const a = seg.startA + (arcSpan * i) / numSegPts;
        points.push([x + Math.cos(a) * radius, y + Math.sin(a) * radius]);
      }
    }

    // Build path manual (jsPDF lines cu deltas)
    setBrandColor(doc, seg.color, "fill");
    setBrandColor(doc, BRAND_COLORS.WHITE, "draw");
    doc.setLineWidth(STROKE_WIDTH.HAIRLINE);

    if (points.length > 0) {
      const start = points[0];
      const lines = [];
      for (let i = 1; i < points.length; i++) {
        lines.push([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]]);
      }
      doc.lines(lines, start[0], start[1], [1, 1], "F", true);
    }

    // Procentaj pe segment (doar dacă > 5%)
    if (showPercentages && seg.pct > 5) {
      const midA = (seg.startA + seg.endA) / 2;
      const labelR = donut ? radius * (1 + innerRadiusRatio) / 2 : radius * 0.6;
      const lx = x + Math.cos(midA) * labelR;
      const ly = y + Math.sin(midA) * labelR;
      doc.setFont(undefined, "bold");
      doc.setFontSize(FONT_SIZES.FOOTER);
      // Text alb pentru contrast (segmentele sunt colorate)
      setBrandColor(doc, BRAND_COLORS.WHITE, "text");
      doc.text(`${seg.pct.toFixed(0)}%`, lx, ly + 1, { align: "center" });
    }
  });

  // Legendă lateral dreapta
  if (showLegend) {
    const legendX = x + radius + 6;
    let legendY = y - radius;
    doc.setFont(undefined, "normal");
    doc.setFontSize(FONT_SIZES.FOOTER);
    segments.forEach(seg => {
      // Square color
      setBrandColor(doc, seg.color, "fill");
      doc.rect(legendX, legendY - 2, 3, 3, "F");
      // Label + procentaj
      setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
      doc.text(`${seg.label} (${seg.pct.toFixed(1)}%)`, legendX + 5, legendY + 0.5);
      legendY += 4.5;
    });
  }

  // Reset
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
  setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
  doc.setLineWidth(STROKE_WIDTH.THIN);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LINE CHART
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Line chart cu 1-3 serii pentru NPV cumulativ, evoluție EP, etc.
 *
 * @param {jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {object} options
 * @param {Array<string|number>} options.xLabels — etichete axă X (ex: ani 0-25)
 * @param {Array<{label:string, data:Array<number>, color?:[number,number,number]}>} options.series
 * @param {string} [options.title]
 * @param {string} [options.yUnit]
 * @param {number} [options.threshold] — linie horizontală referință (ex: 0 pentru break-even)
 * @param {string} [options.thresholdLabel]
 */
export function renderLineChart(doc, x, y, width, height, options = {}) {
  const {
    xLabels = [],
    series = [],
    title,
    yUnit,
    threshold,
    thresholdLabel,
  } = options;

  if (series.length === 0 || xLabels.length === 0) return;

  const padTop = title ? 8 : 4;
  const padBottom = 10;
  const padLeft = 14;
  const padRight = series.length > 1 ? 25 : 4;

  const chartX = x + padLeft;
  const chartY = y + padTop;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Calcul min/max global
  const allValues = series.flatMap(s => s.data || []);
  const dataMin = Math.min(...allValues, 0);
  const dataMax = Math.max(...allValues, 0);
  const range = dataMax - dataMin || 1;
  // Padding 10% sus/jos
  const yMin = dataMin - range * 0.1;
  const yMax = dataMax + range * 0.1;

  // Titlu
  if (title) {
    doc.setFont(undefined, "bold");
    doc.setFontSize(FONT_SIZES.H3);
    setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
    doc.text(String(title), x + width / 2, y + 4, { align: "center" });
  }

  // Grid + axe
  setBrandColor(doc, BRAND_COLORS.SLATE_200, "draw");
  doc.setLineWidth(STROKE_WIDTH.HAIRLINE);
  const ticksY = 5;
  for (let i = 0; i <= ticksY; i++) {
    const ty = chartY + chartH - (chartH * i) / ticksY;
    doc.line(chartX, ty, chartX + chartW, ty);
    const tickValue = yMin + ((yMax - yMin) * i) / ticksY;
    doc.setFont(undefined, "normal");
    doc.setFontSize(FONT_SIZES.FOOTER);
    setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
    doc.text(
      formatRomanianNumber(tickValue, Math.abs(tickValue) > 100 ? 0 : 1),
      chartX - 1,
      ty + 1,
      { align: "right" },
    );
  }

  // X labels
  doc.setFont(undefined, "normal");
  doc.setFontSize(FONT_SIZES.FOOTER);
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  const xStep = chartW / Math.max(1, xLabels.length - 1);
  // Afișează doar fiecare a N-a etichetă pentru lizibilitate
  const xLabelStep = Math.max(1, Math.floor(xLabels.length / 6));
  xLabels.forEach((lbl, i) => {
    if (i % xLabelStep !== 0 && i !== xLabels.length - 1) return;
    const tx = chartX + i * xStep;
    doc.text(String(lbl), tx, chartY + chartH + 4, { align: "center" });
  });

  // Linie threshold (horizontală)
  if (Number.isFinite(threshold)) {
    const ty = chartY + chartH - ((threshold - yMin) / (yMax - yMin)) * chartH;
    setBrandColor(doc, BRAND_COLORS.WARNING, "draw");
    doc.setLineWidth(STROKE_WIDTH.THIN);
    doc.setLineDashPattern([1.5, 1], 0);
    doc.line(chartX, ty, chartX + chartW, ty);
    doc.setLineDashPattern([], 0);
    if (thresholdLabel) {
      doc.setFont(undefined, "italic");
      doc.setFontSize(FONT_SIZES.FOOTER);
      setBrandColor(doc, BRAND_COLORS.WARNING, "text");
      doc.text(thresholdLabel, chartX + chartW - 2, ty - 1, { align: "right" });
    }
  }

  // Serii
  const SERIES_COLORS = [BRAND_COLORS.PRIMARY, BRAND_COLORS.INFO, BRAND_COLORS.WARNING];
  series.forEach((s, sIdx) => {
    const color = s.color || SERIES_COLORS[sIdx % SERIES_COLORS.length];
    setBrandColor(doc, color, "draw");
    doc.setLineWidth(STROKE_WIDTH.MEDIUM);

    const points = s.data.map((v, i) => ({
      x: chartX + i * xStep,
      y: chartY + chartH - ((v - yMin) / (yMax - yMin)) * chartH,
    }));

    // Linii
    for (let i = 1; i < points.length; i++) {
      doc.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
    }

    // Markeri (cerculețe la punctele cheie — primul, ultimul, threshold crossings)
    setBrandColor(doc, color, "fill");
    if (points.length > 0) {
      doc.circle(points[0].x, points[0].y, 0.8, "F");
      doc.circle(points[points.length - 1].x, points[points.length - 1].y, 0.8, "F");
    }
  });

  // Legendă (dreapta)
  if (series.length > 1) {
    let legendY = chartY + 2;
    doc.setFont(undefined, "normal");
    doc.setFontSize(FONT_SIZES.FOOTER);
    series.forEach((s, sIdx) => {
      const color = s.color || SERIES_COLORS[sIdx % SERIES_COLORS.length];
      setBrandColor(doc, color, "fill");
      doc.rect(chartX + chartW + 2, legendY - 1.5, 3, 1.5, "F");
      setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
      doc.text(s.label || `Serie ${sIdx + 1}`, chartX + chartW + 6, legendY);
      legendY += 4;
    });
  }

  // Y unit
  if (yUnit) {
    doc.setFont(undefined, "italic");
    doc.setFontSize(FONT_SIZES.FOOTER);
    setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
    doc.text(yUnit, chartX, y + padTop - 1);
  }

  // Reset
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
  setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
  doc.setLineWidth(STROKE_WIDTH.THIN);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TIMELINE CHART (foaie de parcurs renovare etapizată)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Timeline orizontal cu faze de renovare distribuite pe ani.
 *
 * @param {jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {object} options
 * @param {Array<{label:string, startYear:number, endYear:number, measures?:Array<string>, color?:[number,number,number]}>} options.phases
 * @param {number} options.yearStart — ex: 2026
 * @param {number} options.yearEnd — ex: 2050
 * @param {string} [options.title]
 * @param {Array<{year:number, label:string}>} [options.milestones] — ex: 2030 MEPS C, 2033 MEPS B, 2050 nZEB
 */
export function renderTimelineChart(doc, x, y, width, height, options = {}) {
  const {
    phases = [],
    yearStart = 2026,
    yearEnd = 2050,
    title,
    milestones = [],
  } = options;

  const padTop = title ? 8 : 4;
  const padBottom = 12;
  const padLeft = 4;
  const padRight = 4;

  const chartX = x + padLeft;
  const chartY = y + padTop;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const totalYears = yearEnd - yearStart;
  const yearWidth = chartW / Math.max(1, totalYears);

  // Titlu
  if (title) {
    doc.setFont(undefined, "bold");
    doc.setFontSize(FONT_SIZES.H3);
    setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
    doc.text(String(title), x + width / 2, y + 4, { align: "center" });
  }

  // Axă timeline (linie orizontală cu marker-i la fiecare 5 ani)
  setBrandColor(doc, BRAND_COLORS.SLATE_400, "draw");
  doc.setLineWidth(STROKE_WIDTH.THIN);
  const axisY = chartY + chartH;
  doc.line(chartX, axisY, chartX + chartW, axisY);

  doc.setFont(undefined, "normal");
  doc.setFontSize(FONT_SIZES.FOOTER);
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  for (let yr = yearStart; yr <= yearEnd; yr += 1) {
    const tx = chartX + (yr - yearStart) * yearWidth;
    if ((yr - yearStart) % 5 === 0) {
      // Major tick
      doc.line(tx, axisY, tx, axisY + 2);
      doc.text(String(yr), tx, axisY + 6, { align: "center" });
    } else {
      // Minor tick
      setBrandColor(doc, BRAND_COLORS.SLATE_200, "draw");
      doc.line(tx, axisY, tx, axisY + 1);
      setBrandColor(doc, BRAND_COLORS.SLATE_400, "draw");
    }
  }

  // Faze ca bare orizontale
  const phaseHeight = Math.min(8, (chartH - 2) / Math.max(1, phases.length));
  phases.forEach((phase, i) => {
    const startX = chartX + (phase.startYear - yearStart) * yearWidth;
    const endX = chartX + (phase.endYear - yearStart) * yearWidth;
    const py = chartY + i * (phaseHeight + 1);
    const color = phase.color || phaseColorByIndex(i);

    // Bară colorată
    setBrandColor(doc, color, "fill");
    doc.roundedRect(startX, py, endX - startX, phaseHeight, 1, 1, "F");

    // Label fază în interior (dacă încape)
    const labelText = String(phase.label || `Faza ${i + 1}`);
    doc.setFont(undefined, "bold");
    doc.setFontSize(FONT_SIZES.FOOTER);
    setBrandColor(doc, BRAND_COLORS.WHITE, "text");
    if ((endX - startX) > 30) {
      doc.text(labelText, startX + 2, py + phaseHeight / 2 + 1);
    } else {
      // Label exterior dreapta
      setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
      doc.text(labelText, endX + 2, py + phaseHeight / 2 + 1);
    }
  });

  // Milestone-uri (linii verticale + label deasupra)
  milestones.forEach(ms => {
    const mx = chartX + (ms.year - yearStart) * yearWidth;
    setBrandColor(doc, BRAND_COLORS.DANGER, "draw");
    doc.setLineWidth(STROKE_WIDTH.MEDIUM);
    doc.setLineDashPattern([1.5, 1], 0);
    doc.line(mx, chartY, mx, axisY);
    doc.setLineDashPattern([], 0);

    doc.setFont(undefined, "bold");
    doc.setFontSize(FONT_SIZES.FOOTER);
    setBrandColor(doc, BRAND_COLORS.DANGER, "text");
    doc.text(String(ms.label || ms.year), mx, chartY - 1, { align: "center" });
  });

  // Reset
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
  setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
  doc.setLineWidth(STROKE_WIDTH.THIN);
  doc.setLineDashPattern([], 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Round value up to a nice axis ceiling (ex: 781 → 1000, 152 → 200).
 */
function niceCeiling(v) {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const mag = Math.pow(10, exp);
  const norm = v / mag;
  let nice;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * mag;
}

/**
 * Culoare default pentru segment pie/timeline după index (cycling).
 */
function segmentColorByIndex(i) {
  const palette = [
    BRAND_COLORS.PRIMARY,        // verde Zephren
    BRAND_COLORS.INFO,           // albastru
    BRAND_COLORS.WARNING,        // amber
    BRAND_COLORS.DANGER,         // roșu
    BRAND_COLORS.PRIMARY_LIGHT,  // verde deschis
    BRAND_COLORS.SLATE_500,      // gri închis
    [139, 92, 246],              // violet
    [244, 114, 182],             // pink
  ];
  return palette[i % palette.length];
}

function phaseColorByIndex(i) {
  const palette = [
    BRAND_COLORS.PRIMARY,        // Faza 1 verde primary
    BRAND_COLORS.INFO,           // Faza 2 albastru
    BRAND_COLORS.PRIMARY_LIGHT,  // Faza 3 verde deschis
    BRAND_COLORS.WARNING,        // Faza 4 amber
    BRAND_COLORS.SLATE_700,      // Faza 5+ slate
  ];
  return palette[i % palette.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT DEFAULT
// ─────────────────────────────────────────────────────────────────────────────

export default {
  renderBarChart,
  renderPieChart,
  renderLineChart,
  renderTimelineChart,
};
