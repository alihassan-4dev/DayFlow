import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { AIOrb } from '../../src/components/ai/AIOrb';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { layout } from '../../src/theme/themes';

export default function Welcome() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  return (
    <Screen safeBottom>
      <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <View style={styles.hero}>
          <AIOrb state="idle" size={92} />
          <AppText variant="display" align="center" style={styles.title}>
            A calmer way{'\n'}through your day
          </AppText>
          <AppText variant="body" tone="secondary" align="center" style={styles.tagline}>
            Tell DayFlow what needs doing.{'\n'}It quietly takes care of the rest.
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
  title: { marginTop: layout.space.xl },
  tagline: { marginTop: layout.space.md },
  actions: { paddingBottom: layout.space.md },
  secondary: { marginTop: 6 },
});
