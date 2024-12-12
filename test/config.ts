import fetch from 'cross-fetch';

export default {
  apiKey: 'AIzaSyCD1LqWoxivr0hu7YJ_xF6WyAT4_l-Aw0I',
  authDomain: 'rxfire-test-c497c.firebaseapp.com',
  databaseURL: 'https://rxfire-test-c497c-default-rtdb.firebaseio.com',
  projectId: 'rxfire-test-c497c',
  storageBucket: 'rxfire-test-c497c.appspot.com',
  messagingSenderId: '498378360465',
  appId: '1:498378360465:web:4223d73f0f7dd0aa3d6130',
  measurementId: 'G-K35MQE7EN2',
};

const resolvedEmulatorHubResponse = (async () => {
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  if (!process.env.FIREBASE_EMULATOR_HUB) throw new Error('$FIREBASE_EMULATOR_HUB not found');
  const response = await fetch(`http://${process.env.FIREBASE_EMULATOR_HUB}/emulators`);
  if (!response.ok) throw new Error('Unable to fetch emulator hub REST api.');
  return await response.json();
})();

export const resolvedAuthEmulatorPort = resolvedEmulatorHubResponse.then((it) => it.auth.port);
export const resolvedDatabaseEmulatorPort = resolvedEmulatorHubResponse.then((it) => it.database.port);
export const resolvedFirestoreEmulatorPort = resolvedEmulatorHubResponse.then((it) => it.firestore.port);
export const resolvedStorageEmulatorPort = resolvedEmulatorHubResponse.then((it) => it.storage.port);
export const resolvedFunctionsEmulatorPort = resolvedEmulatorHubResponse.then((it) => it.functions.port);
