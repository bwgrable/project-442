import test from "node:test";
import assert from "node:assert/strict";
import { parts, categories } from "../src/car-catalog.js";
import {
  initial,
  install,
  remove,
  affected,
  missing,
  restore,
  customize,
} from "../src/car-state.js";

function build(order = parts) {
  let state = initial();
  let waiting = [...order];
  while (waiting.length) {
    const ready = waiting.findIndex((part) => !missing(state, part.id).length);
    assert.ok(ready >= 0, "dependency graph must permit progress");
    state = install(state, waiting.splice(ready, 1)[0].id);
  }
  return state;
}

test("catalog has exactly 100 meaningful unique parts and the agreed category counts", () => {
  assert.equal(parts.length, 100);
  assert.equal(new Set(parts.map((part) => part.id)).size, 100);
  assert.deepEqual(
    categories.map(
      (category) => parts.filter((part) => part.category === category).length,
    ),
    [12, 28, 20, 16, 14, 10],
  );
  const ids = new Set(parts.map((part) => part.id));
  for (const part of parts) {
    assert.ok(
      part.name && part.description && categories.includes(part.category),
    );
    assert.equal(new Set(part.needs).size, part.needs.length);
    for (const dependency of part.needs) {
      assert.ok(ids.has(dependency), `${part.id}: ${dependency} exists`);
      assert.notEqual(dependency, part.id);
    }
  }
  assert.equal(build().installed.length, 100, "graph has no cycle");
});

test("multiple chosen orders reach the full assembly without automatic prerequisite installation", () => {
  const forward = build();
  const backward = build([...parts].reverse());
  const alphabetical = build(
    [...parts].sort((a, b) => a.name.localeCompare(b.name)),
  );
  assert.notDeepEqual(forward.installed, backward.installed);
  assert.deepEqual(new Set(forward.installed), new Set(backward.installed));
  assert.deepEqual(new Set(forward.installed), new Set(alphabetical.installed));
  const empty = initial();
  assert.strictEqual(install(empty, "air-cleaner"), empty);
  assert.deepEqual(empty.installed, []);
  assert.deepEqual(missing(empty, "air-cleaner"), ["carburetor"]);
});

test("state transitions are immutable, repeated and invalid installs are harmless", () => {
  const empty = initial();
  const foundation = install(empty, "frame");
  assert.deepEqual(empty.installed, []);
  assert.deepEqual(foundation.installed, ["frame"]);
  assert.strictEqual(install(foundation, "frame"), foundation);
  assert.strictEqual(install(foundation, "not-a-part"), foundation);
  assert.deepEqual(missing(foundation, "not-a-part"), []);
  assert.deepEqual(missing(foundation, "front-crossmember"), []);
  const another = initial();
  another.style.paint = "#ffffff";
  assert.notEqual(empty.style.paint, another.style.paint);
});

test("leaf removal leaves all other pieces and support removal removes installed dependent closure", () => {
  const full = build([...parts].reverse());
  assert.deepEqual(affected(full, "air-cleaner"), ["air-cleaner"]);
  const noCleaner = remove(full, "air-cleaner");
  assert.equal(noCleaner.installed.length, 99);
  assert.ok(noCleaner.installed.includes("carburetor"));
  const impact = affected(full, "engine-block");
  for (const id of [
    "engine-block",
    "air-cleaner",
    "transmission",
    "driveshaft",
    "shifter",
    "dual-exhaust",
  ])
    assert.ok(impact.includes(id), id);
  for (const id of [
    "frame",
    "front-crossmember",
    "dashboard",
    "radiator",
    "battery",
  ])
    assert.ok(!impact.includes(id), id);
  const reduced = remove(full, "engine-block");
  assert.equal(reduced.installed.length, 100 - impact.length);
  for (const id of reduced.installed)
    assert.deepEqual(missing(reduced, id), [], id);
  assert.equal(affected(full, "frame").length, 100);
  assert.deepEqual(remove(full, "frame").installed, []);
  assert.equal(
    full.installed.length,
    100,
    "prior snapshot supports exact UI undo",
  );
  assert.strictEqual(remove(full, "bogus"), full);
  assert.deepEqual(affected(initial(), "frame"), []);
});

test("customization validates all fields, normalizes colors, and does not change installation", () => {
  const base = build();
  const choices = {
    paint: "#ABC123",
    roof: "#101010",
    stripe: "#eeeEEE",
    interior: "#aa0022",
    wheels: "torque",
    finish: "satin",
  };
  let state = base;
  for (const [key, value] of Object.entries(choices))
    state = customize(state, key, value);
  assert.deepEqual(state.style, {
    paint: "#abc123",
    roof: "#101010",
    stripe: "#eeeeee",
    interior: "#aa0022",
    wheels: "torque",
    finish: "satin",
  });
  assert.strictEqual(state.installed, base.installed);
  assert.notDeepEqual(base.style, state.style);
  state = customize(customize(state, "roof", "body"), "stripe", "off");
  assert.equal(state.style.roof, "body");
  assert.equal(state.style.stripe, "off");
  for (const [key, value] of [
    ["paint", "#fff"],
    ["paint", "red"],
    ["roof", "off"],
    ["stripe", "body"],
    ["wheels", "chrome"],
    ["finish", "matte"],
    ["version", 99],
    ["__proto__", {}],
    ["interior", null],
  ]) {
    assert.strictEqual(customize(state, key, value), state, `${key}: ${value}`);
  }
  assert.strictEqual(customize(state, "stripe", "off"), state);
});

test("valid local save resumes exact selected installation order and customization", () => {
  let state = build([...parts].reverse());
  state = customize(state, "paint", "#123456");
  state = customize(state, "wheels", "torque");
  assert.deepEqual(restore(JSON.stringify(state)), state);
  const partial = remove(state, "engine-block");
  assert.deepEqual(restore(JSON.stringify(partial)), partial);
  assert.deepEqual(
    initial().installed,
    [],
    "reset starts an independent clean build",
  );
});

test("restore tolerates corruption, invalid versions, unknown IDs and impossible orphan data", () => {
  for (const raw of [
    "{",
    "null",
    "42",
    "[]",
    "{}",
    '{"version":2,"installed":["frame"]}',
    '{"version":1,"installed":{}}',
    undefined,
  ]) {
    assert.deepEqual(restore(raw), initial());
  }
  const restored = restore(
    JSON.stringify({
      version: 1,
      installed: [
        "air-cleaner",
        "front-crossmember",
        "frame",
        "front-crossmember",
        "bogus",
        null,
        {},
      ],
      style: {
        paint: "#123456",
        roof: "bad",
        wheels: "torque",
        finish: "bad",
        unknown: "anything",
      },
    }),
  );
  assert.deepEqual(restored.installed, ["frame", "front-crossmember"]);
  assert.equal(restored.style.paint, "#123456");
  assert.equal(restored.style.roof, initial().style.roof);
  assert.equal(restored.style.wheels, "torque");
  assert.equal(restored.style.finish, "gloss");
  assert.equal(Object.hasOwn(restored.style, "unknown"), false);
  for (const style of [[], null, "text", 42])
    assert.deepEqual(
      restore(JSON.stringify({ version: 1, installed: [], style })).style,
      initial().style,
    );
});
