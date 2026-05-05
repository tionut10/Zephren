# Cross-source validation — Catalog Punți Termice

**Data**: 2026-05-05
**Total entries**: 215
**Surse de referință**: SR EN ISO 14683:2017 Tabel 1 + PHI Passipedia + DIN 4108 Beiblatt 2 + atlas RT 2012

## Sumar

| Status | Count | % | Semnificație |
|--------|-------|---|--------------|
| 🟢 green   | 177 | 82.3% | concordă ±10% cu cel puțin o sursă |
| 🟡 yellow  | 12 | 5.6% | divergență 10–25% — review recomandat |
| 🔴 red     | 10 | 4.7% | divergență >25% sau eroare fizică — fix urgent |
| ⚪ na      | 16 | 7.4% | tipologie ne-acoperită de ISO 14683 (vernacular, monumente, χ punctual) |

**Score acuratețe normativă**: 89.8% (green + na, intervalele ISO + cazuri legitim ne-acoperite)

## 🔴 Divergențe critice (red — fix urgent)

- **Joncțiuni pereți | Colț exterior** [CO]
  - ψ=0.05, ψ_izolat=0.02
  - psi=0.05 (interval ISO -0.15-0.03, gap 40%); psi_izolat=0.02 (interval -0.15-0, gap 40%)

- **Structuri prefabricate | Panou prefabricat — colț exterior** [C]
  - ψ=0.4, ψ_izolat=0.1
  - psi=0.4 (interval ISO 0.02-0.25, gap 60%); psi_izolat=0.1 (interval 0.005-0.1, gap 0%)

- **Joncțiuni pereți – tipuri speciale | Joncțiune panou prefabricat mare – planșeu (bloc vechi)** [IF]
  - ψ=0.6, ψ_izolat=0.2
  - psi=0.6 (interval ISO 0.1-1.2, gap 0%); psi_izolat=0.2 (interval 0.01-0.15, gap 33%)

- **Structuri speciale | Stâlp HEB/HEA din oțel în peretele exterior (structură metalică)** [P]
  - ψ=1.5, ψ_izolat=0.25
  - psi=1.5 (interval ISO 0.1-0.8, gap 87%); psi_izolat=0.25 (interval 0.04-0.25, gap 0%)

- **Panou sandwich | Colț extern panouri sandwich cu profil colț metalic continuu** [C]
  - ψ=0.25, ψ_izolat=0.15
  - psi=0.25 (interval ISO 0.02-0.25, gap 0%); psi_izolat=0.15 (interval 0.005-0.1, gap 50%)

- **Panou sandwich | Profil colț sandwich + grindă structurală metalică** [C]
  - ψ=0.375, ψ_izolat=0.2
  - psi=0.375 (interval ISO 0.02-0.25, gap 50%); psi_izolat=0.2 (interval 0.005-0.1, gap 100%)

- **Acoperiș complex | Coș de fum prin acoperiș izolat (zidărie BCA + termoizolație + șorț)** [R]
  - ψ=0.55, ψ_izolat=0.3
  - psi=0.55 (interval ISO 0.05-0.8, gap 0%); psi_izolat=0.3 (interval 0.01-0.2, gap 50%)

- **Acoperiș complex | Skydome (cupolă lumină) profil aluminiu** [R]
  - ψ=0.65, ψ_izolat=0.3
  - psi=0.65 (interval ISO 0.05-0.8, gap 0%); psi_izolat=0.3 (interval 0.01-0.2, gap 50%)

- **Tradițional RO | Cosoroabă lemn pe zidărie veche (wallplate 14×14 cm)** [IF]
  - ψ=0.4, ψ_izolat=0.2
  - psi=0.4 (interval ISO 0.1-1.2, gap 0%); psi_izolat=0.2 (interval 0.01-0.15, gap 33%)

- **Tradițional RO | Soclu de piatră fundație case rurale (50 cm înălțime, fără izolație)** [GF]
  - ψ=0.875, ψ_izolat=0.4
  - psi=0.875 (interval ISO 0.1-1.4, gap 0%); psi_izolat=0.4 (interval 0.05-0.3, gap 33%)

