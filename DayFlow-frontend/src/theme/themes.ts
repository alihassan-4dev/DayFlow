import { Platform, TextStyle, ViewStyle } from 'react-native';

export type ThemeId = 'light' | 'dark' | 'aurora' | 'ocean' | 'forest' | 'oled';

export interface ThemeColors {
  /** Screen background */
  background: string;
  /** Card / row background */
  surface: string;
  /** Filled controls: inputs, chips, segmented track */
  surfaceElevated: string;
  /** Hairline borders and dividers */
  border: string;

  text: string;
  textSecondary: string;
  textTertiary: string;

  /** Main call-to-action color (ink in light themes, paper in dark) */
  primary: string;
  onPrimary: string;

  /** Brand accent — used sparingly: links, selection, small highlights */
  accent: string;
  accentSoft: string;
  onAccent: string;

  /** AI identity gradient endpoints — the only place gradients live */
  aiA: string;
  aiB: string;

  success: string;
  warning: string;
  danger: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  tagline: string;
  dark: boolean;
  colors: ThemeColors;
}

export const themes: Record<ThemeId, Theme> = {
  light: {
    id: 'light',
    name: 'Paper',
    tagline: 'Warm, calm, default',
    dark: false,
    colors: {
      background: '#FAFAF8',
      surface: '#FFFFFF',
      surfaceElevated: '#F3F3F0',
      border: '#EBEAE6',
      text: '#1A1A17',
      textSecondary: '#6F6E69',
      textTertiary: '#A9A7A0',
      primary: '#1A1A17',
      onPrimary: '#FFFFFF',
      accent: '#3D6BE5',
      accentSoft: '#EDF2FD',
      onAccent: '#FFFFFF',
      aiA: '#7B87F5',
      aiB: '#53BFD3',
      success: '#369668',
      warning: '#C7861E',
      danger: '#D2543F',
    },
  },
  dark: {
    id: 'dark',
    name: 'Ink',
    tagline: 'Quiet dark mode',
    dark: true,
    colors: {
      background: '#141416',
      surface: '#1C1C1F',
      surfaceElevated: '#26262A',
      border: '#2A2A2E',
      text: '#EDEDEA',
      textSecondary: '#A3A39E',
      textTertiary: '#6E6E68',
      primary: '#F0F0EC',
      onPrimary: '#17171A',
      accent: '#7C8CF0',
      accentSoft: '#26283A',
      onAccent: '#101019',
      aiA: '#8F97F2',
      aiB: '#5EC1D6',
      success: '#4FAE7E',
      warning: '#D8A44A',
      danger: '#DF6E5E',
    },
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    tagline: 'Soft violet night',
    dark: true,
    colors: {
      background: '#151221',
      surface: '#1D1930',
      surfaceElevated: '#272141',
      border: '#2E2750',
      text: '#F2EFFA',
      textSecondary: '#ADA5C8',
      textTertiary: '#746C96',
      primary: '#EFEBFA',
      onPrimary: '#1A1526',
      accent: '#A78BFA',
      accentSoft: '#2A2347',
      onAccent: '#160F26',
      aiA: '#B79CF8',
      aiB: '#6AA5E8',
      success: '#57B58C',
      warning: '#D9A94E',
      danger: '#E07A82',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    tagline: 'Deep and focused',
    dark: true,
    colors: {
      background: '#0E1622',
      surface: '#152030',
      surfaceElevated: '#1D2B3E',
      border: '#24354B',
      text: '#EAF2F8',
      textSecondary: '#9BB0C2',
      textTertiary: '#61788D',
      primary: '#EDF4F9',
      onPrimary: '#101B28',
      accent: '#55A7DD',
      accentSoft: '#182F45',
      onAccent: '#0A141F',
      aiA: '#64B6E8',
      aiB: '#7F8CE8',
      success: '#4BB596',
      warning: '#D5A54A',
      danger: '#DE7473',
    },
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    tagline: 'Grounded green',
    dark: false,
    colors: {
      background: '#F7F8F4',
      surface: '#FFFFFF',
      surfaceElevated: '#F1F3EC',
      border: '#E5E9DF',
      text: '#1C211B',
      textSecondary: '#626B5E',
      textTertiary: '#9AA294',
      primary: '#232A21',
      onPrimary: '#FFFFFF',
      accent: '#45795B',
      accentSoft: '#E9F1EA',
      onAccent: '#FFFFFF',
      aiA: '#6FA98A',
      aiB: '#57B49F',
      success: '#38915F',
      warning: '#B8821F',
      danger: '#C74E3B',
    },
  },
  oled: {
    id: 'oled',
    name: 'Carbon',
    tagline: 'Pure black · OLED',
    dark: true,
    colors: {
      background: '#000000',
      surface: '#121214',
      surfaceElevated: '#1C1C1F',
      border: '#242428',
      text: '#F2F2F0',
      textSecondary: '#9C9C98',
      textTertiary: '#5F5F5C',
      primary: '#F0F0EC',
      onPrimary: '#121214',
      accent: '#8A94EE',
      accentSoft: '#1B1D2E',
      onAccent: '#0E0E14',
      aiA: '#9298F0',
      aiB: '#58BFD4',
      success: '#4FAE7E',
      warning: '#D8A44A',
      danger: '#DF6E5E',
    },
  },
};

export const themeList: Theme[] = Object.values(themes);

/** Shared spacing / radius scale — theme independent. */
export const layout = {
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 },
  radius: { sm: 8, md: 12, lg: 16, xl: 22, full: 999 },
} as const;

/**
 * Type scale.
 * Fraunces (a warm serif) carries the big editorial headings;
 * Inter does everything else. Times use tabular figures.
 */
export const type = {
  display: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: Platform.select({ ios: 0.2, default: 0 }),
  },
  title: { fontFamily: 'Fraunces_600SemiBold', fontSize: 22, lineHeight: 28 },
  headline: { fontFamily: 'Inter_600SemiBold', fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  captionMedium: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 },
  micro: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  /** Right-aligned times and counts — keeps digits from jiggling */
  mono: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
} as const;

/** Whisper-quiet card shadow. Dark themes rely on surface contrast instead. */
export function cardShadow(dark: boolean): ViewStyle {
  if (dark) return {};
  return {
    shadowColor: '#1A1A17',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  };
}
