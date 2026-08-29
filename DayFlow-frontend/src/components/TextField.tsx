import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { layout, type } from '../theme/themes';
import { AppText } from './AppText';

interface TextFieldProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Feather.glyphMap;
  error?: string;
  secure?: boolean;
}

export function TextField({ label, icon, error, secure, style, ...rest }: TextFieldProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.text
      : theme.colors.border;

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="captionMedium" tone="secondary" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          { backgroundColor: theme.colors.surface, borderColor, borderWidth: 1 },
        ]}
      >
        {icon ? (
          <Feather
            name={icon}
            size={16}
            color={focused ? theme.colors.text : theme.colors.textTertiary}
            style={styles.icon}
          />
        ) : null}
        <TextInput
          {...rest}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={theme.colors.textTertiary}
          style={[styles.input, type.body, { color: theme.colors.text }, style]}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Feather
              name={hidden ? 'eye' : 'eye-off'}
              size={16}
              color={theme.colors.textTertiary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={theme.colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: layout.space.lg },
  label: { marginBottom: 6, marginLeft: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: layout.radius.md,
    paddingHorizontal: 14,
    height: 50,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 0 },
  error: { marginTop: 6, marginLeft: 2 },
});
