# gg-wf-scripts

A declarative attribute engine for Webflow sites. Add `gg-*` attributes to your markup and the library handles data binding, URL-driven state, dialogs, auth gating, form visibility, and user actions. Backend-agnostic — bring your own client (Supabase, fetch, anything).

## Install

```
npm install gg-scripts
```

## Quick start

Create a site-specific entry file, register your queries and actions, then bundle it with esbuild.

```js
import { init } from "gg-wf-scripts";
import { createClient } from "@supabase/supabase-js";

const sb = createClient("https://your-project.supabase.co", "your-publishable-key");

const app = init({
  context: { sb },
  auth: {
    getUser: async () => (await sb.auth.getUser()).data.user?.id ?? null,
    onChange: (cb) => sb.auth.onAuthStateChange((_e, session) => cb(session?.user?.id ?? null)),
  },
});

app.addQuery("posts_list", async ({ sb }) => {
  const { data } = await sb
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
});

app.addAction("delete_post", async ({ sb }, { id }) => {
  const { error } = await sb.from("posts").delete().eq("id", id);
  return error ? { ok: false, error } : { ok: true };
});

app.start();
```

Bundle with esbuild:

```
npx esbuild src/index.js --bundle --outfile=dist/site.js --format=iife --target=es2020 --platform=browser
```

Load on your site:

```html
<script src="https://your-cdn.com/site.js"></script>
```

## Attributes

### Data binding

Display data from your queries in the DOM.

```html
<!-- Single record: populates [gg-field] descendants -->
<div gg-data="post_by_id">
  <h1 gg-field="title">Loading...</h1>
  <p gg-field="body"></p>
</div>

<!-- Form pre-fill: sets value/checked on named inputs -->
<form gg-data-form="post_by_id">
  <input name="title" />
  <textarea name="body"></textarea>
</form>

<!-- List: clones the template for each record -->
<ul gg-data-list="posts_list">
  <li gg-list-template>
    <h3 gg-field="title"></h3>
    <span gg-field="author.name"></span>
  </li>
</ul>
```

`gg-field` supports dot-paths for nested data (e.g. `author.name`).

#### Re-running on URL changes

Add `gg-data-on` to re-run a query when specific URL params change:

```html
<div gg-data="post_by_id" gg-data-on="id">
  <h1 gg-field="title"></h1>
</div>
```

### URL query params

Read and write URL query params declaratively.

```html
<!-- On click, set ?modal=view&id=42 -->
<button gg-query-set="modal:view,id:42">Open</button>

<!-- On click, remove ?modal and ?id -->
<button gg-query-remove="modal,id">Close</button>
```

### Content switcher

Show/hide children based on a state value.

```html
<!-- State driven by URL param ?view=... -->
<div gg-switch-query="view">
  <section gg-case="">Pick a view</section>
  <section gg-case="list">List view</section>
  <section gg-case="grid">Grid view</section>
</div>

<!-- State driven by a field on the nearest gg-data record -->
<span gg-switch-field="status">
  <span gg-case="published">Published</span>
  <span gg-case="draft">Draft</span>
  <span gg-case="">Unknown</span>
</span>
```

`gg-case=""` acts as the default/empty state.

### Dialog

A single `<dialog>` element is managed automatically via the `modal` URL param.

```html
<div gg-query-set="modal:confirm,id:42">Delete</div>

<dialog>
  <p>Are you sure?</p>
  <button gg-query-remove="modal,id">Cancel</button>
</dialog>
```

Setting `?modal=...` opens the dialog. Removing it (or pressing Escape, or clicking the backdrop) closes it. Back button navigation is handled automatically.

### Auth and role gating

Show or hide elements based on auth state. You provide the auth adapter, so any backend works.

```html
<a href="/login" gg-auth="false">Log in</a>
<a href="/account" gg-auth="true">My account</a>
<a href="/admin" gg-role="superuser">Admin panel</a>
```

