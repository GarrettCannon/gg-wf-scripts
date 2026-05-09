# Actions

Run mutations on click. Actions receive the context object and a data object.

```html
<!-- Simple action, no data needed -->
<button gg-action="sign_out">Sign out</button>

<!-- Action with explicit data (csv form) -->
<button gg-action="update_status" gg-action-data="status:archived">Archive</button>

<!-- One attribute per field — handy in Webflow where only the value varies -->
<button gg-action="update_status" gg-action-data-status="archived">Archive</button>
<button gg-action="update_status" gg-action-data-status="active">Restore</button>

<!-- Inside a data list, the action automatically receives the row's record -->
<ul gg-data-list="posts_list">
  <li gg-list-template>
    <h3 gg-field="title"></h3>
    <button gg-action="delete_post">Delete</button>
  </li>
</ul>
```

When an action is inside a `gg-data` or `gg-data-list` container, it automatically receives the record as its data. Explicit `gg-action-data` values are merged on top (and win on conflict).

Two ways to declare explicit data, and they can be mixed:

- `gg-action-data="k1:v1,k2:v2"` — comma-separated `name:value` pairs, key casing preserved.
- `gg-action-data-{name}="value"` — one attribute per field. Names are lowercased by the browser, so prefer the csv form when you need camelCase keys. On key collisions, prefixed attrs win over the csv form.

## Handler signature

Action functions should return `{ ok: true }` or `{ ok: false, error }`:

```js
app.addAction("delete_post", async ({ sb }, { id }) => {
  const { error } = await sb.from("posts").delete().eq("id", id);
  return error ? { ok: false, error } : { ok: true };
});
```

Handlers receive `(context, data, params)` — `params` is a `URLSearchParams` snapshot of the current URL.

See [Loading and confirm](/attributes/loading) for the corresponding loading-state and confirmation prompt attributes.
