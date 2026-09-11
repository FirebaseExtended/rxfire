import type * as lite from 'firebase/firestore/lite';

export type DocumentReference<T> = lite.DocumentReference<T>;
export type DocumentData = lite.DocumentData;
export type Query<
  AppModelType,
  DbModelType extends DocumentData = DocumentData,
> = lite.Query<AppModelType, DbModelType>;
export type DocumentSnapshot<T> = lite.DocumentSnapshot<T>;
export type QuerySnapshot<T> = lite.QuerySnapshot<T>;
export type QueryDocumentSnapshot<T> = lite.QueryDocumentSnapshot<T>;
export type CountSnapshot<
  AppModelType = DocumentData,
  DbModelType extends DocumentData = DocumentData,
> = lite.AggregateQuerySnapshot<
  {
    count: lite.AggregateField<number>;
  },
  AppModelType,
  DbModelType
>;
