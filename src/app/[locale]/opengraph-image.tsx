import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ImageResponse } from 'next/og';
import en from '../../../messages/en.json';
import { routing } from '@/i18n/routing';

/** One alt for every language: the file convention takes a single static string. */
export const alt = en.meta.title;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const asset = (path: string) => readFile(join(process.cwd(), 'brand', path));

/** Where the billboard's screen is in brand/og-street.jpg (px): the name goes up on it. */
const SCREEN = { left: 132, top: 210, width: 728, height: 310 };

/**
 * The link preview (M6): the street's last frame, the billboard under its LET'S GO, with the name and the
 * role on its screen in the language of the link, in the site's plate face (Oswald, with Cyrillic).
 */
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : 'en', namespace: 'meta' });
  const [frame, latin, cyrillic] = await Promise.all([
    asset('og-street.jpg'),
    asset('fonts/oswald-latin-700-normal.woff'),
    asset('fonts/oswald-cyrillic-700-normal.woff'),
  ]);
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background: '#05060a' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain img only */}
        <img src={`data:image/jpeg;base64,${frame.toString('base64')}`} width={1200} height={630} alt="" />
        <div
          style={{
            position: 'absolute',
            ...SCREEN,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Oswald, OswaldCyrillic',
            color: '#ffffff',
          }}
        >
          <div style={{ fontSize: 96, lineHeight: 1, letterSpacing: 1, textShadow: '0 0 6px #ff45b5, 0 0 24px #ff45b5' }}>
            {t('name')}
          </div>
          <div style={{ marginTop: 22, fontSize: 46, lineHeight: 1, color: '#ffd3ee', letterSpacing: 1 }}>{t('role')}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Oswald', data: latin, weight: 700, style: 'normal' },
        { name: 'OswaldCyrillic', data: cyrillic, weight: 700, style: 'normal' },
      ],
    },
  );
}
