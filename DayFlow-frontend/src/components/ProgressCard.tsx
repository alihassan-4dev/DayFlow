import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { layout } from '../theme/themes';
import { AppText } from './AppText';

interface ProgressCardProps {
  /** 0..1 */
  progress: number;
  done: number;
  total: number;
}

/** Understated daily progress — a line of text and a hairline bar. */
export function ProgressCard({ progress, done, total }: ProgressCardProps) {
  const { theme } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress, anim]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const allDone = total > 0 && done === total;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <AppText variant="caption" tone="secondary">
          {total === 0
            ? 'Nothing scheduled yet'
            : allDone
              ? 'All done for today'
              : `${done} of ${total} done`}
        </AppText>
        {total > 0 ? (
          <AppText variant="mono" tone={allDone ? 'accent' : 'tertiary'}>
            {Math.round(progress * 100)}%
          </AppText>
        ) : null}
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.surfaceElevated }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              width,
              backgroundColor: allDone ? theme.colors.success : theme.colors.accent,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: layout.space.xl },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  track: {
    height: 4,
    borderRadius: layout.radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: layout.radius.full,
  },
});
