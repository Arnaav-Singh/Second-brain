import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDygcWMceryq6s_E6eRQ9cw2rZuVdQW1os",
  authDomain: "seconnd-brain-os.firebaseapp.com",
  projectId: "seconnd-brain-os",
  storageBucket: "seconnd-brain-os.firebasestorage.app",
  messagingSenderId: "357818429032",
  appId: "1:357818429032:web:dad1dd71dda8f8895355dd",
  measurementId: "G-S46VRDYR8W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;
