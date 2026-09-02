/**
 * AquaData Studio v5.0 - Industrial SCADA & Data Science Charts Module
 * Modern, high-performance visualization suite powered by Chart.js.
 * Ultra-robust error-resilient chart engine with auto-resizing & glowing dark theme.
 */

import { POMPES, CAPACITES, DEMANDE_HORAIRE, DEMANDE_MOYENNE, ETAGE_FEEDERS, TARIFS } from './schema.js';
import { equipLabel, reservoirLabel } from './labels.js';

// Store Chart instances for clean destruction, updates & resizing
const activeChartInstances = {};

export function destroyChart(id) {
    if (activeChartInstances[id]) {
        try { activeChartInstances[id].destroy(); } catch(e) {}
        delete activeChartInstances[id];
    }
}

export function getActiveChart(id) {
    return activeChartInstances[id] || null;
}

export function resizeAllActiveCharts() {
    if (typeof Chart === 'undefined') return;
    Object.keys(activeChartInstances).forEach(key => {
        try {
            const chart = activeChartInstances[key];
            // Ignorer les charts dont le canvas est masqué (onglet inactif) :
            // ils seront redimensionnés au moment où leur onglet devient actif.
            if (chart?.canvas && chart.canvas.offsetParent === null) return;
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
                // Repaint après resize : indispensable pour les charts créés
                // alors que leur onglet était masqué (canvas de taille nulle).
                if (typeof chart.render === 'function') {
                    requestAnimationFrame(() => {
                        try { chart.render(); } catch (e) {}
                    });
                }
            }
        } catch (e) {
            console.warn('Error resizing chart:', key, e);
        }
    });
}

// Global chart styling defaults
function ensureChartDefaults() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.94)';
    Chart.defaults.plugins.tooltip.titleColor = '#f8fafc';
    Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(124, 58, 237, 0.4)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
}

/**
 * Renders Volume Evolution Charts for all reservoirs with Min/Max thresholds.
 */
export function renderReservoirVolumeCharts(containerId, results, capacites) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    const container = document.getElementById(containerId);
    if (!container) return;

    // Destroy existing reservoir charts for this specific container
    const prefix = `${containerId}-res-`;
    Object.keys(activeChartInstances).forEach(key => {
        if (key.startsWith(prefix) || key.startsWith('chart-res-')) destroyChart(key);
    });

    container.innerHTML = '';
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

    const colorPalette = {
        "R500": "#06b6d4",
        "R6": "#3b82f6",
        "R5": "#6366f1",
        "R1": "#8b5cf6",
        "R2": "#ec4899",
        "R3": "#10b981",
        "R7": "#f59e0b",
        "R10": "#14b8a6",
        "ST_Ain_Bidha": "#0284c7",
        "ST_Zaafrane": "#0d9488",
        "ST_Birchagroun": "#059669",
        "ST_SK10_Relais": "#7c3aed"
    };

    const volEvol = (results && results.volume_evolution && Object.keys(results.volume_evolution).length > 0)
        ? results.volume_evolution
        : null;

    const caps = (capacites && Object.keys(capacites).length > 0) ? capacites : CAPACITES;
    const resKeys = volEvol ? Object.keys(volEvol) : Object.keys(caps);

    for (const resKey of resKeys) {
        const minVol = caps[resKey] ? caps[resKey][0] : 0;
        const maxVol = caps[resKey] ? caps[resKey][1] : 1000;
        const initVol = caps[resKey] ? caps[resKey][2] : 500;
        const volumes = (volEvol && volEvol[resKey]) ? volEvol[resKey] : Array(24).fill(initVol);
        const mainColor = colorPalette[resKey] || '#06b6d4';
        const canvasId = `${containerId}-res-${resKey}`;

        const isNominal = Math.min(...volumes) >= minVol && Math.max(...volumes) <= maxVol;

        const card = document.createElement('div');
        card.className = 'scada-card chart-card';
        card.style.background = 'rgba(28, 29, 59, 0.7)';
        card.style.border = '1px solid rgba(124, 58, 237, 0.18)';
        card.style.borderRadius = '14px';
        card.style.padding = '1rem';
        card.style.backdropFilter = 'blur(10px)';

        card.innerHTML = `
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
                <div class="card-title" style="font-size:0.88rem; font-weight:700; color:#fff; display:flex; align-items:center; gap:6px;">
                    <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${isNominal ? '#10b981' : '#f43f5e'}; box-shadow:0 0 8px ${isNominal ? '#10b981' : '#f43f5e'};"></span>
                    Réservoir: <strong>${resKey}</strong>
                </div>
                <div class="card-badge" style="font-size:0.72rem; font-family:var(--font-mono); background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:6px; color:#cbd5e1;">
                    V0: ${volumes[0] !== undefined ? volumes[0].toFixed(0) : initVol} m³ · Max: ${maxVol} m³
                </div>
            </div>
            <div class="chart-wrapper" style="height:210px; position:relative; width:100%;">
                <canvas id="${canvasId}"></canvas>
            </div>
        `;
        container.appendChild(card);

        const canvasEl = document.getElementById(canvasId);
        if (!canvasEl) continue;
        const ctx = canvasEl.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, mainColor + '55');
        gradient.addColorStop(1, mainColor + '02');

        activeChartInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [
                    {
                        label: `Volume ${resKey} (m³)`,
                        data: volumes,
                        borderColor: mainColor,
                        backgroundColor: gradient,
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.28,
                        pointBackgroundColor: mainColor,
                        pointRadius: 2.5,
                        pointHoverRadius: 6
                    },
                    {
                        label: `Seuil Max (${maxVol} m³)`,
                        data: Array(24).fill(maxVol),
                        borderColor: '#f43f5e',
                        borderWidth: 1.5,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: `Seuil Min (${minVol} m³)`,
                        data: Array(24).fill(minVol),
                        borderColor: '#f59e0b',
                        borderWidth: 1.5,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: '#94a3b8', font: { family: 'Inter', size: 10 }, boxWidth: 12 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label}: ${Number(context.raw).toFixed(1)} m³`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 }, maxRotation: 0 }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } },
                        suggestedMin: Math.max(0, minVol * 0.8),
                        suggestedMax: maxVol * 1.12
                    }
                }
            }
        });
    }
}

/**
 * Renders Hydraulic Production vs Demand Flow Chart.
 */
export function renderHydraulicFlowChart(canvasId, systemData, schedule) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const pompes = (systemData && systemData.pompes) ? systemData.pompes : POMPES;
    const demande = (systemData && systemData.demande) ? systemData.demande : DEMANDE_HORAIRE;
    const sched = schedule || {};

    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const prodHourly = Array(24).fill(0);
    const demandHourly = Array(24).fill(0);

    for (let t = 0; t < 24; t++) {
        for (const [pmpKey, pmpVal] of Object.entries(pompes)) {
            if (sched[pmpKey]?.[t]) prodHourly[t] += (pmpVal.debit || 0);
        }
        for (const [etage, demands] of Object.entries(demande)) {
            demandHourly[t] += (demands[t] || 0);
        }
    }

    const ctx = canvas.getContext('2d');
    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [
                {
                    type: 'bar',
                    label: 'Production Pompage (m³/h)',
                    data: prodHourly,
                    backgroundColor: 'rgba(6, 182, 212, 0.72)',
                    borderColor: '#06b6d4',
                    borderWidth: 1.5,
                    borderRadius: 4,
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Demande Totale des 7 Étages (m³/h)',
                    data: demandHourly,
                    borderColor: '#f43f5e',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#f43f5e',
                    pointRadius: 3,
                    fill: false,
                    tension: 0.3,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#cbd5e1', font: { family: 'Inter', size: 11 }, usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${Number(ctx.raw).toFixed(1)} m³/h`
                    }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 }, maxRotation: 0 } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } }
            }
        }
    });
}

