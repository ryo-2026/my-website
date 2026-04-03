import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDuw5c-e9I9unYFhOgqW11IIdYp7P1xXjY",
  authDomain: "athlete-managementr.firebaseapp.com",
  projectId: "athlete-managementr",
  storageBucket: "athlete-managementr.firebasestorage.app",
  messagingSenderId: "972491585323",
  appId: "1:972491585323:web:32ceb845fb1b1a52bf776e",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
