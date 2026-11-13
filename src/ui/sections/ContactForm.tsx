'use client';

import { useTranslations } from 'next-intl';
import { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import { submitContact } from '@/app/[locale]/(site)/actions';
import { CONTACTS } from '@/content/contacts';
import { experienceStore } from '@/experience/store';
import { invalidFields, type ContactField, type ContactResult } from '@/server/contact';

const FIELDS: readonly { name: ContactField; type: string; autoComplete: string }[] = [
  { name: 'name', type: 'text', autoComplete: 'name' },
  { name: 'email', type: 'email', autoComplete: 'email' },
  { name: 'message', type: 'textarea', autoComplete: 'off' },
];

const input =
  'mt-1 block w-full border border-[#7fe3ff]/30 bg-[#050507]/60 px-3 py-2 text-sm text-[#e8f7ff] placeholder:text-[#e8f7ff]/30 focus:border-[#7fe3ff] focus:outline-none aria-[invalid=true]:border-[#ff5a1f]';

/**
 * Name, email, message. The browser checks the fields first (same zod schema as the server), the
 * server action checks again and mails it. A sent message makes the traffic light pulse green.
 */
export default function ContactForm() {
  const t = useTranslations('contact');
  // a request that never reaches the action (offline, a redeploy, a timeout) rejects; that must show
  // the email/Telegram fallback, not take the whole page down
  const [state, action, pending] = useActionState<ContactResult, FormData>(async (prev, data) => {
    try {
      return await submitContact(prev, data);
    } catch {
      return { status: 'error' };
    }
  }, { status: 'idle' });
  const [local, setLocal] = useState<Partial<Record<ContactField, true>> | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const mounted = useRef(0);

  // the fill time is measured here, as elapsed time, so a skewed device clock cannot matter
  useEffect(() => {
    mounted.current = performance.now();
  }, []);

  useEffect(() => {
    if (state.status !== 'sent') return;
    form.current?.reset(); // only a sent message clears the form; any other answer keeps the text
    experienceStore.getState().setCelebrate(true);
    const stop = setTimeout(() => experienceStore.getState().setCelebrate(false), 2000);
    return () => clearTimeout(stop);
  }, [state]);

  const errors = local ?? (state.status === 'invalid' ? (state.fields ?? {}) : {});

  return (
    <form
      ref={form}
      noValidate
      onSubmit={(e) => {
        // dispatched by hand: a form action would reset the fields whatever the answer was
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const bad = invalidFields(Object.fromEntries(data));
        setLocal(bad);
        if (bad) return;
        data.set('elapsed', String(Math.round(performance.now() - mounted.current)));
        startTransition(() => action(data));
      }}
      className="space-y-3"
    >
      {FIELDS.map((f) => {
        const id = `contact-${f.name}`;
        const bad = !!errors[f.name];
        const common = {
          id,
          name: f.name,
          autoComplete: f.autoComplete,
          'aria-invalid': bad,
          'aria-describedby': bad ? `${id}-error` : undefined,
          onChange: () => local?.[f.name] && setLocal({ ...local, [f.name]: undefined }),
          className: input,
        };
        return (
          <div key={f.name}>
            <label htmlFor={id} className="text-xs text-[#7fe3ff]">
              {t(f.name)}
            </label>
            {f.type === 'textarea' ? (
              <textarea {...common} rows={4} className={`${input} resize-y`} />
            ) : (
              <input {...common} type={f.type} />
            )}
            {bad && (
              <p id={`${id}-error`} className="mt-1 text-xs text-[#ff7a1a]">
                {t(`errors.${f.name}`)}
              </p>
            )}
          </div>
        );
      })}
      {/* a field people never see and autofill has no profile for; bots fill it in */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label>
          Leave empty
          <input
            name="hp_note"
            tabIndex={-1}
            autoComplete="off"
            data-1p-ignore=""
            data-lpignore="true"
            data-bwignore=""
            data-form-type="other"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="border border-[#1fd16a] bg-[#1fd16a]/10 px-5 py-2 text-sm text-[#1fd16a] transition-colors hover:bg-[#1fd16a]/20 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#1fd16a] disabled:opacity-60"
        >
          {pending ? t('sending') : t('send')}
        </button>
        <p role="status" className="text-sm">
          {state.status === 'sent' && <span className="text-[#1fd16a]">{t('sent')}</span>}
          {state.status === 'invalid' && <span className="text-[#ff7a1a]">{t('invalid')}</span>}
          {state.status === 'rate' && <span className="text-[#ff7a1a]">{t('rate')}</span>}
        </p>
      </div>
      {(state.status === 'config' || state.status === 'error') && (
        <p role="alert" className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-[#e8f7ff]/85">
          <span className="text-[#ff7a1a]">{t(state.status)}</span>
          <span>{t('fallback')}</span>
          <a className="underline underline-offset-2" href={`mailto:${CONTACTS.email}`}>
            {CONTACTS.email}
          </a>
          <a className="underline underline-offset-2" href={CONTACTS.telegram} target="_blank" rel="noopener">
            {t('telegram')}
          </a>
        </p>
      )}
    </form>
  );
}
