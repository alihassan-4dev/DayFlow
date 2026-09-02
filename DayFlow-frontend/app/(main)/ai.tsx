import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AIOrb } from '../../src/components/ai/AIOrb';
import { ChatBubble } from '../../src/components/ai/ChatBubble';
import { TypingDots } from '../../src/components/ai/TypingDots';
import { AppText } from '../../src/components/AppText';
import { Chip } from '../../src/components/Chip';
import { Screen } from '../../src/components/Screen';
import { aiSuggestionChips } from '../../src/data/content';
import { AIState, ChatMessage } from '../../src/data/types';
import { useChat } from '../../src/state/ChatContext';
import { usePreferences } from '../../src/state/PreferencesContext';
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
  const { prefs } = usePreferences();
  const { messages, busy, send, clear } = useChat();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [justReplied, setJustReplied] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const aiState: AIState = busy ? 'processing' : justReplied ? 'responding' : 'idle';

  const scrollToEnd = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

  useEffect(() => {
    if (messages.length) scrollToEnd();
  }, [messages.length]);

  const submit = useCallback(
    async (text: string) => {
      if (!text.trim() || busy) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setInput('');
      const reply = await send(text);
      if (reply) {
        setJustReplied(true);
        setTimeout(() => setJustReplied(false), 1200);
      }
    },
    [busy, send]
  );

  const confirmClear = () =>
    Alert.alert('Clear conversation?', 'Your tasks stay exactly as they are.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clear },
    ]);

  const openVoice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/voice');
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
          <View>
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear conversation"
              onPress={confirmClear}
              hitSlop={8}
              style={({ pressed }) => [
                styles.headerBtn,
                { backgroundColor: theme.colors.surfaceElevated, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Feather name="trash-2" size={16} color={theme.colors.textSecondary} />
            </Pressable>
          ) : null}
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
            onContentSizeChange={scrollToEnd}
            ListFooterComponent={
              busy ? (
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
              What’s on your mind{prefs.name && prefs.name !== 'there' ? `, ${prefs.name}` : ''}?
            </AppText>
            <AppText variant="caption" tone="tertiary" align="center" style={styles.heroSub}>
              Create tasks, move things around,{'\n'}or just ask what’s left.
            </AppText>
            <View style={styles.chips}>
              {aiSuggestionChips.map((chip) => (
                <Chip key={chip} label={chip} onPress={() => void submit(chip)} />
              ))}
            </View>
            {prefs.voiceEnabled ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start voice mode"
                onPress={openVoice}
                style={({ pressed }) => [
                  styles.voiceCta,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="mic" size={14} color={theme.colors.aiA} />
                <AppText variant="captionMedium" tone="secondary">
                  Or just talk — try voice mode
                </AppText>
              </Pressable>
            ) : null}
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
              onSubmitEditing={() => void submit(input)}
              returnKeyType="send"
              selectionColor={theme.colors.accent}
              cursorColor={theme.colors.accent}
              maxLength={4000}
            />
            {prefs.voiceEnabled ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voice mode"
                onPress={openVoice}
                hitSlop={6}
                style={styles.micBtn}
              >
                <Feather name="mic" size={17} color={theme.colors.textSecondary} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              onPress={() => void submit(input)}
              disabled={!input.trim() || busy}
              style={[
                styles.sendBtn,
                {
                  backgroundColor:
                    input.trim() && !busy ? theme.colors.primary : theme.colors.surfaceElevated,
                },
              ]}
            >
              <Feather
                name="arrow-up"
                size={16}
                color={input.trim() && !busy ? theme.colors.onPrimary : theme.colors.textTertiary}
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
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
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
  voiceCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: layout.space.xl,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: layout.radius.full,
    borderWidth: 1,
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
