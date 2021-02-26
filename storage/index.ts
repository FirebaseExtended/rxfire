import { 
  getDownloadURL as _getDownloadURL,
  getMetadata as _getMetadata,
  uploadBytesResumable as _uploadBytesResumable,
  uploadString as _uploadString,
} from 'firebase/storage';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

type UploadTaskSnapshot = import('firebase/storage').UploadTaskSnapshot;
type StorageReference = import('firebase/storage').StorageReference;
type UploadMetadata = import('firebase/storage').UploadMetadata;
type StringFormat = import('firebase/storage').StringFormat;
type UploadTask = import('firebase/storage').UploadTask;
type UploadResult = import('firebase/storage').UploadResult;

export function fromTask(
  task: UploadTask
): Observable<UploadTaskSnapshot> {
  return new Observable<UploadTaskSnapshot>(subscriber => {
    const progress = (snap: UploadTaskSnapshot): void => subscriber.next(snap);
    const error = (e: Error): void => subscriber.error(e);
    const complete = (): void => subscriber.complete();
    task.on('state_changed', progress, error, complete);
    return () => task.cancel();
  });
}

export function getDownloadURL(ref: StorageReference): Observable<string> {
  return from(_getDownloadURL(ref));
}

// TODO: fix storage typing in firebase, then apply the same fix here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMetadata(ref: StorageReference): Observable<any> {
  return from(getMetadata(ref));
}

// MARK: Breaking change (renaming put to uploadBytesResumable)
export function uploadBytesResumable(
  ref: StorageReference,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  metadata?: UploadMetadata
): Observable<UploadTaskSnapshot> {
  return fromTask(_uploadBytesResumable(ref, data, metadata));
}

// MARK: Breaking change (renaming put to uploadString)
export function uploadString(
  ref: StorageReference,
  data: string,
  format?: StringFormat,
  metadata?: UploadMetadata
): Observable<UploadResult> {
  return from(_uploadString(ref, data, format, metadata));
}

export function percentage(
  task: UploadTask
): Observable<{
  progress: number;
  snapshot: UploadTaskSnapshot;
}> {
  return fromTask(task).pipe(
    map(snapshot => ({
      progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
      snapshot
    }))
  );
}
