export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  note?: string;
  /** 24h time, e.g. "07:30" */
  time: string;
  /** Due date as YYYY-MM-DD */
  dueDate: string;
  /** "today" or an upcoming day label like "Tomorrow", "Sat, Sep 5" — derived from dueDate */
  day: 'today' | string;
  priority: Priority;
  reminder: boolean;
  completed: boolean;
}

export type AIState = 'idle' | 'listening' | 'processing' | 'responding';

/** Phases of a hands-free voice conversation. */
export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  /** Optional action chip rendered under an AI message, e.g. "Task created" */
  action?: { icon: string; label: string };
  /** Set when the message came through voice mode */
  via?: 'voice';
}

export type NotificationTone = 'motivational' | 'friendly' | 'minimal';
export type AIPersonality = 'friendly' | 'focused' | 'coach';
export type VoiceSpeed = 'relaxed' | 'normal' | 'brisk';

export interface VoiceOption {
  id: string;
  name: string;
  style: string;
}

export interface Preferences {
  name: string;
  /** Account email, mirrored from the backend for display */
  email: string;
  notificationsEnabled: boolean;
  notificationTone: NotificationTone;
  remindBefore: 10 | 20 | 30;
  quietHoursEnabled: boolean;
  /** 24h "HH:MM" in the user's own timezone */
  quietStart: string;
  quietEnd: string;
  dailySummary: boolean;
  dailySummaryTime: string;
  aiPersonality: AIPersonality;
  aiSuggestions: boolean;
  aiAutoSchedule: boolean;
  voiceEnabled: boolean;
  voiceSpeed: VoiceSpeed;
  voiceReplies: boolean;
  /** Neural voice id from the backend catalogue, or "device" for on-device speech */
  voiceId: string;
  /** Keep listening after each reply, like a phone call */
  voiceHandsFree: boolean;
  /** Show live transcript + reply text in voice mode */
  voiceCaptions: boolean;
}
