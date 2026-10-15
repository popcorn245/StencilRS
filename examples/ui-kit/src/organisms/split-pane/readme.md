# pop-split-pane



<!-- Auto Generated Below -->


## Properties

| Property        | Attribute        | Description                                                                 | Type                                                  | Default                           |
| --------------- | ---------------- | --------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------- |
| `activeScreen`  | `active-screen`  | Stack mode: which screen is visible (`'list-screen'` \| `'detail-screen'`). | `string`                                              | `'list-screen'`                   |
| `activeTab`     | `active-tab`     | Tabs mode: which tab is visible (`'tab-details'` \| `'tab-note'`).          | `string`                                              | `'tab-details'`                   |
| `breakpoints`   | `breakpoints`    | JSON-encoded breakpoints object, e.g. `'{"desktop":1200,"tablet":768}'`.    | `string`                                              | `'{"desktop":1200,"tablet":768}'` |
| `defaultWidths` | `default-widths` | JSON-encoded default widths (percent per visible pane).                     | `string`                                              | `''`                              |
| `mode`          | `mode`           | Layout mode. `'auto'` switches based on container width.                    | `"auto" \| "stack" \| "three-column" \| "two-column"` | `'auto'`                          |
| `persistKey`    | `persist-key`    | localStorage key for persisting widths. Empty disables persistence.         | `string`                                              | `''`                              |
| `tabsRight`     | `tabs-right`     | In two-column mode, render right pane as tabbed.                            | `boolean`                                             | `false`                           |


## Events

| Event                 | Description                                             | Type                    |
| --------------------- | ------------------------------------------------------- | ----------------------- |
| `activeScreenChanged` | Stack mode: which screen is showing.                    | `CustomEvent<string>`   |
| `activeTabChanged`    | Tabs mode: which tab is showing.                        | `CustomEvent<string>`   |
| `widthsChanged`       | Widths actually changed by the user dragging a divider. | `CustomEvent<number[]>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
