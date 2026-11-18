import * as THREE from "three";

// Authored pressed-metal sections and recessed lamp/grille geometry, based on
// 1969 442 exterior references. Dimensions are illustrative.
export function addValances({ part, surface, m }) {
  const front = part("front-valance");
  const zs = [-1.12, -1.04, -0.83, -0.46, 0, 0.46, 0.83, 1.04, 1.12];
  const frontX = (z) => -3.085 - 0.09 * (1 - Math.abs(z) / 1.12);
  surface(
    front,
    [0.59, 0.67, 0.84, 0.96].map((y, i) =>
      zs.map((z) => [frontX(z) + (i === 0 ? 0.1 : i === 1 ? 0.045 : 0), y, z]),
    ),
    m.body,
  );
  // Characteristic painted central prow separates the two grille cavities.
  surface(
    front,
    [
      [
        [-3.095, 0.96, -0.105],
        [-3.195, 0.96, 0],
        [-3.095, 0.96, 0.105],
      ],
      [
        [-3.115, 1.12, -0.075],
        [-3.205, 1.12, 0],
        [-3.115, 1.12, 0.075],
      ],
      [
        [-3.095, 1.455, -0.065],
        [-3.185, 1.485, 0],
        [-3.095, 1.455, 0.065],
      ],
    ],
    m.body,
  );
  for (const s of [-1, 1])
    surface(
      front,
      [
        [
          [-3.08, 0.99, s * 1.04],
          [-2.99, 0.99, s * 1.145],
        ],
        [
          [-3.065, 1.42, s * 1.065],
          [-2.99, 1.47, s * 1.13],
        ],
      ],
      m.body,
    );
  const rear = part("rear-valance");
  const rearZ = [-1.12, -1.04, -0.89, -0.5, 0, 0.5, 0.89, 1.04, 1.12];
  // Rolled upper edge, recessed tail panel and a lower apron with exhaust reliefs.
  surface(
    rear,
    [
      rearZ.map((z) => [3.025, 1.475, z]),
      rearZ.map((z) => [3.07 - 0.045 * (1 - Math.abs(z) / 1.12), 1.405, z]),
      rearZ.map((z) => [3.055 - 0.065 * (1 - Math.abs(z) / 1.12), 1.11, z]),
      rearZ.map((z) => [3.085, 0.99, z]),
    ],
    m.body,
  );
  const lower = [];
  for (let i = 0; i <= 36; i++) {
    const z = -1.11 + (i / 36) * 2.22;
    const clearance = 0.12 * Math.exp(-(((Math.abs(z) - 0.7) / 0.12) ** 2));
    const corner = Math.pow(Math.abs(z) / 1.11, 4);
    lower.push([3.02 - .035 * corner, 0.51 + clearance + .16 * corner, z * .97]);
  }
  surface(
    rear,
    [
      lower,
      lower.map(([x, y, z]) => [x + 0.045, 0.72, z]),
      lower.map(([x, y, z]) => [x + 0.055, 0.89, z]),
    ],
    m.body,
  );
}

