# RxFire Firestore


### `doc()`
The `doc()` function creates an observable that emits document changes.  Returns snapshot of the data each time the document changes.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `doc()`                                  |
| **params**      | `ref:import('firebase/firestore').DocumentReference`        |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<import('firebase/firestore').DocumentSnapshot>` |

#### TypeScript Example
```ts
import { doc } from 'rxfire/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = getFirestore(app);
const davidDocRef = doc(db, 'users/david');

// Seed the firestore
setDoc(davidDocRef, { name: 'David' });

doc(davidDocRef).subscribe(snapshot => {
  console.log(snapshot.id);
  console.log(snapshot.data());
});
```

### `docData()`
The `docData()` function creates an observable that returns a stream of a document, mapped to its data field values and, optionally, the document ID.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `docData()`                              |
| **params**      | ref: `import('firebase/firestore').DocumentReference` <br> options?: { idField?: `string` } |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<T>` |

#### TypeScript Example
```ts
import { docData } from 'rxfire/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = getFirestore(app);
const davidDocRef = doc(db, 'users/david');

// Seed the firestore
setDoc(davidDocRef, { name: 'David' });

docData(davidDocRef, { idField: 'uid' }).subscribe(userData => {
  console.log(`${userData.name} has id ${userData.uid}`);
});
```

## Collection Observables

### `collection()`
The `collection()` function creates an observable that emits changes to the specified collection based on the input query.  Any time updates are made, the function returns all documents in the collection that match the query.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `collection()`                           |
| **params**      | query: `import('firebase/firestore').CollectionReference \| import('firebase/firestore').Query` |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<import('firebase/firestore').QueryDocumentSnapshot[]>`    |

#### TypeScript Example
```ts
import { collection } from 'rxfire/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection } from 'firebase/firestore';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = getFirestore(app);
const collectionRef = collection(db, 'users');

collection(collectionRef)
  .pipe(map(docs => docs.map(d => d.data())))
  .subscribe(users => { console.log(users) });
```

### `collectionData()`
The `collectionData()` function creates an observable that emits a stream of documents for the specified collection based on the input query.  When updates are made, returns all documents (field values and optional document ID) in the collection that match the query.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `collectionData()`                           |
| **params**      | query: `import('firebase/firestore').CollectionReference \| import('firebase/firestore').Query` <br> options?: { idField?: `string` } |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<T[]>`    |

#### TypeScript Example
```ts
import { collectionData } from 'rxfire/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection } from 'firebase/firestore';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = getFirestore(app);
const collectionRef = collection(db, 'users');

collectionData(collectionRef, { idField: 'uid' })
  .subscribe(users => { console.log(users) });
```

### `collectionChanges()`
The `collectionChanges()` function creates an observable that emits the changes on the specified collection based on the input query. This is different than the collection function in that it does not contain the state of your application but only the individual changes. The optional `events` parameter filters which the type of change populate the array. By default, all changes are emitted. Returns the affected documents and the type of change that occurred (added, modified, or removed).

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `collectionChanges()`                           |
| **params**      | query: `import('firebase/firestore').CollectionReference \| import('firebase/firestore').Query` <br> options?: { events?: `import('firebase/firestore').DocumentChangeType[]` } |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<import('firebase/firestore').DocumentChange[]>`    |

#### TypeScript Example
```ts
import { collectionChanges } from 'rxfire/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection } from 'firebase/firestore';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = getFirestore(app);
const collectionRef = collection(db, 'users');

// Listen to all events
collectionChanges(collectionRef)
  .subscribe(changes => { console.log(changes) });

// Listen to only 'added' events
collectionChanges(collectionRef, { events: ['added'] })
  .subscribe(addedEvents => { console.log(addedEvents) });
```

### `sortedChanges()`
The `sortedChanges()` function creates an observable that emits the reduced state of individual changes. This is different than the collection function in that it creates an array out of every individual change to occur. It also contains the `type` property to indicate what kind of change occurred. The optional `events` parameter will filter which child events populate the array.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `sortedChanges()`                           |
| **params**      | query: `import('firebase/firestore').CollectionReference \| import('firebase/firestore').Query` <br> options?: { events?: `import('firebase/firestore').DocumentChangeType[]` } |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<import('firebase/firestore').DocumentChange[]>`    |

#### TypeScript Example
```ts
import { sortedChanges } from 'rxfire/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection } from 'firebase/firestore';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = getFirestore(app);
const collectionRef = collection(db, 'users');

// Listen to all events
sortedChanges(collectionRef)
  .subscribe(changes => { console.log(changes) });

// Listen to only 'added' events
docChanges(collectionRef, { events: ['added'] })
  .subscribe(addedEvents => { console.log(addedEvents) });
```

### `auditTrail()`
The `auditTrail()` function creates an observable that emits the entire state trail on the specified collection based on the input query. This is useful for debugging or replaying the changes to the database. The optional `events` parameter filters which the type of change populate the array. By default, all changes are emitted.

|                 |                                                      |
|-----------------|------------------------------------------------------|
| **function**    | `auditTrail()`                                       |
| **params**      | ref: `import('firebase/firestore').Reference \| import('firebase/firestore').Query` <br> options?: { events?: `import('firebase/firestore').DocumentChangeType[]` } |
| **import path** | `rxfire/firestore`                                    |
| **return**      | `Observable<import('firebase/firestore').DocumentChange[]>`              |

