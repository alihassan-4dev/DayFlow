import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { dayLabelToDate } from '../api/client';
import { NotificationTone, Task } from '../data/types';

/**
 * Local task reminders.
 *
 * Each task with a reminder gets one scheduled local notification, fired
 * `remindBefore` minutes before its start time. The notification identifier
 * is derived from the task id, so rescheduling and cancelling need no
 * extra bookkeeping.
 *
 * Note: full support requires a dev build or the installed APK; Expo Go
 * has limited notification support since SDK 53.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady = false;

async function ensureAndroidChannel(): Promise<void> {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('task-reminders', {
    name: 'Task reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
  });
  channelReady = true;
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

function reminderBody(task: Task, tone: NotificationTone, minutes: number): string {
  switch (tone) {
    case 'motivational':
      return `${task.title} is waiting 💪 Let's get it done.`;
    case 'friendly':
      return `Quick reminder 👀 “${task.title}” starts in ${minutes} minutes.`;
    case 'minimal':
      return `${task.title} · in ${minutes} min`;
  }
}

function triggerDate(task: Task, minutesBefore: number): Date | null {
  const [hour, minute] = task.time.split(':').map(Number);
  const [y, m, d] = dayLabelToDate(task.day).split('-').map(Number);
  const when = new Date(y, m - 1, d, hour, minute);
  when.setMinutes(when.getMinutes() - minutesBefore);
  return when.getTime() > Date.now() ? when : null;
}

export async function syncTaskReminder(
  task: Task,
  opts: { enabled: boolean; tone: NotificationTone; remindBefore: number }
): Promise<void> {
  const id = `task-${task.id}`;
  try {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    if (!opts.enabled || !task.reminder || task.completed) return;
    const when = triggerDate(task, opts.remindBefore);
    if (!when) return;

    await ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: 'DayFlow',
        body: reminderBody(task, opts.tone, opts.remindBefore),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: Platform.OS === 'android' ? 'task-reminders' : undefined,
      },
    });
  } catch {
    // Notifications are best-effort — never break task operations over them.
  }
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`task-${taskId}`).catch(() => {});
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}
