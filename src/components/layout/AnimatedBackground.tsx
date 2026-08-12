import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, useWindowDimensions } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export const AnimatedBackground: React.FC = () => {
  const { theme } = useTheme();
  const { height } = useWindowDimensions();

  // Detect if theme is light based on background color - check for light backgrounds
  const isLightTheme = !theme.background.startsWith('#0') &&
                      !theme.background.startsWith('#1') &&
                      !theme.background.startsWith('#2') &&
                      theme.background !== '#FFFFFF';
  const orbOpacity = isLightTheme ? 0.12 : 0.55;

  const move1 = useRef(new Animated.Value(0)).current;
  const move2 = useRef(new Animated.Value(0)).current;
  const move3 = useRef(new Animated.Value(0)).current;
  const move4 = useRef(new Animated.Value(0)).current;

  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const scale3 = useRef(new Animated.Value(1)).current;
  const scale4 = useRef(new Animated.Value(1)).current;

  const createMoveAnimation = (value: Animated.Value, duration: number) =>
    Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

  const createScaleAnimation = (value: Animated.Value, duration: number) =>
    Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1.2,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0.85,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

  useEffect(() => {
    Animated.parallel([
      createMoveAnimation(move1, 10000),
      createMoveAnimation(move2, 12000),
      createMoveAnimation(move3, 15000),
      createMoveAnimation(move4, 18000),
      createScaleAnimation(scale1, 9000),
      createScaleAnimation(scale2, 11000),
      createScaleAnimation(scale3, 13500),
      createScaleAnimation(scale4, 16000),
    ]).start();
  }, []);

  const getOrbStyle = (
    move: Animated.Value,
    scale: Animated.Value,
    xRange: number[],
    yRange: number[],
  ) => ({
    transform: [
      {
        translateX: move.interpolate({
          inputRange: [0, 1],
          outputRange: xRange,
        }),
      },
      {
        translateY: move.interpolate({
          inputRange: [0, 1],
          outputRange: yRange,
        }),
      },
      { scale },
    ],
  });

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}>
      <Animated.View
        style={[
          styles.orb,
          { backgroundColor: theme.orbPrimary, width: 280, height: 280, top: -60, right: -80, opacity: orbOpacity },
          getOrbStyle(move1, scale1, [0, 50], [0, 70]),
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          { backgroundColor: theme.orbSecondary, width: 240, height: 240, top: height * 0.35, left: -100, opacity: orbOpacity },
          getOrbStyle(move2, scale2, [0, 60], [0, -80]),
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          { backgroundColor: theme.orbTertiary, width: 200, height: 200, bottom: 50, right: -60, opacity: orbOpacity },
          getOrbStyle(move3, scale3, [0, -40], [0, -50]),
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          { backgroundColor: theme.accent, width: 130, height: 130, top: height * 0.5, left: '35%', opacity: orbOpacity * 0.6 },
          getOrbStyle(move4, scale4, [-20, 20], [-30, 30]),
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
});
