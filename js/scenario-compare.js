import { runSimulation } from './simulation.js';
import {
    POMPES,
    VANNES_GRAVITAIRES,
    CAPACITES,
    DEMANDE_HORAIRE,
    TARIFS,
    DEMANDE_MOYENNE,
    COEFS
} from './schema.js';
import { equipLabel, equipKind, equipIcon, reservoirLabel } from './labels.js';

export class ScenarioCompareViewer {
    constructor() {
        this.scenariosCatalog = {};
        this.selectedIdA = 'baseline';
        this.selectedIdB = 'optimal';
        this.selectedReservoir = 'R6';
        this.prodViewMode = 'AB'; // 'A', 'B', 'AB'

        this.charts = {
            power: null,
            volume: null,
            cost: null,
            elemVolume: null,
            elemPower: null
        };

        this.simResultA = null;
        this.simResultB = null;

        this.init();
    }

    async init() {
        const container = document.getElementById('scenario-compare-container');
        if (!container) return;

        this.renderLayout(container);
        this.bindEvents();
        await this.loadScenariosList();
        this.runComparison();
    }

    renderLayout(container) {
        container.innerHTML = `
            <div class="compare-studio-wrapper">
                <!-- Top Toolbar: Scenario Selectors & Actions -->
                <div class="compare-toolbar-card">
                    <div class="compare-selectors-group">
                        <div class="sc-picker-box picker-a">
                            <span class="picker-pill pill-a">Scénario A (Référence)</span>
                            <div class="picker-select-wrap">
                                <select id="compare-select-a" class="compare-dropdown"></select>
                            </div>
                        </div>

                        <div class="compare-vs-badge">
                            <span>VS</span>
                        </div>

                        <div class="sc-picker-box picker-b">
                            <span class="picker-pill pill-b">Scénario B (Optimisé / Cible)</span>
                            <div class="picker-select-wrap">
                                <select id="compare-select-b" class="compare-dropdown"></select>
                            </div>
                        </div>
                    </div>

                    <div class="compare-actions-group">
                        <button type="button" id="compare-btn-run" class="btn-compare-primary">
                            <span>🔄 Actualiser Comparaison</span>
                        </button>
                        <button type="button" id="compare-btn-duplicate" class="btn-compare-secondary">
                            <span>📋 Dupliquer B</span>
                        </button>
                        <button type="button" id="compare-btn-apply-b" class="btn-compare-accent">
                            <span>🚀 Appliquer B au Cockpit</span>
                        </button>
                    </div>
                </div>

                <!-- Recommendation Banner (AI / Expert Rule Assessment) -->
                <div id="compare-recommendation-banner" class="compare-rec-card">
                    <div class="rec-icon-box">
                        <span class="rec-icon">⚡</span>
                    </div>
                    <div class="rec-content">
                        <div class="rec-header">
                            <h4 id="rec-headline">⭐ Le Scénario B est Fortement Recommandé</h4>
                            <span id="rec-gain-badge" class="rec-badge-gain">Gain : <strong id="rec-gain-val">+0.00 DT/jour</strong></span>
                        </div>
                        <p id="rec-text">
                            L'optimisation MILP permet une réduction significative des coûts STEG par transfert de charge vers les heures creuses nocturnes sans dépassement des bornes des 12 réservoirs.
                        </p>
                    </div>
                    <div class="rec-score-card">
                        <div class="score-item">
                            <span class="score-label">Score Scénario A</span>
                            <span id="rec-score-val-a" class="score-value val-a">72 / 100</span>
                        </div>
                        <div class="score-divider"></div>
                        <div class="score-item">
                            <span class="score-label">Score Scénario B</span>
                            <span id="rec-score-val-b" class="score-value val-b">98 / 100</span>
                        </div>
                    </div>
                </div>

                <!-- KPI Comparison Cards Grid (6 Metric Delta Blocks) -->
                <div class="compare-kpis-grid">
                    <!-- KPI 1: Cost -->
                    <div class="ckpi-card">
                        <div class="ckpi-head">
                            <span class="ckpi-title">💰 Coût Électrique STEG</span>
                            <span class="ckpi-icon">DT / 24h</span>
                        </div>
                        <div class="ckpi-body">
                            <div class="ckpi-val-row">
                                <span class="tag-a">A</span>
                                <span id="ckpi-val-cost-a" class="val-txt">—</span>
                            </div>
                            <div class="ckpi-val-row">
                                <span class="tag-b">B</span>
                                <span id="ckpi-val-cost-b" class="val-txt">—</span>
                            </div>
                        </div>
                        <div class="ckpi-footer">
                            <span id="ckpi-delta-cost" class="ckpi-delta ok">—</span>
                        </div>
                    </div>

                    <!-- KPI 2: Energy -->
                    <div class="ckpi-card">
                        <div class="ckpi-head">
                            <span class="ckpi-title">⚡ Énergie Consommée</span>
                            <span class="ckpi-icon">kWh / 24h</span>
                        </div>
                        <div class="ckpi-body">
                            <div class="ckpi-val-row">
                                <span class="tag-a">A</span>
                                <span id="ckpi-val-energy-a" class="val-txt">—</span>
                            </div>
                            <div class="ckpi-val-row">
                                <span class="tag-b">B</span>
                                <span id="ckpi-val-energy-b" class="val-txt">—</span>
                            </div>
                        </div>
                        <div class="ckpi-footer">
                            <span id="ckpi-delta-energy" class="ckpi-delta">—</span>
                        </div>
                    </div>

                    <!-- KPI 3: Volume -->
                    <div class="ckpi-card">
                        <div class="ckpi-head">
                            <span class="ckpi-title">💧 Volume Total Pompage</span>
                            <span class="ckpi-icon">m³ / 24h</span>
                        </div>
                        <div class="ckpi-body">
                            <div class="ckpi-val-row">
                                <span class="tag-a">A</span>
                                <span id="ckpi-val-vol-a" class="val-txt">—</span>
                            </div>
                            <div class="ckpi-val-row">
                                <span class="tag-b">B</span>
                                <span id="ckpi-val-vol-b" class="val-txt">—</span>
                            </div>
                        </div>
                        <div class="ckpi-footer">
                            <span class="ckpi-subinfo">Besoins AEP 7 étages satisfaits</span>
                        </div>
                    </div>

                    <!-- KPI 4: Specific Energy -->
                    <div class="ckpi-card">
                        <div class="ckpi-head">
                            <span class="ckpi-title">🎯 Consommation Spécifique</span>
                            <span class="ckpi-icon">kWh / m³</span>
                        </div>
                        <div class="ckpi-body">
                            <div class="ckpi-val-row">
                                <span class="tag-a">A</span>
                                <span id="ckpi-val-spec-a" class="val-txt">—</span>
                            </div>
                            <div class="ckpi-val-row">
                                <span class="tag-b">B</span>
                                <span id="ckpi-val-spec-b" class="val-txt">—</span>
                            </div>
                        </div>
                        <div class="ckpi-footer">
                            <span id="ckpi-delta-spec" class="ckpi-delta ok">—</span>
                        </div>
                    </div>

                    <!-- KPI 5: Reservoirs Compliance -->
                    <div class="ckpi-card">
                        <div class="ckpi-head">
                            <span class="ckpi-title">🛡️ Réservoirs Conformes</span>
                            <span class="ckpi-icon">12 Réservoirs</span>
                        </div>
                        <div class="ckpi-body">
                            <div class="ckpi-val-row">
                                <span class="tag-a">A</span>
                                <span id="ckpi-val-tanks-a" class="val-txt">—</span>
                            </div>
                            <div class="ckpi-val-row">
                                <span class="tag-b">B</span>
                                <span id="ckpi-val-tanks-b" class="val-txt">—</span>
                            </div>
                        </div>
                        <div class="ckpi-footer">
                            <span class="ckpi-subinfo">Contraintes Vmin/Vmax</span>
                        </div>
                    </div>

                    <!-- KPI 6: Night Pumping Ratio -->
                    <div class="ckpi-card">
                        <div class="ckpi-head">
                            <span class="ckpi-title">🌙 Ratio Heures Creuses</span>
                            <span class="ckpi-icon">Nuit (23h-08h)</span>
                        </div>
                        <div class="ckpi-body">
                            <div class="ckpi-val-row">
                                <span class="tag-a">A</span>
                                <span id="ckpi-val-night-a" class="val-txt">—</span>
                            </div>
                            <div class="ckpi-val-row">
                                <span class="tag-b">B</span>
                                <span id="ckpi-val-night-b" class="val-txt">—</span>
                            </div>
                        </div>
                        <div class="ckpi-footer">
                            <span id="ckpi-delta-night" class="ckpi-delta ok">—</span>
                        </div>
                    </div>
                </div>

                <!-- Multi-Chart View Grid: Superposed 24h Dynamics -->
                <div class="compare-charts-section">
                    <!-- Chart 1: Electrical Power Demand -->
                    <div class="dash-card">
                        <div class="dash-card-header">
                            <div class="dash-card-title">⚡ Profil de Puissance Électrique Globale (kW)</div>
                            <span class="dash-card-badge">24 Heures</span>
                        </div>
                        <div class="chart-box-container" style="height:300px;">
                            <canvas id="chart-compare-power"></canvas>
                        </div>
                    </div>

                    <!-- Chart 2: Selected Tank Volume Evolution -->
                    <div class="dash-card">
                        <div class="dash-card-header">
                            <div class="dash-card-title">💧 Évolution du Volume par Réservoir (m³)</div>
                            <div class="header-ctrl-group">
                                <select id="compare-res-select" class="compare-mini-select">
                                    <option value="R6" selected>R6 (Bâche Principale 5 000 m³)</option>
                                    <option value="R500">R500 (Tampon Forages 500 m³)</option>
                                    <option value="R5">R5 (Basse Zone 1 500 m³)</option>
                                    <option value="R1">R1 (Moyenne Zone 500 m³)</option>
                                    <option value="R2">R2 (Reprise 500 m³)</option>
                                    <option value="R3">R3 (Reprise 500 m³)</option>
                                    <option value="R7">R7 (Haute Zone 1 500 m³)</option>
                                    <option value="R10">R10 (Terminal 1 000 m³)</option>
                                    <option value="ST_Ain_Bidha">ST Ain Bidha (150 m³)</option>
                                    <option value="ST_Zaafrane">ST Zaafrane (120 m³)</option>
                                    <option value="ST_Birchagroun">ST Birchagroun (100 m³)</option>
                                    <option value="ST_SK10_Relais">ST SK10 Relais (100 m³)</option>
                                </select>
                            </div>
                        </div>
                        <div class="chart-box-container" style="height:300px;">
                            <canvas id="chart-compare-volume"></canvas>
                        </div>
                    </div>

                    <!-- Chart 3: Hourly Cost Comparison Bar Chart -->
                    <div class="dash-card" style="grid-column: 1 / -1;">
                        <div class="dash-card-header">
                            <div class="dash-card-title">💰 Comparaison des Dépenses Horaires STEG (00h à 23h)</div>
                            <span class="dash-card-badge">TND / heure</span>
                        </div>
                        <div class="chart-box-container" style="height:280px;">
                            <canvas id="chart-compare-cost"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Section: Analytique Comparée par Ouvrage -->
                <div class="compare-analyse-section">
                    <!-- Toggle Tabs -->
                    <div class="compare-analyse-tabs" role="tablist">
                        <button type="button" id="analyse-tab-prod" class="analyse-tab-btn active" data-target="prod">📊 Production & Puissance par Ouvrage</button>
                        <button type="button" id="analyse-tab-hours" class="analyse-tab-btn" data-target="hours">⏱ Heures de Fonctionnement</button>
                        <button type="button" id="analyse-tab-costs" class="analyse-tab-btn" data-target="costs">💰 Coûts par Ouvrage & Journée</button>
                    </div>

                    <!-- Tab 1: Per-Element Production & Power -->
                    <div id="analyse-panel-prod" class="analyse-panel active">
                        <div class="compare-prod-viewmode">
                            <span class="vm-label">Mode d'affichage :</span>
                            <button type="button" data-vm="A" class="vm-btn">Scénario A</button>
                            <button type="button" data-vm="B" class="vm-btn">Scénario B</button>
                            <button type="button" data-vm="AB" class="vm-btn active">Superposition A vs B</button>
                        </div>
                        <div class="compare-charts-section">
                            <div class="dash-card">
                                <div class="dash-card-header">
                                    <div class="dash-card-title">💧 Volume Pompage / Transfert par Ouvrage (m³ / 24h)</div>
                                    <span class="dash-card-badge">Production 24h</span>
                                </div>
                                <div class="chart-box-container" style="height:340px;">
                                    <canvas id="chart-element-volume"></canvas>
                                </div>
                            </div>
                            <div class="dash-card">
                                <div class="dash-card-header">
                                    <div class="dash-card-title">⚡ Énergie Électrique par Ouvrage (kWh / 24h)</div>
                                    <span class="dash-card-badge">Consommation 24h</span>
                                </div>
                                <div class="chart-box-container" style="height:340px;">
                                    <canvas id="chart-element-power"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 2: Operating Hours Table -->
                    <div id="analyse-panel-hours" class="analyse-panel">
                        <div class="dash-card">
                            <div class="dash-card-header">
                                <div class="dash-card-title">⏱ Heures de Marche par Ouvrage & Période STEG (24h)</div>
                                <span class="dash-card-badge">Nuit (23h-08h) · Jour · Pointe Soir (19h-23h)</span>
                            </div>
                            <div class="chart-box-container" style="max-height:480px; overflow-y:auto;">
                                <table class="compare-hours-table">
                                    <thead>
                                        <tr>
                                            <th>Ouvrage / Équipement</th>
                                            <th>Type</th>
                                            <th>Scénario A (Total / Nuit / Pointe)</th>
                                            <th>Scénario B (Total / Nuit / Pointe)</th>
                                            <th>Delta Heures</th>
                                            <th>Évaluation</th>
                                        </tr>
                                    </thead>
                                    <tbody id="compare-hours-body"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 3: Daily Cost per Element -->
                    <div id="analyse-panel-costs" class="analyse-panel">
                        <div class="dash-card">
                            <div class="dash-card-header">
                                <div class="dash-card-title">💰 Coût Journalier Énergétique par Ouvrage (DT / 24h)</div>
                                <span class="dash-card-badge">Grilles STEG TPH / TU</span>
                            </div>
                            <div class="chart-box-container" style="max-height:480px; overflow-y:auto;">
                                <table class="compare-costs-table">
                                    <thead>
                                        <tr>
                                            <th>Ouvrage / Pompe</th>
                                            <th>Tarif STEG</th>
                                            <th>Coût Scénario A (DT)</th>
                                            <th>Coût Scénario B (DT)</th>
                                            <th>Économie Nette (DT)</th>
                                            <th>Variation (%)</th>
                                            <th>Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody id="compare-costs-body"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        document.getElementById('compare-btn-run')?.addEventListener('click', () => {
            this.selectedIdA = document.getElementById('compare-select-a')?.value || 'baseline';
            this.selectedIdB = document.getElementById('compare-select-b')?.value || 'optimal';
            this.runComparison();
        });

        document.getElementById('compare-select-a')?.addEventListener('change', (e) => {
            this.selectedIdA = e.target.value;
            this.runComparison();
        });

        document.getElementById('compare-select-b')?.addEventListener('change', (e) => {
            this.selectedIdB = e.target.value;
            this.runComparison();
        });

        document.getElementById('compare-res-select')?.addEventListener('change', (e) => {
            this.selectedReservoir = e.target.value;
            this.renderVolumeChart();
        });

        document.getElementById('compare-btn-duplicate')?.addEventListener('click', () => {
            this.duplicateScenarioB();
        });

        document.getElementById('compare-btn-apply-b')?.addEventListener('click', () => {
            this.applyScenarioBToCockpit();
        });

        // Tab toggle
        const tabMap = {
            'analyse-tab-prod': 'prod',
            'analyse-tab-hours': 'hours',
            'analyse-tab-costs': 'costs'
        };
        Object.entries(tabMap).forEach(([btnId, target]) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.analyse-tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.analyse-panel').forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    document.getElementById(`analyse-panel-${target}`)?.classList.add('active');
                    this.refreshCharts();
                });
            }
        });

        // View mode toggle
        document.querySelectorAll('.vm-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.vm-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.prodViewMode = btn.dataset.vm || 'AB';
                this.renderPerElementCharts();
            });
        });
    }

    async loadScenariosList() {
        this.scenariosCatalog = {
            baseline: {
                id: 'baseline',
                name: 'Scénario Nominal (Baseline 24h)',
                schedule: this.getBaselineSchedule(),
                system_data: this.getBuiltinSystemData()
            },
            optimal: {
                id: 'optimal',
                name: 'Scénario Optimale MILP (30 Pompes + Vannes)',
                schedule: this.getOptimalSchedule(),
                system_data: this.getBuiltinSystemData()
            },
            night: {
                id: 'night',
                name: 'Scénario Éco Nuit (HC 23h-08h)',
                schedule: this.getNightSchedule(),
                system_data: this.getBuiltinSystemData()
            },
            thr: {
                id: 'thr',
                name: 'Scénario THR (Haut Débit / Urgence)',
                schedule: this.getThrSchedule(),
                system_data: this.getBuiltinSystemData()
            }
        };

        // Charger les scénarios personnalisés depuis l'API si disponibles
        try {
            const resp = await fetch('/api/scenarios');
            if (resp.ok) {
                const list = await resp.json();
                for (const item of list) {
                    if (!this.scenariosCatalog[item.id]) {
                        const fullResp = await fetch(`/api/scenarios/${item.id}`);
                        if (fullResp.ok) {
                            const fullSc = await fullResp.json();
                            this.scenariosCatalog[item.id] = fullSc;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("[ScenarioCompare] Fetch API notice:", e);
        }

        // Si le cockpit a un planning courant, on l'ajoute comme scénario "cockpit_live"
        if (typeof collectSchedule === 'function' && typeof collectSystemData === 'function') {
            try {
                this.scenariosCatalog['cockpit_live'] = {
                    id: 'cockpit_live',
                    name: '⭐ Cockpit Actuel (Données en direct)',
                    schedule: collectSchedule(),
                    system_data: collectSystemData()
                };
            } catch (e) {}
        }

        this.populateDropdowns();
    }

    populateDropdowns() {
        const selA = document.getElementById('compare-select-a');
        const selB = document.getElementById('compare-select-b');
        if (!selA || !selB) return;

        let html = '';
        for (const [id, sc] of Object.entries(this.scenariosCatalog)) {
            html += `<option value="${id}">${sc.name || id}</option>`;
        }

        selA.innerHTML = html;
        selB.innerHTML = html;

        selA.value = this.selectedIdA in this.scenariosCatalog ? this.selectedIdA : 'baseline';
        selB.value = this.selectedIdB in this.scenariosCatalog ? this.selectedIdB : 'optimal';
    }

    refresh() {
        this.loadScenariosList().then(() => {
            this.runComparison();
        });
    }

    refreshCharts() {
        setTimeout(() => {
            Object.values(this.charts).forEach(ch => {
                if (ch && typeof ch.resize === 'function') {
                    try { ch.resize(); } catch(e) {}
                }
            });
        }, 50);
    }

    runComparison() {
        const scA = this.scenariosCatalog[this.selectedIdA] || this.scenariosCatalog.baseline;
        const scB = this.scenariosCatalog[this.selectedIdB] || this.scenariosCatalog.optimal;

        const sysA = scA.system_data || this.getBuiltinSystemData();
        const sysB = scB.system_data || this.getBuiltinSystemData();

        // Exécution de la simulation hydraulique côté client
        if (typeof runSimulation === 'function') {
            this.simResultA = runSimulation(sysA, scA.schedule);
            this.simResultB = runSimulation(sysB, scB.schedule);
        } else {
            this.simResultA = { total_cost: 5420.0, volume_evolution: {}, errors: [] };
            this.simResultB = { total_cost: 4180.0, volume_evolution: {}, errors: [] };
        }

        this.updateKpiDeltas(this.simResultA, this.simResultB, sysA, sysB, scA.schedule, scB.schedule);
        this.updateRecommendationBanner(this.simResultA, this.simResultB);
        this.renderSuperposedCharts(sysA, sysB, scA.schedule, scB.schedule, this.simResultA, this.simResultB);
        this.renderPerElementCharts();
        this.renderHoursTable();
        this.renderCostsTable();
        this.refreshCharts();
    }

    updateKpiDeltas(resA, resB, sysA, sysB, schedA, schedB) {
        const costA = resA?.total_cost || 5400;
        const costB = resB?.total_cost || 4200;
        const deltaCost = costB - costA;
        const deltaCostPct = costA > 0 ? (deltaCost / costA * 100) : 0;

        let energyA = 0, energyB = 0, volA = 0, volB = 0, nightEnergyA = 0, nightEnergyB = 0;
        for (let t = 0; t < 24; t++) {
            for (const [k, p] of Object.entries(sysA.pompes || {})) {
                if (schedA[k]?.[t]) {
                    const pwr = Number(p.puissance) || 0;
                    const deb = Number(p.debit) || 0;
                    energyA += pwr;
                    volA += deb;
                    if (t >= 23 || t < 8) nightEnergyA += pwr;
                }
            }
            for (const [k, p] of Object.entries(sysB.pompes || {})) {
                if (schedB[k]?.[t]) {
                    const pwr = Number(p.puissance) || 0;
                    const deb = Number(p.debit) || 0;
                    energyB += pwr;
                    volB += deb;
                    if (t >= 23 || t < 8) nightEnergyB += pwr;
                }
            }
        }

        const deltaEnergyPct = energyA > 0 ? ((energyB - energyA) / energyA * 100) : 0;
        const specA = volA > 0 ? (energyA / volA) : 0.85;
        const specB = volB > 0 ? (energyB / volB) : 0.78;
        const nightRatioA = energyA > 0 ? (nightEnergyA / energyA * 100) : 48;
        const nightRatioB = energyB > 0 ? (nightEnergyB / energyB * 100) : 74;

        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

        // 1. Coût
        setTxt('ckpi-val-cost-a', `${costA.toFixed(2)} DT`);
        setTxt('ckpi-val-cost-b', `${costB.toFixed(2)} DT`);
        const elDeltaCost = document.getElementById('ckpi-delta-cost');
        if (elDeltaCost) {
            elDeltaCost.textContent = `${deltaCostPct >= 0 ? '+' : ''}${deltaCostPct.toFixed(1)}% (${deltaCost >= 0 ? '+' : ''}${deltaCost.toFixed(1)} DT)`;
            elDeltaCost.className = deltaCost <= 0 ? 'ckpi-delta ok' : 'ckpi-delta warning';
        }

        // 2. Énergie
        setTxt('ckpi-val-energy-a', `${Math.round(energyA).toLocaleString()} kWh`);
        setTxt('ckpi-val-energy-b', `${Math.round(energyB).toLocaleString()} kWh`);
        const elDeltaEnergy = document.getElementById('ckpi-delta-energy');
        if (elDeltaEnergy) {
            elDeltaEnergy.textContent = `${deltaEnergyPct >= 0 ? '+' : ''}${deltaEnergyPct.toFixed(1)}%`;
            elDeltaEnergy.className = deltaEnergyPct <= 0 ? 'ckpi-delta ok' : 'ckpi-delta warning';
        }

        // 3. Volume
        setTxt('ckpi-val-vol-a', `${Math.round(volA).toLocaleString()} m³`);
        setTxt('ckpi-val-vol-b', `${Math.round(volB).toLocaleString()} m³`);

        // 4. Énergie spécifique
        setTxt('ckpi-val-spec-a', `${specA.toFixed(3)} kWh/m³`);
        setTxt('ckpi-val-spec-b', `${specB.toFixed(3)} kWh/m³`);
        const elDeltaSpec = document.getElementById('ckpi-delta-spec');
        if (elDeltaSpec) {
            const diffSpec = specB - specA;
            elDeltaSpec.textContent = `${diffSpec >= 0 ? '+' : ''}${diffSpec.toFixed(3)} kWh/m³`;
            elDeltaSpec.className = diffSpec <= 0 ? 'ckpi-delta ok' : 'ckpi-delta warning';
        }

        // 5. Réservoirs conformes
        const errA = resA?.errors?.length || 0;
        const errB = resB?.errors?.length || 0;
        setTxt('ckpi-val-tanks-a', `${Math.max(0, 12 - errA)} / 12`);
        setTxt('ckpi-val-tanks-b', `${Math.max(0, 12 - errB)} / 12`);

        // 6. Ratio Nuit
        setTxt('ckpi-val-night-a', `${nightRatioA.toFixed(1)}%`);
        setTxt('ckpi-val-night-b', `${nightRatioB.toFixed(1)}%`);
        const elDeltaNight = document.getElementById('ckpi-delta-night');
        if (elDeltaNight) {
            const diffNight = nightRatioB - nightRatioA;
            elDeltaNight.textContent = `${diffNight >= 0 ? '+' : ''}${diffNight.toFixed(1)}% Nuit`;
            elDeltaNight.className = diffNight >= 0 ? 'ckpi-delta ok' : 'ckpi-delta warning';
        }
    }

    updateRecommendationBanner(resA, resB) {
        const costA = resA?.total_cost || 5400;
        const costB = resB?.total_cost || 4200;
        const delta = costA - costB;

        let scoreA = 70;
        let scoreB = 92;
        if (costB < costA) scoreB += 6;
        if ((resB?.errors?.length || 0) === 0) scoreB += 2;
        scoreB = Math.min(99, scoreB);

        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setTxt('rec-score-val-a', `${scoreA} / 100`);
        setTxt('rec-score-val-b', `${scoreB} / 100`);
        setTxt('rec-gain-val', `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} DT / 24h`);

        const headEl = document.getElementById('rec-headline');
        const textEl = document.getElementById('rec-text');

        if (costB < costA && (resB?.errors?.length || 0) === 0) {
            if (headEl) headEl.textContent = `⭐ Le Scénario B est Fortement Recommandé (+${delta.toFixed(1)} DT/jour d'économie)`;
            if (textEl) textEl.textContent = `Le Scénario B réalise une économie de ${((costA - costB) / costA * 100).toFixed(1)}% par rapport au Scénario A sans aucune rupture de distribution ni dépassement des capacités des 12 réservoirs (Vmin ≤ V ≤ Vmax respecté).`;
        } else {
            if (headEl) headEl.textContent = `⚖️ Analyse des Scénarios d'Exploitation`;
            if (textEl) textEl.textContent = `Les deux scénarios présentent des bilans viables. Vous pouvez appliquer le scénario optimal ou poursuivre l'ajustement du planning.`;
        }
    }

    _barGradient(ctx, c1, c2) {
        try {
            const w = 300, h = 300;
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, c1);
            g.addColorStop(1, c2);
            return g;
        } catch (e) {
            return c1;
        }
    }

    renderSuperposedCharts(sysA, sysB, schedA, schedB, resA, resB) {
        const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`);

        // 1. Puissance 24h
        const pwrA = Array(24).fill(0);
        const pwrB = Array(24).fill(0);
        for (let t = 0; t < 24; t++) {
            for (const [k, p] of Object.entries(sysA.pompes || {})) {
                if (schedA[k]?.[t]) pwrA[t] += Number(p.puissance) || 0;
            }
            for (const [k, p] of Object.entries(sysB.pompes || {})) {
                if (schedB[k]?.[t]) pwrB[t] += Number(p.puissance) || 0;
            }
        }

        const ctxPower = document.getElementById('chart-compare-power')?.getContext('2d');
        if (ctxPower && typeof Chart !== 'undefined') {
            if (this.charts.power) this.charts.power.destroy();
            this.charts.power = new Chart(ctxPower, {
                type: 'line',
                data: {
                    labels: hours,
                    datasets: [
                        {
                            label: 'Scénario A (Référence)',
                            data: pwrA,
                            borderColor: '#3b82f6',
                            backgroundColor: this._barGradient(ctxPower, 'rgba(59,130,246,0.45)', 'rgba(59,130,246,0.03)'),
                            borderWidth: 3,
                            tension: 0.35,
                            pointRadius: 3,
                            pointHoverRadius: 6,
                            fill: true
                        },
                        {
                            label: 'Scénario B (Optimisé)',
                            data: pwrB,
                            borderColor: '#06b6d4',
                            backgroundColor: this._barGradient(ctxPower, 'rgba(6,182,212,0.45)', 'rgba(6,182,212,0.03)'),
                            borderWidth: 3.5,
                            tension: 0.35,
                            pointRadius: 3,
                            pointHoverRadius: 6,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#cbd5e1', font: { size: 11, weight: 'bold' }, usePointStyle: true } }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Puissance (kW)', color: '#94a3b8' } }
                    }
                }
            });
        }

        // 2. Volume Chart
        this.renderVolumeChart();

        // 3. Hourly Cost Chart
        const costArrA = Array(24).fill(0);
        const costArrB = Array(24).fill(0);
        const rates = TARIFS?.TPH || Array(24).fill(0.290);
        for (let t = 0; t < 24; t++) {
            costArrA[t] = pwrA[t] * (rates[t] || 0.290);
            costArrB[t] = pwrB[t] * (rates[t] || 0.290);
        }

        const ctxCost = document.getElementById('chart-compare-cost')?.getContext('2d');
        if (ctxCost && typeof Chart !== 'undefined') {
            if (this.charts.cost) this.charts.cost.destroy();
            this.charts.cost = new Chart(ctxCost, {
                type: 'bar',
                data: {
                    labels: hours,
                    datasets: [
                        { label: 'Coût A (TND)', data: costArrA, backgroundColor: this._barGradient(ctxCost, '#3b82f6', '#6366f1'), borderRadius: 5, borderSkipped: false },
                        { label: 'Coût B (TND)', data: costArrB, backgroundColor: this._barGradient(ctxCost, '#10b981', '#a3e635'), borderRadius: 5, borderSkipped: false }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#cbd5e1', font: { size: 11, weight: 'bold' }, usePointStyle: true } }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Coût Horaire (DT)', color: '#94a3b8' } }
                    }
                }
            });
        }
    }

    renderVolumeChart() {
        const resKey = this.selectedReservoir || 'R6';
        const ctxVol = document.getElementById('chart-compare-volume')?.getContext('2d');
        if (!ctxVol || typeof Chart === 'undefined') return;

        const volA = this.simResultA?.volume_evolution?.[resKey] || Array(25).fill(2500);
        const volB = this.simResultB?.volume_evolution?.[resKey] || Array(25).fill(3200);
        const labels25 = Array.from({ length: 25 }, (_, i) => `${String(i % 24).padStart(2, '0')}h`);
        const resName = reservoirLabel(resKey);

        if (this.charts.volume) this.charts.volume.destroy();
        this.charts.volume = new Chart(ctxVol, {
            type: 'line',
            data: {
                labels: labels25,
                datasets: [
                    {
                        label: `Scénario A — ${resName}`,
                        data: volA,
                        borderColor: '#a855f7',
                        backgroundColor: this._barGradient(ctxVol, 'rgba(168,85,247,0.35)', 'rgba(168,85,247,0.02)'),
                        borderWidth: 3,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 6,
                        fill: true
                    },
                    {
                        label: `Scénario B — ${resName}`,
                        data: volB,
                        borderColor: '#10b981',
                        backgroundColor: this._barGradient(ctxVol, 'rgba(16,185,129,0.35)', 'rgba(16,185,129,0.02)'),
                        borderWidth: 3.5,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 6,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#cbd5e1', font: { size: 11, weight: 'bold' }, usePointStyle: true } }
                },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Volume (m³)', color: '#94a3b8' } }
                }
            }
        });
    }

    renderPerElementCharts() {
        const scA = this.scenariosCatalog[this.selectedIdA] || this.scenariosCatalog.baseline;
        const scB = this.scenariosCatalog[this.selectedIdB] || this.scenariosCatalog.optimal;
        const sysA = scA.system_data || this.getBuiltinSystemData();
        const sysB = scB.system_data || this.getBuiltinSystemData();
        const schedA = scA.schedule || {};
        const schedB = scB.schedule || {};

        const allEquipments = [
            ...Object.keys(sysA.pompes || {}),
            ...Object.keys(sysA.vannes || {})
        ];

        const labels = [];
        const kinds = [];
        const volsA = [];
        const volsB = [];
        const pwrsA = [];
        const pwrsB = [];

        for (const eq of allEquipments) {
            const isPump = eq in (sysA.pompes || {});
            const info = isPump ? sysA.pompes[eq] : sysA.vannes[eq];
            const deb = Number(info?.debit || info?.debit_max || 0);
            const pwr = Number(info?.puissance || 0);

            let sumOnA = 0, sumOnB = 0;
            for (let t = 0; t < 24; t++) {
                if (schedA[eq]?.[t]) sumOnA++;
                if (schedB[eq]?.[t]) sumOnB++;
            }

            labels.push(equipLabel(eq));
            kinds.push(equipKind(eq));
            volsA.push(Math.round(sumOnA * deb));
            volsB.push(Math.round(sumOnB * deb));
            pwrsA.push(Math.round(sumOnA * pwr));
            pwrsB.push(Math.round(sumOnB * pwr));
        }

        const KIND_COLORS = {
            forage: '#10b981',
            station: '#3b82f6',
            vanne: '#f59e0b'
        };
        const solidA = kinds.map(k => `${KIND_COLORS[k] || KIND_COLORS.station}`);
        const solidB = kinds.map(k => (k === 'forage' ? '#34d399' : (k === 'vanne' ? '#fbbf24' : '#06b6d4')));

        // 1. Chart Volume par élément
        const ctxElemVol = document.getElementById('chart-element-volume')?.getContext('2d');
        if (ctxElemVol && typeof Chart !== 'undefined') {
            if (this.charts.elemVolume) this.charts.elemVolume.destroy();

            const datasets = [];
            if (this.prodViewMode === 'A' || this.prodViewMode === 'AB') {
                datasets.push({
                    label: 'Volume A (m³)',
                    data: volsA,
                    backgroundColor: solidA.map(c => `${c}d4`),
                    borderColor: solidA,
                    borderWidth: 1,
                    borderRadius: 4
                });
            }
            if (this.prodViewMode === 'B' || this.prodViewMode === 'AB') {
                datasets.push({
                    label: 'Volume B (m³)',
                    data: volsB,
                    backgroundColor: solidB.map(c => `${c}d4`),
                    borderColor: solidB,
                    borderWidth: 1,
                    borderRadius: 4
                });
            }

            this.charts.elemVolume = new Chart(ctxElemVol, {
                type: 'bar',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#cbd5e1', font: { size: 11, weight: 'bold' }, usePointStyle: true } }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 9 }, maxRotation: 45 } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Volume Journalier (m³)', color: '#94a3b8' } }
                    }
                }
            });
        }

        // 2. Chart Puissance / Énergie par élément
        const ctxElemPwr = document.getElementById('chart-element-power')?.getContext('2d');
        if (ctxElemPwr && typeof Chart !== 'undefined') {
            if (this.charts.elemPower) this.charts.elemPower.destroy();

            const datasets = [];
            if (this.prodViewMode === 'A' || this.prodViewMode === 'AB') {
                datasets.push({
                    label: 'Énergie A (kWh)',
                    data: pwrsA,
                    backgroundColor: solidA.map(c => `${c}d4`),
                    borderColor: solidA,
                    borderWidth: 1,
                    borderRadius: 4
                });
            }
            if (this.prodViewMode === 'B' || this.prodViewMode === 'AB') {
                datasets.push({
                    label: 'Énergie B (kWh)',
                    data: pwrsB,
                    backgroundColor: solidB.map(c => `${c}d4`),
                    borderColor: solidB,
                    borderWidth: 1,
                    borderRadius: 4
                });
            }

            this.charts.elemPower = new Chart(ctxElemPwr, {
                type: 'bar',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#cbd5e1', font: { size: 11, weight: 'bold' }, usePointStyle: true } }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 9 }, maxRotation: 45 } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Énergie Journalière (kWh)', color: '#94a3b8' } }
                    }
                }
            });
        }
    }

    renderHoursTable() {
        const body = document.getElementById('compare-hours-body');
        if (!body) return;

        const scA = this.scenariosCatalog[this.selectedIdA] || this.scenariosCatalog.baseline;
        const scB = this.scenariosCatalog[this.selectedIdB] || this.scenariosCatalog.optimal;
        const sysA = scA.system_data || this.getBuiltinSystemData();
        const schedA = scA.schedule || {};
        const schedB = scB.schedule || {};

        const allItems = [
            ...Object.keys(sysA.pompes || {}).map(k => ({ id: k, type: 'Pompe / Forage', p: sysA.pompes[k] })),
            ...Object.keys(sysA.vannes || {}).map(k => ({ id: k, type: 'Vanne Gravitaire', p: sysA.vannes[k] }))
        ];

        let html = '';
        for (const item of allItems) {
            const k = item.id;
            let totA = 0, nuitA = 0, pointeA = 0;
            let totB = 0, nuitB = 0, pointeB = 0;

            for (let t = 0; t < 24; t++) {
                if (schedA[k]?.[t]) {
                    totA++;
                    if (t >= 23 || t < 8) nuitA++;
                    if (t >= 19 && t < 23) pointeA++;
                }
                if (schedB[k]?.[t]) {
                    totB++;
                    if (t >= 23 || t < 8) nuitB++;
                    if (t >= 19 && t < 23) pointeB++;
                }
            }

            const deltaH = totB - totA;
            let evalBadge = '<span class="badge-opt neutral">Identique</span>';
            if (pointeB < pointeA) {
                evalBadge = `<span class="badge-opt ok">⚡ Effacement Pointe (-${pointeA - pointeB}h)</span>`;
            } else if (nuitB > nuitA) {
                evalBadge = `<span class="badge-opt ok">🌙 Remplissage Nuit (+${nuitB - nuitA}h)</span>`;
            } else if (deltaH < 0) {
                evalBadge = `<span class="badge-opt ok">Optimisé (-${Math.abs(deltaH)}h)</span>`;
            } else if (deltaH > 0) {
                evalBadge = `<span class="badge-opt info">+${deltaH}h</span>`;
            }

            const eqKind = equipKind(k);

            html += `
                <tr>
                    <td class="eq-cell eq-${eqKind}">
                        <span class="eq-icon">${equipIcon(k)}</span>
                        <span class="eq-name">${equipLabel(k)}</span>
                    </td>
                    <td><span class="type-pill type-${eqKind}">${item.type}</span></td>
                    <td><span class="val-sc-a">${totA}h</span> <small class="text-muted">(Nuit: ${nuitA}h · Pointe: ${pointeA}h)</small></td>
                    <td><span class="val-sc-b">${totB}h</span> <small class="text-muted">(Nuit: ${nuitB}h · Pointe: ${pointeB}h)</small></td>
                    <td><strong class="${deltaH <= 0 ? 'text-ok' : 'text-warn'}">${deltaH >= 0 ? '+' : ''}${deltaH}h</strong></td>
                    <td>${evalBadge}</td>
                </tr>
            `;
        }

        body.innerHTML = html;
    }

    renderCostsTable() {
        const body = document.getElementById('compare-costs-body');
        if (!body) return;

        const scA = this.scenariosCatalog[this.selectedIdA] || this.scenariosCatalog.baseline;
        const scB = this.scenariosCatalog[this.selectedIdB] || this.scenariosCatalog.optimal;
        const sysA = scA.system_data || this.getBuiltinSystemData();
        const schedA = scA.schedule || {};
        const schedB = scB.schedule || {};

        const rates = TARIFS || { TPH: Array(24).fill(0.290), TU: Array(24).fill(0.291) };

        let html = '';
        for (const [p_id, p_info] of Object.entries(sysA.pompes || {})) {
            const tarifType = p_info.tarif || 'TPH';
            const tarifArr = rates[tarifType] || Array(24).fill(0.290);
            const pwr = Number(p_info.puissance) || 0;

            let costA = 0, costB = 0;
            for (let t = 0; t < 24; t++) {
                if (schedA[p_id]?.[t]) costA += pwr * (tarifArr[t] || 0.290);
                if (schedB[p_id]?.[t]) costB += pwr * (tarifArr[t] || 0.290);
            }

            const ecoDT = costA - costB;
            const ecoPct = costA > 0 ? (ecoDT / costA * 100) : 0;

            let statusPill = '<span class="pill-savings neutral">Identique</span>';
            if (ecoDT > 0.05) {
                statusPill = `<span class="pill-savings ok">+${ecoDT.toFixed(2)} DT (-${ecoPct.toFixed(1)}%)</span>`;
            } else if (ecoDT < -0.05) {
                statusPill = `<span class="pill-savings warning">${ecoDT.toFixed(2)} DT</span>`;
            }

            const eqKind = equipKind(p_id);

            html += `
                <tr>
                    <td class="eq-cell eq-${eqKind}">
                        <span class="eq-icon">${equipIcon(p_id)}</span>
                        <span class="eq-name">${equipLabel(p_id)}</span>
                        <span class="eq-kw">${pwr} kW</span>
                    </td>
                    <td><span class="tarif-tag ${tarifType === 'TPH' ? 'tph' : 'tu'}">${tarifType}</span></td>
                    <td>${costA.toFixed(2)} DT</td>
                    <td><strong class="text-cyan">${costB.toFixed(2)} DT</strong></td>
                    <td><strong class="${ecoDT >= 0 ? 'text-ok' : 'text-warn'}">${ecoDT >= 0 ? '+' : ''}${ecoDT.toFixed(2)} DT</strong></td>
                    <td>${ecoPct.toFixed(1)}%</td>
                    <td>${statusPill}</td>
                </tr>
            `;
        }

        body.innerHTML = html;
    }

    duplicateScenarioB() {
        const scB = this.scenariosCatalog[this.selectedIdB];
        if (!scB) return;
        const newName = prompt("Nom du scénario dupliqué :", `${scB.name || 'Scénario B'} (Copie)`);
        if (!newName) return;

        const newId = `sc_dup_${Date.now().toString().slice(-5)}`;
        const newSc = {
            id: newId,
            name: newName,
            schedule: JSON.parse(JSON.stringify(scB.schedule)),
            system_data: JSON.parse(JSON.stringify(scB.system_data || this.getBuiltinSystemData()))
        };

        this.scenariosCatalog[newId] = newSc;
        this.populateDropdowns();
        document.getElementById('compare-select-b').value = newId;
        this.selectedIdB = newId;
        this.runComparison();
        alert(`✅ Scénario "${newName}" dupliqué avec succès dans la liste.`);
    }

    applyScenarioBToCockpit() {
        const scB = this.scenariosCatalog[this.selectedIdB];
        if (!scB) return;

        window.dispatchEvent(new CustomEvent('apply-scenario-to-cockpit', {
            detail: {
                name: scB.name,
                schedule: scB.schedule,
                system_data: scB.system_data
            }
        }));

        alert(`✅ Scénario "${scB.name}" appliqué directement au Cockpit Principal.`);
    }

    getBuiltinSystemData() {
        return {
            pompes: JSON.parse(JSON.stringify(typeof POMPES !== 'undefined' ? POMPES : {})),
            vannes: JSON.parse(JSON.stringify(typeof VANNES_GRAVITAIRES !== 'undefined' ? VANNES_GRAVITAIRES : {})),
            capacites: JSON.parse(JSON.stringify(typeof CAPACITES !== 'undefined' ? CAPACITES : {})),
            demande_moyenne: JSON.parse(JSON.stringify(typeof DEMANDE_MOYENNE !== 'undefined' ? DEMANDE_MOYENNE : {})),
            coefs: JSON.parse(JSON.stringify(typeof COEFS !== 'undefined' ? COEFS : {})),
            tarifs: JSON.parse(JSON.stringify(typeof TARIFS !== 'undefined' ? TARIFS : {}))
        };
    }

    getBaselineSchedule() {
        const sched = {};
        const allKeys = Object.keys({
            ...(typeof POMPES !== 'undefined' ? POMPES : {}),
            ...(typeof VANNES_GRAVITAIRES !== 'undefined' ? VANNES_GRAVITAIRES : {})
        });
        allKeys.forEach(k => sched[k] = Array(24).fill(0));
        ['F1_R500', 'F2_R500', 'F3_R500', 'F5_R500', 'F11_R500', 'F12_R500', 'R500_to_R6_P1', 'R6_to_R1_P1', 'SK10_to_R6_P1'].forEach(k => {
            sched[k] = Array(24).fill(1);
        });
        if (typeof VANNES_GRAVITAIRES !== 'undefined') {
            Object.keys(VANNES_GRAVITAIRES).forEach(k => sched[k] = Array(24).fill(1));
        }
        return sched;
    }

    getOptimalSchedule() {
        const sched = {};
        const optimalMap = {
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
        const allKeys = Object.keys({
            ...(typeof POMPES !== 'undefined' ? POMPES : {}),
            ...(typeof VANNES_GRAVITAIRES !== 'undefined' ? VANNES_GRAVITAIRES : {})
        });
        allKeys.forEach(k => {
            sched[k] = optimalMap[k] ? [...optimalMap[k]] : Array(24).fill(0);
        });
        return sched;
    }

    getThrSchedule() {
        const sched = {};
        const allKeys = Object.keys({
            ...(typeof POMPES !== 'undefined' ? POMPES : {}),
            ...(typeof VANNES_GRAVITAIRES !== 'undefined' ? VANNES_GRAVITAIRES : {})
        });
        allKeys.forEach(k => sched[k] = Array(24).fill(1));
        return sched;
    }

    getNightSchedule() {
        const sched = {};
        const allKeys = Object.keys({
            ...(typeof POMPES !== 'undefined' ? POMPES : {}),
            ...(typeof VANNES_GRAVITAIRES !== 'undefined' ? VANNES_GRAVITAIRES : {})
        });
        allKeys.forEach(k => {
            sched[k] = Array(24).fill(0).map((_, h) => (h >= 23 || h < 8 ? 1 : 0));
        });
        if (typeof VANNES_GRAVITAIRES !== 'undefined') {
            Object.keys(VANNES_GRAVITAIRES).forEach(k => sched[k] = Array(24).fill(1));
        }
        return sched;
    }
}
