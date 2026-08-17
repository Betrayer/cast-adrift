import { expect, test } from '../fixtures';

test('boot signs in anonymously against the auth emulator', async ({ app }) => {
  await expect
    .poll(async () => (await app.state()).uid, { timeout: 30_000 })
    .not.toBeNull();

  const uid = (await app.state()).uid;
  expect(typeof uid).toBe('string');
  expect((uid ?? '').length).toBeGreaterThan(0);
});
