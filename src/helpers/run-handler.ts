import type { GgErrorEvent } from "../errors.js";

type LoadingMode = "transient" | "persistent";

type RunHandlerOptions = {
  prefix: string;
  id: string;
  fields: Record<string, unknown>;
  debug: boolean;
  emitError?: (event: GgErrorEvent) => void;
  loading?: Iterable<Element>;
  loadingMode?: LoadingMode;
};

export type RunHandlerResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

export async function runHandler<T>(
  {
    prefix,
    id,
    fields,
    debug,
    emitError,
    loading,
    loadingMode = "transient",
  }: RunHandlerOptions,
  fn: () => Promise<T> | T,
): Promise<RunHandlerResult<T>> {
  if (debug) {
    console.groupCollapsed(`${prefix} "${id}"`);
    for (const [key, value] of Object.entries(fields)) {
      console.log(`${key}:`, value);
    }
  }
  const targets = loading ? [...loading] : [];
  const priorStates = targets.map((el) => el.getAttribute("gg-loading"));
  targets.forEach((el, i) => beginLoading(el, priorStates[i]));
  const startedAt = debug ? performance.now() : 0;
  try {
    const value = await fn();
    if (debug) {
      const ms = (performance.now() - startedAt).toFixed(1);
      console.log(`result (${ms}ms):`, value);
    }
    targets.forEach((el) => endLoading(el, loadingMode, true, null));
    return { ok: true, value };
  } catch (error) {
    console.error(`${prefix} "${id}" threw:`, error);
    emitError?.({ prefix, id, error, fields });
    targets.forEach((el, i) => endLoading(el, loadingMode, false, priorStates[i]));
    return { ok: false, error };
  } finally {
    if (debug) console.groupEnd();
  }
}

function beginLoading(el: Element, prior: string | null): void {
  el.setAttribute("gg-loading", prior === "loaded" ? "refreshing" : "loading");
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
    el.disabled = true;
  }
}

function endLoading(
  el: Element,
  mode: LoadingMode,
  ok: boolean,
  prior: string | null,
): void {
  if (mode === "persistent" && ok) {
    el.setAttribute("gg-loading", "loaded");
  } else if (mode === "persistent" && prior === "loaded") {
    el.setAttribute("gg-loading", "loaded");
  } else {
    el.removeAttribute("gg-loading");
  }
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
    el.disabled = false;
  }
}
