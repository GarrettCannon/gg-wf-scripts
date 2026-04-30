# Installation

Install from npm:

```sh
npm install gg-wf-scripts
```

The package ships as ESM with TypeScript declarations. You can import the entry point directly:

```js
import { init } from "gg-wf-scripts";
```

## Bundling for Webflow

Webflow's custom code embed loads a `<script>` tag, so you'll bundle your site-specific code into a single IIFE file and host it somewhere reachable (a CDN, your own infra, GitHub Pages, etc.).

```sh
npx esbuild src/index.js \
  --bundle \
  --outfile=dist/site.js \
  --format=iife \
  --target=es2020 \
  --platform=browser
```

Then on the Webflow site, add to the page or site footer:

```html
<script src="https://your-cdn.com/site.js"></script>
```

## TypeScript

Types are bundled. No extra `@types/*` package is needed.

```ts
import { init } from "gg-wf-scripts";
```
