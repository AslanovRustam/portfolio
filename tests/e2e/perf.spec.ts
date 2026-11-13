// Frame-rate probe: a full scroll through the journey on the integrated GPU, at the tier the device picks.
// Run: npm run perf → test-results/perf.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { gotoScene, scrollTo, stop, waitReady } from './helpers';

test('scrolling the whole journey keeps at least 30 fps', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoScene(page);
  await waitReady(page);
  await page.waitForTimeout(5000);

  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __rec: boolean };
    w.__frames = [];
    w.__rec = true;
    let last = performance.now();
    const tick = (t: number) => {
      w.__frames.push(t - last);
      last = t;
      if (w.__rec) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.mouse.move(720, 400);
  for (let i = 0; i < 120; i++) {
    await page.mouse.wheel(0, 60);
    await page.waitForTimeout(100);
  }
  const frames = await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __rec: boolean };
    w.__rec = false;
    return w.__frames.slice(5);
  });

  const sorted = [...frames].sort((a, b) => a - b);
  const medianMs = sorted[Math.floor(sorted.length / 2)];
  const p95Ms = sorted[Math.floor(sorted.length * 0.95)];
  const report = {
    tier: await page.evaluate(() => window.__portfolio.state().tier),
    progress: await page.evaluate(() => window.__portfolio.state().progress),
    medianMs: +medianMs.toFixed(2),
    p95Ms: +p95Ms.toFixed(2),
    fps: +(1000 / medianMs).toFixed(1),
    frames: frames.length,
  };
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/perf.json', JSON.stringify(report, null, 2));
  console.log('perf', JSON.stringify(report));
  expect(medianMs).toBeLessThanOrEqual(33.4);
});

test('standing at a Work stop keeps at least 30 fps', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoScene(page);
  await waitReady(page);
  await page.waitForFunction(() => (window.__portfolio.probe('wall') as { loaded?: boolean } | undefined)?.loaded, undefined, {
    timeout: 30_000,
  });
  await scrollTo(page, stop(3));
  await page.waitForTimeout(3000);
  const frames = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const out: number[] = [];
        let last = performance.now();
        const end = last + 3000;
        const tick = (t: number) => {
          out.push(t - last);
          last = t;
          if (t < end) requestAnimationFrame(tick);
          else resolve(out.slice(3));
        };
        requestAnimationFrame(tick);
      }),
  );
  const sorted = [...frames].sort((a, b) => a - b);
  const medianMs = sorted[Math.floor(sorted.length / 2)];
  const report = {
    tier: await page.evaluate(() => window.__portfolio.state().tier),
    medianMs: +medianMs.toFixed(2),
    p95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
    frames: frames.length,
  };
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/perf-work.json', JSON.stringify(report, null, 2));
  console.log('perf-work', JSON.stringify(report));
  expect(medianMs).toBeLessThanOrEqual(33.4);
});
