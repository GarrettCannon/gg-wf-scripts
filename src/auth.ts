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
      const role = await roleQuery(context, userId);
      if (role) {
        body.setAttribute(ATTR.role, role);
      } else {
        body.removeAttribute(ATTR.role);
      }
    }
  }

  const userId = await getUser();
  applyAuthAttrs(userId ?? null);

  if (onChange) {
    onChange((userId) => applyAuthAttrs(userId ?? null));
  }
}
