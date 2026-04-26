export async function initAuth(sb, roleQuery) {
  async function applyAuthAttrs(userId) {
    const body = document.body;
    if (!userId) {
      body.setAttribute("gg-auth", "false");
      body.removeAttribute("gg-role");
      return;
    }
    body.setAttribute("gg-auth", "true");
    if (roleQuery) {
      const role = await roleQuery(sb, userId);
      if (role) {
        body.setAttribute("gg-role", role);
      } else {
        body.removeAttribute("gg-role");
      }
    }
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  applyAuthAttrs(user?.id ?? null);

  sb.auth.onAuthStateChange((_event, session) => {
    applyAuthAttrs(session?.user?.id ?? null);
  });
}
