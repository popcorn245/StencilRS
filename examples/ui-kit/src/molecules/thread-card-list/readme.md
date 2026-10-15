# pop-thread-card-list



<!-- Auto Generated Below -->


## Overview

pop-thread-card-list — the Thread Model v2 renderer for a grocery / inventory
list card.

Renders a checkbox list with an "N left" count. Tapping a line emits
`popCardAction` with `{ actionId: 'check', params: { lineId, checked } }` —
the per-line tap IS the check action, so there is no footer check button.
Frozen cards render the lines read-only and struck through.

  payload.data = { lines: { id, label, checked, qty? }[];
                   postedAt: number; listId?: string }

## Properties

| Property               | Attribute  | Description                                                              | Type                 | Default     |
| ---------------------- | ---------- | ------------------------------------------------------------------------ | -------------------- | ----------- |
| `liveness`             | `liveness` | `frozen` = historical snapshot: muted chrome, read-only lines.           | `"frozen" \| "live"` | `'live'`    |
| `payload` _(required)_ | --         | The validated card payload object (set as a PROPERTY, not an attribute). | `CardPayload`        | `undefined` |
| `readonly`             | `readonly` | Viewer / public render — no action buttons, no line taps.                | `boolean`            | `false`     |


## Events

| Event           | Description                                                     | Type                            |
| --------------- | --------------------------------------------------------------- | ------------------------------- |
| `popCardAction` | Emitted when the user taps a line or one of the card's actions. | `CustomEvent<CardActionDetail>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
