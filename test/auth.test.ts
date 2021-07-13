
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
import { default as config, authEmulatorPort } from './config';
import { initializeApp, FirebaseApp, deleteApp } from 'firebase/app';
import { getAuth, Auth, useAuthEmulator, signInAnonymously } from 'firebase/auth';
import { authState } from '../dist/auth';
import { skip, take } from 'rxjs/operators';

describe('RxFire Auth', () => {
  let app: FirebaseApp;
  let auth: Auth;

  beforeEach(() => {
    app = initializeApp(config);
    auth = getAuth(app);
    useAuthEmulator(auth, `http://localhost:${authEmulatorPort}`);
  });

  afterEach(() => {
    deleteApp(app).catch();
  });

  describe('Authentication state', () => {

    it('should initially be unauthenticated', done => {
      authState(auth)
        .pipe(take(1))
        .subscribe(state => {
          expect(state).toBeNull();
        })
        .add(done);
    });

    it('should trigger an authenticated state', done => {
      authState(auth)
        .pipe(skip(1), take(1))
        .subscribe(state => {
          expect(state).not.toBeNull();
          expect(state.isAnonymous).toEqual(true);
        })
        .add(done);

      signInAnonymously(auth);
    });

  });

});
