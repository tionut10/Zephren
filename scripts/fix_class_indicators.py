#!/usr/bin/env python3
"""
Adaugă tag-uri {ep_class_real}, {ep_class_ref}, {co2_class_real} pentru
indicatorii de clasă (săgețile colorate) din template-urile CPE.
Funcționează pe template-urile DEJA procesate de prepare_templates.py.
"""
import zipfile, re, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
TPL_DIR = Path(__file__).parent.parent / "public" / "templates"

TEMPLATES = [
    "4-CPE-apartament-bloc-INC-ACC-RAC-VENT-IL.docx",
    "5-CPE-cladire-locuit-individuala-INC-ACC-RAC-VENT-IL.docx",
    "6-CPE-cladire-locuit-colectiva-INC-ACC-RAC-VENT-IL.docx",
    "7-CPE-cladire-birouri-INC-ACC-RAC-VENT-IL.docx",
    "8-CPE-cladire-invatamant-INC-ACC-RAC-VENT-IL.docx",
    "9-CPE-cladire-sanitar-INC-ACC-RAC-VENT-IL.docx",
    "10-CPE-cladire-comert-INC-ACC-RAC-VENT-IL.docx",
    "11-CPE-cladire-turism-INC-ACC-RAC-VENT-IL.docx",
    "12-CPE-cladire-sport-INC-ACC-RAC-VENT-IL.docx",
    "3-CPE-forma-generala-cladire.docx",
    "2-CPE-forma-generala-apartament.docx",
]

# The class indicators appear as standalone uppercase letters (A, B, C, etc.)
# RIGHT AFTER the ≤{s_ap} threshold nodes on the scale.
# Structure: ≤{s_ap}, ≤{s_ap}, [EP_REAL], [EP_REAL], [EP_REF], [EP_REF], ≤{co2_ap}, ≤{co2_ap}, [CO2_REAL], [CO2_REAL]
# For apartments (RA templates): no EP_REF, structure differs slightly

# Tags to insert (replacing standalone A/B/C letters)
EP_REAL_TAG = "{ep_class_real}"
EP_REF_TAG = "{ep_class_ref}"
CO2_REAL_TAG = "{co2_class_real}"

