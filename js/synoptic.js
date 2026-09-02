/**
 * AquaData Studio v4.0 — Synoptique Hydraulique SVG SCADA Industriel
 * Schéma vectoriel interactif haute qualité du réseau AEP
 * Inspiré de Siemens SCADA / Schneider EcoStruxure / AVEVA / WaterGEMS
 */

import { ETAGE_FEEDERS } from './schema.js';

const SVG_W = 1800;
const SVG_H = 1150;

// ── TOPOLOGIE DES NŒUDS ──────────────────────────────────────────
const NODES = {
    NAPPE: { x: 900, y: 38, type: 'aquifer', label: 'NAPPE PHRÉATIQUE SOUTERRAINE', w: 1780, h: 42 },

    // Forages R500
    F1_R500:  { x: 100,  y: 135, type: 'well', label: 'F1',  sublabel: '54 m³/h·16.3kW',  pumpId: 'F1_R500' },
    F2_R500:  { x: 200,  y: 135, type: 'well', label: 'F2',  sublabel: '39.6m³/h·11.2kW', pumpId: 'F2_R500' },
    F3_R500:  { x: 300,  y: 135, type: 'well', label: 'F3',  sublabel: '28.8m³/h·10kW',   pumpId: 'F3_R500' },
    F4_R500:  { x: 400,  y: 135, type: 'well', label: 'F4',  sublabel: '72m³/h·29.4kW',   pumpId: 'F4_R500' },
    F5_R500:  { x: 500,  y: 135, type: 'well', label: 'F5',  sublabel: '108m³/h·37.5kW',  pumpId: 'F5_R500' },
    F6_R500:  { x: 600,  y: 135, type: 'well', label: 'F6',  sublabel: '36m³/h·13.2kW',   pumpId: 'F6_R500' },
    F7_R500:  { x: 700,  y: 135, type: 'well', label: 'F7',  sublabel: '25.2m³/h·14.6kW', pumpId: 'F7_R500' },
    F8_R500:  { x: 800,  y: 135, type: 'well', label: 'F8',  sublabel: '90m³/h·47kW',     pumpId: 'F8_R500' },
    F9_R500:  { x: 900,  y: 135, type: 'well', label: 'F9',  sublabel: '126m³/h·61.6kW',  pumpId: 'F9_R500' },
    F10_R500: { x: 1000, y: 135, type: 'well', label: 'F10', sublabel: '36m³/h·21.9kW',   pumpId: 'F10_R500' },
    F11_R500: { x: 1100, y: 135, type: 'well', label: 'F11', sublabel: '97.2m³/h·30.8kW', pumpId: 'F11_R500' },
    F12_R500: { x: 1200, y: 135, type: 'well', label: 'F12', sublabel: '180m³/h·51.4kW',  pumpId: 'F12_R500' },

    // Zone Ain Bidha
    Forage_Ain_Bidha: { x: 1430, y: 135, type: 'well',   label: 'F.Ain Bidha', sublabel: '65.8m³/h·7.9kW', pumpId: 'Forage_Ain_Bidha_Pmp' },
    Source_Ain_Bidha: { x: 1545, y: 135, type: 'source', label: 'Src.Ain Bidha', sublabel: '14.4m³/h' },

    // Zone SK10
    Forage1_SK10: { x: 1635, y: 135, type: 'well', label: 'SK10-F1', sublabel: '43.2m³/h', pumpId: 'Forage1_SK10' },
    Forage2_SK10: { x: 1710, y: 135, type: 'well', label: 'SK10-F2', sublabel: '14.4m³/h', pumpId: 'Forage2_SK10' },
    Forage3_SK10: { x: 1780, y: 135, type: 'well', label: 'SK10-F3', sublabel: '36m³/h',   pumpId: 'Forage3_SK10' },

    // Réservoir R500
    R500: { x: 650, y: 300, type: 'reservoir', label: 'R500', sublabel: 'Vmax=500m³', resId: 'R500', w: 95, h: 72 },

    // Pompes R500 → R6
    Pump_R500_R6_P1: { x: 560, y: 435, type: 'pump', label: 'P1', sublabel: '576m³/h', pumpId: 'R500_to_R6_P1' },
    Pump_R500_R6_P2: { x: 660, y: 435, type: 'pump', label: 'P2', sublabel: '475m³/h', pumpId: 'R500_to_R6_P2' },

    // Ain Bidha chain
    ST_Ain_Bidha:   { x: 1480, y: 280, type: 'station', label: 'ST Ain Bidha',   sublabel: 'Vmax=150m³', resId: 'ST_Ain_Bidha',   w: 84, h: 58 },
    Pump_AB_Z_P1:   { x: 1420, y: 370, type: 'pump', label: 'P1', sublabel: '28.8m³/h', pumpId: 'Ain_Bidha_to_Zaaf_P1' },
    Pump_AB_Z_P2:   { x: 1490, y: 370, type: 'pump', label: 'P2', sublabel: '64.8m³/h', pumpId: 'Ain_Bidha_to_Zaaf_P2' },
    ST_Zaafrane:    { x: 1460, y: 450, type: 'station', label: 'ST Zaafrane',    sublabel: 'Vmax=120m³', resId: 'ST_Zaafrane',    w: 84, h: 58 },
    Pump_Z_B:       { x: 1460, y: 535, type: 'pump', label: 'P', sublabel: '46.8m³/h', pumpId: 'Zaaf_to_Birchag_P1' },
    ST_Birchagroun: { x: 1460, y: 615, type: 'station', label: 'ST Birchagroun', sublabel: 'Vmax=100m³', resId: 'ST_Birchagroun', w: 84, h: 58 },
    Pump_B_R6:      { x: 1380, y: 680, type: 'pump', label: 'P', sublabel: '132.8m³/h', pumpId: 'Birchagroun_to_R6' },

    // SK10 chain
    ST_SK10_Relais: { x: 1710, y: 280, type: 'station', label: 'ST SK10', sublabel: 'Vmax=100m³', resId: 'ST_SK10_Relais', w: 84, h: 58 },
    Pump_SK10_R6:   { x: 1710, y: 390, type: 'pump', label: 'P', sublabel: '36m³/h', pumpId: 'SK10_to_R6_P1' },

    // Source Romaine
    Source_Romaine: { x: 210, y: 590, type: 'source', label: 'Source Romaine', sublabel: '46.8m³/h (Grav.)' },

    // R6 central
    R6: { x: 900, y: 590, type: 'reservoir', label: 'R6', sublabel: 'Vmax=5000m³', resId: 'R6', w: 115, h: 90, central: true },

    // E5 depuis R6
    E5: { x: 1135, y: 590, type: 'demand', label: 'E5', sublabel: 'Demande moy. 197.7 m³/h' },

    // Vanne R6 → R5
    Vanne_R6_R5: { x: 700, y: 700, type: 'valve', label: 'VG R6→R5', pumpId: 'R6_vers_R5', isGrav: true },
    R5:          { x: 580, y: 800, type: 'reservoir', label: 'R5', sublabel: 'Vmax=1500m³', resId: 'R5', w: 90, h: 70 },
    E4:          { x: 580, y: 955, type: 'demand', label: 'E4', sublabel: 'Demande moy. 116.3 m³/h' },

    // Pompes R6 → R1
    Pump_R6_R1_P1: { x: 960,  y: 700, type: 'pump', label: 'P1', sublabel: '396m³/h', pumpId: 'R6_to_R1_P1' },
    Pump_R6_R1_P2: { x: 1040, y: 700, type: 'pump', label: 'P2', sublabel: '360m³/h', pumpId: 'R6_to_R1_P2' },

    // R1
    R1: { x: 1000, y: 810, type: 'reservoir', label: 'R1', sublabel: 'Vmax=500m³', resId: 'R1', w: 90, h: 70 },
    E1: { x: 1000, y: 960, type: 'demand', label: 'E1', sublabel: 'Demande moy. 355.7 m³/h' },

    // Vanne R1 → R7
    Vanne_R1_R7: { x: 1170, y: 880, type: 'valve', label: 'VG R1→R7', pumpId: 'R1_vers_R7', isGrav: true },
    R7:          { x: 1280, y: 970, type: 'reservoir', label: 'R7', sublabel: 'Vmax=1500m³', resId: 'R7', w: 85, h: 65 },
    E6:          { x: 1280, y: 1090, type: 'demand', label: 'E6', sublabel: 'Demande moy. 72.57 m³/h' },

    // Pompes R1 → R2
    Pump_R1_R2_P1: { x: 810, y: 885, type: 'pump', label: 'P1', sublabel: '108m³/h',  pumpId: 'R1_to_R2_P1' },
    Pump_R1_R2_P2: { x: 875, y: 885, type: 'pump', label: 'P2', sublabel: '97.2m³/h', pumpId: 'R1_to_R2_P2' },
    R2:            { x: 840, y: 985, type: 'reservoir', label: 'R2', sublabel: 'Vmax=500m³', resId: 'R2', w: 82, h: 65 },
    E2:            { x: 840, y: 1095, type: 'demand', label: 'E2', sublabel: 'Demande moy. 65.8 m³/h' },

    // Pompes R1 → R3
    Pump_R1_R3_P1: { x: 690, y: 885, type: 'pump', label: 'P1', sublabel: '90m³/h',  pumpId: 'R1_to_R3_P1' },
    Pump_R1_R3_P2: { x: 755, y: 885, type: 'pump', label: 'P2', sublabel: '144m³/h', pumpId: 'R1_to_R3_P2' },
    R3:            { x: 680, y: 985, type: 'reservoir', label: 'R3', sublabel: 'Vmax=500m³', resId: 'R3', w: 82, h: 65 },
    E3:            { x: 680, y: 1095, type: 'demand', label: 'E3', sublabel: 'Demande moy. 28.3 m³/h' },

    // Vanne R3 → R10
    Vanne_R3_R10: { x: 560, y: 1045, type: 'valve', label: 'VG R3→R10', pumpId: 'R3_vers_R10', isGrav: true },
    R10:          { x: 460, y: 1095, type: 'reservoir', label: 'R10', sublabel: 'Vmax=1000m³', resId: 'R10', w: 80, h: 58 },
    E7:           { x: 340, y: 1095, type: 'demand', label: 'E7', sublabel: 'Demande moy. 21.9 m³/h' },
};

