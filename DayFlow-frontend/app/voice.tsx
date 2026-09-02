import { Feather } from '@expo/vector-icons';
import { useAudioPlayer, useAudioRecorder } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, api } from '../src/api/client';
import { VoiceOrb } from '../src/components/ai/VoiceOrb';
import { AppText } from '../src/components/AppText';
import { Button } from '../src/components/Button';
import { VoicePhase } from '../src/data/types';
import {
  RECORDING_OPTIONS,
  VAD,
  audioModeForPlayback,
  audioModeForRecording,
  discardFile,
  ensureMicPermission,
  levelFromMetering,
  readingTimeMs,
  saveBase64Audio,
  speakOnDevice,
  stopDeviceSpeech,
} from '../src/services/voice';
import { newMessageId, useChat } from '../src/state/ChatContext';
import { usePreferences } from '../src/state/PreferencesContext';
import { useTasks } from '../src/state/TasksContext';
import { useTheme } from '../src/theme/ThemeContext';
import { layout } from '../src/theme/themes';

const STATUS: Record<VoicePhase, string> = {
  idle: 'Tap to talk',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  error: 'Paused',
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Voice mode — a hands-free conversation with the assistant.
 *
 * listen (auto-stops when you go quiet) → think → speak → listen again.
 * Tap the orb to send early, to interrupt a reply, or to start over.
 * Everything said lands in the regular chat so you can keep going by text.
 */
export default function VoiceMode() {
  useKeepAwake();
  const { theme } = useTheme();
  const { prefs, setPref } = usePreferences();
  const { append, history } = useChat();
  const { refresh } = useTasks();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const player = useAudioPlayer(null, { updateInterval: 120 });

  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [hint, setHint] = useState('');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [micDenied, setMicDenied] = useState(false);
  const level = useRef(new Animated.Value(0)).current;

  // Refs so async work never acts on a stale phase.
  const phaseRef = useRef<VoicePhase>('idle');
  const alive = useRef(true);
  const turn = useRef(0);
  const meter = useRef<ReturnType<typeof setInterval> | null>(null);
  const emptyTurns = useRef(0);
  const playbackDone = useRef<(() => void) | null>(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const go = useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const stopMeter = useCallback(() => {
    if (meter.current) clearInterval(meter.current);
    meter.current = null;
    Animated.timing(level, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }, [level]);

  // Resolve the pending playback promise when the clip ends.
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) playbackDone.current?.();
    });
    return () => sub.remove();
  }, [player]);

  const silenceAll = useCallback(async () => {
    stopMeter();
    playbackDone.current?.();
    playbackDone.current = null;
    try {
      player.pause();
    } catch {
      // player may not be loaded
    }
    await stopDeviceSpeech();
    try {
      if (recorder.isRecording) await recorder.stop();
    } catch {
      // not recording
    }
  }, [player, recorder, stopMeter]);

  // --- The loop --------------------------------------------------------------

  const afterReply = useCallback(
    (id: number) => {
      if (id !== turn.current || !alive.current) return;
      if (prefsRef.current.voiceHandsFree) {
        void startListening();
      } else {
        go('idle');
        setHint('Tap the orb to talk');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [go]
  );

  const speakReply = useCallback(
    async (id: number, text: string, base64: string | null) => {
      go('speaking');
      setHint('');
      const p = prefsRef.current;
      if (base64) {
        let file: string | null = null;
        try {
          file = await saveBase64Audio(base64);
          if (id !== turn.current) return;
          await new Promise<void>((resolve) => {
            playbackDone.current = resolve;
            player.replace({ uri: file as string });
            player.play();
            // Safety net if the finish event never arrives.
            setTimeout(resolve, 90_000);
          });
        } catch {
          if (id === turn.current && p.voiceReplies) await speakOnDevice(text, p.voiceSpeed);
        } finally {
          playbackDone.current = null;
          void discardFile(file);
        }
      } else if (p.voiceReplies) {
        await speakOnDevice(text, p.voiceSpeed);
      } else {
        await wait(readingTimeMs(text));
      }
      afterReply(id);
    },
    [afterReply, go, player]
  );

  const finishListening = useCallback(
    async (id: number, hasSpeech: boolean) => {
      stopMeter();
      if (id !== turn.current) return;
      go('thinking');
      setHint(hasSpeech ? 'Thinking…' : '');

      let uri: string | null = null;
      try {
        await recorder.stop();
        uri = recorder.uri;
      } catch {
        uri = null;
      }
      await audioModeForPlayback();
      if (id !== turn.current) return;

      const relistenOrIdle = (message: string) => {
        emptyTurns.current += 1;
        setHint(message);
        if (prefsRef.current.voiceHandsFree && emptyTurns.current < 2) {
          go('idle');
          setTimeout(() => {
            if (id === turn.current) void startListening();
          }, 700);
        } else {
          go('idle');
          setHint(`${message} Tap the orb when you’re ready.`);
        }
      };

      if (!hasSpeech || !uri) {
        relistenOrIdle('I didn’t hear anything.');
        return;
      }

      const p = prefsRef.current;
      try {
        const res = await api.voiceTurn({
          uri,
          history: history(),
          personality: p.aiPersonality,
          voice: p.voiceReplies ? p.voiceId : 'device',
          speed: p.voiceSpeed,
        });
        if (id !== turn.current) return;
        if (!res.transcript.trim()) {
          relistenOrIdle('I didn’t catch that.');
          return;
        }
        emptyTurns.current = 0;
        setTranscript(res.transcript);
        append({ id: newMessageId(), role: 'user', text: res.transcript, via: 'voice' });

        const text = res.reply.trim() || 'Sorry, I lost my train of thought. Say that again?';
        setReply(text);
        append({ id: newMessageId(), role: 'ai', text, action: res.action ?? undefined });
        if (res.tasks_changed) void refresh();
        if (res.action) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        await speakReply(id, text, res.audio_base64);
      } catch (e) {
        if (id !== turn.current) return;
        go('error');
        setHint(
          e instanceof ApiError && e.status !== 0
            ? `${e.message} Tap the orb to try again.`
            : 'Couldn’t reach DayFlow. Tap the orb to try again.'
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [append, go, history, recorder, refresh, speakReply, stopMeter]
  );

  const startListening = useCallback(async () => {
    if (!alive.current) return;
    const id = ++turn.current;
    setTranscript('');
    setReply('');
    setHint('');
    await audioModeForRecording();
    try {
      // The hook may already have prepared the recorder on mount; re-preparing
      // an armed recorder throws on Android, so only insist when it can't record.
      try {
        await recorder.prepareToRecordAsync();
      } catch (e) {
        if (!recorder.getStatus().canRecord) throw e;
      }
      recorder.record();
    } catch {
      if (id !== turn.current) return;
      go('error');
      setHint('Couldn’t start the microphone. Tap the orb to retry.');
      return;
    }
    if (id !== turn.current) {
      await recorder.stop().catch(() => {});
      return;
    }
    go('listening');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const startedAt = Date.now();
    let speechAt = 0;
    let quietSince = 0;
    let metered = false;

    meter.current = setInterval(() => {
      if (id !== turn.current) {
        stopMeter();
        return;
      }
      let status: { metering?: number } = {};
      try {
        status = recorder.getStatus();
      } catch {
        // recorder torn down
      }
      const now = Date.now();
      const elapsed = now - startedAt;
      if (status.metering == null) {
        // No metering on this platform (web) — user taps to send.
        if (!metered && elapsed > 600) setHint('Tap the orb when you’re done');
        if (elapsed >= VAD.maxUtteranceMs) void finishListening(id, true);
        return;
      }
      metered = true;
      const lvl = levelFromMetering(status.metering);
      Animated.timing(level, { toValue: lvl, duration: VAD.tickMs, useNativeDriver: true }).start();

      if (lvl >= VAD.speech) {
        speechAt = speechAt || now;
        quietSince = 0;
      } else if (speechAt && lvl < VAD.silence) {
        quietSince = quietSince || now;
      } else if (speechAt) {
        quietSince = 0;
      }

      if (speechAt && quietSince && now - quietSince >= VAD.trailingSilenceMs) {
        void finishListening(id, true);
      } else if (!speechAt && elapsed >= VAD.noSpeechMs) {
        void finishListening(id, false);
      } else if (elapsed >= VAD.maxUtteranceMs) {
        void finishListening(id, true);
      }
    }, VAD.tickMs);
  }, [finishListening, go, level, recorder, stopMeter]);

  const onOrbPress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const current = phaseRef.current;
    if (current === 'listening') {
      void finishListening(turn.current, true);
    } else if (current === 'speaking') {
      turn.current += 1;
      await silenceAll();
      void startListening();
    } else if (current === 'idle' || current === 'error') {
      if (micDenied) {
        const ok = await ensureMicPermission();
        if (!ok) {
          Linking.openSettings().catch(() => {});
          return;
        }
        setMicDenied(false);
      }
      emptyTurns.current = 0;
      void startListening();
    }
  }, [finishListening, micDenied, silenceAll, startListening]);

  const end = useCallback(async () => {
    alive.current = false;
    turn.current += 1;
    await silenceAll();
    await audioModeForPlayback();
    router.back();
  }, [router, silenceAll]);

  // Open straight into listening, like picking up a call.
  useEffect(() => {
    alive.current = true;
    (async () => {
      const ok = await ensureMicPermission();
      if (!alive.current) return;
      if (!ok) {
        setMicDenied(true);
        go('error');
        setHint('Microphone access is off. Tap the orb to enable it in Settings.');
        return;
      }
      void startListening();
    })();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && alive.current) {
        turn.current += 1;
        void silenceAll();
        go('idle');
        setHint('Tap the orb to continue');
      }
    });
    return () => {
      alive.current = false;
      turn.current += 1;
      sub.remove();
      void silenceAll();
      void audioModeForPlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dotColor = {
    idle: theme.colors.textTertiary,
    listening: theme.colors.aiA,
    thinking: theme.colors.warning,
    speaking: theme.colors.aiB,
    error: theme.colors.danger,
  }[phase];

  const showCaptions = prefs.voiceCaptions;
  const iconBtn = (
    name: keyof typeof Feather.glyphMap,
    label: string,
    onPress: () => void,
    opts: { active?: boolean; danger?: boolean } = {}
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ctrl,
        {
          backgroundColor: opts.danger
            ? theme.colors.danger
            : opts.active
              ? theme.colors.accentSoft
              : theme.colors.surface,
          borderColor: opts.danger ? theme.colors.danger : theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Feather
        name={name}
        size={20}
        color={opts.danger ? '#FFFFFF' : opts.active ? theme.colors.accent : theme.colors.textSecondary}
      />
    </Pressable>
  );

  return (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.surface]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.flex, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, layout.space.lg) }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <AppText variant="title">Voice</AppText>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <AppText variant="caption" tone="tertiary">
              {STATUS[phase]}
              {prefs.voiceHandsFree ? ' · hands-free' : ''}
            </AppText>
          </View>
        </View>
        {iconBtn(
          showCaptions ? 'message-square' : 'eye-off',
          showCaptions ? 'Hide captions' : 'Show captions',
          () => setPref('voiceCaptions', !showCaptions),
          { active: showCaptions }
        )}
      </View>

      {/* Orb */}
      <View style={styles.stage}>
        <VoiceOrb phase={phase} level={level} onPress={onOrbPress} />
      </View>

      {/* Captions */}
      <View style={styles.captions}>
        {hint ? (
          <AppText variant="caption" tone="tertiary" align="center">
            {hint}
          </AppText>
        ) : null}
        {showCaptions && transcript ? (
          <AppText variant="caption" tone="tertiary" align="center" style={styles.transcript} numberOfLines={3}>
            “{transcript}”
          </AppText>
        ) : null}
        {showCaptions && reply ? (
          <AppText variant="bodyMedium" align="center" style={styles.reply} numberOfLines={6}>
            {reply}
          </AppText>
        ) : null}
        {micDenied ? (
          <Button
            label="Open Settings"
            variant="secondary"
            full={false}
            onPress={() => Linking.openSettings().catch(() => {})}
            style={styles.settingsBtn}
          />
        ) : null}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {iconBtn('type', 'Back to chat', () => void end())}
        {iconBtn(
          'repeat',
          prefs.voiceHandsFree ? 'Turn hands-free off' : 'Turn hands-free on',
          () => {
            Haptics.selectionAsync().catch(() => {});
            setPref('voiceHandsFree', !prefs.voiceHandsFree);
          },
          { active: prefs.voiceHandsFree }
        )}
        {iconBtn('x', 'End voice mode', () => void end(), { danger: true })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.space.xl,
    paddingTop: layout.space.lg,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  captions: {
    minHeight: 150,
    paddingHorizontal: layout.space.xxl,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  transcript: { fontStyle: 'italic' },
  reply: { lineHeight: 23 },
  settingsBtn: { marginTop: 6 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: layout.space.xl,
    paddingVertical: layout.space.xl,
  },
  ctrl: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
