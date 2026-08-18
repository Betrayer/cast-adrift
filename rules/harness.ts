import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  type Auth,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

export const EMULATOR_HOST = '127.0.0.1';
export const AUTH_PORT = 9099;
export const FIRESTORE_PORT = 8080;
export const RULES_PROJECT_ID = 'cast-adrift-rules';

export interface RulesClient {
  uid: string;
  db: Firestore;
  auth: Auth;
  app: FirebaseApp;
}

export const createClient = async (name: string): Promise<RulesClient> => {
  const app = initializeApp(
    { apiKey: 'rules-test', projectId: RULES_PROJECT_ID },
    name,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${String(AUTH_PORT)}`, {
    disableWarnings: true,
  });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_PORT);
  const credential = await signInAnonymously(auth);
  return { uid: credential.user.uid, db, auth, app };
};

export const disposeClient = async (client: RulesClient): Promise<void> => {
  await deleteApp(client.app);
};

export const allowed = async (action: Promise<unknown>): Promise<boolean> => {
  try {
    await action;
    return true;
  } catch {
    return false;
  }
};

export const denied = async (action: Promise<unknown>): Promise<boolean> =>
  !(await allowed(action));

export const boardRow = (
  name: string,
  score: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  name,
  score,
  level: 4,
  ship: 'wanderer',
  depth: 12,
  kills: 9,
  scrap: 300,
  updatedAt: Date.now(),
  ...extra,
});

export const metaProgress = (
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  v: 1,
  updatedAt: Date.now(),
  data: JSON.stringify({ level: 3, shards: 40 }),
  ...extra,
});