// ── CONDUITES ────────────────────────────────────────────────────
const PIPES = [
    // Forages → R500
    ...[['F1_R500','R500'],['F2_R500','R500'],['F3_R500','R500'],['F4_R500','R500'],
        ['F5_R500','R500'],['F6_R500','R500'],['F7_R500','R500'],['F8_R500','R500'],
        ['F9_R500','R500'],['F10_R500','R500'],['F11_R500','R500'],['F12_R500','R500']
    ].map(([f,t]) => ({ from: f, to: t, type: 'pressure', pumpId: f })),
    // R500 → Pompes → R6
    { from: 'R500', to: 'Pump_R500_R6_P1', type: 'pressure', pumpId: 'R500_to_R6_P1' },
    { from: 'R500', to: 'Pump_R500_R6_P2', type: 'pressure', pumpId: 'R500_to_R6_P2' },
    { from: 'Pump_R500_R6_P1', to: 'R6', type: 'pressure', pumpId: 'R500_to_R6_P1' },
    { from: 'Pump_R500_R6_P2', to: 'R6', type: 'pressure', pumpId: 'R500_to_R6_P2' },
    // Ain Bidha chain
    { from: 'Forage_Ain_Bidha', to: 'ST_Ain_Bidha', type: 'pressure', pumpId: 'Forage_Ain_Bidha_Pmp' },
    { from: 'Source_Ain_Bidha', to: 'ST_Ain_Bidha', type: 'gravity' },
    { from: 'ST_Ain_Bidha', to: 'Pump_AB_Z_P1', type: 'pressure', pumpId: 'Ain_Bidha_to_Zaaf_P1' },
    { from: 'ST_Ain_Bidha', to: 'Pump_AB_Z_P2', type: 'pressure', pumpId: 'Ain_Bidha_to_Zaaf_P2' },
    { from: 'Pump_AB_Z_P1', to: 'ST_Zaafrane', type: 'pressure', pumpId: 'Ain_Bidha_to_Zaaf_P1' },
    { from: 'Pump_AB_Z_P2', to: 'ST_Zaafrane', type: 'pressure', pumpId: 'Ain_Bidha_to_Zaaf_P2' },
    { from: 'ST_Zaafrane', to: 'Pump_Z_B', type: 'pressure', pumpId: 'Zaaf_to_Birchag_P1' },
    { from: 'Pump_Z_B', to: 'ST_Birchagroun', type: 'pressure', pumpId: 'Zaaf_to_Birchag_P1' },
    { from: 'ST_Birchagroun', to: 'Pump_B_R6', type: 'pressure', pumpId: 'Birchagroun_to_R6' },
    { from: 'Pump_B_R6', to: 'R6', type: 'pressure', pumpId: 'Birchagroun_to_R6' },
    // SK10 chain
    { from: 'Forage1_SK10', to: 'ST_SK10_Relais', type: 'pressure', pumpId: 'Forage1_SK10' },
    { from: 'Forage2_SK10', to: 'ST_SK10_Relais', type: 'pressure', pumpId: 'Forage2_SK10' },
    { from: 'Forage3_SK10', to: 'ST_SK10_Relais', type: 'pressure', pumpId: 'Forage3_SK10' },
    { from: 'ST_SK10_Relais', to: 'Pump_SK10_R6', type: 'pressure', pumpId: 'SK10_to_R6_P1' },
    { from: 'Pump_SK10_R6', to: 'R6', type: 'pressure', pumpId: 'SK10_to_R6_P1' },
    // Source Romaine → R1
    { from: 'Source_Romaine', to: 'R1', type: 'gravity', pumpId: 'Source_Romaine_vers_R1' },
    // R6 → E5
    { from: 'R6', to: 'E5', type: 'demand' },
    // R6 → VG → R5 → E4
    { from: 'R6', to: 'Vanne_R6_R5', type: 'gravity', pumpId: 'R6_vers_R5' },
    { from: 'Vanne_R6_R5', to: 'R5', type: 'gravity', pumpId: 'R6_vers_R5' },
    { from: 'R5', to: 'E4', type: 'demand' },
    // R6 → Pompes → R1 → E1
    { from: 'R6', to: 'Pump_R6_R1_P1', type: 'pressure', pumpId: 'R6_to_R1_P1' },
    { from: 'R6', to: 'Pump_R6_R1_P2', type: 'pressure', pumpId: 'R6_to_R1_P2' },
    { from: 'Pump_R6_R1_P1', to: 'R1', type: 'pressure', pumpId: 'R6_to_R1_P1' },
    { from: 'Pump_R6_R1_P2', to: 'R1', type: 'pressure', pumpId: 'R6_to_R1_P2' },
    { from: 'R1', to: 'E1', type: 'demand' },
    // R1 → VG → R7 → E6
    { from: 'R1', to: 'Vanne_R1_R7', type: 'gravity', pumpId: 'R1_vers_R7' },
    { from: 'Vanne_R1_R7', to: 'R7', type: 'gravity', pumpId: 'R1_vers_R7' },
    { from: 'R7', to: 'E6', type: 'demand' },
    // R1 → Pompes → R2 → E2
    { from: 'R1', to: 'Pump_R1_R2_P1', type: 'pressure', pumpId: 'R1_to_R2_P1' },
    { from: 'R1', to: 'Pump_R1_R2_P2', type: 'pressure', pumpId: 'R1_to_R2_P2' },
    { from: 'Pump_R1_R2_P1', to: 'R2', type: 'pressure', pumpId: 'R1_to_R2_P1' },
    { from: 'Pump_R1_R2_P2', to: 'R2', type: 'pressure', pumpId: 'R1_to_R2_P2' },
    { from: 'R2', to: 'E2', type: 'demand' },
    // R1 → Pompes → R3 → E3 + VG → R10 → E7
    { from: 'R1', to: 'Pump_R1_R3_P1', type: 'pressure', pumpId: 'R1_to_R3_P1' },
    { from: 'R1', to: 'Pump_R1_R3_P2', type: 'pressure', pumpId: 'R1_to_R3_P2' },
    { from: 'Pump_R1_R3_P1', to: 'R3', type: 'pressure', pumpId: 'R1_to_R3_P1' },
    { from: 'Pump_R1_R3_P2', to: 'R3', type: 'pressure', pumpId: 'R1_to_R3_P2' },
    { from: 'R3', to: 'E3', type: 'demand' },
    { from: 'R3', to: 'Vanne_R3_R10', type: 'gravity', pumpId: 'R3_vers_R10' },
    { from: 'Vanne_R3_R10', to: 'R10', type: 'gravity', pumpId: 'R3_vers_R10' },
    { from: 'R10', to: 'E7', type: 'demand' },
];

// ── ÉTAT GLOBAL ───────────────────────────────────────────────────
let _schedule = null, _results = null, _systemData = null;
let _svg = null, _miniSvg = null, _tooltip = null;
let _detailPanel = null, _selectedNodeId = null;
let _viewBox = { x: 0, y: 0, w: SVG_W, h: SVG_H };
let _pan = { active: false, startX: 0, startY: 0, origVB: null };
let _activeHour = 23;

// ── HELPERS ───────────────────────────────────────────────────────
function ns(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
}

function isPumpOn(pumpId, schedule, hour = null) {
    if (!schedule || !pumpId) return false;
    const list = schedule[pumpId] || [];
    if (hour !== null && hour !== undefined) {
        return (list[hour] || 0) > 0;
    }
    return list.some(v => v > 0);
}

function resVolume(resId, results, t = 23) {
    // Support both snake_case (simulation.js output) and camelCase
    const ve = results?.volume_evolution ?? results?.volumeEvolution;
    if (!ve) return null;
    return ve[resId]?.[t] ?? null;
}

function applyVB() {
    if (_svg) _svg.setAttribute('viewBox', `${_viewBox.x} ${_viewBox.y} ${_viewBox.w} ${_viewBox.h}`);
}

