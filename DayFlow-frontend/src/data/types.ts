export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  note?: string;
  /** 24h time, e.g. "07:30" */
  time: string;
  /** "today" or an upcoming day label like "Tomorrow", "Sat, Sep 5" */
  day: 'today' | string;
  priority: Priority;
  reminder: boolean;
  completed: boolean;
}

export type AIState = 'idle' | 'listening' | 'processing' | 'responding';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  /** Optional action chip rendered under an AI message, e.g. "Task created" */
  action?: { icon: string; label: string };
}

export type NotificationTone = 'motivational' | 'friendly' | 'minimal';
export type AIPersonality = 'friendly' | 'focused' | 'coach';
export type VoiceSpeed = 'relaxed' | 'normal' | 'brisk';

export interface Preferences {
  name: string;
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
}
