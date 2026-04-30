# Content switcher

Show/hide children based on a state value, sourced either from a URL param or a field on the nearest data record.

## Driven by URL

```html
<div gg-switch-query="view">
  <section gg-case="">Pick a view</section>
  <section gg-case="list">List view</section>
  <section gg-case="grid">Grid view</section>
</div>
```

When `?view=list` is present, only the `gg-case="list"` child is shown.

## Driven by a record field

```html
<span gg-switch-field="status">
  <span gg-case="published">Published</span>
  <span gg-case="draft">Draft</span>
  <span gg-case="">Unknown</span>
</span>
```

The switcher walks up the DOM to find the nearest `gg-data` / `gg-data-list` row record, then reads `status` from that record.

## Default state

`gg-case=""` acts as the default/empty state. It matches when the URL param or field is missing or empty.
