# pop-firebase-auth



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute      | Description                                                                                                                  | Type     | Default          |
| ------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------- |
| `appName`     | `app-name`     | App name used in the headline.                                                                                               | `string` | `'App'`          |
| `firebaseApp` | `firebase-app` | The initialized FirebaseApp instance (`FirebaseApp` from `firebase/app`). Required. Passed as a property (not an attribute). | `any`    | `null`           |
| `providers`   | `providers`    | Which auth providers to expose. Comma-separated or JSON array.                                                               | `string` | `'google,email'` |
| `redirectUrl` | `redirect-url` | Where to navigate after successful auth (consumer may also override via authSuccess).                                        | `string` | `'/'`            |


## Events

| Event         | Description                                                              | Type                             |
| ------------- | ------------------------------------------------------------------------ | -------------------------------- |
| `authError`   | Fired when sign-in/up fails.                                             | `CustomEvent<{ error: Error; }>` |
| `authSuccess` | Fired with the signed-in user. Consumer typically routes to redirectUrl. | `CustomEvent<{ user: any; }>`    |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
