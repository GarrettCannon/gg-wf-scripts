# Getting started

`gg-wf-scripts` is a declarative attribute engine for Webflow sites. Add `gg-*` attributes to your markup and the library handles data binding, URL-driven state, dialogs, auth gating, form visibility, and user actions. Backend-agnostic — bring your own client (Supabase, fetch, anything).

## Quick start

Create a site-specific entry file, register your queries and actions, then bundle it with esbuild.

```js
import { init } from "gg-wf-scripts";
import { createClient } from "@supabase/supabase-js";

const sb = createClient("https://your-project.supabase.co", "your-publishable-key");

const app = init({
  context: { sb },
  auth: {
    getUser: async () => (await sb.auth.getUser()).data.user?.id ?? null,
    onChange: (cb) => sb.auth.onAuthStateChange((_e, session) => cb(session?.user?.id ?? null)),
  },
});

app.addQuery("posts_list", async ({ sb }, params) => {
  const q = params.get("q") ?? "";
  const { data } = await sb
    .from("posts")
    .select("*")
    .ilike("title", `%${q}%`)
    .order("created_at", { ascending: false });
  return data ?? [];
});

app.addAction("delete_post", async ({ sb }, { id }) => {
  const { error } = await sb.from("posts").delete().eq("id", id);
  return error ? { ok: false, error } : { ok: true };
});

app.start();
```

Bundle with esbuild:

```sh
npx esbuild src/index.js --bundle --outfile=dist/site.js --format=iife --target=es2020 --platform=browser
```

Load on your site:

```html
<script src="https://your-cdn.com/site.js"></script>
```

## Optional: fade transitions

By default every show/hide is an instant `display:none` flip. Pass a `transition` to `init` to fade everything (auth gating, switch cases, form-visibility, data-list rows) through a single global setting:

```js
const app = init({
  context: { sb },
  transition: { duration: 200, easing: "easeInOut" },
});
```

See [Transitions in the init reference](/api/init#transitions) for the easing keywords and the `prefers-reduced-motion` behavior.

## Next steps

- [Install the library](/guide/installation)
- [Data binding attributes](/attributes/data)
- [Form actions and validation](/attributes/forms)
- [API reference](/api/init)
