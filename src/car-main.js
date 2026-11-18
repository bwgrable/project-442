import { parts, categories } from "./car-catalog.js";
import {
  initial,
  install,
  remove,
  affected,
  missing,
  restore,
  customize,
} from "./car-state.js";
import { mountScene } from "./car-scene.js";
const $ = (id) => document.getElementById(id);
const byId = new Map(parts.map((p) => [p.id, p]));
const storageKey = "project442.wholecar.v1";
let state = initial(),
  saveText = "Local garage";
try {
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    state = restore(raw);
    saveText = "Build resumed";
  }
} catch {
  saveText = "Local save unavailable";
}
let reference = state.installed.length === 0,
  category = categories[0],
  selected = null,
  hint = false,
  cut = false,
  isolated = false,
  history = [],
  pending = null,
  scene;
const name = (id) => byId.get(id)?.name || id;
const status = (msg) => {
  $("notice").textContent = msg;
};
function commit(next, message) {
  if (next !== state) {
    history.push(state);
    if (history.length > 105) history.shift();
    state = next;
    save();
  }
  status(message);
  render();
}
function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    saveText = "Saved on this device";
  } catch {
    saveText = "Local save unavailable";
  }
}
function button(label, action, parent) {
  const el = document.createElement("button");
  el.type = "button";
  el.textContent = label;
  el.onclick = action;
  parent.append(el);
  return el;
}
function leaveInspection() {
  if (isolated) {
    isolated = false;
    scene?.preset($("camera").value);
  }
}
function pick(id) {
  leaveInspection();
  selected = id;
  hint = false;
  reference = false;
  isolated = false;
  const needs = missing(state, id);
  if (cut && ["Body", "Trim"].includes(byId.get(id).category)) cut = false;
  const had = state.installed.includes(id);
  commit(
    install(state, id),
    needs.length
      ? name(id) +
          " needs a connection first. Select Show connection hint for details."
      : name(id) + (had ? " selected." : " installed."),
  );
}
function ask(title, text, action) {
  const d = $("confirm");
  d.querySelector("h2").textContent = title;
  d.querySelector("p").textContent = text;
  pending = action;
  d.showModal();
  $("cancel").focus();
}
$("cancel").onclick = () => $("confirm").close();
$("confirm").onclose = () => {
  pending = null;
};
$("accept").onclick = () => {
  const action = pending;
  $("confirm").close();
  action?.();
};
function removePart(id) {
  const ids = affected(state, id);
  const run = () => {
    reference = false;
    leaveInspection();
    commit(
      remove(state, id),
      name(id) + " removed. Undo restores this change.",
    );
  };
  if (ids.length > 1)
    ask("Remove " + ids.length + " parts?", ids.map(name).join(", "), run);
  else run();
}
function showParts() {
  const query = $("search").value.trim().toLowerCase();
  const list = parts.filter((p) =>
    query ? p.name.toLowerCase().includes(query) : p.category === category,
  );
  $("system-name").textContent = query ? "Search results" : category;
  $("system-count").textContent =
    list.filter((p) => state.installed.includes(p.id)).length +
    " / " +
    list.length;
  for (const b of $("systems").children)
    b.setAttribute("aria-pressed", !query && b.dataset.category === category);
  const host = $("parts"),
    scroll = host.scrollTop,
    focus = document.activeElement?.dataset.part;
  host.replaceChildren();
  for (const p of list) {
    const b = button(p.name, () => pick(p.id), host);
    b.dataset.part = p.id;
    b.setAttribute("aria-current", p.id === selected);
    const tag = document.createElement("small");
    tag.textContent = state.installed.includes(p.id)
      ? "✓ Installed"
      : missing(state, p.id).length
        ? "Needs connection"
        : "+ Install";
    b.append(tag);
    if (p.id === focus) b.focus({ preventScroll: true });
  }
  if (!list.length) host.textContent = "No matching parts.";
  host.scrollTop = scroll;
  const detail = $("detail");
  detail.replaceChildren();
  if (!selected) return;
  const p = byId.get(selected),
    title = document.createElement("b"),
    desc = document.createElement("p");
  title.textContent = p.name;
  desc.textContent = p.description;
  detail.append(title, desc);
  if (state.installed.includes(p.id)) {
    button(
      isolated ? "Return to assembly" : "Inspect part",
      () => {
        isolated = !isolated;
        reference = false;
        cut = false;
        if (isolated) scene?.focus(p.id);
        else scene?.preset($("camera").value);
        render();
        if (innerWidth <= 760) $("scene").scrollIntoView({ block: "start" });
      },
      detail,
    );
    button("Remove part", () => removePart(p.id), detail);
  } else if (missing(state, p.id).length) {
    button(
      hint ? "Hide hint" : "Show connection hint",
      () => {
        hint = !hint;
        showParts();
      },
      detail,
    );
    if (hint) {
      const line = document.createElement("p");
      line.textContent =
        "Install first: " + missing(state, p.id).map(name).join(", ") + ".";
      detail.append(line);
    }
  } else button("Install part", () => pick(p.id), detail);
}
function render() {
  $("count").textContent = state.installed.length + " / " + parts.length;
  document.querySelector("progress").value = state.installed.length;
  $("saved").textContent = saveText;
  $("undo").disabled = !history.length;
  $("scene-label").textContent = isolated
    ? name(selected)
    : reference
      ? "Finished reference"
      : cut
        ? "My build · Cutaway"
        : "My build";
  $("reference").textContent = reference
    ? "View my build"
    : "Finished reference";
  $("cut").setAttribute("aria-pressed", cut);
  showParts();
  for (const b of $("paint").querySelectorAll("[data-key]"))
    b.setAttribute(
      "aria-pressed",
      state.style[b.dataset.key] === b.dataset.value,
    );
  for (const input of $("paint").querySelectorAll("input"))
    if (/^#/.test(state.style[input.dataset.channel]))
      input.value = state.style[input.dataset.channel];
  scene?.update(state, reference, cut, selected, isolated);
}
for (const c of categories) {
  const b = button(
    c === "Engine and drivetrain" ? "Powertrain" : c,
    () => {
      category = c;
      selected = null;
      hint = false;
      leaveInspection();
      $("search").value = "";
      $("parts").scrollTop = 0;
      render();
    },
    $("systems"),
  );
  b.dataset.category = c;
}
$("search").oninput = showParts;
$("undo").onclick = () => {
  leaveInspection();
  state = history.pop() || state;
  save();
  reference = false;
  status("Last change undone.");
  render();
};
$("reset").onclick = () =>
  ask(
    "Reset this garage?",
    "Clear the assembly and restore the original finishes on this device.",
    () => {
      reference = false;
      cut = false;
      isolated = false;
      selected = null;
      category = categories[0];
      $("search").value = "";
      $("camera").value = "front";
      scene?.preset("front");
      commit(initial(), "Garage reset. Select the frame to begin.");
    },
  );
$("reference").onclick = () => {
  reference = !reference;
  cut = false;
  isolated = false;
  scene?.preset("front");
  $("camera").value = "front";
  render();
};
$("camera").onchange = () => {
  isolated = false;
  const v = $("camera").value;
  if (["inside", "top"].includes(v)) cut = true;
  scene?.preset(v);
  render();
};
$("cut").onclick = () => {
  isolated = false;
  cut = !cut;
  render();
};
$("plus").onclick = () => scene?.zoom(0.84);
$("minus").onclick = () => scene?.zoom(1.19);
function tab(paint) {
  $("paint").hidden = !paint;
  $("assembly").hidden = paint;
  $("assembly-tab").setAttribute("aria-pressed", !paint);
  $("paint-tab").setAttribute("aria-pressed", paint);
  if (paint && !state.installed.some((id) => byId.get(id).category === "Body"))
    reference = true;
  if (paint) {
    cut = false;
    isolated = false;
    scene?.preset("front");
    $("camera").value = "front";
  }
  render();
}
$("assembly-tab").onclick = () => tab(false);
$("paint-tab").onclick = () => tab(true);
function options(key, title, choices, customColor = false) {
  const field = document.createElement("fieldset"),
    legend = document.createElement("legend");
  legend.textContent = title;
  field.append(legend);
  $("paint").append(field);
  const apply = (value) =>
    commit(customize(state, key, value), title + " updated.");
  for (const [label, value] of choices) {
    const b = button(label, () => apply(value), field);
    b.dataset.key = key;
    b.dataset.value = value;
    if (value.startsWith("#")) {
      b.className = "swatch";
      const chip = document.createElement("span");
      chip.style.background = value;
      b.prepend(chip);
    }
  }
  if (customColor) {
    const label = document.createElement("label"),
      input = document.createElement("input");
    label.className = "custom";
    input.type = "color";
    input.dataset.channel = key;
    input.setAttribute("aria-label", "Custom " + title);
    input.onchange = () => apply(input.value);
    label.append(input, "Custom");
    field.append(label);
  }
}
options(
  "paint",
  "Body paint",
  [
    ["Juniper", "#2e6455"],
    ["Garnet", "#802f36"],
    ["Bronze", "#a76332"],
    ["Midnight", "#263b55"],
  ],
  true,
);
options("finish", "Finish", [
  ["Gloss", "gloss"],
  ["Satin", "satin"],
]);
options(
  "roof",
  "Roof",
  [
    ["Match body", "body"],
    ["Black", "#282927"],
    ["Ivory", "#e8e0ca"],
  ],
  true,
);
options(
  "stripe",
  "Hood stripes",
  [
    ["None", "off"],
    ["Ivory", "#f1ead7"],
    ["Black", "#272a29"],
  ],
  true,
);
options("wheels", "Wheels", [
  ["Rally", "rally"],
  ["Torque spoke", "torque"],
]);
options(
  "interior",
  "Upholstery",
  [
    ["Charcoal", "#302e2b"],
    ["Saddle", "#9d6844"],
    ["Parchment", "#dbcfaf"],
  ],
  true,
);
function recovery(msg) {
  const el = $("loading");
  el.hidden = false;
  el.textContent = msg + " ";
  button("Reload garage", () => location.reload(), el);
}
render();
try {
  scene = mountScene(document.querySelector("canvas"), recovery);
  render();
  $("loading").hidden = true;
  document.body.dataset.ready = "true";
} catch (error) {
  console.error(error);
  recovery("3D view unavailable. Your parts bench is still accessible.");
}
window.__garage442 = Object.freeze({
  snapshot: () =>
    structuredClone({ state, reference, cut, metrics: scene?.metrics() }),
});
