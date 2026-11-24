import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBfaiNTYwjwpuIY5pvvT4G6zh8AByXKlqs",
  authDomain: "prestier-system-llp.firebaseapp.com",
  projectId: "prestier-system-llp",
  storageBucket: "prestier-system-llp.firebasestorage.app",
  messagingSenderId: "948957674286",
  appId: "1:948957674286:web:b7b24e8451d610d4b8d8bf",
  measurementId: "G-2L95ENYZQ7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Initialize Analytics if supported in browser environment
isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
}).catch(() => {});

// Enable offline persistence if supported
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support all of the features required to enable persistence');
    }
  });
} catch (e) {
  console.error('Persistence error:', e);
}
