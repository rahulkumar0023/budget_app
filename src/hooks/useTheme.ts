import { useMemo } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { getTheme, commonStyles } from '../styles/theme';

export const useTheme = () => {
  const appThemeId = useBudgetStore((state) => state.preferences.appThemeId);

  const theme = useMemo(() => getTheme(appThemeId), [appThemeId]);

  return {
    theme,
    styles: commonStyles,
  };
};
