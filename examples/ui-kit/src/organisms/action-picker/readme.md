# pop-action-picker



<!-- Auto Generated Below -->


## Properties

| Property        | Attribute         | Description                                       | Type      | Default |
| --------------- | ----------------- | ------------------------------------------------- | --------- | ------- |
| `actionTagName` | `action-tag-name` | Name of the scanned tag (displayed in the header) | `string`  | `''`    |
| `actions`       | `actions`         | JSON-encoded array of TagAction objects           | `string`  | `'[]'`  |
| `open`          | `open`            | Whether the picker is open                        | `boolean` | `false` |


## Events

| Event            | Description                                | Type                     |
| ---------------- | ------------------------------------------ | ------------------------ |
| `actionSelected` | Emitted when the user selects an action    | `CustomEvent<TagAction>` |
| `pickerDismiss`  | Emitted when the user dismisses the picker | `CustomEvent<void>`      |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