/**
 * Renders Hourly Energy Power & Cost Chart.
 */
export function renderEnergyPowerChart(canvasId, systemData, schedule) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const pompes = (systemData && systemData.pompes) ? systemData.pompes : POMPES;
    const tarifs = (systemData && systemData.tarifs) ? systemData.tarifs : TARIFS;
    const sched = schedule || {};

    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const powerHourly = Array(24).fill(0);
    const costHourly = Array(24).fill(0);

    for (let t = 0; t < 24; t++) {
        for (const [pmpKey, pmpVal] of Object.entries(pompes)) {
            if (sched[pmpKey]?.[t]) {
                const pwr = pmpVal.puissance || 0;
                powerHourly[t] += pwr;
                const tarifGrille = tarifs[pmpVal.tarif] || Array(24).fill(0.29);
                const rate = Array.isArray(tarifGrille) ? (tarifGrille[t] || 0.29) : (Number(tarifGrille) || 0.29);
                costHourly[t] += pwr * rate;
            }
        }
    }

    const ctx = canvas.getContext('2d');
    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [
                {
                    label: 'Puissance Appelée (kW)',
                    data: powerHourly,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    borderWidth: 2.2,
                    fill: true,
                    tension: 0.25,
                    pointRadius: 2.5,
                    yAxisID: 'yPower'
                },
                {
                    label: 'Coût Énergie (TND/h)',
                    data: costHourly,
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251, 191, 36, 0.08)',
                    borderWidth: 2.2,
                    borderDash: [4, 3],
                    pointRadius: 2.5,
                    fill: false,
                    tension: 0.25,
                    yAxisID: 'yCost'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#cbd5e1', font: { size: 10 }, usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.yAxisID === 'yPower'
                            ? ` ${ctx.dataset.label}: ${Number(ctx.raw).toFixed(1)} kW`
                            : ` ${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)} TND/h`
                    }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 }, maxRotation: 0 } },
                yPower: {
                    type: 'linear',
                    position: 'left',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#10b981', font: { family: 'JetBrains Mono', size: 9 } },
                    title: { display: true, text: 'kW', color: '#10b981', font: { size: 10 } }
                },
                yCost: {
                    type: 'linear',
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#fbbf24', font: { family: 'JetBrains Mono', size: 9 } },
                    title: { display: true, text: 'TND/h', color: '#fbbf24', font: { size: 10 } }
                }
            }
        }
    });
}

