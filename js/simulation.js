/**
 * AquaData Studio - JS Simulation Engine (Part 1: Data + Helpers)
 */
(function (global) {
  'use strict';
  const HORIZON = Array.from({ length: 24 }, (_, i) => i);
  const P_NUIT=0.222,P_JOUR=0.290,P_P_MAT=0.290,P_P_SOIR=0.377,P_UNIFORME=0.291;

  const DEFAULT_POMPES = {"F1_R500":{debit:54,puissance:16.3,tarif:"TPH"},"F2_R500":{debit:39.6,puissance:11.2,tarif:"TPH"},"F3_R500":{debit:28.8,puissance:10,tarif:"TPH"},"F4_R500":{debit:72,puissance:29.4,tarif:"TPH"},"F5_R500":{debit:108,puissance:37.5,tarif:"TPH"},"F6_R500":{debit:36,puissance:13.2,tarif:"TPH"},"F7_R500":{debit:25.2,puissance:14.6,tarif:"TPH"},"F8_R500":{debit:90,puissance:47,tarif:"TPH"},"F9_R500":{debit:126,puissance:61.6,tarif:"TPH"},"F10_R500":{debit:36,puissance:21.9,tarif:"TPH"},"F11_R500":{debit:97.2,puissance:30.8,tarif:"TPH"},"F12_R500":{debit:180,puissance:51.4,tarif:"TPH"},"R500_to_R6_P1":{debit:576,puissance:148.1,tarif:"TPH"},"R500_to_R6_P2":{debit:475.2,puissance:109.9,tarif:"TPH"},"R6_to_R1_P1":{debit:396,puissance:123.9,tarif:"TPH"},"R6_to_R1_P2":{debit:360,puissance:163.5,tarif:"TPH"},"R1_to_R2_P1":{debit:108,puissance:34.1,tarif:"TPH"},"R1_to_R2_P2":{debit:97.2,puissance:31.5,tarif:"TPH"},"R1_to_R3_P1":{debit:90,puissance:36.1,tarif:"TPH"},"R1_to_R3_P2":{debit:144,puissance:61.9,tarif:"TPH"},"Forage_Ain_Bidha_Pmp":{debit:65.8,puissance:7.9,tarif:"TU"},"Source_Ain_Bidha_Pmp":{debit:14.4,puissance:0.8,tarif:"TU"},"Ain_Bidha_to_Zaaf_P1":{debit:28.8,puissance:2.2,tarif:"TU"},"Ain_Bidha_to_Zaaf_P2":{debit:64.8,puissance:12.4,tarif:"TU"},"Zaaf_to_Birchag_P1":{debit:46.8,puissance:20.4,tarif:"TU"},"Birchagroun_to_R6":{debit:132.8,puissance:30,tarif:"TU"},"Forage1_SK10":{debit:43.2,puissance:16.1,tarif:"TU"},"Forage2_SK10":{debit:14.4,puissance:6.2,tarif:"TU"},"Forage3_SK10":{debit:36,puissance:13.6,tarif:"TU"},"SK10_to_R6_P1":{debit:36,puissance:13,tarif:"TU"}};

  const DEFAULT_VANNES = {"R6_vers_R5":{debit_max:200},"R1_vers_R7":{debit_max:120},"R3_vers_R10":{debit_max:60},"Source_Romaine_vers_R1":{debit_max:100}};
  const DEFAULT_CAPAS = {"R500":[100,500,250],"R6":[500,5000,1315],"R5":[150,1500,866],"R1":[100,500,381],"R2":[100,500,323],"R3":[100,500,211],"R7":[150,1500,961],"R10":[200,1000,782],"ST_Ain_Bidha":[10,150,75],"ST_Zaafrane":[10,120,60],"ST_Birchagroun":[10,100,50],"ST_SK10_Relais":[10,100,50]};
  const DEFAULT_COEFS = {"E1":[0.56,0.55,0.5,0.46,0.46,0.49,0.59,1.04,1.29,1.39,1.37,1.34,1.29,1.24,1.11,1.06,1.14,1.24,1.39,1.49,1.36,1.1,0.84,0.67],"E2":[0.9,0.6,0.4,0.35,0.3,0.34,0.33,0.51,1.09,1.53,1.67,1.66,1.61,1.49,1.43,1.11,0.94,1.28,1.32,1.29,1.24,1.25,0.97,0.93],"E3":[0.77,0.68,0.61,0.56,0.51,0.54,0.54,0.58,0.78,1.07,1.4,1.44,1.67,1.36,1.17,1.21,1.07,0.95,1.22,1.32,1.09,1.43,1.59,0.78],"E4":[0.5,0.63,0.44,0.42,0.38,0.44,0.48,0.76,0.97,1.27,1.39,1.39,1.36,1.28,1.01,1.16,1.19,1.39,1.39,1.39,1.34,1.32,0.86,0.88],"E5":[1.03,0.99,0.96,0.88,0.87,0.78,0.36,0.2,0.36,0.74,0.7,1.38,1.36,1.33,1.21,1.17,1.31,1.3,1.38,1.38,1.32,1.36,1.09,1.12],"E6":[0.67,0.34,0.19,0.23,0.14,0.23,0.29,0.82,1.42,1.55,1.65,1.3,1.38,1.2,0.92,0.92,1.09,1.16,1.49,1.59,1.45,1.39,1.23,1.01],"E7":[0.56,0.52,0.5,0.47,0.47,0.52,0.86,1.36,1.27,1.34,1.29,1.34,1.31,1.43,1.37,0.97,0.89,1.11,1.03,1.39,1.14,0.93,0.75,0.63]};
  const DEFAULT_DEMANDE = {E1:355.7,E2:65.8,E3:28.3,E4:116.3,E5:197.7,E6:72.57,E7:21.9};

  function deepCopy(o){return JSON.parse(JSON.stringify(o));}
  function extractSched(sc,item,t){
    if(sc[item]&&Array.isArray(sc[item]))return(t<sc[item].length&&sc[item][t])?1:0;
    if(sc.pumps&&sc.pumps[item])return(t<sc.pumps[item].length&&sc.pumps[item][t])?1:0;
    if(sc.vannes&&sc.vannes[item])return(t<sc.vannes[item].length&&sc.vannes[item][t])?1:0;
    return 0;
  }
  function computeTariffs(t){
    t=t||{};
    if(t.cout_tph&&Array.isArray(t.cout_tph)&&t.cout_tph.length===24)return t.cout_tph.map(v=>+v);
    if(t.TPH&&Array.isArray(t.TPH)&&t.TPH.length===24)return t.TPH.map(v=>+v);
    const pN=+(t.P_NUIT||P_NUIT),pJ=+(t.P_JOUR||P_JOUR),pPm=+(t.P_P_MAT||P_P_MAT),pPs=+(t.P_P_SOIR||P_P_SOIR);
    return HORIZON.map(h=>(h>=23||h<8)?pN:(h<13)?pPm:(h<19)?pJ:pPs);
  }

  global.SimData={HORIZON,deepCopy,extractSched,computeTariffs,DEFAULT_POMPES,DEFAULT_VANNES,DEFAULT_CAPAS,DEFAULT_COEFS,DEFAULT_DEMANDE};
})(window);


