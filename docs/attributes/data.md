# Data binding

Display data from your registered queries directly in the DOM.

## Single record

`gg-data` runs a query and populates `[gg-field]` descendants from the returned object:

```html
<div gg-data="post_by_id">
  <h1 gg-field="title">Loading...</h1>
  <p gg-field="body"></p>
</div>
```

`gg-field` supports dot-paths for nested data (e.g. `author.name`).

## Form pre-fill

`gg-data-form` runs a query and sets `value` / `checked` on inputs by their `name` attribute:

```html
<form gg-data-form="post_by_id">
  <input name="title" />
  <textarea name="body"></textarea>
</form>
```

## Lists

`gg-data-list` runs a query that returns an array, and clones a `[gg-list-template]` element for each record:

```html
<ul gg-data-list="posts_list">
  <li gg-list-template>
    <h3 gg-field="title"></h3>
    <span gg-field="author.name"></span>
  </li>
</ul>
```

## Lists with sibling metadata (`gg-field-list`)

When a list comes back with metadata — pagination counts, totals, current page — use a single `gg-data` query that returns the array alongside the meta fields, then point a child element at the array via `gg-field-list`:

```js
app.addQuery("posts_paginated", async ({ sb }, params) => {
  const page = parseInt(params.get("page") ?? "1", 10);
  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const { data, count } = await sb
    .from("posts")
    .select("*", { count: "exact" })
    .range(from, from + pageSize - 1);
  const totalPages = Math.ceil((count ?? 0) / pageSize);
  return {
    items: data ?? [],
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}, { on: ["page"] });
```

```html
<div gg-data="posts_paginated">
  <ul gg-field-list="items">
    <li gg-list-template>
      <h3 gg-field="title"></h3>
    </li>
  </ul>

  <span>Page <span gg-field="page"></span> of <span gg-field="totalPages"></span></span>
  <button gg-visible-when="hasPrev:true" gg-action="prev_page">Previous</button>
  <button gg-visible-when="hasNext:true" gg-action="next_page">Next</button>
</div>
```

`gg-field-list="path"` reads the array at `path` on the parent record and clones the inner `[gg-list-template]` for each item — same per-record population as `gg-data-list`, just sourced from a field on an outer `gg-data` record. Sibling `gg-field` / `gg-visible-when` / `gg-switch-field` descendants of the `gg-data` container read from the same record, so list and meta update together on every refresh.

This composes recursively: a cloned row's record can have its own array field, and a `gg-field-list` inside the template clones for those too — no second query needed.

## Passing data to web components / React

Elements that manage their own DOM (custom elements wrapping React, Lit, etc.) read from the container's `__ggRecord` property. Every `gg-data`, `gg-data-form`, and cloned `gg-data-list` row stamps the record there after the query resolves, and the engine fires a `gg-data-ready` CustomEvent on the same element with `detail.record`.

```html
<form gg-data-form="post_form">
  <input name="title" />
  <my-select name="school_id"></my-select>
</form>
```

```js
// Inside <my-select> — wait for the parent record, then hydrate.
const form = host.closest("form");
form.addEventListener("gg-data-ready", (e) => {
  hydrate(e.detail.record);
});
if (form.__ggRecord) hydrate(form.__ggRecord); // already populated
```

The event bubbles, so listeners on one form/container never fire for another. From inside a shadow root, the host element's parent chain is unreachable via `closest()` directly — walk out with `getRootNode().host` first.

::: tip
If the component re-runs its own search query against the library, it can call any registered query imperatively via `app.runQuery(id)`. This goes through the same logging/error path as the `gg-data*` engine — debug logs fire and any throw is routed through `app.onError` before being re-thrown to the caller. Params come from the current URL, same as the engine. For an escape hatch that skips logging, `app.queries[id].handler(app.context, params)` calls the raw handler directly. The library exposes the `App` as `window.ggApp` automatically (and dispatches a `gg-app-ready` event on `document` with `detail.app`), so custom-code components can reach it without any plumbing. Pass `expose: false` to `init()` to opt out.
:::

## Re-running on URL changes

The cleanest place to declare which URL params should rerun a query is at registration via `opts.on` — that way the dependency lives next to the handler and can't drift from the markup:

```js
app.addQuery("post_by_id", async ({ sb }, params) => {
  const { data } = await sb.from("posts").select("*").eq("id", params.get("id")).single();
  return data;
}, { on: ["id"] });
```

```html
<div gg-data="post_by_id">
  <h1 gg-field="title"></h1>
</div>
```

If you need to override the rerun list on a specific instance — or you'd rather declare it on the markup — `gg-data-on` does the same thing and takes precedence:

```html
<div gg-data="post_by_id" gg-data-on="id">
  <h1 gg-field="title"></h1>
</div>
```

Combine with `gg-query-bind` (see [URL params](/attributes/url-params)) to drive live search:

```js
app.addQuery("search_posts", async ({ sb }, params) => {
  const q = params.get("q") ?? "";
  const { data } = await sb.from("posts").select("*").ilike("title", `%${q}%`);
  return data ?? [];
}, { on: ["q"] });
```

```html
<input gg-query-bind="q" gg-query-debounce="300" />

<ul gg-data-list="search_posts">
  <li gg-list-template><span gg-field="title"></span></li>
</ul>
```
