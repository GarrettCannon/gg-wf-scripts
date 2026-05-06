import type { ActionEngineDeps } from "./engine-deps.js";
import type { ActionResult } from "./actions.js";
import { ATTR, SEL } from "./attrs.js";
import { runHandler } from "./helpers/run-handler.js";
import { getParams } from "./query-params.js";

type ActionData = Record<string, unknown>;

function parseActionData(el: Element): ActionData {
  const attr = el.getAttribute(ATTR.actionData);
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

export async function executeAction<TContext>(
  id: string,
  data: ActionData,
  deps: ActionEngineDeps<TContext>,
  trigger?: Element,
): Promise<ActionResult> {
  const params = getParams();
  const fields: Record<string, unknown> = {
    data,
    params: Object.fromEntries(params),
  };
  if (trigger) fields.trigger = trigger;

  const action = deps.actions[id];
  if (!action) {
    const error = new Error(`no action registered for "${id}"`);
    console.warn(`[gg-action] no action registered for "${id}"`);
    deps.emitError({ prefix: "[gg-action]", id, error, fields });
    return { ok: false, error };
  }

  const result = await runHandler(
    {
      prefix: "[gg-action]",
      id,
      fields,
      debug: deps.debug,
      emitError: deps.emitError,
      loading: trigger ? [trigger] : undefined,
    },
    () => action(deps.context, data, params),
  );

  if (!result.ok) return { ok: false, error: result.error };

  const failure = result.value as { ok?: boolean; error?: unknown } | undefined;
  if (failure?.ok === false) {
    const error = failure.error ?? "unknown error";
    console.warn(`[gg-action] "${id}" failed:`, error);
    deps.emitError({ prefix: "[gg-action]", id, error, fields });
    return { ok: false, error };
  }

  return { ok: true };
}

async function handleAction<TContext>(
  el: Element,
  deps: ActionEngineDeps<TContext>,
): Promise<void> {
  if (el.hasAttribute(ATTR.loading)) return;

  const id = el.getAttribute(ATTR.action);
  if (!id) return;

  if (el.hasAttribute(ATTR.confirm)) {
    const text = el.getAttribute(ATTR.confirmText) || "Are you sure?";
    if (!window.confirm(text)) return;
  }

  const record = findRecord(el);
  const explicit = parseActionData(el);
  const data = record ? { ...record, ...explicit } : explicit;

  await executeAction(id, data, deps, el);
}

export function initActionEngine<TContext>(
  deps: ActionEngineDeps<TContext>,
): () => void {
  const onClick = (e: Event) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest(SEL.action);
    if (trigger) handleAction(trigger, deps);
  };

  const onShadowClick = (e: Event) => {
    const detail = (e as CustomEvent<{ target: Element }>).detail;
    const trigger = detail?.target?.closest?.(SEL.action);
    if (trigger) handleAction(trigger, deps);
  };

  document.addEventListener("click", onClick);
  document.addEventListener("gg:shadow:click", onShadowClick);

  return () => {
    document.removeEventListener("click", onClick);
    document.removeEventListener("gg:shadow:click", onShadowClick);
  };
}
