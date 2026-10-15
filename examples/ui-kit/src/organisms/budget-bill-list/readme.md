# pop-budget-bill-list



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute      | Description                                                                                                                                     | Type                     | Default |
| ------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------- |
| `bills`       | `bills`        | Bills to render — an array (property binding) OR a JSON string (attribute, how Storybook / plain HTML pass them), parsed defensively.           | `BudgetBill[] \| string` | `[]`    |
| `hideToolbar` | `hide-toolbar` | Suppress the built-in toolbar (view tabs + Add Bill). Set when a host owns those controls so they don't stack. Default false → self-sufficient. | `boolean`                | `false` |
| `loading`     | `loading`      |                                                                                                                                                 | `boolean`                | `false` |


## Events

| Event         | Description | Type                      |
| ------------- | ----------- | ------------------------- |
| `popBillAdd`  |             | `CustomEvent<void>`       |
| `popBillEdit` |             | `CustomEvent<BudgetBill>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
