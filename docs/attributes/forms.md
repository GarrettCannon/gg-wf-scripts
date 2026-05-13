# Forms

Override a form's submit to run a registered handler instead of the browser default. The handler receives the form's `FormData` directly.

## Form actions

```html
<form gg-form-action="create_post">
  <input name="title" required />
  <textarea name="body"></textarea>
  <button type="submit">Save</button>
</form>
```

```js
app.addFormAction("create_post", async ({ sb }, formData) => {
  const { error } = await sb.from("posts").insert({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  return error ? { ok: false, error } : { ok: true };
});
```

The handler receives `(context, formData, params)`. `preventDefault` is called automatically — the form will not submit to its `action` URL. Return `{ ok: true }` or `{ ok: false, error }`.

On a successful submit the engine resets every named input back to its default value (light DOM + open shadow roots) and dispatches `input`/`change` so downstream listeners react. Opt out per-submit by returning `{ ok: true, reset: false }` — useful when the form should stay populated, e.g. inline edit forms.

## Validation errors

Form actions can return validation errors and the engine will display them via attributes on your markup.

```js
app.addFormAction("create_post", async ({ sb }, formData) => {
  const title = formData.get("title");
  if (!title) {
    return {
      ok: false,
      field_errors: [{ name: "title", message: "Title is required" }],
    };
  }
  const { error } = await sb.from("posts").insert({ title });
  return error
    ? { ok: false, error: "Could not save — please try again." }
    : { ok: true };
});
```

Markup:

```html
<form gg-form-action="create_post">
  <input name="title" />
  <p gg-form-field-error="title"></p>

  <textarea name="body"></textarea>
  <p gg-form-field-error="body"></p>

  <!-- Optional: list every field error in one place -->
  <ul gg-form-error-list>
    <li gg-list-template>
      <strong gg-field="name"></strong>: <span gg-field="message"></span>
    </li>
  </ul>

  <!-- Optional: form-level error (the result.error string) -->
  <p gg-form-error></p>

  <button type="submit">Save</button>
</form>
```

What the engine does:

- Sets `gg-form-has-error="true"` on the `<form>` itself when any error is shown — use it to toggle a wrapper, e.g. `form:not([gg-form-has-error]) .error-banner { display: none; }`.
- Sets `gg-form-field-invalid="true"` on each invalid input — target with CSS like `input[gg-form-field-invalid="true"] { border-color: red; }`.
- Sets the `textContent` of `[gg-form-field-error="<name>"]` elements to the matching message.
- Populates `[gg-form-error-list]` using the same template pattern as `gg-data-list` (clones `[gg-list-template]`, applies `gg-field` bindings).
- Sets the `textContent` of `[gg-form-error]` to the top-level `error` string.
- All errors are cleared at the start of each submit, and a field's invalid attr + message are cleared when the user types in that field.

## Form visibility

Conditionally show/hide elements based on form field values.

```html
<form>
  <label><input type="radio" name="reason" value="scheduling" /> Scheduling</label>
  <label><input type="radio" name="reason" value="other" /> Other</label>

  <div gg-visible-when="reason:other">
    <input type="text" name="other_reason" placeholder="Please specify" />
  </div>
</form>
```

For checkboxes, use the `:checked` / `:unchecked` sentinels — these read the input's `.checked` property directly, since a checkbox's `value` attribute (often `"on"` by default) doesn't reflect its ticked state.

```html
<form>
  <label><input type="checkbox" name="subscribe" /> Subscribe</label>

  <div gg-visible-when="subscribe:checked">Shown only when ticked.</div>
  <div gg-visible-when="subscribe:unchecked">Shown only when not ticked.</div>
</form>
```

The strings `checked` and `unchecked` are reserved: a checkbox whose `value` attribute is literally `"checked"` or `"unchecked"` will be interpreted as the sentinel rather than a value match.

Hidden elements get `display: none`, `inert`, and `aria-hidden="true"`. Transitions are a 200ms opacity fade. Use `gg-form-scope` on a non-`<form>` ancestor when `closest("form")` can't reach the inputs (e.g. shadow DOM).
