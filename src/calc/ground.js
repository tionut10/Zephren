export function calcGroundHeatTransfer(floorArea, perimeter, uFloor, basementDepth, lambdaSoil) {
  if (!floorArea || !perimeter) return null;
  lambdaSoil = lambdaSoil || 1.5;
  basementDepth = basementDepth || 0;
  const B_prime = floorArea / (0.5 * perimeter);
  const dt = 0.5;
  let U_ground;
  if (B_prime + dt > 0) {
    if (basementDepth <= 0) {
      U_ground = (2 * lambdaSoil) / (Math.PI * B_prime + dt) * Math.log(Math.PI * B_prime / dt + 1);
    } else {
      const U_bf = (2 * lambdaSoil) / (Math.PI * (B_prime + basementDepth)) * Math.log(Math.PI * B_prime / (B_prime + basementDepth) + 1);
      const U_bw = (2 * lambdaSoil) / (Math.PI * basementDepth) * (1 + 0.5 * basementDepth / (basementDepth + dt));
      U_ground = 1 / (1/U_bf + floorArea / (perimeter * basementDepth) * 1/U_bw);
    }
  } else {
    U_ground = uFloor || 0.5;
  }
  const psi_perimeter = 0.05;
  const H_ground = U_ground * floorArea + psi_perimeter * perimeter;
  return {
    B_prime: Math.round(B_prime * 100) / 100,
    U_ground: Math.round(U_ground * 1000) / 1000,
    H_ground: Math.round(H_ground * 10) / 10,
    psi_perimeter,
    method: basementDepth > 0 ? "ISO 13370 — Subsol" : "ISO 13370 — Placă pe sol",
  };
}