/**
 * Renders Financial Cost Breakdown Doughnut Chart.
 */
export function renderCostBreakdownChart(canvasId, systemData, schedule) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

        const pompes = (systemData && systemData.pompes) ? systemData.pompes : POMPES;
    const tarifs = (systemData && systemData.tarifs) ? systemData.tarifs : TARIFS;
    const sched = schedule || {};

    // --- Reactive tariff band classification ---
    const hourlyBands = (tarifs && Array.isArray(tarifs.hourlyBands) && tarifs.hourlyBands.length === 24)
        ? tarifs.hourlyBands
        : null;
    const defaultBand = t => {
        if (t >= 23 || t < 8)  return 'hc';
        if (t >= 8 && t < 13)  return 'matin';
        if (t >= 13 && t < 19) return 'jour';
        return 'soir';
    };

    let costNight = 0, costDay = 0, costPeakMat = 0, costPeakEve = 0, costUniform = 0;

    for (let t = 0; t < 24; t++) {
        for (const [pmpKey, pmpVal] of Object.entries(pompes)) {
            if (sched[pmpKey]?.[t]) {
                const pwr = pmpVal.puissance || 0;
                if (pmpVal.tarif === 'TU') {
                    const price = Array.isArray(tarifs.TU) ? (tarifs.TU[t] || 0.291) : 0.291;
                    costUniform += pwr * price;
                } else {
                    const price = Array.isArray(tarifs.TPH) ? (tarifs.TPH[t] || 0.29) : 0.29;
                    const band = hourlyBands ? hourlyBands[t] : defaultBand(t);
                    if (band === 'hc')      costNight += pwr * price;
                    else if (band === 'matin') costPeakMat += pwr * price;
                    else if (band === 'jour' || band === 'hp') costDay += pwr * price;
                    else if (band === 'soir' || band === 'hph') costPeakEve += pwr * price;
                    else                    costDay += pwr * price;
                }
            }
        }
    }

    const ctx = canvas.getContext('2d');
    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Nuit (HC)', 'Jour (HP)', 'Pointe Matin (HPM)', 'Pointe Soir (HPS)', 'Tarif Uniforme (TU)'],
            datasets: [{
                data: [costNight, costDay, costPeakMat, costPeakEve, costUniform],
                backgroundColor: ['#38bdf8', '#fbbf24', '#c084fc', '#f43f5e', '#10b981'],
                borderWidth: 2,
                borderColor: '#13142e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 10 }, usePointStyle: true, padding: 12 } },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return ` ${ctx.label}: ${Number(ctx.raw).toFixed(2)} TND`;
                        }
                    }
                }
            },
            cutout: '62%'
        }
    });
}

/**
 * Renders Specific Energy Consumption (kWh / m³) per pump for ALL pumps in the system.
 */
export function renderSpecificEnergyChart(canvasId, systemData, schedule) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const pompes = (systemData && systemData.pompes) ? systemData.pompes : POMPES;
    const sched = schedule || {};

    const pumpLabels = [];
    const specificEnergy = [];
    const barColors = [];
    const borderColors = [];

    for (const [pmpKey, pmpVal] of Object.entries(pompes)) {
        let totalHoursRun = 0;
        for (let t = 0; t < 24; t++) {
            if (sched[pmpKey]?.[t]) totalHoursRun++;
        }

        pumpLabels.push(equipLabel(pmpKey));
        const debit = pmpVal.debit || 1;
        const spec = debit > 0 ? ((pmpVal.puissance || 0) / debit) : 0;
        specificEnergy.push(parseFloat(spec.toFixed(3)));

        if (totalHoursRun > 0) {
            barColors.push('rgba(6, 182, 212, 0.8)');
            borderColors.push('#06b6d4');
        } else {
            barColors.push('rgba(148, 163, 184, 0.25)');
            borderColors.push('rgba(148, 163, 184, 0.4)');
        }
    }

    const ctx = canvas.getContext('2d');
    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: pumpLabels,
            datasets: [{
                label: 'Consommation Spécifique (kWh / m³)',
                data: specificEnergy,
                backgroundColor: barColors,
                borderColor: borderColors,
                borderWidth: 1.2,
                borderRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { size: 10 } } },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.raw} kWh/m³`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } },
                    title: { display: true, text: 'kWh / m³', color: '#06b6d4', font: { size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#cbd5e1', font: { family: 'JetBrains Mono', size: 8 } }
                }
            }
        }
    });
}

/**
 * Radar Chart — Performance Globale Système par Dimension (Donut Expense / Radar)
 */
export function renderRadarPerformanceChart(canvasId, systemData, schedule, results) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const pompes = (systemData && systemData.pompes) ? systemData.pompes : POMPES;
    const sched = schedule || {};

    let totalEnergy = 0, nightKwh = 0, dayKwh = 0, peakKwh = 0;

    for (let t = 0; t < 24; t++) {
        for (const [pmpKey, pmpVal] of Object.entries(pompes)) {
            if (sched[pmpKey]?.[t]) {
                const pwr = pmpVal.puissance || 0;
                totalEnergy += pwr;
                if (t >= 23 || t < 8) nightKwh += pwr;
                else if (t >= 13 && t < 19) dayKwh += pwr;
                else peakKwh += pwr;
            }
        }
    }

    const nightPct = totalEnergy > 0 ? (nightKwh / totalEnergy) * 100 : 33.3;
    const dayPct = totalEnergy > 0 ? (dayKwh / totalEnergy) * 100 : 33.3;
    const peakPct = totalEnergy > 0 ? (peakKwh / totalEnergy) * 100 : 33.4;

    const ctx = canvas.getContext('2d');
    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Nuit (HC)', 'Pleine (HP)', 'Pointe (HPS)'],
            datasets: [{
                data: [nightPct, dayPct, peakPct],
                backgroundColor: ['#7c3aed', '#ec4899', '#f43f5e'],
                borderColor: '#13142e',
                borderWidth: 3,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${Number(ctx.raw).toFixed(1)}%`
                    }
                }
            },
            cutout: '70%'
        }
    });
}

