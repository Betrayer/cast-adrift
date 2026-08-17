import { expect, test } from '../fixtures';
import { mailbox } from '../mailbox';

const PASSWORD = 'orbit-drifter-42';

test('boot signs in anonymously against the auth emulator', async ({ app }) => {
  const uid = await app.waitForUid();
  expect(uid.length).toBeGreaterThan(0);

  const account = await app.account();
  expect(account.isAnonymous).toBe(true);
  expect(account.providers).toEqual([]);
  expect(account.authError).toBeNull();
});

test('the first authenticated boot adopts the legacy namespace exactly once', async ({
  app,
}) => {
  const uid = await app.waitForUid();
  await app.page.evaluate(() => {
    window.caTest?.settings({ sfxVol: 0.35 });
    window.caTest?.grantMeta({ shards: 12 });
  });
  const account = await app.account();

  expect(account.activeUid).toBe(uid);
  expect(account.namespace).toBe(`ca.${uid}.meta`);
  expect(account.switches).toBe(0);
  expect(account.keys).toContain('ca.adopted');
  expect(account.keys).toContain('ca.uid');
  expect(account.keys).toContain(`ca.${uid}.meta`);
  expect(account.keys).not.toContain('ca.meta');
  expect(account.keys).toContain('ca.settings');
  expect(account.keys).not.toContain(`ca.${uid}.settings`);
});

test('a guest upgrade to email keeps the uid and the progress', async ({
  app,
}) => {
  const guestUid = await app.waitForUid();
  await app.page.evaluate(() => {
    window.caTest?.grantMeta({ shards: 250 });
  });

  await app.openAccount();
  await app.registerEmail(mailbox('keeps-uid'), PASSWORD);

  await expect
    .poll(async () => (await app.account()).providers.join(','), {
      timeout: 30_000,
    })
    .toBe('password');

  const account = await app.account();
  expect(account.uid).toBe(guestUid);
  expect(account.isAnonymous).toBe(false);
  expect(account.switches).toBe(0);
  expect(account.authError).toBeNull();

  expect((await app.state()).meta.shards).toBe(250);
});

test('a reload after the upgrade comes back as the same account', async ({
  app,
}) => {
  const guestUid = await app.waitForUid();
  await app.page.evaluate(() => {
    window.caTest?.grantMeta({ shards: 130 });
  });

  await app.openAccount();
  await app.registerEmail(mailbox('reload'), PASSWORD);
  await expect
    .poll(async () => (await app.account()).providers.length, { timeout: 30_000 })
    .toBe(1);

  await app.reboot();
  await app.waitForUid();

  const account = await app.account();
  expect(account.uid).toBe(guestUid);
  expect(account.providers).toEqual(['password']);
  expect(account.email).toBe(mailbox('reload'));
  expect((await app.state()).meta.shards).toBe(130);
});

test('signing out of an account lands on a separate guest namespace', async ({
  app,
}) => {
  const firstUid = await app.waitForUid();
  await app.page.evaluate(() => {
    window.caTest?.grantMeta({ shards: 400 });
  });

  await app.openAccount();
  await app.registerEmail(mailbox('signout'), PASSWORD);
  await expect
    .poll(async () => (await app.account()).providers.length, { timeout: 30_000 })
    .toBe(1);

  await app.signOut();

  await expect
    .poll(async () => (await app.account()).uid, { timeout: 30_000 })
    .not.toBe(firstUid);

  const account = await app.account();
  expect(account.isAnonymous).toBe(true);
  expect(account.switches).toBe(1);
  expect(account.namespace).toBe(`ca.${account.uid ?? ''}.meta`);
  expect(account.keys).toContain(`ca.${firstUid}.meta`);
  expect((await app.state()).meta.shards).toBe(0);
});

test('signing back in restores the account profile from its own namespace', async ({
  app,
}) => {
  const ownerUid = await app.waitForUid();
  await app.page.evaluate(() => {
    window.caTest?.grantMeta({ shards: 777 });
  });

  await app.openAccount();
  await app.registerEmail(mailbox('roundtrip'), PASSWORD);
  await expect
    .poll(async () => (await app.account()).providers.length, { timeout: 30_000 })
    .toBe(1);

  await app.signOut();
  await expect
    .poll(async () => (await app.account()).uid, { timeout: 30_000 })
    .not.toBe(ownerUid);

  await app.openAccount();
  await app.signInEmail(mailbox('roundtrip'), PASSWORD);

  await expect
    .poll(async () => (await app.account()).uid, { timeout: 30_000 })
    .toBe(ownerUid);

  const account = await app.account();
  expect(account.switches).toBe(2);
  expect((await app.state()).meta.shards).toBe(777);
});

test('a wrong password never abandons the profile it is signed into', async ({
  app,
}) => {
  await app.waitForUid();
  await app.openAccount();
  await app.registerEmail(mailbox('wrongpass'), PASSWORD);
  await expect
    .poll(async () => (await app.account()).providers.length, { timeout: 30_000 })
    .toBe(1);

  const before = await app.account();
  await app.signOut();
  await expect
    .poll(async () => (await app.account()).uid, { timeout: 30_000 })
    .not.toBe(before.uid);
  const guest = await app.account();

  await app.openAccount();
  await app.signInEmail(mailbox('wrongpass'), 'not-the-password');

  await expect(app.testId('email-error')).toBeVisible();
  const after = await app.account();
  expect(after.uid).toBe(guest.uid);
  expect(after.switches).toBe(guest.switches);
});
