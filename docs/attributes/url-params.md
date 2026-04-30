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

Combine with `gg-data-on` to re-run a query as the user types:

```html
<input gg-query-bind="q" gg-query-debounce="300" />

<ul gg-data-list="search_posts" gg-data-on="q">
  <li gg-list-template><span gg-field="title"></span></li>
</ul>
```

See also: [`setQueryParams` / `removeQueryParams`](/api/exports) for programmatic use from inside an action or query handler.
