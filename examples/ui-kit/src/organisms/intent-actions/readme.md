# pop-intent-actions



<!-- Auto Generated Below -->


## Properties

| Property       | Attribute       | Description                                                                     | Type     | Default |
| -------------- | --------------- | ------------------------------------------------------------------------------- | -------- | ------- |
| `goal`         | `goal`          | Goal statement from AI goal inference                                           | `string` | `''`    |
| `intents`      | `intents`       | JSON string of ParsedIntent[] — recommended items (checked by default)          | `string` | `'[]'`  |
| `otherIntents` | `other-intents` | JSON string of ParsedIntent[] — other/supplemental items (unchecked by default) | `string` | `'[]'`  |
| `summary`      | `summary`       | Plan summary from AI                                                            | `string` | `''`    |


## Events

| Event            | Description                                                                     | Type                          |
| ---------------- | ------------------------------------------------------------------------------- | ----------------------------- |
| `intentsConfirm` | Emitted when user confirms selected intents — detail is accepted ParsedIntent[] | `CustomEvent<ParsedIntent[]>` |
| `intentsDismiss` | Emitted when user dismisses the sheet                                           | `CustomEvent<void>`           |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
