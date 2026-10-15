# pop-button



<!-- Auto Generated Below -->


## Properties

| Property          | Attribute          | Description                               | Type      | Default        |
| ----------------- | ------------------ | ----------------------------------------- | --------- | -------------- |
| `alignment`       | `alignment`        | Horizontal alignment: left, center, right | `string`  | `'center'`     |
| `backgroundColor` | `background-color` | Button background color                   | `string`  | `'#7c3aed'`    |
| `borderRadius`    | `border-radius`    | Border radius in pixels                   | `number`  | `4`            |
| `readonly`        | `readonly`         | Read-only mode                            | `boolean` | `false`        |
| `text`            | `text`             | Button label text                         | `string`  | `'Click Here'` |
| `textColor`       | `text-color`       | Button text color                         | `string`  | `'#ffffff'`    |
| `url`             | `url`              | Button link URL                           | `string`  | `'#'`          |


## Events

| Event          | Description                           | Type                                                                                                                               |
| -------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `buttonChange` | Emitted when button properties change | `CustomEvent<{ text: string; url: string; alignment: string; backgroundColor: string; textColor: string; borderRadius: number; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
