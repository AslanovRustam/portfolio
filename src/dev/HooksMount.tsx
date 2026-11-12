'use client';

import { useEffect } from 'react';
import { installTestHooks } from './testHooks';

export default function HooksMount() {
  useEffect(installTestHooks, []);
  return null;
}
