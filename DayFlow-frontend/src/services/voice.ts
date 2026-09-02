/**
 * Voice plumbing shared by voice mode and the voice settings screen.
 *
 * Recording  — expo-audio, mono AAC with metering on, so we can detect when
 *              the user stops talking.
 * Playback   — expo-audio player fed an MP3 the backend synthesised
 *              (Microsoft Edge neural voices, free), saved to the cache dir.
 * Fallback   — expo-speech, the device's own voice, when the backend has no
 *              audio for us (offline, or the "Device voice" preference).
 */
import {
  AudioModule,
  RecordingOptions,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { VoiceSpeed } from '../data/types';

export const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
  extension: '.m4a',
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 64000,
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    extension: '.m4a',
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
};

/** Voice-activity thresholds (levels are 0..1, see levelFromMetering). */
export const VAD = {
  /** Level that counts as speech */
  speech: 0.34,
  /** Below this is silence */
  silence: 0.2,
  /** Silence this long after speech ends the turn */
  trailingSilenceMs: 1150,
  /** Give up if nothing is said within this window */
  noSpeechMs: 7000,
  /** Hard cap on a single utterance */
  maxUtteranceMs: 30000,
  /** Poll interval for metering */
  tickMs: 80,
};

/** Map expo-audio metering (dBFS, ~-160..0) onto 0..1 for visuals + VAD. */
export function levelFromMetering(db: number | undefined | null): number {
  if (db == null || !Number.isFinite(db)) return 0;
  const floor = -52;
  const v = (db - floor) / -floor;
  return Math.min(1, Math.max(0, v));
}

export async function ensureMicPermission(): Promise<boolean> {
  try {
    const current = await AudioModule.getRecordingPermissionsAsync();
    if (current.granted) return true;
    return (await AudioModule.requestRecordingPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** iOS routes audio to the quiet earpiece while recording is allowed — so toggle. */
export async function audioModeForRecording(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    interruptionMode: 'doNotMix',
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  }).catch(() => {});
}

export async function audioModeForPlayback(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    interruptionMode: 'duckOthers',
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  }).catch(() => {});
}

let clipSeq = 0;

/** Persist base64 MP3 to the cache and return a playable URI. */
export async function saveBase64Audio(base64: string): Promise<string> {
  if (Platform.OS === 'web') return `data:audio/mpeg;base64,${base64}`;
  const dir = FileSystem.cacheDirectory ?? '';
  clipSeq += 1;
  const uri = `${dir}dayflow-reply-${Date.now()}-${clipSeq}.mp3`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}

export async function discardFile(uri: string | null | undefined): Promise<void> {
  if (!uri || Platform.OS === 'web' || uri.startsWith('data:')) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}

export function speechRate(speed: VoiceSpeed): number {
  return { relaxed: 0.88, normal: 1.0, brisk: 1.14 }[speed];
}

/** Speak with the device voice; resolves when finished (or stopped). */
export function speakOnDevice(text: string, speed: VoiceSpeed): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    try {
      Speech.speak(text, {
        rate: speechRate(speed),
        pitch: 1.0,
        onDone: done,
        onStopped: done,
        onError: done,
      });
    } catch {
      done();
    }
  });
}

export async function stopDeviceSpeech(): Promise<void> {
  await Speech.stop().catch(() => {});
}

/** Rough reading time, used to hold a caption on screen when replies are silent. */
export function readingTimeMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(9000, Math.max(1600, words * 320));
}
