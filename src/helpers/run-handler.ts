import type { GgErrorEvent } from "../errors.js";

type RunHandlerOptions = {
  prefix: string;
  id: string;
  fields: Record<string, unknown>;
  debug: boolean;
  emitError?: (event: GgErrorEvent) => void;
  loading?: Iterable<Element>;
};

export type RunHandlerResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

export async function runHandler<T>(
  { prefix, id, fields, debug, emitError, loading }: RunHandlerOptions,
  fn: () => Promise<T> | T,
): Promise<RunHandlerResult<T>> {
  if (debug) {
    console.groupCollapsed(`${prefix} "${id}"`);
    for (const [key, value] of Object.entries(fields)) {
      console.log(`${key}:`, value);
    }
  }
  const targets = loading ? [...loading] : [];
  targets.forEach(applyLoading);
  const startedAt = debug ? performance.now() : 0;
  try {
    const value = await fn();
    if (debug) {
      const ms = (performance.now() - startedAt).toFixed(1);
      console.log(`result (${ms}ms):`, value);
    }
    return { ok: true, value };
  } catch (error) {
    console.error(`${prefix} "${id}" threw:`, error);
    emitError?.({ prefix, id, error, fields });
    return { ok: false, error };
  } finally {
    targets.forEach(clearLoading);
    if (debug) console.groupEnd();
  }
}

function applyLoading(el: Element): void {
  el.setAttribute("gg-loading", "true");
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
    el.disabled = true;
  }
}

function clearLoading(el: Element): void {
  el.removeAttribute("gg-loading");
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
    el.disabled = false;
  }
}
