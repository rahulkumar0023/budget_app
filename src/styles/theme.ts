import { appThemes, type AppThemeId } from '../../budgetModel';

export const getTheme = (themeId: AppThemeId) => appThemes[themeId] || appThemes.sunrise;

export const commonStyles = {
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    extraLarge: 20,
    full: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
};
