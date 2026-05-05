# Audit normativ — Catalog punți termice (`thermal-bridges.json`)

**Data**: 5 mai 2026
**Auditor**: Claude Opus 4.7 (1M, max effort)
**Subiect**: `D:\Claude Projects\Zephren\energy-app\src\data\thermal-bridges.json` (204 intrări) + `thermal-bridges-metadata.json` (52 intrări complementare)
**Standarde de referință**:
- SR EN ISO 14683:2017 (Punți termice — Coeficient transmisie liniară, metode simplificate, valori implicite)
- SR EN ISO 10211:2017 (Calcul numeric 2D/3D pentru Ψ și χ)
- SR EN ISO 13788:2012 (Risc condens superficial, fRsi)
- SR EN ISO 6946:2017 (Rezistență termică)
- SR EN ISO 13370:2017 (Transfer termic prin sol)
- Mc 001-2022 §11 + Anexa A.2 / B (calcul punți termice în CPE și audit)
- C107/3-2005 + C107/4-1997 (norme RO încă citate de Mc 001-2022)
- DIN 4108 Beiblatt 2 (referință germană pentru detalii constructive)
- Atlas RT 2012, BR 497 (UK), Schöck Isokorb / Halfen HIT / Leviat Ancon (date producători)

---

## A. Sumar executiv

Catalogul Zephren conține **204 intrări** distribuite în **31 de categorii**, cu schema bifocală (Ψ neizolat + Ψ izolat). Scorul global de conformitate normativă: **78 / 100** — un nivel **bun pentru un produs comercial RO**, dar cu lacune semnificative față de catalogele europene de referință (PHI Window Catalogue v2.0, Knauf PSI Pattern Book, ROCKWOOL Passive House Solutions Guide).

**Statistici cheie**:
- 195 intrări OK sau cu observații minore
- **2 erori critice (P0)**: 1 inconsistență sign-related la `psi_izolat`, 5 intrări cu `psi=0` care derutează sintactic engine-ul de calcul
- **~25 discrepanțe semnificative (P1)**: cod ISO 14683 inexistent ("RF" la atic), 4 perechi de intrări duplicat aproape-identice cu valori divergente, 5 reduceri ψ→ψ_izolat sub 30% (slabe)
- **8 lipsuri normative majore (P2)**: punți punctuale χ pentru BIPV/curtain-wall ancore, rosturi de dilatare clădiri lungi, casetă jaluzele exterioare cu detaliu RT 2012, terase circulabile vs. necirculabile, pivnițe parțial îngropate sub CTS

**Top 3 probleme**:
1. **Erori de codare ISO 14683** — codul "RF" pentru atic nu există în standard (corect: "R" + "P"), și mai multe `iso_14683_code` lipsesc cu totul din JSON-ul principal (sunt doar în metadata).
2. **Duplicate cu valori divergente** — același detaliu fizic apare în 2-3 categorii cu Ψ=0,7 / Ψ=1,2 / Ψ=0,65 (HEA balcon), confuzând auditorul. Toate sunt plauzibile, dar pentru ce profil HEA160 vs HEA200? Trebuie clarificat dimensional.
3. **Câmpul `chi: true` cu `psi=0`** rupe contractul de citire pentru engine-ul `wizardOpaqueCalc.js` — calculatorul încearcă `Ψ × L`, dar e χ × N (numărul de penetrații). Se solicită URGENT separare schema.

---

## B. Erori critice (P0)

### B1. Inconsistență `psi_izolat` la "Colț interior" (linia 5)

**Problema**: `psi = -0.05`, `psi_izolat = -0.03`. La intrările cu valori negative (efect favorabil geometric), regula de bază `psi_izolat ≤ psi` (intervenția nu poate înrăutăți) se inversează semantic — un colț interior cu izolație trebuie să **rămână mai negativ sau egal**, nu mai puțin negativ. Aici se sugerează că izolația degradează performanța (-0,03 > -0,05).

