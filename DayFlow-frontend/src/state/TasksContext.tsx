import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { api } from '../api/client';
import { Task } from '../data/types';
import {
  cancelAllReminders,
  cancelTaskReminder,
  syncTaskReminder,
} from '../services/notifications';
import { usePreferences } from './PreferencesContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface TasksContextValue {
  tasks: Task[];
  todayTasks: Task[];
  upcomingTasks: Task[];
  /** 0..1 completion for today */
  todayProgress: number;
  /** Initial fetch in flight */
  loading: boolean;
  /** Last sync with the backend failed */
  offline: boolean;
  addTask: (task: Omit<Task, 'id' | 'completed'>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  /** Re-fetch from the backend (e.g. after the AI changed tasks). */
  refresh: () => Promise<void>;
  /** Drop local state and reminders (sign-out). */
  clear: () => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

const animate = () =>
  LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { prefs } = usePreferences();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const tasksRef = useRef<Task[]>([]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Keep the latest notification prefs available to async callbacks.
  const notifOpts = useRef({
    enabled: prefs.notificationsEnabled,
    tone: prefs.notificationTone,
    remindBefore: prefs.remindBefore,
  });
  useEffect(() => {
    notifOpts.current = {
      enabled: prefs.notificationsEnabled,
      tone: prefs.notificationTone,
      remindBefore: prefs.remindBefore,
    };
  }, [prefs.notificationsEnabled, prefs.notificationTone, prefs.remindBefore]);

  const syncAllReminders = useCallback((list: Task[]) => {
    list.forEach((t) => syncTaskReminder(t, notifOpts.current));
  }, []);

  const refresh = useCallback(async () => {
    try {
      if (!(await api.hasSession())) {
        setLoading(false);
        return;
      }
      const fresh = await api.listTasks();
      animate();
      setTasks(fresh);
      setOffline(false);
      syncAllReminders(fresh);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [syncAllReminders]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Reschedule everything when notification preferences change.
  useEffect(() => {
    syncAllReminders(tasksRef.current);
  }, [prefs.notificationsEnabled, prefs.notificationTone, prefs.remindBefore, syncAllReminders]);

  const addTask = useCallback((task: Omit<Task, 'id' | 'completed'>) => {
    // Optimistic insert; replaced by the server row when it lands.
    const localId = `local-${Date.now()}`;
    animate();
    setTasks((prev) =>
      [...prev, { ...task, id: localId, completed: false }].sort((a, b) =>
        a.time.localeCompare(b.time)
      )
    );
    api
      .createTask(task)
      .then((created) => {
        setTasks((prev) => prev.map((t) => (t.id === localId ? created : t)));
        setOffline(false);
        syncTaskReminder(created, notifOpts.current);
      })
      .catch(() => {
        setTasks((prev) => prev.filter((t) => t.id !== localId));
        cancelTaskReminder(localId);
        setOffline(true);
      });
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    const current = tasks.find((task) => task.id === id);
    if (!current) return;
    const optimistic = { ...current, ...patch };
    animate();
    setTasks((prev) => prev.map((task) => (task.id === id ? optimistic : task)));
    syncTaskReminder(optimistic, notifOpts.current);
    if (!id.startsWith('local-')) {
      api
        .updateTask(id, patch)
        .then((updated) => {
          setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
          setOffline(false);
        })
        .catch(() => {
          setOffline(true);
          void refresh();
        });
    }
  }, [refresh, tasks]);

  const toggleTask = useCallback((id: string) => {
    const current = tasks.find((task) => task.id === id);
    if (!current) return;
    const toggled = { ...current, completed: !current.completed };
    setTasks((prev) => prev.map((task) => (task.id === id ? toggled : task)));
    syncTaskReminder(toggled, notifOpts.current);
    if (!id.startsWith('local-')) {
      api
        .updateTask(id, { completed: toggled.completed })
        .then(() => setOffline(false))
        .catch(() => {
          setOffline(true);
          void refresh();
        });
    }
  }, [refresh, tasks]);

  const deleteTask = useCallback((id: string) => {
    animate();
    setTasks((prev) => prev.filter((t) => t.id !== id));
    cancelTaskReminder(id);
    if (!id.startsWith('local-')) {
      api
        .deleteTask(id)
        .then(() => setOffline(false))
        .catch(() => {
          setOffline(true);
          void refresh();
        });
    }
  }, [refresh]);

  const clear = useCallback(() => {
    setTasks([]);
    setLoading(true);
    setOffline(false);
    cancelAllReminders();
  }, []);

  const value = useMemo(() => {
    const todayTasks = tasks
      .filter((t) => t.day === 'today')
      .sort((a, b) => a.time.localeCompare(b.time));
    const upcomingTasks = tasks.filter((t) => t.day !== 'today');
    const done = todayTasks.filter((t) => t.completed).length;
    return {
      tasks,
      todayTasks,
      upcomingTasks,
      todayProgress: todayTasks.length ? done / todayTasks.length : 0,
      loading,
      offline,
      addTask,
      updateTask,
      toggleTask,
      deleteTask,
      refresh,
      clear,
    };
  }, [tasks, loading, offline, addTask, updateTask, toggleTask, deleteTask, refresh, clear]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
