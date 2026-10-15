# pop-date-time-picker



<!-- Auto Generated Below -->


## Overview

pop-date-time-picker — date + time + All-day toggle.

  <pop-date-time-picker
    value={'2026-05-29T09:00'}
    allDay={false}
    onValueChanged={ev => save(ev.detail)}
  />

Emits `{ value: string | null, allDay: boolean }`. When allDay is true,
value is `YYYY-MM-DD`; otherwise `YYYY-MM-DDTHH:MM`. Wraps native
date/datetime-local inputs (best mobile picker UX) with a checkbox.
Empty value === no due date.

## Properties

| Property   | Attribute  | Description                                                                              | Type      | Default |
| ---------- | ---------- | ---------------------------------------------------------------------------------------- | --------- | ------- |
| `allDay`   | `all-day`  |                                                                                          | `boolean` | `false` |
| `disabled` | `disabled` |                                                                                          | `boolean` | `false` |
| `value`    | `value`    | ISO-ish string. `YYYY-MM-DDTHH:MM` when timed, `YYYY-MM-DD` when all-day, '' when unset. | `string`  | `''`    |


## Events

| Event          | Description | Type                                               |
| -------------- | ----------- | -------------------------------------------------- |
| `valueChanged` |             | `CustomEvent<{ value: string; allDay: boolean; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
