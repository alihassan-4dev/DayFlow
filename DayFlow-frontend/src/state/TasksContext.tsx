import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { api } from '../api/client';
import { mockTasks } from '../data/mock';
import { Task } from '../data/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface TasksContextValue {
  tasks: Task[];
  todayTasks: Task[];
  upcomingTasks: Task[];
  /** 0..1 completion for today */
  todayProgress: number;
  /** true when working against the live backend, false on mock data */
  online: boolean;
  addTask: (task: Omit<Task, 'id' | 'completed'>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  /** Re-fetch from the backend (e.g. after the AI changed tasks). */
  refresh: () => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

const animate = () =>
  LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [online, setOnline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      if (!(await api.hasSession())) return;
      const fresh = await api.listTasks();
      animate();
      setTasks(fresh);
      setOnline(true);
    } catch {
      // Backend unreachable — stay on whatever we have locally.
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTask = useCallback(
    (task: Omit<Task, 'id' | 'completed'>) => {
      // Optimistic local insert; swap in the server row when it lands.
      const localId = `local-${Date.now()}`;
      animate();
      setTasks((prev) =>
        [...prev, { ...task, id: localId, completed: false }].sort((a, b) =>
          a.time.localeCompare(b.time)
        )
      );
      api
        .createTask(task)
        .then((created) =>
          setTasks((prev) => prev.map((t) => (t.id === localId ? created : t)))
        )
        .catch(() => setOnline(false));
    },
    []
  );

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    animate();
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    if (!id.startsWith('local-')) {
      api.updateTask(id, patch).catch(() => setOnline(false));
    }
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (task && !id.startsWith('local-')) {
        api.updateTask(id, { completed: !task.completed }).catch(() => setOnline(false));
      }
      return prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    animate();
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (!id.startsWith('local-')) {
      api.deleteTask(id).catch(() => setOnline(false));
    }
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
      online,
      addTask,
      updateTask,
      toggleTask,
      deleteTask,
      refresh,
    };
  }, [tasks, online, addTask, updateTask, toggleTask, deleteTask, refresh]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
