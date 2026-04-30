/**
 * Run a registered handler with debug logging and errors-as-values.
 *
 * Catches throws so engine code can branch on a result instead of try/catch.
 * On success, returns { ok: true, value } where value is whatever the handler
 * returned. On throw, returns { ok: false, error } and logs the error.
 *
 * @param {object} opts
 * @param {string} opts.prefix - Log prefix, e.g. "[gg-action]".
 * @param {string} opts.id - Handler identifier shown in the log group.
 * @param {Record<string, any>} opts.fields - Key/value pairs logged when debug is on.
 * @param {boolean} opts.debug - Whether to emit grouped debug logs.
 * @param {() => Promise<any>} fn - The handler invocation.
 * @returns {Promise<{ ok: true, value: any } | { ok: false, error: unknown }>}
 */
export async function runHandler({ prefix, id, fields, debug }, fn) {
  if (debug) {
    console.groupCollapsed(`${prefix} "${id}"`);
    for (const [key, value] of Object.entries(fields)) {
      console.log(`${key}:`, value);
    }
  }
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
    return { ok: false, error };
  } finally {
    if (debug) console.groupEnd();
  }
}
