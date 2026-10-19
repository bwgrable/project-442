import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createEngine } from './engine.js';
import { initialState, transition, linkage, MECHANICS } from './mechanics.js';

const $ = (id) => document.getElementById(id);
const viewport = $('viewport');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let state = initialState();
let renderer, scene, camera, controls, engine, floor, targetRing;
let failed = false;
let dirty = true;
let currentView = 'workshop';
let shadowState = '';
const activePointers = new Map();
let gesture = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const yAxis = new THREE.Vector3(0, 1, 0);
const projected = new THREE.Vector3();
const bankDirection = new THREE.Vector3(Math.SQRT1_2, Math.SQRT1_2, 0);
const benchPin = new THREE.Vector3(2.65, 1.65, 1.15);
const benchRodBase = benchPin.clone().add(new THREE.Vector3(0, -MECHANICS.rodLength, 0));
const descriptions = {
  block: ['THE FOUNDATION', 'The block locates the cylinders and supports the crankshaft. The cutaway opens a window into the moving assembly.'],
  crank: ['ROTATION, MADE VISIBLE', 'Offset journals carry the connecting rods around the crank’s axis. The counterweights balance the shape of the rotating assembly.'],
  piston: ['THE CONNECTION', 'The wrist pin joins piston to rod. The rod’s other end follows a crankpin, turning rotation into travel along the cylinder.'],
};
const selectionMaterials = new Map();
const metrics = { frameTimes: [], frames: 0, triangles: 0, drawCalls: 0, readyMs: 0 };

function dispatch(action, message) {
  state = transition(state, action);
  updateUI();
  if (message) $('feedback').textContent = message;
  if (!failed && engine) applyState();
  dirty = true;
}
function updateUI() {
  document.querySelectorAll('[data-part]').forEach((button) => {
    const chosen = button.dataset.part === state.selected;
    button.classList.toggle('selected', chosen);
    button.setAttribute('aria-pressed', String(chosen));
  });
  const [title, copy] = descriptions[state.selected];
  $('detail-type').textContent = title;
  $('detail-copy').textContent = copy;
  const installed = state.phase === 'installed';
  document.body.classList.toggle('assembly-installed', installed);
  $('piston-state').textContent = installed ? 'Connected · ready to turn' : state.phase === 'aligned' ? 'Selected · choose the blue destination' : 'On the bench · ready to inspect';
  $('primary-action').hidden = installed;
  $('action-text').textContent = state.selected !== 'piston' ? 'Inspect piston + rod' : state.phase === 'aligned' ? 'Seat in selected cylinder' : 'Find the connection';
  $('cancel').hidden = state.phase !== 'aligned';
  $('motion-controls').hidden = !installed;
  $('placement-target').hidden = state.phase !== 'aligned' || failed;
  $('play').textContent = state.playing ? 'Pause' : 'Turn crank';
  $('play').disabled = reducedMotion.matches || failed;
  $('play').title = reducedMotion.matches ? 'Reduced motion is enabled. Use Step or the angle slider.' : '';
  $('section').setAttribute('aria-pressed', String(state.section));
  $('scene-badge').innerHTML = `<span></span> ${state.section ? 'CUTAWAY VIEW' : 'FULL CASTING'}`;
  $('assembly-status').innerHTML = `<i></i> ${installed ? 'ASSEMBLY CONNECTED' : state.phase === 'aligned' ? 'AWAITING PLACEMENT' : 'READY TO EXPLORE'}`;
  $('angle').value = Math.round(state.angle * 180 / Math.PI);
  $('angle-value').value = `${Math.round(state.angle * 180 / Math.PI)}°`;
  $('part-annotation').hidden = installed || failed;
  $('annotation-text').textContent = state.selected === 'piston' ? 'PISTON + ROD / SELECTED' : 'PISTON + ROD';
}
function setFailure(message) {
  failed = true;
  state = { ...state, playing: false };
  $('loading').hidden = true;
  $('fallback').hidden = false;
  if (message) $('fallback-detail').textContent = message;
  $('placement-target').hidden = true;
  $('part-annotation').hidden = true;
  document.querySelectorAll('.inspector button, .view-controls button, #section, #angle').forEach((el) => { el.disabled = true; });
  $('feedback').textContent = 'The 3D view is unavailable. Reload the workshop to try again.';
}
function applyState() {
  engine.setSection(state.section);
  engine.crankshaft.rotation.z = -state.angle;
  if (state.phase === 'installed') {
    const { crankpin, wristpin } = linkage(state.angle);
    engine.piston.position.fromArray(wristpin);
    engine.piston.quaternion.setFromUnitVectors(yAxis, bankDirection);
    engine.rod.position.fromArray(crankpin);
    const rodDirection = new THREE.Vector3().fromArray(wristpin).sub(engine.rod.position).normalize();
    engine.rod.quaternion.setFromUnitVectors(yAxis, rodDirection);
  } else {
    engine.piston.position.copy(benchPin);
    engine.piston.quaternion.identity();
    engine.rod.position.copy(benchRodBase);
    engine.rod.quaternion.identity();
  }
  targetRing.visible = state.phase === 'aligned';
  for (const [part, materials] of selectionMaterials) {
    for (const material of materials) {
      material.emissive.setHex(part === state.selected && part !== 'block' ? 0x15709d : 0x000000);
      material.emissiveIntensity = part === state.selected ? .18 : 0;
    }
  }
  // Cache the workshop's static shadows. Moving installed internals do not cast
  // animated shadows; their geometry/material lighting remains fully interactive.
  const nextShadowState = `${state.phase}/${state.section}`;
  if (nextShadowState !== shadowState) {
    for (const group of [engine.crankshaft, engine.piston, engine.rod]) {
      group.traverse(child => { if (child.isMesh) child.castShadow = state.phase !== 'installed'; });
    }
    renderer.shadowMap.needsUpdate = true;
    shadowState = nextShadowState;
  }
  engine.group.updateMatrixWorld(true);
}