/**
 * Bar Chart Empilé — Répartition Pompage Horaire par Tranche Tarifaire
 */
export function renderTarifRepartitionChart(canvasId, systemData, schedule) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const pompes = (systemData && systemData.pompes) ? systemData.pompes : POMPES;
    const tarifs = (systemData && systemData.tarifs) ? systemData.tarifs : TARIFS;
    const sched = schedule || {};

    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`);

    // --- Reactive tariff band classification ---
    // Use the hourlyBands array computed by computeDynamicTariffs so that
    // user-modified time windows are respected instead of hardcoded ranges.
    const hourlyBands = (tarifs && Array.isArray(tarifs.hourlyBands) && tarifs.hourlyBands.length === 24)
        ? tarifs.hourlyBands
        : null;
    // Fallback: hardcoded STEG grid (Nuit 23h-08h, HPM 08h-13h, HP 13h-19h, HPS 19h-23h)
    const defaultBand = t => {
        if (t >= 23 || t < 8)  return 'hc';
        if (t >= 8 && t < 13)  return 'hph';
        if (t >= 13 && t < 19) return 'hp';
        return 'hph';
    };

    // Resolve a displayable price per band for the legend labels.
    const prices = (tarifs && tarifs.prices) ? tarifs.prices : { P_NUIT: 0.222, P_JOUR: 0.290, P_P_MAT: 0.290, P_P_SOIR: 0.377 };
    const bandPrice = band => {
        switch (band) {
            case 'hc':    return prices.P_NUIT;
            case 'matin': return prices.P_P_MAT;
            case 'hph':   return prices.P_P_SOIR;
            case 'soir':  return prices.P_P_SOIR;
            case 'jour':  return prices.P_JOUR;
            case 'hp':    return prices.P_JOUR;
            default:      return prices.P_JOUR;
        }
    };

    // Group pumped power by dynamic band label
    const bandData = {}; // { band: [24 values] }
    for (let t = 0; t < 24; t++) {
        let pwr = 0;
        for (const [pmpKey, pmpVal] of Object.entries(pompes)) {
            if (sched[pmpKey]?.[t]) pwr += (pmpVal.puissance || 0);
        }
        const band = hourlyBands ? hourlyBands[t] : defaultBand(t);
        if (!bandData[band]) bandData[band] = new Array(24).fill(0);
        bandData[band][t] = pwr;
    }

    // Map each band to a visual style and label
    const bandMeta = {
        hc:     { icon: '🌙',  name: 'Heures Creuses',   color: 'rgba(124, 58, 237, 0.85)', border: '#7c3aed' },
        jour:   { icon: '☀️',  name: 'Heures Pleines',   color: 'rgba(6, 182, 212, 0.85)', border: '#06b6d4' },
        hp:     { icon: '☀️',  name: 'Heures Pleines',   color: 'rgba(6, 182, 212, 0.85)', border: '#06b6d4' },
        hph:    { icon: '🔴',  name: 'Pointe',           color: 'rgba(244, 63, 94, 0.85)', border: '#f43f5e' },
        soir:   { icon: '🔴',  name: 'Pointe Soir',      color: 'rgba(244, 63, 94, 0.85)', border: '#f43f5e' },
        matin:  { icon: '🟣',  name: 'Pointe Matin',     color: 'rgba(168, 85, 247, 0.85)', border: '#a855f7' }
    };

    // Preserve a stable ordering: HC, HP, HPM, HPS
    const bandOrder = ['hc', 'jour', 'hp', 'matin', 'hph', 'soir'];
    const presentBands = bandOrder.filter(b => bandData[b] !== undefined);
    // Append any remaining bands not in the standard order
    Object.keys(bandData).forEach(b => { if (!presentBands.includes(b)) presentBands.push(b); });

    const datasets = presentBands.map(b => {
        const meta = bandMeta[b] || { icon: '🔵', name: b, color: 'rgba(6, 182, 212, 0.85)', border: '#06b6d4' };
        const price = bandPrice(b);
        return {
            label: `${meta.icon} ${meta.name} (${price !== undefined ? price.toFixed(3) : '?'} DT)`,
            data: bandData[b],
            backgroundColor: meta.color,
            borderColor: meta.border,
            borderWidth: 1,
            borderRadius: 3
        };
    });

    const ctx = canvas.getContext('2d');
    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#cbd5e1', font: { size: 10 }, usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${Number(ctx.raw).toFixed(0)} kW`
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 }, maxRotation: 0 }
                },
                y: {
                    stacked: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } },
                    title: { display: true, text: 'Puissance (kW)', color: '#8e95b2', font: { size: 10 } }
                }
            }
        }
    });
}

