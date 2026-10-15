# pop-conflict-resolver



<!-- Auto Generated Below -->


## Properties

| Property | Attribute | Description                                                   | Type     | Default      |
| -------- | --------- | ------------------------------------------------------------- | -------- | ------------ |
| `label`  | `label`   | Human-readable label for the document (e.g. "Note · abc123…") | `string` | `'Document'` |
| `local`  | `local`   | JSON string of the local version of the document              | `string` | `'{}'`       |
| `remote` | `remote`  | JSON string of the remote version of the document             | `string` | `'{}'`       |


## Events

| Event             | Description                                      | Type                                        |
| ----------------- | ------------------------------------------------ | ------------------------------------------- |
| `dismissConflict` | Emitted when user dismisses without resolving    | `CustomEvent<void>`                         |
| `resolve`         | Emitted when user picks keep_local or use_remote | `CustomEvent<"keep_local" \| "use_remote">` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
