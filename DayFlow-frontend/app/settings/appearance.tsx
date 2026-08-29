import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../../src/components/AppText';
import { Screen } from '../../src/components/Screen';
import { useTheme } from '../../src/theme/ThemeContext';
import { cardShadow, layout, Theme, themeList } from '../../src/theme/themes';

function ThemeSwatch({ theme: t, active, onPress }: { theme: Theme; active: boolean; onPress: () => void }) {
  const { theme: current } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[
        styles.swatch,
        cardShadow(current.dark),
        {
          backgroundColor: current.colors.surface,
          borderColor: active ? current.colors.text : current.colors.border,
          borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {/* Miniature of the theme */}
      <View style={[styles.preview, { backgroundColor: t.colors.background }]}>
        <View style={[styles.previewCard, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <View style={[styles.previewDot, { backgroundColor: t.colors.accent }]} />
          <View style={[styles.previewLine, { backgroundColor: t.colors.text, opacity: 0.7 }]} />
        </View>
        <View style={[styles.previewCard, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <View style={[styles.previewDot, { backgroundColor: t.colors.aiB }]} />
          <View style={[styles.previewLine, { backgroundColor: t.colors.textTertiary }]} />
        </View>
      </View>
      <View style={styles.swatchFooter}>
        <View style={styles.swatchText}>
          <AppText variant="captionMedium">{t.name}</AppText>
          <AppText variant="caption" tone="tertiary" style={styles.tagline}>
            {t.tagline}
          </AppText>
        </View>
        {active ? <Feather name="check" size={16} color={current.colors.text} /> : null}
      </View>
    </Pressable>
  );
}

export default function Appearance() {
  const { themeId, setThemeId } = useTheme();

  return (
    <Screen safeTop={false} padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppText variant="caption" tone="secondary" style={styles.intro}>
          Pick the mood for your day. Changes apply instantly.
        </AppText>
        <View style={styles.grid}>
          {themeList.map((t) => (
            <ThemeSwatch
              key={t.id}
              theme={t}
              active={t.id === themeId}
              onPress={() => setThemeId(t.id)}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.space.xl },
  intro: { marginBottom: layout.space.xl },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  swatch: {
    width: '48.4%',
    borderRadius: layout.radius.lg,
    marginBottom: layout.space.md,
    overflow: 'hidden',
  },
  preview: {
    height: 82,
    padding: 10,
    gap: 6,
  },
  previewCard: {
    flex: 1,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  previewLine: { flex: 1, height: 3, borderRadius: 2 },
  swatchFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  swatchText: { flex: 1 },
  tagline: { marginTop: 1, fontSize: 12 },
});
