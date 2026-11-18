'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { CONTACTS } from '@/content/contacts';
import { experienceStore } from '@/experience/store';
import { scrollToProgress } from '@/scroll/SmoothScroll';
import { getIcon } from '@/scene/stickers/icons';
import { neonStyle } from '../neon';
import ContactForm from './ContactForm';
import NeonBox from '../flow/NeonBox';
import { useContactMode } from './useContactMode';

const tube = 'neon text-[15px] sm:text-base';

/** Whoever reaches out goes to the end of the road: the billboard, the green light. */
export const toGreenLight = () => scrollToProgress(1, experienceStore.getState().reducedMotion);

/** A contact's logo from simple-icons, glowing in the tube's colour. */
function Logo({ slug }: { slug: string }) {
  const icon = getIcon(slug);
  if (!icon) return null;
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="neon-logo">
      <path d={icon.path} />
    </svg>
  );
}

/** Telegram, LinkedIn, GitHub and the CV as neon tubes; the email to write to or copy. */
function Links() {
  const t = useTranslations('contact');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const off = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(off);
  }, [copied]);

  return (
    <div className="space-y-3 text-sm">
      <ul className="-mx-1 flex flex-wrap items-center">
        {(['telegram', 'linkedin', 'github'] as const).map((k) => (
          <li key={k}>
            <a href={CONTACTS[k]} target="_blank" rel="noopener" onClick={toGreenLight} className={tube} style={neonStyle('contact')}>
              <Logo slug={k} />
              {t(k)}
            </a>
          </li>
        ))}
        <li>
          <a href={CONTACTS.cv} download onClick={toGreenLight} className={tube} style={neonStyle('cv')}>
            {t('cv')}
          </a>
        </li>
      </ul>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <a href={`mailto:${CONTACTS.email}`} onClick={toGreenLight} className="underline underline-offset-2">
          {CONTACTS.email}
        </a>
        <button
          type="button"
          onClick={() => {
            toGreenLight();
            navigator.clipboard?.writeText(CONTACTS.email).then(() => setCopied(true), () => {});
          }}
          className={tube}
          style={neonStyle('contact')}
        >
          <Logo slug="gmail" />
          {t('copyEmail')}
        </button>
        <span role="status" className="text-xs text-[#3dff8f]">
          {copied ? t('copied') : ''}
        </span>
      </p>
    </div>
  );
}

/**
 * The last stop: the form, direct links, the email to copy and the CV. In the page's flow it is three neon
 * boxes riding up under the billboard (a phone, no WebGL); `fitted`, it is laid out for the billboard's
 * panel on a laptop (ContactBillboard): the lead and the links on the left, the form on the right, the
 * title in neon on the billboard itself (kept here for screen readers). Where the camera dives into the
 * billboard's screen (M4 round 1), it is the screen's content: the lead, the form and the links one under
 * another inside the screen's neon frame, no boxes of their own (ContactScreen draws the frame).
 */
export default function ContactSection({ fitted = false }: { fitted?: boolean }) {
  const t = useTranslations('contact');
  const mode = useContactMode();

  if (!fitted && mode === 'dive')
    return (
      <div data-ui className="pointer-events-auto space-y-7" style={neonStyle('contact')}>
        <h2 id="contact-title" className="sr-only">
          {t('title')}
        </h2>
        <p className="text-sm leading-relaxed text-[#e8f7ff]/85">{t('lead')}</p>
        <ContactForm />
        <Links />
      </div>
    );

  // in the page's order (the lead, the form, the links), placed as two columns
  if (fitted)
    return (
      <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)] grid-rows-[auto_1fr] gap-x-8 gap-y-5 [grid-template-areas:'lead_form''links_form']">
        <h2 id="contact-title" className="sr-only">
          {t('title')}
        </h2>
        <p className="text-[15px] leading-relaxed text-[#e8f7ff]/85 [grid-area:lead]">{t('lead')}</p>
        <div className="min-w-0 [grid-area:form]">
          <ContactForm compact />
        </div>
        <div className="min-w-0 [grid-area:links]">
          <Links />
        </div>
      </div>
    );

  return (
    <>
      <NeonBox id="contact">
        <h2 id="contact-title" className="flow-title">
          {t('title')}
        </h2>
        <p className="mt-4 max-w-[60ch] text-sm text-[#e8f7ff]/80">{t('lead')}</p>
      </NeonBox>
      <NeonBox id="contact">
        <ContactForm />
      </NeonBox>
      <NeonBox id="contact">
        <Links />
      </NeonBox>
    </>
  );
}
