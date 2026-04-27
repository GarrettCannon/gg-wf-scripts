import { registerQuery } from "./queries.js";
import { registerAction } from "./actions.js";
import { registerFormAction } from "./form-actions.js";
import { setSwitchState, applySwitchState, populateFields } from "./helpers/dom.js";
import { setQueryParams, removeQueryParams, initQueryParams } from "./query-params.js";
import { initAuth } from "./auth.js";
import { initSwitchEngine } from "./switch-engine.js";
import { initDialog } from "./dialog.js";
import { initBridges } from "./bridges.js";
import { initFormVisibility } from "./form-visibility.js";
import { initDataEngine } from "./data-engine.js";
import { initActionEngine } from "./action-engine.js";
import { initFormActionEngine } from "./form-action-engine.js";

export { setSwitchState, applySwitchState, populateFields, setQueryParams, removeQueryParams };
export { getPath } from "./helpers/path.js";

/**
 * Create a gg-scripts app instance.
 *
 * @param {object} [options]
 * @param {object} [options.context] - Arbitrary object passed to every query and action.
 *   Put backend clients (Supabase, fetch wrappers, etc.) or anything else your queries need on it.
 * @param {object} [options.auth] - Auth adapter. If omitted, gg-auth/gg-role attrs are never set.
 * @param {() => (string|null) | Promise<string|null>} options.auth.getUser
 *   Returns the current user id, or null when signed out.
 * @param {(cb: (userId: string|null) => void) => void} [options.auth.onChange]
 *   Subscribe to auth changes. Called with the new user id (or null) whenever it changes.
 * @param {(context: object, userId: string) => Promise<string|null>} [options.auth.roleQuery]
 *   Returns the user's role string for gg-role gating. If omitted, gg-role is never set.
 * @param {boolean} [options.debug=false] - When true, every query and action is logged to the
 *   console with its trigger/container, data, result, and duration.
 * @returns {{ addQuery: function, addAction: function, start: function }}
 */
export function init({ context = {}, auth, debug = false } = {}) {
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
