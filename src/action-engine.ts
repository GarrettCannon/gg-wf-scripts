import type { ActionEngineDeps } from "./engine-deps.js";
import type { ActionHelpers, ActionResult } from "./actions.js";
import { ATTR, SEL } from "./attrs.js";
import { runHandler } from "./helpers/run-handler.js";
import { removeWithFade } from "./helpers/visibility.js";
import { getParams } from "./query-params.js";

type ActionData = Record<string, unknown>;

function findListClone(
  el: Element,
): { clone: Element; list: Element } | null {
  let node: Element | null = el;
  while (node) {
    const parent: Element | null = node.parentElement;
    if (node.__ggRecord && parent?.hasAttribute(ATTR.dataList)) {
      return { clone: node, list: parent };
    }
    node = parent;
  }
  return null;
}

function makeHelpers(scope: { clone: Element; list: Element } | null): ActionHelpers {
  return {
    removeItem(predicate) {
      if (!scope) {
        console.warn(
          "[gg-action] removeItem() called but the trigger isn't inside a [gg-data-list] item",
        );
        return;
      }
      const template = scope.list.querySelector(SEL.listTemplate);
      Array.from(scope.list.children).forEach((child) => {
        if (child === template) return;
        const record = child.__ggRecord;
        if (!record) return;
        if (!predicate(record)) return;
        if (child instanceof HTMLElement) removeWithFade(child);
        else child.remove();
      });
    },
  };
}

function parseActionData(el: Element): ActionData {
  const data: ActionData = {};

  const csv = el.getAttribute(ATTR.actionData);
  if (csv) {
    csv
      .split(",")
      .filter(Boolean)
      .forEach((pair) => {
        const [key, value] = pair.split(":");
        if (key?.trim()) data[key.trim()] = value?.trim() ?? "";
      });
  }

  const prefix = `${ATTR.actionData}-`;
  for (const { name, value } of Array.from(el.attributes)) {
    if (name.startsWith(prefix)) {
      const key = name.slice(prefix.length);
      if (key) data[key] = value;
    }
  }

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
  helpers?: ActionHelpers,
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

  const resolvedHelpers = helpers ?? makeHelpers(null);

  const result = await runHandler(
    {
      prefix: "[gg-action]",
      id,
      fields,
      debug: deps.debug,
      emitError: deps.emitError,
      loading: trigger ? [trigger] : undefined,
    },
    () => action(deps.context, data, params, resolvedHelpers),
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
  const loadingState = el.getAttribute(ATTR.loading);
  if (loadingState === "loading" || loadingState === "refreshing") return;

  const id = el.getAttribute(ATTR.action);
  if (!id) return;

  if (el.hasAttribute(ATTR.confirm)) {
    const text = el.getAttribute(ATTR.confirmText) || "Are you sure?";
    if (!window.confirm(text)) return;
  }

  const record = findRecord(el);
  const explicit = parseActionData(el);
  const data = record ? { ...record, ...explicit } : explicit;

  const helpers = makeHelpers(findListClone(el));

  await executeAction(id, data, deps, el, helpers);
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
