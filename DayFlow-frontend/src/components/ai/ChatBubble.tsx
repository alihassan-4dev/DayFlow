import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { ChatMessage } from '../../data/types';
import { useTheme } from '../../theme/ThemeContext';
import { layout } from '../../theme/themes';
import { AppText } from '../AppText';

/**
 * User messages sit in a quiet filled bubble on the right.
 * AI replies read like editorial text — no bubble, just a small orb mark.
 */
export function ChatBubble({ message }: { message: ChatMessage }) {
  const { theme } = useTheme();
  const isUser = message.role === 'user';
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(appear, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 2 }).start();
  }, [appear]);

  const animStyle = {
    opacity: appear,
    transform: [
      { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) },
    ],
  };

  if (isUser) {
    return (
      <Animated.View style={[styles.userRow, animStyle]}>
        <View style={[styles.userBubble, { backgroundColor: theme.colors.surfaceElevated }]}>
          <AppText variant="body">{message.text}</AppText>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.aiRow, animStyle]}>
      <LinearGradient
        colors={[theme.colors.aiA, theme.colors.aiB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mark}
      />
      <View style={styles.aiBody}>
        <AppText variant="body" style={styles.aiText}>
          {message.text}
        </AppText>
        {message.action ? (
          <View
            style={[
              styles.action,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Feather
              name={message.action.icon as keyof typeof Feather.glyphMap}
              size={13}
              color={theme.colors.success}
            />
            <AppText variant="captionMedium" tone="secondary">
              {message.action.label}
            </AppText>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: 'flex-end',
    marginBottom: layout.space.lg,
  },
  userBubble: {
    maxWidth: '82%',
    borderRadius: layout.radius.lg,
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  aiRow: {
    flexDirection: 'row',
    marginBottom: layout.space.xl,
    paddingRight: layout.space.xl,
  },
  mark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
    marginTop: 3,
  },
  aiBody: { flex: 1 },
  aiText: { lineHeight: 23 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: layout.radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
    gap: 6,
  },
});
