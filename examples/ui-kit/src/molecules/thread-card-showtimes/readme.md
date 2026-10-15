# pop-thread-card-showtimes



<!-- Auto Generated Below -->


## Overview

pop-thread-card-showtimes — the Thread Model v2 renderer for a movie
showtimes card.

THEATER-FIRST by design: the theater name is the heading of each group and
the showtimes hang under it as chips. This card NEVER renders ticket links.

Both actions ("Open theater", "Add to calendar") are navigational, so they
survive a freeze; `readonly` still removes them.

  payload.data = { date: string; movie: string;
                   theaters: { name, times[], address? }[]; timezone?: string }

## Properties

| Property               | Attribute  | Description                                                              | Type                 | Default     |
| ---------------------- | ---------- | ------------------------------------------------------------------------ | -------------------- | ----------- |
| `liveness`             | `liveness` | `frozen` = historical snapshot (a past date): muted chrome.              | `"frozen" \| "live"` | `'live'`    |
| `payload` _(required)_ | --         | The validated card payload object (set as a PROPERTY, not an attribute). | `CardPayload`        | `undefined` |
| `readonly`             | `readonly` | Viewer / public render — no action buttons at all.                       | `boolean`            | `false`     |


## Events

| Event           | Description                                           | Type                            |
| --------------- | ----------------------------------------------------- | ------------------------------- |
| `popCardAction` | Emitted when the user taps one of the card's actions. | `CustomEvent<CardActionDetail>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
