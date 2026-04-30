---
layout: home

hero:
  name: gg-wf-scripts
  text: Declarative attributes for Webflow.
  tagline: Add gg-* attributes to your markup and the library handles data binding, URL-driven state, dialogs, auth gating, form visibility, and user actions. Backend-agnostic — bring your own client.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/GarrettCannon/gg-wf-scripts

features:
  - title: Data binding
    details: Populate fields, forms, and lists straight from your queries with gg-data, gg-data-form, and gg-data-list.
  - title: URL-driven state
    details: Read and write query params declaratively. Two-way input binding with debounce. Re-run queries when params change.
  - title: Forms with validation
    details: Override submit, surface field-level errors via attributes, and toggle visibility based on field values.
  - title: Auth gating
    details: Show or hide elements with gg-auth and gg-role. Bring any backend — provide a tiny adapter.
  - title: Loading states
    details: gg-loading is set automatically while actions, queries, and form submits are in flight. Style spinners purely in CSS.
  - title: Backend-agnostic
    details: Use Supabase, fetch, or anything else. Register queries and actions, attach attributes, ship.
---
