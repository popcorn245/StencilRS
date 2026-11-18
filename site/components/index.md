---
title: "Components"
description: "Live custom elements compiled by stencilrs. Ionic's component pages are coming."
---

# Components

::: tip Ionic pages are coming
Ionic Framework's core, about 95 components, is the proving ground for stencilrs: it is being built
with the Vite plugin, and each component will get a page here with a live demo and an API table
generated from stencilrs' own metadata. Until then this section shows the starter project's
components, so you can see the layout and the live demos working. Ionic is the test subject, never
our branding.
:::

## Live now

Everything below is a real custom element, compiled by stencilrs inside this site's own build.

<Demo caption="pop-counter: click it, then change its label and step on the component page">
  <pop-counter label="Clicks" step="2"></pop-counter>
</Demo>

| Component | What it is |
|---|---|
| [`pop-counter`](/components/pop-counter) | A shadow-DOM counter with a prop, a state, an event and a method. |

More starter components (`pop-greeting`, `pop-press-button`, `pop-tone-chip`, `pop-toggle`, and the
form-associated `pop-date-field`) are in the [Storybook](/storybook/), with the ui-kit's 136.

## What a component page will hold

- A live demo, compiled by stencilrs as the page loads.
- Usage, with the markup to copy.
- An API table: properties, events, methods, CSS parts and custom properties, from the compiler's metadata.
