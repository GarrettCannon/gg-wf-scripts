export const actionRegistry = {};

/**
 * Register an action triggered by gg-action="<id>" on click.
 *
 * @param {string} id - The action identifier, referenced by gg-action="<id>" in markup.
 * @param {(context: object, data: object, params: URLSearchParams) => Promise<{ok: boolean, error?: any}>} fn
 *   Receives the context object passed to init(), a data object (merged from the nearest
 *   gg-data record and any explicit gg-action-data attribute), and a URLSearchParams snapshot
 *   of the current URL query string. Return { ok: true } or { ok: false, error }.
 */
export function registerAction(id, fn) {
  actionRegistry[id] = fn;
}
