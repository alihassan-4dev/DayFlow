import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { ChatMessage } from '../data/types';
import { usePreferences } from './PreferencesContext';
import { useTasks } from './TasksContext';

const CHAT_KEY = 'dayflow.chat';
const MAX_MESSAGES = 60;

interface ChatContextValue {
  messages: ChatMessage[];
  /** A text turn is in flight */
  busy: boolean;
  /** Send a typed message; resolves with the assistant's message. */
  send: (text: string) => Promise<ChatMessage | null>;
  /** Append messages produced elsewhere (voice mode). */
  append: (...items: ChatMessage[]) => void;
  clear: () => void;
  /** Last 10 turns in the wire shape the backend expects */
  history: () => Pick<ChatMessage, 'role' | 'text'>[];
}

const ChatContext = createContext<ChatContextValue | null>(null);

let seq = 0;
export function newMessageId(): string {
  seq += 1;
  return `m${Date.now()}_${seq}`;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { prefs } = usePreferences();
  const { refresh } = useTasks();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(CHAT_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored) as ChatMessage[];
          if (Array.isArray(parsed)) {
            messagesRef.current = parsed;
            setMessages(parsed);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  const persist = useCallback((next: ChatMessage[]) => {
    const trimmed = next.slice(-MAX_MESSAGES);
    messagesRef.current = trimmed;
    setMessages(trimmed);
    if (loaded.current) AsyncStorage.setItem(CHAT_KEY, JSON.stringify(trimmed)).catch(() => {});
  }, []);

  const append = useCallback(
    (...items: ChatMessage[]) => persist([...messagesRef.current, ...items]),
    [persist]
  );

  const history = useCallback(
    () => messagesRef.current.slice(-10).map((m) => ({ role: m.role, text: m.text })),
    []
  );

  const send = useCallback(
    async (text: string): Promise<ChatMessage | null> => {
      const trimmed = text.trim();
      if (!trimmed || busy) return null;
      const prior = history();
      append({ id: newMessageId(), role: 'user', text: trimmed });
      setBusy(true);
      try {
        const res = await api.chat(trimmed, prior, { personality: prefs.aiPersonality });
        const reply: ChatMessage = {
          id: newMessageId(),
          role: 'ai',
          text: res.reply,
          action: res.action ?? undefined,
        };
        append(reply);
        if (res.tasks_changed) void refresh();
        return reply;
      } catch {
        const reply: ChatMessage = {
          id: newMessageId(),
          role: 'ai',
          text: 'I can’t reach DayFlow right now. Check your connection and try again in a moment.',
        };
        append(reply);
        return reply;
      } finally {
        setBusy(false);
      }
    },
    [append, busy, history, prefs.aiPersonality, refresh]
  );

  const clear = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    AsyncStorage.removeItem(CHAT_KEY).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ messages, busy, send, append, clear, history }),
    [messages, busy, send, append, clear, history]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
