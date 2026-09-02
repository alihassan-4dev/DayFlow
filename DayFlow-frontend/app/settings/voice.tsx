import { Feather } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api/client';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { Screen } from '../../src/components/Screen';
import { SettingGroup, SettingRow } from '../../src/components/SettingRow';
import { DEVICE_VOICE, fallbackVoices, voiceSampleText } from '../../src/data/content';
import { VoiceOption, VoiceSpeed } from '../../src/data/types';
import {
  audioModeForPlayback,
  discardFile,
  saveBase64Audio,
  speakOnDevice,
  stopDeviceSpeech,
} from '../../src/services/voice';
import { usePreferences } from '../../src/state/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { cardShadow, layout } from '../../src/theme/themes';

const SPEEDS: { value: VoiceSpeed; label: string }[] = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'normal', label: 'Normal' },
  { value: 'brisk', label: 'Brisk' },
];

export default function Voice() {
  const { theme } = useTheme();
  const { prefs, setPref } = usePreferences();
  const router = useRouter();
  const player = useAudioPlayer(null);
  const [voices, setVoices] = useState<VoiceOption[]>(fallbackVoices);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const previewFile = useRef<string | null>(null);

  useEffect(() => {
    api
      .voices()
      .then((list) => {
        if (list.length) setVoices(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) {
        setPreviewing(null);
        void discardFile(previewFile.current);
        previewFile.current = null;
      }
    });
    return () => {
      sub.remove();
      void stopDeviceSpeech();
      void discardFile(previewFile.current);
    };
  }, [player]);

  const preview = async (voice: VoiceOption) => {
    Haptics.selectionAsync().catch(() => {});
    if (previewing) {
      try {
        player.pause();
      } catch {
        // not loaded
      }
      await stopDeviceSpeech();
      if (previewing === voice.id) {
        setPreviewing(null);
        return;
      }
    }
    setPreviewing(voice.id);
    await audioModeForPlayback();
    try {
      if (voice.id === DEVICE_VOICE.id) {
        await speakOnDevice(voiceSampleText, prefs.voiceSpeed);
        setPreviewing((v) => (v === voice.id ? null : v));
        return;
      }
      const b64 = await api.speak(voiceSampleText, voice.id, prefs.voiceSpeed);
      if (!b64) throw new Error('no audio');
      const file = await saveBase64Audio(b64);
      previewFile.current = file;
      player.replace({ uri: file });
      player.play();
    } catch {
      // Neural voice unavailable — let them hear the device fallback instead.
      await speakOnDevice(voiceSampleText, prefs.voiceSpeed);
      setPreviewing((v) => (v === voice.id ? null : v));
    }
  };

  const allVoices = [...voices, DEVICE_VOICE];

  return (
    <Screen safeTop={false} padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SettingGroup>
          <SettingRow
            icon="mic"
            title="Voice mode"
            subtitle="Talk to DayFlow like a phone call"
            switchValue={prefs.voiceEnabled}
            onSwitch={(v) => setPref('voiceEnabled', v)}
            last
          />
        </SettingGroup>

        {prefs.voiceEnabled ? (
          <>
            <Button
              label="Start voice mode"
              icon="mic"
              onPress={() => router.push('/voice')}
              style={styles.cta}
            />

            <SettingGroup title="Conversation">
              <SettingRow
                icon="volume-2"
                title="Spoken replies"
                subtitle="AI reads its answers out loud"
                switchValue={prefs.voiceReplies}
                onSwitch={(v) => setPref('voiceReplies', v)}
              />
              <SettingRow
                icon="repeat"
                title="Hands-free"
                subtitle="Keep listening after each reply"
                switchValue={prefs.voiceHandsFree}
                onSwitch={(v) => setPref('voiceHandsFree', v)}
              />
              <SettingRow
                icon="message-square"
                title="Captions"
                subtitle="Show what was said on screen"
                switchValue={prefs.voiceCaptions}
                onSwitch={(v) => setPref('voiceCaptions', v)}
                last
              />
            </SettingGroup>

            <AppText variant="micro" tone="tertiary" style={styles.groupTitle}>
              Voice
            </AppText>
            <View
              style={[
                styles.voiceCard,
                cardShadow(theme.dark),
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              {allVoices.map((voice, index) => {
                const selected = prefs.voiceId === voice.id;
                const isPreviewing = previewing === voice.id;
                return (
                  <Pressable
                    key={voice.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setPref('voiceId', voice.id);
                    }}
                    style={({ pressed }) => [
                      styles.voiceRow,
                      index < allVoices.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.colors.border,
                      },
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: selected ? theme.colors.accent : theme.colors.border,
                          backgroundColor: selected ? theme.colors.accent : 'transparent',
                        },
                      ]}
                    >
                      {selected ? <Feather name="check" size={12} color={theme.colors.onAccent} /> : null}
                    </View>
                    <View style={styles.voiceText}>
                      <AppText variant="bodyMedium">{voice.name}</AppText>
                      <AppText variant="caption" tone="tertiary">
                        {voice.style}
                      </AppText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={isPreviewing ? `Stop ${voice.name}` : `Preview ${voice.name}`}
                      onPress={() => void preview(voice)}
                      hitSlop={8}
                      style={[styles.playBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                    >
                      {isPreviewing && voice.id !== DEVICE_VOICE.id && !player.playing ? (
                        <ActivityIndicator size="small" color={theme.colors.accent} />
                      ) : (
                        <Feather
                          name={isPreviewing ? 'square' : 'play'}
                          size={14}
                          color={isPreviewing ? theme.colors.accent : theme.colors.textSecondary}
                        />
                      )}
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
            <AppText variant="caption" tone="tertiary" style={styles.hint}>
              Neural voices stream from DayFlow. Device voice works offline.
            </AppText>

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

            <AppText variant="caption" tone="tertiary" align="center" style={styles.footer}>
              Speech is transcribed by Whisper and never stored.
            </AppText>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.space.xl, paddingBottom: layout.space.xxl },
  cta: { marginBottom: layout.space.xl },
  groupTitle: { marginBottom: layout.space.sm, marginLeft: 2 },
  voiceCard: {
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: layout.space.lg,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  voiceText: { flex: 1 },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { marginTop: 8, marginLeft: 2, marginBottom: layout.space.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.space.sm },
  footer: { marginTop: layout.space.xxl },
});
