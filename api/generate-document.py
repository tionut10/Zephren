"""
Vercel Python Serverless Function — Generare documente DOCX consolidat (Sprint 14).

Endpoint unic pentru toate tipurile de documente:
  ?type=cpe     → Anexa 1 simplă (blob DOCX)
  ?type=anexa   → Anexa 1+2 extins (blob DOCX)
  ?type=audit   → Raport audit energetic (JSON {docx: base64, filename})
  ?type=anexa1  → Alias cpe (variantă PDF)
  ?type=anexa2  → Alias anexa (variantă PDF)

Retro-compat: dacă nu se trimite ?type=, se folosește body.mode.

Aplică enforce_a4_portrait() pentru toate documentele generate —
Ord. MDLPA 16/2023 cere strict A4 portret + Calibri 11pt.
"""
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json, io, base64, re, copy
from docx import Document
from docx.shared import Inches, Emu, Pt, Cm
from docx.enum.section import WD_ORIENT
from lxml import etree

# ── Sprint 15 — segno pentru QR scanabil (pure Python, ~200 KB) ──
try:
    import segno  # type: ignore
    _SEGNO_AVAILABLE = True
except ImportError:  # pragma: no cover — dev fallback
    segno = None
    _SEGNO_AVAILABLE = False


# ═══════════════════════════════════════════════════════
# A4 PORTRAIT ENFORCEMENT — Ord. MDLPA 16/2023 Anexa 1
# ═══════════════════════════════════════════════════════
# A4: 11906 × 16838 DXA (1 DXA = 1/1440 inch = 635 EMU)
A4_WIDTH_EMU = 11906 * 635     # 21.0 cm
A4_HEIGHT_EMU = 16838 * 635    # 29.7 cm
A4_MARGIN_EMU = 1417 * 635     # 2.5 cm


def enforce_a4_portrait(doc, preserve_margins=False):
    """Forțează toate secțiunile la A4 portret + margini 2.5 cm + Calibri 11pt.

    Previne regresia în care template-ul moștenește format legacy (Letter,
    Legal, landscape). Ord. MDLPA 16/2023 Anexa 1 cere strict A4 portret
    pentru CPE tipărit.

    preserve_margins=True — pentru template-urile oficiale MDLPA CPE (margini
    top/bottom 5mm, left/right 17.5mm) care încap conținutul pe o singură
    pagină A4. Ord. MDLPA 16/2023 NU impune margini fixe — doar A4 portret.
    """
    for section in doc.sections:
        section.page_width = Emu(A4_WIDTH_EMU)
        section.page_height = Emu(A4_HEIGHT_EMU)
        section.orientation = WD_ORIENT.PORTRAIT
        if not preserve_margins:
            section.top_margin = Emu(A4_MARGIN_EMU)
            section.bottom_margin = Emu(A4_MARGIN_EMU)
            section.left_margin = Emu(A4_MARGIN_EMU)
            section.right_margin = Emu(A4_MARGIN_EMU)
    try:
        if "Normal" in doc.styles:
            normal = doc.styles["Normal"]
            if normal.font.name is None:
                normal.font.name = "Calibri"
            if normal.font.size is None:
                normal.font.size = Pt(11)
    except Exception:
        pass
    return doc

# ═══════════════════════════════════════════════════════
# CONSTANTE — scalele EP și CO2 din template-uri (Mc 001-2022)
# Template-urile rezidențiale folosesc varianta _cool
# ═══════════════════════════════════════════════════════
EP_TEMPLATE_SCALES = {
    "RI": [91, 129, 257, 390, 522, 652, 783],
    "RC": [73, 101, 198, 297, 396, 495, 595],
    "RA": [73, 101, 198, 297, 396, 495, 595],
    "BI": [68, 97, 193, 302, 410, 511, 614],
    "ED": [48, 68, 135, 246, 358, 447, 536],
    "SA": [117, 165, 331, 501, 671, 838, 1005],
    "HC": [67, 93, 188, 321, 452, 565, 678],
    "CO": [88, 124, 248, 320, 393, 492, 591],
    "SP": [75, 104, 206, 350, 494, 617, 741],
    "AL": [68, 97, 193, 302, 410, 511, 614],
}

