/**
 * AquaData Studio v5.0 — Module Cartographie SIG Hydraulique & Google Earth KML
 * Visualisation Leaflet multi-couches, import/export KML / KMZ / GeoJSON,
 * suppression automatique et complète des anciens éléments lors de l'import KML,
 * personnalisation dynamique des symboles et couleurs/épaisseurs des conduites,
 * tableau interactif de gestion des couches avec masquage (👁️) et suppression (🗑️),
 * tracé de canalisations avec calcul de distance géodésique en direct.
 */

export class GisMapViewer {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.options = options;
        this.map = null;
        this.tileLayers = {};
        this.currentBaseLayer = 'dark';
        this.featuresLayer = null;
        this.drawLayer = null;
        this.networkData = [];
        this.drawingMode = null; // null | 'point' | 'polyline' | 'measure'
        this.drawnPoints = [];
        this.tempLine = null;
        this.measurePoints = [];
        this.measureLine = null;
        this.measureTooltip = null;
        
        // Symbology & Style settings
        this.selectedSymbolType = 'well';
        this.pipeColor = '#06b6d4';
        this.pipeWeight = 4;
        this.pipeDash = 'solid';
        this.pointColor = '#38bdf8';
        this.pipeMaterial = 'Fonte';
        this.pipeRoughness = 0.26;
        this._snapMarker = null;
        this._vertexLayer = null;

