#!/usr/bin/env node
/**
 * Sprint Filtru epocă — adaugă câmpul `vintage` (epoci constructive) per intrare.
 *
 * Categorii vintage (epoci) folosite în RO:
 *   - "pre-1950"     — case rurale tradiționale, vernacular RO, monumente
 *   - "1950-1989"    — IPCT prefabricate ('60-'80), blocuri panouri, ceausiste
 *   - "1990-2010"    — clădiri post-decembriste, retrofit ETICS prim val
 *   - "post-2010"    — clădiri moderne, izolație continuă, sticlă low-e
 *   - "passivhaus"   — Passivhaus / nZEB / EnerPHit (nou sau retrofit)
 *
 * O intrare poate avea multiple epoci aplicabile (ex: "Cornișă cu ETICS" e
 * relevantă atât pentru retrofit anii '90 cât și pentru clădiri post-2010).
 *
 * Heuristică:
 *   - cat sau name conține "Tradițional RO", "vernacular", "case rurale" → pre-1950
 *   - cat sau name conține "IPCT", "panou prefabricat", "blocuri vechi", "BCA", "C107" → 1950-1989
 *   - cat sau name conține "ETICS", "WDVS", "post-2000" → 1990-2010 + post-2010
 *   - cat sau name conține "Passivhaus", "nZEB", "PHI", "CLT", "timber frame" → passivhaus
 *   - psi mare (>0.5) fără context modern → 1950-1989 (probabil bloc nereabilitat)
 *   - psi mic (<0.10) cu remarcă "izolat continuu" → post-2010 / passivhaus
 *   - default: toate epocile (intrarea e generică)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'src', 'data', 'thermal-bridges.json');

const VINTAGES_ALL = ["pre-1950", "1950-1989", "1990-2010", "post-2010", "passivhaus"];

function inferVintages(entry) {
  const c = (entry.cat || '').toLowerCase();
  const n = (entry.name || '').toLowerCase();
  const d = (entry.detail || '').toLowerCase();
  const t = `${c} ${n} ${d}`;
  const psi = Number(entry.psi);
  const out = new Set();

  // Match-uri explicite per categorie
  if (/tradițional|vernacular|case rurale|chirpici|paiantă|cosoroabă|wallplate|piatră|fundație de piatră|monument istoric/.test(t)) {
    out.add('pre-1950');
  }

  if (/ipct|panou prefabricat|prefabricate|panou mare|t 770|t 1340|panou bloc|bloc vechi|bloc nereabilitat|c107\/[34]|stas 6647|cocaresc|epoca comunist|housing block|sandwich beton|bca/.test(t)) {
    out.add('1950-1989');
  }

  if (/etics|wdvs|reabilitare|retrofit|izolat post|sistem termoizolant|izolație post-construcție|fațadă post/.test(t)) {
    out.add('1990-2010');
    out.add('post-2010');
  }

  if (/passivhaus|nzeb|nzb|phi|enerphit|certificat passive|cls a Passivhaus|kxt|ruptor termic certificat|ancoraj termorupt|halfen hit|isokorb|leviat|schöck|schock/i.test(t)) {
    out.add('passivhaus');
    out.add('post-2010');
  }

  if (/clt|timber frame|cadru lemn|sandwich termoizolant|sip|cortină|curtain wall|mullion|spandrel|bipv/.test(t)) {
    out.add('post-2010');
    if (/passivhaus|certificat phi|detaliu phi|nzeb/.test(t)) out.add('passivhaus');
  }

  if (/post-2010|2020|2024|modern|contemporan|standard nou/.test(t)) {
    out.add('post-2010');
  }

  // Heuristică numerică pentru entries fără context epocă explicit
  if (out.size === 0) {
    // ψ mare = probabil bloc/casă veche fără îmbunătățire
    if (Number.isFinite(psi)) {
      if (psi >= 0.50) {
        out.add('pre-1950');
        out.add('1950-1989');
      } else if (psi >= 0.20) {
        out.add('1950-1989');
        out.add('1990-2010');
      } else if (psi >= 0.05) {
        out.add('1990-2010');
        out.add('post-2010');
      } else {
        out.add('post-2010');
        out.add('passivhaus');
      }
    } else {
      // Fallback: toate epocile
      VINTAGES_ALL.forEach(v => out.add(v));
    }
  }

  // Punți punctuale (CHI) — în general moderne (post-2000)
  if (entry.bridge_type === 'point' || entry.is_point_bridge === true) {
    out.add('post-2010');
    if (entry.iso_14683_code === 'CHI' && /diblu|tirfaț|tirfat/.test(n)) {
      out.add('1990-2010'); // dibluri ETICS au început în anii '90
    }
  }

  // Categorii moderne specifice
  if (/balcoane avansate|balcoane și logii|fațade și ferestre avansate|joncțiuni speciale/.test(c)) {
    out.add('post-2010');
  }

  return Array.from(out).sort();
}

const db = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
const stats = { total: db.length, distribution: { 'pre-1950': 0, '1950-1989': 0, '1990-2010': 0, 'post-2010': 0, 'passivhaus': 0 }, multi: 0, single: 0 };

const annotated = db.map(entry => {
  const vintages = inferVintages(entry);
  vintages.forEach(v => stats.distribution[v]++);
  if (vintages.length > 1) stats.multi++; else stats.single++;
  return { ...entry, vintage: vintages };
});

fs.writeFileSync(JSON_PATH, JSON.stringify(annotated, null, 2) + '\n', 'utf-8');

console.log('=== Vintage migration completed ===');
console.log(`Total entries: ${stats.total}`);
console.log(`Single vintage: ${stats.single}, Multi vintage: ${stats.multi}`);
console.log('Distribution (entries per epocă):');
Object.entries(stats.distribution).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
