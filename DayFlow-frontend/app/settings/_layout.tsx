import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '../../src/theme/ThemeContext';
import { type } from '../../src/theme/themes';

export default function SettingsLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { ...type.headline, color: theme.colors.text },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="ai-preferences" options={{ title: 'AI Preferences' }} />
      <Stack.Screen name="voice" options={{ title: 'Voice' }} />
    </Stack>
  );
}
