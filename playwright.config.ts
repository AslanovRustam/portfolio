import { defineConfig, devices } from '@playwright/test';

// Full Chromium on the real GPU: the default headless shell falls back to SwiftShader,
// which renders the WebGL scene far slower than any visitor would see it.
const gpuArgs = ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'];

const desktop = {
  ...devices['Desktop Chrome'],
  viewport: { width: 1440, height: 800 },
  channel: 'chromium',
  launchOptions: { args: gpuArgs },
};

// The production server only starts for the prod project (an env-var prefix in an npm script
// does not work in Windows cmd, so the run is recognised from its arguments).
const prodRun = process.argv.some((a) => a.includes('prod'));

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  // Every worker renders the full WebGL scene on the same GPU; more than two starve each other.
  workers: 2,
  use: {
    baseURL: 'http://localhost:3200',
    viewport: { width: 1440, height: 800 },
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: [/(^|[\/])(perf|mobile|shots|prod)\.spec\.ts$/, /_scratch/],
      use: desktop,
    },
    {
      // a phone: touch, a 412 px screen, the low tier, on the real GPU like the desktop runs
      name: 'mobile',
      testMatch: /(^|[\/])mobile\.spec\.ts$/,
      use: { ...devices['Pixel 7'], channel: 'chromium', launchOptions: { args: gpuArgs } },
    },
    {
      // frame-rate probe on the integrated GPU, the spec's reference "mid laptop"
      name: 'perf',
      testMatch: /(^|[\/])perf\.spec\.ts$/,
      use: { ...desktop, launchOptions: { args: [...gpuArgs, '--force_low_power_gpu'] } },
    },
    {
      name: 'shots',
      testMatch: /(^|[\/])shots\.spec\.ts$/,
      use: desktop,
    },
    {
      // local look-dev captures (tests/e2e/_scratch, git-ignored)
      name: 'scratch',
      testMatch: /_scratch[\/].*\.spec\.ts$/,
      use: desktop,
    },
    {
      // the production build on its own server (test hooks off): run with `npm run prod`
      name: 'prod',
      testMatch: /(^|[\/])prod\.spec\.ts$/,
      use: { ...desktop, baseURL: 'http://localhost:3300' },
    },
  ],
  webServer: prodRun
    ? { command: 'npx next start -p 3300', port: 3300, reuseExistingServer: false, timeout: 120_000 }
    : {
        command: 'npm run dev -- -p 3200',
        port: 3200,
        reuseExistingServer: true,
        timeout: 120_000,
        env: { NEXT_PUBLIC_TEST_HOOKS: '1', MAIL_TRANSPORT: 'json', CONTACT_RATE_LIMIT: '1000' },
      },
});
