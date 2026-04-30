# Loading and confirm

## Loading states

While an action, query, or form action is in flight, the engine sets `gg-loading="true"` on the relevant element so you can style spinners, skeletons, or disabled visuals purely in CSS.

| Trigger | Where `gg-loading` is set | Disabled? |
|---|---|---|
| `gg-action` | The trigger element itself | Native `disabled` is set if it's a `<button>` or `<input>` |
| `gg-data` / `gg-data-list` / `gg-data-form` | The container | n/a (not click-triggered) |
| `gg-form-action` | The `<form>` and every submit control inside it (`button[type="submit"]`, untyped `<button>`, `input[type="submit"]`) | Submit controls get native `disabled` |

Re-clicks on a loading `gg-action` and re-submits on a loading `gg-form-action` are ignored. The attribute is removed in a `finally` block, so it's cleared even if the handler throws.

Style with CSS:

```css
[gg-loading] { opacity: 0.6; pointer-events: none; }
[gg-loading]::after { content: " ⟳"; }
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
