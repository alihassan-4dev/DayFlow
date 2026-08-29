import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AIOrb } from '../../src/components/ai/AIOrb';
import { AppText } from '../../src/components/AppText';
import { Chip } from '../../src/components/Chip';
import { Screen } from '../../src/components/Screen';
import { SettingGroup, SettingRow } from '../../src/components/SettingRow';
import { AIPersonality } from '../../src/data/types';
import { usePreferences } from '../../src/state/PreferencesContext';
import { layout } from '../../src/theme/themes';

const PERSONALITIES: { value: AIPersonality; label: string; hint: string }[] = [
  { value: 'friendly', label: 'Friendly', hint: 'Warm and encouraging, like a helpful friend' },
  { value: 'focused', label: 'Focused', hint: 'Brief and to the point — no small talk' },
  { value: 'coach', label: 'Coach', hint: 'Pushes you to finish what matters' },
];

export default function AIPreferences() {
  const { prefs, setPref } = usePreferences();

  return (
    <Screen safeTop={false} padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.orbWrap}>
          <AIOrb state="idle" size={64} />
          <AppText variant="caption" tone="secondary" align="center" style={styles.intro}>
            Shape how your assistant thinks, talks, and helps.
          </AppText>
        </View>

        <AppText variant="micro" tone="tertiary" style={styles.groupTitle}>
          Personality
        </AppText>
        <View style={styles.chips}>
          {PERSONALITIES.map((p) => (
            <Chip
              key={p.value}
              label={p.label}
              selected={prefs.aiPersonality === p.value}
              onPress={() => setPref('aiPersonality', p.value)}
            />
          ))}
        </View>
        <AppText variant="caption" tone="tertiary" style={styles.hint}>
          {PERSONALITIES.find((p) => p.value === prefs.aiPersonality)?.hint}
        </AppText>

        <SettingGroup title="Behavior">
          <SettingRow
            icon="zap"
            title="Smart suggestions"
            subtitle="Let AI suggest what to do next"
            switchValue={prefs.aiSuggestions}
            onSwitch={(v) => setPref('aiSuggestions', v)}
          />
          <SettingRow
            icon="calendar"
            title="Auto-schedule"
            subtitle="Let AI pick the best time for new tasks"
            switchValue={prefs.aiAutoSchedule}
            onSwitch={(v) => setPref('aiAutoSchedule', v)}
            last
          />
        </SettingGroup>

        <AppText variant="caption" tone="tertiary" align="center">
          DayFlow AI only works with your tasks. Your data stays yours.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.space.xl },
  orbWrap: { alignItems: 'center', marginBottom: layout.space.sm },
  intro: { marginTop: -6, maxWidth: 260 },
  groupTitle: { marginTop: layout.space.xl, marginBottom: layout.space.sm, marginLeft: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.space.sm },
  hint: { marginTop: 10, marginLeft: 2, marginBottom: layout.space.xl },
});
