type RunHandlerOptions = {
  prefix: string;
  id: string;
  fields: Record<string, unknown>;
  debug: boolean;
};

export type RunHandlerResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

/**
 * Run a registered handler with debug logging and errors-as-values.
 *
 * Catches throws so engine code can branch on a result instead of try/catch.
 * On success, returns { ok: true, value } where value is whatever the handler
 * returned. On throw, returns { ok: false, error } and logs the error.
 */
export async function runHandler<T>(
  { prefix, id, fields, debug }: RunHandlerOptions,
  fn: () => Promise<T> | T,
): Promise<RunHandlerResult<T>> {
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
