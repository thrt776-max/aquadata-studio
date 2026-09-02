/**
 * AquaData Studio - 3D Welcome Showcase & Canva-Style Presentation Engine
 * Features:
 * 1. Three.js / WebGL 3D Animated Water Reservoir with Wave Physics
 * 2. 3D Rotating Industrial Pump Impeller & Hydraulic Stream Particles
 * 3. 3D Floating Mathematical Formula Badges & Neon Holograms
 * 4. Canva-Style Interactive Slide Deck / Executive Presentation Mode
 */

export function init3DWelcomeShowcase() {
    initCanvaPresentationModal();

    const canvasContainer = document.getElementById('welcome-3d-canvas-container');
    if (!canvasContainer) return;

    // Respect users who prefer reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Check if Three.js is available
    if (typeof THREE === 'undefined' || prefersReducedMotion) {
        renderCanvas2DFallback(canvasContainer);
        return;
    }

    let destroyFn = null;
    try {
        destroyFn = initThreeJSEngine(canvasContainer);
    } catch(e) {
        console.warn("Three.js init fallback:", e);
        renderCanvas2DFallback(canvasContainer);
    }

    // 'Skip intro' button should be present in the DOM; if not, create a small control
    let skipBtn = document.getElementById('btn-skip-intro');
    if (!skipBtn) {
        skipBtn = document.createElement('button');
        skipBtn.id = 'btn-skip-intro';
        skipBtn.className = 'btn-skip-intro';
        skipBtn.textContent = 'Passer l\'intro';
        skipBtn.style.position = 'fixed';
        skipBtn.style.right = '18px';
        skipBtn.style.top = '18px';
        skipBtn.style.zIndex = 100000;
        skipBtn.style.background = 'rgba(20,20,30,0.6)';
        skipBtn.style.color = '#fff';
        skipBtn.style.border = '1px solid rgba(255,255,255,0.06)';
        skipBtn.style.padding = '8px 12px';
        skipBtn.style.borderRadius = '8px';
        document.body.appendChild(skipBtn);
    }

    skipBtn.addEventListener('click', () => {
        const overlay = document.getElementById('intro-splash-overlay');
        if (overlay) overlay.classList.add('fade-out');
        if (typeof destroyFn === 'function') destroyFn();
        // hide after short delay to allow CSS transition
        setTimeout(() => { if (overlay) overlay.style.display = 'none'; }, 420);
        try { skipBtn.remove(); } catch(e) {}
    });

    // Return a cleanup function so callers can programmatically stop the intro and free resources
    return function destroyIntro() {
        try {
            if (typeof destroyFn === 'function') destroyFn();
        } catch(e) { /* swallow */ }
        try { if (skipBtn && skipBtn.parentNode) skipBtn.parentNode.removeChild(skipBtn); } catch(e) {}
        try {
            const overlay = document.getElementById('intro-splash-overlay');
            if (overlay) {
                overlay.classList.add('fade-out');
                setTimeout(() => { overlay.style.display = 'none'; }, 420);
            }
        } catch(e) {}
    };
}

