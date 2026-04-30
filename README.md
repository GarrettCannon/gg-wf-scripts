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

app.addQuery("posts_list", async ({ sb }, params) => {
  const q = params.get("q") ?? "";
  const { data } = await sb
    .from("posts")
    .select("*")
    .ilike("title", `%${q}%`)
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

#### Passing data to web components / React

For elements that manage their own DOM (custom elements wrapping React, Lit, etc.), use `gg-data-key` to receive a JSON-serialized value as a `gg-data-value` attribute. The component listens for attribute changes and updates its own state.

```html
<div gg-data="post_form">
  <!-- record.schools is e.g. [{ id, name }, ...] -->
  <my-select gg-data-key="schools"></my-select>
</div>
```

After the query runs, the engine resolves the dot-path against the record and writes the result:

```html
<my-select gg-data-key="schools" gg-data-value='[{"id":1,"name":"Acme"}]'></my-select>
```

The lookup pierces shadow roots, so the marker can live inside a component's shadow DOM. Leaving `gg-data-key=""` passes the entire record. Note: if the component renders after the query runs, it won't be found — re-run the query (e.g. via `gg-data-on`) once the component has mounted, or have the component pull from `host.__ggRecord` on connect.

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

#### Two-way input binding

Mirror an input's value into a URL param as the user types. Empty value removes the param. The input is also populated from the URL on load and back/forward navigation.

```html
<!-- Bind to ?q=... with a 300ms debounce -->
<input gg-query-bind="q" gg-query-debounce="300" placeholder="Search..." />
```

Combine with `gg-data-on` to re-run a query as the user types:

```html
<input gg-query-bind="q" gg-query-debounce="300" />

<ul gg-data-list="search_posts" gg-data-on="q">
  <li gg-list-template><span gg-field="title"></span></li>
</ul>
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

### Form actions

Override a form's submit to run a registered handler instead of the browser default. The handler receives the form's `FormData` directly.

```html
<form gg-form-action="create_post">
  <input name="title" required />
  <textarea name="body"></textarea>
  <button type="submit">Save</button>
</form>
```

```js
app.addFormAction("create_post", async ({ sb }, formData) => {
  const { error } = await sb.from("posts").insert({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  return error ? { ok: false, error } : { ok: true };
});
```

The handler receives `(context, formData, params)`. `preventDefault` is called automatically — the form will not submit to its `action` URL. Return `{ ok: true }` or `{ ok: false, error }`.

#### Validation errors

Form actions can return validation errors and the engine will display them via attributes on your markup.

```js
app.addFormAction("create_post", async ({ sb }, formData) => {
  const title = formData.get("title");
  if (!title) {
    return {
      ok: false,
      field_errors: [{ name: "title", message: "Title is required" }],
    };
  }
  const { error } = await sb.from("posts").insert({ title });
  return error
    ? { ok: false, error: "Could not save — please try again." }
    : { ok: true };
});
```

Markup:

```html
<form gg-form-action="create_post">
  <input name="title" />
  <p gg-form-field-error="title"></p>

  <textarea name="body"></textarea>
  <p gg-form-field-error="body"></p>

  <!-- Optional: list every field error in one place -->
  <ul gg-form-error-list>
    <li gg-list-template>
      <strong gg-field="name"></strong>: <span gg-field="message"></span>
    </li>
  </ul>

  <!-- Optional: form-level error (the result.error string) -->
  <p gg-form-error></p>

  <button type="submit">Save</button>
</form>
```

What the engine does:
- Sets `gg-form-field-invalid="true"` on each invalid input — target with CSS like `input[gg-form-field-invalid="true"] { border-color: red; }`.
- Sets the `textContent` of `[gg-form-field-error="<name>"]` elements to the matching message.
- Populates `[gg-form-error-list]` using the same template pattern as `gg-data-list` (clones `[gg-list-template]`, applies `gg-field` bindings).
- Sets the `textContent` of `[gg-form-error]` to the top-level `error` string.
- All errors are cleared at the start of each submit, and a field's invalid attr + message are cleared when the user types in that field.

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

### Loading states

While an action, query, or form action is in flight, the engine sets `gg-loading="true"` on the relevant element so you can style spinners, skeletons, or disabled visuals purely in CSS.

| Trigger | Where `gg-loading` is set | Disabled? |
|---|---|---|
| `gg-action` | The trigger element itself | Native `disabled` is set if it's a `<button>` or `<input>` |
| `gg-data` / `gg-data-list` / `gg-data-form` | The container | n/a (not click-triggered) |
| `gg-form-action` | The `<form>` and every submit control inside it (`button[type="submit"]`, untyped `<button>`, `input[type="submit"]`) | Submit controls get native `disabled` |

Re-clicks on a loading `gg-action` and re-submits on a loading `gg-form-action` are ignored. The attribute is removed in a `finally` block, so it's cleared even if the handler throws.

Style with CSS:

```css
[gg-loading] { opacity: 0.6; pointer-events: none; }
[gg-loading]::after { content: " ⟳"; }
```

## Config

### `init(options)`

Returns an app instance with `addQuery`, `addAction`, and `start` methods.

| Option | Type | Required | Description |
|---|---|---|---|
| `context` | `object` | No | Arbitrary object passed to every query and action. Put backend clients or anything else your handlers need on it. Defaults to `{}`. |
| `auth` | `object` | No | Auth adapter (see below). If omitted, `gg-auth`/`gg-role` attrs are never set. |
| `debug` | `boolean` | No | When `true`, every query and action is logged to the console (trigger/container, data, result, duration). Defaults to `false`. |

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

Register a data query. `fn` receives `(context, params)` where `params` is a `URLSearchParams` snapshot of the current URL query string. Use `params.get("id")` for single values or `params.getAll("tag")` for multi-value params. Return:
- A single object (or `null`) for use with `gg-data` or `gg-data-form`
- An array for use with `gg-data-list`

### `app.addAction(id, fn)`

Register an action. `fn` receives `(context, data, params)` where `params` is a `URLSearchParams` snapshot of the current URL query string. Return `{ ok: true }` or `{ ok: false, error }`.

### `app.addFormAction(id, fn)`

Register a form action. `fn` receives `(context, formData, params)` where `formData` is a `FormData` snapshot of the submitted form. The default submit is prevented automatically. Return `{ ok: true }` or `{ ok: false, error }`.

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
