/**
 * AquaData Studio v4.0 — Schéma Pédagogique Explicatif du Réseau SCADA AEP
 * Représente la topologie 100% identique au système SCADA réel
 * AUCUN calcul, AUCUNE donnée modifiée.
 */

export function buildExplainerDiagram(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const W = 1450, H = 540;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.cssText = 'width:100%;height:auto;display:block;max-height:560px;';

    // ── DEFS ─────────────────────────────────────────────────────────
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Gradient fond
    const bgG = _el('linearGradient', { id: 'xbg', x1: '0', y1: '0', x2: '1', y2: '1' });
    bgG.innerHTML = `<stop offset="0%" stop-color="#060d1f"/>
        <stop offset="50%" stop-color="#0a1628"/>
        <stop offset="100%" stop-color="#060d1f"/>`;
    defs.appendChild(bgG);

    // Arrow markers
    const colors = { blue: '#06b6d4', green: '#10b981', amber: '#f59e0b', purple: '#c084fc', red: '#ef4444' };
    Object.entries(colors).forEach(([n, c]) => {
        const m = _el('marker', { id: `ax-${n}`, markerWidth: '9', markerHeight: '7', refX: '8', refY: '3.5', orient: 'auto' });
        m.innerHTML = `<polygon points="0 0, 9 3.5, 0 7" fill="${c}"/>`;
        defs.appendChild(m);
    });

    svg.appendChild(defs);

    // ── FOND ──────────────────────────────────────────────────────────
    svg.appendChild(_el('rect', { width: W, height: H, fill: 'url(#xbg)', rx: '10' }));

    // Quadrillage très discret
    for (let gx = 70; gx < W; gx += 70) {
        svg.appendChild(_el('line', { x1: gx, y1: 0, x2: gx, y2: H, stroke: '#1e293b', 'stroke-width': '0.5' }));
    }
    for (let gy = 55; gy < H; gy += 55) {
        svg.appendChild(_el('line', { x1: 0, y1: gy, x2: W, y2: gy, stroke: '#1e293b', 'stroke-width': '0.5' }));
    }

    // ── TITRE ────────────────────────────────────────────────────────
    _text(svg, W / 2, 28, '🗺️  Architecture Hydraulique & Logique SCADA  ⚙️', {
        'font-size': '18', 'font-weight': '700', 'font-family': 'Inter,sans-serif',
        fill: '#e0f2fe', 'text-anchor': 'middle', 'letter-spacing': '1'
    });
    _text(svg, W / 2, 47, 'Vue Pédagogique Synthétique — Nappe & Sources → Stations & R6 → Distribution Réservoirs R1..R10 & Étages alimentés par R1/R2/R3/R5/R6/R7/R10',{
        'font-size': '11', 'font-family': 'Inter,sans-serif', fill: '#64748b', 'text-anchor': 'middle'
    });

    // ── ZONES EXPLICATIVES ────────────────────────────────────────────
    _zone(svg,  15, 65, 340, 455, '#0284c7', '#0284c7', 'ZONE 1 — CAPTATION & FORAGES', '#38bdf8');
    _zone(svg, 370, 65, 330, 455, '#4338ca', '#4338ca', 'ZONE 2 — NOEUD CENTRAL R6 (5000 m³)', '#a5b4fc');
    _zone(svg, 715, 65, 350, 455, '#0e7490', '#0e7490', 'ZONE 3 — RÉSERVOIRS & VALVES RELAIS', '#67e8f9');
    _zone(svg, 1080, 65, 355, 455, '#b45309', '#b45309', 'ZONE 4 — ÉTAGES DE DEMANDE (alimentés par R1/R2/R3/R5/R6/R7/R10)', '#fcd34d');

    // ── 1. FORAGES R500 & STATION R500 ───────────────────────────────
    _bubble(svg, 100, 110, '12 Forages R500\n(F1 .. F12)', '#065f46', '#34d399');
    _arrowPath(svg, 100, 130, 100, 170, '#10b981');
    _drawReservoirBox(svg, 55, 175, 90, 50, '#06b6d4', 'R500\n500 m³');

    // Pompes P1/P2 R500->R6
    _drawMiniPump(svg, 185, 195, true, 'P1/P2');
    _arrowPath(svg, 147, 200, 170, 200, '#06b6d4');
    _arrowPath(svg, 200, 200, 390, 200, '#06b6d4');
    _labelOnPath(svg, 290, 190, 'Refoulement R500→R6', '#38bdf8');

    // ── 2. CHAÎNE AIN BIDHA ─────────────────────────────────────────
    _bubble(svg, 100, 275, 'Forage & Source\nAin Bidha', '#0369a1', '#7dd3fc');
    _arrowPath(svg, 100, 295, 100, 330, '#06b6d4');
    _drawReservoirBox(svg, 55, 335, 90, 45, '#0e7490', 'ST Ain Bidha\n150 m³');
    _drawMiniPump(svg, 185, 357, true, 'P1/P2');
    _arrowPath(svg, 147, 357, 170, 357, '#06b6d4');
    _drawReservoirBox(svg, 215, 335, 75, 45, '#0e7490', 'ST Zaafrane\n120 m³');
    _arrowPath(svg, 200, 357, 215, 357, '#06b6d4');
    _drawReservoirBox(svg, 295, 335, 60, 45, '#0e7490', 'Birchagroun\n100 m³');
    _arrowPath(svg, 290, 357, 295, 357, '#06b6d4');
    _arrowPath(svg, 355, 357, 390, 250, '#06b6d4');

    // ── 3. CHAÎNE SK10 ──────────────────────────────────────────────
    _bubble(svg, 100, 435, 'Forages SK10\n(SK1..SK3)', '#065f46', '#34d399');
    _arrowPath(svg, 100, 455, 100, 480, '#06b6d4');
    _drawReservoirBox(svg, 55, 482, 90, 38, '#14b8a6', 'ST SK10\n100 m³');
    _drawMiniPump(svg, 185, 500, true, 'P_SK10');
    _arrowPath(svg, 147, 500, 170, 500, '#06b6d4');
    _arrowPath(svg, 200, 500, 390, 280, '#06b6d4');

    // ── 4. RÉSERVOIR CENTRAL R6 ──────────────────────────────────────
    _drawReservoirBox(svg, 410, 180, 160, 130, '#4338ca', '🏛️ R6 CENTRAL\n5000 m³', true);

    // Source Romaine → R1 (gravitaire)
    _bubble(svg, 490, 360, 'Source Romaine\n(Gravitaire)', '#3b0764', '#c084fc');

    // ── 5. SORTIES R6 ────────────────────────────────────────────────
    // R6 -> E5 (Demande directe)
    _arrowPath(svg, 570, 200, 1100, 200, '#f59e0b');
    _labelOnPath(svg, 830, 190, 'Alimentation étage alimenté par R6', '#f59e0b');

    // R6 -> VG R6->R5 -> R5 -> E4
    _arrowPath(svg, 570, 240, 730, 240, '#c084fc');
    _drawValveIcon(svg, 735, 240, 'VG R6→R5');
    _arrowPath(svg, 755, 240, 800, 240, '#c084fc');
    _drawReservoirBox(svg, 805, 218, 90, 45, '#f59e0b', 'R5\n1500 m³');
    _arrowPath(svg, 895, 240, 1100, 240, '#f59e0b');
    _labelOnPath(svg, 1000, 232, 'alim. R5', '#f59e0b');

    // R6 -> Pompes R6->R1 -> R1 -> E1
    _arrowPath(svg, 570, 290, 725, 290, '#06b6d4');
    _drawMiniPump(svg, 740, 290, true, 'P1/P2 R6→R1');
    _arrowPath(svg, 758, 290, 800, 290, '#06b6d4');
    _drawReservoirBox(svg, 805, 268, 90, 45, '#10b981', 'R1\n500 m³');
    _arrowPath(svg, 895, 290, 1100, 290, '#f59e0b');
    _labelOnPath(svg, 1000, 282, 'alim. R1', '#f59e0b');

    // Source Romaine -> R1
    _arrowPath(svg, 570, 370, 805, 300, '#c084fc');

    // R1 -> VG R1->R7 -> R7 -> E6
    _arrowPath(svg, 850, 313, 850, 365, '#c084fc');
    _drawValveIcon(svg, 850, 370, 'VG R1→R7');
    _arrowPath(svg, 850, 385, 850, 410, '#c084fc');
    _drawReservoirBox(svg, 805, 412, 90, 45, '#f43f5e', 'R7\n1500 m³');
    _arrowPath(svg, 895, 435, 1100, 435, '#f59e0b');
    _labelOnPath(svg, 1000, 427, 'alim. R7', '#f59e0b');

    // R1 -> Pompes R1->R2 -> R2 -> E2
    _arrowPath(svg, 895, 280, 950, 280, '#06b6d4');
    _drawMiniPump(svg, 962, 280, true, 'P_R2');
    _arrowPath(svg, 977, 280, 1000, 280, '#06b6d4');
    _drawReservoirBox(svg, 1002, 260, 65, 40, '#a855f7', 'R2\n500m³');
    _arrowPath(svg, 1067, 280, 1100, 335, '#f59e0b');
    _labelOnPath(svg, 1084, 318, 'alim. R2', '#f59e0b');

    // R1 -> Pompes R1->R3 -> R3 -> E3 + VG R3->R10 -> R10 -> E7
    _arrowPath(svg, 895, 300, 950, 300, '#06b6d4');
    _drawMiniPump(svg, 962, 300, true, 'P_R3');
    _arrowPath(svg, 977, 300, 1000, 300, '#06b6d4');
    _drawReservoirBox(svg, 1002, 305, 65, 40, '#6366f1', 'R3\n500m³');
    _arrowPath(svg, 1067, 320, 1100, 385, '#f59e0b');
    _labelOnPath(svg, 1090, 354, 'R3', '#f59e0b');

    // R3 -> VG R3->R10 -> R10 -> E7
    _arrowPath(svg, 1035, 345, 1035, 455, '#c084fc');
    _drawValveIcon(svg, 1035, 460, 'VG R3→R10');
    _arrowPath(svg, 1035, 475, 1035, 490, '#c084fc');
    _drawReservoirBox(svg, 995, 492, 80, 40, '#0284c7', 'R10\n1000m³');
    _arrowPath(svg, 1075, 510, 1100, 485, '#f59e0b');

    // ── 6. ÉTAGES DE DEMANDE E1..E7 ───────────────────────────────────
    const demands = [
        { feed: 'R6',  name: 'Étage alimenté par R6\n(197.7 m³/h)', y: 200, col: '#f59e0b' },
        { feed: 'R5',  name: 'Étage alimenté par R5\n(116.3 m³/h)', y: 240, col: '#f59e0b' },
        { feed: 'R1',  name: 'Étage alimenté par R1\n(355.7 m³/h)', y: 290, col: '#f59e0b' },
        { feed: 'R2',  name: 'Étage alimenté par R2\n(65.8 m³/h)',  y: 335, col: '#f59e0b' },
        { feed: 'R3',  name: 'Étage alimenté par R3\n(28.3 m³/h)',  y: 385, col: '#f59e0b' },
        { feed: 'R7',  name: 'Étage alimenté par R7\n(72.6 m³/h)',  y: 435, col: '#f59e0b' },
        { feed: 'R10', name: 'Étage alimenté par R10\n(21.9 m³/h)', y: 485, col: '#f59e0b' },
    ];

    demands.forEach(d => {
        _drawHexDemand(svg, 1120, d.y, d.feed, d.col);
        _text(svg, 1155, d.y + 2, d.name, { 'font-size': '10', 'font-weight': '600', 'font-family': 'Inter,sans-serif', fill: '#fcd34d' });
    });

    // ── LÉGENDE DE COULEURS ───────────────────────────────────────────
    const leg = [
        { col: '#06b6d4', txt: '━ Conduite Refoulement (Pression)' },
        { col: '#c084fc', txt: '━ Conduite Gravitaire' },
        { col: '#f59e0b', txt: '━ Distribution Demande' },
        { col: '#10b981', txt: '● Pompe Imbergée / Relais' },
        { col: '#c084fc', txt: '◆ Vanne Gravitaire' },
        { col: '#4338ca', txt: '■ Réservoir / Station' },
    ];
    leg.forEach((l, i) => {
        const lx = 20 + i * 235, ly = 525;
        _text(svg, lx, ly, l.txt, { 'font-size': '9.5', 'font-family': 'Inter,sans-serif', fill: '#94a3b8' });
    });

    container.innerHTML = '';
    container.appendChild(svg);
}

