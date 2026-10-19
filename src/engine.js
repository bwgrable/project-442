import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Illustrative dimensions in model units. Y is up, Z is the crank axis.
// These proportions explain a V8 rotating assembly; they are not service data.
export function createEngine() {
  const group = new THREE.Group();
  const block = new THREE.Group();
  const crankshaft = new THREE.Group();
  const piston = new THREE.Group();
  const rod = new THREE.Group();
  group.add(block, crankshaft, piston, rod);
  block.name = 'Rocket V8 casting';
  crankshaft.name = 'Forged crankshaft';
  piston.name = 'Piston and wrist pin';
  rod.name = 'Connecting rod';

  const mat = {
    paint: new THREE.MeshStandardMaterial({ color: 0x204a55, metalness: .35, roughness: .62 }),
    edge: new THREE.MeshStandardMaterial({ color: 0x173d48, metalness: .32, roughness: .68 }),
    aluminum: new THREE.MeshStandardMaterial({ color: 0xc2cbd0, metalness: .88, roughness: .25 }),
    deck: new THREE.MeshStandardMaterial({ color: 0x9baeb3, metalness: .85, roughness: .34 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x778b96, metalness: .93, roughness: .22 }),
    journal: new THREE.MeshStandardMaterial({ color: 0xd5e0e4, metalness: .96, roughness: .16 }),
    forged: new THREE.MeshStandardMaterial({ color: 0x45545e, metalness: .86, roughness: .34 }),
    black: new THREE.MeshStandardMaterial({ color: 0x17252d, metalness: .6, roughness: .32 }),
    ring: new THREE.MeshStandardMaterial({ color: 0x3b4247, metalness: .96, roughness: .23 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x9e7945, metalness: .78, roughness: .3 }),
  };
  // Authored microtexture: subtle sand-cast grain, with no downloaded assets.
  const grainData = new Uint8Array(64 * 64 * 4);
  let grainSeed = 442;
  for (let i = 0; i < 64 * 64; i++) {
    grainSeed = (Math.imul(grainSeed, 1664525) + 1013904223) >>> 0;
    const value = 105 + (grainSeed >>> 25);
    grainData.set([value, value, value, 255], i * 4);
  }
  const grain = new THREE.DataTexture(grainData, 64, 64);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(6, 6);
  grain.magFilter = THREE.LinearFilter;
  grain.needsUpdate = true;
  for (const material of [mat.paint, mat.edge]) {
    material.bumpMap = grain;
    material.bumpScale = .006;
  }
  const sectionParts = [];
  function mesh(parent, geo, material, position = [0, 0, 0], section = false) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(...position);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.section = section;
    parent.add(m);
    return m;
  }
  function cylinder(radius, height, segments = 48) {
    return new THREE.CylinderGeometry(radius, radius, height, segments);
  }
  function ring(outer, inner, length, segments = 64) {
    const s = new THREE.Shape();
    s.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const h = new THREE.Path();
    h.absarc(0, 0, inner, 0, Math.PI * 2, true);
    s.holes.push(h);
    const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false, curveSegments: segments / 4 });
    g.translate(0, 0, -length / 2);
    return g;
  }
  function roundedShape(w, h, r) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  }
  function halfSleeve(outer, inner, length) {
    // Rear half of a cylinder, exposed by a longitudinal section plane.
    const s = new THREE.Shape();
    s.absarc(0, 0, outer, Math.PI / 2, Math.PI * 1.5, false);
    s.lineTo(0, -inner);
    s.absarc(0, 0, inner, Math.PI * 1.5, Math.PI / 2, true);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {depth: length, bevelEnabled: false, curveSegments: 24});
    g.translate(0, 0, -length / 2);
    g.rotateX(Math.PI / 2);
    return g;
  }
  function plate(shape, depth, bevel = .025) {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel,
      bevelSegments: 2, steps: 1, curveSegments: 16,
    });
    g.translate(0, 0, -depth / 2);
    return g;
  }
  const stations = [-1.2, -.4, .4, 1.2];
  for (const sign of [-1, 1]) {
    const bank = new THREE.Group();
    bank.rotation.z = -sign * Math.PI / 4;
    block.add(bank);
    const cut = sign === 1;
    const deckShape = roundedShape(1.18, 3.48, .13);
    for (const z of stations) {
      const hole = new THREE.Path();
      hole.absarc(0, z, .337, 0, Math.PI * 2, true);
      deckShape.holes.push(hole);
    }
    // Machined deck is an actual perforated solid, not dark circles on a cap.
    const deck = mesh(bank, plate(deckShape, .12, .014), mat.deck, [0, 2.22, 0], cut);
    deck.rotation.x = Math.PI / 2;
    for (const z of stations) {
      const jacket = mesh(bank, ring(.448, .34, 1.08), mat.paint, [0, 1.64, z], cut);
      jacket.rotation.x = Math.PI / 2;
      const liner = mesh(bank, ring(.34, .317, 1.12), mat.steel, [0, 1.65, z], cut);
      liner.rotation.x = Math.PI / 2;
      // Narrow top lip and relieved bottom preserve the open bore from both ends.
      const lip = mesh(bank, ring(.351, .317, .025), mat.journal, [0, 2.235, z], cut);
      lip.rotation.x = Math.PI / 2;
      if (cut) {
        // Retain the back wall of each near-bank bore in section view. This
        // preserves the V silhouette while exposing the piston from outside.
        const shell = mesh(bank, halfSleeve(.448, .34, 1.08), mat.paint, [0, 1.64, z]);
        shell.userData.sectionOnly = true;
        const cutLiner = mesh(bank, halfSleeve(.34, .317, 1.12), mat.steel, [0, 1.65, z]);
        cutLiner.userData.sectionOnly = true;
        const cutDeck = mesh(bank, halfSleeve(.46, .317, .1), mat.deck, [0, 2.22, z]);
        cutDeck.userData.sectionOnly = true;
      }
      for (const side of [-1, 1]) {
        const rib = mesh(bank, plate(roundedShape(.105, .94, .04), .12), mat.paint,
          [side * .44, 1.58, z], cut);
        rib.rotation.y = .15 * side;
      }
    }
    // Long casting rails, with softened corners, tie the individual jackets together.
    for (const side of [-1, 1]) {
      const rail = mesh(bank, plate(roundedShape(.19, 1.14, .08), 3.33, .035), mat.paint,
        [side * .48, 1.61, 0], cut);
      rail.name = 'Water jacket casting rail';
      if (!cut) {
        // Core plugs and raised ribs break up the broad outside casting face.
        for (const z of [-1.15, 0, 1.15]) {
          const plug = mesh(bank, cylinder(.135, .025, 40), mat.edge, [side * .594, 1.61, z]);
          plug.rotation.z = Math.PI / 2;
          const rim = mesh(bank, ring(.147, .126, .022, 40), mat.paint, [side * .61, 1.61, z]);
          rim.rotation.y = Math.PI / 2;
        }
        for (const z of [-1.51, -.76, .76, 1.51]) {
          mesh(bank, plate(roundedShape(.055, .83, .02), .06, .012), mat.paint, [side * .591, 1.61, z]);
        }
      }
      for (const z of [-1.52, -.8, 0, .8, 1.52]) {
        const bolt = mesh(bank, cylinder(.055, .045, 6), mat.steel, [side * .47, 2.31, z], cut);
        mesh(bank, cylinder(.085, .014, 24), mat.edge, [side * .47, 2.277, z], cut);
        bolt.name = 'Deck fastener';
      }
    }
    if (cut) {
      const lowerRail = mesh(bank, plate(roundedShape(.15, .2, .05), 3.33), mat.paint, [.43, 1.1, 0]);
      lowerRail.userData.sectionOnly = true;
    }
  }

  // Open crankcase: curved side rails and five visible, arched main-bearing webs.
  for (const side of [-1, 1]) {
    const rail = mesh(block, plate(roundedShape(.21, .83, .09), 3.52, .035), mat.paint,
      [side * .82, -.12, 0], side === 1);
    rail.rotation.z = -side * .15;
    const flange = mesh(block, plate(roundedShape(.24, .14, .055), 3.67), mat.deck,
      [side * .84, -.61, 0], side === 1);
    for (const z of [-1.55, -.8, 0, .8, 1.55]) {
      mesh(block, cylinder(.046, .055, 6), mat.steel, [side * .84, -.5, z], side === 1);
    }
  }
  const webShape = new THREE.Shape();
  webShape.moveTo(-.8, .57);
  webShape.lineTo(-.8, -.45);
  webShape.quadraticCurveTo(-.72, -.61, -.49, -.61);
  webShape.lineTo(.49, -.61);
  webShape.quadraticCurveTo(.72, -.61, .8, -.45);
  webShape.lineTo(.8, .57);
  webShape.lineTo(.43, .83);
  webShape.lineTo(.32, .32);
  webShape.lineTo(-.32, .32);
  webShape.lineTo(-.43, .83);
  webShape.closePath();
  // Main bore through each web leaves the polished journals visible.
  const mainHole = new THREE.Path();
  mainHole.absarc(0, 0, .225, 0, Math.PI * 2, true);
  webShape.holes.push(mainHole);
  for (const z of [-1.64, -.8, 0, .8, 1.64]) {
    mesh(block, plate(webShape, .14, .025), mat.paint, [0, 0, z]);
    mesh(block, ring(.267, .228, .17), mat.bronze, [0, 0, z]);
    for (const x of [-.43, .43]) {
      mesh(block, cylinder(.06, .1, 6), mat.steel, [x, -.47, z]);
    }
  }
  // Front timing cover has a rounded, profiled silhouette and a crank opening.
  const timing = roundedShape(1.39, 1.28, .32);
  const opening = new THREE.Path();
  opening.absarc(0, -.14, .24, 0, Math.PI * 2, true);
  timing.holes.push(opening);
  mesh(block, plate(timing, .13, .035), mat.edge, [0, .14, -1.84]);
  mesh(block, ring(.32, .23, .07), mat.deck, [0, 0, -1.95]);
  for (const [x, y] of [[-.5, -.28], [.5, -.28], [-.5, .55], [.5, .55]]) {
    const b = mesh(block, cylinder(.052, .055, 6), mat.steel, [x, y, -1.94]);
    b.rotation.x = Math.PI / 2;
  }

  // Crankshaft template: journal axes all run along Z; the active throw is +Y.
  function journal(radius, length, x, y, z, material = mat.journal) {
    const j = mesh(crankshaft, cylinder(radius, length), material, [x, y, z]);
    j.rotation.x = Math.PI / 2;
    return j;
  }
  // The shaft is connected by webs and offset crankpins. There is no solid
  // main-axis cylinder through a throw: that space belongs to the rod sweep.
  for (const z of [-1.64, -.8, 0, .8, 1.64]) journal(.22, .24, 0, 0, z);
  for (let i = 0; i < stations.length; i++) {
    const phase = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][i];
    const x = Math.sin(phase) * .42;
    const y = Math.cos(phase) * .42;
    const z = stations[i];
    journal(.165, .43, x, y, z);
    for (const dz of [-.25, .25]) {
      const cheek = roundedShape(.56, .9, .2);
      const c = mesh(crankshaft, plate(cheek, .07, .01), mat.forged,
        [x * .3, y * .3, z + dz]);
      c.rotation.z = -phase;
      const counter = mesh(crankshaft, plate(roundedShape(.69, .36, .13), .07, .01), mat.steel,
        [-x * .74, -y * .74, z + dz]);
      counter.rotation.z = -phase;
    }
    // A dark drilled oil passage gives each polished crankpin a readable highlight break.
    const oil = mesh(crankshaft, cylinder(.026, .007, 12), mat.black, [x, y + .164, z]);
    oil.name = 'Oil drilling';
  }
  journal(.18, .55, 0, 0, -2.02);
  journal(.28, .12, 0, 0, 1.99, mat.steel);
  journal(.39, .11, 0, 0, 2.11, mat.forged);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const b = mesh(crankshaft, cylinder(.039, .025, 6), mat.journal,
      [Math.sin(a) * .3, Math.cos(a) * .3, 2.18]);
    b.rotation.x = Math.PI / 2;
  }

  // Piston origin is the wrist-pin center; local +Y points toward the crown.
  // Lathed wall is hollow beneath the crown and includes three ring grooves.
  const profile = [
    [.258, -.24], [.291, -.24], [.298, -.19], [.298, .095],
    [.285, .095], [.285, .117], [.3, .117], [.3, .143],
    [.283, .143], [.283, .164], [.3, .164], [.3, .192],
    [.284, .192], [.284, .212], [.3, .212], [.3, .255],
    [.289, .276], [0, .276], [0, .225], [.254, .225], [.258, -.24],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  mesh(piston, new THREE.LatheGeometry(profile, 64), mat.aluminum);
  for (const y of [.107, .153, .202]) {
    const r = mesh(piston, ring(.301, .283, .012), mat.ring, [0, y, 0]);
    r.rotation.x = Math.PI / 2;
  }
  const wrist = mesh(piston, cylinder(.075, .57), mat.journal);
  wrist.rotation.x = Math.PI / 2;
  for (const z of [-.287, .287]) mesh(piston, ring(.091, .059, .009), mat.black, [0, 0, z]);
  // Two subtle valve reliefs are recessed-colored discs on the shallow dished crown.
  for (const x of [-.115, .115]) {
    mesh(piston, cylinder(.082, .002, 32), mat.deck, [x, .277, .02]);
  }

  // Rod big end at (0,0,0), wrist end at (0,1.45,0), holes along Z.
  mesh(rod, ring(.244, .17, .19), mat.forged);
  mesh(rod, ring(.175, .164, .195), mat.bronze);
  mesh(rod, ring(.116, .077, .15), mat.forged, [0, 1.45, 0]);
  mesh(rod, ring(.084, .075, .16), mat.bronze, [0, 1.45, 0]);
  const beam = new THREE.Shape();
  beam.moveTo(-.133, .17);
  beam.lineTo(-.075, 1.36);
  beam.lineTo(.075, 1.36);
  beam.lineTo(.133, .17);
  beam.closePath();
  mesh(rod, plate(beam, .09, .012), mat.forged);
  for (const z of [-.062, .062]) {
    mesh(rod, plate(roundedShape(.062, 1.07, .03), .018, .005), mat.steel, [0, .75, z]);
  }
  for (const x of [-.202, .202]) {
    mesh(rod, cylinder(.04, .23, 12), mat.steel, [x, -.035, 0]);
    mesh(rod, cylinder(.059, .055, 6), mat.journal, [x, -.166, 0]);
  }
  const capSeam = mesh(rod, new THREE.BoxGeometry(.44, .012, .197), mat.black, [0, -.09, 0]);
  capSeam.name = 'Rod cap split';

  // Bake static details by material and cutaway membership to keep draw calls modest.
  // Moving groups remain separate so the host owns all assembly transforms.
  function consolidate(parent, allowSection) {
    parent.updateMatrixWorld(true);
    const buckets = new Map();
    const old = [];
    parent.traverse(object => {
      if (!object.isMesh) return;
      const key = object.material.uuid + (object.userData.section ? '-cut' : '-solid') + (object.userData.sectionOnly ? '-sectionOnly' : '');
      if (!buckets.has(key)) buckets.set(key, { material: object.material, section: object.userData.section, sectionOnly: object.userData.sectionOnly, geometries: [] });
      const g = object.geometry.clone();
      g.applyMatrix4(object.matrixWorld);
      // All generated geometries carry position/normal/uv, but discard indices for consistency.
      buckets.get(key).geometries.push(g.index ? g.toNonIndexed() : g);
      old.push(object);
    });
    parent.clear();
    for (const bucket of buckets.values()) {
      const combined = mergeGeometries(bucket.geometries, false);
      const m = mesh(parent, combined, bucket.material);
      m.userData.sectionOnly = Boolean(bucket.sectionOnly);
      if (allowSection && (bucket.section || bucket.sectionOnly)) sectionParts.push(m);
      for (const g of bucket.geometries) g.dispose();
    }
    for (const object of old) object.geometry.dispose();
  }
  consolidate(block, true);
  consolidate(crankshaft, false);
  consolidate(piston, false);
  consolidate(rod, false);
  function setSection(enabled) {
    for (const part of sectionParts) part.visible = part.userData.sectionOnly ? enabled : !enabled;
  }
  setSection(true);
  const pickables = [
    { object: block, part: 'block' },
    { object: crankshaft, part: 'crank' },
    { object: piston, part: 'piston' },
    { object: rod, part: 'piston' },
  ];
  return { group, block, crankshaft, piston, rod, sectionParts, pickables, setSection };
}