CO2_TEMPLATE_SCALES = {
    "RI": [16.1, 22.8, 45.5, 70.1, 94.8, 118.4, 142.1],
    "RC": [12.7, 17.6, 34.6, 52.2, 69.9, 87.4, 104.9],
    "RA": [12.7, 17.6, 34.6, 52.2, 69.9, 87.4, 104.9],
    "BI": [10.4, 14.8, 29.7, 46.1, 62.4, 77.8, 93.4],
    "ED": [8.3, 11.6, 23.0, 42.5, 62.2, 77.6, 93.1],
    "SA": [19.7, 27.8, 55.8, 84.0, 112.3, 140.2, 168.1],
    "HC": [11.8, 16.4, 33.1, 57.0, 80.6, 100.7, 120.8],
    "CO": [15.4, 21.6, 43.4, 54.5, 65.7, 82.3, 98.9],
    "SP": [12.3, 17.0, 33.7, 57.4, 81.2, 101.4, 121.7],
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


def _iter_all_paragraphs(doc, include_txbx=True):
    """Generator: yields all Paragraph objects from body, tables, and optionally text boxes."""
    from docx.text.paragraph import Paragraph as DocxPara
    for para in doc.paragraphs:
        yield para
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    yield para
    if include_txbx:
        txbx_tag = qn("w:txbxContent")
        p_tag = qn("w:p")
        for txbx_elem in doc.element.body.iter(txbx_tag):
            for p_elem in txbx_elem.iter(p_tag):
                yield DocxPara(p_elem, None)


# ═══════════════════════════════════════════════════════
# Sprint 15 — Semnătură + Ștampilă + QR helper (injecție imagini)
# ═══════════════════════════════════════════════════════

def _iter_paragraphs_for_placeholder(doc):
    """Iterator peste paragrafe + celule de tabel — pentru căutarea placeholder-urilor
    în întregul document (inclusiv tabele)."""
    for p in doc.paragraphs:
        yield p
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    yield p


def _replace_placeholder_with_image(doc, placeholder, img_bytes, width_cm=4.0):
    """Găsește placeholder în text și îl înlocuiește cu o imagine PNG embed.

    Întoarce numărul de înlocuiri efectuate. Șterge textul placeholder-ului și
    adaugă imaginea în același paragraf. Ordinea textului rămas este păstrată.
    """
    if not img_bytes or not placeholder:
        return 0
    count = 0
    for p in _iter_paragraphs_for_placeholder(doc):
        if placeholder not in p.text:
            continue
        # Găsim run-ul care conține placeholder-ul și îl curățăm
        for run in p.runs:
            if placeholder in run.text:
                # Împărțim textul în [before][placeholder][after]
                before, _, after = run.text.partition(placeholder)
                run.text = before
                # Inserăm imaginea ca run nou (după run-ul curent)
                img_run = p.add_run()
                try:
                    img_run.add_picture(io.BytesIO(img_bytes), width=Cm(width_cm))
                    count += 1
                except Exception:
                    # Imaginea invalidă — lasă placeholder șters fără imagine
                    pass
                if after:
                    p.add_run(after)
                break  # O singură injecție per paragraf (prima apariție)
    return count


def insert_signature_stamp(doc, signature_b64, stamp_b64):
    """Înlocuiește placeholder-urile {{SEMNATURA}} / {{STAMPILA}} cu imaginile PNG.

    Sprint 15 — Ord. MDLPA 16/2023 + uzanță juridică CPE autentificat.

    Semnătură: 5 cm lățime, ștampilă: 3 cm lățime. Dacă template-ul nu are
    placeholder, imaginile sunt adăugate la finalul documentului (ca ultimă soluție).
    """
    sig_count = 0
    stamp_count = 0

    if signature_b64:
        try:
            sig_bytes = base64.b64decode(signature_b64)
            for ph in ["{{SEMNATURA}}", "{{SIGNATURE}}", "[[SIGNATURE]]", "{SEMNATURA}"]:
                sig_count += _replace_placeholder_with_image(doc, ph, sig_bytes, width_cm=5.0)
        except Exception:
            pass

    if stamp_b64:
        try:
            stamp_bytes = base64.b64decode(stamp_b64)
            for ph in ["{{STAMPILA}}", "{{STAMP}}", "[[STAMP]]", "{STAMPILA}"]:
                stamp_count += _replace_placeholder_with_image(doc, ph, stamp_bytes, width_cm=3.0)
        except Exception:
            pass

    # Fallback: dacă template-ul nu are placeholder-uri pentru semnătură/ștampilă,
    # adăugăm un paragraf final „Autentificat" cu ambele imagini — garantează
    # că imaginile ajung în DOCX indiferent de starea template-ului.
    if (signature_b64 or stamp_b64) and sig_count == 0 and stamp_count == 0:
        try:
            p = doc.add_paragraph()
            p.add_run("Semnătură auditor / Ștampilă: ")
            if signature_b64:
                sig_bytes = base64.b64decode(signature_b64)
                p.add_run().add_picture(io.BytesIO(sig_bytes), width=Cm(5.0))
                p.add_run("  ")
            if stamp_b64:
                stamp_bytes = base64.b64decode(stamp_b64)
                p.add_run().add_picture(io.BytesIO(stamp_bytes), width=Cm(3.0))
        except Exception:
            pass

    return {"signature": sig_count, "stamp": stamp_count}


def generate_qr_png(url, scale=5, border=2):
    """Generează un PNG QR scanabil pentru URL-ul dat.

    Folosește segno (pure Python, ~200 KB — NU qrcode+Pillow ~10 MB).
    Error correction M = ~15% rezistență la degradare.
    """
    if not _SEGNO_AVAILABLE or not url:
        return None
    try:
        qr = segno.make(url, error="m")
        buf = io.BytesIO()
        qr.save(buf, kind="png", scale=scale, border=border)
        return buf.getvalue()
    except Exception:
        return None


def insert_qr_code(doc, verify_url, cpe_code=""):
    """Inserează QR code scanabil pentru URL verificare.

    Sprint 15 — autentificare vizuală CPE. URL-ul: https://zephren.ro/verify/{cpeCode}

    Placeholder-uri suportate: {{QR_CODE}}, {{QR}}, [[QR_CODE]]
    Dacă template-ul nu are placeholder, QR nu se inserează (evită glitching DOCX).
    """
    if not verify_url:
        return 0
    qr_bytes = generate_qr_png(verify_url)
    if not qr_bytes:
        return 0
    count = 0
    for ph in ["{{QR_CODE}}", "{{QR}}", "[[QR_CODE]]", "{QR_CODE}"]:
        count += _replace_placeholder_with_image(doc, ph, qr_bytes, width_cm=2.5)
    return count


def replace_in_doc(doc, old_text, new_text, max_count=0):
    """Replace text across entire document (paragraphs + tables + text boxes)."""
    total = 0
    remaining = max_count
    for para in _iter_all_paragraphs(doc, include_txbx=True):
        n = replace_in_paragraph(para, old_text, new_text, remaining if max_count > 0 else 0)
        total += n
        if max_count > 0:
            remaining -= n
            if remaining <= 0:
                return total
    return total


def replace_in_txbx_only(doc, old_text, new_text):
    """Replace text ONLY in text boxes (w:txbxContent). Safe for numeric scale bars."""
    from docx.text.paragraph import Paragraph as DocxPara
    total = 0
    txbx_tag = qn("w:txbxContent")
    p_tag = qn("w:p")
    for txbx_elem in doc.element.body.iter(txbx_tag):
        for p_elem in txbx_elem.iter(p_tag):
            total += replace_in_paragraph(DocxPara(p_elem, None), old_text, new_text)
    return total


def set_nzeb_checkbox(doc, nzeb_ok):
    """Check (DA) or uncheck (NU) the NZEB FORMCHECKBOX in the document via XML manipulation."""
    W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    qW = f'{{{W}}}'

    for p in doc.element.body.iter(f'{qW}p'):
        texts = ''.join(t.text or '' for t in p.iter(f'{qW}t'))
        if 'NZEB' not in texts:
            continue
        for cb in p.iter(f'{qW}checkBox'):
            existing = cb.find(f'{qW}checked')
            if nzeb_ok:
                if existing is None:
                    etree.SubElement(cb, f'{qW}checked')
            else:
                if existing is not None:
                    cb.remove(existing)
            return


def replace_seq(doc, old_text, values):
    """Replace sequential occurrences of old_text with different values (body + tables + text boxes)."""
    idx = [0]

    def do_para(para):
        if idx[0] >= len(values):
            return
        full = para.text
        while old_text in full and idx[0] < len(values):
            replace_in_paragraph(para, old_text, values[idx[0]], count=1)
            idx[0] += 1
            full = para.text

    for para in _iter_all_paragraphs(doc, include_txbx=True):
        do_para(para)


# ═══════════════════════════════════════════════════════
# REPLACE SCALE THRESHOLDS — EP and CO2
# ═══════════════════════════════════════════════════════
def _is_generic_template(doc):
    """Detectează dacă template-ul este cel generic (3-CPE) cu placeholder-uri xxx/yyy."""
    from docx.text.paragraph import Paragraph as DocxPara
    txbx_tag = qn("w:txbxContent")
    p_tag = qn("w:p")
    t_tag = qn("w:t")
    for txbx_elem in doc.element.body.iter(txbx_tag):
        for p_elem in txbx_elem.iter(p_tag):
            texts = ''.join(t.text or '' for t in p_elem.iter(t_tag))
            if 'xxx' in texts.lower() or 'yyy' in texts.lower():
                return True
    return False


def _build_ep_intervals(thresholds):
    """Construiește lista de intervale EP din praguri: ['≤48', '48 … 68', ..., '>536']."""
    intervals = []
    intervals.append("≤" + str(thresholds[0]))
    for i in range(len(thresholds) - 1):
        intervals.append(str(thresholds[i]) + " … " + str(thresholds[i + 1]))
    intervals.append(">" + str(thresholds[-1]))
    return intervals


def _build_co2_intervals(thresholds):
    """Construiește lista de intervale CO2 din praguri: ['≤8,3', '8,3 … 11,6', ..., '> 93,1']."""
    intervals = []
    intervals.append("≤" + format_ro(thresholds[0], 1))
    for i in range(len(thresholds) - 1):
        intervals.append(format_ro(thresholds[i], 1) + " … " + format_ro(thresholds[i + 1], 1))
    intervals.append("> " + format_ro(thresholds[-1], 1))
    return intervals


def _replace_generic_placeholders(doc, new_ep_scale, new_co2_scale):
    """Înlocuiește placeholder-urile xxx/yyy din template-ul generic cu valorile reale.

    Template-ul generic (3-CPE-forma-generala-cladire.docx) conține text boxes cu:
    EP:  ≤xx, xx … xxx, xxx … xxx (×5), >xxxx
    CO2: ≤yy, yy … yyy, yyy … yyy (×5), > yyy

    Fiecare apare de 2 ori (clădire reală + clădire referință).
    Potrivirea se face pe textul COMPLET al paragrafului (nu substring).
    """
    from docx.text.paragraph import Paragraph as DocxPara
    txbx_tag = qn("w:txbxContent")
    p_tag = qn("w:p")
    t_tag = qn("w:t")

    ep_intervals = _build_ep_intervals(new_ep_scale)
    co2_intervals = _build_co2_intervals(new_co2_scale) if new_co2_scale else []

    # Contoare pentru placeholder-urile repetitive (xxx … xxx apare de 10× = 5 clase × 2 dup)
    ep_xxx_count = [0]   # câte „xxx … xxx" am înlocuit (0-9 → clasele B-F × 2)
    co2_yyy_count = [0]  # câte „yyy … yyy" am înlocuit

    def _set_para_text(para, new_text):
        """Înlocuiește tot textul din paragraf cu new_text, păstrând formatarea primului run."""
        runs = para.runs
        if not runs:
            return
        runs[0].text = new_text
        for r in runs[1:]:
            r.text = ""

    for txbx_elem in doc.element.body.iter(txbx_tag):
        for p_elem in txbx_elem.iter(p_tag):
            para = DocxPara(p_elem, None)
            full = para.text.strip()
            if not full:
                continue

            # ── EP placeholders (potrivire EXACTĂ pe text complet) ──
            if full == "\u2264xx" or full == "≤xx":
                # A+ : ≤{threshold[0]}
                _set_para_text(para, ep_intervals[0])
                continue

            if full == "xx \u2026 xxx" or full == "xx … xxx":
                # A : {threshold[0]} … {threshold[1]}
                _set_para_text(para, ep_intervals[1])
                continue

            if full == "xxx \u2026 xxx" or full == "xxx … xxx":
                # B-F : clasele 2-6, fiecare apare de 2 ori (real + ref)
                idx = ep_xxx_count[0] // 2  # 0,1→B  2,3→C  4,5→D  6,7→E  8,9→F
                interval_idx = idx + 2      # ep_intervals[2]=B, [3]=C, etc.
                if interval_idx < len(ep_intervals) - 1:  # nu depășim (ultimul e >G)
                    _set_para_text(para, ep_intervals[interval_idx])
                ep_xxx_count[0] += 1
                continue

            if full.startswith(">xxx") or full.startswith("> xxx"):
                # G : >{threshold[6]}
                _set_para_text(para, ep_intervals[7])
                continue

            # ── CO2 placeholders ──
            if not co2_intervals:
                continue

            if full == "\u2264yy" or full == "≤yy":
                _set_para_text(para, co2_intervals[0])
                continue

            if full == "yy \u2026 yyy" or full == "yy … yyy":
                _set_para_text(para, co2_intervals[1])
                continue

            if full == "yyy \u2026 yyy" or full == "yyy … yyy":
                idx = co2_yyy_count[0] // 2
                interval_idx = idx + 2
                if interval_idx < len(co2_intervals) - 1:
                    _set_para_text(para, co2_intervals[interval_idx])
                co2_yyy_count[0] += 1
                continue

            if full.startswith("> yyy") or full.startswith(">yyy"):
                _set_para_text(para, co2_intervals[7])
                continue


def replace_scales(doc, category, new_ep_scale, new_co2_scale=None):
    """Replace EP/CO2 scale values in text boxes ONLY (safe — no risk of corrupting other numbers).
    Gestionează atât template-urile specifice (cu valori numerice) cât și template-ul
    generic (3-CPE cu placeholder-uri xxx/yyy)."""

    # Detectează template generic cu placeholder-uri
    if _is_generic_template(doc):
        _replace_generic_placeholders(doc, new_ep_scale, new_co2_scale)
        return

    # Template specific — find-and-replace valori numerice existente
    old_ep = EP_TEMPLATE_SCALES.get(category, EP_TEMPLATE_SCALES["AL"])

    for i in range(7):
        if old_ep[i] != new_ep_scale[i]:
            replace_in_txbx_only(doc, str(old_ep[i]), str(new_ep_scale[i]))

    if new_co2_scale:
        old_co2 = CO2_TEMPLATE_SCALES.get(category, CO2_TEMPLATE_SCALES["AL"])
        for i in range(7):
            old_s = format_ro(old_co2[i], 1)
            new_s = format_ro(new_co2_scale[i], 1)
            if old_s != new_s:
                replace_in_txbx_only(doc, old_s, new_s)


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


# Culorile REALE din imaginile de fundal ale template-urilor CPE MDLPA
# Extrase pixel-by-pixel din template-ul DOCX oficial (image1-16.jpeg)
_EP_CLASS_COLORS = {
    "A+": {"vml": "#009B00", "hex": "009B00"},  # verde închis
    "A":  {"vml": "#32C831", "hex": "32C831"},  # verde mediu
    "B":  {"vml": "#00FF00", "hex": "00FF00"},  # verde pur / lime
    "C":  {"vml": "#FFFF00", "hex": "FFFF00"},  # galben pur
    "D":  {"vml": "#F39C00", "hex": "F39C00"},  # chihlimbar
    "E":  {"vml": "#FF6400", "hex": "FF6400"},  # portocaliu
    "F":  {"vml": "#FE4101", "hex": "FE4101"},  # portocaliu-roșu
    "G":  {"vml": "#FE0000", "hex": "FE0000"},  # roșu pur
}

# Scala CO2 din template MDLPA — albastru (A+ → C) → gri (D → G)
_CO2_CLASS_COLORS = {
    "A+": {"vml": "#0000FE", "hex": "0000FE"},  # albastru închis
    "A":  {"vml": "#3265FF", "hex": "3265FF"},  # albastru mediu
    "B":  {"vml": "#009BFF", "hex": "009BFF"},  # albastru deschis
    "C":  {"vml": "#9CD2FF", "hex": "9CD2FF"},  # albastru foarte deschis
    "D":  {"vml": "#BEBEBE", "hex": "BEBEBE"},  # gri deschis
    "E":  {"vml": "#969696", "hex": "969696"},  # gri mediu
    "F":  {"vml": "#646464", "hex": "646464"},  # gri închis
    "G":  {"vml": "#333333", "hex": "333333"},  # gri foarte închis
}


def _text_color_for_bg(hex_color):
    """Culoarea literei din interiorul săgeții — conform specificației MDLPA:
    A+=alb, A=alb, B=negru, C=negru, D=negru, E=negru, F=negru, G=alb.
    Mapare după culoarea de fundal hex a clasei (EP și CO2)."""
    # Tabel fix hex fundal → culoare text
    _FIXED = {
        # EP scale
        "009B00": "FFFFFF",  # A+ verde închis → alb
        "32C831": "FFFFFF",  # A  verde mediu  → alb
        "00FF00": "000000",  # B  verde pur     → negru
        "FFFF00": "000000",  # C  galben        → negru
        "F39C00": "000000",  # D  portocaliu    → negru
        "FF6400": "000000",  # E  portocaliu-roș→ negru
        "FE4101": "000000",  # F  roșu-portocaliu→ negru
        "FE0000": "FFFFFF",  # G  roșu          → alb
        # CO2 scale
        "0000FE": "FFFFFF",  # A+ albastru închis → alb
        "3265FF": "FFFFFF",  # A  albastru mediu  → alb
        "009BFF": "000000",  # B  albastru deschis→ negru
        "3399CC": "000000",  # C  albastru-gri    → negru
        "808080": "000000",  # D  gri mediu       → negru
        "999999": "000000",  # E  gri deschis     → negru
        "AAAAAA": "000000",  # F  gri foarte deschis→ negru
        "333333": "FFFFFF",  # G  gri închis      → alb
    }
    key = hex_color.upper().lstrip("#")
    if key in _FIXED:
        return _FIXED[key]
    # Fallback WCAG pentru culori neprevăzute
    try:
        r = int(key[0:2], 16) / 255.0
        g = int(key[2:4], 16) / 255.0
        b = int(key[4:6], 16) / 255.0
        def lin(c):
            return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
        lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
        return "FFFFFF" if (lum + 0.05) < 0.5 else "000000"
    except Exception:
        return "000000"


def _get_shape_fill_hex(shape_xml):
    """Extrage culoarea de umplere originală din shape (srgbClr sau VML fillcolor)."""
    m = re.search(r'<a:solidFill>\s*<a:srgbClr val="([A-Fa-f0-9]{6})"', shape_xml)
    if m:
        return m.group(1).upper()
    m = re.search(r'fillcolor="[#]?([A-Fa-f0-9]{6})"', shape_xml)
    if m:
        return m.group(1).upper()
    return None


def _is_co2_shape(shape_xml):
    """Returnează True dacă shape-ul este pe scala CO2 (culoare albastră dominantă)."""
    color = _get_shape_fill_hex(shape_xml)
    if not color:
        return False
    try:
        r = int(color[0:2], 16)
        g = int(color[2:4], 16)
        b = int(color[4:6], 16)
        # Scala CO2 din template MDLPA = albastru dominant (B > 100 și B > R * 1.5)
        return b > 100 and b > r * 1.5 and b >= g
    except Exception:
        return False


def _update_shape_color(shape_xml_str, color_info):
    """Update fill color in DrawingML (srgbClr SAU schemeClr SAU noFill) și VML (fillcolor)."""
    result = shape_xml_str
    hex_color = color_info["hex"]
    vml_color = color_info["vml"]
    explicit_fill = '<a:solidFill><a:srgbClr val="' + hex_color + '"/></a:solidFill>'

    # FIX 1: înlocuiește srgbClr explicit (culoare fixă)
    replaced = re.subn(
        r'(<a:solidFill>\s*<a:srgbClr val=")[A-Fa-f0-9]{6}(")',
        r'\g<1>' + hex_color + r'\g<2>',
        result,
        count=1
    )
    result = replaced[0]
    srgb_matched = replaced[1] > 0

    # FIX 2: dacă nu s-a găsit srgbClr, înlocuiește schemeClr (culoare din temă Word)
    # Acoperă <a:schemeClr val="..."/> (self-closing) și <a:schemeClr ...>...</a:schemeClr>
    if not srgb_matched:
        result, n1 = re.subn(
            r'<a:solidFill>\s*<a:schemeClr\b[^/]*/>\s*</a:solidFill>',
            explicit_fill,
            result,
            count=1
        )
        if n1 == 0:
            result = re.sub(
                r'<a:solidFill>\s*<a:schemeClr\b[^>]*>[\s\S]*?</a:schemeClr>\s*</a:solidFill>',
                explicit_fill,
                result,
                count=1
            )

    # FIX 3 (eliminat 19 apr 2026): textbox-urile cu litera au <a:noFill/> intenționat
    # în template-ul oficial MDLPA (transparent) — doar pentagoanele primesc culoarea.
    # Dacă înlocuim noFill cu solidFill, rezultă DUBLĂ SUPRAPUNERE vizibilă (rectangle
    # textbox peste pentagon), cu contururi imperfecte. Lăsăm noFill neatins.

    # VML fillcolor (folosit de Office pentru compatibilitate)
    # Înlocuim fillcolor existent, dar NU adăugăm fillcolor pe shape-uri care au
    # <a:noFill/> în DrawingML — acelea sunt transparente intenționat (textbox cu
    # literă peste pentagon). Suprapunerea colorabilă ar crea rectangle vizibil.
    has_no_fill_drawing = '<a:noFill' in result
    if re.search(r'fillcolor="[^"]*"', result):
        result = re.sub(
            r'fillcolor="[^"]*"',
            'fillcolor="' + vml_color + '"',
            result,
            count=1
        )
    elif not has_no_fill_drawing:
        result = re.sub(
            r'(<v:shape\b)',
            r'\1 fillcolor="' + vml_color + '"',
            result,
            count=1
        )

    return result


def _update_shape_pos_v(shape_xml_str, new_pos_v):
    """Update BOTH the modern (wp:anchor posOffset) and VML fallback (style top:) positions."""
    # 1. Update wp:anchor posOffset
    result = re.sub(
        r'(<wp:positionV[^>]*>[\s\S]*?<wp:posOffset>)-?\d+(</wp:posOffset>)',
        lambda m: m.group(1) + str(new_pos_v) + m.group(2),
        shape_xml_str
    )
    # 2. Update VML fallback style "top:XXpt" — convert EMU to pt (1pt = 12700 EMU)
    new_top_pt = round(new_pos_v / 12700, 1)
    result = re.sub(
        r'(style="[^"]*?)top:\s*-?[\d.]+pt',
        lambda m: m.group(1) + "top:" + str(new_top_pt) + "pt",
        result
    )
    return result


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

    # Colectăm TOATE shape-urile indicator — atât textbox (cu litera) cât și pentagon (path)
    # Fiecare indicator are 2 shape-uri consecutive: textbox + pentagon (sau invers)
    text_indicators = []   # (match, letter, posH, posV) — textbox cu litera
    path_indicators = []   # (match, posH, posV) — pentagon/arrow fără text

    for m in blocks:
        content = m.group(1)
        # Caută litera clasei în <w:t> (Word/VML) ȘI în <a:t> (DrawingML)
        letters_wt = re.findall(r'<w:t[^>]*>([A-G]\+?)</w:t>', content)
        letters_at = re.findall(r'<a:t[^>]*>([A-G]\+?)</a:t>', content)
        letters = letters_wt if letters_wt else letters_at
        pos_h = re.search(r'positionH[^>]*>[\s\S]*?posOffset>(-?\d+)<', content)
        pos_v = re.search(r'positionV[^>]*>[\s\S]*?posOffset>(-?\d+)<', content)
        if not pos_h or not pos_v:
            continue
        h = int(pos_h.group(1))
        v = int(pos_v.group(1))
        is_path = 'coordsize' in content or '<v:path' in content

        if len(letters) > 0 and len(letters[0]) <= 2 and not is_path and v > 0:
            # Inclus indiferent de h — EP shapes au h mic (stânga), CO₂ shapes au h mare (dreapta)
            # Filtrul anterior h > 150000 excludea greșit shape-urile EP cu h mic
            text_indicators.append((m, letters[0], h, v))
        elif is_path and -100000 <= h < 700000:
            # Pentagon/arrow shapes — range extins pentru a include EP pentagon (h≈380365)
            path_indicators.append((m, h, v))

    # Clasificare prin POZIȚIE ORIZONTALĂ (h):
    # Scala EP (stânga) → h mic; Scala CO2 (dreapta) → h mare
    #
    # ATENȚIE: positionH poate fi relativ la "column", "margin" sau "page".
    # Shape-urile ancorate în coloane diferite ale tabelului (EP=stânga, CO₂=dreapta)
    # pot avea posOffset similare deoarece sunt relative la coloana lor, NU la pagină.
    # De aceea, folosim ORDINEA DIN DOCUMENT (XML order) ca fallback — în Word XML,
    # conținutul coloanei stângi apare ÎNAINTEA coloanei drepte.

    # CLASIFICARE ROBUSTĂ: detectăm CO2 indicators după POZIȚIA VERTICALĂ (V)
    # Scala EP și scala CO2 au același spacing (466725 EMU) dar offset diferit de 13335 EMU:
    #   EP:  A=510540, B=977265  |  CO2: A=497205, B=963930
    # Calculăm distanța la fiecare scală și alegem cea mai apropiată.
    # Metoda e fiabilă chiar și când shape-urile nu au fill explicit (noFill).
    def _closest_scale_co2(v):
        """Return True dacă V se potrivește mai bine scalei CO2 decât scalei EP."""
        ep_min  = min(abs(v - vv) for vv in _CLASS_POS_V.values())
        co2_min = min(abs(v - vv) for vv in _CO2_CLASS_POS_V.values())
        return co2_min < ep_min

    ep_indicators_raw = []
    co2_indicators = []
    for ind in text_indicators:
        im, letter, ih, iv = ind
        if _closest_scale_co2(iv):
            co2_indicators.append(ind)
        else:
            ep_indicators_raw.append(ind)

    # Fallback (dacă detecția V nu separă corect): ultimul indicator (cel mai jos) = CO2
    if not co2_indicators and len(ep_indicators_raw) >= 2 and co2_class_real:
        co2_indicators = [ep_indicators_raw[-1]]
        ep_indicators_raw = ep_indicators_raw[:-1]

    # Sortează indicatoarele EP după V: V mic = sus pe scală = EP_ref (clădire referință mai eficientă)
    #                                    V mare = jos pe scală = EP_real (clădire reală)
    # Această sortare e sigură pt. EP (ambele ancorate în aceeași coloană stângă)
    ep_indicators_raw.sort(key=lambda x: x[3])  # sort by v
    if len(ep_indicators_raw) >= 2:
        ep_ref_ind = ep_indicators_raw[0]   # V mic → EP_ref (mai sus = mai eficient)
        ep_real_ind = ep_indicators_raw[1]  # V mare → EP_real
        ep_indicators = [ep_real_ind, ep_ref_ind]  # [0]=real, [1]=ref
    else:
        ep_indicators = ep_indicators_raw

    # Perechi text-pentagon: pentagonul urmează imediat după textbox
    # Construim o mapare: pentru fiecare text indicator, găsim pentagonul cel mai apropiat (următor)
    def find_next_path(text_match, all_paths):
        """Find the path shape immediately AFTER a text shape in the XML."""
        text_end = text_match.end()
        best = None
        best_dist = float('inf')
        for pm, ph, pv in all_paths:
            dist = pm.start() - text_end
            if 0 < dist < best_dist:
                best = (pm, ph, pv)
                best_dist = dist
        return best

    # Replace EP real indicators (first group — higher posV = further down = typically "B")
    # Template has: ref (A, lower V) then real (B, higher V)
    # So sorted: [0]=ref(A, V=510540), [1]=real(B, V=977265) for single indicators
    # For 4 indicators: [0,1]=ref pair, [2,3]=real pair

    new_xml = body_xml

    def move_indicator(text_match, new_class, class_pos_map, old_v, is_co2=False):
        """Move both text indicator AND its paired pentagon shape, and update colors."""
        nonlocal new_xml
        new_pos = class_pos_map.get(new_class, old_v)
        delta_v = new_pos - old_v  # displacement in EMU
        color_map = _CO2_CLASS_COLORS if is_co2 else _EP_CLASS_COLORS
        color = color_map.get(new_class, color_map.get("B"))

        # 1. Update textbox (letter + position + fill color + text color)
        new_content = text_match.group(1)
        # Actualizează litera în elementele Word <w:t> (VML fallback)
        new_content = re.sub(r'(<w:t[^>]*>)[A-G]\+?(</w:t>)', r'\g<1>' + new_class + r'\g<2>', new_content)
        # Actualizează litera și în elementele DrawingML <a:t> (Choice primary)
        new_content = re.sub(r'(<a:t[^>]*>)[A-G]\+?(</a:t>)', r'\g<1>' + new_class + r'\g<2>', new_content)
        # Uniformizare font cu scala statică (Arial Bold) — template mobile folosește
        # AvantGarde Bk BT (font proprietar, substituit cu fallback neuniform de LibreOffice).
        # Păstrez size-ul original 32 (16pt) pentru vizibilitate — scala statică e 9pt dar
        # apare vizual mai mare din context (celule tabel cu auto-scale). La 16pt Arial Bold
        # mobile arată comparabil cu scala statică.
        new_content = re.sub(r'w:ascii="AvantGarde Bk BT"', 'w:ascii="Arial"', new_content)
        new_content = re.sub(r'w:hAnsi="AvantGarde Bk BT"', 'w:hAnsi="Arial"', new_content)
        new_content = re.sub(r'w:cs="AvantGarde Bk BT"', 'w:cs="Arial"', new_content)
        new_content = re.sub(r'typeface="AvantGarde Bk BT"', 'typeface="Arial"', new_content)
        # Centrare verticală în textbox (anchor="t" → "ctr")
        new_content = re.sub(r'anchor="t"', 'anchor="ctr"', new_content)
        # Centrare orizontală — inject <w:jc w:val="center"/> în <w:pPr> dacă nu există
        if '<w:jc' not in new_content:
            new_content = re.sub(r'(<w:pPr>)', r'\g<1><w:jc w:val="center"/>', new_content, count=1)
        # DrawingML paragraph alignment (a:pPr algn="ctr")
        new_content = re.sub(r'<a:pPr\b(?![^>]*algn=)', '<a:pPr algn="ctr"', new_content, count=1)
        # Reduce padding intern pentru mai mult spațiu util (16pt litera în 23pt cx)
        new_content = re.sub(r'lIns="\d+"', 'lIns="0"', new_content)
        new_content = re.sub(r'rIns="\d+"', 'rIns="0"', new_content)
        # Pentru clase 2-char ("A+"), mărește cx cu 35% ca să încapă litera completă
        # (Arial Bold 16pt "A+" ~21pt vs cx=23pt → clipping la margin).
        if len(new_class) > 1:
            new_content = re.sub(
                r'(<wp:extent cx=")(\d+)("\s+cy=")',
                lambda m: m.group(1) + str(int(int(m.group(2)) * 1.35)) + m.group(3),
                new_content
            )
            new_content = re.sub(
                r'(<a:ext cx=")(\d+)("\s+cy=")',
                lambda m: m.group(1) + str(int(int(m.group(2)) * 1.35)) + m.group(3),
                new_content
            )
            new_content = re.sub(
                r'(width:\s*)([\d.]+)(pt)',
                lambda m: m.group(1) + str(round(float(m.group(2)) * 1.35, 1)) + m.group(3),
                new_content
            )
        new_content = _update_shape_pos_v(new_content, new_pos)
        # Actualizează și culoarea de fundal a textbox-ului (solidFill) — altfel litera
        # rămâne colorată cu culoarea implicită din template (nu cu culoarea clasei reale)
        new_content = _update_shape_color(new_content, color)
        # Culoarea textului calculată din luminanța WCAG a fundalului (valabil EP și CO2)
        text_color = _text_color_for_bg(color["hex"])
        if '<w:color' not in new_content:
            # Injectează <w:color> DOAR în rPr-ul run-ului (cel imediat înainte de <w:t>)
            # Regex: </w:rPr>\s*<w:t  → rPr-ul de run, nu cel din <w:pPr> (paragraf default)
            new_content = re.sub(
                r'(<w:rPr>)([\s\S]*?)(</w:rPr>\s*<w:t)',
                r'\g<1>\g<2><w:color w:val="' + text_color + r'"/>\g<3>',
                new_content
            )
        else:
            # Înlocuiește TOATE variantele <w:color .../> (inclusiv cu w:themeColor, w:themeShade etc.)
            new_content = re.sub(r'<w:color\b[^>]*/>', '<w:color w:val="' + text_color + '"/>', new_content)

        # DrawingML text color (a:rPr solidFill) — pentru shape-uri cu text în a:t (nu w:t)
        if '<a:t>' in new_content or '<a:t ' in new_content:
            a_fill = '<a:solidFill><a:srgbClr val="' + text_color + '"/></a:solidFill>'
            # Înlocuiește solidFill din a:rPr (nu din shape fill — cel din a:spPr)
            new_content = re.sub(
                r'(<a:rPr\b[^>]*>)([\s\S]*?)(<a:solidFill>[\s\S]*?</a:solidFill>)([\s\S]*?</a:rPr>)',
                r'\g<1>\g<2>' + a_fill + r'\g<4>',
                new_content
            )
        new_xml = new_xml.replace(text_match.group(1), new_content, 1)

        # 2. Find and update paired pentagon (path shape right after textbox)
        path = find_next_path(text_match, path_indicators)
        if path:
            pm, ph, pv = path
            new_path_pos = pv + delta_v  # same displacement
            new_path_content = pm.group(1)
            new_path_content = _update_shape_pos_v(new_path_content, new_path_pos)
            new_path_content = _update_shape_color(new_path_content, color)
            new_xml = new_xml.replace(pm.group(1), new_path_content, 1)

    # EP indicators: [0]=real, [1]=ref (ordine din document)
    if len(ep_indicators) >= 1:
        m, letter, h, v = ep_indicators[0]
        move_indicator(m, ep_class_real, _CLASS_POS_V, v)

    if len(ep_indicators) >= 2:
        m, letter, h, v = ep_indicators[1]
        move_indicator(m, ep_class_ref, _CLASS_POS_V, v)

    # CO2 indicators
    for m, letter, h, v in co2_indicators:
        move_indicator(m, co2_class_real, _CO2_CLASS_POS_V, v, is_co2=True)

    # Aplică modificările IN-PLACE (nu înlocuim tot body-ul) — evită round-trip-ul XML
    # care poate schimba subtil layout-ul documentului (overflow pagina 2).
    alt_blocks_orig = [m.group(1) for m in alt_pattern.finditer(body_xml)]
    alt_blocks_new  = [m.group(1) for m in alt_pattern.finditer(new_xml)]

    MC_NS  = "http://schemas.openxmlformats.org/markup-compatibility/2006"
    mc_tag = f"{{{MC_NS}}}AlternateContent"
    body_mc_elems = list(body.iter(mc_tag))

    # Construiește string-ul de declarații xmlns din nsmap-ul body-ului
    ns_parts = []
    for prefix, uri in body.nsmap.items():
        if prefix is None:
            ns_parts.append(f'xmlns="{uri}"')
        else:
            ns_parts.append(f'xmlns:{prefix}="{uri}"')
    ns_decls = " ".join(ns_parts)

    for i, (orig_str, new_str) in enumerate(zip(alt_blocks_orig, alt_blocks_new)):
        if orig_str != new_str and i < len(body_mc_elems):
            old_elem = body_mc_elems[i]
            parent_el = old_elem.getparent()
            idx = list(parent_el).index(old_elem)
            try:
                wrapper = etree.fromstring(
                    f'<_wr {ns_decls}>{new_str}</_wr>'.encode("utf-8")
                )
                new_mc_elem = wrapper[0]
                parent_el.remove(old_elem)
                parent_el.insert(idx, new_mc_elem)
            except Exception:
                pass  # Dacă parsing eșuează, păstrăm elementul original
    # Nu e nevoie de doc._Document__body = None — body-ul nu a fost înlocuit


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
# COMPUTE CHECKBOXES — mapare date clădire → indici checkbox Anexa
# ═══════════════════════════════════════════════════════

# U referință Mc 001-2022 (nZEB)
_U_REF_RES = {"PE":0.25,"PR":0.67,"PS":0.29,"PT":0.15,"PP":0.15,"PB":0.29,"PL":0.20,"SE":0.20}
_U_REF_NRES = {"PE":0.33,"PR":0.80,"PS":0.35,"PT":0.17,"PP":0.17,"PB":0.35,"PL":0.22,"SE":0.22}


def compute_checkboxes(data, category):
    """Compute checkbox indices to toggle based on building data.
    Returns list of 0-based indices for the 308-checkbox Anexa clădire template."""
    cbs = []
    is_res = category in ("RI", "RC", "RA")
    u_ref = _U_REF_RES if is_res else _U_REF_NRES

    # Parse opaque U-values
    try:
        opaque_u = json.loads(data.get("opaque_u_values", "[]"))
    except:
        opaque_u = []
    try:
        glaz_max_u = float(data.get("glazing_max_u", "0") or "0")
        if glaz_max_u != glaz_max_u or glaz_max_u < 0:  # NaN sau negativ
            glaz_max_u = 0.0
    except (ValueError, TypeError):
        glaz_max_u = 0.0

    # ══════════════════════════════
    # ANEXA 1 — RECOMANDĂRI (CB 0-47)
    # ══════════════════════════════

    # Anvelopă — bifăm dacă U calculat > U referință
    if any(e.get("type") == "PE" and float(e.get("u", 0)) > u_ref.get("PE", 0.25) for e in opaque_u):
        cbs.append(0)  # Pereți exteriori
    if any(e.get("type") == "PB" and float(e.get("u", 0)) > u_ref.get("PB", 0.29) for e in opaque_u):
        cbs.append(1)  # Planșeu subsol
    if any(e.get("type") in ("PT", "PP") and float(e.get("u", 0)) > u_ref.get(e["type"], 0.15) for e in opaque_u):
        cbs.append(2)  # Terasă/pod
    if any(e.get("type") in ("PL", "SE") and float(e.get("u", 0)) > u_ref.get(e["type"], 0.20) for e in opaque_u):
        cbs.append(3)  # Planșee contact exterior
    # CB5: tâmplărie
    u_glaz_ref = 1.30 if is_res else 1.80
    if glaz_max_u > u_glaz_ref:
        cbs.append(5)
    # CB6: grile ventilare
    vent_type = data.get("ventilation_type", "")
    if not vent_type or vent_type == "natural_neorg":
        cbs.append(6)
    # CB13: robinete termostat
    h_src = data.get("heating_source", "")
    if h_src and h_src not in ("electric_direct", "pc_aer_aer"):
        cbs.append(13)
    # CB21: automatizare
    h_ctrl = data.get("heating_control", "")
    if not h_ctrl or h_ctrl == "manual":
        cbs.append(21)
    # CB25: iluminat LED
    l_type = data.get("lighting_type", "")
    if l_type and l_type != "led":
        cbs.append(25)
    # CB26: senzori prezență
    l_ctrl = data.get("lighting_control", "")
    if not l_ctrl or l_ctrl not in ("sensor_presence", "daylight_dimming"):
        cbs.append(26)
    # CB27: regenerabile
    st_en = data.get("solar_thermal_enabled", "") == "true"
    pv_en = data.get("pv_enabled", "") == "true"
    if not st_en and not pv_en:
        cbs.append(27)
    # CB28: recuperare căldură
    if not vent_type or "hr" not in vent_type:
        cbs.append(28)

    # Cost/Savings/Payback (CB 48-64) — valori estimate
    # Fără financialAnalysis, folosim default-uri
    cbs.append(50)  # 10k-25k EUR (default mediu)
    cbs.append(56)  # 20-30% savings
    cbs.append(62)  # 3-7 ani payback

    # ══════════════════════════════
    # ANEXA 2 — DATE CLĂDIRE (CB 65+)
    # ══════════════════════════════

    # Tip clădire (CB 65=existentă, 66=nouă, 67=existentă nefinalizată)
    year_b = int(data.get("year_built", "2000") or "2000")
    import datetime
    if year_b >= datetime.datetime.now().year - 1:
        cbs.append(66)
    else:
        cbs.append(65)

    # Categoria clădirii (CB 68-111)
    cat_map = {
        "RI": [68, 69], "RC": [68, 71], "RA": [68, 71],
        "BI": [79, 80], "ED": [74, 76], "SA": [86, 87],
        "HC": [94, 95], "CO": [103, 104], "SP": [99, 100],
        "AL": [108, 111],
    }
    for cb in cat_map.get(category, cat_map["AL"]):
        cbs.append(cb)

    # Zone climatice (CB 112-116 = zone I-V)
    try:
        zone_num = int(data.get("climate_zone_num", "3") or "3")
    except (ValueError, TypeError):
        zone_num = 3
    zone_num = max(1, min(5, zone_num))  # clamp 1-5
    cbs.append(111 + zone_num)

    # Zone eoliene (CB 117-120)
    wind_zone = 1 if zone_num <= 2 else (2 if zone_num <= 4 else 3)
    cbs.append(116 + wind_zone)

    # Structura constructivă (CB 127-134) — matching parțial (building.structure e string lung)
    struct_map = [
        ("Zidărie portantă", 127), ("Cadre beton armat", 129),
        ("Panouri prefabricate mari", 133), ("Structură metalică", 132),
        ("Structură lemn", 131), ("Mixtă", 134),
    ]
    struct_text = data.get("structure", "")
    struct_cb = None
    for key, cb in struct_map:
        if key in struct_text:
            struct_cb = cb
            break
    if struct_cb:
        cbs.append(struct_cb)

    # ══════════════════════════════
    # ANEXA 2 — INSTALAȚII
    # ══════════════════════════════

    # ÎNCĂLZIRE (CB 135+)
    if h_src:
        cbs.append(135)  # Da, funcțională
    else:
        cbs.append(137)  # Nu

    if h_src:
        heat_src_map = {
            "gaz_conv": 144, "gaz_cond": 144, "termoficare": 146,
            "electric_direct": 139, "pc_aer_apa": 149, "pc_aer_aer": 139,
            "pc_sol_apa": 149, "pc_apa_apa": 149, "centrala_gpl": 144,
            "cazan_lemn": 138, "cazan_peleti": 138, "soba_teracota": 138,
            "pompa_caldura": 149,
        }
        h_cb = heat_src_map.get(h_src)
        if h_cb:
            cbs.append(h_cb)

    # Tip sistem încălzire
    if h_src == "soba_teracota":
        cbs.append(150)
    elif h_src == "electric_direct":
        cbs.append(154)
    elif h_src:
        cbs.append(151)  # corpuri statice

    # Distribuție
    cbs.append(160)  # inferioară (default)

    # ACM (CB 176+)
    acm_src = data.get("acm_source", "")
    if acm_src:
        cbs.append(176)  # Da
    else:
        cbs.append(178)  # Nu

    if acm_src:
        acm_map = {
            "ct_prop": 181, "boiler_electric": 180, "termoficare": 183,
            "solar_termic": 179, "pc": 186,
        }
        a_cb = acm_map.get(acm_src)
        if a_cb:
            cbs.append(a_cb)

    if acm_src == "boiler_electric":
        cbs.append(187)
    elif acm_src == "ct_prop":
        cbs.append(188)

    cbs.append(195)  # Recirculare nu există (default)

    # RĂCIRE (CB 202+)
    has_cool = data.get("cooling_has", "") == "true"
    if has_cool:
        cbs.append(202)
    else:
        cbs.append(204)

    if has_cool:
        cool_src = data.get("cooling_source", "")
        cool_map = {
            "split": 214, "chiller_aer": 205, "chiller_apa": 206,
            "pc_aer_apa": 207, "pc_apa_apa": 208, "pc_aer_aer": 209,
            "monobloc": 213,
        }
        c_cb = cool_map.get(cool_src)
        if c_cb:
            cbs.append(c_cb)
        cbs.append(229)  # Complet climatizat
        cbs.append(232)  # Fără controlul umidității

    # VENTILARE (CB 256+)
    has_vent = vent_type and vent_type != "natural_neorg"
    if has_vent:
        cbs.append(256)
    else:
        cbs.append(258)

    if vent_type == "natural_neorg":
        cbs.append(259)
    elif vent_type == "natural_org":
        cbs.append(260)
    elif has_vent:
        cbs.append(261)

    if vent_type and "hr" in vent_type:
        cbs.append(270)
    else:
        cbs.append(271)

    # ILUMINAT (CB 272+)
    if l_type:
        cbs.append(272)
    else:
        cbs.append(274)

    if l_ctrl == "manual":
        cbs.append(276)
    elif l_ctrl == "daylight_dimming":
        cbs.extend([277, 278])
    elif l_ctrl == "sensor_presence":
        cbs.extend([277, 279])
    else:
        cbs.append(275)

    if l_type == "fluorescent":
        cbs.append(281)
    elif l_type == "incandescent":
        cbs.append(282)
    elif l_type == "led":
        cbs.append(283)
    else:
        cbs.append(284)

    cbs.append(285)  # Stare bună (default)

    # REGENERABILE (CB 288+)
    if st_en:
        cbs.append(288)
    else:
        cbs.append(289)
    if pv_en:
        cbs.append(290)
    else:
        cbs.append(291)

    hp_en = data.get("heat_pump_enabled", "") == "true"
    if hp_en:
        cbs.append(292)
    else:
        cbs.append(293)

    if hp_en:
        hp_type_map = {
            "sol_apa_deschisa": 294, "sol_apa_inchisa": 295,
            "aer_apa": 296, "aer_aer": 297, "apa_aer": 298, "sol_aer": 299,
        }
        hp_cb = hp_type_map.get(data.get("heat_pump_type", ""))
        if hp_cb:
            cbs.append(hp_cb)

    bio_en = data.get("biomass_enabled", "") == "true"
    if bio_en:
        cbs.append(301)
    else:
        cbs.append(302)

    if bio_en:
        bio_type = data.get("biomass_type", "")
        if bio_type == "peleti":
            cbs.append(303)
        elif bio_type == "brichete":
            cbs.append(304)
        else:
            cbs.append(305)

    wind_en = data.get("wind_enabled", "") == "true"
    if wind_en:
        cbs.append(306)
    else:
        cbs.append(307)

    # ══════════════════════════════
    # BACS (CB 308+) — EN 15232-1
    # Dacă template-ul are câmpuri BACS (Anexe cu CB 308-311)
    # ══════════════════════════════
    bacs_class = data.get("bacs_class", "C")
    bacs_cb_map = {"A": 308, "B": 309, "C": 310, "D": 311}
    bacs_cb = bacs_cb_map.get(bacs_class)
    if bacs_cb:
        cbs.append(bacs_cb)

    # SRI readiness (CB 312+)
    sri_total = int(data.get("sri_total", "0") or "0")
    if sri_total >= 70:
        cbs.append(312)  # SRI class A
    elif sri_total >= 50:
        cbs.append(313)  # SRI class B
    elif sri_total >= 30:
        cbs.append(314)  # SRI class C
    else:
        cbs.append(315)  # SRI class D

    return cbs


# ═══════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════
def format_ro(val, dec=1):
    """Format number with Romanian comma decimal separator."""
    return f"{float(val):.{dec}f}".replace(".", ",")


# ═══════════════════════════════════════════════════════
# COLORARE CLASE ENERGETICE PER UTILITATE — tabelul de jos CPE
# ═══════════════════════════════════════════════════════
def _highlight_utility_class_cells(doc, data):
    """Colorează cu culoarea clasei energetice celula din tabelul de jos CPE
    care conține intervalul corespunzător consumului per utilitate.
    Culorile corespund scalei EP: A+=verde închis → G=roșu."""
    import re as _re
    from docx.oxml import OxmlElement as _OxmlElement

    # EP valori per utilitate (kWh/m²·an) — trimise din frontend
    def _parse_ro(s):
        try:
            return float((s or "0").replace(",", "."))
        except Exception:
            return 0.0

    ep_vals = {
        "incalzire": _parse_ro(data.get("ep_incalzire", "")),
        "acm":       _parse_ro(data.get("ep_acm", "")),
        "racire":    _parse_ro(data.get("ep_racire", "")),
        "ventilare": _parse_ro(data.get("ep_ventilare", "")),
        "iluminat":  _parse_ro(data.get("ep_iluminat", "")),
    }

    # Culori per clasă (0=A+, 1=A, ..., 7=G) — identice cu _EP_CLASS_COLORS
    _COL_FILLS = ["009B00", "32C831", "00FF00", "FFFF00", "F39C00", "FF6400", "FE4101", "FE0000"]

    # Mapare cuvinte-cheie rând → cheie ep
    _ROW_MAP = [
        (["ncălzire", "ncalzire", "eating"],  "incalzire"),
        (["Ap", "caldă", "calda", "ACM"],     "acm"),
        (["Răcire", "Racire", "ooling"],       "racire"),
        (["Ventilare", "entilat"],             "ventilare"),
        (["luminat", "ghting"],                "iluminat"),
    ]

    def _apply_shading(cell, fill_hex):
        tc = cell._tc
        tcPr = tc.find(qn("w:tcPr"))
        if tcPr is None:
            tcPr = _OxmlElement("w:tcPr")
            tc.insert(0, tcPr)
        shd = tcPr.find(qn("w:shd"))
        if shd is None:
            shd = _OxmlElement("w:shd")
            tcPr.append(shd)
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:color"), "auto")
        shd.set(qn("w:fill"), fill_hex)

    def _text_color_for_bg(fill_hex):
        """Negru sau alb — alege culoarea cu contrast WCAG mai mare față de fundal."""
        def to_lin(c8):
            v = c8 / 255.0
            return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
        r = int(fill_hex[0:2], 16)
        g = int(fill_hex[2:4], 16)
        b = int(fill_hex[4:6], 16)
        L = 0.2126 * to_lin(r) + 0.7152 * to_lin(g) + 0.0722 * to_lin(b)
        # Pragul de echilibru: L=0.179 → contrast alb = contrast negru
        # Sub prag → alb are contrast mai mare; peste prag → negru are contrast mai mare
        return "FFFFFF" if L < 0.179 else "000000"

    def _format_ro(val):
        """Formatează număr cu 1 zecimală, virgulă românească."""
        return "{:.1f}".format(val).replace(".", ",")

    def _set_cell_text(cell, text, fill_hex, force_black=False):
        """Înlocuiește textul celulei cu valoarea reală, păstrând formatarea."""
        tc = cell._tc
        text_color = "000000" if force_black else _text_color_for_bg(fill_hex)
        # Colectăm proprietățile run-ului existent (dimensiune font etc.)
        existing_sz = None
        for p in tc.iter(qn("w:p")):
            for r in p.iter(qn("w:r")):
                rPr = r.find(qn("w:rPr"))
                if rPr is not None:
                    sz_el = rPr.find(qn("w:sz"))
                    if sz_el is not None:
                        existing_sz = sz_el.get(qn("w:val"))
                break
            if existing_sz:
                break
        # Ștergem toate paragrafele și recreem unul singur centrat
        for p in list(tc.findall(qn("w:p"))):
            tc.remove(p)
        # Paragraph nou
        p_new = _OxmlElement("w:p")
        pPr = _OxmlElement("w:pPr")
        jc = _OxmlElement("w:jc")
        jc.set(qn("w:val"), "center")
        pPr.append(jc)
        sp = _OxmlElement("w:spacing")
        sp.set(qn("w:before"), "0")
        sp.set(qn("w:after"), "0")
        pPr.append(sp)
        p_new.append(pPr)
        # Run nou
        r_new = _OxmlElement("w:r")
        rPr = _OxmlElement("w:rPr")
        # Bold
        b_el = _OxmlElement("w:b")
        rPr.append(b_el)
        # Culoare text
        color_el = _OxmlElement("w:color")
        color_el.set(qn("w:val"), text_color)
        rPr.append(color_el)
        # Dimensiune font (dacă am extras-o)
        if existing_sz:
            sz_new = _OxmlElement("w:sz")
            sz_new.set(qn("w:val"), existing_sz)
            rPr.append(sz_new)
            szCs_new = _OxmlElement("w:szCs")
            szCs_new.set(qn("w:val"), existing_sz)
            rPr.append(szCs_new)
        r_new.append(rPr)
        t_el = _OxmlElement("w:t")
        t_el.text = text
        r_new.append(t_el)
        p_new.append(r_new)
        tc.append(p_new)

    def _parse_range(text):
        """Returnează (lo, hi) din text ca '≤30', '30...42', '>484'."""
        text = text.replace("\xa0", " ").strip()
        le_m = _re.search(r"[≤<]\s*([\d,\.]+)", text)
        gt_m = _re.search(r"[>]\s*([\d,\.]+)", text)
        rng_m = _re.search(r"([\d,\.]+)\s*[.\-–…]+\s*([\d,\.]+)", text)
        if le_m:
            return (None, float(le_m.group(1).replace(",", ".")))
        if rng_m:
            return (float(rng_m.group(1).replace(",", ".")), float(rng_m.group(2).replace(",", ".")))
        if gt_m:
            return (float(gt_m.group(1).replace(",", ".")), None)
        return None

    def _in_range(v, rng):
        lo, hi = rng
        if lo is None: return v <= hi
        if hi is None: return v > lo
        return lo <= v <= hi

    # Găsește tabelul cu "Clasă energetică" și utility rows
    target = None
    for tbl in doc.tables:
        txt = " ".join(c.text for r in tbl.rows for c in r.cells)
        if ("lasă energetic" in txt or "lasa energetic" in txt) and \
           ("ncălzire" in txt or "ncalzire" in txt or "eating" in txt):
            target = tbl
            break
    if not target:
        return

    def _clear_placeholder_cell(cell):
        """Șterge colorarea și textul placeholder dintr-o celulă din template."""
        tc = cell._tc
        tcPr = tc.find(qn("w:tcPr"))
        if tcPr is not None:
            shd = tcPr.find(qn("w:shd"))
            if shd is not None:
                tcPr.remove(shd)
        for p in list(tc.findall(qn("w:p"))):
            tc.remove(p)
        p_empty = _OxmlElement("w:p")
        tc.append(p_empty)

    # ── Detectare template generic (placeholder-uri cXA, cXB în loc de valori numerice) ──
    _is_generic_util_table = False
    for row in target.rows:
        for c in row.cells:
            if "c1A" in c.text or "c2A" in c.text:
                _is_generic_util_table = True
                break
        if _is_generic_util_table:
            break

    # ── Completare placeholder-uri cXA...cXB cu intervale calculate ──
    # Template-ul generic are: ≤ c1A, c1A ... c1B, ..., >c1G
    # Le înlocuim cu praguri EP per utilitate (proporționale cu scala globală)
    if _is_generic_util_table:
        ep_thresholds_data = []
        try:
            ep_thresholds_data = [int((data.get(k, "0") or "0")) for k in
                                  ["s_ap", "s_a", "s_b", "s_c", "s_d", "s_e", "s_f"]]
        except Exception:
            ep_thresholds_data = []

        if any(t > 0 for t in ep_thresholds_data):
            # Proporții per utilitate (tipice Mc 001-2022)
            _UTILITY_FRACTIONS = {
                "1": [0.41, 0.41, 0.42, 0.43, 0.43, 0.43, 0.43],  # încălzire
                "2": [0.29, 0.29, 0.29, 0.19, 0.18, 0.17, 0.17],  # ACM
                "3": [0.18, 0.18, 0.18, 0.12, 0.12, 0.11, 0.13],  # răcire
                "4": [0.05, 0.05, 0.05, 0.04, 0.04, 0.03, 0.03],  # ventilare
                "5": [0.07, 0.07, 0.07, 0.07, 0.08, 0.08, 0.08],  # iluminat
            }
            for util_key in ["1", "2", "3", "4", "5"]:
                fracs = _UTILITY_FRACTIONS[util_key]
                util_thresholds = [max(1, round(ep_thresholds_data[i] * fracs[i])) for i in range(7)]
                # Înlocuiri: ≤ cXA → ≤ val, cXA ... cXB → val ... val, >cXG → >val
                labels = ["A", "B", "C", "D", "E", "F", "G"]
                for para in _iter_all_paragraphs(doc, include_txbx=False):
                    pass  # Skip — lucrăm direct pe celulele tabelului

                for row in target.rows:
                    for cell in row.cells:
                        ct = cell.text
                        # Procesăm orice celulă cu cX (util_key=1-5) — inclusiv cXB, cXC etc.
                        if f"c{util_key}" not in ct:
                            continue
                        # Înlocuim fiecare label cXA → prag[0], cXB → prag[1], ..., cXG → prag[6]
                        for i, lbl in enumerate(labels):
                            old_token = f"c{util_key}{lbl}"
                            if old_token in ct:
                                for para in cell.paragraphs:
                                    replace_in_paragraph(para, old_token, str(util_thresholds[i]))
                                ct = cell.text  # refresh after replacement

    for row in target.rows:
        cells = row.cells
        if len(cells) < 3:
            continue
        first_text = cells[0].text.strip()

        ep_key = None
        for keywords, key in _ROW_MAP:
            if any(kw in first_text for kw in keywords):
                ep_key = key
                break
        if ep_key is None:
            continue

        # Deduplifică celulele fuzionate (python-docx returnează duplicate la merge)
        seen_ids = set()
        unique = []
        for c in cells:
            cid = id(c._tc)
            if cid not in seen_ids:
                seen_ids.add(cid)
                unique.append(c)

        # Celule cu placeholder "Consum înc/răc/vm/il" — completăm cu intervalul
        # per utilitate (nu cel global EP). Folosim pragurile calculate per utilitate.
        _PLACEHOLDER_KEYWORDS = ["Consum ", "consum ", "CONSUM"]
        # Determinăm care utilitate este (1-5) pe baza ep_key
        _UTIL_KEY_MAP = {"incalzire": "1", "acm": "2", "racire": "3", "ventilare": "4", "iluminat": "5"}
        _util_k = _UTIL_KEY_MAP.get(ep_key, "")
        for ci, cell in enumerate(unique[1:], start=1):
            ct = cell.text.strip()
            if any(kw in ct for kw in _PLACEHOLDER_KEYWORDS):
                # Calculăm pragurile per utilitate (fracție × EP global)
                if _util_k and any(t > 0 for t in ep_thresholds_data):
                    _UTIL_FRACS = {
                        "1": [0.41, 0.41, 0.42, 0.43, 0.43, 0.43, 0.43],
                        "2": [0.29, 0.29, 0.29, 0.19, 0.18, 0.17, 0.17],
                        "3": [0.18, 0.18, 0.18, 0.12, 0.12, 0.11, 0.13],
                        "4": [0.05, 0.05, 0.05, 0.04, 0.04, 0.03, 0.03],
                        "5": [0.07, 0.07, 0.07, 0.07, 0.08, 0.08, 0.08],
                    }
                    fracs = _UTIL_FRACS.get(_util_k, [0.2]*7)
                    ut = [max(1, round(ep_thresholds_data[i] * fracs[i])) for i in range(7)]
                    if ci == 1:
                        interval_text = "\u2264 " + str(ut[0])
                    elif 2 <= ci <= 7:
                        interval_text = str(ut[ci - 2]) + "  ...  " + str(ut[ci - 1])
                    elif ci == 8:
                        interval_text = ">" + str(ut[6])
                    else:
                        interval_text = ""
                    if interval_text:
                        _set_cell_text(cell, interval_text, "FFFFFF", force_black=True)
                        _apply_shading(cell, "FFFFFF")
                    else:
                        _clear_placeholder_cell(cell)
                else:
                    _clear_placeholder_cell(cell)

        ep_val = ep_vals.get(ep_key, 0.0)
        if ep_val <= 0:
            continue
        # unique[0] = coloana etichetă; unique[1..8] = A+ → G
        # Prioritate: thresholds din date (corecte per categorie/nocool)
        # Fallback: parsare text template (compatibilitate)
        col_idx = None
        ep_thresholds_data = []
        try:
            ep_thresholds_data = [int((data.get(k, "0") or "0")) for k in
                                  ["s_ap", "s_a", "s_b", "s_c", "s_d", "s_e", "s_f"]]
        except Exception:
            ep_thresholds_data = []

        if any(t > 0 for t in ep_thresholds_data):
            # Clasificare directă cu pragurile reale (nu range-ul din template)
            class_idx_direct = len(ep_thresholds_data)  # default: G
            for i, t in enumerate(ep_thresholds_data):
                if ep_val <= t:
                    class_idx_direct = i
                    break
            col_idx = class_idx_direct + 1  # unique[0]=label, unique[1]=A+ etc.
        else:
            # Fallback: parsare text template
            for i in range(1, len(unique)):
                rng = _parse_range(unique[i].text)
                if rng and _in_range(ep_val, rng):
                    col_idx = i
                    break

        if col_idx is None:
            continue

        class_idx = col_idx - 1  # 0=A+, 1=A, ..., 7=G
        if 0 <= class_idx < len(_COL_FILLS):
            fill = _COL_FILLS[class_idx]
            _apply_shading(unique[col_idx], fill)
            _set_cell_text(unique[col_idx], _format_ro(ep_val), fill, force_black=True)

    # ── Forțăm text negru pe TOATE celulele din tabelul de utilități ──
    # Template-ul generic are culoare roșie (FF0000) hardcodată pe placeholder-uri
    for row in target.rows:
        for cell in row.cells:
            tc = cell._tc
            for r_el in tc.iter(qn("w:r")):
                rPr = r_el.find(qn("w:rPr"))
                if rPr is not None:
                    color_el = rPr.find(qn("w:color"))
                    if color_el is not None:
                        color_el.set(qn("w:val"), "000000")
                    else:
                        c_new = _OxmlElement("w:color")
                        c_new.set(qn("w:val"), "000000")
                        rPr.append(c_new)


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

    # ═══════════════════════════════════════════════════════
    # AUDIT REPORT — raport audit energetic Mc 001-2022 Partea IV
    # (Sprint 14 — schelet; Sprint 16 extinde cap. 4/7/8)
    # ═══════════════════════════════════════════════════════
    def _handle_audit_report(self, body):
        """Generează raport audit DOCX de la zero (fără template).

        Întoarce JSON {docx: base64, filename} — contract așteptat de
        AuditReport.jsx:90-97.
        """
        try:
            from docx.shared import Pt as _Pt, Cm as _Cm
            from docx.enum.text import WD_ALIGN_PARAGRAPH

            building = body.get("building", {}) or {}
            inst = body.get("instSummary", {}) or {}
            renew = body.get("renewSummary", {}) or {}
            auditor = body.get("auditor", {}) or {}
            en_class = body.get("energyClass", {}) or {}
            opaque = body.get("opaqueElements", []) or []
            glazing = body.get("glazingElements", []) or []
            bridges = body.get("thermalBridges", []) or []
            measured = body.get("measuredConsumption", {}) or {}

            doc = Document()
            enforce_a4_portrait(doc)

            # ── Antet ──────────────────────────────────
            title = doc.add_paragraph()
            title.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = title.add_run("RAPORT AUDIT ENERGETIC")
            r.bold = True
            r.font.size = _Pt(16)

            sub = doc.add_paragraph()
            sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
            rs = sub.add_run("Mc 001-2022, Partea IV — Ord. MDLPA 16/2023")
            rs.font.size = _Pt(10)
            rs.italic = True

            doc.add_paragraph()

            # ── Capitol 1. Date identificare ───────────
            h1 = doc.add_paragraph()
            rh1 = h1.add_run("1. Date de identificare a clădirii")
            rh1.bold = True
            rh1.font.size = _Pt(13)

            tbl = doc.add_table(rows=0, cols=2)
            tbl.style = "Light Grid Accent 1"
            def _row(k, v):
                row = tbl.add_row().cells
                row[0].text = k
                row[1].text = str(v) if v not in (None, "", []) else "—"
            _row("Adresă", building.get("address", ""))
            _row("Localitate", building.get("city", ""))
            _row("Județ", building.get("county", ""))
            _row("An construcție", building.get("yearBuilt", ""))
            _row("Categorie funcțională", building.get("category", ""))
            _row("Arie utilă de referință Au", f"{building.get('areaUseful', '') or '—'} m²")
            _row("Volum încălzit V", f"{building.get('volume', '') or '—'} m³")
            _row("Număr apartamente", building.get("units", ""))

            doc.add_paragraph()

            # ── Capitol 2. Auditor energetic ───────────
            h2 = doc.add_paragraph()
            rh2 = h2.add_run("2. Auditor energetic")
            rh2.bold = True
            rh2.font.size = _Pt(13)

            tbl2 = doc.add_table(rows=0, cols=2)
            tbl2.style = "Light Grid Accent 1"
            def _row2(k, v):
                row = tbl2.add_row().cells
                row[0].text = k
                row[1].text = str(v) if v not in (None, "", []) else "—"
            _row2("Nume prenume", auditor.get("name", ""))
            _row2("Firmă/PFA", auditor.get("company", ""))
            _row2("Atestat nr.", auditor.get("atestat", ""))
            _row2("Gradul", auditor.get("grade", ""))
            _row2("Telefon", auditor.get("phone", ""))
            _row2("Email", auditor.get("email", ""))
            _row2("Data", auditor.get("date", ""))
            _row2("Cod unic MDLPA", auditor.get("mdlpaCode", ""))

            doc.add_paragraph()

            # ── Capitol 3. Performanță energetică ──────
            h3 = doc.add_paragraph()
            rh3 = h3.add_run("3. Indicatori performanță energetică calculați")
            rh3.bold = True
            rh3.font.size = _Pt(13)

            tbl3 = doc.add_table(rows=0, cols=2)
            tbl3.style = "Light Grid Accent 1"
            def _row3(k, v):
                row = tbl3.add_row().cells
                row[0].text = k
                row[1].text = str(v) if v not in (None, "", []) else "—"
            _row3("Clasă energetică EP", en_class.get("cls", "—"))
            _row3("EP total [kWh/(m²·an)]",
                  f"{renew.get('ep_adjusted_m2', inst.get('ep_total_m2', '—'))}")
            _row3("CO₂ specific [kg/(m²·an)]",
                  f"{renew.get('co2_adjusted_m2', inst.get('co2_total_m2', '—'))}")
            _row3("RER [%]", f"{renew.get('rer', '—')}")
            _row3("Qf total [kWh/an]", f"{inst.get('qf_total', '—')}")
            _row3("LENI [kWh/(m²·an)]", f"{inst.get('leni', '—')}")

            doc.add_paragraph()

            # ── Capitol 4. Conformitate (Sprint 16 extinde) ──
            h4 = doc.add_paragraph()
            rh4 = h4.add_run("4. Evaluare conformitate normativă")
            rh4.bold = True
            rh4.font.size = _Pt(13)
            p4 = doc.add_paragraph()
            p4.add_run("Verificare transmitanțe termice U vs. C 107-2005, "
                       "consum primar Q_p vs. Ord. 16/2023, "
                       "conformitate nZEB conform L.238/2024 Art. 6. "
                       "Detaliere în Sprint 16.").italic = True

            doc.add_paragraph()

            # ── Capitol 5. Anvelopa opacă + vitrată ────
            if opaque:
                h5 = doc.add_paragraph()
                rh5 = h5.add_run("5. Anvelopa termică — elemente opace")
                rh5.bold = True
                rh5.font.size = _Pt(13)

                tbl5 = doc.add_table(rows=1, cols=4)
                tbl5.style = "Light Grid Accent 1"
                hdr = tbl5.rows[0].cells
                hdr[0].text = "Element"
                hdr[1].text = "Denumire"
                hdr[2].text = "Arie [m²]"
                hdr[3].text = "U [W/(m²·K)]"
                for el in opaque:
                    cells = tbl5.add_row().cells
                    cells[0].text = str(el.get("type", ""))
                    cells[1].text = str(el.get("name", ""))
                    cells[2].text = str(el.get("area", ""))
                    cells[3].text = str(el.get("u", "") or "—")

            if glazing:
                doc.add_paragraph()
                h5b = doc.add_paragraph()
                rh5b = h5b.add_run("5.b Anvelopa termică — elemente vitrate")
                rh5b.bold = True
                rh5b.font.size = _Pt(13)

                tbl5b = doc.add_table(rows=1, cols=3)
                tbl5b.style = "Light Grid Accent 1"
                hdr = tbl5b.rows[0].cells
                hdr[0].text = "Denumire"
                hdr[1].text = "Arie [m²]"
                hdr[2].text = "U [W/(m²·K)]"
                for el in glazing:
                    cells = tbl5b.add_row().cells
                    cells[0].text = str(el.get("name", ""))
                    cells[1].text = str(el.get("area", ""))
                    cells[2].text = str(el.get("u", "") or "—")

            doc.add_paragraph()

            # ── Capitol 6. Consum măsurat vs. calculat ──
            if measured:
                h6 = doc.add_paragraph()
                rh6 = h6.add_run("6. Consum măsurat vs. calculat")
                rh6.bold = True
                rh6.font.size = _Pt(13)

                tbl6 = doc.add_table(rows=1, cols=3)
                tbl6.style = "Light Grid Accent 1"
                hdr = tbl6.rows[0].cells
                hdr[0].text = "Utilitate"
                hdr[1].text = "Măsurat [kWh/an]"
                hdr[2].text = "Calculat [kWh/an]"
                for util_key, util_label in [
                    ("heating", "Încălzire"),
                    ("cooling", "Răcire"),
                    ("acm", "ACM"),
                    ("lighting", "Iluminat"),
                ]:
                    cells = tbl6.add_row().cells
                    cells[0].text = util_label
                    cells[1].text = str(measured.get(util_key, "—"))
                    calc_key = f"qf_{util_key[0]}"
                    cells[2].text = str(inst.get(calc_key, "—"))

            doc.add_paragraph()

            # ── Capitol 7. Concluzii (Sprint 16 extinde) ──
            h7 = doc.add_paragraph()
            rh7 = h7.add_run("7. Concluzii și recomandări")
            rh7.bold = True
            rh7.font.size = _Pt(13)
            p7 = doc.add_paragraph()
            p7.add_run("Măsurile de reabilitare și estimarea economiilor sunt "
                       "detaliate în Anexa 2 a CPE asociat și vor fi extinse "
                       "în Sprint 16 (auto-generate + editor text).").italic = True

            # ── Semnătură ──────────────────────────────
            doc.add_paragraph()
            doc.add_paragraph()
            sig = doc.add_paragraph()
            sig.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            sig.add_run(f"Auditor energetic: {auditor.get('name', '—')}\n")
            sig.add_run(f"Atestat nr.: {auditor.get('atestat', '—')}\n")
            sig.add_run(f"Data: {auditor.get('date', '—')}")

            # Sprint 15 — embed semnătură + ștampilă dacă există
            sig_b64 = auditor.get("signatureDataURL", "") or ""
            stamp_b64 = auditor.get("stampDataURL", "") or ""
            if sig_b64 and "," in sig_b64:
                sig_b64 = sig_b64.split(",", 1)[1]
            if stamp_b64 and "," in stamp_b64:
                stamp_b64 = stamp_b64.split(",", 1)[1]
            if sig_b64 or stamp_b64:
                p_imgs = doc.add_paragraph()
                p_imgs.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                if sig_b64:
                    try:
                        p_imgs.add_run().add_picture(
                            io.BytesIO(base64.b64decode(sig_b64)), width=Cm(5.0)
                        )
                        p_imgs.add_run("  ")
                    except Exception:
                        pass
                if stamp_b64:
                    try:
                        p_imgs.add_run().add_picture(
                            io.BytesIO(base64.b64decode(stamp_b64)), width=Cm(3.0)
                        )
                    except Exception:
                        pass

            # Sprint 15 — QR code pentru verificare (dacă auditor.cpeCode există)
            cpe_code_audit = auditor.get("cpeCode") or auditor.get("mdlpaCode") or ""
            if cpe_code_audit:
                qr_bytes = generate_qr_png(f"https://zephren.ro/verify/{cpe_code_audit}")
                if qr_bytes:
                    p_qr = doc.add_paragraph()
                    p_qr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                    try:
                        p_qr.add_run().add_picture(io.BytesIO(qr_bytes), width=Cm(2.5))
                        p_qr.add_run(f"\nVerificare: zephren.ro/verify/{cpe_code_audit}")
                    except Exception:
                        pass

            buf = io.BytesIO()
            doc.save(buf)
            docx_bytes = buf.getvalue()
            docx_b64 = base64.b64encode(docx_bytes).decode("ascii")

            addr_slug = re.sub(r"[^A-Za-z0-9]+", "_",
                               (building.get("address", "") or "cladire"))[:40]
            filename = f"raport_audit_{addr_slug or 'cladire'}.docx"

            response = json.dumps({"docx": docx_b64, "filename": filename})
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response.encode("utf-8"))
        except Exception as e:
            import traceback
            err_body = json.dumps({
                "error": str(e),
                "trace": traceback.format_exc()[-2000:],
            })
            self.send_response(500)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(err_body.encode("utf-8"))

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(content_length)
            body = json.loads(raw)

            # ═══════════════════════════════════════
            # Routing pe ?type= query (Sprint 14 consolidation)
            # Fallback retro-compat: body.mode
            # ═══════════════════════════════════════
            parsed_url = urlparse(self.path)
            qs = parse_qs(parsed_url.query or "")
            doc_type = (qs.get("type", [""])[0] or "").lower()

            # ── Ramură separată: raport audit energetic ──────────────
            # Întoarce JSON {docx: base64, filename} — flux diferit de CPE,
            # generează DOCX de la zero (fără template MDLPA).
            if doc_type == "audit":
                return self._handle_audit_report(body)

            # ── Alias-uri anexa1/anexa2 pentru variantele PDF ────────
            if doc_type in ("anexa1", "cpe", ""):
                effective_mode = body.get("mode", "cpe") if doc_type == "" else "cpe"
            elif doc_type in ("anexa", "anexa2"):
                effective_mode = "anexa"
            else:
                # type necunoscut → fallback la body.mode
                effective_mode = body.get("mode", "cpe")

            tpl_bytes = base64.b64decode(body["template"])
            data = body.get("data", {})
            mode = effective_mode
            category = body.get("category", "AL")

            doc = Document(io.BytesIO(tpl_bytes))

            # ═══════════════════════════════════════
            # A4 ENFORCEMENT — păstrează marginile template-ului MDLPA (5mm top/bot,
            # 17.5mm left/right) care încap CPE-ul pe 1 pagină A4. Altfel marginile
            # default Word (25mm) împing conținutul pe pagina 2.
            # ═══════════════════════════════════════
            enforce_a4_portrait(doc, preserve_margins=True)

            # ═══════════════════════════════════════
            # 0. SCALE EP + CO₂ — PRIMELE! (înainte de text replacements)
            # Altfel "xxxx"→volume corupe ">xxxx" din template generic
            # ═══════════════════════════════════════
            new_ep = [int(data.get(k, 0) or 0) for k in ["s_ap", "s_a", "s_b", "s_c", "s_d", "s_e", "s_f"]]
            try:
                new_co2 = [float((data.get(k, "0") or "0").replace(",", "."))
                           for k in ["co2_ap", "co2_a", "co2_b", "co2_c", "co2_d", "co2_e", "co2_f"]]
            except Exception:
                new_co2 = []
            if any(v > 0 for v in new_ep):
                replace_scales(doc, category, new_ep,
                               new_co2 if new_co2 and any(v > 0 for v in new_co2) else None)

            # CLASS INDICATORS — săgețile pe scale (tot înainte de text replacements)
            ep_cls_real = data.get("ep_class_real", "")
            ep_cls_ref = data.get("ep_class_ref", "")
            co2_cls_real = data.get("co2_class_real", "")
            if ep_cls_real:
                replace_class_indicators(doc, ep_cls_real, ep_cls_ref, co2_cls_real)

            # ═══════════════════════════════════════
            # 1. TEXT REPLACEMENTS — mapare directă
            # ═══════════════════════════════════════
            # ═══ CRITICAL: ordinea contează! ═══
            # Înlocuim pattern-urile LUNGI înainte de cele SCURTE
            # "xxxx,x" ÎNAINTE de "xxxx" (altfel "xxxx" corupe "xxxx,x")
            # "xxx,x" ÎNAINTE de "xx,x" (altfel "xx,x" corupe "xxx,x")
            # "ZZ.LL.AAAA" ÎNAINTE de "AAAA"

            # 1. Secvențiale (cele mai lungi pattern-uri primele)
            # FIX: ep_specific (kWh/m²,an) și ep_ref — nu ep_total_real (kWh/an total)
            ep_primar_vals = [data.get("ep_specific", "0,0"), data.get("ep_ref", "0,0")]
            replace_seq(doc, "xxxx,x", ep_primar_vals)

            xxx_vals = [data.get("area_ref", "0,0"), data.get("co2_val", "0,0"),
                        data.get("sre_st", "0,0"), data.get("sre_pv", "0,0"),
                        data.get("sre_pc", "0,0"), data.get("sre_bio", "0,0"),
                        data.get("sre_other", "0,0"), data.get("sre_total", "0,0")]
            replace_seq(doc, "xxx,x", xxx_vals)

            # xx,x = [qf_thermal_real, qf_electric_real, qf_thermal_ref, qf_electric_ref]
            # Ordinea corespunde celor 4 apariții din template: real(t,e) + ref(t,e)
            xx_vals = [data.get("qf_thermal", "0,0"), data.get("qf_electric", "0,0"),
                       data.get("qf_thermal_ref", "0,0"), data.get("qf_electric_ref", "0,0")]
            replace_seq(doc, "xx,x", xx_vals)

            # FIX GPS: înlocuim placeholder-ul GPS cu marker temp înainte ca nr_units să
            # corupă " x " (separator coordonate). Înlocuim [[GPS]] la final.
            gps_val = data.get("gps", "")
            replace_in_doc(doc, "II,IIII x LL,LLLL", "[[GPS]]")

            # 2. Înlocuiri simple (de la cele mai lungi la cele mai scurte)
            ordered_replacements = [
                # GPS este protejat acum cu [[GPS]] — nu mai apare " x " în coordonate
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
                # Eliminat: ("regim", ...) — replace prea agresiv corupea fraza
                # "în regim liber" din nota *** (ore depășire confort) → "în P+1+M liber".
                # Placeholder-ul "regim" standalone se înlocuiește mai jos cu verificare
                # strictă (paragraf cu textul EXACT "regim", după strip).
            ]

            for old, new in ordered_replacements:
                if new:
                    replace_in_doc(doc, old, new)

            # Fix dedicat pentru placeholder "regim înălțime" — text unic în template
            # MDLPA (2 cuvinte separate, apare DOAR pe rândul "Regim de înălțime:").
            # Evită coruperea frazei "în regim liber" din nota *** care folosește doar
            # cuvântul "regim" izolat, fără "înălțime" imediat după.
            regime_val = data.get("regime", "")
            if regime_val:
                replace_in_doc(doc, "regim înălțime", regime_val)

            # Adresa — completăm cele 2 rânduri din tabelul DATE CLĂDIRE:
            # R2: "Adresa clădirii: ........" → adresa completă
            # R3: ".... adresa ...." → aceeași adresă (unitatea de clădire certificată)
            address_val = data.get("address", "")
            _addr_filled = 0
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for para in cell.paragraphs:
                            pt = para.text
                            if ("adresa" in pt.lower() or "Adresa" in pt) and \
                               ("..." in pt or "." * 5 in pt):
                                is_label_row = "Adresa" in pt  # R2 = eticheta "Adresa clădirii:"
                                for run in para.runs:
                                    if "adresa" in run.text.lower() or "Adresa" in run.text or \
                                       "..." in run.text or "." * 5 in run.text:
                                        run.text = ""
                                if para.runs:
                                    if is_label_row:
                                        # R2: etichetă + adresă
                                        para.runs[0].text = "Adresa:  " + address_val
                                    elif _addr_filled == 1:
                                        # R3: lăsăm gol (aceeași unitate = aceeași adresă)
                                        para.runs[0].text = ""
                                _addr_filled += 1

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

            # Program calcul — înlocuiește "................versiunea" cu "ZEPHREN v3.x"
            program_name = data.get("software", "") or "ZEPHREN"
            def fill_program_field(paragraphs):
                for para in paragraphs:
                    if "Program de calcul utilizat" in para.text or "versiunea" in para.text:
                        inserted = False
                        for run in para.runs:
                            if re.search(r'\.{2,}', run.text):
                                run.text = re.sub(r'\.{2,}', program_name if not inserted else '', run.text)
                                inserted = True
                            elif "versiunea" in run.text:
                                run.text = re.sub(r'versiunea\.?', '', run.text).strip()
                            # Curăță puncte reziduale singure (ex: ". " rămas dintr-un run split)
                            if inserted and run.text.strip() in (".", ". ", "..", "..."):
                                run.text = ""
            fill_program_field(doc.paragraphs)
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        fill_program_field(cell.paragraphs)

            # Grad auditor — înlocuiește VALOAREA "I / II", NU eticheta "Gradul"
            grade_val = data.get("auditor_grade", "")
            if grade_val:
                # Spațiere vizibilă pentru grad II (altfel "II" e greu de citit)
                display_grade = "I I" if grade_val == "II" else grade_val
                replace_in_doc(doc, "I / II", display_grade)
                replace_in_doc(doc, "I/II", display_grade)
                # FIX: "gradul" este eticheta vizibilă — NU o înlocuim cu valoarea

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

            # ═══════════════════════════════════════
            # Sprint 14 — cod unic CPE (Ord. MDLPA 16/2023 + L.238/2024)
            # Placeholder-uri multiple pentru compatibilitate cu template-uri diferite.
            # Dacă template-ul nu are placeholder, codul rămâne în XML (metadata)
            # și se afișează în UI + XML export via generate-xml.js <CodUnicCPE>.
            # ═══════════════════════════════════════
            cpe_code = data.get("cpe_code", "")
            if cpe_code:
                for placeholder in ["[[CPE_CODE]]", "{{CPE_CODE}}", "CodUnicCPE"]:
                    replace_in_doc(doc, placeholder, cpe_code)

            # ═══════════════════════════════════════
            # Sprint 15 — Semnătură + ștampilă + QR code (Ord. MDLPA 16/2023)
            # Plasat DUPĂ text replacements (pentru ca placeholder-urile să existe
            # încă în document). Imaginile înlocuiesc placeholder-ele text cu PNG.
            # ═══════════════════════════════════════
            signature_b64 = data.get("signature_png_b64", "")
            stamp_b64 = data.get("stamp_png_b64", "")
            if signature_b64 or stamp_b64:
                insert_signature_stamp(doc, signature_b64, stamp_b64)

            qr_url = data.get("qr_verify_url", "")
            if qr_url:
                insert_qr_code(doc, qr_url, cpe_code)

            # Sprint 17 — QR code suplimentar pentru pașaport renovare (EPBD 2024/1275 Art. 12)
            # Plasat în placeholder {{QR_PASSPORT}} dedicat (dacă există în template).
            passport_qr_url = data.get("passport_qr_url", "")
            if passport_qr_url:
                try:
                    qr_pass_bytes = generate_qr_png(passport_qr_url, scale=4, border=2)
                    if qr_pass_bytes:
                        for ph in ("{{QR_PASSPORT}}", "{{QR_PASAPORT}}"):
                            _replace_placeholder_with_image(doc, ph, qr_pass_bytes, width_cm=2.2)
                except Exception as e_qrp:
                    print(f"[passport_qr] {e_qrp}", flush=True)

            # Sprint 15 — Cadastru + CF + identificare juridică (placeholder-uri opționale)
            # Sprint 17 — extensie cu pașaport renovare UUID + URL
            for ph_key, val in [
                ("{{NR_CADASTRAL}}", data.get("cadastral_number", "")),
                ("{{CARTE_FUNCIARA}}", data.get("land_book", "")),
                ("{{ARIE_CONSTRUITA}}", data.get("area_built", "")),
                ("{{NR_APARTAMENTE}}", data.get("n_apartments", "")),
                ("{{VALIDITY_YEARS}}", str(data.get("validity_years", ""))),
                ("{{VALIDITY_LABEL}}", data.get("validity_label", "")),
                ("{{PASSPORT_UUID}}", data.get("passport_uuid", "")),
                ("{{PASSPORT_URL}}", data.get("passport_url", "")),
            ]:
                if val:
                    replace_in_doc(doc, ph_key, val)

            # nZEB status — bifează checkbox-ul dacă clădirea e nZEB
            set_nzeb_checkbox(doc, data.get("nzeb", "NU") == "DA")

            # (secvențialele xxxx,x / xxx,x / xx,x au fost mutate mai sus, ordinea contează)

            # Categoria clădirii — înlocuiește placeholder-ul RA cu label-ul corect
            # FIX: "Apartament x camere, din bloc" → category_label din dropdown
            cat_label = data.get("category_label", "")
            if cat_label:
                replace_in_doc(doc, "Apartament x camere, din bloc", cat_label)
                replace_in_doc(doc, "categorie funcțională", cat_label)
                replace_in_doc(doc, "categorie functionala", cat_label)
                # Template generic: celula conține "Categoria clădirii:...categoria"
                # replace_in_paragraph e case-sensitive: "categoria" (c mic) potrivește
                # doar placeholder-ul de la poz 38, NU "Categoria" (C mare) de la poz 0
                for table in doc.tables:
                    for row in table.rows:
                        for cell in row.cells:
                            ct = cell.text
                            if "Categoria" in ct and "categoria" in ct:
                                for para in cell.paragraphs:
                                    if "categoria" in para.text:
                                        replace_in_paragraph(para, "categoria", cat_label, count=1)
                                        # Reducem spațiile excesive dintre etichetă și valoare
                                        for run in para.runs:
                                            if "Categoria" in run.text and "   " in run.text:
                                                run.text = run.text.rstrip() + "  "

            # Nr camere (RA) — înlocuiește " x " rămas (dacă mai există) din "Apartament x camere"
            if category == "RA":
                replace_in_doc(doc, " x ", " " + data.get("nr_units", "3") + " ")

            # FIX GPS: acum că nr_units a înlocuit " x " din template, punem GPS-ul real
            replace_in_doc(doc, "[[GPS]]", gps_val)

            # Location
            replace_in_doc(doc, "localitatea", data.get("city", ""))
            replace_in_doc(doc, "județul", data.get("county", ""))
            replace_in_doc(doc, "judetul", data.get("county", ""))
            replace_in_doc(doc, "zona climatică", data.get("climate_zone", ""))
            replace_in_doc(doc, "zona climatica", data.get("climate_zone", ""))

            # GWP lifecycle
            gwp_text = data.get("gwp", "0,0") + " kgCO2eq/m2an"
            replace_in_doc(doc, "GWP lifecycle", gwp_text)

            # Note de subsol CPE — ore supraîncălzire
            # ("regim" e deja înlocuit de ordered_replacements cu valoarea regime)
            # ".....................h" → ore supraîncălzire (0 dacă se calculează răcire)
            has_cool = data.get("cooling_has", "") == "true"
            overheat_h = "0" if has_cool else (data.get("overheating_hours", "0") or "0")
            replace_in_doc(doc, ".....................h", overheat_h + " h")

            # Aliniere stânga pentru valorile completate automat din coloana stângă a
            # tabelului "DATE PRIVIND CLĂDIREA CERTIFICATĂ" (Categoria, Adresa, Coordonate
            # GPS, Regim de înălțime). Template MDLPA folosește 8-12 spații după ":" pentru
            # pseudo-aliniere tab — după replace cu valori reale, rezultă indent vizual mare.
            # Colapsez spațiile multiple → 1 spațiu DOAR pe aceste 4 labels.
            _LEFT_ALIGN_LABELS = [
                # Coloana stângă DATE CLĂDIRE
                "Categoria clădirii:",
                "Adresa:",
                "Coordonate GPS (lat x long):",
                "Regim de înălțime:",
                # Coloana dreaptă DATE CLĂDIRE
                "Anul construirii/renovării majore:",
                "Aria de referință a pardoselii:",
                "Aria utilă / desfășurată:",
                "Volumul interior de referință:",
            ]
            from docx.enum.text import WD_ALIGN_PARAGRAPH as _WD_ALIGN
            for _para in _iter_all_paragraphs(doc, include_txbx=True):
                _pt = _para.text
                # 1) Colapsează spații după ":" pentru labels din tabelul DATE CLĂDIRE
                for _lbl in _LEFT_ALIGN_LABELS:
                    if _pt.startswith(_lbl) and "  " in _pt[len(_lbl):]:
                        _new_text = _lbl + " " + _pt[len(_lbl):].lstrip()
                        if _para.runs:
                            _first = _para.runs[0]
                            _first.text = _new_text
                            for _r in _para.runs[1:]:
                                _r.text = ""
                        break
                # 2) Aliniere stânga pentru celulele cu "m²" (template are center —
                #    rămâneau la dreapta coloanei, depărtate de valori). User request:
                #    'și la cele din dreapta, inclusiv metrii pătrați m²' + 'și asta să
                #    fie aliniat stânga' (screenshot cu 3 × m² stacked center).
                #    Setez direct XML <w:jc w:val="left"/> în pPr — python-docx
                #    alignment setter nu suprascria întotdeauna jc existent.
                if _pt.strip() in ("m2", "m²"):
                    _w_ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                    _pPr = _para._p.find(f"{{{_w_ns}}}pPr")
                    if _pPr is None:
                        _pPr = etree.SubElement(_para._p, f"{{{_w_ns}}}pPr")
                        _para._p.insert(0, _pPr)
                    _jc = _pPr.find(f"{{{_w_ns}}}jc")
                    if _jc is None:
                        _jc = etree.SubElement(_pPr, f"{{{_w_ns}}}jc")
                    _jc.set(f"{{{_w_ns}}}val", "left")

            # (Scale EP/CO₂ și class indicators — mutate la secțiunea 0, înainte de text replacements)

            # ═══════════════════════════════════════
            # 4. CHECKBOXES (Anexa)
            # ═══════════════════════════════════════
            if mode == "anexa":
                # Compute checkbox indices from building data (server-side)
                cb_indices = compute_checkboxes(data, category)
                # Also accept client-side overrides if provided
                client_cbs = body.get("checkboxes", [])
                if client_cbs:
                    cb_indices = list(set(cb_indices + client_cbs))
                if cb_indices:
                    toggle_checkboxes(doc, cb_indices)

            # ═══════════════════════════════════════
            # 4b. ANEXA 2 — TEXT REPLACEMENTS
            # ═══════════════════════════════════════
            if mode == "anexa":
                # Adresa și nr certificat
                replace_in_doc(doc, "[adresa]", data.get("address", ""))
                # An construcție/renovare
                replace_in_doc(doc, ".................", data.get("year", "") + (" / " + data.get("year_renov", "") if data.get("year_renov") else ""))
                # Arie referință totală
                au = data.get("area_ref", "")
                vol = data.get("volume", "")
                if au:
                    replace_in_doc(doc, "Aria de referință totală", "Aria de referință totală a pardoselii: " + au + " m²")
                if vol:
                    replace_in_doc(doc, "Volumul interior de referință", "Volumul interior de referință V: " + vol + " m³")
                # Factor formă
                try:
                    au_f = float(au.replace(",", ".")) if au else 0
                    vol_f = float(vol.replace(",", ".")) if vol else 0
                    ae = float(data.get("area_envelope", "0").replace(",", ".")) if data.get("area_envelope") else au_f * 1.3
                    se_v = ae / vol_f if vol_f > 0 else 0
                    replace_in_doc(doc, "Factorul de formă", "Factorul de formă al clădirii, SE/V: " + format_ro(se_v, 3))
                except:
                    pass
                # Nr persoane
                try:
                    is_res = category in ("RI", "RC", "RA")
                    nr_pers = max(1, round(au_f / (30 if is_res else 15)))
                    replace_in_doc(doc, "pers.", str(nr_pers) + " pers.")
                except:
                    pass
                # Detalii instalații — combustibil
                fuel_labels = {"gaz_nat": "gaz natural", "gpl": "GPL", "motorina": "motorină",
                               "lemn": "lemne", "peleti": "peleți", "carbune": "cărbune",
                               "electric": "electricitate", "biogaz": "biogaz"}
                fuel = fuel_labels.get(data.get("heating_fuel", ""), data.get("heating_fuel", ""))
                if fuel:
                    replace_in_doc(doc, "combustibil .....................", "combustibil " + fuel)
                    replace_in_doc(doc, "combustibil ...........", "combustibil " + fuel)
                # Putere nominală încălzire
                hp = data.get("heating_power", "0")
                if hp and hp != "0":
                    replace_in_doc(doc, "Necesarul de căldură de calcul", "Necesarul de căldură de calcul: " + hp + " kW")
                    replace_in_doc(doc, "Puterea termică instalată totală pentru încălzire", "Puterea termică instalată totală: " + hp + " kW")

                # ── U-values per tip element ──────────────────────────────
                # Înlocuim texte tip "U pereți exteriori" / "U acoperiș" etc.
                try:
                    opaque_u = json.loads(data.get("opaque_u_values", "[]"))
                    raw_glaz = data.get("glazing_max_u", "0") or "0"
                    try:
                        glaz_u = float(raw_glaz)
                        if glaz_u != glaz_u or glaz_u < 0:
                            glaz_u = 0.0
                    except (ValueError, TypeError):
                        glaz_u = 0.0
                    glaz_g = float(data.get("glazing_g_value", "0") or "0")

                    pe_u = [e for e in opaque_u if e.get("type") == "PE"]
                    pt_u = [e for e in opaque_u if e.get("type") in ("PT","PP")]
                    pb_u = [e for e in opaque_u if e.get("type") == "PB"]
                    pl_u = [e for e in opaque_u if e.get("type") == "PL"]

                    if pe_u:
                        u_val = format_ro(pe_u[0].get("u", 0), 2)
                        replace_in_doc(doc, "U pereți exteriori", f"U pereți exteriori = {u_val} W/(m²·K)")
                        replace_in_doc(doc, "coeficientul global de transfer termic al pereților exteriori",
                                       f"U pereți ext. = {u_val} W/(m²·K)")
                    if pt_u:
                        u_val = format_ro(pt_u[0].get("u", 0), 2)
                        replace_in_doc(doc, "U terasă/acoperiș", f"U terasă = {u_val} W/(m²·K)")
                    if pb_u:
                        u_val = format_ro(pb_u[0].get("u", 0), 2)
                        replace_in_doc(doc, "U planșeu subsol", f"U planșeu subsol = {u_val} W/(m²·K)")
                    if glaz_u > 0:
                        replace_in_doc(doc, "U tâmplărie", f"U tâmplărie = {format_ro(glaz_u, 2)} W/(m²·K)")
                        replace_in_doc(doc, "coeficientul global de transfer termic al tâmplăriei",
                                       f"U tâmplărie = {format_ro(glaz_u, 2)} W/(m²·K)")
                    if glaz_g > 0:
                        replace_in_doc(doc, "factorul solar g", f"factorul solar g = {format_ro(glaz_g, 2)}")
                except Exception:
                    pass

                # ── EP breakdown pe destinații ────────────────────────────
                ep_breakdown = {
                    "ep_incalzire": data.get("ep_incalzire", ""),
                    "ep_racire": data.get("ep_racire", ""),
                    "ep_acm": data.get("ep_acm", ""),
                    "ep_ventilare": data.get("ep_ventilare", ""),
                    "ep_iluminat": data.get("ep_iluminat", ""),
                }
                ep_labels = {
                    "ep_incalzire": "EP încălzire",
                    "ep_racire": "EP răcire",
                    "ep_acm": "EP ACM",
                    "ep_ventilare": "EP ventilare",
                    "ep_iluminat": "EP iluminat",
                }
                for key, val in ep_breakdown.items():
                    if val:
                        replace_in_doc(doc, ep_labels[key], ep_labels[key] + " = " + val + " kWh/(m²·an)")

                # ── BACS clasă automatizare ───────────────────────────────
                bacs_class = data.get("bacs_class", "")
                bacs_labels = {
                    "A": "Clasa A — control predictiv (economie 25-40%)",
                    "B": "Clasa B — control avansat (economie 10-25%)",
                    "C": "Clasa C — automatizare de bază (referință)",
                    "D": "Clasa D — fără automatizare",
                }
                if bacs_class in bacs_labels:
                    replace_in_doc(doc, "Clasa BACS", "BACS: " + bacs_labels[bacs_class])
                    replace_in_doc(doc, "clasă automatizare", "Clasă automatizare BACS: " + bacs_class)

                # ── SRI — Smart Readiness Indicator ──────────────────────
                sri_val = data.get("sri_total", "")
                sri_grade = data.get("sri_grade", "")
                if sri_val:
                    replace_in_doc(doc, "SRI %", f"SRI = {sri_val}% (Clasa {sri_grade})")

                # ── Detalii ACM ───────────────────────────────────────────
                acm_vol = data.get("acm_storage_volume", "")
                acm_src_label = {
                    "ct_prop": "Centrală termică proprie",
                    "boiler_electric": "Boiler electric",
                    "termoficare": "Termoficare",
                    "solar_termic": "Solar termic",
                    "pc": "Pompă de căldură",
                }.get(data.get("acm_source", ""), "")
                if acm_vol:
                    replace_in_doc(doc, "Volumul vasului de acumulare", "Volum vas ACM: " + acm_vol + " L")
                if acm_src_label:
                    replace_in_doc(doc, "sursa de preparare ACM", "Sursă ACM: " + acm_src_label)

                # ── Infiltrații / Etanșeitate ─────────────────────────────
                n50 = data.get("n50", "")
                if n50 and float(n50 or 0) > 0:
                    replace_in_doc(doc, "n50 =", "n50 = " + format_ro(float(n50), 1) + " h⁻¹")
                    replace_in_doc(doc, "rata de infiltrații", "Rata infiltrații n50 = " + format_ro(float(n50), 1) + " h⁻¹")

            # ═══════════════════════════════════════
            # 5. FOTO CLĂDIRE — inserare imagine în text box
            # ═══════════════════════════════════════
            photo_b64 = body.get("photo")
            if photo_b64 and photo_b64.startswith("data:image"):
                # Suport png/jpeg/jpg/webp/gif/bmp
                match = re.match(r"data:image/(png|jpeg|jpg|webp|gif|bmp);base64,(.+)", photo_b64, re.DOTALL)
                if match:
                    img_data = base64.b64decode(match.group(2))
                    from docx.oxml.ns import qn as docx_qn
                    from docx.shared import Emu

                    # Dimensiunile frame-ului FOTO din template (EMU): 647700 x 584200
                    FOTO_W_EMU = 620000   # puțin sub lățimea frame-ului (~1,7 cm)
                    FOTO_H_EMU = 560000   # puțin sub înălțimea frame-ului (~1,55 cm)

                    # Calculează dimensiunile imaginii păstrând aspect ratio
                    try:
                        import struct
                        raw = img_data
                        img_w_px, img_h_px = None, None
                        # PNG: lățime/înălțime la bytes 16-24
                        if raw[:4] == b'\x89PNG':
                            img_w_px, img_h_px = struct.unpack('>II', raw[16:24])
                        # JPEG: cauta SOF marker
                        elif raw[:2] == b'\xff\xd8':
                            i = 2
                            while i < len(raw) - 8:
                                if raw[i] == 0xff and raw[i+1] in (0xC0, 0xC2):
                                    img_h_px = struct.unpack('>H', raw[i+5:i+7])[0]
                                    img_w_px = struct.unpack('>H', raw[i+7:i+9])[0]
                                    break
                                seg_len = struct.unpack('>H', raw[i+2:i+4])[0]
                                i += 2 + seg_len
                    except Exception:
                        img_w_px, img_h_px = None, None

                    # Alege dimensiunea finală respectând frame-ul și aspect ratio
                    if img_w_px and img_h_px and img_w_px > 0 and img_h_px > 0:
                        ratio = img_w_px / img_h_px
                        if ratio >= 1:  # landscape sau pătrat → constrâns de lățime
                            pic_w = FOTO_W_EMU
                            pic_h = int(FOTO_W_EMU / ratio)
                            if pic_h > FOTO_H_EMU:  # totuși prea înalt
                                pic_h = FOTO_H_EMU
                                pic_w = int(FOTO_H_EMU * ratio)
                        else:  # portrait → constrâns de înălțime
                            pic_h = FOTO_H_EMU
                            pic_w = int(FOTO_H_EMU * ratio)
                            if pic_w > FOTO_W_EMU:
                                pic_w = FOTO_W_EMU
                                pic_h = int(FOTO_W_EMU / ratio)
                    else:
                        # Fallback: folosim lățimea frame-ului
                        pic_w = FOTO_W_EMU
                        pic_h = None

                    # Găsește TOATE text box-urile care conțin "FOTO" și înlocuiește-le
                    txbx_tag = qn("w:txbxContent")
                    p_tag = qn("w:p")
                    from docx.text.paragraph import Paragraph as DocxPara

                    foto_txbx_list = []
                    for txbx_elem in doc.element.body.iter(txbx_tag):
                        for p_elem in txbx_elem.iter(p_tag):
                            if "FOTO" in (DocxPara(p_elem, None).text or ""):
                                foto_txbx_list.append(txbx_elem)
                                break  # un singur text box per găsire

                    for foto_txbx in foto_txbx_list:
                        # Șterge TOATE paragrafele existente din text box
                        for p_elem in list(foto_txbx.findall(p_tag)):
                            foto_txbx.remove(p_elem)

                        # Creează un singur paragraf centrat cu imaginea
                        new_p = etree.SubElement(foto_txbx, p_tag)
                        pPr = etree.SubElement(new_p, qn("w:pPr"))
                        sp = etree.SubElement(pPr, qn("w:spacing"))
                        sp.set(qn("w:after"), "0")
                        jc = etree.SubElement(pPr, qn("w:jc"))
                        jc.set(qn("w:val"), "center")
                        new_r = etree.SubElement(new_p, qn("w:r"))

                        # Adaugă imaginea via python-docx (calea standard)
                        img_stream = io.BytesIO(img_data)
                        img_stream.seek(0)
                        temp_para = doc.add_paragraph()
                        temp_run = temp_para.add_run()
                        if pic_h:
                            temp_run.add_picture(img_stream, width=Emu(pic_w), height=Emu(pic_h))
                        else:
                            temp_run.add_picture(img_stream, width=Emu(pic_w))
                        drawing = temp_run._element.find(docx_qn("w:drawing"))
                        if drawing is not None:
                            new_r.append(drawing)
                        temp_para._element.getparent().remove(temp_para._element)

            # ═══════════════════════════════════════
            # 6. ANEXĂ FOTOGRAFII CLĂDIRE (doar în modul "anexa")
            # ═══════════════════════════════════════
            building_photos = body.get("buildingPhotos", [])
            if mode == "anexa" and building_photos:
                from docx.shared import Pt, Inches
                from docx.enum.text import WD_ALIGN_PARAGRAPH
                from docx.oxml.ns import qn as docx_qn
                from docx.oxml import OxmlElement

                # Separator pagină nouă
                doc.add_page_break()

                # Titlu secțiune H (conform structurii oficiale Anexa CPE)
                title_p = doc.add_paragraph()
                title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                title_run = title_p.add_run("H. DOCUMENTARE FOTOGRAFICĂ A CLĂDIRII")
                title_run.bold = True
                title_run.font.size = Pt(11)

                cat_labels = {
                    "exterior": "Exterior",
                    "interior": "Interior",
                    "ir": "Termoviziune IR",
                    "instalatii": "Instalații",
                    "defecte": "Defecte / Degradări",
                    "altele": "Altele",
                }

                # Grupare pe categorii
                grouped = {}
                for ph in building_photos:
                    cat = ph.get("zone", "altele")
                    grouped.setdefault(cat, []).append(ph)

                for cat, photos in grouped.items():
                    # Subtitlu categorie
                    cat_p = doc.add_paragraph()
                    cat_run = cat_p.add_run(f"{cat_labels.get(cat, cat)}  ({len(photos)})")
                    cat_run.bold = True
                    cat_run.font.size = Pt(9)

                    # Tabel 2 coloane pentru poze
                    i = 0
                    while i < len(photos):
                        row_photos = photos[i:i+2]
                        tbl = doc.add_table(rows=1, cols=2)
                        # Elimină borduri tabel
                        tbl_pr = tbl._tbl.tblPr
                        if tbl_pr is None:
                            tbl_pr = OxmlElement("w:tblPr")
                            tbl._tbl.insert(0, tbl_pr)
                        tbl_borders = OxmlElement("w:tblBorders")
                        for border_name in ("top", "left", "bottom", "right", "insideH", "insideV"):
                            border_el = OxmlElement(f"w:{border_name}")
                            border_el.set(docx_qn("w:val"), "none")
                            tbl_borders.append(border_el)
                        tbl_pr.append(tbl_borders)

                        for j in range(2):
                            cell = tbl.rows[0].cells[j]
                            if j < len(row_photos):
                                ph = row_photos[j]
                                ph_url = ph.get("url", "")
                                if ph_url and "," in ph_url:
                                    try:
                                        img_data = base64.b64decode(ph_url.split(",")[1])
                                        img_stream = io.BytesIO(img_data)
                                        # Detectează dimensiuni JPEG/PNG fără Pillow
                                        import struct as _struct
                                        raw = img_data
                                        img_w_px, img_h_px = None, None
                                        if raw[:4] == b'\x89PNG':
                                            img_w_px, img_h_px = _struct.unpack('>II', raw[16:24])
                                        elif raw[:2] == b'\xff\xd8':
                                            ii = 2
                                            while ii < len(raw) - 8:
                                                if raw[ii] == 0xff and raw[ii+1] in (0xC0, 0xC2):
                                                    img_h_px = _struct.unpack('>H', raw[ii+5:ii+7])[0]
                                                    img_w_px = _struct.unpack('>H', raw[ii+7:ii+9])[0]
                                                    break
                                                seg_len = _struct.unpack('>H', raw[ii+2:ii+4])[0]
                                                ii += 2 + seg_len
                                        # Calculează height păstrând aspect ratio
                                        pic_w = Inches(2.8)
                                        if img_w_px and img_h_px and img_w_px > 0:
                                            ratio = img_h_px / img_w_px
                                            pic_h = Inches(2.8 * ratio)
                                        else:
                                            pic_h = Inches(2.1)  # fallback 4:3
                                        img_p = cell.paragraphs[0]
                                        img_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                                        img_run = img_p.add_run()
                                        img_run.add_picture(img_stream, width=pic_w, height=pic_h)
                                    except Exception as e:
                                        import sys
                                        print(f"[FOTO ERR] {e}", file=sys.stderr)
                                label = ph.get("label", "")
                                note = ph.get("note", "")
                                if label:
                                    lp = cell.add_paragraph(label)
                                    lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
                                    if lp.runs:
                                        lp.runs[0].font.size = Pt(7)
                                if note:
                                    np_ = cell.add_paragraph(note)
                                    np_.alignment = WD_ALIGN_PARAGRAPH.CENTER
                                    if np_.runs:
                                        np_.runs[0].font.size = Pt(6)
                        i += 2

            # ═══════════════════════════════════════
            # 6b. COLORARE CELULE CLASE ENERGETICE PER UTILITATE
            # ═══════════════════════════════════════
            # Evidențiază cu culoarea clasei celula din tabelul de jos care conține
            # intervalul în care se încadrează consumul specific al fiecărei utilități
            if mode == "cpe":
                _highlight_utility_class_cells(doc, data)

            # ═══════════════════════════════════════
            # 6b. TEXT ROȘU → NEGRU pe tot documentul
            # Template-ul generic are placeholder-uri cu FF0000 (roșu).
            # După înlocuire, textul trebuie să fie negru.
            # ═══════════════════════════════════════
            _w_color_tag = qn("w:color")
            _w_rPr_tag = qn("w:rPr")
            _w_val = qn("w:val")
            for r_el in doc.element.body.iter(qn("w:r")):
                rPr = r_el.find(_w_rPr_tag)
                if rPr is not None:
                    color_el = rPr.find(_w_color_tag)
                    if color_el is not None and color_el.get(_w_val) == "FF0000":
                        color_el.set(_w_val, "000000")

            # ═══════════════════════════════════════
            # 7. STRIP TRAILING EMPTY PARAGRAPHS
            # ═══════════════════════════════════════
            # Elimină paragrafele goale de la finalul documentului (după tabelul de bare cod)
            # Tabelul "COD UNIC DE BARE" se păstrează — face parte din modelul oficial CPE
            body_el = doc.element.body
            sect_pr = body_el.find(qn("w:sectPr"))
            if sect_pr is not None:
                def _get_texts(el):
                    return [t.text for t in el.iter(qn("w:t")) if t.text and t.text.strip()]

                # Elimină paragrafele goale de la final (după conținut/tabel bare cod)
                children = list(body_el)
                sect_idx = children.index(sect_pr)
                for child in reversed(children[:sect_idx]):
                    if child.tag != qn("w:p"):
                        break
                    if _get_texts(child):
                        break
                    body_el.remove(child)

                # ─── CPE: elimină spacing body paragraphs pentru a preveni overflow pagina 2 ──
                # Înlocuirile de text (firma, adresă, etc.) pot mări celule → tabelele cresc
                # → conținut depășește pagina 1. Reducem spacing-ul paragrafelor de la nivel body.
                # Economie: ~11mm (suficient pentru orice date reale de audit)
                if mode == "cpe":
                    for child in list(body_el):
                        if child.tag == qn("w:p"):
                            pPr = child.find(qn("w:pPr"))
                            if pPr is None:
                                continue
                            sp = pPr.find(qn("w:spacing"))
                            if sp is None:
                                continue
                            for attr in (qn("w:after"), qn("w:before")):
                                val = sp.get(attr)
                                if val and int(val) > 0:
                                    sp.set(attr, "0")
                        elif child.tag == qn("w:tbl"):
                            # Reducere spacing în tabelul de bare cod
                            all_t = " ".join(t.text for t in child.iter(qn("w:t")) if t.text)
                            if "COD" in all_t.upper() and "BARE" in all_t.upper():
                                for p in child.iter(qn("w:p")):
                                    pPr2 = p.find(qn("w:pPr"))
                                    if pPr2 is None:
                                        continue
                                    sp2 = pPr2.find(qn("w:spacing"))
                                    if sp2 is None:
                                        continue
                                    for attr in (qn("w:after"), qn("w:before")):
                                        val = sp2.get(attr)
                                        if val and int(val) > 0:
                                            sp2.set(attr, "0")

            # ═══════════════════════════════════════
            # 8. SAVE & RETURN
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
