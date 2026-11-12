export type SectionId = 'work' | 'about' | 'stack' | 'contact';
export type SignId = SectionId | 'cv';
export type SignShape = 'arrow' | 'rect' | 'octagon' | 'square';

export interface SignDef {
  id: SignId;
  label: string;
  shape: SignShape;
  /** metres */
  width: number;
  height: number;
  /** height of the sign centre on the pole */
  y: number;
  /** radians: direction of the sign's face normal around the pole (0 = towards +z, the camera) */
  facing: number;
  /** radians, in-plane roll for a hand-mounted look */
  tilt: number;
  color: string;
  textColor: string;
  border?: string;
}

export const POLE = { height: 5.2, radius: 0.06 } as const;

const PI = Math.PI;

/** Initial values from the plan; tuned at the M1 gate. Labels are always English (spec §14.7). */
export const SIGNS: readonly SignDef[] = [
  { id: 'stack', label: 'STACK', shape: 'octagon', width: 0.9, height: 0.9, y: 3.8, facing: PI, tilt: 0.14, color: '#d8262b', textColor: '#ffffff', border: '#ffffff' },
  { id: 'work', label: 'WORK', shape: 'arrow', width: 1.5, height: 0.42, y: 3.4, facing: 0, tilt: -0.08, color: '#ff7a1a', textColor: '#111111' },
  { id: 'about', label: 'ABOUT', shape: 'rect', width: 1.4, height: 0.46, y: 2.9, facing: PI / 2, tilt: 0.1, color: '#111111', textColor: '#f4f4f4', border: '#f4f4f4' },
  { id: 'contact', label: 'CONTACT', shape: 'rect', width: 1.5, height: 0.4, y: 2.4, facing: (3 * PI) / 2, tilt: -0.06, color: '#d8262b', textColor: '#ffffff' },
  { id: 'cv', label: 'CV', shape: 'square', width: 0.5, height: 0.5, y: 1.9, facing: (3 * PI) / 2 + PI / 6, tilt: 0.05, color: '#1c7a3c', textColor: '#ffffff', border: '#ffffff' },
];

export function signById(id: SignId): SignDef {
  const s = SIGNS.find((d) => d.id === id);
  if (!s) throw new Error(`unknown sign ${id}`);
  return s;
}
