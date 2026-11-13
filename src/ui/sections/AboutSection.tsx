import { useTranslations } from 'next-intl';
import { PanelTitle } from './SectionPanel';

const PATH = ['sales', 'goit', 'clickable', 'mentor', 'lead', 'gipper'] as const;

/** The About panel: from 14 years in sales to code, as a short story and the dated path. */
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
      <div>
        <h3 className="text-xs text-[#7fe3ff]">{t('timelineTitle')}</h3>
        <ol className="mt-2 divide-y divide-[#7fe3ff]/15 border-y border-[#7fe3ff]/15 text-sm">
          {PATH.map((k) => (
            <li key={k} className="grid grid-cols-[6.5rem_1fr] gap-3 py-1">
              <span className="text-[#7fe3ff]">{t(`timeline.${k}.years`)}</span>
              <span className="text-[#e8f7ff]/90">{t(`timeline.${k}.what`)}</span>
            </li>
          ))}
        </ol>
      </div>
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
