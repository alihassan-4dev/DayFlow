import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  AIPersonality,
  ChatMessage,
  NotificationTone,
  Priority,
  Task,
  VoiceOption,
  VoiceSpeed,
} from '../data/types';

const TOKEN_KEY = 'dayflow.token';

/**
 * Resolve the API base URL:
 *  1. EXPO_PUBLIC_API_URL if set (e.g. a deployed backend)
 *  2. the Expo dev server's host with port 8000 — so a phone running Expo Go
 *     reaches the backend on your machine with zero config
 *  3. localhost as the last resort (web)
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:8000`;
  return __DEV__ ? 'http://localhost:8000' : '';
}

export const API_URL = resolveBaseUrl();

let authToken: string | null = null;

export async function loadToken(): Promise<string | null> {
  if (authToken) return authToken;
  try {
    authToken = await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    authToken = null;
  }
  return authToken;
}

async function setToken(token: string | null): Promise<void> {
  authToken = token;
  try {
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // best effort
  }
}

/** Thrown for HTTP errors so callers can show the server's message. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function throwForStatus(res: Response): Promise<never> {
  let detail = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') detail = body.detail;
  } catch {
    // keep default message
  }
  throw new ApiError(res.status, detail);
}

function assertConfigured(): void {
  if (!API_URL) {
    throw new ApiError(0, 'DayFlow API is not configured. Set EXPO_PUBLIC_API_URL for this build.');
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  assertConfigured();
  const token = await loadToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) await throwForStatus(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Multipart upload — lets fetch set the boundary itself. */
