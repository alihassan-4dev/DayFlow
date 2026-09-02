import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Task } from '../data/types';
import { useTheme } from '../theme/ThemeContext';
import { cardShadow, layout } from '../theme/themes';
import { formatTime, isOverdue, priorityMeta } from '../utils/format';
import { AppText } from './AppText';
import { Checkbox } from './Checkbox';

interface TaskCardProps {
  task: Task;
  onToggle: () => void;
  onPress: () => void;
  onLongPress?: () => void;
}

export function TaskCard({ task, onToggle, onPress, onLongPress }: TaskCardProps) {
  const { theme } = useTheme();
  const priority = priorityMeta(task.priority, theme);
  const overdue = isOverdue(task);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={320}
      accessibilityRole="button"
      accessibilityLabel={`${task.title}, ${formatTime(task.time)}${overdue ? ', overdue' : ''}`}
      accessibilityHint="Long press for quick actions"
      style={({ pressed }) => [
        styles.card,
        cardShadow(theme.dark),
        {
          backgroundColor: theme.colors.surface,
          borderColor: overdue ? theme.colors.danger + '55' : theme.colors.border,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.995 : 1 }],
        },
      ]}
    >
      <Checkbox checked={task.completed} onToggle={onToggle} />
      <View style={styles.body}>
        <AppText
          variant="bodyMedium"
          tone={task.completed ? 'tertiary' : 'primary'}
          numberOfLines={1}
          style={task.completed ? styles.struck : undefined}
        >
          {task.title}
        </AppText>
        {task.note ? (
          <AppText variant="caption" tone="tertiary" numberOfLines={1} style={styles.note}>
            {task.note}
          </AppText>
        ) : null}
      </View>
      <View style={styles.right}>
        <View style={styles.timeRow}>
          {task.reminder && !task.completed && !overdue ? (
            <Feather name="bell" size={11} color={theme.colors.textTertiary} style={styles.bell} />
          ) : null}
          {overdue ? (
            <Feather name="alert-circle" size={11} color={theme.colors.danger} style={styles.bell} />
          ) : null}
          <AppText
            variant="mono"
            tone={task.completed ? 'tertiary' : 'secondary'}
            color={overdue ? theme.colors.danger : undefined}
          >
            {formatTime(task.time)}
          </AppText>
        </View>
        {task.day !== 'today' ? (
          <AppText variant="caption" tone="tertiary" style={styles.day} color={overdue ? theme.colors.danger : undefined}>
            {overdue ? `Overdue · ${task.day}` : task.day}
          </AppText>
        ) : overdue ? (
          <AppText variant="caption" style={styles.day} color={theme.colors.danger}>
            Overdue
          </AppText>
        ) : task.priority !== 'low' && !task.completed ? (
          <View style={styles.priorityRow}>
            <View style={[styles.dot, { backgroundColor: priority.color }]} />
            <AppText variant="caption" tone="tertiary">
              {priority.label}
            </AppText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: layout.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: layout.space.lg,
    marginBottom: 10,
  },
  body: { flex: 1, marginLeft: 14, marginRight: layout.space.md },
  struck: { textDecorationLine: 'line-through' },
  note: { marginTop: 2 },
  right: { alignItems: 'flex-end' },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  bell: { marginRight: 4 },
  day: { marginTop: 3 },
  priorityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
