import type { Query, RegisteredQuery } from "./queries.js";
import type { Action, ActionResult } from "./actions.js";
import type { FormAction } from "./form-actions.js";
import { setQueryParams, removeQueryParams, initQueryParams } from "./query-params.js";
import { executeQuery } from "./data-engine.js";
import { executeAction } from "./action-engine.js";
import { initAuth, type AuthAdapter } from "./auth.js";
import { initAuthEngine } from "./auth-engine.js";
import { initSwitchEngine } from "./switch-engine.js";
import { initDialog } from "./dialog.js";
import { initBridges } from "./bridges.js";
import { initFormVisibility } from "./form-visibility.js";
import { initDataEngine } from "./data-engine.js";
import { initActionEngine } from "./action-engine.js";
import { initFormActionEngine } from "./form-action-engine.js";
import { startDomObserver } from "./dom-observer.js";
import { setTransitionConfig } from "./helpers/visibility.js";
import type { Easing } from "motion";
import { createErrorBus, type ErrorHandler, type GgErrorEvent } from "./errors.js";

export { setQueryParams, removeQueryParams };
export { getPath } from "./helpers/path.js";
export type { AuthAdapter } from "./auth.js";
export type { Query, RegisteredQuery } from "./queries.js";
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
  /**
   * Global fade-in/out for every show/hide the library performs (auth, switch
   * cases, form-visibility, data list items). Omit or set duration to 0 for
   * instant toggles (default). `duration` is in milliseconds. `easing` accepts
   * Motion's keyword set ("easeInOut", "easeIn", "circOut", "anticipate", …)
   * or a `[x1,y1,x2,y2]` cubic-bezier tuple. `prefers-reduced-motion: reduce`
   * always forces instant.
   */
  transition?: { duration?: number; easing?: Easing };
};

export type App<TContext = unknown> = {
  context: TContext;
  debug: boolean;
  queries: Record<string, RegisteredQuery<TContext>>;
  actions: Record<string, Action<TContext>>;
  formActions: Record<string, FormAction<TContext>>;

  addQuery: <TResult = unknown>(
    id: string,
    fn: Query<TContext, TResult>,
    opts?: { on?: string[] },
  ) => void;
  addAction: <TData extends Record<string, unknown> = Record<string, unknown>>(
    id: string,
    fn: Action<TContext, TData>,
  ) => void;
  addFormAction: (id: string, fn: FormAction<TContext>) => void;

  runQuery: <TResult = unknown>(id: string) => Promise<TResult>;

  runAction: <TData extends Record<string, unknown> = Record<string, unknown>>(
    id: string,
    data?: TData,
  ) => Promise<ActionResult>;

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
    transition,
  }: InitOptions<TContext> = {},
): App<TContext> {
  if (transition) setTransitionConfig(transition);
  const queries: Record<string, RegisteredQuery<TContext>> = {};
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
    addQuery: (id, fn, opts) => {
      queries[id] = { handler: fn as Query<TContext>, on: opts?.on };
    },
    addAction: (id, fn) => {
      actions[id] = fn as Action<TContext>;
    },
    addFormAction: (id, fn) => {
      formActions[id] = fn;
    },
    runQuery: async <TResult = unknown>(id: string): Promise<TResult> => {
      const result = await executeQuery(id, {
        context,
        debug,
        queries,
        emitError: (e) => errorBus.emit(e),
      });
      if (!result.ok) throw result.error;
      return result.value as TResult;
    },
    runAction: <
      TData extends Record<string, unknown> = Record<string, unknown>,
    >(
      id: string,
      data: TData = {} as TData,
    ): Promise<ActionResult> =>
      executeAction(id, data, {
        context,
        debug,
        actions,
        emitError: (e) => errorBus.emit(e),
      }),
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
        cleanups.push(initAuthEngine());
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
