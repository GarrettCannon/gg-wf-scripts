import { registerQuery } from "./queries.js";
import { registerAction } from "./actions.js";
import { registerFormAction } from "./form-actions.js";
import { setSwitchState, applySwitchState, populateFields } from "./helpers/dom.js";
import { setQueryParams, removeQueryParams, initQueryParams } from "./query-params.js";
import { initAuth, type AuthAdapter } from "./auth.js";
import { initSwitchEngine } from "./switch-engine.js";
import { initDialog } from "./dialog.js";
import { initBridges } from "./bridges.js";
import { initFormVisibility } from "./form-visibility.js";
import { initDataEngine } from "./data-engine.js";
import { initActionEngine } from "./action-engine.js";
import { initFormActionEngine } from "./form-action-engine.js";

export { setSwitchState, applySwitchState, populateFields, setQueryParams, removeQueryParams };
export { getPath } from "./helpers/path.js";
export type { AuthAdapter } from "./auth.js";
export type { Query } from "./queries.js";
export type { Action, ActionResult } from "./actions.js";
export type { FormAction, FormActionResult, FormFieldError } from "./form-actions.js";

export type InitOptions = {
  /**
   * Arbitrary object passed to every query and action. Put backend clients
   * (Supabase, fetch wrappers, etc.) or anything else your queries need on it.
   */
  context?: unknown;
  /**
   * Auth adapter. If omitted, gg-auth/gg-role attrs are never set.
   */
  auth?: AuthAdapter;
  /**
   * When true, every query and action is logged to the console with its
   * trigger/container, data, result, and duration.
   */
  debug?: boolean;
};

/**
 * Create a gg-scripts app instance.
 */
export function init({ context = {}, auth, debug = false }: InitOptions = {}) {
  return {
    addQuery: registerQuery,
    addAction: registerAction,
    addFormAction: registerFormAction,
    start() {
      function run() {
        if (auth) initAuth(context, auth);
        initSwitchEngine();
        initQueryParams();
        initDialog();
        initBridges();
        initFormVisibility();
        initDataEngine(context, { debug });
        initActionEngine(context, { debug });
        initFormActionEngine(context, { debug });
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", run);
      } else {
        run();
      }
    },
  };
}
