import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createEngine } from './engine.js';
import { initialState, transition, linkage, MECHANICS, PARTS, LOCATIONS, canTest, getHint } from './mechanics.js';

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
const crankBench = new THREE.Vector3(-2.7, -.18, 0);
const capsBench = new THREE.Vector3(0, -.15, 3.05);
const rodCapBench = new THREE.Vector3(2.65, -.6, 2.65);
const benchPin = new THREE.Vector3(2.65, 1.65, 1.15);
const benchRodBase = benchPin.clone().add(new THREE.Vector3(0, -MECHANICS.rodLength, 0));
const selectionMaterials = new Map();
const metrics = { frameTimes: [], frames: 0, triangles: 0, drawCalls: 0, readyMs: 0 };

const partOrder = ['crank', 'piston', 'mainCaps', 'rodCap', 'block'];
const locationOrder = ['mainLine', 'cylinder', 'mainCaps', 'crankpin', 'otherCylinders'];
const letters = ['A', 'B', 'C', 'D', 'E'];
function buildControls() {
  $('part-list').innerHTML = partOrder.map((part, i) => `<button type="button" class="part-card" data-part="${part}" aria-pressed="false"><span class="part-symbol" aria-hidden="true">${['↻','↕','∩','∪','◇'][i]}</span><span><strong>${PARTS[part].name}</strong><small id="status-${part}">${part === 'block' ? 'Prepared fixture · inspect' : 'On the bench'}</small></span></button>`).join('');
  $('location-list').innerHTML = locationOrder.map((location, i) => `<button type="button" data-location="${location}" aria-pressed="false"><span>${letters[i]}</span>${LOCATIONS[location].name}</button>`).join('');
  $('scene-locations').innerHTML = locationOrder.map((location, i) => `<button type="button" class="location-marker" data-location="${location}" aria-label="Location ${letters[i]}: ${LOCATIONS[location].name}" title="${LOCATIONS[location].name}" hidden>${letters[i]}</button>`).join('');
  $('viewport').insertAdjacentHTML('beforeend', '<div id="placement-dock" class="placement-dock" hidden><span id="dock-location">Choose a location</span><button type="button" id="dock-seat">Seat here</button><button type="button" id="dock-cancel" aria-label="Cancel scene placement">×</button></div>');
}
function dispatch(action) {
  if (failed) return;
  state = transition(state, action);
  updateUI();
  if (engine) applyState();
  dirty = true;
}
function updateMotionUI() {
  $('angle').value = Math.round(state.angle * 180 / Math.PI);
  $('angle-value').value = `${Math.round(state.angle * 180 / Math.PI)}°`;
  $('turn-progress').textContent = state.tested ? 'Full revolution complete · test passed' : `${Math.min(360, Math.round(Math.abs(state.testTravel) * 180 / Math.PI))}° / 360° · keep turning in one direction`;
  $('completion').hidden = !state.tested;
}
function updateUI() {
  const hint = getHint(state);
  document.querySelectorAll('[data-part]').forEach(button => {
    const part = button.dataset.part;
    const chosen = part === state.selected;
    button.classList.toggle('selected', chosen);
    button.classList.toggle('hinted', hint.level >= 3 && hint.part === part);
    button.setAttribute('aria-pressed', String(chosen));
    const status = state.parts[part];
    $(`status-${part}`).textContent = part === 'block' ? 'Prepared fixture · inspect' : status === 'bench' ? 'On the bench' : status === 'secured' ? 'Seated · secured' : ['mainCaps','rodCap'].includes(part) ? 'Seated · fasteners open' : 'Seated';
  });
  const part = PARTS[state.selected];
  $('detail-type').textContent = part ? part.name.toUpperCase() : 'THE BENCH';
  $('detail-copy').textContent = part ? part.description : 'Explore the parts and decide what belongs where. Choose any component to inspect it.';
  $('inspect-part').hidden = !state.selected;
  const locating = state.phase === 'locate';
  $('primary-action').hidden = !state.selected || state.selected === 'block' || state.parts[state.selected] !== 'bench' || locating;
  $('location-panel').hidden = !locating;
  $('cancel').hidden = !locating;
  $('placement-dock').hidden = !locating;
  $('dock-location').textContent = state.tone === 'error' ? state.feedback : state.location ? LOCATIONS[state.location].name : 'Choose a location';
  $('dock-seat').disabled = !state.location;
  $('seat').disabled = !state.location;
  $('show-location').disabled = !state.location;
  const fastening = ['mainCaps','rodCap'].includes(state.selected) && state.parts[state.selected] !== 'bench';
  $('fastener-panel').hidden = !fastening;
  document.querySelectorAll('[data-tool]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tool === state.tool)));
  document.querySelectorAll('[data-fastener]').forEach(button => {
    const done = fastening && state.fasteners[state.selected][Number(button.dataset.fastener)];
    button.textContent = `Fastener ${Number(button.dataset.fastener) === 0 ? 'A' : 'B'} · ${done ? 'secured' : 'open'}`;
    button.setAttribute('aria-pressed', String(Boolean(done)));
  });
  document.querySelectorAll('[data-location]').forEach(button => {
    const chosen = state.location === button.dataset.location;
    button.setAttribute('aria-pressed', String(chosen));
    button.classList.toggle('hinted', hint.level >= 3 && hint.location === button.dataset.location);
    if (button.classList.contains('location-marker')) {
      button.hidden = !locating && !(hint.level >= 3 && hint.location === button.dataset.location);
      button.disabled = !locating;
    }
  });
  $('feedback').textContent = state.feedback;
  $('feedback').dataset.tone = state.tone;
  $('hint').textContent = hint.level === 0 ? 'Need a hint?' : hint.level < 4 ? 'More help' : 'Walkthrough shown';
  $('hint').disabled = hint.level >= 4 || state.tested;
  $('hint-level').textContent = hint.level ? `${hint.level} / 4` : 'OPTIONAL';
  $('hint-content').hidden = !hint.level;
  $('hint-title').textContent = hint.title;
  $('hint-copy').textContent = hint.text;
  const seated = Object.values(state.parts).filter(status => status !== 'bench').length;
  $('progress-count').textContent = `${seated} / 4 SEATED`;
  $('assembly-status').textContent = state.tested ? 'CHALLENGE COMPLETE' : canTest(state) ? 'ASSEMBLY SECURED' : `${seated} OF 4 COMPONENTS SEATED`;
  $('test-status').textContent = state.testStarted ? 'Use the angle slider, slow turn or 15° steps to complete one revolution.' : 'The test checks that the assembly is connected and secured.';
  $('test').hidden = state.testStarted;
  $('motion-controls').hidden = !state.testStarted;
  document.body.classList.toggle('assembly-installed', state.testStarted);
  $('play').textContent = state.playing ? 'Pause' : 'Turn crank';
  $('play').disabled = reducedMotion.matches || failed;
  $('play').title = reducedMotion.matches ? 'Reduced motion is enabled. Use Step or the angle slider.' : '';
  $('section').setAttribute('aria-pressed', String(state.section));
  $('scene-badge').innerHTML = `<span></span> ${state.section ? 'CUTAWAY VIEW' : 'FULL CASTING'}`;
  $('cutaway-explanation').textContent = state.section ? 'CUTAWAY OPENS ONE BANK TO SHOW THE INTERNALS.' : 'FULL CASTING · SWITCH CUTAWAY ON TO LOOK INSIDE.';
  $('part-annotation').hidden = state.parts.piston !== 'bench' || failed;
  $('annotation-text').textContent = 'PISTON + ROD';
  updateMotionUI();
}
function setFailure(message) {
  failed = true;
  state = { ...state, playing: false };
  $('loading').hidden = true;
  $('fallback').hidden = false;
  if (message) $('fallback-detail').textContent = message;
  $('scene-locations').hidden = true;
  $('placement-dock').hidden = true;
  $('part-annotation').hidden = true;
  document.querySelectorAll('.inspector button, .view-controls button, #section, #angle, .placement-dock button, .location-marker').forEach((el) => { el.disabled = true; });
  $('feedback').textContent = 'The 3D view is unavailable. Reload the workshop to try again.';
}
function locationPoint(location) {
  if (location === 'mainLine') return new THREE.Vector3(0, 0, .25);
  if (location === 'mainCaps') return new THREE.Vector3(0, -.45, 1.64);
  if (location === 'cylinder') return new THREE.Vector3(1.5, 1.5, MECHANICS.station);
  if (location === 'crankpin') return new THREE.Vector3(...linkage(state.angle).crankpin);
  return new THREE.Vector3(-1.3, 1.3, -.4);
}
function applyState() {
  engine.setSection(state.section);
  const installed = state.parts.piston !== 'bench';
  engine.crankshaft.position.copy(state.parts.crank === 'bench' ? crankBench : new THREE.Vector3());
  engine.crankshaft.rotation.set(0, 0, -state.angle);
  engine.mainCaps.position.copy(state.parts.mainCaps === 'bench' ? capsBench : new THREE.Vector3());
  engine.mainCaps.rotation.set(0, state.parts.mainCaps === 'bench' ? Math.PI / 2 : 0, 0);
  if (installed) {
    const { crankpin, wristpin } = linkage(state.angle);
    engine.piston.position.fromArray(wristpin);
    engine.piston.quaternion.setFromUnitVectors(yAxis, bankDirection);
    engine.rod.position.fromArray(crankpin);
    const direction = new THREE.Vector3().fromArray(wristpin).sub(engine.rod.position).normalize();
    engine.rod.quaternion.setFromUnitVectors(yAxis, direction);
  } else {
    engine.piston.position.copy(benchPin); engine.piston.quaternion.identity();
    engine.rod.position.copy(benchRodBase); engine.rod.quaternion.identity();
  }
  if (state.parts.rodCap === 'bench') {
    engine.rodCap.position.copy(rodCapBench); engine.rodCap.quaternion.identity();
  } else {
    engine.rodCap.position.copy(engine.rod.position); engine.rodCap.quaternion.copy(engine.rod.quaternion);
  }
  const hint = getHint(state);
  const indicated = state.phase === 'locate' && state.location ? state.location : hint.level >= 3 ? hint.location : null;
  targetRing.visible = Boolean(indicated);
  if (indicated) {
    targetRing.position.copy(locationPoint(indicated));
    targetRing.quaternion.setFromUnitVectors(bankDirection, indicated === 'cylinder' ? bankDirection : new THREE.Vector3(0, 0, 1));
  }
  for (const [part, materials] of selectionMaterials) for (const material of materials) {
    material.emissive.setHex(part === state.selected ? 0x15709d : 0x000000);
    material.emissiveIntensity = part === state.selected ? .18 : 0;
  }
  const nextShadowState = `${Object.values(state.parts).join('/')}/${state.section}/${state.testStarted}`;
  if (nextShadowState !== shadowState) {
    for (const group of [engine.crankshaft, engine.piston, engine.rod, engine.rodCap]) group.traverse(child => { if (child.isMesh) child.castShadow = !state.testStarted; });
    renderer.shadowMap.needsUpdate = true; shadowState = nextShadowState;
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
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(7.8, .15, 6.7, 4, .055), baseMaterial);
  plinth.position.set(.15, -1, .65);
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  scene.add(plinth);
  const trim = new THREE.Mesh(new RoundedBoxGeometry(7.82, .025, 6.72, 3, .035), new THREE.MeshStandardMaterial({ color: 0x536574, metalness: .9, roughness: .38 }));
  trim.position.copy(plinth.position).y = -1.047;
  scene.add(trim);
  // Discrete supports keep the crankcase visibly above the presentation surface.
  for (const z of [-1.35, 1.35]) {
    const support = new THREE.Mesh(new RoundedBoxGeometry(1.8, .31, .24, 3, .04), new THREE.MeshStandardMaterial({ color: 0x0d151b, metalness: .65, roughness: .45 }));
    support.position.set(0, -.77, z); support.castShadow = true; support.receiveShadow = true; scene.add(support);
  }
  for (const z of [-1.64, 1.64]) {
    const cradle = new THREE.Mesh(new RoundedBoxGeometry(.8, .525, .28, 3, .04), baseMaterial);
    cradle.position.set(crankBench.x, -.6625, z); cradle.castShadow = true; scene.add(cradle);
  }
  for (const [position, width, depth] of [[capsBench, 3.8, 1.4], [rodCapBench, .8, .65]]) {
    const tray = new THREE.Mesh(new RoundedBoxGeometry(width, .07, depth, 2, .035), baseMaterial);
    tray.position.copy(position).y = -.89; tray.receiveShadow = true; scene.add(tray);
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
  label.rotation.x = -Math.PI / 2; label.position.set(-.45, -.918, 3.63); scene.add(label);
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
  workshop: { target: [-.1, .4, .8], offset: [.5, 9.5, 10.5] },
  front: { target: [0, .4, .6], offset: [0, 3.3, 12] },
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
  if (state.parts.piston === 'bench') {
    projected.copy(benchPin).add(new THREE.Vector3(.2, .65, 0)).project(camera);
    $('part-annotation').style.left = `${Math.min(w - 115, Math.max(15, (projected.x + 1) * w / 2))}px`;
    $('part-annotation').style.top = `${Math.max(100, (1 - projected.y) * h / 2)}px`;
  }
  const placed = [];
  for (const button of document.querySelectorAll('.location-marker')) {
    if (button.hidden) continue;
    projected.copy(locationPoint(button.dataset.location)).project(camera);
    let x = THREE.MathUtils.clamp((projected.x + 1) * w / 2, 28, w - 28);
    let y = THREE.MathUtils.clamp((1 - projected.y) * h / 2, 140, h - 180);
    for (let attempts = 0; attempts < 12 && placed.some(p => Math.hypot(p.x-x,p.y-y) < 48); attempts++) {
      x = THREE.MathUtils.clamp(x + (attempts % 2 ? -52 : 52), 28, w - 28);
      y = THREE.MathUtils.clamp(y - 30, 130, h - 165);
    }
    placed.push({x,y}); button.style.left = `${x}px`; button.style.top = `${y}px`;
  }
}
function select(part) { dispatch({ type: 'select', part }); }
function seat() {
  const oldParts = JSON.stringify(state.parts);
  dispatch({ type: 'seat' });
  if (JSON.stringify(state.parts) !== oldParts) setView('detail');
}
function inspectSelected() {
  if (!state.selected || !camera || failed) return;
  const targets = {block: new THREE.Vector3(0,.8,0), crank: state.parts.crank === 'bench' ? crankBench : new THREE.Vector3(), mainCaps: state.parts.mainCaps === 'bench' ? capsBench : new THREE.Vector3(0,-.3,.8), piston: engine.piston.position, rodCap: engine.rodCap.position};
  controls.target.copy(targets[state.selected]);
  camera.position.copy(controls.target).add(new THREE.Vector3(3.5,3.2,5.3));
  controls.update(); currentView = 'inspection'; dirty = true;
  document.querySelectorAll('.view-presets button').forEach(button => {button.classList.remove('active');button.setAttribute('aria-pressed','false');});
  if (viewport.clientWidth < 580) viewport.scrollIntoView({behavior: 'instant', block:'start'});
}
function reset() { dispatch({type:'reset'}); setView('workshop'); }
function wireControls() {
  document.querySelectorAll('[data-part]').forEach(button => button.addEventListener('click', () => select(button.dataset.part)));
  $('primary-action').addEventListener('click', () => {
    dispatch({ type: 'begin-place' });
    if (state.phase === 'locate' && viewport.clientWidth < 580) viewport.scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth', block:'start'});
  });
  document.querySelectorAll('[data-location]').forEach(button => button.addEventListener('click', () => dispatch({type:'location',location:button.dataset.location})));
  for (const id of ['seat','dock-seat']) $(id).addEventListener('click', seat);
  for (const id of ['cancel','dock-cancel']) $(id).addEventListener('click', () => dispatch({type:'cancel'}));
  document.addEventListener('keydown', event => {if(event.key === 'Escape') dispatch({type:'cancel'});});
  $('inspect-part').addEventListener('click', inspectSelected);
  $('show-location').addEventListener('click', () => {if(state.location) {setView('detail');viewport.scrollIntoView({behavior:'instant',block:'start'});}});
  document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => dispatch({type:'tool',tool:button.dataset.tool})));
  document.querySelectorAll('[data-fastener]').forEach(button => button.addEventListener('click', () => dispatch({type:'fasten',index:Number(button.dataset.fastener)})));
  $('hint').addEventListener('click', () => dispatch({type:'hint'}));
  $('test').addEventListener('click', () => {dispatch({type:'test'});if(state.testStarted){setView('detail');viewport.scrollIntoView({behavior:'instant',block:'start'});}});
  $('play').addEventListener('click', () => {if(!reducedMotion.matches)dispatch({type:'toggle-play'});});
  $('step').addEventListener('click', () => dispatch({type:'step'}));
  $('angle').addEventListener('input', event => dispatch({type:'angle',angle:Number(event.target.value)*Math.PI/180}));
  $('section').addEventListener('click', () => dispatch({type:'section'}));
  $('reset').addEventListener('click', reset); $('replay').addEventListener('click', reset);
  for (const name of ['workshop','front','detail']) $(`view-${name}`).addEventListener('click', () => setView(name));
  $('home-view').addEventListener('click', () => setView('workshop'));
  for (const [id,factor] of [['zoom-in',.84],['zoom-out',1.19]]) $(id).addEventListener('click', () => {
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));
    camera.position.copy(controls.target).add(offset);controls.update();dirty=true;
  });
  reducedMotion.addEventListener('change', () => {if(reducedMotion.matches)dispatch({type:'pause'});updateUI();});
  document.addEventListener('visibilitychange', () => {if(document.hidden)dispatch({type:'pause'});});
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
    for (const [part, groups] of [['block', [engine.block]], ['crank', [engine.crankshaft]], ['piston', [engine.piston, engine.rod]], ['mainCaps', [engine.mainCaps]], ['rodCap', [engine.rodCap]]]) {
      const materials = new Set();
      for (const group of groups) group.traverse((child) => {
        if (child.isMesh) { child.material = child.material.clone(); materials.add(child.material); }
      });
      selectionMaterials.set(part, materials);
    }
    addWorkshop();
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .09;
    controls.enablePan = false; controls.minDistance = 3.8; controls.maxDistance = 19;
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
        const wasTested = state.tested;
        state = transition(state, { type: 'tick', delta: delta * .62 });
        applyState();
        if (!wasTested && state.tested) updateUI();
        else updateMotionUI();
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
buildControls(); wireControls(); updateUI(); initialize();

// Read-only diagnostics for reproducible validation, not a second state owner.
Object.defineProperty(window, '__PROJECT442__', { value: Object.freeze({
  snapshot() {
    const positions = engine ? {
      piston: engine.piston.position.toArray(), rodBig: engine.rod.position.toArray(),
      rodCap: engine.rodCap.position.toArray(), crank: engine.crankshaft.position.toArray(),
      rodSmall: engine.rod.localToWorld(new THREE.Vector3(0, MECHANICS.rodLength, 0)).toArray(),
    } : null;
    const bounds = viewport.getBoundingClientRect();
    const p = camera ? benchPin.clone().add(new THREE.Vector3(0, .15, 0)).project(camera) : null;
    return { state: structuredClone(state), positions, failed, pistonScreen: p ? { x: bounds.left + (p.x + 1) * bounds.width / 2, y: bounds.top + (1 - p.y) * bounds.height / 2 } : null, metrics: { ...metrics, frameTimes: [...metrics.frameTimes] }, camera: camera?.position.toArray() };
  },
}) });
