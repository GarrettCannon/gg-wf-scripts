import { ATTR } from "./attrs.js";

export type AuthAdapter<TContext = unknown> = {
  getUser: () => string | null | Promise<string | null>;
  onChange?: (cb: (userId: string | null) => void) => void;
  roleQuery?: (
    context: TContext,
    userId: string,
  ) => Promise<string | null> | string | null;
};

export async function initAuth<TContext>(
  context: TContext,
  auth: AuthAdapter<TContext>,
  debug = false,
): Promise<void> {
  const { getUser, onChange, roleQuery } = auth;
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
      return;
    }
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

  let userId: string | null = null;
  try {
    log("getUser started");
    userId = (await getUser()) ?? null;
    log("getUser →", userId);
  } catch (err) {
    log("getUser threw:", err);
    userId = null;
  }
  applyAuthAttrs(userId, "initial");

  if (onChange) {
    log("subscribing to onChange");
    onChange((userId) => applyAuthAttrs(userId ?? null, "onChange"));
  } else {
    log("no onChange adapter — gg-auth won't update on later sign-in/out");
  }
}
