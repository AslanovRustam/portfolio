/**
 * The loader's log (M4 round 1, spec §7): what the scene has loaded, line by line, in the corner of the
 * neon sign — the files by their folder and name as three's loading manager reports them done. In English
 * whatever the page's language: it is a machine's log, and decorative (the sign's status says the percent).
 */

/** A loaded file's line: its folder and its name, without the query. */
export function itemName(url: string): string {
  if (url.startsWith('data:')) return 'data';
  const path = url.split(/[?#]/)[0].split('/').filter(Boolean);
  return path.slice(-2).join('/') || url;
}

/** the width the lines are padded to, and the longest name that fits in it */
const WIDTH = 48;
const NAME = WIDTH - 9;

const fit = (name: string) => (name.length > NAME ? `${name.slice(0, NAME - 1)}…` : name);
const dots = (left: string, right: string) => `${left} ${'.'.repeat(Math.max(3, WIDTH - left.length - right.length - 2))} ${right}`;

/**
 * At most `max` lines: the scene's percent, the last files in (each "ok"), and a last line — "…" while
 * more is coming, "/" once everything is in. Three's manager says a file is done, not that it began: what
 * is still loading is that one trailing line, not a line each.
 */
export function logLines(items: readonly string[], percent: number, max: number): string[] {
  const head = dots('{ scene', `${String(percent).padStart(3)}%`);
  const room = Math.max(0, max - 2);
  const files = room ? items.slice(-room).map((n) => dots(`  ${fit(n)}`, 'ok')) : [];
  return [head, ...files, percent >= 100 ? '  /' : '  …'];
}
