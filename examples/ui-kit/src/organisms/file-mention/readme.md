# pop-file-mention



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute     | Description                                                 | Type                 | Default                       |
| ------------- | ------------- | ----------------------------------------------------------- | -------------------- | ----------------------------- |
| `disabled`    | `disabled`    |                                                             | `boolean`            | `false`                       |
| `files`       | `files`       | JSON-encoded string array OR raw string array of file paths | `string \| string[]` | `'[]'`                        |
| `placeholder` | `placeholder` |                                                             | `string`             | `'Type @ to mention a file…'` |
| `value`       | `value`       |                                                             | `string`             | `''`                          |


## Events

| Event             | Description               | Type                                   |
| ----------------- | ------------------------- | -------------------------------------- |
| `filesReferenced` | Fires whenever the set of | `CustomEvent<string[]>`                |
| `mentionChange`   |                           | `CustomEvent<FileMentionChangeDetail>` |
| `mentionSubmit`   |                           | `CustomEvent<FileMentionSubmitDetail>` |


## Shadow Parts

| Part         | Description |
| ------------ | ----------- |
| `"textarea"` |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