// ── DEFS SVG ──────────────────────────────────────────────────────
function buildDefs() {
    const defs = ns('defs');

    // Gradient aquifère
    const gAq = ns('linearGradient', { id: 'grad-aq', x1: '0', y1: '0', x2: '1', y2: '0' });
    [['0%', '#082f49'], ['35%', '#0284c7'], ['65%', '#0369a1'], ['100%', '#082f49']].forEach(([o, c]) => {
        const s = ns('stop', { offset: o, 'stop-color': c }); gAq.appendChild(s);
    });
    defs.appendChild(gAq);

    // Gradient corps réservoir verre / métallique sombre
    const gTankBg = ns('linearGradient', { id: 'grad-tank-chassis', x1: '0', y1: '0', x2: '0', y2: '1' });
    [['0%', '#0f172a'], ['60%', '#0b1120'], ['100%', '#050814']].forEach(([o, c]) => {
        const s = ns('stop', { offset: o, 'stop-color': c }); gTankBg.appendChild(s);
    });
    defs.appendChild(gTankBg);

    // Gradient eau nominal (CYAN VIF VERS ÉMERAUDE SCADA AVEC PROFONDEUR)
    const gW = ns('linearGradient', { id: 'grad-water', x1: '0', y1: '0', x2: '0', y2: '1' });
    [['0%', '#38bdf8'], ['40%', '#06b6d4'], ['100%', '#059669']].forEach(([o, c]) => {
        const s = ns('stop', { offset: o, 'stop-color': c }); gW.appendChild(s);
    });
    defs.appendChild(gW);

    // Gradient eau alerte (ROUGE / CARMIN BRILLANT SCADA)
    const gWA = ns('linearGradient', { id: 'grad-water-alert', x1: '0', y1: '0', x2: '0', y2: '1' });
    [['0%', '#f87171'], ['45%', '#ef4444'], ['100%', '#881337']].forEach(([o, c]) => {
        const s = ns('stop', { offset: o, 'stop-color': c }); gWA.appendChild(s);
    });
    defs.appendChild(gWA);

    // Gradient eau vigilance (AMBRE / OR LUMINEUX)
    const gWW = ns('linearGradient', { id: 'grad-water-warn', x1: '0', y1: '0', x2: '0', y2: '1' });
    [['0%', '#fde68a'], ['45%', '#f59e0b'], ['100%', '#b45309']].forEach(([o, c]) => {
        const s = ns('stop', { offset: o, 'stop-color': c }); gWW.appendChild(s);
    });
    defs.appendChild(gWW);

    // Gradient reflet verre glossy
    const gGlass = ns('linearGradient', { id: 'grad-glass-glare', x1: '0', y1: '0', x2: '1', y2: '1' });
    [['0%', 'rgba(255, 255, 255, 0.22)'], ['40%', 'rgba(255, 255, 255, 0.05)'], ['100%', 'rgba(255, 255, 255, 0.0)']].forEach(([o, c]) => {
        const s = ns('stop', { offset: o, 'stop-color': c }); gGlass.appendChild(s);
    });
    defs.appendChild(gGlass);

    // Markers flèches
    [
        ['arrow-p', '#06b6d4'],
        ['arrow-g', '#c084fc'],
        ['arrow-d', '#f59e0b'],
    ].forEach(([id, color]) => {
        const m = ns('marker', { id, markerWidth: '8', markerHeight: '8', refX: '7', refY: '4', orient: 'auto' });
        m.appendChild(ns('polygon', { points: '0 0, 8 4, 0 8', fill: color, opacity: '0.95' }));
        defs.appendChild(m);
    });

    // Filtre lueur (glow)
    const f = ns('filter', { id: 'scada-glow', x: '-30%', y: '-30%', width: '160%', height: '160%' });
    f.innerHTML = `<feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>`;
    defs.appendChild(f);

    return defs;
}

// ── RENDU AQUIFÈRE ────────────────────────────────────────────────
function drawAquifer(g, n) {
    const rect = ns('rect', {
        x: n.x - n.w / 2, y: n.y - n.h / 2,
        width: n.w, height: n.h,
        fill: 'url(#grad-aq)', rx: '6',
        stroke: '#0ea5e9', 'stroke-width': '1.8'
    });
    const t = ns('text', {
        x: n.x, y: n.y + 6,
        'text-anchor': 'middle', 'font-size': '13',
        'font-family': 'Inter,sans-serif', 'font-weight': '700',
        fill: '#e0f2fe', 'letter-spacing': '2'
    });
    t.textContent = '≋  ' + n.label + '  ≋';
    g.appendChild(rect); g.appendChild(t);
}

// ── RENDU FORAGE (VERT VIF EN MARCHE / ROUGE BORDEAUX À L'ARRÊT) ──
function drawWell(g, id, n, active) {
    const { x, y } = n;
    // Couleurs riches foncées/vives (Vert actif / Rouge Sombre arrêt)
    const strokeCol = active ? '#10b981' : '#b91c1c';
    const bgFill    = active ? '#042f2e' : '#2a0a0a';
    const headFill  = active ? '#065f46' : '#450a0a';
    const labelCol  = active ? '#34d399' : '#fca5a5';

    // Tige
    g.appendChild(ns('rect', { x: x - 7, y: y - 22, width: 14, height: 44, rx: '3', fill: bgFill, stroke: strokeCol, 'stroke-width': '1.8' }));
    // Tête
    g.appendChild(ns('rect', { x: x - 13, y: y - 28, width: 26, height: 10, rx: '2', fill: headFill, stroke: strokeCol, 'stroke-width': '1.8' }));
    // Roue pompe immergée (animation fluide)
    const rot = ns('g', { class: active ? 'pump-rotor' : '' });
    rot.appendChild(ns('circle', { cx: x, cy: y + 12, r: '7', fill: 'none', stroke: strokeCol, 'stroke-width': '1.8' }));
    [[0,-7],[5,5],[-5,5]].forEach(([dx,dy]) => {
        rot.appendChild(ns('line', { x1: x, y1: y+12, x2: x+dx, y2: y+12+dy, stroke: strokeCol, 'stroke-width': '1.8', 'stroke-linecap': 'round' }));
    });
    g.appendChild(rot);
    // Label Nom
    const lbl = ns('text', { x, y: y + 34, 'text-anchor': 'middle', 'font-size': '9', 'font-family': 'Inter,sans-serif', 'font-weight': '700', fill: labelCol });
    lbl.textContent = n.label;
    g.appendChild(lbl);
    // Dot état (Vert si ON / Rouge si OFF)
    const dot = ns('circle', { cx: x + 11, cy: y - 24, r: '4', fill: active ? '#10b981' : '#ef4444' });
    if (active) dot.classList.add('dot-pulse');
    g.appendChild(dot);
}

// ── RENDU POMPE (CYAN-VERT EN MARCHE / ROUGE BORDEAUX À L'ARRÊT) ──
function drawPump(g, id, n, active) {
    const { x, y } = n;
    // Couleurs riches foncées/vives (Cyan/Vert actif / Rouge-Sombre arrêt)
    const strokeCol = active ? '#06b6d4' : '#b91c1c';
    const bgFill    = active ? '#06283b' : '#2a0a0a';
    const rotorCol  = active ? '#38bdf8' : '#dc2626';
    const labelCol  = active ? '#7dd3fc' : '#fca5a5';

    // Corps
    g.appendChild(ns('rect', { x: x-18, y: y-15, width: 36, height: 30, rx: '5', fill: bgFill, stroke: strokeCol, 'stroke-width': '2' }));
    // Rotor
    const rot = ns('g', { class: active ? 'pump-rotor' : '' });
    rot.appendChild(ns('circle', { cx: x, cy: y, r: '9', fill: 'none', stroke: rotorCol, 'stroke-width': '2' }));
    for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i;
        rot.appendChild(ns('line', {
            x1: x, y1: y, x2: x + 8 * Math.cos(a), y2: y + 8 * Math.sin(a),
            stroke: rotorCol, 'stroke-width': '2', 'stroke-linecap': 'round'
        }));
    }
    g.appendChild(rot);
    // Labels
    const lbl = ns('text', { x, y: y + 25, 'text-anchor': 'middle', 'font-size': '8.5', 'font-family': 'Inter,sans-serif', 'font-weight': '700', fill: labelCol });
    lbl.textContent = n.label;
    const sub = ns('text', { x, y: y + 34, 'text-anchor': 'middle', 'font-size': '7', 'font-family': 'Inter,sans-serif', fill: active ? '#38bdf8' : '#ef4444' });
    sub.textContent = n.sublabel || '';
    g.appendChild(lbl); g.appendChild(sub);
    // Dot état (Vert si ON / Rouge si OFF)
    const dot = ns('circle', { cx: x + 16, cy: y - 13, r: '4', fill: active ? '#10b981' : '#ef4444' });
    if (active) dot.classList.add('dot-pulse');
    g.appendChild(dot);
}

