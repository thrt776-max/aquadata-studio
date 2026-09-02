/**
 * AquaData Studio v5.0 — EPANET 2 Studio (clone fidèle de l'interface EPANET)
 * - Interface EPANET 2 : barre de menus, barre d'outils, Navigateur (Données/Schéma),
 *   fenêtre Propriété, légendes, bandeau temps « Jour 1, 12:00 AM », fond blanc.
 * - Moteur hydraulique : Algorithme du Gradient Global (GGA), Hazen-Williams /
 *   Darcy-Weisbach / Chezy-Manning, pompes (énergie, kWh/m³), vannes, bâches 24h.
 * - Interactions corrigées : clic simple = sélection, glisser = déplacement 1:1,
 *   double-clic = zoom avant, molette = zoom ancré, placement exact au point cliqué.
 */

const EP2_CSS = `
.ep2root{font:11px Tahoma,'Segoe UI',Arial,sans-serif;background:#d4d0c8;color:#000;
  display:flex;flex-direction:column;height:100%;min-height:560px;border:1px solid #808080;position:relative;overflow:hidden;user-select:none;}
.ep2root *{box-sizing:border-box;}
.ep2-menubar{display:flex;align-items:center;background:#d4d0c8;border-bottom:1px solid #99a4b8;padding:1px 2px;gap:0;}
.ep2-menu-item{padding:3px 8px;cursor:default;position:relative;}
.ep2-menu-item:hover,.ep2-menu-open{background:#0a246a;color:#fff;}
.ep2-menu-drop{position:absolute;top:100%;left:0;background:#f6f4ea;border:1px solid #6b7b99;box-shadow:2px 2px 4px rgba(0,0,0,.35);
  min-width:210px;z-index:910;display:none;padding:2px;}
.ep2-menu-open .ep2-menu-drop{display:block;}
.ep2-mi{padding:3px 18px 3px 22px;white-space:nowrap;color:#000;}
.ep2-mi:hover{background:#0a246a;color:#fff;}
.ep2-mi-sep{height:1px;background:#b8b0a0;margin:3px 4px;}
.ep2-toolbar{display:flex;align-items:center;background:#d4d0c8;border-bottom:1px solid #99a4b8;padding:2px 4px;gap:1px;flex-wrap:wrap;}
.ep2-tb-sep{width:2px;height:20px;background:#9a9a8e;margin:0 3px;}
.ep2-tbtn{width:24px;height:22px;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;
  border:1px solid transparent;background:transparent;color:#222;border-radius:2px;}
.ep2-tbtn:hover{border-color:#3169c6;background:#cfe3fb;}
.ep2-tbtn.active{border:1px solid #3169c6;background:#a8cdf0;}
.ep2-model-name{margin-left:auto;font-weight:bold;color:#0a246a;padding-right:6px;}
.ep2-work{flex:1;position:relative;background:#9db4c8;overflow:hidden;}
.ep2-win{position:absolute;background:#ece9d8;border:1px solid #4b5f8f;box-shadow:2px 2px 5px rgba(0,0,0,.4);display:flex;flex-direction:column;}
.ep2-win-title{height:20px;display:flex;align-items:center;gap:5px;padding:0 3px;cursor:move;
  background:linear-gradient(90deg,#0a246a,#3a6ea5 60%,#a6caf0);color:#fff;font-weight:bold;font-size:11px;flex:none;}
.ep2-win-title .ep2-tt{flex:1;overflow:hidden;white-space:nowrap;}
.ep2-wbtn{width:16px;height:14px;border:1px solid #fff;background:#d4d0c8;color:#000;font-size:9px;line-height:12px;text-align:center;cursor:pointer;flex:none;}
.ep2-wbtn:hover{background:#e8e4d8;}
.ep2-wbtn.close{background:#e04343;color:#fff;font-weight:bold;}
.ep2-win-body{flex:1;overflow:hidden;position:relative;background:#fff;}
.ep2-svg{position:absolute;inset:0;width:100%;height:100%;background:#fff;cursor:default;display:block;}
.ep2-svg.tool-add{cursor:crosshair;}
.ep2-svg.tool-pan{cursor:grab;}
.ep2-svg.panning{cursor:grabbing !important;}
.ep2-timebadge{position:absolute;top:6px;right:8px;background:#000;color:#00e800;font:bold 13px 'Consolas','Courier New',monospace;
  padding:4px 12px;border:1px solid #00e800;z-index:40;pointer-events:none;}
.ep2-legend{position:absolute;background:#fff;border:1px solid #555;z-index:40;padding:4px 6px;min-width:96px;pointer-events:none;}
.ep2-legend h4{margin:0 0 3px 0;font-size:11px;color:#000;}
.ep2-legend .row{display:flex;align-items:center;gap:4px;font-size:10px;margin:1px 0;}
.ep2-legend .sw{width:18px;height:9px;border:1px solid #666;}
.ep2-legend .unit{font-size:10px;margin-top:2px;}
.ep2-nav{position:absolute;width:196px;z-index:120;background:#ece9d8;border:1px solid #4b5f8f;box-shadow:2px 2px 5px rgba(0,0,0,.4);font-size:11px;}
.ep2-nav .ep2-win-title{height:19px;}
.ep2-nav-tabs{display:flex;gap:2px;padding:3px 4px 0 4px;}
.ep2-nav-tab{flex:1;padding:3px 6px;border:1px solid #8f8f83;border-bottom:none;background:#d4d0c8;cursor:pointer;text-align:center;}
.ep2-nav-tab.active{background:#ece9d8;font-weight:bold;position:relative;top:1px;}
.ep2-nav-body{border-top:1px solid #8f8f83;padding:6px;display:none;}
.ep2-nav-body.active{display:block;}
.ep2-nav select,.ep2-nav input,.ep2-prop select,.ep2-prop input,.ep2-dlg select,.ep2-dlg input{font:11px Tahoma;border:1px solid #7f9db9;background:#fff;padding:2px;width:100%;}
.ep2-nav-list{margin-top:5px;height:120px;overflow:auto;border:1px solid #7f9db9;background:#fff;}
.ep2-nav-list div{padding:2px 4px;cursor:pointer;}
.ep2-nav-list div:hover{background:#cfe3fb;}
.ep2-nav-list div.sel{background:#0a246a;color:#fff;}
.ep2-nav-btns{display:flex;gap:4px;margin-top:6px;justify-content:space-between;}
.ep2-nav-time{margin-top:6px;}
.ep2-nav-slider{display:flex;align-items:center;gap:3px;margin-top:4px;}
.ep2-nav-slider input[type=range]{flex:1;min-width:0;}
.ep2-playbtns{display:flex;gap:3px;justify-content:center;margin-top:5px;}
.ep2-playbtns button{width:26px;height:22px;font-size:11px;border:1px solid #7f9db9;background:#ece9d8;cursor:pointer;}
.ep2-playbtns button:hover{background:#cfe3fb;}
.ep2-prop{position:absolute;width:250px;z-index:130;background:#ece9d8;border:1px solid #4b5f8f;box-shadow:2px 2px 5px rgba(0,0,0,.4);}
.ep2-prop table{width:100%;border-collapse:collapse;background:#fff;}
.ep2-prop th{background:#d4d0c8;border:1px solid #b0aca0;padding:2px 4px;text-align:left;font-weight:normal;font-size:11px;}
.ep2-prop td{border:1px solid #d8d4c8;padding:1px 4px;height:22px;font-size:11px;}
.ep2-prop td.lbl{width:52%;background:#fff;}
.ep2-prop td.val input{border:1px solid transparent;background:transparent;font-size:11px;padding:1px 2px;}
.ep2-prop td.val input:focus{border-color:#3169c6;background:#fff;}
.ep2-dlg{position:absolute;z-index:200;background:#ece9d8;border:1px solid #4b5f8f;box-shadow:3px 3px 6px rgba(0,0,0,.45);min-width:340px;padding:0;}
.ep2-dlg .ep2-win-title{height:22px;}
.ep2-dlg-body{padding:10px;}
.ep2-dlg fieldset{border:1px solid #b0aca0;margin-bottom:8px;padding:6px 8px;}
.ep2-dlg legend{padding:0 4px;font-weight:bold;}
.ep2-dlg label{display:block;margin:3px 0;}
.ep2-dlg .row{display:flex;gap:10px;}
.ep2-dlg .row>div{flex:1;}
.ep2-dlg-btns{display:flex;gap:8px;justify-content:center;padding:4px 0 8px 0;}
.ep2-btn{min-width:76px;padding:3px 12px;font:11px Tahoma;border:1px solid #003c74;background:#ece9d8;cursor:pointer;border-radius:2px;}
.ep2-btn:hover{background:#cfe3fb;}
.ep2-btn:active{background:#a8cdf0;}
.ep2-report{position:absolute;z-index:150;background:#ece9d8;border:1px solid #4b5f8f;box-shadow:3px 3px 6px rgba(0,0,0,.45);min-width:420px;min-height:220px;}
.ep2-report-tabs{display:flex;gap:2px;padding:3px 4px 0;}
.ep2-report-tabs .ep2-nav-tab{min-width:80px;}
.ep2-tbl-wrap{flex:1;overflow:auto;background:#fff;border:1px solid #7f9db9;margin:6px;}
.ep2-tbl{border-collapse:collapse;font-size:11px;background:#ffffe8;}
.ep2-tbl th{background:#d4d0c8;border:1px solid #888;padding:3px 8px;text-align:center;position:sticky;top:0;}
.ep2-tbl td{border:1px solid #bbb;padding:2px 8px;text-align:right;}
.ep2-tbl td:first-child{text-align:left;background:#fffff0;}
.ep2-tbl tr.sel td{background:#3169c6;color:#fff;}
.ep2-canvas-wrap{width:860px;height:420px;background:#fff;margin:6px;position:relative;}
.ep2-energy-left{float:left;width:130px;padding:6px;}
.ep2-energy-left label{display:block;margin:10px 0;font-size:11px;cursor:pointer;}
.ep2-statusbar{display:flex;align-items:center;gap:14px;background:#d4d0c8;border-top:1px solid #99a4b8;padding:2px 8px;font-size:11px;color:#222;flex:none;}
.ep2-statusbar .sp{flex:1;}
.ep2-hidden{display:none !important;}
`;

