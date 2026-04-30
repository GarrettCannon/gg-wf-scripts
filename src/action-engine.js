import { actionRegistry } from "./actions.js";
import { runHandler } from "./helpers/run-handler.js";
import { runWithLoading } from "./helpers/run-with-loading.js";
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
    if (el.hasAttribute("gg-loading")) return;

    const id = el.getAttribute("gg-action");
    const action = actionRegistry[id];
    if (!action) {
      console.warn(`[gg-action] no action registered for "${id}"`);
      return;
    }

    if (el.hasAttribute("gg-confirm")) {
      const text = el.getAttribute("gg-confirm-text") || "Are you sure?";
      if (!window.confirm(text)) return;
    }

    const record = findRecord(el);
    const explicit = parseActionData(el);
    const data = record ? { ...record, ...explicit } : explicit;
    const params = getParams();

    const result = await runWithLoading([el], () =>
      runHandler(
        {
          prefix: "[gg-action]",
          id,
          fields: { trigger: el, data, params: Object.fromEntries(params) },
          debug,
        },
        () => action(context, data, params),
      ),
    );

    if (!result.ok) return;
    if (result.value?.ok === false) {
      console.warn(
        `[gg-action] "${id}" failed:`,
        result.value.error ?? "unknown error",
      );
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
