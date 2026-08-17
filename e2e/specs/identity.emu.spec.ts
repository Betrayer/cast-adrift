import { expect, test } from '../fixtures';
import { mailbox } from '../mailbox';
import { FROZEN_NOW, type Screens } from '../screens';

const PASSWORD = 'orbit-drifter-42';
const LATER = FROZEN_NOW + 3_600_000;

const clockAt = (app: Screens, at: number): Promise<unknown> =>
  app.page.evaluate((value) => window.caTest?.now(value), at);

const grantShards = (app: Screens, shards: number): Promise<unknown> =>
  app.page.evaluate((n) => {
    window.caTest?.grantMeta({ shards: n });
  }, shards);

const linkedProviders = async (app: Screens): Promise<number> =>
  (await app.account()).providers.length;

const claimOutcome = async (app: Screens): Promise<string | null> =>
  (await app.account()).claimOutcome;

const expectPrompted = async (app: Screens): Promise<void> => {
  await expect
    .poll(() => claimOutcome(app), { timeout: 30_000 })
    .toBe('prompted');
  await expect(app.testId('merge-card')).toBeVisible();
};

test('@firestore a linked account pulls its cloud profile onto a cleared device', async ({
  app,
}) => {
  const uid = await app.waitForUid();
  await grantShards(app, 512);
  await app.openAccount();
  await app.registerEmail(mailbox('new-device'), PASSWORD);
  await expect
    .poll(() => linkedProviders(app), { timeout: 30_000 })
    .toBe(1);
  await app.waitForCloudMeta(512);

  await app.wipeDevice();
  await app.reboot();
  const guestUid = await app.waitForUid();
  expect(guestUid).not.toBe(uid);
  expect((await app.state()).meta.shards).toBe(0);

  await app.openAccount();
  await app.signInEmail(mailbox('new-device'), PASSWORD);

  await expect
    .poll(async () => (await app.account()).uid, { timeout: 30_000 })
    .toBe(uid);
  await expect
    .poll(
      async () => ({
        local: (await app.state()).meta.shards,
        cloud: (await app.cloudMeta())?.shards ?? null,
        watermark: (await app.account()).keys.includes(`ca.${uid}.meta.at`),
      }),
      { timeout: 30_000 },
    )
    .toEqual({ local: 512, cloud: 512, watermark: true });
  expect((await app.account()).merge).toBeNull();
  expect(await app.cloudMeta()).toMatchObject({ linkedFrom: null });
});

test('@firestore a guest with newer progress meets an existing account and keeps its own', async ({
  app,
}) => {
  await app.waitForUid();
  await grantShards(app, 90);
  await app.openAccount();
  await app.registerEmail(mailbox('keep-device'), PASSWORD);
  await expect.poll(() => linkedProviders(app), { timeout: 30_000 }).toBe(1);
  await app.waitForCloudMeta(90);

  await app.wipeDevice();
  await app.reboot();
  await app.waitForUid();
  await clockAt(app, LATER);
  await grantShards(app, 640);
  await app.openAccount();
  await app.signInEmail(mailbox('keep-device'), PASSWORD);

  await expectPrompted(app);
  expect((await app.account()).merge).toMatchObject({
    recommended: 'source',
    sourceLevel: 1,
    targetLevel: 1,
  });

  await app.testId('merge-source-keep').click();
  await expect(app.testId('merge-card')).toBeHidden();
  await expect
    .poll(async () => (await app.state()).meta.shards, { timeout: 30_000 })
    .toBe(640);
});

test('@firestore the same meeting can keep the account profile instead', async ({
  app,
}) => {
  await app.waitForUid();
  await clockAt(app, LATER);
  await grantShards(app, 300);
  await app.openAccount();
  await app.registerEmail(mailbox('keep-account'), PASSWORD);
  await expect.poll(() => linkedProviders(app), { timeout: 30_000 }).toBe(1);
  await app.waitForCloudMeta(300);

  await app.wipeDevice();
  await app.reboot();
  await app.waitForUid();
  await grantShards(app, 25);
  await app.openAccount();
  await app.signInEmail(mailbox('keep-account'), PASSWORD);

  await expectPrompted(app);
  expect((await app.account()).merge).toMatchObject({ recommended: 'target' });

  await app.testId('merge-target-keep').click();
  await expect(app.testId('merge-card')).toBeHidden();
  await expect
    .poll(async () => (await app.state()).meta.shards, { timeout: 30_000 })
    .toBe(300);
});

test('@firestore an untouched account profile is filled without a prompt', async ({
  app,
}) => {
  await app.waitForUid();
  await app.openAccount();
  await app.registerEmail(mailbox('empty-target'), PASSWORD);
  await expect.poll(() => linkedProviders(app), { timeout: 30_000 }).toBe(1);
  await app.waitForCloudMeta(0);

  await app.wipeDevice();
  await app.reboot();
  await app.waitForUid();
  await clockAt(app, LATER);
  await grantShards(app, 77);
  await app.openAccount();
  await app.signInEmail(mailbox('empty-target'), PASSWORD);

  await expect.poll(() => linkedProviders(app), { timeout: 30_000 }).toBe(1);
  await expect(app.testId('merge-card')).toBeHidden();
  await expect
    .poll(async () => (await app.state()).meta.shards, { timeout: 30_000 })
    .toBe(77);
});

test('@firestore an abandoned uid leaves no visible board row behind', async ({
  app,
}) => {
  const ownerUid = await app.waitForUid();
  await grantShards(app, 60);
  await app.page.evaluate(() => window.caTest?.submitDriftScore(1500));
  await expect
    .poll(() => app.page.evaluate(() => window.caTest?.boardUids()), {
      timeout: 30_000,
    })
    .toContain(ownerUid);

  await app.openAccount();
  await app.registerEmail(mailbox('boards'), PASSWORD);
  await expect.poll(() => linkedProviders(app), { timeout: 30_000 }).toBe(1);
  await app.waitForCloudMeta(60);

  await app.wipeDevice();
  await app.reboot();
  const abandonedUid = await app.waitForUid();
  expect(abandonedUid).not.toBe(ownerUid);
  await grantShards(app, 20);
  await app.page.evaluate(() => window.caTest?.submitDriftScore(900));
  await expect
    .poll(() => app.page.evaluate(() => window.caTest?.boardUids()), {
      timeout: 30_000,
    })
    .toContain(abandonedUid);

  await app.openAccount();
  await app.signInEmail(mailbox('boards'), PASSWORD);
  await expectPrompted(app);
  await app.testId('merge-target-keep').click();
  await expect(app.testId('merge-card')).toBeHidden();

  await expect
    .poll(async () => (await app.account()).uid, { timeout: 30_000 })
    .toBe(ownerUid);

  const uids = await app.page.evaluate(() => window.caTest?.boardUids());
  expect(uids).toContain(ownerUid);
  expect(uids).not.toContain(abandonedUid);
});
