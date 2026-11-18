/**
 * The site's plate face (Oswald, with Cyrillic, loaded by next/font) in the weight a canvas painter uses,
 * for the letters it paints. A canvas does not wait for a web font: painting before it is in draws the
 * fallback for good. A face that fails to load resolves too, and the painter goes on with the fallback.
 */
export function plateFontReady(weight: number, sample: string): Promise<unknown> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
  return document.fonts.load(`${weight} 40px Oswald`, sample).catch(() => undefined);
}