// ── RENDU RÉSERVOIR / STATION — Niveau d'eau animé avec vague & effet verre ──────
function drawReservoir(g, id, n, results, hour = 23) {
    const { x, y } = n;
    const W = n.w || 88, H = n.h || 68;
    const isCentral = !!n.central;

    let vmin = 0, vmax = 1000, vinit = 500;
    if (_systemData?.capacites && n.resId) {
        const cap = _systemData.capacites[n.resId];
        if (cap) [vmin, vmax, vinit] = cap;
    }

    // Volume réel, toujours limité à [0 .. +inf] pour l'affichage
    const vcurrRaw = (results && n.resId) ? (resVolume(n.resId, results, hour) ?? vinit) : vinit;
    const vcurr = Math.max(0, vcurrRaw);

    // Pourcentage de remplissage physique sur la capacité totale Vmax (0.04 min pour effet fond)
    const fillRatio = Math.max(0.04, Math.min(1.0, vcurr / Math.max(1, vmax)));
    const displayPct = Math.round((vcurr / Math.max(1, vmax)) * 100);
    const vminRatio = Math.max(0, Math.min(1.0, vmin / Math.max(1, vmax)));

    // Couleurs selon statut
    const isLow    = vcurr < vmin;
    const isOver   = vcurr > vmax;
    const isDanger = (vcurr <= 0) || isLow || isOver;
    const isWarn   = !isDanger && (vcurr - vmin) < ((vmax - vmin) * 0.18);

    const borderCol = isDanger ? '#ef4444' : (isWarn ? '#f59e0b' : (isCentral ? '#38bdf8' : '#10b981'));
    const gradId    = isDanger ? 'grad-water-alert' : (isWarn ? 'grad-water-warn' : 'grad-water');
    const textColor = isDanger ? '#fca5a5' : (isWarn ? '#fde68a' : '#6ee7b7');
    const borderW   = isCentral ? 3.0 : 2.0;

    const innerW = W - 6;
    const innerH = H - 6;
    const innerX = x - W / 2 + 3;
    const innerY = y - H / 2 + 3;

    const fillH = Math.max(3, innerH * fillRatio);
    const waterTopY = innerY + innerH - fillH;
    const vminY = innerY + innerH - (innerH * vminRatio);

    // --- Ombre portée ---
    g.appendChild(ns('rect', {
        x: x - W / 2 + 3, y: y - H / 2 + 3, width: W, height: H,
        rx: '8', fill: 'rgba(0,0,0,0.65)'
    }));

    // --- ClipPath pour l'eau et les effets intérieurs ---
    const clipId = `clip-${id}`;
    const clip = ns('clipPath', { id: clipId });
    clip.appendChild(ns('rect', { x: innerX, y: innerY, width: innerW, height: innerH, rx: '6' }));
    g.appendChild(clip);

    // --- Corps réservoir métallique verre sombre ---
    g.appendChild(ns('rect', {
        x: x - W / 2, y: y - H / 2, width: W, height: H,
        rx: '8', fill: 'url(#grad-tank-chassis)',
        stroke: borderCol, 'stroke-width': borderW,
        filter: isDanger ? 'url(#scada-glow)' : ''
    }));

    // --- Lignes de graduation d'échelle discrètes (25%, 50%, 75%) ---
    [0.25, 0.5, 0.75].forEach((p) => {
        const gy = innerY + innerH - innerH * p;
        g.appendChild(ns('line', {
            x1: innerX + 2, y1: gy, x2: innerX + 8, y2: gy,
            stroke: 'rgba(255,255,255,0.25)', 'stroke-width': '0.9'
        }));
        g.appendChild(ns('line', {
            x1: innerX + 8, y1: gy, x2: innerX + innerW - 4, y2: gy,
            stroke: 'rgba(255,255,255,0.06)', 'stroke-width': '0.7', 'stroke-dasharray': '3 3'
        }));
    });

    // --- Repère seuil critique V_min (Ligne en pointillés orange/rouge) ---
    if (vmin > 0 && vmin < vmax) {
        g.appendChild(ns('line', {
            x1: innerX + 1, y1: vminY, x2: innerX + innerW - 1, y2: vminY,
            stroke: isDanger ? '#ef4444' : '#f59e0b',
            'stroke-width': '1.2', 'stroke-dasharray': '3 2',
            opacity: '0.85',
            'clip-path': `url(#${clipId})`
        }));
    }

    // --- Bloc eau rempli avec dégradé liquide dynamique ---
    if (fillH > 2) {
        const waterBlock = ns('rect', {
            x: innerX, y: waterTopY,
            width: innerW, height: fillH + 2,
            fill: `url(#${gradId})`,
            'clip-path': `url(#${clipId})`,
            opacity: '0.88'
        });
        waterBlock.style.transition = 'y 0.4s ease-out, height 0.4s ease-out';
        g.appendChild(waterBlock);

        // --- Vague SVG animée au niveau de surface d'eau ---
        const waveW = innerW;
        const waveAmp = Math.min(2.8, fillH * 0.12);
        const wx = innerX;
        const half = waveW / 2;
        const wavePath = ns('path', {
            d: `M${wx},${waterTopY} Q${wx + half / 2},${waterTopY - waveAmp} ${wx + half},${waterTopY} Q${wx + half * 1.5},${waterTopY + waveAmp} ${wx + waveW},${waterTopY} L${wx + waveW},${waterTopY + 5} L${wx},${waterTopY + 5} Z`,
            fill: isDanger ? 'rgba(254,202,202,0.45)' : (isWarn ? 'rgba(254,240,138,0.45)' : 'rgba(224,242,254,0.45)'),
            'clip-path': `url(#${clipId})`
        });
        if (fillRatio > 0.05) {
            wavePath.innerHTML = `<animate attributeName="d"
                dur="2.5s" repeatCount="indefinite"
                values="
                    M${wx},${waterTopY} Q${wx+half/2},${waterTopY-waveAmp} ${wx+half},${waterTopY} Q${wx+half*1.5},${waterTopY+waveAmp} ${wx+waveW},${waterTopY} L${wx+waveW},${waterTopY+5} L${wx},${waterTopY+5} Z;
                    M${wx},${waterTopY} Q${wx+half/2},${waterTopY+waveAmp} ${wx+half},${waterTopY} Q${wx+half*1.5},${waterTopY-waveAmp} ${wx+waveW},${waterTopY} L${wx+waveW},${waterTopY+5} L${wx},${waterTopY+5} Z;
                    M${wx},${waterTopY} Q${wx+half/2},${waterTopY-waveAmp} ${wx+half},${waterTopY} Q${wx+half*1.5},${waterTopY+waveAmp} ${wx+waveW},${waterTopY} L${wx+waveW},${waterTopY+5} L${wx},${waterTopY+5} Z"
            />`;
        }
        g.appendChild(wavePath);
    }

    // --- Reflet verre glossy translucide (Glassmorphism 3D) ---
    const glare = ns('polygon', {
        points: `${innerX},${innerY} ${innerX + innerW * 0.75},${innerY} ${innerX + innerW * 0.25},${innerY + innerH} ${innerX},${innerY + innerH}`,
        fill: 'url(#grad-glass-glare)',
        'clip-path': `url(#${clipId})`,
        opacity: '0.4'
    });
    g.appendChild(glare);

    // --- Badge Centre / Lecture du Niveau Fixe & Contrasté ---
    const pillW = isCentral ? 74 : 62;
    const pillH = 18;
    const pillX = x - pillW / 2;
    const pillY = y - pillH / 2;
    
    g.appendChild(ns('rect', {
        x: pillX, y: pillY, width: pillW, height: pillH, rx: '4',
        fill: 'rgba(5, 10, 24, 0.82)',
        stroke: borderCol, 'stroke-width': '0.9',
        opacity: '0.96'
    }));

    const pctEl = ns('text', {
        id: `pct-${id}`, x, y: y + 4,
        'text-anchor': 'middle',
        'font-size': isCentral ? 11.5 : 10,
        'font-family': 'JetBrains Mono,monospace', 'font-weight': '800',
        fill: '#ffffff'
    });
    pctEl.textContent = `${displayPct}%`;
    g.appendChild(pctEl);

    // --- Label Nom du Réservoir (En-tête au dessus) ---
    const lbl = ns('text', {
        x, y: y - H / 2 - 8,
        'text-anchor': 'middle',
        'font-size': isCentral ? 13 : 10.5,
        'font-family': 'Inter,sans-serif', 'font-weight': '800',
        fill: borderCol
    });
    lbl.textContent = n.label;
    g.appendChild(lbl);

    // --- Volume m³ & Limites (En dessous) ---
    const sub = ns('text', {
        x, y: y + H / 2 + 13,
        'text-anchor': 'middle', 'font-size': '8.5',
        'font-family': 'JetBrains Mono,monospace', 'font-weight': '700',
        fill: textColor
    });
    sub.textContent = `${Math.round(vcurr).toLocaleString()} m³`;
    g.appendChild(sub);

    // --- Indicateur d'état (Puce LED Haut-Droite) ---
    const ledCol = isDanger ? '#ef4444' : (isWarn ? '#f59e0b' : '#10b981');
    const led = ns('circle', {
        cx: x + W / 2 - 7, cy: y - H / 2 + 7, r: '3.5',
        fill: ledCol, stroke: 'rgba(255,255,255,0.4)', 'stroke-width': '0.8'
    });
    if (isDanger || !isWarn) led.classList.add('dot-pulse');
    g.appendChild(led);

    // --- Icône alerte si danger ---
    if (isDanger) {
        const aw = ns('text', {
            x: x + W / 2 - 8, y: y + 4,
            'text-anchor': 'middle', 'font-size': '11', fill: '#ef4444'
        });
        aw.textContent = '⚠';
        aw.classList.add('blink');
        g.appendChild(aw);
    }
}

// ── RENDU VANNE (MAUVE VIF EN OUVERTURE / MAUVE FONCÉ ÉLÉGANT FERMÉE) ──
function drawValve(g, id, n, active) {
    const { x, y } = n;
    // Couleurs MAUVE (Violet Vif Ouverte / Violet Foncé Fermée)
    const strokeCol = active ? '#c084fc' : '#9333ea';
    const bgFill    = active ? '#2e1065' : '#1e0836';
    const labelCol  = active ? '#e9d5ff' : '#c084fc';

    g.appendChild(ns('polygon', { points: `${x},${y-14} ${x+14},${y} ${x},${y+14} ${x-14},${y}`, fill: bgFill, stroke: strokeCol, 'stroke-width': '2.2' }));
    g.appendChild(ns('line', { x1: x-8, y1: y-6, x2: x, y2: y+6, stroke: strokeCol, 'stroke-width': '2', 'stroke-linecap': 'round' }));
    g.appendChild(ns('line', { x1: x+8, y1: y-6, x2: x, y2: y+6, stroke: strokeCol, 'stroke-width': '2', 'stroke-linecap': 'round' }));
    const lbl = ns('text', { x, y: y + 25, 'text-anchor': 'middle', 'font-size': '8.5', 'font-family': 'Inter,sans-serif', 'font-weight': '700', fill: labelCol });
    lbl.textContent = n.label;
    g.appendChild(lbl);
}

