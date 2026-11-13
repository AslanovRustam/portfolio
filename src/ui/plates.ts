import type { CSSProperties } from 'react';
import { signById, type SignId } from '@/experience/signs';

/** The colours of a sign on the pole, as the CSS variables a plate or a board head reads. */
export function plateVars(id: SignId): Record<'--sign-bg' | '--sign-fg', string> {
  const sign = signById(id);
  return { '--sign-bg': sign.color, '--sign-fg': sign.textColor };
}

/** plateVars for a `style` prop. */
export function plateStyle(id: SignId): CSSProperties {
  return plateVars(id) as CSSProperties;
}
