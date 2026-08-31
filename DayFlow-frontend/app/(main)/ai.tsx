import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { api } from '../../src/api/client';
import { AIOrb } from '../../src/components/ai/AIOrb';
import { ChatBubble } from '../../src/components/ai/ChatBubble';
import { TypingDots } from '../../src/components/ai/TypingDots';
import { AppText } from '../../src/components/AppText';
import { Chip } from '../../src/components/Chip';
import { Screen } from '../../src/components/Screen';
import { aiSuggestionChips } from '../../src/data/content';
import { AIState, ChatMessage } from '../../src/data/types';
import { useTasks } from '../../src/state/TasksContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { layout, type } from '../../src/theme/themes';

const STATE_LABEL: Record<AIState, string> = {
  idle: 'Ready',
  listening: 'Listening…',
  processing: 'Thinking…',
  responding: 'Responding',
};

export default function AIScreen() {
  const { theme } = useTheme();
  const { refresh } = useTasks();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiState, setAIState] = useState<AIState>('idle');
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToEnd = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || aiState === 'processing') return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setInput('');
      setMessages((prev) => [...prev, { id: `m${Date.now()}`, role: 'user', text: trimmed }]);
      setAIState('processing');
      scrollToEnd();

      const finish = (reply: Omit<ChatMessage, 'id' | 'role'>) => {
        setAIState('responding');
        setMessages((prev) => [...prev, { id: `m${Date.now()}a`, role: 'ai', ...reply }]);
        scrollToEnd();
        setTimeout(() => setAIState('idle'), 1200);
      };

      const history = messages.slice(-10).map((m) => ({ role: m.role, text: m.text }));
      api
        .chat(trimmed, history)
        .then((res) => {
          finish({ text: res.reply, action: res.action ?? undefined });
          if (res.tasks_changed) refresh();
        })
        .catch(() => {
          finish({
            text: 'I can’t reach DayFlow right now. Check your connection and try again in a moment.',
          });
        });
    },
    [aiState, messages, refresh]
  );

  const toggleListening = () => {
    if (aiState === 'processing') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (aiState === 'listening') {
      // Mock: pretend we heard something.
      setAIState('idle');
      send('What’s left on my list today?');
    } else {
      setAIState('listening');
    }
  };

  const hasChat = messages.length > 0;

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            hasChat && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <AppText variant="title">Assistant</AppText>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    aiState === 'idle' ? theme.colors.textTertiary : theme.colors.aiA,
                },
              ]}
            />
            <AppText variant="caption" tone="tertiary">
              {STATE_LABEL[aiState]}
            </AppText>
          </View>
        </View>

        {hasChat ? (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <ChatBubble message={item} />}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              aiState === 'processing' ? (
                <View style={styles.typingWrap}>
                  <TypingDots />
                </View>
              ) : null
            }
          />
        ) : (
          <View style={styles.hero}>
            <AIOrb state={aiState} size={110} />
            <AppText variant="title" align="center" style={styles.heroTitle}>
              {aiState === 'listening' ? 'I’m listening' : 'What’s on your mind?'}
            </AppText>
            <AppText variant="caption" tone="tertiary" align="center" style={styles.heroSub}>
              Create tasks, move things around,{'\n'}or just ask what’s left.
            </AppText>
            <View style={styles.chips}>
              {aiSuggestionChips.map((chip) => (
                <Chip key={chip} label={chip} onPress={() => send(chip)} />
              ))}
            </View>
          </View>
        )}

        {/* Composer */}
        <View style={styles.composer}>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask anything…"
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.input, type.body, { color: theme.colors.text }]}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              selectionColor={theme.colors.accent}
              cursorColor={theme.colors.accent}
              maxLength={4000}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={aiState === 'listening' ? 'Stop listening' : 'Speak to AI'}
              onPress={toggleListening}
              hitSlop={6}
              style={styles.micBtn}
            >
              <Feather
                name={aiState === 'listening' ? 'square' : 'mic'}
                size={17}
                color={aiState === 'listening' ? theme.colors.aiA : theme.colors.textSecondary}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              onPress={() => send(input)}
              disabled={!input.trim()}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: input.trim()
                    ? theme.colors.primary
                    : theme.colors.surfaceElevated,
                },
              ]}
            >
              <Feather
                name="arrow-up"
                size={16}
                color={input.trim() ? theme.colors.onPrimary : theme.colors.textTertiary}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.space.xl,
    paddingTop: layout.space.lg,
    paddingBottom: 14,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  chatList: {
    paddingHorizontal: layout.space.xl,
    paddingTop: layout.space.xl,
    paddingBottom: layout.space.lg,
  },
  typingWrap: { paddingLeft: 26, paddingBottom: layout.space.lg },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.space.xl,
  },
  heroTitle: { marginTop: 4 },
  heroSub: { marginTop: 8, lineHeight: 19 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: layout.space.sm,
    marginTop: layout.space.xxl,
  },
  composer: {
    paddingHorizontal: layout.space.lg,
    paddingVertical: layout.space.md,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: layout.radius.full,
    borderWidth: 1,
    paddingLeft: 18,
    paddingRight: 5,
    height: 48,
  },
  input: { flex: 1, paddingVertical: 0 },
  micBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});
