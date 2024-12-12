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

import {initializeApp, FirebaseApp} from 'firebase/app';
import {getFunctions, connectFunctionsEmulator, Functions} from 'firebase/functions';
import {httpsCallable} from '../dist/functions';
import {default as TEST_PROJECT, resolvedFunctionsEmulatorPort} from './config';

const rando = (): string => Math.random().toString(36).substring(5);

describe('RxFire Functions', () => {
  let app: FirebaseApp;
  let functions: Functions;

  /**
   * Each test runs inside it's own app instance and the app
   * is deleted after the test runs.
   *
   * Each test is responsible for seeding and removing data. Helper
   * functions are useful if the process becomes brittle or tedious.
   * Note that removing is less necessary since the tests are run
   * against the emulator.
   */
  beforeEach(async () => {
    app = initializeApp(TEST_PROJECT, rando());
    functions = getFunctions(app);
    connectFunctionsEmulator(functions, 'localhost', await resolvedFunctionsEmulatorPort);
  });

  describe('httpsCallable', () => {
    it('should work', (done: jest.DoneCallback) => {
      const string = rando();
      const reverseString = (it:String) => (it === '') ? '' : reverseString(it.substr(1)) + it.charAt(0);
      httpsCallable<{string: String}, {reversed: String}>(functions, 'reverseString')({string}).subscribe((it) => {
        expect(it).toEqual({reversed: reverseString(string)});
        done();
      });
    });
  });
});
