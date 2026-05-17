# Exports

The library exports a small set of utilities for use inside your queries and actions:

```js
import {
  init,
  getPath,            // resolve dot-paths on objects
  setQueryParams,     // programmatically set URL params
  removeQueryParams,  // programmatically remove URL params
  invalidate,         // re-run queries subscribed to one or more refresh keys
} from "gg-wf-scripts";
```

## `getPath(obj, path)`

Resolves a dot-path against an object. Returns `undefined` if any segment is missing.

```js
getPath({ author: { name: "Ada" } }, "author.name"); // "Ada"
```

## `setQueryParams(updates)` / `removeQueryParams(keys)`

Programmatic equivalents of `gg-query-set` / `gg-query-remove`. Useful inside an action handler that needs to update the URL after a mutation succeeds.

```js
import { setQueryParams } from "gg-wf-scripts";

app.addAction("open_post", async (_ctx, { id }) => {
  setQueryParams([{ key: "modal", value: "view" }, { key: "id", value: String(id) }]);
  return { ok: true };
});
```

## `invalidate(...keys)`

Re-runs every registered query whose `refreshKeys` includes any of the given keys. Use after a mutation to refresh the lists and detail views that read the affected entity. Also available as `app.invalidate(...keys)`.

```js
import { invalidate } from "gg-wf-scripts";

app.addFormAction("create_post", async ({ sb }, formData) => {
  const { error } = await sb.from("posts").insert({
    title: formData.get("title"),
  });
  if (error) return { ok: false, error };
  invalidate("posts");
  return { ok: true };
});
```

See [Data binding › Refreshing after mutations](/attributes/data#refreshing-after-mutations) for how to subscribe queries to a key.

## Types

`AuthAdapter`, `Query`, `Action`, `ActionHelpers`, `ActionResult`, `RemoveItemPredicate`, `FormAction`, `FormActionResult`, `FormFieldError`, `GgErrorEvent`, and `ErrorHandler` are all exported as types.
