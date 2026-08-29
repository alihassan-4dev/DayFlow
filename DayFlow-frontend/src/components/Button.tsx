import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { layout } from '../theme/themes';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  full = true,
  style,
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const inactive = disabled || loading;

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: theme.colors.primary, fg: theme.colors.onPrimary },
    secondary: { bg: theme.colors.surface, fg: theme.colors.text, border: theme.colors.border },
    ghost: { bg: 'transparent', fg: theme.colors.textSecondary },
    danger: { bg: 'transparent', fg: theme.colors.danger },
  };
  const { bg, fg, border } = palette[variant];

  const animateTo = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 50, bounciness: 0 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, full && styles.full, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive }}
        onPressIn={() => animateTo(0.98)}
        onPressOut={() => animateTo(1)}
        onPress={() => {
          if (inactive) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress?.();
        }}
        style={[
          styles.base,
          {
            backgroundColor: bg,
            borderColor: border ?? 'transparent',
            borderWidth: border ? 1 : 0,
            opacity: inactive ? 0.45 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon ? <Feather name={icon} size={17} color={fg} style={styles.icon} /> : null}
            <AppText variant="headline" color={fg}>
              {label}
            </AppText>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  base: {
    height: 50,
    borderRadius: layout.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: layout.space.xl,
  },
  icon: { marginRight: layout.space.sm },
});
