#!/usr/bin/env python3
"""
Pregătire template-uri CPE pentru docxtemplater.
Înlocuiește valorile hardcodate cu {tag} placeholders.
"""
import zipfile, re, sys, io, os, shutil
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TPL_DIR = Path(__file__).parent.parent / "public" / "templates"
BACKUP_DIR = TPL_DIR / "backup_originals"

# ═══════════════════════════════════════════════════════
# Scale EP per categorie (Mc 001-2022) — valorile din template-uri
# Template-urile rezidențiale folosesc varianta _cool
# ═══════════════════════════════════════════════════════
EP_SCALES = {
    "RI": [91, 129, 257, 390, 522, 652, 783],
    "RC": [73, 101, 198, 297, 396, 495, 595],
    "RA": [73, 101, 198, 297, 396, 495, 595],
    "BI": [68, 97, 193, 302, 410, 511, 614],
    "ED": [55, 78, 157, 248, 340, 425, 510],
    "SA": [130, 190, 380, 570, 760, 950, 1140],
    "HC": [85, 120, 240, 370, 500, 625, 750],
    "CO": [75, 107, 213, 330, 447, 558, 670],
    "SP": [70, 100, 200, 310, 420, 525, 630],
    "AL": [68, 97, 193, 302, 410, 511, 614],
}

# Scale CO2 per categorie [kg CO2/(m²·an)] — format cu virgulă în template
CO2_SCALES = {
    "RI": ["16,1", "22,8", "45,5", "70,1", "94,8", "118,4", "142,1"],
    "RC": ["12,7", "17,6", "34,6", "52,2", "69,9", "87,4", "104,9"],
    "RA": ["12,7", "17,6", "34,6", "52,2", "69,9", "87,4", "104,9"],
    "BI": ["10,4", "14,8", "29,7", "46,1", "62,4", "77,8", "93,4"],
    "ED": ["8,5", "12,0", "24,0", "37,0", "50,0", "62,5", "75,0"],
    "SA": ["19,0", "27,0", "54,0", "83,0", "112,0", "140,0", "168,0"],
    "HC": ["13,0", "18,5", "37,0", "57,0", "77,0", "96,0", "115,0"],
    "CO": ["11,5", "16,4", "32,8", "50,5", "68,5", "85,5", "102,5"],
    "SP": ["10,7", "15,3", "30,5", "47,5", "64,5", "80,5", "96,5"],
    "AL": ["10,4", "14,8", "29,7", "46,1", "62,4", "77,8", "93,4"],
}

# Mapare template → categorie
TEMPLATES_CPE = {
    "5-CPE-cladire-locuit-individuala-INC-ACC-RAC-VENT-IL.docx": "RI",
    "6-CPE-cladire-locuit-colectiva-INC-ACC-RAC-VENT-IL.docx": "RC",
    "4-CPE-apartament-bloc-INC-ACC-RAC-VENT-IL.docx": "RA",
    "7-CPE-cladire-birouri-INC-ACC-RAC-VENT-IL.docx": "BI",
    "8-CPE-cladire-invatamant-INC-ACC-RAC-VENT-IL.docx": "ED",
    "9-CPE-cladire-sanitar-INC-ACC-RAC-VENT-IL.docx": "SA",
    "11-CPE-cladire-turism-INC-ACC-RAC-VENT-IL.docx": "HC",
    "10-CPE-cladire-comert-INC-ACC-RAC-VENT-IL.docx": "CO",
    "12-CPE-cladire-sport-INC-ACC-RAC-VENT-IL.docx": "SP",
    "3-CPE-forma-generala-cladire.docx": "AL",
    "2-CPE-forma-generala-apartament.docx": "RA",
}

# Tag names for EP scale: s_ap, s_a, s_b, s_c, s_d, s_e, s_f
EP_TAGS = ["s_ap", "s_a", "s_b", "s_c", "s_d", "s_e", "s_f"]
CO2_TAGS = ["co2_ap", "co2_a", "co2_b", "co2_c", "co2_d", "co2_e", "co2_f"]


def esc_re(s):
    """Escape string for regex"""
    return re.escape(str(s))