#### TypeScript Example
```ts
import { auditTrail } from 'rxfire/firestore';
import { firestore } from 'firebase';
import { getFirestore, collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = getFirestore(app);
const collectionRef = collection(db, 'users');
const davidDocRef = doc(collectionRef, 'david');

// Start the audit trail
auditTrail(collectionRef).pipe(
  map(change => {
    return { 
      _key: change.snapshot.key, 
      event: change.event,
      ...change.snapshot.val() 
    };
  })
).subscribe(stateTrail => {
  console.log(stateTrail); 
});

// Seed Firestore
setDoc(davidDocRef, { name: 'David' });

// Remove the document
deleteDoc(davidDocRef);

/**
  First emission:
    [{ _key: '3qtWqaKga8jA; name: 'David', event: 'added' }]
  
  When more events occur, the trail still contains the previous events.

  Second emission:
    [
      { _key: '3qtWqaKga8jA; name: 'David', event: 'added' },
      { _key: '3qtWqaKga8jA; name: 'David', event: 'removed' } 
    ]
  */
```

### `collectionCount()`

Create an observable that emits the server-calculated number of documents in a collection or query. [Learn more about count queries in the Firebase docs](https://firebase.google.com/docs/firestore/query-data/aggregation-queries).

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `collectionCount()`                           |
| **params**      | query: `import('firebase/firestore').CollectionReference \| import('firebase/firestore').Query`|
| **import path** | `rxfire/firestore` or `rxfire/firestore/lite`                       |
| **return**      | `Observable<number>`    |

#### TypeScript Example
```ts
import { collectionCount } from 'rxfire/firestore';
// Also available in firestore/lite
import { collectionCount } from 'rxfire/firestore/lite';

import { getFirestore, collection } from 'firebase/firestore';

const db = getFirestore();
const likesCol = collection(db, 'posts/post_id_123/likes');

collectionCount(likesCol).subscribe(count => {
   console.log(count);
});
```

Note that the observable will complete after the first fetch. This is not a long-lived subscription. To update the count value over time, use the `repeat` operator:

```ts
import { repeat } from 'rxjs';

import { collectionCount} from 'rxfire/firestore';
import { getFirestore, collection } from 'firebase/firestore';

const db = getFirestore();
const likesCol = collection(db, 'posts/post_id_123/likes');

collectionCount(likesCol)
  .pipe(
    // re-fetch every 30 seconds.
    // Stop fetching after 100 re-fetches so we don't do too many reads
    repeat({ count: 100, delay: 30 * 1000 }),
  )
  .subscribe((count) => {
    console.log(count);
  });
```

### `collectionCountSnap()`

Create an observable that emits the server-calculated number of documents in a collection or query. [Learn more about count queries in the Firebase docs](https://firebase.google.com/docs/firestore/query-data/aggregation-queries).

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `collectionCountSnap()`                           |
| **params**      | query: `import('firebase/firestore').CollectionReference \| import('firebase/firestore').Query`|
| **import path** | `rxfire/firestore` or `firebase/firestore/lite`                       |
| **return**      | `Observable<CountSnapshot>`    |

#### TypeScript Example
```ts
import { collectionCountSnap } from 'rxfire/firestore';
// Also available in firestore/lite
import { collectionCountSnap } from 'rxfire/firestore/lite';
import { getFirestore, collection } from 'firebase/firestore';

const db = getFirestore();
const likesCol = collection(db, 'posts/post_id_123/likes');

// One version with the snapshot
countSnap$(likesCol).subscribe(snapshot => {
  console.log(snapshot.data().count);
});
```

## Event Observables

### `fromDocRef()`
The `fromDocRef()` function creates an observable that emits document changes. This is an alias to the `doc()` function.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `fromDocRef()`                           |
| **params**      |  ref: `import('firebase/firestore').DocumentReference` <br> options?: `import('firebase/firestore').SnapshotListenOptions`              |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<import('firebase/firestore').DocumentSnapshot>` |

#### TypeScript Example
```ts
import { fromDocRef } from 'rxfire/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = getFirestore(app);
const davidDocRef = doc(db, 'users/david');

// Seed Firestore
setDoc(davidDocRef, { name: 'David' });

fromDocRef(davidDocRef).subscribe(snap => { console.log(snap); })
```

### `fromCollectionRef()`
The `fromCollectionRef()` function creates an observable that emits changes to the specified collection based on the input query and, optionally, the listen options. This is different than the `collection()` function in that it returns the full `QuerySnapshot` representing the results of the query.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `fromCollectionRef()`                    |
| **params**      | ref: `import('firebase/firestore').Reference \| import('firebase/firestore').Query` <br> options?: `import('firebase/firestore').SnapshotListenOptions` |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<import('firebase/firestore').QuerySnapshot>`    |

#### TypeScript Example
```ts
import { fromCollectionRef } from 'rxfire/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection } from 'firebase/firestore';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = getFirestore(app);
const collectionRef = collection(db, 'users');

fromCollectionRef(collectionRef).subscribe(snap => { console.log(snap.docs); })
```
