# pop-cafeteria-panel



<!-- Auto Generated Below -->


## Properties

| Property        | Attribute        | Description                                                           | Type      | Default |
| --------------- | ---------------- | --------------------------------------------------------------------- | --------- | ------- |
| `actions`       | `actions`        | Available food actions as JSON string (array of CafeteriaPanelAction) | `string`  | `'[]'`  |
| `agentRole`     | `agent-role`     | NPC agent role (exploration, planning, codegen, orchestrator)         | `string`  | `''`    |
| `hasActiveNpc`  | `has-active-npc` | Whether there's an active NPC at the counter                          | `boolean` | `false` |
| `npcId`         | `npc-id`         | NPC ID for display                                                    | `string`  | `''`    |
| `paragraph`     | `paragraph`      | Full paragraph description                                            | `string`  | `''`    |
| `paused`        | `paused`         | Whether game is paused (panel expanded)                               | `boolean` | `false` |
| `queuePosition` | `queue-position` | Queue position (1-indexed)                                            | `number`  | `0`     |
| `queueTotal`    | `queue-total`    | Total queue size                                                      | `number`  | `0`     |
| `reviewTime`    | `review-time`    | Review time in seconds                                                | `number`  | `0`     |
| `summary`       | `summary`        | One-liner summary of the active NPC's request                         | `string`  | `''`    |


## Events

| Event              | Description                                       | Type                                  |
| ------------------ | ------------------------------------------------- | ------------------------------------- |
| `actionSelected`   | Fired when the user clicks an action card         | `CustomEvent<{ key: number; }>`       |
| `contextSubmitted` | Fired when the user submits chat context          | `CustomEvent<{ text: string; }>`      |
| `cycleNpc`         | Fired when user clicks Tab/cycle                  | `CustomEvent<void>`                   |
| `panelToggled`     | Fired when user toggles the expanded/paused state | `CustomEvent<{ expanded: boolean; }>` |


## Methods

### `focusChat() => Promise<void>`

Public method to focus the chat input

#### Returns

Type: `Promise<void>`



### `setChatText(text: string) => Promise<void>`

Public method to set chat text (for autoplay typing animation)

#### Parameters

| Name   | Type     | Description |
| ------ | -------- | ----------- |
| `text` | `string` |             |

#### Returns

Type: `Promise<void>`



### `toggle() => Promise<void>`

Public method to toggle expanded state (called from game)

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
