import { appThemes, type AppThemeId } from '../../budgetModel';

export const getTheme = (themeId: AppThemeId) => appThemes[themeId] || appThemes.sunrise;

export const commonStyles = {
  borderRadius: {
    small: 12,
    medium: 18,
    large: 24,
    extraLarge: 32,
    full: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  shadows: {
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
      elevation: 5,
    },
  }
};
