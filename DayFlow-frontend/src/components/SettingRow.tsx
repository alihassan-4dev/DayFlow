import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { cardShadow, layout } from '../theme/themes';
import { AppText } from './AppText';

interface SettingRowProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  switchValue?: boolean;
  onSwitch?: (value: boolean) => void;
  danger?: boolean;
  last?: boolean;
}

export function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  switchValue,
  onSwitch,
  danger = false,
  last = false,
}: SettingRowProps) {
  const { theme } = useTheme();
  const isSwitch = onSwitch != null;
  const tint = danger ? theme.colors.danger : theme.colors.textSecondary;

  const content = (
    <View
      style={[
        styles.row,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      {icon ? <Feather name={icon} size={17} color={tint} style={styles.icon} /> : null}
      <View style={styles.textWrap}>
        <AppText variant="bodyMedium" color={danger ? theme.colors.danger : undefined}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="tertiary" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitch}
          trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <>
          {value ? (
            <AppText variant="caption" tone="tertiary" style={styles.value}>
              {value}
            </AppText>
          ) : null}
          {onPress ? (
            <Feather name="chevron-right" size={16} color={theme.colors.textTertiary} />
          ) : null}
        </>
      )}
    </View>
  );

  if (onPress && !isSwitch) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

/** Card wrapper that groups SettingRows. */
export function SettingGroup({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.group}>
      {title ? (
        <AppText variant="micro" tone="tertiary" style={styles.groupTitle}>
          {title}
        </AppText>
      ) : null}
      <View
        style={[
          styles.card,
          cardShadow(theme.dark),
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: layout.space.lg,
  },
  icon: { marginRight: 14, width: 18 },
  textWrap: { flex: 1 },
  subtitle: { marginTop: 2 },
  value: { marginRight: layout.space.sm },
  group: { marginBottom: layout.space.xl },
  groupTitle: { marginBottom: layout.space.sm, marginLeft: 2 },
  card: {
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
