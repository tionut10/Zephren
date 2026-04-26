# Fonts — Diacritice RO native în PDF

## De ce?

jsPDF folosește implicit Helvetica/Times/Courier, niciunul nu suportă
diacriticele românești (ă â î ș ț). Rezultă pătrățele/blanks în PDF.

Zephren livrează **strategie duală** (`src/utils/pdf-fonts.js`):

- **A) Liberation Sans TTF embedded** — fișierele 4 stiluri din acest
  folder sunt încărcate la runtime, encodate base64 și înregistrate în
  VFS-ul jsPDF. Diacriticele apar natural în PDF, inclusiv în textul
  bold/italic al tabelelor autoTable. Sintetic-validat după înregistrare:
  `setFont` + `getTextWidth` confirmă că parserul jsPDF acceptă fișierul.

- **B) Fallback transliterare** — dacă TTF-urile lipsesc sau jsPDF nu
  poate parsa cmap-ul (ex: subtable format 12 incompatibil), diacriticele
  sunt automat transliterate (ă→a, ș→s, ț→t etc.). PDF-ul rămâne lizibil.

## Fișiere

| Fișier | Stil | Mărime | Sursă |
|---|---|---|---|
| `LiberationSans-Regular.ttf` | normal | ~140 KB | pdfjs-dist (Red Hat) |
| `LiberationSans-Bold.ttf` | bold | ~137 KB | pdfjs-dist |
| `LiberationSans-Italic.ttf` | italic | ~162 KB | pdfjs-dist |
| `LiberationSans-BoldItalic.ttf` | bolditalic | ~135 KB | pdfjs-dist |

**Total: ~575 KB** (4 stiluri).

## De ce Liberation Sans, nu Roboto?

Roboto v2 conține în cmap subtable format 12 (Microsoft Unicode UCS-4),
care declanșează `No unicode cmap for font` în jsPDF v4.x — parserul
respinge font-ul în tăcere (PubSub error, nu throw). Liberation Sans
are doar cmap format 4 (platform 0+3) — parsabil corect de jsPDF.
Confirmat experimental cu validare sintetică `setFont`+`getTextWidth`.

## Licență

Liberation Sans este distribuită sub **SIL Open Font License 1.1** —
permite redistribuire comercială, embed în PDF, modificări (cu păstrarea
notei de licență originală). Liberation Sans este metric-compatibilă cu
Arial/Helvetica (același advance width per glyph), deci layout-ul textului
rămâne identic dacă un PC fără font-ul instalat folosește Arial fallback.

## Alternative testate

| Font | Stare | Note |
|---|---|---|
| Liberation Sans | ✅ Funcționează | jsPDF parsează clean cmap format 4 |
| Roboto v2 (510 KB) | ❌ jsPDF respinge | cmap format 12 incompatibil |
| Roboto v2 (123 KB subset) | ❌ jsPDF respinge | cmap incomplet |
| DejaVu Sans (340 KB) | netestat | candidat alternativ |
| Noto Sans (250 KB) | netestat | candidat alternativ |

Pentru altă alegere, schimbă `FONT_FILES` și `VFS_NAMES` în
`src/utils/pdf-fonts.js`.
