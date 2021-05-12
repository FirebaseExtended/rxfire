/**
 * @license
 * Copyright 2018 Google LLC
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

import firebase from 'firebase/app';
import 'firebase/storage';
import {
  fromTask
} from '../dist/storage';
import { take, timeout } from 'rxjs/operators';
import { default as TEST_PROJECT, storageEmulatorPort } from './config';

if (typeof XMLHttpRequest === 'undefined') {
  global['XMLHttpRequest'] = require('xhr2');
}

const rando = (): string => Math.random().toString(36).substring(5);

class MockTask {
  _resolve: (value: any) => void;
  _reject: (reason?: any) => void;
  _state_changed_cbs: Array<(snapshot: firebase.storage.UploadTaskSnapshot) => {}> = [];
  _state_change = (progress: any) => {
    this.snapshot = progress;
    this._state_changed_cbs.forEach(it => it(progress));
    if (progress.state === firebase.storage.TaskState.CANCELED) { this._reject() }
    if (progress.state === firebase.storage.TaskState.ERROR) { this._reject() }
    if (progress.state === firebase.storage.TaskState.SUCCESS) { this._resolve(progress) }
  };
  _unsubscribe = () => {};
  on = (event: string, cb: (snapshot: firebase.storage.UploadTaskSnapshot) => {}) => {
    if (event === 'state_changed') { this._state_changed_cbs.push(cb); }
    return this._unsubscribe;
  };
  snapshot = { _something: rando() };
  then: (onFulfilled: (value: unknown) => void, onRejected?: (reason?: any) => void) => void;
  cancel = () => {};
  constructor() {
    const promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
    this.then = (a,b) => promise.then(a,b);
  }
};

describe('RxFire Storage', () => {
  let app: firebase.app.App;
  let storage: firebase.storage.Storage;
  const ref = (path: string): firebase.storage.Reference => {
    return storage.ref(path);
  };

  /**
   * Each test runs inside it's own app instance and the app
   * is deleted after the test runs.
   *
   * Each test is responsible for seeding and removing data. Helper
   * functions are useful if the process becomes brittle or tedious.
   * Note that removing is less necessary since the tests are run
   * against the emulator.
   */
  beforeEach(() => {
    app = firebase.initializeApp(TEST_PROJECT, rando());
    storage = app.storage('default-bucket');
    (storage as any).useEmulator('localhost', storageEmulatorPort);
  });

  afterEach(() => {
    app.delete().catch();
  });

  // Mock these tests, so I can control progress
  describe('fromTask (mock)', () => {

    let mockTask: MockTask;
    let spies: {[key:string]: jest.SpyInstance};

    beforeEach(() => {
      mockTask = new MockTask();
      spies = {
        on: jest.spyOn(mockTask, 'on'),
        then: jest.spyOn(mockTask, 'then'),
        cancel: jest.spyOn(mockTask, 'cancel'),
        unsubscribe: jest.spyOn(mockTask, '_unsubscribe'),
      };
    })

    it('should emit the current status and not cancel', (done) => {
      fromTask(mockTask as any).pipe(take(1)).subscribe({
        next: it => expect(it).toEqual(mockTask.snapshot),
        error: it => { throw(it) },
        complete: () => {
          // teardown is out of band on unsubscribe, wait a tick
          setTimeout(() => {
            expect(spies.on).toHaveBeenCalledTimes(1);
            expect(spies.unsubscribe).toHaveBeenCalledTimes(1);
            expect(spies.then).toHaveBeenCalledTimes(1);
            expect(spies.cancel).not.toHaveBeenCalled();
            done();
          }, 0);
        }
      });
    });

    it('should emit on progress change and complete when done', (done) => {
      let timesFired = 0;
      const newSnapshot = { _something: rando() };
      const completedSnapshot = { state: firebase.storage.TaskState.SUCCESS };
      fromTask(mockTask as any).subscribe({
        next: it => {
          timesFired++;
          switch(timesFired) {
            case 1:
              expect(it).toEqual(mockTask.snapshot);
              mockTask._state_change(newSnapshot);
              break;
            case 2:
              expect(it).toEqual(newSnapshot);
              mockTask._state_change(completedSnapshot);
              break;
            case 3:
              expect(it).toEqual(completedSnapshot);
              break;
            default:
              console.error(it);
              throw 'unexpected emission';
          }
        },
        error: it => { throw(it) },
        complete: () => {
          // teardown is out of band, wait a tick
          setTimeout(() => {
            expect(spies.unsubscribe).toHaveBeenCalledTimes(1);
            done();
          }, 0);
        }
      });
    });

    it('should emit on progress change and error when canceled', (done) => {
      let timesFired = 0;
      const newSnapshot = { _something: rando() };
      const completedSnapshot = { state: firebase.storage.TaskState.CANCELED };
      fromTask(mockTask as any).subscribe({
        next: it => {
          timesFired++;
          switch(timesFired) {
            case 1:
              expect(it).toEqual(mockTask.snapshot);
              mockTask._state_change(newSnapshot);
              break;
            case 2:
              expect(it).toEqual(newSnapshot);
              mockTask._state_change(completedSnapshot);
              break;
            case 3:
              expect(it).toEqual(completedSnapshot);
              break;
            default:
              console.error(it);
              throw 'unexpected emission';
          }
        },
        error: () => {
          // teardown is out of band, wait a tick
          setTimeout(() => {
            expect(spies.unsubscribe).toHaveBeenCalledTimes(1);
            done();
          }, 0);
        },
        complete: () => { throw 'unexpected completion' },
      });
    });

    it('should emit the current status when subscribed again (cold)', (done) => {
      fromTask(mockTask as any).pipe(take(1)).subscribe({
        next: it => expect(it).toEqual(mockTask.snapshot),
        complete: () => {
          fromTask(mockTask as any).pipe(take(1)).subscribe({
            next: it => expect(it).toEqual(mockTask.snapshot),
            complete: () => {
              // teardown is out of band on unsubscribe, wait a tick
              setTimeout(() => {
                expect(spies.on).toHaveBeenCalledTimes(2);
                expect(spies.unsubscribe).toHaveBeenCalledTimes(2);
                expect(spies.then).toHaveBeenCalledTimes(2);
                expect(spies.cancel).not.toHaveBeenCalled();
                done();
              }, 0);
            }
          });
        },
        error: it => { throw it },
      });
    });

    it('should emit on progress change and complete when done (hot)', (done) => {
      let timesFired = {a: 0, b: 0, c: 0};
      let completed = {a: false, b: false, c: false};
      const completeAndDone = (id: string) => {
        completed[id] = true;
        if (Object.values(completed).every(it => it)) {
          expect(spies.unsubscribe).toHaveBeenCalledTimes(2);
          done();
        }
      };
      const newSnapshot = { _something: rando() };
      const completedSnapshot = { state: firebase.storage.TaskState.SUCCESS };
      fromTask(mockTask as any).subscribe({
        next: it => {
          timesFired['a']++;
          switch(timesFired['a']) {
            case 1:
              expect(it).toEqual(mockTask.snapshot);
              setTimeout(() => {
                mockTask._state_change(newSnapshot);
                fromTask(mockTask as any).subscribe({
                  next: it => {
                    timesFired['c']++;
                    switch(timesFired['c']) {
                    case 1:
                      expect(it).toEqual(newSnapshot);
                      break;
                    case 2:
                      expect(it).toEqual(completedSnapshot);
                      break;
                    default:
                      console.error(it);
                      throw 'unexpected emission';
                    }
                  },
                  complete: () => completeAndDone('c'),
                });
              }, 0);
              break;
            case 2:
              expect(it).toEqual(newSnapshot);
              setTimeout(() => mockTask._state_change(completedSnapshot), 0);
              break;
            case 3:
              expect(it).toEqual(completedSnapshot);
              break;
            default:
              console.error(it);
              throw 'unexpected emission';
          }
        },
        complete: () => completeAndDone('a')
      });
      fromTask(mockTask as any).subscribe({
        next: it => {
          timesFired['b']++;
          switch(timesFired['b']) {
            case 1:
              expect(it).toEqual(mockTask.snapshot);4
              break;
            case 2:
              expect(it).toEqual(newSnapshot);
              break;
            case 3:
              expect(it).toEqual(completedSnapshot);
              break;
            default:
              console.error(it);
              throw 'unexpected emission';
          }
        },
        complete: () => completeAndDone('b')
      });
    });

  });

  describe('fromTask', () => {

    let ref: firebase.storage.Reference;
    let task: firebase.storage.UploadTask;

    beforeEach(() => {
      ref = storage.ref(rando());
      task = ref.putString(rando());
    });

    afterEach(done => {
      task.cancel();
      task.then(() => ref.delete(), () => ref.delete()).then(() => done(), () => done());
    });

    it('completed upload should fore success and complete', done => {
      let firedNext = false;
      task.then(() => {
        fromTask(task).subscribe({
          next: it => {
            firedNext = true;
            expect(it.state).toEqual(firebase.storage.TaskState.SUCCESS);
          },
          error: it => { throw it },
          complete: () => {
            expect(firedNext).toBeTruthy();
            done();
          }
        });
      }, err => { throw err });
    });

    it('canceled upload should fire canceled and fail', done => {
      let firedNext = false;
      task.cancel();
      fromTask(task).subscribe({
        next: it => {
          firedNext = true;
          expect(it.state).toEqual(firebase.storage.TaskState.CANCELED);
        },
        error: () => {
          expect(firedNext).toBeTruthy();
          done();
        },
        complete: () => { throw 'unexpected completion' }
      });
    });

  });

});
