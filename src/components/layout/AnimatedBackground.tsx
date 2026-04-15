import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, useWindowDimensions } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export const AnimatedBackground: React.FC = () => {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();

  // Animation values for three orbs
  const move1 = useRef(new Animated.Value(0)).current;
  const move2 = useRef(new Animated.Value(0)).current;
  const move3 = useRef(new Animated.Value(0)).current;

  const createAnimation = (value: Animated.Value, duration: number) => {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
  };

  useEffect(() => {
    createAnimation(move1, 10000).start();
    createAnimation(move2, 12000).start();
    createAnimation(move3, 15000).start();
  }, []);

  const getStyle = (value: Animated.Value, xRange: number[], yRange: number[]) => ({
    transform: [
      {
        translateX: value.interpolate({
          inputRange: [0, 1],
          outputRange: xRange,
        }),
      },
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: yRange,
        }),
      },
    ],
  });

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}>
      <Animated.View
        style={[
          styles.orb,
          { backgroundColor: theme.orbPrimary, width: 220, height: 220, top: -40, right: -60 },
          getStyle(move1, [0, 30], [0, 50])
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          { backgroundColor: theme.orbSecondary, width: 180, height: 180, top: height * 0.4, left: -70 },
          getStyle(move2, [0, 40], [0, -60])
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          { backgroundColor: theme.orbTertiary, width: 150, height: 150, bottom: 60, right: -40 },
          getStyle(move3, [0, -30], [0, -40])
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.4,
  },
});
