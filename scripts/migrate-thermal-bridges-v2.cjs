#!/usr/bin/env node
/**
 * Migration script — Schema P3 v2 pentru thermal-bridges.json
 *
 * Adaugă pe fiecare intrare:
 *   - iso_14683_code   (cod oficial SR EN ISO 14683:2017 Tabel 1)
 *   - dimension_system ('interior' default per Mc 001-2022)
 *   - method           (iso14683_default | numeric_iso10211 | atlas_validated | manufacturer_data | expert_judgment)
 *   - bridge_type      ('linear' | 'point')
 *   - unit             ('W/(m·K)' linear | 'W/K' point)
 *
 * Idempotent: nu suprascrie câmpuri deja prezente decât dacă --force.
 * Sursă audit: docs/AUDIT_THERMAL_BRIDGES_2026.md §E
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'src', 'data', 'thermal-bridges.json');
const META_PATH = path.join(ROOT, 'src', 'data', 'thermal-bridges-metadata.json');

const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry');

const db = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));

const stats = {
  total: db.length,
  iso_codes_added: 0,
  iso_codes_existing: 0,
  iso_codes_unmapped: 0,
  point_bridges: 0,
  linear_bridges: 0,
  methods: { iso14683_default: 0, numeric_iso10211: 0, atlas_validated: 0, manufacturer_data: 0, expert_judgment: 0 },
};

// --- HELPERS ----------------------------------------------------------------

function inferIsoCode(entry) {
  // 1) Try metadata file (52 entries au explicit iso_14683_type)
  // Skip em dash placeholder ('—' = "fără cod ISO standard") — fall through la pattern matching.
  if (meta && meta.entries && meta.entries[entry.name]?.iso_14683_type) {
    const code = meta.entries[entry.name].iso_14683_type;
    if (code && code !== '—' && code !== '-') return code;
  }

  const n = (entry.name || '').toLowerCase();
  const c = (entry.cat || '').toLowerCase();
  const d = (entry.detail || '').toLowerCase();

  // 2) Explicit code in detail field
  const m = d.match(/tip\s+([a-z]{1,3})[^a-z]/i);
  if (m && ['if','iw','r','gf','c','b','p','d','w','bf','fw','co','wj','wh','ws'].includes(m[1].toLowerCase())) {
    return m[1].toUpperCase();
  }

  // 3) Point bridges (real chi values, not just naming convention)
  const isPoint = entry.is_point_bridge === true || entry.chi === true || (typeof entry.chi === 'number' && entry.is_point_bridge);
  if (isPoint) return 'CHI';

  // 4) Pattern matching pe nume + categorie
  if (/colț|colt|corner/.test(n)) return n.includes('interior') ? 'CO' : 'C';
  if (/atic|parapet/.test(n)) return 'P';
  if (/cornișă|cornisa|streașină|streasina|coamă|coama|eaves|ridge/.test(n)) return 'R';
  if (/lucarnă|lucarna|dormer|skylight|luminator/.test(n)) return 'R';
  if (/balcon|consolă|consola|loggie|loggia|isokorb|ruptor termic|halfen|hit-|isotec/.test(n)) return 'B';
  if (/fereastr|window/.test(n)) {
    if (/glaf|sill/.test(n)) return 'WS';
    if (/buiandrug|lintel/.test(n)) return 'WH';
    return 'WJ';
  }
  if (/ușă|usa|door|prag/.test(n)) return 'D';
  if (/planșeu intermediar|planseu intermediar|intermediate floor|rim joist/.test(n)) return 'IF';
  if (/perete int|internal wall|partition/.test(n)) return 'IW';
  if (/planșeu pe sol|planseu pe sol|placă sol|placa sol|ground floor|fundație|fundatie|soclu/.test(n)) return 'GF';
  if (/subsol|basement|pivnit|cellar/.test(n)) return /perete|fundație|fundatie|wall/.test(n) ? 'FW' : 'BF';
  if (/acoperiș|acoperis|roof/.test(n)) return 'R';
  // Diblu/ancoraj/tirfaț ETICS → CHI doar dacă e marcat ca point bridge.
  // 'conector'/'prindere' la panouri prefabricate sunt punți liniare distribuite — NU CHI.
  if (/^diblu|tirfaț|tirfat\b/.test(n) && isPoint) return 'CHI';
  if (/cortină|cortina|curtain wall|montant|mullion|spandrel/.test(n)) return 'CW';
  if (/buiandrug|lintel/.test(n)) return 'WH';
  if (/centur[ăa]|seism|corni\w/.test(n)) {
    if (/atic|teras[ăa]/.test(n)) return 'P';
    if (/balcon/.test(c)) return 'B';
    if (/streașin|streasin|acoperi/.test(n)) return 'R';
    return 'IF';
  }

  // 5) Fallback pe categorie
  if (/joncțiuni pereți|joncțiuni perete|joncțiuni speciale|joncțiuni|pereți/.test(c)) return 'IF';
  if (/pardoseală|pardoseala|sol/.test(c)) return 'GF';
  if (/acoperiș|acoperis|terasă/.test(c)) return 'R';
  if (/balcon|loggie|loggii/.test(c)) return 'B';
  if (/ferestre|uși|usi/.test(c)) return 'WJ';
  // ETICS — dibluri sunt CHI doar dacă marked point. Rost dilatare ETICS, profil soclu = liniar (IF).
  if (/etics/.test(c)) {
    if (/diblu|tirfaț|tirfat|prindere/.test(n) && isPoint) return 'CHI';
    if (/diblu|tirfaț|tirfat/.test(n)) return 'CHI'; // dibluri sunt mereu point chiar dacă schema veche nu marchează
    return 'IF'; // soclu, rost ETICS, etc. = liniar
  }
  // Instalații — coș fum, prize aer prin perete = penetrări LINIARE (perimetru deschidere). CHI doar pentru point.
  if (/instalații/.test(c)) return 'IF';
  if (/structuri din lemn|timber/.test(c)) return 'IF';
  if (/structuri speciale|stâlpi|stalpi|grinzi/.test(c)) return 'IF';
  if (/passivhaus|nzeb/.test(c)) return 'IF';
  if (/sandwich|prefabricat/.test(c)) return 'IF';
  if (/tradițional|vernacular/.test(c)) return 'IF';
  if (/clt|lemn masiv/.test(c)) return 'IF';
  if (/retrofit/.test(c)) return 'IF';
  if (/fundații|fundatii/.test(c)) return 'FW';
  if (/cortină|cortina|fațadă cortină|fatada cortina/.test(c)) return 'CW';

  return null; // unmapped
}

function inferMethod(entry) {
  const d = (entry.detail || '').toLowerCase();
  const n = (entry.name || '').toLowerCase();

  // 1) Manufacturer data — high confidence
  if (/schöck|schock|halfen|leviat|velux|roto|reynaers|schueco|schüco|aluprof|knauf|rockwool|baumit|saint.gobain|isover|ursa|kingspan/i.test(d)) {
    return 'manufacturer_data';
  }

  // 2) Numeric ISO 10211 / FEM
  if (/iso\s*10211|calcule fem|calcul fem|fem analysis|2d numeric|3d numeric|simulare 2d|simulare 3d|therm\b|flixo/i.test(d)) {
    return 'numeric_iso10211';
  }

  // 3) Atlas validated (PHI/RT2012/DIN/BR497)
  if (/passipedia|phi |passive house institute|rt 2012|rt2012|din 4108|beiblatt|br 443|br 497|etag|eota|atlas rt|atlas cerway|accredited construction details|cetat-centre/i.test(d)) {
    return 'atlas_validated';
  }

  // 4) ISO 14683 default
  if (/iso 14683|iso14683|en iso 14683/i.test(d)) {
    return 'iso14683_default';
  }

  // 5) Citing Mc 001 + atlas RT
  if (/mc 001|mc001|c107\/3|c107\/4|stas/i.test(d)) {
    return 'atlas_validated';
  }

  // 6) Default
  return 'expert_judgment';
}

function inferBridgeType(entry) {
  if (entry.is_point_bridge === true) return 'point';
  if (entry.chi === true) return 'point';
  return 'linear';
}

function inferUnit(bridgeType) {
  return bridgeType === 'point' ? 'W/K' : 'W/(m·K)';
}

// --- MIGRATION ---------------------------------------------------------------

const migrated = db.map(entry => {
  const out = { ...entry };

  // bridge_type
  if (force || out.bridge_type === undefined) {
    out.bridge_type = inferBridgeType(entry);
  }
  if (out.bridge_type === 'point') stats.point_bridges++;
  else stats.linear_bridges++;

  // unit
  if (force || out.unit === undefined) {
    out.unit = inferUnit(out.bridge_type);
  }

  // dimension_system — default 'interior' per Mc 001-2022
  if (force || out.dimension_system === undefined) {
    out.dimension_system = 'interior';
  }

  // iso_14683_code
  if (force || out.iso_14683_code === undefined) {
    const code = inferIsoCode(entry);
    if (code) {
      out.iso_14683_code = code;
      stats.iso_codes_added++;
    } else {
      stats.iso_codes_unmapped++;
    }
  } else {
    stats.iso_codes_existing++;
  }

  // method
  if (force || out.method === undefined) {
    out.method = inferMethod(entry);
  }
  stats.methods[out.method] = (stats.methods[out.method] || 0) + 1;

  return out;
});

// --- WRITE -------------------------------------------------------------------

if (dryRun) {
  console.log('=== DRY RUN — fără modificare fișier ===\n');
} else {
  fs.writeFileSync(JSON_PATH, JSON.stringify(migrated, null, 2) + '\n', 'utf-8');
  console.log('=== Migration scrisă în', JSON_PATH, '===\n');
}

console.log('Statistici:');
console.log(`  Total entries: ${stats.total}`);
console.log(`  Linear: ${stats.linear_bridges}, Point: ${stats.point_bridges}`);
console.log(`  ISO codes adăugate: ${stats.iso_codes_added} (existing: ${stats.iso_codes_existing}, unmapped: ${stats.iso_codes_unmapped})`);
console.log('  Method distribution:');
Object.entries(stats.methods).forEach(([k, v]) => console.log(`    ${k}: ${v}`));

if (stats.iso_codes_unmapped > 0) {
  console.log('\n⚠️  Entries fără cod ISO 14683 (necesită review manual):');
  migrated.forEach(e => {
    if (!e.iso_14683_code) console.log(`    - ${e.cat} | ${e.name}`);
  });
}
