// alerts.js
// Subscribe to AppState and render alert badge + a fixed alerts table at the bottom of the Analytics pane

import AppState from './state.js';

function renderAlertBadge(count) {
    const el = document.getElementById('kpi-alerts-count');
    if (!el) return;
    el.textContent = String(count);
    if (count > 0) el.classList.add('badge-warning'); else el.classList.remove('badge-warning');
}

function ensureAlertsTableContainer() {
    let container = document.getElementById('analytics-alerts-table');
    if (!container) {
        // try to append to dashboard-analytics-grid if present, otherwise append to body as fallback
        const analyticsGrid = document.querySelector('.dashboard-analytics-grid');
        container = document.createElement('div');
        container.id = 'analytics-alerts-table';
        container.className = 'analytics-alerts-table';
        if (analyticsGrid) {
            // insert at the end of the analytics grid so it appears as a fixed-bottom block inside that pane
            analyticsGrid.appendChild(container);
        } else {
            document.body.appendChild(container);
        }
    }
    return container;
}

function renderAlertsTable(errors) {
    const container = ensureAlertsTableContainer();
    container.innerHTML = '';
    // header
    const header = document.createElement('div');
    header.className = 'alerts-table-header';
    header.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700;color:var(--text-main);">⚠️ Alertes Système (${errors.length})</div><div style="color:var(--text-muted);font-size:0.85rem;">Dernière mise à jour: ${new Date().toLocaleTimeString()}</div></div>`;
    container.appendChild(header);

    if (!errors || errors.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'alerts-table-empty';
        empty.textContent = 'Aucune alerte détectée.';
        empty.style.padding = '12px';
        empty.style.color = 'var(--text-muted)';
        container.appendChild(empty);
        return;
    }

    const table = document.createElement('table');
    table.className = 'alerts-table';
    table.innerHTML = `
        <thead>
            <tr><th>Heure</th><th>Réservoir / Noeud</th><th>Détail</th><th>Sév.</th></tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    errors.forEach((err, idx) => {
        const row = document.createElement('tr');
        const hour = err.heure || err.hour || (err.time ? String(err.time) : '');
        const node = err.reservoirId || err.res || err.node || '—';
        const msg = err.message || String(err || '').slice(0, 120);
        const vol = err.volume ? ` Vol: ${err.volume} m³` : '';
        let sev = (err.severity || '').toLowerCase();
        if (!sev) {
            // derive severity heuristically from available fields/messages
            if ((msg || '').toLowerCase().includes('debord') || (msg || '').toLowerCase().includes('overflow') || (msg || '').toLowerCase().includes('max')) sev = 'critical';
            else if ((msg || '').toLowerCase().includes('seuil') || (msg || '').toLowerCase().includes('min') || (msg || '').toLowerCase().includes('warn')) sev = 'warning';
            else sev = 'info';
        }

        row.innerHTML = `<td class="tbl-idx">${hour}</td><td class="tbl-idx">${node}</td><td class="tbl-vol">${msg}${vol}</td><td class="alert-sev alert-sev-${sev}">${sev.toUpperCase()}</td>`;
        tbody.appendChild(row);
    });

    container.appendChild(table);
}

// subscribe to AppState
AppState.subscribe((st) => {
    const res = st.simulationResult;
    if (!res) {
        renderAlertBadge(0);
        renderAlertsTable([]);
        return;
    }
    const errors = Array.isArray(res.errors) ? res.errors.map(e => typeof e === 'string' ? { message: e } : e) : [];
    renderAlertBadge(errors.length);
    renderAlertsTable(errors);
});

// Export helper to manually refresh
export function refreshAlerts() {
    const st = AppState.getState();
    const res = st.simulationResult;
    const errors = res && Array.isArray(res.errors) ? res.errors.map(e => typeof e === 'string' ? { message: e } : e) : [];
    renderAlertBadge(errors.length);
    renderAlertsTable(errors);
}
