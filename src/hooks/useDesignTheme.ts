import { useColorScheme } from 'react-native';
import { getTheme, type Theme } from '../styles/designTokens';

/**
 * Hook to get the current theme based on system preferences
 * Automatically updates when system theme changes
 */
export const useDesignTheme = (): Theme => {
  const isDark = useColorScheme() === 'dark';
  return getTheme(isDark);
};
