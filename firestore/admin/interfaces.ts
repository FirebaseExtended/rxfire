export type DocumentReference<T> = import('firebase-admin/firestore').DocumentReference<T>;
export type DocumentData = import('firebase-admin/firestore').DocumentData;
//export type SnapshotListenOptions = import('firebase-admin/firestore').SnapshotListenOptions;
export type Query<T> = import('firebase-admin/firestore').Query<T>;
export type DocumentSnapshot<T> = import('firebase-admin/firestore').DocumentSnapshot<T>;
export type QuerySnapshot<T> = import('firebase-admin/firestore').QuerySnapshot<T>;
export type DocumentChangeType = import('firebase-admin/firestore').DocumentChangeType;
export type DocumentChange<T> = import('firebase-admin/firestore').DocumentChange<T>;
export type QueryDocumentSnapshot<T> = import('firebase-admin/firestore').QueryDocumentSnapshot<T>;
export type CountSnapshot = import('@google-cloud/firestore').AggregateQuerySnapshot<{
    count: import('@google-cloud/firestore').AggregateField<number>;
}>;