function initThreeJSEngine(container) {
    container.innerHTML = '';
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090d16, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 4, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x0f2744, 1.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x06b6d4, 3.5);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x10b981, 2.5);
    dirLight2.position.set(-5, 6, -3);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x38bdf8, 4, 20);
    pointLight.position.set(0, 2, 2);
    scene.add(pointLight);

    // --- 1. 3D GLASS RESERVOIR TANK ---
    const tankGroup = new THREE.Group();
    scene.add(tankGroup);

    // Glass Tank Cylindrical Outer Shell
    const tankRadius = 2.6;
    const tankHeight = 3.6;
    const tankGeo = new THREE.CylinderGeometry(tankRadius, tankRadius, tankHeight, 32, 1, true);
    const tankMat = new THREE.MeshPhysicalMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.22,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.6,
        ior: 1.4,
        side: THREE.DoubleSide
    });
    const tankMesh = new THREE.Mesh(tankGeo, tankMat);
    tankMesh.position.y = 0;
    tankGroup.appendChild ? null : tankGroup.add(tankMesh);
    // Metallic Base & Top Rings
    const ringGeo = new THREE.TorusGeometry(tankRadius, 0.09, 16, 48);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.8 });
    const topRing = new THREE.Mesh(ringGeo, ringMat);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = tankHeight / 2;
    tankGroup.add(topRing);

    const bottomRing = new THREE.Mesh(ringGeo, ringMat);
    bottomRing.rotation.x = Math.PI / 2;
    bottomRing.position.y = -tankHeight / 2;
    tankGroup.add(bottomRing);

    // --- 2. 3D DYNAMIC WATER CYLINDER & SURFACE WAVE MESH ---
    const waterRadius = tankRadius * 0.94;
    const waterHeight = tankHeight * 0.65;
    const waterGeo = new THREE.CylinderGeometry(waterRadius, waterRadius, waterHeight, 32, 16);
    const waterMat = new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.75,
        roughness: 0.15,
        metalness: 0.2,
        clearcoat: 0.8
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -tankHeight / 2 + waterHeight / 2;
    tankGroup.add(waterMesh);

    // Top Wave Surface Plane
    const waveGeo = new THREE.CircleGeometry(waterRadius, 32, 8);
    const waveMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.4,
        side: THREE.DoubleSide
    });
    const waveMesh = new THREE.Mesh(waveGeo, waveMat);
    waveMesh.rotation.x = -Math.PI / 2;
    waveMesh.position.y = -tankHeight / 2 + waterHeight;
    tankGroup.add(waveMesh);

    // --- 3. 3D ROTATING PUMP & IMPELLER ASSEMBY (Side mounted) ---
    const pumpGroup = new THREE.Group();
    pumpGroup.position.set(3.8, -0.6, 0);
    scene.add(pumpGroup);

    // Pump Body Volute
    const voluteGeo = new THREE.TorusGeometry(0.85, 0.35, 16, 32);
    const voluteMat = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.3, metalness: 0.7 });
    const voluteMesh = new THREE.Mesh(voluteGeo, voluteMat);
    pumpGroup.add(voluteMesh);

    // Pump Motor Cylinder
    const motorGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.4, 24);
    const motorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
    const motorMesh = new THREE.Mesh(motorGeo, motorMat);
    motorMesh.rotation.z = Math.PI / 2;
    motorMesh.position.x = 0.9;
    pumpGroup.add(motorMesh);

    // Impeller Rotating Blades
    const impellerGroup = new THREE.Group();
    for (let i = 0; i < 6; i++) {
        const bladeGeo = new THREE.BoxGeometry(0.7, 0.08, 0.2);
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0x34d399, metalness: 0.9, roughness: 0.2 });
        const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
        bladeMesh.rotation.z = (i * Math.PI) / 3;
        impellerGroup.add(bladeMesh);
    }
    impellerGroup.position.z = 0.05;
    pumpGroup.add(impellerGroup);

    // Pipe connection from tank to pump
    const pipeGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.8, 16);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.3 });
    const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
    pipeMesh.rotation.z = Math.PI / 2;
    pipeMesh.position.set(2.4, -1.0, 0);
    scene.add(pipeMesh);

    // --- 4. 3D FLOW PARTICLES ---
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 4;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 3;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
        velocities.push({
            x: (Math.random() - 0.5) * 0.02,
            y: (Math.random() - 0.5) * 0.02 + 0.01,
            z: (Math.random() - 0.5) * 0.02
        });
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.08,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // --- 5. FLOATING MATHEMATICAL FORMULA SPRITES ---
    const formulas = [
        "dV/dt = ∑Qin - ∑Qout - D(t)",
        "Min Z = 3756.87 DT (Plan PX)",
        "HMT = Hg + ΔHlin + ΔHsing",
        "η = (ρ·g·Q·H) / (3600·P)",
        "SEC = 0.412 kWh/m³"
    ];

    const mathSprites = [];
    formulas.forEach((formula, idx) => {
        const sprite = createMathTextSprite(formula);
        const angle = (idx / formulas.length) * Math.PI * 2;
        const radius = 4.8;
        sprite.position.set(Math.cos(angle) * radius, 1.8 + Math.sin(idx) * 0.8, Math.sin(angle) * radius * 0.6);
        sprite.userData = { angle, radius, speed: 0.004 + idx * 0.001, baseY: sprite.position.y };
        scene.add(sprite);
        mathSprites.push(sprite);
    });

    // --- ANIMATION LOOP ---
    // Controlled timed animation with a punchy finish
    let clock = new THREE.Clock();
    const SHOW_DURATION_MS = 3200; // shorter, punchier
    const startTime = performance.now();
    let rafHandle = null;

    function animate() {
        rafHandle = requestAnimationFrame(animate);
        const now = performance.now();
        const elapsed = clock.getElapsedTime();
        const tMs = now - startTime;
        const phase = Math.min(1, tMs / SHOW_DURATION_MS);

        // Rotate tank with accelerating ease-in for drama
        tankGroup.rotation.y = elapsed * (0.12 + 0.6 * phase);

        // Impeller spins much faster for a striking visual
        impellerGroup.rotation.z = -elapsed * (8.0 + 18.0 * phase);

        // Wave surface becomes more agitated toward the middle/end
        const wavePos = waveGeo.attributes.position;
        const waveAmp = 0.08 + 0.18 * phase;
        const waveFreq = 2.5 + 3.5 * phase;
        for (let i = 0; i < wavePos.count; i++) {
            const u = wavePos.getX(i);
            const v = wavePos.getY(i);
            const z = Math.sin(u * waveFreq + elapsed * (3.0 + 6.0 * phase)) * waveAmp + Math.cos(v * (waveFreq * 0.9) + elapsed * (2.5 + 4.0 * phase)) * (waveAmp * 0.75);
            wavePos.setZ(i, z);
        }
        wavePos.needsUpdate = true;

        // Energetic particle motion; in final phase they coalesce into a network ring
        const posArray = particleGeo.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            // give each particle slightly stronger velocity tied to phase
            velocities[i].x += (Math.random() - 0.5) * 0.004 * phase;
            velocities[i].y += (Math.random() - 0.5) * 0.004 * phase;
            velocities[i].z += (Math.random() - 0.5) * 0.004 * phase;

            posArray[i * 3] += velocities[i].x * (1 + 2 * phase);
            posArray[i * 3 + 1] += velocities[i].y * (1 + 2 * phase);
            posArray[i * 3 + 2] += velocities[i].z * (1 + 2 * phase);

            // keep within soft bounds
            if (posArray[i * 3 + 1] > 3.2) posArray[i * 3 + 1] = -2.0 + (Math.random() * 0.4);
            if (Math.abs(posArray[i * 3]) > 5) posArray[i * 3] = (Math.random() - 0.5) * 2.8;

            // final morph: attract to ring/network positions
            if (phase > 0.6) {
                const angle = (i / particleCount) * Math.PI * 2;
                const targetR = waterRadius * (1.1 + 0.18 * Math.sin(i));
                const tx = Math.cos(angle) * targetR;
                const tz = Math.sin(angle) * targetR * 0.6;
                const ty = -0.4 + Math.sin(i + elapsed) * 0.2;
                // simple lerp toward target
                posArray[i * 3] = posArray[i * 3] * 0.55 + tx * 0.45;
                posArray[i * 3 + 1] = posArray[i * 3 + 1] * 0.6 + ty * 0.4;
                posArray[i * 3 + 2] = posArray[i * 3 + 2] * 0.55 + tz * 0.45;
            }
        }
        particleGeo.attributes.position.needsUpdate = true;

        // Math formula sprites: pop & quick motion effect when phase in mid-range
        mathSprites.forEach((sprite, idx) => {
            sprite.userData.angle += sprite.userData.speed * (1 + 2 * phase);
            const baseRadius = sprite.userData.radius;
            // pulsate radius with phase
            const r = baseRadius * (1.0 - 0.18 * Math.sin((elapsed + idx) * 3.0) * (1 - phase * 0.9));
            sprite.position.x = Math.cos(sprite.userData.angle) * r;
            sprite.position.z = Math.sin(sprite.userData.angle) * r * 0.7;
            sprite.position.y = sprite.userData.baseY + Math.sin(elapsed * 4.0 + sprite.userData.angle * 2.0) * (0.18 + 0.45 * phase);
            // scale pop
            const scaleBase = 3.2 + 0.8 * Math.sin(elapsed * 6 + idx);
            sprite.scale.setScalar(scaleBase * (1 + 0.6 * phase));
            sprite.material.opacity = 0.8 + 0.2 * (1 - phase);
        });

        // Camera subtle dolly in during final phase for impact
        if (phase > 0.5) {
            const targetZ = 8.2;
            camera.position.z += (targetZ - camera.position.z) * 0.08 * (phase - 0.5) * 2.0;
        }

        // Animate introSphere if present (use the provided image as rotating/neon globe)
        if (typeof introSphere !== 'undefined' && introSphere && introSphere.material) {
            // gentle rotation tied to elapsed time and phase
            introSphere.rotation.y += 0.02 + 0.06 * phase;
            introSphere.rotation.x += 0.005 * Math.sin(elapsed * 1.2);
            // pulse scale for a living effect
            const pulse = 1 + 0.035 * Math.sin(elapsed * 5.0) * (1 + phase);
            introSphere.scale.setScalar(0.98 * pulse);
            // if it has a parent halo sprite, slightly expand it
            // attempt to find a halo sprite in scene.children
            scene.traverse((obj) => {
                if (obj.type === 'Sprite' && obj.material && obj.material.map && obj.material.map.image && obj.material.map.image.src && obj.material.map.image.src.indexOf('intro.png') !== -1) {
                    obj.scale.set(6.2 * (1 + 0.08 * Math.sin(elapsed * 3.0)), 6.2 * (1 + 0.08 * Math.sin(elapsed * 3.0)), 1);
                    obj.position.copy(introSphere.position);
                }
            });
        }

        renderer.render(scene, camera);

        // Finish: fade overlay and stop animation cleanly
        if (phase >= 1) {
            cancelAnimationFrame(rafHandle);
            // small pulse
            tankGroup.scale.setScalar(1.02);
            // fade overlay
            const overlay = document.getElementById('intro-splash-overlay');
            if (overlay) {
                overlay.classList.add('fade-out');
                setTimeout(() => { overlay.style.display = 'none'; }, 420);
            }
            // schedule cleanup after short delay
            setTimeout(() => {
                try { renderer.forceContextLoss(); } catch (e) {}
                try { renderer.domElement && renderer.domElement.remove(); } catch (e) {}
            }, 520);
        }
    }

    // start
    animate();

    // Resize handler
    const _onResize = () => {
        const nw = container.clientWidth;
        const nh = container.clientHeight;
        if (nw && nh) {
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
        }
    };
    window.addEventListener('resize', _onResize);

    // Provide destroy method to be called externally
    const destroy = () => {
        try { cancelAnimationFrame(rafHandle); } catch (e) {}
        try { window.removeEventListener('resize', _onResize); } catch (e) {}
        try { renderer.forceContextLoss(); } catch (e) {}
        try { renderer.domElement && renderer.domElement.remove(); } catch (e) {}
    };

    // If user clicks 'Entrer' button elsewhere, allow external cleanup
    return destroy;
}

function createMathTextSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Rounded glowing glass badge background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(10, 10, 492, 108, 24);
    ctx.fill();
    ctx.stroke();

    // Glowing text
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.2, 0.8, 1);
    return sprite;
}

function renderCanvas2DFallback(container) {
    container.innerHTML = `
        <div class="canvas-2d-hero-fallback">
            <div class="water-pulse-sphere">
                <div class="fluid-wave"></div>
                <div class="rotating-pump-icon">⚙️</div>
            </div>
            <div class="floating-math-badges">
                <span class="math-badge-tag">dV/dt = ∑Qin - ∑Qout - D(t)</span>
                <span class="math-badge-tag glow-gold">Min Z = 3756.87 DT (Plan PX)</span>
                <span class="math-badge-tag">HMT = Hg + ΔHlin + ΔHsing</span>
            </div>
        </div>
    `;
}

// --- CANVA-STYLE PRESENTATION MODAL CONTROLLER ---
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
        slides.forEach((s, idx) => {
            s.classList.toggle('active', idx === currentSlide);
        });

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

    btnOpen?.addEventListener('click', () => {
        modal.style.display = 'flex';
        showSlide(0);
    });

    btnClose?.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    btnPrev?.addEventListener('click', () => showSlide(currentSlide - 1));
    btnNext?.addEventListener('click', () => showSlide(currentSlide + 1));

    // Keyboard navigation (Arrow keys)
    window.addEventListener('keydown', (e) => {
        if (modal.style.display === 'flex') {
            if (e.key === 'ArrowRight' || e.key === ' ') showSlide(currentSlide + 1);
            if (e.key === 'ArrowLeft') showSlide(currentSlide - 1);
            if (e.key === 'Escape') modal.style.display = 'none';
        }
    });
}
