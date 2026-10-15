# pop-swipe-cards



<!-- Auto Generated Below -->


## Overview

pop-swipe-cards
A Tinder-style swipeable card interface for browsing article elements.

## Properties

| Property       | Attribute       | Description                                           | Type      | Default |
| -------------- | --------------- | ----------------------------------------------------- | --------- | ------- |
| `hideControls` | `hide-controls` | When true, hides the built-in Yes/No control buttons. | `boolean` | `false` |


## Events

| Event         | Description                                                       | Type                                                    |
| ------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| `popSwipeNo`  | Fired when a card is swiped left or the "No" button is clicked.   | `CustomEvent<{ element: HTMLElement; index: number; }>` |
| `popSwipeYes` | Fired when a card is swiped right or the "Yes" button is clicked. | `CustomEvent<{ element: HTMLElement; index: number; }>` |


## Methods

### `init() => Promise<void>`

Parses the slotted article tags, applies necessary z-index to stack them,
and resets the activeIndex.

#### Returns

Type: `Promise<void>`



### `reset() => Promise<void>`

Resets the deck to the initial state.

#### Returns

Type: `Promise<void>`



### `swipeNo() => Promise<void>`

Programmatically triggers a "No" (left) swipe on the currently active card.

#### Returns

Type: `Promise<void>`



### `swipeYes() => Promise<void>`

Programmatically triggers a "Yes" (right) swipe on the currently active card.

#### Returns

Type: `Promise<void>`




## Shadow Parts

| Part         | Description |
| ------------ | ----------- |
| `"controls"` |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
