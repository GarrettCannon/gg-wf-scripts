import type { ActionEngineDeps } from "./engine-deps.js";
import { ATTR, SEL } from "./attrs.js";
import { runHandler } from "./helpers/run-handler.js";
import { runWithLoading } from "./helpers/run-with-loading.js";
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

async function handleAction<TContext>(
  el: Element,
  deps: ActionEngineDeps<TContext>,
): Promise<void> {
  if (el.hasAttribute(ATTR.loading)) return;

  const id = el.getAttribute(ATTR.action);
  if (!id) return;
  const action = deps.actions[id];
  if (!action) {
    console.warn(`[gg-action] no action registered for "${id}"`);
    deps.emitError({
      prefix: "[gg-action]",
      id,
      error: "no action registered",
      fields: { trigger: el },
    });
    return;
  }

  if (el.hasAttribute(ATTR.confirm)) {
    const text = el.getAttribute(ATTR.confirmText) || "Are you sure?";
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
        debug: deps.debug,
        emitError: deps.emitError,
      },
      () => action(deps.context, data, params),
    ),
  );

  if (!result.ok) return;
  if (result.value && (result.value as { ok?: boolean }).ok === false) {
    const failure = result.value as { error?: unknown };
    console.warn(
      `[gg-action] "${id}" failed:`,
      failure.error ?? "unknown error",
    );
    deps.emitError({
      prefix: "[gg-action]",
      id,
      error: failure.error ?? "unknown error",
      fields: { trigger: el, data },
    });
  }
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
