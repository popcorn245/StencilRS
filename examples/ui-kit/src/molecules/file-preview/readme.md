# pop-file-preview



<!-- Auto Generated Below -->


## Properties

| Property | Attribute | Description                             | Type     | Default |
| -------- | --------- | --------------------------------------- | -------- | ------- |
| `files`  | `files`   | JSON array of {name, url, type} objects | `string` | `'[]'`  |


## Events

| Event           | Description                                                  | Type                  |
| --------------- | ------------------------------------------------------------ | --------------------- |
| `popFileRemove` | Emitted when a file remove button is clicked, with the index | `CustomEvent<number>` |


## Dependencies

### Used by

 - [pop-message-box](../../organisms/message-box)

### Graph
```mermaid
graph TD;
  pop-message-box --> pop-file-preview
  style pop-file-preview fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
