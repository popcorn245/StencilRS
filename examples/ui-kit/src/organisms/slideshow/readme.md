# pop-slideshow



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute      | Description | Type      | Default   |
| ------------- | -------------- | ----------- | --------- | --------- |
| `autoSlide`   | `auto-slide`   |             | `number`  | `0`       |
| `controls`    | `controls`     |             | `boolean` | `true`    |
| `embedded`    | `embedded`     |             | `boolean` | `true`    |
| `fullscreen`  | `fullscreen`   |             | `boolean` | `true`    |
| `hash`        | `hash`         |             | `boolean` | `false`   |
| `height`      | `height`       |             | `number`  | `700`     |
| `loop`        | `loop`         |             | `boolean` | `false`   |
| `margin`      | `margin`       |             | `number`  | `0.04`    |
| `mouseWheel`  | `mouse-wheel`  |             | `boolean` | `false`   |
| `plugins`     | `plugins`      |             | `string`  | `'[]'`    |
| `progress`    | `progress`     |             | `boolean` | `true`    |
| `slideNumber` | `slide-number` |             | `boolean` | `false`   |
| `theme`       | `theme`        |             | `string`  | `'black'` |
| `touch`       | `touch`        |             | `boolean` | `true`    |
| `transition`  | `transition`   |             | `string`  | `'slide'` |
| `width`       | `width`        |             | `number`  | `960`     |


## Events

| Event               | Description | Type                                               |
| ------------------- | ----------- | -------------------------------------------------- |
| `popSlideChanged`   |             | `CustomEvent<{ indexH: number; indexV: number; }>` |
| `popSlideshowReady` |             | `CustomEvent<void>`                                |


## Methods

### `goToSlide(indexH: number, indexV?: number) => Promise<void>`



#### Parameters

| Name     | Type     | Description |
| -------- | -------- | ----------- |
| `indexH` | `number` |             |
| `indexV` | `number` |             |

#### Returns

Type: `Promise<void>`



### `next() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `prev() => Promise<void>`



#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
