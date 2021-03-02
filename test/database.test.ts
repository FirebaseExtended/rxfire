/**
 * @jest-environment jsdom
 */

/**
 * @license
 * Copyright 2021 Google LLC
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

// app/database is used as namespaces to access types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { initializeApp, FirebaseApp, deleteApp, getApp } from 'firebase/app';
import { Database, getDatabase, Reference } from 'firebase/database';
import {
  list,
  ListenEvent,
  objectVal,
  listVal,
  QueryChange,
  fromRef,
  auditTrail,
} from '../dist/database';
import { take, skip, switchMap } from 'rxjs/operators';
import { BehaviorSubject, Observable } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import TEST_PROJECT from './config';

const rando = (): string => Math.random().toString(36).substring(5);

const batch = (
  items: Array<{ name: string; key: string }>
): Readonly<{ [key: string]: unknown }> => {
  const batch: { [key: string]: unknown } = {};
  items.forEach(item => {
    batch[item.key] = item;
  });
  // make batch immutable to preserve integrity
  return Object.freeze(batch);
};

describe('RxFire Database', () => {
  let app: FirebaseApp;
  let database: Database;

  const builtRef = (path: string): Reference => {
    return getDatabase(getApp()).ref(path);
  };

  function prepareList(
    opts: { events?: ListenEvent[]; skipnumber: number } = { skipnumber: 0 }
  ): {
    snapChanges: Observable<QueryChange[]>;
    ref: Reference;
  } {
    const { events, skipnumber } = opts;
    const aref = builtRef(rando());
    const snapChanges = list(aref, events);
    return {
      snapChanges: snapChanges.pipe(skip(skipnumber)),
      ref: aref
    };
  }

  /**
   * Each test runs inside it's own app instance and the app
   * is deleted after the test runs.
   *
   * Database tests run "offline" to reduce "flakeyness".
   *
   * Each test is responsible for seeding and removing data. Helper
   * functions are useful if the process becomes brittle or tedious.
   * Note that removing is less necessary since the tests are run
   * offline.
   *
   * Note: Database tests do not run exactly the same offline as
   * they do online. Querying can act differently, tests must
   * account for this.
   */
  beforeEach(() => {
    app = initializeApp({
      projectId: TEST_PROJECT.projectId,
      databaseURL: TEST_PROJECT.databaseURL
    });
    database = getDatabase(app);
    database.useEmulator("localhost", 9000);
  });

  afterEach(done => {
    deleteApp(app).then(() => done());
  });

  describe('fromRef', () => {
    const items = [
      { name: 'one' },
      { name: 'two' },
      { name: 'three' }
    ].map(item => ({ key: rando(), ...item }));
    const itemsObj = batch(items);

    /**
     * This test checks that "non-existent" or null value references are
     * handled.
     */
    it('it should should handle non-existence', done => {
      const itemRef = builtRef(rando());
      itemRef.set({});
      const obs = fromRef(itemRef, ListenEvent.value);
      obs
        .pipe(take(1))
        .subscribe(change => {
          expect(change.snapshot.exists()).toEqual(false);
          expect(change.snapshot.val()).toEqual(null);
        })
        .add(done);
    });

    /**
     * This test checks that the Observable unsubscribe mechanism works.
     *
     * Calling unsubscribe should trigger the ref.off() method.
     */
    it('it should listen and then unsubscribe', done => {
      const itemRef = builtRef(rando());
      itemRef.set(itemsObj);
      const obs = fromRef(itemRef, ListenEvent.value);
      let count = 0;
      const sub = obs.subscribe(_ => {
        count = count + 1;
        // hard coding count to one will fail if the unsub
        // doesn't actually unsub
        expect(count).toEqual(1);
        done();
        sub.unsubscribe();
        itemRef.push({ name: 'anotha one' });
      });
    });

    describe('events', () => {
      /**
       * This test provides the `child_added` event and tests that only
       * `child_added` events are received.
       */
      it('should stream back a child_added event', (done: any) => {
        const itemRef = builtRef(rando());
        const data = itemsObj;
        itemRef.set(data);
        const obs = fromRef(itemRef, ListenEvent.added);
        let count = 0;
        const sub = obs.subscribe(change => {
          count = count + 1;
          const { event, snapshot } = change;
          expect(event).toEqual(ListenEvent.added);
          expect(snapshot.val()).toEqual(data[snapshot.key!]);
          if (count === items.length) {
            done();
            sub.unsubscribe();
            expect(sub.closed).toEqual(true);
          }
        });
      });

      /**
       * This test provides the `child_changed` event and tests that only
       * `child_changed` events are received.
       */
      it('should stream back a child_changed event', (done: any) => {
        const itemRef = builtRef(rando());
        itemRef.set(itemsObj);
        const obs = fromRef(itemRef, ListenEvent.changed);
        const name = 'look at what you made me do';
        const key = items[0].key;
        const sub = obs.subscribe(change => {
          const { event, snapshot } = change;
          expect(event).toEqual(ListenEvent.changed);
          expect(snapshot.key).toEqual(key);
          expect(snapshot.val()).toEqual({ key, name });
          sub.unsubscribe();
          done();
        });
        itemRef.child(key).update({ name });
      });

      /**
       * This test provides the `child_removed` event and tests that only
       * `child_removed` events are received.
       */
      it('should stream back a child_removed event', (done: any) => {
        const itemRef = builtRef(rando());
        itemRef.set(itemsObj);
        const obs = fromRef(itemRef, ListenEvent.removed);
        const key = items[0].key;
        const name = items[0].name;
        const sub = obs.subscribe(change => {
          const { event, snapshot } = change;
          expect(event).toEqual(ListenEvent.removed);
          expect(snapshot.key).toEqual(key);
          expect(snapshot.val()).toEqual({ key, name });
          sub.unsubscribe();
          done();
        });
        itemRef.child(key).remove();
      });

      /**
       * This test provides the `child_moved` event and tests that only
       * `child_moved` events are received.
       */
      it('should stream back a child_moved event', (done: any) => {
        const itemRef = builtRef(rando());
        itemRef.set(itemsObj);
        const obs = fromRef(itemRef, ListenEvent.moved);
        const key = items[2].key;
        const name = items[2].name;
        const sub = obs.subscribe(change => {
          const { event, snapshot } = change;
          expect(event).toEqual(ListenEvent.moved);
          expect(snapshot.key).toEqual(key);
          expect(snapshot.val()).toEqual({ key, name });
          sub.unsubscribe();
          done();
        });
        itemRef.child(key).setPriority(-100, () => {});
      });

      /**
       * This test provides the `value` event and tests that only
       * `value` events are received.
       */
      it('should stream back a value event', (done: any) => {
        const itemRef = builtRef(rando());
        const data = itemsObj;
        itemRef.set(data);
        const obs = fromRef(itemRef, ListenEvent.value);
        const sub = obs.subscribe(change => {
          const { event, snapshot } = change;
          expect(event).toEqual(ListenEvent.value);
          expect(snapshot.val()).toEqual(data);
          done();
          sub.unsubscribe();
          expect(sub.closed).toEqual(true);
        });
      });

      /**
       * This test provides queries a reference and checks that the queried
       * values are streamed back.
       */
      it('should stream back query results', (done: any) => {
        const itemRef = builtRef(rando());
        itemRef.set(itemsObj);
        const query = itemRef.orderByChild('name').equalTo(items[0].name);
        const obs = fromRef(query, ListenEvent.value);
        obs.subscribe(change => {
          let child;
          change.snapshot.forEach(snap => {
            child = snap.val();
            return true;
          });
          expect(child).toEqual(items[0]);
          done();
        });
      });
    });
  });

  describe('list', () => {
    const items = [
      { name: 'zero' },
      { name: 'one' },
      { name: 'two' }
    ].map((item, i) => ({ key: `${i}`, ...item }));

    const itemsObj = batch(items);

    describe('events', () => {
      /**
       * `value` events are provided first when subscribing to a list. We need
       * to know what the "intial" data list is, so a value event is used.
       */
      it('should stream value at first', done => {
        const someRef = builtRef(rando());
        const obs = list(someRef, [ListenEvent.added]);
        obs
          .pipe(take(1))
          .subscribe(changes => {
            const data = changes.map(change => change.snapshot.val());
            expect(data).toEqual(items);
          })
          .add(done);

        someRef.set(itemsObj);
      });

      /**
       * This test checks that `child_added` events are only triggered when
       * specified in the events array.
       *
       * The first result is skipped because it is always `value`. A `take(1)`
       * is used to close the stream after the `child_added` event occurs.
       */
      it('should process a new child_added event', done => {
        const aref = builtRef(rando());
        const obs = list(aref, [ListenEvent.added]);
        obs
          .pipe(skip(1), take(1))
          .subscribe(changes => {
            const data = changes.map(change => change.snapshot.val());
            expect(data[3]).toEqual({ name: 'anotha one' });
          })
          .add(done);
        aref.set(itemsObj);
        aref.push({ name: 'anotha one' });
      });

      /**
       * This test checks that events are emitted in proper order. The reference
       * is queried and the test ensures that the array is in proper order.
       */
      it('should stream in order events', done => {
        const aref = builtRef(rando());
        const obs = list(aref.orderByChild('name'), [ListenEvent.added]);
        obs
          .pipe(take(1))
          .subscribe(changes => {
            const names = changes.map(change => change.snapshot.val().name);
            expect(names[0]).toEqual('one');
            expect(names[1]).toEqual('two');
            expect(names[2]).toEqual('zero');
          })
          .add(done);
        aref.set(itemsObj);
      });

      /**
       * This test checks that the array is in order with child_added specified.
       * A new record is added that appears on top of the query and the test
       * skips the first value event and checks that the newly added item is
       * on top.
       */
      it('should stream in order events w/child_added', done => {
        const aref = builtRef(rando());
        const obs = list(aref.orderByChild('name'), [ListenEvent.added]);
        obs
          .pipe(skip(1), take(1))
          .subscribe(changes => {
            const names = changes.map(change => change.snapshot.val().name);
            expect(names[0]).toEqual('anotha one');
            expect(names[1]).toEqual('one');
            expect(names[2]).toEqual('two');
            expect(names[3]).toEqual('zero');
          })
          .add(done);
        aref.set(itemsObj);
        aref.push({ name: 'anotha one' });
      });

      /**
       * This test checks that a filtered reference still emits the proper events.
       */
      it('should stream events filtering', done => {
        const aref = builtRef(rando());
        const obs = list(aref.orderByChild('name').equalTo('zero'), [
          ListenEvent.added
        ]);
        obs
          .pipe(skip(1), take(1))
          .subscribe(changes => {
            const names = changes.map(change => change.snapshot.val().name);
            expect(names[0]).toEqual('zero');
            expect(names[1]).toEqual('zero');
          })
          .add(done);
        aref.set(itemsObj);
        aref.push({ name: 'zero' });
      });

      /**
       * This test checks that the a `child_removed` event is processed in the
       * array by testing that the new length is shorter than the original
       * length.
       */
      it('should process a new child_removed event', done => {
        const aref = builtRef(rando());

        function setUp() {
          aref.set(itemsObj);
          aref.child(items[0].key).remove();
        }

        function listen() {
          list(aref, [ListenEvent.removed])
          .pipe(take(1))
          .subscribe(changes => {
            const data = changes.map(change => change.snapshot.val());
            expect(data.length).toEqual(items.length - 1);
          })
          .add(done);
        }

        setUp();
        listen();
        
      });

      /**
       * This test checks that the `child_changed` event is processed by
       * checking the new value of the object in the array.
       */
      it('should process a new child_changed event', done => {
        const aref = builtRef(rando());
        list(aref, [ListenEvent.added, ListenEvent.changed])
          .pipe(skip(1), take(1))
          .subscribe(changes => {
            const data = changes.map(change => change.snapshot.val());
            expect(data[1].name).toEqual('lol');
          })
          .add(done);
        
        aref.set(itemsObj).then(() => {
          aref.child(items[1].key).update({ name: 'lol' });
        });
      });

      /**
       * This test checks the `child_moved` event is processed by checking that
       * the new position is properly updated.
       */
      it('should process a new child_moved event', done => {
        const aref = builtRef(rando());
        list(aref, [ListenEvent.added, ListenEvent.moved])
          .pipe(skip(1))
          .subscribe(changes => {
            const data = changes.map(change => change.snapshot.val());
            // We moved the first item to the last item, so we check that
            // the new result is now the last result
            expect(data[data.length - 1]).toEqual(items[0]);
            done();
          });
        
        aref.set(itemsObj).then(() => {
          aref.child(items[0].key).setPriority('a', () => {});
        });
      });

      /**
       * If no events array is provided in `list()` all events are listened to.
       *
       * This test checks that all events are processed without providing the
       * array.
       */
      it('should listen to all events by default', done => {
        const { snapChanges, ref } = prepareList();
        snapChanges
          .pipe(take(1))
          .subscribe(actions => {
            const data = actions.map(a => a.snapshot.val());
            expect(data).toEqual(items);
          })
          .add(done);
        ref.set(itemsObj);
      });

      /**
       * This test checks that multiple subscriptions work properly.
       */
      it('should handle multiple subscriptions (hot)', done => {
        const { snapChanges, ref } = prepareList();
        const sub = snapChanges.subscribe(() => {}).add(done);
        snapChanges
          .pipe(take(1))
          .subscribe(actions => {
            const data = actions.map(a => a.snapshot.val());
            expect(data).toEqual(items);
          })
          .add(sub);
        ref.set(itemsObj);
      });

      /**
       * This test checks that multiple subscriptions work properly.
       */
      it('should handle multiple subscriptions (warm)', done => {
        const { snapChanges, ref } = prepareList();
        snapChanges
          .pipe(take(1))
          .subscribe(() => {})
          .add(() => {
            snapChanges
              .pipe(take(1))
              .subscribe(actions => {
                const data = actions.map(a => a.snapshot.val());
                expect(data).toEqual(items);
              })
              .add(done);
          });
        ref.set(itemsObj);
      });

      /**
       * This test checks that only `child_added` events are processed.
       */
      it('should listen to only child_added events', done => {
        const { snapChanges, ref } = prepareList({
          events: [ListenEvent.added],
          skipnumber: 0
        });
        snapChanges
          .pipe(take(1))
          .subscribe(actions => {
            const data = actions.map(a => a.snapshot.val());
            expect(data).toEqual(items);
          })
          .add(done);
        ref.set(itemsObj);
      });

      /**
       * This test checks that only `child_added` and `child_changed` events are
       * processed.
       */

      it('should listen to only child_added, child_changed events', done => {
        const { snapChanges, ref } = prepareList({
          events: [ListenEvent.added, ListenEvent.changed],
          skipnumber: 1
        });
        const name = 'ligatures';
        snapChanges
          .pipe(take(1))
          .subscribe(actions => {
            const data = actions.map(a => a.snapshot.val());
            const copy = [...items];
            copy[0].name = name;
            expect(data).toEqual(copy);
          })
          .add(done);
        
        ref.set(itemsObj).then(() => {
          ref.child(items[0].key).update({ name });
        });
      });

      /**
       * This test checks that empty sets are processed.
       */
      it('should handle empty sets', done => {
        const aref = builtRef(rando());
        aref.set({});
        list(aref)
          .pipe(take(1))
          .subscribe(data => {
            expect(data.length).toEqual(0);
          })
          .add(done);
      });

      /**
       * This test checks that dynamic querying works even with results that
       * are empty.
       */
      it('should handle dynamic queries that return empty sets', done => {
        let count = 0;
        const namefilter$ = new BehaviorSubject<number | null>(null);
        const aref = builtRef(rando());
        aref.set(itemsObj);
        namefilter$
          .pipe(
            switchMap(name => {
              const filteredRef = name
                ? aref.child('name').equalTo(name)
                : aref;
              return list(filteredRef);
            }),
            take(2)
          )
          .subscribe(data => {
            count = count + 1;
            // the first time should all be 'added'
            if (count === 1) {
              expect(Object.keys(data).length).toEqual(3);
              namefilter$.next(-1);
            }
            // on the second round, we should have filtered out everything
            if (count === 2) {
              expect(Object.keys(data).length).toEqual(0);
            }
          })
          .add(done);
      });
    });
  });

  describe('auditTrail', () => {
    const items = [
      { name: 'zero' },
      { name: 'one' },
      { name: 'two' }
    ].map((item, i) => ({ key: `${i}`, ...item }));

    const itemsObj = batch(items);

    function prepareAuditTrail(
      opts: { events?: ListenEvent[]; skipnumber: number } = { skipnumber: 0 }
    ): {
      changes: Observable<QueryChange[]>;
      ref: Reference;
    } {
      const { events, skipnumber } = opts;
      const aref = builtRef(rando());
      aref.set(itemsObj);
      const changes = auditTrail(aref, events);
      return {
        changes: changes.pipe(skip(skipnumber)),
        ref: aref
      };
    }

    /**
     * This test checks that auditTrail retuns all events by default.
     */
    it('should listen to all events by default', done => {
      const { changes } = prepareAuditTrail();
      changes.subscribe(actions => {
        const data = actions.map(a => a.snapshot.val());
        expect(data).toEqual(items);
        done();
      });
    });
  });

  describe('Data Mapping Functions', () => {
    const items = [
      { name: 'one' },
      { name: 'two' },
      { name: 'three' }
    ].map(item => ({ key: rando(), ...item }));
    const itemsObj = batch(items);

    /**
     * The `listVal` function should map a query to an array of objects
     */
    it('listVal should map a query to an array of objects', (done) => {
      const itemRef = builtRef(rando());
      const data = { testKey: { hello: 'world' } };
      itemRef.set(data);

      const obs = listVal<any>(itemRef, 'KEY').pipe(take(1));

      obs.subscribe(val => {
        expect(Array.isArray(val)).toEqual(true);
        expect(val[0].KEY).toEqual('testKey');
        expect(val[0].hello).toEqual('world');
        done();
      });
    });

    /**
     * The `objectVal` function should map a query to its object val
     */
    it('objectVal should map a reference or query to its value', (done) => {
      const itemRef = builtRef(rando());
      itemRef.set(itemsObj);
      const obs = objectVal(itemRef).pipe(take(1));

      obs.subscribe(val => {
        expect(val).toEqual(itemsObj);
        done();
      });
    });
  });
});