(function (global) {
  'use strict';
  const SD = global.SimData;
  const { HORIZON, deepCopy, extractSched, computeTariffs, DEFAULT_POMPES, DEFAULT_VANNES, DEFAULT_CAPAS, DEFAULT_COEFS, DEFAULT_DEMANDE, P_UNIFORME } = SD;

  function runSimulation(schedule, systemData) {
    schedule = schedule || {};
    systemData = systemData || {};
    const pompes = deepCopy(DEFAULT_POMPES);
    Object.entries(systemData.pompes || {}).forEach(([id, v]) => { if (v && typeof v === 'object') pompes[id] = Object.assign({}, pompes[id], v); });
    const capas = deepCopy(DEFAULT_CAPAS);
    Object.entries(systemData.capacites || systemData.capas || {}).forEach(([id, v]) => {
      if (Array.isArray(v) && v.length >= 3) capas[id] = [+v[0], +v[1], +v[2]];
      else if (v && v.v_min !== undefined) capas[id] = [+v.v_min, +v.v_max, +v.v_init];
    });
    const vannes = deepCopy(DEFAULT_VANNES);
    Object.entries(systemData.vannes || {}).forEach(([id, v]) => { if (v && typeof v === 'object') vannes[id] = Object.assign({}, vannes[id], v); });
    const vannesHoraires = systemData.vannes_horaires || {};
    const coefs = Object.assign({}, DEFAULT_COEFS, systemData.coefs || {});
    const demandeMoy = Object.assign({}, DEFAULT_DEMANDE, systemData.demande_moyenne || {});
    const tarifs = systemData.tarifs || {};
    const coutTph = computeTariffs(tarifs);
    let coutTu;
    if (tarifs.TU && Array.isArray(tarifs.TU) && tarifs.TU.length === 24) coutTu = tarifs.TU.map(v => +v);
    else { const pU = +(tarifs.P_UNIFORME || (tarifs.prices && tarifs.prices.P_UNIFORME) || P_UNIFORME); coutTu = new Array(24).fill(pU); }
    const demandeHoraire = {};
    for (let i = 1; i <= 7; i++) { const k = 'E' + i; demandeHoraire[k] = HORIZON.map(t => demandeMoy[k] * ((coefs[k] && coefs[k][t]) || 1)); }
    const reservoirs = Object.keys(capas);
    const volEv = {}; reservoirs.forEach(r => { volEv[r] = new Array(24).fill(0); });
    const hourlyValveFlows = {}; Object.keys(vannes).forEach(vid => { hourlyValveFlows[vid] = new Array(24).fill(0); });
    const errors = [];
    let totalCost = 0, totalKwh = 0, totalVol = 0;
    const hourlyCosts = new Array(24).fill(0), hourlyPowers = new Array(24).fill(0);
    const hourlyFlowProd = new Array(24).fill(0), hourlyFlowDemand = new Array(24).fill(0);
    const TOL = 0.05;
    reservoirs.forEach(r => { const [vmin, vmax, vinit] = capas[r]; volEv[r][0] = vinit; if (vinit < vmin - TOL) errors.push('00h '+r+' init<min'); if (vinit > vmax + TOL) errors.push('00h '+r+' init>max'); });
    const vPrev = {}; reservoirs.forEach(r => { vPrev[r] = capas[r][2]; });

    // Main simulation loop
    for (const t of HORIZON) {
      const qP = (pid) => { const a = extractSched(schedule, pid, t); return (a && pompes[pid]) ? a * pompes[pid].debit : 0; };
      const qG = (vid) => {
        const a = extractSched(schedule, vid, t);
        if (!a) return 0;
        if (vannesHoraires[vid] && vannesHoraires[vid].length > t) return a * +(vannesHoraires[vid][t] || 0);
        if (vannes[vid] && vannes[vid].debits_horaires && vannes[vid].debits_horaires.length > t) return a * +(vannes[vid].debits_horaires[t] || 0);
        return a * (vannes[vid] ? (vannes[vid].debit_max || 0) : 0);
      };
      let hProd = 0, hDemand = 0, hCost = 0, hPower = 0;
      Object.entries(pompes).forEach(([pid, c]) => { const fl = qP(pid); if (fl > 0) { hProd += fl; hCost += c.puissance * ((c.tarif === 'TPH') ? coutTph[t] : coutTu[t]); hPower += c.puissance; } });
      for (let i = 1; i <= 7; i++) hDemand += demandeHoraire['E' + i][t];
      totalCost += hCost; totalKwh += hPower; totalVol += hProd;
      hourlyCosts[t] = hCost; hourlyPowers[t] = hPower; hourlyFlowProd[t] = hProd; hourlyFlowDemand[t] = hDemand;
      let sumF = 0; for (let i = 1; i <= 12; i++) sumF += qP('F' + i + '_R500');
      const vCur = {};
      vCur.R500 = vPrev.R500 + sumF - qP('R500_to_R6_P1') - qP('R500_to_R6_P2');
      vCur.ST_Ain_Bidha = vPrev.ST_Ain_Bidha + qP('Forage_Ain_Bidha_Pmp') + qP('Source_Ain_Bidha_Pmp') - qP('Ain_Bidha_to_Zaaf_P1') - qP('Ain_Bidha_to_Zaaf_P2');
      vCur.ST_Zaafrane = vPrev.ST_Zaafrane + qP('Ain_Bidha_to_Zaaf_P1') + qP('Ain_Bidha_to_Zaaf_P2') - qP('Zaaf_to_Birchag_P1');
      vCur.ST_Birchagroun = vPrev.ST_Birchagroun + qP('Zaaf_to_Birchag_P1') - qP('Birchagroun_to_R6');
      vCur.ST_SK10_Relais = vPrev.ST_SK10_Relais + qP('Forage1_SK10') + qP('Forage2_SK10') + qP('Forage3_SK10') - qP('SK10_to_R6_P1');
      vCur.R6 = vPrev.R6 + qP('R500_to_R6_P1') + qP('R500_to_R6_P2') + qP('Birchagroun_to_R6') + qP('SK10_to_R6_P1') - qG('R6_vers_R5') - qP('R6_to_R1_P1') - qP('R6_to_R1_P2') - demandeHoraire.E5[t];
      vCur.R5 = vPrev.R5 + qG('R6_vers_R5') - demandeHoraire.E4[t];
      vCur.R1 = vPrev.R1 + qP('R6_to_R1_P1') + qP('R6_to_R1_P2') + qG('Source_Romaine_vers_R1') - qP('R1_to_R2_P1') - qP('R1_to_R2_P2') - qP('R1_to_R3_P1') - qP('R1_to_R3_P2') - qG('R1_vers_R7') - demandeHoraire.E1[t];
      vCur.R2 = vPrev.R2 + qP('R1_to_R2_P1') + qP('R1_to_R2_P2') - demandeHoraire.E2[t];
      vCur.R3 = vPrev.R3 + qP('R1_to_R3_P1') + qP('R1_to_R3_P2') - qG('R3_vers_R10') - demandeHoraire.E3[t];
      vCur.R7 = vPrev.R7 + qG('R1_vers_R7') - demandeHoraire.E6[t];
      vCur.R10 = vPrev.R10 + qG('R3_vers_R10') - demandeHoraire.E7[t];
      const hNext = t < 23 ? t + 1 : -1;
      reservoirs.forEach(r => {
        const [vmin, vmax] = capas[r]; const val = vCur[r];
        if (hNext >= 0) {
          if (val < vmin - TOL) errors.push(hNext+'h '+r+' <min');
          if (val > vmax + TOL) errors.push(hNext+'h '+r+' overflow');
          volEv[r][hNext] = Math.round(val * 100) / 100; vPrev[r] = val;
        } else {
          if (val < vmin - TOL) errors.push('24h '+r+' <min');
          if (val > vmax + TOL) errors.push('24h '+r+' overflow');
        }
      });
    }


    // Compute KPIs
    let pumpOnH = 0, nightH = 0, peakH = 0, switching = 0;
    const nightSet = new Set([23,0,1,2,3,4,5,6,7]);
    const peakSet = new Set([19,20,21,22]);
    Object.keys(pompes).forEach(pid => { let prev = 0; HORIZON.forEach(t => { const st = extractSched(schedule, pid, t); if (st) { pumpOnH++; if (nightSet.has(t)) nightH++; if (peakSet.has(t)) peakH++; } if (t > 0 && st !== prev) switching++; prev = st; }); });
    const compliant = [], nonCompliant = [];
    reservoirs.forEach(r => { const [vmin, vmax] = capas[r]; const ok = volEv[r].every(v => v >= vmin - TOL && v <= vmax + TOL); (ok ? compliant : nonCompliant).push(r); });
    let totalDemVol = 0; for (let i = 1; i <= 7; i++) totalDemVol += demandeHoraire['E'+i].reduce((a,b)=>a+b,0);
    const specEnergy = totalVol > 0 ? totalKwh / totalVol : 0;
    const avgCost = totalVol > 0 ? totalCost / totalVol : 0;
    const baselineRef = 5240.0;
    const savingsDt = Math.max(0, baselineRef - totalCost);
    const savingsPct = Math.round((savingsDt / baselineRef) * 1000) / 10;
    const demandSat = nonCompliant.length === 0 ? 100 : Math.max(85, Math.round((100 - nonCompliant.length * 2.5) * 10) / 10);
    let hydraulicStatus, statusLabel;
    if (errors.length === 0) { hydraulicStatus = 'VALIDE'; statusLabel = 'Nominal - Toutes contraintes respectees'; }
    else if (errors.length <= 3) { hydraulicStatus = 'ATTENTION'; statusLabel = 'Attention: '+errors.length+' ecart(s)'; }
    else { hydraulicStatus = 'INVALIDE'; statusLabel = 'Critique: '+errors.length+' violations'; }

    // Telemetry
    const telemetryByHour = [];
    for (const t of HORIZON) {
      const tel = { hour: t, cost_tnd: Math.round(hourlyCosts[t]*100)/100, power_kw: Math.round(hourlyPowers[t]*100)/100, flow_prod_m3h: Math.round(hourlyFlowProd[t]*100)/100, flow_demand_m3h: Math.round(hourlyFlowDemand[t]*100)/100, reservoirs: {}, pumps: {}, valves: {}, demands: {} };
      for (let i = 1; i <= 7; i++) tel.demands['E'+i] = Math.round(demandeHoraire['E'+i][t]*10)/10;
      reservoirs.forEach(r => { const [vmin, vmax] = capas[r]; const cv = volEv[r][t]; tel.reservoirs[r] = { volume: cv, v_min: vmin, v_max: vmax, fill_pct: Math.max(0,Math.min(100,Math.round((cv/vmax)*1000)/10)), status: (vmin-TOL<=cv&&cv<=vmax+TOL)?'normal':(cv<vmin-TOL?'low':'overflow') }; });
      Object.entries(pompes).forEach(([pid, c]) => { const act = extractSched(schedule, pid, t); tel.pumps[pid] = { active: act, flow: Math.round(c.debit*act*10)/10, power: Math.round(c.puissance*act*10)/10, tarif: c.tarif }; });
      Object.keys(vannes).forEach(vid => { const act = extractSched(schedule, vid, t); tel.valves[vid] = { active: act, flow: Math.round((hourlyValveFlows[vid][t]||0)*10)/10 }; });
      telemetryByHour.push(tel);
    }

    return { total_cost: Math.round(totalCost*100)/100, cost_before_baseline: baselineRef, savings_dt: Math.round(savingsDt*100)/100, savings_pct: savingsPct, total_energy_kwh: Math.round(totalKwh*100)/100, total_volume_pumped: Math.round(totalVol*100)/100, total_volume_distributed: Math.round(totalDemVol*100)/100, spec_energy_kwh_m3: Math.round(specEnergy*10000)/10000, avg_cost_m3: Math.round(avgCost*10000)/10000, pump_on_hours: pumpOnH, night_pumping_hours: nightH, peak_pumping_hours: peakH, switching_count: switching, compliant_reservoirs_count: compliant.length, total_reservoirs_count: reservoirs.length, compliant_reservoirs: compliant, non_compliant_reservoirs: nonCompliant, demand_satisfaction_pct: demandSat, hydraulic_status: hydraulicStatus, status_label: statusLabel, volume_evolution: volEv, hourly_costs: hourlyCosts.map(c=>Math.round(c*100)/100), hourly_powers: hourlyPowers.map(p=>Math.round(p*100)/100), hourly_flows_prod: hourlyFlowProd.map(f=>Math.round(f*100)/100), hourly_flows_demand: hourlyFlowDemand.map(f=>Math.round(f*100)/100), hourly_valve_flows: hourlyValveFlows, telemetry_by_hour: telemetryByHour, errors: errors, is_valid: errors.length === 0 };
  }

  global.SimEngine = { runSimulation };

  // Global compatibility function for app.js
  global.runSimulation = function(systemData, schedule) {
    return runSimulation(schedule, systemData);
  };
})(window);

})(window);

