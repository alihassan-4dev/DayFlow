import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { api, loadToken } from '../src/api/client';
import { usePreferences } from '../src/state/PreferencesContext';
import { useTheme } from '../src/theme/ThemeContext';

/**
 * Entry gate: an existing session goes straight to the app,
 * everyone else starts at the welcome screen.
 */
export default function Index() {
  const { theme } = useTheme();
  const { setPref } = usePreferences();
  const [target, setTarget] = useState<'/(main)/tasks' | '/(auth)/welcome' | null>(null);

  useEffect(() => {
    (async () => {
      const token = await loadToken();
      if (!token) {
        setTarget('/(auth)/welcome');
        return;
      }
      try {
        const user = await api.me();
        if (user.name) setPref('name', user.name);
        if (user.email) setPref('email', user.email);
        setTarget('/(main)/tasks');
      } catch (e) {
        // Invalid/expired token → sign in again. Network trouble → let the
        // app open; the tasks screen shows its offline state.
        if ((e as { status?: number }).status === 401) {
          await api.signOut();
          setTarget('/(auth)/welcome');
        } else {
          setTarget('/(main)/tasks');
        }
      }
    })();
  }, [setPref]);

  if (!target) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return <Redirect href={target} />;
}