/**
 * Line Chart — Coût Cumulé (TND) vs Volume Cumulé (m³) au fil des 24h
 */
export function renderCumulativeCostVolumeChart(canvasId, systemData, schedule) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const pompes = (systemData && systemData.pompes) ? systemData.pompes : POMPES;
    const tarifs = (systemData && systemData.tarifs) ? systemData.tarifs : TARIFS;
    const sched = schedule || {};

    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const cumCost   = [];
    const cumVolume = [];
    let cCost = 0, cVol = 0;

    for (let t = 0; t < 24; t++) {
        for (const [pmpKey, pmpVal] of Object.entries(pompes)) {
            if (sched[pmpKey]?.[t]) {
                const tarif = tarifs?.[pmpVal.tarif] || [];
                const rate = Array.isArray(tarif) ? (tarif[t] || 0.29) : (Number(tarif) || 0.29);
                cCost += (pmpVal.puissance || 0) * rate;
                cVol  += (pmpVal.debit || 0);
            }
        }
        cumCost.push(parseFloat(cCost.toFixed(2)));
        cumVolume.push(parseFloat(cVol.toFixed(0)));
    }

    const ctx = canvas.getContext('2d');
    const g1 = ctx.createLinearGradient(0, 0, 0, 250);
    g1.addColorStop(0, 'rgba(244, 63, 94, 0.3)');
    g1.addColorStop(1, 'rgba(244, 63, 94, 0.01)');
    const g2 = ctx.createLinearGradient(0, 0, 0, 250);
    g2.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
    g2.addColorStop(1, 'rgba(6, 182, 212, 0.01)');

    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [
                {
                    label: '💰 Coût Cumulé (TND)',
                    data: cumCost,
                    borderColor: '#f43f5e', backgroundColor: g1,
                    borderWidth: 2.5, fill: true, tension: 0.3,
                    pointRadius: 2.5, pointHoverRadius: 6,
                    yAxisID: 'yCost'
                },
                {
                    label: '💧 Volume Cumulé (m³)',
                    data: cumVolume,
                    borderColor: '#06b6d4', backgroundColor: g2,
                    borderWidth: 2.5, fill: true, tension: 0.3,
                    pointRadius: 2.5, pointHoverRadius: 6,
                    yAxisID: 'yVol'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#cbd5e1', font: { size: 10 }, usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.yAxisID === 'yCost'
                            ? ` Coût : ${ctx.raw} TND`
                            : ` Volume : ${ctx.raw} m³`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 }, maxRotation: 0 }
                },
                yCost: {
                    type: 'linear', position: 'left',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#fca5a5', font: { family: 'JetBrains Mono', size: 9 } },
                    title: { display: true, text: 'Coût Cumulé (TND)', color: '#fca5a5', font: { size: 9 } }
                },
                yVol: {
                    type: 'linear', position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#7dd3fc', font: { family: 'JetBrains Mono', size: 9 } },
                    title: { display: true, text: 'Volume Cumulé (m³)', color: '#7dd3fc', font: { size: 9 } }
                }
            }
        }
    });
}

/**
 * Pareto Diagram (80/20 Energy Ranking)
 */
