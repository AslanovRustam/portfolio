'use client';

import { Component, type ReactNode } from 'react';

/**
 * Catches anything the 3D layer throws (a texture, HDRI or font that fails to load, a renderer that
 * cannot start) and shows the fallback instead, so the title block and the rest of the page live on.
 */
export default class SceneBoundary extends Component<
  { fallback: ReactNode; onError?: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('3D scene failed, showing the fallback:', error);
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
