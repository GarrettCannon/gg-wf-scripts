import type { Query } from "./queries.js";
import type { Action } from "./actions.js";
import type { FormAction } from "./form-actions.js";
import { setQueryParams, removeQueryParams, initQueryParams } from "./query-params.js";
import { initAuth, type AuthAdapter } from "./auth.js";
import { initSwitchEngine } from "./switch-engine.js";
import { initDialog } from "./dialog.js";
import { initBridges } from "./bridges.js";
import { initFormVisibility } from "./form-visibility.js";
import { initDataEngine } from "./data-engine.js";
import { initActionEngine } from "./action-engine.js";
import { initFormActionEngine } from "./form-action-engine.js";
import { startDomObserver } from "./dom-observer.js";
import { createErrorBus, type ErrorHandler, type GgErrorEvent } from "./errors.js";

export { setQueryParams, removeQueryParams };
export { getPath } from "./helpers/path.js";
export type { AuthAdapter } from "./auth.js";
export type { Query } from "./queries.js";
export type { Action, ActionResult } from "./actions.js";
export type { FormAction, FormActionResult, FormFieldError } from "./form-actions.js";
export type { GgErrorEvent, ErrorHandler } from "./errors.js";

export type InitOptions<TContext = unknown> = {
  /**
   * Arbitrary object passed to every query and action. Put backend clients
   * (Supabase, fetch wrappers, etc.) or anything else your queries need on it.
   */
  context?: TContext;
  /**
   * Auth adapter. If omitted, gg-auth/gg-role attrs are never set.
   */
  auth?: AuthAdapter<TContext>;
  /**
   * When true, every query and action is logged to the console with its
   * trigger/container, data, result, and duration.
   */
  debug?: boolean;
  /**
   * When true (default), the App is exposed as `window.ggApp` and a
   * `gg-app-ready` CustomEvent is dispatched on `document`. Set to `false`
   * to opt out — useful for tests, multiple instances, or non-browser hosts.
   */
  expose?: boolean;
};

export type App<TContext = unknown> = {
  context: TContext;
  debug: boolean;
  queries: Record<string, Query<TContext>>;
  actions: Record<string, Action<TContext>>;
  formActions: Record<string, FormAction<TContext>>;

  /**
   * Register a query. Optionally pin the result type at the call site:
   * `app.addQuery<User[]>("users.list", ...)` for autocomplete on the
   * handler's return value.
   */
  addQuery: <TResult = unknown>(
    id: string,
    fn: Query<TContext, TResult>,
  ) => void;
  /**
   * Register an action. Optionally pin the data shape:
   * `app.addAction<{ id: string }>("posts.delete", ...)`.
   */
  addAction: <TData extends Record<string, unknown> = Record<string, unknown>>(
    id: string,
    fn: Action<TContext, TData>,
  ) => void;
  addFormAction: (id: string, fn: FormAction<TContext>) => void;

  /**
   * Subscribe to errors from any registered handler — including thrown
   * exceptions, missing-handler lookups, and `{ ok: false }` returns. Useful
   * for shipping errors to Sentry or similar. Returns an unsubscribe fn.
   */
  onError: (handler: ErrorHandler) => () => void;

  /**
   * Mount all engines. Idempotent only in the sense that calling start()
   * twice without dispose() will double-bind listeners — don't do that.
   */
  start: () => void;

  /**
   * Detach every listener and observer the library installed. Call from
   * SPA route changes, HMR teardown, or test cleanup. Handler registrations
   * are kept so you can call start() again on the same App.
   */
  dispose: () => void;
};

/**
 * Create a gg-scripts app instance.
 */
export function init<TContext = unknown>(
  {
    context = {} as TContext,
    auth,
    debug = false,
    expose = true,
  }: InitOptions<TContext> = {},
): App<TContext> {
  const queries: Record<string, Query<TContext>> = {};
  const actions: Record<string, Action<TContext>> = {};
  const formActions: Record<string, FormAction<TContext>> = {};
  const errorBus = createErrorBus();

  let cleanups: Array<() => void> = [];

  const app: App<TContext> = {
    context,
    debug,
    queries,
    actions,
    formActions,
    addQuery: (id, fn) => {
      queries[id] = fn as Query<TContext>;
    },
    addAction: (id, fn) => {
      actions[id] = fn as Action<TContext>;
    },
    addFormAction: (id, fn) => {
      formActions[id] = fn;
    },
    onError: (handler) => errorBus.subscribe(handler),
    start() {
      function run() {
        const core = {
          context,
          debug,
          emitError: (event: GgErrorEvent) => errorBus.emit(event),
        };

        if (auth) initAuth(context, auth);
        cleanups.push(startDomObserver());
        cleanups.push(initSwitchEngine());
        cleanups.push(initQueryParams());
        cleanups.push(initDialog());
        cleanups.push(initBridges());
        cleanups.push(initFormVisibility());
        cleanups.push(initDataEngine({ ...core, queries }));
        cleanups.push(initActionEngine({ ...core, actions }));
        cleanups.push(initFormActionEngine({ ...core, formActions }));
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", run);
      } else {
        run();
      }
    },
    dispose() {
      cleanups.forEach((c) => c());
      cleanups = [];
    },
  };

  if (expose && typeof window !== "undefined") {
    if (window.ggApp) {
      console.warn(
        "[gg] window.ggApp is being replaced by a new init() call",
      );
    }
    window.ggApp = app as App<unknown>;
    document.dispatchEvent(
      new CustomEvent("gg-app-ready", { detail: { app } }),
    );
  }

  return app;
}