// ── RENDU ÉTAGE DEMANDE (AMBRE / OR FONCÉ) ───────────────────────
function drawDemand(g, id, n) {
    const { x, y } = n;
    const r = 23;
    const pts = Array.from({ length: 6 }, (_, i) => {
        const a = Math.PI / 3 * i - Math.PI / 6;
        return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`;
    }).join(' ');
    g.appendChild(ns('polygon', { points: pts, fill: '#241400', stroke: '#f59e0b', 'stroke-width': '2.2' }));
    // À l'intérieur de l'hexagone : le réservoir d'alimentation (ex: R6) — plus de "E5"
    const feeder = ETAGE_FEEDERS[n.label] || '';
    const inner = ns('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': '11', 'font-family': 'Inter,sans-serif', 'font-weight': '700', fill: '#fbbf24' });
    inner.textContent = feeder || n.label;
    g.appendChild(inner);
    // Sous l'hexagone : libellé explicite "Étage alimenté par R6" sur 2 lignes
    const l1 = ns('text', { x, y: y + 38, 'text-anchor': 'middle', 'font-size': '8.5', 'font-family': 'Inter,sans-serif', 'font-weight': '700', fill: '#fbbf24' });
    l1.textContent = 'Étage alimenté';
    g.appendChild(l1);
    const l2 = ns('text', { x, y: y + 49, 'text-anchor': 'middle', 'font-size': '8.5', 'font-family': 'Inter,sans-serif', 'font-weight': '800', fill: '#fcd34d' });
    l2.textContent = `par ${feeder || '?'}`;
    g.appendChild(l2);
    const sub = ns('text', { x, y: y + 61, 'text-anchor': 'middle', 'font-size': '7.5', 'font-family': 'Inter,sans-serif', fill: '#d97706' });
    sub.textContent = n.sublabel || '';
    g.appendChild(sub);
}

// ── RENDU SOURCE ──────────────────────────────────────────────────
function drawSource(g, id, n) {
    const { x, y } = n;
    g.appendChild(ns('circle', { cx: x, cy: y, r: '15', fill: '#0a1e2f', stroke: '#38bdf8', 'stroke-width': '2', 'stroke-dasharray': '5 3' }));
    const ico = ns('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': '12', fill: '#38bdf8' });
    ico.textContent = '≋';
    g.appendChild(ico);
    const lbl = ns('text', { x, y: y + 32, 'text-anchor': 'middle', 'font-size': '8', 'font-family': 'Inter,sans-serif', 'font-weight': '600', fill: '#7dd3fc' });
    lbl.textContent = n.label;
    const sub = ns('text', { x, y: y + 42, 'text-anchor': 'middle', 'font-size': '7', 'font-family': 'Inter,sans-serif', fill: '#0369a1' });
    sub.textContent = n.sublabel || '';
    g.appendChild(lbl); g.appendChild(sub);
}

// ── RENDU CONDUITE (COULEURS FONCÉES / VIVES NETTES : CYAN, MAUVE, AMBRE) ──
function drawPipe(g, pipe, schedule, hour = null) {
    const fn = NODES[pipe.from], tn = NODES[pipe.to];
    if (!fn || !tn) return;
    const fx = fn.x, fy = fn.y, tx = tn.x, ty = tn.y;
    const isDemand = pipe.type === 'demand';
    const isGrav   = pipe.type === 'gravity';
    const active   = isDemand ? true : isPumpOn(pipe.pumpId, schedule, hour);

    // Couleurs riches (Refoulement = Cyan, Gravitaire = Mauve, Demande = Ambre)
    const activeCol   = isDemand ? '#f59e0b' : (isGrav ? '#c084fc' : '#06b6d4');
    const inactiveCol = isGrav ? '#6b21a8' : '#0369a1'; // Mauve foncé / Bleu-Cyan foncé (Pas de gris fade)

    const sw = isDemand ? 2.2 : (isGrav ? 2.5 : 3.0);
    const marker = `url(#arrow-${isDemand ? 'd' : (isGrav ? 'g' : 'p')})`;

    let d;
    if (Math.abs(fx - tx) < 8)       d = `M${fx},${fy} L${tx},${ty}`;
    else if (Math.abs(fy - ty) < 8)  d = `M${fx},${fy} L${tx},${ty}`;
    else {
        const midY = fy + (ty - fy) * 0.55;
        d = `M${fx},${fy} L${fx},${midY} L${tx},${midY} L${tx},${ty}`;
    }

    const p = ns('path', {
        d, fill: 'none',
        stroke: active ? activeCol : inactiveCol,
        'stroke-width': sw,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-dasharray': active ? '10 5' : (isGrav ? '6 4' : '0'),
        opacity: active ? '1.0' : '0.65',
        'marker-end': marker
    });
    if (active && !isDemand) {
        p.classList.add(isGrav ? 'flow-grav' : 'flow-press');
    }
    g.appendChild(p);
}

// ── TOOLTIP ───────────────────────────────────────────────────────
function buildTTContent(nodeId, n, hour = 23) {
    const sc = _schedule, res = _results, sd = _systemData;
    const hLabel = `${String(hour).padStart(2, '0')}:00`;
    const idxTag = `<span style="font-size:0.62rem;color:#8e95b2;font-weight:700;">N°${nodeIndex(nodeId)}</span>`;
    if (n.type === 'reservoir' || n.type === 'station') {
        const cap = sd?.capacites?.[n.resId] || [0, 1000, 500];
        const [vmin, vmax, vinit] = cap;
        const vcurr = resVolume(n.resId, res, hour) ?? vinit;
        const isDanger = (vcurr <= 0) || (vcurr <= vmin) || (vcurr >= vmax);
        const pct = Math.max(0, Math.min(100, Math.round((vcurr - vmin) / Math.max(1, vmax - vmin) * 100)));
        const bw = Math.round(pct * 80 / 100);
        const bCol = isDanger ? '#ef4444' : '#10b981';
        return `<div class="tt-title">${idxTag} 🏗 ${n.label} <span style="font-size:0.75rem;color:#94a3b8">(${hLabel})</span></div>
            <div class="tt-row"><span class="tt-k">Volume (${hLabel})</span><span class="tt-v ${isDanger?'warn':'ok'}">${vcurr ? vcurr.toFixed(0) : '–'} m³</span></div>
            <div class="tt-row"><span class="tt-k">Statut Bilan</span><span class="tt-v ${isDanger?'warn':'ok'}">${isDanger ? '⚠ ALERTE / CRITIQUE (ROUGE)' : '✅ NOMINAL OK (VERT)'}</span></div>
            <div class="tt-row"><span class="tt-k">V initial (00h)</span><span class="tt-v">${vinit} m³</span></div>
            <div class="tt-row"><span class="tt-k">V min (Limite)</span><span class="tt-v warn">${vmin} m³</span></div>
            <div class="tt-row"><span class="tt-k">V max (Capacité)</span><span class="tt-v">${vmax} m³</span></div>
            <div class="tt-bar-lbl">Remplissage : <b>${pct}%</b></div>
            <div class="tt-bar"><div style="width:${bw}px;height:6px;border-radius:3px;background:${bCol}"></div></div>`;
    }
    if (n.type === 'well' || n.type === 'pump') {
        const pid = n.pumpId;
        const sched = sc?.[pid] || Array(24).fill(0);
        const isOnAtHour = (sched[hour] || 0) > 0;
        const hon = sched.filter(v => v > 0).length;
        const pdata = sd?.pompes?.[pid];
        const debit = pdata?.debit || 0, puiss = pdata?.puissance || 0;
        const tarif = sd?.tarifs?.[pdata?.tarif || 'TPH'] || Array(24).fill(0.29);
        let cost = 0, energy = 0;
        sched.forEach((v, t) => { if (v > 0) { energy += puiss; cost += puiss * (tarif[t] || 0.29); } });
        return `<div class="tt-title">${idxTag} ${n.type==='well'?'🔩 Forage':'⚙️ Pompe'} ${n.label} <span style="font-size:0.75rem;color:#94a3b8">(${hLabel})</span></div>
            <div class="tt-row"><span class="tt-k">État à ${hLabel}</span><span class="tt-v ${isOnAtHour?'ok':'warn'}">${isOnAtHour?'● MARCHE (VERT)':'● ARRÊT (ROUGE)'}</span></div>
            <div class="tt-row"><span class="tt-k">Débit nominal</span><span class="tt-v em">${debit} m³/h</span></div>
            <div class="tt-row"><span class="tt-k">Puissance</span><span class="tt-v">${puiss} kW</span></div>
            <div class="tt-row"><span class="tt-k">Total Heures/24h</span><span class="tt-v">${hon}h</span></div>
            <div class="tt-row"><span class="tt-k">Énergie (24h)</span><span class="tt-v">${energy.toFixed(1)} kWh</span></div>
            <div class="tt-row"><span class="tt-k">Coût (24h)</span><span class="tt-v warn">${cost.toFixed(2)} TND</span></div>`;
    }
    if (n.type === 'valve') {
        const sched = sc?.[n.pumpId] || Array(24).fill(1);
        const isOpenAtHour = (sched[hour] || 0) > 0;
        const vdata = sd?.vannes?.[n.pumpId];
        const hFlow = sd?.vannes_horaires?.[n.pumpId]?.[hour] ?? vdata?.debits_horaires?.[hour] ?? vdata?.debit_max ?? '–';
        return `<div class="tt-title">${idxTag} 🔧 ${n.label} <span style="font-size:0.75rem;color:#94a3b8">(${hLabel})</span></div>
            <div class="tt-row"><span class="tt-k">Type</span><span class="tt-v">Vanne Gravitaire</span></div>
            <div class="tt-row"><span class="tt-k">Débit horaire</span><span class="tt-v em">${isOpenAtHour ? hFlow + ' m³/h' : '0.0 m³/h (Fermée)'}</span></div>
            <div class="tt-row"><span class="tt-k">Capacité max Q_max</span><span class="tt-v">${vdata?.debit_max||'–'} m³/h</span></div>
            <div class="tt-row"><span class="tt-k">État à ${hLabel}</span><span class="tt-v ${isOpenAtHour?'ok':'warn'}">${isOpenAtHour?'● OUVERTE (MAUVE)':'● FERMÉE (MAUVE FONCÉ)'}</span></div>`;
    }
    if (n.type === 'demand') {
        const dem = sd?.demande?.[n.label] || Array(24).fill(0);
        const currDem = dem[hour] || 0;
        const tot = dem.reduce((a,b) => a+b, 0);
        const feeder = ETAGE_FEEDERS[n.label] || '—';
        return `<div class="tt-title">${idxTag} 🏘 Étage alimenté par <b style="color:#38bdf8">${feeder}</b> <span style="font-size:0.75rem;color:#94a3b8">(${hLabel})</span></div>
            <div class="tt-row"><span class="tt-k">Demande à ${hLabel}</span><span class="tt-v em">${currDem.toFixed(1)} m³/h</span></div>
            <div class="tt-row"><span class="tt-k">Total Journalier</span><span class="tt-v">${tot.toFixed(0)} m³/j</span></div>`;
    }
    return `<div class="tt-title">${n.label}</div>`;
}

function showTT(e, html) {
    if (!_tooltip) return;
    _tooltip.innerHTML = html;
    _tooltip.style.display = 'block';
    moveTT(e);
}
function moveTT(e) {
    if (!_tooltip || _tooltip.style.display === 'none') return;
    const wrap = _svg?.closest('.synoptic-svg-wrapper') || document.body;
    const rect = wrap.getBoundingClientRect();
    let l = e.clientX - rect.left + 12, t = e.clientY - rect.top - 12;
    if (l + 240 > rect.width)  l = l - 252;
    if (t + 200 > rect.height) t = t - 210;
    _tooltip.style.left = `${Math.max(0,l)}px`;
    _tooltip.style.top  = `${Math.max(0,t)}px`;
}
function hideTT() { if (_tooltip) _tooltip.style.display = 'none'; }

// ── PANNEAU CARACTÉRISTIQUES HORAIRES (CLIC SUR OUVRAGE) ──────────
function nodeIndex(nodeId) {
    const keys = Object.keys(NODES);
    return keys.indexOf(nodeId) + 1;
}

const TYPE_LABELS = {
    reservoir: 'Réservoir', station: 'Station de Relais', pump: 'Pompe de Refoulement',
    well: 'Forage', valve: 'Vanne Gravitaire', demand: 'Étage de Demande', source: 'Source', aquifer: 'Nappe'
};
const TYPE_ICONS = { reservoir: '🏗️', station: '🏭', pump: '⚙️', well: '🔩', valve: '🔧', demand: '🏘️', source: '💧', aquifer: '≋' };

function buildHourlyRows(nodeId, n) {
    const sc = _schedule || {}, sd = _systemData || {}, res = _results;
    const rows = [];
    for (let t = 0; t < 24; t++) {
        if (n.type === 'reservoir' || n.type === 'station') {
            const cap = sd.capacites?.[n.resId] || [0, 1000, 500];
            const [vmin, vmax] = cap;
            const vol = resVolume(n.resId, res, t) ?? cap[2];
            const alert = vol <= vmin || vol >= vmax;
            rows.push({ t, cls: alert ? 'alert' : 'ok', val: vol.toFixed(0), sub: 'm³', danger: alert });
        } else if (n.type === 'well' || n.type === 'pump') {
            const pid = n.pumpId;
            const on = (sc[pid]?.[t] || 0) > 0;
            const pdata = sd.pompes?.[pid];
            const debit = pdata?.debit || 0;
            const power = pdata?.puissance || 0;
            const tarif = sd.tarifs?.[pdata?.tarif || 'TPH'] || Array(24).fill(0.29);
            const cost = on ? power * (tarif[t] || 0.29) : 0;
            rows.push({ t, cls: on ? 'on' : 'off', val: on ? debit.toFixed(0) : '0', sub: on ? 'm³/h' : 'ARRÊT', cost });
        } else if (n.type === 'valve') {
            const pid = n.pumpId;
            const on = (sc[pid]?.[t] || 0) > 0;
            const vdata = sd.vannes?.[pid];
            const flow = on ? (vdata?.debit_max || 0) : 0;
            rows.push({ t, cls: on ? 'on' : 'off', val: on ? flow.toFixed(0) : '0', sub: on ? 'm³/h' : 'FERMÉE' });
        } else if (n.type === 'demand') {
            const dem = sd.demande?.[n.label] || Array(24).fill(0);
            rows.push({ t, cls: 'ok', val: (dem[t] || 0).toFixed(1), sub: 'm³/h' });
        } else if (n.type === 'source') {
            rows.push({ t, cls: 'ok', val: '—', sub: 'Source' });
        } else {
            rows.push({ t, cls: '', val: '—', sub: '' });
        }
    }
    return rows;
}
function buildDetailPanelHTML(nodeId) {
    const n = NODES[nodeId];
    if (!n) return '';
    const idx = nodeIndex(nodeId);
    const hour = _activeHour;
    const hLabel = `${String(hour).padStart(2, '0')}:00`;
    const typeLabel = TYPE_LABELS[n.type] || n.type;
    const icon = TYPE_ICONS[n.type] || '🔵';
    const displayName = n.type === 'demand'
        ? `Étage alimenté par ${ETAGE_FEEDERS[n.label] || '—'}`
        : n.label;

    const rows = buildHourlyRows(nodeId, n);
    const grid = rows.map(r => {
        const cur = r.t === hour ? ' cur' : '';
        return `<div class="hour-cell ${r.cls}${cur}" data-hc-hour="${r.t}" title="${String(r.t).padStart(2, '0')}:00 — ${r.val} ${r.sub}">
            <span class="hc-h">${String(r.t).padStart(2, '0')}</span>
            <span class="hc-v">${r.val}</span>
        </div>`;
    }).join('');

    const sd = _systemData || {}, sc = _schedule || {}, res = _results;
    let summaryRows = '', badges = '';

    if (n.type === 'reservoir' || n.type === 'station') {
        const cap = sd.capacites?.[n.resId] || [0, 1000, 500];
        const [vmin, vmax, vinit] = cap;
        const vcur = resVolume(n.resId, res, hour) ?? vinit;
        const pct = Math.max(0, Math.min(100, Math.round((vcur - vmin) / Math.max(1, vmax - vmin) * 100)));
        const danger = vcur <= vmin || vcur >= vmax;
        const vols = rows.map(r => parseFloat(r.val) || 0);
        const vMin = Math.min(...vols), vMax = Math.max(...vols);
        summaryRows = `
            <tr><td>V initial (00h)</td><td>${vinit} m³</td></tr>
            <tr><td>Vmin / Vmax</td><td>${vmin} m³ / ${vmax} m³</td></tr>
            <tr><td>Volume ${hLabel}</td><td class="${danger ? 'bad' : 'good'}">${vcur.toFixed(0)} m³ (${pct}%)</td></tr>
            <tr><td>Min / Max 24h</td><td>${vMin.toFixed(0)} / ${vMax.toFixed(0)} m³</td></tr>`;
        badges = `
            <span class="syn-badge ${danger ? 'b-rose' : 'b-emerald'}">${danger ? '⚠ ALERTE SEUIL' : '✅ NIVEAU NOMINAL'}</span>
            <span class="syn-badge b-cyan">Remplissage ${pct}%</span>`;
    } else if (n.type === 'well' || n.type === 'pump') {
        const pid = n.pumpId;
        const sched = sc[pid] || Array(24).fill(0);
        const hon = sched.filter(v => v > 0).length;
        const pdata = sd.pompes?.[pid];
        const debit = pdata?.debit || 0, puiss = pdata?.puissance || 0;
        const tarif = sd.tarifs?.[pdata?.tarif || 'TPH'] || Array(24).fill(0.29);
        let energy = 0, cost = 0;
        sched.forEach((v, t) => { if (v > 0) { energy += puiss; cost += puiss * (tarif[t] || 0.29); } });
        const isOnNow = (sched[hour] || 0) > 0;
        summaryRows = `
            <tr><td>Débit nominal</td><td>${debit} m³/h</td></tr>
            <tr><td>Puissance</td><td>${puiss} kW</td></tr>
            <tr><td>Heures MARCHE / 24h</td><td>${hon} h</td></tr>
            <tr><td>Énergie 24h</td><td>${energy.toFixed(1)} kWh</td></tr>
            <tr><td>Coût 24h</td><td class="bad">${cost.toFixed(2)} TND</td></tr>`;
        badges = `
            <span class="syn-badge ${isOnNow ? 'b-cyan' : 'b-rose'}">${isOnNow ? '● MARCHE' : '● ARRÊT'} à ${hLabel}</span>
            <span class="syn-badge b-amber">${hon} h ON / 24h</span>`;
    } else if (n.type === 'valve') {
        const pid = n.pumpId;
        const sched = sc[pid] || Array(24).fill(0);
        const isOpen = (sched[hour] || 0) > 0;
        const vdata = sd.vannes?.[pid];
        summaryRows = `
            <tr><td>Type</td><td>Vanne Gravitaire</td></tr>
            <tr><td>Débit max</td><td>${vdata?.debit_max || '–'} m³/h</td></tr>
            <tr><td>Heures OUVERTE / 24h</td><td>${sched.filter(v => v > 0).length} h</td></tr>`;
        badges = `<span class="syn-badge ${isOpen ? 'b-cyan' : 'b-rose'}">${isOpen ? '● OUVERTE' : '● FERMÉE'} à ${hLabel}</span>`;
    } else if (n.type === 'demand') {
        const dem = sd.demande?.[n.label] || Array(24).fill(0);
        const tot = dem.reduce((a, b) => a + b, 0);
        const cur = dem[hour] || 0;
        const feeder = ETAGE_FEEDERS[n.label] || '—';
        summaryRows = `
            <tr><td>Réservoir d'alimentation</td><td class="good">🏗️ ${feeder}</td></tr>
            <tr><td>Demande à ${hLabel}</td><td class="good">${cur.toFixed(1)} m³/h</td></tr>
            <tr><td>Total journalier</td><td>${tot.toFixed(0)} m³/j</td></tr>`;
        badges = `<span class="syn-badge b-amber">Consommation ${cur.toFixed(1)} m³/h</span>
            <span class="syn-badge b-cyan">Alimenté par ${feeder}</span>`;
    }

    return `
        <div class="syn-detail-header">
            <div>
                <div class="syn-detail-title">${icon} ${displayName} <span style="font-size:0.62rem;color:#8e95b2;font-weight:600;">N°${idx} · ${typeLabel}</span></div>
                <div class="syn-detail-sub">${n.sublabel || ''} · ID ${nodeId}</div>
            </div>
            <button class="syn-detail-close" id="syn-detail-close" title="Fermer">✕ Fermer</button>
        </div>
        <div class="syn-detail-badges">${badges}</div>
        <div class="hour-grid">${grid}</div>
        <table class="syn-detail-table">
            <thead><tr><th>Paramètre</th><th>Valeur</th></tr></thead>
            <tbody>${summaryRows}</tbody>
        </table>
        <div class="syn-detail-note">💡 Cliquez sur une case horaire pour naviguer à cette heure · Contour magenta = heure courante</div>
        <div class="syn-detail-footer">
            <button class="syn-btn-img" id="syn-detail-export">📥 Exporter PNG</button>
        </div>`;
}



function bindDetailPanelEvents() {
    _detailPanel?.querySelector('#syn-detail-close')?.addEventListener('click', closeDetailPanel);
    _detailPanel?.querySelector('#syn-detail-export')?.addEventListener('click', () => exportDetailPanelAsImage());
    _detailPanel?.querySelectorAll('.hour-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            const h = parseInt(cell.dataset.hcHour, 10);
            if (!isNaN(h)) window.dispatchEvent(new CustomEvent('synoptic-seek', { detail: { hour: h } }));
        });
    });
}

