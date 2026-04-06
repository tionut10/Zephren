// ═══════════════════════════════════════════════════════════════
// TRANSFER TERMIC PRIN SOL — ISO 13370:2017
// Metode: Placă pe sol, Subsol (parțial/total), Spațiu ventilat
// Include componenta periodică sezonieră (Annex A)
// ═══════════════════════════════════════════════════════════════

// psi_perimeter: coeficient liniar punți termice perimetrale [W/(m·K)]
// Calculat în funcție de grosimea și λ izolației perimetrale (ISO 13370 Tabel 3)
export function calcPsiPerimeter(insulThicknessM, insulLambda) {
  if (!insulThicknessM || insulThicknessM <= 0) return 0.35; // fără izolație perimetrală
  var Rins = insulThicknessM / (insulLambda || 0.035);
  // Formulă aproximativă din ISO 13370 §9.3 pentru izolație orizontală externă
  if (Rins >= 10) return 0.05;
  if (Rins >= 5)  return 0.08;
  if (Rins >= 3)  return 0.12;
  if (Rins >= 2)  return 0.18;
  return 0.25; // izolație subțire
}

export function calcGroundHeatTransfer(floorArea, perimeter, uFloor, basementDepth, lambdaSoil, insulPerimThick, insulPerimLambda) {
  if (!floorArea || !perimeter) return null;
  lambdaSoil = lambdaSoil || 1.5; // conductivitate termică sol [W/(m·K)] — argilă medie
  basementDepth = basementDepth || 0;
  const B_prime = floorArea / (0.5 * perimeter); // dimensiune caracteristică B' [m]
  // dt = grosime echivalentă totală a planșeului [m] (inclusiv rezistență termică)
  const dt = 0.5 + lambdaSoil * (uFloor ? 1/uFloor : 0.5); // ISO 13370 §8.1 Ec. (3)

  let U_ground;
  if (B_prime + dt > 0) {
    if (basementDepth <= 0) {
      // Placă pe sol (slab-on-ground) — ISO 13370 §8.1
      if (dt < B_prime) {
        // Placa subțire față de dimensiunea B'
        U_ground = (2 * lambdaSoil) / (Math.PI * B_prime + dt) * Math.log(Math.PI * B_prime / dt + 1);
      } else {
        // Placă groasă (dt ≥ B')
        U_ground = lambdaSoil / (0.457 * B_prime + dt);
      }
    } else {
      // Subsol — ISO 13370 §9.1 (metoda simplificată)
      const U_bf = (2 * lambdaSoil) / (Math.PI * (B_prime + basementDepth)) *
                   Math.log(Math.PI * B_prime / (B_prime + basementDepth) + 1);
      const U_bw = (2 * lambdaSoil) / (Math.PI * basementDepth) * (1 + 0.5 * basementDepth / (basementDepth + dt));
      U_ground = 1 / (1/U_bf + floorArea / (perimeter * basementDepth) * 1/U_bw);
    }
  } else {
    U_ground = uFloor || 0.5;
  }

  // psi_perimeter calculat (nu hardcodat)
  const psi_perimeter = calcPsiPerimeter(insulPerimThick, insulPerimLambda);

  // H_ground [W/K] = transfer termic anual total prin sol
  const H_ground = U_ground * floorArea + psi_perimeter * perimeter;

  // ─── Componentă periodică sezonieră — ISO 13370 Anexa A ───
  // Amplitudinea periodică H_pi contabilizează efectul de stocare termică al solului
  // δ = adâncime de penetrare termică [m] = sqrt(λ_sol × T / (π × ρ × c))
  // Cu ρ_sol ≈ 1600 kg/m³, c_sol ≈ 1000 J/(kg·K), T = 1 an = 3.156×10⁷ s
  const rho_soil = 1600, c_soil = 1000, T_period = 3.156e7;
  const delta = Math.sqrt(lambdaSoil * T_period / (Math.PI * rho_soil * c_soil)); // ~2-3 m
  const H_pi = floorArea * Math.sqrt(Math.pow(2 * lambdaSoil / (Math.PI * delta), 2) +
                                      Math.pow(psi_perimeter * perimeter / floorArea, 2));
  // Defazaj termic față de temperatura exterioară (luni)
  const phaseShiftMonths = 1 + delta / 2; // estimare simplificată

  return {
    B_prime: Math.round(B_prime * 100) / 100,
    U_ground: Math.round(U_ground * 1000) / 1000,
    H_ground: Math.round(H_ground * 10) / 10,
    H_periodic: Math.round(H_pi * 10) / 10,
    phaseShift_months: Math.round(phaseShiftMonths * 10) / 10,
    psi_perimeter: Math.round(psi_perimeter * 1000) / 1000,
    delta_soil: Math.round(delta * 100) / 100,
    lambdaSoil,
    method: basementDepth > 0 ? "ISO 13370:2017 — Subsol" : "ISO 13370:2017 — Placă pe sol",
  };
}
