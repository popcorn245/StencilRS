# pop-toast



<!-- Auto Generated Below -->


## Properties

| Property   | Attribute  | Description | Type                                | Default           |
| ---------- | ---------- | ----------- | ----------------------------------- | ----------------- |
| `duration` | `duration` |             | `number`                            | `5000`            |
| `position` | `position` |             | `"bottom-center" \| "bottom-right"` | `'bottom-center'` |


## Methods

### `hide() => Promise<void>`

Dismiss all currently-shown toasts, cancelling any pending auto-dismiss
timers. The single programmatic way to clear a sticky (persistent) toast.

#### Returns

Type: `Promise<void>`



### `show(message: string, type?: "default" | "error" | "success", action?: ToastAction, options?: ToastOptions) => Promise<void>`



#### Parameters

| Name      | Type                                | Description |
| --------- | ----------------------------------- | ----------- |
| `message` | `string`                            |             |
| `type`    | `"error" \| "default" \| "success"` |             |
| `action`  | `ToastAction`                       |             |
| `options` | `ToastOptions`                      |             |

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
