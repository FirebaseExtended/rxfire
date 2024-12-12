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

// TODO: re-enable eslint after updating to emulator tests
/* eslint-disable */

import {UploadTaskSnapshot, FirebaseStorage, getStorage, connectStorageEmulator, StorageReference, UploadTask, ref as _ref, uploadBytesResumable as _uploadBytesResumable, uploadString as _uploadString} from 'firebase/storage';
import {FirebaseApp, initializeApp, deleteApp} from 'firebase/app';
import {
  fromTask,
  getDownloadURL,
  getMetadata,
  percentage,
  uploadBytesResumable,
  uploadString,
} from '../dist/storage';
import {switchMap, take, reduce, concatMap} from 'rxjs/operators';
import {default as TEST_PROJECT, resolvedStorageEmulatorPort} from './config';
import 'cross-fetch/polyfill';
import md5 from 'md5';

if (typeof XMLHttpRequest === 'undefined') {
  global['XMLHttpRequest'] = require('xhr2');
}

const rando = (): string => [
  Math.random().toString(36).substring(5),
  Math.random().toString(36).substring(5),
  Math.random().toString(36).substring(5),
].join('');

class MockTask {
  _resolve: (value: any) => void;
  _reject: (reason?: any) => void;
  _state_changed_cbs: Array<(snapshot: UploadTaskSnapshot) => {}> = []; // eslint-disable-line camelcase
  _state_change = (progress: any) => { // eslint-disable-line camelcase
    this.snapshot = progress;
    this._state_changed_cbs.forEach((it) => it(progress));
    if (progress.state === 'canceled') {
      this._reject();
    }
    if (progress.state === 'error') {
      this._reject();
    }
    if (progress.state === 'success') {
      this._resolve(progress);
    }
  };
  _unsubscribe = () => {};
  on = (event: string, cb: (snapshot: UploadTaskSnapshot) => {}) => {
    if (event === 'state_changed') {
      this._state_changed_cbs.push(cb);
    }
    return this._unsubscribe;
  };
  snapshot = {_something: rando()};
  then: (onFulfilled: (value: unknown) => void, onRejected?: (reason?: any) => void) => void;
  cancel = () => {};
  constructor() {
    const promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
    this.then = (a, b) => promise.then(a, b);
  }
};

