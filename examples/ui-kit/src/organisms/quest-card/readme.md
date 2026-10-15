# pop-quest-card



<!-- Auto Generated Below -->


## Properties

| Property          | Attribute          | Description                                            | Type                                                | Default    |
| ----------------- | ------------------ | ------------------------------------------------------ | --------------------------------------------------- | ---------- |
| `emoji`           | `emoji`            | Display emoji for the quest                            | `string`                                            | `'🗺️'`    |
| `eventsCompleted` | `events-completed` | Number of completed events (past events count as done) | `number`                                            | `0`        |
| `eventsTotal`     | `events-total`     | Total number of events                                 | `number`                                            | `0`        |
| `hasResearch`     | `has-research`     | Has an associated research session (shows 🔬 badge)    | `boolean`                                           | `false`    |
| `heading`         | `heading`          | Quest title                                            | `string`                                            | `''`       |
| `priority`        | `priority`         | Optional priority: high \| medium \| low               | `"" \| "high" \| "low" \| "medium"`                 | `''`       |
| `questId`         | `quest-id`         | Quest ID                                               | `string`                                            | `''`       |
| `status`          | `status`           | Status: active \| paused \| completed \| archived      | `"active" \| "archived" \| "completed" \| "paused"` | `'active'` |
| `tasksCompleted`  | `tasks-completed`  | Number of completed tasks                              | `number`                                            | `0`        |
| `tasksTotal`      | `tasks-total`      | Total number of tasks                                  | `number`                                            | `0`        |


## Events

| Event         | Description                      | Type                  |
| ------------- | -------------------------------- | --------------------- |
| `questSelect` | Emitted when the card is clicked | `CustomEvent<string>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
