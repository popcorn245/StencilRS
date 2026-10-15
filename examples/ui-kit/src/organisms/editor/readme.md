# pop-editor



<!-- Auto Generated Below -->


## Properties

| Property         | Attribute         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                          | Type                             | Default     |
| ---------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------- |
| `activities`     | `activities`      |                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `string`                         | `'[]'`      |
| `aiModel`        | `ai-model`        | Default AI model for AiBlock (optional, defaults to Gemma 4)                                                                                                                                                                                                                                                                                                                                                                                         | `string`                         | `undefined` |
| `assistantSlash` | `assistant-slash` | Opt-in: add an "Ask the Assistant" entry to the slash / block "+" menu (notes-app WS3). Selecting it does NOT insert a block — it dispatches a `notes-app:open-assistant` window event (verb `build`) that the host app's unified Assistant (WS2) listens for, then removes its own placeholder block. This reuses the SAME invocation path as the selection toolbar (no second assistant). Off by default so other pop-editor hosts are unaffected. | `boolean`                        | `false`     |
| `currentUser`    | `current-user`    |                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `string`                         | `undefined` |
| `disable`        | `disable`         | Comma-separated feature flags to disable. Recognised values:  - `ai`   — skip the Ollama probe, omit AiBlock + AiInlineTool tools.  - `task` — omit TaskBlock + the `[ ]` paragraph→task auto-conversion.  Use from tasks-app where the editor is a plain note pane (no AI, no cross-collection task creation): `<pop-editor disable="ai,task" ... />`.                                                                                              | `string`                         | `''`        |
| `questId`        | `quest-id`        | Quest ID for creating tasks linked to this quest (used by TaskBlock)                                                                                                                                                                                                                                                                                                                                                                                 | `string`                         | `undefined` |
| `recentNotes`    | `recent-notes`    |                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `string`                         | `'[]'`      |
| `resolveQuery`   | --                | A promise-returning function allowing Astro to resolve deep queries  (e.g., from Firestore) when requested by a Functional block.                                                                                                                                                                                                                                                                                                                    | `(options: any) => Promise<any>` | `undefined` |
| `tags`           | `tags`            |                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `string`                         | `'[]'`      |
| `users`          | `users`           |                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `string`                         | `'[]'`      |
| `value`          | `value`           | The current Editor.js document data representation (stringified JSON)                                                                                                                                                                                                                                                                                                                                                                                | `string`                         | `'{}'`      |
| `wikilinks`      | `wikilinks`       | Opt-in: enable the `[[wiki-link]]` inline tool (notes-app Phase 3). When on, typing `[[` opens a note-title autocomplete and inserts an inline link chip carrying the target noteId. The autocomplete + lazy-create resolve through host-provided globals (`window.__notesLinkSearch` / `__notesLinkCreate` / `__notesLinkNavigate`) so ui-kit stays decoupled from notes-app's data layer. Off by default — the main app's editor is unaffected.    | `boolean`                        | `false`     |


## Events

| Event          | Description                                                                                                                                             | Type                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `editorChange` | Emitted roughly every time Editor's internal content changes. Event `detail` will contain the EditorJS DocumentData `OutputData`.                       | `CustomEvent<OutputData>` |
| `queryData`    | Called when a Functional block executes `blocks.query()`. Can be listened to via `onQueryData={}` natively or `document.addEventListener('queryData')`. | `CustomEvent<any>`        |


## Methods

### `dangerouslyUpdateEditor(newData: OutputData) => Promise<void>`

Instantly replaces the entire document's content with new data.
This is destructive to strict cursor positions, use with caution.

#### Parameters

| Name      | Type         | Description |
| --------- | ------------ | ----------- |
| `newData` | `OutputData` |             |

#### Returns

Type: `Promise<void>`



### `focusLastBlock() => Promise<void>`

Focuses the editor caret at the end of the very last block.

#### Returns

Type: `Promise<void>`



### `getActiveBlockId() => Promise<string | null>`

Gets the block ID of the currently focused/active block if any.

#### Returns

Type: `Promise<string>`



### `getEditorBlocks() => Promise<OutputData | null>`

Retrieves the raw JSON structure of all blocks currently inside the editor.
Useful for querying functional blocks or parsing data externally before submission.

#### Returns

Type: `Promise<OutputData>`



### `getSelectedBlocks() => Promise<string[]>`

Retrieves the block IDs of all currently selected blocks.

#### Returns

Type: `Promise<string[]>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