def process_template(filepath):
    with zipfile.ZipFile(filepath, 'r') as zin:
        names = zin.namelist()
        files = {}
        for name in names:
            files[name] = zin.read(name)

    xml = files["word/document.xml"].decode("utf-8")

    # Strategy: find <w:t>X</w:t> nodes where X is a single uppercase letter (A-G)
    # that appear between the EP/CO2 scale headers and the range text.
    # We identify them by their context: they come after ≤ nodes and before range nodes.

    # Pattern: standalone single letter in <w:t> — only A through G
    single_letter_pattern = re.compile(r'(<w:t[^>]*>)([A-G])(</w:t>)')

    # Find all matches with their positions
    matches = list(single_letter_pattern.finditer(xml))

    # Filter: we need the class indicators, not the scale labels (A+, A, B, C, D, E, F, G)
    # The scale labels come in groups of 8 (A+ through G) in the per-utility table.
    # The class indicators come in pairs right after the ≤ threshold.

    # Find the ≤ positions to anchor our search
    le_positions = [m.start() for m in re.finditer(r'≤|&lt;=', xml)]

    # The first 4 ≤ signs are: ≤{s_ap} (EP real), ≤{s_ap} (EP ref), ≤{co2_ap} (CO2 real), ≤{co2_ap} (CO2 ref)
    # After each pair of ≤, the next standalone letters are the class indicators

    # Simpler approach: find the FIRST group of 2-4 standalone single letters
    # that appear between "Performanță energetică ridicată" and the first range "…" text.
    # These are guaranteed to be the class indicators.

    perf_pos = xml.find("Performan")
    if perf_pos == -1:
        print(f"  SKIP: no Performanță found in {filepath.name}")
        return 0

    # Find first range (… or ...) after the performance header
    first_range = xml.find("…", perf_pos + 100)  # U+2026 ellipsis
    if first_range == -1:
        first_range = len(xml)

    # Filter matches to those between perf_pos and first_range
    indicator_matches = [m for m in matches if perf_pos < m.start() < first_range]

    changes = 0

    if len(indicator_matches) >= 6:
        # Standard building: 4 EP (2 real + 2 ref) + 2 CO2 (2 real)
        # Nodes: [EP_REAL, EP_REAL, EP_REF, EP_REF, ?, ?, CO2_REAL, CO2_REAL]
        # But CO2 might be further after CO2 ≤ nodes

        # EP indicators: first 4 standalone letters
        ep_matches = indicator_matches[:4]

        # CO2: find standalone letters after the CO2 ≤ threshold
        co2_le_pos = xml.find("≤", xml.find("{co2_ap}") - 10 if "{co2_ap}" in xml else perf_pos)
        co2_matches = [m for m in matches if m.start() > co2_le_pos and m.start() < first_range]
        # Take the first 2 that aren't already in ep_matches
        co2_matches = [m for m in co2_matches if m not in ep_matches][:2]

        # Replace EP real (first 2)
        for m in ep_matches[:2]:
            xml = xml[:m.start()] + m.group(1) + EP_REAL_TAG + m.group(3) + xml[m.end():]
            # Recalculate positions after replacement
            offset = len(EP_REAL_TAG) - len(m.group(2))
            # Need to re-find all matches since positions shifted
            break  # Do one at a time to handle offset

    # Simpler: do sequential replacement using a state machine
    # Reset and use a cleaner approach
    xml = files["word/document.xml"].decode("utf-8")  # Reset

    # Replace using numbered occurrence of standalone letter pattern after "Performanț"
    perf_idx = xml.find("Performan")
    range_idx = xml.find("\u2026", perf_idx + 50) if perf_idx != -1 else -1

    if perf_idx == -1 or range_idx == -1:
        print(f"  SKIP: landmarks not found in {filepath.name}")
        return 0

    # In the region between perf_idx and range_idx, replace standalone letters
    region = xml[perf_idx:range_idx]

    # Find all <w:t>X</w:t> in this region (single uppercase letter)
    letter_matches = list(re.finditer(r'(<w:t[^>]*>)([A-G])(</w:t>)', region))

    # Determine if this is an apartment template (no reference building)
    is_apartment = "apartament" in filepath.name.lower() or "forma-generala-apartament" in filepath.name.lower()

    if is_apartment:
        # Apartment: only real building indicators, no reference
        # Pattern: [EP_REAL, EP_REAL, ..., CO2_REAL, CO2_REAL]
        tags = [EP_REAL_TAG, EP_REAL_TAG, EP_REAL_TAG, EP_REAL_TAG]  # might have 4 EP
        # For CO2 we need to check separately
    else:
        # Building: [EP_REAL, EP_REAL, EP_REF, EP_REF, ..., CO2_REAL, CO2_REAL]
        tags = [EP_REAL_TAG, EP_REAL_TAG, EP_REF_TAG, EP_REF_TAG]

    # Replace in reverse order to maintain positions
    for i in range(min(len(letter_matches), len(tags)) - 1, -1, -1):
        m = letter_matches[i]
        abs_start = perf_idx + m.start()
        abs_end = perf_idx + m.end()
        replacement = m.group(1) + tags[i] + m.group(3)
        xml = xml[:abs_start] + replacement + xml[abs_end:]
        changes += 1

    # Now handle CO2 class indicators — they're after the CO2 ≤ nodes
    # Find them in the region between CO2 threshold and first CO2 range
    co2_ap_pos = xml.find("{co2_ap}")
    if co2_ap_pos != -1:
        # Find the ≤ just before {co2_ap}
        co2_le = xml.rfind("≤", co2_ap_pos - 20, co2_ap_pos)
        # Find the first range after CO2 ≤
        co2_range = xml.find("\u2026", co2_ap_pos + 10)
        if co2_le != -1 and co2_range != -1:
            co2_region = xml[co2_le:co2_range]
            co2_letters = list(re.finditer(r'(<w:t[^>]*>)([A-G])(</w:t>)', co2_region))
            co2_tags = [CO2_REAL_TAG, CO2_REAL_TAG]
            for i in range(min(len(co2_letters), len(co2_tags)) - 1, -1, -1):
                m = co2_letters[i]
                abs_start = co2_le + m.start()
                abs_end = co2_le + m.end()
                replacement = m.group(1) + co2_tags[i] + m.group(3)
                xml = xml[:abs_start] + replacement + xml[abs_end:]
                changes += 1

    files["word/document.xml"] = xml.encode("utf-8")

    with zipfile.ZipFile(filepath, 'w', zipfile.ZIP_DEFLATED) as zout:
        for name in names:
            zout.writestr(name, files[name])

    return changes


for fname in TEMPLATES:
    filepath = TPL_DIR / fname
    if filepath.exists():
        changes = process_template(filepath)
        print(f"  {fname}: {changes} class indicators tagged")
    else:
        print(f"  SKIP: {fname} not found")
