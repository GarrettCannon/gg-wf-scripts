# Exports

The library exports a small set of utilities for use inside your queries and actions:

```js
import {
  init,
  getPath,            // resolve dot-paths on objects
  setQueryParams,     // programmatically set URL params
  removeQueryParams,  // programmatically remove URL params
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

## Types

`AuthAdapter`, `Query`, `Action`, `ActionResult`, `FormAction`, `FormActionResult`, `FormFieldError`, `GgErrorEvent`, and `ErrorHandler` are all exported as types.
