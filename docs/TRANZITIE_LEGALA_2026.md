# 📅 FAQ Tranziție Legală 2026 — Auditori Energetici

**Versiune document**: 2 mai 2026
**Sursă autoritară**: Ord. MDLPA 348/2026 (MO 292/14.IV.2026)

---

## 🕐 Calendarul tranziției

| Data | Eveniment |
|------|-----------|
| **14.IV.2026** | Ord. MDLPA 348/2026 publicat în MO 292/14.IV.2026 și formal în vigoare |
| **8.VII.2026** | Operaționalizare portal electronic MDLPA (60 zile lucrătoare de la publicare, conform Art. 19 alin. 3) |
| **11.X.2026** | Abrogare completă Ord. MDLPA 2237/2010 (Art. 7 din Ord. 348/2026 — 180 zile calendaristice) |

---

## ⚖️ Drepturi în perioada de tranziție (acum până la 11.X.2026)

### Atestate Ord. 2237/2010 (vechi)
- ✅ **Rămân valabile** pe vechiul regim până la expirarea naturală a dreptului de practică (5 ani de la emitere)
- ✅ Auditorul poate continua să exercite practica conform competențelor din vechiul ordin
- ⚠️ La prelungire, atestatul se aliniază la regimul nou (Ord. 348/2026)

### Atestate Ord. 348/2026 (noi)
- AE Ici (grad I civile) — **scop COMPLET** (Art. 6 alin. 1):
  - CPE pentru toate categoriile de clădiri
  - Audit energetic conform Mc 001-2022
  - Raport conformare nZEB pentru clădiri în fază de proiectare
- AE IIci (grad II civile) — **scop RESTRÂNS** (Art. 6 alin. 2):
  - CPE EXCLUSIV pentru locuințe (RI / RC / RA / BC)
  - DOAR scopuri: construire, recepție, vânzare, închiriere
  - NU poate face audit energetic
  - NU poate emite raport conformare nZEB
  - NU poate certifica clădiri publice / nerezidențiale / renovare

### Portalul electronic MDLPA (până la 8.VII.2026)
- ⚠️ **NU este operațional** pentru distincția Ici/IIci
- 📧 Procedura veche: depunere fizică / email la `birou.atestari@mdlpa.ro`
- 📄 **Scrisoare de însoțire PDF** generată automat de Zephren pentru depunere fizică
  (buton în panoul Submit MDLPA — disponibil până la activarea portalului)

---

## 💰 Ce se schimbă pe pricing Zephren

**Filozofie nouă (v7.1 — orientare FUNCȚIONALĂ, NU pe grad atestat):**

| Plan | Preț | Pentru cine |
|------|------:|-------------|
| Zephren AE IIci | 599 RON/lună | **Orice auditor** (Ici sau IIci) care face DOAR CPE + Anexa 1+2 (Pas 1-6) |
| Zephren AE Ici | 1.499 RON/lună | Auditori AE Ici care fac și audit energetic (Pas 1-7 + nZEB + LCC) |
| Zephren Expert | 2.999 RON/lună | Auditori senior + consultanți (Pas 1-8 + 18 module + BIM) |

**Distincție importantă:**
- **Plan** = ce vede auditorul în UI (limita comercială Zephren)
- **Atestat MDLPA** = ce poate semna LEGAL pe CPE-uri (Ord. 348/2026 Art. 6)

**Exemplu**: un auditor AE Ici care face DOAR CPE-uri (fără audit) poate folosi planul AE IIci 599 RON/lună, economisind 900 RON/lună față de planul AE Ici 1.499.

---

## 🔄 Ce face Zephren în perioada de tranziție?

### Soft warning în loc de blocaj strict

Până la 11.X.2026, dacă atestatul real al utilizatorului ar bloca o operațiune conform Art. 6 (de ex. AE IIci real încercând nerezidențial), Zephren afișează:
- ✅ Acțiunea e PERMISĂ (poți continua)
- ⏱️ Banner amber explicativ cu data 11.X.2026
- 📚 Citează articolul din Ord. 348/2026

După 11.X.2026 (sau cu `window.__forceStrictGrade = true` pentru testare), gating-ul devine strict (`ok: false`).

### Detecție automată ordin atestare

