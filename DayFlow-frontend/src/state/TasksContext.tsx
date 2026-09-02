import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { api, dateToDayLabel, dayLabelToDate, isoToday } from '../api/client';
import { Task } from '../data/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface TasksContextValue {
  tasks: Task[];
  /** Due today, plus anything overdue that's still open */
  todayTasks: Task[];
  upcomingTasks: Task[];
  /** 0..1 completion for today */
  todayProgress: number;
  /** Initial fetch in flight */
  loading: boolean;
  /** Last sync with the backend failed */
  offline: boolean;
  addTask: (task: Omit<Task, 'id' | 'completed' | 'dueDate'> & { dueDate?: string }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  /** Push an open task to tomorrow (same time). */
  snoozeToTomorrow: (id: string) => void;
  /** Re-fetch from the backend (e.g. after the AI changed tasks). */
  refresh: () => Promise<void>;
  /** Drop local task state on sign-out. */
  clear: () => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

const animate = () =>
  LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));

const byDateTime = (a: Task, b: Task) =>
  a.dueDate.localeCompare(b.dueDate) || a.time.localeCompare(b.time);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
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
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTask = useCallback<TasksContextValue['addTask']>((input) => {
    const dueDate = input.dueDate ?? dayLabelToDate(input.day);
    const task = { ...input, dueDate, day: dateToDayLabel(dueDate) };
    // Optimistic insert; replaced by the server row when it lands.
    const localId = `local-${Date.now()}`;
    animate();
    setTasks((prev) => [...prev, { ...task, id: localId, completed: false }].sort(byDateTime));
    api
      .createTask(task)
      .then((created) => {
        setTasks((prev) => prev.map((t) => (t.id === localId ? created : t)));
        setOffline(false);
      })
      .catch(() => {
        setTasks((prev) => prev.filter((t) => t.id !== localId));
        setOffline(true);
      });
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    const current = tasks.find((task) => task.id === id);
    if (!current) return;
    const next = { ...patch };
    if (next.dueDate !== undefined) next.day = dateToDayLabel(next.dueDate);
    else if (next.day !== undefined) next.dueDate = dayLabelToDate(next.day);
    const optimistic = { ...current, ...next };
    animate();
    setTasks((prev) => prev.map((task) => (task.id === id ? optimistic : task)));
    if (!id.startsWith('local-')) {
      api
        .updateTask(id, next)
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

  const snoozeToTomorrow = useCallback(
    (id: string) => updateTask(id, { dueDate: isoToday(1) }),
    [updateTask]
  );

  const clear = useCallback(() => {
    setTasks([]);
    setLoading(true);
    setOffline(false);
  }, []);

  const value = useMemo(() => {
    const today = isoToday();
    const todayTasks = tasks
      .filter((t) => t.dueDate === today || (t.dueDate < today && !t.completed))
      .sort(byDateTime);
    const upcomingTasks = tasks.filter((t) => t.dueDate > today).sort(byDateTime);
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
      snoozeToTomorrow,
      refresh,
      clear,
    };
  }, [tasks, loading, offline, addTask, updateTask, toggleTask, deleteTask, snoozeToTomorrow, refresh, clear]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
