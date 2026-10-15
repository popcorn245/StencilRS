# pop-routine-step



<!-- Auto Generated Below -->


## Properties

| Property           | Attribute           | Description                                                             | Type                                                                                                                                                    | Default     |
| ------------------ | ------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `breathingPattern` | `breathing-pattern` | Breathing pattern as "inhale,hold,exhale,hold" seconds (e.g. "4,4,6,2") | `string`                                                                                                                                                | `'4,4,6,2'` |
| `durationSeconds`  | `duration-seconds`  | Duration in seconds (for timer/breathing/duration steps)                | `number`                                                                                                                                                | `60`        |
| `emoji`            | `emoji`             | Emoji displayed above the heading                                       | `string`                                                                                                                                                | `''`        |
| `heading`          | `heading`           | Step title                                                              | `string`                                                                                                                                                | `''`        |
| `scaleMax`         | `scale-max`         |                                                                         | `string`                                                                                                                                                | `'10'`      |
| `scaleMaxLabel`    | `scale-max-label`   |                                                                         | `string`                                                                                                                                                | `'High'`    |
| `scaleMin`         | `scale-min`         | Scale min/max labels                                                    | `string`                                                                                                                                                | `'1'`       |
| `scaleMinLabel`    | `scale-min-label`   |                                                                         | `string`                                                                                                                                                | `'Low'`     |
| `sets`             | `sets`              | JSON array of set objects [{reps, weight?}] for set_reps step           | `string`                                                                                                                                                | `'[]'`      |
| `subtitle`         | `subtitle`          | Optional subtitle / instruction                                         | `string`                                                                                                                                                | `''`        |
| `type`             | `type`              | Step type determines the interactive widget shown                       | `"breathing" \| "checkbox" \| "confetti" \| "custom" \| "duration" \| "info" \| "photo" \| "scale" \| "set_reps" \| "text_input" \| "timer" \| "voice"` | `'info'`    |


## Events

| Event          | Description                                                               | Type                |
| -------------- | ------------------------------------------------------------------------- | ------------------- |
| `stepComplete` | Emitted when the step is marked done — detail contains any captured value | `CustomEvent<any>`  |
| `stepSkip`     | Emitted when user taps Skip                                               | `CustomEvent<void>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
