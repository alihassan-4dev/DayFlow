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

export default function SignUp() {
  const { theme } = useTheme();
  const { setPref } = usePreferences();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = async () => {
    const next: typeof errors = {};
    if (!email.includes('@')) next.email = 'Enter a valid email address';
    if (password.length < 8) next.password = 'Use at least 8 characters';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const user = await api.signup(name.trim(), email.trim(), password);
      if (user.name) setPref('name', user.name);
      router.replace('/onboarding');
    } catch (e) {
      setErrors({
        email:
          e instanceof ApiError
            ? e.message
            : 'Can’t reach DayFlow right now. Check your connection and try again.',
      });
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
          Create your account
        </AppText>
        <AppText variant="body" tone="secondary" style={styles.subtitle}>
          A calmer, smarter day starts here.
        </AppText>

        <TextField
          label="Name"
          icon="user"
          placeholder="What should we call you?"
          value={name}
          onChangeText={setName}
        />
        <TextField
          label="Email"
          icon="mail"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
        />
        <TextField
          label="Password"
          icon="lock"
          placeholder="At least 8 characters"
          secure
          value={password}
          onChangeText={setPassword}
          error={errors.password}
        />

        <Button label="Continue" onPress={submit} loading={loading} style={styles.cta} />

        <View style={styles.footer}>
          <AppText variant="caption" tone="tertiary">
            Already have an account?{' '}
          </AppText>
          <Pressable onPress={() => router.replace('/(auth)/login')}>
            <AppText variant="caption" tone="accent">
              Sign in
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
  cta: { marginTop: layout.space.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: layout.space.xl,
  },
});
