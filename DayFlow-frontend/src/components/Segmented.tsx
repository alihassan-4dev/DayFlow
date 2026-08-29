import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { cardShadow, layout } from '../theme/themes';
import { AppText } from './AppText';

interface SegmentedProps<T extends string> {
  options: { value: T; label: string; badge?: number }[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const { theme } = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.colors.surfaceElevated }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync().catch(() => {});
              onChange(opt.value);
            }}
            style={[
              styles.segment,
              active && [{ backgroundColor: theme.colors.surface }, cardShadow(theme.dark)],
            ]}
          >
            <AppText
              variant="captionMedium"
              tone={active ? 'primary' : 'tertiary'}
            >
              {opt.label}
            </AppText>
            {opt.badge != null && opt.badge > 0 ? (
              <AppText variant="mono" tone={active ? 'secondary' : 'tertiary'} style={styles.badge}>
                {opt.badge}
              </AppText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: layout.radius.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    height: 34,
    borderRadius: layout.radius.md - 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  badge: { fontSize: 12 },
});
