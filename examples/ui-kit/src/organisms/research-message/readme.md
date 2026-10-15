# pop-research-message



<!-- Auto Generated Below -->


> **[DEPRECATED]** Use `pop-message-bubble` instead.
This component is superseded by pop-message-bubble which supports
all roles (user, assistant, member), layouts (bubble, prose), streaming,
copy, TTS, and thread actions in one unified component.

## Properties

| Property         | Attribute         | Description                                                               | Type                    | Default  |
| ---------------- | ----------------- | ------------------------------------------------------------------------- | ----------------------- | -------- |
| `avatarInitials` | `avatar-initials` | Avatar initials fallback                                                  | `string`                | `''`     |
| `avatarUrl`      | `avatar-url`      | Avatar URL for user messages                                              | `string`                | `''`     |
| `content`        | `content`         | Message text content (may stream in)                                      | `string`                | `''`     |
| `intents`        | `intents`         | JSON string of IntentChip[] — shown on assistant messages after streaming | `string`                | `'[]'`   |
| `role`           | `role`            | Who sent the message                                                      | `"assistant" \| "user"` | `'user'` |
| `streaming`      | `streaming`       | Whether the message is still streaming                                    | `boolean`               | `false`  |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
