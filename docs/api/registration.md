# Registering handlers

Three registration methods, each keyed by the string id you reference from your markup. All three accept optional type parameters so you can pin the result/data shape at the call site for autocomplete inside the handler.

## `app.addQuery(id, fn)`

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

`fn` receives `(context, data, params)`. Return `{ ok: true }` or `{ ok: false, error }`.

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
