import { expect, test } from '../fixtures';

test.describe('edge vignette under reduced motion', () => {
  test('the layer never paints and never renders', async ({ app }) => {
    await app.goTo('settings');
    const layer = app.page.locator('[data-screen="settings"] [data-vignette]');
    await expect(layer).toBeHidden();
    await app.fireVignette('hullHit');
    await expect(layer).not.toHaveAttribute('data-vignette-last', 'hullHit');
    expect((await app.vignette()).last).toBe('hullHit');
  });
});
