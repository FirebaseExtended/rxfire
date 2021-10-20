# RxFire Cloud Functions

## Callable Functions Observables

### `httpsCallable()`

The `httpsCallable()` function returns an observable that calls a [callable function](https://firebase.google.com/docs/functions/callable), then emits the data returned from that function.

|                 |                                                                          |
| --------------- | ------------------------------------------------------------------------ |
| **function**    | `httpsCallable()`                                                        |
| **params**      | `functions: Functions`, `name: string`, `options?: HttpsCallableOptions` |
| **import path** | `rxfire/functions`                                                       |
| **return**      | `(data: T) => Observable<R>`                                             |

#### TypeScript Example

```ts
import { httpsCallable } from "rxfire/functions";
import { initializeApp } from "firebase/app";
import { getFunctions } from "firebase/functions";

// Set up Firebase
const app = initializeApp({
  /* config */
});
const functions = getFunctions(app);

// Assume an `uppercaser` function is deployed
const capitalizedText$ = httpsCallable<string, string>(functions, "uppercaser")("hello world");
capitalizedText$.subscribe((text) => {
  console.log(text);
}); // logs "HELLO WORLD"
```
