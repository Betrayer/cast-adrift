import { expect, test } from '../fixtures';

test.describe('screen motion under reduced motion', () => {
  test('no screen animates its content in', async ({ app }) => {
    await app.testId('menu-settings').click();
    await app.expectScreen('settings');
    const probe = await app.page.evaluate(() => ({
      motion: document.documentElement.dataset.caMotion ?? null,
      media: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    }));
    expect(probe).toEqual({ motion: 'reduced', media: true });
    const moving = await app.page.evaluate(() => {
      const root = document.querySelector('[data-screen="settings"]');
      if (root === null) return -1;
      const nodes = [
        root.querySelector('[data-screen-inner]'),
        ...root.querySelectorAll('[data-rise]'),
      ].filter((node): node is Element => node !== null);
      return nodes.filter(
        (node) => getComputedStyle(node).animationName !== 'none',
      ).length;
    });
    expect(moving).toBe(0);
  });
});