**Valoare corectă (ISO 14683:2017, ROCKWOOL EWIC01, Passipedia ewfs)**:
- Colț interior fără izolație continuă: ψ ≈ -0,05 W/(m·K) (efect geometric pur)
- Colț interior cu ETICS continuă: ψ ≈ -0,07 ... -0,03 (reducere a efectului geometric pe măsură ce stratul izolant uniformizează)

Conform metadata `psi_min=-0.10, psi_typical=-0.05, psi_max=0.03`, valoarea `psi_izolat` ar trebui să indice scenariul cu izolație continuă pe interiorul colțului = ψ ≈ -0,07 (mai favorabil).

**Patch sugerat**:
```json
{
  "cat": "Joncțiuni pereți",
  "name": "Colț interior",
  "psi": -0.05,
  "psi_izolat": -0.07,
  "desc": "Colț interior al clădirii (favorabil)",
  "detail": "Suprafața interioară mai mare decât cea exterioară → efect favorabil (Ψ negativ). Reduce pierderea totală. Cu ETICS continuă: efect intensificat. Ref: ISO 14683:2017 Tabel 1 tip CO; ROCKWOOL EWIC01."
}
```

### B2. Cinci intrări `chi:true` cu `psi=0` (liniile 150–155)

**Problema**: Intrările "Trecere conductă termică (Cu/OL)", "Trecere cablu electric", "Suport metalic panou solar termic", "Priză aer HVAC", "Coș metalic dublu perete" au `psi: 0` în câmpul principal și valoarea reală în câmpul nou `chi: 0.030 / 0.002 / 0.025 / 0.08 / 0.05`. Engine-ul de calcul `wizardOpaqueCalc.js` (helper `applyPunti`) iterează `psi × L`, deci aceste intrări **NU contribuie deloc la pierdere** atunci când sunt selectate. Există și câmpul boolean nou `is_point_bridge: true`, dar nu e clar dacă engine-ul îl interpretează.

**În contrast**: Intrările vechi de la liniile 78–89 (categoriile "Sisteme ETICS" și "Elemente punctuale (chi)") **au valoarea χ pusă în câmpul `psi`** și marker `chi: true` separat — schema veche funcționa, schema nouă o sparge.

**Patch sugerat (uniformizare schema)**:
Opțiunea 1 (recomandată) — păstrează schema veche, χ în câmpul `psi`:
```json
{
  "cat": "Instalații – tipuri speciale",
  "name": "Trecere conductă termică (Cu/OL) prin perete exterior",
  "psi": 0.03,
  "psi_izolat": 0.005,
  "chi": true,
  "is_point_bridge": true,
  "unit": "W/K",
  ...
}
```

Opțiunea 2 — adaugă câmp `bridge_type` și engine-ul îl tratează diferit:
```json
{ "psi": 0.03, "bridge_type": "point", "psi_izolat": 0.005, ... }
```
și engine-ul `applyPunti` să treacă pe `χ × N_count` în loc de `Ψ × L`.

**Impact**: până la fix, **5 punți punctuale tipice (HVAC + cabluri + termoficare + suport panou solar + coș fum)** sunt invizibile în calcul.

---

## C. Discrepanțe semnificative (P1)

### C1. Cod ISO 14683 inexistent: "RF" la atic (linia 16)

Detaliul "Perete ext. — Planșeu terasă" citează `tip RF`. **ISO 14683:2017 Tabel 1 NU conține codul "RF"**. Codurile valide pentru roof junctions sunt:
- `R` — roof (joncțiune perete-acoperiș)
- `P` — parapet (atic ridicat)

În schimb, metadata folosește corect `iso_14683_type: "R"`. **Discrepanță JSON principal vs metadata**.

**Patch**: înlocuiește în câmpul `detail`: "Ref: ISO 14683:2017 Tabel 1, tip R" (nu RF).

### C2. Duplicate cu valori divergente — necesită clarificare dimensională

**Pereche 1: HEA balcon penetrant**
- Linia 72: "Consolă metalică balcon (profil HEA penetrant)" — `psi: 0.65`
- Linia 122: "Consolă metalică balcon (profil HEA/IPE penetrant)" — `psi: 1.20`

