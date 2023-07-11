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

// function is used as a namespace to access types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {httpsCallable as vanillaHttpsCallable} from 'firebase/functions';
import {from, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

type Functions = import('firebase/functions').Functions;
type HttpsCallableOptions = import('firebase/functions').HttpsCallableOptions;

export function httpsCallable<RequestData = unknown, ResponseData = unknown>(
    functions: Functions,
    name: string,
    options?: HttpsCallableOptions,
): (data?: RequestData | null) => Observable<ResponseData> {
  const callable = vanillaHttpsCallable<RequestData, ResponseData>(functions, name, options);
  return (data) => {
    return from(callable(data)).pipe(map((r) => r.data));
  };
}
