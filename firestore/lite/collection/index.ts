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

import {Observable, from} from 'rxjs';
import {map} from 'rxjs/operators';
import {snapToData} from '../document';
import {Query, QueryDocumentSnapshot, DocumentData, CountSnapshot} from '../interfaces';
import {getDocs, getCount} from 'firebase/firestore/lite';

/**
 * Return a stream of document snapshots on a query. These results are in sort order.
 * @param query
 */
export function collection<T=DocumentData>(query: Query<T>): Observable<QueryDocumentSnapshot<T>[]> {
  return from(getDocs<T, DocumentData>(query)).pipe(
      map((changes) => changes.docs),
  );
}

/**
 * Returns a stream of documents mapped to their data payload, and optionally the document ID
 * @param query
 */
export function collectionData<T=DocumentData>(
    query: Query<T>,
    options: {
    idField?: string
  }={},
): Observable<T[]> {
  return collection(query).pipe(
      map((arr) => {
        return arr.map((snap) => snapToData(snap, options) as T);
      }),
  );
}

export function collectionCountSnap(query: Query<unknown>): Observable<CountSnapshot> {
  return from(getCount(query));
}

export function collectionCount(query: Query<unknown>): Observable<number> {
  return collectionCountSnap(query).pipe(map((snap) => snap.data().count));
}
