/**
 * API Mock Interceptor - Routes Python API calls to JS engines
 */
(function (global) {
  'use strict';
  var originalFetch = global.fetch;
  var SE = global.SimEngine;
  var SO = global.SimOptimizer;
  function loadScenarios() {
    try { var s = localStorage.getItem('aquadata_scenarios'); if (s) return JSON.parse(s); } catch (e) {}
    return { baseline: { id: 'baseline', name: 'Baseline', schedule: {}, system_data: {} }, optimal: { id: 'optimal', name: 'Optimale', schedule: {}, system_data: {} }, thr: { id: 'thr', name: 'THR', schedule: {}, system_data: {} } };
  }
  function saveScenarios(s) { try { localStorage.setItem('aquadata_scenarios', JSON.stringify(s)); } catch (e) {} }
  global.fetch = function (url, options) {
    options = options || {};
    var method = (options.method || 'GET').toUpperCase();
    var body = {};
    if (options.body) { try { body = JSON.parse(options.body); } catch (e) {} }
    if (url === '/api/simulate' && method === 'POST')
      return Promise.resolve({ ok: true, status: 200, json: function(){ return Promise.resolve(SE.runSimulation(body.schedule || {}, body.system_data || {})); } });
    if (url === '/api/validate' && method === 'POST')
      return Promise.resolve({ ok: true, status: 200, json: function(){ var r = SE.runSimulation(body.schedule || {}, body.system_data || {}); return Promise.resolve({ is_valid: r.is_valid, hydraulic_status: r.hydraulic_status, status_label: r.status_label, compliant_reservoirs: r.compliant_reservoirs, non_compliant_reservoirs: r.non_compliant_reservoirs, compliant_count: r.compliant_reservoirs_count, total_reservoirs: r.total_reservoirs_count, demand_satisfaction_pct: r.demand_satisfaction_pct, switching_count: r.switching_count, errors: r.errors }); } });
    if (url === '/api/optimize' && method === 'POST')
      return Promise.resolve({ ok: true, status: 200, json: function(){ var r = SO.optimizeSchedule(body.system_data || body); return Promise.resolve({ task_id: 'local', status: 'completed', result: r }); } });
    if (url === '/api/optimize/status') return Promise.resolve({ ok: true, status: 200, json: function(){ return Promise.resolve({ active: false, status: 'idle' }); } });
    if (url === '/api/optimize/cancel') return Promise.resolve({ ok: true, status: 200, json: function(){ return Promise.resolve({ cancelled: true }); } });
    if (url === '/api/health') return Promise.resolve({ ok: true, status: 200, json: function(){ return Promise.resolve({ status: 'ok', service: 'AquaData Studio', version: '5.0-static', mode: 'client-side' }); } });
    if (url === '/api/gis/network') return Promise.resolve({ ok: true, status: 200, json: function(){ return Promise.resolve({ type: 'FeatureCollection', features: [] }); } });
    if (url === '/api/scenarios') {
      if (method === 'GET') return Promise.resolve({ ok: true, status: 200, json: function(){ return Promise.resolve(Object.values(loadScenarios())); } });
      if (method === 'POST') { var s = loadScenarios(); if (body && body.id) { s[body.id] = body; saveScenarios(s); } return Promise.resolve({ ok: true, status: 200, json: function(){ return Promise.resolve({ saved: true }); } }); }
    }
    var m = url.match(/^\/api\/scenarios\/([^\/]+)$/);
    if (m) {
      var sid = m[1]; var s = loadScenarios();
      if (method === 'GET') { var sc = s[sid]; return sc ? Promise.resolve({ ok: true, status: 200, json: function(){ return Promise.resolve(sc); } }) : Promise.resolve({ ok: false, status: 404, json: function(){ return Promise.resolve({ error: 'not found' }); } }); }
      if (method === 'DELETE') { delete s[sid]; saveScenarios(s); return Promise.resolve({ ok: true, status: 200, json: function(){ return Promise.resolve({ deleted: true }); } }); }
      if (method === 'POST' || method === 'PUT') { s[sid] = body; saveScenarios(s); return Promise.resolve({ ok: true, status: 200, json: function(){ return Promise.resolve({ saved: true }); } }); }
    }
    if (url === '/api/scenarios/duplicate' && method === 'POST') {
      var s = loadScenarios(); var src = s[body.source_id]; if (src) { var nid = body.new_id || ('sc_' + Date.now()); var c = JSON.parse(JSON.stringify(src)); c.id = nid; c.name = (c.name || '') + ' (copie)'; s[nid] = c; saveScenarios(s); return Promise.resolve({ ok: true, status: 200, json: function(){ return Promise.resolve({ id: nid, scenario: c }); } }); }
      return Promise.resolve({ ok: false, status: 404, json: function(){ return Promise.resolve({ error: 'not found' }); } });
    }
    if (url === '/api/scenarios/compare' && method === 'POST') {
      var s = loadScenarios(); var ids = body.ids || []; var res = ids.map(function(id) { var sc = s[id]; if (!sc) return null; var sim = SE.runSimulation(sc.schedule || {}, sc.system_data || {}); return { id: id, name: sc.name, total_cost: sim.total_cost, savings_pct: sim.savings_pct, is_valid: sim.is_valid, energy: sim.total_energy_kwh }; }).filter(Boolean);
      return Promise.resolve({ ok: true, status: 200, json: function(){ return Promise.resolve(res); } });
    }
    return originalFetch.apply(global, arguments);
  };
})(window);