# pop-task-accordion



<!-- Auto Generated Below -->


## Properties

| Property     | Attribute     | Description                                                                 | Type     | Default    |
| ------------ | ------------- | --------------------------------------------------------------------------- | -------- | ---------- |
| `assignedTo` | `assigned-to` | JSON array of assignee UIDs                                                 | `string` | `'[]'`     |
| `dueDate`    | `due-date`    | ISO date                                                                    | `string` | `null`     |
| `heading`    | `heading`     | Current title (named 'heading' to avoid conflict with HTML title attribute) | `string` | `''`       |
| `members`    | `members`     | JSON array of {uid, name} for assignee picker                               | `string` | `'[]'`     |
| `noteId`     | `note-id`     | Linked note ID                                                              | `string` | `null`     |
| `priority`   | `priority`    | Current priority                                                            | `string` | `'medium'` |
| `questId`    | `quest-id`    | Current quest ID                                                            | `string` | `null`     |
| `quests`     | `quests`      | JSON array of {id, emoji, title} for quest picker                           | `string` | `'[]'`     |
| `status`     | `status`      | Current status                                                              | `string` | `'open'`   |
| `taskId`     | `task-id`     | Task document ID                                                            | `string` | `''`       |


## Events

| Event        | Description                           | Type                                                          |
| ------------ | ------------------------------------- | ------------------------------------------------------------- |
| `taskDelete` | Delete button pressed                 | `CustomEvent<{ taskId: string; }>`                            |
| `taskUpdate` | Any field changed (auto-save trigger) | `CustomEvent<{ taskId: string; field: string; value: any; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
