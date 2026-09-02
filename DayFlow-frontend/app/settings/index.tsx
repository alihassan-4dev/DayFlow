import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api/client';
import { AppText } from '../../src/components/AppText';
import { Screen } from '../../src/components/Screen';
import { SettingGroup, SettingRow } from '../../src/components/SettingRow';
import { links } from '../../src/data/content';
import { unregisterPushNotifications } from '../../src/services/notifications';
import { useChat } from '../../src/state/ChatContext';
import { usePreferences } from '../../src/state/PreferencesContext';
import { useTasks } from '../../src/state/TasksContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { cardShadow, layout } from '../../src/theme/themes';

const VOICE_NAMES: Record<string, string> = {
  ava: 'Ava',
  andrew: 'Andrew',
  emma: 'Emma',
  brian: 'Brian',
  sonia: 'Sonia',
  ryan: 'Ryan',
  natasha: 'Natasha',
  neerja: 'Neerja',
  device: 'Device',
};

export default function SettingsIndex() {
  const { theme } = useTheme();
  const { prefs, setPref } = usePreferences();
  const { clear: clearTasks } = useTasks();
  const { clear: clearChat } = useChat();
  const router = useRouter();

  const toneLabel = {
    motivational: 'Motivational',
    friendly: 'Friendly',
    minimal: 'Minimal',
  }[prefs.notificationTone];

  const personalityLabel = { friendly: 'Friendly', focused: 'Focused', coach: 'Coach' }[
    prefs.aiPersonality
  ];

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  const signOut = () =>
    Alert.alert('Sign out?', 'Your tasks stay safe in your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await unregisterPushNotifications();
          await api.signOut();
          clearTasks();
          clearChat();
          setPref('email', '');
          router.replace('/(auth)/welcome');
        },
      },
    ]);

  return (
    <Screen safeTop={false} padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View
          style={[
            styles.profile,
            cardShadow(theme.dark),
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.surfaceElevated },
            ]}
          >
            <AppText variant="title" tone="secondary">
              {prefs.name.charAt(0).toUpperCase()}
            </AppText>
          </View>
          <View style={styles.profileText}>
            <AppText variant="headline">{prefs.name}</AppText>
            <AppText variant="caption" tone="tertiary" style={styles.email} numberOfLines={1}>
              {prefs.email || 'Signed in'}
            </AppText>
          </View>
        </View>

        <SettingGroup title="Preferences">
          <SettingRow
            icon="droplet"
            title="Appearance"
            value={theme.name}
            onPress={() => router.push('/settings/appearance')}
          />
          <SettingRow
            icon="bell"
            title="Notifications"
            value={prefs.notificationsEnabled ? toneLabel : 'Off'}
            onPress={() => router.push('/settings/notifications')}
          />
          <SettingRow
            icon="sliders"
            title="AI preferences"
            value={personalityLabel}
            onPress={() => router.push('/settings/ai-preferences')}
          />
          <SettingRow
            icon="mic"
            title="Voice"
            value={prefs.voiceEnabled ? (VOICE_NAMES[prefs.voiceId] ?? 'On') : 'Off'}
            onPress={() => router.push('/settings/voice')}
            last
          />
        </SettingGroup>

        <SettingGroup title="About">
          <SettingRow icon="file-text" title="Terms & privacy" onPress={() => open(links.license)} />
          <SettingRow icon="help-circle" title="Help & feedback" onPress={() => open(links.issues)} />
          <SettingRow icon="github" title="Open source" onPress={() => open(links.repo)} />
          <SettingRow icon="info" title="Version" value={version} last />
        </SettingGroup>

        <SettingGroup>
          <SettingRow icon="log-out" title="Sign out" danger onPress={signOut} last />
        </SettingGroup>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.space.xl, paddingBottom: layout.space.xxl },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: layout.space.lg,
    marginBottom: layout.space.xl,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { marginLeft: layout.space.lg, flex: 1 },
  email: { marginTop: 2 },
});
