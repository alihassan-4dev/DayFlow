import { isoToday } from '../api/client';
import { Priority, Task } from '../data/types';
import { Theme } from '../theme/themes';

export function formatTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  if (Number.isNaN(h)) return time24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, '0')} ${suffix}`;
}

/** "HH:MM" for the current local time. */
export function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Open task whose date has passed, or whose time today already went by. */
export function isOverdue(task: Task, now = new Date()): boolean {
  if (task.completed) return false;
  const today = isoToday();
  if (task.dueDate < today) return true;
  if (task.dueDate > today) return false;
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return task.time < current;
}

export function priorityMeta(priority: Priority, theme: Theme) {
  switch (priority) {
    case 'high':
      return { label: 'High', color: theme.colors.danger };
    case 'medium':
      return { label: 'Medium', color: theme.colors.warning };
    case 'low':
      return { label: 'Low', color: theme.colors.textTertiary };
  }
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
