import { renderReservoirVolumeCharts, renderHydraulicFlowChart, renderEnergyPowerChart, renderEtageSupplyPolarChart, renderEtageDemandStackedChart, renderEtageFeederDonutChart, renderEtageRankingBarChart } from './charts.js';

export function connectCharts(store, containers = {}) {
    // Accept multiple reservoir containers (dash + data-science grid) for simultaneous rendering
    const cfg = Object.assign({ reservoirs: ['reservoir-charts-dash', 'reservoir-charts-grid'], flow: 'chart-flow-balance', energy: 'chart-energy-power', etagePolar: 'chart-etage-polar', etageStacked: 'chart-etage-demand-stacked', feederDonut: 'chart-etage-feeder-donut', etageRanking: 'chart-etage-ranking-bar' }, containers || {});
    // track last simulation result reference to avoid redrawing on unrelated state changes
    let lastSimRef = null;

    function safeRenderReservoirs(results, capacites) {
        const ids = Array.isArray(cfg.reservoirs) ? cfg.reservoirs : [cfg.reservoirs];
        for (const id of ids) {
            try {
                // only render if container exists in DOM
                if (document.getElementById(id)) renderReservoirVolumeCharts(id, results, capacites);
            } catch (e) {
                console.error('renderReservoirVolumeCharts failed for', id, e);
            }
        }
    }

    function onState(st) {
        if (!st) return;
        const sim = st.simulationResult;
        if (!sim) return;
        if (sim === lastSimRef) return; // same object -> nothing changed
        lastSimRef = sim;

        const results = sim || {};
        const capacites = (st.systemData && st.systemData.capacites) ? st.systemData.capacites : {};
        safeRenderReservoirs(results, capacites);
        try { renderHydraulicFlowChart(cfg.flow, st.systemData || {}, st.schedule || {}); } catch (e) { console.error('renderHydraulicFlowChart failed', e); }
        try { renderEnergyPowerChart(cfg.energy, st.systemData || {}, st.schedule || {}); } catch (e) { console.error('renderEnergyPowerChart failed', e); }
        try { if (document.getElementById(cfg.etagePolar)) renderEtageSupplyPolarChart(cfg.etagePolar, st.systemData || {}, st.schedule || {}); } catch (e) {}
        try { if (document.getElementById(cfg.etageStacked)) renderEtageDemandStackedChart(cfg.etageStacked, st.systemData || {}, st.schedule || {}); } catch (e) {}
        try { if (document.getElementById(cfg.feederDonut)) renderEtageFeederDonutChart(cfg.feederDonut, st.systemData || {}, st.schedule || {}); } catch (e) {}
        try { if (document.getElementById(cfg.etageRanking)) renderEtageRankingBarChart(cfg.etageRanking, st.systemData || {}, st.schedule || {}); } catch (e) {}
    }

    const unsubscribe = store.subscribe(onState);
    try { onState(store.getState()); } catch (e) { }
    return () => unsubscribe();
}