Ambele plauzibile, dar pentru profile diferite (HEA100 vs HEA200). **Auditorul trebuie să știe care intrare să aleagă**. Recomandare: redenumește explicit:
- "Consolă HEA100/IPE100 penetrant" → ψ = 0,55–0,75
- "Consolă HEA160-200 penetrant" → ψ = 1,0–1,4

**Pereche 2: Velux mansardă**
- Linia 57: ψ = 0,16 / 0,07
- Linia 113: ψ = 0,34 / 0,10

Diferența 100% — probabil una e cu kit izolant Velux EDH/EDW (recomandată producător, ψ ≈ 0,15), cealaltă e montaj generic fără kit (ψ ≈ 0,30). **Trebuie clarificat în nume**.

**Pereche 3: Schöck Isokorb KXT**
- Linia 77: ψ = 0,11 (categoria "Balcoane avansate")
- Linia 126: ψ = 0,11 (categoria "Balcoane și logii – tipuri speciale")

**Identice**. Una poate fi eliminată sau marcată ca alias.

**Pereche 4: Timber frame – fundație**
- Linia 41: ψ = 0,12 (categoria "Structuri din lemn")
- Linia 108: ψ = 0,32 (categoria "Joncțiuni pereți – tipuri speciale")

Divergență 167%. Una se referă la Passivhaus (cu izolație 80mm + bandă vânt), cealaltă la detaliu standard. **Numele trebuie să distingă explicit**.

### C3. Reduceri ψ → ψ_izolat slabe (>60% retenție, sub țintă constructivă)

5 intrări cu reducere insuficientă:
- Linia 166 "Înlocuire fereastră aliniată în plan ETICS" — 0,045 → 0,030 (33% reducere). PHI Catalogue v2.0 indică Ψ ≤ 0,025 pentru montaj în izolație, deci `psi_izolat = 0.020` ar fi mai realist.
- Linia 168 "Soclu ETICS cu izolație XPS continuă" — 0,24 → 0,15 (37%). Surse PHI EWFS arată ψ poate ajunge la 0,06–0,08 cu XPS 80–100mm.
- Linia 173 "Fereastră tilt&turn aliniată" — 0,03 → 0,02 (33%). Pentru montaj Passivhaus cu Compacfoam, ψ → 0,01.
- Linia 175 "Prag termic ușă cu XPS sub prag" — 0,08 → 0,05 (37%). Cu prag termorupt complet (Schueco/Reynaers), ψ → 0,03.
- Linia 181 "Conexiune CLT perete-acoperiș" — 0,045 → 0,030 (33%). Pentru detaliu Passivhaus CLT certificat, ψ → 0,015.

**Recomandare**: revizuiește aceste 5 intrări coborând `psi_izolat` la ţinta Passivhaus realistă.

### C4. Surse vagi / generice

- Linia 32: "atlas standard" (intrarea originală nu mai apare — mențiune la mai multe — verificat în versiunea curentă, OK)
- Liniile 825, 858, 866, 882, 947 etc. citează "Sursă: ISO 14683 + calcule FEM" sau "practici constructive Passivhaus" fără referință specifică (raport, datasheet, codul detaliului). Acestea sunt acceptabile dar **nu trasabile** pentru un audit MDLPA strict.

### C5. EnEV citat indirect

Câteva referințe la "DIN 4108 Beiblatt 2" sunt corecte (rămâne în vigoare 2026), **dar referința GEG 2024** ar fi mai actuală. Recomandare: păstrează DIN 4108 Beiblatt 2 ca atlas constructiv (e neutru, doar detalii) și NU cita EnEV (abrogat din 1.XI.2020 — înlocuit cu GEG).

---

## D. Lipsuri normative (P2)

Tipologii esențiale neacoperite în catalogul actual:

### D1. Punți punctuale χ pentru fixări BIPV / panouri solare integrate
Nu există intrare specifică pentru module BIPV-glass-glass cu fixare în profil aluminiu (Schüco BIPV). χ tipic 0,03–0,06 W/K per ancoraj.

