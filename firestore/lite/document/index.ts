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

// TODO fix the import
import {DocumentReference, DocumentSnapshot, DocumentData} from '../interfaces';
import {map} from 'rxjs/operators';
import {from, Observable} from 'rxjs';
import {getDoc} from 'firebase/firestore/lite';

export function doc<T=DocumentData>(ref: DocumentReference<T>): Observable<DocumentSnapshot<T>> {
  return from(getDoc<T, DocumentData>(ref));
}

/**
 * Returns a stream of a document, mapped to its data payload and optionally the document ID
 * @param query
 */
export function docData<T=DocumentData>(
    ref: DocumentReference<T>,
    options: {
    idField?: string
  }={},
): Observable<T> {
  return doc(ref).pipe(map((snap) => snapToData(snap, options) as T));
}

export function snapToData<T=DocumentData>(
    snapshot: DocumentSnapshot<T>,
    options: {
      idField?: string,
    }={},
): {} | undefined {
  // TODO clean up the typings
  const data = snapshot.data() as any;
  // match the behavior of the JS SDK when the snapshot doesn't exist
  // it's possible with data converters too that the user didn't return an object
  if (!snapshot.exists() || typeof data !== 'object' || data === null) {
    return data;
  }
  if (options.idField) {
    data[options.idField] = snapshot.id;
  }
  return data;
}
