import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../../src/components/AppText';
import { Chip } from '../../src/components/Chip';
import { Screen } from '../../src/components/Screen';
import { SettingGroup, SettingRow } from '../../src/components/SettingRow';
import { notificationPreviews } from '../../src/data/content';
import { requestNotificationPermission } from '../../src/services/notifications';
import { NotificationTone } from '../../src/data/types';
import { usePreferences } from '../../src/state/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { formatTime } from '../../src/utils/format';
import { cardShadow, layout } from '../../src/theme/themes';

const TONES: { value: NotificationTone; label: string; hint: string }[] = [
  { value: 'motivational', label: 'Motivational', hint: 'Energetic nudges that cheer you on' },
  { value: 'friendly', label: 'Friendly', hint: 'Warm, human reminders' },
  { value: 'minimal', label: 'Minimal', hint: 'Just the facts' },
];

const SUMMARY_TIMES = ['06:00', '07:00', '08:00', '09:00'] as const;
const QUIET_STARTS = ['20:00', '21:00', '22:00', '23:00'] as const;
const QUIET_ENDS = ['06:00', '07:00', '08:00', '09:00'] as const;

export default function Notifications() {
  const { theme } = useTheme();
  const { prefs, setPref } = usePreferences();
  const preview = notificationPreviews[prefs.notificationTone];

  return (
    <Screen safeTop={false} padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SettingGroup>
          <SettingRow
            icon="bell"
            title="Allow notifications"
            subtitle="AI-written reminders for your tasks"
            switchValue={prefs.notificationsEnabled}
            onSwitch={async (v) => {
              if (v && !(await requestNotificationPermission())) {
                setPref('notificationsEnabled', false);
                return;
              }
              setPref('notificationsEnabled', v);
            }}
            last
          />
        </SettingGroup>

        {prefs.notificationsEnabled ? (
          <>
            <AppText variant="micro" tone="tertiary" style={styles.groupTitle}>
              How it reads
            </AppText>
            {/* System-notification style preview */}
            <View
              style={[
                styles.previewCard,
                cardShadow(theme.dark),
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <View style={styles.previewHeader}>
                <LinearGradient
                  colors={[theme.colors.aiA, theme.colors.aiB]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.previewIcon}
                />
                <AppText variant="captionMedium" tone="secondary" style={styles.previewApp}>
                  {preview.title}
                </AppText>
                <AppText variant="caption" tone="tertiary">
                  now
                </AppText>
              </View>
              <AppText variant="bodyMedium">{preview.body}</AppText>
            </View>

            <View style={styles.tones}>
              {TONES.map((t) => (
                <Chip
                  key={t.value}
                  label={t.label}
                  selected={prefs.notificationTone === t.value}
                  onPress={() => setPref('notificationTone', t.value)}
                />
              ))}
            </View>
            <AppText variant="caption" tone="tertiary" style={styles.toneHint}>
              {TONES.find((t) => t.value === prefs.notificationTone)?.hint}
            </AppText>

            <AppText variant="micro" tone="tertiary" style={styles.groupTitle}>
              Remind me before
            </AppText>
            <View style={styles.tones}>
              {([10, 20, 30] as const).map((m) => (
                <Chip
                  key={m}
                  label={`${m} min`}
                  selected={prefs.remindBefore === m}
                  onPress={() => setPref('remindBefore', m)}
                />
              ))}
            </View>

            <AppText variant="micro" tone="tertiary" style={styles.sectionTitle}>
              Daily summary
            </AppText>
            <SettingGroup>
              <SettingRow
                icon="sunrise"
                title="Morning summary"
                subtitle="One AI recap of the day ahead"
                switchValue={prefs.dailySummary}
                onSwitch={(v) => setPref('dailySummary', v)}
                last
              />
            </SettingGroup>
            {prefs.dailySummary ? (
              <View style={styles.tones}>
                {SUMMARY_TIMES.map((t) => (
                  <Chip
                    key={t}
                    label={formatTime(t)}
                    selected={prefs.dailySummaryTime === t}
                    onPress={() => setPref('dailySummaryTime', t)}
                  />
                ))}
              </View>
            ) : null}

            <AppText variant="micro" tone="tertiary" style={styles.sectionTitle}>
              Quiet hours
            </AppText>
            <SettingGroup>
              <SettingRow
                icon="moon"
                title="Do not disturb"
                subtitle="Reminders due in this window are skipped"
                switchValue={prefs.quietHoursEnabled}
                onSwitch={(v) => setPref('quietHoursEnabled', v)}
                last
              />
            </SettingGroup>
            {prefs.quietHoursEnabled ? (
              <>
                <AppText variant="caption" tone="tertiary" style={styles.rangeLabel}>
                  From
                </AppText>
                <View style={styles.tones}>
                  {QUIET_STARTS.map((t) => (
                    <Chip
                      key={t}
                      label={formatTime(t)}
                      selected={prefs.quietStart === t}
                      onPress={() => setPref('quietStart', t)}
                    />
                  ))}
                </View>
                <AppText variant="caption" tone="tertiary" style={styles.rangeLabel}>
                  Until
                </AppText>
                <View style={styles.tones}>
                  {QUIET_ENDS.map((t) => (
                    <Chip
                      key={t}
                      label={formatTime(t)}
                      selected={prefs.quietEnd === t}
                      onPress={() => setPref('quietEnd', t)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            <AppText variant="caption" tone="tertiary" style={styles.deliveryNote}>
              Example only. Every reminder is freshly written by AI on the backend — at
              most three per task, and never once you have ticked it off.
            </AppText>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.space.xl },
  groupTitle: { marginBottom: layout.space.sm, marginLeft: 2 },
  sectionTitle: { marginTop: layout.space.xl, marginBottom: layout.space.sm, marginLeft: 2 },
  rangeLabel: { marginTop: layout.space.md, marginBottom: layout.space.sm, marginLeft: 2 },
  previewCard: {
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: layout.space.lg,
    marginBottom: layout.space.lg,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  previewIcon: { width: 16, height: 16, borderRadius: 4, marginRight: 8 },
  previewApp: { flex: 1 },
  tones: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.space.sm },
  toneHint: { marginTop: 10, marginLeft: 2, marginBottom: layout.space.xl },
  spacer: { height: layout.space.xl },
  deliveryNote: { marginTop: layout.space.xl },
});
