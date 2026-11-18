---
title: "Components"
description: "One page per Ionic Framework component, every live demo compiled by stencilrs."
---

<script setup>
import { data as ionic } from '../data/ionic.data.ts';
</script>

# Components

One page per component of [Ionic Framework](https://ionicframework.com)'s `core`
({{ ionic.stats.components }} components, {{ ionic.stats.properties }} properties,
{{ ionic.stats.events }} events and {{ ionic.stats.methods }} methods). Each page has an overview, live demos
you can switch between Ionic's iOS and Material Design modes, and the API tables.

::: info Where this comes from
The components are **Ionic Framework** ({{ ionic.source.version }}, MIT), the proving ground for stencilrs: Ionic's
source is fetched and migrated to Stencil v5 by [`examples/ionic`](https://github.com/popcorn245/StencilRS/tree/next/examples/ionic),
then compiled **in this site's own build** by the stencilrs Vite plugin. Ionic is the source of these components and
their documentation text, not our brand; it is credited on every page. The API tables are made by stencilrs'
`analyze()` and checked against Stencil's own docs-json: see [how the data is checked](#how-the-api-data-is-checked).
:::

<div class="ion-index">
  <section v-for="g in ionic.groups" :key="g.name" class="ion-index-group">
    <h2 :id="g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')">{{ g.name }}</h2>
    <ul>
      <li v-for="t in g.tags" :key="t"><a :href="`./${t.replace(/^ion-/, '')}.html`"><code>{{ t }}</code></a></li>
    </ul>
  </section>
</div>

## The starter project's components

Not Ionic: the components of the repository's own `examples/starter`, compiled the same way.

<Demo caption="pop-counter: click it, then change its label and step on the component page">
  <pop-counter label="Clicks" step="2"></pop-counter>
</Demo>

| Component | What it is |
|---|---|
| [`pop-counter`](./pop-counter) | A shadow-DOM counter with a prop, a state, an event and a method. |

More starter components (`pop-greeting`, `pop-press-button`, `pop-tone-chip`, `pop-toggle`, and the
form-associated `pop-date-field`) are in the [Storybook](/storybook/), with the ui-kit's 136.

## How the API data is checked

The tables come from `analyze()` with `resolveImports` and `complexTypes` over the migrated Ionic source
(`site/scripts/components.mjs`), plus the `@prop` comments of each component's `.scss`. Everything it produces is
compared with the `docs-json` of Stencil's own `stencil build` of the same source, member by member.

- **{{ ionic.stats.fallbacks }} member types** are ones `analyze()` reports as `stencilrs: ... is not ported yet` (they need the
  type checker: [quirk 18](../guide/quirks)). Those pages show Stencil's docs-json value for the type, marked with †.
- **{{ ionic.diff.differences }} differences** remain, in {{ ionic.diff.componentsWithDifferences }} components: each is a compiler
  finding, listed in
  [`site/data/ionic-api-diff.json`](https://github.com/popcorn245/StencilRS/blob/next/site/data/ionic-api-diff.json).
