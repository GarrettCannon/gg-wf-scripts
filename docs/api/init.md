# `init(options)`

Returns an app instance with `addQuery`, `addAction`, `addFormAction`, `runQuery`, `runAction`, `onError`, `start`, and `dispose` methods.

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
| `expose` | `boolean` | No | When `true` (default), the app is exposed as `window.ggApp` and a `gg-app-ready` CustomEvent is dispatched on `document`. Set to `false` for tests, multiple instances, or non-browser hosts. |
| `transition` | `object` | No | Global fade-in/out for every show/hide the library performs. See [Transitions](#transitions) below. Omit for instant toggles (default). |

## Transitions

Every show/hide the library performs — `gg-auth` / `gg-role` gating, `gg-switch-state` cases, `gg-visible-when` form fields, and freshly-rendered `gg-data-list` rows — runs through a single visibility helper. By default it's an instant `display:none` toggle (matching pre-6.0 behavior). Pass a `transition` to fade them instead.

```js
init({
  transition: { duration: 200, easing: "easeInOut" },
});
```

| Field | Type | Description |
|---|---|---|
| `duration` | `number` | Fade duration in **milliseconds**. Defaults to `0` (instant). |
| `easing` | `Easing` | Motion's easing keyword set: `"linear"`, `"easeIn"`, `"easeOut"`, `"easeInOut"` (default), `"circIn"` / `"circOut"` / `"circInOut"`, `"backIn"` / `"backOut"` / `"backInOut"`, `"anticipate"`. Or a `[x1, y1, x2, y2]` cubic-bezier tuple. |

The system honors `prefers-reduced-motion: reduce` — animations are skipped automatically when the OS setting is on, regardless of `duration`.

Hidden elements also get `inert` and `aria-hidden="true"` so they're removed from the tab order and from screen readers — this happens whether or not `transition` is configured.

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

## `app.runQuery(id)`

Run a registered query imperatively. Useful from custom code (React islands, web components) that wants to reuse a handler the `gg-data*` engine already runs. Goes through the same logging and error path: debug logs fire when `init({ debug: true })` was passed, and any throw is reported via `app.onError` before being re-thrown to the caller.

```js
const posts = await app.runQuery("posts_list");
```

Reads the current URL's `URLSearchParams`, same as the engine. To run with different params, call `setQueryParams(...)` first. The escape hatch `app.queries[id].handler(app.context, params)` calls the raw handler with no logging or error routing.

## `app.runAction(id, data?)`

Run a registered action imperatively. Same logging and error path as the `gg-action` engine — debug logs fire, throws are caught, and `{ ok: false }` returns are routed through `app.onError` (matching what happens when the engine fires the action via a click).

```js
const result = await app.runAction("delete_post", { id: "abc" });
if (!result.ok) {
  // result.error is whatever the handler returned/threw
}
```

Returns `{ ok: boolean, error? }`. URL params are read the same way as the engine; pass `data` for the second action argument.

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
