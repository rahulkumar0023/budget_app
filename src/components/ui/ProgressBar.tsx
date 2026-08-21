import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  useColorScheme,
} from 'react-native';
import { colors, spacing, borderRadius, animation } from '../../styles/designTokens';
import { lightTheme, darkTheme } from '../../styles/designTokens';

export type ProgressStatus = 'success' | 'warning' | 'error';

interface ProgressBarProps {
  percentage: number; // 0-100
  animated?: boolean;
  status?: ProgressStatus;
  height?: number;
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  animated = true,
  status = 'success',
  height = 6,
  showLabel = false,
}) => {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  const animatedWidth = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: clampedPercentage,
        duration: animation.duration.standard,
        useNativeDriver: false,
      }).start();
    }
  }, [clampedPercentage, animated, animatedWidth]);

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      marginVertical: spacing.md,
    },
    track: {
      width: '100%',
      height,
      backgroundColor: theme.backgroundSecondary,
      borderRadius: borderRadius.full,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    fill: {
      height: '100%',
      borderRadius: borderRadius.full,
    },
  });

  const statusColors = {
    success: theme.success,
    warning: theme.warning,
    error: theme.error,
  };

  const fillWidth = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: animated ? fillWidth : `${clampedPercentage}%`,
              backgroundColor: statusColors[status],
            },
          ]}
        />
      </View>
      {showLabel && (
        <View style={{ marginTop: spacing.sm, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: theme.textMuted }}>
            {Math.round(clampedPercentage)}%
          </Text>
        </View>
      )}
    </View>
  );
};
