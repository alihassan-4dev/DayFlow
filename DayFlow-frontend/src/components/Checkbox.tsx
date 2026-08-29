import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  size?: number;
}

/** Rounded-square check, the quiet kind — fills with the accent when done. */
export function Checkbox({ checked, onToggle, size = 24 }: CheckboxProps) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: checked ? 1 : 0,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  }, [checked, scale]);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={12}
      onPress={() => {
        Haptics.impactAsync(
          checked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
        ).catch(() => {});
        onToggle();
      }}
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          borderColor: checked ? theme.colors.accent : theme.colors.border,
          backgroundColor: checked ? theme.colors.accent : theme.colors.surface,
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Feather name="check" size={size * 0.62} color={theme.colors.onAccent} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
