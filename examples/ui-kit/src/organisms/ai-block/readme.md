# pop-ai-block



<!-- Auto Generated Below -->


## Properties

| Property          | Attribute          | Description                                      | Type      | Default        |
| ----------------- | ------------------ | ------------------------------------------------ | --------- | -------------- |
| `model`           | `model`            | Selected model identifier                        | `string`  | `'gemma4:e4b'` |
| `ollamaAvailable` | `ollama-available` | Whether Ollama is reachable                      | `boolean` | `false`        |
| `prompt`          | `prompt`           | User's prompt text                               | `string`  | `''`           |
| `response`        | `response`         | Generated response text                          | `string`  | `''`           |
| `status`          | `status`           | Generation status: idle, generating, done, error | `string`  | `'idle'`       |


## Events

| Event           | Description               | Type                                                                                |
| --------------- | ------------------------- | ----------------------------------------------------------------------------------- |
| `aiCancel`      | User cancelled generation | `CustomEvent<{}>`                                                                   |
| `aiChange`      | Any data change           | `CustomEvent<{ prompt: string; response: string; model: string; status: string; }>` |
| `aiGenerate`    | User clicked Generate     | `CustomEvent<{ prompt: string; model: string; }>`                                   |
| `aiModelChange` | Model selection changed   | `CustomEvent<{ model: string; }>`                                                   |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
