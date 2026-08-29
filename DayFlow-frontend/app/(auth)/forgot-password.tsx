import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { api } from '../../src/api/client';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { useTheme } from '../../src/theme/ThemeContext';
import { layout } from '../../src/theme/themes';

export default function ForgotPassword() {
  const { theme } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
    } catch {
      // Uniform response either way — never reveal whether the email exists.
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <Screen keyboardAvoiding safeBottom>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Feather name="chevron-left" size={24} color={theme.colors.text} />
      </Pressable>

      {sent ? (
        <View style={styles.sentWrap}>
          <EmptyState
            icon="inbox"
            title="Check your inbox"
            message={`We sent a reset link to ${email}. It may take a minute to arrive.`}
          />
          <Button label="Back to sign in" variant="secondary" onPress={() => router.replace('/(auth)/login')} />
        </View>
      ) : (
        <View style={styles.form}>
          <AppText variant="display" style={styles.title}>
            Reset password
          </AppText>
          <AppText variant="body" tone="secondary" style={styles.subtitle}>
            Enter your email and we'll send you a link to get back in.
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
          <Button label="Send reset link" onPress={submit} loading={loading} style={styles.cta} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { marginTop: layout.space.md, width: 40 },
  form: { paddingTop: layout.space.xxl },
  sentWrap: { flex: 1, justifyContent: 'center', paddingBottom: layout.space.xxl },
  title: { marginBottom: layout.space.sm },
  subtitle: { marginBottom: layout.space.xxl },
  cta: { marginTop: layout.space.sm },
});
