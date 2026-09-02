/**
 * AquaData Studio — INTRO CINÉMATIQUE plein écran ("L'eau. Les données. L'intelligence.")
 * Remplace l'ancienne carte WELCOME par un film d'animation Canvas 2D, fond noir,
 * découpé en scènes chronométrées (storyboard 15s) :
 *   0–2s    Couronne de splash — "L'eau... source de vie, énergie et mouvement."
 *   2–4s    Vortex d'eau       — "Elle circule, elle s'adapte, elle façonne notre avenir."
 *   4–6s    Splash figuratif   — "De chaque goutte naît une idée."
 *   6–8s    Cerveau d'eau      — "L'intelligence transforme les données en décisions."
 *   8–10s   Cerveau + équations— "Modéliser. Analyser. Optimiser."
 *   10–12s  Carnet sépia       — "Les équations guident, l'expérience valide."
 *   12–14s  Carnet + stylo     — "La connaissance construit des solutions durables."
 *   14–15s  Goutte sombre      — "L'eau. Les données. L'intelligence. AquaData Studio."
 *   15s+    Sphère d'énergie plasma (climax) → WELCOME — AQUADATA STUDIO
 */

/* --- Contrôleur du Pitch Deck (repris de welcome3d.js pour garder le deck fonctionnel) --- */
function initCanvaPresentationModal() {
    if (window.__canvaModalInitialized) return;
    window.__canvaModalInitialized = true;
    const btnOpen = document.getElementById('btn-open-canva-presentation');
    const modal = document.getElementById('canva-presentation-modal');
    const btnClose = document.getElementById('btn-close-canva-modal');
    const btnPrev = document.getElementById('canva-prev-slide');
    const btnNext = document.getElementById('canva-next-slide');
    const indicatorContainer = document.getElementById('canva-slide-indicators');
    const slides = document.querySelectorAll('.canva-slide');
    if (!modal || !slides.length) return;
    let currentSlide = 0;
    function showSlide(index) {
        currentSlide = (index + slides.length) % slides.length;
        slides.forEach((s, idx) => s.classList.toggle('active', idx === currentSlide));
        if (indicatorContainer) {
            const dots = indicatorContainer.querySelectorAll('.canva-dot');
            dots.forEach((d, idx) => d.classList.toggle('active', idx === currentSlide));
        }
    }
    if (indicatorContainer) {
        indicatorContainer.innerHTML = '';
        slides.forEach((_, idx) => {
            const dot = document.createElement('span');
            dot.className = `canva-dot ${idx === 0 ? 'active' : ''}`;
            dot.addEventListener('click', () => showSlide(idx));
            indicatorContainer.appendChild(dot);
        });
    }
    btnOpen?.addEventListener('click', () => { modal.style.display = 'flex'; showSlide(0); });
    btnClose?.addEventListener('click', () => { modal.style.display = 'none'; });
    btnPrev?.addEventListener('click', () => showSlide(currentSlide - 1));
    btnNext?.addEventListener('click', () => showSlide(currentSlide + 1));
    window.addEventListener('keydown', (e) => {
        if (modal.style.display === 'flex') {
            if (e.key === 'ArrowRight' || e.key === ' ') showSlide(currentSlide + 1);
            if (e.key === 'ArrowLeft') showSlide(currentSlide - 1);
            if (e.key === 'Escape') modal.style.display = 'none';
        }
    });
}

