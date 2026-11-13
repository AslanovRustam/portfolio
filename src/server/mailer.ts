import nodemailer from 'nodemailer';
import type { ContactData } from './contact';

/** Header values must stay on one line, whatever was typed into the form. */
const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, ' ').trim();

/**
 * Sends a contact message to Rustam's Gmail through SMTP with an app password (GMAIL_USER,
 * GMAIL_APP_PASSWORD, optional CONTACT_TO). MAIL_TRANSPORT=json renders the mail without sending it,
 * for tests. Never throws: a missing setup is 'config', a failed send is 'error'.
 */
export async function sendContactMail(data: ContactData): Promise<'sent' | 'config' | 'error'> {
  const json = process.env.MAIL_TRANSPORT === 'json';
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!json && (!user || !pass)) return 'config';

  const transport = json
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        // fail in seconds, not minutes, so the form can offer email and Telegram instead
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      });
  const inbox = json ? 'portfolio@example.invalid' : (process.env.CONTACT_TO || user!);
  const name = oneLine(data.name);

  try {
    await transport.sendMail({
      from: { name: 'Portfolio', address: json ? inbox : user! },
      to: inbox,
      replyTo: { name, address: data.email },
      subject: `Portfolio — ${name}`,
      text: `${data.message}\n\n— ${name} <${data.email}>`,
    });
    return 'sent';
  } catch (e) {
    console.error('[contact] send failed:', e instanceof Error ? e.message : e);
    return 'error';
  }
}
