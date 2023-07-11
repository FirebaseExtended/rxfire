import {getDoc, getDocs} from 'firebase/firestore/lite';
import {from, Observable} from 'rxjs';
import {DocumentReference, DocumentData, Query, DocumentSnapshot, QuerySnapshot} from './interfaces';

export function fromRef<T=DocumentData>(ref: DocumentReference<T>): Observable<DocumentSnapshot<T>>;
export function fromRef<T=DocumentData>(ref: Query<T>): Observable<QuerySnapshot<T>>;
export function fromRef<T=DocumentData>(ref: DocumentReference<T>|Query<T>): Observable<DocumentSnapshot<T> | QuerySnapshot<T>> {
  if (ref.type === 'document') {
    return from(getDoc<T>(ref));
  } else {
    return from(getDocs<T>(ref));
  }
}
