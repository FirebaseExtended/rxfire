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
  docData,
  collectionData,
  collectionCountSnap$,
  collectionCount$,
} from '../dist/firestore/lite';
import {map} from 'rxjs/operators';
import {default as TEST_PROJECT, firestoreEmulatorPort} from './config';
import {doc as firestoreDoc, getDocs, collection as firestoreCollection, getDoc, Firestore as FirebaseFirestore, CollectionReference, getFirestore, DocumentReference, connectFirestoreEmulator, doc, setDoc, collection as baseCollection, QueryDocumentSnapshot, addDoc} from 'firebase/firestore/lite';
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
 * Create an environment for the tests to run in. The information is returned
 * from the function for use within the test.
 */
const seedTest = async (firestore: FirebaseFirestore) => {
  const colRef = createRandomCol(firestore);
  const davidDoc = doc(colRef, 'david');
  await setDoc(davidDoc, {name: 'David'});
  const shannonDoc = doc(colRef, 'shannon');
  await setDoc(shannonDoc, {name: 'Shannon'});
  const expectedNames = ['David', 'Shannon'];
  const expectedEvents = [
    {name: 'David', type: 'added'},
    {name: 'Shannon', type: 'added'},
  ];
  return {colRef, davidDoc, shannonDoc, expectedNames, expectedEvents};
};

describe('RxFire firestore/lite', () => {
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

  afterEach((done) => {
    deleteApp(app)
      .then(() => done())
      .catch(() => undefined);
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
    it('should emit snapshots', async (done: jest.DoneCallback) => {
      const {colRef, expectedNames} = await seedTest(firestore);

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
    it('should emit snapshots', async (done: jest.DoneCallback) => {
      const {colRef} = await seedTest(firestore);

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
        static collection = colRef.withConverter(Folk);
      }

      collection(Folk.collection)
          .subscribe((docs) => {
            const names = docs.map((doc) => doc.data()?.name);
            const classes = docs.map((doc) => doc.data()?.constructor?.name);
            expect(names).toEqual(['David!', undefined]);
            expect(classes).toEqual(['Folk', undefined]);
            done();
          });
    });
  });

  describe('Data Mapping Functions', () => {
    /**
     * The `unwrap(id)` method will map a collection to its data payload and map the doc ID to a the specificed key.
     */
    it('collectionData should map a QueryDocumentSnapshot[] to an array of plain objects', async (done: jest.DoneCallback) => {
      const {colRef} = await seedTest(firestore);

      // const unwrapped = collection(colRef).pipe(unwrap('userId'));
      const unwrapped = collectionData(colRef, {idField: 'userId'});

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

    it('docData should map a QueryDocumentSnapshot to a plain object', async (done: jest.DoneCallback) => {
      const {davidDoc} = await seedTest(firestore);

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

    /**
     * TODO(jamesdaniels)
     * Having trouble gettings these test green with the emulators
     * FIRESTORE (8.5.0) INTERNAL ASSERTION FAILED: Unexpected state
     */

    it('docData matches the result of docSnapShot.data() when the document doesn\'t exist', async (done) => {
      pending('Not working against the emulator');

      const {colRef} = await seedTest(firestore);

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
      pending('Not working against the emulator');

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

    it('should provide an observable with a count aggregate', async (done) => {
      const colRef = createRandomCol(firestore);
      const entries = [
        addDoc(colRef, { id: createId() }),
        addDoc(colRef, { id: createId() }),
      ];
      await Promise.all(entries)
      
      collectionCountSnap$(colRef).subscribe(snap => {
        expect(snap.data().count).toEqual(entries.length);
        done();
      });

    });

    it('should provide an observable with a count aggregate number', async (done) => {
      const colRef = createRandomCol(firestore);
      const entries = [
        addDoc(colRef, { id: createId() }),
        addDoc(colRef, { id: createId() }),
        addDoc(colRef, { id: createId() }),
        addDoc(colRef, { id: createId() }),
        addDoc(colRef, { id: createId() }),
      ];
      await Promise.all(entries)
      
      collectionCount$(colRef).subscribe(count => {
        expect(count).toEqual(entries.length);
        done();
      });

    });

  })

});
