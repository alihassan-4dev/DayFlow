import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/themes';

type Variant = keyof typeof type;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'onAccent';

interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  color?: string;
  align?: TextStyle['textAlign'];
}

export function AppText({
  variant = 'body',
  tone = 'primary',
  color,
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  const { theme } = useTheme();
  const toneColor = {
    primary: theme.colors.text,
    secondary: theme.colors.textSecondary,
    tertiary: theme.colors.textTertiary,
    accent: theme.colors.accent,
    onAccent: theme.colors.onAccent,
  }[tone];

  return (
    <Text
      {...rest}
      style={[type[variant], { color: color ?? toneColor, textAlign: align }, style]}
    >
      {children}
    </Text>
  );
}
