# pop-user-select



<!-- Auto Generated Below -->


## Overview

pop-user-select — a reusable, drop-anywhere people picker.

A chip field + suggestion popover driven entirely by an injected async
`resolve(query)` source, so it carries no knowledge of any backend. Selected
people render as removable chips; typing debounce-searches the source and
shows avatar/name/email rows in a popover. With `allow-free-text`, a typed
email that matches nothing can be added as a manual chip.

## Properties

| Property        | Attribute         | Description                                                              | Type                                       | Default            |
| --------------- | ----------------- | ------------------------------------------------------------------------ | ------------------------------------------ | ------------------ |
| `allowFreeText` | `allow-free-text` | Accept a typed email that matches no suggestion as a manual chip.        | `boolean`                                  | `false`            |
| `debounce`      | `debounce`        | Debounce (ms) before each resolve() call.                                | `number`                                   | `250`              |
| `label`         | `label`           | Accessible label for the field + popover.                                | `string`                                   | `'People'`         |
| `max`           | `max`             | Max selections (0 = unlimited).                                          | `number`                                   | `0`                |
| `minChars`      | `min-chars`       | Minimum characters before searching.                                     | `number`                                   | `1`                |
| `placeholder`   | `placeholder`     | Placeholder shown when nothing is selected.                              | `string`                                   | `'Search people…'` |
| `resolve`       | --                | Async source returning matches for a query. REQUIRED for search to work. | `(query: string) => Promise<UserOption[]>` | `undefined`        |
| `value`         | --                | Selected people (controlled).                                            | `UserOption[]`                             | `[]`               |


## Events

| Event          | Description                                            | Type                        |
| -------------- | ------------------------------------------------------ | --------------------------- |
| `valueChanged` | Emitted whenever the selection changes (add / remove). | `CustomEvent<UserOption[]>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
