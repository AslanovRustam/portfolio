import { z } from 'zod';

/** The contact form's fields, trimmed; shared by the browser (instant errors) and the server action. */
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().max(120).pipe(z.email()),
  message: z.string().trim().min(10).max(4000),
});

export type ContactData = z.infer<typeof contactSchema>;
export type ContactField = keyof ContactData;
export type ContactStatus = 'idle' | 'sent' | 'invalid' | 'rate' | 'config' | 'error';
export interface ContactResult {
  status: ContactStatus;
  fields?: Partial<Record<ContactField, true>>;
}

/** Which fields fail the schema, or null when the input is valid. */
export function invalidFields(input: unknown): Partial<Record<ContactField, true>> | null {
  const parsed = contactSchema.safeParse(input);
  if (parsed.success) return null;
  const fields: Partial<Record<ContactField, true>> = {};
  for (const issue of parsed.error.issues) fields[issue.path[0] as ContactField] = true;
  return fields;
}

/** A human needs at least this long to fill the form in. */
const MIN_FILL_MS = 3000;

/**
 * Sorts a submission: a filled honeypot is a bot; then invalid fields are named (so an impatient
 * person who sends an empty form sees what to fix); then a form sent faster than a human could fill
 * it is a bot too.
 */
export function screenSubmission(
  raw: { name: string; email: string; message: string; company: string; startedAt: string },
  now: number,
):
  | { verdict: 'ok'; data: ContactData }
  | { verdict: 'spam' }
  | { verdict: 'invalid'; fields: Partial<Record<ContactField, true>> } {
  if (raw.company.trim() !== '') return { verdict: 'spam' };
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { verdict: 'invalid', fields: invalidFields(raw)! };
  const started = Number(raw.startedAt);
  if (!Number.isFinite(started) || now - started < MIN_FILL_MS) return { verdict: 'spam' };
  return { verdict: 'ok', data: parsed.data };
}

/**
 * A sliding-window limiter: at most `limit` calls per key within `windowMs`. It lives in one server
 * instance's memory, so on serverless hosting it is best-effort, which is enough for a portfolio form.
 */
export function createRateLimiter(limit: number, windowMs: number): (key: string, now: number) => boolean {
  const hits = new Map<string, number[]>();
  return (key, now) => {
    const recent = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) for (const [k, ts] of hits) if (ts.every((t) => t <= now - windowMs)) hits.delete(k);
    return true;
  };
}