export function initCinematicIntro() {
    initCanvaPresentationModal();

    const overlay = document.getElementById('intro-splash-overlay');
    const canvas = document.getElementById('intro-cinema-canvas');
    const captionEl = document.getElementById('intro-caption');
    const finalEl = document.getElementById('intro-final-welcome');
    if (!overlay || !canvas) return { destroy() {}, restart() {} };

    const ctx = canvas.getContext('2d');
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0, H = 0, DPR = 1;
    let raf = 0, running = false, t0 = 0, timeSec = 0;
    let S = {};              // état des scènes (particules absolues)
    let brainPts = null;     // points normalisés du cerveau (partagés entre scènes)
    let paper = null;        // décor carnet (coordonnées normalisées)
    let captionIdx = -1, captionTimer = 0, welcomeShown = false;

    // ---------- utilitaires ----------
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const env = (t, d, fi, fo) => clamp(Math.min(t / fi, (d - t) / fo), 0, 1);
    const TAU = 6.28318;

    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, 1.5);
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        S = {}; // les particules absolues sont reconstruites à la volée
    }

    // ---------- goutte d'eau lumineuse ----------
    function drawDrop(x, y, r, alpha) {
        if (alpha <= 0.01 || r <= 0) return;
        const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 2);
        g.addColorStop(0, `rgba(235,250,255,${0.95 * alpha})`);
        g.addColorStop(0.45, `rgba(150,215,250,${0.7 * alpha})`);
        g.addColorStop(1, 'rgba(60,140,220,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r * 2, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(240,252,255,${0.9 * alpha})`;
        ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill();
    }

    // ================================================================
    // SCÈNE 1 (0–2s) — Goutte qui tombe + couronne de splash
    // ================================================================
    function splashScene(t, a) {
        const cx = W / 2, wy = H * 0.66;
        ctx.globalAlpha = a;
        let g = ctx.createRadialGradient(cx, wy, 0, cx, wy, W * 0.35);
        g.addColorStop(0, 'rgba(70,140,190,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(140,200,235,0.28)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W * 0.06, wy); ctx.lineTo(W * 0.94, wy); ctx.stroke();
        if (t < 0.5) {
            const p = t / 0.5;
            const y = -H * 0.06 + (wy + H * 0.06) * p * p;
            ctx.strokeStyle = 'rgba(170,220,250,0.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(cx, y - H * 0.1 * p); ctx.lineTo(cx, y); ctx.stroke();
            drawDrop(cx, y, 7 + 4 * p, 1);
        } else {
            if (!S.splash) buildSplash(cx, wy);
            drawSplashFx(t - 0.5, cx, wy);
        }
        ctx.globalAlpha = 1;
    }

    function buildSplash(cx, wy) {
        S.splash = { jets: [], drops: [], rip: [0, 0.14, 0.3] };
        for (let i = 0; i < 26; i++) {
            const k = i / 25;
            const ang = -Math.PI / 2 + (k - 0.5) * 2.3;
            const spd = 330 + 130 * Math.sin(k * Math.PI); // bords plus hauts => couronne
            S.splash.jets.push({ vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd });
        }
        for (let i = 0; i < 80; i++) {
            const ang = -Math.PI / 2 + rand(-1.25, 1.25);
            const spd = rand(90, 430);
            S.splash.drops.push({ x: cx + rand(-8, 8), y: wy - 2, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: rand(1, 2.8), d: rand(0, 0.25) });
        }
    }

    function drawSplashFx(ts, cx, wy) {
        const g = 950;
        for (const j of S.splash.jets) {
            for (let s = 0; s < 9; s++) {
                const tt = ts - s * 0.018;
                if (tt <= 0) continue;
                const x = cx + j.vx * tt;
                const y = wy - 2 + j.vy * tt + 0.5 * g * tt * tt;
                if (y > wy + 4) continue;
                drawDrop(x, y, Math.max(0.8, 2.2 - s * 0.12), clamp(1 - ts * 0.55, 0, 1));
            }
        }
        for (const d of S.splash.drops) {
            const tt = ts - d.d;
            if (tt <= 0) continue;
            const x = d.x + d.vx * tt;
            const y = d.y + d.vy * tt + 0.5 * g * tt * tt;
            if (y > wy + 6) continue;
            drawDrop(x, y, d.r, clamp(1 - ts * 0.5, 0, 1));
        }
        for (const off of S.splash.rip) {
            const tt = ts - off;
            if (tt <= 0) continue;
            const rr = 30 + tt * 300;
            ctx.strokeStyle = `rgba(160,215,245,${clamp(0.5 - tt * 0.4, 0, 0.5)})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(cx, wy + 2, rr, rr * 0.22, 0, 0, TAU); ctx.stroke();
        }
    }

    // ================================================================
    // SCÈNE 2 (2–4s) — Vortex d'eau
    // ================================================================
    function vortexScene(t, a, dt) {
        const cx = W / 2, cy = H * 0.47, Rm = Math.min(W, H) * 0.38;
        if (!S.vortex) {
            S.vortex = [];
            for (let i = 0; i < 340; i++) {
                S.vortex.push({ ang: rand(0, TAU), r: Rm * Math.sqrt(rand(0.05, 1)), px: 0, py: 0, sz: rand(0.6, 2.2) });
            }
        }
        ctx.globalAlpha = a;
        let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rm * 1.2);
        g.addColorStop(0, 'rgba(30,70,110,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rm * 0.22);
        g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, Rm * 0.22, 0, TAU); ctx.fill();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const p of S.vortex) {
            const f = p.r / Rm;
            p.ang += (0.6 + 2.6 * (1 - f)) * dt;
            p.r -= (26 + 150 * f) * dt;
            if (p.r <= 6) { p.r = Rm * Math.sqrt(rand(0.6, 1)); p.ang = rand(0, TAU); p.px = 0; p.py = 0; }
            const x = cx + Math.cos(p.ang) * p.r;
            const y = cy + Math.sin(p.ang) * p.r * 0.62; // perspective elliptique (disque 3D)
            if (p.px) {
                ctx.strokeStyle = `rgba(${(170 - 60 * f) | 0},${(215 - 40 * f) | 0},255,${0.12 + 0.5 * (1 - f)})`;
                ctx.lineWidth = p.sz;
                ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(x, y); ctx.stroke();
            }
            p.px = x; p.py = y;
        }
        ctx.restore(); ctx.globalAlpha = 1;
    }

    // ================================================================
    // SCÈNE 3 (4–6s) — Splash figuratif ("de chaque goutte naît une idée")
    // ================================================================
    function figureScene(t, a, dt) {
        const cx = W / 2, wy = H * 0.7;
        ctx.globalAlpha = a;
        let g0 = ctx.createRadialGradient(cx, wy, 0, cx, wy, W * 0.32);
        g0.addColorStop(0, 'rgba(70,140,190,0.16)'); g0.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(140,200,235,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W * 0.06, wy); ctx.lineTo(W * 0.94, wy); ctx.stroke();
        if (!S.fig) {
            S.fig = { drops: [], emit: [] };
            S.fig.emit.push({ x: cx, y: wy, vx: 0, vy: -520, from: 0.05, to: 0.55, rate: 0.008, acc: 0, r: 2.2, sp: 0.12 });
            for (let i = 0; i < 7; i++) {
                const k = (i / 6 - 0.5) * 2;
                S.fig.emit.push({ x: cx, y: wy, vx: k * rand(130, 260), vy: -rand(430, 530), from: 0.55, to: 1.15, rate: 0.012, acc: 0, r: rand(1, 2.2), sp: 0 });
            }
        }
        const g = 950;
        for (const e of S.fig.emit) {
            if (t < e.from || t > e.to) continue;
            e.acc += dt;
            while (e.acc > e.rate) {
                e.acc -= e.rate;
                S.fig.drops.push({ x: e.x + rand(-3, 3), y: e.y, vx: e.vx * rand(0.9, 1.1) + rand(-e.sp, e.sp) * 400, vy: e.vy * rand(0.92, 1.05), r: e.r * rand(0.7, 1.3), born: t });
            }
        }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = S.fig.drops.length - 1; i >= 0; i--) {
            const d = S.fig.drops[i];
            const age = t - d.born;
            d.vy += g * dt; d.x += d.vx * dt; d.y += d.vy * dt;
            const al = clamp(1 - age * 0.55, 0, 1) * clamp((wy + 8 - d.y) / 40, 0, 1);
            if (al <= 0 || d.y > wy + 10) { S.fig.drops.splice(i, 1); continue; }
            drawDrop(d.x, d.y, d.r, al);
        }
        ctx.restore();
        if (t > 0.05 && t < 1.3) { // colonne lumineuse centrale
            const hgt = clamp((t - 0.05) * 950, 0, H * 0.34);
            const grd = ctx.createLinearGradient(cx, wy, cx, wy - hgt);
            grd.addColorStop(0, 'rgba(190,230,255,0.7)'); grd.addColorStop(1, 'rgba(120,190,240,0)');
            ctx.strokeStyle = grd; ctx.lineWidth = 7; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(cx, wy); ctx.lineTo(cx, wy - hgt); ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    // ================================================================
    // SCÈNES 4–7 — Cerveau d'eau (nuage de particules, partagé)
    // ================================================================
    function buildBrain() {
        brainPts = [];
        for (let i = 0; i < 680; i++) {
            const th = rand(0, TAU), rr = Math.sqrt(Math.random());
            let x = Math.cos(th) * rr, y = Math.sin(th) * rr * 0.74;
            const f = 0.14 * Math.sin(th * 5 + rr * 11) * (1 - rr * 0.4); // plis corticaux
            x *= 1 + f; y *= 1 + f * 0.8;
            if (Math.abs(y) < 0.05 && Math.random() < 0.75) continue; // fissure inter-hémisphères
            brainPts.push({ x, y, ap: rand(0, 1.3), sz: rand(0.6, 1.9), sh: rand(2, 5), ph: rand(0, TAU), bright: Math.random() < 0.12 });
        }
    }

    function drawBrainAt(t, x0, y0, aScale, alpha, mode) {
        if (!brainPts) buildBrain();
        const aR = Math.min(W, H) * 0.2 * aScale;
        ctx.save();
        if (mode !== 'dark') ctx.globalCompositeOperation = 'lighter';
        for (const p of brainPts) {
            if (t < p.ap) continue;
            const shim = 0.55 + 0.45 * Math.sin(timeSec * p.sh + p.ph);
            const al = clamp((t - p.ap) / 0.5, 0, 1) * alpha * shim;
            if (al <= 0.02) continue;
            if (mode === 'dark') ctx.fillStyle = `rgba(26,46,80,${al * 0.8})`;
            else ctx.fillStyle = p.bright ? `rgba(235,250,255,${al})` : `rgba(140,205,250,${al * 0.85})`;
            ctx.beginPath(); ctx.arc(x0 + p.x * aR, y0 + p.y * aR, p.sz, 0, TAU); ctx.fill();
        }
        ctx.restore();
    }

    // SCÈNE 5 (8–10s) — Cerveau + équations hydrauliques flottantes
    function brainScene(t, a) {
        ctx.globalAlpha = a;
        const g = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, Math.min(W, H) * 0.42);
        g.addColorStop(0, 'rgba(40,90,140,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        drawBrainAt(t, W / 2, H * 0.46, 1, 0.95, 'light');
        if (!S.orb) { S.orb = []; for (let i = 0; i < 26; i++) S.orb.push({ a: rand(0, TAU), r: rand(0.55, 1.15), sp: rand(0.3, 0.9) * (Math.random() < 0.5 ? 1 : -1), sz: rand(0.8, 2) }); }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const o of S.orb) {
            o.a += o.sp * 0.016;
            const rr = Math.min(W, H) * 0.2 * o.r;
            drawDrop(W / 2 + Math.cos(o.a) * rr * 1.25, H * 0.46 + Math.sin(o.a) * rr * 0.8, o.sz, 0.6);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    function eqScene(t, a) {
        ctx.globalAlpha = a;
        drawBrainAt(t + 2, W / 2 - W * 0.06, H * 0.46, 0.92, 0.6, 'light');
        const EQ = [
            ['H = A·v', -0.30, -0.20],
            ['ΣQ_in = ΣQ_out', 0.20, -0.24],
            ['Σ = z + p/ρg', 0.26, -0.02],
            ['ΔH = f·(L/D)·v²/2g', 0.22, 0.16],
            ['E = ρgQHηt', -0.28, 0.14],
        ];
        const fs = clamp(W * 0.017, 13, 24);
        ctx.font = `italic ${fs}px Georgia, serif`;
        ctx.textAlign = 'center';
        EQ.forEach(([txt, dx, dy], i) => {
            const lt = t - (0.15 + i * 0.2);
            if (lt <= 0) return;
            const al = clamp(lt / 0.5, 0, 1) * 0.9;
            ctx.fillStyle = `rgba(208,228,252,${al})`;
            ctx.fillText(txt, W / 2 + dx * W * 0.8, H * 0.46 + dy * H * 0.8 + Math.sin(timeSec * 1.1 + i) * 3);
        });
        ctx.globalAlpha = 1;
    }

    // SCÈNES 6–7 (10–14s) — Carnet sépia
    function buildPaper() {
        paper = { lines: [], cyl: { x: 0.62, y: 0.24, w: 0.09, h: 0.16 } };
        for (let i = 0; i < 9; i++) {
            const y = 0.16 + i * 0.075;
            const segs = [];
            let x = 0.08 + rand(0, 0.05);
            const xe = 0.52 + rand(-0.04, 0.1);
            while (x < xe) {
                const nx = Math.min(xe, x + rand(0.01, 0.035));
                segs.push([x, y + rand(-0.006, 0.006), nx, y + rand(-0.006, 0.006)]);
                x = nx + rand(0.002, 0.008);
            }
            paper.lines.push(segs);
        }
    }

    function drawPaperBase(t, alpha) {
        if (!paper) buildPaper();
        ctx.globalAlpha = alpha;
        let g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#e9dcbc'); g.addColorStop(0.45, '#d8c39a'); g.addColorStop(0.8, '#8a7248'); g.addColorStop(1, '#241c10');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        g = ctx.createRadialGradient(W * 0.3, H * 0.35, 0, W * 0.3, H * 0.35, W * 0.5);
        g.addColorStop(0, 'rgba(255,240,200,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(58,44,26,0.55)'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
        paper.lines.forEach((segs, li) => {
            ctx.beginPath();
            segs.forEach(([x1, y1, x2, y2], si) => {
                const X1 = x1 * W, Y1 = y1 * H + Math.sin(x1 * 40 + li) * 1.5;
                const X2 = x2 * W, Y2 = y2 * H + Math.sin(x2 * 40 + li) * 1.5;
                if (si === 0) ctx.moveTo(X1, Y1);
                ctx.lineTo(X2, Y2);
            });
            ctx.stroke();
        });
        const c = paper.cyl, cxp = c.x * W, cyp = c.y * H, cw = c.w * W, ch = c.h * H;
        ctx.strokeStyle = 'rgba(50,38,22,0.6)'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.ellipse(cxp, cyp - ch / 2, cw / 2, ch * 0.09, 0, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cxp, cyp + ch / 2, cw / 2, ch * 0.09, 0, 0, TAU); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cxp - cw / 2, cyp - ch / 2); ctx.lineTo(cxp - cw / 2, cyp + ch / 2);
        ctx.moveTo(cxp + cw / 2, cyp - ch / 2); ctx.lineTo(cxp + cw / 2, cyp + ch / 2);
        ctx.stroke();
        drawBrainAt(t + 2, W * 0.78, H * 0.45, 0.72, 0.5, 'dark'); // cerveau d'eau sur le carnet
        ctx.globalAlpha = 1;
    }

    function paperScene1(t, a) { drawPaperBase(t, a); }

    function paperScene2(t, a) {
        drawPaperBase(t, a);
        ctx.globalAlpha = a;
        const px = W * 0.36, py = H * 0.78, pl = H * 0.3; // stylo plume
        ctx.save();
        ctx.translate(px, py); ctx.rotate(-0.5);
        let g = ctx.createLinearGradient(0, -7, 0, 7);
        g.addColorStop(0, '#3a3a44'); g.addColorStop(0.5, '#15151c'); g.addColorStop(1, '#000');
        ctx.fillStyle = g; roundRect(-pl, -6.5, pl, 13, 6); ctx.fill();
        ctx.fillStyle = '#565664'; roundRect(-pl, -6.5, pl * 0.16, 13, 6); ctx.fill();
        ctx.fillStyle = '#c9c9d4';
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(16, -1.5); ctx.lineTo(16, 1.5); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#0c0c10';
        ctx.beginPath(); ctx.moveTo(16, -1.2); ctx.lineTo(24, 0); ctx.lineTo(16, 1.2); ctx.closePath(); ctx.fill();
        ctx.restore();
        const ink = clamp((t - 0.3) / 1.2, 0, 1); // trait d'encre animé
        if (ink > 0) {
            ctx.strokeStyle = 'rgba(25,20,40,0.8)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
            ctx.beginPath();
            const x0 = W * 0.12, x1 = x0 + (W * 0.34 - W * 0.12) * ink;
            ctx.moveTo(x0, H * 0.7);
            ctx.bezierCurveTo(x0 + (x1 - x0) * 0.3, H * 0.685, x0 + (x1 - x0) * 0.6, H * 0.715, x1, H * 0.7);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    // ================================================================
    // SCÈNE 8 (14–15.5s) — Goutte sombre qui se dissout
    // ================================================================
    function darkDropScene(t, a, dt) {
        const cx = W / 2, wy = H * 0.6;
        ctx.globalAlpha = a * 0.85;
        if (t < 0.35) {
            const p = t / 0.35;
            drawDrop(cx, -H * 0.04 + (wy + H * 0.04) * p * p, 5 + 2 * p, 0.8);
        } else {
            if (!S.dark) {
                S.dark = [];
                for (let i = 0; i < 46; i++) {
                    const ang = -Math.PI / 2 + rand(-1.1, 1.1);
                    const spd = rand(60, 260);
                    S.dark.push({ x: cx, y: wy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: rand(0.8, 2.2), born: 0.35 + rand(0, 0.1) });
                }
            }
            const g = 900;
            for (const d of S.dark) {
                const age = t - d.born;
                if (age < 0) continue;
                d.vy += g * dt; d.x += d.vx * dt; d.y += d.vy * dt;
                const al = clamp(0.8 - age * 0.8, 0, 1) * clamp((wy + 10 - d.y) / 40, 0, 1);
                if (al > 0 && d.y < wy + 10) drawDrop(d.x, d.y, d.r, al);
            }
            const rr = 20 + (t - 0.35) * 160;
            ctx.strokeStyle = `rgba(120,160,190,${clamp(0.35 - (t - 0.35) * 0.4, 0, 0.35)})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.ellipse(cx, wy + 2, rr, rr * 0.2, 0, 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    // ================================================================
    // SCÈNE 9 (15s+) — Sphère d'énergie plasma (climax) → WELCOME
    // ================================================================
    function plasmaScene(t, a) {
        const cx = W / 2, cy = H * 0.45;
        const R = Math.min(W, H) * 0.24 * (1 + 0.02 * Math.sin(timeSec * 3.2));
        ctx.globalAlpha = a;
        let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 3.2);
        g.addColorStop(0, 'rgba(88,14,120,0.5)'); g.addColorStop(0.5, 'rgba(48,8,84,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(120,40,160,0.07)'; ctx.lineWidth = 1; // grille discrète
        for (let x = (timeSec * 8) % 40; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        // sphère
        g = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.1, cx, cy, R);
        g.addColorStop(0, 'rgba(90,140,255,0.9)');
        g.addColorStop(0.55, 'rgba(30,40,160,0.85)');
        g.addColorStop(1, 'rgba(60,10,110,0.4)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
        // wireframe
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.8;
        for (let i = 0; i < 14; i++) {
            const rot = (i / 14) * Math.PI + timeSec * 0.05;
            ctx.beginPath(); ctx.ellipse(cx, cy, R, R * (0.18 + 0.7 * Math.abs(Math.sin(rot * 1.7))), rot, 0, TAU); ctx.stroke();
        }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        // boucles d'énergie
        for (let i = 0; i < 9; i++) {
            const rot = timeSec * (0.2 + 0.1 * (i % 3)) + i * 0.7;
            ctx.strokeStyle = i % 2 ? 'rgba(236,72,253,0.3)' : 'rgba(168,85,247,0.28)';
            ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.ellipse(cx, cy, R * (1.12 + 0.1 * (i % 4)), R * (0.35 + 0.14 * (i % 3)), rot, 0, TAU); ctx.stroke();
        }
        // éclairs plasma (flickering)
        for (let b = 0; b < 15; b++) {
            const ang = rand(0, TAU);
            let x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
            ctx.strokeStyle = 'rgba(236,121,249,0.55)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
            ctx.shadowColor = '#e879f9'; ctx.shadowBlur = 14;
            ctx.beginPath(); ctx.moveTo(x, y);
            const len = 3 + (rand(0, 3) | 0);
            for (let sg = 0; sg < len; sg++) {
                x += Math.cos(ang) * R * 0.12 + rand(-R * 0.09, R * 0.09);
                y += Math.sin(ang) * R * 0.12 + rand(-R * 0.09, R * 0.09);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore(); ctx.globalAlpha = 1;
        if (t >= 3 && !welcomeShown && finalEl) { welcomeShown = true; finalEl.classList.add('show'); }
    }

    // ================================================================
    // SÉQUENCEUR
    // ================================================================
    const SCENES = [
        { d: 2.0, cap: "L'eau... source de vie, énergie et mouvement.", draw: splashScene },
        { d: 2.0, cap: "Elle circule, elle s'adapte, elle façonne notre avenir.", draw: vortexScene },
        { d: 2.0, cap: "De chaque goutte naît une idée.", draw: figureScene },
        { d: 2.0, cap: "L'intelligence transforme les données en décisions.", draw: brainScene },
        { d: 2.0, cap: "Modéliser. Analyser. Optimiser.", draw: eqScene },
        { d: 2.0, cap: "Les équations guident, l'expérience valide.", draw: paperScene1 },
        { d: 2.0, cap: "La connaissance construit des solutions durables.", draw: paperScene2 },
        { d: 1.5, cap: "L'eau. Les données. L'intelligence. AquaData Studio.", draw: darkDropScene },
        { d: 1e9, cap: '', draw: plasmaScene },
    ];

    function setCaption(i) {
        if (i === captionIdx) return;
        captionIdx = i;
        if (!captionEl) return;
        clearTimeout(captionTimer);
        captionEl.classList.remove('show');
        if (SCENES[i].cap) {
            captionTimer = setTimeout(() => {
                captionEl.textContent = SCENES[i].cap;
                captionEl.classList.add('show');
            }, 350);
        }
    }

    function frame(now) {
        if (!running) return;
        if (overlay.style.display === 'none' || overlay.classList.contains('fade-out')) { running = false; return; }
        let el = (now - t0) / 1000;
        if (REDUCED) el += 15; // mouvement réduit : aller directement au climax
        timeSec = el;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        let acc = 0, scene = SCENES[SCENES.length - 1], lt = 0, idx = SCENES.length - 1;
        for (let i = 0; i < SCENES.length; i++) {
            if (el < acc + SCENES[i].d) { scene = SCENES[i]; lt = el - acc; idx = i; break; }
            acc += SCENES[i].d;
        }
        setCaption(idx);
        const a = scene.d > 100 ? clamp(lt / 1.2, 0, 1) : env(lt, scene.d, 0.35, 0.4);
        const dt = Math.min(0.05, (now - (frame._p || now)) / 1000);
        frame._p = now;
        try { scene.draw(lt, a, dt); } catch (e) { /* ne jamais bloquer l'intro */ }
        raf = requestAnimationFrame(frame);
    }

    function start() {
        resize();
        brainPts = null; paper = null; captionIdx = -1; welcomeShown = false;
        if (finalEl) finalEl.classList.remove('show');
        if (captionEl) { captionEl.textContent = ''; captionEl.classList.remove('show'); }
        t0 = performance.now(); frame._p = 0;
        if (!running) { running = true; raf = requestAnimationFrame(frame); }
    }

    function destroy() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        clearTimeout(captionTimer);
        window.removeEventListener('resize', onResize);
    }

    function onResize() { if (running) resize(); }
    window.addEventListener('resize', onResize);
    start();

    return { destroy, restart: start };
}