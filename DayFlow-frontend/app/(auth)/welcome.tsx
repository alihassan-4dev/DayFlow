import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { AppText } from '../../src/components/AppText';
import { DayFlowMark } from '../../src/components/brand/DayFlowMark';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { brand } from '../../src/theme/brand';
import { useTheme } from '../../src/theme/ThemeContext';
import { layout } from '../../src/theme/themes';

export default function Welcome() {
  const router = useRouter();
  const { theme } = useTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(12)).current;
  const draw = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.timing(draw, { toValue: 1, duration: 1100, delay: 150, useNativeDriver: false }),
    ]).start();
  }, [fade, rise, draw]);

  return (
    <Screen safeBottom>
      <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <View style={styles.hero}>
          <LinearGradient
            colors={theme.dark ? [...brand.splash] : [theme.colors.accentSoft, theme.colors.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.logoHalo, { borderColor: theme.colors.border }]}
          >
            <DayFlowMark size={104} light={!theme.dark} progress={draw} />
          </LinearGradient>
          <View style={[styles.brandPill, { backgroundColor: theme.colors.accentSoft }]}>
            <View style={[styles.brandDot, { backgroundColor: theme.colors.accent }]} />
            <AppText variant="micro" style={{ color: theme.colors.accent }}>
              DayFlow
            </AppText>
          </View>
          <AppText variant="display" align="center" style={styles.title}>
            A calmer way{'\n'}through your day
          </AppText>
          <AppText variant="body" tone="secondary" align="center" style={styles.tagline}>
            Tell DayFlow what needs doing — or just say it.{'\n'}It quietly takes care of the rest.
          </AppText>
        </View>

        <View style={styles.actions}>
          <Button label="Get started" onPress={() => router.push('/(auth)/signup')} />
          <Button
            label="I already have an account"
            variant="ghost"
            onPress={() => router.push('/(auth)/login')}
            style={styles.secondary}
          />
        </View>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'space-between' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoHalo: {
    width: 132,
    height: 132,
    borderRadius: 42,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6576F3',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: layout.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: layout.space.xl,
  },
  brandDot: { width: 6, height: 6, borderRadius: 3, marginRight: 7 },
  title: { marginTop: layout.space.lg },
  tagline: { marginTop: layout.space.md },
  actions: { paddingBottom: layout.space.md },
  secondary: { marginTop: 6 },
});
