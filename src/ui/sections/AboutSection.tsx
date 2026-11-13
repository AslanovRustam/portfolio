import { useTranslations } from 'next-intl';
import { PanelTitle } from './SectionPanel';

/** Rustam's order (gate round 1): Clickable Agency, GoIT mentoring, then sales. */
const PATH = ['lead', 'clickable', 'mentor', 'sales'] as const;
const EDUCATION = ['goit', 'onat'] as const;

/** A dated list: the years on the left, what happened on the right. */
function Dated({ title, items, kind }: { title: string; items: readonly { years: string; what: string }[]; kind: 'path' | 'education' }) {
  return (
    <div>
      <h3 className="text-xs text-[#7fe3ff]">{title}</h3>
      <ol
        data-path={kind === 'path' ? '' : undefined}
        data-education={kind === 'education' ? '' : undefined}
        className="mt-2 divide-y divide-[#7fe3ff]/15 border-y border-[#7fe3ff]/15 text-sm"
      >
        {items.map((i) => (
          <li key={i.years + i.what} className="grid grid-cols-[6.5rem_1fr] gap-3 py-1">
            <span className="text-[#7fe3ff]">{i.years}</span>
            <span className="text-[#e8f7ff]/90">{i.what}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The About panel: from 14 years in sales to code, as a short story, the dated path and the education. */
export default function AboutSection() {
  const t = useTranslations('about');
  return (
    <div className="space-y-4">
      <PanelTitle id="about-title">{t('title')}</PanelTitle>
      <p className="text-base leading-snug sm:text-lg">{t('lead')}</p>
      <div className="flex gap-4">
        {/* the poster photo arrives with the assets (plan 3); until then, an empty drawing frame */}
        <div
          data-portrait
          aria-hidden="true"
          className="hidden aspect-[4/5] w-20 shrink-0 self-start border border-dashed border-[#7fe3ff]/50 bg-[#0b1f38]/60 [background-image:linear-gradient(#7fe3ff1a_1px,transparent_1px),linear-gradient(90deg,#7fe3ff1a_1px,transparent_1px)] [background-size:12px_12px] sm:block"
        />
        <p className="max-w-[62ch] text-sm leading-normal text-[#e8f7ff]/85">{t('story')}</p>
      </div>
      <Dated
        kind="path"
        title={t('timelineTitle')}
        items={PATH.map((k) => ({ years: t(`timeline.${k}.years`), what: t(`timeline.${k}.what`) }))}
      />
      <Dated
        kind="education"
        title={t('educationTitle')}
        items={EDUCATION.map((k) => ({ years: t(`education.${k}.years`), what: t(`education.${k}.what`) }))}
      />
      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <h3 className="text-xs text-[#7fe3ff]">{t('langsTitle')}</h3>
          <p className="mt-1 text-[#e8f7ff]/85">{t('langs')}</p>
        </div>
        <p className="text-[#e8f7ff]/85 sm:pt-5">{t('how')}</p>
      </div>
    </div>
  );
}