        this.init();
    }

    async init() {
        if (!this.container) return;
        this.renderShell();
        this.initLeafletMap();
    }

    renderShell() {
        this.container.innerHTML = `
            <div class="gis-studio-wrapper">
                <!-- GIS Top Bar -->
                <div class="gis-toolbar-main">
                    <div class="gis-toolbar-left">
                        <div class="gis-brand-title">
                            <span class="gis-brand-icon">🗺️</span>
                            <div>
                                <strong id="gis-header-title">SIG Réseau Hydraulique — Le Kef & Google Earth KML</strong>
                                <small id="gis-header-sub">Système d'Information Géographique, Éditeur de Tracés & Export KML</small>
                            </div>
                        </div>

                        <!-- Basemap Switcher -->
                        <div class="gis-basemap-group">
                            <button class="btn-gis-layer active" data-layer="dark" title="SCADA Sombre (CartoDB)">🌑 SCADA Sombre</button>
                            <button class="btn-gis-layer" data-layer="satellite" title="Satellite HD (ESRI World Imagery)">🛰️ Satellite HD</button>
                            <button class="btn-gis-layer" data-layer="osm" title="OpenStreetMap Standard">🗺️ OpenStreetMap</button>
                            <button class="btn-gis-layer" data-layer="topo" title="Topographie & Relief">⛰️ Topo Relief</button>
                        </div>
                    </div>

                    <div class="gis-toolbar-right">
                        <input type="file" id="gis-file-input" accept=".kml,.kmz,.geojson,.json" style="display:none;">
                        <button id="gis-btn-import-kml" class="btn-scada btn-primary-glow" title="Importer un fichier KML, KMZ ou GeoJSON (remplace le réseau actuel)">
                            📂 Importer KML / GeoJSON
                        </button>
                        <button id="gis-btn-export-kml" class="btn-scada" title="Exporter au format KML Google Earth">
                            🌍 Exporter KML Google Earth
                        </button>
                        <button id="gis-btn-export-geojson" class="btn-scada" title="Exporter au format GeoJSON">
                            💾 Exporter GeoJSON
                        </button>
                        <button id="gis-btn-reload-default" class="btn-scada" title="Recharger le réseau standard Le Kef AEP">
                            💧 Réseau Le Kef
                        </button>
                        <button id="gis-btn-fit" class="btn-scada" title="Recadrer sur le réseau">
                            ⛶ Recadrer
                        </button>
                    </div>
                </div>

                <!-- GIS Editing & Tooling Ribbon -->
                <div class="gis-tools-ribbon">
                    <!-- Symbology Palette -->
                    <div class="gis-symbology-palette">
                        <span class="palette-title">Symbole :</span>
                        <button class="btn-symbol active" data-sym="well" title="Forage / Captation">💧 Forage</button>
                        <button class="btn-symbol" data-sym="reservoir" title="Réservoir / Bâche">🏛️ Réservoir</button>
                        <button class="btn-symbol" data-sym="pump" title="Station de pompage">⚡ Station</button>
                        <button class="btn-symbol" data-sym="valve" title="Vanne / Régulateur">🚪 Vanne</button>
                        <button class="btn-symbol" data-sym="demand" title="Zone de distribution">🏘️ Demande</button>
                    </div>

                    <!-- Customizer Style for Pipes & Lines -->
                    <div style="display:flex; align-items:center; gap:0.5rem; background:rgba(0,0,0,0.35); padding:4px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
                        <span style="font-size:0.75rem; color:var(--text-muted);">Conduites :</span>
                        <select id="gis-pipe-color" class="scada-select-sm" style="padding:2px 6px;">
                            <option value="#06b6d4" selected>🔵 Cyan (#06b6d4)</option>
                            <option value="#f472b6">🌸 Rose (#f472b6)</option>
                            <option value="#fb923c">🟠 Orange Vif (#fb923c)</option>
                            <option value="#3b82f6">🔷 Bleu Roi (#3b82f6)</option>
                            <option value="#10b981">🟢 Émeraude (#10b981)</option>
                            <option value="#f59e0b">🟠 Orange (#f59e0b)</option>
                            <option value="#ef4444">🔴 Rouge (#ef4444)</option>
                            <option value="#8b5cf6">🟣 Violet (#8b5cf6)</option>
                            <option value="#eab308">🟡 Or (#eab308)</option>
                        </select>
                        <select id="gis-pipe-material" class="scada-select-sm" style="padding:2px 6px;">
                            <option value="Fonte" selected>🧷 Fonte</option>
                            <option value="Acier">⚙️ Acier</option>
                            <option value="Amiante-Ciment">⬜ Amiante-Ciment</option>
                            <option value="Béton">🏗️ Béton</option>
                            <option value="PEHD">🌀 PEHD</option>
                            <option value="PVC">🧴 PVC</option>
                            <option value="Inox">🔩 Inox</option>
                        </select>
                        <select id="gis-pipe-weight" class="scada-select-sm" style="padding:2px 6px;">
                            <option value="2">2 px (Fin)</option>
                            <option value="4" selected>4 px (Moyen)</option>
                            <option value="6">6 px (Épais)</option>
                            <option value="8">8 px (Large)</option>
                        </select>
                    </div>

                    <!-- Action Tools -->
                    <div class="gis-action-tools">
                        <button id="gis-btn-add-point" class="btn-scada-sm btn-secondary" title="Placer un symbole sur la carte">
                            📍 Placer Point
                        </button>
                        <button id="gis-btn-draw-pipe" class="btn-scada-sm btn-primary" title="Tracer une nouvelle canalisation avec calcul de distance">
                            ✏️ Tracer Conduite
                        </button>
                        <button id="gis-btn-measure" class="btn-scada-sm btn-secondary" title="Mesurer une distance sur la carte">
                            📏 Mesurer
                        </button>
                        <button id="gis-btn-pan" class="btn-scada-sm btn-secondary active" title="Mode déplacement : glisser la carte avec la souris">
                            ✥ Déplacer
                        </button>
                        <button id="gis-btn-zoom-in" class="btn-scada-sm btn-secondary" title="Zoom avant (ou molette souris)">
                            🔍➕
                        </button>
                        <button id="gis-btn-zoom-out" class="btn-scada-sm btn-secondary" title="Zoom arrière (ou molette souris)">
                            🔍➖
                        </button>
                        <button id="gis-btn-clear-draw" class="btn-scada-sm btn-danger" title="Effacer les tracés temporaires" style="display:none;">
                            ✕ Annuler
                        </button>
                    </div>

                    <!-- Live Coordinate & Measurement Display -->
                    <div class="gis-live-info">
                        <span id="gis-cursor-coords">Lat: 36.1780° · Lng: 8.7180°</span>
                        <span id="gis-distance-badge" class="gis-dist-badge" style="display:none;">Distance : <strong>0.00 km</strong></span>
                    </div>
                </div>

                <!-- Main GIS Canvas & Layers Viewport -->
                <div class="gis-viewport-wrapper" style="height: 600px; position: relative;">
                    <div id="gis-leaflet-map" class="gis-leaflet-map" style="height: 100%; width: 100%;"></div>

                    <!-- Panneau vertical compact repliable : Filtres + Légende (n'obstrue pas la carte) -->
                    <div class="gis-side-panel" id="gis-side-panel">
                        <button type="button" class="gsp-toggle" id="gsp-toggle-btn" title="Replier / Déplier (🖱️ molette = zoom · glisser = déplacer)">
                            <span class="gsp-toggle-icon" id="gsp-toggle-icon">◂</span>
                            <span class="gsp-toggle-label">Couches</span>
                        </button>
                        <div class="gsp-body" id="gsp-body">
                            <div class="gsp-section-title">🔦 Filtres Couches</div>
                            <label class="gsp-filter"><input type="checkbox" id="chk-layer-wells" checked> <span class="gsp-dot" style="background:#38bdf8;"></span> Forages & Sources</label>
                            <label class="gsp-filter"><input type="checkbox" id="chk-layer-reservoirs" checked> <span class="gsp-dot" style="background:#818cf8;"></span> Réservoirs & Bâches</label>
                            <label class="gsp-filter"><input type="checkbox" id="chk-layer-pipes" checked> <span class="gsp-dot" style="background:#f472b6;"></span> Canalisations & Tracés</label>
                            <label class="gsp-filter"><input type="checkbox" id="chk-layer-demands" checked> <span class="gsp-dot" style="background:#fb923c;"></span> Zones de Distribution</label>
                            <div class="gsp-sep"></div>
                            <div class="gsp-section-title">🧭 Légende</div>
                            <div class="gsp-legend-row"><span class="gsp-swatch" style="background:#f472b6;"></span> Conduite Rose · DN 250</div>
                            <div class="gsp-legend-row"><span class="gsp-swatch" style="background:#fb923c;"></span> Conduite Orange · DN 300</div>
                            <div class="gsp-legend-row"><span class="gsp-swatch" style="background:#06b6d4;"></span> Conduite Cyan · DN 400</div>
                            <div class="gsp-sep"></div>
                            <div class="gsp-legend-row"><span>💧</span> Forage / Captation</div>
                            <div class="gsp-legend-row"><span>🏛️</span> Réservoir / Bâche</div>
                            <div class="gsp-legend-row"><span>⚡</span> Station / Pompe</div>
                            <div class="gsp-legend-row"><span>🚪</span> Vanne / Régulateur</div>
                            <div class="gsp-legend-row"><span>🏘️</span> Zone de Demande</div>
                            <div class="gsp-hint">🖱️ Molette = zoom · Glisser = déplacer</div>
                        </div>
                    </div>
                </div>

                <!-- Attribute & Elements Table Card -->
                <div class="scada-card gis-table-card" style="padding: 1.25rem; margin-top: 0.5rem; background: rgba(18,20,48,0.75);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h4 style="margin: 0; font-size: 0.95rem;">
                            📋 Table des Ouvrages & Canalisations Réseau (<span id="gis-feature-count">0</span> éléments)
                        </h4>
                        <div style="display:flex; gap:0.5rem;">
                            <input type="text" id="gis-filter-input" placeholder="🔍 Filtrer par nom..." class="scada-input-sm" style="width:180px;">
                            <button id="gis-btn-clear-all" class="btn-scada-mini" style="color:#f87171;" title="Vider toute la carte">🗑️ Tout Effacer</button>
                        </div>
                    </div>

                    <div style="max-height: 280px; overflow-y: auto;">
                        <table class="scada-table">
                            <thead>
                                <tr>
                                    <th>N°</th>
                                    <th>Affichage</th>
                                    <th>Type</th>
                                    <th>Nom de l'Ouvrage</th>
                                    <th>Coordonnées / Longueur</th>
                                    <th>Diamètre / Altitude</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="gis-attribute-table-body"></tbody>
                        </table>
                    </div>
                </div>

                <!-- GIS Footer -->
                <div class="gis-footer-strip">
                    <span id="gis-footer-status">Système Cartographique SIG · Projection EPSG:4326 (WGS84)</span>
                    <span>Format d'Export : KML 2.2 Google Earth & GeoJSON</span>
                </div>

                <!-- Racine des modales SIG (éditeur conduite, profil longitudinal) -->
                <div id="gis-modal-root"></div>
            </div>
        `;
    }

    initLeafletMap() {
        if (typeof L === 'undefined') {
            console.warn("Leaflet library not loaded.");
            return;
        }

        // Interactions naturelles et fluides : glisser = déplacer, molette = zoom,
        // double-clic = zoom avant, inertie douce pour un rendu professionnel.
        this.map = L.map('gis-leaflet-map', {
            center: [36.1780, 8.7180],
            zoom: 12,
            zoomControl: true,
            preferCanvas: true,
            zoomSnap: 0.25,
            zoomDelta: 0.5,
            wheelDebounceTime: 20,
            wheelPxPerZoomLevel: 80,
            inertia: true,
            inertiaDeceleration: 3000,
            inertiaMaxSpeed: 2000,
            fadeAnimation: true,
            zoomAnimation: true,
            markerZoomAnimation: true,
            dragging: true,
            tap: true,
            doubleClickZoom: true,
            scrollWheelZoom: true,
            touchZoom: true,
            boxZoom: true,
            keyboard: true
        });

        // 4 Multi-basemaps
        this.tileLayers.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CartoDB &copy; OpenStreetMap',
            maxZoom: 19
        }).addTo(this.map);

        this.tileLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; ESRI World Imagery',
            maxZoom: 18
        });

        this.tileLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        });

        this.tileLayers.topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenTopoMap',
            maxZoom: 17
        });

        this.featuresLayer = L.layerGroup().addTo(this.map);
        this.drawLayer = L.layerGroup().addTo(this.map);

        this.bindGisEvents();
        this.loadDefaultLeKefNetwork();
    }

    bindGisEvents() {
        // Basemap Switching
        this.container.querySelectorAll('.btn-gis-layer').forEach(btn => {
            btn.addEventListener('click', () => {
                this.container.querySelectorAll('.btn-gis-layer').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const layerKey = btn.dataset.layer;
                if (this.tileLayers[layerKey] && this.currentBaseLayer !== layerKey) {
                    this.map.removeLayer(this.tileLayers[this.currentBaseLayer]);
                    this.tileLayers[layerKey].addTo(this.map);
                    this.currentBaseLayer = layerKey;
                }
            });
        });

        // Symbology Palette
        this.container.querySelectorAll('.btn-symbol').forEach(btn => {
            btn.addEventListener('click', () => {
                this.container.querySelectorAll('.btn-symbol').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedSymbolType = btn.dataset.sym;
            });
        });

        // Pipe Styling Customizer (Live during drawing and for default/imported pipes)
        const updatePipeLiveStyle = () => {
            if (this.tempLine) {
                this.tempLine.setStyle({ color: this.pipeColor, weight: this.pipeWeight });
            }
            this.renderAllFeatures();
        };

        const pipeColorInput = document.getElementById('gis-pipe-color');
        pipeColorInput?.addEventListener('input', (e) => {
            this.pipeColor = e.target.value;
            updatePipeLiveStyle();
        });
        pipeColorInput?.addEventListener('change', (e) => {
            this.pipeColor = e.target.value;
            updatePipeLiveStyle();
        });

        const pipeWeightInput = document.getElementById('gis-pipe-weight');
        pipeWeightInput?.addEventListener('input', (e) => {
            this.pipeWeight = parseInt(e.target.value, 10) || 4;
            updatePipeLiveStyle();
        });
        pipeWeightInput?.addEventListener('change', (e) => {
            this.pipeWeight = parseInt(e.target.value, 10) || 4;
            updatePipeLiveStyle();
        });

        const pipeMaterialInput = document.getElementById('gis-pipe-material');
        pipeMaterialInput?.addEventListener('change', (e) => {
            this.pipeMaterial = e.target.value;
            this.renderAllFeatures();
            this.renderAttributeTable();
        });

        // Layer Filter Checkboxes
        ['chk-layer-wells', 'chk-layer-reservoirs', 'chk-layer-pipes', 'chk-layer-demands'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.renderAllFeatures());
        });

        // Panneau latéral vertical repliable (filtres + légende)
        document.getElementById('gsp-toggle-btn')?.addEventListener('click', () => {
            const panel = document.getElementById('gis-side-panel');
            if (!panel) return;
            panel.classList.toggle('collapsed');
            const icon = document.getElementById('gsp-toggle-icon');
            if (icon) icon.textContent = panel.classList.contains('collapsed') ? '▸' : '◂';
        });

        // Search Filter
        document.getElementById('gis-filter-input')?.addEventListener('input', (e) => {
            this.renderAttributeTable(e.target.value.trim().toLowerCase());
        });

        // Reload Default Network
        document.getElementById('gis-btn-reload-default')?.addEventListener('click', () => {
            this.loadDefaultLeKefNetwork();
        });

        // Clear All
        document.getElementById('gis-btn-clear-all')?.addEventListener('click', () => {
            if (confirm("Supprimer tous les éléments affichés sur la carte ?")) {
                this.networkData = [];
                this.renderAllFeatures();
                this.renderAttributeTable();
            }
        });

        // Action Buttons
        document.getElementById('gis-btn-add-point')?.addEventListener('click', () => this.startDrawing('point'));
        document.getElementById('gis-btn-draw-pipe')?.addEventListener('click', () => this.startDrawing('polyline'));
        document.getElementById('gis-btn-measure')?.addEventListener('click', () => this.startDrawing('measure'));
        document.getElementById('gis-btn-pan')?.addEventListener('click', () => this.activatePanMode());
        document.getElementById('gis-btn-zoom-in')?.addEventListener('click', () => this.map?.zoomIn());
        document.getElementById('gis-btn-zoom-out')?.addEventListener('click', () => this.map?.zoomOut());
        document.getElementById('gis-btn-clear-draw')?.addEventListener('click', () => this.activatePanMode());
        document.getElementById('gis-btn-fit')?.addEventListener('click', () => this.fitBounds());

        // File Import / Export
        const fileInput = document.getElementById('gis-file-input');
        document.getElementById('gis-btn-import-kml')?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) this.handleFileImport(e.target.files[0]);
        });
        document.getElementById('gis-btn-export-kml')?.addEventListener('click', () => this.exportKml());
        document.getElementById('gis-btn-export-geojson')?.addEventListener('click', () => this.exportGeoJson());

        // Mouse Move on Map: coordinates, aperçu conduit fluide + aimantation
        this.map.on('mousemove', (e) => {
            const coordSpan = document.getElementById('gis-cursor-coords');
            if (coordSpan) {
                coordSpan.textContent = `Lat: ${e.latlng.lat.toFixed(4)}° · Lng: ${e.latlng.lng.toFixed(4)}°`;
            }

            if (this.drawingMode === 'polyline' && this.drawnPoints.length > 0) {
                // Aimantation (snap) vers les ouvrages / sommets existants pour un placement précis
                const snapped = this.nearestSnappedPoint(e.latlng);
                const end = snapped || e.latlng;
                const previewPoints = [...this.drawnPoints, end];
                if (this.tempLine && this.drawLayer.hasLayer) { try { this.drawLayer.removeLayer(this.tempLine); } catch (_) {} }
                this.tempLine = L.polyline(previewPoints, {
                    color: this.pipeColor,
                    weight: this.pipeWeight,
                    dashArray: '7 6',
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round'
                }).addTo(this.drawLayer);
                const dist = this.calculatePolylineDistance(previewPoints);
                this.updateDistanceBadge(dist);
                this.renderVertexMarkers(this.drawnPoints);
                this.updateSnapIndicator(snapped);
            } else if (this.drawingMode === 'measure' && this.measurePoints.length > 0) {
                // Aperçu élastique (rubber band) pour la mesure : distance temps réel + snap
                const snapped = this.nearestSnappedPoint(e.latlng);
                const end = snapped || e.latlng;
                const previewPoints = [...this.measurePoints, end];
                if (this.tempLine && this.drawLayer.hasLayer) { try { this.drawLayer.removeLayer(this.tempLine); } catch (_) {} }
                this.tempLine = L.polyline(previewPoints, {
                    color: '#fbbf24',
                    weight: 2.5,
                    dashArray: '4 6',
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round'
                }).addTo(this.drawLayer);
                const dist = this.calculatePolylineDistance(previewPoints);
                this.updateDistanceBadge(dist);
            }
        });

        // Clique simple : uniquement pour placer / tracer — JAMAIS pour déplacer la carte
        this.map.on('click', (e) => {
            if (this.drawingMode === 'point') {
                this.addPointFeature(e.latlng, this.selectedSymbolType);
                this.cancelDrawing();
            } else if (this.drawingMode === 'polyline') {
                const snapped = this.nearestSnappedPoint(e.latlng);
                this.drawnPoints.push(snapped || e.latlng);
                this.renderVertexMarkers(this.drawnPoints);
                if (snapped) this.updateSnapIndicator(snapped);
            } else if (this.drawingMode === 'measure') {
                const snapped = this.nearestSnappedPoint(e.latlng);
                this.measurePoints.push(snapped || e.latlng);
                this.renderVertexMarkers(this.measurePoints);
                if (this.measurePoints.length >= 2) {
                    if (this.measureLine) this.drawLayer.removeLayer(this.measureLine);
                    this.measureLine = L.polyline(this.measurePoints, { color: '#fb923c', weight: 3, dashArray: '1 7', lineCap: 'round', lineJoin: 'round' }).addTo(this.drawLayer);
                    const dist = this.calculatePolylineDistance(this.measurePoints);
                    this.updateDistanceBadge(dist);
                }
            }
        });

        // Double-clic : termine le tracé / la mesure en cours de dessin (sinon zoom Leaflet natif)
        this.map.on('dblclick', (e) => {
            if (this.drawingMode === 'polyline' && this.drawnPoints.length >= 2) {
                L.DomEvent.stop(e);
                this.finishPolyline();
                return;
            }
            if (this.drawingMode === 'measure' && this.measurePoints.length >= 2) {
                L.DomEvent.stop(e);
                this.finishMeasure();
                return;
            }
            if (this.drawingMode) {
                L.DomEvent.stop(e);
                this.cancelDrawing();
            }
        });

        // Clic droit : terminer la conduite ou la mesure en cours
        this.map.on('contextmenu', (e) => {
            L.DomEvent.stop(e);
            if (this.drawingMode === 'polyline' && this.drawnPoints.length >= 2) this.finishPolyline();
            else if (this.drawingMode === 'measure' && this.measurePoints.length >= 2) this.finishMeasure();
        });

        // Clavier : Entrée = terminer le tracé, Échap = annuler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.drawingMode === 'polyline' && this.drawnPoints.length >= 2) { this.finishPolyline(); }
            if (e.key === 'Enter' && this.drawingMode === 'measure' && this.measurePoints.length >= 2) { this.finishMeasure(); }
            if (e.key === 'Escape') this.cancelDrawing();
        });
    }

    _setActiveToolBtn(btnId) {
        ['gis-btn-add-point', 'gis-btn-draw-pipe', 'gis-btn-measure', 'gis-btn-pan'].forEach(id => {
            document.getElementById(id)?.classList.toggle('active', id === btnId);
        });
    }

    /** Mode déplacement : aucun tracé actif, la carte répond au glisser / molette */
    activatePanMode() {
        this.cancelDrawing();
        this._setActiveToolBtn('gis-btn-pan');
        if (this.map) this.map.getContainer().style.cursor = '';
    }

    startDrawing(mode) {
        this.drawingMode = mode;
        this.drawnPoints = [];
        this.measurePoints = [];
        this.drawLayer.clearLayers();
        this._snapMarker = null;
        document.getElementById('gis-btn-clear-draw').style.display = 'inline-block';
        document.getElementById('gis-distance-badge').style.display = (mode === 'polyline' || mode === 'measure') ? 'inline-block' : 'none';
        this._setActiveToolBtn(mode === 'point' ? 'gis-btn-add-point' : (mode === 'polyline' ? 'gis-btn-draw-pipe' : 'gis-btn-measure'));
        this.map.getContainer().style.cursor = 'crosshair';
    }

    cancelDrawing() {
        this.drawingMode = null;
        this.drawnPoints = [];
        this.measurePoints = [];
        this.drawLayer.clearLayers();
        this._snapMarker = null;
        document.getElementById('gis-btn-clear-draw').style.display = 'none';
        document.getElementById('gis-distance-badge').style.display = 'none';
        this.map.getContainer().style.cursor = '';
    }

    /**
     * Aimantation (snap) : retourne le point le plus proche parmi les ouvrages et
     * les sommets des conduites existantes si il est à moins de 40 px du curseur.
     */
    nearestSnappedPoint(latlng) {
        if (!this.map) return null;
        const targetPx = this.map.latLngToContainerPoint(latlng);
        let best = null, bestDist = 40;
        const candidates = [];
        this.networkData.forEach(f => {
            if (f.visible === false) return;
            if (f.type === 'pipe' && Array.isArray(f.latlngs)) {
                f.latlngs.forEach(ll => candidates.push(L.latLng(ll[0], ll[1])));
            } else if (f.lat != null && f.lng != null) {
                candidates.push(L.latLng(f.lat, f.lng));
            }
        });
        // Sommets déjà posés du tracé en cours (permet de revenir sur un point sans boucle)
        const current = this.drawingMode === 'measure' ? this.measurePoints : this.drawnPoints;
        current.slice(0, -1).forEach(ll => candidates.push(L.latLng(ll)));
        candidates.forEach(ll => {
            const px = this.map.latLngToContainerPoint(ll);
            const d = Math.hypot(px.x - targetPx.x, px.y - targetPx.y);
            if (d < bestDist) { bestDist = d; best = ll; }
        });
        return best;
    }

    /** Marqueurs des sommets posés pendant le tracé (départ orange, suite couleur conduite) */
    renderVertexMarkers(points) {
        if (this._vertexLayer) { try { this._vertexLayer.remove(); } catch (_) { /* noop */ } }
        this._vertexLayer = L.layerGroup().addTo(this.drawLayer);
        points.forEach((pt, i) => {
            L.circleMarker(pt, {
                radius: i === 0 ? 6 : 4.5,
                color: '#fff',
                weight: 2,
                fillColor: i === 0 ? '#fb923c' : this.pipeColor,
                fillOpacity: 1
            }).addTo(this._vertexLayer);
        });
    }

    /** Indicateur visuel d'aimantation (halo rose autour du point accroché) */
    updateSnapIndicator(snapped) {
        if (this._snapMarker) { try { this.drawLayer.removeLayer(this._snapMarker); } catch (_) { /* noop */ } this._snapMarker = null; }
        if (!snapped) return;
        this._snapMarker = L.circleMarker(snapped, {
            radius: 10,
            color: '#fb923c',
            weight: 2.5,
            fillColor: '#f472b6',
            fillOpacity: 0.35,
            dashArray: '4 3'
        }).addTo(this.drawLayer);
    }

    /** Termine le tracé d'une conduite : validation + création de l'ouvrage */
    finishPolyline() {
        if (this.drawingMode !== 'polyline' || this.drawnPoints.length < 2) {
            this.cancelDrawing();
            return;
        }
        const pts = this.drawnPoints.map(p => L.latLng(p.lat, p.lng));
        this.activatePanMode();
        this.addPipeFeature(pts);
    }

    /** Termine la mesure : ligne figée + étiquette de distance sur la carte */
    finishMeasure() {
        if (this.drawingMode !== 'measure' || this.measurePoints.length < 2) {
            this.cancelDrawing();
            return;
        }
        const pts = this.measurePoints.map(p => L.latLng(p.lat, p.lng));
        const dist = this.calculatePolylineDistance(pts);
        this.cancelDrawing();
        // On garde le résultat affiché avec étiquette permanente
        L.polyline(pts, { color: '#fb923c', weight: 3, dashArray: '1 7', lineCap: 'round', lineJoin: 'round' }).addTo(this.drawLayer);
        pts.forEach((pt, i) => L.circleMarker(pt, {
            radius: 4, color: '#fb923c', fillColor: i === 0 ? '#fb923c' : '#fff', fillOpacity: 1
        }).addTo(this.drawLayer));
        const txt = dist >= 1000 ? `${(dist / 1000).toFixed(2)} km` : `${Math.round(dist)} m`;
        L.tooltip({ permanent: true, direction: 'top', className: 'gis-measure-tip' })
            .setLatLng(pts[pts.length - 1])
            .setContent(`📏 ${txt}`)
            .addTo(this.drawLayer);
        this.updateDistanceBadge(dist);
    }

    updateDistanceBadge(distMeters) {
        const badge = document.getElementById('gis-distance-badge');
        if (!badge) return;
        if (distMeters >= 1000) {
            badge.innerHTML = `Distance : <strong>${(distMeters / 1000).toFixed(2)} km</strong> (${Math.round(distMeters)} m)`;
        } else {
            badge.innerHTML = `Distance : <strong>${Math.round(distMeters)} m</strong>`;
        }
    }

    calculatePolylineDistance(latlngs) {
        let total = 0;
        for (let i = 0; i < latlngs.length - 1; i++) {
            total += L.latLng(latlngs[i]).distanceTo(L.latLng(latlngs[i + 1]));
        }
        return total;
    }

    addPointFeature(latlng, type) {
        const typeLabels = {
            well: 'Forage',
            reservoir: 'Réservoir',
            pump: 'Station',
            valve: 'Vanne',
            demand: 'Zone Demande'
        };
        const name = prompt(`Nom du point (${typeLabels[type] || 'Ouvrage'}) :`, `${typeLabels[type] || 'Ouvrage'} #${this.networkData.length + 1}`);
        if (!name) return;

        this.networkData.push({
            id: `pt_${Date.now()}`,
            name,
            type,
            lat: latlng.lat,
            lng: latlng.lng,
            elev: 600,
            visible: true,
            isKml: false
        });

        this.renderAllFeatures();
        this.renderAttributeTable();
    }

    addPipeFeature(latlngs) {
        const dist = this.calculatePolylineDistance(latlngs);
        const name = prompt("Nom de la canalisation :", `Conduite #${this.networkData.filter(d => d.type === 'pipe').length + 1}`);
        if (!name) return;

        this.networkData.push({
            id: `pipe_${Date.now()}`,
            name,
            type: 'pipe',
            latlngs: latlngs.map(ll => [ll.lat, ll.lng]),
            length: dist,
            diam: 300,
            color: this.pipeColor,
            weight: this.pipeWeight,
            material: this.pipeMaterial,
            rough: 0.26,
            visible: true,
            isKml: false
        });

        this.renderAllFeatures();
        this.renderAttributeTable();
    }

    loadDefaultLeKefNetwork() {
        // Clear previous
        this.networkData = [];
        this.featuresLayer?.clearLayers();
        this.drawLayer?.clearLayers();

        document.getElementById('gis-header-title').textContent = "SIG Réseau Hydraulique — Le Kef (AEP Standard)";
        document.getElementById('gis-header-sub').textContent = "12 Forages, 12 Réservoirs, Canalisations d'Adduction & Refoulement";

        this.networkData = [
            // Wells & Sources
            { id: 'F_AIN_BIDHA', name: 'Forage Ain Bidha', type: 'well', lat: 36.1420, lng: 8.6850, elev: 520, visible: true },
            { id: 'SRC_AIN_BIDHA', name: 'Source Ain Bidha', type: 'well', lat: 36.1450, lng: 8.6890, elev: 530, visible: true },
            { id: 'SK10', name: 'Forages SK10 (1-3)', type: 'well', lat: 36.1600, lng: 8.6700, elev: 510, visible: true },
            { id: 'SRC_ROMAINE', name: 'Source Romaine', type: 'well', lat: 36.1820, lng: 8.7100, elev: 630, visible: true },
            { id: 'F1_12_R500', name: 'Champ Forages F1-F12', type: 'well', lat: 36.1250, lng: 8.6500, elev: 490, visible: true },

            // Tanks & Reservoirs
            { id: 'R500', name: 'Réservoir R500 (Abida)', type: 'reservoir', lat: 36.1300, lng: 8.6650, elev: 500, cap: 500, visible: true },
            { id: 'R6', name: 'Bâche R6 (Zaaf/Bir Chagroun)', type: 'reservoir', lat: 36.1650, lng: 8.6950, elev: 560, cap: 600, visible: true },
            { id: 'R1', name: 'Réservoir Central R1', type: 'reservoir', lat: 36.1750, lng: 8.7150, elev: 650, cap: 2500, visible: true },
            { id: 'R2', name: 'Réservoir R2 (Haut)', type: 'reservoir', lat: 36.1850, lng: 8.7250, elev: 710, cap: 500, visible: true },
            { id: 'R3', name: 'Réservoir R3 (Sommet)', type: 'reservoir', lat: 36.1920, lng: 8.7300, elev: 760, cap: 500, visible: true },
            { id: 'R5', name: 'Réservoir R5', type: 'reservoir', lat: 36.1550, lng: 8.7050, elev: 610, cap: 1000, visible: true },
            { id: 'R7', name: 'Réservoir R7', type: 'reservoir', lat: 36.1800, lng: 8.7350, elev: 740, cap: 300, visible: true },
            { id: 'R10', name: 'Réservoir R10 (Crête)', type: 'reservoir', lat: 36.1980, lng: 8.7400, elev: 800, cap: 200, visible: true },

            // Pipes (Adduction Le Kef)
            {
                id: 'PIPE_R500_R6',
                name: 'Adduction R500 → R6 (Abida)',
                type: 'pipe',
                latlngs: [[36.1300, 8.6650], [36.1450, 8.6800], [36.1650, 8.6950]],
                length: 4800,
                diam: 400,
                color: '#06b6d4',
                weight: 4,
                material: 'Fonte',
                rough: 0.26,
                visible: true
            },
            {
                id: 'PIPE_R6_R1',
                name: 'Refoulement R6 → R1 Principal',
                type: 'pipe',
                latlngs: [[36.1650, 8.6950], [36.1700, 8.7050], [36.1750, 8.7150]],
                length: 2600,
                diam: 450,
                color: '#3b82f6',
                weight: 5,
                material: 'Acier',
                rough: 0.15,
                visible: true
            },
            {
                id: 'PIPE_R1_R2',
                name: 'Refoulement R1 → R2',
                type: 'pipe',
                latlngs: [[36.1750, 8.7150], [36.1800, 8.7200], [36.1850, 8.7250]],
                length: 1500,
                diam: 300,
                color: '#10b981',
                weight: 4,
                material: 'PEHD',
                rough: 0.05,
                visible: true
            },
            {
                id: 'PIPE_R1_R3',
                name: 'Refoulement R1 → R3',
                type: 'pipe',
                latlngs: [[36.1750, 8.7150], [36.1850, 8.7220], [36.1920, 8.7300]],
                length: 2200,
                diam: 250,
                color: '#f59e0b',
                weight: 4,
                material: 'PVC',
                rough: 0.06,
                visible: true
            }
        ];

        this.renderAllFeatures();
        this.renderAttributeTable();
        this.fitBounds();
    }

    renderAllFeatures() {
        if (!this.featuresLayer) return;
        this.featuresLayer.clearLayers();

        const showWells = document.getElementById('chk-layer-wells')?.checked ?? true;
        const showReservoirs = document.getElementById('chk-layer-reservoirs')?.checked ?? true;
        const showPipes = document.getElementById('chk-layer-pipes')?.checked ?? true;
        const showDemands = document.getElementById('chk-layer-demands')?.checked ?? true;

        this.networkData.forEach(feat => {
            if (feat.visible === false) return;

            if (feat.type === 'well' && !showWells) return;
            if (feat.type === 'reservoir' && !showReservoirs) return;
            if (feat.type === 'pipe' && !showPipes) return;
            if (feat.type === 'demand' && !showDemands) return;

            if (feat.type === 'pipe' && feat.latlngs) {
                const color = feat.color || this.pipeColor;
                const weight = feat.weight || this.pipeWeight;
                const poly = L.polyline(feat.latlngs, {
                    color,
                    weight,
                    opacity: 0.9,
                    lineJoin: 'round'
                });

                poly.bindPopup(`
                    <div style="font-family:sans-serif; min-width:200px;">
                        <strong style="color:#f472b6; font-size:0.95rem;">〰️ ${feat.name}</strong><br>
                        <small>Longueur : <strong>${Math.round(feat.length || 0)} m</strong></small><br>
                        <small>Diamètre : <strong>${feat.diam || 300} mm</strong></small><br>
                        <small>Couleur : <span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:50%;vertical-align:middle;"></span> ${color}</small><br>
                        <div style="margin-top:6px; display:flex; gap:4px; flex-wrap:wrap;">
                            <button onclick="window.gisViewerInstance?.openPipeProfile('${feat.id}')" style="background:linear-gradient(135deg,#8b5cf6,#f472b6);color:#fff;border:none;border-radius:4px;padding:2px 7px;font-size:0.7rem;cursor:pointer;">⛰️ Profil</button>
                            <button onclick="window.gisViewerInstance?.openPipeEditor('${feat.id}')" style="background:linear-gradient(135deg,#f472b6,#fb923c);color:#1e0a26;border:none;border-radius:4px;padding:2px 7px;font-size:0.7rem;font-weight:700;cursor:pointer;">✏️ Éditer</button>
                            <button onclick="window.gisViewerInstance?.deleteFeature('${feat.id}')" style="background:#ef4444;color:#fff;border:none;border-radius:4px;padding:2px 7px;font-size:0.7rem;cursor:pointer;">🗑️ Supprimer</button>
                        </div>
                    </div>
                `);

                // Clic simple sur la conduite : ouvre l'éditeur complet (matériau, diamètre…)
                poly.on('click', () => this.openPipeEditor(feat.id));

                // Right-click context menu
                poly.on('contextmenu', (e) => {
                    L.DomEvent.stop(e);
                    this.openContextMenu(e.originalEvent, feat.id);
                });

                this.featuresLayer.addLayer(poly);
            } else if (feat.lat && feat.lng) {
                const iconMap = {
                    well:      { emoji: '💧', bg: '#0284c7', border: '#38bdf8' },
                    reservoir: { emoji: '🏛️', bg: '#1e3a8a', border: '#60a5fa' },
                    pump:      { emoji: '⚡', bg: '#7c3aed', border: '#c084fc' },
                    valve:     { emoji: '🚪', bg: '#b45309', border: '#fbbf24' },
                    demand:    { emoji: '🏘️', bg: '#047857', border: '#34d399' }
                };

                const typeOverride = feat.symbolType || feat.type;
                const style = iconMap[typeOverride] || { emoji: '📍', bg: '#334155', border: '#94a3b8' };
                const markerBg = feat.markerColor || style.bg;
                const markerBorder = feat.markerBorder || style.border;
                const markerEmoji = feat.markerEmoji || style.emoji;
                const markerSize = feat.markerSize || 32;

                const customIcon = L.divIcon({
                    className: 'gis-custom-marker',
                    html: `
                        <div style="
                            background: ${markerBg};
                            border: 2.5px solid ${markerBorder};
                            border-radius: 50%;
                            width: ${markerSize}px;
                            height: ${markerSize}px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 0 10px rgba(0,0,0,0.5), 0 0 0 3px ${markerBorder}22;
                            font-size: ${Math.round(markerSize * 0.45)}px;
                            cursor: pointer;
                            transition: transform 0.15s;
                        ">
                            ${markerEmoji}
                        </div>
                    `,
                    iconSize: [markerSize, markerSize],
                    iconAnchor: [markerSize / 2, markerSize / 2]
                });

                const marker = L.marker([feat.lat, feat.lng], { icon: customIcon });
                marker.bindPopup(`
                    <div style="font-family:sans-serif; min-width:200px;">
                        <strong style="color:#0284c7; font-size:0.95rem;">${markerEmoji} ${feat.name}</strong><br>
                        <small>Type : <strong>${feat.type}</strong></small><br>
                        <small>Altitude : <strong>${feat.elev || 600} m</strong></small><br>
                        <small>Coord : ${feat.lat.toFixed(4)}°, ${feat.lng.toFixed(4)}°</small><br>
                        <div style="margin-top:6px; display:flex; gap:4px; flex-wrap:wrap;">
                            <button onclick="window.gisViewerInstance?.openContextMenu(null,'${feat.id}')" style="background:#7c3aed;color:#fff;border:none;border-radius:4px;padding:2px 7px;font-size:0.7rem;cursor:pointer;">✏️ Symbole</button>
                            <button onclick="window.gisViewerInstance?.deleteFeature('${feat.id}')" style="background:#ef4444;color:#fff;border:none;border-radius:4px;padding:2px 7px;font-size:0.7rem;cursor:pointer;">🗑️ Supprimer</button>
                        </div>
                    </div>
                `);

                // Right-click context menu
                marker.on('contextmenu', (e) => {
                    L.DomEvent.stop(e);
                    this.openContextMenu(e.originalEvent, feat.id);
                });

                this.featuresLayer.addLayer(marker);
            }
        });

        // Global reference for popup / context menu actions
        window.gisViewerInstance = this;
        this.initContextMenu();
    }

    /** Build (once) the floating context-menu DOM element */
    initContextMenu() {
        if (document.getElementById('gis-ctx-menu')) return; // already built

        const menu = document.createElement('div');
        menu.id = 'gis-ctx-menu';
        menu.style.cssText = `
            position: fixed;
            z-index: 9999;
            background: rgba(10,12,32,0.97);
            border: 1px solid rgba(6,182,212,0.4);
            border-radius: 8px;
            padding: 6px 0;
            min-width: 210px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.6);
            backdrop-filter: blur(10px);
            display: none;
            font-family: system-ui, sans-serif;
            font-size: 0.8rem;
        `;
        document.body.appendChild(menu);

        // Close on outside click
        document.addEventListener('click', () => {
            menu.style.display = 'none';
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') menu.style.display = 'none';
        });
    }

    /**
     * Open right-click context menu for a feature.
     * @param {MouseEvent|null} ev  – native mouse event (null = open in centre of screen)
     * @param {string} featId       – feature id
     */
    openContextMenu(ev, featId) {
        const feat = this.networkData.find(f => f.id === featId);
        if (!feat) return;

        const menu = document.getElementById('gis-ctx-menu');
        if (!menu) return;

        const isPipe = feat.type === 'pipe';

        const iconOptions = [
            { v: 'well',      e: '💧', l: 'Forage / Source' },
            { v: 'reservoir', e: '🏛️', l: 'Réservoir / Bâche' },
            { v: 'pump',      e: '⚡', l: 'Station / Pompe' },
            { v: 'valve',     e: '🚪', l: 'Vanne' },
            { v: 'demand',    e: '🏘️', l: 'Zone Demande' },
            { v: 'custom_pin', e: '📍', l: 'Repère / Point' },
            { v: 'custom_star', e: '⭐', l: "Point d'intérêt" },
            { v: 'custom_alert', e: '⚠️', l: 'Alerte / Défaut' }
        ];

        const colorOptions = [
            { v: '#06b6d4', l: 'Cyan' },
            { v: '#3b82f6', l: 'Bleu Roi' },
            { v: '#10b981', l: 'Émeraude' },
            { v: '#f59e0b', l: 'Orange' },
            { v: '#ef4444', l: 'Rouge' },
            { v: '#8b5cf6', l: 'Violet' },
            { v: '#eab308', l: 'Or' },
            { v: '#f472b6', l: 'Rose' },
            { v: '#ffffff', l: 'Blanc' }
        ];

        const sizeOptions = [24, 28, 32, 38, 44];
        const weightOptions = [2, 3, 4, 6, 8];

        menu.innerHTML = `
            <div style="padding:6px 14px 4px; font-weight:700; color:#38bdf8; font-size:0.78rem; border-bottom:1px solid rgba(255,255,255,0.07); margin-bottom:4px;">
                ✏️ ${isPipe ? 'Modifier Conduite' : 'Modifier Symbole'} — ${feat.name}
            </div>

            ${!isPipe ? `
            <div style="padding:4px 14px; color:#94a3b8; font-size:0.72rem; font-weight:600;">Symbole :</div>
            <div style="padding:2px 10px 6px; display:flex; gap:6px; flex-wrap:wrap;">
                ${iconOptions.map(o => `
                    <button
                        title="${o.l}"
                        onclick="window.gisViewerInstance?.setFeatureSymbol('${featId}','${o.v}','${o.e}')"
                        style="background:${feat.symbolType===o.v?'rgba(6,182,212,0.25)':'rgba(255,255,255,0.06)'};
                            border:1px solid rgba(255,255,255,0.12); border-radius:6px;
                            padding:3px 6px; font-size:1rem; cursor:pointer;"
                    >${o.e}</button>
                `).join('')}
            </div>
            <div style="padding:4px 14px; color:#94a3b8; font-size:0.72rem; font-weight:600;">Taille :</div>
            <div style="padding:2px 10px 6px; display:flex; gap:5px;">
                ${sizeOptions.map(s => `
                    <button
                        onclick="window.gisViewerInstance?.setFeatureSize('${featId}',${s})"
                        style="background:${feat.markerSize===s?'rgba(6,182,212,0.25)':'rgba(255,255,255,0.06)'};
                            border:1px solid rgba(255,255,255,0.1); border-radius:4px;
                            padding:2px 7px; font-size:0.7rem; color:#e2e8f0; cursor:pointer;">${s}px</button>
                `).join('')}
            </div>
            ` : ''}

            <div style="padding:4px 14px; color:#94a3b8; font-size:0.72rem; font-weight:600;">Couleur :</div>
            <div style="padding:2px 10px 6px; display:flex; gap:5px; flex-wrap:wrap;">
                ${colorOptions.map(c => `
                    <button
                        title="${c.l}"
                        onclick="window.gisViewerInstance?.setFeatureColor('${featId}','${c.v}')"
                        style="background:${c.v}; width:22px; height:22px; border-radius:50%;
                            border:2px solid ${(feat.color===c.v||feat.markerColor===c.v)?'#fff':'rgba(255,255,255,0.2)'};
                            cursor:pointer;"
                    ></button>
                `).join('')}
                <input type="color" value="${feat.color||feat.markerColor||'#06b6d4'}"
                    title="Couleur personnalisée"
                    onchange="window.gisViewerInstance?.setFeatureColor('${featId}',this.value)"
                    style="width:22px; height:22px; border:none; border-radius:50%; cursor:pointer; padding:0;"
                >
            </div>

            ${isPipe ? `
            <div style="padding:4px 14px; color:#94a3b8; font-size:0.72rem; font-weight:600;">Épaisseur :</div>
            <div style="padding:2px 10px 6px; display:flex; gap:5px;">
                ${weightOptions.map(w => `
                    <button
                        onclick="window.gisViewerInstance?.setFeatureWeight('${featId}',${w})"
                        style="background:${feat.weight===w?'rgba(6,182,212,0.25)':'rgba(255,255,255,0.06)'};
                            border:1px solid rgba(255,255,255,0.1); border-radius:4px;
                            padding:2px 7px; font-size:0.7rem; color:#e2e8f0; cursor:pointer;">${w}px</button>
                `).join('')}
            </div>
            <div style="padding:4px 10px 2px; display:flex; gap:6px;">
                <button onclick="window.gisViewerInstance?.openPipeEditor('${featId}')" style="flex:1; background:linear-gradient(135deg,#f472b6,#fb923c); color:#1e0a26; border:none; border-radius:5px; padding:4px 10px; font-size:0.73rem; font-weight:700; cursor:pointer;">🛠️ Éditeur complet</button>
                <button onclick="window.gisViewerInstance?.openPipeProfile('${featId}')" style="flex:1; background:linear-gradient(135deg,#8b5cf6,#f472b6); color:#fff; border:none; border-radius:5px; padding:4px 10px; font-size:0.73rem; font-weight:700; cursor:pointer;">⛰️ Profil</button>
            </div>
            ` : ''}

            <div style="border-top:1px solid rgba(255,255,255,0.07); margin-top:4px; padding:4px 10px 2px; display:flex; gap:6px;">
                <button onclick="window.gisViewerInstance?.deleteFeature('${featId}')" style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.35); color:#f87171; border-radius:5px; padding:4px 10px; font-size:0.73rem; cursor:pointer; flex:1;">🗑️ Supprimer</button>
                <button onclick="document.getElementById('gis-ctx-menu').style.display='none'" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#94a3b8; border-radius:5px; padding:4px 10px; font-size:0.73rem; cursor:pointer;">✕ Fermer</button>
            </div>
        `;

        // Position menu at mouse or screen centre
        if (ev) {
            const x = Math.min(ev.clientX, window.innerWidth  - 240);
            const y = Math.min(ev.clientY, window.innerHeight - 420);
            menu.style.left = x + 'px';
            menu.style.top  = y + 'px';
        } else {
            menu.style.left = '50%';
            menu.style.top  = '30%';
            menu.style.transform = 'translateX(-50%)';
        }
        menu.style.display = 'block';
    }

    setFeatureSymbol(featId, symbolType, emoji) {
        const feat = this.networkData.find(f => f.id === featId);
        if (!feat) return;
        feat.symbolType = symbolType;
        feat.markerEmoji = emoji;
        this.renderAllFeatures();
        this.renderAttributeTable();
        document.getElementById('gis-ctx-menu').style.display = 'none';
    }

    setFeatureColor(featId, color) {
        const feat = this.networkData.find(f => f.id === featId);
        if (!feat) return;
        if (feat.type === 'pipe') {
            feat.color = color;
        } else {
            feat.markerColor = color;
            feat.markerBorder = color;
        }
        this.renderAllFeatures();
        this.renderAttributeTable();
        document.getElementById('gis-ctx-menu').style.display = 'none';
    }

    setFeatureWeight(featId, weight) {
        const feat = this.networkData.find(f => f.id === featId);
        if (!feat || feat.type !== 'pipe') return;
        feat.weight = weight;
        this.renderAllFeatures();
        document.getElementById('gis-ctx-menu').style.display = 'none';
    }

    setFeatureSize(featId, size) {
        const feat = this.networkData.find(f => f.id === featId);
        if (!feat) return;
        feat.markerSize = size;
        this.renderAllFeatures();
        document.getElementById('gis-ctx-menu').style.display = 'none';
    }


    /** Ferme la modale SIG active */
    closeGisModal() {
        document.getElementById('gis-modal-root').innerHTML = '';
    }

    /**
     * Éditeur complet d'une conduite (clic simple sur la conduite) :
     * nom, matériau, diamètre, rugosité, couleur, épaisseur.
     */
    openPipeEditor(featId) {
        const feat = this.networkData.find(f => f.id === featId);
        if (!feat) return;
        const ctxMenu = document.getElementById('gis-ctx-menu');
        if (ctxMenu) ctxMenu.style.display = 'none';

        const materials = ['Fonte', 'Acier', 'Amiante-Ciment', 'Béton', 'PEHD', 'PVC', 'Inox'];
        const roughness = { 'Fonte': 0.26, 'Acier': 0.15, 'Amiante-Ciment': 0.30, 'Béton': 0.90, 'PEHD': 0.05, 'PVC': 0.06, 'Inox': 0.03 };
        const swatches = ['#f472b6', '#fb923c', '#06b6d4', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#eab308', '#ffffff'];
        const m = feat.material || this.pipeMaterial;

        const root = document.getElementById('gis-modal-root');
        if (!root) return;
        root.innerHTML = `
            <div class="gis-modal-overlay" onclick="if(event.target===this) window.gisViewerInstance?.closeGisModal()">
                <div class="gis-modal">
                    <div class="gis-modal-header">
                        <h3>🛠️ Éditeur de Conduite — ${feat.name}</h3>
                        <button class="gis-modal-close" onclick="window.gisViewerInstance?.closeGisModal()">✕</button>
                    </div>
                    <div class="gis-modal-body">
                        <div class="gis-form-grid">
                            <div class="gis-field" style="grid-column:1 / -1;">
                                <label>📛 NOM DE LA CANALISATION</label>
                                <input type="text" id="gis-ed-name" value="${feat.name}">
                            </div>
                            <div class="gis-field">
                                <label>🧷 NATURE DU MATÉRIAU</label>
                                <select id="gis-ed-material">
                                    ${materials.map(mt => `<option value="${mt}" ${mt === m ? 'selected' : ''}>${mt}</option>`).join('')}
                                </select>
                            </div>
                            <div class="gis-field">
                                <label>📏 DIAMÈTRE INTÉRIEUR (mm)</label>
                                <input type="number" id="gis-ed-diam" value="${feat.diam || 300}" min="20" max="3000" step="10">
                            </div>
                            <div class="gis-field">
                                <label>🪨 RUGOSITÉ — Strickler K (m^(1/3)/s)</label>
                                <input type="number" id="gis-ed-rough" value="${feat.rough || roughness[m] || 0.26}" min="0.01" max="5" step="0.01">
                            </div>
                            <div class="gis-field">
                                <label>📐 ÉPAISSEUR DU TRAIT (px)</label>
                                <select id="gis-ed-weight">
                                    ${[2, 3, 4, 5, 6, 8, 10].map(w => `<option value="${w}" ${w === (feat.weight || 4) ? 'selected' : ''}>${w} px</option>`).join('')}
                                </select>
                            </div>
                            <div class="gis-field" style="grid-column:1 / -1;">
                                <label>🎨 COULEUR DE LA CONDUITE</label>
                                <div class="gis-swatch-row" id="gis-ed-swatches">
                                    ${swatches.map(c => `<div class="gis-swatch ${c === feat.color ? 'active' : ''}" data-c="${c}" style="background:${c};color:${c};" title="${c}"></div>`).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="gis-modal-footer">
                        <button class="gis-btn-act gis-btn-del" onclick="window.gisViewerInstance?.deleteFeature('${feat.id}'); window.gisViewerInstance?.closeGisModal();">🗑️ Supprimer</button>
                        <button class="gis-btn-act gis-btn-profile-act" onclick="window.gisViewerInstance?.savePipeEditor('${feat.id}', true);">⛰️ Profil</button>
                        <button class="gis-btn-act gis-btn-save" onclick="window.gisViewerInstance?.savePipeEditor('${feat.id}');">💾 Enregistrer</button>
                    </div>
                </div>
            </div>
        `;

        // Sélection des pastilles couleur
        root.querySelectorAll('.gis-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                root.querySelectorAll('.gis-swatch').forEach(s => s.classList.remove('active'));
                sw.classList.add('active');
            });
        });
        // Rugosité auto selon matériau (restant modifiable ensuite)
        root.querySelector('#gis-ed-material')?.addEventListener('change', (e) => {
            const r = roughness[e.target.value];
            if (r !== undefined) root.querySelector('#gis-ed-rough').value = r;
        });
    }

    /** Sauvegarde de l'éditeur de conduite ; optionnellement ouvre le profil */
    savePipeEditor(featId, openProfile = false) {
        const feat = this.networkData.find(f => f.id === featId);
        if (!feat) return;
        const name = document.getElementById('gis-ed-name')?.value.trim();
        if (name) feat.name = name;
        feat.material = document.getElementById('gis-ed-material')?.value || feat.material || 'Fonte';
        feat.diam = parseInt(document.getElementById('gis-ed-diam')?.value, 10) || feat.diam || 300;
        feat.rough = parseFloat(document.getElementById('gis-ed-rough')?.value) || 0.26;
        feat.weight = parseInt(document.getElementById('gis-ed-weight')?.value, 10) || feat.weight || 4;
        const activeSw = document.querySelector('#gis-ed-swatches .gis-swatch.active');
        if (activeSw) feat.color = activeSw.dataset.c;

        this.renderAllFeatures();
        this.renderAttributeTable();
        this.closeGisModal();
        if (openProfile) this.openPipeProfile(featId);
    }

    /**
     * Éditeur de caractéristiques d'un ouvrage ponctuel (forage, réservoir,
     * station, vanne, zone) : nom, type, altitude, capacité, position,
     * symbole et couleur — même principe que l'éditeur de conduite.
     */
    openFeatureEditor(featId) {
        const feat = this.networkData.find(f => f.id === featId);
        if (!feat || feat.type === 'pipe') return;
        const ctxMenu = document.getElementById('gis-ctx-menu');
        if (ctxMenu) ctxMenu.style.display = 'none';

        const types = [
            { v: 'well', l: '💧 Forage / Source' },
            { v: 'reservoir', l: '🏛️ Réservoir / Bâche' },
            { v: 'pump', l: '⚡ Station de pompage' },
            { v: 'valve', l: '🚪 Vanne / Régulateur' },
            { v: 'demand', l: '🏘️ Zone de demande' }
        ];
        const emojis = ['💧', '🏛️', '⚡', '🚪', '🏘️', '📍', '⭐', '⚠️'];
        const swatches = ['#38bdf8', '#f472b6', '#fb923c', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#eab308', '#ffffff'];
        const curEmoji = feat.markerEmoji || '';

        const root = document.getElementById('gis-modal-root');
        if (!root) return;
        root.innerHTML = `
            <div class="gis-modal-overlay" onclick="if(event.target===this) window.gisViewerInstance?.closeGisModal()">
                <div class="gis-modal">
                    <div class="gis-modal-header">
                        <h3>🛠️ Éditeur d'Ouvrage — ${feat.name}</h3>
                        <button class="gis-modal-close" onclick="window.gisViewerInstance?.closeGisModal()">✕</button>
                    </div>
                    <div class="gis-modal-body">
                        <div class="gis-form-grid">
                            <div class="gis-field" style="grid-column:1 / -1;">
                                <label>📛 NOM DE L'OUVRAGE</label>
                                <input type="text" id="gis-fe-name" value="${feat.name}">
                            </div>
                            <div class="gis-field">
                                <label>🏗️ TYPE D'OUVRAGE</label>
                                <select id="gis-fe-type">
                                    ${types.map(t => `<option value="${t.v}" ${t.v === feat.type ? 'selected' : ''}>${t.l}</option>`).join('')}
                                </select>
                            </div>
                            <div class="gis-field">
                                <label>⛰️ ALTITUDE Z (m NGT)</label>
                                <input type="number" id="gis-fe-elev" value="${feat.elev ?? 600}" min="0" max="3000" step="1">
                            </div>
                            <div class="gis-field">
                                <label>📦 CAPACITÉ (m³) — réservoir / station</label>
                                <input type="number" id="gis-fe-cap" value="${feat.cap ?? ''}" min="0" step="10" placeholder="—">
                            </div>
                            <div class="gis-field">
                                <label>🧭 LATITUDE (°)</label>
                                <input type="number" id="gis-fe-lat" value="${feat.lat?.toFixed(6) ?? ''}" step="0.000001">
                            </div>
                            <div class="gis-field">
                                <label>🧭 LONGITUDE (°)</label>
                                <input type="number" id="gis-fe-lng" value="${feat.lng?.toFixed(6) ?? ''}" step="0.000001">
                            </div>
                            <div class="gis-field" style="grid-column:1 / -1;">
                                <label>🔖 SYMBOLE</label>
                                <div class="gis-swatch-row" id="gis-fe-emojis">
                                    ${emojis.map(e => `<div class="gis-swatch gis-swatch-emoji ${e === curEmoji ? 'active' : ''}" data-e="${e}" title="Symbole ${e}">${e}</div>`).join('')}
                                </div>
                            </div>
                            <div class="gis-field" style="grid-column:1 / -1;">
                                <label>🎨 COULEUR DU MARQUEUR</label>
                                <div class="gis-swatch-row" id="gis-fe-swatches">
                                    ${swatches.map(c => `<div class="gis-swatch ${c === feat.color ? 'active' : ''}" data-c="${c}" style="background:${c};color:${c};" title="${c}"></div>`).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="gis-modal-footer">
                        <button class="gis-btn-act gis-btn-del" onclick="window.gisViewerInstance?.deleteFeature('${feat.id}'); window.gisViewerInstance?.closeGisModal();">🗑️ Supprimer</button>
                        <button class="gis-btn-act gis-btn-profile-act" onclick="window.gisViewerInstance?.saveFeatureEditor('${feat.id}', true);">📍 Centrer</button>
                        <button class="gis-btn-act gis-btn-save" onclick="window.gisViewerInstance?.saveFeatureEditor('${feat.id}');">💾 Enregistrer</button>
                    </div>
                </div>
            </div>
        `;
        this._bindFeatureEditorEvents(root, feat);
    }

    /** Liaison des événements de l'éditeur d'ouvrage (pastilles couleur/symbole, type→symbole) */
    _bindFeatureEditorEvents(root) {
        root.querySelectorAll('#gis-fe-swatches .gis-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                root.querySelectorAll('#gis-fe-swatches .gis-swatch').forEach(s => s.classList.remove('active'));
                sw.classList.add('active');
            });
        });
        root.querySelectorAll('#gis-fe-emojis .gis-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                root.querySelectorAll('#gis-fe-emojis .gis-swatch').forEach(s => s.classList.remove('active'));
                sw.classList.add('active');
            });
        });
        // Changer le type propose automatiquement le symbole correspondant
        const typeEmoji = { well: '💧', reservoir: '🏛️', pump: '⚡', valve: '🚪', demand: '🏘️' };
        root.querySelector('#gis-fe-type')?.addEventListener('change', (e) => {
            const em = typeEmoji[e.target.value];
            const target = root.querySelector(`#gis-fe-emojis .gis-swatch[data-e="${em}"]`);
            if (!target) return;
            root.querySelectorAll('#gis-fe-emojis .gis-swatch').forEach(s => s.classList.remove('active'));
            target.classList.add('active');
        });
    }

    /** Sauvegarde de l'éditeur d'ouvrage ; optionnellement recentre la carte */
    saveFeatureEditor(featId, recenter = false) {
        const feat = this.networkData.find(f => f.id === featId);
        if (!feat) return;
        const name = document.getElementById('gis-fe-name')?.value.trim();
        if (name) feat.name = name;
        const type = document.getElementById('gis-fe-type')?.value;
        if (type) feat.type = type;
        const elev = parseFloat(document.getElementById('gis-fe-elev')?.value);
        if (!isNaN(elev)) feat.elev = elev;
        const capRaw = document.getElementById('gis-fe-cap')?.value;
        feat.cap = capRaw !== '' && !isNaN(parseFloat(capRaw)) ? parseFloat(capRaw) : undefined;
        const lat = parseFloat(document.getElementById('gis-fe-lat')?.value);
        const lng = parseFloat(document.getElementById('gis-fe-lng')?.value);
        if (!isNaN(lat)) feat.lat = lat;
        if (!isNaN(lng)) feat.lng = lng;
        const activeEm = document.querySelector('#gis-fe-emojis .gis-swatch.active');
        feat.markerEmoji = activeEm ? activeEm.dataset.e : undefined;
        const activeSw = document.querySelector('#gis-fe-swatches .gis-swatch.active');
        if (activeSw) feat.color = activeSw.dataset.c;

        this.renderAllFeatures();
        this.renderAttributeTable();
        this.closeGisModal();
        if (recenter) this.zoomToFeature(featId);
    }

    /**
     * Résout les altitudes réelles le long de la conduite :
     * 1. Altitudes captées à l'import KML/GeoJSON (feat.vElev) — prioritaires.
     * 2. Altitudes des ouvrages du réseau (forages, réservoirs, stations, vannes)
     *    tracés ou importés sur la carte, rattachés aux sommets les plus proches.
     * 3. Repli : altitudes explicites de la conduite ou estimation.
     */
    _resolvePipeElevations(feat) {
        const ll = feat.latlngs || [];
        if (ll.length < 2) return null;

        // Altitudes par sommet déjà présentes (import KML/GeoJSON)
        if (Array.isArray(feat.vElev) && feat.vElev.length === ll.length && feat.vElev.every(v => v != null && !isNaN(v))) {
            return { vertexElev: feat.vElev.slice(), source: 'import' };
        }

        // Rattachement aux ouvrages proches de chaque sommet
        const nodes = this.networkData.filter(f =>
            f.type !== 'pipe' && f.visible !== false && f.elev != null && f.lat != null && f.lng != null
        );
        const tolM = 500; // tolérance de rattachement (m)
        const elevFor = (lat, lng) => {
            let best = null, bestD = tolM;
            nodes.forEach(n => {
                const d = L.latLng(lat, lng).distanceTo(L.latLng(n.lat, n.lng));
                if (d < bestD) { bestD = d; best = n.elev; }
            });
            return best;
        };
        const vertexElev = ll.map(v => elevFor(v[0], v[1]));
        const known = vertexElev.filter(v => v != null);
        if (known.length >= 2) {
            // Interpole les sommets sans ouvrage proche entre les sommets connus voisins
            for (let i = 0; i < vertexElev.length; i++) {
                if (vertexElev[i] != null) continue;
                let prev = i - 1, next = i + 1;
                while (prev >= 0 && vertexElev[prev] == null) prev--;
                while (next < vertexElev.length && vertexElev[next] == null) next++;
                const a = prev >= 0 ? vertexElev[prev] : known[0];
                const b = next < vertexElev.length ? vertexElev[next] : known[known.length - 1];
                const t = (prev >= 0 && next < vertexElev.length) ? (i - prev) / (next - prev) : 0.5;
                vertexElev[i] = a + (b - a) * t;
            }
            return { vertexElev, source: 'network' };
        }

        // Repli : altitudes explicites de la conduite, sinon estimation du relief
        const zA = feat.elevStart ?? 520;
        const zB = feat.elevEnd ?? (zA + 60);
        const n = ll.length;
        return {
            vertexElev: ll.map((_, i) => zA + (zB - zA) * (n > 1 ? i / (n - 1) : 0)),
            source: 'estimate'
        };
    }

    /** Profil en long du terrain le long de la conduite (altitudes réelles du réseau) */
    _pipeTerrainProfile(feat, nPts = 60) {
        const ll = feat.latlngs || [];
        if (ll.length < 2) return { pts: [], source: 'estimate' };
        const res = this._resolvePipeElevations(feat) || { vertexElev: [520, 580], source: 'estimate' };
        const total = feat.length || this.calculatePolylineDistance(ll) || 1000;

        // PK réels : distance cumulée géodésique entre les sommets du tracé
        const cum = [0];
        for (let i = 1; i < ll.length; i++) {
            cum.push(cum[i - 1] + L.latLng(ll[i - 1]).distanceTo(L.latLng(ll[i])));
        }

        const pts = [];
        for (let i = 0; i < nPts; i++) {
            const pk = total * i / (nPts - 1);
            let seg = 0;
            while (seg < cum.length - 2 && cum[seg + 1] < pk) seg++;
            const segLen = (cum[seg + 1] - cum[seg]) || 1;
            const t = Math.min(1, Math.max(0, (pk - cum[seg]) / segLen));
            const z = res.vertexElev[seg] + ((res.vertexElev[seg + 1] ?? res.vertexElev[seg]) - res.vertexElev[seg]) * t;
            // Micro-relief très léger (±1.5 m) pour un rendu naturel sans dénaturer les altitudes
            const micro = i === 0 || i === nPts - 1 ? 0 : Math.sin(i * 0.9) * 1.5;
            pts.push({ pk, elev: z + micro });
        }
        pts[0].elev = res.vertexElev[0];
        pts[pts.length - 1].elev = res.vertexElev[res.vertexElev.length - 1];
        return { pts, source: res.source };
    }

    /** Fenêtre « Profil en Long » de la conduite (rose/orange, SVG) */
    openPipeProfile(featId) {
        const feat = this.networkData.find(f => f.id === featId);
        if (!feat) return;
        const ctxMenu = document.getElementById('gis-ctx-menu');
        if (ctxMenu) ctxMenu.style.display = 'none';
        const { pts, source } = this._pipeTerrainProfile(feat);
        if (!pts || pts.length < 2) return;
        const total = feat.length || Math.round(pts[pts.length - 1].pk);
        const zMin = Math.min(...pts.map(p => p.elev)) - 8;
        const zMax = Math.max(...pts.map(p => p.elev)) + 6;
        const W = 560, H = 220, padL = 44, padR = 14, padT = 16, padB = 30;
        const x = pk => padL + (pk / total) * (W - padL - padR);
        const y = z => padT + (1 - (z - zMin) / (zMax - zMin || 1)) * (H - padT - padB);

        // Surface du terrain (aire rose) + conduite (tube dégradé orange→rose)
        const terrain = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.pk).toFixed(1)},${y(p.elev).toFixed(1)}`).join(' ');
        const terrainArea = `${terrain} L ${x(total).toFixed(1)},${(H - padB)} L ${padL},${(H - padB)} Z`;
        const pipeY = p => y(p.elev) + 9;
        const pipeLine = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.pk).toFixed(1)},${pipeY(p).toFixed(1)}`).join(' ');
        const gridY = [];
        for (let z = Math.ceil(zMin / 10) * 10; z <= zMax; z += 10) gridY.push(z);

        this._renderPipeProfileModal(feat, pts, total, { W, H, padL, padR, padT, padB }, x, y, terrain, terrainArea, pipeLine, gridY, source);
    }

    /** Injection HTML de la modale Profil en Long */
    _renderPipeProfileModal(feat, pts, total, d, x, y, terrain, terrainArea, pipeLine, gridY, source = 'estimate') {
        const srcLabels = {
            network:  { txt: 'Altitudes du réseau ✔', cls: 'gis-src-ok' },
            import:   { txt: 'Altitudes KML / GeoJSON ✔', cls: 'gis-src-ok' },
            estimate: { txt: 'Altitudes estimées ⚠', cls: 'gis-src-warn' }
        };
        const src = srcLabels[source] || srcLabels.estimate;
        const deniv = pts[pts.length - 1].elev - pts[0].elev;
        const root = document.getElementById('gis-modal-root');
        if (!root) return;
        root.innerHTML = `
            <div class="gis-modal-overlay" onclick="if(event.target===this) window.gisViewerInstance?.closeGisModal()">
                <div class="gis-modal" style="width:min(720px, 96vw);">
                    <div class="gis-modal-header">
                        <h3>⛰️ Profil en Long — ${feat.name}</h3>
                        <span class="gis-src-badge ${src.cls}">${src.txt}</span>
                        <button class="gis-modal-close" onclick="window.gisViewerInstance?.closeGisModal()">✕</button>
                    </div>
                    <div class="gis-modal-body">
                        <div class="gis-profile-canvas-wrap">
                            <svg viewBox="0 0 ${d.W} ${d.H}" width="100%" style="display:block;">
                                <defs>
                                    <linearGradient id="gisTerrainGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stop-color="#f472b6" stop-opacity="0.55"/>
                                        <stop offset="100%" stop-color="#f472b6" stop-opacity="0.06"/>
                                    </linearGradient>
                                    <linearGradient id="gisPipeGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stop-color="#fb923c"/>
                                        <stop offset="100%" stop-color="#f472b6"/>
                                    </linearGradient>
                                </defs>
                                ${gridY.map(z => `
                                    <line x1="${d.padL}" y1="${y(z).toFixed(1)}" x2="${d.W - d.padR}" y2="${y(z).toFixed(1)}" stroke="rgba(244,114,182,0.12)" stroke-width="1"/>
                                    <text x="${d.padL - 6}" y="${(y(z) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#fdba74">${z}</text>
                                `).join('')}
                                <path d="${terrainArea}" fill="url(#gisTerrainGrad)"/>
                                <path d="${terrain}" fill="none" stroke="#f9a8d4" stroke-width="2" stroke-linejoin="round"/>
                                <path d="${pipeLine}" fill="none" stroke="url(#gisPipeGrad)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="${pipeLine}" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="8 7" stroke-linecap="round" opacity="0.75"/>
                                <text x="${x(0).toFixed(1)}" y="${d.H - 10}" font-size="9" fill="#fdba74">PK 0</text>
                                <text x="${x(total).toFixed(1)}" y="${d.H - 10}" text-anchor="end" font-size="9" fill="#fdba74">PK ${(total / 1000).toFixed(2)} km</text>
                                <text x="${d.padL}" y="${d.padT - 4}" font-size="9" fill="#f9a8d4">Z (m NGT)</text>
                            </svg>
                        </div>
                        <div class="gis-profile-stats">
                            <div class="gis-profile-stat"><b>${Math.round(total)} m</b><span>LONGUEUR</span></div>
                            <div class="gis-profile-stat"><b>DN ${feat.diam || 300} mm</b><span>DIAMÈTRE</span></div>
                            <div class="gis-profile-stat"><b>${feat.material || this.pipeMaterial}</b><span>MATÉRIAU</span></div>
                            <div class="gis-profile-stat"><b>${(feat.rough || 0.26).toFixed(2)}</b><span>RUGOSITÉ K</span></div>
                            <div class="gis-profile-stat"><b>${pts[0].elev.toFixed(0)} m</b><span>Z DÉPART</span></div>
                            <div class="gis-profile-stat"><b>${pts[pts.length - 1].elev.toFixed(0)} m</b><span>Z ARRIVÉE</span></div>
                            <div class="gis-profile-stat"><b>${deniv >= 0 ? '+' : ''}${deniv.toFixed(0)} m</b><span>DÉNIVELÉ</span></div>
                        </div>
                    </div>
                    <div class="gis-modal-footer">
                        <button class="gis-btn-act gis-btn-profile-act" onclick="window.gisViewerInstance?.openPipeEditor('${feat.id}')">🛠️ Éditer la conduite</button>
                        <button class="gis-btn-act gis-btn-save" onclick="window.gisViewerInstance?.closeGisModal()">✕ Fermer</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderAttributeTable(filterText = '') {
        const tbody = document.getElementById('gis-attribute-table-body');
        const countSpan = document.getElementById('gis-feature-count');
        if (!tbody) return;
        tbody.innerHTML = '';

        let filtered = this.networkData;
        if (filterText) {
            filtered = filtered.filter(f => f.name.toLowerCase().includes(filterText) || f.type.toLowerCase().includes(filterText));
        }

        if (countSpan) countSpan.textContent = filtered.length;

        const iconMap = {
            well:      { e: '💧', l: 'Forage', cls: 'well' },
            reservoir: { e: '🏛️', l: 'Réservoir', cls: 'reservoir' },
            pump:      { e: '⚡', l: 'Station', cls: 'pump' },
            valve:     { e: '🚪', l: 'Vanne', cls: 'valve' },
            pipe:      { e: '〰️', l: 'Conduite', cls: 'pipe' },
            demand:    { e: '🏘️', l: 'Demande', cls: 'demand' }
        };
        const symEmojiMap = { well: '💧', reservoir: '🏛️', pump: '⚡', valve: '🚪', demand: '🏘️', custom_pin: '📍', custom_star: '⭐', custom_alert: '⚠️' };

        filtered.forEach((feat, idx) => {
            const tr = document.createElement('tr');
            const isVisible = feat.visible !== false;
            const isPipe = feat.type === 'pipe';
            // Le symbole suit les changements (context menu / éditeur) : emoji surchargé si présent
            const baseInfo = iconMap[feat.type] || { e: '📍', l: feat.type, cls: 'demand' };
            const shownEmoji = feat.markerEmoji || (feat.symbolType ? (symEmojiMap[feat.symbolType] || baseInfo.e) : baseInfo.e);
            const shownLabel = feat.markerEmoji && !baseInfo.e.includes(feat.markerEmoji) ? baseInfo.l : baseInfo.l;
            const rowCls = `gis-row-${feat.markerEmoji && feat.symbolType && iconMap[feat.symbolType] ? feat.symbolType : baseInfo.cls}`;
            const typeCls = `gis-type-${feat.markerEmoji && feat.symbolType && iconMap[feat.symbolType] ? feat.symbolType : baseInfo.cls}`;

            tr.className = rowCls;
            tr.innerHTML = `
                <td style="text-align:center;"><span class="gis-idx-badge">${idx + 1}</span></td>
                <td style="text-align:center;">
                    <button class="btn-scada-mini btn-toggle-vis" data-id="${feat.id}" title="${isVisible ? 'Masquer' : 'Afficher'}">
                        ${isVisible ? '👁️' : '🙈'}
                    </button>
                </td>
                <td><span class="gis-type-badge ${typeCls}">${shownEmoji} ${shownLabel}</span></td>
                <td class="gis-name-cell"><strong>${feat.name}</strong> ${feat.isKml ? '<small style="color:#c084fc;">(KML)</small>' : ''}</td>
                <td>${isPipe ? `${Math.round(feat.length || 0)} m` : `${feat.lat?.toFixed(4)}°, ${feat.lng?.toFixed(4)}°`}</td>
                <td>${isPipe
                    ? `<span class="gis-dn-chip">DN ${feat.diam || 300} mm</span><span class="gis-mat-tag">${feat.material || this.pipeMaterial}</span>`
                    : `<span class="gis-elev-chip">${feat.elev || 600} m</span>`}</td>
                <td>
                    ${isPipe
                        ? `<button class="btn-scada-mini gis-btn-profile btn-open-pipe" data-id="${feat.id}" title="Éditer matériau, diamètre… & profil longitudinal">⛰️✏️</button>`
                        : `<button class="btn-scada-mini gis-btn-profile btn-open-feature" data-id="${feat.id}" title="Éditer les caractéristiques : nom, type, altitude, capacité, symbole, couleur">🛠️✏️</button>`}
                    <button class="btn-scada-mini btn-zoom-feat" data-id="${feat.id}" title="Centrer la carte">📍</button>
                    <button class="btn-scada-mini" style="color:#f87171;" onclick="window.gisViewerInstance?.deleteFeature('${feat.id}')" title="Supprimer">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Event Listeners on Table Buttons
        tbody.querySelectorAll('.btn-toggle-vis').forEach(b => {
            b.addEventListener('click', () => {
                const id = b.dataset.id;
                const feat = this.networkData.find(f => f.id === id);
                if (feat) {
                    feat.visible = (feat.visible === false) ? true : false;
                    this.renderAllFeatures();
                    this.renderAttributeTable(filterText);
                }
            });
        });

        // Clic sur le bouton conduite : ouvre l'éditeur (matériau, diamètre, rugosité, couleur)
        tbody.querySelectorAll('.btn-open-pipe').forEach(b => {
            b.addEventListener('click', () => this.openPipeEditor(b.dataset.id));
        });

        // Clic sur le bouton ouvrage (forage, réservoir, station, vanne…) : éditeur de caractéristiques
        tbody.querySelectorAll('.btn-open-feature').forEach(b => {
            b.addEventListener('click', () => this.openFeatureEditor(b.dataset.id));
        });

        tbody.querySelectorAll('.btn-zoom-feat').forEach(b => {
            b.addEventListener('click', () => {
                const id = b.dataset.id;
                this.zoomToFeature(id);
            });
        });
    }

    zoomToFeature(id) {
        const feat = this.networkData.find(f => f.id === id);
        if (!feat || !this.map) return;

        if (feat.type === 'pipe' && feat.latlngs) {
            const bounds = L.latLngBounds(feat.latlngs);
            this.map.fitBounds(bounds, { padding: [40, 40] });
        } else if (feat.lat && feat.lng) {
            this.map.setView([feat.lat, feat.lng], 15);
        }
    }

    deleteFeature(id) {
        this.networkData = this.networkData.filter(f => f.id !== id);
        this.renderAllFeatures();
        this.renderAttributeTable();
    }

    fitBounds() {
        if (!this.map || this.networkData.length === 0) return;
        const pts = [];
        this.networkData.forEach(f => {
            if (f.type === 'pipe' && f.latlngs) {
                f.latlngs.forEach(ll => pts.push(ll));
            } else if (f.lat && f.lng) {
                pts.push([f.lat, f.lng]);
            }
        });

        if (pts.length > 0) {
            const bounds = L.latLngBounds(pts);
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    async handleFileImport(file) {
        try {
            // WIPE OUT EXISTING DATA COMPLETELY UPON IMPORTING A NEW FILE
            this.networkData = [];
            this.featuresLayer?.clearLayers();
            this.drawLayer?.clearLayers();

            const text = await file.text();
            if (file.name.endsWith('.kml') || file.name.endsWith('.kmz') || text.includes('<kml')) {
                this.parseKml(text, file.name);
            } else {
                const json = JSON.parse(text);
                this.parseGeoJson(json, file.name);
            }
        } catch (err) {
            console.error("GIS Import error:", err);
            alert(`❌ Erreur lors de l'importation cartographique : ${err.message}`);
        }
    }

    parseKml(kmlText, fileName) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(kmlText, 'text/xml');
        const placemarks = xml.querySelectorAll('Placemark');

        let importedCount = 0;
        placemarks.forEach((pm, i) => {
            const name = pm.querySelector('name')?.textContent || `Ouvrage KML #${i + 1}`;
            const desc = pm.querySelector('description')?.textContent || '';

            // Point
            const ptCoords = pm.querySelector('Point coordinates')?.textContent?.trim();
            if (ptCoords) {
                const parts = ptCoords.split(',').map(s => parseFloat(s.trim()));
                if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    this.networkData.push({
                        id: `kml_pt_${Date.now()}_${i}`,
                        name,
                        type: 'reservoir',
                        lat: parts[1],
                        lng: parts[0],
                        elev: parts[2] || 600,
                        desc,
                        visible: true,
                        isKml: true
                    });
                    importedCount++;
                }
            }

            // LineString
            const lineCoords = pm.querySelector('LineString coordinates')?.textContent?.trim();
            if (lineCoords) {
                const rawCoords = lineCoords.split(/\s+/).filter(Boolean);
                const latlngs = [];
                const vElev = [];
                rawCoords.forEach(rc => {
                    const parts = rc.split(',').map(s => parseFloat(s.trim()));
                    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        latlngs.push([parts[1], parts[0]]);
                        vElev.push(parts.length >= 3 && !isNaN(parts[2]) ? parts[2] : null);
                    }
                });
                if (latlngs.length >= 2) {
                    const dist = this.calculatePolylineDistance(latlngs);
                    this.networkData.push({
                        id: `kml_line_${Date.now()}_${i}`,
                        name,
                        type: 'pipe',
                        latlngs,
                        length: dist,
                        diam: 300,
                        color: this.pipeColor,
                        weight: this.pipeWeight,
                        vElev: vElev.some(v => v != null) ? vElev : undefined,
                        desc,
                        visible: true,
                        isKml: true
                    });
                    importedCount++;
                }
            }
        });

        document.getElementById('gis-header-title').textContent = `SIG Réseau Importé : ${fileName}`;
        document.getElementById('gis-header-sub').textContent = `${importedCount} éléments géoréférencés chargés depuis le fichier KML`;

        this.renderAllFeatures();
        this.renderAttributeTable();
        this.fitBounds();
        alert(`✅ ${importedCount} ouvrages et tracés KML importés depuis ${fileName}.\nLes anciens éléments ont été remplacés.`);
    }

    parseGeoJson(json, fileName) {
        if (!json.features || !Array.isArray(json.features)) {
            alert("Format GeoJSON invalide : 'features' manquant.");
            return;
        }

        let importedCount = 0;
        json.features.forEach((feat, i) => {
            const props = feat.properties || {};
            const name = props.name || `Élément GeoJSON #${i + 1}`;
            const geom = feat.geometry || {};

            if (geom.type === 'Point' && geom.coordinates) {
                this.networkData.push({
                    id: `geojson_pt_${Date.now()}_${i}`,
                    name,
                    type: props.type || 'reservoir',
                    lat: geom.coordinates[1],
                    lng: geom.coordinates[0],
                    elev: geom.coordinates[2] || 600,
                    visible: true,
                    isKml: true
                });
                importedCount++;
            } else if (geom.type === 'LineString' && geom.coordinates) {
                const latlngs = geom.coordinates.map(c => [c[1], c[0]]);
                const vElev = geom.coordinates.map(c => (c.length >= 3 && c[2] != null && !isNaN(c[2])) ? c[2] : null);
                const dist = this.calculatePolylineDistance(latlngs);
                this.networkData.push({
                    id: `geojson_line_${Date.now()}_${i}`,
                    name,
                    type: 'pipe',
                    latlngs,
                    length: dist,
                    diam: props.diam || 250,
                    color: this.pipeColor,
                    weight: this.pipeWeight,
                    vElev: vElev.some(v => v != null) ? vElev : undefined,
                    visible: true,
                    isKml: true
                });
                importedCount++;
            }
        });

        document.getElementById('gis-header-title').textContent = `SIG Réseau Importé : ${fileName}`;
        document.getElementById('gis-header-sub').textContent = `${importedCount} éléments GeoJSON chargés`;

        this.renderAllFeatures();
        this.renderAttributeTable();
        this.fitBounds();
        alert(`✅ ${importedCount} éléments GeoJSON importés depuis ${fileName}.`);
    }

    exportKml() {
        let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>AquaData Studio - Réseau Hydraulique</name>
    <description>Export SIG du réseau pour Google Earth</description>

    <Style id="style_well">
      <IconStyle>
        <color>ff00ffff</color>
        <scale>1.2</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/shapes/water.png</href></Icon>
      </IconStyle>
    </Style>
    <Style id="style_reservoir">
      <IconStyle>
        <color>ffffaa00</color>
        <scale>1.3</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>
      </IconStyle>
    </Style>
    <Style id="style_pipe">
      <LineStyle>
        <color>ffd4b606</color>
        <width>4</width>
      </LineStyle>
    </Style>
`;

        this.networkData.forEach(feat => {
            if (feat.visible === false) return;
            if (feat.type === 'pipe' && feat.latlngs) {
                const coordStr = feat.latlngs.map(ll => `${ll[1]},${ll[0]},0`).join(' ');
                kml += `
    <Placemark>
      <name>${feat.name}</name>
      <description>Diamètre: ${feat.diam || 300}mm - Longueur: ${Math.round(feat.length || 0)}m</description>
      <styleUrl>#style_pipe</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coordStr}</coordinates>
      </LineString>
    </Placemark>`;
            } else if (feat.lat && feat.lng) {
                kml += `
    <Placemark>
      <name>${feat.name}</name>
      <description>${feat.desc || ''} - Altitude: ${feat.elev || 600}m</description>
      <styleUrl>#style_${feat.type === 'well' ? 'well' : 'reservoir'}</styleUrl>
      <Point>
        <coordinates>${feat.lng},${feat.lat},${feat.elev || 0}</coordinates>
      </Point>
    </Placemark>`;
            }
        });

        kml += `\n  </Document>\n</kml>`;

        const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Reseau_SIG_${new Date().toISOString().slice(0, 10)}.kml`;
        a.click();
    }

    exportGeoJson() {
        const geojson = {
            type: "FeatureCollection",
            features: this.networkData.filter(f => f.visible !== false).map(feat => {
                if (feat.type === 'pipe' && feat.latlngs) {
                    return {
                        type: "Feature",
                        properties: { name: feat.name, type: feat.type, diam: feat.diam, length: feat.length },
                        geometry: {
                            type: "LineString",
                            coordinates: feat.latlngs.map(ll => [ll[1], ll[0]])
                        }
                    };
                } else {
                    return {
                        type: "Feature",
                        properties: { name: feat.name, type: feat.type, elev: feat.elev, desc: feat.desc },
                        geometry: {
                            type: "Point",
                            coordinates: [feat.lng, feat.lat, feat.elev || 0]
                        }
                    };
                }
            })
        };

        const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Reseau_SIG_${new Date().toISOString().slice(0, 10)}.geojson`;
        a.click();
    }

    refresh() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
                if (!this._fittedOnce && this.networkData && this.networkData.length > 0) {
                    this.fitBounds();
                    this._fittedOnce = true;
                }
            }, 60);
            setTimeout(() => {
                this.map.invalidateSize();
            }, 250);
        }
    }

    updateTelemetry(results) {
        if (!results || !this.networkData) return;
        this.lastTelemetryResults = results;
        
        // Update footer or status badge with live telemetry stats
        const footerStatus = document.getElementById('gis-footer-status');
        if (footerStatus && results.total_cost !== undefined) {
            footerStatus.innerHTML = `⚡ Télémétrie Active — Facture 24h: <strong>${(results.total_cost || 0).toFixed(2)} DT</strong> · Volume Total: <strong>${Math.round(results.total_volume_pumped || 0).toLocaleString()} m³</strong> · Conformité: <strong>${results.compliant_reservoirs_count || 12}/12</strong>`;
        }
        
        // Re-render features to show live reservoir filling / pump activity
        this.renderAllFeatures();
    }
}
