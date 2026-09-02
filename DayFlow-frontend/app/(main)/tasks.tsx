import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { AppText } from '../../src/components/AppText';
import { EmptyState } from '../../src/components/EmptyState';
import { ProgressCard } from '../../src/components/ProgressCard';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import { TaskCard } from '../../src/components/TaskCard';
import { Task } from '../../src/data/types';
import { usePreferences } from '../../src/state/PreferencesContext';
import { useTasks } from '../../src/state/TasksContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { cardShadow, layout } from '../../src/theme/themes';
import { greeting, isOverdue, todayLabel } from '../../src/utils/format';

type Tab = 'today' | 'upcoming';

export default function TasksScreen() {
  const { theme } = useTheme();
  const { prefs } = usePreferences();
  const {
    todayTasks,
    upcomingTasks,
    todayProgress,
    toggleTask,
    deleteTask,
    snoozeToTomorrow,
    loading,
    offline,
    refresh,
  } = useTasks();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('today');
  const celebrated = useRef(false);

  const data = tab === 'today' ? todayTasks : upcomingTasks;
  const doneToday = todayTasks.filter((t) => t.completed).length;
  const overdueCount = todayTasks.filter((t) => isOverdue(t)).length;

  // A little celebration the moment the last task of the day is checked off.
  useEffect(() => {
    const allDone = todayTasks.length > 0 && doneToday === todayTasks.length;
    if (allDone && !celebrated.current) {
      celebrated.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (!allDone) {
      celebrated.current = false;
    }
  }, [doneToday, todayTasks.length]);

  const quickActions = (task: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(task.title, undefined, [
      {
        text: task.completed ? 'Mark as not done' : 'Mark as done',
        onPress: () => toggleTask(task.id),
      },
      ...(!task.completed
        ? [{ text: 'Move to tomorrow', onPress: () => snoozeToTomorrow(task.id) }]
        : []),
      { text: 'Edit', onPress: () => router.push({ pathname: '/task-editor', params: { id: task.id } }) },
      { text: 'Delete', style: 'destructive' as const, onPress: () => deleteTask(task.id) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <Screen padded={false}>
      <View style={styles.padded}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="micro" tone="tertiary">
              {todayLabel()}
            </AppText>
            <AppText variant="display" style={styles.greeting}>
              {greeting()},{'\n'}{prefs.name}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile and settings"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.avatar,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <AppText variant="headline" tone="secondary">
              {prefs.name.charAt(0).toUpperCase()}
            </AppText>
          </Pressable>
        </View>

        <ProgressCard progress={todayProgress} done={doneToday} total={todayTasks.length} />

        <Segmented<Tab>
          options={[
            { value: 'today', label: 'Today', badge: todayTasks.filter((t) => !t.completed).length },
            { value: 'upcoming', label: 'Upcoming', badge: upcomingTasks.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refresh}
              tintColor={theme.colors.textTertiary}
            />
          }
          ListHeaderComponent={
            <>
              {offline ? (
                <View
                  style={[
                    styles.banner,
                    { backgroundColor: theme.colors.surfaceElevated },
                  ]}
                >
                  <Feather name="cloud-off" size={13} color={theme.colors.textSecondary} />
                  <AppText variant="caption" tone="secondary">
                    Can’t reach DayFlow — pull down to retry
                  </AppText>
                </View>
              ) : null}
              {tab === 'today' && overdueCount > 0 ? (
                <View style={[styles.banner, { backgroundColor: theme.colors.danger + '14' }]}>
                  <Feather name="alert-circle" size={13} color={theme.colors.danger} />
                  <AppText variant="caption" color={theme.colors.danger}>
                    {overdueCount === 1 ? '1 task is overdue' : `${overdueCount} tasks are overdue`}
                    {' · long-press to move it'}
                  </AppText>
                </View>
              ) : null}
            </>
          }
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onToggle={() => toggleTask(item.id)}
              onPress={() => router.push({ pathname: '/task-editor', params: { id: item.id } })}
              onLongPress={() => quickActions(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={tab === 'today' ? 'sun' : 'calendar'}
              title={tab === 'today' ? 'Nothing planned yet' : 'No upcoming tasks'}
              message={
                tab === 'today'
                  ? 'Add a task below, or just tell the assistant what’s on your plate.'
                  : 'Your week is wide open. Add something to look forward to.'
              }
            />
          }
        />
      )}

      {/* Talk to the assistant */}
      {prefs.voiceEnabled ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Talk to DayFlow"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.push('/voice');
          }}
          style={({ pressed }) => [
            styles.fab,
            styles.voiceFab,
            cardShadow(theme.dark),
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
        >
          <Feather name="mic" size={20} color={theme.colors.aiA} />
        </Pressable>
      ) : null}

      {/* Add task */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add task"
        onPress={() => router.push('/task-editor')}
        style={({ pressed }) => [
          styles.fab,
          cardShadow(theme.dark),
          {
            backgroundColor: theme.colors.primary,
            transform: [{ scale: pressed ? 0.94 : 1 }],
            shadowOpacity: 0.15,
          },
        ]}
      >
        <Feather name="plus" size={24} color={theme.colors.onPrimary} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: layout.space.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: layout.space.lg,
    marginBottom: layout.space.xl,
  },
  headerText: { flex: 1 },
  greeting: { marginTop: 6 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: layout.space.xl,
    paddingTop: layout.space.lg,
    paddingBottom: 110,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: layout.radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: layout.space.md,
  },
  fab: {
    position: 'absolute',
    right: layout.space.xl,
    bottom: layout.space.xl,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceFab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    right: layout.space.xl + 4,
    bottom: layout.space.xl + 66,
    borderWidth: 1,
  },
});
