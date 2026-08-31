import { NotificationTone, Preferences } from './types';

export const defaultPreferences: Preferences = {
  name: 'there',
  notificationsEnabled: true,
  notificationTone: 'motivational',
  remindBefore: 20,
  dailySummary: true,
  aiPersonality: 'friendly',
  aiSuggestions: true,
  aiAutoSchedule: false,
  voiceEnabled: true,
  voiceSpeed: 'normal',
  voiceReplies: true,
};

export const aiSuggestionChips = [
  'What’s left today?',
  'Plan my afternoon',
  'Move my next task an hour later',
  'Add “Stretch” at 9pm',
];

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
