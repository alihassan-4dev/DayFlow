import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { layout } from '../theme/themes';

interface ScreenProps {
  children: React.ReactNode;
  /** Pad the top with the safe-area inset (off when a header already handles it). */
  safeTop?: boolean;
  safeBottom?: boolean;
  padded?: boolean;
  keyboardAvoiding?: boolean;
  style?: ViewStyle;
}

export function Screen({
  children,
  safeTop = true,
  safeBottom = false,
  padded = true,
  keyboardAvoiding = false,
  style,
}: ScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const content = (
    <View
      style={[
        styles.flex,
        {
          backgroundColor: theme.colors.background,
          paddingTop: safeTop ? insets.top : 0,
          paddingBottom: safeBottom ? Math.max(insets.bottom, layout.space.lg) : 0,
          paddingHorizontal: padded ? layout.space.xl : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!keyboardAvoiding) return content;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {content}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
