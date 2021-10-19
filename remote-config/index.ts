import {Observable} from 'rxjs';

type RemoteConfig = import('firebase/remote-config').RemoteConfig;
type RemoteConfigValue = import('firebase/remote-config').Value;

import {
  ensureInitialized,
  getValue as baseGetValue,
  getString as baseGetString,
  getNumber as baseGetNumber,
  getBoolean as baseGetBoolean,
  getAll as baseGetAll,
} from 'firebase/remote-config';

export type AllParameters = {
  [key: string]: RemoteConfigValue;
};

interface ParameterSettings<T> {
  remoteConfig: RemoteConfig;
  key: string;
  getter: (remoteConfig: RemoteConfig, key: string) => T;
}

function parameter$<T>({remoteConfig, key, getter}: ParameterSettings<T>): Observable<T> {
  return new Observable((subscriber) => {
    ensureInitialized(remoteConfig).then(() => {
      // 'this' for the getter loses context in the next()
      // call, so it needs to be bound.
      const boundGetter = getter.bind(remoteConfig);
      subscriber.next(boundGetter(remoteConfig, key));
    });
  });
}

export function getValue(remoteConfig: RemoteConfig, key: string) {
  const getter = baseGetValue;
  return parameter$({remoteConfig, key, getter});
}

export function getString(remoteConfig: RemoteConfig, key: string) {
  const getter = baseGetString;
  return parameter$<string>({remoteConfig, key, getter});
}

export function getNumber(remoteConfig: RemoteConfig, key: string) {
  const getter = baseGetNumber;
  return parameter$<number>({remoteConfig, key, getter});
}

export function getBoolean(remoteConfig: RemoteConfig, key: string) {
  const getter = baseGetBoolean;
  return parameter$<boolean>({remoteConfig, key, getter});
}

export function getAll(remoteConfig: RemoteConfig) {
  const getter = baseGetAll;
  // No key is needed for getAll()
  return parameter$<AllParameters>({remoteConfig, key: '', getter});
}