function addWorkshop() {
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x172631, roughness: .61, metalness: .48 });
  floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x090f15, roughness: .8, metalness: .15 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.12;
  floor.receiveShadow = true;
  scene.add(floor);
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(6.6, .15, 5.1, 4, .055), baseMaterial);
  plinth.position.set(.55, -1, .1);
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  scene.add(plinth);
  const trim = new THREE.Mesh(new RoundedBoxGeometry(6.62, .025, 5.12, 3, .035), new THREE.MeshStandardMaterial({ color: 0x536574, metalness: .9, roughness: .38 }));
  trim.position.copy(plinth.position).y = -1.047;
  scene.add(trim);
  // Discrete supports keep the crankcase visibly above the presentation surface.
  for (const z of [-1.35, 1.35]) {
    const support = new THREE.Mesh(new RoundedBoxGeometry(1.8, .31, .24, 3, .04), new THREE.MeshStandardMaterial({ color: 0x0d151b, metalness: .65, roughness: .45 }));
    support.position.set(0, -.77, z); support.castShadow = true; support.receiveShadow = true; scene.add(support);
  }
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(.56, .62, .08, 64), new THREE.MeshStandardMaterial({ color: 0x101c25, metalness: .65, roughness: .38 }));
  pad.position.set(benchPin.x, -.88, benchPin.z); pad.receiveShadow = true; scene.add(pad);
  const holder = new THREE.Mesh(new RoundedBoxGeometry(.12, 1.04, .12, 2, .025), baseMaterial);
  holder.position.set(benchPin.x, -.4, benchPin.z - .2); holder.castShadow = true; scene.add(holder);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.54, .008, 5, 64), new THREE.MeshBasicMaterial({ color: 0x3b7897 }));
  halo.rotation.x = Math.PI / 2; halo.position.copy(pad.position).y += .05; scene.add(halo);
  const plateCanvas = document.createElement('canvas'); plateCanvas.width = 1024; plateCanvas.height = 192;
  const c = plateCanvas.getContext('2d');
  c.fillStyle = '#172630'; c.fillRect(0, 0, 1024, 192);
  c.strokeStyle = '#526c7b'; c.lineWidth = 2; c.strokeRect(2, 2, 1020, 188);
  c.font = '600 54px sans-serif'; c.fillStyle = '#c2d1d9'; c.fillText('ROCKET 400', 38, 84);
  c.font = '24px sans-serif'; c.fillStyle = '#7e9aaa'; c.fillText('ROTATING ASSEMBLY     /     PROJECT 442', 40, 138);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.75, .328), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(plateCanvas), roughness: .55, metalness: .25 }));
  label.rotation.x = -Math.PI / 2; label.position.set(-.45, -.918, 2.12); scene.add(label);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x53caff, transparent: true, opacity: .95, depthTest: false });
  targetRing = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.36, .014, 8, 64), ringMaterial);
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), bankDirection);
  targetRing.add(ring);
  const guide = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .65, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0x53caff, transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false }));
  guide.quaternion.setFromUnitVectors(yAxis, bankDirection); targetRing.add(guide);
  targetRing.position.set(Math.SQRT1_2 * 2.05, Math.SQRT1_2 * 2.05, MECHANICS.station);
  targetRing.renderOrder = 10; scene.add(targetRing);
}

