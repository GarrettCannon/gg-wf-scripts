/**
 * Wrap an async handler with optional debug logging and uniform throw handling.
 *
 * On success, returns the handler's resolved value. On throw, logs the error and
 * returns `undefined` so callers can branch on it.
 *
 * @param {string} prefix - Log prefix, e.g. "[gg-action]".
 * @param {string} id - Handler identifier shown in the log group.
 * @param {Record<string, any>} fields - Key/value pairs logged when debug is on.
 * @param {boolean} debug - Whether to emit grouped debug logs.
 * @param {() => Promise<any>} run - The handler invocation.
 */
export async function withDebugLog(prefix, id, fields, debug, run) {
  if (debug) {
    console.groupCollapsed(`${prefix} "${id}"`);
    for (const [key, value] of Object.entries(fields)) {
      console.log(`${key}:`, value);
    }
  }
  const startedAt = debug ? performance.now() : 0;
  try {
    const result = await run();
    if (debug) {
      const ms = (performance.now() - startedAt).toFixed(1);
      console.log(`result (${ms}ms):`, result);
    }
    return result;
  } catch (err) {
    console.error(`${prefix} "${id}" threw:`, err);
    return undefined;
  } finally {
    if (debug) console.groupEnd();
  }
}
