# pop-thread-search



<!-- Auto Generated Below -->


## Overview

pop-thread-search — search across threads with card-type / source-panel facets.

Props in, events out: the component never queries anything. It owns exactly
one piece of state — the text currently in the input — and everything else
(results, counts, which facets are on) is fed down by the host. Toggling a
facet emits `popSearch` immediately with the NEW facet set; the host decides
what that means.

## Properties

| Property       | Attribute | Description                                                                 | Type              | Default                             |
| -------------- | --------- | --------------------------------------------------------------------------- | ----------------- | ----------------------------------- |
| `activeFacets` | --        | Facet values currently applied.                                             | `ActiveFacets`    | `{ cardType: [], sourcePanel: [] }` |
| `available`    | --        | Optional full facet vocabulary + labels, so zero-count values still render. | `AvailableFacets` | `undefined`                         |
| `facets`       | --        | Counts per facet value.                                                     | `SearchFacets`    | `{ cardType: {}, sourcePanel: {} }` |
| `loading`      | `loading` |                                                                             | `boolean`         | `false`                             |
| `query`        | `query`   | The query the host last ran.                                                | `string`          | `''`                                |
| `results`      | --        | Hits, in the order the host wants them shown. Never re-sorted here.         | `SearchResult[]`  | `[]`                                |


## Events

| Event           | Description                                                             | Type                            |
| --------------- | ----------------------------------------------------------------------- | ------------------------------- |
| `popResultOpen` | Emitted when a hit is opened — deep-link to `itemId` inside `threadId`. | `CustomEvent<ResultOpenDetail>` |
| `popSearch`     | Emitted on submit and on every facet toggle.                            | `CustomEvent<SearchDetail>`     |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
