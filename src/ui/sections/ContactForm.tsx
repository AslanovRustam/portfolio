'use client';

import { useTranslations } from 'next-intl';
import { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import { submitContact } from '@/app/[locale]/(site)/actions';
import { CONTACTS } from '@/content/contacts';
import { experienceStore } from '@/experience/store';
import { scrollToProgress } from '@/scroll/SmoothScroll';
import { invalidFields, type ContactField, type ContactResult } from '@/server/contact';
import { flicker, neonStyle } from '../neon';

const FIELDS: readonly { name: ContactField; type: string; autoComplete: string }[] = [
  { name: 'name', type: 'text', autoComplete: 'name' },
  { name: 'email', type: 'email', autoComplete: 'email' },
  { name: 'message', type: 'textarea', autoComplete: 'off' },
];

const input = 'nfield';

/**
 * What has been typed, kept outside the form: the form moves between the billboard and the page when the
 * window is resized, and a move must not lose the message. A sent message clears it.
 */
const draft: Partial<Record<ContactField, string>> = {};
/**
 * When the form first opened (performance.now()), kept with the draft: the fill time the server screens
 * for bots runs from here, not from the latest move, or a message sent just after a move would be dropped.
 */
let openedAt: number | null = null;

/**
 * Name, email, message. The browser checks the fields first (same zod schema as the server), the
 * server action checks again and mails it. The Send sign stays dark until all three fields would pass,
 * then lights up; a press on the dark sign still shows what is missing (it is never `disabled`, so a
 * keyboard or a screen reader learns why). A sent message makes the traffic light pulse green.
 */
export default function ContactForm({ compact = false }: { compact?: boolean }) {
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
  const [ready, setReady] = useState(() => invalidFields({ ...draft }) === null);
  // a sent message empties the form, so the sign goes dark again (adjusted while rendering the new answer)
  const [answered, setAnswered] = useState(state);
  if (state !== answered) {
    setAnswered(state);
    if (state.status === 'sent') setReady(false);
  }
  const form = useRef<HTMLFormElement>(null);
  const mounted = useRef(0);

  // the fill time is measured here, as elapsed time since the form first opened, so a skewed device clock
  // cannot matter; a form that moved (billboard ↔ page) takes back what was typed and keeps its start
  useEffect(() => {
    openedAt ??= performance.now();
    mounted.current = openedAt;
    const el = form.current;
    if (!el) return;
    for (const f of FIELDS) {
      const field = el.elements.namedItem(f.name) as HTMLInputElement | HTMLTextAreaElement | null;
      if (field && draft[f.name]) field.value = draft[f.name]!;
    }
  }, []);

  useEffect(() => {
    if (state.status !== 'sent') return;
    form.current?.reset(); // only a sent message clears the form; any other answer keeps the text
    for (const f of FIELDS) delete draft[f.name];
    // the next message is a new fill
    openedAt = performance.now();
    mounted.current = openedAt;
    experienceStore.getState().setCelebrate(true);
    // a sent message goes up the pole to the green light, as the contact links do
    scrollToProgress(1, experienceStore.getState().reducedMotion);
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
      onInput={(e) => {
        const data = new FormData(e.currentTarget);
        for (const f of FIELDS) draft[f.name] = String(data.get(f.name) ?? '');
        setReady(invalidFields(Object.fromEntries(data)) === null);
      }}
      className={compact ? 'grid grid-cols-2 content-start gap-x-4 gap-y-3' : 'space-y-4'}
      style={neonStyle('contact')}
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
          <div key={f.name} className={compact && f.type === 'textarea' ? 'col-span-2' : undefined}>
            <label htmlFor={id} className="nfield-label">
              {t(f.name)}
            </label>
            {f.type === 'textarea' ? (
              <textarea {...common} rows={4} className={`${input} resize-none`} />
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
      <div className={`flex flex-wrap items-center gap-4 ${compact ? 'col-span-2' : ''}`}>
        <button
          type="submit"
          disabled={pending}
          data-ready={ready}
          className={`nsend ${ready ? 'neon-flicker' : ''}`}
          style={flicker(5)}
        >
          {pending ? t('sending') : t('send')}
        </button>
        <p role="status" className="text-sm">
          {state.status === 'sent' && <span className="text-[#1fd16a]">{t('sent')}</span>}
          {state.status === 'invalid' && <span className="text-[#ff7a1a]">{t('invalid')}</span>}
          {state.status === 'rate' && <span className="text-[#ff7a1a]">{t('rate')}</span>}
        </p>
        <p aria-live="polite" className="w-full text-xs text-[#ffb3e1]/75 empty:hidden">
          {!ready && !pending && state.status !== 'sent' ? t('sendHint') : ''}
        </p>
      </div>
      {(state.status === 'config' || state.status === 'error') && (
        <p role="alert" className={`flex flex-wrap gap-x-3 gap-y-1 text-sm text-[#e8f7ff]/85 ${compact ? 'col-span-2' : ''}`}>
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
