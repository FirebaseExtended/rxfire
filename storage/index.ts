import {
  getDownloadURL as _getDownloadURL,
  getMetadata as _getMetadata,
  uploadBytesResumable as _uploadBytesResumable,
  uploadString as _uploadString,
} from 'firebase/storage';
import {Observable, from} from 'rxjs';
import {debounceTime, map, shareReplay} from 'rxjs/operators';

type UploadTaskSnapshot = import('firebase/storage').UploadTaskSnapshot;
type StorageReference = import('firebase/storage').StorageReference;
type UploadMetadata = import('firebase/storage').UploadMetadata;
type StringFormat = import('firebase/storage').StringFormat;
type UploadTask = import('firebase/storage').UploadTask;
type UploadResult = import('firebase/storage').UploadResult;

export function fromTask(
    task: UploadTask,
): Observable<UploadTaskSnapshot> {
  return new Observable<UploadTaskSnapshot>((subscriber) => {
    const progress = (snap: UploadTaskSnapshot): void => subscriber.next(snap);
    const error = (e: Error): void => subscriber.error(e);
    const complete = (): void => subscriber.complete();
    // emit the current state of the task
    progress(task.snapshot);
    // emit progression of the task
    const unsubscribeFromOnStateChanged = task.on('state_changed', progress);
    // use the promise form of task, to get the last success snapshot
    task.then(
        (snapshot) => {
          progress(snapshot);
          setTimeout(() => complete(), 0);
        },
        (e) => {
          progress(task.snapshot);
          setTimeout(() => error(e), 0);
        },
    );
    // the unsubscribe method returns by storage isn't typed in the
    // way rxjs expects, Function vs () => void, so wrap it
    return function unsubscribe() {
      unsubscribeFromOnStateChanged();
    };
  }).pipe(
      // since we're emitting first the current snapshot and then progression
      // it's possible that we could double fire synchronously; namely when in
      // a terminal state (success, error, canceled). Debounce to address.
      debounceTime(0),
  );
}

export function getDownloadURL(ref: StorageReference): Observable<string> {
  return from(_getDownloadURL(ref));
}

// TODO: fix storage typing in firebase, then apply the same fix here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMetadata(ref: StorageReference): Observable<any> {
  return from(_getMetadata(ref));
}

// MARK: Breaking change (renaming put to uploadBytesResumable)
export function uploadBytesResumable(
    ref: StorageReference,
    data: Blob | Uint8Array | ArrayBuffer,
    metadata?: UploadMetadata,
): Observable<UploadTaskSnapshot> {
  return new Observable<UploadTaskSnapshot>((subscriber) => {
    const task = _uploadBytesResumable(ref, data, metadata);
    const subscription = fromTask(task).subscribe(subscriber);
    return function unsubscribe() {
      subscription.unsubscribe();
      task.cancel();
    };
  }).pipe(shareReplay({bufferSize: 1, refCount: true}));
}

// MARK: Breaking change (renaming put to uploadString)
export function uploadString(
    ref: StorageReference,
    data: string,
    format?: StringFormat,
    metadata?: UploadMetadata,
): Observable<UploadResult> {
  return from(_uploadString(ref, data, format, metadata));
}

export function percentage(
    task: UploadTask,
): Observable<{
  progress: number;
  snapshot: UploadTaskSnapshot;
}> {
  return fromTask(task).pipe(
      map((snapshot) => ({
        progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
        snapshot,
      })),
  );
}
