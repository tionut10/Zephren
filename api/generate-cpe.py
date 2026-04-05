"""
Vercel Python Serverless Function — Generare CPE DOCX cu python-docx.
Primește template DOCX (base64) + date JSON, returnează DOCX completat.
Lucrează direct pe template-urile originale MDLPA fără pre-procesare.
"""
from http.server import BaseHTTPRequestHandler
import json, io, base64, re, copy
from docx import Document
from docx.shared import Inches
from lxml import etree

# ═══════════════════════════════════════════════════════
# CONSTANTE — scalele EP și CO2 din template-uri (Mc 001-2022)
# Template-urile rezidențiale folosesc varianta _cool
# ═══════════════════════════════════════════════════════
EP_TEMPLATE_SCALES = {
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

CO2_TEMPLATE_SCALES = {
    "RI": [16.1, 22.8, 45.5, 70.1, 94.8, 118.4, 142.1],
    "RC": [12.7, 17.6, 34.6, 52.2, 69.9, 87.4, 104.9],
    "RA": [12.7, 17.6, 34.6, 52.2, 69.9, 87.4, 104.9],
    "BI": [10.4, 14.8, 29.7, 46.1, 62.4, 77.8, 93.4],
    "ED": [8.5, 12.0, 24.0, 37.0, 50.0, 62.5, 75.0],
    "SA": [19.0, 27.0, 54.0, 83.0, 112.0, 140.0, 168.0],
    "HC": [13.0, 18.5, 37.0, 57.0, 77.0, 96.0, 115.0],
    "CO": [11.5, 16.4, 32.8, 50.5, 68.5, 85.5, 102.5],
    "SP": [10.7, 15.3, 30.5, 47.5, 64.5, 80.5, 96.5],
    "AL": [10.4, 14.8, 29.7, 46.1, 62.4, 77.8, 93.4],
}

NSMAP = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def qn(tag):
    """Qualified name helper for lxml."""
    prefix, local = tag.split(":")
    return "{%s}%s" % (NSMAP[prefix], local)


# ═══════════════════════════════════════════════════════
# REPLACE TEXT ACROSS RUNS — păstrează formatarea
# ═══════════════════════════════════════════════════════
def replace_in_paragraph(para, old_text, new_text, count=0):
    """Replace old_text with new_text in a paragraph, across split runs.
    Returns number of replacements made. If count>0, limits replacements."""
    full = para.text
    if old_text not in full:
        return 0

    # Build a map of character positions to runs
    runs = para.runs
    if not runs:
        return 0

    char_map = []  # [(run_idx, char_idx_in_run)]
    for ri, run in enumerate(runs):
        for ci in range(len(run.text)):
            char_map.append((ri, ci))

    replacements = 0
    offset = 0
    while True:
        pos = full.find(old_text, offset)
        if pos == -1:
            break
        if count > 0 and replacements >= count:
            break

        # Find which runs this spans
        start_ri, start_ci = char_map[pos]
        end_pos = pos + len(old_text) - 1
        end_ri, end_ci = char_map[end_pos]

        # Put replacement text in the first run at the start position
        first_run = runs[start_ri]
        before = first_run.text[:start_ci]
        if start_ri == end_ri:
            after = first_run.text[end_ci + 1:]
            first_run.text = before + new_text + after
        else:
            first_run.text = before + new_text
            # Clear text from intermediate and last runs
            for ri in range(start_ri + 1, end_ri):
                runs[ri].text = ""
            last_run = runs[end_ri]
            last_run.text = last_run.text[end_ci + 1:]

        replacements += 1
        # Rebuild full text and char_map for next iteration
        full = para.text
        char_map = []
        for ri, run in enumerate(runs):
            for ci in range(len(run.text)):
                char_map.append((ri, ci))
        offset = pos + len(new_text)

    return replacements


def replace_in_doc(doc, old_text, new_text, max_count=0):
    """Replace text across entire document (paragraphs + tables)."""
    total = 0
    remaining = max_count

    # Body paragraphs
    for para in doc.paragraphs:
        n = replace_in_paragraph(para, old_text, new_text, remaining if max_count > 0 else 0)
        total += n
        if max_count > 0:
            remaining -= n
            if remaining <= 0:
                return total

    # Table cells
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    n = replace_in_paragraph(para, old_text, new_text, remaining if max_count > 0 else 0)
                    total += n
                    if max_count > 0:
                        remaining -= n
                        if remaining <= 0:
                            return total

    return total


def replace_seq(doc, old_text, values):
    """Replace sequential occurrences of old_text with different values."""
    idx = [0]

    def do_para(para):
        if idx[0] >= len(values):
            return
        full = para.text
        while old_text in full and idx[0] < len(values):
            replace_in_paragraph(para, old_text, values[idx[0]], count=1)
            idx[0] += 1
            full = para.text

    for para in doc.paragraphs:
        do_para(para)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    do_para(para)


# ═══════════════════════════════════════════════════════
# REPLACE SCALE THRESHOLDS — EP and CO2
# ═══════════════════════════════════════════════════════
def replace_scales(doc, category, new_ep_scale, new_co2_scale=None):
    """Replace the hardcoded EP/CO2 scale values from the template with new values."""
    old_ep = EP_TEMPLATE_SCALES.get(category, EP_TEMPLATE_SCALES["AL"])

    for i in range(7):
        if old_ep[i] != new_ep_scale[i]:
            old_s = str(old_ep[i])
            new_s = str(new_ep_scale[i])
            # Replace standalone numbers and numbers in ranges
            replace_in_doc(doc, old_s, new_s)

    # CO2 scales — format with comma (Romanian)
    if new_co2_scale:
        old_co2 = CO2_TEMPLATE_SCALES.get(category, CO2_TEMPLATE_SCALES["AL"])
        for i in range(7):
            old_s = format_ro(old_co2[i], 1)
            new_s = format_ro(new_co2_scale[i], 1)
            if old_s != new_s:
                replace_in_doc(doc, old_s, new_s)


# ═══════════════════════════════════════════════════════
# REPLACE CLASS INDICATORS — the colored arrows on scales
# Includes REPOSITIONING the shape vertically to the correct class row
# ═══════════════════════════════════════════════════════

# Vertical positions (EMU) for each class row on the scale
# Derived from template: class A posV=510540, class B posV=977265
# Spacing per class: 977265 - 510540 = 466725 EMU
_CLASS_SPACING = 466725
_CLASS_POS_V = {
    "A+": 510540 - _CLASS_SPACING,    #   43815
    "A":  510540,                      #  510540
    "B":  977265,                      #  977265
    "C":  977265 + _CLASS_SPACING,     # 1443990
    "D":  977265 + 2 * _CLASS_SPACING, # 1910715
    "E":  977265 + 3 * _CLASS_SPACING, # 2377440
    "F":  977265 + 4 * _CLASS_SPACING, # 2844165
    "G":  977265 + 5 * _CLASS_SPACING, # 3310890
}

# CO2 scale has same spacing but slightly different base
_CO2_CLASS_POS_V = {
    "A+": 963930 - _CLASS_SPACING * 2, #   30480
    "A":  963930 - _CLASS_SPACING,     #  497205
    "B":  963930,                      #  963930
    "C":  963930 + _CLASS_SPACING,     # 1430655
    "D":  963930 + 2 * _CLASS_SPACING, # 1897380
    "E":  963930 + 3 * _CLASS_SPACING, # 2364105
    "F":  963930 + 4 * _CLASS_SPACING, # 2830830
    "G":  963930 + 5 * _CLASS_SPACING, # 3297555
}


def _update_shape_pos_v(shape_xml_str, new_pos_v):
    """Update the posOffset within positionV in a mc:AlternateContent XML string."""
    # Replace the posOffset value inside <wp:positionV ...><wp:posOffset>VALUE</wp:posOffset>
    return re.sub(
        r'(<wp:positionV[^>]*>[\s\S]*?<wp:posOffset>)-?\d+(</wp:posOffset>)',
        lambda m: m.group(1) + str(new_pos_v) + m.group(2),
        shape_xml_str
    )


def replace_class_indicators(doc, ep_class_real, ep_class_ref, co2_class_real):
    """Replace class letter text AND reposition the arrow shapes on the scales."""
    import zipfile as _zf

    # Work directly on the XML string for precise shape manipulation
    xml_file = doc.part._element.getparent()
    # Access the raw XML via the document element
    body = doc.element.body
    # Serialize body to string for regex-based shape manipulation
    body_xml = etree.tostring(body, encoding="unicode")

    # Find mc:AlternateContent blocks with class indicators (H > 150000)
    alt_pattern = re.compile(r'(<mc:AlternateContent>[\s\S]*?</mc:AlternateContent>)')
    blocks = list(alt_pattern.finditer(body_xml))

    all_indicators = []  # (match, letter, posH, posV)

    for m in blocks:
        content = m.group(1)
        letters = re.findall(r'<w:t[^>]*>([A-G]\+?)</w:t>', content)
        pos_h = re.search(r'positionH[^>]*>[\s\S]*?posOffset>(-?\d+)<', content)
        pos_v = re.search(r'positionV[^>]*>[\s\S]*?posOffset>(-?\d+)<', content)
        if not letters or not pos_h or not pos_v:
            continue
        h = int(pos_h.group(1))
        v = int(pos_v.group(1))
        letter = letters[0]
        if h > 150000 and len(letter) <= 2:
            all_indicators.append((m, letter, h, v))

    # Clasificare prin ORDINE în document (nu prin H):
    # Clădiri: 3 indicatori → EP_real(1), EP_ref(2), CO2(3)
    # Apartamente: 2 indicatori → EP_real(1), CO2(2)
    if len(all_indicators) >= 3:
        ep_indicators = all_indicators[:2]  # Primele 2 = EP (real + ref)
        co2_indicators = all_indicators[2:]  # Al 3-lea = CO2
    elif len(all_indicators) == 2:
        ep_indicators = all_indicators[:1]  # Primul = EP real
        co2_indicators = all_indicators[1:]  # Al 2-lea = CO2
    else:
        ep_indicators = all_indicators
        co2_indicators = []

    # Replace EP real indicators (first group — higher posV = further down = typically "B")
    # Template has: ref (A, lower V) then real (B, higher V)
    # So sorted: [0]=ref(A, V=510540), [1]=real(B, V=977265) for single indicators
    # For 4 indicators: [0,1]=ref pair, [2,3]=real pair

    new_xml = body_xml

    # EP indicators: [0]=real, [1]=ref (ordine din document)
    if len(ep_indicators) >= 1:
        # EP REAL (primul indicator)
        m, letter, h, v = ep_indicators[0]
        new_content = m.group(1)
        new_content = re.sub(r'(<w:t[^>]*>)[A-G]\+?(</w:t>)', r'\g<1>' + ep_class_real + r'\g<2>', new_content)
        new_pos = _CLASS_POS_V.get(ep_class_real, v)
        new_content = _update_shape_pos_v(new_content, new_pos)
        new_xml = new_xml.replace(m.group(1), new_content, 1)

    if len(ep_indicators) >= 2:
        # EP REFERINȚĂ (al doilea indicator)
        m, letter, h, v = ep_indicators[1]
        new_content = m.group(1)
        new_content = re.sub(r'(<w:t[^>]*>)[A-G]\+?(</w:t>)', r'\g<1>' + ep_class_ref + r'\g<2>', new_content)
        new_pos = _CLASS_POS_V.get(ep_class_ref, v)
        new_content = _update_shape_pos_v(new_content, new_pos)
        new_xml = new_xml.replace(m.group(1), new_content, 1)

    # Replace CO2 indicators
    for m, letter, h, v in co2_indicators:
        new_content = m.group(1)
        new_content = re.sub(r'(<w:t[^>]*>)[A-G]\+?(</w:t>)', r'\g<1>' + co2_class_real + r'\g<2>', new_content)
        new_pos = _CO2_CLASS_POS_V.get(co2_class_real, v)
        new_content = _update_shape_pos_v(new_content, new_pos)
        new_xml = new_xml.replace(m.group(1), new_content, 1)

    # Parse modified XML back into the document
    new_body = etree.fromstring(new_xml)
    parent = body.getparent()
    parent.replace(body, new_body)


# ═══════════════════════════════════════════════════════
# TOGGLE CHECKBOXES — Anexa form fields
# ═══════════════════════════════════════════════════════
def toggle_checkboxes(doc, indices):
    """Check checkboxes at given indices (0-based) in the document."""
    checkboxes = doc.element.findall(".//w:checkBox", NSMAP)
    indices_set = set(indices)
    for i, cb in enumerate(checkboxes):
        if i in indices_set:
            default_elem = cb.find("w:default", NSMAP)
            if default_elem is not None:
                default_elem.set(qn("w:val"), "1")


# ═══════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════
def format_ro(val, dec=1):
    """Format number with Romanian comma decimal separator."""
    return f"{float(val):.{dec}f}".replace(".", ",")


# ═══════════════════════════════════════════════════════
# MAIN HANDLER
# ═══════════════════════════════════════════════════════
class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(content_length)
            body = json.loads(raw)

            tpl_bytes = base64.b64decode(body["template"])
            data = body.get("data", {})
            mode = body.get("mode", "cpe")
            category = body.get("category", "AL")

            doc = Document(io.BytesIO(tpl_bytes))

            # ═══════════════════════════════════════
            # 1. TEXT REPLACEMENTS — mapare directă
            # ═══════════════════════════════════════
            # ═══ CRITICAL: ordinea contează! ═══
            # Înlocuim pattern-urile LUNGI înainte de cele SCURTE
            # "xxxx,x" ÎNAINTE de "xxxx" (altfel "xxxx" corupe "xxxx,x")
            # "xxx,x" ÎNAINTE de "xx,x" (altfel "xx,x" corupe "xxx,x")
            # "ZZ.LL.AAAA" ÎNAINTE de "AAAA"

            # 1. Secvențiale (cele mai lungi pattern-uri primele)
            ep_total_vals = [data.get("ep_total_real", "0,0"), data.get("ep_total_ref", "0,0")]
            replace_seq(doc, "xxxx,x", ep_total_vals)

            xxx_vals = [data.get("area_ref", "0,0"), data.get("co2_val", "0,0"),
                        data.get("sre_st", "0,0"), data.get("sre_pv", "0,0"),
                        data.get("sre_pc", "0,0"), data.get("sre_bio", "0,0"),
                        data.get("sre_other", "0,0"), data.get("sre_total", "0,0")]
            replace_seq(doc, "xxx,x", xxx_vals)

            xx_vals = [data.get("qf_thermal", "0,0"), data.get("qf_electric", "0,0"),
                       data.get("ep_specific", "0,0"), data.get("ep_ref", "0,0")]
            replace_seq(doc, "xx,x", xx_vals)

            # 2. Înlocuiri simple (de la cele mai lungi la cele mai scurte)
            ordered_replacements = [
                ("II,IIII x LL,LLLL", data.get("gps", "")),
                ("ZZ.LL.AAAA", data.get("auditor_date", "")),
                ("ZZ/LL/AAAA", data.get("auditor_date", "").replace(".", "/")),
                ("XX/XXXXX", data.get("auditor_atestat", "")),
                ("zz/ll/aa", data.get("expiry", "")),
                ("GWP,G", data.get("gwp", "0,0")),
                ("RR,R", data.get("rer", "0,0")),
                ("zzz,z", data.get("area_ref", "")),
                ("yyy,y", data.get("area_gross", "")),
                ("AAAA", data.get("year", "____")),
                ("xxxx", data.get("volume", "")),
                ("regim", data.get("regime", "")),
            ]

            for old, new in ordered_replacements:
                if new:
                    replace_in_doc(doc, old, new)

            # Adresa — nodul conține "adresa" cu puncte
            for para in doc.paragraphs:
                if "adresa" in para.text.lower() and "..." in para.text:
                    for run in para.runs:
                        if "adresa" in run.text.lower() or "..." in run.text:
                            run.text = ""
                    if para.runs:
                        para.runs[0].text = data.get("address", "")
                    break
            # Also check tables
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for para in cell.paragraphs:
                            if "adresa" in para.text.lower() and ("..." in para.text or "." * 5 in para.text):
                                for run in para.runs:
                                    if "adresa" in run.text.lower() or "..." in run.text or "." * 5 in run.text:
                                        run.text = ""
                                if para.runs:
                                    para.runs[0].text = data.get("address", "")

            # Scop CPE — split text "Vânzare/Închiriere/Recepție/Inf"
            scope = data.get("scope", "")
            if scope:
                for para in doc.paragraphs:
                    full = para.text
                    if "nzare" in full or "nchir" in full or "Recep" in full:
                        # Clear all runs with scope text parts and set first one
                        scope_runs = [r for r in para.runs if any(x in r.text for x in ["Vânz", "are", "Închir", "ie", "Recep", "/Inf"])]
                        for r in scope_runs:
                            r.text = ""
                        if scope_runs:
                            scope_runs[0].text = scope
                        break
                for table in doc.tables:
                    for row in table.rows:
                        for cell in row.cells:
                            for para in cell.paragraphs:
                                full = para.text
                                if "nzare" in full or "nchir" in full or "Recep" in full:
                                    scope_runs = [r for r in para.runs if any(x in r.text for x in ["Vânz", "are", "Închir", "ie", "Recep", "/Inf"])]
                                    for r in scope_runs:
                                        r.text = ""
                                    if scope_runs:
                                        scope_runs[0].text = scope

            # Program calcul — "versiunea"
            replace_in_doc(doc, "versiunea", "")
            software = data.get("software", "Zephren v2.0")
            # Clear dots in program section
            for para in doc.paragraphs:
                if "." * 8 in para.text:
                    for run in para.runs:
                        if "." * 8 in run.text:
                            run.text = re.sub(r'\.{8,}', ' ', run.text)
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for para in cell.paragraphs:
                            if "." * 8 in para.text:
                                for run in para.runs:
                                    if "." * 8 in run.text:
                                        run.text = re.sub(r'\.{8,}', ' ', run.text)

            # Auditor name/company/phone/email
            auditor_replacements = {
                "Nume & prenume auditor energetic": data.get("auditor_name", ""),
                "Nume auditor": data.get("auditor_name", ""),
                "nume auditor": data.get("auditor_name", ""),
                "Firma/PFA": data.get("auditor_company", ""),
                "denumire firma": data.get("auditor_company", ""),
                "nr. telefon": data.get("auditor_phone", ""),
                "adresa email": data.get("auditor_email", ""),
                "cod unic": data.get("auditor_mdlpa", ""),
                "Cod unic": data.get("auditor_mdlpa", ""),
            }
            for old, new in auditor_replacements.items():
                if new:
                    replace_in_doc(doc, old, new)

            # nZEB status
            replace_in_doc(doc, "nZEB DA/NU", "nZEB " + data.get("nzeb", "NU"))

            # (secvențialele xxxx,x / xxx,x / xx,x au fost mutate mai sus, ordinea contează)

            # Nr camere (RA)
            if category == "RA":
                replace_in_doc(doc, " x ", " " + data.get("nr_units", "3") + " ")

            # Category label
            cat_label = data.get("category_label", "")
            if cat_label:
                replace_in_doc(doc, "categorie funcțională", cat_label)
                replace_in_doc(doc, "categorie functionala", cat_label)

            # Location
            replace_in_doc(doc, "localitatea", data.get("city", ""))
            replace_in_doc(doc, "județul", data.get("county", ""))
            replace_in_doc(doc, "judetul", data.get("county", ""))
            replace_in_doc(doc, "zona climatică", data.get("climate_zone", ""))
            replace_in_doc(doc, "zona climatica", data.get("climate_zone", ""))

            # GWP lifecycle
            gwp_text = data.get("gwp", "0,0") + " kgCO2eq/m2an"
            replace_in_doc(doc, "GWP lifecycle", gwp_text)

            # ═══════════════════════════════════════
            # 2. SCALE EP — înlocuiesc pragurile template cu EPBD
            # ═══════════════════════════════════════
            new_ep = [int(data.get(k, 0)) for k in ["s_ap", "s_a", "s_b", "s_c", "s_d", "s_e", "s_f"]]
            if any(v > 0 for v in new_ep):
                replace_scales(doc, category, new_ep)

            # ═══════════════════════════════════════
            # 3. CLASS INDICATORS — săgețile pe scale
            # ═══════════════════════════════════════
            ep_cls_real = data.get("ep_class_real", "")
            ep_cls_ref = data.get("ep_class_ref", "")
            co2_cls_real = data.get("co2_class_real", "")
            if ep_cls_real:
                replace_class_indicators(doc, ep_cls_real, ep_cls_ref, co2_cls_real)

            # ═══════════════════════════════════════
            # 4. CHECKBOXES (Anexa)
            # ═══════════════════════════════════════
            if mode == "anexa":
                cb_indices = body.get("checkboxes", [])
                if cb_indices:
                    toggle_checkboxes(doc, cb_indices)

            # ═══════════════════════════════════════
            # 5. FOTO CLĂDIRE — inserare imagine
            # ═══════════════════════════════════════
            photo_b64 = body.get("photo")
            if photo_b64 and photo_b64.startswith("data:image"):
                # Extract base64 data
                match = re.match(r"data:image/(png|jpeg|jpg);base64,(.+)", photo_b64)
                if match:
                    img_data = base64.b64decode(match.group(2))
                    img_stream = io.BytesIO(img_data)
                    # Find "FOTO" text and replace with image
                    body_xml = doc.element.body
                    foto_found = False
                    for t_elem in body_xml.iter(qn("w:t")):
                        if t_elem.text and "FOTO" in t_elem.text:
                            # Replace the paragraph containing FOTO with an image
                            p_elem = t_elem.getparent()
                            while p_elem is not None and p_elem.tag != qn("w:p"):
                                p_elem = p_elem.getparent()
                            if p_elem is not None:
                                # Clear the paragraph
                                for child in list(p_elem):
                                    p_elem.remove(child)
                                # Create a new run with the image
                                from docx.oxml.ns import qn as docx_qn
                                run_elem = etree.SubElement(p_elem, docx_qn("w:r"))
                                # Use python-docx to add inline image
                                from docx.oxml import OxmlElement
                                # Simpler: add image to a temporary paragraph
                                temp_para = doc.add_paragraph()
                                temp_run = temp_para.add_run()
                                temp_run.add_picture(img_stream, width=Inches(1.0))
                                # Move the drawing element to our target paragraph
                                drawing = temp_run._element.find(docx_qn("w:drawing"))
                                if drawing is not None:
                                    run_elem.append(drawing)
                                # Remove temp paragraph
                                temp_para._element.getparent().remove(temp_para._element)
                                foto_found = True
                                break

            # ═══════════════════════════════════════
            # 6. SAVE & RETURN
            # ═══════════════════════════════════════
            buf = io.BytesIO()
            doc.save(buf)
            result = buf.getvalue()

            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
            self.send_header("Content-Disposition", "attachment; filename=CPE.docx")
            self.send_header("Content-Length", str(len(result)))
            self.end_headers()
            self.wfile.write(result)

        except Exception as e:
            self.send_response(500)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
