/**
 * @jest-environment node
 */

/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable @typescript-eslint/no-floating-promises */

// app is used as namespaces to access types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  collection,
  collectionChanges,
  sortedChanges,
  auditTrail,
  docData,
  collectionData,
  collectionCountSnap,
  collectionCount,
} from '../dist/firestore';
import {map, take, skip} from 'rxjs/operators';
import {default as TEST_PROJECT, firestoreEmulatorPort} from './config';
import {getDocs, collection as firestoreCollection, getDoc, DocumentReference, doc as firestoreDoc, Firestore as FirebaseFirestore, CollectionReference, getFirestore, updateDoc, connectFirestoreEmulator, doc, setDoc, DocumentChange, collection as baseCollection, QueryDocumentSnapshot, addDoc, SnapshotOptions} from 'firebase/firestore';
import {initializeApp, deleteApp, FirebaseApp} from 'firebase/app';

const createId = (): string => Math.random().toString(36).substring(5);

/**
 * Create a collection with a random name. This helps sandbox offline tests and
 * makes sure tests don't interfere with each other as they run.
 */
const createRandomCol = (
    firestore: FirebaseFirestore,
): CollectionReference => baseCollection(firestore, createId());

/**
 * Unwrap a snapshot but add the type property to the data object.
 */
const unwrapChange = map((changes: DocumentChange[]) => {
  return changes.map((c) => ({type: c.type, ...c.doc.data()}));
});

/**
 * Create an environment for the tests to run in. The information is returned
 * from the function for use within the test.
 */
const seedTest = (firestore: FirebaseFirestore) => {
  const colRef = createRandomCol(firestore);
  const davidDoc = doc(colRef, 'david');
  setDoc(davidDoc, {name: 'David'});
  const shannonDoc = doc(colRef, 'shannon');
  setDoc(shannonDoc, {name: 'Shannon'});
  const expectedNames = ['David', 'Shannon'];
  const expectedEvents = [
    {name: 'David', type: 'added'},
    {name: 'Shannon', type: 'added'},
  ];
  return {colRef, davidDoc, shannonDoc, expectedNames, expectedEvents};
};

