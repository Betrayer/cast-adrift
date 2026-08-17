import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

const EMULATOR_HOST = "127.0.0.1";
const AUTH_EMULATOR_PORT = 9099;
const FIRESTORE_EMULATOR_PORT = 8080;

const emulatorEnabled = (): boolean => import.meta.env.VITE_FB_EMULATOR === "1";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

const ensureApp = (): FirebaseApp => {
  app ??= initializeApp({
    apiKey: import.meta.env.VITE_FB_API_KEY,
    authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FB_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FB_APP_ID,
    measurementId: import.meta.env.VITE_FB_MEASUREMENT_ID,
  });
  return app;
};

export const analyticsApp = (): FirebaseApp => ensureApp();

const ensureAuth = (): Auth => {
  if (auth !== null) return auth;
  auth = getAuth(ensureApp());
  if (emulatorEnabled()) {
    connectAuthEmulator(
      auth,
      `http://${EMULATOR_HOST}:${String(AUTH_EMULATOR_PORT)}`,
      { disableWarnings: true },
    );
  }
  return auth;
};

export const restoredUid = async (): Promise<string | null> => {
  try {
    const current = ensureAuth();
    await current.authStateReady();
    return current.currentUser?.uid ?? null;
  } catch (error) {
    console.warn("firebase: auth state restore failed", error);
    return null;
  }
};

export const ensureAnonAuth = async (): Promise<string | null> => {
  try {
    const current = ensureAuth();
    if (current.currentUser !== null) return current.currentUser.uid;
    const credential = await signInAnonymously(current);
    return credential.user.uid;
  } catch (error) {
    console.error("firebase: anonymous sign-in failed", error);
    return null;
  }
};

export const signInWithTelegram = async (
  initDataRaw: string,
): Promise<string | null> => {
  try {
    const response = await fetch("/api/telegram-auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ initData: initDataRaw }),
    });
    if (!response.ok) {
      console.warn(
        `firebase: telegram auth rejected (${String(response.status)})`,
      );
      return null;
    }
    const body: unknown = await response.json();
    const token =
      typeof body === "object" && body !== null
        ? (body as { token?: unknown }).token
        : null;
    if (typeof token !== "string") return null;
    const credential = await signInWithCustomToken(ensureAuth(), token);
    return credential.user.uid;
  } catch (error) {
    console.warn("firebase: telegram sign-in failed", error);
    return null;
  }
};

export const db = (): Firestore => {
  if (firestore !== null) return firestore;
  firestore = getFirestore(ensureApp());
  if (emulatorEnabled()) {
    connectFirestoreEmulator(
      firestore,
      EMULATOR_HOST,
      FIRESTORE_EMULATOR_PORT,
    );
  }
  return firestore;
};
