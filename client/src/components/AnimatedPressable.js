/**
 * AnimatedPressable.js
 *
 * Drop-in replacement for TouchableOpacity that adds:
 *  - Smooth scale-down on press (like a physical button press)
 *  - Optional glowing outline ring that fades in on press
 *  - Works with any children
 */

import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

const AnimatedPressable = ({
  children,
  onPress,
  style,
  glowColor = "rgba(99, 102, 241, 0.35)",
  scaleAmount = 0.94,
  disabled = false,
  activeOpacity = 1,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: scaleAmount,
        useNativeDriver: true,
        speed: 80,
        bounciness: 4,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 60,
        bounciness: 6,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      {...rest}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {/* Glow ring overlay */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            styles.glowRing,
            {
              borderColor: glowColor,
              opacity: glowOpacity,
              borderRadius:
                style && style.borderRadius !== undefined ? style.borderRadius : 10,
            },
          ]}
        />
        {children}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  glowRing: {
    borderWidth: 2,
    zIndex: 99,
  },
});

export default AnimatedPressable;
