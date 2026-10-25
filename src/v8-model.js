import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPilotEngine, PILOT_DIMENSIONS } from './pilot-model.js';
import { V8, CYLINDERS } from './v8-mechanics.js';
import { ORDER } from './v8-state.js';

export const V8_DIMENSIONS = Object.freeze({ ...PILOT_DIMENSIONS, rodWidth: V8.rodWidth, bankOffset: V8.bankOffset, crankpinLength: V8.crankpinLength, mainJournalRadius: .22, mainBearingBoreRadius: .224, mainCapDepth: .13 });
export function createV8Engine() {
  const group = new THREE.Group(), block = new THREE.Group(); block.name = 'block'; group.add(block);
  const parts = Object.fromEntries(ORDER.map(id => { const root = new THREE.Group(); root.name = id; group.add(root); return [id, root]; }));
  const material = (color, metalness = .8, roughness = .32) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const mats = { paint: material(0x23484c, .35, .72), cut: material(0xb17d51, .6, .5), steel: material(0x718793), deck: material(0x9baeb3), journal: material(0xd5e0e4, .96, .16), forged: material(0x596774), bronze: material(0x9e7945), black: material(0x17252d), pan: material(0x536e75, .7, .38) };
  function mesh(parent, geometry, mat, position = [0, 0, 0], section = false) { const item = new THREE.Mesh(geometry, mat); item.position.set(...position); item.userData.section = section; parent.add(item); return item; }
  function plate(shape, depth) { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 12 }); g.translate(0, 0, -depth / 2); return g; }
  function ring(outer, inner, length) { const s = new THREE.Shape(); s.absarc(0, 0, outer, 0, Math.PI * 2); const h = new THREE.Path(); h.absarc(0, 0, inner, 0, Math.PI * 2, true); s.holes.push(h); return plate(s, length); }
  function half(outer, inner, length, lower = false) { const s = new THREE.Shape(), start = lower ? Math.PI : 0, end = start + Math.PI; s.absarc(0, 0, outer, start, end); s.lineTo(inner * Math.cos(end), inner * Math.sin(end)); s.absarc(0, 0, inner, end, start, true); s.closePath(); return plate(s, length); }
  function box(parent, size, mat, position, section = false) { return mesh(parent, new THREE.BoxGeometry(...size), mat, position, section); }
  function journal(parent, radius, length, position, mat = mats.journal) { const m = mesh(parent, new THREE.CylinderGeometry(radius, radius, length, 32), mat, position); m.rotation.x = Math.PI / 2; return m; }
  // Open bores in two continuous banks. Each liner and casting is truly annular.
  for (const bankName of ['A', 'B']) {
    const bank = new THREE.Group(); bank.rotation.z = bankName === 'A' ? -V8.bankAngle : V8.bankAngle; block.add(bank);
    for (const c of CYLINDERS.filter(c => c.bank === bankName)) {
      const z = c.station + c.axialOffset;
      for (const front of [false, true]) {
        // Tube axis is local Y. The near half opens toward camera +Z.
        for (const [outer, inner, length, mat] of [[.432,.342,1.16,mats.paint],[.34,.317,1.2,mats.steel],[.45,.317,.075,mats.deck]]) {
          const g = half(outer, inner, length, !front); g.rotateX(Math.PI / 2);
          mesh(bank, g, mat, [0, length < .1 ? 2.25 : 1.66, z], front);
        }
      }
      for (const x of [-.387,.387]) box(bank,[.09,1.16,.018],mats.cut,[x,1.66,z]);
      // Machined bridge pads join the four deck rings without closing a bore.
      for (const x of [-.44,.44]) box(bank,[.09,.075,.9],mats.deck,[x,2.25,z]);
      for (const x of [-.48,.48]) box(bank,[.08,1.0,.12],mats.paint,[x,1.64,z-.22]);
    }
    for (const x of [-.46,.46]) box(bank,[.12,.15,3.75],mats.paint,[x,1.1,bankName === 'A' ? .12 : -.12]);
  }
  // Five saddles support the main journals; camera-facing end support and all
  // of its mating details share section membership so nothing floats in space.
  for (const z of V8.mainStations) {
    const front = z > 1.7;
    mesh(block, half(.59,.234,.13), mats.paint,[0,0,z],front);
    mesh(parts.bearings, half(.232,.224,.135),mats.bronze,[0,0,z],front);
    mesh(parts.mainCaps, half(.47,.234,.13,true),mats.forged,[0,0,z],front);
    mesh(parts.mainCaps, half(.232,.224,.135,true),mats.bronze,[0,0,z],front);
    for (const x of [-.44,.44]) {
      box(block,[.25,.33,.13],mats.paint,[x,.15,z],front);
      box(parts.mainCaps,[.25,.25,.13],mats.forged,[x,-.125,z],front);
      const bolt = mesh(parts.mainCaps,new THREE.CylinderGeometry(.06,.06,.08,6),mats.deck,[x,-.29,z],front); bolt.userData.section = front;
    }
    journal(parts.crank,.22,.25,[0,0,z]);
  }
  for (const x of [-.72,.72]) box(block,[.13,.16,4.0],mats.paint,[x,-.47,0]);
  // Four paired rod journals. Geometry phase and negative root rotation match
  // the analytic solver exactly; side cheeks leave both axial rod lanes clear.
  for (let i = 0; i < 4; i++) {
    const z = V8.stations[i], phase = V8.phases[i], x = V8.radius * Math.sin(phase), y = V8.radius * Math.cos(phase);
    journal(parts.crank,.165,.56,[x,y,z]);
    for (const dz of [-.34,.34]) {
      const s = new THREE.Shape(); s.moveTo(-.255,-.22); s.lineTo(.255,-.22); s.lineTo(.255,.47); s.quadraticCurveTo(0,.7,-.255,.47); s.closePath();
      const cheek = mesh(parts.crank,plate(s,.09),mats.forged,[0,0,z+dz]); cheek.rotation.z = -phase;
      const weight = box(parts.crank,[.65,.26,.09],mats.steel,[-.29*Math.sin(phase),-.29*Math.cos(phase),z+dz]); weight.rotation.z = -phase;
    }
  }
  journal(parts.crank,.20,.4,[0,0,-2.04]); journal(parts.crank,.3,.10,[0,0,2.03],mats.forged);
  // Reuse the pilot's authored hollow pistons and rod joints. Geometry buffers
  // are shared across cylinders, while every selectable set owns its materials.
  const pilot = createPilotEngine(), units = {};
  function reducePalette(root, from, to) {
    const replacement = root.children.find(child => child.isMesh && child.material.color.getHex() === to)?.material;
    const buckets = new Map();
    for (const child of root.children) {
      if (!child.isMesh) continue;
      const mat = child.material.color.getHex() === from ? replacement : child.material;
      if (!buckets.has(mat)) buckets.set(mat,[]);
      buckets.get(mat).push(child.geometry);
    }
    root.clear();
    for (const [mat, geometries] of buckets) mesh(root,mergeGeometries(geometries,false),mat);
  }
  reducePalette(pilot.piston,0x17252d,0x3b4247);
  reducePalette(pilot.rodCap,0xd5e0e4,0x718793);
  function copyMeshes(source, target) {
    const materials = new Map();
    for (const child of source.children) {
      if (!child.isMesh) continue;
      if (!materials.has(child.material)) materials.set(child.material,child.material.clone());
      const copy = new THREE.Mesh(child.geometry,materials.get(child.material)); copy.position.copy(child.position); copy.quaternion.copy(child.quaternion); target.add(copy);
    }
  }
  for (const c of CYLINDERS) {
    const piston = parts[`piston_${c.id}`], rod = parts[`rod_${c.id}`], pin = new THREE.Group(), cap = new THREE.Group(); pin.name = `pin_${c.id}`; cap.name = `cap_${c.id}`;
    copyMeshes(pilot.piston,piston); copyMeshes(pilot.rod,rod); copyMeshes(pilot.rodCap,cap); copyMeshes(pilot.wristPin,pin);
    pin.position.y = V8.rodLength; rod.add(pin,cap); units[c.id] = { piston,rod,pin,cap };
  }
  // Generic block-mounted pump, with a continuous pickup tube to the sump.
  box(parts.pump,[.44,.42,.42],mats.forged,[-.12,-.94,-1.49]);
  box(parts.pump,[.2,.34,.16],mats.steel,[-.12,-.55,-1.72]);
  for (const x of [-.26,.02]) { const bolt = mesh(parts.pump,new THREE.CylinderGeometry(.035,.035,.08,6),mats.journal,[x,-.58,-1.73]); bolt.rotation.x = Math.PI / 2; }
  const pickupPath = new THREE.CatmullRomCurve3([new THREE.Vector3(-.12,-1.02,-1.35),new THREE.Vector3(-.12,-1.17,-1.1),new THREE.Vector3(0,-1.24,-.6),new THREE.Vector3(.12,-1.24,0)]);
  mesh(parts.pump,new THREE.TubeGeometry(pickupPath,18,.05,10,false),mats.steel);
  const screen = mesh(parts.pump,new THREE.CylinderGeometry(.25,.25,.09,24),mats.black,[.12,-1.28,0]);
  // Hollow pan: floor, four separate walls and an open flange, never a solid box.
  box(parts.pan,[1.66,.09,4.23],mats.pan,[0,-1.49,0],true);
  for (const x of [-.8,.8]) box(parts.pan,[.09,.9,4.23],mats.pan,[x,-1.0,0],x > 0);
  for (const z of [-2.07,2.07]) box(parts.pan,[1.66,.9,.09],mats.pan,[0,-1.0,z],z > 0);
  for (const x of [-.9,.9]) box(parts.pan,[.2,.09,4.4],mats.deck,[x,-.55,0],x > 0);
  for (const z of [-2.15,2.15]) box(parts.pan,[1.8,.09,.16],mats.deck,[0,-.55,z],z > 0);
  const drain = mesh(parts.pan,new THREE.CylinderGeometry(.085,.085,.12,6),mats.journal,[0,-1.56,1.4],true);
  // Batch static components by material and section membership. Cylinder joints
  // retain their child hierarchy so their centers remain independently testable.
  const sectionParts = [];
  for (const root of [block,parts.bearings,parts.crank,parts.mainCaps,parts.pump,parts.pan]) {
    root.updateMatrixWorld(true); const inverse = root.matrixWorld.clone().invert(), buckets = new Map();
    root.traverse(child => {
      if (!child.isMesh) return;
      const key = `${child.material.uuid}:${!!child.userData.section}`;
      if (!buckets.has(key)) buckets.set(key,{ material:child.material.clone(),section:!!child.userData.section,geometries:[] });
      const g = child.geometry.clone().applyMatrix4(inverse.clone().multiply(child.matrixWorld));
      buckets.get(key).geometries.push(g.index ? g.toNonIndexed() : g);
    });
    root.clear();
    for (const bucket of buckets.values()) {
      const geometry = mergeGeometries(bucket.geometries,false); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const item = mesh(root,geometry,bucket.material,[0,0,0],bucket.section); if (bucket.section) sectionParts.push(item); bucket.geometries.forEach(g=>g.dispose());
    }
  }
  // Piston/rod meshes from the pilot already merge by material. Consolidate the
  // rod cap's compatible materials into its parent without losing diagnostic refs.
  function setSection(enabled) { sectionParts.forEach(item => { item.visible = !enabled; }); }
  setSection(true); group.userData.illustrative = true;
  const anchors = {
    bearings: [{ text: 'Upper bearing shell', point: [0,.228,0] }],
    crank: [{ text: 'Main journal', point: [0,.22,0] }, { text: 'Paired rod journal', point: [.42,0,-1.35] }, { text: 'Counterweight', point: [-.29,0,-1.01] }],
    mainCaps: [{ text: 'Matching main cap', point: [0,-.44,0] }, { text: 'Lower bearing shell', point: [0,-.228,0] }],
    pump: [{ text: 'Pump housing', point: [-.12,-.94,-1.49] }, { text: 'Pickup screen', point: [.12,-1.28,0] }],
    pan: [{ text: 'Hollow sump', point: [0,-1.445,0] }, { text: 'Mounting flange', point: [-.9,-.55,0] }, { text: 'Drain plug', point: [0,-1.56,1.4] }],
  };
  return { group,block,parts,units,sectionParts,setSection,anchors,dimensions:V8_DIMENSIONS };
}