// ── HELPER SVG BUILDERS ───────────────────────────────────────────
function _el(tag, attrs = {}) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
    return e;
}

function _text(svg, x, y, txt, attrs = {}) {
    const lines = txt.split('\n');
    if (lines.length === 1) {
        const t = _el('text', { x, y, ...attrs });
        t.textContent = txt;
        svg.appendChild(t);
    } else {
        lines.forEach((line, i) => {
            const t = _el('text', { x, y: y + i * 12, ...attrs });
            t.textContent = line;
            svg.appendChild(t);
        });
    }
}

function _zone(svg, x, y, w, h, borderCol, fillCol, title, textCol) {
    svg.appendChild(_el('rect', { x, y, width: w, height: h, rx: '8',
        fill: 'none', stroke: borderCol, 'stroke-width': '1.2', 'stroke-dasharray': '6 3', opacity: '0.45' }));
    _text(svg, x + w / 2, y + 16, title, {
        'text-anchor': 'middle', 'font-size': '10', 'font-weight': '700',
        'font-family': 'Inter,sans-serif', fill: textCol, 'letter-spacing': '0.5'
    });
}

function _arrowPath(svg, x1, y1, x2, y2, col) {
    const key = col.includes('10b981') ? 'green' : col.includes('c084fc') ? 'purple' : col.includes('f59e0b') ? 'amber' : 'blue';
    svg.appendChild(_el('path', {
        d: `M${x1},${y1} L${x2},${y2}`,
        fill: 'none', stroke: col, 'stroke-width': '2',
        'marker-end': `url(#ax-${key})`, 'stroke-linecap': 'round'
    }));
}

