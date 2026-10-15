# pop-budget-transaction-list



<!-- Auto Generated Below -->


## Properties

| Property       | Attribute      | Description                                                                                                                                                                                                      | Type                            | Default |
| -------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------- |
| `hideToolbar`  | `hide-toolbar` | Suppress the built-in toolbar (filter pills + search + Add). Set when a host already owns filtering/search/add (e.g. the Bucket Hub) so the two don't stack. Default false → the organism stays self-sufficient. | `boolean`                       | `false` |
| `loading`      | `loading`      |                                                                                                                                                                                                                  | `boolean`                       | `false` |
| `transactions` | `transactions` | Rows to render — an array (property binding) OR a JSON string (attribute, how Storybook / plain HTML pass them), parsed defensively.                                                                             | `BudgetTransaction[] \| string` | `[]`    |


## Events

| Event                  | Description | Type                             |
| ---------------------- | ----------- | -------------------------------- |
| `popAddTransaction`    |             | `CustomEvent<void>`              |
| `popTransactionDelete` |             | `CustomEvent<string>`            |
| `popTransactionEdit`   |             | `CustomEvent<BudgetTransaction>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
