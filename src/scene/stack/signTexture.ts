import { getIcon } from '../stickers/icons';

export interface SignContent {
  title: string;
  items: readonly { label: string; icon?: string }[];
}

/** The sign's texture, px: a 2.4 × 1.92 m highway sign at a resolution that stays crisp close up. */
export const SIGN_TEXTURE = { w: 1024, h: 820 } as const;

export interface SignLine {
  kind: 'title' | 'item';
  text: string;
  icon?: string;
  /** left of the text (items: of the icon), baseline-centre y */
  x: number;
  y: number;
  width: number;
}

export interface SignLayout {
  titlePx: number;
  itemPx: number;
  columns: 1 | 2;
  lines: SignLine[];
  /** the text could not be fitted at the smallest allowed size */
  overflow: boolean;
}

const PAD = 0.07;
const MIN_ITEM = 18 / 1024;

/**
 * Where everything goes on a sign, given how wide a text is at a size (canvas measureText in the browser,
 * a stand-in in the tests): the category on top as large as fits on one line, the items below in one
 * column (up to four) or two, each with room for its logo, all at the largest size that fits; nothing wraps.
 */
export function layoutSign(sign: SignContent, size: { w: number; h: number }, measure: (text: string, px: number) => number): SignLayout {
  const pad = size.w * PAD;
  const inner = size.w - 2 * pad;
  let titlePx = size.h * 0.13;
  while (titlePx > size.h * 0.05 && measure(sign.title.toUpperCase(), titlePx) > inner) titlePx -= 2;

  const columns: 1 | 2 = sign.items.length > 4 ? 2 : 1;
  const rows = Math.ceil(sign.items.length / columns);
  const top = pad + titlePx * 1.5;
  const rowsHeight = size.h - top - pad;
  const colGap = size.w * 0.04;
  const colWidth = (inner - (columns - 1) * colGap) / columns;
  let itemPx = Math.min(size.h * 0.075, rowsHeight / (rows * 1.6));
  const fits = (px: number) => sign.items.every((i) => px * 1.35 + measure(i.label, px) <= colWidth);
  while (itemPx > size.w * MIN_ITEM && !fits(itemPx)) itemPx -= 1;
  const overflow = !fits(itemPx) || measure(sign.title.toUpperCase(), titlePx) > inner;

  const lines: SignLine[] = [{ kind: 'title', text: sign.title.toUpperCase(), x: pad, y: pad + titlePx * 0.6, width: measure(sign.title.toUpperCase(), titlePx) }];
  const step = rowsHeight / rows;
  sign.items.forEach((item, k) => {
    const col = Math.floor(k / rows);
    const row = k % rows;
    lines.push({
      kind: 'item',
      text: item.label,
      icon: item.icon,
      x: pad + col * (colWidth + colGap),
      y: top + step * (row + 0.5),
      width: itemPx * 1.35 + measure(item.label, itemPx),
    });
  });
  return { titlePx, itemPx, columns, lines, overflow };
}

/**
 * Paints a green highway sign in the site's plate face (Oswald, with Cyrillic): the reflective white border,
 * the category, the items with their logos (simple-icons, as on the pole's stickers; a white disc where
 * there is none). The same layout as above, measured by the canvas itself.
 */
export function drawSign(ctx: CanvasRenderingContext2D, sign: SignContent, size: { w: number; h: number }): SignLayout {
  const font = (px: number, weight: number) => `${weight} ${px}px Oswald, "Arial Narrow", Arial, sans-serif`;
  const l = layoutSign(sign, size, (text, px) => {
    ctx.font = font(px, 700);
    return ctx.measureText(text).width;
  });
  ctx.fillStyle = '#0d6b3b';
  ctx.fillRect(0, 0, size.w, size.h);
  const r = size.w * 0.035;
  const inset = size.w * 0.016;
  ctx.strokeStyle = '#f4f7f2';
  ctx.lineWidth = size.w * 0.011;
  ctx.beginPath();
  ctx.roundRect(inset, inset, size.w - 2 * inset, size.h - 2 * inset, r);
  ctx.stroke();
  ctx.fillStyle = '#f4f7f2';
  ctx.textBaseline = 'middle';
  for (const line of l.lines) {
    if (line.kind === 'title') {
      ctx.font = font(l.titlePx, 700);
      ctx.fillText(line.text, line.x, line.y);
      continue;
    }
    const d = l.itemPx * 1.05;
    const cx = line.x + d / 2;
    ctx.beginPath();
    ctx.arc(cx, line.y, d / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#f4f7f2';
    ctx.fill();
    const icon = line.icon ? getIcon(line.icon) : null;
    if (icon) {
      ctx.save();
      const s = (d * 0.62) / 24;
      ctx.translate(cx - 12 * s, line.y - 12 * s);
      ctx.scale(s, s);
      ctx.fillStyle = '#0d6b3b';
      ctx.fill(new Path2D(icon.path));
      ctx.restore();
    }
    ctx.fillStyle = '#f4f7f2';
    ctx.font = font(l.itemPx, 700);
    ctx.fillText(line.text, line.x + l.itemPx * 1.35, line.y);
  }
  return l;
}