def merge_runs(xml):
    """Merge adjacent <w:r> elements where the text is split across runs.
    Same logic as the JS mergeRuns() function, applied 6 passes."""
    pattern = re.compile(
        r'(<w:t[^>]*>)([^<]*)</w:t></w:r>\s*<w:r(?:\s[^>]*)?>(?:<w:rPr>[\s\S]*?</w:rPr>)?\s*<w:t(?:\s[^>]*)?>([^<]*</w:t>)'
    )
    for _ in range(6):
        prev = xml
        xml = pattern.sub(lambda m: m.group(1) + m.group(2) + m.group(3), xml)
        if xml == prev:
            break
    return xml


def process_cpe_template(filepath, cat):
    """Add {tag} placeholders to a CPE template."""
    ep = EP_SCALES[cat]
    co2 = CO2_SCALES[cat]

    with zipfile.ZipFile(filepath, 'r') as zin:
        names = zin.namelist()
        files = {}
        for name in names:
            files[name] = zin.read(name)

    xml = files["word/document.xml"].decode("utf-8")

    # ═══ MERGE RUNS — coalesce adjacent <w:r> elements ═══
    xml = merge_runs(xml)

    changes = 0

    # ═══════════════════════════════════════
    # 1. SCALA EP TOTALĂ — range-uri cu "…" (U+2026)
    # Format: "73 … 101" → "{s_ap} … {s_a}"
    # ═══════════════════════════════════════
    for i in range(6):
        old_range = f"{ep[i]} \u2026 {ep[i+1]}"
        new_range = "{" + EP_TAGS[i] + "}" + " \u2026 " + "{" + EP_TAGS[i+1] + "}"
        if old_range in xml:
            xml = xml.replace(old_range, new_range)
            changes += 1

    # "≤ XX" sau "≤XX" (A+ threshold)
    for prefix in ["\u2264 ", "\u2264"]:
        old = prefix + str(ep[0])
        new = prefix + "{" + EP_TAGS[0] + "}"
        if old in xml:
            xml = xml.replace(old, new)
            changes += 1

    # "> XX" (G threshold)
    for prefix in ["&gt; ", "&gt;"]:
        old = prefix + str(ep[6])
        new = prefix + "{" + EP_TAGS[6] + "}"
        if old in xml:
            xml = xml.replace(old, new)
            changes += 1

    # Standalone EP values in <w:t> — exact match only
    for i, val in enumerate(ep):
        tag = "{" + EP_TAGS[i] + "}"
        s = str(val)
        # Match <w:t>73</w:t> or <w:t xml:space="preserve">73</w:t>
        pattern = f"(<w:t[^>]*>){esc_re(s)}(</w:t>)"
        xml = re.sub(pattern, f"\\g<1>{tag}\\g<2>", xml)
        changes += 1

    # ═══════════════════════════════════════
    # 2. SCALA CO2 — format cu virgulă: "12,7"
    # Range-uri cu "…": "12,7 … 17,6" → "{co2_ap} … {co2_a}"
    # ═══════════════════════════════════════
    for i in range(6):
        old_range = f"{co2[i]} \u2026 {co2[i+1]}"
        new_range = "{" + CO2_TAGS[i] + "}" + " \u2026 " + "{" + CO2_TAGS[i+1] + "}"
        if old_range in xml:
            xml = xml.replace(old_range, new_range)
            changes += 1

    # "≤ XX,Y" CO2
    for prefix in ["\u2264 ", "\u2264"]:
        old = prefix + co2[0]
        new = prefix + "{" + CO2_TAGS[0] + "}"
        if old in xml:
            xml = xml.replace(old, new)
            changes += 1

    # "> XX,Y" CO2
    for prefix in ["&gt; ", "&gt;"]:
        old = prefix + co2[6]
        new = prefix + "{" + CO2_TAGS[6] + "}"
        if old in xml:
            xml = xml.replace(old, new)
            changes += 1

    # Standalone CO2 values
    for i, val in enumerate(co2):
        tag = "{" + CO2_TAGS[i] + "}"
        pattern = f"(<w:t[^>]*>){esc_re(val)}(</w:t>)"
        xml = re.sub(pattern, f"\\g<1>{tag}\\g<2>", xml)
        changes += 1

    # ═══════════════════════════════════════
    # 3. CÂMPURI TEXT — adresă, an, auditor, etc.
    # Înlocuim noduri <w:t> cu conținut specific
    # ═══════════════════════════════════════

    # An construcție: "AAAA"
    xml = re.sub(r'(<w:t[^>]*>)AAAA(</w:t>)', r'\g<1>{year}\g<2>', xml)

    # Data expirare: "zz/ll/aa"
    xml = re.sub(r'(<w:t[^>]*>)zz/ll/aa(</w:t>)', r'\g<1>{expiry}\g<2>', xml)

    # Adresa: nodul cu "adresa" sau "........... adresa ........"
    xml = re.sub(r'(<w:t[^>]*>)[.\s]*adresa[.\s]*(</w:t>)', r'\g<1>{address}\g<2>', xml)

    # GPS: "II,IIII x LL,LLLL"
    xml = re.sub(r'(<w:t[^>]*>)II,IIII x LL,LLLL(</w:t>)', r'\g<1>{gps}\g<2>', xml)

    # Regim înălțime: "regim" standalone
    xml = re.sub(r'(<w:t[^>]*>)regim(</w:t>)', r'\g<1>{regime}\g<2>', xml)

    # Arii: "zzz,z" → {area_ref}, "yyy,y" → {area_gross}
    xml = re.sub(r'(<w:t[^>]*>)zzz,z(</w:t>)', r'\g<1>{area_ref}\g<2>', xml)
    xml = re.sub(r'(<w:t[^>]*>)yyy,y(</w:t>)', r'\g<1>{area_gross}\g<2>', xml)

    # Volum: "xxxx" standalone (fără virgulă) — careful: doar nodul de volum
    # EP total: "xxxx,x" — 2 apariții secvențiale → {ep_total_real}, {ep_total_ref}
    count = [0]
    def repl_ep_total(m):
        count[0] += 1
        if count[0] == 1: return m.group(1) + "{ep_total_real}" + m.group(2)
        return m.group(1) + "{ep_total_ref}" + m.group(2)
    xml = re.sub(r'(<w:t[^>]*>)xxxx,x(</w:t>)', repl_ep_total, xml)

    # Volume: "xxxx" (4 cifre, fără virgulă)
    xml = re.sub(r'(<w:t[^>]*>)xxxx(</w:t>)', r'\g<1>{volume}\g<2>', xml)

    # Consum final xx,x — 4 apariții: termic, electric, EP specific, EP ref
    xx_tags = ["{qf_thermal}", "{qf_electric}", "{ep_specific}", "{ep_ref}"]
    count2 = [0]
    def repl_xx(m):
        if count2[0] < len(xx_tags):
            tag = xx_tags[count2[0]]
            count2[0] += 1
            return m.group(1) + tag + m.group(2)
        return m.group(0)
    xml = re.sub(r'(<w:t[^>]*>)xx,x(</w:t>)', repl_xx, xml)

    # xxx,x — 8 apariții secvențiale
    xxx_tags = ["{area_ref2}", "{co2_val}", "{sre_st}", "{sre_pv}", "{sre_pc}", "{sre_bio}", "{sre_other}", "{sre_total}"]
    count3 = [0]
    def repl_xxx(m):
        if count3[0] < len(xxx_tags):
            tag = xxx_tags[count3[0]]
            count3[0] += 1
            return m.group(1) + tag + m.group(2)
        return m.group(0)
    xml = re.sub(r'(<w:t[^>]*>)xxx,x(</w:t>)', repl_xxx, xml)

    # Nr atestat: "XX/XXXXX"
    xml = re.sub(r'(<w:t[^>]*>)XX/XXXXX(</w:t>)', r'\g<1>{auditor_atestat}\g<2>', xml)

    # Nume auditor
    xml = xml.replace("Nume &amp; prenume auditor energetic", "{auditor_name}")
    xml = xml.replace("Nume auditor", "{auditor_name}")
    xml = xml.replace("nume auditor", "{auditor_name}")

    # Firmă
    xml = xml.replace("Firma/PFA", "{auditor_company}")
    xml = xml.replace("denumire firma", "{auditor_company}")

    # Telefon, email
    xml = xml.replace("nr. telefon", "{auditor_phone}")
    xml = xml.replace("adresa email", "{auditor_email}")

    # Data elaborare: ZZ.LL.AAAA sau ZZ/LL/AAAA
    xml = re.sub(r'(<w:t[^>]*>)ZZ\.LL\.AAAA(</w:t>)', r'\g<1>{auditor_date}\g<2>', xml)
    xml = re.sub(r'(<w:t[^>]*>)ZZ/LL/AAAA(</w:t>)', r'\g<1>{auditor_date}\g<2>', xml)

    # Cod unic MDLPA
    xml = xml.replace("cod unic", "{auditor_mdlpa}")
    xml = xml.replace("Cod unic", "{auditor_mdlpa}")

    # Scop CPE
    xml = xml.replace("V\u00e2nzare/\u00cenchirie/Recep\u021bie/Inf", "{scope}")
    xml = xml.replace("V\u00e2nzare/\u00cenchiriere/Recep\u021bie/Inf", "{scope}")

    # Program calcul - nodul cu "versiunea"
    xml = re.sub(r'(<w:t[^>]*>)([^<]*versiunea[^<]*)(</w:t>)', r'\g<1>{software}\g<3>', xml)

    # RER: "RR,R"
    xml = re.sub(r'(<w:t[^>]*>)RR,R(</w:t>)', r'\g<1>{rer}\g<2>', xml)

    # nZEB: "nZEB DA/NU"
    xml = xml.replace("nZEB DA/NU", "nZEB {nzeb}")

    # GWP: "GWP,G"
    xml = re.sub(r'(<w:t[^>]*>)GWP,G(</w:t>)', r'\g<1>{gwp}\g<2>', xml)
    xml = xml.replace("GWP lifecycle", "{gwp} kgCO2eq/m2an")

    # Nr camere (RA): " x " → " {nr_units} "
    if cat == "RA":
        xml = re.sub(r'(<w:t[^>]*>) x (</w:t>)', r'\g<1> {nr_units} \g<2>', xml)

    # Categorie funcțională
    xml = xml.replace("categorie functionala", "{category}")
    xml = xml.replace("categorie func\u021bional\u0103", "{category}")

    # Localitatea, județul, zona climatică
    xml = xml.replace("localitatea", "{city}")
    xml = xml.replace("judetul", "{county}")
    xml = xml.replace("jude\u021bul", "{county}")
    xml = xml.replace("zona climatica", "{climate_zone}")
    xml = xml.replace("zona climatic\u0103", "{climate_zone}")

    # Golim grupurile de puncte rămase (8+ dots)
    xml = re.sub(r'(<w:t[^>]*>)\.{8,}(</w:t>)', r'\g<1> \g<2>', xml)

    # ═══════════════════════════════════════
    # SAVE
    # ═══════════════════════════════════════
    files["word/document.xml"] = xml.encode("utf-8")

    # Repack
    with zipfile.ZipFile(filepath, 'w', zipfile.ZIP_DEFLATED) as zout:
        for name in names:
            zout.writestr(name, files[name])

    return changes


def main():
    # Backup originals
    BACKUP_DIR.mkdir(exist_ok=True)

    total_changes = 0
    for fname, cat in TEMPLATES_CPE.items():
        filepath = TPL_DIR / fname
        if not filepath.exists():
            print(f"  SKIP (nu există): {fname}")
            continue

        # Backup
        backup_path = BACKUP_DIR / fname
        if not backup_path.exists():
            shutil.copy2(filepath, backup_path)

        changes = process_cpe_template(filepath, cat)
        total_changes += changes
        print(f"  OK: {fname} ({cat}) — {changes} changes")

    print(f"\nTotal: {total_changes} changes across {len(TEMPLATES_CPE)} templates")
    print(f"Backups saved in: {BACKUP_DIR}")


if __name__ == "__main__":
    main()