const views = {
  workshop: { target: [.55, .48, .3], offset: [.5, 8.5, 8.8] },
  front: { target: [.5, .55, .2], offset: [0, 2.4, 9.4] },
  detail: { target: [.65, .65, 1.0], offset: [4.9, 2.7, 5.3] },
};
function setView(name = 'workshop') {
  if (!camera || !controls || failed) return;
  currentView = name;
  const preset = views[name];
  const narrow = viewport.clientWidth < 580;
  const distanceScale = narrow ? 1.18 : 1;
  controls.target.fromArray(preset.target);
  camera.position.copy(controls.target).add(new THREE.Vector3(...preset.offset).multiplyScalar(distanceScale));
  controls.update();
  ['workshop', 'front', 'detail'].forEach((view) => {
    $(`view-${view}`).classList.toggle('active', name === view);
    $(`view-${view}`).setAttribute('aria-pressed', String(name === view));
  });
  dirty = true;
}
function resize() {
  if (!renderer || failed) return;
  const width = viewport.clientWidth, height = viewport.clientHeight;
  camera.aspect = width / height;
  // A modest portrait FOV gives the assembly room without shrinking the UI.
  camera.fov = width < 580 ? 40 : 36;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  dirty = true;
}
function positionAnnotations() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  if (state.phase !== 'installed') {
    projected.copy(benchPin).add(new THREE.Vector3(.2, .65, 0)).project(camera);
    const el = $('part-annotation');
    el.style.left = `${Math.min(w - 115, Math.max(15, (projected.x + 1) * w / 2))}px`;
    el.style.top = `${Math.max(100, (1 - projected.y) * h / 2)}px`;
  }
  if (state.phase === 'aligned') {
    projected.copy(targetRing.position).project(camera);
    $('placement-target').style.left = `${Math.min(w - 75, Math.max(75, (projected.x + 1) * w / 2))}px`;
    $('placement-target').style.top = `${Math.min(h - 140, Math.max(120, (1 - projected.y) * h / 2))}px`;
  }
}
function select(part, source = 'control') {
  if (failed) return;
  dispatch({ type: 'select', part }, part === 'piston' ? 'Inspect the wrist pin, rod and cap. Find the connection when you’re ready.' : `${part === 'block' ? 'Engine block' : 'Crankshaft'} selected. Orbit the view to explore its shape.`);
  if (source === 'canvas' && matchMedia('(max-width: 760px)').matches) {
    // Selection feedback remains in view without unexpectedly scrolling the page.
    $('annotation-text').textContent = part === 'piston' ? 'PISTON + ROD / SELECTED' : 'PISTON + ROD';
  }
}
function place() {
  if (state.phase !== 'aligned' || failed) return;
  dispatch({ type: 'place' }, 'Connected. Turn the crank and follow the motion from journal to wrist pin.');
  setView('detail');
}
function wireControls() {
  document.querySelectorAll('[data-part]').forEach((button) => button.addEventListener('click', () => select(button.dataset.part)));
  $('primary-action').addEventListener('click', (event) => {
    if (event.detail > 1) return; // A double tap must not advance two placement stages.
    if (state.selected !== 'piston') return select('piston');
    if (state.phase === 'aligned') return place();
    dispatch({ type: 'align' }, 'The blue guide marks this proof’s cylinder. Seat the assembly, or cancel to keep inspecting.');
    if (!state.section) dispatch({ type: 'section' });
    if (viewport.clientWidth < 580) viewport.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
  });
  $('placement-target').addEventListener('click', place);
  $('cancel').addEventListener('click', () => dispatch({ type: 'cancel' }, 'Placement canceled. The assembly remains on the bench.'));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') dispatch({ type: 'cancel' }, 'Selection kept; placement canceled.'); });
  $('play').addEventListener('click', () => {
    if (!reducedMotion.matches) dispatch({ type: 'toggle-play' }, state.playing ? 'Motion paused. Step or drag the angle control to inspect a connection.' : 'Turning slowly. Every moving part follows the same crank angle.');
  });
  $('step').addEventListener('click', () => dispatch({ type: 'step' }, 'Advanced 15°. The rod stays connected at both ends.'));
  $('angle').addEventListener('input', (event) => dispatch({ type: 'angle', angle: Number(event.target.value) * Math.PI / 180 }));
  $('section').addEventListener('click', () => dispatch({ type: 'section' }));
  $('reset').addEventListener('click', () => { dispatch({ type: 'reset' }, 'Exploration reset. The piston assembly is back on the bench.'); setView('workshop'); });
  for (const name of ['workshop', 'front', 'detail']) $(`view-${name}`).addEventListener('click', () => setView(name));
  $('home-view').addEventListener('click', () => setView('workshop'));
  for (const [id, factor] of [['zoom-in', .84], ['zoom-out', 1.19]]) $(id).addEventListener('click', () => {
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(offset); controls.update(); dirty = true;
  });
  $('retry').addEventListener('click', () => location.reload());
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) state = { ...state, playing: false }; updateUI(); });
}
function wirePicking() {
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (event) => {
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size === 1) gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, multiple: false };
    else if (gesture) gesture.multiple = true;
  });
  canvas.addEventListener('pointermove', (event) => {
    if (gesture && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) gesture.moved = true;
  });
  canvas.addEventListener('pointerup', (event) => {
    const tap = gesture && gesture.id === event.pointerId && !gesture.moved && !gesture.multiple;
    activePointers.delete(event.pointerId);
    if (tap) {
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const candidates = [];
      for (const { object, part } of engine.pickables) {
        object.traverse((child) => { if (child.isMesh && child.visible && child.parent.visible) { child.userData.pickPart = part; candidates.push(child); } });
      }
      const hit = raycaster.intersectObjects(candidates, false)[0];
      if (hit) select(hit.object.userData.pickPart, 'canvas');
    }
    if (!activePointers.size) gesture = null;
  });
  const cancel = (event) => { activePointers.delete(event.pointerId); if (gesture) gesture.multiple = true; if (!activePointers.size) gesture = null; };
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('lostpointercapture', cancel);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); setFailure('The graphics connection was interrupted. Your browser may be low on graphics memory. Reload to reopen the workshop.');
  });
}
function initialize() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .98;
    renderer.domElement.setAttribute('aria-label', 'Three-dimensional engine model. Use the part buttons and camera controls for keyboard access.');
    renderer.domElement.setAttribute('role', 'img');
    $('canvas-wrap').append(renderer.domElement);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x131e28);
    scene.fog = new THREE.Fog(0x131e28, 18, 48);
    camera = new THREE.PerspectiveCamera(36, 1, .05, 100);
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(environment, .04, .1, 100, { size: 128 }).texture;
    scene.environmentIntensity = .8;
    environment.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xb9d8eb, 0x1b2431, .55));
    const key = new THREE.DirectionalLight(0xffeddb, 3.0);
    key.position.set(-3, 7, 5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5; key.shadow.camera.right = 5; key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
    key.shadow.camera.near = .5; key.shadow.camera.far = 18; key.shadow.normalBias = .025; key.shadow.bias = -.00015;
    key.shadow.radius = 3; scene.add(key);
    const rim = new THREE.DirectionalLight(0x7bcbff, 2.2); rim.position.set(4, 4, -4); scene.add(rim);
    const fill = new THREE.DirectionalLight(0xd6eaff, .8); fill.position.set(1, 1, 6); scene.add(fill);
    engine = createEngine(); scene.add(engine.group);
    for (const [part, groups] of [['block', [engine.block]], ['crank', [engine.crankshaft]], ['piston', [engine.piston, engine.rod]]]) {
      const materials = new Set();
      for (const group of groups) group.traverse((child) => {
        if (child.isMesh) { child.material = child.material.clone(); materials.add(child.material); }
      });
      selectionMaterials.set(part, materials);
    }
    addWorkshop();
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .09;
    controls.enablePan = false; controls.minDistance = 5.2; controls.maxDistance = 15;
    controls.minPolarAngle = .25; controls.maxPolarAngle = Math.PI / 2 - .04;
    controls.rotateSpeed = .65; controls.zoomSpeed = .75;
    controls.addEventListener('change', () => { dirty = true; });
    resize(); setView('workshop'); applyState(); wirePicking();
    new ResizeObserver(resize).observe(viewport);
    renderer.render(scene, camera);
    metrics.readyMs = performance.now();
    $('loading').hidden = true;
    $('viewport').dataset.ready = 'true';
    let last = performance.now();
    function frame(now) {
      if (failed) return;
      const delta = Math.min((now - last) / 1000, .05); last = now;
      controls.update();
      if (state.playing && !document.hidden) {
        state = transition(state, { type: 'tick', delta: delta * .62 });
        applyState();
        $('angle').value = Math.round(state.angle * 180 / Math.PI);
        $('angle-value').value = `${Math.round(state.angle * 180 / Math.PI)}°`;
        dirty = true;
      }
      if (dirty && !document.hidden) {
        positionAnnotations();
        const begin = performance.now(); renderer.render(scene, camera);
        metrics.frameTimes.push(performance.now() - begin);
        if (metrics.frameTimes.length > 600) metrics.frameTimes.shift();
        metrics.frames++; metrics.triangles = renderer.info.render.triangles; metrics.drawCalls = renderer.info.render.calls;
        dirty = false;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  } catch (error) {
    console.error('Workshop initialization failed:', error);
    setFailure();
  }
}
wireControls(); updateUI(); initialize();

// Read-only diagnostics for reproducible validation, not a second state owner.
Object.defineProperty(window, '__PROJECT442__', { value: Object.freeze({
  snapshot() {
    const positions = engine ? {
      piston: engine.piston.position.toArray(), rodBig: engine.rod.position.toArray(),
      rodSmall: engine.rod.localToWorld(new THREE.Vector3(0, MECHANICS.rodLength, 0)).toArray(),
    } : null;
    const bounds = viewport.getBoundingClientRect();
    const p = camera ? benchPin.clone().add(new THREE.Vector3(0, .15, 0)).project(camera) : null;
    return { state: { ...state }, positions, failed, pistonScreen: p ? { x: bounds.left + (p.x + 1) * bounds.width / 2, y: bounds.top + (1 - p.y) * bounds.height / 2 } : null, metrics: { ...metrics, frameTimes: [...metrics.frameTimes] }, camera: camera?.position.toArray() };
  },
}) });
