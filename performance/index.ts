import { EMPTY, from, Observable, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';

type FirebaseApp = import('firebase/app').FirebaseApp;

/**
 * Lazy loads Firebase Performance monitoring and returns the instance as 
 * an observable
 * @param app 
 * @returns Observable<FirebasePerformance>
 */
export const getPerformance$ = (app: FirebaseApp) => from(
  import('firebase/performance').then(module => module.getPerformance(app))
);

/**
 * Creates an observable that begins a trace with a given id. The trace is ended
 * when the observable unsubscribes. The measurement is also logged as a performance
 * entry.
 * @param traceId 
 * @returns Observable<void>
 */
const trace$ = (traceId: string) => {
  if (typeof window !== 'undefined' && window.performance) {
    const entries = window.performance.getEntriesByName(traceId, 'measure') || [];
    const startMarkName = `_${traceId}Start[${entries.length}]`;
    const endMarkName = `_${traceId}End[${entries.length}]`;
    return new Observable<void>(emitter => {
      window.performance.mark(startMarkName);
      emitter.next();
      return {
        unsubscribe: () => {
          window.performance.mark(endMarkName);
          window.performance.measure(traceId, startMarkName, endMarkName);
        }
      };
    });
  } else {
    return EMPTY;
  }
};

/**
 * Creates a function that creates an observable that begins a trace with a given id. The trace is ended
 * when the observable unsubscribes. The measurement is also logged as a performance
 * entry.
 * @param name 
 * @returns (source$: Observable<T>) => Observable<T>
 */
export const trace = <T = any>(name: string) => (source$: Observable<T>) => new Observable<T>(subscriber => {
  const traceSubscription = trace$(name).subscribe();
  return source$.pipe(
    tap(
      () => traceSubscription.unsubscribe(),
      () => {
      },
      () => traceSubscription.unsubscribe()
    )
  ).subscribe(subscriber);
});

/**
 * Creates a function that creates an observable that begins a trace with a given name. The trace runs until
 * a condition resolves to true and then the observable unsubscribes and ends the trace.
 * @param name 
 * @param test 
 * @param options 
 * @returns (source$: Observable<T>) => Observable<T>
 */
export const traceUntil = <T = any>(
  name: string,
  test: (a: T) => boolean,
  options?: { orComplete?: boolean }
) => (source$: Observable<T>) => new Observable<T>(subscriber => {
  const traceSubscription = trace$(name).subscribe();
  return source$.pipe(
    tap(
      a => test(a) && traceSubscription.unsubscribe(),
      () => {
      },
      () => options && options.orComplete && traceSubscription.unsubscribe()
    )
  ).subscribe(subscriber);
});

/**
 * Creates a function that creates an observable that begins a trace with a given name. The trace runs while
 * a condition resolves to true. Once the condition fails the observable unsubscribes
 * and ends the trace.
 * @param name 
 * @param test 
 * @param options 
 * @returns (source$: Observable<T>) => Observable<T>
 */
export const traceWhile = <T = any>(
  name: string,
  test: (a: T) => boolean,
  options?: { orComplete?: boolean }
) => (source$: Observable<T>) => new Observable<T>(subscriber => {
  let traceSubscription: Subscription | undefined;
  return source$.pipe(
    tap(
      a => {
        if (test(a)) {
          traceSubscription = traceSubscription || trace$(name).subscribe();
        } else {
          if (traceSubscription) {
            traceSubscription.unsubscribe();
          }
          traceSubscription = undefined;
        }
      },
      () => {
      },
      () => options && options.orComplete && traceSubscription && traceSubscription.unsubscribe()
    )
  ).subscribe(subscriber);
});

/**
 * Creates a function that creates an observable that begins a trace with a given name. The trace runs until the
 * observable fully completes.
 * @param name 
 * @returns (source$: Observable<T>) => Observable<T>
 */
export const traceUntilComplete = <T = any>(name: string) => (source$: Observable<T>) => new Observable<T>(subscriber => {
  const traceSubscription = trace$(name).subscribe();
  return source$.pipe(
    tap(
      () => {
      },
      () => {
      },
      () => traceSubscription.unsubscribe()
    )
  ).subscribe(subscriber);
});

/**
 * Creates a function that creates an observable that begins a trace with a given name. 
 * The trace runs until the first value emits from the provided observable.
 * @param name 
 * @returns (source$: Observable<T>) => Observable<T>
 */
export const traceUntilFirst = <T = any>(name: string) => (source$: Observable<T>) => new Observable<T>(subscriber => {
  const traceSubscription = trace$(name).subscribe();
  return source$.pipe(
    tap(
      () => traceSubscription.unsubscribe(),
      () => {
      },
      () => {
      }
    )
  ).subscribe(subscriber);
});
