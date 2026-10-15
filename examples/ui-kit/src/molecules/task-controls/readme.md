# pop-task-controls



<!-- Auto Generated Below -->


## Overview

`pop-task-controls` — a fully CONTROLLED group-by / sort / status control set.

Lifted (and generalised) from tasks-app's `renderFilterControls` so both the
tasks-app and the hub's tasks tile can share ONE toolbar: a row of pill
dropdowns (Group · Sort · Status), each a button + popover listbox with a ✓
on the current selection.

The component holds NO filter values of its own — the host passes the current
`groupBy` / `sortBy` / `statusFilter` and the option lists, and the component
emits a `*Change` event when the user picks something. The only internal
state is view-local: which popover is open.

## Properties

| Property        | Attribute        | Description                                                                                                                                                                                                                                                                                                                                                                      | Type                            | Default    |
| --------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------- |
| `clearVariant`  | `clear-variant`  | Clear-affordance presentation: `text` = the "Clear"/"Clear all" link (default, tasks/calendar unchanged); `icon` = a quiet icon-only button (funnel-with-slash) for hosts where a text link sticks out too much.                                                                                                                                                                 | `"icon" \| "text"`              | `'text'`   |
| `compact`       | `compact`        | Tighter layout for narrow docks (e.g. the hub's 400px tile).                                                                                                                                                                                                                                                                                                                     | `boolean`                       | `false`    |
| `defaultGroup`  | `default-group`  | Default group id — used only to decide the `menu` trigger's active dot (dot shows when `groupBy` differs from this). Empty → not considered.                                                                                                                                                                                                                                     | `string`                        | `''`       |
| `defaultSort`   | `default-sort`   | Default sort id — used only for the `menu` trigger's active dot.                                                                                                                                                                                                                                                                                                                 | `string`                        | `''`       |
| `groupBy`       | `group-by`       | Current group-by value (controlled).                                                                                                                                                                                                                                                                                                                                             | `string`                        | `''`       |
| `groupLabel`    | `group-label`    | Heading for the group dropdown (pill label + menu-row label). Hosts reusing the control outside tasks can rename it (e.g. "Tool" for the hub's history).                                                                                                                                                                                                                         | `string`                        | `'Group'`  |
| `groupOptions`  | `group-options`  | JSON array `[{id,label}]` of the group modes to show. Empty → no Group dropdown.                                                                                                                                                                                                                                                                                                 | `string`                        | `'[]'`     |
| `layout`        | `layout`         | Presentation:  - `inline` (default) — the three dropdown pills sit in a row (bar/compact).  - `menu` — a single filter icon-button that opens ONE popover holding the    Group / Sort / Status selectors. Collapses the toolbar to a single    trigger (for tight headers next to a search input). An active-state dot    shows on the trigger when a non-default filter is set. | `"inline" \| "menu"`            | `'inline'` |
| `showClear`     | `show-clear`     | Render a "Clear" affordance.                                                                                                                                                                                                                                                                                                                                                     | `boolean`                       | `false`    |
| `sortBy`        | `sort-by`        | Current sort value (controlled).                                                                                                                                                                                                                                                                                                                                                 | `string`                        | `''`       |
| `sortLabel`     | `sort-label`     | Heading for the sort dropdown.                                                                                                                                                                                                                                                                                                                                                   | `string`                        | `'Sort'`   |
| `sortOptions`   | `sort-options`   | JSON array `[{id,label}]` of the sort modes to show. Empty → no Sort dropdown.                                                                                                                                                                                                                                                                                                   | `string`                        | `'[]'`     |
| `statusFilter`  | `status-filter`  | Current status-filter value (controlled). `''` = all.                                                                                                                                                                                                                                                                                                                            | `string`                        | `''`       |
| `statusLabel`   | `status-label`   | Heading for the status dropdown.                                                                                                                                                                                                                                                                                                                                                 | `string`                        | `'Status'` |
| `statusOptions` | `status-options` | JSON array `[{id,label}]` of the status filters to show. Empty → no Status dropdown.                                                                                                                                                                                                                                                                                             | `string`                        | `'[]'`     |
| `variant`       | `variant`        | Layout hint for class hooks.                                                                                                                                                                                                                                                                                                                                                     | `"bar" \| "sheet" \| "sidenav"` | `'bar'`    |


## Events

| Event              | Description                       | Type                              |
| ------------------ | --------------------------------- | --------------------------------- |
| `clearAll`         | The clear affordance was pressed. | `CustomEvent<void>`               |
| `groupChange`      | The group mode changed.           | `CustomEvent<{ value: string; }>` |
| `sortChange`       | The sort mode changed.            | `CustomEvent<{ value: string; }>` |
| `taskStatusChange` | The status filter changed.        | `CustomEvent<{ value: string; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
