# `init(options)`

Returns an app instance with `addQuery`, `addAction`, `addFormAction`, and `start` methods.

```js
import { init } from "gg-wf-scripts";

const app = init({
  context: { sb },
  auth: { /* see Auth adapter below */ },
  debug: false,
});
```

## Options

| Option | Type | Required | Description |
|---|---|---|---|
| `context` | `object` | No | Arbitrary object passed to every query and action. Put backend clients or anything else your handlers need on it. Defaults to `{}`. |
| `auth` | `object` | No | Auth adapter (see below). If omitted, `gg-auth` / `gg-role` attrs are never set. |
| `debug` | `boolean` | No | When `true`, every query and action is logged to the console (trigger/container, data, result, duration). Defaults to `false`. |

## Auth adapter

| Option | Type | Description |
|---|---|---|
| `auth.getUser` | `() => string \| null \| Promise<string \| null>` | Returns the current user id, or `null` when signed out. Called once on start. |
| `auth.onChange` | `(cb: (userId: string \| null) => void) => void` | Subscribe to auth changes. Optional but recommended — without it, `gg-auth` won't update on sign-in/out. |
| `auth.roleQuery` | `async (context, userId) => string \| null` | Returns the user's role string. Called on every auth change. If omitted, `gg-role` is never set. |

See [Auth and roles](/attributes/auth) for a full Supabase example.

## `app.start()`

Initializes all engines and starts listening for DOM events. Call this **after** registering all queries and actions.

```js
app.addQuery(/* ... */);
app.addAction(/* ... */);
app.addFormAction(/* ... */);
app.start();
```
