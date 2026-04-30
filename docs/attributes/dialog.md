# Dialog

A single `<dialog>` element on the page is managed automatically via the `modal` URL param.

```html
<div gg-query-set="modal:confirm,id:42">Delete</div>

<dialog>
  <p>Are you sure?</p>
  <button gg-query-remove="modal,id">Cancel</button>
</dialog>
```

## How it works

- Setting `?modal=...` opens the dialog.
- Removing the `modal` param closes it.
- Pressing `Escape` closes it.
- Clicking the backdrop closes it.
- Back-button navigation is handled automatically.

You can have multiple dialog "views" inside the same `<dialog>` element by combining with the [content switcher](/attributes/switcher):

```html
<dialog>
  <div gg-switch-query="modal">
    <section gg-case="confirm">Are you sure?</section>
    <section gg-case="edit">Edit form…</section>
  </div>
</dialog>
```
