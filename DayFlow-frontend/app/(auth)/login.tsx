import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api, ApiError } from '../../src/api/client';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { usePreferences } from '../../src/state/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { layout } from '../../src/theme/themes';

export default function Login() {
  const { theme } = useTheme();
  const { setPref } = usePreferences();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      const user = await api.login(email.trim(), password);
      if (user.name) setPref('name', user.name);
      router.replace('/(main)/tasks');
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        // Backend unreachable — continue in offline demo mode.
        router.replace('/(main)/tasks');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboardAvoiding safeBottom>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Feather name="chevron-left" size={24} color={theme.colors.text} />
      </Pressable>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="display" style={styles.title}>
          Welcome back
        </AppText>
        <AppText variant="body" tone="secondary" style={styles.subtitle}>
          Pick up your day where you left it.
        </AppText>

        <TextField
          label="Email"
          icon="mail"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          error={error}
        />
        <TextField
          label="Password"
          icon="lock"
          placeholder="Your password"
          secure
          value={password}
          onChangeText={setPassword}
        />

        <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgot}>
          <AppText variant="caption" tone="accent">
            Forgot password?
          </AppText>
        </Pressable>

        <Button label="Sign in" onPress={submit} loading={loading} />

        <View style={styles.footer}>
          <AppText variant="caption" tone="tertiary">
            New to DayFlow?{' '}
          </AppText>
          <Pressable onPress={() => router.replace('/(auth)/signup')}>
            <AppText variant="caption" tone="accent">
              Create an account
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { marginTop: layout.space.md, width: 40 },
  scroll: { paddingTop: layout.space.xxl },
  title: { marginBottom: layout.space.sm },
  subtitle: { marginBottom: layout.space.xxl },
  forgot: { alignSelf: 'flex-end', marginBottom: layout.space.xl },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: layout.space.xl,
  },
});
