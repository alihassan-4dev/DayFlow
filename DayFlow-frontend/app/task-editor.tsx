import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { AppText } from '../src/components/AppText';
import { Button } from '../src/components/Button';
import { Chip } from '../src/components/Chip';
import { FormScrollView } from '../src/components/FormScrollView';
import { Screen } from '../src/components/Screen';
import { TextField } from '../src/components/TextField';
import { Priority } from '../src/data/types';
import { useTasks } from '../src/state/TasksContext';
import { useTheme } from '../src/theme/ThemeContext';
import { layout } from '../src/theme/themes';
import { formatTime, priorityMeta } from '../src/utils/format';

const TIME_SLOTS = ['07:00', '09:00', '12:00', '15:00', '18:00', '20:00'];
function upcomingDayLabel(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const DAYS: ('today' | string)[] = [
  'today',
  'Tomorrow',
  upcomingDayLabel(2),
  upcomingDayLabel(3),
  upcomingDayLabel(4),
];
const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

export default function TaskEditor() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { tasks, addTask, updateTask, deleteTask } = useTasks();

  const existing = id ? tasks.find((t) => t.id === id) : undefined;
  const editing = !!existing;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [time, setTime] = useState(existing?.time ?? '09:00');
  const [day, setDay] = useState<'today' | string>(existing?.day ?? 'today');
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 'medium');
  const [reminder, setReminder] = useState(existing?.reminder ?? true);
  const [titleError, setTitleError] = useState<string | undefined>();
  const noteRef = useRef<TextInput>(null);

  const save = () => {
    if (!title.trim()) {
      setTitleError('Give your task a name');
      return;
    }
    const payload = { title: title.trim(), note: note.trim() || undefined, time, day, priority, reminder };
    if (editing && existing) {
      updateTask(existing.id, payload);
    } else {
      addTask(payload);
    }
    router.back();
  };

  const remove = () => {
    if (existing) deleteTask(existing.id);
    router.back();
  };

  return (
    <Screen safeTop={false} keyboardAvoiding safeBottom>
      {/* Modal header */}
      <View style={styles.header}>
        <AppText variant="title">{editing ? 'Edit task' : 'New task'}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          hitSlop={10}
          style={[styles.close, { backgroundColor: theme.colors.surfaceElevated }]}
        >
          <Feather name="x" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <FormScrollView>
        <TextField
          label="Task"
          placeholder="What needs doing?"
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            if (titleError) setTitleError(undefined);
          }}
          error={titleError}
          autoFocus={!editing}
          returnKeyType="next"
          onSubmitEditing={() => noteRef.current?.focus()}
        />
        <TextField
          ref={noteRef}
          label="Note (optional)"
          placeholder="Any details worth remembering"
          value={note}
          onChangeText={setNote}
          returnKeyType="done"
        />

        <AppText variant="caption" tone="secondary" style={styles.label}>
          Day
        </AppText>
        <View style={styles.chipRow}>
          {DAYS.map((d) => (
            <Chip
              key={d}
              label={d === 'today' ? 'Today' : d}
              selected={day === d}
              onPress={() => setDay(d)}
            />
          ))}
        </View>

        <AppText variant="caption" tone="secondary" style={styles.label}>
          Time
        </AppText>
        <View style={styles.chipRow}>
          {TIME_SLOTS.map((t) => (
            <Chip key={t} label={formatTime(t)} selected={time === t} onPress={() => setTime(t)} />
          ))}
        </View>

        <AppText variant="caption" tone="secondary" style={styles.label}>
          Priority
        </AppText>
        <View style={styles.chipRow}>
          {PRIORITIES.map((p) => {
            const meta = priorityMeta(p, theme);
            return (
              <Chip
                key={p}
                label={meta.label}
                dot={priority === p ? undefined : meta.color}
                selected={priority === p}
                onPress={() => setPriority(p)}
              />
            );
          })}
        </View>

        <View
          style={[
            styles.reminderRow,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Feather name="bell" size={18} color={theme.colors.accent} />
          <View style={styles.reminderText}>
            <AppText variant="bodyMedium">Remind me</AppText>
            <AppText variant="caption" tone="tertiary">
              A friendly AI nudge before it starts
            </AppText>
          </View>
          <Switch
            value={reminder}
            onValueChange={setReminder}
            trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Button label={editing ? 'Save changes' : 'Add task'} onPress={save} style={styles.cta} />
        {editing ? (
          <Button label="Delete task" variant="danger" onPress={remove} style={styles.delete} />
        ) : null}
      </FormScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: layout.space.xl,
    marginBottom: layout.space.xl,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { marginBottom: layout.space.sm, marginLeft: 2, marginTop: layout.space.sm },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: layout.space.sm,
    marginBottom: layout.space.lg,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: layout.space.lg,
    marginTop: layout.space.sm,
  },
  reminderText: { flex: 1, marginLeft: layout.space.md },
  cta: { marginTop: layout.space.xl },
  delete: { marginTop: layout.space.sm, marginBottom: layout.space.xl },
});
