# pop-poll



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute      | Description                                                            | Type      | Default     |
| ------------- | -------------- | ---------------------------------------------------------------------- | --------- | ----------- |
| `accentColor` | `accent-color` | Accent color (CSS custom property value)                               | `string`  | `'#7c3aed'` |
| `endDate`     | `end-date`     | ISO date string when poll ends                                         | `string`  | `''`        |
| `options`     | `options`      | JSON-stringified array of PollOption objects                           | `string`  | `'[]'`      |
| `pollId`      | `poll-id`      | The Firestore document ID for this poll                                | `string`  | `''`        |
| `pollType`    | `poll-type`    | Poll type: 'single' for one choice, 'multiple' for many                | `string`  | `'single'`  |
| `question`    | `question`     | The poll question text                                                 | `string`  | `''`        |
| `readonly`    | `readonly`     | When true, disables voting interaction                                 | `boolean` | `false`     |
| `showResults` | `show-results` | When true, always shows results even if user hasn't voted              | `boolean` | `false`     |
| `totalVotes`  | `total-votes`  | Total number of votes cast                                             | `number`  | `0`         |
| `userVote`    | `user-vote`    | The current user's voted option value(s), comma-separated for multiple | `string`  | `''`        |


## Events

| Event      | Description                                                                       | Type                                                 |
| ---------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `pollVote` | Emitted when the user clicks "Vote" - detail contains selected values and pollId. | `CustomEvent<{ values: string[]; pollId: string; }>` |


## Methods

### `setUserVote(value: string) => Promise<void>`

Programmatically set the user's current vote.

#### Parameters

| Name    | Type     | Description |
| ------- | -------- | ----------- |
| `value` | `string` |             |

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
