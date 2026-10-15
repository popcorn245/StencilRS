# pop-bulk-bar



<!-- Auto Generated Below -->


## Overview

pop-bulk-bar — the MULTI-SELECT action bar (molecule) that appears while a
list/grid is in selection mode: "N selected", the host's action buttons
(slotted — validity is the host's call), and a Done exit.

Reusable shape (panel-storybook pattern): the bar owns only the chrome —
count pill, slot, Done. Which actions render (and what they do) stays in the
host panel; buttons dropped in the slot inherit the bar's pill styling via
`.bulk__act` (or bring their own classes).

Sticky-bottom by default (`position: sticky; bottom: 0`) so it stays
thumb-reachable over long lists; hosts can override positioning freely.

## Properties

| Property    | Attribute    | Description                                               | Type      | Default      |
| ----------- | ------------ | --------------------------------------------------------- | --------- | ------------ |
| `busy`      | `busy`       | Busy: a bulk request is running — every control disables. | `boolean` | `false`      |
| `count`     | `count`      | How many items are selected (the count pill).             | `number`  | `0`          |
| `doneLabel` | `done-label` | Done/exit button label.                                   | `string`  | `'Done'`     |
| `label`     | `label`      | Noun after the count (e.g. "selected", "cards").          | `string`  | `'selected'` |


## Events

| Event         | Description                        | Type                |
| ------------- | ---------------------------------- | ------------------- |
| `popBulkDone` | Exit selection mode (Done tapped). | `CustomEvent<void>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