describe('RxFire Storage', () => {
  let app: FirebaseApp;
  let storage: FirebaseStorage;

  // I can't do beforeEach for whatever reason with the Firebase Emulator
  // storage seems to be tearing things down and canceling tasks early...
  // not sure what's up. All using the same app isn't a big deal IMO
  beforeAll(async () => {
    app = initializeApp(TEST_PROJECT, rando());
    storage = getStorage(app, 'default-bucket');
    connectStorageEmulator(storage, 'localhost', await resolvedStorageEmulatorPort);
  });

  afterAll(() => {
    deleteApp(app).catch(() => undefined);
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
    });

    it('should emit the current status and not cancel', (done) => {
      fromTask(mockTask as any).pipe(take(1)).subscribe({
        next: (it) => expect(it).toEqual(mockTask.snapshot),
        error: (it) => {
          throw (it);
        },
        complete: () => {
          // teardown is out of band on unsubscribe, wait a tick
          setTimeout(() => {
            expect(spies.on).toHaveBeenCalledTimes(1);
            expect(spies.unsubscribe).toHaveBeenCalledTimes(1);
            expect(spies.then).toHaveBeenCalledTimes(1);
            expect(spies.cancel).not.toHaveBeenCalled();
            done();
          }, 0);
        },
      });
    });

    it('should emit on progress change and complete when done', (done) => {
      let timesFired = 0;
      const newSnapshot = {_something: rando()};
      const completedSnapshot = {state: 'success'};
      fromTask(mockTask as any).subscribe({
        next: (it) => {
          timesFired++;
          switch (timesFired) {
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
        error: (it) => {
          throw (it);
        },
        complete: () => {
          // teardown is out of band, wait a tick
          setTimeout(() => {
            expect(spies.unsubscribe).toHaveBeenCalledTimes(1);
            done();
          }, 0);
        },
      });
    });

    it('should emit on progress change and error when canceled', (done) => {
      let timesFired = 0;
      const newSnapshot = {_something: rando()};
      const completedSnapshot = {state: 'canceled'};
      fromTask(mockTask as any).subscribe({
        next: (it) => {
          timesFired++;
          switch (timesFired) {
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
        complete: () => {
          throw 'unexpected completion';
        },
      });
    });

    it('should emit the current status when subscribed again (cold)', (done) => {
      fromTask(mockTask as any).pipe(take(1)).subscribe({
        next: (it) => expect(it).toEqual(mockTask.snapshot),
        complete: () => {
          fromTask(mockTask as any).pipe(take(1)).subscribe({
            next: (it) => expect(it).toEqual(mockTask.snapshot),
            complete: () => {
              // teardown is out of band on unsubscribe, wait a tick
              setTimeout(() => {
                expect(spies.on).toHaveBeenCalledTimes(2);
                expect(spies.unsubscribe).toHaveBeenCalledTimes(2);
                expect(spies.then).toHaveBeenCalledTimes(2);
                expect(spies.cancel).not.toHaveBeenCalled();
                done();
              }, 0);
            },
          });
        },
        error: (it) => {
          throw it;
        },
      });
    });

    it('should emit on progress change and complete when done (hot)', (done) => {
      const timesFired = {a: 0, b: 0, c: 0};
      const completed = {a: false, b: false, c: false};
      const completeAndDone = (id: string) => {
        completed[id] = true;
        if (Object.values(completed).every((it) => it)) {
          expect(spies.unsubscribe).toHaveBeenCalledTimes(2);
          done();
        }
      };
      const newSnapshot = {_something: rando()};
      const completedSnapshot = {state: 'sucess'};
      fromTask(mockTask as any).subscribe({
        next: (it) => {
          timesFired['a']++;
          switch (timesFired['a']) {
            case 1:
              expect(it).toEqual(mockTask.snapshot);
              setTimeout(() => {
                mockTask._state_change(newSnapshot);
                fromTask(mockTask as any).subscribe({
                  next: (it) => {
                    timesFired['c']++;
                    switch (timesFired['c']) {
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
        complete: () => completeAndDone('a'),
      });
      fromTask(mockTask as any).subscribe({
        next: (it) => {
          timesFired['b']++;
          switch (timesFired['b']) {
            case 1:
              expect(it).toEqual(mockTask.snapshot); 4;
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
        complete: () => completeAndDone('b'),
      });
    });
  });

  describe('fromTask', () => {
    let ref: StorageReference;
    let task: UploadTask;

    beforeEach(() => {
      ref = _ref(storage, rando());
      task = _uploadBytesResumable(ref, Buffer.from(rando()));
    });

    it('completed upload should fire success and complete', (done) => {
      let firedNext = false;
      task.then(() => {
        fromTask(task).subscribe({
          next: (it) => {
            firedNext = true;
            expect(it.state).toEqual('success');
          },
          error: (it) => {
            throw it;
          },
          complete: () => {
            expect(firedNext).toBeTruthy();
            done();
          },
        });
      }, (err) => {
        throw err;
      });
    });

    it('canceled task should fire canceled and fail', (done) => {
      let firedNext = false;
      task.cancel();
      fromTask(task).subscribe({
        next: (it) => {
          firedNext = true;
          expect(it.state).toEqual('canceled');
        },
        error: () => {
          expect(firedNext).toBeTruthy();
          done();
        },
        complete: () => {
          throw 'unexpected completion';
        },
      });
    });

    it('running should fire and complete', (done) => {
      let emissions = 0;
      let lastEmission: UploadTaskSnapshot;
      fromTask(task).subscribe({
        next: (it) => {
          emissions++;
          lastEmission = it;
        },
        error: (it) => {
          throw it;
        },
        complete: () => {
          expect(emissions).toBeGreaterThan(1);
          expect(lastEmission.state).toEqual('success');
          done();
        },
      });
    });

    it('canceled upload should fire canceled and fail', (done) => {
      let cancelEmitted = false;
      fromTask(task).subscribe({
        next: (it) => {
          task.cancel();
          if (it.state === 'canceled') {
            cancelEmitted = true;
          }
        },
        error: () => {
          expect(cancelEmitted).toBeTruthy();
          done();
        },
        complete: () => {
          throw 'unexpected completion';
        },
      });
    });
  });

  describe('getDownloadURL', () => {
    it('works', (done) => {
      const body = rando();
      const ref = _ref(storage, rando());
      _uploadString(ref, body).then((it) => {
        getDownloadURL(ref).pipe(
            switchMap((url) => fetch(url)),
            switchMap((it) => it.text()),
        ).subscribe((it) => {
          expect(it).toEqual(body);
          done();
        });
      });
    });
  });

  describe('getMetadata', () => {
    it('works', (done) => {
      const body = rando();
      const base64body = btoa(body);
      const md5Hash = btoa(md5(body, {asString: true}) as string);
      const customMetadata = {
        a: rando(),
        b: rando(),
      };
      const ref = _ref(storage, rando());
      _uploadString(ref, base64body, 'base64', {customMetadata}).then(() => {
        getMetadata(ref).subscribe((it) => {
          expect(it.md5Hash).toEqual(md5Hash);
          expect(it.customMetadata).toEqual(customMetadata);
          done();
        });
      });
    });
  });

  describe('percentage', () => {
    let ref: StorageReference;
    let task: UploadTask;

    beforeEach(() => {
      ref = _ref(storage, rando());
      task = _uploadBytesResumable(ref, Buffer.from(rando()));
    });

    it('completed upload should fire 100% and complete', (done) => {
      let firedNext = false;
      task.then(() => {
        percentage(task).subscribe({
          next: (it) => {
            firedNext = true;
            expect(it.progress).toEqual(100);
            expect(it.snapshot.state).toEqual('success');
          },
          error: (it) => {
            throw it;
          },
          complete: () => {
            expect(firedNext).toBeTruthy();
            done();
          },
        });
      }, (err) => {
        throw err;
      });
    });

    it('running should fire and complete', (done) => {
      let lastEmission: {
        progress: number;
        snapshot: UploadTaskSnapshot;
      };
      percentage(task).subscribe({
        next: (it) => {
          expect(typeof it.progress).toEqual('number');
          expect(it.progress).toBeGreaterThanOrEqual(lastEmission?.progress ?? -1);
          lastEmission = it;
        },
        error: (it) => {
          throw it;
        },
        complete: () => {
          expect(lastEmission.progress).toEqual(100);
          expect(lastEmission.snapshot.state).toEqual('success');
          done();
        },
      });
    });

    it('canceled task should fire canceled and fail', (done) => {
      let firedNext = false;
      task.cancel();
      percentage(task).subscribe({
        next: (it) => {
          firedNext = true;
          expect(it.progress).toEqual(0);
          expect(it.snapshot.state).toEqual('canceled');
        },
        error: () => {
          expect(firedNext).toBeTruthy();
          done();
        },
        complete: () => {
          throw 'unexpected completion';
        },
      });
    });

    it('canceled upload should fire canceled and fail', (done) => {
      let cancelEmitted = false;
      percentage(task).subscribe({
        next: (it) => {
          task.cancel();
          if (it.snapshot.state === 'canceled') {
            cancelEmitted = true;
          }
        },
        error: () => {
          expect(cancelEmitted).toBeTruthy();
          done();
        },
        complete: () => {
          throw 'unexpected completion';
        },
      });
    });
  });

  describe('put', () => {
    it('should work', (done) => {
      const ref = _ref(storage, rando());
      const body = rando();
      const customMetadata = {
        a: rando(),
        b: rando(),
      };
      uploadBytesResumable(ref, Buffer.from(body, 'utf8'), {customMetadata}).pipe(
          reduce((_, it) => it),
          concatMap(() => getMetadata(ref)),
      ).subscribe((it) => {
        // TODO(jamesdaniels) MD5 isn't matching, look into this
        // expect(it.md5Hash).toEqual(md5Hash);
        expect(it.customMetadata).toEqual(customMetadata);
        done();
      });
    });

    it('should cancel when unsubscribed', (done) => {
      const ref = _ref(storage, rando());
      uploadBytesResumable(ref, Buffer.from(rando(), 'utf8')).pipe(
          take(1),
          switchMap(() => getDownloadURL(ref)),
      ).subscribe({
        next: () => {
          throw 'expected failure';
        },
        complete: () => {
          throw 'expected failure';
        },
        error: (err) => {
          expect(err.code).toEqual('storage/object-not-found');
          done();
        },
      });
    });
  });

  describe('putString', () => {
    it('should work', (done) => {
      const ref = _ref(storage, rando());
      const body = rando();
      const base64body = btoa(body);
      const md5Hash = btoa(md5(body, {asString: true}) as string);
      const customMetadata = {
        a: rando(),
        b: rando(),
      };
      uploadString(ref, base64body, 'base64', {customMetadata}).pipe(
          reduce((_, it) => it),
          concatMap(() => getMetadata(ref)),
      ).subscribe((it) => {
        expect(it.md5Hash).toEqual(md5Hash);
        expect(it.customMetadata).toEqual(customMetadata);
        done();
      });
    });

    it('should cancel when unsubscribed', (done) => {
      const ref = _ref(storage, rando());
      uploadString(ref, rando()).pipe(
          take(1),
          switchMap(() => getDownloadURL(ref)),
      ).subscribe({
        next: () => {
          throw 'expected failure';
        },
        complete: () => {
          throw 'expected failure';
        },
        error: (err) => {
          expect(err.code).toEqual('storage/object-not-found');
          done();
        },
      });
    });
  });
});
