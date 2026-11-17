// Frame-rate probe: a full scroll through the journey on the integrated GPU, at the tier the device picks.
// Run: npm run perf → test-results/perf.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoScene, scrollTo, stackStop, stop, waitReady } from './helpers';

/** PERF_BLUR=1 measures the boxes with their glass blurred (the blur decision in Plan 2c, Task 10). */
async function maybeBlur(page: Page) {
  if (process.env.PERF_BLUR) await page.addStyleTag({ content: '.nbox { backdrop-filter: blur(5px); }' });
}

test('scrolling the whole journey keeps at least 30 fps', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoScene(page);
  await maybeBlur(page);
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

/** Median and 95th-percentile frame time at a Work stop, after the camera and the loop have settled. */
async function workStop(page: Page, path: string) {
  await gotoScene(page, path);
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
  return {
    tier: await page.evaluate(() => window.__portfolio.state().tier),
    loop: await page.evaluate(() => (window.__portfolio.probe('wall') as { loop: { stop: number } | null }).loop?.stop ?? null),
    medianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(2),
    p95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
    frames: frames.length,
  };
}

// Moto's stop (3): measured with its live loop and, as the baseline, with loops off (?loops=0)
test('standing at a Work stop keeps at least 30 fps, and its live loop costs at most 3 ms', async ({ page }) => {
  test.setTimeout(180_000);
  const noLoop = await workStop(page, '/en?loops=0');
  const withLoop = await workStop(page, '/en');
  const report = { noLoop, withLoop };
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/perf-work.json', JSON.stringify(report, null, 2));
  console.log('perf-work', JSON.stringify(report));
  expect(noLoop.loop).toBeNull();
  expect(withLoop.loop).toBe(3);
  expect(withLoop.medianMs).toBeLessThanOrEqual(33.4);
  expect(withLoop.medianMs).toBeLessThanOrEqual(noLoop.medianMs + 3);
});

// About close to the pole (M4 round 1): the pole's face fills the middle, the street beside it blurred
test('reading About close to the pole, its bills riding up and down, keeps at least 30 fps', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoScene(page);
  await maybeBlur(page);
  await waitReady(page);
  await scrollTo(page, 0.44);
  await page.waitForTimeout(3000);
  await page.mouse.move(300, 400);
  const recording = page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const out: number[] = [];
        let last = performance.now();
        const end = last + 4000;
        const tick = (t: number) => {
          out.push(t - last);
          last = t;
          if (t < end) requestAnimationFrame(tick);
          else resolve(out.slice(3));
        };
        requestAnimationFrame(tick);
      }),
  );
  // the text rides up and down past the sign
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, i % 10 < 5 ? 60 : -60);
    await page.waitForTimeout(120);
  }
  const frames = await recording;
  const sorted = [...frames].sort((a, b) => a - b);
  const medianMs = sorted[Math.floor(sorted.length / 2)];
  const report = {
    tier: await page.evaluate(() => window.__portfolio.state().tier),
    blur: !!process.env.PERF_BLUR,
    medianMs: +medianMs.toFixed(2),
    p95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
    frames: frames.length,
  };
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/perf-about.json', JSON.stringify(report, null, 2));
  console.log('perf-about', JSON.stringify(report));
  expect(medianMs).toBeLessThanOrEqual(33.4);
});

/** Median and 95th-percentile frame time standing at story progress p, once the camera has come to rest. */
async function standing(page: Page, p: number, name: string) {
  await gotoScene(page);
  await waitReady(page);
  await scrollTo(page, p);
  await page.waitForTimeout(6000);
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
  const report = {
    tier: await page.evaluate(() => window.__portfolio.state().tier),
    medianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(2),
    p95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
    frames: frames.length,
  };
  mkdirSync('test-results', { recursive: true });
  writeFileSync(`test-results/perf-${name}.json`, JSON.stringify(report, null, 2));
  console.log(`perf-${name}`, JSON.stringify(report));
  return report;
}

// The end of the intro (the pole close up, the whole street behind it) is measured, not gated: it runs at
// 35–41 ms on medium on this machine on main (before the ride) as here, with or without the shop, the
// gantry and the billboard — a Plan 5 item.
test('the end of the intro, measured', async ({ page }) => {
  test.setTimeout(120_000);
  const r = await standing(page, 0.12, 'intro');
  test.info().annotations.push({ type: 'perf', description: `intro end median ${r.medianMs} ms (not gated, Plan 5)` });
});

// the phone's dive (M4 round 1): inside the billboard's screen, the form in its frame
test('standing inside the billboard’s screen on a phone-sized window keeps at least 30 fps', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 412, height: 839 });
  const r = await standing(page, 1, 'dive');
  expect(r.medianMs).toBeLessThanOrEqual(33.4);
});

for (const [name, p, where] of [
  ['stack', stackStop(0), 'under a Stack sign'],
  ['contact', 1, 'at the billboard'],
] as const) {
  test(`standing ${where} keeps at least 30 fps`, async ({ page }) => {
    test.setTimeout(120_000);
    expect((await standing(page, p, name)).medianMs).toBeLessThanOrEqual(33.4);
  });
}