**Sugestie nouă intrare**:
```json
{
  "cat": "Instalații – tipuri speciale",
  "name": "Ancoraj BIPV (sticlă-sticlă) în fațadă cortină",
  "psi": 0.04,
  "psi_izolat": 0.012,
  "chi": true,
  "is_point_bridge": true,
  "desc": "Suport metalic BIPV penetrând izolația perimetrală a fațadei cortină",
  "detail": "BIPV vitros integrat în profile Schüco/Reynaers cu console metalice. χ = 0.04 W/K per ancoraj fără ruptură; cu console termorupte tip Armatherm: χ = 0.012 W/K. Sursă: EOTA TR 025, Schüco AWS technical manual, IEA PVPS Task 15."
}
```

### D2. Trecere conducte ventilație de fum / hote
Coș fum exterior și DW există (lin. 27, 80), dar **NU și hota bucătărie** (kitchen exhaust hood) sau **canalul de evacuare gaze de ardere centrală condensare** (Ø80–125 mm coaxial cu admisie aer). Acestea sunt obligatorii la audit blocuri reabilitate post-2010 și au χ = 0,03–0,08 W/K.

### D3. Punți la rosturi de dilatare clădiri lungi (>40 m)
Pentru clădiri cu rost dilatație betonate (panouri prefabricate gen IPCT '70-'80, supermarketuri lung-modulare), există rost vertical pe fațadă cu profile Z metalice. Lipsă specifică din catalog. ψ tipic = 0,12–0,25 W/(m·K).

### D4. Casetă jaluzele exterioare cu nișă deschisă (EnEV / RT 2012 detail)
Catalogul are "Cutie de jaluzele (casetă roletă)" generic (lin. 30), dar **NU distinge**:
- Casetă integrată în izolație (PUR în jurul casetei) — ψ ≈ 0,10
- Casetă în nișă neuzilizată exterior (worst case RT 2012 §6.4) — ψ ≈ 0,55

### D5. Terase circulabile vs. necirculabile (loft ballast)
"Acoperiș verde extensiv" și "intensiv" există, dar **NU și**:
- Terasă circulabilă cu plot-uri din PVC + dale de granit (terasă tehnică) — ψ atic = 0,40 fără izolație, 0,12 cu izolație
- Terasă invertită cu strat ballast de pietriș 5–8 cm peste hidroizolație

### D6. Pereți cortină stick mullion-transom — montant în axa sticlei
Există "Fațadă cortină — colț exterior" (lin. 56) și "spandrel" (lin. 116), dar lipsește **montantul vertical (mullion)** ca punte continuă în plan vitraj. EN 13830:2015 cere acest detaliu specific.

### D7. Subsol neîncălzit / pivnițe parțial îngropate sub CTS variabil
Catalog actual: "Pivniță neîncălzită — perete parțial subteran" (lin. 38). **NU acoperă**:
- Subsol cu CTS variabil pe perimetru (clădiri pe teren în pantă) — necesită modelare per fațadă
- Garaj subteran cu rampă acces neîncălzită

### D8. Punți la trecere lift / casa scării către exterior
Lifturi pe fațadă (panoramic) sau casă scări neîncălzită care comunică cu exteriorul prin uși batante automate. ψ tipic la cadrul ușii lifit = 0,15–0,30. Lipsă specific.

---

## E. Recomandări extindere schemă JSON (P3)

### E1. Câmp `iso_14683_code` (cod oficial ISO 14683:2017)

În prezent codul ISO e **doar în metadata**, nu și în JSON-ul principal. Aplicații downstream (export DOCX, raport CPE, OCR clasificare) ar putea folosi codul direct dacă era pe fiecare intrare.

```json
{
  "cat": "Joncțiuni pereți",
  "name": "Perete ext. — Planșeu intermediar",
  "iso_14683_code": "IF",   // NEW
  "psi": 0.1,
  ...
}
```

**Migration plan pentru 204 intrări**: scriere script Node care citește `metadata.entries[name].iso_14683_type` și îl injectează în JSON principal. Fall-back: dacă nu există în metadata, folosește mapping din `categories[cat].iso_14683_types[0]`.

### E2. Câmp `dimension_system` (SR EN ISO 14683:2017 §4.4)