export function renderParetoChart(canvasId, systemData, schedule) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const pompes = (systemData && systemData.pompes) ? systemData.pompes : POMPES;
    const sched = schedule || {};

    const pumpEnergyList = [];
    let grandTotalEnergy = 0;

    for (const [pmpKey, pmpVal] of Object.entries(pompes)) {
        let hrs = 0;
        for (let t = 0; t < 24; t++) {
            if (sched[pmpKey]?.[t]) hrs++;
        }
        const kwh = hrs * (pmpVal.puissance || 0);
        grandTotalEnergy += kwh;
        pumpEnergyList.push({ name: pmpKey, kwh });
    }

    pumpEnergyList.sort((a, b) => b.kwh - a.kwh);

    const labels = [];
    const energyData = [];
    const cumPctData = [];
    let runningSum = 0;

    pumpEnergyList.forEach(item => {
        labels.push(equipLabel(item.name));
        energyData.push(parseFloat(item.kwh.toFixed(1)));
        runningSum += item.kwh;
        const pct = grandTotalEnergy > 0 ? (runningSum / grandTotalEnergy) * 100 : 0;
        cumPctData.push(parseFloat(pct.toFixed(1)));
    });

    const ctx = canvas.getContext('2d');
    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    type: 'line',
                    label: '% Cumulé (Pareto 80%)',
                    data: cumPctData,
                    borderColor: '#fbbf24',
                    borderWidth: 2.5,
                    pointRadius: 3,
                    yAxisID: 'yPct',
                    tension: 0.3
                },
                {
                    type: 'bar',
                    label: 'Consommation (kWh / 24h)',
                    data: energyData,
                    backgroundColor: 'rgba(6, 182, 212, 0.75)',
                    borderColor: '#06b6d4',
                    borderWidth: 1,
                    borderRadius: 3,
                    yAxisID: 'yEnergy'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#cbd5e1', font: { size: 10 }, usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.type === 'line'
                            ? ` % Cumulé : ${ctx.raw}%`
                            : ` Énergie : ${ctx.raw} kWh`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#cbd5e1', font: { family: 'JetBrains Mono', size: 8 }, maxRotation: 90, minRotation: 60, autoSkip: false }
                },
                yEnergy: {
                    type: 'linear', position: 'left',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#38bdf8', font: { family: 'JetBrains Mono', size: 8 } },
                    title: { display: true, text: 'Énergie (kWh)', color: '#38bdf8', font: { size: 9 } }
                },
                yPct: {
                    type: 'linear', position: 'right', min: 0, max: 100,
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#fbbf24', font: { family: 'JetBrains Mono', size: 8 }, callback: v => `${v}%` },
                    title: { display: true, text: '% Cumulé', color: '#fbbf24', font: { size: 9 } }
                }
            }
        }
    });
}

/**
 * [PRO ANALYSER] Boxplot / Descriptive Stats per Reservoir
 */
export function renderProBoxStatsChart(canvasId, results, capacities) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const volEvol = (results && results.volume_evolution) ? results.volume_evolution : {};
    const resKeys = Object.keys(volEvol);
    const minVals = [];
    const avgVals = [];
    const maxVals = [];

    resKeys.forEach(k => {
        const vols = volEvol[k] || [];
        const minV = vols.length > 0 ? Math.min(...vols) : 0;
        const maxV = vols.length > 0 ? Math.max(...vols) : 0;
        const avgV = vols.length > 0 ? (vols.reduce((a, b) => a + b, 0) / vols.length) : 0;

        minVals.push(parseFloat(minV.toFixed(1)));
        avgVals.push(parseFloat(avgV.toFixed(1)));
        maxVals.push(parseFloat(maxV.toFixed(1)));
    });

    const ctx = canvas.getContext('2d');
    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: resKeys.map(reservoirLabel),
            datasets: [
                {
                    label: 'Volume Min (m³)',
                    data: minVals,
                    backgroundColor: 'rgba(244, 63, 94, 0.75)',
                    borderColor: '#f43f5e',
                    borderWidth: 1,
                    borderRadius: 3
                },
                {
                    label: 'Volume Moyen (m³)',
                    data: avgVals,
                    backgroundColor: 'rgba(6, 182, 212, 0.75)',
                    borderColor: '#06b6d4',
                    borderWidth: 1,
                    borderRadius: 3
                },
                {
                    label: 'Volume Max (m³)',
                    data: maxVals,
                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#cbd5e1', font: { size: 10 }, usePointStyle: true } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} m³` } }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#cbd5e1', font: { family: 'JetBrains Mono', size: 8 }, autoSkip: false, maxRotation: 60, minRotation: 45 } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 8 } }, title: { display: true, text: 'Volume (m³)', color: '#06b6d4', font: { size: 9 } } }
            }
        }
    });
}

/**
 * [PRO ANALYSER] Cost Gradient (TND/h) vs Pumping Flow (m³/h) across 24h
 */
