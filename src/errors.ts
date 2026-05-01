/**
 * Emitted whenever a registered query, action, or form action throws — and
 * for non-throwing failure modes the engines detect (missing handler, wrong
 * return shape). Subscribe via `app.onError(handler)` to forward to Sentry,
 * Datadog, or any other error tracker.
 */
export type GgErrorEvent = {
  /** Engine label, e.g. "[gg-action]", "[gg-data]", "[gg-form-action]". */
  prefix: string;
  /** Handler id (the value of the gg-action / gg-data / gg-form-action attr). */
  id: string;
  /** The thrown error or a string describing the non-throw failure. */
  error: unknown;
  /** Engine-specific context: trigger element, form, params, etc. */
  fields?: Record<string, unknown>;
};

export type ErrorHandler = (event: GgErrorEvent) => void;

/**
 * Internal helper that owns the subscriber list. Lives on the App instance.
 */
export function createErrorBus(): {
  subscribe: (handler: ErrorHandler) => () => void;
  emit: (event: GgErrorEvent) => void;
  clear: () => void;
} {
  const handlers: ErrorHandler[] = [];
  return {
    subscribe(handler) {
      handlers.push(handler);
      return () => {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      };
    },
    emit(event) {
      handlers.forEach((h) => {
        try {
          h(event);
        } catch (err) {
          console.error("[gg] onError handler threw:", err);
        }
      });
    },
    clear() {
      handlers.length = 0;
    },
  };
}