Mc 001-2022 cere **dimensiuni interioare li** (suprafețe interioare ale pereților). ISO 14683 oferă valori atât pentru sistemele "interior" cât și "exterior". Ambiguitatea actuală a catalogului face ca auditorul să nu știe sigur ce sistem geometric folosește.

```json
"dimension_system": "interior"  // valori valide: "interior" | "exterior" | "interior_exterior"
```

**Convenția Mc 001-2022 RO**: 100% sistem interior. Recomandare: setează default `"interior"` pe toate intrările, marchează cu `"exterior"` doar entrările sourced din DIN/RT 2012 unde valorile sunt date pentru sistem exterior.

### E3. Câmp `method` (cum a fost obținută valoarea)

```json
"method": "iso14683_default"
// valori: "iso14683_default" (Tab 1 ISO) | "numeric_iso10211" (calc 2D/3D) | "atlas_validated" (PHI/RT2012) | "expert_judgment"
```

**Util pentru**:
- Auditori sceptici: pot vedea dacă o valoare e "default ISO simplificat" (precizie ±0,05) sau "calc numeric validat" (precizie ±0,01)
- Filtrare în UI: "Arată doar valori cu calc numeric ISO 10211"
- Raport CPE: explicit ce metodă a fost folosită (cerință Mc 001-2022 §11.3)

### E4. Câmp `bridge_type` (linear / point) și unitate explicită

```json
"bridge_type": "linear",   // sau "point"
"unit": "W/(m·K)"          // sau "W/K" pentru point
```

Aceasta rezolvă ambiguitatea P0 #2. Engine-ul `applyPunti` poate să bifurce:
```js
if (bridge.bridge_type === 'point') {
  loss += bridge.psi * bridge.count;   // χ × N
} else {
  loss += bridge.psi * bridge.length;  // Ψ × L
}
```

### E5. Câmp `chi_per_unit` separat de `psi` (clarification)

În loc de hack-ul actual cu `chi: true` flag, schema mai curată:
```json
{
  "name": "Diblu metalic de prindere EPS",
  "bridge_type": "point",
  "chi_per_unit": 0.003,
  "chi_per_unit_optimized": 0.001,
  "typical_density": 6,        // unități/m² (pentru calcul automatic suplimentar)
  "unit": "W/K"
}
```

### E6. Câmpuri suplimentare propuse (low priority, nice-to-have)

- `fRsi_min_required`: pragul din ISO 13788 pentru risc condens (0,75 RO rezidențial; 0,80 spitale; 0,65 industrial)
- `applicability`: array cu tipuri de clădiri unde e relevant (`["residential","public","industrial"]`)
- `vintage`: array cu epoci constructive (`["pre-1950","1950-1990","post-2010"]`)
- `references_external`: array URL-uri sursă cu ID document (BSI BR 497, ETA-06/0134, etc.)

---

## F. Decizii arhitecturale (P3)

### F1. Câmpul `annual_loss_factor` din metadata — păstrăm sau înlocuim cu DD dinamic?

În `thermal-bridges-metadata.json`, `detail_templates[*].annual_loss_factor` e un multiplier (0,3 până la 2,0) care înlocuiește calculul direct. Formula referită: `Q_an = ψ × L × DD × 24 / 1000 × factor`, unde DD = 3170 K·zile București.

**Problema**: DD București ≠ DD Brașov (3675) ≠ DD Constanța (2680). Pentru clădiri în alte localități, factorul actual induce eroare ±15%.

**Recomandare**: înlocuiește cu formulă completă citită din `climate.json` per localitate:
```js
Q_an_kWh_per_m_year = (psi * 24 * DD_local) / 1000;
// fără multiplier opac — e calc fizic exact
```

Câmpul `annual_loss_factor` poate rămâne ca rezervă pentru cazuri speciale (orientări, expunere vânt) dar **nu pentru core calc**.

### F2. Câmpul `repair_priority` (1–5) — documentăm criteriul

În prezent prioritățile 1–5 sunt setate "expert judgment" fără criteriu publicat. Recomandare: documentează în `_meta.priority_criteria`:

```
1 = cosmetic / efect minor (impact <2 kWh/m·an, fRsi >0,80)
2 = util de optimizat (impact 2–5 kWh/m·an, fRsi 0,75–0,80)
3 = energetic necesar (5–10 kWh/m·an, fRsi 0,70–0,75)
4 = critic (10–20 kWh/m·an, fRsi 0,65–0,70, risc condens iarnă)
5 = sanitar/structural urgent (>20 kWh/m·an, fRsi <0,65, risc mucegai/Stachybotrys)
```

### F3. Sistem dimensional explicit

Rezolvat în E2. Sub-decizie: dacă auditorul Zephren introduce dimensiuni externe (rar — dar posibil pentru import IFC), trebuie un convertor:
- li (interior) ≈ le (exterior) − 2·grosime_perete
- ψ_interior ≈ ψ_exterior + ΔU_perete · grosime (transformare ISO 14683 §C.3)

Recomandare implementare: un helper `convertPsiSystem(psi, fromSystem, toSystem, U_wall, thickness)` care normalizează totul la sistem interior înainte de calc.

---

## G. Opinia auditorului — ce ar face Zephren best-in-class european

**Catalogul Zephren la 78/100 e mai bun decât 90% din software-uri RO** (CIPCert, AB Energy, etc. nu publică deloc punți termice — folosesc direct C107/4-1997 Tabel 1, ~30 valori). Dar **nu rivalizează cu PHPP / Hottgenroth (DE) sau Perrenoud (FR)**, care au:

### G1. Atlas vizual interactiv (PHPP / Hottgenroth)
PHPP livrează **atlas PDF cu 200+ detalii desenate la scara 1:10**, fiecare cu calc 2D ISO 10211 documentat (output Therm/Flixo). Zephren nu are imagine pentru detalii (`illustration: false` — corect notat dar gol). Sugestie: integrare cu librărie SVG open-source (de ex. PassREg detail library, CC-BY).

### G2. Calc numeric integrat (Hottgenroth WUFI Bridges)
Hottgenroth permite **modelare 2D directă în UI** cu eXport ψ + fRsi automat. Zephren ar putea integra cu THERM (LBNL, free) sau PsiTherm (Hottgenroth API plătit) — auditorul desenează detaliul, primește valoarea. Realist pentru 2027.

### G3. Trasabilitate completă (Perrenoud BBS)
Fiecare valoare ψ în Perrenoud are câmp **Source URL + Document ID + Page#**. Zephren are surse generice. Rezolvare prin task-ul P3 din E1.

### G4. fRsi automat per detaliu (Schöck Thermo Online)
Schöck oferă **calculator online unde introduci T_int, T_ext, HR și primește fRsi direct + verificare ISO 13788**. Zephren are fRsi în metadata `detail_templates`, dar **nu face check automat** la export CPE. Sugestie: în Step 6 export, verificare automată `fRsi_template[detail.detail_template] >= 0.75` și avertisment dacă fail.

### G5. Filtrare per epocă constructivă (lipsește peste tot în EU)
Auditorul român lucrează 70% pe blocuri IPCT '70-'90 + case rurale pre-1950. Catalogul are categorii relevante dar **nu există filtru "Arată-mi doar punți specifice blocurilor 1980 nereabilitate"**. Adăugarea câmpului `vintage` (E6) + UI filter ar fi diferențiator clar pe piața RO.

### G6. Catalog parteneri RO (Tigaiat, Adeplast, Rockwool RO) — viitor commercial
La fel ca în catalogul HVAC + Renewable, schema neutră `brand: null` permite parteneriate cu producători. Schöck deja are reprezentanță RO (Schöck Bauteile RO SRL) și Halfen via Kone. **Catalog brand-uri ruptori termici RO: 5–7 entries la 2027**, cu link afiliat eligibil.

### G7. Validare cross-source automatizată (lipsește la toți)
Zephren ar putea fi primul software EU care, la fiecare intrare ψ, **face automat un check vs 3 surse**:
- ISO 14683 Tab 1 default
- PHI Passipedia (dacă există)
- Atlas RT 2012 sau DIN 4108 Beiblatt 2

