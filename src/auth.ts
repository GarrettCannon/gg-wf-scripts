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
): Promise<void> {
  const { getUser, onChange, roleQuery } = auth;

  async function applyAuthAttrs(userId: string | null): Promise<void> {
    const body = document.body;
    if (!userId) {
      body.setAttribute(ATTR.auth, "false");
      body.removeAttribute(ATTR.role);
      return;
    }
    body.setAttribute(ATTR.auth, "true");
    if (roleQuery) {
      let role: string | null = null;
      try {
        role = await roleQuery(context, userId);
      } catch {
        role = null;
      }
      if (role) {
        body.setAttribute(ATTR.role, role);
      } else {
        body.removeAttribute(ATTR.role);
      }
    }
  }

  let userId: string | null = null;
  try {
    userId = (await getUser()) ?? null;
  } catch {
    userId = null;
  }
  applyAuthAttrs(userId);

  if (onChange) {
    onChange((userId) => applyAuthAttrs(userId ?? null));
  }
}
