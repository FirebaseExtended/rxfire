import * as firebaseConfig from '../firebase.json';

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

export const authEmulatorPort = firebaseConfig.emulators.auth.port;
export const databaseEmulatorPort = firebaseConfig.emulators.database.port;
export const firestoreEmulatorPort = firebaseConfig.emulators.firestore.port;
export const storageEmulatorPort = firebaseConfig.emulators.storage.port;
export const functionsEmulatorPort = firebaseConfig.emulators.functions.port;
