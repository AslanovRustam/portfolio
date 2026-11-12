import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // the dev badge would sit on top of the 3D scene in every look-dev screenshot
  devIndicators: false,
  // dev only: let a phone on the same Wi-Fi load the dev chunks (`DEV_LAN_HOST=192.168.x.y npm run dev -- -H 0.0.0.0`);
  // Next 16 blocks cross-origin dev resources by default and the scene would never load
  allowedDevOrigins: process.env.DEV_LAN_HOST ? [process.env.DEV_LAN_HOST] : [],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
