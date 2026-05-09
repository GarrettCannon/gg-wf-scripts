# Loading and confirm

## Loading states

While an action, query, or form action is in flight, the engine sets `gg-loading` on the relevant element so you can style spinners, skeletons, or disabled visuals purely in CSS. The attribute takes one of three values:

| Value | Meaning |
|---|---|
| `loading` | A request is in flight and no prior data is present |
| `refreshing` | A request is in flight, but the element already has loaded data (e.g. an `on:`-driven re-fetch) |
| `loaded` | The most recent request succeeded; data is present. Only set on `gg-data*` containers. |

When the attribute is absent, the element has never loaded (or the initial load failed).

| Trigger | Where `gg-loading` is set | States used | Disabled? |
|---|---|---|---|
| `gg-action` | The trigger element itself | `loading` | Native `disabled` is set if it's a `<button>` or `<input>` |
| `gg-data` / `gg-data-list` / `gg-data-form` | The container | `loading`, `refreshing`, `loaded` | n/a (not click-triggered) |
| `gg-form-action` | The `<form>` and every submit control inside it (`button[type="submit"]`, untyped `<button>`, `input[type="submit"]`) | `loading` | Submit controls get native `disabled` |

For data containers: an in-flight request becomes `refreshing` if the element was previously `loaded`, otherwise `loading`. On success the attribute is set to `loaded`. On failure the attribute is restored to its prior state (so a failed refresh still shows `loaded`, while a failed initial load clears the attribute entirely).

Re-clicks on a loading `gg-action` and re-submits on a loading `gg-form-action` are ignored.

Style with CSS:

```css
[gg-loading="loading"] { opacity: 0.6; pointer-events: none; }
[gg-loading="loading"]::after { content: " ⟳"; }
[gg-loading="refreshing"]::after { content: " ⟳"; opacity: 0.5; }
[gg-loading="loaded"] { /* settled state — usually no styling needed */ }
```

## Confirm prompts

Add `gg-confirm` to a `gg-action` trigger or `gg-form-action` form to require a `window.confirm` dialog before the handler runs. If the user cancels, the action is skipped (and form submission is prevented). Customize the prompt text with `gg-confirm-text`; if omitted it defaults to `"Are you sure?"`.

```html
<button gg-action="delete_post" gg-confirm gg-confirm-text="Delete this post?">
  Delete
</button>

<form gg-form-action="wipe_account" gg-confirm gg-confirm-text="This cannot be undone. Continue?">
  ...
</form>
```
