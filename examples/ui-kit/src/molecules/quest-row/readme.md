# pop-quest-row



<!-- Auto Generated Below -->


## Properties

| Property         | Attribute         | Description                                                               | Type     | Default |
| ---------------- | ----------------- | ------------------------------------------------------------------------- | -------- | ------- |
| `emoji`          | `emoji`           | Quest emoji                                                               | `string` | `''`    |
| `heading`        | `heading`         | Quest title (named 'heading' to avoid conflict with HTML title attribute) | `string` | `''`    |
| `priority`       | `priority`        | Priority level                                                            | `string` | `''`    |
| `questId`        | `quest-id`        | Quest document ID                                                         | `string` | `''`    |
| `tasksCompleted` | `tasks-completed` | Completed task count                                                      | `number` | `0`     |
| `tasksTotal`     | `tasks-total`     | Total task count                                                          | `number` | `0`     |


## Events

| Event         | Description                          | Type                                |
| ------------- | ------------------------------------ | ----------------------------------- |
| `questSelect` | Row tapped, navigate to quest detail | `CustomEvent<{ questId: string; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
