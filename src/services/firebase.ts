import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;

const ensureApp = (): FirebaseApp => {
  app ??= initializeApp({
    apiKey: import.meta.env.VITE_FB_API_KEY,
    authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FB_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FB_APP_ID,
  });
  return app;
};

export const ensureAnonAuth = async (): Promise<string | null> => {
  try {
    const auth = getAuth(ensureApp());
    if (auth.currentUser !== null) return auth.currentUser.uid;
    const credential = await signInAnonymously(auth);
    return credential.user.uid;
  } catch (error) {
    console.error("firebase: anonymous sign-in failed", error);
    return null;
  }
};

export const db = (): Firestore => {
  firestore ??= getFirestore(ensureApp());
  return firestore;
};
