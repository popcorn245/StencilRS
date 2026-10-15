# pop-floor-map



<!-- Auto Generated Below -->


## Overview

pop-floor-map — the interactive, multi-floor SVG house map.

Presentational shell over a FloorPlan (from

## Properties

| Property           | Attribute             | Description                                                                                                                                                                                                                                                                                         | Type                             | Default     |
| ------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------- |
| `activeFloorId`    | `active-floor-id`     | Active floor id. Uncontrolled after first render (internal state mirrors).                                                                                                                                                                                                                          | `string`                         | `undefined` |
| `dropTargetRoomId` | `drop-target-room-id` | Room id currently hovered as a drag drop-target (set imperatively by pop-task-list while a task is dragged over the map). Drives a distinct highlight so the user sees where the drop will land. Tasks mode only.                                                                                   | `string`                         | `undefined` |
| `editable`         | `editable`            | Editable surface. When false (the default — the task view), the map is READ-ONLY: floor switcher + shaded room zones with counts + emojis only. The mode toggle, device pins, edges, edit tooling and HA import are all hidden. When true (Settings), the full editor (Tasks/Devices/Edit) renders. | `boolean`                        | `false`     |
| `mode`             | `mode`                | Interaction mode.                                                                                                                                                                                                                                                                                   | `"devices" \| "edit" \| "tasks"` | `'tasks'`   |
| `plan`             | `plan`                | JSON-stringified FloorPlan (single source of truth, owned by the host).                                                                                                                                                                                                                             | `string`                         | `'null'`    |
| `roomEmojis`       | `room-emojis`         | Per-room emoji hints as JSON `{ [roomId]: string[] }`. Up to 3 are rendered in each read-only room zone (sourced from the spaces that resolve there).                                                                                                                                               | `string`                         | `'{}'`      |
| `selectedRoomId`   | `selected-room-id`    | Highlighted room id (the active room filter), for Tasks mode.                                                                                                                                                                                                                                       | `string`                         | `undefined` |
| `taskCounts`       | `task-counts`         | Per-room task counts as JSON `{ [roomId]: number }` — Tasks-mode shading.                                                                                                                                                                                                                           | `string`                         | `'{}'`      |


## Events

| Event               | Description                                                             | Type                                 |
| ------------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| `deviceSelect`      | A device pin was clicked (Devices mode).                                | `CustomEvent<{ deviceId: string; }>` |
| `haImportRequested` | Host should fetch Home Assistant entities to add as pins (Edit mode).   | `CustomEvent<void>`                  |
| `planChange`        | The plan was edited (Edit mode) — host persists. Detail = the new plan. | `CustomEvent<FloorPlan>`             |
| `roomSelect`        | A room hit-zone was clicked.                                            | `CustomEvent<{ roomId: string; }>`   |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
