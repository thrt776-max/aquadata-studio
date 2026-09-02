// Simple central store (ES module)
// Provides a single source of truth for system data, schedule and simulation results.
// Lightweight API: getState(), dispatch(action), subscribe(listener), clearPersistence()

const STORAGE_KEY = 'aquadata_state_v1';

const initialState = {
    systemData: {},
    schedule: {},
    simulationResult: null,
    lastUpdated: null
};

function loadStateFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        // basic shape validation
        if (typeof parsed !== 'object') return null;
        return {
            systemData: parsed.systemData || {},
            schedule: parsed.schedule || {}
        };
    } catch (e) {
        console.warn('Failed to load state from storage', e);
        return null;
    }
}

function saveStateToStorage(state) {
    try {
        const payload = {
            systemData: state.systemData || {},
            schedule: state.schedule || {}
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
        console.warn('Failed to save state to storage', e);
    }
}

function clearPersistence() {
    try { localStorage.removeItem(STORAGE_KEY); } catch(e) { /* ignore */ }
}

function createStore() {
    // restore user-editable parts from storage when available
    const persisted = loadStateFromStorage();
    let state = { ...initialState, ...(persisted ? { systemData: persisted.systemData, schedule: persisted.schedule } : {}) };
    const listeners = new Set();

    function getState() {
        return state;
    }

    function subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    function notify() {
        for (const l of listeners) {
            try { l(state); } catch (e) { console.error('listener error', e); }
        }
    }

    function dispatch(action) {
        if (!action || typeof action.type !== 'string') return;
        switch (action.type) {
            case 'INIT_STATE':
                state = { ...state, ...action.payload, lastUpdated: Date.now() };
                break;
            case 'UPDATE_SYSTEM_DATA':
                state = { ...state, systemData: action.payload, lastUpdated: Date.now() };
                // persist user edits
                saveStateToStorage(state);
                break;
            case 'UPDATE_SCHEDULE':
                state = { ...state, schedule: action.payload, lastUpdated: Date.now() };
                // persist user edits
                saveStateToStorage(state);
                break;
            case 'SET_SIMULATION_RESULT':
                // do not persist simulation results - they are derived data
                state = { ...state, simulationResult: action.payload, lastUpdated: Date.now() };
                break;
            default:
                // allow custom reducers via action.handler
                if (typeof action.handler === 'function') {
                    const next = action.handler(state);
                    if (next && typeof next === 'object') {
                        state = { ...state, ...next, lastUpdated: Date.now() };
                        // persist if user-editable parts changed (best-effort)
                        try { saveStateToStorage(state); } catch(e) { /* ignore */ }
                    }
                }
        }
        notify();
    }

    return { getState, dispatch, subscribe, clearPersistence };
}

const store = createStore();

export default store;