`gg-auth` is set on `<body>` as `"true"` or `"false"`. `gg-role` is set if you provide a `roleQuery` (see [Auth config](#auth-config)).

### Form visibility

Conditionally show/hide elements based on form field values.

```html
<form>
  <label><input type="radio" name="reason" value="scheduling" /> Scheduling</label>
  <label><input type="radio" name="reason" value="other" /> Other</label>

  <div gg-visible-when="reason:other">
    <input type="text" name="other_reason" placeholder="Please specify" />
  </div>
</form>
```

Hidden elements get `display: none`, `inert`, and `aria-hidden="true"`. Transitions are a 200ms opacity fade. Use `gg-form-scope` on a non-`<form>` ancestor when `closest("form")` can't reach the inputs (e.g. shadow DOM).

### Actions

Run mutations on click. Actions receive the context object and a data object.

```html
<!-- Simple action, no data needed -->
<button gg-action="sign_out">Sign out</button>

<!-- Action with explicit data -->
<button gg-action="update_status" gg-action-data="status:archived">Archive</button>

<!-- Inside a data list, the action automatically receives the row's record -->
<ul gg-data-list="posts_list">
  <li gg-list-template>
    <h3 gg-field="title"></h3>
    <button gg-action="delete_post">Delete</button>
  </li>
</ul>
```

When an action is inside a `gg-data` or `gg-data-list` container, it automatically receives the record as its data. Explicit `gg-action-data` values are merged on top (and win on conflict).

Action functions should return `{ ok: true }` or `{ ok: false, error }`:

```js
app.addAction("delete_post", async ({ sb }, { id }) => {
  const { error } = await sb.from("posts").delete().eq("id", id);
  return error ? { ok: false, error } : { ok: true };
});
```

## Config

### `init(options)`

Returns an app instance with `addQuery`, `addAction`, and `start` methods.

| Option | Type | Required | Description |
|---|---|---|---|
| `context` | `object` | No | Arbitrary object passed to every query and action. Put backend clients or anything else your handlers need on it. Defaults to `{}`. |
| `auth` | `object` | No | Auth adapter (see below). If omitted, `gg-auth`/`gg-role` attrs are never set. |

### Auth adapter

| Option | Type | Description |
|---|---|---|
| `auth.getUser` | `() => string \| null \| Promise<string \| null>` | Returns the current user id, or `null` when signed out. Called once on start. |
| `auth.onChange` | `(cb: (userId: string \| null) => void) => void` | Subscribe to auth changes. Optional but recommended — without it, `gg-auth` won't update on sign-in/out. |
| `auth.roleQuery` | `async (context, userId) => string \| null` | Returns the user's role string. Called on every auth change. If omitted, `gg-role` is never set. |

Example with Supabase:

```js
import { createClient } from "@supabase/supabase-js";

const sb = createClient("...", "...");

const app = init({
  context: { sb },
  auth: {
    getUser: async () => (await sb.auth.getUser()).data.user?.id ?? null,
    onChange: (cb) => sb.auth.onAuthStateChange((_e, session) => cb(session?.user?.id ?? null)),
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

### `app.addQuery(id, fn)`

Register a data query. `fn` receives `(context)` and should return:
- A single object (or `null`) for use with `gg-data` or `gg-data-form`
- An array for use with `gg-data-list`

### `app.addAction(id, fn)`

Register an action. `fn` receives `(context, data)` and should return `{ ok: true }` or `{ ok: false, error }`.

### `app.start()`

Initializes all engines and starts listening for DOM events. Call this after registering all queries and actions.

## Exports

The library also exports utility functions for use in your queries and actions:

```js
import {
  init,
  getPath,            // resolve dot-paths on objects
  populateFields,     // set [gg-field] descendants from a record
  setSwitchState,     // write gg-switch-state on an element
  applySwitchState,   // toggle [gg-case] children to match state
  setQueryParams,     // programmatically set URL params
  removeQueryParams,  // programmatically remove URL params
} from "gg-wf-scripts";
```
