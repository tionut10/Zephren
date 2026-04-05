export function calcHourlyISO52016(params) {
  const { T_ext, Au, H_tr, H_ve, C_m, theta_int_set_h, theta_int_set_c, Q_int, Q_sol } = params;
  if (!T_ext || T_ext.length !== 8760) {
    return { error: "Necesită date climatice orare 8760h/an (format TMY/EPW)", qH_nd_annual: null, qC_nd_annual: null };
  }

  // 5R1C simplified RC network per ISO 52016-1 §6.5
  const H_em = H_tr * 0.5; // external mass coupling
  const H_ms = 9.1 * Au;   // mass-surface coupling (ISO 13790 §12.2.2)
  const H_is = 3.45 * Au;  // internal surface coupling

  const dt = 3600; // 1 hour timestep [s]
  let theta_m_prev = 20; // initial mass temperature
  const hourly_h = new Float64Array(8760);
  const hourly_c = new Float64Array(8760);
  let qH_total = 0, qC_total = 0, peak_h = 0, peak_c = 0;

  for (let h = 0; h < 8760; h++) {
    const T_e = T_ext[h];
    const Q_i = (Q_int ? Q_int[h] : 0) || (Au * 5); // default 5 W/m² internal gains
    const Q_s = (Q_sol ? Q_sol[h] : 0) || 0;

    // ISO 52016-1 simplified: solve for theta_air given theta_m_prev
    const phi_total = 0.5 * (Q_i + Q_s);
    const phi_m = H_em * T_e + phi_total * (H_ms / (H_ms + H_em));
    const theta_m = (theta_m_prev * C_m / dt + phi_m) / (C_m / dt + H_ms + H_em);
    const theta_s = (H_ms * theta_m + phi_total + H_is * theta_int_set_h) / (H_ms + H_is);

    // Heating need
    const phi_HC_nd_h = Math.max(0, (H_tr + H_ve) * (theta_int_set_h - T_e) - Q_i - Q_s);
    // Cooling need
    const phi_HC_nd_c = Math.max(0, Q_i + Q_s - (H_tr + H_ve) * (T_e - theta_int_set_c));

    // Determine actual mode (free-float, heating, or cooling)
    let phi_H = 0, phi_C = 0;
    const theta_free = T_e + (Q_i + Q_s) / (H_tr + H_ve);
    if (theta_free < theta_int_set_h) {
      phi_H = phi_HC_nd_h;
    } else if (theta_free > theta_int_set_c) {
      phi_C = phi_HC_nd_c;
    }

    hourly_h[h] = phi_H / 1000; // kW
    hourly_c[h] = phi_C / 1000;
    qH_total += phi_H / 1000; // kWh (1h timestep)
    qC_total += phi_C / 1000;
    if (phi_H > peak_h) peak_h = phi_H;
    if (phi_C > peak_c) peak_c = phi_C;

    theta_m_prev = theta_m;
  }

  return {
    qH_nd_annual: Math.round(qH_total),    // kWh/an
    qC_nd_annual: Math.round(qC_total),     // kWh/an
    qH_nd_m2: Au > 0 ? Math.round(qH_total / Au * 10) / 10 : 0,
    qC_nd_m2: Au > 0 ? Math.round(qC_total / Au * 10) / 10 : 0,
    peak_h: Math.round(peak_h),             // W
    peak_c: Math.round(peak_c),             // W
    hourly_heating: hourly_h,
    hourly_cooling: hourly_c,
    method: "ISO 52016-1:2017 (5R1C simplified)",
    error: null,
  };
}
