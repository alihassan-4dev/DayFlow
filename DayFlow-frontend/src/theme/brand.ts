/**
 * DayFlow brand mark — a river of "flow" that resolves into a check mark,
 * under a rising sun. The same geometry renders the app icon (assets/) and
 * the in-app vector mark, so they always match.
 *
 * Coordinates live in a 100×100 box.
 */
export const FLOW_PATH = 'M 13 54 C 24 36, 36 36, 47 52 S 61 74, 67 70 L 87 30';
/** Approximate stroke length, for draw-on animations. */
export const FLOW_PATH_LENGTH = 120;
export const SUN = { cx: 31, cy: 24, r: 8.5 };
export const RAYS: [number, number, number, number][] = [
  [31, 8.5, 31, 12.5],
  [43.5, 13.5, 40.7, 16.3],
  [18.5, 13.5, 21.3, 16.3],
];

export const brand = {
  /** Flow gradient on dark surfaces */
  flowDark: ['#8B93FF', '#5FB8F0', '#5EE6D0'],
  /** Flow gradient on light surfaces */
  flowLight: ['#6D78F2', '#3F9FE0', '#2FC2B6'],
  sunTop: '#FFE29A',
  sunBottom: '#FFA84C',
  ray: '#FFD27A',
  /** Splash / icon background gradient */
  splash: ['#232653', '#15173A', '#0B0C1E'],
  splashSolid: '#15173A',
} as const;