## 🟡 Divergențe moderate (yellow — review recomandat)

- **Instalații | Țeavă neizolată prin perete ext.** [chi-punctual]
  - ψ=0.15, ψ_izolat=0.03
  - punte punctuală fără unit W/K explicit

- **Instalații | Canal ventilare prin perete** [chi-punctual]
  - ψ=0.2, ψ_izolat=0.06
  - punte punctuală fără unit W/K explicit

- **Instalații | Coș de fum exterior** [chi-punctual]
  - ψ=0.3, ψ_izolat=0.1
  - punte punctuală fără unit W/K explicit

- **Instalații avansate | Trecere conductă termică izolată prin perete** [chi-punctual]
  - ψ=0.06, ψ_izolat=0.02
  - punte punctuală fără unit W/K explicit

- **Instalații avansate | Trecere cablu electric prin perete exterior** [chi-punctual]
  - ψ=0.03, ψ_izolat=0.01
  - punte punctuală fără unit W/K explicit

- **Joncțiuni pereți – tipuri speciale | Perete exterior BCA cu stâlp beton (fără izolație fațadă)** [P]
  - ψ=0.9, ψ_izolat=0.15
  - psi=0.9 (interval ISO 0.1-0.8, gap 12%); psi_izolat=0.15 (interval 0.04-0.25, gap 0%)

- **Joncțiuni pereți – tipuri speciale | Joncțiune panou prefabricat – colț exterior (bloc)** [C]
  - ψ=0.3, ψ_izolat=0.08
  - psi=0.3 (interval ISO 0.02-0.25, gap 20%); psi_izolat=0.08 (interval 0.005-0.1, gap 0%)

- **Ferestre și uși – tipuri speciale | Fațadă cortină – ancorare la planșeu intermediar (brackets)** [IF]
  - ψ=0.65, ψ_izolat=0.18
  - psi=0.65 (interval ISO 0.1-1.2, gap 0%); psi_izolat=0.18 (interval 0.01-0.15, gap 20%)

- **Ferestre și uși – tipuri speciale | Fațadă cortină – zona spandrel la planșeu** [CW]
  - ψ=0.5, ψ_izolat=0.14
  - psi=0.5 (interval ISO 0.05-0.4, gap 25%); psi_izolat=0.14 (interval 0.02-0.2, gap 0%)

- **Instalații – tipuri speciale | Coș de fum exterior din zidărie – racordul cu peretele exterior** [IF]
  - ψ=0.55, ψ_izolat=0.18
  - psi=0.55 (interval ISO 0.1-1.2, gap 0%); psi_izolat=0.18 (interval 0.01-0.15, gap 20%)

- **Reabilitare ETICS | Atic vechi netermoizolat cu ETICS doar pe față exterioară** [P]
  - ψ=0.7, ψ_izolat=0.3
  - psi=0.7 (interval ISO 0.1-0.8, gap 0%); psi_izolat=0.3 (interval 0.04-0.25, gap 20%)

- **Ferestre și uși – tipuri speciale | Casetă jaluzele exterioare cu nișă neuzilizată (RT 2012 worst-case)** [WJ]
  - ψ=0.55, ψ_izolat=0.1
  - psi=0.55 (interval ISO 0.03-0.5, gap 10%); psi_izolat=0.1 (interval 0.01-0.12, gap 0%)

## Acțiune CI/CD

Pentru a integra în GitHub Actions, adaugă în `.github/workflows/validate.yml`:

```yaml
name: Validate thermal bridges
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd energy-app && node scripts/validate-cross-sources.cjs
      - name: Fail on red entries
        run: |
          if grep -q "🔴 red" energy-app/docs/CROSS_SOURCE_VALIDATION.md; then
            count=$(grep -c "🔴 red" energy-app/docs/CROSS_SOURCE_VALIDATION.md || true)
            echo "Entries cu divergență critică detectate. Verifică raportul."
            exit 1
          fi
```
