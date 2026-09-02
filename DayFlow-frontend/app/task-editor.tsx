import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { dateToDayLabel, isoToday, toIsoDate } from '../src/api/client';
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
const DAY_OFFSETS = [0, 1, 2, 3, 4];
const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function parseTime(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

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
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? isoToday());
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 'medium');
  const [reminder, setReminder] = useState(existing?.reminder ?? true);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [picker, setPicker] = useState<'time' | 'date' | null>(null);
  const noteRef = useRef<TextInput>(null);

  const dayChips = useMemo(() => DAY_OFFSETS.map((n) => isoToday(n)), []);
  const timeChips = useMemo(
    () => (TIME_SLOTS.includes(time) ? TIME_SLOTS : [...TIME_SLOTS, time].sort()),
    [time]
  );

  const onPick = (event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS !== 'ios') setPicker(null);
    if (event.type !== 'set' || !value) return;
    if (picker === 'time') {
      setTime(`${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`);
    } else {
      setDueDate(toIsoDate(value));
    }
  };

  const save = () => {
    if (!title.trim()) {
      setTitleError('Give your task a name');
      return;
    }
    const payload = {
      title: title.trim(),
      note: note.trim() || undefined,
      time,
      dueDate,
      day: dateToDayLabel(dueDate),
      priority,
      reminder,
    };
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

  const customDay = !dayChips.includes(dueDate);

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
          {dayChips.map((d, i) => (
            <Chip
              key={d}
              label={i === 0 ? 'Today' : dateToDayLabel(d)}
              selected={dueDate === d}
              onPress={() => setDueDate(d)}
            />
          ))}
          <Chip
            label={customDay ? dateToDayLabel(dueDate) : 'Pick a date…'}
            selected={customDay}
            onPress={() => setPicker(picker === 'date' ? null : 'date')}
          />
        </View>

        <AppText variant="caption" tone="secondary" style={styles.label}>
          Time
        </AppText>
        <View style={styles.chipRow}>
          {timeChips.map((t) => (
            <Chip key={t} label={formatTime(t)} selected={time === t} onPress={() => setTime(t)} />
          ))}
          <Chip label="Custom…" onPress={() => setPicker(picker === 'time' ? null : 'time')} />
        </View>

        {picker ? (
          <View
            style={[
              styles.pickerWrap,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <DateTimePicker
              value={picker === 'time' ? parseTime(time) : parseIso(dueDate)}
              mode={picker}
              minimumDate={picker === 'date' ? parseIso(isoToday()) : undefined}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant={theme.dark ? 'dark' : 'light'}
              onChange={onPick}
              minuteInterval={5}
            />
            {Platform.OS === 'ios' ? (
              <Button label="Done" variant="secondary" onPress={() => setPicker(null)} />
            ) : null}
          </View>
        ) : null}

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
  pickerWrap: {
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: layout.space.sm,
    marginBottom: layout.space.lg,
    alignItems: 'stretch',
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
