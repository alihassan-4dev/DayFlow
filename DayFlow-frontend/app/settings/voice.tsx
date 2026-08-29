import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../../src/components/AppText';
import { Chip } from '../../src/components/Chip';
import { Screen } from '../../src/components/Screen';
import { SettingGroup, SettingRow } from '../../src/components/SettingRow';
import { VoiceSpeed } from '../../src/data/types';
import { usePreferences } from '../../src/state/PreferencesContext';
import { layout } from '../../src/theme/themes';

const SPEEDS: { value: VoiceSpeed; label: string }[] = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'normal', label: 'Normal' },
  { value: 'brisk', label: 'Brisk' },
];

export default function Voice() {
  const { prefs, setPref } = usePreferences();

  return (
    <Screen safeTop={false} padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SettingGroup>
          <SettingRow
            icon="mic"
            title="Voice input"
            subtitle="Talk to DayFlow instead of typing"
            switchValue={prefs.voiceEnabled}
            onSwitch={(v) => setPref('voiceEnabled', v)}
            last
          />
        </SettingGroup>

        {prefs.voiceEnabled ? (
          <>
            <SettingGroup>
              <SettingRow
                icon="volume-2"
                title="Spoken replies"
                subtitle="AI reads its answers out loud"
                switchValue={prefs.voiceReplies}
                onSwitch={(v) => setPref('voiceReplies', v)}
              />
              <SettingRow icon="globe" title="Language" value="English (US)" onPress={() => {}} last />
            </SettingGroup>

            <AppText variant="micro" tone="tertiary" style={styles.groupTitle}>
              Speaking pace
            </AppText>
            <View style={styles.chips}>
              {SPEEDS.map((s) => (
                <Chip
                  key={s.value}
                  label={s.label}
                  selected={prefs.voiceSpeed === s.value}
                  onPress={() => setPref('voiceSpeed', s.value)}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.space.xl },
  groupTitle: { marginBottom: layout.space.sm, marginLeft: layout.space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.space.sm },
});
