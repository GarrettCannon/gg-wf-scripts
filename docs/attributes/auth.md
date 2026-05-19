# Auth and roles

Show or hide elements based on auth state. You provide the auth adapter, so any backend works.

## Markup

```html
<a href="/login" gg-auth="false">Log in</a>
<a href="/account" gg-auth="true">My account</a>
<a href="/admin" gg-role="superuser">Admin panel</a>
<a href="/dashboard" gg-role="admin,editor">Dashboard</a>
```

`gg-auth` is set on `<body>` as `"true"` or `"false"`. `gg-role` is set if you provide a `roleQuery`. Any element with a `gg-auth` or `gg-role` attribute is hidden via inline `display: none` when its value doesn't match the body. Use commas on `gg-role` to match any of several roles.

## Adapter

You configure auth via the `auth` option on `init()`:

| Option | Type | Description |
|---|---|---|
| `auth.getUser` | `() => string \| null \| Promise<string \| null>` | Returns the current user id, or `null` when signed out. Called once on start. |
| `auth.onChange` | `(cb: (userId: string \| null) => void) => void` | Subscribe to auth changes. Optional but recommended — without it, `gg-auth` won't update on sign-in/out. |
| `auth.roleQuery` | `async (context, userId) => string \| null` | Returns the user's role string. Called on every auth change. If omitted, `gg-role` is never set. |
| `auth.signedOutRedirect` | `string` | URL to send the user to when a page-gated page (see below) sees no signed-in user. Skipped on `*.webflow.io` and when the current pathname already matches the target. |
| `auth.unauthorizedRedirect` | `string` | URL to send the user to when a `gg-page-role` page sees a signed-in user whose role doesn't match. Falls back to `signedOutRedirect` if unset. |

If `getUser` rejects or hangs (e.g. an expired Supabase session that can't refresh on a stale tab — `sb.auth.getUser()` can hang indefinitely when the refresh token is unrecoverable), the body is set to the signed-out state (`gg-auth="false"`, `gg-role` removed) instead of being left in an undefined state. `getUser` is raced against a 10s timeout for this reason. `onChange` is still wired up, so a later sign-in event can recover. A failing `roleQuery` similarly clears `gg-role` but leaves `gg-auth="true"`.

The library defers its handling of `onChange` callbacks onto a fresh task (via `setTimeout(..., 0)`), so adapters can invoke `cb` from any call site without worrying about reentrancy. In particular, this is what makes `sb.auth.onAuthStateChange` safe to use directly: that listener fires while Supabase holds an internal auth lock, and `roleQuery` would deadlock if it ran synchronously inside it. Adapter authors don't need to schedule `cb` themselves.

## Example: Supabase

```js
import { createClient } from "@supabase/supabase-js";
import { init } from "gg-wf-scripts";

const sb = createClient("...", "...");

const app = init({
  context: { sb },
  auth: {
    getUser: async () => (await sb.auth.getUser()).data.user?.id ?? null,
    onChange: (cb) =>
      sb.auth.onAuthStateChange((_e, session) => cb(session?.user?.id ?? null)),
    roleQuery: async ({ sb }, userId) => {
      const { data } = await sb
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();
      return data?.role ?? null;
    },
  },
});
```

## Gating a whole page

Put `gg-page-auth="true"` or `gg-page-role="admin,editor"` on `<body>` to require auth (or a specific role) for the entire page. When the gate doesn't pass, the library navigates to the configured redirect:

```html
<body gg-page-auth="true">          <!-- signed-in users only -->
<body gg-page-role="admin,editor">  <!-- signed-in AND role matches -->
```

```js
init({
  auth: {
    getUser: ...,
    onChange: ...,
    roleQuery: ...,
    signedOutRedirect: "/login",
    unauthorizedRedirect: "/403",  // optional; falls back to signedOutRedirect
  },
});
```

The gate runs on initial load and on every `onChange` event, so the same mechanism handles direct landings on a gated page *and* loss of auth while the user is on one. Role checks wait for `roleQuery` to resolve before deciding.

**Loop guard:** the redirect is skipped when `window.location.pathname` already matches the target's pathname, so the login page itself won't redirect to itself even if it sets `gg-page-auth`.

**Webflow staging:** on `*.webflow.io` the gate is a no-op so you can preview gated pages in the Webflow Designer without being kicked to login. Set `gg-auth`/`gg-role` on the body manually in the Designer if you need to preview the signed-in state.

**Avoiding the flash:** the gate runs after JS starts, so the page is briefly visible before the redirect. To hide the page until auth resolves, gate the body in CSS:

```css
body[gg-page-auth]:not([gg-auth]),
body[gg-page-role]:not([gg-role]) { visibility: hidden; }
```

## Avoiding flash on load

Visibility is applied by JS once `init()` runs, so an element may briefly render in its default state before being hidden. To avoid the flash, hide them in CSS until auth is ready:

```css
[gg-auth], [gg-role] { display: none; }
```

The library will set `display: ""` on elements that match, letting your stylesheet's natural display take over.
