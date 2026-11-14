'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { CONTACTS } from '@/content/contacts';
import { getIcon } from '@/scene/stickers/icons';
import { neonStyle } from '../neon';
import ContactForm from './ContactForm';
import NeonBox from '../flow/NeonBox';

const tube = 'neon text-[15px] sm:text-base';

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

/** The last stop, under the green light: the form, direct links, the email to copy and the CV. */
export default function ContactSection() {
  const t = useTranslations('contact');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const off = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(off);
  }, [copied]);

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
      <NeonBox id="contact" className="space-y-3 text-sm">
        <ul className="-mx-1 flex flex-wrap items-center">
          {(['telegram', 'linkedin', 'github'] as const).map((k) => (
            <li key={k}>
              <a href={CONTACTS[k]} target="_blank" rel="noopener" className={tube} style={neonStyle('contact')}>
                <Logo slug={k} />
                {t(k)}
              </a>
            </li>
          ))}
          <li>
            <a href={CONTACTS.cv} download className={tube} style={neonStyle('cv')}>
              {t('cv')}
            </a>
          </li>
        </ul>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a href={`mailto:${CONTACTS.email}`} className="underline underline-offset-2">
            {CONTACTS.email}
          </a>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(CONTACTS.email).then(() => setCopied(true), () => {})}
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
      </NeonBox>
    </>
  );
}
