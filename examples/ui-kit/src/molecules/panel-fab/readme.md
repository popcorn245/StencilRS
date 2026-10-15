# pop-panel-fab



<!-- Auto Generated Below -->


## Overview

`pop-panel-fab` — the bottom-right floating action button for a data panel,
with an expanding tray for that panel's LIST CONTROLS.

Two jobs in one control, because they compete for the same corner:

 • **Primary action** — the panel's one create verb ("Add recipe", "New tag").
   Set `action` to render it as the FAB's own tap target.
 • **List controls** — view switcher / search / filter-sort, slotted into
   `controls`. They live in a tray that expands above the button.

With both, the FAB shows the primary action and a small chevron that opens
the tray. With only one, the FAB *is* that one thing and there is no chevron
— a disclosure control that reveals nothing is worse than no control.

## Placement is the consumer's job, on purpose

The host is `position: absolute` against the nearest positioned ancestor, NOT
`fixed`. The bucket-hub panels this is built for render inside three
different presentation tiers (bottom sheet, dialog, dock) and two of them
keep persistent CSS transforms, which re-base fixed positioning onto the
transformed box rather than the viewport. Absolute + a positioned ancestor
behaves identically in all three.

Safe-area inset is handled here (`env(safe-area-inset-bottom)`) so a sheet
pinned to the bottom of a phone screen doesn't put the FAB under the home
indicator.

## Properties

| Property        | Attribute        | Description                                                              | Type      | Default           |
| --------------- | ---------------- | ------------------------------------------------------------------------ | --------- | ----------------- |
| `action`        | `action`         | Primary action label. Empty → the FAB is a controls-tray toggle only.    | `string`  | `''`              |
| `compact`       | `compact`        | Hide the label and render the primary action as an icon-only circle.     | `boolean` | `false`           |
| `controlsLabel` | `controls-label` | Accessible name for the tray toggle.                                     | `string`  | `'List controls'` |
| `disabled`      | `disabled`       | Disable the primary action (a busy panel, an incomplete precondition).   | `boolean` | `false`           |
| `icon`          | `icon`           | Ionicon name for the primary action.                                     | `string`  | `'add'`           |
| `noControls`    | `no-controls`    | Set when the panel has no list controls — suppresses the tray + chevron. | `boolean` | `false`           |


## Events

| Event       | Description                    | Type                |
| ----------- | ------------------------------ | ------------------- |
| `popAction` | The primary action was tapped. | `CustomEvent<void>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
