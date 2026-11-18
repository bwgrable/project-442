import { parts } from "./car-catalog.js";

const catalog = new Map(parts.map((part) => [part.id, part]));
const defaultStyle = Object.freeze({
  paint: "#7d1e29",
  roof: "#282927",
  stripe: "off",
  interior: "#24262a",
  wheels: "rally",
  finish: "gloss",
});
const hex = (value) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const validStyle = (key, value) => {
  if (key === "paint" || key === "interior") return hex(value);
  if (key === "roof") return value === "body" || hex(value);
  if (key === "stripe") return value === "off" || hex(value);
  if (key === "wheels") return value === "rally" || value === "torque";
  if (key === "finish") return value === "gloss" || value === "satin";
  return false;
};

export function initial() {
  return { installed: [], style: { ...defaultStyle }, version: 1 };
}

// Direct prerequisites only: hints can select one missing part to explain its own prerequisites.
export function missing(state, id) {
  const part = catalog.get(id);
  if (!part) return [];
  const installed = new Set(state.installed);
  return part.needs.filter((need) => !installed.has(need));
}

export function install(state, id) {
  if (
    !catalog.has(id) ||
    state.installed.includes(id) ||
    missing(state, id).length
  )
    return state;
  return { ...state, installed: [...state.installed, id] };
}

// Includes the selected installed part, followed by every installed transitive dependent.
export function affected(state, id) {
  if (!state.installed.includes(id)) return [];
  const removed = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const installed of state.installed) {
      if (
        !removed.has(installed) &&
        catalog.get(installed)?.needs.some((need) => removed.has(need))
      ) {
        removed.add(installed);
        changed = true;
      }
    }
  }
  return [
    id,
    ...state.installed.filter((part) => part !== id && removed.has(part)),
  ];
}

export function remove(state, id) {
  const removed = new Set(affected(state, id));
  if (!removed.size) return state;
  return {
    ...state,
    installed: state.installed.filter((part) => !removed.has(part)),
  };
}

export function customize(state, key, value) {
  if (!validStyle(key, value)) return state;
  const normalized = hex(value) ? value.toLowerCase() : value;
  if (state.style[key] === normalized) return state;
  return { ...state, style: { ...state.style, [key]: normalized } };
}

export function restore(raw) {
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    return initial();
  }
  if (!saved || saved.version !== 1 || !Array.isArray(saved.installed))
    return initial();
  let state = initial();
  // Rebuild in dependency order, regardless of the saved list's order. Unknown, duplicate,
  // and unsupported orphan IDs cannot create an impossible assembly after a damaged save.
  const wanted = new Set(
    saved.installed.filter((id) => typeof id === "string" && catalog.has(id)),
  );
  let progress = true;
  while (progress) {
    progress = false;
    for (const id of wanted) {
      const next = install(state, id);
      if (next !== state) {
        state = next;
        wanted.delete(id);
        progress = true;
      }
    }
  }
  if (
    saved.style &&
    typeof saved.style === "object" &&
    !Array.isArray(saved.style)
  ) {
    for (const key of Object.keys(defaultStyle))
      state = customize(state, key, saved.style[key]);
  }
  return state;
}