function openDetailPanel(nodeId) {
    const wrap = _svg?.closest('.synoptic-svg-wrapper');
    if (!wrap) return;
    _selectedNodeId = nodeId;
    if (!_detailPanel) {
        _detailPanel = document.createElement('div');
        _detailPanel.className = 'syn-detail-panel';
        wrap.appendChild(_detailPanel);
    }
    _detailPanel.innerHTML = buildDetailPanelHTML(nodeId);
    _detailPanel.style.display = 'block';
    bindDetailPanelEvents();
}

function refreshDetailPanel() {
    if (!_selectedNodeId || !_detailPanel) return;
    const n = NODES[_selectedNodeId];
    if (!n) return;
    _detailPanel.innerHTML = buildDetailPanelHTML(_selectedNodeId);
    bindDetailPanelEvents();
}

function closeDetailPanel() {
    _selectedNodeId = null;
    if (_detailPanel) _detailPanel.style.display = 'none';
    document.querySelectorAll('.scada-node.selected').forEach(x => x.classList.remove('selected'));
}

// ── EXPORT PNG COLORÉ DU TABLEAU HORAIRE ─────────────────────────
function exportDetailPanelAsImage() {
    if (!_selectedNodeId || !_detailPanel) return;
    const n = NODES[_selectedNodeId];
    const idx = nodeIndex(_selectedNodeId);
    const rows = buildHourlyRows(_selectedNodeId, n);
    const W = 900, H = 480, S = 2;
    const canvas = document.createElement('canvas');
    canvas.width = W * S; canvas.height = H * S;
    const ctx = canvas.getContext('2d');
    ctx.scale(S, S);

    // Fond
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#151631'); g.addColorStop(1, '#0c0d26');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Bandeau titre
    const hg = ctx.createLinearGradient(0, 0, W, 0);
    hg.addColorStop(0, '#7c3aed'); hg.addColorStop(1, '#ec4899');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 66);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Inter", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${TYPE_ICONS[n.type] || ''} ${n.label} — Caractéristiques Horaires (24h)`, 20, 26);
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ddd6fe';
    ctx.fillText(`N°${idx} · ${TYPE_LABELS[n.type] || n.type} · ID ${_selectedNodeId} · Heure courante ${String(_activeHour).padStart(2, '0')}:00`, 20, 48);

    // Grille 24 cases
    const cw = 64, ch = 46, gap = 5;
    const startX = 20, startY = 84;
    const colors = { on: ['#0e7490', '#a5f3fc'], off: ['#5f1f1f', '#fca5a5'], ok: ['#065f46', '#6ee7b7'], alert: ['#7f1d1d', '#fca5a5'], '': ['#27272a', '#a1a1aa'] };
    rows.forEach((r, i) => {
        const col = i % 12, row = Math.floor(i / 12);
        const x = startX + col * (cw + gap), y = startY + row * (ch + gap);
        const [bg, fg] = colors[r.cls] || colors[''];
        ctx.fillStyle = bg; ctx.strokeStyle = fg;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(x, y, cw, ch, 7);
        ctx.fill(); ctx.stroke();
        if (r.t === _activeHour) {
            ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 2.6;
            ctx.beginPath(); ctx.roundRect(x - 2, y - 2, cw + 4, ch + 4, 9); ctx.stroke();
        }
        ctx.fillStyle = '#64748b';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${String(r.t).padStart(2, '0')}h`, x + cw / 2, y + 14);
        ctx.fillStyle = fg;
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.fillText(r.val, x + cw / 2, y + 33);
    });
    ctx.textAlign = 'left';

    // Légende
    let ly = startY + 2 * (ch + gap) + 16;
    ctx.font = '11px Inter, sans-serif';
    const legend = [
        ['#0e7490', 'MARCHE / OUVERTE'], ['#5f1f1f', 'ARRÊT / FERMÉE'],
        ['#065f46', 'NIVEAU OK'], ['#7f1d1d', 'ALERTE SEUIL']
    ];
    let lx = startX;
    legend.forEach(([c, label]) => {
        ctx.fillStyle = c; ctx.fillRect(lx, ly, 14, 14);
        ctx.fillStyle = '#cbd5e1'; ctx.fillText(label, lx + 20, ly + 11);
        lx += 30 + ctx.measureText(label).width + 22;
    });

    // Résumé
    ly += 34;
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText('RÉSUMÉ (24h)', startX, ly);
    ly += 22;
    const summary = buildDetailPanelHTML(_selectedNodeId);
    const tds = [];
    const tmp = document.createElement('div');
    tmp.innerHTML = summary;
    tmp.querySelectorAll('.syn-detail-table tbody tr').forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length >= 2) tds.push([cells[0].textContent.trim(), cells[1].textContent.trim()]);
    });
    ctx.font = '12px "JetBrains Mono", monospace';
    tds.forEach((pair, i) => {
        const col = i % 2, r2 = Math.floor(i / 2);
        const x = startX + col * 430, y = ly + r2 * 22;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(pair[0], x, y);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(pair[1], x + 210, y);
    });

    const a = document.createElement('a');
    a.download = `AquaData_${n.label.replace(/[^\w\d_-]/g, '_')}_horaire.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
}


// ── RENDER ALL NODES + PIPES ──────────────────────────────────────
function renderAll(lpipes, lnodes, schedule, results, hour = 23) {
    lpipes.innerHTML = '';
    lnodes.innerHTML = '';
    _activeHour = hour;

    // Fond quadrillé SCADA
    const grid = ns('g', { opacity: '0.08' });
    for (let gx = 0; gx < SVG_W; gx += 80) {
        grid.appendChild(ns('line', { x1: gx, y1: 0, x2: gx, y2: SVG_H, stroke: '#94a3b8', 'stroke-width': '0.5' }));
    }
    for (let gy = 0; gy < SVG_H; gy += 80) {
        grid.appendChild(ns('line', { x1: 0, y1: gy, x2: SVG_W, y2: gy, stroke: '#94a3b8', 'stroke-width': '0.5' }));
    }
    lpipes.appendChild(grid);

    // Conduites
    PIPES.forEach(pipe => {
        const g = ns('g', { class: 'scada-pipe' });
        drawPipe(g, pipe, schedule, hour);
        lpipes.appendChild(g);
    });

    // Nœuds
    Object.entries(NODES).forEach(([id, node]) => {
        const g = ns('g', { class: `scada-node node-${node.type}`, 'data-nid': id, style: 'cursor:pointer' });
        const active = isPumpOn(node.pumpId, schedule, hour);
        switch (node.type) {
            case 'aquifer':    drawAquifer(g, node); break;
            case 'well':       drawWell(g, id, node, active); break;
            case 'pump':       drawPump(g, id, node, active); break;
            case 'reservoir':  drawReservoir(g, id, node, results, hour); break;
            case 'station':    drawReservoir(g, id, node, results, hour); break;
            case 'valve':      drawValve(g, id, node, active); break;
            case 'demand':     drawDemand(g, id, node); break;
            case 'source':     drawSource(g, id, node); break;
        }
        lnodes.appendChild(g);
    });

    // Garder le panneau de caractéristiques synchronisé avec l'heure d'animation
    refreshDetailPanel();
}

// ── INTERACTIONS NŒUDS ───────────────────────────────────────────
function bindNodes(lnodes) {
    lnodes.addEventListener('mouseover', e => {
        const el = e.target.closest('[data-nid]');
        if (!el) { hideTT(); return; }
        const nid = el.dataset.nid, n = NODES[nid];
        if (!n || n.type === 'aquifer') { hideTT(); return; }
        showTT(e, buildTTContent(nid, n, _activeHour));
    });
    lnodes.addEventListener('mousemove', e => moveTT(e));
    lnodes.addEventListener('mouseleave', () => hideTT());
    lnodes.addEventListener('click', e => {
        const el = e.target.closest('[data-nid]');
        if (!el) return;
        document.querySelectorAll('.scada-node.selected').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        const nid = el.dataset.nid;
        const n = NODES[nid];
        if (!n || n.type === 'aquifer') { closeDetailPanel(); return; }
        openDetailPanel(nid);
    });
}

// ── ZOOM / PAN ────────────────────────────────────────────────────
function setupZP(svg) {
    // Zoom par double-clic sur le schéma / élément (évite que le scroll de la molette n'intercepte la page)
    svg.addEventListener('dblclick', e => {
        e.preventDefault();
        const rect = svg.getBoundingClientRect();
        const svgX = _viewBox.x + (e.clientX - rect.left) / rect.width  * _viewBox.w;
        const svgY = _viewBox.y + (e.clientY - rect.top)  / rect.height * _viewBox.h;
        
        if (e.shiftKey) {
            // Shift + Double Clic = Réinitialiser la vue
            _viewBox = { x: 0, y: 0, w: SVG_W, h: SVG_H };
        } else {
            // Double Clic = Zoom avant de 50% centré sur le point cliqué
            const nw = Math.max(380, _viewBox.w * 0.55);
            const nh = nw * (SVG_H / SVG_W);
            _viewBox.x = Math.max(0, Math.min(SVG_W - nw, svgX - (e.clientX - rect.left) / rect.width  * nw));
            _viewBox.y = Math.max(0, Math.min(SVG_H - nh, svgY - (e.clientY - rect.top)  / rect.height * nh));
            _viewBox.w = nw;
            _viewBox.h = nh;
        }
        applyVB();
    });

    // Déplacement panoramique (Pan par glisser-déplacer)
    svg.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        _pan = { active: true, startX: e.clientX, startY: e.clientY, origVB: { ..._viewBox } };
        svg.style.cursor = 'grabbing';
        svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', e => {
        if (!_pan.active) return;
        const rect = svg.getBoundingClientRect();
        const sx = _viewBox.w / rect.width, sy = _viewBox.h / rect.height;
        _viewBox.x = _pan.origVB.x - (e.clientX - _pan.startX) * sx;
        _viewBox.y = _pan.origVB.y - (e.clientY - _pan.startY) * sy;
        applyVB();
    });
    svg.addEventListener('pointerup', () => { _pan.active = false; svg.style.cursor = 'grab'; });
}

