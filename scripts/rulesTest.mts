import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  deleteDoc,
  getDoc,
  getFirestore,
  setDoc,
} from "firebase/firestore";

// Leaderboard rules test. Runs the real client SDK against the Firestore
// emulator, so `firestore.rules` is what enforces every case below.
//
//   npx firebase-tools emulators:exec --only auth,firestore "npm run test:rules"
//
// firebase-tools is deliberately NOT a dependency (the stack is locked), which is
// why this is an owner-run script rather than part of `npm test`.

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? "cast-adrift-rules-test";
const BOARD = "drift-alltime";

const app = initializeApp({ projectId: PROJECT_ID, apiKey: "emulator" });
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080);

interface Case {
  name: string;
  expect: "allow" | "deny";
  run: (uid: string) => Promise<unknown>;
}

const validEntry = (over: Record<string, unknown> = {}) => ({
  name: "Captain-1A2B",
  score: 1500,
  level: 12,
  ship: "wanderer",
  depth: 30,
  kills: 40,
  scrap: 600,
  updatedAt: Date.now(),
  hash: 987654,
  ...over,
});

const entryRef = (uid: string) =>
  doc(db, "leaderboards", BOARD, "entries", uid);

const CASES: readonly Case[] = [
  {
    name: "own valid write allowed",
    expect: "allow",
    run: (uid) => setDoc(entryRef(uid), validEntry()),
  },
  {
    name: "own entry readable",
    expect: "allow",
    run: (uid) => getDoc(entryRef(uid)),
  },
  {
    name: "foreign-uid write denied",
    expect: "deny",
    run: () => setDoc(entryRef("not-my-uid"), validEntry()),
  },
  {
    name: "oversize score denied",
    expect: "deny",
    run: (uid) => setDoc(entryRef(uid), validEntry({ score: 500001 })),
  },
  {
    name: "negative score denied",
    expect: "deny",
    run: (uid) => setDoc(entryRef(uid), validEntry({ score: -1 })),
  },
  {
    name: "non-integer score denied",
    expect: "deny",
    run: (uid) => setDoc(entryRef(uid), validEntry({ score: 12.5 })),
  },
  {
    name: "over-long name denied",
    expect: "deny",
    run: (uid) => setDoc(entryRef(uid), validEntry({ name: "x".repeat(25) })),
  },
  {
    name: "empty name denied",
    expect: "deny",
    run: (uid) => setDoc(entryRef(uid), validEntry({ name: "" })),
  },
  {
    name: "backdated updatedAt denied",
    expect: "deny",
    run: (uid) =>
      setDoc(entryRef(uid), validEntry({ updatedAt: Date.now() - 3_600_000 })),
  },
  {
    name: "unknown daily state denied",
    expect: "deny",
    run: (uid) => setDoc(entryRef(uid), validEntry({ state: "cheating" })),
  },
  {
    name: "flagged:false denied (flag is set-only)",
    expect: "deny",
    run: (uid) => setDoc(entryRef(uid), validEntry({ flagged: false })),
  },
  {
    name: "delete denied",
    expect: "deny",
    run: (uid) => deleteDoc(entryRef(uid)),
  },
];

const main = async (): Promise<void> => {
  const credential = await signInAnonymously(auth);
  const uid = credential.user.uid;
  console.log(`rules: signed in as ${uid} on project ${PROJECT_ID}`);

  let failures = 0;
  for (const testCase of CASES) {
    let allowed: boolean;
    try {
      await testCase.run(uid);
      allowed = true;
    } catch {
      allowed = false;
    }
    const ok = allowed === (testCase.expect === "allow");
    if (!ok) failures += 1;
    console.log(
      `  ${ok ? "ok  " : "FAIL"} ${testCase.name} (${allowed ? "allowed" : "denied"})`,
    );
  }

  if (failures > 0) {
    console.error(`rules: ${String(failures)} case(s) failed`);
    process.exit(1);
  }
  console.log(`rules: ok — ${String(CASES.length)} cases`);
  process.exit(0);
};

void main();
