// reservoir-editor.js
// Enable robust inline editing for reservoir tables.
// Looks for tables whose header contains 'Vmin' and 'Vmax' and applies double-click edit behavior on numeric cells.

import AppState from './state.js';

function findReservoirTables() {
    return Array.from(document.querySelectorAll('table')).filter(tbl => {
        const ths = Array.from(tbl.querySelectorAll('thead th')).map(t => (t.textContent || '').trim().toLowerCase());
        return ths.some(h => h.includes('vmin')) && ths.some(h => h.includes('vmax')) && ths.some(h => h.includes('volume'));
    });
}

function getHeaderMap(tbl) {
    const headers = Array.from(tbl.querySelectorAll('thead th'));
    const map = {};
    headers.forEach((th, idx) => {
        const txt = (th.textContent || '').trim().toLowerCase();
        map[txt] = idx;
    });
    return map;
}

function normalizeNumber(str) {
    if (str == null) return NaN;
    const cleaned = String(str).replace(/[^0-9+\-.,eE]/g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
}

function createInputForCell(cell, initial) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = initial;
    input.className = 'inline-reservoir-input';
    input.style.minWidth = '80px';
    input.style.padding = '4px 8px';
    input.style.borderRadius = '6px';
    input.style.border = '1px solid rgba(255,255,255,0.08)';
    input.style.background = 'var(--bg-input, rgba(20,20,32,0.6))';
    input.style.color = 'var(--text-main, #fff)';
    return input;
}

function showError(cell, msg) {
    cell.classList.add('input-error');
    const tip = document.createElement('div');
    tip.className = 'inline-error-tip';
    tip.textContent = msg;
    tip.style.position = 'absolute';
    tip.style.background = 'rgba(244,63,94,0.95)';
    tip.style.color = '#fff';
    tip.style.fontSize = '12px';
    tip.style.padding = '6px 8px';
    tip.style.borderRadius = '6px';
    tip.style.zIndex = 99999;
    // position near cell
    const rect = cell.getBoundingClientRect();
    tip.style.left = (rect.right + 8) + 'px';
    tip.style.top = (rect.top) + 'px';
    document.body.appendChild(tip);
    setTimeout(() => { tip.remove(); cell.classList.remove('input-error'); }, 1600);
}

function commitReservoirChange(rowData, key, value) {
    // rowData is an object-like map with parsed values and an id if present
    // We fetch latest state and update the reservoir matching id or reference
    const st = AppState.getState();
    const reservoirs = st.systemData?.reservoirs || [];
    const idx = reservoirs.findIndex(r => r.id && rowData.id ? r.id === rowData.id : (r.reference && rowData.reference ? r.reference === rowData.reference : false));
    if (idx === -1) {
        console.warn('Reservoir not found in state to commit change', rowData);
        return;
    }
    const updated = JSON.parse(JSON.stringify(reservoirs));
    const old = updated[idx][key];
    // coerce to number when appropriate
    const num = normalizeNumber(value);
    updated[idx][key] = Number.isNaN(num) ? value : num;
    AppState.dispatch({ type: 'UPDATE_SYSTEM_DATA', payload: { ...st.systemData, reservoirs: updated } });
}

export function initReservoirInlineEditor() {
    const tables = findReservoirTables();
    if (!tables.length) return;

    tables.forEach(tbl => {
        // compute header indices for interesting fields
        const headers = Array.from(tbl.querySelectorAll('thead th')).map(th => (th.textContent || '').trim().toLowerCase());
        const idxVmin = headers.findIndex(h => h.includes('vmin'));
        const idxVmax = headers.findIndex(h => h.includes('vmax'));
        const idxVinit = headers.findIndex(h => h.includes('initial') || h.includes('volume initial') || h.includes('volume initiale') || h.includes('volume'));
        const idxRef = headers.findIndex(h => h.includes('réf') || h.includes('reference') || h.includes('réservoir') || h.includes('nom'));

        if (idxVmin < 0 && idxVmax < 0) return;

        // attach dblclick
        tbl.querySelectorAll('tbody tr').forEach(tr => {
            tr.addEventListener('dblclick', (e) => {
                const cell = e.target.closest('td');
                if (!cell) return;
                const cells = Array.from(tr.querySelectorAll('td'));
                const colIdx = cells.indexOf(cell);
                // identify if this cell is one of the editable reservoir numeric cells
                if (![idxVmin, idxVmax, idxVinit].includes(colIdx)) return;

                const orig = cell.textContent.trim();
                // create absolute positioned input overlay
                const input = createInputForCell(cell, orig);
                // position
                const rect = cell.getBoundingClientRect();
                input.style.position = 'fixed';
                input.style.left = rect.left + 'px';
                input.style.top = rect.top + 'px';
                input.style.zIndex = 99998;
                document.body.appendChild(input);
                // Focus without forcing browser scroll to avoid horizontal/vertical jumps
                try { input.focus({ preventScroll: true }); } catch (e) { try { input.focus(); } catch(e){} }
                try { input.select && input.select(); } catch(e) { /* ignore */ }

                // collect row identity
                const reference = cells[idxRef] ? (cells[idxRef].textContent || '').trim() : undefined;
                const idAttr = tr.dataset && tr.dataset.id ? tr.dataset.id : undefined;
                const rowData = { reference, id: idAttr };

                function finish(commit) {
                    const val = input.value.trim();
                    input.remove();
                    if (commit) {
                        // validation: numeric and ranges for Vmin<Vmax, Vmin<=Vinit<=Vmax
                        const num = normalizeNumber(val);
                        if (Number.isNaN(num)) {
                            showError(cell, 'Valeur numérique attendue');
                            return;
                        }
                        // if editing Vmin or Vmax, check relationship with the other
                        const st = AppState.getState();
                        const reservoirs = st.systemData?.reservoirs || [];
                        const found = reservoirs.find(r => (idAttr && r.id === idAttr) || (reference && r.reference === reference));
                        const otherVmin = (colIdx === idxVmax) ? (found ? found.vmin : NaN) : (colIdx === idxVmin ? (found ? found.vmax : NaN) : NaN);
                        // if both known, validate
                        if (!Number.isNaN(otherVmin)) {
                            if (colIdx === idxVmin && num > otherVmin) { showError(cell, 'Vmin doit être < Vmax'); return; }
                            if (colIdx === idxVmax && num < otherVmin) { showError(cell, 'Vmax doit être > Vmin'); return; }
                        }

                        // commit
                        const key = (colIdx === idxVmin) ? 'vmin' : (colIdx === idxVmax) ? 'vmax' : 'volumeInitial';
                        commitReservoirChange(rowData, key, num);
                        // visual commit
                        cell.textContent = String(num);
                    } else {
                        // cancelled, nothing to do
                    }
                }

                input.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Escape') { finish(false); }
                    else if (ev.key === 'Enter') { finish(true); }
                });
                input.addEventListener('blur', () => finish(true));
            });
        });
    });
}

// Auto-init when document ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initReservoirInlineEditor, 120));
} else {
    setTimeout(initReservoirInlineEditor, 120);
}
