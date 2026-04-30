# Exports

The library exports utility functions for use inside your queries and actions:

```js
import {
  init,
  getPath,            // resolve dot-paths on objects
  populateFields,     // set [gg-field] descendants from a record
  setSwitchState,     // write gg-switch-state on an element
  applySwitchState,   // toggle [gg-case] children to match state
  setQueryParams,     // programmatically set URL params
  removeQueryParams,  // programmatically remove URL params
} from "gg-wf-scripts";
```

## `getPath(obj, path)`

Resolves a dot-path against an object. Returns `undefined` if any segment is missing.

```js
getPath({ author: { name: "Ada" } }, "author.name"); // "Ada"
```

## `populateFields(root, record)`

Walks `[gg-field]` descendants of `root` and sets their `textContent` from `record` using `gg-field`'s value as a dot-path.

## `setSwitchState(el, state)` / `applySwitchState(el)`

`setSwitchState` writes `gg-switch-state="<state>"` on `el`. `applySwitchState` reads that attribute and toggles `[gg-case]` children accordingly. Use these to drive a switcher imperatively.

## `setQueryParams(updates)` / `removeQueryParams(keys)`

Programmatic equivalents of `gg-query-set` / `gg-query-remove`. Useful inside an action handler that needs to update the URL after a mutation succeeds.

```js
import { setQueryParams } from "gg-wf-scripts";

app.addAction("open_post", async (_ctx, { id }) => {
  setQueryParams({ modal: "view", id });
  return { ok: true };
});
```
