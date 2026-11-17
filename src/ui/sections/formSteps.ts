import { type ContactField, invalidFields } from '@/server/contact';

/**
 * A phone fills the contact form in one field at a time (Plan 4c): the name, the email, the message. Each
 * step holds the visitor back while its field would fail the very check the server runs.
 */
export const STEPS: readonly ContactField[] = ['name', 'email', 'message'];

/** stand-ins that pass, so one field is checked on its own */
const PASSING: Record<ContactField, string> = { name: 'Ann', email: 'ann@example.com', message: 'Long enough to pass.' };

/** Whether this field's value would fail the server's check. */
export function stepError(field: ContactField, value: string): boolean {
  return !!invalidFields({ ...PASSING, [field]: value })?.[field];
}

/** The first step whose field an answer names (a server's `invalid`), or null when it names none. */
export function firstStepWith(fields: Partial<Record<ContactField, true>>): number | null {
  const i = STEPS.findIndex((f) => fields[f]);
  return i < 0 ? null : i;
}
