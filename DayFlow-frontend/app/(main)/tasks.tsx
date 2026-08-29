import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../src/components/AppText';
import { EmptyState } from '../../src/components/EmptyState';
import { ProgressCard } from '../../src/components/ProgressCard';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import { TaskCard } from '../../src/components/TaskCard';
import { usePreferences } from '../../src/state/PreferencesContext';
import { useTasks } from '../../src/state/TasksContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { cardShadow, layout } from '../../src/theme/themes';
import { greeting, todayLabel } from '../../src/utils/format';

type Tab = 'today' | 'upcoming';

export default function TasksScreen() {
  const { theme } = useTheme();
  const { prefs } = usePreferences();
  const { todayTasks, upcomingTasks, todayProgress, toggleTask } = useTasks();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('today');

  const data = tab === 'today' ? todayTasks : upcomingTasks;
  const doneToday = todayTasks.filter((t) => t.completed).length;

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

      <FlatList
        data={data}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onToggle={() => toggleTask(item.id)}
            onPress={() => router.push({ pathname: '/task-editor', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={tab === 'today' ? 'sun' : 'calendar'}
            title={tab === 'today' ? 'Nothing planned yet' : 'No upcoming tasks'}
            message={
              tab === 'today'
                ? 'Add a task below, or ask the AI to plan your day.'
                : 'Your week is wide open. Add something to look forward to.'
            }
          />
        }
      />

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
});
