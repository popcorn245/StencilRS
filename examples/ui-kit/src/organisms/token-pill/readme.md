# pop-token-pill



<!-- Auto Generated Below -->


## Properties

| Property    | Attribute    | Description                                                     | Type                                        | Default     |
| ----------- | ------------ | --------------------------------------------------------------- | ------------------------------------------- | ----------- |
| `budgetPct` | `budget-pct` | Explicit budget percentage from the server (0 to 1+)            | `number`                                    | `undefined` |
| `limit`     | `limit`      | The maximum context window size (default 8192)                  | `number`                                    | `8192`      |
| `ratio`     | `ratio`      | Multiplier for char-to-token estimation (Standard is ~4)        | `number`                                    | `4`         |
| `showLabel` | `show-label` | Whether to show the numerical label                             | `boolean`                                   | `true`      |
| `state`     | `state`      | Explicit meter state from the server                            | `"compact" \| "normal" \| "over" \| "warn"` | `undefined` |
| `text`      | `text`       | The text string to calculate tokens from (estimation)           | `string`                                    | `''`        |
| `tokens`    | `tokens`     | Explicit token count (overrides 'text' calculation if provided) | `number`                                    | `undefined` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
