import { expect, test } from '@playwright/test';

// the RA monogram: the browser tab and a phone's home screen
test('the tab and a phone’s home screen show the RA monogram', async ({ page, request }) => {
  await page.goto('/en');
  const links = await page
    .locator('head link[rel="icon"], head link[rel="apple-touch-icon"]')
    .evaluateAll((ls) => ls.map((l) => ({ rel: l.getAttribute('rel'), href: l.getAttribute('href')!, sizes: l.getAttribute('sizes') })));
  expect(links.some((l) => l.rel === 'icon' && l.href.startsWith('/favicon.ico'))).toBe(true);
  expect(links.some((l) => l.rel === 'icon' && l.href.startsWith('/icon') && l.sizes === '192x192')).toBe(true);
  expect(links.some((l) => l.rel === 'apple-touch-icon' && l.sizes === '180x180')).toBe(true);
  for (const l of links) {
    const res = await request.get(l.href);
    expect(res.ok(), l.href).toBe(true);
    expect(res.headers()['content-type'], l.href).toMatch(/^image\//);
  }
  // the ico carries a 16 px picture too, for the tab itself
  const ico = await (await request.get('/favicon.ico')).body();
  const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico[6 + i * 16] || 256);
  expect(sizes).toEqual(expect.arrayContaining([16, 32, 48]));
});
