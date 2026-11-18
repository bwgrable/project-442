import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { makeCar, CAR_EXTENTS } from "../src/car-model.js";
import { parts as catalog } from "../src/car-catalog.js";

const meshes = (root) => {
  const out = [];
  root.traverse((o) => {
    if (o.isMesh) out.push(o);
  });
  return out;
};
const material = (root, hex) =>
  meshes(root)
    .map((o) => o.material)
    .find((m) => m.color.getHexString() === hex);

test("whole car maps every catalog choice to finite, bounded, independently visible geometry", () => {
  const car = makeCar();
  assert.equal(Object.keys(car.parts).length, 100);
  assert.deepEqual(
    Object.keys(car.parts).sort(),
    catalog.map((p) => p.id).sort(),
  );
  let triangles = 0,
    draws = 0;
  for (const [id, root] of Object.entries(car.parts)) {
    assert.equal(root.parent, car.group);
    assert.equal(root.name, id);
    assert.ok(meshes(root).length, `${id} has geometry`);
    for (const mesh of meshes(root)) {
      for (const value of mesh.geometry.attributes.position.array)
        assert.ok(Number.isFinite(value), `${id} contains finite vertices`);
      triangles +=
        (mesh.geometry.index?.count ??
          mesh.geometry.attributes.position.count) / 3;
    }
  }
  car.group.traverseVisible((o) => {
    if (o.isMesh) draws++;
  });
  assert.ok(
    triangles <= 180000,
    `${triangles} authored triangles including hidden alternate wheels`,
  );
  assert.ok(draws <= 200, `${draws} visible material batches`);
  const bounds = new THREE.Box3().setFromObject(car.group);
  for (let i = 0; i < 3; i++) {
    assert.ok(bounds.min.getComponent(i) >= CAR_EXTENTS.min[i] - 0.001);
    assert.ok(bounds.max.getComponent(i) <= CAR_EXTENTS.max[i] + 0.001);
  }
  assert.ok(bounds.getSize(new THREE.Vector3()).x > 6, "long coupe silhouette");
  car.parts.frame.visible = false;
  assert.equal(car.parts.hood.visible, true, "part visibility is independent");
});

test("wheel arches really open around separately installed wheels and tires", () => {
  const car = makeCar();
  car.group.updateMatrixWorld(true);
  for (const [end, x, panel] of [
    ["front", -1.85, "front-fender"],
    ["rear", 1.85, "rear-quarter"],
  ])
    for (const [side, s] of [
      ["left", 1],
      ["right", -1],
    ]) {
      const casing = new THREE.Box3().setFromObject(
        meshes(car.parts[`tire-${end}-${side}`]).find(
          (o) => o.material.color.getHexString() === "202327",
        ),
      );
      const center = casing.getCenter(new THREE.Vector3());
      assert.ok(Math.abs(center.x - x) < 0.005);
      assert.ok(Math.abs(center.y - 0.63) < 0.005);
      assert.ok(Math.abs(center.z - s * 1.1) < 0.005);
      for (const y of [0.57, 0.78]) {
        const through = new THREE.Raycaster(
          new THREE.Vector3(x, y, s * 1.6),
          new THREE.Vector3(0, 0, -s),
          0,
          0.7,
        );
        assert.equal(
          through.intersectObject(car.parts[`${panel}-${side}`], true).length,
          0,
          "open wheel arch without rocker trim crossing tire",
        );
      }
      const above = new THREE.Raycaster(
        new THREE.Vector3(x, 1.46, s * 1.6),
        new THREE.Vector3(0, 0, -s),
        0,
        0.7,
      );
      assert.ok(
        above.intersectObject(car.parts[`${panel}-${side}`], true).length > 0,
        "painted fender above arch",
      );
    }
});

test("air cleaner clears closed hood and all custom finishes preserve geometry and assembly visibility", () => {
  const car = makeCar();
  car.group.updateMatrixWorld(true);
  const cleaner = new THREE.Box3().setFromObject(car.parts["air-cleaner"]);
  const hoodRay = new THREE.Raycaster(
    new THREE.Vector3(-1.65, 2.0, 0),
    new THREE.Vector3(0, -1, 0),
  );
  const hit = hoodRay.intersectObject(car.parts.hood, true)[0];
  assert.ok(
    hit && hit.point.y - cleaner.max.y > 0.02,
    "air cleaner does not pierce closed hood",
  );
  const door = material(car.parts["door-left"], "9e332a"),
    roof = material(car.parts["roof-structure"], "9e332a");
  const seat = material(car.parts["front-seat-left"], "3b2d27"),
    engine = material(car.parts["engine-block"], "b37731");
  const stripe = material(car.parts.hood, "eee2c8");
  const count = meshes(car.group).length;
  car.parts.hood.visible = false;
  car.applyStyle({
    paint: "#275b48",
    roof: "#e9dfc5",
    interior: "#a87045",
    stripe: "#ffffff",
    wheels: "torque",
    finish: "satin",
  });
  assert.equal(door.color.getHexString(), "275b48");
  assert.equal(roof.color.getHexString(), "e9dfc5");
  assert.equal(seat.color.getHexString(), "a87045");
  assert.equal(engine.color.getHexString(), "b37731");
  assert.equal(stripe.color.getHexString(), "ffffff");
  assert.equal(stripe.visible, true);
  assert.ok(door.roughness > 0.5);
  assert.equal(car.parts.hood.visible, false);
  assert.equal(meshes(car.group).length, count);
  for (const root of Object.values(car.parts))
    for (const child of root.children.filter((c) => c.userData.wheelStyle))
      assert.equal(child.visible, child.userData.wheelStyle === "torque");
  car.applyStyle({
    paint: "#314c6a",
    roof: "body",
    stripe: "off",
    wheels: "rally",
    finish: "gloss",
  });
  assert.equal(roof.color.getHexString(), "314c6a");
  assert.equal(stripe.visible, false);
  assert.ok(door.roughness < 0.3);
  assert.equal(car.parts.hood.visible, false);
});
