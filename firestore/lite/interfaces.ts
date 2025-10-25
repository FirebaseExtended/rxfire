import type * as lite from 'firebase/firestore/lite';

export type DocumentReference<T> = lite.DocumentReference<T>;
export type DocumentData = lite.DocumentData;
export type Query<T = DocumentData, U extends DocumentData = DocumentData> = lite.Query<T, U>;
export type DocumentSnapshot<T> = lite.DocumentSnapshot<T>;
export type QuerySnapshot<T> = lite.QuerySnapshot<T>;
export type QueryDocumentSnapshot<T> = lite.QueryDocumentSnapshot<T>;
export type CountSnapshot<T = DocumentData, U extends DocumentData = DocumentData> = lite.AggregateQuerySnapshot<{
  count: lite.AggregateField<number>;
}, T, U>;
