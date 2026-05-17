# Registering handlers

Three registration methods, each keyed by the string id you reference from your markup. All three accept optional type parameters so you can pin the result/data shape at the call site for autocomplete inside the handler.

## `app.addQuery(id, fn, opts?)`

Register a data query.

```js
app.addQuery("posts_list", async ({ sb }, params) => {
  const q = params.get("q") ?? "";
  const { data } = await sb
    .from("posts")
    .select("*")
    .ilike("title", `%${q}%`);
  return data ?? [];
});
```

`fn` receives `(context, params)` where `params` is a `URLSearchParams` snapshot of the current URL query string. Use `params.get("id")` for single values or `params.getAll("tag")` for multi-value params.

Return:

- A single object (or `null`) for use with `gg-data` or `gg-data-form`
- An array for use with `gg-data-list`

### Re-running on URL changes

Pass `opts.on` to list URL query-param keys that should rerun this query whenever any of them change:

```js
app.addQuery("posts_list", async ({ sb }, params) => {
  const q = params.get("q") ?? "";
  const { data } = await sb
    .from("posts")
    .select("*")
    .ilike("title", `%${q}%`);
  return data ?? [];
}, { on: ["q"] });
```

This is equivalent to putting `gg-data-on="q"` on every container that uses `posts_list`, but declared next to the handler so it can't drift from the markup. A `gg-data-on` attribute on a specific container still wins as a per-instance override.

### Re-running after mutations

Pass `opts.refreshKeys` to list topic strings this query should re-run on whenever `app.invalidate(...)` publishes one of them:

```js
app.addQuery("posts_list", async ({ sb }) => {
  const { data } = await sb.from("posts").select("*");
  return data ?? [];
}, { refreshKeys: ["posts"] });

app.addFormAction("create_post", async ({ sb }, formData) => {
  const { error } = await sb.from("posts").insert({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (error) return { ok: false, error };
  app.invalidate("posts");
  return { ok: true };
});
```

Keys are arbitrary strings — pick one canonical name per entity (e.g. `"posts"`, `"users"`) and use it in every query that reads the entity and every handler that mutates it. `on` and `refreshKeys` are independent; a query can use both, either, or neither.

See [Data binding › Refreshing after mutations](/attributes/data#refreshing-after-mutations) for the full pattern.

### Typed result

```ts
type Post = { id: string; title: string };

app.addQuery<Post[]>("posts_list", async ({ sb }, params) => {
  const { data } = await sb.from("posts").select("*");
  return data ?? [];   // checked against Post[]
});
```

## `app.addAction(id, fn)`

Register an action triggered by `gg-action`.

```js
app.addAction("delete_post", async ({ sb }, { id }) => {
  const { error } = await sb.from("posts").delete().eq("id", id);
  return error ? { ok: false, error } : { ok: true };
});
```

`fn` receives `(context, data, params, helpers)`. Return `{ ok: true }` or `{ ok: false, error }`.

### Helpers

`helpers.removeItem(predicate)` removes matching clone(s) from the `gg-data-list` that contains the trigger — useful for optimistic deletes without a full list refetch:

```js
app.addAction("delete_post", async ({ sb }, { id }, _params, helpers) => {
  const { error } = await sb.from("posts").delete().eq("id", id);
  if (error) return { ok: false, error };
  helpers.removeItem((record) => record.id === id);
  return { ok: true };
});
```

If a `transition` is configured on `init()`, the removed row fades out using the same duration/easing as the rest of the library before detaching. If the trigger isn't inside a list, `removeItem` warns and no-ops. See [Actions › Removing a list item](/attributes/actions#removing-a-list-item) for more.

### Typed data

```ts
app.addAction<{ id: string }>("delete_post", async ({ sb }, { id }) => {
  // `id` is `string` here
  const { error } = await sb.from("posts").delete().eq("id", id);
  return error ? { ok: false, error } : { ok: true };
});
```

## `app.addFormAction(id, fn)`

Register a form action triggered by `gg-form-action` on a `<form>`.

```js
app.addFormAction("create_post", async ({ sb }, formData) => {
  const { error } = await sb.from("posts").insert({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  return error ? { ok: false, error } : { ok: true };
});
```

`fn` receives `(context, formData, params)` where `formData` is a `FormData` snapshot of the submitted form. The default submit is prevented automatically. Return `{ ok: true }`, `{ ok: false, error }`, or `{ ok: false, field_errors: [...] }` (see [Forms › Validation errors](/attributes/forms#validation-errors)).

A successful return resets the form's named inputs to their defaults. Pass `{ ok: true, reset: false }` to keep the values in place.
