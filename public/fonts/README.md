# Fonts — Roboto pentru diacritice RO în PDF

## De ce?

jsPDF folosește implicit font-urile built-in (helvetica, courier, times).
Niciunul nu suportă diacriticele românești (ă â î ș ț) — rezultă
pătrățele sau caractere înlocuite în PDF.

Zephren livrează **strategie duală** (`src/utils/pdf-fonts.js`):

- **A) Roboto TTF embedded** — dacă `public/fonts/Roboto-Regular.ttf`
  există, e încărcat la runtime, encodat base64 și înregistrat în VFS-ul
  jsPDF. Diacriticele apar natural în PDF.
- **B) Fallback transliterare** — dacă TTF-ul lipsește, diacriticele
  sunt transliterate automat (ă→a, ș→s, ț→t etc.) pentru a evita
  caractere corupte. PDF-ul rămâne lizibil, doar fără diacritice.

## Instalare

1. Descarcă `Roboto-Regular.ttf` de pe
   <https://fonts.google.com/specimen/Roboto>
2. Copiază-l ca `public/fonts/Roboto-Regular.ttf` (acest folder)
3. Next deploy — fișierul va fi servit de Vercel la `/fonts/Roboto-Regular.ttf`

## Licență

Roboto e distribuit sub **Apache License 2.0** — permite redistribuire
comercială, inclusiv embed în aplicații proprii.

## Alternative

Dacă vrei un font mai ușor (Roboto-Regular.ttf ≈ 160 KB), poți folosi:

- **DejaVu Sans** (Bitstream Vera, public domain, ~340 KB)
- **Noto Sans Romanian** (SIL Open Font, ~250 KB)
- **Open Sans** (Apache 2.0, ~220 KB)

Pentru oricare alternativă, ajustează numele fișierului în
`src/utils/pdf-fonts.js` (constanta path).
