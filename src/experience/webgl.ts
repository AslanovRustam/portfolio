/** `?webgl=0` forces the fallback (tests and manual checks). */
export function forcedNoWebGL(search: string): boolean {
  return new URLSearchParams(search).get('webgl') === '0';
}

/** Browser-only: whether a WebGL2 context can be created. */
export function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}