async function upload<T>(path: string, form: FormData): Promise<T> {
  assertConfigured();
  const token = await loadToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) await throwForStatus(res);
  return res.json() as Promise<T>;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => {
      const dataUrl = String(reader.result ?? '');
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

// --- Task shape mapping ------------------------------------------------------

interface ServerTask {
  id: number;
  title: string;
  note: string | null;
  due_date: string; // YYYY-MM-DD
  time: string;
  priority: Priority;
  reminder: boolean;
  completed: boolean;
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isoToday(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toIsoDate(d);
}

export function dateToDayLabel(dueDate: string): Task['day'] {
  if (dueDate === isoToday()) return 'today';
  if (dueDate === isoToday(1)) return 'Tomorrow';
  const [y, m, d] = dueDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function dayLabelToDate(day: Task['day']): string {
  if (day === 'today') return isoToday();
  if (day === 'Tomorrow') return isoToday(1);
  // Parse labels like "Sat, Sep 5" produced by dateToDayLabel; assume the
  // next occurrence of that date (this year, or next if already past).
  const parsed = new Date(`${day} ${new Date().getFullYear()}`);
  if (Number.isNaN(parsed.getTime())) return isoToday(1);
  if (parsed.getTime() < Date.now() - 24 * 3600 * 1000) {
    parsed.setFullYear(parsed.getFullYear() + 1);
  }
  return toIsoDate(parsed);
}

function toClientTask(t: ServerTask): Task {
  return {
    id: String(t.id),
    title: t.title,
    note: t.note ?? undefined,
    time: t.time,
    dueDate: t.due_date,
    day: dateToDayLabel(t.due_date),
    priority: t.priority,
    reminder: t.reminder,
    completed: t.completed,
  };
}

// --- Endpoints ---------------------------------------------------------------

export interface AuthUser {
  id: number;
  email: string;
  name: string;
}

export interface ChatResult {
  reply: string;
  action: { icon: string; label: string } | null;
  tasks_changed: boolean;
}

export interface VoiceTurnResult extends ChatResult {
  transcript: string;
  audio_base64: string | null;
  audio_mime: string;
}

export interface VoiceTurnInput {
  /** Local file URI (native) or blob URL (web) of the recording */
  uri: string;
  history: Pick<ChatMessage, 'role' | 'text'>[];
  personality: AIPersonality;
  /** Backend voice id; omit or pass "device" to skip server-side speech */
  voice?: string;
  speed: VoiceSpeed;
}

export const api = {
  async signup(name: string, email: string, password: string): Promise<AuthUser> {
    const res = await request<{ access_token: string; user: AuthUser }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    await setToken(res.access_token);
    return res.user;
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const res = await request<{ access_token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setToken(res.access_token);
    return res.user;
  },

  async forgotPassword(email: string): Promise<void> {
    await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async me(): Promise<AuthUser> {
    return request<AuthUser>('/auth/me');
  },

  async signOut(): Promise<void> {
    await setToken(null);
  },

  async hasSession(): Promise<boolean> {
    return (await loadToken()) != null;
  },

  async registerPushDevice(
    token: string,
    platform: 'android' | 'ios',
    timezone: string
  ): Promise<void> {
    await request('/notifications/devices', {
      method: 'POST',
      body: JSON.stringify({ token, platform, timezone }),
    });
  },

  async unregisterPushDevice(token: string): Promise<void> {
    await request('/notifications/devices', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    });
  },

  async updateNotificationPreferences(value: {
    enabled: boolean;
    tone: NotificationTone;
    remind_before: 10 | 20 | 30;
    timezone: string;
    quiet_hours_enabled: boolean;
    quiet_start: string;
    quiet_end: string;
    daily_summary_enabled: boolean;
    daily_summary_time: string;
  }): Promise<void> {
    await request('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(value),
    });
  },

  async listTasks(): Promise<Task[]> {
    const rows = await request<ServerTask[]>('/tasks');
    return rows.map(toClientTask);
  },

  async createTask(task: Omit<Task, 'id' | 'completed'>): Promise<Task> {
    const created = await request<ServerTask>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: task.title,
        note: task.note ?? null,
        due_date: task.dueDate || dayLabelToDate(task.day),
        time: task.time,
        priority: task.priority,
        reminder: task.reminder,
      }),
    });
    return toClientTask(created);
  },

  async updateTask(id: string, patch: Partial<Task>): Promise<Task> {
    const body: Record<string, unknown> = {};
    if (patch.title !== undefined) body.title = patch.title;
    if (patch.note !== undefined) body.note = patch.note ?? null;
    if (patch.dueDate !== undefined) body.due_date = patch.dueDate;
    else if (patch.day !== undefined) body.due_date = dayLabelToDate(patch.day);
    if (patch.time !== undefined) body.time = patch.time;
    if (patch.priority !== undefined) body.priority = patch.priority;
    if (patch.reminder !== undefined) body.reminder = patch.reminder;
    if (patch.completed !== undefined) body.completed = patch.completed;
    const updated = await request<ServerTask>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return toClientTask(updated);
  },

  async deleteTask(id: string): Promise<void> {
    await request(`/tasks/${id}`, { method: 'DELETE' });
  },

  async chat(
    message: string,
    history: Pick<ChatMessage, 'role' | 'text'>[],
    options: { personality?: AIPersonality; voice?: boolean } = {}
  ): Promise<ChatResult> {
    return request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        history,
        personality: options.personality ?? 'friendly',
        voice: options.voice ?? false,
      }),
    });
  },

  /** One spoken turn: upload the clip, get transcript + reply (+ MP3) back. */
  async voiceTurn(input: VoiceTurnInput): Promise<VoiceTurnResult> {
    const form = new FormData();
    if (Platform.OS === 'web') {
      const blob = await (await fetch(input.uri)).blob();
      form.append('audio', blob, 'speech.webm');
    } else {
      const name = input.uri.split('/').pop() || 'speech.m4a';
      const ext = name.split('.').pop()?.toLowerCase() ?? 'm4a';
      form.append('audio', {
        uri: input.uri,
        name,
        type: ext === '3gp' ? 'audio/3gpp' : `audio/${ext}`,
      } as unknown as Blob);
    }
    form.append('history', JSON.stringify(input.history.slice(-10)));
    form.append('personality', input.personality);
    form.append('speed', input.speed);
    const serverVoice = input.voice && input.voice !== 'device';
    form.append('speak', serverVoice ? 'true' : 'false');
    if (serverVoice) form.append('voice', input.voice as string);
    return upload<VoiceTurnResult>('/ai/voice', form);
  },

  async voices(): Promise<VoiceOption[]> {
    return request<VoiceOption[]>('/ai/voices');
  },

  /** Base64 MP3 for `text`, or null when the server has no voice available. */
  async speak(text: string, voice: string, speed: VoiceSpeed): Promise<string | null> {
    assertConfigured();
    const token = await loadToken();
    const res = await fetch(`${API_URL}/ai/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text, voice, speed }),
    });
    if (!res.ok) await throwForStatus(res);
    if (res.status === 204) return null;
    return blobToBase64(await res.blob());
  },
};