function _labelOnPath(svg, x, y, label, col) {
    _text(svg, x, y, label, { 'font-size': '8.5', 'font-family': 'Inter,sans-serif', fill: col, 'text-anchor': 'middle', 'font-weight': '600' });
}

function _bubble(svg, cx, cy, text, bgCol, textCol) {
    const lines = text.split('\n');
    const bw = Math.max(...lines.map(l => l.length)) * 5.8 + 14;
    const bh = lines.length * 12 + 8;
    svg.appendChild(_el('rect', { x: cx - bw / 2, y: cy - bh / 2, width: bw, height: bh, rx: '6',
        fill: bgCol, stroke: textCol, 'stroke-width': '1.2', opacity: '0.9' }));
    lines.forEach((line, i) => {
        _text(svg, cx, cy - (lines.length - 1) * 6 + i * 12, line, {
            'text-anchor': 'middle', 'font-size': '8.5', 'font-weight': '700',
            'font-family': 'Inter,sans-serif', fill: textCol
        });
    });
}

function _drawMiniPump(svg, cx, cy, active, label = '') {
    const col = active ? '#06b6d4' : '#b91c1c';
    svg.appendChild(_el('circle', { cx, cy, r: '11', fill: active ? '#06283b' : '#2a0a0a', stroke: col, 'stroke-width': '1.8' }));
    svg.appendChild(_el('circle', { cx, cy, r: '6', fill: 'none', stroke: active ? '#38bdf8' : '#ef4444', 'stroke-width': '1.5' }));
    for (let a = 0; a < 4; a++) {
        const ang = (Math.PI / 2) * a;
        svg.appendChild(_el('line', {
            x1: cx, y1: cy,
            x2: cx + 5.5 * Math.cos(ang), y2: cy + 5.5 * Math.sin(ang),
            stroke: active ? '#38bdf8' : '#ef4444', 'stroke-width': '1.5', 'stroke-linecap': 'round'
        }));
    }
    if (label) {
        _text(svg, cx, cy + 19, label, { 'text-anchor': 'middle', 'font-size': '7.5', 'font-weight': '600', 'font-family': 'Inter,sans-serif', fill: '#7dd3fc' });
    }
}

