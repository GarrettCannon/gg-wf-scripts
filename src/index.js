import { createClient } from "@supabase/supabase-js";
import { registerQuery } from "./queries.js";
import { registerAction } from "./actions.js";
import { setSwitchState, applySwitchState, populateFields } from "./helpers/dom.js";
import { setQueryParams, removeQueryParams, initQueryParams } from "./query-params.js";
import { initAuth } from "./auth.js";
import { initSwitchEngine } from "./switch-engine.js";
import { initDialog } from "./dialog.js";
import { initBridges } from "./bridges.js";
import { initFormVisibility } from "./form-visibility.js";
import { initDataEngine } from "./data-engine.js";
import { initActionEngine } from "./action-engine.js";

export { setSwitchState, applySwitchState, populateFields, setQueryParams, removeQueryParams };
export { getPath } from "./helpers/path.js";

/**
 * Create a gg-scripts app instance.
 *
 * @param {object} options
 * @param {string} options.supabaseUrl - Your Supabase project URL.
 * @param {string} options.supabaseKey - Your Supabase publishable (anon) key.
 * @param {object} [options.auth] - Auth configuration.
 * @param {(sb: SupabaseClient, userId: string) => Promise<string|null>} [options.auth.roleQuery]
 *   Returns the user's role string for gg-role gating. If omitted, gg-role is never set.
 * @returns {{ addQuery: function, addAction: function, start: function }}
 */
export function init({ supabaseUrl, supabaseKey, auth }) {
  return {
    addQuery: registerQuery,
    addAction: registerAction,
    start() {
      function run() {
        const sb = createClient(supabaseUrl, supabaseKey);
        initAuth(sb, auth?.roleQuery);
        initSwitchEngine();
        initQueryParams();
        initDialog();
        initBridges();
        initFormVisibility();
        initDataEngine(sb);
        initActionEngine(sb);
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", run);
      } else {
        run();
      }
    },
  };
}
