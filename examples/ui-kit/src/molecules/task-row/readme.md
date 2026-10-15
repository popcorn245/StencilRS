# pop-task-row



<!-- Auto Generated Below -->


## Properties

| Property     | Attribute     | Description                                                              | Type     | Default    |
| ------------ | ------------- | ------------------------------------------------------------------------ | -------- | ---------- |
| `assignedTo` | `assigned-to` | JSON array of assignee UIDs                                              | `string` | `'[]'`     |
| `dueDate`    | `due-date`    | ISO date string                                                          | `string` | `null`     |
| `error`      | `error`       | Inline error message to display                                          | `string` | `null`     |
| `heading`    | `heading`     | Task title (named 'heading' to avoid conflict with HTML title attribute) | `string` | `''`       |
| `priority`   | `priority`    | One of: urgent, high, medium, low                                        | `string` | `'medium'` |
| `questEmoji` | `quest-emoji` | Emoji of parent quest (displayed as chip)                                | `string` | `null`     |
| `questTitle` | `quest-title` | Title of parent quest                                                    | `string` | `null`     |
| `status`     | `status`      | One of: open, in_progress, review, done, blocked, skipped, cancelled     | `string` | `'open'`   |
| `taskId`     | `task-id`     | Task document ID                                                         | `string` | `''`       |


## Events

| Event        | Description                                    | Type                                                  |
| ------------ | ---------------------------------------------- | ----------------------------------------------------- |
| `taskMenu`   | Ellipsis menu button tapped                    | `CustomEvent<{ taskId: string; }>`                    |
| `taskSelect` | Row tapped — for future right-pane integration | `CustomEvent<{ taskId: string; }>`                    |
| `taskToggle` | Checkbox toggled (open<->done)                 | `CustomEvent<{ taskId: string; newStatus: string; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
