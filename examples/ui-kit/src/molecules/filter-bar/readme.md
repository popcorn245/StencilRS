# pop-filter-bar



<!-- Auto Generated Below -->


## Overview

A compact filter bar with a popover and dismissible chips for active filters.
Pass filter definitions as JSON via the `filters` prop.
Optionally provide an icon URL via `iconSrc` (defaults to a built-in funnel SVG path).

## Properties

| Property  | Attribute  | Description                                                            | Type     | Default                             |
| --------- | ---------- | ---------------------------------------------------------------------- | -------- | ----------------------------------- |
| `filters` | `filters`  | JSON array of FilterDef objects                                        | `string` | `'[]'`                              |
| `iconSrc` | `icon-src` | URL to the filter icon SVG. Defaults to the app's funnel-outline icon. | `string` | `'/images/icon/funnel-outline.svg'` |
| `iconSvg` | `icon-svg` | Raw SVG string for the filter icon. If provided, overrides iconSrc.    | `string` | `''`                                |


## Events

| Event             | Description                                                                  | Type                                          |
| ----------------- | ---------------------------------------------------------------------------- | --------------------------------------------- |
| `popFilterChange` | Emitted when a filter value changes. Detail: `{ id: string, value: string }` | `CustomEvent<{ id: string; value: string; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
