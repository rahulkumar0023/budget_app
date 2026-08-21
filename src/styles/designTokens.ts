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
 * BUDGET BUDDY THEME (Indigo) - Light
 */
export const budgetBuddyLight = {
  // Base
  background: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F3F0',

  // Primary Brand
  primary: '#2F7D62',
  primaryDark: '#1B4D37',
  primaryLight: '#E8F5E9',

  // Accents & Status
  accent: '#D4A574',
  success: '#4CAF50',
  warning: '#FFA726',
  error: '#E53935',

  // Text
  text: '#1A1A1A',
  textSecondary: '#424242',
  textTertiary: '#757575',
  textDisabled: '#BDBDBD',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E0E0E0',
  divider: '#F0F0F0',
};

/**
 * BUDGET BUDDY THEME (Indigo) - Dark
 */
export const budgetBuddyDark = {
  background: '#0D1B17',
  surface: '#1A2D27',
  surfaceAlt: '#254F47',

  primary: '#4CAF50',
  primaryDark: '#2E7D3E',
  primaryLight: '#A5D6A7',

  accent: '#FFD54F',
  success: '#4CAF50',
  warning: '#FFA726',
  error: '#E53935',

  text: '#E8F5E9',
  textSecondary: '#B0BEC5',
  textTertiary: '#78909C',
  textDisabled: '#546E7A',
  textInverse: '#0D1B17',

  border: '#2F7D62',
  divider: '#254F47',
};

/**
 * GARDEN FRESH THEME (Teal) - Light
 */
export const gardenFreshLight = {
  background: '#F0F7F7',
  surface: '#FFFFFF',
  surfaceAlt: '#E0F2F1',

  primary: '#00897B',
  primaryDark: '#00695C',
  primaryLight: '#B2DFDB',

  accent: '#4FC3F7',
  success: '#26A69A',
  warning: '#FFA726',
  error: '#EF5350',

  text: '#004D40',
  textSecondary: '#455A64',
  textTertiary: '#78909C',
  textDisabled: '#B0BEC5',
  textInverse: '#FFFFFF',

  border: '#B2DFDB',
  divider: '#E0F2F1',
};

/**
 * GARDEN FRESH THEME (Teal) - Dark
 */
export const gardenFreshDark = {
  background: '#0D2C2A',
  surface: '#1B4F4B',
  surfaceAlt: '#2A6B67',

  primary: '#4DB8AC',
  primaryDark: '#26A69A',
  primaryLight: '#B2DFDB',

  accent: '#80DEEA',
  success: '#4DB8AC',
  warning: '#FFA726',
  error: '#EF5350',

  text: '#E0F2F1',
  textSecondary: '#B2DFDB',
  textTertiary: '#80DEEA',
  textDisabled: '#546E7A',
  textInverse: '#0D2C2A',

  border: '#4DB8AC',
  divider: '#2A6B67',
};

/**
 * WARM CLAY THEME (Terracotta) - Light
 */
export const warmClayLight = {
  background: '#FFFAF0',
  surface: '#FFFFFF',
  surfaceAlt: '#FFEAA7',

  primary: '#C85A1B',
  primaryDark: '#8B4513',
  primaryLight: '#FFE5CC',

  accent: '#E8B04B',
  success: '#6D8659',
  warning: '#F5A623',
  error: '#D64545',

  text: '#3E2723',
  textSecondary: '#5D4E37',
  textTertiary: '#9D8B7E',
  textDisabled: '#D7CCC8',
  textInverse: '#FFFFFF',

  border: '#E8B04B',
  divider: '#FFE5CC',
};

/**
 * WARM CLAY THEME (Terracotta) - Dark
 */
export const warmClayDark = {
  background: '#2D1810',
  surface: '#4A2C1A',
  surfaceAlt: '#6B3E25',

  primary: '#FF8A65',
  primaryDark: '#D84315',
  primaryLight: '#FFAB91',

  accent: '#FFD54F',
  success: '#AED581',
  warning: '#FFB74D',
  error: '#E57373',

  text: '#FFE5CC',
  textSecondary: '#FFCC99',
  textTertiary: '#FFB366',
  textDisabled: '#996633',
  textInverse: '#2D1810',

  border: '#FF8A65',
  divider: '#6B3E25',
};

/**
 * FOREST NIGHT THEME (Emerald) - Light (rarely used)
 */
export const forestNightLight = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F0F0',

  primary: '#1B5E20',
  primaryDark: '#0D3818',
  primaryLight: '#C8E6C9',

  accent: '#FFD54F',
  success: '#4CAF50',
  warning: '#FFA726',
  error: '#D32F2F',

  text: '#1B5E20',
  textSecondary: '#388E3C',
  textTertiary: '#558B2F',
  textDisabled: '#9CCC65',
  textInverse: '#FFFFFF',

  border: '#E0E0E0',
  divider: '#F0F0F0',
};

/**
 * FOREST NIGHT THEME (Emerald) - Dark (Primary for this theme)
 */
export const forestNightDark = {
  background: '#0D2D2A',
  surface: '#1A3A38',
  surfaceAlt: '#254F4D',

  primary: '#2EBF7E',
  primaryDark: '#1BA558',
  primaryLight: '#D4F8E8',

  accent: '#FFD700',
  success: '#4CAF50',
  warning: '#FFA726',
  error: '#FF5252',

  text: '#E8F5E9',
  textSecondary: '#B0BEC5',
  textTertiary: '#78909C',
  textDisabled: '#546E7A',
  textInverse: '#0D2D2A',

  border: '#2EBF7E',
  divider: '#254F4D',
};

/**
 * Generic Light Theme (Fallback)
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
 * Generic Dark Theme (Fallback)
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
