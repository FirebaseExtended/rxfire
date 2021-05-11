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

import firebase from 'firebase/app';
import {Observable} from 'rxjs';

type DocumentReference<T=DocumentData> = firebase.firestore.DocumentReference<T>;
type SnapshotListenOptions = firebase.firestore.SnapshotListenOptions;
type Query<T=DocumentData> = firebase.firestore.Query<T>;
type DocumentData = firebase.firestore.DocumentData;
type DocumentSnapshot<T=DocumentData> = firebase.firestore.DocumentSnapshot<T>;
type QuerySnapshot<T=DocumentData> = firebase.firestore.QuerySnapshot<T>;

/* eslint-disable @typescript-eslint/no-explicit-any */
function _fromRef(
    ref: any,
    options: SnapshotListenOptions | undefined,
): Observable<any> {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return new Observable((subscriber) => {
    const unsubscribe = ref.onSnapshot(options || {}, subscriber);
    return {unsubscribe};
  });
}

export function fromRef<T=DocumentData>(
  ref: Query<T>,
  options?: SnapshotListenOptions
): Observable<QuerySnapshot<T>>;
export function fromRef<T=DocumentData>(
  ref: DocumentReference<T>,
  options?: SnapshotListenOptions
): Observable<DocumentSnapshot<T>>;
export function fromRef<T=DocumentData>(
  ref: DocumentReference<T> | Query<T>,
  options?: SnapshotListenOptions,
) {
  return _fromRef(ref, options);
}

export function fromDocRef<T=DocumentData>(
    ref: DocumentReference<T>,
    options?: SnapshotListenOptions,
) {
  return fromRef(ref, options);
}

export function fromCollectionRef<T>(
    ref: Query<T>,
    options?: SnapshotListenOptions,
) {
  return fromRef(ref, options);
}
