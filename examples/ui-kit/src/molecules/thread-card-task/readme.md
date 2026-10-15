# pop-thread-card-task



<!-- Auto Generated Below -->


## Overview

pop-thread-card-task — the Thread Model v2 renderer for a task card.

Shows the task title, its due date, a priority chip and assignee NAME chips.
"Complete" and "Reassign" mutate and disappear once the card is frozen;
"Open in Tasks" is navigational and survives a freeze.

  payload.data = { taskId: string; status: string; dueDate?: string|null;
                   priority?: string|null; questTitle?: string|null }

## Properties

| Property               | Attribute  | Description                                                              | Type                 | Default     |
| ---------------------- | ---------- | ------------------------------------------------------------------------ | -------------------- | ----------- |
| `liveness`             | `liveness` | `frozen` = historical snapshot: muted chrome, no mutating actions.       | `"frozen" \| "live"` | `'live'`    |
| `payload` _(required)_ | --         | The validated card payload object (set as a PROPERTY, not an attribute). | `CardPayload`        | `undefined` |
| `readonly`             | `readonly` | Viewer / public render — no action buttons at all.                       | `boolean`            | `false`     |


## Events

| Event           | Description                                           | Type                            |
| --------------- | ----------------------------------------------------- | ------------------------------- |
| `popCardAction` | Emitted when the user taps one of the card's actions. | `CustomEvent<CardActionDetail>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
