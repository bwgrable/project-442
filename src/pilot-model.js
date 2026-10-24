import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MECHANICS } from './mechanics.js';

// A deliberately focused illustrative section, not factory service geometry.
export const PILOT_DIMENSIONS = Object.freeze({ boreRadius: .317, pistonRadius: .301, wristPinRadius: .075, wristBoreRadius: .079, crankJournalRadius: .165, rodBoreRadius: .168, rodLength: MECHANICS.rodLength });
export function createPilotEngine() {
  const group = new THREE.Group();
  const block = new THREE.Group(), crankshaft = new THREE.Group(), piston = new THREE.Group();
  const rod = new THREE.Group(), wristPin = new THREE.Group(), rodCap = new THREE.Group();
  const parts = { block, crankshaft, piston, rod, wristPin, rodCap };
  for (const [name, object] of Object.entries(parts)) { object.name = name; group.add(object); }
  const material = (color, metalness = .85, roughness = .3) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const mat = {
    paint: material(0x23484c, .35, .72), cut: material(0xb17d51, .6, .5),
    aluminum: material(0xc2cbd0, .88, .25), deck: material(0x9baeb3),
    steel: material(0x718793, .9, .26), journal: material(0xd5e0e4, .96, .16),
    forged: material(0x596774, .86, .38), black: material(0x17252d),
    ring: material(0x3b4247, .96, .23), bronze: material(0x9e7945, .78, .3),
    pin: material(0xd2b46c, .88, .22),
  };
  // Tiny deterministic authored grain distinguishes cast metal from journals.
  const grain = new Uint8Array(32 * 32 * 4);
  let seed = 442;
  for (let i = 0; i < grain.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = 100 + (seed >>> 25); grain.set([v, v, v, 255], i);
  }
  const texture = new THREE.DataTexture(grain, 32, 32);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(5, 5); texture.needsUpdate = true;
  mat.paint.bumpMap = texture; mat.paint.bumpScale = .009;
  function mesh(parent, geometry, material, position = [0, 0, 0], front = false) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position); object.userData.front = front; parent.add(object); return object;
  }
  function cylinder(radius, height, segments = 40) { return new THREE.CylinderGeometry(radius, radius, height, segments); }
  function plate(shape, depth, bevel = .012) {
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 16 });
    geometry.translate(0, 0, -depth / 2); return geometry;
  }
  function ring(outer, inner, length, segments = 48) {
    const shape = new THREE.Shape(); shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, inner, 0, Math.PI * 2, true); shape.holes.push(hole);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, curveSegments: segments / 4 });
    geometry.translate(0, 0, -length / 2); return geometry;
  }
  function bearingHalf(outer, inner, length, lower = false) {
    const end = lower ? -Math.PI : Math.PI, shape = new THREE.Shape();
    shape.absarc(0, 0, outer, 0, end, lower); shape.lineTo(-inner, 0);
    shape.absarc(0, 0, inner, end, 0, !lower); shape.closePath(); return plate(shape, length, 0);
  }
  function roundedShape(w, h, r) {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -h / 2); shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return shape;
  }
  function halfTube(outer, inner, length, front = false) {
    // Cross section in XY, subsequently turned so its tube axis is local Y.
    const start = front ? 0 : Math.PI, end = start + Math.PI;
    const shape = new THREE.Shape(); shape.absarc(0, 0, outer, start, end, false);
    shape.lineTo(inner * Math.cos(end), inner * Math.sin(end));
    shape.absarc(0, 0, inner, end, start, true); shape.closePath();
    const geometry = plate(shape, length, 0); geometry.rotateX(Math.PI / 2); return geometry;
  }
  const station = MECHANICS.station;
  const bank = new THREE.Group(); bank.rotation.z = -MECHANICS.bankAngle; block.add(bank);
  for (const front of [false, true]) {
    mesh(bank, halfTube(.45, .344, 1.16, front), mat.paint, [0, 1.66, station], front);
    mesh(bank, halfTube(.341, .317, 1.2, front), mat.steel, [0, 1.66, station], front);
    mesh(bank, halfTube(.46, .317, .07, front), mat.deck, [0, 2.24, station], front);
  }
  // Broad contrasting cut faces along the opened casting and liner.
  for (const x of [-.397, .397]) mesh(bank, new THREE.BoxGeometry(.106, 1.16, .012), mat.cut, [x, 1.66, station]);
  for (const x of [-.329, .329]) mesh(bank, new THREE.BoxGeometry(.024, 1.2, .014), mat.deck, [x, 1.66, station]);
  const deckShape = roundedShape(1.12, 1.12, .1);
  for (const [x,z,r] of [[0,0,.317], [-.42,-.38,.052], [.42,-.38,.052], [-.42,.38,.052], [.42,.38,.052]]) {
    const hole = new THREE.Path(); hole.absarc(x, z, r, 0, Math.PI * 2, true); deckShape.holes.push(hole);
  }
  const deck = mesh(bank, plate(deckShape, .06, 0), mat.deck, [0, 2.25, station]); deck.rotation.x = Math.PI / 2;
  // Casting ribs on the retained rear wall; no near rail across the rod.
  for (const x of [-.47, .47]) {
    mesh(bank, new THREE.BoxGeometry(.09, .92, .12), mat.paint, [x, 1.61, station - .24]);
    mesh(bank, new THREE.BoxGeometry(.17, .11, .78), mat.paint, [x, 1.08, station - .1]);
  }
  // Prepared open support webs, bearing shells and caps flank the single throw.
  const support = roundedShape(1.24, 1.04, .13);
  const bore = new THREE.Path(); bore.absarc(0, .14, .23, 0, Math.PI * 2, true); support.holes.push(bore);
  for (const z of [station - .55, station + .55]) {
    // Remove the near casting web in section view so the crank throw remains
    // readable below the main axis. The far web and bearing outline still
    // show how the prepared block supports the shaft; cap hardware stays.
    mesh(block, plate(support, .13, 0), mat.paint, [0, -.14, z], z > station);
    mesh(block, ring(.229, .224, .135), mat.bronze, [0, 0, z], z > station);
    // Mating line and representative fasteners keep the prepared cap readable.
    for (const x of [-.44, .44]) {
      mesh(block, new THREE.BoxGeometry(.27, .014, .145), mat.cut, [x, -.01, z], z > station);
      mesh(block, cylinder(.052, .12, 6), mat.deck, [x, -.64, z], z > station);
    }
  }
  for (const x of [-.64, .64]) mesh(block, new THREE.BoxGeometry(.11, .14, 1.28), mat.paint, [x, -.57, station]);
  function journal(radius, length, x, y, z, material = mat.journal) {
    const object = mesh(crankshaft, cylinder(radius, length), material, [x, y, z]); object.rotation.x = Math.PI / 2;
  }
  journal(.22, .4, 0, 0, station - .55); journal(.22, .4, 0, 0, station + .55);
  journal(.165, .43, 0, MECHANICS.radius, station);
  for (const dz of [-.27, .27]) {
    mesh(crankshaft, plate(roundedShape(.54, .93, .18), .09), mat.forged, [0, .14, station + dz]);
    mesh(crankshaft, plate(roundedShape(.72, .35, .13), .1), mat.steel, [0, -.34, station + dz]);
  }
  journal(.31, .08, 0, 0, station + .8, mat.forged);
  mesh(crankshaft, cylinder(.025, .008, 12), mat.black, [0, MECHANICS.radius + .164, station]);
  // Piston origin is the wrist-pin center; local +Y points toward the crown.
  // The crown/ring belt stops above the wrist bore. Two side skirt sectors
  // leave actual windows at both pin ends; annular bosses define the bores.
  const profile = [
    [.258, .095], [.298, .095], [.285, .095], [.285, .117],
    [.3, .117], [.3, .143], [.283, .143], [.283, .164],
    [.3, .164], [.3, .192], [.284, .192], [.284, .212],
    [.3, .212], [.3, .255], [.289, .276], [0, .276],
    [0, .225], [.254, .225], [.258, .095],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  mesh(piston, new THREE.LatheGeometry(profile, 64), mat.aluminum);
  const skirt = [[.258, -.24], [.291, -.24], [.298, -.19], [.298, .095], [.258, .095], [.258, -.24]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  for (const start of [.36, Math.PI + .36]) {
    mesh(piston, new THREE.LatheGeometry(skirt, 32, start, Math.PI - .72), mat.aluminum);
  }
  for (const y of [.107, .153, .202]) {
    const r = mesh(piston, ring(.301, .283, .012), mat.ring, [0, y, 0]);
    r.rotation.x = Math.PI / 2;
  }
  for (const z of [-.245, .245]) {
    mesh(piston, ring(.112, .079, .08), mat.aluminum, [0, 0, z]);
    mesh(piston, ring(.113, .079, .009), mat.black, [0, 0, z + Math.sign(z) * .043]);
  }
  mesh(wristPin, ring(.075, .049, .63), mat.pin); // Actual hollow, separate tube.
  // Two subtle valve reliefs are recessed-colored discs on the shallow dished crown.
  for (const x of [-.115, .115]) {
    mesh(piston, cylinder(.082, .002, 32), mat.deck, [x, .277, .02]);
  }

  // Rod big end at (0,0,0), wrist end at (0,1.45,0), holes along Z.
  // A straight split through the crankpin center leaves a real open big end.
  // rodCap shares this origin and must copy rod.position / rod.quaternion.
  mesh(rod, bearingHalf(.244, .176, .19), mat.forged);
  mesh(rodCap, bearingHalf(.244, .176, .19, true), mat.forged);
  mesh(rod, bearingHalf(.175, .168, .195), mat.bronze);
  mesh(rodCap, bearingHalf(.175, .168, .195, true), mat.bronze);
  mesh(rod, ring(.116, .080, .15), mat.forged, [0, 1.45, 0]);
  mesh(rod, ring(.084, .078, .16), mat.bronze, [0, 1.45, 0]);
  const beam = new THREE.Shape();
  // Keep the beveled beam above the bearing pocket (.205-.012 > .176).
  beam.moveTo(-.133, .205);
  beam.lineTo(-.075, 1.36);
  beam.lineTo(.075, 1.36);
  beam.lineTo(.133, .205);
  beam.closePath();
  mesh(rod, plate(beam, .09, .012), mat.forged);
  for (const z of [-.062, .062]) {
    mesh(rod, plate(roundedShape(.062, 1.07, .03), .018, .005), mat.steel, [0, .75, z]);
  }
  // Bolt ears start at |X|=.18; neither they nor the shanks enter the bore.
  for (const x of [-.22, .22]) {
    mesh(rod, plate(roundedShape(.08, .08, .015), .19, 0), mat.forged, [x, .04, 0]);
    mesh(rodCap, plate(roundedShape(.08, .08, .015), .19, 0), mat.forged, [x, -.04, 0]);
    mesh(rodCap, cylinder(.032, .2, 12), mat.steel, [x, -.03, 0]);
    mesh(rodCap, cylinder(.059, .055, 6), mat.journal, [x, -.166, 0]);
  }


  // Bake by material within each component. Materials are cloned per component
  // so selection/highlight never changes an unrelated installed part.
  const sectionParts = [];
  for (const parent of Object.values(parts)) {
    parent.updateMatrixWorld(true);
    const buckets = new Map(); const originals = [];
    parent.traverse(object => {
      if (!object.isMesh) return;
      const key = object.material.uuid + ':' + Boolean(object.userData.front);
      if (!buckets.has(key)) buckets.set(key, { material: object.material.clone(), front: Boolean(object.userData.front), geometries: [] });
      const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
      buckets.get(key).geometries.push(geometry.index ? geometry.toNonIndexed() : geometry); originals.push(object.geometry);
      if (geometry.index) geometry.dispose();
    });
    parent.clear();
    for (const bucket of buckets.values()) {
      const geometry = mergeGeometries(bucket.geometries, false);
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const object = mesh(parent, geometry, bucket.material); object.userData.front = bucket.front;
      if (bucket.front) sectionParts.push(object);
      bucket.geometries.forEach(g => g.dispose());
    }
    originals.forEach(g => g.dispose());
  }
  function setSection(enabled) { sectionParts.forEach(object => { object.visible = !enabled; }); }
  setSection(true);
  group.userData.illustrative = true;
  return { group, ...parts, sectionParts, setSection, dimensions: PILOT_DIMENSIONS };
}
