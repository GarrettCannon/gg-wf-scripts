import { actionRegistry } from "./actions.js";
import { runHandler } from "./helpers/run-handler.js";
import { runWithLoading } from "./helpers/run-with-loading.js";
import { getParams } from "./query-params.js";

type ActionData = Record<string, unknown>;

function parseActionData(el: Element): ActionData {
  const attr = el.getAttribute("gg-action-data");
  if (!attr) return {};
  const data: ActionData = {};
  attr
    .split(",")
    .filter(Boolean)
    .forEach((pair) => {
      const [key, value] = pair.split(":");
      if (key?.trim()) data[key.trim()] = value?.trim() ?? "";
    });
  return data;
}

function findRecord(el: Element): ActionData | null {
  let node: Element | null = el.parentElement;
  while (node) {
    if (node.__ggRecord) return node.__ggRecord;
    node = node.parentElement;
  }
  return null;
}

export function initActionEngine(
  context: unknown,
  { debug = false }: { debug?: boolean } = {},
): void {
  async function handleAction(el: Element): Promise<void> {
    if (el.hasAttribute("gg-loading")) return;

    const id = el.getAttribute("gg-action");
    if (!id) return;
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
    if (result.value && (result.value as { ok?: boolean }).ok === false) {
      const failure = result.value as { error?: unknown };
      console.warn(
        `[gg-action] "${id}" failed:`,
        failure.error ?? "unknown error",
      );
    }
  }

  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest("[gg-action]");
    if (trigger) handleAction(trigger);
  });

  document.addEventListener("gg:shadow:click", (e) => {
    const detail = (e as CustomEvent<{ target: Element }>).detail;
    const trigger = detail?.target?.closest?.("[gg-action]");
    if (trigger) handleAction(trigger);
  });
}
