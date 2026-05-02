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

## Avoiding flash on load

Visibility is applied by JS once `init()` runs, so an element may briefly render in its default state before being hidden. To avoid the flash, hide them in CSS until auth is ready:

```css
[gg-auth], [gg-role] { display: none; }
```

The library will set `display: ""` on elements that match, letting your stylesheet's natural display take over.