describe('RxFire Firestore', () => {
  let app: FirebaseApp;
  let firestore: FirebaseFirestore;

  /**
   * Each test runs inside it's own app instance and the app
   * is deleted after the test runs.
   *
   * Each test is responsible for seeding and removing data. Helper
   * functions are useful if the process becomes brittle or tedious.
   * Note that removing is less necessary since the tests are run
   * against the emulator
   */
  beforeEach(() => {
    app = initializeApp(TEST_PROJECT, createId());
    firestore = getFirestore(app);
    connectFirestoreEmulator(firestore, 'localhost', firestoreEmulatorPort);
  });

  afterEach(() => {
    deleteApp(app).catch(() => undefined);
  });

  describe('collection', () => {
    /**
     * This is a simple test to see if the collection() method
     * correctly emits snapshots.
     *
     * The test seeds two "people" into the collection. RxFire
     * creats an observable with the `collection()` method and
     * asserts that the two "people" are in the array.
     */
    it('should emit snapshots', (done: jest.DoneCallback) => {
      const {colRef, expectedNames} = seedTest(firestore);

      collection(colRef)
          .pipe(map((docs) => docs.map((doc) => doc.data().name)))
          .subscribe((names) => {
            expect(names).toEqual(expectedNames);
            done();
          });
    });
  });

  describe('collection w/converter', () => {
    /**
     * This is a simple test to see if the collection() method
     * correctly emits snapshots.
     *
     * The test seeds two "people" into the collection. RxFire
     * creats an observable with the `collection()` method and
     * asserts that the two "people" are in the array.
     */
    it('should emit snapshots', (done: jest.DoneCallback) => {
      const {colRef} = seedTest(firestore);

      class Folk {
        constructor(public name: string) { }
        static fromFirestore(snap: QueryDocumentSnapshot) {
          const name = snap.data().name;
          if (name !== 'Shannon') {
            return new Folk(`${snap.data().name}!`);
          } else {
            return undefined;
          }
        }
        static toFirestore() {
          return {};
        }
      }

      collection(colRef.withConverter(Folk))
          .subscribe((docs) => {
            const names = docs.map((doc) => doc.data()?.name);
            const classes = docs.map((doc) => doc.data()?.constructor?.name);
            expect(names).toEqual(['David!', undefined]);
            expect(classes).toEqual(['Folk', undefined]);
            done();
          });
    });
  });

  describe('collectionChanges', () => {
    /**
     * The `stateChanges()` method emits a stream of events as they
     * occur rather than in sorted order.
     *
     * This test adds a "person" and then modifies it. This should
     * result in an array item of "added" and then "modified".
     */
    it('should emit events as they occur', (done: jest.DoneCallback) => {
      const {colRef, davidDoc} = seedTest(firestore);

      setDoc(davidDoc, {name: 'David'});
      const firstChange = collectionChanges(colRef).pipe(take(1));
      const secondChange = collectionChanges(colRef).pipe(skip(1));

      firstChange.subscribe((change) => {
        expect(change[0].type).toBe('added');
        updateDoc(davidDoc, {name: 'David!'});
      });

      secondChange.subscribe((change) => {
        expect(change[0].type).toBe('modified');
        done();
      });
    });
  });

  describe('sortedChanges', () => {
    /**
     * The `sortedChanges()` method reduces the stream of `collectionChanges()` to
     * a sorted array. This test seeds two "people" and checks to make sure
     * the 'added' change type exists. Afterwards, one "person" is modified.
     * The test then checks that the person is modified and in the proper sorted
     * order.
     */
    it('should emit an array of sorted snapshots', (done: jest.DoneCallback) => {
      const {colRef, davidDoc} = seedTest(firestore);

      const addedChanges = sortedChanges(colRef, {events: ['added']}).pipe(unwrapChange);

      const modifiedChanges = sortedChanges(colRef).pipe(
          unwrapChange,
          skip(1),
          take(1),
      );

      let previousData: Array<{}>;

      addedChanges.subscribe((data) => {
        const expectedNames = [
          {name: 'David', type: 'added'},
          {name: 'Shannon', type: 'added'},
        ];
        expect(data).toEqual(expectedNames);
        previousData = data;
        updateDoc(davidDoc, {name: 'David!'});
      });

      modifiedChanges.subscribe((data) => {
        const expectedNames = [
          {name: 'David!', type: 'modified'},
          {name: 'Shannon', type: 'added'},
        ];
        expect(data).toEqual(expectedNames);
        expect(data === previousData).toEqual(false);
        done();
      });
    });

    /**
     * The events parameter in `sortedChanges()` filters out events by change
     * type. This test seeds two "people" and creates two observables to test
     * the filtering. The first observable filters to 'added' and the second
     * filters to 'modified'.
     */
    it('should filter by event type', (done: jest.DoneCallback) => {
      const {colRef, davidDoc, expectedEvents} = seedTest(firestore);

      const addedChanges = sortedChanges(colRef, {events: ['added']}).pipe(unwrapChange);
      const modifiedChanges = sortedChanges(colRef, {events: ['modified']}).pipe(
          unwrapChange,
      );

      addedChanges.subscribe((data) => {
        // kick off the modifiedChanges observable
        expect(data).toEqual(expectedEvents);
        updateDoc(davidDoc, {name: 'David!'});
      });

      modifiedChanges.subscribe((data) => {
        const expectedModifiedEvent = [{name: 'David!', type: 'modified'}];
        expect(data).toEqual(expectedModifiedEvent);
        done();
      });
    });
  });

  describe('auditTrail', () => {
    /**
     * The `auditTrail()` method returns an array of every change that has
     * occurred in the application. This test seeds two "people" into the
     * collection and checks that the two added events are there. It then
     * modifies a "person" and makes sure that event is on the array as well.
     */
    it('should keep create a list of all changes', (done: jest.DoneCallback) => {
      const {colRef, expectedEvents, davidDoc} = seedTest(firestore);

      const firstAudit = auditTrail(colRef).pipe(unwrapChange, take(1));
      const secondAudit = auditTrail(colRef).pipe(unwrapChange, skip(1));

      firstAudit.subscribe((list) => {
        expect(list).toEqual(expectedEvents);
        updateDoc(davidDoc, {name: 'David!'});
      });

      secondAudit.subscribe((list) => {
        const modifiedList = [
          ...expectedEvents,
          {name: 'David!', type: 'modified'},
        ];
        expect(list).toEqual(modifiedList);
        done();
      });
    });

    /**
     * This test seeds two "people" into the collection. It then creates an
     * auditList observable that is filtered to 'modified' events. It modifies
     * a "person" document and ensures that list contains only the 'modified'
     * event.
     */
    it('should filter the trail of events by event type', (done: jest.DoneCallback) => {
      const {colRef, davidDoc} = seedTest(firestore);

      const modifiedAudit = auditTrail(colRef, {events: ['modified']}).pipe(unwrapChange);

      modifiedAudit.subscribe((updateList) => {
        const expectedEvents = [{type: 'modified', name: 'David!'}];
        expect(updateList).toEqual(expectedEvents);
        done();
      });

      updateDoc(davidDoc, {name: 'David!'});
    });
  });

  describe('auditTrail', () => {
    /**
     * The `auditTrail()` method returns an array of every change that has
     * occurred in the application. This test seeds two "people" into the
     * collection and checks that the two added events are there. It then
     * modifies a "person" and makes sure that event is on the array as well.
     */
    it('should keep create a list of all changes', (done: jest.DoneCallback) => {
      const {colRef, expectedEvents, davidDoc} = seedTest(firestore);

      const firstAudit = auditTrail(colRef).pipe(unwrapChange, take(1));
      const secondAudit = auditTrail(colRef).pipe(unwrapChange, skip(1));

      firstAudit.subscribe((list) => {
        expect(list).toEqual(expectedEvents);
        updateDoc(davidDoc, {name: 'David!'});
      });

      secondAudit.subscribe((list) => {
        const modifiedList = [
          ...expectedEvents,
          {name: 'David!', type: 'modified'},
        ];
        expect(list).toEqual(modifiedList);
        done();
      });
    });

    /**
     * This test seeds two "people" into the collection. The wrap operator then converts
     */
    it('should filter the trail of events by event type', (done: jest.DoneCallback) => {
      const {colRef, davidDoc} = seedTest(firestore);

      const modifiedAudit = auditTrail(colRef, {events: ['modified']}).pipe(unwrapChange);

      modifiedAudit.subscribe((updateList) => {
        const expectedEvents = [{type: 'modified', name: 'David!'}];
        expect(updateList).toEqual(expectedEvents);
        done();
      });

      updateDoc(davidDoc, {name: 'David!'});
    });
  });

  describe('Data Mapping Functions', () => {
    /**
     * The `unwrap(id)` method will map a collection to its data payload and map the doc ID to a the specificed key.
     */
    it('collectionData should map a QueryDocumentSnapshot[] to an array of plain objects', (done: jest.DoneCallback) => {
      const {colRef} = seedTest(firestore);

      // const unwrapped = collection(colRef).pipe(unwrap('userId'));
      const unwrapped = collectionData(colRef, {idField: 'userId', serverTimestamps: 'estimate'});

      unwrapped.subscribe((val) => {
        const expectedDoc = {
          name: 'David',
          userId: 'david',
        };
        expect(val).toBeInstanceOf(Array);
        expect(val[0]).toEqual(expectedDoc);
        done();
      });
    });

    it('docData should map a QueryDocumentSnapshot to a plain object', (done: jest.DoneCallback) => {
      const {davidDoc} = seedTest(firestore);

      // const unwrapped = doc(davidDoc).pipe(unwrap('UID'));
      const unwrapped = docData(davidDoc, {idField: 'UID'});

      unwrapped.subscribe((val) => {
        const expectedDoc = {
          name: 'David',
          UID: 'david',
        };
        expect(val).toEqual(expectedDoc);
        done();
      });
    });

    it('docData should be able to provide SnapshotOptions', (done: jest.DoneCallback) => {
      const {davidDoc} = seedTest(firestore);
      const unwrapped = docData(davidDoc, { serverTimestamps: "estimate", idField: 'UID' });

      unwrapped.subscribe((val) => {
        const expectedDoc = {
          name: 'David',
          UID: 'david',
        };
        expect(val).toEqual(expectedDoc);
        done();
      });
    });

    /**
     * TODO(jamesdaniels)
     * Having trouble gettings these test green with the emulators
     * FIRESTORE (8.5.0) INTERNAL ASSERTION FAILED: Unexpected state
     */

    it('docData matches the result of docSnapShot.data() when the document doesn\'t exist', (done) => {
      // pending('Not working against the emulator');

      const {colRef} = seedTest(firestore);

      const nonExistentDoc: DocumentReference = firestoreDoc(colRef,
          createId(),
      );

      const unwrapped = docData(nonExistentDoc);

      getDoc(nonExistentDoc).then((snap) => {
        unwrapped.subscribe((val) => {
          expect(val).toEqual(snap.data());
          done();
        });
      });
    });

    it('collectionData matches the result of querySnapShot.docs when the collection doesn\'t exist', (done) => {
      // pending('Not working against the emulator');

      const nonExistentCollection = firestoreCollection(firestore, createId());

      const unwrapped = collectionData(nonExistentCollection);

      getDocs(nonExistentCollection).then((snap) => {
        unwrapped.subscribe((val) => {
          expect(val).toEqual(snap.docs);
          done();
        });
      });
    });
  });

  describe('Aggregations', () => {
    it('should provide an observable with a count aggregate snapshot', async () => {
      const colRef = createRandomCol(firestore);
      const entries = [
        addDoc(colRef, {id: createId()}),
        addDoc(colRef, {id: createId()}),
      ];
      await Promise.all(entries);

      collectionCountSnap(colRef).subscribe((snap) => {
        expect(snap.data().count).toEqual(entries.length);
      });
    });

    it('should provide an observable with a count aggregate number', async () => {
      const colRef = createRandomCol(firestore);
      const entries = [
        addDoc(colRef, {id: createId()}),
        addDoc(colRef, {id: createId()}),
        addDoc(colRef, {id: createId()}),
        addDoc(colRef, {id: createId()}),
        addDoc(colRef, {id: createId()}),
      ];
      await Promise.all(entries);

      collectionCount(colRef).subscribe((count) => {
        expect(count).toEqual(entries.length);
      });
    });
  });
});
