/* ==========================================================================
   Munim Akbar — Portfolio
   1. 3D background: LiDAR-style point-cloud terrain + robotic core (Three.js)
   2. Simulated computer-vision tracking feed (2D canvas)
   3. UI: header, mobile menu, scroll-spy, reveal, glass spotlight
   ========================================================================== */

document.documentElement.classList.add('js');

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_TOUCH = window.matchMedia('(hover: none)').matches;

/* --------------------------------------------------------------------------
   1. 3D background
   -------------------------------------------------------------------------- */
function initScene() {
    const canvas = document.getElementById('scene');
    if (!canvas || typeof THREE === 'undefined') {
        document.documentElement.classList.add('no-webgl');
        return;
    }

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
        document.documentElement.classList.add('no-webgl');
        return;
    }

    const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(DPR);
    renderer.setClearColor(0x05070a, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    const camBase = new THREE.Vector3(0, 3.2, 9);
    camera.position.copy(camBase);

    /* ---- Point-cloud terrain with a scanning sweep ---- */
    const small = window.innerWidth < 700;
    const NX = small ? 110 : 180;
    const NZ = small ? 80 : 120;
    const SP = 0.22;
    const positions = new Float32Array(NX * NZ * 3);
    let i = 0;
    for (let z = 0; z < NZ; z++) {
        for (let x = 0; x < NX; x++) {
            positions[i++] = (x - NX / 2) * SP;
            positions[i++] = 0;
            positions[i++] = -z * SP + 6;
        }
    }
    const terrainGeo = new THREE.BufferGeometry();
    terrainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const terrainMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uScan: { value: 0 },
            uPixel: { value: DPR },
            uColA: { value: new THREE.Color(0x2b6cff) },
            uColB: { value: new THREE.Color(0x7ff0ff) }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uScan;
            uniform float uPixel;
            varying float vRing;
            varying float vFade;
            varying float vH;
            void main() {
                vec3 p = position;
                float h = sin(p.x * 0.35 + uTime * 0.6) * 0.35
                        + cos(p.z * 0.45 + uTime * 0.4) * 0.35
                        + sin((p.x + p.z) * 0.18 + uTime * 0.3) * 0.5;
                p.y = h - 1.8;
                float d = length(p.xz - vec2(0.0, -4.0));
                vRing = 1.0 - smoothstep(0.0, 1.1, abs(d - uScan));
                vH = h;
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_PointSize = (2.6 + vRing * 3.4) * uPixel * (14.0 / -mv.z);
                vFade = smoothstep(36.0, 6.0, -mv.z) * smoothstep(0.5, 3.0, -mv.z);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: `
            uniform vec3 uColA;
            uniform vec3 uColB;
            varying float vRing;
            varying float vFade;
            varying float vH;
            void main() {
                vec2 c = gl_PointCoord - 0.5;
                float r = length(c);
                if (r > 0.5) discard;
                float soft = smoothstep(0.5, 0.0, r);
                vec3 col = mix(uColA, uColB, clamp(vRing + vH * 0.25 + 0.2, 0.0, 1.0));
                col = mix(col, vec3(1.0), vRing * 0.6);
                float a = (0.45 + vRing * 0.55) * vFade * soft;
                gl_FragColor = vec4(col, a);
            }
        `
    });
    const terrain = new THREE.Points(terrainGeo, terrainMat);
    scene.add(terrain);

    /* ---- Robotic core: wireframe icosahedron + gyroscope rings ---- */
    const core = new THREE.Group();
    scene.add(core);

    const additive = (color, opacity) => ({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

    const outerGeo = new THREE.IcosahedronGeometry(1.5, 1);
    const outer = new THREE.LineSegments(new THREE.EdgesGeometry(outerGeo), new THREE.LineBasicMaterial(additive(0x5ee1ff, 0.55)));
    core.add(outer);

    const vertices = new THREE.Points(outerGeo, new THREE.PointsMaterial({ ...additive(0xffffff, 0.9), size: 0.06 }));
    core.add(vertices);

    const inner = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.8, 0)),
        new THREE.LineBasicMaterial(additive(0xa78bfa, 0.7))
    );
    core.add(inner);

    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 32, 32),
        new THREE.MeshBasicMaterial(additive(0x4d7cff, 0.35))
    );
    core.add(glow);

    const rings = [];
    const ringSpec = [
        { r: 2.1, tilt: [Math.PI / 2, 0, 0], speed: 0.5, color: 0x5ee1ff },
        { r: 2.45, tilt: [Math.PI / 3, Math.PI / 5, 0], speed: -0.35, color: 0x4d7cff },
        { r: 2.8, tilt: [-Math.PI / 4, -Math.PI / 6, 0], speed: 0.22, color: 0xa78bfa }
    ];
    ringSpec.forEach(spec => {
        const pts = [];
        for (let a = 0; a <= 128; a++) {
            const t = (a / 128) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(t) * spec.r, Math.sin(t) * spec.r, 0));
        }
        const holder = new THREE.Group();
        holder.rotation.set(...spec.tilt);
        const spinner = new THREE.Group();
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial(additive(spec.color, 0.35)));
        const node = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: spec.color }));
        node.position.set(spec.r, 0, 0);
        spinner.add(line, node);
        holder.add(spinner);
        core.add(holder);
        rings.push({ spinner, speed: spec.speed });
    });

    /* ---- Layout / resize ---- */
    let coreBase = new THREE.Vector3(3.6, 1.2, 0);
    let coreScale = 1;
    let coreDim = 1; // dimmed on narrow screens, where the core sits behind the headline
    function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (w < 860) {
            coreBase.set(0, 1.6, -3);
            coreScale = 0.85;
            coreDim = 0.35;
        } else {
            coreBase.set(4.4 * Math.min(1.2, camera.aspect / 1.7), 1.2, 0);
            coreScale = 0.9;
            coreDim = 1;
        }
        core.scale.setScalar(coreScale);
    }
    resize();
    window.addEventListener('resize', resize);

    /* ---- Interaction ---- */
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    if (!IS_TOUCH) {
        window.addEventListener('pointermove', e => {
            mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
        }, { passive: true });
    }
    let scrollRatio = 0;
    const onScroll = () => { scrollRatio = window.scrollY / Math.max(1, window.innerHeight); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ---- HUD readouts ---- */
    const fpsEl = document.getElementById('hud-fps');
    const ptsEl = document.getElementById('hud-pts');
    if (ptsEl) ptsEl.textContent = (NX * NZ).toLocaleString('en-US');
    let frames = 0;
    let lastFps = performance.now();

    /* ---- Loop ---- */
    const clock = new THREE.Clock();
    const speed = REDUCED_MOTION ? 0.15 : 1;
    function frame() {
        const t = clock.getElapsedTime() * speed;

        terrainMat.uniforms.uTime.value = t;
        terrainMat.uniforms.uScan.value = (t * 4.5) % 26;

        core.rotation.y = t * 0.18;
        core.rotation.x = Math.sin(t * 0.3) * 0.15;
        inner.rotation.x = -t * 0.5;
        inner.rotation.z = t * 0.3;
        glow.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
        rings.forEach(r => { r.spinner.rotation.z = t * r.speed; });

        // core drifts up and fades as the hero scrolls away
        const s = Math.min(scrollRatio, 1.5);
        core.position.set(coreBase.x, coreBase.y + s * 2.2, coreBase.z);
        const coreAlpha = Math.max(0, 1 - s * 0.9) * coreDim;
        core.visible = coreAlpha > 0.02;
        outer.material.opacity = 0.55 * coreAlpha;
        vertices.material.opacity = 0.9 * coreAlpha;
        inner.material.opacity = 0.7 * coreAlpha;
        glow.material.opacity = 0.35 * coreAlpha;

        // camera parallax + gentle descent on scroll
        mouse.x += (mouse.tx - mouse.x) * 0.04;
        mouse.y += (mouse.ty - mouse.y) * 0.04;
        camera.position.x = camBase.x + mouse.x * 0.8;
        camera.position.y = camBase.y - mouse.y * 0.4 - Math.min(scrollRatio, 4) * 0.25;
        camera.lookAt(0, 0.4 - Math.min(scrollRatio, 4) * 0.2, 0);

        renderer.render(scene, camera);

        frames++;
        const now = performance.now();
        if (fpsEl && now - lastFps > 500) {
            fpsEl.textContent = Math.round((frames * 1000) / (now - lastFps));
            frames = 0;
            lastFps = now;
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

/* --------------------------------------------------------------------------
   2. Simulated player-tracking feed (placeholder until the demo video)
   -------------------------------------------------------------------------- */
function initVisionFeed() {
    const canvas = document.getElementById('vision-feed');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const statsEl = document.getElementById('feed-stats');
    let W = 0, H = 0, dpr = 1;

    function resize() {
        const r = canvas.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = r.width;
        H = r.height;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // broadcast-style perspective: pitch (u,v in 0..1) -> screen
    const proj = (u, v) => {
        const y = H * (0.16 + 0.78 * v);
        const width = W * (0.66 + 0.4 * v);
        return { x: W / 2 + (u - 0.5) * width, y, s: 0.65 + 0.55 * v };
    };

    const TEAM_A = '#5ee1ff';
    const TEAM_B = '#ff6b6b';
    const REF = '#ffb547';
    const rand = (a, b) => a + Math.random() * (b - a);

    const formation = [
        [0.06, 0.5], [0.2, 0.2], [0.2, 0.4], [0.2, 0.6], [0.2, 0.8],
        [0.34, 0.3], [0.34, 0.5], [0.34, 0.7], [0.45, 0.25], [0.45, 0.5], [0.45, 0.75]
    ];
    const players = [];
    formation.forEach(([u, v], k) => {
        players.push({ team: 'A', id: k + 1, hu: u + 0.02, hv: v, u: u, v: v, conf: rand(0.86, 0.97) });
        players.push({ team: 'B', id: k + 12, hu: 1 - u - 0.02, hv: v, u: 1 - u, v: v, conf: rand(0.86, 0.97) });
    });
    players.push({ team: 'R', id: 23, hu: 0.5, hv: 0.45, u: 0.5, v: 0.45, conf: 0.9 });

    const ball = { u: 0.5, v: 0.5, from: null, to: null, t: 1, trail: [] };
    function nextPass() {
        const outfield = players.filter(p => p.team !== 'R');
        const target = outfield[Math.floor(Math.random() * outfield.length)];
        ball.from = { u: ball.u, v: ball.v };
        ball.to = target;
        ball.t = 0;
    }
    nextPass();

    function line(points) {
        ctx.beginPath();
        points.forEach(([u, v], k) => {
            const p = proj(u, v);
            k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        });
        ctx.stroke();
    }
    function ellipsePath(cu, cv, ru, rv, a0 = 0, a1 = Math.PI * 2) {
        const pts = [];
        for (let k = 0; k <= 48; k++) {
            const a = a0 + (a1 - a0) * (k / 48);
            pts.push([cu + Math.cos(a) * ru, cv + Math.sin(a) * rv]);
        }
        line(pts);
    }

    function drawPitch() {
        // grass with mowing stripes
        const stripes = 12;
        for (let k = 0; k < stripes; k++) {
            const a = proj(k / stripes, 0), b = proj((k + 1) / stripes, 0);
            const c = proj((k + 1) / stripes, 1), d = proj(k / stripes, 1);
            ctx.fillStyle = k % 2 ? '#0e3f22' : '#0b361d';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
            ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.2;
        line([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]);
        line([[0.5, 0], [0.5, 1]]);
        ellipsePath(0.5, 0.5, 0.085, 0.14);
        line([[0, 0.22], [0.15, 0.22], [0.15, 0.78], [0, 0.78]]);
        line([[1, 0.22], [0.85, 0.22], [0.85, 0.78], [1, 0.78]]);
        line([[0, 0.38], [0.055, 0.38], [0.055, 0.62], [0, 0.62]]);
        line([[1, 0.38], [0.945, 0.38], [0.945, 0.62], [1, 0.62]]);
    }

    function drawPlayer(p) {
        const pos = proj(p.u, p.v);
        const col = p.team === 'A' ? TEAM_A : p.team === 'B' ? TEAM_B : REF;
        const h = 26 * pos.s * (W / 700);
        const w = h * 0.45;
        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, w * 0.6, w * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        // body
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(pos.x - w * 0.32, pos.y - h * 0.78, w * 0.64, h * 0.42);
        ctx.fillStyle = '#e8e2d8';
        ctx.fillRect(pos.x - w * 0.26, pos.y - h * 0.36, w * 0.52, h * 0.34);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y - h * 0.88, w * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // bounding box with corner ticks
        const bx = pos.x - w * 0.75, by = pos.y - h * 1.12, bw = w * 1.5, bh = h * 1.2;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(bx, by, bw, bh);
        if (W > 420) {
            const label = (p.team === 'R' ? 'ref' : 'id ' + String(p.id).padStart(2, '0')) + ' ' + p.conf.toFixed(2);
            ctx.font = `500 ${Math.max(9, 10 * pos.s)}px "JetBrains Mono", monospace`;
            const tw = ctx.measureText(label).width + 8;
            ctx.fillStyle = col;
            ctx.fillRect(bx, by - 13 * pos.s - 2, tw, 13 * pos.s + 2);
            ctx.fillStyle = '#05070a';
            ctx.fillText(label, bx + 4, by - 4);
        }
    }

    function drawBall() {
        // trail
        for (let k = 1; k < ball.trail.length; k++) {
            const a = proj(ball.trail[k - 1].u, ball.trail[k - 1].v);
            const b = proj(ball.trail[k].u, ball.trail[k].v);
            ctx.strokeStyle = `rgba(255, 230, 120, ${(k / ball.trail.length) * 0.8})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
        const p = proj(ball.u, ball.v);
        const r = 3.2 * p.s * (W / 700) + 1;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y - r, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffe678';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(p.x - r * 2.6, p.y - r * 3.6, r * 5.2, r * 5.2);
    }

    function drawRadar() {
        const rw = Math.min(150, W * 0.26), rh = rw * 0.64;
        const rx = W - rw - 14, ry = H - rh - 14;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 4, ry + 4, rw - 8, rh - 8);
        ctx.beginPath();
        ctx.moveTo(rx + rw / 2, ry + 4);
        ctx.lineTo(rx + rw / 2, ry + rh - 4);
        ctx.stroke();
        players.forEach(p => {
            ctx.fillStyle = p.team === 'A' ? TEAM_A : p.team === 'B' ? TEAM_B : REF;
            ctx.beginPath();
            ctx.arc(rx + 4 + p.u * (rw - 8), ry + 4 + p.v * (rh - 8), 2.2, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(rx + 4 + ball.u * (rw - 8), ry + 4 + ball.v * (rh - 8), 2, 0, Math.PI * 2);
        ctx.fill();
    }

    function step(dt) {
        // ball pass
        ball.t = Math.min(1, ball.t + dt * 0.55);
        const e = 1 - Math.pow(1 - ball.t, 3);
        ball.u = ball.from.u + (ball.to.u - ball.from.u) * e;
        ball.v = ball.from.v + (ball.to.v - ball.from.v) * e;
        if (ball.t >= 1) {
            ball.u = ball.to.u;
            ball.v = ball.to.v;
            if (Math.random() < dt * 1.5) nextPass();
        }
        ball.trail.push({ u: ball.u, v: ball.v });
        if (ball.trail.length > 28) ball.trail.shift();

        // players drift between formation and ball
        players.forEach(p => {
            const pull = p.team === 'R' ? 0.6 : 0.3;
            const tu = p.hu + (ball.u - 0.5) * pull + Math.sin(performance.now() / 1300 + p.id) * 0.015;
            const tv = p.hv + (ball.v - p.hv) * pull * 0.5 + Math.cos(performance.now() / 1700 + p.id) * 0.02;
            p.u += (tu - p.u) * dt * 0.8;
            p.v += (Math.min(0.98, Math.max(0.02, tv)) - p.v) * dt * 0.8;
            p.conf = Math.min(0.99, Math.max(0.78, p.conf + (Math.random() - 0.5) * 0.01));
        });
    }

    let visible = false;
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.05 }).observe(canvas);

    let last = performance.now();
    function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000) * (REDUCED_MOTION ? 0.2 : 1);
        last = now;
        if (visible && W > 0) {
            step(dt);
            ctx.clearRect(0, 0, W, H);
            drawPitch();
            [...players].sort((a, b) => a.v - b.v).forEach(drawPlayer);
            drawBall();
            if (W > 520) drawRadar();
            if (statsEl) statsEl.textContent = `${players.length + 1} OBJ · ${Math.round(58 + Math.random() * 4)} FPS`;
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

/* --------------------------------------------------------------------------
   3. UI
   -------------------------------------------------------------------------- */
function initUI() {
    const header = document.querySelector('.site-header');
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelectorAll('.nav-links a');

    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const setOpen = open => {
        header.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', () => setOpen(!header.classList.contains('open')));
    links.forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', e => { if (!header.contains(e.target)) setOpen(false); });

    // scroll-spy: highlight the section crossing 40% of the viewport (Contact once the page bottom is reached)
    const spyLinks = [...links, document.querySelector('.nav-cta')].filter(Boolean);
    const spyTargets = spyLinks
        .map(a => ({ a, el: document.querySelector(a.getAttribute('href')) }))
        .filter(t => t.el);
    let spyQueued = false;
    const updateSpy = () => {
        spyQueued = false;
        const line = window.innerHeight * 0.4;
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        let current = null;
        spyTargets.forEach(t => { if (t.el.getBoundingClientRect().top <= line) current = t; });
        if (atBottom) current = spyTargets[spyTargets.length - 1];
        spyTargets.forEach(t => t.a.classList.toggle('active', t === current));
    };
    updateSpy();
    window.addEventListener('scroll', () => {
        if (!spyQueued) { spyQueued = true; requestAnimationFrame(updateSpy); }
    }, { passive: true });
    window.addEventListener('resize', updateSpy);

    // staggered reveal
    const groups = new Map();
    document.querySelectorAll('.reveal').forEach(el => {
        const parent = el.parentElement;
        const n = groups.get(parent) || 0;
        el.style.setProperty('--d', `${Math.min(n, 6) * 0.08}s`);
        groups.set(parent, n + 1);
    });
    const reveal = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('in');
            reveal.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));

    // cursor spotlight on glass panels
    if (!IS_TOUCH) {
        document.querySelectorAll('.glass').forEach(card => {
            card.addEventListener('pointermove', e => {
                const r = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${e.clientX - r.left}px`);
                card.style.setProperty('--my', `${e.clientY - r.top}px`);
            });
        });
    }

    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initScene();
    initVisionFeed();
});
