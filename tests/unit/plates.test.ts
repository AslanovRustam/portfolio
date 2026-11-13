import { expect, it } from 'vitest';
import { plateVars } from '@/ui/plates';

it('a plate takes its sign colours', () => {
  expect(plateVars('work')).toEqual({ '--sign-bg': '#ff7a1a', '--sign-fg': '#111111' });
  expect(plateVars('cv')).toEqual({ '--sign-bg': '#1c7a3c', '--sign-fg': '#ffffff' });
});
