// ui-utils.js
// Utilities to improve responsive tables and inline-edit UX
import AppState from './state.js';

export function wrapWideTables() {
    // Wrap tables that are wider than their container or have many columns
    document.querySelectorAll('table').forEach(tbl => {
        if (tbl.closest('.table-responsive')) return; // already wrapped
        const cols = tbl.querySelectorAll('thead th').length || tbl.rows[0]?.cells?.length || 0;
        const needWrap = cols >= 6 || tbl.scrollWidth > tbl.clientWidth;
        if (needWrap) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            tbl.parentNode.insertBefore(wrapper, tbl);
            wrapper.appendChild(tbl);
        }
    });
}

export function initInlineEditing() {
    // Attach behavior to numeric inputs used in the app
    const selectors = ['.input-pompe', '.input-vanne', '.input-capacite', '.input-demande-moyenne', '.input-coef'];
    const elements = document.querySelectorAll(selectors.join(','));
    elements.forEach(el => {
        if (!el) return;
        // If the element is not an input, attempt to find nested input
        const input = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? el : el.querySelector('input,textarea');
        if (!input) return;

        input.addEventListener('focus', (e) => {
            input.dataset._orig = input.value;
            input.classList.add('editing');
            input.select && input.select();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // revert
                input.value = input.dataset._orig || '';
                input.blur();
                input.classList.remove('editing');
                showFieldFeedback(input, 'cancel');
            } else if (e.key === 'Enter') {
                input.blur();
            }
        });
        input.addEventListener('blur', (e) => {
            input.classList.remove('editing');
            // validation: numeric if data-type="number"
            const type = input.dataset.type || input.getAttribute('type') || 'text';
            if (type === 'number' || input.classList.contains('numeric')) {
                const val = input.value.trim();
                if (val === '' || isNaN(Number(val))) {
                    showFieldFeedback(input, 'error', 'Valeur numérique requise');
                    input.value = input.dataset._orig || '';
                    return;
                }
                // range validation (if present)
                const min = input.dataset.min !== undefined ? Number(input.dataset.min) : NaN;
                const max = input.dataset.max !== undefined ? Number(input.dataset.max) : NaN;
                const num = Number(val);
                if (!Number.isNaN(min) && num < min) {
                    showFieldFeedback(input, 'error', `Min ${min}`);
                    input.value = input.dataset._orig || '';
                    return;
                }
                if (!Number.isNaN(max) && num > max) {
                    showFieldFeedback(input, 'error', `Max ${max}`);
                    input.value = input.dataset._orig || '';
                    return;
                }
            }

            // commit: sync to central store by re-collecting system data
            try {
                const sys = window.collectSystemData ? window.collectSystemData() : null;
                if (sys) AppState.dispatch({ type: 'UPDATE_SYSTEM_DATA', payload: sys });
                showFieldFeedback(input, 'saved');
            } catch (err) {
                console.warn('Commit inline edit error', err);
            }
        });
    });
}

function showFieldFeedback(input, kind, msg) {
    // subtle visual feedback: green border for saved, orange for cancel, red for error
    const old = input.style.boxShadow;
    switch (kind) {
        case 'saved':
            input.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.14)';
            input.style.borderColor = '#10b981';
            break;
        case 'cancel':
            input.style.boxShadow = '0 0 0 2px rgba(250, 204, 21, 0.12)';
            input.style.borderColor = '#f59e0b';
            break;
        case 'error':
            input.style.boxShadow = '0 0 0 2px rgba(244, 63, 94, 0.12)';
            input.style.borderColor = '#f43f5e';
            break;
    }
    setTimeout(() => {
        input.style.boxShadow = '';
        input.style.borderColor = '';
    }, 900);
}

export function enhanceUI() {
    // Wrap wide tables and init inline editing
    try { wrapWideTables(); } catch (e) { console.warn('wrapWideTables failed', e); }
    try { initInlineEditing(); } catch (e) { console.warn('initInlineEditing failed', e); }
}