// ── API PUBLIQUE ──────────────────────────────────────────────────
export function initSynoptic(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    _viewBox = { x: 0, y: 0, w: SVG_W, h: SVG_H };

    const wrap = document.createElement('div');
    wrap.className = 'synoptic-svg-wrapper';

    // Toolbar complète directement intégrée dans le schéma synoptique
    const tb = document.createElement('div');
    tb.className = 'synoptic-toolbar';
    tb.innerHTML = `
        <div class="syn-tb-left">
            <button class="syn-btn" id="syn-zi" title="Zoom In (ou Double-Clic)">⊕ Zoom +</button>
            <button class="syn-btn" id="syn-zr" title="Réinitialiser vue (ou Shift+Double-Clic)">⊙ Reset</button>
            <button class="syn-btn" id="syn-zo" title="Zoom Out">⊖ Zoom −</button>
            <div class="syn-mode-box" style="display:inline-flex;gap:4px;margin-left:6px;">
                <button class="syn-btn syn-mbtn active" id="syn-m24" title="Mode 24 Heures">⚡ 24h Global</button>
                <button class="syn-btn syn-mbtn" id="syn-mstep" title="Mode Pas à Pas">⏱️ Pas à Pas</button>
            </div>
            <div class="syn-player-box" id="syn-pbox" style="display:none;align-items:center;gap:6px;margin-left:6px;">
                <button class="syn-btn btn-play" id="syn-play" title="Jouer / Pause">▶ Jouer</button>
                <button class="syn-btn" id="syn-prev" title="-1h">⏮</button>
                <button class="syn-btn" id="syn-next" title="+1h">⏭</button>
                <span class="syn-hbadge" id="syn-hbadge">23:00</span>
                <input type="range" id="syn-tslider" min="0" max="23" value="23" step="1" style="width:110px;accent-color:#06b6d4;cursor:pointer;">
            </div>
        </div>
        <div class="syn-legend">
            <span style="color:#38bdf8;font-weight:600;">🔍 Double-Clic : Zoom</span>
            <span style="color:#06b6d4">━</span><span>Refoulement</span>
            <span style="color:#c084fc">━</span><span>Gravitaire</span>
            <span style="color:#f59e0b">━</span><span>Distribution</span>
            <span style="color:#10b981">■</span><span>VERT (OK)</span>
            <span style="color:#ef4444">■</span><span>ROUGE (Alerte)</span>
            <span style="color:#f59e0b">🏘</span><span class="syn-legend-etages" title="Alimentation des étages">Étage alimenté par R1 · par R2 · par R3 · par R5 · par R6 · par R7 · par R10</span>
        </div>`;

    _tooltip = document.createElement('div');
    _tooltip.className = 'synoptic-tooltip';
    _tooltip.style.display = 'none';

    _svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    _svg.setAttribute('id', 'scada-synoptic-svg');
    _svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    _svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    _svg.style.cssText = 'width:100%;height:100%;cursor:grab;display:block;';

    _svg.appendChild(buildDefs());
    const lp = ns('g', { id: 'lpipes' });
    const ln = ns('g', { id: 'lnodes' });
    _svg.appendChild(lp); _svg.appendChild(ln);

    renderAll(lp, ln, null, null, 23);
    bindNodes(ln);
    setupZP(_svg);

    wrap.appendChild(tb);
    wrap.appendChild(_svg);
    wrap.appendChild(_tooltip);
    container.innerHTML = '';
    container.appendChild(wrap);

    // Événements Toolbar Zoom
    document.getElementById('syn-zi')?.addEventListener('click', () => {
        const cx = _viewBox.x + _viewBox.w/2, cy = _viewBox.y + _viewBox.h/2;
        const nw = Math.max(350, _viewBox.w * 0.75), nh = nw * SVG_H/SVG_W;
        _viewBox = { x: cx - nw/2, y: cy - nh/2, w: nw, h: nh }; applyVB();
    });
    document.getElementById('syn-zo')?.addEventListener('click', () => {
        const cx = _viewBox.x + _viewBox.w/2, cy = _viewBox.y + _viewBox.h/2;
        const nw = Math.min(SVG_W * 2.2, _viewBox.w * 1.35), nh = nw * SVG_H/SVG_W;
        _viewBox = { x: cx - nw/2, y: cy - nh/2, w: nw, h: nh }; applyVB();
    });
    document.getElementById('syn-zr')?.addEventListener('click', () => {
        _viewBox = { x: 0, y: 0, w: SVG_W, h: SVG_H }; applyVB();
    });
}

