export type Query = (
  context: unknown,
  params: URLSearchParams,
) => Promise<unknown> | unknown;

export const queryRegistry: Record<string, Query> = {};

/**
 * Register a data query for use with gg-data, gg-data-form, or gg-data-list.
 *
 * Receives the context object passed to init() and a URLSearchParams snapshot of the
 * current URL query string. Return a single object (or null) for gg-data/gg-data-form,
 * or an array for gg-data-list.
 */
export function registerQuery(id: string, fn: Query): void {
  queryRegistry[id] = fn;
}
