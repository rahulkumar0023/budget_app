import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, useWindowDimensions } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export const AnimatedBackground: React.FC = () => {
  const { theme } = useTheme();
  const { height } = useWindowDimensions();

  const move1 = useRef(new Animated.Value(0)).current;
  const move2 = useRef(new Animated.Value(0)).current;
  const move3 = useRef(new Animated.Value(0)).current;

  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const scale3 = useRef(new Animated.Value(1)).current;

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
          toValue: 1.18,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0.88,
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
      createScaleAnimation(scale1, 9000),
      createScaleAnimation(scale2, 11000),
      createScaleAnimation(scale3, 13500),
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
          { backgroundColor: theme.orbPrimary, width: 240, height: 240, top: -50, right: -70 },
          getOrbStyle(move1, scale1, [0, 30], [0, 50]),
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          { backgroundColor: theme.orbSecondary, width: 200, height: 200, top: height * 0.4, left: -80 },
          getOrbStyle(move2, scale2, [0, 40], [0, -60]),
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          { backgroundColor: theme.orbTertiary, width: 170, height: 170, bottom: 70, right: -50 },
          getOrbStyle(move3, scale3, [0, -30], [0, -40]),
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.5,
  },
});
