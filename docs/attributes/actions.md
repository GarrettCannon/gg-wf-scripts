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

Handlers receive `(context, data, params, helpers)`. `params` is a `URLSearchParams` snapshot of the current URL. `helpers` exposes utilities scoped to the trigger — see below.

## Removing a list item

When an action triggered from inside a `gg-data-list` row succeeds, `helpers.removeItem(predicate)` removes the matching clone(s) from that list without refetching:

```js
app.addAction("delete_post", async ({ sb }, { id }, _params, helpers) => {
  const { error } = await sb.from("posts").delete().eq("id", id);
  if (error) return { ok: false, error };
  helpers.removeItem((record) => record.id === id);
  return { ok: true };
});
```

How it works:

- The action engine captures the trigger's enclosing `gg-data-list` container before invoking the handler. `removeItem` walks that container's rendered rows and removes every clone whose `__ggRecord` matches the predicate.
- The predicate runs against `__ggRecord` (the row's source record), so you can match on any field — `id`, `slug`, compound keys, etc.
- If the trigger isn't inside a list (e.g. a global action button), `removeItem` warns and no-ops.

If a `transition` is configured on `init()`, the removed clone fades out using the same duration/easing as `gg-visible-when` and switcher cases before detaching; otherwise removal is instant.

`removeItem` is independent from `app.invalidate()`. Call `removeItem` for optimistic local updates after a delete; call `invalidate` when you need every subscribed list/detail view to refetch from the server. The two compose — you can do both if a delete affects multiple lists and you only want to fast-path the one the user clicked in.

See [Loading and confirm](/attributes/loading) for the corresponding loading-state and confirmation prompt attributes.
