import { ATTR } from "./attrs.js";

const GET_USER_TIMEOUT_MS = 10_000;

function isWebflowStaging(): boolean {
  return window.location.hostname.endsWith(".webflow.io");
}

function shouldRedirect(target: string | undefined): string | null {
  if (!target) return null;
  let url: URL;
  try {
    url = new URL(target, window.location.origin);
  } catch {
    return null;
  }
  if (url.pathname === window.location.pathname) return null;
  return url.toString();
}

function checkPageGate(
  signedOutRedirect: string | undefined,
  unauthorizedRedirect: string | undefined,
  log: (...args: unknown[]) => void,
): void {
  if (isWebflowStaging()) {
    log("page gate skipped on webflow.io staging");
    return;
  }

  const body = document.body;
  const pageAuth = body.getAttribute(ATTR.pageAuth);
  const pageRole = (body.getAttribute(ATTR.pageRole) ?? "").trim();
  const isAuthed = body.getAttribute(ATTR.auth) === "true";
  const currentRole = body.getAttribute(ATTR.role);

  const requiresAuth = pageAuth === "true" || pageRole !== "";
  if (!requiresAuth) return;

  if (!isAuthed) {
    const target = shouldRedirect(signedOutRedirect);
    if (!target) {
      log(
        signedOutRedirect
          ? `signed-out gate matched but already on ${signedOutRedirect}`
          : "signed-out gate matched but no signedOutRedirect configured",
      );
      return;
    }
    log(`signed-out gate → redirecting to ${target}`);
    window.location.href = target;
    return;
  }

  if (pageRole !== "") {
    const allowed = pageRole
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    if (!currentRole || !allowed.includes(currentRole)) {
      const target = shouldRedirect(
        unauthorizedRedirect ?? signedOutRedirect,
      );
      if (!target) {
        log(
          "role gate matched but no unauthorizedRedirect/signedOutRedirect configured (or already there)",
        );
        return;
      }
      log(
        `role gate (need ${pageRole}, have ${currentRole ?? "none"}) → redirecting to ${target}`,
      );
      window.location.href = target;
    }
  }
}

export type AuthAdapter<TContext = unknown> = {
  getUser: () => string | null | Promise<string | null>;
  onChange?: (cb: (userId: string | null) => void) => void;
  roleQuery?: (
    context: TContext,
    userId: string,
  ) => Promise<string | null> | string | null;
  /**
   * URL to send the user to when a `gg-page-auth="true"` (or `gg-page-role`)
   * page sees no signed-in user — either on initial load or after sign-out.
   * Skipped when the current pathname already matches the target's pathname,
   * so the login page itself won't redirect-loop.
   */
  signedOutRedirect?: string;
  /**
   * URL to send the user to when a `gg-page-role` page sees a signed-in user
   * whose role doesn't match. Falls back to `signedOutRedirect` if unset.
   */
  unauthorizedRedirect?: string;
};

export async function initAuth<TContext>(
  context: TContext,
  auth: AuthAdapter<TContext>,
  debug = false,
): Promise<void> {
  const { getUser, onChange, roleQuery, signedOutRedirect, unauthorizedRedirect } = auth;
  const log = debug
    ? (...args: unknown[]) => console.log("[gg-auth]", ...args)
    : () => {};

  async function applyAuthAttrs(
    userId: string | null,
    source: string,
  ): Promise<void> {
    const body = document.body;
    log(`applyAuthAttrs (${source}) userId=`, userId);
    if (!userId) {
      body.setAttribute(ATTR.auth, "false");
      body.removeAttribute(ATTR.role);
      log("body set to signed-out: gg-auth=false, gg-role removed");
    } else {
      body.setAttribute(ATTR.auth, "true");
      if (roleQuery) {
        let role: string | null = null;
        try {
          log("roleQuery started");
          role = await roleQuery(context, userId);
          log("roleQuery →", role);
        } catch (err) {
          log("roleQuery threw:", err);
          role = null;
        }
        if (role) {
          body.setAttribute(ATTR.role, role);
          log(`body: gg-auth=true, gg-role=${role}`);
        } else {
          body.removeAttribute(ATTR.role);
          log("body: gg-auth=true, gg-role removed");
        }
      } else {
        log("body: gg-auth=true (no roleQuery configured)");
      }
    }
    checkPageGate(signedOutRedirect, unauthorizedRedirect, log);
  }

  let userId: string | null = null;
  try {
    log("getUser started");
    // Race against a timeout — a buggy adapter (e.g. Supabase getUser() with an
    // unrecoverable refresh token) can hang forever and leave the body in an
    // undefined auth state.
    userId = await Promise.race([
      Promise.resolve(getUser()).then((v) => v ?? null),
      new Promise<null>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`getUser timed out after ${GET_USER_TIMEOUT_MS}ms`),
            ),
          GET_USER_TIMEOUT_MS,
        ),
      ),
    ]);
    log("getUser →", userId);
  } catch (err) {
    log("getUser threw:", err);
    userId = null;
  }
  applyAuthAttrs(userId, "initial");

  if (onChange) {
    log("subscribing to onChange");
    onChange((userId) => {
      // Defer out of the caller's stack frame: Supabase's onAuthStateChange
      // fires while holding an internal auth lock, and any sb.from(...) inside
      // roleQuery needs that same lock — awaiting synchronously deadlocks.
      // Microtasks aren't enough; the lock is released after the current task.
      setTimeout(() => applyAuthAttrs(userId ?? null, "onChange"), 0);
    });
  } else {
    log("no onChange adapter — gg-auth won't update on later sign-in/out");
  }
}
