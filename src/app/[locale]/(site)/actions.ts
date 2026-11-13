'use server';

import { headers } from 'next/headers';
import { createRateLimiter, screenSubmission, type ContactResult } from '@/server/contact';
import { sendContactMail } from '@/server/mailer';

/** per server instance; CONTACT_RATE_LIMIT raises it for the e2e runs */
const allow = createRateLimiter(Number(process.env.CONTACT_RATE_LIMIT ?? 3), 10 * 60_000);

const field = (form: FormData, name: string) => String(form.get(name) ?? '');

/**
 * The contact form's server action: screens the submission, rate-limits by IP and mails it. A bot is
 * told "sent" and nothing goes out, so it learns nothing from the reply.
 */
export async function submitContact(_prev: ContactResult, form: FormData): Promise<ContactResult> {
  const screened = screenSubmission({
    name: field(form, 'name'),
    email: field(form, 'email'),
    message: field(form, 'message'),
    trap: field(form, 'hp_note'),
    elapsed: field(form, 'elapsed'),
  });
  if (screened.verdict === 'spam') {
    // no content logged; enough to notice if real visitors start landing here
    console.warn('[contact] submission screened as spam');
    return { status: 'sent' };
  }
  if (screened.verdict === 'invalid') return { status: 'invalid', fields: screened.fields };

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!allow(ip, Date.now())) return { status: 'rate' };

  return { status: await sendContactMail(screened.data) };
}
