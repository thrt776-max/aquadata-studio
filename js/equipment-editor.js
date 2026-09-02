// equipment-editor.js
// Inline editing for Forages (pumps) and Vannes (valves)
// Detects tables with headers like 'forage', 'pompe', 'vanne' and enables editing on numeric cells and toggles for state

import AppState from './state.js';

function findEquipmentTables() {
    return Array.from(document.querySelectorAll('table')).filter(tbl => {
        const ths = Array.from(tbl.querySelectorAll('thead th')).map(t => (t.textContent || '').trim().toLowerCase());
        return ths.some(h => /forage|pompe|pump|vanne|valve/.test(h));
    });
}

function normalizeNumber(str) {
    if (str == null) return NaN;
    const cleaned = String(str).replace(/[^0-9+\-.,eE]/g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
}

function createOverlayInput(value) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.className = 'inline-equip-input';
    input.style.minWidth = '90px';
    input.style.padding = '4px 8px';
    input.style.borderRadius = '6px';
    input.style.border = '1px solid rgba(255,255,255,0.08)';
    input.style.background = 'var(--bg-input, rgba(20,20,32,0.6))';
    input.style.color = 'var(--text-main, #fff)';
    return input;
}

function commitEquipmentChange(rowData, key, value, area) {
    const st = AppState.getState();
    // area can be 'pompes' or 'vannes' etc.
    const collection = st.systemData?.[area] || {};
    // find by id or key
    const entryKeys = Object.keys(collection);
    let foundKey = null;
    for (const k of entryKeys) {
        const ent = collection[k];
        if ((rowData.id && ent.id && ent.id === rowData.id) || (rowData.reference && ent.reference && ent.reference === rowData.reference) || k === rowData.key) {
            foundKey = k; break;
        }
    }
    if (!foundKey) {
        console.warn('Equipment entry not found to commit', rowData, area);
        return;
    }
    const updated = JSON.parse(JSON.stringify(collection));
    const parsed = normalizeNumber(value);
    updated[foundKey][key] = Number.isNaN(parsed) ? value : parsed;
    // dispatch update
    AppState.dispatch({ type: 'UPDATE_SYSTEM_DATA', payload: { ...(st.systemData || {}), [area]: updated } });
}

export function initEquipmentInlineEditor() {
    const tables = findEquipmentTables();
    if (!tables.length) return;

    tables.forEach(tbl => {
        const headers = Array.from(tbl.querySelectorAll('thead th')).map(th => (th.textContent || '').trim().toLowerCase());
        // detect notable column indices
        const idxRef = headers.findIndex(h => /ref|réf|nom|name|id/.test(h));
        const idxDebit = headers.findIndex(h => /debit|q\(?m3|m3\/h|m3h/.test(h));
        const idxHmt = headers.findIndex(h => /hmt|hauteur|m/.test(h));
        const idxPuiss = headers.findIndex(h => /puiss|kw|puissance/.test(h));
        const idxRend = headers.findIndex(h => /rend|rendement|%/.test(h));
        const idxEtat = headers.findIndex(h => /etat|state|status|marche|arrêt|arrêt/.test(h));

        // decide area mapping
        const headerText = headers.join(' ');
        let area = 'pompes';
        if (/vanne|valv|valve/.test(headerText)) area = 'vannes';
        if (/forage|pompe|pump/.test(headerText)) area = 'pompes';

        tbl.querySelectorAll('tbody tr').forEach(tr => {
            tr.addEventListener('dblclick', (e) => {
                const cell = e.target.closest('td');
                if (!cell) return;
                const cells = Array.from(tr.querySelectorAll('td'));
                const colIdx = cells.indexOf(cell);
                const editableIdxs = [idxDebit, idxHmt, idxPuiss, idxRend];
                if (!editableIdxs.includes(colIdx) && colIdx !== idxEtat) return;

                // get identity
                const reference = idxRef >= 0 && cells[idxRef] ? (cells[idxRef].textContent || '').trim() : undefined;
                const idAttr = tr.dataset && tr.dataset.id ? tr.dataset.id : undefined;
                const keyAttr = tr.dataset && tr.dataset.key ? tr.dataset.key : undefined;
                const rowData = { reference, id: idAttr, key: keyAttr };

                if (colIdx === idxEtat) {
                    // toggle state (open/closed or marche/arret)
                    const cur = (cell.textContent || '').trim().toLowerCase();
                    const onStates = ['on','oui','marche','ouvert','1','true'];
                    const isOn = onStates.some(s => cur.includes(s));
                    const newVal = isOn ? 'OFF' : 'ON';
                    commitEquipmentChange(rowData, 'etat', newVal, area);
                    cell.textContent = newVal;
                    return;
                }

                const orig = cell.textContent.trim();
                const input = createOverlayInput(orig);
                const rect = cell.getBoundingClientRect();
                input.style.position = 'fixed';
                input.style.left = rect.left + 'px';
                input.style.top = rect.top + 'px';
                input.style.zIndex = 99998;
                document.body.appendChild(input);
                // Focus without causing the browser to scroll the viewport (prevents jump-to-left/right on edit)
                try { input.focus({ preventScroll: true }); } catch (e) { try { input.focus(); } catch(e){} }
                try { input.select && input.select(); } catch(e) { /* ignore */ }

                function finish(commit) {
                    const val = input.value.trim();
                    input.remove();
                    if (commit) {
                        // numeric validation
                        const num = normalizeNumber(val);
                        if (Number.isNaN(num)) {
                            // keep original
                            showInlineError(cell, 'Valeur numérique attendue');
                            return;
                        }
                        // determine key
                        const key = (colIdx === idxDebit) ? 'debit' : (colIdx === idxHmt) ? 'hmt' : (colIdx === idxPuiss) ? 'puissance' : (colIdx === idxRend) ? 'rendement' : null;
                        if (!key) return;
                        commitEquipmentChange(rowData, key, num, area);
                        cell.textContent = String(num);
                    }
                }

                input.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Escape') finish(false);
                    else if (ev.key === 'Enter') finish(true);
                });
                input.addEventListener('blur', () => finish(true));
            });
        });
    });
}

function showInlineError(cell, msg) {
    cell.classList.add('input-error');
    const prev = cell.querySelector('.inline-error-tip');
    if (prev) prev.remove();
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
    const rect = cell.getBoundingClientRect();
    tip.style.left = (rect.right + 8) + 'px';
    tip.style.top = (rect.top) + 'px';
    document.body.appendChild(tip);
    setTimeout(() => { tip.remove(); cell.classList.remove('input-error'); }, 1600);
}

// auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initEquipmentInlineEditor, 120));
} else {
    setTimeout(initEquipmentInlineEditor, 120);
}