Pe baza datei emiterii atestatului din profilul auditorului:
- înainte de 14.IV.2026 → Ord. MDLPA 2237/2010 (banner violet 📜)
- de la 14.IV.2026 încolo → Ord. MDLPA 348/2026 (banner emerald 🆕)

Pe CPE-uri se citează ordinul corect conform datei.

### Mapping grade vechi → nou

Pentru atestate Ord. 2237/2010 cu denumiri vechi:
- „grad I civile" → AE Ici
- „grad II civile" → AE IIci
- „grad I+II constructii" → AE Ici (cel mai permisiv)
- „grad I instalații" → AE Ici

Mapping-ul e automat când auditorul completează textul exact din certificat.

---

## 🛡️ Verificări legale Zephren

| Funcție Zephren | Verifică | Comportament tranziție |
|-----------------|----------|------------------------|
| `canEmitForBuilding` | Drept legal de SEMNARE per clădire | Soft warning în tranziție (nu blochează) |
| `evaluateGate` (UI plan + grad) | Acces UI features | Plan-restricția rămâne strict; grad → soft în tranziție |
| `RaportConformareNZEB` | Drept emitere raport nZEB (Art. 6 lit. c) | Banner amber + raport disponibil în tranziție |
| `MDLPASubmitPanel` | Disponibilitate portal | Disable button cu CTA scrisoare PDF până 8.VII.2026 |
| `Step 1 — categorie clădire` | Compatibilitate categorie ↔ grad | Soft warning cu data 11.X.2026 |
| `Step 6 — banner ordin` | Citare Ord. 2237/2010 vs 348/2026 | Auto-detect din `attestationIssueDate` |

---

## 🔗 Link-uri către ordine oficiale

- **Ord. MDLPA 348/2026** — [Monitorul Oficial nr. 292/14.IV.2026](https://www.mdlpa.ro)
- **Ord. MDLPA 2237/2010** (regim tranziție, abrogat la 11.X.2026)
- **Ord. MDLPA 16/2023** — Metodologie Mc 001-2022 (în vigoare)
- **Lege 372/2005 R2** — Performanța energetică a clădirilor
- **Lege 238/2024** — Modificare L.372/2005 (RER + nZEB + BACS)
- **EPBD 2024/1275** — Directiva UE performanța energetică

---

## ❓ Întrebări frecvente

**Q: Atestatul meu Ord. 2237/2010 expiră la 15 august 2027. Ce se întâmplă?**
A: Atestatul rămâne valabil pe vechiul regim până la 15.VIII.2027. La prelungire (cerere între 30-90 zile înainte), te aliniezi automat la Ord. 348/2026.

**Q: Sunt AE IIci real, dar am cumpărat planul AE Ici (1.499 RON). Pot semna pe non-rezidențial?**
A: **NU** — atestatul tău e factorul legal. Planul îți dă acces UI la Step 7 + nZEB, dar drepturile de semnare sunt limitate de atestat (Art. 6 alin. 2). Pe CPE non-rezidențial nu poți semna legal.

**Q: Sunt AE Ici real, dar am cumpărat planul AE IIci (599 RON) pentru economie. Pot semna pe BIR?**
A: **DA** — atestatul îți dă drept legal de semnare pe orice categorie (Art. 6 alin. 1). Planul îți limitează doar accesul UI la Step 7 (audit energetic). Pe Step 1-6 (CPE) poți semna BIR fără probleme.

**Q: De ce văd un banner amber la nerezidențial dacă sunt AE IIci?**
A: Ești în perioada de tranziție (până la 11.X.2026). În acest interval, restricția Art. 6 alin. 2 nu este blocantă (atestatul vechi îți dă drept extins). După 11.X.2026, restricția devine blocantă strict.

**Q: Cum trimit CPE-ul la MDLPA dacă portalul nu e operațional?**
A: Folosește butonul „📄 Generează scrisoare de însoțire (PDF)" din panoul Submit MDLPA. PDF-ul se completează automat cu datele tale + ale clădirii și e gata pentru depunere fizică sau atașament email la `birou.atestari@mdlpa.ro`.

**Q: Când va fi disponibil portalul electronic MDLPA pentru distincția Ici/IIci?**
A: 8 iulie 2026 (60 zile lucrătoare de la publicarea Ord. 348/2026 pe 14.IV.2026, conform Art. 19 alin. 3).

---

*Document generat automat de Zephren · Sprint Tranziție 2026 · 2 mai 2026*
