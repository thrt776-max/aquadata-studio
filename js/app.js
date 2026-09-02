import {
    POMPES,
    VANNES_GRAVITAIRES,
    DEFAULT_VANNES_HORAIRES,
    CAPACITES,
    DEMANDE_HORAIRE,
    TARIFS,
    DEMANDE_MOYENNE,
        COEFS,
    ETAGE_FEEDERS,
    etageLabel
} from './schema.js';
import { runSimulation } from './simulation.js';
import { generateValidSchedule, runFullOptimizationPipeline } from './optimizer.js';
import { EpanetSynopticViewer } from './synoptic-epanet.js';
import { GisMapViewer } from './gis-map.js';
import { ScenarioCompareViewer } from './scenario-compare.js';

// Liste des paires [Étage, Réservoir d'alimentation] pour les libellés dynamiques
const ETAGE_FEEDERS_LIST = Object.entries(ETAGE_FEEDERS);
import {
    renderReservoirVolumeCharts,
    renderHydraulicFlowChart,
    renderEnergyPowerChart,
    renderCostBreakdownChart,
    renderSpecificEnergyChart,
    renderRadarPerformanceChart,
    renderTarifRepartitionChart,
    renderCumulativeCostVolumeChart,
    renderParetoChart,
    renderProBoxStatsChart,
    renderProCostGradientChart,
    renderProDecisionMatrixChart,
    renderEtageSupplyPolarChart,
    renderEtageDemandStackedChart,
    renderEtageFeederDonutChart,
    renderEtageRankingBarChart,
    resizeAllActiveCharts
} from './charts.js';
import { buildExplainerDiagram } from './explainer.js';
import { connectCharts } from './charts-connect.js';
import { DataGrid } from './table.js';
import {
    initSynoptic,
    updateSynoptic,
    initMiniSynoptic,
    updateMiniSynoptic,
    setSynopticCustomLabels
} from './synoptic.js';
import { initCinematicIntro } from './cinematic_intro.js';
import AppState from './state.js';
import { enhanceUI } from './ui-utils.js';
import './reservoir-editor.js';
import './equipment-editor.js';
import './alerts.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Intro Splash Screen Controller (Immediate & Resilient) ---
    const introOverlay = document.getElementById('intro-splash-overlay');
    const btnEnterDash = document.getElementById('btn-enter-dashboard');
    const btnOpenDeckIntro = document.getElementById('btn-open-deck-intro');
    const btnReopenIntro = document.getElementById('sidebar-logo-reopen-intro');
    const countdownEl = document.getElementById('intro-countdown-sec');

    let countdownSec = 22;
    let countdownInterval = null;

    function closeIntroSplash() {
        if (countdownInterval) clearInterval(countdownInterval);
        if (introOverlay) {
            introOverlay.classList.add('fade-out');
            setTimeout(() => {
                introOverlay.style.display = 'none';
            }, 400);
        }
    }

    if (introOverlay && countdownEl) {
        countdownInterval = setInterval(() => {
            countdownSec--;
            if (countdownSec > 0) {
                countdownEl.textContent = `Ouverture automatique dans ${countdownSec}s...`;
            } else {
                closeIntroSplash();
            }
        }, 1000);
        // Safety net: force close splash after the cinematic intro (~23.5s max)
        setTimeout(() => { if (introOverlay) closeIntroSplash(); }, 23500);
    }

    btnEnterDash?.addEventListener('click', closeIntroSplash);
    btnOpenDeckIntro?.addEventListener('click', () => {
        closeIntroSplash();
        const canvaModal = document.getElementById('canva-presentation-modal');
        if (canvaModal) canvaModal.style.display = 'flex';
    });
    btnReopenIntro?.addEventListener('click', () => {
        if (introOverlay) {
            introOverlay.style.display = 'flex';
            introOverlay.classList.remove('fade-out');
            try { if (_introCtl) _introCtl.restart(); } catch (e) {}
        }
    });

    // Intro cinématique plein écran (canvas) — destroy() à l'entrée, restart() à la réouverture
    let _introCtl = null;
    try { _introCtl = initCinematicIntro(); } catch (e) { console.warn('initCinematicIntro failed', e); }
    btnEnterDash?.addEventListener('click', () => { try { if (_introCtl) _introCtl.destroy(); } catch (e) {} });

    // Enhance UI (table responsive wrappers, inline edit helpers)
    try { enhanceUI(); } catch (e) { console.warn('enhanceUI failed', e); }
    // Wire central AppState to charts
    try { connectCharts(AppState); } catch (e) { console.warn('connectCharts failed', e); }

    // --- Core Selectors ---
    const systemDataForms = document.getElementById('system-data-forms');
    const demandCoefsContainer = document.getElementById('demand-coefs-editor-container');
    const synopticInteractiveGrid = document.getElementById('synoptic-network-interactive-grid');
    const scheduleGridContainer = document.getElementById('schedule-grid-container');
    const btnRunSim = document.getElementById('btn-run-sim');
    const btnAutoOptimize = document.getElementById('btn-auto-optimize');
    const btnExportCsv = document.getElementById('btn-export-csv');
    const btnApplyDemands = document.getElementById('btn-apply-demands');
    
    // Presets
    const presetNight = document.getElementById('preset-night');
    const presetBalanced = document.getElementById('preset-balanced');
    const presetReset = document.getElementById('preset-reset');

    // Loading Modal & Toast
    const loadingModal = document.getElementById('loading-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const toastContainer = document.getElementById('toast-container');

    // DataGrid Instance (Excel Tableur)
    let dataGridInstance = null;
    try {
        dataGridInstance = new DataGrid('excel-table', 'formulaInput');
        const seedRows = [
            ['Station / Equipement', 'Puissance (kW)', 'Débit (m³/h)', 'HMT (mCE)', 'Coût Estimé (TND)'],
            ['Forages R500 (F1→F12)', 350.1, 786.6, '=HMT(5; 786.6)', '=B2*0.222*12'],
            ['Relais R500->R6', 258.0, 1051.2, '=HMT(8; 1051.2)', '=B3*0.290*8'],
            ['Relais R6->R1', 287.4, 756.0, '=HMT(7; 756.0)', '=B4*0.377*6'],
            ['Total Station', '=SOMME(B2:B4)', '=SOMME(C2:C4)', '=MOYENNE(D2:D4)', '=SOMME(E2:E4)']
        ];
        dataGridInstance.setData(seedRows);
    } catch(e) {
        console.warn("DataGrid init notice:", e);
    }

    // Dynamic State for Demands & Coefficients
    let currentDemandeMoyenne = { ...DEMANDE_MOYENNE };
    let currentCoefs = JSON.parse(JSON.stringify(COEFS));

    // Location tags state
    let locationTags = {};
    try {
        locationTags = JSON.parse(localStorage.getItem('scada_location_tags') || '{}');
    } catch(e) {
        locationTags = {};
    }

    // Custom Equipment Labels / Aliases
    let customLabels = {};
    try {
        customLabels = JSON.parse(localStorage.getItem('scada_custom_labels') || '{}');
    } catch(e) {
        customLabels = {};
    }

    // Default Labels Catalog
    const DEFAULT_LABELS_CATALOG = {
        reservoirs: {
                        "R500": "R500 – Réservoir principal de captation",
            "R6": "R6 – Réservoir pivot central 5 000 m³ (zone alimentée par R6)",
            "R5": "R5 – Réservoir de distribution 1 500 m³ (zone alimentée par R5)",
            "R1": "R1 – Nœud hydraulique principal (zones alimentées par R1)",
            "R2": "R2 – Réservoir ouest (zone alimentée par R2)",
            "R3": "R3 – Réservoir est (zone alimentée par R3, relais vers R10)",
            "R7": "R7 – Réservoir haute zone (zone alimentée par R7)",
            "R10": "R10 – Réservoir terminal (zone alimentée par R10)",
            "ST_Ain_Bidha": "Station Ain Bidha",
            "ST_Zaafrane": "Station de reprise Zaafrane",
            "ST_Birchagroun": "Station de reprise Bir Chagroun",
            "ST_SK10_Relais": "Réservoir SK10 – relais"
        },
        pumps: {
            "F1_R500": "SBA6", "F2_R500": "SBA6A", "F3_R500": "SBA7",
            "F4_R500": "SBA7A", "F5_R500": "SBA8", "F6_R500": "SBA10BIS",
            "F7_R500": "SBA10TER", "F8_R500": "SBA12", "F9_R500": "BOURWEG1",
            "F10_R500": "BOURWEG2BIS", "F11_R500": "BOURWEG3", "F12_R500": "ZWARINE2BIS",
            "R500_to_R6_P1": "Station de pompage Abida G1", "R500_to_R6_P2": "Station de pompage Abida G2",
            "R6_to_R1_P1": "Bache G1", "R6_to_R1_P2": "Bache G2",
            "R1_to_R2_P1": "Ras El Ain (R1 vers R2) G1", "R1_to_R2_P2": "Ras El Ain (R1 vers R2) G2",
            "R1_to_R3_P1": "Ras El Ain (R1 vers R3) G1", "R1_to_R3_P2": "Ras El Ain (R1 vers R3) G2",
            "Forage_Ain_Bidha_Pmp": "Forage Ain Bidha", "Source_Ain_Bidha_Pmp": "Source Ain Bidha",
            "Ain_Bidha_to_Zaaf_P1": "Station de pompage Ain Bidha G1", "Ain_Bidha_to_Zaaf_P2": "Station de pompage Ain Bidha G2",
            "Zaaf_to_Birchag_P1": "Station de reprise Zaafrane", "Birchagroun_to_R6": "Station de reprise Bir Chagroun",
            "Forage1_SK10": "SK4", "Forage2_SK10": "SK5", "Forage3_SK10": "SK8",
            "SK10_to_R6_P1": "SK10 relais"
        },
                demands: {
            "E1": etageLabel("E1", "Étage alimenté par R1"),
            "E2": etageLabel("E2", "Étage alimenté par R2"),
            "E3": etageLabel("E3", "Étage alimenté par R3"),
            "E4": etageLabel("E4", "Étage alimenté par R5"),
            "E5": etageLabel("E5", "Étage alimenté par R6"),
            "E6": etageLabel("E6", "Étage alimenté par R7"),
            "E7": etageLabel("E7", "Étage alimenté par R10")
        },
        valves: {
            "R6_vers_R5": "Vanne R6→R5",
            "R1_vers_R7": "Vanne R1→R7",
            "R3_vers_R10": "Vanne R3→R10",
            "Source_Romaine_vers_R1": "Source Romaine→R1"
        }
    };

    function getLabel(id, defaultVal = null) {
        if (customLabels && customLabels[id] && customLabels[id].trim() !== '') {
            return customLabels[id].trim();
        }
        const flatCatalog = Object.values(DEFAULT_LABELS_CATALOG || {}).reduce((acc, group) => ({ ...acc, ...group }), {});
        if (flatCatalog[id] && flatCatalog[id].trim() !== '') {
            return flatCatalog[id].trim();
        }
        return defaultVal || id;
    }

    // --- Dynamic Tariff Windows Integration Engine ---
    function parseTimeToMinutes(timeVal) {
        if (timeVal === null || timeVal === undefined || timeVal === '') return 0;
        let str = String(timeVal).trim().toLowerCase().replace(/\s+/g, '');
        if (!str) return 0;
        str = str.replace(/h$/, '');
        if (str.includes(':')) {
            const parts = str.split(':');
            const h = parseFloat(parts[0]) || 0;
            const m = parseFloat(parts[1]) || 0;
            return (h * 60) + m;
        }
        if (str.includes('h')) {
            const parts = str.split('h');
            const h = parseFloat(parts[0]) || 0;
            const m = parseFloat(parts[1]) || 0;
            return (h * 60) + m;
        }
        if (str.includes('.')) {
            const val = parseFloat(str) || 0;
            const h = Math.floor(val);
            const m = Math.round((val - h) * 60);
            return (h * 60) + m;
        }
        const h = parseFloat(str) || 0;
        return h * 60;
    }

    function isInRange(min, startMin, endMin) {
        if (startMin === endMin) return false;
        if (startMin < endMin) return min >= startMin && min < endMin;
        return min >= startMin || min < endMin;
    }

    function computeDynamicTariffs() {
        const pNuit = parseFloat(document.getElementById('tariff-hc')?.value) || 0.222;
        const pJour = parseFloat(document.getElementById('tariff-hp')?.value) || 0.290;
        const pSoir = parseFloat(document.getElementById('tariff-hph')?.value) || 0.377;
        const pMat  = parseFloat(document.getElementById('tariff-hpm-val')?.value) || 0.290;
        const pTu   = parseFloat(document.getElementById('tariff-tu')?.value) || 0.291;

        const nuitStart = parseTimeToMinutes(document.getElementById('tariff-hc-start')?.value || '23:00');
        const nuitEnd   = parseTimeToMinutes(document.getElementById('tariff-hc-end')?.value || '08:00');
        const matStart  = parseTimeToMinutes(document.getElementById('tariff-hpm-start')?.value || '08:00');
        const matEnd    = parseTimeToMinutes(document.getElementById('tariff-hpm-end')?.value || '13:00');
        const jourStart = parseTimeToMinutes(document.getElementById('tariff-hp-start')?.value || '13:00');
        const jourEnd   = parseTimeToMinutes(document.getElementById('tariff-hp-end')?.value || '19:00');
        const soirStart = parseTimeToMinutes(document.getElementById('tariff-hph-start')?.value || '19:00');
        const soirEnd   = parseTimeToMinutes(document.getElementById('tariff-hph-end')?.value || '23:00');

        function getRateAtMinute(min) {
            const ranges = [
                { start: nuitStart, end: nuitEnd, price: pNuit, band: 'nuit', label: 'HC' },
                { start: matStart, end: matEnd, price: pMat, band: 'matin', label: 'HPM' },
                { start: soirStart, end: soirEnd, price: pSoir, band: 'soir', label: 'HPS' },
                { start: jourStart, end: jourEnd, price: pJour, band: 'jour', label: 'HP' }
            ];

            for (const range of ranges) {
                if (isInRange(min, range.start, range.end)) {
                    return range;
                }
            }
            return { price: pJour, band: 'jour', label: 'HP' };
        }

        const hourlyRates = [];
        const hourlyBands = [];
        for (let h = 0; h < 24; h++) {
            let sumPrice = 0;
            let predominantBand = 'jour';
            const bandCounts = {};
            for (let m = h * 60; m < (h + 1) * 60; m++) {
                const info = getRateAtMinute(m);
                sumPrice += info.price;
                bandCounts[info.band] = (bandCounts[info.band] || 0) + 1;
            }
            let maxCount = 0;
            for (const [b, count] of Object.entries(bandCounts)) {
                if (count > maxCount) { maxCount = count; predominantBand = b; }
            }
            hourlyRates.push(Number((sumPrice / 60.0).toFixed(4)));
            hourlyBands.push(predominantBand);
        }

        return {
            hourlyRates,
            hourlyBands,
            cout_TU: Array(24).fill(pTu),
            prices: { P_NUIT: pNuit, P_JOUR: pJour, P_P_SOIR: pSoir, P_P_MAT: pMat, P_UNIFORME: pTu }
        };
    }

    function renderTariffTimelineBar() {
        const container = document.getElementById('tariff-timeline-bar');
        if (!container) return;
        const tariffData = computeDynamicTariffs();
        let html = '';
        for (let h = 0; h < 24; h++) {
            const band = tariffData.hourlyBands[h];
            const price = tariffData.hourlyRates[h];
            const hStr = `${String(h).padStart(2, '0')}h`;
            html += `
                <div class="timeline-hour-slot band-${band}" title="${hStr}:00 → ${hStr}:59 : ${price.toFixed(3)} TND/kWh (${band.toUpperCase()})">
                    <span>${hStr}</span>
                    <span style="font-size:0.55rem;opacity:0.9;">${price.toFixed(2)}</span>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    function refreshScheduleZoneColors() {
        const table = scheduleGridContainer && scheduleGridContainer.querySelector('.schedule-table');
        if (!table) return;
        const tariffData = computeDynamicTariffs();
        const ths = table.querySelectorAll('thead tr th');
        ths.forEach((th, idx) => {
            if (idx < 2) return;
            const h = idx - 2;
            const band = tariffData.hourlyBands[h];
            th.className = BAND_ZONE[band] || 'zone-jour';
            th.title = `${band.toUpperCase()} · ${tariffData.hourlyRates[h].toFixed(3)} TND/kWh`;
        });
        table.querySelectorAll('tbody tr').forEach(row => {
            const tds = row.querySelectorAll('td');
            tds.forEach((td, idx) => {
                if (idx < 2) return;
                const h = idx - 2;
                const band = tariffData.hourlyBands[h];
                td.className = BAND_ZONE[band] || 'zone-jour';
                const cb = td.querySelector('.schedule-checkbox');
                td.style.background = (cb && cb.checked) ? 'rgba(6,182,212,0.24)' : '';
            });
        });
    }

    function requestLiveRefresh() {
        if (liveRefreshTimer) clearTimeout(liveRefreshTimer);
        liveRefreshTimer = setTimeout(() => {
            suppressTransientToasts = true;
            Promise.resolve(executeSimulation(false, false))
                .catch(() => {})
                .finally(() => { suppressTransientToasts = false; });
        }, 150);
    }

    function refreshTariffDerivedUi() {
        renderTariffTimelineBar();
        refreshScheduleZoneColors();
        requestLiveRefresh();
    }

    ['tariff-hc-start', 'tariff-hc-end', 'tariff-hp-start', 'tariff-hp-end', 'tariff-hph-start', 'tariff-hph-end', 'tariff-hpm-start', 'tariff-hpm-end', 'tariff-hc', 'tariff-hp', 'tariff-hph', 'tariff-hpm-val', 'tariff-tu'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', refreshTariffDerivedUi);
        el.addEventListener('change', refreshTariffDerivedUi);
    });

    // Simulation state
    let lastSystemData = null;
    let lastSchedule = null;
    let lastResults = null;
    let simMode = '24h';
    let currentHourStep = 23;
    let playInterval = null;
    let liveRefreshTimer = null;
    let suppressTransientToasts = false;

    // Player elements
    const btnMode24h = document.getElementById('btn-mode-24h');
    const btnModeStep = document.getElementById('btn-mode-step');
    const playerControls = document.getElementById('scada-player-controls');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const btnStepPrev = document.getElementById('btn-step-prev');
    const btnStepNext = document.getElementById('btn-step-next');
    const timeSlider = document.getElementById('scada-time-slider');
    const hourBadge = document.getElementById('scada-hour-badge');

    const BAND_ZONE = { nuit: 'zone-nuit', matin: 'zone-matin', soir: 'zone-pointe', jour: 'zone-jour' };

    // 3 Viewers Professionnels (EPANET Synoptique, SIG Le Kef, Comparateur Scénarios A/B)
    let epanetViewer = null;
    let gisViewer = null;
    let compareViewer = null;

    try {
        epanetViewer = new EpanetSynopticViewer('epanet-synoptic-container');
    } catch(e) {
        console.error("EPANET viewer init notice:", e);
    }
    try {
        gisViewer = new GisMapViewer('gis-map-container');
    } catch(e) {
        console.error("GIS Map viewer init notice:", e);
    }
    try {
        compareViewer = new ScenarioCompareViewer('scenario-compare-container');
    } catch(e) {
        console.error("Scenario Compare viewer init notice:", e);
    }

    // --- Tab Switching Logic ---
    // Onglets dont le rendu est coûteux : on mémorise la signature des données
    // au dernier rendu pour sauter le re-rendu si rien n'a changé (navigation
    // instantanée entre onglets, charts stables).
    const HEAVY_TAB_PANES = ['pane-dashboard', 'pane-epanet-synoptic', 'pane-gis-map',
        'pane-scenario-compare', 'pane-datascience', 'pane-pro-analyser',
        'pane-schema', 'pane-vannes', 'pane-table'];
    const _paneRenderCache = {};
    function computeDataSignature() {
        try {
            return JSON.stringify([lastSystemData, lastSchedule, lastResults, currentHourStep, customLabels]);
        } catch (e) {
            return Math.random(); // en cas d'erreur, forcer le rendu
        }
    }

    function setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                const paneId = btn.dataset.tab;
                const targetPane = document.getElementById(paneId);
                if (targetPane) targetPane.classList.add('active');

                // Resize des charts une seule fois, au frame suivant
                // (l'ancien code déclenchait 2 resize + un événement 'resize' global = triple rendu)
                requestAnimationFrame(() => resizeAllActiveCharts());

                const sysData = lastSystemData || collectSystemData();
                const sched = lastSchedule || collectSchedule();

                // Anti-re-rendu : données inchangées depuis la dernière visite de cet onglet
                if (HEAVY_TAB_PANES.includes(paneId)) {
                    const sig = computeDataSignature();
                    if (_paneRenderCache[paneId] === sig) return;
                    _paneRenderCache[paneId] = sig;
                }

                // Trigger tab-specific refresh
                if (paneId === 'pane-dashboard') {
                    if (lastResults) {
                        try {
                            updateMiniSynoptic(sched, lastResults, sysData, currentHourStep, customLabels);
                            renderSCADACharts(sysData, sched, lastResults);
                            updateDashboardStationTable(sysData, sched, lastResults, currentHourStep);
                        } catch(e) { console.warn("Dashboard tab refresh error:", e); }
                    }
                } else if (paneId === 'pane-epanet-synoptic') {
                    if (epanetViewer) {
                        try {
                            epanetViewer.refresh();
                            if (lastResults) epanetViewer.updateData(sched, lastResults, sysData);
                        } catch(e) { console.warn("EPANET tab refresh error:", e); }
                    }
                } else if (paneId === 'pane-gis-map') {
                    if (gisViewer) {
                        try {
                            gisViewer.refresh();
                            if (lastResults) gisViewer.updateTelemetry(lastResults);
                        } catch(e) { console.warn("GIS tab refresh error:", e); }
                    }
                } else if (paneId === 'pane-scenario-compare') {
                    if (compareViewer) {
                        try { compareViewer.refresh(); } catch(e) { console.warn("Compare tab refresh error:", e); }
                    }
                } else if (paneId === 'pane-datascience') {
                    if (lastResults) {
                        try {
                            updateDataSciencePane(sysData, sched, lastResults);
                        } catch(e) { console.warn("DataScience tab refresh error:", e); }
                    }
                } else if (paneId === 'pane-pro-analyser') {
                    if (lastResults) {
                        try {
                            updateProAnalyserPane(sysData, sched, lastResults);
                            // Un seul rendu : le timeout ne fait que redessiner
                            // les charts créés pendant que l'onglet était masqué.
                            setTimeout(() => {
                                try { resizeAllActiveCharts(); } catch (e0) {}
                            }, 90);
                        } catch(e) { console.warn("ProAnalyser tab refresh error:", e); }
                    }
                } else if (paneId === 'pane-schema') {
                    if (lastResults) {
                        try {
                            updateSynoptic(sched, lastResults, sysData, currentHourStep, customLabels);
                        } catch(e) { console.warn("Synoptic tab refresh error:", e); }
                    }
                    buildSynopticSchema();
                } else if (paneId === 'pane-schedule') {
                    buildScheduleGrid(sched);
                } else if (paneId === 'pane-vannes') {
                    buildVannesGrid();
                    updateVannesKpis(lastResults);
                    renderVannesChart(lastResults);
                } else if (paneId === 'pane-excel') {
                    if (dataGridInstance) dataGridInstance.render();
                } else if (paneId === 'pane-table') {
                    if (lastResults) {
                        buildDetailedResultsTable(lastResults, sysData);
                    }
                } else if (paneId === 'pane-guide') {
                    try {
                        buildExplainerDiagram('explainer-diagram-container');
                    } catch(e) { console.warn("Explainer diagram refresh error:", e); }
                } else if (paneId === 'pane-params') {
                    renderTariffTimelineBar();
                }
            });
        });
    }

    // --- Custom Equipment Labels / Alias Modal ---
    function initLabelsModal() {
        const btnOpen = document.getElementById('btn-open-labels-modal');
        const modal = document.getElementById('labels-alias-modal');
        const btnClose = document.getElementById('btn-close-labels-modal');
        const btnApply = document.getElementById('btn-apply-labels-alias') || document.getElementById('btn-apply-labels');
        const btnReset = document.getElementById('btn-reset-labels-alias') || document.getElementById('btn-reset-labels');
        const tabs = document.querySelectorAll('.labels-tab-btn');
        const container = document.getElementById('labels-editor-table-container');

        let currentGroup = 'reservoirs';

        function renderGroupTable(groupKey) {
            if (!container) return;
            currentGroup = groupKey;
            const catalog = DEFAULT_LABELS_CATALOG[groupKey] || {};
            
            let html = `
                <table class="labels-table">
                    <thead>
                        <tr>
                            <th style="width:25%;">Code Système</th>
                            <th style="width:35%;">Nom / Description Initiale</th>
                            <th style="width:40%;">Nom Personnalisé (Alias Affiché)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (const [id, defaultName] of Object.entries(catalog)) {
                const currentVal = (customLabels && customLabels[id]) ? customLabels[id] : '';
                html += `
                    <tr>
                        <td><code style="color:var(--cyan-accent); font-weight:700;">${id}</code></td>
                        <td style="color:var(--text-muted);">${defaultName}</td>
                        <td>
                            <input type="text" 
                                   class="labels-input-edit input-alias-field" 
                                   data-id="${id}" 
                                   data-default="${defaultName}" 
                                   value="${currentVal}" 
                                   placeholder="${defaultName}">
                        </td>
                    </tr>
                `;
            }

            html += '</tbody></table>';
            container.innerHTML = html;

            container.querySelectorAll('.input-alias-field').forEach(input => {
                input.addEventListener('input', (e) => {
                    const id = e.target.dataset.id;
                    const val = e.target.value.trim();
                    if (val) customLabels[id] = val;
                    else delete customLabels[id];
                });
            });
        }

        btnOpen?.addEventListener('click', () => {
            if (modal) {
                modal.style.display = 'flex';
                renderGroupTable(currentGroup);
            }
        });

        btnClose?.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                renderGroupTable(e.currentTarget.dataset.group);
            });
        });

        btnApply?.addEventListener('click', () => {
            document.querySelectorAll('.input-alias-field').forEach(input => {
                const id = input.dataset.id;
                const val = input.value.trim();
                if (val) customLabels[id] = val;
                else delete customLabels[id];
            });

            localStorage.setItem('scada_custom_labels', JSON.stringify(customLabels));
            setSynopticCustomLabels(customLabels);
            buildSystemDataForms();
            buildScheduleGrid(collectSchedule());
            buildInteractiveSynopticGrid();
            executeSimulation(false);
            
            if (modal) modal.style.display = 'none';
            showToast('Noms et alias personnalisés appliqués avec succès.', 'success');
        });

        btnReset?.addEventListener('click', () => {
            if (confirm('Voulez-vous réinitialiser tous les noms d\'équipements à leurs valeurs d\'origine ?')) {
                customLabels = {};
                localStorage.removeItem('scada_custom_labels');
                setSynopticCustomLabels({});
                buildSystemDataForms();
                buildScheduleGrid(collectSchedule());
                buildInteractiveSynopticGrid();
                executeSimulation(false);
                renderGroupTable(currentGroup);
                showToast('Noms réinitialisés aux valeurs d\'origine.', 'info');
            }
        });
    }

    // --- Canva Executive Pitch Deck Presentation Modal Controller ---
    function initCanvaModal() {
        const modal = document.getElementById('canva-presentation-modal');
        const btnOpen = document.getElementById('btn-open-canva-presentation');
        const btnOpenDeckIntro = document.getElementById('btn-open-deck-intro');
        const btnClose = document.getElementById('btn-close-canva-modal');
        const btnPrev = document.getElementById('canva-prev-slide');
        const btnNext = document.getElementById('canva-next-slide');
        const indicatorContainer = document.getElementById('canva-slide-indicators');
        const slides = document.querySelectorAll('.canva-slide');

        if (!modal || slides.length === 0) return;

        let currentSlide = 0;

        function updateSlideUI() {
            slides.forEach((slide, idx) => {
                if (idx === currentSlide) {
                    slide.classList.add('active');
                    slide.style.display = 'block';
                } else {
                    slide.classList.remove('active');
                    slide.style.display = 'none';
                }
            });

            if (indicatorContainer) {
                indicatorContainer.innerHTML = '';
                slides.forEach((_, idx) => {
                    const dot = document.createElement('span');
                    dot.className = `canva-indicator-dot ${idx === currentSlide ? 'active' : ''}`;
                    dot.style.cssText = `display:inline-block; width:${idx === currentSlide ? '22px' : '8px'}; height:8px; border-radius:4px; margin:0 3px; background:${idx === currentSlide ? '#7c3aed' : 'rgba(255,255,255,0.2)'}; cursor:pointer; transition:all 0.2s ease;`;
                    dot.addEventListener('click', () => {
                        currentSlide = idx;
                        updateSlideUI();
                    });
                    indicatorContainer.appendChild(dot);
                });
            }
        }

        function openModal() {
            modal.style.display = 'flex';
            currentSlide = 0;
            updateSlideUI();
        }

        function closeModal() {
            modal.style.display = 'none';
        }

        btnOpen?.addEventListener('click', openModal);
        btnOpenDeckIntro?.addEventListener('click', openModal);
        btnClose?.addEventListener('click', closeModal);
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        btnPrev?.addEventListener('click', () => {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            updateSlideUI();
        });

        btnNext?.addEventListener('click', () => {
            currentSlide = (currentSlide + 1) % slides.length;
            updateSlideUI();
        });

        document.addEventListener('keydown', (e) => {
            if (modal.style.display === 'flex') {
                if (e.key === 'Escape') closeModal();
                else if (e.key === 'ArrowLeft') { currentSlide = (currentSlide - 1 + slides.length) % slides.length; updateSlideUI(); }
                else if (e.key === 'ArrowRight') { currentSlide = (currentSlide + 1) % slides.length; updateSlideUI(); }
            }
        });
    }

    // --- Analytics Alerts Table Renderer ---
    function updateAnalyticsAlertsTable(results, systemData) {
        const container = document.getElementById('analytics-alerts-table');
        if (!container) return;

        const volEvol = (results && results.volume_evolution) ? results.volume_evolution : {};
        const caps = systemData?.capacites || CAPACITES;
        const errors = results?.errors || [];

        let alertsList = [];
        for (const [resKey, vols] of Object.entries(volEvol)) {
            const [vmin, vmax] = caps[resKey] || [0, 1000];
            const minV = Math.min(...vols);
            const maxV = Math.max(...vols);
            const alias = getLabel(resKey, resKey);

            if (minV < vmin) {
                alertsList.push({
                    res: alias,
                    key: resKey,
                    type: 'Déficit / V_min',
                    detail: `Volume descend à ${minV.toFixed(1)} m³ (Seuil min: ${vmin} m³)`,
                    severity: 'danger'
                });
            } else if (maxV > vmax) {
                alertsList.push({
                    res: alias,
                    key: resKey,
                    type: 'Débordement / V_max',
                    detail: `Volume atteint ${maxV.toFixed(1)} m³ (Capacité max: ${vmax} m³)`,
                    severity: 'danger'
                });
            } else if (minV - vmin < (vmax - vmin) * 0.08) {
                alertsList.push({
                    res: alias,
                    key: resKey,
                    type: 'Vigilance Stock Bas',
                    detail: `Marge minimale restante : ${(minV - vmin).toFixed(1)} m³`,
                    severity: 'warning'
                });
            }
        }

        if (alertsList.length === 0) {
            container.innerHTML = `
                <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:var(--radius-sm); padding:0.85rem 1rem; display:flex; align-items:center; gap:0.75rem;">
                    <span style="font-size:1.5rem;">✅</span>
                    <div>
                        <strong style="color:#10b981; font-size:0.9rem; display:block;">Système 100% Conforme & Régulé</strong>
                        <span style="font-size:0.75rem; color:#94a3b8;">Aucun dépassement de capacité ni rupture de stock sur les 12 réservoirs durant les 24 heures simulées.</span>
                    </div>
                </div>
            `;
        } else {
            let html = '<div style="display:flex; flex-direction:column; gap:0.5rem;">';
            alertsList.forEach(a => {
                const isDanger = a.severity === 'danger';
                const bg = isDanger ? 'rgba(244,63,94,0.12)' : 'rgba(245,158,11,0.12)';
                const border = isDanger ? 'rgba(244,63,94,0.35)' : 'rgba(245,158,11,0.35)';
                const textCol = isDanger ? '#f43f5e' : '#f59e0b';
                const icon = isDanger ? '⚠️' : '🟡';
                html += `
                    <div style="background:${bg}; border:1px solid ${border}; border-radius:var(--radius-sm); padding:0.6rem 0.8rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem;">
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <span>${icon}</span>
                            <div>
                                <strong style="color:#fff; font-size:0.82rem;">${a.res}</strong>
                                <small style="color:var(--text-muted); display:block; font-size:0.68rem;">${a.key} · ${a.type}</small>
                            </div>
                        </div>
                        <span style="font-size:0.75rem; color:${textCol}; font-family:var(--font-mono); font-weight:700;">${a.detail}</span>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        }
    }

    // --- UI Building Functions ---
    function bindLiveFormRecalculation() {
        const liveControls = document.querySelectorAll('.input-pompe, .input-vanne, .input-capacite, .input-demande-moyenne, .input-coef, .schedule-checkbox, .input-vanne-horaire');

        liveControls.forEach(control => {
            if (control.dataset.liveBound === 'true') return;
            control.dataset.liveBound = 'true';
            ['input', 'change'].forEach(eventName => {
                control.addEventListener(eventName, () => requestLiveRefresh());
            });
        });
    }

    function buildSystemDataForms() {
        if (!systemDataForms) return;
        let html = '';

        // ── TABLE 1: POMPES & FORAGES ──────────────────────────────────────
        html += `
        <div class="params-table-section">
            <div class="params-section-header" style="border-left-color:#06b6d4;">
                <span>🔧 Pompes &amp; Forages — Caractéristiques Hydrauliques (${Object.keys(POMPES).length} équipements)</span>
                <span class="params-section-badge" style="background:rgba(6,182,212,0.18);color:#06b6d4;">Q · P · Tarif</span>
            </div>
            <div class="table-responsive">
            <table class="params-data-table">
                <thead>
                    <tr>
                        <th class="col-num">#</th>
                        <th>Code Équipement</th>
                        <th>Désignation</th>
                        <th class="col-tarif">Tarif</th>
                        <th class="col-val" style="color:#06b6d4;">⟳ Débit (m³/h)</th>
                        <th class="col-val" style="color:#ec4899;">⚡ Puissance (kW)</th>
                    </tr>
                </thead>
                <tbody>`;
        let rowIdx = 0;
        for (const [key, value] of Object.entries(POMPES)) {
            const alias = getLabel(key, key);
            const tarif = value.tarif || 'TPH';
            const tarifColors = { 'TU': '#a855f7', 'TPH': '#06b6d4', 'TP': '#10b981' };
            const tarifCol = tarifColors[tarif] || '#94a3b8';
            const rowCls = rowIdx % 2 === 0 ? 'row-even' : 'row-odd';
            html += `
                <tr class="${rowCls}">
                    <td class="col-num">${rowIdx + 1}</td>
                    <td><code class="eq-code">${key}</code></td>
                    <td class="eq-alias">${alias}</td>
                    <td class="col-tarif"><span class="tarif-chip" style="background:${tarifCol}22;color:${tarifCol};border-color:${tarifCol}44;">${tarif}</span></td>
                    <td class="col-val">
                        <input type="number" id="pmp-${key}-debit" value="${value.debit}" step="0.1"
                               data-key="${key}" data-prop="debit" class="scada-input input-pompe params-num-input cyan-input"
                               title="Débit nominal m³/h">
                    </td>
                    <td class="col-val">
                        <input type="number" id="pmp-${key}-puissance" value="${value.puissance}" step="0.1"
                               data-key="${key}" data-prop="puissance" class="scada-input input-pompe params-num-input magenta-input"
                               title="Puissance installée kW">
                    </td>
                </tr>`;
            rowIdx++;
        }
        html += `</tbody></table></div></div>`;

        // ── TABLE 2: VANNES GRAVITAIRES ───────────────────────────────────
        html += `
        <div class="params-table-section">
            <div class="params-section-header" style="border-left-color:#a855f7;">
                <span>🚪 Vannes Gravitaires — Débits Maximaux Q<sub>max</sub> (${Object.keys(VANNES_GRAVITAIRES).length} vannes)</span>
                <span class="params-section-badge" style="background:rgba(168,85,247,0.18);color:#a855f7;">Capacité limite</span>
            </div>
            <p style="color:var(--text-muted);font-size:0.8rem;margin:0.5rem 0 0.75rem;padding:0 0.5rem;">
                Capacités limites hydrauliques des conduites. Pour moduler heure par heure, utilisez l'onglet <strong style="color:var(--cyan-accent);">Vannes</strong>.
            </p>
            <div class="table-responsive">
            <table class="params-data-table">
                <thead>
                    <tr>
                        <th class="col-num">#</th>
                        <th>Code Vanne</th>
                        <th>Désignation</th>
                        <th class="col-val" style="color:#a855f7;">Q<sub>max</sub> (m³/h)</th>
                    </tr>
                </thead>
                <tbody>`;
        rowIdx = 0;
        for (const [key, value] of Object.entries(VANNES_GRAVITAIRES)) {
            const alias = getLabel(key, key);
            const rowCls = rowIdx % 2 === 0 ? 'row-even' : 'row-odd';
            html += `
                <tr class="${rowCls}">
                    <td class="col-num">${rowIdx + 1}</td>
                    <td><code class="eq-code" style="color:#c084fc;">${key}</code></td>
                    <td class="eq-alias">${alias}</td>
                    <td class="col-val">
                        <input type="number" id="vanne-${key}-debit" value="${value.debit_max}" step="0.1"
                               data-key="${key}" data-prop="debit_max" class="scada-input input-vanne params-num-input purple-input"
                               title="Débit maximum m³/h">
                    </td>
                </tr>`;
            rowIdx++;
        }
        html += `</tbody></table></div></div>`;

        // ── TABLE 3: RÉSERVOIRS & CAPACITÉS ──────────────────────────────
        html += `
        <div class="params-table-section">
            <div class="params-section-header" style="border-left-color:#10b981;">
                <span>🏗️ Réservoirs &amp; Capacités — Seuils Hydrauliques (V<sub>min</sub> · V<sub>max</sub> · V<sub>init</sub>) (${Object.keys(CAPACITES).length} réservoirs)</span>
                <span class="params-section-badge" style="background:rgba(16,185,129,0.18);color:#10b981;">m³</span>
            </div>
            <div class="table-responsive">
            <table class="params-data-table">
                <thead>
                    <tr>
                        <th class="col-num">#</th>
                        <th>Code Réservoir</th>
                        <th>Désignation</th>
                        <th class="col-val" style="color:#f87171;">V<sub>min</sub> (m³)</th>
                        <th class="col-val" style="color:#38bdf8;">V<sub>max</sub> (m³)</th>
                        <th class="col-val" style="color:#34d399;">V<sub>init</sub> (m³)</th>
                        <th style="min-width:80px;">Plage Utile</th>
                    </tr>
                </thead>
                <tbody>`;
        rowIdx = 0;
        for (const [key, value] of Object.entries(CAPACITES)) {
            const alias = getLabel(key, key);
            const [minVol, maxVol, initVol] = value;
            const range = maxVol - minVol;
            const rowCls = rowIdx % 2 === 0 ? 'row-even' : 'row-odd';
            const initPct = Math.round((initVol - minVol) / Math.max(1, range) * 100);
            html += `
                <tr class="${rowCls}">
                    <td class="col-num">${rowIdx + 1}</td>
                    <td><code class="eq-code" style="color:#34d399;">${key}</code></td>
                    <td class="eq-alias">${alias}</td>
                    <td class="col-val">
                        <input type="number" id="capa-${key}-min" value="${minVol}" step="1"
                               data-key="${key}" data-prop="0" class="scada-input input-capacite params-num-input rose-input"
                               title="Volume minimum V_min">
                    </td>
                    <td class="col-val">
                        <input type="number" id="capa-${key}-max" value="${maxVol}" step="1"
                               data-key="${key}" data-prop="1" class="scada-input input-capacite params-num-input cyan-input"
                               title="Volume maximum V_max">
                    </td>
                    <td class="col-val">
                        <input type="number" id="capa-${key}-init" value="${initVol}" step="1"
                               data-key="${key}" data-prop="2" class="scada-input input-capacite params-num-input emerald-input"
                               title="Volume initial V_0 (00h)">
                    </td>
                    <td>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <div style="flex:1;height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
                                <div style="width:${initPct}%;height:100%;background:linear-gradient(90deg,#10b981,#06b6d4);border-radius:3px;"></div>
                            </div>
                            <span style="font-size:0.68rem;color:var(--text-muted);font-family:var(--font-mono);">${range} m³</span>
                        </div>
                    </td>
                </tr>`;
            rowIdx++;
        }
        html += `</tbody></table></div></div>`;

        systemDataForms.innerHTML = html;
        bindLiveFormRecalculation();
    }

    function buildScheduleGrid(customSchedule = null) {
        if (!scheduleGridContainer) return;
        const itemKeys = Object.keys({...POMPES, ...VANNES_GRAVITAIRES});
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const tariffData = computeDynamicTariffs();
        const schedule = customSchedule || createBaselineSchedule(POMPES, VANNES_GRAVITAIRES);

        let table = `<table class="schedule-table vannes-matrix-table">
            <thead>
                <tr>
                    <th class="eq-th-idx">#</th>
                    <th class="eq-th-code">Code</th>
                    <th class="eq-th-name">Équipement</th>`;

        hours.forEach(h => {
            const band = tariffData.hourlyBands[h];
            const zoneClass = BAND_ZONE[band] || 'zone-jour';
            const rate = tariffData.hourlyRates[h];
            const hLabel = `${String(h).padStart(2, '0')}:00`;
            const bandLabels = { nuit: '🌙 Nuit', matin: '🔵 P.Matin', jour: '🟡 Jour', soir: '🔴 P.Soir' };
            table += `
                <th class="eq-th-hour ${zoneClass}" title="${bandLabels[band] || band} · ${rate.toFixed(3)} TND/kWh">
                    <span class="eq-th-hour-lbl">${String(h).padStart(2, '0')}h</span>
                    <small class="eq-th-tarif-sub">${rate.toFixed(2)}</small>
                </th>`;
        });

        table += `
                    <th class="eq-th-stat">Heures ON</th>
                    <th class="eq-th-stat">Énergie</th>
                </tr>
            </thead>
            <tbody>`;

        // Calculate column totals
        const hourlyActiveCount = Array(24).fill(0);
        const hourlyPowerKw = Array(24).fill(0);
        const hourlyCostTnd = Array(24).fill(0);

        itemKeys.forEach((key, rowIdx) => {
            const alias = getLabel(key, key);
            const isValve = key in VANNES_GRAVITAIRES;
            const isPump = key in POMPES;
            const pData = POMPES[key] || {};
            const etIcon = isValve ? '🚪' : (key.startsWith('F') ? '🔩' : '⚙️');
            const power = pData.puissance || 0;

            let activeHours = 0;
            let totalEnergy = 0;

            let rowCells = '';
            hours.forEach(h => {
                const isChecked = (schedule[key]?.[h] || 0) === 1;
                const isDisabled = key === 'Source_Romaine_vers_R1';
                const band = tariffData.hourlyBands[h];
                const zoneClass = BAND_ZONE[band] || 'zone-jour';
                const rate = tariffData.hourlyRates[h];

                if (isChecked) {
                    activeHours++;
                    hourlyActiveCount[h]++;
                    if (isPump) {
                        totalEnergy += power;
                        hourlyPowerKw[h] += power;
                        hourlyCostTnd[h] += power * rate;
                    }
                }

                rowCells += `
                    <td class="eq-cell-check ${zoneClass} ${isChecked ? 'cell-checked' : 'cell-unchecked'}">
                        <label class="custom-toggle-chip ${isChecked ? 'chip-active' : ''} ${isDisabled ? 'chip-disabled' : ''}" title="${alias} à ${String(h).padStart(2, '0')}h : ${isChecked ? 'MARCHE' : 'ARRÊT'}">
                            <input type="checkbox" class="schedule-checkbox" data-item-key="${key}" data-hour="${h}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
                            <span class="chip-state-text">${isChecked ? '1' : '0'}</span>
                        </label>
                    </td>`;
            });

            table += `
                <tr class="${rowIdx % 2 === 0 ? 'row-even' : 'row-odd'}" data-eq-key="${key}">
                    <td class="eq-cell-idx">${rowIdx + 1}</td>
                    <td class="eq-cell-code">
                        <span class="eq-code-chip ${isValve ? 'chip-valve' : 'chip-pump'}" title="${key} · ${alias}">${key}</span>
                    </td>
                    <td class="eq-cell-name">
                        <span class="eq-name-icon">${etIcon}</span>
                        <strong class="eq-name-title">${alias}</strong>
                    </td>
                    ${rowCells}
                    <td class="eq-cell-stat">
                        <span class="badge-hours ${activeHours > 0 ? 'badge-on' : 'badge-off'}">${activeHours}h</span>
                    </td>
                    <td class="eq-cell-stat">
                        <span class="badge-kwh">${Math.round(totalEnergy)} <small>kWh</small></span>
                    </td>
                </tr>`;
        });

        table += `</tbody>
            <tfoot>
                <tr class="schedule-tfoot-row">
                    <td colspan="3" class="tfoot-label">
                        <strong>⚡ Puissance Appelée (kW)</strong>
                    </td>`;
        hours.forEach(h => {
            table += `<td class="tfoot-kw-cell"><span class="tfoot-kw-val">${Math.round(hourlyPowerKw[h])}</span></td>`;
        });
        table += `<td colspan="2" class="tfoot-stat-total">Total: ${Math.round(hourlyPowerKw.reduce((a,b)=>a+b,0))} kWh</td></tr>
                <tr class="schedule-tfoot-row">
                    <td colspan="3" class="tfoot-label">
                        <strong>👥 Groupes Actifs (Nbre)</strong>
                    </td>`;
        hours.forEach(h => {
            table += `<td class="tfoot-count-cell"><span class="tfoot-count-val">${hourlyActiveCount[h]}</span></td>`;
        });
        table += `<td colspan="2" class="tfoot-stat-total">Moy: ${(hourlyActiveCount.reduce((a,b)=>a+b,0)/24).toFixed(1)}/h</td></tr>
            </tfoot>
        </table>`;

        scheduleGridContainer.innerHTML = table;
        bindLiveFormRecalculation();

        scheduleGridContainer.querySelectorAll('.schedule-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const chip = e.target.closest('.custom-toggle-chip');
                const td = e.target.closest('td');
                const key = e.target.dataset.itemKey;
                const h = parseInt(e.target.dataset.hour, 10);
                
                if (chip) {
                    if (e.target.checked) {
                        chip.classList.add('chip-active');
                        const txt = chip.querySelector('.chip-state-text');
                        if (txt) txt.textContent = '1';
                    } else {
                        chip.classList.remove('chip-active');
                        const txt = chip.querySelector('.chip-state-text');
                        if (txt) txt.textContent = '0';
                    }
                }
                if (td) {
                    if (e.target.checked) {
                        td.classList.add('cell-checked');
                        td.classList.remove('cell-unchecked');
                    } else {
                        td.classList.remove('cell-checked');
                        td.classList.add('cell-unchecked');
                    }
                }
                requestLiveRefresh();
            });
        });
    }

    function createBaselineSchedule(pompes, vannes) {
        const schedule = {};
        const itemKeys = Object.keys({ ...pompes, ...vannes });
        itemKeys.forEach(key => schedule[key] = Array(24).fill(0));

        const workbookSchedule = {
            'F1_R500': [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            'F2_R500': [1,1,1,0,1,0,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1],
            'F3_R500': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1],
            'F4_R500': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,0,0,0,0,1],
            'F5_R500': [1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1],
            'F6_R500': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1],
            'F7_R500': [0,0,1,1,1,1,0,0,0,1,1,1,1,0,1,1,0,1,0,1,1,0,0,1],
            'F8_R500': [1,1,1,0,0,1,1,0,1,1,1,0,1,1,1,1,1,1,0,0,0,0,0,1],
            'F9_R500': [1,1,1,1,1,1,1,0,0,1,1,1,1,0,0,0,0,1,1,0,0,0,0,1],
            'F10_R500':[1,0,1,0,1,1,1,0,0,0,1,0,1,0,0,0,0,1,0,0,0,0,0,1],
            'F11_R500':[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            'F12_R500':[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            'R500_to_R6_P1': [1,1,1,1,1,1,1,0,0,1,1,1,1,1,0,0,1,0,1,0,0,0,0,1],
            'R500_to_R6_P2': [0,1,1,0,0,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1],
            'R6_to_R1_P1': [1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            'R6_to_R1_P2': [0,0,0,0,0,0,0,1,0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,1],
            'R1_to_R2_P1': [0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,1,1,1,0,0,0,0,0,1],
            'R1_to_R2_P2': [1,0,0,0,1,0,0,0,0,1,0,1,0,1,1,0,1,1,1,0,0,0,0,1],
            'R1_to_R3_P1': [0,1,1,1,0,1,1,0,1,0,0,0,0,1,1,1,1,1,0,0,0,0,0,1],
            'R1_to_R3_P2': [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            'Forage_Ain_Bidha_Pmp': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            'Source_Ain_Bidha_Pmp': [0,0,0,1,1,0,0,1,1,1,0,1,0,0,1,1,0,1,0,0,0,0,0,1],
            'Ain_Bidha_to_Zaaf_P1': [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,1,1],
            'Ain_Bidha_to_Zaaf_P2': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            'Zaaf_to_Birchag_P1': [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0],
            'Birchagroun_to_R6': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
            'Forage1_SK10': [1,1,1,1,1,0,0,1,1,1,1,0,1,1,1,0,1,0,0,1,1,0,0,1],
            'Forage2_SK10': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            'Forage3_SK10': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            'SK10_to_R6_P1': [1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,0,1,0,1,1,0,1],
            'R6_vers_R5': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            'R1_vers_R7': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            'R3_vers_R10': [1,0,1,1,1,1,1,1,1,0,0,1,0,0,1,1,1,1,0,0,1,0,0,1],
            'Source_Romaine_vers_R1': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        };

        for (const [k, arr] of Object.entries(workbookSchedule)) {
            if (schedule[k]) schedule[k] = [...arr];
        }
        return schedule;
    }

    // =========================================================================
    // VANNES GRAVITAIRES — MODULATION DES DÉBITS HORAIRES 24H
    // =========================================================================
    let currentVannesHoraires = JSON.parse(JSON.stringify(DEFAULT_VANNES_HORAIRES));
    let vannesFlowChartInstance = null;

    const VANNES_DEFINITIONS = [
        {
            key: "R6_vers_R5",
            label: "Vanne R6 → R5",
            upstream: "R6 (5 000 m³)",
            downstream: "R5 (1 500 m³)",
            color: "#a855f7",
            gradient: "linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(124,58,237,0.06) 100%)",
            debit_max: 200.0,
            icon: "🚪"
        },
        {
            key: "R1_vers_R7",
            label: "Vanne R1 → R7",
            upstream: "R1 (500 m³)",
            downstream: "R7 (1 500 m³)",
            color: "#ec4899",
            gradient: "linear-gradient(135deg, rgba(236,72,153,0.18) 0%, rgba(244,63,94,0.06) 100%)",
            debit_max: 120.0,
            icon: "🚪"
        },
        {
            key: "R3_vers_R10",
            label: "Vanne R3 → R10",
            upstream: "R3 (500 m³)",
            downstream: "R10 (1 000 m³)",
            color: "#06b6d4",
            gradient: "linear-gradient(135deg, rgba(6,182,212,0.18) 0%, rgba(59,130,246,0.06) 100%)",
            debit_max: 60.0,
            icon: "🚪"
        },
        {
            key: "Source_Romaine_vers_R1",
            label: "Source Romaine → R1",
            upstream: "Source Romaine",
            downstream: "R1 (500 m³)",
            color: "#10b981",
            gradient: "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(6,182,212,0.06) 100%)",
            debit_max: 100.0,
            icon: "💧"
        }
    ];

    function buildVannesGrid() {
        const container = document.getElementById('vannes-matrix-container');
        if (!container) return;

        const tariffData = computeDynamicTariffs();
        const vKeys = Object.keys(VANNES_GRAVITAIRES);

        let table = `<table class="vannes-matrix-table">
            <thead>
                <tr>
                                                            <th class="vm-th-hour">Heure</th>`;

        vKeys.forEach(key => {
            const meta = VANNES_DEFINITIONS.find(d => d.key === key) || {
                label: getLabel(key, key),
                upstream: 'Amont',
                downstream: 'Aval',
                color: '#c084fc',
                debit_max: VANNES_GRAVITAIRES[key]?.debit_max || 50,
                icon: '🚪'
            };
            const alias = getLabel(key, meta.label);
            const qMax = VANNES_GRAVITAIRES[key]?.debit_max || meta.debit_max;

            table += `
                <th class="vm-th-vanne" style="border-top: 3px solid ${meta.color};">
                    <div class="vm-header-card">
                        <div class="vm-header-top">
                            <span class="vm-header-icon">${meta.icon}</span>
                            <span class="vm-header-title">${alias}</span>
                        </div>
                        <div class="vm-header-route">${meta.upstream} ➔ ${meta.downstream}</div>
                        <div class="vm-header-badge">Capacité Q_max: <strong>${qMax.toFixed(1)} m³/h</strong></div>
                        <div class="vm-header-actions">
                            <button type="button" class="btn-vm-mini" data-action="set-max" data-vanne="${key}" title="Régler au débit max (${qMax} m³/h)">Max</button>
                            <button type="button" class="btn-vm-mini" data-action="set-zero" data-vanne="${key}" title="Régler à 0 m³/h">0</button>
                        </div>
                    </div>
                </th>`;
        });

        table += `</tr></thead><tbody>`;

        const bandDefs = {
            nuit:  { tag: '🌙 Nuit',    bg: 'rgba(14,165,233,0.25)',  fg: '#06b6d4' },
            matin: { tag: '🔵 P.Matin',  bg: 'rgba(56,189,248,0.15)',  fg: '#38bdf8' },
            jour:  { tag: '🟡 Jour',     bg: 'rgba(250,204,21,0.20)',  fg: '#fbbf24' },
            soir:  { tag: '🔴 P.Soir',   bg: 'rgba(249,115,22,0.25)',  fg: '#ff6b35' }
        };
        for (let h = 0; h < 24; h++) {
            const band = tariffData.hourlyBands[h];
            const zoneClass = BAND_ZONE[band] || 'zone-jour';
            const rate = tariffData.hourlyRates[h];
            const hLabel = `${String(h).padStart(2, '0')}:00`;
            const bandInfo = bandDefs[band] || bandDefs.jour;

            table += `<tr class="${h % 2 === 0 ? 'row-even' : 'row-odd'}">
                <td class="vm-cell-hour" style="background:${bandInfo.bg};">
                    <strong>${hLabel}</strong>
                    <small style="display:block; font-size:0.62rem; color:${bandInfo.fg}; font-family:var(--font-mono);">${bandInfo.tag}</small>
                </td>`;

            vKeys.forEach(key => {
                const qMax = VANNES_GRAVITAIRES[key]?.debit_max || 50;
                const flowVal = (currentVannesHoraires[key] && currentVannesHoraires[key][h] !== undefined)
                    ? currentVannesHoraires[key][h]
                    : qMax;
                const pct = qMax > 0 ? Math.min(Math.round((flowVal / qMax) * 100), 150) : 0;
                const isOver = flowVal > qMax;
                const isZero = flowVal === 0;

                table += `
                    <td class="vm-cell-input ${zoneClass}">
                        <div class="vm-input-group">
                            <input type="number" 
                                class="scada-input input-vanne-horaire ${isOver ? 'input-over-max' : ''}" 
                                data-vanne="${key}" 
                                data-hour="${h}" 
                                step="0.1" 
                                min="0" 
                                value="${Number(flowVal).toFixed(1)}" 
                                title="${getLabel(key, key)} à ${hLabel} (Q_max: ${qMax} m³/h)">
                            <span class="vm-unit">m³/h</span>
                        </div>
                        <div class="vm-bar-track">
                            <div class="vm-bar-fill ${isOver ? 'bar-over' : isZero ? 'bar-zero' : ''}" style="width:${Math.min(pct, 100)}%;"></div>
                        </div>
                    </td>`;
            });

            table += `</tr>`;
        }

        // Summary Footer
        table += `</tbody><tfoot><tr class="vm-tfoot-row">
            <td colspan="1" class="vm-tfoot-label">
                <strong>📈 Bilan Journalier (24h)</strong>
            </td>`;

        vKeys.forEach(key => {
            const qMax = VANNES_GRAVITAIRES[key]?.debit_max || 50;
            const arr = currentVannesHoraires[key] || Array(24).fill(qMax);
            const totalVol = arr.reduce((sum, v) => sum + (Number(v) || 0), 0);
            const avgFlow = totalVol / 24;
            const maxCapacity24h = qMax * 24;
            const chargeRate = maxCapacity24h > 0 ? ((totalVol / maxCapacity24h) * 100) : 0;

            table += `
                <td class="vm-tfoot-cell">
                    <div class="vm-foot-stat">
                        <span>Volume: <strong>${totalVol.toFixed(1)} m³</strong></span>
                        <span>Moyenne: <strong>${avgFlow.toFixed(1)} m³/h</strong></span>
                        <span>Charge: <strong>${chargeRate.toFixed(1)}%</strong></span>
                    </div>
                </td>`;
        });

        table += `</tr></tfoot></table>`;
        container.innerHTML = table;

        container.querySelectorAll('.btn-vm-mini').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const vanneKey = btn.dataset.vanne;
                const qMax = VANNES_GRAVITAIRES[vanneKey]?.debit_max || 50;

                if (action === 'set-max') {
                    currentVannesHoraires[vanneKey] = Array(24).fill(qMax);
                } else if (action === 'set-zero') {
                    currentVannesHoraires[vanneKey] = Array(24).fill(0);
                }
                buildVannesGrid();
                updateVannesKpis(lastResults);
                renderVannesChart(lastResults);
                requestLiveRefresh();
            });
        });

        container.querySelectorAll('.input-vanne-horaire').forEach(inp => {
            const updateCellState = (targetInput) => {
                const vanneKey = targetInput.dataset.vanne;
                const h = parseInt(targetInput.dataset.hour, 10);
                const qMax = VANNES_GRAVITAIRES[vanneKey]?.debit_max || 50;
                const raw = targetInput.value.trim();
                const val = raw === '' ? 0 : parseFloat(raw);

                if (!currentVannesHoraires[vanneKey]) currentVannesHoraires[vanneKey] = Array(24).fill(0);
                currentVannesHoraires[vanneKey][h] = isNaN(val) ? 0 : Math.max(0, val);

                const cell = targetInput.closest('td');
                if (cell) {
                    const bar = cell.querySelector('.vm-bar-fill');
                    if (bar) {
                        const pct = qMax > 0 ? Math.min(Math.round((val / qMax) * 100), 100) : 0;
                        bar.style.width = `${pct}%`;
                        bar.className = `vm-bar-fill ${val > qMax ? 'bar-over' : val === 0 ? 'bar-zero' : ''}`;
                    }
                    if (val > qMax) targetInput.classList.add('input-over-max');
                    else targetInput.classList.remove('input-over-max');
                }
            };

            inp.addEventListener('input', () => {
                updateCellState(inp);
                requestLiveRefresh();
            });
            inp.addEventListener('change', () => {
                updateCellState(inp);
                updateVannesKpis(lastResults);
                renderVannesChart(lastResults);
                requestLiveRefresh();
            });
        });
    }

    function updateVannesKpis(results = null) {
        const container = document.getElementById('vannes-kpi-summary-grid');
        if (!container) return;

        const vKeys = Object.keys(VANNES_GRAVITAIRES);
        let html = '';

        vKeys.forEach(key => {
            const meta = VANNES_DEFINITIONS.find(d => d.key === key) || {
                label: getLabel(key, key),
                upstream: 'Amont',
                downstream: 'Aval',
                color: '#c084fc',
                gradient: 'linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(124,58,237,0.06) 100%)',
                debit_max: VANNES_GRAVITAIRES[key]?.debit_max || 50,
                icon: '🚪'
            };
            const alias = getLabel(key, meta.label);
            const qMax = VANNES_GRAVITAIRES[key]?.debit_max || meta.debit_max;
            const arr = currentVannesHoraires[key] || Array(24).fill(qMax);
            const totalVol = arr.reduce((sum, v) => sum + (Number(v) || 0), 0);
            const avgFlow = totalVol / 24;
            const maxCap24h = qMax * 24;
            const utilization = maxCap24h > 0 ? ((totalVol / maxCap24h) * 100) : 0;

            html += `
                <div class="vannes-kpi-card" style="border-top: 3px solid ${meta.color}; background: ${meta.gradient};">
                    <div class="vkc-top">
                        <div class="vkc-badge-id">
                            <span class="vkc-icon">${meta.icon}</span>
                            <strong>${alias}</strong>
                        </div>
                        <span class="vkc-qmax-tag">Q_max: ${qMax.toFixed(1)} m³/h</span>
                    </div>
                    <div class="vkc-route">
                        <span>Amont: <strong>${meta.upstream}</strong></span>
                        <span style="color:var(--text-muted);">➔</span>
                        <span>Aval: <strong>${meta.downstream}</strong></span>
                    </div>
                    <div class="vkc-stats-row">
                        <div class="vkc-stat-box">
                            <div class="vkc-stat-val" style="color:${meta.color};">${totalVol.toFixed(1)} <small>m³</small></div>
                            <div class="vkc-stat-lbl">Volume 24h</div>
                        </div>
                        <div class="vkc-stat-box">
                            <div class="vkc-stat-val">${avgFlow.toFixed(1)} <small>m³/h</small></div>
                            <div class="vkc-stat-lbl">Débit Moyen</div>
                        </div>
                        <div class="vkc-stat-box">
                            <div class="vkc-stat-val">${utilization.toFixed(0)}%</div>
                            <div class="vkc-stat-lbl">Taux d'Utilisation</div>
                        </div>
                    </div>
                    <div class="vkc-progress-track">
                        <div class="vkc-progress-fill" style="width:${Math.min(utilization, 100)}%; background:${meta.color};"></div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    function renderVannesChart(results = null) {
        const canvas = document.getElementById('chart-vannes-flows');
        if (!canvas || typeof Chart === 'undefined') return;

        const ctx = canvas.getContext('2d');
        const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`);
        const vKeys = Object.keys(VANNES_GRAVITAIRES);

        const datasets = vKeys.map(key => {
            const meta = VANNES_DEFINITIONS.find(d => d.key === key) || {
                label: getLabel(key, key),
                color: '#c084fc',
                debit_max: 50
            };
            const alias = getLabel(key, meta.label);
            const qMax = VANNES_GRAVITAIRES[key]?.debit_max || meta.debit_max;
            const dataArr = currentVannesHoraires[key] || Array(24).fill(qMax);

            return {
                label: `${alias} (Q_max: ${qMax} m³/h)`,
                data: dataArr.map(v => Number(v) || 0),
                borderColor: meta.color,
                backgroundColor: meta.color + '20',
                borderWidth: 2.5,
                fill: false,
                tension: 0.25,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: meta.color
            };
        });

        if (vannesFlowChartInstance) {
            try { vannesFlowChartInstance.destroy(); } catch(e) {}
            vannesFlowChartInstance = null;
        }

        vannesFlowChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: hours, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#cbd5e1', font: { family: 'Inter', size: 11 }, usePointStyle: true }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${Number(ctx.raw).toFixed(1)} m³/h`
                        }
                    }
                },
                scales: {
                    x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } },
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } }
                }
            }
        });
    }

    function initVannesControls() {
        document.getElementById('btn-vannes-fill-max')?.addEventListener('click', () => {
            Object.keys(VANNES_GRAVITAIRES).forEach(k => {
                const qMax = VANNES_GRAVITAIRES[k]?.debit_max || 50;
                currentVannesHoraires[k] = Array(24).fill(qMax);
            });
            buildVannesGrid();
            updateVannesKpis(lastResults);
            renderVannesChart(lastResults);
            requestLiveRefresh();
            showToast('Débits maximaux (Q_max) appliqués à toutes les vannes sur 24h.', 'success');
        });

        document.getElementById('btn-vannes-preset-night')?.addEventListener('click', () => {
            const tariffData = computeDynamicTariffs();
            Object.keys(VANNES_GRAVITAIRES).forEach(k => {
                const qMax = VANNES_GRAVITAIRES[k]?.debit_max || 50;
                currentVannesHoraires[k] = Array(24).fill(0).map((_, h) => {
                    const band = tariffData.hourlyBands[h];
                    if (band === 'nuit') return qMax;
                    if (band === 'jour') return Math.round(qMax * 0.5 * 10) / 10;
                    if (band === 'matin') return Math.round(qMax * 0.2 * 10) / 10;
                    return 0;
                });
            });
            buildVannesGrid();
            updateVannesKpis(lastResults);
            renderVannesChart(lastResults);
            requestLiveRefresh();
            showToast('Stratégie Déstockage Nuit & Effacement Heures de Pointe appliquée.', 'info');
        });

        document.getElementById('btn-vannes-preset-constant')?.addEventListener('click', () => {
            Object.keys(VANNES_GRAVITAIRES).forEach(k => {
                const qMax = VANNES_GRAVITAIRES[k]?.debit_max || 50;
                currentVannesHoraires[k] = Array(24).fill(Math.round(qMax * 0.75 * 10) / 10);
            });
            buildVannesGrid();
            updateVannesKpis(lastResults);
            renderVannesChart(lastResults);
            requestLiveRefresh();
            showToast('Profil constant équilibré (75% de Q_max) appliqué.', 'info');
        });

        document.getElementById('btn-vannes-reset')?.addEventListener('click', () => {
            currentVannesHoraires = JSON.parse(JSON.stringify(DEFAULT_VANNES_HORAIRES));
            buildVannesGrid();
            updateVannesKpis(lastResults);
            renderVannesChart(lastResults);
            requestLiveRefresh();
            showToast('Débits des vannes réinitialisés aux valeurs par défaut.', 'info');
        });

        document.getElementById('btn-vannes-apply-now')?.addEventListener('click', () => {
            executeSimulation();
            showToast('Simulation recalculée avec succès.', 'success');
        });
    }

    // --- SCADA Mode & Synoptic Player ---
    function setSimMode(mode) {
        simMode = mode;
        const synM24 = document.getElementById('syn-m24');
        const synMStep = document.getElementById('syn-mstep');
        const synPBox = document.getElementById('syn-pbox');

        if (mode === '24h') {
            btnMode24h?.classList.add('active');
            btnModeStep?.classList.remove('active');
            synM24?.classList.add('active');
            synMStep?.classList.remove('active');
            if (playerControls) playerControls.style.display = 'none';
            if (synPBox) synPBox.style.display = 'none';
            stopPlayback();
            currentHourStep = 23;
            renderSynopticAtHour(23);
        } else {
            btnModeStep?.classList.add('active');
            btnMode24h?.classList.remove('active');
            synMStep?.classList.add('active');
            synM24?.classList.remove('active');
            if (playerControls) playerControls.style.display = 'flex';
            if (synPBox) synPBox.style.display = 'inline-flex';
            renderSynopticAtHour(currentHourStep);
        }
    }

    function renderSynopticAtHour(h) {
        currentHourStep = Math.max(0, Math.min(23, h));
        const hStr = `${String(currentHourStep).padStart(2, '0')}:00`;
        if (hourBadge) hourBadge.textContent = hStr;
        if (timeSlider) timeSlider.value = currentHourStep;

        const synHBadge = document.getElementById('syn-hbadge');
        const synTSlider = document.getElementById('syn-tslider');
        if (synHBadge) synHBadge.textContent = hStr;
        if (synTSlider) synTSlider.value = currentHourStep;

        const miniHourTag = document.getElementById('mini-syn-hour-tag');
        const miniHourDisplay = document.getElementById('mini-syn-hour-display');
        const miniSlider = document.getElementById('mini-syn-slider');
        if (miniHourTag) miniHourTag.textContent = `⏱️ Heure : ${hStr}`;
        if (miniHourDisplay) miniHourDisplay.textContent = hStr;
        if (miniSlider) miniSlider.value = currentHourStep;

        const sysData = lastSystemData || collectSystemData();
        const sched = lastSchedule || collectSchedule();

        if (sched && lastResults && sysData) {
            try {
                updateSynoptic(sched, lastResults, sysData, currentHourStep, customLabels);
                updateMiniSynoptic(sched, lastResults, sysData, currentHourStep, customLabels);
                updateDashboardStationTable(sysData, sched, lastResults, currentHourStep);
            } catch(e) {
                console.error("Synoptic SCADA update error:", e);
            }
        }
    }

    function togglePlayback() {
        if (playInterval) stopPlayback();
        else startPlayback();
    }

    function startPlayback() {
        if (playInterval) clearInterval(playInterval);
        const playBtns = [btnPlayPause, document.getElementById('syn-play'), document.getElementById('mini-syn-play')].filter(Boolean);
        playBtns.forEach(b => {
            b.textContent = '⏸ Pause';
            b.classList.add('btn-pause');
            b.classList.remove('btn-play');
        });

        playInterval = setInterval(() => {
            let nextH = (currentHourStep + 1) % 24;
            renderSynopticAtHour(nextH);
        }, 700);
    }

    function stopPlayback() {
        if (playInterval) {
            clearInterval(playInterval);
            playInterval = null;
        }
        const playBtns = [btnPlayPause, document.getElementById('syn-play'), document.getElementById('mini-syn-play')].filter(Boolean);
        playBtns.forEach(b => {
            b.textContent = '▶ Jouer';
            b.classList.remove('btn-pause');
            b.classList.add('btn-play');
        });
    }

    btnMode24h?.addEventListener('click', () => setSimMode('24h'));
    btnModeStep?.addEventListener('click', () => setSimMode('step'));
    btnPlayPause?.addEventListener('click', togglePlayback);
    btnStepPrev?.addEventListener('click', () => {
        stopPlayback();
        renderSynopticAtHour((currentHourStep - 1 + 24) % 24);
    });
    btnStepNext?.addEventListener('click', () => {
        stopPlayback();
        renderSynopticAtHour((currentHourStep + 1) % 24);
    });
    timeSlider?.addEventListener('input', (e) => {
        stopPlayback();
        renderSynopticAtHour(parseInt(e.target.value, 10));
    });

    setTimeout(() => {
        const synM24 = document.getElementById('syn-m24');
        const synMStep = document.getElementById('syn-mstep');
        const synPlay = document.getElementById('syn-play');
        const synPrev = document.getElementById('syn-prev');
        const synNext = document.getElementById('syn-next');
        const synTSlider = document.getElementById('syn-tslider');

        synM24?.addEventListener('click', () => setSimMode('24h'));
        synMStep?.addEventListener('click', () => setSimMode('step'));
        synPlay?.addEventListener('click', togglePlayback);
        synPrev?.addEventListener('click', () => {
            stopPlayback();
            renderSynopticAtHour((currentHourStep - 1 + 24) % 24);
        });
        synNext?.addEventListener('click', () => {
            stopPlayback();
            renderSynopticAtHour((currentHourStep + 1) % 24);
        });
        synTSlider?.addEventListener('input', (e) => {
            stopPlayback();
            renderSynopticAtHour(parseInt(e.target.value, 10));
        });

        const miniPlay = document.getElementById('mini-syn-play');
        const miniPrev = document.getElementById('mini-syn-prev');
        const miniNext = document.getElementById('mini-syn-next');
        const miniSlider = document.getElementById('mini-syn-slider');

        miniPlay?.addEventListener('click', togglePlayback);
        miniPrev?.addEventListener('click', () => {
            stopPlayback();
            renderSynopticAtHour((currentHourStep - 1 + 24) % 24);
        });
        miniNext?.addEventListener('click', () => {
            stopPlayback();
            renderSynopticAtHour((currentHourStep + 1) % 24);
        });
        miniSlider?.addEventListener('input', (e) => {
            stopPlayback();
            renderSynopticAtHour(parseInt(e.target.value, 10));
        });
    }, 300);

    // --- Data Collectors ---
    function collectSystemData() {
        document.querySelectorAll('.input-demande-moyenne').forEach(input => {
            const etage = input.dataset.etage;
            if (etage) currentDemandeMoyenne[etage] = parseFloat(input.value) || 0;
        });

        document.querySelectorAll('.input-coef').forEach(input => {
            const { etage, hour } = input.dataset;
            if (etage && hour !== undefined) {
                if (!currentCoefs[etage]) currentCoefs[etage] = Array(24).fill(1.0);
                currentCoefs[etage][parseInt(hour, 10)] = parseFloat(input.value) || 0;
            }
        });

        const dynamicDemande = {};
        for (const [etage, avgVal] of Object.entries(currentDemandeMoyenne)) {
            dynamicDemande[etage] = Array(24).fill(0);
            for (let t = 0; t < 24; t++) {
                const cVal = currentCoefs[etage]?.[t] !== undefined ? currentCoefs[etage][t] : 1.0;
                dynamicDemande[etage][t] = avgVal * cVal;
            }
        }

        const pompes = JSON.parse(JSON.stringify(POMPES));
        document.querySelectorAll('.input-pompe').forEach(input => {
            const { key, prop } = input.dataset;
            if (pompes[key] && prop) {
                pompes[key][prop] = parseFloat(input.value) || 0;
            }
        });

        const vannes = JSON.parse(JSON.stringify(VANNES_GRAVITAIRES));
        document.querySelectorAll('.input-vanne').forEach(input => {
            const { key, prop } = input.dataset;
            if (vannes[key] && prop) {
                vannes[key][prop] = parseFloat(input.value) || 0;
            }
        });

        const capacites = JSON.parse(JSON.stringify(CAPACITES));
        document.querySelectorAll('.input-capacite').forEach(input => {
            const { key, prop } = input.dataset;
            const idx = parseInt(prop, 10);
            if (capacites[key] && !isNaN(idx)) {
                capacites[key][idx] = parseFloat(input.value) || 0;
            }
        });

        const tariffData = computeDynamicTariffs();

        return {
            pompes,
            vannes,
            vannes_horaires: currentVannesHoraires,
            capacites,
            demande: dynamicDemande,
            demande_moyenne: currentDemandeMoyenne,
            coefs: currentCoefs,
            tarifs: {
                TPH: tariffData.hourlyRates,
                TU: tariffData.cout_TU,
                hourlyBands: tariffData.hourlyBands,
                prices: tariffData.prices
            }
        };
    }

    function collectSchedule() {
        const schedule = {};
        document.querySelectorAll('.schedule-checkbox').forEach(cb => {
            const { itemKey, hour } = cb.dataset;
            if (!schedule[itemKey]) schedule[itemKey] = Array(24).fill(0);
            schedule[itemKey][hour] = cb.checked ? 1 : 0;
        });
        return schedule;
    }

    btnApplyDemands?.addEventListener('click', () => {
        executeSimulation();
        showToast('Demandes moyennes et coefficients horaires appliqués avec succès.', 'success');
    });

    document.getElementById('btn-apply-tariffs')?.addEventListener('click', () => {
        renderTariffTimelineBar();
        buildScheduleGrid(collectSchedule());
        executeSimulation();
        showToast('Plages horaires et tarifs STEG appliqués avec succès.', 'success');
    });

    function setElText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    // --- Main Simulation Execution ---
    function executeSimulation(showModal = true, localOnly = false) {
        if (showModal) {
            showLoading('Calcul en cours...', 'Simulation du bilan hydraulique et des coûts énergétiques...');
        }
        
        const runLogic = async () => {
            try {
                const system_data = collectSystemData();
                const schedule = collectSchedule();
                
                try {
                    AppState.dispatch({ type: 'UPDATE_SYSTEM_DATA', payload: system_data });
                    AppState.dispatch({ type: 'UPDATE_SCHEDULE', payload: schedule });
                } catch (e) {}

                let results = null;

                if (localOnly) {
                    results = runSimulation(system_data, schedule);
                } else {
                    try {
                        let resp = await fetch('/api/simulate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ system_data, schedule })
                        });
                        if (resp && resp.ok) {
                            results = await resp.json();
                        } else {
                            results = runSimulation(system_data, schedule);
                        }
                    } catch (err) {
                        results = runSimulation(system_data, schedule);
                    }
                }

                if (!results || typeof results !== 'object') {
                    results = { total_cost: 0, volume_evolution: {}, errors: [] };
                } else {
                    if (!Array.isArray(results.errors)) results.errors = results.errors ? [String(results.errors)] : [];
                    if (typeof results.total_cost !== 'number') results.total_cost = Number(results.total_cost) || 0;
                    if (!results.volume_evolution || typeof results.volume_evolution !== 'object') results.volume_evolution = {};
                }

                lastSystemData = system_data;
                lastSchedule = schedule;
                lastResults = results;

                try { AppState.dispatch({ type: 'SET_SIMULATION_RESULT', payload: results }); } catch (e) {}

                // Update UI Components
                updateKpis(system_data, schedule, results);
                renderSCADACharts(system_data, schedule, results);
                updateDataSciencePane(system_data, schedule, results);
                updateProAnalyserPane(system_data, schedule, results);
                updateVannesKpis(results);
                renderVannesChart(results);
                buildDetailedResultsTable(results, system_data);
                updateDashboardStationTable(system_data, schedule, results, currentHourStep);

                // Synchroniser les nouveaux modules EPANET & SIG
                try {
                    if (epanetViewer) epanetViewer.updateData(schedule, results, system_data);
                    if (gisViewer) gisViewer.updateTelemetry(results);
                } catch(vSyncErr) {
                    console.warn("Viewers sync notice:", vSyncErr);
                }

                // Update SVG SCADA Synoptics
                renderSynopticAtHour(simMode === 'step' ? currentHourStep : 23);

                // Update status badge
                const statusBadge = document.getElementById('system-status-badge');
                const statusText = document.getElementById('system-status-text');
                if (statusBadge && statusText) {
                    if (results.errors.length === 0) {
                        statusBadge.className = 'system-status-badge';
                        statusText.textContent = 'SYSTÈME NOMINAL (0 Alerte)';
                        if (showModal && !localOnly) showToast('Simulation terminée avec succès. Aucun débordement ni V_min violé.', 'success');
                    } else {
                        statusBadge.className = 'system-status-badge warning';
                        statusText.textContent = `ALERTES NIVEAU (${results.errors.length})`;
                        if (!localOnly && showModal) {
                            showToast(`Simulation terminée. ${results.errors.length} alerte(s) détectée(s).`, 'warning');
                        }
                    }
                }
            } catch (err) {
                console.error("Simulation error:", err);
                if (showModal) showToast(`Erreur simulation: ${err.message}`, 'danger');
            } finally {
                if (showModal) hideLoading();
            }
        };

        if (showModal) {
            setTimeout(runLogic, 50);
        } else {
            runLogic();
        }
    }

    // --- Dynamic Circular Donut Gauges & Top KPIs ---
    function updateKpis(systemData, schedule, results) {
        let totalEnergy = 0;
        let totalVolumePumped = 0;
        let totalVolumeDist = 0;

        for (let t = 0; t < 24; t++) {
            for (const [pmpKey, pmpVal] of Object.entries(systemData.pompes || {})) {
                if (schedule[pmpKey]?.[t]) {
                    totalEnergy += pmpVal.puissance || 0;
                    totalVolumePumped += pmpVal.debit || 0;
                }
            }
            for (const [_, demands] of Object.entries(systemData.demande || {})) {
                totalVolumeDist += demands[t] || 0;
            }
        }

        const activePumpsSet = new Set();
        for (const [pmpKey, pmpVal] of Object.entries(systemData.pompes || {})) {
            for (let t = 0; t < 24; t++) {
                if (schedule[pmpKey]?.[t]) {
                    activePumpsSet.add(pmpKey);
                    break;
                }
            }
        }
        const activePumpsCount = activePumpsSet.size;
        const specEnergy = totalVolumePumped > 0 ? (totalEnergy / totalVolumePumped) : 0;
        const avgCostM3 = totalVolumePumped > 0 ? (results.total_cost / totalVolumePumped) : 0;

        setElText('kpi-cost', `${results.total_cost.toFixed(2)} DT`);
        setElText('kpi-energy', `${Math.round(totalEnergy).toLocaleString()} kWh`);
        setElText('kpi-volume-pumped', `${Math.round(totalVolumePumped).toLocaleString()} m³`);
        setElText('kpi-volume-dist', `${Math.round(totalVolumeDist).toLocaleString()} m³`);
        setElText('kpi-spec-energy', `${specEnergy.toFixed(3)} kWh/m³`);
        setElText('kpi-avg-cost-m3', `${avgCostM3.toFixed(3)} DT/m³`);
        setElText('kpi-active-pumps', `${activePumpsCount} / 38`);

        // Pro Technical Strip KPIs
        const baselineCost = 5240;
        const currentCost = results.total_cost || 0;
        const savingsPct = baselineCost > 0 ? ((baselineCost - currentCost) / baselineCost * 100) : 0;
        const deltaDt = baselineCost - currentCost;
        const compliantCount = results.compliant_reservoirs_count !== undefined ? results.compliant_reservoirs_count : (results.errors.length === 0 ? 12 : Math.max(0, 12 - results.errors.length));
        const demandSat = results.demand_satisfaction_pct !== undefined ? results.demand_satisfaction_pct : 100.0;
        const switchesCount = results.switching_count !== undefined ? results.switching_count : 35;
        const nightHrs = results.night_pumping_hours !== undefined ? results.night_pumping_hours : 168;
        const peakHrs = results.peak_pumping_hours !== undefined ? results.peak_pumping_hours : 12;
        const hydStatus = results.hydraulic_status || (results.errors.length === 0 ? 'VALIDE' : 'ATTENTION');

        setElText('kpi-savings-val', `${savingsPct >= 0 ? '-' : '+'}${Math.abs(savingsPct).toFixed(1)}% (${deltaDt >= 0 ? '-' : '+'}${Math.abs(deltaDt).toFixed(0)} DT)`);
        setElText('kpi-tanks-compliance', `${compliantCount} / 12 (Vmin ≤ V ≤ Vmax)`);
        setElText('kpi-demand-satisfaction', `${demandSat.toFixed(1)}% (7 Étages E1→E7)`);
        setElText('kpi-switching-total', `${switchesCount} cycles / 24h`);
        setElText('kpi-night-peak-hours', `${nightHrs}h Nuit · ${peakHrs}h Pointe`);

        const hydStatusTag = document.getElementById('kpi-hydraulic-status-tag');
        if (hydStatusTag) {
            hydStatusTag.textContent = `${hydStatus} ${hydStatus === 'VALIDE' ? '🟢' : (hydStatus === 'ATTENTION' ? '🟡' : '🔴')}`;
            hydStatusTag.className = hydStatus === 'VALIDE' ? 'status-badge-valide' : (hydStatus === 'ATTENTION' ? 'status-badge-attention' : 'status-badge-invalide');
        }
        
        const alertFoot = document.getElementById('kpi-alerts-foot');
        const alertCountEl = document.getElementById('kpi-alerts-count');
        if (alertCountEl) alertCountEl.textContent = results.errors.length;
        
        if (alertFoot) {
            if (results.errors.length === 0) {
                alertFoot.textContent = "Tous réservoirs nominal";
                alertFoot.className = "kpi-footer";
            } else {
                alertFoot.textContent = `${results.errors.length} débordements / V_min`;
                alertFoot.className = "kpi-footer danger";
            }
        }

        // Animate 4 Donut Gauges SVG Circles
        const C = 157.08; // Circumference for r=25

        // Gauge 1: Coût Total (Budget ref 5000 DT)
        const costPct = Math.min(100, Math.max(5, Math.round((results.total_cost / 5000) * 100)));
        const g1 = document.querySelector('.metric-gauge-card:nth-child(1) .gauge-progress-circle');
        const g1Txt = document.querySelector('.metric-gauge-card:nth-child(1) .gauge-percentage-text');
        if (g1) g1.style.strokeDashoffset = (C * (1 - costPct / 100)).toFixed(1);
        if (g1Txt) g1Txt.textContent = `${costPct}%`;

        // Gauge 2: Volume Distribué (Cible ref 20000 m³)
        const volPct = Math.min(100, Math.max(5, Math.round((totalVolumeDist / 20000) * 100)));
        const g2 = document.querySelector('.metric-gauge-card:nth-child(2) .gauge-progress-circle');
        const g2Txt = document.querySelector('.metric-gauge-card:nth-child(2) .gauge-percentage-text');
        if (g2) g2.style.strokeDashoffset = (C * (1 - volPct / 100)).toFixed(1);
        if (g2Txt) g2Txt.textContent = `${volPct}%`;

        // Gauge 3: Énergie Totale (Ref 20000 kWh)
        const nrgPct = Math.min(100, Math.max(5, Math.round((totalEnergy / 20000) * 100)));
        const g3 = document.querySelector('.metric-gauge-card:nth-child(3) .gauge-progress-circle');
        const g3Txt = document.querySelector('.metric-gauge-card:nth-child(3) .gauge-percentage-text');
        if (g3) g3.style.strokeDashoffset = (C * (1 - nrgPct / 100)).toFixed(1);
        if (g3Txt) g3Txt.textContent = `${nrgPct}%`;

        // Gauge 4: Conso Spécifique (Rendement Index)
        const specEff = Math.min(100, Math.max(10, Math.round((0.85 / (specEnergy || 0.85)) * 80)));
        const g4 = document.querySelector('.metric-gauge-card:nth-child(4) .gauge-progress-circle');
        const g4Txt = document.querySelector('.metric-gauge-card:nth-child(4) .gauge-percentage-text');
        if (g4) g4.style.strokeDashoffset = (C * (1 - specEff / 100)).toFixed(1);
        if (g4Txt) g4Txt.textContent = `${specEff}%`;
    }

    // --- Live Dashboard SCADA Status Table ---
    function updateDashboardStationTable(systemData, schedule, results, currentHour = 23) {
        const tableBody = document.querySelector('#pane-dashboard .dark-scada-table tbody');
        if (!tableBody) return;

        const pompes = (systemData && systemData.pompes) ? systemData.pompes : POMPES;
        const vannes = (systemData && systemData.vannes) ? systemData.vannes : VANNES_GRAVITAIRES;
        const h = Math.max(0, Math.min(23, currentHour));

        let fFlow = 0, fPwr = 0, fCount = 0;
        for (let i = 1; i <= 12; i++) {
            const k = `F${i}_R500`;
            if (schedule[k]?.[h]) {
                fFlow += pompes[k]?.debit || 0;
                fPwr += pompes[k]?.puissance || 0;
                fCount++;
            }
        }

        const r500_r6_p1 = schedule['R500_to_R6_P1']?.[h] ? 1 : 0;
        const r500_r6_p2 = schedule['R500_to_R6_P2']?.[h] ? 1 : 0;
        const r500_r6_flow = (r500_r6_p1 * (pompes['R500_to_R6_P1']?.debit || 0)) + (r500_r6_p2 * (pompes['R500_to_R6_P2']?.debit || 0));
        const r500_r6_pwr = (r500_r6_p1 * (pompes['R500_to_R6_P1']?.puissance || 0)) + (r500_r6_p2 * (pompes['R500_to_R6_P2']?.puissance || 0));

        const r6_r1_p1 = schedule['R6_to_R1_P1']?.[h] ? 1 : 0;
        const r6_r1_p2 = schedule['R6_to_R1_P2']?.[h] ? 1 : 0;
        const r6_r1_flow = (r6_r1_p1 * (pompes['R6_to_R1_P1']?.debit || 0)) + (r6_r1_p2 * (pompes['R6_to_R1_P2']?.debit || 0));
        const r6_r1_pwr = (r6_r1_p1 * (pompes['R6_to_R1_P1']?.puissance || 0)) + (r6_r1_p2 * (pompes['R6_to_R1_P2']?.puissance || 0));

        const ain_flow = (schedule['Ain_Bidha_to_Zaaf_P1']?.[h] ? (pompes['Ain_Bidha_to_Zaaf_P1']?.debit || 0) : 0) +
                         (schedule['Ain_Bidha_to_Zaaf_P2']?.[h] ? (pompes['Ain_Bidha_to_Zaaf_P2']?.debit || 0) : 0);
        const ain_pwr = (schedule['Ain_Bidha_to_Zaaf_P1']?.[h] ? (pompes['Ain_Bidha_to_Zaaf_P1']?.puissance || 0) : 0) +
                        (schedule['Ain_Bidha_to_Zaaf_P2']?.[h] ? (pompes['Ain_Bidha_to_Zaaf_P2']?.puissance || 0) : 0);

        const sk_flow = (schedule['SK10_to_R6_P1']?.[h] ? (pompes['SK10_to_R6_P1']?.debit || 0) : 0);
        const sk_pwr = (schedule['SK10_to_R6_P1']?.[h] ? (pompes['SK10_to_R6_P1']?.puissance || 0) : 0);

        let vannesFlow = 0;
        Object.keys(vannes).forEach(vk => {
            if (currentVannesHoraires && currentVannesHoraires[vk]) {
                vannesFlow += (currentVannesHoraires[vk][h] || 0);
            } else if (schedule[vk]?.[h]) {
                vannesFlow += (vannes[vk]?.debit_max || 0);
            }
        });

        tableBody.innerHTML = `
            <tr>
                <td><strong style="color:#fff;">Forages R500 (F1→F12)</strong> <small style="color:var(--text-muted);">(${fCount}/12 Actifs)</small></td>
                <td><span style="color:var(--cyan-accent); font-weight:700;">${fFlow.toFixed(1)} m³/h</span></td>
                <td><span>52.4 mCE</span></td>
                <td><span style="color:#10b981;">${fPwr.toFixed(1)} kW</span></td>
                <td><span class="badge-status ${fCount > 0 ? 'active' : 'idle'}">${fCount > 0 ? '⚡ EN MARCHE' : '⚪ STANDBY'}</span></td>
            </tr>
            <tr>
                <td><strong style="color:#fff;">Relais R500 → R6 (Abida P1/P2)</strong></td>
                <td><span style="color:var(--cyan-accent); font-weight:700;">${r500_r6_flow.toFixed(1)} m³/h</span></td>
                <td><span>78.1 mCE</span></td>
                <td><span style="color:#10b981;">${r500_r6_pwr.toFixed(1)} kW</span></td>
                <td><span class="badge-status ${r500_r6_flow > 0 ? 'active' : 'idle'}">${r500_r6_flow > 0 ? '⚡ EN MARCHE' : '⚪ STANDBY'}</span></td>
            </tr>
            <tr>
                <td><strong style="color:#fff;">Relais R6 → R1 (Bâche P1/P2)</strong></td>
                <td><span style="color:var(--cyan-accent); font-weight:700;">${r6_r1_flow.toFixed(1)} m³/h</span></td>
                <td><span>64.0 mCE</span></td>
                <td><span style="color:#10b981;">${r6_r1_pwr.toFixed(1)} kW</span></td>
                <td><span class="badge-status ${r6_r1_flow > 0 ? 'active' : 'idle'}">${r6_r1_flow > 0 ? '⚡ EN MARCHE' : '⚪ STANDBY'}</span></td>
            </tr>
            <tr>
                <td><strong style="color:#fff;">Aïn Bidha → Zaafrane (G1/G2)</strong></td>
                <td><span style="color:var(--cyan-accent); font-weight:700;">${ain_flow.toFixed(1)} m³/h</span></td>
                <td><span>42.0 mCE</span></td>
                <td><span style="color:#10b981;">${ain_pwr.toFixed(1)} kW</span></td>
                <td><span class="badge-status ${ain_flow > 0 ? 'active' : 'idle'}">${ain_flow > 0 ? '⚡ EN MARCHE' : '⚪ STANDBY'}</span></td>
            </tr>
            <tr>
                <td><strong style="color:#fff;">SK10 Relais → R6</strong></td>
                <td><span style="color:var(--cyan-accent); font-weight:700;">${sk_flow.toFixed(1)} m³/h</span></td>
                <td><span>36.0 mCE</span></td>
                <td><span style="color:#10b981;">${sk_pwr.toFixed(1)} kW</span></td>
                <td><span class="badge-status ${sk_flow > 0 ? 'active' : 'idle'}">${sk_flow > 0 ? '⚡ EN MARCHE' : '⚪ STANDBY'}</span></td>
            </tr>
            <tr>
                <td><strong style="color:#fff;">Vannes Gravitaires (R6, R1, R3, Romaine)</strong></td>
                <td><span style="color:var(--cyan-accent); font-weight:700;">${vannesFlow.toFixed(1)} m³/h</span></td>
                <td><span>Gravitaire</span></td>
                <td><span style="color:#a855f7;">0.0 kW (0 DT)</span></td>
                <td><span class="badge-status active">💧 GRAVITAIRE RÉGULÉ</span></td>
            </tr>
        `;
    }

    // --- Render SCADA Dashboard Charts ---
    function renderSCADACharts(systemData, schedule, results) {
        try {
            renderReservoirVolumeCharts('reservoir-charts-dash', results, systemData.capacites);
            renderReservoirVolumeCharts('reservoir-charts-grid', results, systemData.capacites);
            renderHydraulicFlowChart('chart-flow-balance', systemData, schedule);
            renderRadarPerformanceChart('chart-radar-performance', systemData, schedule, results);
            renderTarifRepartitionChart('chart-tarif-repartition', systemData, schedule);
            renderCumulativeCostVolumeChart('chart-cumul-cost-vol', systemData, schedule);
            renderEtageSupplyPolarChart('chart-etage-polar', systemData, schedule);
            renderEtageDemandStackedChart('chart-etage-demand-stacked', systemData, schedule);
        } catch(e) {
            console.warn("SCADA chart render error:", e);
        }
    }

    // --- Data Science Pane Analytics Renderer ---
    function updateDataSciencePane(systemData, schedule, results) {
        let totalEnergy = 0;
        let totalVolumePumped = 0;
        let totalVolumeDist = 0;
        let powerMax = 0;
        let nightPower = 0;
        const pumpHours = {};

        for (let t = 0; t < 24; t++) {
            let hourlyPwr = 0;
            for (const [pmpKey, pmpVal] of Object.entries(systemData.pompes || {})) {
                const isOn = schedule[pmpKey]?.[t];
                if (isOn) {
                    hourlyPwr += pmpVal.puissance || 0;
                    pumpHours[pmpKey] = (pumpHours[pmpKey] || 0) + 1;
                }
            }
            if (hourlyPwr > powerMax) powerMax = hourlyPwr;
            if (t >= 23 || t < 8) nightPower += hourlyPwr;
        }

        for (let t = 0; t < 24; t++) {
            for (const [pmpKey, pmpVal] of Object.entries(systemData.pompes || {})) {
                if (schedule[pmpKey]?.[t]) {
                    totalEnergy += pmpVal.puissance || 0;
                    totalVolumePumped += pmpVal.debit || 0;
                }
            }
            for (const [_, demands] of Object.entries(systemData.demande || {})) {
                totalVolumeDist += demands[t] || 0;
            }
        }

        const avgCostM3 = totalVolumePumped > 0 ? (results.total_cost / totalVolumePumped) : 0;
        const nightRatio = totalEnergy > 0 ? ((nightPower / totalEnergy) * 100).toFixed(1) : 0;

        setElText('ds-energy-total', `${Math.round(totalEnergy).toLocaleString()} kWh`);
        setElText('ds-power-max', `${Math.round(powerMax)} kW`);
        setElText('ds-spec-energy', `${(totalVolumePumped > 0 ? totalEnergy / totalVolumePumped : 0).toFixed(3)} kWh/m³`);
        setElText('ds-night-ratio', `${nightRatio} % (HC)`);
        renderEnergyPowerChart('chart-energy-power', systemData, schedule);

        setElText('ds-vol-pumped', `${Math.round(totalVolumePumped).toLocaleString()} m³`);
        setElText('ds-vol-dist', `${Math.round(totalVolumeDist).toLocaleString()} m³`);
        const diffVol = totalVolumePumped - totalVolumeDist;
        setElText('ds-vol-diff', `${diffVol > 0 ? '+' : ''}${Math.round(diffVol)} m³`);

        // Fill Rate Bars — couleurs par réservoir + libellés "zone alimenté par Rx"
        const resBarContainer = document.getElementById('ds-reservoir-bars');
        const RESERVOIR_COLORS = {
            "R500": "#06b6d4", "R6": "#3b82f6", "R5": "#6366f1",
            "R1": "#8b5cf6", "R2": "#ec4899", "R3": "#10b981",
            "R7": "#f59e0b", "R10": "#14b8a6",
            "ST_Ain_Bidha": "#0284c7", "ST_Zaafrane": "#0891b2",
            "ST_Birchagroun": "#059669", "ST_SK10_Relais": "#7c3aed"
        };
        if (resBarContainer) {
            let resBarHtml = '';
            const orderedResKeys = ["R500","R6","R1","R5","R3","R2","R7","R10","ST_Ain_Bidha","ST_Zaafrane","ST_Birchagroun","ST_SK10_Relais"];
            const volEvol = results.volume_evolution || {};
            orderedResKeys.forEach(resKey => {
                if (!(resKey in volEvol)) return;
                const volumes = volEvol[resKey];
                const finalVol = volumes[volumes.length - 1] || 0;
                const maxCap = systemData.capacites[resKey]?.[1] || 1000;
                const minCap = systemData.capacites[resKey]?.[0] || 0;
                const pct = Math.min(100, Math.round((finalVol / maxCap) * 100));
                const statusClass = pct < 20 ? 'danger' : pct > 90 ? 'warning' : '';
                const alias = getLabel(resKey, resKey);
                const color = RESERVOIR_COLORS[resKey] || '#06b6d4';
                const feederRes = ETAGE_FEEDERS_LIST.find(([_, r]) => r === resKey);
                const etageText = feederRes ? ` zone alimenté par ${feederRes[1]}` : '';
                resBarHtml += `
                    <div class="progress-bar-container" style="--pb-color: ${color};">
                        <div class="progress-bar-label">
                            <span><strong>${alias}</strong> <small>(${resKey})</small>${etageText ? '<small style="color:var(--text-muted); display:block; font-size:0.7rem;">' + etageText + '</small>' : ''}</span>
                            <span style="color:${color}; font-weight:700;">${finalVol.toFixed(0)} / ${maxCap} m³ (${pct}%)</span>
                        </div>
                        <div class="progress-bar-track">
                            <div class="progress-bar-fill ${statusClass}" style="width: ${pct}%; background:${color}; box-shadow:0 0 8px ${color};"></div>
                        </div>
                    </div>
                `;
            });
            resBarContainer.innerHTML = resBarHtml;
        }

        setElText('ds-cost-total', `${results.total_cost.toFixed(2)} TND`);
        setElText('ds-cost-m3', `${avgCostM3.toFixed(3)} TND/m³`);
        renderCostBreakdownChart('chart-cost-breakdown', systemData, schedule);

        const sortedPumps = Object.entries(pumpHours).sort((a, b) => b[1] - a[1]);
        const top3Pumps = sortedPumps.slice(0, 3).map(([k, h]) => `${getLabel(k, k)} (${h}h)`).join(', ') || 'Aucune';
        const unusedPumps = Object.keys(systemData.pompes || {}).filter(k => !pumpHours[k]);
        const unusedStr = unusedPumps.length > 0 ? `${unusedPumps.length} pompes (${unusedPumps.slice(0, 3).map(k => getLabel(k, k)).join(', ')}...)` : 'Toutes utilisées';

        setElText('ds-top-pumps', top3Pumps);
        setElText('ds-unused-pumps', unusedStr);
        setElText('ds-critical-res', results.errors.length > 0 ? `${results.errors.length} alerte(s)` : 'Aucun (Nominal)');
        
        renderSpecificEnergyChart('chart-spec-energy-pumps', systemData, schedule);
        buildDataScienceHeatmapMatrix(systemData, schedule);
        renderParetoChart('chart-pareto-energy', systemData, schedule);
        buildCentralityMatrix(systemData);
        renderReservoirVolumeCharts('reservoir-charts-grid', results, systemData.capacites);
        renderEtageFeederDonutChart('chart-etage-feeder-donut', systemData, schedule);
        renderEtageRankingBarChart('chart-etage-ranking-bar', systemData, schedule);
    }

    function buildDataScienceHeatmapMatrix(systemData, schedule) {
        const container = document.getElementById('ds-heatmap-matrix-container') || document.getElementById('ds-heatmap-matrix');
        if (!container) return;

        const hours = Array.from({ length: 24 }, (_, i) => i);
        const tariffData = computeDynamicTariffs();
        const pmpKeys = Object.keys(systemData.pompes || {});

        // Ordre DÉCROISSANT : trier les équipements par nombre d'heures d'activation (Total ON)
        const keyOnHours = {};
        pmpKeys.forEach(k => {
            let hSum = 0;
            for (let t = 0; t < 24; t++) if ((schedule[k]?.[t] || 0) === 1) hSum++;
            keyOnHours[k] = hSum;
        });
        pmpKeys.sort((a, b) => (keyOnHours[b] || 0) - (keyOnHours[a] || 0));

        let html = `<table class="schedule-table vannes-matrix-table" style="font-size:0.75rem;">
            <thead>
                <tr>
                    <th style="min-width:140px; text-align:left;">Équipement</th>`;
        hours.forEach(h => {
            const band = tariffData.hourlyBands[h];
            const zoneClass = BAND_ZONE[band] || 'zone-jour';
            html += `<th class="${zoneClass}" style="text-align:center; padding:4px 2px; min-width:32px;">${String(h).padStart(2, '0')}h</th>`;
        });
        html += `<th style="text-align:center; min-width:65px;">Total ON</th></tr></thead><tbody>`;

        pmpKeys.forEach((key, rIdx) => {
            const alias = getLabel(key, key);
            let totalH = 0;
            const rowCls = rIdx % 2 === 0 ? 'row-even' : 'row-odd';
            html += `<tr class="${rowCls}"><td style="padding:6px 8px; font-weight:600;"><span style="color:#06b6d4;">⚙️</span> <strong>${alias}</strong> <small style="color:var(--text-muted); display:block; font-size:0.65rem;">${key}</small></td>`;
            for (let t = 0; t < 24; t++) {
                const isOn = (schedule[key]?.[t] || 0) === 1;
                if (isOn) totalH++;
                const band = tariffData.hourlyBands[t];
                const zoneClass = BAND_ZONE[band] || 'zone-jour';
                const cellBg = isOn ? 'background:rgba(6, 182, 212, 0.45); color:#fff; font-weight:800;' : 'background:transparent; color:#475569;';
                html += `<td class="${zoneClass}" style="${cellBg} text-align:center; font-family:var(--font-mono); font-size:0.75rem;">${isOn ? '1' : '0'}</td>`;
            }
            html += `<td style="text-align:center; font-weight:800; font-family:var(--font-mono); color:#38bdf8; background:rgba(6,182,212,0.12);"><span class="badge-hours badge-on">${totalH}h</span></td></tr>`;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    function buildCentralityMatrix(systemData) {
        const container = document.getElementById('ds-centrality-container') || document.getElementById('ds-centrality-matrix');
        if (!container) return;

        const nodes = [
            { id: "R6 (Stockage Pivot Central)", type: "Réservoir Principal", centrality: "0.85 (Très Élevée)", capacity: "5 000 m³", impact: "Nœud critique alimentant l'étage alimenté par R6 et relayant vers R1 & R5", color: "#3b82f6" },
            { id: "R1 (Nœud Stratégique de Relais)", type: "Réservoir de Relais", centrality: "0.82 (Très Élevée)", capacity: "500 m³", impact: "Distribution de la zone alimentée par R1, et alimente sous pression R2, R3 et gravitairement R7", color: "#8b5cf6" },
            { id: "R500 (Bâche de Captation)", type: "Bâche de Convergence", centrality: "0.78 (Élevée)", capacity: "500 m³", impact: "Point de convergence des 12 forages profonds avant refoulement vers R6", color: "#06b6d4" },
            { id: "R5 (Zone de Consommation)", type: "Réservoir d'Étage", centrality: "0.45 (Moyenne)", capacity: "1 500 m³", impact: "Alimentation gravitaire continue de la zone alimentée par R5 (zone sud)", color: "#ec4899" },
            { id: "R3 (Relais vers R10)", type: "Réservoir d'Étage", centrality: "0.42 (Moyenne)", capacity: "500 m³", impact: "Couverture de la zone alimentée par R3 et transfert gravitaire vers le réservoir terminal R10", color: "#10b981" }
        ];

        let html = '<div style="display:flex; flex-direction:column; gap:0.6rem;">';
        nodes.forEach(node => {
            html += `
                <div style="background:rgba(20, 21, 48, 0.6); border:1px solid rgba(255,255,255,0.08); border-left:4px solid ${node.color}; padding:0.75rem 0.9rem; border-radius:var(--radius-sm); transition:all 0.2s ease;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem; flex-wrap:wrap; gap:0.4rem;">
                        <span style="font-weight:700; color:#e2e8f0; font-size:0.88rem;">🏛️ ${node.id}</span>
                        <span style="font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:6px; background:${node.color}22; color:${node.color}; border:1px solid ${node.color}55;">Centralité : ${node.centrality}</span>
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.2rem;">Type : <strong>${node.type}</strong> (${node.capacity})</div>
                    <div style="font-size:0.75rem; color:#94a3b8; line-height:1.4;">${node.impact}</div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    }

    // --- Detailed 24h Hydraulic Table Builder ---
    function buildDetailedResultsTable(results, systemData) {
        const table = document.getElementById('detailed-results-table');
        if (!table) return;

        const volEvol = (results && results.volume_evolution) ? results.volume_evolution : {};
        const resKeys = Object.keys(volEvol).length > 0 ? Object.keys(volEvol) : Object.keys(CAPACITES);
        const tData = computeDynamicTariffs();

        let html = `<thead>
            <tr>
                <th class="tbl-idx" style="width:45px;">N°</th>
                <th class="tbl-equip" style="min-width:180px;">Réservoir / Ouvrage</th>`;
        for (let h = 0; h < 24; h++) {
            const band = tData.hourlyBands[h];
            const zc = BAND_ZONE[band] || 'zone-jour';
            html += `<th class="${zc}" style="text-align:center; min-width:48px;" title="${band.toUpperCase()} · ${tData.hourlyRates[h].toFixed(3)} TND/kWh">
                <span>${String(h).padStart(2, '0')}h</span>
            </th>`;
        }
        html += `<th class="tbl-stat" style="min-width:160px; text-align:center;">Statut & Plage 24h</th></tr></thead>`;
        html += '<tbody id="detailed-results-tbody">';

        resKeys.forEach((k, idx) => {
            const alias = getLabel(k, k);
            const cap = systemData?.capacites?.[k] || CAPACITES[k] || [0, 1000, 500];
            const [vmin, vmax, vinit] = cap;
            let rowAlerts = 0;
            let minV = Infinity, maxV = -Infinity;

            let rowCells = '';
            for (let h = 0; h < 24; h++) {
                const vol = volEvol[k]?.[h];
                const valStr = vol !== undefined ? vol.toFixed(1) : '--';
                let cellCls = 'cell-ok';
                const band = tData.hourlyBands[h];
                const zc = BAND_ZONE[band] || 'zone-jour';

                if (vol !== undefined) {
                    minV = Math.min(minV, vol);
                    maxV = Math.max(maxV, vol);
                    if (vol < vmin || vol > vmax) {
                        cellCls = 'cell-alert';
                        rowAlerts++;
                    } else {
                        const margin = (vmax - vmin) * 0.08;
                        if (vol - vmin < margin || vmax - vol < margin) {
                            cellCls = 'cell-warn';
                        }
                    }
                }
                rowCells += `<td class="tbl-vol ${zc} ${cellCls}" title="${alias} · ${String(h).padStart(2, '0')}:00 = ${valStr} m³ (Vmin:${vmin} m³ / Vmax:${vmax} m³)">${valStr}</td>`;
            }

            const statBadge = rowAlerts > 0
                ? `<span class="res-stat res-stat-alert" style="color:#ef4444; font-weight:700;">⚠️ ${rowAlerts}h en alerte</span>`
                : `<span class="res-stat res-stat-ok" style="color:#10b981; font-weight:700;">✅ 100% Conforme</span>`;
            const rangeTxt = minV !== Infinity ? `${minV.toFixed(0)} – ${maxV.toFixed(0)} m³` : '--';

            html += `
                <tr class="table-data-row ${idx % 2 === 0 ? 'row-even' : 'row-odd'}" data-res-index="${k}">
                    <td class="tbl-idx" style="text-align:center; font-family:var(--font-mono);">${String(idx + 1).padStart(2, '0')}</td>
                    <td class="tbl-equip" title="${k}">
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span style="color:#38bdf8; font-size:1rem;">💧</span>
                            <div>
                                <strong style="color:#fff; font-size:0.85rem;">${alias}</strong>
                                <small style="display:block; font-size:0.68rem; color:var(--text-muted); font-family:var(--font-mono);">${k} · [${vmin}–${vmax} m³]</small>
                            </div>
                        </div>
                    </td>
                    ${rowCells}
                    <td class="tbl-stat" style="text-align:center;">
                        ${statBadge}
                        <small style="display:block; font-size:0.68rem; color:var(--text-muted); font-family:var(--font-mono); margin-top:2px;">Min-Max: <strong>${rangeTxt}</strong></small>
                    </td>
                </tr>`;
        });

        html += '</tbody></table>';
        table.innerHTML = html;
    }

    const tableSearchInput = document.getElementById('table-search-filter');
    tableSearchInput?.addEventListener('input', (e) => {
        const query = (e.target.value || '').toLowerCase().trim();
        const table = document.getElementById('detailed-results-table');
        if (!table) return;
        table.querySelectorAll('tbody tr').forEach(r => {
            const hay = `${r.getAttribute('data-res-index') || ''} ${r.textContent}`.toLowerCase();
            r.style.display = (!query || hay.includes(query)) ? '' : 'none';
        });
    });

    document.getElementById('btn-export-table-csv')?.addEventListener('click', () => {
        const table = document.getElementById('detailed-results-table');
        if (!table) return;
        let csv = [];
        table.querySelectorAll('tr').forEach(r => {
            let row = [];
            r.querySelectorAll('th, td').forEach(c => row.push(`"${c.textContent.trim()}"`));
            csv.push(row.join(';'));
        });
        const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AquaData_Bilan_Hydraulique_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        showToast('Grand Livre Hydraulique exporté avec succès.', 'success');
    });

    // --- Excel Toolbar Bindings ---
    document.getElementById('excel-btn-add-row')?.addEventListener('click', () => {
        if (dataGridInstance) {
            dataGridInstance.addRow();
            showToast('➕ Ligne ajoutée au tableur.', 'info');
        }
    });

    document.getElementById('excel-btn-add-col')?.addEventListener('click', () => {
        if (dataGridInstance) {
            dataGridInstance.addCol();
            showToast('➕ Colonne ajoutée au tableur.', 'info');
        }
    });

    document.getElementById('excel-btn-del-row')?.addEventListener('click', () => {
        if (dataGridInstance) {
            dataGridInstance.delRow();
            showToast('➖ Ligne supprimée du tableur.', 'info');
        }
    });

    document.getElementById('excel-btn-del-col')?.addEventListener('click', () => {
        if (dataGridInstance) {
            dataGridInstance.delCol();
            showToast('➖ Colonne supprimée du tableur.', 'info');
        }
    });

    document.getElementById('excel-preset-energy')?.addEventListener('click', () => {
        if (!dataGridInstance) return;
        const rows = [
            ['Station / Equipement', 'Puissance (kW)', 'Débit (m³/h)', 'Heures Nuit (h)', 'Conso (kWh)', 'Coût STEG (TND)'],
            ['Forages R500 (F1-F12)', 350.1, 786.6, 12, '=B2*D2', '=E2*0.222'],
            ['Relais R500 -> R6', 258.0, 1051.2, 8, '=B3*D3', '=E3*0.222'],
            ['Relais R6 -> R1', 287.4, 756.0, 6, '=B4*D4', '=E4*0.290'],
            ['Station Ain Bidha -> Zaaf', 28.5, 93.6, 10, '=B5*D5', '=E5*0.222'],
            ['Total Général Réseau', '=SOMME(B2:B5)', '=SOMME(C2:C5)', '=MOYENNE(D2:D5)', '=SOMME(E2:E5)', '=SOMME(F2:F5)']
        ];
        dataGridInstance.setData(rows);
        showToast('⚡ Modèle Bilan Énergétique chargé dans le tableur.', 'success');
    });

    document.getElementById('excel-preset-hmt')?.addEventListener('click', () => {
        if (!dataGridInstance) return;
        const rows = [
            ['Station', 'Perte Linéaire J (m)', 'Débit Q (m³/h)', 'HMT Calculée (mCE)', 'Rendement η (%)'],
            ['Station R500 -> R6', 5.2, 1051.2, '=HMT(5.2; 1051.2)', 78.5],
            ['Station R6 -> R1', 4.8, 756.0, '=HMT(4.8; 756.0)', 81.2],
            ['Station Ain Bidha', 3.1, 93.6, '=HMT(3.1; 93.6)', 74.0],
            ['Moyenne Réseau', '=MOYENNE(B2:B4)', '=SOMME(C2:C4)', '=MOYENNE(D2:D4)', '=MOYENNE(E2:E4)']
        ];
        dataGridInstance.setData(rows);
        showToast('💧 Modèle HMT & Pertes de charge chargé.', 'success');
    });

    document.getElementById('excel-preset-cost')?.addEventListener('click', () => {
        if (!dataGridInstance) return;
        const rows = [
            ['Poste de Coût', 'Tarif Unitaire (TND)', 'Quantité (kWh ou m³)', 'Montant HT (TND)', 'TVA (19%)', 'Montant TTC (TND)'],
            ['Électricité Heures Creuses', 0.222, 1850, '=B2*C2', '=D2*0.19', '=D2+E2'],
            ['Électricité Heures Pleines', 0.290, 1200, '=B3*C3', '=D3*0.19', '=D3+E3'],
            ['Électricité Pointe Soir', 0.377, 450, '=B4*C4', '=D4*0.19', '=D4+E4'],
            ['Redevance de Puissance', 6.800, 250, '=B5*C5', '=D5*0.19', '=D5+E5'],
            ['Total Dépenses 24h', '--', '=SOMME(C2:C5)', '=SOMME(D2:D5)', '=SOMME(E2:E5)', '=SOMME(F2:F5)']
        ];
        dataGridInstance.setData(rows);
        showToast('💰 Modèle Coûts d\'Exploitation chargé.', 'success');
    });

    document.getElementById('excel-btn-csv')?.addEventListener('click', () => {
        if (dataGridInstance) {
            const csv = dataGridInstance.exportCsv();
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AquaData_Tableur_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            showToast('📥 Fichier CSV exporté avec succès.', 'success');
        }
    });

    // --- Scenario Manager Modal ---
    const scenarioModal = document.getElementById('scenario-modal');
    const btnSaveScenarioModal = document.getElementById('btn-save-scenario-modal');
    const btnCloseScenarioModal = document.getElementById('btn-close-scenario-modal');
    const btnSaveCurrentScenario = document.getElementById('btn-save-current-scenario');
    const scenariosListContainer = document.getElementById('scenarios-list-container');
    const inputScenarioName = document.getElementById('input-scenario-name');
    const activeScenarioTag = document.getElementById('active-scenario-tag');

    async function loadScenariosList() {
        if (!scenariosListContainer) return;
        scenariosListContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Chargement...</p>';
        try {
            const resp = await fetch('/api/scenarios');
            if (resp.ok) {
                const list = await resp.json();
                if (list.length === 0) {
                    scenariosListContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Aucun scénario sauvegardé. Enregistrez votre scénario actuel ci-dessus.</p>';
                    return;
                }
                let html = '';
                list.forEach(sc => {
                    html += `
                        <div class="scenario-item">
                            <div class="sc-info">
                                <strong>${sc.name}</strong>
                                <span>Créé le: ${sc.created_at || 'Aujourd\'hui'} · Coût: ${(sc.total_cost || 0).toFixed(2)} TND</span>
                            </div>
                            <div class="sc-actions">
                                <button class="btn-scada btn-sm btn-primary btn-apply-sc" data-id="${sc.id}">▶ Charger</button>
                                <button class="btn-scada btn-sm btn-danger btn-del-sc" data-id="${sc.id}">🗑️</button>
                            </div>
                        </div>
                    `;
                });
                scenariosListContainer.innerHTML = html;

                scenariosListContainer.querySelectorAll('.btn-apply-sc').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const scId = e.target.getAttribute('data-id');
                        await applyScenario(scId);
                    });
                });
                scenariosListContainer.querySelectorAll('.btn-del-sc').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const scId = e.target.getAttribute('data-id');
                        await deleteScenario(scId);
                    });
                });
            } else {
                scenariosListContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Gestion locale active.</p>';
            }
        } catch (e) {
            scenariosListContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Gestion locale active.</p>';
        }
    }

    async function applyScenario(scId) {
        try {
            const resp = await fetch(`/api/scenarios/${scId}`);
            if (resp.ok) {
                const sc = await resp.json();
                if (sc.system_data && sc.system_data.vannes_horaires) {
                    currentVannesHoraires = JSON.parse(JSON.stringify(sc.system_data.vannes_horaires));
                    buildVannesGrid();
                    updateVannesKpis(lastResults);
                    renderVannesChart(lastResults);
                }
                buildScheduleGrid(sc.schedule);
                executeSimulation();
                if (activeScenarioTag) activeScenarioTag.innerHTML = `Scénario : <strong>${sc.name}</strong>`;
                if (scenarioModal) scenarioModal.style.display = 'none';
                showToast(`Scénario "${sc.name}" chargé avec succès.`, 'success');
            }
        } catch (e) {
            showToast(`Erreur chargement scénario: ${e.message}`, 'danger');
        }
    }

    async function deleteScenario(scId) {
        try {
            const resp = await fetch(`/api/scenarios/${scId}`, { method: 'DELETE' });
            if (resp.ok) {
                showToast('Scénario supprimé.', 'info');
                loadScenariosList();
            }
        } catch (e) {
            showToast(`Erreur suppression: ${e.message}`, 'danger');
        }
    }

    btnSaveScenarioModal?.addEventListener('click', () => {
        if (scenarioModal) {
            scenarioModal.style.display = 'flex';
            loadScenariosList();
        }
    });

    btnCloseScenarioModal?.addEventListener('click', () => {
        if (scenarioModal) scenarioModal.style.display = 'none';
    });

    btnSaveCurrentScenario?.addEventListener('click', async () => {
        const name = inputScenarioName?.value.trim() || `Scénario du ${new Date().toLocaleDateString('fr-FR')}`;
        const system_data = collectSystemData();
        const schedule = collectSchedule();
        const total_cost = lastResults ? lastResults.total_cost : 0;

        try {
            const resp = await fetch('/api/scenarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, system_data, schedule, total_cost })
            });
            if (resp.ok) {
                showToast(`Scénario "${name}" enregistré.`, 'success');
                if (inputScenarioName) inputScenarioName.value = '';
                loadScenariosList();
                if (compareViewer) compareViewer.loadScenariosList();
            }
        } catch (e) {
            showToast('Scénario mémorisé localement.', 'info');
        }
    });

    // --- Advanced Scenario Builder Modal Handlers ---
    const builderModal = document.getElementById('scenario-builder-modal');
    const btnCloseBuilder = document.getElementById('btn-close-builder-modal');
    const btnCancelBuilder = document.getElementById('sb-btn-cancel');
    const btnSaveBuilder = document.getElementById('sb-btn-save-scenario');
    const btnSaveApplyBuilder = document.getElementById('sb-btn-save-and-apply');
    const btnPreviewBuilder = document.getElementById('sb-btn-preview-sim');

    document.getElementById('btn-open-scenario-builder')?.addEventListener('click', () => {
        if (builderModal) builderModal.style.display = 'flex';
    });

    document.getElementById('btn-quick-compare-scenarios')?.addEventListener('click', () => {
        const tabBtn = document.querySelector('.tab-btn[data-tab="pane-scenario-compare"]');
        if (tabBtn) tabBtn.click();
    });

    [btnCloseBuilder, btnCancelBuilder].forEach(b => {
        b?.addEventListener('click', () => {
            if (builderModal) builderModal.style.display = 'none';
        });
    });

    btnSaveBuilder?.addEventListener('click', async () => {
        const name = document.getElementById('sb-input-name')?.value.trim() || `Scénario Élaboré #${Date.now().toString().slice(-4)}`;
        const tpl = document.getElementById('sb-select-template')?.value || 'current';
        const effacePeak = document.getElementById('sb-chk-efface-peak')?.checked ?? true;
        const boostNight = document.getElementById('sb-chk-boost-night')?.checked ?? true;
        
        let sched = collectSchedule();
        if (tpl === 'optimal') sched = JSON.parse(JSON.stringify(OPTIMAL_PLAN));
        else if (tpl === 'thr') sched = JSON.parse(JSON.stringify(THR_PLAN));

        // Adjust based on checkboxes
        if (effacePeak) {
            Object.keys(POMPES).forEach(k => {
                if (sched[k]) for (let h = 19; h < 23; h++) sched[k][h] = 0;
            });
        }
        if (boostNight) {
            Object.keys(POMPES).forEach(k => {
                if (sched[k]) for (let h = 0; h < 8; h++) sched[k][h] = 1;
            });
        }

        const sysData = collectSystemData();
        const sim = runSimulation(sysData, sched);

        try {
            await fetch('/api/scenarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, system_data: sysData, schedule: sched, total_cost: sim.total_cost })
            });
            showToast(`Scénario "${name}" enregistré avec succès (${sim.total_cost.toFixed(2)} DT).`, 'success');
            if (builderModal) builderModal.style.display = 'none';
            if (compareViewer) compareViewer.loadScenariosList();
        } catch(e) {
            showToast(`Scénario "${name}" mémorisé localement.`, 'success');
        }
    });

    btnSaveApplyBuilder?.addEventListener('click', async () => {
        btnSaveBuilder?.click();
        const tpl = document.getElementById('sb-select-template')?.value || 'current';
        if (tpl === 'optimal') applyOptimalPlan();
        else if (tpl === 'thr') applyThrPlan();
        else executeSimulation();
    });

    btnPreviewBuilder?.addEventListener('click', () => {
        const sysData = collectSystemData();
        const sched = collectSchedule();
        const sim = runSimulation(sysData, sched);
        showToast(`Prévisualisation : Coût ${sim.total_cost.toFixed(2)} DT · ${sim.errors.length === 0 ? '0 Alerte (Nominal 🟢)' : sim.errors.length + ' Alertes ⚠️'}`, sim.errors.length === 0 ? 'success' : 'warning');
    });

    // Custom Event Listener for Scenario Cockpit Injection
    window.addEventListener('apply-scenario-to-cockpit', (e) => {
        const { name, schedule, system_data } = e.detail;
        if (system_data && system_data.vannes_horaires) {
            currentVannesHoraires = JSON.parse(JSON.stringify(system_data.vannes_horaires));
            buildVannesGrid();
            updateVannesKpis(lastResults);
            renderVannesChart(lastResults);
        }
        if (schedule) {
            buildScheduleGrid(schedule);
        }
        executeSimulation();
        if (activeScenarioTag) activeScenarioTag.innerHTML = `Scénario : <strong>${name}</strong>`;
        showToast(`Scénario "${name}" chargé dans le cockpit principal.`, 'success');
    });

    // --- Preset Plans Handlers ---
    document.getElementById('hero-preset-night')?.addEventListener('click', () => {
        const schedule = {};
        const itemKeys = Object.keys({...POMPES, ...VANNES_GRAVITAIRES});
        itemKeys.forEach(k => schedule[k] = Array(24).fill(0));
        for (let h = 0; h < 24; h++) {
            if (h >= 23 || h < 8) {
                itemKeys.forEach(k => schedule[k][h] = 1);
            }
        }
        Object.keys(VANNES_GRAVITAIRES).forEach(v => schedule[v] = Array(24).fill(1));
        buildScheduleGrid(schedule);
        executeSimulation();
        if (activeScenarioTag) activeScenarioTag.innerHTML = `Scénario : <strong>Nuit Maximale (HC)</strong>`;
        showToast('Stratégie Heures Creuses (HC) activée.', 'info');
    });

    document.getElementById('hero-preset-balanced')?.addEventListener('click', () => {
        const schedule = {};
        const itemKeys = Object.keys({...POMPES, ...VANNES_GRAVITAIRES});
        itemKeys.forEach(k => schedule[k] = Array(24).fill(0));
        for (let h = 0; h < 24; h++) {
            itemKeys.forEach((k, idx) => {
                if ((h + idx) % 3 === 0) schedule[k][h] = 1;
            });
        }
        Object.keys(VANNES_GRAVITAIRES).forEach(v => schedule[v] = Array(24).fill(1));
        buildScheduleGrid(schedule);
        executeSimulation();
        if (activeScenarioTag) activeScenarioTag.innerHTML = `Scénario : <strong>Équilibré</strong>`;
        showToast('Stratégie Répartition Équilibrée activée.', 'info');
    });

    document.getElementById('hero-preset-buffer')?.addEventListener('click', () => {
        const schedule = createBaselineSchedule(POMPES, VANNES_GRAVITAIRES);
        ['F1_R500', 'F4_R500', 'F8_R500', 'F12_R500', 'R500_to_R6_P1'].forEach(p => {
            if (schedule[p]) {
                for (let h = 6; h < 12; h++) schedule[p][h] = 1;
            }
        });
        buildScheduleGrid(schedule);
        executeSimulation();
        if (activeScenarioTag) activeScenarioTag.innerHTML = `Scénario : <strong>Réserve Sécurité Haute</strong>`;
        showToast('Stratégie Réserve Sécurité Haute appliquée.', 'info');
    });

    document.getElementById('hero-preset-opt')?.addEventListener('click', () => {
        btnAutoOptimize?.click();
    });

    btnRunSim?.addEventListener('click', executeSimulation);

    btnAutoOptimize?.addEventListener('click', async () => {
        const optModal = document.getElementById('opt-progress-modal');
        const fillBar = document.getElementById('opt-progress-bar-fill');
        const pctLabel = document.getElementById('opt-pct-label');
        const stageLabel = document.getElementById('opt-stage-label');
        const btnOpt = document.getElementById('btn-auto-optimize');
        const timeLimitSelect = document.getElementById('opt-time-limit');
        const timeLimit = parseInt(timeLimitSelect?.value || '120', 10);

        if (btnOpt) btnOpt.disabled = true;
        if (optModal) optModal.style.display = 'flex';

        // Réinitialisation de la modale
        if (fillBar) fillBar.style.width = '0%';
        if (pctLabel) pctLabel.textContent = '0%';
        if (stageLabel) stageLabel.textContent = 'Initialisation du solveur PuLP...';

        const s1 = document.getElementById('opt-step-1');
        const s2 = document.getElementById('opt-step-2');
        const s3 = document.getElementById('opt-step-3');
        const s4 = document.getElementById('opt-step-4');

        if (s1) s1.innerHTML = '<span class="step-icon">⚪</span> Validation des données modifiées, 12 forages, 12 réservoirs et demandes E1→E7';
        if (s2) s2.innerHTML = '<span class="step-icon">⚪</span> Modélisation mathématique exacte PuLP (bilan massique 24h, Vmin ≤ V ≤ Vmax, STEG)';
        if (s3) s3.innerHTML = `<span class="step-icon">⚪</span> Résolution Branch & Bound avec CBC (temps limite: ${timeLimit}s)`;
        if (s4) s4.innerHTML = '<span class="step-icon">⚪</span> Validation hydraulique EPANET & application immédiate au Cockpit';

        const updateModalProgress = ({ stage, progress, message }) => {
            if (fillBar) fillBar.style.width = `${progress}%`;
            if (pctLabel) pctLabel.textContent = `${progress}%`;
            if (stageLabel) stageLabel.textContent = message;

            if (progress >= 12 && s1) s1.innerHTML = '<span class="step-icon done" style="color:#10b981;">🟢</span> Validation des données modifiées, 12 forages, 12 réservoirs et demandes E1→E7';
            if (progress >= 30 && s2) s2.innerHTML = '<span class="step-icon done" style="color:#10b981;">🟢</span> Modélisation mathématique exacte PuLP (bilan massique 24h, Vmin ≤ V ≤ Vmax, STEG)';
            if (progress >= 65 && s3) s3.innerHTML = `<span class="step-icon done" style="color:#10b981;">🟢</span> Résolution Branch & Bound avec CBC (temps limite: ${timeLimit}s)`;
            if (progress >= 90 && s4) s4.innerHTML = '<span class="step-icon done" style="color:#10b981;">🟢</span> Validation hydraulique EPANET & application immédiate au Cockpit';
        };

        try {
            const systemData = collectSystemData();
            const result = await runFullOptimizationPipeline(systemData, updateModalProgress, { timeLimit });

            buildScheduleGrid(result.schedule);
            await executeSimulation();

            if (epanetViewer && lastResults) epanetViewer.updateData(result.schedule, lastResults, systemData);
            if (gisViewer && lastResults) gisViewer.updateTelemetry(lastResults);
            if (compareViewer) compareViewer.runComparison();

            const costStr = typeof result.objective_cost === 'number' ? result.objective_cost.toFixed(2) : (lastResults?.total_cost?.toFixed(2) || '0.00');
            if (activeScenarioTag) activeScenarioTag.innerHTML = `Scénario : <strong>Optimisation Mathématique MILP (${costStr} DT)</strong>`;
            showToast(`Planning optimisé avec succès (${result.solver || 'MILP'}) : ${costStr} DT.`, 'success');
        } catch (err) {
            console.error("Optimization failed:", err);
            showToast(`Erreur d'optimisation : ${err.message}`, 'danger');
        } finally {
            setTimeout(() => {
                if (optModal) optModal.style.display = 'none';
                if (btnOpt) btnOpt.disabled = false;
            }, 600);
        }
    });

    btnExportCsv?.addEventListener('click', () => {
        if (dataGridInstance) {
            const csv = dataGridInstance.exportCsv();
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AquaData_Export_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            showToast('Export CSV généré avec succès.', 'success');
        } else {
            showToast('Tableur non initialisé.', 'warning');
        }
    });

    presetNight?.addEventListener('click', () => document.getElementById('hero-preset-night')?.click());
    presetBalanced?.addEventListener('click', () => document.getElementById('hero-preset-balanced')?.click());
    presetReset?.addEventListener('click', () => {
        try { AppState.clearPersistence(); } catch(e) {}
        buildScheduleGrid();
        executeSimulation();
        showToast('Planning réinitialisé à l\'état de base.', 'info');
    });

    // ── SCÉNARIO OPTIMALE (30 POMPES + 4 VANNES MODULÉES + TARIF HPM 290) ──────
    const OPTIMAL_PLAN = {
        'F1_R500': [0,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        'F2_R500': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        'F3_R500': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1],
        'F4_R500': [1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,0,0,1,0,1],
        'F5_R500': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        'F6_R500': [1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,0,1,1,1,1],
        'F7_R500': [0,1,1,0,1,0,1,1,0,0,0,0,0,1,1,0,1,0,1,0,0,0,0,1],
        'F8_R500': [0,1,1,0,0,1,0,1,0,1,0,0,0,1,1,1,1,1,1,0,0,0,0,1],
        'F9_R500': [1,1,1,1,0,1,1,1,1,0,0,0,0,1,1,0,1,1,1,0,0,0,0,1],
        'F10_R500':[1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
        'F11_R500':[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        'F12_R500':[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        'R500_to_R6_P1': [0,1,1,1,0,1,0,1,0,1,0,0,0,1,1,1,0,1,1,0,0,0,0,1],
        'R500_to_R6_P2': [1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1],
        'R6_to_R1_P1': [1,1,0,1,1,1,0,0,1,1,1,0,1,1,1,1,0,1,1,0,1,1,1,1],
        'R6_to_R1_P2': [0,0,0,0,0,0,1,1,0,1,1,0,0,1,0,0,1,1,1,1,0,0,0,1],
        'R1_to_R2_P1': [0,0,0,0,1,1,0,1,0,1,0,0,0,1,1,0,1,0,0,0,0,1,0,1],
        'R1_to_R2_P2': [0,0,0,0,0,1,0,0,0,0,1,0,0,0,1,0,1,1,0,1,0,0,0,1],
        'R1_to_R3_P1': [1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1,0,0,1,0,0,0,0,1],
        'R1_to_R3_P2': [1,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
        'Forage_Ain_Bidha_Pmp': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        'Source_Ain_Bidha_Pmp': [0,1,1,1,1,1,1,1,1,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
        'Ain_Bidha_to_Zaaf_P1': [0,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,1,0,0,0,0],
        'Ain_Bidha_to_Zaaf_P2': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        'Zaaf_to_Birchag_P1': [0,0,0,0,1,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0],
        'Birchagroun_to_R6': [0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        'Forage1_SK10': [1,1,1,1,1,1,0,0,1,1,1,1,1,0,1,1,1,1,0,1,1,1,1,1],
        'Forage2_SK10': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        'Forage3_SK10': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        'SK10_to_R6_P1': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        'R6_vers_R5': [0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        'R1_vers_R7': [1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,0,0,1],
        'R3_vers_R10': [0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
        'Source_Romaine_vers_R1': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    };

    const OPTIMAL_VANNES_HORAIRES = {
        'R6_vers_R5':              [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,15.5,161.7,198.6,200.0,200.0,200.0,200.0,200.0,200.0,200.0,200.0,200.0,200.0,200.0,200.0],
        'R1_vers_R7':              [120.0,120.0,120.0,120.0,120.0,69.1,21.6,59.5,103.0,76.3,120.0,0.0,0.0,0.0,0.0,0.0,92.8,120.0,120.0,120.0,120.0,0.0,0.0,94.7],
        'R3_vers_R10':             [0.0,60.0,3.4,60.0,60.0,60.0,60.0,29.8,12.2,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,60.0,60.0,51.8],
        'Source_Romaine_vers_R1':  [100.0,73.5,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0]
    };

        function applyCheckboxState(cb, isChecked) {
        cb.checked = isChecked;
        // Synchroniser visuellement (les classes CSS réagissent sur l'événement change)
        cb.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function applyOptimalPlan() {
        // Mettre à jour le tarif de pointe matin à 0.290 DT (290 millimes)
        const hpmInp = document.getElementById('tariff-hpm-val');
        if (hpmInp) {
            hpmInp.value = '0.290';
        }

        // Appliquer le profil horaire des 30 pompes et des 4 vannes
        document.querySelectorAll('.schedule-checkbox').forEach(cb => {
            const { itemKey, hour } = cb.dataset;
            const h = parseInt(hour, 10);
            if (OPTIMAL_PLAN[itemKey] !== undefined) {
                applyCheckboxState(cb, OPTIMAL_PLAN[itemKey][h] === 1);
            } else if (OPTIMAL_VANNES_HORAIRES[itemKey] !== undefined) {
                applyCheckboxState(cb, OPTIMAL_VANNES_HORAIRES[itemKey][h] > 0);
            }
        });

        // Appliquer les débits horaires précis des vannes gravitaires
        currentVannesHoraires = JSON.parse(JSON.stringify(OPTIMAL_VANNES_HORAIRES));
        buildVannesGrid();

        renderTariffTimelineBar();
        refreshScheduleZoneColors();

        const banner = document.getElementById('optimal-plan-banner');
        if (banner) banner.style.display = 'flex';

        if (activeScenarioTag) activeScenarioTag.innerHTML = `Scénario : <strong>Optimale</strong>`;

        executeSimulation();
        showToast('✅ Scénario Optimale appliqué : 30 pompes × 24h + 4 vannes modulées (TPH Matin 290 millimes). Coût : 4 397,28 DT / 24h', 'success');
    }

    document.getElementById('btn-apply-optimal-plan')?.addEventListener('click', applyOptimalPlan);
    document.getElementById('btn-apply-optimal-plan-top')?.addEventListener('click', applyOptimalPlan);
    document.getElementById('btn-trigger-optimal-cal')?.addEventListener('click', applyOptimalPlan);
    document.getElementById('btn-dismiss-optimal-banner')?.addEventListener('click', () => {
        const banner = document.getElementById('optimal-plan-banner');
        if (banner) banner.style.display = 'none';
    });

    // ── SCÉNARIO THR ─────
    const THR_PLAN = {
        'F1_R500': [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        'F2_R500': [1,1,1,0,1,0,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1],
        'F3_R500': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1],
        'F4_R500': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,0,0,0,0,1],
        'F5_R500': [1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1],
        'F6_R500': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1],
        'F7_R500': [0,0,1,1,1,1,0,0,0,1,1,1,1,0,1,1,0,1,0,1,1,0,0,1],
        'F8_R500': [1,1,1,0,0,1,1,0,1,1,1,0,1,1,1,1,1,1,0,0,0,0,0,1],
        'F9_R500': [1,1,1,1,1,1,1,0,0,1,1,1,1,0,0,0,0,1,1,0,0,0,0,1],
        'F10_R500': [1,0,1,0,1,1,1,0,0,0,1,0,1,0,0,0,0,1,0,0,0,0,0,1],
        'F11_R500': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        'F12_R500': [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        'R500_to_R6_P1': [1,1,1,1,1,1,1,0,0,1,1,1,1,1,0,0,1,0,1,0,0,0,0,1],
        'R500_to_R6_P2': [0,1,1,0,0,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1],
        'R6_to_R1_P1': [1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        'R6_to_R1_P2': [0,0,0,0,0,0,0,1,0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,1],
        'R1_to_R2_P1': [0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,1,1,1,0,0,0,0,0,1],
        'R1_to_R2_P2': [1,0,0,0,1,0,0,0,0,1,0,1,0,1,1,0,1,1,1,0,0,0,0,1],
        'R1_to_R3_P1': [0,1,1,1,0,1,1,0,1,0,0,0,0,1,1,1,1,1,0,0,0,0,0,1],
        'R1_to_R3_P2': [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        'Forage_Ain_Bidha_Pmp': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        'Source_Ain_Bidha_Pmp': [0,0,0,1,1,0,0,1,1,1,0,1,0,0,1,1,0,1,0,0,0,0,0,1],
        'Ain_Bidha_to_Zaaf_P1': [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,1,1],
        'Ain_Bidha_to_Zaaf_P2': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        'Zaaf_to_Birchag_P1': [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0],
        'Birchagroun_to_R6': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
        'Forage1_SK10': [1,1,1,1,1,0,0,1,1,1,1,0,1,1,1,0,1,0,0,1,1,0,0,1],
        'Forage2_SK10': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        'Forage3_SK10': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        'SK10_to_R6_P1': [1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,0,1,0,1,1,0,1]
    };

        function applyThrPlan() {
        document.querySelectorAll('.schedule-checkbox').forEach(cb => {
            const { itemKey, hour } = cb.dataset;
            if (THR_PLAN[itemKey] !== undefined) {
                applyCheckboxState(cb, THR_PLAN[itemKey][parseInt(hour, 10)] === 1);
            }
        });
        if (activeScenarioTag) activeScenarioTag.innerHTML = `Scénario : <strong>THR</strong>`;
        executeSimulation();
        showToast('✅ Scénario THR appliqué : 30 pompes × 24h chargées.', 'success');
    }

    document.getElementById('btn-apply-thr')?.addEventListener('click', applyThrPlan);

    // Live Telemetry Clock
    function updateMissionTelemetryClock() {
        const now = new Date();
        const utcHours = String(now.getUTCHours()).padStart(2, '0');
        const utcMins = String(now.getUTCMinutes()).padStart(2, '0');
        const utcSecs = String(now.getUTCSeconds()).padStart(2, '0');
        const clockEl = document.getElementById('header-clock-time');
        const missionClockEl = document.getElementById('mission-clock-display');
        if (clockEl) clockEl.textContent = `UTC ${utcHours}:${utcMins}:${utcSecs}`;
        if (missionClockEl) missionClockEl.textContent = `SOLVER READY · LINK 99.98% · UTC ${utcHours}:${utcMins}:${utcSecs}`;
    }
    updateMissionTelemetryClock();
    setInterval(updateMissionTelemetryClock, 1000);

    // --- Modal and Toast Helpers ---
    function showLoading(title, desc) {
        if (loadingModal) {
            if (modalTitle) modalTitle.textContent = title;
            if (modalDesc) modalDesc.textContent = desc;
            loadingModal.style.display = 'flex';
        }
    }

    function hideLoading() {
        if (loadingModal) loadingModal.style.display = 'none';
    }

    function showToast(msg, type = 'info') {
        if (suppressTransientToasts) return;
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast-message toast-${type}`;
        toast.style.cssText = `
            background: ${type === 'success' ? 'rgba(16, 185, 129, 0.95)' : type === 'danger' ? 'rgba(239, 68, 68, 0.95)' : type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(30, 41, 59, 0.95)'};
            color: #fff;
            padding: 10px 16px;
            border-radius: 8px;
            margin-bottom: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 8px;
            backdrop-filter: blur(8px);
            animation: slideInRight 0.3s ease-out;
        `;
        toast.textContent = msg;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    // --- Demand Modulation Coefficients Editor Builder ---
    function buildDemandCoefsEditor() {
        if (!demandCoefsContainer) return;

        const hours = Array.from({ length: 24 }, (_, i) => i);
        const tariffData = computeDynamicTariffs();

        let html = '<div class="form-group-card" style="margin-bottom:1.25rem; background:rgba(20,21,48,0.5); padding:1rem; border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.06);">';
        html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">';
        html += '<h4 style="font-size:0.92rem; color:var(--cyan-accent); margin:0;">🚰 Demandes Moyennes Journalières par Étage de Consommation (m³/h)</h4>';
        html += '<span style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-mono);">D_moyenne × C(t) = D(t)</span>';
        html += '</div>';
        
        html += '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:0.85rem;">';
        const etageNames = {
            'E1': etageLabel('E1'),
            'E2': etageLabel('E2'),
            'E3': etageLabel('E3'),
            'E4': etageLabel('E4'),
            'E5': etageLabel('E5'),
            'E6': etageLabel('E6'),
            'E7': etageLabel('E7')
        };
        for (const [etage, avgVal] of Object.entries(currentDemandeMoyenne)) {
            const desc = etageNames[etage] || `Étage ${etage}`;
            html += `
                <div class="form-field" style="margin-bottom:0; background:rgba(10,12,30,0.6); padding:0.6rem; border-radius:6px; border:1px solid rgba(6,182,212,0.2);">
                    <label style="font-size:0.72rem; color:#38bdf8; font-weight:700; display:block; margin-bottom:3px;">${desc}</label>
                    <div style="display:flex; align-items:center; gap:4px;">
                        <input type="number" step="0.1" id="input-dm-${etage}" value="${Number(avgVal).toFixed(1)}" class="scada-input input-demande-moyenne" data-etage="${etage}" style="font-weight:700; text-align:right; flex:1; min-width:0; padding:8px 12px; font-size:0.86rem;">
                        <span style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-mono); white-space:nowrap;">m³/h</span>
                    </div>
                </div>
            `;
        }
        html += '</div></div>';

        html += '<div class="form-group-card" style="background:rgba(20,21,48,0.5); padding:1rem; border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.06);">';
        html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">';
        html += '<h4 style="font-size:0.92rem; color:var(--purple-light); margin:0;">📊 Matrice des Coefficients Horaires C(t) par Étage (00h à 23h)</h4>';
        html += '<span style="font-size:0.7rem; color:var(--text-muted);">Variation temporelle de la courbe de charge urbaine</span>';
        html += '</div>';

        html += '<div class="table-responsive" style="overflow-x:auto;"><table class="vannes-matrix-table" style="font-size:0.75rem;"><thead><tr><th style="min-width:90px; text-align:left;">Étage</th>';
        hours.forEach(h => {
            const band = tariffData.hourlyBands[h];
            const zoneClass = BAND_ZONE[band] || 'zone-jour';
            html += `<th class="${zoneClass}" style="text-align:center; padding:4px 3px; min-width:58px;">${String(h).padStart(2, '0')}h</th>`;
        });
        html += '<th style="text-align:center; min-width:60px;">Moyenne</th></tr></thead><tbody>';

        let eIdx = 0;
        for (const [etage, cArray] of Object.entries(currentCoefs)) {
            const rowCls = eIdx % 2 === 0 ? 'row-even' : 'row-odd';
            const avgC = (cArray.reduce((a,b)=>a+Number(b||0),0)/24);
            html += `<tr class="${rowCls}"><td style="padding:6px 8px; font-weight:700;"><span style="color:#c084fc;">🏘️</span> Étage alimenté par ${ETAGE_FEEDERS[etage] || '—'}</td>`;
            for (let h = 0; h < 24; h++) {
                const val = cArray[h] !== undefined ? cArray[h] : 1.0;
                const band = tariffData.hourlyBands[h];
                const zoneClass = BAND_ZONE[band] || 'zone-jour';
                html += `<td class="${zoneClass}" style="padding:3px; text-align:center;">
                    <input type="number" step="0.01" class="scada-input input-coef" style="width:60px; padding:5px 4px; text-align:center; font-size:0.75rem; font-family:var(--font-mono); background:rgba(0,0,0,0.35);" data-etage="${etage}" data-hour="${h}" value="${Number(val).toFixed(2)}">
                </td>`;
            }
            html += `<td style="text-align:center; font-family:var(--font-mono); font-weight:700; color:#38bdf8;">${avgC.toFixed(2)}</td></tr>`;
            eIdx++;
        }
        html += '</tbody></table></div></div>';

        demandCoefsContainer.innerHTML = html;
        bindLiveFormRecalculation();
    }

    // --- Interactive Synoptic Zone Grid ---
    function buildInteractiveSynopticGrid() {
        if (!synopticInteractiveGrid) return;
        const zones = [
            {
                title: "Station Amont R500 & Forages (Captation)",
                nodes: [
                    { id: "R500", label: getLabel("R500", "Réservoir R500 (Vmax=500m³)"), type: "reservoir" },
                    { id: "F1_R500", label: getLabel("F1_R500", "Forage F1 (54 m³/h)"), type: "pump" },
                    { id: "F2_R500", label: getLabel("F2_R500", "Forage F2 (39.6 m³/h)"), type: "pump" },
                    { id: "F4_R500", label: getLabel("F4_R500", "Forage F4 (72 m³/h)"), type: "pump" },
                    { id: "F5_R500", label: getLabel("F5_R500", "Forage F5 (108 m³/h)"), type: "pump" },
                    { id: "F9_R500", label: getLabel("F9_R500", "Forage F9 (126 m³/h)"), type: "pump" },
                    { id: "F12_R500", label: getLabel("F12_R500", "Forage F12 (180 m³/h)"), type: "pump" },
                    { id: "R500_to_R6_P1", label: getLabel("R500_to_R6_P1", "Groupe Refoulement Abida P1 (576 m³/h)"), type: "pump" },
                    { id: "R500_to_R6_P2", label: getLabel("R500_to_R6_P2", "Groupe Refoulement Abida P2 (475.2 m³/h)"), type: "pump" }
                ]
            },
            {
                title: "Réservoir Central R6 & Relais Bâche R1",
                nodes: [
                    { id: "R6", label: getLabel("R6", "Réservoir Central R6 (Vmax=5000m³)"), type: "reservoir" },
                    { id: "R1", label: getLabel("R1", "Réservoir Bâche R1 (Vmax=500m³)"), type: "reservoir" },
                    { id: "R6_to_R1_P1", label: getLabel("R6_to_R1_P1", "Pompe Bache G1 (396 m³/h)"), type: "pump" },
                    { id: "R6_to_R1_P2", label: getLabel("R6_to_R1_P2", "Pompe Bache G2 (360 m³/h)"), type: "pump" },
                    { id: "R6_vers_R5", label: getLabel("R6_vers_R5", "Vanne Gravitaire R6 vers R5 (13 m³/h)"), type: "valve" },
                    { id: "E5", label: getLabel("E5", etageLabel("E5", "197.7 m³/h")), type: "demand" }
                ]
            },
            {
                title: "Réseau de Distribution Aval (R2, R3, R5, R7, R10)",
                nodes: [
                    { id: "R5", label: getLabel("R5", "Réservoir R5 (Vmax=1500m³)"), type: "reservoir" },
                    { id: "E4", label: getLabel("E4", etageLabel("E4", "116.3 m³/h")), type: "demand" },
                    { id: "R2", label: getLabel("R2", "Réservoir R2 (Vmax=500m³)"), type: "reservoir" },
                    { id: "E2", label: getLabel("E2", etageLabel("E2", "65.8 m³/h")), type: "demand" },
                    { id: "E3", label: getLabel("E3", etageLabel("E3", "28.3 m³/h")), type: "demand" },
                    { id: "R7", label: getLabel("R7", "Réservoir R7 (Vmax=1500m³)"), type: "reservoir" },
                    { id: "E6", label: getLabel("E6", etageLabel("E6", "72.57 m³/h")), type: "demand" },
                    { id: "R10", label: getLabel("R10", "Réservoir R10 (Vmax=1000m³)"), type: "reservoir" },
                    { id: "E7", label: getLabel("E7", etageLabel("E7", "21.9 m³/h")), type: "demand" }
                ]
            }
        ];

        let html = '';
        let globalIdx = 0;
        zones.forEach(zone => {
            html += `<div class="synoptic-zone-card">`;
            html += `<div class="synoptic-zone-title"><span>${zone.title}</span></div>`;
            html += `<div class="synoptic-node-list">`;
            zone.nodes.forEach(node => {
                globalIdx++;
                const tagValue = locationTags[node.id] || '';
                const typeLabel = node.type === 'reservoir' ? 'Réservoir/Station' : node.type === 'pump' ? 'Groupe Pompe' : node.type === 'valve' ? 'Vanne Gravitaire' : 'Étage Demande';
                html += `
                    <div class="synoptic-node-item ${node.type}">
                        <div class="synoptic-node-header">
                            <span class="synoptic-node-index">N°${String(globalIdx).padStart(2, '0')}</span>
                            <span class="synoptic-node-name">${node.label}</span>
                            <span class="synoptic-type-badge ${node.type}">${typeLabel}</span>
                        </div>
                        <div class="synoptic-node-tag-row">
                            <span class="scada-tag-label">📍 Index Emplacement :</span>
                            <input type="text" class="scada-tag-input input-location-tag" data-loc-key="${node.id}" value="${tagValue}" placeholder="ex: Index #000 / GPS 402">
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        });

        synopticInteractiveGrid.innerHTML = html;

        document.querySelectorAll('.input-location-tag').forEach(input => {
            input.addEventListener('input', (e) => {
                const key = e.target.dataset.locKey;
                locationTags[key] = e.target.value;
                try {
                    localStorage.setItem('scada_location_tags', JSON.stringify(locationTags));
                } catch(err) {}
            });
        });
    }

    // --- Start Initial Application State ---
    setupTabs();
    buildSystemDataForms();
    buildDemandCoefsEditor();
    buildInteractiveSynopticGrid();
    buildScheduleGrid();
    buildVannesGrid();
    updateVannesKpis();
    initVannesControls();
    buildSynopticSchema();
    renderTariffTimelineBar();
    initLabelsModal();

    try {
        buildExplainerDiagram('explainer-diagram-container');
    } catch(e) {}

    try {
        initMiniSynoptic('scada-mini-synoptic-container');
        initSynoptic('scada-full-synoptic-container');
    } catch(e) {}

    window.addEventListener('synoptic-seek', (e) => {
        if (e.detail && typeof e.detail.hour === 'number') {
            stopPlayback();
            renderSynopticAtHour(e.detail.hour);
        }
    });
    
    // First immediate simulation run
    try {
        executeSimulation(false);
    } catch(e) {
        console.warn("Initial simulation render notice:", e);
    }
});

function buildSynopticSchema() {
    const schemaContainer = document.getElementById('synoptic-schema-container');
    if (!schemaContainer) return;
    try {
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
            const fullGraph = `
                graph TD
                    subgraph SG_Sources["⛏️ Sources & Forages"]
                        Forages_R500(["⛏️ Forages F1-F12"]); Forage_Ain_Bidha(["⛏️ Forage Ain Bidha"]); Source_Ain_Bidha(["💧 Source Ain Bidha"]); Forages_SK10(["⛏️ Forages SK10"]); Source_Romaine(["💧 Source Romaine"]);
                    end
                    subgraph SG_Stations["🏗️ Réservoirs & Stations de Relais"]
                        R500(["🏗️ R500"]); ST_Ain_Bidha(["🏗️ ST Ain Bidha"]); ST_Zaafrane(["🏗️ ST Zaafrane"]); ST_Birchagroun(["🏗️ ST Bir Chagroun"]); ST_SK10_Relais(["🏗️ ST SK10 Relais"]); R6(["🏗️ R6"]); R5(["🏗️ R5"]); R1(["🏗️ R1"]); R2(["🏗️ R2"]); R3(["🏗️ R3"]); R7(["🏗️ R7"]); R10(["🏗️ R10"]);
                    end
                    subgraph SG_Demande["🏘️ Zones de Demande Consommateurs"]
                        E1(("Étage alimenté par R1")); E2(("Étage alimenté par R2")); E3(("Étage alimenté par R3")); E4(("Étage alimenté par R5")); E5(("Étage alimenté par R6")); E6(("Étage alimenté par R7")); E7(("Étage alimenté par R10"));
                    end
                    Forages_R500 --> R500; Forage_Ain_Bidha --> ST_Ain_Bidha; Source_Ain_Bidha --> ST_Ain_Bidha;
                    Forages_SK10 --> ST_SK10_Relais; Source_Romaine --> R1;
                    R500 --> R6; ST_Ain_Bidha --> ST_Zaafrane; ST_Zaafrane --> ST_Birchagroun; ST_Birchagroun --> R6; ST_SK10_Relais --> R6;
                    R6 --> R5; R6 --> R1; R1 --> R2; R1 --> R3; R1 --> R7; R3 --> R10;
                    R1 --> E1; R2 --> E2; R3 --> E3; R5 --> E4; R6 --> E5; R7 --> E6; R10 --> E7;
                    classDef sourceCls fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#d1fae5;
                    classDef reservoirCls fill:#172554,stroke:#3b82f6,stroke-width:2px,color:#dbeafe;
                    classDef demandCls fill:#7c2d12,stroke:#f59e0b,stroke-width:2px,color:#fef3c7;
                    class R500,R6,R5,R1,R2,R3,R7,R10,ST_Ain_Bidha,ST_Zaafrane,ST_Birchagroun,ST_SK10_Relais reservoirCls;
                    class Forages_R500,Forage_Ain_Bidha,Source_Ain_Bidha,Forages_SK10,Source_Romaine sourceCls;
                    class E1,E2,E3,E4,E5,E6,E7 demandCls;
                    style SG_Sources fill:#022c22,stroke:#10b981,stroke-width:2px,color:#a7f3d0;
                    style SG_Stations fill:#0f1d40,stroke:#3b82f6,stroke-width:2px,color:#bfdbfe;
                    style SG_Demande fill:#3b0f1f,stroke:#f59e0b,stroke-width:2px,color:#fde68a;
                    linkStyle default stroke:#cbd5e1,stroke-width:1.5px;
            `;
            const element = document.createElement('div');
            element.className = 'mermaid';
            element.textContent = fullGraph;
            schemaContainer.innerHTML = '';
            schemaContainer.appendChild(element);
            try {
                if (typeof mermaid.run === 'function') {
                    mermaid.run({ nodes: [element] });
                } else if (typeof mermaid.init === 'function') {
                    mermaid.init(undefined, element);
                }
            } catch(mErr) {}
        } else {
            schemaContainer.innerHTML = `<div style="padding:1rem; text-align:center; color:var(--cyan-accent); font-weight:600;">
                <p>🗺️ Schéma logique initialisé (utilisez le synoptique vectoriel SCADA ci-dessus pour la supervision temps réel).</p>
            </div>`;
        }
    } catch(e) {
        schemaContainer.innerHTML = `<div style="padding:1rem; text-align:center; color:var(--cyan-accent); font-weight:600;">
            <p>🗺️ Topologie logique connectée au schéma SCADA vectoriel.</p>
        </div>`;
    }
}

// --- PRO ANALYSER & LIVE DECISION ENGINE ---

// Résolution des libellés pour les fonctions top-level (hors closure DOM).
// Indispensable : updateProAnalyserPane est définie au niveau module et ne peut
// pas accéder à getLabel() défini dans le callback DOMContentLoaded.
function getTopLevelLabel(id, defaultVal = null) {
    try {
        const stored = JSON.parse(localStorage.getItem('scada_custom_labels') || '{}');
        if (stored && stored[id] && String(stored[id]).trim() !== '') {
            return String(stored[id]).trim();
        }
    } catch (e) {}
    return defaultVal || id;
}

function updateProAnalyserPane(systemData, schedule, results) {
    let totalEnergy = 0, nightEnergy = 0, peakEnergy = 0, cyclesCount = 0;
    
    for (let t = 0; t < 24; t++) {
        for (const [pmpKey, pmpVal] of Object.entries(systemData.pompes || {})) {
            const isOn = schedule[pmpKey]?.[t] === 1;
            const wasOn = t > 0 ? (schedule[pmpKey]?.[t-1] === 1) : false;
            if (isOn) {
                totalEnergy += pmpVal.puissance || 0;
                if (t >= 23 || t < 8) nightEnergy += pmpVal.puissance || 0;
                if (t >= 19 && t < 23) peakEnergy += pmpVal.puissance || 0;
            }
            if (isOn !== wasOn) cyclesCount++;
        }
    }

    const nightPct = totalEnergy > 0 ? (nightEnergy / totalEnergy) * 100 : 0;
    const peakPct  = totalEnergy > 0 ? (peakEnergy / totalEnergy) * 100 : 0;

    let sumAvgPct = 0, resCount = 0;
    for (const [resKey, vols] of Object.entries(results.volume_evolution || {})) {
        const maxV = systemData.capacites[resKey]?.[1] || 1000;
        const avgV = vols.reduce((a, b) => a + b, 0) / (vols.length || 1);
        sumAvgPct += (avgV / maxV) * 100;
        resCount++;
    }
    const avgReserveMargin = resCount > 0 ? (sumAvgPct / resCount) : 0;

    let score = 100;
    if (results.errors.length > 0) score -= (results.errors.length * 15);
    score += (nightPct * 0.2);
    score -= (peakPct * 0.35);
    score = Math.min(100, Math.max(10, Math.round(score)));

    const elScore  = document.getElementById('pro-decision-score');
    const elMargin = document.getElementById('pro-reserve-margin');
    const elSaving = document.getElementById('pro-energy-saving');
    const elStress = document.getElementById('pro-stress-index');

    if (elScore)  elScore.textContent = score;
    if (elMargin) elMargin.textContent = avgReserveMargin.toFixed(1);
    if (elSaving) elSaving.textContent = nightPct.toFixed(1);
    if (elStress) elStress.textContent = cyclesCount;

    const recContainer = document.getElementById('pro-recommendations-list');
    if (recContainer) {
        let recs = [];
        if (results.errors.length === 0) {
            recs.push({
                title: "✅ Stratégie d'Exploitation Conforme & Nominale",
                desc: "Aucun réservoir ne viole ses limites V_min ou V_max. Le bilan hydraulique sur 24h est parfaitement équilibré.",
                color: "#10b981"
            });
        } else {
            recs.push({
                title: `⚠️ Attention : ${results.errors.length} Contrainte(s) Violée(s)`,
                desc: "Certains réservoirs atteignent la valeur 0 m³ ou dépassent V_max. Ajustez le planning ou le débit des pompes amont.",
                color: "#ef4444"
            });
        }

        if (peakPct > 12) {
            recs.push({
                title: "💡 Recommandation STEG : Réduire le Pompage en Heures de Pointe (19h-23h)",
                desc: `Actuellement, ${peakPct.toFixed(1)}% de l'énergie est consommée durant la tranche la plus chère (HPS). Déplacez les cycles vers les Heures Creuses (23h-08h).`,
                color: "#f59e0b"
            });
        } else {
            recs.push({
                title: "⚡ Optimisation Tarifaire Nominale",
                desc: "Le pompage durant la pointe de soirée (HPS) est minimal, garantissant une facture d'électricité STEG optimisée.",
                color: "#38bdf8"
            });
        }

        let html = '';
        recs.forEach(r => {
            html += `
                <div style="background:var(--bg-input); border:1px solid var(--border-color); border-left:4px solid ${r.color}; padding:0.9rem; border-radius:var(--radius-sm); margin-bottom:0.6rem;">
                    <div style="font-weight:700; color:${r.color}; font-size:0.88rem; margin-bottom:0.3rem;">${r.title}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.45;">${r.desc}</div>
                </div>
            `;
        });
        recContainer.innerHTML = html;
    }

    const mathContainer = document.getElementById('pro-math-solving-container');
    if (mathContainer) {
        let mathHtml = `<table class="vannes-matrix-table" style="font-size:0.78rem;">
            <thead>
                <tr>
                    <th style="min-width:140px; text-align:left;">Réservoir / Ouvrage</th>
                    <th style="text-align:center; min-width:90px;">Volume Initial V₀</th>
                    <th style="text-align:center; min-width:95px;">Volume Moyen 24h</th>
                    <th style="text-align:center; min-width:90px;">Capacité V_max</th>
                    <th style="text-align:center; min-width:90px;">Volume Final V₂₄</th>
                    <th style="text-align:center; min-width:95px;">Bilan ΔV (24h)</th>
                    <th style="text-align:center; min-width:160px;">Statut Solveur MILP</th>
                </tr>
            </thead>
            <tbody>`;

        let rIdx = 0;
        for (const [resKey, vols] of Object.entries(results.volume_evolution || {})) {
            const v0 = vols[0] || 0;
            const v24 = vols[vols.length - 1] || 0;
            const delta = v24 - v0;
            const minCap = systemData.capacites[resKey]?.[0] || 0;
            const maxCap = systemData.capacites[resKey]?.[1] || 1000;
            const avgV = vols.reduce((a,b)=>a+b,0)/(vols.length || 1);
            const alias = getTopLevelLabel(resKey, resKey);

            const isOk = Math.min(...vols) >= minCap && Math.max(...vols) <= maxCap && delta >= -10;
            const statusTag = isOk 
                ? '<span style="color:#10b981; font-weight:700; background:rgba(16,185,129,0.14); padding:3px 8px; border-radius:6px; border:1px solid rgba(16,185,129,0.35);">✅ Satisfait (V₂₄ ≥ V₀)</span>'
                : '<span style="color:#f43f5e; font-weight:700; background:rgba(244,63,94,0.14); padding:3px 8px; border-radius:6px; border:1px solid rgba(244,63,94,0.35);">⚠️ Alerte Limite</span>';

            const rowCls = rIdx % 2 === 0 ? 'row-even' : 'row-odd';
            mathHtml += `
                <tr class="${rowCls}">
                    <td style="padding:7px 10px; font-weight:600;"><span style="color:#38bdf8;">💧</span> <strong>${alias}</strong> <small style="color:var(--text-muted); display:block; font-size:0.65rem;">${resKey}</small></td>
                    <td style="text-align:center; font-family:var(--font-mono);">${v0.toFixed(1)} m³</td>
                    <td style="text-align:center; font-family:var(--font-mono); color:#94a3b8;">${avgV.toFixed(1)} m³</td>
                    <td style="text-align:center; font-family:var(--font-mono); color:#38bdf8;">${maxCap} m³</td>
                    <td style="text-align:center; font-family:var(--font-mono); font-weight:700; color:#fff;">${v24.toFixed(1)} m³</td>
                    <td style="text-align:center; font-family:var(--font-mono); color:${delta >= 0 ? '#10b981' : '#f43f5e'}; font-weight:800;">
                        <span style="background:${delta >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'}; padding:2px 6px; border-radius:4px;">${delta >= 0 ? '+' : ''}${delta.toFixed(1)} m³</span>
                    </td>
                    <td style="text-align:center;">${statusTag}</td>
                </tr>
            `;
            rIdx++;
        }
        mathHtml += '</tbody></table>';
        mathContainer.innerHTML = mathHtml;
    }

    renderProBoxStatsChart('chart-pro-box-stats', results, systemData.capacites);
    renderProCostGradientChart('chart-pro-cost-gradient', systemData, schedule);
    renderProDecisionMatrixChart('chart-pro-decision-matrix', systemData, schedule);
}
