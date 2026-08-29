import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from '../src/components/AppText';
import { Button } from '../src/components/Button';
import { Chip } from '../src/components/Chip';
import { Screen } from '../src/components/Screen';
import { TextField } from '../src/components/TextField';
import { notificationPreviews } from '../src/data/mock';
import { NotificationTone } from '../src/data/types';
import { usePreferences } from '../src/state/PreferencesContext';
import { useTheme } from '../src/theme/ThemeContext';
import { layout } from '../src/theme/themes';

const RHYTHMS = ['Early bird', 'Steady daytime', 'Night owl'];
const FOCUS_AREAS = ['Work', 'Health', 'Study', 'Home', 'Personal projects'];
const TONES: { value: NotificationTone; label: string }[] = [
  { value: 'motivational', label: 'Motivational' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'minimal', label: 'Minimal' },
];

export default function Onboarding() {
  const { theme } = useTheme();
  const { prefs, setPref } = usePreferences();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(prefs.name);
  const [rhythm, setRhythm] = useState(RHYTHMS[1]);
  const [areas, setAreas] = useState<string[]>(['Work']);
  const [tone, setTone] = useState<NotificationTone>('motivational');
  const [finishing, setFinishing] = useState(false);

  const toggleArea = (area: string) =>
    setAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );

  const finish = () => {
    setPref('name', name.trim() || 'there');
    setPref('notificationTone', tone);
    setFinishing(true);
    setTimeout(() => router.replace('/(main)/tasks'), 1400);
  };

  if (finishing) {
    return (
      <Screen>
        <View style={styles.finishWrap}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <AppText variant="headline" align="center" style={styles.finishTitle}>
            Shaping your day…
          </AppText>
          <AppText variant="body" tone="tertiary" align="center">
            DayFlow is setting things up for you.
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen keyboardAvoiding safeBottom>
      {/* Step indicator */}
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i <= step ? theme.colors.accent : theme.colors.border,
                width: i === step ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.body}>
        {step === 0 ? (
          <>
            <AppText variant="display" style={styles.title}>
              First things first
            </AppText>
            <AppText variant="body" tone="secondary" style={styles.subtitle}>
              What should DayFlow call you?
            </AppText>
            <TextField
              placeholder="Your name"
              icon="user"
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <AppText variant="display" style={styles.title}>
              Your rhythm
            </AppText>
            <AppText variant="body" tone="secondary" style={styles.subtitle}>
              When does your day usually happen? This helps DayFlow suggest better times.
            </AppText>
            <View style={styles.chipRow}>
              {RHYTHMS.map((r) => (
                <Chip key={r} label={r} selected={rhythm === r} onPress={() => setRhythm(r)} style={styles.chip} />
              ))}
            </View>
            <AppText variant="micro" tone="tertiary" style={styles.sectionLabel}>
              What do you mostly plan?
            </AppText>
            <View style={styles.chipRow}>
              {FOCUS_AREAS.map((a) => (
                <Chip key={a} label={a} selected={areas.includes(a)} onPress={() => toggleArea(a)} style={styles.chip} />
              ))}
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <AppText variant="display" style={styles.title}>
              How should reminders feel?
            </AppText>
            <AppText variant="body" tone="secondary" style={styles.subtitle}>
              DayFlow writes reminders like a helpful human, not a robot.
            </AppText>
            <View style={styles.chipRow}>
              {TONES.map((t) => (
                <Chip key={t.value} label={t.label} selected={tone === t.value} onPress={() => setTone(t.value)} style={styles.chip} />
              ))}
            </View>
            <View
              style={[
                styles.preview,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <AppText variant="micro" tone="tertiary" style={styles.previewLabel}>
                Preview
              </AppText>
              <AppText variant="bodyMedium">{notificationPreviews[tone].body}</AppText>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button
          label={step === 2 ? 'Start my day' : 'Continue'}
          onPress={() => (step === 2 ? finish() : setStep((s) => s + 1))}
        />
        {step > 0 ? (
          <Button label="Back" variant="ghost" onPress={() => setStep((s) => s - 1)} style={styles.backBtn} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', marginTop: layout.space.xl, marginBottom: layout.space.xxl },
  dot: { height: 8, borderRadius: 4, marginRight: 6 },
  body: { flex: 1 },
  title: { marginBottom: layout.space.sm },
  subtitle: { marginBottom: layout.space.xl },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.space.sm },
  chip: { marginBottom: layout.space.xs },
  sectionLabel: { marginTop: layout.space.xl, marginBottom: layout.space.md },
  preview: {
    marginTop: layout.space.xl,
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: layout.space.lg,
  },
  previewLabel: { marginBottom: layout.space.sm },
  footer: { paddingBottom: layout.space.lg },
  backBtn: { marginTop: layout.space.sm },
  finishWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  finishTitle: { marginTop: layout.space.xl, marginBottom: layout.space.sm },
});
