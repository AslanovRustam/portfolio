import { useTranslations } from 'next-intl';
import NeonBox from '../flow/NeonBox';
import PaperPoster from '../flow/PaperPoster';

/** Rustam's order (gate round 1): Clickable Agency, GoIT mentoring, then sales. */
const PATH = ['lead', 'clickable', 'mentor', 'sales'] as const;
const EDUCATION = ['goit', 'onat'] as const;

/** A dated list: the years on the left, what happened on the right. */
function Dated({ title, items, kind }: { title: string; items: readonly { years: string; what: string }[]; kind: 'path' | 'education' }) {
  return (
    <>
      <h3 className="flow-label">{title}</h3>
      <ol
        data-path={kind === 'path' ? '' : undefined}
        data-education={kind === 'education' ? '' : undefined}
        className="mt-3 divide-y text-sm"
      >
        {items.map((i) => (
          <li key={i.years + i.what} className="flow-rule grid grid-cols-[6.5rem_1fr] gap-3 py-2">
            <span className="flow-accent">{i.years}</span>
            <span className="text-[#e8f7ff]/90">{i.what}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

/**
 * About, as neon boxes that ride the page scroll: who he is in a line, the story from 14 years in sales to
 * code, the dated path, the education, and the languages; it opens with his portrait as a street poster.
 */
export default function AboutSection() {
  const t = useTranslations('about');
  return (
    <>
      <PaperPoster src="/about/poster.webp" alt={t('posterAlt')} />
      <NeonBox id="about">
        <h2 id="about-title" className="flow-title">
          {t('title')}
        </h2>
        <p className="mt-4 text-base leading-snug sm:text-lg">{t('lead')}</p>
      </NeonBox>
      <NeonBox id="about">
        <p className="text-sm leading-relaxed text-[#e8f7ff]/85">{t('story')}</p>
      </NeonBox>
      <NeonBox id="about">
        <Dated
          kind="path"
          title={t('timelineTitle')}
          items={PATH.map((k) => ({ years: t(`timeline.${k}.years`), what: t(`timeline.${k}.what`) }))}
        />
      </NeonBox>
      <NeonBox id="about">
        <Dated
          kind="education"
          title={t('educationTitle')}
          items={EDUCATION.map((k) => ({ years: t(`education.${k}.years`), what: t(`education.${k}.what`) }))}
        />
      </NeonBox>
      <NeonBox id="about">
        <h3 className="flow-label">{t('langsTitle')}</h3>
        <p className="mt-2 text-sm text-[#e8f7ff]/85">{t('langs')}</p>
        <p className="mt-3 text-sm text-[#e8f7ff]/85">{t('how')}</p>
      </NeonBox>
    </>
  );
}
