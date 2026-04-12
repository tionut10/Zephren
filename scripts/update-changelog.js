#!/usr/bin/env node
/**
 * scripts/update-changelog.js
 * Generează automat src/data/changelog.generated.js din istoricul git.
 * Grupare săptămânală · versionare semantică (0.x.y) · rulează la fiecare build.
 *
 * Logică semver:
 *   - săptămână cu feat/adaugă/implementez/modul nou → minor++ (0.x.0)
 *   - săptămână cu doar fix/chore/style              → patch++  (0.0.x)
 */

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../src/data/changelog.generated.js");
const PROJECT_START = new Date("2026-03-30");

// ── Culori ciclice pe săptămâni (cea mai recentă = galben) ──
const COLORS = ["#f59e0b", "#6366f1", "#10b981", "#22c55e", "#8b5cf6", "#f97316", "#06b6d4"];

// ── Icon din mesaj commit ────────────────────────────────────
function icon(msg) {
  const m = msg.toLowerCase();
  if (/feat|adaugă|add |nou |new |implementez|modul/.test(m))   return "✨";
  if (/monetizar|plan|preț|credit|lansare|pricing/.test(m))      return "💰";
  if (/catalog|produs|material|variante/.test(m))                return "📦";
  if (/cpe|docx|pdf|export|raport|template/.test(m))             return "📄";
  if (/import|xml|ifc|bim|ocr|upload/.test(m))                   return "📥";
  if (/audit|formular|checklist/.test(m))                        return "📋";
  if (/hartă|climă|climatic|localit/.test(m))                    return "🗺️";
  if (/3d|vizualiz|grafic|chart|svg|ui|header|design/.test(m))   return "🎨";
  if (/nzeb|bacs|sri|acm|en 15|normativ|mc 001/.test(m))         return "🔬";
  if (/test|e2e|vitest|playwright/.test(m))                      return "🧪";
  if (/refactor|split|json db|cod split/.test(m))                return "🔀";
  if (/fix|bug|eroare|repair|corect/.test(m))                    return "🔧";
  if (/perf|optim|cache|lazy|speed/.test(m))                     return "⚡";
  if (/deploy|vercel|build|ci/.test(m))                          return "🚀";
  if (/pwa|offline|service worker/.test(m))                      return "📶";
  return "🔸";
}

// ── Determină dacă un commit implică feature major ───────────
function isFeat(msg) {
  return /feat:|feature|adaugă|implementez|modul nou|v\d+\.\d+|landing|monetiz|catalog/i.test(msg);
}

// ── Luni (Monday) a săptămânii unui date string ──────────────
function monday(dateStr) {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ── Număr săptămână față de start proiect ───────────────────
function weekNum(mondayStr) {
  const startDay = PROJECT_START.getUTCDay();
  const diff = startDay === 0 ? -6 : 1 - startDay;
  const startMonday = new Date(PROJECT_START);
  startMonday.setUTCDate(startMonday.getUTCDate() + diff);
  const ms = new Date(mondayStr) - startMonday;
  return Math.floor(ms / (7 * 86400000)) + 1;
}

// ── Interval afișat ──────────────────────────────────────────
function dateRange(mondayStr) {
  const mo = ["ian","feb","mar","apr","mai","iun","iul","aug","sep","oct","nov","dec"];
  const d = new Date(mondayStr);
  const sun = new Date(d);
  sun.setUTCDate(sun.getUTCDate() + 6);
  const dm = d.getUTCDate(), ds = sun.getUTCDate();
  const mm = mo[d.getUTCMonth()], ms = mo[sun.getUTCMonth()];
  const yr = d.getUTCFullYear();
  return mm === ms
    ? `${dm} – ${ds} ${mm} ${yr}`
    : `${dm} ${mm} – ${ds} ${ms} ${yr}`;
}

// ── Curăță mesaj commit pentru afișare ──────────────────────
function clean(msg) {
  return msg
    .replace(/^(feat|fix|chore|style|docs|test|perf|refactor|config|build|ci):\s*/i, "")
    .replace(/^v\d+\.\d+[\w.]*\s*[—–\-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 110);
}

// ── Filtre mesaje banale ─────────────────────────────────────
const SKIP = /^(update readme|sync fișiere|sincronizare|nuke|revert all|force service|stop hook|config: push|alias|auto-select|effort)/i;

// ────────────────────────────────────────────────────────────
try {
  const raw = execSync(
    'git log --format="%ad|||%s" --date=short --no-merges',
    { encoding: "utf-8", cwd: join(__dirname, "..") }
  ).trim();

  // Grupare pe săptămâni
  const map = new Map(); // monday → [{msg}]
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const sep = line.indexOf("|||");
    const date = line.slice(0, sep).trim();
    const msg  = line.slice(sep + 3).trim();
    if (SKIP.test(msg)) continue;
    const key = monday(date);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(msg);
  }

  // Sortează săptămânile cronologic (oldest first) pentru calcul versiune
  const weeks = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  // Calculează semver progresiv
  let minor = 0, patch = 0;
  const versioned = weeks.map(([mon, commits]) => {
    const hasFeat = commits.some(isFeat);
    if (hasFeat) { minor++; patch = 0; }
    else          { patch++; }
    return { mon, version: `0.${minor}.${patch}`, commits };
  });

  // Newest first pentru afișare
  versioned.reverse();

  // Construiește CHANGELOG
  const changelog = versioned.map((w, i) => {
    const wn = weekNum(w.mon);
    const color = COLORS[i % COLORS.length];
    const label = i === 0 ? "CURENT" : i === versioned.length - 1 ? "LANSARE" : "";

    // Deduplicate + top 8 commits
    const seen = new Set();
    const items = w.commits
      .filter(m => { const k = m.slice(0, 50); if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 8)
      .map(m => ({ icon: icon(m), text: clean(m) }));

    return {
      version: w.version,
      week: `Săpt. ${wn}`,
      dateRange: dateRange(w.mon),
      color,
      label,
      items: items.length ? items : [{ icon: "🔸", text: "Actualizări minore" }],
    };
  });

  const output = `// GENERAT AUTOMAT — nu edita manual
// Script: scripts/update-changelog.js
// Ultima generare: ${new Date().toISOString().slice(0, 10)}

export const CHANGELOG = ${JSON.stringify(changelog, null, 2)};
`;

  writeFileSync(OUT, output, "utf-8");
  console.log(`✅ changelog.generated.js — ${changelog.length} săptămâni (v${changelog[0]?.version ?? "?"} curent)`);
} catch (e) {
  console.warn("⚠️  update-changelog.js:", e.message, "— se păstrează changelog anterior");
}
