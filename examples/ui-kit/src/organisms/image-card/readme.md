# pop-image-card



<!-- Auto Generated Below -->


## Overview

pop-image-card — a shared image-forward card: a media area on top (an <img>
fallback, or a `media` slot for a proxied/authed thumb) with content beneath
(title / tags / quantity via the default slot) and an optional `actions` row.

Modeled on pop-quest-card (clickable content-under-media, a composed+bubbling
`cardSelect` event) and the hub-images card CSS. The aspect-ratio lives on the
media WRAPPER (a block box), never the replaced <img> — an `<img aspect-ratio>`
in a grid track collapses the row.

Slots:
  • media   — replaces the fallback <img> (e.g. a token-authenticated thumb).
  • default — the card body (title, tags, qty stepper …).
  • actions — a footer action row (Send / Save …).

## Properties

| Property    | Attribute    | Description                                                                 | Type      | Default     |
| ----------- | ------------ | --------------------------------------------------------------------------- | --------- | ----------- |
| `alt`       | `alt`        | Alt text for the fallback <img>.                                            | `string`  | `''`        |
| `aspect`    | `aspect`     | CSS aspect-ratio for the media wrapper (e.g. '1/1', '4/3', '16/9').         | `string`  | `'1/1'`     |
| `cardId`    | `card-id`    | Optional id echoed back in the `cardSelect` event detail.                   | `string`  | `''`        |
| `cardTitle` | `card-title` | Optional title rendered above the default slot content.                     | `string`  | `undefined` |
| `clickable` | `clickable`  | Whether the whole card is a button (emits `cardSelect` on click/Enter).     | `boolean` | `false`     |
| `href`      | `href`       | When set, the card renders as an <a href> instead of emitting.              | `string`  | `undefined` |
| `src`       | `src`        | Image URL for the fallback <img> (ignored when the `media` slot is filled). | `string`  | `''`        |


## Events

| Event        | Description                                                           | Type                  |
| ------------ | --------------------------------------------------------------------- | --------------------- |
| `cardSelect` | Emitted when a `clickable` card is activated (click / Enter / Space). | `CustomEvent<string>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
