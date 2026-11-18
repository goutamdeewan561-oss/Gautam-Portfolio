/**
 * MOWA.STUDIO Interactive Engine for Gautam's Portfolio
 * Features:
 *  1. Interactive 3D WebGL Torus Knot Centerpiece (Three.js)
 *  2. Interactive Mouse Drag & Move 2D Wave Equation Water Ripple & Refraction Engine
 *  3. Signature Mowa Coordinate-Based Radial Expanding Hover Effect (.mowa-svc)
 *  4. High-Performance Zero-Lag Follower Cursor with "View ↗" Morph
 *  5. Fullscreen Swiss Navigation Overlay Menu
 *  6. Dynamic Project Category Filtering
 *  7. Theme Switcher (Pitch Black / High-Key Light Mode)
 */

(function () {
    'use strict';

    // -------------------------------------------------------------
    // 1. Theme Management (Centered Toggle & Light Mode Sync)
    // -------------------------------------------------------------
    function initTheme() {
        const themeBtn = document.querySelector('.mowa-theme-pill');
        const root = document.documentElement;
        const savedTheme = localStorage.getItem('gautam_mowa_theme') || 'dark';

        function applyTheme(theme) {
            root.setAttribute('data-theme', theme);
            localStorage.setItem('gautam_mowa_theme', theme);
            window.dispatchEvent(new CustomEvent('mowaThemeChanged', { detail: { theme } }));
        }

        applyTheme(savedTheme);

        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const current = root.getAttribute('data-theme') || 'dark';
                const next = current === 'dark' ? 'light' : 'dark';
                applyTheme(next);
            });
        }
    }

    // -------------------------------------------------------------
    // 2. Fullscreen Swiss Overlay Menu
    // -------------------------------------------------------------
    function initOverlayMenu() {
        const triggers = document.querySelectorAll('.mowa-menu-trigger, #menu-toggle');
        const overlay = document.querySelector('.mowa-overlay');
        const links = document.querySelectorAll('.mowa-overlay-link');
        const closeBtn = document.querySelector('.mowa-overlay-close');

        function toggleMenu(forceOpen) {
            if (!overlay) return;
            const isOpen = overlay.classList.contains('is-open');
            const targetState = typeof forceOpen === 'boolean' ? forceOpen : !isOpen;

            if (targetState) {
                overlay.classList.add('is-open');
                document.body.style.overflow = 'hidden';
            } else {
                overlay.classList.remove('is-open');
                document.body.style.overflow = '';
            }
        }

        triggers.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleMenu();
            });
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleMenu(false);
            });
        }

        links.forEach(link => {
            link.addEventListener('click', () => {
                toggleMenu(false);
            });
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay && overlay.classList.contains('is-open')) {
                toggleMenu(false);
            }
        });
    }

    // -------------------------------------------------------------
    // 3. Signature Coordinate-Based Radial Expanding Hover (.mowa-svc)
    // -------------------------------------------------------------
    function initServiceRipples() {
        const serviceItems = document.querySelectorAll('.mowa-svc');

        serviceItems.forEach(item => {
            function updateCoords(e) {
                const rect = item.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const maxX = Math.max(x, rect.width - x);
                const maxY = Math.max(y, rect.height - y);
                const radius = Math.hypot(maxX, maxY);

                item.style.setProperty('--x', `${x}px`);
                item.style.setProperty('--y', `${y}px`);
                item.style.setProperty('--r', `${radius}px`);
            }

            item.addEventListener('mouseenter', (e) => {
                updateCoords(e);
                item.classList.add('is-on');
            });

            item.addEventListener('mousemove', (e) => {
                updateCoords(e);
            });

            item.addEventListener('mouseleave', (e) => {
                updateCoords(e);
                item.classList.remove('is-on');
            });
        });
    }

    // -------------------------------------------------------------
    // 4. Zero-Lag Magnetic Custom Follower Cursor
    // -------------------------------------------------------------
    function initCustomCursor() {
        if (window.matchMedia('(pointer: coarse)').matches) return;

        let cursor = document.getElementById('mowa-cursor');
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.id = 'mowa-cursor';
            document.body.appendChild(cursor);
        }

        let mouseX = -100;
        let mouseY = -100;
        let targetX = -100;
        let targetY = -100;
        let isVisible = false;

        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!isVisible) {
                isVisible = true;
                targetX = mouseX;
                targetY = mouseY;
            }
        });

        document.addEventListener('mouseleave', () => {
            isVisible = false;
            cursor.style.opacity = '0';
        });

        document.addEventListener('mouseenter', () => {
            isVisible = true;
            cursor.style.opacity = '1';
        });

        const viewTargets = document.querySelectorAll('.mowa-project-card, .mowa-fan-card, [data-cursor="view"]');
        viewTargets.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.classList.add('is-view');
            });
            el.addEventListener('mouseleave', () => {
                cursor.classList.remove('is-view');
            });
        });

        function renderCursor() {
            if (isVisible) {
                targetX += (mouseX - targetX) * 0.22;
                targetY += (mouseY - targetY) * 0.22;
                cursor.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
                cursor.style.opacity = '1';
            }
            requestAnimationFrame(renderCursor);
        }
        renderCursor();
    }

    // -------------------------------------------------------------
    // 5. Three.js WebGL Interactive 3D Sculpture + Water Ripple Engine
    // -------------------------------------------------------------
    function initThreeHero() {
        const canvas = document.getElementById('mowa-canvas');
        if (!canvas || typeof THREE === 'undefined') return;

        let scene, camera, renderer, sculptureGroup, knotMesh, wireMesh, coreMesh;
        let mouseX = 0, mouseY = 0, targetRotationX = 0, targetRotationY = 0;
        let isVisible = true;

        // Post-Processing & Water Ripple System
        let sceneFBO, simTargetA, simTargetB, readTarget, writeTarget;
        let simScene, simQuad, simMaterial, orthoCamera;
        let compositeScene, compositeQuad, compositeMaterial;
        let simW, simH;

        const state = {
            mouse: new THREE.Vector2(0.5, 0.5),
            prevMouse: new THREE.Vector2(0.5, 0.5),
            moved: false,
            isDragging: false,
            dropStrength: 0.0,
            lastMoveTime: performance.now()
        };

        function initScene() {
            scene = new THREE.Scene();

            const width = window.innerWidth;
            const height = window.innerHeight;

            camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
            camera.position.set(0, 0, 7.5);

            renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            sculptureGroup = new THREE.Group();
            if (window.innerWidth < 992) {
                sculptureGroup.position.set(0, 1.25, -2.4);
                sculptureGroup.scale.set(0.52, 0.52, 0.52);
            } else {
                sculptureGroup.position.set(0.7, 0.15, -0.4);
                sculptureGroup.scale.set(0.95, 0.95, 0.95);
            }

            scene.add(sculptureGroup);

            // -------------------------------------------------------------
            // Build Perfected 3D Cybernetic Torus Knot Sculpture
            // -------------------------------------------------------------
            const knotGeo = new THREE.TorusKnotGeometry(1.6, 0.44, 256, 48, 2, 3);

            // 1. Solid High-End Sculptural Body
            const knotMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x090b14,
                emissive: 0x000620,
                emissiveIntensity: 0.45,
                metalness: 0.94,
                roughness: 0.18,
                clearcoat: 0.96,
                clearcoatRoughness: 0.12,
                reflectivity: 0.95
            });
            knotMesh = new THREE.Mesh(knotGeo, knotMaterial);
            sculptureGroup.add(knotMesh);

            // 2. High-Precision Signature Electric Cobalt Cyber Wireframe
            const wireMaterial = new THREE.MeshBasicMaterial({
                color: 0x000DFF,
                wireframe: true,
                transparent: true,
                opacity: 0.40,
                blending: THREE.AdditiveBlending
            });
            wireMesh = new THREE.Mesh(knotGeo, wireMaterial);
            wireMesh.scale.set(1.004, 1.004, 1.004);
            sculptureGroup.add(wireMesh);

            // 3. Inner Glowing Cyber Core Sphere
            const coreGeo = new THREE.SphereGeometry(0.72, 32, 32);
            const coreMaterial = new THREE.MeshBasicMaterial({
                color: 0x000DFF,
                wireframe: true,
                transparent: true,
                opacity: 0.32,
                blending: THREE.AdditiveBlending
            });
            coreMesh = new THREE.Mesh(coreGeo, coreMaterial);
            sculptureGroup.add(coreMesh);

            // Lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
            scene.add(ambientLight);

            const cobaltLight = new THREE.PointLight(0x000DFF, 4.5, 20);
            cobaltLight.position.set(3, 3, 4);
            scene.add(cobaltLight);

            const rimLight = new THREE.DirectionalLight(0xffffff, 2.2);
            rimLight.position.set(-4, 3, 5);
            scene.add(rimLight);

            const fillLight = new THREE.DirectionalLight(0xffffff, 1.2);
            fillLight.position.set(4, -3, 3);
            scene.add(fillLight);

            const mouseLight = new THREE.PointLight(0x2a35ff, 2.5, 15);
            mouseLight.position.set(0, 0, 5);
            scene.add(mouseLight);

            // Responsive theme lighting adjustments
            function updateThemeVisuals(theme) {
                if (theme === 'light') {
                    ambientLight.intensity = 1.6;
                    rimLight.intensity = 3.2;
                    fillLight.intensity = 2.2;
                    cobaltLight.intensity = 4.2;
                    if (knotMesh) {
                        knotMesh.material.color.setHex(0xd4dae8); // Radiant liquid platinum/silver chrome
                        knotMesh.material.metalness = 0.92;
                        knotMesh.material.roughness = 0.15;
                        knotMesh.material.clearcoat = 0.98;
                        knotMesh.material.emissive.setHex(0x0a1030);
                        knotMesh.material.emissiveIntensity = 0.2;
                    }
                    if (wireMesh) {
                        wireMesh.material.color.setHex(0x000DFF);
                        wireMesh.material.opacity = 0.32;
                    }
                    if (coreMesh) {
                        coreMesh.material.color.setHex(0x000DFF);
                        coreMesh.material.opacity = 0.22;
                    }
                } else {
                    ambientLight.intensity = 0.5;
                    rimLight.intensity = 2.8;
                    fillLight.intensity = 1.6;
                    cobaltLight.intensity = 5.5;
                    if (knotMesh) {
                        knotMesh.material.color.setHex(0x090b14); // Titanium obsidian chrome
                        knotMesh.material.metalness = 0.95;
                        knotMesh.material.roughness = 0.18;
                        knotMesh.material.clearcoat = 0.96;
                        knotMesh.material.emissive.setHex(0x000620);
                        knotMesh.material.emissiveIntensity = 0.45;
                    }
                    if (wireMesh) {
                        wireMesh.material.color.setHex(0x000DFF);
                        wireMesh.material.opacity = 0.40;
                    }
                    if (coreMesh) {
                        coreMesh.material.color.setHex(0x000DFF);
                        coreMesh.material.opacity = 0.32;
                    }
                }
            }

            window.addEventListener('mowaThemeChanged', (e) => {
                updateThemeVisuals(e.detail.theme);
            });
            updateThemeVisuals(document.documentElement.getAttribute('data-theme') || 'dark');

            // -------------------------------------------------------------
            // Setup Multi-Pass Water Ripple & Refraction Shaders
            // -------------------------------------------------------------
            setupWaterPipelines(width, height);

            // Pointer & Drag Listeners
            setupPointerListeners(mouseLight);

            // Resize listener
            window.addEventListener('resize', onResize);

            // Intersection Observer
            const heroSection = document.querySelector('.mowa-hero');
            if (heroSection && 'IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        isVisible = entry.isIntersecting;
                    });
                }, { threshold: 0.1 });
                observer.observe(heroSection);
            }

            animate();
        }

        function setupWaterPipelines(w, h) {
            const quadGeo = new THREE.PlaneGeometry(2, 2);
            orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

            // 1. Scene FBO for Pass 1
            sceneFBO = new THREE.WebGLRenderTarget(w, h, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat
            });

            // 2. Ping-Pong 2D Discrete Wave Simulation FBOs
            simH = 128;
            simW = Math.max(32, Math.round((w / h) * simH));

            const floatType = THREE.HalfFloatType || THREE.FloatType;
            function createSimTarget() {
                return new THREE.WebGLRenderTarget(simW, simH, {
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.LinearFilter,
                    format: THREE.RGBAFormat,
                    type: floatType,
                    depthBuffer: false,
                    stencilBuffer: false
                });
            }

            simTargetA = createSimTarget();
            simTargetB = createSimTarget();
            readTarget = simTargetA;
            writeTarget = simTargetB;

            // Wave Simulation Shader Material
            simMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uPrev: { value: null },
                    uTexel: { value: new THREE.Vector2(1.0 / simW, 1.0 / simH) },
                    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
                    uPrevMouse: { value: new THREE.Vector2(0.5, 0.5) },
                    uAspect: { value: w / h },
                    uDrop: { value: 0.0 },
                    uStrength: { value: 0.0 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position.xy, 0.0, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D uPrev;
                    uniform vec2 uTexel;
                    uniform vec2 uMouse;
                    uniform vec2 uPrevMouse;
                    uniform float uAspect;
                    uniform float uDrop;
                    uniform float uStrength;
                    varying vec2 vUv;

                    void main() {
                        vec4 d = texture2D(uPrev, vUv);
                        float h = d.r;
                        float v = d.g;

                        // 4-neighbor Laplacian wave propagation
                        float around = texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).r
                                     + texture2D(uPrev, vUv - vec2(uTexel.x, 0.0)).r
                                     + texture2D(uPrev, vUv + vec2(0.0, uTexel.y)).r
                                     + texture2D(uPrev, vUv - vec2(0.0, uTexel.y)).r;

                        v += around * 0.25 - h;
                        v *= 0.965; // viscous decay
                        h += v;
                        h *= 0.965;

                        // Kinetic impulse from mouse movement / drag
                        vec2 a = vec2(uAspect, 1.0);
                        float speed = distance(uMouse * a, uPrevMouse * a);
                        float dist = distance(vUv * a, uMouse * a);
                        const float R = 0.048; // interaction radius

                        if (uDrop > 0.5 && dist < R) {
                            h += cos(dist / R * 1.5707963) * (speed * 42.0 + uStrength);
                        }

                        gl_FragColor = vec4(h, v, 0.0, 1.0);
                    }
                `
            });

            simQuad = new THREE.Mesh(quadGeo, simMaterial);
            simScene = new THREE.Scene();
            simScene.add(simQuad);

            // 3. Composite Shader: Snell's Law Refraction + Chromatic Aberration + Specular
            compositeMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uScene: { value: null },
                    uHeight: { value: null },
                    uSimTexel: { value: new THREE.Vector2(1.0 / simW, 1.0 / simH) },
                    uRipple: { value: 1.0 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position.xy, 0.0, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D uScene;
                    uniform sampler2D uHeight;
                    uniform vec2 uSimTexel;
                    uniform float uRipple;
                    varying vec2 vUv;

                    void main() {
                        if (uRipple < 0.01) {
                            gl_FragColor = texture2D(uScene, vUv);
                            return;
                        }

                        // Central difference heightmap gradients
                        float l = texture2D(uHeight, vUv - vec2(uSimTexel.x, 0.0)).r;
                        float r = texture2D(uHeight, vUv + vec2(uSimTexel.x, 0.0)).r;
                        float b = texture2D(uHeight, vUv - vec2(0.0, uSimTexel.y)).r;
                        float t = texture2D(uHeight, vUv + vec2(0.0, uSimTexel.y)).r;

                        vec2 slope = vec2(r - l, t - b) * 3.4;
                        vec3 n = normalize(vec3(slope, 1.0));

                        // Snell's Law refraction: water IOR = 1.333
                        vec3 inc = vec3(0.0, 0.0, -1.0);
                        vec3 refr = refract(inc, n, 1.0 / 1.333);
                        vec2 off = refr.xy * 0.45 * uRipple;

                        // Chromatic Aberration (R and B offset in opposite directions)
                        vec2 ca = off * 0.18;
                        float cr = texture2D(uScene, vUv + off - ca).r;
                        float cg = texture2D(uScene, vUv + off).g;
                        float cb = texture2D(uScene, vUv + off + ca).b;
                        float ca_a = texture2D(uScene, vUv + off).a;

                        vec3 c = vec3(cr, cg, cb);

                        // Directional lighting from top-right
                        float facing = dot(slope, vec2(0.7071, 0.7071));
                        vec3 lit = c + ca_a * (vec3(max(facing, 0.0)) * 0.95 - vec3(max(-facing, 0.0)) * 0.55);

                        // Blinn-Phong Specular glints on wave crests
                        vec3 wp = vec3(vUv * 2.0 - 1.0, 0.0);
                        vec3 L = normalize(vec3(2.0, 2.0, 3.0) - wp);
                        vec3 V = normalize(vec3(0.0, 0.0, 2.0) - wp);
                        float spec = pow(max(dot(V, reflect(-L, n)), 0.0), 48.0) * 2.2 * clamp(length(slope) * 8.0, 0.0, 1.0);

                        gl_FragColor = vec4(clamp(lit + vec3(spec * 0.85), 0.0, 1.0), max(ca_a, spec * 0.4));
                    }
                `
            });

            compositeQuad = new THREE.Mesh(quadGeo, compositeMaterial);
            compositeScene = new THREE.Scene();
            compositeScene.add(compositeQuad);
        }

        function setupPointerListeners(mouseLight) {
            const hero = document.querySelector('.mowa-hero') || window;

            function handlePointer(clientX, clientY, isDrag) {
                const rect = hero.getBoundingClientRect ? hero.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
                const x = (clientX - rect.left) / rect.width;
                const y = 1.0 - ((clientY - rect.top) / rect.height);

                state.mouse.set(Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)));
                state.moved = true;
                state.lastMoveTime = performance.now();
                state.dropStrength = isDrag ? 0.65 : 0.09;

                // 3D Tilt
                mouseX = (clientX / window.innerWidth) * 2 - 1;
                mouseY = -(clientY / window.innerHeight) * 2 + 1;
                targetRotationY = mouseX * 0.35;
                targetRotationX = mouseY * 0.35;

                if (mouseLight) {
                    mouseLight.position.x = mouseX * 3;
                    mouseLight.position.y = mouseY * 3;
                }
            }

            window.addEventListener('pointerdown', (e) => {
                state.isDragging = true;
                handlePointer(e.clientX, e.clientY, true);
                state.prevMouse.copy(state.mouse);
            }, { passive: true });

            window.addEventListener('pointermove', (e) => {
                handlePointer(e.clientX, e.clientY, state.isDragging);
            }, { passive: true });

            window.addEventListener('pointerup', () => {
                state.isDragging = false;
                state.dropStrength = 0.0;
            }, { passive: true });

            // Touch support for dragging
            window.addEventListener('touchstart', (e) => {
                if (e.touches.length > 0) {
                    state.isDragging = true;
                    handlePointer(e.touches[0].clientX, e.touches[0].clientY, true);
                    state.prevMouse.copy(state.mouse);
                }
            }, { passive: true });

            window.addEventListener('touchmove', (e) => {
                if (e.touches.length > 0) {
                    handlePointer(e.touches[0].clientX, e.touches[0].clientY, true);
                }
            }, { passive: true });

            window.addEventListener('touchend', () => {
                state.isDragging = false;
                state.dropStrength = 0.0;
            }, { passive: true });
        }

        function onResize() {
            if (!camera || !renderer) return;
            const width = window.innerWidth;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);

            if (sceneFBO) {
                sceneFBO.setSize(width, height);
            }

            simH = 128;
            simW = Math.max(32, Math.round((width / height) * simH));
            if (simMaterial) {
                simMaterial.uniforms.uTexel.value.set(1.0 / simW, 1.0 / simH);
                simMaterial.uniforms.uAspect.value = width / height;
            }
            if (compositeMaterial) {
                compositeMaterial.uniforms.uSimTexel.value.set(1.0 / simW, 1.0 / simH);
            }

            if (sculptureGroup) {
                if (width < 992) {
                    sculptureGroup.position.set(0, 1.25, -2.4);
                    sculptureGroup.scale.set(0.52, 0.52, 0.52);
                } else {
                    sculptureGroup.position.set(0.7, 0.15, -0.4);
                    sculptureGroup.scale.set(0.95, 0.95, 0.95);
                }
            }
        }

        function animate() {
            requestAnimationFrame(animate);

            if (!isVisible) return;

            // Hypnotic smooth 3D Torus Knot rotation & floating levitation
            if (knotMesh && wireMesh) {
                knotMesh.rotation.x += 0.0035;
                knotMesh.rotation.y += 0.0050;
                wireMesh.rotation.x = knotMesh.rotation.x;
                wireMesh.rotation.y = knotMesh.rotation.y;
                if (coreMesh) {
                    coreMesh.rotation.y -= 0.003;
                    coreMesh.scale.setScalar(1.0 + Math.sin(performance.now() * 0.002) * 0.05);
                }
                sculptureGroup.position.y = (window.innerWidth < 992 ? 1.25 : 0.15) + Math.sin(performance.now() * 0.0014) * 0.06;
            }

            if (sculptureGroup) {
                sculptureGroup.rotation.y += (targetRotationY - sculptureGroup.rotation.y) * 0.05;
                sculptureGroup.rotation.x += (targetRotationX - sculptureGroup.rotation.x) * 0.05;
            }

            const now = performance.now();
            const isRippling = (now - state.lastMoveTime) < 3500;

            // 1. Step Wave Simulation FBO (Ping-Pong)
            if (isRippling && simMaterial) {
                simMaterial.uniforms.uPrev.value = readTarget.texture;
                simMaterial.uniforms.uMouse.value.copy(state.mouse);
                simMaterial.uniforms.uPrevMouse.value.copy(state.prevMouse);
                simMaterial.uniforms.uDrop.value = state.moved ? 1.0 : 0.0;
                simMaterial.uniforms.uStrength.value = state.dropStrength;

                renderer.setRenderTarget(writeTarget);
                renderer.render(simScene, orthoCamera);

                const temp = readTarget;
                readTarget = writeTarget;
                writeTarget = temp;

                state.prevMouse.copy(state.mouse);
                state.moved = false;
            }

            // 2. Render 3D Scene into sceneFBO
            renderer.setRenderTarget(sceneFBO);
            renderer.render(scene, camera);

            // 3. Render Composite with Refraction onto Canvas Screen
            renderer.setRenderTarget(null);
            if (compositeMaterial) {
                compositeMaterial.uniforms.uScene.value = sceneFBO.texture;
                compositeMaterial.uniforms.uHeight.value = readTarget.texture;
                compositeMaterial.uniforms.uRipple.value = isRippling ? 1.0 : 0.0;
                renderer.render(compositeScene, orthoCamera);
            } else {
                renderer.render(scene, camera);
            }
        }

        initScene();
    }

    // -------------------------------------------------------------
    // 6. Project Category Filtering (.mowa-chip)
    // -------------------------------------------------------------
    function initProjectFiltering() {
        const chips = document.querySelectorAll('.mowa-chip');
        const cards = document.querySelectorAll('.mowa-project-card');

        if (!chips.length || !cards.length) return;

        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                const filter = chip.getAttribute('data-filter') || 'all';

                cards.forEach(card => {
                    const category = card.getAttribute('data-category') || '';
                    if (filter === 'all' || category === filter || category.includes(filter)) {
                        card.style.display = 'grid';
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 20);
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(20px)';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
    }

    // -------------------------------------------------------------
    // 7. Interactive Fandeck Hover Rotation Dampener
    // -------------------------------------------------------------
    function initFanDeck() {
        const stage = document.querySelector('.mowa-fandeck-stage');
        const cards = document.querySelectorAll('.mowa-fan-card');
        if (!stage || !cards.length) return;

        stage.addEventListener('mousemove', (e) => {
            const rect = stage.getBoundingClientRect();
            const xRel = (e.clientX - rect.left) / rect.width - 0.5;
            cards.forEach((card, i) => {
                const factor = (i - 1.5) * 4;
                card.style.setProperty('--drift', `${xRel * factor}deg`);
            });
        });
    }

    // -------------------------------------------------------------
    // 8. Dynamic Title Typing Animation (Gautam's Core Skill Titles)
    // -------------------------------------------------------------
    function initTypewriter() {
        const typedEl = document.querySelector('.mowa-typed-text');
        if (!typedEl) return;

        const titles = [
            "Security & SOC Analyst",
            "Frontend Developer",
            "Graphic Designer",
            "Networking & IT Specialist",
            "Founder @ Glavion Solutions"
        ];

        let titleIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typeSpeed = 85;

        function tick() {
            const currentTitle = titles[titleIndex];

            if (isDeleting) {
                typedEl.textContent = currentTitle.substring(0, charIndex - 1);
                charIndex--;
                typeSpeed = 40;
            } else {
                typedEl.textContent = currentTitle.substring(0, charIndex + 1);
                charIndex++;
                typeSpeed = 85;
            }

            if (!isDeleting && charIndex === currentTitle.length) {
                typeSpeed = 1900;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                titleIndex = (titleIndex + 1) % titles.length;
                typeSpeed = 400;
            }

            setTimeout(tick, typeSpeed);
        }

        setTimeout(tick, 500);
    }

    // -------------------------------------------------------------
    // DOM Ready Initialization
    // -------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        initOverlayMenu();
        initServiceRipples();
        initCustomCursor();
        initThreeHero();
        initProjectFiltering();
        initFanDeck();
        initTypewriter();
    });

})();