export function addFascia({ part, surface, mesh, box, bar, m }) {
  function yzPanel(parent, outline, x, material, depth = 0.025, bevel = 0.008) {
    const shape = new THREE.Shape();
    outline.forEach(([z, y], i) =>
      i ? shape.lineTo(z, y) : shape.moveTo(z, y),
    );
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelSegments: 2,
      steps: 1,
      bevelSize: bevel,
      bevelThickness: bevel,
      curveSegments: 8,
    });
    g.rotateY(Math.PI / 2);
    return mesh(parent, g, material, [x, 0, 0]);
  }
  function lens(parent, points, xyz, material) {
    const geo = new THREE.LatheGeometry(
      points.map((a) => new THREE.Vector2(...a)),
      32,
    );
    const o = mesh(parent, geo, material, xyz);
    o.rotation.z = Math.PI / 2;
    o.scale.z = 0.8;
    return o;
  }
  function press(parent, rows, profile, material) {
    surface(
      parent,
      rows.map(([x, y, z]) => profile.map(([dx, dy]) => [x + dx, y + dy, z])),
      material,
    );
  }
  const grille = part("split-grille");
  for (const s of [-1, 1]) {
    const outline = [
      [s * 0.11, 1.1],
      [s * 0.15, 1.44],
      [s * 0.97, 1.425],
      [s * 1.125, 1.36],
      [s * 1.12, 1.095],
    ];
    // Deep charcoal cavity; the headlamp bowls nest within the same opening.
    yzPanel(grille, outline, -2.955, m.dark, 0.018, 0.01);
    const rim = outline.map(([z, y]) => [-3.075 + 0.045 * Math.abs(z), y, z]);
    rim.push(rim[0]);
    // Wide pressed bright surround rather than a line of exposed lamp cylinders.
    for (let i = 0; i < rim.length - 1; i++) {
      const a = rim[i],
        b = rim[i + 1],
        dy = b[1] - a[1],
        dz = b[2] - a[2],
        len = Math.hypot(dy, dz),
        w = 0.013;
      surface(
        grille,
        [
          [
            [a[0], a[1] + (dz / len) * w, a[2] - (dy / len) * w],
            [b[0], b[1] + (dz / len) * w, b[2] - (dy / len) * w],
          ],
          [
            [a[0] - 0.009, a[1] - (dz / len) * w, a[2] + (dy / len) * w],
            [b[0] - 0.009, b[1] - (dz / len) * w, b[2] + (dy / len) * w],
          ],
        ],
        m.chrome,
      );
    }
    for (let i = 0; i < 7; i++) {
      const y = 1.13 + i * 0.044;
      surface(
        grille,
        [
          [
            [-3.015, y, s * 0.14],
            [-2.99, y, s * 0.6],
          ],
          [
            [-3.027, y + 0.009, s * 0.14],
            [-3.002, y + 0.009, s * 0.6],
          ],
        ],
        m.steel,
      );
    }
    // Small vertical grille bars make a fine, dark basket texture.
    for (let i = 0; i < 10; i++)
      box(grille, [0.018, 0.275, 0.008], m.dark, [
        -3.027,
        1.285,
        s * (0.17 + i * 0.045),
      ]);
  }
  // A narrow chrome edge follows the painted center's ridge without replacing it.
  for (const s of [-1, 1])
    surface(
      grille,
      [
        [
          [-3.115, 1.1, s * 0.085],
          [-3.095, 1.445, s * 0.073],
        ],
        [
          [-3.127, 1.1, s * 0.096],
          [-3.107, 1.445, s * 0.084],
        ],
      ],
      m.chrome,
    );
  for (const [side, s] of [
    ["left", 1],
    ["right", -1],
  ]) {
    const lamps = part(`headlamps-${side}`);
    for (const z of [0.737, 0.992]) {
      // Concave black socket, folded chrome bezel and slightly convex sealed beam.
      lens(
        lamps,
        [
          [0.139, -0.005],
          [0.141, 0.035],
          [0.134, 0.092],
          [0.121, 0.101],
          [0.113, 0.088],
          [0.113, 0.043],
        ],
        [-3.015, 1.27, s * z],
        m.dark,
      );
      lens(
        lamps,
        [
          [0.135, 0.079],
          [0.137, 0.096],
          [0.126, 0.111],
          [0.114, 0.105],
          [0.113, 0.086],
        ],
        [-3.015, 1.27, s * z],
        m.chrome,
      );
      lens(
        lamps,
        [
          [0.111, 0.101],
          [0.085, 0.111],
          [0.045, 0.117],
          [0, 0.119],
        ],
        [-3.015, 1.27, s * z],
        m.white,
      );
      for (const dy of [-0.045, 0, 0.045]) {
        const half = 0.8 * Math.sqrt(0.098 ** 2 - dy ** 2);
        bar(
          lamps,
          [-3.138, 1.27 + dy, s * z - half],
          [-3.138, 1.27 + dy, s * z + half],
          0.0025,
          m.chrome,
        );
      }
    }
    const tail = part(`tail-lamp-${side}`);
    const outline = [
      [-0.071, -0.185],
      [0.071, -0.185],
      [0.069, 0.17],
      [0.048, 0.188],
      [-0.06, 0.175],
    ];
    yzPanel(
      tail,
      outline.map(([z, y]) => [z + s * 1.015, y + 1.25]),
      3.063,
      m.dark,
      0.017,
      0.01,
    );
    yzPanel(
      tail,
      outline.map(([z, y]) => [z * 0.88 + s * 1.015, y * 0.96 + 1.25]),
      3.087,
      m.chrome,
      0.018,
      0.008,
    );
    yzPanel(
      tail,
      outline.map(([z, y]) => [z * 0.67 + s * 1.015, y * 0.87 + 1.25]),
      3.111,
      m.lens,
      0.009,
      0.006,
    );
    for (const y of [1.19, 1.31])
      surface(
        tail,
        [
          [
            [3.132, y, s * 1.015 - 0.043],
            [3.132, y, s * 1.015 + 0.043],
          ],
          [
            [3.132, y + 0.008, s * 1.015 - 0.043],
            [3.132, y + 0.008, s * 1.015 + 0.043],
          ],
        ],
        m.chrome,
      );
  }
  // Bumpers sweep back around the fenders and have a deep pressed cross-section.
  // Their broad face, crown and rolled-under lip catch light as distinct surfaces.
  for (const [id, sign, y] of [
    ["front-bumper", -1, 0.965],
    ["rear-bumper", 1, 0.955],
  ]) {
    const p = part(id),
      rows = [];
    const anchors = [
      [-1.19, 2.94],
      [-1.145, 3.07],
      [-1.03, 3.14],
      [-0.77, 3.17],
      [-0.4, 3.185],
      [0, 3.19],
      [0.4, 3.185],
      [0.77, 3.17],
      [1.03, 3.14],
      [1.145, 3.07],
      [1.19, 2.94],
    ];
    for (const [z, x] of anchors)
      rows.push([sign * x, y - (Math.abs(z) < 0.3 ? 0.025 : 0), z]);
    const section = [
      [sign * -0.045, 0.09],
      [sign * 0.005, 0.092],
      [sign * 0.038, 0.055],
      [sign * 0.043, -0.035],
      [sign * 0.015, -0.085],
      [sign * -0.045, -0.08],
      [sign * -0.045, 0.09],
    ];
    press(p, rows, section, m.chrome);
    // Inset plate pocket and a small rolled upper license surround.
    yzPanel(
      p,
      [
        [-0.195, y - 0.13],
        [0.195, y - 0.13],
        [0.195, y + 0.015],
        [-0.195, y + 0.015],
      ],
      sign * 3.237,
      m.dark,
      0.004,
      0,
    );
    if (sign < 0)
      for (const s of [-1, 1]) {
        // Rectangular park lenses lie in the broad bumper face.
        yzPanel(
          p,
          [
            [s * 0.61 - 0.092, y - 0.045],
            [s * 0.61 + 0.092, y - 0.045],
            [s * 0.61 + 0.092, y + 0.025],
            [s * 0.61 - 0.092, y + 0.025],
          ],
          -3.235,
          m.amber,
          0.003,
          0.004,
        );
      }
  }
}
