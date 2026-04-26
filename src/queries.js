export const queryRegistry = {};

/**
 * Register a data query for use with gg-data, gg-data-form, or gg-data-list.
 *
 * @param {string} id - The query identifier, referenced by gg-data="<id>" in markup.
 * @param {(sb: SupabaseClient) => Promise<object|object[]|null>} fn
 *   Return a single object (or null) for gg-data/gg-data-form, or an array for gg-data-list.
 */
export function registerQuery(id, fn) {
  queryRegistry[id] = fn;
}
