# RxFire Storage

## Task Observables

### `fromTask()`
The `fromTask()` function creates an observable that emits progress changes.

|                 |                                            |
|-----------------|--------------------------------------------|
| **function**    | `fromTask()`                               |
| **params**      | `import('firebase/storage').UploadTask`                       |
| **import path** | `rxfire/storage`                           |
| **return**      | `Observable<firestore.UploadTaskSnapshot>` |

#### TypeScript Example
```ts
import { fromTask } from 'rxfire/storage';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString } from 'firebase/storage';

// Set up Firebase
const app = initializeApp({ /* config */ });
const storage = getStorage(app);
const davidRef = ref(storage, 'users/david.png');

// Upload a transparent 1x1 pixel image
const BASE_64_PIXEL = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const task = uploadString(davidRef, BASE_64_PIXEL, 'base64');

fromTask(task)
  .subscribe(snap => { console.log(snap.bytesTransferred); });
```

### `percentage()`
The `percentage()` function creates an observable that emits percentage of the uploaded bytes.

|                 |                                            |
|-----------------|--------------------------------------------|
| **function**    | `percentage()`                             |
| **params**      | `import('firebase/storage').UploadTask`                       |
| **import path** | `rxfire/storage`                           |
| **return**      | `Observable<number>`                       |

#### TypeScript Example
```ts
import { percentage } from 'rxfire/storage';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString } from 'firebase/storage';

// Set up Firebase
const app = initializeApp({ /* config */ });
const storage = getStorage(app);
const davidRef = ref(storage, 'users/david.png');

// Upload a transparent 1x1 pixel image
const BASE_64_PIXEL = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const task = uploadString(davidRef, BASE_64_PIXEL, 'base64');

percentage(task)
  .subscribe(action => { console.log(action.progress, action.snapshot); });
```

## Reference Observables

### `getDownloadURL()`
The `getDownloadURL()` function creates an observable that emits the URL of the file.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `getDownloadURL()`                       |
| **params**      | `import('firebase/storage').StorageReference`                      |
| **import path** | `rxfire/storage`                         |
| **return**      | `Observable<string>`                     |

#### TypeScript Example
```ts
import { getDownloadURL } from 'rxfire/storage';
import { initializeApp } from 'firebase/app';
import { getStorage, ref } from 'firebase/storage';

// Set up Firebase
const app = initializeApp({ /* config */ });
const storage = getStorage(app);

// Assume this exists
const davidRef = ref(storage, 'users/david.png');

getDownloadURL(davidRef)
  .subscribe(url => { console.log(url) });
```

### `getMetadata()`
The `getMetadata()` function creates an observable that emits the URL of the file's metadta.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `getMetadata()`                          |
| **params**      | `import('firebase/storage').StorageReference`                      |
| **import path** | `rxfire/storage`                         |
| **return**      | `Observable<Object>`                     |

#### TypeScript Example
```ts
import { getMetadata } from 'rxfire/storage';
import { initializeApp } from 'firebase/app';
import { getStorage, ref } from 'firebase/storage';

// Set up Firebase
const app = initializeApp({ /* config */ });
const storage = getStorage(app);

// Assume this exists
const davidRef = ref(storage, 'users/david.png');

getMetadata(davidRef)
  .subscribe(meta => { console.log(meta) });
```

### `uploadBytesResumable()`
The `uploadBytesResumable()` function creates an observable that emits the upload progress of a file. **Breaking change**: Renamed from `put()` in previous API. 

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `uploadBytesResumable()`                                  |
| **params**      | ref: `import('firebase/storage').StorageReference`, data: `any`, metadata?: `import('firebase/storage').UploadMetadata`                |
| **import path** | `rxfire/storage`                         |
| **return**      | `Observable<import('firebase/storage').UploadTaskSnapshot>` |

#### TypeScript Example
```ts
import { uploadBytesResumable } from 'rxfire/storage';
import { initializeApp } from 'firebase/app';
import { getStorage, ref } from 'firebase/storage';

// Set up Firebase
const app = initializeApp({ /* config */ });
const storage = getStorage(app);
const dataRef = ref(storage, 'users/david.json');

const blob = new Blob(
  [JSON.stringify({ name: 'david'}, null, 2)], 
  { type : 'application/json' }
);

uploadBytesResumable(davidRef, blob, { type : 'application/json' })
  .subscribe(snap => { console.log(snap.bytesTransferred) });
```

### `uploadString()`
The `uploadString()` function creates an observable that emits the upload progress of a file. **Breaking change**: Renamed from `putString()` in previous API. 

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `uploadString()`                                  |
| **params**      | ref: `import('firebase/storage').StorageReference`, data: `string`, metadata?: `import('firebase/storage').UploadMetadata`                |
| **import path** | `rxfire/storage`                         |
| **return**      | `Observable<import('firebase/storage').UploadTaskSnapshot>` |

#### TypeScript Example
```ts
import { uploadString } from 'rxfire/storage';
import { initializeApp } from 'firebase/app';
import { getStorage, ref } from 'firebase/storage';

// Set up Firebase
const app = initializeApp({ /* config */ });
const storage = getStorage(app);
const davidRef = ref('users/david.png');

const base64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

uploadString(davidRef, base64, { type : 'application/json' })
  .subscribe(snap => { console.log(snap.bytesTransferred) });
```
