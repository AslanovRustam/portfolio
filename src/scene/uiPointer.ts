/**
 * R3F listens on document.body, so a pointer over HTML that happens to lie on top of the scene (header,
 * panels, overlays, all marked data-ui) still raycasts into it. Those events belong to the HTML.
 */
export function overUi(e: { nativeEvent: Event }): boolean {
  const target = e.nativeEvent.target as Element | null;
  return !!target?.closest?.('[data-ui]');
}
