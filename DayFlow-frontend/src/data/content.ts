import { NotificationTone, Preferences, VoiceOption } from './types';

export const defaultPreferences: Preferences = {
  name: 'there',
  email: '',
  notificationsEnabled: true,
  notificationTone: 'motivational',
  remindBefore: 20,
  quietHoursEnabled: true,
  quietStart: '22:00',
  quietEnd: '07:00',
  dailySummary: true,
  dailySummaryTime: '08:00',
  aiPersonality: 'friendly',
  aiSuggestions: true,
  aiAutoSchedule: false,
  voiceEnabled: true,
  voiceSpeed: 'normal',
  voiceReplies: true,
  voiceId: 'ava',
  voiceHandsFree: true,
  voiceCaptions: true,
};

export const aiSuggestionChips = [
  'What’s left today?',
  'Plan my afternoon',
  'Move my next task an hour later',
  'Add “Stretch” at 9pm',
];

/** On-device speech — works offline, no backend round trip for audio. */
export const DEVICE_VOICE: VoiceOption = {
  id: 'device',
  name: 'Device voice',
  style: 'Offline · fastest',
};

/** Mirrors the backend catalogue; used until /ai/voices answers (or offline). */
export const fallbackVoices: VoiceOption[] = [
  { id: 'ava', name: 'Ava', style: 'Warm · US' },
  { id: 'andrew', name: 'Andrew', style: 'Calm · US' },
  { id: 'emma', name: 'Emma', style: 'Bright · US' },
  { id: 'brian', name: 'Brian', style: 'Friendly · US' },
  { id: 'sonia', name: 'Sonia', style: 'Crisp · UK' },
  { id: 'ryan', name: 'Ryan', style: 'Deep · UK' },
  { id: 'natasha', name: 'Natasha', style: 'Easy · AU' },
  { id: 'neerja', name: 'Neerja', style: 'Soft · IN' },
];

export const voiceSampleText =
  'Hi, I’m DayFlow. Tell me what needs doing and I’ll fit it into your day.';

export const links = {
  repo: 'https://github.com/alihassan-4dev/DayFlow',
  license: 'https://github.com/alihassan-4dev/DayFlow/blob/master/LICENSE',
  issues: 'https://github.com/alihassan-4dev/DayFlow/issues',
};

export const notificationPreviews: Record<NotificationTone, { title: string; body: string }> = {
  motivational: {
    title: 'DayFlow',
    body: 'Your workout is waiting 💪 Let’s get it done.',
  },
  friendly: {
    title: 'DayFlow',
    body: 'Quick reminder 👀 “Design review” starts in 20 minutes.',
  },
  minimal: {
    title: 'DayFlow',
    body: 'Design review · 10:30 AM',
  },
};
