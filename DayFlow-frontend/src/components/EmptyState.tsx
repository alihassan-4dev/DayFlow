import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { layout } from '../theme/themes';
import { AppText } from './AppText';

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
}

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.colors.surfaceElevated },
        ]}
      >
        <Feather name={icon} size={22} color={theme.colors.textTertiary} />
      </View>
      <AppText variant="headline" align="center">
        {title}
      </AppText>
      <AppText variant="caption" tone="tertiary" align="center" style={styles.message}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: layout.space.xxl * 2,
    paddingHorizontal: layout.space.xl,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: layout.space.lg,
  },
  message: { marginTop: 6, maxWidth: 240, lineHeight: 19 },
});
