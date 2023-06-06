import {
  getDownloadURL as _getDownloadURL,
  getMetadata as _getMetadata,
  uploadBytesResumable as _uploadBytesResumable,
  uploadString as _uploadString,
} from 'firebase/storage';
import {Observable, from} from 'rxjs';
import {map, shareReplay} from 'rxjs/operators';

type UploadTaskSnapshot = import('firebase/storage').UploadTaskSnapshot;
type StorageReference = import('firebase/storage').StorageReference;
type UploadMetadata = import('firebase/storage').UploadMetadata;
type StringFormat = import('firebase/storage').StringFormat;
type UploadTask = import('firebase/storage').UploadTask;
type UploadResult = import('firebase/storage').UploadResult;

export function fromTask(task: UploadTask): Observable<UploadTaskSnapshot> {
  return new Observable<UploadTaskSnapshot>((subscriber) => {
    let lastSnapshot: UploadTaskSnapshot | null = null;
    let complete = false;
    let hasError = false;
    let error: any = null;

    const emit = (snapshot: UploadTaskSnapshot) => {
      lastSnapshot = snapshot;
      schedule();
    };

    let id: ReturnType<typeof setTimeout> | null = null;

    /**
     * Schedules an async event to check and emit
     * the most recent snapshot, and complete or error
     * if necessary.
     */
    const schedule = () => {
      if (!id) {
        id = setTimeout(() => {
          id = null;
          if (lastSnapshot) subscriber.next(lastSnapshot);
          if (complete) subscriber.complete();
          if (hasError) subscriber.error(error);
        });
      }
    };

    subscriber.add(() => {
      // If we have any emissions checks scheduled, cancel them.
      if (id) clearTimeout(id);
    });

    // Emit the initial snapshot
    emit(task.snapshot);

    // Take each update and schedule them to be emitted (see `emit`)
    subscriber.add(task.on('state_changed', emit) as () => void);

    // task is a promise, so we can convert that to an observable,
    // this is done for the ergonomics around making sure we don't
    // try to push errors or completions through closed subscribers
    subscriber.add(
        from(task).subscribe({
          next: emit,
          error: (err) => {
            hasError = true;
            error = err;
            schedule();
          },
          complete: () => {
            complete = true;
            schedule();
          },
        }),
    );
  });
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

export function percentage(task: UploadTask): Observable<{
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
