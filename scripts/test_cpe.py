#!/usr/bin/env python3
"""Test CPE DOCX generation across multiple building categories."""
import io, sys, re, zipfile, importlib.util
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

spec = importlib.util.spec_from_file_location('gen', 'api/generate-cpe.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
from docx import Document

TPL_DIR = "public/templates/backup_originals/"

tests = [
    ("RI", "5-CPE-cladire-locuit-individuala-INC-ACC-RAC-VENT-IL.docx",
     {"year":"2025","expiry":"05.04.2036","address":"Str. Test nr. 1, Constanta",
      "gps":"44,1800 x 28,6500","regime":"P+1+M","scope":"Vanzare",
      "area_ref":"185,0","area_gross":"212,8","volume":"510",
      "ep_total_real":"50087,6","ep_total_ref":"22200,0",
      "qf_thermal":"51,8","qf_electric":"4,0","ep_specific":"270,7","ep_ref":"120,0",
      "co2_val":"4,5",
      "sre_st":"4,6","sre_pv":"9,0","sre_pc":"151,1","sre_bio":"0,0","sre_other":"0,0","sre_total":"164,8",
      "s_ap":"25","s_a":"50","s_b":"75","s_c":"100","s_d":"150","s_e":"200","s_f":"300",
      "auditor_name":"ing. Test","auditor_atestat":"CT-01256","auditor_date":"05.04.2026",
      "ep_class_real":"F","ep_class_ref":"D","co2_class_real":"A+",
      "rer":"89,0","nzeb":"DA","gwp":"15,5"}),
    ("RC", "6-CPE-cladire-locuit-colectiva-INC-ACC-RAC-VENT-IL.docx",
     {"year":"1973","expiry":"04.04.2036","address":"Bd. Unirii nr. 42, Bucuresti",
      "gps":"44,4300 x 26,1000","regime":"P+4","scope":"Vanzare",
      "area_ref":"2400,0","area_gross":"2760,0","volume":"6600",
      "ep_total_real":"356928,4","ep_total_ref":"249600,0",
      "qf_thermal":"114,1","qf_electric":"5,2","ep_specific":"148,7","ep_ref":"104,0",
      "co2_val":"23,4",
      "sre_st":"0,0","sre_pv":"0,0","sre_pc":"0,0","sre_bio":"0,0","sre_other":"0,0","sre_total":"0,0",
      "s_ap":"25","s_a":"50","s_b":"75","s_c":"100","s_d":"150","s_e":"200","s_f":"300",
      "auditor_name":"ing. Popescu Ion","auditor_atestat":"CT-00845","auditor_date":"04.04.2026",
      "ep_class_real":"D","ep_class_ref":"B","co2_class_real":"B",
      "rer":"0,0","nzeb":"NU","gwp":"31,0"}),
    ("BI", "7-CPE-cladire-birouri-INC-ACC-RAC-VENT-IL.docx",
     {"year":"2020","expiry":"05.04.2036","address":"Calea Victoriei nr. 100, Bucuresti",
      "gps":"44,4400 x 26,0900","regime":"S+P+6E","scope":"Inchiriere",
      "area_ref":"3500,0","area_gross":"4025,0","volume":"10500",
      "ep_total_real":"315000,0","ep_total_ref":"346500,0",
      "qf_thermal":"45,0","qf_electric":"25,0","ep_specific":"90,0","ep_ref":"99,0",
      "co2_val":"15,2",
      "sre_st":"0,0","sre_pv":"5,0","sre_pc":"20,0","sre_bio":"0,0","sre_other":"0,0","sre_total":"25,0",
      "s_ap":"30","s_a":"60","s_b":"90","s_c":"120","s_d":"180","s_e":"250","s_f":"350",
      "auditor_name":"ing. Ionescu Maria","auditor_atestat":"CT-02100","auditor_date":"05.04.2026",
      "ep_class_real":"B","ep_class_ref":"B","co2_class_real":"B",
      "rer":"25,0","nzeb":"NU","gwp":"22,0"}),
    ("RA", "4-CPE-apartament-bloc-INC-ACC-RAC-VENT-IL.docx",
     {"year":"1985","expiry":"05.04.2036","address":"Str. Florilor nr. 5, Ap. 12, Cluj",
      "gps":"46,7700 x 23,6000","regime":"Et. 3","scope":"Vanzare",
      "area_ref":"65,0","area_gross":"74,8","volume":"175",
      "ep_total_real":"19500,0","ep_total_ref":"6890,0",
      "qf_thermal":"200,0","qf_electric":"12,0","ep_specific":"300,0","ep_ref":"106,0",
      "co2_val":"55,0",
      "sre_st":"0,0","sre_pv":"0,0","sre_pc":"0,0","sre_bio":"0,0","sre_other":"0,0","sre_total":"0,0",
      "s_ap":"25","s_a":"50","s_b":"75","s_c":"100","s_d":"150","s_e":"200","s_f":"300",
      "auditor_name":"ing. Vasilescu Dan","auditor_atestat":"CT-03000","auditor_date":"05.04.2026",
      "ep_class_real":"G","ep_class_ref":"D","co2_class_real":"D",
      "rer":"0,0","nzeb":"NU","gwp":"60,0"}),
]

all_ok = True
for cat, tpl_name, data in tests:
    print(f"\n{'='*60}")
    print(f"TEST {cat}: {tpl_name}")
    print(f"{'='*60}")

    with open(TPL_DIR + tpl_name, "rb") as f:
        doc = Document(io.BytesIO(f.read()))

    # 1. Sequentials (long first)
    mod.replace_seq(doc, "xxxx,x", [data["ep_total_real"], data["ep_total_ref"]])
    mod.replace_seq(doc, "xxx,x", [data["area_ref"], data["co2_val"],
                                    data["sre_st"], data["sre_pv"], data["sre_pc"],
                                    data["sre_bio"], data["sre_other"], data["sre_total"]])
    mod.replace_seq(doc, "xx,x", [data["qf_thermal"], data["qf_electric"],
                                   data["ep_specific"], data["ep_ref"]])

    # 2. Simple replacements (long first)
    replacements = [
        ("II,IIII x LL,LLLL", data["gps"]),
        ("ZZ.LL.AAAA", data["auditor_date"]),
        ("XX/XXXXX", data["auditor_atestat"]),
        ("zz/ll/aa", data["expiry"]),
        ("zzz,z", data["area_ref"]),
        ("yyy,y", data["area_gross"]),
        ("RR,R", data["rer"]),
        ("AAAA", data["year"]),
        ("xxxx", data["volume"]),
        ("regim", data["regime"]),
    ]
    for old, new in replacements:
        if new:
            mod.replace_in_doc(doc, old, new)

    # 3. Scales
    new_ep = [int(data[k]) for k in ["s_ap","s_a","s_b","s_c","s_d","s_e","s_f"]]
    mod.replace_scales(doc, cat, new_ep)

    # 4. Class indicators (position + color + white text)
    mod.replace_class_indicators(doc, data["ep_class_real"], data["ep_class_ref"], data["co2_class_real"])

    # 5. nZEB
    mod.replace_in_doc(doc, "nZEB DA/NU", "nZEB " + data["nzeb"])

    # Save
    buf = io.BytesIO()
    doc.save(buf)

    # ─── VERIFY ───
    with zipfile.ZipFile(buf) as z:
        xml = z.read("word/document.xml").decode("utf-8")

    errors = []

    # A) Text fields
    if data["year"] not in xml:
        errors.append(f"An {data['year']} lipseste")
    if data["address"].split(",")[0] not in xml:
        errors.append(f"Adresa lipseste")
    if data["ep_total_real"] not in xml:
        errors.append(f"EP total real lipseste")
    if data["ep_specific"] not in xml:
        errors.append(f"EP specific {data['ep_specific']} lipseste")
    if data["qf_thermal"] not in xml:
        errors.append(f"qf_thermal {data['qf_thermal']} lipseste")
    if data["volume"] + ",x" in xml:
        errors.append("volume a corupt xxxx,x!")

    # B) Scales EP
    for k in ["s_ap","s_a","s_b","s_c","s_d","s_e","s_f"]:
        if data[k] not in xml:
            errors.append(f"Scala EP {k}={data[k]} lipseste")

    # C) Class indicators
    indicators = []
    for m in re.finditer(r"(<mc:AlternateContent>[\s\S]*?</mc:AlternateContent>)", xml):
        content = m.group(1)
        texts = re.findall(r"<w:t[^>]*>([A-G]\+?)</w:t>", content)
        has_path = "coordsize" in content
        pos_h = re.search(r"positionH[^>]*>[\s\S]*?posOffset>(-?\d+)<", content)
        if not texts or has_path or not pos_h:
            continue
        h = int(pos_h.group(1))
        if h < 150000:
            continue
        text = texts[0]
        has_white = "FFFFFF" in content
        mt = re.search(r"margin-top:\s*(-?[\d.]+)pt", content)
        mt_val = float(mt.group(1)) if mt else 0
        indicators.append({"letter": text, "white": has_white, "mt": mt_val})

    if cat == "RA":
        # Apartment: 1 EP real + 1 CO2
        expected_letters = [data["ep_class_real"], data["co2_class_real"]]
    else:
        # Building: 1 EP real + 1 EP ref + 1 CO2
        expected_letters = [data["ep_class_real"], data["ep_class_ref"], data["co2_class_real"]]

    actual_letters = [ind["letter"] for ind in indicators]
    if actual_letters != expected_letters:
        errors.append(f"Clase indicator: asteptat {expected_letters}, gasit {actual_letters}")

    for ind in indicators:
        if not ind["white"]:
            errors.append(f"Indicator [{ind['letter']}] nu are text alb")
        if ind["mt"] < -10 or ind["mt"] > 300:
            errors.append(f"Indicator [{ind['letter']}] pozitie suspecta mt={ind['mt']}pt")

    # D) Auditor
    if data["auditor_atestat"] not in xml:
        errors.append("Atestat auditor lipseste")

    # Print result
    if errors:
        all_ok = False
        for e in errors:
            print(f"  EROARE: {e}")
    else:
        print(f"  OK - an={data['year']}, EP={data['ep_specific']}, clase={actual_letters}, text_alb=DA")
        for ind in indicators:
            print(f"    [{ind['letter']:2s}] mt={ind['mt']:.1f}pt white={ind['white']}")

print(f"\n{'='*60}")
if all_ok:
    print("TOATE TESTELE AU TRECUT!")
else:
    print("UNELE TESTE AU ESUAT - vezi erorile de mai sus")