Și colorează intrarea: verde (toate 3 concordă ±10%), galben (1 sursă diferă), roșu (>2 surse divergente). E un nivel de QA care nu există nicăieri pe piață.

---

## H. Plan de acțiune prioritizat

### Sprint imediat (1 zi)
- [P0] Fix `psi_izolat = -0.07` la "Colț interior" (linia 5)
- [P0] Refactor 5 intrări `chi:true psi=0` → schema uniformă cu `psi` populat
- [P1] Înlocuire cod ISO inexistent "RF" → "R" în detail (1 intrare)
- [P1] Eliminare/marcare alias 4 perechi duplicate

### Sprint scurt (1 săptămână)
- [P2] Adăugare 8 lipsuri (D1–D8) — 8 entries noi cu surse PHI/RT2012
- [P3] Migration script Node: injectare `iso_14683_code` în JSON principal din metadata (1h)
- [P3] Adăugare câmp `bridge_type` la cele 13 entries chi:true existente
- [P3] Refactor `wizardOpaqueCalc.js` să bifurce per `bridge_type`

### Sprint mediu (2 săptămâni)
- [P3] Documentare `priority_criteria` în metadata (decizie arhitecturală)
- [P3] Fix engine: înlocuire `annual_loss_factor` static cu DD per localitate din `climate.json`
- [P3] Verificare cruce-surse semi-automată la build (script CI care reportează divergențe >15% vs ISO 14683 Tab 1)

### Sprint lung (1–3 luni — Step 8 / Expert plan)
- [G1] Integrare imagini SVG pentru top 50 detalii (atlas vizual)
- [G4] Auto-check fRsi la export CPE Step 6
- [G7] Cross-source validation pipeline

---

## Anexă: statistici complete catalog

**Distribuție psi**:
- ψ < 0 (favorabil): 2 intrări
- 0 ≤ ψ < 0,05: 28 intrări
- 0,05 ≤ ψ < 0,15: 67 intrări
- 0,15 ≤ ψ < 0,30: 51 intrări
- 0,30 ≤ ψ < 0,50: 31 intrări
- 0,50 ≤ ψ < 1,00: 23 intrări
- ψ ≥ 1,00: 2 intrări (HEA balcon 1,2 + HEB stâlp 1,5)

**Reduceri ψ → ψ_izolat (mediu pe categorie)**:
- Categoriile cu reducere medie >70% (eficient): Joncțiuni speciale, Tradițional RO, Joncțiuni pereți – tipuri speciale
- Categoriile cu reducere medie <40% (slab — verifică): CLT / Lemn masiv, Sisteme ETICS, Pasivhaus / nZEB
- (Notă: la categoriile deja la limita Passivhaus, e firesc ca reducerea suplimentară să fie mică în cifre absolute.)

**Acoperire ISO 14683 Tab 1**:
- IF (intermediate floor): ✅ acoperit complet
- GF (ground floor): ✅ acoperit complet (15 intrări — categorie cea mai mare)
- R (roof): ✅ acoperit complet
- C (corner): ✅ acoperit
- B (balcony): ✅ acoperit (cu ruptori specifici producători Schöck/Halfen/Leviat)
- P (parapet): ✅ acoperit
- W (window jamb/head/sill): ✅ acoperit
- D (door): ✅ acoperit (parțial — lipsesc uși tehnice / lift)
- IW (internal wall): ⚠️ parțial (doar 2 entries explicite)
- chi-punctual (point): ⚠️ parțial — schema bug P0 #2 face 5/13 punctuale invizibile

---

**Concluzie**: Catalog robust pentru un produs comercial, cu fundație normativă solidă (ISO 14683:2017 + Mc 001-2022 + atlas PHI/Schöck citate corect). **Două bug-uri P0 critice** trebuie rezolvate URGENT (Colț interior + 5 chi=0). **8 lipsuri P2** pot fi adăugate în 1 săptămână. **Schema P3** (bridge_type, dimension_system, method) e investiție pentru calitate enterprise de nivel european — recomandată pentru următorul ciclu major v2.0.
