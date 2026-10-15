# pop-budget-debt-list



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute      | Description                                                                                                                                                                   | Type                     | Default |
| ------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------- |
| `debts`       | `debts`        | Debts to render — an array (property binding) OR a JSON string (attribute, how Storybook / plain HTML pass them), parsed defensively.                                         | `BudgetDebt[] \| string` | `[]`    |
| `hideToolbar` | `hide-toolbar` | Suppress the built-in toolbar (the Total Owed line + Add Debt). Set when a host renders its own debt summary so the total isn't shown twice. Default false → self-sufficient. | `boolean`                | `false` |
| `loading`     | `loading`      |                                                                                                                                                                               | `boolean`                | `false` |


## Events

| Event         | Description | Type                      |
| ------------- | ----------- | ------------------------- |
| `popDebtAdd`  |             | `CustomEvent<void>`       |
| `popDebtEdit` |             | `CustomEvent<BudgetDebt>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
