import { addValances, addFascia } from "./car-fascia.js";
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
      color: "#445b60",
      metalness: 0.15,
      roughness: 0.12,
      transparent: true,
      opacity: 0.39,
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
        const spoke = (r, w, h) => [
          x + dx * r - dy * w,
          0.63 + dy * r + dx * w,
          s * h,
        ];
        surface(
          rally,
          [
            [
              spoke(0.075, -0.044, 1.258),
              spoke(0.075, 0, 1.284),
              spoke(0.075, 0.044, 1.258),
            ],
            [
              spoke(0.19, -0.06, 1.235),
              spoke(0.19, 0, 1.262),
              spoke(0.19, 0.06, 1.235),
            ],
            [
              spoke(0.31, -0.082, 1.232),
              spoke(0.31, 0, 1.249),
              spoke(0.31, 0.082, 1.232),
            ],
          ],
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
  surface(liner, roofRows(2.2, 0.844), m.interior);
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
  // Cross sections follow the fender peaks, the waist at the door and the
  // kicked-up rear quarter. Shared stations keep adjoining removable panels flush.
  const stations = [
    [-3.05, 1.49, 1.095],
    [-2.82, 1.56, 1.16],
    [-2.32, 1.59, 1.19],
    [-1.85, 1.59, 1.21],
    [-1.34, 1.55, 1.175],
    [-0.92, 1.53, 1.15],
    [-0.35, 1.48, 1.135],
    [0.45, 1.455, 1.13],
    [0.85, 1.48, 1.15],
    [1.24, 1.57, 1.19],
    [1.73, 1.65, 1.23],
    [2.18, 1.64, 1.225],
    [2.62, 1.59, 1.19],
    [3.04, 1.49, 1.105],
  ];
  function sectionAt(x) {
    const i = Math.max(
      1,
      stations.findIndex((row) => row[0] >= x),
    );
    const a = stations[i - 1],
      b = stations[i];
    let t = THREE.MathUtils.clamp((x - a[0]) / (b[0] - a[0]), 0, 1);
    t = t * t * (3 - 2 * t);
    return [
      THREE.MathUtils.lerp(a[1], b[1], t),
      THREE.MathUtils.lerp(a[2], b[2], t),
    ];
  }
  const wheelScale = 0.8,
    archRX = 0.65 * wheelScale;
  function flank(p, left, right, axle, side) {
    const rows = [],
      opening = [];
    const radius = archRX + 0.022;
    const xs = Array.from(
      { length: 81 },
      (_, i) => left + ((right - left) * i) / 80,
    );
    const lowEdge = (x) =>
      0.44 + 0.22 * Math.pow(Math.max(0, (Math.abs(x) - 2.45) / 0.6), 1.4);
    const archRise = (x) =>
      0.62 + 0.69 * Math.sqrt(Math.max(0, 1 - ((x - axle) / radius) ** 2));
    const makeRow = (x) => {
      const [top, w] = sectionAt(x);
      const arch = axle !== null && Math.abs(x - axle) <= radius;
      const base = arch ? archRise(x) : lowEdge(x);
      const row = [
        [base, arch ? w - 0.015 : w - 0.12],
        [base + 0.026, arch ? w : w - 0.085],
        [top - 0.19, w + 0.026],
        [top - 0.11, w + 0.034],
        [top - 0.045, w + 0.012],
        [top - 0.009, w - 0.014],
        [top, w - 0.044],
        [top - 0.008, w - 0.093],
        [top - 0.016, 0.997],
      ];
      return row.map(([y, z]) => [x, y, side * z]);
    };
    for (const x of xs) rows.push(makeRow(x));
    const skin = surface(p, rows, m.body);
    // Compute normals from equal station spacing, independent of the shape of
    // neighboring triangles at the wheel opening. This keeps reflections smooth.
    const normals = skin.geometry.getAttribute("normal");
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i],
        prev = makeRow(Math.max(left, x - 0.003)),
        next = makeRow(Math.min(right, x + 0.003));
      for (let j = 0; j < rows[i].length; j++) {
        const longitudinal = new THREE.Vector3(...next[j]).sub(
          new THREE.Vector3(...prev[j]),
        );
        const tangent = (k) =>
          new THREE.Vector3(...rows[i][k + 1])
            .sub(new THREE.Vector3(...rows[i][k]))
            .normalize();
        const cross = tangent(Math.min(j, rows[i].length - 2));
        if (j > 0 && j < rows[i].length - 1) cross.add(tangent(j - 1));
        const n = longitudinal.cross(cross).normalize();
        normals.setXYZ(i * rows[i].length + j, n.x, n.y, n.z);
      }
    }
    if (axle !== null) {
      for (let i = 0; i <= 36; i++) {
        const a = (Math.PI * i) / 36,
          x = axle - radius * Math.cos(a);
        opening.push([
          x,
          0.62 + 0.69 * Math.sin(a),
          side * (sectionAt(x)[1] - 0.006),
        ]);
      }
      tube(
        p,
        opening.filter((_, i) => i % 2 === 0),
        0.011,
        m.chrome,
      );
      // Rolled inner lip and shaded wheelhouse, both removable with the panel.
      surface(
        p,
        opening.map(([x, y, z]) => [
          [x, y, z],
          [x, y, side * 0.78],
        ]),
        m.dark,
      );
      surface(
        p,
        opening.map(([x, y]) => [
          [x, 0.55, side * 0.76],
          [x, y, side * 0.76],
        ]),
        m.dark,
      );
    }
    const runs =
      axle === null
        ? [[left, right]]
        : [
            [left, axle - radius],
            [axle + radius, right],
          ];
    for (const [a, b] of runs) {
      const line = Array.from({ length: 7 }, (_, i) => {
        const x = a + ((b - a) * i) / 6;
        return [x, lowEdge(x) + 0.043, side * (sectionAt(x)[1] - 0.072)];
      });
      tube(p, line, 0.012, m.chrome);
    }
  }
  for (const [side, s] of [
    ["left", 1],
    ["right", -1],
  ]) {
    flank(part(`front-fender-${side}`), -3.03, -0.91, -1.85, s);
    flank(part(`door-${side}`), -0.901, 1.09, null, s);
    flank(part(`rear-quarter-${side}`), 1.099, 3.03, 1.85, s);
  }
  function roofRows(y = 2.235, width = 0.86) {
    const stations = [
      [-0.48, -0.082, 0.92],
      [-0.37, -0.035, 0.965],
      [-0.12, 0, 1],
      [0.48, 0.01, 1],
      [0.86, -0.008, 0.994],
      [1.12, -0.065, 0.968],
      [1.25, -0.115, 0.944],
    ];
    return stations.map(([x, dy, w]) =>
      [-1, -0.9, -0.65, 0, 0.65, 0.9, 1].map((t) => [
        x,
        y + dy + 0.053 * (1 - t * t),
        t * w * width,
      ]),
    );
  }
  const roof = part("roof-structure");
  surface(roof, roofRows(), m.roof);
  function rail(p, points, r = 0.013) {
    tube(p, points, r, m.chrome);
  }
  for (const s of [-1, 1]) {
    const aBottom = [-1.15, 1.549, s * 1.01],
      aTop = [-0.48, 2.153, s * 0.792];
    const paneBottom = [-1.03, 1.546, s * 1.018],
      paneTop = [-0.405, 2.18, s * 0.835];
    surface(
      roof,
      [
        [aBottom, paneBottom],
        [aTop, paneTop],
      ],
      m.body,
    );
    rail(roof, [
      paneBottom,
      paneTop,
      [0.34, 2.239, s * 0.862],
      [0.85, 2.225, s * 0.85],
      [1.12, 2.17, s * 0.83],
    ]);
    // Broad sail panels wrap onto the quarter shoulders and rear glass reveal.
    const sail = [
      [
        [1.1, 2.17, 0.829],
        [1.25, 2.12, 0.812],
      ],
      [
        [1.2, 2.09, 0.868],
        [1.44, 2.02, 0.835],
      ],
      [
        [1.32, 1.96, 0.909],
        [1.7, 1.89, 0.88],
      ],
      [
        [1.48, 1.81, 0.956],
        [1.99, 1.75, 0.939],
      ],
      [
        [1.59, 1.63, 1.003],
        [2.27, 1.616, 1.015],
      ],
    ];
    surface(
      roof,
      sail.map((row) => row.map(([x, y, z]) => [x, y, s * z])),
      m.roof,
    );
    rail(roof, [
      [1.59, 1.63, s * 1.003],
      [1.87, 1.636, s * 1.01],
      [2.27, 1.616, s * 1.015],
    ]);
  }
  const hood = part("hood"),
    trunkLid = part("trunk-lid");
  function deck(p, start, end, front) {
    const rows = [],
      stripes = [[], []];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32,
        x = THREE.MathUtils.lerp(start, end, t);
      const y = sectionAt(x)[0] - 0.014;
      const swell = front ? Math.pow(Math.sin(Math.PI * t), 0.72) * 0.085 : 0;
      const crown = (z) =>
        y +
        0.045 * (1 - z * z) +
        swell * Math.exp(-Math.pow((Math.abs(z) - 0.42) / 0.18, 4));
      const point = (z) => [
        x - (front ? 0.073 : -0.044) * (1 - z * z) * (front ? 1 - t : t),
        crown(z),
        z,
      ];
      rows.push(
        Array.from({ length: 33 }, (_, j) => point((j / 16 - 1) * 0.995)),
      );
      for (const [index, s] of [-1, 1].entries()) {
        const path = front ? [0.235, 0.252, 0.585, 0.601] : [0.03, 0.045];
        stripes[index].push(
          path.map((z) => {
            const v = point(s * z);
            v[1] += 0.003;
            return v;
          }),
        );
      }
    }
    surface(p, rows, m.body);
    for (const strip of stripes) {
      if (front) {
        surface(
          p,
          strip.map((r) => r.slice(0, 2)),
          m.stripe,
        );
        surface(
          p,
          strip.map((r) => r.slice(2)),
          m.stripe,
        );
      }
    }
  }
  deck(hood, -3.02, -1.14, true);
  deck(trunkLid, 2.237, 3.025, false);
  addValances({ part, surface, m });
  function curvedGlass(p, top, bottom) {
    const rows = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      rows.push(
        Array.from({ length: 17 }, (_, j) => {
          const u = j / 8 - 1,
            edge = 1 - u * u;
          return [
            THREE.MathUtils.lerp(
              top[0] + top[3] * edge,
              bottom[0] + bottom[3] * edge,
              t,
            ),
            THREE.MathUtils.lerp(
              top[1] + top[4] * edge,
              bottom[1] + bottom[4] * edge,
              t,
            ),
            u * THREE.MathUtils.lerp(top[2], bottom[2], t),
          ];
        }),
      );
    }
    surface(p, rows, m.glass);
    rail(
      p,
      rows[0].filter((_, i) => i % 4 === 0),
    );
    rail(
      p,
      rows.at(-1).filter((_, i) => i % 4 === 0),
    );
    for (const i of [0, 16])
      rail(
        p,
        rows.map((r) => r[i]),
        0.011,
      );
  }
  curvedGlass(
    part("windshield"),
    [-0.48, 2.153, 0.792, -0.035, 0.053],
    [-1.15, 1.549, 1.01, -0.085, 0.038],
  );
  curvedGlass(
    part("rear-window"),
    [1.25, 2.12, 0.812, 0.014, 0.053],
    [2.27, 1.616, 1.015, 0.035, 0.043],
  );
  const sideGlass = part("side-glass");
  for (const s of [-1, 1]) {
    const stations = [
      [-0.405, 2.178, 0.832, -1.025],
      [0.32, 2.235, 0.856, 0.34],
      [0.88, 2.214, 0.851, 0.91],
      [1.1, 2.167, 0.824, 1.585],
    ];
    surface(
      sideGlass,
      stations.map(([x, y, z, foot]) => [
        [foot, sectionAt(foot)[0], s * 1.003],
        [x, y, s * z],
      ]),
      m.glass,
    );
    rail(
      sideGlass,
      stations.map(([, , , foot]) => [
        foot,
        sectionAt(foot)[0] + 0.003,
        s * 1.012,
      ]),
    );
    bar(
      sideGlass,
      [0.91, sectionAt(0.91)[0], s * 1.006],
      [0.88, 2.214, s * 0.854],
      0.008,
      m.chrome,
    );
  }
  addFascia({ part, surface, mesh, box, bar, m });
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
  emblem(-3.157, 1.28, 0.24);
  emblem(3.041, 1.255, 0.14, false, -1);
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
  // Keep the wheel faces round as the assembly adopts the lower hardtop stance.
  group.scale.y = wheelScale;
  for (const end of ["front", "rear"])
    for (const side of ["left", "right"]) {
      const x = end === "front" ? -1.85 : 1.85,
        sign = side === "left" ? 1 : -1;
      for (const id of [
        `wheel-${end}-${side}`,
        `tire-${end}-${side}`,
        `${end}-brake-${side}`,
      ]) {
        parts[id].scale.x = wheelScale;
        parts[id].position.x = x * (1 - wheelScale);
        parts[id].position.z = -sign * 0.095;
      }
    }
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
    if (style.roof && style.roof !== "body") {
      m.roof.roughness = 0.78;
      m.roof.metalness = 0.06;
    }
    group.traverse((o) => {
      if (o.userData.wheelStyle)
        o.visible = o.userData.wheelStyle === (style.wheels || "rally");
    });
  }
  applyStyle();
  return { group, parts, applyStyle };
}
