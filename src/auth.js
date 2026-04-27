export async function initAuth(context, auth) {
  const { getUser, onChange, roleQuery } = auth;

  async function applyAuthAttrs(userId) {
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
