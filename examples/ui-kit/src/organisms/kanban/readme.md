# pop-kanban



<!-- Auto Generated Below -->


## Properties

| Property            | Attribute             | Description                                                                                                                     | Type      | Default                 |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------- |
| `cards`             | `cards`               | JSON string of KanbanCard[]. Each card has { id, title, description?, columnId, repo?, prUrl?, prNumber?, createdAt?, badge? }. | `string`  | `'[]'`                  |
| `columns`           | `columns`             | JSON string of KanbanColumn[]. Each column has { id, label, color? }.                                                           | `string`  | `'[]'`                  |
| `filterAssignee`    | `filter-assignee`     | Filter cards to only show those assigned to this name. Empty string shows all.                                                  | `string`  | `''`                    |
| `loading`           | `loading`             | Whether the board is in a loading state                                                                                         | `boolean` | `false`                 |
| `terminalColumnIds` | `terminal-column-ids` | JSON string of column IDs that are terminal (no drops allowed). Defaults to ["merged","closed"].                                | `string`  | `'["merged","closed"]'` |


## Events

| Event            | Description                                                                                  | Type                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `popCardClicked` | Emitted when a card is clicked. Detail: { cardId }                                           | `CustomEvent<{ cardId: string; }>`                                           |
| `popCardMoved`   | Emitted when a card is dragged to a new column. Detail: { cardId, fromColumnId, toColumnId } | `CustomEvent<{ cardId: string; fromColumnId: string; toColumnId: string; }>` |
| `popCreateTask`  | Emitted when the "New task" button is clicked. Detail: { columnId }                          | `CustomEvent<{ columnId: string; }>`                                         |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
