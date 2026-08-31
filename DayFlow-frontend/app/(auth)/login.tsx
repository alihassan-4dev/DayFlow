import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { api, ApiError } from '../../src/api/client';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { FormScrollView } from '../../src/components/FormScrollView';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { usePreferences } from '../../src/state/PreferencesContext';
import { useTasks } from '../../src/state/TasksContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { layout } from '../../src/theme/themes';

export default function Login() {
  const { theme } = useTheme();
  const { setPref } = usePreferences();
  const { refresh } = useTasks();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    if (loading) return;
    if (!email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      const user = await api.login(email.trim(), password);
      if (user.name) setPref('name', user.name);
      await refresh();
      router.replace('/(main)/tasks');
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Can’t reach DayFlow right now. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboardAvoiding safeBottom>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Feather name="chevron-left" size={24} color={theme.colors.text} />
      </Pressable>
      <FormScrollView
        contentContainerStyle={styles.scroll}
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
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          icon="lock"
          placeholder="Your password"
          secure
          value={password}
          onChangeText={setPassword}
          returnKeyType="go"
          onSubmitEditing={submit}
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
      </FormScrollView>
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
