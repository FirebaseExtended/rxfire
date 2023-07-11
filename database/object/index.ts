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

import {QueryChange, ListenEvent, Query} from '../interfaces';
import {fromRef} from '../fromRef';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

/**
 * Get the snapshot changes of an object
 * @param query
 */
export function object(query: Query): Observable<QueryChange> {
  return fromRef(query, ListenEvent.value);
}

/**
 * Get an array of object values, optionally with a mapped key
 * @param query object ref or query
 * @param keyField map the object key to a specific field
 */
export function objectVal<T>(query: Query, options: { keyField?: string }={}): Observable<T> {
  return fromRef(query, ListenEvent.value).pipe(
      map((change) => changeToData(change, options) as T),
  );
}

export function changeToData(change: QueryChange, options: { keyField?: string}={}): {} {
  const val = change.snapshot.val();

  // match the behavior of the JS SDK when the snapshot doesn't exist
  if (!change.snapshot.exists()) {
    return val;
  }

  // val can be a primitive type
  if (typeof val !== 'object') {
    return val;
  }

  return {
    ...val,
    ...(options.keyField ? {[options.keyField]: change.snapshot.key} : null),
  };
}