function _drawReservoirBox(svg, x, y, w, h, borderCol, label, isCentral = false) {
    svg.appendChild(_el('rect', { x, y, width: w, height: h, rx: '5',
        fill: '#080f1e', stroke: borderCol, 'stroke-width': isCentral ? '2.5' : '1.8' }));
    // Wave water line
    svg.appendChild(_el('rect', { x: x + 2, y: y + h / 2, width: w - 4, height: h / 2 - 2, rx: '3', fill: borderCol, opacity: '0.35' }));
    label.split('\n').forEach((line, i) => {
        _text(svg, x + w / 2, y + h / 2 - 3 + i * 11, line, {
            'text-anchor': 'middle', 'font-size': isCentral ? '10' : '8.5', 'font-weight': '700',
            'font-family': 'Inter,sans-serif', fill: '#e2e8f0'
        });
    });
}

function _drawValveIcon(svg, cx, cy, label = '') {
    svg.appendChild(_el('polygon', {
        points: `${cx},${cy-10} ${cx+10},${cy} ${cx},${cy+10} ${cx-10},${cy}`,
        fill: '#1e0836', stroke: '#c084fc', 'stroke-width': '1.8'
    }));
    if (label) {
        _text(svg, cx, cy + 18, label, { 'text-anchor': 'middle', 'font-size': '7.5', 'font-weight': '600', 'font-family': 'Inter,sans-serif', fill: '#c084fc' });
    }
}

function _drawHexDemand(svg, cx, cy, label, col) {
    const r = 16;
    const pts = Array.from({ length: 6 }, (_, i) => {
        const a = Math.PI / 3 * i - Math.PI / 6;
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');
    svg.appendChild(_el('polygon', { points: pts, fill: '#140c00', stroke: col, 'stroke-width': '2' }));
    _text(svg, cx, cy + 4, label, { 'text-anchor': 'middle', 'font-size': '9.5', 'font-weight': '800', 'font-family': 'Inter,sans-serif', fill: col });
}
