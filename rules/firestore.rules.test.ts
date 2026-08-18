import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  allowed,
  boardRow,
  createClient,
  denied,
  disposeClient,
  metaProgress,
  type RulesClient,
} from './harness';

let me: RulesClient;
let other: RulesClient;

beforeAll(async () => {
  me = await createClient('rules-me');
  other = await createClient('rules-other');
});

afterAll(async () => {
  await disposeClient(me);
  await disposeClient(other);
});

const rowOn = (board: string, client: RulesClient, uid = client.uid) =>
  doc(client.db, 'leaderboards', board, 'entries', uid);

describe('leaderboard rows', () => {
  it('lets the owner create a well-shaped row', async () => {
    const row = rowOn('board-create', me);
    expect(await allowed(setDoc(row, boardRow('Captain', 1200)))).toBe(true);
  });

  it('lets the owner raise its own score later', async () => {
    const row = rowOn('board-raise', me);
    await setDoc(row, boardRow('Captain', 1200));
    expect(await allowed(setDoc(row, boardRow('Captain', 1900)))).toBe(true);
  });

  it('refuses a row written under somebody else uid', async () => {
    expect(
      await denied(
        setDoc(rowOn('board-foreign', other, me.uid), boardRow('Impostor', 900)),
      ),
    ).toBe(true);
  });

  it('refuses an out-of-range score', async () => {
    expect(
      await denied(setDoc(rowOn('board-range', me), boardRow('Captain', 900000))),
    ).toBe(true);
  });

  it('never lets anyone delete a row', async () => {
    const row = rowOn('board-delete', me);
    await setDoc(row, boardRow('Captain', 1200));
    expect(await denied(deleteDoc(row))).toBe(true);
  });

  it('lets the owner flip superseded on its own row', async () => {
    const row = rowOn('board-flip', me);
    await setDoc(row, boardRow('Captain', 1200));
    expect(await allowed(setDoc(row, { superseded: true }, { merge: true }))).toBe(
      true,
    );
    expect((await getDoc(row)).data()?.superseded).toBe(true);
  });

  it('refuses a foreign supersede flip', async () => {
    await setDoc(rowOn('board-foreign-flip', me), boardRow('Captain', 1200));
    expect(
      await denied(
        setDoc(
          rowOn('board-foreign-flip', other, me.uid),
          { superseded: true },
          { merge: true },
        ),
      ),
    ).toBe(true);
  });

  it('refuses to un-flip superseded, by value or by omission', async () => {
    const row = rowOn('board-unflip', me);
    await setDoc(row, boardRow('Captain', 1200));
    await setDoc(row, { superseded: true }, { merge: true });
    expect(
      await denied(setDoc(row, { superseded: false }, { merge: true })),
    ).toBe(true);
    expect(await denied(setDoc(row, boardRow('Captain', 1300)))).toBe(true);
    expect((await getDoc(row)).data()?.superseded).toBe(true);
  });

  it('still accepts a merged re-submit that carries the flag along', async () => {
    const row = rowOn('board-resubmit', me);
    await setDoc(row, boardRow('Captain', 1200));
    await setDoc(row, { superseded: true }, { merge: true });
    expect(
      await allowed(setDoc(row, boardRow('Captain', 1400), { merge: true })),
    ).toBe(true);
  });

  it('cannot ride a shape violation in on a supersede flip', async () => {
    const row = rowOn('board-smuggle', me);
    await setDoc(row, boardRow('Captain', 1200));
    expect(
      await denied(
        setDoc(row, { superseded: true, score: 900000 }, { merge: true }),
      ),
    ).toBe(true);
    expect(
      await denied(setDoc(row, { superseded: true, name: '' }, { merge: true })),
    ).toBe(true);
    expect(
      await denied(
        setDoc(row, { superseded: true, level: 99 }, { merge: true }),
      ),
    ).toBe(true);
  });

  it('keeps a superseded row readable to every signed-in client', async () => {
    const row = rowOn('board-readable', me);
    await setDoc(row, boardRow('Captain', 1200));
    await setDoc(row, { superseded: true }, { merge: true });
    expect(
      (await getDoc(rowOn('board-readable', other, me.uid))).exists(),
    ).toBe(true);
  });
});

describe('meta documents', () => {
  const progress = (client: RulesClient, uid = client.uid) =>
    doc(client.db, 'users', uid, 'meta', 'progress');

  it('accepts the plain progress document', async () => {
    expect(await allowed(setDoc(progress(me), metaProgress()))).toBe(true);
  });

  it('accepts a linkedFrom string', async () => {
    expect(
      await allowed(
        setDoc(progress(me), metaProgress({ linkedFrom: 'tg:12345' })),
      ),
    ).toBe(true);
  });

  it('refuses a non-string linkedFrom and unknown keys', async () => {
    expect(
      await denied(setDoc(progress(me), metaProgress({ linkedFrom: 7 }))),
    ).toBe(true);
    expect(
      await denied(setDoc(progress(me), metaProgress({ cheat: true }))),
    ).toBe(true);
  });

  it('accepts a timestamped backup and refuses any other doc id', async () => {
    expect(
      await allowed(
        setDoc(
          doc(me.db, 'users', me.uid, 'meta', 'backup-1760000000000'),
          metaProgress(),
        ),
      ),
    ).toBe(true);
    expect(
      await denied(
        setDoc(doc(me.db, 'users', me.uid, 'meta', 'stash'), metaProgress()),
      ),
    ).toBe(true);
  });

  it('carries account preferences inside the payload, never beside it', async () => {
    expect(
      await allowed(
        setDoc(
          progress(me),
          metaProgress({
            data: JSON.stringify({
              level: 3,
              shards: 40,
              prefs: { battleLayout: 'orbit', theme: 'terminal' },
            }),
          }),
        ),
      ),
    ).toBe(true);
    expect(
      await denied(
        setDoc(progress(me), metaProgress({ prefs: { battleLayout: 'orbit' } })),
      ),
    ).toBe(true);
  });

  it('never lets a meta document be deleted', async () => {
    await setDoc(progress(me), metaProgress());
    expect(await denied(deleteDoc(progress(me)))).toBe(true);
  });

  it('keeps another profile unreadable', async () => {
    await setDoc(progress(me), metaProgress());
    expect(await denied(getDoc(progress(other, me.uid)))).toBe(true);
  });
});

describe('cloud run slot', () => {
  const runSlot = (client: RulesClient, uid = client.uid) =>
    doc(client.db, 'users', uid, 'run', 'current');

  it('writes, reads and deletes its own slot', async () => {
    expect(
      await allowed(
        setDoc(runSlot(me), { v: 1, savedAt: Date.now(), payload: '{}' }),
      ),
    ).toBe(true);
    expect(await allowed(getDoc(runSlot(me)))).toBe(true);
    expect(await allowed(deleteDoc(runSlot(me)))).toBe(true);
  });

  it('refuses a payload that is not a string', async () => {
    expect(
      await denied(
        setDoc(runSlot(me), { v: 1, savedAt: Date.now(), payload: 42 }),
      ),
    ).toBe(true);
  });

  it('refuses a foreign slot', async () => {
    expect(
      await denied(
        setDoc(runSlot(other, me.uid), {
          v: 1,
          savedAt: Date.now(),
          payload: '{}',
        }),
      ),
    ).toBe(true);
  });
});