let _customLabels = {};

export function setSynopticCustomLabels(labelsMap) {
    _customLabels = labelsMap || {};
    // Update labels in memory
    for (const [key, label] of Object.entries(_customLabels)) {
        if (NODES[key]) {
            NODES[key].label = label;
        } else {
            for (const n of Object.values(NODES)) {
                if (n.pumpId === key || n.resId === key) {
                    n.label = label;
                }
            }
        }
    }
}

export function updateSynoptic(schedule, results, systemData, hour = 23, customLabels = null) {
    if (customLabels) setSynopticCustomLabels(customLabels);
    _schedule = schedule; _results = results; _systemData = systemData;
    const svg = document.getElementById('scada-synoptic-svg');
    if (!svg) return;
    _svg = svg;
    const lp = svg.querySelector('#lpipes'), ln = svg.querySelector('#lnodes');
    if (!lp || !ln) return;
    renderAll(lp, ln, schedule, results, hour);
    bindNodes(ln);
}

// ── MINI SYNOPTIQUE (Dashboard) ───────────────────────────────────
export function initMiniSynoptic(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const wrap = document.createElement('div');
    wrap.className = 'mini-synoptic-wrapper';

    _miniSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    _miniSvg.setAttribute('id', 'mini-scada-svg');
    _miniSvg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    _miniSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    _miniSvg.style.cssText = 'width:100%;height:100%;display:block;cursor:default;';

    _miniSvg.appendChild(buildDefs());
    const lp = ns('g', { id: 'mini-lpipes' });
    const ln = ns('g', { id: 'mini-lnodes' });
    _miniSvg.appendChild(lp); _miniSvg.appendChild(ln);

    renderAll(lp, ln, null, null, 23);

    wrap.appendChild(_miniSvg);
    container.innerHTML = '';
    container.appendChild(wrap);
}

export function updateMiniSynoptic(schedule, results, systemData, hour = 23, customLabels = null) {
    if (customLabels) setSynopticCustomLabels(customLabels);
    _schedule = schedule; _results = results; _systemData = systemData;
    const svg = document.getElementById('mini-scada-svg');
    if (!svg) return;
    const lp = svg.querySelector('#mini-lpipes'), ln = svg.querySelector('#mini-lnodes');
    if (!lp || !ln) return;
    renderAll(lp, ln, schedule, results, hour);
}