export function renderProCostGradientChart(canvasId, systemData, schedule) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const pompes = (systemData && systemData.pompes) ? systemData.pompes : POMPES;
    const tarifs = (systemData && systemData.tarifs) ? systemData.tarifs : TARIFS;
    const sched = schedule || {};

    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`);
    const hourlyCost = [];
    const hourlyFlow = [];

    for (let t = 0; t < 24; t++) {
        let cost = 0, flow = 0;
        for (const [pmpKey, pmpVal] of Object.entries(pompes)) {
            if (sched[pmpKey]?.[t]) {
                const tarif = tarifs?.[pmpVal.tarif] || [];
                const rate = Array.isArray(tarif) ? (tarif[t] || 0.29) : (Number(tarif) || 0.29);
                cost += (pmpVal.puissance || 0) * rate;
                flow += (pmpVal.debit || 0);
            }
        }
        hourlyCost.push(parseFloat(cost.toFixed(2)));
        hourlyFlow.push(parseFloat(flow.toFixed(0)));
    }

    const ctx = canvas.getContext('2d');
    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [
                {
                    type: 'line',
                    label: 'Coût Horaire (TND / h)',
                    data: hourlyCost,
                    borderColor: '#f43f5e',
                    borderWidth: 2.5,
                    tension: 0.3,
                    pointRadius: 2.5,
                    yAxisID: 'yCost'
                },
                {
                    type: 'bar',
                    label: 'Débit Pompé (m³ / h)',
                    data: hourlyFlow,
                    backgroundColor: 'rgba(59, 130, 246, 0.65)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: 3,
                    yAxisID: 'yFlow'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { labels: { color: '#cbd5e1', font: { size: 10 }, usePointStyle: true } } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 8 } } },
                yCost: {
                    type: 'linear', position: 'left',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#fca5a5', font: { family: 'JetBrains Mono', size: 8 } },
                    title: { display: true, text: 'TND / h', color: '#fca5a5', font: { size: 9 } }
                },
                yFlow: {
                    type: 'linear', position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#93c5fd', font: { family: 'JetBrains Mono', size: 8 } },
                    title: { display: true, text: 'm³ / h', color: '#93c5fd', font: { size: 9 } }
                }
            }
        }
    });
}

/**
 * [PRO ANALYSER] Decision Breakdown (HC / HP / HPH Pumping Power)
 */
export function renderProDecisionMatrixChart(canvasId, systemData, schedule) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const pompes = (systemData && systemData.pompes) ? systemData.pompes : POMPES;
    const sched = schedule || {};

    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`);
    const hcPwr  = [];
    const hpPwr  = [];
    const hphPwr = [];

    for (let t = 0; t < 24; t++) {
        let pwr = 0;
        for (const [pmpKey, pmpVal] of Object.entries(pompes)) {
            if (sched[pmpKey]?.[t]) pwr += (pmpVal.puissance || 0);
        }

        const isHC = (t >= 23 || t < 8);
        const isHPH = ((t >= 8 && t < 13) || (t >= 19 && t < 23));

        if (isHC) {
            hcPwr.push(parseFloat(pwr.toFixed(1)));
            hpPwr.push(0);
            hphPwr.push(0);
        } else if (isHPH) {
            hcPwr.push(0);
            hpPwr.push(0);
            hphPwr.push(parseFloat(pwr.toFixed(1)));
        } else {
            hcPwr.push(0);
            hpPwr.push(parseFloat(pwr.toFixed(1)));
            hphPwr.push(0);
        }
    }

    const ctx = canvas.getContext('2d');
    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [
                {
                    label: '🌙 HC Nuit (23h-08h) - Économique',
                    data: hcPwr,
                    backgroundColor: 'rgba(124, 58, 237, 0.85)',
                    borderColor: '#7c3aed',
                    borderWidth: 1,
                    borderRadius: 3
                },
                {
                    label: '☀️ HP Jour (13h-19h) - Standard',
                    data: hpPwr,
                    backgroundColor: 'rgba(6, 182, 212, 0.85)',
                    borderColor: '#06b6d4',
                    borderWidth: 1,
                    borderRadius: 3
                },
                {
                    label: '🔴 HPH Pointe (08h-13h + 19h-23h) - Coûteux',
                    data: hphPwr,
                    backgroundColor: 'rgba(244, 63, 94, 0.85)',
                    borderColor: '#f43f5e',
                    borderWidth: 1,
                    borderRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#cbd5e1', font: { size: 10 }, usePointStyle: true } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} kW` } }
            },
            scales: {
                x: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 8 } } },
                y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#cbd5e1', font: { family: 'JetBrains Mono', size: 8 } }, title: { display: true, text: 'Puissance kW', color: '#06b6d4', font: { size: 9 } } }
            }
        }
    });
}

// ============================================================================
// NOUVELLES MÉTHODES DE CHART — ALIMENTATION DES ÉTAGES DE DEMANDE E1..E7
// ============================================================================
// Ordre d'affichage standard des étages (du profil le plus chargé au plus faible)
const ETAGE_ORDER = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7'];
const ETAGE_COLORS = {
    'E1': '#f43f5e', 'E2': '#c084fc', 'E3': '#10b981',
    'E4': '#f59e0b', 'E5': '#06b6d4', 'E6': '#ec4899', 'E7': '#3b82f6'
};

function resolveDemande(systemData) {
    return (systemData && systemData.demande) ? systemData.demande : DEMANDE_HORAIRE;
}

function etageTotal24h(demande, etage) {
    const arr = demande && demande[etage];
    if (!arr || !Array.isArray(arr)) return 0;
    return arr.reduce((a, b) => a + (Number(b) || 0), 0);
}

/**
 * [NOUVEAU] Polar Area — Volumes journaliers demandés par Étage,
 * chaque étage étant clairement rattaché à son réservoir d'alimentation.
 */
