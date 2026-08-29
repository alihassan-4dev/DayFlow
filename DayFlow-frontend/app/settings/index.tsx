import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api/client';
import { AppText } from '../../src/components/AppText';
import { Screen } from '../../src/components/Screen';
import { SettingGroup, SettingRow } from '../../src/components/SettingRow';
import { usePreferences } from '../../src/state/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { cardShadow, layout } from '../../src/theme/themes';

export default function SettingsIndex() {
  const { theme } = useTheme();
  const { prefs } = usePreferences();
  const router = useRouter();

  const toneLabel = {
    motivational: 'Motivational',
    friendly: 'Friendly',
    minimal: 'Minimal',
  }[prefs.notificationTone];

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
            <AppText variant="caption" tone="tertiary" style={styles.email}>
              accounts@innoxitechai.com
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
            onPress={() => router.push('/settings/ai-preferences')}
          />
          <SettingRow
            icon="mic"
            title="Voice"
            value={prefs.voiceEnabled ? 'On' : 'Off'}
            onPress={() => router.push('/settings/voice')}
            last
          />
        </SettingGroup>

        <SettingGroup title="About">
          <SettingRow icon="file-text" title="Terms & privacy" onPress={() => {}} />
          <SettingRow icon="help-circle" title="Help & feedback" onPress={() => {}} />
          <SettingRow icon="info" title="Version" value="1.0.0" last />
        </SettingGroup>

        <SettingGroup>
          <SettingRow
            icon="log-out"
            title="Sign out"
            danger
            onPress={() => {
              api.signOut();
              router.replace('/(auth)/welcome');
            }}
            last
          />
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
  profileText: { marginLeft: layout.space.lg },
  email: { marginTop: 2 },
});
