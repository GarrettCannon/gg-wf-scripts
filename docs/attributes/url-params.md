# URL query params

Read and write URL query params declaratively.

## Set params on click

```html
<!-- On click, set ?modal=view&id=42 -->
<button gg-query-set="modal:view,id:42">Open</button>
```

## Remove params on click

```html
<!-- On click, remove ?modal and ?id -->
<button gg-query-remove="modal,id">Close</button>
```

## Two-way input binding

Mirror an input's value into a URL param as the user types. Empty value removes the param. The input is also populated from the URL on load and back/forward navigation.

```html
<!-- Bind to ?q=... with a 300ms debounce -->
<input gg-query-bind="q" gg-query-debounce="300" placeholder="Search..." />
```

Combine with a query that declares its URL deps to re-run as the user types — pass `{ on: ["q"] }` at registration so the markup doesn't have to know:

```js
app.addQuery("search_posts", searchPosts, { on: ["q"] });
```

```html
<input gg-query-bind="q" gg-query-debounce="300" />

<ul gg-data-list="search_posts">
  <li gg-list-template><span gg-field="title"></span></li>
</ul>
```

`gg-data-on="q"` on the container does the same thing and is a per-instance override; see [Data › Re-running on URL changes](/attributes/data#re-running-on-url-changes).

See also: [`setQueryParams` / `removeQueryParams`](/api/exports) for programmatic use from inside an action or query handler.
