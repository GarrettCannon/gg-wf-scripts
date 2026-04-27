import { actionRegistry } from "./actions.js";

function parseActionData(el) {
  const attr = el.getAttribute("gg-action-data");
  if (!attr) return {};
  const data = {};
  attr
    .split(",")
    .filter(Boolean)
    .forEach((pair) => {
      const [key, value] = pair.split(":");
      if (key?.trim()) data[key.trim()] = value?.trim() ?? "";
    });
  return data;
}

function findRecord(el) {
  let node = el.parentElement;
  while (node) {
    if (node.__ggRecord) return node.__ggRecord;
    node = node.parentElement;
  }
  return null;
}

export function initActionEngine(context, { debug = false } = {}) {
  async function handleAction(el) {
    const id = el.getAttribute("gg-action");
    const action = actionRegistry[id];
    if (!action) {
      console.warn(`[gg-action] no action registered for "${id}"`);
      return;
    }

    const record = findRecord(el);
    const explicit = parseActionData(el);
    const data = record ? { ...record, ...explicit } : explicit;

    if (debug) {
      console.groupCollapsed(`[gg-action] "${id}"`);
      console.log("trigger:", el);
      console.log("data:", data);
    }
    const startedAt = debug ? performance.now() : 0;

    try {
      const result = await action(context, data);
      if (debug) {
        const ms = (performance.now() - startedAt).toFixed(1);
        console.log(`result (${ms}ms):`, result);
      }
      if (result?.ok === false) {
        console.warn(`[gg-action] "${id}" failed:`, result.error ?? "unknown error");
      }
    } catch (err) {
      console.error(`[gg-action] "${id}" threw:`, err);
    } finally {
      if (debug) console.groupEnd();
    }
  }

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[gg-action]");
    if (trigger) handleAction(trigger);
  });

  document.addEventListener("gg:shadow:click", (e) => {
    const trigger = e.detail.target.closest("[gg-action]");
    if (trigger) handleAction(trigger);
  });
}
