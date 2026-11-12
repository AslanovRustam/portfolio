'use client';

import { useEffect } from 'react';
import { installTestHooks } from './testHooks';

export default function TestHooks() {
  useEffect(installTestHooks, []);
  return null;
}
