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

## Passing data to web components / React

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

The lookup pierces shadow roots, so the marker can live inside a component's shadow DOM. Leaving `gg-data-key=""` passes the entire record.

::: tip
If the component renders after the query runs, it won't be found — re-run the query (e.g. via `gg-data-on`) once the component has mounted, or have the component pull from `host.__ggRecord` on connect.
:::

## Re-running on URL changes

Add `gg-data-on` to re-run a query when specific URL params change:

```html
<div gg-data="post_by_id" gg-data-on="id">
  <h1 gg-field="title"></h1>
</div>
```

Combine with `gg-query-bind` (see [URL params](/attributes/url-params)) to drive live search:

```html
<input gg-query-bind="q" gg-query-debounce="300" />

<ul gg-data-list="search_posts" gg-data-on="q">
  <li gg-list-template><span gg-field="title"></span></li>
</ul>
```
