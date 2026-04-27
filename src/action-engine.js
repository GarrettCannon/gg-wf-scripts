import { actionRegistry } from "./actions.js";
import { withDebugLog } from "./helpers/log.js";
import { getParams } from "./query-params.js";

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
    const params = getParams();

    const result = await withDebugLog(
      "[gg-action]",
      id,
      { trigger: el, data, params: Object.fromEntries(params) },
      debug,
      () => action(context, data, params),
    );

    if (result?.ok === false) {
      console.warn(`[gg-action] "${id}" failed:`, result.error ?? "unknown error");
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
