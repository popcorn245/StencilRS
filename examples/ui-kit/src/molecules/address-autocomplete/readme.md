# pop-address-autocomplete



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute     | Description | Type     | Default                 |
| ------------- | ------------- | ----------- | -------- | ----------------------- |
| `apiKey`      | `api-key`     |             | `string` | `undefined`             |
| `placeholder` | `placeholder` |             | `string` | `'Enter a location...'` |
| `value`       | `value`       |             | `string` | `''`                    |


## Events

| Event             | Description | Type                                                                              |
| ----------------- | ----------- | --------------------------------------------------------------------------------- |
| `addressSelected` |             | `CustomEvent<{ address: string; lat?: number; lng?: number; placeId?: string; }>` |


## Dependencies

### Used by

 - [pop-event-planner](../../organisms/event-planner)

### Graph
```mermaid
graph TD;
  pop-event-planner --> pop-address-autocomplete
  style pop-address-autocomplete fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
