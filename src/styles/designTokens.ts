/**
 * Design Tokens - Single source of truth for all design values
 * Use these tokens throughout the app instead of hardcoding colors/spacing
 */

// Color Palette - Finance-focused, trust-driven
export const colors = {
  // Semantic
  navy: '#1a2332',
  slate: '#475569',
  stone: '#78716c',
  silver: '#e7e5e4',
  canvas: '#f5f3f0',

  // Status & Feedback
  emerald: '#10b981',
  emeraldLight: '#d1fae5',
  amber: '#f59e0b',
  amberLight: '#fef3c7',
  rose: '#ef4444',
  roseLight: '#fee2e2',
  blue: '#3b82f6',
  blueLight: '#dbeafe',

  // Grayscale
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

// Spacing System - 4px base unit
export const spacing = {
  xs: 4,      // 0.25rem
  sm: 8,      // 0.5rem
  md: 12,     // 0.75rem
  lg: 16,     // 1rem
  xl: 24,     // 1.5rem
  xxl: 32,    // 2rem
  xxxl: 48,   // 3rem
};

// Typography
export const typography = {
  fontFamily: {
    body: 'system',
    display: 'Georgia, serif',
    mono: 'Courier New, monospace',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 26,
    xxxl: 32,
    display: 48,
  },
  fontWeight: {
    light: '300' as any,
    normal: '400' as any,
    medium: '500' as any,
    semibold: '600' as any,
    bold: '700' as any,
    extrabold: '800' as any,
    black: '900' as any,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
    loose: 1.8,
  },
};

// Border Radius
export const borderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

// Shadows
export const shadows = {
  none: 'none',
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 10,
  },
};

// Animation
export const animation = {
  duration: {
    quick: 150,
    base: 200,
    standard: 300,
    slow: 500,
    verySlow: 800,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    linear: 'linear',
  },
};

// Component-specific sizes
export const componentSizes = {
  touchMinimum: 48,  // Minimum touch target size
  iconSmall: 16,
  iconBase: 24,
  iconLarge: 32,
  buttonHeight: 44,
  buttonHeightSmall: 36,
  inputHeight: 48,
};

/**
 * Light Theme
 */
export const lightTheme = {
  // Backgrounds
  background: colors.white,
  backgroundSecondary: colors.canvas,
  surface: colors.white,
  surfaceSecondary: colors.canvas,

  // Text
  text: colors.navy,
  textSecondary: colors.slate,
  textMuted: colors.stone,
  textInverse: colors.white,

  // Borders
  border: colors.silver,
  borderFocus: colors.blue,

  // Status colors
  success: colors.emerald,
  successLight: colors.emeraldLight,
  warning: colors.amber,
  warningLight: colors.amberLight,
  error: colors.rose,
  errorLight: colors.roseLight,
  info: colors.blue,
  infoLight: colors.blueLight,

  // Semantic
  primary: colors.emerald,
  secondary: colors.slate,
  accent: colors.blue,
};

/**
 * Dark Theme
 */
export const darkTheme = {
  // Backgrounds
  background: '#0f1419',
  backgroundSecondary: colors.navy,
  surface: '#1a2332',
  surfaceSecondary: '#2d3748',

  // Text
  text: colors.canvas,
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  textInverse: colors.navy,

  // Borders
  border: '#334155',
  borderFocus: colors.blue,

  // Status colors
  success: colors.emerald,
  successLight: '#064e3b',
  warning: colors.amber,
  warningLight: '#78350f',
  error: colors.rose,
  errorLight: '#7f1d1d',
  info: colors.blue,
  infoLight: '#1e3a8a',

  // Semantic
  primary: colors.emerald,
  secondary: '#cbd5e1',
  accent: colors.blue,
};

// Export a helper to get current theme
export type Theme = typeof lightTheme;

export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};
