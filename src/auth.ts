export type AuthAdapter = {
  getUser: () => string | null | Promise<string | null>;
  onChange?: (cb: (userId: string | null) => void) => void;
  roleQuery?: (
    context: unknown,
    userId: string,
  ) => Promise<string | null> | string | null;
};

export async function initAuth(
  context: unknown,
  auth: AuthAdapter,
): Promise<void> {
  const { getUser, onChange, roleQuery } = auth;

  async function applyAuthAttrs(userId: string | null): Promise<void> {
    const body = document.body;
    if (!userId) {
      body.setAttribute("gg-auth", "false");
      body.removeAttribute("gg-role");
      return;
    }
    body.setAttribute("gg-auth", "true");
    if (roleQuery) {
      const role = await roleQuery(context, userId);
      if (role) {
        body.setAttribute("gg-role", role);
      } else {
        body.removeAttribute("gg-role");
      }
    }
  }

  const userId = await getUser();
  applyAuthAttrs(userId ?? null);

  if (onChange) {
    onChange((userId) => applyAuthAttrs(userId ?? null));
  }
}
