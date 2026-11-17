import { expect, it } from 'vitest';
import { firstStepWith, STEPS, stepError } from '@/ui/sections/formSteps';

it('a phone fills the form in three steps: the name, the email, the message', () => {
  expect(STEPS).toEqual(['name', 'email', 'message']);
});

it('a step holds the visitor back while its field would fail the server’s check, the other fields aside', () => {
  expect(stepError('name', '')).toBe(true);
  expect(stepError('name', 'A')).toBe(true);
  expect(stepError('name', '  Ann  ')).toBe(false);
  expect(stepError('email', 'ann@')).toBe(true);
  expect(stepError('email', 'ann@example.com')).toBe(false);
  expect(stepError('message', 'short')).toBe(true);
  expect(stepError('message', 'Hello, I have a front-end role for you.')).toBe(false);
});

it('a server answer naming fields takes the form to the first of them', () => {
  expect(firstStepWith({ message: true, email: true })).toBe(1);
  expect(firstStepWith({ message: true })).toBe(2);
  expect(firstStepWith({ name: true, message: true })).toBe(0);
  expect(firstStepWith({})).toBeNull();
});
