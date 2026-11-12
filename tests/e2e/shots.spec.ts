// Review shots for the M1 gate: every key moment of the scroll, on a laptop and on a phone.
// Run: npm run shots → test-results/shots/{desktop|mobile}-{p}.png
import { devices, test } from '@playwright/test';
import { gotoScene, scrollTo, waitReady } from './helpers';

const POINTS = [0, 0.05, 0.1, 0.15, 0.26, 0.48, 0.695, 0.9, 1];
// a describe block may not switch the browser type, so drop it from the device preset
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { defaultBrowserType, ...pixel } = devices['Pixel 7'];

for (const device of ['desktop', 'mobile'] as const) {
  test.describe(device, () => {
    if (device === 'mobile') test.use(pixel);

    test(`${device} shots`, async ({ page }) => {
      test.setTimeout(180_000);
      await gotoScene(page);
      await waitReady(page);
      for (const p of POINTS) {
        await scrollTo(page, p);
        await page.waitForTimeout(2500);
        await page.screenshot({ path: `test-results/shots/${device}-${p}.png` });
      }
    });
  });
}
