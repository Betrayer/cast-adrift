import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  linkWithRedirect,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import type { Auth, AuthCredential, User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { authErrorCode, type AuthErrorCode } from "@/services/authErrors";
import { providersOf, type AccountInfo } from "@/services/uid";

const EMULATOR_HOST = "127.0.0.1";
const AUTH_EMULATOR_PORT = 9099;
const FIRESTORE_EMULATOR_PORT = 8080;

const emulatorEnabled = (): boolean => import.meta.env.VITE_FB_EMULATOR === "1";

const PROBE_APP_NAME = "ca-probe";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let probeApp: FirebaseApp | null = null;
let probeAuth: Auth | null = null;
let firestore: Firestore | null = null;

const firebaseConfig = (): Record<string, string | undefined> => ({
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
  measurementId: import.meta.env.VITE_FB_MEASUREMENT_ID,
});

const ensureApp = (): FirebaseApp => {
  app ??= initializeApp(firebaseConfig());
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

export const accountInfoOf = (user: User): AccountInfo => ({
  uid: user.uid,
  isAnonymous: user.isAnonymous,
  providers: providersOf(
    user.uid,
    user.providerData.map((entry) => entry.providerId),
  ),
  email: user.email,
});

export const watchAuth = (
  listener: (account: AccountInfo | null) => void,
): (() => void) =>
  onAuthStateChanged(ensureAuth(), (user) => {
    listener(user === null ? null : accountInfoOf(user));
  });

export const currentAccount = (): AccountInfo | null => {
  const user = ensureAuth().currentUser;
  return user === null ? null : accountInfoOf(user);
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

const googleProvider = (): GoogleAuthProvider => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
};

const POPUP_FALLBACK_CODES: readonly AuthErrorCode[] = ["popupBlocked"];

const shouldFallBackToRedirect = (error: unknown): boolean =>
  POPUP_FALLBACK_CODES.includes(authErrorCode(error));

export const signInGoogle = async (): Promise<void> => {
  const current = ensureAuth();
  try {
    await signInWithPopup(current, googleProvider());
  } catch (error) {
    if (!shouldFallBackToRedirect(error)) throw error;
    await signInWithRedirect(current, googleProvider());
  }
};

export const linkGoogle = async (): Promise<void> => {
  const current = ensureAuth();
  const user = current.currentUser;
  if (user === null) {
    await signInGoogle();
    return;
  }
  try {
    await linkWithPopup(user, googleProvider());
  } catch (error) {
    if (!shouldFallBackToRedirect(error)) throw error;
    await linkWithRedirect(user, googleProvider());
  }
};

export const googleCredentialFromError = (
  error: unknown,
): AuthCredential | null => {
  try {
    return GoogleAuthProvider.credentialFromError(error as never);
  } catch {
    return null;
  }
};

export const signInWithSavedCredential = async (
  credential: AuthCredential,
): Promise<void> => {
  await signInWithCredential(ensureAuth(), credential);
};

export const registerEmail = async (
  email: string,
  password: string,
): Promise<void> => {
  await createUserWithEmailAndPassword(ensureAuth(), email, password);
};

export const signInEmail = async (
  email: string,
  password: string,
): Promise<void> => {
  await signInWithEmailAndPassword(ensureAuth(), email, password);
};

export const resetEmail = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(ensureAuth(), email);
};

export const linkEmail = async (
  email: string,
  password: string,
): Promise<void> => {
  const user = ensureAuth().currentUser;
  if (user === null) {
    await registerEmail(email, password);
    return;
  }
  await linkWithCredential(user, EmailAuthProvider.credential(email, password));
};

export const signOutUser = async (): Promise<void> => {
  await signOut(ensureAuth());
};

const ensureProbeAuth = (): Auth => {
  if (probeAuth !== null) return probeAuth;
  probeApp ??= initializeApp(firebaseConfig(), PROBE_APP_NAME);
  probeAuth = getAuth(probeApp);
  if (emulatorEnabled()) {
    connectAuthEmulator(
      probeAuth,
      `http://${EMULATOR_HOST}:${String(AUTH_EMULATOR_PORT)}`,
      { disableWarnings: true },
    );
  }
  return probeAuth;
};

export const probeEmailAccount = async (
  email: string,
  password: string,
): Promise<string> => {
  const probe = ensureProbeAuth();
  const credential = await signInWithEmailAndPassword(probe, email, password);
  const uid = credential.user.uid;
  await signOut(probe).catch(() => undefined);
  return uid;
};

export interface RedirectOutcome {
  uid: string | null;
  error: unknown;
}

export const consumeRedirect = async (): Promise<RedirectOutcome | null> => {
  try {
    const result = await getRedirectResult(ensureAuth());
    return result === null ? null : { uid: result.user.uid, error: null };
  } catch (error) {
    return { uid: null, error };
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
