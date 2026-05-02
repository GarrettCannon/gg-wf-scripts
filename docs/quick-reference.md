# Quick reference

Every `gg-*` attribute the library reads or writes, what reads it, and what shape it expects. One page so you (or an LLM helping you) can scan the whole vocabulary at once.

## Data binding

| Attribute | On | Reads / writes | Notes |
|---|---|---|---|
| `gg-data="<id>"` | container | reads | Runs query `<id>`, expects single object. Populates `[gg-field]` and `[gg-switch-field]` descendants. |
| `gg-data-list="<id>"` | container | reads | Runs query `<id>`, expects array. Clones `[gg-list-template]` per record. |
| `gg-data-form="<id>"` | `<form>` or container | reads | Runs query `<id>`, expects single object. Pre-fills inputs by `name`. |
| `gg-data-on="<key>,..."` | same as above | reads | Re-runs the query whenever any listed URL param changes. |
| `gg-field="<dot.path>"` | descendant | writes `textContent` | Set from the parent record. Skipped if the path resolves to `null`/`undefined`. |
| `gg-list-template` | child of `gg-data-list` | — | The template element to clone per record. The original stays in the DOM (hidden via the engine). |

**Record shape:** plain object. Dot-paths are split by `.` and walked with `getPath`. Arrays for `gg-data` or `gg-data-form` produce a `console.warn`.

**Reading the record from custom code:** every `gg-data`, `gg-data-form`, and cloned `gg-data-list` row sets `element.__ggRecord` and dispatches a bubbling `gg-data-ready` CustomEvent (with `detail.record`) on itself after the query resolves. Web components / React islands listen on the container (e.g. `host.closest("form")`) to hydrate their own state.

## Actions

| Attribute | On | Reads / writes | Notes |
|---|---|---|---|
| `gg-action="<id>"` | any element | reads | On click, runs action `<id>`. Walks ancestors for a `__ggRecord` and merges with `gg-action-data`. |
| `gg-action-data="k1:v1,k2:v2"` | same element | reads | Inline data merged on top of the parent record. Values are strings. |
| `gg-confirm` | element with `gg-action` or `gg-form-action` | reads | If present, calls `window.confirm()` before firing. |
| `gg-confirm-text="<msg>"` | same | reads | Confirmation message. Defaults to `"Are you sure?"`. |

**Action handler shape:** `(context, data, params) => { ok: boolean, error?: unknown } \| void`. Returning `{ ok: false }` triggers `onError`.

## Form actions

| Attribute | On | Reads / writes | Notes |
|---|---|---|---|
| `gg-form-action="<id>"` | `<form>` | reads | Overrides submit, runs form action `<id>` with a `FormData` snapshot. |
| `gg-form-field-invalid` | input/select/textarea | written | Set by the engine after a `field_errors` failure. Cleared on next `input`. |
| `gg-form-field-error="<name>"` | element | written `textContent` | Receives the message for field `<name>`. |
| `gg-form-error` | element | written `textContent` | Receives the top-level `error` message. |
| `gg-form-error-list` | container | reads | Cloning target — see `gg-list-template` — for rendering one element per `field_errors` entry. |
| `gg-form-scope` | container | reads | Used by `gg-visible-when` to scope its lookups. |

**Form action handler shape:** `(context, formData, params) => { ok: boolean, error?: unknown, field_errors?: { name, message }[] } \| void`.

## URL params

| Attribute | On | Reads / writes | Notes |
|---|---|---|---|
| `gg-query-set="k1:v1,k2:v2"` | clickable | reads | On click, sets the listed params. |
| `gg-query-remove="k1,k2"` | clickable | reads | On click, removes the listed params. |
| `gg-query-bind="<key>"` | input/select/textarea | reads + writes URL | Two-way binding between input value and URL param. |
| `gg-query-debounce="<ms>"` | same input | reads | Debounce ms for `gg-query-bind`. |

**Modal param:** `?modal=...` is reserved — the dialog engine watches it and opens/closes the page's `<dialog>` element. `?id` is removed alongside `modal` on dismiss.

## Switcher

| Attribute | On | Reads / writes | Notes |
|---|---|---|---|
| `gg-switch-state="<value>"` | container | reads + written | Children with a matching `gg-case` are shown; others hidden. |
| `gg-switch-field="<dot.path>"` | container inside `gg-data` | reads | Writes the path's value onto `gg-switch-state`. Comma-separated paths are joined positionally. |
| `gg-switch-query="<key>"` | container | reads | Mirrors a URL param onto `gg-switch-state`. Comma-separated keys are joined positionally. |
| `gg-case="<value>"` | child of a switch | reads | Visible when its value matches the parent's `gg-switch-state`. Empty string = default. Comma = positional AND, `\|` = OR alternatives within a position. |

## Visibility

| Attribute | On | Reads / writes | Notes |
|---|---|---|---|
| `gg-visible-when="name1:value1,..."` | element inside `<form>` or `[gg-form-scope]` | reads | Shown if **any** condition matches. Fades opacity over 200ms; sets `inert` + `aria-hidden` while hidden. |

## Status

| Attribute | On | Reads / writes | Notes |
|---|---|---|---|
| `gg-loading` | trigger / form | written | Set to `"true"` while a handler is in flight. Buttons / inputs also get the native `disabled` attribute. |
| `gg-auth` | `<body>` | written | `"true"` when a user is signed in, `"false"` otherwise. |
| `gg-auth="true"` / `"false"` | any element | reads | Hidden via inline `display: none` when its value doesn't match `body[gg-auth]`. |
| `gg-role="<role>"` | `<body>` | written | The string returned by `auth.roleQuery`. Removed when no role / signed out. |
| `gg-role="<role>"` | any element | reads | Hidden when the value doesn't match `body[gg-role]`. Comma-separate for OR, e.g. `gg-role="admin,editor"`. |

## Inbound events

Custom events the library listens for. Dispatch from your own code to drive the engine:

| Event | Where to dispatch | Effect |
|---|---|---|
| `gg:dialog:open` | `document` | Opens the page's `<dialog>` (without touching the URL). |
| `gg:dialog:close` | `document` | Closes the page's `<dialog>` (without touching the URL). |
| `gg:shadow:click` | `document`, with `detail.target = <Element>` | Forwarded click for elements inside a shadow root, since shadow DOM swallows bubbling clicks. |
| `webflow:emit` | `document`, with `detail.event = "<ix-event-name>"` | Bridged into Webflow IX (`Webflow.require("ix3").emit`). |

## Outbound events

Custom events the library dispatches. Listen from your own code to react to engine state:

| Event | Where dispatched | Detail | When |
|---|---|---|---|
| `gg-data-ready` | the `gg-data` / `gg-data-form` container or cloned `gg-data-list` row | `{ record }` | After the query resolves and `__ggRecord` has been written. Bubbles, so a single listener on a parent can observe many containers. |
| `gg-app-ready` | `document` | `{ app }` | Fired once during `init()` after the App is built. The same App is also set as `window.ggApp`. Skip both with `init({ expose: false })`. |
