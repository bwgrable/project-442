import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// An authored, illustrative 1969-inspired coupe. Units are visual, not factory dimensions.
// X = fore/aft (nose negative), Y = up, Z = driver/passenger sides.
export const CAR_EXTENTS = Object.freeze({
  min: [-3.25, 0.02, -1.36],
  max: [3.25, 2.31, 1.36],
  wheelbase: 3.7,
});
export function makeCar() {
  const group = new THREE.Group();
  group.name = "1969-442";
  const parts = {};
  const mat = (color, metalness = 0.2, roughness = 0.4) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const m = {
    body: mat("#9e332a", 0.55, 0.25),
    roof: mat("#9e332a", 0.55, 0.25),
    stripe: mat("#eee2c8", 0.1, 0.38),
    chrome: mat("#c7ced0", 0.9, 0.19),
    steel: mat("#657079", 0.75, 0.4),
    dark: mat("#252a2b", 0.5, 0.55),
    rubber: mat("#202327", 0.02, 0.9),
    engine: mat("#b37731", 0.5, 0.4),
    red: mat("#a9231f", 0.3, 0.25),
    interior: mat("#3b2d27", 0.05, 0.85),
    carpet: mat("#242325", 0, 1),
    white: mat("#f9edcf", 0.1, 0.25),
    amber: mat("#e0a03e", 0.25, 0.3),
    glass: new THREE.MeshPhysicalMaterial({
      color: "#77969b",
      metalness: 0.15,
      roughness: 0.12,
      transparent: true,
      opacity: 0.37,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    lens: mat("#a9111d", 0.2, 0.23),
    dial: mat("#10171c", 0.1, 0.45),
  };
  m.white.emissive.set("#b3a782");
  m.white.emissiveIntensity = 0.12;
  m.lens.emissive.set("#66040b");
  m.lens.emissiveIntensity = 0.3;
  function part(id) {
    const p = new THREE.Group();
    p.name = id;
    parts[id] = p;
    group.add(p);
    return p;
  }
  function mesh(p, geo, material, xyz = [0, 0, 0]) {
    const o = new THREE.Mesh(geo, material);
    o.position.set(...xyz);
    o.castShadow = true;
    o.receiveShadow = true;
    p.add(o);
    return o;
  }
  function box(p, size, material, xyz, rotation) {
    const o = mesh(p, new THREE.BoxGeometry(...size), material, xyz);
    if (rotation) o.rotation.set(...rotation);
    return o;
  }
  function softBox(p, size, material, xyz, rotation) {
    const o = mesh(p, new RoundedBoxGeometry(...size, 2, 0.045), material, xyz);
    if (rotation) o.rotation.set(...rotation);
    return o;
  }
  function cyl(p, r, length, material, xyz, axis = "y", r2 = r, segments = 16) {
    const o = mesh(
      p,
      new THREE.CylinderGeometry(r2, r, length, segments),
      material,
      xyz,
    );
    if (axis === "x") o.rotation.z = Math.PI / 2;
    if (axis === "z") o.rotation.x = Math.PI / 2;
    return o;
  }
  function tube(p, points, radius, material, closed = false) {
    const path = new THREE.CatmullRomCurve3(
      points.map((a) => new THREE.Vector3(...a)),
      closed,
    );
    return mesh(
      p,
      new THREE.TubeGeometry(
        path,
        Math.max(8, points.length * 5),
        radius,
        6,
        closed,
      ),
      material,
    );
  }
  function bar(p, a, b, r, material) {
    const delta = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const o = cyl(p, r, delta.length(), material, a);
    o.position.addScaledVector(delta, 0.5);
    o.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    return o;
  }
  function torus(p, r, t, material, xyz, axis = "z") {
    const o = mesh(p, new THREE.TorusGeometry(r, t, 8, 32), material, xyz);
    if (axis === "y") o.rotation.x = Math.PI / 2;
    if (axis === "x") o.rotation.y = Math.PI / 2;
    return o;
  }
  function surface(p, rows, material) {
    const pos = [],
      idx = [];
    for (const row of rows) for (const v of row) pos.push(...v);
    const n = rows[0].length;
    for (let i = 0; i < rows.length - 1; i++)
      for (let j = 0; j < n - 1; j++) {
        const a = i * n + j;
        idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const o = mesh(p, g, material);
    o.material.side = THREE.DoubleSide;
    return o;
  }
  function sheet(p, points, material, z = 0, depth = 0.055) {
    const s = new THREE.Shape();
    points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: false,
      curveSegments: 12,
    });
    g.translate(0, 0, z - depth / 2);
    return mesh(p, g, material);
  }
  // Chassis: open perimeter rails remain legible under every stage of construction.
  const frame = part("frame");
  for (const s of [-1, 1])
    tube(
      frame,
      [
        [-2.8, 0.43, s * 0.72],
        [-2.3, 0.42, s * 0.75],
        [-1.5, 0.38, s * 0.77],
        [-0.65, 0.35, s * 0.91],
        [0.9, 0.35, s * 0.91],
        [1.65, 0.52, s * 0.75],
        [2.7, 0.49, s * 0.71],
      ],
      0.075,
      m.dark,
    );
  for (const x of [-2.55, 2.48])
    bar(frame, [x, 0.45, -0.72], [x, 0.45, 0.72], 0.05, m.dark);
  for (const [id, x, y, w] of [
    ["front-crossmember", -1.85, 0.49, 1.65],
    ["rear-crossmember", 2.42, 0.48, 1.5],
    ["transmission-crossmember", 0.02, 0.39, 1.75],
  ]) {
    const p = part(id);
    box(p, [0.22, 0.13, w], m.dark, [x, y, 0]);
  }
  const floor = part("floorpan");
  box(floor, [3.18, 0.075, 1.88], m.steel, [0.05, 0.79, 0]);
  box(floor, [2.5, 0.23, 0.31], m.steel, [0, 0.87, 0]);
  for (const s of [-1, 1])
    box(floor, [3.3, 0.15, 0.09], m.dark, [0.05, 0.77, s * 0.94]);
  const firewall = part("firewall");
  sheet(
    firewall,
    [
      [-1.18, 0.82],
      [-1.25, 1.44],
      [-0.95, 1.5],
      [-0.87, 0.83],
    ],
    m.steel,
    0,
    1.96,
  );
  const trunk = part("trunk-floor");
  box(trunk, [1.7, 0.08, 1.92], m.steel, [2.15, 0.88, 0]);
  cyl(trunk, 0.4, 0.055, m.dark, [2.18, 0.94, 0.17]);
  const tank = part("fuel-tank");
  box(tank, [1.22, 0.26, 1.26], m.steel, [2.24, 0.57, 0]);
  for (const z of [-0.44, 0.44])
    box(tank, [1.26, 0.018, 0.04], m.dark, [2.24, 0.72, z]);
  const filler = part("fuel-filler");
  tube(
    filler,
    [
      [2.5, 0.65, 0.33],
      [2.8, 0.81, 0.33],
      [3.02, 1.04, 0.3],
    ],
    0.053,
    m.steel,
  );
  cyl(filler, 0.085, 0.04, m.chrome, [3.03, 1.05, 0.3], "x");
  for (const [id, z, r, material] of [
    ["brake-lines", -0.68, 0.012, m.chrome],
    ["fuel-line", 0.65, 0.016, m.steel],
  ]) {
    const p = part(id);
    tube(
      p,
      [
        [-2.1, 0.48, z],
        [-1, 0.41, z],
        [0.7, 0.41, z],
        [1.85, 0.57, z],
      ],
      r,
      material,
    );
    if (id === "brake-lines")
      for (const x of [-1.85, 1.85])
        bar(p, [x, 0.52, -0.9], [x, 0.52, 0.9], r, material);
  }
  const exhaust = part("dual-exhaust");
  for (const s of [-1, 1]) {
    tube(
      exhaust,
      [
        [-1.15, 1.01, s * 0.39],
        [-0.9, 0.65, s * 0.47],
        [0.0, 0.46, s * 0.52],
        [1.0, 0.45, s * 0.56],
        [1.55, 0.69, s * 0.64],
        [2.2, 0.47, s * 0.67],
        [3.13, 0.49, s * 0.7],
      ],
      0.045,
      m.steel,
    );
    box(exhaust, [0.65, 0.17, 0.22], m.steel, [0.75, 0.45, s * 0.56]);
    cyl(exhaust, 0.061, 0.22, m.chrome, [3.04, 0.49, s * 0.7], "x");
  }
  // Suspension, brakes, wheels and separate tire casings.
  for (const [side, s] of [
    ["left", 1],
    ["right", -1],
  ]) {
    for (const [level, y, w] of [
      ["lower", 0.45, 0.39],
      ["upper", 0.8, 0.26],
    ]) {
      const p = part(`front-${level}-arm-${side}`);
      bar(p, [-1.85 - w, y, s * 0.53], [-1.85, y, s * 0.99], 0.043, m.dark);
      bar(p, [-1.85 + w, y, s * 0.53], [-1.85, y, s * 0.99], 0.043, m.dark);
    }
    for (const [end, x] of [
      ["front", -1.85],
      ["rear", 1.85],
    ]) {
      const spring = part(`${end}-spring-${side}`),
        pts = [];
      for (let i = 0; i <= 84; i++) {
        const a = (i / 84) * Math.PI * 12;
        pts.push([
          x + 0.115 * Math.cos(a),
          0.46 + (i / 84) * 0.43,
          s * 0.77 + 0.115 * Math.sin(a),
        ]);
      }
      tube(spring, pts, 0.023, m.dark);
      const damper = part(`${end}-damper-${side}`);
      bar(
        damper,
        [x + 0.15, 0.43, s * 0.85],
        [x + 0.04, 0.95, s * 0.7],
        0.042,
        m.steel,
      );
      bar(
        damper,
        [x + 0.1, 0.66, s * 0.78],
        [x + 0.04, 1.02, s * 0.68],
        0.021,
        m.chrome,
      );
      const brake = part(`${end}-brake-${side}`);
      cyl(brake, 0.278, 0.11, m.steel, [x, 0.63, s * 1.03], "z", 0.278, 28);
      cyl(brake, 0.11, 0.14, m.chrome, [x, 0.63, s * 1.05], "z");
      box(brake, [0.16, 0.25, 0.13], end === "front" ? m.red : m.dark, [
        x + 0.21,
        0.67,
        s * 1.045,
      ]);
      const wheel = part(`wheel-${end}-${side}`);
      const rally = new THREE.Group(),
        torque = new THREE.Group();
      rally.userData.wheelStyle = "rally";
      torque.userData.wheelStyle = "torque";
      wheel.add(rally, torque);
      for (const p of [rally, torque]) {
        cyl(p, 0.36, 0.23, m.dark, [x, 0.63, s * 1.105], "z", 0.36, 32);
        torus(p, 0.335, 0.027, m.chrome, [x, 0.63, s * 1.242]);
        cyl(p, 0.115, 0.055, m.chrome, [x, 0.63, s * 1.245], "z");
      }
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const dx = Math.cos(a),
          dy = Math.sin(a);
        bar(
          rally,
          [x + dx * 0.1, 0.63 + dy * 0.1, s * 1.25],
          [x + dx * 0.29, 0.63 + dy * 0.29, s * 1.25],
          0.051,
          m.steel,
        );
        bar(
          torque,
          [x + dx * 0.1, 0.63 + dy * 0.1, s * 1.25],
          [x + dx * 0.3, 0.63 + dy * 0.3, s * 1.25],
          0.041,
          m.chrome,
        );
        cyl(
          rally,
          0.023,
          0.025,
          m.chrome,
          [x + dx * 0.078, 0.63 + dy * 0.078, s * 1.282],
          "z",
          0.023,
          6,
        );
      }
      const tire = part(`tire-${end}-${side}`);
      const tireGeo = new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.35, -0.16),
          new THREE.Vector2(0.48, -0.16),
          new THREE.Vector2(0.565, -0.115),
          new THREE.Vector2(0.594, -0.065),
          new THREE.Vector2(0.598, 0.065),
          new THREE.Vector2(0.565, 0.115),
          new THREE.Vector2(0.48, 0.16),
          new THREE.Vector2(0.35, 0.16),
        ],
        40,
      );
      const tireMesh = mesh(tire, tireGeo, m.rubber, [x, 0.63, s * 1.1]);
      tireMesh.rotation.x = Math.PI / 2;
      for (const rr of [0.45, 0.49])
        torus(tire, rr, 0.007, m.dark, [x, 0.63, s * 1.266]);
      // Fine circumferential grooves articulate the black sidewall without texture downloads.
      for (const dz of [-0.055, 0, 0.055])
        torus(tire, 0.596, 0.006, m.dark, [x, 0.63, s * 1.1 + dz]);
    }
  }
  const axle = part("rear-axle");
  cyl(axle, 0.09, 2.02, m.dark, [1.85, 0.62, 0], "z");
  mesh(axle, new THREE.SphereGeometry(0.225, 16, 12), m.dark, [1.85, 0.62, 0]);
  const steering = part("steering-box");
  box(steering, [0.27, 0.25, 0.2], m.dark, [-2.03, 0.78, 0.63]);
  const linkage = part("steering-linkage");
  bar(linkage, [-2.05, 0.63, -0.93], [-2.05, 0.63, 0.93], 0.031, m.steel);
  for (const s of [-1, 1])
    bar(
      linkage,
      [-2.05, 0.63, s * 0.93],
      [-1.85, 0.65, s * 1.01],
      0.035,
      m.steel,
    );
  const shaft = part("driveshaft");
  bar(shaft, [0.13, 0.58, 0], [1.85, 0.62, 0], 0.055, m.steel);
  for (const x of [0.15, 1.7])
    cyl(shaft, 0.08, 0.12, m.chrome, [x, 0.6, 0], "x");
  // Rocket 400-inspired V8: distinct castings and ancillaries, grouped internals.
  const mounts = part("engine-mounts");
  for (const s of [-1, 1])
    box(mounts, [0.28, 0.23, 0.3], m.dark, [-1.6, 0.7, s * 0.4]);
  const block = part("engine-block");
  box(block, [1.0, 0.42, 0.57], m.engine, [-1.66, 0.94, 0]);
  for (const s of [-1, 1])
    box(
      block,
      [1.04, 0.31, 0.34],
      m.engine,
      [-1.65, 1.12, s * 0.255],
      [s * 0.51, 0, 0],
    );
  const rotating = part("rotating-assembly");
  cyl(rotating, 0.065, 1.1, m.steel, [-1.66, 0.87, 0], "x");
  for (let i = 0; i < 4; i++) {
    const x = -2.06 + i * 0.27;
    cyl(rotating, 0.14, 0.06, m.steel, [x, 0.87, 0], "x");
    for (const s of [-1, 1]) {
      bar(rotating, [x, 0.87, 0], [x, 1.13, s * 0.23], 0.035, m.steel);
      cyl(rotating, 0.1, 0.13, m.chrome, [x, 1.15, s * 0.23]);
    }
  }
  const pump = part("oil-pump");
  box(pump, [0.18, 0.12, 0.19], m.steel, [-2.07, 0.66, 0]);
  tube(
    pump,
    [
      [-2.07, 0.66, 0],
      [-1.84, 0.62, 0],
      [-1.65, 0.59, 0.1],
    ],
    0.02,
    m.steel,
  );
  const pan = part("oil-pan");
  box(pan, [0.95, 0.22, 0.53], m.engine, [-1.6, 0.64, 0]);
  box(pan, [1.08, 0.04, 0.64], m.steel, [-1.65, 0.77, 0]);
  for (const [side, s] of [
    ["left", 1],
    ["right", -1],
  ]) {
    const head = part(`cylinder-head-${side}`);
    box(
      head,
      [1.12, 0.16, 0.34],
      m.steel,
      [-1.65, 1.29, s * 0.32],
      [s * 0.51, 0, 0],
    );
    const cover = part(`valve-cover-${side}`);
    box(
      cover,
      [1.01, 0.14, 0.25],
      m.engine,
      [-1.65, 1.42, s * 0.36],
      [s * 0.51, 0, 0],
    );
    for (let i = 0; i < 3; i++)
      box(cover, [0.74, 0.015, 0.018], m.chrome, [
        -1.65,
        1.5,
        s * 0.36 + (i - 1) * 0.055,
      ]);
  }
  const intake = part("intake-manifold");
  box(intake, [0.77, 0.14, 0.43], m.steel, [-1.61, 1.36, 0]);
  for (const x of [-1.9, -1.65, -1.4])
    bar(intake, [x, 1.32, -0.33], [x, 1.4, 0.33], 0.044, m.steel);
  const carb = part("carburetor");
  box(carb, [0.25, 0.16, 0.25], m.amber, [-1.65, 1.5, 0]);
  for (const z of [-0.07, 0.07])
    cyl(carb, 0.045, 0.05, m.dark, [-1.65, 1.6, z]);
  const air = part("air-cleaner");
  cyl(air, 0.36, 0.1, m.rubber, [-1.65, 1.66, 0]);
  cyl(air, 0.38, 0.025, m.chrome, [-1.65, 1.72, 0]);
  cyl(air, 0.13, 0.028, m.engine, [-1.65, 1.74, 0]);
  cyl(air, 0.025, 0.03, m.chrome, [-1.65, 1.77, 0]);
  const dist = part("distributor");
  cyl(dist, 0.09, 0.19, m.dark, [-1.13, 1.4, 0]);
  for (const s of [-1, 1])
    for (let i = 0; i < 4; i++)
      tube(
        dist,
        [
          [-1.13, 1.5, 0],
          [-1.3 - i * 0.2, 1.56, s * 0.2],
          [-1.32 - i * 0.2, 1.3, s * 0.48],
        ],
        0.008,
        m.rubber,
      );
  const water = part("water-pump");
  cyl(water, 0.14, 0.15, m.engine, [-2.25, 1.07, 0], "x");
  cyl(water, 0.11, 0.06, m.dark, [-2.35, 1.07, 0], "x");
  const fan = part("fan");
  cyl(fan, 0.07, 0.09, m.steel, [-2.42, 1.07, 0], "x");
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    const b = box(fan, [0.035, 0.3, 0.1], m.dark, [
      -2.45,
      1.07 + Math.sin(a) * 0.17,
      Math.cos(a) * 0.17,
    ]);
    b.rotation.x = -a;
  }
  const radiator = part("radiator");
  box(radiator, [0.11, 0.61, 1.04], m.dark, [-2.68, 1.12, 0]);
  for (const y of [0.83, 1.43])
    box(radiator, [0.14, 0.08, 1.12], m.steel, [-2.68, y, 0]);
  for (let i = 0; i < 12; i++)
    box(radiator, [0.12, 0.47, 0.016], m.steel, [
      -2.68,
      1.12,
      -0.49 + i * 0.089,
    ]);
  tube(
    radiator,
    [
      [-2.66, 1.43, 0.3],
      [-2.44, 1.46, 0.32],
      [-2.12, 1.33, 0.16],
    ],
    0.046,
    m.rubber,
  );
  const alt = part("alternator");
  cyl(alt, 0.115, 0.2, m.steel, [-2.15, 1.28, -0.47], "x");
  cyl(alt, 0.075, 0.025, m.dark, [-2.27, 1.28, -0.47], "x");
  tube(
    alt,
    [
      [-2.3, 1.28, -0.47],
      [-2.3, 0.86, 0],
      [-2.3, 1.07, 0],
      [-2.3, 1.28, -0.47],
    ],
    0.013,
    m.rubber,
  );
  const starter = part("starter");
  cyl(starter, 0.095, 0.29, m.dark, [-1.23, 0.81, -0.38], "x");
  cyl(starter, 0.045, 0.15, m.steel, [-1.26, 0.91, -0.38], "x");
  const battery = part("battery");
  box(battery, [0.32, 0.27, 0.3], m.dark, [-2.38, 1.22, 0.76]);
  box(battery, [0.34, 0.025, 0.32], m.rubber, [-2.38, 1.37, 0.76]);
  for (const z of [0.66, 0.86])
    cyl(battery, 0.025, 0.04, z < 0.7 ? m.red : m.steel, [-2.38, 1.405, z]);
  const trans = part("transmission");
  cyl(trans, 0.3, 0.29, m.steel, [-0.99, 0.86, 0], "x", 0.22);
  cyl(trans, 0.14, 0.81, m.steel, [-0.45, 0.72, 0], "x", 0.26);
  cyl(trans, 0.07, 0.35, m.steel, [0.12, 0.64, 0], "x", 0.13);
  // Cabin. Seats and control groups are visible through the glazing and inspection view.
  const carpet = part("carpet");
  box(carpet, [2.85, 0.025, 1.78], m.carpet, [0.14, 0.845, 0]);
  box(carpet, [2.3, 0.18, 0.33], m.carpet, [0.15, 0.92, 0]);
  const dash = part("dashboard");
  box(dash, [0.32, 0.25, 1.79], m.interior, [-0.75, 1.38, 0]);
  box(dash, [0.42, 0.06, 1.89], m.dark, [-0.75, 1.53, 0]);
  const gauges = part("instruments");
  for (const [z, r] of [
    [0.27, 0.09],
    [0.5, 0.12],
    [0.73, 0.09],
  ]) {
    cyl(gauges, r, 0.024, m.chrome, [-0.57, 1.39, z], "x", r, 24);
    cyl(gauges, r * 0.86, 0.028, m.dial, [-0.55, 1.39, z], "x", r * 0.86, 24);
    bar(
      gauges,
      [-0.53, 1.39, z],
      [-0.53, 1.39 + r * 0.48, z + r * 0.3],
      0.007,
      m.white,
    );
  }
  const column = part("steering-column");
  bar(column, [-0.68, 1.3, 0.53], [-0.16, 1.48, 0.53], 0.038, m.dark);
  const sw = part("steering-wheel");
  const wheel = torus(sw, 0.21, 0.018, m.interior, [-0.12, 1.48, 0.53], "x");
  wheel.rotation.z = -0.24;
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3;
    bar(
      sw,
      [-0.12, 1.48, 0.53],
      [-0.12, 1.48 + Math.sin(a) * 0.2, 0.53 + Math.cos(a) * 0.2],
      0.012,
      m.chrome,
    );
  }
  cyl(sw, 0.047, 0.05, m.dark, [-0.1, 1.48, 0.53], "x");
  const pedals = part("pedals");
  for (const z of [0.33, 0.52, 0.72]) {
    bar(pedals, [-0.72, 1.19, z], [-0.51, 0.96, z], 0.014, m.steel);
    box(pedals, [0.035, 0.08, 0.09], m.rubber, [-0.5, 0.97, z]);
  }
  const console = part("console");
  box(console, [1.1, 0.19, 0.26], m.interior, [0.08, 1, 0]);
  box(console, [0.8, 0.018, 0.22], m.chrome, [0.06, 1.105, 0]);
  const shifter = part("shifter");
  bar(shifter, [-0.12, 1.1, 0], [-0.22, 1.35, 0], 0.017, m.chrome);
  mesh(
    shifter,
    new THREE.SphereGeometry(0.047, 12, 8),
    m.white,
    [-0.22, 1.35, 0],
  );
  for (const [side, s] of [
    ["left", 1],
    ["right", -1],
  ]) {
    const p = part(`front-seat-${side}`);
    softBox(p, [0.7, 0.19, 0.66], m.interior, [0.15, 1.02, s * 0.54]);
    softBox(
      p,
      [0.18, 0.68, 0.66],
      m.interior,
      [0.51, 1.36, s * 0.54],
      [0, 0, -0.12],
    );
    softBox(
      p,
      [0.14, 0.16, 0.32],
      m.interior,
      [0.55, 1.79, s * 0.54],
      [0, 0, -0.12],
    );
    for (let i = 0; i < 5; i++) {
      box(p, [0.57, 0.012, 0.009], m.dark, [
        0.11,
        1.12,
        s * 0.54 + (i - 2) * 0.1,
      ]);
      box(
        p,
        [0.014, 0.55, 0.009],
        m.dark,
        [0.407, 1.39, s * 0.54 + (i - 2) * 0.1],
        [0, 0, -0.12],
      );
    }
    for (const x of [-0.12, 0.4])
      box(p, [0.12, 0.12, 0.55], m.steel, [x, 0.88, s * 0.54]);
  }
  const bench = part("rear-bench");
  softBox(bench, [0.55, 0.2, 1.73], m.interior, [1.02, 1.1, 0]);
  softBox(
    bench,
    [0.15, 0.49, 1.73],
    m.interior,
    [1.29, 1.39, 0],
    [0, 0, -0.19],
  );
  for (let i = 0; i < 13; i++)
    box(bench, [0.014, 0.4, 0.012], m.dark, [1.197, 1.4, -0.78 + i * 0.13]);
  for (const [side, s] of [
    ["left", 1],
    ["right", -1],
  ]) {
    const p = part(`door-panel-${side}`);
    sheet(
      p,
      [
        [-0.85, 0.89],
        [-0.85, 1.46],
        [0.89, 1.46],
        [0.89, 0.89],
      ],
      m.interior,
      s * 0.995,
      0.04,
    );
    box(p, [0.53, 0.055, 0.07], m.interior, [0.12, 1.15, s * 0.955]);
    box(p, [0.16, 0.025, 0.035], m.chrome, [-0.47, 1.28, s * 0.953]);
  }
  const liner = part("headliner");
  surface(liner, roofRows(2.194, 0.96), m.interior);
  const belts = part("seat-belts");
  for (const s of [-1, 1]) {
    bar(belts, [0.34, 1.14, s * 0.18], [0.06, 1.13, s * 0.8], 0.018, m.dark);
    box(belts, [0.06, 0.025, 0.055], m.chrome, [0.19, 1.16, s * 0.46]);
    bar(belts, [1.02, 1.22, s * 0.15], [0.93, 1.22, s * 0.7], 0.016, m.dark);
  }
  const shelf = part("parcel-shelf");
  box(shelf, [0.48, 0.035, 1.72], m.carpet, [1.57, 1.47, 0]);
  for (const s of [-1, 1])
    cyl(shelf, 0.14, 0.012, m.dark, [1.56, 1.497, s * 0.51]);
  // Exterior panels use authored curves and open wheel arches, not overlapping boxes.
  function flank(p, x0, x1, arch, s) {
    const rows = [];
    for (let i = 0; i <= 52; i++) {
      const x = x0 + ((x1 - x0) * i) / 52;
      const dx = arch === null ? Infinity : x - arch;
      const bottom =
        Math.abs(dx) < 0.655
          ? 0.66 + Math.sqrt(Math.max(0, 0.655 ** 2 - dx ** 2))
          : 0.49;
      const top = 1.505 + 0.05 * Math.cos(x * 0.5);
      const row = [];
      for (let j = 0; j <= 9; j++) {
        const y = bottom + ((top - bottom) * j) / 9;
        const z =
          1.115 +
          0.055 *
            Math.sin(Math.min(1, Math.max(0, (y - 0.49) / 1.04)) * Math.PI) -
          0.055 * Math.max(0, Math.abs(x) - 2.55);
        row.push([x, y, s * z]);
      }
      rows.push(row);
    }
    surface(p, rows, m.body);
    // Continuous top shoulder rolls inward to meet hood / deck / window sill.
    surface(
      p,
      [
        [
          [x0, 1.46, s * 1.105],
          [(x0 + x1) / 2, 1.55, s * 1.13],
          [x1, 1.5, s * 1.115],
        ],
        [
          [x0, 1.49, s * 0.98],
          [(x0 + x1) / 2, 1.565, s * 1.0],
          [x1, 1.52, s * 0.99],
        ],
      ],
      m.body,
    );
    if (arch !== null) {
      const pts = [];
      for (let i = 0; i <= 28; i++) {
        const a = Math.PI - (i / 28) * Math.PI;
        pts.push([
          arch + Math.cos(a) * 0.662,
          0.66 + Math.sin(a) * 0.663,
          s * 1.174,
        ]);
      }
      tube(p, pts, 0.014, m.chrome);
    }
    const rockerRuns =
      arch === null
        ? [[x0, x1]]
        : [
            [x0, arch - 0.66],
            [arch + 0.66, x1],
          ];
    for (const [a, b] of rockerRuns)
      if (b > a)
        tube(
          p,
          [
            [a, 0.57, s * 1.141],
            [b, 0.57, s * 1.141],
          ],
          0.014,
          m.chrome,
        );
  }
  for (const [side, s] of [
    ["left", 1],
    ["right", -1],
  ]) {
    flank(part(`front-fender-${side}`), -3.03, -0.91, -1.85, s);
    flank(part(`door-${side}`), -0.89, 0.98, null, s);
    flank(part(`rear-quarter-${side}`), 1.005, 3.03, 1.85, s);
  }
  function roofRows(y = 2.235, width = 0.99) {
    return [-0.5, -0.33, 0, 0.55, 0.89, 1.08].map((x, i) => {
      const height = y - (i === 0 ? 0.09 : i === 5 ? 0.1 : 0);
      return [-1, -0.65, 0, 0.65, 1].map((t) => [
        x,
        height + 0.044 * (1 - t * t),
        t * width,
      ]);
    });
  }
  const roof = part("roof-structure");
  surface(roof, roofRows(), m.roof);
  for (const s of [-1, 1]) {
    sheet(
      roof,
      [
        [-1.05, 1.54],
        [-0.53, 2.16],
        [-0.4, 2.18],
        [-0.9, 1.54],
      ],
      m.roof,
      s * 0.99,
      0.055,
    );
    sheet(
      roof,
      [
        [0.89, 2.19],
        [1.09, 2.14],
        [1.84, 1.53],
        [1.28, 1.54],
      ],
      m.roof,
      s * 0.99,
      0.07,
    );
    tube(
      roof,
      [
        [-1.04, 1.55, s * 1.025],
        [-0.5, 2.19, s * 1.025],
        [0.7, 2.23, s * 1.025],
        [1.1, 2.16, s * 1.025],
        [1.82, 1.55, s * 1.025],
      ],
      0.014,
      m.chrome,
    );
  }
  function deckRows(xs, heights, width = 1.025) {
    return xs.map((x, i) =>
      [-1, -0.6, 0, 0.6, 1].map((t) => [
        x,
        heights[i] + 0.035 * (1 - t * t),
        t * width,
      ]),
    );
  }
  const hood = part("hood");
  surface(
    hood,
    deckRows([-3.02, -2.8, -1.6, -1.02], [1.475, 1.52, 1.57, 1.545]),
    m.body,
  );
  const trunkLid = part("trunk-lid");
  surface(
    trunkLid,
    deckRows([1.76, 2.12, 2.78, 3.025], [1.55, 1.55, 1.51, 1.475]),
    m.body,
  );
  // Twin custom stripes conform to the panel crown. Their visibility is a style choice.
  for (const [p, xs, ys] of [
    [hood, [-3.015, -2.8, -1.6, -1.025], [1.482, 1.527, 1.577, 1.552]],
    [trunkLid, [1.765, 2.12, 2.78, 3.02], [1.557, 1.557, 1.517, 1.482]],
  ])
    for (const s of [-1, 1])
      surface(
        p,
        xs.map((x, i) =>
          [s * 0.25, s * 0.43].map((z) => [
            x,
            ys[i] + 0.035 * (1 - (z / 1.025) ** 2),
            z,
          ]),
        ),
        m.stripe,
      );
  const fv = part("front-valance");
  surface(
    fv,
    [
      [
        [-3.045, 0.65, -1.1],
        [-3.1, 0.66, 0],
        [-3.045, 0.65, 1.1],
      ],
      [
        [-3.055, 1.03, -1.12],
        [-3.13, 1.03, 0],
        [-3.055, 1.03, 1.12],
      ],
    ],
    m.body,
  );
  for (const s of [-1, 1])
    box(fv, [0.03, 0.09, 0.22], m.amber, [-3.13, 0.86, s * 0.73]);
  const rv = part("rear-valance");
  surface(
    rv,
    [
      [
        [3.045, 0.67, -1.09],
        [3.1, 0.67, 0],
        [3.045, 0.67, 1.09],
      ],
      [
        [3.05, 1.48, -1.11],
        [3.1, 1.48, 0],
        [3.05, 1.48, 1.11],
      ],
    ],
    m.body,
  );
  const windshield = part("windshield");
  surface(
    windshield,
    [
      [
        [-1.01, 1.57, -0.955],
        [-1.08, 1.58, 0],
        [-1.01, 1.57, 0.955],
      ],
      [
        [-0.49, 2.159, -0.94],
        [-0.53, 2.208, 0],
        [-0.49, 2.159, 0.94],
      ],
    ],
    m.glass,
  );
  for (const x of [0, 1]) {
    const y = x ? 2.165 : 1.568,
      xx = x ? -0.49 : -1.01;
    tube(
      windshield,
      [
        [xx, y, -0.96],
        [xx - 0.05, y + 0.03, 0],
        [xx, y, 0.96],
      ],
      0.014,
      m.chrome,
    );
  }
  const rearWindow = part("rear-window");
  surface(
    rearWindow,
    [
      [
        [1.095, 2.13, -0.91],
        [1.12, 2.17, 0],
        [1.095, 2.13, 0.91],
      ],
      [
        [1.765, 1.575, -0.91],
        [1.84, 1.59, 0],
        [1.765, 1.575, 0.91],
      ],
    ],
    m.glass,
  );
  for (const [x, y] of [
    [1.1, 2.14],
    [1.77, 1.58],
  ])
    tube(
      rearWindow,
      [
        [x, y, -0.92],
        [x + 0.04, y + 0.025, 0],
        [x, y, 0.92],
      ],
      0.014,
      m.chrome,
    );
  const sideGlass = part("side-glass");
  for (const s of [-1, 1]) {
    sheet(
      sideGlass,
      [
        [-0.87, 1.56],
        [-0.43, 2.15],
        [0.77, 2.18],
        [1.25, 1.56],
      ],
      m.glass,
      s * 1.003,
      0.006,
    );
    bar(
      sideGlass,
      [0.72, 1.56, s * 1.01],
      [0.76, 2.18, s * 1.01],
      0.012,
      m.chrome,
    );
  }
  // Deep divided grille, paired round lamps and full-width chrome bumpers.
  const grille = part("split-grille");
  for (const s of [-1, 1]) {
    box(grille, [0.075, 0.37, 0.53], m.dark, [-3.06, 1.255, s * 0.31]);
    for (let i = 0; i < 6; i++)
      box(grille, [0.025, 0.012, 0.53], m.steel, [
        -3.108,
        1.11 + i * 0.056,
        s * 0.31,
      ]);
  }
  box(grille, [0.12, 0.43, 0.055], m.chrome, [-3.12, 1.25, 0]);
  for (const y of [1.04, 1.46])
    tube(
      grille,
      [
        [-3.055, y, -1.07],
        [-3.15, y, 0],
        [-3.055, y, 1.07],
      ],
      0.018,
      m.chrome,
    );
  for (const [side, s] of [
    ["left", 1],
    ["right", -1],
  ]) {
    const lamps = part(`headlamps-${side}`);
    for (const z of [0.72, 0.99]) {
      cyl(lamps, 0.142, 0.07, m.dark, [-3.045, 1.26, s * z], "x", 0.142, 28);
      cyl(lamps, 0.128, 0.015, m.chrome, [-3.091, 1.26, s * z], "x", 0.128, 28);
      cyl(lamps, 0.105, 0.019, m.white, [-3.104, 1.26, s * z], "x", 0.105, 28);
      for (const dy of [-0.035, 0.035])
        bar(
          lamps,
          [-3.116, 1.26 + dy, s * z - 0.08],
          [-3.116, 1.26 + dy, s * z + 0.08],
          0.004,
          m.chrome,
        );
    }
    const tail = part(`tail-lamp-${side}`);
    box(tail, [0.065, 0.39, 0.14], m.chrome, [3.083, 1.22, s * 0.99]);
    box(tail, [0.075, 0.34, 0.105], m.lens, [3.125, 1.22, s * 0.99]);
    for (const y of [1.14, 1.28])
      box(tail, [0.012, 0.014, 0.106], m.chrome, [3.169, y, s * 0.99]);
  }
  for (const [id, x, front] of [
    ["front-bumper", -3.16, true],
    ["rear-bumper", 3.16, false],
  ]) {
    const p = part(id);
    tube(
      p,
      [
        [x + (front ? 0.12 : -0.12), 0.98, -1.18],
        [x, 0.97, -0.87],
        [x + (front ? -0.025 : 0.025), 0.95, 0],
        [x, 0.97, 0.87],
        [x + (front ? 0.12 : -0.12), 0.98, 1.18],
      ],
      0.066,
      m.chrome,
    );
    for (const s of [-1, 1])
      box(p, [0.1, 0.18, 0.065], m.chrome, [x, 0.96, s * 0.5]);
    box(p, [0.018, 0.16, 0.34], m.dark, [x + (front ? -0.07 : 0.07), 0.94, 0]);
  }
  const handles = part("door-handles");
  for (const s of [-1, 1]) {
    box(handles, [0.18, 0.035, 0.036], m.chrome, [0.63, 1.38, s * 1.19]);
    cyl(handles, 0.018, 0.02, m.chrome, [0.79, 1.37, s * 1.19], "z");
  }
  const mirrors = part("mirrors");
  for (const s of [-1, 1]) {
    bar(
      mirrors,
      [-0.68, 1.52, s * 1.1],
      [-0.64, 1.66, s * 1.24],
      0.02,
      m.chrome,
    );
    const shell = mesh(
      mirrors,
      new THREE.SphereGeometry(0.1, 16, 10),
      m.chrome,
      [-0.65, 1.68, s * 1.25],
    );
    shell.scale.set(0.45, 0.65, 1);
    box(mirrors, [0.009, 0.1, 0.14], m.glass, [-0.6, 1.68, s * 1.25]);
  }
  // Small geometric 4-4-2 emblems, no raster textures or remote fonts.
  const badges = part("badges");
  const glyphs = {
    4: [
      [0, 0.045, 0.045, 0.09],
      [0, 0.045, 0.065, 0.045],
      [0.065, -0.045, 0.065, 0.09],
    ],
    2: [
      [0, 0.09, 0.065, 0.09],
      [0.065, 0.09, 0.065, 0.045],
      [0, -0.045, 0.065, 0.045],
      [0, -0.045, 0.065, -0.045],
    ],
  };
  function emblem(x, y, z, side = false, sign = 1) {
    let cursor = 0;
    for (const digit of ["4", "4", "2"]) {
      for (const [u, v, u2, v2] of glyphs[digit]) {
        const a = side
          ? [x + sign * (cursor + u), y + v, z]
          : [x, y + v, z + sign * (cursor + u)];
        const b = side
          ? [x + sign * (cursor + u2), y + v2, z]
          : [x, y + v2, z + sign * (cursor + u2)];
        bar(badges, a, b, 0.009, m.chrome);
      }
      cursor += 0.105;
    }
  }
  emblem(-3.161, 1.28, -0.14);
  emblem(3.126, 1.23, 0.14, false, -1);
  for (const s of [-1, 1])
    emblem(s > 0 ? -1.09 : -0.81, 1.39, s * 1.18, true, s);
  // Compact engine placement keeps the closed hood clear of the air-cleaner lid.
  for (const id of [
    "engine-mounts",
    "engine-block",
    "rotating-assembly",
    "oil-pump",
    "oil-pan",
    "cylinder-head-left",
    "cylinder-head-right",
    "intake-manifold",
    "carburetor",
    "air-cleaner",
    "valve-cover-left",
    "valve-cover-right",
    "distributor",
    "water-pump",
    "fan",
    "alternator",
    "starter",
    "transmission",
  ])
    parts[id].position.y = -0.25;
  // Merge static geometry per selectable part/material. No geometry is shared across parts.
  function optimize(root) {
    const bucket = new Map(),
      special = [];
    for (const child of [...root.children]) {
      if (child.isGroup) {
        special.push(child);
        optimize(child);
        continue;
      }
      if (!child.isMesh) continue;
      child.updateMatrix();
      const g = child.geometry.index
        ? child.geometry.toNonIndexed()
        : child.geometry.clone();
      g.deleteAttribute("uv");
      g.applyMatrix4(child.matrix);
      if (!bucket.has(child.material)) bucket.set(child.material, []);
      bucket.get(child.material).push(g);
      root.remove(child);
      child.geometry.dispose();
    }
    for (const [material, geos] of bucket) {
      const merged = mergeGeometries(geos, false);
      for (const geo of geos) geo.dispose();
      if (merged) mesh(root, merged, material);
    }
  }
  for (const p of Object.values(parts)) optimize(p);
  function applyStyle(style = {}) {
    m.body.color.set(style.paint || "#9e332a");
    m.roof.color.set(
      !style.roof || style.roof === "body"
        ? style.paint || "#9e332a"
        : style.roof,
    );
    m.interior.color.set(style.interior || "#3b2d27");
    m.stripe.visible = style.stripe !== "off";
    m.stripe.color.set(
      !style.stripe || style.stripe === "off" ? "#eee2c8" : style.stripe,
    );
    for (const a of [m.body, m.roof]) {
      a.roughness = style.finish === "satin" ? 0.64 : 0.24;
      a.metalness = style.finish === "satin" ? 0.3 : 0.55;
    }
    group.traverse((o) => {
      if (o.userData.wheelStyle)
        o.visible = o.userData.wheelStyle === (style.wheels || "rally");
    });
  }
  applyStyle();
  return { group, parts, applyStyle };
}
