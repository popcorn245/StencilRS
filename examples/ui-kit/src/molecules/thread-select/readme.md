# pop-thread-select



<!-- Auto Generated Below -->


## Overview

pop-thread-select — "Post to <thread>" picker.

A panel uses this to choose which thread its output lands in. The component is
STATELESS: it stores nothing and remembers nothing. The HOST persists the
choice per `(uid, panelId)` and feeds it back as `value`.

With `showToday` the daily threads are pinned above the topic threads, because
"post it into today" is the overwhelmingly common answer.

## Properties

| Property    | Attribute    | Description                                              | Type             | Default     |
| ----------- | ------------ | -------------------------------------------------------- | ---------------- | ----------- |
| `disabled`  | `disabled`   |                                                          | `boolean`        | `false`     |
| `label`     | `label`      | Visible label for the control.                           | `string`         | `'Post to'` |
| `showToday` | `show-today` | Pin the daily ("Today") threads above the topic threads. | `boolean`        | `true`      |
| `threads`   | --           | Threads the user may post into.                          | `ThreadOption[]` | `[]`        |
| `value`     | `value`      | The currently selected thread id.                        | `string`         | `''`        |


## Events

| Event             | Description                                                    | Type                              |
| ----------------- | -------------------------------------------------------------- | --------------------------------- |
| `popThreadChange` | Emitted with the newly-picked thread id. The HOST persists it. | `CustomEvent<ThreadChangeDetail>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
