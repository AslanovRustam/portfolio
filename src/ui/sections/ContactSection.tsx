'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { CONTACTS } from '@/content/contacts';
import { plateStyle } from '../plates';
import ContactForm from './ContactForm';
import { PanelTitle } from './SectionPanel';

const link = 'plate plate-sm plate-sign';

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
    <div className="space-y-5">
      <PanelTitle id="contact-title">{t('title')}</PanelTitle>
      <p className="max-w-[60ch] text-sm text-[#e8f7ff]/80">{t('lead')}</p>
      <ContactForm />
      <div className="space-y-3 border-t border-[#f4f4f4]/20 pt-4 text-sm">
        <ul className="flex flex-wrap gap-2">
          {(['telegram', 'linkedin', 'github'] as const).map((k) => (
            <li key={k}>
              <a href={CONTACTS[k]} target="_blank" rel="noopener" className={link}>
                {t(k)}
              </a>
            </li>
          ))}
          <li>
            <a href={CONTACTS.cv} download className="plate plate-sm plate-on" style={plateStyle('cv')}>
              {t('cv')}
            </a>
          </li>
        </ul>
        <p className="flex flex-wrap items-center gap-3">
          <a href={`mailto:${CONTACTS.email}`} className="underline underline-offset-2">
            {CONTACTS.email}
          </a>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(CONTACTS.email).then(() => setCopied(true), () => {})}
            className={link}
          >
            {t('copyEmail')}
          </button>
          <span role="status" className="text-xs text-[#1fd16a]">
            {copied ? t('copied') : ''}
          </span>
        </p>
      </div>
    </div>
  );
}