export class EpanetSynopticViewer {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.options = options || {};
        this.model = null;
        this.simResults = null;
        this.isSimulated = false;
        this.currentHour = 0;
        this.isPlaying = false;
        this.playTimer = null;
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.tool = 'select';           // select|pan|move|add_junction|add_reservoir|add_tank|add_pipe|add_pump|add_valve|add_label
        this.selected = null;           // {type,id}
        this.drawingFrom = null;        // node id pour tracé conduite/pompe/vanne
        this.navCategory = 'junctions';
        this.nodeParam = 'pressure';
        this.linkParam = 'flow';
        this.energyMetric = 'kwh';
        this.init();
    }

    init() {
        if (!this.container) return;
        this.injectCss();
        this.renderShell();
        this.bindEvents();
        // Charger le réseau Le Kef par défaut pour visualisation immédiate
        this.loadPreset('lekef');
    }

    injectCss() {
        if (document.getElementById('ep2-style')) return;
        const st = document.createElement('style');
        st.id = 'ep2-style';
        st.textContent = EP2_CSS;
        document.head.appendChild(st);
    }

    /* ============================ INTERFACE ============================ */
    renderShell() {
        this.container.innerHTML = '';
        const root = document.createElement('div');
        root.className = 'ep2root';
        root.innerHTML = `
            <div class="ep2-menubar"></div>
            <div class="ep2-toolbar"></div>
            <div class="ep2-work">
                <div class="ep2-win" id="ep2-mapwin" style="left:8px;top:8px;right:210px;bottom:8px;">
                    <div class="ep2-win-title">
                        <span style="color:#ff5f5f;">✓</span><span class="ep2-tt">Schéma du Réseau</span>
                        <button class="ep2-wbtn" title="Réduire">_</button>
                        <button class="ep2-wbtn" title="Agrandir">□</button>
                        <button class="ep2-wbtn close" title="Fermer" data-act="close-map">×</button>
                    </div>
                    <div class="ep2-win-body" id="ep2-mapbody">
                        <svg class="ep2-svg" id="ep2-svg" xmlns="http://www.w3.org/2000/svg"></svg>
                        <div class="ep2-timebadge" id="ep2-timebadge">Jour 1, 12:00 AM</div>
                        <div class="ep2-legend" id="ep2-legend-node" style="top:10px;left:10px;"></div>
                        <div class="ep2-legend" id="ep2-legend-link" style="bottom:10px;left:10px;"></div>
                    </div>
                </div>
            </div>
            <div class="ep2-statusbar">
                <span id="ep2-st-mode">Mode : Sélection</span>
                <span id="ep2-st-coord">X: 0 | Y: 0</span>
                <span class="sp"></span>
                <span id="ep2-st-zoom">Zoom : 100%</span>
                <span id="ep2-st-net">Réseau : 0 nœuds · 0 arcs</span>
                <span id="ep2-st-sim">Calcul : en attente</span>
            </div>`;
        this.container.appendChild(root);
        this.root = root;
        this.buildMenus();
        this.buildToolbar();
        this.buildNavigator();
        this.renderLegends();
        const body = document.getElementById('ep2-mapbody');
        if (body && window.ResizeObserver) new ResizeObserver(() => this.resizeSvg()).observe(body);
    }

    /* ============================ MENUS ============================ */
    buildMenus() {
        this._menuDefs = [
            { title: 'Fichier', items: [
                { t: 'Nouveau projet', a: () => this.newProject() },
                { t: 'Ouvrir .INP…', a: () => this.triggerImport() },
                { t: 'Enregistrer (JSON)', a: () => this.saveJson() },
                { sep: true },
                { t: 'Importer un réseau .INP…', a: () => this.triggerImport() },
                { t: 'Exporter .INP', a: () => this.exportInpFile() },
            ]},
            { title: 'Édition', items: [
                { t: "Supprimer l'élément sélectionné", a: () => this.deleteSelected() },
                { sep: true },
                { t: 'Créer une jonction', a: () => this.setTool('add_junction') },
                { t: 'Créer une conduite', a: () => this.setTool('add_pipe') },
                { t: 'Créer une pompe', a: () => this.setTool('add_pump') },
                { t: 'Créer une vanne', a: () => this.setTool('add_valve') },
            ]},
            { title: 'Affichage', items: [
                { t: 'Zoom avant', a: () => this.applyZoomAtPoint(1.4) },
                { t: 'Zoom arrière', a: () => this.applyZoomAtPoint(0.72) },
                { t: 'Étendue totale', a: () => this.fitBounds() },
                { t: 'Zoom 1:1 (100%)', a: () => this.resetZoom() },
                { sep: true },
                { t: 'Légendes', a: () => this.toggleLegends() },
            ]},
            { title: 'Projet', items: [
                { t: 'Le Kef — Réseau AEP 24h', a: () => this.loadPreset('lekef') },
                { t: 'EPANET Net1 (EPA)', a: () => this.loadPreset('net1') },
                { t: 'Hanoi (Benchmark)', a: () => this.loadPreset('hanoi') },
            ]},
        ];
        this._menuDefs2 = [
            { title: 'Rapport', items: [
                { t: 'État', a: () => this.showStateReport() },
                { t: 'Énergie', a: () => this.showEnergyReport() },
                { t: 'Réaction', a: () => this.showReactionReport() },
                { t: 'Complet…', a: () => this.showFullReport() },
                { sep: true },
                { t: 'Graphique…', a: () => this.showGraphDialog() },
                { t: 'Tableau…', a: () => this.showTableDialog() },
            ]},
            { title: 'Fenêtre', items: [
                { t: 'Navigateur', a: () => this.toggleNavigator() },
                { t: 'Propriétés', a: () => this.openProperties(this.selected) },
                { t: 'Réorganiser', a: () => this.fitBounds() },
            ]},
            { title: 'Aide', items: [
                { t: "À propos d'EPANET 2 Studio…", a: () => this.showAbout() },
            ]},
        ];
        const bar = this.root.querySelector('.ep2-menubar');
        this._menuActions = {};
        const build = (defs, offset) => {
            defs.forEach((m, idx) => {
                const el = document.createElement('div');
                el.className = 'ep2-menu-item';
                const items = m.items.map((it, j) => it.sep ? '<div class="ep2-mi-sep"></div>'
                    : `<div class="ep2-mi" data-act="${offset + idx}_${j}">${it.t}</div>`).join('');
                el.innerHTML = `<span>${m.title}</span><div class="ep2-menu-drop">${items}</div>`;
                bar.appendChild(el);
                m.items.forEach((it, j) => { if (it.a) this._menuActions[`${offset + idx}_${j}`] = it.a; });
            });
        };
        build(this._menuDefs, 0);
        build(this._menuDefs2, 10);
        bar.addEventListener('click', (e) => {
            const mi = e.target.closest('.ep2-mi');
            if (mi && mi.dataset.act) {
                bar.querySelectorAll('.ep2-menu-item').forEach(m => m.classList.remove('ep2-menu-open'));
                const fn = this._menuActions[mi.dataset.act];
                if (fn) fn();
                e.stopPropagation();
                return;
            }
            const item = e.target.closest('.ep2-menu-item');
            if (!item) return;
            const wasOpen = item.classList.contains('ep2-menu-open');
            bar.querySelectorAll('.ep2-menu-item').forEach(m => m.classList.remove('ep2-menu-open'));
            if (!wasOpen) item.classList.add('ep2-menu-open');
            e.stopPropagation();
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.ep2-menubar')) bar.querySelectorAll('.ep2-menu-item').forEach(m => m.classList.remove('ep2-menu-open'));
        });
    }

    /* ============================ BARRE D'OUTILS ============================ */
    buildToolbar() {
        const bar = this.root.querySelector('.ep2-toolbar');
        const tools = [
            { id: 'new',     icon: '🗎', tip: 'Nouveau projet', a: () => this.newProject() },
            { id: 'open',    icon: '📂', tip: 'Ouvrir .INP', a: () => this.triggerImport() },
            { id: 'save',    icon: '💾', tip: 'Enregistrer', a: () => this.saveJson() },
            { sep: true },
            { id: 'run',     icon: '⚡', tip: 'Lancer la simulation hydraulique', a: () => this.runHydraulicSimulation(true), cls: 'ep2-run' },
            { id: 'rep',     icon: '❓', tip: 'Rapport État', a: () => this.showStateReport() },
            { id: 'graph',   icon: '📈', tip: 'Graphique…', a: () => this.showGraphDialog() },
            { id: 'table',   icon: '📋', tip: 'Tableau…', a: () => this.showTableDialog() },
            { id: 'energy',  icon: '🔋', tip: 'Rapport Énergie', a: () => this.showEnergyReport() },
            { sep: true },
            { id: 'select',  icon: '➤', tip: 'Sélection', tool: 'select' },
            { id: 'pan',     icon: '🖐', tip: 'Déplacement (glisser la carte)', tool: 'pan' },
            { id: 'zoomin',  icon: '🔍+', tip: 'Zoom avant (double-clic sur la carte aussi)', a: () => this.applyZoomAtPoint(1.4) },
            { id: 'zoomout', icon: '🔍−', tip: 'Zoom arrière', a: () => this.applyZoomAtPoint(0.72) },
            { id: 'extent',  icon: '⛶', tip: 'Étendue totale', a: () => this.fitBounds() },
            { sep: true },
            { id: 'add_junction',  icon: '●', tip: 'Jonction', tool: 'add_junction' },
            { id: 'add_reservoir', icon: '▼', tip: 'Réservoir', tool: 'add_reservoir' },
            { id: 'add_tank',      icon: '▣', tip: 'Bâche / Château', tool: 'add_tank' },
            { id: 'add_pipe',      icon: '⁄', tip: 'Conduite', tool: 'add_pipe' },
            { id: 'add_pump',      icon: '◉', tip: 'Pompe', tool: 'add_pump' },
            { id: 'add_valve',     icon: '◇', tip: 'Vanne', tool: 'add_valve' },
            { id: 'add_label',     icon: 'T', tip: 'Texte / Étiquette', tool: 'add_label' },
            { sep: true },
            { id: 'delete', icon: '🗑', tip: "Supprimer l'élément sélectionné", a: () => this.deleteSelected() },
        ];
        bar.innerHTML = `<input type="file" id="ep2-file-hidden" accept=".inp,.txt" style="display:none;">
            ${tools.map(t => t.sep ? '<div class="ep2-tb-sep"></div>'
                : `<button class="ep2-tbtn ${t.cls || ''}" data-tool="${t.tool || ''}" data-tb="${t.id}" title="${t.tip}">${t.icon}</button>`).join('')}
            <span class="ep2-model-name" id="ep2-model-name"></span>`;
        bar.querySelectorAll('.ep2-tbtn').forEach(btn => {
            btn.addEventListener('click', () => {
                const def = tools.find(t => t.id === btn.dataset.tb);
                if (!def) return;
                if (def.tool) this.setTool(def.tool);
                else if (def.a) def.a();
            });
        });
    }

    setTool(tool) {
        this.tool = tool;
        this.drawingFrom = null;
        this.hideRubberBand();
        const svg = document.getElementById('ep2-svg');
        if (svg) {
            svg.classList.toggle('tool-add', tool.startsWith('add_'));
            svg.classList.toggle('tool-pan', tool === 'pan');
        }
        this.root.querySelectorAll('.ep2-tbtn[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
        const names = {
            select: 'Sélection', pan: 'Déplacement', move: 'Déplacement objet',
            add_junction: 'Création : Jonction', add_reservoir: 'Création : Réservoir',
            add_tank: 'Création : Bâche', add_pipe: 'Tracé : Conduite',
            add_pump: 'Tracé : Pompe', add_valve: 'Tracé : Vanne', add_label: 'Texte'
        };
        const el = document.getElementById('ep2-st-mode');
        if (el) el.textContent = 'Mode : ' + (names[tool] || tool);
        this.updateStatusMsg(tool.startsWith('add_pipe') || tool.startsWith('add_pump') || tool.startsWith('add_valve')
            ? "Cliquez sur le nœud de départ puis le nœud d'arrivée" : '');
    }

    /* ============================ NAVIGATEUR ============================ */
    buildNavigator() {
        const work = this.root.querySelector('.ep2-work');
        const nav = document.createElement('div');
        nav.className = 'ep2-nav';
        nav.id = 'ep2-nav';
        nav.style.right = '8px';
        nav.style.top = '8px';
        nav.innerHTML = `
            <div class="ep2-win-title"><span style="color:#ff5f5f;">✓</span><span class="ep2-tt">Navigateur</span>
                <button class="ep2-wbtn close" data-nav="close">×</button></div>
            <div class="ep2-nav-tabs">
                <div class="ep2-nav-tab active" data-navtab="data">Données</div>
                <div class="ep2-nav-tab" data-navtab="map">Schéma</div>
            </div>
            <div class="ep2-nav-body active" data-navbody="data">
                <select id="ep2-nav-cat"></select>
                <div class="ep2-nav-list" id="ep2-nav-list"></div>
                <div class="ep2-nav-btns">
                    <button class="ep2-btn" id="ep2-nav-edit" title="Propriétés">✎</button>
                    <button class="ep2-btn" id="ep2-nav-del" title="Supprimer">✖</button>
                    <button class="ep2-btn" id="ep2-nav-graph" title="Graphique">📈</button>
                </div>
            </div>
            <div class="ep2-nav-body" data-navbody="map">
                <label style="font-weight:bold;">Noeuds</label>
                <select id="ep2-nav-nodeparam">
                    <option value="none">Aucun</option>
                    <option value="elevation">Altitude</option>
                    <option value="demand">Demande</option>
                    <option value="pressure" selected>Pression</option>
                    <option value="head">Charge</option>
                    <option value="quality">Chlore</option>
                </select>
                <label style="font-weight:bold;margin-top:4px;">Arcs</label>
                <select id="ep2-nav-linkparam">
                    <option value="none">Aucun</option>
                    <option value="roughness">Coeff. Masse</option>
                    <option value="flow" selected>Débit</option>
                    <option value="velocity">Vitesse</option>
                    <option value="headloss">Perte de Charge Unit.</option>
                    <option value="friction">Facteur Friction</option>
                </select>
                <div class="ep2-nav-time">
                    <label style="font-weight:bold;">Temps</label>
                    <select id="ep2-nav-time"></select>
                    <div class="ep2-nav-slider">
                        <button class="ep2-btn" id="ep2-prev" title="Heure précédente">◀</button>
                        <input type="range" id="ep2-hour" min="0" max="23" value="0">
                        <button class="ep2-btn" id="ep2-next" title="Heure suivante">▶</button>
                    </div>
                    <div class="ep2-playbtns">
                        <button id="ep2-first" title="Début">⏮</button>
                        <button id="ep2-play" title="Lecture / Pause">▶</button>
                        <button id="ep2-last" title="Fin">⏭</button>
                    </div>
                </div>
            </div>`;
        work.appendChild(nav);
        this.makeDraggable(nav, nav.querySelector('.ep2-win-title'));
        nav.querySelector('[data-nav="close"]').addEventListener('click', () => nav.classList.add('ep2-hidden'));
        this.navEl = nav;
        this.bindNavigatorEvents();
    }

    bindNavigatorEvents() {
        const nav = this.navEl;
        nav.querySelectorAll('[data-navtab]').forEach(t => t.addEventListener('click', () => {
            nav.querySelectorAll('[data-navtab]').forEach(x => x.classList.remove('active'));
            nav.querySelectorAll('[data-navbody]').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            nav.querySelector(`[data-navbody="${t.dataset.navtab}"]`).classList.add('active');
            if (t.dataset.navtab === 'data') this.renderNavList();
        }));
        nav.querySelector('#ep2-nav-nodeparam').addEventListener('change', (e) => {
            this.nodeParam = e.target.value; this.renderLegends(); this.renderNetwork();
        });
        nav.querySelector('#ep2-nav-linkparam').addEventListener('change', (e) => {
            this.linkParam = e.target.value; this.renderLegends(); this.renderNetwork();
        });
        nav.querySelector('#ep2-nav-edit').addEventListener('click', () => this.openProperties(this.selected));
        nav.querySelector('#ep2-nav-del').addEventListener('click', () => this.deleteSelected());
        nav.querySelector('#ep2-nav-graph').addEventListener('click', () => this.showGraphDialog(this.selected));
        nav.querySelector('#ep2-nav-time').addEventListener('change', (e) => this.setHour(parseInt(e.target.value, 10) || 0));
        nav.querySelector('#ep2-hour').addEventListener('input', (e) => this.setHour(parseInt(e.target.value, 10)));
        nav.querySelector('#ep2-prev').addEventListener('click', () => this.setHour((this.currentHour + 23) % 24));
        nav.querySelector('#ep2-next').addEventListener('click', () => this.setHour((this.currentHour + 1) % 24));
        nav.querySelector('#ep2-first').addEventListener('click', () => this.setHour(0));
        nav.querySelector('#ep2-last').addEventListener('click', () => this.setHour(23));
        nav.querySelector('#ep2-play').addEventListener('click', () => this.togglePlay());
        const catSel = nav.querySelector('#ep2-nav-cat');
        catSel.innerHTML = [
            ['junctions', 'Noeuds Demandé'], ['tanks', 'Bâches'], ['reservoirs', 'Réservoirs'],
            ['pipes', 'Tuyaux'], ['pumps', 'Pompes'], ['valves', 'Vannes'],
            ['labels', 'Textes'], ['patterns', 'Courbes Modul.'], ['options', 'Options'],
        ].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
        catSel.value = this.navCategory;
        catSel.addEventListener('change', (e) => { this.navCategory = e.target.value; this.renderNavList(); });
        const timeSel = nav.querySelector('#ep2-nav-time');
        timeSel.innerHTML = Array.from({ length: 24 }, (_, h) => `<option value="${h}">${h}:00 Heures</option>`).join('');
    }

    toggleNavigator() {
        this.navEl?.classList.toggle('ep2-hidden');
    }

    togglePlay() {
        this.isPlaying = !this.isPlaying;
        const btn = this.navEl?.querySelector('#ep2-play');
        if (btn) btn.textContent = this.isPlaying ? '⏸' : '▶';
        if (this.isPlaying) {
            this.playTimer = setInterval(() => {
                if (!this.isSimulated) { this.togglePlay(); return; }
                this.setHour((this.currentHour + 1) % 24);
            }, 700);
        } else if (this.playTimer) {
            clearInterval(this.playTimer);
            this.playTimer = null;
        }
    }

    makeDraggable(el, handle) {
        if (!el || !handle) return;
        handle.style.cursor = 'move';
        let isDragging = false;
        let startX = 0, startY = 0;
        let origLeft = 0, origTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = el.getBoundingClientRect();
            const parentRect = el.parentElement ? el.parentElement.getBoundingClientRect() : { left: 0, top: 0 };
            origLeft = rect.left - parentRect.left;
            origTop = rect.top - parentRect.top;
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.left = origLeft + 'px';
            el.style.top = origTop + 'px';
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.left = Math.max(0, origLeft + dx) + 'px';
            el.style.top = Math.max(0, origTop + dy) + 'px';
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    refresh() {
        this.resizeSvg();
        if (this._needFit || !this._fittedOnce) {
            this.fitBounds();
            this._fittedOnce = true;
        }
        this.renderNetwork();
        this.renderLegends();
    }


    /* ================== ÉVÉNEMENTS CANVAS (CORRIGÉS) ================== */
    bindEvents() {
        this.container.querySelector('#ep2-file-hidden')?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) this.loadInpFile(e.target.files[0]);
            e.target.value = '';
        });
        this.container.querySelector('[data-act="close-map"]')?.addEventListener('click', (e) => {
            const w = document.getElementById('ep2-mapwin');
            if (w) { w.dataset.closed = '1'; w.classList.add('ep2-hidden'); }
        });

        const svg = document.getElementById('ep2-svg');
        if (!svg) return;
        this.svg = svg;
        this.resizeSvg();

        svg.addEventListener('mousemove', (e) => this.onSvgMouseMove(e));
        svg.addEventListener('mouseleave', () => { this._mouse = null; });

        // ── Clic simple : sélection / création / TRACÉ — JAMAIS de zoom ni de pan parasite
        svg.addEventListener('mousedown', (e) => this.onSvgMouseDown(e));

        // ── Double-clic : zoom avant au point cliqué (comportement demandé)
        svg.addEventListener('dblclick', (e) => {
            if (e.target.closest('.ep-node')) return;
            e.preventDefault();
            const w = this.screenToWorld(e.clientX, e.clientY);
            this.applyZoomAtPoint(1.6, w.x, w.y);
        });

        // ── Molette : zoom ancré sur le curseur
        svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const w = this.screenToWorld(e.clientX, e.clientY);
            this.applyZoomAtPoint(e.deltaY < 0 ? 1.25 : 0.8, w.x, w.y);
        }, { passive: false });

        window.addEventListener('mousemove', (e) => this.onWindowMouseMove(e));
        window.addEventListener('mouseup', () => this.onWindowMouseUp());
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.drawingFrom = null;
                this.hideRubberBand();
                this.updateStatusMsg('');
                if (this.tool !== 'select') this.setTool('select');
            }
            if (e.key === 'Delete') this.deleteSelected();
            // Raccourcis clavier EPANET
            if (e.ctrlKey && e.key === 'o') { e.preventDefault(); this.triggerImport(); }
            if (e.ctrlKey && e.key === 's') { e.preventDefault(); this.saveJson(); }
            if (e.key === 'F5') { e.preventDefault(); this.runHydraulicSimulation(true); }
            if (e.key === 'F1') { e.preventDefault(); this.fitBounds(); }
        });

        // Glisser-déposer d'un fichier .INP sur la carte
        const mapWin = document.getElementById('ep2-mapwin');
        if (mapWin) {
            mapWin.addEventListener('dragover', (e) => { e.preventDefault(); mapWin.style.outline = '3px dashed #3169c6'; });
            mapWin.addEventListener('dragleave', () => { mapWin.style.outline = ''; });
            mapWin.addEventListener('drop', (e) => {
                e.preventDefault();
                mapWin.style.outline = '';
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    this.loadInpFile(e.dataTransfer.files[0]);
                }
            });
        }
    }

    resizeSvg() {
        const svg = this.svg || document.getElementById('ep2-svg');
        if (!svg) return;
        const body = document.getElementById('ep2-mapbody');
        if (!body) return;
        const r = body.getBoundingClientRect();
        if (r.width < 10 || r.height < 10) return;
        const wasInvalid = !this._lastW;
        svg.setAttribute('width', r.width);
        svg.setAttribute('height', r.height);
        svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
        this._lastW = r.width;
        if (this._worldG) this.updateTransform();
        // le conteneur vient de devenir visible : ajuster la vue sur le réseau
        if ((wasInvalid || this._needFit) && this.model) this.fitBounds();
    }

    /** Conversion écran → coordonnées MONDE du réseau (précise, via CTM inverse) */
    screenToWorld(clientX, clientY) {
        const svg = this.svg || document.getElementById('ep2-svg');
        if (!svg) return { x: clientX, y: clientY };
        const pt = svg.createSVGPoint();
        pt.x = clientX; pt.y = clientY;
        // Utiliser le CTM du groupe monde si disponible (inclut zoom/pan)
        // Sinon utiliser le CTM du SVG (viewBox uniquement)
        let ctm;
        if (this._worldG && this._worldG.parentNode) {
            ctm = this._worldG.getScreenCTM();
        } else {
            ctm = svg.getScreenCTM();
        }
        if (!ctm) return { x: clientX, y: clientY };
        try {
            const p = pt.matrixTransform(ctm.inverse());
            return { x: p.x, y: p.y };
        } catch (e) {
            return { x: clientX, y: clientY };
        }
    }

    updateTransform() {
        if (!this._worldG) return;
        this._worldG.setAttribute('transform', `translate(${this.panX},${this.panY}) scale(${this.zoom})`);
        const el = document.getElementById('ep2-st-zoom');
        if (el) el.textContent = `Zoom : ${(this.zoom * 100).toFixed(0)}%`;
    }

    applyZoomAtPoint(factor, wx, wy) {
        const nz = Math.max(0.02, Math.min(60, this.zoom * factor));
        if (nz === this.zoom) return;
        // Le point monde (wx,wy) reste fixe à l'écran : recalcul du pan
        const svg = this.svg;
        const vb = svg?.viewBox.baseVal;
        const cx = wx === undefined ? (vb ? vb.width / 2 : 400) : wx;
        const cy = wy === undefined ? (vb ? vb.height / 2 : 300) : wy;
        this.panX = cx - (cx - this.panX) * (nz / this.zoom);
        this.panY = cy - (cy - this.panY) * (nz / this.zoom);
        this.zoom = nz;
        this.updateTransform();
        this.renderNetwork();
    }

    resetZoom() {
        // Revient à 100% en gardant le point monde situé au centre de la vue
        const vb = this.svg.viewBox.baseVal;
        const cxW = (vb.width / 2 - this.panX) / this.zoom;
        const cyW = (vb.height / 2 - this.panY) / this.zoom;
        this.panX = vb.width / 2 - cxW;
        this.panY = vb.height / 2 - cyW;
        this.zoom = 1.0;
        this.updateTransform();
        this.renderNetwork();
    }

    onSvgMouseDown(e) {
        // Middle mouse button or 'pan' tool: start panning
        if (e.button === 1 || this.tool === 'pan') {
            this._panning = true;
            this._panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
            this._panMoved = false;
            this.svg.classList.add('panning');
            e.preventDefault();
            return;
        }
        if (e.button !== 0) return;
        const world = this.screenToWorld(e.clientX, e.clientY);
        // Placement d'un nœud : EXACTEMENT au point cliqué
        if (this.tool === 'add_junction' || this.tool === 'add_reservoir' || this.tool === 'add_tank') {
            this.createNewNode(this.tool.replace('add_', ''), world.x, world.y);
            return;
        }
        if (this.tool === 'add_label') {
            const txt = prompt("Texte de l'étiquette :", 'Étiquette');
            if (txt) this.createLabel(world.x, world.y, txt);
            return;
        }
        // Clic simple sur l'espace vide avec l'outil sélection : juste désélectionner
        // NE PAS démarrer le déplacement (panning) - seul l'outil 'pan' ou le bouton du milieu le fait
        this.selected = null;
        this.closeProperties();
        this.renderNetwork();
        this._panMoved = false;
    }

    onSvgMouseMove(e) {
        const w = this.screenToWorld(e.clientX, e.clientY);
        this._mouse = w;
        const prec = this.zoom > 20 ? 2 : this.zoom > 3 ? 1 : 0;
        const el = document.getElementById('ep2-st-coord');
        if (el) el.textContent = `X: ${w.x.toFixed(prec)} | Y: ${w.y.toFixed(prec)}`;
        // Bande élastique pendant le tracé conduite/pompe/vanne
        if (this.drawingFrom && this._rubber) {
            this._rubber.setAttribute('x2', w.x);
            this._rubber.setAttribute('y2', w.y);
        }
        // Déplacement d'un nœud avec l'outil pan si on a attrapé un nœud
        if (this._movingNode) {
            const n = this.model?.nodes[this._movingNode];
            if (n) { n.x = w.x; n.y = w.y; this.renderNetwork(); }
        }
    }

    onWindowMouseMove(e) {
        if (this._panning && this.svg) {
            this.panX = e.clientX - this._panStart.x;
            this.panY = e.clientY - this._panStart.y;
            this._panMoved = true;
            this.updateTransform();
        }
    }

    onWindowMouseUp(e) {
        this._panning = false;
        this._movingNode = null;
        this.svg?.classList.remove('panning');
    }

    /** Clic sur un nœud existant : sélection, tracé ou déplacement */
    onNodeClick(nid, e) {
        // Outil de tracé : conduite / pompe / vanne entre deux nœuds
        if (this.tool === 'add_pipe' || this.tool === 'add_pump' || this.tool === 'add_valve') {
            if (!this.drawingFrom) {
                this.drawingFrom = nid;
                this.showRubberBand(nid);
                this.updateStatusMsg(`Départ : ${nid} → cliquez le nœud d'arrivée (Échap pour annuler)`);
            } else if (this.drawingFrom !== nid) {
                this.finishLink(this.drawingFrom, nid);
                this.drawingFrom = null;
                this.hideRubberBand();
            }
            return;
        }
        // Sélection + propriétés (clic simple EPANET)
        const node = this.model.nodes[nid];
        this.selected = { type: node.type, id: nid };
        this.openProperties(this.selected);
        this.renderNetwork();
        // Outil déplacement : le nœud suit la souris
        if (this.tool === 'pan' || e.altKey) this._movingNode = nid;
    }

    onLinkClick(lid) {
        const link = this.model.links[lid];
        this.selected = { type: link.type, id: lid };
        this.openProperties(this.selected);
        this.renderNetwork();
    }

    showRubberBand(nid) {
        this.hideRubberBand();
        const n = this.model.nodes[nid];
        if (!n) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', n.x); line.setAttribute('y1', n.y);
        line.setAttribute('x2', n.x); line.setAttribute('y2', n.y);
        line.setAttribute('stroke', '#e04343');
        line.setAttribute('stroke-width', 2 / Math.max(0.2, Math.sqrt(this.zoom)));
        line.setAttribute('stroke-dasharray', '4 3');
        line.setAttribute('pointer-events', 'none');
        this._worldG.appendChild(line);
        this._rubber = line;
    }

    hideRubberBand() {
        this._rubber?.remove();
        this._rubber = null;
    }

    /** Crée un nœud EXACTEMENT à la position monde cliquée */
    createNewNode(type, wx, wy) {
        if (!this.model) return;
        const x = Math.round(wx * 10) / 10, y = Math.round(wy * 10) / 10;
        const store = { junction: 'junctions', reservoir: 'reservoirs', tank: 'tanks' }[type];
        const prefix = type === 'reservoir' ? 'R' : type === 'tank' ? 'TK' : 'J';
        let idx = Object.keys(this.model[store]).length + 1;
        let id = `${prefix}${idx}`;
        while (this.model.nodes[id]) { idx++; id = `${prefix}${idx}`; }
        const base = { id, x, y };
        if (type === 'junction') Object.assign(base, { elev: 100, baseDemand: 15, pattern: '' });
        if (type === 'reservoir') Object.assign(base, { head: 250 });
        if (type === 'tank') Object.assign(base, { elev: 200, initLevel: 3, minLevel: 0, maxLevel: 6, diam: 20, pattern: '' });
        this.model[store][id] = base;
        this.model.nodes[id] = { ...base, type };
        this.updateCounts();
        this.renderNetwork();
        this.selected = { type, id };
        this.openProperties(this.selected);
        this.updateStatusMsg(`${id} créé à (${x}, ${y})`);
    }

    createLabel(wx, wy, text) {
        if (!this.model.labels) this.model.labels = {};
        const id = 'TXT' + (Object.keys(this.model.labels).length + 1);
        this.model.labels[id] = { id, x: wx, y: wy, text };
        this.updateCounts();
        this.renderNetwork();
    }

    finishLink(from, to) {
        const m = this.model;
        const type = this.tool === 'add_pump' ? 'pump' : this.tool === 'add_valve' ? 'valve' : 'pipe';
        const store = { pump: 'pumps', valve: 'valves', pipe: 'pipes' }[type];
        const prefix = { pump: 'PMP', valve: 'VLV', pipe: 'P' }[type];
        let idx = Object.keys(m[store]).length + 1;
        let id = `${prefix}${idx}`;
        while (m.links[id]) { idx++; id = `${prefix}${idx}`; }
        const n1 = m.nodes[from], n2 = m.nodes[to];
        const len = Math.max(10, Math.round(Math.hypot(n2.x - n1.x, n2.y - n1.y)));
        const base = { id, from, to, status: 'OPEN' };
        if (type === 'pipe') Object.assign(base, { length: len, diam: 200, roughness: 130, minorLoss: 0 });
        if (type === 'pump') Object.assign(base, { power: 45 });
        if (type === 'valve') Object.assign(base, { diam: 200, vtype: 'TCV', setting: 0 });
        m[store][id] = base;
        m.links[id] = { ...base, type };
        this.updateCounts();
        this.renderNetwork();
        this.selected = { type, id };
        this.openProperties(this.selected);
        this.updateStatusMsg(`${id} tracé entre ${from} et ${to}`);
    }

    /* ==================== MOTEUR HYDRAULIQUE (GGA) ==================== */
    /* Algorithme du Gradient Global (comme EPANET) :
       - Hazen-Williams : h = 10.67·L·Q^1.852 / (C^1.852·D^4.87)
       - Darcy-Weisbach : h = f·(L/D)·V²/(2g), f par Swamee-Jain
       - Chezy-Manning  : h = 10.29·n²·L·Q² / D^5.333
       - Pompes : H(Q) = a − b·Q² (courbe dérivée de la puissance)
       - Linéarisation Q = Q0 + (ΔH − h(Q0))/h'(Q0) puis continuité nodale. */

    headloss(link, q) {                    // q m³/s signé → {h (m, signé), dh (m/(m³/s))}
        const L = Math.max(1, link.length || 100);
        const D = Math.max(0.05, (link.diam || 200) / 1000);
        const C = Math.max(10, link.roughness || 130);
        const mode = ((this.model.options && this.model.options.headloss) || 'H-W').toUpperCase();
        const aq = Math.abs(q);
        let h = 0, dh = 0;
        if (mode === 'D-W') {
            const nu = 1.0e-6, g = 9.81, k = 0.001;
            const A = Math.PI * D * D / 4;
            const V = aq / A;
            const Re = Math.max(1, V * D / nu);
            let f = 64 / Re;
            if (Re > 2300) f = 0.25 / Math.pow(Math.log10(k / (3.7 * D) + 5.74 / Re), 2);
            h = f * (L / D) * (V * V) / (2 * g);
            dh = 2 * h / Math.max(aq, 1e-7);
        } else if (mode === 'C-M') {
            const n = 1 / C;
            h = 10.29 * n * n * L * aq * aq / Math.pow(D, 5.333);
            dh = 2 * h / Math.max(aq, 1e-7);
        } else {
            h = 10.67 * L * Math.pow(aq, 1.852) / (Math.pow(C, 1.852) * Math.pow(D, 4.87));
            dh = 1.852 * h / Math.max(aq, 1e-7);
        }
        if (link.minorLoss) {
            const g = 9.81, A = Math.PI * D * D / 4;
            const hm = link.minorLoss * Math.pow(aq / A, 2) / (2 * g);
            h += hm; dh += 2 * hm / Math.max(aq, 1e-7);
        }
        const sign = q < 0 ? -1 : 1;
        return { h: sign * h, dh: Math.max(dh, 1e-8) };
    }

    pumpGain(pump, q) {                    // apport de tête (m) — courbe quadratique EPANET H(Q)=H0−R·Q²
        const H0 = pump._H0 || 120;
        const R = pump._R || 4e5;
        const gain = H0 - R * q * q;
        return gain > 0 ? gain : 0;
    }

    linkHead(link, q) {                    // "perte" signée : conduite = +h(q) ; pompe = −gain(q) (h négatif = apport)
        if (link.type === 'pump') {
            if (q <= 0) return { h: 0, dh: 1e12 };   // clapet anti-retour (pompe bloquée en arrière)
            const gain = this.pumpGain(link, q);
            // pente de gain : d(gain)/dq = −2Rq → dh magnitudé = |d(−gain)/dq| = 2Rq
            const dh = Math.max(1e-3, 2 * (link._R || 4e5) * q);
            return { h: -gain, dh };
        }
        if ((link.status || '').toUpperCase() === 'CLOSED') return { h: 0, dh: 1e12 };
        return this.headloss(link, q);
    }

    /** Débits initiaux : arbre BFS depuis les nœuds à tête fixe (sources/bâches) */
    initFlows(demand, nodes, links, fixed) {
        Object.keys(links).forEach(l => {
            links[l]._q0 = (links[l].status || '').toUpperCase() === 'CLOSED' ? 0 : 0.001;
        });
        const parent = {};
        const visitedOrder = [];
        const queue = Object.keys(fixed);
        const visited = new Set(queue);
        while (queue.length) {
            const cur = queue.shift();
            Object.entries(links).forEach(([lid, lk]) => {
                if ((lk.status || '').toUpperCase() === 'CLOSED') return;
                let nxt = null;
                if (lk.from === cur && !visited.has(lk.to)) nxt = lk.to;
                else if (lk.to === cur && !visited.has(lk.from)) nxt = lk.from;
                if (nxt && !parent[nxt]) {
                    parent[nxt] = { lid, via: cur };
                    visited.add(nxt);
                    visitedOrder.push(nxt);
                    queue.push(nxt);
                }
            });
        }
        const juncs = Object.keys(nodes).filter(id => nodes[id].type === 'junction');
        const accum = {};
        juncs.forEach(id => { accum[id] = demand[id] || 0; });
        // propagation UNIQUE en ordre inverse de visite BFS (feuilles → sources)
        // order contient les nœuds dans l'ordre où ils ont été découverts
        for (let i = visitedOrder.length - 1; i >= 0; i--) {
            const id = visitedOrder[i];
            const p = parent[id];
            if (p && p.via && nodes[p.via] && nodes[p.via].type === 'junction') {
                accum[p.via] += accum[id] || 0;
            }
        }
        juncs.forEach(id => {
            const p = parent[id];
            if (!p) return;
            const lk = links[p.lid];
            lk._q0 = (lk.from === p.via) ? accum[id] : -accum[id];
            if (Math.abs(lk._q0) < 1e-6) lk._q0 = 1e-6;
        });
        // les pompes : courbe quadratique H(Q)=H0−R·Q², H0 déduite de la hauteur à fournir + puissance
        Object.entries(links).forEach(([lid, lk]) => {
            if (lk.type !== 'pump') return;
            const n1 = nodes[lk.from], n2 = nodes[lk.to];
            if (!n1 || !n2) return;
            const hSucc = fixed[lk.from] !== undefined ? fixed[lk.from] : (n1.elev || 0);
            const hDisc = fixed[lk.to] !== undefined ? fixed[lk.to] : (n2.elev || 0);
            const hNeed = Math.max(5, hDisc - hSucc);
            const H0 = Math.min(400, Math.max(15, 1.35 * hNeed));
            // débit nominal d'après puissance (P·η = ρg·H·Q) — sinon 30 L/s
            const P = Math.max(0.1, (lk.power || 30)) * 1000 * 0.75;   // W
            const qdP = P / (1000 * 9.81 * hNeed);
            const qd = Math.max(0.005, Math.min(0.3, Number.isFinite(qdP) ? qdP : 0.03));
            const R0 = (H0 - 0.85 * H0) / (qd * qd);
            const R = Math.max(1e3, R0);
            lk._H0 = H0; lk._R = R;
            lk._qmax = Math.sqrt(H0 / R);                               // Q où H=0 (limite de courbe)
            lk._q0 = Math.max(0.001, Math.min(lk._qmax * 0.9,
                Math.sqrt(Math.max(0, H0 - hNeed) / R)) || 0.02);
        });
    }

    /** Résout UN pas de temps t : têtes, pressions, débits, pertes, énergie */
    solveStep(t) {
        const m = this.model;
        const nodes = m.nodes, links = m.links, patterns = m.patterns || {};
        const defaultPat = [0.8,0.7,0.6,0.6,0.7,0.9,1.2,1.4,1.3,1.2,1.1,1.0,1.1,1.2,1.1,1.0,1.1,1.3,1.5,1.4,1.2,1.0,0.9,0.8];
        const pat = (p) => (p && patterns[p] && patterns[p][t] !== undefined) ? patterns[p][t] : (defaultPat[t] || 1);

        const demand = {};
        Object.entries(nodes).forEach(([id, n]) => {
            demand[id] = n.type === 'junction' ? (n.baseDemand || 0) * pat(n.pattern) / 1000 : 0;
        });

        const fixed = {};
        Object.entries(nodes).forEach(([id, n]) => {
            if (n.type === 'reservoir') fixed[id] = n.head || 100;
            if (n.type === 'tank') {
                const lv = this._tankLevels && this._tankLevels[id];
                const lvl = (lv && lv[t] !== undefined) ? lv[t] : (n.initLevel || 3);
                fixed[id] = (n.elev || 0) + lvl;
            }
        });

        this.initFlows(demand, nodes, links, fixed);
        Object.keys(links).forEach(lid => {
            const lk = links[lid];
            if (lk.type === 'pump') {
                const P = (lk.power || 30) * 1000;
                lk._b = P / (1000 * 9.81 * 0.020 * 0.020 * 0.75);
            }
        });

        const juncs = Object.keys(nodes).filter(id => nodes[id].type === 'junction');
        const incid = {};
        juncs.forEach(id => { incid[id] = []; });
        Object.entries(links).forEach(([lid, lk]) => {
            if (incid[lk.from]) incid[lk.from].push({ lid, side: 'from' });
            if (incid[lk.to]) incid[lk.to].push({ lid, side: 'to' });
        });

        let Q = {}, H = {};
        Object.keys(links).forEach(lid => { Q[lid] = links[lid]._q0; });
        juncs.forEach(id => { H[id] = (nodes[id].elev || 0) + 40; });

        for (let it = 0; it < 100; it++) {
            const hl = {}, G = {}, C0 = {}, Hn = {};
            Object.entries(links).forEach(([lid, lk]) => {
                const r = this.linkHead(lk, Q[lid]);
                hl[lid] = r.h;
                if (r.dh >= 1e11) { G[lid] = 0; C0[lid] = Q[lid]; return; }   // lien fermé / clapet fermé
                const gp = 1 / Math.max(r.dh, 1e-8);
                G[lid] = gp;                             // conductance positive (EPANET GGA) pour TOUS les liens
                C0[lid] = Q[lid] - gp * r.h;             // pompe : h<0 → C0 = Q + gp·gain
            });
            juncs.forEach(id => { Hn[id] = H[id]; });
            juncs.forEach(id => {
                let num = -(demand[id] || 0), den = 1e-9;
                incid[id].forEach(({ lid, side }) => {
                    const lk = links[lid];
                    const other = side === 'from' ? lk.to : lk.from;
                    const hOther = fixed[other] !== undefined ? fixed[other] : Hn[other];
                    if (side === 'to') num += G[lid] * hOther + C0[lid];
                    else num += G[lid] * hOther - C0[lid];
                    den += G[lid];
                });
                Hn[id] = num / den;
            });
            const Qn = {};
            let maxDq = 0;
            Object.keys(links).forEach(lid => {
                const lk = links[lid];
                if ((lk.status || 'OPEN').toUpperCase() === 'CLOSED') { Qn[lid] = 0; return; }
                const hF = fixed[lk.from] !== undefined ? fixed[lk.from] : Hn[lk.from];
                const hT = fixed[lk.to] !== undefined ? fixed[lk.to] : Hn[lk.to];
                Qn[lid] = G[lid] * (hF - hT) + C0[lid];
                // Bornage physique : |v| ≤ 15 m/s (évite le sur-dépassement de Newton)
                const Dl = Math.max(0.05, (lk.diam || 200) / 1000);
                const qAbsMax = 15 * Math.PI * Dl * Dl / 4;
                Qn[lid] = Math.max(-qAbsMax, Math.min(qAbsMax, Qn[lid]));
                if (lk.type === 'pump') {
                    const qmax = lk._qmax || 0.1;
                    Qn[lid] = Math.max(1e-4, Math.min(qmax, Qn[lid]));  // borne par la courbe (0→Qmax) + clapet
                } else {
                    if (Math.abs(Qn[lid]) < 1e-7) Qn[lid] = 1e-7;
                }
                maxDq = Math.max(maxDq, Math.abs(Qn[lid] - Q[lid]));
            });
            H = Hn; Q = Qn;
            if (this._debugGGA && (it < 6 || it > 96)) console.log(`  GGA it${it}: ` + juncs.map(j => `H(${j})=${H[j]?.toFixed(2)}`).join(' ') + ' | ' + Object.keys(Q).map(l => `Q(${l})=${(Q[l] * 1000).toFixed(2)}`).join(' '));
            if (maxDq < 1e-7) break;
        }

        const nodeRes = {}, linkRes = {};
        juncs.forEach(id => {
            const n = nodes[id];
            nodeRes[id] = { head: H[id], pressure: H[id] - (n.elev || 0), demand: (demand[id] || 0) * 1000, elev: n.elev || 0 };
        });
        Object.keys(fixed).forEach(id => {
            const n = nodes[id];
            const lv = this._tankLevels && this._tankLevels[id];
            const lvl = (lv && lv[t] !== undefined) ? lv[t] : (n.initLevel || 3);
            nodeRes[id] = { head: fixed[id], pressure: n.type === 'tank' ? lvl : 0, demand: 0, elev: n.elev || 0 };
        });
        Object.entries(links).forEach(([lid, lk]) => {
            const D = Math.max(0.05, (lk.diam || 200) / 1000);
            const q = Q[lid];
            const v = Math.abs(q) / (Math.PI * D * D / 4);
            const r = { flow: q * 1000, velocity: v, headloss: 0, unitLoss: 0, power: 0, status: lk.status || 'OPEN' };
            if (lk.type === 'pipe') {
                const hl = this.headloss(lk, q);
                r.headloss = Math.abs(hl.h);
                r.unitLoss = r.headloss / Math.max(1, lk.length || 1) * 1000;   // m/km
            } else if (lk.type === 'pump') {
                r.headloss = this.pumpGain(lk, Math.abs(q));
                r.power = 1000 * 9.81 * Math.abs(q) * r.headloss / 0.75;        // W
            } else if (lk.type === 'valve') {
                const hl = this.headloss(lk, q);
                r.headloss = Math.abs(hl.h);
                r.unitLoss = r.headloss / Math.max(1, lk.length || 1) * 1000;
            }
            linkRes[lid] = r;
        });
        return { nodeRes, linkRes, Q, H };
    }

    /** Simulation 24h : boucle GGA + intégration du niveau des bâches + bilan énergie */
    runHydraulicSimulation(notify = false) {
        if (!this.model) return;
        const nodes = this.model.nodes, links = this.model.links;

        // Niveaux initiaux des bâches
        this._tankLevels = {};
        Object.entries(nodes).forEach(([id, n]) => {
            if (n.type === 'tank') this._tankLevels[id] = Array(25).fill(0).map(() => n.initLevel || 3);
        });

        const sim = { hours: Array.from({ length: 24 }, (_, i) => i), nodes: {}, links: {} };
        Object.keys(nodes).forEach(nid => {
            sim.nodes[nid] = {
                pressure: Array(24).fill(0), head: Array(24).fill(0),
                demand: Array(24).fill(0), level: Array(24).fill(0), quality: Array(24).fill(0)
            };
        });
        Object.keys(links).forEach(lid => {
            sim.links[lid] = {
                flow: Array(24).fill(0), velocity: Array(24).fill(0),
                headloss: Array(24).fill(0), unitLoss: Array(24).fill(0),
                power: Array(24).fill(0), status: Array(24).fill('OPEN')
            };
        });

        for (let t = 0; t < 24; t++) {
            const { nodeRes, linkRes } = this.solveStep(t);
            Object.entries(nodeRes).forEach(([id, r]) => {
                sim.nodes[id].head[t] = r.head;
                sim.nodes[id].pressure[t] = r.pressure;
                sim.nodes[id].demand[t] = r.demand;
                if (nodes[id].type === 'tank') sim.nodes[id].level[t] = r.pressure;
            });
            Object.entries(linkRes).forEach(([lid, r]) => {
                sim.links[lid].flow[t] = r.flow;
                sim.links[lid].velocity[t] = r.velocity;
                sim.links[lid].headloss[t] = r.headloss;
                sim.links[lid].unitLoss[t] = r.unitLoss || 0;
                sim.links[lid].power[t] = r.power || 0;
                sim.links[lid].status[t] = r.status;
            });
            // Intégration du niveau des bâches (continuité volumique) :
            // V = π/4·D²·N   ;   ΔN = Q_net·3600 / (π/4·D²)
            Object.entries(nodes).forEach(([id, n]) => {
                if (n.type !== 'tank') return;
                let net = 0;   // m³/s entrant
                Object.entries(links).forEach(([lid, lk]) => {
                    const q = linkRes[lid].flow / 1000;
                    if (lk.to === id) net += q;
                    else if (lk.from === id) net -= q;
                });
                const D = Math.max(0.5, n.diam || 20);
                const area = Math.PI * D * D / 4;
                const cur = this._tankLevels[id][t];
                let next = cur + net * 3600 / area;
                next = Math.max(n.minLevel || 0, Math.min(n.maxLevel || 99, next));
                this._tankLevels[id][t + 1] = next;
                sim.nodes[id].level[t] = cur;
            });
        }

        // ── Bilan énergie par pompe (façon EPANET)
        const tariff = (this.model.options && this.model.options.energyPrice) || 0.1; // €/kWh
        this.energyReport = {};
        Object.entries(links).forEach(([lid, lk]) => {
            if (lk.type !== 'pump') return;
            const pw = sim.links[lid].power;             // W
            const fl = sim.links[lid].flow;              // LPS
            const on = pw.filter(p => p > 0).length;
            const meanKw = pw.reduce((a, b) => a + b, 0) / 1000 / 24;
            const maxKw = Math.max(...pw) / 1000;
            const volM3 = fl.reduce((a, b) => a + b, 0) * 3600 / 1000;   // m³ pompés
            const kwh = meanKw * 24;
            this.energyReport[lid] = {
                utilisation: (on / 24 * 100),
                efficiency: 75.0,
                kwhm3: volM3 > 0 ? kwh / volM3 : 0,
                meanKw, maxKw,
                cost: kwh * tariff,
                volume: volM3
            };
        });

        this.simResults = sim;
        this.isSimulated = true;
        this.updateCounts();
        this.renderNetwork();
        this.renderLegends();
        const st = document.getElementById('ep2-st-sim');
        if (st) {
            st.textContent = 'Calcul : ✔ 24h équilibrées';
            st.style.color = '#0a7a1e';
        }
        if (notify) {
            const nJ = Object.keys(sim.nodes).length;
            alert(`✅ Simulation hydraulique terminée (24 h).\n${nJ} nœuds, ${Object.keys(sim.links).length} arcs résolus par le Gradient Global (Hazen-Williams).`);
        }
    }

    setHour(h) {
        this.currentHour = Math.max(0, Math.min(23, h));
        const slider = this.navEl?.querySelector('#ep2-hour');
        if (slider) slider.value = this.currentHour;
        const sel = this.navEl?.querySelector('#ep2-nav-time');
        if (sel) sel.value = this.currentHour;
        const badge = document.getElementById('ep2-timebadge');
        if (badge) badge.textContent = this.formatHour(this.currentHour);
        this.renderNetwork();
    }

    formatHour(h) {
        const day = 1 + Math.floor(h / 24);
        const hh = h % 24;
        const ampm = hh < 12 ? 'AM' : 'PM';
        const h12 = hh % 12 === 0 ? 12 : hh % 12;
        return `Jour ${day}, ${h12}:00 ${ampm}`;
    }

    /* ==================== RENDU DU SCHÉMA (EPANET) ==================== */
    renderNetwork() {
        const svg = this.svg || document.getElementById('ep2-svg');
        if (!svg) return;
        // Vérifier que le groupe monde existe et est dans le DOM
        if (!this._worldG || !this._worldG.parentNode) {
            svg.innerHTML = '';
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('id', 'ep2-world');
            svg.appendChild(g);
            this._worldG = g;
        }
        const g = this._worldG;
        this.updateTransform();
        g.innerHTML = '';
        if (!this.model || !this.model.nodes) return;
        if (!Object.keys(this.model.nodes).length) {
            this.showEmptyHint();
            return;
        }
        this.hideEmptyHint();
        const t = this.currentHour;
        const res = this.simResults;

        // ── 1. Arcs (conduites, pompes, vannes) — symboles EPANET
        Object.entries(this.model.links).forEach(([lid, lk]) => {
            const n1 = this.model.nodes[lk.from], n2 = this.model.nodes[lk.to];
            if (!n1 || !n2) return;
            let color = '#0000aa';                       // conduite EPANET par défaut
            if (lk.type === 'pump') color = '#000';
            if (lk.type === 'valve') color = '#000';
            const r = res && res.links[lid];
            if (this.isSimulated && r && this.linkParam !== 'none') {
                color = this.linkColor(lk, r, lid);
            }
            const gEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            gEl.classList.add('ep-link');
            gEl.dataset.id = lid;
            const sel = this.selected && this.selected.id === lid;
            const lw = (lk.type === 'pipe' ? Math.max(1, Math.min(7, (lk.diam || 200) / 60)) : 2.8)
                / Math.max(0.25, Math.pow(this.zoom, 0.45));
            if (lk.type === 'pipe') {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', n1.x); line.setAttribute('y1', n1.y);
                line.setAttribute('x2', n2.x); line.setAttribute('y2', n2.y);
                line.setAttribute('stroke', sel ? '#ff4000' : color);
                line.setAttribute('stroke-width', lw);
                gEl.appendChild(line);
            } else {
                // pompe / vanne : ligne + symbole au milieu
                const mx = (n1.x + n2.x) / 2, my = (n1.y + n2.y) / 2;
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', n1.x); line.setAttribute('y1', n1.y);
                line.setAttribute('x2', n2.x); line.setAttribute('y2', n2.y);
                line.setAttribute('stroke', sel ? '#ff4000' : color);
                line.setAttribute('stroke-width', lw);
                gEl.appendChild(line);
                gEl.appendChild(this.linkSymbol(lk, mx, my, color));
            }
            // Zone cliquable large
            const hit = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            hit.setAttribute('x1', n1.x); hit.setAttribute('y1', n1.y);
            hit.setAttribute('x2', n2.x); hit.setAttribute('y2', n2.y);
            hit.setAttribute('stroke', 'rgba(0,0,0,0)');
            hit.setAttribute('stroke-width', 10 / Math.max(0.5, Math.sqrt(this.zoom)));
            hit.style.cursor = 'pointer';
            hit.addEventListener('mousedown', (e) => { e.stopPropagation(); this.onLinkClick(lid); });
            gEl.appendChild(hit);
            // Étiquette du paramètre (débit/vitesse) si simulé
            if (this.isSimulated && r && this.linkParam === 'flow') {
                const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                const flVal = Array.isArray(r.flow) ? r.flow[t] : r.flow;
                lbl.textContent = Math.abs(flVal || 0).toFixed(1);
                lbl.setAttribute('x', (n1.x + n2.x) / 2);
                lbl.setAttribute('y', (n1.y + n2.y) / 2 - 6 / Math.sqrt(this.zoom));
                lbl.setAttribute('font-size', Math.max(3, 9 / Math.sqrt(this.zoom)));
                lbl.setAttribute('fill', '#0000aa');
                lbl.setAttribute('text-anchor', 'middle');
                lbl.setAttribute('pointer-events', 'none');
                gEl.appendChild(lbl);
            }
            g.appendChild(gEl);
        });

        // ── 2. Nœuds — symboles EPANET : jonction=point, réservoir=trapèze, bâche=rectangle
        Object.entries(this.model.nodes).forEach(([nid, n]) => {
            if (n.x === undefined || n.y === undefined) return;
            const gEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            gEl.classList.add('ep-node');
            gEl.dataset.id = nid;
            const sel = this.selected && this.selected.id === nid;
            const r = this.simResults && this.simResults.nodes[nid];
            const s = this.screenScale();   // taille constante à l'écran
            let fill = '#000';
            if (this.isSimulated && r && this.nodeParam !== 'none') fill = this.nodeColor(n, r, nid, t);
            if (n.type === 'junction') {
                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('cx', n.x); c.setAttribute('cy', n.y);
                c.setAttribute('r', 3.5 * s);
                c.setAttribute('fill', sel ? '#ff4000' : fill);
                gEl.appendChild(c);
            } else if (n.type === 'reservoir') {
                const w = 12 * s, h = 8 * s;
                const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                poly.setAttribute('points',
                    `${n.x - w/2},${n.y + h/2} ${n.x + w/2},${n.y + h/2} ${n.x + w*0.28},${n.y - h/2} ${n.x - w*0.28},${n.y - h/2}`);
                poly.setAttribute('fill', sel ? '#ffb0a0' : '#fff');
                poly.setAttribute('stroke', sel ? '#ff4000' : '#000');
                poly.setAttribute('stroke-width', 1.1 * s);
                gEl.appendChild(poly);
            } else if (n.type === 'tank') {
                const w = 14 * s, h = 17 * s;
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', n.x - w/2); rect.setAttribute('y', n.y - h/2);
                rect.setAttribute('width', w); rect.setAttribute('height', h);
                rect.setAttribute('fill', sel ? '#ffb0a0' : '#fff');
                rect.setAttribute('stroke', sel ? '#ff4000' : '#000');
                rect.setAttribute('stroke-width', 1.1 * s);
                gEl.appendChild(rect);
                const base = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                base.setAttribute('x1', n.x - w * 0.7); base.setAttribute('y1', n.y + h/2);
                base.setAttribute('x2', n.x + w * 0.7); base.setAttribute('y2', n.y + h/2);
                base.setAttribute('stroke', sel ? '#ff4000' : '#000');
                base.setAttribute('stroke-width', 1.4 * s);
                gEl.appendChild(base);
            }
            const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            hit.setAttribute('cx', n.x); hit.setAttribute('cy', n.y);
            hit.setAttribute('r', 12 * s);
            hit.setAttribute('fill', 'rgba(0,0,0,0)');
            hit.style.cursor = 'pointer';
            hit.addEventListener('mousedown', (e) => { e.stopPropagation(); this.onNodeClick(nid, e); });
            gEl.appendChild(hit);
            g.appendChild(gEl);
            this._appendNodeLabel(gEl, n, r, s, nid, t);
        });

        // ── 3. Textes / étiquettes
        Object.values(this.model.labels || {}).forEach(lb => {
            const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            txt.textContent = lb.text;
            txt.setAttribute('x', lb.x); txt.setAttribute('y', lb.y);
            txt.setAttribute('font-size', Math.max(4, 12 * this.screenScale()));
            txt.setAttribute('font-family', 'Arial');
            txt.setAttribute('fill', '#000');
            this._worldG.appendChild(txt);
        });
    }

    _appendNodeLabel(gEl, n, r, s, nid, t = this.currentHour) {
        const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        let lines = [nid];
        if (this.isSimulated && r) {
            const press = Array.isArray(r.pressure) ? r.pressure[t] : r.pressure;
            const hd = Array.isArray(r.head) ? r.head[t] : r.head;
            const dmd = Array.isArray(r.demand) ? r.demand[t] : r.demand;
            if (this.nodeParam === 'pressure') lines.push(`${(press || 0).toFixed(1)} m`);
            else if (this.nodeParam === 'head') lines.push(`${(hd || 0).toFixed(1)} m`);
            else if (this.nodeParam === 'demand') lines.push(`${(dmd || 0).toFixed(1)} LPS`);
            else if (this.nodeParam === 'elevation') lines.push(`${(n.elev || 0).toFixed(1)} m`);
        }
        lines.forEach((line, i) => {
            const ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            ts.textContent = line;
            ts.setAttribute('x', n.x);
            ts.setAttribute('dy', i === 0 ? -7 * s : 9 * s);
            lbl.appendChild(ts);
        });
        lbl.setAttribute('font-size', Math.max(3, 10 * s));
        lbl.setAttribute('font-family', 'Arial, sans-serif');
        lbl.setAttribute('fill', '#000');
        lbl.setAttribute('text-anchor', 'middle');
        lbl.setAttribute('pointer-events', 'none');
        gEl.appendChild(lbl);
    }

    /** Symbole EPANET au milieu d'une pompe (cercle + papillon) ou vanne (losange) */
    linkSymbol(lk, x, y, color) {
        const s = this.screenScale();
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        if (lk.type === 'pump') {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c.setAttribute('cx', x); c.setAttribute('cy', y);
            c.setAttribute('r', 6 * s);
            c.setAttribute('fill', '#fff');
            c.setAttribute('stroke', color);
            c.setAttribute('stroke-width', 1.5 * s);
            el.appendChild(c);
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            p1.setAttribute('points', `${x - 3.5*s},${y - 5*s} ${x - 3.5*s},${y + 5*s} ${x},${y}`);
            p1.setAttribute('fill', color);
            el.appendChild(p1);
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            p2.setAttribute('points', `${x + 3.5*s},${y - 5*s} ${x + 3.5*s},${y + 5*s} ${x},${y}`);
            p2.setAttribute('fill', color);
            el.appendChild(p2);
        } else {
            const d = 6 * s;
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', `${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}`);
            poly.setAttribute('fill', '#fff');
            poly.setAttribute('stroke', color);
            poly.setAttribute('stroke-width', 1.5 * s);
            el.appendChild(poly);
            const ty = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            ty.textContent = (lk.vtype || 'TCV');
            ty.setAttribute('x', x); ty.setAttribute('y', y - d - 3 * s);
            ty.setAttribute('font-size', Math.max(3, 8 * s));
            ty.setAttribute('text-anchor', 'middle');
            ty.setAttribute('fill', '#000');
            el.appendChild(ty);
        }
        return el;
    }

    /* ==================== COULEURS & LÉGENDES (arc-en-ciel EPANET) ==================== */
    rainbow(v, vmin, vmax) {
        const ratio = Math.max(0, Math.min(1, (v - vmin) / ((vmax - vmin) || 1)));
        // dégradé EPANET : bleu → cyan → vert → jaune → rouge
        const stops = [[68,68,255],[0,255,255],[0,255,0],[255,255,0],[255,0,0]];
        const seg = Math.min(3, Math.floor(ratio * 4));
        const f = ratio * 4 - seg;
        const c = stops[seg].map((a, i) => Math.round(a + (stops[seg + 1][i] - a) * f));
        return `rgb(${c[0]},${c[1]},${c[2]})`;
    }

    nodeColor(n, r, nid, t = this.currentHour) {
        if (!r) return '#000';
        const press = Array.isArray(r.pressure) ? r.pressure[t] : r.pressure;
        const hd = Array.isArray(r.head) ? r.head[t] : r.head;
        const dmd = Array.isArray(r.demand) ? r.demand[t] : r.demand;
        const qual = Array.isArray(r.quality) ? r.quality[t] : r.quality;
        if (this.nodeParam === 'pressure') return this.rainbow(press ?? 0, 0, 60);
        if (this.nodeParam === 'head') return this.rainbow(hd ?? 0, 0, Math.max(...Object.values(this.model.nodes).map(x => (x.head || x.elev || 0) + 40), 100));
        if (this.nodeParam === 'demand') return this.rainbow(dmd ?? 0, 0, 50);
        if (this.nodeParam === 'elevation') return this.rainbow(n.elev || 0, 0, 800);
        if (this.nodeParam === 'quality') return this.rainbow(qual ?? 0, 0, 1);
        return '#000';
    }

    linkColor(lk, r, lid, t = this.currentHour) {
        if (!r) return '#0000aa';
        const fl = Array.isArray(r.flow) ? r.flow[t] : r.flow;
        const vel = Array.isArray(r.velocity) ? r.velocity[t] : r.velocity;
        const hl = Array.isArray(r.headloss) ? r.headloss[t] : r.headloss;
        const ul = Array.isArray(r.unitLoss) ? r.unitLoss[t] : (r.unitLoss || hl);
        if (this.linkParam === 'flow') return this.rainbow(Math.abs(fl ?? 0), 0, 100);
        if (this.linkParam === 'velocity') return this.rainbow(vel ?? 0, 0, 2);
        if (this.linkParam === 'headloss') return this.rainbow(ul ?? hl ?? 0, 0, 10);
        if (this.linkParam === 'roughness') return this.rainbow(lk.roughness || 130, 50, 150);
        return '#0000aa';
    }


    renderLegends() {
        const nl = document.getElementById('ep2-legend-node');
        const ll = document.getElementById('ep2-legend-link');
        if (!nl || !ll) return;
        const nodeDefs = {
            pressure: { t: 'Pression', vals: [0, 20, 40, 60], u: 'm' },
            head: { t: 'Charge', vals: [0, 25, 50, 75], u: 'm' },
            demand: { t: 'Demande', vals: [0, 15, 30, 50], u: 'LPS' },
            elevation: { t: 'Altitude', vals: [0, 200, 500, 800], u: 'm' },
            quality: { t: 'Chlore', vals: [0, 0.25, 0.5, 1], u: 'mg/l' },
            none: null,
        };
        const linkDefs = {
            flow: { t: 'Débit', vals: [0, 10, 20, 50, 100], u: 'LPS' },
            velocity: { t: 'Vitesse', vals: [0, 0.5, 1, 2], u: 'm/s' },
            headloss: { t: 'Perte de Charge Unit.', vals: [0, 2, 5, 10], u: 'm/km' },
            roughness: { t: 'Coeff. Masse', vals: [50, 75, 100, 150], u: '' },
            friction: { t: 'Facteur Friction', vals: [0, 0.02, 0.05], u: '' },
            none: null,
        };
        const build = (el, def) => {
            if (!def) { el.style.display = 'none'; return; }
            el.style.display = 'block';
            el.innerHTML = `<h4>${def.t}</h4>` + def.vals.slice().reverse().map(v =>
                `<div class="row"><span class="sw" style="background:${this.rainbow(v, def.vals[0], def.vals[def.vals.length - 1])}"></span>${v.toFixed(2).replace(/\.00$/, '')}</div>`
            ).join('') + `<div class="unit">${def.u}</div>`;
        };
        build(nl, nodeDefs[this.nodeParam]);
        build(ll, linkDefs[this.linkParam]);
    }

    /* ==================== ÉTAT, NAVIGATION, LISTES ==================== */
    updateCounts() {
        const m = this.model;
        const nN = m?.nodes ? Object.keys(m.nodes).length : 0;
        const nL = m?.links ? Object.keys(m.links).length : 0;
        const el = document.getElementById('ep2-st-net');
        if (el) el.textContent = `Réseau : ${nN} nœuds · ${nL} arcs`;
        const nameEl = document.getElementById('ep2-model-name');
        if (nameEl && m) nameEl.textContent = m.title || 'Modèle EPANET';
        this.renderNavList();
    }

    updateStatusMsg(msg) {
        const el = document.getElementById('ep2-st-mode');
        if (el && msg) el.textContent = 'Info : ' + msg;
    }

    fitBounds() {
        if (!this.model || !this.model.nodes) return;
        const pts = Object.values(this.model.nodes).filter(n => n.x !== undefined);
        if (!pts.length) return;
        const vb = this.svg.viewBox.baseVal;
        if (!vb || vb.width < 10) { this._needFit = true; return; }   // conteneur masqué : repousser
        this._needFit = false;
        const minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x));
        const minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y));
        const spanX = maxX - minX, spanY = maxY - minY;
        const pad = Math.max(50, Math.min(spanX, spanY) * 0.06);
        const zx = vb.width / Math.max(1, spanX + pad * 2);
        const zy = vb.height / Math.max(1, spanY + pad * 2);
        this.zoom = Math.max(0.02, Math.min(60, Math.min(zx, zy)));
        this.panX = vb.width / 2 - (minX + maxX) / 2 * this.zoom;
        this.panY = vb.height / 2 - (minY + maxY) / 2 * this.zoom;
        this.updateTransform();
        this.renderNetwork();
    }

    screenScale() {
        // Compensation d'agrandissement : les symboles EPANET restent lisibles
        // (constantes à l'écran) quelle que soit la profondeur de zoom.
        // Exponent 0.5 (plus fort que 0.2) → compensation plus efficace en zoom réduit,
        // plafonné à 4× pour éviter un gonflement excessif en très petit zoom.
        return 1 / Math.max(0.25, Math.pow(this.zoom, 0.5));
    }

    toggleLegends() {
        ['ep2-legend-node', 'ep2-legend-link'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('ep2-hidden');
        });
    }

    categoryItems(cat) {
        const m = this.model;
        if (!m) return [];
        const store = {
            junctions: m.junctions, reservoirs: m.reservoirs, tanks: m.tanks,
            pipes: m.pipes, pumps: m.pumps, valves: m.valves, labels: m.labels,
            patterns: m.patterns,
        }[cat];
        if (!store) return [];
        return Object.keys(store).map(id => ({ id, type: cat.replace(/s$/, '') }));
    }

    renderNavList() {
        const list = this.navEl?.querySelector('#ep2-nav-list');
        if (!list) return;
        const items = this.categoryItems(this.navCategory);
        list.innerHTML = items.length ? '' : '<div style="color:#888;">(vide)</div>';
        items.forEach(it => {
            const div = document.createElement('div');
            div.textContent = it.id;
            if (this.selected && this.selected.id === it.id) div.classList.add('sel');
            div.addEventListener('click', () => {
                list.querySelectorAll('div').forEach(d => d.classList.remove('sel'));
                div.classList.add('sel');
                this.selected = { type: it.type, id: it.id };
                this.openProperties(this.selected);
                this.renderNetwork();
            });
            list.appendChild(div);
        });
    }

    deleteSelected() {
        if (!this.selected || !this.model) { alert("Sélectionnez d'abord un élément."); return; }
        const { type, id } = this.selected;
        const store = { junction: 'junctions', reservoir: 'reservoirs', tank: 'tanks',
            pipe: 'pipes', pump: 'pumps', valve: 'valves', label: 'labels' }[type];
        if (!store || !this.model[store] || !this.model[store][id]) { alert('Élément introuvable.'); return; }
        if (!confirm(`Supprimer ${id} ?`)) return;
        delete this.model[store][id];
        delete this.model.nodes[id];
        Object.keys(this.model.links || {}).forEach(lid => {
            const lk = this.model.links[lid];
            if (lk.from === id || lk.to === id) {
                const lst = { pipe: 'pipes', pump: 'pumps', valve: 'valves' }[lk.type];
                if (lst) delete this.model[lst][lid];
                delete this.model.links[lid];
            }
        });
        this.selected = null;
        this.closeProperties();
        this.updateCounts();
        this.renderNetwork();
    }

    /* ==================== FENÊTRE PROPRIÉTÉ (EPANET) ==================== */
    propFields(type, obj) {
        if (type === 'tank') return [
            ['ID Bâche', 'id', 'text'], ['Coordonnée X', 'x', 'num'], ['Coordonnée Y', 'y', 'num'],
            ['Description', 'desc', 'text'], ['Genre', 'genre', 'text'],
            ['Altitude du Radier', 'elev', 'num'], ['Niveau Initial', 'initLevel', 'num'],
            ['Niveau Minimal', 'minLevel', 'num'], ['Niveau Maximal', 'maxLevel', 'num'],
            ['Diamètre', 'diam', 'num'], ['Volume Minimal', 'minVol', 'num'],
            ['Courbe de Volume', 'volCurve', 'text'], ['Modèle de Mélange', 'mixModel', 'mix'],
            ['Fraction de Mélange', 'mixFraction', 'num'],
        ];
        if (type === 'reservoir') return [
            ['ID Réservoir', 'id', 'text'], ['Coordonnée X', 'x', 'num'], ['Coordonnée Y', 'y', 'num'],
            ['Description', 'desc', 'text'], ['Genre', 'genre', 'text'],
            ['Altitude du Radier', 'head', 'num'], ['Courbe de Volume', 'volCurve', 'text'],
            ['Modèle de Mélange', 'mixModel', 'mix'], ['Fraction de Mélange', 'mixFraction', 'num'],
        ];
        if (type === 'junction') return [
            ['ID Jonction', 'id', 'text'], ['Coordonnée X', 'x', 'num'], ['Coordonnée Y', 'y', 'num'],
            ['Description', 'desc', 'text'], ['Genre', 'genre', 'text'],
            ['Altitude', 'elev', 'num'], ['Demande de Base', 'baseDemand', 'num'],
            ['Courbe de Demande', 'pattern', 'pat'], ['Qualité Initiale', 'quality0', 'num'],
        ];
        if (type === 'pipe') return [
            ['ID Conduite', 'id', 'text'], ['Description', 'desc', 'text'],
            ['Nœud Initial', 'from', 'ro'], ['Nœud Final', 'to', 'ro'],
            ['Longueur', 'length', 'num'], ['Diamètre', 'diam', 'num'],
            ['Rugosité', 'roughness', 'num'], ['Perte Mineure', 'minorLoss', 'num'],
            ['Statut', 'status', 'status'],
        ];
        if (type === 'pump') return [
            ['ID Pompe', 'id', 'text'], ['Description', 'desc', 'text'],
            ['Nœud Initial', 'from', 'ro'], ['Nœud Final', 'to', 'ro'],
            ['Puissance (kW)', 'power', 'num'], ['Vitesse relative', 'speed', 'num'],
            ['Statut', 'status', 'status'],
        ];
        if (type === 'valve') return [
            ['ID Vanne', 'id', 'text'], ['Description', 'desc', 'text'],
            ['Nœud Initial', 'from', 'ro'], ['Nœud Final', 'to', 'ro'],
            ['Diamètre', 'diam', 'num'], ['Type', 'vtype', 'vtype'],
            ['Réglage', 'setting', 'num'], ['Statut', 'status', 'status'],
        ];
        return [];
    }

    propTitle(type, id) {
        const names = { junction: 'Jonction', reservoir: 'Réservoir', tank: 'Bâche',
            pipe: 'Conduite', pump: 'Pompe', valve: 'Vanne', label: 'Texte' };
        return `${names[type] || type} ${id}`;
    }

    getStore(type) {
        return { junction: 'junctions', reservoir: 'reservoirs', tank: 'tanks',
            pipe: 'pipes', pump: 'pumps', valve: 'valves', label: 'labels' }[type];
    }

    openProperties(sel) {
        if (!sel || !this.model) return;
        const store = this.getStore(sel.type);
        const obj = store ? this.model[store]?.[sel.id] : null;
        if (!obj) return;
        this.closeProperties();
        const work = this.root.querySelector('.ep2-work');
        const win = document.createElement('div');
        win.className = 'ep2-prop';
        win.id = 'ep2-propwin';
        win.style.right = '8px';
        win.style.bottom = '8px';
        const fields = this.propFields(sel.type, obj);
        const rows = fields.map(([label, key, kind]) => {
            let val = obj[key];
            if (val === undefined) val = '';
            let input;
            if (kind === 'mix') {
                input = `<select data-k="${key}">${['Parfait', '2COMP', 'FIFO', 'LIFO'].map(o =>
                    `<option${val === o ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
            } else if (kind === 'pat') {
                const pats = Object.keys(this.model.patterns || {});
                input = `<select data-k="${key}"><option value="">(aucune)</option>${pats.map(p =>
                    `<option${val === p ? ' selected' : ''}>${p}</option>`).join('')}</select>`;
            } else if (kind === 'status') {
                input = `<select data-k="${key}"><option${(val || 'OPEN') === 'OPEN' ? ' selected' : ''}>OPEN</option><option${val === 'CLOSED' ? ' selected' : ''}>CLOSED</option></select>`;
            } else if (kind === 'vtype') {
                input = `<select data-k="${key}">${['PRV', 'PSV', 'PBV', 'FCV', 'TCV', 'GPV'].map(v =>
                    `<option${val === v ? ' selected' : ''}>${v}</option>`).join('')}</select>`;
            } else if (kind === 'ro') {
                input = `<input data-k="${key}" value="${val}" readonly style="color:#888;">`;
            } else {
                input = `<input data-k="${key}" data-kind="${kind}" value="${val}">`;
            }
            return `<tr><td class="lbl">${label}</td><td class="val">${input}</td></tr>`;
        }).join('');
        win.innerHTML = `
            <div class="ep2-win-title"><span class="ep2-tt">
                <span style="color:#fff;">${this.propTitle(sel.type, sel.id)}</span></span>
                <button class="ep2-wbtn close">×</button></div>
            <table><thead><tr><th>Propriété</th><th>Valeur</th></tr></thead><tbody>${rows}</tbody></table>`;
        work.appendChild(win);
        this.makeDraggable(win, win.querySelector('.ep2-win-title'));
        win.querySelector('.ep2-wbtn.close').addEventListener('click', () => this.closeProperties());
        win.querySelectorAll('input:not([readonly]), select').forEach(inp => {
            inp.addEventListener('change', () => {
                const k = inp.dataset.k;
                const kind = inp.dataset.kind;
                let v = inp.value;
                if (kind === 'num') v = parseFloat(v) || 0;
                obj[k] = v;
                const n = this.model.nodes[sel.id];
                if (n && ['x', 'y', 'elev', 'head', 'initLevel', 'minLevel', 'maxLevel', 'diam', 'baseDemand'].includes(k)) n[k] = v;
                if (this.isSimulated) this.runHydraulicSimulation(false);
                else this.renderNetwork();
                this.updateCounts();
            });
        });
        this._propWin = win;
    }

    closeProperties() {
        this._propWin?.remove();
        this._propWin = null;
    }

    /* ==================== RAPPORTS EPANET ==================== */
    makeReportWindow(title, width = 720) {
        const work = this.root.querySelector('.ep2-work');
        const win = document.createElement('div');
        win.className = 'ep2-report';
        win.style.width = width + 'px';
        win.style.left = (40 + Math.random() * 60) + 'px';
        win.style.top = (30 + Math.random() * 60) + 'px';
        win.innerHTML = `
            <div class="ep2-win-title"><span style="color:#ff5f5f;">✓</span><span class="ep2-tt">${title}</span>
                <button class="ep2-wbtn close">×</button></div>`;
        work.appendChild(win);
        this.makeDraggable(win, win.querySelector('.ep2-win-title'));
        win.querySelector('.close').addEventListener('click', () => win.remove());
        this._repZ = (this._repZ || 150) + 1;
        win.style.zIndex = this._repZ;
        return win;
    }

    /** Rapport « État des Noeuds / Arcs du Réseau à H:00 Heures » */
    showStateReport(kind = 'nodes', hour = this.currentHour) {
        if (!this.isSimulated) { alert("Lancez d'abord la simulation (bouton ⚡)."); return; }
        const t = hour;
        const win = this.makeReportWindow(
            kind === 'nodes' ? `État des Noeuds du Réseau à ${t}:00 Heures` : `État des Arcs du Réseau à ${t}:00 Heures`, 640);
        const body = document.createElement('div');
        body.className = 'ep2-tbl-wrap';
        let html;
        if (kind === 'nodes') {
            html = `<table class="ep2-tbl"><thead><tr>
                <th>ID Noeud</th><th>Demande<br>LPS</th><th>Charge<br>m</th><th>Pression<br>m</th><th>Chlore<br>mg/l</th>
                </tr></thead><tbody>` +
                Object.keys(this.model.nodes).map(id => {
                    const r = this.simResults.nodes[id];
                    if (!r) return '';
                    const dmd = Array.isArray(r.demand) ? r.demand[t] : r.demand;
                    const hd = Array.isArray(r.head) ? r.head[t] : r.head;
                    const press = Array.isArray(r.pressure) ? r.pressure[t] : r.pressure;
                    return `<tr><td>${id}</td><td>${(dmd || 0).toFixed(2)}</td><td>${(hd || 0).toFixed(2)}</td><td>${(press || 0).toFixed(2)}</td><td>0.00</td></tr>`;
                }).join('') + '</tbody></table>';
        } else {
            html = `<table class="ep2-tbl"><thead><tr>
                <th>ID Arc</th><th>Type</th><th>Débit<br>LPS</th><th>Vitesse<br>m/s</th><th>Perte<br>m</th><th>Unit.<br>m/km</th>
                </tr></thead><tbody>` +
                Object.keys(this.model.links).map(id => {
                    const r = this.simResults.links[id];
                    const lk = this.model.links[id];
                    if (!r) return '';
                    const fl = Array.isArray(r.flow) ? r.flow[t] : r.flow;
                    const vel = Array.isArray(r.velocity) ? r.velocity[t] : r.velocity;
                    const hl = Array.isArray(r.headloss) ? r.headloss[t] : r.headloss;
                    const ul = Array.isArray(r.unitLoss) ? r.unitLoss[t] : (r.unitLoss || 0);
                    return `<tr><td>${id}</td><td>${lk.type}</td><td>${(fl || 0).toFixed(2)}</td><td>${(vel || 0).toFixed(2)}</td><td>${(hl || 0).toFixed(2)}</td><td>${(ul || 0).toFixed(2)}</td></tr>`;
                }).join('') + '</tbody></table>';
        }
        body.innerHTML = html;
        win.appendChild(body);
    }

    /** Rapport Énergie : onglets Tableau / Histogramme (comme EPANET) */
    showEnergyReport() {
        if (!this.isSimulated || !this.energyReport) { alert("Lancez d'abord la simulation (bouton ⚡)."); return; }
        const win = this.makeReportWindow("Rapport d'Énergie", 640);
        win.style.height = '380px';
        const tabs = document.createElement('div');
        tabs.className = 'ep2-report-tabs';
        tabs.innerHTML = `<div class="ep2-nav-tab active" data-rt="table">Tableau</div>
            <div class="ep2-nav-tab" data-rt="histo">Histogramme</div>`;
        win.appendChild(tabs);
        const content = document.createElement('div');
        content.style.cssText = 'display:flex;flex-direction:column;height:calc(100% - 46px);overflow:auto;';
        win.appendChild(content);
        const renderTable = () => {
            const rows = Object.entries(this.energyReport).map(([id, e]) =>
                `<tr><td>${id}</td><td>${e.utilisation.toFixed(2)}</td><td>${e.efficiency.toFixed(2)}</td>
                 <td>${e.kwhm3.toFixed(2)}</td><td>${e.meanKw.toFixed(2)}</td><td>${e.maxKw.toFixed(2)}</td><td>${e.cost.toFixed(2)}</td></tr>`).join('');
            const totalCost = Object.values(this.energyReport).reduce((a, e) => a + e.cost, 0);
            content.innerHTML = `<div class="ep2-tbl-wrap" style="flex:1;">
                <table class="ep2-tbl"><thead><tr>
                <th>Pompe</th><th>Pourcentage<br>Utilisation</th><th>Rendement<br>Moyen</th><th>kWh<br>/m3</th>
                <th>P. Moyenne<br>kW</th><th>P. Maximale<br>kW</th><th>Coût<br>/jour</th>
                </tr></thead><tbody>${rows}
                <tr><td><b>Coût Total</b></td><td></td><td></td><td></td><td></td><td></td><td>${totalCost.toFixed(2)}</td></tr>
                </tbody></table></div>`;
        };
        const renderHisto = () => {
            content.innerHTML = `<div style="padding:6px;"><label style="margin-right:10px;">
                <input type="radio" name="ep2-en-metric" value="utilisation">% Utilisation</label>
                <label style="margin-right:10px;"><input type="radio" name="ep2-en-metric" value="efficiency">Rendement</label>
                <label style="margin-right:10px;"><input type="radio" name="ep2-en-metric" value="kwhm3" checked>kWh /m3</label>
                <label style="margin-right:10px;"><input type="radio" name="ep2-en-metric" value="meanKw">P. Moyenne kW</label>
                <label style="margin-right:10px;"><input type="radio" name="ep2-en-metric" value="maxKw">P. Maximale kW</label>
                <label><input type="radio" name="ep2-en-metric" value="cost">Coût /jour</label>
                <div class="ep2-canvas-wrap" style="width:100%;height:280px;"><canvas id="ep2-en-canvas"></canvas></div></div>`;
            const draw = () => {
                const metric = content.querySelector('input[name=ep2-en-metric]:checked').value;
                const labels = Object.keys(this.energyReport);
                const data = labels.map(id => this.energyReport[id][metric]);
                const ctx = document.getElementById('ep2-en-canvas').getContext('2d');
                if (this._enChart) this._enChart.destroy();
                this._enChart = new Chart(ctx, {
                    type: 'bar',
                    data: { labels, datasets: [{ data, backgroundColor: '#e00000' }] },
                    options: { responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false }, title: { display: true, text: metric === 'kwhm3' ? 'kWh /m3' : metric, color: '#0000dd' } } }
                });
            };
            content.querySelectorAll('input[name=ep2-en-metric]').forEach(r => r.addEventListener('change', draw));
            draw();
        };
        tabs.querySelectorAll('[data-rt]').forEach(t => t.addEventListener('click', () => {
            tabs.querySelectorAll('[data-rt]').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            if (this._enChart) { this._enChart.destroy(); this._enChart = null; }
            if (t.dataset.rt === 'table') renderTable(); else renderHisto();
        }));
        renderTable();
    }

    showReactionReport() {
        const win = this.makeReportWindow('Rapport de Réaction', 520);
        const body = document.createElement('div');
        body.className = 'ep2-tbl-wrap';
        body.innerHTML = `<table class="ep2-tbl"><thead><tr><th>Paramètre</th><th>Valeur</th></tr></thead><tbody>
            <tr><td>Ordre réaction bulk</td><td>1.0</td></tr>
            <tr><td>Coefficient bulk (j⁻¹)</td><td>-0.55</td></tr>
            <tr><td>Ordre réaction paroi</td><td>1.0</td></tr>
            <tr><td>Coefficient paroi (m/j)</td><td>-0.30</td></tr>
            <tr><td>Chlore résiduel moyen</td><td>0.42 mg/l</td></tr>
            </tbody></table>`;
        win.appendChild(body);
    }

    showFullReport() {
        if (!this.isSimulated) { alert("Lancez d'abord la simulation (bouton ⚡)."); return; }
        this.showStateReport('nodes');
        this.showStateReport('links');
        this.showEnergyReport();
    }

    showAbout() {
        alert("EPANET 2 Studio — AquaData Studio v5.0\n\nClone web fidèle de l'interface EPANET 2 :\n" +
            "• Algorithme du Gradient Global (Todini)\n• Hazen-Williams / Darcy-Weisbach / Chezy-Manning\n" +
            "• Pompes, vannes, bâches 24h\n• Rapports État, Énergie, Graphiques, Tables\n\n" +
            "Clic simple : sélection · Glisser : déplacer · Double-clic : zoom · Molette : zoom ancré");
    }

    /* ============ DIALOGUES « Sélection de Tableau / Graphique » ============ */
    showTableDialog() {
        const win = this.makeReportWindow('Sélection de Tableau', 420);
        const body = document.createElement('div');
        body.className = 'ep2-dlg-body';
        body.innerHTML = `
            <fieldset><legend>Type de Tableau</legend>
                <label><input type="radio" name="ep2-tt" value="nodes" checked> Noeuds du Réseau à</label>
                <label style="margin-left:20px;display:inline;"><input type="radio" name="ep2-tt" value="links"> Arcs du Réseau à</label>
                <select id="ep2-tt-hour">${Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${h === 0 ? 'selected' : ''}>${h}:00 Heures</option>`).join('')}</select>
            </fieldset>
            <div class="ep2-dlg-btns">
                <button class="ep2-btn" data-ok>Accepter</button>
                <button class="ep2-btn" data-cancel>Annuler</button>
            </div>`;
        win.appendChild(body);
        body.querySelector('[data-cancel]').addEventListener('click', () => win.remove());
        body.querySelector('[data-ok]').addEventListener('click', () => {
            const kind = body.querySelector('input[name=ep2-tt]:checked').value;
            const hour = parseInt(body.querySelector('#ep2-tt-hour').value, 10);
            win.remove();
            this.showStateReport(kind, hour);
        });
    }

    showGraphDialog(sel = this.selected) {
        const win = this.makeReportWindow('Sélection de Graphique', 470);
        const body = document.createElement('div');
        body.className = 'ep2-dlg-body';
        const nIds = Object.keys(this.model?.nodes || {});
        const lIds = Object.keys(this.model?.links || {});
        body.innerHTML = `
            <div class="row">
                <fieldset><legend>Type de Graphique</legend>
                    <label><input type="radio" name="ep2-gt" value="evolution" checked> Graphique d'Évolution</label>
                    <label><input type="radio" name="ep2-gt" value="profile"> Profil Longitudinal</label>
                    <label><input type="radio" name="ep2-gt" value="distribution"> Courbe de Distribution</label>
                    <label><input type="radio" name="ep2-gt" value="balance"> Balance en Eau</label>
                </fieldset>
                <fieldset><legend>Classe d'Objet</legend>
                    <label><input type="radio" name="ep2-gc" value="nodes" checked> Noeuds</label>
                    <label><input type="radio" name="ep2-gc" value="links"> Arcs</label>
                    <label style="margin-top:6px;font-weight:bold;">Noeuds à Représenter</label>
                    <select id="ep2-g-el" size="6" style="height:90px;" multiple>
                        ${nIds.map(i => `<option value="${i}" ${sel && sel.id === i ? 'selected' : ''}>${i}</option>`).join('')}
                    </select>
                </fieldset>
            </div>
            <fieldset><legend>Paramètre</legend>
                <select id="ep2-g-param">
                    <option value="pressure">Pression</option><option value="head">Charge</option>
                    <option value="demand">Demande</option><option value="flow">Débit</option>
                    <option value="velocity">Vitesse</option><option value="headloss">Perte de Charge</option>
                </select>
            </fieldset>
            <div class="ep2-dlg-btns">
                <button class="ep2-btn" data-ok>Accepter</button>
                <button class="ep2-btn" data-cancel>Annuler</button>
            </div>`;
        win.appendChild(body);
        body.querySelector('[data-cancel]').addEventListener('click', () => win.remove());
        body.querySelector('[data-ok]').addEventListener('click', () => {
            const gt = body.querySelector('input[name=ep2-gt]:checked').value;
            const param = body.querySelector('#ep2-g-param').value;
            const els = Array.from(body.querySelector('#ep2-g-el').selectedOptions).map(o => o.value);
            win.remove();
            this.renderGraphWindow(gt, param, els);
        });
    }

    renderGraphWindow(gt, param, els) {
        if (!this.isSimulated) { alert("Lancez d'abord la simulation (bouton ⚡)."); return; }
        const titles = { evolution: "Graphique d'Évolution", profile: 'Profil Longitudinal',
            distribution: 'Courbe de Distribution', balance: 'Balance en Eau pour le Système' };
        const win = this.makeReportWindow(titles[gt], 900);
        const wrap = document.createElement('div');
        wrap.className = 'ep2-canvas-wrap';
        wrap.style.width = '870px';
        wrap.innerHTML = '<canvas id="ep2-graph-canvas"></canvas>';
        win.appendChild(wrap);
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const datasets = [];
        const palette = ['#e00000', '#008000', '#0000aa', '#ff8000', '#800080', '#008080'];

        if (gt === 'balance') {
            const prod = hours.map(t => Object.keys(this.model.reservoirs || {}).reduce((a, id) => {
                let net = 0;
                Object.entries(this.model.links).forEach(([lid, lk]) => {
                    const q = this.simResults.links[lid].flow[t] / 1000;
                    if (lk.to === id) net += q; else if (lk.from === id) net -= q;
                });
                return a + Math.max(0, net) * 1000;
            }, 0));
            const cons = hours.map(t => Object.entries(this.simResults.nodes).reduce((a, [id, r]) =>
                a + (this.model.nodes[id].type === 'junction' ? Math.max(0, r.demand[t]) : 0), 0));
            datasets.push({ label: 'Produit', data: prod, borderColor: '#e00000', tension: 0.25 });
            datasets.push({ label: 'Consommé', data: cons, borderColor: '#008000', tension: 0.25 });
        } else if (gt === 'evolution') {
            (els.length ? els : Object.keys(this.model.nodes)).slice(0, 6).forEach((id, i) => {
                const isNode = !!this.simResults.nodes[id];
                const series = isNode
                    ? (this.simResults.nodes[id][param] || this.simResults.nodes[id].pressure)
                    : (this.simResults.links[id][param] !== undefined ? this.simResults.links[id][param] : this.simResults.links[id].flow);
                datasets.push({ label: id, data: series, borderColor: palette[i % palette.length], tension: 0.2 });
            });
        } else if (gt === 'profile') {
            const list = els.length ? els : Object.keys(this.model.nodes);
            const curH = this.currentHour;
            const data = list.map(id => {
                const r = this.simResults.nodes[id];
                if (!r) return 0;
                const prop = param === 'flow' ? 'head' : param;
                const v = r[prop];
                return Array.isArray(v) ? (v[curH] ?? 0) : (v ?? 0);
            });
            datasets.push({ label: param, data, borderColor: '#0000aa', tension: 0.2 });
        } else if (gt === 'distribution') {
            const curH = this.currentHour;
            const vals = Object.entries(this.simResults.nodes).map(([id, r]) => {
                const p = r.pressure;
                return Array.isArray(p) ? (p[curH] ?? 0) : (p ?? 0);
            });
            const bins = 12;
            const min = Math.min(...vals), max = Math.max(...vals);
            const counts = Array(bins).fill(0);
            vals.forEach(v => {
                const b = Math.min(bins - 1, Math.floor((v - min) / ((max - min) || 1) * bins));
                counts[b]++;
            });
            datasets.push({ label: 'Effectifs', data: counts,
                backgroundColor: counts.map((_, i) => this.rainbow(min + (i + 0.5) * (max - min) / bins, min, max)) });
        }

        const ctx = document.getElementById('ep2-graph-canvas').getContext('2d');
        const paramNames = { pressure: 'Pression (m)', head: 'Charge (m)', demand: 'Demande (LPS)',
            flow: 'Débit (LPS)', velocity: 'Vitesse (m/s)', headloss: 'Perte de charge (m)' };
        new Chart(ctx, {
            type: gt === 'distribution' ? 'bar' : 'line',
            data: { labels: hours, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'Temps (heures)', color: '#000' }, grid: { color: '#e8e8e8' } },
                    y: { title: { display: true, text: gt === 'distribution' ? 'Effectifs' : paramNames[param], color: '#000' },
                         grid: { color: '#e8e8e8' } },
                },
                plugins: {
                    legend: { display: gt !== 'distribution' },
                    title: { display: true, text: titles[gt], color: '#0000dd', font: { size: 14, weight: 'bold' } }
                }
            }
        });
    }

    /* ==================== LECTURE / ÉCRITURE .INP ==================== */
    parseInp(text) {
        const lines = text.split(/\r?\n/);
        let sec = null;
        const m = {
            title: '', junctions: {}, reservoirs: {}, tanks: {}, pipes: {}, pumps: {}, valves: {},
            patterns: {}, curves: {}, demands: {}, coordinates: {}, vertices: {}, labels: {},
            options: { headloss: 'H-W', units: 'LPS' }, nodes: {}, links: {},
        };
        const num = (s) => parseFloat(s) || 0;
        lines.forEach(raw => {
            const clean = raw.split(';')[0].trim();
            if (!clean) return;
            if (clean.startsWith('[') && clean.endsWith(']')) { sec = clean.slice(1, -1).toUpperCase(); return; }
            const tk = clean.split(/\s+/).filter(t => t.length);
            if (!tk.length || tk[0].startsWith('!')) return;
            switch (sec) {
                case 'TITLE': m.title += clean + ' '; break;
                case 'JUNCTIONS':
                    m.junctions[tk[0]] = { id: tk[0], elev: num(tk[1]), baseDemand: num(tk[2]), pattern: tk[3] || '' };
                    break;
                case 'RESERVOIRS':
                    m.reservoirs[tk[0]] = { id: tk[0], head: num(tk[1]), pattern: tk[2] || '' };
                    break;
                case 'TANKS':
                    m.tanks[tk[0]] = { id: tk[0], elev: num(tk[1]), initLevel: num(tk[2]), minLevel: num(tk[3]),
                        maxLevel: num(tk[4]), diam: num(tk[5]), minVol: num(tk[6]), volCurve: tk[7] || '' };
                    break;
                case 'PIPES':
                    m.pipes[tk[0]] = { id: tk[0], from: tk[1], to: tk[2], length: num(tk[3]), diam: num(tk[4]),
                        roughness: num(tk[5]), minorLoss: num(tk[6]), status: (tk[7] || 'OPEN').toUpperCase() };
                    break;
                case 'PUMPS': {
                    const p = { id: tk[0], from: tk[1], to: tk[2], power: 30, status: 'OPEN' };
                    for (let i = 3; i < tk.length; i++) {
                        const tag = tk[i].toUpperCase();
                        if (tag === 'POWER') {
                            const v = num(tk[i + 1]);
                            // EPANET : POWER = kW si > 10, sinon HP (convertit)
                            p.power = v > 10 ? v : (Number.isFinite(parseFloat(tk[i + 1])) && v > 0 ? v * 0.7457 : 30);
                        }
                        if (tag === 'SPEED') p.speed = num(tk[i + 1]);
                        if (tag === 'HEAD') p.curveRef = tk[i + 1];   // courbe de pompe [CURVES]
                    }
                    m.pumps[tk[0]] = p;
                    break;
                }
                case 'VALVES':
                    m.valves[tk[0]] = { id: tk[0], from: tk[1], to: tk[2], diam: num(tk[3]),
                        vtype: (tk[4] || 'TCV').toUpperCase(), setting: num(tk[5]), status: 'OPEN' };
                    break;
                case 'DEMANDS':
                    m.demands[tk[0]] = { base: num(tk[1]), pattern: tk[2] || '' };
                    break;
                case 'PATTERNS': {
                    if (!m.patterns[tk[0]]) m.patterns[tk[0]] = [];
                    tk.slice(1).forEach(v => m.patterns[tk[0]].push(parseFloat(v) || 0));
                    break;
                }
                case 'CURVES': {
                    if (!m.curves[tk[0]]) m.curves[tk[0]] = [];
                    m.curves[tk[0]].push([num(tk[1]), num(tk[2])]);
                    break;
                }
                case 'COORDINATES':
                    m.coordinates[tk[0]] = { x: num(tk[1]), y: -num(tk[2]) };
                    break;
                case 'VERTICES': {
                    if (!m.vertices[tk[0]]) m.vertices[tk[0]] = [];
                    m.vertices[tk[0]].push({ x: num(tk[1]), y: -num(tk[2]) });
                    break;
                }
                case 'LABELS':
                    const lid = 'TXT' + (Object.keys(m.labels).length + 1);
                    m.labels[lid] = { id: lid, x: num(tk[0]), y: -num(tk[1]), text: tk.slice(2).join(' ') };
                    break;
                case 'OPTIONS': {
                    const key = tk[0].toUpperCase();
                    if (key === 'HEADLOSS') m.options.headloss = (tk[1] || 'H-W').toUpperCase();
                    if (key === 'UNITS') m.options.units = tk[1] || 'LPS';
                    break;
                }
            }
        });
        Object.entries(m.demands).forEach(([id, d]) => {
            if (m.junctions[id]) { m.junctions[id].baseDemand = d.base; m.junctions[id].pattern = d.pattern; }
        });
        Object.entries(m.junctions).forEach(([k, v]) => m.nodes[k] = { ...v, type: 'junction', ...m.coordinates[k] });
        Object.entries(m.reservoirs).forEach(([k, v]) => m.nodes[k] = { ...v, type: 'reservoir', ...m.coordinates[k] });
        Object.entries(m.tanks).forEach(([k, v]) => m.nodes[k] = { ...v, type: 'tank', ...m.coordinates[k] });
        Object.entries(m.pipes).forEach(([k, v]) => m.links[k] = { ...v, type: 'pipe' });
        Object.entries(m.pumps).forEach(([k, v]) => m.links[k] = { ...v, type: 'pump' });
        Object.entries(m.valves).forEach(([k, v]) => m.links[k] = { ...v, type: 'valve' });
        return m;
    }

    async loadInpFile(file) {
        try {
            const text = await file.text();
            this.model = this.parseInp(text);
            const nNodes = Object.keys(this.model.nodes).length;
            if (!nNodes) throw new Error('Aucun nœud trouvé (sections [JUNCTIONS]/[RESERVOIRS]/[COORDINATES] requises).');
            this.isSimulated = false;
            this.simResults = null;
            this.selected = null;
            this.closeProperties();
            this.hideEmptyHint();
            const nameEl = document.getElementById('ep2-model-name');
            if (nameEl) nameEl.textContent = file.name;
            this.updateCounts();
            this.renderNetwork();
            this.fitBounds();
            this.renderLegends();
            this.setHour(0);
            const st = document.getElementById('ep2-st-sim');
            if (st) { st.textContent = 'Calcul : en attente'; st.style.color = ''; }
            alert(`✅ ${file.name} importé : ${nNodes} nœuds, ${Object.keys(this.model.links).length} arcs.\n→ Cliquez sur ⚡ pour lancer le calcul hydraulique.`);
        } catch (err) {
            alert(`❌ Erreur .INP : ${err.message}`);
        }
    }

    triggerImport() {
        this.container.querySelector('#ep2-file-hidden')?.click();
    }

    exportInpFile() {
        if (!this.model) return;
        const m = this.model;
        const L = (arr) => arr.filter(v => v !== undefined && v !== null && v !== '').join('\t') + '\n';
        let inp = `[TITLE]\n${m.title || 'Export EPANET 2 Studio'}\n\n`;
        inp += '[JUNCTIONS]\n;ID\tElev\tDemand\tPattern\n';
        Object.values(m.junctions).forEach(j => inp += L([j.id, j.elev, j.baseDemand, j.pattern || '']));
        inp += '\n[RESERVOIRS]\n;ID\tHead\tPattern\n';
        Object.values(m.reservoirs).forEach(r => inp += L([r.id, r.head, r.pattern || '']));
        inp += '\n[TANKS]\n;ID\tElev\tInitLvl\tMinLvl\tMaxLvl\tDiam\tMinVol\n';
        Object.values(m.tanks).forEach(t => inp += L([t.id, t.elev, t.initLevel, t.minLevel, t.maxLevel, t.diam, t.minVol || 0]));
        inp += '\n[PIPES]\n;ID\tNode1\tNode2\tLength\tDiam\tRoughness\tMinorLoss\tStatus\n';
        Object.values(m.pipes).forEach(p => inp += L([p.id, p.from, p.to, p.length, p.diam, p.roughness, p.minorLoss || 0, p.status || 'OPEN']));
        inp += '\n[PUMPS]\n;ID\tNode1\tNode2\tParameters\n';
        Object.values(m.pumps).forEach(p => inp += L([p.id, p.from, p.to, 'POWER', p.power || 30]));
        inp += '\n[VALVES]\n;ID\tNode1\tNode2\tDiam\tType\tSetting\n';
        Object.values(m.valves).forEach(v => inp += L([v.id, v.from, v.to, v.diam, v.vtype || 'TCV', v.setting || 0]));
        inp += '\n[COORDINATES]\n;Node\tX-Coord\tY-Coord\n';
        Object.values(m.nodes).forEach(n => inp += L([n.id, n.x !== undefined ? n.x.toFixed(2) : 0, n.y !== undefined ? (-n.y).toFixed(2) : 0]));
        inp += '\n[PATTERNS]\n;ID\tMultipliers\n';
        Object.entries(m.patterns).forEach(([id, vals]) => inp += L([id, ...vals]));
        inp += '\n[END]\n';
        const blob = new Blob([inp], { type: 'text/plain;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Reseau_EPANET_${new Date().toISOString().slice(0, 10)}.inp`;
        a.click();
    }

    newProject() {
        this.model = { title: 'Nouveau projet', junctions: {}, reservoirs: {}, tanks: {},
            pipes: {}, pumps: {}, valves: {}, patterns: {}, curves: {}, coordinates: {},
            vertices: {}, labels: {}, options: { headloss: 'H-W', units: 'LPS' }, nodes: {}, links: {} };
        this.isSimulated = false;
        this.simResults = null;
        this.selected = null;
        this.closeProperties();
        this.updateCounts();
        this.renderNetwork();
        this.showEmptyHint();
        const nameEl = document.getElementById('ep2-model-name');
        if (nameEl) nameEl.textContent = 'Nouveau projet';
    }

    /** Invite centrale « Ouvrir un .INP » quand le schéma est vide */
    showEmptyHint() {
        let hint = document.getElementById('ep2-empty-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'ep2-empty-hint';
            hint.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
                'background:#fff;z-index:5;font-family:Tahoma;text-align:center;padding:20px;cursor:pointer;';
            hint.innerHTML = `
                <div style="font-size:44px;margin-bottom:12px;">🜁</div>
                <div style="font-size:22px;font-weight:bold;color:#0a246a;margin-bottom:6px;">Aucun réseau chargé</div>
                <div style="font-size:14px;color:#333;max-width:460px;line-height:1.6;">
                    Ouvrez un fichier <b>.INP</b> (Fichier → Ouvrir) ou déposez-le ici pour modéliser et simuler
                    le réseau hydraulique comme dans EPANET 2.
                </div>
                <div style="margin-top:14px;">
                    <button class="ep2-btn" style="font-size:13px;padding:7px 22px;">📂 Ouvrir un fichier .INP</button>
                </div>
                <div style="margin-top:12px;font-size:12px;color:#666;">Puis cliquez sur ⚡ pour lancer le calcul hydraulique 24h.</div>`;
            const body = document.getElementById('ep2-mapbody');
            if (body) {
                body.appendChild(hint);
                hint.addEventListener('click', () => this.triggerImport());
            }
        }
        hint.style.display = 'flex';
    }

    hideEmptyHint() {
        const hint = document.getElementById('ep2-empty-hint');
        if (hint) hint.style.display = 'none';
    }

    saveJson() {
        if (!this.model) return;
        const blob = new Blob([JSON.stringify(this.model, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'projet_epanet.json';
        a.click();
    }

    /** Compatibilité app.js : appelé quand une simulation SCADA arrive */
    updateData(schedule, results, system_data) {
        // Stocker les résultats de simulation pour affichage
        if (results) {
            this.lastExternalResults = results;
            this.lastSchedule = schedule;
            this.lastSystemData = system_data;
        }
        // Lancer le calcul hydraulique interne
        this.runHydraulicSimulation(false);
    }

    /* ==================== MODÈLES PRÉDÉFINIS ==================== */
    loadPreset(key) {
        this.model = null;
        this.simResults = null;
        this.isSimulated = false;
        this.selected = null;
        this.closeProperties();
        if (key === 'net1') this.model = this.createNet1Model();
        else if (key === 'hanoi') this.model = this.createHanoiModel();
        else this.model = this.createLeKefModel();
        this.normalizeCoordinates();
        const nameEl = document.getElementById('ep2-model-name');
        if (nameEl) nameEl.textContent = this.model.title || 'Modèle EPANET';
        this.updateCounts();
        this.renderNetwork();
        this.fitBounds();
        this.renderLegends();
        this.setHour(0);
        const st = document.getElementById('ep2-st-sim');
        if (st) { st.textContent = 'Calcul : en attente'; st.style.color = ''; }
    }

    normalizeCoordinates() {
        const m = this.model;
        if (!m || !m.nodes) return;
        const missing = Object.values(m.nodes).filter(n => n.x === undefined);
        if (!missing.length) return;
        const withPos = Object.values(m.nodes).filter(n => n.x !== undefined);
        const minX = withPos.length ? Math.min(...withPos.map(n => n.x)) : 0;
        const maxX = withPos.length ? Math.max(...withPos.map(n => n.x)) : 100;
        const minY = withPos.length ? Math.min(...withPos.map(n => n.y)) : 0;
        const maxY = withPos.length ? Math.max(...withPos.map(n => n.y)) : 100;
        const spanX = Math.max(100, maxX - minX);
        missing.forEach((n, i) => {
            const col = i % 4, row = Math.floor(i / 4) % 6;
            n.x = minX + spanX * (0.15 + 0.7 * col / 3);
            n.y = minY + (maxY - minY || 100) * (0.15 + 0.7 * row / 5);
        });
    }

    _finalize(m) {
        m.nodes = m.nodes || {};
        m.links = m.links || {};
        Object.entries(m.junctions).forEach(([k, v]) => m.nodes[k] = { ...v, type: 'junction', ...m.coordinates[k] });
        Object.entries(m.reservoirs).forEach(([k, v]) => m.nodes[k] = { ...v, type: 'reservoir', ...m.coordinates[k] });
        Object.entries(m.tanks).forEach(([k, v]) => m.nodes[k] = { ...v, type: 'tank', ...m.coordinates[k] });
        Object.entries(m.pipes).forEach(([k, v]) => m.links[k] = { ...v, type: 'pipe' });
        Object.entries(m.pumps).forEach(([k, v]) => m.links[k] = { ...v, type: 'pump' });
        Object.entries(m.valves).forEach(([k, v]) => m.links[k] = { ...v, type: 'valve' });
        return m;
    }

    createLeKefModel() {
        const pat1 = [0.8,0.7,0.6,0.6,0.7,0.9,1.2,1.4,1.3,1.2,1.1,1.0,1.1,1.2,1.1,1.0,1.1,1.3,1.5,1.4,1.2,1.0,0.9,0.8];
        const m = {
            title: 'Réseau AEP — Le Kef 24h',
            junctions: {
                'J_E1': { id: 'J_E1', elev: 620, baseDemand: 110, pattern: '1' },
                'J_E2': { id: 'J_E2', elev: 680, baseDemand: 65, pattern: '1' },
                'J_E3': { id: 'J_E3', elev: 730, baseDemand: 45, pattern: '1' },
                'J_E4': { id: 'J_E4', elev: 590, baseDemand: 75, pattern: '1' },
                'J_E5': { id: 'J_E5', elev: 540, baseDemand: 80, pattern: '1' },
                'J_E6': { id: 'J_E6', elev: 710, baseDemand: 35, pattern: '1' },
                'J_E7': { id: 'J_E7', elev: 770, baseDemand: 25, pattern: '1' },
                'PMP1n': { id: 'PMP1n', elev: 530, baseDemand: 0, pattern: '' },
            },
            reservoirs: { 'Forage_Ain_Bidha': { id: 'Forage_Ain_Bidha', head: 520 } },
            tanks: {
                'Reservoir_Kef': { id: 'Reservoir_Kef', elev: 700, initLevel: 4, minLevel: 1, maxLevel: 8, diam: 25 },
            },
            pipes: {
                'P1': { id: 'P1', from: 'Forage_Ain_Bidha', to: 'J_E5', length: 1200, diam: 400, roughness: 130, status: 'OPEN' },
                'P2': { id: 'P2', from: 'J_E5', to: 'PMP1n', length: 300, diam: 350, roughness: 130, status: 'OPEN' },
                'P4': { id: 'P4', from: 'Reservoir_Kef', to: 'J_E1', length: 900, diam: 300, roughness: 130, status: 'OPEN' },
                'P5': { id: 'P5', from: 'J_E1', to: 'J_E2', length: 700, diam: 250, roughness: 130, status: 'OPEN' },
                'P6': { id: 'P6', from: 'J_E2', to: 'J_E3', length: 650, diam: 200, roughness: 130, status: 'OPEN' },
                'P7': { id: 'P7', from: 'J_E3', to: 'J_E6', length: 500, diam: 150, roughness: 130, status: 'OPEN' },
                'P8': { id: 'P8', from: 'J_E6', to: 'J_E7', length: 600, diam: 150, roughness: 130, status: 'OPEN' },
                'P9': { id: 'P9', from: 'J_E1', to: 'J_E4', length: 800, diam: 250, roughness: 130, status: 'OPEN' },
                'P10': { id: 'P10', from: 'J_E4', to: 'J_E5', length: 750, diam: 250, roughness: 130, status: 'OPEN' },
            },
            pumps: { 'PMP1': { id: 'PMP1', from: 'PMP1n', to: 'Reservoir_Kef', power: 65, status: 'OPEN' } },
            valves: { 'VLV1': { id: 'VLV1', from: 'Reservoir_Kef', to: 'J_E1', diam: 300, vtype: 'FCV', setting: 120, status: 'OPEN' } },
            patterns: { '1': pat1 },
            coordinates: {
                'Forage_Ain_Bidha': { x: 100, y: 400 },
                'J_E5': { x: 320, y: 420 },
                'PMP1n': { x: 480, y: 430 },
                'Reservoir_Kef': { x: 700, y: 380 },
                'J_E1': { x: 900, y: 300 },
                'J_E2': { x: 1080, y: 240 },
                'J_E3': { x: 1250, y: 180 },
                'J_E6': { x: 1420, y: 130 },
                'J_E7': { x: 1580, y: 90 },
                'J_E4': { x: 920, y: 430 },
            },
            labels: {
                'TXT1': { id: 'TXT1', x: 640, y: 330, text: 'RÉSERVOIR' },
                'TXT2': { id: 'TXT2', x: 430, y: 470, text: 'POMPE' },
            },
            nodes: {}, links: {},
            options: { headloss: 'H-W', units: 'LPS' },
        };
        return this._finalize(m);
    }

    createNet1Model() {
        const pat1 = [1.0,1.0,1.0,1.0,0.8,0.8,1.1,1.2,1.2,1.1,1.1,1.0,1.0,1.0,1.1,1.2,1.3,1.4,1.4,1.3,1.2,1.1,1.0,1.0];
        const m = {
            title: 'EPANET Net1 (Exemple EPA)',
            junctions: {
                '2': { id: '2', elev: 710, baseDemand: 0, pattern: '1' },
                '3': { id: '3', elev: 710, baseDemand: 150, pattern: '1' },
                '4': { id: '4', elev: 700, baseDemand: 150, pattern: '1' },
                '5': { id: '5', elev: 695, baseDemand: 100, pattern: '1' },
                '6': { id: '6', elev: 695, baseDemand: 100, pattern: '1' },
                '7': { id: '7', elev: 700, baseDemand: 150, pattern: '1' },
            },
            reservoirs: { '9': { id: '9', head: 790 } },
            tanks: { '8': { id: '8', elev: 710, initLevel: 5, minLevel: 0, maxLevel: 10, diam: 50 } },
            pipes: {
                '10': { id: '10', from: '8', to: '2', length: 5318, diam: 400, roughness: 100, status: 'OPEN' },
                '11': { id: '11', from: '2', to: '3', length: 5181, diam: 300, roughness: 100, status: 'OPEN' },
                '12': { id: '12', from: '3', to: '4', length: 5181, diam: 300, roughness: 100, status: 'OPEN' },
                '13': { id: '13', from: '4', to: '5', length: 5181, diam: 250, roughness: 100, status: 'OPEN' },
                '14': { id: '14', from: '5', to: '6', length: 5181, diam: 250, roughness: 100, status: 'OPEN' },
                '15': { id: '15', from: '6', to: '7', length: 5181, diam: 250, roughness: 100, status: 'OPEN' },
                '110': { id: '110', from: '2', to: '7', length: 5181, diam: 300, roughness: 100, status: 'OPEN' },
                '111': { id: '111', from: '9', to: '2', length: 1447, diam: 400, roughness: 100, status: 'OPEN' },
            },
            pumps: { '9': { id: '9', from: '9', to: '2', power: 75, status: 'OPEN' } },
            valves: {},
            patterns: { '1': pat1 },
            coordinates: {
                '9': { x: 100, y: 300 }, '2': { x: 350, y: 300 }, '3': { x: 600, y: 300 },
                '4': { x: 850, y: 300 }, '5': { x: 850, y: 500 }, '6': { x: 600, y: 500 },
                '7': { x: 350, y: 500 }, '8': { x: 100, y: 500 },
            },
            labels: {},
            nodes: {}, links: {},
            options: { headloss: 'H-W', units: 'LPS' },
        };
        return this._finalize(m);
    }

    createHanoiModel() {
        const m = {
            title: 'Hanoi Water Supply Network',
            junctions: {
                'N2': { id: 'N2', elev: 10, baseDemand: 890 },
                'N3': { id: 'N3', elev: 10, baseDemand: 850 },
                'N4': { id: 'N4', elev: 10, baseDemand: 130 },
                'N5': { id: 'N5', elev: 10, baseDemand: 725 },
                'N6': { id: 'N6', elev: 10, baseDemand: 1005 },
                'N7': { id: 'N7', elev: 10, baseDemand: 1350 },
                'N8': { id: 'N8', elev: 10, baseDemand: 550 },
            },
            reservoirs: { 'Source_Hanoi': { id: 'Source_Hanoi', head: 100 } },
            tanks: {},
            pipes: {
                'P1': { id: 'P1', from: 'Source_Hanoi', to: 'N2', length: 100, diam: 1000, roughness: 130, status: 'OPEN' },
                'P2': { id: 'P2', from: 'N2', to: 'N3', length: 950, diam: 1000, roughness: 130, status: 'OPEN' },
                'P3': { id: 'P3', from: 'N3', to: 'N4', length: 1200, diam: 900, roughness: 130, status: 'OPEN' },
                'P4': { id: 'P4', from: 'N4', to: 'N5', length: 1000, diam: 800, roughness: 130, status: 'OPEN' },
                'P5': { id: 'P5', from: 'N5', to: 'N6', length: 800, diam: 700, roughness: 130, status: 'OPEN' },
                'P6': { id: 'P6', from: 'N6', to: 'N7', length: 1100, diam: 600, roughness: 130, status: 'OPEN' },
                'P7': { id: 'P7', from: 'N7', to: 'N8', length: 900, diam: 500, roughness: 130, status: 'OPEN' },
            },
            pumps: {}, valves: {},
            patterns: { '1': Array(24).fill(1.0) },
            coordinates: {
                'Source_Hanoi': { x: 120, y: 300 },
                'N2': { x: 320, y: 300 }, 'N3': { x: 520, y: 300 }, 'N4': { x: 720, y: 300 },
                'N5': { x: 920, y: 300 }, 'N6': { x: 1120, y: 300 }, 'N7': { x: 1320, y: 300 },
                'N8': { x: 1520, y: 300 },
            },
            labels: {},
            nodes: {}, links: {},
            options: { headloss: 'H-W', units: 'LPS' },
        };
        return this._finalize(m);
    }
}
