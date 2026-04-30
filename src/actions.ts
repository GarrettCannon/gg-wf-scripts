export type ActionResult = { ok: boolean; error?: unknown };

export type Action = (
  context: unknown,
  data: Record<string, unknown>,
  params: URLSearchParams,
) => Promise<ActionResult | void> | ActionResult | void;

export const actionRegistry: Record<string, Action> = {};

/**
 * Register an action triggered by gg-action="<id>" on click.
 *
 * Receives the context object passed to init(), a data object (merged from the nearest
 * gg-data record and any explicit gg-action-data attribute), and a URLSearchParams
 * snapshot of the current URL query string. Return { ok: true } or { ok: false, error }.
 */
export function registerAction(id: string, fn: Action): void {
  actionRegistry[id] = fn;
}
