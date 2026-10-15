# pop-gallery



<!-- Auto Generated Below -->


## Overview

A slot-based image gallery with scroll-snap navigation.
Pass slides as children with class `.gallery-slide`.

When `collapsible` is true the gallery starts collapsed (slim strip with dot count).
Clicking the strip expands it to the full gallery.

Zoom: Ctrl+Scroll or pinch to zoom. Drag to pan when zoomed.
CSS custom properties `--gallery-scale`, `--gallery-tx`, `--gallery-ty` are
set on the root and consumed by the slide styles.

## Properties

| Property      | Attribute     | Description                                             | Type      | Default |
| ------------- | ------------- | ------------------------------------------------------- | --------- | ------- |
| `collapsible` | `collapsible` | When true, starts collapsed. Click the strip to expand. | `boolean` | `false` |


## Methods

### `collapse() => Promise<void>`

Collapse the gallery.

#### Returns

Type: `Promise<void>`



### `expand() => Promise<void>`

Expand the gallery.

#### Returns

Type: `Promise<void>`



### `getCurrentIndex() => Promise<number>`

Get current slide index.

#### Returns

Type: `Promise<number>`



### `getTotal() => Promise<number>`

Get total slides.

#### Returns

Type: `Promise<number>`



### `goTo(index: number) => Promise<void>`

Navigate to a specific slide (0-based, wraps).

#### Parameters

| Name    | Type     | Description |
| ------- | -------- | ----------- |
| `index` | `number` |             |

#### Returns

Type: `Promise<void>`



### `next() => Promise<void>`

Navigate to the next slide.

#### Returns

Type: `Promise<void>`



### `prev() => Promise<void>`

Navigate to the previous slide.

#### Returns

Type: `Promise<void>`



### `resetZoom() => Promise<void>`

Reset zoom level to 1×.

#### Returns

Type: `Promise<void>`



### `toggleFullscreen() => Promise<void>`

Toggle browser fullscreen for the gallery.

#### Returns

Type: `Promise<void>`



### `zoomIn() => Promise<void>`

Zoom in by a step.

#### Returns

Type: `Promise<void>`



### `zoomOut() => Promise<void>`

Zoom out by a step.

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
