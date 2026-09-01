import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../api/client';
import { Preferences } from '../data/types';

const PUSH_TOKEN_KEY = 'dayflow.expoPushToken';
const CHANNEL_ID = 'task-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'AI task reminders',
    description: 'Personal task reminders written by DayFlow AI',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    sound: 'default',
  });
}

function timezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/** The wire shape the backend scheduler reads when deciding what to send. */
function preferencesPayload(prefs: Preferences, enabled: boolean) {
  return {
    enabled,
    tone: prefs.notificationTone,
    remind_before: prefs.remindBefore,
    timezone: timezone(),
    quiet_hours_enabled: prefs.quietHoursEnabled,
    quiet_start: prefs.quietStart,
    quiet_end: prefs.quietEnd,
    daily_summary_enabled: prefs.dailySummary,
    daily_summary_time: prefs.dailySummaryTime,
  };
}

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    await ensureAndroidChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Register this installation with Expo and the DayFlow backend. */
export async function registerPushNotifications(prefs: Preferences): Promise<boolean> {
  if (!prefs.notificationsEnabled || !(await api.hasSession())) return false;
  const id = projectId();
  if (!id || !(await requestNotificationPermission())) return false;

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    await api.registerPushDevice(token, Platform.OS === 'ios' ? 'ios' : 'android', timezone());
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    await api.updateNotificationPreferences(preferencesPayload(prefs, true));
    return true;
  } catch {
    // A real development/production build and Firebase credentials are required.
    return false;
  }
}

/** Keep backend timing/tone current. Disabling also deactivates this device token. */
export async function syncPushPreferences(prefs: Preferences): Promise<boolean> {
  if (!(await api.hasSession())) return false;
  if (prefs.notificationsEnabled) return registerPushNotifications(prefs);

  try {
    await api.updateNotificationPreferences(preferencesPayload(prefs, false));
    await unregisterPushNotifications();
    return true;
  } catch {
    return false;
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (token && (await api.hasSession())) {
    try {
      await api.unregisterPushDevice(token);
    } catch {
      // Keep the token locally so the next authenticated registration can
      // safely reassign it instead of losing track of an active device.
      return;
    }
  }
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}

export function onNotificationOpened(callback: (taskId?: string) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const value = response.notification.request.content.data?.taskId;
    callback(typeof value === 'string' ? value : undefined);
  });
  return () => subscription.remove();
}
