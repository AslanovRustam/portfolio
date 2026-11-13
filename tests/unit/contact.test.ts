import { afterEach, expect, it, vi } from 'vitest';
import { createRateLimiter, screenSubmission } from '@/server/contact';
import { sendContactMail } from '@/server/mailer';

const now = 1_000_000;
const ok = {
  name: 'Ann',
  email: 'ann@example.com',
  message: 'Hello, I have a role for you.',
  trap: '',
  elapsed: '10000',
};

afterEach(() => vi.unstubAllEnvs());

it('accepts a real message, trimmed', () => {
  expect(screenSubmission({ ...ok, name: '  Ann ' })).toEqual({
    verdict: 'ok',
    data: { name: 'Ann', email: 'ann@example.com', message: ok.message },
  });
});

it('flags bots: honeypot or too fast', () => {
  expect(screenSubmission({ ...ok, trap: 'ACME' }).verdict).toBe('spam');
  expect(screenSubmission({ ...ok, elapsed: '1000' }).verdict).toBe('spam');
});

it('a post without a fill time (no JS ran, so the form was never filled by a person) is spam', () => {
  expect(screenSubmission({ ...ok, elapsed: '' }).verdict).toBe('spam');
  expect(screenSubmission({ ...ok, elapsed: 'soon' }).verdict).toBe('spam');
});

it('names the invalid fields', () => {
  expect(screenSubmission({ ...ok, email: 'nope', message: 'hi' })).toEqual({
    verdict: 'invalid',
    fields: { email: true, message: true },
  });
});

it('rate-limits a sender, then lets them back after the window', () => {
  const allow = createRateLimiter(3, 600_000);
  expect([0, 1, 2, 3].map((i) => allow('1.2.3.4', now + i))).toEqual([true, true, true, false]);
  expect(allow('5.6.7.8', now)).toBe(true);
  expect(allow('1.2.3.4', now + 600_001)).toBe(true);
});

const mail = { name: 'Ann', email: 'ann@example.com', message: 'Hello, I have a role for you.' };

// Review Focus 4
it('without Gmail settings the mailer reports config instead of throwing', async () => {
  vi.stubEnv('MAIL_TRANSPORT', '');
  vi.stubEnv('GMAIL_USER', '');
  vi.stubEnv('GMAIL_APP_PASSWORD', '');
  expect(await sendContactMail(mail)).toBe('config');
});

it('the json transport sends without a network', async () => {
  vi.stubEnv('MAIL_TRANSPORT', 'json');
  expect(await sendContactMail(mail)).toBe('sent');
});
