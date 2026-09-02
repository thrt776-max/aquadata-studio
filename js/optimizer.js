/**
 * AquaData Studio - JS Optimization Engine (Greedy Heuristic)
 */
(function (global) {
  'use strict';

  function greedyOptimize(params) {
    const { pompes, vannes, demande, coutTph, coutTu } = params;
    const schedule = {};
    const pumpIds = Object.keys(pompes);
    pumpIds.forEach(pid => { schedule[pid] = new Array(24).fill(0); });
    Object.keys(vannes).forEach(vid => { schedule[vid] = new Array(24).fill(0); });

    const hourlyDemand = new Array(24).fill(0);
    for (let t = 0; t < 24; t++) { for (let i = 1; i <= 7; i++) hourlyDemand[t] += (demande['E' + i] || 0); }

    const pumpEff = pumpIds.map(pid => {
      const p = pompes[pid];
      const avgT = (coutTph.reduce((a,b)=>a+b,0) + coutTu.reduce((a,b)=>a+b,0)) / 48;
      return { pid, debit: p.debit, eff: (p.puissance * avgT) / p.debit };
    }).sort((a, b) => a.eff - b.eff);

    for (let t = 0; t < 24; t++) {
      let needed = hourlyDemand[t] * 1.1;
      for (const pe of pumpEff) { if (needed <= 0) break; schedule[pe.pid][t] = 1; needed -= pe.debit; }
      Object.keys(vannes).forEach(vid => { schedule[vid][t] = 1; });
    }

    let totalCost = 0;
    for (let t = 0; t < 24; t++) { Object.entries(pompes).forEach(([pid, p]) => { if (schedule[pid][t]) totalCost += p.puissance * ((p.tarif === 'TPH') ? coutTph[t] : coutTu[t]); }); }

    return { schedule, status: 'optimal', message: 'Plan optimise (heuristique)', cost_estimate: Math.round(totalCost * 100) / 100 };
  }

  function optimizeSchedule(systemData) {
    const SD = global.SimData;
    const pompes = Object.assign({}, SD.DEFAULT_POMPES, systemData.pompes || {});
    const vannes = Object.assign({}, SD.DEFAULT_VANNES, systemData.vannes || {});
    const coutTph = SD.computeTariffs(systemData.tarifs || {});
    const tarifs = systemData.tarifs || {};
    let coutTu;
    if (tarifs.TU && Array.isArray(tarifs.TU) && tarifs.TU.length === 24) coutTu = tarifs.TU.map(v => +v);
    else { const pU = +(tarifs.P_UNIFORME || (tarifs.prices && tarifs.prices.P_UNIFORME) || SD.P_UNIFORME); coutTu = new Array(24).fill(pU); }
    const coefs = Object.assign({}, SD.DEFAULT_COEFS, systemData.coefs || {});
    const demandeMoy = Object.assign({}, SD.DEFAULT_DEMANDE, systemData.demande_moyenne || {});
    const demande = {};
    for (let i = 1; i <= 7; i++) demande['E' + i] = SD.HORIZON.map(t => demandeMoy['E' + i] * ((coefs['E' + i] && coefs['E' + i][t]) || 1));
    return greedyOptimize({ pompes, vannes, demande, coutTph, coutTu });
  }

  global.SimOptimizer = { optimizeSchedule, greedyOptimize };
})(window);