export function renderEtageSupplyPolarChart(canvasId, systemData, schedule) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const demande = resolveDemande(systemData);
    const labels = ETAGE_ORDER.map(e => `Étage alimenté par ${ETAGE_FEEDERS[e] || '—'}`);
    const data = ETAGE_ORDER.map(e => parseFloat((etageTotal24h(demande, e)).toFixed(1)));
    const colors = ETAGE_ORDER.map(e => ETAGE_COLORS[e]);

    const ctx = canvas.getContext('2d');
    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.map(c => c + 'AA'),
                borderColor: colors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#cbd5e1', font: { family: 'Inter', size: 10 }, usePointStyle: true, padding: 10 }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label} : ${Number(ctx.raw).toLocaleString()} m³/j`
                    }
                }
            },
            scales: {
                r: {
                    grid: { color: 'rgba(255,255,255,0.08)' },
                    ticks: { color: '#94a3b8', backdropColor: 'transparent', font: { family: 'JetBrains Mono', size: 9 } },
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * [NOUVEAU] Stacked Bar — Profils horaires de demande (00h→23h) par étage,
 * chaque dataset portant le nom de son réservoir d'alimentation.
 */
export function renderEtageDemandStackedChart(canvasId, systemData, schedule) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const demande = resolveDemande(systemData);
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

    const datasets = ETAGE_ORDER.map(etage => ({
        label: `Étage alimenté par ${ETAGE_FEEDERS[etage] || '—'}`,
        data: hours.map((_, t) => parseFloat(((demande && demande[etage] && demande[etage][t]) || 0).toFixed(1))),
        backgroundColor: ETAGE_COLORS[etage] + 'CC',
        borderColor: ETAGE_COLORS[etage],
        borderWidth: 1,
        borderRadius: 2
    }));

    const ctx = canvas.getContext('2d');
    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels: hours, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#cbd5e1', font: { family: 'Inter', size: 10 }, usePointStyle: true, boxWidth: 12, padding: 10 }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label} : ${ctx.raw} m³/h`
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 8 }, maxRotation: 0 }
                },
                y: {
                    stacked: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#cbd5e1', font: { family: 'JetBrains Mono', size: 9 } },
                    title: { display: true, text: 'Demande (m³/h)', color: '#06b6d4', font: { size: 10 } }
                }
            }
        }
    });
}

/**
 * [NOUVEAU] Doughnut — Répartition du volume journalier par réservoir
 * d'alimentation (R1/R2/R3/R5/R6/R7/R10) avec les étages rattachés.
 */
export function renderEtageFeederDonutChart(canvasId, systemData, schedule) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const demande = resolveDemande(systemData);

    // Agrégation par réservoir d'alimentation
    const feederTotals = {};
    const feederColors = {
        'R1': '#8b5cf6', 'R2': '#ec4899', 'R3': '#10b981',
        'R5': '#6366f1', 'R6': '#3b82f6', 'R7': '#f59e0b', 'R10': '#14b8a6'
    };
    ETAGE_ORDER.forEach(etage => {
        const feeder = ETAGE_FEEDERS[etage] || '—';
        feederTotals[feeder] = (feederTotals[feeder] || 0) + etageTotal24h(demande, etage);
    });

    const labels = Object.keys(feederTotals).map(f => `Étage alimenté par ${f}`);

    const ctx = canvas.getContext('2d');
    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: Object.values(feederTotals),
                backgroundColor: Object.keys(feederTotals).map(f => (feederColors[f] || '#7c3aed') + 'CC'),
                borderColor: Object.keys(feederTotals).map(f => feederColors[f] || '#7c3aed'),
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#cbd5e1', font: { family: 'Inter', size: 10 }, usePointStyle: true, padding: 10 }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = Object.values(feederTotals).reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? (ctx.raw / total * 100).toFixed(1) : '0';
                            return ` ${ctx.label} : ${Number(ctx.raw).toLocaleString()} m³/j (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '58%'
        }
    });
}

/**
 * [NOUVEAU] Bar Chart Horizontal — Classement des étages par demande moyenne
 * avec rattachement au réservoir d'alimentation (lecture rapide).
 */
export function renderEtageRankingBarChart(canvasId, systemData, schedule) {
    if (typeof Chart === 'undefined') return;
    ensureChartDefaults();
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const demande = resolveDemande(systemData);
    const sorted = ETAGE_ORDER
        .map(e => ({ etage: e, feeder: ETAGE_FEEDERS[e] || '—', avg: (demande && demande[e] && Array.isArray(demande[e])) ? demande[e].reduce((a, b) => a + (Number(b) || 0), 0) / 24 : 0 }))
        .sort((a, b) => b.avg - a.avg);

    const ctx = canvas.getContext('2d');
    activeChartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => `Étage alimenté par ${s.feeder}`),
            datasets: [{
                label: 'Demande moyenne (m³/h)',
                data: sorted.map(s => parseFloat(s.avg.toFixed(1))),
                backgroundColor: sorted.map(s => ETAGE_COLORS[s.etage] + 'CC'),
                borderColor: sorted.map(s => ETAGE_COLORS[s.etage]),
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { size: 10 } } },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label} : ${ctx.raw} m³/h (moyenne)`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#cbd5e1', font: { family: 'Inter', size: 11 } }
                }
            }
        }
    });
}
