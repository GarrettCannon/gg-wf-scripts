# `init(options)`

Returns an app instance with `addQuery`, `addAction`, `addFormAction`, `onError`, `start`, and `dispose` methods.

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

Engines also pick up elements inserted **after** `start()` — Webflow IX-driven content, CMS templates, or anything appended at runtime — via a shared `MutationObserver`. You don't need to re-run `start()`.

## `app.onError(handler)`

Subscribe to handler failures. Fires when:

- A registered query, action, or form action throws.
- The DOM references a handler id that wasn't registered.
- A handler returns `{ ok: false, error }` (or `{ ok: false, field_errors }` for form actions).

```js
app.onError(({ prefix, id, error }) => {
  Sentry.captureException(error, { tags: { handler: `${prefix} ${id}` } });
});
```

The handler receives a `GgErrorEvent`:

| Field | Type | Description |
|---|---|---|
| `prefix` | `string` | Engine label, e.g. `"[gg-action]"`, `"[gg-data]"`, `"[gg-form-action]"`. |
| `id` | `string` | Handler id (the value of the `gg-action` / `gg-data` / `gg-form-action` attribute). |
| `error` | `unknown` | The thrown value, or a string describing the non-throw failure. |
| `fields` | `object` | Engine-specific context: trigger element, form, params, data. |

Returns an unsubscribe function.

## `app.dispose()`

Detaches every listener and observer the library installed. Call from SPA route changes, HMR teardown, or test cleanup. Handler registrations are kept, so you can call `start()` again on the same app.

```js
const app = init({ context });
app.addQuery(/* ... */);
app.start();

// later, e.g. on route change
app.dispose();
```
